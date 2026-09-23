'use client';
import {useState,useEffect,useRef} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {scopeKey} from '@handovertrack/query';
import {ApiError,type Scope,type ReportStatus,type ShareInput,type ReviewInput} from '@handovertrack/contracts';
import {api,fence,fenced} from '../lib/browser';
type Command={kind:'create';input:ShareInput;key:string}|{kind:'revoke';id:string;key:string}|{kind:'review';input:ReviewInput;key:string};
export function ReportSharing({scope,projectId,report}:{scope:Scope;projectId:string;report:ReportStatus}){
 const client=useQueryClient(),queryKey=[...scopeKey(scope),'api','sharing',report.id];
 const query=useQuery({queryKey,queryFn:({signal})=>fenced(s=>api.sharing(scope,projectId,report.id,s))(signal),refetchInterval:5000});
 const [pending,setPending]=useState<Command>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[days,setDays]=useState(7),[note,setNote]=useState(''),[delivery,setDelivery]=useState('');
 // Raw secret is not a Query/mutation result or DOM attribute. Never recover it from receipts.
 const secret=useRef<{id:string;token:string}|null>(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;secret.current=null;};},[]);
 async function send(command:Command){
  const action=pending??command,current=fence.capture();setPending(action);setBusy(true);setError('');
  const check=()=>{current();if(!alive.current)throw Error('Scope closed');};
  try{
   if(action.kind==='create'){
    const result=await api.createShare(scope,projectId,report.id,action.input,action.key);check();
    secret.current=result.token?{id:result.share.id,token:result.token}:null;
    setDelivery(result.token?'Link is ready to copy once. Keep it private.':'The one-time link is unavailable. Revoke that share below before explicitly creating a replacement.');
   }else if(action.kind==='revoke'){
    await api.revokeShare(scope,projectId,report.id,action.id,action.key);check();
    if(secret.current?.id===action.id){secret.current=null;setDelivery('Share revoked. Previously downloaded copies cannot be recalled.');}
   }else{await api.reviewDecision(scope,projectId,report.id,action.input,action.key);check();setNote('');}
   setPending(undefined);await client.invalidateQueries({queryKey});
  }catch(e){try{check();}catch{return;}if(e instanceof ApiError&&e.status<500){setPending(undefined);if([401,403,404].includes(e.status)){secret.current=null;setDelivery('');}await query.refetch();}setError(e instanceof Error?e.message:'Request failed');}
  finally{if(alive.current)setBusy(false);}
 }
 async function copy(){if(!secret.current)return;try{await navigator.clipboard.writeText(`${window.location.origin}/share/${secret.current.id}#${secret.current.token}`);secret.current=null;setDelivery('Link copied. It cannot be shown again. Share it only with the intended recipient.');}catch{setError('Clipboard unavailable. Allow clipboard access and try again.');}}
 if(query.error)return <p role="alert">Sharing unavailable: {query.error.message}</p>;
 if(!query.data)return <p>Loading sharing…</p>;
 const d=query.data.decision,locked=busy||!!pending;
 return <div className="sharing-panel"><h4>Sharing & customer decision · r{report.revision}</h4><p>This link grants access only to this PDF. A recipient’s typed name is a claim, not verified identity or a signature. No email is sent.</p>
  <label>Link lifetime<select aria-label="Link lifetime" disabled={locked} value={days} onChange={e=>setDays(Number(e.target.value))}><option value={1}>1 day</option><option value={7}>7 days</option><option value={30}>30 days</option></select></label>
  <button disabled={locked||!!secret.current} onClick={()=>void send({kind:'create',input:{expiresAt:new Date(Date.now()+days*86400000-1000).toISOString()},key:crypto.randomUUID()})}>Create private link for r{report.revision}</button>
  {delivery&&<p role="status">{delivery}</p>}{secret.current&&<button onClick={()=>void copy()}>Copy private link once</button>}
  {error&&<p role="alert">{error}</p>}{pending&&<p role="status">Delivery uncertain. <button disabled={busy} onClick={()=>void send(pending)}>Retry identical sharing command</button></p>}
  <ul>{query.data.shares.map(s=><li key={s.id}><span>Share {s.id.slice(0,8)} · {s.revokedAt?'revoked':Date.parse(s.expiresAt)<=Date.now()?'expired':'active'} · expires {new Date(s.expiresAt).toLocaleString()}</span>{!s.revokedAt&&<button disabled={locked} onClick={()=>void send({kind:'revoke',id:s.id,key:crypto.randomUUID()})}>Revoke share {s.id.slice(0,8)}</button>}</li>)}</ul>
  {d?<div><h4>{d.kind==='accept'?'Customer accepted':'Correction requested'} · report r{report.revision}</h4><p>Claimed name: {d.claimedName}</p><p className="preserve-text">{d.message}</p><p>{new Date(d.createdAt).toLocaleString()} · PDF SHA-256 {d.sha256}</p>{query.data.review?<p>Reviewed {new Date(query.data.review.createdAt).toLocaleString()}. Internal review note: {query.data.review.note||'None'}</p>:<><label>Internal review note<textarea maxLength={2000} disabled={locked} value={note} onChange={e=>setNote(e.target.value)}/></label><p>Review acknowledges this decision. Corrections require a new report revision; this PDF and decision stay unchanged.</p><button disabled={locked} onClick={()=>void send({kind:'review',input:{decisionId:d.id,note},key:crypto.randomUUID()})}>Record manager review</button></>}</div>:<p>No customer decision for this revision. Project completion is a separate state.</p>}
 </div>;
}
