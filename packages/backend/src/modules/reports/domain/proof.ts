import type { Project } from '../../projects/domain/project';
import type { ChecklistRun } from '../../checklists/domain/checklist';
export interface ProofNote { id: string; text: string; visibility: 'report' | 'internal' }
// Normalized [0,1] rectangles, origin top-left of the EXIF-auto-oriented image.
export interface ProofMark { x: number; y: number; width: number; height: number; label: string }
export interface ProofAnnotation { mediaId: string; marks: ProofMark[] }
export interface ProofPair { id: string; beforeId: string; afterId: string; caption: string }
export interface CompositionInput { baseVersion: number; notes: ProofNote[]; annotations: ProofAnnotation[]; pairs: ProofPair[] }
export interface Composition { version: number; notes: ProofNote[]; annotations: ProofAnnotation[]; pairs: ProofPair[] }
export interface ReportInput { projectVersion: number; checklistVersion: number; compositionVersion: number; mediaIds: string[] }
export interface ReportEvidence { id: string; accountId: string; capturedAt: string; acceptedAt: string; originalSha256: string; originalSize: number; variant: { version: 1; name: 'report'; sha256: string; size: number; width: number; height: number } }
export interface ReportSnapshot {
  id: string; revision: number; organizationId: string; createdBy: string; createdAt: string;
  template: 'completion-v1'; renderer: 'pdfkit-0.17.2/v1'; font: string;
  project: Project; checklist: ChecklistRun; composition: Composition; evidence: ReportEvidence[];
}
export interface ReportStatus { id: string; revision: number; createdAt: string; snapshotHash: string; state: 'pending' | 'running' | 'failed' | 'ready'; error: string | null; sha256: string | null; size: number | null; pages: number | null }
export function validComposition(v: CompositionInput): boolean {
  const unique=(ids:string[])=>new Set(ids).size===ids.length;
  return Number.isSafeInteger(v.baseVersion) && v.baseVersion>=0 && v.notes.length<=20 && v.annotations.length<=40 && v.pairs.length<=20 &&
    unique(v.notes.map(n=>n.id)) && unique(v.annotations.map(a=>a.mediaId)) && unique(v.pairs.map(p=>p.id)) &&
    v.notes.every(n=>typeof n.text==='string' && n.text.length<=8000 && ['report','internal'].includes(n.visibility)) &&
    v.pairs.every(p=>p.beforeId!==p.afterId && p.caption.length<=1000) &&
    v.annotations.every(a=>a.marks.length<=10 && a.marks.every(m=>[m.x,m.y,m.width,m.height].every(Number.isFinite) && m.x>=0 && m.y>=0 && m.width>0 && m.height>0 && m.x+m.width<=1 && m.y+m.height<=1 && m.label.length<=200));
}
