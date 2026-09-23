import type { ChecklistCommand, ChecklistResult, ChecklistRun, ChecklistTemplate, TemplateInput } from '../domain/checklist';
export interface Checklists {
  templates(actor: string, org: string): Promise<ChecklistTemplate[]>;
  publish(actor: string, org: string, input: TemplateInput, key: string): Promise<ChecklistTemplate>;
  read(actor: string, org: string, project: string): Promise<{ run: ChecklistRun | null }>;
  command(actor: string, org: string, project: string, input: ChecklistCommand, key: string): Promise<ChecklistResult>;
}
