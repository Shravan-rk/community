import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, CheckCircle2, MapPin, Mic, Search, ShieldCheck, Users } from 'lucide-react';
import { api, queryString } from '../lib/api';
import { cacheSchemeList, getCachedSchemeList } from '../lib/offline';
import { useApp } from '../context/AppContext';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { CategoryIcon } from '../components/CategoryIcon';
import { SchemeCard } from '../components/SchemeCard';
import { DemoNotice, Disclaimer, Spinner } from '../components/ui';
import type { Category, SchemeListResponse } from '../types';

export function HomePage() {
  const { language, user, t, addToast } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [schemes, setSchemes] = useState<SchemeListResponse['schemes']>([]);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const voice = useVoiceSearch(language, (text) => {
    setQuery(text);
    navigate(`/schemes?q=${encodeURIComponent(text)}`);
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api.get<{ categories: Category[] }>(`/categories${queryString({ language })}`),
      api.get<SchemeListResponse>(`/schemes${queryString({ language, pageSize: 6, sort: 'newest' })}`),
    ])
      .then(([categoryResponse, schemeResponse]) => {
        if (!active) return;
        setCategories(categoryResponse.categories);
        setSchemes(schemeResponse.schemes);
        setCachedAt(null);
        cacheSchemeList('home', language, schemeResponse.schemes);
      })
      .catch(() => {
        if (!active) return;
        const cached = getCachedSchemeList('home', language);
        if (cached) {
          setSchemes(cached.data);
          setCachedAt(cached.savedAt);
        } else {
          setError(t('common.error'));
        }
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [language, t]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    navigate(`/schemes${queryString({ q: query.trim() || undefined })}`);
  }

  return (
    <div className="space-y-14">
      <section className="overflow-hidden rounded-3xl border border-earth-200 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-6 py-10 text-white shadow-card sm:px-10 sm:py-14">
        <div className="max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-earth-100">
            <ShieldCheck className="h-3.5 w-3.5" /> Karnataka · ಕನ್ನಡ ಮೊದಲು
          </p>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">{t('home.heroTitle')}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-earth-100 sm:text-base">{t('home.heroSubtitle')}</p>

          <form onSubmit={onSearch} className="mt-7 flex flex-col gap-2 sm:flex-row" role="search">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="input h-12 border-0 pl-11 text-slate-900"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('common.searchPlaceholder')}
                aria-label={t('common.search')}
              />
            </div>
            {voice.supported ? (
              <button
                type="button"
                onClick={voice.listening ? voice.stop : voice.start}
                className={`btn h-12 ${voice.listening ? 'bg-red-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                aria-label={t('common.voiceSearch')}
                title={t('common.voiceSearch')}
              >
                <Mic className={`h-5 w-5 ${voice.listening ? 'animate-pulse' : ''}`} />
              </button>
            ) : null}
            <button type="submit" className="btn h-12 bg-earth-200 text-brand-900 hover:bg-white">
              {t('home.searchButton')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          {voice.error === 'unsupported' ? (
            <p className="mt-2 text-xs text-earth-200">{t('common.voiceUnsupported')}</p>
          ) : voice.listening ? (
            <p className="mt-2 text-xs text-earth-200">{t('common.listening')}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-earth-100">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> {t('home.trust1')}</span>
            <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4" /> {t('home.trust2')}</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> {t('home.trust3')}</span>
          </div>
        </div>
      </section>

      {cachedAt ? (
        <div className="-mt-8 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          {t('common.offlineHint')}
        </div>
      ) : null}

      <section>
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-xl font-bold text-brand-900 sm:text-2xl">{t('home.browseCategories')}</h2>
          <Link to="/schemes" className="text-sm font-semibold text-brand-800 hover:text-brand-900">{t('common.viewAll')}</Link>
        </div>
        {loading && categories.length === 0 ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((category) => (
              <Link
                key={category.slug}
                to={`/schemes?category=${category.slug}`}
                className="card flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand-300"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                  <CategoryIcon name={category.icon} />
                </span>
                <span className="text-sm font-semibold leading-5 text-slate-800">{category.name}</span>
                <span className="text-xs text-slate-500">{category.schemeCount} {t('nav.schemes').toLowerCase()}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-xl font-bold text-brand-900 sm:text-2xl">{t('home.latestSchemes')}</h2>
          <Link to="/schemes" className="text-sm font-semibold text-brand-800 hover:text-brand-900">{t('common.viewAll')}</Link>
        </div>
        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {schemes.map((scheme) => (
              <SchemeCard key={scheme.slug} scheme={scheme} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-earth-200 bg-white p-6 sm:p-9">
        <h2 className="text-xl font-bold text-brand-900 sm:text-2xl">{t('home.howItWorks')}</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            { icon: Users, title: t('home.step1'), body: t('home.step1Body') },
            { icon: Search, title: t('home.step2'), body: t('home.step2Body') },
            { icon: BadgeCheck, title: t('home.step3'), body: t('home.step3Body') },
          ].map((step, index) => (
            <div key={step.title}>
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                <step.icon className="h-5 w-5" />
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Step {index + 1}</p>
              <h3 className="mt-1 font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card flex flex-col justify-between p-6">
          <div>
            <h2 className="text-lg font-bold text-brand-900">{t('home.eligibilityTitle')}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t('home.eligibilityBody')}</p>
          </div>
          <Link to={user ? '/matches' : '/register'} className="btn-primary mt-5 self-start">
            {t('home.checkMatches')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="card flex flex-col justify-between p-6">
          <div>
            <h2 className="text-lg font-bold text-brand-900">{t('home.assistanceTitle')}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t('home.assistanceBody')}</p>
          </div>
          <Link to="/centres" className="btn-secondary mt-5 self-start">
            <MapPin className="h-4 w-4" />
            {t('home.findCentres')}
          </Link>
        </div>
      </section>

      <div className="space-y-3">
        <DemoNotice />
        <Disclaimer />
      </div>

      {voice.error && voice.error !== 'unsupported' ? (
        <button type="button" className="hidden" onClick={() => addToast(t('common.voiceUnsupported'), 'error')} />
      ) : null}
    </div>
  );
}
