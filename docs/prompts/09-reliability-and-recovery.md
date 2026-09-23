# HandoverTrack — Task 09: whole-trial reliability and recovery

**Prepared only. Do not start without an explicit Task 09 assignment.**
Read README, repository instructions, implementation status, Tasks 03–08 handoffs,
the current Task 05 checkpoint, RECOVERY.md and the Task 08 PR/CI results. Inspect
branch/main and preserve all source/configuration, original photos, accepted receipts,
SQLite v5 answer/media queues and conflict payloads, immutable reports, shares,
decisions, previous backups and retained recovery rehearsals.

Task 08 adds local-only scoped report capabilities and append-only customer decisions.
The full Task 06–08 PR is not a live deployment. A main merge can trigger image
publication. Do not infer authorization to merge, deploy, activate automation or
change registry visibility. Confirm the actual authorized release scope first;
independent local validation can continue without waiting for phone/recovery access.

## Reliability work

- Review the actual remaining native gates. Preserve Task 07's passing isolated
  answer offline-save/cold-restart/conflict/resolution evidence. Do not repeat passed
  checks without a concrete changed-code or unresolved-risk reason. Additional native
  photo dependency/account/org/tombstone retention UI and Task 05 physical upload
  interruption/restart/lost response remain open. Use retained isolated/test-device
  data; do not replace the existing HTTPS phone or its SQLite v4 originals.
- Validate the complete local path: accepted same-project evidence → frozen checklist
  completion → versioned composition → frozen PDF job → immutable publication →
  expiring/revocable exact-revision sharing → customer decision → manager review.
  Exercise process/database/response interruptions at meaningful transaction and
  lease boundaries. Retain original pending intent and stable idempotency keys.
- Check combined upload/image/report/API resource budgets, bounded queues, PDF child
  deadlines, shutdown/drain, guest PDF concurrency and durable rate limits. Review
  the conservative shared-BFF-IP guest budget. Measure capacity; do not invent limits
  or claim production readiness from a small synthetic run.
- Inspect guest and manager cache isolation, secrets in URLs/logs/telemetry/proxies,
  expiry/revocation under load and any edge range/conditional/cache behavior. Verify
  historical customer decisions never become acceptance of newer revisions. Typed
  guest names remain unverified claims. Do not introduce an identity/signature claim.

## Recovery and compatibility

Use isolated copies and additive migrations only. Validate recovery coverage of SQL
001–007, SQLite v5, immutable originals and derivatives, all report snapshots/jobs/
artifacts, PDF/partial paths, six sharing/decision/rate tables, command/audit receipts
and ownership. Preserve all prior backups and rehearsal resources. Restored revoked
or expired capabilities must stay unavailable; decisions and PDF hashes must match.
No raw share secret should be recoverable from database backups. Keep renderer/font
versions required by unfinished snapshots and published artifacts.

Task 05's technical restore success does not prove independent access after Mac loss
or dependable operations. Record independent backup/key access, designated operator,
accepted cadence/availability and missed/failed-backup response only from actual
owner decisions/evidence. Do not ask for secret values or invent approval. If these
remain unavailable, mark NOT RUN/unconfirmed and continue independent local work.
Do not activate unattended backup/deployment automation without explicit authorization.

Validate old-client/new-feed compatibility deliberately: the existing phone cannot
consume Task 06 checklist entities and must not be silently migrated/downgraded over
pending work. Any future release requires a separately authorized coordinated API,
web, worker/native and database plan, target filesystem/resource validation and
current backup/application restore. Do not use old 001–004 release assumptions.

## Deliverables and boundaries

Run meaningful automated and interactive regressions; record PASS/FAIL/NOT RUN and
specific blockers. Write docs/progress/09-reliability-and-recovery.md, update status,
and prepare an evidence-based trial readiness decision. Task 10 S3/Kafka/Temporal
expansion stays deferred; do not add paid services, message users, send invitations,
merge, deploy or activate automation without the owner's explicit assignment.
