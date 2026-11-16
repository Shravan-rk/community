import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, Eye, Landmark } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { assessmentTone, formatDate, formatNumber, truncate } from '../lib/format';
import { Badge, DemoBadge } from './ui';
import type { SchemeSummary } from '../types';

interface Props {
  scheme: SchemeSummary;
  assessment?: { assessment: string; label: string } | null;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (slug: string) => void;
}

export function SchemeCard({ scheme, assessment, selectable, selected, onToggle }: Props) {
  const { language, t } = useApp();

  return (
    <article className={`card flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${selected ? 'ring-2 ring-brand-600' : ''}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="bg-brand-50 text-brand-800">{scheme.category.name}</Badge>
        <Badge tone="bg-slate-100 text-slate-700">
          {scheme.level === 'CENTRAL' ? t('common.central') : t('common.stateLevel')}
        </Badge>
        {scheme.isDemoData ? <DemoBadge /> : null}
        {assessment ? <Badge tone={assessmentTone(assessment.assessment)}>{assessment.label}</Badge> : null}
        {selectable ? (
          <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-earth-300 text-brand-700 focus:ring-brand-600"
              checked={Boolean(selected)}
              onChange={() => onToggle?.(scheme.slug)}
            />
            {selected ? t('schemes.selected') : ''}
          </label>
        ) : null}
      </div>

      <h3 className="text-base font-bold leading-6 text-slate-900">
        <Link to={`/schemes/${scheme.slug}`} className="hover:text-brand-800">
          {scheme.title}
        </Link>
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{truncate(scheme.summary, 190)}</p>

      <dl className="mt-4 grid gap-1.5 text-xs text-slate-500">
        <div className="flex items-start gap-1.5">
          <Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <dd className="line-clamp-2">{scheme.department}</dd>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {scheme.applicationDeadline ? (
            <span className="inline-flex items-center gap-1.5 text-amber-800">
              <CalendarClock className="h-3.5 w-3.5" />
              {t('scheme.deadline')}: {formatDate(scheme.applicationDeadline, language)}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            {formatNumber(scheme.views, language)} {t('common.views')}
          </span>
        </div>
      </dl>

      <Link to={`/schemes/${scheme.slug}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 hover:text-brand-900">
        {t('common.details')}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}
