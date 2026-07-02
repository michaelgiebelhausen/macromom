import { Stack, usePathname } from 'expo-router';
import { createContext, useContext, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Stepper } from '@/components/ui/stepper';
import type { ActivityLevel, Goal, Sex } from '@/lib/macros';
import { colors, spacing } from '@/theme/tokens';

export interface OnboardingState {
  goal: Goal | null;
  sex: Sex | null;
  age: string;
  heightFt: string;
  heightIn: string;
  weightLb: string;
  activityLevel: ActivityLevel | null;
  selectedHallIds: string[];
  primaryHallId: string | null;
}

const INITIAL: OnboardingState = {
  goal: null,
  sex: null,
  age: '',
  heightFt: '',
  heightIn: '',
  weightLb: '',
  activityLevel: null,
  selectedHallIds: [],
  primaryHallId: null,
};

interface OnboardingContextValue {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside the onboarding layout');
  return ctx;
}

const STEP_ORDER = ['goal', 'stats', 'halls', 'targets'];

export default function OnboardingLayout() {
  const [state, setState] = useState<OnboardingState>(INITIAL);
  const pathname = usePathname();

  const stepName = pathname.split('/').pop() ?? 'goal';
  const currentStep = Math.max(0, STEP_ORDER.indexOf(stepName));

  return (
    <OnboardingContext.Provider
      value={{ state, update: (patch) => setState((s) => ({ ...s, ...patch })) }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <Stepper total={STEP_ORDER.length} current={currentStep} />
        </View>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.surface },
            animation: 'slide_from_right',
          }}
        />
      </SafeAreaView>
    </OnboardingContext.Provider>
  );
}
