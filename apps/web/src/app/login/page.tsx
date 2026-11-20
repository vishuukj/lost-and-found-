import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, ArrowLeft, CheckCircle2, Lock, LogOut, ShieldCheck } from 'lucide-react';
import { auth } from '@/auth';
import { getOAuthProviderStatuses } from '@/lib/auth-providers';
import { OAuthSignInButtons } from '@/components/auth/OAuthSignInButtons';
import { signOutUser } from '@/app/login/actions';

export const dynamic = 'force-dynamic';

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    provider?: string;
    callbackUrl?: string;
  }>;
}

function getAuthErrorMessage(error?: string, provider?: string): string | null {
  if (!error) {
    return null;
  }

  const providerLabel =
    provider === 'google' ? 'Google' : provider === 'facebook' ? 'Facebook' : 'OAuth';

  switch (error) {
    case 'ProviderNotConfigured':
      return `${providerLabel} authentication is not configured yet. Add ${
        provider === 'google'
          ? 'AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET'
          : provider === 'facebook'
            ? 'AUTH_FACEBOOK_ID and AUTH_FACEBOOK_SECRET'
            : 'your OAuth provider credentials'
      } in .env and restart the server.`;
    case 'AccountDisabled':
      return 'This account has been deactivated. Contact support if you believe this is an error.';
    case 'EmailRequired':
      return 'Your OAuth provider did not share an email address. Please grant email permission to sign in.';
    case 'DatabaseUnavailable':
      return 'Unable to reach MongoDB to complete sign-in. Ensure MongoDB is running and DATABASE_URL is configured.';
    case 'AccessDenied':
      return 'Sign-in was cancelled or access was denied.';
    case 'OAuthAccountNotLinked':
      return 'This email is already associated with another sign-in method.';
    case 'OAuthCallbackError':
    case 'OAuthSignin':
      return 'We could not verify your sign-in with the provider. Please check your OAuth redirect URI and try again.';
    case 'Configuration':
      return 'Authentication provider configuration is invalid. Please verify your OAuth environment variables.';
    default:
      return 'Unable to sign in right now. Please try again.';
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const [session, providers] = await Promise.all([
    auth(),
    Promise.resolve(getOAuthProviderStatuses()),
  ]);

  const errorMessage = getAuthErrorMessage(params.error, params.provider);

  return (
    <main className="min-h-screen flex flex-col justify-center items-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Lost &amp; Found India</span>
          </Link>

          <div className="flex justify-center pt-2">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-md">
              <ShieldCheck className="w-8 h-8" />
            </div>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Sign in to Lost &amp; Found India
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Use your Google or Facebook account to report lost items, submit verified claims, and track recoveries.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Sign-in could not be completed</p>
                <p className="text-xs leading-relaxed opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}

          {session?.user ? (
            <div className="space-y-5 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Authenticated Session Active</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'User avatar'}
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-full object-cover border-2 border-indigo-100 dark:border-indigo-900"
                  />
                )}
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {session.user.name || 'Verified User'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {session.user.email}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Role: {session.user.role}
                  </span>
                  {session.user.provider && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      via {session.user.provider}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/"
                  className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  Go to Home
                </Link>
                <form action={signOutUser} className="flex-1">
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <>
              <OAuthSignInButtons providers={providers} callbackUrl={params.callbackUrl} />

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                <Lock className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                <p className="leading-relaxed">
                  Privacy-first sign-in compliant with India&apos;s DPDP Act. We only access your name, email, and profile picture to identify your account—never your contacts or posts.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
