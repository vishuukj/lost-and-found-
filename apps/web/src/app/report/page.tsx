import Link from 'next/link';
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { auth } from '@/auth';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ReportItemForm } from '@/components/items/ReportItemForm';

export const dynamic = 'force-dynamic';

export default async function ReportItemPage() {
  const session = await auth();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Reporting</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Report a Lost or Found Item
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Provide clear public details for searchability while keeping secret verification marks
            strictly confidential.
          </p>
        </div>

        {session?.user ? (
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <ReportItemForm />
          </div>
        ) : (
          <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Sign in required to file a report
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Authenticating reporters prevents spam, enables secure claim alerts, and preserves a
                tamper-evident audit trail for handovers.
              </p>
            </div>
            <Link
              href="/login?callbackUrl=/report"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <span>Sign in to Continue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
