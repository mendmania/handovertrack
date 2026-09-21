import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Button, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectDetailOptions } from '@handovertrack/query';
import type { Scope } from '@handovertrack/contracts';
import type { CaptureTicket, CaptureRecord } from '../../src/media/types';
import { capturesCommitted } from '../../src/capture/query';
import { useWorkspace } from '../../src/providers';
import { styles } from '../../src/ui';

export default function CapturePage() {
  const { id } = useLocalSearchParams<{ id: string }>(); const workspace = useWorkspace();
  if (!workspace.ready || workspace.busy) return <ActivityIndicator />;
  if (!workspace.identity) return <Redirect href="/" />;
  return <Capture key={`${workspace.identity.scope.accountId}:${workspace.identity.scope.organizationId}:${id}`} scope={workspace.identity.scope} projectId={id} />;
}
function Capture({ scope, projectId }: { scope: Scope; projectId: string }) {
  const workspace = useWorkspace(); const { captures, coordinator } = workspace; const client = useQueryClient();
  const camera = useRef<CameraView>(null); const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false); const [active, setActive] = useState(AppState.currentState === 'active');
  const [cameraReady, setCameraReady] = useState(false); const [cameraError, setCameraError] = useState('');
  const [saved, setSaved] = useState<CaptureRecord | null>(null); const saving = useRef(false);
  useFocusEffect(useCallback(() => { setFocused(true); void getPermission().catch(() => setCameraError('Camera permission could not be checked.')); return () => { setFocused(false); setCameraReady(false); }; }, [getPermission]));
  useEffect(() => { const listener = AppState.addEventListener('change', (state) => { setActive(state === 'active'); setCameraReady(false); if (state === 'active') void getPermission().then((next) => { if (next.granted) setCameraError(''); }).catch(() => setCameraError('Camera permission could not be checked.')); }); return () => listener.remove(); }, [getPermission]);
  const project = useQuery(projectDetailOptions(scope, 'local', projectId, (signal) => coordinator!.read(scope, () => coordinator!.store.detail(scope, projectId), signal)));
  const mutation = useMutation({
    networkMode: 'always', retry: false,
    mutationFn: async () => {
      if (!captures || !coordinator || !camera.current || !cameraReady || !active || !focused || saving.current) throw new Error('Camera is not ready');
      saving.current = true; setSaved(null);
      const current = coordinator.fence.capture(); let ticket: CaptureTicket | undefined; let bytesReturned = false;
      try {
        current();
        // Reservation freezes the authorized owner BEFORE the shutter is called.
        ticket = await captures.reserve(scope, projectId, current); current();
        const photo = await camera.current.takePictureAsync({ quality: 1, exif: false });
        if (!photo?.uri) throw new Error('Camera did not return a photo');
        bytesReturned = true;
        // Do not assert the current identity here: a completed capture belongs to
        // the original ticket even if logout/revocation occurred during the await.
        const result = await captures.save(ticket, photo.uri, { width: photo.width, height: photo.height });
        current(); await capturesCommitted(client, scope); current();
        return result;
      } catch (error) {
        if (ticket && !bytesReturned) await captures.abandon(ticket).catch(() => {});
        // Never let an old identity's result/error reveal photo state after switch.
        current(); await capturesCommitted(client, scope); current(); throw error;
      } finally { saving.current = false; }
    },
    onSuccess: (record) => setSaved(record),
  });
  const back = () => router.back();
  if (!project.data || project.error) return <ScrollView style={styles.page} contentContainerStyle={styles.content}><Text style={styles.error}>{project.error ? 'Project access is unavailable. Existing local photos are retained for their original owner.' : 'Checking local project access…'}</Text><Button title="Back" onPress={back} /><Button title="Saved photos" onPress={() => router.replace('/gallery')} /></ScrollView>;
  if (!Device.isDevice) return <ScrollView style={styles.page} contentContainerStyle={styles.content}><Text style={styles.title}>Camera unavailable</Text><Text style={styles.text}>Taking photos requires a physical device with a camera. This simulator cannot capture an original photo.</Text><Text style={styles.small}>No photo or queue item has been created.</Text><Button title="Back to project" onPress={back} /></ScrollView>;
  if (!permission) return <ActivityIndicator />;
  if (!permission.granted) return <ScrollView style={styles.page} contentContainerStyle={styles.content}><Text style={styles.title}>Camera permission</Text><Text style={styles.text}>Allow camera access to take project photos. Originals are saved privately on this device; this version does not upload them.</Text><Text style={styles.small}>{permission.canAskAgain ? 'You can cancel without creating a photo.' : 'Camera access is denied. You can enable it in device settings.'}</Text>{permission.canAskAgain ? <Button title="Allow camera" onPress={() => { void requestPermission().catch(() => setCameraError('Camera permission could not be requested. Try again.')); }} /> : <Button title="Open settings" onPress={() => { void Linking.openSettings().catch(() => setCameraError('Settings could not be opened. Open your device settings manually.')); }} />}{cameraError && <Text style={styles.error}>{cameraError}</Text>}<Button title="Cancel" onPress={back} /></ScrollView>;
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <Text style={styles.subtitle}>{project.data.name}</Text>
    <Text style={styles.text}>Keep the app open while saving. Photos stay on this device, including when offline.</Text>
    {focused && active && !cameraError && <CameraView ref={camera} style={cameraStyles.preview} facing="back" mode="picture" onCameraReady={() => setCameraReady(true)} onMountError={() => { setCameraReady(false); setCameraError('Camera could not start. Close this screen and try again.'); }} />}
    {cameraError && <Text accessibilityRole="alert" style={styles.error}>{cameraError}</Text>}
    <Button title={mutation.isPending ? 'Saving photo…' : 'Take photo'} disabled={!cameraReady || !!cameraError || !active || mutation.isPending} onPress={() => mutation.mutate()} />
    {mutation.isPending && <ActivityIndicator />}
    {saved && <View style={styles.banner} accessibilityRole="alert"><Text style={styles.text}>{saved.queueState === 'pending' ? 'Saved on device · Queued locally' : 'Saved on device · Queue blocked'}</Text><Text style={styles.small}>The original and its queue record are saved. Uploads are not available in this version.</Text></View>}
    {mutation.error && mutation.error.name !== 'AbortError' && <Text accessibilityRole="alert" style={styles.error}>Photo was not confirmed saved. {mutation.error.message} Open Saved photos to check recovery before taking another.</Text>}
    <Button title="View project photos" disabled={mutation.isPending} onPress={() => router.replace({ pathname: '/gallery', params: { projectId } })} />
    <Button title="Back to project" disabled={mutation.isPending} onPress={back} />
  </ScrollView>;
}
const cameraStyles = StyleSheet.create({ preview: { height: 380, borderRadius: 12, overflow: 'hidden' } });
