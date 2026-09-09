/*
 * QuickSmith solver.
 * =============================================================================
 *
 * Pure functions over plain data. No DOM, no jQuery, no external library - the
 * whole thing runs on Math plus about forty lines of complex arithmetic. That
 * is the point: the numbers QuickSmith has produced since 1993 should not
 * depend on a UI framework, and should stay testable on their own.
 *
 * The network is a ladder, read from the load on the left towards the source
 * on the right:
 *
 *      slot 1      2      3      4      5    ...    12
 *              +--[Z]--+--[Z]--+--[Z]--+          --[Z]--+
 *     (load)   |       |       |       |                 |  Zin
 *              |      [Y]      |      [Y]                |
 *              +-------+-------+-------+----------------- +
 *
 * Even slots are in series, odd slots are in shunt. Slot 1 is the load itself.
 *
 * Everything is cascaded as ABCD (transmission) matrices, which is what lets a
 * transmission line, a stub and a lumped part be handled by the same three
 * lines of code. The previous implementation had a ladder recursion for the
 * input impedance and a separate node-voltage walk for insertion loss, which
 * meant transmission lines were modelled as lumped series impedances in the
 * second one - correct for Zin, wrong for the transfer function.
 *
 * Usage:
 *      var r = QSEngine.solve({
 *          Z0: 50, VF: 1, TDF: 100, LU: "Inches", frequency: 100,
 *          elements: [ , {type:"rx", value1:50, value2:0}, {type:"l", value1:16.8}, ... ]
 *      });
 *      r.Zin.re, r.vswr, r.insertionLoss, ...
 *
 * Slot 0 is unused; elements[1] is the load. Missing slots are open wire.
 */
var QSEngine = (function () {
    "use strict";

    var C = 299800000;          // speed of light, as used by QuickSmith since 1993
    var SLOTS = 12;             // ladder slots after the load
    var TINY = 1e-16;           // floor for values that would otherwise divide by zero

    /* ===================================================== complex arithmetic */

    function cx(re, im) { return { re: re, im: im }; }
    var ZERO = cx(0, 0), ONE = cx(1, 0);

    function cadd(a, b) { return cx(a.re + b.re, a.im + b.im); }
    function csub(a, b) { return cx(a.re - b.re, a.im - b.im); }
    function cmul(a, b) { return cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
    function cdiv(a, b) {
        // A true zero denominator means a short or an open; substitute a tiny
        // real part so the result blows up rather than collapsing to zero.
        if (b.re === 0 && b.im === 0) b = cx(TINY, 0);
        var d = b.re * b.re + b.im * b.im;
        return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
    }
    function cinv(a) { return cdiv(ONE, a); }
    function cabs(a) { return Math.sqrt(a.re * a.re + a.im * a.im); }
    function cargDeg(a) { return Math.atan2(a.im, a.re) * 180 / Math.PI; }
    function polar(mag, angDeg) {
        var r = angDeg * Math.PI / 180;
        return cx(mag * Math.cos(r), mag * Math.sin(r));
    }

    /* ============================================================== ABCD pairs
     * A two-port as [[A, B], [C, D]], each entry complex. Port 1 faces the
     * source, port 2 faces the load.
     */

    var IDENTITY = [[ONE, ZERO], [ZERO, ONE]];

    function seriesABCD(Z) { return [[ONE, Z], [ZERO, ONE]]; }
    function shuntABCD(Y) { return [[ONE, ZERO], [Y, ONE]]; }

    function cascade(m, n) {
        return [
            [cadd(cmul(m[0][0], n[0][0]), cmul(m[0][1], n[1][0])),
             cadd(cmul(m[0][0], n[0][1]), cmul(m[0][1], n[1][1]))],
            [cadd(cmul(m[1][0], n[0][0]), cmul(m[1][1], n[1][0])),
             cadd(cmul(m[1][0], n[0][1]), cmul(m[1][1], n[1][1]))]
        ];
    }

    /* ===================================================== element impedances
     *
     * One model per element type, returning its series impedance. A shunt slot
     * uses the reciprocal, which is exactly what the two hand-written switch
     * statements in the old sch.js computed - they were algebraic inverses of
     * each other, spelled out twice.
     *
     *   q  is the component Q (1e6 means "ideal")
     *   v1 / v2 are the two entered values, units per element type
     */

    var MODELS = {
        // wire: no component at all
        w: function () { return ZERO; },

        // resistance, ohms
        r: function (e) { return cx(nz(e.v1), 0); },

        // reactance, ohms
        x: function (e) { return cx(0, nz(e.v1)); },

        // inductance, nH.  Z = (wL)/Q + j(wL)
        l: function (e, ctx) {
            var X = ctx.w * nz(e.v1) * 1e-9;
            return cx(X / e.q, X);
        },

        // capacitance, pF.  Z = 1/(wCQ) - j/(wC)
        c: function (e, ctx) {
            var X = -1 / (ctx.w * nz(e.v1) * 1e-12);
            return cx(-X / e.q, X);
        },

        // L and C in series, nH and pF
        slc: function (e, ctx) {
            var XL = ctx.w * nz(e.v1) * 1e-9;
            var XC = -1 / (ctx.w * nz(e.v2) * 1e-12);
            return cx(XL / e.q, XL + XC);
        },

        // L parallel C, nH and pF: a lossy inductor across an ideal capacitor
        plc: function (e, ctx) {
            var L = nz(e.v1) * 1e-9, Cap = nz(e.v2) * 1e-12;
            var X = -(L / Cap) / ((ctx.w * L) - 1 / (ctx.w * Cap));
            var R = ctx.w * L * e.q;
            return cdiv(cmul(cx(R, 0), cx(0, X)), cx(R, X));   // R || jX
        },

        // R and C in series, ohms and pF
        src: function (e, ctx) {
            return cx(e.v1, -1 / (ctx.w * nz(e.v2) * 1e-12));
        },

        // R parallel C, ohms and pF
        prc: function (e, ctx) {
            return cinv(cx(1 / nz(e.v1), ctx.w * nz(e.v2) * 1e-12));
        },

    };

    /* Stubs are shunt admittances by nature, so they are kept out of MODELS
     * (which is impedance-valued) rather than round-tripped through 1/Z. */
    var STUBS = {
        // open circuit: Yin = j*Y0*tan(bl)
        o: function (e, ctx) {
            return cx(0, Math.tan(electricalLength(e, ctx)) / Math.abs(nz(e.v1)));
        },
        // short circuit: Yin = -j*Y0*cot(bl)
        s: function (e, ctx) {
            return cx(0, -1 / (Math.abs(nz(e.v1)) * Math.tan(electricalLength(e, ctx))));
        }
    };

    function nz(v) { return (v === 0) ? TINY : v; }

    /* A transmission line is a two-port in its own right, not a lumped part.
     *   [ cos(bl)        j*Z0*sin(bl) ]
     *   [ j*sin(bl)/Z0   cos(bl)      ]
     */
    function tlineABCD(e, ctx) {
        var bl = electricalLength(e, ctx);
        var Z0 = Math.abs(nz(e.v1));
        var cosb = Math.cos(bl), sinb = Math.sin(bl);
        return [[cx(cosb, 0), cx(0, Z0 * sinb)],
                [cx(0, sinb / Z0), cx(cosb, 0)]];
    }

    /* Electrical length in radians. Inches, MilliMeters and Meters are physical
     * and scale with frequency through beta; Degrees and Wave Lengths are
     * referenced to the transmission design frequency (TDF). */
    function electricalLength(e, ctx) {
        var beta = ctx.w / (ctx.VF * C);
        var len = e.v2;
        switch (ctx.LU) {
            case "MilliMeters":  return beta * len / 1000;
            case "Meters":       return beta * len;
            case "Degrees":      return beta * len * ctx.VF * C / (ctx.TDF * 1e6 * 360);
            case "Wave Lengths": return beta * len * ctx.VF * C / (ctx.TDF * 1e6);
            case "Inches":       // fall through - inches is the default
            default:             return beta * len * 0.0254;
        }
    }

    /* The ABCD matrix of one populated slot. */
    function slotABCD(el, index, ctx) {
        if (!el || el.type === "w") return IDENTITY;
        if (el.type === "t") return tlineABCD(el, ctx);
        if (STUBS[el.type]) return shuntABCD(STUBS[el.type](el, ctx));
        var model = MODELS[el.type];
        if (!model) return IDENTITY;
        var Z = model(el, ctx);
        return isShuntSlot(index) ? shuntABCD(cinv(Z)) : seriesABCD(Z);
    }

    function isShuntSlot(index) { return index % 2 === 1; }

    /* ============================================================ the network */

    function normalise(net) {
        var ctx = {
            freq: Number(net.frequency),
            Z0: Number(net.Z0 === undefined ? 50 : net.Z0),
            VF: Number(net.VF === undefined ? 1 : net.VF),
            TDF: Number(net.TDF === undefined ? 100 : net.TDF),
            LU: net.LU || "Inches",
            termination: net.termination || "Single",
            gamData: net.gamData
        };
        ctx.w = 2 * Math.PI * ctx.freq * 1e6;
        return ctx;
    }

    /* Slot values arrive as strings from .sch files and from text inputs. */
    function slot(net, index) {
        var e = net.elements && net.elements[index];
        if (!e) return { type: "w", v1: 0, v2: 0, q: 1e6 };
        var q = Number(e.q);
        return {
            type: e.type,
            v1: Number(e.value1) || 0,
            v2: Number(e.value2) || 0,
            q: (isFinite(q) && q !== 0) ? q : 1e6
        };
    }

    /* The load, slot 1. Either R+jX, or a reflection coefficient - and either
     * of those may be looked up from measured data by frequency. */
    function loadImpedance(net, ctx) {
        var e = slot(net, 1);
        var mag, ang;

        if (ctx.termination === "Multiple" && ctx.gamData && ctx.gamData.dataX &&
            ctx.gamData.dataX.length > 1) {
            mag = interpolate(ctx.freq, ctx.gamData.dataX, ctx.gamData.dataM);
            ang = interpolate(ctx.freq, ctx.gamData.dataX, ctx.gamData.dataQ);
        } else if (e.type === "g") {
            mag = e.v1;
            ang = e.v2;
        } else {
            return cx(e.v1, e.v2);          // "rx" and anything unrecognised
        }

        if (!isFinite(mag)) mag = 0;
        if (!isFinite(ang)) ang = 0;
        if (mag > 1) mag = 1;
        if (mag < 0) mag = 0;
        return gammaToZ(polar(mag, ang), ctx.Z0);
    }

    function gammaToZ(g, Z0) {
        return cmul(cx(Z0, 0), cdiv(cadd(ONE, g), csub(ONE, g)));
    }

    function zToGamma(Z, Z0) {
        return cdiv(csub(Z, cx(Z0, 0)), cadd(Z, cx(Z0, 0)));
    }

    /* ================================================================= solve */

    /* Apply one two-port to the impedance behind it: Zin = (A*Z + B)/(C*Z + D). */
    function throughABCD(m, Z) {
        return cdiv(cadd(cmul(m[0][0], Z), m[0][1]),
                    cadd(cmul(m[1][0], Z), m[1][1]));
    }

    function solve(net) {
        var ctx = normalise(net);
        var ZL = loadImpedance(net, ctx);

        // Walk the ladder from the load outwards, accumulating both the total
        // two-port and the impedance seen after each slot. Multiplying each new
        // slot on the left builds M12 * M11 * ... * M2, so port 1 ends up facing
        // the source, which is what the transmission calculation needs.
        var m = IDENTITY;
        var Z = ZL;
        var nodes = [{ slot: 1, type: slot(net, 1).type, Z: { re: ZL.re, im: ZL.im },
                       gamma: gammaOf(zToGamma(ZL, ctx.Z0)), path: null }];

        for (var i = 2; i <= SLOTS; i++) {
            var el = slot(net, i);
            var mi = slotABCD(el, i, ctx);
            m = cascade(mi, m);
            var Zprev = Z;
            Z = throughABCD(mi, Z);
            if (el.type !== "w") {
                nodes.push({
                    slot: i,
                    type: el.type,
                    shunt: isShuntSlot(i),
                    Z: { re: Z.re, im: Z.im },
                    gamma: gammaOf(zToGamma(Z, ctx.Z0)),
                    path: elementPath(el, i, ctx, Zprev, Z)
                });
            }
        }
        var A = m[0][0], B = m[0][1], Cc = m[1][0], D = m[1][1];

        var Zin = Z;
        var Yin = cinv(Zin);
        var gamma = zToGamma(Zin, ctx.Z0);
        var gmag = cabs(gamma);
        var vswr = (gmag >= 1) ? Infinity : (1 + gmag) / (1 - gmag);
        var returnLoss = (gmag <= 0) ? Infinity : Math.abs(20 * Math.log10(gmag));

        var s21 = transmission(A, B, Cc, D, ZL, ctx.Z0);

        return {
            frequency: ctx.freq,
            Z0: ctx.Z0,
            load: { re: ZL.re, im: ZL.im },
            // the load as a reflection coefficient, for the UI's "g" display
            loadGamma: gammaOf(zToGamma(ZL, ctx.Z0)),
            // load first, then one entry per populated slot, each carrying the
            // locus its element traced to get there
            nodes: nodes,
            // The highest Q the network reaches on its way from the load to
            // Zin. This is the figure a matching network is designed against:
            // Example 6 specifies "a maximum input Q of 10" for its input
            // match, and that is exactly this number.
            loadedQ: loadedQ(nodes),
            Zin: withPolar(Zin),
            // The UI has always shown admittance in millisiemens.
            Yin: withPolar(cx(Yin.re * 1000, Yin.im * 1000)),
            gamma: gammaOf(gamma),
            vswr: vswr,
            returnLoss: returnLoss,
            insertionLoss: -s21.db,
            s21: s21,
            reflectionLoss: (gmag >= 1) ? Infinity : -10 * Math.log10(1 - gmag * gmag),
            powerReflectionCoeff: gmag * gmag,
            transmissionLossCoeff: (1 + vswr * vswr) / (2 * vswr),
            maxSWR: Math.sqrt(vswr),
            minSWR: 1 / Math.sqrt(vswr)
        };
    }

    /*
     * The highest Q the network reaches between the load and Zin. A matching
     * network is designed against this: Example 6 specifies a maximum input Q
     * of 10 for its input match, and this is that number.
     */
    function loadedQ(nodes) {
        var worst = 0;
        for (var i = 0; i < nodes.length; i++) {
            var Z = nodes[i].Z;
            if (Z.re > 0) worst = Math.max(worst, Math.abs(Z.im) / Z.re);
        }
        return worst;
    }

    function withPolar(z) {
        return { re: z.re, im: z.im, mag: cabs(z), ang: cargDeg(z) };
    }

    /*
     * The locus an element traces on the chart, as reflection coefficients from
     * the node before it to the node after it.
     *
     * A series reactance keeps R constant, so the path is the straight segment
     * from Z_before to Z_after in the impedance plane - which is exactly the
     * constant-resistance arc the chart is drawn to show. A shunt element is
     * the same statement in admittance, giving the constant-conductance arc.
     * A transmission line is neither, so it is walked by length instead: its
     * own rotation, from zero length to the real one.
     */
    var PATH_STEPS = 32;

    function elementPath(el, index, ctx, Zbefore, Zafter) {
        var pts = [], t, i;

        if (el.type === "t") {
            var full = el.v2;
            for (i = 0; i <= PATH_STEPS; i++) {
                t = i / PATH_STEPS;
                var part = { type: "t", v1: el.v1, v2: full * t, q: el.q };
                pts.push(zToGamma(throughABCD(tlineABCD(part, ctx), Zbefore), ctx.Z0));
            }
            return toGammaPoints(pts);
        }

        if (isShuntSlot(index)) {
            var Ybefore = cinv(Zbefore), Yafter = cinv(Zafter);
            var dY = csub(Yafter, Ybefore);
            for (i = 0; i <= PATH_STEPS; i++) {
                t = i / PATH_STEPS;
                pts.push(zToGamma(cinv(cadd(Ybefore, cx(dY.re * t, dY.im * t))), ctx.Z0));
            }
            return toGammaPoints(pts);
        }

        var dZ = csub(Zafter, Zbefore);
        for (i = 0; i <= PATH_STEPS; i++) {
            t = i / PATH_STEPS;
            pts.push(zToGamma(cadd(Zbefore, cx(dZ.re * t, dZ.im * t)), ctx.Z0));
        }
        return toGammaPoints(pts);
    }

    function toGammaPoints(list) {
        var out = [];
        for (var i = 0; i < list.length; i++) out.push({ re: list[i].re, im: list[i].im });
        return out;
    }

    /* A reflection coefficient of exactly zero has no meaningful angle. */
    function gammaOf(g) {
        var mag = cabs(g);
        return { re: g.re, im: g.im, mag: mag, ang: (mag === 0) ? 0 : cargDeg(g) };
    }

    /*
     * Transducer gain from a Z0 source into the actual load:
     *
     *      S21 = 2*sqrt(Rs*Gl) / (A + B*Gl_c + C*Zs + D*Zs*Gl_c)  ... in words,
     *
     * with V2 held at 1 volt: I2 = Yl, V1 = A + B*Yl, I1 = C + D*Yl, and the
     * source EMF is Vs = V1 + I1*Zs. Then |S21|^2 = 4*Rs*Re(Yl)/|Vs|^2.
     *
     * A load with no real part absorbs nothing, so the loss is infinite.
     */
    function transmission(A, B, Cc, D, ZL, Z0) {
        var YL = cinv(ZL);
        var V1 = cadd(A, cmul(B, YL));
        var I1 = cadd(Cc, cmul(D, YL));
        var Vs = cadd(V1, cmul(I1, cx(Z0, 0)));
        var GL = YL.re;
        if (!(GL > 0)) return { db: -Infinity, mag: 0, ang: 0 };
        var mag = 2 * Math.sqrt(Z0 * GL) / cabs(Vs);
        return {
            db: 20 * Math.log10(mag),
            mag: mag,
            ang: -cargDeg(Vs)
        };
    }

    /* ============================================== one-element equivalents
     * Zin = R + jX. In parallel form Rp = R(1+Q^2) and Xp = Rp/Q, Q = X/R.
     * Returns value in nH for an inductor, pF for a capacitor.
     */
    function equivalent(R, X, freq, parallel) {
        R = Number(R); X = Number(X); freq = Number(freq);
        if (parallel) {
            if (R === 0) R = TINY;
            var Q = X / R;
            var Rp = (Q * Q + 1) * R;
            X = (Q === 0) ? 0 : Rp / Q;
            R = Rp;
        }
        var type = "", value = 0;
        if (X < 0)      { type = "C"; value = Math.abs(1e6 / (2 * Math.PI * freq * X)); }
        else if (X > 0) { type = "L"; value = 1000 * X / (2 * Math.PI * freq); }
        return { R: R, X: X, type: type, value: value };
    }

    /* ========================================================== interpolation
     * Monotone cubic (Fritsch-Carlson), used to read a measured, frequency
     * dependent load between its sample points without overshoot.
     */
    function buildInterpolant(xs, ys) {
        var i, n = xs.length;
        if (n !== ys.length) throw new Error("interpolate: xs and ys differ in length");
        if (n === 0) return function () { return 0; };
        if (n === 1) { var only = +ys[0]; return function () { return only; }; }

        var order = [];
        for (i = 0; i < n; i++) order.push(i);
        order.sort(function (a, b) { return xs[a] - xs[b]; });

        var X = [], Y = [];
        for (i = 0; i < n; i++) { X.push(+xs[order[i]]); Y.push(+ys[order[i]]); }

        var dx = [], dy = [], slope = [];
        for (i = 0; i < n - 1; i++) {
            dx.push(X[i + 1] - X[i]);
            dy.push(Y[i + 1] - Y[i]);
            slope.push(dy[i] / dx[i]);
        }

        var c1 = [slope[0]];
        for (i = 0; i < dx.length - 1; i++) {
            var m = slope[i], mNext = slope[i + 1];
            if (m * mNext <= 0) {
                c1.push(0);
            } else {
                var common = dx[i] + dx[i + 1];
                c1.push(3 * common / ((common + dx[i + 1]) / m + (common + dx[i]) / mNext));
            }
        }
        c1.push(slope[slope.length - 1]);

        var c2 = [], c3 = [];
        for (i = 0; i < c1.length - 1; i++) {
            var invDx = 1 / dx[i], common2 = c1[i] + c1[i + 1] - slope[i] - slope[i];
            c2.push((slope[i] - c1[i] - common2) * invDx);
            c3.push(common2 * invDx * invDx);
        }

        return function (x) {
            var last = X.length - 1;
            if (x === X[last]) return Y[last];

            var low = 0, high = c3.length - 1, mid;
            while (low <= high) {
                mid = Math.floor((low + high) / 2);
                if (X[mid] < x) low = mid + 1;
                else if (X[mid] > x) high = mid - 1;
                else return Y[mid];
            }
            var k = Math.max(0, high);
            var diff = x - X[k], sq = diff * diff;
            return Y[k] + c1[k] * diff + c2[k] * sq + c3[k] * diff * sq;
        };
    }

    function interpolate(x, xs, ys) { return buildInterpolant(xs, ys)(x); }

    /* Remove the 360-degree jumps from a measured phase column, so that the
     * interpolator sees a continuous curve. */
    function unwrapPhase(phases) {
        var out = [], offset = 0, previous = 0;
        for (var i = 0; i < phases.length; i++) {
            var phase = Number(phases[i]);
            if (Math.abs(phase - previous) > 180) {
                offset -= 360 * Math.sign(phase - previous);
            }
            previous = phase;
            out[i] = phase + offset;
        }
        return out;
    }

    /* ==================================================== L-network matching
     *
     * Every two-element match from a load to a real Z0 is one of two shapes,
     * and each has two solutions, so there are at most four:
     *
     *   series first    load --[X]--+--      needs R_L <= Z0
     *                               |
     *                              [B]
     *
     *   shunt first     load --+--[X]--      needs R_p >= Z0,
     *                          |                  R_p = |Z_L|^2 / R_L
     *                         [B]
     *
     * Series first: adding X puts the node on the Z0 conductance circle, and
     * the shunt then cancels what is left.
     *
     *     R_L / (R_L^2 + (X_L + X)^2) = 1/Z0   ->   X = -X_L +/- sqrt(R_L(Z0 - R_L))
     *
     * Shunt first is the same statement in admittance. Both are exact; there
     * is nothing to iterate.
     *
     * Returns solutions ordered by loaded Q, lowest first - the widest
     * bandwidth match is usually the one you want.
     */
    function matchToZ0(ZL, Z0, freq) {
        var out = [];
        var RL = ZL.re, XL = ZL.im;
        if (!(RL > 0) || !(Z0 > 0) || !(freq > 0)) return out;

        var magsq = RL * RL + XL * XL;
        var GL = RL / magsq, BL = -XL / magsq;

        // ---- series element first, then shunt
        var disc = RL * (Z0 - RL);
        if (disc >= 0) {
            [1, -1].forEach(function (sign) {
                var X = -XL + sign * Math.sqrt(disc);
                var Z1 = cx(RL, XL + X);
                var Y1 = cinv(Z1);
                var B = -Y1.im;
                out.push({
                    topology: "series-shunt",
                    q: RL === 0 ? Infinity : Math.abs(XL + X) / RL,
                    elements: [
                        assign({ slot: 2 }, seriesElement(X, freq)),
                        assign({ slot: 3 }, shuntElement(B, freq))
                    ]
                });
            });
        }

        // ---- shunt element first, then series
        var disc2 = GL * (1 / Z0 - GL);
        if (disc2 >= 0) {
            [1, -1].forEach(function (sign) {
                var B = -BL + sign * Math.sqrt(disc2);
                var Y1 = cx(GL, BL + B);
                var Z1 = cinv(Y1);
                var X = -Z1.im;
                out.push({
                    topology: "shunt-series",
                    q: GL === 0 ? Infinity : Math.abs(BL + B) / GL,
                    elements: [
                        { slot: 2, type: "w", value1: 0 },
                        assign({ slot: 3 }, shuntElement(B, freq)),
                        assign({ slot: 4 }, seriesElement(X, freq))
                    ]
                });
            });
        }

        // Drop degenerate answers: a zero-valued part is not a part.
        out = out.filter(function (s) {
            return s.elements.every(function (e) {
                return e.type === "w" || (isFinite(e.value1) && Math.abs(e.value1) > 1e-9);
            });
        });

        out.sort(function (a, b) { return a.q - b.q; });
        return out;
    }

    function assign(target, source) {
        for (var k in source) if (source.hasOwnProperty(k)) target[k] = source[k];
        return target;
    }

    /* A series reactance as the part that realises it at this frequency. */
    function seriesElement(X, freq) {
        var w = 2 * Math.PI * freq * 1e6;
        return (X >= 0)
            ? { type: "l", value1: X * 1e9 / w }         // nH
            : { type: "c", value1: -1e12 / (w * X) };    // pF
    }

    /* A shunt susceptance as the part that realises it. */
    function shuntElement(B, freq) {
        var w = 2 * Math.PI * freq * 1e6;
        return (B >= 0)
            ? { type: "c", value1: B * 1e12 / w }        // pF
            : { type: "l", value1: -1e9 / (w * B) };     // nH
    }

    /* ==================================================== usable bandwidth
     *
     * The span around the working frequency over which VSWR stays inside a
     * limit, which for a matching network is the question right after "does it
     * match". Walks outwards in coarse steps until the limit is crossed, then
     * bisects each edge.
     *
     * Returns { low, high, span } in MHz, or null when the current frequency is
     * already outside the limit. A measured load only spans the frequencies it
     * was measured over, so the search is held inside them.
     */
    function bandwidth(net, limit, options) {
        options = options || {};
        var centre = Number(net.frequency);
        if (!(centre > 0) || !(limit > 1)) return null;

        var lowest = options.min, highest = options.max;
        if (net.termination === "Multiple" && net.gamData && net.gamData.dataX &&
            net.gamData.dataX.length > 1) {
            var xs = net.gamData.dataX;
            lowest = Math.max(lowest || 0, Number(xs[0]));
            highest = Math.min(highest || Infinity, Number(xs[xs.length - 1]));
        }
        if (!(lowest > 0)) lowest = centre / 8;
        if (!(highest > 0) || !isFinite(highest)) highest = centre * 8;

        function vswrAt(f) {
            var probe = {};
            for (var k in net) if (net.hasOwnProperty(k)) probe[k] = net[k];
            probe.frequency = f;
            return solve(probe).vswr;
        }
        if (!(vswrAt(centre) <= limit)) return null;

        var low = edge(vswrAt, centre, lowest, limit);
        var high = edge(vswrAt, centre, highest, limit);
        return { low: low, high: high, span: high - low };
    }

    /* Walk from `from` towards `towards` until the limit breaks, then bisect. */
    function edge(vswrAt, from, towards, limit) {
        var inside = from, outside = null;
        var steps = 40;
        for (var i = 1; i <= steps; i++) {
            var f = from + (towards - from) * (i / steps);
            if (!(vswrAt(f) <= limit)) { outside = f; break; }
            inside = f;
        }
        if (outside === null) return towards;          // still inside at the edge
        for (var j = 0; j < 30; j++) {
            var mid = (inside + outside) / 2;
            if (vswrAt(mid) <= limit) inside = mid; else outside = mid;
        }
        return inside;
    }

    return {
        solve: solve,
        equivalent: equivalent,
        matchToZ0: matchToZ0,
        bandwidth: bandwidth,
        gammaToZ: gammaToZ,
        zToGamma: zToGamma,
        interpolate: interpolate,
        buildInterpolant: buildInterpolant,
        unwrapPhase: unwrapPhase,
        electricalLength: electricalLength,
        SPEED_OF_LIGHT: C,
        SLOTS: SLOTS
    };
})();

if (typeof module !== "undefined" && module.exports) module.exports = QSEngine;
