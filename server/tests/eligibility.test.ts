import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import {
  buildEligibilityAttributes,
  calculateAge,
  evaluateEligibility,
  type EligibilityProfile,
  type EligibilityRuleInput,
} from '../src/lib/eligibility.js';
import { resetDatabase } from './helpers/db.js';

const app = createApp();

const NOW = new Date('2026-06-01T00:00:00.000Z');

function makeProfile(overrides: Partial<EligibilityProfile> = {}): EligibilityProfile {
  return {
    dateOfBirth: new Date('1995-06-15T00:00:00.000Z'),
    gender: 'FEMALE',
    state: 'Karnataka',
    district: null,
    occupation: 'FARMER',
    annualIncome: 200000,
    education: 'DEGREE',
    landHoldingAcres: 2,
    familySize: 4,
    disabilityStatus: false,
    socialCategory: 'OBC',
    profileJson: null,
    onboardingCompleted: true,
    ...overrides,
  };
}

function makeRule(
  field: string,
  operator: string,
  value: unknown,
  overrides: Partial<EligibilityRuleInput> = {},
): EligibilityRuleInput {
  return {
    field,
    operator,
    valueJson: JSON.stringify(value),
    descriptionEn: `${field} ${operator} ${String(value)}`,
    descriptionKn: `${field} ನಿಯಮ`,
    isRequired: true,
    sortOrder: 0,
    ...overrides,
  };
}

describe('eligibility evaluator', () => {
  it('derives age from date of birth with birthday boundaries', () => {
    const dob = new Date('2000-05-10T00:00:00.000Z');
    expect(calculateAge(dob, new Date('2026-05-09T00:00:00.000Z'))).toBe(25);
    expect(calculateAge(dob, new Date('2026-05-10T00:00:00.000Z'))).toBe(26);
    expect(calculateAge(dob, new Date('2026-12-31T00:00:00.000Z'))).toBe(26);
  });

  it('marks a profile likely eligible when required rules are met', () => {
    const result = evaluateEligibility(
      [
        makeRule('gender', 'EQ', 'FEMALE'),
        makeRule('age', 'GTE', 18),
        makeRule('annualIncome', 'LTE', 300000, { sortOrder: 1 }),
        makeRule('state', 'EQ', 'Karnataka', { sortOrder: 2 }),
      ],
      makeProfile(),
      'en',
      NOW,
    );

    expect(result.assessment).toBe('LIKELY_ELIGIBLE');
    expect(result.likelyEligible).toBe(true);
    expect(result.counts).toMatchObject({ total: 4, required: 4, met: 4, notMet: 0, unknown: 0 });
    expect(result.missingProfileFields).toEqual([]);
    expect(result.rules[1].actual).toBe(30);
  });

  it('marks a profile not eligible when any required rule fails', () => {
    const result = evaluateEligibility(
      [makeRule('annualIncome', 'LTE', 100000), makeRule('gender', 'EQ', 'FEMALE', { sortOrder: 1 })],
      makeProfile(),
      'en',
      NOW,
    );

    expect(result.assessment).toBe('NOT_ELIGIBLE');
    expect(result.likelyEligible).toBe(false);
    expect(result.rules[0]).toMatchObject({
      status: 'NOT_MET',
      reason: 'MISMATCH',
      expected: 100000,
      actual: 200000,
    });
    expect(result.counts.notMet).toBe(1);
  });

  it('needs information when required data is missing', () => {
    const result = evaluateEligibility(
      [makeRule('gender', 'EQ', 'FEMALE'), makeRule('district', 'EQ', 'Mysuru', { sortOrder: 1 })],
      makeProfile(),
      'kn',
      NOW,
    );

    expect(result.assessment).toBe('NEEDS_INFORMATION');
    expect(result.missingProfileFields).toEqual(['district']);
    expect(result.disclaimer).toContain('ಅಂತಿಮ ಅರ್ಹತೆಯನ್ನು');
    expect(result.label).toBe('ಹೆಚ್ಚಿನ ಮಾಹಿತಿ ಅಗತ್ಯ');
  });

  it('is not assessable without required rules and ignores optional mismatches', () => {
    expect(evaluateEligibility([], makeProfile(), 'en', NOW).assessment).toBe('NOT_ASSESSABLE');

    const optionalMismatch = evaluateEligibility(
      [
        makeRule('gender', 'EQ', 'FEMALE'),
        makeRule('annualIncome', 'LTE', 1, { isRequired: false, sortOrder: 1 }),
      ],
      makeProfile(),
      'en',
      NOW,
    );
    expect(optionalMismatch.assessment).toBe('LIKELY_ELIGIBLE');
    expect(optionalMismatch.counts.optional).toBe(1);
    expect(optionalMismatch.counts.notMet).toBe(1);
  });

  it('supports all rule operators and type normalisation', () => {
    const cases: Array<{ rule: EligibilityRuleInput; status: string }> = [
      { rule: makeRule('annualIncome', 'GTE', 250000), status: 'NOT_MET' },
      { rule: makeRule('annualIncome', 'GTE', 200000), status: 'MET' },
      { rule: makeRule('familySize', 'LTE', '4'), status: 'MET' },
      { rule: makeRule('gender', 'EQ', 'female'), status: 'MET' },
      { rule: makeRule('gender', 'NEQ', 'MALE'), status: 'MET' },
      { rule: makeRule('education', 'IN', ['DEGREE', 'DIPLOMA']), status: 'MET' },
      { rule: makeRule('education', 'IN', 'DEGREE'), status: 'UNKNOWN' },
      { rule: makeRule('occupation', 'CONTAINS', 'farm'), status: 'MET' },
      { rule: makeRule('district', 'CONTAINS', 'mys'), status: 'UNKNOWN' },
      { rule: makeRule('socialCategory', 'EXISTS', true), status: 'MET' },
      { rule: makeRule('district', 'EXISTS', true), status: 'UNKNOWN' },
      { rule: makeRule('gender', 'GT', 'FEMALE'), status: 'UNKNOWN' },
    ];

    for (const entry of cases) {
      const result = evaluateEligibility([entry.rule], makeProfile(), 'en', NOW);
      expect(result.rules[0].status, `${entry.rule.field} ${entry.rule.operator}`).toBe(entry.status);
    }
  });

  it('flags invalid rule JSON as unknown instead of guessing', () => {
    const result = evaluateEligibility(
      [{ ...makeRule('age', 'GTE', 18), valueJson: '{not-json' }],
      makeProfile(),
      'en',
      NOW,
    );
    expect(result.rules[0]).toMatchObject({ status: 'UNKNOWN', reason: 'INVALID_RULE', expected: null });
    expect(result.assessment).toBe('NEEDS_INFORMATION');
  });

  it('uses profileJson for extra fields without overriding explicit columns', () => {
    const profile = makeProfile({
      district: 'Mysuru',
      profileJson: JSON.stringify({ hasRationCard: true, gender: 'MALE' }),
    });
    const attributes = buildEligibilityAttributes(profile, NOW);
    expect(attributes.gender).toBe('FEMALE');
    expect(attributes.hasRationCard).toBe(true);

    const result = evaluateEligibility(
      [
        makeRule('hasRationCard', 'EXISTS', true),
        makeRule('district', 'CONTAINS', 'mysuru', { sortOrder: 1 }),
      ],
      profile,
      'en',
      NOW,
    );
    expect(result.assessment).toBe('LIKELY_ELIGIBLE');
  });
});

async function seedEligibilityFixtures() {
  const category = await prisma.schemeCategory.create({
    data: {
      slug: 'welfare',
      nameEn: 'Welfare',
      nameKn: 'ಕಲ್ಯಾಣ',
      nameHi: 'कल्याण',
      sortOrder: 1,
    },
  });

  const base = {
    department: 'Test Welfare Department',
    level: 'STATE',
    state: 'Karnataka',
    benefitsEn: 'Test benefits.',
    benefitsKn: 'ಪರೀಕ್ಷಾ ಪ್ರಯೋಜನಗಳು.',
    categoryId: category.id,
    status: 'PUBLISHED',
    publishedAt: new Date('2026-05-01T00:00:00.000Z'),
  };

  const matching = await prisma.scheme.create({
    data: {
      ...base,
      slug: 'match-all',
      titleEn: 'Matching Scheme',
      titleKn: 'ಹೊಂದುವ ಯೋಜನೆ',
      summaryEn: 'All required rules should match this citizen profile.',
      summaryKn: 'ಈ ಪ್ರೊಫೈಲ್‌ಗೆ ಎಲ್ಲಾ ಅಗತ್ಯ ನಿಯಮಗಳು ಹೊಂದುತ್ತವೆ.',
      eligibilityRules: {
        create: [
          {
            field: 'gender',
            operator: 'EQ',
            valueJson: JSON.stringify('FEMALE'),
            descriptionEn: 'Applicant is a woman',
            descriptionKn: 'ಅರ್ಜಿದಾರರು ಮಹಿಳೆ',
            sortOrder: 0,
          },
          {
            field: 'age',
            operator: 'GTE',
            valueJson: JSON.stringify(18),
            descriptionEn: 'Applicant is 18 or older',
            descriptionKn: 'ಅರ್ಜಿದಾರರಿಗೆ 18 ವರ್ಷ ಅಥವಾ ಹೆಚ್ಚು',
            sortOrder: 1,
          },
          {
            field: 'annualIncome',
            operator: 'LTE',
            valueJson: JSON.stringify(300000),
            descriptionEn: 'Annual income up to 3 lakh',
            descriptionKn: 'ವಾರ್ಷಿಕ ಆದಾಯ 3 ಲಕ್ಷದವರೆಗೆ',
            sortOrder: 2,
          },
          {
            field: 'state',
            operator: 'EQ',
            valueJson: JSON.stringify('Karnataka'),
            descriptionEn: 'Resident of Karnataka',
            descriptionKn: 'ಕರ್ನಾಟಕದ ನಿವಾಸಿ',
            sortOrder: 3,
          },
        ],
      },
    },
  });

  const failing = await prisma.scheme.create({
    data: {
      ...base,
      slug: 'fail-income',
      titleEn: 'Low Income Scheme',
      titleKn: 'ಕಡಿಮೆ ಆದಾಯ ಯೋಜನೆ',
      summaryEn: 'Requires a much lower annual income.',
      summaryKn: 'ಬಹಳ ಕಡಿಮೆ ವಾರ್ಷಿಕ ಆದಾಯದ ಅಗತ್ಯವಿದೆ.',
      publishedAt: new Date('2026-05-02T00:00:00.000Z'),
      eligibilityRules: {
        create: [
          {
            field: 'annualIncome',
            operator: 'LTE',
            valueJson: JSON.stringify(100000),
            descriptionEn: 'Annual income up to 1 lakh',
            descriptionKn: 'ವಾರ್ಷಿಕ ಆದಾಯ 1 ಲಕ್ಷದವರೆಗೆ',
            sortOrder: 0,
          },
        ],
      },
    },
  });

  const needsInformation = await prisma.scheme.create({
    data: {
      ...base,
      slug: 'needs-district',
      titleEn: 'District Scheme',
      titleKn: 'ಜಿಲ್ಲಾ ಯೋಜನೆ',
      summaryEn: 'Requires the citizen district before assessment.',
      summaryKn: 'ಮೌಲ್ಯಮಾಪನಕ್ಕೆ ಮೊದಲು ಜಿಲ್ಲೆಯ ಮಾಹಿತಿ ಬೇಕು.',
      publishedAt: new Date('2026-05-03T00:00:00.000Z'),
      eligibilityRules: {
        create: [
          {
            field: 'district',
            operator: 'EQ',
            valueJson: JSON.stringify('Mysuru'),
            descriptionEn: 'Resident of Mysuru district',
            descriptionKn: 'ಮೈಸೂರು ಜಿಲ್ಲೆಯ ನಿವಾಸಿ',
            sortOrder: 0,
          },
        ],
      },
    },
  });

  const noRules = await prisma.scheme.create({
    data: {
      ...base,
      slug: 'no-rules',
      titleEn: 'Guidelines Only Scheme',
      titleKn: 'ಕೇವಲ ಮಾರ್ಗಸೂಚಿ ಯೋಜನೆ',
      summaryEn: 'No machine-readable eligibility rules are available.',
      summaryKn: 'ಯಂತ್ರ-ಓದಬಲ್ಲ ಅರ್ಹತಾ ನಿಯಮಗಳಿಲ್ಲ.',
      publishedAt: new Date('2026-05-04T00:00:00.000Z'),
    },
  });

  const pending = await prisma.scheme.create({
    data: {
      ...base,
      slug: 'pending-eligibility',
      titleEn: 'Pending Eligibility Scheme',
      titleKn: 'ಬಾಕಿ ಅರ್ಹತಾ ಯೋಜನೆ',
      summaryEn: 'Not Yet published, must not be evaluated publicly.',
      summaryKn: 'ಇನ್ನೂ ಪ್ರಕಟವಾಗಿಲ್ಲ.',
      status: 'PENDING_VERIFICATION',
      publishedAt: null,
    },
  });

  return { category, matching, failing, needsInformation, noRules, pending };
}

async function registerCitizenWithProfile() {
  const response = await request(app).post('/api/auth/register').send({
    fullName: 'Eligibility Citizen',
    email: 'eligibility@example.com',
    phone: '+91 90000 22222',
    password: 'Citizen1234',
  });
  expect(response.status).toBe(201);
  const token = response.body.token as string;

  const profile = await request(app)
    .patch('/api/citizens/me/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({
      dateOfBirth: '1995-06-15',
      gender: 'FEMALE',
      state: 'Karnataka',
      occupation: 'FARMER',
      annualIncome: 200000,
      education: 'DEGREE',
      landHoldingAcres: 2,
      familySize: 4,
      socialCategory: 'OBC',
      disabilityStatus: false,
      onboardingCompleted: true,
    });
  expect(profile.status).toBe(200);

  return { token, userId: response.body.user.id as string };
}

beforeEach(async () => {
  await resetDatabase();
  await seedEligibilityFixtures();
});

describe('scheme eligibility API', () => {
  it('requires authentication and hides unpublished schemes', async () => {
    const anonymous = await request(app).get('/api/schemes/match-all/eligibility');
    expect(anonymous.status).toBe(401);

    const citizen = await registerCitizenWithProfile();
    const pending = await request(app)
      .get('/api/schemes/pending-eligibility/eligibility')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(pending.status).toBe(404);
  });

  it('returns a likely eligible assessment with rule explanations', async () => {
    const citizen = await registerCitizenWithProfile();
    const response = await request(app)
      .get('/api/schemes/match-all/eligibility?language=kn')
      .set('Authorization', `Bearer ${citizen.token}`);

    expect(response.status).toBe(200);
    expect(response.body.eligibility.assessment).toBe('LIKELY_ELIGIBLE');
    expect(response.body.eligibility.likelyEligible).toBe(true);
    expect(response.body.eligibility.rules).toHaveLength(4);
    expect(response.body.eligibility.rules[0].descriptionLanguage).toBe('kn');
    expect(response.body.eligibility.disclaimer).toContain('ಅಧಿಕೃತ ಇಲಾಖೆ');
    expect(response.body.scheme.slug).toBe('match-all');
    expect(response.body.profile).toMatchObject({ hasProfile: true, onboardingCompleted: true });
  });

  it('explains a failing income rule with expected and actual values', async () => {
    const citizen = await registerCitizenWithProfile();
    const response = await request(app)
      .get('/api/schemes/fail-income/eligibility?language=en')
      .set('Authorization', `Bearer ${citizen.token}`);

    expect(response.status).toBe(200);
    expect(response.body.eligibility.assessment).toBe('NOT_ELIGIBLE');
    expect(response.body.eligibility.label).toBe('Not eligible based on this information');
    expect(response.body.eligibility.rules[0]).toMatchObject({
      field: 'annualIncome',
      status: 'NOT_MET',
      expected: 100000,
      actual: 200000,
    });
  });

  it('requests missing profile data and names the field', async () => {
    const citizen = await registerCitizenWithProfile();
    const response = await request(app)
      .get('/api/schemes/needs-district/eligibility')
      .set('Authorization', `Bearer ${citizen.token}`);

    expect(response.status).toBe(200);
    expect(response.body.eligibility.assessment).toBe('NEEDS_INFORMATION');
    expect(response.body.eligibility.missingProfileFields).toEqual(['district']);

    const updated = await request(app)
      .patch('/api/citizens/me/profile')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ district: 'Mysuru' });
    expect(updated.status).toBe(200);

    const recheck = await request(app)
      .get('/api/schemes/needs-district/eligibility')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(recheck.body.eligibility.assessment).toBe('LIKELY_ELIGIBLE');
    expect(recheck.body.eligibility.missingProfileFields).toEqual([]);
  });

  it('does not fabricate an assessment when rules are absent', async () => {
    const citizen = await registerCitizenWithProfile();
    const response = await request(app)
      .get('/api/schemes/no-rules/eligibility')
      .set('Authorization', `Bearer ${citizen.token}`);

    expect(response.status).toBe(200);
    expect(response.body.eligibility.assessment).toBe('NOT_ASSESSABLE');
    expect(response.body.eligibility.rules).toEqual([]);
    expect(response.body.eligibility.likelyEligible).toBe(false);
  });
});

describe('eligible scheme matching API', () => {
  it('returns only likely eligible schemes by default', async () => {
    const citizen = await registerCitizenWithProfile();
    const response = await request(app)
      .get('/api/citizens/me/eligible-schemes?language=en')
      .set('Authorization', `Bearer ${citizen.token}`);

    expect(response.status).toBe(200);
    expect(response.body.filter).toBe('LIKELY_ELIGIBLE');
    expect(response.body.schemes.map((scheme: { slug: string }) => scheme.slug)).toEqual([
      'match-all',
    ]);
    expect(response.body.pagination.total).toBe(1);
    expect(response.body.summary.countsByAssessment).toEqual({
      LIKELY_ELIGIBLE: 1,
      NEEDS_INFORMATION: 1,
      NOT_ELIGIBLE: 1,
      NOT_ASSESSABLE: 1,
    });
    expect(response.body.profile.missingFields).toEqual(['district']);
    expect(response.body.disclaimer).toContain('official department');
  });

  it('supports ALL and per-assessment filters with ranking', async () => {
    const citizen = await registerCitizenWithProfile();
    const all = await request(app)
      .get('/api/citizens/me/eligible-schemes?filter=ALL&language=en')
      .set('Authorization', `Bearer ${citizen.token}`);

    expect(all.status).toBe(200);
    expect(all.body.schemes.map((scheme: { slug: string }) => scheme.slug)).toEqual([
      'match-all',
      'needs-district',
      'no-rules',
      'fail-income',
    ]);
    expect(all.body.schemes[1].eligibility.missingProfileFields).toEqual(['district']);
    expect(all.body.schemes[3].eligibility.assessment).toBe('NOT_ELIGIBLE');

    const needsInfo = await request(app)
      .get('/api/citizens/me/eligible-schemes?filter=NEEDS_INFORMATION')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(needsInfo.body.schemes.map((scheme: { slug: string }) => scheme.slug)).toEqual([
      'needs-district',
    ]);
  });

  it('reports missing profile data when the citizen has no profile', async () => {
    const response = await request(app).post('/api/auth/register').send({
      fullName: 'No Profile Citizen',
      email: 'noprofile@example.com',
      phone: '+91 90000 33333',
      password: 'Citizen1234',
    });
    expect(response.status).toBe(201);

    const matches = await request(app)
      .get('/api/citizens/me/eligible-schemes')
      .set('Authorization', `Bearer ${response.body.token}`);

    expect(matches.status).toBe(200);
    expect(matches.body.profile.hasProfile).toBe(true);
    expect(matches.body.profile.onboardingCompleted).toBe(false);
    expect(matches.body.profile.missingFields).toEqual(
      expect.arrayContaining(['gender', 'age', 'annualIncome', 'district']),
    );
    expect(matches.body.summary.countsByAssessment.LIKELY_ELIGIBLE).toBe(0);
    expect(matches.body.summary.countsByAssessment.NEEDS_INFORMATION).toBe(3);
    expect(matches.body.summary.countsByAssessment.NOT_ASSESSABLE).toBe(1);
    expect(matches.body.schemes).toEqual([]);
  });

  it('paginates matching results and exposes assessment metadata', async () => {
    const citizen = await registerCitizenWithProfile();
    const first = await request(app)
      .get('/api/citizens/me/eligible-schemes?filter=ALL&page=1&pageSize=2')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(first.body.schemes).toHaveLength(2);
    expect(first.body.pagination).toMatchObject({ page: 1, pageSize: 2, total: 4, totalPages: 2 });

    const second = await request(app)
      .get('/api/citizens/me/eligible-schemes?filter=ALL&page=2&pageSize=2')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(second.body.schemes).toHaveLength(2);

    const meta = await request(app).get('/api/meta');
    expect(meta.body.eligibilityFields).toContain('annualIncome');
    expect(meta.body.eligibilityOperators).toContain('IN');
    expect(meta.body.eligibilityAssessments).toContain('NEEDS_INFORMATION');
  });
});
