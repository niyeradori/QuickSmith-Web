/*
 * Broadband matching: the search, and the promises it makes.
 *
 * An optimiser is easy to write and hard to trust. These checks pin the two
 * things that make it trustworthy rather than merely plausible.
 *
 * It must agree with the solver. Every candidate is evaluated through
 * QSEngine.solve(), so a network the optimiser scores at 1.630 must read 1.630
 * when the program applies it. If those two ever part company the feature is
 * worse than useless, because it lies confidently.
 *
 * It must be deterministic. The restarts are random, so without a fixed seed
 * two runs on the same antenna give different components, and a tool that
 * cannot reproduce its own answer will not be believed.
 *
 * The regression values come from the measured dipole in touchstone/, and were
 * derived independently before match.js existed, by a standalone optimiser
 * written against the element equations rather than against this code.
 *
 * Run by tests/run.sh.
 */

var out = (typeof print === "function")
    ? print
    : function (s) { process.stdout.write(s + "\n"); };

var failures = 0, checks = 0;
function ok(label, cond, detail) {
    checks++;
    if (!cond) { failures++; out("  BAD  " + label + (detail ? ": " + detail : "")); }
}
function near(label, got, want, tol) {
    ok(label, isFinite(got) && Math.abs(got - want) <= tol,
       "expected " + want + " +/- " + tol + ", got " + got);
}
function eq(label, got, want) {
    ok(label, got === want, "expected " + want + ", got " + got);
}

var slurp;
if (typeof process !== "undefined" && process.versions && process.versions.node) {
    var path = require("path"), vm = require("vm"), fs = require("fs");
    var ROOT = path.resolve(__dirname, "..") + "/";
    slurp = function (rel) { return fs.readFileSync(ROOT + rel, "utf8"); };
    ["engine.js", "touchstone.js", "match.js"].forEach(function (f) {
        vm.runInThisContext(fs.readFileSync(ROOT + f, "utf8"), { filename: f });
    });
} else {
    slurp = function (rel) { return readFile(rel); };
    load("engine.js"); load("touchstone.js"); load("match.js");
}

/* ------------------------------------------------- the Bode-Fano floor */
near("Bode-Fano, Q 5 over 20 percent", QSMatch.bodeFano(5, 0.20), 1.0903, 1e-4);
near("a lower Q antenna can do better", QSMatch.bodeFano(2.5, 0.20), 1.0037, 1e-4);
near("a high Q one over a wide band cannot", QSMatch.bodeFano(9.3, 0.50), 3.0720, 5e-3);
ok("and it refuses nonsense", QSMatch.bodeFano(0, 0.2) === null &&
                              QSMatch.bodeFano(5, 0) === null);

/* ------------------------------------------------------ band arithmetic */
var pts = QSMatch.bandPoints({ start: 100, stop: 200, points: 41 });
eq("a band has the points asked for", pts.length, 41);
eq("starting at the start", pts[0], 100);
eq("and ending at the stop", pts[40], 200);

/* ------------------------------------------- the load is never overwritten */
var template = { Z0: 50, VF: 0.66, TDF: 150, LU: "Degrees", termination: "Single",
                 elements: [] };
for (var i = 0; i <= 12; i++) {
    template.elements.push({ index: i, type: "w", value1: 0, value2: 0, q: 1e6, tune: 1 });
}
template.elements[1] = { index: 1, type: "rx", value1: 25, value2: -40, q: 1e6, tune: 1 };

var topo = QSMatch.TOPOLOGIES.filter(function (t) { return t.id === "l-stub"; })[0];
var els = QSMatch.elementsFor(topo, [40, 32, 93], template);
eq("the load survives untouched", els[1].value1, 25);
eq("a series inductor lands in an even slot", els[2].type + els[2].index, "l2");
eq("carrying its value", els[2].value1, 40);
eq("a stub lands in an odd slot, because a stub is a shunt", els[3].type + els[3].index, "s3");
eq("with its impedance first", els[3].value1, 32);
eq("and its length second", els[3].value2, 93);
eq("everything else is left as wire", els[5].type, "w");

/* ================================================ the measured dipole
 *
 * touchstone/dipole.s1p across its full octave. The two regression values
 * below were produced by an independent optimiser before this module existed.
 */
var parsed = QSTouchstone.parse(slurp("touchstone/dipole.s1p"), 1);
var gam = QSTouchstone.toGamData(parsed, 50);
var dipole = { Z0: 50, VF: 0.66, TDF: 150, LU: "Degrees", termination: "Multiple",
               gamData: { dataX: gam.dataX, dataM: gam.dataM, dataQ: gam.dataQ },
               elements: template.elements.slice() };
dipole.elements[1] = { index: 1, type: "rx", value1: 50, value2: 0, q: 1e6, tune: 1 };

var band = { start: 100, stop: 200, points: 41 };
near("the bare antenna is 3.878 across the octave",
     QSMatch.worstVSWR(dipole, dipole.elements, QSMatch.bandPoints(band)), 3.878, 0.002);

var run = QSMatch.optimise({ network: dipole, band: band, restarts: 20,
                             topologies: ["l-stub", "l-lc"] });
var byId = {};
run.results.forEach(function (r) { byId[r.id] = r; });

near("series L then a stub reaches 1.630", byId["l-stub"].worst, 1.630, 0.005);
near("and it wants about 39.8 nH", byId["l-stub"].params[0], 39.8, 0.5);
near("into about a 32 ohm stub", byId["l-stub"].params[1], 32.0, 1.0);
near("a lumped L network can only reach 2.579", byId["l-lc"].worst, 2.579, 0.005);
ok("so the stub is worth having", byId["l-stub"].worst < byId["l-lc"].worst);
ok("results come back best first", run.results[0].worst <= run.results[1].worst);

/* ---- the promise: what the optimiser scores is what the solver will show */
var applied = QSMatch.elementsFor(
    QSMatch.TOPOLOGIES.filter(function (t) { return t.id === "l-stub"; })[0],
    byId["l-stub"].params, dipole);
near("the score survives being applied",
     QSMatch.worstVSWR(dipole, applied, QSMatch.bandPoints(band)),
     byId["l-stub"].worst, 1e-9);

/* ---- determinism: the same question twice gives the same answer */
var again = QSMatch.optimise({ network: dipole, band: band, restarts: 20,
                              topologies: ["l-stub"] });
near("the same seed gives the same worst case", again.results[0].worst,
     byId["l-stub"].worst, 1e-12);
near("and the same components", again.results[0].params[0],
     byId["l-stub"].params[0], 1e-12);

/* ---- bounds are a promise too, since an unbuildable answer is no answer */
var tight = QSMatch.optimise({
    network: dipole, band: band, restarts: 12, topologies: ["l-stub"],
    bounds: { Z: { lo: 45, hi: 60 } }
});
var z = tight.results[0].params[1];
ok("a stub impedance bound is respected", z >= 45 - 1e-9 && z <= 60 + 1e-9,
   "got " + z);
ok("and constraining it costs performance, as it must",
   tight.results[0].worst > byId["l-stub"].worst);

out(failures
    ? "broadband matching: " + failures + " of " + checks + " checks FAILED"
    : "broadband matching: " + checks + " checks OK");
if (failures && typeof process !== "undefined") process.exitCode = 1;
