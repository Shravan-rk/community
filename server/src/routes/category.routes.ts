import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { parseLanguage } from '../lib/language.js';
import { localizedCategoryName } from '../lib/schemeContent.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const language = parseLanguage(req.query.language);

    const categories = await prisma.schemeCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { schemes: { where: { status: 'PUBLISHED' } } } },
      },
    });

    res.json({
      language,
      categories: categories.map((category) => ({
        slug: category.slug,
        name: localizedCategoryName(category, language),
        nameEn: category.nameEn,
        nameKn: category.nameKn,
        nameHi: category.nameHi,
        description: category.descriptionEn,
        icon: category.icon,
        schemeCount: category._count.schemes,
      })),
    });
  }),
);

export default router;
