import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, rounded, spacing, typography } from '@/theme/tokens';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

/** button-primary / button-secondary (design.md § Components): 52px pill. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && isPrimary && { backgroundColor: colors.primaryHover },
        pressed && !isPrimary && { opacity: 0.85 },
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.onPrimary : colors.primary} />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: disabled
                ? colors.onSurfaceMuted
                : isPrimary
                  ? colors.onPrimary
                  : colors.primary,
            },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: rounded.full,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: 'rgba(232, 84, 64, 0.25)',
  },
  disabled: {
    backgroundColor: colors.border,
    borderWidth: 0,
  },
  text: {
    ...typography.label,
  },
});
