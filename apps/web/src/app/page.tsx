import Link from 'next/link';
import { ShieldCheck, Search, Building2, ArrowRight, PlusCircle, Tag } from 'lucide-react';
import { ITEM_CATEGORIES } from '@lost-found/shared';
import { auth } from '@/auth';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6">
        <section className="py-14 sm:py-20 text-center space-y-6">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Privacy-First Recovery Across All 36 States &amp; UTs
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto leading-tight">
            Connecting lost belongings with rightful owners across India
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            A trusted digital ecosystem for citizens, educational institutions, transit hubs,
            airports, and public organizations—built with private ownership verification and DPDP
            data minimization.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/report"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Lost or Found Item</span>
            </Link>
            <Link
              href="/items"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-sm transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Search Public Registry</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {session?.user && (
            <div className="pt-1 flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                <span>
                  Signed in as <strong>{session.user.name || session.user.email}</strong>
                  {session.user.provider ? ` (${session.user.provider})` : ''}
                </span>
              </div>
            </div>
          )}

          {/* Quick Category Browse */}
          <div className="pt-8 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Browse by Category
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
              {ITEM_CATEGORIES.map((category) => (
                <Link
                  key={category.id}
                  href={`/items?category=${category.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <Tag className="w-3 h-3 text-indigo-500" />
                  <span>{category.name}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 text-left max-w-4xl mx-auto">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <Search className="w-6 h-6 text-indigo-600 mb-3" />
              <h2 className="font-semibold text-base mb-1">Centralized Search</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Filter lost and found reports by category, Indian state/UT, city, date range, and
                LFI reference numbers.
              </p>
            </div>
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <Building2 className="w-6 h-6 text-indigo-600 mb-3" />
              <h2 className="font-semibold text-base mb-1">Institutional Tenants</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Multi-tenant isolation and verified staff workflows designed for universities,
                airports, metro, and railway hubs.
              </p>
            </div>
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <ShieldCheck className="w-6 h-6 text-indigo-600 mb-3" />
              <h2 className="font-semibold text-base mb-1">Private Clue Protection</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Identifying marks and serial fragments are never exposed in public search—only used
                to verify rightful ownership.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
