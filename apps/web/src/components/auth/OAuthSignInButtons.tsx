import type { OAuthProviderStatus } from '@lost-found/shared';
import { signInWithProvider } from '@/app/login/actions';

interface OAuthSignInButtonsProps {
  providers: OAuthProviderStatus[];
  callbackUrl?: string;
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function OAuthSignInButtons({ providers, callbackUrl }: OAuthSignInButtonsProps) {
  const googleConfigured = providers.find((p) => p.id === 'google')?.configured ?? false;
  const facebookConfigured = providers.find((p) => p.id === 'facebook')?.configured ?? false;

  const googleAction = signInWithProvider.bind(null, 'google', callbackUrl);
  const facebookAction = signInWithProvider.bind(null, 'facebook', callbackUrl);

  return (
    <div className="space-y-3">
      <form action={googleAction}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          <GoogleIcon />
          <span>Continue with Google</span>
          {!googleConfigured && (
            <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Setup required
            </span>
          )}
        </button>
      </form>

      <form action={facebookAction}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-[#1877F2] hover:bg-[#166FE5] text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          <FacebookIcon />
          <span>Continue with Facebook</span>
          {!facebookConfigured && (
            <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/20 text-white">
              Setup required
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
