# HandoverTrack

Local project management and offline project access for contractor crews. Tasks
01–04 provide a Fastify API, Next.js manager workspace, Expo field app with durable
SQLite and incremental pull sync, and a database-connected worker. Managers create
and update projects and worker assignments online. The native app adds local camera capture, private originals, durable queue intent
and a local gallery. Authenticated streamed uploads, immutable server originals,
PostgreSQL processing jobs, derivatives and a manager gallery are implemented
locally. Physical camera/native-upload validation remains open. Task 05 deployment preparation is implemented; the apex DNS record is configured, while sudo authentication for SSH image import remains blocked and nothing is deployed.

## Install and configure

Use Node **24.21.0**, pnpm **10.32.1**, and Docker with Compose. `.nvmrc` records
the Node pin. The following is the exact isolated toolchain setup used here;
it does not replace the machine's default Node or pnpm:

```sh
npm install --prefix .tools --no-package-lock --no-save node@24.21.0 pnpm@10.32.1
export PATH="$PWD/.tools/node_modules/.bin:$PATH"
pnpm install --frozen-lockfile
pnpm setup:local
pnpm db:up
pnpm db:migrate
pnpm db:seed
```

Start Docker Desktop first if needed. `setup:local` creates an ignored `.env`
with mode `0600` and random local credentials; it preserves an existing file.
`.env.example` documents configuration without usable secrets. Open `.env` in
your local editor to obtain `SEED_PASSWORD`; scripts never print it. Do not
paste it into logs or commit it. All five development users initially use that
generated password:

| Login | Access |
|---|---|
| `manager.north@example.test` | North Crew manager |
| `worker.north@example.test` | One assigned North project |
| `manager.south@example.test` | South Crew manager |
| `worker.south@example.test` | One assigned South project |
| `manager.both@example.test` | Both organizations, for scope-switch validation |

Seeding requires `ALLOW_DEV_SEED=true`, a password of at least 16 characters,
and a nonproduction environment. It uses an unserved Better Auth provisioning
instance and `signUpEmail`. Rerunning preserves existing passwords, records and
assignments; it does not duplicate users or memberships or set email verification
flags. Changing `SEED_PASSWORD` after provisioning does not rotate existing users.
The operator command restores missing baseline fixture rows if they were removed.
Do not run the seed against real evidence or production data.

The migration role owns schemas. The nonsuperuser runtime role can read business
rows, insert/update projects and assignments, update organization revisions, and
append command receipts, audit records and immutable sync changes. It cannot
mutate membership/identity or hard-delete business rows. Better Auth has its own
required table permissions.
`db:up` bootstraps only `handovertrack` and `handovertrack_test` in this dedicated
local container. SQL migrations are transactional, serialized and checksum
checked. Repeated `db:migrate` skips already-applied matching files.

## Run locally

```sh
pnpm dev                # API, web, mobile Metro and worker through Turborepo
```

Or run each service in a separate terminal with the same toolchain PATH:

```sh
pnpm dev:api
pnpm dev:web
pnpm dev:mobile
pnpm dev:worker
```

Open [the local web app](http://localhost:3300). Use an account above, select an
organization if offered, create or open a project, edit its fields and assign
field workers. Workers retain read-only access. A version conflict preserves your
entered fields and asks you to review the current server version before retrying.

| Service | Default | Configuration |
|---|---|---|
| Web | `http://localhost:3300` | `WEB_PORT`, `WEB_ORIGIN`, `NEXT_PUBLIC_WEB_ORIGIN`, `AUTH_BASE_URL` |
| API | `http://127.0.0.1:3301` | `API_HOST`, `API_PORT`, `API_INTERNAL_URL` |
| PostgreSQL | `127.0.0.1:55432` | `POSTGRES_PORT` and database URL ports |
| Expo Metro | `18081` | mobile dev script / Expo `--port` |
| Worker | no HTTP port | `WORKER_HEARTBEAT_MS` |

The Compose project is `handovertrack-local`, with its own `postgres-data`
volume. Database exposure is loopback only. Override `COMPOSE_PROJECT_NAME`
for another isolated instance, and change all corresponding origin/URL/port
settings together. `pnpm db:stop` stops only this project's service and retains
its volume. No global Docker cleanup is needed.

Build and launch the compiled server/web apps:

```sh
pnpm build
node scripts/run.mjs pnpm --filter @handovertrack/api start
node scripts/run.mjs pnpm --filter @handovertrack/web start
node scripts/run.mjs pnpm --filter @handovertrack/worker start
```

Those three start commands each stay running; use separate terminals. The worker runs the image-v1 PostgreSQL lease executor, generates private image
derivatives, renews/fences leases, reports failures and drains active work on
SIGTERM/SIGINT. Start it for previews to become ready.

## API and session routes

| Caller | Public/local route | Destination |
|---|---|---|
| Browser application reads/commands | `/bff/v1/*` on web origin | Next allowlisted BFF → `${API_INTERNAL_URL}/v1/*` |
| Browser authentication | `/api/auth/*` on web origin | Next streaming proxy → API Better Auth handler |
| Native application reads | `/v1/*` on `EXPO_PUBLIC_API_ORIGIN` | Direct Fastify API |
| Native authentication | `/api/auth/*` on `EXPO_PUBLIC_API_ORIGIN` | Direct Better Auth with Expo integration |
| Health | `/health/live`, `/health/ready` on API | Process / PostgreSQL readiness |

Allowed auth operations are `sign-in/email`, `get-session`, and `sign-out`.
Signup, recovery and invitations are not exposed. Browser cookies are HttpOnly,
SameSite=Lax, host-only; Secure is mandatory in production and explicitly off
for local HTTP. Origin/CSRF checks remain enabled. API and BFF responses are
private/no-store. Native cookies are managed by Better Auth's Expo plugin in
SecureStore and forwarded with `credentials: 'omit'`.

Project operations are `GET /v1/me`,
`GET /v1/organizations/{organizationId}/projects`, the same path plus
`/{projectId}`, and the same path plus `/snapshot`. Inaccessible IDs and
nonmember organizations both return `404 NOT_FOUND`; no session returns 401.
Lists and complete snapshots have a cap of **200 projects**. Overflow is
`413 SNAPSHOT_TOO_LARGE`, with no projects or `complete` marker; it is never
silently truncated. The OpenAPI source and generated transport live in
`packages/contracts`. Task 02 adds `POST projects`, `PATCH projects/{id}`,
`GET workers`, `GET projects/{id}/assignments`, and
`PUT projects/{id}/assignments/{accountId}` under the same organization prefix.
Writes require a manager, matching Origin, `Idempotency-Key` and a `baseVersion`
for updates/assignment changes (0 for a never-created assignment). Conflicts
return 409 without discarding submitted intent. Business state, audit, command
receipt and feed publication commit together.

The canonical future origin is `https://handovertrack.com`. A future gateway
must send browser app/BFF traffic to Next, native `/v1/*` and `/api/auth/*` to
Fastify, and reserve `/media/*` for direct streamed API media transport. Media
uploads now stream directly to Fastify; the local Next media bridge is GET-only.
The BFF cannot accept an upload; its
application routes allow only the documented small JSON commands and reads;
auth forwarding streams the request body.
An additive Caddy candidate and restricted deployment manifests are prepared. The apex DNS-only A record is configured; no live Caddy or deployment changes have been applied; see [trial operations](infra/kubernetes/README.md).

## iOS and offline access

Identity: **`com.gementis.handovertrack`**. The chosen URL scheme is
`handovertrack`; it is not the registered bundle identifier. No Android package,
Apple team, signing credentials or EAS project is committed in app configuration.
Physical validation used existing local signing metadata via temporary overrides.

`EXPO_PUBLIC_API_ORIGIN=http://localhost:3301` works for the local iOS simulator.
A real phone's localhost is the phone: set an accessible workstation LAN origin
and `API_HOST` deliberately before testing on a phone. Do not expose the DB.
The default without an explicit local value is the canonical HTTPS origin.

```sh
pnpm mobile:check
pnpm mobile:export
xcrun simctl list devices available
# Substitute an available simulator UDID:
node scripts/run.mjs pnpm --filter @handovertrack/mobile exec expo run:ios \
  --configuration Release --device B1984CB5-57EC-4270-86E9-60D7BE891DDC --no-bundler
```

Xcode 26.4+ and CocoaPods are needed for this SDK. Use a Release build for cold
reopen without Metro. Generated `ios/`, build output and pods are ignored; Expo
prebuild reconstructs them. Run sign-in → assigned project list/detail → stop
the owned API → terminate app → relaunch → verify cached/read-only list/detail
→ restart API → refresh. Use `xcrun simctl terminate/launch <UDID>
com.gementis.handovertrack` for process lifecycle. API unavailability tests
backend disconnection, not physical airplane mode; record those separately.

SQLite is authoritative for rendered mobile project reads. `/sync/bootstrap`
returns a complete bounded project/assignment set and cursor; `/sync/pull` returns
bounded incremental changes. Cursors are signed and account/org/membership scoped,
expire seven days after bootstrap, and advance over scanned revisions/ordinals.
Expiry triggers a new complete bootstrap. Changed membership/role closes cached
access and requires sign-in again. Mobile commits page rows and cursor together,
then cancels/invalidates local Query reads. Query caches are reconstructable; local
reads work without networking and revision guards fence read/commit overlap.
SQLite migration 2 upgrades the existing database in place, preserving cached
Task 01 rows until the first successful bootstrap. See the Task 02 handoff for
publication locking, access removals, retention and pending-work rules.

**Provisional development access policy:** the last authenticated scope may be
read on the same unlocked device for up to 24 hours after successful validation,
including across termination. Its marker is in SecureStore. It grants no server
authorization. Reconnect revalidates identity, membership and assignment data;
401/403/404 clears access even if storage cleanup fails. Logout removes this
account's cached rows and credentials; organization changes hide/fence old reads.
Local photos use independent scoped tables and app-owned document files. Logout,
account switches, assignment/membership revocation and rebootstrap preserve
originals and queue intent under the original owner. Signed-out screens expose
none of this evidence; another account/org cannot read it. A revoked project's
photos remain visible only in its authenticated owner's organization gallery,
with access blocked. The foreground uploader reauthorizes the original owner on every replay.

## Local photo capture

Open an assigned project on a physical iPhone and choose **Take a photo**.
Allow camera permission; denied permission and unsupported simulator hardware
show explicit guidance. The app requests no microphone or photo-library access.
After the shutter, wait for **Saved on device · Queued locally**. That message
appears only after the original is copied into private app-owned document storage,
its size/SHA-256 verified, and the original record plus queue intent committed.
The gallery says **Uploaded · Server verified the original** only after a
matching committed server receipt is persisted in SQLite. Originals stay local.

**Saved photos** is available from the workspace, including for retained photos
whose project is no longer in the current project cache. **Check saved photos**
retries local reconciliation. Complete verified staging files can recover after
interruption; incomplete/missing/corrupt originals remain blocked and visible as
needing attention. Partial files are retained; recovery cannot recreate missing
bytes, so an incomplete photo may need to be taken again. No automatic media
cleanup or deletion is implemented.

SQLite migrations 3 and 4 upgrade the same existing database file in place. Originals
use relative paths in `Paths.document/captures/<account>/<organization>/<mediaId>`;
app sandbox path changes do not change ownership. Immutable reservation and
manifest files let startup recover valid orphan originals without assigning them
to whoever is currently signed in. Invalid ownership is quarantined. Each photo
is limited to 50 MiB; the local copy requires twice its size plus 20 MiB free space.
The gallery verifies local integrity before displaying saved state.

Pinned Task 03 native dependencies are Expo Camera 57.0.5, FileSystem 57.0.7,
Crypto 57.0.3 and Device 57.0.2. After native dependency/config changes, regenerate
only the ignored iOS project and build Release; retain the installed app data:

```sh
CI=1 node scripts/run.mjs pnpm --filter @handovertrack/mobile exec expo prebuild --platform ios --no-install
node scripts/run.mjs pnpm --filter @handovertrack/mobile exec expo run:ios \
  --configuration Release --device B1984CB5-57EC-4270-86E9-60D7BE891DDC --no-bundler
```

A simulator can validate migration, gallery and unavailable-camera behavior; it
cannot prove camera capture. A physical device also needs an actual compatible
signing profile and a reachable API origin for initial login/project download.
Use temporary process/build overrides for device validation; do not overwrite the
saved `.env`, invent signing identities or change Apple account settings.
See [Task 03 evidence and remaining native gate](docs/progress/03-offline-capture.md).

## Uploads and manager gallery

Run the API, worker and web app. Leave the native app open and connected to
upload eligible local photos. **Saved photos** shows queue progress, verified
server acceptance and retained originals. **Retry blocked uploads** retries
eligible network/access failures after authentication or access is restored.
Invalid/missing originals need investigation; they never become uploaded merely
because a retry ran. Logout and organization/account changes cancel the current
transport and retain evidence under its original owner.

Open a project as a manager to see **Project photos**. Accepted originals appear
once; previews update as jobs finish. Refresh photos invalidates the scoped
Query; the gallery also polls committed results. Worker accounts cannot read
manager gallery/download routes. No public media directory is served.

The private API and worker share `MEDIA_ROOT`. The standard runner resolves
its default `.local/media` to an absolute repository path before changing child
working directories. Supply the same absolute path to both processes if starting
them without the runner. Never point it at native capture storage or another app's
volume. Every ancestor must be a real directory, not a symlink. Configuration
examples are in `.env.example`; your existing `.env` is preserved.

JPEG uploads are bounded to 50 MiB, 50 million pixels and two concurrent streams
per API, with streamed hash/length checks and full decoder validation. A durable
no-replace original plus a committed database receipt is required for acceptance.
The default disk reserve is 256 MiB. Local bounded container decoding was measured during Task 05. API/worker capacity on the actual cluster volume and independent backup/restore remain unverified.

```sh
pnpm media:maintenance status
pnpm media:maintenance redrive <failed-media-UUID>
pnpm media:maintenance sweep-scratch
```

Redrive affects failed image jobs only. Scratch cleanup removes only fenced server
request temporary files older than 24 hours. It never deletes originals, staging
files, native evidence or pending reservation records. Reservations that remain
incomplete stay visible and can pause intake; investigate before making a
retention decision. See [Task 04's upload/state/lease and recovery rules](docs/progress/04-upload-and-preview.md).

## Validate

```sh
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
pnpm exec playwright install chromium
pnpm test:web
pnpm mobile:check
pnpm mobile:export
pnpm check:client-bundles
```

`test:integration` uses only the dedicated `handovertrack_test` DB, applies and
repeats migrations and seed, starts a real HTTP API on an ephemeral port, and
restores the temporary overflow/removal fixtures it exercises. Browser tests
use the seeded development DB and built web app on the default 3300/3301 ports;
they start missing services and reuse already-running local services. Traces,
video and sign-in screenshots are disabled to avoid recording credentials.

Tests using Node SQLite open separate transaction connections like Expo; these
are useful SQL/race tests, not proof of native SecureStore or offline UI behavior.
See [Task 01 evidence](docs/progress/01-foundation.md),
[Task 02 handoff](docs/progress/02-projects-and-sync.md),
[runtime decisions](docs/architecture/runtime-baseline.md), and
[Task 03 handoff](docs/progress/03-offline-capture.md), and
[Task 04 handoff](docs/progress/04-upload-and-preview.md), and
[the prepared Task 05 prompt](docs/prompts/05-trial-deployment.md).

## Existing-k3s trial preparation

See [Task 05 evidence and blockers](docs/progress/05-k3s-trial.md), [deployment operations](infra/kubernetes/README.md), and [isolated recovery](infra/kubernetes/RECOVERY.md). The deployment is dedicated to disposable test data until physical camera/native upload and independent encrypted restore are verified. No live rollout occurred. The [Task 06 prompt](docs/prompts/06-checklists.md) is prepared; Task 06 has not started.
