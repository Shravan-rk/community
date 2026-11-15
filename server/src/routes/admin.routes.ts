import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError } from '../lib/errors.js';
import { recordAudit } from '../lib/audit.js';
import { publicUser } from '../lib/publicUser.js';
import { ROLES } from '../lib/roles.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN', 'SUPER_ADMIN'));

const usersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  role: z.enum(ROLES).optional(),
  q: z.string().trim().max(120).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

const roleSchema = z.object({
  role: z.enum(ROLES),
});

const statusSchema = z.object({
  isActive: z.boolean(),
});

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  action: z.string().trim().max(80).optional(),
  entityType: z.string().trim().max(80).optional(),
  actorId: z.string().trim().max(40).optional(),
});

router.get(
  '/users',
  validate(usersQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof usersQuerySchema>;
    const where = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive ? { isActive: query.isActive === 'true' } : {}),
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q } },
              { email: { contains: query.q } },
              { phone: { contains: query.q } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          _count: { select: { savedSchemes: true, applications: true, notifications: true } },
        },
      }),
    ]);

    res.json({
      users: users.map((user) => ({
        ...publicUser(user),
        counts: user._count,
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

router.patch(
  '/users/:id/role',
  requireRole('SUPER_ADMIN'),
  validate(roleSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof roleSchema>;
    const targetId = req.params.id;
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw AppError.notFound('User not found.');

    if (target.role === 'SUPER_ADMIN' && body.role !== 'SUPER_ADMIN') {
      const remaining = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', isActive: true, id: { not: targetId } },
      });
      if (remaining === 0) throw AppError.conflict('At least one active super admin must remain.');
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { role: body.role },
    });

    await recordAudit(
      {
        action: 'ADMIN_USER_ROLE_CHANGED',
        entityType: 'User',
        entityId: targetId,
        metadata: { from: target.role, to: body.role },
      },
      req,
    );

    res.json({ user: publicUser(updated) });
  }),
);

router.patch(
  '/users/:id/status',
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof statusSchema>;
    const targetId = req.params.id;

    if (targetId === req.user!.id && !body.isActive) {
      throw AppError.badRequest('You cannot deactivate your own account.');
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw AppError.notFound('User not found.');

    if (target.role === 'SUPER_ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      throw AppError.forbidden('Only a super admin can change a super admin account.');
    }

    if (target.role === 'SUPER_ADMIN' && !body.isActive) {
      const remaining = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', isActive: true, id: { not: targetId } },
      });
      if (remaining === 0) throw AppError.conflict('At least one active super admin must remain.');
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { isActive: body.isActive },
    });

    await recordAudit(
      {
        action: 'ADMIN_USER_STATUS_CHANGED',
        entityType: 'User',
        entityId: targetId,
        metadata: { isActive: body.isActive },
      },
      req,
    );

    res.json({ user: publicUser(updated) });
  }),
);

router.get(
  '/audit-logs',
  validate(auditQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof auditQuerySchema>;
    const where = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          actor: { select: { id: true, email: true, fullName: true, role: true } },
        },
      }),
    ]);

    res.json({
      logs,
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
  '/stats',
  asyncHandler(async (_req, res) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [usersByRole, schemesByStatus, notifications, auditToday, savedSchemes] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.scheme.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.notification.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.savedScheme.count(),
    ]);

    const totalUsers = usersByRole.reduce((sum, row) => sum + row._count._all, 0);
    const totalSchemes = schemesByStatus.reduce((sum, row) => sum + row._count._all, 0);

    res.json({
      totals: { users: totalUsers, schemes: totalSchemes, notifications, savedSchemes, auditToday },
      usersByRole: Object.fromEntries(usersByRole.map((row) => [row.role, row._count._all])),
      schemesByStatus: Object.fromEntries(schemesByStatus.map((row) => [row.status, row._count._all])),
    });
  }),
);

export default router;
