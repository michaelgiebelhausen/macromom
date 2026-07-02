import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayRow } from '@/components/features/DayRow';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SummaryBanner } from '@/components/ui/summary-banner';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { track } from '@/lib/analytics';
import { currentMilestone, weeklySummaryLine, type DaySummary } from '@/lib/milestones';
import { supabase } from '@/lib/supabase';
import { colors, rounded, spacing, typography } from '@/theme/tokens';

interface LogRow {
  logged_at: string;
  total_calories: number | null;
  total_protein_g: number | null;
}

function lastSevenDays(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Progress() {
  const { session } = useUser();
  const { profile } = useProfile(session?.user.id);

  const logs = useQuery({
    queryKey: ['meal-logs', session?.user.id],
    enabled: !!session?.user.id,
    queryFn: async (): Promise<LogRow[]> => {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const { data, error } = await supabase
        .from('meal_logs')
        .select('logged_at, total_calories, total_protein_g')
        .eq('user_id', session!.user.id)
        .gte('logged_at', since.toISOString())
        .order('logged_at');
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    track('progress_viewed');
  }, []);

  const targetCalories = profile?.target_calories ?? 2400;
  const targetProtein = profile?.target_protein_g ?? 140;

  // Aggregate logs into the 7-day window (TASK-048).
  const byDay = new Map<string, { cal: number; protein: number }>();
  for (const log of logs.data ?? []) {
    const day = log.logged_at.slice(0, 10);
    const agg = byDay.get(day) ?? { cal: 0, protein: 0 };
    agg.cal += log.total_calories ?? 0;
    agg.protein += Number(log.total_protein_g ?? 0);
    byDay.set(day, agg);
  }
  const days: DaySummary[] = lastSevenDays().map((date) => {
    const agg = byDay.get(date);
    return {
      date,
      totalCalories: agg?.cal ?? 0,
      totalProtein: agg?.protein ?? 0,
      logged: !!agg,
    };
  });

  const hasLogs = days.some((d) => d.logged);
  const milestone = currentMilestone(days, targetProtein);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Progress</Text>

        {logs.isLoading ? (
          <View style={{ gap: spacing.sm }}>
            {[0, 1, 2].map((i) => (
              <Card key={i} style={styles.skeletonRow}>
                <View style={styles.skeletonLine} />
              </Card>
            ))}
          </View>
        ) : null}

        {!logs.isLoading && !hasLogs ? (
          <EmptyState
            icon="rose-outline"
            title="Your week starts here"
            message="Log your first meal from Today and I’ll start keeping score of your wins."
          />
        ) : null}

        {hasLogs ? (
          <>
            <SummaryBanner
              message={milestone?.message ?? weeklySummaryLine(days, targetProtein)}
              celebratory={!!milestone}
            />
            <View style={styles.legend}>
              <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
              <Text style={styles.legendText}>calories</Text>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>protein</Text>
            </View>
            <View style={{ gap: spacing.sm }}>
              {days.map((d) => (
                <DayRow
                  key={d.date}
                  label={
                    d.date === today ? 'Today' : WEEKDAY[new Date(`${d.date}T12:00:00`).getDay()]
                  }
                  calories={Math.round(d.totalCalories)}
                  protein={Math.round(d.totalProtein)}
                  targetCalories={targetCalories}
                  targetProtein={targetProtein}
                  logged={d.logged}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h1, color: colors.onSurface },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: rounded.full },
  legendText: { ...typography.caption, color: colors.onSurfaceMuted, marginRight: spacing.sm },
  skeletonRow: { paddingVertical: spacing.md },
  skeletonLine: { height: 12, borderRadius: rounded.sm, backgroundColor: colors.surfaceSunken },
});
