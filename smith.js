/*
 * QuickSmith chart renderer.
 * =============================================================================
 *
 * Draws the Smith chart as SVG. The previous version painted a canvas
 * imperatively at a fixed 1000-unit scale, which meant no zoom, no hit
 * testing beyond the marker dot, one hard-coded palette, and a blurry chart on
 * every retina display.
 *
 * The chart is a pure function of state: hand it a smithObj and it renders,
 * every time, from scratch. There is no incremental drawing to get out of step
 * with the model. An SVG redraw of ~200 nodes is far cheaper than the canvas
 * repaint it replaces, so the old per-overlay draw calls all just re-render.
 *
 * Coordinates are the same "chart units" the rest of QuickSmith uses:
 * the reflection coefficient scaled by AXIS_RANGE (1000), x to the right and
 * y upwards. SVG's y axis points down, so y is negated on the way out and
 * nowhere else.
 *
 * Colour comes entirely from CSS custom properties, so the two palettes - and
 * anything the user prefers instead - are a stylesheet concern, not a code one.
 */

var QSChart = (function () {
    "use strict";

    var NS = "http://www.w3.org/2000/svg";
    var R = 1000;                 // chart radius in chart units
    var VIEW = 1130;              // half the viewBox, leaving room for rim labels
    var seq = 0;

    /* Normalised grid values. Majors are labelled; minors carry the eye. */
    /*
     * The coarse chart: five constant-resistance circles and five reactance
     * arcs each side, the set the rim and axis labels are drawn for. A paper
     * Smith chart needs a fine grid because interpolating by eye is how you
     * read a value off it. Here the value is already on screen - in the
     * readout, and under the pointer - so the fine grid was decoration, and
     * forty-two curves is a lot of decoration to lay a design over.
     */
    var R_MAJOR = [0.2, 0.5, 1, 2, 5];
    var X_MAJOR = [0.2, 0.5, 1, 2, 5];

    /* ------------------------------------------------------------- styling */

    /*
     * The palette lives apart from the drawing rules because an exported chart
     * must not carry it. In a standalone .svg the root element is the svg
     * itself, so a :root block in the file would outrank the literal colours
     * written alongside it, and every export would come out in whatever theme
     * the machine opening it happened to prefer.
     */
    var PALETTE = [
        ":root{--qs-bg:#dce3ed;--qs-face:#f6f8fc;--qs-ink:#2b3547;",
        "--qs-rim:#d3dae6;--qs-edge:#bdc7d8;--qs-r:#b5342b;--qs-x:#1f7a52;--qs-adm:#4a6fa5;",
        "--qs-vswr:#1f5fbf;--qs-accent:#1f5fbf;--qs-q:#8d3a9b;--qs-marker:#14181f;--qs-dot:#1f5fbf;",
        "--qs-trace:#1f5fbf;--qs-plot:#2b3547;--qs-text:#6b7688;--qs-ui:#6b7688;",
        "--qs-a1:#1f5fbf;--qs-a2:#b5342b;--qs-a3:#1f7a52;--qs-a4:#8d3a9b;",
        "--qs-a5:#b26a00;--qs-a6:#0f7f8f}",

        "@media (prefers-color-scheme:dark){:root:not([data-qs-theme=bench]){",
        "color-scheme:dark;--qs-bg:#0e1219;--qs-face:#202a38;--qs-ink:#cdd5e1;--qs-rim:#2a3341;--qs-edge:#4a5c76;--qs-r:#ef8078;",
        "--qs-x:#52c793;--qs-adm:#7aa2c9;--qs-vswr:#6aa4f5;--qs-accent:#3a6ea8;--qs-q:#cd88d8;",
        "--qs-marker:#cdd5e1;--qs-dot:#6aa4f5;--qs-trace:#6aa4f5;--qs-plot:#cdd5e1;",
        "--qs-text:#8b95a7;--qs-ui:#8b95a7;",
        "--qs-a1:#6aa4f5;--qs-a2:#e5776e;--qs-a3:#48c48d;--qs-a4:#c47fd0;",
        "--qs-a5:#e0a04a;--qs-a6:#4fc4d6}}",

        ":root[data-qs-theme=analyzer]{",
        "color-scheme:dark;--qs-bg:#0e1219;--qs-face:#202a38;--qs-ink:#cdd5e1;--qs-rim:#2a3341;--qs-edge:#4a5c76;--qs-r:#ef8078;",
        "--qs-x:#52c793;--qs-adm:#7aa2c9;--qs-vswr:#6aa4f5;--qs-accent:#3a6ea8;--qs-q:#cd88d8;",
        "--qs-marker:#cdd5e1;--qs-dot:#6aa4f5;--qs-trace:#6aa4f5;--qs-plot:#cdd5e1;",
        "--qs-text:#8b95a7;--qs-ui:#8b95a7;",
        "--qs-a1:#6aa4f5;--qs-a2:#e5776e;--qs-a3:#48c48d;--qs-a4:#c47fd0;",
        "--qs-a5:#e0a04a;--qs-a6:#4fc4d6}",

        ":root[data-qs-theme=bench]{color-scheme:light}"
    ].join("");

    var CSS = [
        ".qs-wrap{position:relative;width:100%}",
        ".qs-svg{display:block;width:100%;height:auto;aspect-ratio:1/1;background:var(--qs-face);",
        "border:1px solid var(--qs-rim);border-radius:10px;","-webkit-user-select:none;user-select:none;",
        // pan-y keeps the page scrollable under a finger; once the chart is
        // zoomed it takes the gesture so the user can pan around inside it
        "touch-action:pan-y}",
        ".qs-svg[data-qs-zoomed]{touch-action:none}",
        ".qs-face{fill:var(--qs-bg);stroke:var(--qs-rim);stroke-width:3}",
        ".qs-grid path,.qs-grid circle{fill:none;vector-effect:non-scaling-stroke}",
        ".qs-r-major{stroke:var(--qs-r);stroke-width:1.6;opacity:.85}",
        ".qs-x-major{stroke:var(--qs-x);stroke-width:1.6;opacity:.85}",
        ".qs-axis{stroke:var(--qs-x);stroke-width:1.6;opacity:.85}",
        ".qs-adm{stroke:var(--qs-adm);stroke-width:1.2;opacity:.55;",
        "stroke-dasharray:6 7;fill:none;vector-effect:non-scaling-stroke}",
        ".qs-label{fill:var(--qs-text);font:500 34px ui-monospace,SFMono-Regular,Menlo,monospace}",
        ".qs-label-sm{fill:var(--qs-text);font:500 28px ui-monospace,SFMono-Regular,Menlo,monospace}",
        ".qs-overlay{fill:none;vector-effect:non-scaling-stroke}",
        ".qs-vswr{stroke:var(--qs-vswr);stroke-width:2;stroke-dasharray:10 8}",
        ".qs-q{stroke:var(--qs-q);stroke-width:2;stroke-dasharray:4 6}",
        ".qs-gain{stroke-width:2.2}",
        ".qs-marker{stroke:var(--qs-marker);stroke-width:2.4;fill:none}",
        ".qs-trace{stroke:var(--qs-trace);stroke-width:3;fill:none;stroke-linejoin:round;",
        "stroke-linecap:round;vector-effect:non-scaling-stroke}",
        ".qs-plot{stroke:var(--qs-plot);stroke-width:2.4;fill:none;stroke-linejoin:round;",
        "vector-effect:non-scaling-stroke}",
        // amber, so the suggestion is not mistaken for the Q circle it
        // would otherwise share a colour and a dash pattern with
        ".qs-next{fill:none;stroke:var(--qs-a5);stroke-width:3;stroke-dasharray:7 7;",
        "stroke-linecap:round;vector-effect:non-scaling-stroke}",
        ".qs-nexttext{fill:var(--qs-a5)}",
        ".qs-arc{fill:none;stroke-width:4.5;stroke-linecap:round;stroke-linejoin:round;",
        "opacity:.9;vector-effect:non-scaling-stroke}",
        ".qs-node{stroke:var(--qs-face);stroke-width:3}",
        ".qs-dot{fill:var(--qs-dot);stroke:var(--qs-face);stroke-width:5}",
        // touch-action:none or the chart's pan-y hands any gesture with a
        // vertical component to the page scroller, which cancels the drag
        // before it starts. A finger could only ever tune sideways.
        ".qs-grab{fill:transparent;cursor:grab;touch-action:none}",
        ".qs-grab:active{cursor:grabbing}",
        ".qs-hover{fill:none;stroke:var(--qs-ui);stroke-width:1.4;opacity:.7}",
        ".qs-hover-text{fill:var(--qs-text);font:500 30px ui-monospace,SFMono-Regular,Menlo,monospace}",

        ".qs-tools{position:absolute;top:8px;right:8px;display:flex;gap:4px}",
        ".qs-tools button{width:26px;height:26px;padding:0;line-height:1;",
        "font:600 14px system-ui,sans-serif;color:var(--qs-ui);cursor:pointer;",
        "background:var(--qs-face);border:1px solid var(--qs-rim);border-radius:6px}",
        ".qs-tools button:hover{border-color:var(--qs-vswr);color:var(--qs-vswr)}",
        ".qs-tools button:focus-visible{outline:2px solid var(--qs-vswr);outline-offset:1px}",
        // The reset button keeps its slot when inactive. Collapsing it would shift
        // the others sideways the moment you zoom, moving + out from under the cursor.
        ".qs-tools button[hidden]{visibility:hidden;pointer-events:none}"
    ].join("");

    function installStyles() {
        if (document.getElementById("qs-chart-css")) return;
        var s = document.createElement("style");
        s.id = "qs-chart-css";
        s.textContent = PALETTE + CSS;
        document.head.appendChild(s);
    }

    /* --------------------------------------------------------- DOM helpers */

    function el(tag, attrs, parent) {
        var n = document.createElementNS(NS, tag);
        for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(n);
        return n;
    }

    function clear(node) {
        while (node.firstChild) node.removeChild(node.firstChild);
    }

    /* --------------------------------------------------------------- mount
     * Replaces the given element (a <canvas> or a placeholder) with an SVG in
     * a positioned wrapper, and returns the handle the rest of the code uses.
     */
    function mount(target) {
        installStyles();
        if (typeof target === "string") target = document.getElementById(target);

        var wrap = document.createElement("div");
        wrap.className = "qs-wrap";
        target.parentNode.replaceChild(wrap, target);

        var svg = el("svg", {
            "class": "qs-svg",
            id: target.id,
            viewBox: [-VIEW, -VIEW, 2 * VIEW, 2 * VIEW].join(" "),
            preserveAspectRatio: "xMidYMid meet",
            role: "img",
            "aria-label": "Smith chart"
        }, wrap);

        var uid = "qs" + (++seq);
        var defs = el("defs", {}, svg);
        var clip = el("clipPath", { id: uid + "-clip" }, defs);
        el("circle", { cx: 0, cy: 0, r: R }, clip);

        var root = el("g", { "class": "qs-root" }, svg);

        var view = {
            id: target.id,
            wrap: wrap,
            el: svg,
            root: root,
            clip: "url(#" + uid + "-clip)",
            zoom: 1, panX: 0, panY: 0,
            owner: null,          // the smithObj this view draws
            hover: null           // {x, y} in chart units, or null
        };

        addTools(view);
        addInteraction(view);
        return view;
    }

    /* ------------------------------------------------------------- controls */

    function addTools(view) {
        var tools = document.createElement("div");
        tools.className = "qs-tools";

        function button(label, title, fn) {
            var b = document.createElement("button");
            b.type = "button";
            b.textContent = label;
            b.title = title;
            b.setAttribute("aria-label", title);
            b.addEventListener("click", fn);
            tools.appendChild(b);
            return b;
        }

        button("−", "Zoom out", function () { zoomBy(view, 1 / 1.3); });
        button("+", "Zoom in", function () { zoomBy(view, 1.3); });
        view.resetBtn = button("✕", "Reset zoom", function () {
            view.zoom = 1; view.panX = 0; view.panY = 0; applyTransform(view);
        });
        view.resetBtn.hidden = true;

        button("◐", "Switch palette", function () {
            var next = currentTheme(view) === "analyzer" ? "bench" : "analyzer";
            document.documentElement.setAttribute("data-qs-theme", next);
            try { localStorage.setItem("qsChartTheme", next); } catch (e) { /* private mode */ }
        });

        view.wrap.appendChild(tools);
    }

    function currentTheme(view) {
        return document.documentElement.getAttribute("data-qs-theme") || "analyzer";
    }

    function applyTransform(view) {
        view.root.setAttribute("transform",
            "translate(" + view.panX + "," + view.panY + ") scale(" + view.zoom + ")");
        var zoomed = !(view.zoom === 1 && !view.panX && !view.panY);
        if (view.resetBtn) view.resetBtn.hidden = !zoomed;
        if (zoomed) view.el.setAttribute("data-qs-zoomed", "");
        else view.el.removeAttribute("data-qs-zoomed");
    }

    function zoomBy(view, factor, atX, atY) {
        var next = Math.min(12, Math.max(1, view.zoom * factor));
        if (next === view.zoom) return;
        if (atX === undefined) { atX = 0; atY = 0; }
        // keep the point under the cursor fixed
        view.panX = atX - (atX - view.panX) * (next / view.zoom);
        view.panY = atY - (atY - view.panY) * (next / view.zoom);
        view.zoom = next;
        if (view.zoom === 1) { view.panX = 0; view.panY = 0; }
        applyTransform(view);
    }

    /* ----------------------------------------------------------- pointering
     * Wheel zooms about the cursor, drag pans, two fingers pinch. Panning is
     * only live while zoomed in, so ordinary use never fights the readout or
     * the double-click dialog.
     *
     * Dragging a node handle tunes that component instead: the pointer is
     * captured on the svg rather than on the circle, so the redraw that
     * follows every step does not pull the target out from under the gesture.
     */
    function addInteraction(view) {
        var svg = view.el, drag = null, pointers = {}, pinch = null;
        var tuning = null;      // the slot whose node is being dragged

        svg.addEventListener("wheel", function (e) {
            e.preventDefault();
            var p = rawPoint(view, e);
            zoomBy(view, e.deltaY < 0 ? 1.12 : 1 / 1.12, p.x, p.y);
        }, { passive: false });

        svg.addEventListener("pointerdown", function (e) {
            // a node handle claims the gesture before panning can have it
            var handle = e.target.closest && e.target.closest(".qs-grab");
            if (handle) {
                tuning = Number(handle.getAttribute("data-slot"));
                // capture keeps the gesture even though the redraw replaces
                // the handle under the pointer; it throws on a pointer the
                // browser is not tracking, which must not kill the drag
                try { svg.setPointerCapture(e.pointerId); } catch (err) { /* no capture */ }
                e.preventDefault();
                return;
            }
            pointers[e.pointerId] = rawPoint(view, e);
            var ids = Object.keys(pointers);
            if (ids.length === 2) {
                pinch = { d: spread(pointers, ids), zoom: view.zoom };
                drag = null;
            } else if (view.zoom > 1) {
                drag = { x: e.clientX, y: e.clientY, panX: view.panX, panY: view.panY };
                svg.setPointerCapture(e.pointerId);
            }
        });

        svg.addEventListener("pointermove", function (e) {
            if (tuning !== null) {
                var t = pointerToChart(view, e);
                if (view.owner && typeof view.owner.onTune === "function") {
                    view.owner.onTune(tuning, { re: t.x / R, im: t.y / R });
                }
                return;
            }
            if (pointers[e.pointerId]) pointers[e.pointerId] = rawPoint(view, e);
            var ids = Object.keys(pointers);

            if (pinch && ids.length === 2) {
                var d = spread(pointers, ids);
                if (pinch.d > 0) {
                    view.zoom = Math.min(12, Math.max(1, pinch.zoom * d / pinch.d));
                    if (view.zoom === 1) { view.panX = 0; view.panY = 0; }
                    applyTransform(view);
                }
                return;
            }
            if (drag) {
                var scale = svgScale(view);
                view.panX = drag.panX + (e.clientX - drag.x) / scale;
                view.panY = drag.panY + (e.clientY - drag.y) / scale;
                applyTransform(view);
                return;
            }
            var p = pointerToChart(view, e);
            view.hover = InSmith(p.x, p.y) ? p : null;
            renderHover(view);
        });

        function release(e) {
            delete pointers[e.pointerId];
            if (Object.keys(pointers).length < 2) pinch = null;
            drag = null;
            // the whole drag is one edit, so the owner is told where it ended
            if (tuning !== null && view.owner && typeof view.owner.onTuneEnd === "function") {
                view.owner.onTuneEnd(tuning);
            }
            tuning = null;
        }
        svg.addEventListener("pointerup", release);
        svg.addEventListener("pointercancel", release);
        svg.addEventListener("pointerleave", function (e) {
            release(e);
            view.hover = null;
            renderHover(view);
        });
    }

    function spread(pointers, ids) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    }

    /* How many CSS pixels one chart unit currently occupies. */
    /*
     * The drag handle's radius, in chart units, from a target size in screen
     * pixels. Whether you can hit it is a question about the pointer and the
     * zoom, not about the chart's coordinate system: at 46 units it came out
     * 14px across on a phone, against the 44px a fingertip wants. A mouse is
     * happy with half that, and a smaller handle keeps neighbouring nodes
     * distinct.
     */
    function grabRadius(view) {
        var coarse = window.matchMedia &&
            window.matchMedia("(pointer: coarse)").matches;
        var wanted = coarse ? 22 : 11;
        var scale = view ? svgScale(view) : 0;
        return scale > 0 ? wanted / scale : 46;
    }

    function svgScale(view) {
        var box = view.el.getBoundingClientRect();
        return (box.width / (2 * VIEW)) * view.zoom;
    }

    /* Pointer position in viewBox units, ignoring zoom and pan. */
    function rawPoint(view, e) {
        var box = view.el.getBoundingClientRect();
        var size = Math.min(box.width, box.height) || box.width;
        var cx = box.left + box.width / 2, cy = box.top + box.height / 2;
        var k = (2 * VIEW) / size;
        return { x: (e.clientX - cx) * k, y: (e.clientY - cy) * k };
    }

    /*
     * Pointer position in chart units, y upwards - the coordinate system the
     * rest of QuickSmith works in.
     */
    function pointerToChart(view, e) {
        var p = rawPoint(view, e);
        return {
            x: (p.x - view.panX) / view.zoom,
            y: -(p.y - view.panY) / view.zoom
        };
    }

    /* ================================================================ render */

    function render(me) {
        var view = me.view;
        if (!view) return;
        view.owner = me;
        clear(view.root);
        applyTransform(view);

        el("circle", { "class": "qs-face", cx: 0, cy: 0, r: R }, view.root);

        drawGrid(view);
        if (me.showAdmittace) drawAdmittanceGrid(view);
        drawLabels(view);

        var overlays = el("g", { "class": "qs-overlays" }, view.root);
        drawVSWR(me, overlays);
        drawQ(me, overlays, view);
        drawGain(me, overlays);
        if (me.showMarker) drawMarkerAt(me, overlays);

        var traces = el("g", { "class": "qs-traces" }, view.root);
        if (me.sweep) polyline(traces, me.sweepDatasets[0], "qs-trace", me.sweepDatasets[0].color);
        if (me.data) polyline(traces, me.plotDatasets[0], "qs-plot", me.plotDatasets[0].color);

        drawElementArcs(me, view.root);
        // over the arcs, not under them: the suggestion often retraces the
        // same circle an element is already on, since a series part never
        // changes resistance, and underneath it simply disappeared
        drawNextMove(me, view.root);

        var pt = polar(me.dataM, me.dataQ);
        el("circle", { "class": "qs-dot", cx: pt.x, cy: -pt.y, r: 22 }, view.root);

        view.hoverLayer = el("g", { "class": "qs-hoverlayer" }, view.root);
        renderHover(view);
    }

    function polar(mag, angDeg) {
        var m = Number(mag) * R, a = Number(angDeg) * Math.PI / 180;
        return { x: m * Math.cos(a), y: m * Math.sin(a) };
    }

    /* ------------------------------------------------------------- the grid */

    function drawGrid(view) {
        var g = el("g", { "class": "qs-grid", "clip-path": view.clip }, view.root);

        R_MAJOR.forEach(function (r) { rCircle(g, r, "qs-r-major"); });
        X_MAJOR.forEach(function (x) { xArc(g, x, "qs-x-major"); xArc(g, -x, "qs-x-major"); });

        el("line", { "class": "qs-axis", x1: -R, y1: 0, x2: R, y2: 0 }, g);
    }

    /* Constant resistance: centre r/(1+r), radius 1/(1+r). */
    function rCircle(g, r, cls) {
        var c = rCircleGeometry(r);
        el("circle", { "class": cls, cx: c.cx, cy: c.cy, r: c.r }, g);
    }

    /* Constant reactance: centre (1, 1/x), radius 1/|x|, clipped to the rim. */
    function xArc(g, x, cls) {
        var c = xCircleGeometry(x);
        el("circle", { "class": cls, cx: c.cx, cy: c.cy, r: c.r }, g);
    }

    function drawAdmittanceGrid(view) {
        var g = el("g", { "class": "qs-admgrid", "clip-path": view.clip }, view.root);
        [0.2, 0.5, 1, 2, 5].forEach(function (c) {
            el("circle", { "class": "qs-adm", cx: -R * c / (1 + c), cy: 0, r: R / (1 + c) }, g);
        });
        [0.5, 1, 2].forEach(function (b) {
            el("circle", { "class": "qs-adm", cx: -R, cy: R / b, r: R / b }, g);
            el("circle", { "class": "qs-adm", cx: -R, cy: -R / b, r: R / b }, g);
        });
    }

    function drawLabels(view) {
        var g = el("g", { "class": "qs-labels" }, view.root);

        // resistance values sit where their circle crosses the real axis
        R_MAJOR.forEach(function (r) {
            var x = R * (r - 1) / (r + 1);
            var t = el("text", {
                "class": "qs-label-sm", x: x, y: 40,
                "text-anchor": "middle"
            }, g);
            t.textContent = String(r);
        });

        // reactance values sit just outside the rim, where their arc meets it
        X_MAJOR.forEach(function (x) {
            [x, -x].forEach(function (v) {
                var a = xRimAngle(v) * Math.PI / 180;          // angle of (jv-1)/(jv+1)
                var px = 1.055 * R * Math.cos(a), py = 1.055 * R * Math.sin(a);
                var t = el("text", {
                    "class": "qs-label-sm", x: px, y: -py,
                    "text-anchor": px < -20 ? "end" : (px > 20 ? "start" : "middle"),
                    "dominant-baseline": "middle"
                }, g);
                t.textContent = (v > 0 ? "+j" : "-j") + Math.abs(v);
            });
        });

        var z = el("text", {
            "class": "qs-label", x: R * 1.06, y: R * 1.02, "text-anchor": "end"
        }, g);
        var owner = view.owner;
        z.textContent = (owner && owner.Z0) ? (Number(owner.Z0).toFixed(1) + " Ω") : "";

        if (owner && owner.title) {
            var t2 = el("text", {
                "class": "qs-label", x: -R * 1.06, y: -R * 1.0, "text-anchor": "start"
            }, g);
            t2.textContent = owner.title;
        }
    }

    /* ----------------------------------------------------------- overlays */

    function drawVSWR(me, g) {
        var swr = parseFloat(me.vswrCircle);
        if (!(swr > 1)) return;
        el("circle", {
            "class": "qs-overlay qs-vswr", cx: 0, cy: 0, r: R * (swr - 1) / (swr + 1)
        }, g);
    }

    /*
     * Constant Q = |X|/R: a pair of circles centred at +/-1/q on the imaginary
     * axis with radius sqrt(1 + 1/q^2), both passing through gamma = +/-1.
     * Clipping to the rim leaves exactly the two arcs the chart wants.
     */
    function drawQ(me, g, view) {
        var q = parseFloat(me.qCircle);
        if (!q) return;
        var c = R / q, rad = R * Math.sqrt(1 + 1 / (q * q));
        var clipped = el("g", { "clip-path": view.clip }, g);
        el("circle", { "class": "qs-overlay qs-q", cx: 0, cy: -c, r: rad }, clipped);
        el("circle", { "class": "qs-overlay qs-q", cx: 0, cy: c, r: rad }, clipped);
    }

    function drawGain(me, g) {
        if (!me.circleR || !me.circleR.length) return;
        for (var i = 0; i < me.circleR.length; i++) {
            var rad = parseFloat(me.circleR[i]);
            if (!(rad > 0)) continue;
            if (me.circleShow && !me.circleShow[i]) continue;
            var c = polar(me.circleM[i], me.circleQ[i]);
            el("circle", {
                "class": "qs-overlay qs-gain", cx: c.x, cy: -c.y, r: rad * R,
                stroke: me.circleColor[i]
            }, g);
        }
    }

    function drawMarkerAt(me, g) {
        var p = polar(me.markerM, me.markerQ);
        var s = 26;
        el("circle", { "class": "qs-marker", cx: p.x, cy: -p.y, r: s }, g);
        el("path", {
            "class": "qs-marker",
            d: "M " + (p.x - s * 1.7) + " " + (-p.y) + " H " + (p.x + s * 1.7) +
               " M " + p.x + " " + (-p.y - s * 1.7) + " V " + (-p.y + s * 1.7)
        }, g);
    }

    /* ------------------------------------------------------------- traces */

    function polyline(g, dataset, cls, color) {
        var M = dataset.dataM, Q = dataset.dataQ;
        if (!M || M.length < 2) return;
        var pts = [];
        for (var i = 0; i < M.length; i++) {
            var p = polar(M[i], Q[i]);
            pts.push(p.x.toFixed(1) + "," + (-p.y).toFixed(1));
        }
        var node = el("polyline", { "class": cls, points: pts.join(" ") }, g);
        if (color) node.setAttribute("stroke", color);
    }

    /*
     * One arc per component, in the order the signal meets them, so the path
     * from the load to Zin is attributable element by element. This is the
     * thing a Smith chart is for.
     */
    /*
     * The move that would finish the match, drawn from where the design
     * actually is.
     *
     * This replaces four bitmaps of the four regions of the chart, which said
     * what shape of network suits a load in each one. Same idea, except it is
     * about this design rather than the general case: it runs the matcher from
     * the present Zin and draws the path the remaining elements would take, so
     * the answer is the arc you would get, at the values you would use. When
     * there is nothing left to do it draws nothing, which is the other half of
     * the lesson.
     */
    function drawNextMove(me, parent) {
        if (!me.showNextMove) return;
        var solution = (typeof resultsObj !== "undefined") ? resultsObj.solution : null;
        if (!solution || !solution.Zin) return;
        if (solution.gamma.mag < 0.02) return;              // already matched

        var Z0 = Number(me.Z0) || solution.Z0 || 50;
        var best = QSEngine.matchToZ0(solution.Zin, Z0, solution.frequency)[0];
        if (!best) return;

        // Solve the two elements as if the present Zin were the load, which
        // gives their arcs for free rather than repeating the geometry here.
        var elements = [];
        elements[1] = { type: "rx", value1: solution.Zin.re, value2: solution.Zin.im };
        best.elements.forEach(function (e) {
            elements[e.slot] = { type: e.type, value1: e.value1, value2: 0 };
        });
        var ghost = QSEngine.solve({ Z0: Z0, frequency: solution.frequency, elements: elements });

        var g = el("g", { "class": "qs-hintpath" }, parent);
        for (var i = 1; i < ghost.nodes.length; i++) {
            var path = ghost.nodes[i].path;
            if (!path || path.length < 2) continue;
            var pts = [];
            for (var j = 0; j < path.length; j++) {
                pts.push((path[j].re * R).toFixed(1) + "," + (-path[j].im * R).toFixed(1));
            }
            el("polyline", { "class": "qs-next", points: pts.join(" ") }, g);
        }

        var named = best.elements.filter(function (e) { return e.type !== "w"; })
            .map(function (e) {
                return (isShunt(e.slot) ? "shunt " : "series ") + e.type.toUpperCase() +
                       " " + Number(e.value1).toFixed(1) +
                       (e.type === "l" ? " nH" : " pF");
            }).join(", then ");
        var caption = el("text", {
            "class": "qs-label-sm qs-nexttext", x: -R * 1.06, y: R * 1.02,
            "text-anchor": "start"
        }, g);
        caption.textContent = "next: " + named;
    }

    function isShunt(slot) { return slot % 2 === 1; }

    function drawElementArcs(me, parent) {
        if (me.showElementArcs === false) return;
        var solution = (typeof resultsObj !== "undefined") ? resultsObj.solution : null;
        if (!solution || !solution.nodes || solution.nodes.length < 2) return;

        var g = el("g", { "class": "qs-arcs" }, parent);
        var nodes = solution.nodes;

        for (var i = 1; i < nodes.length; i++) {
            var path = nodes[i].path;
            if (!path || path.length < 2) continue;
            var pts = [];
            for (var j = 0; j < path.length; j++) {
                pts.push((path[j].re * R).toFixed(1) + "," + (-path[j].im * R).toFixed(1));
            }
            var stroke = "var(--qs-a" + (((i - 1) % 6) + 1) + ")";
            var line = el("polyline", { "class": "qs-arc", points: pts.join(" "), stroke: stroke }, g);
            var label = String(nodes[i].type || "").toUpperCase() + nodes[i].slot;
            el("title", {}, line).textContent = label;
        }

        // a small dot at each junction, including the load
        for (var k = 0; k < nodes.length; k++) {
            var c = nodes[k].gamma;
            var fill = k === 0 ? "var(--qs-text)" : "var(--qs-a" + (((k - 1) % 6) + 1) + ")";
            var dot = el("circle", {
                "class": "qs-node", cx: c.re * R, cy: -c.im * R, r: 13, fill: fill
            }, g);
            var name = (k === 0 ? "Load" :
                String(nodes[k].type || "").toUpperCase() + nodes[k].slot);
            el("title", {}, dot).textContent = name +
                ": " + nodes[k].Z.re.toFixed(2) +
                (nodes[k].Z.im >= 0 ? " + j" : " - j") + Math.abs(nodes[k].Z.im).toFixed(2);

            // A node you can drag gets a handle far bigger than the dot: at
            // this zoom the dot itself is about three pixels across.
            if (QSEngine.canTune(nodes[k].type, nodes[k].slot)) {
                var grab = el("circle", {
                    "class": "qs-grab", "data-slot": nodes[k].slot,
                    cx: c.re * R, cy: -c.im * R, r: grabRadius(me.view)
                }, g);
                el("title", {}, grab).textContent = "Drag to tune " + name;
            }
        }
    }

    /* ------------------------------------------------------- hover readout */

    function renderHover(view) {
        if (!view.hoverLayer) return;
        clear(view.hoverLayer);
        var p = view.hover;
        if (!p) return;

        var m = Math.sqrt(p.x * p.x + p.y * p.y) / R;
        var ang = Math.atan2(p.y, p.x) * 180 / Math.PI;
        var Z0 = (view.owner && view.owner.Z0) ? Number(view.owner.Z0) : 50;
        var ZR = GToZRZ(m, ang, Z0), ZI = GToZIZ(m, ang, Z0);
        var swr = (m >= 1) ? Infinity : (1 + m) / (1 - m);

        el("circle", { "class": "qs-hover", cx: p.x, cy: -p.y, r: 16 }, view.hoverLayer);

        var right = p.x < 0;
        var t = el("text", {
            "class": "qs-hover-text",
            x: p.x + (right ? 34 : -34), y: -p.y - 26,
            "text-anchor": right ? "start" : "end"
        }, view.hoverLayer);
        t.textContent = ZR.toFixed(1) + (ZI >= 0 ? " + j" : " - j") + Math.abs(ZI).toFixed(1) + " Ω";

        var t2 = el("text", {
            "class": "qs-hover-text",
            x: p.x + (right ? 34 : -34), y: -p.y + 12,
            "text-anchor": right ? "start" : "end"
        }, view.hoverLayer);
        t2.textContent = "SWR " + (isFinite(swr) ? swr.toFixed(2) : "∞");
    }

    /* --------------------------------------------------------------- export
     * "Capture Chart" still hands back a PNG. The SVG is serialised with the
     * live palette resolved to literal colours, because a detached document
     * has no custom properties to inherit.
     */
    /*
     * The chart as a standalone SVG: vector, so it scales without going soft,
     * and every drawing program reads it. The grab handles and the readout
     * that follows the pointer come out - they are for the person driving the
     * chart, not for the page it ends up on.
     */
    function toSVG(view, px) {
        var clone = view.el.cloneNode(true);
        clone.setAttribute("width", px);
        clone.setAttribute("height", px);
        clone.setAttribute("xmlns", NS);
        Array.prototype.forEach.call(clone.querySelectorAll(".qs-grab, .qs-hoverlayer"),
            function (n) { n.parentNode.removeChild(n); });

        var style = document.createElementNS(NS, "style");
        style.textContent = CSS + resolvedVars(view);
        clone.insertBefore(style, clone.firstChild);

        return new XMLSerializer().serializeToString(clone);
    }

    function toBlob(view, callback, scale) {
        var px = Math.round((scale || 2) * 600);
        var markup = toSVG(view, px);
        var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);

        var img = new Image();
        img.onload = function () {
            var canvas = document.createElement("canvas");
            canvas.width = px; canvas.height = px;
            canvas.getContext("2d").drawImage(img, 0, 0, px, px);
            if (canvas.toBlob) { canvas.toBlob(callback); return; }
            callback(dataURLToBlob(canvas.toDataURL("image/png")));
        };
        img.onerror = function () { callback(null); };
        img.src = url;
    }

    /* For anything too old to have canvas.toBlob. */
    function dataURLToBlob(url) {
        var parts = url.split(",");
        var binary = atob(parts[1]);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: "image/png" });
    }

    var VAR_NAMES = ("bg face rim r x adm vswr q marker dot trace plot text ui " +
                     "a1 a2 a3 a4 a5 a6").split(" ");

    function resolvedVars(view) {
        var computed = window.getComputedStyle(view.wrap);
        var out = ".qs-wrap,svg{";
        VAR_NAMES.forEach(function (n) {
            out += "--qs-" + n + ":" + computed.getPropertyValue("--qs-" + n).trim() + ";";
        });
        return out + "}";
    }

    /* Grid geometry, exposed so it can be checked without a browser. */
    function rCircleGeometry(r) {
        return { cx: R * r / (1 + r), cy: 0, r: R / (1 + r) };
    }
    function xCircleGeometry(x) {
        return { cx: R, cy: -R / x, r: R / Math.abs(x) };
    }
    /* Where a constant-reactance arc meets the rim, in degrees. */
    function xRimAngle(x) {
        return 2 * Math.atan(1 / x) * 180 / Math.PI;
    }

    /*
     * Dark is the default, and a stored choice from the palette button wins.
     * Both the palette and the choice are applied as this file loads rather
     * than when the chart mounts, so the page never paints light first and
     * then switches. This file is in <head>, so document.head and
     * documentElement are both there already.
     */
    installStyles();
    (function () {
        var stored = null;
        try { stored = localStorage.getItem("qsChartTheme"); } catch (e) { stored = null; }
        document.documentElement.setAttribute("data-qs-theme", stored || "analyzer");
    })();

    return {
        mount: mount,
        render: render,
        toBlob: toBlob,
        toSVG: toSVG,
        pointerToChart: pointerToChart,
        currentTheme: currentTheme,
        rCircleGeometry: rCircleGeometry,
        xCircleGeometry: xCircleGeometry,
        xRimAngle: xRimAngle,
        grid: { rMajor: R_MAJOR, xMajor: X_MAJOR },
        AXIS: R
    };
})();

/* =========================================================================
 * The smithObj-facing API.
 *
 * These names are what index.html and AmplifierDesign.html call. The canvas
 * version needed a separate routine per overlay because it painted
 * incrementally; SVG is cheap enough to redraw whole, so they all funnel into
 * one render.
 * ========================================================================= */

function drawSmith(me) { QSChart.render(me); }
function drawMarker(me) { QSChart.render(me); }
function drawdataSprite(me) { QSChart.render(me); }
function drawSweep(me) { QSChart.render(me); }
function dataPlot(me) { QSChart.render(me); }
function drawVSWRCircles(me) { QSChart.render(me); }
function drawQCircles(me) { QSChart.render(me); }
function drawGainCircles(me) { QSChart.render(me); }

function drawAdmitanceCircles(me) {
    me.showAdmittace = !me.showAdmittace;
    QSChart.render(me);
}

/* ------------------------------------------------- chart-space geometry
 * Unchanged semantics: chart units, radius AXIS_RANGE, y upwards.
 */

function InSmith(x, y) {
    return (x * x) + (y * y) <= (AXIS_RANGE * AXIS_RANGE);
}

function InCircleR(x, y, r) {
    return (x * x) + (y * y) <= (r * r);
}

/*
 * Which quadrant of the chart a point sits in, for the matching hint:
 *
 *        3          1 = inside the low-impedance circle
 *      1   2        2 = inside the high-impedance circle
 *        4          3 / 4 = above / below the real axis
 */
function getRegion(x, y) {
    var r = AXIS_RANGE / 2;
    if (InCircleR(x + AXIS_RANGE / 2, y, r)) return 1;
    if (InCircleR(x - AXIS_RANGE / 2, y, r)) return 2;
    return (y >= 0) ? 3 : 4;
}
