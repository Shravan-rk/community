import { useEffect, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { statusTone } from '../lib/format';
import type { TranslationKey } from '../i18n';
import type { Pagination as PaginationType } from '../types';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-slate-500" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useApp();
  return (
    <div className="card border-red-200 p-6 text-center">
      <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-600" aria-hidden />
      <p className="text-sm text-red-800">{message}</p>
      {onRetry ? (
        <button type="button" className="btn-secondary mt-4" onClick={onRetry}>
          {t('common.retry')}
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card border-dashed p-10 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      {body ? <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  return <span className={`chip ${tone ?? 'bg-slate-100 text-slate-700'}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useApp();
  return <Badge tone={statusTone(status)}>{t(`status.${status}` as TranslationKey)}</Badge>;
}

export function DemoBadge() {
  const { t } = useApp();
  return <Badge tone="bg-amber-100 text-amber-900">{t('common.demo')}</Badge>;
}

export function DemoNotice({ children }: { children?: ReactNode }) {
  const { t } = useApp();
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{children ?? t('common.demoNotice')}</span>
      </p>
    </div>
  );
}

export function Disclaimer() {
  const { t } = useApp();
  return <p className="text-xs leading-5 text-slate-500">{t('common.disclaimer')}</p>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-900 sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function PaginationBar({
  pagination,
  onPage,
}: {
  pagination: PaginationType;
  onPage: (page: number) => void;
}) {
  const { t } = useApp();
  if (pagination.totalPages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Pagination">
      <button
        type="button"
        className="btn-secondary"
        disabled={pagination.page <= 1}
        onClick={() => onPage(pagination.page - 1)}
      >
        {t('common.previous')}
      </button>
      <p className="text-sm text-slate-600">
        {t('common.page')} {pagination.page} / {pagination.totalPages} · {pagination.total}
      </p>
      <button
        type="button"
        className="btn-secondary"
        disabled={pagination.page >= pagination.totalPages}
        onClick={() => onPage(pagination.page + 1)}
      >
        {t('common.next')}
      </button>
    </nav>
  );
}

export function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-earth-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-earth-100" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ToastViewport() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-[60] w-[92%] max-w-md -translate-x-1/2 space-y-2" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${
            toast.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-900'
              : toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-sky-200 bg-sky-50 text-sky-900'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button type="button" aria-label="Dismiss" onClick={() => dismissToast(toast.id)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
