import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceCard } from '@/components/ui/choice-card';
import { track } from '@/lib/analytics';
import type { Goal } from '@/lib/macros';
import { colors, spacing, typography } from '@/theme/tokens';

import { useOnboarding } from './_layout';

const GOALS: { key: Goal; title: string; subtitle: string }[] = [
  { key: 'lose_fat', title: 'Lose fat', subtitle: 'Lean out without feeling hungry all day' },
  { key: 'build_muscle', title: 'Build muscle', subtitle: 'Fuel your lifts and grow stronger' },
  { key: 'maintain', title: 'Maintain', subtitle: 'Stay right where you are, just eat smarter' },
  {
    key: 'eat_healthier',
    title: 'Eat healthier',
    subtitle: 'No big goal — just better plates every day',
  },
];

export default function GoalStep() {
  const { state, update } = useOnboarding();
  const router = useRouter();

  useEffect(() => {
    track('onboarding_started');
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>What are we working toward, sweetie?</Text>
      <Text style={styles.subtitle}>Pick the one that fits — I’ll build your plan around it.</Text>
      {GOALS.map((g) => (
        <ChoiceCard
          key={g.key}
          title={g.title}
          subtitle={g.subtitle}
          selected={state.goal === g.key}
          onPress={() => update({ goal: g.key })}
        />
      ))}
      <Button
        title="Next"
        disabled={!state.goal}
        onPress={() => {
          track('onboarding_step_completed', { step: 'goal' });
          router.push('/(auth)/onboarding/stats');
        }}
        style={{ marginTop: spacing.md }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h1, color: colors.onSurface },
  subtitle: { ...typography.body, color: colors.onSurfaceMuted, marginBottom: spacing.sm },
});
