import { LANGUAGES, type Language } from './roles.js';

export function parseLanguage(value: unknown, fallback: Language = 'kn'): Language {
  if (typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)) {
    return value as Language;
  }
  return fallback;
}

export function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export function parseJsonValue(value: string | null | undefined): unknown {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}
