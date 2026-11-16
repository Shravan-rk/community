import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { resetDatabase } from './helpers/db.js';

const app = createApp();
const PASSWORD = 'Citizen1234';
const STAFF_PASSWORD = 'Verifier1234';

let admin: { token: string; id: string };
let verifier: { token: string; id: string };
let citizen: { token: string; id: string };
let schemeId: string;
let centreId: string;

async function registerCitizen(email = 'ops-citizen@example.com') {
  const response = await request(app).post('/api/auth/register').send({
    fullName: 'Ops Citizen',
    email,
    password: PASSWORD,
    preferredLanguage: 'en',
  });
  expect(response.status).toBe(201);
  return { token: response.body.token as string, id: response.body.user.id as string };
}

async function registerStaff(role: 'SCHEME_VERIFIER' | 'ADMIN', email: string) {
  const response = await request(app)
    .post('/api/auth/register/staff')
    .send({
      fullName: role === 'ADMIN' ? 'Ops Admin' : 'Ops Verifier',
      email,
      password: STAFF_PASSWORD,
      role,
      inviteCode: role === 'ADMIN' ? 'test-admin-invite-code' : 'test-staff-invite-code',
    });
  expect(response.status).toBe(201);
  return { token: response.body.token as string, id: response.body.user.id as string };
}

async function seedFixtures() {
  const category = await prisma.schemeCategory.create({
    data: { slug: 'agriculture', nameEn: 'Agriculture', nameKn: 'ಕೃಷಿ', nameHi: 'कृषि' },
  });

  const scheme = await prisma.scheme.create({
    data: {
      slug: 'ops-test-scheme',
      titleEn: 'Ops Test Scheme',
      titleKn: 'ಕಾರ್ಯಾಚರಣೆ ಪರೀಕ್ಷಾ ಯೋಜನೆ',
      summaryEn: 'A scheme used by operations tests.',
      summaryKn: 'ಕಾರ್ಯಾಚರಣೆ ಪರೀಕ್ಷೆಗಳಿಗೆ ಬಳಸುವ ಯೋಜನೆ.',
      benefitsEn: 'Test benefit.',
      benefitsKn: 'ಪರೀಕ್ಷಾ ಲಾಭ.',
      eligibilityEn: 'Test eligibility.',
      eligibilityKn: 'ಪರೀಕ್ಷಾ ಅರ್ಹತೆ.',
      department: 'Test Department',
      level: 'CENTRAL',
      categoryId: category.id,
      status: 'PUBLISHED',
      isDemoData: true,
      publishedAt: new Date(),
    },
  });
  schemeId = scheme.id;

  const centre = await prisma.assistanceCentre.create({
    data: {
      name: 'Test CSC',
      type: 'CSC',
      address: 'Test address',
      district: 'Bengaluru Urban',
      taluk: 'Bengaluru South',
      isActive: true,
    },
  });
  centreId = centre.id;
}

beforeEach(async () => {
  await resetDatabase();
  await seedFixtures();
  admin = await registerStaff('ADMIN', 'ops-admin@example.com');
  verifier = await registerStaff('SCHEME_VERIFIER', 'ops-verifier@example.com');
  citizen = await registerCitizen();
});

describe('applications', () => {
  it('creates, lists, updates and deletes a draft application for the signed-in citizen', async () => {
    const created = await request(app)
      .post('/api/citizens/me/applications')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ schemeSlug: 'ops-test-scheme', notes: 'Visited the CSC.' });
    expect(created.status).toBe(201);
    expect(created.body.application.status).toBe('DRAFT');
    const applicationId = created.body.application.id as string;

    const duplicate = await request(app)
      .post('/api/citizens/me/applications')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ schemeSlug: 'ops-test-scheme' });
    expect(duplicate.status).toBe(409);

    const updated = await request(app)
      .patch(`/api/citizens/me/applications/${applicationId}`)
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ status: 'SUBMITTED_OFFLINE', referenceNumber: 'REF-123' });
    expect(updated.status).toBe(200);
    expect(updated.body.application.status).toBe('SUBMITTED_OFFLINE');
    expect(updated.body.application.referenceNumber).toBe('REF-123');
    expect(updated.body.application.submittedAt).toBeTruthy();

    const list = await request(app)
      .get('/api/citizens/me/applications?language=en')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(list.status).toBe(200);
    expect(list.body.applications).toHaveLength(1);
    expect(list.body.applications[0].scheme.slug).toBe('ops-test-scheme');

    const cannotDelete = await request(app)
      .delete(`/api/citizens/me/applications/${applicationId}`)
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(cannotDelete.status).toBe(409);
  });

  it('lets staff update an application and notifies the citizen', async () => {
    const created = await request(app)
      .post('/api/citizens/me/applications')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ schemeSlug: 'ops-test-scheme', status: 'TRACKING' });
    const applicationId = created.body.application.id as string;

    const denied = await request(app)
      .patch(`/api/admin/applications/${applicationId}`)
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ status: 'COMPLETED' });
    expect(denied.status).toBe(403);

    const updated = await request(app)
      .patch(`/api/admin/applications/${applicationId}`)
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({ status: 'COMPLETED' });
    expect(updated.status).toBe(200);
    expect(updated.body.application.status).toBe('COMPLETED');

    const notifications = await request(app)
      .get('/api/citizens/me/notifications')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(notifications.status).toBe(200);
    expect(notifications.body.unreadCount).toBe(1);
    expect(notifications.body.notifications[0].type).toBe('APPLICATION');
    expect(notifications.body.notifications[0].title).toContain('Ops Test Scheme');
  });
});

describe('notifications', () => {
  it('notifies citizens who saved a scheme when it is published, and marks reads', async () => {
    await prisma.savedScheme.create({ data: { userId: citizen.id, schemeId } });
    await prisma.scheme.update({ where: { id: schemeId }, data: { status: 'VERIFIED', publishedAt: null } });

    const published = await request(app)
      .post(`/api/admin/schemes/${schemeId}/publish`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(published.status).toBe(200);

    const list = await request(app)
      .get('/api/citizens/me/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(list.status).toBe(200);
    expect(list.body.unreadCount).toBe(1);
    const notificationId = list.body.notifications[0].id as string;

    const read = await request(app)
      .patch(`/api/citizens/me/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(read.status).toBe(200);

    const after = await request(app)
      .get('/api/citizens/me/notifications')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(after.body.unreadCount).toBe(0);
    expect(after.body.notifications[0].read).toBe(true);

    const readAll = await request(app)
      .post('/api/citizens/me/notifications/read-all')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(readAll.status).toBe(200);
    expect(readAll.body.markedRead).toBe(0);
  });
});

describe('assistance, feedback and analytics', () => {
  it('lists centres publicly and tracks assistance requests through staff updates', async () => {
    const centres = await request(app).get('/api/assistance-centres?district=Bengaluru%20Urban');
    expect(centres.status).toBe(200);
    expect(centres.body.centres).toHaveLength(1);

    const created = await request(app)
      .post('/api/assistance-requests')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({
        centreId,
        subject: 'Need help with documents',
        description: 'Please help me understand which documents are needed.',
        contactPhone: '+91 90000 33333',
      });
    expect(created.status).toBe(201);
    const requestId = created.body.request.id as string;

    const mine = await request(app)
      .get('/api/assistance-requests/me')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.requests).toHaveLength(1);

    const updated = await request(app)
      .patch(`/api/admin/assistance-requests/${requestId}`)
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({ status: 'IN_PROGRESS', assignedToId: verifier.id });
    expect(updated.status).toBe(200);
    expect(updated.body.request.assignedTo.id).toBe(verifier.id);

    const notifications = await request(app)
      .get('/api/citizens/me/notifications')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(notifications.body.notifications[0].type).toBe('SYSTEM');
  });

  it('accepts feedback and allows staff to review it', async () => {
    const created = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ schemeSlug: 'ops-test-scheme', rating: 4, message: 'The summary was easy to understand.' });
    expect(created.status).toBe(201);

    const staffList = await request(app)
      .get('/api/admin/feedback')
      .set('Authorization', `Bearer ${verifier.token}`);
    expect(staffList.status).toBe(200);
    expect(staffList.body.feedback).toHaveLength(1);

    const reviewed = await request(app)
      .patch(`/api/admin/feedback/${created.body.feedback.id}`)
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({ status: 'REVIEWED' });
    expect(reviewed.status).toBe(200);
    expect(reviewed.body.feedback.status).toBe('REVIEWED');
  });

  it('returns admin analytics with real aggregates and blocks citizens', async () => {
    const denied = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(denied.status).toBe(403);

    const analytics = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(analytics.status).toBe(200);
    expect(analytics.body.totals.users).toBeGreaterThanOrEqual(3);
    expect(analytics.body.totals.publishedSchemes).toBe(1);
    expect(analytics.body.usersByRole.CITIZEN).toBe(1);
    expect(analytics.body.schemesByStatus.PUBLISHED).toBe(1);
  });

  it('lets admins create assistance centres but blocks verifiers', async () => {
    const denied = await request(app)
      .post('/api/admin/centres')
      .set('Authorization', `Bearer ${verifier.token}`)
      .send({
        name: 'Verifier Centre',
        type: 'CSC',
        address: 'Somewhere',
        district: 'Mysuru',
      });
    expect(denied.status).toBe(403);

    const created = await request(app)
      .post('/api/admin/centres')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'New Admin Centre',
        type: 'CSC',
        address: 'Main Road',
        district: 'Mysuru',
        taluk: 'Mysuru',
        phone: '+91 90000 44444',
      });
    expect(created.status).toBe(201);
    expect(created.body.centre.verifiedAt).toBeTruthy();
  });
});
