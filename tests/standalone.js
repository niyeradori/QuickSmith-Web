/*
 * Proves the solver stands on its own.
 *
 * Loads engine.js and NOTHING else - no jQuery, no math.js, no common.js, no
 * schObj, no DOM - and solves a couple of known networks. If someone reaches
 * back out of engine.js for a helper that lives elsewhere, this fails
 * immediately with a ReferenceError instead of quietly re-coupling the two.
 *
 * Run by tests/run.sh before the main suite.
 */

var out = (typeof print === "function")
    ? print
    : function (s) { process.stdout.write(s + "\n"); };

var ROOT = "";
if (typeof process !== "undefined" && process.versions && process.versions.node) {
    var path = require("path"), vm = require("vm"), fs = require("fs");
    ROOT = path.resolve(__dirname, "..") + "/";
    vm.runInThisContext(fs.readFileSync(ROOT + "engine.js", "utf8"), { filename: "engine.js" });
} else {
    load("engine.js");                 // run.sh cds to the repo root
}

var failures = 0;

function near(label, got, want, tol) {
    var ok = isFinite(got) && Math.abs(got - want) <= tol;
    if (!ok) {
        failures++;
        out("  BAD  " + label + ": expected " + want + " +/- " + tol + ", got " + got);
    }
}

function elements(load, more) {
    var a = [];
    a[1] = load;
    for (var k in more) if (more.hasOwnProperty(k)) a[k] = more[k];
    return a;
}

/* An L-network matching 500 ohms to 50 ohms at 100 MHz. */
var r = QSEngine.solve({
    frequency: 100,
    elements: elements({ type: "rx", value1: 500, value2: 0 },
                       { 3: { type: "c", value1: 9.5 }, 4: { type: "l", value1: 240 } })
});
near("L-network Zin.re", r.Zin.re, 50.468, 1e-3);
near("L-network Zin.im", r.Zin.im, 0.1749, 1e-3);
near("L-network VSWR", r.vswr, 1.009996, 1e-5);
near("L-network insertion loss", r.insertionLoss, 0.000133, 5e-5);
near("L-network loaded Q", r.loadedQ, 2.984513, 1e-5);

/* A quarter-wave 75 ohm line transforms 25 ohms to 225 ohms. */
r = QSEngine.solve({
    frequency: 100, TDF: 100, LU: "Degrees",
    elements: elements({ type: "rx", value1: 25, value2: 0 },
                       { 2: { type: "t", value1: 75, value2: 90 } })
});
near("quarter-wave Zin.re", r.Zin.re, 225, 1e-6);
near("quarter-wave Zin.im", r.Zin.im, 0, 1e-6);

/* A lossless line can only ever show mismatch loss. */
r = QSEngine.solve({
    frequency: 100, TDF: 100, LU: "Degrees",
    elements: elements({ type: "rx", value1: 50, value2: 0 },
                       { 2: { type: "t", value1: 75, value2: 90 } })
});
var mismatch = -10 * Math.log10(1 - r.gamma.mag * r.gamma.mag);
near("lossless line IL equals mismatch loss", r.insertionLoss, mismatch, 1e-9);

/* Measured, frequency-dependent load read straight from gamma data. */
r = QSEngine.solve({
    frequency: 150, TDF: 150, LU: "Degrees", termination: "Multiple",
    gamData: {
        dataX: ["100", "150", "200"],
        dataM: ["0.590", "0.236", "0.344"],
        dataQ: ["-86.271", "-112.800", "-140.980"]
    },
    elements: elements({ type: "rx", value1: 0, value2: 0 },
                       { 2: { type: "l", value1: 32 },
                         3: { type: "s", value1: 25, value2: 95 } })
});
near("interpolated load VSWR", r.vswr, 1.295842, 1e-5);

/* ------------------------------------------- a sweep stays inside its band
 *
 * Both halves of a bug an editor found. Importing dipole.s1p and exporting it
 * again produced a thirteenth point at 209.09 MHz, past the 200 MHz stop
 * frequency and past the end of the measurement. Two causes: the point count
 * was a fencepost with the stored step's rounding inside it, and the
 * interpolator ran its cubic on past the data rather than stopping.
 */
function eq(label, got, want) {
    if (got !== want) {
        failures++;
        out("  BAD  " + label + ": expected " + want + ", got " + got);
    }
}

var sw = QSEngine.sweepValues(100, 200, 9.0909);     // 12 points, step stored to 4 dp
eq("a 100 MHz span in 12 points stays 12 points", sw.length, 12);
eq("and ends on the stop frequency exactly", sw[sw.length - 1], 200);

sw = QSEngine.sweepValues(100, 200, 7);              // does not divide the span
eq("a step that does not divide gives 15 points", sw.length, 15);
eq("and stops short rather than overshooting", sw[sw.length - 1], 198);

eq("an ordinary sweep is unchanged", QSEngine.sweepValues(1, 100, 1).length, 100);
eq("a fractional step is unchanged", QSEngine.sweepValues(0, 10, 0.5).length, 21);
eq("a zero step yields nothing rather than hanging", QSEngine.sweepValues(0, 10, 0).length, 0);

/* Outside the measured band, hold the end value. Extrapolating the spline
   returned a negative |gamma| here, which is not a physical quantity. */
var fx = [100, 150, 200], fy = [0.590, 0.236, 0.344];
near("inside the band, interpolation is untouched",
     QSEngine.interpolate(150, fx, fy), 0.236, 1e-12);
near("at the top edge, the measured value", QSEngine.interpolate(200, fx, fy), 0.344, 1e-12);
near("above the band, the top value is held", QSEngine.interpolate(260, fx, fy), 0.344, 1e-12);
near("below the band, the bottom value is held", QSEngine.interpolate(50, fx, fy), 0.590, 1e-12);
if (!(QSEngine.interpolate(400, fx, fy) >= 0)) {
    failures++;
    out("  BAD  a held magnitude is never negative");
}

if (failures === 0) {
    out("engine.js stands alone: 20 checks OK (no jQuery, no math.js, no DOM)");
} else {
    out("engine.js standalone: " + failures + " FAILED");
    if (typeof process !== "undefined") process.exitCode = 1;
}
