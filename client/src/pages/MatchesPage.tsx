import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { api, queryString } from '../lib/api';
import { useApp } from '../context/AppContext';
import { SchemeCard } from '../components/SchemeCard';
import { Disclaimer, EmptyState, ErrorState, PageHeader, PaginationBar, Spinner } from '../components/ui';
import type { TranslationKey } from '../i18n';
import type { Assessment, MatchesResponse } from '../types';

const FILTERS: Array<{ value: Assessment | 'ALL'; key: TranslationKey }> = [
  { value: 'LIKELY_ELIGIBLE', key: 'assessment.LIKELY_ELIGIBLE' },
  { value: 'NEEDS_INFORMATION', key: 'assessment.NEEDS_INFORMATION' },
  { value: 'NOT_ELIGIBLE', key: 'assessment.NOT_ELIGIBLE' },
  { value: 'NOT_ASSESSABLE', key: 'assessment.NOT_ASSESSABLE' },
  { value: 'ALL', key: 'common.all' },
];

export function MatchesPage() {
  const { language, t } = useApp();
  const [data, setData] = useState<MatchesResponse | null>(null);
  const [filter, setFilter] = useState<Assessment | 'ALL'>('LIKELY_ELIGIBLE');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<MatchesResponse>(`/citizens/me/eligible-schemes${queryString({ language, filter, page, pageSize: 12 })}`)
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t('common.error')))
      .finally(() => setLoading(false));
  }, [language, filter, page, t]);

  return (
    <div>
      <PageHeader
        title={t('matches.title')}
        subtitle={t('matches.subtitle')}
        actions={<Link to="/profile" className="btn-secondary"><SlidersHorizontal className="h-4 w-4" /> {t('nav.profile')}</Link>}
      />

      {data ? (
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['LIKELY_ELIGIBLE', 'NEEDS_INFORMATION', 'NOT_ELIGIBLE', 'NOT_ASSESSABLE'] as Assessment[]).map((assessment) => (
            <button
              key={assessment}
              type="button"
              onClick={() => { setFilter(assessment); setPage(1); }}
              className={`rounded-xl border px-3 py-3 text-left text-xs transition ${filter === assessment ? 'border-brand-600 bg-brand-50' : 'border-earth-200 bg-white hover:border-brand-300'}`}
            >
              <span className="block text-lg font-extrabold text-brand-900">{data.summary.countsByAssessment[assessment] ?? 0}</span>
              <span className="text-slate-600">{t(`assessment.${assessment}`)}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => { setFilter(item.value); setPage(1); }}
            className={`chip ${filter === item.value ? 'bg-brand-700 text-white' : 'bg-earth-100 text-slate-700'}`}
          >
            {t(item.key)}
          </button>
        ))}
      </div>

      {data && !data.profile.onboardingCompleted ? (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t('matches.missing')}
          <Link to="/profile" className="ml-auto font-semibold underline">{t('matches.startProfile')}</Link>
        </div>
      ) : null}

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : !data || data.schemes.length === 0 ? (
        <EmptyState
          title={t('matches.empty')}
          action={<Link to="/profile" className="btn-primary">{t('matches.startProfile')}</Link>}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.schemes.map((scheme) => (
              <SchemeCard
                key={scheme.slug}
                scheme={scheme}
                assessment={{ assessment: scheme.eligibility.assessment, label: scheme.eligibility.label }}
              />
            ))}
          </div>
          <PaginationBar pagination={data.pagination} onPage={setPage} />
        </>
      )}

      <div className="mt-6"><Disclaimer /></div>
    </div>
  );
}
