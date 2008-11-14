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
	dbgOn(!rawNode);
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
	return lively.data.FragmentURI.fromString(this.id());
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
	return lively.data.Length.parse(this.rawNode.getAttributeNS(null, name));
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


Object.extend(Object.subclass('lively.data.FragmentURI'), {
    parse: function(string) {
	var match = string.match("url\\(#(.*)\\)");
	return match && match[1];
	// 'ur(#fragmentURI)'
	//return string.substring(5, string.length - 1);
    },

    fromString: function(id) {
	return "url(#" + id + ")";
    },
    
    getElement: function(string) {
	var id = this.parse(string);
	return id && Global.document.getElementById(id);
    }
    
});


// See http://www.w3.org/TR/css3-values/
// and http://www.w3.org/TR/CSS2/syndata.html#values    

Object.extend(Object.subclass('lively.data.Length'), {

    parse: function(string) {
	// FIXME: handle units
	return parseFloat(string);
    }
});


Object.extend(lively.data.Length.subclass('lively.data.Coordinate'), {
    parse: function(string) {
	// FIXME: handle units
	return parseFloat(string);
    }
});




using(namespace('lively.scene'), lively.data.Wrapper).run(function(unused, Wrapper) {

function locateCanvas() {
    // dirty secret
    return Global.document.getElementById("canvas");
}

Wrapper.subclass('lively.scene.Node');
	
this.Node.addProperties({ 
    FillOpacity: { name: "fill-opacity", from: Number, to: String, byDefault: 1.0},
    StrokeOpacity: { name: "stroke-opacity", from: Number, to: String, byDefault: 1.0},
    StrokeWidth: { name: "stroke-width", from: Number, to: String, byDefault: 1.0},
    Stroke: { name: "stroke", byDefault: "none"}, // FIXME byDefault should be in JS not DOM type
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
	    return locateCanvas();
	} else {
	    return (this.rawNode && this.rawNode.ownerSVGElement) || locateCanvas();
	}
    },
    
    nativeContainsWorldPoint: function(p) {
	var r = this.canvas().createSVGRect();
	r.x = p.x;
	r.y = p.y;
	r.width = r.height = 0;
	return this.canvas().checkIntersection(this.rawNode, r);
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

    translateBy: function(displacement) {
	// todo
    },

    setFill: function(paint) {
	if ((this.fill !== paint) && (this.fill instanceof lively.paint.Gradient)) {
	    this.fill.dereference();
	}
	this.fill = paint;
	if (paint === undefined) {
	    this.rawNode.removeAttributeNS(null, "fill");
	} else if (paint === null) {
	    this.rawNode.setAttributeNS(null, "fill", "none");
	} else if (paint instanceof Color) {
	    this.rawNode.setAttributeNS(null, "fill", String(paint));
	} else if (paint instanceof lively.paint.Gradient) {
	    paint.reference();
	    this.rawNode.setAttributeNS(null, "fill", paint.uri());
	} else throw dbgOn(new TypeError('cannot deal with paint ' + paint));
    },


    getFill: function() {
	return this.fill;
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

    initialize: function() {
	if (this.shouldIgnorePointerEvents) this.ignoreEvents();
    },
    

    applyFunction: function(func,arg) { 
	func.call(this, arg); 
    },

    toPath: function() {
	throw new Error('unimplemented');
    },

    origin: function() {
	return this.bounds().topLeft();
    }

});
    

Object.extend(this,  { 

    LineJoins: Class.makeEnum(["Miter", "Round", "Bevel" ]), // note that values become attribute values
    LineCaps:  Class.makeEnum(["Butt",  "Round", "Square"])  // likewise
    
});


this.Shape.subclass('lively.scene.Rectangle', {

    documentation: "Rectangle shape",

    initialize: function($super, rect) {
	$super();
	this.rawNode = NodeFactory.create("rect");
	this.setBounds(rect || new Rectangle(0, 0, 0, 0));
	return this;
    },

    setBounds: function(r) {
	dbgOn(!r);
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


    translateBy: function(displacement) {
	this.setLengthTrait("x", this.getLengthTrait("x") + displacement.x);
	this.setLengthTrait("y", this.getLengthTrait("y") + displacement.y);
    },


    vertices: function() {
	var b = this.bounds();
	return [b.topLeft(), b.topRight(), b.bottomLeft(), b.bottomRight()];
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

    reshape: function(partName,newPoint, ignored) {
	var r = this.bounds().withPartNamed(partName, newPoint);
	this.setBounds(r);
    },
    
    partNameNear: function(p) {
	return this.bounds().partNameNear(Rectangle.corners, p, this.controlPointProximity);
    },

    partPosition: function(partName) {
	return this.bounds().partNamed(partName);
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

    initialize: function($super /*,rest*/) {
	$super();
	this.rawNode = NodeFactory.create("ellipse");
	switch (arguments.length) {
	case 2:
	    this.setBounds(arguments[1]);
	    break;
	case 3:
	    this.setBounds(arguments[1].asRectangle().expandBy(arguments[2]));
	    break;
	default:
	    throw new Error('bad arguments ' + $A(arguments));
	}
    },

    setBounds: function(r) {
	this.setLengthTrait("cx", r.x + r.width/2);
	this.setLengthTrait("cy", r.y + r.height/2);
	this.setLengthTrait("rx", r.width/2);
	this.setLengthTrait("ry", r.height/2);
	return this;
    },
    
    center: function() {
	return pt(this.rawNode.cx.baseVal.value, this.rawNode.cy.baseVal.value);
    },

    origin: function() {
	return this.center();
	//return this.bounds().topLeft();
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
    
    translateBy: function(displacement) {
	this.setLengthTrait("cx", this.getLengthTrait("cx") + displacement.x);
	this.setLengthTrait("cy", this.getLengthTrait("cy") + displacement.y);
    },

    vertices: function() {
	var b = this.bounds();
	var coeff = 4;
	var dx = b.width/coeff;
	var dy = b.height/coeff;
	// approximating by an octagon
	return [b.topCenter().addXY(-dx,0), b.topCenter().addXY(dx ,0),
		b.rightCenter().addXY(0, -dy), b.rightCenter().addXY(0, dy),
		b.bottomCenter().addXY(dx, 0), b.bottomCenter().addXY(-dx, 0),
		b.leftCenter().addXY(0, dy), b.leftCenter().addXY(0, -dy)];
    },

    partNameNear: function(p) {
	return this.bounds().partNameNear(Rectangle.sides, p, this.controlPointProximity);
    },

    reshape: this.Rectangle.prototype.reshape,
    partPosition: this.Rectangle.prototype.partPosition

});

this.Shape.subclass('lively.scene.Polygon', {
    documentation: "polygon",

    hasElbowProtrusions: true,
    useDOM: false,

    initialize: function($super, vertlist) {
	this.rawNode = NodeFactory.create("polygon");
	this.setVertices(vertlist);
	$super();
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

    translateBy: function(displacement) {
	var array = [];
	for (var i = 0; i < this.rawNode.points.numberOfItems; i++) {
	    var item = this.rawNode.points.getItem(i);
	    array.push(Point.ensure(item).addPt(displacement));
	}
	this.setVertices(array);
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
    
    origin: function() {
	// no natural choice to pick the origin of a polgon/polyline
	return pt(0, 0);
    },

    reshape: function(ix, newPoint, lastCall) {
	// ix is an index into vertices
	var verts = this.vertices();  // less verbose
	if (ix < 0) { // negative means insert a vertex
	    ix = -ix;
	    verts.splice(ix, 0, newPoint);
	    this.setVertices(verts);
	    return; // undefined result for insertion 
	}
	var closed = verts[0].eqPt(verts[verts.length - 1]);
	if (closed && ix == 0) {  // and we're changing the shared point (will always be the first)
	    verts[0] = newPoint;  // then change them both
	    verts[verts.length - 1] = newPoint; 
	} else {
	    verts[ix] = newPoint;
	}
	
	var shouldMerge = false;
	var howClose = 6;
	if (verts.length > 2) {
	    // if vertex being moved is close to an adjacent vertex, make handle show it (red)
	    // and if its the last call (mouse up), then merge this with the other vertex
	    if (ix > 0 && verts[ix - 1].dist(newPoint) < howClose) {
		if (lastCall) { 
		    verts.splice(ix, 1); 
		    if (closed) verts[0] = verts[verts.length - 1]; 
		} else {
		    shouldMerge = true;
		} 
	    }
	    
	    if (ix < verts.length - 1 && verts[ix + 1].dist(newPoint) < howClose) {
		if (lastCall) { 
		    verts.splice(ix, 1); 
		    if (closed) verts[verts.length - 1] = verts[0];
		} else {
		    shouldMerge = true;
		} 
	    }
	}
	this.setVertices(verts); 
	return shouldMerge;
    },

    partNameNear: function(p) {
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
    
    partPosition: function(partName) {
	var vertices = this.vertices();
	return (partName >= 0) ? vertices[partName] : vertices[-partName].midPt(vertices[-partName - 1]); 
    }

});

lively.scene.Shape.subclass('lively.scene.Polyline', {
    documentation: "Like polygon but not necessarily closed and does not include the interior",
    
    hasElbowProtrusions: true,

    initialize: function($super, vertlist) {
	this.rawNode = NodeFactory.create("polyline");
	this.setVertices(vertlist);
	$super();
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
    origin: this.Polygon.prototype.origin,
    vertices: this.Polygon.prototype.vertices,
    setVertices: this.Polygon.prototype.setVertices,
    reshape: this.Polygon.prototype.reshape,
    partNameNear: this.Polygon.prototype.partNameNear,
    partPosition: this.Polygon.prototype.partPosition,
    translateBy: this.Polygon.prototype.translateBy

});

Wrapper.subclass('lively.scene.PathElement', {
    isAbsolute: true,
    attributeFormat: function() {
	// FIXME not a good base element
	return this.charCode + this.x + "," + this.y;
    }

});


this.PathElement.subclass('lively.scene.MoveTo', {
    charCode: 'M',

    initialize: function(x, y) {
	this.x = x;
	this.y = y;
    },

    allocateRawNode: function(rawPathNode) {
	this.rawNode = rawPathNode.createSVGPathSegMovetoAbs(this.x, this.y);
	return this.rawNode;
    },

    controlPoints: function() {
	return [pt(this.x, this.y)];
    },


});

this.PathElement.subclass('lively.scene.LineTo', {
    charCode: 'L',
    initialize: function(x, y) {
	this.x = x;
	this.y = y;
    },

    allocateRawNode: function(rawPathNode) {
	this.rawNode = rawPathNode.createSVGPathSegLinetoAbs(this.x, this.y);
	return this.rawNode;
    },

    controlPoints: function() {
	return [pt(this.x, this.y)];
    }


});


this.PathElement.subclass('lively.scene.CurveTo', {

    charCode: 'T',

    initialize: function(x, y) {
	this.x = x;
	this.y = y;
    },

    allocateRawNode: function(rawPathNode) {
	this.rawNode = rawPathNode.createSVGPathSegCurvetoQuadraticSmoothAbs(this.x, this.y);
	return this.rawNode;
    },

    controlPoints: function() {
	return [pt(this.x, this.y)];
    }


});


this.PathElement.subclass('lively.scene.ClosePath', {

    charCode: 'Z',

    initialize: function() {
    },

    allocateRawNode: function(rawPathNode) {
	this.rawNode = rawPathNode.createSVGPathSegClosePath();
	return this.rawNode;
    },

    controlPoints: function() {
	return [];
    }


});



this.Shape.subclass('lively.scene.Path', {
    documentation: "Generic Path with arbitrary Bezier curves",

    hasElbowProtrusions: true,

    initialize: function($super, elements) {
	this.rawNode = NodeFactory.create("path");
	this.setElements(elements || []);
	return this;
    },

    setElements: function(elts) {
	this.cachedVertices = null;
	this.elements = elts;
	var attr = "";
	for (var i = 0; i < elts.length; i++) {
	    var seg = elts[i].allocateRawNode(this.rawNode);
	    // this.rawNode.pathSegList.appendItem(seg);
	    attr += elts[i].attributeFormat() + " ";
	}
	this.rawNode.setAttributeNS(null, "d", attr);
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
    

    vertices: function() {
	var verts = this.cachedVertices;
	if (verts == null) {
	    verts = [];
	    this.elements.forEach(function(el) {
		verts = verts.concat(el.controlPoints());
	    });
	    this.cachedVertices = verts;
	}
	return verts;
        //return this.verticesFromSVG();
    },
    
    containsPoint: function(p) {
	var verts = this.vertices();
	//if (UserAgent.webKitVersion >= 525)
	return Rectangle.unionPts(verts).containsPoint(p);
	//else return this.nativeContainsWorldPoint(p);
    },

    bounds: function() {
	var u = Rectangle.unionPts(this.vertices());
	// FIXME this is not correct (extruding arcs) but it's an approximation
	return u;
    },

    setBounds: function(bounds) { 
	console.log('setBounds unsupported on type ' + this.getType());
    },
    
    // poorman's traits :)
    partNameNear: this.Polygon.prototype.partNameNear,
    partPosition: this.Polygon.prototype.partPosition,
    reshape: this.Polygon.prototype.reshape,

});

this.Node.subclass('lively.scene.Group', {
    documentation: 'Grouping of scene objects',
    
    initialize: function() {
	this.rawNode = NodeFactory.create("g");
	this.content = [];
    },

    copyFrom: function($super, copier, other) {
	$super(copier, other);
	this.content = other.content.clone();
	// FIXME deep copy?
    },

    add: function(node) {
	this.rawNode.appendChild(node.rawNode);
	this.content.push(node);
    },

    bounds: function() {
	// this creates duplication between morphs and scene graphs, division of labor?
	var subBounds = null;
	for (var i = 0; i < this.content.length; i++) {
	    var item = this.content[i];
	    if (!item.isVisible()) 
		continue;
	    subBounds = subBounds == null ? item.bounds() : subBounds.union(item.bounds());
	}
	return subBounds || new Rectangle(0, 0, 0, 0);
    },

    setBounds: function(bnds) {
	console.log('doing nothing to set bounds on group');
    },

    containsPoint: function(p) {
	return this.content.any(function(item) { return item.containsPoint(p); });
    },

    origin: function(shape) { 
	return this.bounds().topLeft();
    },

    partNameNear: this.Rectangle.prototype.partNameNear,
    partPosition: this.Rectangle.prototype.partPosition,
    vertices: this.Rectangle.prototype.vertices
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
	return lively.data.Length.parse((optArg || this.rawNode).getAttributeNS(null, "width"));
    },

    getHeight: function(optArg) {
	return lively.data.Length.parse((optArg || this.rawNode).getAttributeNS(null, "height"));
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
	new lively.scene.Similitude(pt(0, 0), 0, factor).applyTo(this.rawNode);
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


Object.subclass('lively.scene.Similitude', {

    documentation: "Support for object rotation, scaling, etc.",
    translation: null, // may be set by instances to a component SVGTransform
    rotation: null, // may be set by instances to a component SVGTransform
    scaling: null, // may be set by instances to a component SVGTransform
    eps: 0.0001, // precision

    /**
      * createSimilitude: a similitude is a combination of translation rotation and scale.
      * @param [Point] delta
      * @param [float] angleInRadians
      * @param [float] scale
      */
    initialize: function(delta, angleInRadians, scale) {
	if (angleInRadians === undefined) angleInRadians = 0.0;
	if (scale === undefined) scale = 1.0;
	this.a = this.ensureNumber(scale * Math.cos(angleInRadians));
	this.b = this.ensureNumber(scale * Math.sin(angleInRadians));
	this.c = this.ensureNumber(scale * - Math.sin(angleInRadians));
	this.d = this.ensureNumber(scale * Math.cos(angleInRadians));
	this.e = this.ensureNumber(delta.x);
	this.f = this.ensureNumber(delta.y);
	this.matrix_ = this.toMatrix();
    },

    getRotation: function() { // in degrees
	var r =  Math.atan2(this.b, this.a).toDegrees();
	return Math.abs(r) < this.eps ? 0 : r; // don't bother with values very close to 0
    },

    getScale: function() {
	var a = this.a;
	var b = this.b;
	var s = Math.sqrt(a * a + b * b);
	return Math.abs(s - 1) < this.eps ? 1 : s; // don't bother with values very close to 1
    },

    isTranslation: function() {
	return this.matrix_.type === SVGTransform.SVG_TRANSFORM_TRANSLATE;
    },

    getTranslation: function() {
	return pt(this.e, this.f);
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

    applyTo: function(rawNode) {
	if (Config.useTransformAPI) {
	    var list = rawNode.transform.baseVal;
	    var canvas = locateCanvas();

	    if (!this.translation) this.translation = canvas.createSVGTransform();
	    this.translation.setTranslate(this.e, this.f);
	    list.initialize(this.translation);
	    if (this.b || this.c) {
		if (!this.rotation) this.rotation = canvas.createSVGTransform();
		this.rotation.setRotate(this.getRotation(), 0, 0);
		list.appendItem(this.rotation);
	    }
	    if (this.a != 1.0 || this.d != 1.0) {
		if (!this.scaling) this.scaling = canvas.createSVGTransform();
		var scale = this.getScale();
		this.scaling.setScale(scale, scale);
		list.appendItem(this.scaling);
	    }
	} else {
	    rawNode.setAttributeNS(null, "transform", this.toAttributeValue());
	}
    },

    toString: function() {
	return this.toAttributeValue();
    },

    transformPoint: function(p, acc) {
	return p.matrixTransform(this, acc);
    },

    transformRectToRect: function(r) {
	var p = this.transformPoint(r.topLeft());
	var min = p.copy();
	var max = p.copy();

	p = this.transformPoint(r.topRight(), p);
	min = min.minPt(p, min);
	max = max.maxPt(p, max);

	p = this.transformPoint(r.bottomRight(), p);
	min = min.minPt(p, min);
	max = max.maxPt(p, max);

	p = this.transformPoint(r.bottomLeft(), p);
	min = min.minPt(p, min);
	max = max.maxPt(p, max);

	return rect(min, max);
    },

    copy: function() {
	return new lively.scene.Transform(this);
    },

    toMatrix: function() {
	var mx = locateCanvas().createSVGMatrix();
	mx.a = this.a;
	mx.b = this.b;
	mx.c = this.c;
	mx.d = this.d;
	mx.e = this.e;
	mx.f = this.f;
	return mx;
    },

    ensureNumber: function(value) {
	// note that if a,b,.. f are not numbers, it's usually a
	// problem, which may crash browsers (like Safari) that don't
	// do good typechecking of SVGMatrix properties before passing
	// them to native code.  It's probably too late to figure out
	// the cause, but at least we won't crash.
	if (isNaN(value)) { throw dbgOn(new Error('not a number'));}
	return value;
    },


    fromMatrix: function(mx) {
	this.a = this.ensureNumber(mx.a);
	this.b = this.ensureNumber(mx.b);
	this.c = this.ensureNumber(mx.c);
	this.d = this.ensureNumber(mx.d);
	this.e = this.ensureNumber(mx.e);
	this.f = this.ensureNumber(mx.f);
	this.matrix_ = this.toMatrix();
    },
    
    preConcatenate: function(t) {
	var m = this.matrix_;
	this.a =  t.a * m.a + t.c * m.b;
	this.b =  t.b * m.a + t.d * m.b;
	this.c =  t.a * m.c + t.c * m.d;
	this.d =  t.b * m.c + t.d * m.d;
	this.e =  t.a * m.e + t.c * m.f + t.e;
	this.f =  t.b * m.e + t.d * m.f + t.f;
	this.matrix_ = this.toMatrix();
	return this;
    },

    createInverse: function() {
	return new lively.scene.Transform(this.matrix_.inverse());
    }

});

/**
  * @class Transform (NOTE: PORTING-SENSITIVE CODE)
  * This code is dependent on SVG transformation matrices.
  * See: http://www.w3.org/TR/2003/REC-SVG11-20030114/coords.html#InterfaceSVGMatrix 
  */

lively.scene.Similitude.subclass('lively.scene.Transform', {

    initialize: function(duck) { // matrix is a duck with a,b,c,d,e,f, could be an SVG matrix or a Lively Transform
	// note: doesn't call $super
	if (duck) {
	    this.fromMatrix(duck);
	} else {
	    this.a = this.d = 1.0;
	    this.b = this.c = this.e = this.f = 0.0;
	    this.matrix_ = this.toMatrix();
	}
    }
});


}); // end using lively.scene

// ===========================================================================
// Gradient colors, stipple patterns and coordinate transformatins
// ===========================================================================


using(namespace('lively.paint'), lively.data.Wrapper).run(function(unused, Wrapper) {

Wrapper.subclass('lively.paint.Stop', {
    initialize: function(offset, color) {
	dbgOn(isNaN(offset));
	this.rawNode = NodeFactory.create("stop", { offset: offset, "stop-color": color});
    },

    deserialize: function(importer, rawNode) {
	this.rawNode = rawNode;
    },

    copyFrom: function(copier, other) {
	if (other.rawNode) this.rawNode = other.rawNode.cloneNode(true);
    },

    color: function() {
	return Color.fromString(this.getTrait("stop-color"));
    },
    
    offset: function() {
	return this.getLengthTrait("offset");
    },

    toLiteral: function() {
	return { offset: String(this.offset()), color: String(this.color()) };
    },
    
    toString: function() {
	return "#<Stop{" + JSON.serialize(this.toLiteral()) + "}>";
    }

});

// note that Colors and Gradients are similar but Colors don't need an SVG node
Wrapper.subclass("lively.paint.Gradient", {
    
    dictionaryNode: null,
    initialize: function($super, node) {
	$super();
	this.stops = [];
	this.refcount = 0;
	this.rawNode = node;
    },

    deserialize: function($super, importer, rawNode) {
	$super(importer, rawNode);
	rawNode.removeAttribute("id");
	var rawStopNodes = $A(this.rawNode.getElementsByTagNameNS(Namespace.SVG, 'stop'));
	this.stops = rawStopNodes.map(function(stopNode) { return new lively.paint.Stop(importer, stopNode) });
	this.refcount = 0;
    },

    copyFrom: function($super, copier, other) {
	$super(copier, other);
	dbgOn(!other.stops);
	this.rawNode.removeAttribute("id");
	var rawStopNodes = $A(this.rawNode.getElementsByTagNameNS(Namespace.SVG, 'stop'));
	this.stops = rawStopNodes.map(function(stopNode) { return new lively.paint.Stop(importer, stopNode) });
	this.refcount = 0;
    },

    addStop: function(offset, color) {
	var stop = new lively.paint.Stop(offset, color);
	this.stops.push(stop);
	this.rawNode.appendChild(stop.rawNode);
	return this;
    },

    setStops: function(list) {
	if (this.stops && this.stops.length > 0) throw new Error('stops already initialized to ' + this.stops);
	list.forEach(function(stop) {
	    this.stops.push(stop);
	    this.rawNode.appendChild(stop.rawNode);
	}, this);
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
    },

    toString: function() {
	return "#<" + this.getType() + this.toMarkupString() + ">";
    },

    reference: function() {
	if (this.refcount == 0) {
	    if (!this.id()) {
		this.setId(this.newId());
	    }
	    this.dictionary().appendChild(this.rawNode);
	}
	this.refcount ++;
    },

    dereference: function() {
	this.refcount --;
	if (this.refcount == 0) {
	    if (this.rawNode.parentNode) this.dictionary().removeChild(this.rawNode);
	}
    },

    dictionary: function() {
	if (this.dictionaryNode == null) {
	    var canvas = Global.document.getElementById("canvas");
	    this.constructor.prototype.dictionaryNode = canvas.appendChild(NodeFactory.create("defs"));
	    this.dictionaryNode.setAttribute("id", "GradientDictionary"); // for debugging
	}
	return this.dictionaryNode;
    }

});



this.Gradient.subclass("lively.paint.LinearGradient", {

    initialize: function($super, stopSpec, vector) {
	vector = vector || lively.paint.LinearGradient.NorthSouth;
	$super(NodeFactory.create("linearGradient",
				  {x1: vector.x, y1: vector.y, 
				   x2: vector.maxX(), y2: vector.maxY()})); 
	this.setStops(stopSpec);
	return this;
    },

    mixedWith: function(color, proportion) {
	var result = new lively.paint.LinearGradient();
	for (var i = 0; i < stops.length; i++) {
	    result.addStop(new lively.paint.Stop(this.stops[i].offset(), 
						 this.stops[i].color().mixedWith(color, proportion)));
	}
	return result;
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
	$super(NodeFactory.create("radialGradient"));
	this.setStops(stopSpec);
	if (optF) {
	    this.setTrait("fx", optF.x);
	    this.setTrait("fy", optF.y);
	}
    }
});

//    return { Gradient: this.Gradient, RadialGradient: this.RadialGradient, LinearGradient: this.LinearGradient};


});// lively.paint