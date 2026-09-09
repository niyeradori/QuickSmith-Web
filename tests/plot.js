/*
 * Response plot smoke test.
 *
 * QSPlot builds one SVG string, so the whole thing can be checked by reading
 * what it wrote: the right number of traces, a break where the data has a hole,
 * the working-point marker only when it is inside the sweep, and the -80 dB
 * floor that stops one numerically silly point from flattening the plot.
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

/* ------------------------------------------------------------- DOM stub */

function El(tag) {
    this.tagName = tag;
    this.className = "";
    this.innerHTML = "";
    this.textContent = "";
    this.children = [];
}
El.prototype.appendChild = function (n) { this.children.push(n); return n; };
El.prototype.insertAdjacentHTML = function (where, html) { this.innerHTML += html; };

var document = { createElement: function (t) { return new El(t); } };

var ROOT = "";
if (typeof process !== "undefined" && process.versions && process.versions.node) {
    var path = require("path"), vm = require("vm"), fs = require("fs");
    ROOT = path.resolve(__dirname, "..") + "/";
    vm.runInThisContext(fs.readFileSync(ROOT + "plot.js", "utf8"), { filename: "plot.js" });
} else {
    load("plot.js");                   // run.sh cds to the repo root
}

function count(s, re) { return (s.match(re) || []).length; }

/* ------------------------------------------------------------ the tests */

var host = new El("div");

/* Nothing to draw yet. */
QSPlot.render(host, {});
ok("an empty spec asks for a sweep",
   host.children.length === 1 && /Run a sweep/.test(host.children[0].textContent));

/* Two traces over a straight ramp. */
var xs = [], a = [], b = [];
for (var i = 0; i <= 50; i++) { xs.push(100 + i); a.push(-i / 2); b.push(-30); }
host = new El("div");
QSPlot.render(host, {
    x: xs, xLabel: "MHz", at: 125,
    series: [{ label: "S21", data: a, color: "red" }, { label: "S11", data: b, color: "blue" }]
});
ok("one polyline per trace", count(host.innerHTML, /<polyline/g) === 2,
   String(count(host.innerHTML, /<polyline/g)));
ok("the working point is marked", count(host.innerHTML, /class="qp-at"/g) === 1);
var legend = host.children[0];
ok("both traces are in the legend",
   host.children.length === 1 && legend.children.length === 2 &&
   /S21/.test(legend.children[0].innerHTML) &&
   /S11/.test(legend.children[1].innerHTML));
ok("the x axis is labelled", /<text[^>]*>MHz<\/text>/.test(host.innerHTML));

/* A working point outside the sweep is not drawn. */
host = new El("div");
QSPlot.render(host, { x: xs, at: 900, series: [{ label: "S21", data: a, color: "red" }] });
ok("a working point outside the sweep is left off",
   count(host.innerHTML, /class="qp-at"/g) === 0);

/* A hole in the data breaks the line instead of dragging it to zero. */
var holed = a.slice();
holed[20] = null;
holed[21] = NaN;
host = new El("div");
QSPlot.render(host, { x: xs, series: [{ label: "S21", data: holed, color: "red" }] });
ok("a gap splits the trace in two", count(host.innerHTML, /<polyline/g) === 2,
   String(count(host.innerHTML, /<polyline/g)));

/* One absurd point does not rescale everything else into a flat line. */
var deep = a.slice();
deep[10] = -320;
host = new El("div");
QSPlot.render(host, { x: xs, series: [{ label: "S21", data: deep, color: "red" }] });
ok("the dB axis stops at -80", /<text[^>]*>-80<\/text>/.test(host.innerHTML) &&
   !/<text[^>]*>-320<\/text>/.test(host.innerHTML));

if (failures === 0) {
    out("response plot: 8 checks OK");
} else {
    out("response plot: " + failures + " FAILED");
    if (typeof process !== "undefined") process.exitCode = 1;
}
