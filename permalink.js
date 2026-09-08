/*
 * Shareable links.
 * =============================================================================
 *
 * Puts a whole design in the URL, so an answer on a forum can be a link to the
 * working circuit instead of a screenshot and a list of values.
 *
 * A decoded link is simply a schObj - the same shape a .sch file has - so the
 * page restores it through exactly the code path that opens a file. Nothing
 * new has to understand the format.
 *
 * What goes in the string is trimmed hard: empty ladder slots are dropped,
 * values are rounded to six significant figures, and settings that are still
 * at their defaults are left out. A four-component match comes to about 120
 * characters.
 *
 * No DOM, no dependencies.
 */

var QSLink = (function () {
    "use strict";

    var VERSION = 1;
    var SLOTS = 12;

    var DEFAULTS = { VF: 1, Z0: 50, TDF: 100, LU: "Inches", SS: 1, ST: 100, SST: 1,
                     SE: "Frequency", termination: "Single" };

    /* --------------------------------------------------------------- encode */

    /*
     * encode(schObj, smithObj) -> a URL-safe string, without a leading "#".
     * smithObj is optional; when given, the chart overlays travel too.
     */
    function encode(sch, chart) {
        var payload = { v: VERSION, f: round(sch.ELEMENT[0].value1) };

        Object.keys(DEFAULTS).forEach(function (k) {
            var value = sch[k];
            if (value === undefined || value === null) return;
            if (String(value) === String(DEFAULTS[k])) return;      // still default
            payload[k] = isNaN(Number(value)) ? value : round(value);
        });

        payload.e = [];
        for (var i = 1; i <= SLOTS; i++) {
            var el = sch.ELEMENT[i];
            if (!el || el.type === "w") continue;
            var entry = [i, el.type, round(el.value1), round(el.value2)];
            var q = Number(el.q);
            if (isFinite(q) && q !== 1000000 && i > 1) entry.push(round(q));
            payload.e.push(entry);
        }

        // A measured load travels with the design or the link is not the design.
        if (sch.termination === "Multiple" && sch.gamData && sch.gamData.dataX &&
            sch.gamData.dataX.length) {
            payload.g = [sch.gamData.dataX.map(round),
                         sch.gamData.dataM.map(round),
                         sch.gamData.dataQ.map(round)];
        }

        if (chart) {
            var c = {};
            if (Number(chart.vswrCircle)) c.s = round(chart.vswrCircle);
            if (Number(chart.qCircle)) c.q = round(chart.qCircle);
            if (chart.showMarker) c.m = [round(chart.markerM), round(chart.markerQ)];
            if (chart.showAdmittace) c.y = 1;
            if (chart.showElementArcs === false) c.a = 0;
            if (Object.keys(c).length) payload.c = c;
        }

        return toBase64Url(JSON.stringify(payload));
    }

    /* --------------------------------------------------------------- decode */

    /*
     * decode(str) -> { sch, chart } where sch is a complete schObj, ready for
     * copy_schObj(). Throws if the string is not a link this version knows.
     */
    function decode(str) {
        var payload = JSON.parse(fromBase64Url(String(str).replace(/^#/, "")));
        if (!payload || payload.v !== VERSION) {
            throw new Error("this link was made by a different version of QuickSmith");
        }

        var sch = blankSchematic();
        sch.ELEMENT[0].value1 = num(payload.f, 100);

        Object.keys(DEFAULTS).forEach(function (k) {
            if (payload[k] !== undefined) sch[k] = payload[k];
        });

        (payload.e || []).forEach(function (entry) {
            var slot = entry[0];
            if (!(slot >= 1 && slot <= SLOTS)) return;
            var el = sch.ELEMENT[slot];
            el.type = entry[1];
            el.value1 = num(entry[2], 0);
            el.value2 = num(entry[3], 0);
            if (entry.length > 4) el.q = num(entry[4], 1000000);
        });

        if (payload.g) {
            sch.gamData = { label: "Shared link", color: "#000000",
                            dataX: payload.g[0], dataM: payload.g[1], dataQ: payload.g[2] };
            sch.termination = "Multiple";
        }

        var chart = null;
        if (payload.c) {
            chart = {};
            if (payload.c.s !== undefined) chart.vswrCircle = payload.c.s;
            if (payload.c.q !== undefined) chart.qCircle = payload.c.q;
            if (payload.c.m) {
                chart.markerM = payload.c.m[0];
                chart.markerQ = payload.c.m[1];
                chart.showMarker = true;
            }
            if (payload.c.y) chart.showAdmittace = true;
            if (payload.c.a === 0) chart.showElementArcs = false;
        }

        return { sch: sch, chart: chart };
    }

    /* A schObj with every slot empty, for decode() to fill in. */
    function blankSchematic() {
        var sch = { ver: 5, VF: 1, Z0: 50, TDF: 100, LU: "Inches",
                    SS: 1, ST: 100, SST: 1, SE: "Frequency",
                    termination: "Single",
                    gamData: { label: "", color: "", dataX: [], dataM: [], dataQ: [] },
                    ELEMENT: [] };
        sch.ELEMENT.push({ index: 0, type: "f", value1: 100, value2: 0, tune: 1 });
        sch.ELEMENT.push({ index: 1, type: "rx", value1: 50, value2: 0, tune: 1 });
        for (var i = 2; i <= SLOTS; i++) {
            sch.ELEMENT.push({ index: i, type: "w", value1: 0, value2: 0, q: 1000000, tune: 1 });
        }
        return sch;
    }

    function num(v, fallback) {
        var n = Number(v);
        return isFinite(n) ? n : fallback;
    }

    /* Six significant figures is well past component tolerance and keeps the
       string short. */
    function round(v) {
        var n = Number(v);
        if (!isFinite(n)) return 0;
        return Number(n.toPrecision(6));
    }

    /* ---------------------------------------------------------- base64url
     * Hand-rolled so the codec is identical in a browser, in node and in the
     * test runner - and so the round trip is testable without a DOM.
     */
    var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

    function toBase64Url(text) {
        var bytes = utf8Bytes(text), out = "", i;
        for (i = 0; i < bytes.length; i += 3) {
            var b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2];
            out += ALPHABET.charAt(b0 >> 2);
            out += ALPHABET.charAt(((b0 & 3) << 4) | ((b1 === undefined ? 0 : b1) >> 4));
            if (b1 === undefined) break;
            out += ALPHABET.charAt(((b1 & 15) << 2) | ((b2 === undefined ? 0 : b2) >> 6));
            if (b2 === undefined) break;
            out += ALPHABET.charAt(b2 & 63);
        }
        return out;
    }

    function fromBase64Url(str) {
        var bytes = [], acc = 0, bits = 0;
        for (var i = 0; i < str.length; i++) {
            var v = ALPHABET.indexOf(str.charAt(i));
            if (v < 0) continue;                       // tolerate padding and stray characters
            acc = (acc << 6) | v;
            bits += 6;
            if (bits >= 8) {
                bits -= 8;
                bytes.push((acc >> bits) & 0xff);
            }
        }
        return utf8String(bytes);
    }

    function utf8Bytes(text) {
        var bytes = [];
        for (var i = 0; i < text.length; i++) {
            var c = text.charCodeAt(i);
            if (c < 0x80) bytes.push(c);
            else if (c < 0x800) {
                bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
            } else {
                bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
            }
        }
        return bytes;
    }

    function utf8String(bytes) {
        var out = "", i = 0;
        while (i < bytes.length) {
            var c = bytes[i++];
            if (c < 0x80) out += String.fromCharCode(c);
            else if (c < 0xe0) out += String.fromCharCode(((c & 31) << 6) | (bytes[i++] & 63));
            else out += String.fromCharCode(((c & 15) << 12) |
                                            ((bytes[i++] & 63) << 6) | (bytes[i++] & 63));
        }
        return out;
    }

    return {
        encode: encode,
        decode: decode,
        blankSchematic: blankSchematic,
        VERSION: VERSION
    };
})();

if (typeof module !== "undefined" && module.exports) module.exports = QSLink;
