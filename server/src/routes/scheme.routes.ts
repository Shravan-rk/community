import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError } from '../lib/errors.js';
import { parseLanguage } from '../lib/language.js';
import {
  schemeDetailInclude,
  schemeListInclude,
  shapeSchemeDetail,
  shapeSchemeSummary,
} from '../lib/schemeContent.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const languageSchema = z.enum(['kn', 'en', 'hi']).default('kn');

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  department: z.string().trim().max(120).optional(),
  level: z.enum(['CENTRAL', 'STATE']).optional(),
  state: z.string().trim().max(80).optional(),
  sort: z.enum(['newest', 'popular', 'deadline', 'title']).default('newest'),
  language: languageSchema,
});

const detailQuerySchema = z.object({ language: languageSchema });

const relatedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(8).default(4),
  language: languageSchema,
});

const compareQuerySchema = z.object({
  slugs: z.string().trim().min(1, 'Provide 2 to 3 scheme slugs.').max(400),
  language: languageSchema,
});

router.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof listQuerySchema>;
    const language = parseLanguage(query.language);

    const where: Prisma.SchemeWhereInput = {
      status: 'PUBLISHED',
      ...(query.q
        ? {
            OR: [
              { titleEn: { contains: query.q } },
              { titleKn: { contains: query.q } },
              { titleHi: { contains: query.q } },
              { summaryEn: { contains: query.q } },
              { department: { contains: query.q } },
            ],
          }
        : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.department ? { department: { contains: query.department } } : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(query.state ? { state: query.state } : {}),
    };

    if (query.sort === 'deadline') {
      where.applicationDeadline = { not: null, gte: new Date() };
    }

    const orderBy: Prisma.SchemeOrderByWithRelationInput[] =
      query.sort === 'popular'
        ? [{ views: 'desc' }, { publishedAt: 'desc' }]
        : query.sort === 'deadline'
          ? [{ applicationDeadline: 'asc' }]
          : query.sort === 'title'
            ? [{ titleEn: 'asc' }]
            : [{ publishedAt: 'desc' }, { createdAt: 'desc' }];

    const [total, schemes] = await Promise.all([
      prisma.scheme.count({ where }),
      prisma.scheme.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: schemeListInclude,
      }),
    ]);

    res.json({
      schemes: schemes.map((scheme) => shapeSchemeSummary(scheme, language)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
      filters: {
        q: query.q ?? null,
        category: query.category ?? null,
        department: query.department ?? null,
        level: query.level ?? null,
        state: query.state ?? null,
        sort: query.sort,
        language,
      },
    });
  }),
);

router.get(
  '/compare',
  validate(compareQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof compareQuerySchema>;
    const language = parseLanguage(query.language);

    const requested = [
      ...new Set(
        query.slugs
          .split(',')
          .map((slug) => slug.trim())
          .filter(Boolean),
      ),
    ];

    if (requested.length < 2 || requested.length > 3) {
      throw AppError.badRequest('Compare 2 or 3 published schemes at a time.');
    }

    const records = await prisma.scheme.findMany({
      where: { slug: { in: requested }, status: 'PUBLISHED' },
      include: schemeListInclude,
    });

    const bySlug = new Map(records.map((record) => [record.slug, record]));
    const ordered = requested
      .map((slug) => bySlug.get(slug))
      .filter((record): record is NonNullable<typeof record> => Boolean(record));
    const missingSlugs = requested.filter((slug) => !bySlug.has(slug));

    if (ordered.length === 0) {
      throw AppError.notFound('None of the requested schemes are published.');
    }

    res.json({
      schemes: ordered.map((record) => ({
        ...shapeSchemeSummary(record, language),
        requiredDocuments: (() => {
          try {
            const parsed: unknown = record.requiredDocumentsJson ? JSON.parse(record.requiredDocumentsJson) : [];
            return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
          } catch {
            return [];
          }
        })(),
      })),
      missingSlugs,
      comparedCount: ordered.length,
    });
  }),
);

router.get(
  '/:slug/related',
  validate(relatedQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof relatedQuerySchema>;
    const language = parseLanguage(query.language);

    const scheme = await prisma.scheme.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      select: { id: true, categoryId: true },
    });
    if (!scheme) throw AppError.notFound('Scheme not found.');

    const related = await prisma.scheme.findMany({
      where: { status: 'PUBLISHED', categoryId: scheme.categoryId, id: { not: scheme.id } },
      orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
      take: query.limit,
      include: schemeListInclude,
    });

    res.json({ schemes: related.map((record) => shapeSchemeSummary(record, language)) });
  }),
);

router.get(
  '/:slug',
  validate(detailQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof detailQuerySchema>;
    const language = parseLanguage(query.language);

    const existing = await prisma.scheme.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!existing) throw AppError.notFound('This scheme is not published or does not exist.');

    const record = await prisma.scheme.update({
      where: { id: existing.id },
      data: { views: { increment: 1 } },
      include: schemeDetailInclude,
    });

    res.json({ scheme: shapeSchemeDetail(record, language) });
  }),
);

export default router;
