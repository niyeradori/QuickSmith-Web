/*
 * QuickSmith dialogs, menus and number steppers.
 * =============================================================================
 *
 * Replaces four libraries that between them weighed about 180 KB: bootstrap
 * dialog, bootbox, qTip2 and jquery.contextMenu. What they were actually asked
 * to do is a message box, a value prompt, a hint on hover, and a right click.
 *
 * Built on the native <dialog> element, so Escape closes, focus is trapped,
 * and the backdrop comes for free.
 *
 * No jQuery. Colour follows the chart's palette variables where they exist and
 * falls back to sensible light values where they do not.
 */

var QSUI = (function () {
    "use strict";

    var CSS = [
        ".qs-dialog{border:0;border-radius:12px;padding:0;max-width:min(92vw,560px);",
        "box-shadow:0 12px 48px -12px rgba(0,0,0,.45);color:#14181f;background:#fff;",
        "font:14px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif}",
        ".qs-dialog.qs-small{max-width:min(92vw,380px)}",
        ".qs-dialog::backdrop{background:rgba(12,16,22,.45)}",
        ".qs-dialog-head{display:flex;align-items:center;gap:12px;padding:14px 18px;",
        "border-bottom:1px solid #e5e8ee}",
        ".qs-dialog-title{font-weight:600;font-size:15px;flex:1;margin:0}",
        ".qs-dialog-x{border:0;background:none;font-size:20px;line-height:1;cursor:pointer;",
        "color:#8b93a3;padding:0 2px}",
        ".qs-dialog-x:hover{color:#14181f}",
        ".qs-dialog-body{padding:16px 18px;max-height:65vh;overflow:auto}",
        // messages arrive with newlines in them, so honour them
        ".qs-dialog-body.qs-text{white-space:pre-wrap;font-variant-numeric:tabular-nums}",
        ".qs-dialog-foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;",
        "border-top:1px solid #e5e8ee}",
        ".qs-dialog button.qs-btn{font:inherit;padding:7px 16px;border-radius:7px;cursor:pointer;",
        "border:1px solid #ccd2dc;background:#f6f7f9;color:#14181f}",
        ".qs-dialog button.qs-btn:hover{background:#eceff4}",
        ".qs-dialog button.qs-btn.qs-primary{background:#1f5fbf;border-color:#1f5fbf;color:#fff}",
        ".qs-dialog button.qs-btn.qs-primary:hover{background:#1b54a8}",
        ".qs-dialog button:focus-visible,.qs-dialog input:focus-visible{outline:2px solid #1f5fbf;",
        "outline-offset:2px}",
        ".qs-dialog input[type=text]{font:inherit;padding:6px 9px;border:1px solid #ccd2dc;",
        "border-radius:6px;width:140px}",
        ".qs-dialog label{display:block;margin-bottom:10px;white-space:pre-line}",
        // Bootstrap's label rule outranks the browser's [hidden], so say it louder
        ".qs-dialog [hidden]{display:none!important}",

        ".qs-menu{position:fixed;z-index:2000;background:#fff;border:1px solid #d9dee7;",
        "border-radius:8px;box-shadow:0 8px 28px -8px rgba(0,0,0,.35);padding:4px;",
        "font:14px system-ui,-apple-system,sans-serif;min-width:150px}",
        ".qs-menu button{display:block;width:100%;text-align:left;border:0;background:none;",
        "font:inherit;padding:7px 12px;border-radius:5px;cursor:pointer;color:#14181f}",
        ".qs-menu button:hover{background:#eef2f9}",
        ".qs-menu button[disabled]{color:#a8afbb;cursor:default;background:none}",

        ".qs-spin{display:flex;width:100%;align-items:stretch}",
        ".qs-spin>input{flex:1 1 auto;min-width:0;border-radius:0;text-align:left}",
        ".qs-spin>button{flex:0 0 auto;width:26px;padding:0;cursor:pointer;",
        "border:1px solid #ccc;background:#f5f5f5;color:#333;",
        "font:14px/1 system-ui,-apple-system,sans-serif;",
        "-webkit-user-select:none;user-select:none;touch-action:manipulation}",
        ".qs-spin>button:first-child{border-radius:4px 0 0 4px;border-right:0}",
        ".qs-spin>button:last-child{border-radius:0 4px 4px 0;border-left:0}",
        ".qs-spin>button:hover{background:#e6e6e6}",
        ".qs-spin>button:active{background:#d4d4d4}",
        ".qs-spin>button:focus-visible{outline:2px solid #1f5fbf;outline-offset:-2px}"
    ].join("");

    function installStyles() {
        if (document.getElementById("qs-ui-css")) return;
        var s = document.createElement("style");
        s.id = "qs-ui-css";
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    /* ---------------------------------------------------------------- dialog
     *
     * open({
     *   title,                       heading text
     *   body,                        a string (HTML, newlines preserved) or a Node
     *   buttons: [{label, primary, action(dialog)}],   action may return false to keep it open
     *   small,                       narrower box
     *   onShown(dialog)
     * })
     */
    function open(opts) {
        installStyles();
        var dlg = document.createElement("dialog");
        dlg.className = "qs-dialog" + (opts.small ? " qs-small" : "");

        var head = el("div", "qs-dialog-head", dlg);
        var h = el("h2", "qs-dialog-title", head);
        h.textContent = opts.title || "QuickSmith";
        var x = el("button", "qs-dialog-x", head);
        x.type = "button";
        x.innerHTML = "&times;";
        x.setAttribute("aria-label", "Close");
        x.addEventListener("click", function () { close(dlg); });

        var body = el("div", "qs-dialog-body", dlg);
        if (typeof opts.body === "string") {
            body.className += " qs-text";
            body.innerHTML = opts.body;
        } else if (opts.body) {
            body.appendChild(opts.body);
        }

        var foot = el("div", "qs-dialog-foot", dlg);
        (opts.buttons || [{ label: "Close" }]).forEach(function (spec) {
            var b = el("button", "qs-btn" + (spec.primary ? " qs-primary" : ""), foot);
            b.type = "button";
            b.textContent = spec.label;
            b.addEventListener("click", function () {
                if (spec.action && spec.action(dlg) === false) return;
                close(dlg);
            });
        });

        document.body.appendChild(dlg);
        dlg.addEventListener("close", function () {
            if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
        });
        dlg.showModal();
        if (opts.onShown) opts.onShown(dlg);
        return dlg;
    }

    function close(dlg) {
        if (dlg && dlg.open) dlg.close();
    }

    function el(tag, cls, parent) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (parent) parent.appendChild(n);
        return n;
    }

    /* A plain message box. */
    function message(title, text, small) {
        return open({ title: title, body: text, small: small !== false });
    }

    /*
     * Ask for one value. onOK is called with the raw string only when the user
     * confirms; Escape and Cancel do nothing.
     */
    function promptValue(opts) {
        var wrap = document.createElement("div");
        var label = el("label", null, wrap);
        label.textContent = opts.label || "";
        var input = document.createElement("input");
        input.type = "text";
        input.value = (opts.value === undefined || opts.value === null) ? "" : String(opts.value);
        label.appendChild(document.createElement("br"));
        label.appendChild(input);

        function accept(dlg) {
            close(dlg);
            if (opts.onOK) opts.onOK(input.value);
        }

        var dlg = open({
            title: opts.title || "QuickSmith",
            body: wrap,
            small: true,
            onShown: function () { input.focus(); input.select(); },
            buttons: [
                { label: "Cancel" },
                { label: "OK", primary: true, action: function (d) { accept(d); return false; } }
            ]
        });

        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") { e.preventDefault(); accept(dlg); }
        });
        return dlg;
    }

    /* ----------------------------------------------------------- context menu
     * items: [{label, disabled, action()}]
     */
    var openMenu = null;

    function menu(x, y, items) {
        installStyles();
        dismissMenu();
        var m = el("div", "qs-menu", document.body);
        items.forEach(function (item) {
            var b = el("button", null, m);
            b.type = "button";
            b.textContent = item.label;
            if (item.disabled) b.disabled = true;
            else b.addEventListener("click", function () {
                dismissMenu();
                if (item.action) item.action();
            });
        });
        // keep it on screen
        var box = m.getBoundingClientRect();
        m.style.left = Math.min(x, window.innerWidth - box.width - 8) + "px";
        m.style.top = Math.min(y, window.innerHeight - box.height - 8) + "px";
        openMenu = m;

        setTimeout(function () {
            document.addEventListener("pointerdown", dismissOutside, true);
            document.addEventListener("keydown", escapeMenu);
        }, 0);
        return m;
    }

    /* A press inside the menu is a choice, not a dismissal. Closing on it would
       take the button out of the document before its click could land. */
    function dismissOutside(e) {
        if (openMenu && openMenu.contains(e.target)) return;
        dismissMenu();
    }

    function dismissMenu() {
        if (!openMenu) return;
        if (openMenu.parentNode) openMenu.parentNode.removeChild(openMenu);
        openMenu = null;
        document.removeEventListener("pointerdown", dismissOutside, true);
        document.removeEventListener("keydown", escapeMenu);
    }

    function escapeMenu(e) {
        if (e.key === "Escape") dismissMenu();
    }

    /* ================================================================ spinner
     *
     * Replaces Bootstrap TouchSpin. What QuickSmith uses of it: two buttons, a
     * step size that the user can change, hold-to-repeat with some
     * acceleration, clamping, and - from the local fork of the library - a way
     * to ask which way the last press went, which the amplifier page uses to
     * walk a gain circle round.
     *
     * The mouse wheel is deliberately not wired up. TouchSpin bound it, so
     * scrolling the page with the pointer over a value box silently retuned a
     * component.
     */
    var REPEAT_DELAY = 400;      // before a held button starts repeating
    var REPEAT_EVERY = 60;
    var BOOST_AFTER = 20;        // repeats before the step grows

    function attach(input, opts) {
        if (!input || input.qsSpin) return input && input.qsSpin;
        installStyles();
        opts = opts || {};

        var state = {
            input: input,
            min: opts.min === undefined ? -Infinity : Number(opts.min),
            max: opts.max === undefined ? Infinity : Number(opts.max),
            step: Number(opts.step === undefined ? 1 : opts.step),
            decimals: opts.decimals === undefined ? 2 : opts.decimals,
            boost: opts.boost === undefined ? 10 : opts.boost,
            up: true,
            timer: null
        };
        input.qsSpin = state;

        var wrap = document.createElement("div");
        wrap.className = "qs-spin";
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(button(state, -1, "\u2212"));
        wrap.appendChild(input);
        wrap.appendChild(button(state, 1, "+"));

        input.addEventListener("keydown", function (e) {
            if (e.key === "ArrowUp") { e.preventDefault(); nudge(state, 1, 1); }
            else if (e.key === "ArrowDown") { e.preventDefault(); nudge(state, -1, 1); }
        });
        return state;
    }

    function button(state, dir, glyph) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = glyph;
        b.tabIndex = -1;                 // the input is the focus stop, not its arrows
        b.setAttribute("aria-label", dir > 0 ? "Increase" : "Decrease");

        b.addEventListener("pointerdown", function (e) {
            e.preventDefault();
            // Capture so a press that drifts off the button still repeats until
            // release. Synthetic events have no live pointer to capture.
            try { b.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
            nudge(state, dir, 1);
            var repeats = 0;
            state.timer = setTimeout(function tick() {
                repeats++;
                nudge(state, dir, repeats > BOOST_AFTER ? state.boost : 1);
                state.timer = setTimeout(tick, REPEAT_EVERY);
            }, REPEAT_DELAY);
        });

        ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
            b.addEventListener(ev, function () { stop(state); });
        });
        return b;
    }

    function stop(state) {
        if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    }

    function nudge(state, dir, multiplier) {
        var current = parseFloat(state.input.value);
        if (!isFinite(current)) current = 0;
        var next = current + dir * state.step * multiplier;
        if (next < state.min) next = state.min;
        if (next > state.max) next = state.max;

        state.up = dir > 0;
        state.input.value = next.toFixed(state.decimals);
        state.input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    /* The page asks for these by element, the way it used to ask TouchSpin. */
    function getStep(input) {
        return input && input.qsSpin ? input.qsSpin.step : 1;
    }

    function setStep(input, step) {
        if (input && input.qsSpin && isFinite(Number(step))) {
            input.qsSpin.step = Number(step);
        }
    }

    /* True if the last press was the up button. */
    function wasUp(input) {
        return input && input.qsSpin ? input.qsSpin.up : true;
    }

    function attachAll(selector, opts) {
        var list = document.querySelectorAll(selector);
        for (var i = 0; i < list.length; i++) attach(list[i], opts);
        return list.length;
    }

    /* ================================================================== nav
     *
     * The menu bar's dropdowns and its small-screen toggle. These were the only
     * two things Bootstrap's JavaScript did, and it needed jQuery to do them.
     * The class names stay the same, so Bootstrap's stylesheet still dresses
     * them until that goes too.
     */
    function initNav() {
        document.addEventListener("click", function (e) {
            var collapse = e.target.closest("[data-toggle='collapse']");
            if (collapse) {
                e.preventDefault();
                var panel = document.querySelector(collapse.getAttribute("data-target"));
                if (panel) panel.classList.toggle("in");
                return;
            }

            var toggle = e.target.closest("[data-toggle='dropdown']");
            var keep = toggle ? toggle.parentNode : null;
            closeDropdowns(keep);
            if (toggle) {
                e.preventDefault();
                toggle.parentNode.classList.toggle("open");
            }
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeDropdowns(null);
        });
    }

    function closeDropdowns(keep) {
        var open = document.querySelectorAll(".dropdown.open");
        for (var i = 0; i < open.length; i++) {
            if (open[i] !== keep) open[i].classList.remove("open");
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initNav);
    } else {
        initNav();
    }

    return {
        open: open,
        close: close,
        initNav: initNav,
        message: message,
        promptValue: promptValue,
        menu: menu,
        dismissMenu: dismissMenu,
        attach: attach,
        attachAll: attachAll,
        getStep: getStep,
        setStep: setStep,
        wasUp: wasUp
    };
})();
