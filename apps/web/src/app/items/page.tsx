import Link from 'next/link';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  PlusCircle,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  INDIAN_STATES_AND_UTS,
  ITEM_CATEGORIES,
  type PaginatedItemsResponse,
} from '@lost-found/shared';
import { searchPublicItems } from '@/lib/item-service';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ItemCard } from '@/components/items/ItemCard';

export const dynamic = 'force-dynamic';

interface ItemsPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    category?: string;
    state?: string;
    city?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

function buildQueryString(
  current: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>
): string {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value && value.trim().length > 0) {
      params.set(key, value.trim());
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const rawParams = await searchParams;
  const cleanQuery: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      cleanQuery[key] = value.trim();
    }
  }

  let data: PaginatedItemsResponse | null = null;
  let loadError: string | null = null;

  try {
    data = await searchPublicItems({
      ...cleanQuery,
      limit: '12',
    });
  } catch {
    loadError =
      'Unable to query MongoDB right now. Verify MongoDB is running and DATABASE_URL is configured.';
  }

  const hasFilters = Boolean(
    rawParams.q ||
      rawParams.type ||
      rawParams.category ||
      rawParams.state ||
      rawParams.city ||
      rawParams.status ||
      rawParams.dateFrom ||
      rawParams.dateTo
  );

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Search Lost &amp; Found Belongings
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Filter verified public reports across Indian cities, transit hubs, campuses, and institutions.
            </p>
          </div>
          <Link
            href="/report"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report Lost / Found Item</span>
          </Link>
        </div>

        {/* Multi-Factor Search & Filter Form */}
        <form
          method="GET"
          action="/items"
          className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5 relative">
              <label htmlFor="search-q" className="sr-only">
                Search keywords or reference number
              </label>
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="search-q"
                name="q"
                type="search"
                defaultValue={rawParams.q ?? ''}
                placeholder="Search item, landmark, city, or LFI reference..."
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="filter-type" className="sr-only">
                Report type
              </label>
              <select
                id="filter-type"
                name="type"
                defaultValue={rawParams.type ?? ''}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Types</option>
                <option value="LOST">Lost Only</option>
                <option value="FOUND">Found Only</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label htmlFor="filter-category" className="sr-only">
                Category
              </label>
              <select
                id="filter-category"
                name="category"
                defaultValue={rawParams.category ?? ''}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Categories</option>
                {ITEM_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="filter-status" className="sr-only">
                Status
              </label>
              <select
                id="filter-status"
                name="status"
                defaultValue={rawParams.status ?? ''}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Any Status</option>
                <option value="OPEN">Open</option>
                <option value="CLAIM_PENDING">Claim Pending</option>
                <option value="RECOVERED">Recovered</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-1">
            <div className="lg:col-span-3">
              <label
                htmlFor="filter-state"
                className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1"
              >
                State / UT
              </label>
              <select
                id="filter-state"
                name="state"
                defaultValue={rawParams.state ?? ''}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All India (36 States/UTs)</option>
                {INDIAN_STATES_AND_UTS.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label
                htmlFor="filter-city"
                className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1"
              >
                City
              </label>
              <input
                id="filter-city"
                name="city"
                type="text"
                defaultValue={rawParams.city ?? ''}
                placeholder="e.g., Mumbai"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="lg:col-span-2">
              <label
                htmlFor="filter-date-from"
                className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1"
              >
                From Date
              </label>
              <input
                id="filter-date-from"
                name="dateFrom"
                type="date"
                defaultValue={rawParams.dateFrom ?? ''}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="lg:col-span-2">
              <label
                htmlFor="filter-date-to"
                className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1"
              >
                To Date
              </label>
              <input
                id="filter-date-to"
                name="dateTo"
                type="date"
                defaultValue={rawParams.dateTo ?? ''}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="lg:col-span-3 flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>Apply Filters</span>
              </button>
              {hasFilters && (
                <Link
                  href="/items"
                  title="Reset all filters"
                  className="inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </form>

        {/* Results Section */}
        {loadError ? (
          <div
            role="alert"
            className="flex items-start gap-3 p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Live search temporarily unavailable</p>
              <p className="text-xs mt-1 opacity-90">{loadError}</p>
            </div>
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <p>
                Showing{' '}
                <strong className="text-slate-900 dark:text-white">{data.items.length}</strong> of{' '}
                <strong className="text-slate-900 dark:text-white">{data.pagination.total}</strong>{' '}
                public reports
              </p>
              <p>
                Page {data.pagination.page} of {data.pagination.totalPages}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>

            {data.pagination.totalPages > 1 && (
              <nav
                aria-label="Pagination"
                className="flex items-center justify-center gap-3 pt-4"
              >
                {data.pagination.page > 1 ? (
                  <Link
                    href={`/items${buildQueryString(rawParams, {
                      page: String(data.pagination.page - 1),
                    })}`}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </span>
                )}

                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Page {data.pagination.page} / {data.pagination.totalPages}
                </span>

                {data.pagination.page < data.pagination.totalPages ? (
                  <Link
                    href={`/items${buildQueryString(rawParams, {
                      page: String(data.pagination.page + 1),
                    })}`}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed">
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </nav>
            )}
          </>
        ) : (
          <div className="p-10 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                No matching items found
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {hasFilters
                  ? 'Try broadening your city, state, or date filters—or submit a report so you can be matched when someone reports it.'
                  : 'Be the first to submit a Lost or Found report to start building the nationwide registry.'}
              </p>
            </div>
            <div className="flex items-center justify-center flex-wrap gap-3 pt-1">
              {hasFilters && (
                <Link
                  href="/items"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Clear Filters
                </Link>
              )}
              <Link
                href="/report"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Report Lost / Found Item</span>
              </Link>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
