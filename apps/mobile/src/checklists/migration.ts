// Local intent never references the disposable server caches with cascading FKs.
export const migrationV5 = `
CREATE TABLE cached_checklists (
 account_id TEXT NOT NULL, organization_id TEXT NOT NULL, project_id TEXT NOT NULL,
 payload TEXT NOT NULL, PRIMARY KEY(account_id,organization_id,project_id)
);
CREATE TABLE cached_checklist_templates (
 account_id TEXT NOT NULL, organization_id TEXT NOT NULL, id TEXT NOT NULL, version INTEGER NOT NULL,
 payload TEXT NOT NULL, PRIMARY KEY(account_id,organization_id,id,version)
);
CREATE TABLE checklist_local_answers (
 account_id TEXT NOT NULL, organization_id TEXT NOT NULL, project_id TEXT NOT NULL,
 run_id TEXT NOT NULL, question_id TEXT NOT NULL, payload TEXT NOT NULL,
 PRIMARY KEY(account_id,organization_id,run_id,question_id)
);
CREATE TABLE checklist_outbox (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
 account_id TEXT NOT NULL, organization_id TEXT NOT NULL, project_id TEXT NOT NULL,
 run_id TEXT NOT NULL, question_id TEXT NOT NULL, payload TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('pending','accepted','conflict','blocked','resolved')),
 result TEXT, reason TEXT, created_at TEXT NOT NULL
);
CREATE INDEX checklist_outbox_owner ON checklist_outbox(account_id,organization_id,run_id,question_id,sequence);
CREATE TRIGGER checklist_command_frozen BEFORE UPDATE OF id,account_id,organization_id,project_id,run_id,question_id,payload ON checklist_outbox
BEGIN SELECT RAISE(ABORT,'immutable checklist command'); END;
CREATE TRIGGER checklist_answer_owner BEFORE UPDATE OF account_id,organization_id,project_id,run_id,question_id ON checklist_local_answers
BEGIN SELECT RAISE(ABORT,'immutable checklist answer owner'); END;
-- v4 could have consumed a new server bootstrap while ignoring its checklist arrays.
-- Preserve offline project rows; request a complete checklist-aware bootstrap next time.
UPDATE cache_scopes SET cursor=NULL,last_page=NULL;
PRAGMA user_version=5;
`;
