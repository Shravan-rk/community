import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, LogIn, Mail } from 'lucide-react';
import { ApiError } from '../lib/api';
import { useApp } from '../context/AppContext';

const DEMO_ACCOUNTS = [
  { label: 'Citizen', email: 'citizen@gramasahay.local' },
  { label: 'Facilitator', email: 'facilitator@gramasahay.local' },
  { label: 'Verifier', email: 'verifier@gramasahay.local' },
  { label: 'Admin', email: 'admin@gramasahay.local' },
];

export function LoginPage() {
  const { login, t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold text-brand-950">{t('auth.loginTitle')}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t('auth.loginSubtitle')}</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="label">{t('auth.email')}</span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                className="input pl-9"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </span>
          </label>
          <label className="block">
            <span className="label">{t('auth.password')}</span>
            <span className="relative block">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                className="input pl-9"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </span>
          </label>
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            <LogIn className="h-4 w-4" /> {busy ? t('common.loading') : t('nav.login')}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-brand-800 underline">{t('nav.register')}</Link>
        </p>
      </div>

      <aside className="card h-fit p-6">
        <h2 className="font-bold text-slate-900">{t('auth.demoAccounts')}</h2>
        <p className="mt-1 text-xs text-slate-500">{t('auth.demoPassword')}: <span className="font-mono">ChangeMe!123</span></p>
        {import.meta.env.DEV ? (
          <ul className="mt-4 space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-earth-200 px-3 py-2 text-left text-xs hover:bg-earth-50"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword('ChangeMe!123');
                  }}
                >
                  <span className="font-semibold text-slate-800">{account.label}</span>
                  <span className="block text-slate-500">{account.email}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-slate-500">Demo credentials are available only in local development builds.</p>
        )}
        <p className="mt-4 text-xs leading-5 text-slate-500">{t('common.disclaimer')}</p>
      </aside>
    </div>
  );
}
