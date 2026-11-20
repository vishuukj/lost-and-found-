import Link from 'next/link';
import { ShieldCheck, Search, PlusCircle } from 'lucide-react';
import { AuthHeaderControls } from '@/components/auth/AuthHeaderControls';

export async function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="p-2 bg-indigo-600 rounded-lg text-white group-hover:bg-indigo-700 transition-colors">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Lost &amp; Found India
            </span>
            <span className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400">
              Nationwide Recovery Network
            </span>
          </div>
        </Link>

        <nav aria-label="Primary navigation" className="flex items-center flex-wrap gap-2 sm:gap-3">
          <Link
            href="/items"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Items</span>
          </Link>
          <Link
            href="/report"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Report Item</span>
          </Link>
          <AuthHeaderControls />
        </nav>
      </div>
    </header>
  );
}
