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
	
	getShape: function(element) { // FIXME what about transforms
	    return element._fxBegin.getChildren().get(0);
	},

	removeAll: function(element) {
	    var children = element._fxBegin.getChildren();
	    var length = children.size();
	    for (var i = length - 1; i >= 0; i--) 
		element._fxBegin.remove(children.get(i));
	},

	addMouseListener: function(shape, eventName, handler) {
	    var adapter  = new fx.util.MouseAdapter();
	    adapter[eventName] = function(awtEvent, sgNode) {
		handler.call(this, awtEvent, sgNode);
	    }
	    var listenerClass = Packages.com.sun.scenario.scenegraph.event.SGMouseListener;
	    var jAdapter = new listenerClass(adapter);
	    fx.util.getShape(shape).addMouseListener(jAdapter);
	},

	rotate: function(element, theta, x, y) { // move to SVGTransform
	    // note that it's cumulative, we end up creating a lot of transforms, hence stack overflows etc
	    // instead, calculate a single cumulative transform and replace the original
	    var parent = element._fxBegin.getParent();
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
	var renderer = this.renderers[element.constructor.tagName];
	if (renderer)
	    return renderer(element);
	else return null;
	//else return (element.geziraBegin = new gezira.Object);
    },
    enqueue: function(element) {
	if (this.queue.last() !== element) 
	    this.queue.push(element);
    },

    update: function() {
	while (this.queue.length > 0) {
	    var element = this.queue.pop();
	    this.render(element);
	}
    }
};

Function.wrapSetter(Attr.prototype, 'value', function(func, args) {
    func.apply(this, args);
    if (this.value && this.ownerElement) {
	fx.dom.enqueue(this.ownerElement);
    }
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
	    if (name.startsWith("url")) return null;
	    else return fx.Color[name];
	} 
    },

    renderAttribute: function(element, attr, value) {
	switch (attr) {
	case "fill": {
	    var fill = PaintModule.parseColor(value);
	    if (fill) {  
		fx.util.getShape(element).setFillPaint(fill);
		return true;
	    } else {
		console.log('unknown fill ' + value);
		return false;
	    }
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
	    if (stroke) {  
		fx.util.getShape(element).setDrawPaint(stroke);
		return true;
	    } else {
		console.log('unknown stroke ' + value);
		return false;
	    }
	}
	default: 
	    return false;	     
	}
    }
}

fx.dom.renderers[SVGRectElement.tagName] = function(element) {
    if (element._fxBegin) {
	fx.util.removeAll(element);
    } else 
	element._fxBegin = new fx.Group();
    var shape = fx.util.antiAlias(new fx.Shape());

    shape.setShape(new fx.Rectangle(element.x.baseVal.value,
				    element.y.baseVal.value,
				    element.width.baseVal.value,
				    element.height.baseVal.value));
    element._fxBegin.add(shape);
    
    var attrs = element.attributes;
    
    for (var i = 0; i < attrs.length; i++) {
	var attr = attrs.item(i);
	if (PaintModule.attributes.include(attr.name)) {
	    PaintModule.renderAttribute(element, attr.name, attr.value);
	}
    }
    return element._fxBegin;
}


fx.dom.renderers[SVGEllipseElement.tagName] = function(element) {
    if (element._fxBegin) {
	fx.util.removeAll(element); // FIXME
    } else 
	element._fxBegin = new fx.Group();

    var shape = fx.util.antiAlias(new fx.Shape());
    element._fxBegin.add(shape);
    var cx = element.cx.baseVal.value;
    var cy = element.cy.baseVal.value;
    var rx = element.rx.baseVal.value;
    var ry = element.ry.baseVal.value;
    shape.setShape(new fx.Ellipse(cx - rx, cy - ry, rx*2, ry*2));

    var attrs = element.attributes;
    for (var i = 0; i < attrs.length; i++) {
	var attr = attrs.item(i);
	if (PaintModule.attributes.include(attr.name)) {
	    PaintModule.renderAttribute(element, attr.name, attr.value);
	}
    }
    return element._fxBegin;

}
    
Object.extend(SVGPolygonElement.prototype, {

    _fxMakePath: function(path) {
	for (var i = 0; i < this.points.numberOfItems; i++) {
	    var point = this.points.getItem(i);
	    if (i == 0) {
		path.moveTo(point.x, point.y);
	    } else {
		path.lineTo(point.x, point.y);
	    }
	}
	path.closePath();
    }

});

fx.dom.renderers[SVGPolygonElement.tagName] = function(element) {
    if (element._fxBegin) {
	fx.util.removeAll(element); // FIXME
    } else 
	element._fxBegin = new fx.Group();
    var shape = fx.util.antiAlias(new fx.Shape());
    var path = new fx.Path();
    element._fxBegin.add(shape);
    shape.setShape(path);

    var attrs = element.attributes;
    for (var i = 0; i < attrs.length; i++) {
	var attr = attrs.item(i);
	if (PaintModule.attributes.include(attr.name)) {
	    PaintModule.renderAttribute(element, attr.name, attr.value);
	} else if (attr.name == 'points') {
	    element._fxMakePath(path);
	} else {
	    console.log('unknown attribute ' + attr);
	}
    }
}



Function.wrap(SVGSVGElement.prototype, ["insertBefore", "appendChild"], function(func, args) {
    var result = func.apply(this, args);
    var newChild = args[0];
    fx.dom.enqueue(this); // console.log('not ready, should enqueue? ' + this);

    fx.dom.update(); // note synchronous updates
    return result;
});


    // FIXME literal copy, remove
Function.wrap(SVGGElement.prototype, ["insertBefore", "appendChild"], function(func, args) {
    var result = func.apply(this, args);
    var newChild = args[0];
    fx.dom.enqueue(this); // console.log('not ready, should enqueue? ' + this);

    //fx.dom.update(); // note synchronous updates
    return result;
});

fx.dom.renderers[HTMLHtmlElement.tagName] =
fx.dom.renderers[HTMLBodyElement.tagName] =
fx.dom.renderers[SVGSVGElement.tagName] =
fx.dom.renderers[SVGGElement.tagName] = function(element) {
    if (element._fxBegin) {
	fx.util.removeAll(element); // FIXME
    } else 
	element._fxBegin = new fx.Group();
    
    var gobj = element._fxEnd = element.childNodes._nodes.map(function(child) {
	child._fxBegin || console.log('recursing into child ' + child);
	return child._fxBegin || fx.dom.render(child);
    });

    if (false && element.hasAttribute('transform')) { // only for G elements for us
	console.log('detected transform ' + element.transform);
	var list = element.transform.baseVal;
	for (var i = list.numberOfItems - 1; i >= 0; i--) {
	    var base = element._fxTransform || element._fxGroup;
	    var transform = list.getItem(i);
	    if (transform.type == SVGTransform.SVG_TRANSFORM_TRANSLATE)
		base = new fx.Transform.createTranslation(transform.matrix.e, transform.matrix.f, base);
	    else if (transform.type == SVGTransform.SVG_TRANSFORM_SCALE)
		base = new fx.Transform.createScale(transform.matrix.a, transform.matrix.d, base);
	    else if (transform.type == SVGTransform.SVG_TRANSFORM_ROTATE)
		base = new fx.Transform.createRotation(transform.angle, base);
	    else
		continue;
	}
	element._fxTransform  = base;
	if (element._fxGroup) element._fxGroup.add(element._fxTransform);
    }
    for (var i = 0; i < gobj.length; i++)  {
	var childGphx = gobj[i];
	if (childGphx)
	    element._fxBegin.add(childGphx);
    }
    return element._fxBegin;
    
    //    if (!element._fxGroup) console.log('element not ready?'); // do not update
    //else element._fxGroup.add(newChild._fxTransform);
}



    
// end of SVG impl

window.setTimeout = function(action, delay) {
    var timer = fx.util.setInterval(action, delay);
    timer.setRepeats(false);
    return timer;
}