# HandoverTrack — Task 01: implement the local authenticated project foundation

You are the first implementation agent for HandoverTrack. Work in the repository
containing `deep-research-report.md`. On the owner's current machine it is:
`/Users/mendmaniagmail.com/Desktop/kaka/repo/handovertrack`.
If running in a worktree or another checkout, use that checkout after verifying
the project identity. Read repository instructions and existing changes first.

## Authorization and outcome

IMPLEMENT TASK 01 NOW. This prompt authorizes application-code changes,
dependency installation, local development services and relevant validation.
Do not stop after another architecture proposal or ask whether to start.
The general master prompt's review/planning default does not apply to this task.

Deliver this working LOCAL outcome:

1. A provisioned manager signs in to the web app and sees their organization's
   project list and project details from the real API.
2. A provisioned field worker signs in to the Expo app and downloads only their
   assigned projects into account/organization-scoped SQLite storage.
3. After closing and reopening the app without connectivity, that worker can
   read those cached projects with an explicit offline/read-only state.
4. Another user or organization cannot receive or display that cached data.

This task ends at authenticated project READS and a bounded read-only mobile
snapshot. Project editing, incremental sync, offline mutations, camera capture,
uploads, leased processing jobs, reports and deployment belong to later tasks.
Do not begin them automatically when this task is finished.

## Required context and settled decisions

Read `deep-research-report.md`, especially:
- Review status and confirmed domain/mobile identity.
- First trial and expanded service profiles.
- Repository/module boundaries and TanStack Query architecture.
- Tenant authorization and mobile storage/session isolation.
- Step-by-step agent execution plan, Task 01 and the handoff contract.

Treat this task's scope and acceptance checks as the current assignment. Use
the broader blueprint as architecture context, not a request to build the MVP
in one turn. Respect later explicit user corrections.

Settled constraints:
- Product: multi-tenant proof-of-work app for contractor/field-service crews.
- Profile: `selfhosted-trial`, with no new paid services or storage.
- TypeScript, pnpm workspaces, Turborepo.
- Fastify + OpenAPI-generated client + Kysely/PostgreSQL + SQL migrations.
- Next.js App Router/React web; React Native/Expo/Expo Router mobile.
- TanStack Query (`@tanstack/react-query`) required on BOTH clients.
- SQLite is the durable mobile database. Query caches remain reconstructable.
- Better Auth runs in the API, with its supported Expo/SecureStore integration.
- One worker application; durable job handlers arrive with actual media work.
- Later server media storage: private filesystem on retained k3s PVCs.
- Deployment target: owner's EXISTING k3s, shared Caddy/TLS, as with rruge.com.
- Domain already owned on Cloudflare: `handovertrack.com`.
- Canonical deployed origin: `https://handovertrack.com`.
- Existing iOS bundle identifier: `com.gementis.handovertrack`; preserve exactly.
- Proposed app name/slug: `HandoverTrack` / `handovertrack`.
- Use `handovertrack` as the initial URL-scheme default and label it a chosen
  configuration, distinct from the registered iOS bundle identifier.
- No Android registration, Apple Team ID, provisioning credentials or Expo/EAS
  project ID has been supplied. Do not invent them or buy/register anything.
- Kafka, Temporal, Redis, Garage/S3, Keycloak, Terraform, paid SMTP, paid APM and
  cloud-build subscriptions are outside Task 01.

## Step A — Inspect and record the starting point

1. Read applicable AGENTS.md instructions; inspect git status, tracked/untracked
   files, any manifests/lockfiles and available Node/pnpm/Docker/native tooling.
2. At planning time this repository contained the blueprint and no application
   code. Verify the current state; retain sound code if another agent added it.
3. Preserve the blueprint, this prompt and unrelated user changes. Do not reset
   the checkout, delete unrelated files or mutate sibling projects.
4. If useful and available, read these Rrugë references for patterns only:
   - sibling `rruge/docs/architecture.md`
   - sibling `rruge/infra/kubernetes/README.md`
   - sibling `rruge/infra/kubernetes/DOMAIN.md`
   - sibling `rruge/infra/kubernetes/AUTODEPLOY.md`
   Do not copy its credentials, sessions, user data or app-specific operational
   rules. Missing sibling files or cluster access do not block local coding.
5. Verify compatible stable dependency versions using installed documentation
   and official sources. Node 24 and TanStack Query v5 are candidates from the
   blueprint, not excuses to ignore a real compatibility issue. Pin the tested
   toolchain/lockfile. Check React/Next.js/Expo/React Native/Query peer versions
   and Better Auth's Fastify/native integration together. Do not test deferred
   Kafka/Temporal dependencies in this task.
6. Give a brief implementation outline, then implement. Record significant
   version/routing decisions rather than rewriting the research report.

## Step B — Create the smallest useful monorepo

Create or adapt these app entrypoints:
- `apps/api`: Fastify bootstrap, HTTP adapters, auth handler and health routes.
- `apps/web`: Next.js App Router, sign-in, project list and project detail.
- `apps/mobile`: Expo Router, sign-in, cached assigned-project list/detail.
- `apps/worker`: actual configurable process with DB connectivity, startup
  reporting and graceful shutdown. It has no fake jobs or in-memory job engine.

Create only shared packages that are consumed in this slice:
- `packages/backend`: identity, organization and project application/domain
  modules with narrow ports.
- `packages/platform`: PostgreSQL/auth adapters needed by those modules.
- `packages/contracts`: OpenAPI source/generation and typed transport/DTOs.
- `packages/query`: shared scoped keys and reusable options/invalidation,
  with injected platform readers/transport.
- `packages/db`: migration/seed commands and SQL migrations.
- `packages/config`: separately exported server, web-public and mobile-public
  configuration schemas. Server secrets must never enter client bundles.
- Shared lint/TypeScript/test helpers only where they are actually reused.

Enforce imports: domain is pure; application imports domain/ports; adapters
implement ports; apps compose them. Keep Expo/SQLite/SecureStore out of web
packages and server/database code out of both client bundles. Do not create
empty future modules to reproduce the target tree.

Add root scripts for the actual install, dev, lint, typecheck, test, build,
database migration/seed and generated-contract checks. Include useful README
instructions and `.env.example` with non-secret placeholders. Local services
must use a project-specific Compose name/volume and configurable ports so they
do not collide with existing projects. Keep database ports bound to loopback.
Never delete another project's containers/volumes or use a destructive global
cleanup. Generate local credentials into ignored configuration if needed;
do not hardcode real passwords or print session/credential material.

## Step C — Real database, authentication and permissions

1. Run a dedicated local PostgreSQL service. Create reviewed SQL migrations for
   auth integration plus the minimum users/mapping, organizations, memberships,
   projects and assignments. Keep auth-table ownership explicit. Use scoped
   constraints and a non-superuser runtime role; separate migration privilege.
2. Integrate Better Auth using supported library handlers/adapters. Do not
   implement password hashing, session crypto or a pretend auth endpoint.
3. Provide a repeatable DEVELOPMENT-ONLY operator/seed command using supported
   auth-library operations. Seed two organizations with distinguishable projects,
   at least one manager and one field worker in each, plus an unassigned project
   to prove assignment filtering. Supply credentials through ignored local
   configuration. Do not fabricate verified email flags or require paid email.
   Public signup and email-dependent recovery/invitations remain disabled.
4. Browser authentication uses secure production cookie settings and explicit
   local-development equivalents. Preserve CSRF/origin checks. Native session
   material uses the documented Expo integration and SecureStore.
5. Implement `/v1/me`, project list and project detail operations with OpenAPI
   contracts and a coherent typed error model. An explicitly selected org must
   be validated against authenticated membership; never trust its ID alone.
6. Managers see authorized organization projects. Field workers see only their
   assignments. Unauthenticated requests fail with 401; inaccessible projects
   return the documented non-enumerating error. Test enforcement in real HTTP
   requests and repositories, not just hidden UI controls.
7. Add a bounded complete project-snapshot read for mobile. Return enough
   authorized fields for offline list/detail. Define a cap and explicit overflow
   behavior; never label a truncated page a complete snapshot. Incremental
   cursors, general sync push/pull and offline write conflict handling are Task 02
   or later. Do not claim they are implemented by this snapshot endpoint.

## Step D — Web consumes real API data through TanStack Query

1. Implement basic usable sign-in, organization selection where applicable,
   project list/detail and logout. Render real seeded server data with clear
   loading, empty, authorization and network-error states. Do not add controls
   for project editing/capture/report features that do not exist yet.
2. Use a stable browser QueryClient and request-scoped SSR client. Prefetch and
   hydrate appropriate project reads using the verified library APIs. Choose
   an explicit nonzero staleTime so fresh SSR data is not immediately fetched
   twice. Avoid rendering competing independently refreshed server/client copies.
3. Use account/org/resource/input-scoped keys and the generated API client;
   forward AbortSignal. Query auth/capability data contains no credentials.
   Better Auth owns session mechanics; Query owns protected application reads.
4. Keep the same-origin BFF boundary. Document exact non-overlapping browser,
   native API and auth route prefixes, plus internal upstream URLs. Preserve
   future direct streaming-upload routing without an accidental body buffer.
   These are local route/config decisions; do not edit Caddy or Cloudflare.
5. On logout or scope change, fence late responses, cancel old reads and clear
   affected Query data before rendering another account's pages. Test this.

## Step E — Mobile uses Query over durable SQLite reads

1. Set `ios.bundleIdentifier` to `com.gementis.handovertrack`. Configure Expo
   Router, providers, chosen app scheme and environment-specific API origin.
   The deployed origin is `https://handovertrack.com`; local simulator/LAN
   addresses are configurable. A real phone's localhost is not the workstation.
2. Add explicit SQLite migrations, WAL/foreign-key setup and account+org
   isolation. Scope selection/migration must finish before queries run.
3. After authenticated online access, fetch the COMPLETE authorized snapshot
   and commit replacement/upserts for that read-only scope in one SQLite
   transaction. Never apply one page as a full replacement. For this slice
   there are no pending local edits to merge; preserve that boundary in docs.
4. Render projects from SQLite-backed Query functions, not directly from the
   HTTP response. Use `networkMode: 'always'` for local reads, separate remote
   keys and explicit invalidation after commits. Fence overlapping reads with
   a revision/generation guard or cancel/refetch ordering so stale results
   cannot replace newer committed data.
5. Integrate onlineManager and focusManager using the platform's supported
   connectivity/AppState hooks. Coalesce foreground/reconnect/manual refresh;
   no duplicate sync runners or retry loops. Remote calls still handle failure.
6. Retain the last authenticated local scope securely for offline reopen under
   a documented provisional development access policy. Show cached/offline
   read-only state. Cached access cannot authorize server requests; revalidate
   current membership on reconnect and remove inaccessible cached project data
   after an authoritative revocation response.
7. Test logout/account/org switching and late in-flight snapshot completion.
   Another account must never see or populate the old scope. This task has no
   unsynced evidence; document that future cleanup must preserve pending work.
8. Query-cache clearing must reconstruct the same project list from SQLite.
   Do not persist Query mutations, credentials or photos in the Query cache.

## Step F — Verification, documentation and finish

Run relevant checks and repair failures within this task. Required evidence:
- A locked install; lint/import boundaries; typecheck; focused automated tests;
  web/API/worker builds and generated-contract drift check.
- Migrations applied to a fresh owned test DB and safe repeat execution; seed
  rerun behavior documented without unintended duplicate users/memberships.
- Real sign-in/session and project API integration using PostgreSQL.
- 401 without a session; tenant-B requests cannot access tenant-A data;
  unassigned worker access is denied, including a direct project-ID request.
- Web sign-in/list/detail/logout against the real API; Query scope switching
  and SSR hydration verified with the actual app when browser tools are available.
- SQLite snapshot transaction/rollback, complete-snapshot handling, query
  invalidation/read races and identity isolation exercised at useful boundaries.
- Expo configuration/export/bundling checks for iOS, plus actual simulator or
  device login -> snapshot -> terminate -> offline reopen when tooling exists.
  Distinguish native execution from JS mocks or Expo export. Missing signing,
  simulator or device access must not block unrelated implementation. Record
  the exact remaining native check, reason and command; do not claim it passed.
- Real worker startup, database connectivity and graceful shutdown. Explicitly
  state that leased jobs/media processing have not been implemented yet.

Do not write a huge shallow test suite or claim full offline synchronization,
media durability, production readiness or deployment from foundation evidence.

Update/create:
1. `README.md`: exact local install/config/migrate/seed/run/test commands, ports,
   API routing and how to obtain/use development credentials safely.
2. `docs/implementation-status.md`: Tasks 01–10 and accurate current states.
3. `docs/progress/01-foundation.md`: implemented paths/contracts, evidence,
   commands/results, limitations and relevant current git state.
4. `docs/architecture/runtime-baseline.md`: pinned versions, official source
   links, compatibility findings and resolved route/auth/storage boundaries.
5. `docs/prompts/02-projects-and-sync.md`: a concrete self-contained next-agent
   prompt grounded in the code that now exists, following Task 02 in the plan.

The handoff must list each acceptance check as PASS, FAIL or NOT RUN. Mark
Task 01 complete only when its required checks are evidenced; if device checks
remain unavailable, use `implemented-awaiting-validation` with the exact gap.
Preserve progress so the next agent can resume that gap rather than rebuild.

Finish with: what runs, how to launch it, tests and results, unresolved blockers,
the handoff file and the next-agent prompt. Stop at Task 01. Do not push, deploy,
change DNS/Cloudflare/k3s/Apple settings, install paid services or start Task 02.
