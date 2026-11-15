import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError } from '../lib/errors.js';
import { recordAudit } from '../lib/audit.js';
import { parseJsonObject, parseLanguage } from '../lib/language.js';
import { EXTRACTION_REVIEW_STATUSES, MONITORING_JOB_STATUSES, describeMonitoringSupport, runMonitoringSource } from '../lib/monitoring.js';
import { buildSchemeSnapshot, schemeListInclude, shapeSchemeSummary } from '../lib/schemeContent.js';
import { slugify, uniqueSchemeSlug } from '../lib/slug.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('SCHEME_VERIFIER', 'ADMIN', 'SUPER_ADMIN'));

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RULE_OPERATORS = ['GTE', 'LTE', 'EQ', 'NEQ', 'IN', 'CONTAINS', 'EXISTS'] as const;

const emptyToNull = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

const optionalUrl = (max = 500) =>
  z.preprocess(emptyToNull, z.string().trim().url('Provide a valid URL.').max(max).nullable().optional());

const optionalDate = () => z.preprocess(emptyToNull, z.coerce.date().nullable().optional());

const optionalSlug = () =>
  z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .max(120)
      .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and single hyphens.')
      .nullable()
      .optional(),
  );

const extractedRuleSchema = z.object({
  field: z.string().trim().min(1).max(60),
  operator: z.enum(RULE_OPERATORS),
  value: z.unknown().refine((value) => value !== undefined, 'Provide a rule value.'),
  descriptionEn: optionalText(400),
  descriptionKn: optionalText(400),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

const extractedFieldShape = {
  titleEn: optionalText(200),
  titleKn: optionalText(200),
  summaryEn: optionalText(2000),
  summaryKn: optionalText(2000),
  descriptionEn: optionalText(8000),
  descriptionKn: optionalText(8000),
  department: optionalText(160),
  level: z.enum(['CENTRAL', 'STATE']).optional(),
  state: optionalText(80),
  categorySlug: optionalSlug(),
  benefitsEn: optionalText(2000),
  benefitsKn: optionalText(2000),
  eligibilityEn: optionalText(3000),
  eligibilityKn: optionalText(3000),
  requiredDocuments: z.array(z.string().trim().min(1).max(200)).max(40).optional(),
  applicationProcessEn: optionalText(4000),
  applicationProcessKn: optionalText(4000),
  applicationUrl: optionalUrl(),
  officialUrl: optionalUrl(),
  notificationNumber: optionalText(120),
  applicationDeadline: optionalDate(),
  startDate: optionalDate(),
  endDate: optionalDate(),
  rules: z.array(extractedRuleSchema).max(30).optional(),
};

const mergedFieldsSchema = z.object({
  ...extractedFieldShape,
  titleEn: z.string().trim().min(3).max(200),
  summaryEn: z.string().trim().min(10).max(2000),
  benefitsEn: z.string().trim().min(3).max(2000),
  department: z.string().trim().min(2).max(160),
  categorySlug: z
    .string()
    .trim()
    .max(120)
    .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and single hyphens.'),
  level: z.enum(['CENTRAL', 'STATE']).optional(),
});

type MergedFields = z.infer<typeof mergedFieldsSchema>;

const reviewSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().trim().max(2000).nullable().optional(),
  fields: z.object(extractedFieldShape).partial().optional(),
});

const sourceParamSchema = z.object({ id: z.string().trim().min(1) });

const jobListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(MONITORING_JOB_STATUSES).optional(),
  sourceId: z.string().trim().min(1).optional(),
});

const extractionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(EXTRACTION_REVIEW_STATUSES).optional(),
  needsReview: z.enum(['true', 'false']).optional(),
  sourceId: z.string().trim().min(1).optional(),
});

const extractionInclude = {
  monitoringJob: { include: { source: true } },
  scheme: { select: { id: true, slug: true, titleEn: true, status: true, isDemoData: true } },
  reviewedBy: { select: { id: true, fullName: true, role: true } },
} satisfies Prisma.ExtractionResultInclude;

type ExtractionRecord = Prisma.ExtractionResultGetPayload<{ include: typeof extractionInclude }>;

type SourceRecord = {
  id: string;
  slug: string;
  name: string;
  baseUrl: string;
  sourceType: string;
  isActive: boolean;
  monitoringIntervalMinutes: number;
  lastCheckedAt: Date | null;
  lastSuccessAt: Date | null;
  lastError: string | null;
  reliabilityScore: number | null;
};

function shapeSource(source: SourceRecord, extra: Record<string, unknown> = {}) {
  return {
    id: source.id,
    slug: source.slug,
    name: source.name,
    baseUrl: source.baseUrl,
    sourceType: source.sourceType,
    isActive: source.isActive,
    monitoringIntervalMinutes: source.monitoringIntervalMinutes,
    lastCheckedAt: source.lastCheckedAt,
    lastSuccessAt: source.lastSuccessAt,
    lastError: source.lastError,
    reliabilityScore: source.reliabilityScore,
    monitoring: describeMonitoringSupport(source),
    ...extra,
  };
}

function shapeExtraction(record: ExtractionRecord) {
  const parsed = parseJsonObject(record.extractedJson);
  const fields = parsed.fields && typeof parsed.fields === 'object' ? parsed.fields : {};
  const source = record.monitoringJob?.source ?? null;

  return {
    id: record.id,
    schemeId: record.schemeId,
    sourceUrl: record.sourceUrl,
    rawDocumentId: record.rawDocumentId,
    confidence: record.confidence,
    model: record.model,
    needsReview: record.needsReview,
    reviewStatus: record.reviewStatus,
    reviewNotes: record.reviewNotes,
    reviewedAt: record.reviewedAt,
    reviewedBy: record.reviewedBy,
    createdAt: record.createdAt,
    scheme: record.scheme,
    monitoringJobId: record.monitoringJobId,
    source: source ? shapeSource(source) : (parsed.source ?? null),
    provenance: {
      adapter: parsed.adapter ?? null,
      feedVersion: parsed.feedVersion ?? null,
      demo: parsed.demo === true,
      fetchedAt: parsed.fetchedAt ?? null,
      externalId: parsed.externalId ?? record.rawDocumentId,
    },
    demo: parsed.demo === true,
    fields,
  };
}

async function loadExtraction(id: string): Promise<ExtractionRecord> {
  const record = await prisma.extractionResult.findUnique({ where: { id }, include: extractionInclude });
  if (!record) throw AppError.notFound('Extraction result not found.');
  return record;
}

function rulesToRows(rules: MergedFields['rules']) {
  return (rules ?? []).map((rule, index) => ({
    field: rule.field,
    operator: rule.operator,
    valueJson: JSON.stringify(rule.value ?? null),
    descriptionEn: rule.descriptionEn ?? null,
    descriptionKn: rule.descriptionKn ?? null,
    isRequired: rule.isRequired ?? true,
    sortOrder: rule.sortOrder ?? index,
  }));
}

function compactTranslationFields(fields: MergedFields) {
  const candidates: Array<[string, string | null | undefined]> = [
    ['title', fields.titleKn],
    ['summary', fields.summaryKn],
    ['description', fields.descriptionKn],
    ['benefits', fields.benefitsKn],
    ['eligibility', fields.eligibilityKn],
    ['applicationProcess', fields.applicationProcessKn],
  ];
  return Object.fromEntries(
    candidates.filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0),
  );
}

router.get(
  '/sources',
  asyncHandler(async (_req, res) => {
    const sources = await prisma.schemeSource.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { monitoringJobs: true } } },
    });

    res.json({
      sources: sources.map((source) =>
        shapeSource(source, {
          counts: { jobs: source._count.monitoringJobs },
        }),
      ),
    });
  }),
);

router.post(
  '/sources/:id/run',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validate(sourceParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as z.infer<typeof sourceParamSchema>;
    const result = await runMonitoringSource(id);

    const job = await prisma.monitoringJob.findUnique({
      where: { id: result.jobId },
      include: { source: true, _count: { select: { extractions: true } } },
    });

    await recordAudit(
      {
        action: 'MONITORING_RUN',
        entityType: 'MonitoringJob',
        entityId: result.jobId,
        metadata: {
          sourceId: result.sourceId,
          status: result.status,
          itemsFound: result.itemsFound,
          createdExtractions: result.createdExtractions,
          skippedDuplicates: result.skippedDuplicates,
        },
      },
      req,
    );

    res.status(result.status === 'SUCCESS' ? 201 : 200).json({
      result,
      job: job
        ? {
            id: job.id,
            sourceId: job.sourceId,
            status: job.status,
            startedAt: job.startedAt,
            finishedAt: job.finishedAt,
            attempt: job.attempt,
            itemsFound: job.itemsFound,
            error: job.error,
            source: shapeSource(job.source),
            counts: { extractions: job._count.extractions },
          }
        : null,
    });
  }),
);

router.get(
  '/jobs',
  validate(jobListQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof jobListQuerySchema>;
    const where: Prisma.MonitoringJobWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.sourceId ? { sourceId: query.sourceId } : {}),
    };

    const [total, jobs, statusCounts] = await Promise.all([
      prisma.monitoringJob.count({ where }),
      prisma.monitoringJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { source: true, _count: { select: { extractions: true } } },
      }),
      prisma.monitoringJob.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    res.json({
      jobs: jobs.map((job) => ({
        id: job.id,
        sourceId: job.sourceId,
        status: job.status,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        attempt: job.attempt,
        itemsFound: job.itemsFound,
        error: job.error,
        createdAt: job.createdAt,
        source: shapeSource(job.source),
        counts: { extractions: job._count.extractions },
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
      countsByStatus: Object.fromEntries(statusCounts.map((row) => [row.status, row._count._all])),
    });
  }),
);

router.get(
  '/jobs/:id',
  asyncHandler(async (req, res) => {
    const job = await prisma.monitoringJob.findUnique({
      where: { id: req.params.id },
      include: {
        source: true,
        extractions: { orderBy: { createdAt: 'desc' }, include: extractionInclude },
      },
    });
    if (!job) throw AppError.notFound('Monitoring job not found.');

    res.json({
      job: {
        id: job.id,
        sourceId: job.sourceId,
        status: job.status,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        attempt: job.attempt,
        itemsFound: job.itemsFound,
        error: job.error,
        createdAt: job.createdAt,
        source: shapeSource(job.source),
        extractions: job.extractions.map(shapeExtraction),
      },
    });
  }),
);

router.get(
  '/extractions',
  validate(extractionListQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof extractionListQuerySchema>;
    const where: Prisma.ExtractionResultWhereInput = {
      ...(query.status ? { reviewStatus: query.status } : {}),
      ...(query.needsReview ? { needsReview: query.needsReview === 'true' } : {}),
      ...(query.sourceId ? { monitoringJob: { sourceId: query.sourceId } } : {}),
    };

    const [total, extractions, statusCounts] = await Promise.all([
      prisma.extractionResult.count({ where }),
      prisma.extractionResult.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: extractionInclude,
      }),
      prisma.extractionResult.groupBy({ by: ['reviewStatus'], _count: { _all: true } }),
    ]);

    res.json({
      extractions: extractions.map(shapeExtraction),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
      countsByReviewStatus: Object.fromEntries(
        statusCounts.map((row) => [row.reviewStatus, row._count._all]),
      ),
    });
  }),
);

router.get(
  '/extractions/:id',
  asyncHandler(async (req, res) => {
    const extraction = await loadExtraction(req.params.id);
    res.json({ extraction: shapeExtraction(extraction) });
  }),
);

router.post(
  '/extractions/:id/review',
  validate(reviewSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof reviewSchema>;
    const current = await loadExtraction(req.params.id);

    if (current.reviewStatus !== 'PENDING' || !current.needsReview) {
      throw AppError.conflict('This extraction has already been reviewed.');
    }

    const notes = body.notes ?? null;

    if (body.action === 'REJECT') {
      await prisma.extractionResult.update({
        where: { id: current.id },
        data: {
          needsReview: false,
          reviewStatus: 'REJECTED',
          reviewNotes: notes,
          reviewedById: req.user!.id,
          reviewedAt: new Date(),
        },
      });

      await recordAudit(
        {
          action: 'EXTRACTION_REJECTED',
          entityType: 'ExtractionResult',
          entityId: current.id,
          metadata: { notes },
        },
        req,
      );

      const extraction = await loadExtraction(current.id);
      res.json({ extraction: shapeExtraction(extraction), scheme: null });
      return;
    }

    const source = current.monitoringJob?.source;
    if (!source) throw AppError.conflict('Extraction is not linked to a monitoring source.');

    const parsed = parseJsonObject(current.extractedJson);
    const extractedFields =
      parsed.fields && typeof parsed.fields === 'object'
        ? (parsed.fields as Record<string, unknown>)
        : {};
    const merged = { ...extractedFields, ...(body.fields ?? {}) };
    const validated = mergedFieldsSchema.safeParse(merged);
    if (!validated.success) {
      throw AppError.badRequest(
        'Extraction is missing required scheme fields. Add them with `fields` in the review request.',
        validated.error.flatten(),
      );
    }
    const fields = validated.data;

    const category = await prisma.schemeCategory.findUnique({
      where: { slug: fields.categorySlug },
      select: { id: true },
    });
    if (!category) throw AppError.badRequest('Unknown category slug.');

    const slug = await uniqueSchemeSlug(slugify(fields.titleEn));
    const rules = rulesToRows(fields.rules);
    const requiredDocumentsJson =
      fields.requiredDocuments && fields.requiredDocuments.length > 0
        ? JSON.stringify(fields.requiredDocuments)
        : null;
    const translationFields = compactTranslationFields(fields);

    const createdId = await prisma.$transaction(async (tx) => {
      const guard = await tx.extractionResult.updateMany({
        where: { id: current.id, reviewStatus: 'PENDING', needsReview: true },
        data: {
          needsReview: false,
          reviewStatus: 'APPROVED',
          reviewNotes: notes,
          reviewedById: req.user!.id,
          reviewedAt: new Date(),
        },
      });
      if (guard.count !== 1) throw AppError.conflict('This extraction has already been reviewed.');

      const scheme = await tx.scheme.create({
        data: {
          slug,
          titleEn: fields.titleEn,
          titleKn: fields.titleKn ?? null,
          titleHi: null,
          summaryEn: fields.summaryEn,
          summaryKn: fields.summaryKn ?? null,
          summaryHi: null,
          descriptionEn: fields.descriptionEn ?? null,
          descriptionKn: fields.descriptionKn ?? null,
          department: fields.department,
          level: fields.level ?? 'STATE',
          state: fields.state ?? 'Karnataka',
          categoryId: category.id,
          benefitsEn: fields.benefitsEn,
          benefitsKn: fields.benefitsKn ?? null,
          eligibilityEn: fields.eligibilityEn ?? null,
          eligibilityKn: fields.eligibilityKn ?? null,
          requiredDocumentsJson,
          applicationProcessEn: fields.applicationProcessEn ?? null,
          applicationProcessKn: fields.applicationProcessKn ?? null,
          applicationUrl: fields.applicationUrl ?? null,
          officialUrl: fields.officialUrl ?? null,
          notificationNumber: fields.notificationNumber ?? null,
          applicationDeadline: fields.applicationDeadline ?? null,
          startDate: fields.startDate ?? null,
          endDate: fields.endDate ?? null,
          sourceId: source.id,
          status: 'PENDING_VERIFICATION',
          isDemoData: source.sourceType === 'DEMO',
          createdById: req.user!.id,
          version: 1,
          eligibilityRules: rules.length > 0 ? { create: rules } : undefined,
        },
      });

      await tx.schemeVersion.create({
        data: {
          schemeId: scheme.id,
          version: 1,
          snapshotJson: buildSchemeSnapshot(scheme, rules),
          changeSummary: 'Created from reviewed monitoring extraction',
          createdById: req.user!.id,
        },
      });

      if (Object.keys(translationFields).length > 0) {
        await tx.schemeTranslation.create({
          data: {
            schemeId: scheme.id,
            language: 'kn',
            fieldsJson: JSON.stringify(translationFields),
            provider: 'DEMO',
            quality: 'DRAFT',
          },
        });
      }

      await tx.extractionResult.update({
        where: { id: current.id },
        data: { schemeId: scheme.id },
      });

      return scheme.id;
    });

    await recordAudit(
      {
        action: 'EXTRACTION_APPROVED',
        entityType: 'ExtractionResult',
        entityId: current.id,
        metadata: { schemeId: createdId, slug, categorySlug: fields.categorySlug, notes },
      },
      req,
    );

    const [extraction, stored] = await Promise.all([
      loadExtraction(current.id),
      prisma.scheme.findUnique({ where: { id: createdId }, include: schemeListInclude }),
    ]);

    res.status(201).json({
      extraction: shapeExtraction(extraction),
      scheme: stored ? shapeSchemeSummary(stored, parseLanguage(req.query.language)) : null,
    });
  }),
);

export default router;
