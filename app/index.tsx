import { Redirect } from 'expo-router';

import { useUser } from '@/hooks/useUser';

/** Root route: the layout guard owns routing; this just picks a sane target. */
export default function Index() {
  const { session, loading } = useUser();
  if (loading) return null; // root layout shows the spinner
  return <Redirect href={session ? '/(tabs)/today' : '/(auth)/sign-in'} />;
}
