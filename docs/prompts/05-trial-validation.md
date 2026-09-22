# HandoverTrack — finish Task 05 native and recovery validation

Resume Task 05 validation on the existing disposable trial. This assignment
authorizes scoped validation using test photos, the existing backup/recovery
tools and isolated rehearsal resources. Task 06 is not assigned. Do not restart
first bootstrap or rebuild the architecture.

## Read the current checkpoint first

Read repository instructions, git status/branch/log, README,
`docs/implementation-status.md`, the current section at the top of
`docs/progress/05-k3s-trial.md`, Tasks 03/04 evidence, and
`infra/kubernetes/README.md` plus `RECOVERY.md`. Historical blocked entries are
an investigation trail, not current rollout instructions. Inspect actual state
before operating; do not assume a recorded process or resource is still current.

Recorded checkpoint, 2026-09-22:

- `https://handovertrack.com` is deployed with DNS-only Cloudflare records and
  verified origin HTTPS. Source namespace is `handovertrack`, on the existing
  `netcup-k3s-direct` context. Always select its explicit authorized kubeconfig;
  the workstation default context is unrelated.
- Runtime source is `ba2ecc8d8040eda6e5d57bf73d6d17e90a4d2337`, using
  `handovertrack.local/runtime@sha256:125cd8a42f0bb92bf87251d40c4cc14c561ab27e0f00911205e000856d66d7cc`.
  Edge and backup tools have separate later revisions. Do not deploy current
  HEAD merely to align it with documentation.
- The phone runs the HTTPS Release build with SQLite v4 and preserved evidence.
  One owner-observed physical photo-to-web test passed. Server verification
  confirmed its original hash/size, one processing job, one accepted/ready event
  pair and all three valid variants. This is a narrow physical PASS.
- Live synthetic failure tests, target filesystem checks, restart persistence
  and a technical independent encrypted backup/application restore passed.
  The successful 08:10 UTC backup predates the owner's 08:30 UTC physical photo.
- Extended native scenarios and independent recovery-key/operational readiness
  remain incomplete. No unattended backup or deployment automation is running.

## A. Complete the remaining physical scenarios

Coordinate direct phone interaction with the owner. Give short ordered actions,
then correlate their observations with the phone's durable data and server
records. Keep owner-observed UI results distinct from agent-observed records.
Device availability, installation, fixtures and simulator checks cannot replace
physical evidence. If interaction is unavailable, record the exact NOT RUN gap
and continue independent recovery/documentation work.

1. Record baseline media IDs/counts, scope, queue receipts and current server
   health without exposing credentials. Existing photos must survive the test.
2. Exercise camera permission denial/cancel/Settings return and successful
   capture. Permission reset must not uninstall the app or erase its data.
3. Download an assigned test project, go offline, and capture a NEW batch of
   twenty distinct disposable photos. Record each stable media ID and confirmed
   saved state. Terminate/reopen offline; verify all originals, gallery entries
   and queue intent survive under the same owner. Query cache reconstruction
   must not depend on remote data or recreate media identities.
4. Reconnect and test native upload interruption, restart and retry. Exercise
   lost completion-response recovery and an owned worker restart with scoped
   controls. Document how the failure was induced; a synthetic-only failure
   test remains separate evidence. Do not change shared Caddy/network policy
   or another application's processes to inject failure.
5. Verify each of those twenty IDs has exactly one accepted logical asset,
   original bytes matching its expected hash/size, one logical processing job
   and all three valid derivatives. Compare to the recorded baseline: the
   checkpoint already contains four accepted originals. Never require the
   entire server to contain only twenty or delete older photos to make it so.
6. Exercise logout/account/org switching, assignment revocation and rebootstrap
   while pending and accepted photos exist. Another scope cannot see or inherit
   them. Revoked pending work stays blocked under its original owner; bytes and
   intent survive. Restore only test assignments changed by this exercise,
   using the real manager APIs so the sync feed records changes.

If a defect appears, reproduce and fix it within Task 05, validate affected
regressions, and document the change. A live application/schema update needs the
reviewed immutable-release procedure and compatibility checks; do not patch a
running container, overwrite an image tag, reset data or downgrade SQLite.

## B. Close recovery coverage and readiness gaps

1. Preserve the existing technical restore PASS and its exact coverage. Take a
   fresh consistent verified backup after the physical tests, with recorded
   media IDs/hashes showing that the owner photo and new test batch are included.
   Recheck target space and the required reserve; do not delete earlier backups
   or evidence to make room. Keep secret-bearing recovery files outside Git.
2. Verify restoration of that fresh batch in isolated resources after checking
   capacity and existing rehearsal state. The stopped
   `handovertrack-restore-20260922` resources must not be overwritten or deleted.
   Source database/PVCs and retained earlier backups remain untouched. Follow
   the corrected gzip/archive and nonroot extraction procedures in RECOVERY.md.
3. Ask the owner to confirm independently recoverable FileVault key/credential
   custody and how they would access the backup after losing access to this Mac.
   Record confirmation, limitations or NOT RUN; never request or display the
   actual recovery key, password or session token. Do not rotate keys or lock
   the device merely to manufacture evidence.
4. Establish a documented feasible backup cadence, operator responsibility,
   workstation availability and failed/missed-backup response using existing
   resources. Do not claim an unattended schedule or alert delivery without
   testing it. Any missing decision stays explicit; this prompt does not invent
   a schedule or authorize external notifications.

## Finish and stop

Update Tasks 03/04 follow-up evidence and the current Task 05 checkpoint, keeping
historical entries intact. Reconcile implementation status, README and the
prepared Task 06 prompt with the actual outcome. Each check is PASS, FAIL or
NOT RUN, with evidence type and limitations. Mark a task complete only when its
required checks pass; unresolved native/recovery gates retain
`implemented-awaiting-validation` and the disposable-only restriction.

Report what passed, remaining owner actions, exact backup coverage and the next
smallest step. Preserve identities, originals, credentials, retained volumes and
Rrugë. No new paid service, Cloudflare proxy switch, bootstrap/seed replay,
automatic deployment, customer intake or Task 06 implementation.
