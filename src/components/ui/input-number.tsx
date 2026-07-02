import { StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';

import { colors, rounded, spacing, typography } from '@/theme/tokens';

interface InputNumberProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  error?: string | null;
  style?: ViewStyle;
}

/** input-number: labeled numeric field (design.md input-text at md radius). */
export function InputNumber({
  label,
  value,
  onChangeText,
  placeholder,
  suffix,
  error,
  style,
}: InputNumberProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, !!error && styles.fieldError]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.onSurfaceMuted}
          keyboardType="decimal-pad"
          accessibilityLabel={label}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { ...typography.label, color: colors.onSurface },
  field: {
    height: 52,
    backgroundColor: colors.surfaceRaised,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fieldError: { borderColor: colors.error },
  input: { flex: 1, ...typography.bodyLg, color: colors.onSurface },
  suffix: { ...typography.caption, color: colors.onSurfaceMuted },
  error: { ...typography.caption, color: colors.error },
});
