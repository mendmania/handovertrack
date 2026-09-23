# Task 04 — verified uploads, processing and manager gallery

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

Task 05 fault-control follow-up: the owner reports phone interaction unavailable.
A special signed build and one-ID native cancel/suspend/completion-delivery controls
are prepared and synthetically checked, **not installed or physically exercised**.
Before/after read-only checks preserve all 23 phone receipts/originals and the same
25 server originals/75 derivatives. No new IDs, backup or restore were created;
all 59 retained recovery files are unchanged. Independent recovery arrangements
remain unconfirmed. See [control preparation evidence](evidence/05-native-fault-preparation-20260922.json)
and the current Task 05 checkpoint. The normal app has no active fault controls.

## Historical task and intermediate validation records

The dated records below preserve what was known at each earlier checkpoint;
temporary revocation and pending-backup instructions there are superseded above.

**Status: implemented-awaiting-validation.** Updated 2026-09-21.
Profile: selfhosted-trial; local PostgreSQL and private filesystem only.
Automated twenty-photo failure scenario and browser gallery pass. Physical
camera, native binary upload, airplane-mode/captured-photo restart and isolation
remain **NOT RUN**. Those release gates remain open.


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

## Repository and preservation

Started in the existing clean main checkout at
eb38130d9f719c68f2a5250c4bf8a57d14c48791 (foundation, sync and offline capture).
Earlier handoffs describing an unborn repository are historical. No new commit,
reset, push, deployment or Task 05 infrastructure work was done by this task.

At final verification the checkout had moved externally to
**codex/foundation-project-sync-offline-capture**, HEAD
**2fb548a969231ac470bd019b84d778da57b0d1c9**, atop the empty baseline
0c64b98607623b8c32c375e03c1c75320c0b01d8. Its committed tree and the starting
eb38130 tree are identical (39ae9b32ef58f70902446399b22fbcc7affc25b2).
Task 04 changes were left uncommitted at that handoff. The external
branch/history change was preserved.

The owner subsequently requested a feature branch and PR to main. After fetching,
origin/main was at 8063d1e (the merged foundation PR), with the same source tree.
Task 04 was moved to **codex/upload-and-preview**, based on that main commit,
for a dedicated commit and PR. This follow-up publishes code only; deployment
and the physical-device gates remain unchanged.

The existing .env remains byte-identical to its starting SHA-256 and mode 0600.
Credentials were not printed. Existing Docker volume, development database, app
identity and originals were retained. Migration 004 was added; applied migrations
001–003 were not edited. The simulator was upgraded without uninstall/erase;
its container path changed during installation but its North worker session and
project survived.

The browser test retains a generated JPEG and derivatives in the development DB
and .local/media. A first failed browser assertion also left a pending reservation,
deliberately retained. These are synthetic fixtures, not captured phone evidence.
Integration fixtures use a unique temporary directory and owned rows in
handovertrack_test, removed after each run; never installed device media.

## Inherited physical gate

The paired iPhone 17 Pro Max was available again; see
.local/task04-device-availability.log. Direct phone operation/results were
requested; none were received. Device availability is not camera evidence.

| Physical check | Result |
|---|---|
| Permission allow / deny / cancel / Settings return | NOT RUN |
| Actual offline originals and matching queue ownership | NOT RUN |
| Terminate/reopen with captured photos | NOT RUN |
| Captured-photo account/org/assignment/membership isolation | NOT RUN |
| Twenty physical captures through native upload to gallery | NOT RUN |

The installed phone build remains Task 03. This run neither upgraded nor
validated that phone. See Task 03's device/LAN procedure; a Task 04 phone Release
build and reachable API origin are required for upload validation.

## Implementation and migration

- Platform media modules: private files, upload ownership/idempotency, acceptance,
  transactional jobs/events, leased image executor and maintenance.
- API media module: upload commands/content, manager gallery and private reads.
- PostgreSQL migration 004: uploads, jobs, immutable variants and accepted/ready
  events, runtime grants and an immutable upload-identity/acceptance trigger.
- OpenAPI and generated transport: operations, DTOs and explicit error codes.
- Worker: image-v1 handler, claims/renewals and graceful drain.
- SQLite migration 4: upgrades the existing database file and queue table with
  states, receipts, progress and retry columns, preserving all evidence rows.
- Mobile: recovery correction, durable upload executor, frozen credentials and
  cancellation; native binary FileSystem transport; gallery status/controls.
- Web: scoped manager gallery and a GET-only local media bridge.
- Unit, real SQL/HTTP/filesystem/worker and browser validation.

Sharp 0.35.4 is exactly pinned in platform and both server apps and externalized
from their bundles. Existing Expo dependencies are unchanged. Old mobile builds
reject SQLite version 4: keep the upgraded app/data instead of resetting it.

## APIs and authorization

All JSON routes start with /v1/organizations/{organizationId}:

| Method / suffix | Result |
|---|---|
| POST /projects/{projectId}/uploads | Stable media ID + immutable owner/metadata creates or returns the same upload ID |
| GET /uploads/{uploadId} | Original-owner status/receipt |
| POST /uploads/{uploadId}/complete | Verify original and commit acceptance + job + accepted event, or return existing acceptance |
| GET /projects/{projectId}/media?after={mediaId} | Manager-only accepted media/processing status; 100-item pages and explicit next cursor |

Direct routes, outside the JSON BFF:

- PUT /media/organizations/{organizationId}/uploads/{uploadId}/content
- GET /media/organizations/{organizationId}/assets/{mediaId}/{original|thumb|preview|report}

Every call, including replay, checks current authentication, membership and
project access. Uploads require the original capture owner, including the
submitted accountId; managers or actively assigned workers may upload.
Gallery/downloads are manager-only. Foreign/unknown IDs both return 404;
no session returns 401. Writes require exact WEB_ORIGIN, or absent Origin plus
expo-origin: handovertrack:// for native calls.

The stable media ID and immutable metadata are the idempotency identity (no
separate Idempotency-Key header). Changed metadata: 409 IDEMPOTENCY_CONFLICT.
Concurrent writer: 409 UPLOAD_BUSY. No verified staging: 409 UPLOAD_INCOMPLETE.
Invalid image/integrity: 422. Invalid headers/size: 400. Capacity: 507 STORAGE_FULL.
An accepted content replay returns the prior receipt without replacing bytes.

The BFF allows gallery JSON reads only, never upload commands/content. Next has
a GET-only local image bridge; PUT returns 405. Future edge routing must send
/media/* directly to API. API and proxy responses are private/no-store.
Downloads set nosniff and fixed image types. DTOs contain no paths/credentials.

## Files and crash boundaries

API and worker share one absolute MEDIA_ROOT. scripts/run.mjs resolves the
default .local/media from repository root before spawning children. Supply an
absolute path when bypassing that runner. Every ancestor must be a real
directory, not a symlink. On macOS, canonicalize /var test roots to /private/var.

Files use generated media UUID directories:

~~~
MEDIA_ROOT/<mediaId>/
  <request UUID>.part
  staged.jpg
  original.jpg
  v1-thumb.webp
  v1-preview.webp
  v1-report.webp
~~~

JPEG only: exact Content-Length, 1–50 MiB, maximum 12,000 per axis and 50 million
pixels, one image and at most four channels. Streaming enforces length and hashes
without unbounded buffering. Signature, full decoder, oriented dimensions and
declared hash/size must agree. Sharp uses pixel/channel limits and a decode
timeout. Original bytes remain unchanged.

At most two content streams run per API process, each limited to 120 seconds.
Session creation serializes pending-byte reservations and checks free space;
the default reserve is 256 MiB. This is intake protection, not a filesystem quota
or a measured production capacity guarantee.

A PostgreSQL advisory transaction fence owns each intake/completion. Scratch
files are exclusive/no-follow. Completed bytes are fsynced and atomically linked
without replacement to staged.jpg; the directory is fsynced. Completion
reauthorizes under membership/project/assignment locks, verifies staging, links
without replacement to original.jpg, fsyncs and verifies again. Acceptance, job
and accepted event then commit together.

Staging/original paths are never reopened for writing. A crash between file
publication and DB commit reconciles through the same session and verified
expected metadata. Lost replies return the same acceptance. A DB trigger forbids
identity/expected-byte mutation and changing accepted state/timestamp.

Failed request-owned scratch copies are removed. Process-kill scratch older
than 24 hours is swept at worker startup or explicitly, under the upload fence
with a live-job check. This never deletes staging, originals, derivatives,
mobile partial files or reservation rows. Incomplete reservations remain visible
and may eventually pause intake; no destructive expiry policy was invented.

## Worker and operations

media_jobs is the transactional queue; media_events contains unique accepted/
ready outbox records. Claims use FOR UPDATE SKIP LOCKED, increment attempts and a
monotonic token, and persist owner/expiry. Default lease: 60 seconds, renewed
every third of its duration. Expired claims recover; renewal, failure and
publication require matching owner/token/state and an unexpired lease.

Image-v1 verifies the original, auto-orients and generates metadata-stripped
WebP derivatives bounded to 320/768/2048 pixels, quality 82, without enlargement.
Files are fsynced and linked without replacement. Identical files left before
DB rollback are verified/reused. Variant metadata, ready state and event commit
together under the lease fence. Retry is exponential, capped at 300s and five
attempts. Terminal failure is visible in gallery/status. SIGTERM drains active
processing; SIGKILL recovery uses expiry.

~~~
pnpm dev:api
pnpm dev:worker
pnpm dev:web
# Separate operator commands:
pnpm media:maintenance status
pnpm media:maintenance redrive <failed-media-UUID>
pnpm media:maintenance sweep-scratch
~~~

Redrive applies only to failed jobs, resets attempts and schedules the same
immutable image-v1 handler. Investigate missing/corrupt originals, disk pressure
or derivative conflicts first. Do not delete originals to force success.

Hardware power-loss and backup restore are not proved by process-crash tests.
Deployment requires tested shared same-filesystem hard links/directory fsync,
measured decode memory/disk/inodes, a retained volume and independent backup.

## Mobile and gallery

Local integrity and network state have independent lifetimes. saved() repairs
only explicitly allowed local-capture failures; it cannot reset uploading,
server_accepted, completed, failed or authentication-blocked queue intent.
Missing/corrupt local bytes suppress local saved/eligible status while retaining
the server receipt.

Queue states: pending, blocked, uploading, server_accepted, completed (reserved
terminal compatibility), failed. Persisted fields include upload ID, attempts,
next-attempt time, bytes sent and acceptance timestamp. The foreground connected
executor verifies identity and local bytes, obtains/reconciles the stable
session, streams with Expo's cancellable binary upload task, completes and
validates the entire owner/hash/size/dimension receipt. Only then is
server_accepted saved. Late progress cannot overwrite it.

Network retry backs off from 2s to 5min, stopping at eight attempts. Auth/access
denial blocks the original owner's queue. Retry blocked uploads resets eligible
network/access failures after access restoration; invalid immutable content
stays failed. Restart with a session asks status first; restart before a session
reply reuses the capture ID. Completed work is not reuploaded.

Logout/scope change, backgrounding and disconnection abort transport. Credentials
are captured once per run and never borrowed from a new login. Already-dispatched
authorized work can commit under its original owner; canceled callbacks cannot
publish into a new scope, and later same-owner reconciliation discovers that
acceptance. Cache purges/rebootstrap cannot cascade into evidence. No local
original deletion or retention policy was added.

The manager gallery uses account/org/project Query keys, explicit refresh
invalidation, 5s reads of committed state and paginated load-more. It shows the
original during pending/failed processing and previews when ready. Scope and
logout fences suppress late protected results.

## Actual evidence

All logs are under ignored .local; no credentials are recorded.

| Check | Result | Evidence |
|---|---|---|
| Frozen install / lint/import boundaries / typecheck / contracts | PASS | task04-frozen-install.log, task04-lint.log, task04-typecheck.log, task04-contracts.log |
| SQLite/filesystem/Query/recovery/cancellation | PASS | 45 tests, task04-unit-tests.log; actual close/reopen with network/terminal queue states |
| Foundation HTTP/PostgreSQL regression | PASS | task04-integration.log |
| Sync/authorization/concurrency regression | PASS | task04-sync.log |
| Twenty-photo failure scenario | PASS, automated | task04-media.log: CaptureService + SQLite + generated JPEGs + HTTP/PostgreSQL + compiled worker; not camera evidence |
| Interrupted stream / lost committed reply / mobile restart | PASS | Exactly 20 accepted assets, no completed requeue |
| Concurrent writers/completions / foreign owner/read/replay denial | PASS | Same scenario; unchanged original inode and one job per asset |
| Checksum/signature/dimension/oversize/path/symlink / capacity denial | PASS, automated | Same scenario; reserve rejection/local faults, not a physically full phone |
| Expired leases / SIGKILL restart / bounded terminal failures | PASS | Actual compiled worker; 20 verified originals, 60 derivatives, 40 unique events |
| File-before-DB gaps / explicit redrive / scratch cleanup | PASS | Original and derivative commit-failure injection/recovery |
| Production builds and API/worker smoke | PASS | task04-build.log, task04-api-build.log, task04-worker.log |
| Real browser journeys and gallery visual inspection | PASS | 6/6, task04-web.log; task04-manager-gallery.png inspected, synthetic green image |
| Expo dependency check / iOS export / secret scan | PASS | task04-mobile-check.log, task04-mobile-export.log, task04-client-bundles.log |
| Release simulator upgrade/gallery/reopen | PASS | task04-native-build-final.log; actual UI retained North worker/project and showed new gallery controls |
| Native SQLite migration, no fabricated camera rows | PASS | Read-only task04-native-sqlite.log: user_version=4, cached project retained, zero media/queue |
| Physical Task 03 and native Task 04 capture/upload | NOT RUN | No direct phone interaction/results |
| Deployment / edge / independent restore | NOT RUN | Outside Task 04 |

The smallest remaining gate is the updated physical Release app: permission
allow/deny/Settings return, twenty offline captures, terminate/reopen, native
upload interruption/lost replies, worker restart, exact original/derivative counts
and captured-photo account/org/revocation checks. Preserve those actual originals.
An empty simulator gallery proves neither camera capture nor native file upload.

Task 05 is prepared in [the next prompt](../prompts/05-trial-deployment.md).
Stop here; no Task 05 work was started.
