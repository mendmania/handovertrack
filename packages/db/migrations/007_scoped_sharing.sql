-- Capabilities bind one already-published artifact. Secrets are hash-only.
CREATE TABLE report_shares (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, project_id uuid NOT NULL,
 report_id uuid NOT NULL REFERENCES report_artifacts(report_id), token_hash text NOT NULL UNIQUE CHECK(token_hash ~ '^[0-9a-f]{64}$'),
 metadata jsonb NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz,
 created_by uuid NOT NULL REFERENCES app_accounts(id), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(organization_id,project_id) REFERENCES projects(organization_id,id), CHECK(expires_at>created_at)
);
CREATE INDEX report_shares_report ON report_shares(report_id,created_at);
CREATE FUNCTION protect_report_share() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(NEW)-'revoked_at') IS DISTINCT FROM (to_jsonb(OLD)-'revoked_at')
 OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at)
 THEN RAISE EXCEPTION 'immutable share capability'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_report_share BEFORE UPDATE ON report_shares FOR EACH ROW EXECUTE FUNCTION protect_report_share();
-- One terminal customer decision across ALL links to a report. New revision, new decision.
CREATE TABLE customer_decisions (
 id uuid PRIMARY KEY, report_id uuid NOT NULL UNIQUE REFERENCES report_artifacts(report_id),
 share_id uuid NOT NULL REFERENCES report_shares(id), sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 kind text NOT NULL CHECK(kind IN ('accept','correction')), claimed_name text NOT NULL CHECK(length(trim(claimed_name)) BETWEEN 1 AND 120),
 message text NOT NULL CHECK(length(message)<=2000), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(kind!='correction' OR length(trim(message))>0)
);
CREATE TABLE customer_command_receipts (
 share_id uuid NOT NULL REFERENCES report_shares(id), idempotency_key text NOT NULL,
 request_hash text NOT NULL, response jsonb NOT NULL, PRIMARY KEY(share_id,idempotency_key)
);
CREATE TABLE customer_decision_reviews (
 decision_id uuid PRIMARY KEY REFERENCES customer_decisions(id), reviewed_by uuid NOT NULL REFERENCES app_accounts(id),
 note text NOT NULL CHECK(length(note)<=2000), created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- Explicit guest actor boundary: never pretend the capability holder is an app account.
CREATE TABLE customer_audit_records (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id),
 project_id uuid NOT NULL, revision bigint NOT NULL, share_id uuid NOT NULL REFERENCES report_shares(id),
 decision_id uuid NOT NULL UNIQUE REFERENCES customer_decisions(id), report_id uuid NOT NULL REFERENCES report_artifacts(report_id),
 sha256 text NOT NULL, action text NOT NULL CHECK(action='customer.decision'), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(organization_id,revision), FOREIGN KEY(organization_id,project_id) REFERENCES projects(organization_id,id)
);
-- Fixed-size hash slots bound durable rate state to 8192 rows, even for random IDs/IPs.
CREATE TABLE guest_rate_slots (slot integer PRIMARY KEY CHECK(slot>=0 AND slot<8192), window_start bigint NOT NULL, count integer NOT NULL);
GRANT SELECT,INSERT ON report_shares,customer_decisions,customer_command_receipts,customer_decision_reviews,customer_audit_records TO htrack_runtime;
GRANT UPDATE(revoked_at) ON report_shares TO htrack_runtime;
GRANT SELECT,INSERT,UPDATE ON guest_rate_slots TO htrack_runtime;
