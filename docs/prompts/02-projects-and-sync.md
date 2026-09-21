# HandoverTrack — Task 02: project management, assignments and committed sync feed

This is a prepared next-agent prompt. **It does not authorize the Task 01 agent
to start Task 02.** Use it only when the owner explicitly assigns this task.

## Read and inspect first

Work in the HandoverTrack repository containing `deep-research-report.md`.
Read applicable AGENTS.md, git status, `README.md`,
`docs/implementation-status.md`, `docs/progress/01-foundation.md`,
`docs/architecture/runtime-baseline.md`, and the blueprint's Task 02,
committed-order sync, mobile isolation and handoff sections. Preserve the
blueprint, kickoff prompt and unrelated changes. There were no commits before
Task 01; inspect current state rather than inventing a base SHA.

First attempt the inherited native Task 01 validation gap. Xcode 26.5,
CocoaPods and an iOS 26.5 simulator exist, and the release app built/installed.
The Mac was locked, preventing interactive simulator login/cache/reopen tests.
Unlocking is an external prerequisite, not an excuse to rebuild the architecture.
Record still-unavailable checks as NOT RUN and keep their gate open. A separately
assigned Task 02 may proceed with independent local work while preserving that
named gap; do not claim native reliability from Node SQLite tests.

## Existing foundation to reuse

- Node 24.21.0, pnpm 10.32.1, TypeScript 5.9.3, pnpm workspaces/Turborepo.
- Fastify in `apps/api/src/app.ts`; Better Auth + Expo plugin in
  `packages/platform/src/auth.ts`. Operator provisioning is an unserved instance.
- `packages/backend/src/modules/{identity,organizations,projects}` has domain,
  ports and application reads. `platform/src/readers.ts` independently enforces
  membership and assignment joins. Never bypass these authorization boundaries.
- PostgreSQL SQL migration `packages/db/migrations/001_foundation.sql` creates
  auth tables, account mappings, organizations, memberships, projects and scoped
  assignments. Runtime can only read business tables; introduce the exact new
  grants required by new commands in a reviewed additive migration.
- OpenAPI source `packages/contracts/openapi/openapi.json`, generator
  `packages/contracts/generate.ts`, generated types and `openapi-fetch` transport.
- `/v1/me`, organization-scoped project list/detail and bounded complete snapshot.
  Snapshot cap 200, explicit 413 overflow; no existing incremental protocol.
- `packages/query/src/index.ts`: scoped keys, read options, epoch fencing and
  local commit invalidation. Web uses SSR hydration with 30-second staleTime.
- `apps/web`: same-origin `/bff/v1/*` reads and `/api/auth/*`; project list/detail,
  sign-in/logout/org selection. Cross-tab auth broadcasts fence shared-cookie
  changes; account changes must keep this protection.
- `apps/mobile/src/db/store.ts`: SQLite migration version 1, composite scope
  keys, serialized complete-snapshot replacement and explicit scoped purges.
  `snapshot/coordinator.ts` coalesces refreshes, revalidates identity/membership,
  fences late completion and cancels/invalidates local reads after commit.
  `providers.tsx`/`auth/client.ts` own SecureStore, a provisional 24-hour offline
  window, native lifecycle and serialized auth transitions.
- `apps/worker` only connects/checks DB and exits gracefully. No job handlers.
- `scripts/integration.ts` exercises real HTTP/Postgres; mobile store tests use
  real Node SQLite with separate transaction connections; Playwright tests cover
  actual production web routes, hydration, scope races and cross-tab changes.

Run local setup and validation exactly as README describes. For this machine:

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
pnpm build
pnpm test:api-build
pnpm test:worker
pnpm test:web
pnpm mobile:check
pnpm mobile:export
```

Use the ignored `.env` locally; do not print secrets or reset existing databases.
Test credentials are documented by account name in README. Rerunning seed
preserves existing passwords and adds missing development fixtures.

## Authorized Task 02 outcome

1. Managers create/update projects and assign/unassign field workers through
   capability-checked APIs and usable web mutations.
2. Add stable entity versions, optimistic concurrency, idempotency and audit
   records. Business changes, audit and sync publication share the appropriate
   database transaction. Identity and organization inputs remain server-validated.
3. Implement a complete bootstrap and bounded incremental pull feed for current
   project/assignment entities. Use committed-order organization revisions plus
   stable ordinals; a plain sequence allocated before commit is insufficient.
   Serialize publication per organization using the blueprint's revision-row
   lock or a demonstrably equivalent tested protocol.
4. Include grants/removals, tombstones, opaque/scoped cursor validation, expiry
   and recovery. No committed changes may be skipped across pages or concurrent
   writers. Do not relabel Task 01's snapshot as incremental sync.
5. Mobile applies each page and its cursor in one SQLite transaction, then
   invalidates relevant local Query keys. Fence overlapping reads and scope
   changes. Keep Query cache disposable and remote/local keys separate.
6. Define revoked/offline access and future pending-work handling before capture
   arrives. Task 01 purges read-only rows; do not reuse this policy to delete
   unsynced evidence later. Add durable push commands only when a real offline
   writing feature requires them, not a speculative general sync engine.

## Required acceptance

- Manager creates/updates/assigns via real API/web; worker cannot mutate manager
  resources; direct cross-tenant mutation attempts fail.
- Version conflicts are explicit and preserve the submitted intent; idempotent
  retries cannot duplicate a command, audit entry or publication.
- Concurrent commits are never missed by bootstrap/pull pagination. Test a slow
  earlier transaction and a faster later transaction, duplicate pages and cursor
  expiry/rebootstrap.
- Assignment grants become visible to the correct device; authoritative removals
  disappear from that device without leaking data across account/org switches.
- Page application or crash failure cannot advance a cursor without its rows;
  rollback and retries are safe. An older Query read cannot remain permanently
  fresh after a commit.
- Migrations are additive, safely repeatable and use scoped constraints/grants.
- Locked install, lint/import boundaries, typecheck, contract drift, relevant
  SQL/HTTP/Query/SQLite tests, builds, browser journeys and Expo checks pass.
- Report actual native tests independently; inherit Task 01's unavailable check
  honestly until it is demonstrated on the running native app.

## Constraints and stop boundary

Stay on `selfhosted-trial`, without new paid services. Preserve
`https://handovertrack.com`, iOS bundle `com.gementis.handovertrack`, and chosen
scheme `handovertrack`. No invented Android identity, Apple team, EAS ID or
signing account. No deployment/DNS/k3s/Cloudflare changes, uploads, camera,
checklists, reports, job framework, Kafka, Temporal, Redis or S3.

Finish with `docs/progress/02-projects-and-sync.md`, an accurate status update,
API/key/invalidation matrix, sync protocol, evidence and limitations, and a
self-contained `docs/prompts/03-offline-capture.md`. Mark every acceptance
PASS/FAIL/NOT RUN. Stop before Task 03; do not push or deploy.
