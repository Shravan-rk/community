import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  Landmark,
  Mic2,
  Send,
  ShieldCheck,
  Square,
  Target,
  XCircle,
} from 'lucide-react';
import { api, ApiError, queryString } from '../lib/api';
import { cacheScheme, getCachedScheme } from '../lib/offline';
import { useApp } from '../context/AppContext';
import { useReadAloud } from '../hooks/useReadAloud';
import { SchemeCard } from '../components/SchemeCard';
import {
  Badge,
  DemoBadge,
  DemoNotice,
  Disclaimer,
  ErrorState,
  Modal,
  Spinner,
  StatusBadge,
} from '../components/ui';
import { assessmentTone, formatDate } from '../lib/format';
import type {
  ApplicationRecord,
  EligibilityResult,
  SchemeDetail,
  SchemeSummary,
  SavedEntry,
} from '../types';

interface EligibilityApiResponse {
  eligibility: EligibilityResult;
  profile: { hasProfile: boolean; onboardingCompleted: boolean };
}

export function SchemeDetailPage() {
  const { slug = '' } = useParams();
  const { language, user, t, addToast } = useApp();
  const [scheme, setScheme] = useState<SchemeDetail | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityApiResponse | null>(null);
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [related, setRelated] = useState<SchemeSummary[]>([]);
  const [trackOpen, setTrackOpen] = useState(false);
  const [trackNotes, setTrackNotes] = useState('');
  const [trackRef, setTrackRef] = useState('');
  const [trackStatus, setTrackStatus] = useState('SUBMITTED_OFFLINE');
  const [trackBusy, setTrackBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const speech = useReadAloud();

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setError(null);
    setEligibility(null);
    setApplication(null);
    setRelated([]);

    api
      .get<{ scheme: SchemeDetail }>(`/schemes/${encodeURIComponent(slug)}${queryString({ language })}`)
      .then((response) => {
        if (!active) return;
        setScheme(response.scheme);
        setCachedAt(null);
        cacheScheme(slug, language, response.scheme);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const cached = getCachedScheme(slug, language);
        if (cached) {
          setScheme(cached.data);
          setCachedAt(cached.savedAt);
        } else {
          setError(err instanceof ApiError ? err.message : t('common.error'));
        }
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [slug, language, t]);

  useEffect(() => {
    if (!scheme) return;
    api
      .get<{ schemes: SchemeSummary[] }>(`/schemes/${encodeURIComponent(scheme.slug)}/related${queryString({ language, limit: 3 })}`)
      .then((response) => setRelated(response.schemes))
      .catch(() => setRelated([]));
  }, [scheme, language]);

  useEffect(() => {
    if (!user || !scheme) {
      setSaved(false);
      return;
    }
    api
      .get<{ savedSchemes: SavedEntry[] }>(`/citizens/me/saved-schemes${queryString({ language })}`)
      .then((response) => setSaved(response.savedSchemes.some((entry) => entry.scheme.slug === scheme.slug)))
      .catch(() => undefined);
  }, [user, scheme, language]);

  useEffect(() => {
    if (!user || !scheme || cachedAt) {
      setEligibility(null);
      return;
    }
    api
      .get<EligibilityApiResponse>(`/schemes/${encodeURIComponent(scheme.slug)}/eligibility${queryString({ language })}`)
      .then(setEligibility)
      .catch(() => setEligibility(null));
  }, [user, scheme, language, cachedAt]);

  useEffect(() => {
    if (!user || !scheme) {
      setApplication(null);
      return;
    }
    api
      .get<{ applications: ApplicationRecord[] }>(`/citizens/me/applications${queryString({ language })}`)
      .then((response) => setApplication(response.applications.find((item) => item.scheme.slug === scheme.slug) ?? null))
      .catch(() => undefined);
  }, [user, scheme, language]);

  const readText = useMemo(() => {
    if (!scheme) return '';
    return [
      scheme.title,
      scheme.summary ?? '',
      `${t('scheme.benefits')}: ${scheme.benefits ?? ''}`,
      `${t('scheme.eligibility')}: ${scheme.eligibility ?? ''}`,
      `${t('scheme.description')}: ${scheme.description ?? ''}`,
      `${t('scheme.requiredDocuments')}: ${scheme.requiredDocuments.join(', ')}`,
      `${t('scheme.applicationProcess')}: ${scheme.applicationProcess ?? ''}`,
    ].join('. ');
  }, [scheme, t]);

  async function toggleSave() {
    if (!scheme) return;
    if (!user) {
      addToast(t('scheme.eligibilityLogin'), 'info');
      return;
    }
    setSaveBusy(true);
    try {
      if (saved) {
        await api.del(`/citizens/me/saved-schemes/${encodeURIComponent(scheme.slug)}`);
        setSaved(false);
      } else {
        await api.post('/citizens/me/saved-schemes', { slug: scheme.slug });
        setSaved(true);
      }
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setSaveBusy(false);
    }
  }

  async function submitTracking(event: FormEvent) {
    event.preventDefault();
    if (!scheme) return;
    setTrackBusy(true);
    try {
      const response = await api.post<{ application: ApplicationRecord }>('/citizens/me/applications', {
        schemeSlug: scheme.slug,
        status: trackStatus,
        notes: trackNotes.trim() || null,
        referenceNumber: trackRef.trim() || null,
      });
      setApplication(response.application);
      setTrackOpen(false);
      addToast(t('scheme.tracked'), 'success');
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setTrackBusy(false);
    }
  }

  async function submitFeedback(event: FormEvent) {
    event.preventDefault();
    if (!scheme) return;
    setFeedbackBusy(true);
    try {
      await api.post('/feedback', {
        schemeSlug: scheme.slug,
        rating: rating || null,
        message,
      });
      setFeedbackSent(true);
      setMessage('');
      setRating(0);
      addToast(t('scheme.feedbackSent'), 'success');
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setFeedbackBusy(false);
    }
  }

  if (loading) return <Spinner label={t('common.loading')} />;
  if (error || !scheme) {
    return <ErrorState message={error ?? t('scheme.notFound')} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-8">
      <Link to="/schemes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800">
        <ArrowLeft className="h-4 w-4" /> {t('nav.schemes')}
      </Link>

      {cachedAt ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          {t('common.offlineHint')} ({formatDate(cachedAt, language)})
        </div>
      ) : null}

      <header className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="bg-brand-50 text-brand-800">{scheme.category.name}</Badge>
          <Badge tone="bg-slate-100 text-slate-700">
            {scheme.level === 'CENTRAL' ? t('common.central') : t('common.stateLevel')}
          </Badge>
          {scheme.isDemoData ? <DemoBadge /> : null}
          <Badge tone={scheme.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}>
            {scheme.status}
          </Badge>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold leading-tight text-brand-950 sm:text-3xl">{scheme.title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">{scheme.summary}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><Landmark className="h-3.5 w-3.5" /> {scheme.department}</span>
          {scheme.applicationDeadline ? (
            <span className="inline-flex items-center gap-1.5 text-amber-800">
              <CalendarClock className="h-3.5 w-3.5" /> {t('scheme.deadline')}: {formatDate(scheme.applicationDeadline, language)}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> {t('scheme.lastVerified')}: {formatDate(scheme.lastVerifiedAt, language)}</span>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className={saved ? 'btn-secondary' : 'btn-primary'} onClick={toggleSave} disabled={saveBusy}>
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {saved ? t('scheme.unsaveScheme') : t('scheme.saveScheme')}
          </button>
          {user ? (
            application ? (
              <Link to="/applications" className="btn-secondary">
                <ClipboardCheck className="h-4 w-4" /> {t('scheme.tracked')}
              </Link>
            ) : (
              <button type="button" className="btn-secondary" onClick={() => setTrackOpen(true)}>
                <ClipboardCheck className="h-4 w-4" /> {t('scheme.trackApplication')}
              </button>
            )
          ) : (
            <Link to="/login" className="btn-secondary">{t('nav.login')}</Link>
          )}
          {speech.supported ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => (speech.speaking ? speech.stop() : speech.speak(readText, language))}
            >
              {speech.speaking ? <Square className="h-4 w-4" /> : <Mic2 className="h-4 w-4" />}
              {speech.speaking ? t('common.stopReading') : t('common.readAloud')}
            </button>
          ) : null}
        </div>
        {scheme.fallbacks.length > 0 ? (
          <p className="mt-3 text-xs text-amber-800">
            <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
            Some fields are shown in English because a {language === 'kn' ? 'Kannada' : language === 'hi' ? 'Hindi' : 'translated'} version is not available.
          </p>
        ) : null}
      </header>

      {scheme.isDemoData ? <DemoNotice /> : null}

      {application ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          <ClipboardCheck className="h-4 w-4" />
          {t('scheme.tracked')}
          <StatusBadge status={application.status} />
          <Link to="/applications" className="ml-auto font-semibold underline">{t('nav.applications')}</Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        <div className="space-y-6">
          <Section title={t('scheme.benefits')} icon={Target}>
            <p className="prose-kn">{scheme.benefits ?? '—'}</p>
          </Section>
          <Section title={t('scheme.eligibility')} icon={CheckCircle2}>
            <p className="prose-kn">{scheme.eligibility ?? '—'}</p>
            {scheme.eligibilityRules.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {scheme.eligibilityRules.map((rule) => (
                  <li key={`${rule.field}-${rule.operator}`} className="rounded-lg bg-earth-50 px-3 py-2 text-sm text-slate-700">
                    <span className="font-semibold">{rule.description ?? `${rule.field} ${rule.operator} ${String(rule.value)}`}</span>
                    <span className="ml-2 text-xs text-slate-500">({rule.field} {rule.operator})</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>
          {scheme.description ? (
            <Section title={t('scheme.description')} icon={FileText}>
              <p className="prose-kn">{scheme.description}</p>
            </Section>
          ) : null}
          <Section title={t('scheme.requiredDocuments')} icon={FileText}>
            {scheme.requiredDocuments.length > 0 ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {scheme.requiredDocuments.map((document) => (
                  <li key={document} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                    {document}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">—</p>
            )}
          </Section>
          <Section title={t('scheme.applicationProcess')} icon={ClipboardCheck}>
            <p className="prose-kn">{scheme.applicationProcess ?? '—'}</p>
          </Section>

          <Section title={t('scheme.feedbackTitle')} icon={Send}>
            <p className="mb-3 text-sm text-slate-600">{t('scheme.feedbackBody')}</p>
            {!user ? (
              <Link to="/login" className="btn-secondary">{t('nav.login')}</Link>
            ) : feedbackSent ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{t('scheme.feedbackSent')}</p>
            ) : (
              <form onSubmit={submitFeedback} className="space-y-3">
                <div>
                  <label className="label" htmlFor="rating">{t('scheme.rating')}</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className={`h-9 w-9 rounded-lg border text-sm font-semibold ${rating >= value ? 'border-brand-700 bg-brand-700 text-white' : 'border-earth-300 bg-white text-slate-600'}`}
                        aria-label={`${value} / 5`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="feedback-message">{t('scheme.message')}</label>
                  <textarea
                    id="feedback-message"
                    className="input min-h-24"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    required
                    minLength={5}
                    maxLength={2000}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={feedbackBusy}>
                  {feedbackBusy ? t('common.submitting') : t('common.submit')}
                </button>
              </form>
            )}
          </Section>
        </div>

        <aside className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 font-bold text-slate-900">{t('scheme.officialLinks')}</h2>
            <div className="space-y-2">
              {scheme.officialUrl ? (
                <a href={scheme.officialUrl} target="_blank" rel="noreferrer noopener" className="flex items-center justify-between rounded-xl border border-earth-200 px-3 py-2.5 text-sm font-semibold text-brand-800 hover:bg-earth-50">
                  {t('scheme.officialSource')} <ArrowUpRight className="h-4 w-4" />
                </a>
              ) : null}
              {scheme.applicationUrl ? (
                <a href={scheme.applicationUrl} target="_blank" rel="noreferrer noopener" className="flex items-center justify-between rounded-xl bg-brand-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
                  {t('scheme.applyOfficial')} <ArrowUpRight className="h-4 w-4" />
                </a>
              ) : null}
              {!scheme.officialUrl && !scheme.applicationUrl ? <p className="text-sm text-slate-500">—</p> : null}
            </div>
            {scheme.source ? (
              <div className="mt-4 border-t border-earth-200 pt-3 text-xs text-slate-500">
                <p className="font-semibold text-slate-700">{t('scheme.officialSource')}: {scheme.source.name}</p>
                <p className="mt-1 break-all">{scheme.source.baseUrl}</p>
                <p className="mt-1">{t('scheme.lastVerified')}: {formatDate(scheme.source.lastCheckedAt, language)}</p>
              </div>
            ) : null}
            {scheme.notificationNumber ? (
              <p className="mt-3 text-xs text-slate-500">Notification: {scheme.notificationNumber}</p>
            ) : null}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900">
              <Target className="h-4 w-4 text-brand-700" /> {t('scheme.eligibilityTitle')}
            </h2>
            {!user ? (
              <Link to="/login" className="btn-secondary w-full">{t('scheme.eligibilityLogin')}</Link>
            ) : !eligibility ? (
              <Spinner />
            ) : (
              <EligibilityPanel data={eligibility.eligibility} completed={eligibility.profile.onboardingCompleted} />
            )}
          </div>

          <div className="rounded-xl border border-earth-200 bg-white p-4">
            <Disclaimer />
          </div>
        </aside>
      </div>

      {related.length > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-bold text-brand-900">{t('scheme.related')}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => <SchemeCard key={item.slug} scheme={item} />)}
          </div>
        </section>
      ) : null}

      {trackOpen ? (
        <Modal title={t('scheme.trackApplication')} onClose={() => setTrackOpen(false)}>
          <form onSubmit={submitTracking} className="space-y-4">
            <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">{t('scheme.trackingDisclaimer')}</p>
            <div>
              <label className="label" htmlFor="track-status">{t('common.status')}</label>
              <select id="track-status" className="input" value={trackStatus} onChange={(event) => setTrackStatus(event.target.value)}>
                <option value="DRAFT">{t('status.DRAFT')}</option>
                <option value="SUBMITTED_OFFLINE">{t('status.SUBMITTED_OFFLINE')}</option>
                <option value="TRACKING">{t('status.TRACKING')}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="track-ref">{t('applications.reference')}</label>
              <input id="track-ref" className="input" value={trackRef} onChange={(event) => setTrackRef(event.target.value)} maxLength={120} />
            </div>
            <div>
              <label className="label" htmlFor="track-notes">{t('common.notes')}</label>
              <textarea id="track-notes" className="input min-h-24" value={trackNotes} onChange={(event) => setTrackNotes(event.target.value)} maxLength={2000} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setTrackOpen(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn-primary" disabled={trackBusy}>{trackBusy ? t('common.saving') : t('common.save')}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof CheckCircle2;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
        <Icon className="h-5 w-5 text-brand-700" /> {title}
      </h2>
      {children}
    </section>
  );
}

function EligibilityPanel({ data, completed }: { data: EligibilityResult; completed: boolean }) {
  const { t } = useApp();
  return (
    <div className="space-y-3">
      <span className={`chip ${assessmentTone(data.assessment)}`}>{t(`assessment.${data.assessment}`)}</span>
      <p className="text-xs text-slate-500">
        {data.counts.met}/{data.counts.required} {t('common.required').toLowerCase()} · {data.counts.unknown} {t('scheme.ruleUnknown').toLowerCase()}
      </p>
      {!completed ? (
        <Link to="/profile" className="block text-sm font-semibold text-brand-800 underline">{t('scheme.completeProfile')}</Link>
      ) : null}
      {data.missingProfileFields.length > 0 ? (
        <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
          {t('matches.missing')}: {data.missingProfileFields.join(', ')}
        </p>
      ) : null}
      <ul className="space-y-2">
        {data.rules.map((rule) => (
          <li key={`${rule.field}-${rule.sortOrder}`} className="rounded-lg border border-earth-200 p-2.5 text-xs">
            <p className="flex items-start gap-2 font-medium text-slate-700">
              {rule.status === 'MET' ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : rule.status === 'NOT_MET' ? (
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
              ) : (
                <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              )}
              {rule.description ?? rule.field}
            </p>
            <p className="mt-1 pl-5 text-slate-500">
              {rule.status === 'MET' ? t('scheme.ruleMet') : rule.status === 'NOT_MET' ? t('scheme.ruleNotMet') : t('scheme.ruleUnknown')} · {rule.field}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-[11px] leading-5 text-slate-500">{data.disclaimer}</p>
    </div>
  );
}
