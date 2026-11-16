import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError } from '../lib/errors.js';
import { recordAudit } from '../lib/audit.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

export const centresRouter = Router();
export const assistanceRequestsRouter = Router();

const CENTRE_TYPES = ['CSC', 'GRAMA_PANCHAYAT', 'GOVERNMENT_OFFICE', 'NGO'] as const;
const REQUEST_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

const centresQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  district: z.string().trim().max(80).optional(),
  type: z.enum(CENTRE_TYPES).optional(),
  q: z.string().trim().max(120).optional(),
});

centresRouter.get(
  '/',
  validate(centresQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof centresQuerySchema>;
    const where = {
      isActive: true,
      ...(query.district ? { district: query.district } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q } },
              { address: { contains: query.q } },
              { district: { contains: query.q } },
              { taluk: { contains: query.q } },
            ],
          }
        : {}),
    };

    const [total, centres, districts] = await Promise.all([
      prisma.assistanceCentre.count({ where }),
      prisma.assistanceCentre.findMany({
        where,
        orderBy: [{ district: 'asc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.assistanceCentre.findMany({
        where: { isActive: true },
        distinct: ['district'],
        select: { district: true },
        orderBy: { district: 'asc' },
      }),
    ]);

    res.json({
      centres,
      districts: districts.map((row) => row.district),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    });
  }),
);

assistanceRequestsRouter.use(authenticate);

const createRequestSchema = z.object({
  subject: z.string().trim().min(5).max(160),
  description: z.string().trim().min(10).max(2000),
  centreId: z.string().trim().min(1).max(60).nullable().optional(),
  contactPhone: z.string().trim().max(20).nullable().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

assistanceRequestsRouter.get(
  '/me',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof listQuerySchema>;
    const where = { userId: req.user!.id };
    const [total, requests] = await Promise.all([
      prisma.assistanceRequest.count({ where }),
      prisma.assistanceRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          centre: { select: { id: true, name: true, phone: true, district: true, address: true } },
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

assistanceRequestsRouter.post(
  '/',
  validate(createRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createRequestSchema>;

    let centreId: string | null = body.centreId ?? null;
    if (centreId) {
      const centre = await prisma.assistanceCentre.findFirst({
        where: { id: centreId, isActive: true },
        select: { id: true },
      });
      if (!centre) throw AppError.badRequest('Unknown or inactive assistance centre.');
      centreId = centre.id;
    }

    const request = await prisma.assistanceRequest.create({
      data: {
        userId: req.user!.id,
        centreId,
        subject: body.subject,
        description: body.description,
        contactPhone: body.contactPhone ?? null,
        status: 'OPEN',
      },
    });

    await recordAudit(
      {
        action: 'ASSISTANCE_REQUEST_CREATED',
        entityType: 'AssistanceRequest',
        entityId: request.id,
        metadata: { centreId, subject: body.subject },
      },
      req,
    );

    res.status(201).json({ request });
  }),
);

export { CENTRE_TYPES, REQUEST_STATUSES };
