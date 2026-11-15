import type { Prisma } from '@prisma/client';
import type { Language } from './roles.js';
import { asString, parseJsonObject, parseJsonValue } from './language.js';

export const schemeListInclude = {
  category: {
    select: { id: true, slug: true, nameEn: true, nameKn: true, nameHi: true, icon: true },
  },
  translations: { select: { language: true, fieldsJson: true, quality: true } },
} satisfies Prisma.SchemeInclude;

export const schemeDetailInclude = {
  ...schemeListInclude,
  source: {
    select: { id: true, slug: true, name: true, baseUrl: true, sourceType: true, lastCheckedAt: true },
  },
  eligibilityRules: { orderBy: { sortOrder: 'asc' } },
  documents: {
    select: { id: true, title: true, fileType: true, fileUrl: true, sourceUrl: true, ocrStatus: true },
  },
} satisfies Prisma.SchemeInclude;

export type SchemeListRecord = Prisma.SchemeGetPayload<{ include: typeof schemeListInclude }>;
export type SchemeDetailRecord = Prisma.SchemeGetPayload<{ include: typeof schemeDetailInclude }>;

function translationFields(record: { translations?: Array<{ language: string; fieldsJson: string }> }, language: Language) {
  const translation = record.translations?.find((item) => item.language === language);
  return translation ? parseJsonObject(translation.fieldsJson) : {};
}

function localizedField(input: {
  key: string;
  language: Language;
  english: string | null;
  kannada: string | null;
  hindi: string | null;
  translation: Record<string, unknown>;
  fallbacks: string[];
}): string | null {
  const { key, language, english, kannada, hindi, translation, fallbacks } = input;
  if (language === 'en') return english;
  const translated = asString(translation[key]);
  const direct = language === 'kn' ? kannada : hindi;
  const value = asString(direct) ?? translated;
  if (value) return value;
  if (english) fallbacks.push(key);
  return english;
}

export function availableLanguages(record: {
  titleEn: string | null;
  titleKn: string | null;
  titleHi: string | null;
  translations?: Array<{ language: string }>;
}): Language[] {
  const languages: Language[] = [];
  if (record.titleEn) languages.push('en');
  const translated = new Set((record.translations ?? []).map((item) => item.language));
  if (record.titleKn || translated.has('kn')) languages.push('kn');
  if (record.titleHi || translated.has('hi')) languages.push('hi');
  return languages;
}

export function localizedCategoryName(
  category: { nameEn: string; nameKn: string; nameHi: string },
  language: Language,
): string {
  if (language === 'kn') return category.nameKn;
  if (language === 'hi') return category.nameHi;
  return category.nameEn;
}

export function shapeSchemeSummary(record: SchemeListRecord, language: Language) {
  const fallbacks: string[] = [];
  const translation = translationFields(record, language);

  const title = localizedField({
    key: 'title',
    language,
    english: record.titleEn,
    kannada: record.titleKn,
    hindi: record.titleHi,
    translation,
    fallbacks,
  });
  const summary = localizedField({
    key: 'summary',
    language,
    english: record.summaryEn,
    kannada: record.summaryKn,
    hindi: record.summaryHi,
    translation,
    fallbacks,
  });
  const benefits = localizedField({
    key: 'benefits',
    language,
    english: record.benefitsEn,
    kannada: record.benefitsKn,
    hindi: null,
    translation,
    fallbacks,
  });
  const eligibility = localizedField({
    key: 'eligibility',
    language,
    english: record.eligibilityEn,
    kannada: record.eligibilityKn,
    hindi: null,
    translation,
    fallbacks,
  });

  return {
    id: record.id,
    slug: record.slug,
    title,
    summary,
    benefits,
    eligibility,
    department: record.department,
    level: record.level,
    state: record.state,
    status: record.status,
    isDemoData: record.isDemoData,
    applicationDeadline: record.applicationDeadline,
    officialUrl: record.officialUrl,
    applicationUrl: record.applicationUrl,
    lastVerifiedAt: record.lastVerifiedAt,
    publishedAt: record.publishedAt,
    views: record.views,
    version: record.version,
    category: {
      slug: record.category.slug,
      name: localizedCategoryName(record.category, language),
      icon: record.category.icon,
    },
    language,
    availableLanguages: availableLanguages(record),
    fallbacks,
  };
}

export function shapeEligibilityRule(
  rule: {
    field: string;
    operator: string;
    valueJson: string;
    descriptionEn: string | null;
    descriptionKn: string | null;
  },
  language: Language,
) {
  const description = language === 'kn' ? rule.descriptionKn ?? rule.descriptionEn : rule.descriptionEn;
  return {
    field: rule.field,
    operator: rule.operator,
    value: parseJsonValue(rule.valueJson),
    description,
  };
}

export function shapeSchemeDetail(record: SchemeDetailRecord, language: Language) {
  const summary = shapeSchemeSummary(record as unknown as SchemeListRecord, language);
  const translation = translationFields(record, language);
  const detailFallbacks: string[] = [];

  const description = localizedField({
    key: 'description',
    language,
    english: record.descriptionEn,
    kannada: record.descriptionKn,
    hindi: null,
    translation,
    fallbacks: detailFallbacks,
  });
  const applicationProcess = localizedField({
    key: 'applicationProcess',
    language,
    english: record.applicationProcessEn,
    kannada: record.applicationProcessKn,
    hindi: null,
    translation,
    fallbacks: detailFallbacks,
  });

  let requiredDocuments: string[] = [];
  try {
    const parsed: unknown = record.requiredDocumentsJson ? JSON.parse(record.requiredDocumentsJson) : [];
    requiredDocuments = Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    requiredDocuments = [];
  }

  return {
    ...summary,
    description,
    applicationProcess,
    requiredDocuments,
    notificationNumber: record.notificationNumber,
    startDate: record.startDate,
    endDate: record.endDate,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    source: record.source
      ? {
          name: record.source.name,
          baseUrl: record.source.baseUrl,
          sourceType: record.source.sourceType,
          lastCheckedAt: record.source.lastCheckedAt,
        }
      : null,
    eligibilityRules: record.eligibilityRules.map((rule) => shapeEligibilityRule(rule, language)),
    documents: record.documents,
    translations: (record.translations ?? []).map((item) => ({
      language: item.language,
      quality: item.quality,
    })),
    fallbacks: [...new Set([...summary.fallbacks, ...detailFallbacks])],
  };
}

export function buildSchemeSnapshot(
  record: {
    titleEn: string;
    titleKn: string | null;
    titleHi: string | null;
    summaryEn: string;
    summaryKn: string | null;
    summaryHi: string | null;
    descriptionEn: string | null;
    descriptionKn: string | null;
    department: string;
    level: string;
    state: string | null;
    categoryId: string;
    benefitsEn: string;
    benefitsKn: string | null;
    eligibilityEn: string | null;
    eligibilityKn: string | null;
    requiredDocumentsJson: string | null;
    applicationProcessEn: string | null;
    applicationProcessKn: string | null;
    applicationUrl: string | null;
    officialUrl: string | null;
    notificationNumber: string | null;
    applicationDeadline: Date | null;
    startDate: Date | null;
    endDate: Date | null;
    sourceId: string | null;
    status: string;
  },
  rules: Array<{
    field: string;
    operator: string;
    valueJson: string;
    descriptionEn: string | null;
    descriptionKn: string | null;
    isRequired: boolean;
    sortOrder: number;
  }> = [],
): string {
  return JSON.stringify({
    titleEn: record.titleEn,
    titleKn: record.titleKn,
    titleHi: record.titleHi,
    summaryEn: record.summaryEn,
    summaryKn: record.summaryKn,
    summaryHi: record.summaryHi,
    descriptionEn: record.descriptionEn,
    descriptionKn: record.descriptionKn,
    department: record.department,
    level: record.level,
    state: record.state,
    categoryId: record.categoryId,
    benefitsEn: record.benefitsEn,
    benefitsKn: record.benefitsKn,
    eligibilityEn: record.eligibilityEn,
    eligibilityKn: record.eligibilityKn,
    requiredDocuments: record.requiredDocumentsJson,
    applicationProcessEn: record.applicationProcessEn,
    applicationProcessKn: record.applicationProcessKn,
    applicationUrl: record.applicationUrl,
    officialUrl: record.officialUrl,
    notificationNumber: record.notificationNumber,
    applicationDeadline: record.applicationDeadline,
    startDate: record.startDate,
    endDate: record.endDate,
    sourceId: record.sourceId,
    status: record.status,
    eligibilityRules: rules.map((rule) => ({
      field: rule.field,
      operator: rule.operator,
      value: parseJsonValue(rule.valueJson),
      descriptionEn: rule.descriptionEn,
      descriptionKn: rule.descriptionKn,
      isRequired: rule.isRequired,
      sortOrder: rule.sortOrder,
    })),
  });
}


export function str(value: unknown): string {
  return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
}

