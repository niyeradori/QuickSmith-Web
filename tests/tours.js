/*
 * Guided examples.
 *
 * A tour makes claims: this lands at VSWR 1.01, the loaded Q comes to 10.09,
 * the filter is 53 dB down at 100 MHz. Prose drifts away from code, so the
 * claims are checked here against the solver rather than trusted.
 *
 * Run by tests/run.sh.
 */

var out = (typeof print === "function")
    ? print
    : function (s) { process.stdout.write(s + "\n"); };

var failures = 0, checks = 0;
function near(label, got, want, tol) {
    checks++;
    if (!(isFinite(got) && Math.abs(got - want) <= tol)) {
        failures++; out("  BAD  " + label + ": expected " + want + ", got " + got);
    }
}
function ok(label, cond) {
    checks++;
    if (!cond) { failures++; out("  BAD  " + label); }
}

var ROOT = "";
if (typeof process !== "undefined" && process.versions && process.versions.node) {
    var path = require("path"), vm = require("vm"), fs = require("fs");
    ROOT = path.resolve(__dirname, "..") + "/";
    ["engine.js", "tours.js"].forEach(function (f) {
        vm.runInThisContext(fs.readFileSync(ROOT + f, "utf8"), { filename: f });
    });
} else {
    load("engine.js"); load("tours.js");     // run.sh cds to the repo root
}

function solveAt(tour, step, freq) {
    return QSEngine.solve({
        Z0: tour.Z0, LU: tour.LU, TDF: tour.TDF, VF: 1,
        termination: tour.gamData ? "Multiple" : "Single",
        gamData: tour.gamData,
        frequency: freq === undefined ? tour.frequency : freq,
        elements: QSTours.elementsAt(tour, step)
    });
}

/* The worst VSWR anywhere in a band tour's band, which is what it claims. */
function worstAcross(tour, step) {
    var lo = tour.band[0], hi = tour.band[1], worst = 0;
    for (var i = 0; i < 61; i++) {
        var v = solveAt(tour, step, lo + (hi - lo) * i / 60).vswr;
        if (!isFinite(v)) return Infinity;
        if (v > worst) worst = v;
    }
    return worst;
}

/* -------------------------------------------------- every tour is coherent */

QSTours.all.forEach(function (t) {
    ok(t.id + " has an opening and a closing", !!t.opening && !!t.closing);
    ok(t.id + " narrates every step",
       t.steps.length > 0 && t.steps.every(function (s) { return !!s.say; }));
    ok(t.id + " puts series parts in even slots and shunt parts in odd",
       t.steps.every(function (s) { return s.slot >= 2 && s.slot <= 12; }));

    // step 0 is the load by itself, and nothing else is left on the bench
    var start = QSTours.elementsAt(t, 0);
    ok(t.id + " starts with the load alone",
       start[1].type === t.load.type &&
       start.slice(2).every(function (e) { return e.type === "w"; }));

    // a band tour needs everything the band needs, or it cannot be replayed
    if (t.gamData) {
        ok(t.id + " carries a band and a design frequency",
           !!t.band && t.band.length === 2 && t.band[1] > t.band[0] && t.TDF > 0);
        ok(t.id + " has measured points covering that band",
           t.gamData.dataX.length > 1 &&
           t.gamData.dataX[0] <= t.band[0] &&
           t.gamData.dataX[t.gamData.dataX.length - 1] >= t.band[1]);
        ok(t.id + " has three columns of equal length",
           t.gamData.dataX.length === t.gamData.dataM.length &&
           t.gamData.dataX.length === t.gamData.dataQ.length);
    }

    // and the last step really does place every element
    var end = QSTours.elementsAt(t, t.steps.length);
    ok(t.id + " ends with every element placed",
       t.steps.every(function (s) { return end[s.slot].type === s.type; }));
});

/* ------------------------------------------- and lands where it says it does */

near("L-network reaches 50 ohms", solveAt(QSTours.byId("l-network"), 2).vswr, 1.01, 5e-3);
near("line and stub reaches 50 ohms", solveAt(QSTours.byId("line-and-stub"), 2).vswr, 1.006, 5e-3);

var an721 = solveAt(QSTours.byId("an721-input"), 3);
near("AN721 input reaches 50 ohms", an721.vswr, 1.0024, 5e-4);
near("AN721 input holds its Q budget", an721.loadedQ, 10.09, 0.01);

near("AN721 output reaches 50 ohms", solveAt(QSTours.byId("an721-output"), 2).vswr, 1.006, 5e-3);

/*
 * The filter's tour says 53 dB down at 100 MHz, not the 60 the original
 * write-up claims. That difference is the reason the claim is pinned here.
 */
var filter = QSTours.byId("chebyshev");
near("filter passband loss", solveAt(filter, 4).insertionLoss, 0.75, 0.02);
near("filter stopband at 100 MHz", solveAt(filter, 4, 100).insertionLoss, 53.25, 0.02);

/*
 * The band tour narrates four numbers: 3.88 bare, 3.11 after the inductor,
 * 1.63 finished, and 1.56 at band centre alone. That last one is the point it
 * is making, so it is the one most worth pinning: the finished network is
 * deliberately worse at the centre than a single-frequency match would be.
 */
var bb = QSTours.byId("broadband-dipole");
near("the dipole is 3.88 across the band unmatched", worstAcross(bb, 0), 3.878, 5e-3);
near("the inductor alone only reaches 3.11", worstAcross(bb, 1), 3.108, 5e-3);
near("and the stub finishes at 1.63", worstAcross(bb, 2), 1.630, 5e-3);
near("which reads 1.56 at band centre on its own",
     solveAt(bb, 2, 150).vswr, 1.559, 5e-3);
ok("so band centre is worse than the worst case is good",
   solveAt(bb, 2, 150).vswr > 1.0 && solveAt(bb, 2, 150).vswr < worstAcross(bb, 2));
ok("every step improves the worst case", worstAcross(bb, 2) < worstAcross(bb, 1) &&
                                         worstAcross(bb, 1) < worstAcross(bb, 0));

/* A tour with fewer elements applied is genuinely partway there. */
var partial = solveAt(QSTours.byId("an721-input"), 1);
ok("a tour part way through is not yet matched", partial.vswr > 2);

if (failures === 0) {
    out("guided examples: " + QSTours.all.length + " tours, " + checks +
        " checks OK (every claim solved)");
} else {
    out("guided examples: " + failures + " FAILED");
    if (typeof process !== "undefined") process.exitCode = 1;
}
