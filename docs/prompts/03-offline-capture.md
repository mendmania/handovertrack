# HandoverTrack — Task 03: durable offline camera capture

This is a prepared next-agent prompt, not authorization to start Task 03. Wait
for the owner to explicitly assign it. Work in the existing HandoverTrack checkout
with `deep-research-report.md`. Do not restart the architecture or reset local data.

## Read and inspect first

Read applicable AGENTS.md, git status, README.md, docs/implementation-status.md,
docs/progress/01-foundation.md, docs/progress/02-projects-and-sync.md,
docs/architecture/runtime-baseline.md and the blueprint's mobile isolation,
capture, Task 03 and handoff sections. Preserve `.env`, the blueprint, kickoff
prompt and unrelated changes. The checkout started without a commit; inspect the
actual current source reference, and do not invent a base SHA.

First attempt any named inherited validation gap in the Task 02 handoff. Native
Task 01 login, assigned snapshot, offline cold reopen, reconnect, account/org
switching and revocation were actually demonstrated on 2026-09-21. Do not infer
Task 02/03 native reliability from that older build, automated SQLite tests or a
successful export. If native interaction remains blocked, keep affected checks
NOT RUN and their gates open while completing independent authorized work.

## Existing code to reuse

- Node 24.21.0, pnpm 10.32.1; pinned Expo 57, React Native 0.86.3, React 19.2.3.
  Use the ignored `.tools/node_modules/.bin` toolchain on this machine.
- Fastify/Better Auth API, separate pure backend ports/application and PostgreSQL
  adapters; OpenAPI-generated contracts; Next manager workspace and worker process.
- Managers create/edit projects and grant/revoke worker assignments online with
  versions, idempotency, audit and a committed-order organization sync feed.
- Mobile `src/db/store.ts`: SQLite migrations 1/2, account/org-scoped project and
  assignment read models, durable pull cursor, atomic page application. Preserve
  the existing `handovertrack-projects-v1.db` filename so migrations run in place.
- `src/snapshot/coordinator.ts` owns current bootstrap/pull, lifecycle coalescing,
  scope fencing, cursor recovery and local Query invalidation. The historic class
  name does not imply snapshot-only behavior.
- `src/providers.tsx` owns SecureStore scope and auth transitions. Offline reads
  are provisional for 24 hours. Authoritative denial closes access before cleanup;
  logout currently deletes ONLY server read-model rows. New evidence must never
  be added to that deletion path. Role/membership epoch changes also close access.
- Both clients use TanStack Query. Mobile renders SQLite through scoped local
  read keys; Query remains disposable. Credentials stay out of SQLite and Query.
- Native identity remains `com.gementis.handovertrack`, chosen scheme `handovertrack`.
  Xcode 26.5, CocoaPods and iPhone 17 Pro iOS 26.5 simulator are installed locally.
  A simulator camera limitation is not proof of real capture; record it honestly.
- No media originals, capture, uploads, queue handlers, generic push engine,
  checklist tables, reports or deployment currently exist.

## Authorized Task 03 outcome

Implement LOCAL durable offline capture only:

1. Add explicit camera permission handling and capture for an authorized locally
   available project. Handle denial, cancellation, limited device support and
   low storage with truthful, usable UI.
2. Give each capture a stable scoped media ID; store its original in app-owned
   durable storage, with account/org ownership, never temporary camera cache only.
3. Add additive SQLite `media_local` and upload-intent/queue migrations appropriate
   to this real feature. Save original bytes and durable queue intent before
   showing “Saved on device.” Queue entries are local intent, not upload success.
4. Implement a scoped local gallery and Query-backed reads. Termination, restart
   or Query cache eviction must not lose originals or pending intent.
5. Define and implement interruption recovery across the filesystem/SQLite
   boundary: staging/copy interruption, orphan files, missing originals and stale
   states. Reconcile on startup; never report success for a missing file.
6. Preserve unsynced evidence under its original owner during logout, account/org
   switches, access revocation, cursor expiry and rebootstrap. Hide/quarantine it
   from other identities; never replay as a newly signed-in user or automatically
   delete it. Provide a clear pending/blocked state and recovery policy.

Do not add speculative durable commands unrelated to capture. Do not claim that
local capture changes are server accepted. UI says saved/queued, never uploaded.

## Acceptance and validation

- Real native offline capture, terminate/reopen: every captured original and
  queue item survives and displays under the original scope.
- Query cache loss reconstructs the same gallery and queue from durable state.
- Failed permission, disk-full/write failure and interrupted copy/transaction
  cannot produce false success; reconciliation is repeatable.
- Account and organization switching never exposes, deletes or reassigns another
  account's pending work. Revocation and failed rebootstrap preserve its bytes and
  intent while closing access. Old async callbacks cannot publish into new scope.
- SQL migrations upgrade existing Task 02 data safely and repeat without loss.
- Existing Task 01/02 authorization, sync, cursor and manager command tests pass.
- Locked install, import boundaries/lint, typecheck, contract drift, appropriate
  filesystem/SQLite/Query tests, builds, browser regressions and Expo checks pass.
- Record device/simulator limitations separately with PASS/FAIL/NOT RUN. A mock
  camera or Node filesystem test cannot substitute for an actual native capture.

Local commands (preserve existing `.env`; never print credentials):

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

Start missing services with `pnpm dev:api`, `pnpm dev:web`, `pnpm dev:mobile`;
inspect owned processes before restarting them. Seed preserves credentials and
existing assignment versions/state. Use README's account names and private local
password retrieval. No database reset or global Docker cleanup is allowed.

## Constraints and handoff

Stay on `selfhosted-trial`, no new paid services. Preserve canonical
`https://handovertrack.com` and the registered iOS bundle. No invented Android,
Apple team, EAS or signing identity. No uploads/server media routes, jobs, image
processing, checklists, reports, Kafka, Temporal, Redis or S3. No deployment,
DNS/Cloudflare/k3s changes or push. Do not start Task 04.

Finish with docs/progress/03-offline-capture.md, accurate implementation status,
additive migration and compatibility notes, capture/queue state machine,
filesystem/SQLite recovery rules, actual validation evidence and limitations.
Write a self-contained docs/prompts/04-upload-and-preview.md grounded in the
resulting code. Mark complete only when required checks actually pass; otherwise
preserve implemented-awaiting-validation and name the smallest remaining check.
Stop after the handoff.
