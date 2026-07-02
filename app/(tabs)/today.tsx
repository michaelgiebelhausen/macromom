import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecCard } from '@/components/features/RecCard';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useMealLog } from '@/hooks/useMealLog';
import { useMenu, todayEt, type MealPeriod } from '@/hooks/useMenu';
import { useProfile } from '@/hooks/useProfile';
import { usePushToken } from '@/hooks/usePushToken';
import { useRecommendations, RecommendError } from '@/hooks/useRecommendations';
import { useUser } from '@/hooks/useUser';
import { useUserHalls } from '@/hooks/useUserHalls';
import { track } from '@/lib/analytics';
import { colors, rounded, spacing, typography } from '@/theme/tokens';

function defaultMeal(): MealPeriod {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  return 'dinner';
}

function greeting(name: string | null): string {
  const hour = new Date().getHours();
  const base = hour < 12 ? 'Morning' : hour < 17 ? 'Hey' : 'Evening';
  return name ? `${base}, ${name}!` : `${base}, sweetie!`;
}

export default function Today() {
  const router = useRouter();
  const params = useLocalSearchParams<{ hall?: string; meal?: string; source?: string }>();
  const { session } = useUser();
  const { profile } = useProfile(session?.user.id);
  const { data: halls } = useUserHalls(session?.user.id);

  const [selectedHallId, setSelectedHallId] = useState<string | undefined>(undefined);
  const [mealPeriod, setMealPeriod] = useState<MealPeriod>(
    (params.meal as MealPeriod) || defaultMeal(),
  );

  usePushToken(session?.user.id, profile?.onboarding_complete ?? false);

  // Hall: deep-link param wins; else primary hall once loaded.
  const hallId =
    selectedHallId ??
    (params.hall as string | undefined) ??
    halls?.find((h) => h.isPrimary)?.id ??
    halls?.[0]?.id;

  const recs = useRecommendations(hallId, mealPeriod);
  const menu = useMenu(hallId, todayEt(), mealPeriod); // distinguishes closed vs not-posted

  useEffect(() => {
    if (params.source === 'push') track('recommendation_tapthrough', { meal: mealPeriod });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.source]);

  useEffect(() => {
    if (recs.data) track('recommendation_viewed', { meal: mealPeriod, cached: recs.data.cached });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recs.data]);

  const logMeal = useMealLog(session?.user.id);

  const handleAte = (plateIndex: number) => {
    const plate = recs.data?.plates[plateIndex];
    if (!plate) return;
    track('plate_selected', { meal: mealPeriod, plate: plateIndex });
    logMeal.mutate(
      { mealPeriod, plate },
      {
        onSuccess: () =>
          Alert.alert('Logged it!', 'So proud of you — check Progress to see your week stack up.'),
        onError: () =>
          Alert.alert('Hm, that didn’t save', 'Check your connection and tap again for me?'),
      },
    );
  };

  const handleCheckPlate = () => {
    router.push({ pathname: '/plate-camera', params: { meal: mealPeriod } });
  };

  const recError = recs.error instanceof RecommendError ? recs.error : null;
  const menuStatus = menu.data?.status;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={recs.isRefetching}
            onRefresh={() => recs.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.greeting}>{greeting(profile?.display_name ?? null)}</Text>
        <Text style={styles.subtitle}>Here’s what I’d plate for you today.</Text>

        {(halls?.length ?? 0) > 1 ? (
          <View style={styles.chipRow}>
            {halls!.map((h) => (
              <Text
                key={h.id}
                accessibilityRole="button"
                accessibilityState={{ selected: h.id === hallId }}
                suppressHighlighting
                onPress={() => setSelectedHallId(h.id)}
                style={[styles.chip, h.id === hallId && styles.chipActive]}
              >
                {h.name}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.segmented}>
          {(['breakfast', 'lunch', 'dinner'] as MealPeriod[]).map((mp) => (
            <Text
              key={mp}
              accessibilityRole="button"
              accessibilityState={{ selected: mp === mealPeriod }}
              suppressHighlighting
              onPress={() => setMealPeriod(mp)}
              style={[styles.segment, mp === mealPeriod && styles.segmentActive]}
            >
              {mp.charAt(0).toUpperCase() + mp.slice(1)}
            </Text>
          ))}
        </View>

        {recs.isLoading ? (
          <View style={{ gap: spacing.md }}>
            {[0, 1].map((i) => (
              <Card key={i} hero style={styles.skeleton}>
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, { width: '60%' }]} />
                <View style={[styles.skeletonLine, { width: '80%' }]} />
              </Card>
            ))}
          </View>
        ) : null}

        {recError?.code === 'NO_MENU' ? (
          menuStatus === 'closed' ? (
            <EmptyState
              icon="moon-outline"
              title="Closed today"
              message="This hall isn’t serving today. Check another hall — I’ll find you something good."
            />
          ) : (
            <EmptyState
              icon="time-outline"
              title="Menu’s not up yet"
              message="The dining hall hasn’t posted this menu yet — I’ll have plates ready the second it lands."
              actionTitle="Check again"
              onAction={() => recs.refetch()}
            />
          )
        ) : null}

        {recError?.code === 'ONBOARDING' ? (
          <EmptyState
            icon="sparkles-outline"
            title="Let’s finish setting up"
            message="Finish your quick setup so I can build plates around your goals."
          />
        ) : null}

        {recError?.code === 'PAYWALL' ? (
          <EmptyState
            icon="heart-outline"
            title="Your free week is waiting"
            message="Start your trial and I’ll have today’s plates ready before you reach the hall."
            actionTitle="Start my free week"
            onAction={() => router.push('/paywall')}
          />
        ) : null}

        {recError?.code === 'UNKNOWN' ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Hmm, that didn’t load"
            message="I couldn’t reach the menu just now. Give me a sec and try again?"
            actionTitle="Try again"
            onAction={() => recs.refetch()}
          />
        ) : null}

        {recs.data?.note ? <Text style={styles.note}>{recs.data.note}</Text> : null}

        {recs.data?.plates.map((plate, i) => (
          <RecCard
            key={i}
            plate={plate}
            onAte={() => handleAte(i)}
            onCheckPlate={handleCheckPlate}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  container: { padding: spacing.lg, gap: spacing.md },
  greeting: { ...typography.h1, color: colors.onSurface },
  subtitle: { ...typography.body, color: colors.onSurfaceMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    ...typography.caption,
    color: colors.onSurface,
    backgroundColor: colors.surfaceSunken,
    borderRadius: rounded.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 12, // ≥44pt tap target with the text line (NFR a11y)
    overflow: 'hidden',
  },
  chipActive: { backgroundColor: colors.accent, color: colors.onAccent },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSunken,
    borderRadius: rounded.full,
    padding: spacing.xs,
  },
  segment: {
    ...typography.label,
    flex: 1,
    textAlign: 'center',
    color: colors.onSurfaceMuted,
    paddingVertical: 13, // ≥44pt tap target (NFR a11y)
    borderRadius: rounded.full,
    overflow: 'hidden',
  },
  segmentActive: { backgroundColor: colors.surfaceRaised, color: colors.primary },
  note: { ...typography.body, color: colors.onSurfaceMuted, fontStyle: 'italic' },
  skeleton: { gap: spacing.sm },
  skeletonLine: {
    height: 14,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceSunken,
    width: '100%',
  },
});
