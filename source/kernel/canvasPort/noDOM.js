/* -----------------------------------------------------
 * The purpose of these changes is to replace SVG nodes
 *  with dummy nodes so that code that depended on the SVG nodes
 *  will still run, although without using the SVG graphics.
 * -----------------------------------------------------
 */

NodeFactory.create =  function(name, attributes) {
    var element = emudom.document.createElementNS(Namespace.SVG, name);
    //return this.createNS(Namespace.SVG, name, attributes);  // doesn't work
    return NodeFactory.extend(null, element, attributes);
};

WorldMorph.addMethods({
    displayOnCanvas: function(canvas) {
	// this.remove();
	
	//canvas.appendChild(this.rawNode);
	// otherwise we may be 
        var hand = this.addHand(new HandMorph(true));
	WorldMorph.currentWorld = this; // this conflicts with mutliple worlds
        this.onEnter(); 
	
	this.enterCount ++;
    },

    addHand: function(hand) {
        if (this.hands.length > 0 && !this.hands.first())
            this.hands.shift(); // FIXME: Quick bugfix. When deserializing the world the hands.first() is sometimes undefined
        this.hands.push(hand);
        hand.owner = this;
        hand.registerForEvents(this);
        hand.registerForEvents(hand);
        hand.layoutChanged();
	
        Event.keyboardEvents.forEach(function(each) {
            document.documentElement.addEventListener(each, hand, hand.handleOnCapture);
        });
	
        //this.rawNode.parentNode.appendChild(hand.rawNode);
	return hand;
    }

});

lively.data.Wrapper.addMethods({
    reference: function() {
	if (!this.refcount) {
	    if (!this.id()) {
		this.setId(this.newId());
	    }
	    //this.dictionary().appendChild(this.rawNode);
	    this.refcount = 1; 
	    return;
	}
	this.refcount ++;
    }
 

});


/* -----------------------------------------------------
 * The purpose of these changes is to get rid completely
 * of DOM nodes, emulated or not
 * -----------------------------------------------------
 */

Object.subclass('RawNode', {

	initialize: function(name, attributes, namespace) {
		this.namespace = namespace;
		this.name = name;
		this.attributes = attributes || {};
		this.children = [];
	},
	
	// getAttribute: function(name) { return this.attributes[name] },
	// setAttribute: function(name, val) { return this.attributes[name] = val },
	// removeAttribute:function(name) { delete this.attributes[name] },
	// appendChild: function(child) { this.children.push(child) }
})

LivelyNS = { // redefine completely
    
    create: function(name, attributes) {
		return new RawNode(name, attributes, Namespace.LIVELY);
    },
    
    getAttribute: function(node, name) { return node.getAttribute(name) },

    removeAttribute: function(node, name) { node.removeAttribute(name) },

    setAttribute: function(node, name, value) { node.setAttribute(name, value) },

    getType: function(node) {
		// return node.getAttribute('type')
	},
    
    setType: function(node, string) {
		// node.setAttribute('type', string)
	},

};

// CavnasExpt Patches
HandMorph.addMethods({
	
	registerForEvents: function(morph) {
		Event.basicInputEvents.forEach(function(name) { 
			// morph.rawNode.addEventListener(name, this, this.handleOnCapture);
		}, this);
		// Register for events from the 2D canvas as well
		var canvas = document.getElementById('lively.canvas');
		if(morph === this || canvas == null) return;
		Event.basicInputEvents.forEach(function(name) { 
			canvas.addEventListener(name, this, this.handleOnCapture);}, this);
	},
	unregisterForEvents: function(morph) {
		Event.basicInputEvents.forEach(function(name) { 
			// morph.rawNode.removeEventListener(name, this, this.handleOnCapture);
		}, this);
		// Unregister for events from the 2D canvas as well
		var canvas = document.getElementById('lively.canvas');
		if(morph === this || canvas == null) return;
		Event.basicInputEvents.forEach(function(name) { 
			canvas.removeEventListener(name, this, this.handleOnCapture);}, this);
	},
})

// ------------
// base patches
// ------------

Object.extend(Record, {
	
	newRecordGetter: function newRecordGetter(name, from, byDefault) {
		return function recordGetter() {
			if (this === this.constructor.prototype) // we are the prototype? not foolproof but works in LK
				return byDefault; 
			if (!this.rawNode)
				this.rawNode = {}
				// throw new Error("no rawNode");
			var value = this.getRecordField(name);
			if (!value && byDefault) return byDefault;
			else if (from) return from(value);
			else return value;
		}
	},
})

PlainRecord.addMethods({
	getRecordField: function(name) { if (!this.rawNode) this.rawNode = {}; return this.rawNode[name] },
 
	setRecordField: function(name, value) { if (!this.rawNode) this.rawNode = {}; return this.rawNode[name] = value },
 
	removeRecordField: function(name) { if (!this.rawNode) this.rawNode = {}; delete this.rawNode[name] }
});

// ---------------
// scene patches
// ---------------

lively.data.Wrapper.addMethods({
	id: function() { return this.id	},

	setId: function(value) {
		var prev = this.id();
		// easy parsing if value is an int, just call parseInt()
		this.id = value + ":" + this.getType()
		return prev;
	},
	
	// ------------
	
	getTrait: function(name) { return this[name]; },
	setTrait: function(name, value) { return this[name] = String(value); },
	removeTrait: function(name) { delete this[name] },
	getLengthTrait: function(name) { return lively.data.Length.parse(this.getTrait(name)) },
	
	//
	getDefsNode: function() { return null },
	
	
})

lively.scene.Rectangle.addMethods({

	initialize: function($super, rect) {
		$super();
		this.rawNode = NodeFactory.create("rect");
		this.setBounds(rect || new Rectangle(0, 0, 0, 0));
		return this;
	},

	setBounds: function(r) {
		this._bounds = r;
		dbgOn(!r);
		this.setLengthTrait("x", r.x);
		this.setLengthTrait("y", r.y);
		this.setLengthTrait("width", Math.max(0, r.width));
		this.setLengthTrait("height", Math.max(0, r.height));
		return this;
	},

	x: function() { return this.bounds().x },
	y: function() { return this.bounds().y },
	width: function() { return this.bounds().width },
	height: function() { return this.bounds().height },
	
	bounds: function() { return this._bounds	},

	translateBy: function(displacement) {
		this.setBounds(this.bounds().translatedBy(displacement));
	},

	containsPoint: function(p) {
		return this.bounds().containsPoint(p);
	},

	getBorderRadius: function() {
		return this.getLengthTrait("rx") || 0;
	},

	// consider arcWidth and arcHeight instead
	roundEdgesBy: function(r) {
		if (r) {
			this.setLengthTrait("rx", r);
			this.setLengthTrait("ry", r);
			var w = this.getStrokeWidth();	// DI:	Needed to force repaint(!)
			this.setStrokeWidth(w+1); 
			this.setStrokeWidth(w); 
		}
		return this;
	}

});

lively.paint.Stop.addMethods({
	offset: function() {
		return this.getLengthTrait("offset") || 0;
	},
})

lively.scene.Node.addMethods({
	
	setFill: function(paint) {
		if ((this._fill !== paint) && (this._fill instanceof lively.paint.Gradient)) {
			this._fill.dereference();
		}
		this._fill = paint;
		// if (paint === undefined) {
		// 	this.rawNode.removeAttributeNS(null, "fill");
		// } else if (paint === null) {
		// 	this.rawNode.setAttributeNS(null, "fill", "none");
		// } else if (paint instanceof Color) {
		// 	this.rawNode.setAttributeNS(null, "fill", String(paint));
		// } else if (paint instanceof lively.paint.Gradient) {
		// 	paint.reference();
		// 	this.rawNode.setAttributeNS(null, "fill", paint.uri());
		// } else {
		// 	throw dbgOn(new TypeError('cannot deal with paint ' + paint));
		// }
	},

	setStroke: function(paint) {
			if ((this._stroke !== paint) && (this._stroke instanceof lively.paint.Gradient)) {
				this._stroke.dereference();
			}
			this._stroke = paint;
			// if (paint === undefined) {
			// 	this.rawNode.removeAttributeNS(null, "stroke");
			// } else if (paint === null) {
			// 	this.rawNode.setAttributeNS(null, "stroke", "none");
			// } else if (paint instanceof Color) {
			// 	this.rawNode.setAttributeNS(null, "stroke", String(paint));
			// } else if (paint instanceof lively.paint.Gradient) {
			// 	paint.reference();
			// 	this.rawNode.setAttributeNS(null, "stroke", paint.uri());
			// } else throw dbgOn(new TypeError('cannot deal with paint ' + paint));
		},
		
		getFill: function() {
			// hack
			return this._fill;
		},
})


delete lively.scene.Node.prototype.getFillOpacity
delete lively.scene.Node.prototype.setFillOpacity
delete lively.scene.Node.prototype.getStrokeOpacity
delete lively.scene.Node.prototype.setStrokeOpacity
delete lively.scene.Node.prototype.getStrokeWidth
delete lively.scene.Node.prototype.setStrokeWidth
delete lively.scene.Node.prototype.getLineJoin
delete lively.scene.Node.prototype.setLineJoin
delete lively.scene.Node.prototype.getLineCap
delete lively.scene.Node.prototype.setLineCap
delete lively.scene.Node.prototype.getStrokeDashArray
delete lively.scene.Node.prototype.setStrokeDashArray
delete lively.scene.Node.prototype.getStyleClass
delete lively.scene.Node.prototype.setStyleClass
delete lively.scene.Node.prototype.getRecordField
delete lively.scene.Node.prototype.setRecordField

lively.scene.Node.addProperties({ 
	FillOpacity: { name: "fill-opacity", from: Number, to: String, byDefault: 1.0},
	StrokeOpacity: { name: "stroke-opacity", from: Number, to: String, byDefault: 1.0},
	StrokeWidth: { name: "stroke-width", from: Number, to: String, byDefault: 1.0},
	LineJoin: {name: "stroke-linejoin"},
	LineCap: {name: "stroke-linecap"},
	StrokeDashArray: {name: "stroke-dasharray"},
	StyleClass: {name: "class"}
}, PlainRecord);

lively.paint.Gradient.addMethods({


	copyFrom: function($super, copier, other) {
		$super(copier, other);
		dbgOn(!other.stops);
		//this.rawNode.removeAttribute("id");
		var rawStopNodes = $A(this.rawNode.getElementsByTagNameNS(Namespace.SVG, 'stop'));
		this.stops = rawStopNodes.map(function(stopNode) { return new lively.paint.Stop(importer, stopNode) });
		this.refcount = 0;
	},

	addStop: function(offset, color) {
		var stop = new lively.paint.Stop(offset, color);
		this.stops.push(stop);
		// this.rawNode.appendChild(stop.rawNode);
		return this;
	},

	setStops: function(list) {
		if (this.stops && this.stops.length > 0) throw new Error('stops already initialized to ' + this.stops);
		list.forEach(function(stop) {
			this.stops.push(stop);
			// this.rawNode.appendChild(stop.rawNode);
		}, this);
	},

	toString: function() {
		return "#<" + this.getType() + this.toMarkupString() + ">";
	},

});

lively.scene.Shape.addMethods({
	canvasFillFor: function(ourFill, graphicContext, bnds) {
		if (ourFill == null) return null;
		if (ourFill instanceof Color) return ourFill.toString();
		// var grad = null;
		// if (ourFill instanceof lively.paint.LinearGradient) {
		// 	cv = bnds.scaleByRect(ourFill.vector || lively.paint.LinearGradient.NorthSouth);
		// 	grad = graphicContext.createLinearGradient(cv.x, cv.y, cv.maxX(), cv.maxY());
		// }
		// if (ourFill instanceof lively.paint.RadialGradient) {
		// 	var c = bnds.center();
		// 	var c0 = c.scaleBy(0.7).addPt(bnds.topLeft().scaleBy(0.3));
		// 	grad = graphicContext.createRadialGradient(c0.x, c0.y, 0, c.x, c.y, bnds.width/2);
		// }
		// if (grad) {
		// 	var stops = ourFill.stops;
		// 	for (var i=0; i<stops.length; i++) {
		// 		grad.addColorStop(stops[i].offset(), this.canvasFillFor(stops[i].color())); }
		// 		return grad;
		// 	}
		return null;
	},
})

lively.paint.Stop.addMethods({
	initialize: function(offset, color) {
		dbgOn(isNaN(offset));
		// this.rawNode = NodeFactory.create("stop", { offset: offset, "stop-color": color});
	},
})

lively.scene.Polygon.addMethods({

	initialize: function($super, vertlist) {
		// this.rawNode = NodeFactory.create("polygon");
		this.setVertices(vertlist);
		$super();
		return this;
	},
 
	setVertices: function(vertlist) {
		this._vertices = vertlist;
	},
 
	vertices: function() {
		return this._vertices
	},
 
	translateBy: function(displacement) {
		this.setVertices(this.vertices().collect(function(ea) { return ea.addPt(displacement) }));
	},
 
 
	bounds: function() {
		// FIXME very quick and dirty, consider caching or iterating over this.points
		var vertices = this.vertices();
		// Opera has been known not to update the SVGPolygonShape.points property to reflect the SVG points attribute
		// console.assert(vertices.length > 0, 
		// 	"lively.scene.Polygon.bounds: vertices has zero length, " + this.ve
		// 	+ " vs " + this.rawNode.getAttributeNS(null, "points"));
		return Rectangle.unionPts(vertices);
	},
 
 
});

lively.scene.Polyline.addMethods({
	initialize: function($super, vertlist) {
		// this.rawNode = NodeFactory.create("polyline");
		this.setVertices(vertlist);
		$super();
	},
	bounds: lively.scene.Polygon.prototype.bounds,
	origin: lively.scene.Polygon.prototype.origin,
	vertices: lively.scene.Polygon.prototype.vertices,
	setVertices: lively.scene.Polygon.prototype.setVertices,
	reshape: lively.scene.Polygon.prototype.reshape,
	partNameNear: lively.scene.Polygon.prototype.partNameNear,
	partPosition: lively.scene.Polygon.prototype.partPosition,
	translateBy: lively.scene.Polygon.prototype.translateBy
})

lively.scene.Ellipse.addMethods({
  
	initialize: function($super /*,rest*/) {
		$super();
		// this.rawNode = NodeFactory.create("ellipse");
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
		this._bounds = r
		return this;
	},
	 
	center: function() {
		return this.bounds().center()
		// return pt(this.rawNode.cx.baseVal.value, this.rawNode.cy.baseVal.value);
	},
 
	// For ellipses, test if x*x + y*y < r*r
	containsPoint: function(p) {
		return this.bounds().containsPoint(p)
		// var w = this.rawNode.rx.baseVal.value * 2;
		// var h = this.rawNode.ry.baseVal.value * 2;
		// var c = pt(this.rawNode.cx.baseVal.value, this.rawNode.cy.baseVal.value);
		// var dx = Math.abs(p.x - c.x);
		// var dy = Math.abs(p.y - c.y)*w/h;
		// return (dx*dx + dy*dy) <= (w*w/4) ; 
	},
 
 
	bounds: function() {
		return this._bounds
	}, 
 
	translateBy: function(displacement) {
		this.setBounds(this.bounds().translatedBy(displacement))
	},
 
	reshape: this.Rectangle.prototype.reshape,
	partPosition: this.Rectangle.prototype.partPosition
 
});

// ----------------
// core patches
// --------------
Morph.addMethods({
	initialize: function(shape) { // removed NodeFactory.create("g")
		this.internalInitialize(new RawNode('g'), true);
		dbgOn(!shape.bounds);
		// we must make sure the Morph keeps its original size (wrt/fisheyeScale)
		if (this.fisheyeScale != 1) this.scalePoint = this.scalePoint.scaleBy(1 / this.fisheyeScale);
		this.origin = shape.getOrigin();
		shape.translateBy(this.origin.negated());
		this.initializePersistentState(shape);
		this.initializeTransientState();
    },

	initializePersistentState: function(shape) { // removed DOM access
		// a rect shape by default, will change later
		this.shape = shape;
	
		if (this.styleClass) { // inherited from prototype
			var attr = this.styleClass.join(' ');
			// this.rawNode.setAttribute("class", attr);
			// 	this.rawNode.className.baseVal = attr;
		}
		this.applyStyle(this.style);
		return this;
	},
	
	// ---------------
	
	transformChanged: function() { // don't do SVG transfrom SVG transfrom
		var scalePt = this.scalePoint;
		if (this.fisheyeScale != 1) scalePt = scalePt.scaleBy(this.fisheyeScale);
		this.pvtCachedTransform = new lively.scene.Similitude(this.origin, this.rotation, scalePt);
	},
	
	// ----------------
	
	setStyleClass: function(value) {
		var attr;
		if (value instanceof Array) {
			this.styleClass = value;
			attr = value.join(' ');
		} else {
			this.styleClass = [value];
			attr = String(value);
		}
		// this.rawNode.setAttribute("class", attr);
	},

	canvas: function() {
		return Global.document.getElementById("canvas");
	},

	setVisible: function(flag) { // FIXME delegate to sceneNode when conversion finished
		// if (flag) this.rawNode.removeAttributeNS(null, "display");
		// else this.rawNode.setAttributeNS(null, "display", "none");
		return this;
	},

	isVisible: function() { // FIXME delegate to sceneNode when conversion finished
		// var hidden = this.rawNode.getAttributeNS(null, "display") == "none";
		// return hidden == false;
		return true
	},

	applyFilter: function(filterUri) {// FIXME delegate to sceneNode when conversion finished
		// if (filterUri) 
		// 	this.rawNode.setAttributeNS(null, "filter", filterUri);
		// else
		// this.rawNode.removeAttributeNS(null, "filter");
	},
	
	// -----------
	
	getTransform: function() {
		if (this.pvtCachedTransform) return this.pvtCachedTransform;
	    this.pvtCachedTransform = new lively.scene.Similitude(null);
		return this.pvtCachedTransform;
	},
	
	// ------------
	
	insertMorph: function(m, isFront) { // low level, more like Node.insertBefore?
		var insertionPt = this.submorphs.length == 0 ? null : // if no submorphs, append to nodes
		isFront ? this.submorphs.last().rawNode.nextSibling : this.submorphs.first().rawNode;
		// the last one, so drawn last, so front
		// this.rawNode.insertBefore(m.rawNode, insertionPt);

		if (isFront)
			this.submorphs.push(m);
		else
		this.submorphs.unshift(m);
		m.owner = this;
		return m;
	},
		
	addNonMorph: function(node) {
		if (node instanceof lively.data.Wrapper) throw new Error("add rawNode, not the wrapper itself");
		// return this.rawNode.insertBefore(node, this.shape && this.shape.rawNode.nextSibling);
		return node
	},
	
	//
	
	toString: function() {
		try {
			return Strings.format("%s(%s)", this.id || "" , 
			this.shape ? "[" + this.shape.bounds().toTuple() + "]" : "");
		} catch (e) {
			//console.log("toString failed on %s", [this.id(), this.getType()]);
			return "#<Morph?{" + e + "}>";
		}
	},
})

HandMorph.addMethods({
	insertMorph: function(m, isFront) {
			// overrides Morph.prototype.insertMorph
			var insertionPt = this.submorphs.length == 0 ? 
				this.shape.rawNode :
				(isFront ? this.submorphs.last().rawNode : this.submorphs.first().rawNode);
				// the last one, so drawn last, so front
			// this.rawNode.insertBefore(m.rawNode, insertionPt);
			if (isFront)
				this.submorphs.push(m);
			else
				this.submorphs.unshift(m);
			m.owner = this;
			return m;
		},
	
})

// Text
TextMorph.addMethods({
	initializeTextSelection: function() {
		this.textSelection = this.addMorphBack(new TextSelectionMorph());
		// The TextSelection must be beneath the Text, shift rawNode around
		// this.rawNode.insertBefore(this.textSelection.rawNode, this.shape.rawNode.nextSibling);
	},	
})


// Widgets
ButtonMorph.addMethods({
	changeAppearanceFor: function(value) {
		// var delta = value ? 1 : 0;
		// 	var gfx = lively.paint;
		// 	if (this.baseFill instanceof gfx.LinearGradient) {
		// 		var base = this.baseFill.stops[0].color().lighter(delta);
		// 		var gradient = 
		// 		new gfx.LinearGradient([new gfx.Stop(0, base), new gfx.Stop(1, base.lighter())],
		// 		gfx.LinearGradient.SouthNorth);
		// 		this.setFill(gradient);
		// 	} else if (this.baseFill instanceof gfx.RadialGradient) {
		// 		var base = this.baseFill.stops[0].color().lighter(delta);
		// 		this.setFill(new gfx.RadialGradient([new gfx.Stop(0, base.lighter()), new gfx.Stop(1, base)]));
		// 	} else if (this.baseFill instanceof Color) {
		// 		this.setFill(this.baseFill.lighter(delta)); 
		// 	} else throw new Error('unsupported fill type ' + this.baseFill);
	},	
})

SliderMorph.addMethods({
	adjustFill: function() {}
})

ClipMorph.addMethods({
	setupClipNode: function() { },
	setBounds: function($super, bnds) { // this reshapes
		$super(bnds);
		// this.clip.setClipShape(this.shape);
	},
})