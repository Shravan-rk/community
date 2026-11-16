import { useEffect, useState, type SyntheticEvent } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { Badge, EmptyState, Modal, PageHeader, Spinner } from '../../components/ui';
import { formatDate, isAdmin } from '../../lib/format';
import type { Extraction, MonitoringJob, MonitoringSource, Pagination } from '../../types';

interface JobsResponse {
  jobs: MonitoringJob[];
  pagination: Pagination;
  countsByStatus: Record<string, number>;
}

interface ExtractionsResponse {
  extractions: Extraction[];
  pagination: Pagination;
  countsByReviewStatus: Record<string, number>;
}

export function AdminMonitoringPage() {
  const { language, t, user, addToast } = useApp();
  const [sources, setSources] = useState<MonitoringSource[]>([]);
  const [jobs, setJobs] = useState<JobsResponse | null>(null);
  const [extractions, setExtractions] = useState<ExtractionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<Extraction | null>(null);
  const [notes, setNotes] = useState('');
  const [overrides, setOverrides] = useState('');

  const admin = isAdmin(user?.role ?? 'CITIZEN');

  function loadAll() {
    setLoading(true);
    Promise.all([
      api.get<{ sources: MonitoringSource[] }>('/admin/monitoring/sources'),
      api.get<JobsResponse>('/admin/monitoring/jobs?pageSize=10'),
      api.get<ExtractionsResponse>('/admin/monitoring/extractions?status=PENDING&pageSize=20'),
    ])
      .then(([sourceResponse, jobResponse, extractionResponse]) => {
        setSources(sourceResponse.sources);
        setJobs(jobResponse);
        setExtractions(extractionResponse);
      })
      .catch((err: unknown) => addToast(err instanceof Error ? err.message : t('common.error'), 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSource(source: MonitoringSource) {
    setBusy(source.id);
    try {
      await api.post(`/admin/monitoring/sources/${source.id}/run`);
      addToast(t('admin.runNow'), 'success');
      loadAll();
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(null);
    }
  }

  function openReview(extraction: Extraction) {
    setReviewing(extraction);
    setNotes('');
    setOverrides('');
  }

  async function submitReview(event: SyntheticEvent, action: 'APPROVE' | 'REJECT') {
    event.preventDefault();
    if (!reviewing) return;
    let fields: unknown;
    if (action === 'APPROVE' && overrides.trim()) {
      try {
        fields = JSON.parse(overrides);
      } catch {
        addToast('Overrides must be valid JSON.', 'error');
        return;
      }
    }
    setBusy(reviewing.id);
    try {
      await api.post(`/admin/monitoring/extractions/${reviewing.id}/review`, {
        action,
        notes: notes.trim() || null,
        ...(fields ? { fields } : {}),
      });
      addToast(t('common.saved'), 'success');
      setReviewing(null);
      loadAll();
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('admin.monitoring')}
        subtitle="Demo-only extraction pipeline. Government sources are not fetched automatically."
        actions={<button type="button" className="btn-secondary" onClick={loadAll}><RefreshCw className="h-4 w-4" /> {t('common.retry')}</button>}
      />

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{t('admin.sources')}</h2>
        {loading && sources.length === 0 ? <Spinner /> : sources.length === 0 ? <EmptyState title={t('admin.noData')} /> : (
          <div className="grid gap-3 lg:grid-cols-2">
            {sources.map((source) => (
              <article key={source.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{source.name}</h3>
                  <Badge tone="bg-slate-100 text-slate-700">{source.sourceType}</Badge>
                  <Badge tone={source.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}>
                    {source.isActive ? t('admin.active') : t('admin.inactive')}
                  </Badge>
                </div>
                <p className="mt-1 break-all text-xs text-slate-500">{source.baseUrl}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {source.monitoring.canRun ? `Adapter: ${source.monitoring.adapter}` : source.monitoring.reason ?? 'Not runnable'}
                </p>
                <p className="text-xs text-slate-400">
                  {t('scheme.lastVerified')}: {formatDate(source.lastCheckedAt, language)}
                </p>
                {admin ? (
                  <button type="button" className="btn-secondary mt-3 py-1.5" onClick={() => runSource(source)} disabled={busy === source.id || !source.monitoring.canRun}>
                    <Play className="h-3.5 w-3.5" /> {busy === source.id ? t('common.loading') : t('admin.runNow')}
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{t('admin.jobs')}</h2>
        {!jobs || jobs.jobs.length === 0 ? <p className="text-sm text-slate-500">{t('admin.noData')}</p> : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-earth-200 bg-white">
              <table className="table-base min-w-[720px]">
                <thead><tr><th>{t('admin.sources')}</th><th>{t('common.status')}</th><th>Items</th><th>Extractions</th><th>{t('common.updated')}</th></tr></thead>
                <tbody>
                  {jobs.jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="text-xs">{job.source?.name ?? t('admin.noData')}</td>
                      <td><Badge tone={job.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : job.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}>{job.status}</Badge></td>
                      <td className="text-xs">{job.itemsFound}</td>
                      <td className="text-xs">{job.counts?.extractions ?? 0}</td>
                      <td className="text-xs">{formatDate(job.finishedAt ?? job.createdAt, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">Showing {jobs.jobs.length} of {jobs.pagination.total} jobs</p>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{t('admin.reviewQueue')}</h2>
        {!extractions || extractions.extractions.length === 0 ? <p className="text-sm text-slate-500">{t('admin.noData')}</p> : (
          <div className="space-y-3">
            {extractions.extractions.map((extraction) => (
              <article key={extraction.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="bg-amber-100 text-amber-900">{extraction.reviewStatus}</Badge>
                  <Badge tone="bg-slate-100 text-slate-600">{extraction.source?.name ?? '—'}</Badge>
                  <span className="text-xs text-slate-500">Confidence: {extraction.confidence ?? '—'} · {extraction.model ?? '—'}</span>
                </div>
                <p className="mt-2 break-all text-xs text-slate-500">{extraction.sourceUrl}</p>
                <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">{JSON.stringify(extraction.fields, null, 2)}</pre>
                {extraction.reviewStatus === 'PENDING' ? (
                  <button type="button" className="btn-primary mt-3 py-1.5" onClick={() => openReview(extraction)}>
                    {t('admin.approveExtraction')} / {t('admin.rejectExtraction')}
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      {reviewing ? (
        <Modal title={t('admin.reviewQueue')} onClose={() => setReviewing(null)}>
          <form onSubmit={(event) => submitReview(event, 'APPROVE')} className="space-y-4">
            <label className="block">
              <span className="label">{t('admin.reviewNotes')}</span>
              <textarea className="input min-h-20" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} />
            </label>
            <label className="block">
              <span className="label">{t('admin.overrideFields')}</span>
              <textarea className="input min-h-32 font-mono text-xs" value={overrides} onChange={(event) => setOverrides(event.target.value)} placeholder='{"titleEn":"...","department":"..."}' spellCheck={false} />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setReviewing(null)}>{t('common.cancel')}</button>
              <button type="button" className="btn-secondary text-red-700" disabled={busy === reviewing.id} onClick={(event) => submitReview(event, 'REJECT')}>
                {t('admin.rejectExtraction')}
              </button>
              <button type="submit" className="btn-primary" disabled={busy === reviewing.id}>
                {t('admin.approveExtraction')}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
