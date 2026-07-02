import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceCard } from '@/components/ui/choice-card';
import { InputNumber } from '@/components/ui/input-number';
import { track } from '@/lib/analytics';
import type { ActivityLevel, Sex } from '@/lib/macros';
import { colors, spacing, typography } from '@/theme/tokens';

import { useOnboarding } from './_layout';

const SEXES: { key: Sex; title: string }[] = [
  { key: 'male', title: 'Male' },
  { key: 'female', title: 'Female' },
  { key: 'unspecified', title: 'Prefer not to say' },
];

const ACTIVITY: { key: ActivityLevel; title: string; subtitle: string }[] = [
  { key: 'low', title: 'Mostly chill', subtitle: 'Classes, walking, not much else' },
  { key: 'moderate', title: 'Pretty active', subtitle: 'Gym or sports a few times a week' },
  { key: 'high', title: 'Very active', subtitle: 'Training hard most days' },
];

interface Errors {
  age?: string;
  height?: string;
  weight?: string;
}

function validate(age: string, ft: string, inches: string, lb: string): Errors {
  const errors: Errors = {};
  const ageN = Number(age);
  const ftN = Number(ft);
  const inN = Number(inches || '0');
  const lbN = Number(lb);

  if (!age || Number.isNaN(ageN) || ageN < 15 || ageN > 80) {
    errors.age = 'Let’s keep it between 15 and 80.';
  }
  if (!ft || Number.isNaN(ftN) || ftN < 4 || ftN > 7 || Number.isNaN(inN) || inN < 0 || inN > 11) {
    errors.height = 'Double-check that height for me?';
  }
  if (!lb || Number.isNaN(lbN) || lbN < 70 || lbN > 500) {
    errors.weight = 'That weight doesn’t look quite right.';
  }
  return errors;
}

export default function StatsStep() {
  const { state, update } = useOnboarding();
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});

  const handleNext = () => {
    const found = validate(state.age, state.heightFt, state.heightIn, state.weightLb);
    setErrors(found);
    if (Object.keys(found).length === 0 && state.sex && state.activityLevel) {
      track('onboarding_step_completed', { step: 'stats' });
      router.push('/(auth)/onboarding/halls');
    }
  };

  const canAdvance = !!state.sex && !!state.activityLevel;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Tell me a little about you</Text>
        <Text style={styles.subtitle}>Just the basics — this is how I size your plates right.</Text>

        <View style={styles.chipsRow}>
          {SEXES.map((s) => (
            <View key={s.key} style={{ flex: 1 }}>
              <ChoiceCard
                title={s.title}
                selected={state.sex === s.key}
                onPress={() => update({ sex: s.key })}
              />
            </View>
          ))}
        </View>

        <InputNumber
          label="Age"
          value={state.age}
          onChangeText={(age) => update({ age })}
          placeholder="19"
          error={errors.age}
        />
        <View style={styles.heightRow}>
          <InputNumber
            label="Height (ft)"
            value={state.heightFt}
            onChangeText={(heightFt) => update({ heightFt })}
            placeholder="5"
            style={{ flex: 1 }}
            error={errors.height}
          />
          <InputNumber
            label="(in)"
            value={state.heightIn}
            onChangeText={(heightIn) => update({ heightIn })}
            placeholder="11"
            style={{ flex: 1 }}
          />
        </View>
        <InputNumber
          label="Weight"
          value={state.weightLb}
          onChangeText={(weightLb) => update({ weightLb })}
          placeholder="165"
          suffix="lb"
          error={errors.weight}
        />

        <Text style={styles.sectionLabel}>How active are you?</Text>
        {ACTIVITY.map((a) => (
          <ChoiceCard
            key={a.key}
            title={a.title}
            subtitle={a.subtitle}
            selected={state.activityLevel === a.key}
            onPress={() => update({ activityLevel: a.key })}
          />
        ))}

        <Button
          title="Next"
          disabled={!canAdvance}
          onPress={handleNext}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h1, color: colors.onSurface },
  subtitle: { ...typography.body, color: colors.onSurfaceMuted },
  chipsRow: { flexDirection: 'row', gap: spacing.sm },
  heightRow: { flexDirection: 'row', gap: spacing.md },
  sectionLabel: { ...typography.h3, color: colors.onSurface, marginTop: spacing.sm },
});
