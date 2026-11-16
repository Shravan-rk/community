import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { isStaff } from '../lib/format';
import { Spinner } from './ui';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, authLoading } = useApp();
  const location = useLocation();

  if (authLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function RequireStaff({ children }: { children: ReactNode }) {
  const { user, authLoading, t } = useApp();
  const location = useLocation();

  if (authLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!isStaff(user.role)) {
    return (
      <div className="card p-8 text-center">
        <p className="font-semibold text-slate-800">{t('admin.notAuthorized')}</p>
      </div>
    );
  }
  return <>{children}</>;
}
