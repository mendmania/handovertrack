import { captureListOptions } from '../capture/query';
import { nativeCaptureFiles } from '../capture/native-files';
import { useState } from 'react';
import { Button, Image, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { localCommitted, scopeKey } from '@handovertrack/query';
import type { ChecklistRun, ChecklistQuestion, ChecklistResult, Scope } from '@handovertrack/contracts';
import { useWorkspace } from '../providers';
import { styles } from '../ui';
import type { AnswerCommand, OutboxRow } from './store';
export function ChecklistPanel({ scope,projectId }: { scope:Scope;projectId?:string }) {
  const { coordinator,checklists } = useWorkspace(); const client = useQueryClient(); const [error,setError] = useState('');
  const query = useQuery({ queryKey:[...scopeKey(scope),'local','checklists',projectId ?? 'inbox'],networkMode:'always',staleTime:Infinity,
    queryFn:({signal}) => coordinator!.read(scope,async () => ({ run:projectId ? await checklists!.run(scope,projectId) : null,rows:await checklists!.rows(scope,projectId) }),signal),enabled:!!checklists });
  const rows = query.data?.rows ?? []; const run=query.data?.run;
  return <View style={styles.card}><Text style={styles.subtitle}>{projectId ? 'Required checklist' : 'Checklist outbox & conflicts'}</Text>
    {query.error && <Text style={styles.error}>{query.error.message}</Text>}{error && <Text style={styles.error}>{error}</Text>}
    {projectId && !run && <Text style={styles.text}>No downloaded checklist. Ask your manager to start one, then refresh.</Text>}
    {run && <><Text style={styles.text}>{run.title} · Frozen template v{run.templateVersion}</Text>{run.questions.map(question => <AnswerEditor key={`${run.id}:${question.id}`} scope={scope} run={run} question={question} rows={rows.filter(r => r.question_id === question.id && !['accepted','resolved'].includes(r.state))} />)}</>}
    {!projectId && rows.filter(r => !['accepted','resolved'].includes(r.state)).map(row => <View key={row.id}><Text style={styles.text}>{row.state} · Project {row.project_id}</Text><Text style={styles.small}>{(JSON.parse(row.payload) as AnswerCommand).text}</Text>{row.result && <Text style={styles.small}>Server: {((JSON.parse(row.result) as ChecklistResult).current?.text ?? '(unanswered)')}</Text>}<Text style={styles.small}>{row.reason ?? 'Open the accessible project to review and resolve. Retained work stays with this account.'}</Text></View>)}
    <Text style={styles.small}>{rows.filter(r => r.state==='pending').length} pending · {rows.filter(r => r.state==='conflict').length} conflicts · {rows.filter(r => r.state==='blocked').length} blocked. Photos must upload before answers can sync.</Text>
    <Button title="Retry blocked commands" onPress={() => { const current=coordinator!.fence.capture(); void checklists!.retry(scope,current).then(() => localCommitted(client,scope)).catch(e => setError(String(e))); }} />
  </View>;
}
function AnswerEditor({scope,run,question,rows}:{scope:Scope;run:ChecklistRun;question:ChecklistQuestion;rows:OutboxRow[]}) {
  const { coordinator,checklists,captures }=useWorkspace(); const client=useQueryClient();
  const latest=rows.at(-1); const local=latest ? JSON.parse(latest.payload) as AnswerCommand : undefined;
  const answer=run.answers.find(a => a.questionId===question.id);
  const [draftBase,setDraftBase]=useState<number|null>(null);
  const [text,setText]=useState<string|null>(null); const [ids,setIds]=useState<string[]|null>(null); const [error,setError]=useState(''); const [saving,setSaving]=useState(false);
  const value=text ?? local?.text ?? answer?.text ?? ''; const selected=ids ?? local?.mediaIds ?? answer?.mediaIds ?? [];
  const conflict=rows.find(r => ['conflict','blocked'].includes(r.state));
  const receipt=conflict?.result ? JSON.parse(conflict.result) as ChecklistResult : null;
  // A subsequent sync may have a newer version than the conflict receipt. Show that explicitly.
  const server=answer && answer.version >= (receipt?.current?.version ?? 0) ? answer : receipt?.current;
  const photos=useQuery({...captureListOptions(scope,captures!,coordinator!,run.projectId),enabled:!!captures});
  async function save(useServer=false) {
    if (saving) return; setSaving(true); setError(''); const current=coordinator!.fence.capture();
    try {
      const baseVersion=conflict ? server?.version ?? 0 : draftBase ?? (local ? local.baseVersion+1 : answer?.version ?? 0);
      await checklists!.enqueue(scope,run.projectId,Crypto.randomUUID(),{kind:'answer',runId:run.id,questionId:question.id,text:useServer ? server?.text ?? '' : value,mediaIds:useServer ? server?.mediaIds ?? [] : selected,baseVersion},current,conflict?.id);
      current();setText(null);setIds(null);setDraftBase(null);await localCommitted(client,scope);
    } catch(e) { try {current();setError(String(e));} catch { /* Closed scope. */ } } finally {setSaving(false);}
  }
  return <View style={styles.card}><Text style={styles.text}>{question.label} {question.required ? '· Answer required' : '· Optional answer'} · {question.minPhotos} photos required</Text>
    <TextInput accessibilityLabel={question.label} style={styles.input} value={value} multiline maxLength={4000} onChangeText={v => {setDraftBase(draftBase ?? (local ? local.baseVersion+1 : answer?.version ?? 0));setText(v);}}/>
    {photos.error && <Text style={styles.error}>{photos.error.message}</Text>}{photos.data?.map(photo => <View key={photo.id}>{photo.originalPath && photo.state==='saved_local' && <Image source={{uri:nativeCaptureFiles.uri(photo.originalPath)}} style={{width:120,height:90}} resizeMode="contain" accessibilityLabel="Checklist evidence photo"/>}<Button title={`${selected.includes(photo.id) ? '✓ ' : ''}Photo ${photo.id.slice(0,8)} · ${photo.queueState==='server_accepted' || photo.queueState==='completed' ? 'Accepted' : 'Waiting for upload'}`} onPress={() => {setDraftBase(draftBase ?? (local ? local.baseVersion+1 : answer?.version ?? 0));setIds(selected.includes(photo.id) ? selected.filter(id => id!==photo.id) : [...selected,photo.id]);}} /></View>)}
    <Text style={styles.small}>{selected.length} selected · {rows.length ? 'Saved locally / awaiting synchronization' : 'Server version '+(answer?.version ?? 0)}</Text>
    {conflict && <View><Text style={styles.error}>Review conflict or blocked command: {conflict.reason ?? 'Concurrent edit'}</Text><Text style={styles.text}>Local saved answer: {local?.text}</Text><Text style={styles.text}>Current known server v{server?.version ?? 0}: {server?.text ?? '(unanswered)'}</Text><Text style={styles.small}>Server photo IDs: {server?.mediaIds.join(', ') || 'none'}. Resolution sends a new command; another edit can conflict again.</Text><Button disabled={saving} title="Use server answer explicitly" onPress={() => void save(true)}/></View>}
    <Button disabled={saving} title={conflict ? 'Resolve with my edited answer' : 'Save answer on device'} onPress={() => void save()}/>{error && <Text style={styles.error}>{error}</Text>}
  </View>;
}
