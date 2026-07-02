import { useEffect } from 'react';

import { registerPushToken } from '@/lib/notifications';

/** Register + persist the push token once a session exists (TASK-037). */
export function usePushToken(userId: string | undefined, onboardingComplete: boolean) {
  useEffect(() => {
    if (!userId || !onboardingComplete) return;
    registerPushToken(userId).catch((err) => {
      console.warn('[push] registration failed', err);
    });
  }, [userId, onboardingComplete]);
}
