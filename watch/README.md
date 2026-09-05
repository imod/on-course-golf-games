# Golf Games — Garmin watch app

A Connect IQ watch-app scaffold for entering side-game results (nearest to the
pin, hole winner, fewest putts) from the wrist. The build, the unit-test
build, the test harness, view rendering, and the API client are all proven
with captured evidence — see "Run in the simulator" and "Talking to the web
API" below.

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

This pushes and launches the non-test build, and the "Golf Games" label
rendering has been visually confirmed from a screenshot of the simulator
window (see recipe below) — this is no longer an open gap for later Phase B
view tasks.

### Screenshotting the simulator window

The coding environment's own screen capture doesn't show the simulator's GUI
window, and `osascript`/System Events returns nothing for it (zero AXWindows)
— that turned out to be because driving the simulator through the
Accessibility API needs Accessibility permission this environment doesn't
have, not because the window can't be captured at all. **`osascript` was the
wrong tool, not a hard limit.** The actual working recipe, in order:

1. Build the non-test `.prg` (see "Build" above).
2. Make sure the simulator is running:
   ```bash
   open -a "$SDK/bin/ConnectIQ.app"
   ```
3. Push and launch the app:
   ```bash
   "$SDK/bin/monkeydo" bin/golfgames.prg fenix847mm
   ```
4. Find the simulator window's CoreGraphics window id. `System Events`
   doesn't see it, but `CGWindowListCopyWindowInfo` does — via Python's
   `ctypes`, calling straight into the `CoreGraphics`/`CoreFoundation`
   frameworks, with **no `pyobjc` dependency needed**:
   ```bash
   python3 tools/winlist.py
   ```
   prints a line like
   `OWNER='Connect IQ Device Simulator' NAME='CIQ Simulator - ...' WID=13476.0 ...`.
5. Capture that window by id (`-l`), to a file, without the cursor:
   ```bash
   screencapture -x -o -l<WID> out.png
   ```

`watch/tools/winlist.py` is version-controlled so this recipe stays
reproducible; every later view task should use it to produce its own
screenshot rather than re-deriving the CGWindowList approach from scratch.

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
- **A `(:test)`-tagged variable or class can't be referenced directly from
  code that ships in a normal build**, even guarded by an `if` — the
  compiler resolves identifiers statically, so an unguarded reference is a
  compile error ("Undefined symbol") regardless of whether it's reachable at
  runtime. The fix is the same `has` pattern the SDK itself uses to call an
  API that may not exist on a given device (e.g. `Communications has
  :registerForPhoneAppMessages`): guard each excluded symbol with its own
  `has` check naming that exact symbol. One combined check isn't enough —
  `new SomeExcludedClass()` needs its *own* `has :SomeExcludedClass` guard
  even inside a block already guarded by `has` on a different symbol, or the
  compiler still rejects it with "Cannot instantiate object of excluded
  type" in a normal build. See `ResultQueue.save()`.
- **A `(:test)`-tagged function is not just excluded from normal builds — it
  is auto-discovered and *run* as a unit test** by `monkeydo -t`, regardless
  of its signature. A `(:test)` helper function that doesn't take a
  `(logger as Test.Logger) as Boolean` shows up in the `RESULTS` block as an
  `ERROR` ("Too Many Arguments"). Only variables and classes can safely
  carry `(:test)` as an implementation-detail exclusion tag; a function
  tagged `(:test)` is a test, full stop.
- **The Connect IQ simulator enforces "Device HTTPS Requirements" like a
  real watch does** — `Communications.makeWebRequest` to a plain `http://`
  URL fails immediately with responseCode `-1001`
  (`SECURE_CONNECTION_REQUIRED`), before any network attempt. This is a
  per-simulated-device setting (grouped in the binary next to things like
  `SleepMode`/`WheelchairMode`), editable only from the simulator's Device
  Settings dialog — it is **not** the kind of thing that persists in
  `simulator.ini` or a `defaults write com.garmin.connectiq.simulator`
  preference; both were tried and had no effect. See "Talking to the web
  API" below for what this means for local testing.
- **The simulator does not trust a self-signed local HTTPS certificate.** A
  request to `https://` with a self-signed cert fails with responseCode
  `404` — not a distinct TLS-error code — which briefly looked like a
  routing problem rather than a certificate one. `curl` without `-k` against
  the same URL fails the same way ("SSL certificate problem: self signed
  certificate"), confirming it's the OS/runtime TLS trust store rejecting
  the cert, not anything specific to Connect IQ.

## Talking to the web API

`ApiClient.mc` calls the three `/api/w/*` endpoints; `RoundStore.mc` persists
the selected round, its cached configuration, and the last standings.
Neither `apiBaseUrl` nor `watchToken` is ever typed on the watch — both come
from `resources/settings/settings.xml`, set from the phone (Garmin Connect
Mobile / Garmin Express) in production, or, for local testing, from the
simulator's own Property Editor: with the app running in the simulator, use
the simulator's **Settings > App Settings...** (or right-click the app in
the simulator and choose the equivalent property-editor item) to set both
fields, matching the fields declared in `settings.xml`. `monkeydo` itself has
no flag for this (`--help` lists only `-n`/`-a`/`-t`) — it's a GUI dialog,
which this session's verification below worked around by calling
`Application.Properties.setValue()` directly from a temporary debug harness
instead (removed before committing) rather than driving that dialog. The
watch token's value lives in the repo root's `.env.local` as `WATCH_TOKEN`
(`.env.local` is gitignored) — **never commit it or paste it into anything
under `watch/`.**

### What was actually verified against the running local server

With the Next.js app and local Supabase running, and a round created via the
admin API (`POST /api/rounds`) with three players and one `allowTies: true`
challenge, all three endpoints were exercised with `curl` against
`http://localhost:3000` using the exact wire shapes the watch sends and
receives:

- `GET /api/w/rounds` with `x-watch-token` → `{"rounds":[{"code":"G431J7N319","n":"Watch Test Round","d":"2026-09-05"}]}`;  401 confirmed without the header.
- `GET /api/w/G431J7N319` → `{"round":"Watch Test Round","hole_count":18,"players":[...],"challenges":[{"id":"...","n":"NTP","pts":[3,2,1],"holes":null}]}`.
- `POST /api/w/G431J7N319/result` with a tied second place —
  `"ranks":["<alice>", ["<bob>","<carol>"]]` — returned
  `{"ok":true,"standings":[{"id":"<alice>","p":3},{"id":"<bob>","p":2},{"id":"<carol>","p":2}]}`:
  both tied players correctly got the second-place points (`2`), not `2` and
  `1` — confirming the server's tie-consuming scoring, not just that the
  request was accepted.

### The tie-serialization question: resolved, with a caveat

Whether Monkey C's JSON encoding of `Ranking.toRanks`'s heterogeneous array
(bare strings mixed with `Array<String>` sub-arrays for ties) actually
produces that shape on the wire was unproven going into this task. It's now
proven: a real `Communications.makeWebRequest` POST (the exact call
`ApiClient.submitResult` makes) with body
`{"rc"=>"test-rc","hole"=>2,"ranks"=>["p1", ["p2","p3"], "p4"]}` was sent to
`https://httpbin.org/post` (a public HTTPS echo endpoint, chosen because the
simulator would not complete a request to the local server — see the HTTPS
findings above), which echoed back the **raw bytes it received** as:

```
{"ranks":["p1", ["p2", "p3"], "p4"], "hole":2, "rc":"test-rc"}
```

That is exactly the intended heterogeneous shape — a bare string, a nested
tie array, another bare string — confirmed from the actual wire bytes, not
just the round-tripped/re-parsed response. Combined with the `curl` evidence
above (the server correctly turns that exact shape into tie-consuming
scoring), the full tie contract — Monkey C encodes it correctly, and the
server decodes it correctly — is verified end to end, just not in a single
watch-to-local-server request.

**The caveat**: `ApiClient.listRounds`/`fetchRound`/`submitResult` were not
exercised against the local server from inside the simulator itself, because
of the two simulator/TLS limitations above (device-enforced HTTPS, and no
trust for a local self-signed cert) — fixing either requires either a
one-time interactive `mkcert -install` (needs a password prompt) or toggling
the simulator's Device Settings dialog by hand; neither was available in
this session. A future task connecting the UI to `ApiClient` should get a
real local HTTPS certificate trusted once (`mkcert -install`, run
interactively by a developer) and re-run this same round-trip end to end
before relying on it further.

## Project layout

- `manifest.xml` — app id, `type="watch-app"`, `fenix847mm` product,
  `Communications` permission, `minApiLevel="5.0.0"`.
- `monkey.jungle` — points at the manifest; adds `tests/` to the source path.
- `source/GolfGamesApp.mc` — `Application.AppBase` entry point.
- `source/views/HelloView.mc` — the one view, rendering `resources/layouts/layout.xml`.
- `source/Ranking.mc` — pure tap/tie/points logic shared in spirit with the
  web app's scoring.
- `source/ResultQueue.mc` — the persistent, replay-safe submission queue.
- `source/ApiClient.mc` — the watch's only networking code: the three
  `/api/w/*` calls.
- `source/RoundStore.mc` — persisted selected-round state (code, cached
  config, last standings).
- `resources/` — strings, the 65x65 launcher icon, the layout, and
  `resources/settings/settings.xml` (the `apiBaseUrl`/`watchToken` app
  settings).
- `tests/` — the unit test suite (`SmokeTest.mc`, `RankingTest.mc`,
  `ResultQueueTest.mc`).
- `tools/winlist.py` — finds the simulator window's CoreGraphics window id
  for `screencapture`, since `osascript`/System Events can't see it here.
