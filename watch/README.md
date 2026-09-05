# Golf Games — Garmin watch app

A Connect IQ watch-app scaffold for entering side-game results (nearest to the
pin, hole winner, fewest putts) from the wrist. This is the toolchain-proof
scaffold: a hello-world view and a smoke test. The build, the unit-test build,
and the test harness itself are proven with captured evidence. The view
rendering is not — see "Run in the simulator" below.

## Environment

- SDK: `~/Library/Application Support/Garmin/ConnectIQ/Sdks/connectiq-sdk-mac-9.2.0-2026-06-09-92a1605b2/`
- Target device: `fenix847mm` (Fenix 8, 47mm — round 454x454 AMOLED, the only
  device installed in this SDK)
- Developer key: `~/.Garmin/developer_key.der`
- `minApiLevel="5.0.0"` in `manifest.xml` (SDK 9.2.0's compiler accepted this
  without complaint for `fenix847mm`, but this was **not** checked against an
  authoritative device-to-API-level table — none was found in the SDK docs.
  If a later task needs an API feature near this floor, verify its
  availability at 5.0.0 rather than assuming it's covered.)
- Launcher icon size for `fenix847mm`: 65x65 px (from the SDK's device
  reference page for this device — `doc/docs/Device_Reference/fenix847mm.html`)

Set `SDK` once per shell session:

```bash
SDK=~/Library/Application\ Support/Garmin/ConnectIQ/Sdks/connectiq-sdk-mac-9.2.0-2026-06-09-92a1605b2
```

All commands below assume `cd watch` first.

## Build

```bash
"$SDK/bin/monkeyc" -f monkey.jungle -o bin/golfgames.prg -y ~/.Garmin/developer_key.der -d fenix847mm
```

Produces `bin/golfgames.prg`. `bin/` is gitignored — build output is never
committed.

## Unit tests

Build with `--unit-test` (this compiles in the `(:test)`-annotated functions,
which are stripped from normal builds):

```bash
"$SDK/bin/monkeyc" -f monkey.jungle -o bin/golfgames-test.prg -y ~/.Garmin/developer_key.der -d fenix847mm --unit-test
```

Start the simulator once (it must already be running before `monkeydo` will
work):

```bash
"$SDK/bin/connectiq" &
```

Run the tests against it:

```bash
"$SDK/bin/monkeydo" bin/golfgames-test.prg fenix847mm -t
```

Expected output ends with:

```
RESULTS
Test:                               Status:
smokeTestTrue                       PASS
smokeTestArithmetic                 PASS
Ran 2 tests

PASSED (passed=2, failed=0, errors=0)
```

`monkeydo`'s process exit code is not a reliable pass/fail signal (it returned
`1` even on a fully-passing run in this environment) — parse the printed
`RESULTS` block instead.

## Run in the simulator

With the simulator running (see above):

```bash
"$SDK/bin/monkeydo" bin/golfgames.prg fenix847mm
```

This pushes and launches the non-test build. **What this actually proves, and
what it doesn't:** the `monkeydo` process connects to the simulator and stays
alive with no crash or exception — that's real evidence the signed `.prg`
installs and starts. It is **not** evidence that `HelloView` renders. No
simulator log or exception trace was captured for this run, and the unit-test
run (which *does* produce captured, verifiable output) never touches
`HelloView` or the layout resource — it's a different code path entirely.
Nobody has visually confirmed the "Golf Games" label actually appears on
screen. Do that 10-second check on a real desktop before relying on this view
rendering correctly; it closes a real, currently-open gap, not a
belt-and-braces extra. Every later Phase B view task inherits this same
unverified-rendering limitation until someone does that check.

## Things that tripped us up

- **`-y` wants the `.der` key, not the `.pem`.** `~/.Garmin/` holds both
  `developer_key.pem` and `developer_key.der` (PKCS8 DER, no passphrase, per
  Garmin's own `openssl genrsa … | openssl pkcs8 -topk8 … -outform DER`
  recipe). Pointing `-y` at the `.pem` fails with
  `ERROR: Unable to load private key: java.security.InvalidKeyException: Unable to decode key`.
  Use the `.der` file.
- **`monkeydo`'s test flag is `-t`, not `/t`.** The SDK's own Unit Testing doc
  shows the Windows-batch invocation (`monkeydo.bat … /t`) and it's easy to
  copy that verbatim on macOS. The mac `monkeydo` script takes `-t` (see
  `monkeydo --help` for the exact usage line); the docs page is just written
  for the Windows binary's syntax.
- **Unit test sources need `Toybox.Lang` imported explicitly** for the
  `Boolean` return type on `(:test)` functions — the compiler error
  (`Cannot resolve type 'Boolean'.`) doesn't obviously point at a missing
  import.
- **The `tests/` directory is not on the source path by default.** The
  default jungle only sets `base.sourcePath = source`. `monkey.jungle` here
  adds `base.sourcePath = source;tests` explicitly. Unit-test-annotated code
  in that path is still automatically excluded from non-`--unit-test` builds,
  so this is safe to leave in for normal builds too.
- **No sample in the SDK actually uses `(:test)`.** The `Toybox.Test` API
  shape came from `doc/docs/Core_Topics/Unit_Testing.html`, not from
  `samples/`.
- **Visually confirming the rendered view from this session wasn't possible**
  — this coding environment's screen capture doesn't show the actual GUI
  windows (a sandboxing quirk, not a toolchain problem: a freshly-launched
  simulator still reported zero AXWindows to System Events). `monkeydo`
  connecting and staying alive without a crash only proves the signed `.prg`
  installs and starts; it says nothing about whether `HelloView.onLayout`
  resolved the layout or whether anything actually appears on screen. Don't
  read "the app runs" as "the view renders" — see "Run in the simulator"
  above for what's actually unverified.

## Project layout

- `manifest.xml` — app id, `type="watch-app"`, `fenix847mm` product,
  `Communications` permission (needed later for talking to the web API),
  `minApiLevel="5.0.0"`.
- `monkey.jungle` — points at the manifest; adds `tests/` to the source path.
- `source/GolfGamesApp.mc` — `Application.AppBase` entry point.
- `source/views/HelloView.mc` — the one view, rendering `resources/layouts/layout.xml`.
- `resources/` — strings, the 65x65 launcher icon, and the layout.
- `tests/SmokeTest.mc` — two `(:test)` functions proving the harness reports
  both pass and fail correctly.
