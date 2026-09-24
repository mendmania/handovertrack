import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { MediaFiles } from '../media/files';
export class ReportFiles extends MediaFiles {
 constructor(mediaRoot:string,reserve=256*1024*1024){super(join(mediaRoot,'reports'),reserve);}
 async artifact(id:string){return join(await this.directory(id),'proof.pdf');}
 async verified(path:string,hash:string,size:number){
  const f=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{const s=await f.stat();if(!s.isFile()||s.size!==size||s.size>50*1024*1024)throw Error('ARTIFACT_INTEGRITY');const bytes=await f.readFile();if(createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('ARTIFACT_INTEGRITY');return bytes;}finally{await f.close();}
 }
}
