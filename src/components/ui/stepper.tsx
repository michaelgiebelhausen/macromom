import { StyleSheet, View } from 'react-native';

import { colors, rounded, spacing } from '@/theme/tokens';

interface StepperProps {
  total: number;
  /** 0-based index of the active step. */
  current: number;
}

/** Onboarding progress indicator: warm pill segments (TASK-019). */
export function Stepper({ total, current }: StepperProps) {
  return (
    <View style={styles.row} accessibilityLabel={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            { backgroundColor: i <= current ? colors.primary : colors.surfaceSunken },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  segment: { flex: 1, height: 6, borderRadius: rounded.full },
});
