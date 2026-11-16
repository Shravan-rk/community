import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, FileWarning, Layers, Radar, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHeader, Spinner } from '../../components/ui';
import { formatNumber, isAdmin } from '../../lib/format';
import type { AdminStats, Analytics } from '../../types';

export function AdminDashboardPage() {
  const { language, t, user } = useApp();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminStats>('/admin/stats')
      .then(setStats)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t('common.error')));
    if (user && isAdmin(user.role)) {
      api.get<Analytics>('/admin/analytics').then(setAnalytics).catch(() => undefined);
    }
  }, [user, t]);

  if (error) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>;
  if (!stats) return <Spinner label={t('common.loading')} />;

  const cards = [
    { label: t('admin.totalUsers'), value: stats.totals.users, icon: Users },
    { label: t('admin.published'), value: stats.schemesByStatus.PUBLISHED ?? 0, icon: Layers },
    { label: t('admin.totalViews'), value: analytics?.totals.totalViews ?? stats.totals.schemes, icon: BarChart3 },
    { label: t('admin.pendingReview'), value: analytics?.totals.pendingExtractions ?? 0, icon: FileWarning },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.dashboard')} subtitle={t('admin.analytics')} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="card p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
              <card.icon className="h-4 w-4" />
            </span>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{formatNumber(card.value, language)}</p>
            <p className="text-xs text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      {analytics ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card p-4">
              <p className="text-xs text-slate-500">{t('admin.newUsers7')}</p>
              <p className="text-xl font-bold text-slate-900">{analytics.lastSevenDays.newUsers}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500">{t('admin.applications7')}</p>
              <p className="text-xl font-bold text-slate-900">{analytics.lastSevenDays.newApplications}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500">{t('admin.unreadNotifications')}</p>
              <p className="text-xl font-bold text-slate-900">{analytics.totals.unreadNotifications}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Breakdown title={t('admin.statusBreakdown')} data={analytics.schemesByStatus} />
            <Breakdown title={t('admin.applicationsTab')} data={analytics.applicationsByStatus} />
            <Breakdown title={t('admin.assistanceTab')} data={analytics.assistanceRequestsByStatus} />
            <Breakdown title={t('admin.feedbackTab')} data={analytics.feedbackByStatus} />
          </div>

          <section className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{t('admin.categoryBreakdown')}</h2>
            {analytics.publishedSchemesByCategory.length === 0 ? (
              <p className="text-sm text-slate-500">{t('admin.noData')}</p>
            ) : (
              <ul className="space-y-2">
                {analytics.publishedSchemesByCategory.map((row) => (
                  <li key={row.category.slug} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{language === 'kn' ? row.category.nameKn : row.category.nameEn}</span>
                    <span className="font-semibold text-slate-900">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <div className="card p-5 text-sm text-slate-600">
          <Radar className="mr-1 inline h-4 w-4" /> {t('admin.analytics')} — {isAdmin(user?.role ?? 'CITIZEN') ? t('common.loading') : t('admin.notAuthorized')}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to="/admin/schemes" className="btn-secondary">{t('admin.schemes')}</Link>
        <Link to="/admin/monitoring" className="btn-secondary">{t('admin.monitoring')}</Link>
        <Link to="/admin/operations" className="btn-secondary">{t('admin.operations')}</Link>
      </div>
    </div>
  );
}

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">—</p>
      ) : (
        <ul className="space-y-2">
          {entries.map(([key, value]) => (
            <li key={key} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{key.replaceAll('_', ' ')}</span>
              <span className="font-semibold text-slate-900">{value}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
