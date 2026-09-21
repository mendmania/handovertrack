# Task 02 — project management, assignments and incremental sync

**Status: complete.** Updated 2026-09-21. Profile: `selfhosted-trial`.
All required automated and interactive native UI checks passed. The previously
blocked UI checks were completed on the existing Task 02 Release app before
Task 03 changes. Nothing was pushed or deployed. This handoff describes Task 02;
Task 03 is now separately assigned.

## Source state and changed surface

Start/end: existing `main` checkout, no commits and therefore no base SHA. The
Task 01 source, blueprint and kickoff prompt were already untracked. This task
adds/edits application files in place, preserves `.env` and the dedicated Docker
volume, and does not reset either database or modify unrelated projects.

| Files/modules | Changes |
|---|---|
| `packages/backend/src/modules/projects/{domain,ports,application}` | Pure project/assignment commands and sync ports, versions and capability rules |
| `packages/platform/src/project-management.ts`, `readers.ts`, `database.ts` | Transactional commands, immutable feed, signed cursors, active-assignment authorization |
| `packages/db/migrations/002_projects_and_sync.sql`, `003_membership_lock_and_receipt_scope.sql` | Additive version/feed/audit/receipt schema and narrowly privileged membership locking |
| `apps/api/src/app.ts` | Validated command/sync routes, exact browser Origin checks, structured conflicts |
| `packages/contracts` | OpenAPI source, generated types and transport; versions, assignments, bootstrap/pull, typed current conflict state |
| `apps/web/components/project-commands.tsx`, project screen, BFF/proxy | Manager create/edit/assign/remove, intent-preserving conflicts/retries, scope fencing and safe mutation forwarding |
| `packages/query/src/index.ts` | Account/org/operation/cursor scoped remote sync keys |
| `apps/mobile/src/db/store.ts`, `src/sync/protocol.ts`, `src/snapshot/coordinator.ts` | SQLite migration 2, assignment read models, atomic cursor/page application, recovery and invalidation |
| `apps/mobile/app/index.tsx`, `src/providers.tsx` | Sync status wording and explicit read-model-only cleanup boundary |
| `scripts/sync-integration.ts`, existing integration, SQLite and browser tests | Real SQL/HTTP concurrency/rollback/authorization plus local races and browser commands |
| README, implementation status, Task 01 evidence, Task 03 prompt | Startup/protocol/access documentation and handoff |

## API, Query keys and invalidation

All business routes have `/v1/organizations/{organizationId}` prefix. Browser
calls use the allowlisted same-origin `/bff/v1/*`; the BFF forwards query strings,
small JSON request streams and `Idempotency-Key`. Credentials never enter keys.

| API | Authorization/result | Query/invalidation |
|---|---|---|
| `GET /v1/me` | Current application identity/memberships/capabilities | Web identity hydration; mobile `account/org/api/sync/identity` each refresh |
| `GET /projects`, `/projects/{id}` | Manager org scope or active worker assignment | `account/org/api/projects/list|detail`; SSR freshness 30s |
| `POST /projects` | Manager; project fields; version 1 | Explicit web mutation, same key on unchanged retry; cancel/invalidate scoped project reads after success |
| `PATCH /projects/{id}` | Manager; full fields plus `baseVersion` | Same project invalidation; 409 includes authorized current DTO, form retains entered values |
| `GET /workers` | Manager; current field workers only | `account/org/api/workers` |
| `GET /projects/{id}/assignments` | Manager; active and inactive stable versions | `account/org/api/assignments/projectId` |
| `PUT /projects/{id}/assignments/{accountId}` | Manager; same-org field worker, `active`, `baseVersion` (0 if never existed) | Cancel/invalidate assignment and project reads; explicit intent-preserving conflict review |
| `GET /sync/bootstrap` | Current authorized projects/active assignments plus cursor | Mobile `account/org/api/sync/bootstrap`; atomically replace read models then invalidate local projects |
| `GET /sync/pull?cursor=…&limit=…` | Scoped signed cursor, current membership/assignment filtering | Mobile `account/org/api/sync/pull/{cursor}`; atomic page/cursor commit then cancel/invalidate local reads |
| Existing `GET /projects/snapshot` | Preserved bounded complete Task 01 contract, now also includes project versions | Compatibility only; updated mobile uses real bootstrap/pull |

Project input bounds remain name 1–200, description 0–4000, address 0–500,
status active/complete. No hard-delete project command was added. Assignment
removal is a versioned inactive row and publishes access-removal tombstones.
Workers and cross-tenant callers receive nonenumerating 404 for manager resources;
unauthenticated valid requests receive 401. Business writes require exact
`WEB_ORIGIN`; missing/hostile Origin is 403. Native currently pulls read-only data.
Web mutations have `networkMode: always`, no automatic retry or offline replay;
account transitions fence both reads and late command responses.

## Publication and cursor protocol

1. Authenticate the actor and validate inputs. Every command checks manager
   membership, obtains the organization revision-row lock, then rechecks access.
   Membership rows are also held against concurrent role/removal changes.
2. Receipts are scoped to organization + actor + operation + idempotency key.
   A canonical hash includes the target, submitted fields and base version.
   Replay reauthorizes, then returns the original result before version checking.
   Changed input with the same operation/key returns 409. A fresh command changes
   business rows, increments revision, appends stable ordinal events, one audit
   record and its receipt in the **same PostgreSQL transaction**.
3. The organization lock stays held until commit. A later writer cannot publish
   revision N+1 while revision N is uncommitted. Rollback leaves no state, audit,
   receipt or feed publication. Revision is not a bare precommit sequence.
4. Bootstrap uses one REPEATABLE READ transaction for membership, projects,
   assignments and revision watermark. It returns a complete set or 413, capped
   at 200 projects / 5000 active assignments. Its cursor starts after that revision.
5. Pull uses a consistent transaction, scans at most `limit` raw changes (1–100,
   default 100), orders by revision/ordinal and checks for a further row. It
   advances over the last **scanned** event even when current authorization filters
   every event out. Thus empty visible pages still progress without skipping
   another page or exposing unauthorized payloads.
6. Grant publishes a full project and assignment. Revoke publishes targeted
   project removal first, then assignment removal. Other workers cannot see the
   target's assignment; managers retain the project. Mobile also treats its own
   assignment tombstone as immediate project removal, even if the next page fails.
7. Cursor tokens are HMAC-SHA256 authenticated, versioned, actor/org bound, and
   include membership role/creation epoch, revision/ordinal and a fixed seven-day
   bootstrap expiry. They are opaque to clients, not encrypted data. Tampering,
   wrong scope or future position gives 400. Expiry/retention floor gives 410 and
   complete rebootstrap. Membership epoch changes give **403 ACCESS_CHANGED**:
   close local access first, require sign-in again, never keep old manager data
   readable if recovery fails.
8. The retained-revision floor is stored per org. No automatic pruning service
   exists yet; local feed/receipts/audit are retained. Any future operator pruning
   must update the floor and delete older events atomically under the same org
   lock. Idempotency receipts must outlive the supported command retry window.
   Rotating the existing server auth secret invalidates cursor signatures.

Row locking and snapshot assumptions were checked against PostgreSQL's official
[locking](https://www.postgresql.org/docs/18/explicit-locking.html) and
[transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html)
references and exercised against the actual local PostgreSQL service.

## Durable mobile boundary and access policy

SQLite `user_version=2` upgrades the existing `handovertrack-projects-v1.db`
filename in place: adds project version, cursor and exact last-page receipt to
`cache_scopes`, and scoped `cached_assignments`. Existing cached project rows
survive migration; a missing cursor triggers the first real bootstrap.

Page validation rejects malformed/wrong-scope/unordered payloads. A serialized
exclusive transaction compares `fromCursor` with the durable cursor, applies
upserts/tombstones and saves cursor plus local revision. Exact last-page replay
is a no-op; out-of-order pages cannot rewind. A failure even after writing the
cursor but before commit rolls back both cursor and rows. Bootstrap replaces
only server read-model tables. Separate Expo transaction connections do not
inherit FK PRAGMAs, so cleanup explicitly deletes child rows.

The coordinator coalesces triggers, revalidates `/me`, resumes the durable
cursor, and recovers one expiry per refresh. Committed pages survive later
network failure. Local Query reads use infinite freshness but are cancelled and
invalidated after each durable commit; revision/fence checks reject overlapping
old reads. One refresh is bounded to 1000 pages; another refresh resumes if an
unusually busy organization exceeds that budget. Remote sync queries have
zero GC retention and never become the durable record.

The provisional 24-hour same-device offline access policy remains. Offline
cannot discover a new revocation. Authoritative 401/403/404 closes the SecureStore
scope and credentials before attempted disk cleanup, even if SQLite cleanup
fails. Logout and switches fence old async callbacks and hide old reads.

**Future pending evidence:** Task 03 must use separate scoped media/queue tables
and app-owned files. No read-model bootstrap, cursor recovery, logout or access
revocation may delete those originals or their intent. Quarantine under the
original account/org, hide from other identities, and block replay until that
same owner is authenticated and authorized. Never relabel another user's work.
There are no pending writes/queues in Task 02, so no speculative push engine was
introduced.

## Migrations and compatibility

PostgreSQL 002 adds stable project/assignment versions, soft assignment state,
revision/feed, receipts and audit tables. 003 adds a narrowly scoped
`SECURITY DEFINER` membership-lock helper because PostgreSQL row locks require
UPDATE privilege. It has a fixed `pg_catalog` search path, schema-qualified
membership table, no mutation, and PUBLIC execute revoked; runtime receives only
EXECUTE, without membership UPDATE. The function follows PostgreSQL's
[secure function guidance](https://www.postgresql.org/docs/18/sql-createfunction.html).
003 also scopes receipt keys by operation and preserves earlier local receipts.
Both migrations are additive, transactional and checksum checked; seed preserves
existing assignment state/version. Migration 002 initializes current org revision
rows; commands initialize missing ones under their transaction. Operator/seed SQL
is only for development fixtures and bypasses publication: use command APIs for
live business changes.

No dependency pins, `.env` values, origins, bundle identity or deployment settings
were changed. Existing clients tolerate added DTO version fields. Old native
snapshot clients remain read-only compatible; new clients require the migrated
API. Publish/migrate together in a future separately authorized deployment.

## Validation evidence

Validation is local only. Logs/screenshots in `.local` are ignored and contain no
credentials. The durable results below distinguish SQL/HTTP/browser execution
from actual native interaction.

| Acceptance | Result | Evidence/limitation |
|---|---|---|
| Task 01 remaining native checks | PASS | Actual existing Release app login, assigned detail, API-unavailable cold reopen, reconnect, logout/account/org switch and revocation; Task 01 handoff updated before Task 02 code |
| Locked install / lint / boundaries / typecheck / contract drift | PASS | Frozen pnpm install; all ten package checks and root tools; generated OpenAPI match |
| SQLite/Query protocol tests | PASS | 20 tests: in-place v1 upgrade, durable reopen, page replay/CAS, rollback after cursor write, grant/removal isolation, expiry recovery, role-change failure, split tombstone disconnection, read/commit races and scope fencing |
| Manager API commands / authorization / versions / retries | PASS | Real HTTP/PostgreSQL `test:sync`; first concurrent same-key requests produce one command/audit/publication; worker and tenant denials, conflicts and origin enforcement |
| Commit ordering / bootstrap consistency / bounded pages | PASS | Actual blocked earlier SQL writer and later writer, concurrent bootstrap, ordinal pagination, duplicate and ACL-empty pages |
| Atomic audit/business/publication / cursor recovery | PASS | Injected audit insert failure rolls back all effects; tampered/wrong-scope/expired/floor/epoch cursor checks |
| Additive SQL migrations / repeat / seed / runtime grants | PASS | Migrations 002/003 applied to development and test databases; repeats skip matching checksums; exact privileges and seed rerun asserted in inherited HTTP integration |
| Existing foundation HTTP integration | PASS | 10 PASS groups, `.local/task02-integration.log`; current active-assignment authorization and restricted runtime privileges |
| Sync SQL/HTTP integration | PASS | 7 PASS groups, `.local/task02-sync-integration.log`; real TCP sessions and actual PostgreSQL transactions |
| Production web manager and privacy journeys | PASS | 5/5 Playwright tests, `.local/task02-web-tests.log`; real create/retry, conflict, grant/remove, worker/tenant denial, hostile origin, cursor forwarding and late mutation across account change |
| Web visual inspection | PASS | `.local/web-task02-project.png`; saved project/version, assignment removal and usable manager controls visually checked |
| API / web / worker production builds | PASS | 3/3 builds, `.local/task02-build.log` |
| Compiled API and worker process smoke checks | PASS | Both actual built processes connected to PostgreSQL and shut down cleanly; API unauthenticated denial verified |
| Expo dependency check / iOS export | PASS | `mobile:check`; `mobile:export`, `.local/task02-mobile-export.log` |
| Client artifact secret scan | PASS | `check:client-bundles`: 42 browser/native artifacts, no configured server/seed secrets |
| Native Task 02 build/install | PASS | Xcode Release build on existing iOS 26.5 simulator; final log `.local/task02-native-build-final.log` |
| Actual Release native API→SQLite migration and incremental reconciliation | PASS | Read-only inspection found `user_version=2`, preserved North project and durable cursor. Real API grant, edit and revoke followed by actual app cold launches converged in simulator SQLite; `.local/task02-native-sqlite.log`. This is native execution, but the UI was unobserved |
| Updated native incremental grant/edit/remove/reopen UI | PASS | Actual existing Task 02 Release app: manager API grant/edit/revoke observed after Refresh; API-stopped cold reopen showed edited list/detail offline; reconnect and South-account/dual-manager organization isolation observed. Follow-up evidence below |
| Physical-device airplane mode | NOT RUN | Additional device evidence, outside the required local simulator/backend-unavailable check |

All runnable automated checks passed. Native process/SQLite validation used the
actual installed embedded Release bundle, real command API, simulator lifecycle
and read-only inspection of its app-container database. It created one uniquely
named `Native sync validation …` development project and removed its temporary
assignment; `.local/native02-fixture.json` identifies it. No credentials were
printed or written into those evidence files. The Mac was locked during the original Task 02 turn. The follow-up below closes
that gap with direct UI observation.

Review and execution discovered and repaired four defects: PostgreSQL membership
row locking initially returned 500 under the restricted runtime role; migration
003 fixes that without granting membership writes. Epoch changes originally
shared ordinary cursor-expiry recovery, which could retain manager data after a
failed rebootstrap; they now close access. A page boundary could split revocation
before project removal; server ordering and local own-assignment cleanup close
that gap. Web commands could otherwise pause offline and resume under a changed
cookie; explicit nonqueued mutations and scope fencing prevent this. Regression
checks for these paths now pass.

## Reproduce and handoff

With Docker running and the existing local configuration preserved:

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

Use `pnpm dev:api`, `pnpm dev:web` or built web `start` if those owned services
are not running. Integration scripts use only `handovertrack_test`; browser tests
use unique projects in the development database and leave them for inspection,
with worker assignments removed after successful journeys. One native lifecycle
validation project also remains with its assignment inactive. No hard-delete
product command exists. PostgreSQL, the API on 3301 and the final production web
on 3300 remain running; the worker smoke process exited. The updated simulator
Release app remains installed. Local configuration is unchanged.

The smallest remaining native action is to unlock the Mac, launch the freshly
installed Release app, verify the migrated North-worker cache and refreshed sync
state, grant an additional project via the real manager command API, refresh the
app, edit then revoke it and confirm incremental UI updates/removal. Terminate
and reopen with only the owned API stopped, verify durable cursor/rows, reconnect,
and repeat account/org isolation. Record actual evidence and restore assignments.
Do not use direct SQL business changes as feed publication tests.

Next: [prepared Task 03 prompt](../prompts/03-offline-capture.md). It is a handoff,
not authorization to start. Stop here; no deployment or Task 03 work.

## Native UI follow-up completed before Task 03 (2026-09-21)

Existing installed Task 02 embedded Release app, iPhone 17 Pro / iOS 26.5,
UDID `B1984CB5-57EC-4270-86E9-60D7BE891DDC`, tested at approximately 13:07–13:09
local time. No app code changed before this check.

- Real manager API created and granted `Native UI sync proof` to North worker.
  Native Refresh displayed it alongside Riverside repair. Real PATCH renamed it,
  changed address/description and status; Refresh and detail showed every change.
- Terminated the app and stopped only the owned API (HTTP unreachable). Relaunched:
  list and detail showed the edited values with `Cached / offline · Read only`.
- Restarted the API and refreshed: `Projects synced · Read only`, new validation
  timestamp. Real API unassignment followed by Refresh removed the proof project;
  Riverside repair remained. Temporary assignment is inactive; no data reset.
- Native logout → South worker login/cold reopen showed only Workshop refit.
  Dual-manager login showed North projects, then South organization selection
  showed exactly the two South projects. Final logout returned to sign-in.
- Credential-free screenshots: `.local/native02-ui-edited.png`,
  `.local/native02-ui-offline.png`, `.local/native02-ui-revoked.png`,
  `.local/native02-ui-account-isolation.png`, `.local/native02-ui-org-isolation.png`.
  `.local/native02-ui-fixture.json` identifies the retained test project and
  inactive assignment. The optional iOS Save Password prompt was dismissed by
  terminating/reopening the app; no credentials were saved.
- No functional defect was found in this pass. The existing detail label still
  says downloaded snapshot; Task 03 updates wording as that screen gains capture.

The earlier remaining-native instructions are retained as reproduction steps;
that required gate is now PASS. Physical-device airplane mode remains additional
NOT RUN evidence, not a substitute for the demonstrated backend-unavailable test.
