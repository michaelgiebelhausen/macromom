import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, rounded, spacing, typography } from '@/theme/tokens';

interface SummaryBannerProps {
  message: string;
  celebratory?: boolean;
}

/** Leading encouragement line on Progress (design.md summary-banner). */
export function SummaryBanner({ message, celebratory = false }: SummaryBannerProps) {
  return (
    <View style={[styles.banner, celebratory && styles.celebrate]}>
      <Ionicons
        name={celebratory ? 'sparkles' : 'heart'}
        size={20}
        color={celebratory ? colors.onAccent : colors.primary}
      />
      <Text style={[styles.text, celebratory && { color: colors.onAccent }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: rounded.lg,
    padding: spacing.md,
  },
  celebrate: { backgroundColor: colors.accent },
  text: { flex: 1, ...typography.bodyLg, color: colors.onSurface },
});
