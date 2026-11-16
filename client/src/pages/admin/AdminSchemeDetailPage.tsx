import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ExternalLink, Pencil, Send, ShieldCheck, XCircle } from 'lucide-react';
import { api, ApiError, queryString } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import {
  Badge,
  DemoBadge,
  DemoNotice,
  Disclaimer,
  PageHeader,
  Spinner,
  StatusBadge,
} from '../../components/ui';
import { formatDate, isAdmin } from '../../lib/format';
import type { AdminSchemeDetail, Language } from '../../types';

const TRANSLATION_FIELDS = [
  ['title', 'Title'],
  ['summary', 'Summary'],
  ['benefits', 'Benefits'],
  ['eligibility', 'Eligibility'],
  ['description', 'Description'],
  ['applicationProcess', 'Application process'],
] as const;

export function AdminSchemeDetailPage() {
  const { id = '' } = useParams();
  const { language, t, user, addToast } = useApp();
  const [scheme, setScheme] = useState<AdminSchemeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyAction, setVerifyAction] = useState('APPROVED');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState<Language>('kn');
  const [translation, setTranslation] = useState<Record<string, string>>({});
  const [quality, setQuality] = useState('DRAFT');
  const [translationBusy, setTranslationBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await api.get<{ scheme: AdminSchemeDetail }>(`/admin/schemes/${id}${queryString({ language })}`);
      setScheme(response.scheme);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, language]);

  async function runAction(path: string, body?: unknown) {
    setBusy(true);
    try {
      const response = await api.post<{ scheme: AdminSchemeDetail }>(`/admin/schemes/${id}/${path}${queryString({ language })}`, body);
      setScheme(response.scheme);
      addToast(t('common.saved'), 'success');
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function submitVerification(event: FormEvent) {
    event.preventDefault();
    await runAction('verify', { action: verifyAction, notes: verifyNotes || null, sourceEvidenceUrl: evidenceUrl || null });
    setVerifyNotes('');
    setEvidenceUrl('');
  }

  async function loadTranslation() {
    try {
      const response = await api.get<{ scheme: AdminSchemeDetail }>(
        `/admin/schemes/${id}${queryString({ language: translationLanguage })}`,
      );
      const detail = response.scheme;
      setTranslation({
        title: detail.title ?? '',
        summary: detail.summary ?? '',
        benefits: detail.benefits ?? '',
        eligibility: detail.eligibility ?? '',
        description: detail.description ?? '',
        applicationProcess: detail.applicationProcess ?? '',
      });
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  async function saveTranslation(event: FormEvent) {
    event.preventDefault();
    setTranslationBusy(true);
    try {
      const fields = Object.fromEntries(Object.entries(translation).filter(([, value]) => value.trim() !== ''));
      await api.put(`/admin/schemes/${id}/translations/${translationLanguage}`, { fields, quality, provider: 'HUMAN' });
      addToast(t('common.saved'), 'success');
      await load();
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setTranslationBusy(false);
    }
  }

  if (loading) return <Spinner label={t('common.loading')} />;
  if (error || !scheme) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error ?? t('common.error')}</p>;

  const canPublish = isAdmin(user?.role ?? 'CITIZEN');

  return (
    <div className="space-y-5">
      <Link to="/admin/schemes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800">
        <ArrowLeft className="h-4 w-4" /> {t('admin.schemes')}
      </Link>

      <PageHeader
        title={scheme.title}
        subtitle={scheme.department}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to={`/schemes/${scheme.slug}`} className="btn-secondary"><ExternalLink className="h-4 w-4" /> {t('common.details')}</Link>
            <Link to={`/admin/schemes/${scheme.id}/edit`} className="btn-primary"><Pencil className="h-4 w-4" /> {t('admin.editScheme')}</Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={scheme.status} />
        <Badge tone="bg-slate-100 text-slate-700">v{scheme.version}</Badge>
        <Badge tone="bg-slate-100 text-slate-700">{scheme.slug}</Badge>
        {scheme.isDemoData ? <DemoBadge /> : null}
        <span className="text-xs text-slate-500">{t('scheme.lastVerified')}: {formatDate(scheme.lastVerifiedAt, language)}</span>
      </div>

      {scheme.isDemoData ? <DemoNotice /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900"><ShieldCheck className="h-4 w-4 text-brand-700" /> {t('admin.verify')}</h2>
          <form onSubmit={submitVerification} className="space-y-3">
            <label className="block">
              <span className="label">{t('common.status')}</span>
              <select className="input" value={verifyAction} onChange={(event) => setVerifyAction(event.target.value)}>
                <option value="APPROVED">{t('status.APPROVED')}</option>
                <option value="REJECTED">{t('status.REJECTED')}</option>
                <option value="REQUEST_CHANGES">{t('admin.requestChanges')}</option>
              </select>
            </label>
            <label className="block">
              <span className="label">{t('admin.reviewNotes')}</span>
              <textarea className="input min-h-20" value={verifyNotes} onChange={(event) => setVerifyNotes(event.target.value)} maxLength={2000} />
            </label>
            <label className="block">
              <span className="label">{t('admin.evidenceUrl')}</span>
              <input type="url" className="input" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary" disabled={busy || scheme.status !== 'PENDING_VERIFICATION'}>
                <CheckCircle2 className="h-4 w-4" /> {t('admin.verify')}
              </button>
              {canPublish && scheme.status === 'VERIFIED' ? (
                <button type="button" className="btn-primary" disabled={busy} onClick={() => runAction('publish')}>
                  <CheckCircle2 className="h-4 w-4" /> {t('admin.publish')}
                </button>
              ) : null}
              {canPublish && scheme.status === 'PUBLISHED' ? (
                <button type="button" className="btn-secondary text-red-700" disabled={busy} onClick={() => runAction('expire')}>
                  <XCircle className="h-4 w-4" /> {t('admin.expire')}
                </button>
              ) : null}
            </div>
            {scheme.status !== 'PENDING_VERIFICATION' ? (
              <p className="text-xs text-slate-500">Verification actions apply only to schemes pending verification.</p>
            ) : null}
          </form>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-bold text-slate-900">{t('admin.analytics')}</h2>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-earth-50 p-3"><dt className="text-xs text-slate-500">{t('nav.saved')}</dt><dd className="text-lg font-bold">{scheme.admin.counts.savedBy}</dd></div>
            <div className="rounded-lg bg-earth-50 p-3"><dt className="text-xs text-slate-500">{t('nav.applications')}</dt><dd className="text-lg font-bold">{scheme.admin.counts.applications}</dd></div>
            <div className="rounded-lg bg-earth-50 p-3"><dt className="text-xs text-slate-500">{t('nav.notifications')}</dt><dd className="text-lg font-bold">{scheme.admin.counts.notifications}</dd></div>
          </dl>
          <div className="mt-4">
            <Disclaimer />
          </div>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900"><Send className="h-4 w-4 text-brand-700" /> {t('admin.translation')}</h2>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="label">{t('nav.language')}</span>
            <select className="input" value={translationLanguage} onChange={(event) => setTranslationLanguage(event.target.value as Language)}>
              <option value="kn">ಕನ್ನಡ</option>
              <option value="hi">हिन्दी</option>
            </select>
          </label>
          <button type="button" className="btn-secondary" onClick={loadTranslation}>{t('common.loading')}</button>
          <label className="block">
            <span className="label">{t('admin.translationQuality')}</span>
            <select className="input" value={quality} onChange={(event) => setQuality(event.target.value)}>
              <option value="DRAFT">DRAFT</option>
              <option value="REVIEWED">REVIEWED</option>
              <option value="VERIFIED">VERIFIED</option>
            </select>
          </label>
        </div>
        <form onSubmit={saveTranslation} className="grid gap-3 sm:grid-cols-2">
          {TRANSLATION_FIELDS.map(([key, label]) => (
            <label key={key} className="block">
              <span className="label">{label}</span>
              <textarea className="input min-h-16" value={translation[key] ?? ''} onChange={(event) => setTranslation({ ...translation, [key]: event.target.value })} />
            </label>
          ))}
          <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit" disabled={translationBusy}>
            {translationBusy ? t('common.saving') : t('admin.saveTranslation')}
          </button>
        </form>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-bold text-slate-900">{t('admin.audit')}</h2>
          {scheme.admin.verifications.length === 0 ? <p className="text-sm text-slate-500">{t('admin.noData')}</p> : (
            <ul className="space-y-3">
              {scheme.admin.verifications.map((record) => (
                <li key={record.id} className="rounded-lg border border-earth-200 p-3 text-xs">
                  <p className="font-semibold text-slate-800">{record.action} · {record.verifier?.fullName ?? '—'}</p>
                  <p className="text-slate-500">{formatDate(record.createdAt, language)}</p>
                  {record.notes ? <p className="mt-1 text-slate-600">{record.notes}</p> : null}
                  {record.sourceEvidenceUrl ? (
                    <a href={record.sourceEvidenceUrl} target="_blank" rel="noreferrer noopener" className="mt-1 inline-block font-semibold text-brand-800 underline">Evidence</a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-bold text-slate-900">Versions</h2>
          {scheme.admin.versions.length === 0 ? <p className="text-sm text-slate-500">{t('admin.noData')}</p> : (
            <ul className="space-y-2 text-xs">
              {scheme.admin.versions.map((version) => (
                <li key={version.id} className="flex items-start justify-between gap-3 border-b border-earth-100 pb-2">
                  <div>
                    <p className="font-semibold text-slate-800">v{version.version} — {version.changeSummary}</p>
                    <p className="text-slate-500">{version.createdBy?.fullName ?? '—'} · {formatDate(version.createdAt, language)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
