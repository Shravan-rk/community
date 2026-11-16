import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { ApiError } from '../lib/api';
import { useApp } from '../context/AppContext';
import type { Language } from '../types';

export function RegisterPage() {
  const { register, t, language } = useApp();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<Language>(language);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register({ fullName, email, phone: phone.trim() || undefined, password, preferredLanguage });
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold text-brand-950">{t('auth.registerTitle')}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t('auth.registerSubtitle')}</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="label">{t('auth.fullName')}</span>
            <input className="input" value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} maxLength={120} autoComplete="name" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">{t('auth.email')}</span>
              <input type="email" className="input" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
            </label>
            <label className="block">
              <span className="label">{t('auth.phone')}</span>
              <input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={20} autoComplete="tel" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">{t('auth.password')}</span>
              <input type="password" className="input" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" />
            </label>
            <label className="block">
              <span className="label">{t('common.confirm')}</span>
              <input type="password" className="input" value={confirm} onChange={(event) => setConfirm(event.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" />
            </label>
          </div>
          <p className="text-xs text-slate-500">{t('auth.passwordHint')}</p>
          <label className="block">
            <span className="label">{t('nav.language')}</span>
            <select className="input" value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value as Language)}>
              <option value="kn">ಕನ್ನಡ</option>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select>
          </label>
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            <UserPlus className="h-4 w-4" /> {busy ? t('common.submitting') : t('auth.createAccount')}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-brand-800 underline">{t('nav.login')}</Link>
        </p>
      </div>
    </div>
  );
}
