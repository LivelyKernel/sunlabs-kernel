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

load('../kernel/JSON.js');
load('../kernel/miniprototype.js'); 
load('dom/mico.js');
load('dom/dom2-core.js');
load('dom/dom2-events.js');
load('dom/dom2-html.js');
load('dom/svg1.1.js');
print('loaded DOM implementation in JS');

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
	    // note that it's cumulative, we end up creating a lot of transforms, hence stack overflows etc
	    // instead, calculate a single cumulative transform and replace the original
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

// scenegraph bindings to SVG

// http://www.w3.org/TR/2003/REC-SVG11-20030114/painting.html#paint-att-mod
var PaintModule = {
     attributes: ["stroke", "fill", "stroke-width"],
     _fxHandlePaint: function(attr, value) {
	 switch (attr) {
	 case "fill":
	     if (fx.Color[String(value)]) {
		 this._fxShape.setFillPaint(fx.Color[String(value)]);
		 return true;
	     } else {
		 console.log('unknown fill ' + value);
		 break;
	     }
	 case "stroke-width": {
	     var BasicStroke = Packages.java.awt.BasicStroke;
	     var shape = this._fxShape;
	     shape.setDrawStroke(new BasicStroke(Number(value),  // FIXME conv, units, etc.
						 BasicStroke.CAP_ROUND,
						 BasicStroke.JOIN_MITER));
	     //console.log('paint ' + shape.getDrawPaint() + " mode " + shape.getMode());
             shape.setMode(shape.getMode() === fx.ShapeMode.FILL ?  
			   fx.ShapeMode.STROKE_FILL : fx.ShapeMode.STROKE);
	     return true;
	 }
	     
	 case "stroke": {
	     if (fx.Color[String(value)]) {
		 this._fxShape.setDrawPaint(fx.Color[String(value)]);
		 return true;
	     } else {
		 console.log('unknown stroke ' + value);
		 break;
	     }
	 }
	 default: 
	     return false;	     
     }
     }
}


Object.extend(SVGRectElement.prototype, PaintModule);
Object.extend(SVGRectElement.prototype, {
    _fxInit: function() {
	this._fxShape = fx.util.antiAlias(new fx.Shape());
	this._fxShape.setShape(new fx.Rectangle(0,0,0,0));
	this._fxTransform = fx.Transform.createTranslation(0, 0, this._fxShape);
    },

    _fxTop: function() { // top node 
	return this._fxTransform;
    },

    setAttributeNS: function(ns, attr, value) {
	// ignore ns for now
	if (["x", "y", "width", "height"].include(attr)) {
	    this._fxShape.getShape()[attr] = Number(value); // FIXME parse units etc
	} else if (PaintModule.attributes.include(attr)) {
	    this._fxHandlePaint(attr, value);
	} else {
	    console.log('unknown attribute ' + attr  + " with value " + value);
	}
    }
});


Object.extend(SVGEllipseElement.prototype, PaintModule);
Object.extend(SVGEllipseElement.prototype, {
    _fxInit: function() {
	this._fxShape = fx.util.antiAlias(new fx.Shape());
	this._fxShape.setShape(new fx.Ellipse(0,0,0,0));
	this._fxTransform = fx.Transform.createTranslation(0, 0, this._fxShape);
    },

    _fxTop: function() { // top node 
	return this._fxTransform;
    },
    
    setAttributeNS: function(ns, attr, value) {
	// FIXME: SVG uses cx, cy, rx, ry
	if (["x", "y", "width", "height"].include(attr)) {
	    this._fxShape.getShape()[attr] = Number(value); // FIXME parse units etc
	} else if (PaintModule.attributes.include(attr)) {
	    this._fxHandlePaint(attr, value);
	} else {
	    console.log('unknown attribute ' + attr  + " with value " + value);
	}
    }
});

Object.extend(SVGPolygonElement.prototype, PaintModule);
Object.extend(SVGPolygonElement.prototype, {

    _fxInit: function() {
	this._fxShape = fx.util.antiAlias(new fx.Shape());
	this._fxShape.setShape(new fx.Path());
	this._fxTransform = fx.Transform.createTranslation(0, 0, this._fxShape);
    },

    _fxTop: function() { // top node 
	return this._fxTransform;
    },

    _fxMakePath: function() {
	var path = this._fxShape.getShape();
	for (var i = 0; i < this.points.numberOfItems; i++) {
	    var point = this.points.getItem(i);
	    if (i == 0) {
		path.moveTo(point.x, point.y);
	    } else {
		path.lineTo(point.x, point.y);
	    }
	}
	path.closePath();
    },
    
    setAttributeNS: function(ns, attr, value) {
	// FIXME: SVG uses cx, cy, rx, ry
	if (PaintModule.attributes.include(attr)) {
	    this._fxHandlePaint(attr, value);
	} else {
	    console.log('unknown attribute ' + attr  + " with value " + value);
	}
    }

});

Object.extend(SVGSVGElement.prototype, {
    _fxInit: function() {
	this._fxGroup = new fx.Group();
    }
});


Object.extend(SVGSVGElement.prototype, {
    _fxAppendChild: function(node) {
	this._fxGroup.add(node._fxTop());
    },
    
    _fxRemoveChild: function(node) { // FIXME: proper exceptions?
	this._fxGroup.remove(node._fxTop());
    }

});
    
// end of SVG impl
