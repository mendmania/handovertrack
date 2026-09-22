# HandoverTrack — finish Task 05 native failure and recovery validation

Resume Task 05 on the existing disposable HTTPS trial. This assignment authorizes
scoped native failure validation, focused fixes and existing backup verification.
Task 06 is not assigned. Preserve the ongoing working tree, live release, phone
data, configuration and all source/backup/rehearsal resources.

## Read current evidence before acting

Read repository instructions, git status/branch/log, README,
docs/implementation-status.md, the CURRENT section at the top of
docs/progress/05-k3s-trial.md, its linked evidence manifests, and
infra/kubernetes/README.md plus RECOVERY.md. Historical instructions to keep an
assignment revoked, resume a worker or repeat bootstrap are superseded.
Inspect actual state before operating; never overwrite another operator's change.

Recorded checkpoint, 2026-09-22:

- HTTPS is live at https://handovertrack.com, DNS-only. Source namespace is
  handovertrack, explicit context netcup-k3s-direct; the default workstation
  context is unrelated. Runtime source remains
  ba2ecc8d8040eda6e5d57bf73d6d17e90a4d2337, image
  handovertrack.local/runtime@sha256:125cd8a42f0bb92bf87251d40c4cc14c561ab27e0f00911205e000856d66d7cc.
  Later edge/operator-tool revisions are separate from the runtime release.
- Camera permissions, twenty offline captures, offline reopen, pending-photo
  revocation, account/org isolation and return-to-owner rebootstrap passed.
  Owner-observed UI and agent-observed USB/SQLite/hash evidence are distinguished.
- The phone preserves 23 originals/accepted receipts: 22 current North-worker
  photos plus one earlier local-HTTP photo under another owner. The server has
  25 accepted originals/ready jobs and 75 variants. New-cohort uploads completed
  on attempt 1; they did not exercise native interruption or lost responses.
- Test assignment is active at v5 following the owner's action. Source worker,
  API and web are Ready; no assignment restoration or worker resumption is owed.
- Fresh backup handovertrack-20260922T112734Z-54ce2f and isolated application
  restore cover all 25 server originals, 75 derivatives, 125 media paths and all
  18 public tables. The older local-HTTP phone original is outside server backup
  coverage and remains preserved locally. Twelve focused operator tests passed.
  All three rehearsal controllers are stopped; their resources are retained.
- Open gates: controlled native stream interruption, app restart during upload,
  retry/lost completion response, independently accessible backup/key custody,
  access after Mac loss, and accepted backup responsibility/cadence.

## A. Prepare controllable native failure tests

1. Record current baseline IDs/hashes, ownership, queue receipts, assignments,
   process state and server health. Reuse passing evidence; do not ask for another
   twenty-photo batch or rerun passed checks without a new reason.
2. Inspect apps/mobile/src/capture/native-upload.ts and
   apps/mobile/src/media/upload.ts before selecting failure controls. Plan a
   small NEW disposable-photo cohort, normally one distinct ID per failure case.
   Never reset accepted rows or delete receipts to force existing photos pending.
3. Prepare and verify the controls BEFORE asking the owner to reconnect/capture.
   Previous transfers finished before interruption; an attempt counter or a
   guessed delay is insufficient proof that the intended failure happened.
   Keep the phone offline until the new IDs and fault controls are ready.
4. Prefer scoped native transport cancellation and a development-only test seam
   if deterministic timing requires one. Any seam must be explicit, disabled by
   default, limited to named NEW IDs and one armed case, and preserve normal
   authorization, ownership, TLS and immutable-byte verification. Keep the actual
   native binary transport and real HTTPS API. Never record credentials.
   Do not change shared Caddy/network policy, expose a production failure endpoint
   or affect other applications to inject a fault.
5. If a special native build is needed, reuse verified signing and install in
   place only after confirming database/backend compatibility. Preserve originals,
   receipt state and the previous signed build. Identify the test build and
   distinguish it from the default runtime. Restore normal compatible app
   configuration afterward without erase, schema downgrade or permanent fault hooks.

## B. Execute three distinct physical cases

Coordinate one short phone action at a time with the owner and correlate native
transport, SQLite and server evidence. Each case needs its own timing proof:

1. **Interrupted binary stream:** verify a real native upload started and was
   interrupted with positive but incomplete transferred bytes, before acceptance.
   Preserve original bytes and queue identity. Reconnect/retry with the same
   media/session identity and obtain one server acceptance. Record the observed
   partial-transfer evidence; cancellation before dispatch or after full delivery
   is a different result.
2. **App termination during upload:** establish unfinished native work, terminate
   the app, then reopen and reconcile durable state. Verify the existing ID/session
   resumes or discovers acceptance without duplicate assets. Document whether the
   server accepted before or after termination; do not guess from the UI alone.
3. **Lost completion response:** prove the server committed acceptance while the
   native executor did not record/deliver its acceptance receipt, then restart or
   retry and reconcile the same accepted asset. A rejected completion request,
   lost PUT response or worker pause does not establish this case. If a native
   seam discards a successful completion result before the executor receives it,
   label it controlled response-delivery loss, not observed radio loss.

For every new ID verify unchanged local hash/owner, one accepted server asset,
one logical processing job, one accepted/ready event pair and three valid decoded
derivatives. Worker attempts may vary without duplicating the logical effect.
Verify late progress/recovery cannot move accepted state back to pending.
All pre-existing 23 phone originals and 25 server originals must remain intact;
expected totals are baseline plus the actual new IDs, never a reset target.

Record PASS/FAIL/NOT RUN separately for actual native behavior, owner observation,
test-seam delivery loss and synthetic tests. If phone interaction is unavailable,
retain the named gap and continue independent documentation/recovery work.
Fix reproducible defects and run affected regressions. A live runtime/schema
change must follow the reviewed immutable release and compatibility procedure;
do not patch running containers or redeploy HEAD merely to align documentation.

## C. Resolve the operational recovery decisions

Ask for owner confirmation of these distinct facts, without requesting keys,
passwords, tokens or secret contents:

- Where/how the FileVault recovery credential is independently accessible.
- How actual backup BYTES can be accessed if this Mac is lost/unavailable.
  A recovery key cannot recreate missing bytes. Confirm an existing authorized
  location/access path before copying secret-bearing backups anywhere.
- Who accepts backup responsibility, what cadence they accept, when the Mac is
  available, and what happens after a failed/missed run. RECOVERY.md proposes
  manual backup after each test session and before release; this is not yet an
  owner-accepted commitment or an unattended schedule.

Use existing resources and maintain encryption/access controls. No paid storage,
new external destination, scheduled automation or outbound notification is
implied. Missing owner decisions remain explicit; another same-Mac restore does
not close an independent-access or responsibility gap.

After adding test photos, take a fresh verified backup where capacity permits
and record exact ID/hash coverage with the repaired bounded-transfer tooling.
Preserve previous successful and failed attempts. The prior full-batch application
restore stays PASS; do not allocate a fourth full rehearsal merely to repeat it.
Repeat application restoration only when new tooling/schema changes, failed
integrity checks or a specific unresolved concern justify it, with a scoped plan
that preserves source and retained rehearsals. Distinguish verified backup
coverage from application restoration of that exact new snapshot.

## Finish and stop

Remove/disarm only controls introduced by this test. Restore only test-owned
state using current-version guards, and verify normal app behavior and healthy
source workloads. Preserve existing photos, secrets, backups and Retain PVCs.
No Cloudflare proxy switch, bootstrap/seed replay, source reset or Rrugë change.

Update Tasks 03/04 follow-up evidence, the current Task 05 checkpoint, status and
prepared Task 06 prompt. Include actual fault mechanisms, new IDs/counts, before/
after identities, backup coverage, accepted owner decisions and smallest remaining
gaps. Mark required checks honestly; retain implemented-awaiting-validation and
disposable-only while native/recovery gates remain unresolved. Do not invent an
unattended backup/alert PASS. Stop before Task 06 and customer intake.
