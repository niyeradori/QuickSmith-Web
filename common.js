
// the main data structure in a centralized place so that all pages can access it.

function copy_schObj(schObj1) {
 var ELEMENT_SRC = schObj1.ELEMENT;
 var ELEMENT_DEST = schObj.ELEMENT;
 for (var key in schObj1) 
    {
        if (schObj1.hasOwnProperty(key)) 
        {
            if(key !== "ELEMENT") 
            {
                schObj[key] = schObj1[key];
               // console.log(key + " -> " + schObj[key]);
            }
        else
            {
            //    console.log("SCHOBJ ELEMENT" );
            for (var key2 in ELEMENT_SRC) 
                {
                    var item1 = ELEMENT_SRC[key2];
                    var item = ELEMENT_DEST[key2];
                        for (var key3 in item1) 
                        {
                           //   console.log(key3 + " -> " + item1[key3]);
                            item[key3] = item1[key3];
                        }
                }
            }

        }
    }

}


function copy_smithObj(smithObj1) {

 for (var key in smithObj1) 
    {
        if (smithObj1.hasOwnProperty(key)) 
        {
            //if(key !== "sweepDatasets" || key !== "plotDatasets") 
            {
                // "view" is the live QSChart mount: DOM, not data. Never copy
                // or restore it. ("ctx" is the name it had before Phase 3, and
                // may still be present in an old saved session.)
                if(key !== "ctx" && key !== "view") {
                smithObj[key] = smithObj1[key];
                }
            }
        //     else if (key == "sweepDatasets")
        //     {
        //         // console.log("SMITHOBJ sweepDatasets" );
        //         var data1 = smithObj1.sweepDatasets;
        //         var data = smithObj.sweepDatasets;
        //         for (var key2 in data1) 
        //             {
        //             //  console.log(key2 + " -> " + data1[key2]);
        //                 var item1 = data1[key2];
        //                 var item = data[key2];
        //                 for (var key3 in item1) 
        //                     {
        //                         console.log(key3 + " -> " + item1[key3]);
        //                         item[key3] = item1[key3];
        //                     }
        //             }
        //     }
        //    else if (key == "plotDatasets")
        //     {
        //         // console.log("SMITHOBJ sweepDatasets" );
        //         var data1A = smithObj1.plotDatasets;
        //         var dataA = smithObj.plotDatasets;
        //         for (var key4 in data1A) 
        //             {
        //             //  console.log(key2 + " -> " + data1[key2]);
        //                  var item1A = data1A[key4];
        //                  var itemA = dataA[key4];
        //                 for (var key5 in item1A) 
        //                     {
        //                         console.log(key5 + " -> " + item1A[key5]);
        //                         itemA[key5] = item1A[key5];
        //                     }
        //             }
        //     }

        }
    }

}


function AddIm(a, B, C, D) {
    var ret = Number(B) + Number(D);
    return ret;
    }

function AddRe(a, B, C, D) {
    var ret = Number(a) + Number(C);
    return ret;
    }

// function AmpGTOZI(R, Q, Z00) {
// var tmp; var ret
// tmp = (2 * R * Sin(pi * Q / 180)) / (1 + (R * R) - 2 * R * Cos(pi * Q / 180))
// ret = tmp * Z00;
// return ret;
// }

// function AmpGTOZR(R, Q, Z00) As Single
// var tmp; var ret;
// tmp = (1 - (R * R)) / (1 + (R * R) - (2 * R * Cos(Q * pi / 180)))
// ret = tmp * Z00;
// return ret;
// }

function GToZI(R, Q ){
    var Z0 = schObj.Z0;
    var Z1i = (2 * R * Math.sin(Math.PI * Q / 180)) / (1 + (R * R) - 2 * R * Math.cos(Math.PI * Q / 180));
    return( Z1i * Z0);
}

function GToZR(R , Q ){
    var Z0 = schObj.Z0;
    var Z1r = (1 - (R * R)) / (1 + (R * R) - (2 * R * Math.cos(Q * Math.PI / 180)));
    return( Z1r * Z0);
}

function GToZIZ(R, Q, Z0 ){
   // var Z0 = schObj.Z0;
    var Z1i = (2 * R * Math.sin(Math.PI * Q / 180)) / (1 + (R * R) - 2 * R * Math.cos(Math.PI * Q / 180));
    return( Z1i * Z0);
}

function GToZRZ(R , Q, Z0 ){
    //var Z0 = schObj.Z0;
    var Z1r = (1 - (R * R)) / (1 + (R * R) - (2 * R * Math.cos(Q * Math.PI / 180)));
    return( Z1r * Z0);
}

function DivIm(a, B, C, D) {
    //(A+ Bj)/(C+ dj)
    var DivIm = ((B * C) - (a * D)) / (C * C + D * D);
    return DivIm;
}

 function DivRe(a, B, C, D) {
    // '(A+ Bj)/(C+ dj)
    var DivRe = ((a * C) + (B * D)) / (C * C + D* D);
    return DivRe;
}

function MulIm(a, B, C, D) {
    // (A+Bj)* (C+Dj)
    var MulIm = (a * D) + (B * C);
    return MulIm;
}

function MulRe(a, B, C, D) {
    // (A+Bj)* (C+Dj)
    var MulRe = (a * C) - (B * D);
    return MulRe;
}

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function isEven(n) {
    return n == parseFloat(n) ? (n % 2)===0 : void 0;
}

String.prototype.replaceAt = function (index, replacement) {
    return this.substr(0, index) + replacement + this.substr(index + replacement.length);
};

function getUnits(elementType) {
    var units = "None";
    switch (elementType) {
        case "g":
            units = "Magnitude/Degrees";
            break;
        case "r":
        case "x":
            units = "Ohms";
            break;
        case "c":
            units = "pF";
            break;
        case "l":
            units = "nH";
            break;
        case "t":
        case "o":
        case "s":
            units = "Inches/MM/Deg./Wave Lengths";
            break;
        case "w":
            units = "None";
            break;
        case "src":
        case "prc":
            units = "Ohms/pF";
            break;
        case "plc":
        case "slc":
            units = "nF/pF";
            break;
        default:
            units = "None";
    }

    return units;

}

// Formats a dB figure for display. A perfect match has infinite return loss and
// a short-circuit load has infinite insertion loss, so both are real answers
// rather than errors - toFixed() would print "Infinity".
function formatdB(n, decimals){
    var v = Number(n);
    if (decimals === undefined) decimals = 3;
    if (v === Infinity) return "∞";
    if (v === -Infinity) return "-∞";
    if (isNaN(v)) return "--";
    return v.toFixed(decimals);
}

function getSign(n){
    var sign = Math.sign(n);
    var sign_txt;
    if(sign == -1) sign_txt = " - " ;
    else sign_txt = " + "; 
    return sign_txt;
}

function ZtoGammaA(ZXR, ZXI) {
    var ZRN, ZIN, a1, a2, D, SR, SI, SM, SQ;
    var Z0 = schObj.Z0;
    ZRN = (ZXR / Z0);
    ZIN = (ZXI / Z0);
    a1 = ZRN - 1;
    a2 = ZRN + 1;
    D = Math.pow(a2, 2) + Math.pow(ZIN, 2);
    SR = ((ZRN * ZRN) - 1 + (ZIN * ZIN)) / D;
    SI = (2 * ZIN) / D;
    SM = Math.sqrt(SR * SR + SI * SI);
    if(SI == 0) SI = 0.00000000000001;
    if(SR == 0) SR = 0.00000000000001;
    SQ = (Math.atan(SI / SR) * 180 / Math.PI);
    if(SR < 0 && SI > 0)  SQ = 180 + SQ;
    if (SR < 0 && SI < 0) SQ = -180 + SQ;
    if(SM == 0)  SQ = 0;
    return SQ;

}

function ZtoGammaM(ZXR, ZXI) {
    var ZRN, ZIN, a1, a2, D, SR, SI, SM, SQ;
    var Z0 = schObj.Z0;
    ZRN = (ZXR / Z0);
    ZIN = (ZXI / Z0);
    a1 = ZRN - 1;
    a2 = ZRN + 1;
    D = a2 * a2 + ZIN * ZIN;
    SR = (ZRN * ZRN - 1 + ZIN * ZIN) / D;
    SI = (2 * ZIN) / D;
    return Math.sqrt(SR * SR + SI * SI);
}


/* Builds a detached element from an HTML string, for dialog bodies. */
function fragment(html) {
    var host = document.createElement("div");
    host.innerHTML = html;
    return host.firstElementChild || host;
}

/* Delegated keypress for a set of inputs. */
function onKeyPress(selector, handler) {
    document.addEventListener("keypress", function (e) {
        if (e.target && e.target.closest && e.target.closest(selector)) handler(e);
    });
}

/*
 * Press and hold, for opening the step-size dialog on a touch screen.
 *
 * This replaces a set of jQuery plugins that came with the original: longClick,
 * taphold, longclick, isNullOrEmpty, isIPad, isIPhone and isAppleMobile. Only
 * taphold was ever called, and pointer events cover mouse, touch and stylus in
 * one path, so the device sniffing the others existed for is not needed.
 *
 * Delegated from the document, so it covers value boxes that do not exist yet.
 */
function onTapHold(selector, holdMs, callback) {
    document.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse") return;      // the mouse has double-click
        var target = e.target.closest(selector);
        if (!target) return;

        var timer = setTimeout(function () {
            cancel();
            callback(target);
        }, holdMs);

        function cancel() {
            clearTimeout(timer);
            target.removeEventListener("pointerup", cancel);
            target.removeEventListener("pointercancel", cancel);
            target.removeEventListener("pointermove", cancel);
        }
        target.addEventListener("pointerup", cancel);
        target.addEventListener("pointercancel", cancel);
        target.addEventListener("pointermove", cancel);
    });
}

// left: 37, up: 38, right: 39, down: 40,
// spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
var keys = {37: 1, 38: 1, 39: 1, 40: 1};

function preventDefault(e) {
  e = e || window.event;
  if (e.preventDefault)
      e.preventDefault();
  e.returnValue = false;  
}

function preventDefaultForScrollKeys(e) {
    if (keys[e.keyCode]) {
        preventDefault(e);
        return false;
    }
}

function disableScroll() {
 // if (window.addEventListener) // older FF
  //    window.addEventListener('DOMMouseScroll', preventDefault, false);
 // window.onwheel = preventDefault; // modern standard
 // window.onmousewheel = document.onmousewheel = preventDefault; // older browsers, IE
  window.ontouchmove  = preventDefault; // mobile
//  document.onkeydown  = preventDefaultForScrollKeys;
}

function enableScroll() {
    //if (window.removeEventListener)
    //    window.removeEventListener('DOMMouseScroll', preventDefault, false);
 //   window.onmousewheel = document.onmousewheel = null; 
   // window.onwheel = null; 
    window.ontouchmove = null;  
  //  document.onkeydown = null;  
}

/*
 * Message boxes and the step-size prompt. These names are called from all
 * three pages; QSUI in ui.js does the work now that bootstrap-dialog and
 * bootbox are gone.
 */
function ShowMessage(title, msg) {
    QSUI.open({ title: title, body: msg });
}

function ShowMessage_sm(title, msg) {
    QSUI.open({ title: title, body: msg, small: true });
}

function updateStepSize_prompt(current_val, element) {
    QSUI.promptValue({
        title: "Step Size",
        label: "How much each press of the arrows changes the value:",
        value: current_val,
        onOK: function (result) {
            if (isNumeric(result)) QSUI.setStep(element, result);
        }
    });
}

/* Interpolation and phase unwrapping now live in engine.js, so that the solver
   has no dependency on this file. Kept here as a name index.html still calls. */
function phase_unwrap(ys) {
    return QSEngine.unwrapPhase(ys);
}

// var saveJSONtoFile = (function () {
//     var a = document.createElement("a");
//     document.body.appendChild(a);
//     a.style = "display: none";
//     return function (data, fileName) {
//         var json = JSON.stringify(data),
//             blob = new Blob([json], {type: "octet/stream"}),
//             url = window.URL.createObjectURL(blob);
//         a.href = url;
//         a.download = fileName;
//         a.click();
//         window.URL.revokeObjectURL(url);
//     };
// }());
// for Safari compatibility
// Safari 6.1+

// Blobs may be opened instead of saved sometimes—you may have to direct your Safari users to 
// manually press ⌘+S to save the file in "Page Source" Format after it is opened. Using the application/octet-stream 
// MIME type to force downloads can cause issues in Safari. 

function saveJSONtoFile(data,fileName){
   //var FileSaver = require('file-saver');
    var json = JSON.stringify(data, null, "\t"); //  beautified JSON
    var blob = new Blob([json], {type: "text/plain;charset=utf-8"});
    saveAs(blob, fileName);
}
// not tested
function isJSON (jsonString){
    try {
        var o = JSON.parse(jsonString);

        // Handle non-exception-throwing cases:
        // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
        // but... JSON.parse(null) returns null, and typeof null === "object", 
        // so we must check for that, too. Thankfully, null is falsey, so this suffices:
        if (o && typeof o === "object") {
            return true;
        }
    }
    catch (e) {return false; }

    return false;
}

function tryParseJSON (jsonString){
    try {
        var o = JSON.parse(jsonString);

        // Handle non-exception-throwing cases:
        // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
        // but... JSON.parse(null) returns null, and typeof null === "object", 
        // so we must check for that, too. Thankfully, null is falsey, so this suffices:
        if (o && typeof o === "object") {
            return o;
        }
    }
    catch (e) { }

    return false;
}

function is1Component (elType){
    var retval = false;
    switch (elType) {
                    case "w":
                    case "r":
                    case "l":
                    case "c":
                    case "x":
                    case "f":
                    retval = true;
                    break;
                    default:
                        retval = false;
                }
    return retval;
}

function is2Component (elType){
    var retval;
    switch (elType) {
                    case "w":
                    case "r":
                    case "l":
                    case "c":
                    case "x":
                    case "f":
                    retval = false;
                    break;
                    default:
                        retval = true;
                }
    return retval;
}