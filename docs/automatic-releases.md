# Automatic main releases

Pushing to `main` (including merging a pull request) triggers
`.github/workflows/release.yml`. Pull requests run the same validation without
publishing. Each successful main run builds the Linux amd64 runtime, smoke-tests
that exact image in isolated Docker fixtures and publishes
`ghcr.io/mendmania/handovertrack:git-<full-commit>` plus a small immutable-digest
artifact. The displayed version is `main-<run-number>-<12-character-commit>`.
There is no source-version bump loop and no phone/TestFlight publication.

The fixed VPS controller checks every two minutes. It requires successful CI for
the exact current main SHA, the expected repository/workflow/event, a bounded
artifact with matching source, the downloaded image's digest/platform/source
labels, and an unchanged database migration contract. A stale source, failed CI,
incompatible migration, unhealthy source, failed backup or failed preflight
prevents deployment. GitHub receives no cluster credentials, SSH keys, auth
secrets, database records or original photos.

Before changing images, the controller makes a consistent verified snapshot of
the current database, originals, derivatives, configuration and named application
secrets. Writers briefly pause; their original replica counts are restored.
Snapshots live in a private directory on the VPS and are **release safety copies,
not independent disaster recovery**. No prior snapshot/photo is pruned. Independent
Mac-loss backup access, key custody and Task 05 native validation remain open;
automatic app deployment does not close those gates or authorize customer intake.

Only the existing worker, API and web image/source annotations change through
the existing resource-version-guarded release controller. No seed, schema change,
PVC replacement, edge change or source restore is part of a release. The phone's
installed build and data stay intact. After rollout, the controller checks public
HTTPS, private unauthenticated responses, API readiness, worker heartbeat and
preservation of previously accepted original identities/receipts.

A failed/interrupted deployment stays held even if another main commit arrives.
Inspect private receipts and source health before a deliberate `--retry`. There
is no automatic database rollback or blind retry of a partially changed release.
A newer main commit detected before maintenance/rollout supersedes the candidate.

## VPS installation and operation

Install reviewed files into `/home/mendim/.local/share/handovertrack-deployer`:
`autodeploy.py`, `release.py`, `backup.py`, `backup_media.py` and `preflight.py` in
`scripts/ops/`, plus the two user systemd unit files in `~/.config/systemd/user/`.
The service runs as the existing unprivileged operator. A private `bin/kubectl`
wrapper invokes `/usr/local/bin/k3s kubectl`; it does not use sudo or a privileged
container. The public image is pulled anonymously into the host Docker cache for
provenance inspection and by k3s for the actual rollout. Other applications'
registry credentials are not reused.

Render `autodeploy-rbac.py`, inspect/server-dry-run its resources and create them
only if absent. It gives a dedicated service account mutation access within
HandoverTrack, the named application secrets required for backup, and read-only
capacity/edge checks. It grants no write access to other namespaces, nodes, PVCs,
RBAC, Secrets or ConfigMaps. Store its token and CA in the mode-0600
`runtime/kubeconfig`, context `netcup-k3s-direct`, pointed at local k3s.
Never print or commit the token. The token Secret and recovery resources are
retained; revoke it deliberately if decommissioning the controller.

Create mode-0700 `runtime/` and `backups/`. `runtime/autodeploy-policy.json` is an
operator-owned mode-0600 file with `enabled`, `namespace: handovertrack`,
`data_policy: disposable-only` and the reviewed `database_contract` mapping of
migration filenames to SHA-256 checksums. The controller will not automatically
update this policy or its installed host scripts from GitHub. Verify existing
operator GitHub read access to this repository and Actions artifacts; no GitHub
credential is copied into Kubernetes or the application.

Start with `--check-only`, then enable only `handovertrack-autodeploy.timer`.
A first successful main deployment must be verified before claiming activation.
Use `systemctl --user status handovertrack-autodeploy.timer` and
`journalctl --user -u handovertrack-autodeploy.service` on the VPS. Private
`runtime/autodeploy.json`, `passed-*.json`, `before-*.json`, preflight/policy files,
release receipts and snapshot receipts retain exact source, digest and outcome.

All backup/release operations must use this server's **same runtime directory**
and `release.lock`; automatic polls also use `autodeploy.lock`. Before a manual
backup/release from the Mac, stop only this timer and wait for its service to
finish. A filesystem lock cannot coordinate two hosts. Restart the timer after
that manual operation and health verification. Do not pause Rrugë's controller.

Updates to host controller code, schema migrations, secrets, infrastructure,
registry visibility and native iOS releases remain explicit operations. The
published container contains the public application code, never `.env`, local
phone snapshots, credentials or recovery files. The normal mobile app has no
fault controls included in this server image.
