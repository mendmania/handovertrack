# Task 06 — required-photo checklists and offline conflicts

> Task 07 follow-up, 2026-09-23: the retained Release simulator now passes native
> offline answer save, terminate/cold reopen, concurrent server edit, reconnect
> conflict display and explicit resolution. SQLite retains both the resolved
> conflict and accepted resolution commands. Native testing exposed/fixed the GET
> cache-buster validation regression. Further photo/account/org retention UI checks
> remain NOT RUN after the Mac locked again. See the [Task 07 handoff](07-proof-reports.md)
> for observations; this supersedes only the corresponding historical native
> NOT RUN entries below. Task 05 physical/recovery gates are unchanged.

**2026-09-23 · implemented-awaiting-validation.** Local implementation and
backend/SQLite/browser checks pass. Release simulator build/install/launch pass;
the Mac locked before the interactive native checklist scenarios could run.
Those checks are **NOT RUN**. The existing HTTPS phone, deployment, recovery
resources and all unresolved Tasks 03–05 gates remain unchanged. Task 07 has not
started.

## Source and isolation

Started with a clean working tree on `codex/k3s-trial`, HEAD
`d9a1ef5` (`Prepare native fault validation and record trial release status`).
Origin is `https://github.com/mendmania/handovertrack.git`; read-only PR inspection
reported PRs 3, 4 and 6 merged. No applicable AGENTS.md was found in the repository
or ancestor chain. Read README, implementation status, Task 06 prompt, the
Tasks 03–05 handoffs, runtime baseline and deployment/recovery runbooks. No
separate blueprint file was present in the checkout.

Work is on local branch **`codex/checklists`**, uncommitted for review. No push,
merge, deployment, automation activation, paid service, phone installation,
phone repointing, shared database migration or recovery operation occurred.
The existing phone's 23 originals/receipts, server's 25 originals/75 variants and
three stopped recovery rehearsals were not accessed or modified by this task.
Those totals are inherited Task 05 evidence, not a fresh remote inventory claim.

New local containers/volumes are `handovertrack-task06-postgres` (loopback 55546)
and `handovertrack-task06-regression` (loopback 55547), with separate private
configuration in ignored `.local/task06/`. New-schema API/web testing used
3361/3360 and synthetic media in separate test directories. Existing `.env`,
Compose configuration and migrations 001–004 retain their recorded hashes and
modes. Native testing used a **new** iOS 26.5 simulator,
`DE92B94F-367A-491F-89B4-1FD5386D04E1`, named
`HandoverTrack Task06 isolated`. The original simulator/phone data was not reused.
Owned test services are stopped at handoff; their databases, media and simulator
are retained. No global cleanup was performed.

## Implemented behavior

- Managers publish append-only template versions: stable template/question IDs,
  title, required text-answer flag and minimum distinct accepted photos per
  question. Limits: 30 questions, 300-character labels, 0–10 photos/question,
  4,000-character answers. Checklist JSON commands allow 64 KiB to accommodate
  valid multibyte text within these bounds.
- Each project has one run with its own stable ID and a frozen copy of the chosen
  template/version/title/questions. Publishing a later template version cannot
  rewrite the run. There is no run replacement/deletion workflow.
- Assigned workers and managers edit answers. Managers start runs and complete
  projects. Answer entity identity is run ID + question ID; answer versions are
  independent, so editing a different question does not create a false conflict.
- Native answers and a **separate** SQLite command outbox commit atomically.
  The original owner, command ID, project/run/question IDs and serialized command
  are frozen. Each answer's dependent commands execute in sequence; other answers
  can proceed. Pending local photos wait for their server acceptance receipts.
- Every replay authenticates the original account and rechecks current project
  access. The native transport freezes its cookie before dispatch; lifecycle/scope
  fences prevent it from using a later login's credentials or publishing late UI.
- Both clients use TanStack Query. Mobile reads SQLite, including pending/conflict
  state, through the existing scope/revision fences. Query is reconstructable.
  A reconnect/foreground pass sends eligible commands every five seconds, with
  one executor flight and a bounded timeout. Uncertain delivery keeps the command
  pending with its original ID/payload.
- Project pages show requirements, photo choices and answer state. The web adds
  template publication/version selection and completion. Mobile adds the owner-
  scoped **Checklist outbox & conflicts** screen, including retained inaccessible
  project work. Project-access restoration is required before editing/resolution.
- A conflict preserves submitted text/media IDs and the recorded server answer
  and version. A newer synced server answer is shown as the current known version.
  **Use server answer explicitly** or **Resolve with my edited answer** creates a
  new command using the reviewed version. Dependent local commands are marked
  resolved, retaining every old payload/receipt. Another concurrent edit can
  conflict again. Draft editing captures its original version, so background
  refetch does not silently convert an old draft into a last-write-wins update.

## Command and conflict matrix

| Operation / condition | Outcome |
|---|---|
| Publish template | Manager only; append version against latest baseVersion; receipt/audit/template sync event in one transaction |
| Start run | Manager only; active project and matching project baseVersion; frozen requirements; receipt/audit/checklist event |
| Answer | Manager or current assigned worker; expected answer baseVersion; accepted proof validation; receipt/audit/checklist event |
| Duplicate command / lost success reply | Same logical response, no second mutation/audit/event |
| Same key with changed payload | `409 IDEMPOTENCY_CONFLICT` |
| Stale answer version | HTTP 200 typed `outcome: conflict`, current answer/run; durable conflict receipt, no business mutation/event |
| Lost conflict reply | Same recorded conflict returned on retry, even if server has subsequently advanced |
| Explicit resolution | New command ID and reviewed expected version; original local command chain remains stored |
| Missing current access, including receipt replay | Non-enumerating 404; local payload retained and blocked |
| Unknown network/server delivery failure | Pending exact command retained for retry |
| Blocked validation/access command | Explicit retry or explicit edited resolution; no automatic payload rewrite |
| Complete via checklist command | Manager, matching project version and common completion policy |
| Existing project POST with `status=complete` | `422 COMPLETION_REQUIRED`; a new project cannot already have a valid run |
| Existing project PATCH with `status=complete` | Same completion policy and project version check as checklist completion |
| Direct database project completion | Database trigger enforces requirements as defense in depth |
| Answer edit after completion | `409 PROJECT_COMPLETE`; manager must reopen first |

Checklist commands lock membership, organization publication state and project in
consistent order. Mutations, organization revision, immutable sync publication,
audit and command receipt commit together. Injected audit failure rolls everything
back. Conflicts intentionally have only a receipt, since no business change occurs.
Template/start/project version conflicts use the existing HTTP 409 convention;
native durable answer conflicts use the typed receipt above.

## Completion policy and evidence

A project must have a frozen run. Every required text answer must be nonblank;
each question's photo minimum applies independently of its text-required flag.
A photo may satisfy multiple questions when explicitly selected; duplicates
within one answer cannot increase its count. Completion needs original acceptance,
not finished derivatives. Pending/staged local uploads or client `ready` flags
cannot satisfy it.

When linking evidence, the server requires accepted media, a committed accepted
media event and matching organization/project. Workers may newly link their own accepted
originals and retain already-authorized photo links on the current answer (so
explicitly adopting a manager answer works). Managers may link any accepted
original in their authorized project.
Completion rechecks accepted same-project media/event identity under the project
lock. Accepted media ownership and receipts remain immutable. Later unassignment
of a photographer does not erase already-authorized project evidence. Required
answers cannot be modified while the project is complete. All three application
completion entry points and the database status trigger enforce this policy.

## Migrations, sync and retention

**PostgreSQL `005_checklists.sql`** adds `checklist_templates`, `checklist_runs`,
immutable requirement enforcement, the shared completion predicate/trigger and
`template`/`checklist` sync entities. Runtime gets SELECT/INSERT on templates and
SELECT/INSERT/UPDATE on runs, with no delete grant. Existing migrations remain
checksum immutable. Existing complete project rows are preserved; any subsequent
write that keeps status complete must meet the new policy, or first reopen active.

**SQLite user_version 5** adds `cached_checklists`,
`cached_checklist_templates`, `checklist_local_answers` and `checklist_outbox`.
The same `handovertrack-projects-v1.db` filename is retained. On the first v5
upgrade only, the old cursor/last-page marker is cleared to request a checklist-
aware rebootstrap; cached projects remain available offline. Repeated v5 migration
leaves the current cursor unchanged. Outbox owner/identity/
payload columns have immutable-update triggers. Local answers and outbox have no
cascading foreign keys to disposable caches. Media tables/queues/files are unchanged.

Bootstrap includes accessible frozen runs and manager-visible template versions.
Pull publishes committed checklist/template changes with the existing signed
cursor and current authorization filters. Grants publish the current checklist
alongside project/assignment access. Rebootstrap, project or assignment tombstones,
logout, membership revocation and account/org changes remove/hide server caches,
**never local answers, outbox rows or conflict payloads**. Retained records remain
owned by the original account/org; another signed-in account sees none.

Future release requires reviewed migration 005 plus compatible API/web/mobile
artifacts. Do not reuse the old “001–004 only” release assumptions. Existing old
native apps cannot consume new checklist feed entities and deliberately refuse a
SQLite downgrade after v5. Coordinate a compatible client upgrade and rebootstrap;
do not restore an old app/database over pending work. New Task 06 commands are
not supported by the live Task 04 API. Keep the HTTPS phone unchanged until a
separately authorized compatibility/migration validation. Backup the new tables
with the full database and immutable originals; keep every previous backup.

## Validation and evidence

Private logs and synthetic screenshots are under `.local/task06/`; the committed
nonsecret manifest is [06-local-validation.json](evidence/06-local-validation.json).
The tests added are `scripts/checklist-integration.ts`,
`scripts/checklist-migration.ts`, `apps/mobile/src/checklists/store.test.ts` and
`tests/web/checklists.spec.ts`. The isolated browser config is
`scripts/playwright-task06.config.ts`. Existing browser tests now accept an
explicit API origin and artifact directory so they can run away from development
services and previous screenshots.

| Check | Result / actual scope |
|---|---|
| Lint/boundaries, TypeScript, generated contracts | PASS |
| All unit tests | PASS: 54 tests, including eight new real SQLite/outbox scenarios |
| Real SQLite v4→v5, repeated migration, close/reopen | PASS: original media row, acceptance receipt and queue preserved |
| Offline save atomicity, frozen ID/payload, duplicate insert/fence rollback | PASS, actual temporary SQLite connections |
| Lost committed response, per-entity ordering, wrong-account transport | PASS, real SQLite plus controlled transport |
| Conflict/descendant preservation and explicit resolution across rebootstrap, tombstone, logout and reopen | PASS, real SQLite |
| PostgreSQL 004→005 twice | PASS: 17 existing public data table hashes unchanged; migration ledger append only |
| Real HTTP template/run/answer/receipt/sync/auth tests | PASS |
| Simultaneous worker/manager edit and stable conflict replay | PASS, real HTTP/PostgreSQL |
| Injected audit failure / same-key retry | PASS: no partial answer, revision, receipt or event |
| Required-answer/evidence and completion-bypass matrix | PASS, real HTTP, uploaded synthetic JPEG originals and database status trigger |
| Foundation and incremental sync regressions | PASS, isolated DB/API |
| Media regression | PASS: twenty synthetic assets, retries, actual compiled-worker kill/restart, private originals/derivatives; not physical capture |
| API/worker/web build and compiled API/worker smoke | PASS |
| Browser checklist + project/scope/gallery regressions | PASS: seven Playwright journeys; screenshot reviewed |
| Expo dependency check and iOS export | PASS |
| Browser/native artifact secret scan | PASS, isolated configured secrets |
| Native Release build/install/launch | PASS, new isolated iOS 26.5 simulator; sign-in screen observed |
| Interactive native offline answer/restart/conflict/photo-choice/logout flow | NOT RUN: Mac locked before simulator interaction; no automatic unlock succeeded |
| Physical phone Task 06 / Task 05 fault scenarios | NOT RUN; existing HTTPS phone preserved |
| Live Task 06 schema/routes/deployment | NOT RUN; not authorized |
| Independent recovery custody/destination/operator decisions | NOT RUN/unconfirmed; unchanged Task 05 gate |

Failed attempts are retained, not counted as passes. Initial schema validation
stripped fields from discriminated command bodies; disabling AJV's additional-
property stripping fixed this and now rejects forged fields. Two old SQLite
fixtures assumed v4/pre-migration APIs; corrected fixtures now test genuine old
SQL rows before upgrading. Initial server fixtures omitted upload accountId and
used a symlinked temporary root; fixed to match the real media contract. A media
regression initially encountered checklist fixture jobs in another media root;
reran against its own fresh regression database. An initial foundation run used
process NODE_ENV=test, which disables Better Auth's library Origin checks;
using development process mode with test application configuration restores the
intended real Origin regression. An isolated Next build attempted development
mode; the production build passed. Browser selector/host-only-cookie fixture
issues were fixed, then all seven journeys passed. None of these attempts touched
live/phone data or required repeating already-passed Task 05 physical scenarios.

## Remaining gates and next task

Do not label Task 06 fully complete yet. On an unlocked Mac, use this isolated
simulator/backend to finish native UI offline save → terminate/reopen → concurrent
server edit → reconnect → explicit conflict resolution, photo selection and
logout/account/scope retention checks. The automated SQL/HTTP results are narrower
than native UI evidence. Preserve the new simulator DB and queues during that work.

Task 05's physical interruption/restart/lost completion-response cases, independent
Mac-loss recovery access and accepted dependable backup operation remain open.
These did not block independent local Task 06 development and are not waived.
Continue with [Task 07's prepared prompt](../prompts/07-proof-reports.md) only after
an explicit assignment. No report/PDF/share/customer flow was implemented.
