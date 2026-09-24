# Reliability and recovery operator quickstart

Task 09 is **implemented-awaiting-validation; disposable-only**. This document
prepares operations; it authorizes no live command, release or automation.
Read [the acceptance matrix](../../docs/progress/09-reliability-and-recovery.md)
before relying on a local PASS. Independent backup custody, keys and operator
arrangements were explicitly deferred by the owner on 2026-09-24.

## Reproduce locally

Use a clean checkout with Node 24.21.0, pnpm 10.32.1 and Docker. Build the API and
worker, install Playwright Chromium, then run `pnpm test:recovery`. Its setup
refuses existing Task 09 container names or env files. It creates only two
loopback PostgreSQL 18.3 containers (55550/55551), random private credentials,
unique retained volumes and `.local/task09` data. Nothing invokes Kubernetes,
SSH, the live operator backup script, or a phone. Do not delete prior resources
just to satisfy this guard: use another clean workspace/Docker test environment,
or explicitly stop/rename and retain owned prior attempts and their paths first.

The runner executes real HTTP/SQLite capture-to-decision work, the full browser
suite, concurrent image/PDF work, `pg_dump -Fc`, verified media archival and
`pg_restore --exit-on-error`. It stops its database containers afterward; backups,
volumes, logs and failed attempts remain. Source writers are closed and the
rehearsal asserts no other database client exists before the paired backup.
Production needs an explicit ingress/writer drain, not this synthetic assertion.
The archive uses the same bounded, hash-verifying reader and safe regular-file
verification primitives as the operator backup/restore tools. It is not a claim
that the live Kubernetes transport was retested. Private `.env`, `.local`, PDFs,
photos, tokens, SQL dumps and signing data must never enter Git or CI artifacts.

## Restore without restoring revoked authority

An old dump lacks post-backup decisions, revocations, membership changes and
sessions invalidated later. No application can infer those missing events. The
historical schema-004 restoration below `RECOVERY.md` is historical evidence,
not a safe current-schema reopening procedure.

1. Keep all restored API/web ingress and clients disconnected. Stop/drain all
   restored writers. Use new isolated DB/storage and credentials, never overwrite
   current accepted evidence. Preserve the original dump, archive, checksum ledger,
   renderer/font assets, configuration identity and the known recovery timestamp.
2. Verify the entire paired archive/dump manifest. Restore roles/ownership and
   grants with least privilege; do not give runtime migration privileges. Restore
   all regular files, including original, staged, preview, report and partial
   paths. Validate every table count/hash/owner and every file hash **before**
   applying deliberate recovery changes. Never edit the historical backup.
3. For a 001–007 dump, apply additive `008_recovery.sql` using the normal migration
   runner while serving remains stopped. For a current dump, verify all eight
   stored migration checksums. Never launch an older binary that ignores holds.
4. As the restored migration/operator role, execute
   `scripts/ops/quarantine-restore.sql` with `psql -v ON_ERROR_STOP=1` and explicit
   `hold_id` (new UUID), `backup_at` (verified UTC recovery point),
   `manifest_sha256` and `reason` (nonsecret gap description/evidence reference).
   This single transaction creates a durable hold, irrevocably revokes **all**
   restored shares and invalidates **all** restored sessions. This is mandatory
   even when the backup itself contains no known revoked links. Preserve the old
   rows in the original backup for forensic comparison. Do not run on live data.
5. Use the Task 09 or later compatible API. With an unresolved hold, every route
   except `/health/live` returns no-store `503 RECOVERY_REQUIRED`, including auth,
   readiness, original/preview/PDF reads, guest decisions and command replays.
   Hold checks are uncached; the runtime cannot dismiss them. Stop/drain requests
   before adding holds; the check does not retroactively cancel in-flight streams.
   Private report/image jobs may be resumed and verified while serving stays held.
6. Record the known loss interval (backup point through last authoritative
   observation), unknown interval and missing history. Retain authoritative
   post-backup decision rows, their exact command receipts, audit records, report
   references and sync sequence evidence separately. Never reinterpret an absent
   decision as permission for a conflicting new decision. Share invalidation is
   necessary but **does not** reconcile decision history.
7. Reconcile current accounts, memberships, assignments and revocations against
   authoritative evidence. Reconcile decisions, reviews, receipts, audit/feed
   order and any later report dependencies transactionally; preserve IDs and
   immutable bytes. Do not fabricate a decision or disable uniqueness/immutability
   triggers to make an import fit. Unknown or contradictory history means STOP.
8. Only after a named operator verifies complete decision **and** authority
   reconciliation, retain a private review record and SHA-256. An explicitly
   authorized operator may insert one `recovery_reconciliations` row per hold,
   recording that evidence hash and a nonsecret operator note. This privileged
   insertion is the reopening gate; there is deliberately no runtime endpoint or
   automated release command. Acknowledging loss is not reconciliation. If history
   cannot be established, remain held and agree a separate evidence-preserving
   recovery plan. New shares must be deliberately issued after reconciliation;
   old tokens and sessions stay invalid. Recheck denial and new-login behavior
   before separately authorizing ingress.

The Task 09 rehearsal stops at step 6: it proves the known missing decision is
recorded and conflicting writes remain impossible, rather than inventing an
operator reconciliation. It preserves both the source post-backup history and
the held restored copy. Same-Mac technical restore is not independent recovery.
A dump does not self-detect restoration: skipping quarantine or serving an older
binary bypasses this operational safety boundary and is prohibited.

## Signals and failure response

`pnpm ops:signals` is read-only. Supply explicit `DATABASE_URL`, `MEDIA_ROOT`,
`WORKER_HEARTBEAT_FILE` and `BACKUP_RECEIPT_FILE` from private operator configuration.
Its JSON contains counts/ages and safe codes, never connection strings or bearer
secrets. Exit 2 means attention. A receipt needs `result: PASS`, `completedAt` UTC
and a verified `manifestSha256`; this checks freshness/format, not independent
custody or ongoing artifact integrity. Example thresholds are oldest due work
300 seconds, heartbeat 90 seconds and backup age 24 hours. These are diagnostic
thresholds, **not an owner-approved backup cadence or availability promise**.

- `DATABASE_UNAVAILABLE`: stop intake; preserve all pending commands and originals.
  Check the owned database and capacity; do not reseed or reset queues.
- `QUEUE_OVERDUE` / `TERMINAL_JOBS`: inspect oldest work and lease/attempt state.
  A process heartbeat alone is not proof of progress. Restore dependencies, then
  use the authorized retry path. Never rewrite published artifacts or reset IDs.
- `WORKER_HEARTBEAT_STALE` / unknown: inspect worker health and queue age together.
  The existing heartbeat is process liveness; it does not assert database access.
- `STORAGE_PRESSURE` or intake `507 STORAGE_FULL`: preserve client intent. Recover
  capacity without deleting originals/backups; retry the same ID afterward.
  Intake reserves configured bytes and 1,024 reported free inodes. Filesystems
  reporting zero total inodes have unknown inode capacity. Actual ENOSPC/EDQUOT
  is also mapped to retryable 507. No host-wide fill test is authorized.
- `BACKUP_STALE` / `BACKUP_UNKNOWN`: investigate before further nondisposable work.
  Do not manufacture a fresh receipt. A responsible operator, destination, key
  access after Mac loss and missed/failed-run response remain undecided.
- `RECOVERY_REQUIRED`: follow the hold procedure. Do not satisfy readiness by
  deleting a hold or pointing a restored API at another database.

No notifications or unattended jobs are enabled by these checks. Guest requests
currently share the BFF's conservative IP budget (360 reads / 60 writes per minute;
fixed 8,192 durable slots) and two concurrent PDF responses per API process.
Upload bodies are limited to two concurrent 50 MiB streams per API process, with
120-second timeouts. Worker image/report dispatchers each handle one job; reports
run in a 256 MiB V8 child with a 120-second deadline, 200-page and 50 MiB output
caps. These are per-process bounds, not a tested multi-replica service guarantee.

## Coordinated compatibility and rollback plan — live execution NOT RUN

1. Require physical native/recovery/operator gates, target free-byte/inode/resource
   measurements and a fresh verified current application restore. Record the
   actual live SHA/image/schema/client versions; a published image is not a rollout.
   Capture all pending phone state and SQLite/files consistently before upgrade.
2. Obtain a separate release authorization. Preserve the current live image,
   manifest/resources and data. Drain ingress, API and worker writers; retain jobs
   and lease tokens. Stop if a writer will not drain or a backup pair mismatches.
3. Verify the candidate supports the exact ordered migration checksums:
   `001_foundation`, `002_projects_and_sync`, `003_membership_lock_and_receipt_scope`,
   `004_media_uploads`, `005_checklists`, `006_proof_reports`, `007_scoped_sharing`,
   `008_recovery` (all `.sql`). Apply only unapplied additive files with the
   migration role. Verify ownership, row/file preservation and a second no-op run.
4. Keep clients disconnected while deploying a matching API, web and worker as a
   coordinated set. Preserve renderer `completion-v1`, its font and all frozen
   jobs. Do not allow a schema-004 binary to serve a restored 008 DB or treat
   additive SQL as evidence of semantic rollback compatibility.
5. Upgrade supported native clients on separately authorized test/device tracks,
   with durable queue/file backup and proven v4→v5 retention. The retained v4
   phone rejects `checklist` feed entities; source-level compatibility regression
   deliberately verifies that rejection. Until all participating devices are
   compatible or a reviewed version-aware feed policy exists, **do not reopen**
   them onto the checklist feed. Never silently install v5 on the current phone.
6. Verify full journey, authorization, guest cache/revocation, lease recovery,
   immutable hashes, scopes and offline queues; record smoke evidence. Only then
   separately authorize reopening. Live rehearsal is NOT RUN in Task 09.
7. On failure, stop serving and preserve new accepted evidence. A prior application
   image is usable only if proven compatible with current schema, data, feeds,
   holds and pending jobs. No SQLite downgrade, SQL down migration, restored old DB
   over new accepted evidence, forced queue reset or artifact overwrite. If that
   compatibility proof is absent, remain stopped and fix forward. Emergency
   recovery uses a new held copy and reconciliation, never a blind rollback.

Current automatic release guards intentionally reject a 005–008 schema-contract
change against the retained 001–004 release. Task 09 leaves that rejection intact.
Do not activate the deployment controller or weaken it to publish this trial.
