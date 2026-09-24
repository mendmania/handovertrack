-- Additive Task 07: all revisions and accepted artifacts are append-only.
CREATE TABLE proof_compositions (
 organization_id uuid NOT NULL, project_id uuid NOT NULL, version integer NOT NULL CHECK(version>0),
 content jsonb NOT NULL, created_by uuid NOT NULL REFERENCES app_accounts(id), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(organization_id,project_id,version), FOREIGN KEY(organization_id,project_id) REFERENCES projects(organization_id,id)
);
CREATE TABLE report_snapshots (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, project_id uuid NOT NULL, revision integer NOT NULL CHECK(revision>0),
 snapshot jsonb NOT NULL, snapshot_hash text NOT NULL CHECK(snapshot_hash ~ '^[0-9a-f]{64}$'),
 created_by uuid NOT NULL REFERENCES app_accounts(id), created_at timestamptz NOT NULL,
 UNIQUE(organization_id,project_id,revision), FOREIGN KEY(organization_id,project_id) REFERENCES projects(organization_id,id)
);
CREATE TABLE report_jobs (
 report_id uuid PRIMARY KEY REFERENCES report_snapshots(id), state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','running','failed','ready')),
 attempts integer NOT NULL DEFAULT 0, next_run_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 lease_owner uuid, lease_token integer NOT NULL DEFAULT 0, lease_until timestamptz, error text,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX report_jobs_due ON report_jobs(state,next_run_at);
CREATE TABLE report_artifacts (
 report_id uuid PRIMARY KEY REFERENCES report_snapshots(id), sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 size integer NOT NULL CHECK(size>0 AND size<=52428800), pages integer NOT NULL CHECK(pages>0 AND pages<=200),
 published_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT SELECT,INSERT ON proof_compositions,report_snapshots,report_artifacts TO htrack_runtime;
GRANT SELECT,INSERT,UPDATE ON report_jobs TO htrack_runtime;
CREATE FUNCTION protect_ready_report_job() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.report_id IS DISTINCT FROM OLD.report_id OR (OLD.state='ready' AND NEW IS DISTINCT FROM OLD)
 THEN RAISE EXCEPTION 'immutable report publication'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_ready_report_job BEFORE UPDATE ON report_jobs FOR EACH ROW EXECUTE FUNCTION protect_ready_report_job();
