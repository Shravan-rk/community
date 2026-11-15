import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError } from '../lib/errors.js';
import { recordAudit } from '../lib/audit.js';
import { parseLanguage, parseJsonObject, parseJsonValue } from '../lib/language.js';
import { LANGUAGES, SCHEME_STATUSES } from '../lib/roles.js';
import {
  buildSchemeSnapshot,
  schemeDetailInclude,
  schemeListInclude,
  shapeSchemeDetail,
  shapeSchemeSummary,
} from '../lib/schemeContent.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { slugify, uniqueSchemeSlug } from '../lib/slug.js';

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

const ruleSchema = z.object({
  field: z.string().trim().min(1).max(60),
  operator: z.enum(RULE_OPERATORS),
  value: z.unknown().refine((value) => value !== undefined, 'Provide a rule value.'),
  descriptionEn: optionalText(400),
  descriptionKn: optionalText(400),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

const schemeFieldShape = {
  titleEn: optionalText(200),
  titleKn: optionalText(200),
  titleHi: optionalText(200),
  summaryEn: optionalText(2000),
  summaryKn: optionalText(2000),
  summaryHi: optionalText(2000),
  descriptionEn: optionalText(8000),
  descriptionKn: optionalText(8000),
  department: optionalText(160),
  level: z.enum(['CENTRAL', 'STATE']).optional(),
  state: optionalText(80),
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
  categorySlug: optionalSlug(),
  sourceSlug: optionalSlug(),
};

const createSchema = z.object({
  ...schemeFieldShape,
  titleEn: z.string().trim().min(3).max(200),
  summaryEn: z.string().trim().min(10).max(2000),
  benefitsEn: z.string().trim().min(3).max(2000),
  department: z.string().trim().min(2).max(160),
  categorySlug: z
    .string()
    .trim()
    .max(120)
    .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and single hyphens.'),
  slug: optionalSlug(),
  status: z.enum(['DRAFT', 'PENDING_VERIFICATION']).optional(),
  rules: z.array(ruleSchema).max(30).optional(),
});

const patchSchema = z.object({
  ...schemeFieldShape,
  categorySlug: z
    .string()
    .trim()
    .max(120)
    .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and single hyphens.')
    .optional(),
  rules: z.array(ruleSchema).max(30).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(120).optional(),
  status: z.enum(SCHEME_STATUSES).optional(),
  category: z.string().trim().max(120).optional(),
  level: z.enum(['CENTRAL', 'STATE']).optional(),
  language: z.enum(LANGUAGES).default('kn'),
});

const verifySchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED', 'REQUEST_CHANGES']),
  notes: z.string().trim().max(2000).nullable().optional(),
  sourceEvidenceUrl: optionalUrl(600),
});

const translationParamSchema = z.object({
  id: z.string().trim().min(1),
  language: z.enum(LANGUAGES),
});

const translationSchema = z.object({
  fields: z.record(z.string().trim().min(1).max(60), z.string().max(5000)).refine(
    (fields) => Object.keys(fields).length > 0,
    'Provide at least one translated field.',
  ),
  provider: z.enum(['HUMAN', 'AI', 'MACHINE']).optional(),
  quality: z.enum(['DRAFT', 'REVIEWED', 'VERIFIED']).optional(),
});

const versionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const detailQuerySchema = z.object({ language: z.enum(LANGUAGES).default('kn') });

type RuleInput = z.infer<typeof ruleSchema>;

function rulesToRows(rules: RuleInput[]) {
  return rules.map((rule, index) => ({
    field: rule.field,
    operator: rule.operator,
    valueJson: JSON.stringify(rule.value ?? null),
    descriptionEn: rule.descriptionEn ?? null,
    descriptionKn: rule.descriptionKn ?? null,
    isRequired: rule.isRequired ?? true,
    sortOrder: rule.sortOrder ?? index,
  }));
}

function comparableRules(rules: RuleInput[]) {
  return rules.map((rule, index) => ({
    field: rule.field,
    operator: rule.operator,
    value: rule.value ?? null,
    descriptionEn: rule.descriptionEn ?? null,
    descriptionKn: rule.descriptionKn ?? null,
    isRequired: rule.isRequired ?? true,
    sortOrder: rule.sortOrder ?? index,
  }));
}

function comparableExistingRules(
  rules: Array<{
    field: string;
    operator: string;
    valueJson: string;
    descriptionEn: string | null;
    descriptionKn: string | null;
    isRequired: boolean;
    sortOrder: number;
  }>,
) {
  return rules.map((rule) => ({
    field: rule.field,
    operator: rule.operator,
    value: parseJsonValue(rule.valueJson),
    descriptionEn: rule.descriptionEn,
    descriptionKn: rule.descriptionKn,
    isRequired: rule.isRequired,
    sortOrder: rule.sortOrder,
  }));
}

async function resolveCategoryId(slug: string): Promise<string> {
  const category = await prisma.schemeCategory.findUnique({ where: { slug }, select: { id: true } });
  if (!category) throw AppError.badRequest('Unknown category slug.');
  return category.id;
}

async function resolveSourceId(slug: string): Promise<string> {
  const source = await prisma.schemeSource.findUnique({ where: { slug }, select: { id: true } });
  if (!source) throw AppError.badRequest('Unknown source slug.');
  return source.id;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) {
    if (!a || !b) return false;
    return new Date(a as Date).getTime() === new Date(b as Date).getTime();
  }
  return (a ?? null) === (b ?? null);
}

const adminDetailInclude = {
  ...schemeDetailInclude,
  translations: {
    include: {
      reviewedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { language: 'asc' as const },
  },
  versions: {
    orderBy: { version: 'desc' as const },
    take: 20,
    include: { createdBy: { select: { id: true, fullName: true } } },
  },
  verifications: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
    include: { verifier: { select: { id: true, fullName: true, role: true } } },
  },
  createdBy: { select: { id: true, fullName: true, email: true } },
  _count: { select: { savedBy: true, applications: true, notifications: true } },
} satisfies Prisma.SchemeInclude;

type AdminDetailRecord = Prisma.SchemeGetPayload<{ include: typeof adminDetailInclude }>;

function shapeAdminDetail(record: AdminDetailRecord, language: 'kn' | 'en' | 'hi') {
  return {
    ...shapeSchemeDetail(record as never, language),
    admin: {
      createdBy: record.createdBy,
      counts: record._count,
      versions: record.versions.map((version) => ({
        id: version.id,
        version: version.version,
        changeSummary: version.changeSummary,
        createdAt: version.createdAt,
        createdBy: version.createdBy,
      })),
      verifications: record.verifications,
      translationReviews: record.translations.map((translation) => ({
        language: translation.language,
        quality: translation.quality,
        provider: translation.provider,
        reviewedBy: translation.reviewedBy,
        reviewedAt: translation.reviewedAt,
      })),
    },
  };
}

async function loadAdminDetail(id: string, language: 'kn' | 'en' | 'hi') {
  const record = await prisma.scheme.findUnique({ where: { id }, include: adminDetailInclude });
  if (!record) throw AppError.notFound('Scheme not found.');
  return shapeAdminDetail(record, language);
}

router.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof listQuerySchema>;
    const language = parseLanguage(query.language);

    const where: Prisma.SchemeWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(query.q
        ? {
            OR: [
              { titleEn: { contains: query.q } },
              { titleKn: { contains: query.q } },
              { titleHi: { contains: query.q } },
              { slug: { contains: query.q } },
              { department: { contains: query.q } },
            ],
          }
        : {}),
    };

    const [total, schemes, statusCounts] = await Promise.all([
      prisma.scheme.count({ where }),
      prisma.scheme.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: schemeListInclude,
      }),
      prisma.scheme.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    res.json({
      schemes: schemes.map((scheme) => shapeSchemeSummary(scheme, language)),
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

router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    const categoryId = await resolveCategoryId(body.categorySlug);
    const sourceId = body.sourceSlug ? await resolveSourceId(body.sourceSlug) : null;
    const slug = body.slug ?? (await uniqueSchemeSlug(slugify(body.titleEn)));
    if (body.slug) {
      const existing = await prisma.scheme.findUnique({ where: { slug: body.slug }, select: { id: true } });
      if (existing) throw AppError.conflict('A scheme with this slug already exists.');
    }

    const rules = rulesToRows(body.rules ?? []);
    const documentJson =
      body.requiredDocuments && body.requiredDocuments.length > 0
        ? JSON.stringify(body.requiredDocuments)
        : null;
    const status = body.status ?? 'PENDING_VERIFICATION';

    const created = await prisma.$transaction(async (tx) => {
      const scheme = await tx.scheme.create({
        data: {
          slug,
          titleEn: body.titleEn,
          titleKn: body.titleKn ?? null,
          titleHi: body.titleHi ?? null,
          summaryEn: body.summaryEn,
          summaryKn: body.summaryKn ?? null,
          summaryHi: body.summaryHi ?? null,
          descriptionEn: body.descriptionEn ?? null,
          descriptionKn: body.descriptionKn ?? null,
          department: body.department,
          level: body.level ?? 'STATE',
          state: body.state ?? 'Karnataka',
          categoryId,
          benefitsEn: body.benefitsEn,
          benefitsKn: body.benefitsKn ?? null,
          eligibilityEn: body.eligibilityEn ?? null,
          eligibilityKn: body.eligibilityKn ?? null,
          requiredDocumentsJson: documentJson,
          applicationProcessEn: body.applicationProcessEn ?? null,
          applicationProcessKn: body.applicationProcessKn ?? null,
          applicationUrl: body.applicationUrl ?? null,
          officialUrl: body.officialUrl ?? null,
          notificationNumber: body.notificationNumber ?? null,
          applicationDeadline: body.applicationDeadline ?? null,
          startDate: body.startDate ?? null,
          endDate: body.endDate ?? null,
          sourceId,
          status,
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
          changeSummary: 'Initial version created',
          createdById: req.user!.id,
        },
      });

      return scheme;
    });

    await recordAudit(
      {
        action: 'SCHEME_CREATED',
        entityType: 'Scheme',
        entityId: created.id,
        metadata: { slug: created.slug, status: created.status },
      },
      req,
    );

    const language = parseLanguage(req.query.language);
    res.status(201).json({ scheme: await loadAdminDetail(created.id, language) });
  }),
);

router.get(
  '/:id/versions',
  validate(versionsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof versionsQuerySchema>;
    const scheme = await prisma.scheme.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!scheme) throw AppError.notFound('Scheme not found.');

    const [total, versions] = await Promise.all([
      prisma.schemeVersion.count({ where: { schemeId: scheme.id } }),
      prisma.schemeVersion.findMany({
        where: { schemeId: scheme.id },
        orderBy: { version: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { createdBy: { select: { id: true, fullName: true } } },
      }),
    ]);

    res.json({
      versions: versions.map((version) => ({
        ...version,
        snapshot: parseJsonValue(version.snapshotJson),
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    });
  }),
);

router.get(
  '/:id/versions/:version',
  asyncHandler(async (req, res) => {
    const versionNumber = Number(req.params.version);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      throw AppError.badRequest('Version must be a positive integer.');
    }

    const version = await prisma.schemeVersion.findUnique({
      where: { schemeId_version: { schemeId: req.params.id, version: versionNumber } },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });
    if (!version) throw AppError.notFound('Scheme version not found.');

    res.json({ version: { ...version, snapshot: parseJsonValue(version.snapshotJson) } });
  }),
);

router.put(
  '/:id/translations/:language',
  validate(translationParamSchema, 'params'),
  validate(translationSchema),
  asyncHandler(async (req, res) => {
    const language = (req.params as unknown as z.infer<typeof translationParamSchema>).language;
    const body = req.body as z.infer<typeof translationSchema>;

    const scheme = await prisma.scheme.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!scheme) throw AppError.notFound('Scheme not found.');

    const existing = await prisma.schemeTranslation.findUnique({
      where: { schemeId_language: { schemeId: scheme.id, language } },
    });
    const mergedFields = { ...(existing ? parseJsonObject(existing.fieldsJson) : {}), ...body.fields };
    const quality = body.quality ?? existing?.quality ?? 'DRAFT';
    const reviewFields =
      quality === 'DRAFT'
        ? { reviewedById: null, reviewedAt: null }
        : { reviewedById: req.user!.id, reviewedAt: new Date() };

    const translation = await prisma.schemeTranslation.upsert({
      where: { schemeId_language: { schemeId: scheme.id, language } },
      create: {
        schemeId: scheme.id,
        language,
        fieldsJson: JSON.stringify(mergedFields),
        provider: body.provider ?? 'HUMAN',
        quality,
        ...reviewFields,
      },
      update: {
        fieldsJson: JSON.stringify(mergedFields),
        provider: body.provider ?? existing?.provider ?? 'HUMAN',
        quality,
        ...reviewFields,
      },
    });

    await recordAudit(
      {
        action: 'SCHEME_TRANSLATION_UPDATED',
        entityType: 'SchemeTranslation',
        entityId: translation.id,
        metadata: { schemeId: scheme.id, language, quality, fields: Object.keys(body.fields) },
      },
      req,
    );

    res.json({
      translation: {
        ...translation,
        fields: parseJsonObject(translation.fieldsJson),
      },
    });
  }),
);

router.get(
  '/:id',
  validate(detailQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof detailQuerySchema>;
    res.json({ scheme: await loadAdminDetail(req.params.id, parseLanguage(query.language)) });
  }),
);

router.patch(
  '/:id',
  validate(patchSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof patchSchema>;
    const current = await prisma.scheme.findUnique({
      where: { id: req.params.id },
      include: { eligibilityRules: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!current) throw AppError.notFound('Scheme not found.');

    const data: Record<string, unknown> = {};
    const changed: string[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) continue;
      if (key === 'rules' || key === 'categorySlug' || key === 'sourceSlug' || key === 'requiredDocuments') {
        continue;
      }
      const currentValue = (current as Record<string, unknown>)[key];
      if (valuesEqual(value, currentValue)) continue;
      data[key] = value;
      changed.push(key);
    }

    if (body.categorySlug !== undefined) {
      const categoryId = await resolveCategoryId(body.categorySlug);
      if (categoryId !== current.categoryId) {
        data.categoryId = categoryId;
        changed.push('category');
      }
    }

    if (body.sourceSlug !== undefined) {
      const sourceId = body.sourceSlug === null ? null : await resolveSourceId(body.sourceSlug);
      if (sourceId !== current.sourceId) {
        data.sourceId = sourceId;
        changed.push('source');
      }
    }

    let nextRules: ReturnType<typeof rulesToRows> | undefined;
    if (body.requiredDocuments !== undefined) {
      const documentJson =
        body.requiredDocuments.length > 0 ? JSON.stringify(body.requiredDocuments) : null;
      if (documentJson !== current.requiredDocumentsJson) {
        data.requiredDocumentsJson = documentJson;
        changed.push('requiredDocuments');
      }
    }

    if (body.rules !== undefined) {
      const incoming = comparableRules(body.rules);
      const existing = comparableExistingRules(current.eligibilityRules);
      if (JSON.stringify(incoming) !== JSON.stringify(existing)) {
        nextRules = rulesToRows(body.rules);
        changed.push('rules');
      }
    }

    if (changed.length === 0) {
      const language = parseLanguage(req.query.language);
      res.json({ scheme: await loadAdminDetail(current.id, language), changed: [] });
      return;
    }

    const nextVersion = current.version + 1;
    data.version = nextVersion;
    if (current.status === 'PUBLISHED' || current.status === 'VERIFIED') {
      data.status = 'PENDING_VERIFICATION';
      data.publishedAt = null;
    }

    const changeSummary = changed.join(', ');

    const updatedId = await prisma.$transaction(async (tx) => {
      const updated = await tx.scheme.update({
        where: { id: current.id },
        data: data as Prisma.SchemeUncheckedUpdateInput,
      });

      if (nextRules !== undefined) {
        await tx.eligibilityRule.deleteMany({ where: { schemeId: current.id } });
        if (nextRules.length > 0) {
          await tx.eligibilityRule.createMany({
            data: nextRules.map((rule) => ({ ...rule, schemeId: current.id })),
          });
        }
      }

      const snapshotRules =
        nextRules ??
        current.eligibilityRules.map((rule) => ({
          field: rule.field,
          operator: rule.operator,
          valueJson: rule.valueJson,
          descriptionEn: rule.descriptionEn,
          descriptionKn: rule.descriptionKn,
          isRequired: rule.isRequired,
          sortOrder: rule.sortOrder,
        }));

      await tx.schemeVersion.create({
        data: {
          schemeId: current.id,
          version: nextVersion,
          snapshotJson: buildSchemeSnapshot(updated, snapshotRules),
          changeSummary,
          createdById: req.user!.id,
        },
      });

      return updated.id;
    });

    await recordAudit(
      {
        action: 'SCHEME_UPDATED',
        entityType: 'Scheme',
        entityId: updatedId,
        metadata: { changed, version: nextVersion },
      },
      req,
    );

    const language = parseLanguage(req.query.language);
    res.json({ scheme: await loadAdminDetail(updatedId, language), changed });
  }),
);

router.post(
  '/:id/verify',
  validate(verifySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof verifySchema>;
    const scheme = await prisma.scheme.findUnique({
      where: { id: req.params.id },
      select: { id: true, slug: true, status: true },
    });
    if (!scheme) throw AppError.notFound('Scheme not found.');
    if (scheme.status !== 'PENDING_VERIFICATION') {
      throw AppError.conflict('Only schemes pending verification can be reviewed.');
    }

    const nextStatus =
      body.action === 'APPROVED' ? 'VERIFIED' : body.action === 'REJECTED' ? 'REJECTED' : 'PENDING_VERIFICATION';

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.scheme.update({
        where: { id: scheme.id },
        data: {
          status: nextStatus,
          lastVerifiedAt: body.action === 'APPROVED' ? now : undefined,
          publishedAt: body.action === 'APPROVED' ? undefined : null,
        },
      });
      const record = await tx.verificationRecord.create({
        data: {
          schemeId: scheme.id,
          verifierId: req.user!.id,
          action: body.action,
          notes: body.notes ?? null,
          sourceEvidenceUrl: body.sourceEvidenceUrl ?? null,
        },
      });
      return { updated, record };
    });

    await recordAudit(
      {
        action:
          body.action === 'APPROVED'
            ? 'SCHEME_APPROVED'
            : body.action === 'REJECTED'
              ? 'SCHEME_REJECTED'
              : 'SCHEME_CHANGES_REQUESTED',
        entityType: 'Scheme',
        entityId: scheme.id,
        metadata: { action: body.action, status: nextStatus, verificationId: result.record.id },
      },
      req,
    );

    const language = parseLanguage(req.query.language);
    res.json({
      scheme: await loadAdminDetail(scheme.id, language),
      verification: result.record,
    });
  }),
);

router.post(
  '/:id/publish',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const scheme = await prisma.scheme.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, publishedAt: true },
    });
    if (!scheme) throw AppError.notFound('Scheme not found.');
    if (scheme.status !== 'VERIFIED') {
      throw AppError.conflict('Only verified schemes can be published.');
    }

    const publishedAt = scheme.publishedAt ?? new Date();
    await prisma.scheme.update({
      where: { id: scheme.id },
      data: { status: 'PUBLISHED', publishedAt },
    });

    await recordAudit(
      {
        action: 'SCHEME_PUBLISHED',
        entityType: 'Scheme',
        entityId: scheme.id,
        metadata: { publishedAt },
      },
      req,
    );

    const language = parseLanguage(req.query.language);
    res.json({ scheme: await loadAdminDetail(scheme.id, language) });
  }),
);

router.post(
  '/:id/expire',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const scheme = await prisma.scheme.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true },
    });
    if (!scheme) throw AppError.notFound('Scheme not found.');
    if (scheme.status !== 'PUBLISHED') {
      throw AppError.conflict('Only published schemes can be expired.');
    }

    await prisma.scheme.update({ where: { id: scheme.id }, data: { status: 'EXPIRED' } });

    await recordAudit(
      { action: 'SCHEME_EXPIRED', entityType: 'Scheme', entityId: scheme.id },
      req,
    );

    const language = parseLanguage(req.query.language);
    res.json({ scheme: await loadAdminDetail(scheme.id, language) });
  }),
);

export default router;
