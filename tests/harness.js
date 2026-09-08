/*
 * QuickSmith test harness - environment independent half.
 *
 * Drives the real engine (common.js + sch.js + amp.js) with no DOM: it writes
 * into schObj / ampObj, calls the same entry points index.html calls, and reads
 * resultsObj back out.  The caller supplies file contents, so the same code
 * runs under jsc, node and the browser.
 */

var QSHarness = (function () {

  function blank() {
    return { type: "w", value1: 0, value2: 0, q: 1000000 };
  }

  /* Reset schObj to defaults and apply a case's `setup` block. */
  function applySetup(setup) {
    schObj.Z0 = num(setup.Z0, 50);
    schObj.VF = num(setup.VF, 1);
    schObj.TDF = num(setup.TDF, 100);
    schObj.LU = setup.LU || "Inches";
    schObj.termination = setup.termination || "Single";
    schObj.gamData = setup.gamData || { label: "", color: "", dataX: [], dataM: [], dataQ: [] };
    schObj.ELEMENT[0].value1 = setup.freq;

    for (var i = 1; i < 13; i++) {
      var src = (i === 1) ? setup.load : (setup.elements || {})[i];
      var e = schObj.ELEMENT[i];
      var b = src || blank();
      e.type = b.type;
      e.value1 = num(b.value1, 0);
      e.value2 = num(b.value2, 0);
      e.q = num(b.q, 1000000);
      e.tune = 1;
    }
  }

  /* Apply a .sch file the same way index.html's handleFileOpen does. */
  function applySch(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);   // strip BOM
    var o = JSON.parse(text);
    if (String(o.ver) !== "5") throw new Error("unexpected .sch version: " + o.ver);
    copy_schObj(o);
    // index.html unwraps the phase before handing gamma data to the interpolator
    if (schObj.termination === "Multiple") {
      schObj.gamData.dataQ = phase_unwrap(schObj.gamData.dataQ);
    }
    return o;
  }

  function num(v, dflt) {
    return (v === undefined || v === null) ? dflt : Number(v);
  }

  /* Run the engine at the frequency currently in schObj and read everything back. */
  function measure() {
    Zcalsweep1();
    for (var i = 1; i <= 10; i++) resultsObj.OUTPUT[i].calculate();
    var m = {
      ZinR: +resultsObj.OUTPUT[0].ZRout,
      ZinI: +resultsObj.OUTPUT[0].ZIout,
      ZinMag: +resultsObj.OUTPUT[0].MAGout,
      ZinAng: +resultsObj.OUTPUT[0].ANGout,
      YinR: +resultsObj.OUTPUT[1].YRout,
      YinI: +resultsObj.OUTPUT[1].YIout,
      GammaR: +resultsObj.OUTPUT[2].GAMRout,
      GammaI: +resultsObj.OUTPUT[2].GAMIout,
      GammaMag: +resultsObj.OUTPUT[2].GAMMag,
      GammaAng: +resultsObj.OUTPUT[2].GAMAng,
      VSWR: +resultsObj.OUTPUT[3].VSWR,
      ReturnLoss: +resultsObj.OUTPUT[4].ReturnLoss,
      InsertionLoss: +resultsObj.OUTPUT[5].InsertionLoss,
      S21Mag: +resultsObj.OUTPUT[5].S21Mag,
      S21Ang: +resultsObj.OUTPUT[5].S21Ang
    };
    equivalents(m);
    m.OutputsAreNumbers = outputsAreNumbers() ? 1 : 0;
    nodeTrace(m);
    return m;
  }

  /*
   * The node walk and the cascaded two-port are two different routes to the
   * same answer inside the engine, so checking that they agree is a real
   * cross-check rather than a restatement.
   */
  function nodeTrace(m) {
    var r = resultsObj.solution;
    if (!r || !r.nodes) return;
    m.NodeCount = r.nodes.length;

    var last = r.nodes[r.nodes.length - 1];
    m.NodesEndAtZin = (Math.abs(last.Z.re - r.Zin.re) < 1e-9 &&
                       Math.abs(last.Z.im - r.Zin.im) < 1e-9) ? 1 : 0;

    // every path must start on the previous node and finish on its own
    var joins = 1;
    for (var i = 1; i < r.nodes.length; i++) {
      var p = r.nodes[i].path;
      if (!p || p.length < 2) { joins = 0; break; }
      if (dist(p[0], r.nodes[i - 1].gamma) > 1e-9) joins = 0;
      if (dist(p[p.length - 1], r.nodes[i].gamma) > 1e-9) joins = 0;
    }
    m.PathsJoinNodes = joins;
  }

  function dist(a, b) { return Math.sqrt(Math.pow(a.re - b.re, 2) + Math.pow(a.im - b.im, 2)); }

  /* The solver's published results must be numbers. They were once
     16-significant-digit strings, which cost precision and forced every
     consumer to coerce. */
  function outputsAreNumbers() {
    var fields = [
      [0, "ZRout"], [0, "ZIout"], [0, "MAGout"], [0, "ANGout"],
      [1, "YRout"], [1, "YIout"], [1, "YMag"], [1, "YAng"],
      [2, "GAMRout"], [2, "GAMIout"], [2, "GAMMag"], [2, "GAMAng"],
      [3, "VSWR"], [4, "ReturnLoss"],
      [5, "InsertionLoss"], [5, "S21Mag"], [5, "S21Ang"]
    ];
    for (var i = 0; i < fields.length; i++) {
      if (typeof resultsObj.OUTPUT[fields[i][0]][fields[i][1]] !== "number") return false;
    }
    return true;
  }

  /* Series and parallel one-element models of Zin. Guarded so the suite still
     reports a clean failure, rather than an error, on a build that predates
     equivalentCircuit(). */
  function equivalents(m) {
    if (typeof equivalentCircuit !== "function") return;
    var f = Number(schObj.ELEMENT[0].value1);
    var s = equivalentCircuit(m.ZinR, m.ZinI, f, false);
    var p = equivalentCircuit(m.ZinR, m.ZinI, f, true);
    m.SeriesEqR = s.R;   m.SeriesEqX = s.X;   m.SeriesEqValue = s.value;
    m.ParallelEqR = p.R; m.ParallelEqX = p.X; m.ParallelEqValue = p.value;
  }

  function measureAt(f) {
    schObj.ELEMENT[0].value1 = f;
    return measure();
  }

  function ampMetrics(params) {
    for (var k in params) if (params.hasOwnProperty(k)) ampObj[k] = params[k];
    ampObj.calculateStabilityCircles();
    return {
      K: +ampObj.k,
      DeltaMag: +ampObj.delta,
      GPMAX: +ampObj.GPMAX,
      stable: ampObj.STFLAG ? 1 : 0,
      stabilitySourceMag: +ampObj.stablityS_m,
      stabilitySourceRad: +ampObj.stablityS_r,
      stabilityLoadMag: +ampObj.stablityL_m,
      stabilityLoadRad: +ampObj.stablityL_r
    };
  }

  /* Fold a point measurement into the flat metric map as "Name@freq". */
  function stamp(metrics, m, f) {
    for (var k in m) if (m.hasOwnProperty(k)) metrics[k + "@" + f] = m[k];
  }

  /*
   * Build the flat metric map for one case.
   * `readFile(path)` is supplied by the environment and returns file text.
   */
  function collect(c, readFile) {
    var metrics = {};

    if (c.amp) return ampMetrics(c.amp);

    if (c.schFile) applySch(readFile(c.schFile));
    else applySetup(c.setup);

    var baseFreq = schObj.ELEMENT[0].value1;

    if (c.sweep) {
      var worst = -Infinity, worstAt = null, best = Infinity, bestAt = null;
      for (var f = c.sweep.start; f <= c.sweep.stop + 1e-9; f += c.sweep.step) {
        f = round6(f);
        var m = measureAt(f);
        stamp(metrics, m, f);
        if (m.VSWR > worst) { worst = m.VSWR; worstAt = f; }
        if (m.VSWR < best) { best = m.VSWR; bestAt = f; }
      }
      metrics.maxVSWR = worst;
      metrics.maxVSWRat = worstAt;
      metrics.minVSWR = best;
      metrics.minVSWRat = bestAt;
      return metrics;
    }

    if (c.sweepPoints) {
      for (var i = 0; i < c.sweepPoints.length; i++) {
        stamp(metrics, measureAt(c.sweepPoints[i]), c.sweepPoints[i]);
      }
      return metrics;
    }

    var single = measureAt(baseFreq);
    for (var k in single) if (single.hasOwnProperty(k)) metrics[k] = single[k];
    return metrics;
  }

  function round6(x) { return Math.round(x * 1e6) / 1e6; }

  /* Compare one metric map against an expectation block. */
  function check(metrics, block, kind, checks) {
    for (var key in block) {
      if (!block.hasOwnProperty(key)) continue;
      var want = block[key][0], tol = block[key][1];
      var got = metrics[key];
      var ok;
      if (!isFinite(want)) {
        // an expectation of Infinity is satisfied only by the same infinity
        ok = (got === want);
      } else {
        ok = (got !== undefined) && isFinite(got) && Math.abs(got - want) <= tol;
      }
      checks.push({
        kind: kind, key: key, expected: want, tol: tol,
        actual: (got === undefined ? null : got), pass: !!ok
      });
    }
  }

  function runCase(c, readFile) {
    var result = { id: c.id, name: c.name, ref: c.ref || "", checks: [], pass: true, error: null };
    var metrics;
    try {
      metrics = collect(c, readFile);
    } catch (e) {
      result.pass = false;
      result.error = String(e && e.message ? e.message : e);
      return result;
    }
    if (c.assert) check(metrics, c.assert, "assert", result.checks);
    if (c.expect) check(metrics, c.expect, "expect", result.checks);
    for (var i = 0; i < result.checks.length; i++) {
      if (!result.checks[i].pass) result.pass = false;
    }
    result.metrics = metrics;
    return result;
  }

  function runAll(cases, readFile) {
    var results = [];
    for (var i = 0; i < cases.length; i++) results.push(runCase(cases[i], readFile));
    return results;
  }

  return {
    applySetup: applySetup,
    applySch: applySch,
    measure: measure,
    measureAt: measureAt,
    runCase: runCase,
    runAll: runAll
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = QSHarness;
