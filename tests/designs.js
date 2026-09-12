/*
 * The shelf of named designs.
 *
 * The storage itself is small, but the things it has to get right are easy to
 * get wrong quietly: a re-save under the same name must replace rather than
 * duplicate, a full shelf must drop the oldest and not the newest, and a
 * browser that refuses to store must say so rather than pretend.
 *
 * Run by tests/run.sh.
 */

var out = (typeof print === "function")
    ? print
    : function (s) { process.stdout.write(s + "\n"); };

var failures = 0, checks = 0;
function ok(label, cond) {
    checks++;
    if (!cond) { failures++; out("  BAD  " + label); }
}
function eq(label, got, want) {
    checks++;
    if (got !== want) { failures++; out("  BAD  " + label + ": expected " + want + ", got " + got); }
}

/* A stand-in for the browser's localStorage: same three calls, and a switch
   that makes it refuse writes the way a full one does. */
var fake = {
    data: {},
    full: false,
    getItem: function (k) { return (k in this.data) ? this.data[k] : null; },
    setItem: function (k, v) {
        if (this.full) throw new Error("QuotaExceededError");
        this.data[k] = String(v);
    }
};
var localStorage = fake;        // what designs.js looks for

if (typeof process !== "undefined" && process.versions && process.versions.node) {
    var path = require("path"), vm = require("vm"), fs = require("fs");
    var ROOT = path.resolve(__dirname, "..") + "/";
    global.localStorage = fake;
    vm.runInThisContext(fs.readFileSync(ROOT + "designs.js", "utf8"), { filename: "designs.js" });
} else {
    load("designs.js");         // run.sh cds to the repo root
}

var sch = function (z0) { return { ver: 5, Z0: z0, ELEMENT: [] }; };

/* An untouched browser has an empty shelf, not a broken one. */
eq("a browser that has never saved has nothing", QSDesigns.list().length, 0);
eq("and asking for a design by name returns null", QSDesigns.find("nope"), null);

/* The round trip. */
ok("saving reports success", QSDesigns.save("Antenna tuner", sch(50)));
eq("one design on the shelf", QSDesigns.list().length, 1);
eq("under the name given", QSDesigns.list()[0].name, "Antenna tuner");
eq("with the design intact", QSDesigns.find("Antenna tuner").sch.Z0, 50);
ok("and a timestamp", !!QSDesigns.find("Antenna tuner").saved);

/* Newest first, so the list reads the way you worked. */
QSDesigns.save("LNA input", sch(75));
eq("the newest is at the top", QSDesigns.list()[0].name, "LNA input");
eq("the older one below it", QSDesigns.list()[1].name, "Antenna tuner");

/* Re-saving your work in progress replaces it - no trail of copies. */
QSDesigns.save("Antenna tuner", sch(100));
eq("re-saving a name does not add a second one", QSDesigns.list().length, 2);
eq("it holds the new design", QSDesigns.find("Antenna tuner").sch.Z0, 100);
eq("and comes back to the top", QSDesigns.list()[0].name, "Antenna tuner");

/* Names are typed, so they get trimmed, and a blank one is not a name. */
QSDesigns.save("  Spaced  ", sch(50));
ok("surrounding spaces are trimmed off", !!QSDesigns.find("Spaced"));
ok("a blank name is refused", !QSDesigns.save("   ", sch(50)));
ok("so is a save with no design", !QSDesigns.save("Empty", null));

/* Delete. */
ok("removing reports success", QSDesigns.remove("Spaced"));
eq("and it is gone", QSDesigns.find("Spaced"), null);
eq("leaving the rest alone", QSDesigns.list().length, 2);
ok("removing something that is not there is harmless", QSDesigns.remove("ghost"));

/* The shelf has a back wall: the oldest falls off, never the newest. */
fake.data = {};
for (var i = 1; i <= QSDesigns.LIMIT + 5; i++) QSDesigns.save("D" + i, sch(i));
eq("the shelf stops at the limit", QSDesigns.list().length, QSDesigns.LIMIT);
eq("the last one saved is on top", QSDesigns.list()[0].name, "D" + (QSDesigns.LIMIT + 5));
eq("the first one saved has fallen off", QSDesigns.find("D1"), null);

/* A browser that will not store has to be reported, not ignored. */
fake.full = true;
ok("a refused write reports failure", !QSDesigns.save("Nope", sch(50)));
fake.full = false;

/* Damaged storage reads as empty rather than throwing on the way up. */
fake.data[QSDesigns.KEY] = "{not json";
eq("junk in storage reads as an empty shelf", QSDesigns.list().length, 0);
fake.data[QSDesigns.KEY] = '{"name":"not an array"}';
eq("the wrong shape reads as an empty shelf too", QSDesigns.list().length, 0);

out(failures
    ? "saved designs: " + failures + " of " + checks + " checks FAILED"
    : "saved designs: " + checks + " checks OK");
if (failures && typeof process !== "undefined") process.exit(1);
