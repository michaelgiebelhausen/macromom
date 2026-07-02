import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text } from 'react-native';

import { Card } from '@/components/ui/card';
import { colors, spacing, typography } from '@/theme/tokens';

export interface PlateAnalysis {
  verdict: 'on_target' | 'add_more' | 'reduce';
  note: string;
  estimate?: { cal: number; protein: number; carbs: number; fat: number };
}

const VERDICT_META: Record<
  PlateAnalysis['verdict'],
  { icon: keyof typeof Ionicons.glyphMap; color: string; headline: string }
> = {
  on_target: { icon: 'heart', color: colors.success, headline: 'Right on target!' },
  add_more: { icon: 'add-circle', color: colors.info, headline: 'A touch more' },
  reduce: { icon: 'leaf', color: colors.warning, headline: 'A little lighter' },
};

/** Warm portion gut-check display (TASK-046) — soft verdicts, no lecture. */
export function PlateFeedback({ analysis }: { analysis: PlateAnalysis }) {
  const meta = VERDICT_META[analysis.verdict];
  return (
    <Card hero style={styles.card}>
      <Ionicons name={meta.icon} size={40} color={meta.color} />
      <Text style={styles.headline}>{meta.headline}</Text>
      <Text style={styles.note}>{analysis.note}</Text>
      {analysis.estimate ? (
        <Text style={styles.estimate}>
          Roughly {analysis.estimate.cal} cal · {analysis.estimate.protein}g P ·{' '}
          {analysis.estimate.carbs}g C · {analysis.estimate.fat}g F
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: spacing.sm },
  headline: { ...typography.h2, color: colors.onSurface },
  note: { ...typography.bodyLg, color: colors.onSurface, textAlign: 'center' },
  estimate: { ...typography.caption, color: colors.onSurfaceMuted },
});
