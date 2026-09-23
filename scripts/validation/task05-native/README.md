# Task 05 native controls — temporary build overlay

These controls are **not part of the normal mobile runtime**. `overlay.py` adds
a temporary transport wrapper, native NSURLSession delegate instrumentation and
an identifying Info.plist key to a special local Release build. It saves original
bytes first and refuses concurrent edits on restore. No server, TLS, authorization,
SQLite schema, accepted receipt or original photo is changed. Templates are inert
until explicitly applied. Do not install the validation build for normal use.

Current physical results and exact artifact hashes belong in
`docs/progress/evidence/05-native-fault-preparation-20260922.json`.
Synthetic checks establish control logic only; they do not establish physical
transfer timing, phone restart, radio loss or server reconciliation.

## Preparation

1. Save a fresh read-only Documents copy, process state, source health and server
   media inventory. Verify every baseline original/owner/receipt and retained
   recovery resource. Keep the phone offline while preparing new cases.
2. Preserve and verify the prior signed app. Apply `overlay.py apply --directory
   <new-private-overlay-directory> --baseline <phone-baseline.json>`.
   Baseline format is `{at_unix, media: [...media_local], queue: [...media_queue]}`.
   Existing IDs are embedded as forbidden targets; capture timestamps must be
   later than this baseline. This does not preselect an unknown future capture.
3. Run `python3 scripts/validation/task05-native/test-native.py`, mobile
   typecheck and `vitest run` for the generated `task05-faults.test.ts` plus
   media/store regressions. The native harness compiles the exact delegate code
   with a fake task and synthetic counters; it makes no network requests.
4. Run `pod install` in the existing generated iOS directory, using the pinned
   Node toolchain, after preserving Podfile.lock/Manifest.lock and project config.
   The overlay temporarily selects `expo.autolinking.buildFromSource` for only
   `expo-file-system`; SDK 57 otherwise silently links its precompiled framework
   and omits the patched delegate. Verify the build log compiles that `.m` file.
   Build Release with the verified existing signing setup, HTTPS origin and
   `EXPO_NO_DOTENV=1`. Save the resulting signed app separately, verify its
   signature, bundle identity/profile, schema compatibility, HTTPS URL and
   `Task05ValidationBuild=task05-native-faults-v1`. Require the signed executable
   to contain the native journal strings, not merely the JS wrapper. Do not install while phone
   interaction/offline confirmation is unavailable.
5. Restore the overlay with `overlay.py restore --directory <same-directory>`.
   It restores source, package.json, the Expo dependency and Info.plist byte-for-byte
   and removes only its generated files. Run `pod install` again with normal
   configuration and rebuild the normal Release; verify no native/JS fault marker
   or Info.plist test key remains. Retain journals, signed builds and logs.

## One physical case at a time

With the owner's confirmed offline phone, verify the baseline again and install
the compatible special app **in place**, never uninstall/erase. Recopy Documents
and verify originals/receipts/schema before requesting one new disposable capture.
The installed build has no active control until a named control file is supplied.
Keep it offline until the new ID is known and the following control is verified.

Use `prepare-control.py --baseline <baseline> --phone-documents <fresh-copy>
--server-snapshot <fresh-server-json> --media-id <new-id> --kind
cancel|terminate|completion --output <new-private-control.json>`. It refuses
baseline or server IDs, changed baseline receipts/bytes, attempted or accepted
rows, and mismatching original manifests. Use a distinct new ID and case UUID
for each physical case. The command writes only a local file; it does not arm
the phone. Verify the fresh server inventory is from the intended live source.

Copy **only** that file through `devicectl device copy to` to the app's
`Documents/task05-control.json`. Read it back and compare bytes before asking for
reconnect. Preserve the previous released control locally before replacing it;
never replace an armed case. No wildcard or batch arming exists. Do not include
credentials in any control or evidence file.

- **cancel:** the native `didSendBodyData` delegate synchronously suspends then
  cancels the exact HTTPS session when both callback and task byte counters are
  positive and incomplete. It records `task05-<case>-native.json` before returning
  to JS, then records final task counters/error in `native-finished.json` on task
  completion. Require `0 < finalTaskBytesSent < expectedBytes`, cancellation,
  server pending/not accepted, unchanged original and the persisted upload ID.
  A partial callback alone does not prove partial delivery. Missing a partial
  callback, full delivery or absent final evidence is **not a PASS**.
- **terminate:** the same delegate suspends unfinished native work and records
  timing/counters. While the native task is suspended, record process ID,
  SQLite upload/session state and live server pending/staged/accepted state.
  Terminate only this app, record the command/time, then reopen and reconcile.
  The ordinary 120-second transport timeout is unchanged. If it cancels before
  termination, or no unfinished work is established, do not claim this case.
- **completion:** normal binary PUT and real HTTPS completion run unchanged.
  Only a successful matching accepted response is saved to
  `task05-<case>-completion.json` and withheld from UploadExecutor by throwing.
  Verify the independently committed server receipt while SQLite has no accepted
  receipt. Label this **controlled response-delivery loss**, never radio loss.
  Rejected completion or lost PUT response does not establish this case.

All cases write an immutable `task05-<case>-binding.json` before dispatch. This
binds original ID/owner/hash/size to the real upload session. Holds survive wrapper
or app restart. A cancel/terminate case never dispatches completion while armed,
including when the native trigger is missed. Preserve failure evidence promptly;
held automatic attempts can eventually display retry exhausted. This does not
delete/reset identity or permit replaying accepted rows.

After recording the fault, save the original control, change only its action to
`release` in a **new local file**, copy/read-verify that file on the phone, then
reopen or use normal Retry blocked uploads. Keep every journal/binding/result.
Verify identical media/session/owner/hash, one accepted asset, one logical job,
one accepted/ready event pair and three decoded variants. Verify late progress
and recovery cannot downgrade accepted SQLite state. Record owner observations
separately from USB/server measurements; totals are baseline plus actual new IDs.

Finally release the last case, reinstall the preserved compatible normal signed
app in place, verify normal behavior and all original/receipt identities, and
recheck healthy source workloads. There must be no active test control or special
build left in ordinary use. Retain evidence and originals. Take a fresh verified
bounded-transfer backup after actual new captures; preserve all previous attempts.
Do not allocate another full restore unless a specific failure warrants it.
Task 06 and customer intake remain outside this procedure.
