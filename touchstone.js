/*
 * Touchstone (.s1p / .s2p) reader and writer.
 * =============================================================================
 *
 * Touchstone is how every vector network analyser exports its measurements, so
 * this is the door between QuickSmith and real data. Until now the only way in
 * was the program's own .gam JSON, which nothing else produces.
 *
 * A file looks like this:
 *
 *      ! measured 2026-09-08, dipole on the roof
 *      # MHZ S MA R 50
 *      100.0  0.590  -86.271
 *      105.0  0.530  -61.987
 *
 * The option line gives the frequency unit, which parameter is tabulated, the
 * number format, and the reference impedance. Everything on it is optional and
 * defaults to "# GHZ S MA R 50".
 *
 * Two-port files list their columns as S11 S21 S12 S22 - S21 before S12, which
 * is the one detail in the format that catches everybody out.
 *
 * No DOM, no dependencies: this parses text and returns data.
 */

var QSTouchstone = (function () {
    "use strict";

    var FREQ_MULTIPLIER = { HZ: 1e-6, KHZ: 1e-3, MHZ: 1, GHZ: 1e3 };  // -> MHz

    /*
     * parse(text, ports)
     *
     * `ports` comes from the file extension when you have it (1 for .s1p, 2 for
     * .s2p); when omitted it is inferred from how many numbers each row holds.
     *
     * Returns
     *   { ports, parameter, format, R, points: [ { f, s: [{re,im}, ...] } ] }
     * with f in MHz and s in file order (S11, S21, S12, S22 for two ports).
     */
    function parse(text, ports) {
        if (typeof text !== "string" || !text.length) throw new Error("empty file");

        var opts = { parameter: "S", format: "MA", R: 50, freqScale: FREQ_MULTIPLIER.GHZ };
        var numbers = [];
        var lines = text.split(/\r\n|\r|\n/);
        var sawOption = false;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var bang = line.indexOf("!");
            if (bang >= 0) line = line.slice(0, bang);      // strip trailing comment
            line = line.trim();
            if (!line) continue;

            if (line.charAt(0) === "#") {
                if (!sawOption) { readOptionLine(line, opts); sawOption = true; }
                continue;
            }
            if (/^\[/.test(line)) continue;                 // v2 keyword, ignored

            var tokens = line.split(/[\s,]+/);
            for (var t = 0; t < tokens.length; t++) {
                var v = parseFloat(tokens[t]);
                if (isNaN(v)) throw new Error("not a number: \"" + tokens[t] + "\"");
                numbers.push(v);
            }
        }

        if (!numbers.length) throw new Error("no data rows");

        if (!ports) ports = inferPorts(numbers, lines);
        var stride = 1 + 2 * ports * ports;
        if (numbers.length % stride !== 0) {
            throw new Error("expected " + stride + " numbers per frequency for a " +
                            ports + "-port file, got " + numbers.length + " in total");
        }

        var points = [];
        for (var k = 0; k < numbers.length; k += stride) {
            var s = [];
            for (var p = 0; p < ports * ports; p++) {
                s.push(toComplex(numbers[k + 1 + 2 * p], numbers[k + 2 + 2 * p], opts.format));
            }
            points.push({ f: numbers[k] * opts.freqScale, s: s });
        }

        return {
            ports: ports,
            parameter: opts.parameter,
            format: opts.format,
            R: opts.R,
            points: points
        };
    }

    function readOptionLine(line, opts) {
        var parts = line.slice(1).trim().toUpperCase().split(/\s+/);
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (FREQ_MULTIPLIER.hasOwnProperty(p)) opts.freqScale = FREQ_MULTIPLIER[p];
            else if (p === "S" || p === "Y" || p === "Z" || p === "G" || p === "H") opts.parameter = p;
            else if (p === "MA" || p === "DB" || p === "RI") opts.format = p;
            else if (p === "R") {
                var r = parseFloat(parts[i + 1]);
                if (!isNaN(r) && r > 0) { opts.R = r; i++; }
            }
        }
    }

    /* One frequency plus 2*n^2 values per row: 3 numbers is 1 port, 9 is 2. */
    function inferPorts(numbers, lines) {
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var bang = line.indexOf("!");
            if (bang >= 0) line = line.slice(0, bang);
            line = line.trim();
            if (!line || line.charAt(0) === "#" || line.charAt(0) === "[") continue;
            var n = line.split(/[\s,]+/).length;
            if (n === 3) return 1;
            if (n === 9) return 2;
            break;
        }
        return (numbers.length % 3 === 0) ? 1 : 2;
    }

    function toComplex(a, b, format) {
        if (format === "RI") return { re: a, im: b };
        var mag = (format === "DB") ? Math.pow(10, a / 20) : a;
        var rad = b * Math.PI / 180;
        return { re: mag * Math.cos(rad), im: mag * Math.sin(rad) };
    }

    /* --------------------------------------------------------- into the app */

    /*
     * S11 as a frequency-dependent load, in the shape schObj.gamData wants.
     *
     * If the file was measured against a different reference impedance than the
     * one QuickSmith is set to, the coefficient is renormalised through the
     * impedance it represents, which is exact for a one-port.
     */
    function toGamData(parsed, Z0) {
        var dataX = [], dataM = [], dataQ = [];
        for (var i = 0; i < parsed.points.length; i++) {
            var pt = parsed.points[i];
            var g = pt.s[0];
            if (Z0 && Math.abs(Z0 - parsed.R) > 1e-9) g = renormalise(g, parsed.R, Z0);
            dataX.push(pt.f);
            dataM.push(Math.sqrt(g.re * g.re + g.im * g.im));
            dataQ.push(Math.atan2(g.im, g.re) * 180 / Math.PI);
        }
        return { label: "Touchstone S11", color: "#000000",
                 dataX: dataX, dataM: dataM, dataQ: dataQ };
    }

    /* gamma referenced to Ra, re-referenced to Rb, via the impedance it means. */
    function renormalise(g, Ra, Rb) {
        var dr = 1 - g.re, di = -g.im;
        var nr = 1 + g.re, ni = g.im;
        var den = dr * dr + di * di;
        var zr = Ra * (nr * dr + ni * di) / den;
        var zi = Ra * (ni * dr - nr * di) / den;
        var ar = zr - Rb, ai = zi;
        var br = zr + Rb, bi = zi;
        var d2 = br * br + bi * bi;
        return { re: (ar * br + ai * bi) / d2, im: (ai * br - ar * bi) / d2 };
    }

    /*
     * The four S-parameters at one frequency, in the magnitude/angle form the
     * amplifier page stores. Between samples it interpolates; outside the
     * measured range it holds the nearest end.
     */
    function sParamsAt(parsed, fMHz) {
        if (parsed.ports !== 2) throw new Error("need a 2-port file for S-parameters");
        var pts = parsed.points;
        if (!pts.length) throw new Error("no data");

        var names = ["S11", "S21", "S12", "S22"];
        var out = { Z0: parsed.R, frequency: fMHz };
        var lo = 0;
        while (lo < pts.length - 2 && pts[lo + 1].f < fMHz) lo++;
        var a = pts[lo], b = pts[Math.min(lo + 1, pts.length - 1)];
        var span = b.f - a.f;
        var t = (span === 0) ? 0 : Math.max(0, Math.min(1, (fMHz - a.f) / span));

        for (var i = 0; i < 4; i++) {
            // interpolate in rectangular form, then report polar
            var re = a.s[i].re + t * (b.s[i].re - a.s[i].re);
            var im = a.s[i].im + t * (b.s[i].im - a.s[i].im);
            out[names[i] + "M"] = Math.sqrt(re * re + im * im);
            out[names[i] + "A"] = Math.atan2(im, re) * 180 / Math.PI;
        }
        return out;
    }

    /* ------------------------------------------------------------- writing */

    /*
     * A one-port file from a sweep, so a QuickSmith result can go back out to
     * whatever tool the user works in next.
     *   points: [{ f (MHz), mag, angle (degrees) }]
     */
    function formatS1P(points, options) {
        options = options || {};
        var R = options.R || 50;
        var title = options.title || "QuickSmith";
        var lines = [
            "! " + title,
            "! written by QuickSmith " + new Date().toISOString().slice(0, 10),
            "# MHZ S MA R " + R
        ];
        for (var i = 0; i < points.length; i++) {
            lines.push([
                Number(points[i].f).toFixed(6),
                Number(points[i].mag).toFixed(6),
                Number(points[i].angle).toFixed(4)
            ].join("  "));
        }
        return lines.join("\n") + "\n";
    }

    /* .s1p / .s2p / .s3p ... -> 1 / 2 / 3; null when it is not a Touchstone name */
    function portsFromFilename(name) {
        var m = /\.s(\d+)p$/i.exec(String(name || ""));
        return m ? parseInt(m[1], 10) : null;
    }

    return {
        parse: parse,
        toGamData: toGamData,
        sParamsAt: sParamsAt,
        formatS1P: formatS1P,
        portsFromFilename: portsFromFilename,
        renormalise: renormalise
    };
})();

if (typeof module !== "undefined" && module.exports) module.exports = QSTouchstone;
