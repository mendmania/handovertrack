-- psql -v ON_ERROR_STOP=1 -v hold_id=<uuid> -v backup_at=<UTC> \
--   -v manifest_sha256=<verified hash> -v reason=<nonsecret gap description>
-- Run as migrator on the RESTORED copy only, BEFORE starting API/web/workers.
-- An old binary does not understand recovery_holds: never expose it.
BEGIN;
INSERT INTO recovery_holds(id,backup_at,manifest_sha256,reason)
VALUES (:'hold_id', :'backup_at', :'manifest_sha256', :'reason');
UPDATE report_shares SET revoked_at=clock_timestamp() WHERE revoked_at IS NULL;
DELETE FROM session;
COMMIT;
-- Do not insert a reconciliation until decision/audit/receipt loss AND current
-- memberships/assignments/accounts have been reconciled against authoritative
-- evidence. Invalidating shares alone is insufficient to resolve missing history.
