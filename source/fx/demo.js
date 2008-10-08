/*
 * Copyright � 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 



var window = {}
load('../kernel/rhino-compat.js');
this.console = window.console;

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
    Color: Packages.java.awt.Color,
    Timer: Packages.javax.swing.Timer,
    util: {
	antiAlias: function(shape) {
	    var hints = Packages.java.awt.RenderingHints;
	    shape.setAntialiasingHint(hints.VALUE_ANTIALIAS_ON);
	    return shape;
	},
	setBorderWidth: function(shape, width) {
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
	    shape.addMouseListener(jAdapter);
	},

	rotate: function(element, theta, x, y) {
	    // note that it's cumulative
	    var parent = element._fxTransform.getParent();
	    parent.remove(element._fxTransform);
	    element._fxTransform = fx.Transform.createTranslation(-x, -y, element._fxTransform);
	    element._fxTransform = fx.Transform.createRotation(theta, element._fxTransform);
	    element._fxTransform = fx.Transform.createTranslation(x, y, element._fxTransform);
	    parent.add(element._fxTransform);
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

function SVGRectElement() {
    this._fxShape = fx.util.antiAlias(new fx.Shape());
    this._fxShape.setShape(new fx.Rectangle(0,0,0,0));
    this._fxTransform = fx.Transform.createTranslation(0, 0, this._fxShape);
}

Object.extend(SVGRectElement.prototype, {
    _fxTop: function() { // top node 
	return this._fxTransform;
    },

    setAttributeNS: function(ns, attr, value) {
	// ignore ns for now
	if (["x", "y", "width", "height"].include(attr)) {
	    this._fxShape.getShape()[attr] = Number(value); // FIXME parse units etc
	} else {
	    console.log('unknown attribute ' + attr  + " with value " + value);
	}
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

// end of SVG impl

// example program

var browser = new fx.Frame(1024,500);
var canvas = new SVGSVGElement();
    
var shape = new fx.Shape();
shape.setShape(new fx.Ellipse(50, 50, 50, 50));
shape.setFillPaint(fx.Color.BLUE);
fx.util.antiAlias(shape);
canvas._fxGroup.add(shape);
fx.util.addMouseListener(shape, "mousePressed", function(evt) { 
    console.log('mousePressed event ' + evt);
});


var shape = new SVGRectElement();
shape.setAttributeNS(null, "x", 150);
shape.setAttributeNS(null, "y", 150);
shape.setAttributeNS(null, "width", 50);
shape.setAttributeNS(null, "height", 50);

shape._fxShape.setFillPaint(fx.Color.RED);
shape._fxShape.setDrawPaint(fx.Color.GREEN);

fx.util.setBorderWidth(shape._fxShape, 2);

canvas.appendChild(shape);

browser.display(canvas._fxGroup);

fx.util.setInterval(function() {
    fx.util.rotate(shape, Math.PI/8, 150, 150);
}, 1000);
