import { useState } from 'react';
import { ActivityIndicator, Button, Image, ScrollView, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Scope } from '@handovertrack/contracts';
import type { CaptureRecord } from '../src/media/types';
import { captureKeys, captureListOptions } from '../src/capture/query';
import { nativeCaptureFiles } from '../src/capture/native-files';
import { useWorkspace } from '../src/providers';
import { styles } from '../src/ui';
export default function GalleryPage() {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>(); const workspace = useWorkspace();
  if (!workspace.ready || workspace.busy) return <ActivityIndicator />;
  if (!workspace.identity) return <Redirect href="/" />;
  return <Gallery key={`${workspace.identity.scope.accountId}:${workspace.identity.scope.organizationId}:${projectId ?? 'all'}`} scope={workspace.identity.scope} projectId={projectId} />;
}
function Gallery({ scope, projectId }: { scope: Scope; projectId?: string }) {
  const { captures, coordinator, identity, mediaWarning, reconcileCaptures } = useWorkspace();
  const client = useQueryClient(); const [checking, setChecking] = useState(false); const [verification, setVerification] = useState(0);
  const query = useQuery(captureListOptions(scope, captures!, coordinator!, projectId));
  async function check() { const current = coordinator!.fence.capture(); setChecking(true); try { await reconcileCaptures(); current(); await query.refetch(); current(); setVerification((value) => value + 1); } catch { /* Scope changes close this view; originals remain retained. */ } finally { setChecking(false); } }
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <Text style={styles.title}>Saved photos</Text><Text style={styles.subtitle}>{identity!.organizationName}</Text>
    <Text style={styles.text}>Originals and queue records stay on this device under your account. This version does not upload photos.</Text>
    <Button title={checking ? 'Checking local files…' : 'Check saved photos'} disabled={checking} onPress={() => void check()} />
    {mediaWarning && <Text accessibilityRole="alert" style={styles.error}>{mediaWarning}</Text>}
    {query.isPending && <ActivityIndicator />}
    {query.error && <Text accessibilityRole="alert" style={styles.error}>Saved photos could not be read. Their files are retained. {query.error.message}</Text>}
    {query.data?.length === 0 && <Text style={styles.text}>No local photos {projectId ? 'for this project' : 'in this organization'} yet.</Text>}
    {!query.error && query.data?.map((item) => <Photo key={`${item.id}:${verification}`} item={item} />)}
    {__DEV__ && <Button title="Rebuild gallery from SQLite" onPress={() => { client.removeQueries({ queryKey: captureKeys.all(scope) }); void query.refetch(); }} />}
  </ScrollView>;
}
function Photo({ item }: { item: CaptureRecord }) {
  const [imageError, setImageError] = useState(false);
  const saved = item.state === 'saved_local';
  return <View style={styles.card}>
    <Text style={styles.projectName}>{new Date(item.createdAt).toLocaleString()}</Text>
    {item.originalPath && !imageError && <Image source={{ uri: nativeCaptureFiles.uri(item.originalPath) }} style={{ width: '100%', height: 260, borderRadius: 8 }} resizeMode="contain" accessibilityLabel="Original project photo saved on this device" onError={() => setImageError(true)} />}
    <Text style={styles.text}>{imageError ? 'Original could not be displayed · Check local file' : saved ? 'Saved on device' : item.state === 'missing_original' ? 'Original missing · Needs attention' : item.state === 'quarantined' ? 'Capture quarantined · Needs attention' : 'Save interrupted · Needs attention'}</Text>
    <Text style={styles.small}>{imageError ? 'The preview failed. Check saved photos before relying on this original.' : saved && item.projectAvailable && item.queueState === 'pending' ? 'Queued locally · Uploads are not available' : !item.projectAvailable ? 'Blocked: project access is unavailable. Remaining files and queue intent stay under your account.' : 'Queue needs attention. Remaining files and intent are kept; check saved photos to retry recovery.'}</Text>
    {imageError && <Text style={styles.error}>The original could not be displayed. Use Check saved photos to verify its file.</Text>}
    {!saved && <Text style={styles.error}>{item.state === 'missing_original' ? 'This original is not currently available. Its record is preserved; do not treat it as a saved photo.' : 'A complete original has not been confirmed. Free storage if needed, then check again. Interrupted files are kept for recovery. An incomplete photo may need to be taken again.'}</Text>}
    {saved && item.size && <Text style={styles.small}>{(item.size / (1024 * 1024)).toFixed(1)} MB · Original retained</Text>}
  </View>;
}
