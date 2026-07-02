import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InputNumber } from '@/components/ui/input-number';
import { ListRow } from '@/components/ui/list-row';
import { colors, spacing, typography } from '@/theme/tokens';

/** Dev-facing gallery: every UI primitive rendered on-brand (TASK-010 verify). */
export default function DesignDemo() {
  const [weight, setWeight] = useState('165');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.display}>Display / Nunito 800</Text>
        <Text style={styles.h1}>Heading 1</Text>
        <Text style={styles.body}>
          Body text in Inter — warm espresso on cream, comfy line height.
        </Text>
        <Text style={styles.numeric}>132g · 45g · 28g</Text>

        <Button title="Primary button" onPress={() => {}} />
        <Button title="Secondary button" variant="secondary" onPress={() => {}} />
        <Button title="Disabled button" disabled onPress={() => {}} />

        <InputNumber label="Weight" value={weight} onChangeText={setWeight} suffix="lb" />

        <Card>
          <Text style={styles.h3}>Card title</Text>
          <Text style={styles.body}>Standard card at lg radius with a soft warm shadow.</Text>
        </Card>

        <Card hero>
          <Text style={styles.h3}>Hero rec-card</Text>
          <Text style={styles.body}>The daily recommendation uses the xl radius.</Text>
        </Card>

        <View style={{ gap: spacing.sm }}>
          <ListRow title="List row" subtitle="With a subtitle" showChevron onPress={() => {}} />
          <ListRow title="Static row" subtitle="No press handler" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  container: { padding: spacing.lg, gap: spacing.md },
  display: { ...typography.display, color: colors.onSurface },
  h1: { ...typography.h1, color: colors.onSurface },
  h3: { ...typography.h3, color: colors.onSurface },
  body: { ...typography.body, color: colors.onSurface },
  numeric: { ...typography.numeric, color: colors.primary },
});
