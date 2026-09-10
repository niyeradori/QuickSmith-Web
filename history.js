/*
 * Undo and redo.
 * =============================================================================
 *
 * A QuickSmith design is entirely described by schObj, and every edit in the
 * program ends up at Zcalsweep(). So history does not have to know what an
 * edit was - it just takes a snapshot of the design after each one and keeps
 * the run of them.
 *
 * Snapshots are compared as strings. That is what makes this cheap to call
 * from the one place: if the design did not actually change, record() returns
 * false and nothing is stored. It also means undo needs no special handling,
 * because re-applying a state and recording it again is a no-op by definition.
 *
 * hold() is for a gesture that would otherwise fill the stack. Dragging a node
 * on the chart runs the solver on every pointer move; the drag holds recording
 * for its duration and records once when the pointer comes up, so one drag is
 * one undo.
 *
 * No DOM, no dependencies: it stores strings and hands them back.
 */

var QSHistory = (function () {
    "use strict";

    var LIMIT = 60;     // designs are small, but a long tuning session is not

    function create(limit) {
        var states = [];
        var at = -1;            // index of the state now on screen
        var held = false;
        limit = limit || LIMIT;

        return {
            /* Store a state, unless it is the one we already have. */
            record: function (state) {
                if (held) return false;
                if (at >= 0 && states[at] === state) return false;
                states.length = at + 1;         // a new edit discards the redos
                states.push(state);
                if (states.length > limit) states.shift();
                at = states.length - 1;
                return true;
            },

            hold: function () { held = true; },
            release: function () { held = false; },

            canUndo: function () { return at > 0; },
            canRedo: function () { return at >= 0 && at < states.length - 1; },

            /* Both return the state to apply, or null when there is none. */
            undo: function () { return this.canUndo() ? states[--at] : null; },
            redo: function () { return this.canRedo() ? states[++at] : null; },

            /* Start again from one state, throwing away everything before it. */
            reset: function (state) {
                states = (state === undefined) ? [] : [state];
                at = states.length - 1;
                held = false;
            },

            depth: function () { return states.length; },
            position: function () { return at; }
        };
    }

    return { create: create, LIMIT: LIMIT };
})();

if (typeof module !== "undefined" && module.exports) module.exports = QSHistory;
