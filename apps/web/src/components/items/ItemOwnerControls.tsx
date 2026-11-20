'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, RotateCcw, Trash2, XCircle } from 'lucide-react';
import type { ItemStatus } from '@lost-found/shared';

interface ItemOwnerControlsProps {
  itemId: string;
  currentStatus: ItemStatus;
}

export function ItemOwnerControls({ itemId, currentStatus }: ItemOwnerControlsProps) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(nextStatus: 'OPEN' | 'RECOVERED' | 'CLOSED') {
    setError(null);
    setBusyAction(nextStatus);

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        setError(body.error?.message || 'Unable to update item status.');
        setBusyAction(null);
        return;
      }

      router.refresh();
      setBusyAction(null);
    } catch {
      setError('Network error while updating item status.');
      setBusyAction(null);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Archive and remove this listing from public search?')) {
      return;
    }

    setError(null);
    setBusyAction('DELETE');

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        setError(body.error?.message || 'Unable to delete this listing.');
        setBusyAction(null);
        return;
      }

      router.push('/items');
      router.refresh();
    } catch {
      setError('Network error while deleting this listing.');
      setBusyAction(null);
    }
  }

  return (
    <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Manage Your Listing</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Update the recovery status once the item is returned or remove the report.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2.5">
        {currentStatus !== 'RECOVERED' && (
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => updateStatus('RECOVERED')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white transition-colors"
          >
            {busyAction === 'RECOVERED' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Mark as Recovered</span>
          </button>
        )}

        {currentStatus !== 'CLOSED' && (
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => updateStatus('CLOSED')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-60 text-slate-800 dark:text-slate-200 transition-colors"
          >
            {busyAction === 'CLOSED' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            <span>Close Listing</span>
          </button>
        )}

        {currentStatus !== 'OPEN' && (
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => updateStatus('OPEN')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 disabled:opacity-60 text-indigo-700 dark:text-indigo-300 transition-colors"
          >
            {busyAction === 'OPEN' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>Reopen</span>
          </button>
        )}

        <button
          type="button"
          disabled={busyAction !== null}
          onClick={handleDelete}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-950 disabled:opacity-60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 transition-colors"
        >
          {busyAction === 'DELETE' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          <span>Remove Listing</span>
        </button>
      </div>
    </div>
  );
}
