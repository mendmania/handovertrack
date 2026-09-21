-- Stable versions survive assignment removal/regrant. Runtime cannot hard-delete
-- business rows or mutate membership/identity. All command writes are transactional.
ALTER TABLE projects ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE assignments ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE assignments ADD COLUMN active boolean NOT NULL DEFAULT true;
ALTER TABLE assignments ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE organization_sync_state (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  min_retained_revision bigint NOT NULL DEFAULT 0 CHECK (min_retained_revision >= 0 AND min_retained_revision <= revision)
);
INSERT INTO organization_sync_state(organization_id) SELECT id FROM organizations;
CREATE TABLE sync_changes (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  revision bigint NOT NULL CHECK (revision > 0), ordinal integer NOT NULL CHECK (ordinal > 0),
  entity text NOT NULL CHECK (entity IN ('project', 'assignment')),
  operation text NOT NULL CHECK (operation IN ('upsert', 'remove')),
  project_id uuid NOT NULL, account_id uuid, payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, revision, ordinal),
  CHECK ((operation='upsert' AND payload IS NOT NULL) OR (operation='remove' AND payload IS NULL))
);
CREATE TABLE command_receipts (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_account_id uuid NOT NULL REFERENCES app_accounts(id), idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 128),
  request_hash text NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, actor_account_id, idempotency_key)
);
CREATE TABLE audit_records (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_account_id uuid NOT NULL REFERENCES app_accounts(id), action text NOT NULL,
  project_id uuid NOT NULL, account_id uuid, revision bigint NOT NULL,
  before_state jsonb, after_state jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, revision)
);
GRANT INSERT, UPDATE ON projects, assignments TO htrack_runtime;
GRANT SELECT, INSERT, UPDATE ON organization_sync_state TO htrack_runtime;
GRANT SELECT, INSERT ON sync_changes, command_receipts, audit_records TO htrack_runtime;
