import { renderReport } from './render';
import { open } from 'node:fs/promises';
import { digest } from './service';
import type { ReportSnapshot } from '@handovertrack/backend';
// The child remains bounded even if the dispatching worker is killed.
const deadline=setTimeout(()=>process.exit(1),120000);deadline.unref();
process.once('message',async(input:{snapshot:ReportSnapshot;snapshotHash:string;mediaRoot:string;output:string})=>{
 try{
  if(digest(input.snapshot)!==input.snapshotHash)throw Error('SNAPSHOT_INTEGRITY');
  const {bytes,pages}=await renderReport(input.snapshot,input.mediaRoot);
  const file=await open(input.output,'wx',0o600);try{await file.writeFile(bytes);await file.sync();}finally{await file.close();}
  process.send?.({pages});process.disconnect();
 }catch{process.exit(1);}
});
