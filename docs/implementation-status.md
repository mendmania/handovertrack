# Implementation status

Updated 2026-09-21. Profile: `selfhosted-trial`. Task 05 preparation implemented; live rollout blocked. Nothing deployed.

| Task | Scope | State | Evidence / gate |
|---|---|---|---|
| 01 | Local authenticated project foundation | complete | [Handoff](progress/01-foundation.md); required automated and interactive Release simulator checks passed 2026-09-21 |
| 02 | Project management, assignments and sync feed | complete | [Handoff](progress/02-projects-and-sync.md); required updated Release native UI checks passed before Task 03 |
| 03 | Durable offline camera capture | implemented-awaiting-validation | [Handoff](progress/03-offline-capture.md); automated and simulator checks pass; actual physical camera/offline restart NOT RUN |
| 04 | Verified uploads, durable jobs and previews | implemented-awaiting-validation | [Handoff](progress/04-upload-and-preview.md); automated twenty-photo/worker/browser checks pass; one phone original/local HTTP acceptance and derivatives verified in Task 05; remaining native gate NOT RUN |
| 05 | Existing-k3s preflight and private trial deployment | blocked-rollout | [Handoff](progress/05-k3s-trial.md); Kubernetes/capacity PASS; reviewed source ba2ecc8 and rebuilt digest verified; apex DNS configured/publicly verified; SSH works via macOS Keychain; transfer paused at 35.8% for owner shutdown; owner-run sudo import pending; native gate partial, recovery NOT RUN |
| 06 | Required-photo checklists and offline conflicts | planned | [Prepared prompt](prompts/06-checklists.md); Task 05 remains blocked; not started |
| 07 | Proof composition and immutable reports | planned | Depends on 06 |
| 08 | Scoped sharing and customer decisions | planned | Depends on 07 |
| 09 | Whole-trial reliability and recovery | planned | Depends on 08 |
| 10 | Optional S3/Kafka/Temporal expansion | deferred | Separate selection after 09 |

Task 01’s native gate is satisfied by actual simulator execution. Task 02’s native UI gate is also satisfied. Tasks 03/04 remain implemented but incomplete. The resumed Task 05 verified a persisted phone JPEG, SQLite v4, matching local HTTP server acceptance and three checksum-verified derivatives; permission branches, twenty offline photos, successful restart/isolation, transport failure cases and physical HTTPS/gallery remain NOT RUN. Relaunch was denied by locked iOS; originals are preserved.

Kubernetes access and capacity checks pass. After owner sign-in, the authorized apex DNS-only A record was added for 159.195.30.113 and verified at both authoritative nameservers and two public resolvers. A later preflight passed every check, including the refreshed workstation DNS resolver. SSH now works as mendim using the netcup key with UseKeychain=yes; the prior failures omitted Keychain unlocking. The owner verified sudo in their VPS terminal; image transfer is paused at 35.8% for the owner’s Mac shutdown, with saved-prefix checksum verified; guarded owner-run import is pending. Partial bytes must pass the full archive checksum before import. GHCR package access still returns 403. Source `ba2ecc8d8040eda6e5d57bf73d6d17e90a4d2337` was committed and rebuilt from its exact Git archive. Its locally verified AMD64 image is `handovertrack.local/runtime@sha256:125cd8a42f0bb92bf87251d40c4cc14c561ab27e0f00911205e000856d66d7cc`; it is not imported/published. Release-controller maintenance tests and complete Caddy candidate validation pass. First-use certificate issuance correctly follows route creation.

Only the authorized apex DNS record was added; no cluster resource or live edge route was changed; Rrugë pod names/restarts and edge spec are preserved, and existing-host health checks pass. The FileVault workstation is an independent server-backup candidate, but key custody is unverified and no deployed trial exists to back up/restore. Independent recovery remains NOT RUN. See [Task 05](progress/05-k3s-trial.md) for exact artifacts and blockers. Keep disposable-only until native and independent recovery gates pass. Task 06 has not started.

Task 04 publication follow-up: codex/upload-and-preview, based on origin/main
at 8063d1e after the foundation PR merged. The owner requested a dedicated
Task 04 commit and PR to main. See the handoff for source-state history.
