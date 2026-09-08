/*
 * Chart renderer smoke test.
 *
 * Two halves:
 *
 *   1. Grid geometry, which is pure arithmetic. A constant-resistance circle
 *      must cross the real axis at (r-1)/(r+1) and touch the rim at gamma = 1;
 *      a constant-reactance arc must pass through gamma = 1 and meet the rim
 *      where z = jx maps to. Those are checkable without any browser at all.
 *
 *   2. An actual mount and render, against a DOM stub small enough to fit on
 *      one screen. That will not tell you the chart looks right - only a
 *      browser does that - but it does prove the renderer runs end to end,
 *      builds the tree it claims to, and has no typos or undefined names in
 *      paths a unit test would otherwise never reach.
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

/* ------------------------------------------------------------- DOM stub */

function Node(tag, ns) {
    this.tagName = tag;
    this.namespaceURI = ns || null;
    this.childNodes = [];
    this.attributes = {};
    this.style = {};
    this.textContent = "";
    this.parentNode = null;
    this.hidden = false;
    this.className = "";
    this.id = "";
}
Node.prototype.setAttribute = function (k, v) {
    this.attributes[k] = String(v);
    if (k === "id") this.id = String(v);
    if (k === "class") this.className = String(v);
};
Node.prototype.getAttribute = function (k) {
    return this.attributes.hasOwnProperty(k) ? this.attributes[k] : null;
};
Node.prototype.removeAttribute = function (k) { delete this.attributes[k]; };
Node.prototype.appendChild = function (n) {
    n.parentNode = this; this.childNodes.push(n); return n;
};
Node.prototype.insertBefore = function (n) {
    n.parentNode = this; this.childNodes.unshift(n); return n;
};
Node.prototype.removeChild = function (n) {
    var i = this.childNodes.indexOf(n);
    if (i >= 0) this.childNodes.splice(i, 1);
    n.parentNode = null;
    return n;
};
Node.prototype.replaceChild = function (fresh, old) {
    var i = this.childNodes.indexOf(old);
    if (i >= 0) this.childNodes[i] = fresh; else this.childNodes.push(fresh);
    fresh.parentNode = this;
    return old;
};
Node.prototype.addEventListener = function () { };
Node.prototype.setPointerCapture = function () { };
Node.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, width: 600, height: 600, right: 600, bottom: 600 };
};
Object.defineProperty(Node.prototype, "firstChild", {
    get: function () { return this.childNodes.length ? this.childNodes[0] : null; }
});

var registry = {};
var document = {
    head: new Node("head"),
    createElement: function (t) { return new Node(t); },
    createElementNS: function (ns, t) { return new Node(t, ns); },
    getElementById: function (id) { return registry[id] || null; }
};
var window = {
    matchMedia: function () { return { matches: false }; },
    getComputedStyle: function () { return { getPropertyValue: function () { return "#000000"; } }; }
};
var localStorage = {
    _v: {},
    getItem: function (k) { return this._v.hasOwnProperty(k) ? this._v[k] : null; },
    setItem: function (k, v) { this._v[k] = String(v); }
};
var navigator = { userAgent: "headless" };
var console = { log: function () {}, warn: function () {}, error: function () {} };
var jQuery = function () { return {}; };
jQuery.fn = {}; var $ = jQuery;

/* ------------------------------------------------------------- the code */

var ROOT = "";
if (typeof process !== "undefined" && process.versions && process.versions.node) {
    var path = require("path"), vm = require("vm"), fs = require("fs");
    ROOT = path.resolve(__dirname, "..") + "/";
    ["engine.js", "common.js", "smith.js", "sch.js"].forEach(function (f) {
        vm.runInThisContext(fs.readFileSync(ROOT + f, "utf8"), { filename: f });
    });
} else {
    ["engine.js", "common.js", "smith.js", "sch.js"].forEach(function (f) { load(f); });
}

var AXIS_RANGE = 1000;      // the pages declare this; the geometry helpers use it

/* --------------------------------------------------------- 1. geometry */

QSChart.grid.rMajor.concat(QSChart.grid.rMinor).forEach(function (r) {
    var c = QSChart.rCircleGeometry(r);
    // touches the rim at gamma = +1
    near("r=" + r + " reaches gamma=1", c.cx + c.r, AXIS_RANGE, 1e-9);
    // crosses the real axis at (r-1)/(r+1)
    near("r=" + r + " crosses at (r-1)/(r+1)", c.cx - c.r,
         AXIS_RANGE * (r - 1) / (r + 1), 1e-9);
});

QSChart.grid.xMajor.concat(QSChart.grid.xMinor).forEach(function (x) {
    [x, -x].forEach(function (v) {
        var c = QSChart.xCircleGeometry(v);
        // passes through gamma = +1
        near("x=" + v + " passes gamma=1",
             Math.sqrt(Math.pow(c.cx - AXIS_RANGE, 2) + Math.pow(c.cy, 2)), c.r, 1e-9);
        // meets the rim where z = jv maps to, i.e. (jv-1)/(jv+1)
        var g = QSEngine.zToGamma({ re: 0, im: v * 50 }, 50);
        var want = Math.atan2(g.im, g.re) * 180 / Math.PI;
        near("x=" + v + " rim angle", QSChart.xRimAngle(v), want, 1e-9);
    });
});

/* ------------------------------------------------------- 2. mount/render */

var host = new Node("div");
var target = new Node("div");
target.setAttribute("id", "smithMain");
host.appendChild(target);
registry.smithMain = target;

var smithObj = {
    view: null,
    title: "Test Plane",
    showAdmittace: true,
    vswrCircle: 2.0,
    qCircle: 10.0,
    dataM: 0.0, dataQ: 0.0,
    markerM: 0.4, markerQ: 30, showMarker: true,
    Z0: 50,
    circleM: [0.2], circleQ: [20], circleR: [0.3], circleShow: [true],
    circleColor: ["#ff0000"],
    sweep: true,
    sweepDatasets: [{ color: "#0000FF", dataM: [0.1, 0.2, 0.3], dataQ: [10, 20, 30] }],
    data: true,
    plotDatasets: [{ color: "#000000", dataM: [0.4, 0.5], dataQ: [40, 50] }],
    drawSmith: function () { drawSmith(this); }
};

smithObj.view = QSChart.mount("smithMain");
ok("mount replaced the target", host.childNodes[0].className === "qs-wrap");

/* A real network, so the per-element arcs have something to draw. */
schObj.ELEMENT[0].value1 = 175;
schObj.ELEMENT[1].type = "rx"; schObj.ELEMENT[1].value1 = 1.94; schObj.ELEMENT[1].value2 = 1.1;
[[2, "l", 16.8], [3, "c", 38.12], [4, "c", 10.52]].forEach(function (e) {
    schObj.ELEMENT[e[0]].type = e[1];
    schObj.ELEMENT[e[0]].value1 = e[2];
    schObj.ELEMENT[e[0]].value2 = 0;
});
Zcalsweep1();
smithObj.dataM = resultsObj.OUTPUT[2].GAMMag;
smithObj.dataQ = resultsObj.OUTPUT[2].GAMAng;

smithObj.drawSmith();

function walk(node, fn) {
    fn(node);
    for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i], fn);
}
function countClass(root, cls) {
    var n = 0;
    walk(root, function (node) {
        var c = node.getAttribute && node.getAttribute("class");
        if (c && (" " + c + " ").indexOf(" " + cls + " ") >= 0) n++;
    });
    return n;
}

var svg = smithObj.view.el;
var grid = QSChart.grid;

ok("chart face drawn", countClass(svg, "qs-face") === 1);
ok("major resistance circles", countClass(svg, "qs-r-major") === grid.rMajor.length,
   "got " + countClass(svg, "qs-r-major"));
ok("minor resistance circles", countClass(svg, "qs-r-minor") === grid.rMinor.length);
ok("major reactance arcs", countClass(svg, "qs-x-major") === grid.xMajor.length * 2);
ok("minor reactance arcs", countClass(svg, "qs-x-minor") === grid.xMinor.length * 2);
ok("admittance grid shown when asked", countClass(svg, "qs-adm") > 0);
ok("VSWR circle", countClass(svg, "qs-vswr") === 1);
ok("Q circles", countClass(svg, "qs-q") === 2);
ok("gain circle", countClass(svg, "qs-gain") === 1);
ok("marker", countClass(svg, "qs-marker") === 2);
ok("sweep trace", countClass(svg, "qs-trace") === 1);
ok("imported data plot", countClass(svg, "qs-plot") === 1);
ok("Zin dot", countClass(svg, "qs-dot") === 1);
ok("one arc per component", countClass(svg, "qs-arc") === 3,
   "got " + countClass(svg, "qs-arc"));
ok("one junction dot per node", countClass(svg, "qs-node") === 4,
   "got " + countClass(svg, "qs-node"));

/* Rendering is idempotent: doing it twice must not accumulate anything. */
var before = countClass(svg, "qs-r-major");
smithObj.drawSmith();
smithObj.drawSmith();
ok("render is idempotent", countClass(svg, "qs-r-major") === before,
   "grid grew to " + countClass(svg, "qs-r-major"));

/* Overlays disappear when switched off. */
smithObj.showAdmittace = false;
smithObj.showMarker = false;
smithObj.sweep = false;
smithObj.data = false;
smithObj.qCircle = 0;
smithObj.vswrCircle = 1.0;
smithObj.drawSmith();
ok("admittance grid hidden", countClass(svg, "qs-adm") === 0);
ok("marker hidden", countClass(svg, "qs-marker") === 0);
ok("sweep hidden", countClass(svg, "qs-trace") === 0);
ok("plot hidden", countClass(svg, "qs-plot") === 0);
ok("Q circles hidden", countClass(svg, "qs-q") === 0);
ok("VSWR circle hidden at 1:1", countClass(svg, "qs-vswr") === 0);
ok("grid still there", countClass(svg, "qs-r-major") === grid.rMajor.length);

/* An empty ladder draws no element arcs. */
for (var i = 2; i < 13; i++) { schObj.ELEMENT[i].type = "w"; schObj.ELEMENT[i].value1 = 0; }
Zcalsweep1();
smithObj.drawSmith();
ok("no arcs for an empty ladder", countClass(svg, "qs-arc") === 0);

/* The admittance toggle flips state and redraws. */
drawAdmitanceCircles(smithObj);
ok("admittance toggle turns on", smithObj.showAdmittace === true &&
   countClass(svg, "qs-adm") > 0);
drawAdmitanceCircles(smithObj);
ok("admittance toggle turns off", smithObj.showAdmittace === false &&
   countClass(svg, "qs-adm") === 0);

/* Region classification, used by the matching hint. */
ok("region 1 is the low-impedance lobe", getRegion(-400, 0) === 1);
ok("region 2 is the high-impedance lobe", getRegion(400, 0) === 2);
ok("region 3 is upper", getRegion(0, 900) === 3);
ok("region 4 is lower", getRegion(0, -900) === 4);
ok("inside the chart", InSmith(0, 0) === true);
ok("outside the chart", InSmith(900, 900) === false);

if (failures === 0) {
    out("chart renderer: geometry and a full render OK (" +
        (grid.rMajor.length + grid.rMinor.length +
         2 * (grid.xMajor.length + grid.xMinor.length)) + " grid curves checked)");
} else {
    out("chart renderer: " + failures + " FAILED");
    if (typeof process !== "undefined") process.exitCode = 1;
}
