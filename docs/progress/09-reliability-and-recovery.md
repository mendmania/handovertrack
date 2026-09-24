# Task 09 — whole-trial reliability and recovery

**Status: implemented-awaiting-validation. Trial: disposable-only.**
Updated 2026-09-24. Local implementation can be reviewed; physical/native and
independent recovery gates remain open. No Task 10 work, merge, deployment,
auto-merge, automation activation, registry change or paid service was performed.

## Baseline and preservation

Started `codex/reliability-and-recovery` directly from fetched main
`6ff5f38314621247ab7b082dfa3030fc9f704e96`, the merged [PR #7](https://github.com/mendmania/handovertrack/pull/7).
Main [run 35972037481](https://github.com/mendmania/handovertrack/actions/runs/35972037481)
completed **PASS** for validation and image publication. This is publication
evidence, not proof of a live rollout. The only initial tracked modification was
the owner's expanded Task 09 prompt; it was carried unchanged onto this branch.
Tasks 06–08 already belong to main and are dependencies, not new Task 09 PR scope.

Read-only live inspection found API/web/worker each ready at the retained image
`handovertrack.local/runtime@sha256:125cd8a42f0bb92bf87251d40c4cc14c561ab27e0f00911205e000856d66d7cc`,
SQL 001–004, 25 accepted originals, 25 ready jobs and 75 variants. No live writer,
configuration, workload, ingress or recovery resource was changed. No live backup
script was invoked. Configuration and migration001–007 fingerprints were retained
privately for before/after comparison. Existing recovery files and previous local
Task 06–08 containers/data remain retained.

Toolchain: Node 24.21.0, pnpm 10.32.1, Docker 29.6.2, PostgreSQL 18.3 pinned digest;
macOS host, simulator iOS 26.5. PostgreSQL source/restore test containers use
loopback 55550/55551, unique retained volumes, fresh random credentials and no
public ingress. SQLite test schema is v5. The retained Task 06 simulator
remains on its compatible v5 installation;
a Documents copy passed integrity checking and retained its accepted/resolved
commands. Applying007–008 to its isolated backend preserved every preexisting
table fingerprint. The existing HTTPS physical phone remains on the distinct v4
track; no app was installed or test control armed.

## Demonstrated defects and changes

- An old dump contains authority that may have been revoked later and lacks later
  customer decisions. The rehearsal demonstrates both directly in a fresh restore.
  Additive PostgreSQL 008 introduces operator-owned recovery holds/reconciliation
  receipts. The quarantine transaction revokes all restored shares, invalidates
  restored sessions and persists a hold before serving starts. Every API/auth/guest
  route except liveness returns uncached `503 RECOVERY_REQUIRED` until all holds
  have privileged, evidence-backed reconciliation receipts. Runtime cannot clear
  holds. The generated OpenAPI contract includes the error and503 responses.
- Free bytes alone did not protect intake from inode exhaustion. Capacity now
  requires 1,024 reported free inodes; unknown inode limits are not mistaken for
  zero. ENOSPC/EDQUOT map to retryable507. Actual bounded Linux tmpfs byte/inode
  pressure rejects and recovers; HTTP/SQLite checks preserve the same pending ID,
  command intent and original bytes through rejection and restart.
- Actual PostgreSQL restart exposed an unhandled idle-pool error and a pool leak
  when Kysely had not initialized (raw-SQL/auth-only API instances). Database pools
  now install a redacted disconnect listener and explicitly close unused dialect
  pools; API/worker shutdown uses the common close method. The same API process
  reconnects after database restart and still enforces the durable hold.
- Process heartbeat alone can look healthy while work stalls. A read-only operator
  command reports DB availability, due queue age, terminal jobs, heartbeat age,
  configured storage reserve, backup receipt age and recovery holds. Missing or
  future receipts never pass. These are local diagnostics, not activated alerts or
  an agreed backup schedule.
- Add guarded, fresh-only local rehearsal tooling, whole-journey/load/recovery
  tests, legacy v4 feed compatibility fixture, full browser validation and CI
  coverage. Keep TanStack Query and authoritative mobile SQLite unchanged.

## Acceptance matrix

| Scenario | Previous evidence | Task 09 environment/action | Result / remaining gate |
|---|---|---|---|
| Capture/offline restart/upload interruption/lost accepted reply | Tasks 03–05 synthetic and physical ordinary uploads | Actual SQLite capture service and upload executor, generated images, real local HTTP; byte-pressure rejection and committed reply loss | **PASS local**; physical interrupted native stream remains NOT RUN |
| Checklist answers, conflicts and every completion path | Task 06 SQL/SQLite/HTTP; Task 07 native cold-reopen/conflict PASS | Required regressions, accepted evidence in complete journey, pending/conflict SQLite backup copy | **PASS automated and retained simulator UI**; physical Task 05 gaps remain separate |
| Composition→frozen PDF→share→decision→review | Tasks 07–08 isolated suites | Real full journey; duplicate answer/decision receipts, exact PDF hash and private manager review | **PASS local** |
| Worker crash, expired lease, file-before-receipt crash | Task 07 actual SIGKILL/replacement PASS | Built worker crash regression; restored pending/terminal jobs and partially published file; no-replace inode/hash reuse | **PASS local** |
| Concurrent resource budgets | Separate media/report tests |9×1.3MB JPEGs,3 upload lanes,6 PDFs,100 manager reads;16 guest PDF requests | **PASS bounded local sample**, not a production capacity claim |
| Disk/inode pressure and signals | Byte guard only |16MiB/1,080-inode private tmpfs; real capacity function; failed/late queue/heartbeat/backup signals | **PASS local**; target/live pressure NOT RUN |
| Guest/manager cache and authorization | Task 08 browser/server PASS |10 real Chromium journeys; concurrent PDF cap, conditional/range hash checks, revocation; generated typed503 | **PASS local** |
| Current-schema server backup/restore | Task 05 schema 00418-table restore PASS | Actual paired pg_dump/archive and fresh pg_restore, SQL 001–008, every table/owner/file hash, jobs/receipts | **PASS technical local restore** |
| Post-backup revocation/decision/auth gap | Previously untested | Real source commits after recovery point; restored copies verified stale; all shares/sessions invalidated, serving held across API/DB restart | **PASS fail-closed**; decision/authority reconciliation intentionally unresolved |
| Native backup ownership and pending intent | SQLite unit retention PASS | Closed SQLite v5/files copy: accepted and pending originals, pending answer and both conflict versions; foreign owner cannot read | **PASS local fixture**; does not cover unsynced physical-phone photos automatically |
| Existing v4 phone vs checklist feed | Known incompatibility | Exact historical protocol body tested against real checklist feed | **PASS incompatibility demonstrated**; coordinated client release required |
| Additional interactive native checks | Task 07 offline answer/conflict already PASS | Owner unlocked Mac; pending photo selection, offline logout, both manager scopes, owner rebootstrap, real incremental tombstone and explicit retry | **PASS simulator**, using one synthetic CaptureService photo; physical camera not claimed |
| Task 05 native cancel/terminate/completion-delivery controls | Compatible v4 builds prepared, never installed | Owner says available; offline/unlocked confirmation requested per scoped procedure | **NOT RUN** until confirmation and controlled physical cases; no installation/control |
| Independent disaster recovery / operations | Same-Mac restoration only | Owner explicitly deferred backup arrangements | **NOT RUN / undecided** destination, key access after Mac loss, operator, cadence/availability and failure response |
| Live compatible release / recovery | Existing004 runtime retained | Runbook prepared, release guards preserved | **NOT RUN**, separately authorized coordinated release required |

## Reproducible evidence and limits

`pnpm test:recovery` is a fresh-only local Docker rehearsal. It never calls
`backup.py` or Kubernetes. The source is quiesced before the actual SQL/media pair;
restore uses a fresh DB and directory with original ownership/grants. The bounded
archive writer and safe member verifier are shared with operator tooling. Native
SQLite and files are backed up separately after closing its writer. Earlier failed
harness attempts were retained (startup readiness, import/argument wiring, cached
fixture status and cleanup errors). The database restart failure identified the
real pool defect fixed above; none is represented as a passing native/production check.

The private `.local/task09/recovery-validation.json` records the exact recovery
point, known post-backup interval, verified manifest hash, elapsed restore and
native state. `.local/task09/load-validation.json` records measured latency/RSS/
disk counters; raw tokens, customer fixtures, PDFs, screenshots and dumps remain
ignored. A nonsecret evidence summary accompanies this handoff. No recovery
point/object hash is substituted by editing its historical backup.

Recovered shares are all irrevocably invalidated. The missing later decision and
its exact receipt/audit rows are retained in a separate private gap record and
referenced by hash from the hold. The authoritative source and restored copy both
remain retained. Reopening is **NOT RUN**: known history must be reconciled; merely
acknowledging loss or revoking links is insufficient. Current memberships and
assignments must also be revalidated before releasing any hold. The runbook
requires quarantine before starting a restored API; a dump cannot auto-detect
restoration and old binaries do not enforce the hold.

The fresh physical-phone SQLite copy is v4, integrity OK, with 23 accepted receipts.
A full Documents copy timed out and its partial output remains retained; no new
complete phone backup or physical fault scenario is claimed. Offline/unlocked
phone confirmation remains pending, so no compatible fault build was installed.

Local lint/boundary/type/generated-contract checks, 59 unit tests in 6 files,
24 operator tests and manifest guards, foundation/sync/media/checklist/report/share
regressions, 10 Chromium journeys, production build, mobile check/export and 45
client bundle secret scans **PASS**. See [nonsecret evidence](evidence/09-reliability-20260924.json).
The final measured combined workload took 3.602s (p50 5.63ms, p95 135.03ms,
maximum 316.02ms); observed worker plus renderer RSS peaked at 303,296KiB. These
are mixed-operation local samples, not throughput/availability promises. The
32-table/90-file restore and verification took 1.761s; recovery point
08:39:48.257Z to known post-backup commits 08:39:49.336Z on 2026-09-24. SQL/file
recovery is technical PASS; the intentional history gap remains held. Final PR CI must be checked
against the final pushed commit, with feature-branch publication skipped. Existing
schema-contract deployment rejection remains intentional.

## Readiness and precise continuation

**Local:** passing implementation/regression and technical restore evidence support
source review. **Live:** disposable-only, awaiting native/device, target capacity
and coordinated compatibility validation. **Independent recovery:** not established;
owner said it will be set up later. Task 09 and the trial are not declared complete.

1. Retain the completed simulator evidence: the new photo/answer accepted, its
   three derivatives are ready, assignment is restored, inbox has zero pending/
   blocked/conflict commands, and previous receipts/conflict payloads are unchanged.
   This closes the additional Task 06 simulator UI follow-ups, not physical faults.
2. Confirm the existing phone offline/unlocked; follow the exact
   [Task 05 one-ID procedure](../../scripts/validation/task05-native/README.md) for
   each cancel, terminate and controlled completion-delivery-loss case. Verify fresh
   phone/server baselines, release each hold and restore the compatible normal v4
   app in place. No v5 replacement or accepted-original replay. Record actual
   native/server/owner observations and a new verified backup if captures change.
3. Owner selects independent backup destination and Mac-loss key access; designate
   operator, cadence, availability and failed/missed-run response. Perform recovery
   with that operator/access path. Do not treat this same-Mac test as that gate.
4. Establish complete post-recovery-point decision and permission history before
   ever reopening a restored service. The held local copy is evidence, not a live
   replacement; no reconciliation or ingress reopening is implicitly authorized.
5. Validate target capacity and the coordinated001–008/API/web/worker/native
   release plan in [the operator quickstart](../../infra/kubernetes/RELIABILITY.md).
   Preserve current release guards and obtain separate live authorization.
6. Review the new Task 09 PR and final-commit CI. No merge/auto-merge/deployment is
   authorized here. Keep Task 10 deferred and retain all prior recovery resources.
