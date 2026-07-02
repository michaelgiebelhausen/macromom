import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import * as Notifications from 'expo-notifications';

import { initAnalytics } from '@/lib/analytics';
import { validateEnv } from '@/lib/env';
import { deepLinkFromResponse } from '@/lib/notifications';
import { initRevenueCat, linkIdentity } from '@/lib/revenuecat';
import { initSentry } from '@/lib/sentry';
import { colors } from '@/theme/tokens';

validateEnv();
initSentry();
initAnalytics();
initRevenueCat();
SplashScreen.preventAutoHideAsync();

// NFR Performance (TASK-064): cache aggressively — menus/recommendations change
// once a day, so 5 minutes of staleness costs nothing and saves refetches.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 } },
});

/**
 * Routing guard (PRD § Protected Routes):
 *  - no session            → /(auth)/sign-in
 *  - onboarding incomplete → /(auth)/onboarding
 *  - otherwise             → /(tabs)/today
 */
function RootNavigator() {
  const { session, loading: sessionLoading } = useUser();
  const { profile, loading: profileLoading } = useProfile(session?.user.id);
  const segments = useSegments() as string[];
  const router = useRouter();

  // RevenueCat appUserID = Supabase user id (TASK-054).
  useEffect(() => {
    if (session?.user.id) void linkIdentity(session.user.id);
  }, [session?.user.id]);

  // Push tap → Today with the right hall/meal preselected (TASK-040).
  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const link = deepLinkFromResponse(response);
      if (!link) return;
      router.push({
        pathname: '/(tabs)/today',
        params: {
          ...(link.hallId ? { hall: link.hallId } : {}),
          ...(link.mealPeriod ? { meal: link.mealPeriod } : {}),
          source: 'push',
        },
      });
    };
    // Cold start: handle the notification that launched the app.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (sessionLoading || (session && profileLoading)) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = inAuthGroup && segments[1] === 'onboarding';

    if (!session) {
      if (!inAuthGroup || inOnboarding) router.replace('/(auth)/sign-in');
    } else if (!profile?.onboarding_complete) {
      if (!inOnboarding) router.replace('/(auth)/onboarding');
    } else if (inAuthGroup) {
      router.replace('/(tabs)/today');
    }
  }, [sessionLoading, profileLoading, session, profile, segments, router]);

  if (sessionLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}
    />
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null; // splash stays visible

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <RootNavigator />
    </QueryClientProvider>
  );
}
