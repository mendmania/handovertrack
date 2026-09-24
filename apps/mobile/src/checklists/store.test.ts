import { afterEach,expect,it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ApiError,type ChecklistRun,type ChecklistResult,type Scope } from '@handovertrack/contracts';
import { SnapshotStore,migrationV1,migrationV2,migrationV3,migrationV4,type SqlConnection,type SqlDatabase } from '../db/store';
import { ChecklistStore,ChecklistExecutor,type AnswerCommand,type ChecklistTransport } from './store';
const scope:Scope={accountId:'owner',organizationId:'org'};
const run:ChecklistRun={id:'run',organizationId:'org',projectId:'project',templateId:'template',templateVersion:1,title:'Frozen',questions:[{id:'q',label:'Done?',required:true,minPhotos:0},{id:'q2',label:'Other?',required:false,minPhotos:0}],answers:[],version:1};
const project={id:'project',organizationId:'org',name:'Project',address:'Site',description:'',status:'active' as const,version:1,updatedAt:new Date().toISOString()};
const bootstrap={...scope,complete:true as const,generatedAt:new Date().toISOString(),projects:[project],assignments:[],checklists:[run],cursor:'first'};
const current=()=>{};
const cleanup:(()=>void)[]=[];afterEach(()=>{for(const fn of cleanup.splice(0))fn();});
async function fixture(legacy=false){
 const dir=mkdtempSync(join(tmpdir(),'task06-sqlite-'));const path=join(dir,'device.db');let db=new DatabaseSync(path);
 const connection=(d:DatabaseSync):SqlConnection=>({execAsync:async sql=>{d.exec(sql);},runAsync:async(sql,...args)=>d.prepare(sql).run(...args),getAllAsync:async<T>(sql:string,...args:(string|number|null)[])=>d.prepare(sql).all(...args) as T[],getFirstAsync:async<T>(sql:string,...args:(string|number|null)[])=>(d.prepare(sql).get(...args) as T)??null});
 const adapter:SqlDatabase={execAsync:async sql=>connection(db).execAsync(sql),runAsync:async(sql,...args)=>connection(db).runAsync(sql,...args),getAllAsync:async<T>(sql:string,...args:(string|number|null)[])=>connection(db).getAllAsync<T>(sql,...args),getFirstAsync:async<T>(sql:string,...args:(string|number|null)[])=>connection(db).getFirstAsync<T>(sql,...args),withExclusiveTransactionAsync:async fn=>{const tx=new DatabaseSync(path);tx.exec('BEGIN');try{await fn(connection(tx));tx.exec('COMMIT');}catch(e){tx.exec('ROLLBACK');throw e;}finally{tx.close();}}};
 if(legacy){db.exec(migrationV1+migrationV2+migrationV3+migrationV4);db.exec("INSERT INTO cache_scopes(account_id,organization_id,revision,cursor) VALUES('owner','org',1,'legacy-cursor');");db.exec("INSERT INTO media_local(id,account_id,organization_id,project_id,created_at,updated_at,directory,state,size,sha256) VALUES('photo','owner','org','project','old','old','original-path','saved_local',123,'preserved-hash'); INSERT INTO media_queue(media_id,account_id,organization_id,state,created_at,updated_at,upload_id,accepted_at) VALUES('photo','owner','org','server_accepted','old','old','receipt','accepted');");}
 const before=legacy ? JSON.stringify(db.prepare('SELECT * FROM media_queue').all()) : '';
 const snapshots=new SnapshotStore(adapter);await snapshots.migrate();await snapshots.migrate();if(legacy)expect((await snapshots.metadata(scope))?.cursor).toBeNull();await snapshots.bootstrap(scope,bootstrap,current);
 const store=new ChecklistStore(snapshots);
 cleanup.push(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
 return {store,snapshots,db:()=>db,before,reopen:()=>{db.close();db=new DatabaseSync(path);}};
}
const value=(text='offline',baseVersion=0,questionId='q'):AnswerCommand=>({kind:'answer',runId:'run',questionId,text,mediaIds:[],baseVersion});
function applied(command:AnswerCommand,version=2):ChecklistResult{return{outcome:'applied',run:{...run,version,answers:[{questionId:command.questionId,text:command.text,mediaIds:command.mediaIds,version:command.baseVersion+1,updatedBy:scope.accountId}]}};}
const transport=(send:ChecklistTransport['checklistCommand']):ChecklistTransport=>({me:async()=>({...scope,memberships:[{organizationId:scope.organizationId}]}),checklistCommand:send});
it('upgrades populated v4 without changing photo/receipt rows; offline answer and command survive real close/reopen',async()=>{
 const f=await fixture(true);const v=value();await f.store.enqueue(scope,'project','command-1',v,current);v.text='mutated caller';f.reopen();
 expect(f.db().prepare('PRAGMA user_version').get()?.user_version).toBe(5);expect(JSON.stringify(f.db().prepare('SELECT * FROM media_queue').all())).toBe(f.before);
 expect(JSON.parse((await f.store.rows(scope))[0]!.payload).text).toBe('offline');expect(f.db().prepare('SELECT payload FROM checklist_local_answers').get()?.payload).toBe((await f.store.rows(scope))[0]!.payload);
 expect(()=>f.db().exec("UPDATE checklist_outbox SET payload='changed'")).toThrow('immutable');expect(()=>f.db().exec("UPDATE checklist_local_answers SET account_id='other'")).toThrow('immutable');
});
it('rolls back both local answer and outbox when insert or scope fence fails',async()=>{
 const f=await fixture();await f.store.enqueue(scope,'project','same-id',value(),current);
 await expect(f.store.enqueue(scope,'project','same-id',value('new',1),current)).rejects.toThrow();expect((await f.store.rows(scope)).length).toBe(1);expect(JSON.parse(String(f.db().prepare('SELECT payload FROM checklist_local_answers').get()?.payload)).text).toBe('offline');
 let calls=0;await expect(f.store.enqueue(scope,'project','second',value('new',1),()=>{if(++calls===2)throw Error('scope');})).rejects.toThrow('scope');expect((await f.store.rows(scope)).length).toBe(1);
});
it('lost committed reply replays same ID and frozen bytes; per-entity ordering survives restart',async()=>{
 const f=await fixture();await f.store.enqueue(scope,'project','first',value(),current);await f.store.enqueue(scope,'project','second',value('next',1),current);await f.store.enqueue(scope,'project','independent',value('other',0,'q2'),current);
 const seen:{id:string;payload:string}[]=[];let lose=true;const receipts=new Map<string,ChecklistResult>();
 const t=transport(async(_s,_p,body,id)=>{seen.push({id,payload:JSON.stringify(body)});const result=receipts.get(id)??applied(body as AnswerCommand);receipts.set(id,result);if(lose){lose=false;throw Error('lost response');}return result;});
 await expect(new ChecklistExecutor(f.store,async()=>{}).run(scope,t,new AbortController().signal,current)).rejects.toThrow('lost');f.reopen();const executor=new ChecklistExecutor(f.store,async()=>{});
 await executor.run(scope,t,new AbortController().signal,current);expect(seen.map(s=>s.id)).toEqual(['first','first','independent']);expect(seen[0]).toEqual(seen[1]);await executor.run(scope,t,new AbortController().signal,current);expect(seen.at(-1)?.id).toBe('second');expect(receipts.size).toBe(3);expect((await f.store.rows(scope)).every(r=>r.state==='accepted')).toBe(true);
});
it('conflict blocks dependent edits, preserves both versions across rebootstrap/logout/tombstone, resolves explicitly with new ID',async()=>{
 const f=await fixture();await f.store.enqueue(scope,'project','first',value('my first'),current);await f.store.enqueue(scope,'project','second',value('my latest',1),current);
 const server={questionId:'q',text:'server edit',mediaIds:[],version:4,updatedBy:'manager'};const conflict:ChecklistResult={outcome:'conflict',run:{...run,version:5,answers:[server]},current:server};
 await f.store.record(scope,(await f.store.rows(scope))[0]!,conflict,current);const before=await f.store.rows(scope);expect(await f.store.ready(scope)).toEqual([]);
 await f.snapshots.bootstrap(scope,{...bootstrap,checklists:[conflict.run],cursor:'again'},current);await f.snapshots.applyPage(scope,{...scope,fromCursor:'again',cursor:'removed',hasMore:false,changes:[{entity:'project',operation:'remove',projectId:'project',revision:'1',ordinal:1}]},current);
 expect(await f.store.run(scope,'project')).toBe(null);expect(await f.store.rows(scope)).toEqual(before);await f.snapshots.removeAccount(scope.accountId);f.reopen();expect(await f.store.rows(scope)).toEqual(before);expect(await f.store.rows({...scope,accountId:'other'})).toEqual([]);expect(await f.store.rows({...scope,organizationId:'other'})).toEqual([]);
 await f.snapshots.bootstrap(scope,{...bootstrap,checklists:[conflict.run]},current);await expect(f.store.enqueue(scope,'project','ordinary',value('overwrite',4),current)).rejects.toThrow('Resolve');
 await f.store.enqueue(scope,'project','resolution',value('merged',4),current,'first');const rows=await f.store.rows(scope);expect(rows.map(r=>r.state)).toEqual(['resolved','resolved','pending']);expect(rows[0]!.result).toBe(before[0]!.result);expect(rows[1]!.payload).toBe(before[1]!.payload);expect((await f.store.ready(scope))[0]?.id).toBe('resolution');
});
it('rejects wrong account transport and a late scope switch before sending or committing',async()=>{
 const f=await fixture();await f.store.enqueue(scope,'project',randomUUID(),value(),current);let sent=0;const t=transport(async()=>{sent++;return applied(value());});t.me=async()=>({accountId:'other',memberships:[{organizationId:'org'}]});
 await expect(new ChecklistExecutor(f.store,async()=>{}).run(scope,t,new AbortController().signal,current)).rejects.toThrow('Original owner');expect(sent).toBe(0);
 let active=true;const late=transport(async()=>{active=false;return applied(value());});await expect(new ChecklistExecutor(f.store,async()=>{}).run(scope,late,new AbortController().signal,()=>{if(!active)throw Error('scope');})).rejects.toThrow('scope');expect((await f.store.rows(scope))[0]?.state).toBe('pending');
});
it('authorization rejection retains frozen intent and requires explicit retry; pending photos wait for accepted receipt',async()=>{
 const f=await fixture(true);f.db().exec("UPDATE media_queue SET state='pending',accepted_at=NULL");await f.store.enqueue(scope,'project','photo-command',{...value(),mediaIds:['photo']},current);expect(await f.store.ready(scope)).toEqual([]);f.db().exec("UPDATE media_queue SET state='server_accepted',accepted_at='accepted'");expect((await f.store.ready(scope)).length).toBe(1);
 const t=transport(async()=>{throw new ApiError(404,'NOT_FOUND');});await new ChecklistExecutor(f.store,async()=>{}).run(scope,t,new AbortController().signal,current);expect((await f.store.rows(scope))[0]?.state).toBe('blocked');await f.store.retry(scope,current);expect((await f.store.ready(scope))[0]?.id).toBe('photo-command');
});
it('rejects mismatched acceptance and malformed sync requirements without advancing durable cursor',async()=>{
 const f=await fixture();await f.store.enqueue(scope,'project','command',value(),current);await expect(f.store.record(scope,(await f.store.rows(scope))[0]!,applied(value('wrong')),current)).rejects.toThrow('Mismatched');
 await expect(f.snapshots.applyPage(scope,{...scope,fromCursor:'first',cursor:'bad',hasMore:false,changes:[{entity:'checklist',operation:'upsert',projectId:'project',revision:'1',ordinal:1,checklist:{...run,organizationId:'other'}}]},current)).rejects.toThrow('Invalid');expect((await f.snapshots.metadata(scope))?.cursor).toBe('first');expect((await f.store.rows(scope))[0]?.state).toBe('pending');
});

it('freezes input immediately before waiting for the shared SQLite writer',async()=>{
 const f=await fixture();let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});
 const blocking=f.snapshots.write(async()=>{await gate;});const mutable=value();const owner={...scope};
 const enqueue=f.store.enqueue(owner,'project','frozen-input',mutable,current);mutable.text='mutated while waiting';mutable.questionId='q2';owner.accountId='other';release();await blocking;await enqueue;
 const row=(await f.store.rows(scope))[0]!;expect(row.account_id).toBe('owner');expect(row.question_id).toBe('q');expect(JSON.parse(row.payload).text).toBe('offline');
});
