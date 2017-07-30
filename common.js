
// the main data structure in a centralized place so that all pages can access it.


function copy_schObj(schObj1) {
 var data1 = schObj1.ELEMENT;
 var data = schObj.ELEMENT;
 for (var key in schObj1) 
    {
        if (schObj1.hasOwnProperty(key)) 
        {
            if(key !== "ELEMENT") 
            {
                schObj[key] = schObj1[key];
                //console.log(key + " -> " + schObj[key]);
            }
        else
            {
            //    console.log("SCHOBJ ELEMENT" );
            for (var key2 in data1) 
                {
                    var item1 = data1[key2];
                    var item = data[key2];
                        for (var key3 in item1) 
                        {
                            //  console.log(key3 + " -> " + item1[key3]);
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
            if(key !== "sweepDatasets" || key !== "plotDatasets") 
            {
                if(key !== "ctx") {
                smithObj[key] = smithObj1[key];
                console.log(key + " -> " + smithObj[key]);
                }
            }
            else if (key == "sweepDatasets")
            {
                // console.log("SMITHOBJ sweepDatasets" );
                var data1 = smithObj1.sweepDatasets;
                var data = smithObj.sweepDatasets;
                for (var key2 in data1) 
                    {
                    //  console.log(key2 + " -> " + data1[key2]);
                        var item1 = data1[key2];
                        var item = data[key2];
                        for (var key3 in item1) 
                            {
                                console.log(key3 + " -> " + item1[key3]);
                                item[key3] = item1[key3];
                            }
                    }
            }
           else if (key == "plotDatasets")
            {
                // console.log("SMITHOBJ sweepDatasets" );
                var data1A = smithObj1.plotDatasets;
                var dataA = smithObj.plotDatasets;
                for (var key4 in data2) 
                    {
                    //  console.log(key2 + " -> " + data1[key2]);
                         var item1A = data1A[key4];
                         var itemA = dataA[key4];
                        for (var key5 in item1A) 
                            {
                                console.log(key5 + " -> " + item1A[key5]);
                                itemA[key5] = item1A[key5];
                            }
                    }
            }

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

