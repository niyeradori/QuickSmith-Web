# QuickSmith regression tests

A safety net for modernising QuickSmith. Every case comes from a worked example
that already ships with the program, so the suite encodes what the program is
*supposed* to compute, not just what it currently happens to compute.

## Running

```sh
./tests/run.sh              # summary
./tests/run.sh --verbose    # every individual check
./tests/run.sh --json       # machine-readable
```

No toolchain required. `run.sh` uses `node` if it is installed, otherwise it
falls back to the JavaScriptCore shell that ships with macOS
(`/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc`).

In a browser, from the repo root:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/tests/
```

(The browser runner has to be served over HTTP so it can `fetch` the `.sch`
fixtures.)

## What it covers

| Case group | Source | What breaks if it fails |
|---|---|---|
| Ex1 a/b/c | `EXAMPLE_1.html` | series-R / series-X / shunt-X loci on the chart |
| Ex2 | `EXAMPLE_2.html` | L-network, 500 Ω → 50 Ω at 100 MHz |
| Ex3 | `EXAMPLE_3.html` | series line + open stub, lengths in mm |
| Ex4 | `EXAMPLE_4.html`, `sch/Dipole.sch` | frequency-dependent load, gamma interpolation, short stub referenced to TDF, whole-band sweep |
| Ex5 | `EXAMPLE_5.html`, `sch/Filter.sch` | insertion loss / S21 through a 5-pole filter with finite component Q |
| Ex6 i/o | `EXAMPLE_6.html`, `OUTPUT_MATCH.html` | AN721 large-signal input and output matches |
| Ex7 | `EXAMPLE_7.html` | amplifier stability (K, \|Δ\|), MAG, stability-circle geometry |
| Coverage | `sch/test.sch` + synthetic | every element type: `r l c x t o s g rx slc plc src prc` |
| Q | synthetic | finite-Q loss model for C, L, PLC, SLC |
| Units | synthetic | `Inches / MilliMeters / Meters / Degrees / Wave Lengths` all agree |
| Invariants | synthetic | quarter-wave transform, half-wave transparency, empty ladder |

27 cases, 100 checks.

## How the expected values were produced

Each case has up to two expectation blocks:

- **`assert`** — the claim the example itself makes ("this matches to 50 Ω",
  "VSWR stays under 2:1", "K = 1.504"), with a loose tolerance. These are
  statements about physics. If one fails, the answer is wrong.
- **`expect`** — golden values pinned to 4–6 digits with a tight tolerance.
  These were computed by a **separate** complex-arithmetic model of the ladder
  network written from the element equations, *not* captured from this
  codebase's output, and then confirmed to agree with the engine. So they are a
  genuine cross-check. If one fails, behaviour changed — which may be a fix or a
  regression, and you have to decide which.

Several cases need no golden data at all because they are true by construction:
a quarter-wave line must give Z₀²/Z_L in all five length units, a half-wave line
must be transparent, and a ladder of wires must pass the load through.

## Adding a case

Append to `tests/cases.js`. Two shapes:

```js
{
  id: "my-case",
  name: "Human readable name",
  ref: "where this came from",
  setup: {                       // ...or  schFile: "sch/Something.sch"
    freq: 100, Z0: 50, VF: 1, TDF: 100, LU: "Inches",
    load: { type: "rx", value1: 50, value2: 0 },
    elements: { 2: { type: "l", value1: 240, q: 100 } }   // even = series, odd = shunt
  },
  assert: { ZinR: [50.0, 1.0] },        // [expected, tolerance]
  expect: { VSWR: [1.009996, 1e-5] }
}
```

Add `sweep: { start, stop, step }` for a band sweep (gives you `maxVSWR`,
`maxVSWRat`, `minVSWR`, `minVSWRat` and `Metric@freq` keys), or
`sweepPoints: [1, 10, 100]` for specific frequencies, or an `amp: { S11M: ... }`
block for amplifier-side checks.

Metric names are whatever `QSHarness.measure()` returns: `ZinR ZinI ZinMag
ZinAng YinR YinI GammaR GammaI GammaMag GammaAng VSWR ReturnLoss InsertionLoss
S21Mag S21Ang`, plus `K DeltaMag GPMAX stable stabilitySourceMag
stabilitySourceRad stabilityLoadMag stabilityLoadRad` for `amp` cases.

## Known limitations of the code under test

Things the suite deliberately does **not** assert, because they are current
behaviour that should probably change:

- `ReturnLoss` returns ~316 dB rather than ∞ for a perfect match, and
  `InsertionLoss` returns ~308 dB, because `Γ` is floored at `1e-16` rather than
  handled as an exact zero.
- `InsertionLoss` / `S21` are referenced to a source impedance equal to
  **Re(Z_load)**, not to `Z0`. They are only meaningful when the load is the
  system impedance (as in `Filter.sch`). Feeding Ex2's 500 Ω load through the
  same path gives 4.77 dB, which is not the insertion loss of anything useful.
- `parallelEquiv()` in `sch.js` uses `Qu ^ 2`, which in JavaScript is a bitwise
  XOR, not a square — a literal translation of the original VB `^`. The parallel
  equivalent it reports is wrong. Fixing it will need a new golden value.
- `Example 5` claims ≥ 60 dB at 100 MHz; the shipped `Filter.sch` gives 53.25 dB.
  The suite pins the computed value, not the prose.

The harness talks to the engine through global `schObj` / `resultsObj` /
`ampObj`, because that is the only interface there is. If the engine is ever
extracted into a module with a real API, `tests/harness.js` is the one file that
has to change; `tests/cases.js` should survive untouched.
