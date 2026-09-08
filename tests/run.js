/*
 * Headless test runner for QuickSmith.
 *
 * Runs under either engine, no install required:
 *   ./tests/run.sh                      (picks whichever is available)
 *   jsc  tests/run.js                   (macOS JavaScriptCore)
 *   node tests/run.js                   (if node is installed)
 *
 * Flags:  --verbose   print every check, not just failures
 *         --json      emit machine-readable results instead of a table
 *
 * The engine files were written for a browser, so this shims the handful of
 * globals they touch (console, jQuery, navigator) and nothing else.  If a
 * future refactor makes the engine a real module, this bootstrap block is the
 * only part that has to change.
 */

var QS_ROOT, ARGV, emit, slurp, evaluate;

if (typeof process !== "undefined" && process.versions && process.versions.node) {
  /* ---- node ---- */
  var fs = require("fs"), path = require("path"), vm = require("vm");
  QS_ROOT = path.resolve(__dirname, "..") + "/";
  ARGV = process.argv.slice(2);
  emit = function (s) { process.stdout.write(s + "\n"); };
  slurp = function (rel) { return fs.readFileSync(QS_ROOT + rel, "utf8"); };
  evaluate = function (rel) { vm.runInThisContext(slurp(rel), { filename: rel }); };
} else {
  /* ---- JavaScriptCore (jsc) ---- */
  QS_ROOT = "";                                  // run.sh cds to the repo root
  ARGV = (typeof arguments !== "undefined") ? Array.prototype.slice.call(arguments) : [];
  emit = print;
  slurp = function (rel) { return readFile(QS_ROOT + rel); };
  evaluate = function (rel) { load(QS_ROOT + rel); };
}

var VERBOSE = ARGV.indexOf("--verbose") >= 0;
var AS_JSON = ARGV.indexOf("--json") >= 0;

/* ------------------------------------------------------------------ shims */
/* common.js defines a global print() that calls console.log, which would
   otherwise clobber jsc's print - capture the real one first. */
var console = { log: function () {}, warn: function () {}, error: function () {} };
var jQuery = function () {
  return { bind: function () {}, mousedown: function () {}, trigger: function () {},
           triggerHandler: function () {}, on: function () {}, css: function () {} };
};
jQuery.fn = {};
var $ = jQuery;
var navigator = { userAgent: "headless" };

/* ------------------------------------------------------------ load engine */
evaluate("js/math.min.js");
evaluate("common.js");
evaluate("sch.js");
evaluate("amp.js");
evaluate("tests/harness.js");
evaluate("tests/cases.js");

/* ---------------------------------------------------------------- run it */
var results = QSHarness.runAll(QS_CASES, slurp);

if (AS_JSON) {
  emit(JSON.stringify(results, null, 2));
} else {
  report(results);
}

function report(results) {
  var passed = 0, failed = 0, checksRun = 0, checksFailed = 0;

  emit("");
  emit("QuickSmith regression suite");
  emit("===========================");
  emit("");

  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    if (r.pass) passed++; else failed++;
    checksRun += r.checks.length;

    var mark = r.pass ? "PASS" : "FAIL";
    emit(mark + "  " + r.name);
    if (r.ref) emit("        source: " + r.ref);
    if (r.error) emit("        ERROR: " + r.error);

    for (var j = 0; j < r.checks.length; j++) {
      var c = r.checks[j];
      if (!c.pass) checksFailed++;
      if (c.pass && !VERBOSE) continue;
      var actual = (c.actual === null) ? "<missing>" : fmt(c.actual);
      emit("        " + (c.pass ? "ok  " : "BAD ") +
           pad(c.kind, 7) + pad(c.key, 22) +
           "expected " + fmt(c.expected) + " +/- " + c.tol +
           ",  got " + actual);
    }
    if (!r.pass || VERBOSE) emit("");
  }

  emit("---------------------------------------------------------------");
  emit(results.length + " cases: " + passed + " passed, " + failed + " failed" +
       "   (" + (checksRun - checksFailed) + "/" + checksRun + " checks)");
  emit("");

  if (typeof process !== "undefined" && failed > 0) process.exitCode = 1;
}

function fmt(x) {
  if (typeof x !== "number") return String(x);
  if (!isFinite(x)) return String(x);
  return (Math.abs(x) >= 1e6 || (x !== 0 && Math.abs(x) < 1e-4))
    ? x.toExponential(4) : x.toFixed(6);
}

function pad(s, n) {
  s = String(s);
  while (s.length < n) s += " ";
  return s;
}
