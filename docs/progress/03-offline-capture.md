# Task 03 — durable offline camera capture

**Status: implemented-awaiting-validation.** Updated 2026-09-22. The current
Task 05 continuation verifies twenty new physical offline saves, offline cold
reopen, camera denial/Settings return/cancel, blocked pending work after revocation,
manager account/org isolation and worker rebootstrap. Owner observations are
corroborated by read-only USB/SQLite checks; all 23 local originals/receipts survive,
22 under the current worker and one under the earlier local-HTTP owner.

All 21 new native captures (twenty plus the extra) uploaded with matching hashes,
size and ownership, one asset/job/event pair and three valid derivatives each.
The worker stop/start recovered all 21 pending jobs once. Server total is 25
originals/ready jobs and 75 variants. Native stream interruption, app restart during
upload, retry and lost completion response remain **NOT RUN**: every new upload
completed on its first attempt. Earlier synthetic faults remain separate evidence.
The test assignment is restored at active v5 and the worker is running normally.

The fresh full-batch backup and separate `handovertrack-restore-20260922c`
application restore pass all 18 public table hashes, 125 media paths, sessions,
access checks and full image decodes. Three stopped rehearsals and all recovery
files remain retained. Independent Mac-loss backup/key access and accepted manual
backup responsibility/availability remain unconfirmed. No new runtime/schema/phone
installation occurred; Task 06 has not started. See the authoritative
[Task 05 checkpoint](05-k3s-trial.md), [native evidence](evidence/05-native-validation-20260922.json)
and [recovery evidence](evidence/05-batch-recovery-20260922.json).

## Historical task and intermediate validation records

The dated records below preserve what was known at each earlier checkpoint;
temporary revocation and pending-backup instructions there are superseded above.

**Status: implemented-awaiting-validation.** Updated 2026-09-21. Profile:
`selfhosted-trial`. Implementation and all runnable automated checks passed.
The actual physical-camera/offline-restart gate is **NOT RUN**, so Task 03 is
not complete. No uploads, server media routes, processing jobs or deployment
were implemented. Task 04 is prepared, not started.


## Current Task 05 validation follow-up — 2026-09-22

Latest update, 10:38 UTC: offline close/reopen preservation **PASS** for the
recorded twenty new originals and both older photos/receipts, corroborated by
owner-reported gallery visibility and unchanged before/after USB data. An extra
pending capture is retained: 23 originals total, 21 pending, 22 in the current
account. The North worker test assignment is temporarily revoked through the
real manager API for blocked-pending/isolation validation; restoration is required
as documented in the current Task 05 handoff. Permission and native failure/scope
checks remain incomplete.

Latest update, 10:35 UTC: **PASS — twenty new owner-reported offline saves with
physical Documents/SQLite verification**, twenty distinct hashes and pending
queues under the original owner. Both older originals/receipts survive, all
22 originals decode, and SQLite v4 integrity/foreign keys pass. Current-account
saved count is 21. Exact expected IDs/bytes are in the
[batch manifest](evidence/05-native-batch-20260922.json). This supersedes the
no-new-batch observations below. Offline cold-reopen comparison and native
retry/isolation are still pending; the owner has been given reopen instructions.
The new batch remains outside the latest verified server backup.

**Status remains `implemented-awaiting-validation`.** The historical task record
below is preserved. The existing phone now runs the HTTPS Release build with
SQLite v4. One prior owner-observed capture-to-web PASS is corroborated by the
server; the current read-only phone baseline contains two verified originals and
two accepted receipts under their original owners, one from local HTTP and one
from the live trial. SQLite integrity passes. Live verification checks four
accepted assets, four ready jobs, twelve variants and exactly one accepted/ready
event pair per asset, with original/variant hashes, dimensions and decodes.

The owner confirmed availability and received ordered permission/cancel and
20-photo offline instructions. Results/counts were not returned before this
checkpoint; a later Documents copy failed because CoreDevice could not locate
the phone. Permission branches, the new offline batch, captured-photo cold reopen,
native interruption/lost reply/retry, and captured-photo scope/revocation checks
remain **NOT RUN**. Neither pairing nor the two preserved baseline files closes
those native gates. No app erase, reinstall or SQLite downgrade occurred.

A fresh 09:05 UTC verified FileVault backup and isolated application restore now
cover the four server baseline originals, including the owner's HTTPS photo,
and twelve variants (twenty archived paths). This is a **technical recovery PASS**,
not coverage of a new twenty-photo batch or the older local-HTTP phone original.
Recovery-key custody, access after Mac loss and accepted backup operation remain
**NOT RUN/unconfirmed**. Source originals/configuration and earlier recovery
resources are preserved; both rehearsal controllers are stopped. See the
[current Task 05 evidence, exact coverage and remaining steps](05-k3s-trial.md).
No Task 06 implementation or new live runtime/schema release was performed.

## Inherited gate and source state

Task 02's pending native UI checks were completed **before** Task 03 changes on
the existing embedded Release app. Actual manager API grant, edit and revoke
appeared in native UI after refresh; API-unavailable termination/reopen retained
edited list/detail; reconnect and account/organization isolation passed. See the
[Task 02 follow-up evidence](02-projects-and-sync.md#native-ui-follow-up-completed-before-task-03-2026-09-21).
Task 02 is now complete. Older project/sync evidence does not prove camera capture.

The checkout remains `main`, with no commits/base SHA and the pre-existing source
untracked. Work continued in place. The blueprint, kickoff prompt, private `.env`,
existing database volume, application identity and existing app data were retained.
No reset, original-file deletion, remote push or deployment was performed.

## Changed surface

| Files/modules | Result |
|---|---|
| `apps/mobile/src/db/store.ts` | Additive SQLite migration 3; media shares the serialized transaction writer with sync |
| `src/media/types.ts`, `repository.ts`, `service.ts` | Immutable scoped capture tickets, local media and queue intent, filesystem/SQLite recovery |
| `src/capture/native-files.ts` | Actual Expo private-filesystem/SHA-256 adapter, no-overwrite publication and low-space checks |
| `src/capture/query.ts`, `packages/query/src/index.ts` | Scoped local gallery keys, durable revision checks and invalidation after capture or sync commits |
| `src/providers.tsx`, `src/snapshot/coordinator.ts` | Startup/foreground reconciliation and active-scope fencing, including reads initiated after logout |
| `app/capture/[id].tsx`, `app/gallery.tsx`, project/workspace routes | Physical camera permission/capture, explicit unsupported-device flow, scoped local gallery and recovery action |
| `src/media/service.test.ts` | Real temporary filesystem/SQLite tests, injected interruption faults and Query/scope races |
| `app.config.ts`, mobile package manifest, lockfile | Exact Expo Camera/FileSystem/Crypto/Device pins and camera-only native permission config |
| README, runtime/status docs, Task 02 follow-up, Task 04 prompt | Current usage, actual evidence, remaining native checks and handoff |

Paths without a workspace prefix above are relative to `apps/mobile`.

## Storage, migration and compatibility

The existing `handovertrack-projects-v1.db` is upgraded in place from
`user_version=2` to **3**, preserving project/assignment caches and pull cursors.
Repeated migration is a no-op. No PostgreSQL migration or API contract change is
needed for this local-only feature.

- `media_local`: immutable account/org/project/media identity and directory,
  timestamps, capture state, verified byte size/SHA-256/dimensions and reason.
- `media_queue`: the same composite owner/media key, stable unique media ID,
  `pending` or `blocked` intent, reason and timestamps. The composite foreign key
  prevents attaching another owner's queue when FK enforcement is enabled;
  repository checks also enforce ownership on Expo's transaction connections.
- `media_scopes`: independent per-owner revision for local Query consistency.
- `media_orphans`: untrusted directories/reasons retained for investigation;
  never assigned to the active user merely because recovery found them.

Media has **no foreign key to server read models**. Cache removal/replacement
cannot cascade into evidence. Older app builds intentionally reject database
versions newer than they understand; use the updated Release build after upgrade.

Originals live in app-owned document storage:

```text
Paths.document/captures/<accountId>/<organizationId>/<mediaId>/
  reservation.json     immutable owner/ticket, before camera invocation
  manifest.json        immutable ticket + expected size/hash/dimensions
  original.part        staging bytes, retained if incomplete
  original.jpg         verified final original, never overwritten
```

SQLite stores relative paths; native resolves the current sandbox document root.
Container relocation does not reassign or break ownership. A source must be a
file in this application's camera cache. Originals are limited to 50 MiB; copying
requires twice the source size plus 20 MiB free space. Hashing reads that bounded
file into memory. The adapter awaits Expo copy/move and publishes immutable
manifests using a same-directory temporary file and no-overwrite move. No file
deletion API is used. Device uninstall, external destruction and power-loss
durability are not covered by the demonstrated automated restart tests.

New exact pins, aligned with installed Expo 57.0.24: `expo-camera` 57.0.5,
`expo-file-system` 57.0.7, `expo-crypto` 57.0.3 and `expo-device` 57.0.2.
The camera plugin requests camera access only: no microphone, audio recording,
barcode scanning or photo-library permission. Rebuild native after these changes;
an OTA JavaScript update alone cannot add the native modules.

## Capture and queue state machine

1. The current authorized local project and scope are checked. Reserve a stable
   UUID, immutable owner ticket, `staging` media and `blocked/CAPTURE_INCOMPLETE`
   queue together in SQLite. Publish `reservation.json` before invoking camera.
2. Camera permission denial, cancellation or simulator unavailability does not
   display saved status. The unsupported simulator path creates no reservation.
   If the shutter fails after reservation, retain an interrupted blocked intent.
3. Inspect camera bytes and dimensions. Publish immutable `manifest.json` with
   expected SHA-256 and size **before** copying into `original.part`.
4. Verify the complete staging file, move without overwrite to `original.jpg`,
   verify the final file, then commit `saved_local` plus `pending` queue in one
   SQLite transaction. Only this successful return can show **Saved on device**.
5. Invalidation follows the durable commit. UI says **Queued locally**, never
   uploaded. The queue has no network executor, retry loop or server acceptance.

| Media state | Queue/read behavior |
|---|---|
| `staging` | Blocked reservation; no saved claim |
| `saved_local` | Verified original; pending local intent when project is available |
| `interrupted` | Blocked incomplete/cancelled save; retain remaining files |
| `missing_original` | Blocked; record/intent survive, missing bytes cannot be recreated |
| `quarantined` | Blocked ownership/manifest/integrity problem; no automatic reassignment |

Project availability is also joined at read time. A revoked/missing project makes
the **effective** queue state blocked even when the stored intent remains pending.
Task 04 must reauthorize before any network replay; a pending row is not permission.

## Recovery and isolation rules

Startup and foreground recovery serialize with capture persistence. The gallery
verifies local files before returning saved status; **Check saved photos** retries
recovery. Verified unchanged rows do not endlessly increment the media revision.

- A complete staging file matching the immutable manifest can be finalized.
  A final original left before a failed SQLite commit can rebuild saved state
  and its queue. A valid orphan manifest rebuilds its **original** owner.
- Partial staging, disk-full and missing/corrupt originals retain intent and
  remaining bytes, with blocked/missing/quarantined status. No false saved result
  is returned if a verification operation itself fails.
- Missing queue intent is restored blocked first and becomes pending only after
  the original verifies. Conflicting queue/media owners are quarantined without
  modifying the foreign intent. Invalid/unknown manifests never borrow login scope.
- Interrupted temporary manifests and partial files remain. Recovery cannot
  invent missing bytes; an incomplete capture may need to be taken again. There
  is no automatic cleanup or user deletion workflow in this task.
- Logout, account/org change, revocation, expiry and rebootstrap only remove or
  replace server read models. Originals and independent media tables survive.
  Signed-out screens expose none; another account/org cannot query the gallery.
  An authenticated original owner can see retained photos of a revoked project
  in that organization's gallery, explicitly blocked. Membership denial closes
  the entire scope until the same owner is authorized again.
- A camera result arriving after logout still saves under the immutable ticket;
  it cannot be reassigned to the new session. Its UI callback is fenced. Local
  gallery reads check active scope both before and after asynchronous work,
  including a stale callback that initiates a fresh read after logout.
- Gallery keys are `account/<id>/org/<id>/local/captures/list/{projectId}`.
  Query is disposable, with network-independent reads, infinite freshness and
  revision guards. Capture and server-cache commits invalidate the scoped local
  keys; assignment removal cannot leave a stale eligible queue display.

Review repaired permission refresh after returning from Settings, late gallery
refetch after scope change, queue ownership conflicts, blocked-queue display, and
misleading success wording after image/manifest failure. Regression tests cover
the data/race defects; physical permission behavior remains a native test gap.

## Actual validation evidence

Ignored `.local` logs/screenshots contain evidence, not credentials. Filesystem
tests use separate temporary roots and real Node SQLite with separate transaction
connections. They are not represented as native camera execution.

| Check | Result | Evidence |
|---|---|---|
| Task 02 required native UI gate | PASS | Actual updated Task 02 Release interaction; linked follow-up above |
| Frozen install | PASS | Exact new dependency pins and lockfile; local configuration retained |
| Lint/import boundaries, typecheck, generated contracts | PASS | `.local/task03-lint.log`, `task03-typecheck.log`, `task03-contracts.log` |
| SQLite/filesystem/Query suite | PASS | 38 tests; `.local/task03-unit-tests-final.log` |
| Upgrade/repeat, real file reopen and Query loss | PASS | Existing cache/cursor survives migration; saved bytes/hash/queue reconstruct after closing/reopening DB and discarding Query |
| Interruption and isolation | PASS (automated) | Copy/rename/commit fault injection, partial writes/disk full, missing/corrupt originals, orphan/owner conflict, late callbacks, logout/rebootstrap and revocation tests |
| Foundation HTTP/PostgreSQL regression | PASS | 10 groups, `.local/task03-integration.log`; migrations/seed repeat and runtime grants included |
| Incremental sync HTTP/PostgreSQL regression | PASS | 7 groups, `.local/task03-sync.log` |
| Production browser journeys | PASS | 5/5, `.local/task03-web.log` |
| API/web/worker builds and process smoke | PASS | 3/3 builds; `.local/task03-build.log`, `task03-api-build.log`, `task03-worker.log` |
| Expo compatibility and iOS export | PASS | `.local/task03-mobile-check.log`, `task03-mobile-export.log` |
| Client secret scan | PASS | 42 browser/native artifacts; `.local/task03-client-bundles.log` |
| Task 03 simulator Release build/install and migration | PASS | `.local/task03-native-build-final.log`, `native03-sqlite.log`; actual native DB `user_version=3`, composite owner keys, existing project cache retained |
| Actual simulator gallery/unavailable-camera UI | PASS | North worker → Saved photos empty gallery → Check saved photos; project → Camera unavailable with physical-device explanation; `.local/native03-empty-gallery.png`, `native03-camera-unavailable.png` |
| Unsupported camera creates no false evidence | PASS | `.local/native03-sqlite.log`; read-only inspection after actual simulator flow: zero media rows, zero queue rows |
| Physical iPhone Release build/install/launch | PASS | Existing local development identity/profile used; `.local/task03-device-build-final.log`, `task03-device-install-final.log`, `task03-device-launch-final.log` |
| Actual physical permission allow/deny/settings-return | NOT RUN | Direct phone interaction unavailable; simulator has no camera |
| Actual offline camera originals + queue, terminate/reopen | NOT RUN | No actual camera image was captured; native restart durability gate remains open |
| Captured-photo account/org/revocation isolation on device | NOT RUN | Automated preservation/fencing tests pass, but no physical capture fixture exists yet |

Simulator: iPhone 17 Pro, iOS 26.5, UDID
`B1984CB5-57EC-4270-86E9-60D7BE891DDC`. Installed Task 03 Release upgraded existing
data rather than reinstalling with deletion. The current native gallery is empty;
no synthetic image was inserted to pretend the camera check passed.

Physical device: paired iPhone 17 Pro Max, iOS 26.6.1. It became reachable during
validation. CoreDevice install and launch succeeded using an already-existing,
unexpired development profile including that device. No Apple-account change,
new certificate, device registration, provisioning download or committed team
setting was made. iPhone Mirroring requires the user's Mac login and cannot
provide its camera in any case ([Apple's documented limitation](https://support.apple.com/en-au/120421)).
The user was asked to operate the phone directly; no physical results are assumed.

## Reproduce and smallest remaining gate

Use README's preserved toolchain/configuration and validation commands. The exact
Task 03 native dependency rebuild starts with:

```sh
export PATH="$PWD/.tools/node_modules/.bin:$PATH"
CI=1 node scripts/run.mjs pnpm --filter @handovertrack/mobile exec expo prebuild --platform ios --no-install
node scripts/run.mjs pnpm --filter @handovertrack/mobile exec expo run:ios \
  --configuration Release --device B1984CB5-57EC-4270-86E9-60D7BE891DDC --no-bundler
```

For the already-paired phone, use its actual verified local signing metadata and
a reachable workstation API origin as **temporary process/build overrides**.
Do not copy signing assumptions to another machine, change `.env`, expose the DB,
uninstall the app or erase storage. The validation build used
`EXPO_PUBLIC_API_ORIGIN=http://10.10.1.209:7331`; the workstation address can change.
Its app is in `.local/task03-device-build/Build/Products/Release-iphoneos/`.
The temporary device-test API on 7331 was stopped after validation. To resume
with this installed build while that workstation address is still valid, run
the already-built API in a separate terminal with temporary overrides:

```sh
API_HOST=10.10.1.209 API_PORT=7331 node scripts/run.mjs node apps/api/dist/main.js
```

Stop only that owned process after testing. If the address changes, rebuild with
the new reachable origin; do not edit saved configuration merely for the test.

The remaining required evidence must be gathered by someone operating the phone:

1. Log in as the North worker and download the assigned project. Exercise camera
   denial/cancel and Settings return, then allow it. No denied attempt may say saved.
2. Make the API unavailable or enable airplane mode after download. Capture
   several distinct photos; wait for Saved on device/Queued locally for each.
   Record exact counts and verify the actual originals and matching queue owners.
3. Terminate/reopen the embedded Release app while offline. Every confirmed photo
   must display under the original account/org with the same IDs/hash/intent.
   Discarding in-memory Query must reconstruct that same gallery from SQLite/files.
4. Reconnect; switch accounts/orgs and return. Another scope must see none of the
   photos. Revoke the assignment through the real manager API and refresh: original
   owner's gallery retains bytes/intent with blocked access. Rebootstrap must not
   delete them. Membership denial/logout must close all scope access.
5. Record actual device failures and fixes. Do not erase originals to repeat the
   scenario. Keep the task implemented-awaiting-validation until these required
   native checks pass; builds and Node fixtures cannot close this gate.

Preserved local PostgreSQL, loopback API on 3301 and production web on 3300 support
continued validation. No upload worker is running. Task 04's
[prepared prompt](../prompts/04-upload-and-preview.md) is the next handoff; wait for
explicit assignment. Stop here.

## Task 04 follow-up — 2026-09-21

The next assignment verified a clean main checkout at
eb38130d9f719c68f2a5250c4bf8a57d14c48791. The earlier no-commit description above
records Task 03's history, not current repository state.

The paired iPhone 17 Pro Max was available again (Task 04 device-availability log).
Direct phone interaction/results were requested but unavailable. Permission
allow/deny/Settings-return, actual offline captures/captured-photo cold restart,
and captured-photo account/org/revocation isolation remain **NOT RUN**. No
physical result was inferred from device availability.

Independent Task 04 work was explicitly authorized and implemented. Its recovery
fix preserves network/terminal queue state, and its Release simulator upgraded the
same retained DB to version 4 with the North worker session/project intact.
Read-only native inspection still showed zero local media and queue records;
no fake camera images were installed. Automated generated-image scenarios do not
close this Task 03 gate. See [Task 04's actual evidence](04-upload-and-preview.md).
