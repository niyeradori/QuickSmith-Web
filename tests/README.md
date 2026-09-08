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

`run.sh` runs three things in order:

1. `tests/standalone.js` — loads `engine.js` and *nothing else at all* and
   solves a few known networks. If the solver ever reaches back out for jQuery,
   math.js or the DOM, this fails first with a `ReferenceError`.
2. `tests/render.js` — checks the chart's grid geometry (pure arithmetic: a
   constant-resistance circle has to cross the real axis at `(r-1)/(r+1)` and
   touch the rim at Γ = 1), then mounts and renders a real chart against a
   small DOM stub. It cannot tell you the chart *looks* right — only a browser
   does that — but it proves the renderer runs end to end and builds the tree
   it claims to.
3. `tests/run.js` — the full case suite.

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
| Phase 1&2 fixes | the September 2026 review | parallel equivalent, insertion-loss reference, numeric output, infinite return loss, transmission-line transfer function |

37 cases, 129 checks, plus 8 standalone checks on the engine.

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

- `Example 5` claims ≥ 60 dB at 100 MHz; the shipped `Filter.sch` gives
  53.25 dB. The suite pins the computed value, not the prose.
- Insertion loss is a *transducer* loss from a `Z0` source into the actual load,
  so it includes mismatch as well as dissipation. That is the useful definition
  and the one the FAQ describes, but it is not the same as "loss of the
  two-port in isolation".

## Where the numbers come from

`tests/harness.js` drives the real globals — `schObj`, `resultsObj`, `ampObj` —
because that is the interface `index.html`, `InsertionLoss.html` and
`AmplifierDesign.html` actually use. Since Phase 2 those globals are a thin
adapter in `sch.js` over `QSEngine.solve()` in `engine.js`, so a passing run
exercises both the solver and the adapter.

When the adapter is eventually removed, `tests/harness.js` is the one file that
has to change; `tests/cases.js` should survive untouched.

## Fixed since the first run of this suite

Kept here because the fixes are what several of the cases exist to hold in
place:

- `parallelEquiv()` used `Qu ^ 2`, a bitwise XOR rather than a square.
- Insertion loss was referenced to `Re(Z_load)` instead of `Z0`.
- Results were stored as 16-significant-digit strings and re-parsed.
- Gamma was floored at `1E-36`, so a perfect match could not report ∞ dB.
- A transmission line was reduced to a lumped series impedance when computing
  the transfer function — correct for `Zin`, wrong for insertion loss. A
  lossless 75 Ω quarter-wave line into a 50 Ω load reported 4.22 dB where the
  answer is 0.695 dB, its mismatch loss. The solver now cascades every element
  as an ABCD matrix, so lines, stubs and lumped parts go through one code path.
