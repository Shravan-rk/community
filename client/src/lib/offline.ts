import type { Language, SchemeDetail, SchemeSummary } from '../types';

interface Cached<T> {
  savedAt: string;
  data: T;
}

function read<T>(key: string): Cached<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached<T>;
    return parsed?.data && parsed.savedAt ? parsed : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: new Date().toISOString(), data }));
  } catch {
    // Storage can be full or disabled; offline caching is best-effort.
  }
}

export function cacheScheme(slug: string, language: Language, scheme: SchemeDetail): void {
  write(`gs:scheme:${language}:${slug}`, scheme);
}

export function getCachedScheme(slug: string, language: Language): Cached<SchemeDetail> | null {
  return read<SchemeDetail>(`gs:scheme:${language}:${slug}`);
}

export function cacheSchemeList(key: string, language: Language, schemes: SchemeSummary[]): void {
  write(`gs:list:${language}:${key}`, schemes.slice(0, 12));
}

export function getCachedSchemeList(key: string, language: Language): Cached<SchemeSummary[]> | null {
  return read<SchemeSummary[]>(`gs:list:${language}:${key}`);
}
