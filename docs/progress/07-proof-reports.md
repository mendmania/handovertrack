# Task 07 — proof composition and immutable private reports

**Status: local implementation and Task 07 validation PASS. No live release.**
Updated 2026-09-23. Explicitly assigned after Task 06. Work remains uncommitted on
`codex/checklists`, based on `d9a1ef5`; the pre-existing Task 06 changes are retained.
Task 08 is prepared only. Tasks 03–05 retain their existing unresolved gates.

## Preservation and isolation

Read README, implementation status, the Task 07 prompt and Tasks 03–06 handoffs.
Recorded the dirty working-tree baseline in ignored `.local/task07/baseline.json`.
No reset, checkout, clean, push, merge, deployment, remote service change or
activation of automation occurred. Existing `.env`, Task 06 env files, migrations
001–005, media queues/originals and recovery resources were preserved. No physical
phone was installed, launched, migrated or pointed at a different server.

Resumed the retained Task 06 regression backend on 3361 / PostgreSQL 55547 and
simulator `DE92B94F-367A-491F-89B4-1FD5386D04E1`. Added only a named synthetic
checklist project and answers. Task 07 uses `handovertrack-task07-postgres`, port
55548, volume `handovertrack-task07-data`, private ignored `test.env`, media beneath
`.local/task07/media`, API 3371 and web 3370. Task 06 databases and simulator remain
retained. Services started for these checks were stopped at handoff; volumes,
files, fixtures, generated PDFs and simulator storage are retained.

A private SQL dump precedes migration of the retained Task 06 regression database.
`report-migration.ts` compared every row of all **19 pre-existing public business/
auth tables** before/after 006 and its second application: identical counts and
hashes. `schema_migrations` appends only the new migration receipt. No SQLite
migration is introduced by Task 07; mobile remains on additive Task 06 schema 5.

## Task 06 native follow-up

The retained Release app was usable initially. Interactive observations:

| Check | Result |
|---|---|
| Sign in to the isolated backend; bootstrap and incremental pull | PASS after fixing the cache-buster regression below |
| Save answer while the owned API is stopped | PASS — “Saved locally / awaiting synchronization”, one pending command |
| Terminate and cold launch with API still stopped | PASS — same answer and pending count survive |
| Commit competing manager answer while device is offline; reconnect | PASS — local answer and server v1 both visible |
| Explicitly resolve with edited answer | PASS — server v2, zero pending/conflicts |
| SQLite retention after resolution | PASS — integrity `ok`, schema 5, one local answer, two durable commands: one resolved conflict and one accepted resolution |
| Native photo selection and pending-photo dependency | NOT RUN — retained simulator contains no captures; simulator camera cannot provide physical capture evidence |
| Further native logout/account/org/tombstone retention UI | NOT RUN — Mac locked when attempting the continuation; automation reported it could not unlock |
| Task 05 physical interruption/restart/lost upload response and owner recovery decisions | NOT RUN / unchanged |

Native testing found a real Task 06 regression: React Native `fetch` with
`cache: no-store` adds `_` to GET query strings. Strict query schemas rejected
incremental pull with 400 after successful bootstrap. Sync and gallery reads now
accept an ignored string `_` of at most 64 characters; command bodies remain
strict. Native refresh/restart/conflict checks and an HTTP regression verify the
fix. No native rebuild/install was needed. Historical Task 06 “NOT RUN” records
remain historical; the results above supersede only these specific checks.

## Implemented behavior

- A manager-only web proof workspace using scoped TanStack Query reads, polling,
  version conflicts and frozen idempotent retries. It edits notes, rectangle
  annotations and before/after pairs, selects evidence and requests/downloads PDFs.
  Conflicts retain the draft and show current server composition; merging or
  replacing it is explicit. Lost responses disable editing until exact retry.
- `proof_compositions` stores append-only aggregate revisions. A note is identified
  by its ID and composition revision; an annotation by media ID and composition
  revision; a pair by ID and composition revision. Editing any composition element
  creates a new revision. Source originals and earlier revisions are never edited.
- New notes default to **internal**. Only notes explicitly marked **report-visible**
  enter a snapshot. Internal text never enters report snapshots, PDFs or native
  sync. The composition endpoint itself requires current manager membership.
- Annotation rectangles use normalized `[0,1]` coordinates from the **top-left of
  the EXIF-auto-oriented image**. The web preview and PDF apply the same geometry.
  Rectangles must fit inside the image. Numbered PDF labels accompany the image.
  Pairs require two distinct accepted, authorized, same-project media IDs.
- Bounds: 20 notes of 8,000 characters, 40 annotated images with 10 marks each,
  200 characters per mark, 20 pairs with 1,000-character captions, 40 selected
  report images. Save, request and redrive commands require Origin, a stable
  idempotency key and current manager/project authorization, including replays.
- Composition writes and report requests/redrives append command receipts, audit
  and sync changes in the same transaction. Publication appends `report.ready`
  audit/sync in the artifact transaction. Sync uses a compatible project upsert
  invalidation, **without composition/internal-note payloads**; no new mobile sync
  entity or speculative offline annotation editor is introduced.

## Snapshot and rendering contract

`report_snapshots` freezes the project and its version, checklist run/version,
frozen requirements and answer versions, report-visible composition/revision,
selected media IDs/owners/capture and acceptance timestamps, original hashes/sizes,
and exact image-v1 report derivative identity/hash/size/dimensions. It records a
unique generation UUID, per-project report revision, timestamp, template
`completion-v1`, renderer `pdfkit-0.17.2/v1`, and bundled DejaVu Sans font SHA-256.
Canonical JSON hashing is stable across PostgreSQL jsonb key ordering.

Snapshot creation shares the existing membership → organization publication →
project locking order with project/checklist/composition commands. Expected
project, checklist and composition versions must match. The project must be
complete, and the **existing SQL completion predicate is re-evaluated inside this
transaction**, including legacy complete records. Every checklist evidence link,
annotation and pair member must be selected. All selected media must be accepted
in this project. A missing/not-ready/failed report derivative returns
`MEDIA_NOT_READY` with affected IDs/states; no partial snapshot/job is created.
Wait for processing or redrive the failed **image** job, then retry the request.
No later derivative substitution is allowed.

The child renderer reads only the frozen snapshot and verified private local
variants. It never re-queries mutable project, answer or composition state.
PDFKit receives plain text, generated image paths and verified bytes; there is no
HTML/browser renderer, script execution, URL fetch or user-supplied file path.
The checked PDF contains Latin, accented Latin, Greek and Cyrillic text. Other
font/script coverage is not claimed; the bundled font is versioned and licensed.

`report_jobs` has a report UUID identity separate from `media_jobs`. Claims use
`FOR UPDATE SKIP LOCKED`; expiration/reclaim increases a fencing token. Renewal,
failure and publication require the current unexpired owner/token. Five attempts
with bounded backoff end in an observable failed state. An authorized retry resets
that failed job's attempt budget and retains the snapshot/generation identity.
Published jobs and `report_artifacts` cannot be rewritten by the runtime role.

One report child runs per worker, independently of the image dispatcher: 256 MiB
JS heap, 120-second deadline (also enforced inside the child), 200 pages, 50 MiB
PDF, at most 40 images with sequential bounded decoding. A report cannot block
image dispatch in the worker event loop. Host/cgroup aggregate peak under maximum
mixed media/report load is **NOT RUN** and remains a future release capacity check.

The PDF is fsynced and hard-linked without overwrite to
`MEDIA_ROOT/reports/<generated-report-UUID>/proof.pdf`. Under the lease fence,
publication verifies the file hash, inserts an immutable artifact receipt and
commits ready/audit/sync atomically. A crash after the link but before commit leaves
an inaccessible file; deterministic retry verifies/reuses identical bytes and the
same inode. A conflicting file fails closed. Downloads reauthorize and verify
hash/size, use a generated attachment filename and `private, no-store` / `nosniff`.
They cannot expose an uncommitted or failed report. No sharing tokens/public links.
No retention cleanup deletes snapshots, PDFs or partial report attempts.

## API, source and operations

Generated OpenAPI contracts and typed client wrappers cover:

- `GET/POST /v1/organizations/{org}/projects/{project}/proof`
- `POST .../reports`, `GET .../reports/{report}`
- `POST .../reports/{report}/retry`, `GET .../reports/{report}/pdf`

The existing web BFF allowlists these paths and preserves download headers.
Core files are `packages/backend/src/modules/reports`,
`packages/platform/src/reports`, `apps/api/src/reports.ts`,
`apps/web/components/proof-reports.tsx`, and worker dispatcher/build entries.
Migration **006_proof_reports.sql** is additive. PDFKit 0.17.2 and its types are
pinned; the worker build copies the bundled, hash-verified font and license.

Run against an explicitly isolated test environment (the generic runner otherwise
loads the saved `.env`; do not accidentally target the normal local or live DB):

```sh
export PATH="$PWD/.tools/node_modules/.bin:$PATH"
TASK07_ISOLATED=true node --env-file=.local/task07/test.env --import tsx scripts/report-integration.ts
TASK07_ISOLATED=true node --env-file=.local/task07/test.env --import tsx scripts/report-worker-crash.ts
```

`report-worker-crash.ts` uses the retained fixture written by report integration;
stop other workers on that test database first. The browser report test similarly
requires that fixture and its built API/web/worker with the same MEDIA_ROOT.
`REPORT_TEST_OUTPUT` selects a separate retained artifact directory for additional
integration runs. Never run a worker over Task 06's mixed test-root media jobs.

## Validation results

| Validation | Result |
|---|---|
| Additive 005→006 migration and repeated migration; 19 table row hashes | PASS |
| 54 SQLite/outbox/media/query unit tests | PASS |
| Notes, annotation bounds, accepted distinct same-project pairs; worker/tenant/anonymous denials | PASS |
| Completion revalidation, legacy/current invalid complete records, missing/pending/foreign/duplicate selected proof | PASS |
| Concurrent composition writes; stale project/checklist/composition versions | PASS |
| Duplicate request and lost committed responses, frozen ID/payload reuse, changed-payload rejection | PASS |
| Injected request audit failure rolls back snapshot/job/receipt/publication | PASS |
| Notes/annotations/pairs/project/answers edited after claim; rendered snapshot and hashes unchanged | PASS |
| Current authorization on request/replay/status/redrive/download after membership removal | PASS |
| Stale lease denial, post-link/pre-commit fault, identical-byte/inode recovery | PASS |
| Actual built worker SIGKILL after claim, replacement claim, one artifact, graceful SIGTERM | PASS |
| Corrupt selected derivative fails closed; restored exact derivative + explicit idempotent redrive | PASS |
| Artifact immutability, private download headers/checksum, runtime UPDATE denials | PASS |
| Actual PDF text/structure extraction and visual inspection of all 12 pages | PASS |
| Long notes/checklists, Latin/Greek/Cyrillic, EXIF rotation, numbered annotations, before/after pair, metadata and no clipping | PASS |
| PDF excludes internal/later content and has no JavaScript/open/URL actions | PASS |
| Report browser: notes/annotation/pair edit, conflict, lost save/report response, exact retry, download original hash | PASS |
| Existing seven browser project/auth/scope/gallery/checklist journeys | PASS |
| Checklist completion-bypass/authorization/transaction regressions | PASS |
| Sync ordering/cursor/revocation/audit rollback regressions | PASS |
| Media 20-image restart/lost reply, worker SIGKILL, 60 derivatives, integrity/lease/redrive regressions | PASS |
| Lint/import boundaries, TypeScript and generated-contract consistency | PASS |
| API/web/worker builds and built report child including font assets | PASS |
| Frozen dependency install; Expo dependency check/iOS export; 42 client artifacts scanned for configured secrets | PASS |
| Built API and worker startup/readiness/graceful shutdown smoke | PASS |
| Final integrity sweep: all 12 retained report PDFs and 10 accepted originals match receipts/hashes | PASS |
| Native additional UI gates and Task 05 physical/recovery gates | NOT RUN, as above |
| Live deployment/upgrade, remote recovery restore of new report schema/files | NOT RUN — outside this assignment |

Initial checks found and fixed the native cache-buster rejection, explicit web
control labels and PDF word-wrapping/annotation-caption pagination. An early
browser test also removed its response interceptor too soon; it now waits for
retry completion before removing it. Final results above refer to corrected code,
not those failed attempts. Old synthetic PDFs remain retained separately.

Ignored `.local/task07/` contains logs, a private pre-migration dump, row/file hash
manifests, simulator SQL summary, worker-crash receipt, browser screenshot and the
actual representative PDF with page renders/text. The nonsecret checked-in
`evidence/07-local-validation.json` summarizes the final evidence.

## Future release and handoff

No live upgrade is authorized. Migration 006 needs matching API/worker with the
report child and bundled font; the old worker cannot process these jobs. Retain
renderer/template/font versions needed by unfinished snapshots; change rendering
semantics under a new version rather than altering an existing published report.
Task 06's existing old-client/new-checklist-entity compatibility gate still applies.
SQLite remains v5 and authoritative, with all pending ownership/retention rules.

Before a future release, validate combined resource budgets and termination grace
(report work may take up to 120 seconds), filesystem no-replace/fsync on the target,
backup/restore coverage for **all four new tables and report PDF/partial paths**,
and compatible API/web/worker/native rollout. Existing Task 05 backups predate this
schema and must not be described as backing up reports. Preserve all prior phone,
server, failed transfer and recovery-rehearsal resources.

Continue only after explicit assignment of [Task 08](../prompts/08-sharing-and-decisions.md).
