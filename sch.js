var C = 299800000; // speed of light - 299792458 m/s

var schObj = {
                "ver":5.0,  //if you change this then change the file load verify function- this is used as a check - need a better way to do this
                "VF": 1,  // velocity factor
                "Z0": 50.0, // characteristic impedance
                "TDF": 100, // Transmission design frequency
                "LU": "Inches",  // Inches, MilliMeters, Degrees, Wave Lengths
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
                    { "index": 0, "type": "f", "value1": 100.00,"value2": 0,"tune": 1, assign: updateImpedance }, // uses item 0 for frequency
                    { "index": 1, "type": "rx", "value1": 50, "value2": 0,"tune": 1, assign: updateImpedance },  // type RX/G , this is load so calculating impedance
                    { "index": 2, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, assign: updateImpedance },
                    { "index": 3, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, assign: updateAdmittance },
                    { "index": 4, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, assign: updateImpedance },
                    { "index": 5, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, assign: updateAdmittance },
                    { "index": 6, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, assign: updateImpedance },
                    { "index": 7, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, assign: updateAdmittance },
                    { "index": 8, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, assign: updateImpedance },
                    { "index": 9, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, assign: updateAdmittance },
                    { "index": 10, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, assign: updateImpedance },
                    { "index": 11, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, assign: updateAdmittance },
                    { "index": 12, "type": "w", "value1": 0, "value2": 0, "q": 1000000, "tune": 1, assign: updateImpedance }
                ]   
            };

resultsObj = {
    "ELEMENT": [                                    
        { "index": 0, "ZR": 0.0, "ZI": 0.0 }, // index 0 for intermediate calculation  ( not assigned)
        { "index": 1, "ZR": 50.0, "ZI": 0.0 },  // calculated result outputs
        { "index": 2, "ZR": 0, "ZI": 0 },
        { "index": 3, "YR": 0, "YI": 0 },
        { "index": 4, "ZR": 0, "ZI": 0 },
        { "index": 5, "YR": 0, "YI": 0 },
        { "index": 6, "ZR": 0, "ZI": 0 },
        { "index": 7, "YR": 0, "YI": 0 },
        { "index": 8, "ZR": 0, "ZI": 0 },
        { "index": 9, "YR": 0, "YI": 0 },
        { "index": 10, "ZR": 0, "ZI": 0},
        { "index": 11, "YR": 0, "YI": 0 },  
        { "index": 12, "ZR": 0, "ZI": 0},
        { "index": 13, "YR": 0, "YI": 0 },
        { "index": 14, "ZR": 0, "ZI": 0},
        { "index": 15, "YR": 0, "YI": 0 },  // place holders for ILCal calculations ???
    ], 
    "OUTPUT":[
        { "ZRout": 0, "unit1": "Ohms", "ZIout": 0, "unit2": "Ohms", "MAGout": 0, "unit3": "Ohms", "ANGout": 0, "unit4": "Degrees", calculate: Zcalsweep1 },
        { "YRout": 0, "unit1": "mS", "YIout": 0, "unit2": "mS", "YMag": 0, "unit3": "Magnitude*1000", "YAng": 0, "unit4": "Degrees", calculate: YCal},
        { "GAMRout": 0, "unit1": "", "GAMIout": 0, "unit2": "", "GAMMag": 0, "unit3": "Magnitude", "GAMAng": 0, "unit4": "Degrees", calculate: GAMCal},
        { "VSWR": 0, "unit1": "", calculate: VSWRCal },
        { "ReturnLoss": 0, "unit1": "dB", calculate: RLCal },
        { "InsertionLoss": 0, "unit1": "dB", "S21Mag": 0, "unit3": "dB", "S21Ang": 0, "unit4": "Degrees", calculate: ILCal_wrapper },
        { "ReflectionLoss": 0, "unit1": "dB", calculate: REFCal },
        { "PowerReflectionCoeff": 0, "unit1": "", calculate: PRCal },
        { "TransmissionLossCoeff": 0, "unit1": "", calculate: TLCal },
        { "MaximumSWR": 0, "unit1": "", calculate: MaxSWRCal },
        { "MinimumSWR": 0, "unit1": "", calculate: MinSWRCal },
    ]
};

/**
 * How the calculations work. It is a two step process.
 * 1) Calculate each ladder slot component impedance/admittance, then get the final impedance, update the results in te resultsObj object (assign()).
*  2) Using the resultsObj structure, calculate the final output impedance (Zcalsweep()). 
 */
/**
 * Method ofschObj JSON
 * @param {*} value
 */
function updateImpedance()
{
    var v1,v2,x,r,ang,rad,den;
    //console.log(" Calculating Impedance Index:" + this.index);
    var freq = schObj.ELEMENT[0].value1;
    var gamma = { "r": 0, "phi": 0 };
    var w = 2 * Math.PI * freq * 1000000.00;  //  w= 2PIf
    var beta = w / ( schObj.VF * C);
    var index = this.index; // this has to be a even number except for RX and G
    v1 = this.value1; v2 = this.value2;
    if(v1 ==0)  v1 = 1e-14; 
    if(v2 ==0)  v2 = 1e-14; 
    switch (this.type) {
        case "f":
            break;
        case "w":
            resultsObj.ELEMENT[index].ZR = 0;
            resultsObj.ELEMENT[index].ZI = 0;
            break;
        case "r":
            resultsObj.ELEMENT[index].ZR = v1;
            console.log(" R = " + resultsObj.ELEMENT[index].ZR + " Index = " + index);
            resultsObj.ELEMENT[index].ZI = 0;
            break;
        case "x":
            resultsObj.ELEMENT[index].ZR = 0;
            resultsObj.ELEMENT[index].ZI = v1;
            break;
        case "g":
            if( schObj.termination =="Multiple") {                
                r =    myInterpolate(freq,schObj.gamData.dataX,schObj.gamData.dataM) ;
                ang =  myInterpolate(freq,schObj.gamData.dataX,schObj.gamData.dataQ) ;
            }
            else {
                r = v1;
                ang = v2;
            }
            if(isNumeric(ang) == false) ang=0;
            if(isNumeric(r) == false) r=0;
            if(r>1.0) r = 1.0; if(r<0) r = 0;
            var ZR = GToZR(r,ang);
            var ZI = GToZI(r,ang);
            resultsObj.ELEMENT[index].ZR = ZR;  // here store the it in impedance
            resultsObj.ELEMENT[index].ZI = ZI;
            schObj.ELEMENT[1].value1 = r;
            schObj.ELEMENT[1].value2 = ang;
            break;
        case "rx":
           if( schObj.termination =="Multiple" ) {
                r =    myInterpolate(freq,schObj.gamData.dataX,schObj.gamData.dataM) ;
                ang =  myInterpolate(freq,schObj.gamData.dataX,schObj.gamData.dataQ) ;
                if(isNumeric(ang) == false) ang=0;
                if(isNumeric(r) == false) r=0;
                if(r>1.0) r = 1.0; if(r<0) r = 0;
                ZR = GToZR(r,ang);
                ZI = GToZI(r,ang);
                resultsObj.ELEMENT[index].ZR = ZR;
                resultsObj.ELEMENT[index].ZI = ZI;
            }
            else {
                resultsObj.ELEMENT[index].ZR = v1;
                resultsObj.ELEMENT[index].ZI = v2;               
            }
            schObj.ELEMENT[1].value1 = resultsObj.ELEMENT[index].ZR;
            schObj.ELEMENT[1].value2 = resultsObj.ELEMENT[index].ZI;
            break;
        case "c":
            resultsObj.ELEMENT[index].ZI = -1 / (w * v1 * 0.000000000001);
            resultsObj.ELEMENT[index].ZR = math.divide(resultsObj.ELEMENT[index].ZI,this.q) * (-1.00);
            break;
        case "l":
            resultsObj.ELEMENT[index].ZI = (w * v1 * 0.000000001);
            resultsObj.ELEMENT[index].ZR = resultsObj.ELEMENT[index].ZI / this.q;
            break;
        case "t":
           //v1 - imp, v2 length
            switch (schObj.LU)
            {
                case "Inches": 
                     rad = beta * v2 * 0.0254;    //  inches
                break;
                case "MilliMeters": 
                    rad = beta * v2 / 1000 ;    // P(I%) in mm
                break;
                case "Degrees": 
                    rad = beta * v2 * schObj.VF * C / (schObj.TDF * 1000000 * 360);
                break;
                case "Wave Lengths": 
                    rad = beta * v2 * schObj.VF  * C / (schObj.TDF * 1000000);
                break;
                case "Meters": 
                    rad = beta * v2  ;
                break;
                   
                default:
                    rad = beta * v2 * 0.0254;    //  inches
            }
            if((rad * 180 / Math.PI) == 90) rad = rad + 0.000000000001;

            var LR=resultsObj.ELEMENT[1].ZR;
            var LI=resultsObj.ELEMENT[1].ZI;
            var ZR0,ZI0,YR0,YI0;
            if(index >= 4) {
            ZR0 = math.add(resultsObj.ELEMENT[2].ZR,resultsObj.ELEMENT[1].ZR);
            ZI0 = math.add(resultsObj.ELEMENT[2].ZI,resultsObj.ELEMENT[1].ZI);
            YR0 = math.add(resultsObj.ELEMENT[3].YR , (ZR0 / (math.pow(ZR0, 2) + math.pow(ZI0, 2))));
            YI0 = math.subtract(resultsObj.ELEMENT[3].YI, (ZI0 / (math.pow(ZR0, 2) + math.pow(ZI0, 2))));
            LR = YR0 / (YR0 * YR0 + YI0 * YI0);
            LI = -YI0 / (YR0 * YR0 + YI0 * YI0);
            }
            if(index >= 6) {
            den = math.add((math.pow(YR0, 2)), (math.pow(YI0, 2)));
            ZR0 = math.add(resultsObj.ELEMENT[4].ZR, (YR0 /den));
            ZI0 = math.subtract(resultsObj.ELEMENT[4].ZI , (YI0 / den));
            YR0 = math.add(resultsObj.ELEMENT[5].YR , (ZR0 / (math.pow(ZR0, 2) + math.pow(ZI0, 2))));
            YI0 = math.subtract(resultsObj.ELEMENT[5].YI, (ZI0 / (math.pow(ZR0, 2) + math.pow(ZI0, 2))));
            LR = YR0 / (YR0 * YR0 + YI0 * YI0);
            LI = -YI0 / (YR0 * YR0 + YI0 * YI0);
            //ZR(3) = ZR(4) + YR(2) / (YR(2) ^ 2 + YI(2) ^ 2)
            //ZI(3) = ZI(4) - YI(2) / (YR(2) ^ 2 + YI(2) ^ 2)
            //YR(4) = YR(5) + ZR(3) / (ZR(3) ^ 2 + ZI(3) ^ 2)
            //YI(4) = YI(5) - ZI(3) / (ZR(3) ^ 2 + ZI(3) ^ 2)
            //LR! = YR(4) / (YR(4) ^ 2 + YI(4) ^ 2)
            //LI! = -YI(4) / (YR(4) ^ 2 + YI(4) ^ 2)
            }
            if(index >= 8) {
            den = math.add((math.pow(YR0, 2)), (math.pow(YI0, 2)));
            ZR0 = math.add(resultsObj.ELEMENT[6].ZR, (YR0 /den));
            ZI0 = math.subtract(resultsObj.ELEMENT[6].ZI , (YI0 / den));
            YR0 = math.add(resultsObj.ELEMENT[7].YR , (ZR0 / (math.pow(ZR0, 2) + math.pow(ZI0, 2))));
            YI0 = math.subtract(resultsObj.ELEMENT[7].YI, (ZI0 / (math.pow(ZR0, 2) + math.pow(ZI0, 2))));
            LR = YR0 / (YR0 * YR0 + YI0 * YI0);
            LI = -YI0 / (YR0 * YR0 + YI0 * YI0);                
            //ZR(5) = ZR(6) + YR(4) / (YR(4) ^ 2 + YI(4) ^ 2)
            //ZI(5) = ZI(6) - YI(4) / (YR(4) ^ 2 + YI(4) ^ 2)
            //YR(6) = YR(7) + ZR(5) / (ZR(5) ^ 2 + ZI(5) ^ 2)
            //YI(6) = YI(7) - ZI(5) / (ZR(5) ^ 2 + ZI(5) ^ 2)
            //LR! = YR(6) / (YR(6) ^ 2 + YI(6) ^ 2)
            //LI! = -YI(6) / (YR(6) ^ 2 + YI(6) ^ 2)
            }
          
            if(index >= 10) {
            den = math.add((math.pow(YR0, 2)), (math.pow(YI0, 2)));
            ZR0 = math.add(resultsObj.ELEMENT[8].ZR, (YR0 /den));
            ZI0 = math.subtract(resultsObj.ELEMENT[8].ZI , (YI0 / den));
            YR0 = math.add(resultsObj.ELEMENT[9].YR , (ZR0 / (math.pow(ZR0, 2) + math.pow(ZI0, 2))));
            YI0 = math.subtract(resultsObj.ELEMENT[9].YI, (ZI0 / (math.pow(ZR0, 2) + math.pow(ZI0, 2))));
            LR = YR0 / (YR0 * YR0 + YI0 * YI0);
            LI = -YI0 / (YR0 * YR0 + YI0 * YI0);        
            //ZR(7) = ZR(8) + YR(6) / (YR(6) ^ 2 + YI(6) ^ 2)
            //ZI(7) = ZI(8) - YI(6) / (YR(6) ^ 2 + YI(6) ^ 2)
            //YR(8) = YR(9) + ZR(7) / (ZR(7) ^ 2 + ZI(7) ^ 2)
            //YI(8) = YI(9) - ZI(7) / (ZR(7) ^ 2 + ZI(7) ^ 2)
            //LR! = YR(8) / (YR(8) ^ 2 + YI(8) ^ 2)
            //LI! = -YI(8) / (YR(8) ^ 2 + YI(8) ^ 2)
            }
          
            if(index == 12) {
            den = math.add((math.pow(YR0, 2)), (math.pow(YI0, 2)));
            ZR0 = math.add(resultsObj.ELEMENT[10].ZR, (YR0 /den));
            ZI0 = math.subtract(resultsObj.ELEMENT[10].ZI , (YI0 / den));
            YR0 = math.add(resultsObj.ELEMENT[11].YR , (ZR0 / (math.pow(ZR0, 2) + math.pow(ZI0, 2))));
            YI0 = math.subtract(resultsObj.ELEMENT[11].YI, (ZI0 / (math.pow(ZR0, 2) + math.pow(ZI0, 2))));
            LR = YR0 / (YR0 * YR0 + YI0 * YI0);
            LI = -YI0 / (YR0 * YR0 + YI0 * YI0);        
            //ZR(7) = ZR(8) + YR(6) / (YR(6) ^ 2 + YI(6) ^ 2)
            //ZI(7) = ZI(8) - YI(6) / (YR(6) ^ 2 + YI(6) ^ 2)
            //YR(8) = YR(9) + ZR(7) / (ZR(7) ^ 2 + ZI(7) ^ 2)
            //YI(8) = YI(9) - ZI(7) / (ZR(7) ^ 2 + ZI(7) ^ 2)
            //LR! = YR(8) / (YR(8) ^ 2 + YI(8) ^ 2)
            //LI! = -YI(8) / (YR(8) ^ 2 + YI(8) ^ 2)
            }

            //If z(i %) = 0 Then z(i %) = 0.000000000001
            v1 = Math.abs(v1);
            var A = LR * Math.cos(rad); // EA
            var B = v1 * Math.sin(rad) + (LI * Math.cos(rad)); //B+ FA
            var Cd = v1 * Math.cos(rad) - (LI * Math.sin(rad)); // C-FD
            var Dd = LR * Math.sin(rad); //ED
            resultsObj.ELEMENT[index].ZR = v1 * DivRe(A, B, Cd, Dd) - LR;
            resultsObj.ELEMENT[index].ZI = v1 * DivIm(A, B, Cd, Dd) - LI;
            break;
         case "src":
            //v1 -> r, v2 ->c
            resultsObj.ELEMENT[index].ZI = -1 / (w * v2 * 0.000000000001);  // capacitor
            resultsObj.ELEMENT[index].ZR = v1 ;// resistor
            break;
        case "prc":
            x = -(w * v2 * 0.000000000001); //cap
            r = 1 / v1; // resistor
            resultsObj.ELEMENT[index].ZI = x / (x *x + r *r);
            resultsObj.ELEMENT[index].ZR = r / (x *x + r*r);
            break;
        case "plc":
            //v1 -> l, v2 ->c
            x = -((v1 * 0.000000001) / (v2 * 0.000000000001)) / ((w * v1 * 0.000000001) - 1 / (w * v2 * 0.000000000001));
            r = (w * v1 * 0.000000001 * this.q);
            resultsObj.ELEMENT[index].ZI = x / (1 + (x*x) / (r*r));
            resultsObj.ELEMENT[index].ZR = r / (1 + (r*r) / (x*x));
            break;
        case "slc":
            resultsObj.ELEMENT[index].ZI = -1 / (w * v2 * 0.000000000001) + (w * v1 * 0.000000001);
            resultsObj.ELEMENT[index].ZR = (w * v1 * 0.000000001) / this.q;
            break;
        default:
            resultsObj.ELEMENT[index].ZR = 0;
            resultsObj.ELEMENT[index].ZI = 0;
    }
    
}


/**
 * Method ofschObj JSON
 * @param {*} value
 */
function updateAdmittance() {
    //console.log(" Calculating Admittance Index:" + this.index);
    var v1,v2,x,r,ang,rad;
    var gamma = { "r": 0, "phi": 0 };
    var w = 2 * Math.PI * schObj.ELEMENT[0].value1 * 1000000.00;  // 2P_If
    var C = 299800000; // speed of light - 299792458 m/s
    var beta = w / ( schObj.VF * C);
    var index = this.index; // this has to be a odd number
    switch (this.type) {
        case "f":
            break;
        case "w":
            resultsObj.ELEMENT[index].YR = 0;
            resultsObj.ELEMENT[index].YI = 0;
            break;
        case "r":
            if (this.value1 == 0) this.value1 = 1e-16;
            resultsObj.ELEMENT[index].YR = (1 / this.value1);
            resultsObj.ELEMENT[index].YI = 0;
            break;
        case "x":
            if (this.value1 == 0) this.value1 = 1e-16;
            resultsObj.ELEMENT[index].YI = -(1 / this.value1);
            resultsObj.ELEMENT[index].YR = 0;
            break;
        case "c":
            if (this.value1 == 0) this.value1 = 1e-16;
            x = (w * this.value1 * 0.000000000001);
            resultsObj.ELEMENT[index].YR = (this.q * x) / (math.pow(this.q, 2) + 1);
            resultsObj.ELEMENT[index].YI = (math.pow(this.q, 2) * x) / (math.pow(this.q, 2) + 1);
            break;
        case "l":
            if (this.value1 == 0) this.value1 = 1e-16;
           // console.log("this.value1 = " + this.q);
            x = 1 / (w * this.value1 * 0.000000001);
            resultsObj.ELEMENT[index].YR = (this.q * x) / (math.pow(this.q, 2) + 1);
            resultsObj.ELEMENT[index].YI = -(math.pow(this.q, 2) * x) / (math.pow(this.q, 2) + 1);
            break;
        case "t":
            resultsObj.ELEMENT[index].YR = 0;
            resultsObj.ELEMENT[index].YI = 0;
            break;
        case "o":
            v1 = this.value1; v2 = this.value2;
            if(v1 ==0)  v1 = 1e-16; //imp
            if(v2 ==0)  v2 = 1e-16; //length
            switch (schObj.LU)
            {
                case "Inches": 
                     rad = beta * v2 * 0.0254;    //  inches
                break;
                case "MilliMeters": 
                    rad = beta * v2 / 1000 ;    // P(I%) in mm
                break;
                case "Degrees": 
                    rad = beta * v2 * schObj.VF  * C / (schObj.TDF * 1000000 * 360);
                break;
                case "Wave Lengths": 
                    rad = beta * v2 * schObj.VF  * C / (schObj.TDF * 1000000);
                break;
                case "Meters": 
                    rad = beta * v2  ;
                break;
                   
                default:
                    rad = beta * v2 * 0.0254;    //  inches
            }
            if((rad * 180 / Math.PI) == 90) rad = rad + 0.000000000001;
            resultsObj.ELEMENT[index].YI = Math.tan(rad) / Math.abs(v1);
            resultsObj.ELEMENT[index].YR = 0;
            break;
        case "s":
            v1 = this.value1; v2 = this.value2;
            if(v1 ==0)  v1 = 1e-16; //imp
            if(v2 ==0)  v2 = 1e-16; //length
            switch (schObj.LU)
            {
                case "Inches": 
                     rad = beta * v2 * 0.0254;    //  inches
                break;
                case "MilliMeters": 
                    rad = beta * v2 / 1000 ;    // P(I%) in mm
                break;
                case "Degrees": 
                    rad = beta * v2 * schObj.VF * C / (schObj.TDF * 1000000 * 360);
                break;
                case "Wave Lengths": 
                    rad = beta * v2 * schObj.VF * C / (schObj.TDF * 1000000);
                break;
                case "Meters": 
                    rad = beta * v2  ;
                break;
                   
                default:
                    rad = beta * v2 * 0.0254;    //  inches
            }
            if((rad * 180 / Math.PI) == 90) rad = rad + 0.000000000001;
            resultsObj.ELEMENT[index].YI = -1 / (Math.abs(v1) * Math.tan(rad));
            resultsObj.ELEMENT[index].YR = 0;
            break;
        case "src":
            v1 = this.value1; v2 = this.value2;
            if(v1 ==0)  v1 = 1e-16; //r
            if(v2 ==0)  v2 = 1e-16; //c
            x = 1 / (w * v2 * 0.000000000001);  //cap
            r = v1;
            resultsObj.ELEMENT[index].YI = x / (x*x + r*r);
            resultsObj.ELEMENT[index].YR = r / (x*x + r*r);
            break;
        case "prc":
            v1 = this.value1; v2 = this.value2;
            if(v1 ==0)  v1 = 1e-16; //r
            if(v2 ==0)  v2 = 1e-16; //c
            resultsObj.ELEMENT[index].YI = (w * v2 * 0.000000000001);   // capacitor
            resultsObj.ELEMENT[index].YR = 1 / v1;
            break;
        case "plc":
            v1 = this.value1; v2 = this.value2;
            if(v1 ==0)  v1 = 1e-16; //l
            if(v2 ==0)  v2 = 1e-16; //c
            x = ((v1 * 0.000000001) / (v2 * 0.000000000001)) / ((w * v1 * 0.000000001) - 1 / (w * v2 * 0.000000000001));
            resultsObj.ELEMENT[index].YI = 1 / x;
            resultsObj.ELEMENT[index].YR = 1 / (w * v1 * 0.000000001 * this.q);
            break;
        case "slc":
            v1 = this.value1; v2 = this.value2;
            if(v1 ==0)  v1 = 1e-16; //l
            if(v2 ==0)  v2 = 1e-16; //c
            x = -1 / (w * v2* 0.000000000001) + (w * v1 * 0.000000001);
            r = (w * v1 * 0.000000001) / this.q;
            resultsObj.ELEMENT[index].YI = -x / (x*x + r *r);
            resultsObj.ELEMENT[index].YR = r / (x*x + r *r);
            break;
        default:
            resultsObj.ELEMENT[index].YR = 0;
            resultsObj.ELEMENT[index].YI = 0;
    }
}
/**
 * @param {*} value
 */
function Zcalsweep1() // scObj JSON, 
{
    for (var i = 0; i < 13; i++) 
        {
        //console.log("i =" + i);
        schObj.ELEMENT[i].assign(); // better to calculate all for elements, because T is dependent on the previous elements.
        }
     //console.log(JSON.stringify(resultsObj));
    var ZR0 = math.add(resultsObj.ELEMENT[2].ZR,resultsObj.ELEMENT[1].ZR);
    var ZI0 = math.add(resultsObj.ELEMENT[2].ZI,resultsObj.ELEMENT[1].ZI);
   // print(ZR0); print(ZI0);
   // YR(2) = YR(3) + ZR(0) / (ZR(0) ^ 2 + ZI(0) ^ 2)
    var YR0 = math.add(resultsObj.ELEMENT[3].YR , (ZR0 / (math.pow(ZR0, 2) + math.pow(ZI0, 2))));
   //  YI2 = YI(3) - ZI(0) / (ZR(0) ^ 2 + ZI(0) ^ 2)
    var YI0 = math.subtract(resultsObj.ELEMENT[3].YI, (ZI0 / (math.pow(ZR0, 2) + math.pow(ZI0, 2))));
    var ZR1; var ZI1;
    for (var j = 3; j <= 9; j += 2) { 
        //ZR(j %) = ZR(j % + 1) + YR(j % - 1) / (YR(j % - 1) ^ 2 + YI(j % - 1) ^ 2)
       // ZR1 = math.add(resultsObj.ELEMENT[j + 1].ZR , (YR[j - 1] / math.add((math.pow(YR[j - 1],2), math.pow(YI[j-1],2)))));
        var den = math.add((math.pow(YR0, 2)), (math.pow(YI0, 2)));
        ZR1 = math.add(resultsObj.ELEMENT[j + 1].ZR, (YR0 /den));
       // ZI(j %) = ZI(j % + 1) - YI(j % - 1) / (YR(j % - 1) ^ 2 + YI(j % - 1) ^ 2)
        ZI1 = math.subtract(resultsObj.ELEMENT[j + 1].ZI , (YI0 / den));
       // YR(j % + 1) = YR(j % + 2) + ZR(j %) / (ZR(j %) ^ 2 + ZI(j %) ^ 2)
        den = math.add( (math.pow(ZR1, 2)), (math.pow(ZI1, 2)) );
        YR0 = math.add( resultsObj.ELEMENT[j + 2].YR , (ZR1 /den));
       // YI(j % + 1) = YI(j % + 2) - ZI(j %) / (ZR(j %) ^ 2 + ZI(j %) ^ 2)
        YI0 = math.subtract(resultsObj.ELEMENT[j + 2].YI ,(ZI1 /den));
    }
    var den1 = math.add((math.pow(YR0, 2)), (math.pow(YI0, 2)));
    var ZRout = math.add(resultsObj.ELEMENT[12].ZR, (YR0 / den1));
    var ZIout = math.subtract(resultsObj.ELEMENT[12].ZI, (YI0 / den1));
    var complexOut = math.complex(ZRout, ZIout);
    var MAGout = complexOut.abs();
    var ANGout = complexOut.arg() * math.divide(180.00,Math.PI);
    var precision = 16;
    resultsObj.OUTPUT[0].ZRout = math.format(ZRout, precision);
    resultsObj.OUTPUT[0].ZIout = math.format(ZIout, precision);
    resultsObj.OUTPUT[0].MAGout = math.format(MAGout, precision);
    resultsObj.OUTPUT[0].ANGout = math.format(ANGout, precision);
  //  console.log("result1 =" + resultsObj.OUTPUT[0].ZRout); console.log("result2 =" + resultsObj.OUTPUT[0].ZIout);
  //  console.log(JSON.stringify(resultsObj));
  //
    console.log("ZcalDone");
    //print(resultsObj.ZRout);
   // print(resultsObj.ZIout);
   // printNum(math.sqrt(-4));
}

function ILcal(arg){
//// 0 means spot, 1 means sweep , >1 means donot call assign
var f;
var CR = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]; 
var CI = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]; 
var VR = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var VI = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
// var YR = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
// var YI = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

var points, k, j, i, CRA, CIA, C1, dB1;

//fold = freq
//points = math.abs((stop1 - start1) / step1) + 1;// calculate number of points to sweep
  
////'form2.Print points%
//f = start1 - step1;

////For k% = 1 To points% Step 1
//for (k = 1; k <= points; k = k + 1) {
//    freq = (f + step1)// ' frequency sweep
//    if (arg !== 1) freq = fold;
//    if (arg < 2)  assign();
   var freq = schObj.ELEMENT[0].value1; 
   var ZR1= resultsObj.ELEMENT[1].ZR;
   if (ZR1 == 0) ZR1 = 1E-40;
   var YR1 = 1 / ZR1;
   var YI1 = 0;

   resultsObj.ELEMENT[13].YR = 0;
   resultsObj.ELEMENT[13].YI = 0;
   resultsObj.ELEMENT[14].ZR = 0;
   resultsObj.ELEMENT[14].ZI = 0;
   resultsObj.ELEMENT[15].YR = YR1;
   resultsObj.ELEMENT[15].YI = YI1;
   CR[2] = YR1;
   CI[2] = 0;
   var ZR2= resultsObj.ELEMENT[2].ZR;
   var ZI2= resultsObj.ELEMENT[2].ZI;
   VI[2] = YR1 * ZI2;
   VR[2] = YR1 * ZR2;
   VR[3] = 1 + VR[2];  //' VR[1] = 1 Volt
   VI[3] = VI[2];
   var YR3= resultsObj.ELEMENT[3].YR;
   var YI3= resultsObj.ELEMENT[3].YI;
   CR[3] = VR[3] * YR3 - VI[3] * YI3;
   CI[3] = VR[3] * YI3 + VI[3] * YR3;
   var ZRJ, ZIJ,YRJplus1,YIJplus1;
   for (j = 4; j <= 14; j = j + 2) {
       CR[j] = CR[j - 2] + CR[j - 1];
       CI[j] = CI[j - 2] + CI[j - 1];
       ZRJ= resultsObj.ELEMENT[j].ZR;
       ZIJ= resultsObj.ELEMENT[j].ZI;
       VR[j] = CR[j] * ZRJ - CI[j] * ZIJ;
       VI[j] = CR[j] * ZIJ + CI[j] * ZRJ;
       VR[j + 1] = VR[j] + VR[j - 1];
       VI[j + 1] = VI[j] + VI[j - 1];
       YRJplus1= resultsObj.ELEMENT[j+1].YR;
       YIJplus1= resultsObj.ELEMENT[j+1].YI;
       CR[j + 1] = VR[j + 1] * YRJplus1 - VI[j + 1] * YIJplus1;
       CI[j + 1] = VR[j + 1] * YIJplus1 + VI[j + 1] * YRJplus1;
   }
   CRA = CR[15] + CR[14];
   CIA = CI[15] + CI[14];
   if (CRA == 0) CRA = 1E-45;
   C1 = math.sqrt(CRA * CRA + CIA *CIA);
   //'S21IM# = C1#    ' store global data
   //'S21IR# = CRA#
   //'S21II# = CIA#
   dB1 = -(20 / 2.30259) * math.log(C1 / (2 * YR1));//  il loss = 20 log (v1/v2)
   //S21mag(k) = dB1;
    var S21Mag = dB1;
    var S21Ang = (Math.atan(CIA / CRA) * 180 / Math.PI);
    if (CRA < 0 && CIA > 0)  S21Ang = 180 + S21Ang;
    if (CRA < 0 && CIA < 0)  S21Ang = -180 + S21Ang;
     S21Ang = -S21Ang;
    var S21IA = S21Ang; //' store global data
    var IL = -dB1;
    var precision = 16;
    resultsObj.OUTPUT[5].InsertionLoss = math.format(IL, precision);
    resultsObj.OUTPUT[5].S21Mag = math.format(S21Mag, precision);
    resultsObj.OUTPUT[5].S21Ang = math.format(S21Ang, precision);

    console.log( "IL RESULTS:", resultsObj.OUTPUT[5].InsertionLoss ,resultsObj.OUTPUT[5].S21Mag,resultsObj.OUTPUT[5].S21Ang );

    //  { "InsertionLoss": 0, "unit1": "dB", "S21Mag": 0, "unit3": "dB", "S21Ang": 0, "unit4": "Degrees", calculate: ILCal },
//    //If(f > 99999.999) Then form2.Panel3D10.Caption = Format$(f, "##.#E+##") Else form2.Panel3D10.Caption = Format$(f, "###0.000")
//    //form2.Panel3D12.Caption = Format(-dB1!, "###0.000")
//    if (arg !== 1) k = points;

//}
//        freq = fold// ' get the old freq value
    return 10;
}


// function isNumeric(n) {
//     return !isNaN(parseFloat(n)) && isFinite(n);
// }

// function isEven(n) {
//     return n == parseFloat(n) ? (n % 2)===0 : void 0;
// }


function dummy() { }
function YCal() {
    var ZRout = resultsObj.OUTPUT[0].ZRout;
    var ZIout = resultsObj.OUTPUT[0].ZIout;
    var den = math.add((math.pow(ZRout, 2)), (math.pow(ZIout, 2)));
   // form1.Label1.Caption = Format(ZR(13) * 1000 / DRP#, "###0.0000") ' reflection coeff.
   // form1.Label2.Caption = Format(-ZI(13) * 1000 / DRP#, "###0.0000")
  //  { "YRout": 0, "unit1": "mS", "YIout": 0, "unit2": "mS", "YMag": 0, "unit3": "Ohms", "YAng": 0, "unit4": "Degrees", calculate: YCal },
    var YRout = (ZRout * 1000) / den;  // mSimens
    var YIout = (ZIout * -1000) / den;
    var YMag = Math.sqrt(YRout*YRout + YIout*YIout);
    var YAng = Math.atan(YIout/YRout) * math.divide(180.00, Math.PI);
    var precision = 16;
    resultsObj.OUTPUT[1].YRout = math.format(YRout, precision);
    resultsObj.OUTPUT[1].YIout = math.format(YIout, precision);
    resultsObj.OUTPUT[1].YMag = math.format(YMag, precision);
    resultsObj.OUTPUT[1].YAng = math.format(YAng, precision);
}
function GAMCal() {
    var ZRout = resultsObj.OUTPUT[0].ZRout;
    var ZIout = resultsObj.OUTPUT[0].ZIout;
    var SM = ZtoGammaM(ZRout, ZIout);                                   // S11/Gamma
    var SQ = ZtoGammaA(ZRout, ZIout);
    if (SM == 0) { SQ = 0;  SM = 1E-36; }
    SR = SM * math.cos(SQ * Math.PI / 180);
    SI = SM * math.sin(SQ * Math.PI / 180);
    var precision = 16;
    resultsObj.OUTPUT[2].GAMRout = math.format(SR, precision);
    resultsObj.OUTPUT[2].GAMIout = math.format(SI, precision);
    resultsObj.OUTPUT[2].GAMMag = math.format(SM, precision);
    resultsObj.OUTPUT[2].GAMAng = math.format(SQ, precision);
}

function VSWRCal() {
    var sm = parseFloat(resultsObj.OUTPUT[2].GAMMag);
    resultsObj.OUTPUT[3].VSWR = (1 + sm) / (1 - sm);                  // Swr 
}

function RLCal() {
    var sm = parseFloat(resultsObj.OUTPUT[2].GAMMag);
    var RL = Math.abs(20 * (Math.log(sm) / Math.log(10)));               // Rl
    var str;
    if (RL >= 720) str = ">"; else str = "";
    resultsObj.OUTPUT[4].ReturnLoss = RL;
}

function ILCal_wrapper() {
   ILcal(0) ; 
}

function REFCal() {
    var sm = parseFloat(resultsObj.OUTPUT[2].GAMMag);
    resultsObj.OUTPUT[6].ReflectionLoss = -10 * Math.log(1 - sm * sm) / Math.log(10);
}
function PRCal() {
    var sm = parseFloat(resultsObj.OUTPUT[2].GAMMag);
    resultsObj.OUTPUT[7].PowerReflectionCoeff =  (sm * sm);
}

function TLCal() {
    var swr = parseFloat(resultsObj.OUTPUT[3].VSWR);
    resultsObj.OUTPUT[8].TransmissionLossCoeff = (1 + (swr * swr)) / (2 * swr); 
        }
function MaxSWRCal() {
    var swr = parseFloat(resultsObj.OUTPUT[3].VSWR);
    resultsObj.OUTPUT[9].MaximumSWR = Math.sqrt(swr);
}
function MinSWRCal() {
    var swr = parseFloat(resultsObj.OUTPUT[3].VSWR);
    resultsObj.OUTPUT[10].MinimumSWR =  1 / Math.sqrt(swr);
}

function seriesEquiv(){
    console.log("SS");
    var msg;
    var ZinR = resultsObj.OUTPUT[0].ZRout;
    var ZinI = resultsObj.OUTPUT[0].ZIout;
    var freq = schObj.ELEMENT[0].value1; 
    var LC,EL,PN;
    if (ZinI < 0) {      // capacitor
        LC = 1 / (2 * Math.PI * freq * ZinI * 0.000001);
        EL = "C";
        PN = " pf";
    }
    else if (ZinI > 0) {    // inductor
            LC = ZinI / (2 * Math.PI * freq * 0.001);
            EL = "L";
            PN = " nH";
        }
    else {                      // neither cap nor ind
            LC = 0;
            EL = " ";
    }
    if (LC == 0) {
         msg = "R = " + Number(ZinR).toFixed(3) + " Ohms";
    }
    else if ( LC > 10e18)   msg = "R = " + Number(ZinR).toFixed(3) + " Ohms" +  " in Series with " + EL + " = " + "∞" + PN;
    else { 
        msg = "R = " + Number(ZinR).toFixed(3) + " Ohms"  + " in Series with "  + EL + " = " + Number(Math.abs(LC)).toFixed(3)+ PN;
    }
    return "Series Equivalent: " + msg;
}

function parallelEquiv() {
    console.log("PP");
    var msg;
    var LC,EL,PN;
    var freq = schObj.ELEMENT[0].value1; 
    var ZinR = resultsObj.OUTPUT[0].ZRout;
    var ZinI = resultsObj.OUTPUT[0].ZIout;
    if (ZinR == 0) ZinR = 0.00000000000001;
    var Qu = ZinI / ZinR;
    ZinR = (Qu ^ 2 + 1) * ZinR;
    if (Qu !== 0)  ZinI = ZinR / Qu;

    if (ZinI < 0) {              // capacitor
        LC = 1 / (2 * Math.PI * freq * ZinI * 0.000001);
        EL = "C";
        PN = " pF";
    }
    else if (ZinI > 0) {            // inductor
        LC = ZinI / (2 *  Math.PI * freq * 0.001);
        EL = "L";
        PN = " nH";
    }
    else {                            // neither cap nor ind
        LC = 0;
        EL = " ";
    }
    if (LC == 0) {
          msg = "R = " +  Number(ZinR).toFixed(3) + " Ohms";
        }
    else if ( LC > 10e18)   msg = "R = " + Number(ZinR).toFixed(3) + " Ohms" +  " in Parallel with " + EL + " = " + "∞" + PN;
    else { 
         msg = "R = " + Number(ZinR).toFixed(3) + " Ohms" +  " in Parallel with " + EL + " = " + Number(Math.abs(LC).toFixed(3), "0.000") + PN;
        }
    return "Parallel Equivalent: " + msg;
}





function myInterpolate(X, xa, ya) {
    //console.log ("interpolate: freq " + X + " xa length" + xa + " ya length " + ya );
    var f = createInterpolant(xa, ya);
    return f(X);
}

//Neville-Aitken interpolation Algorithm
//xa and ya are global arrays, needs number of points not greater than 200 ad x Value to interpolate
//column number decides the coulmns 1 for first, 2 for second
//n is usually 4
//for proper interpolation phase values needs to be unwrapped, phase is unwrapped in Link_item_click()

function interpolate( X,n,xa,ya ) 
{
    var C=[0,0,0,0,0];
    var D=[0,0,0,0,0];
    var i, m, ns;
    var den, dif, dift, ho, hp, w, Y, dy;
    if (n > 10) return;
    ns = 1;
    xa[0] = 0;
    //x = 23
    dif = Math.abs(X - xa[1]);    // find the index ns closest to the entry
    for(i = 1; i<n; i = i+1) {
        dift = Math.abs(X - xa[i]);
        if (dift < dif) {
            ns = i;
            dif = dift;
        }
        C[i] = ya[i];
        D[i] = ya[i];

    }
    Y = ya[ns]; 
    ns = ns - 1;
    for (m = 1; m < (n - 1); m = m+1) {
        for(i = 1; i < (n - m); i = i+1) {
            ho = xa[i] - X;
            hp = xa[i + m] - X;
            w = C[i + 1] - D[i];
            den = ho - hp;
            if (den == 0) return [];
            den = w / den;
            D[i] = hp * den;
            C[i] = ho * den;
        }
        if (2 * ns < (n - m))  dy = C[ns + 1];
        else {
            dy = D[ns];
            ns = ns - 1;
        }
        Y = Y + dy;
    }
    return Y;
}



// 'Neville-Aitken interpolation Algorithm
// 'xa and ya are global arrays, needs number of points not greater than 200 ad x Value to interpolate
// 'column number decides the coulmns 1 for first, 2 for second
// 'n is usually 4
// 'for proper interpolation phase values needs to be unwrapped, phase is unwrapped in Link_item_click()
// '
// Function interpolate(ByVal X As Double, ByVal n As Integer, ByVal column As Integer) As Double

// Static C(5), D(5)
// Dim I, m, ns As Integer
// Dim den, dif, dift, ho, hp, w, Y, dy As Double
// If (n > 10) Then GoTo endinter
// ns = 1
// xa(0) = 0
// 'x = 23
// dif = Abs(X - xa(1))    ' find the index ns closest to the entry
// For I = 1 To n Step 1
//  dift = Abs(X - xa(I))
//     If (dift < dif) Then
//         ns = I
//         dif = dift
//     End If
//  If (column = 1) Then
//  C(I) = y1a(I)
//  D(I) = y1a(I)
//  Else
//  C(I) = y2a(I)
//  D(I) = y2a(I)
//  End If
// Next I
//    If (column = 1) Then Y = y1a(ns) Else Y = y2a(ns)
   
//    ns = ns - 1
// For m = 1 To (n - 1) Step 1
//      For I = 1 To (n - m) Step 1
//        ho = xa(I) - X
//        hp = xa(I + m) - X
//        w = C(I + 1) - D(I)
//        den = ho - hp
//        If (den = 0) Then GoTo endinter
//        den = w / den
//        D(I) = hp * den
//        C(I) = ho * den
//        Next I
//    If (2 * ns < (n - m)) Then
//    dy = C(ns + 1)
//    Else
   
//    dy = D(ns)
//    ns = ns - 1
//    End If
//    Y = Y + dy
// Next m
// interpolate = Y
// Exit Function

// endinter:
//        Beep
//        MsgBox "Interpolation Error", 0, "QuickSmith"

// End Function

// If (MULTITER = 1) Then ' for mutilple termination interpolate Load

//     n = npoints ' tolal number of data available
//     X = freq ' locate index j closest to x use the xa Array for this
//     jl = 0      ' initialize lower and upper limits
//     ju = n + 1
//     While ((ju - jl) > 1) 'if we are not done yet
//         jm = (ju + jl) / 2    'compute mid point first
//         If (X > xatemp(jm)) Then jl = jm Else ju = jm
//     Wend
//     j = jl  ' returns index j such as j < x < J+1

//     ' get the leftmost index of a point m such that j is at the center
//     m = 4 ' number of sample points
//     k = min(max(j - (m - 1) / 2, 1), n + 1 - m) ' find midpoint offset
//     If m >= n Then
//         k = 1
//         m = n
//     End If
//     ' Assign Values for interpolating
//     For I = 1 To m Step 1
//         xa(I) = xatemp(k - 1 + I)
//         y1a(I) = y1atemp(k - 1 + I)
//         y2a(I) = y2atemp(k - 1 + I)
//     Next I
//     Ri = interpolate(X, m, 1)
//     Qi = interpolate(X, m, 2)

//     ZR(1) = GToZR(CSng(Ri), CSng(Qi))
//     ZI(1) = GToZI(CSng(Ri), CSng(Qi))
//     gammaM = Ri
//     GammaA = Qi
 // unwrap phase
    // Input #1, temp ' Z0
    // n = 0
    // prevphase = 0
    // offset = 0

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
//Notes:
//var testjson = { name: "asd", tall: 123 };
//e.dataTransfer.setData("text/plain", JSON.stringify(testjson));
//e.dataTransfer.effectAllowed = "copy";
//in drop

//var data = e.dataTransfer.getData("text/plain");
//console.log(JSON.parse(data));
//and u will get

//Object {name: "asd", tall: 123 } 
//in console.log

//MZ! = Sqr(ZR(13) ^ 2 + ZI(13) ^ 2)           ' Zin
//AZ! = Atn(ZI(13) / ZR(13)) * 180 / Pi
//'If (MZ! = 50) Then AZ! = 0

//' Yin
//dx# = ZR(13) ^ 2 + ZI(13) ^ 2
//YRX! = ZR(13) * 1000 / dx#
//YIX! = -ZI(13) * 1000 / dx#
//MY! = Sqr(YRX! ^ 2 + YIX! ^ 2)
//If(YRX! = 0) Then YRX! = 0.000000000001
//AY! = Atn(YIX! / YRX!) * 180 / Pi
//sm! = ZToGammaM(CDbl(ZR(13)), CDbl(ZI(13)))                                     ' S11/Gamma
//SQ! = ZToGammaA(CDbl(ZR(13)), CDbl(ZI(13)))
//If(sm! = 0) Then SQ! = 0
//If(sm! = 0) Then sm! = 1E-36
//SR# = sm! * Cos(SQ! * Pi / 180)
//SI# = sm! * Sin(SQ! * Pi / 180)

//Swr! = (1 + sm!) / (1 - sm!)                    ' Swr
//RL = Abs(20 * (Log(sm!) / Log(10)))                ' Rl
//If(RL >= 720) Then st$ = ">" Else st$ = ""

//Call Ilcal(0)                                  ' S21

//msg$ = " ZIN : " & Format(ZR(13), "0.000") & " + " & Format(ZI(13), "0.000") & "j" & "   " &//
//    Format(MZ!, "0.000") & " < " & Format(AZ!, "0.000") & CRLF & "YIN(mS) : " &
//    Format(YRX!, "0.000") & " + " & Format(YIX!, "0.000") & "j" & "   " & Format(MY!, "0.000")
//    & " < " & Format(AY!, "0.000") & CRLF & "GAM : " & Format(SR#, "0.000") & " + " &
//    Format(SI#, "0.000") & "j" & "   " & Format(sm!, "0.000") & " < " & Format(SQ!, "0.000") &
//    CRLF & "S21 : " & Format(S21IM#, "0.000") & " dB" & " < " & Format(S21IA#, "0.000") & CRLF &
//    "VSWR : " & Format(Swr!, "0.000") & CRLF & "Return Loss : " & st$ & Format(RL, "0.000") & " dB" & CRLF & "Insertion Loss :
//" & Format(-S21IM#, "0.000") & " dB"
//msg1$ = "Reflection Loss : " & Format(-10 * Log(1 - sm! ^ 2) / Log(10), "0.000") & " dB" & CRLF &
//    "Power Reflection Coefficient : " & Format((sm! ^ 2), "0.000") & CRLF & "Transmission Loss Coefficient : "
//    & Format(((1 + (Swr!) ^ 2) / (2 * Swr!)), "0.000") & CRLF & "Maximum Standing Wave: " & Format(Sqr(Swr!), "0.000")
//    & CRLF & "Minimum Standing Wave: " & Format(1 / Sqr(Swr!), "0.000")
//'msg2$ = " Note: S21 vaild only if Z0 = Load "


