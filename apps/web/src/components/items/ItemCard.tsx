import Link from 'next/link';
import { Building2, Calendar, Lock, MapPin, Tag } from 'lucide-react';
import type { PublicItemSummary } from '@lost-found/shared';

interface ItemCardProps {
  item: PublicItemSummary;
}

const STATUS_BADGE_MAP: Record<PublicItemSummary['status'], { label: string; className: string }> = {
  OPEN: {
    label: 'Open',
    className:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  },
  CLAIM_PENDING: {
    label: 'Claim Pending',
    className:
      'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  RECOVERED: {
    label: 'Recovered',
    className:
      'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  CLOSED: {
    label: 'Closed',
    className:
      'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  },
  EXPIRED: {
    label: 'Expired',
    className:
      'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  },
};

function formatDateIndia(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function ItemCard({ item }: ItemCardProps) {
  const isLost = item.type === 'LOST';
  const statusBadge = STATUS_BADGE_MAP[item.status];

  return (
    <Link
      href={`/items/${item.id}`}
      className="group flex flex-col justify-between p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
              isLost
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
            }`}
          >
            {isLost ? 'Lost Item' : 'Found Item'}
          </span>

          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
            {item.title}
          </h3>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
            {item.publicDescription}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="truncate font-medium text-slate-700 dark:text-slate-300">
            {item.category.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">
            {item.location.landmark ? `${item.location.landmark}, ` : ''}
            {item.location.city}, {item.location.state}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{formatDateIndia(item.dateLostOrFound)}</span>
          </span>

          {item.hasPrivateVerificationClues && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400"
              title="Hidden ownership verification clues are securely stored off public listings"
            >
              <Lock className="w-3 h-3" />
              <span>Verified Clues</span>
            </span>
          )}
        </div>

        {item.institution && (
          <div className="flex items-center gap-1.5 pt-1 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{item.institution.name}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
