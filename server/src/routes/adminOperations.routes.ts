import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError } from '../lib/errors.js';
import { recordAudit } from '../lib/audit.js';
import {
  createInAppNotification,
  localizedApplicationUpdate,
  localizedAssistanceUpdate,
} from '../lib/notifications.js';
import { schemeListInclude, shapeSchemeSummary } from '../lib/schemeContent.js';
import { parseLanguage } from '../lib/language.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

const VERIFIER_ROLES = ['SCHEME_VERIFIER', 'ADMIN', 'SUPER_ADMIN'] as const;
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

const APPLICATION_STATUSES = [
  'DRAFT',
  'ASSISTED',
  'SUBMITTED_OFFLINE',
  'TRACKING',
  'COMPLETED',
  'REJECTED',
] as const;

const REQUEST_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
const CENTRE_TYPES = ['CSC', 'GRAMA_PANCHAYAT', 'GOVERNMENT_OFFICE', 'NGO'] as const;

const pagedSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  status: z.string().trim().max(40).optional(),
  q: z.string().trim().max(120).optional(),
  language: z.enum(['kn', 'en', 'hi']).default('kn'),
});

router.get(
  '/applications',
  requireRole(...VERIFIER_ROLES),
  validate(pagedSchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof pagedSchema>;
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { referenceNumber: { contains: query.q } },
              { user: { fullName: { contains: query.q } } },
              { user: { email: { contains: query.q } } },
              { scheme: { titleEn: { contains: query.q } } },
              { scheme: { titleKn: { contains: query.q } } },
            ],
          }
        : {}),
    };

    const [total, applications] = await Promise.all([
      prisma.applicationRecord.count({ where }),
      prisma.applicationRecord.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true, preferredLanguage: true } },
          scheme: { include: schemeListInclude },
        },
      }),
    ]);

    const language = parseLanguage(query.language);
    res.json({
      applications: applications.map((application) => ({
        id: application.id,
        status: application.status,
        referenceNumber: application.referenceNumber,
        notes: application.notes,
        submittedAt: application.submittedAt,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        user: application.user,
        scheme: shapeSchemeSummary(application.scheme, language),
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

const applicationUpdateSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  referenceNumber: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

router.patch(
  '/applications/:id',
  requireRole(...VERIFIER_ROLES),
  validate(applicationUpdateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof applicationUpdateSchema>;
    const current = await prisma.applicationRecord.findUnique({
      where: { id: req.params.id },
      include: { scheme: { include: schemeListInclude }, user: { select: { preferredLanguage: true } } },
    });
    if (!current) throw AppError.notFound('Application record not found.');

    const application = await prisma.applicationRecord.update({
      where: { id: current.id },
      data: {
        ...(body.status !== undefined
          ? {
              status: body.status,
              submittedAt: body.status === 'DRAFT' ? null : current.submittedAt ?? new Date(),
            }
          : {}),
        ...(body.referenceNumber !== undefined ? { referenceNumber: body.referenceNumber } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });

    if (body.status && body.status !== current.status) {
      const copy = localizedApplicationUpdate(
        current.user.preferredLanguage,
        current.scheme.titleEn,
        current.scheme.titleKn,
        body.status,
      );
      await createInAppNotification({
        userId: current.userId,
        schemeId: current.schemeId,
        type: 'APPLICATION',
        language: copy.language,
        title: copy.title,
        body: copy.body,
        dedupeKey: `application-status:${application.id}:${body.status}`,
        metadata: { applicationId: application.id, status: body.status },
      });
    }

    await recordAudit(
      {
        action: 'ADMIN_APPLICATION_UPDATED',
        entityType: 'ApplicationRecord',
        entityId: application.id,
        metadata: { status: application.status, fields: Object.keys(body) },
      },
      req,
    );

    res.json({ application });
  }),
);

router.get(
  '/assistance-requests',
  requireRole(...VERIFIER_ROLES),
  validate(pagedSchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof pagedSchema>;
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { subject: { contains: query.q } },
              { description: { contains: query.q } },
              { user: { fullName: { contains: query.q } } },
              { contactPhone: { contains: query.q } },
            ],
          }
        : {}),
    };

    const [total, requests] = await Promise.all([
      prisma.assistanceRequest.count({ where }),
      prisma.assistanceRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true, preferredLanguage: true } },
          centre: { select: { id: true, name: true, district: true, phone: true } },
          assignedTo: { select: { id: true, fullName: true, role: true } },
        },
      }),
    ]);

    res.json({
      requests,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    });
  }),
);

const requestUpdateSchema = z.object({
  status: z.enum(REQUEST_STATUSES).optional(),
  assignedToId: z.string().trim().min(1).max(60).nullable().optional(),
});

router.patch(
  '/assistance-requests/:id',
  requireRole(...VERIFIER_ROLES),
  validate(requestUpdateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof requestUpdateSchema>;
    const current = await prisma.assistanceRequest.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { preferredLanguage: true } } },
    });
    if (!current) throw AppError.notFound('Assistance request not found.');

    let assignedToId = current.assignedToId;
    if (body.assignedToId !== undefined) {
      if (body.assignedToId === null) {
        assignedToId = null;
      } else {
        const assignee = await prisma.user.findFirst({
          where: {
            id: body.assignedToId,
            isActive: true,
            role: { in: ['VILLAGE_FACILITATOR', 'SCHEME_VERIFIER', 'ADMIN', 'SUPER_ADMIN'] },
          },
          select: { id: true },
        });
        if (!assignee) throw AppError.badRequest('Assignee must be an active staff account.');
        assignedToId = assignee.id;
      }
    }

    const request = await prisma.assistanceRequest.update({
      where: { id: current.id },
      data: {
        ...(body.status !== undefined ? { status: body.status } : {}),
        assignedToId,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        centre: { select: { id: true, name: true, district: true } },
        assignedTo: { select: { id: true, fullName: true, role: true } },
      },
    });

    if (body.status && body.status !== current.status && current.userId) {
      const copy = localizedAssistanceUpdate(current.user?.preferredLanguage, body.status);
      await createInAppNotification({
        userId: current.userId,
        type: 'SYSTEM',
        language: copy.language,
        title: copy.title,
        body: copy.body,
        dedupeKey: `assistance-status:${request.id}:${body.status}`,
        metadata: { requestId: request.id, status: body.status },
      });
    }

    await recordAudit(
      {
        action: 'ADMIN_ASSISTANCE_REQUEST_UPDATED',
        entityType: 'AssistanceRequest',
        entityId: request.id,
        metadata: { status: request.status, assignedToId },
      },
      req,
    );

    res.json({ request });
  }),
);

router.get(
  '/feedback',
  requireRole(...VERIFIER_ROLES),
  validate(pagedSchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof pagedSchema>;
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { message: { contains: query.q } },
              { user: { fullName: { contains: query.q } } },
              { scheme: { titleEn: { contains: query.q } } },
            ],
          }
        : {}),
    };

    const [total, feedback] = await Promise.all([
      prisma.feedback.count({ where }),
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          scheme: { select: { id: true, slug: true, titleEn: true, titleKn: true } },
        },
      }),
    ]);

    res.json({
      feedback,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    });
  }),
);

router.patch(
  '/feedback/:id',
  requireRole(...VERIFIER_ROLES),
  validate(z.object({ status: z.enum(['NEW', 'REVIEWED', 'RESOLVED']) })),
  asyncHandler(async (req, res) => {
    const feedback = await prisma.feedback.update({
      where: { id: req.params.id },
      data: { status: (req.body as { status: string }).status },
    });
    await recordAudit(
      {
        action: 'ADMIN_FEEDBACK_UPDATED',
        entityType: 'Feedback',
        entityId: feedback.id,
        metadata: { status: feedback.status },
      },
      req,
    );
    res.json({ feedback });
  }),
);

const centreSchema = z.object({
  name: z.string().trim().min(2).max(160),
  type: z.enum(CENTRE_TYPES),
  address: z.string().trim().min(3).max(400),
  district: z.string().trim().min(2).max(80),
  taluk: z.string().trim().max(80).nullable().optional(),
  village: z.string().trim().max(80).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  email: z.string().trim().email().max(160).nullable().optional(),
  openingHours: z.string().trim().max(160).nullable().optional(),
  isActive: z.boolean().optional(),
});

router.get(
  '/centres',
  requireRole(...VERIFIER_ROLES),
  validate(pagedSchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof pagedSchema>;
    const where = query.q
      ? {
          OR: [
            { name: { contains: query.q } },
            { district: { contains: query.q } },
            { address: { contains: query.q } },
          ],
        }
      : {};
    const centres = await prisma.assistanceCentre.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    res.json({ centres });
  }),
);

router.post(
  '/centres',
  requireRole(...ADMIN_ROLES),
  validate(centreSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof centreSchema>;
    const centre = await prisma.assistanceCentre.create({
      data: {
        ...body,
        taluk: body.taluk ?? null,
        village: body.village ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        openingHours: body.openingHours ?? null,
        verifiedAt: new Date(),
      },
    });
    await recordAudit(
      { action: 'CENTRE_CREATED', entityType: 'AssistanceCentre', entityId: centre.id },
      req,
    );
    res.status(201).json({ centre });
  }),
);

router.patch(
  '/centres/:id',
  requireRole(...ADMIN_ROLES),
  validate(centreSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.assistanceCentre.findUnique({ where: { id: req.params.id } });
    if (!existing) throw AppError.notFound('Assistance centre not found.');
    const centre = await prisma.assistanceCentre.update({
      where: { id: existing.id },
      data: { ...(req.body as z.infer<typeof centreSchema>), verifiedAt: new Date() },
    });
    await recordAudit(
      { action: 'CENTRE_UPDATED', entityType: 'AssistanceCentre', entityId: centre.id },
      req,
    );
    res.json({ centre });
  }),
);

router.get(
  '/analytics',
  requireRole(...ADMIN_ROLES),
  asyncHandler(async (_req, res) => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      usersByRole,
      schemesByStatus,
      schemesByCategory,
      applicationsByStatus,
      requestsByStatus,
      feedbackByStatus,
      notificationsUnread,
      views,
      newUsers,
      newApplications,
      pendingExtractions,
      monitoredSources,
    ] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.scheme.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.scheme.groupBy({
        by: ['categoryId'],
        _count: { _all: true },
        where: { status: 'PUBLISHED' },
      }),
      prisma.applicationRecord.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.assistanceRequest.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.feedback.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.notification.count({ where: { status: { not: 'READ' } } }),
      prisma.scheme.aggregate({ _sum: { views: true } }),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.applicationRecord.count({ where: { createdAt: { gte: since } } }),
      prisma.extractionResult.count({ where: { reviewStatus: 'PENDING' } }),
      prisma.schemeSource.count({ where: { isActive: true } }),
    ]);

    const categories = await prisma.schemeCategory.findMany({
      select: { id: true, slug: true, nameEn: true, nameKn: true },
    });
    const categoryNames = new Map(categories.map((category) => [category.id, category]));

    res.json({
      totals: {
        users: usersByRole.reduce((sum, row) => sum + row._count._all, 0),
        publishedSchemes: schemesByStatus.find((row) => row.status === 'PUBLISHED')?._count._all ?? 0,
        totalViews: views._sum.views ?? 0,
        unreadNotifications: notificationsUnread,
        pendingExtractions,
        monitoredSources,
      },
      usersByRole: Object.fromEntries(usersByRole.map((row) => [row.role, row._count._all])),
      schemesByStatus: Object.fromEntries(schemesByStatus.map((row) => [row.status, row._count._all])),
      publishedSchemesByCategory: schemesByCategory.map((row) => ({
        category: categoryNames.get(row.categoryId) ?? { slug: row.categoryId, nameEn: row.categoryId, nameKn: row.categoryId },
        count: row._count._all,
      })),
      applicationsByStatus: Object.fromEntries(applicationsByStatus.map((row) => [row.status, row._count._all])),
      assistanceRequestsByStatus: Object.fromEntries(requestsByStatus.map((row) => [row.status, row._count._all])),
      feedbackByStatus: Object.fromEntries(feedbackByStatus.map((row) => [row.status, row._count._all])),
      lastSevenDays: {
        newUsers,
        newApplications,
      },
      generatedAt: new Date().toISOString(),
    });
  }),
);

export default router;


