import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError } from '../lib/errors.js';
import { parseJsonArray } from '../lib/publicUser.js';
import { recordAudit } from '../lib/audit.js';
import { parseLanguage } from '../lib/language.js';
import { evaluateEligibility, eligibilityDisclaimer } from '../lib/eligibility.js';
import { schemeListInclude, shapeSchemeSummary } from '../lib/schemeContent.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;
const SOCIAL_CATEGORIES = ['GENERAL', 'OBC', 'SC', 'ST', 'EWS', 'MINORITY'] as const;

const profileSchema = z.object({
  dateOfBirth: z.coerce
    .date()
    .max(new Date(), 'Date of birth cannot be in the future.')
    .nullable()
    .optional(),
  gender: z.enum(GENDERS).nullable().optional(),
  state: z.string().trim().max(80).nullable().optional(),
  district: z.string().trim().max(80).nullable().optional(),
  taluk: z.string().trim().max(80).nullable().optional(),
  village: z.string().trim().max(120).nullable().optional(),
  gramPanchayat: z.string().trim().max(120).nullable().optional(),
  occupation: z.string().trim().max(80).nullable().optional(),
  annualIncome: z.number().int().min(0).max(100_000_000).nullable().optional(),
  education: z.string().trim().max(80).nullable().optional(),
  landHoldingAcres: z.number().min(0).max(10_000).nullable().optional(),
  familySize: z.number().int().min(1).max(50).nullable().optional(),
  disabilityStatus: z.boolean().nullable().optional(),
  socialCategory: z.enum(SOCIAL_CATEGORIES).nullable().optional(),
  aadhaarLast4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Enter only the last 4 digits of Aadhaar.')
    .nullable()
    .optional(),
  profileJson: z.record(z.unknown()).nullable().optional(),
  onboardingCompleted: z.boolean().optional(),
});

const notificationPreferenceSchema = z.object({
  inApp: z.boolean().optional(),
  webPush: z.boolean().optional(),
  sms: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
  email: z.boolean().optional(),
  categories: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  districts: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  quietHoursStart: z.number().int().min(0).max(23).nullable().optional(),
  quietHoursEnd: z.number().int().min(0).max(23).nullable().optional(),
});

const consentsSchema = z.object({
  consents: z
    .array(
      z.object({
        consentType: z.enum(['DATA_PROCESSING', 'NOTIFICATIONS_SMS', 'NOTIFICATIONS_WHATSAPP', 'ANALYTICS']),
        granted: z.boolean(),
        version: z.string().trim().max(20).default('1.0'),
      }),
    )
    .min(1)
    .max(10),
});

function shapePreferences(preference: {
  inApp: boolean;
  webPush: boolean;
  sms: boolean;
  whatsapp: boolean;
  email: boolean;
  categoriesJson: string | null;
  districtsJson: string | null;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  updatedAt: Date;
}) {
  return {
    inApp: preference.inApp,
    webPush: preference.webPush,
    sms: preference.sms,
    whatsapp: preference.whatsapp,
    email: preference.email,
    categories: parseJsonArray(preference.categoriesJson),
    districts: parseJsonArray(preference.districtsJson),
    quietHoursStart: preference.quietHoursStart,
    quietHoursEnd: preference.quietHoursEnd,
    updatedAt: preference.updatedAt,
  };
}

router.get(
  '/me/profile',
  asyncHandler(async (req, res) => {
    const profile = await prisma.citizenProfile.findUnique({ where: { userId: req.user!.id } });
    res.json({ profile });
  }),
);

router.patch(
  '/me/profile',
  asyncHandler(async (req, res) => {
    const parsed = profileSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Some profile fields are invalid.', {
        fields: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const { profileJson, ...rest } = parsed.data;
    const data = {
      ...rest,
      ...(profileJson !== undefined
        ? { profileJson: profileJson === null ? null : JSON.stringify(profileJson) }
        : {}),
    };

    const profile = await prisma.citizenProfile.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, state: 'Karnataka', ...data },
      update: data,
    });

    await recordAudit(
      {
        action: 'CITIZEN_PROFILE_UPDATED',
        entityType: 'CitizenProfile',
        entityId: profile.id,
        metadata: { fields: Object.keys(data) },
      },
      req,
    );

    res.json({ profile });
  }),
);

router.get(
  '/me/notification-preferences',
  asyncHandler(async (req, res) => {
    const preference = await prisma.notificationPreference.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id },
      update: {},
    });
    res.json({ preferences: shapePreferences(preference) });
  }),
);

router.patch(
  '/me/notification-preferences',
  asyncHandler(async (req, res) => {
    const parsed = notificationPreferenceSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Some notification settings are invalid.', {
        fields: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const { categories, districts, ...flags } = parsed.data;
    const data = {
      ...flags,
      ...(categories !== undefined ? { categoriesJson: JSON.stringify(categories) } : {}),
      ...(districts !== undefined ? { districtsJson: JSON.stringify(districts) } : {}),
    };

    const preference = await prisma.notificationPreference.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, ...data },
      update: data,
    });

    await recordAudit(
      {
        action: 'NOTIFICATION_PREFERENCES_UPDATED',
        entityType: 'NotificationPreference',
        entityId: preference.id,
      },
      req,
    );

    res.json({ preferences: shapePreferences(preference) });
  }),
);

router.get(
  '/me/consents',
  asyncHandler(async (req, res) => {
    const consents = await prisma.userConsent.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ consents });
  }),
);

router.put(
  '/me/consents',
  asyncHandler(async (req, res) => {
    const parsed = consentsSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Consent payload is invalid.', {
        fields: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const now = new Date();
    const results = await prisma.$transaction(
      parsed.data.consents.map((consent) =>
        prisma.userConsent.upsert({
          where: { userId_consentType: { userId: req.user!.id, consentType: consent.consentType } },
          create: {
            userId: req.user!.id,
            consentType: consent.consentType,
            granted: consent.granted,
            version: consent.version,
            grantedAt: consent.granted ? now : null,
            revokedAt: consent.granted ? null : now,
          },
          update: {
            granted: consent.granted,
            version: consent.version,
            grantedAt: consent.granted ? now : null,
            revokedAt: consent.granted ? null : now,
          },
        }),
      ),
    );

    await recordAudit(
      {
        action: 'CONSENTS_UPDATED',
        entityType: 'UserConsent',
        entityId: req.user!.id,
        metadata: { consents: parsed.data.consents.map((c) => c.consentType) },
      },
      req,
    );

    res.json({ consents: results });
  }),
);

const savedSchemeSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Provide a valid scheme slug.'),
});

const savedListQuerySchema = z.object({
  language: z.enum(['kn', 'en', 'hi']).default('kn'),
});

router.get(
  '/me/saved-schemes',
  validate(savedListQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof savedListQuerySchema>;
    const language = parseLanguage(query.language);

    const saved = await prisma.savedScheme.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { scheme: { include: schemeListInclude } },
    });

    res.json({
      savedSchemes: saved.map((entry) => ({
        savedAt: entry.createdAt,
        isPublished: entry.scheme.status === 'PUBLISHED',
        scheme: shapeSchemeSummary(entry.scheme, language),
      })),
    });
  }),
);

router.post(
  '/me/saved-schemes',
  validate(savedSchemeSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof savedSchemeSchema>;

    const scheme = await prisma.scheme.findUnique({
      where: { slug: body.slug },
      select: { id: true, slug: true, status: true },
    });
    if (!scheme) throw AppError.notFound('Scheme not found.');
    if (scheme.status !== 'PUBLISHED') {
      throw AppError.badRequest('Only published schemes can be saved.');
    }

    const existing = await prisma.savedScheme.findUnique({
      where: { userId_schemeId: { userId: req.user!.id, schemeId: scheme.id } },
    });
    if (existing) {
      res.json({ saved: true, alreadySaved: true, savedAt: existing.createdAt, schemeSlug: scheme.slug });
      return;
    }

    const record = await prisma.savedScheme.create({
      data: { userId: req.user!.id, schemeId: scheme.id },
    });

    await recordAudit(
      {
        action: 'SCHEME_SAVED',
        entityType: 'SavedScheme',
        entityId: record.id,
        metadata: { schemeId: scheme.id, slug: scheme.slug },
      },
      req,
    );

    res.status(201).json({ saved: true, alreadySaved: false, savedAt: record.createdAt, schemeSlug: scheme.slug });
  }),
);

router.delete(
  '/me/saved-schemes/:slug',
  asyncHandler(async (req, res) => {
    const scheme = await prisma.scheme.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, slug: true },
    });
    if (!scheme) throw AppError.notFound('Scheme not found.');

    const result = await prisma.savedScheme.deleteMany({
      where: { userId: req.user!.id, schemeId: scheme.id },
    });
    if (result.count === 0) throw AppError.notFound('This scheme is not in your saved list.');

    await recordAudit(
      {
        action: 'SCHEME_UNSAVED',
        entityType: 'SavedScheme',
        metadata: { schemeId: scheme.id, slug: scheme.slug },
      },
      req,
    );

    res.json({ saved: false, schemeSlug: scheme.slug });
  }),
);

const matchesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  filter: z
    .enum(['LIKELY_ELIGIBLE', 'NEEDS_INFORMATION', 'NOT_ELIGIBLE', 'NOT_ASSESSABLE', 'ALL'])
    .default('LIKELY_ELIGIBLE'),
  language: z.enum(['kn', 'en', 'hi']).default('kn'),
});

const ASSESSMENT_RANK: Record<string, number> = {
  LIKELY_ELIGIBLE: 0,
  NEEDS_INFORMATION: 1,
  NOT_ASSESSABLE: 2,
  NOT_ELIGIBLE: 3,
};

router.get(
  '/me/eligible-schemes',
  validate(matchesQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof matchesQuerySchema>;
    const language = parseLanguage(query.language);

    const [profile, schemes] = await Promise.all([
      prisma.citizenProfile.findUnique({ where: { userId: req.user!.id } }),
      prisma.scheme.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        include: {
          ...schemeListInclude,
          eligibilityRules: { orderBy: { sortOrder: 'asc' } },
        },
      }),
    ]);

    const evaluated = schemes.map((scheme) => ({
      scheme,
      eligibility: evaluateEligibility(scheme.eligibilityRules, profile, language),
    }));

    const countsByAssessment: Record<string, number> = {
      LIKELY_ELIGIBLE: 0,
      NEEDS_INFORMATION: 0,
      NOT_ELIGIBLE: 0,
      NOT_ASSESSABLE: 0,
    };
    for (const entry of evaluated) {
      countsByAssessment[entry.eligibility.assessment] += 1;
    }

    const missingFields = [
      ...new Set(evaluated.flatMap((entry) => entry.eligibility.missingProfileFields)),
    ];

    evaluated.sort((left, right) => {
      const rank =
        (ASSESSMENT_RANK[left.eligibility.assessment] ?? 99) -
        (ASSESSMENT_RANK[right.eligibility.assessment] ?? 99);
      if (rank !== 0) return rank;
      const leftTime = left.scheme.publishedAt?.getTime() ?? 0;
      const rightTime = right.scheme.publishedAt?.getTime() ?? 0;
      return rightTime - leftTime;
    });

    const filtered =
      query.filter === 'ALL'
        ? evaluated
        : evaluated.filter((entry) => entry.eligibility.assessment === query.filter);

    const start = (query.page - 1) * query.pageSize;
    const page = filtered.slice(start, start + query.pageSize);

    res.json({
      language,
      filter: query.filter,
      profile: {
        hasProfile: Boolean(profile),
        onboardingCompleted: profile?.onboardingCompleted ?? false,
        missingFields,
      },
      summary: {
        totalPublished: evaluated.length,
        countsByAssessment,
      },
      schemes: page.map((entry) => ({
        ...shapeSchemeSummary(entry.scheme, language),
        eligibility: {
          assessment: entry.eligibility.assessment,
          label: entry.eligibility.label,
          likelyEligible: entry.eligibility.likelyEligible,
          counts: entry.eligibility.counts,
          missingProfileFields: entry.eligibility.missingProfileFields,
        },
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / query.pageSize)),
      },
      disclaimer: eligibilityDisclaimer(language),
    });
  }),
);

export default router;
