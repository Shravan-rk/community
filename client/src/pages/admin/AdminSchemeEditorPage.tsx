import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { api, ApiError, queryString } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHeader, Spinner } from '../../components/ui';
import type { AdminSchemeDetail, Category, EligibilityRule } from '../../types';

interface FormState {
  titleEn: string;
  summaryEn: string;
  benefitsEn: string;
  eligibilityEn: string;
  descriptionEn: string;
  applicationProcessEn: string;
  department: string;
  level: 'CENTRAL' | 'STATE';
  state: string;
  categorySlug: string;
  sourceSlug: string;
  requiredDocuments: string;
  applicationUrl: string;
  officialUrl: string;
  notificationNumber: string;
  applicationDeadline: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'PENDING_VERIFICATION';
  rules: string;
}

const EMPTY: FormState = {
  titleEn: '',
  summaryEn: '',
  benefitsEn: '',
  eligibilityEn: '',
  descriptionEn: '',
  applicationProcessEn: '',
  department: '',
  level: 'STATE',
  state: 'Karnataka',
  categorySlug: '',
  sourceSlug: '',
  requiredDocuments: '',
  applicationUrl: '',
  officialUrl: '',
  notificationNumber: '',
  applicationDeadline: '',
  startDate: '',
  endDate: '',
  status: 'PENDING_VERIFICATION',
  rules: '[]',
};

function dateValue(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function rulesText(rules: EligibilityRule[]) {
  return JSON.stringify(
    rules.map((rule, index) => ({
      field: rule.field,
      operator: rule.operator,
      value: rule.value,
      descriptionEn: rule.description ?? null,
      isRequired: true,
      sortOrder: index,
    })),
    null,
    2,
  );
}

export function AdminSchemeEditorPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { language, t, addToast } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ categories: Category[] }>(`/categories${queryString({ language: 'en' })}`)
      .then((response) => {
        setCategories(response.categories);
        setForm((current) => (current.categorySlug ? current : { ...current, categorySlug: response.categories[0]?.slug ?? '' }));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<{ scheme: AdminSchemeDetail }>(`/admin/schemes/${id}${queryString({ language: 'en' })}`)
      .then((response) => {
        const scheme = response.scheme;
        setForm({
          titleEn: scheme.title,
          summaryEn: scheme.summary ?? '',
          benefitsEn: scheme.benefits ?? '',
          eligibilityEn: scheme.eligibility ?? '',
          descriptionEn: scheme.description ?? '',
          applicationProcessEn: scheme.applicationProcess ?? '',
          department: scheme.department,
          level: scheme.level,
          state: scheme.state ?? 'Karnataka',
          categorySlug: scheme.category.slug,
          sourceSlug: '',
          requiredDocuments: scheme.requiredDocuments.join('\n'),
          applicationUrl: scheme.applicationUrl ?? '',
          officialUrl: scheme.officialUrl ?? '',
          notificationNumber: scheme.notificationNumber ?? '',
          applicationDeadline: dateValue(scheme.applicationDeadline),
          startDate: dateValue(scheme.startDate),
          endDate: dateValue(scheme.endDate),
          status: 'PENDING_VERIFICATION',
          rules: rulesText(scheme.eligibilityRules),
        });
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t('common.error')))
      .finally(() => setLoading(false));
  }, [id, t]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    let rules: unknown;
    try {
      rules = JSON.parse(form.rules);
      if (!Array.isArray(rules)) throw new Error('Rules must be a JSON array.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid rules JSON.');
      return;
    }

    const payload: Record<string, unknown> = {
      titleEn: form.titleEn,
      summaryEn: form.summaryEn,
      benefitsEn: form.benefitsEn,
      eligibilityEn: form.eligibilityEn,
      descriptionEn: form.descriptionEn,
      applicationProcessEn: form.applicationProcessEn,
      department: form.department,
      level: form.level,
      state: form.state,
      categorySlug: form.categorySlug,
      requiredDocuments: form.requiredDocuments.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean),
      applicationUrl: form.applicationUrl,
      officialUrl: form.officialUrl,
      notificationNumber: form.notificationNumber,
      applicationDeadline: form.applicationDeadline || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      rules,
      ...(editing ? {} : { status: form.status }),
    };
    if (form.sourceSlug.trim()) payload.sourceSlug = form.sourceSlug.trim();

    setBusy(true);
    try {
      const response = editing
        ? await api.patch<{ scheme: AdminSchemeDetail; changed: string[] }>(
            `/admin/schemes/${id}${queryString({ language })}`,
            payload,
          )
        : await api.post<{ scheme: AdminSchemeDetail }>(`/admin/schemes${queryString({ language })}`, payload);
      addToast(t('admin.schemeSaved'), 'success');
      navigate(`/admin/schemes/${response.scheme.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner label={t('common.loading')} />;

  return (
    <div>
      <PageHeader
        title={editing ? t('admin.editScheme') : t('admin.newScheme')}
        subtitle={editing ? 'English base content is edited here. Kannada review happens on the scheme detail page.' : undefined}
      />

      <form onSubmit={submit} className="space-y-5">
        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="label">Title (English) *</span>
            <input className="input" value={form.titleEn} onChange={(event) => set('titleEn', event.target.value)} required minLength={3} maxLength={200} />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Summary (English) *</span>
            <textarea className="input min-h-24" value={form.summaryEn} onChange={(event) => set('summaryEn', event.target.value)} required minLength={10} maxLength={2000} />
          </label>
          <label className="block">
            <span className="label">{t('common.department')} *</span>
            <input className="input" value={form.department} onChange={(event) => set('department', event.target.value)} required minLength={2} maxLength={160} />
          </label>
          <label className="block">
            <span className="label">{t('common.category')} *</span>
            <select className="input" value={form.categorySlug} onChange={(event) => set('categorySlug', event.target.value)} required>
              <option value="">—</option>
              {categories.map((category) => <option key={category.slug} value={category.slug}>{category.nameEn}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">{t('common.level')}</span>
            <select className="input" value={form.level} onChange={(event) => set('level', event.target.value as FormState['level'])}>
              <option value="STATE">{t('common.stateLevel')}</option>
              <option value="CENTRAL">{t('common.central')}</option>
            </select>
          </label>
          <label className="block">
            <span className="label">{t('profile.state')}</span>
            <input className="input" value={form.state} onChange={(event) => set('state', event.target.value)} maxLength={80} />
          </label>
          <label className="block">
            <span className="label">Source slug (optional)</span>
            <input className="input" value={form.sourceSlug} onChange={(event) => set('sourceSlug', event.target.value)} placeholder="e.g. demo-state-portal" />
          </label>
          {!editing ? (
            <label className="block">
              <span className="label">{t('common.status')}</span>
              <select className="input" value={form.status} onChange={(event) => set('status', event.target.value as FormState['status'])}>
                <option value="PENDING_VERIFICATION">{t('status.PENDING_VERIFICATION')}</option>
                <option value="DRAFT">{t('status.DRAFT')}</option>
              </select>
            </label>
          ) : null}
        </section>

        <section className="card grid gap-4 p-5">
          <label className="block">
            <span className="label">Benefits (English) *</span>
            <textarea className="input min-h-24" value={form.benefitsEn} onChange={(event) => set('benefitsEn', event.target.value)} required minLength={3} maxLength={2000} />
          </label>
          <label className="block">
            <span className="label">Eligibility (English)</span>
            <textarea className="input min-h-24" value={form.eligibilityEn} onChange={(event) => set('eligibilityEn', event.target.value)} maxLength={3000} />
          </label>
          <label className="block">
            <span className="label">Description (English)</span>
            <textarea className="input min-h-28" value={form.descriptionEn} onChange={(event) => set('descriptionEn', event.target.value)} maxLength={8000} />
          </label>
          <label className="block">
            <span className="label">Application process (English)</span>
            <textarea className="input min-h-24" value={form.applicationProcessEn} onChange={(event) => set('applicationProcessEn', event.target.value)} maxLength={4000} />
          </label>
          <label className="block">
            <span className="label">{t('scheme.requiredDocuments')} (one per line)</span>
            <textarea className="input min-h-24" value={form.requiredDocuments} onChange={(event) => set('requiredDocuments', event.target.value)} />
          </label>
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <label className="block">
            <span className="label">Official URL</span>
            <input type="url" className="input" value={form.officialUrl} onChange={(event) => set('officialUrl', event.target.value)} />
          </label>
          <label className="block">
            <span className="label">Application URL</span>
            <input type="url" className="input" value={form.applicationUrl} onChange={(event) => set('applicationUrl', event.target.value)} />
          </label>
          <label className="block">
            <span className="label">Notification number</span>
            <input className="input" value={form.notificationNumber} onChange={(event) => set('notificationNumber', event.target.value)} maxLength={120} />
          </label>
          <label className="block">
            <span className="label">{t('scheme.deadline')}</span>
            <input type="date" className="input" value={form.applicationDeadline} onChange={(event) => set('applicationDeadline', event.target.value)} />
          </label>
          <label className="block">
            <span className="label">Start date</span>
            <input type="date" className="input" value={form.startDate} onChange={(event) => set('startDate', event.target.value)} />
          </label>
          <label className="block">
            <span className="label">End date</span>
            <input type="date" className="input" value={form.endDate} onChange={(event) => set('endDate', event.target.value)} />
          </label>
        </section>

        <section className="card p-5">
          <label className="block">
            <span className="label">Eligibility rules (JSON array)</span>
            <textarea className="input min-h-56 font-mono text-xs" value={form.rules} onChange={(event) => set('rules', event.target.value)} spellCheck={false} />
          </label>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Example: <code>{'[{"field":"annualIncome","operator":"LTE","value":120000,"isRequired":true}]'}</code>. Operators: GTE, LTE, EQ, NEQ, IN, CONTAINS, EXISTS.
          </p>
        </section>

        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={busy}>
            <Save className="h-4 w-4" /> {busy ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
