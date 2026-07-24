import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { BrandMark } from '../components/BrandMark';
import { InlineNotice } from '../components/InlineNotice';
import type { RootStackParamList } from '../navigation/types';
import { ImageValidationError, prepareImage, type ImageAssetLike } from '../services/image';
import { colors, radii, spacing, type } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Scanner'>;

export function ScannerScreen({ navigation, route }: Props): React.JSX.Element {
  const cameraRef = useRef<CameraView | null>(null);
  const autoLaunched = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueWithAsset = useCallback(async (asset: ImageAssetLike) => {
    setBusy(true);
    setError(null);
    try {
      const image = await prepareImage(asset);
      navigation.replace('Analyze', { image });
    } catch (caught) {
      setError(caught instanceof ImageValidationError
        ? caught.message
        : 'This photo could not be prepared. Try another image or retake it.');
    } finally {
      setBusy(false);
    }
  }, [navigation]);

  const choosePhoto = useCallback(async () => {
    if (busy) return;
    setError(null);
    try {
      const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!libraryPermission.granted) {
        setError('Photo access is off. Allow access in device settings, or use the camera instead.');
        return;
      }
      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        exif: false,
        selectionLimit: 1,
      });
      if (!selection.canceled && selection.assets[0]) {
        await continueWithAsset(selection.assets[0]);
      }
    } catch {
      setError('The photo library could not be opened. Please try again.');
    }
  }, [busy, continueWithAsset]);

  useEffect(() => {
    if (route.params?.launchLibrary && !autoLaunched.current) {
      autoLaunched.current = true;
      void choosePhoto();
    }
  }, [choosePhoto, route.params?.launchLibrary]);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || busy) return;
    setBusy(true);
    setError(null);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: false });
      if (!picture) throw new Error('No photo returned.');
      await continueWithAsset({
        uri: picture.uri,
        width: picture.width,
        height: picture.height,
        mimeType: 'image/jpeg',
        fileName: `ecolens-${Date.now()}.jpg`,
      });
    } catch {
      setError('The camera could not capture that photo. Hold steady and try again.');
      setBusy(false);
    }
  }, [busy, cameraReady, continueWithAsset]);

  if (!permission) {
    return (
      <SafeAreaView style={styles.permissionRoot}>
        <ActivityIndicator accessibilityLabel="Checking camera access" color={colors.moss} size="large" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionRoot}>
        <View style={styles.permissionContent}>
          <BrandMark size={68} />
          <Text accessibilityRole="header" style={styles.permissionTitle}>Camera access is needed for a new scan.</Text>
          <Text style={styles.permissionBody}>EcoLens only takes a photo when you press the shutter. You can also choose an existing photo.</Text>
          {permission.canAskAgain ? (
            <AppButton label="Allow camera access" onPress={() => void requestPermission()} />
          ) : (
            <InlineNotice title="Camera permission is off" body="Enable Camera for EcoLens in device settings, or choose a photo below." tone="error" />
          )}
          <AppButton label="Choose from library" variant="secondary" onPress={() => void choosePhoto()} loading={busy} />
          <AppButton label="Go back" variant="quiet" compact onPress={() => navigation.goBack()} />
          {error ? <Text accessibilityRole="alert" style={styles.permissionError}>{error}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        ref={cameraRef}
        accessibilityLabel="Camera preview for EcoLens scan"
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        onCameraReady={() => setCameraReady(true)}
        onMountError={() => setError('The camera preview could not start. You can choose a photo instead.')}
      />
      <SafeAreaView style={styles.overlay}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close camera"
            hitSlop={10}
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.roundAction, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.close}>×</Text>
          </Pressable>
          <View style={styles.modePill}>
            <View style={styles.liveDot} />
            <Text style={styles.modeText}>EVIDENCE SCAN</Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Camera light"
            accessibilityState={{ checked: torch }}
            hitSlop={10}
            onPress={() => setTorch((value) => !value)}
            style={({ pressed }) => [styles.roundAction, torch && styles.roundActionActive, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.light}>{torch ? 'ON' : 'LUX'}</Text>
          </Pressable>
        </View>

        <View style={styles.guideArea} pointerEvents="none">
          <View style={styles.focusFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <Text style={styles.guideTitle}>Fill the frame with one item</Text>
          <Text style={styles.guideBody}>Use even light. Capture labels, stem base, or distinctive surfaces when relevant.</Text>
        </View>

        <View style={styles.bottomPanel}>
          {error ? (
            <View accessibilityRole="alert" style={styles.errorPanel}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <View style={styles.captureRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose a photo from the library"
              disabled={busy}
              onPress={() => void choosePhoto()}
              style={({ pressed }) => [styles.libraryButton, { opacity: pressed || busy ? 0.55 : 1 }]}
            >
              <View style={styles.libraryPicture} />
              <Text style={styles.libraryText}>Library</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={busy ? 'Preparing photo' : cameraReady ? 'Take photo' : 'Camera is getting ready'}
              disabled={!cameraReady || busy}
              onPress={() => void takePhoto()}
              style={({ pressed }) => [styles.shutterOuter, { opacity: !cameraReady || busy ? 0.5 : pressed ? 0.72 : 1 }]}
            >
              {busy ? <ActivityIndicator color={colors.forest} /> : <View style={styles.shutterInner} />}
            </Pressable>
            <View style={styles.captureSpacer} />
          </View>
          <Text style={styles.privacy}>Your photo is sent only after capture and analysis begins.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  roundAction: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(10, 26, 20, 0.74)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  roundActionActive: { backgroundColor: colors.sun },
  close: { color: colors.white, fontSize: 31, lineHeight: 34, fontWeight: '300' },
  light: { ...type.label, color: colors.white, fontSize: 9 },
  modePill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, height: 34, borderRadius: radii.pill, backgroundColor: 'rgba(10, 26, 20, 0.74)' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.mossPale },
  modeText: { ...type.label, color: colors.white, fontSize: 10 },
  guideArea: { alignItems: 'center', paddingHorizontal: spacing.lg },
  focusFrame: { width: '90%', aspectRatio: 0.86, maxHeight: 430, position: 'relative' },
  corner: { position: 'absolute', width: 46, height: 46, borderColor: colors.white },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radii.md },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radii.md },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radii.md },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radii.md },
  guideTitle: { ...type.h3, color: colors.white, textAlign: 'center', marginTop: spacing.md, textShadowColor: colors.black, textShadowRadius: 4 },
  guideBody: { ...type.small, color: colors.white, textAlign: 'center', marginTop: spacing.xs, maxWidth: 330, textShadowColor: colors.black, textShadowRadius: 4 },
  bottomPanel: { backgroundColor: 'rgba(10, 26, 20, 0.9)', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  errorPanel: { backgroundColor: colors.coralPale, borderRadius: radii.md, padding: spacing.sm, marginBottom: spacing.sm },
  errorText: { ...type.small, color: '#702A20', textAlign: 'center' },
  captureRow: { minHeight: 86, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  libraryButton: { width: 76, alignItems: 'center', gap: 5 },
  libraryPicture: { width: 34, height: 28, borderWidth: 2, borderColor: colors.white, borderRadius: 5, backgroundColor: colors.forestSoft },
  libraryText: { ...type.small, color: colors.white },
  shutterOuter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: colors.white, backgroundColor: 'rgba(255,255,255,0.24)', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.white },
  captureSpacer: { width: 76 },
  privacy: { ...type.small, color: colors.mossPale, textAlign: 'center', fontSize: 11 },
  permissionRoot: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  permissionContent: { width: '100%', maxWidth: 440, paddingHorizontal: spacing.lg, gap: spacing.md, alignItems: 'stretch' },
  permissionTitle: { ...type.h1, color: colors.ink, textAlign: 'center' },
  permissionBody: { ...type.body, color: colors.inkMuted, textAlign: 'center', marginBottom: spacing.sm },
  permissionError: { ...type.small, color: colors.coral, textAlign: 'center' },
});
