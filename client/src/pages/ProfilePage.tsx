import { useEffect, useState, type FormEvent } from 'react';
import { BellRing, CheckCircle2, MapPinned, Save, ShieldCheck, UserRound } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useApp } from '../context/AppContext';
import { PageHeader, Spinner } from '../components/ui';
import type { Consent, Preferences, Profile } from '../types';

type ConsentType = 'DATA_PROCESSING' | 'NOTIFICATIONS_SMS' | 'NOTIFICATIONS_WHATSAPP' | 'ANALYTICS';

const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
const SOCIAL_CATEGORIES = ['GENERAL', 'OBC', 'SC', 'ST', 'EWS', 'MINORITY'];
const CONSENT_TYPES: ConsentType[] = ['DATA_PROCESSING', 'ANALYTICS', 'NOTIFICATIONS_SMS', 'NOTIFICATIONS_WHATSAPP'];

function dateInput(value?: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function numberOrNull(value: string) {
  return value.trim() === '' ? null : Number(value);
}

export function ProfilePage() {
  const { t, addToast, setProfile: setContextProfile } = useApp();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [profileBusy, setProfileBusy] = useState(false);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ profile: Profile | null }>('/citizens/me/profile'),
      api.get<{ preferences: Preferences }>('/citizens/me/notification-preferences'),
      api.get<{ consents: Consent[] }>('/citizens/me/consents'),
    ])
      .then(([profileResponse, preferenceResponse, consentResponse]) => {
        setProfile(profileResponse.profile ?? { state: 'Karnataka' });
        setContextProfile(profileResponse.profile);
        setPreferences(preferenceResponse.preferences);
        setConsents(
          Object.fromEntries(consentResponse.consents.map((consent) => [consent.consentType, consent.granted])),
        );
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t('common.error')))
      .finally(() => setLoading(false));
  }, [t, setContextProfile]);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => ({ ...(current ?? {}), [key]: value }));
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setProfileBusy(true);
    try {
      const response = await api.patch<{ profile: Profile }>('/citizens/me/profile', {
        dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString() : null,
        gender: profile.gender || null,
        state: profile.state || null,
        district: profile.district || null,
        taluk: profile.taluk || null,
        village: profile.village || null,
        gramPanchayat: profile.gramPanchayat || null,
        occupation: profile.occupation || null,
        annualIncome: profile.annualIncome === null || profile.annualIncome === undefined ? null : Number(profile.annualIncome),
        education: profile.education || null,
        landHoldingAcres: profile.landHoldingAcres === null || profile.landHoldingAcres === undefined ? null : Number(profile.landHoldingAcres),
        familySize: profile.familySize === null || profile.familySize === undefined ? null : Number(profile.familySize),
        disabilityStatus: profile.disabilityStatus ?? null,
        socialCategory: profile.socialCategory || null,
        aadhaarLast4: profile.aadhaarLast4 || null,
        onboardingCompleted: Boolean(profile.onboardingCompleted),
      });
      setProfile(response.profile);
      setContextProfile(response.profile);
      addToast(t('profile.savedMessage'), 'success');
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePreferences(event: FormEvent) {
    event.preventDefault();
    if (!preferences) return;
    setPrefsBusy(true);
    try {
      const response = await api.patch<{ preferences: Preferences }>('/citizens/me/notification-preferences', {
        inApp: preferences.inApp,
        sms: preferences.sms,
        whatsapp: preferences.whatsapp,
        email: preferences.email,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
      });
      setPreferences(response.preferences);
      addToast(t('common.saved'), 'success');
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setPrefsBusy(false);
    }
  }

  async function saveConsents() {
    setConsentBusy(true);
    try {
      const response = await api.put<{ consents: Consent[] }>('/citizens/me/consents', {
        consents: CONSENT_TYPES.map((consentType) => ({
          consentType,
          granted: Boolean(consents[consentType]),
          version: '1.0',
        })),
      });
      setConsents(Object.fromEntries(response.consents.map((consent) => [consent.consentType, consent.granted])));
      addToast(t('common.saved'), 'success');
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setConsentBusy(false);
    }
  }

  if (loading) return <Spinner label={t('common.loading')} />;
  if (error || !profile || !preferences) {
    return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error ?? t('common.error')}</p>;
  }

  return (
    <div>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <form onSubmit={saveProfile} className="space-y-6">
        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><UserRound className="h-5 w-5 text-brand-700" /> {t('profile.personal')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="label">{t('profile.dateOfBirth')}</span>
              <input type="date" className="input" value={dateInput(profile.dateOfBirth)} onChange={(event) => update('dateOfBirth', event.target.value || null)} />
            </label>
            <label className="block">
              <span className="label">{t('profile.gender')}</span>
              <select className="input" value={profile.gender ?? ''} onChange={(event) => update('gender', event.target.value || null)}>
                <option value="">—</option>
                {GENDERS.map((gender) => <option key={gender} value={gender}>{gender.replaceAll('_', ' ')}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">{t('profile.socialCategory')}</span>
              <select className="input" value={profile.socialCategory ?? ''} onChange={(event) => update('socialCategory', event.target.value || null)}>
                <option value="">—</option>
                {SOCIAL_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">{t('profile.disability')}</span>
              <select className="input" value={profile.disabilityStatus === null || profile.disabilityStatus === undefined ? '' : String(profile.disabilityStatus)} onChange={(event) => update('disabilityStatus', event.target.value === '' ? null : event.target.value === 'true')}>
                <option value="">—</option>
                <option value="false">{t('common.no')}</option>
                <option value="true">{t('common.yes')}</option>
              </select>
            </label>
            <label className="block">
              <span className="label">{t('profile.familySize')}</span>
              <input type="number" min={1} max={50} className="input" value={profile.familySize ?? ''} onChange={(event) => update('familySize', numberOrNull(event.target.value))} />
            </label>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><MapPinned className="h-5 w-5 text-brand-700" /> {t('profile.location')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {([
              ['state', 'profile.state'],
              ['district', 'profile.district'],
              ['taluk', 'profile.taluk'],
              ['village', 'profile.village'],
              ['gramPanchayat', 'profile.gramPanchayat'],
            ] as const).map(([field, key]) => (
              <label key={field} className="block">
                <span className="label">{t(key)}</span>
                <input className="input" value={(profile[field] as string | null | undefined) ?? ''} onChange={(event) => update(field, event.target.value || null)} maxLength={120} />
              </label>
            ))}
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><CheckCircle2 className="h-5 w-5 text-brand-700" /> {t('profile.livelihood')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="label">{t('profile.occupation')}</span>
              <input className="input" value={profile.occupation ?? ''} onChange={(event) => update('occupation', event.target.value || null)} maxLength={80} />
            </label>
            <label className="block">
              <span className="label">{t('profile.annualIncome')}</span>
              <input type="number" min={0} className="input" value={profile.annualIncome ?? ''} onChange={(event) => update('annualIncome', numberOrNull(event.target.value))} />
            </label>
            <label className="block">
              <span className="label">{t('profile.landHolding')}</span>
              <input type="number" min={0} step="0.01" className="input" value={profile.landHoldingAcres ?? ''} onChange={(event) => update('landHoldingAcres', numberOrNull(event.target.value))} />
            </label>
            <label className="block">
              <span className="label">{t('profile.education')}</span>
              <input className="input" value={profile.education ?? ''} onChange={(event) => update('education', event.target.value || null)} maxLength={80} />
            </label>
            <label className="block">
              <span className="label">{t('profile.aadhaarLast4')}</span>
              <input className="input" inputMode="numeric" maxLength={4} value={profile.aadhaarLast4 ?? ''} onChange={(event) => update('aadhaarLast4', event.target.value.replace(/\D/g, '').slice(0, 4) || null)} />
            </label>
            <label className="mt-6 flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-earth-300 text-brand-700" checked={Boolean(profile.onboardingCompleted)} onChange={(event) => update('onboardingCompleted', event.target.checked)} />
              {t('profile.onboarding')}
            </label>
          </div>
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{t('profile.aadhaarWarning')}</p>
          <button type="submit" className="btn-primary mt-4" disabled={profileBusy}>
            <Save className="h-4 w-4" /> {profileBusy ? t('common.saving') : t('profile.saveProfile')}
          </button>
        </section>
      </form>

      <form onSubmit={savePreferences} className="mt-6 card p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><BellRing className="h-5 w-5 text-brand-700" /> {t('profile.preferences')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ['inApp', 'profile.inApp'],
            ['sms', 'profile.sms'],
            ['whatsapp', 'profile.whatsapp'],
            ['email', 'profile.email'],
          ] as const).map(([field, key]) => (
            <label key={field} className="flex items-center gap-2 rounded-lg border border-earth-200 px-3 py-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-earth-300 text-brand-700" checked={Boolean(preferences[field])} onChange={(event) => setPreferences({ ...preferences, [field]: event.target.checked })} />
              {t(key)}
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">{t('profile.quietStart')}</span>
            <input type="number" min={0} max={23} className="input" value={preferences.quietHoursStart ?? ''} onChange={(event) => setPreferences({ ...preferences, quietHoursStart: numberOrNull(event.target.value) })} />
          </label>
          <label className="block">
            <span className="label">{t('profile.quietEnd')}</span>
            <input type="number" min={0} max={23} className="input" value={preferences.quietHoursEnd ?? ''} onChange={(event) => setPreferences({ ...preferences, quietHoursEnd: numberOrNull(event.target.value) })} />
          </label>
        </div>
        <button type="submit" className="btn-secondary mt-4" disabled={prefsBusy}>{prefsBusy ? t('common.saving') : t('common.save')}</button>
      </form>

      <section className="mt-6 card p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><ShieldCheck className="h-5 w-5 text-brand-700" /> {t('profile.consents')}</h2>
        <div className="space-y-2">
          {CONSENT_TYPES.map((consentType) => (
            <label key={consentType} className="flex items-center gap-2 rounded-lg border border-earth-200 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-earth-300 text-brand-700"
                checked={Boolean(consents[consentType])}
                onChange={(event) => setConsents({ ...consents, [consentType]: event.target.checked })}
              />
              {consentType === 'DATA_PROCESSING'
                ? t('profile.dataProcessing')
                : consentType === 'ANALYTICS'
                  ? t('profile.analyticsConsent')
                  : t('profile.notificationsConsent')}
            </label>
          ))}
        </div>
        <button type="button" className="btn-secondary mt-4" onClick={saveConsents} disabled={consentBusy}>
          {consentBusy ? t('common.saving') : t('common.save')}
        </button>
      </section>
    </div>
  );
}
