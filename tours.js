/*
 * Guided examples.
 * =============================================================================
 *
 * The seven worked examples that ship with QuickSmith have always been prose
 * with a picture of the finished chart. These are the same designs, replayable:
 * the network is built one element at a time and each step says what that
 * element does and where it moves you.
 *
 * Data only. The player lives in index.html, because it drives the schematic;
 * everything here is a plain object, so the numbers can be checked headlessly
 * against the solver - which is the point, since the narration makes claims
 * about them.
 *
 * A step is one element. Slot numbers follow the ladder: even slots are in
 * series, odd slots are in shunt.
 */
var QSTours = (function () {
    "use strict";

    var TOURS = [
        {
            id: "l-network",
            title: "An L-network",
            source: "Example 2",
            Z0: 50, frequency: 100, LU: "Inches",
            load: { type: "rx", value1: 500, value2: 0 },
            opening: "A pure 500 ohm load at 100 MHz. On the chart it sits out " +
                "on the real axis to the right of centre, and the job is to walk " +
                "it in to the middle, which is 50 ohms. Two elements will do it.",
            steps: [
                { slot: 3, type: "c", value1: 9.5,
                  say: "A capacitor across the load moves along a circle of " +
                       "constant conductance. Grow it until that circle crosses " +
                       "the constant resistance circle through the centre. The " +
                       "real part of Zin is 50 ohms now, with reactance left over." },
                { slot: 4, type: "l", value1: 240,
                  say: "A series inductor moves along that constant resistance " +
                       "circle, and resistance is what a series part cannot " +
                       "change. Grow it until the leftover reactance is cancelled " +
                       "and you arrive at the centre." }
            ],
            closing: "VSWR 1.01. The order was forced: the load's resistance is " +
                "above 50 ohms, so the shunt element had to come first. Try the " +
                "other way round and no value of either part reaches the centre."
        },
        {
            id: "line-and-stub",
            title: "A line and a stub",
            source: "Example 3",
            Z0: 50, frequency: 1000, LU: "MilliMeters",
            load: { type: "rx", value1: 10, value2: -15 },
            opening: "10 - j15 ohms at 1 GHz, matched with no lumped parts at " +
                "all. Lengths are in millimetres, which is set in Settings.",
            steps: [
                { slot: 2, type: "t", value1: 30, value2: 56.4,
                  say: "A length of line rotates the impedance about the centre " +
                       "of the chart. This one is 30 ohms, below the load's own, " +
                       "and 56.4 mm of it brings you onto the circle of constant " +
                       "conductance that passes through the centre. Switch on the " +
                       "admittance grid and you can see that circle." },
                { slot: 3, type: "o", value1: 30, value2: 38.5,
                  say: "An open stub in shunt adds pure susceptance, which moves " +
                       "along the constant conductance circle you just reached. " +
                       "38.5 mm of it lands on the middle." }
            ],
            closing: "VSWR 1.006, from two pieces of 30 ohm line. At a gigahertz " +
                "that is often easier to build than a capacitor."
        },
        {
            id: "an721-input",
            title: "AN721: a transistor input",
            source: "Example 6",
            Z0: 50, frequency: 175, LU: "Inches",
            load: { type: "rx", value1: 1.94, value2: 1.1 },
            opening: "A 2N5642 at 175 MHz looks like 1.94 + j1.1 ohms, which is " +
                "very nearly a short: hard against the left edge of the chart. " +
                "Motorola's AN721 matches it to 50 ohms and asks for a loaded Q " +
                "no higher than 10, which is what stops the answer being a " +
                "two-element network.",
            steps: [
                { slot: 2, type: "l", value1: 16.8,
                  say: "A series inductor climbs the constant resistance circle " +
                       "through the load. Watch the loaded Q in the readout as it " +
                       "goes: this one step takes it to about 10, and that is the " +
                       "whole budget." },
                { slot: 3, type: "c", value1: 38.12,
                  say: "A shunt capacitor now swings across to a resistance near " +
                       "50 ohms. This is the step that does the transforming; the " +
                       "inductor before it only set up the angle." },
                { slot: 4, type: "c", value1: 10.52,
                  say: "A series capacitor removes what reactance is left and " +
                       "drops onto the centre." }
            ],
            closing: "VSWR 1.0024, and a loaded Q of 10.09 against a budget of " +
                "10. The Q circle in Overlays is set to 10, so you can see the " +
                "path just touching it."
        },
        {
            id: "an721-output",
            title: "AN721: the same transistor's output",
            source: "Example 6, output match",
            Z0: 50, frequency: 175, LU: "Inches",
            load: { type: "rx", value1: 10.6, value2: -7.3 },
            opening: "The output side of the same amplifier: 10.6 - j7.3 ohms at " +
                "175 MHz. Less extreme than the input, so two elements are enough.",
            steps: [
                { slot: 2, type: "l", value1: 25.3,
                  say: "A series inductor, again along the constant resistance " +
                       "circle, up to where the constant conductance circle " +
                       "through the centre crosses it." },
                { slot: 3, type: "c", value1: 35,
                  say: "A shunt capacitor along that conductance circle, into the " +
                       "middle. This is the plain L-network of the first tour, " +
                       "with a load that has reactance of its own." }
            ],
            closing: "VSWR 1.006. Compare the path with the input match: three " +
                "elements there, two here, and the difference is entirely how far " +
                "1.94 ohms is from 50."
        },
        {
            id: "chebyshev",
            title: "A low-pass filter, and what Q costs",
            source: "Example 5",
            Z0: 50, frequency: 27, LU: "Inches",
            load: { type: "rx", value1: 50, value2: 0 },
            opening: "Not a matching problem. This is a low-pass filter with a " +
                "28 MHz corner, built and shipped in a commercial product, and " +
                "the point of it is component Q. Each part below carries a real " +
                "Q, so the loss you see is the loss you would measure.",
            steps: [
                { slot: 3, type: "c", value1: 220, q: 800,
                  say: "First shunt capacitor, 220 pF at a Q of 800. A good " +
                       "ceramic part." },
                { slot: 4, type: "l", value1: 360, q: 100,
                  say: "A 360 nH series inductor at a Q of 100. Inductors are " +
                       "where the loss lives, and this is where the insertion " +
                       "loss in the readout starts to move." },
                { slot: 5, type: "c", value1: 220, q: 800,
                  say: "The second shunt capacitor, matching the first." },
                { slot: 6, type: "l", value1: 360, q: 200,
                  say: "And the second inductor. The ladder is symmetric, which " +
                       "is what makes it a filter rather than a matching network." }
            ],
            closing: "Set the Response sweep to 1-120 MHz to see the shape: about " +
                "0.75 dB through the passband and 53 dB down at 100 MHz. The " +
                "original write-up claims 60 dB there; the network as shipped " +
                "gives 53, so trust the sweep rather than the prose."
        }
    ];

    /* The ladder as it stands after `step` elements, step 0 being the load
       alone. Everything else is a wire, so a tour never leaves anything behind
       from whatever was on the bench before. */
    function elementsAt(tour, step) {
        var e = [];
        e[0] = { index: 0, type: "f", value1: tour.frequency, value2: 0, tune: 1 };
        e[1] = { index: 1, type: tour.load.type, value1: tour.load.value1,
                 value2: tour.load.value2, q: 1000000, tune: 1 };
        for (var i = 2; i <= 12; i++) {
            e[i] = { index: i, type: "w", value1: 0, value2: 0, q: 1000000, tune: 1 };
        }
        for (var k = 0; k < step && k < tour.steps.length; k++) {
            var s = tour.steps[k];
            e[s.slot] = { index: s.slot, type: s.type, value1: s.value1,
                          value2: s.value2 || 0, q: s.q || 1000000, tune: 1 };
        }
        return e;
    }

    function byId(id) {
        for (var i = 0; i < TOURS.length; i++) if (TOURS[i].id === id) return TOURS[i];
        return null;
    }

    return { all: TOURS, byId: byId, elementsAt: elementsAt };
})();

if (typeof module !== "undefined" && module.exports) module.exports = QSTours;
