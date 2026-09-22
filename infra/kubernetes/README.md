# HandoverTrack k3s disposable trial

**Live over verified HTTPS; disposable-only.** The committed immutable runtime
is deployed and the technical independent restore rehearsal passed. Physical
camera/HTTPS scenarios and independent FileVault key custody remain incomplete.
Read the current [Task 05 checkpoint](../../docs/progress/05-k3s-trial.md) before
any live command. Preserve the existing installation and stopped restore volumes;
do not repeat first-bootstrap namespace/credential creation.

The target is the existing `netcup-k3s-direct` context, node
`netcupmaniaserver` (`159.195.30.113`, amd64), namespace `handovertrack`.
Do not use the workstation's default context. No paid service, new storage
purchase, registry visibility change or Rrugë credential is required/authorized.

## Preconditions and budgets

Run `python3 scripts/ops/preflight.py --kubeconfig "$KUBECONFIG" --output .local/preflight.json`.
This is a read-only **first-bootstrap** check. It fails closed on absent DNS,
node pressure, less than 40 GiB disk, one million free inodes, 4 GiB available
memory or 1.5 CPUs of schedulable requests. Recheck immediately before mutation.
The hostname-absent check deliberately needs review after initial activation.
A passing report alone does not verify image access, volume semantics or recovery.

The base follows Rrugë's single-node conventions: restricted namespace, default
deny network policy, nonroot/read-only processes, no service-account token,
ClusterIP services, separate database and media PVCs, a project-specific Retain
StorageClass and Recreate application rollouts. The cluster default is untouched.
API and worker mount the **same** media PVC at `/media` on the selected node.
Web receives no DB/auth credential. Only the migration Job receives the migrator
URL; only PostgreSQL receives admin/bootstrap role passwords. No shared Rrugë
Secret or volume is referenced. Signup remains unreachable.

Steady requests: 400m CPU / 1 GiB RAM. Limits: 3 CPUs / 2560 MiB RAM.
Migration requests add 100m / 256 MiB and limits 500m / 512 MiB.
The namespace quota caps requests at 1.5 CPUs / 2 GiB and limits at 4 CPUs /
4 GiB, eight pods, four PVCs and 16 GiB requested storage. Initial database/media
requests are 4 GiB each; the extra pair is reserved for one recovery exercise.
**local-path sizes are not physical quotas.** Retain is not backup. API reserves
20 GiB actual filesystem free space; initial preflight reserves 40 GiB. Alert and
pause trial intake when media reaches 2 GiB, DB reaches 2 GiB, free space falls
below 40 GiB, free inodes below 1M, failed jobs are nonzero or oldest pending job
exceeds five minutes. Never delete originals to meet the budget.

The trial is **disposable test data only** until physical validation and an
independent encrypted restore both pass. Provision only `.example.test` users
through the offline seed command; do not invite customers or import evidence.
Do not point the trial at a phone account containing real pending evidence.

## Build and immutable artifact

Use the pinned local toolchain and run the README regression commands first.
Run `python3 -m unittest discover -s scripts/ops -p 'test_*.py' -v` for the
release-controller maintenance gates; tests mock Kubernetes and never deploy.
Commit the reviewed release source before promotion (the prepared working-tree
image is for validation, not an approved published release).

```sh
export PATH="$PWD/.tools/node_modules/.bin:$PATH"
SOURCE=$(git rev-parse HEAD)
docker buildx build --platform linux/amd64 --provenance=false \
  --build-arg SOURCE_REVISION="$SOURCE" \
  --tag "handovertrack.local/runtime:$SOURCE" \
  -f infra/docker/Dockerfile --output type=oci,dest=.local/release.oci.tar \
  --metadata-file .local/release-image.json .
```

The multi-stage build compiles on BUILDPLATFORM, then independently installs
pinned target-platform dependencies, including Sharp. No build credentials are
provided. `.dockerignore` excludes private environment, native containers and
originals. The immutable image digest is `containerimage.digest` in the metadata.
Test that image with `scripts/ops/image-smoke.py --image IMAGE_ID` after
`docker load -i .local/release.oci.tar`; this uses disposable tmpfs DB/media and
no host ports. `scripts/ops/storage-probe.mjs` separately measures two concurrent
50-million-pixel decodes and checks fsync/hardlinks on its selected filesystem.

Prefer an already-approved private registry allowance, **without** copying
Rrugë's pull Secret. For private GHCR, create a separate HandoverTrack read-only
image-pull Secret after application credential bootstrap and explicitly add its
imagePullSecrets reference to the reviewed pod templates; the import-based base
has no registry credential. Server-dry-run the resulting release. Otherwise copy the OCI archive to the authorized server and
use its existing administrator's `sudo k3s ctr images import /secure/release.oci.tar`.
Inspect `sudo k3s ctr images list` and verify the exact repository digest and
linux/amd64 configuration. Bind the release to that exact digest, never `latest`.
Do not run a privileged image-import pod or expose containerd to bypass missing
SSH. Do not assume a GitHub repo token grants package access. CI must not receive
kubeconfig, SSH, DB, auth or recovery secrets. Build/import and controller
installation remain blocked until an authorized access path exists.

```sh
python3 scripts/ops/check-manifests.py
python3 scripts/ops/render-release.py --image "$RELEASE_IMAGE" \
  --source "$SOURCE" --output .local/release.json
kubectl --kubeconfig "$KUBECONFIG" --context netcup-k3s-direct \
  apply --dry-run=client -f .local/release.json
```

`RELEASE_IMAGE` is an actual repository@sha256 identity. The base's
`render-only` reference is intentionally not deployable. `render.py` regenerates
the checked-in secret-free Kustomize base; the overlay adds no hidden defaults.

## First bootstrap: ordered maintenance

Only execute after origin ownership, DNS and artifact delivery prerequisites pass.
A certificate for a new hostname is not a bootstrap prerequisite: Caddy obtains
its first certificate after the guarded route is activated. Verify HTTPS after
that rollout, before any public application checks. Acquire the
HandoverTrack `release.lock` using `flock` on the server; use the same lock for
backup/release commands. Do not acquire, stop or rewrite Rrugë's controller.
Save a fresh existing-site health report and shared edge spec/config hash first.

1. Split `.local/release.json` by kind into reviewed phase files. Create only
   Namespace and StorageClass first (server dry-run then create). Refuse an
   already existing HandoverTrack installation; use recovery/release procedures.
2. Run `create-secrets.py --kubeconfig "$KUBECONFIG" --recovery-file
   /existing-encrypted-target/handovertrack-bootstrap.json`. This generates
   independent credentials once, writes mode 0600, then **creates**, never
   applies/rotates, the five named Secrets. It refuses any existing Secret,
   PVC or workload. Preserve the recovery file if a partial API request fails.
3. Server-dry-run, then create the remaining configuration, service account,
   quota, network policies, Services, PVCs and database StatefulSet. Do not yet
   create application Deployments or the migration Job. Wait for
   `statefulset/database` readiness. Inspect PVC/PV node affinity and Retain.
4. Create the source-specific `migrate-SOURCEPREFIX` Job. Wait for Complete and
   inspect its bounded log. It applies immutable checksummed migrations 001–004
   under the existing advisory lock; repeats are safe. No migrations were added
   or modified by Task 05. Migration failure stops bootstrap; never reset or
   downgrade the database. Remove the completed Job only after retaining its
   evidence if it consumes the constrained namespace quota.
5. Run a **non-served** one-shot `provision` Job from the same runtime image,
   with runtime/migration/auth/trial-accounts Secrets, `ALLOW_DEV_SEED=true` and
   `NODE_ENV=development`, executing `node node_modules/tsx/dist/cli.mjs
   packages/db/src/seed.ts`. This explicit disposable-only fixture operation is
   separate from every production runtime container. Restore no real DB here.
   Do not mount trial-account/migrator credentials into the API, web or worker.
6. Run a restricted `backup` helper Pod (same image, UID 1000, node selector,
   media PVC, `MEDIA_ROOT=/media`, 768 MiB memory / 1 CPU) and execute
   `node scripts/ops/storage-probe.mjs`. Save its hashes, free bytes/inodes,
   duration and max RSS. Repeat a small sentinel write from the API and read it
   from the worker once they run; compare its inode/hash, then remove **only**
   the generated sentinel. A tmpfs/local smoke is not evidence about this PVC.
7. Create API/worker/web Deployments, wait for readiness and inspect failures.
   Forward API and web only to loopback for auth/JSON/media checks. Validate
   current memberships, worker/manager differences, unknown/foreign IDs,
   unauthenticated 401, cross-organization 404 and current assignment revocation.
   Test blocked egress to `rruge` from an owned API pod and absent mounted API
   token. No source network policy allows cross-app DB traffic.
8. Apply the additive edge procedure below only after internal checks pass.
   Rebuild the phone for the now-verified `https://handovertrack.com` origin,
   using its existing signing metadata and in-place install. Preserve original
   app data. Never downgrade SQLite v4. A successful install is not camera proof.

Use bounded commands such as `kubectl ... wait --for=condition=complete
job/migrate-SOURCEPREFIX --timeout=300s` and `rollout status deployment/api
--timeout=180s`. Scope all commands explicitly; do not apply a whole bootstrap
base over an existing application or shared configuration.

## Additive public route and TLS

Only `handovertrack.com` is in scope. No www/other DNS record or hostname takeover.
Have Cloudflare's existing zone add a **DNS-only** apex A to `159.195.30.113`.
Verify authoritative and public DNS; no AAAA unless its origin is verified.
Cloudflare proxying is an independent later gate: verify Full (strict), valid
origin TLS and cache bypass for authenticated/auth/API/media before enabling it.

`prepare-edge.py --kubeconfig "$KUBECONFIG" --output-dir .local/edge-UNIQUE`
reads the live Caddyfile, refuses an existing hostname, preserves its complete
bytes and emits an immutable candidate ConfigMap plus a patch with tests on
both resourceVersion and the selected config reference. It never applies.
Validate the **complete** candidate with the live pinned Caddy image before
any mutation; server-dry-run the new ConfigMap and `infra/edge/network-policy.json`.
Save the current edge TLS PVC/config recovery state through the platform's
existing authorized backup mechanism before switching its config. Do not copy
or expose certificate keys in this repository.

Create the new HandoverTrack-owned ConfigMap and additive egress policy, then
server-dry-run and apply the saved JSON patch to `edge-caddy/edge-caddy`. If
resourceVersion changed, prepare and validate a new candidate; never remove
the tests. The edge has `admin off`, so this follows its existing guarded
Deployment rollout convention and may briefly affect shared traffic. Arrange
that short maintenance interval; preserve certificate PVCs and all other hosts.
Verify every previously healthy hostname immediately after rollout.

The route preserves path, Host, native headers, cookies and Content-Length.
`/media/*`, `/v1/*` and `/api/auth/*` go directly to Fastify; browser/BFF routes
go to Next. No request buffering or response caching is configured. The exact
body cap is 52,428,800 bytes; upstream response headers allow 130 seconds around
the API's 120-second stream bound. All responses are private/no-store and
noindex. DB, health/metrics/admin and storage endpoints stay private.

Required real-route checks: TLS certificate verification (no `-k`), secure
host-only cookie behavior, unauthenticated and cross-tenant denials, preserved
native cookie/Origin headers, JPEG PUT with exact Content-Length including an
interrupted stream, lost completion reply/replay, maximum permitted request,
worker recovery and gallery images with private/no-store. Real camera-to-gallery
must be separately marked NOT RUN until performed on the phone.

## Status, restart and rollback

`kubectl ... -n handovertrack get pods,pvc,jobs` plus `top pods` and the read-only
node stats report show resource state. Worker logs emit ready/claimed/processed/
processing_failed/heartbeat; its `/tmp/worker-heartbeat` drives health probes.
Use `node node_modules/tsx/dist/cli.mjs scripts/media-maintenance.ts status` in
an API pod for queue/failed-job and reservation status. Use actual filesystem
`statfs` from the media mount, not PVC request sizes, for disk/inode alerts.
Do not automatically redrive failing jobs or prune files. Backups have a dated,
hashed receipt; no receipt means backup age is unknown, not zero.

Before restart tests save media ID/owner/hash, migration hashes, job/event counts
and session behavior. Restart one owned Deployment at a time; wait for readiness,
then restart `statefulset/database`. Verify the same original hashes, gallery,
owner and DB receipts survive. For stale leases stop only the owned worker while
processing a synthetic fixture, wait beyond its lease, restart it and confirm one
ready job/event/variant set. Never use these tests against real evidence.

Install a reviewed fixed copy of `scripts/ops/release.py` on the server only after
bootstrap. The controller defaults to check-only and never pulls or executes
new scripts. Run it without Python `-O`; it refuses disabled assertion guards. Its operator-owned
mode-0600 policy names `namespace`, `data_policy` (must be
`disposable-only`), exact `approved_source`, `approved_image`, `artifact_verified`,
`database_contract`, `preflight_file`, and `backup_receipt`. The source/image/
contract come from the reviewed release receipt and verified import/publication,
not an untrusted arbitrary branch. Check-only performs guarded server dry-runs;
`--apply` additionally requires a fresh preflight and consistent backup receipt.
No timer or GitHub workflow has been installed/enabled. A future pull trigger must
verify exact-source CI and immutable artifact provenance under the same policy.

Compatible updates patch only image/source on web/api/worker using resourceVersion
and previous-image tests, retaining all config, storage and credentials. A changed
migration contract stops promotion for explicit migration review. Recreate means
application maintenance, not HA or zero downtime. A failure leaves a receipt of
partial progress and stops; inspect before retrying. For rollback, select the
saved previous **schema-compatible** image/source, verify it against current
migrations and use the same controller procedure/policy. Do not restore an old DB
over newer evidence, remove PVCs, delete originals or install an old phone build.

For edge rollback, reread current Deployment resourceVersion and verify its config
reference equals this trial's recorded candidate. Build a new test/test/replace
patch that changes **only** that volume's ConfigMap reference back to the recorded
previous name. If another operator has since changed it, stop and merge only the
HandoverTrack removal into the new baseline. Retain old ConfigMaps/TLS state.

## Backup and isolated restore

See [recovery runbook](RECOVERY.md). Missing independent recovery or native
validation restricts the entire trial to disposable evidence. No real-data
exception is implied by available disk, a successful local image test, or a
backup sitting on the same node.

References: [Rrugë conventions](../../../rruge/infra/kubernetes/README.md),
[K3s image import](https://docs.k3s.io/import-images/),
[Kubernetes storage classes](https://kubernetes.io/docs/concepts/storage/storage-classes/),
[Caddy streaming proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).
