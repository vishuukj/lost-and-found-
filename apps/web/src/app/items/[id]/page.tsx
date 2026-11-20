import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileBadge2,
  Lock,
  MapPin,
  ShieldCheck,
  Tag,
  UserCheck,
} from 'lucide-react';
import { ZodError } from 'zod';
import { auth } from '@/auth';
import { getPublicItemById, ItemNotFoundError } from '@/lib/item-service';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ItemOwnerControls } from '@/components/items/ItemOwnerControls';

export const dynamic = 'force-dynamic';

interface ItemDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}

function formatDateIndia(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export default async function ItemDetailPage({ params, searchParams }: ItemDetailPageProps) {
  const [{ id }, query, session] = await Promise.all([params, searchParams, auth()]);
  const viewer = session?.user?.id ? { id: session.user.id, role: session.user.role } : null;

  let item;
  try {
    item = await getPublicItemById(id, viewer);
  } catch (error: unknown) {
    if (error instanceof ZodError || error instanceof ItemNotFoundError) {
      notFound();
    }
    throw error;
  }

  const isLost = item.type === 'LOST';

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link
          href="/items"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Search Results</span>
        </Link>

        {query.created === '1' && (
          <div
            role="status"
            className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-bold">Your report has been published!</p>
              <p className="text-xs mt-0.5 opacity-90">
                Save your reference number{' '}
                {item.referenceNumber ? (
                  <strong className="font-mono">{item.referenceNumber}</strong>
                ) : (
                  'from this page'
                )}{' '}
                for tracking and handover verification. Any private clues you submitted are safely
                hidden from public view.
              </p>
            </div>
          </div>
        )}

        <article className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                  isLost
                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                }`}
              >
                {isLost ? 'Lost Item' : 'Found Item'}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                Status: {item.status.replace('_', ' ')}
              </span>
            </div>

            {item.referenceNumber && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                <FileBadge2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>{item.referenceNumber}</span>
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {item.title}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {item.publicDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm">
            <div className="flex items-start gap-3">
              <Tag className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Category
                </p>
                <p className="font-medium text-slate-900 dark:text-white">{item.category.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date {isLost ? 'Lost' : 'Found'}
                </p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {formatDateIndia(item.dateLostOrFound)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Location
                </p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {item.location.landmark ? `${item.location.landmark}, ` : ''}
                  {item.location.city}, {item.location.state}
                  {item.location.postalCode ? ` - ${item.location.postalCode}` : ''}
                </p>
                {item.address && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.address}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <UserCheck className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reported By
                </p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {item.reportedByDisplayName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Posted {formatDateIndia(item.createdAt)}</span>
                </p>
              </div>
            </div>
          </div>

          {item.institution && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
              <Building2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-slate-900 dark:text-white">
                  Managed by Institutional Tenant: {item.institution.name}
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  {item.institution.city}, {item.institution.state} · Code: {item.institution.code}
                </p>
              </div>
            </div>
          )}

          {/* Privacy & Ownership Verification Banner */}
          <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 flex items-start gap-3">
            <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs leading-relaxed text-indigo-950 dark:text-indigo-200">
              <p className="font-bold text-sm">Protected Ownership Verification</p>
              <p className="opacity-90">
                {item.hasPrivateVerificationClues
                  ? 'The reporter recorded private identifying clues that are intentionally hidden from this public page. To prevent fraudulent claims, ownership must be proven with matching details or receipts before handover.'
                  : 'To protect privacy under India’s DPDP Act, direct phone numbers and personal emails are withheld from public listings.'}
              </p>
            </div>
          </div>
        </article>

        {item.canManage ? (
          <ItemOwnerControls itemId={item.id} currentStatus={item.status} />
        ) : (
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isLost ? 'Have you found this item?' : 'Does this belong to you?'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Verified ownership claim &amp; handover workflows launch in the next phase. In the
                  meantime, you can file a matching{' '}
                  {isLost ? 'Found Item' : 'Lost Item'} report so our matching engine links both records.
                </p>
              </div>
            </div>
            <Link
              href="/report"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shrink-0"
            >
              File Matching Report
            </Link>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
