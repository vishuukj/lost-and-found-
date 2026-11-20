import Link from 'next/link';
import Image from 'next/image';
import { LogIn, LogOut } from 'lucide-react';
import { auth } from '@/auth';
import { signOutUser } from '@/app/login/actions';

function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || 'U';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export async function AuthHeaderControls() {
  const session = await auth();

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Sign In</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-colors"
      >
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name || 'User avatar'}
            width={24}
            height={24}
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
            {getInitials(session.user.name, session.user.email)}
          </span>
        )}
        <span className="text-xs font-medium text-slate-800 dark:text-slate-100 max-w-[140px] truncate">
          {session.user.name || session.user.email}
        </span>
      </Link>

      <form action={signOutUser}>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </form>
    </div>
  );
}
