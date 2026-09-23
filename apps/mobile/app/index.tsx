import { useState } from 'react';
import { ScrollView, View, Text, TextInput, Button, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectListOptions } from '@handovertrack/query';
import { useWorkspace } from '../src/providers';
import { styles } from '../src/ui';
export default function Home() {
  const workspace = useWorkspace();
  if (!workspace.ready || workspace.busy) return <View style={styles.content}><ActivityIndicator /><Text>{workspace.busy ? 'Opening account safely…' : 'Preparing private local storage…'}</Text></View>;
  if (!workspace.identity) return <SignIn />;
  return <Projects key={`${workspace.identity.scope.accountId}:${workspace.identity.scope.organizationId}`} />;
}
function SignIn() {
  const workspace = useWorkspace(); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false); const [error, setError] = useState('');
  async function signIn() {
    setPending(true); setError('');
    try { await workspace.signIn(email.trim(), password); setPassword(''); }
    catch (error) { setError(error instanceof Error ? error.message : 'Sign-in failed'); }
    finally { setPending(false); }
  }
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text style={styles.title}>Welcome back.</Text><Text style={styles.text}>Sign in online to download your assigned projects.</Text><TextInput accessibilityLabel="Email" placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" style={styles.input} /><TextInput accessibilityLabel="Password" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" style={styles.input} /><Button title={pending ? 'Signing in…' : 'Sign in'} disabled={pending || !workspace.coordinator} onPress={() => void signIn()} />{(error || workspace.error) && <Text accessibilityRole="alert" style={styles.error}>{error || workspace.error}</Text>}<Text style={styles.small}>Local trial. Accounts are provisioned by your operator.</Text></ScrollView>;
}
function Projects() {
  const workspace = useWorkspace(); const client = useQueryClient();
  const { identity, coordinator } = workspace;
  const scope = identity!.scope;
  const query = useQuery(projectListOptions(scope, 'local', (signal) => coordinator!.read(scope, () => coordinator!.store.list(scope), signal)));
  const [error, setError] = useState('');
  async function logout() { try { await workspace.logout(); } catch { setError('Local logout failed. Restart before switching accounts.'); } }
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}><Text style={styles.small}>{identity!.name}</Text><Text style={styles.title}>{identity!.organizationName}</Text><View style={styles.banner}><Text style={styles.text}>{workspace.status === 'refreshing' ? 'Syncing projects…' : workspace.status === 'current' && workspace.online ? 'Projects synced' : 'Cached projects · Offline'}</Text><Text style={styles.small}>{identity!.validatedAt ? `Last checked ${new Date(identity!.validatedAt).toLocaleString()}` : 'No projects downloaded yet.'}</Text></View>{workspace.status === 'unavailable' && <Text style={styles.error}>Server unavailable or sync interrupted. Showing saved projects; refresh to retry.</Text>}<View style={styles.row}><Button title="Refresh" disabled={workspace.status === 'refreshing'} onPress={() => void workspace.refresh()} /><Button title="Sign out" onPress={() => void logout()} /></View>{workspace.memberships.length > 1 && <View style={styles.card}><Text style={styles.subtitle}>Organization</Text>{workspace.memberships.map((member) => <Button key={member.organizationId} title={member.organizationName} disabled={scope.organizationId === member.organizationId} onPress={() => void workspace.selectOrganization(member.organizationId)} />)}</View>}<Button title="Checklist outbox & conflicts" onPress={() => router.push('/checklists')} /><Button title="Saved photos" onPress={() => router.push('/gallery')} /><Text style={styles.subtitle}>Projects</Text>{query.isPending && <ActivityIndicator />}{query.error && <Text style={styles.error}>{query.error.message}</Text>}{error && <Text style={styles.error}>{error}</Text>}{query.data?.length === 0 && <Text style={styles.text}>No assigned projects.</Text>}{query.data?.map((project) => <Pressable accessibilityRole="button" accessibilityLabel={project.name} key={project.id} style={styles.card} onPress={() => router.push({ pathname: '/project/[id]', params: { id: project.id } })}><Text style={styles.projectName}>{project.name}</Text><Text style={styles.text}>{project.address}</Text><Text style={styles.small}>{project.status} · View project →</Text></Pressable>)}<Text style={styles.small}>Offline access on this device lasts up to 24 hours after validation. Current server permissions are checked on reconnect.</Text>{__DEV__ && <Button title="Rebuild view from SQLite" onPress={() => { client.removeQueries({ queryKey: ['account', scope.accountId] }); void query.refetch(); }} />}</ScrollView>;
}
