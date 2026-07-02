import { StyleSheet, View, ViewProps } from 'react-native';

import { colors, rounded, shadowCard, spacing } from '@/theme/tokens';

interface CardProps extends ViewProps {
  /** rec-card uses the softer, more prominent xl radius (design.md § Shapes). */
  hero?: boolean;
}

/** card / rec-card: white raised container with a soft warm shadow. */
export function Card({ hero = false, style, children, ...rest }: CardProps) {
  return (
    <View style={[styles.base, { borderRadius: hero ? rounded.xl : rounded.lg }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceRaised,
    padding: spacing.lg,
    ...shadowCard,
  },
});
