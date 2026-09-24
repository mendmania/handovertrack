'use client';
import {usePathname} from 'next/navigation';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {QueryClient,QueryClientProvider,useQuery} from '@tanstack/react-query';
import {ApiError,createGuestApi,type DecisionInput} from '@handovertrack/contracts';
export function GuestEntry({shareId}:{shareId:string}){
 const pathname=usePathname();shareId=pathname.split('/')[2]??shareId;
 const initialized=useRef<string|undefined>(undefined);
 const [cap,setCap]=useState<{id:string;token:string;nonce:string}>();
 useLayoutEffect(()=>{
  function take(){const token=window.location.hash.slice(1);history.replaceState(null,'',window.location.pathname);setCap(/^[A-Za-z0-9_-]{43}$/.test(token)?{id:shareId,token,nonce:crypto.randomUUID()}:undefined);}
  function hide(){setCap(undefined);}
  if(initialized.current!==shareId||window.location.hash){initialized.current=shareId;take();}window.addEventListener('hashchange',take);window.addEventListener('pagehide',hide);
  return()=>{window.removeEventListener('hashchange',take);window.removeEventListener('pagehide',hide);};
 },[shareId]);
 return <main className="guest-workspace"><p className="eyebrow">HANDOVERTRACK · PRIVATE REPORT</p>{cap?.id===shareId?<GuestScope key={cap.nonce} id={cap.id} token={cap.token} nonce={cap.nonce}/>:<section className="card"><h1>Open your complete private link</h1><p>The link secret stays only in this page’s memory. Reopen the original link after refreshing or returning to this page.</p></section>}<p className="footnote">Anyone with the complete link can access this report until expiry or revocation. Downloaded copies cannot be recalled.</p><a href="/sign-in">Manager sign in</a></main>;
}
function GuestScope({id,token,nonce}:{id:string;token:string;nonce:string}){
 const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:false,staleTime:0,gcTime:0}}}));
 useEffect(()=>()=>{void client.cancelQueries();client.clear();},[client]);
 return <QueryClientProvider client={client}><GuestView id={id} token={token} nonce={nonce} client={client}/></QueryClientProvider>;
}
function GuestView({id,token,nonce,client}:{id:string;token:string;nonce:string;client:QueryClient}){
 const [api]=useState(()=>createGuestApi(id,token)),[denied,setDenied]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [name,setName]=useState(''),[message,setMessage]=useState(''),[kind,setKind]=useState<'accept'|'correction'>('accept'),[confirmed,setConfirmed]=useState(false);
 const [preview,setPreview]=useState<DecisionInput>(),[pending,setPending]=useState<{body:DecisionInput;key:string}>(),[submitted,setSubmitted]=useState(false);
 const alive=useRef(true),commands=useRef(new AbortController()),blobs=useRef(new Set<string>());
 useEffect(()=>{alive.current=true;const urls=blobs.current;return()=>{alive.current=false;commands.current.abort();urls.forEach(url=>URL.revokeObjectURL(url));urls.clear();};},[]);
 function lost(e:unknown){if(e instanceof ApiError&&[401,403,404].includes(e.status)){setDenied(true);setPreview(undefined);setPending(undefined);setName('');setMessage('');void client.cancelQueries();client.clear();commands.current.abort();blobs.current.forEach(url=>URL.revokeObjectURL(url));blobs.current.clear();}else setError(e instanceof Error?e.message:'Request failed');}
 const query=useQuery({queryKey:['guest-report',id,nonce],enabled:!denied,queryFn:async({signal})=>{try{const v=await api.read(signal);if(!alive.current||signal.aborted)throw Error('Scope closed');return v;}catch(e){if(alive.current&&!signal.aborted)lost(e);throw e;}},refetchInterval:15000});
 async function pdf(){setBusy(true);setError('');try{const bytes=await api.pdf(commands.current.signal);if(!alive.current)return;const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));blobs.current.add(url);const a=document.createElement('a');a.href=url;a.download=`handover-r${query.data!.share.report.revision}.pdf`;a.click();setTimeout(()=>{URL.revokeObjectURL(url);blobs.current.delete(url);},1000);}catch(e){if(alive.current)lost(e);}finally{if(alive.current)setBusy(false);}}
 async function send(){if(!preview&&!pending)return;const action=pending??{body:preview!,key:crypto.randomUUID()};setPending(action);setBusy(true);setError('');try{await api.decide(action.body,action.key,commands.current.signal);if(!alive.current)return;setPending(undefined);setPreview(undefined);setSubmitted(true);await query.refetch();}catch(e){if(!alive.current)return;if(e instanceof ApiError&&e.status<500){setPending(undefined);setPreview(undefined);await query.refetch();}lost(e);}finally{if(alive.current)setBusy(false);}}
 if(denied)return <section className="card"><h1>Report access unavailable</h1><p>This link may have expired or been revoked. Ask the sender for a new link.</p></section>;
 if(!query.data)return <section className="card"><h1>Opening private report…</h1>{query.error&&<p role="alert">Unable to load report. <button onClick={()=>void query.refetch()}>Retry</button></p>}</section>;
 const {share,decision}=query.data,r=share.report,locked=busy||!!preview||!!pending;
 return <section className="card"><h1>{r.title}</h1><h2>Report revision {r.revision}</h2><p>Created {new Date(r.createdAt).toLocaleString()} · {r.pages} pages</p><p className="footnote">PDF SHA-256: {r.sha256}</p><button disabled={busy} onClick={()=>void pdf()}>Download exact PDF r{r.revision}</button><p>Access expires {new Date(share.expiresAt).toLocaleString()}.</p>
  <p>Your decision concerns only this PDF revision, including if the project is reopened or another report is published. It does not approve any future revision.</p>
  {error&&<p role="alert">{error==='DECISION_RECORDED'?'A decision was already recorded for this revision. Your competing submission was not applied.':error}</p>}
  {submitted&&<p role="status">Your decision was recorded for report r{r.revision}.</p>}
  {pending?<div role="status"><p>Delivery uncertain. Retry sends your identical decision once.</p><button disabled={busy} onClick={()=>void send()}>Retry identical decision</button></div>:decision?<p className="decision-result">{decision.kind==='accept'?'Acceptance recorded':'Correction request recorded'} for this revision on {new Date(decision.createdAt).toLocaleString()}. Further decisions require a new report revision from the manager.</p>:<>
  <fieldset disabled={locked}><legend>Your decision for r{r.revision}</legend><label>Your name (unverified)<input value={name} maxLength={120} onChange={e=>setName(e.target.value)}/></label><label>Decision<select aria-label="Decision" value={kind} onChange={e=>{setKind(e.target.value as typeof kind);setConfirmed(false);}}><option value="accept">Accept this report revision</option><option value="correction">Request corrections to this revision</option></select></label><label>{kind==='correction'?'Corrections requested (required)':'Comment (optional)'}<textarea maxLength={2000} value={message} onChange={e=>setMessage(e.target.value)}/></label><p>A typed name is an unverified identity claim. This is not an identity-verified electronic signature.</p><label className="evidence-choice"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I have reviewed PDF r{r.revision} and intend to {kind==='accept'?'accept this exact revision':'request the corrections above'}.</label></fieldset>
  {!preview&&<button disabled={locked||!confirmed||!name.trim()||(kind==='correction'&&!message.trim())} onClick={()=>setPreview({reportId:r.reportId,sha256:r.sha256,kind,claimedName:name,message,confirmed:true})}>Review decision before submitting</button>}
  {preview&&<div className="decision-confirm"><h3>Confirm {preview.kind==='accept'?'acceptance':'correction request'} · r{r.revision}</h3><p>As {preview.claimedName}, you are recording an immutable {preview.kind==='accept'?'acceptance of':'correction request for'} this PDF revision. Only the first decision across its links is recorded.</p><p className="preserve-text">{preview.message}</p><button disabled={busy} onClick={()=>void send()}>Confirm and record decision</button><button disabled={busy} onClick={()=>setPreview(undefined)}>Back to edit</button></div>}</>}
 </section>;
}
