import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlateFeedback, type PlateAnalysis } from '@/components/features/PlateFeedback';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useMealLog } from '@/hooks/useMealLog';
import { useUser } from '@/hooks/useUser';
import { track } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { colors, rounded, spacing, typography } from '@/theme/tokens';

type Stage = 'ready' | 'captured' | 'analyzing' | 'result' | 'error';

/** Base64 → bytes (Hermes provides atob). */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export default function PlateCamera() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recommendationId?: string; meal?: string }>();
  const { session } = useUser();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [stage, setStage] = useState<Stage>('ready');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PlateAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const mealPeriod = (params.meal as 'breakfast' | 'lunch' | 'dinner') || 'lunch';
  const logMeal = useMealLog(session?.user.id);

  const capture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.9 });
    if (!photo) return;
    // Downscale + re-encode: caps size well under 4 MB and strips EXIF/location.
    const processed = await ImageManipulator.manipulateAsync(
      photo.uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: false },
    );
    setPhotoUri(processed.uri);
    setStage('captured');
  };

  const uploadOnce = async (path: string): Promise<void> => {
    const withBase64 = await ImageManipulator.manipulateAsync(photoUri!, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    const { error } = await supabase.storage
      .from('plate-photos')
      .upload(path, base64ToBytes(withBase64.base64!), {
        contentType: 'image/jpeg',
        upsert: true,
      });
    if (error) throw error;
  };

  const analyze = async () => {
    if (!photoUri || !session) return;
    setStage('analyzing');
    const path = `${session.user.id}/${Date.now()}.jpg`;

    try {
      // Upload with one retry (Edge Cases → upload fails → retry once).
      try {
        await uploadOnce(path);
      } catch {
        await uploadOnce(path);
      }
      setPhotoPath(path);

      const { data, error } = await supabase.functions.invoke('analyze-plate', {
        body: {
          imagePath: path,
          ...(params.recommendationId ? { recommendationId: params.recommendationId } : {}),
        },
      });
      if (error) {
        const context = (error as { context?: Response }).context;
        if (context?.status === 422) {
          setErrorMessage('I couldn’t quite make that out — mind trying a clearer photo?');
        } else {
          setErrorMessage('Hmm, I couldn’t check that plate just now. Try again in a sec?');
        }
        setStage('error');
        return;
      }
      setAnalysis(data as PlateAnalysis);
      setStage('result');
      track('plate_photo_analyzed', { verdict: (data as PlateAnalysis).verdict });
    } catch {
      setErrorMessage('The upload hiccuped — check your connection and try again?');
      setStage('error');
    }
  };

  const attachToLog = () => {
    if (!analysis) return;
    logMeal.mutate(
      {
        mealPeriod,
        recommendationId: params.recommendationId,
        photoPath: photoPath ?? undefined,
        portionFeedback: { verdict: analysis.verdict, note: analysis.note },
      },
      { onSuccess: () => router.back() },
    );
  };

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState
          icon="camera-outline"
          title="Camera time!"
          message="Let me peek at your plate so I can give you a quick portion gut-check."
          actionTitle="Allow camera"
          onAction={() => void requestPermission()}
        />
        <Button title="Maybe later" variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {stage === 'ready' ? (
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View style={styles.frameGuide} pointerEvents="none" />
          <Text style={styles.hint}>Center your plate in the frame</Text>
          <Button title="Snap it" onPress={() => void capture()} />
        </View>
      ) : null}

      {stage === 'captured' && photoUri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: photoUri }} style={styles.preview} />
          <View style={styles.row}>
            <Button
              title="Retake"
              variant="secondary"
              onPress={() => setStage('ready')}
              style={{ flex: 1 }}
            />
            <Button title="Check it" onPress={() => void analyze()} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}

      {stage === 'analyzing' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.analyzing}>Taking a look… this’ll just take a moment.</Text>
        </View>
      ) : null}

      {stage === 'result' && analysis ? (
        <View style={styles.resultWrap}>
          <PlateFeedback analysis={analysis} />
          <Button title="Save with my log" onPress={attachToLog} loading={logMeal.isPending} />
          <Button title="Done" variant="secondary" onPress={() => router.back()} />
        </View>
      ) : null}

      {stage === 'error' ? (
        <View style={styles.resultWrap}>
          <EmptyState icon="camera-reverse-outline" title="One more try?" message={errorMessage} />
          <Button title="Retake photo" onPress={() => setStage('ready')} />
          <Button title="Not now" variant="secondary" onPress={() => router.back()} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.md },
  cameraWrap: { flex: 1, gap: spacing.md },
  camera: { flex: 1, borderRadius: rounded.lg, overflow: 'hidden' },
  frameGuide: {
    position: 'absolute',
    top: '18%',
    left: '12%',
    right: '12%',
    height: '45%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 999,
  },
  hint: { ...typography.caption, color: colors.onSurfaceMuted, textAlign: 'center' },
  previewWrap: { flex: 1, gap: spacing.md },
  preview: { flex: 1, borderRadius: rounded.lg },
  row: { flexDirection: 'row', gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  analyzing: { ...typography.body, color: colors.onSurfaceMuted },
  resultWrap: { flex: 1, justifyContent: 'center', gap: spacing.md },
});
