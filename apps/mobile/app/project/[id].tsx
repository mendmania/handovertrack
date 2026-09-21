import { ScrollView, View, Text, ActivityIndicator, Button } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { projectDetailOptions } from '@handovertrack/query';
import type { Scope } from '@handovertrack/contracts';
import { useWorkspace } from '../../src/providers';
import { styles } from '../../src/ui';
export default function ProjectPage() {
  const { id } = useLocalSearchParams<{ id: string }>(); const workspace = useWorkspace();
  if (!workspace.ready || workspace.busy) return <ActivityIndicator />;
  if (!workspace.identity) return <Redirect href="/" />;
  return <Detail key={`${workspace.identity.scope.accountId}:${workspace.identity.scope.organizationId}:${id}`} scope={workspace.identity.scope} id={id} />;
}
function Detail({ scope, id }: { scope: Scope; id: string }) {
  const { coordinator, status, online } = useWorkspace();
  const query = useQuery(projectDetailOptions(scope, 'local', id, (signal) => coordinator!.read(scope, () => coordinator!.store.detail(scope, id), signal)));
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}><View style={styles.banner}><Text style={styles.text}>{status === 'current' && online ? 'Projects synced' : 'Cached projects · Offline'}</Text></View>{query.isPending && <ActivityIndicator />}{query.error ? <Text style={styles.error}>{query.error.message}</Text> : query.data && <View style={styles.card}><Text style={styles.title}>{query.data.name}</Text><Text style={styles.subtitle}>{query.data.address}</Text><Text style={styles.text}>{query.data.description}</Text><Text style={styles.small}>{query.data.status} · Updated {query.data.updatedAt.slice(0, 10)}</Text><Button title="Take a photo" onPress={() => router.push({ pathname: '/capture/[id]', params: { id } })} /><Button title="Project photos" onPress={() => router.push({ pathname: '/gallery', params: { projectId: id } })} /></View>}</ScrollView>;
}
