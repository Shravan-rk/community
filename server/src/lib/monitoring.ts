import type { SchemeSource } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError } from './errors.js';
import { DEMO_FEED_VERSION, demoFeedItems, type DemoFeedItem } from './demoFeed.js';

export const MONITORING_JOB_STATUSES = ['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED'] as const;
export const EXTRACTION_REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export type MonitoringJobStatus = (typeof MONITORING_JOB_STATUSES)[number];
export type ExtractionReviewStatus = (typeof EXTRACTION_REVIEW_STATUSES)[number];

export interface NormalizedMonitoringItem {
  externalId: string;
  sourceUrl: string;
  fields: Record<string, unknown>;
  demo: boolean;
}

interface MonitoringAdapter {
  id: string;
  sourceType: string;
  collect(source: SchemeSource): NormalizedMonitoringItem[];
}

function toNormalizedDemoItem(source: SchemeSource, item: DemoFeedItem): NormalizedMonitoringItem {
  const { externalId, ...fields } = item;
  return {
    externalId,
    sourceUrl: `${source.baseUrl}#${externalId}`,
    fields: fields as unknown as Record<string, unknown>,
    demo: true,
  };
}

const demoAdapter: MonitoringAdapter = {
  id: 'demo-feed',
  sourceType: 'DEMO',
  collect: (source) => demoFeedItems.map((item) => toNormalizedDemoItem(source, item)),
};

function getMonitoringAdapter(source: Pick<SchemeSource, 'sourceType'>): MonitoringAdapter | null {
  return source.sourceType === demoAdapter.sourceType ? demoAdapter : null;
}

export function describeMonitoringSupport(source: Pick<SchemeSource, 'sourceType' | 'isActive'>) {
  const adapter = getMonitoringAdapter(source);
  return {
    canRun: Boolean(adapter) && source.isActive,
    adapter: adapter?.id ?? null,
    reason: !adapter
      ? 'No adapter is configured for this source type. Retrieval requires an approved integration.'
      : source.isActive
        ? null
        : 'Source is disabled.',
  };
}

function truncateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 1000);
}

export interface MonitoringRunResult {
  jobId: string;
  sourceId: string;
  status: MonitoringJobStatus;
  itemsFound: number;
  createdExtractions: number;
  skippedDuplicates: number;
  error: string | null;
}

export async function runMonitoringSource(sourceId: string): Promise<MonitoringRunResult> {
  const source = await prisma.schemeSource.findUnique({ where: { id: sourceId } });
  if (!source) throw AppError.notFound('Monitoring source not found.');
  if (!source.isActive) throw AppError.conflict('Monitoring source is disabled.');

  const adapter = getMonitoringAdapter(source);
  if (!adapter) {
    throw AppError.conflict(
      'No monitoring adapter is configured for this source. Retrieval requires an approved integration.',
    );
  }

  const startedAt = new Date();
  let items: NormalizedMonitoringItem[] = [];

  try {
    items = adapter.collect(source);
    const result = await prisma.$transaction(async (tx) => {
      const job = await tx.monitoringJob.create({
        data: {
          sourceId: source.id,
          status: 'RUNNING',
          startedAt,
          attempt: 1,
          itemsFound: items.length,
        },
      });

      let createdExtractions = 0;
      let skippedDuplicates = 0;

      for (const item of items) {
        const existing = await tx.extractionResult.findFirst({
          where: {
            rawDocumentId: item.externalId,
            monitoringJob: { sourceId: source.id },
          },
          select: { id: true },
        });
        if (existing) {
          skippedDuplicates += 1;
          continue;
        }

        await tx.extractionResult.create({
          data: {
            monitoringJobId: job.id,
            sourceUrl: item.sourceUrl,
            rawDocumentId: item.externalId,
            model: 'demo-feed@' + DEMO_FEED_VERSION,
            extractedJson: JSON.stringify({
              adapter: adapter.id,
              feedVersion: DEMO_FEED_VERSION,
              demo: item.demo,
              fetchedAt: startedAt.toISOString(),
              source: {
                id: source.id,
                slug: source.slug,
                name: source.name,
                baseUrl: source.baseUrl,
                sourceType: source.sourceType,
                reliabilityScore: source.reliabilityScore,
              },
              externalId: item.externalId,
              fields: item.fields,
            }),
            needsReview: true,
            reviewStatus: 'PENDING',
          },
        });
        createdExtractions += 1;
      }

      const finishedAt = new Date();
      await tx.monitoringJob.update({
        where: { id: job.id },
        data: {
          status: 'SUCCESS',
          finishedAt,
          itemsFound: items.length,
          error: null,
        },
      });
      await tx.schemeSource.update({
        where: { id: source.id },
        data: { lastCheckedAt: finishedAt, lastSuccessAt: finishedAt, lastError: null },
      });

      return {
        jobId: job.id,
        sourceId: source.id,
        status: 'SUCCESS' as const,
        itemsFound: items.length,
        createdExtractions,
        skippedDuplicates,
        error: null,
      };
    });

    return result;
  } catch (error) {
    const finishedAt = new Date();
    const message = truncateError(error);

    const job = await prisma.monitoringJob.create({
      data: {
        sourceId: source.id,
        status: 'FAILED',
        startedAt,
        finishedAt,
        attempt: 1,
        itemsFound: items.length,
        error: message,
      },
    });
    await prisma.schemeSource.update({
      where: { id: source.id },
      data: { lastCheckedAt: finishedAt, lastError: message },
    });

    return {
      jobId: job.id,
      sourceId: source.id,
      status: 'FAILED',
      itemsFound: items.length,
      createdExtractions: 0,
      skippedDuplicates: 0,
      error: message,
    };
  }
}
