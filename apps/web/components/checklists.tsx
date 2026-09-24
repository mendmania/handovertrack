'use client';
import { useState } from 'react';
import { useQuery,useInfiniteQuery,useQueryClient } from '@tanstack/react-query';
import { scopeKey,projectKeys } from '@handovertrack/query';
import { ApiError } from '@handovertrack/contracts';
import type { ChecklistCommand,ChecklistQuestion,ChecklistResult,ChecklistRun,ChecklistTemplate,Project,Scope,TemplateInput } from '@handovertrack/contracts';
import { api,fenced,fence } from '../lib/browser';
const keys=(scope:Scope,project:string) => [...scopeKey(scope),'api','checklist',project];
export function Checklists({scope,project,manager}:{scope:Scope;project:Project;manager:boolean}) {
  const client=useQueryClient();const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const [selected,setSelected]=useState(''); const [editing,setEditing]=useState(false);
  const [pending,setPending]=useState<{body:ChecklistCommand;key:string}>();
  const run=useQuery({queryKey:keys(scope,project.id),queryFn:({signal}) => fenced(s => api.checklist(scope,project.id,s))(signal),refetchInterval:10000});
  const templates=useQuery({queryKey:[...scopeKey(scope),'api','checklist-templates'],queryFn:({signal}) => fenced(s => api.checklistTemplates(scope,s))(signal),enabled:manager});
  async function command(body:ChecklistCommand) {
    setBusy(true);setError(''); const current=fence.capture();const submission=pending ?? {body,key:crypto.randomUUID()};setPending(submission);
    try { await api.checklistCommand(scope,project.id,submission.body,submission.key);current();setPending(undefined);await client.invalidateQueries({queryKey:keys(scope,project.id)});await client.invalidateQueries({queryKey:projectKeys.all(scope,'api')}); }
    catch(e) {current();if(e instanceof ApiError && e.status<500)setPending(undefined);setError(e instanceof Error ? e.message : 'Command failed');} finally {setBusy(false);}
  }
  return <section className="card checklist-panel"><h2>Required-photo checklist</h2>{run.error && <p role="alert">{run.error.message}</p>}{error && <p role="alert">{error}. {pending ? 'Retry preserves the submitted command.' : 'Review the current requirements and retry.'}</p>}
    {manager && <>{templates.error && <p role="alert">{templates.error.message}</p>}<button className="secondary" onClick={() => setEditing(!editing)}>Manage template versions</button>{editing && <TemplateEditor scope={scope} templates={templates.data ?? []}/>}</>}
    {run.data?.run ? <><h3>{run.data.run.title}</h3><p>Frozen template version {run.data.run.templateVersion}. Later template edits do not change this project.</p>{run.data.run.questions.map(q => <Answer key={`${run.data!.run!.id}:${q.id}`} scope={scope} run={run.data!.run!} question={q} manager={manager} complete={project.status==='complete'}/>)}{manager && <button disabled={busy || project.status==='complete'} onClick={() => void command({kind:'complete',runId:run.data!.run!.id,baseVersion:project.version})}>{pending ? 'Retry submitted command' : 'Complete project after requirements check'}</button>}</> : <><p>No checklist run. Completion requires a frozen run, required answers and accepted photos.</p>{manager && <><label>Template version<select aria-label="Template version" value={selected} onChange={e => setSelected(e.target.value)}><option value="">Choose a version</option>{templates.data?.map(t => <option key={`${t.id}:${t.version}`} value={`${t.id}:${t.version}`}>{t.title} · v{t.version}</option>)}</select></label><button disabled={busy || !selected || project.status==='complete'} onClick={() => {const [templateId,version]=selected.split(':');void command({kind:'start',id:crypto.randomUUID(),templateId:templateId!,templateVersion:Number(version),baseVersion:project.version});}}>{pending ? 'Retry starting checklist' : 'Start frozen checklist'}</button></>}</>}
  </section>;
}
function TemplateEditor({scope,templates}:{scope:Scope;templates:ChecklistTemplate[]}) {
  const client=useQueryClient();const [base,setBase]=useState<ChecklistTemplate>();const [title,setTitle]=useState('Handover checks');
  const [questions,setQuestions]=useState<ChecklistQuestion[]>([{id:crypto.randomUUID(),label:'Work completed and checked',required:true,minPhotos:1}]);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [pending,setPending]=useState<{input:TemplateInput;key:string}>();
  function patch(index:number,changes:Partial<ChecklistQuestion>) {setQuestions(questions.map((q,i) => i===index ? {...q,...changes} : q));}
  async function publish() {setBusy(true);setError('');const current=fence.capture();const submission=pending ?? {input:{id:base?.id ?? crypto.randomUUID(),baseVersion:base?.version ?? 0,title,questions},key:crypto.randomUUID()};setPending(submission);
    try {const result=await api.publishChecklistTemplate(scope,submission.input,submission.key);current();setBase(result);setPending(undefined);await client.invalidateQueries({queryKey:[...scopeKey(scope),'api','checklist-templates']});}
    catch(e) {current();if(e instanceof ApiError && e.status<500)setPending(undefined);setError(String(e));}finally {setBusy(false);}}
  return <fieldset><legend>Publish an immutable template version</legend><label>Base template<select aria-label="Base template" disabled={!!pending} value={base ? `${base.id}:${base.version}` : ''} onChange={e => {const t=templates.find(t => `${t.id}:${t.version}`===e.target.value);setBase(t);if(t){setTitle(t.title);setQuestions(t.questions);}}}><option value="">New template</option>{templates.map(t => <option key={`${t.id}:${t.version}`} value={`${t.id}:${t.version}`}>{t.title} v{t.version}</option>)}</select></label><label>Title<input disabled={!!pending} value={title} maxLength={200} onChange={e => setTitle(e.target.value)}/></label>
    {questions.map((q,i) => <div key={q.id}><label>Question {i+1}<input disabled={!!pending} value={q.label} maxLength={300} onChange={e => patch(i,{label:e.target.value})}/></label><label><input disabled={!!pending} type="checkbox" checked={q.required} onChange={e => patch(i,{required:e.target.checked})}/>Answer required</label><label>Minimum photos<input disabled={!!pending} type="number" min={0} max={10} value={q.minPhotos} onChange={e => patch(i,{minPhotos:Number(e.target.value)})}/></label></div>)}
    <button disabled={!!pending || questions.length>=30} onClick={() => setQuestions([...questions,{id:crypto.randomUUID(),label:'New check',required:true,minPhotos:0}])}>Add question</button><button disabled={busy} onClick={() => void publish()}>{pending ? 'Retry frozen publication' : 'Publish version'}</button>{error && <p role="alert">{error}</p>}
  </fieldset>;
}
function Answer({scope,run,question,manager,complete}:{scope:Scope;run:ChecklistRun;question:ChecklistQuestion;manager:boolean;complete:boolean}) {
  const client=useQueryClient();const answer=run.answers.find(a => a.questionId===question.id);
  const [draftBase,setDraftBase]=useState<number|null>(null);const [text,setText]=useState<string|null>(null);const [media,setMedia]=useState<string[]|null>(null);const [conflict,setConflict]=useState<ChecklistResult>();const [pending,setPending]=useState<{body:ChecklistCommand;key:string}>();const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const currentServer=answer && answer.version >= (conflict?.current?.version ?? 0) ? answer : conflict?.current;
  const photos=useInfiniteQuery({queryKey:[...scopeKey(scope),'api','media',run.projectId],initialPageParam:undefined as string|undefined,queryFn:({signal,pageParam}) => fenced(s => api.media(scope,run.projectId,s,pageParam))(signal),getNextPageParam:page => page.next ?? undefined,enabled:manager});
  const selected=media ?? answer?.mediaIds ?? [];
  async function save(useServer=false) {
    setBusy(true);setError('');const current=fence.capture();
    const value=text ?? answer?.text ?? '';setText(value);setMedia(selected);
    const submission=pending ?? {key:crypto.randomUUID(),body:{kind:'answer' as const,runId:run.id,questionId:question.id,text:useServer ? currentServer?.text ?? '' : value,mediaIds:useServer ? currentServer?.mediaIds ?? [] : selected,baseVersion:conflict ? currentServer?.version ?? 0 : draftBase ?? answer?.version ?? 0}};setPending(submission);
    try {const result=await api.checklistCommand(scope,run.projectId,submission.body,submission.key);current();setPending(undefined);if(result.outcome==='conflict')setConflict(result);else{setConflict(undefined);setText(null);setMedia(null);setDraftBase(null);}await client.invalidateQueries({queryKey:keys(scope,run.projectId)});}
    catch(e){current();if(e instanceof ApiError && e.status<500)setPending(undefined);setError(String(e));}finally{setBusy(false);}
  }
  return <fieldset><legend>{question.label}</legend><p>{question.required ? 'Answer required' : 'Optional answer'} · {question.minPhotos} accepted photos required</p><textarea aria-label={question.label} disabled={complete || !!pending} maxLength={4000} value={text ?? answer?.text ?? ''} onChange={e => {setDraftBase(draftBase ?? answer?.version ?? 0);setText(e.target.value);}}/>
    {manager && photos.data?.pages.flatMap(page => page.media).map(photo => <label key={photo.mediaId}><input type="checkbox" disabled={complete || !!pending} checked={selected.includes(photo.mediaId)} onChange={e => {setDraftBase(draftBase ?? answer?.version ?? 0);setMedia(e.target.checked ? [...selected,photo.mediaId] : selected.filter(id => id!==photo.mediaId));}}/>{photo.processing === 'ready' && <img src={`/media/organizations/${scope.organizationId}/assets/${photo.mediaId}/thumb`} alt="Accepted project photo" width={72} height={54}/>}<span>{new Date(photo.capturedAt).toLocaleString()} · {photo.mediaId.slice(0,8)} · accepted</span></label>)}
    {photos.hasNextPage && <button onClick={() => void photos.fetchNextPage()}>Load more evidence choices</button>}{photos.error && <p role="alert">Evidence choices unavailable: {photos.error.message}</p>}
    {conflict && <div role="alert"><p>Your local answer: {text}. Photos: {selected.join(', ') || 'none'}</p><p>Current known server v{currentServer?.version ?? 0}: {currentServer?.text || '(unanswered)'}. Photos: {currentServer?.mediaIds.join(', ') || 'none'}</p><p>Review both before explicitly choosing. A newer concurrent edit can conflict again.</p><button disabled={busy || !!pending || complete} onClick={() => void save(true)}>Use server answer explicitly</button></div>}
    <button disabled={busy || complete} onClick={() => void save()}>{pending ? 'Retry frozen answer' : conflict ? 'Resolve with my edited answer' : 'Save answer'}</button>{error && <p role="alert">{error}</p>}
  </fieldset>;
}
