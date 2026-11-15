import type { Language } from './roles.js';
import { parseJsonObject } from './language.js';

export const ELIGIBILITY_FIELDS = [
  'age',
  'annualIncome',
  'occupation',
  'gender',
  'education',
  'landHoldingAcres',
  'socialCategory',
  'disabilityStatus',
  'state',
  'district',
  'familySize',
] as const;

export const ASSESSMENTS = [
  'LIKELY_ELIGIBLE',
  'NOT_ELIGIBLE',
  'NEEDS_INFORMATION',
  'NOT_ASSESSABLE',
] as const;

export type Assessment = (typeof ASSESSMENTS)[number];

export const RULE_OPERATORS = ['GTE', 'LTE', 'EQ', 'NEQ', 'IN', 'CONTAINS', 'EXISTS'] as const;

export interface EligibilityProfile {
  dateOfBirth: Date | null;
  gender: string | null;
  state: string | null;
  district: string | null;
  occupation: string | null;
  annualIncome: number | null;
  education: string | null;
  landHoldingAcres: number | null;
  familySize: number | null;
  disabilityStatus: boolean | null;
  socialCategory: string | null;
  profileJson: string | null;
  onboardingCompleted: boolean;
}

export interface EligibilityRuleInput {
  field: string;
  operator: string;
  valueJson: string;
  descriptionEn: string | null;
  descriptionKn: string | null;
  isRequired: boolean;
  sortOrder: number;
}

export type RuleStatus = 'MET' | 'NOT_MET' | 'UNKNOWN';

export type RuleReason =
  | 'MATCH'
  | 'MISMATCH'
  | 'MISSING_PROFILE_DATA'
  | 'INVALID_RULE'
  | 'INCOMPATIBLE_VALUE';

export interface EvaluatedRule {
  field: string;
  operator: string;
  required: boolean;
  status: RuleStatus;
  reason: RuleReason;
  expected: unknown;
  actual: unknown;
  description: string | null;
  descriptionLanguage: 'kn' | 'en';
  sortOrder: number;
}

export interface EligibilityResult {
  assessment: Assessment;
  label: string;
  likelyEligible: boolean;
  counts: {
    total: number;
    required: number;
    optional: number;
    met: number;
    notMet: number;
    unknown: number;
  };
  missingProfileFields: string[];
  rules: EvaluatedRule[];
  disclaimer: string;
  language: Language;
}

const LABELS: Record<Language, Record<Assessment, string>> = {
  kn: {
    LIKELY_ELIGIBLE: 'ಸಂಭಾವ್ಯ ಅರ್ಹತೆ',
    NOT_ELIGIBLE: 'ಈ ಮಾಹಿತಿಯ ಪ್ರಕಾರ ಅರ್ಹರಲ್ಲ',
    NEEDS_INFORMATION: 'ಹೆಚ್ಚಿನ ಮಾಹಿತಿ ಅಗತ್ಯ',
    NOT_ASSESSABLE: 'ಸ್ವಯಂಚಾಲಿತ ಪರಿಶೀಲನೆ ಸಾಧ್ಯವಿಲ್ಲ',
  },
  en: {
    LIKELY_ELIGIBLE: 'Likely eligible',
    NOT_ELIGIBLE: 'Not eligible based on this information',
    NEEDS_INFORMATION: 'More information needed',
    NOT_ASSESSABLE: 'Automatic assessment not possible',
  },
  hi: {
    LIKELY_ELIGIBLE: 'संभावित पात्रता',
    NOT_ELIGIBLE: 'इस जानकारी के अनुसार पात्र नहीं',
    NEEDS_INFORMATION: 'अधिक जानकारी आवश्यक',
    NOT_ASSESSABLE: 'स्वचालित मूल्यांकन संभव नहीं',
  },
};

const DISCLAIMERS: Record<Language, string> = {
  kn: 'ಇದು ಕೇವಲ ಮಾಹಿತಿಗಾಗಿ ನೀಡುವ ಅಂದಾಜು; ಅಂತಿಮ ಅರ್ಹತೆಯನ್ನು ಅಧಿಕೃತ ಇಲಾಖೆ ನಿರ್ಧರಿಸುತ್ತದೆ.',
  en: 'This is an informational estimate only. Final eligibility is decided by the official department.',
  hi: 'यह केवल जानकारी के लिए एक अनुमान है। अंतिम पात्रता आधिकारिक विभाग तय करता है।',
};

export function eligibilityLabel(assessment: Assessment, language: Language): string {
  return LABELS[language][assessment];
}

export function eligibilityDisclaimer(language: Language): string {
  return DISCLAIMERS[language];
}

export function calculateAge(dateOfBirth: Date, now: Date = new Date()): number | null {
  if (!(dateOfBirth instanceof Date) || Number.isNaN(dateOfBirth.getTime())) return null;
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }
  if (age < 0 || age > 130) return null;
  return age;
}

export function buildEligibilityAttributes(
  profile: EligibilityProfile | null,
  now: Date = new Date(),
): Record<string, unknown> {
  if (!profile) return {};

  const attributes: Record<string, unknown> = {};
  const assign = (key: string, value: unknown): void => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string' && value.trim() === '') return;
    if (typeof value === 'number' && !Number.isFinite(value)) return;
    attributes[key] = value;
  };

  const age = profile.dateOfBirth ? calculateAge(profile.dateOfBirth, now) : null;
  assign('age', age);
  assign('annualIncome', profile.annualIncome);
  assign('occupation', profile.occupation);
  assign('gender', profile.gender);
  assign('education', profile.education);
  assign('landHoldingAcres', profile.landHoldingAcres);
  assign('socialCategory', profile.socialCategory);
  assign('disabilityStatus', profile.disabilityStatus);
  assign('state', profile.state);
  assign('district', profile.district);
  assign('familySize', profile.familySize);

  const extras = parseJsonObject(profile.profileJson);
  for (const [key, value] of Object.entries(extras)) {
    if (attributes[key] === undefined) assign(key, value);
  }

  return attributes;
}

function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'number') return !Number.isFinite(value);
  return false;
}

function normalizeScalar(value: unknown): string | number | boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
    return trimmed.toLowerCase();
  }
  return null;
}

function scalarEquals(left: unknown, right: unknown): boolean {
  const a = normalizeScalar(left);
  const b = normalizeScalar(right);
  return a !== null && b !== null && a === b;
}

function isScalar(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function includesValue(haystack: unknown[], needle: unknown): boolean {
  return haystack.some((item) => scalarEquals(item, needle));
}

interface RuleEvaluation {
  status: RuleStatus;
  reason: RuleReason;
  expected: unknown;
}

function evaluateRule(operator: string, operand: unknown, actual: unknown): RuleEvaluation {
  if (isMissingValue(actual)) {
    return { status: 'UNKNOWN', reason: 'MISSING_PROFILE_DATA', expected: operator === 'EXISTS' ? null : operand };
  }

  if (operator === 'EXISTS') {
    return { status: 'MET', reason: 'MATCH', expected: null };
  }

  switch (operator) {
    case 'GTE':
    case 'LTE': {
      const expected = toNumber(operand);
      const value = toNumber(actual);
      if (expected === null) return { status: 'UNKNOWN', reason: 'INVALID_RULE', expected: operand };
      if (value === null) {
        return { status: 'UNKNOWN', reason: 'INCOMPATIBLE_VALUE', expected: operand };
      }
      const met = operator === 'GTE' ? value >= expected : value <= expected;
      return { status: met ? 'MET' : 'NOT_MET', reason: met ? 'MATCH' : 'MISMATCH', expected: operand };
    }
    case 'EQ':
    case 'NEQ': {
      if (!isScalar(operand)) {
        return { status: 'UNKNOWN', reason: 'INVALID_RULE', expected: operand };
      }
      if (!isScalar(actual)) {
        return { status: 'UNKNOWN', reason: 'INCOMPATIBLE_VALUE', expected: operand };
      }
      const equal = scalarEquals(actual, operand);
      const met = operator === 'EQ' ? equal : !equal;
      return { status: met ? 'MET' : 'NOT_MET', reason: met ? 'MATCH' : 'MISMATCH', expected: operand };
    }
    case 'IN': {
      if (!Array.isArray(operand)) {
        return { status: 'UNKNOWN', reason: 'INVALID_RULE', expected: operand };
      }
      if (Array.isArray(actual)) {
        const met = actual.some((value) => includesValue(operand, value));
        return { status: met ? 'MET' : 'NOT_MET', reason: met ? 'MATCH' : 'MISMATCH', expected: operand };
      }
      const met = includesValue(operand, actual);
      return { status: met ? 'MET' : 'NOT_MET', reason: met ? 'MATCH' : 'MISMATCH', expected: operand };
    }
    case 'CONTAINS': {
      if (Array.isArray(actual)) {
        const met = includesValue(actual, operand);
        return { status: met ? 'MET' : 'NOT_MET', reason: met ? 'MATCH' : 'MISMATCH', expected: operand };
      }
      const expected = normalizeScalar(operand);
      const value = normalizeScalar(actual);
      if (expected === null || value === null) {
        return { status: 'UNKNOWN', reason: 'INCOMPATIBLE_VALUE', expected: operand };
      }
      const met = String(value).includes(String(expected));
      return { status: met ? 'MET' : 'NOT_MET', reason: met ? 'MATCH' : 'MISMATCH', expected: operand };
    }
    default:
      return { status: 'UNKNOWN', reason: 'INVALID_RULE', expected: operand };
  }
}

function parseOperand(valueJson: string): { ok: boolean; value: unknown } {
  try {
    return { ok: true, value: JSON.parse(valueJson) };
  } catch {
    return { ok: false, value: null };
  }
}

export function evaluateEligibility(
  rules: EligibilityRuleInput[],
  profile: EligibilityProfile | null,
  language: Language,
  now: Date = new Date(),
): EligibilityResult {
  const attributes = buildEligibilityAttributes(profile, now);
  const ordered = [...rules].sort((left, right) => left.sortOrder - right.sortOrder);

  const evaluated: EvaluatedRule[] = ordered.map((rule) => {
    const operand = parseOperand(rule.valueJson);

    let description: string | null;
    let descriptionLanguage: 'kn' | 'en';
    if (language === 'kn' && rule.descriptionKn) {
      description = rule.descriptionKn;
      descriptionLanguage = 'kn';
    } else if (rule.descriptionEn) {
      description = rule.descriptionEn;
      descriptionLanguage = 'en';
    } else if (rule.descriptionKn) {
      description = rule.descriptionKn;
      descriptionLanguage = 'kn';
    } else {
      description = null;
      descriptionLanguage = 'en';
    }

    let evaluation: RuleEvaluation;
    if (!operand.ok) {
      evaluation = { status: 'UNKNOWN', reason: 'INVALID_RULE', expected: null };
    } else if (!RULE_OPERATORS.includes(rule.operator as (typeof RULE_OPERATORS)[number])) {
      evaluation = { status: 'UNKNOWN', reason: 'INVALID_RULE', expected: operand.value };
    } else {
      evaluation = evaluateRule(rule.operator, operand.value, attributes[rule.field]);
    }

    return {
      field: rule.field,
      operator: rule.operator,
      required: rule.isRequired,
      status: evaluation.status,
      reason: evaluation.reason,
      expected: evaluation.expected,
      actual: attributes[rule.field] ?? null,
      description: description ?? null,
      descriptionLanguage,
      sortOrder: rule.sortOrder,
    };
  });

  const requiredRules = evaluated.filter((rule) => rule.required);
  const missingProfileFields = [
    ...new Set(
      requiredRules
        .filter((rule) => rule.reason === 'MISSING_PROFILE_DATA')
        .map((rule) => rule.field),
    ),
  ];

  let assessment: Assessment;
  if (requiredRules.length === 0) {
    assessment = 'NOT_ASSESSABLE';
  } else if (requiredRules.some((rule) => rule.status === 'NOT_MET')) {
    assessment = 'NOT_ELIGIBLE';
  } else if (requiredRules.some((rule) => rule.status === 'UNKNOWN')) {
    assessment = 'NEEDS_INFORMATION';
  } else {
    assessment = 'LIKELY_ELIGIBLE';
  }

  const counts = {
    total: evaluated.length,
    required: requiredRules.length,
    optional: evaluated.length - requiredRules.length,
    met: evaluated.filter((rule) => rule.status === 'MET').length,
    notMet: evaluated.filter((rule) => rule.status === 'NOT_MET').length,
    unknown: evaluated.filter((rule) => rule.status === 'UNKNOWN').length,
  };

  return {
    assessment,
    label: eligibilityLabel(assessment, language),
    likelyEligible: assessment === 'LIKELY_ELIGIBLE',
    counts,
    missingProfileFields,
    rules: evaluated,
    disclaimer: eligibilityDisclaimer(language),
    language,
  };
}
