import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { api, queryString } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { DemoBadge, PageHeader, PaginationBar, Spinner, StatusBadge } from '../../components/ui';
import { formatDate } from '../../lib/format';
import type { AdminSchemeListResponse } from '../../types';

const STATUSES = ['DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'PUBLISHED', 'REJECTED', 'EXPIRED'] as const;

export function AdminSchemesPage() {
  const { language, t } = useApp();
  const [data, setData] = useState<AdminSchemeListResponse | null>(null);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<AdminSchemeListResponse>(`/admin/schemes${queryString({ language, status, q: appliedQuery, page, pageSize: 20 })}`)
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t('common.error')))
      .finally(() => setLoading(false));
  }, [language, status, appliedQuery, page, t]);

  return (
    <div>
      <PageHeader
        title={t('admin.schemes')}
        subtitle={t('schemes.subtitle')}
        actions={<Link to="/admin/schemes/new" className="btn-primary"><Plus className="h-4 w-4" /> {t('admin.newScheme')}</Link>}
      />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <form
          className="relative flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setAppliedQuery(query.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('common.search')} />
        </form>
        <select className="input sm:w-56" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">{t('common.all')} · {t('common.status')}</option>
          {STATUSES.map((item) => <option key={item} value={item}>{t(`status.${item}`)}</option>)}
        </select>
      </div>

      {data ? (
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          {Object.entries(data.countsByStatus).map(([key, value]) => (
            <span key={key} className="rounded-full bg-earth-100 px-2.5 py-1 font-medium text-slate-700">{key}: {value}</span>
          ))}
        </div>
      ) : null}

      {loading ? (
        <Spinner />
      ) : error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-earth-200 bg-white shadow-card">
            <table className="table-base min-w-[760px]">
              <thead>
                <tr>
                  <th>{t('admin.schemes')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.category')}</th>
                  <th>v</th>
                  <th>{t('common.updated')}</th>
                </tr>
              </thead>
              <tbody>
                {data?.schemes.map((scheme) => (
                  <tr key={scheme.id}>
                    <td>
                      <Link to={`/admin/schemes/${scheme.id}`} className="font-semibold text-brand-800 hover:underline">{scheme.title}</Link>
                      <span className="block text-xs text-slate-400">{scheme.slug}</span>
                      {scheme.isDemoData ? <DemoBadge /> : null}
                    </td>
                    <td><StatusBadge status={scheme.status} /></td>
                    <td className="text-xs">{scheme.category.name}</td>
                    <td className="text-xs">{scheme.version}</td>
                    <td className="text-xs">{formatDate(scheme.publishedAt ?? scheme.lastVerifiedAt, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data ? <PaginationBar pagination={data.pagination} onPage={setPage} /> : null}
        </>
      )}
    </div>
  );
}
