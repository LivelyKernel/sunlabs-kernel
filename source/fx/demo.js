/*
 * Copyright � 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

load('browser.js');
load('dom/index.xhtml.js');
print('loaded start document emulation');
load('../kernel/defaultconfig.js');
load('../kernel/Core.js');
load('../kernel/Text.js');
load('../kernel/Widgets.js');


// example program
var SVGNS = 'http://www.w3.org/2000/svg';

var browser = new fx.Frame(1024,500);

var canvas = document.getElementById("canvas");




function morphicMain() {
    var canvas = Global.document.getElementById("canvas");
    var world = new WorldMorph(canvas); 
    console.log('created empty world ' + world);
    world.displayOnCanvas(canvas);
    console.log("displayed world");
    var colors = Color.wheel(4);
    var loc = pt(150, 450); 
    var widgetExtent = pt(70, 30);
    var dy = pt(0,50); 
    var dx = pt(120,0);
    // Create a sample rectangle       
    var widget = new Morph(loc.extent(widgetExtent), "rect");
    widget.setFill(colors[0]);
    world.addMorph(widget);
     
     // Create a sample ellipse
     widget = new Morph(loc.addPt(dx).extent(widgetExtent), "ellipse");
     widget.setFill(colors[1]);
     world.addMorph(widget);
     
     // Create a sample line
     loc = loc.addPt(dy);
     widget = Morph.makeLine([loc.addXY(0,15),loc.addXY(70,15)], 2, Color.black);
     world.addMorph(widget);
     
     // Create a sample polygon
     widget = Morph.makePolygon([pt(0,0),pt(70,0),pt(40,30),pt(0,0)], 1, Color.black, colors[2]);
     world.addMorph(widget);
     widget.setPosition(loc.addPt(dx));
     loc = loc.addPt(dy);    
     
     // Create sample text widgets
     if (false) {
         widget = new TextMorph(loc.extent(pt(100,50)),"Big Text"); // big text
         world.addMorph(widget.applyStyle({fontSize: 20, textColor: Color.blue}));
	 
         widget = new TextMorph(loc.addPt(dx).extent(pt(140,50)),"Unbordered"); // unbordered text
         world.addMorph(widget.applyStyle({fontSize: 20, borderWidth: 0, fill: null})); 
     }
}










var shape = document.createElementNS(SVGNS, "rect");
shape.setAttributeNS(null, "x", 150);
shape.setAttributeNS(null, "y", 150);
shape.setAttributeNS(null, "width", 50);
shape.setAttributeNS(null, "height", 50);

shape.setAttributeNS(null, "fill", "red");
shape.setAttributeNS(null, "stroke", "green");
shape.setAttributeNS(null, "stroke-width", 2);
canvas.appendChild(shape);

var shape = document.createElementNS(SVGNS, "ellipse");

shape.setAttributeNS(null, "rx", 50); 
shape.setAttributeNS(null, "ry", 50); 
shape.setAttributeNS(null, "cx", 150); 
shape.setAttributeNS(null, "cy", 300); 
shape.setAttributeNS(null, "fill", "blue");

canvas.appendChild(shape);

fx.util.addMouseListener(shape, "mousePressed", function(evt) { 
    console.log('mouse pressed event ' + evt);
});


var star = document.createElementNS(SVGNS, "polygon");
canvas.appendChild(star);

function svgpt(x, y) {
    var point = new SVGPoint();
    point.x = x;
    point.y = y;
    return point;
}

function makeStarVertices(r, center, startAngle) { 
    // changed to account for lack of real points
    var vertices = [];
    var nVerts = 10;
    for (var i = 0; i <= nVerts; i++) {
	var theta = startAngle + (2*Math.PI/nVerts*i);
	var p =  svgpt(r*Math.cos(theta), r*Math.sin(theta));
	if (i%2 == 0) p = svgpt(p.x* 0.39, p.y*0.39); // scaleBy
	vertices.push(svgpt(p.x + center.x, p.y + center.y));
    }
    return vertices; 
}
    
var verts = makeStarVertices(50, svgpt(0,0), 0);
for (var i = 0; i < verts.length; i++) {
    star.points.appendItem(verts[i]);
}

star.setAttributeNS(null, "fill", "yellow");
star.setAttributeNS(null, "stroke", "black");
star.setAttributeNS(null, "stroke-width", 1);

//fx.util.translate(star, 250, 100);


var count = 0;
var colorCount = 0;
fx.util.setInterval(function() { // FIXME not standard
    //fx.util.rotate(star, Math.PI/8, 250, 100);
    count ++;
    if (count % 20 == 0) { 
	shape.setAttributeNS(null, "fill", ["red", "blue", "black"][colorCount % 3]);
	colorCount ++;
    }
    fx.dom.update();
}, 50);

browser.display(canvas._fxBegin);
morphicMain();