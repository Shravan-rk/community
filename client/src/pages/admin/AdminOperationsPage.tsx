import { useEffect, useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { api, ApiError, queryString } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import {
  Badge,
  EmptyState,
  Modal,
  PageHeader,
  PaginationBar,
  Spinner,
  StatusBadge,
} from '../../components/ui';
import { formatDate, isAdmin } from '../../lib/format';
import type { TranslationKey } from '../../i18n';
import type {
  ApplicationRecord,
  AssistanceCentre,
  AssistanceRequest,
  Feedback,
  Pagination,
  User,
} from '../../types';

type Tab = 'applications' | 'assistance' | 'feedback' | 'centres';

interface AdminApplication extends ApplicationRecord {
  user: Pick<User, 'id' | 'fullName' | 'email' | 'phone' | 'preferredLanguage'>;
}

interface AdminRequest extends AssistanceRequest {
  user: Pick<User, 'id' | 'fullName' | 'email' | 'phone' | 'preferredLanguage'>;
}

const TABS: Array<{ key: Tab; label: TranslationKey }> = [
  { key: 'applications', label: 'admin.applicationsTab' },
  { key: 'assistance', label: 'admin.assistanceTab' },
  { key: 'feedback', label: 'admin.feedbackTab' },
  { key: 'centres', label: 'admin.centreName' },
];

const APPLICATION_STATUSES = ['DRAFT', 'ASSISTED', 'SUBMITTED_OFFLINE', 'TRACKING', 'COMPLETED', 'REJECTED'] as const;
const REQUEST_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
const FEEDBACK_STATUSES = ['NEW', 'REVIEWED', 'RESOLVED'] as const;
const CENTRE_TYPES = ['CSC', 'GRAMA_PANCHAYAT', 'GOVERNMENT_OFFICE', 'NGO'] as const;

export function AdminOperationsPage() {
  const { language, t, user, addToast } = useApp();
  const [tab, setTab] = useState<Tab>('applications');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<{ items: AdminApplication[]; pagination: Pagination } | null>(null);
  const [requests, setRequests] = useState<{ items: AdminRequest[]; pagination: Pagination } | null>(null);
  const [feedback, setFeedback] = useState<{ items: Feedback[]; pagination: Pagination } | null>(null);
  const [centres, setCentres] = useState<AssistanceCentre[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<AdminApplication | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(null);
  const [appStatus, setAppStatus] = useState('');
  const [appReference, setAppReference] = useState('');
  const [appNotes, setAppNotes] = useState('');
  const [requestStatus, setRequestStatus] = useState('');
  const [assignee, setAssignee] = useState('');
  const [centreOpen, setCentreOpen] = useState(false);
  const [centreForm, setCentreForm] = useState({
    name: '',
    type: 'CSC',
    address: '',
    district: '',
    taluk: '',
    village: '',
    phone: '',
    openingHours: '',
  });
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    const common = { language, page, pageSize: 20, q: appliedQuery };
    const task =
      tab === 'applications'
        ? api.get<{ applications: AdminApplication[]; pagination: Pagination }>(`/admin/applications${queryString(common)}`)
            .then((response) => setApplications({ items: response.applications, pagination: response.pagination }))
        : tab === 'assistance'
          ? api.get<{ requests: AdminRequest[]; pagination: Pagination }>(`/admin/assistance-requests${queryString(common)}`)
              .then((response) => setRequests({ items: response.requests, pagination: response.pagination }))
          : tab === 'feedback'
            ? api.get<{ feedback: Feedback[]; pagination: Pagination }>(`/admin/feedback${queryString(common)}`)
                .then((response) => setFeedback({ items: response.feedback, pagination: response.pagination }))
            : api.get<{ centres: AssistanceCentre[] }>(`/admin/centres${queryString({ q: appliedQuery })}`)
                .then((response) => setCentres(response.centres));
    task
      .catch((err: unknown) => addToast(err instanceof Error ? err.message : t('common.error'), 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, appliedQuery, language]);

  function changeTab(next: Tab) {
    setTab(next);
    setPage(1);
  }

  function openApplication(application: AdminApplication) {
    setSelectedApplication(application);
    setAppStatus(application.status);
    setAppReference(application.referenceNumber ?? '');
    setAppNotes(application.notes ?? '');
  }

  async function saveApplication(event: FormEvent) {
    event.preventDefault();
    if (!selectedApplication) return;
    setBusy(true);
    try {
      await api.patch(`/admin/applications/${selectedApplication.id}`, {
        status: appStatus,
        referenceNumber: appReference.trim() || null,
        notes: appNotes.trim() || null,
      });
      addToast(t('common.saved'), 'success');
      setSelectedApplication(null);
      load();
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  function openRequest(request: AdminRequest) {
    setSelectedRequest(request);
    setRequestStatus(request.status);
    setAssignee(request.assignedTo?.id ?? '');
  }

  async function saveRequest(event: FormEvent) {
    event.preventDefault();
    if (!selectedRequest) return;
    setBusy(true);
    try {
      await api.patch(`/admin/assistance-requests/${selectedRequest.id}`, {
        status: requestStatus,
        assignedToId: assignee.trim() || null,
      });
      addToast(t('common.saved'), 'success');
      setSelectedRequest(null);
      load();
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function updateFeedback(item: Feedback, status: string) {
    try {
      await api.patch(`/admin/feedback/${item.id}`, { status });
      addToast(t('common.saved'), 'success');
      load();
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  async function createCentre(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post('/admin/centres', {
        ...centreForm,
        taluk: centreForm.taluk || null,
        village: centreForm.village || null,
        phone: centreForm.phone || null,
        openingHours: centreForm.openingHours || null,
      });
      addToast(t('common.saved'), 'success');
      setCentreOpen(false);
      setCentreForm({ name: '', type: 'CSC', address: '', district: '', taluk: '', village: '', phone: '', openingHours: '' });
      load();
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t('admin.operations')}
        subtitle={t('schemes.subtitle')}
        actions={
          tab === 'centres' && isAdmin(user?.role ?? 'CITIZEN') ? (
            <button type="button" className="btn-primary" onClick={() => setCentreOpen(true)}>{t('admin.createCentre')}</button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => changeTab(item.key)}
            className={`chip ${tab === item.key ? 'bg-brand-700 text-white' : 'bg-earth-100 text-slate-700'}`}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      {tab !== 'centres' ? (
        <form
          className="relative mb-4"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setAppliedQuery(query.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('common.search')} />
        </form>
      ) : null}

      {loading ? (
        <Spinner />
      ) : tab === 'applications' ? (
        !applications || applications.items.length === 0 ? <EmptyState title={t('admin.noData')} /> : (
          <div className="space-y-3">
            {applications.items.map((application) => (
              <article key={application.id} className="card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={application.status} />
                    <span className="text-xs text-slate-500">{application.user.fullName} · {application.user.email}</span>
                  </div>
                  <p className="mt-1 font-semibold text-slate-900">{application.scheme.title}</p>
                  {application.referenceNumber ? <p className="text-xs text-slate-500">Ref: {application.referenceNumber}</p> : null}
                </div>
                <button type="button" className="btn-secondary py-1.5" onClick={() => openApplication(application)}>{t('admin.saveStatus')}</button>
              </article>
            ))}
            <PaginationBar pagination={applications.pagination} onPage={setPage} />
          </div>
        )
      ) : tab === 'assistance' ? (
        !requests || requests.items.length === 0 ? <EmptyState title={t('admin.noData')} /> : (
          <div className="space-y-3">
            {requests.items.map((request) => (
              <article key={request.id} className="card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={request.status} />
                    <span className="text-xs text-slate-500">{request.user.fullName}</span>
                  </div>
                  <p className="mt-1 font-semibold text-slate-900">{request.subject}</p>
                  <p className="text-xs text-slate-500">{request.centre?.name ?? '—'} · {formatDate(request.createdAt, language)}</p>
                </div>
                <button type="button" className="btn-secondary py-1.5" onClick={() => openRequest(request)}>{t('admin.saveStatus')}</button>
              </article>
            ))}
            <PaginationBar pagination={requests.pagination} onPage={setPage} />
          </div>
        )
      ) : tab === 'feedback' ? (
        !feedback || feedback.items.length === 0 ? <EmptyState title={t('admin.noData')} /> : (
          <div className="space-y-3">
            {feedback.items.map((item) => (
              <article key={item.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="bg-slate-100 text-slate-700">★ {item.rating ?? '—'}</Badge>
                  <span className="text-xs text-slate-500">{item.user?.fullName ?? '—'}</span>
                  <span className="ml-auto text-xs text-slate-400">{formatDate(item.createdAt, language)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{item.message}</p>
                {item.scheme ? <p className="mt-1 text-xs text-slate-500">{item.scheme.titleKn ?? item.scheme.titleEn}</p> : null}
                <select className="mt-2 rounded-lg border border-earth-300 bg-white px-2 py-1 text-xs" value={item.status} onChange={(event) => updateFeedback(item, event.target.value)}>
                  {FEEDBACK_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </article>
            ))}
            <PaginationBar pagination={feedback.pagination} onPage={setPage} />
          </div>
        )
      ) : centres.length === 0 ? (
        <EmptyState title={t('admin.noData')} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {centres.map((centre) => (
            <article key={centre.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="bg-brand-50 text-brand-800">{centre.type.replaceAll('_', ' ')}</Badge>
                <Badge tone={centre.verifiedAt ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}>
                  {centre.verifiedAt ? t('status.VERIFIED') : t('common.demo')}
                </Badge>
              </div>
              <p className="mt-2 font-semibold text-slate-900">{centre.name}</p>
              <p className="text-xs text-slate-500">{centre.address}, {centre.district}</p>
            </article>
          ))}
        </div>
      )}

      {selectedApplication ? (
        <Modal title={t('admin.applicationsTab')} onClose={() => setSelectedApplication(null)}>
          <form onSubmit={saveApplication} className="space-y-3">
            <label className="block">
              <span className="label">{t('common.status')}</span>
              <select className="input" value={appStatus} onChange={(event) => setAppStatus(event.target.value)}>
                {APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{t(`status.${status}`)}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">{t('applications.reference')}</span>
              <input className="input" value={appReference} onChange={(event) => setAppReference(event.target.value)} maxLength={120} />
            </label>
            <label className="block">
              <span className="label">{t('common.notes')}</span>
              <textarea className="input min-h-24" value={appNotes} onChange={(event) => setAppNotes(event.target.value)} maxLength={2000} />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setSelectedApplication(null)}>{t('common.cancel')}</button>
              <button type="submit" className="btn-primary" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {selectedRequest ? (
        <Modal title={t('admin.assistanceTab')} onClose={() => setSelectedRequest(null)}>
          <form onSubmit={saveRequest} className="space-y-3">
            <label className="block">
              <span className="label">{t('common.status')}</span>
              <select className="input" value={requestStatus} onChange={(event) => setRequestStatus(event.target.value)}>
                {REQUEST_STATUSES.map((status) => <option key={status} value={status}>{t(`status.${status}`)}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">{t('admin.assignTo')}</span>
              <input className="input" value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="User ID" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setSelectedRequest(null)}>{t('common.cancel')}</button>
              <button type="submit" className="btn-primary" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {centreOpen ? (
        <Modal title={t('admin.createCentre')} onClose={() => setCentreOpen(false)}>
          <form onSubmit={createCentre} className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="label">{t('admin.centreName')}</span>
              <input className="input" value={centreForm.name} onChange={(event) => setCentreForm({ ...centreForm, name: event.target.value })} required minLength={2} maxLength={160} />
            </label>
            <label className="block">
              <span className="label">{t('admin.centreType')}</span>
              <select className="input" value={centreForm.type} onChange={(event) => setCentreForm({ ...centreForm, type: event.target.value })}>
                {CENTRE_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">{t('admin.centreDistrict')}</span>
              <input className="input" value={centreForm.district} onChange={(event) => setCentreForm({ ...centreForm, district: event.target.value })} required minLength={2} maxLength={80} />
            </label>
            <label className="block sm:col-span-2">
              <span className="label">{t('admin.centreAddress')}</span>
              <input className="input" value={centreForm.address} onChange={(event) => setCentreForm({ ...centreForm, address: event.target.value })} required minLength={3} maxLength={400} />
            </label>
            <label className="block">
              <span className="label">Taluk</span>
              <input className="input" value={centreForm.taluk} onChange={(event) => setCentreForm({ ...centreForm, taluk: event.target.value })} />
            </label>
            <label className="block">
              <span className="label">Village</span>
              <input className="input" value={centreForm.village} onChange={(event) => setCentreForm({ ...centreForm, village: event.target.value })} />
            </label>
            <label className="block">
              <span className="label">{t('admin.centrePhone')}</span>
              <input className="input" value={centreForm.phone} onChange={(event) => setCentreForm({ ...centreForm, phone: event.target.value })} />
            </label>
            <label className="block">
              <span className="label">{t('centres.hours')}</span>
              <input className="input" value={centreForm.openingHours} onChange={(event) => setCentreForm({ ...centreForm, openingHours: event.target.value })} />
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={() => setCentreOpen(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn-primary" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</button>
            </div>
          </form>
        </Modal>
      ) : null}

    </div>
  );
}
