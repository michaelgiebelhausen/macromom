import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Plate } from '@/hooks/useRecommendations';
import { colors, spacing, typography } from '@/theme/tokens';

interface RecCardProps {
  plate: Plate;
  onAte: () => void;
  onCheckPlate: () => void;
  ateLoading?: boolean;
}

/** Hero recommendation card (design.md rec-card): items, totals, why, CTAs. */
export function RecCard({ plate, onAte, onCheckPlate, ateLoading = false }: RecCardProps) {
  const hasEstimates = plate.items.some((i) => i.nutrition_source === 'estimated');
  return (
    <Card hero style={styles.card}>
      <Text style={styles.why}>{plate.why}</Text>

      <View style={styles.items}>
        {plate.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemName}>
              {item.name}
              {item.nutrition_source === 'estimated' ? ' *' : ''}
            </Text>
            {item.serving_desc ? <Text style={styles.serving}>{item.serving_desc}</Text> : null}
          </View>
        ))}
      </View>

      <View style={styles.totalsRow}>
        <View style={styles.totalCol}>
          <Text style={styles.totalValue}>{plate.totals.cal}</Text>
          <Text style={styles.totalLabel}>cal</Text>
        </View>
        <View style={styles.totalCol}>
          <Text style={styles.totalValue}>{plate.totals.protein}g</Text>
          <Text style={styles.totalLabel}>protein</Text>
        </View>
        <View style={styles.totalCol}>
          <Text style={styles.totalValue}>{plate.totals.carbs}g</Text>
          <Text style={styles.totalLabel}>carbs</Text>
        </View>
        <View style={styles.totalCol}>
          <Text style={styles.totalValue}>{plate.totals.fat}g</Text>
          <Text style={styles.totalLabel}>fat</Text>
        </View>
      </View>

      {hasEstimates ? <Text style={styles.estimateNote}>* estimated nutrition</Text> : null}

      <View style={styles.actions}>
        <Button title="I ate this" onPress={onAte} loading={ateLoading} style={styles.action} />
        <Button
          title="Check my plate"
          variant="secondary"
          onPress={onCheckPlate}
          style={styles.action}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  why: { ...typography.bodyLg, color: colors.onSurface },
  items: { gap: spacing.xs },
  itemRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  itemName: { ...typography.body, color: colors.onSurface, flexShrink: 1 },
  serving: { ...typography.caption, color: colors.onSurfaceMuted },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSunken,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  totalCol: { alignItems: 'center' },
  totalValue: {
    ...typography.numeric,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onSurface,
  },
  totalLabel: { ...typography.caption, color: colors.onSurfaceMuted },
  estimateNote: { ...typography.caption, color: colors.onSurfaceMuted },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
