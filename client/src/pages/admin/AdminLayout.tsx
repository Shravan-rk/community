import { Link, NavLink, Outlet } from 'react-router-dom';
import { Activity, ClipboardList, Gauge, Layers, Radar, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isAdmin } from '../../lib/format';

const LINKS = [
  { to: '/admin', end: true, key: 'admin.dashboard', icon: Gauge },
  { to: '/admin/schemes', key: 'admin.schemes', icon: Layers },
  { to: '/admin/monitoring', key: 'admin.monitoring', icon: Radar },
  { to: '/admin/operations', key: 'admin.operations', icon: ClipboardList },
  { to: '/admin/users', key: 'admin.users', icon: Users },
] as const;

export function AdminLayout() {
  const { t, user } = useApp();

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="h-fit rounded-2xl border border-earth-200 bg-white p-3 shadow-card lg:sticky lg:top-24">
        <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Activity className="mr-1 inline h-3.5 w-3.5" /> {t('nav.admin')}
        </p>
        <nav className="space-y-1">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-700 text-white' : 'text-slate-700 hover:bg-earth-50'}`
              }
            >
              <link.icon className="h-4 w-4" /> {t(link.key)}
            </NavLink>
          ))}
        </nav>
        {user && !isAdmin(user.role) ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-2 text-[11px] leading-4 text-amber-900">
            {t('admin.notAuthorized')}
          </p>
        ) : null}
        <Link to="/" className="mt-3 block px-2 text-xs font-semibold text-brand-800 underline">
          {t('nav.home')}
        </Link>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
