/*
 * QuickSmith response plot.
 * =============================================================================
 *
 * A dB-against-frequency line plot, drawn as SVG the same way the Smith chart
 * is. It replaces Chart.js plus its zoom plugin (158 KB) for what amounts to
 * two polylines and a pair of axes.
 *
 * Colours come from the palette custom properties smith.js puts on :root, so
 * the plot follows the theme without knowing anything about it.
 *
 *      QSPlot.render(document.getElementById("respPlot"), {
 *          x: [150, 151, ...],                 // MHz
 *          xLabel: "MHz",
 *          at: 175,                            // marks the working point
 *          series: [ { label: "S21", data: [...], color: "var(--qs-a1)" },
 *                    { label: "S11", data: [...], color: "var(--qs-a2)" } ]
 *      });
 *
 * A data point that is null, NaN or infinite breaks the line rather than
 * dragging it off the bottom of the plot.
 */
var QSPlot = (function () {
    "use strict";

    // user units are the plot's own grid; the SVG scales to whatever box it is
    // given, so these are just a convenient drawing size
    var W = 560, H = 270;
    var PAD = { left: 52, right: 12, top: 14, bottom: 34 };

    function render(host, spec) {
        if (!host) return;
        var xs = spec.x || [];
        var series = (spec.series || []).filter(function (s) { return s.data && s.data.length; });

        host.innerHTML = "";
        if (xs.length < 2 || !series.length) {
            host.appendChild(note("Run a sweep to see the response."));
            return;
        }

        var xMin = xs[0], xMax = xs[xs.length - 1];
        if (xMax === xMin) xMax = xMin + 1;
        var range = yRange(series);

        var s = [];
        s.push('<svg class="qs-plot-svg" viewBox="0 0 ' + W + ' ' + H + '" ' +
               'xmlns="http://www.w3.org/2000/svg" role="img">');
        s.push('<rect class="qp-face" x="' + PAD.left + '" y="' + PAD.top + '" width="' +
               (W - PAD.left - PAD.right) + '" height="' + (H - PAD.top - PAD.bottom) + '"/>');

        // horizontal grid, labelled in dB
        var ticks = tickValues(range.lo, range.hi, 5);
        ticks.forEach(function (v) {
            var y = yPix(v, range);
            s.push('<line class="qp-grid" x1="' + PAD.left + '" y1="' + y +
                   '" x2="' + (W - PAD.right) + '" y2="' + y + '"/>');
            s.push('<text class="qp-tick" x="' + (PAD.left - 6) + '" y="' + (y + 4) +
                   '" text-anchor="end">' + fmt(v) + '</text>');
        });

        // vertical grid, labelled in the sweep variable
        tickValues(xMin, xMax, 5).forEach(function (v) {
            var x = xPix(v, xMin, xMax);
            s.push('<line class="qp-grid" x1="' + x + '" y1="' + PAD.top +
                   '" x2="' + x + '" y2="' + (H - PAD.bottom) + '"/>');
            s.push('<text class="qp-tick" x="' + x + '" y="' + (H - PAD.bottom + 16) +
                   '" text-anchor="middle">' + fmt(v) + '</text>');
        });

        s.push('<text class="qp-axis" x="' + ((W + PAD.left) / 2) + '" y="' + (H - 4) +
               '" text-anchor="middle">' + esc(spec.xLabel || "") + '</text>');
        s.push('<text class="qp-axis" x="14" y="' + ((H - PAD.bottom + PAD.top) / 2) +
               '" text-anchor="middle" transform="rotate(-90 14 ' +
               ((H - PAD.bottom + PAD.top) / 2) + ')">dB</text>');

        // where the schematic is actually tuned, so the plot and the readout
        // are obviously talking about the same point
        if (spec.at !== undefined && spec.at >= xMin && spec.at <= xMax) {
            var ax = xPix(spec.at, xMin, xMax);
            s.push('<line class="qp-at" x1="' + ax + '" y1="' + PAD.top +
                   '" x2="' + ax + '" y2="' + (H - PAD.bottom) + '"/>');
        }

        series.forEach(function (t) {
            polylines(xs, t.data, xMin, xMax, range).forEach(function (pts) {
                s.push('<polyline class="qp-trace" style="stroke:' + t.color +
                       '" points="' + pts + '"/>');
            });
        });

        s.push('</svg>');
        host.insertAdjacentHTML("beforeend", s.join(""));
        host.appendChild(legend(series));
    }

    /* Split a trace wherever a point is missing, so a gap stays a gap. */
    function polylines(xs, data, xMin, xMax, range) {
        var out = [], run = [];
        for (var i = 0; i < xs.length; i++) {
            var v = data[i];
            if (v === null || v === undefined || !isFinite(v)) {
                if (run.length > 1) out.push(run.join(" "));
                run = [];
                continue;
            }
            run.push(round(xPix(xs[i], xMin, xMax)) + "," + round(yPix(v, range)));
        }
        if (run.length > 1) out.push(run.join(" "));
        return out;
    }

    /*
     * A dB axis reads best on round numbers, so the range is widened to the
     * next 10 dB either side. Everything below -80 dB is stopped there: the
     * detail down at -300 dB is numerical noise and flattens the rest.
     */
    function yRange(series) {
        var lo = Infinity, hi = -Infinity;
        series.forEach(function (t) {
            t.data.forEach(function (v) {
                if (v === null || v === undefined || !isFinite(v)) return;
                if (v < lo) lo = v;
                if (v > hi) hi = v;
            });
        });
        if (!isFinite(lo)) { lo = -40; hi = 0; }
        lo = Math.max(lo, -80);
        if (hi - lo < 1) { hi = lo + 1; }
        return { lo: Math.floor(lo / 10) * 10, hi: Math.ceil(hi / 10) * 10 };
    }

    function tickValues(lo, hi, want) {
        var step = niceStep((hi - lo) / want);
        var out = [], v = Math.ceil(lo / step) * step;
        for (; v <= hi + step / 1000 && out.length < 20; v += step) out.push(round(v));
        return out;
    }

    function niceStep(raw) {
        var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
        var n = raw / mag;
        return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
    }

    function xPix(v, lo, hi) {
        return PAD.left + (v - lo) / (hi - lo) * (W - PAD.left - PAD.right);
    }
    function yPix(v, range) {
        var t = (v - range.lo) / (range.hi - range.lo);
        return (H - PAD.bottom) - t * (H - PAD.top - PAD.bottom);
    }

    function legend(series) {
        var el = document.createElement("div");
        el.className = "qp-legend";
        series.forEach(function (t) {
            var item = document.createElement("span");
            item.innerHTML = '<i style="background:' + t.color + '"></i>' + esc(t.label);
            el.appendChild(item);
        });
        return el;
    }

    function note(text) {
        var el = document.createElement("p");
        el.className = "qp-empty";
        el.textContent = text;
        return el;
    }

    function round(v) { return Math.round(v * 100) / 100; }
    function fmt(v) {
        var r = Math.round(v * 1000) / 1000;
        return String(Math.abs(r) < 1e-9 ? 0 : r);
    }
    function esc(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    return { render: render };
})();

if (typeof module !== "undefined" && module.exports) module.exports = QSPlot;
