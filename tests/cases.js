/*
 * QuickSmith regression test cases.
 *
 * Every case is derived from the worked examples that ship in
 * help/examples/examples/ (and the .sch files in sch/).  Each case carries two
 * kinds of expectation:
 *
 *   assert  - the claim the textbook/example actually makes ("this matches to
 *             50 ohms", "VSWR stays under 2:1").  Loose tolerances.  If one of
 *             these breaks, the physics is wrong.
 *   expect  - golden numbers pinned to 4-6 digits.  These were produced by an
 *             independent complex-arithmetic model of the ladder (not by the
 *             engine itself) and then confirmed to match the engine, so they
 *             are a real cross-check, not a snapshot of whatever the code
 *             happened to print.  If one of these breaks, behaviour changed.
 *
 * Metric names come from QSHarness.measure() in harness.js.
 *
 * Runs in three places, all of which just load this file as a plain script:
 *   tests/run.sh          (jsc or node, headless)
 *   tests/index.html      (browser, no install)
 */

var QS_CASES = [

  /* ---------------------------------------------------------------- EXAMPLE 1
   * "Resistance and Reactance" - the three basic loci on the chart.
   * help/examples/examples/EXAMPLE_1.html
   */
  {
    id: "ex1a-series-r",
    name: "Ex1a: series R sweeps along the real axis",
    ref: "EXAMPLE_1.html (trace a)",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 0, value2: 0 },
      elements: { 2: { type: "r", value1: 50 } }
    },
    assert: { ZinI: [0, 1e-9], VSWR: [1.0, 1e-6] },
    expect: { ZinR: [50.0, 1e-9] }
  },
  {
    id: "ex1b-series-x",
    name: "Ex1b: series X rides the constant-R circle",
    ref: "EXAMPLE_1.html (trace b)",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 50, value2: 0 },
      elements: { 2: { type: "x", value1: 50 } }
    },
    // constant resistance: the real part must not move off 50
    assert: { ZinR: [50.0, 1e-9] },
    expect: { ZinI: [50.0, 1e-9], VSWR: [2.618034, 1e-5] }
  },
  {
    id: "ex1c-shunt-x",
    name: "Ex1c: shunt X rides the constant-G circle",
    ref: "EXAMPLE_1.html (trace c)",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 50, value2: 0 },
      elements: { 3: { type: "x", value1: 50 } }
    },
    // constant conductance: real part of Y must not move off 1/50 S = 20 mS
    assert: { YinR: [20.0, 1e-6] },
    expect: { ZinR: [25.0, 1e-9], ZinI: [25.0, 1e-9], VSWR: [2.618034, 1e-5] }
  },

  /* ---------------------------------------------------------------- EXAMPLE 2
   * L-network matching 500 ohms to 50 ohms at 100 MHz.
   * Shunt C3 = 9.5 pF, series L4 = 240 nH.
   */
  {
    id: "ex2-l-network",
    name: "Ex2: L-network matches 500 ohm to 50 ohm @ 100 MHz",
    ref: "EXAMPLE_2.html",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 500, value2: 0 },
      elements: {
        3: { type: "c", value1: 9.5 },
        4: { type: "l", value1: 240 }
      }
    },
    assert: { ZinR: [50.0, 1.0], ZinI: [0.0, 1.0], VSWR: [1.0, 0.05] },
    expect: {
      ZinR: [50.468022, 1e-4],
      ZinI: [0.174900, 1e-4],
      VSWR: [1.009996, 1e-5],
      ReturnLoss: [46.068, 1e-2]
    }
  },

  /* ---------------------------------------------------------------- EXAMPLE 3
   * Transmission-line match of 10 - j15 to 50 ohms at 1 GHz, lengths in mm.
   * Series line T2 (Z0 = 30, 56.4 mm) then open stub O3 (Z0 = 30, 38.5 mm).
   */
  {
    id: "ex3-transmission-line",
    name: "Ex3: series line + open stub matches 10-j15 @ 1 GHz",
    ref: "EXAMPLE_3.html",
    setup: {
      freq: 1000,
      LU: "MilliMeters",
      load: { type: "rx", value1: 10, value2: -15 },
      elements: {
        2: { type: "t", value1: 30, value2: 56.4 },
        3: { type: "o", value1: 30, value2: 38.5 }
      }
    },
    assert: { ZinR: [50.0, 1.0], ZinI: [0.0, 1.0], VSWR: [1.0, 0.05] },
    expect: {
      ZinR: [50.168703, 1e-4],
      ZinI: [-0.225826, 1e-4],
      VSWR: [1.005644, 1e-5]
    }
  },

  /* ---------------------------------------------------------------- EXAMPLE 4
   * Wideband dipole match, 100-200 MHz, frequency-dependent load read by
   * interpolation from the .gam data embedded in sch/Dipole.sch.
   * Design goal: VSWR 2.0:1 or better across the band.
   */
  {
    id: "ex4-dipole-wideband",
    name: "Ex4: dipole stays inside the 2:1 VSWR circle, 100-200 MHz",
    ref: "EXAMPLE_4.html",
    schFile: "sch/Dipole.sch",
    sweep: { start: 100, stop: 200, step: 5 },
    assert: { maxVSWR: [1.8355, 0.1645] },   // i.e. <= 2.0
    expect: {
      maxVSWR: [1.835532, 1e-5],
      maxVSWRat: [105, 1e-9],
      "VSWR@150": [1.295842, 1e-5],
      "ZinR@150": [40.919033, 1e-4],
      "ZinI@150": [7.464699, 1e-4]
    }
  },

  /* ---------------------------------------------------------------- EXAMPLE 5
   * Five-pole Chebyshev low-pass, 28 MHz corner, built with finite-Q parts.
   * sch/Filter.sch.  Checks both the passband and the stopband, and that the
   * component Q values are actually being applied (an ideal-Q filter would
   * show ~0 dB at 1 MHz and a different passband ripple).
   */
  {
    id: "ex5-chebyshev-filter",
    name: "Ex5: 28 MHz Chebyshev low-pass insertion loss",
    ref: "EXAMPLE_5.html",
    schFile: "sch/Filter.sch",
    sweepPoints: [1, 10, 20, 27, 28, 30, 50, 100],
    assert: {
      "InsertionLoss@1": [0.0062, 0.05],     // passband, essentially lossless
      "InsertionLoss@27": [0.75, 0.30],      // still in band at the corner
      "InsertionLoss@100": [53.25, 5.0]      // deep stopband
    },
    expect: {
      // Re-derived after the Phase 1 insertion-loss fix. The load here is 50 ohms,
      // so the reference change is a no-op and these moved by <2e-4 dB - the
      // residual difference between the ladder recursion and an ABCD cascade.
      "InsertionLoss@1": [0.006214, 1e-4],
      "InsertionLoss@10": [0.494490, 1e-4],
      "InsertionLoss@20": [1.080661, 1e-4],
      "InsertionLoss@27": [0.749817, 1e-4],
      "InsertionLoss@28": [1.529044, 1e-4],
      "InsertionLoss@30": [4.029780, 1e-4],
      "InsertionLoss@50": [27.275179, 1e-4],
      "InsertionLoss@100": [53.246458, 1e-4],
      "ZinR@27": [26.802940, 1e-4],
      "ZinI@27": [4.223740, 1e-4]
    }
  },

  /* ---------------------------------------------------------------- EXAMPLE 6
   * Motorola AN721 large-signal amplifier, 2N5642 at 175 MHz.
   * Input match: load 1.94 + j1.1, L2 = 16.8 nH, C3 = 38.12 pF, C4 = 10.52 pF.
   * The design also specifies a maximum input Q of 10.
   */
  {
    id: "ex6-input-match",
    name: "Ex6i: 2N5642 input network matches 1.94+j1.1 @ 175 MHz",
    ref: "EXAMPLE_6.html",
    schFile: "sch/example_6I.sch",
    assert: { ZinR: [50.0, 0.5], ZinI: [0.0, 0.5], VSWR: [1.0, 0.02] },
    expect: {
      ZinR: [49.906496, 1e-4],
      ZinI: [-0.074089, 1e-4],
      VSWR: [1.002391, 1e-5],
      ReturnLoss: [58.459, 2e-2]
    }
  },
  {
    id: "ex6-output-match",
    name: "Ex6o: 2N5642 output network matches 10.6-j7.3 @ 175 MHz",
    ref: "OUTPUT_MATCH.html",
    schFile: "sch/example_6O.sch",
    assert: { ZinR: [50.0, 0.5], ZinI: [0.0, 0.5], VSWR: [1.0, 0.02] },
    expect: {
      ZinR: [50.318778, 1e-4],
      ZinI: [-0.038633, 1e-4],
      VSWR: [1.006428, 1e-5]
    }
  },

  /* ---------------------------------------------------------------- EXAMPLE 7
   * HP AN970 / Gonzalez small-signal amplifier at 6 GHz.  The example states
   * K = 1.504 and |Delta| = 0.301 for this device, so those are hard assertions,
   * not just pins.
   */
  {
    id: "ex7-amplifier-stability",
    name: "Ex7: 6 GHz device is unconditionally stable (K=1.504, |D|=0.301)",
    ref: "EXAMPLE_7.html",
    amp: {
      S11M: 0.641, S11A: -171.3,
      S12M: 0.057, S12A: 16.3,
      S21M: 2.058, S21A: 28.5,
      S22M: 0.572, S22A: -95.7,
      Fmin: 2.9, G0M: 0.542, G0A: 141, RN: 9.42
    },
    assert: { K: [1.504, 5e-4], DeltaMag: [0.301, 5e-4], stable: [1, 0] },
    expect: {
      K: [1.503700, 1e-3],
      DeltaMag: [0.301400, 1e-3],
      GPMAX: [11.381500, 1e-3],
      stabilitySourceMag: [1.495600, 1e-3],
      stabilityLoadMag: [1.655100, 1e-3]
    }
  },

  /* ------------------------------------------------------------ COVERAGE: all
   * element types.  sch/test.sch exercises r, l, c, x, t, o, slc, plc, src in
   * one ladder; the synthetic case below adds the three it misses (prc, short
   * stub s, and a gamma-specified load).
   */
  {
    id: "cover-test-sch",
    name: "Coverage: r/l/c/x/t/o/slc/plc/src in one ladder (test.sch)",
    ref: "sch/test.sch",
    schFile: "sch/test.sch",
    expect: {
      ZinR: [133.428793, 1e-4],
      ZinI: [-0.942427, 1e-4],
      VSWR: [2.668731, 1e-5]
    }
  },
  {
    id: "cover-prc-series",
    name: "Coverage: parallel R||C as a series element",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 25, value2: 10 },
      elements: { 2: { type: "prc", value1: 75, value2: 4.7 } }
    },
    expect: { ZinR: [96.492956, 1e-4], ZinI: [-5.834423, 1e-4] }
  },
  {
    id: "cover-short-stub",
    name: "Coverage: shunt short-circuit stub",
    setup: {
      freq: 1000,
      LU: "MilliMeters",
      load: { type: "rx", value1: 25, value2: 10 },
      elements: { 3: { type: "s", value1: 60, value2: 30 } }
    },
    expect: { ZinR: [13.592612, 1e-4], ZinI: [14.471581, 1e-4] }
  },
  {
    id: "cover-gamma-load",
    name: "Coverage: load entered as gamma 0.5 /_45deg",
    setup: {
      freq: 100,
      load: { type: "g", value1: 0.5, value2: 45 },
      elements: {}
    },
    // |gamma| = 0.5 must round-trip to VSWR 3.0 exactly
    assert: { VSWR: [3.0, 1e-6], GammaMag: [0.5, 1e-9] },
    expect: { ZinR: [69.074357, 1e-4], ZinI: [65.123928, 1e-4] }
  },
  {
    id: "cover-gamma-load-shunt-c",
    name: "Coverage: gamma load followed by a shunt C",
    setup: {
      freq: 100,
      load: { type: "g", value1: 0.5, value2: 45 },
      elements: { 3: { type: "c", value1: 5 } }
    },
    expect: { ZinR: [101.615323, 1e-4], ZinI: [54.152161, 1e-4] }
  },

  /* ------------------------------------------------------------- COVERAGE: Q
   * Finite component Q must add loss.  These pin the exact Q model so a
   * refactor cannot quietly turn the parts ideal.
   */
  {
    id: "cover-q-shunt-c",
    name: "Q: shunt C with Q=100 (ESR must show up)",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 50, value2: 0 },
      elements: { 3: { type: "c", value1: 20, q: 100 } }
    },
    expect: { ZinR: [35.751991, 1e-4], ZinI: [-22.321158, 1e-4] }
  },
  {
    id: "cover-q-series-l",
    name: "Q: series L with Q=50 (series R must show up)",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 50, value2: 0 },
      elements: { 2: { type: "l", value1: 100, q: 50 } }
    },
    // an ideal inductor would leave ZinR at exactly 50
    assert: { ZinR: [51.256637, 1e-4] },
    expect: { ZinI: [62.831853, 1e-4] }
  },
  {
    id: "cover-q-plc-shunt",
    name: "Q: shunt L||C tank with Q=200",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 50, value2: 0 },
      elements: { 3: { type: "plc", value1: 10, value2: 25, q: 200 } }
    },
    expect: { ZinR: [0.989827, 1e-4], ZinI: [6.827720, 1e-4] }
  },
  {
    id: "cover-q-slc-shunt",
    name: "Q: shunt L+C series trap with Q=300",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 50, value2: 0 },
      elements: { 3: { type: "slc", value1: 12, value2: 18, q: 300 } }
    },
    expect: { ZinR: [36.171768, 1e-4], ZinI: [-22.357196, 1e-4] }
  },
  {
    id: "cover-src-shunt",
    name: "Coverage: shunt R+C in series",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 50, value2: 0 },
      elements: { 3: { type: "src", value1: 15, value2: 8 } }
    },
    expect: { ZinR: [46.290258, 1e-4], ZinI: [-11.354303, 1e-4] }
  },

  /* ------------------------------------------------- INVARIANT: length units
   * The same quarter-wave 75 ohm line expressed in five different length units
   * must transform a 25 ohm load to Z0^2/ZL = 225 ohms in every one of them.
   * This needs no golden data - it is true by construction - so it catches
   * unit-conversion regressions on its own.
   *
   * At 100 MHz with VF = 1, lambda/4 = 0.7495 m = 749.5 mm = 29.507874 in.
   * "Degrees" and "Wave Lengths" are referenced to TDF, here also 100 MHz.
   */
  {
    id: "units-quarter-wave-meters",
    name: "Units: quarter-wave 75 ohm line, Meters",
    setup: {
      freq: 100, TDF: 100, LU: "Meters",
      load: { type: "rx", value1: 25, value2: 0 },
      elements: { 2: { type: "t", value1: 75, value2: 0.7495 } }
    },
    assert: { ZinR: [225.0, 1e-6], ZinI: [0.0, 1e-6] }
  },
  {
    id: "units-quarter-wave-mm",
    name: "Units: quarter-wave 75 ohm line, MilliMeters",
    setup: {
      freq: 100, TDF: 100, LU: "MilliMeters",
      load: { type: "rx", value1: 25, value2: 0 },
      elements: { 2: { type: "t", value1: 75, value2: 749.5 } }
    },
    assert: { ZinR: [225.0, 1e-6], ZinI: [0.0, 1e-6] }
  },
  {
    id: "units-quarter-wave-inches",
    name: "Units: quarter-wave 75 ohm line, Inches",
    setup: {
      freq: 100, TDF: 100, LU: "Inches",
      load: { type: "rx", value1: 25, value2: 0 },
      elements: { 2: { type: "t", value1: 75, value2: 29.5078740157 } }
    },
    assert: { ZinR: [225.0, 1e-5], ZinI: [0.0, 1e-5] }
  },
  {
    id: "units-quarter-wave-degrees",
    name: "Units: quarter-wave 75 ohm line, Degrees @ TDF",
    setup: {
      freq: 100, TDF: 100, LU: "Degrees",
      load: { type: "rx", value1: 25, value2: 0 },
      elements: { 2: { type: "t", value1: 75, value2: 90 } }
    },
    assert: { ZinR: [225.0, 1e-6], ZinI: [0.0, 1e-6] }
  },
  {
    id: "units-quarter-wave-wavelengths",
    name: "Units: quarter-wave 75 ohm line, Wave Lengths @ TDF",
    setup: {
      freq: 100, TDF: 100, LU: "Wave Lengths",
      load: { type: "rx", value1: 25, value2: 0 },
      elements: { 2: { type: "t", value1: 75, value2: 0.25 } }
    },
    assert: { ZinR: [225.0, 1e-6], ZinI: [0.0, 1e-6] }
  },

  /* ---------------------------------------------------- INVARIANT: half-wave
   * A half-wave line is transparent: it must return the load unchanged,
   * whatever its characteristic impedance.
   */
  {
    id: "units-half-wave-transparent",
    name: "Invariant: half-wave line returns the load unchanged",
    setup: {
      freq: 100, TDF: 100, LU: "Degrees",
      load: { type: "rx", value1: 30, value2: -18 },
      elements: { 2: { type: "t", value1: 93, value2: 180 } }
    },
    assert: { ZinR: [30.0, 1e-4], ZinI: [-18.0, 1e-4] }
  },

  /* --------------------------------------------------- INVARIANT: empty line
   * A ladder of nothing but wires must pass the load straight through.
   */
  {
    id: "invariant-all-wire",
    name: "Invariant: an empty ladder is a through connection",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 37.5, value2: 12.25 },
      elements: {}
    },
    assert: { ZinR: [37.5, 1e-9], ZinI: [12.25, 1e-9] }
  },

  /* ============================================================== PHASE 1
   * Cases written for the four defects found in the September 2026 review.
   * Each of these failed against the code as it stood before the fix.
   */

  /* The parallel equivalent of 25 + j50 at 100 MHz is Rp = Rs(1+Q^2) = 125 ohms
   * in parallel with Xp = Rp/Q = 62.5 ohms, i.e. 99.4718 nH.  sch.js computed
   * (Qu ^ 2 + 1) - a bitwise XOR - and reported 50 ohms with 39.789 nH. */
  {
    id: "fix-parallel-equivalent",
    name: "Fix: parallel equivalent squares Q instead of XOR-ing it",
    ref: "sch.js parallelEquiv()",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 25, value2: 50 },
      elements: {}
    },
    assert: {
      SeriesEqR: [25.0, 1e-9],
      SeriesEqValue: [79.577472, 1e-5],      // nH
      ParallelEqR: [125.0, 1e-9],
      ParallelEqValue: [99.471839, 1e-5]     // nH
    }
  },
  {
    id: "fix-parallel-equivalent-capacitive",
    name: "Fix: parallel equivalent of a capacitive input",
    ref: "sch.js parallelEquiv()",
    setup: {
      freq: 200,
      load: { type: "rx", value1: 40, value2: -30 },
      elements: {}
    },
    // Q = -0.75, Rp = 40(1+0.5625) = 62.5, Xp = 62.5/-0.75 = -83.333 ohms
    // C = 1e6 / (2*pi*200*83.333) = 9.5493 pF
    assert: {
      ParallelEqR: [62.5, 1e-9],
      ParallelEqX: [-83.333333, 1e-5],
      ParallelEqValue: [9.549297, 1e-5]      // pF
    }
  },

  /* Insertion loss is a transducer loss from a Z0 source into the actual load.
   * A lossless network that matches its load must therefore show ~0 dB.  The
   * old code referenced both source and termination to Re(Z_load), which gave
   * 4.774 dB for Example 2 and 7.731 dB for the Example 6 input match. */
  {
    id: "fix-il-lossless-l-network",
    name: "Fix: a lossless matching network has ~0 dB insertion loss",
    ref: "sch.js ILcal() - Example 2",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 500, value2: 0 },
      elements: {
        3: { type: "c", value1: 9.5 },
        4: { type: "l", value1: 240 }
      }
    },
    assert: { InsertionLoss: [0.0, 0.01] },
    expect: { InsertionLoss: [0.000133, 5e-5] }
  },
  {
    id: "fix-il-lossless-6i",
    name: "Fix: the AN721 input match has ~0 dB insertion loss",
    ref: "sch.js ILcal() - Example 6 input",
    schFile: "sch/example_6I.sch",
    assert: { InsertionLoss: [0.0, 0.01] },
    expect: { InsertionLoss: [0.000091, 5e-5] }
  },
  {
    id: "fix-il-equals-mismatch-loss",
    name: "Fix: with no dissipation, insertion loss is exactly mismatch loss",
    ref: "sch.js ILcal()",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 50, value2: 0 },
      elements: { 2: { type: "x", value1: 50 } }
    },
    // lossless reactance, so all of the loss is -10*log10(1 - |gamma|^2)
    assert: { InsertionLoss: [0.969100, 1e-5] }
  },

  /* Gamma was floored at 1E-36 rather than allowed to be zero, so a perfect
   * match reported a finite (and arbitrary) return loss.  Reaching an exact
   * zero also needs the load element to stop rounding 0 up to 1e-14. */
  {
    id: "fix-perfect-match-is-infinite-rl",
    name: "Fix: an exact 50 ohm load gives infinite return loss, VSWR 1",
    ref: "sch.js GAMCal(), RLCal()",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 50, value2: 0 },
      elements: {}
    },
    assert: {
      GammaMag: [0, 0],
      VSWR: [1.0, 0],
      ReturnLoss: [Infinity, 0],
      InsertionLoss: [0, 1e-9]
    }
  },

  /* Results used to be stored as 16-significant-digit strings and re-parsed,
   * so an exact 25 ohms came back as 25.00000000000001.  That is what made
   * ToInt32(Qu) land on 1 instead of 2 in the XOR bug above. */
  {
    id: "fix-results-are-numbers",
    name: "Fix: solver output is numbers, not re-parsed strings",
    ref: "sch.js Zcalsweep1(), YCal(), GAMCal(), ILcal()",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 25, value2: 50 },
      elements: {}
    },
    // Zin, Yin, gamma, S21 and the losses all used to be stored as
    // 16-significant-digit strings. OutputsAreNumbers is 1 only if every one of
    // them is a JavaScript number, so re-introducing math.format() fails here.
    assert: {
      OutputsAreNumbers: [1, 0],
      ZinR: [25, 1e-12],
      ZinI: [50, 1e-12],
      ZinMag: [55.901699, 1e-6]
    }
  },

  /* ============================================================== PHASE 2
   * A transmission line used to be reduced to a lumped series impedance when
   * the transfer function was computed. That gives the right Zin and the wrong
   * insertion loss: this network reported 4.217 dB. The line is lossless, so
   * every decibel of it has to be mismatch, -10*log10(1 - |gamma|^2).
   */
  /* ============================================================== PHASE 5
   * The auto-match solver. Two things are being checked: that the closed-form
   * answer actually lands on the centre of the chart when fed back through the
   * solver, and - for two of the worked examples - that it independently
   * rediscovers the network the textbook arrived at by hand.
   *
   * The residual gamma is not zero because the engine's default component Q is
   * 1e6, not infinity. With ideal parts these land at 2e-13.
   */
  {
    id: "match-rediscovers-example-2",
    name: "Auto-match rediscovers Example 2's L-network by itself",
    ref: "EXAMPLE_2.html - book says shunt C 9.5 pF, series L 240 nH",
    match: { load: { re: 500, im: 0 }, Z0: 50, freq: 100 },
    assert: {
      MatchCount: [2, 0],
      MatchWorstGamma: [0, 1e-5],
      MatchBestQ: [3.0, 1e-12],          // sqrt(500/50 - 1) = 3
      Match0Slot3: [9.5, 0.06],         // pF, against the book's 9.5
      Match0Slot4: [240, 1.3]           // nH, against the book's 240
    },
    expect: {
      Match0Slot3: [9.549297, 1e-5],
      Match0Slot4: [238.732414, 1e-5]
    }
  },
  {
    id: "match-rediscovers-example-6-output",
    name: "Auto-match rediscovers the AN721 output match",
    ref: "OUTPUT_MATCH.html - book says L2 = 25.3 nH, C3 = 35 pF",
    match: { load: { re: 10.6, im: -7.3 }, Z0: 50, freq: 175 },
    assert: {
      MatchWorstGamma: [0, 1e-5],
      Match0Slot2: [25.3, 0.1],         // nH, against the book's 25.3
      Match0Slot3: [35.0, 0.1]          // pF, against the book's 35
    },
    expect: {
      Match0Slot2: [25.224915, 1e-5],
      Match0Slot3: [35.067698, 1e-5]
    }
  },
  {
    id: "match-low-impedance-load",
    name: "Auto-match: a load below Z0 gets the series-first shape",
    match: { load: { re: 10, im: -15 }, Z0: 50, freq: 1000 },
    // R_L < Z0 so series-first is available; R_p = 32.5 < 50 so shunt-first is not
    assert: {
      MatchCount: [2, 0],
      MatchNSeriesFirst: [2, 0],
      MatchWorstGamma: [0, 1e-5],
      MatchBestQ: [2.0, 1e-9]
    }
  },
  {
    id: "match-high-impedance-load",
    name: "Auto-match: a load above Z0 gets the shunt-first shape",
    match: { load: { re: 500, im: 0 }, Z0: 50, freq: 100 },
    assert: { MatchNSeriesFirst: [0, 0], MatchCount: [2, 0] }
  },
  {
    id: "match-reactive-load-both-shapes",
    name: "Auto-match: a load reachable both ways offers all four networks",
    // R_L = 30 < 50, and R_p = (30^2+40^2)/30 = 83.3 > 50, so both shapes work
    match: { load: { re: 30, im: 40 }, Z0: 50, freq: 100 },
    assert: {
      MatchCount: [4, 0],
      MatchNSeriesFirst: [2, 0],
      MatchWorstGamma: [0, 1e-5]
    }
  },
  {
    id: "match-non-50-ohm-system",
    name: "Auto-match works in a 75 ohm system",
    match: { load: { re: 120, im: 85 }, Z0: 75, freq: 433 },
    assert: { MatchWorstGamma: [0, 1e-5], MatchCount: [2, 0] }
  },
  {
    id: "match-already-matched",
    name: "Auto-match on an already-matched load offers nothing to add",
    // both discriminants collapse to zero, so every candidate part is degenerate
    match: { load: { re: 50, im: 0 }, Z0: 50, freq: 100 },
    assert: { MatchCount: [0, 0] }
  },

  /* ============================================================== PHASE 3
   * The chart draws one arc per component, so the solver now reports the
   * impedance after every populated slot along with the locus that got there.
   */
  {
    id: "node-trace-agrees-with-cascade",
    name: "Node walk and cascaded two-port agree, and every arc joins its nodes",
    ref: "engine.js solve().nodes",
    schFile: "sch/example_6I.sch",
    // load, series L2, shunt C3, series C4
    assert: {
      NodeCount: [4, 0],
      NodesEndAtZin: [1, 0],
      PathsJoinNodes: [1, 0]
    }
  },
  {
    id: "node-trace-transmission-line",
    name: "Node arcs survive a line and a stub",
    ref: "engine.js solve().nodes",
    setup: {
      freq: 1000,
      LU: "MilliMeters",
      load: { type: "rx", value1: 10, value2: -15 },
      elements: {
        2: { type: "t", value1: 30, value2: 56.4 },
        3: { type: "o", value1: 30, value2: 38.5 }
      }
    },
    assert: {
      NodeCount: [3, 0],
      NodesEndAtZin: [1, 0],
      PathsJoinNodes: [1, 0]
    }
  },
  {
    id: "node-trace-empty-ladder",
    name: "An empty ladder has one node and no arcs",
    ref: "engine.js solve().nodes",
    setup: {
      freq: 100,
      load: { type: "rx", value1: 37.5, value2: 12.25 },
      elements: {}
    },
    assert: { NodeCount: [1, 0], NodesEndAtZin: [1, 0], PathsJoinNodes: [1, 0] }
  },

  {
    id: "fix-tline-insertion-loss",
    name: "Fix: a lossless line shows mismatch loss only, not lumped loss",
    ref: "engine.js - transmission lines cascade as a two-port",
    setup: {
      freq: 100, TDF: 100, LU: "Degrees",
      load: { type: "rx", value1: 50, value2: 0 },
      elements: { 2: { type: "t", value1: 75, value2: 90 } }
    },
    // Zin = Z0^2/ZL = 75^2/50 = 112.5, |gamma| = 62.5/162.5
    assert: {
      ZinR: [112.5, 1e-9],
      ZinI: [0.0, 1e-9],
      GammaMag: [0.384615, 1e-6],
      InsertionLoss: [0.695242, 1e-6]
    }
  },
  {
    id: "fix-tline-half-wave-lossless",
    name: "Fix: a half-wave line into a matched load has zero insertion loss",
    ref: "engine.js - transmission lines cascade as a two-port",
    setup: {
      freq: 100, TDF: 100, LU: "Degrees",
      load: { type: "rx", value1: 50, value2: 0 },
      elements: { 2: { type: "t", value1: 93, value2: 180 } }
    },
    // transparent at half a wavelength whatever its characteristic impedance
    assert: {
      ZinR: [50.0, 1e-9],
      GammaMag: [0, 1e-12],
      InsertionLoss: [0.0, 1e-9]
    }
  },
  {
    id: "fix-tline-stub-network-lossless",
    name: "Fix: Example 3's line-and-stub match dissipates nothing",
    ref: "EXAMPLE_3.html via engine.js",
    setup: {
      freq: 1000,
      LU: "MilliMeters",
      load: { type: "rx", value1: 10, value2: -15 },
      elements: {
        2: { type: "t", value1: 30, value2: 56.4 },
        3: { type: "o", value1: 30, value2: 38.5 }
      }
    },
    // a matched, lossless network: the residual is the leftover 1.006 VSWR
    assert: { InsertionLoss: [0.0, 0.001] },
    expect: { InsertionLoss: [0.000034, 1e-5] }
  }
];

if (typeof module !== "undefined" && module.exports) module.exports = QS_CASES;
