# HandoverTrack — Task 05: existing-k3s preflight and private trial deployment

Prepared prompt only. **Wait for an explicit Task 05 assignment.** This file does
not authorize deployment or infrastructure changes. A planning-only assignment
must stop at reviewed manifests/runbooks; applying them requires deployment scope.

## Inspect current source and inherited gates first

Continue the existing checkout. Read applicable AGENTS.md, git status/branch/log,
README, implementation status, Tasks 02–04 handoffs, runtime baseline and blueprint
sections on existing infrastructure, storage, deployment, backups and Task 05.
The Task 04 starting commit was eb38130d9f719c68f2a5250c4bf8a57d14c48791 on main;
at final verification the checkout had externally moved to
codex/foundation-project-sync-offline-capture at
2fb548a969231ac470bd019b84d778da57b0d1c9. Its committed tree matches the starting
commit exactly. The owner then requested Task 04 publication on
codex/upload-and-preview, based on origin/main at 8063d1e after the foundation
PR merged. Inspect current branches, commits and PR state again before work.

Preserve .env/credentials, databases/volumes, app identities, native app data,
captured originals, all pending intent and unrelated changes. No reset, reseed
over real evidence, original deletion, force push or destructive rollback.
Applied migrations are checksum checked and immutable.

Attempt inherited physical checks before claiming native readiness. Tasks 03/04
remain implemented-awaiting-validation. Automated real SQLite/filesystem/HTTP/
PostgreSQL and twenty-image fixtures, worker process tests, browser gallery and
Release simulator checks pass. Physical permission, offline camera cold reopen,
captured-photo scope/revocation and native binary upload remain NOT RUN.
The phone still has the older Task 03 build. Rebuild Task 04 Release with an
actually reachable temporary API origin, using only existing verified local
signing metadata. Do not invent Apple/team/EAS settings or erase app data.

Gather actual allow/deny/Settings-return, twenty offline captures, termination/
reopen, account/org/logout/revocation, upload interruption/lost-response and
worker restart evidence. Check exactly twenty immutable originals and all
derivatives. Preserve their IDs, owner records and bytes. Device availability,
simulator UI and generated images never close the physical gate.

## Current local implementation to reuse

- Pinned Node 24.21.0 / pnpm 10.32.1, Expo 57, Fastify, Next, Better Auth,
  PostgreSQL, Kysely/pg, generated OpenAPI and TanStack Query.
- Additive PostgreSQL migrations 001–004; runtime is nonsuperuser. Media identity,
  expected bytes and acceptance are immutable; evidence never references a
  revocable membership for its lifetime.
- JSON session/status/complete and manager media list under /v1/organizations.
  Direct streamed JPEG PUT and authorized GET under /media/organizations.
  Current owner/membership/assignment checks apply to every replay. Originals
  and derivatives are private/no-store; downloads are manager-only.
- Single-photo content requires exact Content-Length, JPEG, <=50 MiB,
  <=50 million pixels, <=12,000 per dimension. Two content streams per API,
  120s bound, 256 MiB default disk reserve and persistent intake reservations.
- Private generated media directories, exclusive/no-follow scratch creation,
  streamed SHA-256, decoder validation, fsync and atomic no-replace hard links.
  API/worker share the same absolute MEDIA_ROOT on the same filesystem.
  PostgreSQL upload fences and replay reconcile file-before-DB gaps.
- Acceptance atomically writes its image-v1 job and event. PostgreSQL leases
  use SKIP LOCKED, owner/expiry/increasing token fencing, renewal and five attempts.
  Sharp 0.35.4 generates 320/768/2048 WebP derivatives with metadata removed.
- Maintenance script has status, explicit failed-job redrive, and scratch sweep.
  Only server UUID .part files older than 24h are swept, with upload/live-job
  fencing; original/staging/device evidence is retained. Incomplete reservation
  rows can accumulate and pause intake. Do not silently invent deletion policy.
- SQLite migration 4 preserves the existing DB file and evidence. Verification
  cannot reset uploading/accepted/terminal states. Foreground native binary
  uploads persist session/progress/retry/receipts and fence scope/credential
  changes. No automatic local-original deletion.
- Manager gallery polls committed media, paginates and has scoped Query keys.
  Next's local media bridge is GET-only; future edge must send /media/* to API.
- No deployment files/controller/cluster changes have been implemented yet.

## Live preflight — evidence, not repository assumptions

Only when Task 05 is assigned, inspect the existing target cluster and actual
authorized connection context. Read Rrugë infrastructure conventions as reference,
but do not use its credentials, namespaces, DBs or volumes for this application.

Record actual node architecture, allocatable/used CPU/memory, disk/free reserve/
inodes, workload pressure, storage classes/reclaim behavior, single-node locality,
current ingress/Caddy routes and ownership, existing hostname health, registry/
CI allowances and a genuinely independent encrypted backup target.
Verify handovertrack.com DNS, Cloudflare proxy mode and origin TLS. Never
overwrite shared edge configuration or take over unrelated hostnames.

No-new-spend constraint: no paid services, plan/registry visibility changes,
purchased storage, hosted auth, SMTP, cloud builds, Kafka, Temporal, Redis or S3.
Missing access/capacity/backup prerequisites remain NOT RUN. Independent approved
planning may proceed while affected rollout gates stay closed.

## Authorized deployment scope, if explicitly assigned

Prepare project-owned namespace/labels, DB roles/Secrets, retained PVCs, internal
Services, restricted workloads, resource/storage/disk-reserve limits, a migration
Job, immutable images and a scoped release controller. Keep the initial API and
worker on the documented node sharing private media; prove hard-link, directory
fsync and lease semantics on that volume. Measure bounded decoder peak memory,
upload concurrency, disk/inode use, abandoned reservations and recovery time.

Preserve other sites and shared configuration through additive guarded changes.
Route browser/auth/BFF/native/media to the correct services without buffering
large uploads, stripping native headers, caching private responses or changing
signed cookie behavior. Verify real HTTPS/native uploads through the edge,
including Content-Length and timeouts. Enable proxied traffic only with verified
Full (strict) TLS and correct private-cache policy. DB/storage/admin endpoints
must remain private.

Use retained single-node storage and an explicit compatible maintenance-window
rollout; do not promise HA or zero downtime. Schema evolution is additive.
Roll back only compatible application images; never automatically restore an
old DB over newer evidence. Do not downgrade the SQLite-v4 app in place.

Back up DB/auth, media originals, required job state, config and recovery secrets
consistently to an existing independent encrypted target. Demonstrate an isolated
restore and verify original checksums, ownership, jobs, sessions and derivatives.
On-node copies cannot prove node-loss recovery. Without independent backup,
limit any explicitly authorized rollout to disposable test evidence and keep
the disaster-recovery gate incomplete.

## Acceptance and handoff

Run local regressions and inherited native tests first:

~~~
export PATH="$PWD/.tools/node_modules/.bin:$PATH"
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm contracts:check
pnpm test
pnpm test:integration
pnpm test:sync
pnpm build
pnpm test:api-build
pnpm test:worker
pnpm test:media
pnpm test:web
pnpm mobile:check
pnpm mobile:export
pnpm check:client-bundles
~~~

Do not reset/reseed existing data just to run tests. The test DB/temporary media
fixtures are separate; browser generated fixtures persist in local development.

For an authorized rollout, demonstrate actual physical capture-to-gallery over
HTTPS, retained bytes/DB state across pod restart, stale lease recovery,
cross-tenant denial, no access to other applications, existing-site health
before/after, monitored queue/disk/failure status and an independent restore.
Distinguish PASS / FAIL / NOT RUN and local fixture / simulator / physical / live
cluster evidence. Passing local commands is not cluster or device evidence.

Update implementation status and write docs/progress/05-k3s-trial.md with live
capacity, resource/image/release identities, routing, migrations/compatibility,
backup/restore evidence, rollback commands, costs and remaining gates. Prepare
the Task 06 prompt from actual code. Stop before Task 06; no checklists, reports,
sharing or infrastructure expansion.
