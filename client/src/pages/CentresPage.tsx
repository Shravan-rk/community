import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, MapPin, MessageSquarePlus, Phone, Search, ShieldCheck } from 'lucide-react';
import { api, ApiError, queryString } from '../lib/api';
import { useApp } from '../context/AppContext';
import {
  Badge,
  DemoNotice,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  Spinner,
  StatusBadge,
} from '../components/ui';
import { formatDate } from '../lib/format';
import type { AssistanceCentre, AssistanceRequest, Pagination } from '../types';

interface CentresResponse {
  centres: AssistanceCentre[];
  districts: string[];
  pagination: Pagination;
}

const CENTRE_TYPES = ['CSC', 'GRAMA_PANCHAYAT', 'GOVERNMENT_OFFICE', 'NGO'] as const;

export function CentresPage() {
  const { language, user, t, addToast } = useApp();
  const [centres, setCentres] = useState<AssistanceCentre[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [district, setDistrict] = useState('');
  const [type, setType] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [chosenCentre, setChosenCentre] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<CentresResponse>(`/assistance-centres${queryString({ district, type, q: query, pageSize: 60 })}`)
      .then((response) => {
        setCentres(response.centres);
        setDistricts(response.districts);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t('common.error')))
      .finally(() => setLoading(false));
  }, [district, type, query, t]);

  useEffect(() => {
    if (!user) {
      setRequests([]);
      return;
    }
    api
      .get<{ requests: AssistanceRequest[] }>('/assistance-requests/me')
      .then((response) => setRequests(response.requests))
      .catch(() => undefined);
  }, [user]);

  function openRequest(centreId?: string) {
    if (!user) return;
    setChosenCentre(centreId ?? '');
    setSubject('');
    setDescription('');
    setContactPhone('');
    setOpen(true);
  }

  async function submitRequest(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await api.post<{ request: AssistanceRequest }>('/assistance-requests', {
        centreId: chosenCentre || null,
        subject,
        description,
        contactPhone: contactPhone.trim() || null,
      });
      setRequests((current) => [response.request, ...current]);
      setOpen(false);
      addToast(t('centres.requestSent'), 'success');
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t('centres.title')}
        subtitle={t('centres.subtitle')}
        actions={
          user ? (
            <button type="button" className="btn-primary" onClick={() => openRequest()}>
              <MessageSquarePlus className="h-4 w-4" /> {t('centres.requestHelp')}
            </button>
          ) : (
            <Link to="/login" className="btn-primary">{t('nav.login')}</Link>
          )
        }
      />

      <DemoNotice>{t('centres.demoNotice')}</DemoNotice>

      <div className="my-5 grid gap-3 rounded-2xl border border-earth-200 bg-white p-4 sm:grid-cols-3">
        <label className="block">
          <span className="label">{t('centres.district')}</span>
          <select className="input" value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="">{t('common.all')}</option>
            {districts.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">{t('centres.type')}</span>
          <select className="input" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">{t('common.all')}</option>
            {CENTRE_TYPES.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">{t('common.search')}</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('centres.address')} />
          </span>
        </label>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : centres.length === 0 ? (
        <EmptyState title={t('common.noResults')} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {centres.map((centre) => (
            <article key={centre.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="bg-brand-50 text-brand-800">{centre.type.replaceAll('_', ' ')}</Badge>
                {centre.name.startsWith('Demo') ? <Badge tone="bg-amber-100 text-amber-900">{t('common.demo')}</Badge> : null}
                {centre.verifiedAt ? (
                  <Badge tone="bg-emerald-100 text-emerald-800"><ShieldCheck className="mr-1 inline h-3 w-3" />{t('status.VERIFIED')}</Badge>
                ) : null}
              </div>
              <h2 className="mt-2 font-bold text-slate-900">{centre.name}</h2>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {centre.address}, {centre.taluk ? `${centre.taluk}, ` : ''}{centre.district}
              </p>
              {centre.openingHours ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" /> {centre.openingHours}</p>
              ) : null}
              {centre.phone ? (
                <a href={`tel:${centre.phone}`} className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand-800">
                  <Phone className="h-3.5 w-3.5" /> {centre.phone}
                </a>
              ) : null}
              {user ? (
                <button type="button" className="btn-secondary mt-4 w-full" onClick={() => openRequest(centre.id)}>
                  {t('centres.requestHelp')}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {user ? (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold text-brand-900">{t('centres.myRequests')}</h2>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-500">{t('centres.noRequests')}</p>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => (
                <div key={request.id} className="card flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{request.subject}</p>
                    <p className="text-xs text-slate-500">
                      {request.centre?.name ?? '—'} · {formatDate(request.createdAt, language)}
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {open ? (
        <Modal title={t('centres.requestHelp')} onClose={() => setOpen(false)}>
          <form onSubmit={submitRequest} className="space-y-4">
            <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">{t('scheme.trackingDisclaimer')}</p>
            <label className="block">
              <span className="label">{t('centres.chooseCentre')}</span>
              <select className="input" value={chosenCentre} onChange={(event) => setChosenCentre(event.target.value)}>
                <option value="">{t('common.optional')}</option>
                {centres.map((centre) => (
                  <option key={centre.id} value={centre.id}>{centre.name} — {centre.district}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">{t('centres.subject')}</span>
              <input className="input" value={subject} onChange={(event) => setSubject(event.target.value)} required minLength={5} maxLength={160} />
            </label>
            <label className="block">
              <span className="label">{t('centres.description')}</span>
              <textarea className="input min-h-28" value={description} onChange={(event) => setDescription(event.target.value)} required minLength={10} maxLength={2000} />
            </label>
            <label className="block">
              <span className="label">{t('centres.contactPhone')}</span>
              <input className="input" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} maxLength={20} />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn-primary" disabled={busy}>{busy ? t('common.submitting') : t('common.submit')}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
