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
    Parent: Packages.com.sun.scenario.scenegraph.SGFilter, // an intermediate node with one child
    Text: Packages.com.sun.scenario.scenegraph.SGText,
    Shape: Packages.com.sun.scenario.scenegraph.SGShape,
    Transform: Packages.com.sun.scenario.scenegraph.SGTransform,
    ShapeMode: Packages.com.sun.scenario.scenegraph.SGAbstractShape$Mode,
    Ellipse: Packages.java.awt.geom.Ellipse2D.Double,
    Point: Packages.java.awt.geom.Point2D.Double,
    Rectangle: Packages.java.awt.geom.Rectangle2D.Double,
    Font: Packages.java.awt.Font,
    Path: Packages.java.awt.geom.GeneralPath,
    Color: Packages.java.awt.Color,
    Timer: Packages.javax.swing.Timer,
    util: {
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

	removeAll: function(element) {
	    var children = element._fxBegin.getChildren();
	    var length = children.size();
	    for (var i = length - 1; i >= 0; i--) 
		element._fxBegin.remove(children.get(i));
	},

	addMouseListener: function(element, eventName, handler) {
	    var adapter  = new fx.util.MouseAdapter();
	    adapter[eventName] = function(awtEvent, sgNode) {
		handler.call(this, awtEvent, sgNode);
	    }
	    var listenerClass = Packages.com.sun.scenario.scenegraph.event.SGMouseListener;
	    var jAdapter = new listenerClass(adapter);
	    element._fxBegin.addMouseListener(jAdapter);
	},

	dispatchMouseEvent: function(type, evt) {
	    var event = new MouseEvent();
	    event._type = type;
	    event._shiftKey = evt.isShiftDown();
	    event._altKey = evt.isAltDown();
	    event._clientX = evt.getX();
	    event._clientY = evt.getY();
	    return document.documentElement.dispatchEvent(event);
	},

	rotate: function(element, theta, x, y) { // move to SVGTransform
	    // note that it's cumulative, we end up creating a lot of transforms, hence stack overflows etc
	    // instead, calculate a single cumulative transform and replace the original
	    var parent = element._fxBegin.getParent();
	    parent.remove(element._fxTransform);
	    element._fxTransform = fx.Transform.createTranslation(-x, -y, element._fxTransform);
	    element._fxTransform = fx.Transform.createRotation(theta, element._fxTransform);
	    element._fxTransform = fx.Transform.createTranslation(x, y, element._fxTransform);
	    parent.setChild(element._fxTransform);
	    return element;
	},

	translate: function(element, x, y) { // move to SVGTransform
	    // note that it's cumulative
	    var parent = element._fxTransform.getParent();
	    parent && parent.remove(element._fxTransform);
	    element._fxTransform = fx.Transform.createTranslation(x, y, element._fxTransform);
	    parent && parent.setChild(element._fxTransform);
	    return element;
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

	queue: []

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

fx.dom = {
    queue: [],
    renderers: {},
    render: function(element) {
	const SVGNS = 'http://www.w3.org/2000/svg';
	
	var renderer = this.renderers[element.constructor.tagName];
	return renderer && renderer(element);
	
	//else return (element.geziraBegin = new gezira.Object);
    },

    enqueue: function(element) {
	if (this.queue.last() !== element) {
	    this.queue.push(element);
	    // trigger an update as soon as possible?
	}
    },

    update: function() {
	var length = this.queue.length;
	while (this.queue.length > 0) {
	    var element = this.queue.pop();
	    if (!element.constructor.tagName) console.log('no tag name for ' + element.constructor);
	    this.render(element);
	}
	//console.log('queue was ' + length);
	return length;
    }
};

Function.wrapSetter(Attr.prototype, 'value', function(func, args) {
    func.apply(this, args);
    if (this.value && this.ownerElement) {
	fx.dom.enqueue(this.ownerElement);
    }
});


window.setTimeout = function(action, delay) {
    var timer = fx.util.setInterval(function() {
	action.apply(this, arguments);
	fx.dom.update();
    }, delay);
    timer.setRepeats(false);
    return timer;
}

window.setInterval = function(action, delay) {
    var timer = fx.util.setInterval(function() {
	action.apply(this, arguments);
	fx.dom.update();
    }, delay);
    return timer;
}

Function.wrap(window, ['onmousemove', 'onmousedown', 'onmouseup'], function(func, args) {
    func.apply(this, args);
    fx.dom.update();
});


[SVGPolygonElement, SVGRectElement, SVGEllipseElement, SVGGElement].forEach(function(constr) {
    Function.wrap(constr.prototype, ['cloneNode'], function(func, args) {
	console.log('cloning ' + (this.id || this.tagName));
	var begin = this._fxBegin;
	var end = this._fxEnd;
	delete this._fxBegin;
	delete this._fxEnd;
	var clone = func.apply(this, args);
	begin && (this._fxBegin = begin);
	end && (this._fxEnd = end);
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
    attributes: ["stroke", "fill", "stroke-width"],
    
    parseColor: function(color) {
	var match = color && String(color).match(/rgb\((\d+),(\d+),(\d+)\)/);
	if (match) {
	    var r = Number(match[1]) / 255;
	    var g = Number(match[2]) / 255;
	    var b = Number(match[3]) / 255;
	    return new fx.Color(r, g, b);
	} else {
	    var name = String(color);
	    if (name == "none") return new fx.Color(0,0,0,0); // FIXME not strictly the same thing as no color
	    else if (name.startsWith("url")) { // FIXME specialcasing the gradients
		return new fx.Color(0,0,0,0); // FIXME not strictly the same thing as no color
	    } else if (!fx.Color[name]) {
		console.log('unknown fill ' + value);
		return null;
	    } else return fx.Color[name];
	} 
    },

    renderAttribute: function(element, attr, value) {
	switch (attr) {
	case "fill": {
	    var fill = PaintModule.parseColor(value);
	    fx.util.getShape(element).setFillPaint(fill);
	    return true;
	}
	case "stroke-width": {
	    var BasicStroke = Packages.java.awt.BasicStroke;
	    var shape = fx.util.getShape(element);
	    shape.setDrawStroke(new BasicStroke(Number(value),  // FIXME conv, units, etc.
						BasicStroke.CAP_ROUND,
						BasicStroke.JOIN_MITER));
	    //console.log('paint ' + shape.getDrawPaint() + " mode " + shape.getMode());
            shape.setMode(shape.getMode() === fx.ShapeMode.FILL ?  
			  fx.ShapeMode.STROKE_FILL : fx.ShapeMode.STROKE);
	    return true;
	}
	    
	case "stroke": {
	    var stroke = PaintModule.parseColor(value);
	    fx.util.getShape(element).setDrawPaint(stroke);
	    return true;
	}
	default: 
	    return false;	     
	}
    }
}

fx.dom.renderers[SVGRectElement.tagName] = function(element) {
    if (element._fxBegin)
	element._fxBegin.remove();
    else 
	element._fxBegin = new fx.Parent();
    var shape = fx.util.antiAlias(new fx.Shape());

    shape.setShape(new fx.Rectangle(element.x.baseVal.value,
				    element.y.baseVal.value,
				    element.width.baseVal.value,
				    element.height.baseVal.value));
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
    if (element._fxBegin)
	element._fxBegin.remove();
    else 
	element._fxBegin = new fx.Parent();
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
    //element.parentNode && console.log('rendering ' + element.parentNode.id);
    return element._fxBegin;

}
    
fx.dom.renderers[SVGPolygonElement.tagName] = function(element) {
    if (element._fxBegin)
	element._fxBegin.remove();
    else 
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
	    path.closePath();
	} 
    }
    //console.log('rendering ' + element);
    return  element._fxBegin;
};

// b0rken but does something
fx.dom.renderers[SVGTextElement.tagName] = function(element) {
    if (element._fxBegin)
	element._fxBegin.remove();
    else 
	element._fxBegin = new fx.Parent();
    var text = fx.util.antiAliasText(new fx.Text());

    var attrs = element.attributes;
    var fontSize = 12;
    for (var i = 0; i < attrs.length; i++) {
	var attr = attrs.item(i);
	switch (attr.name) {
	case "font-size":
	    //var font = text.getFont(); 
	    fontSize = parseInt(attr.value);
	    var newFont = new fx.Font('Helvetica', fx.Font.PLAIN, fontSize);
	    text.setFont(newFont);
	    break;
	}
    }

    text.setLocation(new fx.Point(0, fontSize));
    var content = "";
    element.childNodes._nodes.forEach(function(node) {
	// FIXME FIXME FIXME
	if (node.localName == 'tspan') {
	    content += node.firstChild.nodeValue; // not really but TBC
	}
    });

    text.setText(content);
    element._fxBegin.setChild(text);
    return element._fxBegin;
};


[SVGSVGElement, SVGGElement].forEach(function(constr) {
    Function.wrap(constr.prototype, ["insertBefore", "appendChild"], function(func, args) {
	var result = func.apply(this, args);
	fx.dom.enqueue(this); // console.log('not ready, should enqueue? ' + this);
	fx.dom.update(); // note synchronous updates
	return result;
    });
});


[SVGSVGElement, SVGGElement].forEach(function(constr) {
    Function.wrap(constr.prototype, ["removeChild"], function(func, args) {
	var result = func.apply(this, args);
	fx.dom.enqueue(this); 
	fx.dom.update(); // note synchronous updates
	return result;
    });
});

fx.dom.renderers[HTMLHtmlElement.tagName] =
fx.dom.renderers[HTMLBodyElement.tagName] =
fx.dom.renderers[SVGSVGElement.tagName] =
fx.dom.renderers[SVGGElement.tagName] = function(element) {
    if (element._fxBegin)
	element._fxBegin.remove();
    else
	element._fxBegin = new fx.Parent();

    var fxObj = element._fxEnd = new fx.Group();
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
		fxObj = new fx.Transform.createRotation(transform.angle, fxObj);
	    } 
	}
    } 

    element._fxBegin.setChild(fxObj);
    //console.log('rendering ' + element);
    return element._fxBegin;
}



// end of SVG impl


