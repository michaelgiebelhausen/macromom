import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

import { PlanCard } from '@/components/features/PlanCard';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';
import { track } from '@/lib/analytics';
import {
  getDefaultOffering,
  hasProEntitlement,
  Purchases,
  restorePurchases,
  revenuecatConfigured,
} from '@/lib/revenuecat';
import { colors, spacing, typography } from '@/theme/tokens';

const VALUE_POINTS = [
  'Daily plates from your hall’s real menu, matched to your goals',
  'A warm nudge before every meal — no thinking required',
  'Snap-a-photo portion checks and weekly progress cheers',
];

export default function Paywall() {
  const router = useRouter();
  const { session } = useUser();
  const queryClient = useQueryClient();

  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selected, setSelected] = useState<'monthly' | 'annual'>('annual');
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    track('paywall_viewed');
    getDefaultOffering()
      .then(setOffering)
      .catch(() => setOffering(null));
  }, []);

  const packageFor = (plan: 'monthly' | 'annual'): PurchasesPackage | null =>
    (plan === 'monthly' ? offering?.monthly : offering?.annual) ?? null;

  const purchase = async () => {
    const pkg = packageFor(selected);
    if (!pkg) return;
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (hasProEntitlement(customerInfo)) {
        track('trial_started', { plan: selected });
        queryClient.invalidateQueries({ queryKey: ['subscription', session?.user.id] });
        Alert.alert('Welcome to the family!', 'Your week on me starts now — let’s go eat well.');
        router.back();
      }
    } catch (e: unknown) {
      if (!(e as { userCancelled?: boolean }).userCancelled) {
        Alert.alert('Hm, that didn’t go through', 'No charge was made — give it another try?');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const restore = async () => {
    try {
      const info = await restorePurchases();
      if (hasProEntitlement(info)) {
        track('subscription_restored');
        queryClient.invalidateQueries({ queryKey: ['subscription', session?.user.id] });
        Alert.alert('Welcome back!', 'Your subscription is restored — right where we left off.');
        router.back();
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

  const monthlyPrice = packageFor('monthly')?.product.priceString ?? '$6.99';
  const annualPrice = packageFor('annual')?.product.priceString ?? '$39.99';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Let me take dinner off your mind</Text>

        <View style={styles.points}>
          {VALUE_POINTS.map((point) => (
            <View key={point} style={styles.pointRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          <PlanCard
            title="Annual"
            price={annualPrice}
            detail="per year — under $3.50/month"
            badge="Best value"
            selected={selected === 'annual'}
            onPress={() => setSelected('annual')}
          />
          <PlanCard
            title="Monthly"
            price={monthlyPrice}
            detail="per month, cancel anytime"
            selected={selected === 'monthly'}
            onPress={() => setSelected('monthly')}
          />
        </View>

        {revenuecatConfigured() && offering ? (
          <Button title="Start my free week" onPress={() => void purchase()} loading={purchasing} />
        ) : (
          <Text style={styles.unavailable}>
            Subscriptions aren’t available in this build yet — check back on the App Store version.
          </Text>
        )}

        <Pressable accessibilityRole="button" onPress={() => void restore()}>
          <Text style={styles.restore}>Restore purchases</Text>
        </Pressable>

        <Text style={styles.finePrint}>
          7-day free trial, then{' '}
          {selected === 'annual' ? `${annualPrice}/year` : `${monthlyPrice}/month`}. Billed through
          your Apple ID; cancel anytime in Settings. No charge if you cancel during the trial.
        </Text>

        <Button title="Not right now" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  container: { padding: spacing.lg, gap: spacing.lg },
  title: { ...typography.h1, color: colors.onSurface, textAlign: 'center' },
  points: { gap: spacing.sm },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  pointText: { flex: 1, ...typography.body, color: colors.onSurface },
  plans: { flexDirection: 'row', gap: spacing.md },
  restore: {
    ...typography.label,
    color: colors.primary,
    textAlign: 'center',
    padding: spacing.sm,
  },
  finePrint: { ...typography.caption, color: colors.onSurfaceMuted, textAlign: 'center' },
  unavailable: { ...typography.body, color: colors.onSurfaceMuted, textAlign: 'center' },
});
