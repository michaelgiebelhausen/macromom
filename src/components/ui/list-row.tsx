import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, rounded, spacing, typography } from '@/theme/tokens';

interface ListRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  showChevron?: boolean;
}

/** list-row: Settings / Progress row on a raised surface (design.md § Components). */
export function ListRow({ title, subtitle, onPress, right, showChevron = false }: ListRowProps) {
  const content = (
    <>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceMuted} />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: rounded.md,
    padding: spacing.md,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  textCol: { flex: 1, gap: 2 },
  title: { ...typography.bodyLg, color: colors.onSurface },
  subtitle: { ...typography.caption, color: colors.onSurfaceMuted },
});
