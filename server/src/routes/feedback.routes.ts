import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { recordAudit } from '../lib/audit.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

const createSchema = z.object({
  schemeSlug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .nullable()
    .optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  message: z.string().trim().min(5).max(2000),
});

router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;

    let schemeId: string | null = null;
    if (body.schemeSlug) {
      const scheme = await prisma.scheme.findUnique({
        where: { slug: body.schemeSlug },
        select: { id: true },
      });
      schemeId = scheme?.id ?? null;
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: req.user!.id,
        schemeId,
        rating: body.rating ?? null,
        message: body.message,
        status: 'NEW',
      },
      select: { id: true, rating: true, message: true, status: true, createdAt: true },
    });

    await recordAudit(
      {
        action: 'FEEDBACK_CREATED',
        entityType: 'Feedback',
        entityId: feedback.id,
        metadata: { schemeId, rating: body.rating ?? null },
      },
      req,
    );

    res.status(201).json({ feedback });
  }),
);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const feedback = await prisma.feedback.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: { scheme: { select: { slug: true, titleEn: true, titleKn: true } } },
    });
    res.json({ feedback });
  }),
);

export default router;
