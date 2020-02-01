var ampObj = {
                "Z0": 50.0, // characteristic impedance
                "S11M": 0.641, 
                "S11A": -171.3,
                "S21M": 2.058, 
                "S21A": 28.5, 
                "S12M": 0.057, 
                "S12A": 16.3, 
                "S22M": 0.572, 
                "S22A": -95.7,
                "polar":true,
                "Fmin": 2.9,
                "G0M": 0.542,
                "G0A": 141,
                "RN": 9.42,
                "show_message": false,  
                "stabilityColor":'#800080', // purple
                "gainColor":'#00FF00',
                "noiseColor":'#800000',
                "k" : 0,
                "delta" : 0,
                "STFLAG" : false,
                "stability_msg": "",
                //"GA" : 10, // Gain circle
                "Fi" : 4,  // NF inputGPMAX
                "vswr":1.0,
                "stabilityS_r":0.0,
                "stabilityS_m":0.0,
                "stablityS_q":0.0,
                "stabilityL_r":0.0,
                "stabilityL_m":0.0,
                "stablityL_q":0.0,
                "Again_r":0.0,
                "Again_m":0.0,
                "Again_q":0.0,
                "Ogain_r":0.0,
                "Ogain_m":0.0,
                "Ogain_q":0.0,
                "noise_r":0.0,
                "noise_m":0.0,
                "noise_q":0.0,
                "GPMAX":0.0,  // gain circle max
                "AvG":0.0,  // available gain
                "OpG":0.0,   // operating gain
                "AVLoadAngle":45,  // starting poing for the source gain circle
                "OPLoadAngle":45,    // starting point for the load gain circle
                "AVStepAngle":1.0,  // step angle for source gain circle
                "OPStepAngle":1.0,  // step angle for source gain circle
                "AVCenterR":0.0,
                "AVCenterI": 0.0, 
                "OPCenterR":0.0,
                "OPCenterI": 0.0, 
                "DataSM" :0.0,
                "DataSQ" :0.0,
                "DataLM" :0.0,
                "DataLQ" :0.0,
                calculateStabilityCircles: function() { calculateStabilityCircles (this);}, 
                calculateNoiseCircles: function() { calculateNoiseCircles (this);}, 
                calculateAVGainCircles : function() { calculateAVGainCircles(this);},
                calculateOPGainCircles : function() { calculateOPGainCircles(this);}

};
var C1R,C2R,C1I,C2I,DeltaM,AK;  // GLOBAL VALUES

function calculateStabilityCircles() {
  console.log("caculateStability");
  var S11R, S11I, S21R, S21I, S12R, S12I, S22R, S22I;
  var H1, H2, H3, RLD, CLR, CLI, RSD, CSR, CSI;
  var GMSG,GPMAX;
  S11R = ampObj.S11M * Math.cos(ampObj.S11A * Math.PI / 180);
  S11I = ampObj.S11M * Math.sin(ampObj.S11A * Math.PI / 180);
  S21R = ampObj.S21M * Math.cos(ampObj.S21A * Math.PI / 180);
  S21I = ampObj.S21M * Math.sin(ampObj.S21A * Math.PI / 180);
  S12R = ampObj.S12M * Math.cos(ampObj.S12A * Math.PI / 180);
  S12I = ampObj.S12M * Math.sin(ampObj.S12A * Math.PI / 180);
  S22R = ampObj.S22M * Math.cos(ampObj.S22A * Math.PI / 180);
  S22I = ampObj.S22M * Math.sin(ampObj.S22A * Math.PI / 180);
  
  var DeltaR = AddRe(MulRe(S11R, S11I, S22R, S22I), MulIm(S11R, S11I, S22R, S22I), -MulRe(S12R, S12I, S21R, S21I), -MulIm(S12R, S12I, S21R, S21I));
  var DeltaI = AddIm(MulRe(S11R, S11I, S22R, S22I), MulIm(S11R, S11I, S22R, S22I), -MulRe(S12R, S12I, S21R, S21I), -MulIm(S12R, S12I, S21R, S21I));
  DeltaM= Math.abs(Math.sqrt(DeltaR*DeltaR + DeltaI*DeltaI)); // Global
  ampObj.delta= Number(DeltaM).toFixed(3);
  // Calculate K
  H1 = Math.abs(Math.sqrt(Math.pow(MulRe(S21R, S21I, S12R, S12I), 2) + Math.pow(MulIm(S21R, S21I, S12R, S12I), 2)));      
  if (H1 !== 0) {
        H2 = Math.abs(Math.sqrt(Math.pow(MulRe(S11R, S11I, S11R, S11I),2) + Math.pow(MulIm(S11R, S11I, S11R, S11I), 2))); // |S11*S11|
        H3 = Math.abs(Math.sqrt(Math.pow(MulRe(S22R, S22I, S22R, S22I), 2) + Math.pow(MulIm(S22R, S22I, S22R, S22I), 2))); // |S12*S12|
        AK = (1 - H2 - H3 + DeltaM * DeltaM) / (2 * H1);
  }
  else AK = 1E+20;
  ampObj.k= Number(AK).toFixed(3);   
  if (DeltaM < 1 && AK > 1) {
    ampObj.stability_msg = "UNCONDITIONALLY STABLE";
    ampObj.STFLAG = true;
  }
  else {
    ampObj.stability_msg = "POTENTIALLY UNSTABLE";
    ampObj.STFLAG = false;
  }
  //Calculate var Variable C1 & C2
  C1R = AddRe(S11R, S11I, -MulRe(DeltaR, DeltaI, S22R, -S22I), -MulIm(DeltaR, DeltaI, S22R, -S22I));
  C1I = AddIm(S11R, S11I, -MulRe(DeltaR, DeltaI, S22R, -S22I), -MulIm(DeltaR, DeltaI, S22R, -S22I));
  C2R = AddRe(S22R, S22I, -MulRe(DeltaR, DeltaI, S11R, -S11I), -MulIm(DeltaR, DeltaI, S11R, -S11I));
  C2I = AddIm(S22R, S22I, -MulRe(DeltaR, DeltaI, S11R, -S11I), -MulIm(DeltaR, DeltaI, S11R, -S11I));
  RLD = S22R * S22R + S22I * S22I - DeltaM * DeltaM;
  if (RLD == 0) RLD = 0.000000000001;
  var RL = H1 / RLD;
  CLR = C2R / RLD;
  CLI = -C2I / RLD;
  var CLM = Math.abs(Math.sqrt(CLR * CLR + CLI * CLI));
  var CLA = Math.atan(CLI / CLR) * 180 / Math.PI;
  if (CLR < 0 && CLI > 0)  CLA = 180 + CLA;
  if (CLR < 0 && CLI < 0) CLA = -180 + CLA;

   RSD = S11R * S11R + S11I * S11I - DeltaM * DeltaM;
  if (RSD == 0) RSD = 0.000000000001;
  var RS = H1 / RSD;
  CSR = C1R / RSD;
  CSI = -C1I / RSD;
  var CSM = Math.abs(Math.sqrt(CSR * CSR + CSI * CSI));
  var CSA = Math.atan(CSI / CSR) * 180 / Math.PI;
  if (CSR < 0 && CSI > 0) CSA = 180 + CSA;
  if (CSR < 0 && CSI < 0) CSA = -180 + CSA;
  // Calculate Maximum Gain  GPMAX
  GMSG = Math.abs(Math.sqrt(DivRe(S21R, S21I, S12R, S12I) * DivRe(S21R, S21I, S12R, S12I) + DivIm(S21R, S21I, S12R, S12I) * DivIm(S21R, S21I, S12R, S12I)));
  if (ampObj.STFLAG == false) GPMAX = (Math.log(GMSG) / Math.log(10)) * 10;  // Unstable case       
  else
  {
      GPMAX = (AK - Math.sqrt(AK * AK - 1)) * GMSG;
      GPMAX = (Math.log(GPMAX) / Math.log(10)) * 10;
  }
  ampObj.GPMAX=GPMAX;
  ampObj.stablityS_q = CSA;
  ampObj.stablityS_m = CSM;
  ampObj.stablityS_r = RS;
  ampObj.stablityL_q = CLA;
  ampObj.stablityL_m = CLM;
  ampObj.stablityL_r = RL;

// form6.OperItem.Enabled = true
// form6.AvItem.Enabled = true
// form6.StabilityShowitem.Enabled = true
// form6.StabilityShowitem.Checked = false
// form6.NoiseShowItem.Checked = false
// form6.OperItem.Checked = false
// form6.AvItem.Checked = false
}

function calculateAVGainCircles() {
  console.log("calculateAVGainCircles");
  GainCirc(ampObj.AvG, ampObj.GPMAX, false);
}

function calculateOPGainCircles() {
  console.log("calculateOPGainCircles");
   GainCirc(ampObj.OpG, ampObj.GPMAX, true);
}


function CircleGamma(CX , CY , R , a , opera ) {
  //Find a GammaS(Operating) or GammaL(available) on the circle for a given angle
  var DataM, DataQ, datax, dataY;
  var DR, DI, NR, NI;
  var SourceReal,SourceImag,LoadReal,Loavarag;
  var S11R, S11I, S21R, S21I, S12R, S12I, S22R, S22I;
  S11R = ampObj.S11M * Math.cos(ampObj.S11A * Math.PI / 180);
  S11I = ampObj.S11M * Math.sin(ampObj.S11A * Math.PI / 180);
  S21R = ampObj.S21M * Math.cos(ampObj.S21A * Math.PI / 180);
  S21I = ampObj.S21M * Math.sin(ampObj.S21A * Math.PI / 180);
  S12R = ampObj.S12M * Math.cos(ampObj.S12A * Math.PI / 180);
  S12I = ampObj.S12M * Math.sin(ampObj.S12A * Math.PI / 180);
  S22R = ampObj.S22M * Math.cos(ampObj.S22A * Math.PI / 180);
  S22I = ampObj.S22M * Math.sin(ampObj.S22A * Math.PI / 180);

  //find gammaL
  datax = R * Math.sin(a * Math.PI / 180);
  dataY = R * Math.cos(a * Math.PI / 180);
  datax = datax + CX;
  dataY = dataY + CY;
  DataM = Math.abs(Math.sqrt(datax * datax + dataY * dataY));
  DataQ = Math.atan(dataY / datax) * 180 / Math.PI;
  if (datax < 0 && dataY > 0)  DataQ = 180 + DataQ;
  if (datax < 0 && dataY < 0) DataQ = -180 + DataQ;
  //plot current first and then calculate and plot the corresponding source/load
  if (opera == true) { // write Load
      ampObj.DataLM = DataM;
      ampObj.DataLQ = DataQ;
      //form6.panel3d10.ampObj = format(DataM, "0.000") & "  < " & format(DataQ, "0.000");
      // document.getElementById("ZL").value = Number(DataM).toFixed(3) + "  < " + Number(DataQ).toFixed(3);
      // LoadReal = GToZRZ(DataM, DataQ, ampObj.Z0);
      // Loavarag = GToZIZ(DataM, DataQ, ampObj.Z0);
      // document.getElementById("GL").value = Number(LoadReal).toFixed(3) + "  < " + Number(Loavarag).toFixed(3);
   }
  else  {         // write Source
      //form6.Smith1.DataM = DataM;
      //form6.Smith1.DataQ = DataQ;
      //SourceReal = AmpGTOZR(DataM, DataQ, form6.Smith1.Z0);
      //SourceImag = AmpGTOZI(DataM, DataQ, form6.Smith1.Z0);
      //form6.panel3d8.ampObj = format(DataM, "0.000") & "  < " & format(DataQ, "0.000");
     // form6.panel3d11.ampObj = format(SourceReal, "0.000") & " + j " & format(SourceImag, "0.000");
      
      ampObj.DataSM = DataM;        // write source
      ampObj.DataSQ = DataQ;
      //form6.panel3d8.ampObj = format(DataM, "0.000") & "  < " & format(DataQ, "0.000");
      // document.getElementById("ZS").value = Number(DataM).toFixed(3) + "  < " + Number(DataQ).toFixed(3);
      // SourceReal = GToZRZ(DataM, DataQ, ampObj.Z0);
      // SourceImag = GToZIZ(DataM, DataQ, ampObj.Z0);
      // document.getElementById("GS").value = Number(SourceReal).toFixed(3) + "  < " + Number(SourceImag).toFixed(3);
  }
        //find the corresponding GammaS Gammal and wrie /plot
  if (opera == true) {    // operating   pg122 GG (LOAD)
        NR = MulRe(MulRe(S12R, S12I, S21R, S21I), MulIm(S12R, S12I, S21R, S21I), datax, dataY);
        NI = MulIm(MulRe(S12R, S12I, S21R, S21I), MulIm(S12R, S12I, S21R, S21I), datax, dataY);
        DR = MulRe(S22R, S22I, datax, dataY);
        DI = MulIm(S22R, S22I, datax, dataY);
        DR = AddRe(1, 0, -DR, -DI);
        DI = AddIm(1, 0, -DR, -DI);
        datax = DivRe(NR, NI, DR, DI);
        dataY = DivIm(NR, NI, DR, DI);
        datax = AddRe(S11R, S11I, datax, dataY);
        dataY = AddIm(S11R, S11I, datax, dataY);
        dataY = -dataY; // The required GammaS for maximum power is conjugate
        DataM = Math.abs(Math.sqrt(datax * datax + dataY * dataY));
        DataQ = Math.atan(dataY / datax) * 180 / Math.PI;
        if (datax < 0 && dataY > 0) DataQ = 180 + DataQ;
        if (datax < 0 && dataY < 0) DataQ = -180 + DataQ;

        ampObj.DataSM = DataM;        // write SOURCE data point for moving the Smith chart cursor
        ampObj.DataSQ = DataQ;
        // document.getElementById("ZS").value = Number(DataM).toFixed(3) + "  < " + Number(DataQ).toFixed(3);
        // SourceReal = GToZRZ(DataM, DataQ, ampObj.Z0);
        // SourceImag = GToZIZ(DataM, DataQ, ampObj.Z0);
        // document.getElementById("GS").value = Number(SourceReal).toFixed(3) + "  < " + Number(SourceImag).toFixed(3);
  }
  else 
  {        // available pg 147 GG ( SOURCE)
        NR = MulRe(MulRe(S12R, S12I, S21R, S21I), MulIm(S12R, S12I, S21R, S21I), datax, dataY);
        NI = MulIm(MulRe(S12R, S12I, S21R, S21I), MulIm(S12R, S12I, S21R, S21I), datax, dataY);
        DR = MulRe(S11R, S11I, datax, dataY);
        DI = MulIm(S11R, S11I, datax, dataY);
        DR = AddRe(1, 0, -DR, -DI);
        DI = AddIm(1, 0, -DR, -DI);
        datax = DivRe(NR, NI, DR, DI);
        dataY = DivIm(NR, NI, DR, DI);
        datax = AddRe(S22R, S22I, datax, dataY);
        dataY = AddIm(S22R, S22I, datax, dataY);
        dataY = -dataY; // The required GammaS for maximum power is conjugate
        DataM = Math.abs(Math.sqrt(datax * datax + dataY * dataY));
        DataQ = Math.atan(dataY / datax) * 180 / Math.PI;
        if (datax < 0 && dataY > 0) DataQ = 180 + DataQ;
        if (datax < 0 && dataY < 0) DataQ = -180 + DataQ;

        ampObj.DataLM = DataM;      // write load
        ampObj.DataLQ = DataQ;
        // document.getElementById("ZL").value = Number(DataM).toFixed(3) + "  < " + Number(DataQ).toFixed(3);
        // LoadReal = GToZRZ(DataM, DataQ, ampObj.Z0);
        // Loavarag = GToZIZ(DataM, DataQ, ampObj.Z0);
        // document.getElementById("GL").value = Number(LoadReal).toFixed(3) + "  < " + Number(Loavarag).toFixed(3);
  }
}

function GainCirc(G, Gmax, Oper) { //operating or availabel circles
  var SR, SI, CR, CI, H1, GI, H2, H2A, H3, Distan, angle, RN, tmp,radius;
  //var AV, CenterR, AVCenterI, AVRadius As Math.single  // Local variables so than sMath.Math.PIn control does not access it
  //we control the load plane data points only
  
  var S11R, S11I, S21R, S21I, S12R, S12I, S22R, S22I;
  S11R = ampObj.S11M * Math.cos(ampObj.S11A * Math.PI / 180);
  S11I = ampObj.S11M * Math.sin(ampObj.S11A * Math.PI / 180);
  S21R = ampObj.S21M * Math.cos(ampObj.S21A * Math.PI / 180);
  S21I = ampObj.S21M * Math.sin(ampObj.S21A * Math.PI / 180);
  S12R = ampObj.S12M * Math.cos(ampObj.S12A * Math.PI / 180);
  S12I = ampObj.S12M * Math.sin(ampObj.S12A * Math.PI / 180);
  S22R = ampObj.S22M * Math.cos(ampObj.S22A * Math.PI / 180);
  S22I = ampObj.S22M * Math.sin(ampObj.S22A * Math.PI / 180);

  if (Oper == true) { // Load plane
    SR = S22R;
    SI = S22I;
    CR = C2R; // global 
    CI = C2I; // global
    H1 = Math.abs(Math.sqrt(MulRe(S12R, S12I, S21R, S21I) * MulRe(S12R, S12I, S21R, S21I) + MulIm(S12R, S12I, S21R, S21I) * MulIm(S12R, S12I, S21R, S21I)));
    H2 = Math.abs(Math.sqrt(MulRe(SR, SI, SR, SI) * MulRe(SR, SI, SR, SI) + MulIm(SR, SI, SR, SI) * MulIm(SR, SI, SR, SI))); // |S11*S11|
    H2A = Math.abs(Math.sqrt(MulRe(S21R, S21I, S21R, S21I) * MulRe(S21R, S21I, S21R, S21I) + MulIm(S21R, S21I, S21R, S21I) * MulIm(S21R, S21I, S21R, S21I))); // |S21*S21|
    H3 = H2 - DeltaM * DeltaM;
    GI = Math.pow(10, (G / 10)) / H2A;
    tmp = GI / (1 + GI * H3);
    var CenterR = tmp * CR;
    var CenterI = tmp * -CI;
    Distan = Math.abs(Math.sqrt(CenterR * CenterR + CenterI * CenterI));
    angle = Math.atan(CenterI / CenterR) * 180 / Math.PI;
    if (CenterR < 0 && CenterI > 0) angle = 180 + angle;
    if (CenterR < 0 && CenterI < 0) angle = -180 + angle;
    if (G < Gmax) RN = Math.sqrt(1 - 2 * AK * H1 * GI + ((H1 * GI) * (H1 * GI))); else RN = 0;
    radius = RN / (1 + GI * H3);
    //if (oper) {     //for load plane
    ampObj.Ogain_m = Distan;
    ampObj.Ogain_q= angle;
    ampObj.Ogain_r= radius;    // find a point on the circle
    ampObj.OPCenterR = CenterR;
    ampObj.OPCenterI = CenterI;

    CircleGamma(ampObj.OPCenterR,ampObj.OPCenterI, ampObj.Ogain_r,ampObj.OPLoadAngle, true);
  }
  else  { // AVAILABLE OR SOURCE PLANE CIRCLE
    SR = S11R;
    SI = S11I;
    CR = C1R;//global
    CI = C1I;//global
    H1 = Math.abs(Math.sqrt(MulRe(S12R, S12I, S21R, S21I) * MulRe(S12R, S12I, S21R, S21I) + MulIm(S12R, S12I, S21R, S21I) * MulIm(S12R, S12I, S21R, S21I)));
    H2 = Math.abs(Math.sqrt(MulRe(SR, SI, SR, SI) * MulRe(SR, SI, SR, SI)  + MulIm(SR, SI, SR, SI) * MulIm(SR, SI, SR, SI) )); // |S11*S11|
    H2A = Math.abs(Math.sqrt(MulRe(S21R, S21I, S21R, S21I) * MulRe(S21R, S21I, S21R, S21I) + MulIm(S21R, S21I, S21R, S21I) * MulIm(S21R, S21I, S21R, S21I)));// |S21*S21|
    H3 = H2 - DeltaM * DeltaM;
    GI = Math.pow(10 , (G / 10)) / H2A;
    tmp = GI / (1 + GI * H3);
    var AVCenterR = tmp * CR;
    var AVCenterI = tmp * -CI;
    Distan = Math.abs(Math.sqrt(AVCenterR * AVCenterR + AVCenterI * AVCenterI));
    angle = Math.atan(AVCenterI / AVCenterR) * 180 / Math.PI;
    if (AVCenterR < 0 && AVCenterI > 0)  angle = 180 + angle;
    if (AVCenterR < 0 && AVCenterI < 0) angle = -180 + angle;
    if (G < Gmax) RN = Math.sqrt(1 - 2 * AK * H1 * GI + ((H1 * GI) * (H1 * GI))); else RN = 0;
    var AVradius = RN / (1 + GI * H3);

    //form6.Smith1.CircleIndex = 2;
    ampObj.Again_m= Distan;
    ampObj.Again_q = angle;
    ampObj.Again_r = AVradius;
    ampObj.AVCenterR = AVCenterR;
    ampObj.AVCenterI = AVCenterI;
    CircleGamma(ampObj.AVCenterR, ampObj.AVCenterI, ampObj.Again_r, ampObj.AVLoadAngle, false);  // Available == false
    radius = AVradius; // for msg box
  }
   if (ampObj.show_message==true) {
   var msg = "Center = " + Number(Distan).toFixed(3) + " < " + Number(angle).toFixed(3)  + "\n" + "Radius = " + Number(radius).toFixed(3);
   ShowMessage("QuickSmith",msg);
  }
}


function calculateNoiseCircles() {
var GOMAG, GOANG, RN, Fil, FminL ;
var GoR, GoI, tmpR, tmpI, tmp, ani, cfimag, cfiang, RFi;
  // Fmin = form10.Text1.Text
   GOMAG = ampObj.G0M;
   GOANG = ampObj.G0A;
   RN = ampObj.RN;
   var fi = parseFloat(ampObj.Fi);
   var Fmin = parseFloat(ampObj.Fmin);
   //console.log("calculateNoiseCircles" + fi +" " + Fmin);
   if (fi < Fmin)  fi = Fmin;
      FminL = Math.pow(10 , (Fmin / 10));  // dB to linear
   Fil = Math.pow(10 , (fi / 10));
   if (ampObj.Z0 > 0) RN = RN / ampObj.Z0; else RN = RN / 50;
   GoR = GOMAG * Math.cos(GOANG * Math.PI / 180);
   GoI = GOMAG * Math.sin(GOANG * Math.PI / 180);
   tmpR = MulRe(AddRe(1, 0, GoR, GoI), AddIm(1, 0, GoR, GoI), AddRe(1, 0, GoR, GoI), AddIm(1, 0, GoR, GoI));
   tmpI = MulIm(AddRe(1, 0, GoR, GoI), AddIm(1, 0, GoR, GoI), AddRe(1, 0, GoR, GoI), AddIm(1, 0, GoR, GoI));
   tmp = Math.abs(Math.sqrt(tmpR * tmpR + tmpI * tmpI));
   if (RN !== 0) { 
      ani = (Fil - FminL) * tmp / (4 * RN);
      cfimag = GOMAG / (1 + ani);
    }
   else  cfimag = 0;
   cfiang = GOANG;
   if (Fil > FminL) RFi = Math.sqrt( (ani * ani) + ani * (1 - (GOMAG * GOMAG))) / (1 + ani); else RFi = 0;
   if (ampObj.show_message==true) {
    var msg = "Center = " + Number(cfimag).toFixed(3) + " < " + Number(GOANG).toFixed(3)  + "\n" + "Radius = " + Number(RFi).toFixed(3);
    ShowMessage("QuickSmith",msg);
  }
  ampObj.noise_r = RFi;
  ampObj.noise_m = cfimag;
  ampObj.noise_q = GOANG;
}