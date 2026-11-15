import { prisma } from '../db.js';
import { AppError } from './errors.js';

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return base || 'scheme';
}

export async function uniqueSchemeSlug(base: string): Promise<string> {
  let candidate = base;
  for (let attempt = 2; attempt <= 60; attempt += 1) {
    const existing = await prisma.scheme.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
    candidate = `${base}-${attempt}`;
  }
  throw AppError.conflict('Could not derive a unique slug. Provide an explicit slug.');
}
