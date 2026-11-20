import Link from 'next/link';
import { Activity, Shield } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="space-y-1 text-center sm:text-left">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            © 2026 Lost &amp; Found India. Privacy-first recovery platform.
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Independent digital platform — not affiliated with any government agency unless explicitly accredited.
          </p>
        </div>

        <div className="flex items-center flex-wrap justify-center gap-4">
          <Link
            href="/items"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Browse Items
          </Link>
          <Link
            href="/report"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Report Lost/Found
          </Link>
          <Link
            href="/api/health"
            target="_blank"
            className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>System Health</span>
          </Link>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            <span>DPDP Privacy-First</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
