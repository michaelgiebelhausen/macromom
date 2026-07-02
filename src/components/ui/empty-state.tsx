import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { colors, spacing, typography } from '@/theme/tokens';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
}

/** Warm empty/error state (design.md: never clinical, never "No data"). */
export function EmptyState({
  icon = 'cafe-outline',
  title,
  message,
  actionTitle,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={44} color={colors.accent} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionTitle && onAction ? (
        <Button title={actionTitle} variant="secondary" onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing['2xl'] },
  title: { ...typography.h3, color: colors.onSurface, textAlign: 'center' },
  message: {
    ...typography.body,
    color: colors.onSurfaceMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  action: { marginTop: spacing.sm, alignSelf: 'stretch' },
});
