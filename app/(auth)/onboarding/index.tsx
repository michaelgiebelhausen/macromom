import { Redirect } from 'expo-router';

/** Onboarding entry: the flow starts at goal selection. */
export default function OnboardingEntry() {
  return <Redirect href="/(auth)/onboarding/goal" />;
}
