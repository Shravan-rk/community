import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError } from '../lib/errors.js';
import { parseJsonObject } from '../lib/language.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z.enum(['true', 'false']).optional(),
  type: z.enum(['SCHEME_UPDATE', 'NEW_SCHEME', 'DEADLINE', 'APPLICATION', 'SYSTEM']).optional(),
});

router.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof listQuerySchema>;
    const where = {
      userId: req.user!.id,
      ...(query.unreadOnly === 'true' ? { status: { not: 'READ' } } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [total, notifications, unreadCount] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { scheme: { select: { slug: true, titleEn: true, titleKn: true, isDemoData: true } } },
      }),
      prisma.notification.count({
        where: { userId: req.user!.id, status: { not: 'READ' } },
      }),
    ]);

    res.json({
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        language: notification.language,
        type: notification.type,
        channel: notification.channel,
        status: notification.status,
        read: notification.status === 'READ',
        readAt: notification.readAt,
        sentAt: notification.sentAt,
        createdAt: notification.createdAt,
        scheme: notification.scheme,
        metadata: parseJsonObject(notification.metadataJson),
      })),
      unreadCount,
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
  '/:id/read',
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      select: { id: true, status: true, readAt: true },
    });
    if (!notification) throw AppError.notFound('Notification not found.');

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: 'READ',
        readAt: notification.readAt ?? new Date(),
      },
    });

    res.json({
      notification: {
        id: updated.id,
        status: updated.status,
        read: true,
        readAt: updated.readAt,
      },
    });
  }),
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user!.id, status: { not: 'READ' } },
      data: { status: 'READ', readAt: new Date() },
    });

    res.json({ markedRead: result.count });
  }),
);

export default router;
