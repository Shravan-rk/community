import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { api, queryString } from '../lib/api';
import { useApp } from '../context/AppContext';
import { DemoBadge, Disclaimer, EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';
import type { SchemeSummary } from '../types';

type CompareScheme = SchemeSummary & { requiredDocuments: string[] };

interface CompareResponse {
  schemes: CompareScheme[];
  missingSlugs: string[];
  comparedCount: number;
}

export function ComparePage() {
  const { language, t } = useApp();
  const [params] = useSearchParams();
  const slugs = (params.get('slugs') ?? '').split(',').map((slug) => slug.trim()).filter(Boolean);
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slugs.length < 2) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .get<CompareResponse>(`/schemes/compare${queryString({ slugs: slugs.join(','), language })}`)
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t('common.error')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, language, t]);

  if (loading) return <Spinner label={t('common.loading')} />;
  if (slugs.length < 2) {
    return (
      <EmptyState
        title={t('common.noResults')}
        body={t('schemes.compareHint')}
        action={<Link to="/schemes" className="btn-primary">{t('nav.schemes')}</Link>}
      />
    );
  }
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  const schemes = data?.schemes ?? [];
  if (schemes.length === 0) return <EmptyState title={t('common.noResults')} />;

  const rows: Array<{ label: string; render: (scheme: CompareScheme) => React.ReactNode }> = [
    { label: t('common.department'), render: (scheme) => scheme.department },
    { label: t('common.category'), render: (scheme) => scheme.category.name },
    { label: t('common.level'), render: (scheme) => (scheme.level === 'CENTRAL' ? t('common.central') : t('common.stateLevel')) },
    { label: t('scheme.benefits'), render: (scheme) => scheme.benefits ?? '—' },
    { label: t('scheme.eligibility'), render: (scheme) => scheme.eligibility ?? '—' },
    {
      label: t('scheme.requiredDocuments'),
      render: (scheme) =>
        scheme.requiredDocuments.length > 0 ? (
          <ul className="list-disc space-y-1 pl-4">
            {scheme.requiredDocuments.map((document) => <li key={document}>{document}</li>)}
          </ul>
        ) : (
          '—'
        ),
    },
    {
      label: t('scheme.officialLinks'),
      render: (scheme) =>
        scheme.officialUrl ? (
          <a className="font-semibold text-brand-800 underline" href={scheme.officialUrl} target="_blank" rel="noreferrer noopener">
            {t('scheme.officialSource')}
          </a>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('schemes.compare')}
        subtitle={`${data?.comparedCount ?? schemes.length} ${t('nav.schemes').toLowerCase()}`}
        actions={
          <div className="flex gap-2">
            <Link to="/schemes" className="btn-secondary"><ArrowLeft className="h-4 w-4" /> {t('common.back')}</Link>
            <button type="button" className="btn-secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        }
      />

      {data && data.missingSlugs.length > 0 ? (
        <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {data.missingSlugs.join(', ')} — {t('scheme.notFound')}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-earth-200 bg-white shadow-card">
        <table className="table-base min-w-[720px]">
          <thead>
            <tr>
              <th className="w-40">{t('common.details')}</th>
              {schemes.map((scheme) => (
                <th key={scheme.slug} className="min-w-56 align-top">
                  <Link to={`/schemes/${scheme.slug}`} className="text-brand-900 hover:underline">{scheme.title}</Link>
                  {scheme.isDemoData ? <div className="mt-1"><DemoBadge /></div> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="bg-earth-50 text-left align-top text-xs uppercase tracking-wide text-slate-500">{row.label}</th>
                {schemes.map((scheme) => (
                  <td key={scheme.slug} className="align-top text-sm leading-6 text-slate-700">{row.render(scheme)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5"><Disclaimer /></div>
    </div>
  );
}
