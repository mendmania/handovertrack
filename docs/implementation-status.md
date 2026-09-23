# Implementation status

Updated 2026-09-22. Profile: `selfhosted-trial`; HTTPS is live at
[handovertrack.com](https://handovertrack.com). Disposable data only. The current
[Task 05 checkpoint](progress/05-k3s-trial.md) supersedes historical rollout and
in-progress test instructions.

| Task | Scope | State | Evidence / gate |
|---|---|---|---|
| 01 | Local authenticated project foundation | complete | [Handoff](progress/01-foundation.md); required automated/Release simulator checks passed |
| 02 | Project management, assignments and sync feed | complete | [Handoff](progress/02-projects-and-sync.md); required native UI checks passed |
| 03 | Durable offline camera capture | implemented-awaiting-validation | [Handoff](progress/03-offline-capture.md); physical twenty-photo capture, permissions, offline reopen and scope preservation pass; shared native/recovery gates remain open |
| 04 | Verified uploads, durable jobs and previews | implemented-awaiting-validation | [Handoff](progress/04-upload-and-preview.md); all 21 new native assets/63 variants and worker restart pass; native interruption/retry/lost response NOT RUN |
| 05 | Existing-k3s preflight and private trial deployment | implemented-awaiting-validation | [Handoff](progress/05-k3s-trial.md); HTTPS and full-batch backup/application restore pass; native fault scenarios and independent recovery readiness remain open |
| 06 | Required-photo checklists and offline conflicts | planned | [Prepared prompt](prompts/06-checklists.md); not started or assigned by Task 05 |
| 07 | Proof composition and immutable reports | planned | Depends on 06 |
| 08 | Scoped sharing and customer decisions | planned | Depends on 07 |
| 09 | Whole-trial reliability and recovery | planned | Depends on 08 |
| 10 | Optional S3/Kafka/Temporal expansion | deferred | Separate selection after 09 |

Automatic release follow-up: the owner requested build, publication and deployment
on pushes to main. [PR #5](https://github.com/mendmania/handovertrack/pull/5) is
merged and the first main-triggered build/publication passed for
`main-4-1bf8d8732b41`. **Live deployment is not active:** existing SSH key access
fails and the public/private registry decision is pending. The controller/timer
are not installed; live app images, originals and retained recovery resources
remain unchanged. [Exact result](progress/evidence/05-automatic-release-20260922.json).

Latest continuation: a signed, scoped native fault-validation build is prepared
and verified but **not installed** because phone interaction is unavailable.
Native cancel/suspend/completion-delivery controls pass synthetic checks only;
all three physical cases and their owner observations remain NOT RUN. No new
photo IDs were created. Refreshed USB/server hashes preserve the existing totals,
and all 59 recovery files plus three stopped rehearsals remain intact. The owner's
“xontinue” reply confirms none of the requested recovery arrangements. Normal
source/configuration is restored, no control is armed and Task 06 is not started.
See [the exact preparation evidence](progress/evidence/05-native-fault-preparation-20260922.json).

The physical phone preserves 23 originals and accepted receipts, with 22 belonging
to the current North worker and one to the earlier local-HTTP owner. Owner-observed
UI results plus USB/SQLite/hash checks establish camera permission behavior,
twenty offline saves, offline cold reopen, revoked pending work blocking,
manager.both galleries empty in North and South, and return-to-worker rebootstrap.
The assignment is active at v5 after the owner's manager action; no restoration
is outstanding. All 21 new uploads completed at attempt 1. The paused/restarted
worker processed their 21 durable pending jobs once. These successes do not prove
native stream interruption, restart during upload, retry or lost completion reply.

Server total is 25 accepted originals, 25 ready jobs and 75 variants. The latest
FileVault backup and third isolated restore cover all of them, 125 media paths
and matching counts/hashes for all 18 public tables. Saved sessions, manager
original downloads, access denials and full image decodes pass. Three separate
rehearsals remain stopped with Retain PVCs and credentials preserved. The older
local-HTTP phone photo is retained locally but is outside server backup coverage.
Two failed larger-backup transfers are retained without successful receipts;
operator tooling now uses verified bounded reads with limited read retries and
regular-file-only restoration. Twelve focused operator tests pass.

Independent recovery key/backup access if the Mac is unavailable, manual backup
operator/cadence/availability and failed/missed-backup response remain
NOT RUN/unconfirmed. FileVault being On and this successful application restore
are narrower evidence. No unattended schedule or external alerts are configured.
Keep Tasks 03–05 implemented-awaiting-validation and the disposable-only gate.

Runtime source remains `ba2ecc8d8040eda6e5d57bf73d6d17e90a4d2337`, immutable image
`handovertrack.local/runtime@sha256:125cd8a42f0bb92bf87251d40c4cc14c561ab27e0f00911205e000856d66d7cc`.
DNS-only origin HTTPS, local configuration, credentials, migrations, source PVCs,
all original photos, previous recovery resources and Rrugë remain preserved.
No runtime/schema release, bootstrap/seed, image import or Task 06 implementation
occurred. See the handoff and evidence manifests for exact backup hashes/resources.

Task 04 publication follow-up: codex/upload-and-preview, based on origin/main
at 8063d1e after the foundation PR merged. The owner requested a dedicated
Task 04 commit and PR to main. See the handoff for source-state history.
