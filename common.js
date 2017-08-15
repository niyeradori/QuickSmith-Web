
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
                if(key !== "ctx") {
                smithObj[key] = smithObj1[key];
                //console.log(key + " -> " + smithObj[key]);
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
    var ret = math.add(B,D);
    return ret;
    }

function AddRe(a, B, C, D) {
    var ret = math.add(a,C);
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
    var Z1i = (2 * R * math.sin(Math.PI * Q / 180)) / (1 + (R * R) - 2 * R * math.cos(Math.PI * Q / 180));
    return( Z1i * Z0);
}

function GToZR(R , Q ){
    var Z0 = schObj.Z0;
    var Z1r = (1 - (R * R)) / (1 + (R * R) - (2 * R * math.cos(Q * Math.PI / 180)));
    return( Z1r * Z0);
}

function GToZIZ(R, Q, Z0 ){
   // var Z0 = schObj.Z0;
    var Z1i = (2 * R * math.sin(Math.PI * Q / 180)) / (1 + (R * R) - 2 * R * math.cos(Math.PI * Q / 180));
    return( Z1i * Z0);
}

function GToZRZ(R , Q, Z0 ){
    //var Z0 = schObj.Z0;
    var Z1r = (1 - (R * R)) / (1 + (R * R) - (2 * R * math.cos(Q * Math.PI / 180)));
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

/**
 * Helper function to output a value in the console. Value will be formatted.
 * @param {*} value
 */
function print(value) {
    var precision = 16;
    console.log(math.format(value, precision));
}

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


//Below is a simple jQuery plugin to catch a long click or long press:
(function ($) {
  $.fn.longClick = function (callback, timeout) {
   // bind to element's mousedown event to track the longclick's beginning
   $(this).mousedown(function (event) {
    // save the initial event object
    var initialEvent = event;
    // set the delay after which the callback will be called
    var timer = window.setTimeout(function () { callback(initialEvent); }, timeout);
    // bind to global mouseup event for clearance
    $(document).mouseup(function () {
      // clear timer
      window.clearTimeout(timer);
      // unbind from global mouseup event
      $(document).unbind("mouseup");
      return true;
      // use 'return false;' if you need to prevent default handler and
      // stop event bubbling
    });
     return true;
     // use 'return false;' if you need to prevent default handler and
     // stop event bubbling
   });
  };
})(jQuery);
// usage
// (function ($) {
//   $("#someDiv").longClick(function (e) {
//               alert($(e.target).attr("id") + " was clicked"); },
//               1500);
// })(jQuery);

//jQuery plugin to catch a taphold event
(function ($) {
  $.fn.taphold = function (callback, timeout) {
   // bind to element's touchstart event to track the taphold's beginning
   $(this).bind("touchstart", function (event) {
    // save the initial event object
    var initialEvent = event;
    // set the delay after which the callback will be called
    var timer = window.setTimeout(function () { callback(initialEvent); }, timeout);
    // bind to global touchend and touchcancel events for clearance
    $(document).bind("touchend touchcancel", function () {
      // clear timer
      window.clearTimeout(timer);
      // unbind from touchend and touchcancel events
      $(document).unbind("touchend touchcancel");
      return true;
      // use 'return false;' if you need to prevent default handler and
      // stop event bubbling
    });
    return true;
    // use 'return false;' if you need to prevent default handler and
    // stop event bubbling
   });
  };
})(jQuery);
//usage
// (function ($) {
//   $("#someDiv").taphold(function () {
//                alert($(e.target).attr("id") + " was tapholded"); },
//                1500);
// })(jQuery);

//Combined jQuery plugin to catch both long click and taphold events
(function ($) {
 $.fn.longclick = function (callback, timeout) {
   var isIPad = $.isIPad();
 
   var startEvents = isIPad ? "touchstart" :           "mousedown";
   var endEvents   = isIPad ? "touchend touchcancel" : "mouseup";
 
   $(this).bind(startEvents, function (event) {
    // save the initial event object
    var initialEvent = event;
    // set delay after which the callback will be called
    var timer = window.setTimeout(function () { callback(initialEvent); }, timeout);
    // bind to global event(s) for clearance
    $(document).bind(endEvents, function () {
        // clear timer
        window.clearTimeout(timer);
        // reset global event handlers
        $(document).unbind(endEvents);
        return true;
        // use 'return false;' if you need to prevent default handler and
        // stop event bubbling
    });
    return true;
    // use 'return false;' if you need to prevent default handler and
    // stop event bubbling
   });
 };
})(jQuery);
 



// usage
// (function ($) {
//     $("#someDiv").longclick(function () {
//              alert($(e.target).attr("id") + " was clicked"); },
//              1500);
// })(jQuery);

// similar to String.IsNullOrEmpty
(function ($) {
    $.isNullOrEmpty = function (str) {
        return !str || $.trim(str) === ""; // the trim method is provided by jQuery
    };
})(jQuery);

//usage
// var res = $.isNullOrEmpty(''); // true
// res = $.isNullOrEmpty("bla-bla-bla"); // false
// res = $.isNullOrEmpty(null); // true
// res = $.isNullOrEmpty(); // true
//Below is a simple jQuery plugin to detect whether a page is opened in an iPad:
(function ($) {
    $.isIPad = function () {
        return (typeof navigator != "undefined" &&
               navigator && navigator.userAgent &&
               navigator.userAgent.match(/iPad/i) != null);
    };
})(jQuery);
 

// usage
// $(function(){
//     if($.isIPad())
//         alert('Hello, iPad');
// });

//The next plugin allows to detect an iPhone:
(function ($) {
    $.isIPhone = function () {
        if(!$.isIPad())
            return (typeof navigator != "undefined" &&
               navigator && navigator.userAgent &&
               (navigator.userAgent.match(/iPhone/i) != null ||
                navigator.userAgent.match(/iPod/i) != null));
        return false;
    };
})(jQuery);
 
//usage
// $(function(){
//     if($.isIPhone())
//         alert('Hello, iPhone');
// });
//To detect any Apple mobile devices (iPad, iPhone or iPod) you can use the following jQuery plugin:
(function ($) {
    $.isAppleMobile = function () {
        return (typeof navigator != "undefined" &&
               navigator && navigator.userAgent &&
               navigator.userAgent.match(/(iPad|iPhone|iPod)/i) != null);
    };
})(jQuery);
 

// usage
// $(function(){
//     if($.isAppleMobile())
//         alert('Hello, Apple device');
// });

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

function ShowMessage(title,msg) {
    // var msg0 = " ZIN : " +   Number(resultsObj.OUTPUT[0].ZRout).toFixed(3) + " + " +  Number(resultsObj.OUTPUT[0].ZIout).toFixed(3) + "j" + "   " +  Number(resultsObj.OUTPUT[0].MAGout).toFixed(3) + " < " +  Number(resultsObj.OUTPUT[0].ANGout).toFixed(3) + "\n" ;
    BootstrapDialog.show({
            //size: BootstrapDialog.SIZE_SMALL,
            title: title,
            message: msg,
            buttons: [{
   		        label: 'Close',
                action: function(dialog) {            
                dialog.close();               
                }
            }]
    });
}

function ShowMessage_sm(title,msg) {
    // var msg0 = " ZIN : " +   Number(resultsObj.OUTPUT[0].ZRout).toFixed(3) + " + " +  Number(resultsObj.OUTPUT[0].ZIout).toFixed(3) + "j" + "   " +  Number(resultsObj.OUTPUT[0].MAGout).toFixed(3) + " < " +  Number(resultsObj.OUTPUT[0].ANGout).toFixed(3) + "\n" ;
    BootstrapDialog.show({
            size: BootstrapDialog.SIZE_SMALL,
            title: title,
            message: msg,
            buttons: [{
   		        label: 'Close',
                action: function(dialog) {            
                dialog.close();               
                }
            }]
    });
}

function updateStepSize_prompt(current_val,element)
{
    bootbox.prompt({
    size: "small",
    title: "Enter Step Size", 
    inputType: "text",
    value: current_val,
    callback: function(result) {
        if (typeof result !== "undefined" && result !== null && isNumeric(result)) {
            $(element).trigger("touchspin.updatesettings", { step: result });
        }
    }
    });
}

/* Monotone cubic spline interpolation
   Usage example:
	var f = createInterpolant([0, 1, 2, 3, 4], [0, 1, 4, 9, 16]);
	var message = '';
	for (var x = 0; x <= 4; x += 0.5) {
		var xSquared = f(x);
		message += x + ' squared is about ' + xSquared + '\n';
	}
	alert(message);
*/
var createInterpolant = function(xs, ys) {
	var i, length = xs.length;
	
	// Deal with length issues
	if (length != ys.length) { throw 'Need an equal count of xs and ys.'; }
	if (length === 0) { return function(x) { return 0; }; }
	if (length === 1) {
		// Impl: Precomputing the result prevents problems if ys is mutated later and allows garbage collection of ys
		// Impl: Unary plus properly converts values to numbers
		var result = +ys[0];
		return function(x) { return result; };
	}
	
	// Rearrange xs and ys so that xs is sorted
	var indexes = [];
	for (i = 0; i < length; i++) { indexes.push(i); }
	indexes.sort(function(a, b) { return xs[a] < xs[b] ? -1 : 1; });
	var oldXs = xs, oldYs = ys;
	// Impl: Creating new arrays also prevents problems if the input arrays are mutated later
	xs = []; ys = [];
	// Impl: Unary plus properly converts values to numbers
	for (i = 0; i < length; i++) { xs.push(+oldXs[indexes[i]]); ys.push(+oldYs[indexes[i]]); }
	
	// Get consecutive differences and slopes
	var dys = [], dxs = [], ms = [];
	for (i = 0; i < length - 1; i++) {
		var dx = xs[i + 1] - xs[i], dy = ys[i + 1] - ys[i];
		dxs.push(dx); dys.push(dy); ms.push(dy/dx);
	}
	
	// Get degree-1 coefficients
	var c1s = [ms[0]];
	for (i = 0; i < dxs.length - 1; i++) {
		var m = ms[i], mNext = ms[i + 1];
		if (m*mNext <= 0) {
			c1s.push(0);
		} else {
			var dx_ = dxs[i], dxNext = dxs[i + 1], common = dx_ + dxNext;
			c1s.push(3*common/((common + dxNext)/m + (common + dx_)/mNext));
		}
	}
	c1s.push(ms[ms.length - 1]);
	
	// Get degree-2 and degree-3 coefficients
	var c2s = [], c3s = [];
	for (i = 0; i < c1s.length - 1; i++) {
		var c1 = c1s[i], m_ = ms[i], invDx = 1/dxs[i], common_ = c1 + c1s[i + 1] - m_ - m_;
		c2s.push((m_ - c1 - common_)*invDx); c3s.push(common_*invDx*invDx);
	}
	
	// Return interpolant function
	return function(x) {
		// The rightmost point in the dataset should give an exact result
		var i = xs.length - 1;
		if (x == xs[i]) { return ys[i]; }
		
		// Search for the interval x is in, returning the corresponding y if x is one of the original xs
		var low = 0, mid, high = c3s.length - 1;
		while (low <= high) {
			mid = Math.floor(0.5*(low + high));
			var xHere = xs[mid];
			if (xHere < x) { low = mid + 1; }
			else if (xHere > x) { high = mid - 1; }
			else { return ys[mid]; }
		}
		i = Math.max(0, high);
		
		// Interpolate
		var diff = x - xs[i], diffSq = diff*diff;
		return ys[i] + c1s[i]*diff + c2s[i]*diffSq + c3s[i]*diff*diffSq;
	};
};

function phase_unwrap(ys)
{
  var length = ys.length; var i;
  var xs = [];
  if (length === 0) { return ys; }
  var prevphase = 0; 
  var phase;
  var offset = 0;
  for (i = 0; i < length; i++)
    {
        phase = ys[i];
        if (Math.abs(phase - prevphase) > 180)  offset = offset - 360 * Math.sign(phase - prevphase);
        prevphase = phase;
        xs[i] = phase + offset;
    }
    // Do While Not EOF(1)
         
    //      Input #1, Filedata0, Filedata1, Filedata2
    //         If (Filedata0 <> 0) Then
    //             n = n + 1
    //             If gmah = 1 Then Filedata0 = Filedata0 / 1000000#
    //             xatemp(n) = Filedata0   'freq
    //             y1atemp(n) = Filedata1 ' mag
    //             'y2atemp(n) = filedata2 ' phase
            
    //             ' code written to unwrap phase
    //             phase = Filedata2
    //             If (Abs(phase - prevphase) > 180) Then offset = offset - 360 * Sgn(phase - prevphase)
    //             prevphase = phase
    //             y2atemp(n) = phase + offset
    //         End If
    //         If (n > 1000) Then Exit Do
    // Loop
   return xs;
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