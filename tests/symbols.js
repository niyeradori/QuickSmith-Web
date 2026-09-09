/*
 * Component symbol test.
 *
 * The sprite is one string, so most of what can go wrong is visible in it:
 * a missing symbol for a type the ladder can hold, a path that does not come
 * back to the wire it started on, or a letter drawn sideways in a shunt slot.
 * What it cannot tell you is whether a capacitor looks like a capacitor.
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

var ROOT = "";
if (typeof process !== "undefined" && process.versions && process.versions.node) {
    var path = require("path"), vm = require("vm"), fs = require("fs");
    ROOT = path.resolve(__dirname, "..") + "/";
    vm.runInThisContext(fs.readFileSync(ROOT + "symbols.js", "utf8"), { filename: "symbols.js" });
} else {
    load("symbols.js");                // run.sh cds to the repo root
}

var sprite = QSSym.sprite();

/* Every element type the schematic can hold needs both forms: the ladder asks
   for the series one in an even slot and the shunt one in an odd slot without
   checking first. */
var TYPES = ["w", "r", "l", "c", "slc", "src", "plc", "prc",
             "x", "t", "o", "s", "g", "rx"];
TYPES.forEach(function (t) {
    ok(t + " has a series symbol", sprite.indexOf('id="qs-sym-' + t + '-h"') > 0);
    ok(t + " has a shunt symbol", sprite.indexOf('id="qs-sym-' + t + '-v"') > 0);
});
ok("no other symbols are defined",
   (sprite.match(/<symbol /g) || []).length === TYPES.length * 2);

/* The series frame is 61 x 20 with the wire at y = 10, the shunt frame
   20 x 70. Those are the sizes the slot CSS reserves. */
ok("series symbols use the 61x20 frame",
   (sprite.match(/viewBox="0 0 61 20"/g) || []).length === TYPES.length);
ok("shunt symbols use the 20x70 frame",
   (sprite.match(/viewBox="0 0 20 70"/g) || []).length === TYPES.length);

/* A resistor's zigzag has to end level with the wire it left, or the leads
   join at different heights. Walk the path and add up the vertical moves. */
function verticalDrift(d) {
    var sum = 0, re = /l\s*(-?[\d.]+)\s+(-?[\d.]+)/g, m;
    while ((m = re.exec(d))) sum += Number(m[2]);
    return sum;
}
var zig = /id="qs-sym-r-h"[^>]*>.*?<path[^>]*\sd="([^"]+)"/.exec(sprite);
ok("a resistor is drawn", !!zig);
ok("the resistor zigzag comes back to the wire",
   Math.abs(verticalDrift(zig[1])) < 1e-9, String(verticalDrift(zig[1])));

/* Only the wire-art symbols are rotated for their shunt form. A letter has to
   stay upright, so anything with text is drawn twice. */
var lettered = ["x", "t", "o", "s", "g", "rx"];
lettered.forEach(function (t) {
    var block = new RegExp('id="qs-sym-' + t + '-v"(.*?)</symbol>').exec(sprite);
    ok(t + " keeps its label upright", block && block[1].indexOf("rotate(") < 0);
});
["r", "l", "c", "w"].forEach(function (t) {
    var block = new RegExp('id="qs-sym-' + t + '-v"(.*?)</symbol>').exec(sprite);
    ok(t + " reuses the series drawing", block && block[1].indexOf("rotate(90)") > 0);
});

/* The stroke has to travel with the clone, so it lives on a group inside the
   symbol rather than in a stylesheet the shadow tree cannot see. */
ok("stroke style is inside every symbol",
   (sprite.match(/stroke="currentColor"/g) || []).length >= TYPES.length * 2);
ok("no stylesheet is relied on", sprite.indexOf("<style") < 0);

if (failures === 0) {
    out("component symbols: " + (TYPES.length * 2) + " symbols OK");
} else {
    out("component symbols: " + failures + " FAILED");
    if (typeof process !== "undefined") process.exitCode = 1;
}
