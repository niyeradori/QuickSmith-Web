/*
 * Design sheet composer.
 *
 * The sheet nests drawings that are already complete SVG documents, and the
 * one way that goes wrong is attributes. QSChart.toSVG sets width and height
 * itself, so prepending a second pair makes the file ill formed: a viewer
 * says "attribute width redefined" and draws nothing below the header. That
 * happened, so it is pinned here.
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

if (typeof process !== "undefined" && process.versions && process.versions.node) {
    var path = require("path"), vm = require("vm"), fs = require("fs");
    vm.runInThisContext(fs.readFileSync(path.resolve(__dirname, "..") + "/sheet.js", "utf8"),
                        { filename: "sheet.js" });
} else {
    load("sheet.js");
}

/* A chart already carrying its own width and height, as toSVG hands it over. */
var CHART = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" ' +
            'width="900" height="900"><circle r="1"/></svg>';
var PLOT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 270">' +
           '<polyline points="0,0 1,1"/></svg>';

var sheet = QSSheet.build({
    title: "QuickSmith",
    meta: [["FREQUENCY", "146 MHz"], ["REFERENCE", "50.0 Ω"]],
    readout: [["VSWR", "1.7883"], ["Loaded Q", "0.58"]],
    parts: [{ label: "L2", type: "l", shunt: false, values: "50.00 nH", color: "var(--qs-a1)" },
            { label: "C3", type: "c", shunt: true, values: "10.00 pF", color: "var(--qs-a2)" }],
    load: { label: "RX1", type: "rx", values: "25.00 Ω / -30.00 Ω" },
    chartSVG: CHART,
    plotSVG: PLOT,
    sprite: '<svg id="qs-symbols"><symbol id="qs-sym-l-h"></symbol></svg>',
    extraCSS: ".qp-trace{stroke-width:1.8}",
    footer: "quicksmith.online"
});

/*
 * No <svg> may carry an attribute twice. The symbol sprite legitimately has
 * no size at all, so the rule is "never more than one", not "exactly one".
 */
var tags = sheet.match(/<svg\b[^>]*>/g) || [];
ok("the sheet, the sprite and both drawings are present", tags.length >= 4,
   tags.length + " svg tags");
tags.forEach(function (t, i) {
    ok("svg " + i + " does not redefine width",
       (t.match(/\swidth="/g) || []).length <= 1, t.slice(0, 120));
    ok("svg " + i + " does not redefine height",
       (t.match(/\sheight="/g) || []).length <= 1, t.slice(0, 120));
});

/* The two drawings, found by the viewBox each arrived with, are both sized. */
[["chart", "0 0 10 10"], ["plot", "0 0 560 270"]].forEach(function (pair) {
    var tag = tags.filter(function (t) { return t.indexOf(pair[1]) >= 0; })[0];
    ok("the " + pair[0] + " is still there", !!tag);
    if (tag) {
        ok("the " + pair[0] + " got a width", /\swidth="\d/.test(tag), tag.slice(0, 120));
        ok("the " + pair[0] + " got a height", /\sheight="\d/.test(tag), tag.slice(0, 120));
    }
});

/* The nested chart is resized rather than left at its own 900. */
ok("the chart is resized to fit the page", sheet.indexOf('width="900"') === -1,
   "the chart kept the size it arrived with");

/* Tags balance, which is the cheap half of "it will parse". */
var opens = (sheet.match(/<svg\b/g) || []).length;
var closes = (sheet.match(/<\/svg>/g) || []).length;
ok("svg tags balance", opens === closes, opens + " open, " + closes + " close");

/* The caller's content actually reaches the page. */
["QuickSmith", "146 MHz", "VSWR", "1.7883", "L2", "50.00 nH", "C3", "RX1",
 "quicksmith.online", "qs-sym-l-h", ".qp-trace"].forEach(function (s) {
    ok("the sheet carries " + JSON.stringify(s), sheet.indexOf(s) >= 0);
});

/* A shunt part drops to ground; a series part sits in the rail. */
ok("a shunt part is drawn vertically", sheet.indexOf("qs-sym-c-v") >= 0);
ok("a series part is drawn horizontally", sheet.indexOf("qs-sym-l-h") >= 0);

/* Text from the caller is escaped, never injected. */
var evil = QSSheet.build({ title: '</svg><script>x</script>', meta: [], readout: [],
                           parts: [], chartSVG: "", plotSVG: "" });
ok("caller text is escaped", evil.indexOf("<script>") === -1);

if (failures === 0) {
    out("design sheet: composes a page from finished drawings OK (" +
        tags.length + " nested drawings checked)");
} else {
    out("design sheet: " + failures + " FAILED");
    if (typeof process !== "undefined") process.exitCode = 1;
}
