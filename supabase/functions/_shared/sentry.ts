// Minimal Sentry client for Deno Edge Functions (no SDK dependency).
// Sends store-API events; silently no-ops without SENTRY_DSN.

interface DsnParts {
  publicKey: string;
  host: string;
  projectId: string;
}

function parseDsn(dsn: string): DsnParts | null {
  const match = /^https:\/\/([^@]+)@([^/]+)\/(\d+)$/.exec(dsn.trim());
  if (!match) return null;
  return { publicKey: match[1], host: match[2], projectId: match[3] };
}

export async function captureException(
  error: unknown,
  context: Record<string, unknown> = {},
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? '') : '';
  console.error('[sentry]', message, JSON.stringify(context));

  const dsn = Deno.env.get('SENTRY_DSN');
  const parts = dsn ? parseDsn(dsn) : null;
  if (!parts) return;

  try {
    await fetch(`https://${parts.host}/api/${parts.projectId}/store/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${parts.publicKey}, sentry_client=macromom-edge/1.0`,
      },
      body: JSON.stringify({
        message: message.slice(0, 500),
        level: 'error',
        platform: 'javascript',
        timestamp: Date.now() / 1000,
        exception: {
          values: [
            { type: error instanceof Error ? error.name : 'Error', value: message.slice(0, 500) },
          ],
        },
        extra: { ...context, stack: stack.slice(0, 2000) },
        tags: { runtime: 'supabase-edge' },
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Never let telemetry break the job.
  }
}
