import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { api, ApiError, queryString } from '../lib/api';
import { useApp } from '../context/AppContext';
import { DemoBadge, EmptyState, ErrorState, PageHeader, PaginationBar, Spinner } from '../components/ui';
import { formatDate } from '../lib/format';
import type { AppNotification, Pagination } from '../types';

interface NotificationResponse {
  notifications: AppNotification[];
  unreadCount: number;
  pagination: Pagination;
}

export function NotificationsPage() {
  const { language, t, addToast, refreshUnread } = useApp();
  const [data, setData] = useState<NotificationResponse | null>(null);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<NotificationResponse>(`/citizens/me/notifications${queryString({ page, pageSize: 15, unreadOnly: unreadOnly ? 'true' : undefined })}`)
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t('common.error')))
      .finally(() => setLoading(false));
    void refreshUnread();
  }, [page, unreadOnly, t, refreshUnread]);

  async function markRead(notification: AppNotification) {
    if (notification.read) return;
    try {
      await api.patch(`/citizens/me/notifications/${notification.id}/read`);
      setData((current) =>
        current
          ? {
              ...current,
              unreadCount: Math.max(0, current.unreadCount - 1),
              notifications: current.notifications.map((item) =>
                item.id === notification.id ? { ...item, read: true, status: 'READ' } : item,
              ),
            }
          : current,
      );
      void refreshUnread();
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  async function markAll() {
    try {
      await api.post('/citizens/me/notifications/read-all');
      setData((current) =>
        current
          ? {
              ...current,
              unreadCount: 0,
              notifications: current.notifications.map((item) => ({ ...item, read: true, status: 'READ' })),
            }
          : current,
      );
      void refreshUnread();
      addToast(t('notifications.read'), 'success');
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title={t('notifications.title')}
        subtitle={`${data?.unreadCount ?? 0} ${t('notifications.unread')}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className={unreadOnly ? 'btn-primary' : 'btn-secondary'} onClick={() => { setUnreadOnly((value) => !value); setPage(1); }}>
              {unreadOnly ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              {t('notifications.unreadOnly')}
            </button>
            <button type="button" className="btn-secondary" onClick={markAll} disabled={!data || data.unreadCount === 0}>
              <CheckCheck className="h-4 w-4" /> {t('notifications.markAll')}
            </button>
          </div>
        }
      />

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : !data || data.notifications.length === 0 ? (
        <EmptyState title={t('notifications.empty')} />
      ) : (
        <>
          <div className="space-y-2">
            {data.notifications.map((notification) => (
              <article
                key={notification.id}
                className={`card p-4 ${notification.read ? '' : 'border-brand-300 bg-brand-50/40'}`}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{notification.title}</h2>
                      {notification.scheme?.isDemoData ? <DemoBadge /> : null}
                      {!notification.read ? <span className="h-2 w-2 rounded-full bg-brand-700" aria-label={t('notifications.unread')} /> : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{notification.body}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {formatDate(notification.createdAt, language)} · {notification.type}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {notification.scheme ? (
                      <Link
                        to={`/schemes/${notification.scheme.slug}`}
                        className="text-xs font-semibold text-brand-800 underline"
                        onClick={() => void markRead(notification)}
                      >
                        {t('notifications.viewScheme')}
                      </Link>
                    ) : null}
                    {!notification.read ? (
                      <button type="button" className="btn-ghost py-1 text-xs" onClick={() => void markRead(notification)}>
                        {t('notifications.read')}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <PaginationBar pagination={data.pagination} onPage={setPage} />
        </>
      )}
    </div>
  );
}
