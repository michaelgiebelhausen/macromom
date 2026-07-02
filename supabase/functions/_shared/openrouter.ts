// OpenRouter client (server-side only — key never ships in the app).
// Default model is Anthropic Claude per PRD § Chosen Stack; swap via env.

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | { type: string; [key: string]: unknown }[];
}

export interface ChatOptions {
  model?: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Ask for a JSON object response. */
  json?: boolean;
  timeoutMs?: number;
}

export function openrouterConfigured(): boolean {
  return !!Deno.env.get('OPENROUTER_API_KEY');
}

export const MODELS = {
  /** cheap + fast: menu-item macro estimation, plate composition */
  fast: Deno.env.get('OPENROUTER_FAST_MODEL') ?? 'anthropic/claude-haiku-4.5',
  /** stronger: vision portion analysis */
  vision: Deno.env.get('OPENROUTER_VISION_MODEL') ?? 'anthropic/claude-sonnet-4.5',
};

export async function chatComplete(opts: ChatOptions): Promise<string> {
  const key = Deno.env.get('OPENROUTER_API_KEY');
  if (!key) throw new Error('OPENROUTER_API_KEY is not configured');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://macromom.app',
      'X-Title': 'MacroMom',
    },
    body: JSON.stringify({
      model: opts.model ?? MODELS.fast,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.2,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 45000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`openrouter HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('openrouter: empty completion');
  return content;
}

/** Parse a model JSON reply, tolerating code fences. */
export function parseJsonReply<T>(reply: string): T {
  const cleaned = reply.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned) as T;
}
