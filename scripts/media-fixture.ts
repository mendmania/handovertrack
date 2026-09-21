// Automated camera substitute only. Never installed into a phone's data.
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, readdir, copyFile, link, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { SnapshotStore, type SqlConnection, type SqlDatabase } from '../apps/mobile/src/db/store';
import { CaptureService } from '../apps/mobile/src/media/service';
import type { CaptureFiles } from '../apps/mobile/src/media/types';

export async function captureFixture(root: string) {
  const path = join(root,'mobile.sqlite'); let db = new DatabaseSync(path);
  function connection(value: DatabaseSync): SqlConnection {
    return {
      async execAsync(sql) { value.exec(sql); },
      async runAsync(sql,...params) { return value.prepare(sql).run(...params); },
      async getAllAsync<T>(sql: string,...params: (string | number | null)[]) { return value.prepare(sql).all(...params) as T[]; },
      async getFirstAsync<T>(sql: string,...params: (string | number | null)[]) { return (value.prepare(sql).get(...params) as T) ?? null; },
    };
  }
  const adapter: SqlDatabase = {
    execAsync: (sql) => connection(db).execAsync(sql),
    runAsync: (sql,...params) => connection(db).runAsync(sql,...params),
    getAllAsync: <T>(sql: string,...params: (string | number | null)[]) => connection(db).getAllAsync<T>(sql,...params),
    getFirstAsync: <T>(sql: string,...params: (string | number | null)[]) => connection(db).getFirstAsync<T>(sql,...params),
    async withExclusiveTransactionAsync(run) {
      const tx = new DatabaseSync(path); tx.exec('PRAGMA foreign_keys=ON; BEGIN');
      try { await run(connection(tx)); tx.exec('COMMIT'); }
      catch (error) { tx.exec('ROLLBACK'); throw error; }
      finally { tx.close(); }
    },
  };
  const store = new SnapshotStore(adapter); await store.migrate();
  const full = (relative: string) => { if (!relative.startsWith('captures/') || relative.includes('..')) throw new Error('Unsafe fixture path'); return join(root,relative); };
  const exists = async (path: string) => { try { await stat(path); return true; } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; } };
  const inspect = async (path: string) => { const bytes = await readFile(path); return { size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; };
  const files: CaptureFiles = {
    randomUUID, now: () => new Date().toISOString(), uri: full,
    ensureDirectory: async (path) => { await mkdir(full(path),{ recursive:true }); },
    async writeManifest(path,text) { if (await exists(full(path))) { if (await readFile(full(path),'utf8') !== text) throw new Error('Manifest conflict'); } else await writeFile(full(path),text,{ flag:'wx' }); },
    readText: (path) => readFile(full(path),'utf8'),
    async listCaptureDirectories() {
      const found: string[] = [];
      async function walk(path: string,depth: number) {
        if (!await exists(join(root,path))) return;
        if (depth === 3) { found.push(path); return; }
        for (const item of await readdir(join(root,path),{ withFileTypes:true })) if (item.isDirectory()) await walk(path+'/'+item.name,depth+1);
      }
      await walk('captures',0); return found;
    },
    exists: (path) => exists(full(path)), inspect: (path) => inspect(full(path)), inspectCamera: inspect,
    copyFromCamera: (source,path) => copyFile(source,full(path)),
    move: (from,to) => link(full(from),full(to)),
  };
  let service = new CaptureService(store,files);
  return { store, files, get service() { return service; }, db: () => db,
    async reopen() { db.close(); db = new DatabaseSync(path); await store.migrate(); service = new CaptureService(store,files); },
    close() { db.close(); },
  };
}
