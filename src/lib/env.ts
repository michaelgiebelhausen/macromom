// Public environment variables. EXPO_PUBLIC_* values are inlined at build time,
// so each must be referenced as a literal `process.env.EXPO_PUBLIC_X` expression.

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
  revenuecatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
} as const;

/** Required for the app to function at all. Others degrade gracefully. */
const REQUIRED: (keyof typeof env)[] = ['supabaseUrl', 'supabaseAnonKey'];

/** Returns the names of missing required env values (empty array = healthy). */
export function missingEnv(): string[] {
  return REQUIRED.filter((key) => !env[key]);
}

/**
 * Call once at startup. Logs loudly in dev; never crashes the app in production —
 * screens that need a missing service surface their own friendly error state.
 */
export function validateEnv(): void {
  const missing = missingEnv();
  if (missing.length > 0 && __DEV__) {
    console.warn(
      `[MacroMom] Missing required env values: ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill them in.',
    );
  }
}
