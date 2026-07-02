import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useInvalidateProfile } from '@/hooks/useProfile';
import { track } from '@/lib/analytics';
import { calculateTargets, ftInToCm, lbToKg } from '@/lib/macros';
import { supabase } from '@/lib/supabase';
import { colors, spacing, typography } from '@/theme/tokens';

import { useOnboarding } from './_layout';

const GOAL_LINE: Record<string, string> = {
  lose_fat: 'plenty of protein to keep you full while the fat comes off',
  build_muscle: 'the fuel your muscles need to grow — protein first, always',
  maintain: 'exactly what your body needs to stay strong and steady',
  eat_healthier: 'balanced, feel-good plates without overthinking it',
};

export default function TargetsStep() {
  const { state } = useOnboarding();
  const invalidateProfile = useInvalidateProfile();
  const [saved, setSaved] = useState(false);

  const targets = useMemo(() => {
    if (!state.goal || !state.sex || !state.activityLevel) return null;
    return calculateTargets({
      sex: state.sex,
      age: Number(state.age),
      heightCm: ftInToCm(Number(state.heightFt), Number(state.heightIn || '0')),
      weightKg: lbToKg(Number(state.weightLb)),
      activityLevel: state.activityLevel,
      goal: state.goal,
    });
  }, [state]);

  const save = useMutation({
    mutationFn: async () => {
      if (!targets) throw new Error('missing targets');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('not signed in');

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          goal: state.goal,
          sex: state.sex,
          age: Number(state.age),
          height_cm: ftInToCm(Number(state.heightFt), Number(state.heightIn || '0')),
          weight_kg: lbToKg(Number(state.weightLb)),
          activity_level: state.activityLevel,
          target_calories: targets.calories,
          target_protein_g: targets.proteinG,
          target_carbs_g: targets.carbsG,
          target_fat_g: targets.fatG,
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (profileError) throw profileError;

      // Replace hall selection wholesale (idempotent for re-runs).
      await supabase.from('user_halls').delete().eq('user_id', user.id);
      const { error: hallsError } = await supabase.from('user_halls').insert(
        state.selectedHallIds.map((hallId) => ({
          user_id: user.id,
          dining_hall_id: hallId,
          is_primary: hallId === state.primaryHallId,
        })),
      );
      if (hallsError) throw hallsError;
      return user.id;
    },
    onSuccess: (userId) => {
      setSaved(true);
      track('onboarding_completed');
      invalidateProfile(userId); // guard sees onboarding_complete → routes to Today
    },
  });

  if (!targets) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>
          Hm, I’m missing a couple answers. Head back a step and we’ll fix it in a jiffy.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.celebrate}>Your plan is ready! 🎉</Text>
      <Text style={styles.explain}>
        Here’s your daily target, honey — {GOAL_LINE[state.goal ?? 'maintain']}.
      </Text>

      <Card hero style={styles.targetsCard}>
        <Text style={styles.calories}>{targets.calories.toLocaleString()} cal</Text>
        <View style={styles.macroRow}>
          <View style={styles.macroCol}>
            <Text style={styles.macroValue}>{targets.proteinG}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroCol}>
            <Text style={styles.macroValue}>{targets.carbsG}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroCol}>
            <Text style={styles.macroValue}>{targets.fatG}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
        </View>
      </Card>

      <Button
        title={saved ? 'All set!' : 'Let’s eat!'}
        onPress={() => save.mutate()}
        loading={save.isPending}
        disabled={saved}
      />
      {save.isError ? (
        <Text style={styles.error}>
          Hm, that didn’t save. Check your connection and tap again for me?
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  center: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  celebrate: { ...typography.display, color: colors.onSurface, textAlign: 'center' },
  explain: { ...typography.bodyLg, color: colors.onSurfaceMuted, textAlign: 'center' },
  body: { ...typography.body, color: colors.onSurface, textAlign: 'center' },
  targetsCard: { alignItems: 'center', gap: spacing.md },
  calories: { ...typography.display, color: colors.primary },
  macroRow: { flexDirection: 'row', gap: spacing.xl },
  macroCol: { alignItems: 'center', gap: spacing.xs },
  macroValue: { ...typography.numeric, color: colors.onSurface },
  macroLabel: { ...typography.caption, color: colors.onSurfaceMuted },
  error: { ...typography.caption, color: colors.error, textAlign: 'center' },
});
