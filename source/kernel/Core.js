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

Object.extend(Canvas, {
    // Canvas bounds
    bounds: function() {
        return Rectangle(this.x.baseVal.value, this.y.baseVal.value, 
                         this.width.baseVal.value, this.height.baseVal.value);
    }
});

var Font = window.parent.Font;

window.parent.console.platformConsole = console;
var console = window.parent.console;

Namespace =  {
    SVG : Canvas.getAttribute("xmlns"),
    LIVELY : Prototype.Browser.WebKit ? null : Canvas.getAttribute("xmlns:lively"), // Safari XMLSerializer seems to do weird things w/namespaces
    XLINK : Canvas.getAttribute("xmlns:xlink"),
    DAV : Canvas.getAttribute("xmlns:D"),
    XHTML: document.documentElement.getAttribute("xmlns") 
};

var Loader = Class.create();
Object.extend(Loader, {

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
    
});

// SVG/DOM bindings 

/**
 * @class Query
 */

var Query = Class.create();
Object.extend(Query, {

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
    },

    $: function(id) {
        return document.getElementById(id);
    }

});




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
    },

    prototypes: new Hash(), // elementName -> prototype

    // Somethimes object.constructor.prototype doesn't work for host objects b/c the actuall hidden object.__proto__
    // doesn't have its .constructor property set to the right value or the constructor doesn't have it's .prototype
    // value set
    getPrototype: function(elementName) { // remember prototypes
        var proto = this.prototypes[elementName];
        if (!proto) {
            this.prototypes[elementName] = proto = this.create(elementName).__proto__;
        }
        return proto;
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
    
    extend: function(base) {
        if (base && !Class.isClass(base)) {
            throw new Error(base + ' is not a class');
        }

        var constr = this.create();
        
        if (base) {
            constr.superClass = base.prototype;
            Object.extend(constr.prototype, base.prototype);
        }

        return constr;
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
        return a.sort(); 
    }
    
});

/**
 * Extensions to class Object
 */  

/**
 * @class Category
 * Support for Smalltalk-style method categories 
 */  

Category = function() {};

Object.extend(Object, {

    // true prototypal inheritance like in, say, Self
    derive: function(parent, initializer) {
        var result = initializer || {};
        result.__proto__ = parent;
        return result;
    },

    category: function(target, description, scopefun) {
        scopefun.description = description;
        scopefun.__proto__ = Category;
        Object.extend(target, scopefun.call(target));
        return scopefun;
    }
    
});

Object.properties = function(object, predicate) {
    var a = [];
    for (var name in object) {  
        if (!(object[name] instanceof Function) && (predicate ? predicate(object) : true)) {
            a.push(name);
        }
    } 
    return a.sort();
};

/**
 * Extensions to class Function
 */  

Function.callStack = function() {
    var result = [];

    for (var caller = arguments.callee.caller; caller != null; caller = caller.caller) {
        result.push(caller.inspect());
    }
    
    return result;
}

Function.prototype.inspect = function() {
    /*
    if (this.category) {
        var name = this.category.$propname(this);

    if (name) 
        return name;
    }
    */
    return this.toString().substring(8, 88);
};

Function.prototype.functionNames = function() {
    var functionNames = [];

    for (var name in this.prototype) { 
        try {
            if (this.prototype[name] instanceof Function) functionNames.push(name); 
        } catch (er) {
            // FF can throw an exception here ...
        }
    }
    
    return functionNames.sort(); 
};

Function.prototype.localFunctionNames = function(exclude) {
    var sup;
    
    if (!this.superClass) {
        sup = (this === Object) ? null : Object; 
    } else {
        sup = this.superClass.constructor;
    }
    
    try {
        var superNames = (sup == null) ? [] : sup.functionNames();
    } catch (e) {
        var superNames = [];
    }
    
    var localNames = [];
    
    for (var name in this.prototype) {
        if (this.prototype[name] instanceof Function) {
            if (exclude && name.startsWith(exclude)) continue;
        
            if (!superNames.include(name) || this.prototype[name] !== sup.prototype[name]) 
                localNames.push(name);
        }
    }
    
    return localNames.sort(); 
};

Function.globalScope = window;

Function.methodString = function(className, methodName) {
    var func = (className == "Global") ? Function.globalScope[methodName] : Function.globalScope[className].prototype[methodName];
    if (func == null) return "no code";
    var code = func.toString();
    if (className == "Global" || methodName == "constructor") return code;
    return className + ".prototype." + methodName + " = " + code; 
};

Function.prototype.mixInto = function(targetFun) {
    if (this.superClass) {
        this.superClass.constructor.mixInto(targetFun);
    }
    Object.extend(targetFun.prototype, this.prototype);
  
/*
    for (var name in this.prototype) {
        if (this.prototype[name] instanceof Function) {
            targetFun.prototype[name] = this.prototype[name];
        }
    }
*/

};

if (Prototype.Browser.WebKit) { 
    Error.prototype.inspect = function() {
        return this.name + " in " + this.sourceURL + ":" + this.line + ": " + this.message;
    }
} else { // mozilla
    Error.prototype.inspect = function() {
        return this.name + " in " + this.fileName + ":" + this.lineNumber + ": " + this.message;
    }
}

Object.extend(Function.prototype, {
    
    logErrors: function(prefix) {
        var advice = function (proceed/*,args*/) {
            var args = $A(arguments); args.shift(); 
            try {
                return proceed.apply(this, args); 
            } catch (er) {
                if (prefix) console.warn("%s.%s(%s): err: %s", this, prefix, args,  er);
                else console.warn("%s", er);
                throw er;
            }
        }

        return this.wrap(advice);
    },
    
    logCalls: function(name, isUrgent) {
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
    
        return this.wrap(advice);
    }

});

/**
 * Extensions to class Object
 */  

Object.extend(Object.prototype, {
    evalInThis: function(str) {
        // eval the string str in the context of this object
        return eval(str);
    }
});

/**
 * Extensions to class String
 */  

Object.extend(String.prototype, {
    isString: function() { return true; },

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

Object.category(Number.prototype, 'extensions', function() { return {
    
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

}});

// ===========================================================================
// Porting interface
// ===========================================================================

/**
 * @class HostClass (NOTE: PORTING-SENSITIVE CODE)
 * This class allows JavaScript classes/objects to be mapped directly
 * onto underlying implementation objects.  For instance, in the SVG
 * port, we map various graphics structures directly onto the underlying
 * SVG classes/objects.     
 */  

HostClass = function() {};

Object.category(HostClass, "core", function() { return {

    becomeInstance: function(element, aClass) {
        element.__proto__ = aClass.prototype;
        return element;
    },
    
    fromElementType: function(elementName, hasInit) {

        var constr = function() {
            var args = $A(arguments);
            var node = hasInit ? NodeFactory.create(elementName, args.shift()) : NodeFactory.create(elementName);
            instance = HostClass.becomeInstance(node, constr);
            if (instance.initialize) instance.initialize.apply(instance, args);
            return instance;
        }
        constr.prototype = NodeFactory.getPrototype(elementName);
        constr.prototype.constructor = constr;
        constr.become = function(element) { return HostClass.becomeInstance(element, constr); };
        constr.name = elementName;
        return constr;
    },

    create: function(name, superClass) {
        return HostClass.extendPrototype(superClass.prototype, name);
    },

    extendPrototype: function(proto, name) {

        var constr = function(/*...*/) {
            // FIXME: this is morph specific
            var obj = Morph.makeMorph(arguments.callee);
            arguments.callee.prototype.initialize.apply(obj, arguments);
            return obj;
        }
    
        constr.become = function(element) { return HostClass.becomeInstance(element, constr); };

        constr.prototype.__proto__ = proto;

        // this could be a field but why not: rhino magic
        if (constr.__defineGetter__) 
            constr.__defineGetter__('superClass', function() { return constr.prototype.__proto__; });
        else
            constr.superClass = proto;
        constr.name = name;
        return constr;
    }

}});

// ===========================================================================
// Graphics foundations
// ===========================================================================

/**
 * @class Point: 2d points
 */

Point = function(x,y) {
    var p = Canvas.createSVGPoint();
    p.x = x;
    p.y = y;
    return p;
};

Point.prototype = Canvas.createSVGPoint().__proto__;
Point.prototype.constructor = Point;

Object.extend(Point.prototype, function() { return {
    addPt: function(p) { return Point(this.x + p.x, this.y + p.y); },
    addXY: function(dx,dy) { return Point(this.x + dx, this.y + dy); },
    midPt: function(p) { return Point((this.x + p.x)/2, (this.y + p.y)/2); },
    subPt: function(p) { return Point(this.x - p.x, this.y - p.y); },
    negated: function() { return Point(-this.x, -this.y); },
    scaleBy: function(scale) { return Point(this.x*scale,this.y*scale); },
    lessPt: function(p) { return this.x < p.x && this.y < p.y; },
    leqPt: function(p) { return this.x <= p.x && this.y <= p.y; },
    eqPt: function(p) { return this.x == p.x && this.y == p.y; },
    minPt: function(p) { return Point(Math.min(this.x,p.x), Math.min(this.y,p.y)); },
    maxPt: function(p) { return Point(Math.max(this.x,p.x), Math.max(this.y,p.y)); },
    roundTo: function(quantum) { return Point(this.x.roundTo(quantum), this.y.roundTo(quantum)); },

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
    
    asRectangle: function() { return Rectangle(this.x, this.y, 0, 0); },
    extent: function(ext) { return Rectangle(this.x, this.y, ext.x, ext.y); },

    inspect: function() { // KP: toString not overridable :(
        return "pt(%1,%2)".format(this.x.roundTo(0.01), this.y.roundTo(0.01)); 
    },
    

    // Polar coordinates...
    r: function() { return this.dist(pt(0,0)); },
    theta: function() { return Math.atan2(this.y,this.x); },

    clone: function() { with (this) { return Point(x, y); }}
}}());

Object.extend(Point, {
    parse: function(string) { // reverse of inspect
        var array = string.substring(3, string.length - 1).split(',');
        return Point(array[0], array[1]);
    },
    
    polar: function(r, theta) {return Point(r*Math.cos(theta), r*Math.sin(theta)); },
    random: function(scalePt) { return Point(scalePt.x.randomSmallerInteger(), scalePt.y.randomSmallerInteger()); }
});
   
// Shorthand for creating point objects
pt = Point;

console.log("Point");

/**
 * @class Rectangle
 */

Rectangle = function(x, y, w, h) { 
    var r = Canvas.createSVGRect();
    r.x = x; 
    r.y = y; 
    r.width = w; 
    r.height = h;
    return r;
};

Rectangle.prototype = Canvas.createSVGRect().__proto__;
Rectangle.prototype.constructor = Rectangle;

Object.category(Rectangle.prototype, 'core', function() { return {
    clone: function() { with (this) { return Rectangle(x, y, width, height); } },
    maxX: function() { return this.x + this.width; },
    maxY: function() { return this.y + this.height; },
    withWidth: function(w) { return Rectangle(this.x, this.y, w, this.height)},
    withHeight: function(h) { return Rectangle(this.x, this.y, this.width, h)},
    withX: function(x) { return Rectangle(x, this.y, this.width, this.height)},
    withY: function(y) { return Rectangle(this.x, y, this.width, this.height)},
    extent: function() { return Point(this.width,this.height); },
    withExtent: function(ext) { return Rectangle(this.x, this.y, ext.x, ext.y); },
    center: function() { return Point(this.x+(this.width/2),this.y+(this.height/2))},
    //Control point readers and writers
    topLeft: function() { return Point(this.x, this.y)},
    topRight: function() { return Point(this.maxX(), this.y)},
    bottomRight: function() { return Point(this.maxX(), this.maxY())},
    bottomLeft: function() { return Point(this.x, this.maxY())},
    leftCenter: function() { return Point(this.x, this.center().y)},
    rightCenter: function() { return Point(this.maxX(), this.center().y)},
    topCenter: function() { return Point(this.center().x, this.y)},
    bottomCenter: function() { return Point(this.center().x, this.maxY())},
    withTopLeft: function(p) { return Rectangle.fromAny(p, this.bottomRight()) },
    withTopRight: function(p) { return Rectangle.fromAny(p, this.bottomLeft()) },
    withBottomRight: function(p) { return Rectangle.fromAny(p, this.topLeft()) },
    withBottomLeft: function(p) { return Rectangle.fromAny(p, this.topRight()) },
    withLeftCenter: function(p) { return Rectangle(p.x, this.y, this.width + (this.x - p.x), this.height)},
    withRightCenter: function(p) { return Rectangle(this.x, this.y, p.x - this.x, this.height)},
    withTopCenter: function(p) { return Rectangle(this.x, p.y, this.width, this.height + (this.y - p.y))},
    withBottomCenter: function(p) { return Rectangle(this.x, this.y, this.width, p.y - this.y)}
}});

Object.extend(Rectangle.prototype, {

    containsPoint: function(p) {
        with (this) { return x <= p.x && p.x <= x + width && y<= p.y && p.y <= y + height; } 
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
        return Rectangle(this.x+d.x, this.y+d.y, this.width, this.height); 
    },
    
    scaleByRect: function(r) { // r is a relative rect, as a pane spec in a window
        return Rectangle(this.x + (r.x*this.width), this.y + (r.y*this.height), r.width*this.width, r.height*this.height); 
    },
    
    insetBy: function(d) {
        return Rectangle(this.x+d, this.y+d, this.width-(d*2), this.height-(d*2)) 
    },

    insetByPt: function(p) {
        return Rectangle(this.x+p.x, this.y+p.y, this.width-(p.x*2), this.height-(p.y*2)) 
    },
    
    expandBy: function(delta) { return this.insetBy(0-delta) }

});

Object.category(Rectangle, 'statics', function () { return {
    corners: ["topLeft","topRight","bottomRight","bottomLeft"], 
    sides: ["leftCenter","rightCenter","topCenter","bottomCenter"]
}});

Object.category(Rectangle.prototype, 'part naming', function() { return {

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
        var path = PathShape();
    
        with (this) {
            path.moveTo(x, y);
            path.lineTo(x + width, y); 
            path.lineTo(x + width, y + height);
            path.lineTo(x,         y + height);
            path.close(); 
        }
        
        return path;
    },

    inspect: function() { // KP: toString -> inspect
        return "rect(%1,%2)".format(this.topLeft(), this.bottomRight());
    }
    
}});

Object.category(Rectangle, 'factories',  function() { return {

    fromAny: function(ptA, ptB) {
        return rect(ptA.minPt(ptB), ptA.maxPt(ptB));
    },
    
    unionPts: function(points) {
        var min = points[0];
        var max = points[0];
    
        for (var i = 0; i < points.length; i++) {
            min = min.minPt(points[i]);
            max = max.maxPt(points[i]); 
        }
    
        return rect(min, max); 
    }

}});

// Shorthand for creating rectangle objects
function rect(location, corner) {
    return Rectangle(location.x, location.y, corner.x - location.x, corner.y - location.y);
};
 
console.log("Rectangle");

// ===========================================================================
// Color support
// ===========================================================================

/**
 * @class Color: Fully portable support for RGB colors
 */

Color = Class.create(); 

Object.extend(Color.prototype, {

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

Object.category(Color, 'core', function() { return {

    black: new Color(0,0,0),
    white: new Color(1,1,1),
    gray: new Color(0.8,0.8,0.8),
    red: new Color(0.8,0,0),
    green: new Color(0,0.8,0),
    yellow: new Color(0.8,0.8,0),
    blue:  new Color(0,0,0.8),
    purple: new Color(1,0,1),

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
        if (!str || str == "none") 
            return null;

        if (str.startsWith("rgb(")) {
            var arr = str.substring("rgb(".length, str.indexOf(")")).split(",");
            return Color.rgb(parseInt(arr[0]), parseInt(arr[1]), parseInt(arr[2]));
        } else {
            throw new Error('color ' + str + ' unsupported');
        }
    },
    
    rgb: function(r, g, b) {
        return new Color(r/255, g/255, b/255);
    }
    
}});

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
 * @class LinearGradient (NOTE: PORTING-SENSITIVE CODE)
 */

// note that Colors and Gradients are similar
LinearGradient = HostClass.fromElementType('linearGradient', true);

Object.extend(LinearGradient, {
    NorthSouth: rect(pt(0, 0), pt(0, 1)),
    SouthNorth: rect(pt(0, 1), pt(0, 0)),
    EastWest:   rect(pt(0, 0), pt(1, 0)),
    WestEast:   rect(pt(1, 0), pt(0, 0)),
    
    create: function(vector) {
        if (vector === undefined) 
            vector = LinearGradient.NorthSouth;

        return LinearGradient({x1: vector.x, y1: vector.y, x2: vector.maxX(), y2: vector.maxY()}); 
    },
    
    makeGradient: function(stopColor1, stopColor2, vector) {
        return LinearGradient.create(vector).addStop(0, stopColor1).addStop(1, stopColor2);
    }
    
});

Object.extend(LinearGradient.prototype, { 
    addStop: function(offset, color) {
        this.appendChild(NodeFactory.create("stop", {offset: offset, "stop-color": color}));
        return this;
    }
});

/**
 * @class RadialGradient (NOTE: PORTING-SENSITIVE CODE)
 */

RadialGradient = HostClass.fromElementType('radialGradient', true);

Object.extend(RadialGradient, {

    create: function(c, r, f) {
        var elt = RadialGradient({cx: c.x, cy: c.y, r: r});
        // elt.setAttributeNS(null, 'gradientUnits', 'userSpaceOnUse');
        // elt.setAttributeNS(null, "cx", c.x);
        // elt.setAttributeNS(null, "cy", c.y);
        // elt.setAttributeNS(null, "r", r);
        if (f !== undefined) {
            elt.setAttributeNS(null, "fx", f.x);
            elt.setAttributeNS(null, "fy", f.y);
        }
    
        return elt;
    },

    makeGradient: function(stopColor1, stopColor2) {
        return RadialGradient.create(pt(0,0), 1).addStop(0, stopColor1).addStop(1, stopColor2);
    },

    makeCenteredGradient: function(stopColor1, stopColor2) {
        // FIXME revisit the meaning of the arguments
        return RadialGradient.create(pt(0.5, 0.5), 0.4).addStop(0, stopColor1).addStop(1, stopColor2);
    }

});

Object.extend(RadialGradient.prototype, { 
    addStop: LinearGradient.prototype.addStop
});

/**
 * @class StipplePattern (NOTE: PORTING-SENSITIVE CODE)
 */

StipplePattern = HostClass.fromElementType('pattern', true);

Object.extend(StipplePattern, { 
    create: function(color1, h1, color2, h2) {
        var elt = StipplePattern({patternUnits: 'userSpaceOnUse', x: 0, y: 0, width: 100, height: h1 + h2});
        elt.appendChild(NodeFactory.create('rect', {x: 0, y: 0,  width: 100, height: h1,      fill: color1}));
        elt.appendChild(NodeFactory.create('rect', {x: 0, y: h1, width: 100, height: h1 + h2, fill: color2}));
        return elt;
    }
});

/**
 * @class Transform (NOTE: PORTING-SENSITIVE CODE)
 * Implements support for object rotation, scaling, etc.
 */

function Transform() {
    return Canvas.createSVGTransform();
}

Transform.prototype = Canvas.createSVGTransform().__proto__;
Transform.prototype.constructor = Transform;

Object.extend(Transform, {
 
    fromMatrix: function(matrix) {
        var tr = Transform();
        tr.setMatrix(matrix);
        return tr;
    },

    /**
     * createSimilitude: a similitude is a combination of translation rotation and scale.
     * @param [Point] delta
     * @param [float] angleInRadians
     * @param [float] scale
     */
    createSimilitude: function(delta, angleInRadians, scale) {
        // console.log('similitude delta is ' + delta.inspect());
        var matrix = Canvas.createSVGMatrix();
        matrix = matrix.translate(delta.x, delta.y).rotate(angleInRadians.toDegrees()).scale(scale);
        return Transform.fromMatrix(matrix);
    }.logErrors('createSimilitude')

});

Object.extend(Transform.prototype, {

    getTranslation: function() {
        return pt(this.matrix.e, this.matrix.f);
    },

    // only for similitudes
    getRotation: function() { // in degrees
        with (this.matrix) {
            return Math.atan2(b, a).toDegrees();
        }
    },

    getScale: function() {
        with (this.matrix) {
            return Math.sqrt(a * a + b * b);
        }
    },

    copy: function() {
        var tr = Transform();
        tr.setMatrix(this.matrix);
        return tr;
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

    inspect: function() {
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
 * @class Event: extensions to class Event (NOTE: PORTING-SENSITIVE CODE)
 * The code below extends the default Event class behavior inherited
 * from the web browser.  
 */

Object.extend(Event, {

    basicMouseEvents: ["mousedown", "mouseup", "mousemove"],
    extendedMouseEvents: [ "mouseover", "mouseout"],

    keyboardEvents: ["keypress", "keyup", "keydown"],
    
    capitalizer: $H({ mouseup: 'MouseUp', mousedown: 'MouseDown', mousemove: 'MouseMove', 
                      mouseover: 'MouseOver', mouseout: 'MouseOut', 
                      keydown: 'KeyDown', keypress: 'KeyPress', keyup: 'KeyUp'
    }),
    
    KEY_SPACEBAR: 32,
    KEY_ENTER: 13,
    
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
    },
    
    makeSyntheticMouseEvent: function() {
        var evt = document.createEvent("MouseEvents");
        // cf. http://developer.mozilla.org/en/docs/DOM:document.createEvent
        evt.initMouseEvent("mousemove", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        return evt;
    }
    
});

Object.extend(Event, { 
    basicInputEvents: Event.basicMouseEvents.concat(Event.keyboardEvents),
    mouseEvents: Event.basicMouseEvents.concat(Event.extendedMouseEvents)
});

Object.extend(Event.prototype, {

    isMouse:  function() {
        // return this instanceof MouseEvent;
        return Event.mouseEvents.include(this.type);
    },

    isKeyboard:  function() {
        // return this instanceof MouseEvent;
        return Event.keyboardEvents.include(this.type);
    },

    clientPoint: function() {
        return pt(this.clientX, this.clientX);
    },

    init: function() {
        if (this.isMouse()) {
            this.mousePoint = pt(this.clientX, this.clientY - 3);
            this.priorPoint = this.mousePoint; 
        } 
        this.hand = null;

        //  use this.timeStamp
        // this.msTime = (new Date()).getTime();
        this.mouseButtonPressed = false;
        
        //Safari somehow gets the x and y coords so we add them here to Firefox too --PR
        //console.log("InitMouseOver fix for Firefox evt.x=%s evt.clientX", this.x, this.clientX);
        if (this.x == null && this.y == null){
                this.x = this.clientX;
                this.y = this.clientY-3;   
        }    
    
        return this;
    },

    sanitizedKeyCode: function() {
        // if (this.type != 'keypress')
        // return;
        with (Event.Safari) {
            switch (this.keyCode) {
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
        return this.keyCode;
    },
    
    capitalizedType: function() {
        return Event.capitalizer[this.type] || this.type;
    },
    
    setButtonPressedAndPriorPoint: function(buttonPressed, priorPoint) {
        this.mouseButtonPressed = buttonPressed;
        // if moving or releasing, priorPoint will get found by prior morph
        this.priorPoint = priorPoint; 
    },
        
    inspect: function() {
        return "Event(%1%2)".format(this.type, this.mousePoint ? "," + this.mousePoint.inspect() : "");
    },

    // is anyone using this?
    properties: function() {
        var props = [];
        
        for (var name in this.prototype) {
            if (! (this[name] instanceof Function) && this.hasOwnProperty(name)) props.push(name);
        } 

        return props.sort(); 
    },

    stop: function() {
        Event.stop(this);
    }
        
});

Object.extend(window.parent, {
    onbeforeunload: function(evt) { console.log('window got unload event %s', evt); },
    onblur: function(evt) { /*console.log('window got blur event %s', evt);*/ },
    onfocus: function(evt) { /*console.log('window got focus event %s', evt);*/ }
});

Object.extend(document, {
    oncontextmenu: function(evt) { 
        var targetMorph = evt.target.parentNode; // target is probably shape (change me if pointer-events changes for shapes)
        if ((targetMorph instanceof Morph) && !(targetMorph instanceof WorldMorph)) {
            evt.preventDefault();
            evt.mousePoint = pt(evt.clientX, evt.clientY);
            targetMorph.showMorphMenu(evt); 
        } // else get the system context menu
    }.logErrors('Context Menu Handler')
});

// ===========================================================================
// Graphics primitives
// ===========================================================================

/**
 * @class DisplayObject (NOTE: PORTING-SENSITIVE CODE)
 * This class serves as an interface between our JavaScript
 * graphics classes and the underlying graphics implementation.
 * In this particular implementation, graphics primitives are
 * mapped onto various SVG objects and attributes.
 */

DisplayObject = Class.create();
// a mixin

Object.extend(DisplayObject.prototype, {

    setType: function(type)  {
        this.setAttributeNS(Namespace.LIVELY, "type", type);
        return this;
    },

    getType: function()  {
        try {
            return this.getAttributeNS(Namespace.LIVELY, "type");
        } catch (er) {
            console.log('in getType this is %s caller is %s', this, arguments.callee.caller);
            throw er;
        }
    },

    withHref: function(localURl) {
        this.setAttributeNS(Namespace.XLINK, "href", localURl);
        return this;
    },

    copy: function() { 
        return this.cloneNode(true); 
    },

    /**
     * @param [String] string the string specification of the fill attribute.
     */
    setFill: function(string) {
        this.setAttributeNS(null, "fill", string == null ? "none" : string);
    },
    
    getFill: function() {
        return this.getAttributeNS(null, "fill");
    },
    
    setStroke: function(paint) {
        //console.log('new color ' + color);
        this.setAttributeNS(null, "stroke", paint == null ? "none" : paint.toString());
    },
    
    getStroke: function() {
        return this.getAttributeNS(null, "stroke");
    },
    
    setStrokeWidth: function(width) {
        this.setAttributeNS(null, "stroke-width", width);
    },

    getStrokeWidth: function() {
        // FIXME stroke-width can have units
        return parseFloat(this.getAttributeNS(null, "stroke-width"));
    },
 
    setFillOpacity: function(alpha) {
        //    console.log('opacity ' + alpha);
        this.setAttributeNS(null, "fill-opacity", alpha);
    },

    getFillOpacity: function(alpha) {
        this.getAttributeNS(null, "fill-opacity");
    },

    setStrokeOpacity: function(alpha) {
        this.setAttributeNS(null, "stroke-opacity", alpha);
    },

    getStrokeOpacity: function(alpha) {
        this.getAttributeNS(null, "stroke-opacity");
    },

    setLineJoin: function(joinType) {
        if (!joinType) throw new Error('undefined joinType');
        this.setAttributeNS(null, 'stroke-linejoin', joinType);
    },

    setLineCap: function(capType) {
        if (!capType) throw new Error('undefined capType');
        this.setAttributeNS(null, 'stroke-linecap', capType);
    },

    setBounds: function(bounds) { 
        throw new Error('setBounds unsupported on type ' + this.type());
    },

    disablePointerEvents: function() {
        this.setAttributeNS(null, "pointer-events", "none");
    },

    applyTransform: function(transform) {
        /*
        var list = transform.baseVal;
        // console.log('list was ' + Transform.printSVGTransformList(list));
        list.initialize(this.translation);
        list.appendItem(this.rotation);
        list.appendItem(this.scale);
        if (false &&  !(transformable instanceof HandMorph))
        console.log('setting on ' + transformable.inspect() + " now " + transformable.transform);
        //console.log('list is now ' + Transform.printSVGTransformList(list));
        */
        // KP: Safari needs the attribute instead of the programmatic thing
        this.setAttributeNS(null, 'transform', transform.toAttributeValue());
    },

    retrieveTransform: function() {
        return this.transform.baseVal.consolidate() || Transform();// identity if no transform specified
    }
    
});

// Setting up web browser behavior to fit our needs, e.g., prevent the browser
// from interpreting mouse drags on behalf of us.
(function() {
    Object.extend(NodeFactory.getPrototype('g'), DisplayObject.prototype);
    Object.extend(NodeFactory.getPrototype('use'), DisplayObject.prototype);
    var proto = Object.extend(NodeFactory.getPrototype('image'), DisplayObject.prototype);
    
    var dragDisabler = { handleEvent: function(evt) { evt.preventDefault(); return false ;}};
    proto.disableBrowserDrag = function() {
        this.addEventListener("dragstart", dragDisabler, true);
    }
})();

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

// Note: Shape is a mixin
Shape = Class.extend(DisplayObject);

Object.extend(Shape.prototype, {

    shouldIgnorePointerEvents: false,

    inspect: function() {
        return 'a Shape(%1,%2)'.format(this.getType(), this.bounds().inspect());
    },

    getType: function() { 
        return this.tagName; 
    },
    
    init: function(fill, strokeWidth, stroke) {
        this.setType(this.tagName); // debuggability
        
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

// RectShape is synonymous with SVGRectElement but hides the SVG nomenclature
RectShape = HostClass.fromElementType('rect', false);
Shape.mixInto(RectShape);

Object.extend(RectShape.prototype, {

    initialize: function(r, color, borderWidth, borderColor) {
        //this.setAttributeNS(Namespace.XLINK, "href", "#ProtoRect");
        this.setBounds(r);
        this.init(color, borderWidth, borderColor);
        return this;
    },

    setBounds: function(r) {
        with (this) {
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
        var x = this.x.baseVal.value;
        var y = this.y.baseVal.value;
        var width = this.width.baseVal.value;
        var height = this.height.baseVal.value;
        return Rectangle(x, y, width, height);
    },
    
    containsPoint: function(p) {
        var x = this.x.baseVal.value;
        var width = this.width.baseVal.value;
        if (!(x <= p.x && p.x <= x + width))
            return false;
        var y = this.y.baseVal.value;
        var height = this.height.baseVal.value;
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
        return HandleMorph(loc, "rect", hand, targetMorph, partName); 
    },
    
    getEdgeRounding: function() {
        return this.getAttributeNS(null, "rx");
    },
    
    roundEdgesBy: function(r) {
        this.setAttributeNS(null, "rx", r);
        this.setAttributeNS(null, "ry", r);
        return this;
    }

});

/**
 * @class EllipseShape
 */ 

EllipseShape = HostClass.fromElementType('ellipse', false);
Shape.mixInto(EllipseShape);

Object.extend(EllipseShape.prototype, {

    initialize: function(r, color, borderWidth, borderColor) {
        this.setBounds(r);
        this.init(color, borderWidth, borderColor);
        return this;
    },

    setBounds: function(r) {
        with (this) {
            setAttributeNS(null, "cx", r.x + r.width/2);
            setAttributeNS(null, "cy", r.y + r.height/2);
            setAttributeNS(null, "rx", r.width/2);
            setAttributeNS(null, "ry", r.height/2);
        }
        return this;
    },
    
    // For ellipses, test if x*x + y*y < r*r
    containsPoint: function(p) {
        var w = this.rx.baseVal.value * 2;
        var h = this.ry.baseVal.value * 2;
        var c = pt(this.cx.baseVal.value, this.cy.baseVal.value);
        var dx = Math.abs(p.x - c.x);
        var dy = Math.abs(p.y - c.y)*w/h;
        return (dx*dx + dy*dy) <= (w*w/4) ; 
    },
    
    bounds: function() {
        var w = this.rx.baseVal.value * 2;
        var h = this.ry.baseVal.value * 2; 
        var x = this.cx.baseVal.value - this.rx.baseVal.value;
        var y = this.cy.baseVal.value - this.ry.baseVal.value;
        return Rectangle(x, y, w, h);
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

PolygonShape = HostClass.fromElementType('polygon', false);
Shape.mixInto(PolygonShape);

Object.extend(PolygonShape.prototype, { 

    initialize: function(vertlist, color, borderWidth, borderColor) {
        this.setVertices(vertlist);
        this.init(color, borderWidth, borderColor);
        return this;
    },
    
    setVertices: function(vertlist) {
        this.points.clear();
        this.setAttributeNS(null, "points", vertlist.map(function (p) { return p.x + "," + p.y }).join(' '));
        // vertlist.forEach( function(p) {  this.points.appendItem(p); }, this);
    },

    vertices: function() {
        var array = [];
        for (var i = 0; i < this.points.numberOfItems; i++) {
            array.push(this.points.getItem(i));
        }
        return array;
    },

    inspect: function() {
        var pts = this.vertices();
        return this.tagName + "[" + pts.invoke('inspect').join(";") + "]";
    },

    bounds: function() {
        // FIXME very quick and dirty, consider caching or iterating over this.points
        var vertices = this.vertices();
        console.assert(vertices.length > 0, "PolygonShape.prototype.bounds");
        return Rectangle.unionPts(vertices);
    },

    copy: function() { 
        var newShape = this.cloneNode(true); 
        if (newShape.points.numberOfItems != this.points.numberOfItems) {
            // ARGH, Safari doesn't clone polygons properly???
            newShape.setVertices(this.vertices());
        }
        return newShape;
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

        return HandleMorph(loc, shape, hand, targetMorph, partName); 
    }

});

/**
 * @class PolylineShape
 */ 

PolylineShape = HostClass.fromElementType('polyline', false);
Shape.mixInto(PolylineShape);

Object.extend(PolylineShape.prototype, {

    initialize: function(vertlist, borderWidth, borderColor) {
        this.setVertices(vertlist);
        this.init(null, borderWidth, borderColor);
        return this;
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
    inspect: PolygonShape.prototype.inspect,
    setVertices: PolygonShape.prototype.setVertices,
    reshape: PolygonShape.prototype.reshape,
    controlPointNear: PolygonShape.prototype.controlPointNear,
    possibleHandleForControlPoint: PolygonShape.prototype.possibleHandleForControlPoint,
    copy: PolygonShape.prototype.copy
});

/**
 * @class PathShape
 */ 

PathShape = HostClass.fromElementType('path', false);
Shape.mixInto(PathShape);

Object.extend(PathShape.prototype, {

    initialize: function() {
        this.init();
        return this;
    },

    moveTo: function(x, y) {
        this.pathSegList.appendItem(this.createSVGPathSegMovetoAbs(x, y));
    },
    
    lineTo: function(x, y) {
        this.pathSegList.appendItem(this.createSVGPathSegLinetoAbs(x, y));
    },

    close: function() {
        this.pathSegList.appendItem(this.createSVGPathSegClosePath());
    },

    containsPoint: function(p) {
        return false; // FIXME
    },
    
    copy: function() { 
        var newShape = this.cloneNode(true); 
        if (newShape.pathSegList.numberOfItems != this.pathSegList.numberOfItems) {
            // ARGH, Safari doesn't clone lists properly???
            for (var i = 0; i < this.pathSegList.numberOfItems; i++) {
                // How annoying, no way of cloning path segments
                var seg = this.pathSegList.getItem(i);
                switch (seg.pathSegType) {
                case seg.PATHSEG_MOVETO_ABS:
                    newShape.moveTo(seg.x, seg.y);
                    break;
                case seg.PATHSEG_LINETO_ABS:
                    newShape.lineTo(seg.x, seg.y);
                    break;
                case seg.PATHSEG_CLOSEPATH:
                    newShape.close();
                    break;
                default:
                    console.log('cannot deal with ' + seg.pathSegType);
                }
            }
        }
        return newShape;
    },

    bounds: function() {
        // FIXME quick and dirty, fix for arcs
        var vertices = [];
    
        if (this.pathSegList.numberOfItems == 0) {
            return pt(0, 0).asRectangle(); //???
        }
    
        for (var i = 0; i < this.pathSegList.numberOfItems; i++) {
            // How annoying, no way of cloning path segments
            var seg = this.pathSegList.getItem(i);
            switch (seg.pathSegType) {
            case seg.PATHSEG_MOVETO_ABS:
                vertices.push(pt(seg.x, seg.y));
                break;
            case seg.PATHSEG_LINETO_ABS:
                vertices.push(pt(seg.x, seg.y));
                break;
            case seg.PATHSEG_CLOSEPATH:
                // newShape.close();
                break;
            default:
                console.log('cannot deal with ' + seg.pathSegType);
            }
        }
        return Rectangle.unionPts(vertices);
    }

});

DisplayObjectList = function(type) {
    return DisplayObjectList.become(NodeFactory.create('g'), type);
};

DisplayObjectList.become = function(obj, type) {
    obj.__proto__ = DisplayObjectList.prototype;
    obj.setType(type);
    return obj;
};

DisplayObjectList.prototype = Object.derive(NodeFactory.getPrototype('g'));

Object.extend(DisplayObjectList.prototype, Enumerable);
Object.extend(DisplayObjectList.prototype, {
    
    removeAll: function() {
        while (this.firstChild) this.removeChild(this.firstChild);
    },
    
    _each: function(iterator) {
        for (var m = this.lastChild; m != null; m = m.previousSibling) {
            iterator(m);
        }
    },

    push: function(element) {
        this.appendChild(element);
    },

    remove: function(element) {
        if (element.parentNode === this) {
            this.removeChild(element);
            return true;
        }
        return false;
    }
    
});

// ===========================================================================
// Morph functionality
// ===========================================================================

// Every graphical object in our system is a morph.
// For further information about morphs, read the documentation. 

/**
 * @class Morph
 */ 

Morph = HostClass.extendPrototype(NodeFactory.create("g"), 'Morph');

Object.extend(Morph, {
    
    makeMorph: function(constr) {
        var element = HostClass.becomeInstance(NodeFactory.create("g"), constr);
        element.setType(constr.name);
        return element;
    },
    
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

// Morph event handling 
MouseHandlerForDragging = Class.create();

Object.extend(MouseHandlerForDragging.prototype, {
    
    initialize: function() {
        throw new Error('singleton, use the prototype');
    },

    handleMouseEvent: function(evt, targetMorph) {
        var capType = evt.capitalizedType();
        var handler = targetMorph['on' + capType];
        // console.log('target for ' + evt.type + 'Action is ' + handler + ' target ' + targetMorph.inspect());
        if (capType == "MouseDown") evt.hand.setMouseFocus(targetMorph);
        handler.call(targetMorph, evt);
        if (capType == "MouseUp") evt.hand.setMouseFocus(null);
        return true; 
    },
    
    handlesMouseDown: function(evt) { 
        return false;
    }
});

var MouseOverHandler = { 
    handleEvent: function(evt) { 
        evt.init();
        var target = evt.currentTarget;
        if (target instanceof Morph) {
            var handler = target['on' + evt.capitalizedType()];
            if (handler) {
                handler.call(target, evt);
            }
        } else {
            console.warn('mouseover event on nonmorph %s', target);
        }

    }.logErrors('MouseOver Handler'),

    observe: function(morph) {
        morph.addEventListener("mouseover", this, true);
        morph.addEventListener("mouseout", this, true);
    }

};

// Morph initialization functions
Object.extend(Morph.prototype, {

    // prototype vars
    defaultFill: Color.primary.green,
    defaultBorderWidth: 1,
    defaultBorderColor: Color.black,

    focusedBorderColor: Color.blue,
    focusHaloBorderWidth: 4,

    fishEye: false,        // defines if fisheye effect is used
    fisheyeScale: 1.0,     // set the default scaling to 1.0
    fisheyeGrowth: 1.0,    // upto fisheyeGrowth size bigger (1.0 = double size)
    fisheyeProximity: 0.5, // where to react wrt/ size (how close we need to be)

    clipPath: null, // KP: should every morph should have one of those?
    keyboardHandler: null, //a KeyboardHandler for keyboard repsonse, etc
    openForDragAndDrop: true, // Submorphs can be extracted from or dropped into me
    mouseHandler: MouseHandlerForDragging.prototype, //a MouseHandler for mouse sensitivity, etc
    stepHandler: null, //a stepHandler for time-varying morphs and animation 
    drawBounds: false,

    nextNavigableSibling: null, // keyboard navigation
    
    initialize: function(initialBounds /*:Rectangle*/, shapeType/*:String*/) {
        // console.log('initializing morph %s %s', initialBounds, shapeType);
        this.pvtSetTransform(Transform.createSimilitude(this.defaultOrigin(initialBounds, shapeType), 0, 1.0));
        this.pickId();
        this.initializePersistentState(initialBounds, shapeType);
        this.initializeTransientState(initialBounds);
        if (this.drawBounds) this.updateBoundsElement();
    },

    reinitialize: function(importer/*:Importer*/) { // called when restoring from external representation (markup)
        this.pvtSetTransform(this.retrieveTransform());
        var prevId = this.pickId();
        if (importer) { 
            importer.addMapping(prevId, this); 
        }
        this.restorePersistentState(importer);    
        this.initializeTransientState(null);

        if (this.drawBounds) this.updateBoundsElement();
        if (this.activeScripts) {
            console.log('started stepping %s', this);
            this.startSteppingScripts();
        }
    },
    
    restorePersistentState: function(importer) {
        //  wade through the children
        var children = [];
        for (var desc = this.firstChild; desc != null; desc = desc.nextSibling) {
            children.push(desc);
        }
        var modelNode = null;

        for (var i = 0; i < children.length; i++) {
            var node = children[i];
            switch (node.tagName) {
            case "action": {
                var a = node.textContent.evalJSON();
                console.info("starting stepping %s based on %s", this, node.textContent);
                this.startStepping(a.stepTime, a.scriptName, a.argIfAny);
                break;
            }
            case "model": {
                if (modelNode) console.warn("%s already has modelNode %s", this, modelNode);
                modelNode = node;
                // postpone hooking up model until all the morphs are reconstructed
                console.info("found modelNode %s", new XMLSerializer().serializeToString(node));
                break;
            } 
            case "modelPlug": {
                this.modelPlug = this.addChildElement(Model.becomePlugNode(node));
                console.info("%s reconstructed plug %s", this, this.modelPlug);
                break;
            } 
            case "defs": { // FIXME FIXME, this is painfully ad hoc!
                if (this.defs) console.warn('%s already has defs %s', this, this.defs);
                this.defs = node;
                for (var def = node.firstChild; def != null; def = def.nextSibling) {
                    switch (def.tagName) {
                    case "clipPath":
                        var newPathId = "clipPath_" + this.id;
                        var myClipPath = this.getAttributeNS(null, 'clip-path');
                        if (myClipPath) {
                            this.setAttributeNS(null, 'clip-path', 'url(#'  + newPathId + ')');
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
                            var myFill = this.shape.getAttributeNS(null, 'fill');
                            if (myFill) {
                                this.shape.setAttributeNS(null, 'fill', 'url(#' + newFillId + ')');
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
                break;
                // let it be
            } 
            default: {
                if (DisplayObject.prototype.getType.call(node)) {
                    if (/FocusHalo/.test(DisplayObject.prototype.getType.call(node))) { //don't restore
                        this.removeChild(node);
                    } else {
                        this.restoreFromElement(node, importer);
                    }   
                } else if (node.nodeName == '#text') {
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
            this.removeChild(modelNode); // currently modelNode is not permanently stored 
        }
    },
    
    restoreFromElement: function(element/*:Element*/, importer/*Importer*/)/*:Boolean*/ {
        if (!element || !element.tagName) {
            console.log('undefined element %s %s', element, element && element.tagName);
            return;
        }
        
        if (/ellipse|rect|polyline|polygon/.test(element.tagName)) {
            HostClass.becomeInstance(element, Shape.classForTag(element.tagName));
            //console.log('made element %s, ' + element, element);
            this.shape = element;
            return true;
        }

        var type = element.getAttributeNS(Namespace.LIVELY, 'type');
        
        switch (type) {
        case 'Submorphs':
            this.submorphs = DisplayObjectList.become(element, type);
            //console.log('recursing into children of %s', this);
            this.submorphs.each(function(m) { importer.importFromNode(m); });
            return true;
        case 'FocusHalo':
            return true;
        }
        
        return false;
    },

    initializePersistentState: function(initialBounds /*:Rectangle*/, shapeType/*:String*/) {
        // a rect shape by default, will change later
        switch (shapeType) {
        case "ellipse":
            this.shape = EllipseShape(initialBounds.translatedBy(this.origin.negated()), 
                         this.defaultFill, this.defaultBorderWidth, this.defaultBorderColor);
            break;
        default:
            // polygons and polylines are set explicitly later
            this.shape = RectShape(initialBounds.translatedBy(this.origin.negated()), 
            this.defaultFill, this.defaultBorderWidth, this.defaultBorderColor);
            break;
        }
    
        this.addChildElement(this.shape);

        // this.created = false; // exists on server now
    
        this.submorphs = DisplayObjectList('Submorphs');
        this.appendChild(this.submorphs);
    
        return this;
    },
    
    pickId: function() {
        var previous = this.getAttribute("id"); // this can happen when deserializing
        this.id = Morph.newMorphId();
        this.setAttribute("id", this.id); // this may happen automatically anyway by setting the id property
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

// Functions for manipulating the visual attributes of Morphs
Object.extend(Morph.prototype, {
    
    setFill: function(fill) {
        // console.log('setting %s on %s', fill, this);
        if (fill == null) {
            this.assign('fill', null);
            this.shape.setFill("none");
        } else if (fill instanceof Color) {
            this.assign('fill', null);
            this.shape.setFill(fill.toString());
        } else {
//          DI: NOTE the cloning should be handled by assign (see comment there)
//          but it doesn't seem to work right, so we do it here
            var ref = this.assign('fill', fill.cloneNode(true));
            this.shape.setFill(ref);
        }
    }.wrap(Morph.onChange('shape')),

    getFill: function() {
        var fillObj = this.shape.getFill();
        // if the fill is a color string, then make a real color
        // DI: there must be a better way to test for strings :-(
        if (fillObj.isString()) return Color.parse(fillObj);
        return fillObj
    },

    setBorderColor: function(newColor) { this.shape.setStroke(newColor); }.wrap(Morph.onChange('shape')),

    getBorderColor: function() {
        return Color.parse(this.shape.getStroke());
    },

    setBorderWidth: function(newWidth) { this.shape.setStrokeWidth(newWidth); }.wrap(Morph.onChange('shape')),

    getBorderWidth: function() {
        return this.shape.getStrokeWidth(); 
    },

    setFillOpacity: function(op) { this.shape.setFillOpacity(op); }.wrap(Morph.onChange('shape')),

    setStrokeOpacity: function(op) { this.shape.setStrokeOpacity(op); }.wrap(Morph.onChange('shape')),

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
        if ((spec.fill) instanceof LinearGradient) spec.fillType = "linear gradient";
        if ((spec.fill) instanceof RadialGradient) spec.fillType = "radial gradient";
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
        if (this.owner()) return this.owner().styleNamed(name);
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
        this.replaceChild(newShape, this.shape);
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

    /// override to respond to reshape events    
    adjustForNewBounds: function() {
        if (this.focusHalo) {
            this.adjustFocusHalo();
        }
    },
    
    /// p is in owner coordinates
    containsPoint: function(p) { 
        if (!this.bounds().containsPoint(p)) return false;
        return this.shape.containsPoint(this.relativize(p)); 
    },
    
    containsWorldPoint: function(p) { // p is in world coordinates
        if (this.owner() == null) return this.containsPoint(p);
        return this.containsPoint(this.owner().localize(p)); 
    },

    fullContainsPoint: function(p) { // p is in owner coordinates
        return this.bounds().containsPoint(p); 
    },

    fullContainsWorldPoint: function(p) { // p is in world coordinates
        // unimplemented in firefox:
        // return canvas.checkEnclosure(this, rect(p,p));
        if (this.owner() == null) return this.fullContainsPoint(p);
    
        return this.fullContainsPoint(this.owner().localize(p)); 
    },
    
    updateBoundsElement: function() {
    
        var newElement = RectShape(this.fullBounds, null, 1, Color.blue);
        newElement.disablePointerEvents();
    
        if (!this.canvas())
            return null;
            
        if (!this.boundsElement) {
            this.canvas().appendChild(newElement);
        } else {
            this.canvas().replaceChild(newElement, this.boundsElement);
        }

        this.boundsElement = newElement;
    
        return this.boundsElement;
        // this.submorphs.forEach(function(m) { m.updateBoundsElement() });
    },
    
    addChildElement: function(m) {
        return this.insertBefore(m, this.submorphs);
    },
    
    // assign an element to a field and update the <defs> if necessary
    assign: function(fieldname, element) {
        var old = this[fieldname];
        
        if (!this.defs && element) { // lazily create the field
            this.defs = NodeFactory.create('defs');
            this.addChildElement(this.defs);
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
        
//          KP sez... this should recognize if an element already has an ID
//          Then it is owned by another and should be cloned.  But it didn't
//          work for the case of setFill.  May need more debugging...
            if (id) {
                console.log('cloning node b/c original has an owner, id %s', id);
                element = element.cloneNode(true);
            }

            id = fieldname + '_' + this.id;
            element.setAttribute("id", id);
            this.defs.appendChild(element);

            //return "url(#xpointer(id(" + id + ")))"; 
            return "url(#" + id + ")";
        } else return null;
    },

    getNamedMorph: function(name) {
        for (var node = this.submorphs.firstChild; node != null; node = node.nextSibling) {
            if (node.getAttributeNS(Namespace.LIVELY, "property") == name) { 
                if (!(node instanceof Morph)) {
                    console.warn('%s is not a morph but %s', name,  node);
                }
                return node;
            }
        }
        return null;
    },

    setNamedMorph: function(name, morph) {
        if (this[name]) {
            console.warn('morph named %s already exists? %s', name, this[name]);
        }
        morph.setAttributeNS(Namespace.LIVELY, "property", name); 
        this[name] = morph;
        return this.addMorph(morph);
    }

});

// Submorph management functions
Object.extend(Morph.prototype, { 
    
    addMorph: function(morph) { return this.addMorphFrontOrBack(morph, true) },
    
    addMorphAt: function(morph, position) {
        var morph = this.addMorphFrontOrBack(morph, true);
        morph.setPosition(position);
        return morph;
    },

    addMorphFront: function(morph) { return this.addMorphFrontOrBack(morph, true) },
    
    addMorphBack: function(morph) { return this.addMorphFrontOrBack(morph, false) },
    
    addMorphFrontOrBack: function(m, front) {
        console.assert(m instanceof Morph, 'not an instance');

        if (m.owner()) {
            var tfm = m.transformForNewOwner(this);
            m.owner().removeMorph(m); // KP: note not m.remove(), we don't want to stop stepping behavior
            m.setTransform(tfm); 
            // FIXME transform is out of date
            // morph.setTransform(tfm); 
            // m.layoutChanged(); 
        } else {
            //console.log('no owner ' + m.inspect());
        }
    
        this.domAddMorph(m, front);
        m.changed();
        m.layoutChanged();
        this.layoutChanged();
        return m;
    },
    
    domAddMorph: function(m, isFront) {
        if (isFront) {
            // the last one, so drawn last, so front
            this.submorphs.push(m);
        } else {
            this.submorphs.insertBefore(m, this.submorphs.firstChild);
        }
    },
    
    removeMorph: function(m) {
        if (this.submorphs == null) {
            // or throw an exception?
            return null;
        }
        
        this.submorphs.remove(m);
        m.setHasKeyboardFocus(false);

        // KP: layoutChanged() ??
        return m;
    },
    
    removeAllMorphs: function() {
        // with (this) {
        this.submorphs.removeAll();
        // while (submorphs.firstChild) submorphs.removeChild(submorphs.firstChild);
        this.layoutChanged(); 
    },
    
    hasSubmorphs: function() {
        return this.submorphs.hasChildNodes();
    },
    
    remove: function() {
        if (!this.owner()) return null;  // already removed

        this.stopStepping();
        this.stopSteppingScripts();
        this.owner().removeMorph(this);

        return this;

        // console.log('removed ' + this.inspect());
        // this.owner = null; 
    },
    
    withAllSubmorphsDo: function(func, argOrNull) {
        // Call the supplied function on me and all of my subMorphs by recursion.
        func.call(this, argOrNull);
        this.submorphs.invoke('withAllSubmorphsDo', func, argOrNull);
    },
    
    topSubmorph: function() {
        if (this.submorphs == null) {
            return null;
        } else { 
            return this.submorphs.lastChild;
        }
    },

    // morph gets an opportunity to shut down when WindowMorph closes 
    shutdown: function() {
        this.remove();
    }
    
});

// Morph copying functions
Object.extend(Morph.prototype, {
    
    okToDuplicate: function() { return true; },  // default is OK
    
    copy: function() {
        var copy = Morph(this.bounds(), "rect"); 
        return copy.morphCopyFrom(this); 
    },
    
    // KP: FIXME clone non morphs... but how
    morphCopyFrom: function(other/*:Morph*/) { //:Morph

        // for (var p in other) {this[p] = other[p]; } // shallow copy by default
        // KP: was an iteration but has to be by hand b/c of inheriting from SVGGElement
        this.setShape(other.shape.copy());    
        this.origin = other.origin;
        this.rotation = other.rotation;
        this.scale = other.scale;
        this.fullBounds = other.fullBounds;
        if (this.drawBounds) this.updateBoundsElement();
    
        this.openForDragAndDrop = other.openForDragAndDrop;
    
        // if (other.myId) this.myId = this.world).register(this);
        if (other.cachedTransform) { 
            this.cachedTransform = other.cachedTransform.copy();
        }
    
        //this.cachedTransform = null;
    
        if (other.clipPath) {
            // console.log('other clipPath is ' + other.clipPath);
            // var clipPath = other.clipPath.cloneNode(true);
            // this.installClipPath(clipPath, Morph.newClipName());
        
            // Safari didn't clone properly the <path> contained in the <clipPath>,
            // so the following will work instead.
            this.clipToPath(other.clipPath.firstChild.copy());
        }

        if (other.hasSubmorphs()) { // deep copy of submorphs
            other.submorphs.each((function(m) { this.domAddMorph(m.copy(), false) }).bind(this));
        }
        
        if (other.stepHandler != null) { 
            this.stepHandler = other.stepHandler.copyForOwner(this);
        }

        if (other.activeScripts != null) { 
            for (var i=0; i<other.activeScripts.length; i++) {
                var a = other.activeScripts[i];
                // Copy all reflexive scripts (messages to self)
                if (a.actor === other) {
                    this.startStepping(a.stepTime, a.scriptName, a.argIfAny);
                }
            }
        } 

        this.layoutChanged();
        return this; 
    }

});

// Morph bindings to its parent, world, canvas, etc.
Object.extend(Morph.prototype, {
    
    canvas: function() {
        return this.ownerSVGElement;
    },

    owner: function() {
        //console.log('owner is ' + this.parentNode + ' constr ' + this.parentNode.constructor.name + ' me ' + this.shape);
        if (this.parentNode) { // the submorphs
            if (this.parentNode.parentNode instanceof Morph) {
                return this.parentNode.parentNode;
            }
        }
        return null;
    },

    world: function() {
        return this.owner() ? this.owner().world() : null;
    },

    inspect: function() {
	// Formerly a replacement for toString() which can't be overridden
	// in some cases.  Now deprecated in favor of Object.inspect(this) 
        return "%1(#%2,%3)".format(this.getType(), this.id, this.shape);
    }
    
});

// Morph coordinate transformation functions
Object.category(Morph.prototype, 'transforms', function() { return {
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
	//   due to stickouts, but not the bounds for layout...
        if (this.owner() && this.owner() !== this.world()) this.owner().layoutChanged(); 
        this.changed(); 
    },

    setRotation: function(theta) { // in radians
        this.rotation = theta;
        this.cachedTransform = null;
    }.wrap(Morph.onLayoutChange('rotation')),
    
    setScale: function(scale/*:float*/) {
        this.scale = scale;
        // var debugBounds = this.bounds();
        this.cachedTransform = null;
        // console.log('bounds from ' + debugBounds.inspect() + ' to ' + this.bounds().inspect());
    }.wrap(Morph.onLayoutChange('scale')),
    
    defaultOrigin: function(bounds, shapeType) { 
        try {
            return (shapeType == "rect" || shapeType == "rectangle") ? bounds.topLeft() : bounds.center(); 
        } catch (e) {
            console.log('problem in caller %s on %s', arguments.callee.caller, this);
        }
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
            if ( !pt(0,0).eqPt(k)) {
                this.setPosition(this.position().addPt(k));
                this.layoutChanged();  
                this.changed();
            }
        }
    }

}});

// Morph mouse event handling functions
Object.extend(Morph.prototype, {

    mouseEvent: function(evt, hasFocus) {
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

        if (hasFocus) return this.mouseHandler.handleMouseEvent(evt, this);

        if (!this.fullContainsWorldPoint(evt.priorPoint)) return false;

        if (this.hasSubmorphs()) {
            //If any submorph handles it (ie returns true), then return
            if (this.submorphs.any(function(m) { return m.mouseEvent(evt, false)}))
            return true;
        }

        if (this.mouseHandler == null) 
            return false;

        if (!this.shape.containsPoint(this.localize(evt.priorPoint))) 
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
        if (this.mouseHandler == null || evt.altKey) return false;  //default behavior
        return this.mouseHandler.handlesMouseDown(); 
    },

    onMouseDown: function(evt) { }, //default behavior
    
    onMouseMove: function(evt) { //default behavior
        if (evt.mouseButtonPressed && this.owner().openForDragAndDrop) this.moveBy(evt.mousePoint.subPt(evt.priorPoint));
        else this.checkForControlPointNear(evt);
    },
    
    onMouseUp: function(evt) { }, //default behavior

    onMouseOver: function(evt) {
        // default behavior is do nothing
    },

    designMode: false,
    
    setDesignMode: function(flag) {
        return this.designMode = flag; // shadowing a prototype field
    },
    
    isDesignMode: function() {
        return this.designMode; // note prototype field
    },

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
        
        this.removeChild(this.focusHalo);
        this.focusHalo = null;
        return true;
    },
    
    adjustFocusHalo: function() {
        this.focusHalo.removeAll();
        var shape = RectShape(this.shape.bounds().insetBy(-2), null, this.focusHaloBorderWidth, this.focusedBorderColor);
        this.focusHalo.push(shape);
    },

    addFocusHalo: function() {
        if (this.focusHalo) return false;
        this.focusHalo = this.addChildElement(DisplayObjectList('FocusHalo'));
        this.focusHalo.setStrokeOpacity(0.3);
        this.focusHalo.setLineJoin(Shape.LineJoins.ROUND);
        this.adjustFocusHalo();
        return true;
    }
    
});

/**
 * @class MouseHandlerForRelay
 * This class supports the morph event handling features defined above
 */ 

MouseHandlerForRelay = Class.create();

Object.extend(MouseHandlerForRelay.prototype, {

    initialize: function (target, eventSpec) {
        //  Send events to a different target, with different methods
        //    Ex: box.relayMouseEvents(box.owner, {onMouseUp: "boxReleased", onMouseDown: "boxPressed"})
        this.target = target;
        this.eventSpec = eventSpec;
    },
    
    handleMouseEvent: function(evt, appendage) {
        // console.log("this.eventSpec[this.adapter[evt.type]] = " + this.eventSpec["on" + evt.capitalizedType()]);
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
Object.extend(Morph.prototype, {

    checkForControlPointNear: function(evt) {
        // console.log('checking %s', this);
        if (this.suppressHandles) return false; // disabled
        if (this.owner() == null) return false; // can't reshape the world
        var handle = this.shape.possibleHandleForControlPoint(this, this.localize(evt.mousePoint), evt.hand);
        if (handle == null) return false;
        this.addMorph(handle);  // after which it should get converted appropriately here
        handle.showHelp(evt);
        // Don't scale -- the code below makes the handle excessively large!
        // handle.scaleFor(this.cumulativeTransform().getScale());
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
        menu.openIn(this.world(), evt.mousePoint, false, this.inspect().truncate()); 
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
            WorldMorph.current().makeShrinkWrappedWorldWith(this, WorldMorph.current().prompt('publish as')) }]
        ];
        var menu = MenuMorph(items, this); 
        if (!this.okToDuplicate()) menu.removeItemNamed("duplicate");
        return menu;
    },

    putMeInAWindow: function(loc) {
        var c = this.immediateContainer();
        var w = this.world();
        var wm = WindowMorph(this.windowContent(), this.windowTitle());
        // Position it so the content stays in place
        w.addMorphAt(wm, loc.subPt(wm.contentOffset));
        if (c) c.remove();
    },

    putMeInATab: function(loc) {
        var c = this.immediateContainer();
        var w = this.world();
        var wm = TabbedPanelMorph(this.windowContent(), this.windowTitle());
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
        if (this.owner()) return this.owner().immediateContainer();
        else return null;
    },

    windowContent: function() {
        return this; // Default response, overridden by containers
    },

    windowTitle: function() {
        return this.inspect().truncate(); // Default response, overridden by containers
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

    pickMeUp: function(evt) {
        var offset = evt.hand.position().subPt(evt.hand.lastMouseDownPoint);
        this.moveBy(offset);
        evt.hand.addMorph(this);
    },

    notify: function(msg, loc) {
        MenuMorph([["OK", 0, "toString"]], this).openIn(this.world(), loc, false, msg); 
    },

    showOwnerChain: function(evt) {
        var items = this.ownerChain().map(
            function(each) { return [each.inspect().truncate(), each, "showMorphMenu", evt]; });
        MenuMorph(items, this).openIn(this.world(), evt.mousePoint);
    },

    copyToHand: function(hand) {
        var copy = this.copy();
        console.log('copied %s', copy);
        // KP: is the following necessary?
        this.owner().addMorph(copy); // set up owner the original parent so that it can be reparented to this: 
        hand.addMorph(copy);  
        // if (this.world().backend()) this.world().backend().createMorph(copy.morphId(), copy, this.morphId());
        copy.withAllSubmorphsDo(function() { this.startStepping(null); }, null);
    },

    morphToGrabOrReceiveDroppingMorph: function(evt, droppingMorph) {
        return this.morphToGrabOrReceive(evt, droppingMorph, true);
    },

    morphToGrabOrReceive: function(evt, droppingMorph, checkForDnD) {
        // If checkForDnD is false, return the morph to receive this mosue event (or null)
        // If checkForDnD is true, return the morph to grab from a mouse down event (or null)
        // If droppingMorph is not null, then check that this is a willing recipient (else null)

        if (!this.fullContainsWorldPoint(evt.mousePoint)) return null;  // not contained anywhere

        // First check all the submorphs, front first
        if (this.hasSubmorphs()) {
            var hit = null;
            this.submorphs.each(function(m) { 
                hit = m.morphToGrabOrReceive(evt, droppingMorph, checkForDnD); 
                if (hit != null) throw $break; 
            });
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
        // else return (!evt.altKey && this === this.world()) ? null : this; 
        else return this; 
    },
    
    morphToReceiveEvent: function(evt) {
        // This should replace morphToGrabOrReceive... in Hand where events
        // must be displatched to morphs that are closed to DnD
        return this.morphToGrabOrReceive(evt, null, false);
    },

    ownerChain: function() {
        // Return an array of me and all my owner
        if (!this.owner()) return [];
        var owners = this.owner().ownerChain();
        owners.push(this);
        return owners;
    },
    
    acceptsDropping: function(morph) { 
        return this.openForDragAndDrop && morph.getType() != "WindowMorph";
    }

});

// Morph stepping/timer functions
Object.extend(Morph.prototype, {

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
        console.log('added script ' + action.scriptName);
        var actionCode = NodeFactory.createNS(Namespace.LIVELY, "action");
        actionCode.appendChild(document.createCDATASection(Object.toJSON(action)));
        this.addChildElement(actionCode);
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

StepHandler = Class.create();

Object.extend(StepHandler.prototype, {

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
        var copy = new StepHandler(copyOwner,this.stepTime)
        copy.stepFunction = this.stepFunction; 
        return copy; 
    }
    
});

// Morph bounds, coordinates, moving and damage reporting functions
Object.extend(Morph.prototype, { 
    
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
            subBounds = subBounds == null ? m.bounds() : subBounds.union(m.bounds()); });
            // could be simpler when no rotation...
            this.fullBounds = this.fullBounds.union(tfm.transformRectToRect(subBounds));
        } 
    
        if (this.fullBounds.width < 3 || this.fullBounds.height < 3) {
            // Prevent Horiz or vert lines from being ungrabable
            this.fullBounds = this.fullBounds.expandBy(3); 
        }
        
        if (this.drawBounds) this.updateBoundsElement();
    
        return this.fullBounds; 
    },
    
    // innerBounds returns the bounds of this morph only, and in local coordinates
    innerBounds: function() { return this.shape.bounds() },

    cumulativeTransform: function() {
        return Transform.fromMatrix(this.canvas().getTransformToElement(this));
    },
    
    /** 
     * mapping coordinates in the hierarchy
     * @return [Point]
     */

    // map local point to world coordinates
    worldPoint: function(pt) { 
        return pt.matrixTransform(this.getTransformToElement(this.canvas())); 
    },

    // map owner point to local coordinates
    relativize: function(pt) { 
        if (!this.owner()) throw new Error('no owner; call me after adding to a morph? ' + this.inspect());
        return pt.matrixTransform(this.owner().getTransformToElement(this)); 
    },

    // map owner rectangle to local coordinates
    relativizeRect: function(r) { 
        return rect(this.relativize(r.topLeft()), this.relativize(r.bottomRight()));
    },
    
    // map world point to local coordinates
    localize: function(pt) {   
        return pt.matrixTransform(this.canvas().getTransformToElement(this));
    },
    
    // map local point to owner coordinates
    localizePointFrom: function(pt, otherMorph) {   
        return pt.matrixTransform(otherMorph.getTransformToElement(this));
    },

    transformForNewOwner: function(newOwner) {
        return Transform.fromMatrix(this.getTransformToElement(newOwner));
    },
    
    changed: function() {
        // (this.owner() || this).invalidRect(this.bounds());
    },

    layoutChanged: function() {
        // ???
        // if (!(this instanceof HandMorph) )
        // console.log('change of layout on ' + this.inspect());
        this.applyTransform(this.getTransform());
        this.fullBounds = null;
        // this.bounds(); 
        if (this.owner() && this.owner() !== this.world())     // May affect owner as well...
            this.owner().layoutChanged(); 
    },
    
    recordChange: function(fieldName/*:String*/) {  
        // Update sever or change log or something
        return;
        // consider relating to this.changed()
    },

    position: function() {
        return this.shape.bounds().topLeft().addPt(this.origin); 
    },
    
    setPosition: function(newPosition) {
        var delta = newPosition.subPt(this.position());
        this.translateBy(delta); 
    }
    
});

// Morph clipping functions
Object.extend(Morph.prototype, {

    clipToPath: function(path) {
        var clipPath = NodeFactory.create('clipPath');
        clipPath.appendChild(path);
        clipPath.setAttributeNS(null, "shape-rendering", "optimizeSpeed");
        var ref = this.assign('clipPath', clipPath);
        this.setAttributeNS(null, "clip-path", ref);
    },

    clipToShape: function() {
        this.clipToPath(this.shape.toPath());
    }
    
});

/**
 * @class Exporter: Implementation class for morph serialization
 */

var Exporter = Class.create();

Object.extend(Exporter.prototype, {
    rootMorph: null,
    
    initialize: function(rootMorph) {
        this.rootMorph = rootMorph;
    },
    
    serialize: function() {
        // model is inserted as part of the root morph.
        var modelNode = (this.rootMorph.getModel() || { toMarkup: function() { return null; }}).toMarkup();
        if (modelNode) {
            this.rootMorph.addChildElement(modelNode);
        }
        var result = new XMLSerializer().serializeToString(this.rootMorph);
        if (modelNode) {
            this.rootMorph.removeChild(modelNode);
        }
        return result;
    }

});

/**
 * @class Importer: Implementation class for morph de-serialization
 */

var Importer = Class.create();

Object.extend(Importer.prototype, {
    morphMap: null,
    
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

    importFromNode: function(node) {
        ///console.log('making morph from %s %s', node, node.getAttributeNS(Namespace.LIVELY, "type"));
        // call reflectively b/c 'this' is not a DisplayObject yet. 
        var morphTypeName = DisplayObject.prototype.getType.call(node); 
        //console.log('have morph %s', morphTypeName);

        if (!morphTypeName || !window[morphTypeName]) {
            throw new Error('node %1 (parent %2) cannot be a morph of %3'.format(node.tagName, node.parentNode, morphTypeName));
        }

        HostClass.becomeInstance(node, window[morphTypeName]);
        if (!node.reinitialize) {
            console.log('why no reinit in %s', new XMLSerializer().serializeToString(node)); 
        }

        node.reinitialize(this);
        return node; 
    },
    
    importFromString: function(string) {
        return this.importFromNode(this.parse(string), this);
    },

    parse: function(string) {
        var parser = new DOMParser();
        var xml = parser.parseFromString('<?xml version="1.0" standalone="no"?> ' + string, "text/xml");
        return document.adoptNode(xml.documentElement);
    },

    importModelFrom: function(ptree) {
        //console.log('restoring model from markup %s', string);
        //var ptree = this.parse(string);
        var model = new SimpleModel(null);
        
        for (var node = ptree.firstChild; node != null; node = node.nextSibling) {
            switch (node.tagName) {
            case "dependent":
                var oldId = node.getAttribute('ref');
                var dependent = this.lookupMorph(oldId);
                if (!dependent)  {
                    console.warn('dep %s not found', oldId);
                    continue; 
                }
                dependent.modelPlug.model = model;
                model.addDependent(dependent);
                break;
            case "variable":
                var name = node.getAttribute('name');
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

// SVG inspector for Morphs
Object.extend(Morph.prototype, {
    
    addSvgInspector: function() {
        var exporter = new Exporter(this);
        var xml = exporter.serialize();
        console.log('%s serialized to %s', this, xml);        
        
        const maxSize = 1500;
        var extent = pt(500, 300);
        var panel = PanelMorph(extent);
        var r = Rectangle(0, 0, extent.x, extent.y);
        var pane = panel.setNamedMorph("pane", TextPane(r, xml.truncate(maxSize)));
        var txtMorph = pane.innerMorph();
        txtMorph.xml = xml;
        this.world().addMorph(WindowMorph(panel, "XML dump", this.bounds().topLeft().addPt(pt(5,0))));
    }
    
});

// Morph convenience functions
Object.extend(Morph, {

    makeLine: function(verts, lineWidth, lineColor) {
        // make a line with its origin at the first vertex
	// Note this works for simple lines (2 vertices) and general polylines
        var line = Morph(verts[0].asRectangle(), "rect");
        var vertices = Shape.translateVerticesBy(verts, verts[0].negated());
        line.setShape(PolylineShape(vertices, lineWidth, lineColor));
        return line; 
    },

    makeCircle: function(location, radius, lineWidth, lineColor, fill) {
        // make a circle of the given radius with its origin at the center
        var circle = Morph(location.asRectangle().expandBy(radius), "ellipse")
	circle.setBorderWidth(lineWidth);
	circle.setBorderColor(lineColor);
	circle.setFill(fill);
	return circle; 
    },

    makePolygon: function(verts, lineWidth, lineColor, fill) {
        // make a polygon with its origin at the starting vertex
	poly = Morph(pt(0,0).asRectangle(), "rect");
        poly.setShape(PolygonShape(verts, fill, lineWidth, lineColor));
	return poly; 
    }
});

// Model-specific extensions to class Morph (see Model class definition below)
Object.extend(Morph.prototype, {

    connectModel: function(plugSpec) {
        // connector makes this view pluggable to different models, as in
        // {model: someModel, getList: "getItemList", setSelection: "chooseItem"}
        var newPlug = Model.makePlugNode(plugSpec);
        if (this.modelPlug) this.replaceChild(newPlug, this.modelPlug);
        else this.addChildElement(newPlug);
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
//        panel.addMorph(m = ListPane(Rectangle(200,0,200,150)));
//        m.connectModel({model: this, getList: "getMethodList", setSelection: "setMethodName"});
// The "plug" object passed to connectModel() points to the model, and converts from
// view-specific messages like getList() and setSelection() to model-specific messages
// like getMethodList() and setMethodName.  This allow a single model to have, eg,
// several list views, each viewing a different list aspect of the model.

// A number of morphs are used as views, or "widgets".  These include TextMorph,
// ListMorph, ButtonMorph, SliderMorph, etc.  Each of these morphs uses the above
// plug mechanism to get or set model values and to respond to model changes.
// these are documented in Morph.getModelValue, setModelValue, and updateView

Model = Class.create();

Object.extend(Model.prototype, {

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

Object.extend(Model, {
    makePlugNode: function(spec) {
        var node = NodeFactory.createNS(Namespace.LIVELY, "modelPlug");
        var props = Object.properties(spec);
        for (var i = 0; i < props.length; i++) {
            var prop = props[i];
            node[prop] = spec[prop];
            if (prop != 'model') {
                var acc = node.appendChild(NodeFactory.createNS(Namespace.LIVELY, "accessor"));
                acc.setAttributeNS(Namespace.LIVELY, "formal", prop);
                acc.setAttributeNS(Namespace.LIVELY, "actual", spec[prop]);
            }
        }
        node.inspect = function() {
            return new XMLSerializer().serializeToString(this);
        }
        return node;
    },

    becomePlugNode: function(node) {
        for (var acc = node.firstChild; acc != null;  acc = acc.nextSibling) {
            if (acc.tagName != 'accessor') continue;
            node[acc.getAttribute('formal')] = acc.getAttribute('actual');
        }
        node.inspect = function() {
            return new XMLSerializer().serializeToString(this);
        }
        return node;
    }
    
});

/**
 * @class SimpleModel
 */ 

SimpleModel = Class.extend(Model);

Object.category(SimpleModel.prototype,  "core", function() { 
    
    function getter(varName) {
        return "get" + varName;
    }
    
    function setter(varName) {
        return "set" + varName;
    }

    function escapeValue(value) {
        return value == null  ? "null" : "<![CDATA[%1]]>".format(Object.toJSON(value));
    }
    
    return {

        initialize: function(dep /*, variables... */) {
            SimpleModel.superClass.initialize.call(this, dep);
            var variables = $A(arguments);
            variables.shift();
            for (var i = 0; i < variables.length; i++) {
                this.addVariable(variables[i], null);
            }
        },

        addVariable: function(varName, initialValue) {
            // functional programming is fun!
            this[varName] = initialValue;
            this[getter(varName)] = function(name) { return function() { return this[name]; } } (varName); // let name = varName ()
            this[setter(varName)] = function(name) { return function(newValue, v) { this[name] = newValue; 
                                                     this.changed(getter(name), v); }} (varName);
        },

        makePlug: function() {
            var model = this;
            var spec = { };
            this.variables().forEach(function(v) { spec[getter(v)] = model[getter(v)]; spec[setter(v)] = model[setter(v)]; });
            spec.model = model;
            return Model.makePlugNode(spec);
        },

        variables: function() {
            return Object.properties(this).filter(function(name) { return name != 'dependents'});
        },

        toMarkup: function(doc) {
            if (!doc) doc = document;
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
            return modelEl;
        }
    }});

// Affine Transforms

// generalized 2D affine transformation matricies - kam
//      matrix values in column major order ignoring the bottom row (6 values total)
//      | 0 2 4 |
//      | 1 3 5 |
//      0 -> m11, 1 -> m21, 2 -> m12, 3 -> m22, 4-> tx, 5 -> ty
//      This is the PostScript convention

TransformationMatrix2D = Class.create();

Object.extend(TransformationMatrix2D, {
    create: function(matrixValues) {
        var n = new TransformationMatrix2D(matrixValues);
        return n;
    }
});

Object.extend(TransformationMatrix2D.prototype, {
    initialize: function(matrixValues) {
        if (!matrixValues) matrixValues = [1, 0, 0, 1, 0, 0];
        this.matrix = matrixValues;
    },

    transform: function(x, y) {
        var result = new Array(2);
        result[0] = x * this.matrix[0] + y * this.matrix[2] + this.matrix[4];
        result[1] = x * this.matrix[1] + y * this.matrix[3] + this.matrix[5];
        return result;
    },

    transformPoint: function(pt) {
        var p = new Point();
        r = this.transform(pt.x, pt.y);
        p.x = r[0];
        p.y = r[1];
        return p;
    },

    itransform: function(x, y) {
        var result = new Array(2);
        result[0] = (this.matrix[3] * x - this.matrix[3] * this.matrix[4]
             - this.matrix[2] * y + this.matrix[2] * this.matrix[5]) /
             (this.matrix[3] * this.matrix[0] - this.matrix[2] * this.matrix[1]);
        result[1] = (this.matrix[1] * x - this.matrix[1] * this.matrix[4]
             - this.matrix[0] * y + this.matrix[0] * this.matrix[5]) /
             (this.matrix[1] * this.matrix[2] - this.matrix[0] * this.matrix[3]);
        return result;
    },

    transformArray: function(pt) {
        return this.transform(pt[0], pt[1]);
    },

    itransformArray: function(pt) {
        return this.itransform(pt[0], pt[1]);
    },

    concatenate: function(mtx) {
        var newMatrix = Array(6);
        newMatrix[0] = mtx.matrix[0] * this.matrix[0] + mtx.matrix[2] * this.matrix[1];
        newMatrix[2] = mtx.matrix[0] * this.matrix[2] + mtx.matrix[2] * this.matrix[3];
        newMatrix[4] = mtx.matrix[0] * this.matrix[4] + mtx.matrix[2] * this.matrix[5] + mtx.matrix[4];
        newMatrix[1] = mtx.matrix[1] * this.matrix[0] + mtx.matrix[3] * this.matrix[1];
        newMatrix[3] = mtx.matrix[1] * this.matrix[2] + mtx.matrix[3] * this.matrix[3];
        newMatrix[5] = mtx.matrix[1] * this.matrix[4] + mtx.matrix[3] * this.matrix[5] + mtx.matrix[5];
        return TransformationMatrix2D.create(newMatrix);
    },

    identity: function() {
        return TransformationMatrix2D.create(Array(1, 0, 0, 1, 0, 0));
    },

    set: function(tmtx) {
        this.matrix = tmtx.matrix;
    },

    setValues: function(matrixValues) {
        this.matrix = matrixValues;
    },

    translate: function(x, y) {
        var tmtx = TransformationMatrix2D.create(new Array(1, 0, 0, 1, x, y));
        return this.concatenate(tmtx);
    },

    rotateRad: function(rad) {
        var tmtx = TransformationMatrix2D.create(new Array(
                       Math.cos(rad), Math.sin(rad),
                       -Math.sin(rad), Math.cos(rad), 0, 0));
        return this.concatenate(tmtx);
    },

    rotate: function(deg) {
        return this.rotateRad(Math.PI * deg/180);
    },

    scale: function(x, y) {
        var tmtx = TransformationMatrix2D.create(new Array(x, 0, 0, y, 0, 0));
        return this.concatenate(tmtx);
    },

    shear: function(x, y) {
        var tmtx = TransformationMatrix2D.create(new Array(1, y, x, 1, 0, 0));
        return this.concatenate(tmtx);
    },

    findTMFromPoints: function(x1, y1, x2, y2, x3, y3, xo1, yo1, xo2, yo2, xo3, yo3) {
        var a, b, c, d, e, f;

        b = ((x2 - x1) * (x3 * xo2 - x2 * xo3) - (x3 - x2) * (x2 * xo1 - x1 * xo2)) /
            ((x2 - x1) * (x3 * y2  - x2 * y3)  - (x3 - x2) * (x2 * y1  - x1 * y2));
        e = ((x3 * xo2 - x2 * xo3) * (y1 * x2 - y2 * x1) - (x2 * xo1 - x1 * xo2) * (y2 * x3 - y3 * x2)) /
            ((x3 - x2) * (y1 * x2 - y2 * x1) - (x2 - x1) * (y2 * x3 - y3 * x2));
        d = ((x2 - x1) * (x3 * yo2 - x2 * yo3) - (x3 - x2) * (x2 * yo1 - x1 * yo2)) /
            ((x2 - x1) * (x3 * y2  - x2 * y3)  - (x3 - x2) * (x2 * y1  - x1 * y2));
        f = ((x3 * yo2 - x2 * yo3) * (y1 * x2 - y2 * x1) - (x2 * yo1 - x1 * yo2) * (y2 * x3 - y3 * x2)) /
            ((x3 - x2) * (y1 * x2 - y2 * x1) - (x2 - x1) * (y2 * x3 - y3 * x2));

        if (Math.abs(x1) <= 1e-6) {
            if (Math.abs(x2) <= 1e-6) {
                a = (xo3 - b * y3 - e) / x3;
                c = (yo3 - d * y3 - f) / x3;
            } else {
                a = (xo2 - b * y2 - e) / x2;
                c = (yo2 - d * y2 - f) / x2;
            }
        } else {
            a = (xo1 - b * y1 - e) / x1;
            c = (yo1 - d * y1 - f) / x1;
        }

        return TransformationMatrix2D.create(new Array(a, c, b, d, e, f));
    }
});

// generalized 3D affine transformation matricies - kam
//        matrix values in column major order ignoring the bottom row (12 values total)
//        | 0 3 6 9  |
//        | 1 4 7 10 |
//        | 2 5 8 11 |
//        0 -> m11, 1 -> m21, 2 -> m31
//        3 -> m12, 4 -> m12, 5 -> m13
//        6 -> m13, 7 -> m23, 8 -> m33
//        9 -> tx,  10 -> ty, 11 -> tz
//

TransformationMatrix3D = Class.create();

Object.extend(TransformationMatrix3D, {
    create: function(matrixValues) {
        var n = new TransformationMatrix3D(matrixValues);
        return n;
    }
});

Object.extend(TransformationMatrix3D.prototype, {
    initialize: function(matrixValues) {
        if (!matrixValues) matrixValues = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
        this.matrix = matrixValues;
    },

    transform: function(x, y, z) {
        var result = new Array(3);
        result[0] = x * this.matrix[0] + y * this.matrix[3] + z * this.matrix[6] + this.matrix[9];
        result[1] = x * this.matrix[1] + y * this.matrix[4] + z * this.matrix[7] + this.matrix[10];
        result[2] = x * this.matrix[2] + y * this.matrix[5] + z * this.matrix[8] + this.matrix[11];
        return result;
    },

    transformArray: function(pt) {
        return this.transform(pt[0], pt[1], pt[2]);
    },

    concatenate: function(mtx) {
        var newMatrix = Array(12);
        newMatrix[0]  = mtx.matrix[0] * this.matrix[0] + mtx.matrix[3] * this.matrix[1] + mtx.matrix[6] * this.matrix[2];
        newMatrix[3]  = mtx.matrix[0] * this.matrix[3] + mtx.matrix[3] * this.matrix[4] + mtx.matrix[6] * this.matrix[5];
        newMatrix[6]  = mtx.matrix[0] * this.matrix[6] + mtx.matrix[3] * this.matrix[7] + mtx.matrix[6] * this.matrix[8];
        newMatrix[9]  = mtx.matrix[0] * this.matrix[9] + mtx.matrix[3] * this.matrix[10] + mtx.matrix[6] * this.matrix[11] + mtx.matrix[9];

        newMatrix[1]  = mtx.matrix[1] * this.matrix[0] + mtx.matrix[4] * this.matrix[1] + mtx.matrix[7] * this.matrix[2];
        newMatrix[4]  = mtx.matrix[1] * this.matrix[3] + mtx.matrix[4] * this.matrix[4] + mtx.matrix[7] * this.matrix[5];
        newMatrix[7]  = mtx.matrix[1] * this.matrix[6] + mtx.matrix[4] * this.matrix[7] + mtx.matrix[7] * this.matrix[8];
        newMatrix[10] = mtx.matrix[1] * this.matrix[9] + mtx.matrix[4] * this.matrix[10] + mtx.matrix[7] * this.matrix[11] + mtx.matrix[10];

        newMatrix[2]  = mtx.matrix[2] * this.matrix[0] + mtx.matrix[5] * this.matrix[1] + mtx.matrix[8] * this.matrix[2];
        newMatrix[5]  = mtx.matrix[2] * this.matrix[3] + mtx.matrix[5] * this.matrix[4] + mtx.matrix[8] * this.matrix[5];
        newMatrix[8]  = mtx.matrix[2] * this.matrix[6] + mtx.matrix[5] * this.matrix[7] + mtx.matrix[8] * this.matrix[8];
        newMatrix[11] = mtx.matrix[2] * this.matrix[9] + mtx.matrix[5] * this.matrix[10] + mtx.matrix[8] * this.matrix[11] + mtx.matrix[11];
    
        return TransformationMatrix3D.create(newMatrix);
    },

    identity: function() {
        return TransformationMatrix3D.create(Array(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0));
    },

    set: function(tmtx) {
        this.matrix = tmtx.matrix;
    },

    setValues: function(matrixValues) {
        this.matrix = matrixValues;
    },

    translate: function(x, y, z) {
        var tmtx = TransformationMatrix3D.create(new Array(1, 0, 0, 0, 1, 0, 0, 0, 1, x, y, z));
        return this.concatenate(tmtx);
    },

    rotateRadX: function(rad) {
        var tmtx = TransformationMatrix3D.create(new Array(1, 0, 0,
                       0, Math.cos(rad), Math.sin(rad),
                       0,-Math.sin(rad), Math.cos(rad),
                       0, 0, 0));
        return this.concatenate(tmtx);
    },

    rotateX: function(deg) {
        return this.rotateRadX(Math.PI * deg/180);
    },

    rotateRadY: function(rad) {
        var tmtx = TransformationMatrix3D.create(new Array(Math.cos(rad), 0, -Math.sin(rad),
                       0, 1, 0,
                       Math.sin(rad), 0, Math.cos(rad),
                       0, 0, 0));
        return this.concatenate(tmtx);
    },

    rotateY: function(deg) {
        return this.rotateRadY(Math.PI * deg/180);
    },

    rotateRadZ: function(rad) {
        var tmtx = TransformationMatrix3D.create(new Array(Math.cos(rad), Math.sin(rad), 0,
                       -Math.sin(rad), Math.cos(rad), 0,
                       0, 0, 1,
                       0, 0, 0));
        return this.concatenate(tmtx);
    },

    rotateZ: function(deg) {
        return this.rotateRadZ(Math.PI * deg/180);
    },

    scale: function(x, y, z) {
        var tmtx = TransformationMatrix3D.create(new Array(x, 0, 0, 0, y, 0, 0, 0, z, 0, 0, 0));
        return this.concatenate(tmtx);
    },

    perspectiveMultiply: function(u, v, fb1, fb2) {
        var result = Array(16);

        result[0]  = u * this.matrix[0];
        result[4]  = u * this.matrix[1];
        result[8]  = u * this.matrix[6];
        result[12] = u * this.matrix[9];
      
        result[1]  = v * this.matrix[1];
        result[5]  = v * this.matrix[4];
        result[9]  = v * this.matrix[7];
        result[13] = v * this.matrix[10];

        result[2]  = fb1 * this.matrix[2];
        result[6]  = fb1 * this.matrix[5];
        result[10] = fb1 * this.matrix[8];
        result[14] = fb1 * this.matrix[11] + fb2;

        result[3]  = this.matrix[2];
        result[7]  = this.matrix[5];
        result[11] = this.matrix[8];
        result[15] = this.matrix[11];
    },

    perspectivePointMultiply: function(x, y, z, perspective) {
        var rMtx = Array(4);
        var result = Array(2);

        rMtx[0] = perspective[0] * x + perspective[4] * y + perspective[8]  * z + perspective[12];
        rMtx[1] = perspective[1] * x + perspective[5] * y + perspective[9]  * z + perspective[13];
        // rMtx[2] is typically unused - kam
        //rMtx[2] = perspective[2] * x + perspective[6] * y + perspective[10] * z + perspective[14];
        rMtx[3] = perspective[3] * x + perspective[7] * y + perspective[11] * z + perspective[15];
        result[0] = rMtx[0] / rMtx[3];
        result[1] = rMtx[1] / rMtx[3];
        // debug matrix values - kam
        //result[2] = rMtx[0]; result[3] = rMtx[1]; result[4] = rMtx[3];
        return result;
    },

    perspectiveMatrix: function(u, v, fb1, fb2) {
        var perspective = Array(16);

        for (var i = 1; i < 16; i++) perspective[i] = 0;
        perspective[0] = u;
        perspective[5] = v;
        perspective[10] = fb1;
        perspective[11] = 1;
        perspective[14] = fb2;
        return perspective;
    },

    perspectiveTransform: function(uAngle, vAngle, f, b, x, y, z) {
        var perspectiveMatrix;
      
        perspectiveMatrix = this.perspectiveMatrix(
                                1/Math.tan(Math.PI * uAngle / 180), 
                                1/Math.tan(Math.PI * vAngle / 180),
                                (b + f)/(b - f), 
                                -2 * b * f / (b - f));
        return this.perspectivePointMultiply(x, y, z, perspectiveMatrix);
    }
});

// A matrix stack for affine transform composition - kam
// Designed to be used with TransformationMatrix2D or TransformationMatrix3D

TransformationMatrixStack = Class.create();

Object.extend(TransformationMatrixStack, {
    create: function(tm) {
        var n = new TransformationMatrixStack(tm);

        n.tmPrototype = tm;
        n.clear();
        return n;
    }
});

Object.extend(TransformationMatrixStack.prototype, {
    initialize: function(tm) {
        this.tmPrototype = tm;
        this.clear();
    },

    clear: function() {
        var x = this.tmPrototype; // XXX
        this.stack = Array(1); 
        this.ctm = this.stack[0] = this.tmPrototype.identity();
        this.ctmDirty = false;
    },

    getCTM: function() {
        if (this.ctmDirty) this.recomposeCTM();
        return this.ctm;
    },

    push: function(tm) {
        if (this.ctmDirty) this.recomposeCTM();
        this.stack.push(tm);
        this.ctm = this.ctm.concatenate(tm);
        return this.ctm;
    },

    pop: function() {
        if (this.stack.length > 1) {
            this.stack.pop();
            this.ctmDirty = true;
        }
    },

    recomposeCTM: function() {
        this.ctm = this.tmPrototype.identity();
        for (i = 0; i < this.stack.length; i++) {
            this.ctm = this.ctm.concatenate(this.stack[i]);
        }
        this.ctmDirty = false;
    }
});

// Add Affines to Morph

Object.extend(Morph.prototype, {
    setAffineTransformFromRects: function(localRect, warpedRect) {
        this.myAffineTransformStack = TransformationMatrixStack.create(new TransformationMatrix2D());
        this.myAffineTransformStack.push(this.myAffineTransformStack.getCTM().findTMFromPoints(
        localRect.topLeft().x, localRect.topLeft().y,
        localRect.topRight().x, localRect.topRight().y,
        localRect.bottomRight().x, localRect.bottomRight().y,
        warpedRect.topLeft().x, warpedRect.topLeft().y,
        warpedRect.topRight().x, warpedRect.topRight().y,
        warpedRect.bottomRight().x, warpedRect.bottomRight().y));
    },

    getAffineTransformStack: function() {
        return this.myAffineTransformStack;
    },

    // shortcut - kam
    affineTransformPoint: function(pt) {
        if (this.myAffineTransformStack) {
            return this.myAffineTransformStack.getCTM().transformPoint(pt);
        } else {
            return pt;
        }
    }

});

console.log('loaded Core.js');

