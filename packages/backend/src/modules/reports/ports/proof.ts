import type { Composition, CompositionInput, ReportInput, ReportStatus } from '../domain/proof';
export interface ProofReports {
 read(actor:string,org:string,project:string):Promise<{composition:Composition;reports:ReportStatus[]}>;
 save(actor:string,org:string,project:string,input:CompositionInput,key:string):Promise<Composition>;
 request(actor:string,org:string,project:string,input:ReportInput,key:string):Promise<ReportStatus>;
 status(actor:string,org:string,project:string,id:string):Promise<ReportStatus>;
 retry(actor:string,org:string,project:string,id:string,key:string):Promise<ReportStatus>;
}
