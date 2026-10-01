/*
 * Matching a band rather than a point.
 * =============================================================================
 *
 * Auto-match solves for a perfect match at one frequency, in closed form.
 * There is no closed form for the best match across a band, so this searches
 * for one: it proposes component values, asks the solver what the worst VSWR
 * anywhere in the band would be, and walks downhill.
 *
 * Two things about that are worth stating plainly.
 *
 * The cost is the WORST case, not the average. A network that is perfect at
 * band centre and dreadful at both edges is worse than one that is mediocre
 * everywhere, and minimising the average would prefer the wrong one. This is
 * also why the answers look odd to anyone used to designing by hand: the
 * optimiser never centres the match, because the worst case always lives at
 * an edge.
 *
 * Every candidate is evaluated through QSEngine.solve(), the same path the
 * program uses to draw the chart. It would be faster to write the arithmetic
 * out again here, and then the number promised by the optimiser could quietly
 * drift from the number the program displays after applying it. One solver.
 *
 * No DOM and no dependencies beyond engine.js, so this runs equally in a Web
 * Worker and in the headless test suite.
 */

var QSMatch = (function () {
    "use strict";

    /* ------------------------------------------------------------- bounds
     *
     * The optimiser will happily return a 6 ohm stub, which is electrically
     * correct and not something you can fabricate. Bounds are part of the
     * problem statement, not a detail: ask for the best answer and you get the
     * best answer, buildable or not.
     */
    var KINDS = {
        /* Lumped parts are bounded by what they are worth in ohms, not by
         * nanohenries and picofarads, because the same component is a different
         * animal at each end of the spectrum. Fixed values of 1 to 200 nH and
         * 0.5 to 200 pF are sensible at VHF and nonsense at X band: at
         * 10.5 GHz a 200 pF capacitor is 0.08 ohms, which is a short, a 200 nH
         * inductor is 13 kilohms, which is an open, and the smallest inductor
         * on offer is already 66 ohms, so no small series inductance can be
         * built at all. Steve Huettner found this by matching an amplifier at
         * 9 to 12 GHz: four of six topologies came back useless and two of them
         * were worse than fitting nothing.
         *
         * Reactance between Z0/25 and 10*Z0 instead, which for 50 ohms is 2 to
         * 500. Outside that a part is a short or an open whatever the
         * frequency. See lumpedBounds().
         */
        L:  { ohms: true, unit: "nH",  label: "inductor" },
        C:  { ohms: true, unit: "pF",  label: "capacitor" },
        Z:  { lo: 20,  hi: 150, unit: "Ω", label: "line impedance" },
        /* Degrees at the centre of the band, not at the line design frequency.
         * See thScaleFor(). 10 to 170 is then 0.03 to 0.47 wavelengths there,
         * which is the range you would actually cut. */
        TH: { lo: 10,  hi: 170, unit: "°", label: "length" }
    };

    /*
     * The nH or pF that correspond to a useful reactance at band centre.
     * An inductor grows with frequency and a capacitor shrinks, hence the
     * swap: the smallest capacitor is the one with the largest reactance.
     */
    function lumpedBounds(kind, f0MHz, Z0) {
        var w = 2 * Math.PI * f0MHz * 1e6;
        var lo = (Number(Z0) || 50) / 25, hi = (Number(Z0) || 50) * 10;
        if (kind === "L") return [lo / w * 1e9, hi / w * 1e9];
        return [1 / (w * hi) * 1e12, 1 / (w * lo) * 1e12];
    }

    /* ---------------------------------------------------------- topologies
     *
     * Slot parity decides series or shunt: even slots are in series with the
     * signal, odd slots are across it. Stubs are shunt by nature and so belong
     * in odd slots; a transmission line is a series two-port and belongs in an
     * even one. Each part names the parameter kinds it consumes, in order.
     */
    var TOPOLOGIES = [
        { id: "l-lc", name: "L network, series L then shunt C",
          parts: [ { slot: 2, type: "l", p: ["L"] },
                   { slot: 3, type: "c", p: ["C"] } ] },

        { id: "l-cl", name: "L network, series C then shunt L",
          parts: [ { slot: 2, type: "c", p: ["C"] },
                   { slot: 3, type: "l", p: ["L"] } ] },

        { id: "l-stub", name: "Series L then a shorted stub",
          parts: [ { slot: 2, type: "l", p: ["L"] },
                   { slot: 3, type: "s", p: ["Z", "TH"] } ] },

        { id: "l-stub-l", name: "Series L, stub, then series L",
          parts: [ { slot: 2, type: "l", p: ["L"] },
                   { slot: 3, type: "s", p: ["Z", "TH"] },
                   { slot: 4, type: "l", p: ["L"] } ] },

        { id: "stub-line-stub", name: "Stub, line, stub",
          parts: [ { slot: 3, type: "s", p: ["Z", "TH"] },
                   { slot: 4, type: "t", p: ["Z", "TH"] },
                   { slot: 5, type: "s", p: ["Z", "TH"] } ] },

        { id: "l-stub-line-stub", name: "Series L, stub, line, stub",
          parts: [ { slot: 2, type: "l", p: ["L"] },
                   { slot: 3, type: "s", p: ["Z", "TH"] },
                   { slot: 4, type: "t", p: ["Z", "TH"] },
                   { slot: 5, type: "s", p: ["Z", "TH"] } ] }
    ];

    var EMPTY = { id: "none", name: "no network", parts: [] };

    function kindsOf(topology) {
        var out = [];
        topology.parts.forEach(function (part) {
            part.p.forEach(function (k) { out.push(k); });
        });
        return out;
    }

    function boundsFor(topology, overrides, f0MHz, Z0) {
        return kindsOf(topology).map(function (k) {
            var b = overrides && overrides[k];
            if (b) return [Number(b.lo), Number(b.hi)];
            if (KINDS[k].ohms) return lumpedBounds(k, f0MHz, Z0);
            return [Number(KINDS[k].lo), Number(KINDS[k].hi)];
        });
    }

    /* Turn a parameter vector into the elements the solver wants. */
    function elementsFor(topology, x, template, thScale) {
        var s = (thScale > 0) ? thScale : 1;
        var els = [], i;
        for (i = 0; i <= 12; i++) {
            els.push({ index: i, type: "w", value1: 0, value2: 0, q: 1e6, tune: 1 });
        }
        els[1] = template.elements[1];              // the load is not ours to change
        var at = 0;
        topology.parts.forEach(function (part) {
            function val(j) {
                return part.p[j] === "TH" ? x[at + j] * s : x[at + j];
            }
            var e = { index: part.slot, type: part.type,
                      value1: val(0), value2: 0, q: 1e6, tune: 1 };
            if (part.p.length > 1) { e.value2 = val(1); }
            at += part.p.length;
            els[part.slot] = e;
        });
        return els;
    }

    /*
     * Lengths are searched in degrees at the centre of the band, and stored in
     * whatever QuickSmith is set to, which for Degrees means degrees at the
     * line design frequency. This is the factor between the two.
     *
     * The reason is that TDF is a way of writing lengths down, not a design
     * decision, and it should not be able to change the answer. It could.
     * A length bound of 10 to 170 degrees means "shorter than a half wave"
     * when TDF sits at the band, and "up to several wavelengths" when it sits
     * well below, and the optimiser will take the longer lines every time: on
     * the 75 mm monopole over 850 to 1000 MHz, dropping TDF from 925 to 231
     * improved the in-band worst case from 1.705 to 1.486 by reaching for a
     * 1.77 wavelength stub. That network reads 35803 across 800 to 1050 MHz
     * and 5.98 if the lines are cut 2% long. It wins the number being measured
     * and loses everything else, which is what over-fitting looks like.
     *
     * Only the units that are referenced to TDF need this. A length already in
     * millimetres is a length.
     */
    function thScaleFor(network, freqs) {
        if (network.LU !== "Degrees") return 1;
        var f0 = (freqs[0] + freqs[freqs.length - 1]) / 2;
        var tdf = Number(network.TDF);
        return (f0 > 0 && tdf > 0) ? tdf / f0 : 1;
    }

    /* ------------------------------------------------------------ the cost */

    var FAIL = 1e6;

    function worstVSWR(template, els, freqs) {
        var net = {
            Z0: template.Z0, VF: template.VF, TDF: template.TDF, LU: template.LU,
            termination: template.termination, gamData: template.gamData,
            elements: els, frequency: 0
        };
        var worst = 0;
        for (var i = 0; i < freqs.length; i++) {
            net.frequency = freqs[i];
            var r;
            try { r = QSEngine.solve(net); } catch (e) { return FAIL; }
            var v = r && r.vswr;
            if (!isFinite(v) || v < 1) return FAIL;
            if (v > worst) worst = v;
            if (worst >= FAIL) return FAIL;
        }
        return worst;
    }

    /* ---------------------------------------------------------- the search
     *
     * Nelder-Mead, because the worst case over a band is a maximum and
     * therefore not smooth, so anything wanting derivatives is the wrong tool.
     *
     * The random restarts are seeded. Two runs on the same data give the same
     * answer, which matters more for a tool people are asked to trust than the
     * occasional better optimum a fresh seed might find.
     */
    function seeded(seed) {
        var s = (seed >>> 0) || 1;
        return function () {
            s ^= s << 13; s >>>= 0;
            s ^= s >> 17;
            s ^= s << 5;  s >>>= 0;
            return s / 4294967296;
        };
    }

    function nelderMead(cost, x0, step, iterations) {
        var n = x0.length, i, j;
        var pts = [x0.slice()], vals;
        for (i = 0; i < n; i++) {
            var p = x0.slice();
            p[i] += step[i];
            pts.push(p);
        }
        vals = pts.map(cost);

        for (var it = 0; it < iterations; it++) {
            var order = [];
            for (i = 0; i < pts.length; i++) order.push(i);
            order.sort(function (a, b) { return vals[a] - vals[b]; });
            pts = order.map(function (k) { return pts[k]; });
            vals = order.map(function (k) { return vals[k]; });
            if (Math.abs(vals[vals.length - 1] - vals[0]) < 1e-7) break;

            var cen = [];
            for (i = 0; i < n; i++) {
                var sum = 0;
                for (j = 0; j < pts.length - 1; j++) sum += pts[j][i];
                cen.push(sum / n);
            }
            var last = pts[pts.length - 1];
            var ref = cen.map(function (c, k) { return c + (c - last[k]); });
            var fr = cost(ref);

            if (fr < vals[0]) {
                var exp = cen.map(function (c, k) { return c + 2 * (c - last[k]); });
                var fe = cost(exp);
                if (fe < fr) { pts[pts.length - 1] = exp; vals[vals.length - 1] = fe; }
                else         { pts[pts.length - 1] = ref; vals[vals.length - 1] = fr; }
            } else if (fr < vals[vals.length - 2]) {
                pts[pts.length - 1] = ref; vals[vals.length - 1] = fr;
            } else {
                var con = cen.map(function (c, k) { return c + 0.5 * (last[k] - c); });
                var fc = cost(con);
                if (fc < vals[vals.length - 1]) {
                    pts[pts.length - 1] = con; vals[vals.length - 1] = fc;
                } else {
                    for (i = 1; i < pts.length; i++) {
                        pts[i] = pts[i].map(function (v, k) { return (v + pts[0][k]) / 2; });
                        vals[i] = cost(pts[i]);
                    }
                }
            }
        }
        var best = 0;
        for (i = 1; i < vals.length; i++) if (vals[i] < vals[best]) best = i;
        return { x: pts[best], value: vals[best] };
    }

    /* Frequencies to judge a candidate at. */
    function bandPoints(band) {
        if (Array.isArray(band)) return band.slice();
        var n = Math.max(5, Math.min(401, band.points || 61));
        var lo = Number(band.start), hi = Number(band.stop);
        var out = [];
        for (var i = 0; i < n; i++) out.push(lo + (hi - lo) * i / (n - 1));
        return out;
    }

    /*
     * The floor, for a given antenna Q and fractional bandwidth. Assumes an
     * unlimited number of matching elements, so nothing with three parts will
     * reach it; it is there to say how much is still on the table.
     */
    function bodeFano(Q, fbw) {
        if (!(Q > 0) || !(fbw > 0)) return null;
        var g = Math.exp(-Math.PI / (Q * fbw));
        return (1 + g) / (1 - g);
    }


    /* --------------------------------------------- the load, on the band
     *
     * Two reasons to pin the measurement to the band's own frequencies before
     * searching anything.
     *
     * Speed. QSEngine.interpolate rebuilds its spline from scratch on every
     * call, sort included, twice per solve, and a search is millions of
     * solves. An 801 point VNA sweep is the ordinary case, not a large one,
     * and it made the search take minutes. The band is only ever judged at a
     * fixed set of frequencies, so the measurement only needs reading once.
     *
     * Exactness. A monotone cubic passes through its own knots, so reading the
     * resampled set back at those same frequencies returns the identical
     * numbers. This buys speed and costs no accuracy.
     */
    function resampleLoad(network, freqs) {
        var g = network.gamData;
        if (network.termination !== "Multiple" || !g || !g.dataX ||
            g.dataX.length < 2) return null;
        var M = [], Q = [];
        for (var i = 0; i < freqs.length; i++) {
            M.push(QSEngine.interpolate(freqs[i], g.dataX, g.dataM));
            Q.push(QSEngine.interpolate(freqs[i], g.dataX, g.dataQ));
        }
        return { dataX: freqs.slice(), dataM: M, dataQ: Q };
    }

    /* The same network reading its load from a resampled copy. */
    function onBand(network, freqs) {
        var g = resampleLoad(network, freqs);
        if (!g) return network;
        return { Z0: network.Z0, VF: network.VF, TDF: network.TDF, LU: network.LU,
                 termination: network.termination, gamData: g,
                 elements: network.elements };
    }

    /*
     * overUnity(network, band) -> { from, to, points, total } or null
     *
     * Where the measurement reads |gamma| >= 1, meaning more power coming back
     * than went in. A VNA does this on a near total reflection, where its
     * calibration error is bigger than the little the load absorbs: a 75 mm
     * monopole at 300 MHz is electrically tiny and returns essentially
     * everything, so the trace sits on the unit circle and noise pushes it
     * over. Antennas are the common case, but nothing here assumes one.
     *
     * Read literally it says the load is lossless, and nothing passive can
     * match a lossless load. The solver clamps to 1, the resistance goes to
     * zero, the VSWR is infinite, and every candidate scores the same failure.
     * The search then has nothing to report. That is the right answer and a
     * terrible way to deliver it, so this names the frequencies responsible.
     *
     * Read from the measured points themselves rather than from the band's
     * coarse grid. The first version of this scanned the grid, found the bad
     * stretch ending at 600 MHz because that was simply the last 20 MHz grid
     * point it looked at, and advised starting the band above 600. The true
     * boundary was 612. Anyone following that advice landed on a band whose
     * very first frequency was still over unity, and one bad frequency in
     * sixty-one is enough to fail the lot.
     *
     * `clearFrom` is therefore a frequency known to work: the first measured
     * point above the whole bad stretch, not the edge of it.
     */
    function overUnity(network, band) {
        var g = network.gamData;
        if (network.termination !== "Multiple" || !g || !g.dataX ||
            g.dataX.length < 2) return null;
        var freqs = bandPoints(band);
        var lo = freqs[0], hi = freqs[freqs.length - 1];

        var from = null, to = null, n = 0, inBand = 0, i, f;
        for (i = 0; i < g.dataX.length; i++) {
            f = Number(g.dataX[i]);
            if (f < lo || f > hi) continue;
            inBand++;
            if (Number(g.dataM[i]) >= 1) {
                if (from === null) from = f;
                to = f;
                n++;
            }
        }
        if (!n) return null;

        // the first measured point above the bad stretch, wherever it ends
        var clearFrom = null;
        for (i = 0; i < g.dataX.length; i++) {
            f = Number(g.dataX[i]);
            if (f > to && Number(g.dataM[i]) < 1) { clearFrom = f; break; }
        }
        return { from: from, to: to, points: n, total: inBand, clearFrom: clearFrom };
    }

    /* ------------------------------------------------------------ antenna Q
     *
     * The floor above needs one number for the load, its Q. The textbook
     * Q = (f0 / 2R) * dX/df needs a resonance, and a real antenna often has
     * none inside the band you care about: the 75 mm monopole measured for
     * the article never crosses zero between 100 and 200 MHz, so the textbook
     * formula has nothing to work with. This is the Yaghjian-Best form, which
     * is defined at every frequency and reduces to the textbook one where X
     * does cross zero:
     *
     *     Q(f) = (f / 2R) * sqrt( (dR/df)^2 + (dX/df + |X|/f)^2 )
     *
     * Slopes come from a least squares line through a window of samples, not
     * from the two neighbouring points. Measured data is noisy, and the
     * difference of two noisy numbers is mostly noise.
     *
     * The load impedance is read by solving the network with an empty ladder,
     * so a typed R+jX, a reflection coefficient and an imported Touchstone
     * sweep all arrive down the same path the chart uses.
     */
    var QWINDOW = 2;                        // samples either side of the fit

    function slopeAt(xs, ys, i) {
        var lo = Math.max(0, i - QWINDOW), hi = Math.min(xs.length - 1, i + QWINDOW);
        var n = hi - lo + 1, mx = 0, my = 0, j;
        for (j = lo; j <= hi; j++) { mx += xs[j]; my += ys[j]; }
        mx /= n; my /= n;
        var num = 0, den = 0;
        for (j = lo; j <= hi; j++) {
            num += (xs[j] - mx) * (ys[j] - my);
            den += (xs[j] - mx) * (xs[j] - mx);
        }
        return den ? num / den : 0;
    }

    /*
     * loadQ(network, band) -> Q at the centre of the band, or null
     *
     * Band centre, not the worst point in the band. Q at a given frequency is
     * steady to about a percent however densely the band is sampled, but the
     * minimum and maximum over the band are not: they are extremes of a noisy
     * curve, so they keep growing as you sample harder. One trustworthy number
     * beats a range that is half sampling artefact.
     *
     * Q does genuinely vary across a band, and quite a lot. The 75 mm monopole
     * runs Q 9.5 at 870 MHz and 6.9 at 960 MHz, because 870 is below its
     * resonance. Narrow the band if you want to see that.
     */
    function loadQ(network, band) {
        var freqs = bandPoints(band);
        var n = freqs.length;
        if (n < 2 * QWINDOW + 1) return null;

        var on = onBand(network, freqs);
        var net = {
            Z0: on.Z0, VF: on.VF, TDF: on.TDF, LU: on.LU,
            termination: on.termination, gamData: on.gamData,
            elements: elementsFor(EMPTY, [], network), frequency: 0
        };
        var R = [], X = [], i, r;
        for (i = 0; i < n; i++) {
            net.frequency = freqs[i];
            try { r = QSEngine.solve(net); } catch (e) { return null; }
            if (!r || !isFinite(r.Zin.re) || !isFinite(r.Zin.im)) return null;
            if (!(r.Zin.re > 0)) return null;   // no passive Q to speak of
            R.push(r.Zin.re); X.push(r.Zin.im);
        }

        var m = (n - 1) >> 1;
        var dR = slopeAt(freqs, R, m);
        var dX = slopeAt(freqs, X, m) + Math.abs(X[m]) / freqs[m];
        var Q = (freqs[m] / (2 * R[m])) * Math.sqrt(dR * dR + dX * dX);
        return isFinite(Q) && Q > 0 ? Q : null;
    }

    /*
     * feasibility(network, band) -> { Q, fbw, floor } or null
     *
     * What the band is asking for, before any topology is chosen. `floor` is
     * the best worst-case VSWR any lossless network could reach, with no limit
     * on how many elements it may use, so it is a wall and not a target: a
     * three part network will not get near it. Its use is deciding whether to
     * bother. A floor of 1.05 says keep going, a floor of 2.5 says the band is
     * too wide for this antenna and no amount of cleverness will fix it.
     */
    function feasibility(network, band) {
        /*
         * Only for a load measured across frequency. A typed R+jX sits at the
         * same impedance at every frequency, which has no resonance in it and
         * so no Q worth the name: the formula returns |X|/2R and the floor
         * comes out at 1.0000, cheerfully promising a perfect octave match.
         * Better to say nothing than to say that.
         */
        if (network.termination !== "Multiple" || !network.gamData ||
            !network.gamData.dataX || network.gamData.dataX.length < 2) return null;

        var freqs = bandPoints(band);
        var lo = freqs[0], hi = freqs[freqs.length - 1];
        var centre = (lo + hi) / 2;
        if (!(centre > 0) || !(hi > lo)) return null;
        var Q = loadQ(network, band);
        if (!Q) return null;
        var fbw = (hi - lo) / centre;
        return { Q: Q, fbw: fbw, floor: bodeFano(Q, fbw) };
    }


    /* -------------------------------------------------- bands worth trying
     *
     * An imported sweep is almost always far wider than anything anyone
     * operates over. The 75 mm monopole was measured across 300 to 1500 MHz,
     * and no network of any complexity matches a Q 7 antenna over 5:1, so the
     * honest default band is also a useless one. These are the sub-bands worth
     * trying: one per fractional bandwidth, placed where the antenna is
     * already closest to matched.
     *
     * Placement is by bare worst-case VSWR, which is exact and costs nothing.
     * Two other rules were tried. A cheap trial search agrees with it on every
     * width that matters and costs six times more. The Bode-Fano floor
     * disagrees and is wrong: the floor is lowest where Q is lowest, which on
     * this antenna is around 1145 MHz, and that is also 6.9:1 away from 50
     * ohms. Matchable in the limit of unlimited elements, not with three.
     *
     * Bands holding a frequency the measurement reads at or above |gamma| = 1
     * are skipped, since nothing passive matches those at all.
     */
    var WIDTHS = [0.05, 0.10, 0.20, 0.30];

    function suggestBands(network, widths) {
        var g = network.gamData;
        if (network.termination !== "Multiple" || !g || !g.dataX ||
            g.dataX.length < 2) return [];
        var lo = Number(g.dataX[0]), hi = Number(g.dataX[g.dataX.length - 1]);
        var out = [];

        (widths || WIDTHS).forEach(function (fbw) {
            var cMin = lo / (1 - fbw / 2), cMax = hi / (1 + fbw / 2);
            if (!(cMax > cMin)) return;                  // wider than the data
            var best = null;
            for (var k = 0; k <= 40; k++) {
                var c = cMin + (cMax - cMin) * k / 40;
                var band = { start: Math.round(c * (1 - fbw / 2)),
                             stop:  Math.round(c * (1 + fbw / 2)), points: 21 };
                if (band.start < lo || band.stop > hi) continue;
                if (overUnity(network, band)) continue;
                var v = worstVSWR(onBand(network, bandPoints(band)),
                                  elementsFor(EMPTY, [], network), bandPoints(band));
                if (!(v > 0) || v >= FAIL) continue;
                if (!best || v < best.bare) {
                    best = { start: band.start, stop: band.stop, bare: v };
                }
            }
            if (!best) return;
            // Q and the floor only for the one we keep, on the band as shown
            var shown = { start: best.start, stop: best.stop, points: 61 };
            var Q = loadQ(network, shown);
            best.fbw = (best.stop - best.start) / ((best.start + best.stop) / 2);
            best.centre = Math.round((best.start + best.stop) / 2);
            best.Q = Q;
            best.floor = Q ? bodeFano(Q, best.fbw) : null;
            out.push(best);
        });
        return out;
    }

    /* ------------------------------------------------------------- the API */

    function one(template, topology, freqs, opts) {
        var f0 = (freqs[0] + freqs[freqs.length - 1]) / 2;
        var bounds = boundsFor(topology, opts.bounds, f0, template.Z0);
        var thScale = thScaleFor(template, freqs);
        var rand = seeded(opts.seed || 20260927);
        var restarts = opts.restarts || 25;
        var iterations = opts.iterations || 200;
        var step = bounds.map(function (b) { return (b[1] - b[0]) * 0.12; });

        function cost(x) {
            for (var i = 0; i < x.length; i++) {
                if (!(x[i] >= bounds[i][0] && x[i] <= bounds[i][1])) return FAIL;
            }
            return worstVSWR(template, elementsFor(topology, x, template, thScale), freqs);
        }

        var best = null;
        for (var r = 0; r < restarts; r++) {
            var x0 = bounds.map(function (b) { return b[0] + rand() * (b[1] - b[0]); });
            var got = nelderMead(cost, x0, step, iterations);
            if (!best || got.value < best.value) best = got;
        }
        return best;
    }

    /*
     * optimise({ network, band, bounds, topologies, restarts, seed, onProgress })
     *
     * `network` is a schObj-shaped object: the load in elements[1] and the
     * context the solver needs. Slots 2 upward are replaced by each candidate.
     *
     * Returns the topologies that produced a usable network, best worst-case
     * VSWR first, each with the elements applyMatch() expects.
     */
    function optimise(opts) {
        var freqs = bandPoints(opts.band);
        // read the measurement once, not once per solve
        var template = onBand(opts.network, freqs);
        var list = (opts.topologies && opts.topologies.length)
            ? TOPOLOGIES.filter(function (t) { return opts.topologies.indexOf(t.id) >= 0; })
            : TOPOLOGIES;

        // the same load with nothing in the ladder, to measure improvement against
        var bare = worstVSWR(template, elementsFor(EMPTY, [], template), freqs);
        var results = [];

        list.forEach(function (topology, i) {
            if (opts.onProgress) {
                opts.onProgress({ done: i, total: list.length, topology: topology.name });
            }
            var got = one(template, topology, freqs, opts);
            if (!got || got.value >= FAIL) return;
            /*
             * A network that leaves the load worse off than no network at all
             * is not a result. The search returns one whenever a topology
             * cannot help and its best effort is still a step backwards, and
             * listing it invites somebody to build it. Dropping these can empty
             * the list, which is the honest answer when nothing on offer helps.
             */
            if (got.value >= bare) return;
            var els = elementsFor(topology, got.x, template, thScaleFor(template, freqs));
            results.push({
                id: topology.id,
                name: topology.name,
                worst: got.value,
                improvement: bare > 0 ? (bare - got.value) / bare : 0,
                params: got.x.slice(),
                kinds: kindsOf(topology),
                elements: els.filter(function (e) { return e.type !== "w" && e.index > 1; })
                             .map(function (e) {
                                 return { slot: e.index, type: e.type,
                                          value1: e.value1, value2: e.value2 };
                             })
            });
        });

        if (opts.onProgress) {
            opts.onProgress({ done: list.length, total: list.length, topology: null });
        }
        results.sort(function (a, b) { return a.worst - b.worst; });
        return { bare: bare, band: [freqs[0], freqs[freqs.length - 1]], results: results };
    }

    return {
        optimise: optimise,
        bodeFano: bodeFano,
        loadQ: loadQ,
        overUnity: overUnity,
        suggestBands: suggestBands,
        feasibility: feasibility,
        worstVSWR: worstVSWR,
        elementsFor: elementsFor,
        bandPoints: bandPoints,
        TOPOLOGIES: TOPOLOGIES,
        KINDS: KINDS
    };
})();

if (typeof module !== "undefined" && module.exports) module.exports = QSMatch;
