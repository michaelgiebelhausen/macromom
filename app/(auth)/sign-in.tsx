import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { sendEmailOtp, signInWithApple, verifyEmailOtp } from '@/lib/auth';
import { colors, rounded, spacing, typography } from '@/theme/tokens';

type EmailStep = 'closed' | 'enter-email' | 'enter-code';

export default function SignIn() {
  const [emailStep, setEmailStep] = useState<EmailStep>('closed');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const handleApple = async () => {
    setBusy(true);
    const result = await signInWithApple();
    setBusy(false);
    if (result?.error) Alert.alert('Hm, that didn’t work', result.error);
    // success → session change routes us forward (root layout guard)
  };

  const handleSendCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert('One sec', 'That email doesn’t look quite right — mind double-checking?');
      return;
    }
    setBusy(true);
    const { error } = await sendEmailOtp(email.trim());
    setBusy(false);
    if (error) {
      Alert.alert('Hm, that didn’t work', error);
    } else {
      setEmailStep('enter-code');
    }
  };

  const handleVerifyCode = async () => {
    setBusy(true);
    const { error } = await verifyEmailOtp(email.trim(), code.trim());
    setBusy(false);
    if (error) {
      Alert.alert('Almost!', 'That code didn’t match — check the email and try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>MacroMom</Text>
          <Text style={styles.tagline}>
            Hi sweetie! I’ll turn your dining hall’s menu into meals that fit your goals.
          </Text>
        </View>

        <View style={styles.actions}>
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={rounded.full}
              style={styles.appleButton}
              onPress={handleApple}
            />
          )}

          {emailStep === 'closed' && (
            <Button
              title="Continue with email"
              variant="secondary"
              onPress={() => setEmailStep('enter-email')}
            />
          )}

          {emailStep === 'enter-email' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="you@school.edu"
                placeholderTextColor={colors.onSurfaceMuted}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                accessibilityLabel="Email address"
              />
              <Button title="Send me a code" onPress={handleSendCode} loading={busy} />
            </>
          )}

          {emailStep === 'enter-code' && (
            <>
              <Text style={styles.hint}>
                Check your inbox — I sent a 6-digit code to {email.trim()}.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                placeholderTextColor={colors.onSurfaceMuted}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                accessibilityLabel="Six digit code"
              />
              <Button
                title="Sign me in"
                onPress={handleVerifyCode}
                loading={busy}
                disabled={code.trim().length !== 6}
              />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    paddingBottom: spacing['2xl'],
  },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  title: { ...typography.display, color: colors.primary },
  tagline: {
    ...typography.bodyLg,
    color: colors.onSurface,
    textAlign: 'center',
    maxWidth: 300,
  },
  actions: { gap: spacing.md },
  appleButton: { height: 52 },
  input: {
    height: 52,
    backgroundColor: colors.surfaceRaised,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.bodyLg,
    color: colors.onSurface,
  },
  hint: { ...typography.body, color: colors.onSurfaceMuted, textAlign: 'center' },
});
