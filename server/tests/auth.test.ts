import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';

const app = createApp();

const CITIZEN = {
  fullName: 'Lakshmi Devi',
  email: 'lakshmi@example.com',
  phone: '+91 98450 12345',
  password: 'Farmer1234',
};

async function registerCitizen(overrides: Partial<typeof CITIZEN> = {}) {
  const payload = { ...CITIZEN, ...overrides };
  const response = await request(app).post('/api/auth/register').send(payload);
  return { response, payload };
}

async function registerAndLogin(overrides: Partial<typeof CITIZEN> = {}) {
  const { response, payload } = await registerCitizen(overrides);
  expect(response.status).toBe(201);
  return { token: response.body.token as string, user: response.body.user, payload };
}

beforeEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
});

describe('health and metadata', () => {
  it('reports a healthy service and database', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.database).toBe('ok');
  });

  it('exposes the five RBAC roles', async () => {
    const response = await request(app).get('/api/meta');
    expect(response.status).toBe(200);
    expect(response.body.roles).toEqual([
      'CITIZEN',
      'VILLAGE_FACILITATOR',
      'SCHEME_VERIFIER',
      'ADMIN',
      'SUPER_ADMIN',
    ]);
  });

  it('returns a structured 404 for unknown API routes', async () => {
    const response = await request(app).get('/api/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('registration', () => {
  it('rejects invalid input with field level errors', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'A', email: 'not-an-email', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(response.body.error.details.fields)).toBe(true);
  });

  it('creates a citizen with profile, preferences and consent', async () => {
    const { response } = await registerCitizen();
    expect(response.status).toBe(201);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.role).toBe('CITIZEN');
    expect(response.body.user.passwordHash).toBeUndefined();

    const profile = await prisma.citizenProfile.findUnique({
      where: { userId: response.body.user.id },
    });
    const preference = await prisma.notificationPreference.findUnique({
      where: { userId: response.body.user.id },
    });
    const consent = await prisma.userConsent.findFirst({
      where: { userId: response.body.user.id, consentType: 'DATA_PROCESSING' },
    });

    expect(profile?.state).toBe('Karnataka');
    expect(preference?.inApp).toBe(true);
    expect(consent?.granted).toBe(true);
  });

  it('prevents duplicate email registration', async () => {
    await registerCitizen();
    const { response } = await registerCitizen();
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });
});

describe('login and session', () => {
  it('rejects a wrong password', async () => {
    await registerCitizen();
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: CITIZEN.email, password: 'WrongPass123' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('logs in and returns the session user', async () => {
    await registerCitizen();
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: CITIZEN.email, password: CITIZEN.password });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.email).toBe(CITIZEN.email);
    expect(response.body.profile.state).toBe('Karnataka');
  });

  it('rejects /me without a token', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });

  it('returns the current user with profile and preferences', async () => {
    const { token } = await registerAndLogin();
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(CITIZEN.email);
    expect(response.body.profile).toBeTruthy();
    expect(response.body.notificationPreference.inApp).toBe(true);
  });

  it('rejects a malformed token', async () => {
    const response = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-jwt');
    expect(response.status).toBe(401);
  });
});

describe('citizen profile and consents', () => {
  it('updates the profile using validated data', async () => {
    const { token } = await registerAndLogin();

    const update = await request(app)
      .patch('/api/citizens/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        district: 'Mysuru',
        taluk: 'Hunsur',
        occupation: 'FARMER',
        annualIncome: 150000,
        landHoldingAcres: 2.25,
        socialCategory: 'OBC',
        onboardingCompleted: true,
      });

    expect(update.status).toBe(200);
    expect(update.body.profile.district).toBe('Mysuru');

    const read = await request(app)
      .get('/api/citizens/me/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(read.body.profile.annualIncome).toBe(150000);
  });

  it('rejects invalid profile values', async () => {
    const { token } = await registerAndLogin();
    const response = await request(app)
      .patch('/api/citizens/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ aadhaarLast4: '12345', annualIncome: -5 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('updates notification preferences and consents', async () => {
    const { token } = await registerAndLogin();

    const preferences = await request(app)
      .patch('/api/citizens/me/notification-preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ sms: true, categories: ['agriculture'], quietHoursStart: 22, quietHoursEnd: 7 });

    expect(preferences.status).toBe(200);
    expect(preferences.body.preferences.sms).toBe(true);
    expect(preferences.body.preferences.categories).toEqual(['agriculture']);

    const consents = await request(app)
      .put('/api/citizens/me/consents')
      .set('Authorization', `Bearer ${token}`)
      .send({ consents: [{ consentType: 'NOTIFICATIONS_SMS', granted: true }] });

    expect(consents.status).toBe(200);
    expect(consents.body.consents).toHaveLength(1);
  });
});

describe('role based access control', () => {
  it('blocks citizens from the admin area', async () => {
    const { token } = await registerAndLogin();
    const response = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
  });

  it('rejects staff registration with a wrong invite code', async () => {
    const response = await request(app).post('/api/auth/register/staff').send({
      ...CITIZEN,
      role: 'SCHEME_VERIFIER',
      inviteCode: 'wrong-code',
    });
    expect(response.status).toBe(403);
  });

  it('registers staff with the correct invite code', async () => {
    const response = await request(app)
      .post('/api/auth/register/staff')
      .send({
        fullName: 'Scheme Verifier',
        email: 'verifier@example.com',
        password: 'Verifier1234',
        role: 'SCHEME_VERIFIER',
        inviteCode: 'test-staff-invite-code',
      });

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('SCHEME_VERIFIER');
  });

  it('allows admins to read admin stats but not change roles', async () => {
    const admin = await request(app)
      .post('/api/auth/register/staff')
      .send({
        fullName: 'District Admin',
        email: 'admin@example.com',
        password: 'Admin12345',
        role: 'ADMIN',
        inviteCode: 'test-admin-invite-code',
      });
    expect(admin.status).toBe(201);

    const stats = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${admin.body.token}`);
    expect(stats.status).toBe(200);
    expect(stats.body.totals.users).toBeGreaterThan(0);

    const citizen = await registerCitizen({ email: 'other@example.com', phone: '+91 90000 00000' });
    const roleChange = await request(app)
      .patch(`/api/admin/users/${citizen.response.body.user.id}/role`)
      .set('Authorization', `Bearer ${admin.body.token}`)
      .send({ role: 'SUPER_ADMIN' });

    expect(roleChange.status).toBe(403);
  });
});
