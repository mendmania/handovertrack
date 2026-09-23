# Task 05 — live disposable k3s trial

**Status: HTTPS deployed; physical capture/isolation/upload and full-batch technical
recovery PASS. Native failure/retry and operational recovery gates remain open.**

## Owner-requested automatic release follow-up — 2026-09-22

The owner separately requested automatic **build, publication and deployment to
handovertrack.com on pushes to main**, superseding the earlier prohibition on
adding deployment automation. [PR #5](https://github.com/mendmania/handovertrack/pull/5)
is merged. The first actual main-triggered
[release run](https://github.com/mendmania/handovertrack/actions/runs/35727843641)
**PASS**: all validation, exact-image smoke, GHCR publication and immutable
metadata upload succeeded for `main-4-1bf8d8732b41`. The actual controller's
run/artifact qualification passes and published migration checksums match live SQL.

**Automatic live deployment is NOT ACTIVE.** SSH authentication for the existing
operator key fails, so the fixed controller and timer are not installed. Registry
visibility/access awaits the owner's public/private choice; no visibility change
was performed. Dedicated scoped RBAC/token resources are prepared; live preflight
passes and permissions deny Rrugë writes and source PVC deletion. No app release,
new release snapshot, runtime/schema mutation or recovery-resource cleanup occurred.
The 25 server originals and 75 variants, source workloads and all three retained
rehearsals remain unchanged. See the
[actual activation evidence](evidence/05-automatic-release-20260922.json).

This release work does not close the Task 05 physical or independent-recovery
gates below. Tasks 03–05 remain `implemented-awaiting-validation`, disposable-only;
Task 06 is not started. The next deployment step needs working existing SSH access
and an agreed container-pull method, followed by installation, check-only
qualification and a verified first rollout before claiming activation.

## Current checkpoint — native fault preparation, 2026-09-22

**Tasks 03–05 remain `implemented-awaiting-validation`; disposable-only. Stop
before Task 06.** The owner reported **“Phone interaction is unavailable right
now.”** No capture/reconnect was requested, no new ID was created, no control was
armed and no app was installed or launched. Read-only USB copying was available.
The recovery reply was “xontinue”; it authorizes continuing work but confirms no
custody, storage destination or operating commitment.

The refreshed before/after baseline preserves **23 phone originals and accepted
receipts**, SQLite v4, **25 server originals/ready jobs and 75 decoded variants**.
All IDs, owners, original hashes, receipts and logical job/event identities match
the previous batch. Assignment remains active v5. Source workloads are Ready;
shared edge, Rrugë, configuration, immutable migrations, all **59 retained recovery
files** and three stopped rehearsal resource/PVC identities remain preserved.

[Temporary control tooling](../../scripts/validation/task05-native/README.md)
prepares one named new ID at a time. It refuses baseline/server IDs and verifies
unattempted pending state, original bytes and ownership before preparing a local
control. The special build excludes all 23 baseline IDs and captures older than
this baseline. A durable per-case session binding and result hold prevent retries
from hiding evidence; release is explicit, with no receipt or queue reset.

| Remaining check | Actual result this continuation |
|---|---|
| Interrupted native binary stream | **NOT RUN, physical.** Prepared native NSURLSession delegate suspends/cancels the exact named session at positive incomplete counters; final counters and independent pending server state are required. Missing the partial window is not PASS. |
| App termination during upload | **NOT RUN, physical.** Prepared delegate suspends unfinished native work for a measured app termination; the ordinary 120-second timeout remains. No app termination was performed. |
| Lost completion response/reconciliation | **NOT RUN, physical/test-seam execution.** Prepared wrapper withholds a successful real HTTPS acceptance from UploadExecutor and retains the receipt for correlation. Future execution must be labelled controlled response-delivery loss, not radio loss. |
| Control logic | **PASS, synthetic only.** Nine compiled native delegate cases, six control preparation/preservation cases and 58 overlay/media/store tests pass. Normal regressions include a new SQLite check that late progress, retry and cold recovery cannot downgrade acceptance. |
| Special signed build | **PASS, preparation only; NOT INSTALLED.** Same bundle/signing profile and schema v4; HTTPS and both JS/native fault markers verified in the actual signed artifact. Prior signed app retained. |
| Recovery decisions | **UNCONFIRMED.** Independent FileVault credential access, independently accessible backup bytes after Mac loss, operator/cadence/Mac availability and failed/missed-run response are still undecided. No external copy, schedule or notification was created. |

The first special build compiled successfully but artifact verification rejected
it: SDK 57 linked a precompiled Expo FileSystem framework, omitting the patched
native delegate. The corrected temporary build selects only `expo-file-system`
for source compilation. This failed attempt and its logs remain retained. Source,
package/configuration and dependency changes are restored after building; the
normal signed Release is rebuilt and inspected for absence of all test markers.
No permanent fault hook is added to the normal runtime.

Exact artifact hashes, baseline/case results and preservation evidence are in
[the preparation manifest](evidence/05-native-fault-preparation-20260922.json).
Private snapshots, signing artifacts, overlay restoration journals and logs are
under `.local/task05-native-faults-20260922/`. No credentials or image bytes are
included in the public manifest. No server/runtime/schema release occurred.

No new photo exists, so the verified backup `handovertrack-20260922T112734Z-54ce2f`
and its previously passing application restore still cover all 25 server originals,
75 derivatives and 125 paths. This continuation rechecks retained-file hashes and
unchanged source media; it does not claim a new backup or another application
restore. The older local-HTTP phone original remains outside server coverage.
No fourth rehearsal was allocated.

The next action requires the owner's available, confirmed-offline phone: recheck
current baseline and compatibility, install the prepared special build in place,
verify preservation, then capture **one** new disposable photo, obtain its ID and
verify its named control before reconnect. Execute/release each case separately,
restore the compatible normal app afterward and take a fresh verified backup of
actual new IDs. Physical fault timing/reconciliation and operational recovery
readiness remain the smallest open gates. Task 06 has not started.

## Preserved full-batch validation outcome — 2026-09-22

**Tasks 03–05 remain `implemented-awaiting-validation`; disposable-only. Task 06
has not started.** The batch results below remain valid; the current continuation is above. There is no outstanding assignment restoration or worker resumption:
the owner restored North worker/Riverside through manager.both at 11:09:09 UTC
(active v5, audit revision 7). The guard detected this concurrent change and did
not overwrite it. Worker, API and web are back at one ready replica each.

| Check | Result and actual evidence |
|---|---|
| Camera denial, allow/return from Settings, cancel/back | **PASS, owner observed.** Owner answered “done its okej” to the ordered permission test. The following USB copy has the same 23 originals and accepted receipts, no added photo; all JPEGs decode. |
| Twenty new offline captures and saved intent | **PASS.** Owner reported 20 saves offline; read-only Documents/SQLite copies verify 20 distinct IDs/hashes, manifests and original-owner queues. Radio state is owner-reported, not independently measured. |
| Offline terminate/reopen | **PASS.** Owner confirmed photos visible after requested app-switcher termination/reopen; before/after copies preserve all cohort originals, owners and pending records. Exact UI count/error wording was not separately reported. |
| Revocation while pending | **PASS.** Manager API revoked only the test assignment (v3→v4); native project disappeared and owner observed “Blocked: project access is unavailable.” All originals/pending intent survived; no new-cohort asset uploaded while revoked. |
| Logout, account/org switch and rebootstrap | **PASS.** Owner explicitly confirmed empty manager.both Saved photos in both North and South. Copied scopes/server membership corroborate identity; zero media/queue ownership transfer. Returning to worker rebuilt its cache and restored photo visibility, with all originals intact. |
| Native upload and manager visibility | **PASS.** Owner sees uploaded photos on the web. Each of 21 new originals has matching phone/server ID, scope, size and SHA-256; one asset, one logical job, one accepted/ready event pair, three valid decoded derivatives. |
| Owned worker restart | **PASS.** Only the trial worker was stopped; all 21 new jobs persisted pending at attempt 0. Its replacement processed each once. This does not exercise killing an active lease; earlier synthetic lease tests remain separate. |
| Native stream interruption, app restart during upload, retry and lost completion response | **NOT RUN.** All new uploads completed on attempt 1 before controlled interruption. Successful upload/reopen and synthetic faults do not establish these native failure paths. |
| Fresh full-batch backup/application restore | **PASS, agent observed.** `handovertrack-20260922T112734Z-54ce2f` restores 25 originals, 75 variants, 125 media paths and matching hashes/counts for all 18 public tables into `handovertrack-restore-20260922c`. Saved sessions, access denials, manager downloads and the ready gallery pass. |
| Independent key/backup access after Mac loss and dependable operation | **NOT RUN/unconfirmed.** FileVault is On. Owner confirmation was requested without asking for secrets; restoring from this Mac’s backup does not prove access when this Mac is lost. See the proposed manual procedure in RECOVERY.md. No unattended schedule or alerts are installed. |

Counts are deliberately different: the phone preserves **23 originals/accepted
receipts** (22 current North-worker photos plus one older local-HTTP photo under
a different owner). The server has **25 accepted originals, 25 ready jobs and
75 variants**: four earlier assets plus the planned twenty and one additional
capture. The extra capture is preserved, not removed to force a count. The
older local-HTTP original is preserved on the phone and private USB copies but
is not a live-server backup asset.

Durable, nonsecret evidence: [twenty-ID cohort](evidence/05-native-batch-20260922.json),
[additional capture](evidence/05-native-extra-20260922.json),
[verification and all 25 server original hashes](evidence/05-native-validation-20260922.json)
and [fresh backup/restore evidence](evidence/05-batch-recovery-20260922.json). Private USB snapshots, manifests/queue comparisons, decodes,
assignment/worker journals and verification logs remain under
`.local/task05-phone-validation-usb-20260922/`; recovery execution evidence is
under `.local/task05-batch-recovery-20260922/`. Credentials, image bytes, auth
sessions and secret-bearing backups remain outside Git.

Fresh backup: `handovertrack-20260922T112734Z-54ce2f` on the FileVault Mac, below
`~/Library/Application Support/HandoverTrack/recovery/`. It includes the earlier
HTTPS owner photo, all twenty cohort IDs, the extra capture and three older
synthetic fixtures. `database.dump`: **57,991 bytes**,
SHA-256 `0fb15c38e0eb68506c9594a8029689e89a836f5dcfeaadc7e4daadacba70cf77`. `media.tar.gz`:
**198,598,027 bytes**, SHA-256
`dc3d8816adac4dd77cc803bf39103d22fe1106d4d49b631eaeff367b9cc461af`. All receipt file hashes match. The receipt's
`independent_restore_verified: false` is its original backup-only field; separate
restore evidence now establishes the application restore PASS without changing
that retained receipt.

The new isolated rehearsal `handovertrack-restore-20260922c` uses database PV
`pvc-7597e2a3-6af9-4a5e-84eb-fe48963a061a` and media PV
`pvc-78bb3536-4850-4533-a260-2c2680d4cb43`, both Retain and distinct from source and
both older rehearsals. Verified regular-file groups bounded each restore transfer;
all inventory paths/hashes and PVC-root ownership/mode match. API/worker/database
are stopped, the owned helper and loopback forwarding are closed, and all three
rehearsals' namespaces, credentials and PVCs are retained. Restore application
verification took 266.7 seconds from preparation;
this is one measured rehearsal on the existing VPS in an isolated namespace,
not a replacement-node rebuild or an RTO guarantee. Container lifetime peak
memory remains **NOT RUN** because the cgroup counters were unavailable.


The first full-batch gzip stream was truncated at 171,573,248 bytes and rejected
without a successful receipt (`handovertrack-20260922T111923Z-1599a8`); that partial
attempt is preserved. A second attempt (`handovertrack-20260922T112433Z-455f59`)
was rejected after a connection reset and is also retained without a receipt.
Backup tooling now builds the gzip archive from verified 4-MiB media ranges,
with at most three attempts for a failed read-only range. No source original is changed or removed by this repair.

No runtime image, schema, phone install, credentials, shared edge/network policy
or Rrugë resources changed. Local configuration, migrations, all 41 pre-existing
recovery files, earlier rehearsal resource identities/PVCs and source originals
were rechecked for preservation. Existing HTTPS sites remained healthy. The
operator extraction fix excludes all archive directory entries, including the
PVC root; twelve focused operator tests pass. Task 06 remains prepared only.

The next smallest validation step is a coordinated disposable native upload with
a deliberately interrupted binary stream and separately lost completion reply,
recording durable retry/acceptance identity without deleting any existing photo.
Also confirm independently accessible backup/key custody, an accountable manual
backup operator and workstation availability/failed-backup response. Until those
gates close, do not mark the tasks complete or accept customer evidence.

## Historical checkpoints (preserved; not current operating instructions)

## Offline reopen PASS; scoped revocation test active — 2026-09-22 10:38 UTC

Worker return (11:06 UTC): the phone has a fresh North worker bootstrap scope,
with manager cache scopes removed. All **23 original bytes/identities and queue
records remain unchanged**, including 21 pending worker photos and two older
accepted receipts; current-worker saved count is 22. SQLite integrity/foreign
keys pass. The owner asked why no project is assigned; this was explained as the
still-active temporary revocation. They have been directed to Saved photos and
to disable Wi-Fi before guarded assignment restoration and native upload testing.
Worker-return storage/rebootstrap preservation passes; owner gallery/offline-ready
confirmation is pending. Evidence: `worker-return-verification.json` and
`worker-return-result.json`. No worker pause/restart has been run yet.

**PASS — manager account/org isolation:** the owner explicitly confirms Saved
photos is empty in **both North Crew and South Crew** as manager.both. The copied
manager scopes and server identity corroborate the login/switch, and all 23
worker/older originals and queue records remain unchanged under their original
owners, with zero manager-owned/inherited records. The owner is now returning to
worker.north, checking that the 22 current-owner photos reappear, then disabling
Wi-Fi again while retaining USB. Assignment v4 stays temporarily inactive to
prevent early uploads. Return-to-owner/rebootstrap and native interruption are
pending the next copied checkpoint; guarded restoration is still required.

Manager login follow-up (11:02 UTC): owner reports successful sign-in with no
photos visible. The fresh physical Documents copy has the confirmed
`manager.both@example.test` account (`51d2aefb-e283-49f2-b40e-11b8e4ea2234`)
bootstrapped in both South and North; server identity/memberships match. The
previous worker cache scope is gone, but **all 23 original identities/bytes and
queue records are unchanged**: 21 worker pending intents plus two older accepted
receipts. The manager owns zero local media and inherited zero queue items.
SQLite integrity/foreign keys pass. Separate owner confirmation that Saved photos
was empty in **both** organizations has been requested; the narrow observed
account-switch/data-preservation result passes, while the complete UI/isolation
sequence remains in progress. No assignment restoration yet; v4 stays inactive
until the worker-return/upload test is prepared. Evidence:
`manager-isolation-verification.json` and `manager-isolation-result.json`.

Latest clarification: the owner confirms the mobile message **“Blocked: project
access is unavailable.”** Combined with zero new-batch server rows and unchanged
originals/owner queue records in the recent copy, this supports revoked-pending
blocking and preservation. The earlier ambiguous manager-side report is not a
confirmed exposure; account/org isolation remains untested. The owner has now
been given explicit **iPhone app** steps: worker sign-out → manager.both sign-in →
Saved photos in North → Saved photos in South, then remain as manager for a copy.
The assignment remains temporarily inactive v4; restore it through the documented
manager API after this exercise. No data/configuration changes were made for
this clarification.

Owner subsequently reported “new photos are appearing on manager side.” This is
**UNRESOLVED**, not a confirmed exposure or upload: a new live read finds only
four earlier server assets and **zero rows for the 21 new captures**. A fresh
phone copy verifies all 23 originals and owner/queue records unchanged, with
21 still pending and only the original worker cached scope. The owner has been
asked whether this means the website project gallery or the iPhone Saved photos
screen and which account/org is visible. No isolation PASS/FAIL is inferred
without that distinction. The test assignment remains inactive v4 and requires
the documented guarded restoration. Evidence: `manager-photos-report-*.json`
and its private Documents copy in the USB-validation directory.

Follow-up: owner reports “Projects synced; no assigned project” after reconnect.
A fresh phone copy verifies zero cached projects/assignments, all 23 originals
and unchanged owner/queue records (21 pending, two accepted receipts), with no
new server upload rows. Durable pending intent remains `pending`; effective access
is blocked by the revoked project, as designed. The owner has been asked to
inspect blocked gallery images, sign out, and check local-photo invisibility as
`manager.both@example.test` in North and South before returning to the original
owner. Assignment version 4 remains intentionally inactive during this exercise;
restoration is still required. Evidence: `online-revoked-verification.json` and
`revoked-preservation.json` in the private USB-validation evidence directory.

**PASS — the recorded twenty-photo cohort and both older originals/receipts
survived the owner-performed offline close/reopen.** The owner confirmed the
photos are present after the requested app-switcher termination and reopen. The
second physical Documents copy has all 22 baseline IDs with unchanged bytes,
hashes, ownership, media state and queue records. Every JPEG decodes; SQLite v4
integrity and foreign-key checks pass. Exact UI count/error wording was not
separately supplied, so stored counts remain agent-observed.

One additional valid pending capture appeared between copies:
`cebaab5a-6141-4084-83a4-c71bc6bcdfcc`, **4,600,817 bytes**, SHA-256
`c6c46cb1a87693480bf52a6e258f3e66ee3af4b69c406189a48513e321ccd4f9`,
created `2026-09-22T10:36:31.548Z`. Its original/manifest/owner/queue match and it
fully decodes. It is preserved separately in the
[extra-capture manifest](evidence/05-native-extra-20260922.json); the original
[twenty-ID cohort](evidence/05-native-batch-20260922.json) is unchanged. Current
physical counts: **23 originals, 21 pending and two accepted receipts**, with
**22 saved originals under the current trial account**. A first comparison
asserted exact set equality and rejected the extra ID; corrected subset comparison
verified every baseline record, with no missing/replaced/changed original.

**Active test state — restoration required:** the real manager assignment API
changed only North worker `d6cc7b45-75f0-4f08-b87b-594152f780bd` on project
`aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1` from active version **3** to inactive
version **4**. Optimistic version and idempotency guards were used, and the sync
feed removal records were captured. The worker project endpoint now returns 404.
No direct SQL write, membership mutation, seed or network-policy change occurred.
The owner has been instructed to reconnect Wi-Fi, refresh projects and report
blocked pending-photo state with originals still visible. Native revoked-work
blocking and subsequent account/org isolation remain pending observation/copies.

Before finishing/canceling this exercise, restore **only this test assignment**
through the manager API using its current version; do not replay seed or edit
SQL. The private journal records the exact original state and guards concurrent
changes: `.local/task05-phone-validation-usb-20260922/assignment-exercise.json`.
The scoped operator command is `python3
.local/task05-phone-validation-usb-20260922/assignment-control.py restore`; it
requires the recorded inactive version, publishes the restored assignment through
the real sync feed and confirms worker access. Do not restore prematurely while
the owner is testing blocked pending work. If another operator changes that
assignment, inspect rather than overwrite. This temporary revocation is confined
to the disposable trial; no other assignment or credentials changed.

Evidence: `offline-twenty-after-reopen-verification.json`, its decode companion,
`offline-reopen-result.json` and the assignment journal in the same private local
directory. Recovery coverage is unchanged; none of the 21 new pending originals
is in the 09:05 UTC server backup. If all upload, expected total server assets
become **25**, with **75 variants**, including four baseline assets and the extra
capture. Never delete the extra original to force a count of twenty. Task 06
remains untouched.

## Twenty new pending physical originals verified — 2026-09-22 10:35 UTC

**PASS — owner-reported twenty offline saves, corroborated by physical-device
SQLite/filesystem verification.** All **20 new IDs and 20 distinct hashes** are
recorded in the [batch evidence manifest](evidence/05-native-batch-20260922.json).
The originals total **87,744,507 bytes**. Each JPEG fully decodes, its hash/size
and oriented dimensions match SQLite and the immutable manifest, and its
reservation, canonical directory and queue agree on the original account,
organization and project. All twenty queues are `pending`, attempts 0, bytes sent
0, with no upload ID or accepted timestamp. A live read-only query finds **zero**
server upload rows for these twenty IDs; the existing server remains at four
accepted originals and twelve variants.

The fresh Documents copy has **22 saved originals and 22 queue entries total**:
twenty pending plus two preserved accepted receipts. **21 originals belong to the
current trial account**; the older local-HTTP photo remains under its other
original account. Both older byte hashes, immutable identities and queue receipts
are unchanged. SQLite v4 integrity and foreign-key checks pass; no missing
baseline original, orphan or extra queue record was found. Camera permission
branches are still unconfirmed; radio state and saved UI messages are owner
reports, while bytes/identities/counts are agent-verified.

The owner was instructed to keep Airplane Mode on, Wi-Fi off and USB connected,
swipe HandoverTrack away, reopen it and inspect Saved photos. Expected current
scope count is 21 (twenty new plus its earlier accepted photo). **Offline cold
reopen/visible-gallery recovery is pending** until the owner reports the result
and a second copy is compared with this exact before-copy. No process termination
was performed by the agent. Native interruption/retry/lost reply, worker restart
with this batch and pending/accepted scope isolation remain NOT RUN. No assignment
or source configuration was changed. Existing recovery data is preserved; this
new batch is not in the 09:05 UTC server backup. After upload, expect at least
24 total accepted server originals and 72 variants, including the four baseline
assets; never delete older evidence to obtain a total of twenty. Task 06 remains
untouched and Tasks 03–05 remain implemented-awaiting-validation.

Private source evidence: `.local/task05-phone-validation-usb-20260922/`
`offline-twenty-before-reopen-verification.json`, its `-decode.json` companion,
`twenty-pending-baseline.json`, the copy receipt and retained Documents snapshot.
The public manifest contains only scoped IDs/checksums/size/dimensions/timestamps,
not image bytes or credentials.

## First new offline original verified — 2026-09-22 10:33 UTC

**PASS — USB access restored and one new locally saved original verified.** This
supersedes the connection blockers below. The owner reported taking the requested
photo while remaining offline. A fresh read-only Documents copy now contains
SQLite v4 (`integrity_check=ok`, no foreign-key errors), three saved originals,
two preserved accepted receipts and **one pending queue item**. Both older
originals retain identical hashes, ownership and receipts. No orphans, missing
baseline media or unmatched queue rows were found; all three JPEGs fully decode.
Two saved originals belong to the current trial account; the third belongs to
the earlier local-test account and remains retained under that owner.

New media ID: `dc9155ff-16ff-4265-9b67-d0e62e1b9225`, created at
`2026-09-22T10:27:33.329Z`; original **4,364,037 bytes**, SHA-256
`bb775ddea4b48a100163c53fce8346f64fde3afb83226b170ac0622532b5c581`.
SQLite, original bytes, immutable manifest/reservation, canonical owner directory
and queue ownership match. Oriented dimensions are 3024×2902. Owner account
`d6cc7b45-75f0-4f08-b87b-594152f780bd`, North organization, project
`aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1`. Queue is `pending`, attempts 0, bytes sent 0,
no upload ID or acceptance timestamp. A live read-only query finds zero server
upload rows for this ID. This proves durable pending evidence and no acceptance;
physical offline state is owner-reported, not inferred from those records.

Next: capture **nineteen more** distinct disposable photos under the same account
and project while offline, waiting for saved confirmation after each. Keep USB
connected and stop before reconnecting/force-closing so the twenty-ID before-copy
can be recorded. Then coordinate offline termination/reopen and subsequent native
retry/isolation checks. The full twenty-photo, permission, cold-reopen and native
failure/isolation gates remain incomplete. This new original is not included in
the 09:05 UTC server backup. No phone/server mutation was performed by the agent;
Task 06 remains untouched.

Evidence: `.local/task05-phone-validation-usb-20260922/first-offline-photo.json`,
`offline-usb-check-now-verification.json`, its `-decode.json` companion, the device
copy receipt and private Documents copy. Earlier unsuccessful copies are retained.

## Offline capture reported; USB verification pending — 2026-09-22

Second owner-confirmed USB attempt also failed (CoreDevice 1011). A direct
`IOUSBHostDevice` inventory sees USB hubs/peripherals but no iPhone; Xcode reports
the cached phone unavailable with error -27 and is searching the network. This
narrows the blocker to establishing a usable device connection; it is not evidence
of lost originals. Keep the phone offline and try a different data-capable cable
in a direct Mac port, unlocked, accepting any accessory/Trust prompt. The new
photo's bytes/hash/queue still cannot be verified. Evidence:
`.local/task05-phone-validation-usb-20260922/offline-usb-ready-attempt.json`.

The owner reports completing the instructed new-photo step and remaining offline.
The fresh Documents copy failed with CoreDevice 4000 / peer no longer reachable;
CoreDevice lists the phone unavailable, and the USB inventory reports no Apple
mobile device. No new original, hash, queue state or count was obtained. These
checks remain **NOT RUN**, not a photo-loss or capture-failure finding. The last
verified copy still has two preserved accepted originals and zero pending items.
Keep the phone offline, unlock it and establish a data-capable USB connection to
this Mac before retrying the copy. No phone/server data or configuration was
changed, and Task 06 remains untouched. Evidence:
`.local/task05-phone-validation-usb-20260922/offline-new-one-attempt.json` and
`offline-new-one-copy.log`.

## USB phone follow-up — 2026-09-22 10:19 UTC

**PASS — read-only original/queue preservation; new offline batch NOT RUN.**
The owner reconnected the phone by USB. The initial message said offline but its
follow-up explicitly corrected the state to **connected to Wi-Fi**. Permission,
saved-count and reopen fields were placeholders, not observations. No offline or
UI PASS is inferred.

A fresh Documents copy contains SQLite v4 (`integrity_check=ok`, no foreign-key
errors), **two saved originals and two accepted queue receipts**, unchanged from
the earlier phone baseline. There are **zero new media IDs and zero pending
uploads**. One saved original belongs to the current trial account; the older
local-HTTP original remains under its different original account. Both original
hashes/sizes match SQLite and the immutable manifests/reservations; directory
ownership, queue ownership and accepted receipts match. Both JPEGs fully decode
with oriented dimensions 3024×2902. No orphan, missing-original or extra-queue
records were found. This verifies stored data, not UI visibility or cold reopening.

Live read-only checks still show four accepted originals, twelve valid variants,
matching hashes/jobs/events and an active North worker assignment (version 3).
No assignment, server configuration or phone data was changed. Evidence:
`.local/task05-phone-validation-usb-20260922/offline-before-verification.json`,
its `-decode.json` companion, `server-before.json` and the private Documents copy.

Next ordered action supplied to the owner: keep USB connected, open the assigned
North project online, enable Airplane Mode and explicitly disable Wi-Fi, capture
**one** new disposable photo, and report the exact saved/error message while
remaining offline. Verify that new ID/bytes/queue before extending to twenty and
coordinating offline reopen. Native retry/isolation need pending evidence; do not
try to manufacture retries from the two already accepted receipts. Keep existing
photos and stop before Task 06. Recovery coverage remains the four baseline
server originals from the 09:05 UTC backup; it covers no future test batch.

## Validation continuation — 2026-09-22, 08:58–09:20 UTC

**Task 05 remains `implemented-awaiting-validation`, disposable-only. Task 06
has not started.** This follow-up supersedes the older backup-coverage gap below:
a new technical restore now covers the owner's HTTPS photo. It does not close the
extended native or independent recovery-readiness gates. Existing historical
records and failed attempts are retained.

Started on `codex/k3s-trial`, HEAD `89ee0da`, ahead of its local tracking ref by
13 commits. README, implementation status and Task 06 prompt were already modified;
the focused Task 05 validation prompt was already untracked. Those changes were
preserved. No applicable repository/ancestor AGENTS.md was found. No runtime
release, migration, phone installation, seed, image import, edge or DNS change
was performed. Runtime source/image remain exactly as recorded below.

### Baseline and physical evidence

Live read-only baseline: four accepted originals, four ready logical jobs,
twelve valid variants, one accepted/ready event pair per original; all original
and derivative hashes, sizes, oriented dimensions and decodes passed. Phone
Documents copied at 08:58 UTC: SQLite v4, `integrity_check=ok`, one cached project
(`North · Riverside repair`), one cached assignment, two media rows and two
`server_accepted` queue receipts. Both existing phone originals matched their
recorded hashes. They have different account IDs: the older local-HTTP original
`b162b255-f212-492f-acfa-5268b8415d47` remains under its original local owner;
`c305e7a8-13f9-469a-b305-e64116b19061` remains under its live-trial owner. Neither
identity or receipt was rewritten or treated as belonging to a new scope.

The owner confirmed availability. Ordered instructions were supplied for Camera
off/denial, Settings return, cancel, and then twenty new distinct captures in the
assigned project with Airplane Mode and Wi-Fi off. No results/counts were received
before this checkpoint. A follow-up Documents copy failed with CoreDevice 1011
(device not located). That is not evidence of either failure or success of the
native scenarios. No uninstall, data reset, permission reset or remote phone
mutation was performed by the agent.

| Check | Result | Evidence type / limit |
|---|---|---|
| Existing phone originals, ownership and accepted receipts | PASS | Read-only physical Documents/SQLite baseline; not a cold-reopen UI test |
| Existing four live originals/jobs/events/twelve derivatives | PASS | Live DB/filesystem/decoder verification |
| Camera permission denial, Settings return and cancel | NOT RUN | Owner available and instructed; observations pending |
| Twenty new physical offline captures and confirmed saved states | NOT RUN | No returned count/ID manifest; wireless device later unreachable |
| Offline termination/reopen and Query reconstruction | NOT RUN | Await confirmed batch and before/after durable copies |
| Native upload interruption, restart/retry and lost completion reply | NOT RUN | No physical failure injection this session; earlier synthetic PASS remains separate |
| Owned worker restart during native batch processing | NOT RUN | Backup writer resumption is not this scenario |
| Twenty new IDs accepted exactly once, originals and sixty variants | NOT RUN | This run verified the four baseline assets only |
| Pending/accepted photo logout, account/org switching, revocation and rebootstrap | NOT RUN | No assignments changed in this continuation; no scope-isolation inference from baseline |

### Fresh independent backup and isolated restore

**PASS — technical backup/application restore of the four baseline assets.**
FileVault remains On. Target free space was 29,621,882,880 bytes in the fresh
capacity check, above the 20-GiB reserve; the backup also enforced twice the
logical database/media-size headroom. Node capacity passed (approximately
310.15 GB free, 6.17 GB available RAM, over 29 million free inodes). The
first-bootstrap preflight's only false check was `hostname_not_already_owned`,
expected because this authorized deployment already owns its route; no bootstrap
was attempted.

Fresh private backup:
`~/Library/Application Support/HandoverTrack/recovery/handovertrack-20260922T090553Z-ac1227/`

- `consistent=true`, `hashes_verified=true`; all **20** archived media paths match.
- `database.dump`: **49,680 bytes**, SHA-256
  `943c06fc15ad22e8d2eb564c6066f8f57a1df9bae7440813f4a805307d44f9a2`.
- `media.tar.gz`: **10,621,155 bytes**, SHA-256
  `2b5ebdeb6750485918446bc49bc69951a2095363a84781347020111c06d89ba6`.
- Five source Secrets, two ConfigMaps, workload identities and the original
  bootstrap recovery file remain private and retained. This is FileVault disk
  encryption, not an independently keyed portable encrypted archive.

Exact accepted-original coverage:

| Media ID | Bytes | SHA-256 |
|---|---:|---|
| `1efa19d7-bf3a-44fc-9a0b-8d64f0a89207` | 52,428,800 | `57e2e9c9decfe30159ad3e25cecf5f51838f507cc369d2b9d476f6c5b32ffeb6` |
| `62a8100f-69f4-405b-bee6-7e73ee67c454` | 313 | `b316a4d4662dc2e9434fcd7b1058e006a2a316cdfdfa761586939e1ff0dafeea` |
| `66967541-50c3-4597-9145-3a37b5db43b4` | 313 | `b316a4d4662dc2e9434fcd7b1058e006a2a316cdfdfa761586939e1ff0dafeea` |
| `c305e7a8-13f9-469a-b305-e64116b19061` (owner's HTTPS photo) | 5,156,368 | `18a719e42fc56dc80af85f1d544aee0e1be3c67a3d04b416b73ceb2a1a0e3971` |

This backup contains three synthetic originals and one owner-captured original;
**it does not contain a new twenty-photo physical batch or the older local-HTTP
phone original**. The latter remains on the phone and in prior local evidence.
Take another consistent backup and restore after the new batch is accepted.

New namespace **`handovertrack-restore-20260922b`**, with separate Retain claims:

- database → `pvc-64368cf5-9c85-40ea-82a8-5ede676a0616`
- media → `pvc-b7427a66-afc3-444a-8b68-dfb97b093af0`

All namespace selectors were rewritten; edge ingress stayed denied, Services
were ClusterIP only, and testing used an owned loopback port-forward. The source
and previous `handovertrack-restore-20260922` volumes were not reused. No seed or
migration ran over the restored dump. Before worker start, every saved table hash
matched, including users, sessions, owners/memberships, assignments, migrations,
accepted originals, jobs, events and variants. After startup, the same table
hashes still matched; the four jobs were already ready. Saved manager/worker/other
organization sessions authenticated, authorized original downloads matched,
worker/foreign reads returned 404 and unauthenticated reads 401. The gallery
contained four ready assets. All originals and twelve variants decoded correctly.
Application verification completed **315.7 seconds after restore preparation**,
**473.3 seconds after backup start**; this includes diagnosis/recovery time and
excludes final controller shutdown. Earlier expired-lease recovery PASS is
preserved; no new pending/expired lease was injected into this ready-only snapshot.

**FAIL, corrected — fresh extraction runbook.** GNU tar still attempted to change
PVC-root mode with `--no-overwrite-dir` and exited 2. Every extracted path/hash and
all restored DB tables were checked before resuming. A fresh helper-temporary
extraction selecting regular files only passed and retained root mode 0700. The
verified partial PVC extraction was resumed with the same regular-file list and
`--skip-old-files`, preserving its existing root metadata and all bytes. No DB
restore was replayed. New `scripts/ops/restore-members.py` verifies inventory
hashes and rejects traversal, special members and duplicates before writing an
exclusive mode-0600 NUL-separated list. RECOVERY.md now uses that list so archive
root metadata is never selected. The CLI's output matched the list actually
used in the Linux helper. Nine operator unit tests pass, including fresh
root-preserving extraction and unsafe/archive-integrity rejection. The initial
macOS test used GNU-only options and failed; the portable regression was corrected,
while the full GNU option sequence was validated in the live Linux helper.

Two read-only harness attempts also required correction: a raw Kubernetes stats
request incorrectly appended `-o json`, and the media-inventory tool correctly
refused a temporary root other than `/media`. Corrected raw stats and a separate
temporary-directory hash reader passed. These are retained harness failures,
not application-data failures. A root HTTP probe initially expected 200 without
following redirects; actual 307 to `/sign-in` and the sign-in page's 200 were
verified, with private/no-store headers.

Restore peak memory: **NOT RUN**; cgroup v1/v2 peak counters were unavailable.
One metrics sample measured API **64 MiB**, database **44 MiB**, worker **27 MiB**,
helper **103 MiB**. These are instantaneous working-set samples, not peak/RSS
claims. Restored filesystem had 309,859,692,544 free bytes and 29,341,576 free
inodes at verification. New restore API/worker/database controllers are stopped;
the temporary helper and port-forward are removed. Its namespace, five recovery
Secrets and both Retain PVCs remain. Earlier stopped rehearsal resources remain.

### Remaining recovery decisions and next step

| Check | Result | Evidence / limit |
|---|---|---|
| Fresh backup covering owner's HTTPS original | PASS | Consistent verified FileVault target, exact coverage above |
| Fresh isolated application restore | PASS | Table/file hashes, saved sessions, access denials and gallery |
| Independently accessible FileVault key/credential custody | NOT RUN | Requested owner confirmation; no key/password/token requested or returned |
| Access to backup bytes after loss/inaccessibility of this Mac | NOT RUN | No independent copy/access path confirmed; a recovery key alone cannot replace lost bytes |
| Accepted operator, cadence, Mac availability and missed-backup response | NOT RUN | Proposed manual procedure documented in RECOVERY.md; owner decisions pending |
| Unattended scheduling or alert delivery | NOT RUN | None configured, authorized or claimed |

Proposed cadence is after each disposable test session and before a release,
with receipt and writer-readiness checks; failed/missed runs pause further intake
and retain partial attempts for diagnosis before retrying. This is a documented
manual procedure, not an accepted service commitment or automated schedule.

Smallest next step: obtain the permission/cancel observations and twenty-photo
saved count while the phone remains offline. If its wireless connection is off,
connect it by USB without reconnecting network access so a durable before-copy
can be taken; then coordinate offline force-close/reopen and a second copy before
native interruption and scope-isolation tests. Never infer a physical PASS from
availability, pairing, file presence or synthetic tests. Confirm recovery custody,
backup access after Mac loss, and the named operator/cadence separately. Stop
before Task 06.

Evidence is in private ignored `.local/task05-validation-20260922/`: `baseline.json`,
`phone-baseline.json`, `server-before.json`, `https-checks.json`,
`before-fresh-backup-{tables,media}.json`, `fresh-backup-summary.json`,
`fresh-restore-{plan,result,pvs}.json`, `fresh-restored-{data,media}.json`, retained
failed/retry logs, `ops-tests-final.log` and `final-preservation.json`. Secret-bearing
recovery files remain outside Git. Final checks preserve all 28 prior recovery
files, source credential/config values, local configuration/migrations, source
originals/receipts and source PVC identities; shared edge bytes/spec and Rrugë
resource identities/restarts are unchanged. All six public sites return HTTPS 200.

## Exact live release and resources

- Runtime source: `ba2ecc8d8040eda6e5d57bf73d6d17e90a4d2337`, built from that
  committed archive. Runtime image on API, worker and web:
  `handovertrack.local/runtime@sha256:125cd8a42f0bb92bf87251d40c4cc14c561ab27e0f00911205e000856d66d7cc`.
  Config digest: `sha256:1dea15fee1d5be927dc3fe3af69af694806fbda37e08dd82b3f77d22b17b9a6d`.
  The owner added the missing digest alias to the already verified SSH-imported
  image. A `Never`-pull digest probe passed; actual workload imageIDs match.
  The old working-tree image was not promoted. No registry path was used.
- Origin/node/context: `159.195.30.113`, `netcupmaniaserver`, explicit
  `netcup-k3s-direct` using the original `~/.kube/netcup-k3s-admin-direct.yaml`.
  Direct access works again; no SSH tunnel/default-context/firewall change is
  required. No privileged Pod, host mount or Docker access bypass was used.
- Namespace `handovertrack`, restricted and labelled `disposable-only`.
  Deployments `api`, `worker`, `web`: one Ready replica each. StatefulSet
  `database`: one Ready PostgreSQL 18.3 replica pinned to
  `sha256:7e32e9833a6fb1c92c32552794cb6ed569d51b445a54907d35fc112ef39684db`.
- StorageClass `handovertrack-local-retain`, Retain / WaitForFirstConsumer,
  unchanged cluster default. Both 4-GiB source claims are Bound to this node:
  `database` → `pvc-24606a50-0d12-4379-b3b4-f183b8802106`;
  `media` → `pvc-afc6cc12-5a3b-4df5-a8c3-22e8a2674e80`.
- Secrets: `auth`, `database-admin`, `migration`, `runtime`, `trial-accounts`.
  ConfigMaps: `runtime`, `database-init`; ServiceAccount `runtime`;
  ResourceQuota `trial-budget`; ClusterIP Services `database:5432`, `api:3301`,
  `web:3300`; NetworkPolicies `default-deny`, `dns`, `database`, `api`, `web`,
  `worker`, `migrate`, `provision`, `backup`. Kubernetes-generated default SA
  and `kube-root-ca.crt` also exist. No public DB, NodePort or Ingress was added.
- Jobs `migrate-ba2ecc8d8040` and `provision-ba2ecc8d8040` completed, then were
  removed after evidence capture. Migrations 001–004 match the committed
  checksums. Only five `.example.test` users, two organizations and four fixture
  projects were provisioned. Three synthetic accepted originals have three
  ready jobs, nine variants and exactly one accepted/ready event per original.
  A subsequent owner-captured phone photo adds one ready job and three variants
  (four accepted originals and twelve variants total at this checkpoint).
- Shared edge `edge-caddy/edge-caddy` now references immutable ConfigMap
  **`handovertrack-edge-78d464618d04`**. Additive NetworkPolicy
  `edge-caddy/handovertrack-egress` permits only the trial's web/API upstreams.
  Previous `erdhairdesign-edge-497262a88fcc` and intermediate
  `handovertrack-edge-1da2a23b2acc` ConfigMaps are retained. The complete original
  Caddyfile bytes precede the single HandoverTrack fragment unchanged.
- Edge-only configuration source: `7fba566fd97d9cc0f046957fd8ab5c7351d4aef0`.
  Actual Caddy adaptation exposed a private-path denial ordered after the web
  fallback. Changed it to a matched `handle` before the fallback; full pinned
  Caddy validation, adapted-order assertion, server dry-run and guarded
  resourceVersion/config-reference patch passed. `/health`, `/metrics`, `/debug`
  and their subpaths now return empty 404s directly at Caddy.
  Runtime application source/image stayed at the exact release above.

## Verified results and preservation

- Apex DNS remains the authorized **DNS-only A → 159.195.30.113**. No www/AAAA,
  proxy or paid-service change. Public HTTPS and direct-origin SNI certificate
  verification pass without `-k`; current certificate expires
  `2026-12-21 06:54:31 GMT`. First issuance occurred after the guarded route;
  no preexisting HandoverTrack certificate was required.
- Internal 401/private-no-store, manager/worker differences, unknown and foreign
  404s, current assignment revoke/restore, native cookie/Expo headers, no signup,
  web sign-in, absent mounted API token and blocked Rrugë DB egress pass.
- Target PVC: no-replace hardlink, file/directory fsync and two concurrent
  50-million-pixel decodes pass; peak RSS **374,152 KiB**, decode **29 ms**.
  API-write/worker-read sentinel inode/hash matched, then only the sentinel was
  removed. Source and restore volumes have verified Retain/node affinity.
- Public route: secure HttpOnly host-only cookie issuance, signout invalidation,
  foreign-origin rejection, private/no-store/noindex, streamed native-header JPEG
  upload, interrupted stream then retry, discarded completion response then replay,
  exact **52,428,800-byte** valid JPEG request, original hashes, worker processing,
  authorized gallery/variants and unauthenticated/cross-tenant/worker denials pass.
  These are automated **synthetic** fixtures, not physical camera proof.
- Restarted only trial web/API/worker/database, one controller at a time.
  Every saved table hash, original hash and prior session survived. The final
  worker Pod has one automatic restart: an initial DB connection was refused at
  `2026-09-22T08:12:01Z`; it started successfully one second later and is Ready.
  No failed media jobs or outstanding reservations remain. Other source Pods
  have zero container restarts. Current memory sample: API 54 MiB, DB 31 MiB,
  web 52 MiB, worker 31 MiB; this is not a peak measurement.
- `rruge.com`, `mendmania.com`, `typechars.com`, `virtualboardzone.com`,
  `tregubio.com` and the new apex all return HTTPS 200. Rrugë web/worker Pod IDs
  differed from yesterday because replacements started at 03:33 UTC, **before**
  today's work. Their identities stayed unchanged through today's edge/recovery
  checks, with zero restarts; Rrugë DB/proxy/gateway identities remain unchanged.
- `.env`, local Compose and migrations retain saved hashes/modes. Local databases,
  original media, saved signing metadata and previous built app/image are retained.
  Reviewed `release.py` passes live check-only schema/image patch dry-runs; its
  explicit `time` import and seven maintenance-gate tests were validated earlier.
  No release apply/controller timer/CI deployment automation was enabled.

## Independent backup and isolated restore

FileVault is On. The existing physically independent Mac had ~27.5 GiB free
before backup, above the script's 20-GiB reserve plus twice the logical source
size. No new service, key, storage purchase or Rrugë credential was used.
All backup/credential directories are private, with mode-0600 files outside Git:

`~/Library/Application Support/HandoverTrack/recovery/handovertrack-20260922T081042Z-bf88b3/`

The receipt has `consistent=true`, `hashes_verified=true`; DB dump **48,101 B**,
SHA-256 `2f97fa86fadf153f5b304535499da03ffe84cf17880246b1c7eb6a02427cb172`;
media gzip **103,489 B**, SHA-256
`b2727b638e2dee88b0abcf18235844972c3a68294bceab0e70d69341a8524ada`.
Its small compressed size reflects deliberately compressible synthetic JPEG
padding; it does not predict compression of real photos. All **12** media paths
(including staged hardlinks archived as full regular files) matched source hashes.
Five dedicated Secrets, two ConfigMaps and workload identities are saved too.
Bootstrap credentials remain separately preserved in
`task05-ba2ecc8d8040-bootstrap.json` in the same recovery parent.
This 08:10 UTC snapshot predates the owner's 08:30 UTC physical photo below;
that new original is preserved live but was not part of this backup/restore test.

Two earlier uncompressed downloads were truncated despite successful command
exit, on both default and alternate streaming transports. Archive verification
rejected both; no successful receipt was issued, and their private partial
folders are retained. The operator backup script now uses gzip before transfer
(commit `1f8efe19b0d994cae2c5d1a27ec3e1c3f11f0977`), validated first with
incompressible data/hardlinks, then with this successful live verified backup.
This is an operator-tool revision; the runtime image was not changed or retagged.

The backup was restored into **`handovertrack-restore-20260922`**, never into the
source namespace. Its separate 4-GiB Retain PVCs are:

- `database` → `pvc-f6587afc-8934-45eb-aaf1-deeffaf8ab43`
- `media` → `pvc-cf853dc8-1c51-4e7c-a0c2-9237684b9a84`

The rehearsal retains SA `runtime`, quota `trial-budget`, the five recovery
Secrets, ConfigMaps `runtime`/`database-init`, ClusterIP Services `database`/`api`,
and policies `default-deny`, `dns`, `database`, `api`, `worker`, `backup`.
Every namespace selector was rewritten and edge ingress removed. Restored API
and worker used the same immutable image. No route, DNS, Ingress, NodePort or
source volume was reused. Controllers API/worker/database are scaled to **zero**;
the ephemeral media helper is removed after verification. Namespace, credentials
and PVC data remain private for review; no helper credential was created.

All table hashes matched before worker startup, including migration checksums,
accounts, ownership, memberships, sessions, accepted originals/jobs/events.
The saved sessions still authenticated, foreign/worker original access stayed
404, and unauthenticated access stayed 401. All originals and nine WebP hashes,
sizes/dimensions and decodes passed. A deliberately abandoned one-second lease
recovered once in both source and restore: attempt 2, one accepted event, one
ready event and three variants. Gallery count is three; no duplicate acceptance.
Verification finished 393.1 seconds after the successful backup started.
Stable table hashes matched after recovery; only the expected lease/ready-event
completion timestamps differ. No seed or migration ran over the restored dump.

First extraction wrote correct bytes but failed when nonroot tar attempted to
change the provisioner's PVC-root metadata. The existing files were verified
before a non-overwriting retry; `--skip-old-files` passed after local testing.
The fresh-restore runbook now preserves root metadata with `--no-overwrite-dir`.
An attempted combination of these mutually exclusive tar options was rejected
without writes. Restore peak memory was **NOT MEASURED**; file/DB/application
integrity checks and bounded resource limits were verified.

**Technical independent encrypted backup/application restore: PASS. Full recovery
readiness: INCOMPLETE.** Independent FileVault recovery-key custody and reliable
workstation availability/backup scheduling remain unconfirmed. The owner was
asked to confirm recoverability without sharing any key. No unattended backup
schedule or alert-delivery test was installed/claimed. Retain disposable-only.

Private shared-edge recovery archives (configuration plus TLS state, all hashes
matched before/after reading) are retained outside Git in
`edge-before-task05-20260922` and `edge-before-task05-correction-20260922`.
No certificate key was placed in this repository.

## Physical device and remaining gates

The paired iPhone 17 Pro Max was available. Read-only Documents copies before
and after the in-place HTTPS Release build show SQLite v4 `integrity_check=ok`,
one preserved original and the same `server_accepted` queue receipt. Original
SHA-256 remains
`ba333a2172c3f2847ab92f7e2173fe564706b9d15d93ddd167cafa9448b1a545`.
The previous signed app was retained. Existing team/profile were reused, without
new provisioning or paid services. Embedded bundle contains
`https://handovertrack.com` and no old LAN origin; code signature/profile checks
pass. The existing profile uses a wildcard application identifier; verification
checks the unchanged profile and the app's concrete bundle ID, rather than
incorrectly requiring a non-wildcard profile. Install and terminate/relaunch
succeeded. No SQLite downgrade, erase or original deletion was performed. During
installation verification no new phone upload was performed. The previous accepted
physical photo remains evidence of local HTTP
upload only, not upload to this trial.

**PASS — one owner-observed physical HTTPS capture-to-web test, 2026-09-22.**
The owner reports testing both logins, taking a photo on mobile and seeing it on
the web. Read-only server verification corroborates the new accepted original
`c305e7a8-13f9-469a-b305-e64116b19061`, upload
`6612943a-976f-41fb-8f4b-15b5b8b41f31`, accepted at
`2026-09-22T08:30:14.669Z`: **5,156,368 bytes**, SHA-256
`18a719e42fc56dc80af85f1d544aee0e1be3c67a3d04b416b73ceb2a1a0e3971`.
Original bytes match the database hash/size and decode successfully; EXIF
orientation 6 maps encoded 2902×3024 to the declared 3024×2902 dimensions.
Processing finished on attempt 1 with exactly one accepted and one ready event.
All three WebP variants pass hash, size, dimensions and decode checks. Capture
and web visibility are owner-observed; the agent verified server/filesystem
evidence, without directly observing the shutter or web UI. Runtime image and
deployment configuration are unchanged.

**NOT RUN:** camera permission grant/denial branches, twenty physical offline
captures, physical interruption/retry and account isolation. iPhone Mirroring
previously required the owner's Mac-password unlock; this does not invalidate
the owner's direct observation above. Do not mark the remaining scenarios
complete from one successful capture, synthetic tests or successful installation.
Cloudflare proxy/Full (strict) checks are also NOT RUN because the authorized
trial stays DNS-only; do not enable proxying as a shortcut.

The owned server release lock was released and the three temporary loopback
port-forwards were stopped after verification. No trial automation is running.

Continue only within Task 05: complete the unlocked physical-phone scenarios and
confirm independently recoverable FileVault custody/availability. Do not rerun
first-bootstrap credential creation, seed/migrate the restore, replay old edge
patches, delete retained PVCs/backups, admit real evidence or begin Task 06.

Evidence is under ignored `.local/task05-*`, notably `20260922-digest-probe`,
`live-{migration-job,provision-job,storage-probe-result,volume-network,internal-checks,
public-checks,public-auth,restart-checks,backup-summary,isolated-restore-result}`,
`edge-20260922-corrected/`, `https-phone-*`, `phone-after-https-preservation`,
`final-health`, `final-resources-20260922` and `owner-photo-20260922`.
Secrets/cookies/edge keys remain
in the private encrypted recovery directory, not these public summaries.

## Historical investigation and checkpoints

## Image-reference follow-up — 2026-09-22

The owner's final `ctr images list` output confirms the full source tag
`handovertrack.local/runtime:ba2ecc8d8040eda6e5d57bf73d6d17e90a4d2337`
points to exactly
`sha256:125cd8a42f0bb92bf87251d40c4cc14c561ab27e0f00911205e000856d66d7cc`,
linux/amd64, 363.8 MiB, with `io.cri-containerd.image=managed`. Only the
repository@digest reference is missing; no rebuild or re-upload is needed.
The owner was given `sudo k3s ctr -n k8s.io images tag SOURCE_REF DIGEST_REF`
with these exact references, without force or reference-check bypass. Its
execution and a successful digest-only Kubernetes probe remain pending.

Fresh direct access through the original explicit kubeconfig now works;
the old SSH tunnel is no longer running or required on this network.
Keychain-backed SSH works, but the agent's `sudo -n true` still requires owner
authentication. The previous bounded release lock has expired: a nonblocking
acquire/release succeeded. No long-lived lock is currently held by this follow-up.
Reacquire it for the next deployment phase. Every fresh preflight check passes,
including DNS and existing-site health. `database-0` remains Ready with zero
restarts; its PVC identity is unchanged, and `media` remains Pending its first
consumer. No application Deployments or Jobs exist. The shared edge spec still
matches the saved baseline. No cluster mutation occurred in this follow-up.

Evidence: `.local/task05-20260922-preflight.json` and
`.local/task05-20260922-image-reference-checkpoint.json`. Recovery/native gates
remain as recorded below. Continue from the digest-reference repair, preserving
the existing namespace, database, credentials and private recovery file.

## Live bootstrap checkpoint — 2026-09-21 18:45 UTC

The owner reported `k3s ctr -n k8s.io images import` saving the expected manifest
`sha256:125cd8a42f0bb92bf87251d40c4cc14c561ab27e0f00911205e000856d66d7cc`.
A restricted diagnostic Pod successfully ran the full source tag
`handovertrack.local/runtime:ba2ecc8d8040eda6e5d57bf73d6d17e90a4d2337`
with `imagePullPolicy: Never`. Its runtime image ID is the exact previously
verified config digest
`sha256:1dea15fee1d5be927dc3fe3af69af694806fbda37e08dd82b3f77d22b17b9a6d`;
architecture x64, UID 1000, API bundle SHA-256
`535dbdde7ba98f1308134f7e58f88c95b55132feaa54644ab46c8925a41e72a4`.
This proves the correct bytes can execute; it is not application promotion.

**Blocking result:** the separate probe using the required repository@manifest
reference still reports `ErrImageNeverPull`. Kubernetes node inventory exposes
only the source tag. Await the owner's final `sudo k3s ctr -n k8s.io images list |
grep handovertrack` output to inspect the registered references. Repair only the
verified image's missing digest reference through the owner's authorized sudo
session, then repeat the digest probe. Do not switch application manifests to
a tag, re-upload the complete archive, use the old working-tree image, or bypass
access with privileged pods. Source remains
`ba2ecc8d8040eda6e5d57bf73d6d17e90a4d2337`.

The Mac's post-restart network times out on the direct API port 6443. The saved
Kubernetes credentials work over an authenticated SSH forward
`127.0.0.1:16443 → VPS 127.0.0.1:6443`, using a new private
`.local/task05-tunnel-kubeconfig.json` with TLS verification against
`159.195.30.113`. The original kubeconfig/default context/firewall are unchanged.
The fresh preflight passes every check, including apex DNS and five existing
healthy sites. Only this task's server `runtime/release.lock` was acquired;
no shared controller was changed. The bounded four-hour lock holder remains
active while awaiting the owner (started around 18:38 UTC; SSH exec session
61362). A fresh SSH session later failed public-key authentication while the
established tunnel continued working. At resumption, restore Keychain-backed
SSH access, identify/release only this owned lock holder, and reacquire the same
lock before further mutation. Do not remove a lock file to evade a live holder.

Created resources (all namespaced resources below are in `handovertrack`):

- Restricted disposable-only Namespace `handovertrack`; StorageClass
  `handovertrack-local-retain` (Retain / WaitForFirstConsumer).
- Secrets `auth`, `database-admin`, `migration`, `runtime`, `trial-accounts`,
  generated independently using create-only tooling. Recovery credentials are
  mode 0600 outside the repository under the FileVault-encrypted
  `~/Library/Application Support/HandoverTrack/recovery/task05-ba2ecc8d8040-bootstrap.json`.
  **Do not rerun credential bootstrap** or overwrite this recovery file.
- ServiceAccount `runtime`, ResourceQuota `trial-budget`, ConfigMaps `runtime`
  and `database-init`; Services `database:5432`, `api:3301`, `web:3300` (ClusterIP).
- NetworkPolicies `default-deny`, `dns`, `database`, `api`, `web`, `worker`,
  `migrate`, `provision`, `backup`.
- PVC `database`, 4 GiB, Bound to
  `pvc-24606a50-0d12-4379-b3b4-f183b8802106`, verified Retain and affinity to
  `netcupmaniaserver`. PVC `media`, 4 GiB, Pending its first consumer.
- StatefulSet `database`, one healthy `database-0`, zero restarts, pinned
  PostgreSQL 18.3 digest `7e32e9833a6fb1c92c32552794cb6ed569d51b445a54907d35fc112ef39684db`.
  Only empty database/roles initialized; no application migrations or seed run.
- Diagnostic Pods `image-verify-ba2ecc8d8040` (digest lookup failure) and
  `image-tag-diagnostic-ba2ecc8d8040` (exit 0); no credentials or media mounted.
  Both owned diagnostic Pods were removed after retaining their complete
  receipts. The only remaining trial Pod is healthy `database-0`.
- Kubernetes additionally generated the namespace's default ServiceAccount
  and `kube-root-ca.crt` ConfigMap. **No application Deployment, Job, Ingress,
  NodePort, shared edge ConfigMap or edge policy was created.**

The fresh complete edge candidate `handovertrack-edge-1da2a23b2acc` validates
against the live pinned Caddy image and passes ConfigMap/policy server dry-runs.
Docker Desktop needed restarting after the owner's shutdown; the first attempt
failed because the daemon was stopped, then validation passed. This is still
preparation only: do not apply the saved patch without rechecking its guarded
resourceVersion and completing internal checks and the edge-state backup.
No preexisting HandoverTrack certificate is required for its first route.

The shared edge Deployment spec and all Rrugë Pod identities/restart counts
match the fresh baseline. FileVault is On; current workstation free space is
30,029,816 KiB (~28.64 GiB), subject to remeasurement and backup size/headroom
guards. Independent key custody and scheduled availability remain unverified.
Consistent server backup and isolated application restore remain **NOT RUN**
until the application can be bootstrapped. The paired iPhone is now reported
**unavailable**; no additional physical camera/upload check was demonstrated.
All earlier native NOT RUN entries remain. No real evidence/customer intake.

Evidence: `.local/task05-live-{preflight,bootstrap-state,database-pv}.json`,
`task05-live-{edge,rruge}-before.json`, `task05-image-{probe,tag-diagnostic}-result.json`,
phase manifests and `task05-live-edge-candidate/`. Preserve the existing partial
bootstrap and continue from the failed digest gate; do not replay first-bootstrap
absence/credential creation over these resources.

## Earlier checkpoint history

## Completed upload after owner return

The owner requested resumption. Reverified the entire local archive and the
saved 136,589,312-byte remote prefix, then resumed under the same transfer lock.
The Mac now used `en0` through gateway `192.168.18.1`; no network settings were
changed by the agent. The remaining 244,854,784 bytes completed in approximately
39 seconds. Full server-side size and SHA-256 verification ran inside the same
SSH session/lock before the atomic rename, avoiding dependency on a fresh
Keychain connection at completion.

**Transfer COMPLETE; owner sudo import still PENDING.** Remote archive:
`/home/mendim/handovertrack-task05-ba2ecc8d8040-20260921/release.oci.tar`,
mode 0600, **381,444,096 bytes**, SHA-256
`ab27fa249c2bb2916fc45f6ed5d589c0a292244724836f1ad9bcf12db07660bf`.
Verified `2026-09-21T18:30:51Z`. The reviewed source and image manifest digest
remain `ba2ecc8d8040eda6e5d57bf73d6d17e90a4d2337` and
`sha256:125cd8a42f0bb92bf87251d40c4cc14c561ab27e0f00911205e000856d66d7cc`.
No image import or live deployment has been claimed. Evidence:
`.local/task05-ssh-delivery.json`, `task05-resume-upload.log` and the retained
`task05-resume-upload.py` operator script. The former paused checkpoint below
is historical; do not resume the now-complete archive again.

## Owner shutdown checkpoint (historical)

The owner requested a ten-minute Mac shutdown. The owned SSH upload was stopped
and the server transfer lock was released. **136,589,312 of 381,444,096 bytes
(35.8%)** are retained in `release.oci.tar.partial`; their SHA-256 was compared
against the exact same-length local archive prefix and matches. The waiting
owner import shell exited at its incomplete-size guard; no import ran. Its
`verified-import.oci.tar` hardlink may remain and must pass the full checksum
before any later import. No source, database, original, live workload or shared
edge configuration was changed.

Resume only when the owner returns and asks to continue. Unlock the Mac so
Keychain-backed SSH can work, reverify the saved remote prefix, and append the
remaining archive bytes under `transfer.lock`. Do not restart from zero, replace
saved credentials, or bypass checksum/size gates. The private resumable receipt
is `.local/task05-ssh-delivery.json` (`paused-for-owner-shutdown`). The owner's
waiting import command must be run again once resumption is arranged.

The network diagnosis measured substantial SSH retransmissions (~9.9 MB resent
of ~120 MB sent), low VPS load and ample memory; the Mac's USB Ethernet adapter
reported a 1-Gbps link. This points to a network-path problem, not a known exact
router/ISP/adapter cause. No network settings were changed. A more reliable path
can be tested after restart, but faster transfer is not guaranteed.

## Rechecked blockers and origin

1. **DNS configured and publicly verified (follow-up):** after the owner signed
   in, the Cloudflare `handovertrack.com` zone had zero records. Created its one
   authorized record: **apex A → `159.195.30.113`, DNS-only, Auto TTL** (served
   TTL 300). Both authoritative nameservers (`donna`, `ganz`) and public
   resolvers `1.1.1.1` and `8.8.8.8` return that exact address. No www, AAAA,
   mail, other-zone record, proxy, plan or SSL/cache setting was changed.
   The workstation's resolver `10.10.1.1` still returned its earlier negative
   cache entry (SOA TTL 770 at 15:52 CEST), so `preflight.py` still correctly
   reports `dns_direct_origin=false` locally. Re-run after cache expiry;
   do not bypass that guard. Receipts: `.local/task05-dns-receipt.json` and
   `.local/task05-dns-preflight.json`. All other preflight checks pass.
2. **SSH access restored; verified archive/manual import pending:** both recorded
   private keys are passphrase-protected and the SSH agent has no loaded
   identities. Explicit macOS `UseKeychain=yes` successfully unlocks the saved
   netcup key and authenticates as `mendim` to `netcupmaniaserver`:
   `ssh -o UseKeychain=yes -o BatchMode=yes -o IdentitiesOnly=yes -i
   ~/.ssh/netcup-k3s-client mendim@159.195.30.113` (join as one command).
   Earlier `Permission denied (publickey)` results were not proof of a revoked
   key; they omitted Keychain access. Termius also contains two mendim profiles
   and a root profile for this IP. Both available keys still fail for root.
   `sudo -n -l` shows mendim may use sudo with authentication; its temporary
   password-free grant expired at `2026-08-25T14:58:17Z`. `sudo -n true` requires
   a password in the agent session. The owner subsequently demonstrated successful
   `sudo -v` in their own VPS terminal as mendim. That authentication is scoped
   to their terminal; no password was shared. The owner will run the guarded
   import there after the transfer/checksum gate. No matching saved VPS sudo
   password was found in the scoped Keychain lookup.
   Do not bypass this via Docker privileges, host mounts or privileged pods.
   The selected path is **SSH OCI import** of the exact rebuilt artifact.
   Staging started in new mode-0700 directory
   `/home/mendim/handovertrack-task05-ba2ecc8d8040-20260921`; slow transfer was
   initially stopped and retained as mode-0600 `release.oci.tar.partial`.
   After the owner verified sudo, transfer was resumed over SSH under
   `transfer.lock`, after verifying the existing 13,578,240-byte prefix hash.
   The post-shutdown resumption is now complete and fully checksum-verified
   (see completed-upload receipt above); only owner sudo import is pending. The guarded
   owner command waits for the transfer lock and verifies SHA-256
   `ab27fa249c2bb2916fc45f6ed5d589c0a292244724836f1ad9bcf12db07660bf`
   and length **381,444,096 bytes**, then imports with authenticated sudo and
   verifies the manifest identity. The script also accepts the full `.partial`
   archive if an unavailable fresh Keychain/SSH session prevents the final rename;
   the complete-byte checksum remains mandatory. No k3s image import or workload mutation occurred.
   GHCR remains unavailable (403 requiring `read:packages`); no registry path
   was used and no shared credentials or visibility settings were changed.
3. **Independent recovery NOT RUN:** FileVault remains On; workstation free
   space was 28,869,484,544 bytes (~26.89 GiB) before the new build. It is a
   physically independent candidate relative to the server. Final post-build
   free space is 24,022,310,912 bytes (~22.37 GiB), only ~2.37 GiB above the
   20-GiB reserve; require the runbook size/headroom check before any download. Independent key custody and scheduled availability
   remain unverified. There is no deployed trial or server backup to restore.
   An isolated application restore was therefore **NOT RUN**; local image
   smoke and phone-file copies are not a disaster-recovery claim.
4. **Remaining physical checks blocked:** read-only device access works and
   revealed a real persisted original plus a matching local HTTP upload receipt
   (details below). Native UI access reported the Mac locked; the subsequent
   phone relaunch was explicitly denied because the **iPhone was locked**.
   Permission branches, twenty offline photos, successful termination/reopen,
   account-isolation scenarios, interruption/retry and public HTTPS/gallery
   checks remain **NOT RUN**. Unlock was requested; no result was invented.

**Kubernetes access works.** Only explicit kubeconfig
`~/.kube/netcup-k3s-admin-direct.yaml`, context `netcup-k3s-direct`, was used.
The node reports `159.195.30.113`; direct-origin verified HTTPS for `rruge.com`
returns 200, and new-host HTTP reaches the edge (308). These establish the
existing origin, not HandoverTrack application readiness. Capacity/pressure
checks and the five existing-host health checks pass; DNS is the sole failing
preflight check. Initial resumed measurements: 5,935m CPU requested,
6,562,332,672 bytes memory available, 313,389,043,712 bytes filesystem free,
and 29,424,299 free inodes.

**No existing HandoverTrack certificate is required to create its first route.**
The runbook and Caddy comment now explicitly order origin/DNS and internal
service checks → guarded additive route → first certificate issuance → verified
HTTPS. The owner-authenticated import of the completed SSH archive,
rather than missing first-use TLS, gates this bootstrap. A fresh preflight at
16:09 CEST passed **every check**, including the now-refreshed local DNS resolver
(`.local/task05-before-import-preflight.json`). Recheck before bootstrap. Full (strict) and proxy/cache configuration remain NOT RUN.

## Reviewed committed source and rebuilt artifact

- Starting checkout was clean at `b71e8b5` (Task 05 preparation already committed).
- Reviewed release source commit:
  `ba2ecc8d8040eda6e5d57bf73d6d17e90a4d2337`.
- `release.py` already imported `time` in the starting commit. The reviewed
  version makes that import explicit and tests the full guarded apply branch,
  including calls to `time.time()`. It also refuses Python `-O` and a policy
  not owned by the operator or accessible to other users.
- Build input was `git archive` of that exact commit, with its full SHA as the
  OCI revision label. No working-tree files, credentials or originals were used.
- Immutable image identity:
  `handovertrack.local/runtime@sha256:125cd8a42f0bb92bf87251d40c4cc14c561ab27e0f00911205e000856d66d7cc`.
- OCI config digest:
  `sha256:1dea15fee1d5be927dc3fe3af69af694806fbda37e08dd82b3f77d22b17b9a6d`.
- Platform `linux/amd64`, runtime UID/GID `1000:1000`; manifest, config and every
  layer hash verified. Docker RepoDigest and exact revision label verified.
- Archive `.local/task05-release-ba2ecc8d8040.oci.tar`; build, smoke, metadata and
  verification receipts share that prefix. This is **local only**, not imported
  or published. The old `task05-candidate` image/archive is retained, unused.
- Exact immutable release rendered to `.local/task05-resume-release.json` and
  accompanying `.release.json`; client schema dry-run passed for 25 resources.
  These are proposed resources, **not deployed resources**.

Review covered Docker build/context, rendering/invariants, credential bootstrap,
preflight, release patch guards, backup/writer resumption, network/storage bounds
and additive edge preparation. No release controller/timer was installed.
Seven release-controller tests pass, covering timestamp freshness/future values,
check-only behavior, guarded image changes, failed gates, partial rollout
receipts, policy permissions and disabled assertions. Lint/boundaries,
typecheck, 45 unit tests and contract generation checks pass. New-image smoke
passes isolated nonroot/read-only DB initialization, migrations twice, disposable
provisioning, API/Next readiness, worker heartbeat and private unauthorized HTTP.
This does not claim target-PVC or physical HTTPS validation.

The new complete Caddy candidate is `handovertrack-edge-1da2a23b2acc`, prepared
from the unchanged live `erdhairdesign-edge-497262a88fcc` config. Its complete
validation passed with live pinned Caddy 2.11.4; candidate ConfigMap and additive
network policy server dry-runs passed. No patch was applied. Initial local
validation with every capability dropped failed to execute Caddy's file-capability
binary; bounded local validation with `NET_BIND_SERVICE` succeeded, with no
network/host ports. No cluster pod was used. An initial Docker verification
assertion assumed the legacy config-based image ID; this Docker uses manifest
IDs. Verified RepoDigest, OCI blob hashes and source label establish identity.

## Newly observed physical evidence (local HTTP only)

Read-only copies of the paired phone's Documents were taken into fresh private
`.local/task05-resume-phone-*` directories. SQLite remains version 4 and passes
`integrity_check`; it now contains one scope/project/assignment, one saved local
original and one queue entry, with no orphan entries.

- Original: **4,455,595 bytes**, SHA-256
  `ba333a2172c3f2847ab92f7e2173fe564706b9d15d93ddd167cafa9448b1a545`.
  Phone manifest, SQLite, copied JPEG and local server original hashes agree;
  the JPEG decodes. The camera permission/shutter UI was not directly observed.
- Phone queue: `server_accepted`, one attempt, 4,455,595 bytes sent; local server
  accepted at `2026-09-21T13:30:46.649Z`. Matching account/media receipt and
  original prove one phone-to-local-server acceptance, not HTTPS or retries.
- The existing local job was pending. An owned compiled worker processed it
  once to `ready`; the worker was then stopped gracefully. Three WebP outputs
  (`thumb` 320×306, `preview` 768×737, `report` 2048×1965) match their database
  hashes/dimensions and decode. Exactly one accepted and one ready event exist.
  Original bytes and acceptance timestamp remain unchanged.
- `devicectl --terminate-existing` relaunch failed with iOS `Locked` denial.
  Post-attempt read-only copying still verifies the same original and healthy
  SQLite v4. Successful reopen/queue recovery and visible gallery remain
  **NOT RUN**; unlock and relaunch are required before continuing these checks.

Evidence: `.local/task05-resume-{physical-evidence,local-server-receipt,
local-processing}.json`, device logs, and private phone copies. No phone erase,
uninstall, reinstall, SQLite downgrade or original deletion occurred. Existing
LAN API configuration was retained; no public-origin phone build was installed.

## Preservation and continuation

`.env`, Compose configuration and migrations 001–004 retain their baseline
hashes and modes. Existing databases and originals are preserved; the only
intentional local business-data transition was processing the already accepted
photo into its normal immutable derivatives/events. Disposable smoke containers
used unique names and tmpfs; only their owned containers/networks were removed.

The shared edge Deployment spec remains equal to the resumed baseline; its
live Caddyfile hash remains
`497262a88fcc6c097829f3eb3321e92286ca639a828cdfd404b77739b013fda8`.
Rrugë pod names/restart counts remain unchanged. Existing-host checks for
`rruge.com`, `mendmania.com`, `typechars.com`, `virtualboardzone.com` and
`tregubio.com` pass. Final reports are `.local/task05-resume-preflight-final.json`
and `.local/task05-resume-final-preservation.json`.

Resume when sudo authentication is available for the authorized SSH OCI import and local DNS has refreshed; recheck capacity
and current edge resourceVersion, then follow the ordered bootstrap, internal
validation and guarded edge procedure. The current candidate patch is a saved
review artifact, not permission to ignore a future concurrency conflict. Verify
workstation recovery-key access, take a consistent independent backup and perform
the isolated application restore. Preserve phone pending data and finish native
checks. Keep **disposable-only** until recovery and native gates pass. No paid
service was introduced, no source was pushed by this resume, and **stop before
Task 06** remains in force.

## Original preparation record (historical)

## Source and preservation

Started clean on `codex/upload-and-preview`, HEAD
`1d58cf489ade8fcea5206e02cd54c0edeaeff48e`, tracking its
published origin branch. Fetch showed PR #2 MERGED and origin/main at
`938478b5a7c3cbc62b0519b0cf102fd45d648e23`. Created `codex/k3s-trial` from that
merged main. At the original handoff, Task 05 edits remained uncommitted and no
push or PR had been created. The owner subsequently requested a dedicated
Task 05 commit, branch push and PR to main. This publishes preparation only;
the deployment blockers and incomplete release gates remain unchanged.
No applicable AGENTS.md existed in this checkout or its ancestor
chain. Rrugë deployment/edge/controller/recovery files were read as conventions.

`.env` remains byte-identical to its initial SHA-256 and mode 0600. Existing
Compose DB/volumes, development media, credentials, app identity and originals
were preserved. SQL migrations 001–004 were not edited. Test commands used their
existing isolated test DB/media fixtures; browser-generated development fixtures
remain as in prior tasks. New container smoke fixtures had unique owned names,
no host ports and tmpfs storage; only those disposable containers/networks were
removed. No global cleanup or shared workload restart occurred.

## Inherited physical-device attempt, first

Paired iPhone 17 Pro Max, CoreDevice
`BD3C3B6A-B13E-5D99-9A4D-ED9AC2BC2467`, remained reachable. Reused the verified
existing local Apple Development identity/team/profile through temporary build
arguments, without provisioning downloads or changing account/signing settings.
The Task 04 source Release build was installed **in place** over Task 03 and
launched with `com.gementis.handovertrack`. No uninstall, erase or downgrade.

The temporary public build override was `http://10.10.1.209:7331`, matching the
actual en8 LAN address. An owned API process bound only that LAN address/port;
its `/health/ready` returned 200. Device-to-LAN connectivity itself was not
observed through app interaction. That API process was stopped at handoff.
Use a new reachable origin when continuing; do not change saved `.env`.

Login follow-up: the owner requested test-account credentials, and the same
temporary LAN API was restarted after verifying the address and readiness.
This does not constitute physical login/capture/upload validation. Credentials
remain only in private local configuration, not this handoff.

Read-only copying/inspection of the phone's Documents/SQLite observed
`user_version=4` and all seven current cache/media tables with zero rows.
The same database filename remains `handovertrack-projects-v1.db`. No captured
originals existed in the observed Documents listing. Empty tables do not prove
preservation under a populated capture queue or camera/native transport.

| Physical check | Result |
|---|---|
| Current Release build/install/launch without erase | PASS |
| Existing phone SQLite database upgraded to version 4 | PASS; observed empty DB |
| Permission allow/deny/cancel/Settings return | NOT RUN |
| Twenty actual offline photos / airplane mode | NOT RUN |
| Captured-original termination/reopen preservation | NOT RUN |
| Captured-photo account/org/logout/revocation isolation | NOT RUN |
| Native binary upload interruption/lost reply/retry | NOT RUN |
| Physical HTTPS capture-to-gallery | NOT RUN |

Evidence: `.local/task05-device-{build,install,launch,files,api}.log`,
`task05-device-files.json`, and private copied `task05-phone-sqlite/`.

## Actual live preflight

Used only explicit kubeconfig `~/.kube/netcup-k3s-admin-direct.yaml`, context
`netcup-k3s-direct`. The workstation default is an unrelated context and was
not used or changed. Kubernetes read access worked; SSH did not.

| Observation | Measured result |
|---|---|
| Node | `netcupmaniaserver`, Ready, amd64, Ubuntu 22.04.5 |
| Kubernetes/runtime | v1.35.7+k3s1 / containerd 2.2.5-k3s2 |
| Allocatable CPU / RAM | 8 cores / 16,371,020 KiB (~15.61 GiB) |
| Live usage sample | 717m CPU, 9,714 MiB memory; usage varies |
| Existing requests | 5,935m CPU / 6,608 MiB memory |
| Existing limits | 35,850m CPU / 32,498 MiB memory; already overcommitted |
| Available memory sample | 6,476,361,728 bytes (~6.03 GiB) |
| Disk available / capacity | ~313.43 GB / 539.93 GB (~291.9 / 502.85 GiB) |
| Free inodes / total | 29,424,314 / 33,488,896 |
| Node pressure | Memory/Disk/PID all False; no node events |
| Local-path root | `/var/lib/rancher/k3s/storage` |
| Default StorageClass | `local-path`, Delete, WaitForFirstConsumer; unchanged |
| Existing retained examples | `rruge-local-retain`, `erdhairdesign-local-retain` |
| Initial capacity gate | PASS for the bounded proposed trial, not a load/HA guarantee |

Measurements use metrics-server and kubelet stats (including image filesystem),
not PVC requested sizes. Initial storage semantics on a HandoverTrack volume
remain NOT RUN because no volume was allocated. Proposed reserve is 20 GiB;
preflight requires 40 GiB free, 1M free inodes, 4 GiB available RAM and 1.5 CPUs
unrequested. A namespace quota and bounded process limits protect the trial;
node-local requested PVC sizes do not enforce a disk quota.

Shared edge is `edge-caddy/edge-caddy`, pinned Caddy 2.11.4, admin endpoint off,
existing 80/443 ownership and retained certificate/config volumes. Selected
immutable ConfigMap remains `erdhairdesign-edge-497262a88fcc`; Caddyfile SHA-256
`497262a88fcc6c097829f3eb3321e92286ca639a828cdfd404b77739b013fda8`.
The complete Deployment spec was equal before/after. No current hostname block
mentions HandoverTrack. Rrugë's five pods retained the same names and zero
restarts. HTTP checks returned 200 before/final for `rruge.com`, `mendmania.com`,
`typechars.com`, `virtualboardzone.com` and `tregubio.com` (the actual hair-site
hostname). An initial Python urllib check hit frontend access filtering and an
incorrect inferred hair hostname; corrected curl checks use observed routes.

Evidence: `.local/task05-node-stats.json`, `task05-preflight{,-final}.json`,
`task05-edge-{deployment,final}.json`, `task05-edge-Caddyfile`,
`task05-rruge-final.log`. These private local snapshots are not committed.

## Prepared resources, artifact and operations

- `infra/docker/Dockerfile`: digest-pinned Node 24.21.0 / pnpm 10.32.1,
  native-platform compilation and separately installed amd64 native runtime
  dependencies. Runs UID 1000; no credentials/originals in the build context.
- `infra/kubernetes/base` + trial Kustomize overlay: 25 dedicated resources,
  restricted namespace, nonroot/read-only apps, no mounted API token, default
  deny plus exact DNS/edge/app/DB traffic, separate Retain DB/media PVCs,
  internal Services, resource quota and bounded migration Job. Runtime settings
  use HTTPS and the same `/media` mount/node for API and worker.
- `scripts/ops`: read-only preflight, deterministic manifest rendering/invariants,
  immutable release rendering, create-only Secrets, init SQL roles, image smoke,
  filesystem/decode probe, checksum inventory, consistent backup download and a
  guarded schema-compatible image release controller. Backup/controller execution
  against k3s remains NOT RUN. Controller is prepared, not installed; automated
  pull trigger/CI publication is not enabled without verified artifact access.
- `infra/edge`: additive hostname fragment and separate narrowly selected egress
  policy. `prepare-edge.py` preserves the live complete config, creates a unique
  immutable candidate and emits resourceVersion + old-reference guarded patch.
  Full Caddy validation and two server dry-runs pass; no patch was applied.
- Worker optionally writes a private heartbeat file for deployment liveness;
  local behavior is unchanged when no file is configured.
- [Deployment runbook](../../infra/kubernetes/README.md) includes ordered
  bootstrap/provisioning, storage/authorization/streaming checks, resource limits,
  migration compatibility, monitoring, release policy and guarded edge/image
  rollback. [Recovery runbook](../../infra/kubernetes/RECOVERY.md) preserves
  originals/auth/jobs/config/secrets and describes independent isolated restore.

Final locally built OCI artifact:

- Platform `linux/amd64`; local tag `handovertrack.local/runtime:task05-candidate`.
- Manifest digest
  `sha256:bba355fcd8b382e32fdba8d64946178f1a3c64113599ff44a3add7d28a37e4ad`.
- Archive `.local/task05-image-final.oci.tar`, approximately 364 MiB.
- Metadata `.local/task05-image-final.json`; source label
  `938478b5a7c3cbc62b0519b0cf102fd45d648e23-task05-working-tree`.
- This is a local immutable validation artifact, **not published/imported or
  bound to an approved Task 05 commit**. Commit/rebuild/verify the exact reviewed
  release before promotion. There is no live release identity or rollback image.

No new SQL migration is necessary: the Job applies reviewed 001–004, checks
checksums and serializes concurrent migration attempts. Upgrades need a compatible
maintenance window. Rollback changes only schema-compatible application images;
never restore an older DB over new evidence or downgrade the phone database.

## Validation results

| Check | Result / scope |
|---|---|
| Frozen install, lint/boundaries, typecheck, contracts | PASS local |
| Unit tests, foundation HTTP/SQL, sync regressions | PASS local |
| Build, compiled API/worker smoke | PASS local |
| Twenty-photo media failure/authorization/job scenario | PASS local synthetic; not camera |
| Browser gallery journeys | PASS local |
| Expo dependency check/export/client-bundle scan | PASS local |
| Worker heartbeat update lint/typecheck/build/smoke | PASS local |
| Manifest render/invariants + Kubernetes client schema dry-run | PASS preparation |
| Complete Caddy config validation | PASS local, exact live pinned image |
| New edge ConfigMap + network rule API server dry-run | PASS; no resources created |
| Final amd64 container smoke | PASS local with external HTTP probes; isolated PostgreSQL roles, migrations twice, provisioning, API/Next, worker heartbeat, unauthorized private response |
| Two 50M-pixel decodes, no-replace hardlink, file/directory fsync | PASS local bounded container; ~582 MiB peak RSS in initial sample, 965 ms decode; not target PVC evidence |
| Initial emulated Next build | FAIL attempt (QEMU SIGSEGV); fixed by native build stage, final build PASS |
| Final image in-container HTTP probe attempts | FAIL under QEMU (stalled extra Node probes); bounded external HTTP probes match Kubernetes readiness and passed |
| Initial local PostgreSQL smoke | FAIL attempt (bind-mounted script lacked execute permission); corrected executable script, final smoke PASS |
| DNS/public hostname and direct-origin TLS readiness | FAIL; exact blockers above |
| Existing sites before/final and unchanged edge spec | PASS live read-only |
| Live shared API/worker volume and Linux target filesystem | NOT RUN |
| Live streamed HTTPS upload/private-response/authorization checks | NOT RUN |
| Live pod restart persistence / stale lease recovery / cross-app denial | NOT RUN |
| Live queue/disk/backup alert behavior | NOT RUN |
| Physical HTTPS camera-to-gallery | NOT RUN |
| Independent encrypted backup and isolated restore | NOT RUN |

Logs are under ignored `.local/task05-*`. The complete original command result
list is `task05-check-results.log`; final container/build/decode results are
`task05-image-final-build.log`, `task05-image-final-external-probe.log` and
`task05-storage-final-local.log`. Failed attempts are retained separately in
`task05-image-final-smoke{,-retry}.log`.
Backup scripts/runbooks are prepared, not an executed recovery claim.

## Costs and continuation

No paid service, registry plan, paid runner, storage purchase or visibility
change. Existing workstation CPU/disk/network/operator time were used; no new
cluster capacity was allocated. Existing Rrugë workloads, routes, volumes and
credentials were preserved.

Resume Task 05 with working HandoverTrack DNS access and an authorized private
artifact or server-import path. Recheck capacity, verify the prepared image/SQL,
then follow the scoped rollout and live validation procedures. Keep disposable
accounts/evidence only until both native and independent restore gates pass.
The [Task 06 prompt](../prompts/06-checklists.md) is prepared from current code;
Task 06 was not started and this blocked handoff does not waive its dependencies.
