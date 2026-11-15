import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { resetDatabase } from './helpers/db.js';

const app = createApp();

const PASSWORD = 'Verifier1234';

async function registerStaff(role: 'SCHEME_VERIFIER' | 'ADMIN', email: string) {
  const response = await request(app)
    .post('/api/auth/register/staff')
    .send({
      fullName: role === 'ADMIN' ? 'Test Admin' : 'Test Verifier',
      email,
      password: PASSWORD,
      role,
      inviteCode: role === 'ADMIN' ? 'test-admin-invite-code' : 'test-staff-invite-code',
    });
  expect(response.status).toBe(201);
  return { token: response.body.token as string, id: response.body.user.id as string };
}

async function registerCitizen(email = 'citizen@example.com') {
  const response = await request(app).post('/api/auth/register').send({
    fullName: 'Test Citizen',
    email,
    phone: '+91 90000 11111',
    password: 'Citizen1234',
  });
  expect(response.status).toBe(201);
  return { token: response.body.token as string, id: response.body.user.id as string };
}

async function seedFixtures() {
  const agriculture = await prisma.schemeCategory.create({
    data: {
      slug: 'agriculture',
      nameEn: 'Agriculture',
      nameKn: 'ಕೃಷಿ',
      nameHi: 'कृषि',
      sortOrder: 1,
    },
  });
  const education = await prisma.schemeCategory.create({
    data: {
      slug: 'education',
      nameEn: 'Education',
      nameKn: 'ಶಿಕ್ಷಣ',
      nameHi: 'शिक्षा',
      sortOrder: 2,
    },
  });

  const source = await prisma.schemeSource.create({
    data: {
      slug: 'test-source',
      name: 'Test Source',
      baseUrl: 'https://example.gov.in',
      sourceType: 'WEBSITE',
    },
  });

  const base = {
    department: 'Test Department',
    level: 'STATE',
    state: 'Karnataka',
    benefitsEn: 'Test benefits for eligible households.',
    benefitsKn: 'ಅರ್ಹ ಕುಟುಂಬಗಳಿಗೆ ಪರೀಕ್ಷಾ ಪ್ರಯೋಜನಗಳು.',
    requiredDocumentsJson: JSON.stringify(['Aadhaar card']),
    sourceId: source.id,
    version: 1,
  };

  const now = Date.now();

  const published = await prisma.scheme.create({
    data: {
      ...base,
      slug: 'test-published',
      titleEn: 'Test Published Scheme',
      titleKn: 'ಪರೀಕ್ಷಾ ಯೋಜನೆ',
      summaryEn: 'A published scheme used for public discovery tests.',
      summaryKn: 'ಸಾರ್ವಜನಿಕ ಶೋಧನಾ ಪರೀಕ್ಷೆಗೆ ಬಳಸುವ ಪ್ರಕಟಿತ ಯೋಜನೆ.',
      categoryId: agriculture.id,
      status: 'PUBLISHED',
      publishedAt: new Date(now - 2_000),
      views: 10,
      eligibilityRules: {
        create: {
          field: 'age',
          operator: 'GTE',
          valueJson: JSON.stringify(18),
          descriptionEn: 'Applicant is 18 years or older',
          descriptionKn: 'ಅರ್ಜಿದಾರರಿಗೆ 18 ವರ್ಷ ಅಥವಾ ಹೆಚ್ಚು ವಯಸ್ಸು',
          sortOrder: 0,
        },
      },
    },
  });

  await prisma.schemeVersion.create({
    data: {
      schemeId: published.id,
      version: 1,
      snapshotJson: JSON.stringify({ titleEn: 'Test Published Scheme', status: 'PUBLISHED' }),
      changeSummary: 'Initial version created',
    },
  });

  const secondPublished = await prisma.scheme.create({
    data: {
      ...base,
      slug: 'test-published-two',
      titleEn: 'Second Agriculture Scheme',
      titleKn: 'ಎರಡನೇ ಕೃಷಿ ಯೋಜನೆ',
      summaryEn: 'Another published agriculture scheme for related and compare tests.',
      summaryKn: 'ಸಂಬಂಧಿತ ಮತ್ತು ಹೋಲಿಕೆ ಪರೀಕ್ಷೆಗಳಿಗೆ ಇನ್ನೊಂದು ಪ್ರಕಟಿತ ಕೃಷಿ ಯೋಜನೆ.',
      categoryId: agriculture.id,
      status: 'PUBLISHED',
      publishedAt: new Date(now - 1_000),
      views: 3,
    },
  });

  const scholarship = await prisma.scheme.create({
    data: {
      ...base,
      slug: 'test-scholarship',
      titleEn: 'Test Scholarship',
      titleKn: 'ಪರೀಕ್ಷಾ ವಿದ್ಯಾರ್ಥಿವೇತನ',
      summaryEn: 'A published education scholarship for filters.',
      summaryKn: 'ಫಿಲ್ಟರ್‌ಗಳಿಗೆ ಪ್ರಕಟಿತ ಶಿಕ್ಷಣ ವಿದ್ಯಾರ್ಥಿವೇತನ.',
      categoryId: education.id,
      level: 'CENTRAL',
      status: 'PUBLISHED',
      publishedAt: new Date(now - 3_000),
      views: 25,
    },
  });

  const pending = await prisma.scheme.create({
    data: {
      ...base,
      slug: 'test-pending',
      titleEn: 'Test Pending Scheme',
      titleKn: 'ಪರೀಕ್ಷಾ ಬಾಕಿ ಯೋಜನೆ',
      summaryEn: 'A scheme still pending verification.',
      summaryKn: 'ಇನ್ನೂ ಪರಿಶೀಲನೆ ಬಾಕಿ ಇರುವ ಯೋಜನೆ.',
      categoryId: education.id,
      status: 'PENDING_VERIFICATION',
    },
  });

  return { agriculture, education, source, published, secondPublished, scholarship, pending };
}

beforeEach(async () => {
  await resetDatabase();
  await seedFixtures();
});

describe('public scheme discovery', () => {
  it('lists only published schemes with Kannada defaults', async () => {
    const response = await request(app).get('/api/schemes');
    expect(response.status).toBe(200);
    expect(response.body.filters.language).toBe('kn');
    expect(response.body.pagination.total).toBe(3);

    const slugs = response.body.schemes.map((scheme: { slug: string }) => scheme.slug);
    expect(slugs).toContain('test-published');
    expect(slugs).not.toContain('test-pending');

    const published = response.body.schemes.find(
      (scheme: { slug: string }) => scheme.slug === 'test-published',
    );
    expect(published.title).toBe('ಪರೀಕ್ಷಾ ಯೋಜನೆ');
    expect(published.category.name).toBe('ಕೃಷಿ');
    expect(published.availableLanguages).toEqual(expect.arrayContaining(['en', 'kn']));
  });

  it('filters by category and level and searches English text', async () => {
    const byCategory = await request(app).get('/api/schemes?category=agriculture');
    expect(byCategory.status).toBe(200);
    expect(byCategory.body.pagination.total).toBe(2);

    const byLevel = await request(app).get('/api/schemes?level=CENTRAL');
    expect(byLevel.body.pagination.total).toBe(1);
    expect(byLevel.body.schemes[0].slug).toBe('test-scholarship');

    const bySearch = await request(app).get('/api/schemes?q=Scholarship');
    expect(bySearch.body.schemes.map((scheme: { slug: string }) => scheme.slug)).toEqual([
      'test-scholarship',
    ]);
  });

  it('sorts by popularity and validates pagination input', async () => {
    const popular = await request(app).get('/api/schemes?sort=popular');
    expect(popular.status).toBe(200);
    expect(popular.body.schemes[0].slug).toBe('test-scholarship');

    const invalid = await request(app).get('/api/schemes?pageSize=500');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns detail with rules, documents and increments views', async () => {
    const response = await request(app).get('/api/schemes/test-published?language=kn');
    expect(response.status).toBe(200);
    expect(response.body.scheme.title).toBe('ಪರೀಕ್ಷಾ ಯೋಜನೆ');
    expect(response.body.scheme.views).toBe(11);
    expect(response.body.scheme.requiredDocuments).toEqual(['Aadhaar card']);
    expect(response.body.scheme.eligibilityRules[0].field).toBe('age');
    expect(response.body.scheme.eligibilityRules[0].value).toBe(18);
    expect(response.body.scheme.source.name).toBe('Test Source');

    const stored = await prisma.scheme.findUnique({ where: { slug: 'test-published' } });
    expect(stored?.views).toBe(11);
  });

  it('reports fallbacks when Hindi content is missing', async () => {
    const response = await request(app).get('/api/schemes/test-published?language=hi');
    expect(response.status).toBe(200);
    expect(response.body.scheme.language).toBe('hi');
    expect(response.body.scheme.title).toBe('Test Published Scheme');
    expect(response.body.scheme.fallbacks).toContain('title');
    expect(response.body.scheme.fallbacks).toContain('summary');
  });

  it('hides unpublished schemes from detail, related and compare', async () => {
    const detail = await request(app).get('/api/schemes/test-pending');
    expect(detail.status).toBe(404);

    const related = await request(app).get('/api/schemes/test-published/related');
    expect(related.status).toBe(200);
    expect(related.body.schemes.map((scheme: { slug: string }) => scheme.slug)).toEqual([
      'test-published-two',
    ]);

    const compare = await request(app).get(
      '/api/schemes/compare?slugs=test-published,test-pending',
    );
    expect(compare.status).toBe(200);
    expect(compare.body.comparedCount).toBe(1);
    expect(compare.body.missingSlugs).toEqual(['test-pending']);
    expect(compare.body.schemes[0].requiredDocuments).toEqual(['Aadhaar card']);

    const tooMany = await request(app).get(
      '/api/schemes/compare?slugs=test-published,test-published-two,test-scholarship,test-pending',
    );
    expect(tooMany.status).toBe(400);
  });

  it('lists active categories with published counts', async () => {
    const response = await request(app).get('/api/categories?language=kn');
    expect(response.status).toBe(200);

    const agriculture = response.body.categories.find(
      (category: { slug: string }) => category.slug === 'agriculture',
    );
    expect(agriculture.name).toBe('ಕೃಷಿ');
    expect(agriculture.schemeCount).toBe(2);
  });
});

describe('citizen bookmarks', () => {
  it('saves, lists and removes published schemes idempotently', async () => {
    const citizen = await registerCitizen();

    const created = await request(app)
      .post('/api/citizens/me/saved-schemes')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ slug: 'test-published' });
    expect(created.status).toBe(201);
    expect(created.body.alreadySaved).toBe(false);

    const duplicate = await request(app)
      .post('/api/citizens/me/saved-schemes')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ slug: 'test-published' });
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.alreadySaved).toBe(true);

    const list = await request(app)
      .get('/api/citizens/me/saved-schemes')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(list.status).toBe(200);
    expect(list.body.savedSchemes).toHaveLength(1);
    expect(list.body.savedSchemes[0].scheme.slug).toBe('test-published');

    const pending = await request(app)
      .post('/api/citizens/me/saved-schemes')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ slug: 'test-pending' });
    expect(pending.status).toBe(400);

    const removed = await request(app)
      .delete('/api/citizens/me/saved-schemes/test-published')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(removed.status).toBe(200);

    const removedAgain = await request(app)
      .delete('/api/citizens/me/saved-schemes/test-published')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(removedAgain.status).toBe(404);
  });
});

describe('admin scheme management', () => {
  it('blocks citizens but allows verifiers to read the admin catalogue', async () => {
    const citizen = await registerCitizen();
    const denied = await request(app)
      .get('/api/admin/schemes')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(denied.status).toBe(403);

    const verifier = await registerStaff('SCHEME_VERIFIER', 'verifier@example.com');
    const allowed = await request(app)
      .get('/api/admin/schemes')
      .set('Authorization', `Bearer ${verifier.token}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.pagination.total).toBe(4);
    expect(allowed.body.countsByStatus.PUBLISHED).toBe(3);
  });

  it('creates schemes with generated slugs, rules and an initial version', async () => {
    const verifier = await registerStaff('SCHEME_VERIFIER', 'verifier@example.com');

    const response = await request(app)
      .post('/api/admin/schemes')
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({
        titleEn: 'New Borewell Subsidy',
        titleKn: 'ಹೊಸ ಬೋರ್‌ವೆಲ್ ಸಬ್ಸಿಡಿ',
        summaryEn: 'A test scheme created through the admin API.',
        benefitsEn: 'Subsidy for borewell drilling on small farms.',
        department: 'Department of Agriculture',
        categorySlug: 'agriculture',
        sourceSlug: 'test-source',
        requiredDocuments: ['Aadhaar card', 'Land records'],
        rules: [
          {
            field: 'landHoldingAcres',
            operator: 'LTE',
            value: 5,
            descriptionEn: 'Land holding up to 5 acres',
          },
        ],
      });

    expect(response.status).toBe(201);
    const scheme = response.body.scheme;
    expect(scheme.slug).toBe('new-borewell-subsidy');
    expect(scheme.status).toBe('PENDING_VERIFICATION');
    expect(scheme.version).toBe(1);
    expect(scheme.requiredDocuments).toEqual(['Aadhaar card', 'Land records']);
    expect(scheme.eligibilityRules[0].value).toBe(5);
    expect(scheme.admin.versions).toHaveLength(1);
    expect(scheme.admin.createdBy.id).toBe(verifier.id);

    const duplicate = await request(app)
      .post('/api/admin/schemes')
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({
        titleEn: 'Duplicate Slug',
        summaryEn: 'This create call reuses an explicit slug.',
        benefitsEn: 'Benefits text.',
        department: 'Department of Agriculture',
        categorySlug: 'agriculture',
        slug: 'test-published',
      });
    expect(duplicate.status).toBe(409);

    const unknownCategory = await request(app)
      .post('/api/admin/schemes')
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({
        titleEn: 'Unknown Category',
        summaryEn: 'This create call uses an unknown category.',
        benefitsEn: 'Benefits text.',
        department: 'Department of Agriculture',
        categorySlug: 'does-not-exist',
      });
    expect(unknownCategory.status).toBe(400);
  });

  it('re-verifies published schemes after a content edit and bumps versions', async () => {
    const verifier = await registerStaff('SCHEME_VERIFIER', 'verifier@example.com');

    const unchanged = await request(app)
      .patch('/api/admin/schemes/test-published')
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({ titleEn: 'Test Published Scheme' });
    expect(unchanged.status).toBe(404);

    const stored = await prisma.scheme.findUnique({ where: { slug: 'test-published' } });
    const update = await request(app)
      .patch(`/api/admin/schemes/${stored!.id}?language=en`)
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({ titleEn: 'Updated Published Scheme' });

    expect(update.status).toBe(200);
    expect(update.body.changed).toEqual(['titleEn']);
    expect(update.body.scheme.status).toBe('PENDING_VERIFICATION');
    expect(update.body.scheme.publishedAt).toBeNull();
    expect(update.body.scheme.version).toBe(2);
    expect(update.body.scheme.title).toBe('Updated Published Scheme');

    const versions = await request(app)
      .get(`/api/admin/schemes/${stored!.id}/versions`)
      .set('Authorization', `Bearer ${verifier.token}`);
    expect(versions.status).toBe(200);
    expect(versions.body.versions).toHaveLength(2);
    expect(versions.body.versions[0].snapshot.titleEn).toBe('Updated Published Scheme');

    const noChange = await request(app)
      .patch(`/api/admin/schemes/${stored!.id}`)
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({ titleKn: 'ಪರೀಕ್ಷಾ ಯೋಜನೆ' });
    expect(noChange.status).toBe(200);
    expect(noChange.body.changed).toEqual([]);
    expect(noChange.body.scheme.version).toBe(2);
  });

  it('enforces verify, publish and expire roles and transitions', async () => {
    const verifier = await registerStaff('SCHEME_VERIFIER', 'verifier@example.com');
    const admin = await registerStaff('ADMIN', 'admin@example.com');

    const created = await request(app)
      .post('/api/admin/schemes')
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({
        titleEn: 'Workflow Scheme',
        summaryEn: 'A scheme used to exercise the verification workflow.',
        benefitsEn: 'Workflow benefits.',
        department: 'Department of Agriculture',
        categorySlug: 'agriculture',
      });
    expect(created.status).toBe(201);
    const schemeId = created.body.scheme.id as string;

    const earlyPublish = await request(app)
      .post(`/api/admin/schemes/${schemeId}/publish`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(earlyPublish.status).toBe(409);

    const approved = await request(app)
      .post(`/api/admin/schemes/${schemeId}/verify`)
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({ action: 'APPROVED', notes: 'Checked against notification.' });
    expect(approved.status).toBe(200);
    expect(approved.body.scheme.status).toBe('VERIFIED');
    expect(approved.body.scheme.lastVerifiedAt).toBeTruthy();
    expect(approved.body.verification.action).toBe('APPROVED');

    const verifierPublish = await request(app)
      .post(`/api/admin/schemes/${schemeId}/publish`)
      .set('Authorization', `Bearer ${verifier.token}`);
    expect(verifierPublish.status).toBe(403);

    const published = await request(app)
      .post(`/api/admin/schemes/${schemeId}/publish`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(published.status).toBe(200);
    expect(published.body.scheme.status).toBe('PUBLISHED');
    expect(published.body.scheme.publishedAt).toBeTruthy();

    const expired = await request(app)
      .post(`/api/admin/schemes/${schemeId}/expire`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(expired.status).toBe(200);
    expect(expired.body.scheme.status).toBe('EXPIRED');

    const publicDetail = await request(app).get('/api/schemes/workflow-scheme');
    expect(publicDetail.status).toBe(404);
  });

  it('records rejection and request-changes decisions', async () => {
    const verifier = await registerStaff('SCHEME_VERIFIER', 'verifier@example.com');
    const stored = await prisma.scheme.findUnique({ where: { slug: 'test-pending' } });

    const changes = await request(app)
      .post(`/api/admin/schemes/${stored!.id}/verify`)
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({ action: 'REQUEST_CHANGES', notes: 'Add the official notification number.' });
    expect(changes.status).toBe(200);
    expect(changes.body.scheme.status).toBe('PENDING_VERIFICATION');

    const rejected = await request(app)
      .post(`/api/admin/schemes/${stored!.id}/verify`)
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({ action: 'REJECTED', notes: 'Duplicate of an existing scheme.' });
    expect(rejected.status).toBe(200);
    expect(rejected.body.scheme.status).toBe('REJECTED');

    const result = await prisma.verificationRecord.count({ where: { schemeId: stored!.id } });
    expect(result).toBe(2);
  });

  it('merges translation fields and records review quality', async () => {
    const verifier = await registerStaff('SCHEME_VERIFIER', 'verifier@example.com');
    const stored = await prisma.scheme.findUnique({ where: { slug: 'test-published' } });

    const first = await request(app)
      .put(`/api/admin/schemes/${stored!.id}/translations/kn`)
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({ fields: { description: 'ಹೊಸ ವಿವರಣೆ' }, quality: 'REVIEWED' });
    expect(first.status).toBe(200);
    expect(first.body.translation.fields.description).toBe('ಹೊಸ ವಿವರಣೆ');
    expect(first.body.translation.quality).toBe('REVIEWED');
    expect(first.body.translation.reviewedById).toBe(verifier.id);

    const second = await request(app)
      .put(`/api/admin/schemes/${stored!.id}/translations/kn`)
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({ fields: { summary: 'ಹೊಸ ಸಾರಾಂಶ' }, quality: 'VERIFIED' });
    expect(second.status).toBe(200);
    expect(second.body.translation.fields.description).toBe('ಹೊಸ ವಿವರಣೆ');
    expect(second.body.translation.fields.summary).toBe('ಹೊಸ ಸಾರಾಂಶ');
    expect(second.body.translation.quality).toBe('VERIFIED');

    const detail = await request(app)
      .get(`/api/admin/schemes/${stored!.id}?language=kn`)
      .set('Authorization', `Bearer ${verifier.token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.scheme.description).toBe('ಹೊಸ ವಿವರಣೆ');
    expect(detail.body.scheme.admin.translationReviews[0].quality).toBe('VERIFIED');

    const invalidLanguage = await request(app)
      .put(`/api/admin/schemes/${stored!.id}/translations/fr`)
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({ fields: { title: 'Test' } });
    expect(invalidLanguage.status).toBe(400);
  });
});
