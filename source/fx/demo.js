/*
 * Copyright � 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

var window = this;
load('../kernel/rhino-compat.js');

load('../kernel/JSON.js'); print('JSON.js');
load('../kernel/miniprototype.js'); print('miniprototype.js');


var fx = {
    Panel: Packages.com.sun.scenario.scenegraph.JSGPanel,
    Group: Packages.com.sun.scenario.scenegraph.SGGroup,
    Shape: Packages.com.sun.scenario.scenegraph.SGShape,
    Transform: Packages.com.sun.scenario.scenegraph.SGTransform,
    ShapeMode: Packages.com.sun.scenario.scenegraph.SGAbstractShape$Mode,
    Ellipse: Packages.java.awt.geom.Ellipse2D.Double,
    Rectangle: Packages.java.awt.geom.Rectangle2D.Double,
    Path: Packages.java.awt.geom.GeneralPath,
    Color: Packages.java.awt.Color,
    Timer: Packages.javax.swing.Timer,
    util: {
	antiAlias: function(shape) {
	    var hints = Packages.java.awt.RenderingHints;
	    shape.setAntialiasingHint(hints.VALUE_ANTIALIAS_ON);
	    return shape;
	},
	setBorderWidth: function(shape, width) { // set "stroke-width"
	    var BasicStroke = Packages.java.awt.BasicStroke;
	    shape.setDrawStroke(new BasicStroke(width, BasicStroke.CAP_ROUND,
						BasicStroke.JOIN_MITER));
            shape.setMode(fx.ShapeMode.STROKE_FILL);
	},
	
	addMouseListener: function(shape, eventName, handler) {
	    var adapter  = new fx.util.MouseAdapter();
	    adapter[eventName] = function(awtEvent, sgNode) {
		handler.call(this, awtEvent, sgNode);
	    }
	    var listenerClass = Packages.com.sun.scenario.scenegraph.event.SGMouseListener;
	    var jAdapter = new listenerClass(adapter);
	    shape._fxShape.addMouseListener(jAdapter);
	},

	rotate: function(element, theta, x, y) { // move to SVGTransform
	    // note that it's cumulative
	    var parent = element._fxTransform.getParent();
	    parent.remove(element._fxTransform);
	    element._fxTransform = fx.Transform.createTranslation(-x, -y, element._fxTransform);
	    element._fxTransform = fx.Transform.createRotation(theta, element._fxTransform);
	    element._fxTransform = fx.Transform.createTranslation(x, y, element._fxTransform);
	    parent.add(element._fxTransform);
	    return element;
	},

	translate: function(element, x, y) { // move to SVGTransform
	    // note that it's cumulative
	    var parent = element._fxTransform.getParent();
	    parent && parent.remove(element._fxTransform);
	    element._fxTransform = fx.Transform.createTranslation(x, y, element._fxTransform);
	    parent && parent.add(element._fxTransform);
	    return element;
	}

    }
}

fx.util.MouseAdapter = function() { }
fx.util.MouseAdapter.prototype = {
    mouseClicked: function(awtEvent, sgNode) { },
    mouseDragged: function(awtEvent, sgNode) { },
    mouseEntered: function(awtEvent, sgNode) { },
    mouseExited: function(awtEvent, sgNode) { },
    mouseMoved: function(awtEvent, sgNode) { },
    mousePressed: function(awtEvent, sgNode) { },
    mouseReleased: function(awtEvent, sgNode) { },
    mouseWheelMoved: function(awtEvent, sgNode) { }
}

fx.util.setInterval = function(callback, delay) {
    // env.js setInterval is not Swing-friendly
    var listener = new Packages.java.awt.event.ActionListener({
	actionPerformed: function(actionEvent) {
	    // transform actionEvent ?
	    callback.call(window, actionEvent);
	}
    });
    var timer = new fx.Timer(delay, listener);
    timer.start();
    return timer;
}

fx.Frame = function(width, height) {
    this.frame = new Packages.javax.swing.JFrame();
    this.frame.setSize(width, height);
    this.panel = new Packages.com.sun.scenario.scenegraph.JSGPanel();
    this.panel.setBackground(fx.Color.white);
    this.panel.setPreferredSize(new Packages.java.awt.Dimension(width, height));
    this.frame.add(this.panel);
}

fx.Frame.prototype.display = function(node) {
    this.panel.setScene(node);
    this.frame.pack();
    this.frame.setVisible(true);
}

// Here comes the SVG implementation
function SVGGElement() {
    this._fxGroup = new fx.Group();
}

Object.extend(SVGGElement.prototype, {
    _fxTransform: null, // 
    _fxGroup: null,
    _fxTop: function() {
	// transform may be applied to this group as a whole
	return this._fxTransform || this._fxGroup;
    }

});
// http://www.w3.org/TR/2003/REC-SVG11-20030114/painting.html#paint-att-mod
 var PaintModule = {
     
     _fxHandlePaint: function(attr, value) {
	 switch (attr) {
	 case "fill":
	     if (fx.Color[String(value)]) {
		 this._fxShape.setFillPaint(fx.Color[String(value)]);
		 return true;
	     } else {
		 console.log('unknown fill ' + value);
	     }
	 case "stroke":
	     // FIXME
	 }
	 
	 return false;
     }
}

function SVGRectElement() {
    this._fxShape = fx.util.antiAlias(new fx.Shape());
    this._fxShape.setShape(new fx.Rectangle(0,0,0,0));
    this._fxTransform = fx.Transform.createTranslation(0, 0, this._fxShape);
}

Object.extend(SVGRectElement.prototype, PaintModule);

Object.extend(SVGRectElement.prototype, {
    _fxTop: function() { // top node 
	return this._fxTransform;
    },

    setAttributeNS: function(ns, attr, value) {
	// ignore ns for now
	if (["x", "y", "width", "height"].include(attr)) {
	    this._fxShape.getShape()[attr] = Number(value); // FIXME parse units etc
	} else if (["fill", "stroke"].include(attr)) {
	    this._fxHandlePaint(attr, value);
	} else {
	    console.log('unknown attribute ' + attr  + " with value " + value);
	}
    }
});


function SVGEllipseElement() {
    this._fxShape = fx.util.antiAlias(new fx.Shape());
    this._fxShape.setShape(new fx.Ellipse(0,0,0,0));
    this._fxTransform = fx.Transform.createTranslation(0, 0, this._fxShape);
}

Object.extend(SVGEllipseElement.prototype, PaintModule);

Object.extend(SVGEllipseElement.prototype, {
    _fxTop: function() { // top node 
	return this._fxTransform;
    },
    
    setAttributeNS: function(ns, attr, value) {
	// FIXME: SVG uses cx, cy, rx, ry
	if (["x", "y", "width", "height"].include(attr)) {
	    this._fxShape.getShape()[attr] = Number(value); // FIXME parse units etc
	} else if (["fill", "stroke"].include(attr)) {
	    this._fxHandlePaint(attr, value);
	} else {
	    console.log('unknown attribute ' + attr  + " with value " + value);
	}
    }
});



function SVGPointList(node) {
    this.node = node;
    this._fxContents = [];
}

Object.extend(SVGPointList.prototype, {
    getItem: function(idx) {
	return this._fxContents[idx];
    },
    
    appendItem: function(point) {
	this._fxContents.push(point);
	var shape = this.node._fxShape.getShape();
	if (this._fxContents.length == 1) {
	    shape.moveTo(point.x, point.y);
	} else {
	    shape.lineTo(point.x, point.y);
	}
    },
    
    
});
    
SVGPointList.prototype.__defineGetter__("numberOfItems", function() {
    return this._fxContents.length;
});

function SVGPolygonElement() {
    this._fxShape = fx.util.antiAlias(new fx.Shape());
    this._fxShape.setShape(new fx.Path());
    this._fxTransform = fx.Transform.createTranslation(0, 0, this._fxShape);
    this.points = new SVGPointList(this);
}


Object.extend(SVGPolygonElement.prototype, PaintModule);

Object.extend(SVGPolygonElement.prototype, {
    _fxTop: function() { // top node 
	return this._fxTransform;
    },
    
    setAttributeNS: function(ns, attr, value) {
	// FIXME: SVG uses cx, cy, rx, ry
	if (["fill", "stroke"].include(attr)) {
	    this._fxHandlePaint(attr, value);
	} else {
	    console.log('unknown attribute ' + attr  + " with value " + value);
	}
    },

    close: function() { // FIXME: not SVG
	var shape = this._fxShape.getShape();
	shape.closePath();
    }

});



function SVGSVGElement() {
    this._fxGroup = new fx.Group();
}

Object.extend(SVGSVGElement.prototype, {
    appendChild: function(node) {
	this._fxGroup.add(node._fxTop());
    },
    
    removeChild: function(node) { // FIXME: proper exceptions?
	this._fxGroup.remove(node._fxTop());
    }

});

this.document = Object.extend({},  {
    createElementNS: function(ns, name) { // FIXME ns
	switch (name) {
	case "rect":
	    return new SVGRectElement();
	case "ellipse":
	    return new SVGEllipseElement();
	case "polygon":
	    return new SVGPolygonElement();
	default:
	    console.log("unknown element " + name);
	    return null;
	}
    }
});
// end of SVG impl

// example program

var browser = new fx.Frame(1024,500);
var canvas = new SVGSVGElement();
    
var shape = document.createElementNS(null, "ellipse");
shape.setAttributeNS(null, "x", 50); // FIXME
shape.setAttributeNS(null, "y", 50); // FIXME
shape.setAttributeNS(null, "width", 50); // FIXME
shape.setAttributeNS(null, "height", 50); // FIXME
shape.setAttributeNS(null, "fill", "BLUE");
canvas.appendChild(shape);

fx.util.addMouseListener(shape, "mousePressed", function(evt) { 
    console.log('mousePressed event ' + evt);
});


shape = document.createElementNS(null, "rect");
shape.setAttributeNS(null, "x", 150);
shape.setAttributeNS(null, "y", 150);
shape.setAttributeNS(null, "width", 50);
shape.setAttributeNS(null, "height", 50);

shape.setAttributeNS(null, "fill", "RED");
shape._fxShape.setDrawPaint(fx.Color.GREEN);

fx.util.setBorderWidth(shape._fxShape, 2);

fx.util.addMouseListener(shape, "mousePressed", function(evt) { 
    console.log('translated OK, event ' + evt);
});

canvas.appendChild(shape);

var star = document.createElementNS(null, "polygon");

function makeStarVertices(r, center, startAngle) { 
    // changes to account for lack of real points
    var vertices = [];
    var nVerts = 10;
    for (var i = 0; i <= nVerts; i++) {
	var theta = startAngle + (2*Math.PI/nVerts*i);
	var p = { x: r*Math.cos(theta), y: r*Math.sin(theta)};
	if (i%2 == 0) p = { x: p.x* 0.39, y: p.y*0.39}; // scaleBy
	vertices.push({ x: p.x + center.x, y: p.y + center.y});
    }
    return vertices; 
}
    
var verts = makeStarVertices(50, {x: 0, y:0}, 0);
for (var i = 0; i < verts.length; i++) {
    star.points.appendItem(verts[i]);
}
star.close(); // FIXME impure
star.setAttributeNS(null, "fill", "YELLOW");
canvas.appendChild(star);
fx.util.translate(star, 250, 100);
    
browser.display(canvas._fxGroup);

fx.util.setInterval(function() {
    fx.util.rotate(star, Math.PI/8, 250, 100);
}, 50);
