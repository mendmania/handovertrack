-- Evidence references accounts/projects, never revocable memberships.
CREATE TABLE media_uploads (
  id uuid PRIMARY KEY, upload_id uuid NOT NULL UNIQUE,
  account_id uuid NOT NULL REFERENCES app_accounts(id),
  organization_id uuid NOT NULL, project_id uuid NOT NULL,
  size integer NOT NULL CHECK(size BETWEEN 1 AND 52428800),
  sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
  width integer NOT NULL CHECK(width BETWEEN 1 AND 12000),
  height integer NOT NULL CHECK(height BETWEEN 1 AND 12000),
  mime text NOT NULL CHECK(mime='image/jpeg'),
  captured_at timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','staged','accepted')),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(width::bigint*height <= 50000000),
  FOREIGN KEY(organization_id,project_id) REFERENCES projects(organization_id,id)
);
CREATE INDEX media_owner ON media_uploads(organization_id,project_id,created_at,id);
CREATE TABLE media_jobs (
  media_id uuid PRIMARY KEY REFERENCES media_uploads(id),
  version integer NOT NULL DEFAULT 1 CHECK(version=1),
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','running','ready','failed')),
  attempts integer NOT NULL DEFAULT 0, next_run_at timestamptz NOT NULL DEFAULT now(),
  lease_owner uuid, lease_token integer NOT NULL DEFAULT 0, lease_until timestamptz,
  error text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_jobs_due ON media_jobs(state,next_run_at,lease_until);
CREATE TABLE media_variants (
  media_id uuid NOT NULL REFERENCES media_uploads(id), version integer NOT NULL,
  name text NOT NULL CHECK(name IN ('thumb','preview','report')),
  sha256 text NOT NULL, size integer NOT NULL, width integer NOT NULL, height integer NOT NULL,
  PRIMARY KEY(media_id,version,name)
);
CREATE TABLE media_events (
  media_id uuid NOT NULL REFERENCES media_uploads(id), event text NOT NULL CHECK(event IN ('accepted','ready')),
  version integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(media_id,event,version)
);
CREATE FUNCTION protect_media_upload() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.id,NEW.upload_id,NEW.account_id,NEW.organization_id,NEW.project_id,NEW.size,NEW.sha256,NEW.width,NEW.height,NEW.mime,NEW.captured_at)
    IS DISTINCT FROM
     (OLD.id,OLD.upload_id,OLD.account_id,OLD.organization_id,OLD.project_id,OLD.size,OLD.sha256,OLD.width,OLD.height,OLD.mime,OLD.captured_at)
    OR (OLD.state='accepted' AND (NEW.state,NEW.accepted_at) IS DISTINCT FROM (OLD.state,OLD.accepted_at))
  THEN RAISE EXCEPTION 'immutable media identity or accepted original'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_media BEFORE UPDATE ON media_uploads FOR EACH ROW EXECUTE FUNCTION protect_media_upload();
GRANT SELECT,INSERT,UPDATE ON media_uploads,media_jobs TO htrack_runtime;
GRANT SELECT,INSERT ON media_variants,media_events TO htrack_runtime;
