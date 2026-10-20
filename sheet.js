/*
 * The design sheet.
 * =============================================================================
 *
 * One page holding everything the app shows: the chart, the numbers, the
 * network and the swept response. It exists because people were reaching for
 * a screenshot to put a design in a notebook or a report, and a screenshot of
 * an application is a poor record. This is laid out for paper instead, it is
 * vector all the way down, and it prints at any size.
 *
 * Nothing here is rasterised. Every panel is already SVG or already data:
 * QSChart.toSVG hands over the chart, the response plot is built as a
 * standalone <svg> by plot.js, the readout is nine labelled numbers, and the
 * network is drawn from the same symbol sprite the ladder uses. So this
 * composes, it does not photograph, and it has no opinion about fonts or
 * form controls.
 *
 * The caller assembles the spec, because units, formatting and which slot is
 * a shunt are the page's business and not this file's.
 *
 * No DOM, no dependencies.
 */

var QSSheet = (function () {
    "use strict";

    var W = 1000, H = 1440, M = 50;
    var CHART = 540;                       // the chart is square
    var CHART_Y = M + 104;                 // clear of the header rule
    var NET_Y = CHART_Y + CHART + 56;      // the network's own heading
    var NET_H = 240;                       // rail, drops to ground, two caption lines
    var PLOT_W = 700, PLOT_H = Math.round(PLOT_W * 270 / 560);

    function esc(s) {
        return String(s === undefined || s === null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    /*
     * Put a nested drawing at a size. The width and height have to be
     * replaced rather than prepended: QSChart.toSVG already sets both, and a
     * second pair makes the file ill formed, which an SVG viewer reports as
     * "attribute width redefined" and then refuses to draw.
     */
    function sized(markup, w, h) {
        return String(markup).replace(/^\s*<svg\b([^>]*)>/, function (m, attrs) {
            return '<svg' + attrs.replace(/\s(?:width|height)="[^"]*"/g, "") +
                   ' width="' + w + '" height="' + h + '">';
        });
    }

    function text(x, y, s, cls, anchor) {
        return '<text class="' + cls + '" x="' + x + '" y="' + y + '"' +
               (anchor ? ' text-anchor="' + anchor + '"' : "") + '>' + esc(s) + '</text>';
    }

    /* ------------------------------------------------------------- header */

    function header(spec) {
        var out = [text(M, M + 30, spec.title || "QuickSmith", "ds-title")];
        if (spec.subtitle) out.push(text(M, M + 56, spec.subtitle, "ds-sub"));

        var x = W - M, y = M - 6;
        (spec.meta || []).forEach(function (pair) {
            out.push(text(x, y, pair[0], "ds-meta-k", "end"));
            out.push(text(x, y + 19, pair[1], "ds-meta-v", "end"));
            y += 44;
        });
        out.push('<line class="ds-rule" x1="' + M + '" y1="' + (M + 74) +
                 '" x2="' + (W - M) + '" y2="' + (M + 74) + '"/>');
        return out.join("");
    }

    /* ------------------------------------------------------------ readout */

    function readout(spec, x, y) {
        var out = [text(x, y, "READOUT", "ds-h")], ry = y + 30;
        (spec.readout || []).forEach(function (pair) {
            out.push(text(x, ry, pair[0], "ds-k"));
            out.push(text(W - M, ry, pair[1], "ds-v", "end"));
            out.push('<line class="ds-hair" x1="' + x + '" y1="' + (ry + 9) +
                     '" x2="' + (W - M) + '" y2="' + (ry + 9) + '"/>');
            ry += 33;
        });
        return out.join("");
    }

    /* ---------------------------------------------------------- the network
     *
     * A rail from the load on the left to the input on the right, series
     * parts sitting in it and shunt parts hanging off it to ground, which is
     * the shape the ladder is already drawn in. Each part keeps the colour
     * its arc has on the chart, so the three views agree without a legend.
     */
    function network(spec, x, y, w) {
        var parts = spec.parts || [];
        var rail = y + 74, gnd = y + 168;
        var step = w / (parts.length + 2);
        var out = [text(x, y, "NETWORK", "ds-h")];

        out.push('<line class="ds-wire" x1="' + x + '" y1="' + rail +
                 '" x2="' + (x + w) + '" y2="' + rail + '"/>');

        function sym(id, cx, cy, sw, sh, colour) {
            return '<use href="#' + id + '" x="' + (cx - sw / 2) + '" y="' + (cy - sh / 2) +
                   '" width="' + sw + '" height="' + sh + '"' +
                   (colour ? ' style="color:' + colour + '"' : "") + '/>';
        }
        function ground(cx, cy) {
            return '<line class="ds-wire" x1="' + cx + '" y1="' + (cy - 14) +
                   '" x2="' + cx + '" y2="' + cy + '"/>' +
                   '<line class="ds-gnd" x1="' + (cx - 15) + '" y1="' + cy +
                   '" x2="' + (cx + 15) + '" y2="' + cy + '"/>' +
                   '<line class="ds-gnd" x1="' + (cx - 9) + '" y1="' + (cy + 5) +
                   '" x2="' + (cx + 9) + '" y2="' + (cy + 5) + '"/>';
        }
        function caption(cx, label, values, colour, below) {
            var ty = below ? gnd + 32 : rail - 46;
            var s = '<text class="ds-part" x="' + cx + '" y="' + ty +
                    '" text-anchor="middle" style="fill:' + colour + '">' +
                    esc(label) + '</text>';
            if (values) {
                s += '<text class="ds-partv" x="' + cx + '" y="' + (ty + 20) +
                     '" text-anchor="middle">' + esc(values) + '</text>';
            }
            return s;
        }

        // the load, which is the thing being matched, hanging at the left end
        var lx = x + step * 0.5, load = spec.load;
        if (load) {
            out.push(sym("qs-sym-" + load.type + "-v", lx, rail + 44, 30, 88, "currentColor"));
            out.push(ground(lx, gnd));
            out.push(caption(lx, load.label, load.values, "var(--qs-text)", true));
        }

        parts.forEach(function (p, i) {
            var cx = x + step * (i + 1.5);
            if (p.shunt) {
                out.push(sym("qs-sym-" + p.type + "-v", cx, rail + 44, 30, 88, p.color));
                out.push(ground(cx, gnd));
            } else {
                out.push('<rect class="ds-gap" x="' + (cx - 46) + '" y="' + (rail - 16) +
                         '" width="92" height="32"/>');
                out.push(sym("qs-sym-" + p.type + "-h", cx, rail, 92, 30, p.color));
            }
            out.push(caption(cx, p.label, p.values, p.color, p.shunt));
        });

        // the input port
        var ix = x + w;
        out.push('<circle class="ds-port" cx="' + (ix - 2) + '" cy="' + rail + '" r="5"/>');
        out.push(text(ix, rail - 22, spec.inputLabel || "Zin", "ds-part", "end"));
        return out.join("");
    }

    /* --------------------------------------------------------------- build */

    /*
     * The chart's own <style> block travels with it and, because an SVG style
     * element is document wide rather than scoped to its subtree, it is what
     * resolves every --qs- colour on this page. That is deliberate: the sheet
     * then matches the theme the design was drawn in without a second copy of
     * the palette living here.
     */
    function build(spec) {
        var s = ['<svg xmlns="http://www.w3.org/2000/svg" ' +
                 'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
                 'viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H +
                 '" role="img">'];

        s.push("<style>" + CSS + (spec.extraCSS || "") + "</style>");
        s.push('<rect class="ds-page" x="0" y="0" width="' + W + '" height="' + H + '"/>');
        if (spec.sprite) s.push(spec.sprite);

        s.push(header(spec));

        if (spec.chartSVG) {
            s.push('<g transform="translate(' + M + ',' + CHART_Y + ')">' +
                   sized(spec.chartSVG, CHART, CHART) + '</g>');
        }
        s.push(readout(spec, M + CHART + 50, CHART_Y + 26));
        s.push(network(spec, M, NET_Y, W - 2 * M));

        if (spec.plotSVG) {
            var py = NET_Y + NET_H + 46;
            s.push(text(M, py - 16, "RESPONSE", "ds-h"));
            s.push('<g transform="translate(' + Math.round((W - PLOT_W) / 2) +
                   ',' + py + ')">' + sized(spec.plotSVG, PLOT_W, PLOT_H) + '</g>');
        }
        if (spec.footer) s.push(text(M, H - M + 6, spec.footer, "ds-foot"));

        s.push("</svg>");
        return s.join("");
    }

    var CSS = [
        ".ds-page{fill:var(--qs-face,#fff)}",
        ".ds-title{fill:var(--qs-ink,#14181f);font:600 30px ui-monospace,SFMono-Regular,Menlo,monospace}",
        ".ds-sub{fill:var(--qs-text,#6b7280);font:400 15px system-ui,sans-serif}",
        ".ds-meta-k{fill:var(--qs-text,#6b7280);font:500 11px system-ui,sans-serif;letter-spacing:.08em}",
        ".ds-meta-v{fill:var(--qs-ink,#14181f);font:600 16px ui-monospace,SFMono-Regular,Menlo,monospace}",
        ".ds-rule{stroke:var(--qs-rim,#d9dde5);stroke-width:1.5}",
        ".ds-hair{stroke:var(--qs-rim,#d9dde5);stroke-width:1;opacity:.5}",
        ".ds-h{fill:var(--qs-text,#6b7280);font:600 12px system-ui,sans-serif;letter-spacing:.1em}",
        ".ds-k{fill:var(--qs-text,#6b7280);font:400 15px system-ui,sans-serif}",
        ".ds-v{fill:var(--qs-ink,#14181f);font:500 15px ui-monospace,SFMono-Regular,Menlo,monospace}",
        ".ds-part{fill:var(--qs-ink,#14181f);font:600 14px ui-monospace,SFMono-Regular,Menlo,monospace}",
        ".ds-partv{fill:var(--qs-text,#6b7280);font:400 13px ui-monospace,SFMono-Regular,Menlo,monospace}",
        ".ds-wire{stroke:var(--qs-ink,#14181f);stroke-width:2}",
        ".ds-gnd{stroke:var(--qs-ink,#14181f);stroke-width:2;stroke-linecap:round}",
        ".ds-port{fill:var(--qs-face,#fff);stroke:var(--qs-ink,#14181f);stroke-width:2}",
        // the rail runs behind a series part; this hides it under the symbol
        ".ds-gap{fill:var(--qs-face,#fff)}",
        ".ds-foot{fill:var(--qs-text,#6b7280);font:400 12px system-ui,sans-serif}"
    ].join("");

    return { build: build, size: { w: W, h: H } };
})();

if (typeof module !== "undefined" && module.exports) module.exports = QSSheet;
