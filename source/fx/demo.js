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

//load('../kernel/defaultconfig.js');
//load('../kernel/Core.js');

// example program
var SVGNS = 'http://www.w3.org/2000/svg';

var browser = new fx.Frame(1024,500);

var canvas = document.getElementById("canvas");
canvas._fxInit();    

var shape = document.createElementNS(SVGNS, "rect");
shape._fxInit();
shape.setAttributeNS(null, "x", 150);
shape.setAttributeNS(null, "y", 150);
shape.setAttributeNS(null, "width", 50);
shape.setAttributeNS(null, "height", 50);

shape.setAttributeNS(null, "fill", "RED");
shape.setAttributeNS(null, "stroke", "GREEN");
shape.setAttributeNS(null, "stroke-width", 2);
canvas.appendChild(shape);
canvas._fxAppendChild(shape);


var shape = document.createElementNS(SVGNS, "ellipse");
shape._fxInit();
shape.setAttributeNS(null, "x", 50); // FIXME
shape.setAttributeNS(null, "y", 50); // FIXME
shape.setAttributeNS(null, "width", 50); // FIXME
shape.setAttributeNS(null, "height", 50); // FIXME
shape.setAttributeNS(null, "fill", "BLUE");

canvas.appendChild(shape);
canvas._fxAppendChild(shape);

fx.util.addMouseListener(shape, "mousePressed", function(evt) { 
    console.log('mouse pressed event ' + evt);
});


var star = document.createElementNS(SVGNS, "polygon");
star._fxInit();

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
star._fxMakePath(); // FIXME not in SVG


star.setAttributeNS(null, "fill", "YELLOW");
star.setAttributeNS(null, "stroke", "BLACK");
star.setAttributeNS(null, "stroke-width", 1);

canvas.appendChild(star);
canvas._fxAppendChild(star);

fx.util.translate(star, 250, 100);

browser.display(canvas._fxGroup);

fx.util.setInterval(function() { // FIXME not standard
    fx.util.rotate(star, Math.PI/8, 250, 100);
}, 50);

