# HandoverTrack — Task 06: required-photo checklists and offline conflicts

Prepared prompt only. **Wait for explicit Task 06 assignment.** Task 05 deployment
is blocked, not complete; this prompt does not waive native, routing, artifact
access, storage or independent-recovery gates. Stop before implementing Task 06
in the Task 05 session.

## Inspect and preserve

Read applicable AGENTS.md, README, docs/implementation-status.md, Tasks 03–05
handoffs, infra/kubernetes/README.md and RECOVERY.md, runtime baseline and the
blueprint's Task 06 section. Verify current branch, remote, PR and working-tree
state before edits. Task 05 started from merged main 938478b on
codex/k3s-trial; inspect actual final state instead of assuming it is published.

Preserve .env, current auth secrets, PostgreSQL databases, PVCs, phone identity
com.gementis.handovertrack, SQLite database filename, media IDs, ownership,
originals, receipts and pending intent. No app uninstall/erase, reset/reseed over
real data, deletion, history rewrite, incompatible rollback or paid expansion.
Migrations 001–004 are applied and checksum immutable; add new migrations.
Phone SQLite version 4 must upgrade in place and cannot be downgraded.

First attempt inherited gates. The Task 05 phone was upgraded to current Task 04
Release at temporary LAN origin http://10.10.1.209:7331; that server was stopped
at handoff and restarted during the owner's login follow-up. Verify its current
availability. Camera permissions, offline captures/reopen, captured-photo isolation
and native binary upload are still NOT RUN. The phone's observed version-4 DB
was empty; install/migration success proves no camera or preservation scenario.
Use a fresh reachable override and existing verified signing metadata, preserving
all newly accumulated data. If live DNS/TLS are now ready, rebuild for verified
https://handovertrack.com and run real HTTPS capture-to-gallery checks.

Task 05's no-A/AAAA DNS, missing private package scope/server SSH and unverified
backup/restore blocked rollout; no HandoverTrack namespace or shared edge change
was applied. Reinspect those facts rather than assuming they persist. The local
OCI and container tests are not cluster evidence. Real/customer evidence remains
excluded from any disposable-only trial. If Task 06 is authorized while these
remain unavailable, perform only independent local implementation and preserve
all affected release gates as incomplete.

## Existing implementation to extend

- Backend pure domain/application ports plus PostgreSQL platform repositories.
  projects/assignments use manager authorization, optimistic baseVersion,
  Idempotency-Key, transactionally stored command receipts/audit/sync changes.
- `/sync/bootstrap` and `/sync/pull` are bounded complete snapshots and scoped
  incremental changes with signed cursors and membership/version fencing.
  Rebootstrap, logout or revocation never deletes local original evidence.
- Native SQLite authoritative reads and local write serialization; frozen owner
  credentials/scope cancellation; Query keys include account/org/project.
- Media upload identity is capture UUID plus immutable metadata, with direct
  streamed JPEG PUT, checksum/length verification and durable acceptance receipt.
  Accepted originals/jobs/events and image-v1 variants are immutable. Current
  access is rechecked on every replay, and original owner remains fixed.
- Task 05 adds restricted deployment preparation and optional worker heartbeat
  file only. It adds no checklist/report/share schema or product functionality.

## Implement

1. Add versioned checklist templates and project runs, questions/required-photo
   rules, answers and explicit completion policy. Snapshot the chosen template
   version for a run so later edits cannot rewrite existing requirements. Keep
   organization/project ownership explicit; use a minimal focused manager UI.
2. Add SQLite-backed answers and a transactional local command outbox, committed
   together. Stable command/entity IDs, frozen submitted payloads, per-entity
   ordering and optimistic versions must survive termination and lost replies.
   Do not reuse the media upload queue as an unrelated generic command store.
3. Extend backend commands, OpenAPI/generated contracts, command receipts and
   sync feed for actual answer/template/run operations. Replays return the same
   logical result; altered payloads under the same identity conflict. Validate
   current membership/assignment on dispatch/replay. Concurrent writes must
   either commit against the expected version or preserve a conflict.
4. Present a conflict inbox that retains the user's local answer alongside the
   current server answer/version. A deliberate resolution submits a new command
   and expected version. Do not silently use last-write-wins, discard old input,
   borrow a newly logged-in user's credentials or invalidate unrelated queries.
5. Enforce required answers and accepted, authorized, same-project original media
   on server-side completion. A local photo, pending upload or forged ready flag
   cannot satisfy required proof. Integrate completion with existing project
   version checks; do not introduce proof reports, PDFs, links or customer flows.

Keep implementation focused on Task 06. No Task 07 report composition/rendering,
Task 08 sharing, Kafka/Temporal/S3, new cluster or paid service.

## Validate and hand off

Run appropriate README regressions, migration repeat/upgrade tests and real
SQLite close/reopen tests. Add meaningful scenarios for offline answer commit +
outbox atomicity, duplicate delivery/lost committed reply, frozen payload,
per-entity ordering, simultaneous manager/worker edits, conflict preservation and
explicit resolution. Verify account/org/logout/unassignment/membership fences,
server rejection of missing/wrong-project/unaccepted proof and successful
completion only with valid current evidence. Preserve old media queues/originals
through the SQLite upgrade and scope changes.

Run updated native Release UI checks in place, including actual physical capture
where available, and live route checks only when Task 05 prerequisites pass.
Record PASS / FAIL / NOT RUN separately for local fixtures, simulator, physical
phone and live k3s. Do not label Task 06 complete while required gates are open.

Write docs/progress/06-checklists.md with command/conflict matrix, migrations,
compatibility, preserved-data checks, exact evidence and remaining gates. Update
implementation status and prepare docs/prompts/07-proof-reports.md from actual
code. Stop before Task 07.
