'use client';
import { ReportSharing } from './report-sharing';
import { useState } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { scopeKey } from '@handovertrack/query';
import { ApiError, type Scope, type Project, type Composition, type CompositionInput, type ReportInput, type ProofMark } from '@handovertrack/contracts';
import { api, fence, fenced } from '../lib/browser';
export function ProofReports({scope,project}:{scope:Scope;project:Project}){
 const client=useQueryClient(),key=[...scopeKey(scope),'api','proof',project.id];
 const query=useQuery({queryKey:key,queryFn:({signal})=>fenced(s=>api.proof(scope,project.id,s))(signal),refetchInterval:5000});
 const checklist=useQuery({queryKey:[...scopeKey(scope),'api','checklist',project.id],queryFn:({signal})=>fenced(s=>api.checklist(scope,project.id,s))(signal)});
 const photos=useInfiniteQuery({queryKey:[...scopeKey(scope),'api','media',project.id],initialPageParam:undefined as string|undefined,queryFn:({signal,pageParam})=>fenced(s=>api.media(scope,project.id,s,pageParam))(signal),getNextPageParam:p=>p.next??undefined,refetchInterval:5000});
 const [draft,setDraft]=useState<Composition>();const [conflict,setConflict]=useState(false);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const [pending,setPending]=useState<{kind:'save';body:CompositionInput;key:string}|{kind:'report';body:ReportInput;key:string}|{kind:'retry';id:string;key:string}>();
 const [sharing,setSharing]=useState<string>();
 const [selection,setSelection]=useState<string[]|null>(null),[image,setImage]=useState('');
 const value=draft??query.data?.composition??{version:0,notes:[],annotations:[],pairs:[]};
 const media=photos.data?.pages.flatMap(p=>p.media)??[];
 const chosen=selection??media.map(m=>m.mediaId);
 const locked=busy||!!pending;
 function edit(v:Partial<Composition>){setDraft({...value,...v});setError('');}
 async function send(action:NonNullable<typeof pending>){
  const submission=pending??action;setPending(submission);setBusy(true);setError('');const current=fence.capture();
  try{
   if(submission.kind==='save'){await api.saveProof(scope,project.id,submission.body,submission.key);current();setDraft(undefined);setConflict(false);}
   else if(submission.kind==='report'){await api.requestReport(scope,project.id,submission.body,submission.key);current();}
   else {await api.retryReport(scope,project.id,submission.id,submission.key);current();}
   setPending(undefined);await client.invalidateQueries({queryKey:key});
  }catch(e){current();if(e instanceof ApiError&&e.status<500){setPending(undefined);if(submission.kind==='save'&&e.code==='VERSION_CONFLICT'){setConflict(true);await query.refetch();}}
   setError(e instanceof Error?e.message:'Request failed');
  }finally{setBusy(false);}
 }
 function save(){void send({kind:'save',body:{baseVersion:value.version,notes:value.notes,annotations:value.annotations,pairs:value.pairs},key:crypto.randomUUID()});}
 const marks=value.annotations.find(a=>a.mediaId===image)?.marks??[];
 function changeMarks(next:ProofMark[]){edit({annotations:[...value.annotations.filter(a=>a.mediaId!==image),...(next.length?[{mediaId:image,marks:next}]:[])]});}
 if(query.error)return <section className="card" role="alert">Proof workspace unavailable: {query.error.message}</section>;
 if(!query.data)return <p>Loading proof workspace…</p>;
 return <section className="card proof-panel"><h2>Proof composition & reports</h2><p>Saved composition r{query.data.composition.version}. Every save creates a revision. Reports include report-visible notes and selected accepted evidence.</p>
  {error&&<p role="alert">{error}{error==='MEDIA_NOT_READY'?'. Wait for image processing or have the operator redrive failed image jobs, then retry.':''}</p>}
  {pending&&<p role="status">Delivery is uncertain. Retry sends the same frozen request.</p>}
  {conflict&&<div role="alert"><p>A newer composition exists. Your draft is preserved below. Review the current server composition before explicitly merging.</p><details><summary>Current server composition r{query.data.composition.version}</summary><pre>{JSON.stringify(query.data.composition,null,2)}</pre></details><button disabled={locked} onClick={()=>{setDraft({...value,version:query.data!.composition.version});setConflict(false);}}>Keep my draft against this version</button><button disabled={locked} onClick={()=>{setDraft(undefined);setConflict(false);}}>Use current server composition</button></div>}
  <fieldset disabled={locked}><legend>Manager notes</legend>{value.notes.map((note,i)=><div className="proof-note" key={note.id}><label>Note {i+1}<textarea aria-label={`Note ${i+1}`} maxLength={8000} value={note.text} onChange={e=>edit({notes:value.notes.map(n=>n.id===note.id?{...n,text:e.target.value}:n)})}/></label><label>Visibility<select aria-label="Visibility" value={note.visibility} onChange={e=>edit({notes:value.notes.map(n=>n.id===note.id?{...n,visibility:e.target.value as 'report'|'internal'}:n)})}><option value="internal">Internal — excluded from reports</option><option value="report">Report-visible</option></select></label><button className="secondary" onClick={()=>edit({notes:value.notes.filter(n=>n.id!==note.id)})}>Remove note {i+1} from next revision</button></div>)}<button disabled={value.notes.length>=20} onClick={()=>edit({notes:[...value.notes,{id:crypto.randomUUID(),text:'',visibility:'internal'}]})}>Add manager note</button></fieldset>
  <fieldset disabled={locked}><legend>Image annotations</legend><label>Annotate photo<select aria-label="Annotate photo" value={image} onChange={e=>setImage(e.target.value)}><option value="">Choose accepted photo</option>{media.map(m=><option key={m.mediaId} value={m.mediaId}>{m.mediaId.slice(0,8)} · {m.processing}</option>)}</select></label>
   {image&&<><div className="annotation-preview"><img src={`/media/organizations/${scope.organizationId}/assets/${image}/preview`} alt="Oriented annotation preview"/><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Annotation overlay">{marks.map((m,i)=><rect key={i} x={m.x*100} y={m.y*100} width={m.width*100} height={m.height*100} fill="none" stroke="#e14926" strokeWidth="0.5"/>)}</svg></div><p>Percentages of the upright image, measured from its top-left corner. Original bytes stay unchanged.</p>{marks.map((mark,i)=><div key={i} className="mark-controls"><label>Annotation {i+1} label<input maxLength={200} value={mark.label} onChange={e=>changeMarks(marks.map((m,j)=>j===i?{...m,label:e.target.value}:m))}/></label>{(['x','y','width','height'] as const).map(k=><label key={k}>{k} %<input type="number" min={0} max={100} step={1} value={Math.round(mark[k]*100)} onChange={e=>changeMarks(marks.map((m,j)=>j===i?{...m,[k]:Number(e.target.value)/100}:m))}/></label>)}<button onClick={()=>changeMarks(marks.filter((_,j)=>j!==i))}>Remove annotation {i+1}</button></div>)}<button disabled={marks.length>=10} onClick={()=>changeMarks([...marks,{x:0.1,y:0.1,width:0.4,height:0.4,label:''}])}>Add rectangle annotation</button></>}
  </fieldset>
  <fieldset disabled={locked}><legend>Before / after pairs</legend>{value.pairs.map((pair,i)=><div key={pair.id}><label>Pair {i+1} caption<textarea aria-label={`Pair ${i+1} caption`} maxLength={1000} value={pair.caption} onChange={e=>edit({pairs:value.pairs.map(p=>p.id===pair.id?{...p,caption:e.target.value}:p)})}/></label>{(['beforeId','afterId'] as const).map(k=><label key={k}>{k==='beforeId'?'Before photo':'After photo'}<select aria-label={k==='beforeId'?'Before photo':'After photo'} value={pair[k]} onChange={e=>edit({pairs:value.pairs.map(p=>p.id===pair.id?{...p,[k]:e.target.value}:p)})}><option value="">Choose photo</option>{media.map(m=><option key={m.mediaId} value={m.mediaId}>{m.mediaId.slice(0,8)}</option>)}</select></label>)}<button onClick={()=>edit({pairs:value.pairs.filter(p=>p.id!==pair.id)})}>Remove pair {i+1}</button></div>)}<button disabled={value.pairs.length>=20} onClick={()=>edit({pairs:[...value.pairs,{id:crypto.randomUUID(),beforeId:'',afterId:'',caption:''}]})}>Add before / after pair</button></fieldset>
  <button disabled={busy||conflict||(pending&&pending.kind!=='save')||(!draft&&!pending)} onClick={save}>{pending?.kind==='save'?'Retry frozen composition':'Save composition revision'}</button>
  <fieldset disabled={locked}><legend>Report evidence</legend><p>All checklist proof, annotated photos and pair members must be selected. Maximum 40 photos. Internal notes are always excluded.</p>{media.map(m=><label className="evidence-choice" key={m.mediaId}><input type="checkbox" checked={chosen.includes(m.mediaId)} onChange={e=>setSelection(e.target.checked?[...chosen,m.mediaId]:chosen.filter(id=>id!==m.mediaId))}/>{m.mediaId.slice(0,8)} · {m.processing}</label>)}{photos.hasNextPage&&<button onClick={()=>void photos.fetchNextPage()}>Load more report evidence</button>}</fieldset>
  {photos.error&&<p role="alert">Evidence unavailable: {photos.error.message}</p>}{checklist.error&&<p role="alert">Checklist unavailable: {checklist.error.message}</p>}
  <button disabled={busy||!!draft||conflict||project.status!=='complete'||!checklist.data?.run||(pending&&pending.kind!=='report')} onClick={()=>void send({kind:'report',body:{projectVersion:project.version,checklistVersion:checklist.data!.run!.version,compositionVersion:query.data!.composition.version,mediaIds:chosen},key:crypto.randomUUID()})}>{pending?.kind==='report'?'Retry frozen report request':'Create immutable completion PDF'}</button>
  <p>Save your composition and complete the checklist first. Changes after a snapshot require a new report revision.</p>
  <h3>Private report revisions</h3><p>Latest 100 revisions.</p>{query.data.reports.map(r=><article key={r.id} className="report-row"><strong>Report r{r.revision} · {r.state}</strong><p>{new Date(r.createdAt).toLocaleString()}{r.error?` · ${r.error}`:''}</p>{r.state==='ready'?<><a href={`/bff/v1/organizations/${scope.organizationId}/projects/${project.id}/reports/${r.id}/pdf`}>Download private PDF r{r.revision}</a><p className="footnote">{r.pages} pages · SHA-256 {r.sha256}</p><button onClick={()=>setSharing(sharing===r.id?undefined:r.id)}>Sharing & decisions for r{r.revision}</button>{sharing===r.id&&<ReportSharing key={`${scope.accountId}:${scope.organizationId}:${r.id}`} scope={scope} projectId={project.id} report={r}/>}</>:r.state==='failed'?<button disabled={busy||!!pending} onClick={()=>void send({kind:'retry',id:r.id,key:crypto.randomUUID()})}>Retry report r{r.revision}</button>:<p>Queued for local rendering.</p>}</article>)}
  {pending?.kind==='retry'&&<button disabled={busy} onClick={()=>void send(pending)}>Retry frozen redrive</button>}
 </section>;
}
