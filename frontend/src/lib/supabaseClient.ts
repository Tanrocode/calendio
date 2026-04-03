import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined);

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or anon/publishable key. Set them in frontend/.env.local'
  );
}

export const supabase = createClient(url, key, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});

const DEFAULT_BUSINESS_ID = 1;

/** Shape expected by Dashboard and legacy API calls until backend links Supabase user to a business. */
export type AppUser = {
  id: string;
  email: string | undefined;
  business_id: number;
};

export function persistAppUserFromSession(session: Session): AppUser {
  const u = session.user;
  const raw = u.user_metadata?.business_id;
  let businessId = DEFAULT_BUSINESS_ID;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    businessId = raw;
  } else if (typeof raw === 'string' && raw.trim() !== '') {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n)) businessId = n;
  }

  const appUser: AppUser = {
    id: u.id,
    email: u.email,
    business_id: businessId,
  };
  localStorage.setItem('user', JSON.stringify(appUser));
  return appUser;
}

/** Redirect after Google OAuth; must match Supabase Auth "Redirect URLs". */
export function authCallbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}
