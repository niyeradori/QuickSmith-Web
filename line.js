/*
 * Microstrip and coax: dimensions instead of ohms.
 * =============================================================================
 *
 * QuickSmith asks for a line as a characteristic impedance and a length. That
 * is the right way round for design, and the wrong way round for building the
 * thing: what you actually need is a track width and a length in millimetres.
 * This turns one into the other.
 *
 * There is one model per medium, written as analysis - dimensions in, ohms
 * out - and synthesis is that same model inverted numerically. Two closed-form
 * approximations pointing in opposite directions never quite agree with each
 * other, so a width fed back through the analysis would not return the
 * impedance you asked for. Bisecting the analysis is a dozen lines and gives
 * an exact round trip, which is what makes the two directions safe to put in
 * front of the user side by side.
 *
 * Microstrip is Hammerstad's quasi-static form: good to about 1% for the
 * 0.05 to 20 range of W/h anyone builds in, with no thickness or dispersion
 * correction. At the frequencies where those matter you want a field solver,
 * not a Smith chart.
 *
 * No DOM, no dependencies. Everything here is in metres and hertz.
 */

var QSLine = (function () {
    "use strict";

    var ETA0 = 376.730313668;      // impedance of free space, ohms

    /* The solver has used 299 800 000 since 1993. Twenty-five parts per
     * million is nothing on a real board, but a length synthesised against
     * the true c would read as 89.9958 degrees back in QuickSmith, and a
     * quarter wave that is not a quarter wave is a bad thing to hand
     * somebody. Same constant, same answer. */
    var C = 299800000;             // metres per second

    /* The length units the schematic offers, in metres. */
    var UNIT_METRES = { Inches: 0.0254, MilliMeters: 0.001, Meters: 1 };

    /* ---------------------------------------------------------- microstrip */

    /*
     * Effective permittivity: a microstrip's field is partly in the substrate
     * and partly in the air above it, so the wave sees something between 1 and
     * er. A narrow track leans further into the air, hence the correction term
     * below W/h = 1.
     */
    function microstripEeff(u, er) {
        var f = Math.pow(1 + 12 / u, -0.5);
        if (u < 1) f += 0.04 * (1 - u) * (1 - u);
        return (er + 1) / 2 + (er - 1) / 2 * f;
    }

    /* Characteristic impedance of a track u = W/h wide on a substrate er. */
    function microstripZ0(u, er) {
        var e = microstripEeff(u, er);
        if (u <= 1) return ETA0 / (2 * Math.PI * Math.sqrt(e)) * Math.log(8 / u + u / 4);
        return ETA0 / (Math.sqrt(e) * (u + 1.393 + 0.667 * Math.log(u + 1.444)));
    }

    /*
     * The width that gives a wanted impedance, as a ratio of substrate height.
     * Z0 falls as the track widens, without a kink or a turning point, so a
     * bisection cannot get lost. The bracket spans everything buildable and
     * then some.
     */
    function microstripWidth(Z0, er) {
        var lo = 1e-3, hi = 1e3, mid;
        for (var i = 0; i < 200; i++) {
            mid = (lo + hi) / 2;
            if (microstripZ0(mid, er) > Z0) lo = mid; else hi = mid;
        }
        mid = (lo + hi) / 2;
        return { wOverH: mid, eeff: microstripEeff(mid, er) };
    }

    /* ---------------------------------------------------------------- coax */

    /*
     * Coax is fully filled, so the wave sees er itself and the impedance comes
     * out in closed form both ways. n is the ratio of inner-conductor diameter
     * to outer-conductor bore; a 50 ohm air line is the familiar 2.30.
     */
    function coaxZ0(n, er) {
        return ETA0 / (2 * Math.PI * Math.sqrt(er)) * Math.log(n);
    }

    function coaxRatio(Z0, er) {
        return { ratio: Math.exp(Z0 * 2 * Math.PI * Math.sqrt(er) / ETA0), eeff: er };
    }

    /* -------------------------------------------------------------- length */

    /* Metres of line for a wanted electrical length, at one frequency. */
    function length(degrees, freqMHz, eeff) {
        return (degrees / 360) * C / (freqMHz * 1e6 * Math.sqrt(eeff));
    }

    /* And back, so a board that already exists can be read off. */
    function degrees(metres, freqMHz, eeff) {
        return metres * 360 * freqMHz * 1e6 * Math.sqrt(eeff) / C;
    }

    /* What the schematic's velocity factor has to be for this substrate. */
    function velocityFactor(eeff) { return 1 / Math.sqrt(eeff); }

    return {
        microstrip: { impedance: microstripZ0, eeff: microstripEeff, width: microstripWidth },
        coax: { impedance: coaxZ0, ratio: coaxRatio },
        length: length,
        degrees: degrees,
        velocityFactor: velocityFactor,
        UNIT_METRES: UNIT_METRES,
        ETA0: ETA0
    };
})();

if (typeof module !== "undefined" && module.exports) module.exports = QSLine;
