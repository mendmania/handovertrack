-- Operator-owned restore quarantine. No runtime grant can dismiss a hold.
-- Before starting any restored API, insert a hold in the same transaction that
-- invalidates restored shares and sessions. See RECOVERY.md; restoring a dump
-- cannot detect authority or decisions committed after its recovery point.
CREATE TABLE recovery_holds (
 id uuid PRIMARY KEY,
 backup_at timestamptz NOT NULL,
 held_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 manifest_sha256 text NOT NULL CHECK(manifest_sha256 ~ '^[0-9a-f]{64}$'),
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 2000)
);
CREATE TABLE recovery_reconciliations (
 hold_id uuid PRIMARY KEY REFERENCES recovery_holds(id),
 reconciled_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 evidence_sha256 text NOT NULL CHECK(evidence_sha256 ~ '^[0-9a-f]{64}$'),
 operator_note text NOT NULL CHECK(length(trim(operator_note)) BETWEEN 1 AND 2000)
);
GRANT SELECT ON recovery_holds,recovery_reconciliations TO htrack_runtime;
