import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, typography } from '@/theme/tokens';

interface MacroRingProps {
  label: string;
  /** e.g. "42g" */
  value: string;
  /** 0..1 progress toward the target */
  progress: number;
  size?: number;
  color?: string;
}

/** Circular macro progress ring (design.md macro-ring; tabular numerals). */
export function MacroRing({
  label,
  value,
  progress,
  size = 72,
  color = colors.primary,
}: MacroRingProps) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={[styles.wrap, { width: size }]} accessibilityLabel={`${label} ${value}`}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceSunken}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.value}>{value}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...typography.numeric,
    fontSize: 15,
    lineHeight: 18,
    color: colors.onSurface,
  },
  label: { ...typography.caption, color: colors.onSurfaceMuted, marginTop: 2 },
});
