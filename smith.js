
// Stackoverflow- 22943186
//To convert point to pixel size you simply use system DPI / 72:
//80 pt * (96 / 72) = 107 pixels @ 96 DPI.
var   fontBase = 300;                   // selected default width for canvas
var   fontSize = 8;                     // default size for font 20



function drawSmith(me) {
  var ctx = me.ctx;
  if(resize_done == false) return;
  ctx.clearRect(0,0,chart.width,chart.height);
  var  r =  AXIS_RANGE;
  var  wby2 = chart.width/2;
  var  hby2 = chart.height/2;
  Circle(ctx,0,0,r-4,"red");  //constant resistance circles Rn = 0; small padding provide for the outer circle to avoid flatning.
  Circle(ctx,r/3,0,2*r/3,"red");   // Rn = 0.5
  Circle(ctx,r/2,0,r/2,"red");   // Rn = 1
  Circle(ctx,2*r/3,0,r/3,"red");   // Rn = 2

  DrawArc(ctx,r,r,r/1,90,180,"green"); // Xn = 1
  DrawArc(ctx,r,-r,r/1,180,270,"green"); // Xn = 1 (bottom)

  DrawArc(ctx,r,r/2,r/2,90,217,"green"); // Xn = 2
  DrawArc(ctx,r,-r/2,r/2,143,270,"green"); // Xn = 2(bottom)

  DrawArc(ctx,r,2*r,2*r,90,143,"green"); // Xn = 0.5
  DrawArc(ctx,r,-2*r,2*r,217,270,"green"); // Xn = 0.5(bottom)

 // Center Line
  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "green";
  ctx.moveTo(chart.width, hby2);
  ctx.lineTo(0, hby2);
  ctx.stroke();
  ctx.closePath();
// Place labels
  placeText(ctx,0,0," r=1","left","top");
  placeText(ctx,r/3,0," 2","left","top");
  placeText(ctx,-r/3,0," 0.5","left","top");
  placeText(ctx,0,r," x=1","left","top");
  placeText(ctx,0,-r," x=-1","left","bottom");
  
  placeText(ctx,r*Math.cos(Math.PI*53/180),r*Math.sin(Math.PI*53/180),"2","left","bottom"); 
  placeText(ctx,r*Math.cos(Math.PI*307/180),r*Math.sin(Math.PI*307/180),"-2","left","top");
  placeText(ctx,r*Math.cos(Math.PI*127/180),r*Math.sin(Math.PI*127/180),"0.5","right","bottom");
  placeText(ctx,r*Math.cos(Math.PI*233/180),r*Math.sin(Math.PI*233/180),"-0.5","right","top");

  if (me.showAdmittace == true) 
    {
        // Constant conductance cicles
      DrawArcA(ctx,-2*r/3,0,r/3,0,360);   //  Cn = 0.5
      DrawArcA(ctx,-r/2,0,r/2,0,360);   // Cn = 1
      DrawArcA(ctx,-r/3,0,2*r/3,0,360);   // Cn = 2
      // constant suseptance circles
      DrawArcA(ctx,-r,0+r,r,-90,0); // Xn = 1
      DrawArcA(ctx,-r,0-r,r,0,90);
    }

  if (me.vswrCircle !== 0) me.drawVSWRCircles();

  if (me.qCircle !== 0) me.drawQCircles();

  if (me.Z0 !== 0){  
      var z0 = '' + me.Z0.toFixed(1);
      placeText(ctx,950,-950,z0,"right","bottom");
    }
  var title  = me.title;  
  if (title){
    placeText(ctx,-990,990,title,"left","top");
  }

  if (me.showMarker == true) me.drawMarker();  

    // draw constant gain circles
  me.drawGainCircles();
  me.drawdataSprite();
  
  if (me.sweep == true) me.drawSweep();
  if (me.data == true) me.dataPlot();
  ctx.beginPath(); // draw a gray border - to be removed later
  ctx.lineWidth = "1";
  ctx.strokeStyle = "gray";
  ctx.rect(0, 0, chart.width, chart.height);
  ctx.stroke();
}


function drawMarker(me){
      var ctx = me.ctx;
      var r4 = parseFloat(me.markerM);
      var q1 = parseFloat(me.markerQ);
      var x = AXIS_RANGE*r4*Math.cos(q1*Math.PI/180);
      var y = AXIS_RANGE*r4*Math.sin(q1*Math.PI/180);
      //var R =0.065*chart.width/2  ;
      var R =0.02*AXIS_RANGE;
      Circle(ctx,x,y,R,"black");
      var scaled = scale(x,y,R);
      if(scaled.R <4) scaled.R = 4;
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "black";
      ctx.moveTo(scaled.X,scaled.Y-scaled.R);
      ctx.lineTo(scaled.X,scaled.Y+scaled.R);
      ctx.moveTo(scaled.X-scaled.R,scaled.Y);
      ctx.lineTo(scaled.X+scaled.R,scaled.Y);
      ctx.stroke();
      ctx.closePath();	
}

function drawdataSprite(me) {
  var ctx = me.ctx;
  var x = me.dataM * AXIS_RANGE * Math.cos(Math.PI * me.dataQ/180);
  var y = me.dataM * AXIS_RANGE * Math.sin(Math.PI * me.dataQ/180);
  drawFilledCircle(ctx,x,y);
}

function drawFilledCircle(ctx,x,y) {
     var r=0.02*AXIS_RANGE;
     ctx.beginPath();
	   ctx.save();
     ctx.fillStyle = 'blue';
     ctx.shadowOffsetX = 1;
     ctx.shadowOffsetY = 1;
     ctx.shadowColor = 'rgb(100,100,100)';
     ctx.shadowBlur = 1;
     var scaled = scale(x,y,r);
     if(scaled.R <5) scaled.R = 5;
     ctx.arc(scaled.X, scaled.Y, scaled.R, (Math.PI/180)*0, (Math.PI/180)*360, false);
     ctx.fill();
	   ctx.restore();
     ctx.closePath();
}

function drawSweep(me) {
     var ctx = me.ctx;
	  var datasets = me.sweepDatasets;
     // if(datasets.length>0)
     // {
      // for (i = 0, ilen = datasets.length; i < ilen; ++i) // datasets.length=1 forcing to only dataset for now
          drawData(ctx,datasets[0].dataM,datasets[0].dataQ,datasets[0].color);
     // }
}

function dataPlot(me) {
     var ctx = me.ctx;
     // var i, ilen;
	  var datasets = me.plotDatasets;
     // if(datasets.length>0)
     // {
     //  for (i = 0, ilen = datasets.length; i < ilen; ++i) 
          drawData(ctx,datasets[0].dataM,datasets[0].dataQ,datasets[0].color);
     // }
}

function drawAdmitanceCircles(me) {
     if(me.showAdmittace == true) me.showAdmittace = false; 
     else me.showAdmittace = true;
     var ctx = me.ctx;
     console.log("ctx = " + me.showAdmittace);
    // ctx.clearRect(0,0,chart.width,chart.height);
      drawSmith(me);
  }

 function drawVSWRCircles(me) {
      var ctx = me.ctx;
      // Constant VSWR cicles
      var swr = parseFloat(me.vswrCircle);
      console.log("VSWR " + swr);
      if(swr <= 1.0) return;
      var r1 = ((swr -1)/(1+swr)); 
      var radius = (r1*AXIS_RANGE);
      if(radius>0)Circle(ctx,0,0,radius,"blue");         
 }

 function drawQCircles(me)
     { // Constant Q cicles
      var ctx = me.ctx;
      var q = parseFloat(me.qCircle);
      if(q==0) return;
      var r2 = 1/q;
      var r3= Math.sqrt(1+r2*r2);
      radius = Math.abs((r3*AXIS_RANGE)); 
      center = Math.abs((r2*AXIS_RANGE));  
      console.log( " r2 = " + radius + "r3 = " + center + " Q= " + q);
      DrawArc(ctx,0,-center,radius,180,0,"#FF00FF"); //+Yaxis arc starting from -r,0 to r,0 
      DrawArc(ctx,0,center,radius,0,180,"#FF00FF");//Magenta
   }

function drawGainCircles(me) {
  var ctx = me.ctx;
  if(me.circleR.length > 0){   
      var i,ilen,radius1,ptx,pty;
      for (i = 0, ilen = me.circleR.length; i < ilen; ++i)
      {
          radius1 = parseFloat(me.circleR[i]);
            if(radius1 > 0) 
             	{
             		ptx = AXIS_RANGE * me.circleM[i] * Math.cos( me.circleQ[i]*Math.PI/180);
            		pty = AXIS_RANGE * me.circleM[i] * Math.sin( me.circleQ[i]*Math.PI/180);
                radius1 = radius1*AXIS_RANGE;
                if(me.circleShow[i]==true)( Circle(ctx,ptx,pty,radius1,me.circleColor[i])); 
              }
      }
    }
}

//---------------------------------------------------------------------------
// Return TRUE if the given coordinates are inside of the Smith Chart
//---------------------------------------------------------------------------
function InSmith(x,y)
{
    var r;
    r = AXIS_RANGE; 
    return ((x * x)   + (y * y) <= (r*r));
}

function InCircleR(x,y,r)
{ 
    return ((x * x)  + (y * y) <= (r*r));
}



// function inCirclePolar(r,q,radius)
// { 
//     var q_rad = q * Math.PI / 180;
//     var x = r* Math.cos(q_rad);
//     var y = r* Math.sin(q_rad);
//     return ((x * x)  + (y * y) <= (radius*radius));
// }


// assuming we are already in Smith chart    3
//    region                                1 2
//   region                                  4
function getRegion(x,y){

    var r= AXIS_RANGE/2;
    var region = 0;
    if (InCircleR(x+AXIS_RANGE/2,y-0,r) == true) {
          region = 1;
        }
    else if (InCircleR(x-AXIS_RANGE/2,y-0,r) == true) {
          region = 2;
        }
    else if (region==0 && y >= 0) region = 3;
    else if (region==0 && y < 0 ) region = 4;
    //else region = 0;
    return region;
}

function scale(x,y,r) {
  var  wby2 = chart.width/2;
  var  hby2 = chart.height/2;
  if (r !== null && r !== undefined && !isNaN(r)) 
  		r = Math.round(r * parseFloat(wby2/AXIS_RANGE));
  else  r = 0;
  if (x !== null && x !== undefined && !isNaN(x)) 
  		x = Math.round(x * parseFloat(wby2/AXIS_RANGE));
  else  x = 0;
  if (y !== null && y !== undefined && !isNaN(y)) 
  		y = Math.round(y * parseFloat(hby2/AXIS_RANGE));
  else  y = 0;
  x = x + Math.round(wby2);
  y=-y;
  y = y + Math.round(hby2);
  return {
        X: x,
        Y: y,
		    R: r
    };
}

function descale(X,Y) {
  var  wby2 = chart.width/2;
  var  hby2 = chart.height/2;
  var y = Y - Math.round(hby2);
  y=-y;
  y= Math.round(y/parseFloat(hby2/AXIS_RANGE));
  var x = X - Math.round(wby2);
  x= Math.round(x/parseFloat(wby2/AXIS_RANGE));
  return {
        x: x,
        y: y
    };
}


function Circle(ctx,x,y,r,color) {
  console.log(" x= " + x + " y = " + y + " r =  " + r);
  ctx.beginPath();
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  var scaled = scale(x,y,r);
  ctx.arc(scaled.X,scaled.Y,scaled.R, 0, Math.PI*2, false);
  ctx.stroke();
  ctx.restore(); // now the default solid line is restored
  ctx.closePath();
}

function DrawArc(ctx,x,y,r,A1,A2,color) {
  ctx.beginPath();
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  var scaled = scale(x,y,r);
  ctx.arc(scaled.X,scaled.Y,scaled.R,(Math.PI/180)*A1, (Math.PI/180)*A2, false);
  ctx.stroke();
  ctx.restore(); // now the default solid line is restored
  ctx.closePath();
}

function DrawArcA(ctx,x,y,r,A1,A2) {
  ctx.beginPath();
  ctx.save();
  ctx.strokeStyle = "#000080";
  ctx.setLineDash([1,4]);
  ctx.lineWidth = 1;
  var scaled = scale(x,y,r);
  ctx.arc(scaled.X,scaled.Y,scaled.R,(Math.PI/180)*A1, (Math.PI/180)*A2, false);
  ctx.stroke();
  ctx.restore(); // now the default solid line is restored
  ctx.closePath();
}

function placeText(ctx,x,y,txt,textAlign,textBaseline){
	  ctx.beginPath();
	  var ratio = fontSize / fontBase;   // calc ratio
    var size = chart.width * ratio;   // get font size based on current width 
  	ctx.font = (size|0) + 'px System';
  	ctx.fillStyle = "black";
    ctx.textAlign = textAlign;  
	  ctx.textBaseline = textBaseline;
	  var scaled = scale(x,y,0);
	  ctx.fillText(txt, scaled.X,scaled.Y); 
	  ctx.closePath();
}

function drawFilledCircle(ctx,x,y) {
     var r=0.02*AXIS_RANGE;
     ctx.beginPath();
	   ctx.save();
     ctx.fillStyle = 'blue';
     ctx.shadowOffsetX = 1;
     ctx.shadowOffsetY = 1;
     ctx.shadowColor = 'rgb(100,100,100)';
     ctx.shadowBlur = 1;
     var scaled = scale(x,y,r);
     if(scaled.R <5) scaled.R = 5;
     ctx.arc(scaled.X, scaled.Y, scaled.R, (Math.PI/180)*0, (Math.PI/180)*360, false);
     ctx.fill();
	   ctx.restore();
     ctx.closePath();
}

function drawSprite(ctx,x,y) {
  //ctx.globalAlpha = 0.5;  // default value 1
  var r = 0.06 * chart.width/2 ;
 
  var scaled = scale(x,y,0);
	ctx.drawImage(sprite, scaled.X - sprite.width / 2, scaled.Y - sprite.height / 2, r, r);
}

function drawData(ctx,dataM,dataQ,color){
    if(dataM.length > 0)
	{  
      var i,ilen,radius,ptx,pty;
      ptx = AXIS_RANGE * dataM[0] * Math.cos(dataQ[0]*Math.PI/180);
      pty = AXIS_RANGE * dataM[0] * Math.sin(dataQ[0]*Math.PI/180);
      var scaled = scale(ptx,pty,0);
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = color;
      ctx.moveTo(scaled.X,scaled.Y);
      for (i = 1, ilen = dataM.length; i < ilen; ++i)
        {
          ptx = AXIS_RANGE * dataM[i] * Math.cos(dataQ[i]*Math.PI/180);
          pty = AXIS_RANGE * dataM[i] * Math.sin(dataQ[i]*Math.PI/180);
          scaled = scale(ptx,pty,0);
          ctx.lineTo(scaled.X,scaled.Y);
        }
      ctx.stroke();
      ctx.closePath();
    }
}


function getMaximumWidth (domNode) {
		var container = domNode.parentNode;
		var paddingLeft = parseInt(getStyle(container, 'padding-left'), 10);
		var paddingRight = parseInt(getStyle(container, 'padding-right'), 10);
		var w = container.clientWidth - paddingLeft - paddingRight;
		var cw = getConstraintWidth(domNode);
		return isNaN(cw)? w : Math.min(w, cw);
	}
	function getMaximumHeight (domNode) {
		var container = domNode.parentNode;
		var paddingTop = parseInt(getStyle(container, 'padding-top'), 10);
		var paddingBottom = parseInt(getStyle(container, 'padding-bottom'), 10);
		var h = container.clientHeight - paddingTop - paddingBottom;
		var ch = getConstraintHeight(domNode);
        console.log("CH ="+ ch);
        console.log("h ="+ h);
		return isNaN(ch)? h : Math.min(h, ch);
	}

  function getStyle (el, property) {
		return el.currentStyle ?
			el.currentStyle[property] :
			document.defaultView.getComputedStyle(el, null).getPropertyValue(property);
	}

	// returns Number or undefined if no constraint
	function getConstraintWidth (domNode) {
		return getConstraintDimension(domNode, 'max-width', 'clientWidth');
	}
	// returns Number or undefined if no constraint
	function getConstraintHeight (domNode) {
		return getConstraintDimension(domNode, 'max-height', 'clientHeight');
	}
	/**
	 * Returns if the given value contains an effective constraint.
	 * @private
	 */
	function isConstrainedValue(value) {
		return value !== undefined && value !== null && value !== 'none';
	}
	function getConstraintDimension(domNode, maxStyle, percentageProperty) {
		var view = document.defaultView;
		var parentNode = domNode.parentNode;
		var constrainedNode = view.getComputedStyle(domNode)[maxStyle];
		var constrainedContainer = view.getComputedStyle(parentNode)[maxStyle];
		var hasCNode = isConstrainedValue(constrainedNode);
		var hasCContainer = isConstrainedValue(constrainedContainer);
		var infinity = Number.POSITIVE_INFINITY;

		if (hasCNode || hasCContainer) {
			return Math.min(
				hasCNode? parseMaxStyle(constrainedNode, domNode, percentageProperty) : infinity,
				hasCContainer? parseMaxStyle(constrainedContainer, parentNode, percentageProperty) : infinity);
		}

		return 'none';
  }
  //    retinaScale(chart, smithObject); 
	function retinaScale(chart,smithObject) {
    //var pixelRatio = chart.currentDevicePixelRatio = chart.devicePixelRatio || window.devicePixelRatio || 1;
     var pixelRatio = chart.currentDevicePixelRatio = window.devicePixelRatio ;
    console.log (" pixelRatio = "+pixelRatio );
		if (pixelRatio === 1) {
			return;
		}
    
    
		var height = chart.height;
		var width = chart.width;

		smithObject.ctx.canvas.height = height * pixelRatio;
		smithObject.ctx.canvas.width = width * pixelRatio;
		smithObject.ctx.scale(pixelRatio, pixelRatio);

	  smithObject.ctx.canvas.style.height = height + 'px';
		smithObject.ctx.canvas.style.width = width + 'px';
  }
  
  	// Private helper function to convert max-width/max-height values that may be percentages into a number
	function parseMaxStyle(styleValue, node, parentProperty) {
		var valueInPixels;
		if (typeof(styleValue) === 'string') {
			valueInPixels = parseInt(styleValue, 10);

			if (styleValue.indexOf('%') !== -1) {
				// percentage * size in dimension
				valueInPixels = valueInPixels / 100 * node.parentNode[parentProperty];
			}
		} else {
			valueInPixels = styleValue;
		}

		return valueInPixels;
  }
  
  function getMousePosition(evt, chart) {
      var mouseX, mouseY;
      var e = evt.originalEvent || evt,
        canvas = evt.currentTarget || evt.srcElement,
        boundingRect = canvas.getBoundingClientRect();

      var touches = e.touches;
      if (touches && touches.length > 0) {
        mouseX = touches[0].clientX;
        mouseY = touches[0].clientY;

      } else {
        mouseX = e.clientX;
        mouseY = e.clientY;
      }

      // Scale mouse coordinates into canvas coordinates
      // by following the pattern laid out by 'jerryj' in the comments of
      // http://www.html5canvastutorials.com/advanced/html5-canvas-mouse-coordinates/
      var paddingLeft =0;
      var paddingTop = 0;
      var paddingRight =0;
      var paddingBottom =0;
      var width = boundingRect.right - boundingRect.left - paddingLeft - paddingRight;
      var height = boundingRect.bottom - boundingRect.top - paddingTop - paddingBottom;

      // We divide by the current device pixel ratio, because the canvas is scaled up by that amount in each direction. However
      // the backend model is in unscaled coordinates. Since we are going to deal with our model coordinates, we go back here
      mouseX = Math.round((mouseX - boundingRect.left - paddingLeft) / (width) * canvas.width / chart.currentDevicePixelRatio);
      mouseY = Math.round((mouseY - boundingRect.top - paddingTop) / (height) * canvas.height / chart.currentDevicePixelRatio);

      return {
        x: mouseX,
        y: mouseY
      };

    };

