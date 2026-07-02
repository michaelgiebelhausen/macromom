import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceCard } from '@/components/ui/choice-card';
import { track } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { colors, spacing, typography } from '@/theme/tokens';

import { useOnboarding } from './_layout';

interface Hall {
  id: string;
  name: string;
}

export default function HallsStep() {
  const { state, update } = useOnboarding();
  const router = useRouter();

  const { data: halls, isLoading } = useQuery({
    queryKey: ['halls', 'clemson'],
    queryFn: async (): Promise<Hall[]> => {
      const { data, error } = await supabase
        .from('dining_halls')
        .select('id, name')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleHall = (id: string) => {
    const selected = state.selectedHallIds.includes(id)
      ? state.selectedHallIds.filter((h) => h !== id)
      : [...state.selectedHallIds, id];
    // Primary defaults to the first selected hall; clear it if deselected.
    const primary =
      selected.length === 0
        ? null
        : state.primaryHallId && selected.includes(state.primaryHallId)
          ? state.primaryHallId
          : selected[0];
    update({ selectedHallIds: selected, primaryHallId: primary });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Where do you usually eat?</Text>
      <Text style={styles.subtitle}>
        Pick your dining halls — star the one you hit most and I’ll start there.
      </Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        (halls ?? []).map((hall) => {
          const selected = state.selectedHallIds.includes(hall.id);
          const isPrimary = state.primaryHallId === hall.id;
          return (
            <View key={hall.id} style={styles.hallRow}>
              <View style={{ flex: 1 }}>
                <ChoiceCard
                  title={hall.name}
                  subtitle={isPrimary ? 'Your main hall' : undefined}
                  selected={selected}
                  onPress={() => toggleHall(hall.id)}
                />
              </View>
              {selected ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Make ${hall.name} your main hall`}
                  onPress={() => update({ primaryHallId: hall.id })}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={isPrimary ? 'star' : 'star-outline'}
                    size={24}
                    color={isPrimary ? colors.accent : colors.onSurfaceMuted}
                  />
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}

      {!isLoading && (halls ?? []).length === 0 ? (
        <Text style={styles.subtitle}>
          Hm, I couldn’t load the halls just now. Give me a sec and try again?
        </Text>
      ) : null}

      <Button
        title="Next"
        disabled={state.selectedHallIds.length === 0}
        onPress={() => {
          track('onboarding_step_completed', { step: 'halls' });
          router.push('/(auth)/onboarding/targets');
        }}
        style={{ marginTop: spacing.md }}
      />
      {state.selectedHallIds.length === 0 ? (
        <Text style={styles.gentle}>Pick at least one hall so I know where to look!</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h1, color: colors.onSurface },
  subtitle: { ...typography.body, color: colors.onSurfaceMuted },
  hallRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  starButton: { padding: spacing.sm },
  gentle: { ...typography.caption, color: colors.onSurfaceMuted, textAlign: 'center' },
});
