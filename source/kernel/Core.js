/*
 * Copyright © 2006-2007 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

/**
 * Core.js.  This file contains the core system definition
 * as well as the core Morphic graphics framework. 
 */

// ===========================================================================
// Namespaces and core DOM bindings
// ===========================================================================

var Global = this;

var Canvas = document.getElementById("canvas"); // singleton for now

window.parent.console.platformConsole = console;
var console = window.parent.console;
window.onerror = function(message, url, code) {
    console.log('in %s: %s, code %s', url, message, code);
};

Namespace =  {
    SVG : "http://www.w3.org/2000/svg", // Canvas.getAttribute("xmlns"),
    // Safari XMLSerializer seems to do weird things w/namespaces
    // Opera apparently doesn't understand Canvas.getAttribute("foo:bar")
    LIVELY : Prototype.Browser.WebKit ? null : "http://www.experimentalstuff.com/Lively", // Canvas.getAttribute("xmlns:lively"), 
    XLINK : "http://www.w3.org/1999/xlink", //Canvas.getAttribute("xmlns:xlink"),
    DAV : "DAV", //Canvas.getAttribute("xmlns:D"),
    XHTML: document.documentElement.getAttribute("xmlns") 
};

var Loader = {

    loadScript: function(ns, url) {
        var script = NodeFactory.createNS(Namespace.XHTML, "script");
        script.setAttributeNS(Namespace.XHTML, "src", url);
        document.documentElement.appendChild(script);
        //document.documentElement.removeChild(script);
    },
    
    insertContents: function(iframe) {
        var node = iframe.contentDocument.documentElement;
        var adoptedNode = null;
        try {
            adoptedNode = document.adoptNode(node);
        } catch (e) {
            // FF can fail here
            console.log('failed to insert iframe contents: %e', e);
           return;
        }
        document.documentElement.appendChild(adoptedNode);
    }
    
};

// SVG/DOM bindings 

/**
 * @class Query
 */

var Query = {

    resolver: function(prefix) {
        console.log('prefix %s value %s', prefix, Namespace[prefix]);
        return Namespace[prefix];
    },

    evaluate: function(aNode, aExpr, defaultValue) {
        var xpe = new XPathEvaluator();
        var nsResolver = xpe.createNSResolver(aNode.ownerDocument == null ?
                         aNode.documentElement : aNode.ownerDocument.documentElement);
        var result = xpe.evaluate(aExpr, aNode, nsResolver, 0, null);
        var found = [];
        var res = null;
        while (res = result.iterateNext()) found.push(res);
        if (defaultValue && found.length == 0) {
            return [ defaultValue ];
        }
        return found;
    }

};

var NodeFactory = {
    createNS: function(ns, name, attributes) {
        var element = document.createElementNS(ns, name);
        if (attributes) {
            $H(attributes).each(function(pair) { element.setAttributeNS(null, pair[0], pair[1].toString()); });
        }
        return element;
    },
    
    create: function(name, attributes) {
        return this.createNS(Namespace.SVG, name, attributes);
        //return this.createNS(null, name, attributes);
    }
    
};

// ===========================================================================
// Our extensions to JavaScript base libraries
// ===========================================================================

/**
 * Extensions to class Class
 */  

Object.extend(Class, {
    
    isClass: function(object) {
        return (object instanceof Function) &&  object.prototype && (object.functionNames().length > Object.functionNames().length);
    },

    methodNameList: function(className) {
        if (className != "Global") return this.globalScope[className].localFunctionNames();
        return Global.functionNames().copyWithoutAll(this.globalScope.classNames()); 
    },
    
    listClassNames: function(scope) {
        var a = [];

        for (var name in scope) { 
            try {
                if (Class.isClass(scope[name])) {
                    a.push(name); 
                }
            } catch (er) {
                // FF can throw an exception here
            }
        }

        a.push("Object", "Global"); // a few others of note

        // console.log('found array ' + a.sort());
        return a;
    }
    
});

/**
 * Extensions to class Object
 */  

Object.properties = function(object, predicate) {
    var a = [];
    for (var name in object) {  
        if (!(object[name] instanceof Function) && (predicate ? predicate(object) : true)) {
            a.push(name);
        }
    } 
    return a;
};

/**
 * Extensions to class Function
 */  


Object.extend(Function.prototype, {

    inspect: function() {
        var methodName = this.classAndMethodName ? this.classAndMethodName : "unnamedFunction";
        var methodBody = this.toString();
        // First 80 chars of code, without 'function'
        methodBody = methodBody.substring(8, 88) + (methodBody.length>88 ? '...' : '');
        return methodName + methodBody;
    },

    functionNames: function(filter) {
        var functionNames = [];

        for (var name in this.prototype) { 
            try {
                if (this.prototype[name] instanceof Function) { 
                    if (!filter || filter(name)) functionNames.push(name);
                } 
            } catch (er) {
                // FF can throw an exception here ...
            }
        }

        return functionNames;
    },

    localFunctionNames: function() {
        var sup;

        if (!this.superclass) {
            sup = (this === Object) ? null : Object; 
        } else {
            sup = this.superclass;
        }

        try {
            var superNames = (sup == null) ? [] : sup.functionNames();
        } catch (e) {
            var superNames = [];
        }

        return this.functionNames(function(name) {
            return !superNames.include(name) || this.prototype[name] !== sup.prototype[name];
        }.bind(this));

    },

    // modified Class.Methods.addMethods from prototype.js
    addMethods: function(source) {
	var ancestor = this.superclass && this.superclass.prototype;
	
	for (var property in source) {
	    var value = source[property];
	    if (ancestor && Object.isFunction(value) &&
		value.argumentNames().first() == "$super") {
		var method = value;
		var value = Object.extend((function(m) {
		    return function() { 
			try { 
			    return ancestor[m].apply(this, arguments) 
			} catch (e) { 
			    console.log("problem with ancestor " + ancestor + "method " + m); 
			    throw e;
			} 
		    };
		})(property).wrap(method), {
		    valueOf:  function() { return method },
		    toString: function() { return method.toString() }
		});
	    }
	    this.prototype[property] = value;
	    if (Object.isFunction(value)) {
		if (value.classAndMethodName) {
		    //
		    console.log("class " + this.prototype.constructor.type 
				+ " borrowed " + value.classAndMethodName);
		}
		value.classAndMethodName = this.prototype.constructor.type + "." + property;
		if (!this.prototype.constructor.type)
		    console.log("named " + value.classAndMethodName);
	    }
	}
	
	return this;
    },
    
    subclass: function(/*,... */) {
	var properties = $A(arguments);
	var scope = Global;
	if (typeof properties[0]  != 'string') { // primitive string required
	    scope = properties.shift();
	}
	var name = properties.shift();
	
	
	function klass() {
	    if (Global.Importer && (arguments[0] instanceof Importer)) { // check for the existence of Importer, which may not be defined very early on
		this.deserialize.apply(this, arguments);
	    } else if (arguments[0] === Cloner) {
		this.copyFrom.call(this, arguments[1]);
	    } else {
		this.initialize.apply(this, arguments);
	    }
	}
	
	// Object.extend(klass, Class.Methods);
	klass.superclass = this;
	klass.subclasses = [];
	
	var subclass = function() { };
	subclass.prototype = this.prototype;
	klass.prototype = new subclass;
	this.subclasses.push(klass);


	klass.prototype.constructor = klass;
	// KP: .name would be better but js ignores .name on anonymous functions
	klass.prototype.constructor.type = name;
	klass.prototype.constructor.scope = scope;
	
	for (var i = 0; i < properties.length; i++) {
	    klass.addMethods(properties[i] instanceof Function ? (properties[i])() : properties[i]);
	}
	
	if (!klass.prototype.initialize)
	    klass.prototype.initialize = Prototype.emptyFunction;
	
	scope[name] = klass;
	return klass;
    }
    
});
Object.subclasses = [];

Function.globalScope = window;

Function.methodString = function(className, methodName) {
    var func = (className == "Global") ? Function.globalScope[methodName] : Function.globalScope[className].prototype[methodName];
    if (func == null) return "no code";
    var code = func.toString();
    if (className == "Global" || methodName == "constructor") return code;
    return className + ".prototype." + methodName + " = " + code; 
};

if (Prototype.Browser.WebKit) { 
    Error.prototype.inspect = function() {
        return this.name + " in " + this.sourceURL + ":" + this.line + ": " + this.message;
    }
} else if (!Prototype.Browser.Rhino) { // mozilla
    Error.prototype.inspect = function() {
        return this.name + " in " + this.fileName + ":" + this.lineNumber + ": " + this.message;
    }
}

Object.extend(Function.prototype, {
    
    logErrors: function(prefix) {
	if (Config.ignoreAdvice) 
	    return this;
        var advice = function (proceed/*,args*/) {
            var args = $A(arguments); args.shift(); 
            try {
                return proceed.apply(this, args); 
            } catch (er) {
                if (prefix) console.warn("%s.%s(%s): err: %s %s", this, prefix, args,  er, er.stack || "");
                else console.warn("%s %s", er, er.stack || "");
                Function.showStack();
                throw er;
            }
        }
	var result = this.wrap(advice);
	result.originalMethod = this;
	return result;
    },

    logCompletion: function(module) {
	if (Config.ignoreAdvice) 
	    return this;
	var advice = function(proceed) {
            var args = $A(arguments); args.shift(); 
            try {
                var result = proceed.apply(this, args);
            } catch (er) {
                console.warn('failed to load %s: %s', module, er);
                Function.showStack();
                throw er;
            }
            console.log('completed %s', module);
            return result;
        }
	var result = this.wrap(advice);
	result.originalMethod = this;
	return result;
    },

    logCalls: function(name, isUrgent) {
	if (Config.ignoreAdvice) 
	    return this;
        var advice = function(proceed) {
            var args = $A(arguments); args.shift(); 
            var result = proceed.apply(this, args);
            if (isUrgent) { 
                console.warn('%s.%s(%s) -> %s', this, name, args, result); 
            } else {
                console.log( '%s.%s(%s) -> %s', this, name, args, result);
            }
           return result;
        }
	var result = this.wrap(advice);
	result.originalMethod = this;
	return result;
    },

    traceCalls: function(stack) {
	var advice = function(proceed) {
	    var args = $A(arguments); args.shift();
	    stack.push(args);
	    var result = proceed.apply(this, args);
	    stack.pop();
	    return result;
	};
	return this.wrap(advice);
    }


});

/**
 * Extensions to class String
 */  

Object.extend(String.prototype, {

    withNiceDecimals: function() {
        // JS can't print nice decimals
        var dotIx = this.indexOf('.');
        // return unchanged unless all digits with exactly one dot
        if (dotIx < 0 || this.indexOf('.', dotIx+1) >= 0) return this;
        
        for (var i=0; i< this.length; i++) {
            if ('0123456789.'.indexOf(this[i]) < 0) return this; 
        }

        // truncate to 8 digits and trim trailing zeroes
        var ss = this.substr(0, dotIx + 8);
        var len = ss.length;

        for (var i=len-1; i>dotIx+1; i--) {
            if (ss[i] == '0') len--;
            else return ss.substr(0, len) 
        }

        return ss.substr(0,len);
    },

    // very simple format mechanism, maybe extend with precision and such
    format: function(/*, exprs*/) {
        var str = this;

        for (var i = 0; i < arguments.length; i++) {
            var a = arguments[i];
            var object = (a instanceof String || typeof(a) == 'string') ? a : Object.inspect(a); // avoid quotes
            str = str.replace(new RegExp("%" + (i + 1), "g"), object);
        }

        return str;
    }

});

/**
 * Extensions to class Number
 */  

Object.extend(Number.prototype, {
    
    // random integer in 0 .. n-1
    randomSmallerInteger: function() {
        return Math.floor(Math.random()*this); 
    },
    
    roundTo: function(quantum) {
        return Math.round(this/quantum)*quantum; 
    },
    
    toDegrees: function() { 
        return (this*180/Math.PI) % 360; 
    },
    
    toRadians: function() { 
        return this/180 * Math.PI; 
    }

});

// ===========================================================================
// Graphics foundations
// ===========================================================================

/**
 * @class Point: 2d points
 */

Object.subclass("Point", {

    initialize: function(x, y) {
        this.x = x;
        this.y = y;
        return this;
    },
    
    addPt: function(p) { return new Point(this.x + p.x, this.y + p.y); },
    addXY: function(dx,dy) { return new Point(this.x + dx, this.y + dy); },
    midPt: function(p) { return new Point((this.x + p.x)/2, (this.y + p.y)/2); },
    subPt: function(p) { return new Point(this.x - p.x, this.y - p.y); },
    negated: function() { return new Point(-this.x, -this.y); },
    scaleBy: function(scale) { return new Point(this.x*scale,this.y*scale); },
    lessPt: function(p) { return this.x < p.x && this.y < p.y; },
    leqPt: function(p) { return this.x <= p.x && this.y <= p.y; },
    eqPt: function(p) { return this.x == p.x && this.y == p.y; },
    minPt: function(p) { return new Point(Math.min(this.x,p.x), Math.min(this.y,p.y)); },
    maxPt: function(p) { return new Point(Math.max(this.x,p.x), Math.max(this.y,p.y)); },
    roundTo: function(quantum) { return new Point(this.x.roundTo(quantum), this.y.roundTo(quantum)); },

    dist: function(p) { 
        var dx = this.x - p.x;
        var dy = this.y - p.y;
        return Math.sqrt(dx*dx + dy*dy); 
    },

    nearestPointOnLineBetween: function(p1, p2) { // fasten seat belts...
        if (p1.x == p2.x) return pt(p1.x, this.y);
        if (p1.y == p2.y) return pt(this.x, p1.y);
        var x1 = p1.x;
        var y1 = p1.y;
        var x21 = p2.x - x1;
        var y21 = p2.y - y1;
        var t = (((this.y - y1) / x21) + ((this.x - x1) / y21)) / ((x21 / y21) + (y21 / x21));
        return pt(x1 + (t * x21) , y1 + (t * y21)); 
    },
    
    asRectangle: function() { return new Rectangle(this.x, this.y, 0, 0); },
    extent: function(ext) { return new Rectangle(this.x, this.y, ext.x, ext.y); },

    toString: function() {
        return "pt(%1,%2)".format(this.x.roundTo(0.01), this.y.roundTo(0.01)); 
    },

    matrixTransform: function(mx) {
        return new Point(mx.a * this.x + mx.c * this.y + mx.e,
                         mx.b * this.x + mx.d * this.y + mx.f);
    },

    // Polar coordinates...
    r: function() { return this.dist(pt(0,0)); },
    theta: function() { return Math.atan2(this.y,this.x); },

    clone: function() { return new Point(this.x, this.y); }
});

Object.extend(Point, {

    parse: function(string) { // reverse of inspect
        var array = string.substring(3, string.length - 1).split(',');
        return new Point(array[0], array[1]);
    },
    
    ensure: function(duck) { // make sure we have a Lively point
        if (duck instanceof Point) { 
            return duck;
        } else { 
            return new Point(duck.x, duck.y);
        }
    },
    
    polar: function(r, theta) { return new Point(r*Math.cos(theta), r*Math.sin(theta)); },
    random: function(scalePt) { return new Point(scalePt.x.randomSmallerInteger(), scalePt.y.randomSmallerInteger()); }

});
   
// Shorthand for creating point objects
function pt(x, y) { 
    return new Point(x, y);
}

console.log("Point");

/**
 * @class Rectangle
 */

Object.subclass("Rectangle", {

    initialize: function(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        return this;
    },

    clone: function() { return new Rectangle(this.x, this.y, this.width, this.height);  },
    maxX: function() { return this.x + this.width; },
    maxY: function() { return this.y + this.height; },
    withWidth: function(w) { return new Rectangle(this.x, this.y, w, this.height)},
    withHeight: function(h) { return new Rectangle(this.x, this.y, this.width, h)},
    withX: function(x) { return new Rectangle(x, this.y, this.width, this.height)},
    withY: function(y) { return new Rectangle(this.x, y, this.width, this.height)},
    extent: function() { return new Point(this.width,this.height); },
    withExtent: function(ext) { return new Rectangle(this.x, this.y, ext.x, ext.y); },
    center: function() { return new Point(this.x+(this.width/2),this.y+(this.height/2))},
    //Control point readers and writers
    topLeft: function() { return new Point(this.x, this.y)},
    topRight: function() { return new Point(this.maxX(), this.y)},
    bottomRight: function() { return new Point(this.maxX(), this.maxY())},
    bottomLeft: function() { return new Point(this.x, this.maxY())},
    leftCenter: function() { return new Point(this.x, this.center().y)},
    rightCenter: function() { return new Point(this.maxX(), this.center().y)},
    topCenter: function() { return new Point(this.center().x, this.y)},
    bottomCenter: function() { return new Point(this.center().x, this.maxY())},
    withTopLeft: function(p) { return Rectangle.fromAny(p, this.bottomRight()) },
    withTopRight: function(p) { return Rectangle.fromAny(p, this.bottomLeft()) },
    withBottomRight: function(p) { return Rectangle.fromAny(p, this.topLeft()) },
    withBottomLeft: function(p) { return Rectangle.fromAny(p, this.topRight()) },
    withLeftCenter: function(p) { return new Rectangle(p.x, this.y, this.width + (this.x - p.x), this.height)},
    withRightCenter: function(p) { return new Rectangle(this.x, this.y, p.x - this.x, this.height)},
    withTopCenter: function(p) { return new Rectangle(this.x, p.y, this.width, this.height + (this.y - p.y))},
    withBottomCenter: function(p) { return new Rectangle(this.x, this.y, this.width, p.y - this.y)}
});

Rectangle.addMethods({

    containsPoint: function(p) {
        return this.x <= p.x && p.x <= this.x + this.width && this.y<= p.y && p.y <= this.y + this.height;
    },

    containsRect: function(r) {
        return this.x <= r.x && this.y<= r.y && r.maxX()<=this.maxX() && r.maxY()<=this.maxY();
    },

    constrainPt: function(pt) { return pt.maxPt(this.topLeft()).minPt(this.bottomRight()); },

    intersection: function(r) {
        return rect(this.topLeft().maxPt(r.topLeft()),this.bottomRight().minPt(r.bottomRight())); 
    },

    union: function(r) {
        return rect(this.topLeft().minPt(r.topLeft()),this.bottomRight().maxPt(r.bottomRight())); 
    },

    isNonEmpty: function(rect) { return this.topLeft().lessPt(this.bottomRight())},

    dist: function(r) { // dist between two rects
        var p1 = this.closestPointToPt(r.center()); 
        var p2 = r.closestPointToPt(p1);  
        return p1.dist(p2); 
    },

    closestPointToPt: function(p) { // Assume p lies outside me; return a point on my perimeter
        return pt(Math.min(Math.max(this.x, p.x), this.maxX()),
                  Math.min(Math.max(this.y, p.y), this.maxY())); 
    },

    translatedBy: function(d) {
        return new Rectangle(this.x+d.x, this.y+d.y, this.width, this.height); 
    },
    
    scaleByRect: function(r) { // r is a relative rect, as a pane spec in a window
        return new Rectangle(this.x + (r.x*this.width), this.y + (r.y*this.height), r.width*this.width, r.height*this.height); 
    },
    
    insetBy: function(d) {
        return new Rectangle(this.x+d, this.y+d, this.width-(d*2), this.height-(d*2)) 
    },

    insetByPt: function(p) {
        return new Rectangle(this.x+p.x, this.y+p.y, this.width-(p.x*2), this.height-(p.y*2)) 
    },
    
    expandBy: function(delta) { return this.insetBy(0-delta) }

});

Object.extend(Rectangle, {
    corners: ["topLeft","topRight","bottomRight","bottomLeft"], 
    sides: ["leftCenter","rightCenter","topCenter","bottomCenter"]
});

Rectangle.addMethods({

    partNamed: function(partName) { 
        return this[partName].call(this); 
    },
    
    withPartNamed: function(partName,newValue) {
        return this[this.setterName(partName)].call(this,newValue); 
    },
    
    setterName: function(partName) {
        return "with" + partName.substring(0,1).toUpperCase() + partName.substring(1); 
    },
    
    partNameNear: function(partNames,p,dist) { 
        var partName = this.partNameNearest(partNames,p);
        return (p.dist(this.partNamed(partName)) < dist) ? partName : null; 
    },
    
    partNameNearest: function(partNames, p) { 
        var dist = 1.0e99;
        var partName = partNames[0];
        
        for (var i=0; i<partNames.length; i++) { 
            var partName = partNames[i];
            var pDist = p.dist(this.partNamed(partName));
            if (pDist < dist) {var nearest = partName; dist = pDist} 
        }
        
        return nearest; 
    },

    toPath: function() {
        var path = new PathShape();
    
        with (this) {
            path.moveTo(x, y);
            path.lineTo(x + width, y); 
            path.lineTo(x + width, y + height);
            path.lineTo(x,         y + height);
            path.close(); 
        }
        
        return path;
    },

    toString: function() { 
        return "rect(%1,%2)".format(this.topLeft(), this.bottomRight());
    }

});

Object.extend(Rectangle, {

    fromAny: function(ptA, ptB) {
        return rect(ptA.minPt(ptB), ptA.maxPt(ptB));
    },
    
    unionPts: function(points) {
        var min = points[0];
        var max = points[0];
    
        // AT: Loop starts from 1 intentionally
        for (var i = 1; i < points.length; i++) {
            min = min.minPt(points[i]);
            max = max.maxPt(points[i]); 
        }
    
        return rect(min, max); 
    },


    fromElement: function(element) {
        return new Rectangle(element.x.baseVal.value, element.y.baseVal.value, 
                             element.width.baseVal.value, element.height.baseVal.value);
    }


});

// Shorthand for creating rectangle objects
function rect(location, corner) {
    return new Rectangle(location.x, location.y, corner.x - location.x, corner.y - location.y);
};
 
console.log("Rectangle");

// ===========================================================================
// Color support
// ===========================================================================

/**
 * @class Color: Fully portable support for RGB colors
 */

Object.subclass("Color", { 

    initialize: function(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    },
    
    // Mix with another color -- 1.0 is all this, 0.0 is all other
    mixedWith: function(other, proportion) { 
        var p = proportion;
        var q = 1.0 - p;
        return new Color(this.r*p + other.r*q, this.g*p + other.g*q, this.b*p + other.b*q); 
    },
    
    darker: function(recursion) { 
        var result = this.mixedWith(Color.black, 0.5);
        return recursion > 1  ? result.darker(recursion - 1) : result;
    },
    
    lighter: function(recursion) { 
        var result = this.mixedWith(Color.white, 0.5);
        return recursion > 1 ? result.lighter(recursion - 1) : result;
    },
    
    toString: function() {
        with (this) { return "rgb(" + [r, g, b].map(function(x) { return Math.floor(x*255.99); }).join() + ")"; }
    }
    
});

Object.extend(Color, {

    black: new Color(0,0,0),
    white: new Color(1,1,1),
    gray: new Color(0.8,0.8,0.8),
    red: new Color(0.8,0,0),
    green: new Color(0,0.8,0),
    yellow: new Color(0.8,0.8,0),
    blue:  new Color(0,0,0.8),
    purple: new Color(1,0,1),
    magenta: new Color(1,0,1),

    random: function() {
        return new Color(Math.random(),Math.random(),Math.random()); 
    },

    hsb: function(hue,sat,brt) {
        var s = sat;
        var b = brt;
        // zero saturation yields gray with the given brightness
        if (sat == 0) return new Color(b,b,b);
        var h = hue % 360;
        var h60 = h / 60;
        var i = Math.floor(h60); // integer part of hue
        var f = h60 - i; // fractional part of hue
        var p = (1.0 - s) * b;
        var q = (1.0 - (s * f)) * b;
        var t = (1.0 - (s * (1.0 - f))) * b;

        switch (i) {
        case 0:  return new Color(b,t,p);
        case 1:  return new Color(q,b,p);
        case 2:  return new Color(p,b,t);
        case 3:  return new Color(p,q,b);
        case 4:  return new Color(t,p,b);
        case 5:  return new Color(b,p,q);
        default: return new Color(0,0,0); 
        } 
    },
    
    wheel: function(n) { 
        return Color.wheelHsb(n,0.0,0.9,0.7); 
    },
    
    // Return an array of n colors of varying hue
    wheelHsb: function(n,hue,sat,brt) {
        var a = new Array(n);
        var step = 360.0 / (Math.max(n,1));
    
        for (var i = 0; i < n; i++) 
            a[i] = Color.hsb(hue + i*step, sat, brt);

        return a; 
    },
    
    parse: function(str) {
        if (!str || str == "none") return null;

        // FIXME this should be much more refined
        var match = str.match("rgb\\((\\d+),(\\d+),(\\d+)\\)");
        if (match) { 
            return Color.rgb(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
        } else { 
            throw new Error('color ' + str + ' unsupported');
        }
    },
    
    rgb: function(r, g, b) {
        return new Color(r/255, g/255, b/255);
    }
    
});

Object.extend(Color, {
    darkGray: Color.gray.darker(),
    lightGray: Color.gray.lighter(),
    veryLightGray: Color.gray.lighter().lighter(),
    turquoise: Color.rgb(0, 240, 255),
//    brown: Color.rgb(182, 67, 0),
//    red: Color.rgb(255, 0, 0),
    orange: Color.rgb(255, 153, 0),
//    yellow: Color.rgb(204, 255, 0),
//    limeGreen: Color.rgb(51, 255, 0),
//    green: Color.rgb(0, 255, 102),
//    cyan: Color.rgb(0, 255, 255),
//    blue: Color.rgb(0, 102, 255),
//    purple: Color.rgb(131, 0, 201),
//    magenta: Color.rgb(204, 0, 255),
//    pink: Color.rgb(255, 30, 153),
    primary: {
        // Sun palette
        blue: Color.rgb(0x53, 0x82, 0xA1),
        orange: Color.rgb(0xef, 0x6f, 0x00),
        green: Color.rgb(0xb2, 0xbc, 00),
        yellow: Color.rgb(0xff, 0xc7, 0x26)
    },

    secondary: {
        blue: Color.rgb(0x35, 0x55, 0x6b),
        orange: Color.rgb(0xc0, 0x66, 0x00),
        green: Color.rgb(0x7f, 0x79, 0x00),
        yellow: Color.rgb(0xc6, 0x92, 0x00)
    },

    neutral: {
        lightGray: Color.rgb(0xbd, 0xbe, 0xc0),
        gray: Color.rgb(0x80, 0x72, 0x77)
    }

});

console.log("Color");

// ===========================================================================
// Gradient colors, stipple patterns and coordinate transformatins
// ===========================================================================

/**
 * @class Gradient (NOTE: PORTING-SENSITIVE CODE)
 */

Object.subclass("Gradient", {

    addStop: function(offset, color) {
        this.rawNode.appendChild(NodeFactory.create("stop", {offset: offset, "stop-color": color}));
        return this;
    },

    toString: function() {
        return this.rawNode ? this.rawNode.tagName : "Gradient?";
    },

    deserialize: function(importer, rawNode) {
        this.rawNode = rawNode.cloneNode(true);
    },

    copyFrom: function(other) {
	this.rawNode = other.rawNode.cloneNode(true);
    },

    
});

/**
 * @class LinearGradient (NOTE: PORTING-SENSITIVE CODE)
 */

// note that Colors and Gradients are similar
Gradient.subclass("LinearGradient", {
    
    initialize: function($super, stopColor1, stopColor2, vector) {
	$super();
        vector = vector || LinearGradient.NorthSouth;
        this.rawNode = NodeFactory.create("linearGradient",
					  {x1: vector.x, y1: vector.y, 
					   x2: vector.maxX(), y2: vector.maxY()}); 
        this.addStop(0, stopColor1).addStop(1, stopColor2);
        return this;
    },

    copy: function() {
        return new LinearGradient(Cloner, this);
    }
    
});

Object.extend(LinearGradient, {
    NorthSouth: rect(pt(0, 0), pt(0, 1)),
    SouthNorth: rect(pt(0, 1), pt(0, 0)),
    EastWest:   rect(pt(0, 0), pt(1, 0)),
    WestEast:   rect(pt(1, 0), pt(0, 0))
});

/**
 * @class RadialGradient (NOTE: PORTING-SENSITIVE CODE)
 */
Gradient.subclass("RadialGradient", {
    
    initialize: function($super, stopColor1, stopColor2) {
	$super();
        var c = pt(0.5, 0.5);
        var r = 0.4;
        this.rawNode = NodeFactory.create("radialGradient", {cx: c.x, cy: c.y, r: r});
        this.addStop(0, stopColor1);
        this.addStop(1, stopColor2);
        return this;
    },

    copy: function() {
        return new RadialGradient(Cloner, this);
    }
    
});

/**
 * @class StipplePattern (NOTE: PORTING-SENSITIVE CODE)
 */

StipplePattern = Class.create({

    initialize: function(/*args*/) {
        switch (arguments.length) {
        case 1:
            this.rawNode = arguments[0].cloneNode(true);
            return this;
        case 4:
            var color1 = arguments[0];
            var h1 = arguments[1];
            var color2 = arguments[2];
            var h2 = arguments[4];
            this.rawNode = NodeFactory.create("pattern", 
                {patternUnits: 'userSpaceOnUse', x: 0, y: 0, width: 100, height: h1 + h2});
            this.rawNode.appendChild(NodeFactory.create('rect', {x: 0, y: 0,  width: 100, height: h1,      fill: color1}));
            this.rawNode.appendChild(NodeFactory.create('rect', {x: 0, y: h1, width: 100, height: h1 + h2, fill: color2}));
            return this;
        default:
            throw new Error("whoops, args %s", $A(arguments));
        }
    },
    
    copy: function() {
        return new StipplePattern(this.rawNode);
    }

});

/**
 * @class Transform (NOTE: PORTING-SENSITIVE CODE)
 * Implements support for object rotation, scaling, etc.
 * This code is dependent on SVG transformation matrices.
 * See: http://www.w3.org/TR/2003/REC-SVG11-20030114/coords.html#InterfaceSVGMatrix 
 */

var Transform = Class.create({
    
    initialize: function(matrix) {
        this.matrix = matrix || Canvas.createSVGMatrix();
        return this;
    },
    
    getTranslation: function() {
        return pt(this.matrix.e, this.matrix.f);
    },

    // only for similitudes
    getRotation: function() { // in degrees
        return Math.atan2(this.matrix.b, this.matrix.a).toDegrees();
    },

    getScale: function() {
        var a = this.matrix.a;
        var b = this.matrix.b;
        return Math.sqrt(a * a + b * b);
    },

    copy: function() {
        return new Transform(this.matrix);
    },

    toAttributeValue: function() {
        var delta = this.getTranslation();
        var attr = "translate(" + delta.x + "," + delta.y +")";
        var theta = this.getRotation();

        if (theta != 0.0)
            attr += " rotate(" + this.getRotation()  +")"; // in degrees

        var factor = this.getScale();
    
        if (factor != 1.0) 
            attr += " scale(" + this.getScale() + ")";
    
        return attr;
    },

    toString: function() {
        return this.toAttributeValue();
    },

    transformRectToRect: function(r) {
        var p = r.topLeft().matrixTransform(this.matrix);
        var min = p;
        var max = p;
    
        p = r.topRight().matrixTransform(this.matrix);
        min = min.minPt(p);
        max = max.maxPt(p);

        p = r.bottomRight().matrixTransform(this.matrix);
        min = min.minPt(p);
        max = max.maxPt(p);
    
        p = r.bottomLeft().matrixTransform(this.matrix);
        min = min.minPt(p);
        max = max.maxPt(p);
    
        return rect(min, max);
    }
    
});

Object.extend(Transform, {

    /**
     * createSimilitude: a similitude is a combination of translation rotation and scale.
     * @param [Point] delta
     * @param [float] angleInRadians
     * @param [float] scale
     */
    createSimilitude: function(delta, angleInRadians, scale) {
        // console.log('similitude delta is ' + Object.inspect(delta));
        var matrix = Canvas.createSVGMatrix();
        matrix = matrix.translate(delta.x, delta.y).rotate(angleInRadians.toDegrees()).scale(scale);
        return new Transform(matrix);
    }

});

// ===========================================================================
// Character sets
// ===========================================================================

/**
 * @class CharSet (NOTE: PORTING-SENSITIVE CODE)
 * Currently, support for character sets is rather limited... 
 */  

// KP: there's more then one charset
CharSet = Class.create();

Object.extend(CharSet, {
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
    underscore: "_",
    nonAlpha: "`1234567890-=[]\;',./",
    shiftedNonAlpha: '~!@#$%^&*()_+{}:"<>?|',
    leftBrackets: "*({[<'" + '"',
    rightBrackets: "*)}]>'" + '"'
});

Object.extend(CharSet, {
    // select word, brackets
    alphaNum: CharSet.lowercase + CharSet.uppercase + CharSet.digits + CharSet.underscore,
    charsAsTyped: CharSet.uppercase + CharSet.nonAlpha,
    charsUnshifted: CharSet.lowercase + CharSet.nonAlpha,
    charsShifted: CharSet.uppercase + CharSet.shiftedNonAlpha,
    
    nonBlank: function(cc) {  
        return " \n\r\t".include(cc) == false;
    }
    
});

// ===========================================================================
// Event handling foundations
// ===========================================================================

/**
 * @class Event: extensions to DOM class Event (NOTE: PORTING-SENSITIVE CODE)
 * The code below extends the default Event class behavior inherited
 * from the web browser.  For a detailed description of the Event class,
 * refer to, e.g., David Flanagan's book (JavaScript: The Definitive Guide) 
 */

var Event = (function() {
    var tmp = Event; // note we're rebinding the name Event to point to a different class 
    var Event = Object.subclass('Event', {

        initialize: function(rawEvent) {
            this.rawEvent = rawEvent;
            this.type = rawEvent.type;
            this.charCode = rawEvent.charCode;

            if (isMouse(rawEvent)) {
                var x = rawEvent.pageX || rawEvent.clientX;
                var y = rawEvent.pageY || rawEvent.clientY;

                // note that FF doesn't doesnt calculate offsetLeft/offsetTop early enough we don't precompute these values
                // assume the parent node of Canvas has the same bounds as Canvas
                this.mousePoint = pt(x - (Canvas.parentNode.offsetLeft || 0), 
                                     y - (Canvas.parentNode.offsetTop  || 0) - 3);
                // console.log("mouse point " + this.mousePoint);
                //event.mousePoint = pt(event.clientX, event.clientY  - 3);
                this.priorPoint = this.mousePoint; 
                // Safari somehow gets the x and y coords so we add them here to Firefox too --PR
                // console.log("InitMouseOver fix for Firefox evt.x=%s evt.clientX", event.x, event.clientX);
                this.x = x;
                this.y = y;

            } 
            this.hand = null;
        
            // use event.timeStamp
            // event.msTime = (new Date()).getTime();
            this.mouseButtonPressed = false;
        },

        stopPropagation: function() {
            this.rawEvent.stopPropagation();
        },

        preventDefault: function() {
            this.rawEvent.preventDefault();
        },

        stop: function() {
            this.preventDefault();
            this.stopPropagation();
        },
	
	isAltDown: function() {
	    return this.rawEvent.altKey;
	},

	isShiftDown: function() {
	    return this.rawEvent.shiftKey;
	},
	
	isCmdDown: function() {
	    return this.rawEvent.cmdKey;
	},

        toString: function() {
            return this.type + "[" + this.rawEvent + (this.mousePoint ?  "@" + this.mousePoint : "") +  "]";
        },

        setButtonPressedAndPriorPoint: function(buttonPressed, priorPoint) {
            this.mouseButtonPressed = buttonPressed;
            // if moving or releasing, priorPoint will get found by prior morph
            this.priorPoint = priorPoint; 
        },
	
        getKeyCode: function() {
            // if (this.type != 'keypress')
            // return;
            with (Event.Safari) {
                switch (this.rawEvent.keyCode) {
                case KEY_LEFT: return Event.KEY_LEFT;
                case KEY_UP: return Event.KEY_UP;
                case KEY_RIGHT: return Event.KEY_RIGHT;
                case KEY_DOWN: return Event.KEY_DOWN;
                case KEY_DELETE: return Event.KEY_DELETE;
                case KEY_END: return Event.KEY_END;
                case KEY_HOME: return Event.KEY_HOME;
                case KEY_PAGE_UP: return Event.KEY_PAGE_UP;
                case KEY_PAGE_DOWN: return Event.KEY_PAGE_DOWN;
                }
            }
            return this.rawEvent.keyCode;
        },
	
        capitalizedType: function() {
            return capitalizer.get(this.type) || this.type;
        }

    });

    Event.rawEvent = tmp;
    Event.extend = function () {} // dummy function to fool prototype.js

    Object.extend(Event, {
        KEY_BACKSPACE: 8,
        KEY_TAB:       9,
        KEY_RETURN:   13,
        KEY_ESC:      27,
        KEY_LEFT:     37,
        KEY_UP:       38,
        KEY_RIGHT:    39,
        KEY_DOWN:     40,
        KEY_DELETE:   46,
        KEY_HOME:     36,
        KEY_END:      35,
        KEY_PAGEUP:   33,
        KEY_PAGEDOWN: 34,
        KEY_INSERT:   45
    });

    var capitalizer = $H({ mouseup: 'MouseUp', mousedown: 'MouseDown', mousemove: 'MouseMove', 
        mouseover: 'MouseOver', mouseout: 'MouseOut', 
        keydown: 'KeyDown', keypress: 'KeyPress', keyup: 'KeyUp' });

    var basicMouseEvents =  ["mousedown", "mouseup", "mousemove"];
    var extendedMouseEvents = [ "mouseover", "mouseout"];
    var mouseEvents = basicMouseEvents.concat(extendedMouseEvents);

    Event.keyboardEvents = ["keypress", "keyup", "keydown"];
    Event.basicInputEvents = basicMouseEvents.concat(Event.keyboardEvents);

    function isMouse(event) {
        return mouseEvents.include(event.type);
    };
    
    function isKeyboard(event) {
        // return this instanceof MouseEvent;
        return Event.keyboardEvents.include(event.rawEvent.type);
    };

    Object.extend(Event, {
    
        KEY_SPACEBAR: 32,
    
        Safari: {
            KEY_LEFT: 63234,
            KEY_UP: 63232,
            KEY_RIGHT: 63235,
            KEY_DOWN: 63233,
            KEY_DELETE: 63272,
            KEY_END: 63275,
            KEY_HOME: 63273,
            KEY_PAGE_UP: 63276,
            KEY_PAGE_DOWN: 63277
        }
        
    });
    return Event;
})();

Object.extend(window.parent, {
    onbeforeunload: function(evt) { console.log('window got unload event %s', evt); },
    onblur: function(evt) { /*console.log('window got blur event %s', evt);*/ },
    onfocus: function(evt) { /*console.log('window got focus event %s', evt);*/ }
});

if (!Prototype.Browser.Rhino)
Object.extend(document, {
    oncontextmenu: function(evt) { 
        var targetMorph = evt.target.parentNode; // target is probably shape (change me if pointer-events changes for shapes)
        if ((targetMorph instanceof Morph) && !(targetMorph instanceof WorldMorph)) {
            evt.preventDefault();
            evt.mousePoint = pt(evt.pageX - (Canvas.parentNode.offsetLeft || 0), 
                                evt.pageY - (Canvas.parentNode.offsetTop  || 0) - 3);
            // evt.mousePoint = pt(evt.clientX, evt.clientY);
            targetMorph.showMorphMenu(evt); 
        } // else get the system context menu
    }.logErrors('Context Menu Handler')
});

// ===========================================================================
// Graphics primitives
// ===========================================================================

/**
 * @class Visual (NOTE: PORTING-SENSITIVE CODE)
 * This class serves as an interface between our JavaScript
 * graphics classes and the underlying graphics implementation.
 * In this particular implementation, graphics primitives are
 * mapped onto various SVG objects and attributes.
 */
Object.subclass('Visual', {   

    rawNode: null, // set by subclasses

    setType: function(type)  {
        this.rawNode.setAttributeNS(Namespace.LIVELY, "type", type);
        return this;
    },

    getType: function()  {
        try {
            return this.rawNode ? this.rawNode.getAttributeNS(Namespace.LIVELY, "type") : "UnknownType";
        } catch (er) {
            console.log('in getType this is %s caller is %s', this, arguments.callee.caller);
            throw er;
        }
    },

    withHref: function(localURl) {
        this.rawNode.setAttributeNS(Namespace.XLINK, "href", localURl);
        return this;
    },

    copy: function() { 
        // FIXME
        return this.rawNode.cloneNode(true); 
    },

    /**
     * @param [String] string the string specification of the fill attribute.
     */
    setFill: function(string) {
        this.rawNode.setAttributeNS(null, "fill", string == null ? "none" : string);
    },
    
    getFill: function() {
        return this.rawNode.getAttributeNS(null, "fill");
    },
    
    setStroke: function(paint) {
        //console.log('new color ' + color);
        this.rawNode.setAttributeNS(null, "stroke", paint == null ? "none" : paint.toString());
    },
    
    getStroke: function() {
        return this.rawNode.getAttributeNS(null, "stroke");
    },
    
    setStrokeWidth: function(width) {
        this.rawNode.setAttributeNS(null, "stroke-width", width);
    },

    getStrokeWidth: function() {
        // FIXME stroke-width can have units
        return parseFloat(this.rawNode.getAttributeNS(null, "stroke-width"));
    },
 
    setFillOpacity: function(alpha) {
        //    console.log('opacity ' + alpha);
        this.rawNode.setAttributeNS(null, "fill-opacity", alpha);
    },

    getFillOpacity: function(alpha) {
        this.rawNode.getAttributeNS(null, "fill-opacity");
    },

    setStrokeOpacity: function(alpha) {
        this.rawNode.setAttributeNS(null, "stroke-opacity", alpha);
    },

    getStrokeOpacity: function(alpha) {
        this.rawNode.getAttributeNS(null, "stroke-opacity");
    },

    setLineJoin: function(joinType) {
        if (!joinType) throw new Error('undefined joinType');
        this.rawNode.setAttributeNS(null, 'stroke-linejoin', joinType);
    },

    setLineCap: function(capType) {
        if (!capType) throw new Error('undefined capType');
        this.rawNode.setAttributeNS(null, 'stroke-linecap', capType);
    },

    setBounds: function(bounds) { 
        throw new Error('setBounds unsupported on type ' + this.type());
    },

    disablePointerEvents: function() {
        this.rawNode.setAttributeNS(null, "pointer-events", "none");
    },

    applyTransform: function(transform) {
        /*
        var list = transform.baseVal;
        // console.log('list was ' + Transform.printSVGTransformList(list));
        list.initialize(this.translation);
        list.appendItem(this.rotation);
        list.appendItem(this.scale);
        if (false &&  !(transformable instanceof HandMorph))
        console.log('setting on ' + Object.inspect(transformable) + " now " + transformable.transform);
        //console.log('list is now ' + Transform.printSVGTransformList(list));
        */
        // KP: Safari needs the attribute instead of the programmatic thing
        // KP: FIXME remove when wrapper transformation is complete
        this.rawNode.setAttributeNS(null, "transform", transform.toAttributeValue());
    },

    retrieveTransform: function() {
        var impl = this.rawNode.transform.baseVal.consolidate();
        return new Transform(impl ? impl.matrix : null); // identity if no transform specified
    },

    disableBrowserHandlers: function() {
        this.rawNode.addEventListener("dragstart", Visual.BrowserHandlerDisabler, true);
        this.rawNode.addEventListener("selectstart", Visual.BrowserHandlerDisabler, true);
    },

    inspect: function() {
	try {
            return this.toString();
	} catch (er) {
	    return "{inspect error " + er + "}"
	}
    }
    
});

Visual.BrowserHandlerDisabler = { 

    handleEvent: function(evt) { 
        evt.preventDefault(); 
        return false;
    }

};

// ===========================================================================
// Shape functionality
// ===========================================================================

// Shapes are portable graphics structures that are used for isolating
// the implementation details of the underlying graphics architecture from
// the programmer.  Each Morph in our system has an underlying Shape object
// that maps the behavior of the Morph to the underlying graphics system
// in a fully portable fashion.

/**
 * @class Shape
 */ 

Visual.subclass('Shape', {

    shouldIgnorePointerEvents: false,

    toString: function() {
        return 'a Shape(%1,%2)'.format(this.getType(), this.bounds());
    },

    getType: function() { 
        return this.rawNode.tagName; 
    },
    
    initialize: function(fill, strokeWidth, stroke) {
        this.setType(this.rawNode.tagName); // debuggability
        
        if (this.shouldIgnorePointerEvents)
            this.disablePointerEvents();

        if (fill !== undefined)
            this.setFill(fill);
        
        if (strokeWidth !== undefined)
            this.setStrokeWidth(strokeWidth);
        
        if (stroke !== undefined)
            this.setStroke(stroke);
    },
    
    applyFunction: function(func,arg) { 
        func.call(this, arg); 
    },
    
    toPath: function() {
        throw new Error('unimplemented');
    }
   
});

// Default visual attributes for Shapes
Object.extend(Shape, {
    controlPointProximity: 10,
    translateVerticesBy: function(vertices, delta) { // utility class method
        return vertices.invoke('addPt', delta); 
    },
    LineJoins: { MITER: "miter", ROUND: "round",  BEVEL: "bevel" },
    LineCaps:  { BUTT: "butt",   ROUND: "round", SQUARE: "square" },
    
    classForTag: function(tagName) {

        switch (tagName) {
        case "rect":
        case "rectangle":
            return RectShape;
        case "ellipse":
            return EllipseShape;
        case "path":
            return PathShape;
        case "polygon":
            return PolygonShape;
        case "polyline":
            return PolylineShape;
        default:
            return null;
        }
    }

});

/**
 * @class RectShape: Rectangle shape
 */ 

Shape.subclass('RectShape', {

    initialize: function($super, rect, color, borderWidth, borderColor) {
        this.rawNode = NodeFactory.create("rect");
        this.setBounds(rect);
        $super(color, borderWidth, borderColor);
        return this;
    },

    deserialize: function(importer, rawNode) {
	this.rawNode = rawNode;
    },

    copy: function() {
        var rect = new RectShape(this.bounds(), this.getFill(), this.getStrokeWidth(), this.getStroke());
        rect.roundEdgesBy(this.getEdgeRounding());
        return rect;
    },

    setBounds: function(r) {
        with (this.rawNode) {
            setAttributeNS(null, "x", r.x);
            setAttributeNS(null, "y", r.y);
            setAttributeNS(null, "width", Math.max(0, r.width));
            setAttributeNS(null, "height", Math.max(0, r.height));
        }
        return this;
    },
    
    toPath: function() {
        // FIXME account for rounded edges
        return this.bounds().toPath();
    },
    
    bounds: function() {
        var x = this.rawNode.x.baseVal.value;
        var y = this.rawNode.y.baseVal.value;
        var width = this.rawNode.width.baseVal.value;
            var height = this.rawNode.height.baseVal.value;
        return new Rectangle(x, y, width, height);
    },
    
    containsPoint: function(p) {
        var x = this.rawNode.x.baseVal.value;
        var width = this.rawNode.width.baseVal.value;
        if (!(x <= p.x && p.x <= x + width))
            return false;
        var y = this.rawNode.y.baseVal.value;
        var height = this.rawNode.height.baseVal.value;
        return y <= p.y && p.y <= y + height;
    },
    
    reshape: function(partName,newPoint, ignored1, ignored2) {
        var r = this.bounds().withPartNamed(partName, newPoint);
        this.setBounds(r);
    },
    
    controlPointNear: function(p) {
        var bnds = this.bounds();
        return bnds.partNameNear(Rectangle.corners, p, Shape.controlPointProximity);
    },
    
    possibleHandleForControlPoint: function(targetMorph,mousePoint,hand) {
        var partName = this.controlPointNear(mousePoint);
        if (partName == null) 
            return null;
        var loc = this.bounds().partNamed(partName);
        return new HandleMorph(loc, "rect", hand, targetMorph, partName); 
    },
    
    getEdgeRounding: function() {
        return this.rawNode.getAttributeNS(null, "rx");
    },
    
    roundEdgesBy: function(r) {
        this.rawNode.setAttributeNS(null, "rx", r);
        this.rawNode.setAttributeNS(null, "ry", r);
        return this;
    }

});

/**
 * @class EllipseShape
 */ 

Shape.subclass('EllipseShape', {

    initialize: function($super, rect, color, borderWidth, borderColor) {
        this.rawNode = NodeFactory.create("ellipse");
        this.setBounds(rect);
        $super(color, borderWidth, borderColor);
    },

    deserialize: function(importer, rawNode) {
	this.rawNode = rawNode;
    },
    
    copy: function() {
        return new EllipseShape(this.bounds(), this.getFill(), this.getStrokeWidth(), this.getStroke());
    },

    setBounds: function(r) {
	var n = this.rawNode;
        n.setAttributeNS(null, "cx", r.x + r.width/2);
        n.setAttributeNS(null, "cy", r.y + r.height/2);
        n.setAttributeNS(null, "rx", r.width/2);
        n.setAttributeNS(null, "ry", r.height/2);
        return this;
    },
    
    // For ellipses, test if x*x + y*y < r*r
    containsPoint: function(p) {
        var w = this.rawNode.rx.baseVal.value * 2;
        var h = this.rawNode.ry.baseVal.value * 2;
        var c = pt(this.rawNode.cx.baseVal.value, this.rawNode.cy.baseVal.value);
        var dx = Math.abs(p.x - c.x);
        var dy = Math.abs(p.y - c.y)*w/h;
        return (dx*dx + dy*dy) <= (w*w/4) ; 
    },
    
    bounds: function() {
        //console.log("rawNode " + this.rawNode);
        // for (var prop in this.rawNode) console.log("prop " + prop + " = " + this.rawNode[prop]);
        var w = this.rawNode.rx.baseVal.value * 2;
        var h = this.rawNode.ry.baseVal.value * 2; 
        var x = this.rawNode.cx.baseVal.value - this.rawNode.rx.baseVal.value;
        var y = this.rawNode.cy.baseVal.value - this.rawNode.ry.baseVal.value;
        return new Rectangle(x, y, w, h);
    }, 
    
    controlPointNear: function(p) {
        var bnds = this.bounds();
        return bnds.partNameNear(Rectangle.sides, p, Shape.controlPointProximity);
    },
    
    reshape: RectShape.prototype.reshape,

    possibleHandleForControlPoint: RectShape.prototype.possibleHandleForControlPoint

});

/**
 * @class PolygonShape
 */ 

Shape.subclass('PolygonShape', {

    shouldCacheVertices: false,
    
    initialize: function($super, vertlist, color, borderWidth, borderColor) {
        this.rawNode = NodeFactory.create("polygon");
        this.setVertices(vertlist);
        $super(color, borderWidth, borderColor);
	if (this.shouldCacheVertices) 
	    this.cachedVertices = null;
        return this;
    },

    deserialize: function(importer, rawNode) {
	this.rawNode = rawNode;
	if (this.shouldCacheVertices) 
	    this.cachedVertices = this.vertices();
    },


    copy: function() {
        return new PolygonShape(this.vertices(), this.getFill(), this.getStrokeWidth(), this.getStroke());
    },
    
    setVertices: function(vertlist) {
	///console.log("vertlist is " + vertlist + " for " + Function.showStack());
        if (this.rawNode.points) {
            this.rawNode.points.clear();
        }
        this.rawNode.setAttributeNS(null, "points", vertlist.map(function (p) { return p.x + "," + p.y }).join(' '));
        if (this.shouldCacheVertices) {
            this.cachedVertices = vertlist.clone();
        }
        // vertlist.forEach( function(p) {  this.points.appendItem(p); }, this);
    },

    vertices: function() {
        if (this.shouldCacheVertices && this.cachedVertices) { 
            return this.cachedVertices;
        }
        var array = [];
        for (var i = 0; i < this.rawNode.points.numberOfItems; i++) {
            array.push(Point.ensure(this.rawNode.points.getItem(i)));
        }
        return array;
    },

    toString: function() {
        var pts = this.vertices();
        return this.rawNode.tagName + "[" + pts + "]";
    },

    bounds: function() {
        // FIXME very quick and dirty, consider caching or iterating over this.points
        var vertices = this.vertices();
        // Opera has been known not to update the SVGPolygonShape.points property to reflect the SVG points attribute
        console.assert(vertices.length > 0, 
               "PolygonShape.bounds: vertices has zero length, " + this.rawNode.points 
               + " vs " + this.rawNode.getAttributeNS(null, "points"));
        return Rectangle.unionPts(vertices);
    },

    reshape: function(partName, newPoint, handle, lastCall) {
        var ix = partName; // better name -- it's an index into vertices
        var verts = this.vertices();  // less verbose
        if (ix < 0) { // negative means insert a vertex
            ix = -partName;
            handle.partName = ix; 
            handle.type = "rect"; // become a regular handle
            verts.splice(ix, 0, newPoint);
            this.setVertices(verts);
            return; 
        }
        var closed = verts[0].eqPt(verts[verts.length - 1]);
        if (closed && ix == 0) {  // and we're changing the shared point (will always be the first)
            verts[0] = newPoint;  // then change them both
            verts[verts.length - 1] = newPoint; 
        } else {
            verts[ix] = newPoint;
        }
        handle.setBorderColor(Color.blue);
        var howClose = 6;
        if (verts.length > 2) {
            // if vertex being moved is close to an adjacent vertex, make handle show it (red)
            // and if its the last call (mouse up), then merge this with the other vertex
            if (ix > 0 && verts[ix - 1].dist(newPoint) < howClose) {
                if (lastCall) { 
                    verts.splice(ix, 1); if (closed) verts[0] = verts[verts.length - 1]; 
                } else {
                    handle.setBorderColor(Color.red);
                } 
            }
                
            if (ix < verts.length - 1 && verts[ix + 1].dist(newPoint)<howClose) {
                if (lastCall) { 
                    verts.splice(ix, 1); 
                
                    if (closed) { 
                        verts[verts.length - 1] = verts[0];
                    }
 
                } else {
                    handle.setBorderColor(Color.red);
                } 
            }
        }
        this.setVertices(verts); 
    },
    
    controlPointNear: function(p) {
        var verts = this.vertices();

        for (var i = 0; i < verts.length; i++) { // vertices
            if (verts[i].dist(p) < Shape.controlPointProximity) 
                return i; 
        }

        for (var i = 0; i < verts.length - 1; i++) { // midpoints (for add vertex) return - index
            if (verts[i].midPt(verts[i + 1]).dist(p) < Shape.controlPointProximity) 
                return -(i + 1); 
        }

        return null; 
    },
    
    // borrowed from http://local.wasp.uwa.edu.au/~pbourke/geometry/insidepoly/
    containsPoint: function(p) {
        var counter = 0;
        var vertices = this.vertices();
        var p1 = vertices[0];
        for (var i = 1; i <= vertices.length; i++) {
            var p2 = vertices[i % vertices.length];
            if (p.y > Math.min(p1.y, p2.y)) {
                if (p.y <= Math.max(p1.y, p2.y)) {
                    if (p.x <= Math.max(p1.x, p2.x)) {
                        if (p1.y != p2.y) {
                            var xinters = (p.y-p1.y)*(p2.x-p1.x)/(p2.y-p1.y)+p1.x;
                            if (p1.x == p2.x || p.x <= xinters)
                                counter ++;
                        }
                    }
                }
            }
            p1 = p2;
        }
        
        if (counter % 2 == 0) {
            return false;
        } else {
            return true;
        }
    },

    possibleHandleForControlPoint: function(targetMorph, mousePoint, hand) {
        var partName = this.controlPointNear(mousePoint);

        if (partName == null) 
            return null;

        var vertices = this.vertices();

        if (partName >= 0) { 
            var loc = vertices[partName]; 
            var shape = "rect"; 
        } else { 
            var loc = vertices[-partName].midPt(vertices[-partName-1]); 
            var shape = "ellipse"; 
        } 

        return new HandleMorph(loc, shape, hand, targetMorph, partName); 
    }

});

/**
 * @class PolylineShape
 */ 

Shape.subclass('PolylineShape', {

    initialize: function($super, vertlist, borderWidth, borderColor) {
        this.rawNode = NodeFactory.create("polyline");
        this.setVertices(vertlist);
        $super(null, borderWidth, borderColor);
    },

    deserialize: function(importer, rawNode) {
	this.rawNode = rawNode;
    },
    
    copy: function() {
        return new PolylineShape(this.vertices(), this.getStrokeWidth(), this.getStroke());
    },

    containsPoint: function(p) {
        var howNear = 6;
        var vertices = this.vertices();
        for (var i = 1; i < vertices.length; i++) {
            var pNear = p.nearestPointOnLineBetween(vertices[i-1], vertices[i]);
            if (pNear.dist(p) < howNear) 
                return true; 
        }
        return false; 
    },
    
    // poorman's traits :)
    bounds: PolygonShape.prototype.bounds,
    vertices: PolygonShape.prototype.vertices,
    setVertices: PolygonShape.prototype.setVertices,
    reshape: PolygonShape.prototype.reshape,
    controlPointNear: PolygonShape.prototype.controlPointNear,
    possibleHandleForControlPoint: PolygonShape.prototype.possibleHandleForControlPoint

});

/**
 * @class PathShape
 */ 

var PathShape = Class.create(Shape, {
    
    initialize: function($super, vertlistOrRawNode, color, borderWidth, borderColor) {
        if (vertlistOrRawNode instanceof Node) {
            this.rawNode = vertlistOrRawNode;
            $super();
        } else {
            this.rawNode = NodeFactory.create("path");
            $super(color, borderWidth, borderColor);
            try {
                if (vertlistOrRawNode) this.setVertices(vertlistOrRawNode);
            } catch (er) { console.log("vertlistOrRawNode" + vertlistOrRawNode); } 
        }
        return this;
    },
    
    setVertices: function(vertlist) {
        // emit SVG path symbol based on point attributes
        // p==point, i=array index
        function map2svg(p,i) {
            var code;
            if (i==0 || p.type && p.type=="move") {
                code = "M";
            } else if (p.type && p.type=="line") {
                code = "L";
            } else if (p.type && p.type=="arc" && p.radius) {
                code = "A" + (p.radius.x || p.radius) + "," +
                    (p.radius.y || p.radius) + " " + (p.angle || "0") +
                    " " + (p.mode || "0,1") + " ";
            } else if (p.type && p.type=="curve" && p.control) {
               // keep control points relative so translation works
               code = "Q" + (p.x+p.control.x) + "," + (p.y+p.control.y) + " ";
            } else {
               code = "T";  // default - bezier curve with implied control pts
            }
            return code + p.x + "," + p.y;
        }

        var d = vertlist.map(map2svg).join('');
        // console.log("d=" + d);
        this.rawNode.setAttributeNS(null, "d", d);
        this.verticesList = vertlist;
        delete this.cachedBounds;
    },
    
    vertices: function() {
        return this.verticesList;
    },
    
    moveTo: function(x, y) {
        this.rawNode.pathSegList.appendItem(this.rawNode.createSVGPathSegMovetoAbs(x, y));
    },
    
    curveTo: function(x, y) {
        this.rawNode.pathSegList.appendItem(this.rawNode.createSVGPathSegCurvetoQuadraticSmoothAbs(x, y));
    },

    lineTo: function(x, y) {
        this.rawNode.pathSegList.appendItem(this.rawNode.createSVGPathSegLinetoAbs(x, y));
    },

    close: function() {
        this.rawNode.pathSegList.appendItem(this.rawNode.createSVGPathSegClosePath());
    },

    containsPoint: function(p) {
        return false; // FIXME
    },
    
    copy: function() { 
        return new PathShape(this.vertices(), this.getFill(), this.getStrokeWidth(), this.getStroke());
    },

    bounds: function() {
        if (!this.cachedBounds) {
            this.cachedBounds = Rectangle.unionPts(this.vertices());
        }
        return this.cachedBounds;
    },

    // poorman's traits :)
    containsPoint: PolygonShape.prototype.containsPoint,
    controlPointNear: PolygonShape.prototype.controlPointNear,
    possibleHandleForControlPoint: PolygonShape.prototype.possibleHandleForControlPoint,
    reshape: PolygonShape.prototype.reshape,
    controlPointNear: PolygonShape.prototype.controlPointNear

});

var NodeList = {
    // FIXME these implementations are rather lame
    toArray: function(target) {
        var array = [];
        for (var m = target.lastChild; m != null; m = m.previousSibling) { 
            array.push(m);
        }
        return array;
    },
    
    invoke: function(target, method) {
        var args = $A(arguments).slice(2);
        var array = NodeList.toArray(target);
        return array.map(function(value) { return value[method].apply(value, args); });
    },
    
    each: function(target, iterator, context) {
        return NodeList.toArray(target).each(iterator, context);
    },
    
    withType: function(type) {
        return NodeList.become(NodeFactory.create('g'), type);
    },
    
    become: function(node, type) {
        node.setAttributeNS(Namespace.LIVELY, "type", type);
        return node;
    },
    
    clear: function(list) {
        while (list.firstChild) list.removeChild(list.firstChild);
    },
    
    push: function(list, element) {
        // FIXME remove the alternative
        list.appendChild(element.rawNode);
    },

    pushFront: function(list, element) {
        list.insertBefore(element.rawNode, list.firstChild);
    },

    remove: function(list, element) {
        if (element.rawNode.parentNode === list) {
            // FIXME remove the alternative
            list.removeChild(element.rawNode);
            return true;
        }
        return false;
    }
    
}

// ===========================================================================
// Morph functionality
// ===========================================================================

/**
 * @class MouseHandlerForDragging: Mouse event handling for dragging
 */ 

MouseHandlerForDragging = Class.create({
    
    initialize: function() {
        throw new Error('singleton, use the prototype');
    },

    handleMouseEvent: function(evt, targetMorph) {
        var capType = evt.capitalizedType();
        var handler = targetMorph['on' + capType];
        if (capType == "MouseDown") evt.hand.setMouseFocus(targetMorph);
        if (handler == null) console.log("bah, null handler on " + capType);
        handler.call(targetMorph, evt);
        if (capType == "MouseUp") {
            // if focus changed, then don't cancel it
            if (evt.hand.mouseFocus === targetMorph) { 
                evt.hand.setMouseFocus(null);
            }
        }
        return true; 
    },
    
    handlesMouseDown: function(evt) { 
        return false;
    }

});

var Cloner = {
    toString: function() { 
	return "Cloner"; 
    }
}; // a marker for cloning

/**
 * @class Exporter: Implementation class for morph serialization
 */

var Exporter = Class.create({
    rootMorph: null,
    
    initialize: function(rootMorph) {
        this.rootMorph = rootMorph;
    },
    
    serialize: function() {
        // model is inserted as part of the root morph.
        var modelNode = (this.rootMorph.getModel() || { toMarkup: function() { return null; }}).toMarkup();
	var fieldDescs = [];

	// introspect all the fields
	this.rootMorph.withAllSubmorphsDo(function() {
	    for (var prop in this) {
		if (prop == 'owner') // we'll deal manually
		    continue;
		var m = this[prop];
		if (m instanceof Morph) {
		    var desc = NodeFactory.createNS(Namespace.LIVELY, "field");
		    desc.setAttributeNS(Namespace.LIVELY, "name", prop);
		    desc.setAttributeNS(Namespace.LIVELY, "ref", m.id);
		    this.addNonMorph(desc);
		    fieldDescs.push(desc);
		}
	    }
	});
    
        if (modelNode) {
            try {
                this.rootMorph.addNonMorph(modelNode);
            } catch (er) { console.log("got problem, rawNode %s, modelNode %s", this.rootMorph.rawNode, modelNode); }
        }
        var result = Exporter.nodeToString(this.rootMorph.rawNode);
        if (modelNode) {
            this.rootMorph.rawNode.removeChild(modelNode);
        }
	// now remove all the serialization-related nodes
	for (var i = 0; i < fieldDescs.length; i++) {
	    fieldDescs[i].parentNode.removeChild(fieldDescs[i]);
	}
        return result;
    }

});

Object.extend(Exporter, {

    nodeToString: function(node) {
        return node ? new XMLSerializer().serializeToString(node) : null;
    }

});


/**
 * @class Importer: Implementation class for morph de-serialization
 */

var Importer = Class.create({

    morphMap: null,

    toString: function() {
	return "Importer";
    },
    
    initialize: function() {
        this.morphMap = new Hash();
    },
    
    addMapping: function(oldId, newMorph) {
        this.morphMap["" + oldId] = newMorph; // force strings just in case
    },
    
    lookupMorph: function(oldId) {
        var result = this.morphMap["" + oldId];
        if (!result) console.log('no mapping found for oldId %s', oldId);
        return result;
    },
    
    importFromNode: function(rawNode) {
        ///console.log('making morph from %s %s', node, node.getAttributeNS(Namespace.LIVELY, "type"));
        // call reflectively b/c 'this' is not a Visual yet. 
        var morphTypeName = rawNode.getAttributeNS(Namespace.LIVELY, "type");

        if (!morphTypeName || !Global[morphTypeName]) {
            throw new Error('node %1 (parent %2) cannot be a morph of %3'.format(
                            rawNode.tagName, rawNode.parentNode, morphTypeName));
        }

        try {
            return new Global[morphTypeName](this, rawNode);
        } catch (er) {
            console.log("problem instantiating type %s from node %s: %s", morphTypeName, rawNode.tagName, er);
	    return null;
        }
    },
    
    importFromString: function(string) {
        return this.importFromNode(this.parse(string));
    },

    parse: function(string) {
        var parser = new DOMParser();
        var xml = parser.parseFromString('<?xml version="1.0" standalone="no"?> ' + string, "text/xml");
        return document.adoptNode(xml.documentElement);
    },

    importModelFrom: function(ptree) {
        var model = new SimpleModel(null);
        
        for (var node = ptree.firstChild; node != null; node = node.nextSibling) {
            switch (node.tagName) {
            case "a0:dependent": // Firefox cheat
            case "dependent":
                var oldId = node.getAttributeNS(Namespace.LIVELY, "ref");
                var dependent = this.lookupMorph(oldId);
                if (!dependent)  {
                    console.warn('dep %s not found', oldId);
                    continue; 
                }
                dependent.modelPlug.model = model;
                model.addDependent(dependent);
                break;
            case "a0:variable": // Firefox cheat
            case "variable":
                var name = node.getAttributeNS(Namespace.LIVELY, "name");
                var value = node.textContent;
                if (value) {
                    value = value.evalJSON();
                }
                model.addVariable(name, value);
                //var value = node.getAttribute('value');
                //variables.push(name);
                break;
            default:
                console.log('got unexpected node %s %s', node.tagName, node); 
            }
        }

        console.log('restored model %s', model);
        return model;
    }
    
});

/**
 * @class Morph: Every graphical object in our system is a morph.
 * Class Morph implements the common functionality inherited by 
 * all the morphs. 
 */ 

Morph = Visual.subclass("Morph", {

    // prototype vars
    defaultFill: Color.primary.green,
    defaultBorderWidth: 1,
    defaultBorderColor: Color.black,

    focusedBorderColor: Color.blue,
    focusHaloBorderWidth: 4,

    fishEye: false,        // defines if fisheye effect is used
    fisheyeScale: 1.0,     // set the default scaling to 1.0
    fisheyeGrowth: 1.0,    // up to fisheyeGrowth size bigger (1.0 = double size)
    fisheyeProximity: 0.5, // where to react wrt/ size (how close we need to be)

    clipPath: null, // KP: should every morph should have one of those?
    keyboardHandler: null, //a KeyboardHandler for keyboard repsonse, etc
    layoutHandler: null, //a LayoutHandler for special response to setExtent, etc
    openForDragAndDrop: true, // Submorphs can be extracted from or dropped into me
    mouseHandler: MouseHandlerForDragging.prototype, //a MouseHandler for mouse sensitivity, etc
    stepHandler: null, // a stepHandler for time-varying morphs and animation 
    noShallowCopyProperties: ['id', 'rawNode', 'rawSubnodes', 'shape', 'submorphs', 'stepHandler'],

    nextNavigableSibling: null, // keyboard navigation


    initialize: function(initialBounds, shapeType) {
        //console.log('initializing morph %s %s', initialBounds, shapeType);
        this.submorphs = [];
        this.rawSubnodes = null;
        this.owner = null;

        this.rawNode = NodeFactory.create("g");

        this.setType(this.constructor.type); // this.type is actually a prototype var
        this.pvtSetTransform(Transform.createSimilitude(this.defaultOrigin(initialBounds, shapeType), 0, 1.0));
        this.pickId();
        this.initializePersistentState(initialBounds, shapeType);

        this.initializeTransientState(initialBounds);
        this.disableBrowserHandlers();        
        if (this.activeScripts) {
            console.log('started stepping %s', this);
            this.startSteppingScripts();
        }

    },

    deserialize: function(importer, rawNode) {
	this.rawNode = rawNode;
	
        this.submorphs = [];
        this.rawSubnodes = null;
        this.owner = null;

        this.setType(this.constructor.type);
        this.pvtSetTransform(this.retrieveTransform());
        var prevId = this.pickId();
        this.prevId = prevId; // for debugging FIXME remove later!
        importer.addMapping(prevId, this); 

        this.restoreFromSubnodes(importer);
        this.restorePersistentState(importer);    

        this.initializeTransientState(null);

        this.disableBrowserHandlers();        


        if (this.activeScripts) {
            console.log('started stepping %s', this);
            this.startSteppingScripts();
        }

    },

    copyFrom: function(other) {
        this.rawNode = NodeFactory.create("g");

        this.submorphs = [];
        this.rawSubnodes = null;
        this.owner = null;

        this.setType(this.constructor.type);
        this.pvtSetTransform(other.retrieveTransform());
        this.initializePersistentState(pt(0,0).asRectangle(), "rect");
        var prevId = this.pickId();

        this.initializeTransientState(null);
	

        for (var p in other) {
            if (!(other[p] instanceof Function) 
                && other.hasOwnProperty(p) 
                && !this.noShallowCopyProperties.include(p)) {
                this[p] = other[p];
		if (this[p] instanceof Morph && this[p].owner === other) {
		    // an instance field points to a submorph, so copy
		    // should point to a copy of the submorph
		}

		
            }
        }  // shallow copy by default

        this.setShape(other.shape.copy());    
        if (other.cachedTransform) { 
            this.cachedTransform = other.cachedTransform.copy();
        } 

        if (other.clipPath) {
            console.log('other clipPath is ' + other.clipPath);
            this.clipToShape();
            console.log("copy: optimistically assuming that other (%s) is clipped to shape", other);
        }

        if (other.hasSubmorphs()) { // deep copy of submorphs
            other.submorphs.each(function(m) { 
                var copy = m.copy();
                this.internalAddMorph(copy, false);
                var propname = m.rawNode.getAttributeNS(Namespace.LIVELY, "property");
                if (propname) {
                    this[propname] = copy;
                    copy.rawNode.setAttributeNS(Namespace.LIVELY, "property", propname);
                }
            }.bind(this));
        }
        
        if (other.stepHandler != null) { 
            this.stepHandler = other.stepHandler.copyForOwner(this);
        }

        if (other.activeScripts != null) { 
            for (var i = 0; i < other.activeScripts.length; i++) {
                var a = other.activeScripts[i];
                // Copy all reflexive scripts (messages to self)
                if (a.actor === other) {
                    this.startStepping(a.stepTime, a.scriptName, a.argIfAny);
                    // Note -- may want to startStepping other as well so they are sync'd
                }
            }
        } 

        this.layoutChanged();

        this.disableBrowserHandlers();        
        if (this.activeScripts) {
            console.log('started stepping %s', this);
            this.startSteppingScripts();
        }

        return this; 
    },

    restorePersistentState: function(importer) {
        return; // override in subclasses
    },

    restoreText: function(importer, node) {
        throw new Error(this + " does not support text");
    },

    restoreDefs: function(node) {
        // FIXME FIXME, this is painfully ad hoc!
        if (this.defs) console.warn('%s already has defs %s', this, this.defs);
        this.defs = node;
        for (var def = node.firstChild; def != null; def = def.nextSibling) {
            switch (def.tagName) {
            case "clipPath":
                var newPathId = "clipPath_" + this.id;
                var myClipPath = this.rawNode.getAttributeNS(null, 'clip-path');
                if (myClipPath) {
                    this.rawNode.setAttributeNS(null, 'clip-path', 'url(#'  + newPathId + ')');
                    this.clipPath = def;
                } else { 
                    console.log('myClip is undefined on %s', this); 
                }
                def.setAttribute('id', newPathId);
                console.log('assigned new id %s', def.getAttribute('id'));
                break;
            case "linearGradient":
            case "radialGradient": // FIXME gradients can be used on strokes too
                var newFillId = "fill_" + this.id;
                if (this.shape) {
                    var myFill = this.shape.rawNode.getAttributeNS(null, 'fill');
                    if (myFill) {
                        this.shape.rawNode.setAttributeNS(null, 'fill', 'url(#' + newFillId + ')');
                        this.fill = def;
                    } else {
                        console.warn('myFill undefined on %s', this);
                    }
                } else {
                    console.warn('ouch, cant set fill %s yet, no shape...', newFillId);
                }
                def.setAttribute('id', newFillId);
                break;
            default:
                console.warn('unknown def %s', def);
            }
        }
    },

    restoreFromSubnodes: function(importer) {
        //  wade through the children
        var children = [];
        for (var desc = this.rawNode.firstChild; desc != null; desc = desc.nextSibling) {
            var type = desc.getAttributeNS(Namespace.LIVELY, "type");
	    // depth first traversal
	    if (type == "Submorphs") {
		this.rawSubnodes = NodeList.become(desc, type);
		NodeList.each(this.rawSubnodes, function(node) { 
                    var morph = importer.importFromNode(node);
                    this.submorphs.push(morph); 
                    morph.owner = this;
		}.bind(this));
	    } else {
		children.push(desc);
	    }
        }

        var modelNode = null;

        for (var i = 0; i < children.length; i++) {
            var node = children[i];
            switch (node.tagName) {
            case "ellipse":
                this.shape = new EllipseShape(importer, node);
                break;
            case "rect":
                this.shape = new RectShape(importer, node);
                break;
            case "polyline":
                this.shape = new PolylineShape(importer, node);
                break;
            case "polygon":
                this.shape = new PolygonShape(importer, node);
                break;
            case "defs": 
                this.restoreDefs(node);
                break;
            case "text": // this shouldn't be triggered in non-TextMorphs
                this.restoreText(importer, node);
                break;
            case "g": {
                var type = node.getAttributeNS(Namespace.LIVELY, "type");
                if (!this.restoreContainer(node, type, importer)) {
                    console.log("unknown container %s of type %s", node, type);
                }
                break;
            }
            // nodes from the Lively namespace
            case "a0:action": // Firefox cheat
            case "action": {
                var a = node.textContent.evalJSON();
                // console.info("starting stepping %s based on %s", this, node.textContent);
		this.addActiveScript(a);
                // this.startStepping(a.stepTime, a.scriptName, a.argIfAny);
                break;
            }
            case "a0:model": // Firefox cheat
            case "model": {
                if (modelNode) console.warn("%s already has modelNode %s", this, modelNode);
                modelNode = node;
                // postpone hooking up model until all the morphs are reconstructed
                console.info("found modelNode %s", Exporter.nodeToString(node));
                break;
            } 
            case "a0:modelPlug": // Firefox cheat
            case "modelPlug": {
                this.modelPlug = Model.becomePlugNode(node);
                this.addNonMorph(this.modelPlug.rawNode);
                console.info("%s reconstructed plug %s", this, this.modelPlug);
                break;
            } 
	    case "field": {
		console.log("found field " + Exporter.nodeToString(node));
		var name = node.getAttributeNS(Namespace.LIVELY, "name");
		var ref = node.getAttributeNS(Namespace.LIVELY, "ref");
		if (name) {
		    var found = this[name] = importer.lookupMorph(ref);
		    if (!found) {
			console.warn("no field found for ref " + ref);
		    } else {
			node.parentNode.removeChild(node);
			console.log("found " + name + "=" + found);
		    }
		}
		break;
	    }

            default: {
                if (node.nodeName == '#text') {
                    console.log('text tag name %s', node.tagName);
                    // whitespace, ignore
                } else {
                    console.warn('cannot handle element %s, %s', node.tagName, node.textContent);
                }
            }
            }
        } // end for
	
        if (modelNode) {
            var model = importer.importModelFrom(modelNode);
            this.rawNode.removeChild(modelNode); // currently modelNode is not permanently stored 
        }
    },//.logErrors('restoreFromSubnodes'),
    
    restoreContainer: function(element/*:Element*/, type /*:String*/, importer/*Importer*/)/*:Boolean*/ {
        switch (type) {
        case "FocusHalo":
            this.rawNode.removeChild(element);
            return true;
        default:
            return false;
        }
        
    },
    
    initializePersistentState: function(initialBounds /*:Rectangle*/, shapeType/*:String*/) {
        // a rect shape by default, will change later
        switch (shapeType) {
        case "ellipse":
            this.shape = new EllipseShape(initialBounds.translatedBy(this.origin.negated()),
                this.defaultFill, this.defaultBorderWidth, this.defaultBorderColor);
            break;
        default:
            // polygons and polylines are set explicitly later
            this.shape = new RectShape(initialBounds.translatedBy(this.origin.negated()),
                this.defaultFill, this.defaultBorderWidth, this.defaultBorderColor);
            break;
        }

        this.rawSubnodes = NodeList.withType("Submorphs");
        this.rawNode.appendChild(this.rawSubnodes);

        this.addNonMorph(this.shape.rawNode);
    
        return this;
    },
    
    pickId: function() {
        var previous = this.rawNode.getAttribute("id"); // this can happen when deserializing
        this.id = Morph.newMorphId();
        this.rawNode.setAttribute("id", this.id); // this may happen automatically anyway by setting the id property
        return previous;
    },

    // setup various things 
    initializeTransientState: function(initialBounds) { 
        this.fullBounds = initialBounds; // a Rectangle in owner coordinates
        // this includes the shape as well as any submorphs
        // cached here and lazily computed by bounds(); invalidated by layoutChanged()
    
        // this.created = false; // exists on server now
        // some of this stuff may become persistent
    }

});

// Functions for change management
Object.extend(Morph, {
    
    morphCounter: 0,

    newMorphId: function() {
        return ++Morph.morphCounter;
    },

    // this function creates an advice function that ensures that the mutation is properly recorded
    onChange: function(fieldName) {
        return function(proceed, newValue) {
            var result = proceed(newValue);
            this.recordChange(fieldName);
            this.changed(); 
            return result;
        }
    },

    onLayoutChange: function(fieldName) { 
        return function(/* arguments*/) {
            this.changed();
            var args = $A(arguments);
            var proceed = args.shift();
            var result = proceed.apply(this, args);
            this.recordChange(fieldName);
            this.layoutChanged();
            this.changed(); 
            return result;
        }
    }

});

// Functions for manipulating the visual attributes of Morphs
Morph.addMethods({

    
    setFill: function(fill) {
        // console.log('setting %s on %s', fill, this);
        var old = this.fill;
        this.fill = fill;
        if (old instanceof Gradient) {
            var parent = old.rawNode.parentNode;
            if (parent) parent.removeChild(old.rawNode);
        }
        if (fill == null) {
            this.shape.setFill(null);
        } else if (fill instanceof Color) {
            this.shape.setFill(fill.toString());
        } else if (fill instanceof Gradient || fill instanceof StipplePattern) {
            var id = fill.rawNode.getAttribute("id");
            var newId = "gradient_" + this.id;
            if (newId != id) {
                this.fill = fill.copy(); 
                this.fill.rawNode.setAttribute("id", newId);
            }
            if (!this.defs) {
                this.defs = NodeFactory.create("defs");
                this.addNonMorph(this.defs);
            }
            this.shape.setFill("url(#" + newId + ")");
            this.defs.appendChild(this.fill.rawNode);
        }
    },//.wrap(Morph.onChange('shape'),
    
    getFill: function() {
        return this.fill; 
    },
    
    setBorderColor: function(newColor) { this.shape.setStroke(newColor); },//.wrap(Morph.onChange('shape')),

    getBorderColor: function() {
        return Color.parse(this.shape.getStroke());
    },

    setBorderWidth: function(newWidth) { this.shape.setStrokeWidth(newWidth); },//.wrap(Morph.onChange('shape')),

    getBorderWidth: function() {
        return this.shape.getStrokeWidth(); 
    },

    setFillOpacity: function(op) { this.shape.setFillOpacity(op); },//.wrap(Morph.onChange('shape')),

    setStrokeOpacity: function(op) { this.shape.setStrokeOpacity(op); },//.wrap(Morph.onChange('shape')),

    applyStyle: function(spec) {
        // Adjust all visual attributes specified in the style spec
        if (spec.borderWidth) this.setBorderWidth(spec.borderWidth);
        if (spec.borderColor) this.setBorderColor(spec.borderColor);
        if (this.shape.roundEdgesBy) { 
            this.shape.roundEdgesBy(spec.rounding ? spec.rounding : 0);
        }
        if (spec.fill) this.setFill(spec.fill);
        if (spec.opacity) {
                this.setFillOpacity(spec.opacity);
                this.setStrokeOpacity(spec.opacity); 
        }
        if (spec.fillOpacity) this.setFillOpacity(spec.fillOpacity);
        if (spec.strokeOpacity) this.setStrokeOpacity(spec.strokeOpacity);
        this.fillType = spec.fillType ? spec.fillType : "simple";
        this.baseColor = spec.baseColor ? spec.baseColor : Color.gray;
    },

    makeStyleSpec: function() {
        // Adjust all visual attributes specified in the style spec
        var spec = { };
        spec.borderWidth = this.getBorderWidth();
        spec.borderColor = this.getBorderColor();
        spec.fill = this.getFill();
        spec.fillType = "simple";
        if (spec.fill instanceof LinearGradient) spec.fillType = "linear gradient";
        if (spec.fill instanceof RadialGradient) spec.fillType = "radial gradient";
        if (this.baseColor) spec.baseColor = this.baseColor;
        if (this.fillType) spec.fillType = this.fillType;
        if (this.shape.getEdgeRounding) spec.rounding = + this.shape.getEdgeRounding();
        spec.fillOpacity = this.shape.getFillOpacity();
        if (!spec.fillOpacity) spec.fillOpacity = 1.0;
        spec.strokeOpacity = this.shape.getStrokeOpacity();
        if (!spec.strokeOpacity) spec.strokeOpacity = 1.0;
        return spec;
    },

    applyStyleNamed: function(name) {
        this.applyStyle(this.styleNamed(name));
    },

    styleNamed: function(name) {
        // Look the name up in the Morph tree, else in current world
        if (this.displayTheme) return this.displayTheme[name];
        if (this.owner) return this.owner.styleNamed(name);
        return WorldMorph.current().styleNamed(name);
    },

    linkToStyles: function(arrayOfNames) {
        // Record the links for later updates, and apply them now
        this.styleLinks = arrayOfNames;
        this.applyLinkedStyles();
    },

    respondToChangingStyleNamed: function(name) {
        // (re)Apply my linked styles if name refers to one of them
        if (this.styleLinks && this.styleLinks.include(name)) this.applyLinkedStyles();
    },

    applyLinkedStyles: function() {
        // Apply all the styles to which I am linked, in order
        if (!this.styleLinks) return;
        
        for (var i=0; i< this.styleLinks.length; i++) {
            this.applyStyleNamed(this.styleLinks[i]); 
        }
    },

    // NOTE:  The following four methods should all be factored into a single bit of reshaping logic
    applyFunctionToShape: function() {  // my kingdom for a Smalltalk block!
        var args = $A(arguments);
        var func = args.shift();
        func.apply(this.shape, args);
        if (this.clipPath) {
            console.log('clipped to new shape ' + this.shape);
            this.clipToShape();
        }
        this.adjustForNewBounds();
    }.wrap(Morph.onLayoutChange('shape')),
    
    setShape: function(newShape) {
        if (!newShape.rawNode) {
            console.log('newShape is ' + newShape + ' ' + (new Error()).stack);
        }
        this.rawNode.replaceChild(newShape.rawNode, this.shape.rawNode);


        this.shape = newShape;
        //this.layoutChanged(); 
        if (this.clipPath) {
            console.log('clipped to new shape ' + this.shape);
            this.clipToShape();
        }
        this.adjustForNewBounds();
    }.wrap(Morph.onLayoutChange('shape')),

    reshape: function(partName, newPoint, handle, lastCall) {
        this.shape.reshape(partName,newPoint,handle,lastCall); 
    
        // FIXME: consider converting polyline to polygon when vertices merge.
        if (this.clipPath) {
            console.log('clipped to new shape ' + this.shape);
            this.clipToShape();
        }
        this.adjustForNewBounds();
    }.wrap(Morph.onLayoutChange('shape')),
    
    setVertices: function(newVerts) {
        // particular to polygons
        this.shape.setVertices(newVerts);
        this.adjustForNewBounds();
    }.wrap(Morph.onLayoutChange('shape')),

    // DI: ***Note get/setBounds should be deprecated in favor of get/setExtent and get/setPosition
    // This is so that layout management can move things around without deep layout changes
    setBounds: function(newRect) {
        var bounds = this.bounds();
        this.shape.setBounds(this.relativizeRect(newRect)); // FIXME some shapes don't support setFromRect

        if (this.clipPath) {
            console.log('clipped to new shape ' + this.shape);
            this.clipToShape();
        }
        this.adjustForNewBounds();
    }.wrap(Morph.onLayoutChange('shape')),

    setExtent: function(newExtent) {
        this.setBounds(this.getPosition().extent(newExtent));
    },

    getExtent: function(newRect) { return this.shape.bounds().extent() },

    // override to respond to reshape events    
    adjustForNewBounds: function() {
        if (this.focusHalo) {
            this.adjustFocusHalo();
        }
    },
    
    // p is in owner coordinates
    containsPoint: function(p) { 
        if (!this.bounds().containsPoint(p)) return false;
        return this.shape.containsPoint(this.relativize(p)); 
    },
    
    containsWorldPoint: function(p) { // p is in world coordinates
        if (this.owner == null) return this.containsPoint(p);
        return this.containsPoint(this.owner.localize(p)); 
    },

    fullContainsPoint: function(p) { // p is in owner coordinates
        return this.bounds().containsPoint(p); 
    },

    fullContainsWorldPoint: function(p) { // p is in world coordinates
        // unimplemented in firefox:
        // return canvas.checkEnclosure(this, rect(p,p));
        if (this.owner == null) return this.fullContainsPoint(p);
    
        return this.fullContainsPoint(this.owner.localize(p)); 
    },
    
    addNonMorph: function(node) {
        if (this.rawSubnodes == null) console.log("%s not fully inited on addNonMorph(%s)", this, node);
        return this.rawNode.insertBefore(node, this.rawSubnodes);
    },
    
    // assign an element to a field and update the <defs> if necessary
    assign: function(fieldname, element) {
        var old = this[fieldname];
        
        if (!this.defs && element) { // lazily create the field
            this.defs = NodeFactory.create('defs');
            this.addNonMorph(this.defs);
        }
        
        if (old) {
            if (old.parentNode) {
                if (old.parentNode !== this.defs) {
                    console.warn('assign to field %s: old value %s is not owned by %s', fieldname, old, this);
                    return null;
                }
                this.defs.removeChild(old);
            } else {
                console.warn('assign to field %s: old value %s is orphaned in %s', fieldname, old, this);
            }
        }
        
        this[fieldname] = element;
    
        if (element) {
            var id = element.getAttribute("id");
            if (id) {
                this[fieldname] = element = element.cloneNode(true);
            }
    
            id = fieldname + '_' + this.id;
            element.setAttribute("id", id);
            this.defs.appendChild(element);
    
            return "url(#" + id + ")";
        } else return null;
    },

    query: function(xpathQuery, defaultValue) {
        // run a query against this morph
        return Query.evaluate(xpathQuery, this.rawNode, defaultValue);
    }

});

// Submorph management functions
Morph.addMethods({ 
    
    addMorph: function(morph) { return this.addMorphFrontOrBack(morph, true) },
    
    addMorphAt: function(morph, position) {
        var morph = this.addMorphFrontOrBack(morph, true);
        morph.setPosition(position);
        return morph;
    },

    addMorphFront: function(morph) { return this.addMorphFrontOrBack(morph, true) },
    
    addMorphBack: function(morph) { return this.addMorphFrontOrBack(morph, false) },
    
    addMorphFrontOrBack: function(m, front) {
        console.assert(m instanceof Morph, "not an instance");

        if (m.owner) {
            var tfm = m.transformForNewOwner(this);
            m.owner.removeMorph(m); // KP: note not m.remove(), we don't want to stop stepping behavior
            m.setTransform(tfm); 
            // FIXME transform is out of date
            // morph.setTransform(tfm); 
            // m.layoutChanged(); 
        } else {
            //console.log('no owner ' + m.inspect());
        }
    
        m.owner = this;
        this.internalAddMorph(m, front);
        m.changed();
        m.layoutChanged();
        this.layoutChanged();
        return m;
    },
    
    internalAddMorph: function(m, isFront) {
        if (isFront) {
            // the last one, so drawn last, so front
            NodeList.push(this.rawSubnodes, m);
            this.submorphs.push(m);
        } else {
            // back of the display list -> front visually
            NodeList.pushFront(this.rawSubnodes, m);
            this.submorphs.splice(0, 0, m);
        }
    },
    
    removeMorph: function(m) {
        var index = this.submorphs.indexOf(m);
        if (index < 0) {
            if (m.owner !== this) { 
                console.log("%s has owner %s that is not %s?", m, m.owner, this);
            }
            if (m.rawNode.parentNode === this.rawSubnodes)
            console.log("invariant violated: %s", m);
            return null;
        }
    
        NodeList.remove(this.rawSubnodes, m);
        var spliced = this.submorphs.splice(index, 1);
        if (spliced instanceof Array) spliced = spliced[0];
        if (m !== spliced) {
            console.log("invariant violated removing %s, spliced %s", m, spliced);
        }
        m.owner = null;
        m.setHasKeyboardFocus(false);
        return m;
    },
    
    removeAllMorphs: function() {
        NodeList.clear(this.rawSubnodes);
        this.submorphs.clear();
        this.layoutChanged(); 
    },
    
    hasSubmorphs: function() {
        return this.submorphs.length != 0;
    },
    
    remove: function() {
        if (!this.owner) return null;  // already removed

        this.stopStepping();
        this.stopSteppingScripts();
        this.owner.removeMorph(this);

        return this;
    },
    
    withAllSubmorphsDo: function(func, argOrNull) {
        // Call the supplied function on me and all of my subMorphs by recursion.
        func.call(this, argOrNull);
        this.submorphs.invoke('withAllSubmorphsDo', func, argOrNull);
    },
    
    topSubmorph: function() {
        // the morph on top is the last one in the list
        return this.submorphs.last();
    },

    // morph gets an opportunity to shut down when WindowMorph closes 
    shutdown: function() {
        this.remove();
    }
    
});

// Morph copying functions
Morph.addMethods({
    
    okToDuplicate: function() { return true; },  // default is OK
    
    copy: function() {
        //console.log("get type "  + this.constructor.type + " from " + this);
        return new this.constructor.scope[this.constructor.type](Cloner, this);
    }

});

// Morph bindings to its parent, world, canvas, etc.
Morph.addMethods({
    
    canvas: function() {
        try {
            var world = this.world();
            return world && world.canvas();
            // return this.ownerSVGElement;
        } catch (er) {
            console.log("no ownerSVG ? %s, %s", this, er.stack);
            return null;
        }
    },

    world: function() {
        return this.owner ? this.owner.world() : null;
    },
    
    toString: function() {
        // A replacement for toString() which can't be overridden in
        // some cases.  Invoked by Object.inspect.
        try {
            return "%1(#%2,%3)".format(this.getType(), this.id, this.shape);
            //return "%1(#%2)".format(this.getType(), this.id);
        } catch (e) {
            console.log("toString failed on " + [this.id, this.getType()]);
            return "Morph?[" + e + "]";
        }
    },

    toJSON: function() {
        return undefined;
    },

    // Morph coordinate transformation functions
    
    // SVG has transform so renamed to getTransform()
    getTransform: function() {
        if (this.cachedTransform == null) { 
            // we need to include fisheyeScaling to the transformation
            this.cachedTransform = Transform.createSimilitude(this.origin, this.rotation, this.scale * this.fisheyeScale);
        }
        return this.cachedTransform;
    },

    pvtSetTransform: function(tfm) {
        this.origin = tfm.getTranslation();
        this.rotation = tfm.getRotation();
        this.scale = tfm.getScale();
        // we must make sure the Morph keeps its original size (wrt/fisheyeScale)
        this.scale = this.scale/this.fisheyeScale;
        this.cachedTransform = tfm; //Transform.createSimilitude(this.origin, this.rotation, this.scale);
    },
    
    setTransform: function(tfm) { this.pvtSetTransform(tfm); }.wrap(Morph.onLayoutChange('transform')),
    
    translateBy: function(delta) {
        this.changed();
        this.origin = this.origin.addPt(delta);
        this.cachedTransform = null;
        this.recordChange('origin');
        // this.layoutChanged();
        // Only position has changed; not extent.  Thus no internal layout is needed
        // This should become a new transformChanged() method
        this.applyTransform(this.getTransform());
        if (this.fullBounds != null) this.fullBounds = this.fullBounds.translatedBy(delta);
        // DI: I don't think this can affect owner.  It may increase fullbounds
        //     due to stickouts, but not the bounds for layout...
        if (this.owner && this.owner !== this.world()) this.owner.layoutChanged(); 
        this.changed(); 
    },

    setRotation: function(theta) { // in radians
        this.rotation = theta;
        this.cachedTransform = null;
    }.wrap(Morph.onLayoutChange('rotation')),
    
    setScale: function(scale/*:float*/) {
        this.scale = scale;
        this.cachedTransform = null;
    }.wrap(Morph.onLayoutChange('scale')),
    
    defaultOrigin: function(bounds, shapeType) { 
        return (shapeType == "rect" || shapeType == "rectangle") ? bounds.topLeft() : bounds.center(); 
    },
    
    getTranslation: function() { 
        return this.getTransform().getTranslation(); 
    },
    
    getRotation: function() { 
        return this.getTransform().getRotation().toRadians(); 
    },
    
    getScale: function() { 
        return this.getTransform().getScale(); 
    },
    
    moveBy: function(delta) {
        this.translateBy(delta);
    },
    
    rotateBy: function(delta) {
        this.setRotation(this.getRotation()+delta);
    },

    scaleBy: function(delta) {
        this.setScale(this.getScale()*delta);
    },
    
    throb: function() {
        this.scaleBy(this.getScale() <= 1 ? 2 : 0.9);
    },
    
    align: function(p1, p2) {
        this.translateBy(p2.subPt(p1)); 
    },
    
    // toggle fisheye effect on/off
    toggleFisheye: function() {
        // if fisheye is true, we need to scale the morph to original size
        if (this.fishEye) {
            this.scale = this.getScale()/this.fisheyeScale;
            this.setFisheyeScale(1.0);
            this.changed();
        }

        // toggle fisheye
        this.fishEye = !this.fishEye;
    },
    
    // sets the scaling factor for the fisheye between 1..fisheyeGrowth
    setFisheyeScale: function (newScale) {
        // take the original centerpoint
        var p = this.bounds().center();

        this.fisheyeScale = newScale;
        this.cachedTransform = null;
        this.layoutChanged();  
        this.changed();

        // if the fisheye was on move the fisheye'd morph by the difference between 
        // original center point and the new center point divided by 2
        if (this.fishEye) {
            // (new.center - orig.center)/2
            var k = this.bounds().center().subPt(p).scaleBy(.5).negated();
            if (!pt(0,0).eqPt(k)) {
                this.setPosition(this.position().addPt(k));
                this.layoutChanged();  
                this.changed();
            }
        }
    }

});

// Morph mouse event handling functions
Morph.addMethods({
    
    // KP: equivalent of the DOM capture phase
    // KP: hasFocus is true if the receiver is the hands's focus (?)
    captureMouseEvent: function(evt, hasFocus) {
    // Dispatch this event to the frontmost receptive morph that contains it
    // Note boolean return for event consumption has not been QA'd
    
        // if we're using the fisheye... 
        if (this.fishEye) {
            // get the distance to the middle of the morph and check if we're 
            // close enough to start the fisheye
            var size = Math.max(this.bounds().width, this.bounds().height);
            
            var dist = evt.mousePoint.dist(this.bounds().center()) / this.fisheyeProximity;
            if (dist <= size) {
                // the fisheye factor is between 1..fisheyeGrowth
                this.setFisheyeScale(1 + this.fisheyeGrowth * Math.abs(dist/size - 1));
            } else {
                // just a precaution to make sure fisheye scaling isn't 
                // affecting its surrounding any more
                this.setFisheyeScale(1.0)
            }
        }

        if (hasFocus) 
	    return this.mouseHandler.handleMouseEvent(evt, this);

        if (!evt.priorPoint || !this.fullContainsWorldPoint(evt.priorPoint)) return false;

        if (this.hasSubmorphs()) {
            // If any submorph handles it (ie returns true), then return
            for (var i = this.submorphs.length - 1; i >= 0; i--) {
                if (this.submorphs[i].captureMouseEvent(evt, false)) return true;
            }
        }

        if (this.mouseHandler == null)
            return false;

        if (!evt.priorPoint || !this.shape.containsPoint(this.localize(evt.priorPoint))) 
            return false;

        return this.mouseHandler.handleMouseEvent(evt, this); 
    },

    ignoreEvents: function() { // will not respond nor get focus
        this.mouseHandler = null;
    },
    
    enableEvents: function() {
        this.mouseHandler = MouseHandlerForDragging.prototype;
    },

    relayMouseEvents: function(target, eventSpec) {
        this.mouseHandler = new MouseHandlerForRelay(target, eventSpec); 
    },

    handlesMouseDown: function(evt) {
        if (this.mouseHandler == null || evt.isAltDown()) return false;  //default behavior
        return this.mouseHandler.handlesMouseDown(); 
    },

    onMouseDown: function(evt) { }, //default behavior
    
    onMouseMove: function(evt) { //default behavior
        if (this.owner && evt.mouseButtonPressed && this.owner.openForDragAndDrop) { 
           this.moveBy(evt.mousePoint.subPt(evt.priorPoint));
        } // else this.checkForControlPointNear(evt);
        if (!evt.mouseButtonPressed) this.checkForControlPointNear(evt);
    },
    
    onMouseUp: function(evt) { }, //default behavior

    onMouseOver: function(evt) { }, //default behavior

    onMouseOut: function(evt) { }, //default behavior

    takesKeyboardFocus: function() { 
        return false; 
    },

    setHasKeyboardFocus: function(newSetting) { 
        return false; // no matter what, say no
    },
    
    requestKeyboardFocus: function(hand) {
        if (this.takesKeyboardFocus()) {
            if (this.setHasKeyboardFocus(true)) {
                hand.setKeyboardFocus(this);
                return true;
            }
        }
        return false;
    },

    relinquishKeyboardFocus: function(hand) {
        hand.setKeyboardFocus(null);
        return this.setHasKeyboardFocus(false); 
    },
    
    onFocus: function(hand) {
        this.addFocusHalo();
    },

    onBlur: function(hand) {
        this.removeFocusHalo();
    },

    removeFocusHalo: function() {
        if (!this.focusHalo) return false;
        this.rawNode.removeChild(this.focusHalo);
        this.focusHalo = null;
        return true;
    },
    
    adjustFocusHalo: function() {
        NodeList.clear(this.focusHalo);
        var shape = new RectShape(this.shape.bounds().insetBy(-2), null, 
            this.focusHaloBorderWidth, this.focusedBorderColor);
        NodeList.push(this.focusHalo, shape);
    },

    addFocusHalo: function() {
        if (this.focusHalo) return false;
        this.focusHalo = this.addNonMorph(NodeList.withType('FocusHalo'));
        this.focusHalo.setAttributeNS(null, "stroke-opacity", 0.3);
        this.focusHalo.setAttributeNS(null, 'stroke-linejoin', Shape.LineJoins.ROUND);
        this.adjustFocusHalo();
        return true;
    }
    
});

/**
 * @class MouseHandlerForRelay
 */ 

MouseHandlerForRelay = Class.create({

    initialize: function (target, eventSpec) {
        //  Send events to a different target, with different methods
        //    Ex: box.relayMouseEvents(box.owner, {onMouseUp: "boxReleased", onMouseDown: "boxPressed"})
        this.target = target;
        this.eventSpec = eventSpec;
    },
    
    handleMouseEvent: function(evt, appendage) {
        var capType = evt.capitalizedType();
        var targetHandler = this.target[this.eventSpec['on' + capType]];
        if (targetHandler == null) return true; //FixMe: should this be false?
        if (capType == "MouseDown") evt.hand.setMouseFocus(appendage);
        targetHandler.call(this.target, evt, appendage);
        if (capType == "MouseUp") evt.hand.setMouseFocus(null);
        return true; 
    },
    
    handlesMouseDown: function(evt) { 
        return true; 
    }

});

// Morph grabbing and menu functionality
Morph.addMethods({

    checkForControlPointNear: function(evt) {
        // console.log('checking %s', this);
        if (this.suppressHandles) return false; // disabled
        if (this.owner == null) return false; // can't reshape the world
        var handle = this.shape.possibleHandleForControlPoint(this, this.localize(evt.mousePoint), evt.hand);
        if (handle == null) return false;
        this.addMorph(handle);  // after which it should get converted appropriately here
        handle.showHelp(evt);
        if (evt.hand.mouseFocus instanceof HandleMorph) evt.hand.mouseFocus.remove();
        evt.hand.setMouseFocus(handle);
        return true; 
    },

    // A chance to preempt (by returning null) the default action of grabbing me
    // or to otherwise prepare for being grabbed
    // or find a parent to grab instead
    okToBeGrabbedBy: function(evt) {
        if (evt.hand.mode == "menu") {
            evt.hand.mode = "normal";
            this.showMorphMenu(evt);
            return null; 
        } 
        
        return this; 
    },

    showMorphMenu: function(evt) { 
        var menu = this.morphMenu(evt);
        // if (evt.mouseButtonPressed) evt.hand.setMouseFocus(menu);
        // evt.hand.setMouseFocus(menu);
        menu.openIn(this.world(), evt.mousePoint, false, Object.inspect(this).truncate()); 
    },

    morphMenu: function(evt) { 
        var items = [
            ["duplicate", this.copyToHand.curry(evt.hand)],
            ["remove", this.remove],
            ["inspect", function() { new SimpleInspector(this).open()}],
            ["style", function() { new StylePanel(this).open()}],
            ["drill", this.showOwnerChain.curry(evt)],
            ["grab", this.pickMeUp.curry(evt)],
            ["reset rotation", this.setRotation.curry(0)],
            ["reset scaling", this.setScale.curry(1)],
            [((this.fishEye) ? "turn fisheye off" : "turn fisheye on"), this.toggleFisheye],
            ["-----"],
            ["put me in a window", this.putMeInAWindow.curry(this.position())],
            ["put me in a tab", this.putMeInATab.curry(this.position())],
            ["put me in the open", this.putMeInTheWorld.curry(this.position())],
            ["-----"],
            [((this.openForDragAndDrop) ? "close DnD" : "open DnD"), this.toggleDnD.curry(evt.mousePoint)],
            ["show Lively markup", this.addSvgInspector.curry(this)],
            ["publish shrink-wrapped as...", function() { 
                WorldMorph.current().makeShrinkWrappedWorldWith([this], WorldMorph.current().prompt('publish as')) }],
            ["show stack", Function.showStack]
        ];
        var menu = new MenuMorph(items, this); 
        if (!this.okToDuplicate()) menu.removeItemNamed("duplicate");
        return menu;
    },

    putMeInAWindow: function(loc) {
        var c = this.immediateContainer();
        var w = this.world();
        var wm = new WindowMorph(this.windowContent(), this.windowTitle());
        // Position it so the content stays in place
        w.addMorphAt(wm, loc.subPt(wm.contentOffset));
        if (c) c.remove();
    },

    putMeInATab: function(loc) {
        var c = this.immediateContainer();
        var w = this.world();
        var wm = new TabbedPanelMorph(this.windowContent(), this.windowTitle());
        w.addMorphAt(wm, wm.position());
        if (c) c.remove();
    },

    putMeInTheWorld: function(loc) {
        var c = this.immediateContainer();
        var loc = c ? c.position().addPt(c.contentOffset) : this.position();
        this.world().addMorphAt(this, loc);
        if (c) c.remove();
    },

    immediateContainer: function() { // Containers override to return themselves
        if (this.owner) return this.owner.immediateContainer();
        else return null;
    },

    windowContent: function() {
        return this; // Default response, overridden by containers
    },

    windowTitle: function() {
        return Object.inspect(this).truncate(); // Default response, overridden by containers
    },

    toggleDnD: function(loc) {
        this.openForDragAndDrop = !this.openForDragAndDrop;
    },

    openDnD: function(loc) {
        this.openForDragAndDrop = true;
    },

    closeDnD: function(loc) {
        this.openForDragAndDrop = false;
    },

    closeAllToDnD: function(loc) {
        // Close this and all submorphs to drag and drop
        this.withAllSubmorphsDo( function() { this.closeDnD(); });
    },

    openAllToDnD: function(loc) {
        // Close this and all submorphs to drag and drop
        this.withAllSubmorphsDo( function() { this.openDnD(); });
    },

    pickMeUp: function(evt) {
        var offset = evt.hand.position().subPt(evt.hand.lastMouseDownPoint);
        this.moveBy(offset);
        evt.hand.addMorph(this);
    },

    notify: function(msg, loc) {
        new MenuMorph([["OK", 0, "toString"]], this).openIn(this.world(), loc, false, msg); 
    },

    showOwnerChain: function(evt) {
        var items = this.ownerChain().reverse().map(
            function(each) { return [Object.inspect(each).truncate(), each, "showMorphMenu", evt]; }
        );
        new MenuMorph(items, this).openIn(this.world(), evt.mousePoint, false, "Top item is topmost");
    },

    copyToHand: function(hand) {
        var copy = this.copy();
        console.log('copied %s', copy);
        // KP: is the following necessary?
        this.owner.addMorph(copy); // set up owner the original parent so that it can be reparented to this: 
        hand.addMorph(copy);  
        copy.withAllSubmorphsDo(function() { this.startStepping(null); }, null);
    },

    morphToGrabOrReceiveDroppingMorph: function(evt, droppingMorph) {
        return this.morphToGrabOrReceive(evt, droppingMorph, true);
    },

    morphToGrabOrReceive: function(evt, droppingMorph, checkForDnD) {
        // If checkForDnD is false, return the morph to receive this mouse event (or null)
        // If checkForDnD is true, return the morph to grab from a mouse down event (or null)
        // If droppingMorph is not null, then check that this is a willing recipient (else null)

        if (!this.fullContainsWorldPoint(evt.mousePoint)) return null; // not contained anywhere

        // First check all the submorphs, front first
        for (var i = this.submorphs.length - 1; i >= 0; i--) {
            var hit = this.submorphs[i].morphToGrabOrReceive(evt, droppingMorph, checkForDnD); 
            if (hit != null) return hit;  // hit a submorph
        }

        // Check if it's really in this morph (not just fullBounds)
        if (!this.containsWorldPoint(evt.mousePoint)) return null;

        // If no DnD check, then we have a hit (unless no handler in which case a miss)
        if (!checkForDnD) return this.mouseHandler ? this : null;

        // On drops, check that this is a willing recipient
        if (droppingMorph != null) {
            return this.acceptsDropping(droppingMorph) ? this : null;
        }

        // On grabs, can't pick up the world or morphs that handle mousedown
        // DI:  I think the world is adequately checked for now elsewhere
        // else return (!evt.isAltDown() && this === this.world()) ? null : this; 
        else return this; 
    },
    
    morphToReceiveEvent: function(evt) {
        // This should replace morphToGrabOrReceive... in Hand where events
        // must be displatched to morphs that are closed to DnD
        return this.morphToGrabOrReceive(evt, null, false);
    },

    ownerChain: function() {
        // Return an array of me and all my owners
        // First item is, eg, world; last item is me
        if (!this.owner) return [];
        var owners = this.owner.ownerChain();
        owners.push(this);
        return owners;
    },
    
    acceptsDropping: function(morph) { 
        return this.openForDragAndDrop && morph.getType() != "WindowMorph";
    }

});

// Morph stepping/timer functions
Morph.addMethods({

    startSteppingScripts: function() { }, // May be overridden to start stepping scripts
    
    stopSteppingScripts: function() {
        if (this.activeScripts) {
            var world = WorldMorph.current();
            for (var i=0; i<this.activeScripts.length; i++) {
                world.stopStepping(this.activeScripts[i]);
            }
            this.activeScripts = null;
        }
    },
    
    startStepping: function(stepTime, scriptName, argIfAny) {
        if (!scriptName) {
            // Old code schedules the morph for stepTime
            this.stopStepping();
            if (this.stepHandler == null) this.stepHandler = new StepHandler(this,stepTime);
            if (stepTime != null) this.stepHandler.stepTime = stepTime;
            WorldMorph.current().startStepping(this); 
            return; 
        }

        // New code schedules an action
        var action = { actor: this, scriptName: scriptName, argIfAny: argIfAny,
                       stepTime: stepTime, ticks: 0 };
        this.addActiveScript(action);
        WorldMorph.current().startStepping(action); 
    },
    
    addActiveScript: function(action) {
        // Every morph carries a list of currently active actions (alarms and repetitive scripts)
        if (!this.activeScripts) this.activeScripts = [action];
        else this.activeScripts.push(action);
        console.log('added script ' + action.scriptName + ": " + action);
        var actionCode = NodeFactory.createNS(Namespace.LIVELY, "action");
        actionCode.appendChild(document.createCDATASection(Object.toJSON(action)));
        this.addNonMorph(actionCode);
    },
    
    startSteppingFunction: function(stepTime, func) {
        this.startStepping(stepTime);
        this.stepHandler.setStepFunction(func); 
    },
    
    stopStepping: function() {
        if (this.world()) {
            this.world().stopStepping(this);
        } // else: can happen if removing a morph whose parent is not in the world
    },

    suspendAllActiveScripts: function() {
        this.withAllSubmorphsDo( function() { this.suspendActiveScripts(); });
    },

    suspendActiveScripts: function() {
        if (this.activeScripts) { 
            this.suspendedScripts = this.activeScripts.clone();
            this.stopSteppingScripts();
        }
    },

    resumeAllSuspendedScripts: function() {
        var world = WorldMorph.current();
        this.withAllSubmorphsDo( function() {
            if (this.suspendedScripts) {
                for (var i=0; i<this.suspendedScripts.length; i++) world.startStepping(this.suspendedScripts[i]);
                this.suspendedScripts = null;
            }
        });
    },

    // The following methods are deprecated...
    tick: function(msTime) {
        // returns 0 if step handler not triggered, otherwise the time when the handler should be called next.
        if (this.stepHandler != null) {
            this.stepHandler.tick(msTime, this);
            return this.stepHandler.timeOfNextStep;
        }
        return 0;
    },

    stepActivity: function(msTime) {  // May be overridden
    }
    
});

/**
 * @class StepHandler
 * This class supports the stepping functionality defined above 
 */ 

StepHandler = Class.create({

    initialize: function(owner, stepTime) {
        this.owner = owner;
        this.stepTime = stepTime;
        this.timeOfNextStep = 0;
        this.stepFunction = this.defaultStepFunction; 
    },
    
    tick: function(msTime, owner) { //: Boolean whether step function was called
        if (msTime < this.timeOfNextStep) return 0;
        this.stepFunction.call(this.owner,msTime);  // this.owner.stepActivity(msTime);
        return this.timeOfNextStep = msTime + this.stepTime;
    },

    // Note stepFunctions are written to be evaluate in the context of the morph itself
    defaultStepFunction: function(msTime) { 
        this.stepActivity(msTime); 
    },

    setStepFunction: function(func) { 
        this.stepFunction = func; 
    },
    
    copyForOwner: function(copyOwner) {
        var copy = new StepHandler(copyOwner, this.stepTime)
        copy.stepFunction = this.stepFunction; 
        return copy; 
    }
    
});

// Morph bounds, coordinates, moving and damage reporting functions
Morph.addMethods({ 
    
    // bounds returns the full bounding box in owner coordinates of this morph and all its submorphs
    bounds: function() {
        if (this.fullBounds != null) return this.fullBounds;

        var tfm = this.retrieveTransform();
        this.fullBounds = tfm.transformRectToRect(this.shape.bounds());

        if (/polyline|polygon/.test(this.shape.getType())) {
            // double border margin for polylines to account for elbow protrusions
            this.fullBounds.expandBy(this.shape.getStrokeWidth()*2);
        } else {
            this.fullBounds.expandBy(this.shape.getStrokeWidth());
        }

        if (this.hasSubmorphs()) { 
            var subBounds = null; // KP: added = null
            this.submorphs.each(function(m) { 
                subBounds = subBounds == null ? m.bounds() : subBounds.union(m.bounds()); }
            );
            // could be simpler when no rotation...
            this.fullBounds = this.fullBounds.union(tfm.transformRectToRect(subBounds));
        } 

        if (this.fullBounds.width < 3 || this.fullBounds.height < 3) {
            // Prevent Horiz or vert lines from being ungrabable
            this.fullBounds = this.fullBounds.expandBy(3); 
        }

        return this.fullBounds; 
    },
    
    // innerBounds returns the bounds of this morph only, and in local coordinates
    innerBounds: function() { return this.shape.bounds() },

    /** 
     * mapping coordinates in the hierarchy
     * @return [Point]
     */

    // map local point to world coordinates
    worldPoint: function(pt) { 
        return pt.matrixTransform(this.rawNode.getTransformToElement(this.canvas())); 
    },

    // map owner point to local coordinates
    relativize: function(pt) { 
        if (!this.owner) { 
            throw new Error('no owner; call me after adding to a morph? ' + this);
        }
        try {
            return pt.matrixTransform(this.owner.rawNode.getTransformToElement(this.rawNode)); 
        } catch (er) {
            // console.info("ignoring relativize wrt/%s", this);
            return pt;
        }
    },

    // map owner rectangle to local coordinates
    relativizeRect: function(r) { 
        return rect(this.relativize(r.topLeft()), this.relativize(r.bottomRight()));
    },
    
    // map world point to local coordinates
    localize: function(pt) {
        if (pt == null) console.log('null pt');   
        if (this.canvas() == null) {
            console.log('null this.canvas()');   
            return pt;
        }
        return pt.matrixTransform(this.canvas().getTransformToElement(this.rawNode));
    },
    
    // map local point to owner coordinates
    localizePointFrom: function(pt, otherMorph) {   
        try {
            return pt.matrixTransform(otherMorph.rawNode.getTransformToElement(this.rawNode));
        } catch (er) {
            return pt;
        }
    },

    transformForNewOwner: function(newOwner) {
        return new Transform(this.rawNode.getTransformToElement(newOwner.rawNode));
    },


    changed: function() {
        // (this.owner || this).invalidRect(this.bounds());
    },

    layoutChanged: function() {
        // ???
        // if (!(this instanceof HandMorph) )
        // console.log('change of layout on ' + Object.inspect(this));
        this.applyTransform(this.getTransform());
        this.fullBounds = null;
        // this.bounds(); 
        if (this.owner && this.owner !== this.world())     // May affect owner as well...
            this.owner.layoutChanged(); 
    },
    
    recordChange: function(fieldName/*:String*/) {  
        // Update sever or change log or something
        return;
        // consider relating to this.changed()
    },

    position: function() { // Deprecated -- use getPosition
        return this.shape.bounds().topLeft().addPt(this.origin); 
    },
    
    getPosition: function() {
        return this.shape.bounds().topLeft().addPt(this.origin); 
    },
    
    setPosition: function(newPosition) {
        var delta = newPosition.subPt(this.position());
        this.translateBy(delta); 
    }
    
});

// Morph clipping functions
Morph.addMethods({

    clipToPath: function(pathShape) {
        var clipPath = NodeFactory.create('clipPath');
        clipPath.appendChild(pathShape.rawNode);
        clipPath.setAttributeNS(null, "shape-rendering", "optimizeSpeed");
        var ref = this.assign('clipPath', clipPath);
        this.rawNode.setAttributeNS(null, "clip-path", ref);
    },

    clipToShape: function() {
        this.clipToPath(this.shape.toPath());
    }
    
});

// SVG inspector for Morphs
Morph.addMethods( {
    
    addSvgInspector: function() {
        var exporter = new Exporter(this);
        var xml = exporter.serialize();
        console.log('%s serialized to %s', this, xml);        
        
        var extent = pt(500, 300);
        var panel = new PanelMorph(extent);
        var r = new Rectangle(0, 0, extent.x, extent.y);
        var pane = panel.pane = panel.addMorph(TextPane(r, xml.truncate(TextMorph.prototype.maxSafeSize)));
        var txtMorph = pane.innerMorph();
        txtMorph.xml = xml;
        this.world().addMorph(new WindowMorph(panel, "XML dump", this.bounds().topLeft().addPt(pt(5,0))));
    }
    
});

// Morph factory methods for creating simple morphs easily
Object.extend(Morph, {

    makeLine: function(verts, lineWidth, lineColor) {
        // make a line with its origin at the first vertex
        // Note this works for simple lines (2 vertices) and general polylines
        var line = new Morph(verts[0].asRectangle(), "rect");
        var vertices = Shape.translateVerticesBy(verts, verts[0].negated());
        line.setShape(new PolylineShape(vertices, lineWidth, lineColor));
        return line; 
    },

    makeCircle: function(location, radius, lineWidth, lineColor, fill) {
        // make a circle of the given radius with its origin at the center
        var circle = new Morph(location.asRectangle().expandBy(radius), "ellipse")
        circle.setBorderWidth(lineWidth);
        circle.setBorderColor(lineColor);
        circle.setFill(fill);
        return circle; 
    },

    makePolygon: function(verts, lineWidth, lineColor, fill) {
        // make a polygon with its origin at the starting vertex
        poly = new Morph(pt(0,0).asRectangle(), "rect");
        poly.setShape(new PolygonShape(verts, fill, lineWidth, lineColor));
        return poly; 
    }
});

// Model-specific extensions to class Morph (see Model class definition below)
Morph.addMethods({

    connectModel: function(plugSpec) {
        // connector makes this view pluggable to different models, as in
        // {model: someModel, getList: "getItemList", setSelection: "chooseItem"}
        var newPlug = Model.makePlug(plugSpec);
        if (this.modelPlug) { 
            this.rawNode.replaceChild(newPlug.rawNode, this.modelPlug.rawNode);
        } else { 
            this.addNonMorph(newPlug.rawNode);
        }
        this.modelPlug = newPlug;
        if (plugSpec.model.addDependent) { // for mvc-style updating
            plugSpec.model.addDependent(this);
        } 
    },

    getModel: function() {
        return this.modelPlug && this.modelPlug.model;
    },

    getModelValue: function(functionName, defaultValue) {
        // functionName is a view-specific message, such as "getList"
        // The model plug then provides a reference to the model, as well as
        // the specific model accessor for the aspect being viewed, say "getItemList"
        // Failure at any stage will return the default value.
        var plug = this.modelPlug;
        if (plug == null || plug.model == null || functionName == null) return defaultValue;
        var func = plug.model[plug[functionName]];
        if (func == null) return defaultValue;
        return func.call(plug.model); 
    },

    setModelValue: function(functionName, newValue, view) {
        // functionName is a view-specific message, such as "setSelection"
        // The model plug then provides a reference to the model, as well as
        // the specific model accessor for the aspect being viewed, say "chooseItem"
        // Failure at any stage is tolerated without error.
        // Successful sets to the model supply not only the newValue, but also
        // a reference to this view.  This allows the model's changed() method
        // to skip this view when broadcasting updateView(), and thus avoid
        // needless computation for a view that is already up to date.
        var plug = this.modelPlug;
        if (plug == null || plug.model == null || functionName == null) return;
        var func = plug.model[plug[functionName]];
        if (func == null) return;
        func.call(plug.model, newValue, view); 
    },

    updateView: function(aspect, controller) {
        // This method is sent in response to logic within the model executing
        //     this.changed(aspect, source)
        // The aspect used is the name of the get-message for the aspect
        // that needs to be updated in the view (and presumably redisplayed)
        // All actual view morphs will override this method with code that
        // checks for their aspect and does something useful in that case.
    }
    
});

// ===========================================================================
// MVC model support
// ===========================================================================

/**
 * @class Model
 * An MVC style model class that allows changes to be automatically
 * propagated to multiple listeners/subscribers/dependents. 
 */ 

// A typical model/view relationship is set up in the following manner:
//        panel.addMorph(m = ListPane(new Rectangle(200,0,200,150)));
//        m.connectModel({model: this, getList: "getMethodList", setSelection: "setMethodName"});
// The "plug" object passed to connectModel() points to the model, and converts from
// view-specific messages like getList() and setSelection() to model-specific messages
// like getMethodList() and setMethodName.  This allow a single model to have, eg,
// several list views, each viewing a different list aspect of the model.

// A number of morphs are used as views, or "widgets".  These include TextMorph,
// ListMorph, ButtonMorph, SliderMorph, etc.  Each of these morphs uses the above
// plug mechanism to get or set model values and to respond to model changes.
// these are documented in Morph.getModelValue, setModelValue, and updateView

Model = Class.create({

    initialize: function(dep) { 
        // Broadcasts an update message to all dependents when a value changes.
        this.dependents = (dep != null) ? [dep] : [];
    },

    addDependent: function (dep) { 
        this.dependents.push(dep); 
    },

    removeDependent: function (dep) {
        var ix = this.dependents.indexOf(dep);
        if (ix < 0) return;
        this.dependents.splice(ix, 1); 
    },

    changed: function(varName, source) {
        // Broadcast the message "updateView" to all dependents
        // If source (a dependent) is given, we skip it (already updated)
        // If varName is not given, then null will be the aspect of the updateView()
        //console.log('changed ' + varName);
        for (var i = 0; i < this.dependents.length; i++) {
            if (source !== this.dependents[i]) {
                //console.log('updating %s for name %s', this.dependents[i], varName);
                this.dependents[i].updateView(varName, source);
            } 
        } 
    },

    toString: function() {
        return "#<Model:%1>".format(this.dependents);
    },

    inspect: function() {
        var hash = new Hash(this);
        delete hash.dependents;
        return "#<Model:%1>".format(Object.toJSON(hash));
    }

});

var ModelPlug = Class.create({
    rawNode: null,
    initialize: function(rawNode) {
        this.rawNode = rawNode;
    },
    toString: function() {
        return Exporter.nodeToString(this.rawNode);
    }
});

Object.extend(Model, {
    makePlug: function(spec) {
        var plug = new ModelPlug(NodeFactory.createNS(Namespace.LIVELY, "modelPlug"));
        var props = Object.properties(spec);
        for (var i = 0; i < props.length; i++) {
            var prop = props[i];
            plug[prop] = spec[prop];
            if (prop != 'model') {
                var acc = plug.rawNode.appendChild(NodeFactory.createNS(Namespace.LIVELY, "accessor"));
                acc.setAttributeNS(Namespace.LIVELY, "formal", prop);
                acc.setAttributeNS(Namespace.LIVELY, "actual", spec[prop]);
            }
        }
        return plug;
    },

    becomePlugNode: function(node) {
        var plug = new ModelPlug(node);
        for (var acc = node.firstChild; acc != null;  acc = acc.nextSibling) {
            if (acc.tagName != 'accessor') continue;
            plug[acc.getAttributeNS(Namespace.LIVELY, "formal")] = acc.getAttributeNS(Namespace.LIVELY, "actual");
        }
        return plug;
    }
    
});

/**
 * @class SimpleModel
 */ 

SimpleModel = Class.create(Model, {
    
    getter: function(varName) {
        return "get" + varName;
    },
    
    setter: function(varName) {
        return "set" + varName;
    },

    initialize: function($super, dep /*, variables... */) {
        $super(dep);
        var variables = $A(arguments);
        variables.shift();
        for (var i = 0; i < variables.length; i++) {
            this.addVariable(variables[i], null);
        }
    },
    
    addVariable: function(varName, initialValue) {
        // functional programming is fun!
        this[varName] = initialValue;
        this[this.getter(varName)] = function(name) { return function() { return this[name]; } } (varName); // let name = varName ()
        this[this.setter(varName)] = function(name) { return function(newValue, v) { this[name] = newValue; 
                                                      this.changed(this.getter(name), v); }} (varName);
    },
    
    makePlug: function() {
        var model = this;
        var spec = { };
        this.variables().each(function(v) { spec[this.getter(v)] = model[this.getter(v)]; spec[this.setter(v)] = model[this.setter(v)]; }.bind(this));
        spec.model = model;
        return Model.makePlug(spec);
    },
    
    variables: function() {
        return Object.properties(this).filter(function(name) { return name != 'dependents'});
    },
    
    toMarkup: function(doc) {
        doc = doc || document;
        var modelEl = doc.createElementNS(Namespace.LIVELY, "model");
        var vars = this.variables();
        for (var i = 0; i < vars.length; i++) {
            var varEl = modelEl.appendChild(doc.createElementNS(Namespace.LIVELY, "variable"));
            var name = vars[i];
            varEl.setAttributeNS(Namespace.LIVELY, "name", name);
            varEl.appendChild(doc.createTextNode(Object.toJSON(this[name])));
        }
        for (var i = 0; i < this.dependents.length; i++) {
            var depEl = modelEl.appendChild(doc.createElementNS(Namespace.LIVELY, "dependent"));
            depEl.setAttributeNS(Namespace.LIVELY, "ref", this.dependents[i].id);
        }
        console.log("produced markup " + modelEl);
        return modelEl;
    }
});

// ===========================================================================
// World-related widgets
// ===========================================================================

// A unique characteristics of the Morphic graphics system is that
// all the objects (morphs) live in a "world" that is shared between 
// different objects and even between different users.  A world can
// contain a large number of different applications/widgets, much like
// in an operating system a folder can contain a lot of files.  Worlds
// can be linked to each other using LinkMorphs.  As a consequence,
// the entire system can contain a large number of worlds, each of
// which contains a large number of simultaneously running applications
// and widgets. 

/**
 * @class PasteUpMorph
 * PasteUp morphs are used for layouts,
 * most notably for the world and, eg, palettes
 */ 

var PasteUpMorph = Morph.subclass("PasteUpMorph", {

    initialize: function($super, bounds, shapeType) {
        return $super(bounds, shapeType);
    },
    
    captureMouseEvent: function($super, evt, hasFocus) {
        if (evt.type == "mousedown" && this.onMouseDown(evt)) return; 
        $super(evt, hasFocus); 
    },

    onMouseDown: function(evt) {  //default behavior is to grab a submorph
        var m = this.morphToReceiveEvent(evt);
        if (m == null) { 
            this.makeSelection(evt); 
            return true; 
        } else if (!evt.isAltDown()) {
            if (m == this.world()) { 
                this.makeSelection(evt); 
                return true; 
            } else if (m.handlesMouseDown(evt)) return false;
        }
        evt.hand.grabMorph(m, evt);
        return true; 
    },

    okToBeGrabbedBy: function(evt) {
        // Paste-ups, especially the world, cannot be grabbed normally
        return null; 
    },

    makeSelection: function(evt) {  //default behavior is to grab a submorph
        if (this.world().currentSelection != null) this.world().currentSelection.removeOnlyIt();
        var m = new SelectionMorph(evt.mousePoint.extent(pt(0,0)));
        this.world().addMorph(m);
        this.world().currentSelection = m;
        var handle = new HandleMorph(pt(0,0), "rect", evt.hand, m, "bottomRight");
        m.addMorph(handle);
        handle.setBounds(handle.bounds().center().asRectangle());
        m.setBounds(evt.mousePoint.asRectangle()); // prevent handle from making bounds any larger
        // if (evt.hand.mouseFocus instanceof HandleMorph) evt.hand.mouseFocus.remove(); // DI: necess?
        evt.hand.setMouseFocus(handle);
    }
    
});

/**
 * @class WorldMorph: A Morphic world (a visual container of other morphs)
 */ 

var WorldMorph = PasteUpMorph.subclass("WorldMorph", {
    
    defaultFill: Color.primary.blue,
    // Default themes for the theme manager    
    defaultThemes: {
        primitive: { // Primitive look and feel -- flat fills and no rounding or translucency
            styleName:   'primitive',
            window:      { rounding: 0 },
            titleBar:    { rounding: 0, borderWidth: 2, bordercolor: Color.black,
                           fill: Color.neutral.gray.lighter() },
            panel:       {  },
            slider:      { borderColor: Color.black, borderWidth: 1,
                           baseColor: Color.neutral.gray.lighter() },
            button:      { borderColor: Color.black, borderWidth: 1, rounding: 0,
                           baseColor: Color.lightGray, fillType: "simple" },
            widgetPanel: { borderColor: Color.red, borderWidth: 2, rounding: 0,
                           fill: Color.blue.lighter(), opacity: 1},
            clock:       { borderColor: Color.black, borderWidth: 1,
                           fill: new RadialGradient(Color.yellow.lighter(2), Color.yellow) },
            link:        { borderColor: Color.green, borderWidth: 1, fill: Color.blue}
        },

        lively: { // This is to be the style we like to show for our personality
            styleName: 'lively',
            window:      { rounding: 8 },
            titleBar:    { rounding: 8, borderWidth: 2, bordercolor: Color.black,
                           fill: new LinearGradient(Color.primary.blue, Color.primary.blue.lighter(3))},
            panel:       {  },
            slider:      { borderColor: Color.black, borderWidth: 1, 
                           baseColor: Color.primary.blue, fillType: "linear gradient"},
            button:      { borderColor: Color.neutral.gray, borderWidth: 0.3, rounding: 4,
                           baseColor:   Color.primary.blue, fillType: "linear gradient" },
            widgetPanel: { borderColor: Color.blue, borderWidth: 4, rounding: 16,
                           fill: Color.blue.lighter(), opacity: 0.4},
            clock:       { borderColor: Color.black, borderWidth: 1,
                           fill: new RadialGradient(Color.primary.blue.lighter(2), Color.primary.blue.lighter()) },
            link:        { borderColor: Color.green, borderWidth: 1, fill: Color.blue}
        },

        turquoise: { // Like turquoise, black and silver jewelry, [or other artistic style]
            styleName: 'turquoise',
            window:      { rounding: 8},
            titleBar:    { rounding: 8, borderWidth: 2, bordercolor: Color.black,
                           fill: new LinearGradient(Color.turquoise, Color.turquoise.lighter(3))},
            panel:       {  },
            slider:      { borderColor: Color.black, borderWidth: 1, 
                           baseColor: Color.turquoise, fillType: "linear gradient"},
            button:      { borderColor: Color.neutral.gray.darker(), borderWidth: 2, rounding: 8,
                           baseColor: Color.turquoise, fillType: "radial gradient" },
            widgetPanel: { borderColor: Color.neutral.gray.darker(), borderWidth: 4,
                           fill: Color.turquoise.lighter(3), rounding: 16},
            clock:       { borderColor: Color.black, borderWidth: 1,
                           fill: new RadialGradient(Color.turquoise.lighter(2), Color.turquoise) },
            link:        { borderColor: Color.green, borderWidth: 1, fill: Color.blue}
        }
    },

    initialize: function($super, canvas, backgroundImageId) {
        var bounds = Rectangle.fromElement(canvas);

        // sometimes bounds has zero dimensions (when reloading thes same page, timing issues?
        // in Firefox bounds may be 1x1 size?? maybe everything should be run from onload or sth?
        this.itsCanvas = canvas; 
        if (bounds.width < 2) {
            bounds.width = 1280;
        }

        if (bounds.height < 2) {
            bounds.height = 1024;
        }

        if (backgroundImageId) {
            var background = NodeFactory.create("use");
            background.setAttributeNS(Namespace.XLINK, "href", backgroundImageId);
            this.addNonMorph(background);
        }
            
        $super(bounds, "rect");

        this.hands = [];
        this.displayThemes = this.defaultThemes;
        this.setDisplayTheme(this.displayThemes['lively']);

        this.stepList = [];  // an array of morphs to be ticked
        this.scheduledActions = [];  // an array of schedulableActions to be evaluated
        this.lastStepTime = (new Date()).getTime();
        this.mainLoopFunc = this.doOneCycle.bind(this).logErrors('Main Loop');
        this.mainLoop = window.setTimeout(this.mainLoopFunc, 30);
        this.worldId = ++WorldMorph.worldCount;

        return this;
    },

    canvas: function() {
        return this.itsCanvas;
    },

    remove: function() {
        if (!this.rawNode.parentNode) return null;  // already removed
        this.stopStepping();
        this.rawNode.parentNode.removeChild(this.rawNode);
        return this;

        // console.log('removed ' + Object.inspect(this));
        // this.owner = null; 
    },

    displayWorldOn: function(canvas) {
        this.remove();
        canvas.appendChild(this.rawNode);
        this.addHand(new HandMorph(true));
    },
    
    addHand: function(hand) {
        this.hands.push(hand);
        hand.owner = this;
        hand.registerForEvents(this);
        hand.registerForEvents(hand);
        hand.layoutChanged();
    
        Event.keyboardEvents.each(function(each) {
            document.documentElement.addEventListener(each, hand, false);
        });
        
        this.rawNode.parentNode.appendChild(hand.rawNode);
    },
    
    removeHand: function(hand) {
        this.rawNode.parentNode.removeChild(hand.rawNode);
        hand.unregisterForEvents(this);
        hand.unregisterForEvents(hand);

        Event.keyboardEvents.each(function(each) {
            document.documentElement.removeEventListener(each, hand, false);
        });

        this.hands.splice(this.hands.indexOf(hand), 1);
    },

    morphMenu: function($super, evt) { 
        var menu = $super(evt);
        menu.keepOnlyItemsNamed(["inspect", "style"]);
        menu.addItem([(Config.suppressBalloonHelp ? "enable balloon help" : "disable balloon help"),
                     this.toggleBalloonHelp]);
        menu.addItem([(HandMorph.prototype.applyDropShadowFilter ? "disable " : "enable ") + "drop shadow (if supported)",
            function () { HandMorph.prototype.applyDropShadowFilter = !HandMorph.prototype.applyDropShadowFilter}]);
        menu.addLine();
        menu.addItem(["new object...", this.addMorphs.curry(evt)]);
        menu.addLine();
        menu.addItem(["choose display theme...", this.chooseDisplayTheme]);
        menu.addItem([(Config.useDebugBackground ? "use normal background" : "use debug background"),
                      this.toggleDebugBackground]);
        menu.addLine();
        menu.addItem(["publish world as ... ", function() { 
            this.makeShrinkWrappedWorldWith(this.submorphs, this.prompt('world file'));}]);
        menu.addItem(["restart system", this.restart]);
        return menu;
    },
   
    toggleBalloonHelp: function() {
        Config.suppressBalloonHelp = !Config.suppressBalloonHelp;
    },

    toggleDebugBackground: function() {
        // Debug background is transparent, so that we can see the console
        // if it is not otherwise visible
        Config.useDebugBackground = !Config.useDebugBackground;
        this.shape.setFillOpacity(Config.useDebugBackground ? 0.8 : 1.0);
    },

    chooseDisplayTheme: function(evt) { 
        var themes = this.displayThemes;
        var target = this; // trouble with function scope
        var themeNames = Object.properties(themes);
        var items = themeNames.map(
            function(each) { return [each, target, "setDisplayTheme", themes[each]]; });
        var menu = new MenuMorph(items, this);
        menu.openIn(this.world(), evt.mousePoint);
    },
  
    setDisplayTheme: function(styleDict) { 
        this.displayTheme = styleDict;
        this.withAllSubmorphsDo( function() { this.applyLinkedStyles(); });
    },
  
    restart: function() {
        window.location.reload();
    },

    defaultOrigin: function(bounds) { 
        return bounds.topLeft(); 
    },
    
    world: function() { 
        return this; 
    },
    
    firstHand: function() {
        return this.hands[0];
    },
    
    moveBy: function(delta) { // don't try to move the world
    },
    
//  *** The new truth about ticking scripts ***
//  A morph may have any number of active scripts
//  Each is activated by a call such as
//      this.startStepping(50, "rotateBy", 0.1);
//  Note that stepTime is in milliseconds, as are all lower-level methods
//  The arguments are: stepTime, scriptName, argIfAny
//  This in turn will create a SchedulableAction of the form
//  { actor: aMorph, scriptName: "rotateBy", argIfAny: 0.1, stepTime: 50, ticks: 0 }
//  and this action will be both added to an array, activeScripts in the morph,
//  and it will be added to the world's scheduledActions list, which is an array of
//  tuples of the form [msTimeToRun, action]
//  The ticks field is used to tally ticks spent in each schedulableAction --
//  It is incremented on every execution, and it is multiplied by 0.9 every second
//  Thus giving a crude 10-second average of milliseconds spent in this script
//  every 10 seconds.  The result is divided by 10 in the printouts.
//
//  The message startSteppingScripts can be sent to morphs when they are placed in the world.
//  It is intended that this may be overridden to start any required stepping.
//  The message stopSteppingScripts will be sent when morphs are removed from the world.
//  In this case the activeScripts array of the morph is used to determine exactly what
//  scripts need to be unscheduled.  Note that startSteppingScripts is not sent
//  automatically, whereas stopSteppingScripts is.  We know you won't forget to 
//  turn your gadgets on, but we're more concerned to turn them off when you're done.

    startStepping: function(morphOrAction) {
        if (morphOrAction.scriptName == null) {
            // Old code for ticking morphs
            var ix = this.stepList.indexOf(morphOrAction);
            if (ix < 0) this.stepList.push(morphOrAction); 
            if (!this.mainLoop) this.kickstartMainLoop();
            return;
        }

        var action = morphOrAction;

        // New code for stepping schedulableActions
        this.stopStepping(action, true);  // maybe replacing arg or stepTime
        this.scheduleAction(new Date().getTime(), action);
    },
    
    stopStepping: function(morphOrAction, fromStart) {
        if (morphOrAction == null || morphOrAction.scriptName == null) {
            // Old code for ticking morphs
            var ix = this.stepList.indexOf(morphOrAction);
            if (ix >= 0) this.stepList.splice(ix, 1);
            return;
        }

        var action = morphOrAction;

        // New code for deleting actions from the scheduledActions list
        // fromStart means it is just getting rid of a previous one if there,
        // but not an error if not found
        var list = this.scheduledActions;  // shorthand
        for (var i=0; i<list.length; i++) {
            var actn = list[i][1];
            if (actn === action) {
                list.splice(i, 1);
                return; 
            }
        }

        // Never found that action to remove.  Note this is not an error if called
        // from startStepping just to get rid of previous version
        if (!fromStart) console.log('failed to stopStepping ' + action.scriptName);
    },
    
    inspectScheduledActions: function () {
        // inspect an array of all the actions in the scheduler.  Note this
        // is not the same as scheduledActions which is an array of tuples with times
        new SimpleInspector(this.scheduledActions.map(function(each) { return each[1]; })).open();
    },

    doOneCycle: function (world) {
        // Process scheduled scripts

        // Old ticking scripts...
        var msTime = new Date().getTime();
        var timeOfNextStep = Infinity;
        for (var i = 0; i < this.stepList.length; i++) {
            var time = this.stepList[i].tick(msTime);
            if (time > 0) { 
                timeOfNextStep = Math.min(time, timeOfNextStep);
            }
        }

        // New scheduled scripts...
        // Run through the scheduledActions queue, executing those whose time has come
        // and rescheduling those that have a repeatRate
        // Note that actions with error will not get rescheduled
        // (and, unless we take the time to catch here, will cause all later 
        // ones in the queue to miss this tick.  Better less overhead, I say
        // DI: **NOTE** this needs to be reviewed for msClock rollover
        // -- also note we need more time info for multi-day alarm range
        // When we do this, I suggest that actions carry a date and msTime
        // and until their day is come, they carry a msTime > a day
        // That way they won't interfere with daily scheduling, but they can
        // still be dealt with on world changes, day changes, save and load.
        var list = this.scheduledActions;  // shorthand
        var timeStarted = msTime;  // for tallying script overheads
        while (list.length>0 && list[list.length-1][0] <= msTime) {
            var schedNode = list.pop();  // [time, action] -- now removed
            var action = schedNode[1];
            var func = action.actor[action.scriptName];

            DebuggingStack = [];  // Reset at each tick event
            if (func) {
                try {
                    func.call(action.actor, action.argIfAny);
                } catch (er) {
                    console.warn("error on actor %s: %s", action.actor, er);
                    Function.showStack();
                    continue;
                    // Note: if error in script above, it won't get rescheduled below (this is good)
                }
            } else {
                console.warn("no callback on actor %s", action.actor);
            }

            if (action.stepTime > 0) {
                var nextTime = msTime + action.stepTime;
                this.scheduleAction(nextTime, action)
            }

            var timeNow = new Date().getTime();
            var ticks = timeNow - timeStarted;
            if (ticks > 0) action.ticks += ticks;  // tally time spent in that script
            timeStarted = timeNow;
        }

        if (list.length > 0) timeOfNextStep = Math.min(list[list.length-1][0], timeOfNextStep);

        // Each second, run through the tick tallies and mult by 0.9 to 10-sec "average"
        if (!this.secondTick) this.secondTick = 0;
        var secondsNow = Math.floor(msTime / 1000);
        if (this.secondTick != secondsNow) {
            this.secondTick = secondsNow;
            var tallies = {};
            for (var i=0; i<list.length; i++) {
                var action = list[i][1];
                tallies[action.scriptName] = action.ticks;
                action.ticks *= 0.9 // 10-sec decaying moving window
            }
            if (Config.showSchedulerStats && secondsNow % 10 == 0) {
                console.log('Old Scheduler length = ' + this.stepList.length);
                console.log('New Scheduler length = ' + this.scheduledActions.length);
                console.log('Script timings...');  // approx ms per second per script
                for (var p in tallies) console.log(p + ': ' + (tallies[p]/10).toString());
            }
        }
        this.lastStepTime = msTime;
        this.setNextStepTime(timeOfNextStep);
    },

    setNextStepTime: function(timeOfNextStep) {
        if (timeOfNextStep == Infinity) { // didn't find anything to cycle through
            this.mainLoop = null; 
        } else {
            this.mainLoop = window.setTimeout(this.mainLoopFunc, timeOfNextStep - this.lastStepTime);
        }
    },

    kickstartMainLoop: function() {
        // kickstart the timer (note arbitrary delay)
        this.mainLoop = window.setTimeout(this.mainLoopFunc, 10);
    },

    scheduleAction: function(msTime, action) { 
        // Insert a SchedulableAction into the scheduledActions queue
        var list = this.scheduledActions;  // shorthand
        for (var i=list.length-1; i>=0; i--) {
            var schedNode = list[i];
            if (schedNode[0] > msTime) {
                list.splice(i+1, 0, [msTime, action]);
                if (!this.mainLoop) this.kickstartMainLoop();
                return; 
            }
        }
        list.splice(0, 0, [msTime, action]);
        if (!this.mainLoop) this.kickstartMainLoop();
    },

    onEnter: function() {},
    onExit: function() {},

    /**
     * override b/c of parent treatement
     */
    relativize: function(pt) { 
        return pt.matrixTransform(this.rawNode.parentNode.getTransformToElement(this.rawNode)); 
    },
    
    addMorphs: function(evt) {
        console.log("mouse point == %s", evt.mousePoint);
        var world = this.world();
        var items = [
            ["New subworld (LinkMorph)", function(evt) { world.addMorph(new LinkMorph(null, evt.mousePoint));}],
            ["Line", function(evt) { world.addMorph(Morph.makeLine([evt.mousePoint, evt.mousePoint.addXY(60, 30)], 2, Color.black));}],
            ["Rectangle", function(evt) { world.addMorph(new Morph(evt.mousePoint.extent(pt(60, 30)), "rect"));}],
            ["Ellipse", function(evt) { world.addMorph(new Morph(evt.mousePoint.extent(pt(50, 50)), "ellipse"));}],
            ["TextMorph", function(evt) { world.addMorph(new TextMorph(evt.mousePoint.extent(pt(120, 10)), "This is a TextMorph"));}],
            ["Class Browser", function(evt) { new SimpleBrowser().openIn(world, evt.mousePoint); }]
        ];
        if (this.isLoadedFromNetwork()) { 
            items.push(["File Browser", function(evt) { WebStore.onCurrentLocation().openIn(world, evt.mousePoint) }])
        }
        new MenuMorph(items, this).openIn(this.world(), evt.mousePoint);
    },

    isLoadedFromNetwork: function() {
        // TODO this is not foolproof
        return window.location.protocol == "http:";
    },

    makeShrinkWrappedWorldWith: function(morphs, filename) {
        if (filename == null) {
            console.log('null filename, not publishing %s', morphs);
           return;
        }

        console.log('morphs is %s', morphs);

        var newDoc = null;
        var url = window.location.toString();
        new NetRequest(url, { 
            method: 'get',
            asynchronous: false,
        
            onSuccess: function(transport) {
                newDoc = transport.responseXML;
            }.logErrors('onSuccess'),
            
            onFailure: function(transport) {
                WorldMorph.current().alert('problem accessing ' + url);
            }
            
        });

        if (!newDoc) return;

        console.log('got source %s url %s', newDoc, url);
        var mainDefs = newDoc.getElementById('Defaults');
        var mainScript = newDoc.getElementById('Main');
        var preamble = newDoc.createElementNS(Namespace.SVG, "script");
        preamble.appendChild(newDoc.createCDATASection("Config.skipAllExamples = true"));
        mainDefs.insertBefore(preamble, mainScript);
        var newurl = url.substring(0, url.lastIndexOf('/') + 1) + filename;
        var previous = newDoc.getElementById("ShrinkWrapped");
        if (previous) {
            previous.parentNode.removeChild(previous);
        }

        var container = newDoc.createElementNS(Namespace.SVG, 'g');

        // console.log("morphs %s", morphs);
        morphs.each(function(morph) {

            var model = morph.getModel();
            console.log('processing morph %s model %s', morph, model);
            var modelNode = null;
            if (model) { 
                modelNode = morph.addNonMorph(model.toMarkup(newDoc));
            }
            container.appendChild(newDoc.importNode(morph.rawNode, true));
            if (modelNode) {
                modelNode.parentNode.removeChild(modelNode);
            }
            container.appendChild(newDoc.createTextNode('\n\n'));
        });

        container.setAttribute("id", "ShrinkWrapped");
        mainDefs.appendChild(container);

        var content = Exporter.nodeToString(newDoc);
        console.info('writing new file ' + content);
        var failed = true;

        new NetRequest(newurl, { 
            method: 'put',
            asynchronous: false,
            body: content,
            onSuccess: function(transport) {
                failed = false;
            },
            onFailure: function(transport) {
                this.alert('failed saving world at url ' + newurl);
                failed = true;
            }
        });
    },

    addMorphsFrom: function(id) {
        var container = document.getElementById(id);
        if (!container) return null;
        var rawNodes = [];
        for (var node = container.firstChild; node != null; node = node.nextSibling) {
            if (node.tagName != 'g') continue;
            rawNodes.push(node);
        }

        var importer = new Importer();
        var morphs = rawNodes.map(function(node) { 
            var morph = importer.importFromNode(node);
            this.addMorph(morph);
            return morph;
        }.bind(this));
        return morphs;
    },

    alert: function(message) {
        var fill = this.getFill();
        this.setFill(Color.black); // poor man's modal dialog

        var menu = new MenuMorph([["OK", function() { this.setFill(fill)}]], this);
        // menu.setFontSize(20);
        menu.openIn(this, this.bounds().center(), false, message); 
    }.logErrors('alert'),

    prompt: function(message) {
        // FIXME replace with a native solution
        return window.prompt(message);
    },

    confirm: function(message) {
        // FIXME replace with a native solution
        return window.confirm(message);
    }

});

Object.extend(WorldMorph, {    
    worldCount: 0,
    
    currentWorld: null,
    
    current: function() {
        return WorldMorph.currentWorld;
    },

    setCurrent: function(newWorld) {
        WorldMorph.currentWorld = newWorld;
    }
    
});

/**
 * @class HandMorph
 * Defines the little triangle that represents the user's cursor.
 * Since there may be multiple users manipulating a Morphic world
 * simultaneously, we do not want to use the default system cursor.   
 */ 

var HandMorph = Morph.subclass("HandMorph", function() {
    // private variables
    var shadowOffset = pt(5,5);
    var handleOnCapture = true;
    var logDnD = false;
    
    return {


    applyDropShadowFilter: !!Config.enableDropShadow,

    initialize: function($super, local) {
        $super(pt(5,5).extent(pt(10,10)), "rect");
    
        this.setShape(new PolygonShape([pt(0,0), pt(9,5), pt(5,9), pt(0,0)], 
				       (local ? Color.blue : Color.red), 1, Color.black));
        this.shape.disablePointerEvents();
    
        this.rawNode.replaceChild(this.rawSubnodes, this.shape.rawNode);
        this.rawNode.appendChild(this.shape.rawNode); // make sure submorphs are render first, then the hand shape 

        this.isLocal = local;
        this.setFill(local ? Color.primary.blue : Color.primary.green); 

        this.keyboardFocus = null;
        this.mouseFocus = null;
        this.mouseOverMorph = null;
        this.lastMouseEvent = null;
        this.lastMouseDownPoint = pt(0,0);
        this.hasMovedSignificantly = false;
        this.grabInfo = null;
        
        this.mouseButtonPressed = false;

        this.keyboardFocus = null; 
        this.eventListeners = null;
        this.targetOffset = pt(0,0);

        this.temporaryCursor = null;
        this.temporaryCursorOffset = pt(0,0);

        this.userInitials = null; 
        this.priorPoint = null;
        this.owner = null;

        return this;
    },
    
    registerForEvents: function(morph) {
        var self = this;
        Event.basicInputEvents.each(function(name) { 
            morph.rawNode.addEventListener(name, self, handleOnCapture)});
    },
    
    unregisterForEvents: function(morph) {
        var self = this; 
        Event.basicInputEvents.each(function(name) { 
            morph.rawNode.removeEventListener(name, self, handleOnCapture)});
    },
    
    setMouseFocus: function(morphOrNull) {
        // console.log('setMouseFocus: ' + morphOrNull);
        this.mouseFocus = morphOrNull; 
    },
    
    setKeyboardFocus: function(morphOrNull) {
        if (this.keyboardFocus === morphOrNull) return;

        if (this.keyboardFocus != null) {
            // console.log('blur %s', this.keyboardFocus);
            this.keyboardFocus.onBlur(this);
            this.keyboardFocus.setHasKeyboardFocus(false);
        }
        
        this.keyboardFocus = morphOrNull; 
        
        if (this.keyboardFocus) {
            // console.log('focus %s', this.keyboardFocus);
            this.keyboardFocus.onFocus(this);
        }
    },
    
    world: function() {
        return this.owner;
    },

    // this is the DOM Event callback
    handleEvent: function(rawEvt) {
        var evt = new Event(rawEvt);
        evt.hand = this;
     
        DebuggingStack = [];  // Reset at each input event

        switch (evt.type) {
        case "mousemove":
        case "mousedown":
        case "mouseup":
            this.handleMouseEvent(evt);
            // evt.preventDefault();
            break;
        case "keydown":
        case "keypress": 
        case "keyup":
            this.handleKeyboardEvent(evt);
            break;
        default:
            console.log("unknown event type " + evt.type);
        }
        evt.stopPropagation();
    }.logErrors('Event Handler'),

    handleMouseEvent: function(evt) { 
        evt.setButtonPressedAndPriorPoint(this.mouseButtonPressed, 
            this.lastMouseEvent ? this.lastMouseEvent.mousePoint : null);

        //-------------
        // mouse move
        //-------------
        if (evt.type == "mousemove") { // it is just a move
            this.setPosition(evt.mousePoint);
            this.recordChange('origin');
             
            if (evt.mousePoint.dist(this.lastMouseDownPoint) > 10) { 
                this.hasMovedSignificantly = true;
            }
                
            if (this.mouseFocus) { // if mouseFocus is set, events go to that morph
                this.mouseFocus.captureMouseEvent(evt, true);
            } else {
                if (this.owner) {
                    var receiver = this.owner.morphToReceiveEvent(evt);
                    if (receiver !== this.mouseOverMorph) {

                        // if over a new morph, send onMouseOut, onMouseOver
                        if (this.mouseOverMorph) this.mouseOverMorph.onMouseOut(evt);
                        this.mouseOverMorph = receiver;
                        // console.log('msOverMorph set to: ' + Object.inspect(this.mouseOverMorph));
                        if (this.mouseOverMorph) this.mouseOverMorph.onMouseOver(evt);
                        if (!receiver || !receiver.canvas()) return;  // prevent errors after world-switch

                        // Note if onMouseOver sets focus, it will get onMouseMove
                        if (this.mouseFocus) this.mouseFocus.captureMouseEvent(evt, true);
                        else if (!evt.hand.hasSubmorphs()) this.owner.captureMouseEvent(evt, false); 
                    }
                } 
            }
            this.lastMouseEvent = evt;
            return;
        }
    
        //-------------------
        // mouse up or down
        //-------------------
        if (!evt.mousePoint.eqPt(this.position())) { // Only happens in some OSes
            // and when window wake-up click hits a morph
            console.log("mouseButton event includes a move!");
            this.moveBy(evt.mousePoint.subPt(this.position())); 
        }

        this.mouseButtonPressed = (evt.type == "mousedown"); 
        this.setBorderWidth(this.mouseButtonPressed ? 3 : 1);
        evt.setButtonPressedAndPriorPoint(this.mouseButtonPressed, this.lastMouseEvent ? this.lastMouseEvent.mousePoint : null);
    
        if (this.mouseFocus != null) {
            if (this.mouseButtonPressed) {
                this.mouseFocus.captureMouseEvent(evt, true);
                this.lastMouseDownPoint = evt.mousePoint; 
            }
            else this.mouseFocus.captureMouseEvent(evt, true); 
        } else {
            if (this.hasSubmorphs() && (evt.type == "mousedown" || this.hasMovedSignificantly)) {
                // If laden, then drop on mouse up or down
                var m = this.topSubmorph();
                var receiver = this.owner.morphToGrabOrReceiveDroppingMorph(evt, m);
                // For now, failed drops go to world; later maybe put them back?
                if (receiver == null) receiver = this.world();
                this.dropMorphsOn(receiver);
            } else {
                // console.log('hand dispatching event ' + event.type + ' to owner '+ Object.inspect(this.owner()));
                // This will tell the world to send the event to the right morph
                // We do not dispatch mouseup the same way -- only if focus gets set on mousedown
                if (evt.type == "mousedown") this.owner.captureMouseEvent(evt, false);
            }
            if (evt.type == "mousedown") {
                this.lastMouseDownPoint = evt.mousePoint;
                this.hasMovedSignificantly = false; 
            }
        }
        this.lastMouseEvent = evt; 

    },

    grabMorph: function(grabbedMorph, evt) { 
        if (evt.isShiftDown() && !(grabbedMorph instanceof LinkMorph)) {
            if (!grabbedMorph.okToDuplicate()) return;
            grabbedMorph.copyToHand(this);
            return;
        }
        if (evt.isAltDown()) {
            grabbedMorph.showMorphMenu(evt);
            return;
        }
        // Give grabbed morph a chance to, eg, spawn a copy or other referent
        grabbedMorph = grabbedMorph.okToBeGrabbedBy(evt);
        if (!grabbedMorph) return;

        if (grabbedMorph.owner && !grabbedMorph.owner.openForDragAndDrop) return;

        if (this.keyboardFocus && grabbedMorph !== this.keyboardFocus) {
            this.keyboardFocus.relinquishKeyboardFocus(this);
        }
        // console.log('grabbing %s', grabbedMorph);
        // Save info for cancelling grab or drop [also need indexInOwner?]
        // But for now we simply drop on world, so this isn't needed
        this.grabInfo = [grabbedMorph.owner, grabbedMorph.position()];
        if (logDnD) console.log('%s grabbing %s', this, grabbedMorph);
        this.addMorph(grabbedMorph);
        if (this.applyDropShadowFilter) {
            grabbedMorph.rawNode.setAttributeNS(null, "filter", "url(#DropShadowFilter)");
        }
        // grabbedMorph.updateOwner(); 
        this.changed(); //for drop shadow
    },
    
    dropMorphsOn: function(receiver) {
        if (receiver !== this.world()) this.unbundleCarriedSelection();
        while (this.hasSubmorphs()) { // drop in same z-order as in hand
            var m = this.submorphs.first();
            receiver.addMorph(m); // this removes it from hand
            if (logDnD) console.log("%s dropping %s on %s", this, m, receiver);
    
            if (this.applyDropShadowFilter) {
                m.rawNode.setAttributeNS(null, "filter", "none");
            }
            // DI: May need to be updated for collaboration...
            // m.updateBackendFields('origin'); 

            // FIXME - following stmt is a workaround for the fact that if the targetMorph gets
            // dragged, its rotation value set in degrees rather than radians, and this
            // may foul things up later if .rotation is read rather than .getRotation
            // Remove this stmt after it gets fixed.
            m.setRotation(m.getRotation()); //work-around for invalid degree/radian confusion
        }
    },

    unbundleCarriedSelection: function() {
        // Unpack the selected morphs from a selection prior to drop or jump to other world
        if (!this.hasSubmorphs() || !(this.topSubmorph() instanceof SelectionMorph)) return;
        var selection = this.topSubmorph();
        for (var i=0; i<selection.selectedMorphs.length; i++) {
            this.addMorph(selection.selectedMorphs[i])
        }
        selection.removeOnlyIt();
    },

    moveTopMorph: function(evt) {
        switch (evt.getKeyCode()) {
        case Event.KEY_LEFT:
            this.topSubmorph().moveBy(pt(-10,0));
            evt.stop();
            return true;
        case Event.KEY_RIGHT:
            // forget the existing selection
            this.topSubmorph().moveBy(pt(10, 0));
            evt.stop();
            return true;
        case Event.KEY_UP:
            this.topSubmorph().moveBy(pt(0, -10));
            evt.stop();
            return true;
        case Event.KEY_DOWN:
            this.topSubmorph().moveBy(pt(0, 10));
            evt.stop();
            return true;
        }
        return false;
    },

    transformTopMorph: function(evt) {
        var m = this.topSubmorph();
        switch (String.fromCharCode(evt.charCode)) {
        case '>':
            m.setScale(m.getScale()*1.1);
            evt.stop();
            return true;
        case '<':
            m.setScale(m.getScale()/1.1);
            evt.stop();
            return true;
        case ']':
            m.setRotation(m.getRotation() + 2*Math.PI/16);
            evt.stop();
            return true;
        case '[':
            m.setRotation(m.getRotation() - 2*Math.PI/16);
            evt.stop();
            return true;
        }
        return false;
    },

    handleKeyboardEvent: function(evt) { 
        if (this.hasSubmorphs())  {
            if (evt.type == 'keydown' && this.moveTopMorph(evt)) return;
            else if (evt.type == 'keypress' && this.transformTopMorph(evt)) return;
        }

        // manual bubbling up b/c the event won't bubble by itself    
        for (var responder = this.keyboardFocus; responder != null; responder = responder.owner) {
            if (responder.takesKeyboardFocus()) {
                var handler = responder["on" + evt.capitalizedType()];
                if (handler) {
                    if (handler.call(responder, evt)) 
                        break; // event consumed?
                }
            }
        } 
    },

    bounds: function($super) {
        // account for the extra extent of the drop shadow
        // FIXME drop shadow ...
        if (this.shadowMorph)
            return $super().expandBy(shadowOffset.x);
        else return $super();
    },
    
    toString: function($super) { 
        var superString = $super();
        var extraString = ", local=%1,id=%2".format(this.isLocal, this.id);
        if (!this.hasSubmorphs()) return superString + ", an empty hand" + extraString;
        return "%1, a hand carrying %2%3".format(superString, this.topSubmorph(), extraString);
    }
    
    }});


/**
 * @class LinkMorph
 * LinkMorph implements a two-way hyperlink between two Morphic worlds
 */ 

LinkMorph = Morph.subclass("LinkMorph", {

    defaultFill: Color.black,
    defaultBorderColor: Color.black,
    helpText: "Click here to enter or leave a subworld.\n" +
              "Use menu 'grab' to move me.  Drag objects\n" +
              "onto me to transport objects between worlds.",
    
    initialize: function($super, otherWorld, initialPosition) {
        // In a scripter, type: world.addMorph(new LinkMorph(null))
        var bounds = initialPosition;

        // Note: Initial position can be specified either as a rectangle or point.
        // If no position is specified, place the icon in the lower left corner
        // of the screen.
        if (!bounds) {
            bounds = WorldMorph.current().bounds().bottomLeft().addXY(50, -50).asRectangle().expandBy(25);
        } else if (bounds instanceof Point) {
            bounds = bounds.asRectangle().expandBy(25);
        }
    
        $super(bounds, "ellipse");

        // Make me look a bit like a world
        this.setFill(new RadialGradient(Color.green, Color.blue));
        [new Rectangle(0.15,0,0.7,1), new Rectangle(0.35,0,0.3,1), new Rectangle(0,0.3,1,0.4)].each( function(each) {
            // Make longitude / latitude lines
            var lineMorph = new Morph(bounds.scaleByRect(each), "ellipse");
            lineMorph.setFill(null); lineMorph.setBorderWidth(1); lineMorph.setBorderColor(Color.black);
            lineMorph.align(lineMorph.bounds().center(),this.shape.bounds().center());
            lineMorph.ignoreEvents();
            this.addMorph(lineMorph);
        }.bind(this));
        this.openForDragAndDrop = false;
        this.suppressHandles = true;

        if (!otherWorld) {
            otherWorld = new WorldMorph(Canvas);
            var pathBack = new LinkMorph(WorldMorph.current(), bounds);
            pathBack.setFill(new RadialGradient(Color.orange, Color.red.darker()));
            otherWorld.addMorph(pathBack);
        } 
        this.myWorld = otherWorld;
        return this;
    },
    
    okToBeGrabbedBy: function(evt) {
        this.enterMyWorld(evt); 
        return null; 
    },

    enterMyWorld: function(evt) { // needs vars for oldWorld, newWorld
        carriedMorphs = [];

        // Save, and suspend stepping of, any carried morphs
        evt.hand.unbundleCarriedSelection();
        while (evt.hand.hasSubmorphs()) {
            var m = evt.hand.topSubmorph();
            m.suspendAllActiveScripts();
            carriedMorphs.splice(0, 0, m);
            m.remove();
        }
        this.hideHelp();
        this.myWorld.changed();
        var oldWorld = WorldMorph.current();
        oldWorld.onExit();    

        // remove old hands
        oldWorld.hands.clone().each(function(hand) { 
            oldWorld.removeHand(hand);
        });
        
        var canvas = oldWorld.canvas();

        oldWorld.remove();
        
        console.log('left world %s through %s', oldWorld, this);
        // Canvas.appendChild(this.myWorld);
    
        // display world first, then add hand, order is important!
        var newWorld = this.myWorld;
        WorldMorph.setCurrent(newWorld);

        newWorld.displayWorldOn(canvas); 

        newWorld.onEnter(); 
        carriedMorphs.each(function(m) {
            newWorld.firstHand().addMorph(m);
            m.resumeAllSuspendedScripts();
        });

        if (Config.showThumbnail) {
            var scale = 0.1;
            if (newWorld.thumbnail) {
                newWorld.thumbnail.remove();
            }
            newWorld.thumbnail = new Morph(Rectangle.fromElement(canvas), "rect");
            newWorld.addMorph(newWorld.thumbnail);
            newWorld.thumbnail.setScale(scale);
            newWorld.thumbnail.addMorph(oldWorld);
        }

        if (carriedMorphs.length > 0) newWorld.firstHand().emergingFromWormHole = true; // prevent re-entering
    },

    onMouseOver: function(evt) {
        if (evt.hand.hasSubmorphs()) { // if hand is laden enter world bearing gifts
            if (!evt.hand.emergingFromWormHole) this.enterMyWorld(evt);
        } else if (this.helpText) this.showHelp(evt);
    },
    
    onMouseOut: function(evt) {
        evt.hand.emergingFromWormHole = false;
        this.hideHelp();
    },
    
    showHelp: function(evt) {
        if (Config.suppressBalloonHelp) return;  // DI: maybe settable in window menu?
        if (this.owner instanceof HandMorph) return;
        
        // Create only one help balloon at a time
        if (this.help) return;
        
        this.help = new TextMorph(evt.mousePoint.addXY(10, 10).extent(pt(260, 20)), this.helpText);
        // trying to relay mouse events to the WindowControlMorph
        this.help.relayMouseEvents(this, {onMouseDown: "onMouseDown", onMouseMove: "onMouseMove", onMouseUp: "onMouseUp"});
        
        // some eye candy for the help
        this.help.shape.roundEdgesBy(15);
        this.help.setFill(Color.primary.yellow.lighter(3));
        this.help.shape.setFillOpacity(.8);
        this.help.openForDragAndDrop = false; // so it won't interfere with mouseovers
        this.world().addMorph(this.help);
    },
    
    hideHelp: function() {
        if (this.help) {
            this.help.remove();
            this.help = null;
        }
    },
    
    setHelpText: function ( newText ) {
        this.helpText = newText;
    }

});

console.log('loaded Core.js');

