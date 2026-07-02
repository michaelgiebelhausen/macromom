import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, rounded, shadowCard, spacing, typography } from '@/theme/tokens';

interface PlanCardProps {
  title: string;
  price: string;
  detail: string;
  badge?: string;
  selected: boolean;
  onPress: () => void;
}

/** Paywall plan option (design.md plan-card): selectable, warm, no fine-print wall. */
export function PlanCard({ title, price, detail, badge, selected, onPress }: PlanCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} ${price}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        pressed && { opacity: 0.9 },
      ]}
    >
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.price}>{price}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: rounded.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadowCard,
  },
  selected: { borderColor: colors.primary },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: rounded.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { ...typography.caption, color: colors.onAccent },
  title: { ...typography.h3, color: colors.onSurface },
  price: { ...typography.numeric, fontSize: 22, lineHeight: 26, color: colors.primary },
  detail: { ...typography.caption, color: colors.onSurfaceMuted },
});
