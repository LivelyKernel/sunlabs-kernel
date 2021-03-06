/*
 * Copyright (c) 2006-2009 Sun Microsystems, Inc.
 *
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
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
//Config.fakeFontMetrics = false;
//Config.fontMetricsFromSVG = true;
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
    Clip:  Packages.com.sun.scenario.scenegraph.SGClip,
    Image: Packages.com.sun.scenario.scenegraph.SGImage,
    ShapeMode: Packages.com.sun.scenario.scenegraph.SGAbstractShape$Mode,
    Ellipse: Packages.java.awt.geom.Ellipse2D.Double,
    Point: Packages.java.awt.geom.Point2D.Double,
    RoundedRectangle: Packages.java.awt.geom.RoundRectangle2D.Double,
    Rectangle: Packages.com.sun.scenario.scenegraph.SGRectangle,
    Font: Packages.java.awt.Font,
    Path: Packages.java.awt.geom.GeneralPath,
    Color: Packages.java.awt.Color,
    LinearGradient: Packages.com.sun.javafx.scene.paint.LinearGradientPaint,
    RadialGradient: Packages.com.sun.javafx.scene.paint.RadialGradientPaint,
    Timer: Packages.javax.swing.Timer,
});

namespace('fx.util');

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
    
    addMouseListener: function(node, eventName, handler) {
	var adapter  = new fx.util.MouseAdapter();
	adapter[eventName] = function(awtEvent, sgNode) {
	    handler.call(this, awtEvent, sgNode);
	}
	var listenerClass = Packages.com.sun.scenario.scenegraph.event.SGMouseListener;
	node.addMouseListener(new JavaAdapter(listenerClass, adapter));
    },
    
    addKeyListener: function(node, eventName, handler) {
	var adapter  = new fx.util.KeyAdapter();
	adapter[eventName] = function(awtEvent, sgNode) {
	    handler.call(this, awtEvent, sgNode);
	}
	var listenerClass = Packages.com.sun.scenario.scenegraph.event.SGKeyListener;
	node.addKeyListener(new JavaAdapter(listenerClass, adapter));
    },
    
    dispatchMouseEvent: function(type, evt, node) {
	var event = new MouseEvent();
	event._type = type;
	event._shiftKey = evt.isShiftDown();
	event._altKey = evt.isAltDown();
	var point = evt.getPoint();
	var source = evt.getSource();
	//var loc = source.getLocation();
	//if (type == 'mousedown') console.log('origin is ' + pt(point.getX(), point.getY()) + " source " + source);
					     
	event._clientX = point.getX();
	event._clientY = point.getY();
	var result = document.documentElement.dispatchEvent(event);
	fx.dom.update();
    },
    
    dispatchKeyboardEvent: function(type, evt) {
	var event = new KeyboardEvent();
	event._type = type;
	event._keyCode = evt.getKeyCode();
	event._keyChar = evt.getKeyChar();
	var result = document.documentElement.dispatchEvent(event);
	fx.dom.update();
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
	var listener = new JavaAdapter(Packages.java.awt.event.ActionListener, {
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
    },


    isInstanceOf: function(object, fxClassName) {
	return Packages.java.lang.Class.forName(fxClassName).isInstance(object);
    }

});
    

Object.subclass('fx.util.MouseAdapter', {
    mouseClicked: Functions.Null,
    mouseDragged: Functions.Null,
    mouseEntered: Functions.Null,
    mouseExited: Functions.Null,
    mouseMoved: Functions.Null,
    mousePressed: Functions.Null,
    mouseReleased: Functions.Null,
    mouseWheelMoved: Functions.Null
});


Object.subclass('fx.util.KeyAdapter', {
    keyPressed: Functions.Null,
    keyReleased: Functions.Null,
    keyTyped: Functions.Null
});

Object.subclass('fx.Frame', {
    initialize: function(width, height, applet) {
	this.frame = applet || new Packages.javax.swing.JFrame();
	this.frame = applet ? applet.getPlatformApplet() :  new Packages.javax.swing.JFrame();
	if (!applet)
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
	    fx.util.dispatchMouseEvent('mousedown', evt, node);
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

	if (!fx.util.isInstanceOf(this.frame, 'java.applet.Applet')) {
	    this.frame.pack();
	    this.frame.setVisible(true);
	}
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

Function.wrap(Element.prototype, ['removeAttributeNS'], function(func, args) {
    func.apply(this, args);
    fx.dom.enqueue(this);
});
 

 // FIXME, apply to all the other elements?
Function.wrap(SVGPolygonElement.prototype, ['removeAttributeNS'], function(func, args) {
    func.apply(this, args);
    fx.dom.enqueue(this);
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
    
    parseColor: function(color) {
	if (color == "none") return  new fx.Color(0,0,0, 0); // FIXME not strictly the same thing as no color
	if (color == "") return new fx.Color(1,1,1);
	var rgb = Color.parse(color);
	if (rgb) return new fx.Color(rgb[0], rgb[1], rgb[2]);
	else if (Color[color]) return fx.Color[color]; // if LK defines a constant, then FX should have it too
	else return null;
    },

    guessBBExtent: function(element) {
	if (element.tagName == "ellipse") {
	    return pt(element.rx.baseVal.value*2, element.ry.baseVal.value*2);
	} else if (element.width) {
	    return pt(element.width.baseVal.value, element.height.baseVal.value);
	} else return null;
    },


    parsePaint: function(paintString, target) {
	var name = String(paintString);
	var color = this.parseColor(name);
	if (color) return color;
	else if (name.startsWith("url")) { // FIXME specialcasing the gradients
	    // parse uri
	    var node = lively.data.FragmentURI.getElement(name);
	    if (node && node.tagName == 'linearGradient') {
		// go through stops
		// FIXME gradients are in user space in fx!
		var x1 = node.x1.baseVal.value;
		var y1 = node.y1.baseVal.value;
		var x2 = node.x2.baseVal.value;
		var y2 = node.y2.baseVal.value;
		if (target) {
		    var ext = this.guessBBExtent(target);
		    if (ext) {
			x1 *= ext.x;
			y1 *= ext.y;
			x2 *= ext.x;
			y2 *= ext.y;
		    }
		}
		var start = new fx.Point(x1, y1);
		var end = new fx.Point(x2, y2);
		var stops = node.getElementsByTagNameNS(Namespace.SVG, "stop");
		var colors = stops.map(function(stop) {
		    return this.parsePaint(stop.getAttributeNS(null, "stop-color"));
		}, this);
		var offsets = stops.map(function(stop) {
		    return parseFloat(stop.getAttributeNS(null, "offset"));
		});
		return new fx.LinearGradient(start, end, offsets, colors);
	    } else if (node && node.tagName == 'radialGradient') {
		//var center = new fx.Point(node.fx.baseVal.value, node.fy.baseVal.value);
		var center = new fx.Point(0,0);
		var r = node.r.baseVal.value;
		if (target) { 
		    var ext = this.guessBBExtent(target);
		    r = ext.x/2; //FIXME?
		}
		//var stops = node.getElementsByTagNameNS(Namespace.SVG, "stop");
		var stops = Object.extend(node.getElementsByTagNameNS(Namespace.SVG, "stop"), Enumerable);
		var colors = stops.map(function(stop) {
		    return this.parsePaint(stop.getAttributeNS(null, "stop-color"));
		}, this);
		var offsets = stops.map(function(stop) {
		    return parseFloat(stop.getAttributeNS(null, "offset"));
		});
		return new fx.RadialGradient(center, r, offsets, colors);
	    } else {
		// wait for radial paint until java 6
		//console.log('unknown paint ' + id);
		return new fx.Color(0,0,0,0); // FIXME not strictly the same thing as no color
	    }
	} else {
	    console.log('unknown fill ' + paintString);
	    return null;
	}
    },

    render: function(element) {
	var attrs = element.attributes;
	var shape = element._fxShape;
	var fillOpacity = NaN;
	var strokeOpacity = NaN;
	    

	var fillOpacityAttr = attrs.getNamedItem('fill-opacity');
	if (fillOpacityAttr) fillOpacity = parseFloat(fillOpacityAttr.value);

	
	var fillAttr = attrs.getNamedItem('fill');
	if (fillAttr && fillAttr.value) this.renderFill(element, shape, fillAttr.value, fillOpacity);

	var strokeOpacityAttr = attrs.getNamedItem('stroke-opacity');
	if (strokeOpacityAttr) strokeOpacity = parseFloat(strokeOpacityAttr.value);
	
	var strokeAttr = attrs.getNamedItem('stroke');
	if (strokeAttr && strokeAttr.value) this.renderStroke(element, shape, strokeAttr.value, strokeOpacity);

	var strokeWidthAttr = attrs.getNamedItem('stroke-width');
	if (strokeWidthAttr && strokeWidthAttr.value) this.renderStrokeWidth(element, shape, strokeWidthAttr.value);

    },

    renderFill: function(element, shape, value, alpha) {
	var fxPaint = PaintModule.parsePaint(value, element);
	if (!isNaN(alpha) && fx.util.isInstanceOf(fxPaint, 'java.awt.Color')) {
	    // FIXME what if fill is not a color?
	    fxPaint = new fx.Color(fxPaint.getRed()/255, fxPaint.getGreen()/255, fxPaint.getBlue()/255, alpha);
	}
	shape.setFillPaint(fxPaint);
	return fxPaint;
    },

    renderStroke: function(element, shape, value, alpha) {
	var fxPaint = PaintModule.parsePaint(value, element);
	if (fx.util.isInstanceOf(fxPaint, 'java.awt.Color')) {
	    if (!isNaN(alpha)) {
		// FIXME what if fill is not a color?
		fxPaint = new fx.Color(fxPaint.getRed()/255, fxPaint.getGreen()/255, fxPaint.getBlue()/255, alpha);
	    }  
	} 
	shape.setDrawPaint(fxPaint);
	return fxPaint;
    },
    
    renderStrokeWidth: function(element, shape, value) {
	var BasicStroke = Packages.java.awt.BasicStroke;
	var width = parseFloat(value); // FIXME units
	if (width > 0) {
	    shape.setDrawStroke(new BasicStroke(width, BasicStroke.CAP_ROUND, BasicStroke.JOIN_MITER));
	    shape.setMode(shape.getMode() === fx.ShapeMode.FILL ?  
			  fx.ShapeMode.STROKE_FILL : fx.ShapeMode.STROKE);
	} else {
	    if (shape.getMode() === fx.ShapeMode.STROKE_FILL)
		shape.setMode(fx.ShapeMode.STROKE);
	}
	return true;
    }
    
}

fx.dom.renderers[SVGRectElement.tagName] = function(element) {
    if (!element._fxBegin) element._fxBegin = new fx.Parent();

    var shape = fx.util.antiAlias(new fx.Shape());
    shape.setDrawPaint(null); // do not stroke until told so
    element._fxShape = shape;

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

    PaintModule.render(element);

    //element.parentNode && console.log('rendering ' + element.parentNode.id);
    return element._fxBegin;
}


fx.dom.renderers[SVGEllipseElement.tagName] = function(element, attr) {
    if (!element._fxBegin) element._fxBegin = new fx.Parent();
    var cx = element.cx.baseVal.value;
    var cy = element.cy.baseVal.value;
    var rx = element.rx.baseVal.value;
    var ry = element.ry.baseVal.value;
    var shape = fx.util.antiAlias(new fx.Shape());
    shape.setDrawPaint(null); // do not stroke until told so

    element._fxShape = shape;

    shape.setShape(new fx.Ellipse(cx - rx, cy - ry, rx*2, ry*2));
    
    element._fxBegin.setChild(shape);

    PaintModule.render(element);

    //element.parentNode && console.log('rendering ' + element.parentNode.id);
    return element._fxBegin;

}


fx.dom.renderers[SVGPolylineElement.tagName] =    
fx.dom.renderers[SVGPolygonElement.tagName] = function(element) {
    if (!element._fxBegin) element._fxBegin = new fx.Parent();
    var fxObj = fx.util.antiAlias(new fx.Shape());
    fxObj.setDrawPaint(null); // do not stroke until told so

    element._fxShape = fxObj;
    var path = new fx.Path();
    fxObj.setShape(path);

    // this prolly should apply uniformly to all
    var visibility = element.attributes.getNamedItem('display');
    if (visibility && visibility.value == 'none')
	fxObj.setVisible(false);
    else 
	fxObj.setVisible(true);


    PaintModule.render(element);
    var attr = element.attributes.getNamedItem("points");
    if (attr) {
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
    if (element.transform) { 
	fxObj = TransformsModule.newTransform(element.transform, fxObj);
    } 

    element._fxBegin.setChild(fxObj);

    //console.log('rendering ' + element);
    return  element._fxBegin;
};

// b0rken but does something
fx.dom.renderers[SVGTextElement.tagName] = function(element, attr) {
    if (!element._fxBegin)
	element._fxBegin = new fx.Parent();

    if (element._fxEnd) 
	fx.util.clearGroup(element._fxEnd);
    else 
	element._fxEnd = new fx.Group();

    var attrs = element.attributes;
    var fontSize = 12;
    var fontFamily = 'Helvetica';
    for (var i = 0; i < attrs.length; i++) {
	var attr = attrs.item(i);
	switch (attr.name) {
	case "font-size":
	    fontSize = parseFloat(attr.value);
	    break;
	case "font-family":
	    fontFamily = attr.value;
	    break;

	}
    }

    var fillAttr = element.getAttributeNS(null, "fill");
    var textColor = null;
    if (fillAttr) {
	textColor = PaintModule.parseColor(fillAttr);
    }


    var newFont = new fx.Font(fontFamily, fx.Font.PLAIN, fontSize);
    element.getElementsByTagNameNS(Namespace.SVG, 'tspan').each(function(node) {
	var text = fx.util.antiAliasText(new fx.Text());
	textColor && text.setFillPaint(textColor);
	text.setFont(newFont);
	// use this for tspans?
	text.setVerticalAlignment(Packages.com.sun.scenario.scenegraph.SGText$VAlign.BASELINE);
	var origin = new fx.Point(node.getAttributeNS(null, "x") || 0, node.getAttributeNS(null, "y") || 0);
	text.setLocation(origin);
	text.setText(node.firstChild.nodeValue); 
	element._fxEnd.add(text);
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

var FilterModule = {
    newEffect: function(filterUri, element) {
	// the implementation goes here:
	var effect = lively.data.FragmentURI.getElement(filterUri).firstChild;
	//console.log('found filter ' + effect);
	if (effect.localName == 'feGaussianBlur') {
	    fx.dom.render(effect);
	    var fxNode = new Packages.com.sun.scenario.scenegraph.SGEffect();
	    fxNode.setEffect(effect._fxFilter);
	    return fxNode;
	} else return null;
    }
};

 var TransformsModule = {
     newTransform: function(transform, fxObj) {
	 var list = transform.baseVal;
	 for (var i = list.numberOfItems - 1; i >= 0; i--) {
	     var transform = list.getItem(i);
	     switch (transform.type) {
	     case SVGTransform.SVG_TRANSFORM_TRANSLATE:
		 fxObj = new fx.Transform.createTranslation(transform.matrix.e, transform.matrix.f, fxObj);
		 break;
	     case SVGTransform.SVG_TRANSFORM_SCALE:
		 fxObj = new fx.Transform.createScale(transform.matrix.a, transform.matrix.d, fxObj);
		 break;
	     case SVGTransform.SVG_TRANSFORM_ROTATE:
		 fxObj = new fx.Transform.createRotation(transform.angle.toRadians(), fxObj);
		 break;
	     default:
		 console.log('unhandled transform ' + transform);
	     }
	 }
	 return fxObj;
     }


 };


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

    // this should prolly apply to all elements
    var visibility = element.attributes.getNamedItem('display');
    if (visibility && visibility.value == 'none')
	element._fxBegin.setVisible(false);
    else 
	element._fxBegin.setVisible(true);


    // note, we only support filters on <g> elements
    var effectElement = element.getAttributeNS(null, "filter");
    if (effectElement) { 
	var save = fxObj;
	var effectNode = FilterModule.newEffect(effectElement, element);
	if (effectNode) {
	    fxObj = effectNode;
	    if (fxObj !== save) {
		fxObj.setChild(save);
	    }
	}
    }

    var clip = element.getAttributeNS(null, "clip-path");
    if (clip) {
	var node = lively.data.FragmentURI.getElement(clip);
	if (node) {
	    var clips = node.getElementsByTagNameNS(Namespace.SVG, "rect");
	    if (clips.length > 0) {
		var clipRect = clips.item(0);
		var save = fxObj;
		var fxObj = new fx.Clip();
		var rect = new fx.Rectangle();
		rect.setX(clipRect.x.baseVal.value);
		rect.setY(clipRect.y.baseVal.value);
		rect.setWidth(clipRect.width.baseVal.value);
		rect.setHeight(clipRect.height.baseVal.value);
		fxObj.setClipNode(rect);
		fxObj.setChild(save);
	    } else 
		console.log("cannot deal with non-rect clip region");
	}
    }

    if (element.transform) { 
	fxObj = TransformsModule.newTransform(element.transform, fxObj);
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
    //console.log('render foreign object ' + element + " on " + attribute);
    // update size here, if necessary
    if (element._fxComponent) 
	element._fxBegin.setChild(element._fxComponent);
};


fx.dom.renderers[SVGImageElement.tagName] = function(element) {
    if (!element._fxBegin) { 
	element._fxBegin = new fx.Parent();
	var img = new fx.Image();
	element._fxBegin.setChild(img);
	var width = parseFloat(element.getAttribute("width")) || 0.0;
	var height = parseFloat(element.getAttribute("height")) || 0.0;
	var path = element.getAttributeNS(Namespace.XLINK, "href");
	if (path) {
	    var relativePath = path.match("^http://localhost/(.*)$");
	    //console.log('relative path ' + relativePath[1]);
	    // FIXME: the following image translation is of course
	    // bogus, but it matches the rest of the FX port for now
	    var file = new Packages.java.io.File("../kernel/" + relativePath[1]); 
	    var awtImage = Packages.javax.imageio.ImageIO.read(file);
	    var imgWidth = awtImage.getWidth();
	    var imgHeight = awtImage.getHeight();
	    if ((imgWidth > 0 && imgWidth != width) || (imgHeight > 0 && imgHeight != height)) {
		//console.log('scaling image from ' + [imgWidth, imgHeight] + ' to ' + [width, height]);
		awtImage = awtImage.getScaledInstance(width, height, awtImage.SCALE_DEFAULT);
	    }
	    img.setImage(awtImage);
	    
	}
    }
    return element._fxBegin;
}

fx.dom.renderers[SVGFEGaussianBlurElement.tagName] = function(element) {
    if (!element._fxFilter) {
	element._fxFilter = new Packages.com.sun.scenario.effect.GaussianBlur(); 
    }
    var radius = parseFloat(element.getAttributeNS(null, "stdDeviation"));
    if (radius < 1) radius = 1;
    element._fxFilter.setRadius(parseFloat(radius));
    //console.log('upated feGaussianBlur to ' + radius);
}


fx.dom.renderers[SVGPathElement.tagName] = function(element, attr) {
    if (!element._fxBegin) { 
	element._fxBegin = new fx.Parent();
    }

    var fxObj = fx.util.antiAlias(new fx.Shape());
    element._fxShape = fxObj;
    var path = new fx.Path();
    fxObj.setShape(path);

    PaintModule.render(element);
    var attr = element.attributes.getNamedItem("d");
    if (attr && attr.value) {
	var items = attr.value.split(' '); 
	// FIXME this is not real parsing but it works for the attr values that our implementation creates
	for (var i = 0; i < items.length; i++) {
	    var seg = items[i];
	    switch (seg[0]) {
	    case "M":
		var coords = seg.substring(1).split(',').map(function (str) { return parseFloat(str) });
		path.moveTo(coords[0], coords[1]);
		break;
	    case 'L':
		var coords = seg.substring(1).split(',').map(function (str) { return parseFloat(str) });
		path.lineTo(coords[0], coords[1]);
		break;
	    case 'Q':
		var coords = seg.substring(1).split(',').map(function (str) { return parseFloat(str) });
		path.quadTo(coords[0], coords[1], coords[2], coords[3]);
		break;
	    default:
		console.log('unknown seg ' + seg);
	    }
	}
    }


    element._fxBegin.setChild(fxObj);

    return element._fxBegin;
    //console.log('upated feGaussianBlur to ' + radius);
}

// end of SVG impl


Object.subclass('Audio', { // stubbed out HTML5 Audio
    volume: 0,
    _src: null,
    currentNote: -1,
    currentTime: 0.0,

    get src() {
	return this._src;
    },

    set src(value) {
	this._src = value;
    },

    load: function() {
	// now load
    },

    initialize: function(src) {
	this._src = src;
	var synth = Packages.javax.sound.midi.MidiSystem.getSynthesizer();
	synth.open();
	var channels = synth.getChannels();
	this.channel = channels[1];
	// FIXME close on unload?
    },
    
    play: function() {
	// currently we ignore the URL and use the query part to encode MIDI parameters
	var query = this._src && this._src.match(/.*\?(.*)/);
	if (!query) return;
	var pairs = query[1].split('&');
	var dict = {};
	for (var i = 0; i < pairs.length; i++)  {
	    var pair = pairs[i].split('=');
	    dict[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
	}
	const baseOctave = 3;
	var noteNumberString = dict['noteNumber'];
	if (noteNumberString) {
	    this.currentNote = parseInt(noteNumberString) - 1 + baseOctave*12;
	    var velocity = parseInt(dict['velocity'] || "200");
	    this.channel.noteOn(this.currentNote, velocity);
	}
    },

    pause: function() {
	this.channel.noteOff(this.currentNote);
    }

});


Object.extend(SVGTextElement.prototype, {
    getNumberOfChars: function () { TODO(); },
    getComputedTextLength: function() { TODO(); },
    getSubStringLength: function(charnum, nchars) { TODO(); },
    getStartPositionOfChar: function(charnum) { 
	// get the FontRenderContext,
	// call font.getStringBounds(this.content
	//console.log('text is ' + (this._fxEnd && this._fxEnd.getChildren()));
	//console.log('check position of ' + charnum);
	return this.ownerSVGElement.createSVGPoint(); 
    },
    getEndPositionOfChar: function(charnum) { 
//	console.log('text is ' + (this._fxEnd && this._fxEnd.getChildren()));
	//console.log('check position of ' + charnum);
	return this.ownerSVGElement.createSVGPoint(); 
    },
    getExtentOfChar: function(charnum) { 
	//console.log('text is ' + (this._fxEnd && this._fxEnd.getChildren()));

	//console.log('check position of ' + charnum);
	return this.ownerSVGElement.createSVGPoint(); 
    },
    getRotationOfChar: function(charnum) { TODO(); },
    getCharNumAtPosition: function(pot) { TODO(); },
    selectSubString: function(charnum, nchars) { TODO(); },
    get textContent() {
	// FIXME cache?
	return this.firstChild.nodeValue;
	
    }
});


