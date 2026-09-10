/*
 * Drag tuning: the inverse of one element.
 *
 * The strong check is a round trip. Take a network, note where a slot's node
 * sits, move that slot's value somewhere else, then ask tuneTo() to put the
 * node back where it was. It has to return the value we started with. That
 * tests the inverse against the solver rather than against itself, and it
 * covers every element type in both a series and a shunt slot.
 *
 * Run by tests/run.sh.
 */

var out = (typeof print === "function")
    ? print
    : function (s) { process.stdout.write(s + "\n"); };

var failures = 0, checks = 0;
function near(label, got, want, tol) {
    checks++;
    var ok = isFinite(got) && Math.abs(got - want) <= tol;
    if (!ok) { failures++; out("  BAD  " + label + ": expected " + want + ", got " + got); }
}
function isNull(label, got) {
    checks++;
    if (got !== null) { failures++; out("  BAD  " + label + ": expected null, got " + JSON.stringify(got)); }
}

var ROOT = "";
if (typeof process !== "undefined" && process.versions && process.versions.node) {
    var path = require("path"), vm = require("vm"), fs = require("fs");
    ROOT = path.resolve(__dirname, "..") + "/";
    vm.runInThisContext(fs.readFileSync(ROOT + "engine.js", "utf8"), { filename: "engine.js" });
} else {
    load("engine.js");                 // run.sh cds to the repo root
}

/* A network with the load, one series slot and one shunt slot to play with. */
function net(seriesType, seriesValue, shuntType, shuntValue) {
    var e = [];
    e[1] = { type: "rx", value1: 25, value2: -18 };
    e[3] = { type: shuntType, value1: shuntValue, value2: 0, q: 1e9 };
    e[4] = { type: seriesType, value1: seriesValue, value2: 0, q: 1e9 };
    return { Z0: 50, frequency: 140, elements: e };
}

/* Where does the node for this slot sit? */
function nodeGamma(n, index) {
    var nodes = QSEngine.solve(n).nodes;
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].slot === index) return nodes[i].gamma;
    }
    return null;
}

/*
 * Note the node, move the value, ask for the node back, expect the original
 * value. Anything the drag cannot reach would show up here as a miss.
 */
function roundTrip(label, type, index, original, moved) {
    var n = (index === 4) ? net(type, original, "c", 12) : net("l", 20, type, original);
    var target = nodeGamma(n, index);
    if (!target) { failures++; checks++; out("  BAD  " + label + ": no node for slot " + index); return; }

    n.elements[index].value1 = moved;                       // drag it away
    var back = QSEngine.tuneTo(n, index, target);           // and ask for it back
    if (!back) { failures++; checks++; out("  BAD  " + label + ": not tunable"); return; }
    near(label, back.value1, original, Math.abs(original) * 1e-6 + 1e-9);

    // and applying it really does land the node on the target
    n.elements[index].value1 = back.value1;
    var landed = nodeGamma(n, index);
    near(label + " lands", Math.hypot(landed.re - target.re, landed.im - target.im), 0, 1e-9);
}

/* --------------------------------------------------- every tunable type */

roundTrip("series L", "l", 4, 23.5, 60);
roundTrip("series C", "c", 4, 8.2, 40);
roundTrip("series R", "r", 4, 33, 5);
roundTrip("series X", "x", 4, -27, 14);

roundTrip("shunt L", "l", 3, 31, 90);
roundTrip("shunt C", "c", 3, 6.4, 30);
roundTrip("shunt R", "r", 3, 220, 60);
roundTrip("shunt X", "x", 3, 45, -80);

/* ------------------------------------------------------------- the load */

var n = net("l", 20, "c", 12);
var loadTarget = QSEngine.solve(n).nodes[0].gamma;
n.elements[1].value1 = 90; n.elements[1].value2 = 40;
var load = QSEngine.tuneTo(n, 1, loadTarget);
near("load R", load.value1, 25, 1e-9);
near("load X", load.value2, -18, 1e-9);

/* A gamma load is dragged in its own coordinates. */
n.elements[1] = { type: "g", value1: 0.4, value2: 30 };
var gTarget = QSEngine.solve(n).nodes[0].gamma;
n.elements[1].value1 = 0.9;
var gl = QSEngine.tuneTo(n, 1, gTarget);
near("gamma magnitude", gl.value1, 0.4, 1e-9);
near("gamma angle", gl.value2, 30, 1e-9);

/* -------------------------------------------- and what cannot be dragged */

isNull("a wire has nothing to tune", QSEngine.tuneTo(net("w", 0, "c", 12), 4, { re: 0.1, im: 0.1 }));
isNull("a line has two values", QSEngine.tuneTo(net("t", 50, "c", 12), 4, { re: 0.1, im: 0.1 }));
isNull("a series LC has two values", QSEngine.tuneTo(net("slc", 5, "c", 12), 4, { re: 0.1, im: 0.1 }));
isNull("a stub has two values", QSEngine.tuneTo(net("l", 20, "o", 50), 3, { re: 0.1, im: 0.1 }));

/*
 * Dragging an inductor towards negative reactance cannot go there, so it pins
 * at the smallest positive value rather than returning something impossible.
 */
var pinned = QSEngine.tuneTo(net("l", 20, "c", 12), 4, { re: -0.9, im: -0.2 });
checks++;
if (!(pinned && pinned.value1 > 0)) {
    failures++; out("  BAD  an inductor pins positive: " + JSON.stringify(pinned));
}

/*
 * Loss and the projection.
 *
 * In series it does not matter: a lossy coil is X/Q + jX, and the inverse
 * reads the reactance, which the loss leaves alone. So a series part round
 * trips exactly however bad it is.
 */
var lossySeries = net("l", 20, "c", 12);
lossySeries.elements[4].q = 30;                   // a decidedly poor coil
var st = nodeGamma(lossySeries, 4);
lossySeries.elements[4].value1 = 55;
lossySeries.elements[4].value1 = QSEngine.tuneTo(lossySeries, 4, st).value1;
var sl = nodeGamma(lossySeries, 4);
near("a lossy series part still lands exactly",
     Math.hypot(sl.re - st.re, sl.im - st.im), 0, 1e-12);

/*
 * In shunt it does: the loss goes through 1/Z, which mixes conductance into
 * susceptance, so the node lands a little off its locus. The miss is about
 * 1/Q - far below what a hand on a mouse can express, but real, and this is
 * where it would show up if the projection were ever wrong for another
 * reason.
 */
var lossyShunt = net("l", 20, "c", 12);
lossyShunt.elements[3].q = 1000;
var ht = nodeGamma(lossyShunt, 3);
lossyShunt.elements[3].value1 = 40;
lossyShunt.elements[3].value1 = QSEngine.tuneTo(lossyShunt, 3, ht).value1;
var hl = nodeGamma(lossyShunt, 3);
var miss = Math.hypot(hl.re - ht.re, hl.im - ht.im);
checks++;
if (!(miss > 0 && miss < 1e-3)) {
    failures++; out("  BAD  a lossy shunt part lands within 1/Q: miss was " + miss);
}

if (failures === 0) {
    out("drag tuning: " + checks + " checks OK (every type round trips through the solver)");
} else {
    out("drag tuning: " + failures + " FAILED");
    if (typeof process !== "undefined") process.exitCode = 1;
}
