# Task 01 runtime baseline

Profile: `selfhosted-trial`. Checked 2026-09-21 on macOS arm64. This is a local
foundation, not a production-readiness or deployment claim.

## Tested pins

| Component | Version |
|---|---|
| Node / pnpm / Turborepo | 24.21.0 / 10.32.1 / 2.11.2 |
| TypeScript / ESLint / typescript-eslint | 5.9.3 / 10.11.0 / 8.70.0 |
| Fastify / Better Auth / Better Auth Expo | 5.12.5 / 1.7.5 / 1.7.5 |
| Kysely / pg / PostgreSQL | 0.29.6 / 8.23.0 / 18.3 |
| Next / React / React DOM | 16.3.5 / 19.2.3 / 19.2.3 |
| TanStack Query (both clients) | 5.103.1 |
| Expo / Expo Router / React Native | 57.0.24 / 57.0.22 / 0.86.3 |
| Expo SQLite / SecureStore / Network | 57.0.3 / 57.0.4 / 57.0.2 |
| Reanimated / Worklets / RN Metro config | 4.5.1 / 0.10.1 / 0.86.3 |
| openapi-typescript / openapi-fetch | 7.13.0 / 0.17.0 |
| Vitest / Playwright / tsup | 5.0.1 / 1.63.0 / 8.5.1 |

PostgreSQL's multi-platform image is digest-pinned in Compose to
`sha256:7e32e9833a6fb1c92c32552794cb6ed569d51b445a54907d35fc112ef39684db`.
`pnpm-lock.yaml` pins the full graph; strict peer validation remains enabled.
An isolated `.tools` install avoids changing the machine's Node 22 default.
pnpm 10.32.1 is the tested stable workspace manager; no pnpm 12 migration was
needed. The single deprecation warning is transitive `uuid@7.0.3`.

## Compatibility evidence and official references

- Expo's [SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) and
  [published bundled dependency manifest](https://unpkg.com/expo@57.0.24/bundledNativeModules.json)
  determine the native/React versions. Xcode 26.5 and CocoaPods 1.16.2 are
  installed; SDK 57 requires Xcode 26.4+ and Node 22.13+.
- [Node release metadata](https://nodejs.org/dist/index.json) confirms the
  selected Node 24 LTS release. [Next installation](https://nextjs.org/docs/app/getting-started/installation)
  and the installed package peer metadata support this Node/React combination.
- [TypeScript generator package metadata](https://www.npmjs.com/package/openapi-typescript)
  requires TypeScript 5. TypeScript 7 was current in the registry, but was not
  selected because of that peer constraint; typescript-eslint also requires <6.1.
- Expo dependency auto-resolution initially selected Worklets 0.13, RN Metro
  0.87, and Reanimated 4.7. Strict peer validation and then CocoaPods caught
  incompatibilities. Exact Expo-compatible pins and workspace overrides resolve
  these; both `expo install --check` and the native release build are required.
- [Better Auth Fastify](https://better-auth.com/docs/integrations/fastify) and
  [Expo integration](https://better-auth.com/docs/integrations/expo) guide the
  handler and native client. The installed 1.7.5 client requires async
  `getCookie()` and both synchronous/asynchronous SecureStore methods. It clears
  storage on late sign-out responses, so app credential adapters fence every
  old client generation and serialize transitions.
- [Better Auth email/password](https://better-auth.com/docs/authentication/email-password)
  provides the operator-only provisioning operation. Auth tables follow the
  [core database schema](https://better-auth.com/docs/concepts/database).
- [TanStack advanced SSR](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr),
  [cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation),
  and [native lifecycle](https://tanstack.com/query/latest/docs/framework/react/react-native)
  inform the tested Query boundaries.
- [Expo SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) documents
  exclusive transactions. Inspection of installed SQLiteDatabase.ts confirms a
  separate connection is opened for each exclusive transaction. Therefore purge
  explicitly deletes child rows and local writes are serialized. Tests reproduce
  separate connections with foreign keys disabled on transaction connections;
  the primary connection still enables WAL, foreign keys and a busy timeout.

## Boundaries

`packages/backend` contains pure identity/organization/project domain types,
ports and application reads. `platform` implements Kysely readers and Better
Auth. Apps compose them. Import-boundary lint rejects native/server imports in
clients and infrastructure imports in domain/application modules. Config has
explicit `/server`, `/web-public`, `/mobile-public` exports and no mixed barrel.

Auth subjects map one-to-one to application account UUIDs. Projects and
assignments have organization-scoped composite keys; assignments reference
both project and membership. Every repository project read joins current
memberships and assignment permission. The API also validates membership; it
does not trust the URL's organization ID or a supplied role. RLS is not enabled
in this slice; repository SQL and the application are the authorization boundary.

Better Auth owns the four auth tables. The migration role owns schema and
business rows. The runtime role is nonsuperuser, cannot create databases/roles,
and cannot mutate application tables. Public signup/recovery/invitation handlers
are unreachable. No email flags are synthesized. Cookie/origin protections stay
enabled; production configuration rejects non-HTTPS origins.

Browser `/bff/v1/*` is GET-only and maps to API `/v1/*` via the private
`API_INTERNAL_URL`. `/api/auth/*` is a separate bounded Fastify auth surface
with a streaming Next proxy locally. Native goes directly to `/v1/*` and
`/api/auth/*` on its configured API origin. Future `/media/*` belongs directly
to the API/gateway, outside the BFF. Canonical deployment remains
`https://handovertrack.com`; no live route has been configured.

Web QueryClients are stable per mounted browser provider and request-scoped on
the server. Hydration uses 30-second freshness and one client-rendered data owner.
Keys include account, organization, source, resource and inputs. AbortSignals
propagate through generated transport; epoch fences reject ignored-abort late
responses. Auth changes broadcast before and after completion across tabs, hide
old screens, cancel queries, clear caches and reload authoritative identity.

Mobile keeps credentials and the last-scope authorization marker in SecureStore;
SQLite stores only scoped project DTOs/revision/validation metadata. `user_version=1`
is the initial migration. Local Query reads use `networkMode: always` and infinite
freshness; snapshot commit cancels/invalidates local keys and a revision guard
rejects inconsistent reads. Remote snapshot Query keys are separate and retries
are disabled; a single coordinator coalesces lifecycle/manual triggers. Remote
calls run once even when connectivity hints are wrong, with a 15-second timeout.

The read-only snapshot is complete-or-error, capped at 200 authorized projects
with names/descriptions/addresses limited to 200/4000/500 characters. It has no cursor, incremental
feed, mutation queue, conflict protocol or claim of full offline synchronization.
Fresh sign-in/scope change removes stale read-only data before authorizing the
new screen. Secure local access expires after 24 hours (including a foreground
timer), and authoritative denial retires access before attempted disk cleanup.
Future pending evidence will require a different cleanup policy.

Worker compilation uses a database-only platform export; external Node packages
remain declared runtime dependencies. A successful bundle alone was insufficient:
the built worker smoke test caught an ESM/CommonJS bundling error, now repaired.
The worker has configuration, DB checks and graceful shutdown only.

## Task 02 extension (2026-09-21)

The sections above preserve the Task 01 baseline. Task 02 reuses the same pins
and configuration and extends the runtime with manager commands, additive SQL
migrations 002/003, versioned soft assignments, idempotency/audit and a committed
organization feed. The BFF now supports only the explicitly allowlisted JSON
commands in addition to reads. Mobile SQLite migration 2 and bootstrap/pull replace
the snapshot-only coordinator path. Its server read models remain separate from
future pending evidence. See [Task 02's current protocol, permissions, validation
and limitations](../progress/02-projects-and-sync.md) for the authoritative changes.

## Task 03 extension (2026-09-21)

Expo 57.0.24 remains pinned. Local camera capture adds exact compatible versions
of Camera 57.0.5, FileSystem 57.0.7, Crypto 57.0.3 and Device 57.0.2, checked against
the installed SDK's bundled-native-module manifest and `expo install --check`.
The native camera plugin disables microphone/audio and barcode permissions.
An updated Release build is required for the new native modules.

SQLite migration 3 adds independently owned media/queue/recovery tables without
changing the database filename or linking evidence lifetime to server caches.
Expo's installed copy/move implementation was inspected: immutable reservation
and manifest filenames avoid the overwrite path that removes the old destination
before moving. Final originals are verified and moved without overwrite. SHA-256
and file reads are bounded by the 50 MiB per-photo limit.

Simulator migration/gallery/unavailable-camera UI and automated storage/recovery
tests pass. The paired physical iPhone accepted and launched the locally signed
Release build; actual camera/offline restart evidence remains NOT RUN. No Apple
team is committed to app configuration. See [Task 03's state machine, validation
and remaining native gate](../progress/03-offline-capture.md). No server media or
upload/job runtime exists yet.

## Task 04 extension (2026-09-21)

The historical baselines above are superseded for media by
[Task 04](../progress/04-upload-and-preview.md). Sharp 0.35.4 is pinned as a
server runtime dependency. Its documented [input limits and failOn behavior](https://sharp.pixelplumbing.com/api-constructor/) inform bounded JPEG verification;
[Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/) and the
installed legacy UploadTask definitions inform the cancellable native binary
upload adapter. Physical native upload remains NOT RUN.

PostgreSQL migration 004 adds immutable upload identity/acceptance, durable
image-v1 jobs, fenced leases, variant metadata and accepted/ready events. Local
API and worker share an absolute private filesystem root; streamed originals use
fsync and no-replace hard links. Native SQLite migration 4 preserves all evidence
and adds network progress/receipts independently of local file integrity.
The manager gallery uses private authorized media reads and scoped Query polling.
Original retention is unchanged: no automatic local-original deletion.

Automated twenty-image failures, compiled worker kill/restart, browser gallery
and native simulator migration/reopen pass. Actual camera permissions, captured
photo cold restart/isolation and native uploads remain explicit physical gates.
No deployment or Task 05 cluster inspection was performed.
