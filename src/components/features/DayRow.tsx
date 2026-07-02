import { StyleSheet, Text, View } from 'react-native';

import { colors, rounded, spacing, typography } from '@/theme/tokens';

interface DayRowProps {
  /** e.g. "Mon" / "Today" */
  label: string;
  calories: number;
  protein: number;
  targetCalories: number;
  targetProtein: number;
  logged: boolean;
}

/** One day in the week view (design.md day-row): simple bars, never a dashboard. */
export function DayRow({
  label,
  calories,
  protein,
  targetCalories,
  targetProtein,
  logged,
}: DayRowProps) {
  const calPct = Math.min(calories / Math.max(targetCalories, 1), 1);
  const proteinPct = Math.min(protein / Math.max(targetProtein, 1), 1);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {logged ? (
        <View style={styles.bars}>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${calPct * 100}%`, backgroundColor: colors.accent },
              ]}
            />
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${proteinPct * 100}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
        </View>
      ) : (
        <Text style={styles.rest}>rest day</Text>
      )}
      {logged ? (
        <Text style={styles.numbers}>
          {calories} cal · {protein}g P
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: rounded.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  label: { ...typography.label, color: colors.onSurface, width: 52 },
  bars: { flex: 1, gap: spacing.xs },
  barTrack: {
    height: 8,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: rounded.full },
  rest: { flex: 1, ...typography.caption, color: colors.onSurfaceMuted },
  numbers: { ...typography.caption, color: colors.onSurfaceMuted },
});
