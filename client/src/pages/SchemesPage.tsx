import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GitCompareArrows, Mic, Search, SlidersHorizontal, X } from 'lucide-react';
import { api, queryString } from '../lib/api';
import { useApp } from '../context/AppContext';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { SchemeCard } from '../components/SchemeCard';
import { EmptyState, ErrorState, PageHeader, PaginationBar, Spinner } from '../components/ui';
import type { Category, SchemeListResponse } from '../types';

const SORTS = [
  { value: 'newest', key: 'common.sort.newest' },
  { value: 'popular', key: 'common.sort.popular' },
  { value: 'deadline', key: 'common.sort.deadline' },
  { value: 'title', key: 'common.sort.title' },
] as const;

export function SchemesPage() {
  const { language, t } = useApp();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<SchemeListResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [selected, setSelected] = useState<string[]>([]);

  const filters = useMemo(
    () => ({
      q: params.get('q') ?? '',
      category: params.get('category') ?? '',
      level: params.get('level') ?? '',
      sort: params.get('sort') ?? 'newest',
      page: Number(params.get('page') ?? '1') || 1,
    }),
    [params],
  );

  const voice = useVoiceSearch(language, (text) => {
    setQuery(text);
    update({ q: text, page: '1' });
  });

  useEffect(() => {
    setQuery(filters.q);
  }, [filters.q]);

  useEffect(() => {
    api
      .get<{ categories: Category[] }>(`/categories${queryString({ language })}`)
      .then((response) => setCategories(response.categories))
      .catch(() => undefined);
  }, [language]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api
      .get<SchemeListResponse>(
        `/schemes${queryString({
          language,
          page: filters.page,
          pageSize: 12,
          q: filters.q,
          category: filters.category,
          level: filters.level,
          sort: filters.sort,
        })}`,
        controller.signal,
      )
      .then(setData)
      .catch((err: unknown) => {
        if ((err as { name?: string }).name !== 'AbortError') setError(t('common.error'));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [language, filters, t]);

  function update(next: Record<string, string>) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    if (!next.page) merged.delete('page');
    setParams(merged);
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    update({ q: query.trim(), page: '1' });
  }

  function toggleCompare(slug: string) {
    setSelected((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug);
      if (current.length >= 3) return current;
      return [...current, slug];
    });
  }

  function clearFilters() {
    setParams(new URLSearchParams());
    setQuery('');
  }

  const hasFilters = Boolean(filters.q || filters.category || filters.level || filters.sort !== 'newest');

  return (
    <div>
      <PageHeader title={t('schemes.title')} subtitle={t('schemes.subtitle')} />

      <div className="card mb-6 p-4">
        <form onSubmit={onSearch} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('common.searchPlaceholder')}
              aria-label={t('common.search')}
            />
          </div>
          {voice.supported ? (
            <button
              type="button"
              className={`btn-secondary ${voice.listening ? 'border-red-300 bg-red-50 text-red-700' : ''}`}
              onClick={voice.listening ? voice.stop : voice.start}
              aria-label={t('common.voiceSearch')}
              title={t('common.voiceSearch')}
            >
              <Mic className={`h-4 w-4 ${voice.listening ? 'animate-pulse' : ''}`} />
            </button>
          ) : null}
          <button type="submit" className="btn-primary">{t('common.search')}</button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <SlidersHorizontal className="h-3.5 w-3.5" /> {t('common.filters')}
          </span>
          <select
            className="rounded-lg border border-earth-300 bg-white px-2.5 py-1.5 text-xs"
            value={filters.category}
            onChange={(event) => update({ category: event.target.value, page: '1' })}
            aria-label={t('common.category')}
          >
            <option value="">{t('common.all')} · {t('common.category')}</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>{category.name}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-earth-300 bg-white px-2.5 py-1.5 text-xs"
            value={filters.level}
            onChange={(event) => update({ level: event.target.value, page: '1' })}
            aria-label={t('common.level')}
          >
            <option value="">{t('common.all')} · {t('common.level')}</option>
            <option value="CENTRAL">{t('common.central')}</option>
            <option value="STATE">{t('common.stateLevel')}</option>
          </select>
          <select
            className="rounded-lg border border-earth-300 bg-white px-2.5 py-1.5 text-xs"
            value={filters.sort}
            onChange={(event) => update({ sort: event.target.value, page: '1' })}
            aria-label={t('common.sort')}
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>{t(sort.key)}</option>
            ))}
          </select>
          {hasFilters ? (
            <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-800" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> {t('common.clearFilters')}
            </button>
          ) : null}
          <span className="ml-auto text-xs text-slate-500">
            {data ? `${t('common.showing')} ${data.schemes.length} ${t('common.of')} ${data.pagination.total}` : ''}
          </span>
        </div>
      </div>

      {selected.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          <GitCompareArrows className="h-4 w-4" />
          <span>{selected.length} {t('schemes.selected')}. {selected.length < 2 ? t('schemes.compareHint') : ''}</span>
          <button
            type="button"
            className="btn-primary ml-auto py-1.5"
            disabled={selected.length < 2}
            onClick={() => navigate(`/compare?slugs=${selected.join(',')}`)}
          >
            {t('schemes.compare')}
          </button>
          <button type="button" className="btn-ghost py-1.5" onClick={() => setSelected([])}>{t('common.clearFilters')}</button>
        </div>
      ) : null}

      {loading ? (
        <Spinner label={t('common.loading')} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setParams(new URLSearchParams(params))} />
      ) : data && data.schemes.length === 0 ? (
        <EmptyState
          title={t('common.noResults')}
          action={<button type="button" className="btn-secondary" onClick={clearFilters}>{t('common.clearFilters')}</button>}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data?.schemes.map((scheme) => (
              <SchemeCard
                key={scheme.slug}
                scheme={scheme}
                selectable
                selected={selected.includes(scheme.slug)}
                onToggle={toggleCompare}
              />
            ))}
          </div>
          {data ? (
            <PaginationBar
              pagination={data.pagination}
              onPage={(page) => {
                update({ page: String(page) });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
