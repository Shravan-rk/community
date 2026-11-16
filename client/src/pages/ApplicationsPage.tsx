import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ExternalLink, Trash2 } from 'lucide-react';
import { api, ApiError, queryString } from '../lib/api';
import { useApp } from '../context/AppContext';
import { EmptyState, ErrorState, PageHeader, Spinner, StatusBadge } from '../components/ui';
import { formatDate } from '../lib/format';
import type { ApplicationRecord, ApplicationStatus } from '../types';

const CITIZEN_STATUSES: ApplicationStatus[] = ['DRAFT', 'SUBMITTED_OFFLINE', 'TRACKING', 'COMPLETED'];

export function ApplicationsPage() {
  const { language, t, addToast } = useApp();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ applications: ApplicationRecord[] }>(`/citizens/me/applications${queryString({ language })}`)
      .then((response) => setApplications(response.applications))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t('common.error')))
      .finally(() => setLoading(false));
  }, [language, t]);

  async function updateStatus(application: ApplicationRecord, status: ApplicationStatus) {
    try {
      const response = await api.patch<{ application: ApplicationRecord }>(`/citizens/me/applications/${application.id}`, { status });
      setApplications((current) => current.map((item) => (item.id === application.id ? response.application : item)));
      addToast(t('common.saved'), 'success');
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  async function remove(application: ApplicationRecord) {
    if (!window.confirm(t('applications.confirmDelete'))) return;
    try {
      await api.del(`/citizens/me/applications/${application.id}`);
      setApplications((current) => current.filter((item) => item.id !== application.id));
      addToast(t('common.saved'), 'success');
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title={t('applications.title')}
        subtitle={t('applications.subtitle')}
        actions={<Link to="/schemes" className="btn-primary">{t('applications.addFromScheme')}</Link>}
      />

      <p className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        {t('scheme.trackingDisclaimer')}
      </p>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : applications.length === 0 ? (
        <EmptyState
          title={t('applications.empty')}
          action={<Link to="/schemes" className="btn-primary">{t('applications.addFromScheme')}</Link>}
        />
      ) : (
        <div className="space-y-3">
          {applications.map((application) => (
            <article key={application.id} className="card p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={application.status} />
                    <span className="text-xs text-slate-500">
                      {t('common.updated')}: {formatDate(application.updatedAt, language)}
                    </span>
                  </div>
                  <h2 className="mt-2 font-bold text-slate-900">
                    <Link to={`/schemes/${application.scheme.slug}`} className="hover:text-brand-800">{application.scheme.title}</Link>
                  </h2>
                  <p className="text-xs text-slate-500">{application.scheme.department}</p>
                  {application.referenceNumber ? (
                    <p className="mt-2 text-xs text-slate-600">{t('applications.reference')}: <span className="font-mono">{application.referenceNumber}</span></p>
                  ) : null}
                  {application.notes ? <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{application.notes}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs font-medium text-slate-500">
                    <span className="sr-only">{t('applications.update')}</span>
                    <select
                      className="rounded-lg border border-earth-300 bg-white px-2 py-1.5 text-xs"
                      value={application.status}
                      onChange={(event) => updateStatus(application, event.target.value as ApplicationStatus)}
                    >
                      {CITIZEN_STATUSES.map((status) => <option key={status} value={status}>{t(`status.${status}`)}</option>)}
                    </select>
                  </label>
                  <Link to={`/schemes/${application.scheme.slug}`} className="btn-ghost py-1.5" aria-label={t('common.details')}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  {application.status === 'DRAFT' ? (
                    <button type="button" className="btn-ghost py-1.5 text-red-700" onClick={() => remove(application)} aria-label={t('applications.deleteDraft')}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 rounded-xl border border-earth-200 bg-white p-4 text-xs text-slate-500">
        <ClipboardList className="h-4 w-4" /> {t('scheme.tracked')}
      </div>
    </div>
  );
}
