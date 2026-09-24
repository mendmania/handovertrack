# HandoverTrack — Task 07: proof composition and immutable reports

**Prepared prompt only. Wait for explicit Task 07 assignment.** Task 06 is locally
implemented, with native interactive validation still open. No Task 07 code or
live release is authorized by this handoff.

Read README, repository instructions, implementation status, Tasks 03–06 handoffs,
the current Task 05 checkpoint, and deployment/recovery runbooks. Inspect the
actual branch and working tree; Task 06 was developed on `codex/checklists` from
`d9a1ef5`, with changes left uncommitted. Preserve all existing work and data.

## Existing foundation

- PostgreSQL migrations 001–005; SQLite user_version 5 in the unchanged
  `handovertrack-projects-v1.db`. New migrations must be additive. Do not edit
  checksum-applied SQL or downgrade the device schema.
- Append-only checklist template versions; one frozen run per project; independent
  answer versions and explicit required text/minimum distinct accepted-photo rules.
- Authorized template/run/answer/completion commands with frozen idempotency,
  transactional business/audit/receipt/sync publication. Answer conflicts are
  HTTP 200 `ChecklistResult { outcome: 'conflict', run, current }` with durable
  receipts; other version conflicts are HTTP 409.
- A separate native SQLite answer/outbox store preserves all pending commands,
  conflict payloads and superseded resolutions under immutable account/org owners.
  Rebootstrap/logout/tombstones never delete it or original media queues/files.
- All completion paths enforce the common checklist policy: explicit completion,
  existing project update, new project creation (complete-at-creation rejected),
  plus a database status trigger. Reopening is required before editing a complete
  project's answers. Preserve this invariant when composing reports.
- Accepted original uploads, immutable ownership/hashes, image-v1 worker jobs,
  private thumb/preview/report variants and scoped manager galleries. Accepted
  originals, not local/pending flags or derivative readiness, satisfy checklist
  proof. Workers newly link their own accepted project media, or retain the current
  answer's already-authorized links; managers can use the project's accepted evidence.
- TanStack Query remains on both clients; mobile SQLite is authoritative offline.
  Existing cursor authorization/epoch fencing and pending-work retention still apply.

## Task 07 scope, when assigned

Implement manager-authorized notes, versioned image annotations and before/after
pairs through a focused web composition/review interface. Pairs must reference
distinct accepted media from the same authorized project. Store annotation
geometry in a documented orientation/coordinate system, tied to immutable source
media; edits create revisions and never alter original bytes. Define which notes
are report-visible versus internal, and exclude internal content by default.
Version composition edits and use authorized idempotent commands with audit and
appropriate sync publication. Freeze pair/note content and versions in reports;
later edits must not change an earlier report.
Keep pending mobile answers and capture workflows intact; no speculative offline
annotation editor is required for this assignment.

Generate immutable versioned PDF reports from a consistent server snapshot of the
project, frozen checklist requirements, accepted answers and selected same-project
evidence, notes, annotation revisions and pairs. Record exact source versions,
IDs, checksums, selected derivative identities and generation identity. Persist
template/renderer/font versions and generation timestamps with the snapshot.
The worker renders that frozen input, not current mutable project/checklist rows.
Report retries/lost responses reuse the same request identity and revision without
rewriting a published artifact; corrections create a new explicit revision.
Concurrent changes must cause a clear version conflict or produce a correctly
identified frozen snapshot; never silently mix revisions.

Use the existing completion predicate for report eligibility and recheck it within
the snapshot transaction, including for legacy projects already marked complete.
Keep this slice to completion reports; defer incomplete draft-report workflows.
Required missing/unaccepted/foreign media must fail safely. Pending/failed media
processing needs an explicit recoverable state; do not silently omit evidence or
substitute a different asset/version after the snapshot is frozen.

Use the existing PostgreSQL durable-job/lease conventions and private filesystem
storage for bounded report rendering. Keep original evidence immutable; use
verified report variants appropriately and distinguish pending/failed processing.
Define and implement report states, authorized request/status/download contracts,
audit/receipts, retention and crash-safe no-overwrite publication. Extend generated
OpenAPI contracts and scoped web Query UI. Preserve offline pending answers and
conflicts; they cannot appear as accepted server proof or be silently discarded.

Report jobs need their own valid identity/schema; existing media_jobs is keyed by
media_id. Reuse tested lease/fencing conventions without pretending a report is an
uploaded photo or breaking image-v1 processing. Bound page/image count, memory,
render time and concurrency; prevent report work from starving image jobs. Verify
crash recovery between file publication and DB commit, and reject stale-worker
publication after lease loss. Published report hashes and source snapshots are
immutable; retries return/reuse the recorded artifact.

Authorize every report request/status/download and replay against current access;
keep artifacts private/no-store with generated storage paths. Treat report text
as untrusted content, and prevent user text/URLs from causing script execution,
arbitrary local-file reads or renderer network requests. Use only verified,
authorized local assets and a self-hosted renderer with no paid service.

Do not add public links, sharing tokens, customer approvals, notification sends,
Task 08 flows, paid services, new clusters, S3, Kafka or Temporal. Do not push,
merge, deploy or activate automation without a separate explicit instruction.

## Validation and preservation

Use isolated local services/simulator/test-device data. The existing HTTPS phone
still has SQLite v4 and its Task 05 originals/receipts; do not point it at a new
schema/backend or overwrite its installed app without separate authorization and
compatibility/migration validation. The live runtime remains Task 04-era source,
not the current checkout. Keep old backups, partial attempts and three stopped
recovery rehearsals. Coordinate API/client upgrades for checklist sync entities;
old native clients cannot understand them.

Finish available local native Task 06 UI checks on an unlocked Mac, without
blocking independent report work on unavailable physical Task 05 tests or owner
recovery decisions. Keep all unperformed gates explicitly NOT RUN. Do not repeat
passed scenarios without a specific change, regression risk or missing evidence.

Reuse Task 06's retained isolated databases/services and simulator after verifying
their configuration; they were stopped at handoff. Resume native offline answer
save, terminate/reopen, concurrent server edit, reconnect/conflict resolution,
photo selection and account/scope retention. Do not apply local migrations to
the live database. Update future image/schema/client compatibility instructions
for any Task 07 additions; no live release is part of this assignment.

Test consistent report snapshots, duplicate generation, lost responses, concurrent
answer/project edits, authorization, missing/unaccepted/foreign proof, worker
crash/lease fencing, immutable artifact hashes and migration/data preservation.
Run relevant checklist, completion-bypass, sync, media and client regressions.
Include note/annotation/pair revisions changed during rendering, tampered pair
references, renderer content/path isolation, and redrive after partial publication.
Verify rendered PDFs visually and through page/text inspection with representative
long text, Unicode, rotated images, annotations, before/after pairs and multipage
checklists. Check clipping, readable labels, missing evidence and revision metadata.
Preserve honest PASS/FAIL/NOT RUN labels; a generated file alone is not visual QA.
Write `docs/progress/07-proof-reports.md`, update implementation status and prepare
Task 08's prompt from actual code. Stop before Task 08.
