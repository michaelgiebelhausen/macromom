import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { useMenu, todayEt, type MealPeriod, type MenuItem } from '@/hooks/useMenu';
import { supabase } from '@/lib/supabase';
import { colors, rounded, spacing, typography } from '@/theme/tokens';

/** Dev-facing raw menu view (TASK-028): validates scraped data pre-recommendations. */
export default function MenuPreview() {
  const [mealPeriod, setMealPeriod] = useState<MealPeriod>('lunch');
  const [hallIndex, setHallIndex] = useState(0);

  const { data: halls } = useQuery({
    queryKey: ['halls', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dining_halls')
        .select('id, name')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const hall = halls?.[hallIndex];
  const menu = useMenu(hall?.id, todayEt(), mealPeriod);

  const byStation = new Map<string, MenuItem[]>();
  if (menu.data?.status === 'ok') {
    for (const item of menu.data.items) {
      const key = item.station ?? 'Other';
      if (!byStation.has(key)) byStation.set(key, []);
      byStation.get(key)!.push(item);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Menu preview (dev)</Text>

        <View style={styles.row}>
          {(halls ?? []).map((h, i) => (
            <Text
              key={h.id}
              onPress={() => setHallIndex(i)}
              style={[styles.chip, i === hallIndex && styles.chipActive]}
            >
              {h.name}
            </Text>
          ))}
        </View>
        <View style={styles.row}>
          {(['breakfast', 'lunch', 'dinner'] as MealPeriod[]).map((mp) => (
            <Text
              key={mp}
              onPress={() => setMealPeriod(mp)}
              style={[styles.chip, mp === mealPeriod && styles.chipActive]}
            >
              {mp}
            </Text>
          ))}
        </View>

        {menu.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {menu.error ? <Text style={styles.err}>Error: {String(menu.error)}</Text> : null}

        {menu.data?.status === 'closed' ? (
          <Text style={styles.empty}>Closed today — no menu was published for this meal.</Text>
        ) : null}
        {menu.data?.status === 'not-posted' ? (
          <Text style={styles.empty}>
            Menu not posted yet — check back after the morning scrape.
          </Text>
        ) : null}

        {[...byStation.entries()].map(([station, items]) => (
          <Card key={station} style={{ gap: spacing.sm }}>
            <Text style={styles.station}>{station}</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>
                    {item.name}
                    {item.nutrition_source === 'estimated' ? ' *' : ''}
                  </Text>
                  {item.serving_desc ? <Text style={styles.serving}>{item.serving_desc}</Text> : null}
                </View>
                <Text style={styles.macros}>
                  {item.calories ?? '—'} cal · {item.protein_g ?? '—'}P · {item.carbs_g ?? '—'}C ·{' '}
                  {item.fat_g ?? '—'}F
                </Text>
              </View>
            ))}
          </Card>
        ))}
        {menu.data?.status === 'ok' ? (
          <Text style={styles.footnote}>* = estimated nutrition</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h1, color: colors.onSurface },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    ...typography.caption,
    color: colors.onSurface,
    backgroundColor: colors.surfaceSunken,
    borderRadius: rounded.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  chipActive: { backgroundColor: colors.accent, color: colors.onAccent },
  station: { ...typography.h3, color: colors.primary },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemName: { ...typography.body, color: colors.onSurface },
  serving: { ...typography.caption, color: colors.onSurfaceMuted },
  macros: { ...typography.caption, color: colors.onSurfaceMuted },
  empty: { ...typography.body, color: colors.onSurfaceMuted },
  err: { ...typography.caption, color: colors.error },
  footnote: { ...typography.caption, color: colors.onSurfaceMuted },
});
