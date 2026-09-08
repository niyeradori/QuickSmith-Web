/*
 * Permalink round-trip checks.
 *
 * The claim being tested is not "the string looks right" but "the design that
 * comes back out solves to the same numbers as the one that went in". So each
 * case encodes a schematic, decodes it, runs both through the solver, and
 * compares the answers.
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

var ROOT = "", slurp;
if (typeof process !== "undefined" && process.versions && process.versions.node) {
    var path = require("path"), vm = require("vm"), fs = require("fs");
    ROOT = path.resolve(__dirname, "..") + "/";
    slurp = function (rel) { return fs.readFileSync(ROOT + rel, "utf8"); };
    ["engine.js", "permalink.js"].forEach(function (f) {
        vm.runInThisContext(fs.readFileSync(ROOT + f, "utf8"), { filename: f });
    });
} else {
    slurp = function (rel) { return readFile(rel); };
    load("engine.js"); load("permalink.js");
}

function asNetwork(sch) {
    return { Z0: sch.Z0, VF: sch.VF, TDF: sch.TDF, LU: sch.LU,
             termination: sch.termination, gamData: sch.gamData,
             frequency: sch.ELEMENT[0].value1, elements: sch.ELEMENT };
}

/*
 * Encode, decode, solve both, and require the answers to agree. Returns the
 * encoded string so its length can be reported.
 */
function roundTrip(label, sch, tol) {
    var link = QSLink.encode(sch);
    var back = QSLink.decode(link).sch;
    var a = QSEngine.solve(asNetwork(sch));
    var b = QSEngine.solve(asNetwork(back));
    near(label + ": Zin real", b.Zin.re, a.Zin.re, tol || 1e-6);
    near(label + ": Zin imag", b.Zin.im, a.Zin.im, tol || 1e-6);
    near(label + ": VSWR", b.vswr, a.vswr, tol || 1e-6);
    near(label + ": insertion loss", b.insertionLoss, a.insertionLoss, tol || 1e-6);
    return link;
}

function build(freq, load, slots, settings) {
    var sch = QSLink.blankSchematic();
    sch.ELEMENT[0].value1 = freq;
    sch.ELEMENT[1].type = load.type;
    sch.ELEMENT[1].value1 = load.value1;
    sch.ELEMENT[1].value2 = load.value2 || 0;
    Object.keys(slots || {}).forEach(function (k) {
        var el = sch.ELEMENT[Number(k)];
        el.type = slots[k].type;
        el.value1 = slots[k].value1;
        el.value2 = slots[k].value2 || 0;
        if (slots[k].q !== undefined) el.q = slots[k].q;
    });
    Object.keys(settings || {}).forEach(function (k) { sch[k] = settings[k]; });
    return sch;
}

/* ------------------------------------------------------------ round trips */

var link = roundTrip("AN721 input match",
    build(175, { type: "rx", value1: 1.94, value2: 1.1 },
          { 2: { type: "l", value1: 16.8 }, 3: { type: "c", value1: 38.12 },
            4: { type: "c", value1: 10.52 } }));
ok("a four-part design fits in a short link", link.length < 200, link.length + " characters");

roundTrip("line and stub, millimetres",
    build(1000, { type: "rx", value1: 10, value2: -15 },
          { 2: { type: "t", value1: 30, value2: 56.4 },
            3: { type: "o", value1: 30, value2: 38.5 } },
          { LU: "MilliMeters" }));

roundTrip("finite-Q filter",
    build(27, { type: "rx", value1: 50, value2: 0 },
          { 3: { type: "c", value1: 220, q: 800 }, 4: { type: "l", value1: 360, q: 100 },
            5: { type: "c", value1: 220, q: 800 }, 6: { type: "l", value1: 360, q: 200 } }));

roundTrip("gamma load in a 75 ohm system",
    build(433, { type: "g", value1: 0.5, value2: 45 },
          { 2: { type: "l", value1: 12 } }, { Z0: 75 }));

roundTrip("every element type at once",
    build(100, { type: "rx", value1: 50, value2: 25 },
          { 2: { type: "r", value1: 10 }, 3: { type: "l", value1: 20 },
            4: { type: "c", value1: 30 }, 5: { type: "x", value1: 40 },
            6: { type: "t", value1: 50, value2: 60 }, 7: { type: "o", value1: 70, value2: 80 },
            8: { type: "slc", value1: 90, value2: 100 },
            9: { type: "plc", value1: 110, value2: 120 },
            10: { type: "src", value1: 130, value2: 140 },
            11: { type: "s", value1: 60, value2: 30 },
            12: { type: "prc", value1: 75, value2: 4.7 } }));

/* A measured load has to travel with the design, or the link is not the design. */
var dipole = build(150, { type: "rx", value1: 0, value2: 0 },
    { 2: { type: "l", value1: 32 }, 3: { type: "s", value1: 25, value2: 95 } },
    { TDF: 150, LU: "Degrees", termination: "Multiple",
      gamData: { label: "", color: "",
                 dataX: [100, 150, 200],
                 dataM: [0.59, 0.236, 0.344],
                 dataQ: [-86.271, -112.8, -140.98] } });
roundTrip("measured load travels with the link", dipole);
var dipLink = QSLink.encode(dipole);
ok("measured data survives", QSLink.decode(dipLink).sch.gamData.dataM.length === 3);

/* --------------------------------------------------- what the link carries */

var sch = build(100, { type: "rx", value1: 500, value2: 0 },
                { 3: { type: "c", value1: 9.5 }, 4: { type: "l", value1: 240 } });
var decoded = QSLink.decode(QSLink.encode(sch)).sch;

ok("empty slots come back as wire", decoded.ELEMENT[7].type === "w");
ok("all 13 slots are present", decoded.ELEMENT.length === 13);
ok("it is a valid .sch object", String(decoded.ver) === "5");
near("frequency", decoded.ELEMENT[0].value1, 100, 1e-9);
near("load", decoded.ELEMENT[1].value1, 500, 1e-9);
near("shunt C", decoded.ELEMENT[3].value1, 9.5, 1e-9);
ok("defaults are not spelled out", QSLink.encode(sch).length <
   QSLink.encode(build(100, { type: "rx", value1: 500, value2: 0 },
                       { 3: { type: "c", value1: 9.5 }, 4: { type: "l", value1: 240 } },
                       { Z0: 75, LU: "Degrees", VF: 0.66 })).length);

/* Chart overlays ride along when they are given. */
var withChart = QSLink.decode(QSLink.encode(sch, {
    vswrCircle: 2, qCircle: 10, showMarker: true, markerM: 0.4, markerQ: 30,
    showAdmittace: true, showElementArcs: false
})).chart;
near("VSWR circle travels", withChart.vswrCircle, 2, 1e-9);
near("Q circle travels", withChart.qCircle, 10, 1e-9);
near("marker magnitude travels", withChart.markerM, 0.4, 1e-9);
ok("marker turned on", withChart.showMarker === true);
ok("admittance grid travels", withChart.showAdmittace === true);
ok("element arcs off travels", withChart.showElementArcs === false);
ok("no chart block when nothing to say", QSLink.decode(QSLink.encode(sch)).chart === null);

/* --------------------------------------------------------------- refusals */

function throws(label, fn) {
    try { fn(); failures++; out("  BAD  " + label + ": expected it to throw"); }
    catch (e) { /* as intended */ }
}
throws("garbage is rejected", function () { QSLink.decode("not-a-real-link"); });
throws("empty is rejected", function () { QSLink.decode(""); });
throws("a future version is rejected", function () {
    var future = QSLink.encode(sch);
    // flip the version by re-encoding a payload this build does not know
    QSLink.decode(QSLinkEncodeVersion(99));
    void future;
});

function QSLinkEncodeVersion(v) {
    // build a payload by hand with a different version marker
    var json = JSON.stringify({ v: v, f: 100, e: [] });
    var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    var out = "", bytes = [];
    for (var i = 0; i < json.length; i++) bytes.push(json.charCodeAt(i));
    for (i = 0; i < bytes.length; i += 3) {
        var b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2];
        out += ALPHABET.charAt(b0 >> 2);
        out += ALPHABET.charAt(((b0 & 3) << 4) | ((b1 === undefined ? 0 : b1) >> 4));
        if (b1 === undefined) break;
        out += ALPHABET.charAt(((b1 & 15) << 2) | ((b2 === undefined ? 0 : b2) >> 6));
        if (b2 === undefined) break;
        out += ALPHABET.charAt(b2 & 63);
    }
    return out;
}

/* A leading # is tolerated, since that is how it arrives from location.hash. */
var hashed = QSLink.decode("#" + QSLink.encode(sch)).sch;
near("a leading hash is fine", hashed.ELEMENT[1].value1, 500, 1e-9);

if (failures === 0) {
    out("permalink: round trips solve identically (" + link.length +
        " chars for a four-part match)");
} else {
    out("permalink: " + failures + " FAILED");
    if (typeof process !== "undefined") process.exitCode = 1;
}
