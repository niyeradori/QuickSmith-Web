/*
 * QuickSmith component symbols.
 * =============================================================================
 *
 * The 29 component icons were 1-bit .bmp files drawn in 1993: 61x20 for a
 * series part, 20x70 for a shunt one, black on opaque white. They could not
 * follow the page theme (an opaque white rectangle in a dark layout), and they
 * were pixels, so they blurred on a retina screen and could not be resized.
 *
 * This draws the same symbols as one inline SVG sprite. They are strokes in
 * currentColor, so a slot can be tinted (or dimmed, or highlighted) with CSS,
 * and they stay sharp at any size.
 *
 *      QSSym.mount();                       // once, injects the sprite
 *      QSSym.set(el, "c", true);            // point an <svg> at a symbol
 *      el = QSSym.make("l", false, "cls");  // or build one
 *
 * Symbols are ids of the form qs-sym-<type>-h / -v. The eight symbols made of
 * plain wire art are drawn once horizontally and rotated for the shunt form.
 * The six that carry a letter are drawn twice, so the letter stays upright.
 */
var QSSym = (function () {
    "use strict";

    var H_BOX = "0 0 61 20";      // series slot, wire running left to right
    var V_BOX = "0 0 20 70";      // shunt slot, wire running top to bottom
    var V_TOP = 10;               // where the series rail crosses it
    var NS = "http://www.w3.org/2000/svg";

    /* ------------------------------------------------------------ drawing
     * All of these work in the 61x20 series frame, with the wire at y = 10.
     */

    /* A resistor's zigzag: n peaks between x0 and x1, amp either side of y. */
    function zig(x0, x1, y, amp) {
        var step = (x1 - x0) / 10;
        var d = "M" + x0 + " " + y + "l" + step + " " + (-amp);
        for (var i = 0; i < 4; i++) {
            d += "l" + (step * 2) + " " + (i % 2 ? -amp * 2 : amp * 2);
        }
        return d + "l" + step + " " + amp;   // back to the wire
    }

    /* An inductor's coil: n humps between x0 and x1. up = which side. */
    function coil(x0, x1, y, n, up) {
        var w = (x1 - x0) / n, r = w / 2;
        var d = "M" + x0 + " " + y;
        for (var i = 0; i < n; i++) {
            d += "a" + r + " " + r + " 0 0 " + (up ? 1 : 0) + " " + w + " 0";
        }
        return d;
    }

    /* A capacitor's two plates, centred on x, spanning half-height hh. */
    function plates(x, y, hh, gap) {
        return "M" + (x - gap / 2) + " " + (y - hh) + "V" + (y + hh) +
               "M" + (x + gap / 2) + " " + (y - hh) + "V" + (y + hh);
    }

    /* One element in a parallel pair: the loop, with each branch drawn by a
       caller-supplied function of its own y. */
    function parallel(branch) {
        return "M0 10H10M10 5V15M10 5H27" + plates(29.5, 5, 3.5, 5) +
               "M32 5H51M10 15H26" + branch(15) + "M44 15H51M51 5V15M51 10H61";
    }

    var ART = {
        w:   "M0 10H61",
        r:   "M0 10H16" + zig(16, 46, 10, 5) + "M46 10H61",
        l:   "M0 10H17" + coil(17, 45, 10, 4, true) + "M45 10H61",
        c:   "M0 10H28" + plates(30.5, 10, 6, 5) + "M33 10H61",
        slc: "M0 10H14" + plates(16.5, 10, 6, 5) + "M19 10H24" +
             coil(24, 52, 10, 4, true) + "M52 10H61",
        src: "M0 10H14" + plates(16.5, 10, 6, 5) + "M19 10H24" +
             zig(24, 50, 10, 5) + "M50 10H61",
        plc: parallel(function (y) { return coil(26, 44, y, 3, false); }),
        prc: parallel(function (y) { return zig(26, 44, y, 3); })
    };

    /* The parts with no symbol of their own: a labelled box, the way
       QuickSmith has drawn them since 1993. */
    var LABELS = { x: "X", t: "T", o: "O", s: "S", g: "MA", rx: "RX" };

    var TYPES = ["w", "r", "l", "c", "slc", "src", "plc", "prc",
                 "x", "t", "o", "s", "g", "rx"];

    /* ------------------------------------------------------------- sprite */

    var FONT = 'font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-weight="600"';

    function labelBoxH(text) {
        var body = '<rect x="18" y="2.5" width="25" height="15" rx="3"/>' +
                   '<path d="M0 10H18M43 10H61"/>';
        return body + '<text x="30.5" y="14" text-anchor="middle" ' + FONT +
               ' font-size="' + (text.length > 1 ? 10 : 12) + '" ' +
               'stroke="none" fill="currentColor">' + text + '</text>';
    }

    function labelBoxV(text) {
        var body = '<rect x="2.5" y="18" width="15" height="34" rx="3"/>' +
                   '<path d="M10 ' + V_TOP + 'V18M10 52V70"/>';
        if (text.length > 1) {
            // stacked, so it reads the right way up in a shunt slot
            return body +
                '<text x="10" y="34" text-anchor="middle" ' + FONT + ' font-size="9.5" ' +
                'stroke="none" fill="currentColor">' + text.charAt(0) + '</text>' +
                '<text x="10" y="46" text-anchor="middle" ' + FONT + ' font-size="9.5" ' +
                'stroke="none" fill="currentColor">' + text.charAt(1) + '</text>';
        }
        return body + '<text x="10" y="40" text-anchor="middle" ' + FONT +
               ' font-size="13" stroke="none" fill="currentColor">' + text + '</text>';
    }

    /* The stroke style lives on a group inside the symbol, not in a
       stylesheet: <use> clones the symbol into a shadow tree that document
       CSS cannot reach, but inherited attributes travel with the clone. */
    var STROKE = 'fill="none" stroke="currentColor" stroke-width="1.4" ' +
                 'stroke-linecap="round" stroke-linejoin="round"';

    function symbol(id, box, body) {
        // A symbol fills its slot, and slots are two to three times the size
        // the bitmaps were, so the stroke is pinned in device pixels instead
        // of scaling up into a fat line. Text is left to scale.
        body = body.replace(/<(path|rect) /g, '<$1 vector-effect="non-scaling-stroke" ');
        return '<symbol id="' + id + '" viewBox="' + box + '" overflow="visible">' +
               '<g ' + STROKE + '>' + body + '</g></symbol>';
    }

    function sprite() {
        var out = ['<svg xmlns="' + NS + '" id="qs-symbols" aria-hidden="true" ' +
                   'style="position:absolute;width:0;height:0;overflow:hidden">'];

        TYPES.forEach(function (t) {
            if (ART.hasOwnProperty(t)) {
                var path = '<path d="' + ART[t] + '"/>';
                out.push(symbol("qs-sym-" + t + "-h", H_BOX, path));
                // the shunt form is the same drawing turned a quarter turn and
                // centred in the taller frame
                out.push(symbol("qs-sym-" + t + "-v", V_BOX,
                                '<g transform="translate(20,' + V_TOP + ') rotate(90)">' + path + '</g>'));
            } else {
                out.push(symbol("qs-sym-" + t + "-h", H_BOX, labelBoxH(LABELS[t])));
                out.push(symbol("qs-sym-" + t + "-v", V_BOX, labelBoxV(LABELS[t])));
            }
        });
        return out.join("") + "</svg>";
    }

    /* --------------------------------------------------------------- API */

    function mount(doc) {
        doc = doc || document;
        if (doc.getElementById("qs-symbols")) return;
        var host = doc.createElement("div");
        host.innerHTML = sprite();
        doc.body.insertBefore(host.firstChild, doc.body.firstChild);
    }

    function id(type, shunt) {
        return "qs-sym-" + type + (shunt ? "-v" : "-h");
    }

    /* Point an existing <svg> at a symbol. A wire in a shunt slot is an open
       circuit, so it draws nothing at all - which is what the old wv.bmp was
       trying to say with a blank white rectangle. */
    function set(el, type, shunt) {
        if (!el) return;
        el.setAttribute("viewBox", shunt ? V_BOX : H_BOX);
        el.setAttribute("data-type", type);
        while (el.firstChild) el.removeChild(el.firstChild);
        // a wire in a shunt slot is an open circuit, so it draws nothing at all,
        // which is what the old blank white bitmap was trying to say
        if (type === "w" && shunt) return;
        var use = document.createElementNS(NS, "use");
        use.setAttribute("href", "#" + id(type, shunt));
        el.appendChild(use);
    }

    function make(type, shunt, cls) {
        var el = document.createElementNS(NS, "svg");
        if (cls) el.setAttribute("class", cls);
        set(el, type, shunt);
        return el;
    }

    return { mount: mount, sprite: sprite, id: id, set: set, make: make, types: TYPES };
})();

if (typeof module !== "undefined" && module.exports) module.exports = QSSym;
