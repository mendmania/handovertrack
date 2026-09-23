import PDFDocument from 'pdfkit';
import type { Readable } from 'node:stream';
import { open, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import type { ReportSnapshot, ReportEvidence } from '@handovertrack/backend';
import { MediaFiles, imageOptions } from '../media/files';
import { FONT_HASH, digest } from './service';
// No HTML, URL loading, scripts or user-supplied filesystem paths.
export async function renderReport(snapshot:ReportSnapshot,mediaRoot:string):Promise<{bytes:Buffer;pages:number}>{
 if(snapshot.template!=='completion-v1'||snapshot.renderer!=='pdfkit-0.17.2/v1'||snapshot.font!=='DejaVuSans/'+FONT_HASH||snapshot.evidence.length>40)throw Error('UNSUPPORTED_RENDERER');
 const font=await readFile(new URL('./assets/DejaVuSans.ttf',import.meta.url));if(createHash('sha256').update(font).digest('hex')!==FONT_HASH)throw Error('FONT_INTEGRITY');
 const doc=new PDFDocument({size:'A4',margin:48,autoFirstPage:false,compress:true,info:{Title:'HandoverTrack completion report',Author:'HandoverTrack',CreationDate:new Date(snapshot.createdAt),ModDate:new Date(snapshot.createdAt)}}) as PDFKit.PDFDocument & Readable;
 const chunks:Buffer[]=[];let bytes=0,pages=0;
 const completed=new Promise<Buffer>((resolve,reject)=>{doc.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>50*1024*1024){doc.destroy(Error('REPORT_TOO_LARGE'));return;}chunks.push(chunk);});doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
 // Observe rejection immediately if page/asset validation aborts before doc.end().
 void completed.catch(()=>{});
 doc.registerFont('Proof',font);doc.font('Proof');
 const clean=(value:string)=>value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'');
 function page(title:string){
  if(++pages>200)throw Error('REPORT_PAGE_LIMIT');doc.addPage();
  doc.fillColor('#174e4b').fontSize(10).text('HANDOVERTRACK  /  COMPLETION RECORD',48,32,{lineBreak:false});
  doc.fillColor('#536463').fontSize(8).text(`Report r${snapshot.revision} • ${snapshot.id} • ${pages}`,48,805,{lineBreak:false});
  doc.fillColor('#172c2b').fontSize(19).text(title,48,62,{width:499});doc.y=Math.max(doc.y+14,100);
 }
 function text(value:string,size=11){
  doc.fontSize(size).fillColor('#203936');
  // Explicit line pagination also bounds exceptionally long words/paragraphs.
  for(const paragraph of clean(value).split('\n')){
   let line='';
   for(const word of paragraph.split(/(\s+)/)){
    if(doc.widthOfString(line+word)<=497){line+=word;continue;}
    if(line.trim())lineOut(line.trimEnd());line='';
    // Only break inside a token when that token cannot fit a whole line.
    for(const char of word.trimStart()) { if(doc.widthOfString(line+char)>497&&line){lineOut(line);line='';}line+=char; }
   }
   lineOut(line||' ');
  }
  doc.y+=7;
  function lineOut(line:string){if(doc.y+size*1.5>780){page('Continued');doc.fontSize(size).fillColor('#203936');}const y=doc.y;doc.text(line,48,y,{width:499,lineBreak:false});doc.y=y+size*1.5;}
 }
 const files=new MediaFiles(mediaRoot,0);
 async function photo(e:ReportEvidence,x:number,y:number,w:number,h:number){
  const priorY=doc.y;
  if(e.variant.version!==1||e.variant.name!=='report')throw Error('UNSUPPORTED_VARIANT');
  const handle=await open(await files.path(e.id,'v1-report.webp'),constants.O_RDONLY|constants.O_NOFOLLOW);let data:Buffer;
  try{const s=await handle.stat();if(!s.isFile()||s.size!==e.variant.size||s.size>16*1024*1024)throw Error('ASSET_INTEGRITY');data=await handle.readFile();}finally{await handle.close();}
  if(createHash('sha256').update(data).digest('hex')!==e.variant.sha256)throw Error('ASSET_INTEGRITY');
  const meta=await sharp(data,imageOptions).metadata();if(meta.width!==e.variant.width||meta.height!==e.variant.height)throw Error('ASSET_INTEGRITY');
  const jpeg=await sharp(data,imageOptions).jpeg({quality:88}).timeout({seconds:15}).toBuffer();
  const scale=Math.min(w/e.variant.width,h/e.variant.height),iw=e.variant.width*scale,ih=e.variant.height*scale,ix=x+(w-iw)/2,iy=y+(h-ih)/2;
  doc.image(jpeg,ix,iy,{width:iw,height:ih});
  const marks=snapshot.composition.annotations.find(a=>a.mediaId===e.id)?.marks??[];
  marks.forEach((m,index)=>{doc.save().lineWidth(2).strokeColor('#e14926').rect(ix+m.x*iw,iy+m.y*ih,m.width*iw,m.height*ih).stroke();doc.rect(ix+m.x*iw,iy+m.y*ih,19,18).fill('#e14926');doc.fillColor('white').fontSize(10).text(String(index+1),ix+m.x*iw+4,iy+m.y*ih+2,{lineBreak:false});doc.restore();});
  doc.y=priorY;
 }
 try{
  page('Completion report');text(snapshot.project.name,20);text(snapshot.project.address);text(snapshot.project.description);
  text(`Generated ${snapshot.createdAt}\nReport revision ${snapshot.revision}\nProject v${snapshot.project.version} • Checklist v${snapshot.checklist.version} • Composition v${snapshot.composition.version}`,10);
  text(`Snapshot SHA-256\n${digest(snapshot)}`,9);
  text(`Template ${snapshot.template}\nRenderer ${snapshot.renderer}\nFont DejaVu Sans — ${FONT_HASH}`,8);
  page('Checklist and accepted answers');text(`${snapshot.checklist.title} • Frozen template v${snapshot.checklist.templateVersion}`,14);
  for(const q of snapshot.checklist.questions){const a=snapshot.checklist.answers.find(a=>a.questionId===q.id);text(q.label,13);text(`${q.required?'Required answer':'Optional answer'} • Minimum photos: ${q.minPhotos} • Answer v${a?.version??0}`,9);text(a?.text||'(No answer)');text('Evidence: '+(a?.mediaIds.join(', ')||'None'),8);}
  if(snapshot.composition.notes.length){page('Manager report notes');for(const n of snapshot.composition.notes){text(n.text);text(`Note ${n.id} • Composition r${snapshot.composition.version}`,8);}}
  for(const pair of snapshot.composition.pairs){page('Before / after');text(pair.caption,13);text(`Pair ${pair.id} • Composition r${snapshot.composition.version}`,8);
   if(doc.y+370>780)page('Before / after images');const top=Math.max(doc.y,150);
   doc.fillColor('#203936').fontSize(12).text('Before',48,top,{lineBreak:false}).text('After',310,top,{lineBreak:false});
   const before=snapshot.evidence.find(e=>e.id===pair.beforeId),after=snapshot.evidence.find(e=>e.id===pair.afterId);if(!before||!after)throw Error('MISSING_PAIR_EVIDENCE');
   await photo(before,48,top+30,235,300);await photo(after,310,top+30,235,300);doc.y=top+350;text(`Before ${before.id}\nAfter ${after.id}\nNumbered annotation labels appear on the individual evidence pages.`,8);
  }
  for(const e of snapshot.evidence){page('Accepted project evidence');text(`Photo ${e.id}\nCaptured ${e.capturedAt}\nAccepted ${e.acceptedAt}`,9);
   await photo(e,48,doc.y+5,499,340);doc.y+=360;
   const marks=snapshot.composition.annotations.find(a=>a.mediaId===e.id)?.marks??[];for(let i=0;i<marks.length;i++)text(`${i+1}. ${marks[i]!.label}`,10);
   text(`Annotations: composition r${snapshot.composition.version}; normalized, top-left, EXIF-oriented.\nOriginal SHA-256: ${e.originalSha256}\nImage-v1 report derivative SHA-256: ${e.variant.sha256}`,8);
  }
  doc.end();return {bytes:await completed,pages};
 }catch(error){doc.destroy();throw error;}
}
