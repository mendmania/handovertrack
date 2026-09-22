# Task 05 — live disposable k3s trial

**Status: deployed over verified HTTPS; technical backup/restore rehearsal PASS;
physical camera and independent recovery-key gates incomplete. Disposable-only.**
Updated 2026-09-22. [handovertrack.com](https://handovertrack.com) is live on the
existing VPS. Task 06 has **not** started. No customer/real-evidence intake is
approved. This checkpoint supersedes all historical blocked/bootstrap entries
below; preserve them as the investigation trail.

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
  projects were provisioned. Three synthetic accepted originals now have three
  ready jobs, nine variants and exactly one accepted/ready event per original.
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
succeeded. No SQLite downgrade, erase, original deletion or new phone upload was
performed. The previous accepted physical photo remains evidence of local HTTP
upload only, not upload to this trial.

**NOT RUN:** directly observed camera permission/shutter branches, twenty
physical offline captures, physical interruption/retry and account isolation,
and physical HTTPS camera-to-gallery. iPhone Mirroring requires the owner's
Mac-password unlock; the owner was asked to unlock it without sharing a password.
Do not mark these complete from synthetic tests or successful installation.
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
`final-health` and `final-resources-20260922`. Secrets/cookies/edge keys remain
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
