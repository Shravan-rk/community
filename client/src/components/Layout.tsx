import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  UserRound,
  WifiOff,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isStaff } from '../lib/format';
import { ToastViewport } from './ui';
import type { Language } from '../types';

const languages: Array<{ value: Language; label: string }> = [
  { value: 'kn', label: 'ಕನ್ನಡ' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
];

export function Layout() {
  const { user, language, setLanguage, logout, unreadCount, t } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems = [
    { to: '/', label: t('nav.home'), icon: Search },
    { to: '/schemes', label: t('nav.schemes'), icon: BriefcaseBusiness },
    { to: '/centres', label: t('nav.centres'), icon: Building2 },
    ...(user
      ? [
          { to: '/matches', label: t('nav.matches'), icon: ClipboardList },
          { to: '/applications', label: t('nav.applications'), icon: ClipboardList },
        ]
      : []),
  ];

  async function handleLogout() {
    await logout();
    setMobileOpen(false);
    navigate('/');
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-brand-50 text-brand-900' : 'text-slate-600 hover:bg-earth-100 hover:text-brand-900'
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      {!online ? (
        <div className="bg-amber-800 px-4 py-2 text-center text-sm text-white">
          <WifiOff className="mr-2 inline h-4 w-4" />
          {t('common.offline')} — {t('common.offlineHint')}
        </div>
      ) : null}

      <header className="sticky top-0 z-40 border-b border-earth-200 bg-earth-50/95 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
            <img src="/icons/icon.svg" alt="" className="h-9 w-9 rounded-lg" />
            <span>
              <span className="block text-sm font-extrabold leading-4 tracking-wide text-brand-900">GRAMA SAHAY</span>
              <span className="block text-[11px] font-medium text-slate-500">ಗ್ರಾಮ ಸಹಾಯ</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass} end={item.to === '/'}>
                {item.label}
              </NavLink>
            ))}
            {isStaff(user?.role) ? (
              <NavLink to="/admin" className={linkClass}>
                <LayoutDashboard className="mr-1 inline h-4 w-4" />
                {t('nav.admin')}
              </NavLink>
            ) : null}
          </nav>

          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="language-select">
              {t('nav.language')}
            </label>
            <select
              id="language-select"
              className="rounded-lg border border-earth-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              {languages.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {user ? (
              <>
                <Link
                  to="/notifications"
                  className="relative rounded-lg p-2 text-slate-600 hover:bg-earth-100"
                  aria-label={t('nav.notifications')}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ) : null}
                </Link>
                <div className="hidden items-center gap-1 md:flex">
                  <Link to="/saved" className="rounded-lg p-2 text-slate-600 hover:bg-earth-100" aria-label={t('nav.saved')}>
                    <Bookmark className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/profile"
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-earth-100"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                      {user.fullName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="max-w-24 truncate">{user.fullName.split(' ')[0]}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Link>
                  <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-earth-100" onClick={handleLogout} aria-label={t('nav.logout')}>
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link to="/login" className="btn-ghost">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="btn-primary">
                  {t('nav.register')}
                </Link>
              </div>
            )}

            <button
              type="button"
              className="rounded-lg p-2 text-slate-700 hover:bg-earth-100 lg:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-label={t('nav.menu')}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-earth-200 bg-white lg:hidden">
            <div className="container-page space-y-1 py-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      isActive ? 'bg-brand-50 text-brand-900' : 'text-slate-700'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
              {user ? (
                <>
                  <NavLink to="/saved" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700">
                    <Bookmark className="h-4 w-4" /> {t('nav.saved')}
                  </NavLink>
                  <NavLink to="/notifications" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700">
                    <Bell className="h-4 w-4" /> {t('nav.notifications')}
                    {unreadCount > 0 ? <span className="chip bg-red-100 text-red-700">{unreadCount}</span> : null}
                  </NavLink>
                  <NavLink to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700">
                    <UserRound className="h-4 w-4" /> {t('nav.profile')}
                  </NavLink>
                  {isStaff(user.role) ? (
                    <NavLink to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700">
                      <LayoutDashboard className="h-4 w-4" /> {t('nav.admin')}
                    </NavLink>
                  ) : null}
                  <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-700">
                    <LogOut className="h-4 w-4" /> {t('nav.logout')}
                  </button>
                </>
              ) : (
                <div className="flex gap-2 pt-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary flex-1">
                    {t('nav.login')}
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary flex-1">
                    {t('nav.register')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main className="flex-1 py-6 sm:py-10">
        <div className="container-page">
          <Outlet />
        </div>
      </main>

      <footer className="mt-10 border-t border-earth-200 bg-white">
        <div className="container-page grid gap-6 py-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="text-sm font-extrabold tracking-wide text-brand-900">GRAMA SAHAY</p>
            <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">{t('common.disclaimer')}</p>
            <p className="mt-2 text-xs leading-5 text-amber-800">{t('common.demoNotice')}</p>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold text-slate-800">{t('nav.schemes')}</p>
            <div className="space-y-1.5 text-slate-600">
              <Link className="block hover:text-brand-800" to="/schemes">{t('schemes.title')}</Link>
              <Link className="block hover:text-brand-800" to="/centres">{t('nav.centres')}</Link>
              {user ? <Link className="block hover:text-brand-800" to="/matches">{t('nav.matches')}</Link> : null}
            </div>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold text-slate-800">{t('nav.profile')}</p>
            <div className="space-y-1.5 text-slate-600">
              {user ? (
                <>
                  <Link className="block hover:text-brand-800" to="/applications">{t('nav.applications')}</Link>
                  <Link className="block hover:text-brand-800" to="/notifications">{t('nav.notifications')}</Link>
                  <Link className="block hover:text-brand-800" to="/profile">{t('profile.title')}</Link>
                </>
              ) : (
                <>
                  <Link className="block hover:text-brand-800" to="/login">{t('nav.login')}</Link>
                  <Link className="block hover:text-brand-800" to="/register">{t('nav.register')}</Link>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-earth-200 py-3 text-center text-[11px] text-slate-500">
          Built for rural Karnataka · {new Date().getFullYear()} · Not an official government website
        </div>
      </footer>
      <ToastViewport />
    </div>
  );
}
