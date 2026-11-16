import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api, ApiError, queryString } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { Badge, PageHeader, PaginationBar, Spinner } from '../../components/ui';
import { formatDate } from '../../lib/format';
import type { Pagination, Role, User } from '../../types';

interface AdminUser extends User {
  counts: { savedSchemes: number; applications: number; notifications: number };
}

interface UsersResponse {
  users: AdminUser[];
  pagination: Pagination;
}

const ROLES: Role[] = ['CITIZEN', 'VILLAGE_FACILITATOR', 'SCHEME_VERIFIER', 'ADMIN', 'SUPER_ADMIN'];

export function AdminUsersPage() {
  const { language, t, user, addToast } = useApp();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [role, setRole] = useState('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const canChangeRole = user?.role === 'SUPER_ADMIN';

  function load() {
    setLoading(true);
    api
      .get<UsersResponse>(`/admin/users${queryString({ role, q: appliedQuery, page, pageSize: 25 })}`)
      .then(setData)
      .catch((err: unknown) => addToast(err instanceof Error ? err.message : t('common.error'), 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, appliedQuery, page]);

  async function changeRole(target: AdminUser, nextRole: Role) {
    try {
      await api.patch(`/admin/users/${target.id}/role`, { role: nextRole });
      addToast(t('common.saved'), 'success');
      load();
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  async function toggleActive(target: AdminUser) {
    try {
      await api.patch(`/admin/users/${target.id}/status`, { isActive: !target.isActive });
      addToast(t('common.saved'), 'success');
      load();
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  return (
    <div>
      <PageHeader title={t('admin.users')} subtitle={t('admin.analytics')} />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <form
          className="relative flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setAppliedQuery(query.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('common.search')} />
        </form>
        <select className="input sm:w-56" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>
          <option value="">{t('common.all')} · {t('admin.role')}</option>
          {ROLES.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-earth-200 bg-white shadow-card">
            <table className="table-base min-w-[820px]">
              <thead>
                <tr>
                  <th>{t('auth.fullName')}</th>
                  <th>{t('admin.role')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('admin.applicationsTab')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data?.users.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <p className="font-semibold text-slate-800">{row.fullName}</p>
                      <p className="text-xs text-slate-500">{row.email}</p>
                      <p className="text-xs text-slate-400">Joined {formatDate(row.createdAt, language)}</p>
                    </td>
                    <td>
                      {canChangeRole ? (
                        <select className="rounded-lg border border-earth-300 bg-white px-2 py-1 text-xs" value={row.role} onChange={(event) => changeRole(row, event.target.value as Role)}>
                          {ROLES.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs">{row.role.replaceAll('_', ' ')}</span>
                      )}
                    </td>
                    <td>
                      <Badge tone={row.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                        {row.isActive ? t('admin.active') : t('admin.inactive')}
                      </Badge>
                    </td>
                    <td className="text-xs">{row.counts.applications}</td>
                    <td>
                      <button type="button" className="btn-ghost py-1 text-xs" onClick={() => toggleActive(row)} disabled={row.id === user?.id}>
                        {row.isActive ? t('admin.deactivate') : t('admin.activate')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data ? <PaginationBar pagination={data.pagination} onPage={setPage} /> : null}
        </>
      )}
    </div>
  );
}
