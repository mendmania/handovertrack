-- Append-only template versions; runs copy requirements, never join mutable templates.
CREATE TABLE checklist_templates (
  organization_id uuid NOT NULL REFERENCES organizations(id), id uuid NOT NULL,
  version integer NOT NULL CHECK(version>0), title text NOT NULL,
  questions jsonb NOT NULL CHECK(jsonb_typeof(questions)='array'),
  PRIMARY KEY(organization_id,id,version)
);
CREATE TABLE checklist_runs (
  organization_id uuid NOT NULL, project_id uuid NOT NULL, id uuid NOT NULL UNIQUE,
  template_id uuid NOT NULL, template_version integer NOT NULL, title text NOT NULL,
  questions jsonb NOT NULL, answers jsonb NOT NULL DEFAULT '[]', version integer NOT NULL DEFAULT 1,
  PRIMARY KEY(organization_id,project_id),
  FOREIGN KEY(organization_id,project_id) REFERENCES projects(organization_id,id),
  FOREIGN KEY(organization_id,template_id,template_version) REFERENCES checklist_templates(organization_id,id,version)
);
CREATE FUNCTION protect_checklist_run() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.organization_id,NEW.project_id,NEW.id,NEW.template_id,NEW.template_version,NEW.title,NEW.questions)
    IS DISTINCT FROM (OLD.organization_id,OLD.project_id,OLD.id,OLD.template_id,OLD.template_version,OLD.title,OLD.questions)
  THEN RAISE EXCEPTION 'immutable checklist requirements'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_checklist_run BEFORE UPDATE ON checklist_runs FOR EACH ROW EXECUTE FUNCTION protect_checklist_run();
ALTER TABLE sync_changes DROP CONSTRAINT sync_changes_entity_check;
ALTER TABLE sync_changes ADD CONSTRAINT sync_changes_entity_check CHECK(entity IN ('project','assignment','checklist','template'));
GRANT SELECT,INSERT ON checklist_templates TO htrack_runtime;
GRANT SELECT,INSERT,UPDATE ON checklist_runs TO htrack_runtime;
-- Defense in depth for every status transition, including older application routes.
-- Existing complete rows are retained; they are checked whenever written again.
CREATE FUNCTION checklist_complete(organization uuid, project uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM public.checklist_runs r WHERE r.organization_id=organization AND r.project_id=project)
 AND NOT EXISTS (
   SELECT 1 FROM public.checklist_runs r CROSS JOIN LATERAL jsonb_array_elements(r.questions) q
   LEFT JOIN LATERAL (SELECT a FROM jsonb_array_elements(r.answers) a WHERE a->>'questionId'=q->>'id') a ON true
   WHERE r.organization_id=organization AND r.project_id=project AND (
     ((q->>'required')::boolean AND length(trim(coalesce(a.a->>'text','')))=0)
     OR (SELECT count(DISTINCT m.id) FROM jsonb_array_elements_text(coalesce(a.a->'mediaIds','[]')) link
       JOIN public.media_uploads m ON m.id::text=link.value
       JOIN public.media_events e ON e.media_id=m.id AND e.event='accepted' AND e.version=1
       WHERE m.organization_id=organization AND m.project_id=project AND m.state='accepted' AND m.accepted_at IS NOT NULL) < (q->>'minPhotos')::integer
   )
 )
$$;
CREATE FUNCTION enforce_project_completion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='complete' AND NOT public.checklist_complete(NEW.organization_id,NEW.id)
 THEN RAISE EXCEPTION 'checklist completion required' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER project_completion BEFORE INSERT OR UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION enforce_project_completion();
