# Recovery rehearsal (technical application restore verified)

The active trial must contain disposable test evidence only. Source backups and
restore rehearsal PVCs are retained until reviewed; no original cleanup/prune
is part of this procedure. Never restore into the active database/PVCs.

## Target and consistent backup

An independent target must survive loss of `netcupmaniaserver`. The workstation
has FileVault enabled; the resumed 2026-09-21 inspection measured approximately
26.89 GiB free before the committed-image rebuild (initial inspection: 36 GiB).
After the build, 24,022,310,912 bytes (~22.37 GiB) remained, leaving only
~2.37 GiB above the required reserve. Re-measure immediately before downloading
and require the database/media size headroom check. It is a candidate for
bounded encrypted downloads using existing hardware. This
is not proof of independent recovery-key custody, ongoing availability or a
successful restore. The server's existing Restic/R2 allowance and credentials
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
custom-format PostgreSQL dump plus full gzip-compressed media archive and SHA-256 inventory,
compares downloaded file hashes with the source inventory, and saves the five
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
6. Stream `media.tar.gz` into the new media helper's `/media` mount with
   `tar --no-same-owner --no-overwrite-dir -C /media -xzf -`, only after reviewing the archive has
   relative regular-file/directory entries, no traversal, symlinks or devices.
   Preserve the provisioner's existing PVC root ownership/mode; the nonroot
   helper must not try to change that directory's timestamps or permissions.
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

The operator script now writes `media.tar.gz`: uncompressed exec-stream downloads
were truncated and correctly rejected by archive/hash checks; gzip transport
passed full verification. Hardlinks are still complete regular files in the
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
