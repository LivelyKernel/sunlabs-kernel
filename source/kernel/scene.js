/*
 * Copyright ï¿½ 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

// ===========================================================================
// Graphics primitives (SVG specific, browser-independent)
// ===========================================================================


namespace('lively.data');

Object.subclass('lively.data.Wrapper', {
    documentation: "A wrapper around a native object, stored as rawNode",

    rawNode: null,

    deserialize: function(importer, rawNode) {
	this.rawNode = rawNode;
	var id = rawNode.getAttribute("id");
	if (id) importer.addMapping(id, this); 
    },

    copyFrom: function(copier, other) {
	if (other.rawNode) this.rawNode = other.rawNode.cloneNode(true);
    },

    copy: function(copier) {
	var myClass = Class.forName(this.getType());
	return new myClass(copier || Copier.marker, this);
    },

    getType: function() {
	var ctor = this.constructor.getOriginal();
	if (ctor.type) return ctor.type;
	console.log("no type for " + ctor);
	lively.lang.Execution.showStack();
	return null;
    },

    newId: (function() { 
	var wrapperCounter = 0;
	return function() {
	    return ++ wrapperCounter;
	}
    })(),

    id: function() {
	dbgOn(!this.rawNode);
	return this.rawNode.getAttribute("id");
    },
    
    setId: function(value) {
	var prev = this.id();
	// easy parsing if value is an int, just call parseInt()
	this.rawNode.setAttribute("id", value + ":" + this.getType()); // this may happen automatically anyway by setting the id property
	return prev;
    },

    setDerivedId: function(origin) {
	this.setId(origin.id().split(':')[0]);
	return this;
    },

    removeRawNode: function() {
	var parent = this.rawNode && this.rawNode.parentNode;
	return parent && parent.removeChild(this.rawNode);
    },

    replaceRawNodeChildren: function(replacement) {
	while (this.rawNode.firstChild) this.rawNode.removeChild(this.rawNode.firstChild);
	if (replacement) this.rawNode.appendChild(replacement);
    },

    toString: function() {
	try {
	    return "#<" + this.getType() +  ":" + this.rawNode + ">";
	} catch (err) {
	    return "#<toString error: " + err + ">";
	}
    },

    inspect: function() {
	try {
	    return this.toString() + "[" + this.toMarkupString() + "]";
	} catch (err) {
	    return "#<inspect error: " + err + ">";
	}
    },

    toMarkupString: function() {
	// note forward reference
	return Exporter.stringify(this.rawNode);
    },

    uri: function() {
	return lively.FragmentURI.fromString(this.id());
    },
    
    // convenience attribute access
    getLivelyTrait: function(name) {
	return this.rawNode.getAttributeNS(Namespace.LIVELY, name);
    },

    // convenience attribute access
    setLivelyTrait: function(name, value) {
	return this.rawNode.setAttributeNS(Namespace.LIVELY, name, value);
    },

    // convenience attribute access
    removeLivelyTrait: function(name) {
	return this.rawNode.removeAttributeNS(Namespace.LIVELY, name);
    },
    
    getLengthTrait: function(name) {
	return lively.Length.parse(this.rawNode.getAttributeNS(null, name));
    },

    setLengthTrait: function(name, value) {
	this.setTrait(name, value);
    },

    getTrait: function(name) {
	return this.rawNode.getAttributeNS(null, name);
    },

    setTrait: function(name, value) {
	return this.rawNode.setAttributeNS(null, name, String(value));
    },
    
    removeTrait: function(name) {
	return this.rawNode.removeAttributeNS(null, name);
    },

    prepareForSerialization: function(extraNodes) {
	for (var prop in this) {
	    if (!this.hasOwnProperty(prop)) continue;
            if (prop === 'rawNode') continue;
	    var m = this[prop];
	    if (m === this.constructor.prototype[prop])  // save space
		continue;
	    this.preparePropertyForSerialization(prop, m, extraNodes);
	}
    },

    preparePropertyForSerialization: function(prop, propValue, extraNodes) {
	var self = this;
	function appendNode(node) {
	    try {
		extraNodes.push(self.rawNode.appendChild(node));
	    } catch (er) { throw er;}
	    extraNodes.push(self.rawNode.appendChild(NodeFactory.createNL()));
	}

	if (propValue instanceof Function) {
	    return;
	} else if (lively.data.Wrapper.isInstance(propValue)) { 
	    if (prop === 'owner') 
		return; // we'll deal manually
	    if (propValue instanceof lively.paint.Gradient || propValue instanceof lively.scene.Clip || propValue instanceof lively.scene.Image) 
		return; // these should sit in defs and be handled by restoreDefs()
	    //console.log("serializing field name='%s', ref='%s'", prop, m.id(), m.getType());
	    if (!propValue.rawNode) {
		console.log("wha', no raw node on " + propValue);
	    } else if (propValue.id() != null) {
		var desc = LivelyNS.create("field", {name: prop, ref: propValue.id()});
		appendNode(desc);
		if (prop === "ownerWidget") {
		    console.log('recursing for field ' + prop);
		    propValue.prepareForSerialization(extraNodes);
		    appendNode(propValue.rawNode);
		}
	    }
	} else if (propValue instanceof Relay) {
	    var delegate = propValue.delegate;
	    if (lively.data.Wrapper.isInstance(delegate)) { // FIXME: better instanceof
		var desc = LivelyNS.create("relay", {name: prop, ref: delegate.id()});
		Properties.forEachOwn(propValue.definition, function(key, value) {
		    var binding = desc.appendChild(LivelyNS.create("binding"));
		    binding.setAttributeNS(null, "formal", key);
		    binding.setAttributeNS(null, "actual", value);
		});
		appendNode(desc);
	    } else {
		console.warn('unexpected: '+ propValue + 's delegate is ' + delegate);
	    }
	} else if (propValue instanceof Array) {
	    if (prop === 'submorphs')
		return;  // we'll deal manually
	    var arr = LivelyNS.create("array", {name: prop});
	    var abort = false;
	    propValue.forEach(function iter(elt) {
		if (elt && !lively.data.Wrapper.isInstance(elt)) { // FIXME what if Wrapper is a mixin?
		    abort = true;
		    return;
		}
		// if item empty, don't set the ref field
		var item =  (elt && elt.id()) ? LivelyNS.create("item", {ref: elt.id()}) : LivelyNS.create("item"); 
		extraNodes.push(arr.appendChild(item));
		extraNodes.push(arr.appendChild(NodeFactory.createNL()));
	    }, this);
	    if (!abort) { 
		appendNode(arr);
	    }
	} else if (prop === 'rawNode' || prop === 'defs') { // necessary because nodes get serialized
	    return;
	} else {
	    var node = Converter.encodeProperty(prop, propValue);
	    node && appendNode(node);
	}
    }
});

Object.extend(lively.data.Wrapper, {
    getEncodedType: function(node) { // this should be merged with getType
	var id = node.getAttribute("id");
	return id && id.split(":")[1];
    },

    isInstance: function(m) {
	return m instanceof lively.data.Wrapper || m instanceof lively.data.DOMRecord;
    }

});


using(namespace('lively.scene'), lively.data.Wrapper).run(function(unused, Wrapper) {

Wrapper.subclass('lively.scene.Node');
	
this.Node.addProperties({ 
    FillOpacity: { name: "fill-opacity", from: Number, to: String, byDefault: 1.0},
    StrokeOpacity: { name: "stroke-opacity", from: Number, to: String, byDefault: 1.0},
    StrokeWidth: { name: "stroke-width", from: Number, to: String, byDefault: 1.0},
    Stroke: { name: "stroke", byDefault: "none"}, // FIXME byDefault should be in JS not DOM type
    Fill: { name: "fill", byDefault: "none"}, // FIXME byDefault should be in JS not DOM type
    LineJoin: {name: "stroke-linejoin"},
    LineCap: {name: "stroke-linecap"},
    StrokeDashArray: {name: "stroke-dasharray"},
    StyleClass: {name: "class"}
}, Config.useStyling ? lively.data.StyleRecord : lively.data.DOMRecord);

this.Node.addMethods({   

    documentation:  "Objects that can be located on the screen",
    //In this particular implementation, graphics primitives are
    //mapped onto various SVG objects and attributes.

    rawNode: null, // set by subclasses

    setBounds: function(bounds) { 
	throw new Error('setBounds unsupported on type ' + this.getType());
    },

    canvas: function() {
	if (!UserAgent.usableOwnerSVGElement) {
	    // so much for multiple worlds on one page
	    return Global.document.getElementById("canvas");
	} else {
	    return (this.rawNode && this.rawNode.ownerSVGElement) || Global.document.getElementById("canvas");
	}
    },
    
    nativeContainsWorldPoint: function(p) {
	var r = this.canvas().createSVGRect();
	r.x = p.x;
	r.y = p.y;
	r.width = r.height = 0;
	return this.canvas().checkIntersection(this.rawNode, rect);
    },

    setVisible: function(flag) {
	if (flag) this.rawNode.removeAttributeNS(null, "display");
	else this.rawNode.setAttributeNS(null, "display", "none");
	return this;
    },

    isVisible: function() {
	// Note: this may not be correct in general in SVG due to inheritance,
	// but should work in LIVELY.
	var hidden = this.rawNode.getAttributeNS(null, "display") == "none";
	return hidden == false;
    },

    applyFilter: function(filterUri) {
	if (filterUri) 
	    this.rawNode.setAttributeNS(null, "filter", filterUri);
	else
	    this.rawNode.removeAttributeNS(null, "filter");
    },

    getBaseTransform: function() {
	return this.rawNode.transform.baseVal;
    }

});

this.Node.subclass('lively.scene.Group', {
    documentation: 'Grouping of scene objects',
    initialize: function() {
	this.rawNode = NodeFactory.create("g");
    }
});


// ===========================================================================
// Shape functionality
// ===========================================================================

// Shapes are portable graphics structures that are used for isolating
// the implementation details of the underlying graphics architecture from
// the programmer.  Each Morph in our system has an underlying Shape object
// that maps the behavior of the Morph to the underlying graphics system
// in a fully portable fashion.


this.Node.subclass('lively.scene.Shape', {

    shouldIgnorePointerEvents: false,
    controlPointProximity: 10,
    hasElbowProtrusions: false,

    toString: function() {
	return Strings.format("a Shape(%s,%s)", this.getType(), this.bounds());
    },

    initialize: function(fill, strokeWidth, stroke) {

	if (this.shouldIgnorePointerEvents)
	    this.ignoreEvents();

	if (fill !== undefined)
	    this.setFill(fill && fill.toString());

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
    

Object.extend(this,  { 

    LineJoins: Class.makeEnum(["Miter", "Round", "Bevel" ]), // note that values become attribute values
    LineCaps:  Class.makeEnum(["Butt",  "Round", "Square"])  // likewise
    
});


this.Shape.subclass('lively.scene.Rectangle', {

    documentation: "Rectangle shape",

    initialize: function($super, rect, color, borderWidth, borderColor) {
	this.rawNode = NodeFactory.create("rect");
	this.setBounds(rect);
	$super(color, borderWidth, borderColor);
	return this;
    },

    setBounds: function(r) {
	this.setLengthTrait("x", r.x);
	this.setLengthTrait("y", r.y);
	this.setLengthTrait("width", Math.max(0, r.width));
	this.setLengthTrait("height", Math.max(0, r.height));
	return this;
    },

    toPath: function() {
	// FIXME account for rounded edges
	return new lively.scene.Path(this.bounds());
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
	return bnds.partNameNear(Rectangle.corners, p, this.controlPointProximity);
    },

    possibleHandleForControlPoint: function(targetMorph,mousePoint,hand) {
	var partName = this.controlPointNear(mousePoint);
	if (partName == null) 
	    return null;
	var loc = this.bounds().partNamed(partName);
	return new HandleMorph(loc, "rect", hand, targetMorph, partName); 
    },

    getBorderRadius: function() {
	return this.getLengthTrait("rx") || 0;
    },

    roundEdgesBy: function(r) {
	if (r) {
	    this.setLengthTrait("rx", r);
	    this.setLengthTrait("ry", r);
	    this.setStrokeWidth(this.getStrokeWidth());  // DI:  This is here only to force an update on screen
	}
	return this;
    }

});

this.Shape.subclass('lively.scene.Ellipse', {

    documentation: "Ellipses and circles",

    initialize: function($super, rect, color, borderWidth, borderColor) {
	this.rawNode = NodeFactory.create("ellipse");
	this.setBounds(rect);
	$super(color, borderWidth, borderColor);
    },

    setBounds: function(r) {
	this.setLengthTrait("cx", r.x + r.width/2);
	this.setLengthTrait("cy", r.y + r.height/2);
	this.setLengthTrait("rx", r.width/2);
	this.setLengthTrait("ry", r.height/2);
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
	var w = this.rawNode.rx.baseVal.value * 2;
	var h = this.rawNode.ry.baseVal.value * 2; 
	var x = this.rawNode.cx.baseVal.value - this.rawNode.rx.baseVal.value;
	var y = this.rawNode.cy.baseVal.value - this.rawNode.ry.baseVal.value;
	return new Rectangle(x, y, w, h);
    }, 

    controlPointNear: function(p) {
	var bnds = this.bounds();
	return bnds.partNameNear(Rectangle.sides, p, this.controlPointProximity);
    },

    reshape: this.Rectangle.prototype.reshape,

    possibleHandleForControlPoint: this.Rectangle.prototype.possibleHandleForControlPoint

});

this.Shape.subclass('lively.scene.Polygon', {
    documentation: "polygon",

    hasElbowProtrusions: true,
    useDOM: false,

    initialize: function($super, vertlist, color, borderWidth, borderColor) {
	this.rawNode = NodeFactory.create("polygon");
	this.setVertices(vertlist);
	$super(color, borderWidth, borderColor);
	return this;
    },

    setVertices: function(vertlist) {
	if (this.rawNode.points) {
	    this.rawNode.points.clear();
	}
	if (this.useDOM) vertlist.forEach(function(p) { this.rawNode.points.appendItem(p) }, this);
	else this.rawNode.setAttributeNS(null, "points",
					 vertlist.map(function (p) { return (p.x||0.0) + "," + (p.y||0.0) }).join(' '));
    },

    vertices: function() {
	var array = [];
	for (var i = 0; i < this.rawNode.points.numberOfItems; i++) {
	    var item = this.rawNode.points.getItem(i);
	    array.push(Point.ensure(item));
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
		       "lively.scene.Polygon.bounds: vertices has zero length, " + this.rawNode.points 
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
	    if (verts[i].dist(p) < this.controlPointProximity) 
		return i; 
	}

	for (var i = 0; i < verts.length - 1; i++) { // midpoints (for add vertex) return - index
	    if (verts[i].midPt(verts[i + 1]).dist(p) < this.controlPointProximity) 
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

lively.scene.Shape.subclass('lively.scene.Polyline', {
    documentation: "Like polygon but not necessarily closed and does not include the interior",
    
    hasElbowProtrusions: true,

    initialize: function($super, vertlist, borderWidth, borderColor) {
	this.rawNode = NodeFactory.create("polyline");
	this.setVertices(vertlist);
	$super(null, borderWidth, borderColor);
    },

    containsPoint: function(p) {
	var howNear = 6;
	var vertices = this.vertices();
	for (var i = 1; i < vertices.length; i++) {
	    var pNear = p.nearestPointOnLineBetween(vertices[i-1], vertices[i]);
	    if (pNear.dist(p) < howNear) {
		return true; 
	    }
	}
	return false; 
    },

    // poorman's traits :)
    bounds: this.Polygon.prototype.bounds,
    vertices: this.Polygon.prototype.vertices,
    setVertices: this.Polygon.prototype.setVertices,
    reshape: this.Polygon.prototype.reshape,
    controlPointNear: this.Polygon.prototype.controlPointNear,
    possibleHandleForControlPoint: this.Polygon.prototype.possibleHandleForControlPoint

});

this.Shape.subclass('lively.scene.Path', {
    documentation: "Generic Path with arbitrary Bezier curves",

    hasElbowProtrusions: true,

    initialize: function($super, vertlistOrRect, color, borderWidth, borderColor) {
	this.rawNode = NodeFactory.create("path");
	$super(color, borderWidth, borderColor);
	if (vertlistOrRect instanceof Rectangle) {
	    var r = vertlistOrRect;
	    this.moveTo(r.x, r.y);
	    this.lineTo(r.x + r.width, r.y); 
	    this.lineTo(r.x + r.width, r.y + r.height);
	    this.lineTo(r.x, r.y + r.height);
	    this.close(); 
	} else this.setVertices(vertlistOrRect || []);
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
	//console.log("d=" + d);
	if (d.length > 0)
	    this.rawNode.setAttributeNS(null, "d", d);
    },
    
    verticesFromSVG: function() {
        var d = this.rawNode.getAttribute('d');
        var pointSpecs = $A(d).inject([], function(all, ea) {
            if (ea === 'M' || ea === 'T') { // FIXME support other vertice types and use them for points
                all.push({type: ea, x: ''});
            } else if (ea === ',') {
                all.last().y = '';
            } else {
                all.last().y === undefined ? all.last().x += ea : all.last().y += ea;
            };
            return all;
        });
        var points = pointSpecs.map(function(ea) {
            return pt(Number(ea.x), Number(ea.y));
        });
        return points;
    },

    vertices: function() {
        return this.verticesFromSVG();
    },

    moveTo: function(x, y) {
	this.rawNode.pathSegList.appendItem(this.rawNode.createSVGPathSegMovetoAbs(x, y));
    },

    arcTo: function(x, y, r) {
	this.rawNode.pathSegList.appendItem(this.rawNode.createSVGPathSegArcAbs(x, y, r));
    },

    lineTo: function(x, y) {
	this.rawNode.pathSegList.appendItem(this.rawNode.createSVGPathSegLinetoAbs(x, y));
    },

    close: function() {
	this.rawNode.pathSegList.appendItem(this.rawNode.createSVGPathSegClosePath());
    },
    
    containsPoint: function(p) {
	if (UserAgent.webKitVersion >= 525)
	    return Rectangle.unionPts(this.vertices()).containsPoint(p);
	else return this.nativeContainsWorldPoint(p);
    },

    bounds: function() {
	try {
	    var r = this.rawNode.getBBox();
	    // check the coordinates!
	    return new Rectangle(r.x, r.y, r.width, r.height);
	} catch (er) {
	    var u = Rectangle.unionPts(this.vertices());
	    return u;
	}
    },

    setBounds: function(bounds) { 
	console.log('setBounds unsupported on type ' + this.getType());
    },
    
    // poorman's traits :)
    controlPointNear: this.Polygon.prototype.controlPointNear,
    possibleHandleForControlPoint: this.Polygon.prototype.possibleHandleForControlPoint,
    reshape: this.Polygon.prototype.reshape,
    controlPointNear: this.Polygon.prototype.controlPointNear

});


this.Node.subclass('lively.scene.Image', {
    description: "Primitive wrapper around images",
    
    initialize: function(url, width, height) {
	if (!url) return;
	var node;
	if (url.startsWith('#'))
	    this.loadUse(url);
	else
	    this.loadImage(url, width, height);
    },
    
    deserialize: function($super, importer, rawNode) {
	if (rawNode.namespaceURI != Namespace.SVG) {
            // this brittle and annoying piece of code is a workaround around the likely brokenness
            // of Safari's XMLSerializer's handling of namespaces
            var href = rawNode.getAttributeNS(null /* "xlink"*/, "href");
	    if (href)
		if (href.startsWith("#")) {
		    // not clear what to do, use target may or may not be in the target document
		    this.loadUse(href);
		} else {
		    this.loadImage(href);
		}
	} else {
	    $super(importer, rawNode);
	}
    },

    getWidth: function(optArg) {
	return lively.Length.parse((optArg || this.rawNode).getAttributeNS(null, "width"));
    },

    getHeight: function(optArg) {
	return lively.Length.parse((optArg || this.rawNode).getAttributeNS(null, "height"));
    },

    reload: function() {
	if (this.rawNode.localName == "image")  {
	    XLinkNS.setHref(this.rawNode, this.getURL() + "?" + new Date());
	}
    },

    getURL: function() {
	return XLinkNS.getHref(this.rawNode);
    },

    scaleBy: function(factor) {
	new Similitude(pt(0, 0), 0, factor).applyTo(this);
    },

    loadUse: function(url) {
	if (this.rawNode && this.rawNode.localName == "use") {
	    XLinkNS.setHref(this.rawNode, url);
	    return null; // no new node;
	} else {
	    this.removeRawNode();
	    this.rawNode = NodeFactory.create("use");
	    XLinkNS.setHref(this.rawNode, url);
	    return this.rawNode;
	}
    },

    loadImage: function(href, width, height) {
	if (this.rawNode && this.rawNode.localName == "image") {
	    XLinkNS.setHref(this.rawNode, href);
	    return null;
	} else {
	    var useDesperateSerializationHack = true;
	    if (useDesperateSerializationHack) {
		width = width || this.getWidth();
		height = height || this.getHeight();
		
		// this desperate measure appears to be necessary to work
		// around Safari's serialization issues.  Note that
		// somehow this code has to be used both for normal
		// loading and loading at deserialization time, otherwise
		// it'll fail at deserialization
		var xml = Strings.format('<image xmlns="http://www.w3.org/2000/svg" ' 
		    + 'xmlns:xlink="http://www.w3.org/1999/xlink" ' 
		    + ' width="%s" height="%s" xlink:href="%s"/>', width, height, href);
		
		this.rawNode = new Importer().parse(xml);
	    } else {
		
		// this should work but doesn't:
		
		this.rawNode = NodeFactory.createNS(Namespace.SVG, "image");
		this.rawNode.setAttribute("width", width);
		this.rawNode.setAttribute("height", height);
		XLinkNS.setHref(this.rawNode, href);
	    }
	    return this.rawNode;
	}
    }
});


Wrapper.subclass('lively.scene.Clip', {
    initialize: function(shape) {
	this.rawNode = NodeFactory.create('clipPath');
	// FIXME cleanup the unused attributes (stroke width and such).
	this.rawNode.appendChild(shape.rawNode.cloneNode(false));
    }

});

}); // end using lively.scene

// ===========================================================================
// Gradient colors, stipple patterns and coordinate transformatins
// ===========================================================================


using(namespace('lively.paint'), lively.data.Wrapper).run(function(unused, Wrapper) {


// note that Colors and Gradients are similar but Colors don't need an SVG node
Wrapper.subclass("lively.paint.Gradient", {

    addStop: function(offset, color) {
	this.rawNode.appendChild(NodeFactory.create("stop", {offset: offset, "stop-color": color}));
	return this;
    },

    rawStopNodes: function() {
	return this.rawNode.getElementsByTagNameNS(Namespace.SVG, 'stop');
    },

    stopColor: function(index) {
	var stops = this.rawStopNodes();
	if (!stops.item(index || 0)) return null;
	return Color.fromString(stops.item(index || 0).getAttributeNS(null, "stop-color"));
    },

    offset: function(index) {
	var stops = this.rawStopNodes();
	if (!stops[index || 0]) return null;
	return lively.Length.parse(stops[index || 0].getAttributeNS(null, "offset"));
    },

    processSpec: function(stopSpec) {
	// spec is an array of the form [color_1, delta_1, color_2, delta_2 .... color_n],
	// deltas are converted into stop-offsets by normalizing to the sum of all deltas,
	// e.g [c1, 1, c2, 3, c3] results three stops at 0, 25% and 100%.
	
	if (stopSpec.length %2 == 0) throw new Error("invalid spec");
	var sum = 0; // [a, 1, b]
	for (var i = 1; i < stopSpec.length; i += 2)
	    sum += stopSpec[i];
	var offset = 0; 
	for (var i = 1; i <= stopSpec.length; i += 2) {
	    this.addStop(offset, stopSpec[i - 1]);
	    if (i != stopSpec.length)
		offset += stopSpec[i]/sum;
	}
    }

});



this.Gradient.subclass("lively.paint.LinearGradient", {

    initialize: function($super, stopSpec, vector) {
	vector = vector || lively.paint.LinearGradient.NorthSouth;
	this.rawNode = NodeFactory.create("linearGradient",
					  {x1: vector.x, y1: vector.y, 
					   x2: vector.maxX(), y2: vector.maxY()}); 
	this.processSpec(stopSpec);
	return this;
    },

    mixedWith: function(color, proportion) {
	var stops = this.rawStopNodes();
	var rawNode = NodeFactory.create("linearGradient");
	var result = new lively.paint.LinearGradient(Importer.marker, rawNode);
	for (var i = 0; i < stops.length; i++) {
	    result.addStop(this.offset(i), this.stopColor(i).mixedWith(color, proportion));
	}
	return result;
    },

    toString: function() {
	return "#<" + this.getType() + this.toMarkupString() + ">";
    }

});

Object.extend(this.LinearGradient, {
    NorthSouth: rect(pt(0, 0), pt(0, 1)),
    SouthNorth: rect(pt(0, 1), pt(0, 0)),
    EastWest:   rect(pt(0, 0), pt(1, 0)),
    WestEast:   rect(pt(1, 0), pt(0, 0))
});


this.Gradient.subclass('lively.paint.RadialGradient', {

    initialize: function($super, stopSpec, optF) {
	this.rawNode = NodeFactory.create("radialGradient");
	if (optF) {
	    this.rawNode.setAttributeNS(null, "fx", optF.x);
	    this.rawNode.setAttributeNS(null, "fy", optF.y);
	}
	this.processSpec(stopSpec);
    }
});

//    return { Gradient: this.Gradient, RadialGradient: this.RadialGradient, LinearGradient: this.LinearGradient};


});// lively.paint