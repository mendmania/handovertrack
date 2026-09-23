# Task 08 — scoped sharing and customer decisions

**Implemented locally. Publication and CI are recorded below. No live release.**
Updated 2026-09-23. Stop before Task 09. Tasks 03–06 retain the native/recovery
gates described in their handoffs and Task 07's superseding simulator results.

## Preservation and dependency checkpoint

Reviewed README, repository instructions, implementation status, the Task 08
prompt and relevant Tasks 03–07 handoffs. The initial branch was `codex/checklists`
at `d9a1ef5` with intertwined, uncommitted Task 06/07 work. Recorded an ignored
source/configuration hash baseline, reviewed the source/migrations/retention
boundaries and scanned staged candidates for configured private credentials.
Before adding Task 08 code, committed that dependency checkpoint as **ac26f74**
on `codex/sharing-and-decisions`. Merged current main (`301bc43`) without conflicts
in **bd2f5f3**, preserving its release/CI workflows and operator tooling.

No reset, force push, source/data cleanup, phone install, live connection, release,
merge to main or automation activation occurred. `.env`, Tasks 06/07 configuration,
originals, SQLite pending commands/conflicts and retained recovery resources are
preserved. SQL migrations 001–006 remain unchanged. The bundled font license's
trailing whitespace was normalized; the licensed font bytes are unchanged.

Migration 007 was applied twice to the retained isolated Task 07 database:
**all 23 existing public business/auth tables kept identical row counts/hashes**.
Its 12 published reports and 10 accepted originals were reverified against their
stored hashes. Task 08 tests use a new `handovertrack-task08-postgres` container,
loopback port 55549, retained `handovertrack-task08-data` volume and ignored
`.local/task08/` configuration/media/fixtures. Its separate empty `handovertrack`
database holds ordinary browser regression fixtures; proof/sharing tests use
`handovertrack_test`. API/web use 3381/3380. No existing phone/live database was used.

## Sharing and secret delivery

Managers choose a **ready immutable report revision** and a link lifetime (UI:
1/7/30 days; server: more than one minute, at most 30 days). Creation verifies
actual PDF bytes against its committed artifact receipt. The share freezes report
ID, revision, PDF hash/size/pages, report creation time and snapshot project title.
It never follows mutable project names, the latest report or live composition.

Each share gets an independent cryptographically random 256-bit bearer secret.
PostgreSQL stores only SHA-256, with no recoverable token in command receipts,
audit, sync, snapshots or list responses. The creating response returns the secret
once, held only in the manager component's memory. **Copy private link once**
copies `/share/<nonsecret-share-ID>#<secret>` and then clears it. It is not rendered
as a DOM link/input, stored in Query state or saved in browser storage.

A retry of the same creation command returns the same share and `token: null`.
It cannot create another live share or recover the secret. A lost response/display
requires the manager to explicitly revoke that share and create a replacement.
Creation/revocation/review replays reauthorize the current manager and project;
all commands require exact Origin and frozen idempotency keys. Their state,
secretless receipt, manager audit and project sync invalidation commit together.

The guest page removes the fragment from browser history before loading data.
It sends the capability only in the Authorization header, with credentials omitted.
A dedicated proxy forwards no manager cookie or Referer. A guest never becomes an
account/member and cannot use original media, manager, project-write or completion
routes. The allowlisted DTO contains only frozen report metadata and the existence,
kind and time of a prior decision; another link holder cannot see claimed names,
customer messages or internal manager review notes. The PDF is the same immutable
report artifact, with its intended report-visible notes/evidence.

Guest Query clients are separate from manager clients, have nonsecret share/session
keys, no persistence, and cancel/clear/fence on link replacement or authorization
loss. Browser-history path changes and fragment changes replace the scope. Closing,
refreshing or returning to the page requires reopening the complete original link.
Guest pages/API/PDF use private/no-store and no-referrer; the page has same-origin
assets only, a restrictive CSP and no tracking. API logs redact the complete guest
path and Authorization; no tokens enter screenshots/traces or committed evidence.

PostgreSQL rate slots persist across API restarts and are bounded to 8192 rows:
360 reads and 60 decisions per minute per keyed IP hash slot. Forwarding headers
are untrusted. Requests through one BFF address share that conservative budget;
collisions can also share a slot. This is a trial traffic bound, not a claim of
per-person identity or distributed denial-of-service protection. Decision JSON is
bounded to 16 KiB in API/proxy, names to 120 characters and messages to 2000.
At most two guest PDF responses are in flight per API process.

Every metadata/PDF/decision request revalidates its hash, revocation and expiry
under the shared organization/project mutation locks, including idempotent decision
replays. PDF bytes are reverified before serving. Range and conditional headers do
not bypass validation: authorized requests receive a full 200 response; unavailable
shares return 404, never 206/304. Already downloaded copies cannot be recalled.

## Decision state machine and audit

A report has no customer decision initially. All links to that report share a
single terminal state: **accepted** or **correction requested**. The first committed
decision wins; a competing command receives `409 DECISION_RECORDED`. Duplicate or
lost deliveries with the same share/key/payload replay the original receipt;
a different payload with that key conflicts. The command includes exact report
ID/hash and explicit confirmation. Names are unverified identity claims, **not
verified identities or qualified electronic signatures**. React escapes text;
no supplied markup becomes executable UI.

Revocation and decisions serialize with project writes. A decision committed before
revocation remains in append-only history; later requests are denied. Expiry is
checked after lock waits and again before decision commit / PDF return. Revoking
one link does not revoke another independent link. Revocation is irreversible.

Managers record one append-only acknowledgement with an optional internal review
note. Correction review does not edit the PDF or erase the customer decision.
Corrections require a **new report revision**, whose decision state starts empty.
Project reopening, completion and later report publication do not change historical
links or decisions. A still-active old link may record a decision for its old report,
but never approve a newer one. No project-level customer acceptance field or status
transition is introduced; ordinary status edits cannot manufacture acceptance.

`007_scoped_sharing.sql` adds `report_shares`, `customer_decisions`,
`customer_command_receipts`, `customer_decision_reviews`, `customer_audit_records`
and `guest_rate_slots`. Runtime cannot edit/delete decisions, reviews, receipts or
guest audit; share identity/metadata/hash/expiry are immutable and revocation cannot
be undone. Guest audit explicitly identifies the capability and exact report/hash,
not a fabricated app account. A guest decision, receipt, audit and compatible project
sync invalidation commit atomically. Customer text and secrets never enter native
sync. SQLite remains Task 06 schema v5; Task 08 adds no native migration or queue.

## Validation

| Check | Result / actual scope |
|---|---|
| SQL 006→007 and repeat; 23 pre-existing table fingerprints | PASS, retained isolated Task 07 DB |
| Retained Task 07 originals / published PDFs | PASS, 10 originals and 12 PDFs verified |
| Sharing manager/worker/tenant/session/Origin authorization and replay | PASS, real HTTP/PostgreSQL |
| Ready-only artifact sharing, immutable metadata, hash-only secret persistence and API log scan | PASS |
| Concurrent/lost creation replies, explicit lost-display recovery, no duplicate live share on retry | PASS, HTTP and browser |
| Competing accept/correction across links; duplicate/lost customer reply | PASS, HTTP and browser |
| Revocation/expiry metadata/PDF/decision/range/conditional/replay; request waiting on project lock | PASS; expired timestamp is a controlled isolated DB fixture |
| Guest audit failure rollback; runtime immutability; review concurrency/privacy | PASS |
| Reopen/new report/general status edits preserve exact historical decisions | PASS |
| Malicious text/body/confirmation/hash, artifact corruption denial and exact restoration, bounded durable rate state | PASS |
| Browser acceptance and correction, copied link, real PDF download/hash, manager review/revoke, separate guest/account scopes and late navigation | PASS, Playwright Chromium; trace/video disabled |
| Narrow 390px confirmation and manager review screenshots | PASS, actual screenshots visually inspected |
| Report composition/snapshot/fencing/authorization regressions | PASS |
| Actual built report worker SIGKILL, expired lease recovery and one publication | PASS |
| Foundation, incremental sync, completion/checklist bypass and media regressions | PASS, synthetic local fixtures; media includes twenty originals/60 variants and actual worker restart |
| Unit tests | PASS, 54 including real SQLite migration/outbox/retention scenarios |
| Lint, boundaries, TypeScript, generated contracts; API/web/worker build and smoke | PASS |
| Operator unit tests and static manifest checks after main reconciliation | PASS, 24 tests; no cluster mutation |
| Expo dependency check, iOS export, configured-secret scan | PASS, 45 browser/native artifacts; no native install |
| Existing checklist/project/gallery browser journeys | PASS, all seven journeys against separate synthetic browser DB |
| Task 05 physical interruption/restart/lost-upload reply | NOT RUN, retained unresolved gate |
| Additional Task 06 native photo/account/org retention UI | NOT RUN; Task 07's offline answer/restart/conflict/resolution PASS remains valid |
| Independent Mac-loss backup/key access and dependable recovery operation | NOT RUN/unconfirmed; unchanged |
| Live sharing/schema/edge/capacity/recovery release validation | NOT RUN; not authorized |

Initial failures were fixed and retained in ignored logs: SQL used a reserved column
name before migration application (transaction rolled back); a mobile test double
needed the added generated methods; browser checks found the missing selector label
and history-path scope update. A remaining test used the wrong sign-in page heading;
the corrected navigation checks use the actual manager workspace. These attempts
are not counted as passes. Logs, generated PDFs and synthetic screenshots remain
private under `.local/task08/`; committed evidence contains only nonsecret summaries.

## Publication and future release

The PR contains **Tasks 06–08**, since checklist/report dependencies are absent from
main. The preserved workflow validates PRs; publication remains conditioned on main.
The change adds report/sharing/checklist regression execution, without deployment
activation or a feature-branch publish path. Do not merge or enable auto-merge.

Future release needs additive PostgreSQL 005–007, compatible API/web/worker and
SQLite-v5 native clients, retained renderer/font versions, target-volume immutable
publication checks, bounded combined worker/API capacity and backup/restore covering
all new tables and PDF paths. The phone/live installation remains on its earlier
release; old native clients cannot consume new checklist feed entities. Existing
Task 05 backups predate these schemas and do not establish report/sharing recovery.
There is no email delivery, notification automation or paid service.

Continue only after explicit assignment of [Task 09](../prompts/09-reliability-and-recovery.md).
