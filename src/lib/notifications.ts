// Push notification registration + deep-link handling (TASK-037/040, FR-006).
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Foreground pushes show as banners (quiet, no sound — warm not naggy).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Ask permission, fetch the Expo push token, and upsert it for this user.
 * Returns the token, or null when unavailable (simulator, permission denied).
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null; // no push; in-app still works (Edge Cases)

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {})).data;

  await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      expo_push_token: token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,expo_push_token' },
  );
  return token;
}

export interface PushDeepLink {
  hallId?: string;
  mealPeriod?: string;
}

/** Extract deep-link data from a tapped notification (TASK-040). */
export function deepLinkFromResponse(
  response: Notifications.NotificationResponse,
): PushDeepLink | null {
  const data = response.notification.request.content.data as Record<string, unknown> | null;
  if (!data || data.url !== '/today') return null;
  return {
    hallId: typeof data.hallId === 'string' ? data.hallId : undefined,
    mealPeriod: typeof data.mealPeriod === 'string' ? data.mealPeriod : undefined,
  };
}
