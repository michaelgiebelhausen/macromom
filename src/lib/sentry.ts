import * as Sentry from '@sentry/react-native';

import { env } from '@/lib/env';

const TOKEN_PATTERN = /(eyJ[\w-]+\.[\w-]+\.[\w-]+|sb-[\w-]+|Bearer\s+\S+)/gi;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.]+/gi;

function scrubString(value: string): string {
  return value.replace(TOKEN_PATTERN, '[token]').replace(EMAIL_PATTERN, '[email]');
}

/** Recursively scrub tokens/emails from event payload values (PRD § Security). */
function scrub<T>(value: T): T {
  if (typeof value === 'string') return scrubString(value) as T;
  if (Array.isArray(value)) return value.map(scrub) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = /token|authorization|cookie|password|secret/i.test(k) ? '[redacted]' : scrub(v);
    }
    return out as T;
  }
  return value;
}

export function initSentry(): void {
  if (!env.sentryDsn) return; // inert without a DSN (fresh checkout, CI)
  Sentry.init({
    dsn: env.sentryDsn,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.user) {
        // Keep only the opaque id — never email/ip.
        event.user = { id: event.user.id };
      }
      if (event.extra) event.extra = scrub(event.extra);
      if (event.contexts) event.contexts = scrub(event.contexts);
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data) breadcrumb.data = scrub(breadcrumb.data);
      if (breadcrumb.message) breadcrumb.message = scrubString(breadcrumb.message);
      return breadcrumb;
    },
  });
}

export { Sentry };
