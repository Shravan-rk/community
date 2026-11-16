import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkX } from 'lucide-react';
import { api, ApiError, queryString } from '../lib/api';
import { useApp } from '../context/AppContext';
import { SchemeCard } from '../components/SchemeCard';
import { EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';
import type { SavedEntry } from '../types';

export function SavedPage() {
  const { language, t, addToast } = useApp();
  const [entries, setEntries] = useState<SavedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ savedSchemes: SavedEntry[] }>(`/citizens/me/saved-schemes${queryString({ language })}`)
      .then((response) => setEntries(response.savedSchemes))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t('common.error')))
      .finally(() => setLoading(false));
  }, [language, t]);

  async function remove(slug: string) {
    try {
      await api.del(`/citizens/me/saved-schemes/${encodeURIComponent(slug)}`);
      setEntries((current) => current.filter((entry) => entry.scheme.slug !== slug));
      addToast(t('common.saved'), 'success');
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  return (
    <div>
      <PageHeader title={t('nav.saved')} subtitle={t('schemes.subtitle')} />
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : entries.length === 0 ? (
        <EmptyState
          title={t('common.noResults')}
          action={<Link to="/schemes" className="btn-primary">{t('nav.schemes')}</Link>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <div key={entry.scheme.slug} className="space-y-2">
              <SchemeCard scheme={entry.scheme} />
              <div className="flex items-center justify-between px-1">
                {!entry.isPublished ? (
                  <span className="text-xs font-semibold text-amber-800">{t('status.EXPIRED')}</span>
                ) : <span />}
                <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-red-700" onClick={() => remove(entry.scheme.slug)}>
                  <BookmarkX className="h-3.5 w-3.5" /> {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
