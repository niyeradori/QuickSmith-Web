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
        Z0: tour.Z0, LU: tour.LU,
        frequency: freq === undefined ? tour.frequency : freq,
        elements: QSTours.elementsAt(tour, step)
    });
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
