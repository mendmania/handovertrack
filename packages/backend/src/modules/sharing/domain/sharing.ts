// Customer names are unauthenticated claims, never account identities/signatures.
export interface ShareMetadata { reportId:string; revision:number; title:string; createdAt:string; sha256:string; size:number; pages:number }
export interface ReportShare { id:string; report:ShareMetadata; expiresAt:string; revokedAt:string|null; createdAt:string }
export interface ShareInput { expiresAt:string }
export interface DecisionInput { reportId:string; sha256:string; kind:'accept'|'correction'; claimedName:string; message:string; confirmed:true }
export interface CustomerDecision { id:string; reportId:string; sha256:string; kind:'accept'|'correction'; claimedName:string; message:string; createdAt:string }
export interface DecisionReview { decisionId:string; note:string; createdAt:string }
export interface ShareWorkspace { shares:ReportShare[]; decision:CustomerDecision|null; review:DecisionReview|null }
export interface GuestReport { share:ReportShare; decision: {kind:'accept'|'correction';createdAt:string}|null }
export function validDecision(value:DecisionInput) {
 return value.confirmed===true && ['accept','correction'].includes(value.kind) && typeof value.claimedName==='string' && value.claimedName.trim().length>0 && value.claimedName.length<=120 && typeof value.message==='string' && value.message.length<=2000 && (value.kind!=='correction'||value.message.trim().length>0);
}
