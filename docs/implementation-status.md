# Implementation status

Updated 2026-09-21. Profile: `selfhosted-trial`. Nothing deployed.

| Task | Scope | State | Evidence / gate |
|---|---|---|---|
| 01 | Local authenticated project foundation | complete | [Handoff](progress/01-foundation.md); required automated and interactive Release simulator checks passed 2026-09-21 |
| 02 | Project management, assignments and sync feed | complete | [Handoff](progress/02-projects-and-sync.md); required updated Release native UI checks passed before Task 03 |
| 03 | Durable offline camera capture | implemented-awaiting-validation | [Handoff](progress/03-offline-capture.md); automated and simulator checks pass; actual physical camera/offline restart NOT RUN |
| 04 | Verified uploads, durable jobs and previews | implemented-awaiting-validation | [Handoff](progress/04-upload-and-preview.md); automated twenty-photo/worker/browser checks pass; physical camera/native upload gate NOT RUN |
| 05 | Existing-k3s preflight and private trial deployment | planned | Depends on 04 and live infrastructure inspection |
| 06 | Required-photo checklists and offline conflicts | planned | Depends on 05 |
| 07 | Proof composition and immutable reports | planned | Depends on 06 |
| 08 | Scoped sharing and customer decisions | planned | Depends on 07 |
| 09 | Whole-trial reliability and recovery | planned | Depends on 08 |
| 10 | Optional S3/Kafka/Temporal expansion | deferred | Separate selection after 09 |

Task 01’s native gate is satisfied by actual simulator execution. Task 02’s native UI gate is also satisfied. Task 03 is implemented but not complete: a physical Release build was installed and launched, while actual camera capture and captured-photo restart/isolation still need direct device evidence. Task 04 uploads, PostgreSQL jobs, derivatives and gallery are implemented locally. Physical capture/native upload validation remains open; nothing is deployed. [Task 05 prompt](prompts/05-trial-deployment.md) is prepared, not started.

Task 04 publication follow-up: codex/upload-and-preview, based on origin/main
at 8063d1e after the foundation PR merged. The owner requested a dedicated
Task 04 commit and PR to main. See the handoff for source-state history.
