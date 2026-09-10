/*
 * Microstrip and coax.
 *
 * Two things are checked. Published widths, because a synthesis that is
 * self-consistent but wrong would pass any round-trip test you cared to
 * write; and the round trip itself, because the two directions are shown to
 * the user side by side and have to agree.
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
        failures++; out("  BAD  " + label + ": expected " + want + " +/- " + tol + ", got " + got);
    }
}
function ok(label, cond) {
    checks++;
    if (!cond) { failures++; out("  BAD  " + label); }
}

if (typeof process !== "undefined" && process.versions && process.versions.node) {
    var path = require("path"), vm = require("vm"), fs = require("fs");
    var ROOT = path.resolve(__dirname, "..") + "/";
    ["line.js", "engine.js"].forEach(function (f) {
        vm.runInThisContext(fs.readFileSync(ROOT + f, "utf8"), { filename: f });
    });
} else {
    load("line.js"); load("engine.js");     // run.sh cds to the repo root
}

var ms = QSLine.microstrip;

/* ------------------------------------------------- widths people published */

/*
 * Boards whose 50 ohm width is quoted in the manufacturers' own notes. The
 * tolerances are the spread between quasi-static models, not slack: a value
 * outside these is a wrong formula, not a rounding difference.
 */
var BOARDS = [
    { name: "FR-4, 1.6 mm",            er: 4.4,  h: 1.6,   Z0: 50, w: 3.08, tol: 0.10, eeff: 3.33, etol: 0.05 },
    { name: "RO4350B, 0.762 mm",       er: 3.48, h: 0.762, Z0: 50, w: 1.74, tol: 0.08, eeff: 2.74, etol: 0.05 },
    { name: "RT/duroid 5880, 0.787 mm", er: 2.2,  h: 0.787, Z0: 50, w: 2.44, tol: 0.08, eeff: 1.87, etol: 0.05 },
    { name: "alumina, 0.635 mm",       er: 9.8,  h: 0.635, Z0: 50, w: 0.614, tol: 0.03, eeff: 6.60, etol: 0.10 }
];

BOARDS.forEach(function (b) {
    var r = ms.width(b.Z0, b.er);
    near(b.name + " 50 ohm track width", r.wOverH * b.h, b.w, b.tol);
    near(b.name + " effective permittivity", r.eeff, b.eeff, b.etol);
});

/* An air microstrip sees no substrate at all, so the wave travels at c. */
var air = ms.width(50, 1);
near("air microstrip has eeff 1", air.eeff, 1, 1e-9);
near("air microstrip 50 ohm W/h", air.wOverH, 4.908, 0.01);

/* eeff always sits between the air above and the board below. */
[0.05, 0.2, 1, 2, 5, 20].forEach(function (u) {
    var e = ms.eeff(u, 4.4);
    ok("W/h " + u + ": eeff is between 1 and er", e > 1 && e < 4.4);
});
ok("a wider track pulls more field into the board",
   ms.eeff(0.2, 4.4) < ms.eeff(2, 4.4) && ms.eeff(2, 4.4) < ms.eeff(20, 4.4));
ok("a wider track is a lower impedance",
   ms.impedance(0.2, 4.4) > ms.impedance(2, 4.4) && ms.impedance(2, 4.4) > ms.impedance(20, 4.4));

/* ------------------------------------------------------------- round trip */

/* Synthesis is the analysis inverted, so this has to be exact, not close. */
[15, 25, 50, 75, 100, 150].forEach(function (Z) {
    [2.2, 3.48, 4.4, 6.15, 9.8].forEach(function (er) {
        var r = ms.width(Z, er);
        near("microstrip " + Z + " ohm on er " + er + " round trips",
             ms.impedance(r.wOverH, er), Z, 1e-9);
    });
});

/* ---------------------------------------------------------------- the coax */

/* The one number every RF engineer knows: 50 ohm air line is 2.3 to 1. */
near("50 ohm air coax is 2.30 to 1", QSLine.coax.ratio(50, 1).ratio, 2.3025, 1e-3);

/*
 * Solid polyethylene, which is what the cable on the bench is. The handbook
 * form of this is 138/sqrt(er) times a base-ten log, and 138 is a rounding of
 * eta0/(2 pi ln 10) = 138.06 - so the handbook and the constant here differ in
 * the fourth figure. These are quoted to the three the handbook prints.
 */
near("50 ohm PE coax is 3.49 to 1", QSLine.coax.ratio(50, 2.25).ratio, 3.495, 0.005);
near("75 ohm PE coax is 6.53 to 1", QSLine.coax.ratio(75, 2.25).ratio, 6.532, 0.005);

/*
 * The three air-line ratios every coax table prints. They are what fixes the
 * constant in front of the log: get that wrong and all three move together.
 */
near("minimum attenuation is 3.59 to 1, at 76.7 ohms",
     QSLine.coax.ratio(76.7, 1).ratio, 3.59, 5e-3);
near("maximum power handling is 1.65 to 1, at 30 ohms",
     QSLine.coax.ratio(30, 1).ratio, 1.65, 5e-3);
near("maximum voltage is e to 1, at just under 60 ohms",
     QSLine.coax.ratio(59.96, 1).ratio, Math.E, 5e-3);

[20, 50, 75, 93].forEach(function (Z) {
    [1, 1.43, 2.1, 2.25].forEach(function (er) {
        var n = QSLine.coax.ratio(Z, er).ratio;
        near("coax " + Z + " ohm at er " + er + " round trips",
             QSLine.coax.impedance(n, er), Z, 1e-9);
    });
});

/* -------------------------------------------------------------- the length */

/* A quarter wave is a quarter of a wavelength, slowed by the substrate. */
var q = QSLine.length(90, 2000, 3.332);
near("quarter wave on FR-4 at 2 GHz", q * 1000, 20.53, 0.05);
near("and the solver agrees it is 90 degrees",
     QSEngine.solve({ Z0: 50, frequency: 2000, VF: 1 / Math.sqrt(3.332), LU: "MilliMeters",
                      elements: { 1: { type: "rx", value1: 1e9, value2: 0 },
                                  2: { type: "t", value1: 50, value2: q * 1000 } } }).Zin.re,
     0, 1e-4);
near("length and degrees are inverses", QSLine.degrees(q, 2000, 3.332), 90, 1e-9);
near("a half wave is twice a quarter wave", QSLine.length(180, 2000, 3.332), 2 * q, 1e-15);
near("air at 300 MHz: a quarter wave is 250 mm", QSLine.length(90, 300, 1) * 1000, 249.83, 0.02);

/* -------------------------------- and the same line, solved by the engine */

/*
 * The point of all this is a line the solver can use. A quarter-wave 50 ohm
 * transformer between 25 and 100 ohms is the textbook check: build it from
 * the synthesised width and length and the input should land on 50 ohms.
 */
var board = ms.width(50, 4.4);
var Lm = QSLine.length(90, 2000, board.eeff);
var VF = QSLine.velocityFactor(board.eeff);

var r = QSEngine.solve({
    Z0: 50, frequency: 2000, VF: VF, LU: "MilliMeters",
    elements: { 1: { type: "rx", value1: 100, value2: 0 },
                2: { type: "t", value1: 50, value2: Lm * 1000 } }
});
near("a synthesised quarter wave transforms 100 ohms to 25", r.Zin.re, 25, 1e-6);
near("and adds no reactance", r.Zin.im, 0, 1e-6);

/* The velocity factor is the whole bridge between this file and the solver:
 * get it wrong and the length is wrong by sqrt(eeff). */
near("velocity factor is 1/sqrt(eeff)", VF, 1 / Math.sqrt(board.eeff), 1e-15);
near("FR-4 microstrip velocity factor", VF, 0.5478, 5e-4);

out(failures
    ? "line synthesis: " + failures + " of " + checks + " checks FAILED"
    : "line synthesis: " + checks + " checks OK (microstrip and coax, both directions)");
if (failures && typeof process !== "undefined") process.exit(1);
