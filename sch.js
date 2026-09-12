/*
 * QuickSmith schematic model, and the bridge to the solver.
 * =============================================================================
 *
 * schObj is what the user edits: twelve ladder slots, a load, and the settings
 * around them. It is also the .sch file format, so its shape is fixed.
 *
 * resultsObj holds the answers for the UI to read. The numbers themselves come
 * from QSEngine.solve() in engine.js, which knows nothing about either object.
 *
 * The original of this file carried the ladder recursion and a second,
 * separate node-voltage walk for insertion loss, both transcribed from the
 * 1993 Visual Basic. Those notes are kept in docs/original-vb-notes.md.
 */

var C = 299800000; // speed of light - 299792458 m/s

var schObj = {
                "ver":5.0,  //if you change this then change the file load verify function- this is used as a check - need a better way to do this
                "VF": 1,  // velocity factor
                "Z0": 50.0, // characteristic impedance
                "TDF": 100, // Transmission design frequency
                "LU": "Inches",  // Inches, MilliMeters, Meters, Degrees, Wave Lengths
                "SS": 1,   // Start Sweep
                "ST": 100, // Stop Sweep
                "SST": 1,  // Sweep Step
                "SE": "Frequency", // Sweep Element[ Frequency, Element 2, Element 3, Element 4... Element 12]
                "termination": "Single",  //  Single/Multiple is the load single or multiple terminated
                "gamData":    // gamma Data in case the load has multiple values
                          {
                            "label": "",
                            "color" : "",  // maroon color default
                            "dataX" : [],
                            "dataM" : [],
                            "dataQ" : []
                          },

                "ELEMENT": [     // type W,G,RX,R,X,C,L,T,O,S,SLC,PLC,SRC,PRC
                    // step / step2 are the spin button increments for the two value
                    // boxes. They live here so that saving a session or a .sch file
                    // carries them, which it never used to: they were only ever on
                    // the DOM input and were lost on every load.
                    { "index": 0, "type": "f", "value1": 100.00,"value2": 0,"tune": 1, "step": 0.01, "step2": 0.01 }, // uses item 0 for frequency
                    { "index": 1, "type": "rx", "value1": 50, "value2": 0,"tune": 1, "step": 0.1, "step2": 0.01 },  // the load
                    { "index": 2, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, "step": 0.01, "step2": 0.01 },
                    { "index": 3, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, "step": 0.01, "step2": 0.01 },
                    { "index": 4, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, "step": 0.01, "step2": 0.01 },
                    { "index": 5, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, "step": 0.01, "step2": 0.01 },
                    { "index": 6, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, "step": 0.01, "step2": 0.01 },
                    { "index": 7, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, "step": 0.01, "step2": 0.01 },
                    { "index": 8, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, "step": 0.01, "step2": 0.01 },
                    { "index": 9, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, "step": 0.01, "step2": 0.01 },
                    { "index": 10, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, "step": 0.01, "step2": 0.01 },
                    { "index": 11, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, "step": 0.01, "step2": 0.01 },
                    { "index": 12, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, "step": 0.01, "step2": 0.01 }
                ]
            };

/*
 * Everything the UI reads. Populated in one go by Zcalsweep1().
 *
 * The per-metric calculate() entries are still here because index.html and
 * the results panel calls them by index; the solve happens once up front, so
 * all but OUTPUT[0] are now no-ops.
 */
var resultsObj = {
    "solution": null,      // the last QSEngine.solve() result, in full
    "OUTPUT":[
        { "ZRout": 0, "unit1": "Ohms", "ZIout": 0, "unit2": "Ohms", "MAGout": 0, "unit3": "Ohms", "ANGout": 0, "unit4": "Degrees", calculate: Zcalsweep1 },
        { "YRout": 0, "unit1": "mS", "YIout": 0, "unit2": "mS", "YMag": 0, "unit3": "Magnitude*1000", "YAng": 0, "unit4": "Degrees", calculate: solved },
        { "GAMRout": 0, "unit1": "", "GAMIout": 0, "unit2": "", "GAMMag": 0, "unit3": "Magnitude", "GAMAng": 0, "unit4": "Degrees", calculate: solved },
        { "VSWR": 0, "unit1": "", calculate: solved },
        { "ReturnLoss": 0, "unit1": "dB", calculate: solved },
        { "InsertionLoss": 0, "unit1": "dB", "S21Mag": 0, "unit3": "dB", "S21Ang": 0, "unit4": "Degrees", calculate: solved },
        { "ReflectionLoss": 0, "unit1": "dB", calculate: solved },
        { "PowerReflectionCoeff": 0, "unit1": "", calculate: solved },
        { "TransmissionLossCoeff": 0, "unit1": "", calculate: solved },
        { "MaximumSWR": 0, "unit1": "", calculate: solved },
        { "MinimumSWR": 0, "unit1": "", calculate: solved }
    ]
};

/* Already answered by the last Zcalsweep1(). */
function solved() { }

/*
 * Solve the current schematic and publish every result.
 *
 * Keeps its old name because index.html calls it from several places.
 */
function currentNetwork() {
    return {
        Z0: schObj.Z0,
        VF: schObj.VF,
        TDF: schObj.TDF,
        LU: schObj.LU,
        termination: schObj.termination,
        gamData: schObj.gamData,
        frequency: schObj.ELEMENT[0].value1,
        elements: schObj.ELEMENT
    };
}

function Zcalsweep1() {
    var r = QSEngine.solve(currentNetwork());

    // The full solution, kept for anything that needs more than the flat
    // OUTPUT fields - the chart draws its per-element arcs from r.nodes.
    resultsObj.solution = r;

    var O = resultsObj.OUTPUT;
    O[0].ZRout = r.Zin.re;   O[0].ZIout = r.Zin.im;
    O[0].MAGout = r.Zin.mag; O[0].ANGout = r.Zin.ang;

    O[1].YRout = r.Yin.re;   O[1].YIout = r.Yin.im;
    O[1].YMag = r.Yin.mag;   O[1].YAng = r.Yin.ang;

    O[2].GAMRout = r.gamma.re;  O[2].GAMIout = r.gamma.im;
    O[2].GAMMag = r.gamma.mag;  O[2].GAMAng = r.gamma.ang;

    O[3].VSWR = r.vswr;
    O[4].ReturnLoss = r.returnLoss;

    O[5].InsertionLoss = r.insertionLoss;
    O[5].S21Mag = r.s21.db;
    O[5].S21Ang = r.s21.ang;

    O[6].ReflectionLoss = r.reflectionLoss;
    O[7].PowerReflectionCoeff = r.powerReflectionCoeff;
    O[8].TransmissionLossCoeff = r.transmissionLossCoeff;
    O[9].MaximumSWR = r.maxSWR;
    O[10].MinimumSWR = r.minSWR;

    publishLoad(r);
    return r;
}

/*
 * With a multiple termination the load is interpolated from measured data and
 * moves with frequency, so the load boxes have to show what it resolved to: an
 * "rx" load shows R and X, a "g" load shows magnitude and angle.
 *
 * With a single termination the boxes already hold what the user typed, and
 * overwriting them would round-trip their value through the solver for no
 * reason.
 */
function publishLoad(r) {
    if (schObj.termination !== "Multiple") return;
    var load = schObj.ELEMENT[1];
    if (load.type === "g") {
        load.value1 = r.loadGamma.mag;
        load.value2 = r.loadGamma.ang;
    } else {
        load.value1 = r.load.re;
        load.value2 = r.load.im;
    }
}

/* ------------------------------------------------------- display helpers */

/* Global because index.html and the test harness both call it. */
function equivalentCircuit(ZinR, ZinI, freq, parallel) {
    return QSEngine.equivalent(ZinR, ZinI, freq, parallel);
}

function formatEquiv(label, joiner, eq) {
    var msg = "R = " + Number(eq.R).toFixed(3) + " Ohms";
    if (eq.type !== "") {
        var units = (eq.type === "C") ? " pF" : " nH";
        var amount = isFinite(eq.value) ? Number(eq.value).toFixed(3) : "∞";
        msg += joiner + eq.type + " = " + amount + units;
    }
    return label + ": " + msg;
}

function seriesEquiv() {
    return formatEquiv("Series Equivalent", " in Series with ",
        equivalentCircuit(resultsObj.OUTPUT[0].ZRout, resultsObj.OUTPUT[0].ZIout,
                          schObj.ELEMENT[0].value1, false));
}

function parallelEquiv() {
    return formatEquiv("Parallel Equivalent", " in Parallel with ",
        equivalentCircuit(resultsObj.OUTPUT[0].ZRout, resultsObj.OUTPUT[0].ZIout,
                          schObj.ELEMENT[0].value1, true));
}

function myInterpolate(X, xa, ya) {
    return QSEngine.interpolate(X, xa, ya);
}
