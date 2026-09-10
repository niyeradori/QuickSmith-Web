/*
 * Undo and redo.
 *
 * The stack is small enough to check exhaustively, and worth checking, because
 * the two ways it usually goes wrong are silent: a redo that survives a new
 * edit, and a drag that fills the stack with one entry per pointer move.
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

if (typeof process !== "undefined" && process.versions && process.versions.node) {
    var path = require("path"), vm = require("vm"), fs = require("fs");
    var ROOT = path.resolve(__dirname, "..") + "/";
    vm.runInThisContext(fs.readFileSync(ROOT + "history.js", "utf8"), { filename: "history.js" });
} else {
    load("history.js");     // run.sh cds to the repo root
}

/* An empty history has nowhere to go. */
var h = QSHistory.create();
ok("nothing to undo before the first edit", !h.canUndo());
ok("nothing to redo before the first edit", !h.canRedo());
eq("undo on an empty history returns null", h.undo(), null);
eq("redo on an empty history returns null", h.redo(), null);

/* The first state is a floor, not something to undo past. */
h.record("A");
ok("the first state alone is not undoable", !h.canUndo());
h.record("B");
h.record("C");
ok("three states, two undos available", h.canUndo());
eq("the stack holds what was recorded", h.depth(), 3);

/* Walk back, then forward, and land on the same states. */
eq("undo goes to B", h.undo(), "B");
eq("undo goes to A", h.undo(), "A");
ok("A is the floor", !h.canUndo());
eq("undo past the floor returns null", h.undo(), null);
ok("redo is available after undoing", h.canRedo());
eq("redo goes to B", h.redo(), "B");
eq("redo goes to C", h.redo(), "C");
ok("nothing to redo at the top", !h.canRedo());
eq("redo past the top returns null", h.redo(), null);

/* A state identical to the current one is not an edit. */
eq("recording the same state again is refused", h.record("C"), false);
eq("and does not grow the stack", h.depth(), 3);
eq("a different state is accepted", h.record("D"), true);

/* Editing after an undo throws the redos away. There is no branch to return
 * to, and offering one would redo work the user has already replaced. */
h.reset("1");
h.record("2");
h.record("3");
h.undo();                    // back at 2, with 3 ahead
ok("redo is on offer before the new edit", h.canRedo());
h.record("9");
ok("the new edit discarded the redo", !h.canRedo());
eq("the stack was truncated, not appended", h.depth(), 3);
eq("undo now goes back to 2", h.undo(), "2");

/* hold() is what keeps a drag to one undo. */
h.reset("start");
h.hold();
for (var i = 0; i < 40; i++) h.record("move" + i);      // a drag, one solve per move
eq("a held history records nothing", h.depth(), 1);
h.release();
h.record("move39");
eq("the drag left exactly one new state", h.depth(), 2);
eq("and it is where the pointer came up", h.undo(), "start");

/* An abandoned gesture, where the value comes back to where it started, is
 * not an edit either - the string compare catches that on its own. */
h.reset("start");
h.hold();
h.record("elsewhere");
h.release();
eq("a gesture that ends where it began records nothing", h.record("start"), false);
eq("so there is nothing to undo", h.canUndo(), false);

/* The cap discards from the old end, and the newest state stays current. */
var small = QSHistory.create(5);
for (i = 0; i < 12; i++) small.record("s" + i);
eq("the stack stops at its limit", small.depth(), 5);
eq("the current state is still the newest", small.position(), 4);
var reachable = 1;                                  // the one on screen
eq("undo walks back inside the window", small.undo(), "s10");
reachable++;
while (small.canUndo()) { small.undo(); reachable++; }
eq("only the last five are reachable", reachable, 5);

/* reset() is what a New Session does: one state, no way back. */
h.reset("fresh");
ok("a reset history has nothing to undo", !h.canUndo());
ok("a reset history has nothing to redo", !h.canRedo());
eq("and it holds just the one state", h.depth(), 1);
h.reset();
eq("reset with no state empties it", h.depth(), 0);

out(failures
    ? "undo/redo: " + failures + " of " + checks + " checks FAILED"
    : "undo/redo: " + checks + " checks OK");
if (failures && typeof process !== "undefined") process.exit(1);
