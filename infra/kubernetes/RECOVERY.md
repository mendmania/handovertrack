# Recovery rehearsal (technical application restore verified)

The active trial must contain disposable test evidence only. Source backups and
restore rehearsal PVCs are retained until reviewed; no original cleanup/prune
is part of this procedure. Never restore into the active database/PVCs.

## Latest full-batch restore — 2026-09-22

**PASS, agent observed.** `handovertrack-20260922T112734Z-54ce2f` restores 25 originals, 75 variants, 125 media paths and matching hashes/counts for all 18 public tables into `handovertrack-restore-20260922c`. Saved sessions, access denials, manager downloads and the ready gallery pass.

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

The two rejected full-batch download attempts remain retained without receipts.
The successful archive uses verified 4-MiB reads with up to three attempts of the
same range. For this larger rehearsal, extraction used groups of regular entries
up to 8 MiB (uncompressed), each with its own verified NUL member list and the
GNU tar flags below. No archive directory/PVC-root metadata was extracted. The
private rehearsal script and transfer-group evidence are retained under
`.local/task05-batch-recovery-20260922/`. Final full inventory comparison verifies
all 125 paths; the original backup archive is unchanged.

Independent backup/key access after Mac loss and accepted operational responsibility
remain unconfirmed; the manual procedure below is still proposed. Technical
restore PASS does not remove the disposable-only restriction.

## Owner-decision follow-up — native fault preparation, 2026-09-22

The owner was asked separately about independent FileVault recovery credential
access, actual backup bytes accessible after loss of this Mac, and accepted
operator/cadence/availability/failed-or-missed-run response. The reply “xontinue”
authorizes continuing validation work; it confirms **none** of those arrangements.
All remain **UNCONFIRMED**, including any authorized external backup destination.
No secrets were requested, no new destination was used and no automation or
outbound notification was created. The manual procedure below remains proposed.

No photos were added during this continuation. All 59 retained recovery files
were hash/mode checked unchanged, including previous successes and partial attempts;
source media still matches the 25-original/75-variant restored batch. No fresh
backup or fourth application rehearsal was necessary or performed. Technical
restore PASS remains the prior measured result, not new Mac-loss-access evidence.

## Target and consistent backup

An independent target must survive loss of `netcupmaniaserver`. The workstation
has FileVault enabled; the resumed 2026-09-21 inspection measured approximately
26.89 GiB free before the committed-image rebuild (initial inspection: 36 GiB).
After the build, 24,022,310,912 bytes (~22.37 GiB) remained, leaving only
~2.37 GiB above the required reserve. Re-measure immediately before downloading
and require the database/media size headroom check. It is a candidate for
bounded encrypted downloads using existing hardware. This
does not by itself prove independent recovery-key custody, ongoing availability
or successful restoration; use the separate rehearsal evidence above. The server's existing Restic/R2 allowance and credentials
were not accessible; do not reuse Rrugë's credentials or assume paid headroom.
An existing separately authorized encrypted target can be substituted after
verifying free bytes, retention budget and how its decryption keys are recovered.
No new service or storage purchase is allowed.

The script also estimates source database and logical media sizes and requires
twice that sum in addition to its 20-GiB reserve before streaming.
Keep at least 20 GiB free on the download target and estimate database/media
archive size before starting; require additional headroom for a restore copy.
Use a mode-0700 directory on the verified encrypted filesystem. `age` is also
already installed on the workstation, but no recovery recipient/key was selected
or invented by this task. If encrypting an archive with age, use an independently
custodied existing recipient and test decryption before calling it a backup.
Never package a decryption private key or encryption password inside its archive.

```sh
python3 scripts/ops/backup.py --kubeconfig "$KUBECONFIG" \
  --target /existing/encrypted/backup-directory --runtime /owned/handovertrack-runtime
```

Run backup and release from **one operator host with the same runtime directory**.
A filesystem lock does not coordinate two hosts. Before using the workstation
while a server controller exists, pause only HandoverTrack automation and wait
for its active operation to finish; retain a single operator until backup and
writer resumption finish. Do not pause Rrugë. No HandoverTrack controller is
installed today.

The script uses the same `release.lock` as image releases, checks namespace
ownership, records replica counts and scales only web/api/worker to zero. It
waits for their pods to terminate so DB/media form a quiescent pair. It mounts
only the owned media PVC in a bounded nonroot read-only helper, downloads a
custom-format PostgreSQL dump plus a full gzip-compressed media archive and SHA-256 inventory.
Media is read in ranges of at most 4 MiB with exact-length checks and at most three
attempts of the same read-only range after transport failure, verified against
each full-file hash, then archived locally as regular files. The source inventory
is rechecked afterward, and the finished archive is independently verified. It also saves the five
named application Secrets, two ConfigMaps and workload identities as private
recovery files. Media hardlinks are archived as ordinary complete files. No
source bytes are removed. Files are mode 0600; no secret values go to stdout.
The finally block removes only its helper and resumes the captured replicas,
using current-replica guards to avoid overwriting an operator's changed scale.
Inspect rollout health after resumption. Abrupt host loss/SIGKILL can bypass
finally: inspect the recorded source counts and deliberately resume owned writers.

A receipt contains `consistent`, `hashes_verified`, timestamps, image and file
hashes. It deliberately does **not** claim independent restore. Keep the
bootstrap recovery file too: it is required to reconstruct DB roles/passwords
and auth signing/session behavior. Preserve auth/session tables, business owners,
media jobs/variants/events, schema_migrations and original hashes together.
Never run seed or migrations over a restored dump merely to silence an error.

## Isolated restore

1. Verify every receipt file hash on the independent target, decrypt there if
   applicable, and inspect `pg_restore --list database.dump`. Record backup age,
   source image/schema contract and expected account/media/job/session counts.
   Save only counts/hashes in the public handoff, never session tokens/passwords.
2. Reserve capacity for a temporary `handovertrack-restore-UNIQUE` namespace and
   two new 4-GiB Retain PVCs. This is additional requested capacity, not a copy
   of the source claim. Inspect all existing rehearsal PVCs before allocating
   another pair. Keep source resources untouched.
3. Copy only the reviewed namespace, service account, default-deny/DNS/database
   policies, database Service/StatefulSet, init ConfigMap, two PVC definitions
   and a nonroot media helper from the prepared manifests. Rewrite metadata
   namespaces and **every network namespaceSelector** to the unique restore
   namespace. Label every resource `handovertrack.com/rehearsal=UNIQUE` and keep
   Pod Security restricted. Do not create public routes, Ingress, NodePort,
   Deployments selected by source Services, or public DNS. Use new PVCs and
   empty PGDATA. The production namespace default-deny must remain unchanged.
4. Copy required recovery Secret values privately into the restore namespace,
   stripping old metadata UIDs/resourceVersions/managedFields. Database URLs
   use local `database:5432`, so they resolve to the isolated database Service.
   Preserve the original auth secret for session validation. No trial-account
   provisioning runs during restore. Verify generated manifests cannot select
   source namespace resources, then server-dry-run/apply in ordered phases.
5. Let the new database initialize only its empty DB/roles from recovery
   passwords. Refuse restore if `public` already has application tables. Stream
   the archive through the isolated database Pod:

   ```sh
   kubectl --kubeconfig "$KUBECONFIG" --context netcup-k3s-direct \
     -n "$RESTORE_NAMESPACE" exec -i database-0 -- \
     pg_restore -U postgres -d handovertrack --no-owner \
     --role=htrack_migrator --exit-on-error < /private/backup/database.dump
   ```

   Check `$RESTORE_NAMESPACE` matches the unique rehearsal name before executing.
   No `--clean`, reset, drop, source database restore or source PV reuse is allowed.
6. Verify the archive and prepare a NUL-separated list of **regular files only**
   using `scripts/ops/restore-members.py`. Keep this new list in the operator's
   private runtime directory, outside the retained backup. The tool verifies all
   source inventory hashes, rejects unsafe paths/types and duplicate files, and
   excludes archive directory entries, especially `./`.

   ```sh
   python3 scripts/ops/restore-members.py \
     --archive "$BACKUP/media.tar.gz" \
     --inventory "$BACKUP/media-sha256.json" \
     --output "$RESTORE_RUNTIME/media-members.nul"
   kubectl --kubeconfig "$KUBECONFIG" --context netcup-k3s-direct \
     -n "$RESTORE_NAMESPACE" exec -i "$RESTORE_HELPER" -- node -e \
     'require("fs").writeFileSync("/tmp/restore-members.nul",require("fs").readFileSync(0),{flag:"wx",mode:0o600})' \
     < "$RESTORE_RUNTIME/media-members.nul"
   kubectl --kubeconfig "$KUBECONFIG" --context netcup-k3s-direct \
     -n "$RESTORE_NAMESPACE" exec -i "$RESTORE_HELPER" -- \
     tar --no-same-owner --no-overwrite-dir --no-recursion --null \
       --verbatim-files-from -C /media -xzf - -T /tmp/restore-members.nul \
     < "$BACKUP/media.tar.gz"
   ```

   Use these GNU tar options in the pinned Linux helper, not macOS tar. Verify
   the new target has no media files before its first extraction. Selecting only
   files lets tar create their parent directories without selecting the PVC root.
   `--no-overwrite-dir` alone was insufficient: the 2026-09-22 rehearsal still
   attempted to chmod the provisioner-owned root and returned exit 2. Preserve
   its ownership/mode and record metadata before/after extraction. For a partial
   extraction, first verify **every** existing path/hash. Only if they all match,
   resume with the same verified member list and `--skip-old-files` replacing
   `--no-overwrite-dir`; never combine these mutually exclusive options. Do not
   rerun `pg_restore` into an already restored database.
   Recompute `media-inventory.mjs` in that helper and compare **every** path/hash
   with `media-sha256.json`. Check accepted `media_uploads.id/sha256/size`
   against `<id>/original.jpg`, organization/project/account foreign keys, and
   `media_variants` against immutable `v1-*.webp` checksums/dimensions.
7. Compare schema_migrations checksums, owners/memberships, auth user/session
   counts, acceptance timestamps and job/event counts with the snapshot.
   Run an isolated API/worker from the exact saved image with only restore
   namespace credentials, volumes and internal Services. Keep edge ingress
   denied; access through loopback port-forward only. A test session saved
   before backup must remain valid under the original secret; foreign owner
   and organization access must remain denied. Do not expose raw tokens.
8. Confirm pending/expired leased jobs recover without duplicate acceptance,
   events or derivatives; completed jobs retain their immutable outputs.
   Verify ready derivatives decode and gallery counts equal accepted evidence.
   Record duration, peak memory, disk/inodes and all differences. A failed check
   is FAIL, unavailable keys/access is NOT RUN. Do not label a file-download
   round trip alone a successful application restore.
9. Stop only restore API/worker/database controllers, remove ephemeral helper
   credentials and retain labelled rehearsal PVCs/data for review. Do not delete
   the namespace/PVCs/PVs as automatic cleanup. Verify source pods, source
   hashes/receipts and existing public sites remained unchanged/healthy.

PASS requires independent encrypted bytes, accessible separate recovery keys,
an isolated application restore, original checksum/ownership/job/session checks
and unchanged source/existing-site health. Record live evidence in the Task 05
handoff; until then disaster recovery remains NOT RUN.

## Resumed Task 05 recovery status — 2026-09-22

A consistent FileVault-encrypted backup from the deployed disposable trial passed
all 12 media-path/hash checks and was restored to separate Retain PVCs in
`handovertrack-restore-20260922`. The dump, exact runtime image, table hashes,
original/derivative hashes and dimensions, saved-session authentication, tenant
restrictions, gallery and exactly-once expired-lease recovery all passed.
The source stayed intact; its writers are Ready again. Restore controllers are
stopped, its helper removed and its namespace/PVCs/credentials retained privately.
No source database or volume was overwritten and no seed/migration ran over the
dump. See [Task 05](../../docs/progress/05-k3s-trial.md) for exact paths, digests,
resource names, retained failed attempts and evidence.

The operator script writes `media.tar.gz`. Earlier uncompressed exec-stream
downloads were truncated and correctly rejected; gzip transport passed for the
small baseline. The larger physical batch also exposed a truncated gzip stream
on 2026-09-22. That attempt is retained without a valid receipt. Current media
transport uses verified ranges of at most 4 MiB and local archive construction
(`backup_media.py`), avoiding a single long media download. Twelve operator tests
cover successful bounded reads, truncation/corruption rejection, existing-file
protection and safe regular-file extraction. Hardlinks are still complete regular files in the
archive. Compression of this synthetic fixture must not be used to estimate real
photo capacity. Preserve both failed downloads; they have no valid backup receipt.
The nonroot restore preserves provisioner-owned PVC-root metadata. On a partial
extraction, inspect/check every existing path/hash before deciding how to resume;
do not overwrite an unverified file or rerun pg_restore over the existing DB.

**Technical restore PASS; complete DR readiness INCOMPLETE.** FileVault is On and
the workstation is physically independent of the VPS, but independent key custody
and reliable availability/backup scheduling remain unverified. No unattended
backup/alert delivery was demonstrated. Restore peak memory was not measured.
Keep the disposable-only gate until these recovery and physical-native requirements
are satisfied. No new paid service, key or storage purchase was introduced.

## Fresh owner-photo coverage — 2026-09-22 09:05 UTC

The fresh verified backup `handovertrack-20260922T090553Z-ac1227` includes four
accepted originals: the three synthetic fixtures and owner photo
`c305e7a8-13f9-469a-b305-e64116b19061`. All twenty archived media paths match their
inventory. It was restored into new namespace `handovertrack-restore-20260922b`
and separate Retain PVCs; the earlier `handovertrack-restore-20260922` was untouched.
Full table hashes, originals, twelve derivatives, saved sessions, ownership
denials and the four-item ready gallery passed. The root-metadata extraction
failure and verified non-overwriting recovery led to the corrected step 6 above.
See the current Task 05 handoff for receipts, resources and limits. This snapshot
does not cover a new twenty-photo physical batch. Independent key custody,
access after loss of the Mac and operational responsibility/cadence remain open.

Proposed manual operating procedure, pending owner acceptance: the designated
trial operator keeps this FileVault Mac awake, connected and above the reserve,
uses the same `release.lock` runtime directory, and makes a verified backup after
each disposable test session and before a release. Inspect the receipt and writer
readiness before closing the session. A failed/missed backup keeps the new photos
outside verified coverage: pause further intake/release, check capacity and
writer resumption, retain partial attempts, then retry into a new folder and
verify the receipt. No automatic schedule or external notification is configured.
The operator, dependable availability and response timing are NOT RUN/unconfirmed.
FileVault key access alone does not recover backup bytes if this Mac is lost;
an independently accessible copy and tested recovery access are still required.
