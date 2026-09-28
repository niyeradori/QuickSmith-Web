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

/* =========================================== the Bode-Fano floor, in use
 *
 * The floor is only worth showing if the Q behind it is trustworthy, so the
 * anchor case is analytic rather than measured: a series RLC has
 * Q = sqrt(L/C)/R in closed form, and Yaghjian-Best has to reproduce exactly
 * that at resonance. Nothing here is captured from match.js output.
 */
var R0 = 5, L0 = 100e-9, C0 = 100e-12;
var F0 = 1 / (2 * Math.PI * Math.sqrt(L0 * C0)) / 1e6;      // 50.3292 MHz
var QRLC = Math.sqrt(L0 / C0) / R0;                          // 6.32456

function rlcGam(lo, hi, n) {
    var X = [], M = [], A = [];
    for (var k = 0; k < n; k++) {
        var f = lo + (hi - lo) * k / (n - 1), w = 2 * Math.PI * f * 1e6;
        var zr = R0, zi = w * L0 - 1 / (w * C0);
        var dr = zr - 50, br = zr + 50, d = br * br + zi * zi;
        var gr = (dr * br + zi * zi) / d, gi = (zi * br - dr * zi) / d;
        X.push(f); M.push(Math.sqrt(gr * gr + gi * gi));
        A.push(Math.atan2(gi, gr) * 180 / Math.PI);
    }
    return { dataX: X, dataM: M, dataQ: QSEngine.unwrapPhase(A) };
}
function loadOf(gam) {
    return { Z0: 50, VF: 1, TDF: F0, LU: "Degrees", termination: "Multiple",
             gamData: gam, elements: template.elements.slice() };
}

var rlcBand = { start: F0 * 0.95, stop: F0 * 1.05, points: 61 };
near("Yaghjian-Best recovers the Q of a series RLC",
     QSMatch.loadQ(loadOf(rlcGam(F0 * 0.95, F0 * 1.05, 201)), rlcBand), QRLC, 1e-3);

/* the same antenna sampled four times as hard must not move the answer */
near("and does not depend on how densely the data was taken",
     QSMatch.loadQ(loadOf(rlcGam(F0 * 0.95, F0 * 1.05, 801)), rlcBand), QRLC, 1e-3);

/* a wider window sees more of the skirt, but must still land on the same Q */
near("nor on how wide a band is asked about",
     QSMatch.loadQ(loadOf(rlcGam(F0 * 0.8, F0 * 1.2, 401)),
                   { start: F0 * 0.8, stop: F0 * 1.2, points: 61 }), QRLC, 5e-3);

/* ---- the measured dipole, and the property that must never break */
var feas = QSMatch.feasibility(dipole, band);
near("the dipole runs Q 1.83 at band centre", feas.Q, 1.8289, 1e-3);
near("over a 0.667 fractional bandwidth", feas.fbw, 2 / 3, 1e-9);
near("which puts the floor at 1.1646", feas.floor, 1.16456, 1e-4);
ok("no three part network beats the floor, ever",
   byId["l-stub"].worst >= feas.floor,
   "floor " + feas.floor + " vs best " + byId["l-stub"].worst);
ok("and the floor is below the bare antenna, or it is telling us nothing",
   feas.floor < 3.878);

/* ---- it declines to answer where the answer would be meaningless */
eq("a zero width band gets no floor",
   QSMatch.feasibility(dipole, { start: 150, stop: 150, points: 41 }), null);
eq("and neither does a load typed as a single R+jX",
   QSMatch.feasibility(template, band), null);

/* ================================ a measurement that reads |gamma| >= 1
 *
 * A VNA on a near total reflection reports a little more power coming back
 * than went in, because its calibration error is larger than the little the
 * antenna absorbs. The 75 mm monopole does it from 300 to 612 MHz. Read
 * literally that load is lossless, nothing passive can match it, and every
 * candidate fails identically. The search is right to find nothing; what it
 * must not do is fail without saying why.
 */
var hot = { dataX: [], dataM: [], dataQ: [] };
for (var k = 0; k <= 40; k++) {
    var f = 300 + k * 10;
    hot.dataX.push(f);
    // over one below 400 MHz, sane above it
    hot.dataM.push(f < 400 ? 1.02 : 0.6);
    hot.dataQ.push(-90 - k);
}
var hotNet = { Z0: 50, VF: 1, TDF: 500, LU: "Degrees", termination: "Multiple",
               gamData: hot, elements: template.elements.slice() };

var flagged = QSMatch.overUnity(hotNet, { start: 300, stop: 700, points: 41 });
ok("an over unity stretch is found", !!flagged);
near("starting where the data does", flagged.from, 300, 1e-9);
ok("and ending before the good data", flagged.to < 400, "got " + flagged.to);
eq("a clean band is not flagged",
   QSMatch.overUnity(hotNet, { start: 450, stop: 700, points: 41 }), null);
eq("nor is a load with no measurement behind it",
   QSMatch.overUnity(template, { start: 100, stop: 200, points: 41 }), null);

/*
 * The load itself is unmatchable there, which is the deterministic fact. What
 * the search then reports is not: with the 75 mm monopole every candidate came
 * back a failure and the list was empty, while here the finite component Q
 * leaves a sliver of resistance and the best "match" is some absurd number
 * just under the failure sentinel. Both are useless, which is why the dialog
 * explains the cause rather than trying to interpret the result.
 */
var hotBand = { start: 300, stop: 700, points: 41 };
eq("the bare load is unmatchable across the bad stretch",
   QSMatch.worstVSWR(hotNet, hotNet.elements, QSMatch.bandPoints(hotBand)), 1e6);
var hotRun = QSMatch.optimise({ network: hotNet, band: hotBand, restarts: 4 });
ok("and nothing the search finds there is worth having",
   !hotRun.results.length || hotRun.results[0].worst > 1000,
   hotRun.results.length ? "best " + hotRun.results[0].worst : "empty");

var clearBand = { start: 450, stop: 700, points: 41 };
var clearRun = QSMatch.optimise({ network: hotNet, band: clearBand, restarts: 4 });
ok("once the band clears it, the same antenna matches sensibly",
   clearRun.results.length > 0 && clearRun.results[0].worst < 10,
   clearRun.results.length ? "best " + clearRun.results[0].worst : "empty");

/* ---- resampling the load onto the band must not move any answer ---- */
var dense = { dataX: [], dataM: [], dataQ: [] };
for (k = 0; k <= 400; k++) {                     // 401 points, as a VNA gives
    var fr = 100 + k * 0.25;
    dense.dataX.push(fr);
    dense.dataM.push(QSEngine.interpolate(fr, gam.dataX, gam.dataM));
    dense.dataQ.push(QSEngine.interpolate(fr, gam.dataX, gam.dataQ));
}
var denseNet = { Z0: 50, VF: 0.66, TDF: 150, LU: "Degrees", termination: "Multiple",
                 gamData: dense, elements: dipole.elements.slice() };
var denseRun = QSMatch.optimise({ network: denseNet, band: band, restarts: 20,
                                  topologies: ["l-stub"] });
near("a 401 point sweep of the same antenna gives the same answer",
     denseRun.results[0].worst, byId["l-stub"].worst, 2e-3);

/* ============================ the design frequency must not change the answer
 *
 * A length in degrees is degrees at the line design frequency, which is a way
 * of writing the number down rather than a design decision. It used to be able
 * to change the answer: the bound of 10 to 170 degrees means "shorter than a
 * half wave" when TDF sits at the band and "up to several wavelengths" when it
 * sits well below, and the optimiser always took the longer lines. Lengths are
 * searched in degrees at band centre now, so the same question gets the same
 * network whatever TDF is set to, written down differently.
 *
 * The dipole above is the reason nothing else in this file moved: its band is
 * 100 to 200 with TDF 150, so the factor is exactly 1.
 */
function atTDF(tdf) {
    var n = { Z0: 50, VF: 0.66, TDF: tdf, LU: "Degrees", termination: "Multiple",
              gamData: dipole.gamData, elements: dipole.elements.slice() };
    return QSMatch.optimise({ network: n, band: band, restarts: 12,
                              topologies: ["l-stub"] }).results[0];
}
var atBand = atTDF(150);                       // 150 is this band's centre
var atLow  = atTDF(50);
var atHigh = atTDF(450);
near("a third of the design frequency gives the same match",
     atLow.worst, atBand.worst, 1e-9);
near("and three times it does too", atHigh.worst, atBand.worst, 1e-9);
near("the stub is the same piece of line, written smaller",
     atLow.elements[1].value2 * 3, atBand.elements[1].value2, 1e-6);
near("and written larger",
     atHigh.elements[1].value2 / 3, atBand.elements[1].value2, 1e-6);

/* and the length actually stays inside a half wave at the band, which is the
   whole point of tying the bound to the band rather than to TDF */
ok("the answer is a buildable length at the band",
   atLow.elements[1].value2 * (150 / 50) < 180,
   "got " + (atLow.elements[1].value2 * 3) + " degrees at band centre");

/* ---- and the promise still holds after the conversion ---- */
var lowNet = { Z0: 50, VF: 0.66, TDF: 50, LU: "Degrees", termination: "Multiple",
               gamData: dipole.gamData, elements: dipole.elements.slice() };
near("what it scores is still what the solver reads back",
     QSMatch.worstVSWR(lowNet,
         QSMatch.elementsFor(topo, atLow.params, lowNet,
                             Number(lowNet.TDF) / 150),
         QSMatch.bandPoints(band)),
     atLow.worst, 1e-9);

out(failures
    ? "broadband matching: " + failures + " of " + checks + " checks FAILED"
    : "broadband matching: " + checks + " checks OK");
if (failures && typeof process !== "undefined") process.exitCode = 1;
