import type { Language, Role } from '../types';

const LOCALES: Record<Language, string> = {
  kn: 'kn-IN',
  en: 'en-IN',
  hi: 'hi-IN',
};

export function formatDate(value: string | null | undefined, language: Language): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(LOCALES[language] ?? 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(LOCALES[language] ?? 'en-IN').format(value);
}

export function statusTone(status: string): string {
  switch (status) {
    case 'PUBLISHED':
    case 'APPROVED':
    case 'COMPLETED':
    case 'RESOLVED':
    case 'SUCCESS':
      return 'bg-emerald-100 text-emerald-800';
    case 'VERIFIED':
    case 'REVIEWED':
    case 'TRACKING':
      return 'bg-sky-100 text-sky-800';
    case 'PENDING_VERIFICATION':
    case 'PENDING':
    case 'QUEUED':
    case 'DRAFT':
    case 'OPEN':
      return 'bg-amber-100 text-amber-900';
    case 'REJECTED':
    case 'FAILED':
    case 'EXPIRED':
      return 'bg-red-100 text-red-800';
    case 'IN_PROGRESS':
    case 'RUNNING':
    case 'ASSISTED':
      return 'bg-indigo-100 text-indigo-800';
    case 'SUBMITTED_OFFLINE':
      return 'bg-cyan-100 text-cyan-900';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function assessmentTone(assessment: string): string {
  switch (assessment) {
    case 'LIKELY_ELIGIBLE':
      return 'bg-emerald-100 text-emerald-800';
    case 'NOT_ELIGIBLE':
      return 'bg-red-100 text-red-800';
    case 'NEEDS_INFORMATION':
      return 'bg-amber-100 text-amber-900';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function isStaff(role: Role | undefined): boolean {
  return role === 'SCHEME_VERIFIER' || role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function isAdmin(role: Role | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function truncate(text: string | null | undefined, length = 180): string {
  if (!text) return '';
  return text.length <= length ? text : `${text.slice(0, length).trimEnd()}…`;
}

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}
