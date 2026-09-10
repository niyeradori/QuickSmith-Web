/*
 * Touchstone reader/writer checks.
 *
 * The interesting assertions are the ones that cross-check against data
 * QuickSmith already holds in another form: touchstone/dipole.s1p has to come
 * back as the same load as gam/dipole.gam, and touchstone/hp-an970.s2p has to
 * give the same K and |Delta| that Example 7 states.
 *
 * Run by tests/run.sh.
 */

var out = (typeof print === "function")
    ? print
    : function (s) { process.stdout.write(s + "\n"); };

var failures = 0;
function ok(label, cond, detail) {
    if (!cond) { failures++; out("  BAD  " + label + (detail ? ": " + detail : "")); }
}
function near(label, got, want, tol) {
    ok(label, isFinite(got) && Math.abs(got - want) <= tol,
       "expected " + want + " +/- " + tol + ", got " + got);
}
function throws(label, fn) {
    try { fn(); failures++; out("  BAD  " + label + ": expected it to throw"); }
    catch (e) { /* as intended */ }
}

var ROOT = "", slurp;
if (typeof process !== "undefined" && process.versions && process.versions.node) {
    var path = require("path"), vm = require("vm"), fs = require("fs");
    ROOT = path.resolve(__dirname, "..") + "/";
    slurp = function (rel) { return fs.readFileSync(ROOT + rel, "utf8"); };
    ["engine.js", "touchstone.js"].forEach(function (f) {
        vm.runInThisContext(fs.readFileSync(ROOT + f, "utf8"), { filename: f });
    });
} else {
    slurp = function (rel) { return readFile(rel); };
    load("engine.js"); load("touchstone.js");
}

/* ------------------------------------------------------- option-line forms */

var ri = QSTouchstone.parse("# MHZ S RI R 50\n100 0.5 0.25\n", 1);
near("RI real", ri.points[0].s[0].re, 0.5, 1e-12);
near("RI imag", ri.points[0].s[0].im, 0.25, 1e-12);
near("MHz stays MHz", ri.points[0].f, 100, 1e-12);

var ma = QSTouchstone.parse("# GHZ S MA R 50\n1.5 0.5 90\n", 1);
near("GHz becomes MHz", ma.points[0].f, 1500, 1e-9);
near("MA real", ma.points[0].s[0].re, 0, 1e-12);
near("MA imag", ma.points[0].s[0].im, 0.5, 1e-12);

var db = QSTouchstone.parse("# HZ S DB R 75\n2000000 -6.0206 180\n", 1);
near("Hz becomes MHz", db.points[0].f, 2, 1e-9);
near("dB magnitude", Math.sqrt(Math.pow(db.points[0].s[0].re, 2) +
                               Math.pow(db.points[0].s[0].im, 2)), 0.5, 1e-4);
near("reference impedance read", db.R, 75, 1e-12);

var bare = QSTouchstone.parse("1.0 0.5 0\n", 1);
near("default unit is GHz", bare.points[0].f, 1000, 1e-9);
near("default reference is 50", bare.R, 50, 1e-12);

var commented = QSTouchstone.parse(
    "! a leading comment\n\n# MHZ S MA R 50\n100 0.5 10   ! trailing comment\n\n", 1);
ok("comments and blank lines ignored", commented.points.length === 1);

ok("ports inferred for 1-port", QSTouchstone.parse("# MHZ S MA R 50\n100 0.5 10\n").ports === 1);
ok("ports inferred for 2-port",
   QSTouchstone.parse("# MHZ S MA R 50\n1 .1 0 .2 0 .3 0 .4 0\n").ports === 2);
ok("ports from filename", QSTouchstone.portsFromFilename("dipole.S2P") === 2 &&
   QSTouchstone.portsFromFilename("x.s1p") === 1 &&
   QSTouchstone.portsFromFilename("notes.txt") === null);

throws("a short row is rejected", function () {
    QSTouchstone.parse("# MHZ S MA R 50\n100 0.5\n", 1);
});
throws("junk is rejected", function () {
    QSTouchstone.parse("# MHZ S MA R 50\n100 bogus 3\n", 1);
});
throws("an empty file is rejected", function () { QSTouchstone.parse("", 1); });

/* ------------------------------------------- dipole.s1p against dipole.gam */

var dip = QSTouchstone.parse(slurp("touchstone/dipole.s1p"), 1);
var gam = JSON.parse(slurp("gam/dipole.gam")).gamData;

ok("dipole has 12 points", dip.points.length === 12, "got " + dip.points.length);
var g = QSTouchstone.toGamData(dip, 50);
var maxM = 0, maxQ = 0, maxF = 0;
for (var i = 0; i < g.dataX.length; i++) {
    maxF = Math.max(maxF, Math.abs(g.dataX[i] - Number(gam.dataX[i])));
    maxM = Math.max(maxM, Math.abs(g.dataM[i] - Number(gam.dataM[i])));
    maxQ = Math.max(maxQ, Math.abs(g.dataQ[i] - Number(gam.dataQ[i])));
}
near("dipole frequencies match the .gam", maxF, 0, 1e-9);
near("dipole magnitudes match the .gam", maxM, 0, 1e-9);
near("dipole angles match the .gam", maxQ, 0, 1e-9);

/* Feed it through the solver as a load and reproduce Example 4's answer. */
var elements = [];
elements[1] = { type: "rx", value1: 0, value2: 0 };
elements[2] = { type: "l", value1: 32 };
elements[3] = { type: "s", value1: 25, value2: 95 };
var r = QSEngine.solve({
    Z0: 50, TDF: 150, LU: "Degrees", frequency: 150,
    termination: "Multiple",
    gamData: { dataX: g.dataX, dataM: g.dataM,
               dataQ: QSEngine.unwrapPhase(g.dataQ) },
    elements: elements
});
near("Example 4 rebuilt from the .s1p", r.vswr, 1.295842, 1e-5);

/* ------------------------------------- hp-an970.s2p against Example 7's K */

var dev = QSTouchstone.parse(slurp("touchstone/hp-an970.s2p"), 2);
ok("2-port file", dev.ports === 2);
near("S-parameter frequency", dev.points[0].f, 6000, 1e-9);

var sp = QSTouchstone.sParamsAt(dev, 6000);
near("S11 magnitude", sp.S11M, 0.641, 1e-9);
near("S11 angle", sp.S11A, -171.3, 1e-9);
near("S21 magnitude", sp.S21M, 2.058, 1e-9);   // column 2 is S21, not S12
near("S21 angle", sp.S21A, 28.5, 1e-9);
near("S12 magnitude", sp.S12M, 0.057, 1e-9);
near("S22 angle", sp.S22A, -95.7, 1e-9);

/* The stability figures Example 7 quotes, straight from the file. */
function polar(m, a) { var r = a * Math.PI / 180; return { re: m * Math.cos(r), im: m * Math.sin(r) }; }
function mul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
function sub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
function abs(a) { return Math.sqrt(a.re * a.re + a.im * a.im); }

var S11 = polar(sp.S11M, sp.S11A), S12 = polar(sp.S12M, sp.S12A);
var S21 = polar(sp.S21M, sp.S21A), S22 = polar(sp.S22M, sp.S22A);
var D = sub(mul(S11, S22), mul(S12, S21));
var K = (1 - Math.pow(abs(S11), 2) - Math.pow(abs(S22), 2) + Math.pow(abs(D), 2)) /
        (2 * abs(mul(S12, S21)));
near("Example 7 K from the .s2p", K, 1.504, 5e-4);
near("Example 7 |Delta| from the .s2p", abs(D), 0.301, 5e-4);

/* --------------------------------------------------------- renormalising */

var g75 = QSTouchstone.renormalise({ re: 0, im: 0 }, 75, 50);
near("a 75 ohm match seen from 50 ohms", Math.sqrt(g75.re * g75.re + g75.im * g75.im),
     (75 - 50) / (75 + 50), 1e-12);
var back = QSTouchstone.renormalise(QSTouchstone.renormalise({ re: 0.3, im: -0.4 }, 50, 75), 75, 50);
near("renormalising there and back, real", back.re, 0.3, 1e-12);
near("renormalising there and back, imag", back.im, -0.4, 1e-12);

/* ------------------------------------------------------------ round trip */

var written = QSTouchstone.formatS1P([
    { f: 100, mag: 0.59, angle: -86.271 },
    { f: 200, mag: 0.344, angle: -140.98 }
], { R: 50, title: "round trip" });
var reread = QSTouchstone.parse(written, 1);
var rg = QSTouchstone.toGamData(reread, 50);
near("round trip frequency", rg.dataX[1], 200, 1e-9);
near("round trip magnitude", rg.dataM[0], 0.59, 1e-6);
near("round trip angle", rg.dataQ[1], -140.98, 1e-4);

if (failures === 0) {
    out("touchstone: reader, writer and both sample files OK");
} else {
    out("touchstone: " + failures + " FAILED");
    if (typeof process !== "undefined") process.exitCode = 1;
}
