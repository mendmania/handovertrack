// Run only against a NEW isolated test database, before integration fixtures.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import pg from 'pg';
import {seed,fixtures} from '../packages/db/src/seed';
import {migrate} from '../packages/db/src/migrate';
const url=process.env.TEST_MIGRATION_DATABASE_URL;
if(!url || !new URL(url).pathname.endsWith('/handovertrack_test') || process.env.TASK06_ISOLATED!=='true')throw Error('New isolated test DB required');
const c=new pg.Client({connectionString:url});await c.connect();
try{
 assert.equal((await c.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n,0,'Refuse to overwrite a populated database');
 await c.query('CREATE TABLE schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
 for(const name of ['001_foundation.sql','002_projects_and_sync.sql','003_membership_lock_and_receipt_scope.sql','004_media_uploads.sql']){
  const sql=await readFile(new URL('../packages/db/migrations/'+name,import.meta.url),'utf8');await c.query('BEGIN');await c.query(sql);await c.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,createHash('sha256').update(sql).digest('hex')]);await c.query('COMMIT');
 }
 await seed({...process.env,DATABASE_URL:process.env.TEST_DATABASE_URL,MIGRATION_DATABASE_URL:url});
 const actor=(await c.query("SELECT account_id FROM memberships WHERE organization_id=$1 AND role='field_worker'",[fixtures.orgA])).rows[0].account_id;
 // A populated pre-upgrade pending media row must remain byte-for-byte identical.
 await c.query("INSERT INTO media_uploads(id,upload_id,account_id,organization_id,project_id,size,sha256,width,height,mime,captured_at) VALUES($1,$2,$3,$4,$5,12,$6,1,1,'image/jpeg',now())",[randomUUID(),randomUUID(),actor,fixtures.orgA,fixtures.projectA,'a'.repeat(64)]);
 const tables=(await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename as string);
 async function hashes(){const result:Record<string,string>={};for(const t of tables){const rows=(await c.query(`SELECT row_to_json(t)::text value FROM ${pg.escapeIdentifier(t)} t ORDER BY row_to_json(t)::text`)).rows;result[t]=createHash('sha256').update(JSON.stringify(rows)).digest('hex');}return result;}
 const before=await hashes();await migrate(url);await migrate(url);const after=await hashes();
 for(const t of tables.filter(t=>t!=='schema_migrations'))assert.equal(after[t],before[t],t);
 assert.equal((await c.query('SELECT count(*)::int n FROM schema_migrations')).rows[0].n,5);
 console.log(`PASS additive PostgreSQL 004→005 migration twice; ${tables.length-1} existing public table hashes unchanged, including auth/media/receipts`);
}finally{await c.end();}
