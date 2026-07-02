import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceCard } from '@/components/ui/choice-card';
import { InputNumber } from '@/components/ui/input-number';
import { ListRow } from '@/components/ui/list-row';
import { useProfile, useInvalidateProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { useUser } from '@/hooks/useUser';
import { track } from '@/lib/analytics';
import { signOut } from '@/lib/auth';
import { calculateTargets, kgToLb, lbToKg, type ActivityLevel, type Goal } from '@/lib/macros';
import { hasProEntitlement, restorePurchases } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';
import { colors, spacing, typography } from '@/theme/tokens';

const STATUS_COPY: Record<string, string> = {
  trial: 'Free trial — enjoy your week on me!',
  active: 'Active — thanks for being part of the family.',
  expired: 'Expired — restart anytime, I saved your plan.',
  none: 'No subscription yet — your free week is waiting.',
};

const GOALS: { key: Goal; title: string }[] = [
  { key: 'lose_fat', title: 'Lose fat' },
  { key: 'build_muscle', title: 'Build muscle' },
  { key: 'maintain', title: 'Maintain' },
  { key: 'eat_healthier', title: 'Eat healthier' },
];

const ACTIVITY: { key: ActivityLevel; title: string }[] = [
  { key: 'low', title: 'Mostly chill' },
  { key: 'moderate', title: 'Pretty active' },
  { key: 'high', title: 'Very active' },
];

export default function Settings() {
  const { session } = useUser();
  const { profile } = useProfile(session?.user.id);
  const { data: subscription } = useSubscription(session?.user.id);
  const invalidateProfile = useInvalidateProfile();
  const queryClient = useQueryClient();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [weightLb, setWeightLb] = useState('');
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  // Seed the form when the profile first arrives (state-adjust-during-render pattern).
  if (profile && seededFor !== profile.id) {
    setSeededFor(profile.id);
    setGoal(profile.goal);
    setActivity(profile.activity_level);
    if (profile.weight_kg) setWeightLb(String(Math.round(kgToLb(profile.weight_kg))));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!profile || !goal || !activity) throw new Error('profile not loaded');
      const weightKg = lbToKg(Number(weightLb));
      if (!weightLb || Number.isNaN(weightKg) || weightKg < 30 || weightKg > 250) {
        throw new Error('That weight doesn’t look quite right — mind double-checking?');
      }
      // Recompute targets from the updated stats (FR-012).
      const targets = calculateTargets({
        sex: (profile.sex as 'male' | 'female' | null) ?? 'unspecified',
        age: profile.age ?? 20,
        heightCm: profile.height_cm ?? 170,
        weightKg,
        activityLevel: activity,
        goal,
      });
      const { error } = await supabase
        .from('profiles')
        .update({
          goal,
          weight_kg: weightKg,
          activity_level: activity,
          target_calories: targets.calories,
          target_protein_g: targets.proteinG,
          target_carbs_g: targets.carbsG,
          target_fat_g: targets.fatG,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      if (error) throw error;
      return profile.id;
    },
    onSuccess: (userId) => {
      invalidateProfile(userId);
      Alert.alert('All updated!', 'I refreshed your targets to match — you’re all set.');
    },
    onError: (e: Error) => Alert.alert('One sec', e.message),
  });

  const handleRestore = async () => {
    try {
      const info = await restorePurchases();
      if (hasProEntitlement(info)) {
        track('subscription_restored');
        queryClient.invalidateQueries({ queryKey: ['subscription', session?.user.id] });
        Alert.alert('Welcome back!', 'Your subscription is restored.');
      } else {
        Alert.alert(
          'Nothing to restore yet',
          'I couldn’t find a past subscription on this Apple ID.',
        );
      }
    } catch {
      Alert.alert('Hm, that didn’t work', 'Give it a sec and try restoring again?');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You can always come back — I’ll keep your targets warm.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently removes your profile, logs, and photos. There’s no undo.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.functions.invoke('delete-account', { body: {} });
            if (error) {
              Alert.alert('Hm, that didn’t finish', 'Try again in a moment?');
            } else {
              await signOut();
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Settings</Text>

        {profile ? (
          <>
            <Card style={styles.targetsCard}>
              <Text style={styles.sectionTitle}>Your daily targets</Text>
              <Text style={styles.targets}>
                {profile.target_calories ?? '—'} cal · {profile.target_protein_g ?? '—'}g P ·{' '}
                {profile.target_carbs_g ?? '—'}g C · {profile.target_fat_g ?? '—'}g F
              </Text>
            </Card>

            <Text style={styles.sectionTitle}>Goal</Text>
            <View style={styles.grid}>
              {GOALS.map((g) => (
                <View key={g.key} style={styles.gridItem}>
                  <ChoiceCard
                    title={g.title}
                    selected={goal === g.key}
                    onPress={() => setGoal(g.key)}
                  />
                </View>
              ))}
            </View>

            <InputNumber label="Weight" value={weightLb} onChangeText={setWeightLb} suffix="lb" />

            <Text style={styles.sectionTitle}>Activity</Text>
            <View style={styles.grid}>
              {ACTIVITY.map((a) => (
                <View key={a.key} style={styles.gridItem}>
                  <ChoiceCard
                    title={a.title}
                    selected={activity === a.key}
                    onPress={() => setActivity(a.key)}
                  />
                </View>
              ))}
            </View>

            <Button
              title="Save & refresh my targets"
              onPress={() => save.mutate()}
              loading={save.isPending}
            />
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={{ gap: spacing.sm }}>
          <ListRow
            title="Status"
            subtitle={STATUS_COPY[subscription?.dbStatus ?? 'none']}
          />
          <ListRow
            title="Manage Subscription"
            subtitle="Opens Apple’s subscription settings"
            showChevron
            onPress={() => void Linking.openURL('https://apps.apple.com/account/subscriptions')}
          />
          <ListRow
            title="Restore Purchases"
            subtitle="New phone? Bring your plan over."
            showChevron
            onPress={() => void handleRestore()}
          />
        </View>

        <Text style={styles.sectionTitle}>Legal & account</Text>
        <View style={{ gap: spacing.sm }}>
          <ListRow
            title="Privacy Policy"
            subtitle="What I keep, what I never share"
            showChevron
            onPress={() => void Linking.openURL('https://macromom.app/privacy')}
          />
          <ListRow
            title="Delete Account"
            subtitle="Permanently remove everything"
            showChevron
            onPress={handleDeleteAccount}
          />
        </View>

        <Button title="Sign out" variant="secondary" onPress={handleSignOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h1, color: colors.onSurface },
  sectionTitle: { ...typography.h3, color: colors.onSurface, marginTop: spacing.sm },
  targetsCard: { gap: spacing.xs },
  targets: { ...typography.numeric, fontSize: 17, lineHeight: 22, color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridItem: { flexBasis: '47%', flexGrow: 1 },
});
