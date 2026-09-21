# HandoverTrack — Task 04: verified uploads, durable processing and manager gallery

Historical prepared prompt, explicitly assigned and implemented on 2026-09-21.
See docs/progress/04-upload-and-preview.md for actual results and remaining gates.
The following preserves the original assignment requirements.
Do not begin from a handoff alone. Use the existing HandoverTrack checkout and
preserve configuration, databases, original files and unrelated changes.

## Read and inspect first

Read applicable AGENTS.md, git status, README.md, docs/implementation-status.md,
docs/progress/03-offline-capture.md, the Task 02 handoff, runtime baseline, and
blueprint sections on verified upload finalization, local originals, leased jobs,
private media authorization, Task 04 and handoffs. Task 04 verified starting commit eb38130d9f719c68f2a5250c4bf8a57d14c48791 on main;
inspect the actual source state rather than assuming an unborn checkout.

First attempt every inherited native capture validation gap. Task 02's actual
Release native UI grant/edit/revoke, offline cold reopen, reconnect and scope
isolation checks passed before Task 03 began. That is not proof of camera capture.
Task 03 tests distinguish real SQLite/filesystem tests, simulator UI, and physical
camera execution. Keep any physical capture/permission/restart check marked
NOT RUN until directly evidenced. Do independent authorized work if device access
remains blocked, without declaring a dependent reliability gate complete.

## Existing implementation to reuse

- Node 24.21.0 / pnpm 10.32.1, pinned Expo 57 / RN 0.86.3, Fastify, Next, Kysely/pg,
  Better Auth with Expo/SecureStore and OpenAPI-generated transport.
- Manager create/edit/assign APIs use versions, operation-scoped idempotency,
  capability checks, audit and committed-order organization publication in one
  transaction. Bootstrap/pull cursor protocol is in the Task 02 handoff.
- `apps/mobile/src/db/store.ts`: SQLite migrations 1–3 in the existing
  `handovertrack-projects-v1.db`. Server project/assignment caches and their cursors
  have a different lifetime from evidence. `write()` shares the serialized
  transaction queue with sync. Never attach evidence cleanup to cache purges.
- `src/media/{types,repository,service}.ts`: immutable capture tickets, independent
  `media_local`, `media_queue`, `media_scopes`, `media_orphans`, scoped gallery and
  interruption recovery. Stable media IDs and ownership cannot be reassigned.
- `src/capture/native-files.ts`: private `Paths.document/captures/<account>/<org>/<id>`
  directories, relative paths, immutable `reservation.json` then `manifest.json`,
  verified staging `original.part`, final `original.jpg`. Size and SHA-256 checks,
  50 MiB limit, low-space rejection, awaited copy/move with no overwrite.
- `src/media/service.ts`: reserve before camera; copy/verify/finalize; atomically
  mark saved original + pending queue only afterwards. Reconcile interrupted
  states and valid orphans; quarantine unknown/corrupt ownership. No automatic
  deletion, even for partial originals. Missing/corrupt files cannot remain saved.
- `app/capture/[id].tsx`, `app/gallery.tsx`, provider and capture Query helpers:
  camera permissions, same-owner late-save preservation, explicit local-only
  status, account/org gallery, access blocking, startup/foreground reconciliation.
  Local Query data is disposable; read/commit and post-logout callback fences exist.
- Current queue is local intent only: `pending` or `blocked`. There is no uploader,
  network replay, upload progress, server media schema, processing handler or
  claim of upload success. Task 04 must add these for the actual media feature.
  Today `CaptureRepository.saved()` restores that local intent to `pending` on
  recovery. Extend this transition before adding upload states: verification
  must preserve uploading, server-accepted and terminal states, never silently
  requeue completed work. Add a regression for restart after server acceptance.
- Canonical future origin `https://handovertrack.com`; iOS bundle
  `com.gementis.handovertrack`; chosen scheme `handovertrack`. Preserve identities.
  Never invent Android/Apple/EAS settings. Existing signing metadata, if used for
  validation, belongs only to the actual local machine; do not commit assumptions.

## Authorized Task 04 outcome

Build the first complete local photo path with PostgreSQL and a private local
filesystem adapter, ready for a separately authorized existing-k3s trial later.
Do not deploy as part of this task.

1. Add idempotent, tenant/project-authorized upload session, streamed content and
   completion APIs with OpenAPI contracts. Reauthorize every replay. The stable
   media ID belongs to the original capture owner; do not substitute whichever
   account is currently signed in. Define conflict/denial and already-completed
   responses explicitly.
2. Stream authenticated bytes directly to private API staging files, outside the
   web BFF. Bound content length, verify allowed MIME/signature, dimensions and
   SHA-256. Never buffer unbounded uploads or trust a client path/extension/hash.
3. Fence concurrent upload writers and stale completion attempts. Use durable
   atomic no-replace finalization into immutable original storage; reconcile
   filesystem/DB crash boundaries, abandoned staging and lost completion replies.
   Mark server accepted only after verifying the immutable bytes and committing
   the authoritative record. Retries cannot overwrite an accepted original or
   create another logical asset.
4. Add actual processing jobs/outbox in the same appropriate DB transaction, a
   PostgreSQL lease-based executor in the existing worker, bounded retry/backoff,
   lease ownership/expiry fencing, recoverable startup and observable terminal
   failures. Implement the real image handler before generalizing job machinery.
5. Generate safe Sharp derivatives with versioned processing metadata. Add scoped
   media reads and manager gallery, with private/no-store policy as appropriate,
   explicit authorization and Query invalidation after real server commits.
6. Implement mobile queue upload execution from durable SQLite intent, persisted
   state/progress/retry information, cancellation/fencing on scope change,
   restart reconciliation, and explicit final server acceptance. Offline and
   expired authentication cannot lose originals or enqueue work under a new owner.
7. Preserve local originals by default. No automatic deletion until the explicit
   verified-server-acceptance and retention conditions in the blueprint are met;
   do not invent a destructive retention policy. Revoked access leaves local
   evidence blocked under its original owner with clear recovery behavior.

## Required acceptance

- Real native twenty-photo offline capture scenario, terminate/reopen, reconnect,
  interrupt uploads, lose completion responses, retry, restart worker: exactly
  twenty logical server assets with verified originals and valid derivatives.
- Disk-full, denied camera, missing/corrupt local original and local Query cache
  loss never produce false saved/uploaded status or lose queue ownership.
- Concurrent uploads/completions, expired leases and stale workers cannot accept
  corrupt bytes, overwrite originals or duplicate publication/processing effects.
- Malicious paths, oversize files, signature/dimension/hash mismatch, worker and
  cross-tenant media access attempts fail safely and nonenumeratingly.
- Filesystem/DB interruption points reconcile repeatedly; retry/re-drive is
  operationally understandable. Real worker process behavior is tested.
- Logout, account/org switch, membership/assignment revocation and rebootstrap
  preserve local pending bytes/intent and fence old async results/network writes.
- Existing Tasks 01–03 migration/auth/project/sync/capture tests pass; native
  capture limitations remain explicit until actually resolved.
- Frozen install, lint/import boundaries, typecheck, OpenAPI drift, relevant
  SQL/HTTP/filesystem/SQLite/Query tests, builds, browser journeys, Expo checks
  and secret-free client artifacts pass.

## Local commands and constraints

```sh
export PATH="$PWD/.tools/node_modules/.bin:$PATH"
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm contracts:check
pnpm test
pnpm test:integration
pnpm test:sync
pnpm build
pnpm test:api-build
pnpm test:worker
pnpm test:web
pnpm mobile:check
pnpm mobile:export
pnpm check:client-bundles
```

Read README and Task 03 handoff for running services and native checks. Preserve
`.env`, its mode and credentials. Never print credentials, dump sessions, reset
databases or delete originals to make tests pass. Add migrations; retain applied
migration text. Browser fixtures are retained local test projects. Tests may use
separate owned temporary storage and the dedicated `handovertrack_test` database.

Stay on `selfhosted-trial`: one PostgreSQL executor and private filesystem, no
Kafka, Temporal, Redis, S3/Garage, paid services, SMTP or cloud builds. No checklist,
report or sharing feature. No deployment, DNS/Cloudflare/k3s changes or push.
No Task 05 infrastructure work until separately assigned.

Finish docs/progress/04-upload-and-preview.md with actual APIs, upload/state/lease
rules, filesystem durability, ownership and recovery behavior, migration impact,
commands, PASS/FAIL/NOT RUN evidence and smallest remaining gaps. Update status
accurately and prepare docs/prompts/05-trial-deployment.md grounded in the current
code and the existing-cluster inspection requirement. Stop before Task 05.
