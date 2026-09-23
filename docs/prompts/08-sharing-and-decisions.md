# HandoverTrack — Task 08: scoped sharing and customer decisions

**Prepared prompt only. Do not start without explicit Task 08 assignment.**
Task 07 was implemented and tested locally; no push, merge or deployment occurred.
When assigned with the owner's next-task kickoff, implement Task 08 locally and
then commit, push the feature branch and open a PR targeting main as described
below. The owner's publication request supersedes prior no-commit/no-push/no-PR
boundaries for that assignment. It does not authorize merging or deployment.
Read README, repository instructions, implementation status, Tasks 03–07 handoffs,
and the current Task 05 recovery/deployment checkpoint. Inspect the dirty branch
and preserve the uncommitted Task 06/07 source, local data, originals, receipts,
pending commands/conflicts, published PDFs and recovery resources.

## Existing foundation to preserve

- PostgreSQL migrations 001–006; native SQLite v5 remains authoritative. All new
  migrations must be additive. No editing of checksum-applied SQL or downgrade.
- Frozen checklist requirements, durable native answer outbox, explicit conflict
  resolution and server-enforced completion on every path remain mandatory.
- Append-only manager proof compositions: internal/report-visible notes,
  EXIF-oriented normalized annotation rectangles and accepted same-project pairs.
- Immutable report snapshots freeze project/checklist/answer/composition versions,
  selected accepted evidence and derivative hashes, generation identity and
  template/renderer/font versions. Internal notes never enter snapshots or PDFs.
- Separate PostgreSQL report jobs use leases/fencing, bounded child rendering,
  five attempts, explicit redrive and no-overwrite publication. A published report
  has an immutable hash/size/page receipt. Corrections create a new report revision.
- Current private report routes authorize managers for request/status/download and
  replay. There are no public/share endpoints yet. TanStack Query remains on web
  and mobile; Task 08 must not move offline authoritative data out of SQLite.

## Scope when explicitly assigned

Implement narrowly scoped, revocable and expiring sharing of a **specific ready
immutable report revision**, followed by an append-only customer accept/request
correction decision flow. The journey is manager copies report link → recipient
reads that exact report → recipient accepts or requests correction → manager
reviews the recorded decision. Do not imply approval of a different/newer report.

Authorize manager creation/revocation/listing with current project membership,
Origin checks, idempotent commands, audit and appropriate sync. Store a strong
bearer token hash, never a reusable plaintext token in logs or ordinary database
rows. Define safe one-time token display and lost-response semantics explicitly;
do not solve retry by leaking secrets or changing an existing share identity.
Raw bearer secrets must also stay out of command/idempotency receipts, audit/sync payloads,
Query keys, persistent client caches, screenshots and test traces. Choose and
document a replay-safe secret-delivery protocol. A hash-only server cannot recover
the original random token; handle a lost one-time display explicitly rather than
silently storing plaintext or creating multiple live shares on retry.
Use a dedicated narrow public read/decision boundary that cannot enumerate
projects, originals, other report revisions, internal notes or account details.
Revalidate expiry/revocation on every document and decision request. Avoid token
leakage through URLs in logs, Referer, shared caches or analytics. Bound brute-force
traffic and body sizes using self-hosted existing capabilities.

Keep the guest authority separate from manager cookies and organization sessions.
Use minimal allowlisted response DTOs rather than returning the full internal
report snapshot. Give guest TanStack Query reads a separate nonsecret share scope;
cancel/fence/clear old reads on link changes and authorization loss. Test navigation
between shares and manager/guest pages without cached cross-report disclosure.
Revoke/expiry must deny future API and PDF requests, including range/conditional
requests if supported. Do not imply revocation recalls a PDF already downloaded.
Use private/no-store and no-referrer behavior with no third-party tracking/assets
on token-bearing pages; preserve server and proxy token redaction.

A shared report must already have a committed, verified artifact. Freeze the report
ID/hash and any share-visible metadata. Never render from current project rows,
upgrade an old share to a newer PDF, expose a pending artifact, rewrite a signed-off
PDF or silently discard an earlier decision. Define what the customer identity
claim proves; do not call an unauthenticated typed name verified identity or a
qualified electronic signature. Show the exact report revision, decision wording
and meaningful confirmation to the customer. Handle duplicate/lost-response and
concurrent accept/correction/revoke/expiry races transactionally, with explicit
state and append-only audit history. Corrections require manager review and a new
report revision; preserve the old decision/share history.

Specify the decision state machine and conflict behavior across multiple links to
the same report, concurrent accept/correction, manager revoke, expiry, project
reopen and newer report publication. Keep decisions bound to the exact report
revision/hash. Keep customer review state distinct from the project's existing
active/complete status; a manager status edit must not manufacture acceptance.
An old share must not approve a newer report or overwrite the current project's
review state. Derive any project-level transition under the
appropriate version/authorization lock and audit it; existing general project
write routes must not bypass or silently rewrite customer decision history.
Guest access never grants membership, project editing or completion authority.

Use a focused manager share/review UI and customer report/decision page, accessible
on narrow screens. Keep report-visible/internal data boundaries explicit. No email
or message sends, paid services, automation activation, invitations, unrelated CRM
or generalized workflow platform. Do not add public original-photo access.

## Validation and constraints

Use isolated local services and synthetic/test-device data. Preserve the existing
HTTPS phone (still Task 05 SQLite v4), live deployment and all recovery resources.
Code publication to a feature branch and a PR to main is authorized when this
Task 08 assignment is started. Do not merge, deploy, enable auto-merge or activate
deployment automation. Inspect current workflows before publishing; do not bypass
checks or change registry visibility to make publication pass.
Task 05 physical interruption/restart/lost-upload-response and independent recovery
custody/operator decisions remain NOT RUN; they do not block independent local work.
Task 06 native answer restart/conflict/resolution now PASS; additional native
photo/ownership-scope UI checks remain open after the Mac locked again.

Test token secrecy and scope, authorization/revocation/expiry on every path,
immutable artifact integrity, duplicate/lost responses, concurrent decisions and
revocation, snapshot/version binding, malicious input, cache/referrer isolation,
transaction/audit failures and migration preservation. Run relevant report worker,
completion/checklist, media/sync and browser regressions. Exercise real generated
PDF download and customer decision UI; record PASS/FAIL/NOT RUN honestly.

Future release still requires compatible API/web/worker/native migrations, retained
renderer versions, target-volume publication checks, combined resource budgeting,
and backup/restore of new report tables/PDF paths. Do not claim existing Task 05
backups cover Task 06/07 local schema or Task 08 additions.

Write `docs/progress/08-sharing-and-decisions.md`, update implementation status and
prepare Task 09's whole-trial reliability/recovery prompt from actual evidence.
Stop before Task 09.

## Commit, push and open the PR to main

The owner explicitly requested these publication steps for the next assignment.
Checkpoint inherited work before implementation, then publish the completed,
validated changes. Do not stop at drafting git commands or asking whether to
publish again.

1. Inspect the current dirty tree, repository instructions, remote/main and
   existing PRs. Tasks 06 and 07 are dependencies and currently uncommitted in the
   same checkout. Preserve every change and inspect what main already contains.
   Keep work on a suitable codex/ feature branch; do not commit directly to main.
2. Before adding Task 08 code, make a reviewed dependency checkpoint commit for
   the existing Task 06/07 work, including their tests, migrations, lockfile and
   handoffs. A combined checkpoint is appropriate if the changes are intertwined;
   do not invent historical task-specific commits or discard hunks to split them.
   Leave unrelated work untouched and unstaged. Never stage .env, credentials,
   .local evidence, original photos, generated private PDFs, backups or signing
   material. Stage reviewed source and deliberately nonsecret evidence only.
3. Implement Task 08, validate the final code and commit it coherently. Fetch and
   reconcile necessary main changes without reset, force push or loss of local
   work. Preserve upstream CI/publication workflows even if .github is absent
   from this older checkout. Run affected checks after integration changes.
   Preserve honest PASS/FAIL/NOT RUN evidence for inherited native/recovery gaps.
4. Review the full diff against current main, then push the feature branch to
   origin. Create a PR targeting main, or update the existing matching PR rather
   than duplicating it. The title/body must describe its ACTUAL full scope: if
   Tasks 06/07 are absent from main, include their checklist/report dependencies
   alongside Task 08 sharing/decisions; do not call the whole PR Task 08 only.
5. Explain behavior, additive SQL/SQLite migrations and client compatibility,
   meaningful validation, unresolved native/recovery checks and the separate
   live-release requirements. Build/publication on main exists; a merge can have
   effects beyond source review. Do not merge or enable auto-merge. A PR is not
   evidence that new schemas, PDFs or sharing routes are deployed.
6. Check available PR validation results. Fix failures attributable to this change;
   report pending/inaccessible checks honestly without an indefinite wait. Attach
   the PR to the current task using the available app artifact tool, and finish
   with branch, commit IDs, PR link, test results, handoff and Task 09 prompt.

If authentication or remote policy blocks push/PR creation, retain the commits
and report the exact blocker. Do not alter credentials, permissions, repository
visibility or a paid plan to bypass it. Stop before Task 09, merge and deployment.
