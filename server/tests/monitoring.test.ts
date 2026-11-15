import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { resetDatabase } from './helpers/db.js';

const app = createApp();
const PASSWORD = 'Verifier1234';

let admin: { token: string; id: string };
let verifier: { token: string; id: string };
let citizen: { token: string; id: string };
let demoSourceId: string;
let websiteSourceId: string;
let inactiveSourceId: string;

async function registerStaff(role: 'SCHEME_VERIFIER' | 'ADMIN', email: string) {
  const response = await request(app)
    .post('/api/auth/register/staff')
    .send({
      fullName: role === 'ADMIN' ? 'Monitoring Admin' : 'Monitoring Verifier',
      email,
      password: PASSWORD,
      role,
      inviteCode: role === 'ADMIN' ? 'test-admin-invite-code' : 'test-staff-invite-code',
    });
  expect(response.status).toBe(201);
  return { token: response.body.token as string, id: response.body.user.id as string };
}

async function registerCitizen() {
  const response = await request(app).post('/api/auth/register').send({
    fullName: 'Monitoring Citizen',
    email: 'monitoring-citizen@example.com',
    phone: '+91 90000 22222',
    password: 'Citizen1234',
  });
  expect(response.status).toBe(201);
  return { token: response.body.token as string, id: response.body.user.id as string };
}

async function seedFixtures() {
  await prisma.schemeCategory.createMany({
    data: [
      { slug: 'agriculture', nameEn: 'Agriculture', nameKn: 'ಕೃಷಿ', nameHi: 'कृषि' },
      { slug: 'small-business', nameEn: 'Small Businesses', nameKn: 'ಸಣ್ಣ ಉದ್ಯಮಗಳು', nameHi: 'लघु व्यवसाय' },
    ],
  });

  const demo = await prisma.schemeSource.create({
    data: {
      slug: 'demo-feed',
      name: 'Local demo feed (NOT a government source)',
      baseUrl: 'https://example.invalid/grama-sahay/demo-feed.json',
      sourceType: 'DEMO',
      isActive: true,
      reliabilityScore: 0,
    },
  });
  demoSourceId = demo.id;

  const website = await prisma.schemeSource.create({
    data: {
      slug: 'myscheme',
      name: 'myScheme (National Scheme Portal)',
      baseUrl: 'https://www.myscheme.gov.in/',
      sourceType: 'API',
      isActive: true,
      reliabilityScore: 80,
    },
  });
  websiteSourceId = website.id;

  const inactive = await prisma.schemeSource.create({
    data: {
      slug: 'demo-inactive',
      name: 'Disabled demo source',
      baseUrl: 'https://example.invalid/disabled',
      sourceType: 'DEMO',
      isActive: false,
    },
  });
  inactiveSourceId = inactive.id;
}

async function runDemo() {
  const response = await request(app)
    .post(`/api/admin/monitoring/sources/${demoSourceId}/run`)
    .set('Authorization', `Bearer ${admin.token}`);
  expect(response.status).toBe(201);
  return response.body as {
    result: {
      status: string;
      itemsFound: number;
      createdExtractions: number;
      skippedDuplicates: number;
      jobId: string;
    };
    job: { id: string; counts: { extractions: number } };
  };
}

async function listExtractions(query = '') {
  const response = await request(app)
    .get(`/api/admin/monitoring/extractions${query}`)
    .set('Authorization', `Bearer ${admin.token}`);
  expect(response.status).toBe(200);
  return response.body as {
    extractions: Array<{
      id: string;
      reviewStatus: string;
      needsReview: boolean;
      schemeId: string | null;
      sourceUrl: string | null;
      model: string | null;
      provenance: { demo: boolean; adapter: string | null; feedVersion: string | null };
      fields: { titleEn: string; titleKn?: string; categorySlug: string };
      source: { slug: string } | null;
    }>;
    pagination: { total: number };
    countsByReviewStatus: Record<string, number>;
  };
}

async function review(extractionId: string, body: Record<string, unknown>) {
  return request(app)
    .post(`/api/admin/monitoring/extractions/${extractionId}/review?language=en`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send(body);
}

beforeEach(async () => {
  await resetDatabase();
  await seedFixtures();
  admin = await registerStaff('ADMIN', 'admin@example.com');
  verifier = await registerStaff('SCHEME_VERIFIER', 'verifier@example.com');
  citizen = await registerCitizen();
});

describe('monitoring sources and jobs', () => {
  it('enforces staff access and reports adapter availability honestly', async () => {
    const citizenList = await request(app)
      .get('/api/admin/monitoring/sources')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(citizenList.status).toBe(403);

    const noToken = await request(app).get('/api/admin/monitoring/sources');
    expect(noToken.status).toBe(401);

    const allowed = await request(app)
      .get('/api/admin/monitoring/sources')
      .set('Authorization', `Bearer ${verifier.token}`);
    expect(allowed.status).toBe(200);

    const bySlug = Object.fromEntries(
      (allowed.body.sources as Array<{ slug: string; monitoring: { canRun: boolean; adapter: string | null } }>).map(
        (source) => [source.slug, source],
      ),
    );
    expect(bySlug['demo-feed'].monitoring).toMatchObject({ canRun: true, adapter: 'demo-feed' });
    expect(bySlug.myscheme.monitoring).toMatchObject({ canRun: false, adapter: null });
    expect(bySlug.myscheme.monitoring.reason).toContain('No adapter');

    const verifierRun = await request(app)
      .post(`/api/admin/monitoring/sources/${demoSourceId}/run`)
      .set('Authorization', `Bearer ${verifier.token}`);
    expect(verifierRun.status).toBe(403);
  });

  it('runs the demo adapter and stores provenance for each extraction', async () => {
    const run = await runDemo();
    expect(run.result).toMatchObject({
      status: 'SUCCESS',
      itemsFound: 2,
      createdExtractions: 2,
      skippedDuplicates: 0,
    });
    expect(run.job.counts.extractions).toBe(2);

    const source = await prisma.schemeSource.findUniqueOrThrow({ where: { id: demoSourceId } });
    expect(source.lastCheckedAt).toBeInstanceOf(Date);
    expect(source.lastSuccessAt).toBeInstanceOf(Date);
    expect(source.lastError).toBeNull();

    const job = await request(app)
      .get(`/api/admin/monitoring/jobs/${run.result.jobId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(job.status).toBe(200);
    expect(job.body.job.status).toBe('SUCCESS');
    expect(job.body.job.extractions).toHaveLength(2);

    const extraction = job.body.job.extractions[0];
    expect(extraction.provenance).toMatchObject({ demo: true, adapter: 'demo-feed' });
    expect(extraction.provenance.feedVersion).toBeTruthy();
    expect(extraction.fields.titleEn).toContain('Demo');
    expect(extraction.model).toContain('demo-feed');
    expect(extraction.needsReview).toBe(true);
    expect(extraction.reviewStatus).toBe('PENDING');
    expect(extraction.sourceUrl).toBeTruthy();
  });

  it('skips duplicate feed items on subsequent runs', async () => {
    await runDemo();
    const second = await runDemo();
    expect(second.result).toMatchObject({
      itemsFound: 2,
      createdExtractions: 0,
      skippedDuplicates: 2,
    });

    expect(await prisma.monitoringJob.count()).toBe(2);
    expect(await prisma.extractionResult.count()).toBe(2);
  });

  it('refuses sources without an adapter and disabled sources', async () => {
    const unsupported = await request(app)
      .post(`/api/admin/monitoring/sources/${websiteSourceId}/run`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(unsupported.status).toBe(409);
    expect(unsupported.body.error.message).toContain('adapter');

    const disabled = await request(app)
      .post(`/api/admin/monitoring/sources/${inactiveSourceId}/run`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(disabled.status).toBe(409);

    expect(await prisma.monitoringJob.count()).toBe(0);
    expect(await prisma.extractionResult.count()).toBe(0);
  });

  it('lists and filters jobs, and surfaces review queue counts', async () => {
    await runDemo();

    const jobs = await request(app)
      .get('/api/admin/monitoring/jobs?status=SUCCESS')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(jobs.status).toBe(200);
    expect(jobs.body.pagination.total).toBe(1);
    expect(jobs.body.countsByStatus.SUCCESS).toBe(1);

    const failed = await request(app)
      .get('/api/admin/monitoring/jobs?status=FAILED')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(failed.body.pagination.total).toBe(0);

    const pending = await listExtractions('?status=PENDING&needsReview=true');
    expect(pending.pagination.total).toBe(2);
    expect(pending.countsByReviewStatus.PENDING).toBe(2);
    expect(pending.extractions.every((item) => item.source?.slug === 'demo-feed')).toBe(true);

    const reviewed = await listExtractions('?needsReview=false');
    expect(reviewed.pagination.total).toBe(0);

    const missingJob = await request(app)
      .get('/api/admin/monitoring/jobs/does-not-exist')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(missingJob.status).toBe(404);

    const detail = await request(app)
      .get(`/api/admin/monitoring/extractions/${pending.extractions[0].id}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.extraction.sourceUrl).toContain('example.invalid');
  });
});

describe('extraction review pipeline', () => {
  it('approves an extraction into a pending demo scheme with version and translation drafts', async () => {
    await runDemo();
    const queue = await listExtractions('?status=PENDING');
    const millet = queue.extractions.find((item) => item.fields.titleEn.includes('Millet'));
    expect(millet).toBeTruthy();

    const response = await review(millet!.id, {
      action: 'APPROVE',
      notes: 'Demo extraction reviewed; demo data remains illustrative.',
    });
    expect(response.status).toBe(201);
    expect(response.body.scheme.status).toBe('PENDING_VERIFICATION');
    expect(response.body.scheme.isDemoData).toBe(true);
    expect(response.body.extraction).toMatchObject({
      reviewStatus: 'APPROVED',
      needsReview: false,
    });
    expect(response.body.extraction.schemeId).toBe(response.body.scheme.id);

    const scheme = await prisma.scheme.findUniqueOrThrow({
      where: { id: response.body.scheme.id },
      include: { eligibilityRules: true, versions: true, translations: true },
    });
    expect(scheme.sourceId).toBe(demoSourceId);
    expect(scheme.isDemoData).toBe(true);
    expect(scheme.eligibilityRules).toHaveLength(2);
    expect(scheme.versions).toHaveLength(1);
    expect(scheme.translations).toHaveLength(1);
    expect(scheme.translations[0]).toMatchObject({ language: 'kn', provider: 'DEMO', quality: 'DRAFT' });

    const publicDetail = await request(app).get(`/api/schemes/${scheme.slug}`);
    expect(publicDetail.status).toBe(404);

    const verified = await request(app)
      .post(`/api/admin/schemes/${scheme.id}/verify`)
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({ action: 'APPROVED', notes: 'Demo content accepted for pipeline test.' });
    expect(verified.status).toBe(200);

    const published = await request(app)
      .post(`/api/admin/schemes/${scheme.id}/publish`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(published.status).toBe(200);

    const afterPublish = await request(app).get(`/api/schemes/${scheme.slug}?language=en`);
    expect(afterPublish.status).toBe(200);
    expect(afterPublish.body.scheme.isDemoData).toBe(true);
    expect(afterPublish.body.scheme.title).toContain('Demo');

    const again = await review(millet!.id, { action: 'APPROVE' });
    expect(again.status).toBe(409);

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'EXTRACTION_APPROVED', entityId: millet!.id },
    });
    expect(audit).toBeTruthy();
  });

  it('rejects an extraction without creating a scheme and blocks reprocessing', async () => {
    await runDemo();
    const queue = await listExtractions('?status=PENDING');

    const response = await review(queue.extractions[0].id, {
      action: 'REJECT',
      notes: 'Illustrative item, not a real notification.',
    });
    expect(response.status).toBe(200);
    expect(response.body.scheme).toBeNull();
    expect(response.body.extraction).toMatchObject({
      reviewStatus: 'REJECTED',
      needsReview: false,
      schemeId: null,
    });
    expect(response.body.extraction.reviewNotes).toContain('Illustrative');

    expect(await prisma.scheme.count()).toBe(0);

    const approve = await review(queue.extractions[0].id, { action: 'APPROVE' });
    expect(approve.status).toBe(409);
  });

  it('requires required fields and a known category before approval', async () => {
    await runDemo();
    const queue = await listExtractions('?status=PENDING');
    const extraction = queue.extractions[0];

    const unknownCategory = await review(extraction.id, {
      action: 'APPROVE',
      fields: { categorySlug: 'not-a-category' },
    });
    expect(unknownCategory.status).toBe(400);

    const missingFields = await review(extraction.id, {
      action: 'APPROVE',
      fields: { titleEn: null },
    });
    expect(missingFields.status).toBe(400);
    expect(missingFields.body.error.details.fieldErrors.titleEn).toBeTruthy();

    const stillPending = await listExtractions('?status=PENDING');
    expect(stillPending.pagination.total).toBe(2);
    expect(await prisma.scheme.count()).toBe(0);
  });

  it('applies reviewer field corrections before creating the scheme', async () => {
    await runDemo();
    const queue = await listExtractions('?status=PENDING');
    const extraction = queue.extractions[0];

    const response = await review(extraction.id, {
      action: 'APPROVE',
      fields: {
        titleEn: 'Corrected Demo Scheme Title',
        categorySlug: 'agriculture',
      },
    });
    expect(response.status).toBe(201);
    expect(response.body.scheme.title).toBe('Corrected Demo Scheme Title');

    const stored = await prisma.scheme.findUniqueOrThrow({ where: { slug: response.body.scheme.slug } });
    expect(stored.titleEn).toBe('Corrected Demo Scheme Title');
  });

  it('validates review payloads and blocks citizens', async () => {
    await runDemo();
    const queue = await listExtractions('?status=PENDING');

    const invalidAction = await review(queue.extractions[0].id, { action: 'PUBLISH' });
    expect(invalidAction.status).toBe(400);

    const citizenDenied = await request(app)
      .post(`/api/admin/monitoring/extractions/${queue.extractions[0].id}/review`)
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ action: 'APPROVE' });
    expect(citizenDenied.status).toBe(403);
  });
});
