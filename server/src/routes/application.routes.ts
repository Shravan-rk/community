import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError } from '../lib/errors.js';
import { recordAudit } from '../lib/audit.js';
import { parseLanguage } from '../lib/language.js';
import { schemeListInclude, shapeSchemeSummary } from '../lib/schemeContent.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

export const APPLICATION_STATUSES = [
  'DRAFT',
  'ASSISTED',
  'SUBMITTED_OFFLINE',
  'TRACKING',
  'COMPLETED',
  'REJECTED',
] as const;

const CITIZEN_STATUSES = ['DRAFT', 'SUBMITTED_OFFLINE', 'TRACKING', 'COMPLETED'] as const;

const createSchema = z.object({
  schemeSlug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Provide a valid scheme slug.'),
  status: z.enum(CITIZEN_STATUSES).optional(),
  referenceNumber: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const updateSchema = z.object({
  status: z.enum(CITIZEN_STATUSES).optional(),
  referenceNumber: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const listQuerySchema = z.object({
  language: z.enum(['kn', 'en', 'hi']).default('kn'),
});

function shapeApplication(
  record: {
    id: string;
    status: string;
    referenceNumber: string | null;
    notes: string | null;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  scheme: Parameters<typeof shapeSchemeSummary>[0],
  language: 'kn' | 'en' | 'hi',
) {
  return {
    id: record.id,
    status: record.status,
    referenceNumber: record.referenceNumber,
    notes: record.notes,
    submittedAt: record.submittedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    scheme: shapeSchemeSummary(scheme, language),
  };
}

router.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof listQuerySchema>;
    const language = parseLanguage(query.language);

    const applications = await prisma.applicationRecord.findMany({
      where: { userId: req.user!.id },
      orderBy: { updatedAt: 'desc' },
      include: { scheme: { include: schemeListInclude } },
    });

    res.json({
      applications: applications.map((application) =>
        shapeApplication(application, application.scheme, language),
      ),
    });
  }),
);

router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    const scheme = await prisma.scheme.findUnique({
      where: { slug: body.schemeSlug },
      include: schemeListInclude,
    });
    if (!scheme) throw AppError.notFound('Scheme not found.');
    if (scheme.status !== 'PUBLISHED') {
      throw AppError.badRequest('Applications can only be tracked for published schemes.');
    }

    const existing = await prisma.applicationRecord.findFirst({
      where: { userId: req.user!.id, schemeId: scheme.id },
      select: { id: true },
    });
    if (existing) {
      throw AppError.conflict('You are already tracking an application for this scheme.');
    }

    const status = body.status ?? 'DRAFT';
    const application = await prisma.applicationRecord.create({
      data: {
        userId: req.user!.id,
        schemeId: scheme.id,
        status,
        referenceNumber: body.referenceNumber ?? null,
        notes: body.notes ?? null,
        submittedAt: status === 'DRAFT' ? null : new Date(),
      },
      include: { scheme: { include: schemeListInclude } },
    });

    await recordAudit(
      {
        action: 'APPLICATION_CREATED',
        entityType: 'ApplicationRecord',
        entityId: application.id,
        metadata: { schemeId: scheme.id, slug: scheme.slug, status },
      },
      req,
    );

    res.status(201).json({
      application: shapeApplication(application, application.scheme, parseLanguage(req.query.language)),
    });
  }),
);

router.patch(
  '/:id',
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof updateSchema>;
    const current = await prisma.applicationRecord.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { scheme: { include: schemeListInclude } },
    });
    if (!current) throw AppError.notFound('Application record not found.');

    const application = await prisma.applicationRecord.update({
      where: { id: current.id },
      data: {
        ...(body.status !== undefined
          ? {
              status: body.status,
              submittedAt:
                body.status === 'DRAFT' ? null : current.submittedAt ?? new Date(),
            }
          : {}),
        ...(body.referenceNumber !== undefined ? { referenceNumber: body.referenceNumber } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      include: { scheme: { include: schemeListInclude } },
    });

    await recordAudit(
      {
        action: 'APPLICATION_UPDATED',
        entityType: 'ApplicationRecord',
        entityId: application.id,
        metadata: {
          schemeId: current.schemeId,
          status: application.status,
          fields: Object.keys(body),
        },
      },
      req,
    );

    res.json({
      application: shapeApplication(application, application.scheme, parseLanguage(req.query.language)),
    });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const current = await prisma.applicationRecord.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      select: { id: true, status: true, schemeId: true },
    });
    if (!current) throw AppError.notFound('Application record not found.');
    if (current.status !== 'DRAFT') {
      throw AppError.conflict('Only draft application records can be deleted.');
    }

    await prisma.applicationRecord.delete({ where: { id: current.id } });

    await recordAudit(
      {
        action: 'APPLICATION_DELETED',
        entityType: 'ApplicationRecord',
        entityId: current.id,
        metadata: { schemeId: current.schemeId },
      },
      req,
    );

    res.json({ deleted: true });
  }),
);

export default router;
