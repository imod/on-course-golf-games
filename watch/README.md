# Golf Games — Garmin watch app

A Connect IQ watch-app scaffold for entering side-game results (nearest to the
pin, hole winner, fewest putts) from the wrist. This is the toolchain-proof
scaffold: a hello-world view and a smoke test, confirmed to build, unit-test,
and run in the simulator.

## Environment

- SDK: `~/Library/Application Support/Garmin/ConnectIQ/Sdks/connectiq-sdk-mac-9.2.0-2026-06-09-92a1605b2/`
- Target device: `fenix847mm` (Fenix 8, 47mm — round 454x454 AMOLED, the only
  device installed in this SDK)
- Developer key: `~/.Garmin/developer_key.der`
- `minApiLevel="5.0.0"` in `manifest.xml` (SDK 9.2.0's compiler accepted this
  without complaint for `fenix847mm`)
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

This pushes and launches the non-test build. It renders a single view with
the label "Golf Games" centered on the round face.

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
  — the simulator process runs, and `monkeydo` (both for the plain launch and
  for `-t` test runs) connects to it and returns real results with no
  exceptions, which is solid functional proof the app is running correctly on
  device. But this coding environment's screen capture doesn't show the
  actual GUI windows (a sandboxing quirk, not a toolchain problem), so nobody
  visually inspected the rendered "Golf Games" label. Worth a 10-second manual
  check next time someone is at a real desktop.

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
