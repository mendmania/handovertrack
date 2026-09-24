import { ActivityIndicator,ScrollView } from 'react-native';
import { Redirect } from 'expo-router';
import { useWorkspace } from '../src/providers';
import { ChecklistPanel } from '../src/checklists/panel';
import { styles } from '../src/ui';
export default function Checklists() {
  const workspace=useWorkspace();
  if (!workspace.ready || workspace.busy) return <ActivityIndicator/>;
  if (!workspace.identity) return <Redirect href="/"/>;
  return <ScrollView style={styles.page}><ChecklistPanel key={`${workspace.identity.scope.accountId}:${workspace.identity.scope.organizationId}`} scope={workspace.identity.scope}/></ScrollView>;
}
