import { prisma } from '../db.js';
import { env } from '../env.js';
import { runMonitoringSource } from './monitoring.js';

let timer: NodeJS.Timeout | null = null;
let running = false;

export async function runDueMonitoringSources(): Promise<
  Array<{ sourceId: string; status: string; createdExtractions?: number; error?: string }>
> {
  if (running) return [];
  running = true;

  try {
    const now = Date.now();
    const sources = await prisma.schemeSource.findMany({
      where: { isActive: true, sourceType: 'DEMO' },
      orderBy: { name: 'asc' },
    });

    const results: Array<{ sourceId: string; status: string; createdExtractions?: number; error?: string }> = [];

    for (const source of sources) {
      const dueAt = source.lastCheckedAt
        ? source.lastCheckedAt.getTime() + source.monitoringIntervalMinutes * 60_000
        : 0;
      if (dueAt > now) continue;

      try {
        const result = await runMonitoringSource(source.id);
        results.push({
          sourceId: source.id,
          status: result.status,
          createdExtractions: result.createdExtractions,
          ...(result.error ? { error: result.error } : {}),
        });
      } catch (error) {
        results.push({
          sourceId: source.id,
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (results.length > 0) {
      console.log(
        `[monitoring] checked ${results.length} source(s): ` +
          results
            .map((result) => `${result.status.toLowerCase()} (${result.createdExtractions ?? 0} new)`)
            .join(', '),
      );
    }

    return results;
  } finally {
    running = false;
  }
}

export function startMonitoringScheduler(): NodeJS.Timeout | null {
  if (!env.MONITORING_WORKER_ENABLED) {
    console.log('[monitoring] background worker disabled (MONITORING_WORKER_ENABLED=false)');
    return null;
  }

  const intervalMs = env.MONITORING_POLL_MINUTES * 60_000;
  console.log(
    `[monitoring] background worker enabled; checking demo sources every ${env.MONITORING_POLL_MINUTES} minute(s)`,
  );

  timer = setInterval(() => {
    void runDueMonitoringSources().catch((error) => {
      console.error('[monitoring] scheduled run failed', error);
    });
  }, intervalMs);
  timer.unref();

  void runDueMonitoringSources().catch((error) => {
    console.error('[monitoring] initial run failed', error);
  });

  return timer;
}

export function stopMonitoringScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
