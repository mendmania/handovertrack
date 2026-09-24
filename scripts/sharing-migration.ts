import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import pg from 'pg';
import {migrate} from '../packages/db/src/migrate';
if(process.env.TASK08_ISOLATED!=='true'||!process.env.TEST_MIGRATION_DATABASE_URL)throw Error('Explicit isolated migration check required');
const url=new URL(process.env.TEST_MIGRATION_DATABASE_URL);if(!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/handovertrack_test')throw Error('Isolated test DB only');
const c=new pg.Client({connectionString:url.toString()});await c.connect();
try{
 const tables=(await c.query<{tablename:string}>("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename!='schema_migrations' ORDER BY tablename")).rows.map(x=>x.tablename);
 async function fingerprints(){const hashes:Record<string,{count:number;hash:string}>={};for(const name of tables){const rows=(await c.query(`SELECT row_to_json(t)::text AS row FROM ${pg.escapeIdentifier(name)} t ORDER BY row_to_json(t)::text`)).rows.map(r=>r.row);hashes[name]={count:rows.length,hash:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};}return hashes;}
 const before=await fingerprints();await migrate(url.toString());await migrate(url.toString());const after=await fingerprints();assert.deepEqual(after,before);await writeFile('.local/task08/migration-preservation.json',JSON.stringify({status:'PASS',tables:before},null,2));console.log(`PASS all ${tables.length} pre-existing tables unchanged by additive migration 007 and rerun`);
}finally{await c.end();}
