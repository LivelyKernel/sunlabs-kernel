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
load('../kernel/defaultconfig.js');
// our local config
Config.useTransformAPI = false;
Config.useGetTransformToElement = false;
Config.logDnD = true;

load('../kernel/Base.js');

load('dom/mico.js');
load('dom/dom2-core.js');
load('dom/dom2-events.js');
load('dom/dom2-html.js');
load('dom/svg1.1.js');
print('loaded DOM implementation in JS');

namespace('fx');

Object.extend(fx, {
    Panel: Packages.com.sun.scenario.scenegraph.JSGPanel,
    Group: Packages.com.sun.scenario.scenegraph.SGGroup,
    Parent: Packages.com.sun.scenario.scenegraph.SGFilter, // an intermediate node with one child
    Text: Packages.com.sun.scenario.scenegraph.SGText,
    Component: Packages.com.sun.scenario.scenegraph.SGComponent,
    Shape: Packages.com.sun.scenario.scenegraph.SGShape,
    Transform: Packages.com.sun.scenario.scenegraph.SGTransform,
    Clip: Packages.com.sun.scenario.scenegraph.SGClip,
    ShapeMode: Packages.com.sun.scenario.scenegraph.SGAbstractShape$Mode,
    Ellipse: Packages.java.awt.geom.Ellipse2D.Double,
    Point: Packages.java.awt.geom.Point2D.Double,
    RoundedRectangle: Packages.java.awt.geom.RoundRectangle2D.Double,
    Rectangle: Packages.java.awt.geom.Rectangle2D.Double,
    Font: Packages.java.awt.Font,
    Path: Packages.java.awt.geom.GeneralPath,
    Color: Packages.java.awt.Color,
    Gradient: Packages.java.awt.GradientPaint,
    Timer: Packages.javax.swing.Timer,
});

namespace('fx::util');

Object.extend(fx.util, {
    antiAlias: function(shape) {
	var hints = Packages.java.awt.RenderingHints;
	shape.setAntialiasingHint(hints.VALUE_ANTIALIAS_ON);
	return shape;
    },
    
    antiAliasText: function(shape) {
	var hints = Packages.java.awt.RenderingHints;
	shape.setAntialiasingHint(hints.VALUE_TEXT_ANTIALIAS_ON);
	return shape;
    },
    
    getShape: function(element) { // FIXME what about transforms
	return element._fxBegin.getChildren().get(0);
    },
    
    addMouseListener: function(node, eventName, handler) {
	    var adapter  = new fx.util.MouseAdapter();
	adapter[eventName] = function(awtEvent, sgNode) {
	    handler.call(this, awtEvent, sgNode);
	}
	var listenerClass = Packages.com.sun.scenario.scenegraph.event.SGMouseListener;
	node.addMouseListener(new listenerClass(adapter));
    },
    
    addKeyListener: function(node, eventName, handler) {
	var adapter  = new fx.util.KeyAdapter();
	adapter[eventName] = function(awtEvent, sgNode) {
	    handler.call(this, awtEvent, sgNode);
	}
	var listenerClass = Packages.com.sun.scenario.scenegraph.event.SGKeyListener;
	node.addKeyListener(new listenerClass(adapter));
    },
    
    dispatchMouseEvent: function(type, evt) {
	var event = new MouseEvent();
	event._type = type;
	event._shiftKey = evt.isShiftDown();
	event._altKey = evt.isAltDown();
	event._clientX = evt.getX();
	event._clientY = evt.getY();
	var result = document.documentElement.dispatchEvent(event);
    },
    
    dispatchKeyboardEvent: function(type, evt) {
	var event = new KeyboardEvent();
	event._type = type;
	event._keyCode = evt.getKeyCode();
	event._keyChar = evt.getKeyChar();
	var result = document.documentElement.dispatchEvent(event);
    },
    
    className: function(fxInstance) {
	return fxInstance ? String(fxInstance.getClass().getName()).split('.').last() : "null";
    },
    
    parentChain: function(fxInstance) {
	var parents = [];
	for (var p = fxInstance; p != null; p = p.getParent()) {
	    parents.push(p);
	}
	return parents;
    },
    
    setInterval: function(callback, delay) {
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
    },

    clearGroup: function(group) {
	var list = group.getChildren();
	if (list) {
	    for (var i = list.size() - 1; i >= 0; i--) {
		group.remove(list.get(i));
	    }
	}
	return group;
    }
});
    

Object.subclass('fx::util::MouseAdapter', {
    mouseClicked: Functions.Null,
    mouseDragged: Functions.Null,
    mouseEntered: Functions.Null,
    mouseExited: Functions.Null,
    mouseMoved: Functions.Null,
    mousePressed: Functions.Null,
    mouseReleased: Functions.Null,
    mouseWheelMoved: Functions.Null
});


Object.subclass('fx::util::KeyAdapter', {
    keyPressed: Functions.Null,
    keyReleased: Functions.Null,
    keyTyped: Functions.Null
});

Object.subclass('fx::Frame', {
    initialize: function(width, height) {
	this.frame = new Packages.javax.swing.JFrame();
	this.frame.setSize(width, height);
	this.panel = new Packages.com.sun.scenario.scenegraph.JSGPanel();
	this.panel.setBackground(fx.Color.white);
	this.panel.setPreferredSize(new Packages.java.awt.Dimension(width, height));
	this.frame.add(this.panel);
	var node = new fx.Parent();
	this.panel.setScene(node);

    },

    display: function(element) {
	var node = element._fxBegin;
	this.panel.getScene().setChild(node);
	fx.util.addMouseListener(node, "mouseMoved", function(evt) { 
	    fx.util.dispatchMouseEvent('mousemove', evt);
	});
	
	fx.util.addMouseListener(node, "mousePressed", function(evt) { 
	    //console.log('dispatch to node ' + node);
	    fx.util.dispatchMouseEvent('mousedown', evt);
	});
	
	fx.util.addMouseListener(node, "mouseReleased", function(evt) { 
	    fx.util.dispatchMouseEvent('mouseup', evt);
	});
	
	fx.util.addMouseListener(node, "mouseDragged", function(evt) { 
	    fx.util.dispatchMouseEvent('mousemove', evt);
	});
	
	fx.util.addKeyListener(node, "keyPressed", function(evt) { 
	    fx.util.dispatchKeyboardEvent('keydown', evt);
	});
	
	fx.util.addKeyListener(node, "keyTyped", function(evt) { 
	    fx.util.dispatchKeyboardEvent('keypress', evt);
	});
	
	fx.util.addKeyListener(node, "keyReleased", function(evt) { 
	    fx.util.dispatchKeyboardEvent('keyup', evt);
	});
	node.requestFocus();


	this.frame.pack();
	this.frame.setVisible(true);
    }
});
    
fx.dom = {
    queue: [],
    attrQueue: [],
    renderers: {},
    lookBehind: 50,
    render: function(element, optAttribute) {
	var renderer = this.renderers[element.constructor.tagName];
	return renderer && renderer(element, optAttribute);
    },
    
    enqueue: function(element, attribute) { 
	for (var i = Math.min(this.lookBehind, this.queue.length) - 1; i >= 0; i--) {
	    if (this.queue[i] === element) { 
		return;
	    }
	}
	this.queue.push(element);
	this.attrQueue.push(attribute);
	// trigger an update as soon as possible?
    },
    
    update: function() {
	var length = this.queue.length;
	//if (length > 5) console.log('queue was ' + length + " at " + new Date());
	//if (length < 10) console.log( 'queue ' + this.queue);
	while (this.queue.length > 0) {
	    var element = this.queue.pop();
	    var attribute = this.attrQueue.pop();
	    this.render(element, attribute);
	}
	return length;
    }
};

    
Function.wrapSetter(Attr.prototype, 'value', function(func, args) {
    func.apply(this, args);
    var name = this.name;
    // if it's non-graphical, don't render. Ideally we would check the namespace, but it doesn't work yet.
    if (name === 'id' || name === 'type') 
	return;
    if (this.value && this.ownerElement) {
	fx.dom.enqueue(this.ownerElement, this);
    }
});
 
window.setTimeout = function(action, delay) {
    var timer = fx.util.setInterval(function() {
	action.apply(this, arguments);
	fx.dom.update();
    }, delay);
    timer.setRepeats(false);
    return timer;
};


window.setInterval = function(action, delay) {
    return fx.util.setInterval(function() {
	action.apply(this, arguments);
	fx.dom.update();
    }, delay);
};


[SVGPolylineElement, SVGPolygonElement, SVGRectElement, SVGEllipseElement, SVGGElement].forEach(function(constr) {
    Function.wrap(constr.prototype, ['cloneNode'], function(func, args) {
	//console.log('cloning ' + (this.id || this.tagName));
	var begin = this._fxBegin;
	var end = this._fxEnd;
	delete this._fxBegin;
	delete this._fxEnd;
	var clone = func.apply(this, args);
	begin && (this._fxBegin = begin);
	end && (this._fxEnd = end);
	// Dan's code assumes that the property 'transform' is the same as the attribute 'transform',
	// but the former is an SVGAnimatedTransformList, the other is a string
	var tfm = this.getAttributeNS(null, "transform");
	if (tfm) {
	    clone.setAttributeNS(Namespace.SVG, "transform", tfm);
	    //console.log('!!tfm ' + tfm + ' field ' + (typeof clone.transform) + ", " + clone.transform);
	}
	return clone;
    });
});
		      
// scenegraph bindings to SVG

// http://www.w3.org/TR/2003/REC-SVG11-20030114/painting.html#paint-att-mod
var PaintModule = {
    attributes: ["stroke", "fill", "stroke-width", "fill-opacity"],
    
    parsePaint: function(color) {
	var rgb = Color.parse(String(color));
	if (rgb) {
	    return new fx.Color(rgb[0], rgb[1], rgb[2]);
	} else {
	    var name = String(color);
	    if (name == "none") return new fx.Color(0,0,0,0); // FIXME not strictly the same thing as no color
	    else if (name.startsWith("url")) { // FIXME specialcasing the gradients
		// parse uri
		var node = lk.FragmentURI.getElement(name);
		if (node && node.tagName == 'linearGradient') {
		    // go through stops
		    var x1 = node.x1.baseVal.value*100;
		    var x2 = node.x2.baseVal.value*100;
		    var y1 = node.y1.baseVal.value*100;
		    var y2 = node.y2.baseVal.value*100;
		    var stops = node.getElementsByTagNameNS(Namespace.SVG, "stop");
		    //console.log('got vector ' + [x1, y1, x2, y2] + ' stops ' + stops._nodes);
		    var c1 = stops.item(0) ? stops.item(0).getAttributeNS(null, "stop-color") : "white";
		    var c2 = stops.item(1) ? stops.item(1).getAttributeNS(null, "stop-color") : "gray";
		    return new fx.Gradient(x1, y1, this.parsePaint(c1), x2, y2, this.parsePaint(c2));
		} else {
		    // wait for radial paint until java 6
		    //console.log('unknown paint ' + id);
		    return new fx.Color(0,0,0,0); // FIXME not strictly the same thing as no color
		}
	    } else if (!fx.Color[name]) {
		console.log('unknown fill ' + value);
		return null;
	    } else return fx.Color[name];
	} 
    },

    renderAttribute: function(element, attr, value) {
	var shape = fx.util.getShape(element);
	switch (attr) {
	case "fill": {
	    var fill = PaintModule.parsePaint(value);
	    shape.setFillPaint(fill);
	    return true;
	}
	    
	case "fill-opacity": {
	    var fill = shape.getFillPaint();
	    if (Packages.java.lang.Class.forName('java.awt.Color').isInstance(fill)) {
		var alpha = parseFloat(value); // FIXME units
		// FIXME what if fill is not a color?
		var color = new fx.Color(fill.getRed()/255, fill.getGreen()/255, fill.getBlue()/255, alpha);
		shape.setFillPaint(color);
	    }
	    return true;
	}

	case "stroke-width": {
	    var BasicStroke = Packages.java.awt.BasicStroke;
	    var width = parseFloat(value); // FIXME units
	    if (width > 0) {
		shape.setDrawStroke(new BasicStroke(width,  
						    BasicStroke.CAP_ROUND,
						    BasicStroke.JOIN_MITER));
		
		shape.setMode(shape.getMode() === fx.ShapeMode.FILL ?  
			      fx.ShapeMode.STROKE_FILL : fx.ShapeMode.STROKE);
	    } else {
		if (shape.getMode() === fx.ShapeMode.STROKE_FILL)
		    shape.setMode(fx.ShapeMode.STROKE);
	    }
	    return true;
	}
	    
	case "stroke": {
	    var stroke = PaintModule.parsePaint(value);
	    shape.setDrawPaint(stroke);
	    return true;
	}
	default: 
	    return false;	     
	}
    }
}

fx.dom.renderers[SVGRectElement.tagName] = function(element) {
    if (!element._fxBegin) element._fxBegin = new fx.Parent();

    var shape = fx.util.antiAlias(new fx.Shape());

    // TODO optimize - use rounding if necessary
    shape.setShape(new fx.RoundedRectangle(element.x.baseVal.value,
					   element.y.baseVal.value,
					   element.width.baseVal.value,
					   element.height.baseVal.value,
					   element.rx.baseVal.value*2,
					   element.rx.baseVal.value*2));
    // can't really deal with rx != ry
//    console.log('rounding ' + [element.rx.baseVal.value, element.ry.baseVal.value]);
    element._fxBegin.setChild(shape);
    
    var attrs = element.attributes;
    for (var i = 0; i < attrs.length; i++) {
	var attr = attrs.item(i);
	if (PaintModule.attributes.include(attr.name)) {
	    PaintModule.renderAttribute(element, attr.name, attr.value);
	}
    }
    //element.parentNode && console.log('rendering ' + element.parentNode.id);
    return element._fxBegin;
}


fx.dom.renderers[SVGEllipseElement.tagName] = function(element) {
    if (!element._fxBegin) element._fxBegin = new fx.Parent();
    var cx = element.cx.baseVal.value;
    var cy = element.cy.baseVal.value;
    var rx = element.rx.baseVal.value;
    var ry = element.ry.baseVal.value;
    var shape = fx.util.antiAlias(new fx.Shape());

    shape.setShape(new fx.Ellipse(cx - rx, cy - ry, rx*2, ry*2));

    element._fxBegin.setChild(shape);

    var attrs = element.attributes;
    for (var i = 0; i < attrs.length; i++) {
	var attr = attrs.item(i);
	if (PaintModule.attributes.include(attr.name)) {
	    PaintModule.renderAttribute(element, attr.name, attr.value);
	}
    }
    element.parentNode && console.log('rendering ' + element.parentNode.id);
    return element._fxBegin;

}


fx.dom.renderers[SVGPolylineElement.tagName] =    
fx.dom.renderers[SVGPolygonElement.tagName] = function(element) {
    if (!element._fxBegin)
	element._fxBegin = new fx.Parent();
    var shape = fx.util.antiAlias(new fx.Shape());
    var path = new fx.Path();
    element._fxBegin.setChild(shape);
    shape.setShape(path);

    var attrs = element.attributes;
    for (var i = 0; i < attrs.length; i++) {
	var attr = attrs.item(i);
	if (PaintModule.attributes.include(attr.name)) {
	    PaintModule.renderAttribute(element, attr.name, attr.value);
	} else if (attr.name == 'points') {
	    for (var j = 0; j < element.points.numberOfItems; j++) {
		var point = element.points.getItem(j);
		if (j == 0) {
		    path.moveTo(point.x, point.y);
		} else {
		    path.lineTo(point.x, point.y);
		}
	    }
	    if (element.tagName === "polygon")
		path.closePath();
	} 
    }
    //console.log('rendering ' + element);
    return  element._fxBegin;
};

// b0rken but does something
fx.dom.renderers[SVGTextElement.tagName] = function(element) {
    if (!element._fxBegin)
	element._fxBegin = new fx.Parent();

    if (element._fxEnd) 
	fx.util.clearGroup(element._fxEnd);
    else 
	element._fxEnd = new fx.Group();

    var attrs = element.attributes;
    var fontSize = 12;
    for (var i = 0; i < attrs.length; i++) {
	var attr = attrs.item(i);
	switch (attr.name) {
	case "font-size":
	    //var font = text.getFont(); 
	    fontSize = parseFloat(attr.value);
	    break;
	}
    }

    var newFont = new fx.Font('Helvetica', fx.Font.PLAIN, fontSize);
    element.childNodes._nodes.forEach(function(node) {
	
	// FIXME FIXME FIXME
	if (node.localName == 'tspan') {
	    var text = fx.util.antiAliasText(new fx.Text());
	    text.setFont(newFont);
	    // use this for tspans?
	    text.setVerticalAlignment(Packages.com.sun.scenario.scenegraph.SGText$VAlign.BASELINE);
	    var origin = new fx.Point(node.getAttributeNS(null, "x") || 0, node.getAttributeNS(null, "y") || 0);
	    text.setLocation(origin);
	    text.setText(node.firstChild.nodeValue); 
	    element._fxEnd.add(text);
	}
    });

    element._fxBegin.setChild(element._fxEnd);
    return element._fxBegin;
};


[SVGSVGElement, SVGGElement].forEach(function(constr) {
    Function.wrap(constr.prototype, ["insertBefore", "appendChild"], function(func, args) {
	var result = func.apply(this, args);
	fx.dom.enqueue(this, null); 
	return result;
    });
});


[SVGSVGElement, SVGGElement].forEach(function(constr) {
    Function.wrap(constr.prototype, ["removeChild"], function(func, args) {
	var result = func.apply(this, args);
	fx.dom.enqueue(this, null);
	return result;
    });
});

fx.dom.renderers[HTMLHtmlElement.tagName] =
fx.dom.renderers[HTMLBodyElement.tagName] =
fx.dom.renderers[SVGSVGElement.tagName] =
fx.dom.renderers[SVGGElement.tagName] = function(element, attribute) {
    if (!element._fxBegin) element._fxBegin = new fx.Parent();
    if (element._fxEnd) 
	fx.util.clearGroup(element._fxEnd);
    else 
	element._fxEnd = new fx.Group();
    
    var fxObj = element._fxEnd; // grow it from the end up
    element.childNodes._nodes.forEach(function(node) {
	var fxChild = node._fxBegin || fx.dom.render(node);
	if (fxChild) fxObj.add(fxChild);
    });

    if (element.transform) { 
	var list = element.transform.baseVal;
	for (var i = list.numberOfItems - 1; i >= 0; i--) {
	    var transform = list.getItem(i);
	    if (transform.type == SVGTransform.SVG_TRANSFORM_TRANSLATE) {
		fxObj = new fx.Transform.createTranslation(transform.matrix.e, transform.matrix.f, fxObj);
	    } else if (transform.type == SVGTransform.SVG_TRANSFORM_SCALE) {
		fxObj = new fx.Transform.createScale(transform.matrix.a, transform.matrix.d, fxObj);
	    } else if (transform.type == SVGTransform.SVG_TRANSFORM_ROTATE) {
		fxObj = new fx.Transform.createRotation(transform.angle.toRadians(), fxObj);
	    }
	}
    } 
	
    var clip = element.getAttributeNS(null, "clip-path");
    if (clip) {
	var node = lk.FragmentURI.getElement(clip);
	if (node) {
	    var clips = node.getElementsByTagNameNS(Namespace.SVG, "rect");
	    if (clips.length > 0) {
		var clipRect = clips.item(0);
		var save = fxObj;
		var fxObj = new fx.Clip();
		fxObj.setShape(new fx.Rectangle(clipRect.x.baseVal.value, clipRect.y.baseVal.value,
						clipRect.width.baseVal.value, clipRect.height.baseVal.value));
		fxObj.setChild(save);
	    } else 
		console.log("cannot deal with non-rect clip region");
	}
    }

    element._fxBegin.setChild(fxObj);
    
    //console.log('rendering ' + element);
    return element._fxBegin;
};


var SVGForeignObjectElement = SVGElement.defineElement('foreignObject', [SVGTransformable, SVGStylable], 
    {name:'x',      type:SVGAnimatedLength, readonly:true, defaultValue:'0'},
    {name:'y',      type:SVGAnimatedLength, readonly:true, defaultValue:'0'},
    {name:'width',  type:SVGAnimatedLength, readonly:true, defaultValue:'100%'},
    {name:'height', type:SVGAnimatedLength, readonly:true, defaultValue:'100%'}
);

SVGForeignObjectElement.prototype._fxSetComponent = function(component) {
    if (!this._fxComponent) {
	this._fxComponent = new fx.Component();
    }
    this._fxComponent.setComponent(component);
    fx.dom.enqueue(this, null);
};


fx.dom.renderers[SVGForeignObjectElement.tagName] = function(element, attribute) {
    if (!element._fxBegin) element._fxBegin = new fx.Parent();
    console.log('render foreign object ' + element + " on " + attribute);
    // update size here, if necessary
    if (element._fxComponent) 
	element._fxBegin.setChild(element._fxComponent);
};

// end of SVG impl


