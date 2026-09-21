# Task 01 — local authenticated project foundation

**Status: complete.** Updated 2026-09-21. The required automated checks
passed in Task 01; the previously blocked interactive iOS checks were completed
before Task 02 implementation on 2026-09-21. Actual native evidence is below.
Nothing was pushed or deployed. The sections below describe the Task 01 baseline;
Task 02 changes are documented in their own handoff.

## Starting and ending source state

- Start: branch `main`, **no commits**; untracked `deep-research-report.md`,
  `first-agent-prompt.md`, and `.DS_Store`. No application code, lockfile or
  applicable AGENTS.md was present. No base SHA exists.
- Initial tooling: default Node 22.16.0 / pnpm 9.14.4; Docker installed but
  stopped; Xcode/CocoaPods and simulators available. Docker Desktop was started.
- End: still no commits, reset or push. The two user documents are preserved.
  New root manifests/configuration, `apps/`, `packages/`, `scripts/`, `tests/`,
  `infra/docker/`, `README.md`, `docs/`, and `pnpm-lock.yaml` are untracked.
  `.DS_Store` remains on disk and is ignored. No sibling project was modified.
- Ignored local state: mode-0600 `.env`, isolated `.tools` Node/pnpm install,
  node_modules, `.local` validation logs/screenshots, Next/Expo output, generated
  iOS project/pods and native build products. Preserve these for local resumption.
- Owned local Compose project: `handovertrack-local`; container
  `handovertrack-local-postgres-1`; dedicated volume
  `handovertrack-local_postgres-data`. Databases `handovertrack` and
  `handovertrack_test`; no shared database/volume was reset or deleted.

## Implemented surface

| Paths | Responsibility |
|---|---|
| `apps/api/src/{app,main}.ts` | Fastify HTTP/auth adapters, typed errors, health and protected reads |
| `apps/web/app`, `components/project-screen.tsx`, `lib` | Real sign-in/list/detail/logout, org selection, SSR hydration and same-origin BFF |
| `apps/mobile/app`, `src/{auth,db,snapshot}`, `src/providers.tsx` | Expo Router, SecureStore auth/scope, SQLite reads, complete-snapshot coordinator, lifecycle/fencing |
| `apps/worker/src/main.ts` | Configured process, actual DB checks, startup reporting and graceful stop |
| `packages/backend/src/modules` | Pure identity/organization/project domain types, ports and application reads |
| `packages/platform/src` | Better Auth, Kysely/Postgres adapters, authorization joins |
| `packages/contracts` | OpenAPI source, generated TypeScript and typed openapi-fetch transport |
| `packages/query` | Account/org/source/resource/input keys, injected read options, fences/invalidation |
| `packages/db` | Reviewed SQL migration, checksum/lock migration runner, safe development provisioning |
| `packages/config` | Separate server/web-public/mobile-public schemas |
| `scripts`, `tests/web` | Local bootstrap, boundary lint, HTTP/DB integration, process/build/privacy smoke checks, browser tests |

Actual reads:

- `GET /v1/me` returns application identity, memberships and read capabilities.
- `GET /v1/organizations/{organizationId}/projects` and `/{projectId}` apply
  current membership and assignment checks. Managers see the authorized org;
  workers see assigned projects only.
- `GET /v1/organizations/{organizationId}/projects/snapshot` returns account,
  organization, `complete:true`, generated time and all authorized project fields.
  A result exceeding 200 returns `413 SNAPSHOT_TOO_LARGE` without any partial
  snapshot. List reads use the same cap. There are no incremental cursors.
- Authenticated inaccessible IDs/orgs are nonenumerating `404 NOT_FOUND`;
  unauthenticated reads are 401. Errors contain code, message and requestId.
- Better Auth owns `/api/auth/sign-in/email`, `/get-session`, `/sign-out`.
  Signup/recovery/invitations are not exposed. Supported provisioning calls
  `auth.api.signUpEmail` from an unserved, development-only instance.

PostgreSQL migration `001_foundation.sql` owns the four Better Auth core tables
(`user`, `session`, `account`, `verification`) and app account mappings,
organizations, memberships, projects, assignments. Assignment/project/member
constraints are organization-scoped. Runtime credentials cannot write business
tables or create roles/databases. SQL migration ownership is distinct.

SQLite `user_version=1` creates `cache_scopes` and `cached_projects` with
account+organization compound keys and revisions. WAL/foreign keys are enabled
on the main connection. Snapshot writes use exclusive transactions, serialized
locally; purges explicitly delete child rows because Expo transaction connections
do not inherit the main connection's foreign-key PRAGMA. Incomplete, excessive,
duplicate or wrong-scope snapshots are rejected before replacement.

Query keys are `['account', accountId, 'org', organizationId, source, resource,
operation, inputs]`; remote snapshot keys are separate from local project reads.
Web freshness is 30 seconds. Mobile local freshness is infinite, with
`networkMode:'always'`, commit invalidation, cancellation and revision checks.
No Query persistence or mutation replay is configured. Better Auth owns session
mechanics; credentials never enter Query or SQLite.

## Validation evidence

Commands ran with `export PATH="$PWD/.tools/node_modules/.bin:$PATH"`.
Logs below are ignored local evidence; this table records their durable results.

| Acceptance check | Result | Evidence and limits |
|---|---|---|
| Locked install and compatible peers | PASS | `pnpm install --frozen-lockfile`; strict peers enabled; Node 24.21.0, pnpm 10.32.1; `pnpm-lock.yaml` |
| Lint and dependency direction | PASS | `pnpm lint`; ESLint 10 and AST import-boundary checker |
| Typecheck including root validation tools | PASS | `pnpm typecheck`; all 10 workspaces plus `tsconfig.tools.json`; `.local/typecheck.log` |
| Generated contract drift | PASS | `pnpm contracts:check`; generated source equals OpenAPI |
| Focused automated SQLite/Query tests | PASS | `pnpm test`: **11 tests**; `.local/unit-tests.log` |
| Web/API/worker builds | PASS | `pnpm build`: **3 builds**; `.local/build.log` |
| Compiled API startup, DB readiness and shutdown | PASS | `pnpm test:api-build`; actual built process, HTTP readiness/401, SIGTERM exit 0 |
| Compiled worker startup, DB connectivity and shutdown | PASS | `pnpm test:worker`; actual built process, ready/no handlers, SIGTERM/stopped exit 0 |
| Migration on fresh owned test DB | PASS | First integration run applied 001 to newly provisioned `handovertrack_test`; local application DB also migrated |
| Safe migration repeat | PASS | Integration immediately reruns migration; subsequent runs print `Already applied`; checksum mismatch would fail |
| Seed rerun | PASS | Repeated supported auth provisioning produces exactly **5 users, 6 memberships**, 2 orgs, 4 projects; existing passwords preserved |
| No fabricated verified email | PASS | Real SQL asserts zero `emailVerified=true` users |
| Runtime least privilege | PASS | SQL asserts nonsuperuser/no role or DB creation; business INSERT returns 42501 |
| Real sign-in/session with PostgreSQL | PASS | `pnpm test:integration`; real TCP HTTP sessions and generated client; `.local/integration.log` |
| Native-origin handler without browser Origin | PASS | HTTP integration supplies only `expo-origin: handovertrack://`; this tests server integration, not native SecureStore |
| Secure cookie/local equivalents, origin and disabled flows | PASS | Local HttpOnly/SameSite=Lax cookies, hostile origin 403, malformed JSON typed 400, signup/recovery 404; production HTTPS/Secure enforced in configuration |
| 401 without session on every read | PASS | `/me`, list, detail and snapshot HTTP assertions |
| Tenant B cannot read tenant A | PASS | Manager/worker B against A org/list/detail/snapshot and A ID under B org → 404 |
| Worker cannot read unassigned direct ID | PASS | Real HTTP and repository assertions; inaccessible and nonexistent IDs use the same error |
| Scoped database constraints | PASS | Cross-org assignment fails FK with 23503 |
| Bounded complete snapshot / explicit overflow | PASS | Worker receives one assigned project; 201 manager projects produce 413 without projects/complete |
| Assignment removal reconciles reads | PASS | Deleted assignment yields empty complete snapshot and direct-ID denial; fixture restored |
| Server logout invalidates session | PASS | Old cookie receives 401 after real sign-out |
| Web sign-in/list/detail/logout against real API | PASS | Playwright Chromium: production web with seeded real API; `.local/web-tests.log` |
| Web SSR hydration avoids immediate duplicate fetch | PASS | Browser observed zero project BFF fetches after initial hydration; nonzero staleTime |
| Web org/account switch and late response fencing | PASS | Delayed old-org read followed by org/account change; no old data visible |
| Cross-tab shared-cookie account change | PASS | Two tabs; old workspace hidden, reload resolves new identity; 3 browser tests total |
| SQLite durability and Query-cache reconstruction | PASS | Actual SQLite file close/reopen; Query clear reconstructs identical list; Node runtime, not native app |
| SQLite transaction rollback and whole-snapshot handling | PASS | Failed mid-transaction guard restores prior rows/revision; incomplete/duplicate/oversize/wrong-scope payloads rejected |
| SQLite scope isolation and logout cleanup | PASS | Account+org reads/detail, explicit purges, and account removal preserve other scopes; separate transaction connections |
| Query commit/read race and coalescing | PASS | Active observer refetches newer revision, ignored-abort completion cannot win, duplicate refresh triggers coalesce |
| Late snapshot / revocation completion after scope change | PASS | Delayed HTTP and purge gates cannot populate/deactivate new scope; denial closes access even if SQLite purge fails |
| RN-compatible AbortSignal surface | PASS | Test omits browser-only `throwIfAborted`; local reads/cancellation still work |
| Expo configuration and dependency compatibility | PASS | `expo config --type public`, `pnpm mobile:check`; `.local/expo-config.log`; exact registered bundle preserved |
| Expo iOS bundle/export | PASS | `pnpm mobile:export`; 1 Hermes bundle (~3.6 MB), 1343 modules; `.local/mobile-export.log` |
| Server secrets excluded from client artifacts | PASS | `pnpm check:client-bundles`: 41 web/mobile artifacts contain none of the configured server/seed secrets |
| Native iOS Release build/install | PASS | Xcode **26.5 (17F42)**, iPhone 17 Pro simulator **iOS 26.5**, UDID below; final build 0 errors/1 duplicate-library warning; `.local/native-build-final.log` |
| Interactive native login → SQLite snapshot → detail | PASS | Actual Release simulator login as North worker, exactly one assigned project and correct detail; `.local/native01-online.png` |
| Native terminate → disconnected reopen → cached/read-only list/detail | PASS | Owned API stopped and confirmed unreachable; app terminated/relaunched; list and detail displayed from SQLite with Cached / offline · Read only; `.local/native01-offline-{list,detail}.png` |
| Native SecureStore logout/account/org switching and reconnect revocation | PASS | API restarted; refresh revalidated. Assignment removal removed project; membership revocation returned sign-in, including cold reopen. South logout cleared both SQLite tables; dual-manager North→South switch showed only South; logout→North worker restored only assigned North project |

The API integration has ten reported PASS groups; browser tests are **3/3**;
SQLite/Query tests are **11/11**. No required automated check remains failed.
An actual production HTTPS deployment/cookie exchange is outside this task.

## Reproduce and launch

From this repository, with Docker Desktop running:

```sh
export PATH="$PWD/.tools/node_modules/.bin:$PATH"
pnpm install --frozen-lockfile
pnpm setup:local
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Use `pnpm dev:api`, `dev:web`, `dev:mobile`, `dev:worker` independently if the
existing API/web are still running. At handoff the owned PostgreSQL service,
API on **3301**, built web on **3300**, and booted simulator are available.
The worker smoke process exited cleanly; Metro is not needed for the release
app. Open `http://localhost:3300`; development account names and safe password
retrieval from ignored `.env` are in README. Never print the password.

Exact check sequence:

```sh
pnpm lint
pnpm typecheck
pnpm contracts:check
pnpm test
pnpm test:integration
pnpm build
pnpm test:api-build
pnpm test:worker
pnpm exec playwright install chromium
pnpm test:web
pnpm mobile:check
pnpm mobile:export
pnpm check:client-bundles
```

Browser visual QA: `.local/web-projects.png` was inspected; real North projects
render correctly without overflow. No credential screenshots/traces were saved.

## Native check reproduction (completed 2026-09-21)

1. Unlock the Mac. Do not change signing, Apple account or paid services.
2. Rebuild/install if code changed:

   ```sh
   export PATH="$PWD/.tools/node_modules/.bin:$PATH"
   node scripts/run.mjs pnpm --filter @handovertrack/mobile exec expo run:ios \
     --configuration Release --device B1984CB5-57EC-4270-86E9-60D7BE891DDC --no-bundler
   ```

3. Open the app in the iPhone 17 Pro simulator. Sign in as
   `worker.north@example.test` using `.env`'s private `SEED_PASSWORD`. Verify
   one North assigned project, correct detail and no unassigned/South project.
4. Stop **only this task's API process** (Ctrl-C in its terminal). Terminate and
   launch the native app with its embedded Release bundle:

   ```sh
   xcrun simctl terminate B1984CB5-57EC-4270-86E9-60D7BE891DDC com.gementis.handovertrack
   xcrun simctl launch B1984CB5-57EC-4270-86E9-60D7BE891DDC com.gementis.handovertrack
   ```

5. Verify the same list and detail appear with **Cached / offline · Read only**.
   This is real backend-unreachable execution, not a physical network toggle.
   A real-phone airplane-mode test is additional evidence; do not claim one from
   a simulator status-bar icon or backend shutdown.
6. Restart `pnpm dev:api`, refresh and verify revalidation. Exercise logout →
   reopen → different worker login and dual-manager organization switching.
   Check no old account/org data is visible. Exercise authoritative assignment
   removal in an owned disposable fixture and ensure local rows disappear; restore
   fixtures afterwards. Check SecureStore cleanup, not just Query state.
7. Record native UI screenshots/results without credential material; rerun
   affected checks if a defect is fixed. Only then revisit Task 01 completion.

## Decisions, repairs and limits

- Corrected actual strict-peer conflicts and a native CocoaPods-only Reanimated
  mismatch. Release compilation succeeded after exact Expo pins.
- Replaced a Docker bind-mounted init shell that hit a host permission problem
  with an idempotent local Node/pg bootstrap. No owned data had to be dropped.
- Repaired built-worker ESM/CJS external dependency handling; startup was tested,
  not inferred from bundling.
- Read-only review found and fixed web cross-tab auth races, old mobile auth
  client writes, stale SecureStore scope writes, overlapping revocation cleanup,
  missing async native cookies, and native transaction connection differences.
- `handovertrack.com` remains the canonical future origin;
  `com.gementis.handovertrack` is preserved exactly; scheme `handovertrack` is
  chosen configuration. No Android/Apple team/EAS identity was invented.
- Offline access is provisional, limited to 24 hours on the same unlocked device,
  never a server permission. It cannot discover revocation while disconnected.
  If disk purge fails after authoritative denial, access/credentials are already
  closed; a fresh sign-in removes that account's old rows before rendering.
- There is no pending evidence. Future cleanup must retain unsynced work; this
  snapshot replacement is not a generic offline synchronization protocol.
- No project writes, cursors, camera, uploads, leased jobs, processing, reports,
  distribution signing, deployment, backups or infrastructure changes were made.

## Completed native follow-up evidence

The Mac became available during the explicitly assigned Task 02 follow-up.
The existing embedded Release app was tested on iPhone 17 Pro / iOS 26.5,
UDID `B1984CB5-57EC-4270-86E9-60D7BE891DDC`, before changing application code.

- North worker login downloaded only Riverside repair. Native detail showed
  its description, address and status.
- Stopped only the owned API, verified HTTP unavailable, terminated/reopened the
  app and inspected the offline list and detail. Restarted API and refreshed;
  the native status returned to downloaded with an updated validation time.
- Temporarily removed the North assignment from the owned development fixture:
  native refresh showed no assigned projects. Restored it, then temporarily
  removed membership: refresh closed access and cold reopen remained signed out.
  Restored both membership and assignment afterwards.
- Signed in South worker: only Workshop refit appeared. Signed out; read-only
  inspection of the simulator SQLite file found **0 projects and 0 scopes**;
  terminate/reopen stayed on sign-in.
- Dual-manager login displayed two North projects. Switching to South displayed
  exactly the two South projects. Logout followed by North-worker login and
  reopen displayed only the one North assignment.
- Additional credential-free screenshots: `.local/native01-revoked-assignment.png`,
  `.local/native01-south-account.png`, `.local/native01-org-switch.png`, and
  `.local/native01-account-switch-north.png`. Local screenshots are ignored.
- No application defect was discovered in this native pass. The simulator's
  optional OS Save Password prompt sometimes lacked accessible controls; the
  app was terminated/reopened to dismiss it, without saving credentials.

A physical-device airplane-mode test remains **NOT RUN**, as additional evidence
outside the required simulator/backend-unavailable check. No native check above
is inferred from Node tests. Task 02 is now separately authorized; see its handoff.
