import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, rounded, shadowCard, spacing, typography } from '@/theme/tokens';

interface ChoiceCardProps {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}

/** Selectable card for one-tap choices (goal, sex, activity). */
export function ChoiceCard({ title, subtitle, selected, onPress }: ChoiceCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.textCol}>
        <Text style={[styles.title, selected && { color: colors.primary }]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: rounded.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadowCard,
  },
  selected: { borderColor: colors.primary },
  textCol: { flex: 1, gap: 2 },
  title: { ...typography.h3, color: colors.onSurface },
  subtitle: { ...typography.caption, color: colors.onSurfaceMuted },
});
