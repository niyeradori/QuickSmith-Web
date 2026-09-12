/*
 * Named designs, kept in the browser.
 * =============================================================================
 *
 * Save File writes a .sch you have to find again; Save Session holds exactly
 * one design and the next save overwrites it. This is the in-between: a short
 * shelf of designs kept under names you chose, in this browser, on this
 * machine. No account, no upload.
 *
 * A slot holds the same JSON a .sch file does, so the two formats stay one
 * format: anything saved here can be written out as a file and back.
 *
 * Saving under a name that is already on the shelf replaces it and moves it to
 * the top, so the list reads newest first and re-saving your work in progress
 * does not leave a trail of near-identical copies.
 *
 * No DOM: it reads and writes localStorage and hands back plain objects.
 */

var QSDesigns = (function () {
    "use strict";

    var KEY = "qsDesigns";
    var LIMIT = 30;         // a shelf, not an archive

    function store() {
        try { return (typeof localStorage !== "undefined") ? localStorage : null; }
        catch (e) { return null; }      // private mode can throw on access
    }

    /* Everything on the shelf, newest first. Anything unreadable reads empty
       rather than taking the panel down with it. */
    function list() {
        var s = store();
        if (!s) return [];
        try {
            var all = JSON.parse(s.getItem(KEY) || "[]");
            return Array.isArray(all) ? all : [];
        } catch (e) { return []; }
    }

    function find(name) {
        var all = list();
        for (var i = 0; i < all.length; i++) {
            if (all[i].name === name) return all[i];
        }
        return null;
    }

    /* Returns false if the browser would not take it - out of room, or storage
       switched off - so the caller can say so instead of silently losing it. */
    function save(name, sch) {
        var s = store();
        name = String(name || "").trim();
        if (!s || !name || !sch) return false;

        var all = list().filter(function (d) { return d.name !== name; });
        all.unshift({ name: name, saved: new Date().toISOString(), sch: sch });
        all.length = Math.min(all.length, LIMIT);
        try {
            s.setItem(KEY, JSON.stringify(all));
            return true;
        } catch (e) { return false; }
    }

    function remove(name) {
        var s = store();
        if (!s) return false;
        var all = list().filter(function (d) { return d.name !== name; });
        try {
            s.setItem(KEY, JSON.stringify(all));
            return true;
        } catch (e) { return false; }
    }

    return { list: list, find: find, save: save, remove: remove,
             KEY: KEY, LIMIT: LIMIT };
})();

if (typeof module !== "undefined" && module.exports) module.exports = QSDesigns;
