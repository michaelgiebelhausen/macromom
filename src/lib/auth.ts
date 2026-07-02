import * as AppleAuthentication from 'expo-apple-authentication';

import { supabase } from '@/lib/supabase';

/**
 * Native Sign in with Apple → Supabase session (PRD § Auth Implementation).
 * Returns null if the user cancels.
 */
export async function signInWithApple(): Promise<{ error: string | null } | null> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      return { error: 'Apple didn’t hand us a sign-in token. Give it another try?' };
    }
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) return { error: error.message };

    // Apple only provides the name on the FIRST authorization — save it now.
    const name = credential.fullName?.givenName ?? null;
    await ensureProfile(name);
    return { error: null };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    return { error: 'Something hiccuped during Apple sign-in. Try again in a sec.' };
  }
}

/** Email OTP fallback: sends a 6-digit code to the address. */
export async function sendEmailOtp(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  return { error: error ? error.message : null };
}

/** Verifies the emailed code and establishes a session. */
export async function verifyEmailOtp(
  email: string,
  token: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) return { error: error.message };
  await ensureProfile(null);
  return { error: null };
}

/** Creates the profiles row on first sign-in (idempotent). */
export async function ensureProfile(displayName: string | null): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (existing) return;

  await supabase.from('profiles').insert({ id: user.id, display_name: displayName });
}

export async function signOut(): Promise<void> {
  // Detach the RevenueCat identity before the session goes away.
  const { unlinkIdentity } = await import('@/lib/revenuecat');
  await unlinkIdentity();
  await supabase.auth.signOut();
}
