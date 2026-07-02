import PostHog from 'posthog-react-native';

import { env } from '@/lib/env';

/**
 * PostHog wrapper (PRD § Third-Party Services). All tracking goes through
 * `track()` so event names stay in one place and the app works with no key.
 */
let client: PostHog | null = null;

export function initAnalytics(): void {
  if (!env.posthogKey || client) return;
  client = new PostHog(env.posthogKey, { host: 'https://us.i.posthog.com' });
}

export type AnalyticsEvent =
  // Onboarding funnel (TASK-021)
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  // Magic moment (TASK-041)
  | 'recommendation_viewed'
  | 'recommendation_tapthrough'
  | 'plate_selected'
  // Logging & camera (TASK-051)
  | 'meal_logged'
  | 'plate_photo_analyzed'
  | 'progress_viewed'
  // Subscription (TASK-059)
  | 'paywall_viewed'
  | 'trial_started'
  | 'subscription_activated'
  | 'subscription_restored';

export function track(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>,
): void {
  client?.capture(event, properties);
}

export function identify(userId: string): void {
  client?.identify(userId);
}

export function resetAnalytics(): void {
  client?.reset();
}
