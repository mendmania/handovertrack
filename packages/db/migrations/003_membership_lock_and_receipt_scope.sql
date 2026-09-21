-- SELECT ... FOR SHARE requires UPDATE privilege in PostgreSQL. This narrow,
-- read-only helper lets command transactions lock membership rows without
-- granting runtime any ability to change organization authorization.
CREATE FUNCTION lock_membership(organization uuid, account uuid)
RETURNS TABLE(role text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog
AS $$ SELECT m.role,m.created_at FROM public.memberships m
      WHERE m.organization_id=organization AND m.account_id=account FOR SHARE $$;
REVOKE ALL ON FUNCTION lock_membership(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lock_membership(uuid,uuid) TO htrack_runtime;
-- Keys are scoped to actor + organization + operation. The legacy sentinel
-- preserves receipts written by the immediately preceding local implementation.
ALTER TABLE command_receipts ADD COLUMN operation text NOT NULL DEFAULT 'legacy';
ALTER TABLE command_receipts DROP CONSTRAINT command_receipts_pkey;
ALTER TABLE command_receipts ADD PRIMARY KEY (organization_id,actor_account_id,operation,idempotency_key);
