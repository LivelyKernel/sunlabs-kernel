module('lively.oldCore.Morphs').requires('lively.OldModel', 'lively.oldCore.Misc').toRun(function() {

// ===========================================================================
// Morph functionality
// ===========================================================================

Object.subclass('MouseHandlerForDragging', {

	handleMouseEvent: function(evt, targetMorph) {
		if (evt.type == "MouseDown") evt.hand.setMouseFocus(targetMorph);
		evt.hand.resetMouseFocusChanges();

		var handler = targetMorph[evt.handlerName()];
		if (handler) handler.call(targetMorph, evt, targetMorph);

		if (evt.type == "MouseUp") {
			// cancel focus unless it was set in the handler
			if (evt.hand.resetMouseFocusChanges() == 0) {
				evt.hand.setMouseFocus(null);
			}
		}
		return true; 
	},

    handlesMouseDown: Functions.False
});

Object.subclass('MouseHandlerForRelay', {

	defaultEventSpec: {onMouseDown: "onMouseDown", onMouseMove: "onMouseMove", onMouseUp: "onMouseUp"},
	
	initialize: function (target, eventSpec) {
		//  Send events to a different target, with different methods
		//    Ex: box.relayMouseEvents(box.owner, {onMouseUp: "boxReleased", onMouseDown: "boxPressed"})
		this.target = target;
		this.eventSpec = eventSpec || this.defaultEventSpec;
	},

	handleMouseEvent: function(evt, originalTarget) {
		if (evt.type == "MouseDown") evt.hand.setMouseFocus(originalTarget);
		evt.hand.resetMouseFocusChanges();

		var handler = this.target[this.eventSpec[evt.handlerName()]];
		if (handler) handler.call(this.target, evt, originalTarget);

		if (evt.type == "MouseUp") {
			// cancel focus unless it was set in the handler
			if (evt.hand.resetMouseFocusChanges() == 0) {
				evt.hand.setMouseFocus(null);
			}
		}
		return true; 
	},

    handlesMouseDown: Functions.True

});

/**
 * Morph Class 
 */
lively.data.Wrapper.subclass('Morph');

Object.extend(Morph, {
	// Functions for change management
  	// this static function is needed to bind it during the defintion of some Morph methods
	onLayoutChange: function(fieldName) { 
		return function layoutChangeAdvice(/* arguments*/) {
			var priorExtent = this.innerBounds().extent();
			this.changed();
			var args = $A(arguments);
			var proceed = args.shift();
			var result = proceed.apply(this, args);
			this.layoutChanged(priorExtent);
			this.changed(); 
			return result;
		}
	},

	fromLiteral: function(literal) {
		var morph = new Morph(literal.shape);
		if (literal.submorphs) {
			if (Object.isArray(literal.submorphs))
				morph.setSubmorphs(literal.submorphs);
			else throw new TypeError();
		}
		if (literal.transforms) {
			morph.setTransforms(literal.transforms);
		}
		return morph;
	},

	// factory methods
	makeLine: function(verts, lineWidth, lineColor) {
		if (verts.length < 2) return;
		var morph = new PathMorph(verts);
		morph.applyStyle({fill: null, borderWidth: lineWidth || 1, borderColor: lineColor || Color.black});
		morph.enableInsertionPoints()
		return morph;

		// make a line with its origin at the first vertex
		// Note this works for simple lines (2 vertices) and general polylines
		// verts = verts.invoke('subPt', verts[0]);
		// var shape = new lively.scene.Polyline(verts);
		// var morph = new Morph(shape);
		// morph.setBorderWidth(lineWidth);
		// morph.setBorderColor(lineColor);
		// morph.setFill(null);
		// return morph;
	},

	makeCircle: function(location, radius, lineWidth, lineColor, fill) {
		// make a circle of the given radius with its origin at the center
		var morph = new Morph(new lively.scene.Ellipse(location, radius));
		morph.setBorderWidth(lineWidth);
		morph.setBorderColor(lineColor);
		morph.setFill(fill || Color.blue);
		return morph;
	},

	makeEllipse: function(bounds, lineWidth, lineColor, fill) {
		// make a circle first (a bit wasteful)
		var morph = this.makeCircle(bounds.center(), 0, lineWidth, lineColor, fill);
		morph.setBounds(bounds);
		morph.moveOriginBy(morph.innerBounds().center())
		return morph;
	},

	makeRectangle: function(/**/) {
		var morph;
		switch (arguments.length) {
			case 1: // rectangle
			if (!(arguments[0] instanceof Rectangle)) throw new TypeError(arguments[0] + ' not a rectangle');
			morph = new Morph(new lively.scene.Rectangle(arguments[0]));
			break;
			case 2: // location and extent
			morph = new Morph(new lively.scene.Rectangle(arguments[0].extent(arguments[1])));
			break;
			case 4: // x,y,width, height
			morph = new Morph(new lively.scene.Rectangle(new Rectangle(arguments[0], arguments[1], arguments[2], arguments[3])));
			break;
			default:
			throw new Error("bad arguments " + arguments);
		}
		return morph.applyStyle({borderWidth: 1, borderColor: Color.black, fill: Color.blue});
	},

	makePolygon: function(verts, lineWidth, lineColor, fill) {
		var morph = new Morph(new lively.scene.Polygon(verts));
		morph.setBorderWidth(lineWidth);
		morph.setBorderColor(lineColor);
		morph.setFill(fill);
		return morph;
		//return morph.applyStyle({fill: fill, borderWidth: lineWidth, borderColor: lineColor});
	},

	makeStar: function(position) {
		var makeStarVertices = function(r,center,startAngle) {
			var vertices = [];
			var nVerts = 10;
			for (var i=0; i <= nVerts; i++) {
				var a = startAngle + (2*Math.PI/nVerts*i);
				var p = Point.polar(r,a);
				if (i%2 == 0) p = p.scaleBy(0.39);
				vertices.push(p.addPt(center)); 
			}
			return vertices; 
		}
		var morph = Morph.makePolygon(makeStarVertices(50,pt(0,0),0), 1, Color.black, Color.yellow);
		morph.setPosition(position);
		return morph
	},
	
	makeCurve: function(verts, ctrls, closed) {
		// Make up a new quadratic spline from the supplied vertices and control points.
		// ctrls[i] is the ctrl point for segment from verts[i-1] to verts[i].  (ctrls[0] is never used)
		if (verts.length < 2) return;
		// console.log("verts = " + Object.inspect(verts));
		// console.log("ctrls = " + Object.inspect(ctrls));
		var g = lively.scene;
		var cmds = [];
		cmds.push(new g.MoveTo(true, verts[0].x,  verts[0].y));
		for (var i=1; i<verts.length; i++) {
			cmds.push(new g.QuadCurveTo(true, verts[i].x, verts[i].y, ctrls[i].x, ctrls[i].y));
		}
		var morph = new Morph(new g.Path(cmds));
		if (closed) morph.applyStyle({ fill: Color.red, borderWidth: 1, borderColor: Color.black});
			else morph.applyStyle({ fill: null, borderWidth: 3, borderColor: Color.red});
		return morph;
	},

	makeHeart: function(position) {
		var g = lively.scene;
		var shape = new g.Path([
			new g.MoveTo(true, 0,  0),
			new g.CurveTo(true, 48.25, -5.77),
			new g.CurveTo(true, 85.89, 15.05),
			new g.CurveTo(true, 61.36, 32.78),
			new g.CurveTo(true, 53.22, 46.00),
			new g.CurveTo(true, 25.02, 68.58),
			new g.CurveTo(true, 1.03,  40.34),
			new g.CurveTo(true, 0,  0),
		]);
		var morph = new Morph(shape);
		morph.applyStyle({ fill: Color.red, borderWidth: 3, borderColor: Color.red});
		morph.setPosition(position);
		morph.rotateBy(3.9);
		return morph
	},
});

Morph.addMethods('settings', {
    documentation: "Base class for every graphical, manipulatable object in the system", 

	doNotSerialize: ['fullBounds'],

    // prototype vars
	name: '',
    rotation: 0.0,
    scalePoint: pt(1,1),

    style: {},

    focusHaloBorderWidth: 2,

    fishEye: false,        // defines if fisheye effect is used
    fisheyeScale: 1.0,     // set the default scaling to 1.0
    fisheyeGrowth: 1.0,    // up to fisheyeGrowth size bigger (1.0 = double size)
    fisheyeProximity: 0.5, // where to react wrt/ size (how close we need to be)

    keyboardHandler: null, //a KeyboardHandler for keyboard repsonse, etc
    layoutHandler: null, //a LayoutHandler for special response to setExtent, etc
    openForDragAndDrop: true, // Submorphs can be extracted from or dropped into me
    mouseHandler: MouseHandlerForDragging.prototype, //a MouseHandler for mouse sensitivity, etc

  	// deprecated
  	noShallowCopyProperties: ['id', 'rawNode', 'shape', 'submorphs', 'defs', 'activeScripts', 'nextNavigableSibling', 'focusHalo', 'fullBounds'], 

	doNotCopyProperties: ['id', 'rawNode', 'shape', 'submorphs', 'defs', 'activeScripts', 'nextNavigableSibling', 'focusHalo', 'fullBounds'],

    isEpimorph: false, // temporary additional morph that goes away quickly, not included in bounds
	ignoreWhenCopying: false, // hint, that the morph should not be serialized or copied

    suppressBalloonHelp: Config.suppressBalloonHelp,

    nextNavigableSibling: null, // keyboard navigation

},
'initializing', {

    initialize: function(shape) {
		//console.log('initializing morph %s %s', initialBounds, shapeType);
		this.internalInitialize(this.createRawNode(), true);
		dbgOn(!shape.bounds);
		// we must make sure the Morph keeps its original size (wrt/fisheyeScale)
		if (this.fisheyeScale != 1) this.scalePoint = this.scalePoint.scaleBy(1 / this.fisheyeScale);
		this.origin = shape.getOrigin();
		shape.translateBy(this.origin.negated());
		this.initializePersistentState(shape);
		this.initializeTransientState();
    },

	createRawNode: function() { return NodeFactory.create("g") },
		
	internalInitialize: function(rawNode, shouldAssign) {
		this.rawNode = rawNode;
		this.submorphs = [];
		this.owner = null;
		if (shouldAssign) {
			LivelyNS.setType(this.rawNode, this.getType());
			this.setId(this.newId());
		}
	},

	initializePersistentState: function(shape) {
		// a rect shape by default, will change later
		this.shape = shape;
		this.rawNode.appendChild(this.shape.rawNode);
		if (this.styleClass) { // inherited from prototype
			var attr = this.styleClass.join(' ');
			this.rawNode.setAttribute("class", attr);
			// Safari needs the explicit assignment (perhaps the names have to be real stylesheets).
			this.rawNode.className.baseVal = attr;
		}
		this.applyStyle(this.style);
		return this;
	},

    // setup various things 
	initializeTransientState: function() { 
		this.fullBounds = null; // a Rectangle in owner coordinates
		this.priorExtent = this.innerBounds().extent();
		// this includes the shape as well as any submorphs
		// cached here and lazily computed by bounds(); invalidated by layoutChanged()

		// this.created = false; // exists on server now
		// some of this stuff may become persistent
	},

},
'copying', {

	okToDuplicate: Functions.True,  // default is OK
	
	shallowCopy: function () {
		// Return a copy of this morph with no submorphs, but 
		//  with the same shape and shape attributes as this
		return new Morph(this.shape.copy()); 
	},

	duplicate: function () { 
		// Return a full copy of this morph and its submorphs, with owner == null
		var copier = new Copier()
		var copy = this.copy(copier);
		copier.finish()
		copy.owner = null;
		return copy;
	},

    
	copySubmorphsFrom: function(copier, other) {			
		// console.log("copy submorphs from " + other);
		if (other.hasSubmorphs()) { // deep copy of submorphs
			other.submorphs.forEach(function each(m) {
				if (m.isEpimorph || m.ignoreWhenCopying) {
					// console.log("ignore " + m)
					return; // ignore temp morphs
				};
				var copy = m.copy(copier);
				copier.addMapping(m.id(), copy);
				copy.owner = null;	// Makes correct transfer of transform in next addMorph
				this.addMorph(copy);
				if (copy.owner !== this)
					console.log("ERROR could not add: " + copy + " to " + this)
			}, this);
		};
	},
	
	copyAttributesFrom: function(copier, other) {

		for (var p in other) {
			if ((other[p] instanceof Function && !other[p].hasLivelyClosure) || !other.hasOwnProperty(p) || this.noShallowCopyProperties.include(p))
				continue;

			if (other[p] instanceof Morph) {
				var replacement = (p === "owner") ? null : copier.copyOrPatchProperty(p, this, other);
				if (this[p]  && replacement && replacement !== this[p] && this.submorphs.include(this[p])) {
					// when the morph is replaced from the attribute it probably should also removed from the submorphs
					// this should fix the problem with node creation in initializePersistentState
					this.removeMorph(this[p]);					
				}
				this[p] = replacement || other[p];
				// if(replacement)
				//	console.log("found no replacement for: " + other[p].id());
				// console.log("replace '"+ p +"' with morph: " + this[p].id())
				// an instance field points to a submorph, so copy
				// should point to a copy of the submorph
				continue;
			}
								
			if (other[p] instanceof lively.scene.Image) {
				this[p] = other[p].copy(copier);
				this.addWrapper(this[p]);
				continue
			}

			// TODO: move logic to bindings.js
			if (p == 'attributeConnections') {
				this[p] = other[p].collect(function(con) {
					return con.copy(copier)		
				})
				continue;
			};
			// no gradients?
			if (other[p] instanceof lively.paint.Gradient) 
				continue;

			// default case
			copier.copyProperty(p, this, other)
	
		};
	},

	copyActiveScriptsFrom: function(copier, other) {
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
	},

	copyModelFrom: function(copier, other) {
		// try to be clever with Relays
		if(other.formalModel && (this.formalModel.delegate instanceof Record)) {
			var replaceModel = copier.lookup(other.getModel().id());
			if (replaceModel) {
					this.connectModel(replaceModel.newRelay(this.formalModel.definition));
			}
		};
	},

	copyFrom: function(copier, other) {
		
		this.internalInitialize(other.rawNode.cloneNode(false), true);
		copier.addMapping(other.id(), this);
		
		this.pvtSetTransform(this.getTransform());
		
		// creates new childNodes of rawNode, that may not be wanted
		this.initializePersistentState(other.shape.copy(copier));

		this.copySubmorphsFrom(copier, other);

		this.copyAttributesFrom(copier, other); 		
		this.copyModelFrom(copier, other);

		this.internalSetShape(other.shape.copy());
		this.origin = other.origin.copy();

		if (other.pvtCachedTransform) { 
			this.pvtCachedTransform = other.pvtCachedTransform.copy();
		} 
		
		this.initializeTransientState();
		this.copyActiveScriptsFrom(copier, other)

		this.layoutChanged();
		return this; 
	},

},
'serialization', {
	
	deserialize: function($super, importer, rawNode) {
		// FIXME what if id is not unique?
		$super(importer, rawNode);
	
		this.internalInitialize(rawNode, false);
		this.pvtSetTransform(this.getTransform());

		this.restoreFromSubnodes(importer);
		this.restorePersistentState(importer);    

		if (!this.shape) { 
			console.log("Error in Morph.deserialize(): I have no shape! Fall back to Rectangle!");
			var shape = new lively.scene.Rectangle(new Rectangle(0, 0, 100, 100));
			this.initializePersistentState(shape);
			this.applyStyle({fill: Color.red});
		};

		this.initializeTransientState();
		importer.verbose && console.log("deserialized " + this);
	},

	prepareForSerialization: function($super, extraNodes, optSystemDictionary) {	
		// this is the morph to serialize
		var fill = this.getFill();
		if (optSystemDictionary && fill instanceof lively.paint.Gradient) {
			var rawPropNode = optSystemDictionary.ownerDocument.getElementById(fill.id());
			if (rawPropNode) {
				// do nothing				
			} else {
				optSystemDictionary.appendChild(fill.rawNode.cloneNode(true));
			};
		};
		
		
		if (Config.useTransformAPI) {
			// gotta set it explicitly, it's not in SVG
			this.setTrait("transform", this.getTransform().toAttributeValue());
			// FIXME, remove?
		}
		return $super(extraNodes, optSystemDictionary);
	},
    
	restorePersistentState: function(importer) {
		var pointerEvents = this.getTrait("pointer-events");
		if (pointerEvents == "none") {
			this.ignoreEvents();
		} else if (pointerEvents) {
			console.log("can't handle pointer-events " + pointerEvents);
		}
		return; // override in subclasses
	},

	restoreFromSubnode: function(importer, node) {
		// Override me
	},

	restoreFromDefsNode: function(importer, node) {
	    // the only one handled here "code"
		var codeNodes = [];
    	if (!Config.skipChanges) { // Can be blocked by URL param 
        	var codes = node.getElementsByTagName("code");
        	for (var j = 0; j < codes.length; j++) { codeNodes.push(codes.item(j)) };
			if (codeNodes.length > 1) console.warn('More than one code node');
			// ChangeSet of World gets evaluated in main
    	}
	},

    restoreFromSubnodes: function(importer) {
        //  wade through the children
        var children = [];
        var helperNodes = [];

        for (var desc = this.rawNode.firstChild; desc != null; desc = desc.nextSibling) {
            if (desc.nodeType == Node.TEXT_NODE || desc.nodeType == Node.COMMENT_NODE) {
                if (desc.textContent == "\n") 
                    helperNodes.push(desc); // remove newlines, which will be reinserted for formatting
                continue; // ignore whitespace and maybe other things
            }
            var type = lively.data.Wrapper.getEncodedType(desc);
            // depth first traversal

			// WebCards...
		 	// if (type && !type.startsWith("anonymous_")) { //I have no idea what that mean

            if (type) {
                var wrapper = importer.importWrapperFromNode(desc);
                if (wrapper instanceof Morph) {
                    this.submorphs.push(wrapper); 
                    wrapper.owner = this;
                } else children.push(desc);
            } else {
                children.push(desc);
            }
        }

        for (var i = 0; i < children.length; i++) {
            var node = children[i];
            var shape = lively.scene.Shape.importFromNode(importer, node);
            if (shape) {
                this.shape = shape;
                continue;
            }
            switch (node.localName) {
                // nodes from the Lively namespace
            case "field": {
                // console.log("found field " + Exporter.stringify(node));
                helperNodes.push(node);
                this.deserializeFieldFromNode(importer, node);          
                break;
            }
            case "widget": {
                this.deserializeWidgetFromNode(importer, node);
                break;
            }
            case "array": {
                helperNodes.push(node);
                this.deserializeArrayFromNode(importer, node);
                break;
            }
            case "relay": {
                this.deserializeRelayFromNode(importer, node);
                break;
            }
            case "record": {
                this.deserializeRecordFromNode(importer, node);
                break;
            }
            case "defs": { 
				this.restoreFromDefsNode(importer, node);
                break;
            }
            default: {
                if (node.nodeType === Node.TEXT_NODE) {
                    //console.log('text tag name %s', node.tagName);
                    // whitespace, ignore
                } else if (!this.restoreFromSubnode(importer, node)) {
                    console.warn('not handling %s, %s', node.tagName || node.nodeType, node.textContent);
                }
            }
            }
        } // end for

        for (var i = 0; i < helperNodes.length; i++) {
            var n = helperNodes[i];
            n.parentNode.removeChild(n);
        }
    },

	resolveUriToObject: function(uri) {
		if (this.id() == uri)
			return this;
		if (this.ownerWidget) {
			var result = this.ownerWidget.resolveUriToObject(uri)
			if (result)
				return result;
		};	
		for (var i=0; i < this.submorphs.length; i++) {
			var result = this.submorphs[i].resolveUriToObject(uri);
			if (result)
				return result;
		}
		return null
	},
		
	// Fill Garbage Collection on Serialization...
	collectAllUsedFills: function(/*$super, */result) {
		// result = $super(result);
		var fill = this.getFill();
		if (fill instanceof lively.paint.Gradient) result.push(fill);
		var stroke = this.shape.getStroke(); // fixme
		if (stroke instanceof lively.paint.Gradient) result.push(stroke);
		if (this.submorphs) this.submorphs.invoke('collectAllUsedFills', result);
		return result
	},

	exportLinkedFile: function(filename) {
		var url;
		if (Global["WikiNavigator"] && WikiNavigator.current) {
			var nav = WikiNavigator.current;
			url = WikiNavigator.fileNameToURL(filename);
			nav.interactiveSaveWorld(url);
		} else {
			url = WorldMorph.current().saveWorld(filename);
		}
		if (url) this.world().reactiveAddMorph(new ExternalLinkMorph(url));
		return url;
	},

},
'accessing', {
	getName: function() { return this.name },

	setName: function(str) { this.name = str; return name },

	canvas: function() {
		return locateCanvas(this.rawNode);
	},
	
    getOwnerWidget: function() {
		return this.ownerWidget || this.owner.getOwnerWidget();
	},

	ownerChain: function() {
		// Return an array of me and all my owners
		// First item is, eg, world; last item is me
		if (!this.owner) return [this];
		var owners = this.owner.ownerChain();
		owners.push(this);
		return owners;
	},

},
'styling',{	// tmp copy

	getStyleClass: function() { return this.styleClass || [] },

	setStyleClass: function(value) {
		var attr;
		if (value instanceof Array) {
			this.styleClass = value;
			attr = value.join(' ');
		} else {
			this.styleClass = [value];
			attr = String(value);
		}
		this.rawNode.setAttribute("class", attr);
		return value;
	},

	applyStyle: function(specs) { // note: use reflection instead?
		for (var i = 0; i < arguments.length; i++) {
			var spec = arguments[i];
			if(!spec) return;  // dbgOn(!spec);

			if (spec.position !== undefined) this.setPosition(spec.position);
			if (spec.extent !== undefined) this.setExtent(spec.extent);
			if (spec.scale !== undefined) this.setScale(spec.scale);
			if (spec.rotation !== undefined) this.setRotation(spec.rotation);

			if (spec.borderWidth !== undefined) this.setBorderWidth(spec.borderWidth);
			if (spec.borderColor !== undefined) this.setBorderColor(spec.borderColor);
			if (spec.fill !== undefined) this.setFill(spec.fill);
			if (spec.opacity !== undefined) {
				this.setFillOpacity(spec.opacity);
				this.setStrokeOpacity(spec.opacity); 
			}
			if (spec.fillOpacity !== undefined) this.setFillOpacity(spec.fillOpacity);
			if (spec.strokeOpacity !== undefined) this.setStrokeOpacity(spec.strokeOpacity);

			if (this.shape.roundEdgesBy && spec.borderRadius !== undefined) { 
				this.shape.roundEdgesBy(spec.borderRadius);
			}
			if (spec.suppressGrabbing !== undefined) this.suppressGrabbing = spec.suppressGrabbing;
			if (spec.suppressHandles !== undefined) this.suppressHandles = spec.suppressHandles;

			if (spec.focusHaloBorderWidth !== undefined) this.focusHaloBorderWidth = spec.focusHaloBorderWidth;
			if (spec.focusHaloInset !== undefined) this.focusHaloInset = spec.focusHaloInset;
			if (spec.padding !== undefined) this.padding = spec.padding;
			if (spec.margin !== undefined) this.margin = spec.margin;
		}
		return this;
	},

	makeStyleSpec: function() {
		// Adjust all visual attributes specified in the style spec
		var spec = { };
		spec.borderWidth = this.getBorderWidth();
		spec.borderColor = this.getBorderColor();
		spec.fill = this.getFill();
		if (this.shape.getBorderRadius) spec.borderRadius = this.shape.getBorderRadius() || 0.0;
		spec.fillOpacity = typeof this.shape.getFillOpacity() !== undefined ? this.shape.getFillOpacity() : 1.0;
		spec.strokeOpacity = typeof this.shape.getStrokeOpacity() !== undefined ?  this.shape.getStrokeOpacity() : 1.0;		
		return spec;
	},

	applyStyleNamed: function(name) {
		var style = this.styleNamed(name);
		if (style) this.applyStyle(style);
		else console.warn("applyStyleNamed: no style named " + name)
	},

	styleNamed: function(name) {
		// Look the name up in the Morph tree, else in current world
		if (this.displayTheme) return this.displayTheme[name];
		if (this.owner) return this.owner.styleNamed(name);
		var world = WorldMorph.current();
		if (world && (this !== world)) return world.styleNamed(name);
		return DisplayThemes[Config.defaultDisplayTheme || "lively"][name]; // FIXME for onDeserialize, when no world exists yet
	},

	linkToStyles: function(styleClassList, optSupressApplication) {
		// Record the links for later updates, and apply them now
		this.setStyleClass(styleClassList);
		if (!optSupressApplication) this.applyLinkedStyles();
		return this;
	},

	applyLinkedStyles: function() {
		// Apply all the styles to which I am linked, in order
		var styleClasses = this.getStyleClass();
		if (!styleClasses) return;
		for (var i = 0; i < styleClasses.length; i++) {
			this.applyStyleNamed(styleClasses[i]); 
		}
	},
},
'appearance', { // Functions for manipulating the visual attributes of Morphs
	
	setFill: function(fill) {
		this.shape.setFill(fill);
		this.changed();
		return fill;
	},

	getFill: function() { return this.shape.getFill() },

	setBorderColor: function(newColor) {
		this.shape.setStroke(newColor);
		// this.changed();
		return newColor
	},

	getBorderColor: function() {
		return new Color(Importer.marker, this.shape.getStroke());
	},

	// FIXME for Chrome border bug
	nearlyZeroBorderWidth: 0.00001,

	setBorderWidth: function(newWidth) {
		if (!newWidth) newWidth = 0;		
		var oldWidth = this.getBorderWidth();
		if (newWidth === oldWidth) return;

		// Opt: only notify change with the bigger of two bounds
		if (oldWidth > newWidth) this.changed();
		this.shape.setStrokeWidth(newWidth); 
		if (newWidth > oldWidth) this.changed();
		return newWidth
	},

	getBorderWidth: function() {
		return this.shape.getStrokeWidth() || 0; // FIXME: fix defaults logic
	},

 	setBorderRadius: function(r) {//jd
    	this.shape.roundEdgesBy(r);
		this.changed();
		return r
    },

 	getBorderRadius: function() {
		return this.shape.getBorderRadius(); 
	},

	shapeRoundEdgesBy: function(r) {
		this.setBorderRadius(r);
	},

	getFillOpacity: function() { return this.shape.getFillOpacity(); },

	setFillOpacity: function(op) {
		this.shape.setFillOpacity(op);
		this.changed(); // FIXME better use specific update
		return op;
	},

	setStrokeOpacity: function(op) { 
		this.shape.setStrokeOpacity(op);
		this.changed(); // FIXME better use specific update
		return op;
	},

	getStrokeOpacity: function() { return this.shape.getStrokeOpacity() },

    setLineJoin: function(joinType) { this.shape.setLineJoin(joinType); return joinType },

	getLineJoin: function() { return this.shape.getLineJoin() }, 

    setLineCap: function(capType) { this.shape.setLineCap(capType); return capType },

 	getLineCap: function() { return this.shape.getLineCap() },

    // toggle fisheye effect on/off
	toggleFisheye: function() { 
		// if fisheye is true, we need to scale the morph to original size
		if (this.fishEye) {
			this.setScale(this.getScale() / this.fisheyeScale);
			this.setFisheyeScale(1.0);
		}
		// toggle fisheye
		this.fishEye = !this.fishEye;
	},

	// sets the scaling factor for the fisheye between 1..fisheyeGrowth
	setFisheyeScale: function (newScale) {
		// take the original centerpoint
		var p = this.bounds().center();

		this.fisheyeScale = newScale;
		this.pvtCachedTransform = null;
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
	},

	isVisible: function() { // FIXME delegate to sceneNode when conversion finished
		// Note: this may not be correct in general in SVG due to inheritance,
		// but should work in LIVELY.
		var hidden = this.rawNode.getAttributeNS(null, "display") == "none";
		return hidden == false;
	},

	setVisible: function(flag) { // FIXME delegate to sceneNode when conversion finished
		if (flag) this.rawNode.removeAttributeNS(null, "display");
		else this.rawNode.setAttributeNS(null, "display", "none");
		return this;
	},
	
	applyFilter: function(filterUri) {// FIXME delegate to sceneNode when conversion finished
		if (filterUri) 
			this.rawNode.setAttributeNS(null, "filter", filterUri);
		else
			this.rawNode.removeAttributeNS(null, "filter");
	},
	
},
'shape related', {

	// NOTE:  The following four methods should all be factored into a single bit of reshaping logic
	applyFunctionToShape: function() {  // my kingdom for a Smalltalk block!
		var args = $A(arguments);
		var func = args.shift();
		func.apply(this.shape, args);
		this.adjustForNewBounds();
	}.wrap(Morph.onLayoutChange('shape')),

	internalSetShape: function(newShape) {
		if (!newShape.rawNode) {
			console.log('newShape is ' + newShape);
			lively.lang.Execution.showStack();
		}

		this.rawNode.replaceChild(newShape.rawNode, this.shape.rawNode);
		this.shape = newShape;
		this.adjustForNewBounds();
	},

	setShape: function(newShape) {
		this.internalSetShape(newShape);
		return newShape;
	}.wrap(Morph.onLayoutChange('shape')),

	reshape: function(partName, newPoint, lastCall) {
		try {
			return this.shape.reshape(partName,newPoint,lastCall);
		} finally {
			// FIXME: consider converting polyline to polygon when vertices merge.
			if (this.layoutManager && this.layoutManager.onReshape) this.layoutManager.onReshape(this);
		}
	}.wrap(Morph.onLayoutChange('shape')),

	setVertices: function(newVerts) {
		// particular to polygons
		this.shape.setVertices(newVerts);
		this.adjustForNewBounds();
		return newVerts;
	}.wrap(Morph.onLayoutChange('shape')),

	beClipMorph: function() {
		// For simple morphs (rectangles, ellipses, polygons) this will cause all submorphs
		// to be clipped to the shape of this morph.
		// Note: the bounds function should probably be copied from ClipMorph as
		//		part of this mutation
		var defs = this.rawNode.appendChild(NodeFactory.create('defs'));
		this.clip = new lively.scene.Clip(this.shape);
		defs.appendChild(this.clip.rawNode);
		this.clip.applyTo(this);
		this.isClipMorph = true;
	},

},
'layouting',{

    // FIXME: this doesn't account properly for border width
    // the CSS box model, see http://www.w3.org/TR/REC-CSS2/box.html    
    padding: new Rectangle(0, 0, 0, 0), // between morph borders and its content (inwards)
    margin: new Rectangle(0, 0, 0, 0), // between morph border and its siblings
    
	layoutManager: null, // singleton, intialzided later

	// Simple hack until the layout manager can relayout
	relayout: function() {
		if (this.layoutManager) this.layoutManager.layout(this);
	},

	setBounds: function(newRect) {
		if (!newRect) return;
		this.layoutManager.setBounds(this, newRect);
		return newRect;
	}.wrap(Morph.onLayoutChange('shape')),

	setExtent: function(newExtent) {
		this.layoutManager.setExtent(this, newExtent);
		return newExtent;
	},

	getExtent: function(newRect) { return this.shape.bounds().extent() },

	position: function() { // Deprecated -- use getPosition
		return this.shape.bounds().topLeft().addPt(this.origin); 
	},

	getPosition: function() {
		return this.shape.bounds().topLeft().addPt(this.origin); 
	},

	setPosition: function(newPosition) {
		this.layoutManager.setPosition(this, newPosition);
		return newPosition;
	},

	containsPoint: function(p) { 
		// p is in owner coordinates
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
		if (this.owner == null) return this.fullContainsPoint(p);
		return this.fullContainsPoint(this.owner.localize(p)); 
	},

	// Morph bounds, coordinates, moving and damage reporting functions
    // bounds returns the full bounding box in owner coordinates of this morph and all its submorphs
	bounds: function(ignoreTransients, ignoreTransform) {
		if (this.fullBounds != null) return this.fullBounds;

		var tfm = this.getTransform();
		var fullBounds = this.localBorderBounds(ignoreTransform ? null : tfm);

		var subBounds = this.submorphBounds(ignoreTransients);
		if (subBounds != null) {
			// could be simpler when no rotation...
			fullBounds = fullBounds.union(tfm.transformRectToRect(subBounds));
		}

		if (fullBounds.width < 3 || fullBounds.height < 3) {
			// Prevent Horiz or vert lines from being ungrabable
			fullBounds = fullBounds.expandBy(3); 
		}
		this.fullBounds = fullBounds;
		return fullBounds; 
	},
    
	submorphBounds: function(ignoreTransients) {
		var subBounds = null;
		for (var i = 0; i < this.submorphs.length; i++) {
			var m = this.submorphs[i];
			if ((ignoreTransients && m.isEpimorph))
				continue;
			if (!m.isVisible()) {
				continue;
			}
			subBounds = subBounds == null ? m.bounds(ignoreTransients) : subBounds.union(m.bounds(ignoreTransients));
		}
		return subBounds;
	},
    
    // innerBounds returns the bounds of this morph only, and in local coordinates
    innerBounds: function() { 
        return this.shape.bounds().insetByRect(this.padding);
    },
    
	localBorderBounds: function(optTfm) {
		// defined by the external edge of the border
		// if optTfm is defined, transform the vertices first, then take the union
		dbgOn(!this.shape);
		var bounds = optTfm ? Rectangle.unionPts(this.shape.vertices().invoke('matrixTransform', optTfm)) : this.shape.bounds();

		var borderMargin = this.getBorderWidth()/2;
		// double border margin for polylines to account for elbow protrusions
		if (this.shape.hasElbowProtrusions) borderMargin = borderMargin*2 + 1;
		bounds = bounds.expandBy(borderMargin);
		return bounds;
	},
	
	changed: function() {
		// Note most morphs don't need this in SVG, but text needs the 
		// call on bounds() to trigger layout on new bounds
		if(this.owner) this.owner.invalidRect(this.bounds());
	},

	invalidRect: function() {
		// Do nothing (handled by SVG).  Overridden in canvas.
    },

    layoutOnSubmorphLayout: function(submorph) {
		// override to return false, in which case layoutChanged() will not be propagated to
		// the receiver when a submorph's layout changes. 
		return true;
    },

	transformChanged: function() {
		var scalePt = this.scalePoint;
		if (this.fisheyeScale != 1) scalePt = scalePt.scaleBy(this.fisheyeScale);
		this.pvtCachedTransform = new lively.scene.Similitude(this.origin, this.rotation, scalePt);
		this.pvtCachedTransform.applyTo(this.rawNode);
		this.signalGeometryChange();
	},

	layoutChanged: function Morph$layoutChanged() {
		// layoutChanged() is called whenever the cached fullBounds may have changed
		// It invalidates the cache, which will be recomputed when bounds() is called
		// Naturally it must be propagated up its owner chain.
		// Note the difference in meaning from adjustForNewBounds()
		// KP: the following may or may not be necessary:

		this.transformChanged(); // DI: why is this here?
		if(! this.fullBounds) return;  // already called

		this.fullBounds = null;
		if (this.owner && this.owner.layoutOnSubmorphLayout(this) && !this.isEpimorph) {     // May affect owner as well...
			this.owner.layoutChanged();
		}
		this.layoutManager.layoutChanged(this);
	},

	adjustForNewBounds: function() {
		// adjustForNewBounds() is called whenever the innerBounds may have changed in extent
		//  -- it should really be called adjustForNewExtent --
		// Depending on the morph and its layoutManager, it may then re-layout its
		// submorphs and, in the process, propagate the message down to leaf morphs (or not)
		// Of course a change in innerBounds implies layoutChanged() as well,
		// but, for now, these are called separately.
		// NB:  Because some morphs may re-lay themselves out in response to adjustForNewBounds()
		// adjustForNewBounds() *must never be called from* a layout operation;
		// The layout process should only move and resize submorphs, but never change the innerBounds

		// If this method is overridden by a subclass, it should call super as well
		if (this.focusHalo) this.adjustFocusHalo();
	},
},
// Submorph management functions
'submorphs',{ 

    addMorph: function(morph) { return this.addMorphFrontOrBack(morph, true) },

	addMorphAt: function(morph, position) {
		var morph = this.addMorphFrontOrBack(morph, true);
		morph.setPosition(position);
		return morph;
	},

    addMorphFront: function(morph) { return this.addMorphFrontOrBack(morph, true) },

    addMorphBack: function(morph) { return this.addMorphFrontOrBack(morph, false) },

	addMorphFrontOrBack: function(m, isFront) {
		console.assert(m instanceof Morph, "not an instance");
		if (m.owner) {
			var tfm = m.transformForNewOwner(this);
			m.owner.removeMorph(m); // KP: note not m.remove(), we don't want to stop stepping behavior
			m.setTransform(tfm); 
			// FIXME transform is out of date
			// morph.setTransform(tfm); 
			// m.layoutChanged(); 
		} 
		this.layoutManager.beforeAddMorph(this, m, isFront);
		this.insertMorph(m, isFront);
		this.layoutManager.afterAddMorph(this, m, isFront);
		m.changed();
		m.layoutChanged();
		if (Config.ChromeSVGRenderingHotfix)
			(function() { m.transformChanged() }).delay(0);
		this.layoutChanged();
		return m;
	},
	
	addNonMorph: function(node) {
		if (node instanceof lively.data.Wrapper) throw new Error("add rawNode, not the wrapper itself");
		return this.rawNode.insertBefore(node, this.shape && this.shape.rawNode.nextSibling);
	},

	addWrapper: function(w) {
		if (w && w.rawNode) {
			this.addNonMorph(w.rawNode);
			return w;
		} else return null;
	},

	addPseudoMorph: function(pseudomorph) {
		if (pseudomorph instanceof Global.PseudoMorph) {
			return this.addMorph(pseudomorph);
		} else 
			throw new Error(pseudomorph + " is not a PseudoMorph");
	},

	bringToFront: function() {
		if (!this.owner) return;
		if (this.owner.topSubmorph() === this) return;
		var owner = this.owner;
		this.remove();
		owner.addMorphFront(this);
	},

	setSubmorphs: function(morphs) {
		console.assert(morphs instanceof Array, "not an array");
		if (morphs != null) {
			this.submorphs = [].concat(morphs);
			this.submorphs.forEach(function (m) { 
				if (m.owner) {
					var tfm = m.transformForNewOwner(this);
					m.owner.removeMorph(m);
					m.setTransform(tfm); 
				} 
				this.rawNode.appendChild(m.rawNode); 
				m.owner = this;
				m.changed();
				m.layoutChanged();
			}, this);
		}
		this.layoutChanged();
	},

    indexOfSubmorph: function(m) {
		if (this.submorphs.length == 0) return -1;  // no submorphs at all
		for (var i=0; i<this.submorphs.length; i++) 
			if (this.submorphs[i] === m) return i;
    	return -1;  // not there
	},

	getInsertPositionFor: function(m, isFront) {
		if (this.submorphs.length == 0) return null; // if no submorphs, append to nodes
		return isFront ? this.submorphs.last().rawNode.nextSibling : this.submorphs.first().rawNode;
	},
	
	insertMorph: function(m, isFront) { // low level, more like Node.insertBefore?
		var insertionPt = this.getInsertPositionFor(m, isFront); // the last one, so drawn last, so front
		this.rawNode.insertBefore(m.rawNode, insertionPt);
		if (isFront) this.submorphs.push(m);
		else this.submorphs.unshift(m);
		m.owner = this;
		return m;
	},
	
	removeMorph: function(m) {// FIXME? replaceMorph() with remove as a special case
		this.layoutManager.beforeRemoveMorph(this, m);

		var index = this.submorphs.indexOf(m);
		if (index < 0) {
			m.owner !== this && console.log("%s has owner %s that is not %s?", m, m.owner, this);
			return null;
		}

		m.removeRawNode();
		var spliced = this.submorphs.splice(index, 1);
		if (spliced instanceof Array) spliced = spliced[0];
		if (m !== spliced) {
			console.log("invariant violated removing %s, spliced %s", m, spliced);
		}

		// cleanup, move to ?
		m.owner = null;
		m.setHasKeyboardFocus(false);

		this.layoutManager.afterRemoveMorph(this, m);
		return m;
    },

	removeAllMorphs: function() {
		this.changed();
		this.submorphs.invoke('removeRawNode');
		this.submorphs.clear();
		this.layoutChanged(); 
	},

	hasSubmorphs: function() {
		return this.submorphs.length != 0;
	},

	remove: function() {
		// Note this is the only removal method that stops stepping fo the morph structure
		if (!this.owner) return null;  // already removed

		this.stopAllStepping();
		this.changed();
		this.owner.removeMorph(this);

		return this;
	},

	withAllSubmorphsDo: function(func, rest) {
		// Call the supplied function on me and all of my submorphs by recursion.
		var args = $A(arguments);
		args.shift();
		func.apply(this, args);
		var submorphs = this.submorphs.clone();
		for (var i = 0; i < submorphs.length; i++)
			submorphs[i].withAllSubmorphsDo(func, rest);
	},

	invokeOnAllSubmorphs: function(selector, rest) {
		var args = $A(arguments);
		args.shift();
		var func = this[selector];
		func.apply(this, args);
		for (var i = 0; i < this.submorphs.length; i++)
		this.submorphs[i].invokeOnAllSubmorphs(selector, rest);
	},

	topSubmorph: function() {
		// the morph on top is the last one in the list
		return this.visibleSubmorphs().last();
	},

	visibleSubmorphs: function() {
		return this.submorphs.reject(function(ea) {return ea instanceof SchedulableAction})
	},

	getMorphNamed: function (name) {
		if (!this.submorphs) return null;
		for (var i = 0; i < this.submorphs.length; i++) {
			var morph = this.submorphs[i];
			if (morph.getName() === name) return morph;
		}
		for (var i = 0; i < this.submorphs.length; i++)  {
			var morph = this.submorphs[i].getMorphNamed(name);
			if (morph) return morph;
		}
		return null;
	},

	// morph gets an opportunity to shut down when WindowMorph closes 
	shutdown: function() { this.remove() },

},
// Morph bindings to its parent, world, canvas, etc.
'world',{

	world: function() {
		return this.owner ? this.owner.world() : null;
	},

	validatedWorld: function() {
		// Return the world that this morph is in, checking that it hasn't been removed
		if (this.owner == null) return null;
		if (this.owner.indexOfSubmorph(this) < 0) return null;
		return this.owner.validatedWorld();
	},

	openInWorld: function(loc, optName) {
        WorldMorph.current().addMorph(this);
        loc && this.setPosition(loc);
		if (optName) {
			var oldMorph = $morph(optName);
			if (oldMorph)
				oldMorph.remove();
			this.name = optName;
		}
    },

},
'conversion', {
	asLogo: function() {
		var shapes = [], copier = new Copier(), root = this;
		this.withAllSubmorphsDo(function() {
			var s = this.shape.copy(copier)
			// if (this !== root) this.getTransform().applyTo(s.rawNode)
			this.transformForNewOwner(root).applyTo(s.rawNode)

			shapes.push(s)

			if (!this.textContent) return // FIXME, overwrite in TextMorph
			var s = new lively.scene.Group(); // text nodes parent needs to be a group or other non-graphical object
			var textNode = this.textContent.copy(copier).rawNode;
			s.rawNode.appendChild(textNode)
			this.transformForNewOwner(root).applyTo(s.rawNode)
			shapes.push(s);
		})

		var logo = new Morph(new lively.scene.Group())
		logo.shape.setContent(shapes)
		logo.setTransform(root.getTransform())
		return logo;
	},

	// Extend Polylines and polygons to curves
	// FIXME: where is the difference to Morph.makeCurve?
	makeCurve: function() {
		//  Convert a polyline to a curve;  maybe a polygon to a blob  
		var verts = this.shape.vertices();
		var isClosed = this.shape instanceof lively.scene.Polygon;
		// Need closing vertext for closed curves
		if (verts.length < 2) return;
		if (isClosed && (!verts[0].eqPt(verts.last()))) 
			verts = verts.concat([verts[0]])
		var current = verts[0];
		var ctrl = current;
		var controlPts = [];
		controlPts.push(ctrl);
		for (var i=1; i<verts.length; i++) {  // compute default control points
			ctrl = current.subPt(ctrl).addPt(current);
			controlPts.push(ctrl);
			current = verts[i];
		}
		// Fix first control point if we have 3 or more verts
		if (verts.length <= 3) 
			controlPts[1] = verts[1].subPt(verts[2]).addPt(verts[1]);
		var morph = Morph.makeCurve(verts, controlPts, isClosed)
		this.world().addMorph(morph);
		morph.setPosition(this.position());
	},

},
'transform', { // Morph coordinate transformation functions

    // SVG has transform so renamed to getTransform()
    getTransform: function() {
		if (this.pvtCachedTransform) return this.pvtCachedTransform;
	
		if (Config.useTransformAPI) {
		    var impl = this.rawNode.transform.baseVal.consolidate();
		    this.pvtCachedTransform = new lively.scene.Similitude(impl ? impl.matrix : null); // identity if no transform specified
		} else {
		    // parse the attribute: by Dan Amelang
		    var s = this.rawNode.getAttributeNS(null, "transform");
		    //console.log('recalculating transform from ' + s);
		    var matrix = null;
		    var match = s && s.match(/(\w+)\s*\((.*)\)/);
		    if (match) {
			matrix = this.canvas().createSVGMatrix();
			var args = match[2].split(/(?:\s|,)+/).
			map(function(n) { return parseFloat(n) || 0; });
			switch (match[1]) {
			case 'matrix':
			    matrix.a = args[0]; matrix.b = args[1];
			    matrix.c = args[2]; matrix.d = args[3];
			    matrix.e = args[4]; matrix.f = args[5];
			    break;
			case 'translate':
			    matrix = matrix.translate(args[0], args[1] || 0); // may be just one arg
			    break;
			case 'scale':
			    matrix = matrix.scaleNonUniform(args[0], args[1] || 1.0);
			    break;
			case 'rotate':
			    // FIXME check:
			    matrix = matrix.translate(-args[1], -args[2]).rotate(args[0]).translate(args[1], args[2]);
			    console.log('made ' + matrix + ' from ' + args);
			    break;
			case 'skewX':
			    matrix = matrix.skewX(args[0]);
			    break;
			case 'skewY':
			    matrix = matrix.setSkewY(args[0]);
			    break;
			}
		    }
		    this.pvtCachedTransform = new lively.scene.Similitude(matrix);
		}
		return this.pvtCachedTransform;
    },

	pvtSetTransform: function(tfm) {
		this.origin = tfm.getTranslation();
		this.rotation = tfm.getRotation().toRadians();
		this.scalePoint = tfm.getScalePoint();
		// we must make sure the Morph keeps its original size (wrt/fisheyeScale)
		if (this.fisheyeScale != 1) this.scalePoint = this.scalePoint.scaleBy(1 / this.fisheyeScale);
		this.transformChanged();
	},

	setTransforms: function(array) {
		// FIXME update origin/rotation/scale etc?
		// collapse the transforms and apply the result?
		lively.scene.Node.prototype.setTransforms.call(this, array);
		this.transformChanged();
	},

    setTransform: function(tfm) { this.pvtSetTransform(tfm); }.wrap(Morph.onLayoutChange('transform')),

	transformToMorph: function(other) {
		// getTransformToElement has issues on some platforms
		dbgOn(!other);
		if (Config.useGetTransformToElement) {
			return this.rawNode.getTransformToElement(other.rawNode);
		} else {
			var tfm = this.getGlobalTransform();
			var inv = other.getGlobalTransform().createInverse();
			//console.log("own global: " + tfm + " other inverse " + inv);
			tfm.preConcatenate(inv);
			//console.log("transforming " + this + " to " + tfm);
			return tfm;
		}
	},

	getGlobalTransform: function() {
		var globalTransform = new lively.scene.Similitude();
		var world = this.world();
		for (var morph = this; morph != world; morph = morph.owner)
			globalTransform.preConcatenate(morph.getTransform());
		return globalTransform;
	},

	// mapping coordinates in the hierarchy
    // map local point to world coordinates
    worldPoint: function(pt) { 
		return pt.matrixTransform(this.transformToMorph(this.world())); 
    },

	// map owner point to local coordinates
	relativize: function(pt) { 
		if (!this.owner)
			throw new Error('no owner; call me after adding to a morph? ' + this);
		try {
			return pt.matrixTransform(this.owner.transformToMorph(this)); 
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
		if (this.world() == null) {
			// console.log('ERROR in '+  this.id() +' localize: '+ pt + ' this.world() is null');   
			// printStack();
			return pt;
		}
		return pt.matrixTransform(this.world().transformToMorph(this));
	},

    // map local point to owner coordinates
	localizePointFrom: function(pt, otherMorph) {
		try {
			return pt.matrixTransform(otherMorph.transformToMorph(this));
		} catch (er) {
			// lively.lang.Execution.showStack();
			console.log("problem " + er + " on " + this + " other " + otherMorph);
			return pt;
		}
	},

    transformForNewOwner: function(newOwner) {
		return new lively.scene.Similitude(this.transformToMorph(newOwner));
    },

},
'transform - accessors', {
	translateBy: function(delta) {
		this.changed();
		this.origin = this.origin.addPt(delta);
		// this.layoutChanged();
		// Only position has changed; not extent.  Thus no internal layout is needed
		this.transformChanged();
		if (this.fullBounds != null) this.fullBounds = this.fullBounds.translatedBy(delta);
		// DI: I don't think this can affect owner.  It may increase fullbounds
		//     due to stickouts, but not the bounds for layout...
		if (this.owner /* && this.owner !== this.world() */ && !this.isEpimorph) this.owner.layoutChanged(); 
		this.changed();
		return this; 
	},

	setRotation: function(theta) { // in radians
		this.rotation = theta;
		// layoutChanged will cause this.transformChanged();
	}.wrap(Morph.onLayoutChange('rotation')),
    
	setScale: function(scale/*:float*/) { 
		// While scalePoint carries both x- and y-scaling,
		//    getScale() and setScale() allow the use of simple, er, scalars
		this.setScalePoint(pt(scale, scale));
	},

	setScalePoint: function(sp) { 
		this.scalePoint = sp;
		// layoutChanged will cause this.transformChanged();
	}.wrap(Morph.onLayoutChange('scale')),

	gettranslation: function() { 
		return this.getTransform().getTranslation(); 
	},

	getRotation: function() { 
		// Note: the actual transform disambiguates scale and rotation as though scale.x > 0
		var rot = this.getTransform().getRotation().toRadians(); 
		if (this.scalePoint.x >= 0) return rot;

		// if scale.x is negative, then we have to decode the difference
		if (rot < 0) return rot + Math.PI;
		return rot - Math.PI;
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

	scaleBy: function(factor) {
		// Perform a linear scaling (based on x scale) by the given factor
		this.setScale(this.getScale()*factor);
	},

	throb: function() {
		this.scaleBy(this.getScale() <= 1 ? 2 : 0.9);
	},

	align: function(p1, p2) {
		return this.translateBy(p2.subPt(p1)); 
	},

    centerAt: function(p) {
		return this.align(this.bounds().center(), p); 
    },

	getCenter: function() { return this.bounds().center() },
	setCenter: function(pos) {
		this.setPosition(pos.subPt(this.shape.bounds().center()))
	},


	moveOriginBy: function(delta) {
		// This method changes the origin (and thus center of rotation) without changing any other effect
		// To center a rectangular morph, use m.moveOriginBy(m.innerBounds().center())
		this.origin = this.origin.addPt(delta);
		this.shape.translateBy(delta.negated());
		this.submorphs.forEach(function (ea) { ea.translateBy(delta.negated()); });
	},

    moveSubmorphs: function(evt) {
        var world = this.world();
	
        // Display height is returned incorrectly by many web browsers.
        // We use an absolute Y-value instead. 
        var towardsPoint = pt(world.bounds().center().x, 350);

        switch (evt.getKeyCode()) {
        case Event.KEY_LEFT:
            this.submorphs.invoke('moveBy', pt(-10,0));
            evt.stop();
            return true;
        case Event.KEY_RIGHT:
            // forget the existing selection
            this.submorphs.invoke('moveBy', pt(10, 0));
            evt.stop();
            return true;
        case Event.KEY_UP:
            this.submorphs.invoke('moveBy', pt(0, -10));
            evt.stop();
            return true;
        case Event.KEY_DOWN:
            this.submorphs.invoke('moveBy', pt(0, 10));
            evt.stop();
            return true;

            // Experimental radial scrolling feature
            // Read the comments near method Morph.moveRadially()
        case Event.KEY_PAGEUP:
        case 65: // The "A" key
	    world.submorphs.invoke('moveRadially', towardsPoint, 10);
            this.moveRadially(towardsPoint, 10);            
            evt.stop();
            return true;
        case Event.KEY_PAGEDOWN:
        case 90: // The "Z" key
	    world.submorphs.invoke('moveRadially', towardsPoint, -10);
            this.moveRadially(towardsPoint, -10);            
            evt.stop();
            return true;
        }
        
        return false;
    },

    transformSubmorphs: function(evt) {
		var fun = null;
		switch (evt.getKeyChar()) {
			case '>':
				fun = function(m) { m.setScale(m.getScale()*1.1) };
				break;
			case '<':
				fun = function(m) { m.setScale(m.getScale()/1.1) };
				break;
			case ']':
				fun = function(m) { m.setRotation(m.getRotation() + 2*Math.PI/16) };
				break;
			case '[':
				fun = function(m) { m.setRotation(m.getRotation() - 2*Math.PI/16) };
				break;
		}
		if (fun) {
			this.submorphs.forEach(fun);
			evt.stop();
			return true;
		} else return false;
	},

	moveForwardBy: function(amount) {
		var nose = pt(1,0)
		var dir = nose.matrixTransformDirection(this.getTransform()).normalized();
		this.moveBy(dir.scaleBy(amount))
	},

	// TODO: There is a bug in Safari (the matrix multiplication is the wrong way around)
	// that is not taken into account here....
	rotateAround: function(angle, center) {
		var tfm = new lively.scene.Similitude().toMatrix();
		tfm = tfm.translate(center.x, center.y);
		tfm = tfm.rotate(angle)		
		tfm = tfm.translate( -center.x, -center.y);	
		var oldTfm = this.getTransform().toMatrix();
		var newTfm = oldTfm.multiply(tfm);
		this.setTransform(new lively.scene.Similitude(newTfm));
	},

	turnBy: function(angle) {
		this.rotateAround(angle, this.shape.bounds().center())		
	},

	// Experimental radial "black hole" scrolling feature: When
    // an object comes close enough to the "event horizon" (specified
    // by 'towardsPoint'), the object is zoomed into the black hole.
    // Negative 'howMuch' values are used to "collapse" the display, 
    // while positive values expand and restore the display back to its 
    // original state.  For further information, see  
    // Sun Labs Technical Report SMLI TR-99-74, March 1999.
	moveRadially: function(towardsPoint, howMuch) {
		var position = this.getPosition();
		var relativePt = position.subPt(towardsPoint);
		var distance = towardsPoint.dist(position);
		if (!this.inBlackHole) this.inBlackHole = 0;

		// The object disappears entirely when it is less than 5 pixels away
		// The 'inBlackHole' counter keeps track of how many levels deep
		// the object is in the black hole, allowing the display to be
		// restored correctly.
		if (distance <= 5) {
			if (howMuch < 0) {
				this.inBlackHole++;
				this.setScale(0);
			} else {
				this.inBlackHole--;            
			}
		} 

		if (this.inBlackHole == 0) {
			// Start shrinking the object when it is closer than 200 pixels away
			if (distance > 5 && distance < 200) this.setScale(distance/200);
			else if (distance >= 200 && this.getScale() != 1) this.setScale(1);

			// Calculate new location for the object
			var theta = Math.atan2(relativePt.y, relativePt.x);
			var newDistance = distance + howMuch;
			if (newDistance < 0) newDistance = 1;    
			var newX = newDistance * Math.cos(theta);
			var newY = newDistance * Math.sin(theta);
			this.setPosition(towardsPoint.addPt(pt(newX,newY)));
		}
	},
},
'animations', {
	// Animated moves for, eg, window collapse/expand
	animatedInterpolateTo: function(destination, nSteps, msPer, callBackFn, finalScale) {
		if (nSteps <= 0) return;
		var loc = this.position();
		var delta = destination.subPt(loc).scaleBy(1 / nSteps);
		var scaleDelta = finalScale ? (this.getScale() - finalScale) / nSteps : 0;
		// console.log("scaleDelta = " + scaleDelta);
		var path = [];
		for (var i = 1; i<=nSteps; i++) { loc = loc.addPt(delta); path.unshift(loc); }
		this.animatedFollowPath(path, msPer, callBackFn, scaleDelta);
    },

    animatedFollowPath: function(path, msPer, callBackFn, scaleDelta) {
		var spec = {path: path.clone(), callBack: callBackFn, scaleDelta: scaleDelta};
		spec.action = this.startStepping(msPer, 'animatedPathStep', spec);	
    },

	animatedPathStep: function(spec, scaleDelta) {
		if (spec.path.length >= 1){
			this.setScale(this.getScale()-spec.scaleDelta);
			this.setPosition(spec.path.pop());
		}
		if (spec.path.length >= 1) return
		//spec.action.stop(this.world()); //JD: out
		//JD: delte script out of activeScripts, neede for deserialization
		this.stopSteppingScriptNamedAndRemoveFromSubmorphs('animatedPathStep');
		spec.callBack.call(this);
	},

},
'particle behavior',{     

	bounceInOwnerBounds: function() {
		this.bounceInBounds(this.owner.innerBounds());
	},
	
	bounceInBounds: function(ob) {
		// typcially ob = this.owner.innerBounds()
		// Bounce by reversing the component of velocity that put us out of bounds
		if (!this.velocity) return;  // Can't bounce without a velocity vector

		// We take care to only reverse the direction if it's wrong,
		//	but we move in any case, since we might be deeply out of bounds
		var b = this.bounds();
		if (b.x < ob.x) {
			if (this.velocity.x < 0) this.velocity = this.velocity.scaleByPt(pt(-1, 1));
			this.moveBy(this.velocity);
		}
		if (b.maxX() > ob.maxX()) {
			if (this.velocity.x > 0) this.velocity = this.velocity.scaleByPt(pt(-1, 1));
			this.moveBy(this.velocity);
		}
		if (b.y < ob.y) {
			if (this.velocity.y < 0) this.velocity = this.velocity.scaleByPt(pt(1, -1));
			this.moveBy(this.velocity);
		}
		if (b.maxY() > ob.maxY()) {
			if (this.velocity.y > 0) this.velocity = this.velocity.scaleByPt(pt(1, -1));
			this.moveBy(this.velocity);
		}
	},
	
	stepByVelocities: function() {
		if (this.velocity) this.moveBy(this.velocity);
		if (this.angularVelocity) this.rotateBy(this.angularVelocity);
	},
	
	stepAndBounce: function() {  // convenience for tile scripting
		this.stepByVelocities();
		this.bounceInOwnerBounds();
	},
	
},
'balloon help', {

	getHelpText: Functions.Null,  // override to supply help text

	showHelp: function(evt) {

		if (this.suppressBalloonHelp) return false;
		if (this.owner instanceof HandMorph) return false;
		var helpText = this.getHelpText();
		if (!helpText) return false;

		// Create only one help balloon at a time
		if (this.helpBalloonMorph && !this.helpBalloonMorph.getPosition().eqPt(evt.point())) {
			this.helpBalloonMorph.setPosition(this.window().localize(evt.point()));
			return false;
		} else {
			var width = Math.min(helpText.length * 20, 260); // some estimate of width.
			var window = this.window();
			var pos = window.localize(evt.point());
			this.helpBalloonMorph = new TextMorph(pos.addXY(10, 10).extent(pt(width, 20)), helpText);
			window.addMorph(this.helpBalloonMorph.beHelpBalloonFor(this));
			return true;
		}
	},

	hideHelp: function() {
		if (!this.helpBalloonMorph)  
			return;
		this.helpBalloonMorph.remove();
		delete this.helpBalloonMorph;
	},

},
'mouse events', {

	// KP: equivalent of the DOM capture phase
	// KP: hasFocus is true if the receiver is the hands's focus (?)
	captureMouseEvent: function Morph$captureMouseEvent(evt, hasFocus) {
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
				this.setFisheyeScale(1.0);
			}
		}
		if (hasFocus) return this.mouseHandler.handleMouseEvent(evt, this);

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


	areEventsIgnored: function() {
		return this.getTrait("pointer-events") == "none";
	},

	ignoreEvents: function() { // will not respond nor get focus
		this.mouseHandler = null;
		this.setTrait("pointer-events", "none");
		return this;
	},

	enableEvents: function() {
		this.mouseHandler = MouseHandlerForDragging.prototype;
		this.removeTrait("pointer-events");

		return this;
	},

	relayMouseEvents: function(target, eventSpec) {
		this.mouseHandler = new MouseHandlerForRelay(target, eventSpec); 
	},

	handlesMouseDown: function(evt) {
		if (this.mouseHandler == null || evt.isCommandKey()) return false;	//default behavior
		return this.mouseHandler.handlesMouseDown(); 
	},

	onMouseDown: function(evt) { 
		this.hideHelp();
	}, //default behavior

	onMouseMove: function(evt, hasFocus) { //default behavior
		if (evt.mouseButtonPressed && this==evt.hand.mouseFocus && this.owner && this.owner.openForDragAndDrop) { 
			this.moveBy(evt.mousePoint.subPt(evt.priorPoint));
		} // else this.checkForControlPointNear(evt);
		if (!evt.mouseButtonPressed && !this.hasHandles()) this.checkForControlPointNear(evt);
	},

	onMouseUp: function(evt) { }, //default behavior

	considerShowHelp: function(oldEvt) {
		// if the mouse has not moved reasonably
		var hand = oldEvt.hand;
		if (!hand) return; // this is not an active world so it doesn't have a hand
		else if (hand.getPosition().dist(oldEvt.mousePoint) < 10)
		this.showHelp(oldEvt);
	},

	delayShowHelp: function(evt) {
		var scheduledHelp = new SchedulableAction(this, "considerShowHelp", evt, 0);
		if (this.world())
			this.world().scheduleForLater(scheduledHelp, Config.ballonHelpDelay || 1000, false);
	},

	onMouseOver: function(evt) {
		this.delayShowHelp(evt);
	}, 

	onMouseOut: function(evt) { 
		this.hideHelp();
	}, 

	onMouseWheel: function(evt) {
		if (!this.world()) return false;
		return this.world().onMouseWheel(evt);
	},

	takesKeyboardFocus: Functions.False,

	setHasKeyboardFocus: Functions.False, // no matter what, say no

	requestKeyboardFocus: function(hand) {
		if (!hand) return;
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
		//this.focusHalo.removeRawNode();
		this.focusHalo.remove();
		this.focusHalo = null;
		return true;
	},

	focusHaloInset: 1,

	focusStyle: {
		fill: null, 
		borderColor: Color.blue,
		strokeOpacity: 0.3
	},

	adjustFocusHalo: function() {
		this.focusHalo.setBounds(this.localBorderBounds().expandBy(this.focusHaloInset));
	},

	addFocusHalo: function() {
		if (this.focusHalo || this.focusHaloBorderWidth <= 0) return false;
		this.focusHalo = Morph.makeRectangle(this.localBorderBounds().expandBy(this.focusHaloInset));
		this.focusHalo.name = "FocusHalo";
		this.focusHalo.isEpimorph = true;  // Do this before adding the halo
		this.addMorph(this.focusHalo);
		// old
		this.focusHalo.applyStyle(this.focusStyle);
		// new
		this.focusHalo.linkToStyles(["focusHalo"]);
		this.focusHalo.setBorderWidth(this.focusHaloBorderWidth);
		this.focusHalo.setLineJoin(lively.scene.LineJoins.Round);
		this.focusHalo.ignoreEvents();
		return true;
	},

},
'handles', {
	checkForControlPointNear: function(evt) {
		if (this.suppressHandles) return false; // disabled
		if (this.owner == null) return false; // cant reshape the world
		if (this.hasHandles()) return false; // handles already on - no rollovers
		var partName = this.shape.partNameNear(this.localize(evt.point()));
		if (partName == null) return false;

		var loc = this.shape.partPosition(partName);
		var handle = this.makeHandle(loc, partName, evt);
		if (!handle) return false;  // makeHandle variants may return null

		this.addMorph(handle);  
		handle.showHelp(evt);
		if (evt.hand.mouseFocus instanceof HandleMorph) evt.hand.mouseFocus.remove();
		evt.hand.setMouseFocus(handle);
		return true; 
	},
	
	addAllHandles: function(evt) {
		if (this.suppressHandles) return false; // disabled
		if (this.owner == null) return false; // can't reshape the world
		var partNames = this.shape.allPartNames();  // Array of name
		for (var i=0; i<partNames.length; i++) {
			var loc = this.shape.partPosition(partNames[i]);
			var handle = this.makeHandle(loc, partNames[i], evt);
			handle.mode = 'reshape';
			handle.showingAllHandles = true;
			handle.rollover = false; 
			handle.isEpimorph = false;  // make bounds grow so feels click outside target
			this.addMorph(handle);  
		}
		if (evt.hand.mouseFocus instanceof HandleMorph) evt.hand.mouseFocus.remove();
	},
	
	hasHandles: function(h) { return this.submorphs.any(function (m) { return m instanceof HandleMorph }); },
	
	removeAllHandlesExcept: function(h) {
		var removals = [];
		this.submorphs.forEach(function (m) { if (m !== h && m instanceof HandleMorph) removals.push(m); });
		removals.forEach(function (m) { m.remove(); });
	},

	makeHandle: function(position, partName, evt) { // can be overriden
		var handleShape = Object.isString(partName) || partName >= 0 ? lively.scene.Rectangle : lively.scene.Ellipse;
		return new HandleMorph(position, handleShape, evt.hand, this, partName);
	},
},
'grabbing and dragging', {
    copySubmorphsOnGrab: false, // acts as a palette if true.  
	suppressGrabbing: false,

    // May be overridden to preempt (by returning null) the default action of grabbing me
    // or to otherwise prepare for being grabbed or find a parent to grab instead
    okToBeGrabbedBy: function(evt) {
		if (this.suppressGrabbing)
			return null;
		return this; 
    },

	grid: function() {return Config.SnapGrid || pt(10,10)},

	isSnappingToGrid: function() { return Config.isSnappingToGrid},

	snapToGrid: function(pos) {
		var grid = this.grid();
		return pt(pos.x - (pos.x % grid.x), pos.y - (pos.y % grid.y))
	},

	dragMe: function(evt) {
		var offset = this.getPosition().subPt(this.owner.localize(evt.point()));
		var self = this;
		var mouseRelay= {
			captureMouseEvent: function(e) { 
				if (e.type == "MouseMove")  {
					var pos = this.owner.localize(e.hand.getPosition()).addPt(offset)
					if (self.isSnappingToGrid()) {
						this.setPosition(this.snapToGrid(pos));
					} else {
						this.setPosition(pos);
					};
				};
				if (e.type == "MouseDown" || e.type == "MouseUp")  e.hand.setMouseFocus(null); 
			}.bind(this),
		};
		evt.hand.setMouseFocus(mouseRelay);
	},

    showAsGrabbed: function(grabbedMorph) {
		// At this time, there are three separate hand-effects:
		//  1. applyDropShadowFilter, if it works, will cause the graphics engine to put a nice
		//	   gaussian blurred drop-shadow on morphs that are grabbed by the hand
		//  2. showGrabHalo will cause a halo object to be put at the end of the hand's
		//	   submorph list for every grabbed morph (has property 'morphTrackedByHalo')
		//  3. useShadowMorphs will cause a shadowCopy of each grabbed morph to be put
		//	   at the end of the hand's submorph list (has property 'isHandMorphShadow')
		// So, if everything is working right, the hand's submorph list looks like:
		//	front -> Mc, Mb, Ma, Ha, Sa, Hb, Sb, Hc, Sc <- back [note front is last ;-]
		// Where M's are grabbed morphs, H's are halos if any, and S's are shadows if any

        if (this.applyDropShadowFilter) grabbedMorph.applyFilter(this.dropShadowFilter); 

		if (Config.showGrabHalo) {
		    var bounds = grabbedMorph.bounds(true);
		    var halo = this.addMorphBack(Morph.makeRectangle(bounds).applyStyle({fill: null, borderWidth: 0.5 }));
		    halo.morphTrackedByHalo = grabbedMorph;
		    halo.shape.setStrokeDashArray(String([3,2]));
		    halo.setLineJoin(lively.scene.LineJoins.Round);
		    halo.ignoreEvents();

		    var idLabel = new TextMorph(pt(20,10).extentAsRectangle(), String(grabbedMorph.id())).beLabel();
		    idLabel.applyStyle(this.grabHaloLabelStyle);
		    halo.addMorph(idLabel);
		    idLabel.align(idLabel.bounds().bottomLeft(), halo.innerBounds().topRight());
	    
		    var pos = grabbedMorph.getPosition();
		    var posLabel = new TextMorph(pt(20, 10).extentAsRectangle(), "").beLabel();
		    posLabel.applyStyle(this.grabHaloLabelStyle);
		    halo.positionLabel = halo.addMorph(posLabel);

			this.updateGrabHalo();
		}
        if (this.useShadowMorphs) {
			var shadow = grabbedMorph.shadowCopy();
			shadow.isHandMorphShadow = true;
			this.addMorphBack(shadow);
			shadow.moveBy(pt(8, 8));
		}
    },

    showAsUngrabbed: function(grabbedMorph) {
		if (this.applyDropShadowFilter) grabbedMorph.applyFilter(null);
    },
    
    alignToGrid: function() {
        if(!Config.showGrabHalo) return;
        var grid = function(a) {
            return a - (a % (Config.alignToGridSpace || 5))
		};
		this.submorphs.forEach(function(halo) {
		    if (halo.morphTrackedByHalo) { // this is a tracking halo
	        	if (!halo.orgSubmorphPosition)
			    halo.orgSubmorphPosition = halo.morphTrackedByHalo.getPosition();
			var oldPos = this.worldPoint(halo.orgSubmorphPosition);
			var gridPos = pt(grid(oldPos.x), grid(oldPos.y));
			halo.morphTrackedByHalo.setPosition(this.localize(gridPos));
		    }
		}.bind(this));
    },

    updateGrabHalo: function Morph$updateGrabHalo() {
		// Note there may be several grabHalos, and drop shadows as well
		// See the comment in showAsGrabbed 
		this.submorphs.forEach(function(halo) {
		    if (halo.morphTrackedByHalo) { // this is a tracking halo
				halo.setBounds(halo.morphTrackedByHalo.bounds(true).expandBy(3));
				if (halo.positionLabel) {
				    var pos = this.worldPoint(halo.morphTrackedByHalo.getPosition());
				    var posLabel = halo.positionLabel;
				    posLabel.setTextString(pos.x.toFixed(1) + "," + pos.y.toFixed(1));
				    posLabel.align(posLabel.bounds().bottomCenter(), halo.innerBounds().topLeft());
				}
		    }
		}.bind(this));
    },

	grabMorph: function(grabbedMorph, evt) { 
		if (evt.isShiftDown() && (evt.isAltDown() || evt.isMetaDown())) {
			grabbedMorph.dragMe(evt);
			return;
		}
		if (evt.isShiftDown() || (grabbedMorph.owner && grabbedMorph.owner.copySubmorphsOnGrab == true)) {
			if (!grabbedMorph.okToDuplicate()) return;
			grabbedMorph.copyToHand(this);
			return;
		}
		if (evt.isCommandKey() || evt.isRightMouseButtonDown() || evt.isMiddleMouseButtonDown()) {
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
		if (this.logDnD) console.log('%s grabbing %s', this, grabbedMorph);
		this.addMorphAsGrabbed(grabbedMorph);
		// grabbedMorph.updateOwner(); 
		this.changed(); //for drop shadow
	},
    
    addMorphAsGrabbed: function(grabbedMorph) { 
        this.addMorph(grabbedMorph);
		this.showAsGrabbed(grabbedMorph);
    },
    
    dropMorphsOn: function(receiver) {
		if (receiver !== this.world()) 
			this.unbundleCarriedSelection();
		if (this.logDnD) 
			console.log("%s dropping %s on %s", this, this.topSubmorph(), receiver);
		this.carriedMorphsDo( function(m) {
			m.dropMeOnMorph(receiver);
			this.showAsUngrabbed(m);
		});
		this.shadowMorphsDo( function(m) { m.stopAllStepping(); });
		this.removeAllMorphs() // remove any shadows or halos
    },

    carriedMorphsDo: function(func) {
		// Evaluate func for only those morphs that are being carried,
		// as opposed to, eg, halos or shadows
		this.submorphs.clone().reverse().forEach(function(m) {
		    if (!m.morphTrackedByHalo && !m.isHandMorphShadow) func.call(this, m);
		}.bind(this));
    },

    shadowMorphsDo: function(func) { 
		// Evaluate func for only those morphs that are shadows,
		this.submorphs.clone().reverse().forEach(function(m) {
		    if (m.isHandMorphShadow) func.call(this, m);
		}.bind(this));
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

	toggleDnD: function(loc) {
		// console.log(this + ">>toggleDnD");
		this.openForDragAndDrop = !this.openForDragAndDrop;
	},

	openDnD: function(loc) {
		this.openForDragAndDrop = true;
	},

	closeDnD: function(loc) {
		// console.log(this + ">>closeDnD");
		this.openForDragAndDrop = false;
	},

    closeAllToDnD: function(loc) {
        // console.log(this + ">>closeAllDnD");
        // Close this and all submorphs to drag and drop
        this.closeDnD(); 
        // make this recursive to give children a chance to interrupt...
        this.submorphs.forEach( function(ea) { ea.closeAllToDnD(); });
    },

	openAllToDnD: function() {
		// Open this and all submorphs to drag and drop
		this.withAllSubmorphsDo( function() { this.openDnD(); });
	},

	dropMeOnMorph: function(receiver) {
		receiver.addMorph(this); // this removes me from hand
	},

	pickMeUp: function(evt) {
		var offset = evt.hand.getPosition().subPt(evt.point());
		this.moveBy(offset);
		evt.hand.addMorphAsGrabbed(this);
	},
},
'morph menu', {

	editMenuItems: function(evt) { 
		return [];  // Overridden by, eg, TextMorph
	},

	showMorphMenu: function(evt, optMenu) {
		if (evt.hand.lastMorphMenu && evt.hand.lastMorphMenu.owner)
			evt.hand.lastMorphMenu.remove(); // cleanup old open menus
		var world = this.world(),
			menu = optMenu || this.morphMenu(evt),
			menuCaption = this.toString(),
			captionClickAction = world.prompt.bind(world).curry(
				'edit name',
				function(newName) {
					if (!newName) { alert('Invalid name ' + newName); return }
					alertOK(this + ' renamed to ' + newName);
					this.setName(newName);
				}.bind(this),
				this.getName());
		menu.openIn(world, evt.point(), false, menuCaption, captionClickAction); 
		evt.hand.lastMorphMenu = menu;
	},

	morphMenuBasicItems: function(evt) {
		var items = [
			["remove", this.remove],
			["drill", this.showOwnerChain.curry(evt)],
			["grab", this.pickMeUp.curry(evt)],
			["drag", this.dragMe.curry(evt)],
			["edit style", function() { new StylePanel(this).open()}],
			[((this.hasHandles()) ? "hide" : "show") + " all handles", function(evt) {
				if (this.hasHandles()) this.removeAllHandlesExcept(null);
					else this.addAllHandles(evt) }.bind(this) ],		
			["inspect", function(evt) { lively.Tools.inspect(this) }],
			["show class in browser", function(evt) { var browser = new SimpleBrowser(this);
				browser.openIn(this.world(), evt.point());
				browser.getModel().setClassName(this.getType());}]
			];
		if (this.okToDuplicate())
			items.unshift(["duplicate", this.copyToHand.curry(evt.hand)]);

		if (this.shape instanceof lively.scene.Polyline || this.shape instanceof lively.scene.Polygon)
			items.push( ["copy to curve", this.makeCurve]);

		if (this.getModel() instanceof SyntheticModel)
			items.push( ["show Model dump", this.addModelInspector.curry(this)]);
		return items
	},

	morphMenu: function(evt) { 
		var menu = new MenuMorph(this.morphMenuBasicItems(evt), this);
		menu.addLine();
		menu.addItem(["world...", function() {this.world().showMorphMenu(evt)}.bind(this)]);
		menu.addLine();
		menu.addItems(this.subMenuItems(evt));
		return menu;
	},
	subMenuLayoutItems: function() {
		var morph = this;
		function setLayouter(klass) {
			morph.layoutManager = new klass();
			morph.relayout();
		};
		return [
			["default layout", function() { setLayouter(LayoutManager) }],
			["horizontal layout", function() { setLayouter(HorizontalLayout) }],
			["vertical layout", function() { setLayouter(VerticalLayout) }],
		];	
	},


	subMenuPropertiesItems: function(evt) {
		return  [
			["edit name...", function() { this.world().prompt('edit name', function(input) { this.setName(input) }.bind(this), this.getName()) }],
			["reset rotation", this.setRotation.curry(0)],
			["reset scaling", this.setScale.curry(1)],
			["toggle fullscreen", function() { this.isInFullScreen() ? this.leaveFullScreen() : this.enterFullScreen() }.bind(this)],
			[((this.suppressGrabbing) ? "[] grabbing" : "[X] grabbing"), function(){this.suppressGrabbing = !this.suppressGrabbing}.bind(this)],
			[((this.suppressHandles) ? "[] handles" : "[X] handles"), function(){this.suppressHandles = !this.suppressHandles}.bind(this)],
			[((this.openForDragAndDrop) ? "[X] accepts Drops" : "[] accepts Drops"), function(){this.openForDragAndDrop = !this.openForDragAndDrop}.bind(this)],
			[((this.fishEye) ? "turn fisheye off" : "turn fisheye on"), this.toggleFisheye],
			[(this.openForDragAndDrop ? "close DnD" : "open DnD"), this.toggleDnD.curry(evt.point())],
			["add button behavior", function() { this.addMorph(new ButtonBehaviorMorph(this)); }],
			[(this.copySubmorphsOnGrab ? "unpalettize" :  "palettize"), function() { this.copySubmorphsOnGrab = !this.copySubmorphsOnGrab; }],
			["color chooser (gray)", function() { 
				var colorChooser = new ColorChooserWidget(this);
				var window = colorChooser.buildView()
				this.world().addFramedMorph(pane, "gray", this.world().positionForNewMorph(pane))}]
		]
	},
	
	subMenuWindowItems: function(evt) {
		return [
			["put me in a window", this.putMeInAWindow.curry(this.position())], 
			["put me in a tab", this.putMeInATab.curry(this.position())],
			["put me in the open", this.putMeInTheWorld.curry(this.position())],
			["show Lively markup", this.addSvgInspector.curry(this)],
			["package", function(evt) {  // FIXME insert package morph in exactly the same position?
				new PackageMorph(this).openIn(this.world(), evt.point()); this.remove(); } ],
			["publish packaged ...", function() { this.world().prompt('publish as (.xhtml)', this.exportLinkedFile.bind(this)); }] 
		]
	},

	subMenuStyleItems: function(evt) {
		return new StyleEditor().styleEditorMenuItems(this, evt);
	},

	subMenuItems: function(evt) {
		return [
			['Style', this.subMenuStyleItems(evt)],
			['Layout', this.subMenuLayoutItems(evt)],
			['Properties', this.subMenuPropertiesItems(evt)],
			['Window and World', this.subMenuWindowItems(evt)]
		]
	},

    showPieMenu: function(evt) {
    	var menu, targetMorph = this;
		var items = [
			['undo (~)', function(evt) { PieMenuMorph.doUndo(); }],
			['duplicate (o-->o)', function(evt) {
				evt.hand.setPosition(menu.mouseDownPoint);
				menu.targetMorph.copyToHand(evt.hand);
				var theCopy = evt.hand.submorphs[0];
				PieMenuMorph.setUndo(function() { theCopy.remove(); });  // Why doesn't this work??
				}],
			['move (o-->)', function(evt) {
				var oldPos = targetMorph.getPosition();
				PieMenuMorph.setUndo(function() { targetMorph.setPosition(oldPos); });
				evt.hand.setPosition(menu.mouseDownPoint);
				evt.hand.addMorph(menu.targetMorph);
				if (menu.targetMorph instanceof SelectionMorph)  // Fixme:  This should be in SelectionMorph
					menu.targetMorph.selectedMorphs.forEach( function(m) { evt.hand.addMorph(m); });
				}],
			['scale (o < O)', function(evt) {
				var oldScale = targetMorph.getScale();
				PieMenuMorph.setUndo(function() { targetMorph.setScale(oldScale); });
				menu.addHandleTo(targetMorph, evt, 'scale');
				}],
			[((targetMorph.hasHandles()) ? "hide" : "show") + " all handles ([])", function(evt) {
				if (targetMorph.hasHandles()) targetMorph.removeAllHandlesExcept(null);
					else targetMorph.addAllHandles(evt) }],
			['delete (X)', function(evt) {
				var oldOwner = targetMorph.owner;
				PieMenuMorph.setUndo(function() { oldOwner.addMorph(targetMorph); });
				targetMorph.remove();
				}],
			['edit style (<>)', function() { new StylePanel(this).open()}],
			['rotate (G)', function(evt) {
				var oldRotation = targetMorph.getRotation();
				PieMenuMorph.setUndo(function() { targetMorph.setRotation(oldRotation); });
				menu.addHandleTo(targetMorph, evt, 'rotate');
				}]
		];
		menu = new PieMenuMorph(items, this, 0.5);
		menu.open(evt);
    },

},
'window related', {

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
		w.addMorphAt(wm, wm.getPosition());
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



	copyToHand: function(hand, evt, optCopier) {
		// Function.prototype.shouldTrace = true;
		if (optCopier)
			var copier = optCopier;
		else
			var copier = new Copier();
		var copy = this.copy(copier);
		if (!optCopier)
			copier.finish(); // if copier comes from outside it should call finish

		// when copying submorphs, make sure that the submorph that becomes a top-level morph 
		// reappears in the same location as its original.
		console.log('copied %s', copy);
		copy.owner = null; // so following addMorph will just leave the tfm alone
		this.owner.addMorph(copy); // set up owner as the original parent so that...        
		hand.addMorph(copy);  // ... it will be properly transformed by this addMorph()
		hand.showAsGrabbed(copy);
		// copy.withAllSubmorphsDo(function() { this.startStepping(null); }, null);
		return copy
	},

	shadowCopy: function(hand) {
		// copied and adapted from asLogo
		var shapes = [], copier = new Copier(), root = this;
		
		this.shadowCopyIntoShapes(root, shapes, copier);
		
		var shadow = new Morph(new lively.scene.Group())
		shadow.shape.setContent(shapes)
		shadow.setTransform(root.getTransform())
		return shadow;
	},
	shadowCopyIntoShapes: function(root, shapes, copier) {
		if (this.isEpimorph) return;

		var s = this.shape.copy(copier)

		if (s.getFill()) s.setFill(Color.black);
		if (s.getStroke()) s.setStroke(Color.black);
		s.setFillOpacity(0.3);
		s.setStrokeOpacity(0.3);

		this.transformForNewOwner(root).applyTo(s.rawNode)
		shapes.push(s);

		if (this.isClipMorph) return

		this.submorphs.forEach(function(ea) {
			ea.shadowCopyIntoShapes(root, shapes, copier)
		})
	},


	morphToGrabOrReceiveDroppingMorph: function(evt, droppingMorph) {
		return this.morphToGrabOrReceive(evt, droppingMorph, true);
	},

	morphToGrabOrReceive: function(evt, droppingMorph, checkForDnD) {
		// If checkForDnD is false, return the morph to receive this mouse event (or null)
		// If checkForDnD is true, return the morph to grab from a mouse down event (or null)
		// If droppingMorph is not null, then check that this is a willing recipient (else null)

		if (this.isEpimorph)
			return null;

		if (!this.fullContainsWorldPoint(evt.mousePoint)) return null; // not contained anywhere
		// First check all the submorphs, front first
		for (var i = this.submorphs.length - 1; i >= 0; i--) {
			var hit = this.submorphs[i].morphToGrabOrReceive(evt, droppingMorph, checkForDnD); 
			if (hit != null) { 
				return hit;  // hit a submorph
			}
		};

		// Check if it's really in this morph (not just fullBounds)
		if (!this.containsWorldPoint(evt.mousePoint)) return null;

		// If no DnD check, then we have a hit (unless no handler in which case a miss)
		if (!checkForDnD) return this.mouseHandler ? this : null;

		// On drops, check that this is a willing recipient
		if (droppingMorph != null) {
			return this.acceptsDropping(droppingMorph) ? this : null;
		} else {
			// On grabs, can't pick up the world or morphs that handle mousedown
			// DI:  I think the world is adequately checked for now elsewhere
			// else return (!evt.isCommandKey() && this === this.world()) ? null : this; 
			return this;
		}

	},

	morphToReceiveEvent: function(evt) {
		// This should replace morphToGrabOrReceive... in Hand where events
		// must be displatched to morphs that are closed to DnD
		return this.morphToGrabOrReceive(evt, null, false);
	},


	acceptsDropping: function(morph) { 
		return !this.suppressDropping && this.openForDragAndDrop && !(morph instanceof WindowMorph);
	},

},
'fullscreen', {
	enterFullScreen: function() {
		var world = this.world();
		if (this._isInFullScreen || !world) return;
		this._isInFullScreen = true;
		this.oldPosition = this.getPosition();
		this.oldWorldScale = world.getScale();
		this.oldWorldExtent = world.getExtent();
		var windowExtent = world.windowBounds().extent(),
			ratioY =  (windowExtent.y / this.getExtent().y) * world.getScale(),
			ratioX =  (windowExtent.x / this.getExtent().x) * world.getScale(),
			ratio = Math.min(ratioX, ratioY);
		if (ratio > 0 && ratio < 100) {
			world.setScale(ratio);			
			var pos = this.getTransform().transformPoint(this.shape.bounds().topLeft());
			this.setPosition(pt(0,0))
			Global.scrollTo(0, 0)
			world.setExtent(windowExtent);
			world.resizeCanvasToFitWorld();
			// rk actually the following three lines should be unnecessary because of resizeCanvasToFitWorld
			var canvas = world.canvas();
			canvas.setAttribute("width", windowExtent.x);	
			canvas.setAttribute("height", windowExtent.y);
			this.clipWorld();
		};
	},

	leaveFullScreen: function() {
		if (!this._isInFullScreen) return;
		this._isInFullScreen = false;
		this.setPosition(this.oldPosition)
		this.unclipWorld();
		this.world().setScale(this.oldWorldScale);
		this.world().setExtent(this.oldWorldExtent);
		this.world().resizeCanvasToFitWorld();
		Global.scrollTo(this.oldPosition.x, this.oldPosition.y)
		delete this.oldWorldExtent;
		delete this.oldWorldScale;
		delete this.oldPosition;
	},
	isInFullScreen: function() { return this._isInFullScreen },


	clipWorld: function() {
		this.unclipWorld();
		this.owner.addMorphFront(this);
		var clipBounds = this.getPosition().extent(this.shape.bounds().extent()),
			clip = new lively.scene.Clip(new lively.scene.Rectangle(clipBounds)),
			world = this.world();
		clip.reference();
		clip.applyTo(world);		
		world.worldClip = clip;
	},

	unclipWorld: function() {
		var world = this.world();
		if (world.worldClip) {
			world.worldClip.dereference();
			delete world.worldClip;
		};
		world.setTrait("clip-path", "");
	},
},
'stepping', { // Morph stepping/timer functions

    startSteppingScripts: function() { }, // May be overridden to start stepping scripts

	stopStepping: function() {
		if (!this.activeScripts) return;
		// ignore null values
		var scripts = this.activeScripts.select(function (ea) { return ea });
		scripts.invoke('stop', this.world());
		scripts.forEach(function(ea) { this.removeMorph(ea) }, this)
		this.activeScripts = null;
	},
	
	stopSteppingScriptNamed: function(sName) {
		if (!this.activeScripts) return;
		this.activeScripts.select(function (ea) { return ea.scriptName == sName }).invoke('stop', this.world());
		this.activeScripts = this.activeScripts.select(function (ea) { return ea.scriptName !== sName });	
		if (this.activeScripts.length == 0) this.activeScripts = null;
	},
 	stopSteppingScriptNamedAndRemoveFromSubmorphs: function(sName) {
		if (!this.activeScripts) return;
		var all = this.activeScripts.select(function (ea) { return ea.scriptName == sName });
		if (this.world()) all.invoke('stop', this.world());
		all.each(function(ea) {this.removeMorph(ea);}.bind(this));//remove
		this.activeScripts = this.activeScripts.select(function (ea) { return ea.scriptName !== sName });	
		if (this.activeScripts.length == 0) this.activeScripts = null;
    },


	startStepping: function(stepTime, scriptName, argIfAny) {
		if (!scriptName) throw Error("Old code");
		var action = new SchedulableAction(this, scriptName, argIfAny, stepTime);
		this.addActiveScript(action);
		action.start(this.world());
		return action;
	},

	addActiveScript: function(action) {
		// Every morph carries a list of currently active actions (alarms and repetitive scripts)
		if (!this.activeScripts) this.activeScripts = [action];
		else this.activeScripts.push(action);
		if (!action.rawNode.parentNode) 
			this.addMorph(action);
		return this;
		// if we're deserializing the rawNode may already be in the markup
	},

    stopAllStepping: function() {  // For me and all my submorphs 
		this.withAllSubmorphsDo( function() { this.stopStepping(); });
    },

    suspendAllActiveScripts: function() {  // For me and all my submorphs
		this.withAllSubmorphsDo( function() { this.suspendActiveScripts(); });
    },

	suspendActiveScripts: function() {
		if (this.activeScripts) { 
			this.suspendedScripts = this.activeScripts.clone();
			this.stopStepping();
		}
	},

	resumeAllSuspendedScripts: function() {
		var world = WorldMorph.current();
		this.withAllSubmorphsDo( function() {
			if (this.suspendedScripts) {
				// ignore null values
				this.suspendedScripts.select(function (ea) { return ea }).invoke('start', world);
				this.activeScripts = this.suspendedScripts;
				this.suspendedScripts = null;
			}
		});
	},

},
'scripts', {
	addScript: function(funcOrString, optName) {
		var func = Function.fromString(funcOrString);
		return func.asScriptOf(this, optName);
	},

	addScriptNamed: function(name, funcOrString) {
		// DEPRECATED!!!
		return this.addScript(funcOrString, name);
	},
},
'debugging', {
	notify: function(msg, loc) {
		if (!loc) loc = this.world().positionForNewMorph();
		new MenuMorph([["OK", 0, "toString"]], this).openIn(this.world(), loc, false, msg); 
	},

	showOwnerChain: function(evt) {
		var items = this.ownerChain().reverse().map(
			function(each) { 
				return [Object.inspect(each).truncate(), function(evt2) { each.showMorphMenu(evt) }]; 
			});
		new MenuMorph(items, this).openIn(this.world(), evt.point(), false, "Top item is topmost");
	},

	toString: function() {
		try {
			var name = this.getName();
			if (name && name != '') name += '(' + this.constructor.name + ')';
			else name = (this.rawNode && this.id()) || 'morph without rawNode';
			return name;
		} catch (e) {
			//console.log("toString failed on %s", [this.id(), this.getType()]);
			return "#<Morph?{" + e + "}>";
		}
	},

	inspect: function() {
		try {
			return this.toString();
		} catch (err) {
			return "#<inspect error: " + err + ">";
		}
	},
	
	addSvgInspector: function() {
		var xml = Exporter.stringify(new Exporter(this).serialize(Global.document));
		var txt = this.world().addTextWindow({
			content: xml,
			title: "XML dump", 
			position: this.world().positionForNewMorph(null, this)
		});
		txt.innerMorph().xml = xml; // FIXME a sneaky way of passing original text.
	},

	addModelInspector: function() {
		var model = this.getModel();
		if (model instanceof SyntheticModel) {
			var variables = model.variables();
			var list = [];
			for (var i = 0; i < variables.length; i++) {
				var varName = variables[i];
				list.push(varName + " = " + model.get(varName));
			}
			this.world().addTextListWindow({
				content: list,
				title: "Simple Model dump",
				position: this.world().positionForNewMorph(null, this)
			});
		}
	},

},
'Fabrik',{
	isContainedIn: function(morph) {
		if (!this.owner) return false;
		if (this.owner === morph) return true;
		return this.owner.isContainedIn(morph)
	},
},
'signals',{
	signalGeometryChange: function() {
		signal(this, 'geometryChanged')
		var morphs = this.submorphs;
		for(var i=0; i < morphs.length; i++) {
			morphs[i].signalGeometryChange()
		}
	},

});

Morph.addMethods(ViewTrait);

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

Morph.subclass("PasteUpMorph", {

    documentation: "used for layout, most notably the world and, e.g., palettes",

    initialize: function($super, bounds, shapeType) {
        return $super(bounds, shapeType);
    },
    
	captureMouseEvent: function PasteUpMorph$captureMouseEvent($super, evt, hasFocus) {
		if (evt.type == "MouseDown" && this.onMouseDown(evt)) return;
		if (evt.type == "MouseWheel" && this.onMouseWheel(evt)) return;
		$super(evt, hasFocus); 
	},

	onMouseDown: function PasteUpMorph$onMouseDown($super, evt) {  //default behavior is to grab a submorph
		$super(evt);
		var m = this.morphToReceiveEvent(evt);
		if (false && m instanceof HandleMorph) { // Verify handles work with pie menus, then delete
			m.onMouseDown(evt);  // fixme
			return true;
		}
		if (Config.usePieMenus) {
			if (m.handlesMouseDown(evt)) return false;
			m.showPieMenu(evt, m);
			return true;
		}
		if (m == null) { 
			this.makeSelection(evt); 
			return true; 
		} else if (!evt.isCommandKey() && evt.isLeftMouseButtonDown()) {
			if (m === this.world()) { 
				this.makeSelection(evt); 
				return true; 
			} else if (m.handlesMouseDown(evt)) 
				return false;
		}
		evt.hand.grabMorph(m, evt);
		return true; 
	},


	bounds: function($super, ignoreTransients, ignoreTransform) {
		return $super(ignoreTransients, true);
	},
	
	onMouseWheel: function(evt) {		
		if (!evt.isCommandKey()) return false;
		evt.preventDefault();

		var wheelDelta = evt.wheelDelta(),
			oldScale = this.getScale();

		var minScale = 0.1, maxScale = 10;
		if (oldScale < minScale && wheelDelta < 0) return false;
		if (oldScale > maxScale && wheelDelta > 0) return false;
		var scaleDelta = 1 + evt.wheelDelta() / 500;
	
		// this.scaleBy(scaleDelta);
		var newScale = oldScale * scaleDelta,
			newScale = Math.max(Math.min(newScale, maxScale), minScale);
		this.setScale(newScale)
		if (this.hands && this.hands[0]) this.hands[0].setScale(1/newScale)

		// actually this should be a layoutChanged but implementing
		// layoutChanged in WorldMorph is expensive since it is always called when a
		// submorph's layout is changed (owner chain propagation)
		this.resizeCanvasToFitWorld();
		
		// Zoom into/out of the current mouse position:
		// p is the current mouse position. If we wouldn't move the window the new mouse pos would be scaledP.
		// We calculate the vector from scaledP to p and scale that by the current scale factor
		// We end up with a vector that can be used to scroll the screen to zoom in/out
		var p = evt.point(),
			scaledP = p.scaleBy(1/scaleDelta),
			translatedP = p.subPt(scaledP).scaleBy(this.getScale());
		window.scrollBy(translatedP.x, translatedP.y)

		return true
	},
	
    okToBeGrabbedBy: function(evt) {
        // Paste-ups, especially the world, cannot be grabbed normally
        return null; 
    },

	makeSelection: function(evt) {	//default behavior is to grab a submorph
		if (this.world().currentSelection != null) this.world().currentSelection.removeOnlyIt();
		
		var m = new SelectionMorph(evt.point().asRectangle());
		this.world().currentSelection = m;
		
		this.world().addMorph(m);
		var handle = new HandleMorph(pt(0,0), lively.scene.Rectangle, evt.hand, m, "bottomRight");
		handle.setExtent(pt(0, 0));
		handle.mode = 'reshape';
		m.addMorph(handle);
		evt.hand.setMouseFocus(handle);
		evt.hand.setKeyboardFocus(handle);
	},


    
});

PasteUpMorph.subclass("WorldMorph", 
'defaults', {
    documentation: "A Morphic world (a visual container of other morphs)",
    fill: Color.primary.blue,
    defaultExtent: pt(1280, 1024),
	styleClass: ['world'],
	
    // Default theme for the theme manager    
},
'initialization', {
	initialize: function($super, canvas, backgroundImageId) {
		var bounds = Rectangle.fromElement(canvas);
		// sometimes bounds has zero dimensions (when reloading thes same page, timing issues?
		// in Firefox bounds may be 1x1 size?? maybe everything should be run from onload or sth?
		if (bounds.width < 2) {
			bounds.width = this.defaultExtent.x;
		}

		if (bounds.height < 2) {
			bounds.height = this.defaultExtent.y;
		}

		if (backgroundImageId) {
			var background = NodeFactory.create("use");
			XLinkNS.setHref(background, backgroundImageId);
			this.addNonMorph(background);
		}
		$super(new lively.scene.Rectangle(bounds));

		this.setDisplayTheme(this.displayTheme); // apply display theme

		//gradient.rawNode.setAttributeNS(null, "gradientTransform", "translate(0, -0.1) skewY(10)");		     
		this.enterCount = 0;
	},

	doNotSerialize: ['hands', 'scheduledActions', 'lastStepTime', 'mainLoop', 'worldId', 'secondTick', 'currentScript', 'currentSelection', '_statusMessageContainer'],

    initializeTransientState: function($super) {
        $super();

        this.hands = [];

				
		var theme = DisplayThemes[Config.defaultDisplayTheme];
		if (!theme)
			console.log('ERROR: could not find Theme ' + Config.defaultDisplayTheme)
		this.displayTheme = theme; // set display them without applying it
		console.log('WorldMorph: updated display theme ')


		this.withAllSubmorphsDo( function() { this.layoutChanged(); });  // Force installation of transforms

        this.scheduledActions = [];  // an array of schedulableActions to be evaluated
        this.lastStepTime = (new Date()).getTime();
        this.mainLoopFunc = this.doOneCycle.bind(this).logErrors('Main Loop');
        this.mainLoop = Global.setTimeout(this.mainLoopFunc, 30);
        this.worldId = ++WorldMorph.worldCount;
		var self = this;
		window.onscroll = function() {signal(self, 'scrollChange')}

        return this;
    },

	collectAllUsedFills: function($super, usedFills) {
		usedFills = $super(usedFills);
		Properties.forEachOwn(this.displayTheme,  function(ea) {
			var style = this[ea]
			if (style && (style.fill  instanceof lively.paint.Gradient)) {
				usedFills.push(style.fill);
			} 
		}.bind(this.displayTheme))
		return usedFills
	},
    
	remove: function() {
		if (!this.rawNode.parentNode) return null;  // already removed
		this.hands.clone().forEach(function(hand) { this.removeHand(hand) }, this);
		this.stopStepping();
		this.removeRawNode();
		return this;
	},
},
'private', {

	// called by insertMorph to determine the rawNode after the new inserted morph
	getInsertPositionFor: function(m, isFront) {
		if (this.submorphs.length == 0) return this.hands.length > 0 ? this.hands.last().rawNode : null;
		return isFront ? this.submorphs.last().rawNode.nextSibling : this.submorphs.first().rawNode;
	},
	
	toggleNativeCursor: function(flag) {
		this.canvas().setAttributeNS(null, "cursor", flag ? "auto" : "none");
	},

	resizeCanvasToFitWorld: function () {
		var canvas = this.canvas();
		if (!canvas) return;
		this.transformChanged();
		this.fullBounds = null;

		var w = this.getExtent().x * this.getScale() , h = this.getExtent().y * this.getScale();

		if (canvas.clientWidth != w && canvas.clientHeight != h) {
			if (canvas.offsetLeft) w += canvas.offsetLeft * this.getScale();
			if (canvas.offsetTop) h += canvas.offsetTop * this.getScale();
			canvas.setAttribute("width", w);
			canvas.setAttribute("height", h);
		}
	},

	displayOnCanvas: function(canvas) {
		// this.remove();
		if (this.rawNode.parentNode !== canvas) canvas.appendChild(this.rawNode);
		this.hands.forEach(function(ea) { this.removeHand(ea) }, this);
		this.addHand(new HandMorph(true));
		WorldMorph.currentWorld = this; // this conflicts with mutliple worlds
		if (Config.resizeScreenToWorldBounds)
			this.resizeCanvasToFitWorld(this);
		this.onEnter(); 
		this.enterCount ++;
	},
    
	addHand: function(hand) {
		if (this.hands.length > 0 && !this.hands.first())
			this.hands.shift(); // FIXME: Quick bugfix. When deserializing the world the hands.first() is sometimes undefined
		this.hands.push(hand);
		hand.owner = this;
		// FIXME mouse events are correctly dispatched when using canvas or world
		// keyboard events only work when using documentElement --> problem with multiple worlds
		hand.registerForKeyboardEvents(document.documentElement); // FIXME!!!
		hand.registerForEvents(this.canvas());
		hand.layoutChanged();

		this.rawNode.appendChild(hand.rawNode);
		return hand;
	},
    
	removeHand: function(hand) {
		hand.setMouseFocus(null); // cleanup, just in case
		hand.setKeyboardFocus(null); // cleanup (calls blur(), which will remove the focus halo)
		hand.removeRawNode();
		hand.unregisterForKeyboardEvents(document.documentElement); // FIXME!!!
		hand.unregisterForEvents(this.canvas());

		this.hands.splice(this.hands.indexOf(hand), 1);
	},


    toggleBalloonHelp: function() {
        Morph.prototype.suppressBalloonHelp = !Morph.prototype.suppressBalloonHelp;
    },



    chooseDisplayTheme: function(evt) { 
        var themes = DisplayThemes;
        var target = this; // trouble with function scope
        var themeNames = Properties.own(themes);
        var items = themeNames.map(
            function(each) { return [each, target, "setDisplayTheme", themes[each]]; });
        var menu = new MenuMorph(items, this);
        menu.openIn(this.world(), evt.point());
    },
    
    setDisplayTheme: function(styleDict) { 
        this.displayTheme = styleDict;
        this.withAllSubmorphsDo( function() { this.applyLinkedStyles(); });
    },
    
    restart: function() {
        window.location && window.location.reload();
    },

},
'accessing', {
	getMorphNamed: function($super, name) {
		return $super(name) || (this.hands[0] && this.hands[0].getMorphNamed(name));
	},
},
'geometry', {
    
    layoutChanged: function() {
	// do nothing
    },

    layoutOnSubmorphLayout: function() {
	return false;
    },
    

    moveBy: function(delta) { // don't try to move the world
    },
},
'world', {

    world: function() { 
        return this; 
    },
	
    validatedWorld: function() { 
        return this; 
    },
    
    firstHand: function() {
		if (!this.hands || this.hands.length === 0) return undefined;
        return this.hands[0];
    },

    onEnter: function() {},
    onExit: function() {},

    /**
     * override b/c of parent treatement
     */
    relativize: function(pt) { 
        return pt;
        //return pt.matrixTransform(this.rawNode.parentNode.getTransformToElement(this.rawNode)); 
    },
	hideHostMouseCursor: function() {
		if (!Config.hideSystemCursor) return;
		if (UserAgent.isChrome && UserAgent.isWindows)
			// chrome on windows cannot display cur files
			var	path = URL.codeBase.withFilename('media/nocursor.gif').pathname;
		else
			var	path = URL.codeBase.withFilename('media/nocursor.cur').pathname;
		document.body.style.cursor = 'url("' + path + '"), none';
	},
	showHostMouseCursor: function() {
		document.body.style.cursor = 'default'
	},



},
'stepping', {
   
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
    //  The message stopStepping will be sent when morphs are removed from the world.
    //  In this case the activeScripts array of the morph is used to determine exactly what
    //  scripts need to be unscheduled.  Note that startSteppingScripts is not sent
    //  automatically, whereas stopStepping is.  We know you won't forget to 
    //  turn your gadgets on, but we're more concerned to turn them off when you're done.

	getScheduledActions: function() {
		return this.scheduledActions.collect(function(ea) { return ea[1] });
	},

    scheduleForLater: function(action, delayInMs, removePrior) {
        if (removePrior) this.stopSteppingFor(action, true);  // unschedule earlier
        this.scheduleAction(new Date().getTime() + delayInMs, action);
    },
    
    startSteppingFor: function(action) {
		if (!action.scriptName) {
			// throw new Error("old code");
			console.log("faild to startSteppingFor with no scriptName ")
			return 
		}		
		this.stopSteppingFor(action, true);  // maybe replacing arg or stepTime
		this.scheduleAction(new Date().getTime(), action);
	},
    
    stopSteppingFor: function(action, fromStart) { // should be renamed to unschedule()
        // fromStart means it is just getting rid of a previous one if there,
	    // so not an error if not found

        if (this.currentScript === action) {
		    // Not in queue; just prevent it from being rescheduled
		    this.currentScript = null;
		    return;
		};

		this.scheduledActions = this.scheduledActions.reject(function(ea) {
			var eaAction = ea[1]
			return action.equalActorAndName(eaAction)
		})
    },
	stopSteppingForActionsMatching: function(func) {
		this.getScheduledActions()
			.select(func)
			.forEach(function(action) { this.stopSteppingFor(action) }, this);
	},



    
	validateScheduler: function() {
		this.getScheduledActions().forEach(function(action) {
			if (action.actor instanceof Morph && action.actor.validatedWorld() !== this)
				this.stopSteppingFor(action)
		}, this);
	},

    inspectScheduledActions: function() {
        // inspect an array of all the actions in the scheduler.  Note this
        // is not the same as scheduledActions which is an array of tuples with times
		// doit: [WorldMorph.current().inspectScheduledActions()]
        lively.Tools.inspect(this.getScheduledActions());
    },

	doOneCycle: function WorldMorph$doOneCycle(world) {
        // Process scheduled scripts

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
		var msTime = new Date().getTime(),
			timeOfNextStep = Infinity,
			list = this.scheduledActions,  // shorthand
			timeStarted = msTime;  // for tallying script overheads
		while (list.length > 0 && list[list.length - 1][0] <= msTime) {
			var schedNode = list.pop(),  // [time, action] -- now removed
				action = schedNode[1];
			this.currentScript = action; // so visible from stopStepping
			lively.lang.Execution.resetDebuggingStack();  // Reset at each tick event
			try {
				action.exec();
			} catch (er) {
				var msg = "error on actor ' + action.actor + ': " + (er.stack || er);
				console.warn(msg);
				alert(msg)
				dbgOn(true);
				lively.lang.Execution.showStack();
				timeStarted = new Date().getTime();
				continue; // Note: if error in script above, it won't get rescheduled below (this is good)
			}
 
			// Note: stopStepping may set currentScript to null so it won't get rescheduled
			if (this.currentScript && action.stepTime > 0) {
				var nextTime = msTime + action.stepTime;
				this.scheduleAction(nextTime, action)
			}
			this.currentScript = null;

			var timeNow = new Date().getTime(),
				ticks = timeNow - timeStarted;
			if (ticks > 0) action.ticks += ticks;  // tally time spent in that script
			timeStarted = timeNow;
		}

		//  Generate a mouseMove if any ticking scripts have run so that
		//  simulations can respond where, eg, a morph moves under the mouse
		//  DI:  This is *only* needed for the slide-keyboard-under-mouse demo (very cool)
		//	Uses extra cycles, though, and currently fails in Opera
		if (Config.nullMoveAfterTicks) { // set this true in localConfig for the demo
			var myHand = this.firstHand();
			if (myHand) myHand.makeANullMove();
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
				console.log('New Scheduler length = ' + this.scheduledActions.length);
				console.log('Script timings...');  // approx ms per second per script
				for (var p in tallies) console.log(p + ': ' + (tallies[p]/10).toString());
			}
		}
		this.lastStepTime = msTime;
		this.setNextStepTime(timeOfNextStep);
	},

	setNextStepTime: function(timeOfNextStep) {
		this.mainLoop = timeOfNextStep == Infinity ?
			null : Global.setTimeout(this.mainLoopFunc, timeOfNextStep - this.lastStepTime);
	},

    kickstartMainLoop: function() {
        // kickstart the timer (note arbitrary delay)
        this.mainLoop = Global.setTimeout(this.mainLoopFunc, 10);
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
},
'dialogs', {
    
	openURLasText: function(url, title) {
		// FIXME: This should be moved with other handy services like confirm, notify, etc		
		var pane = this.addTextWindow({content: "fetching ... ", title: title});
		var r = new WebResource(url);
		lively.bindings.connect(r, 'content', pane.innerMorph(), 'setTextString');
		r.beAsync().get();
		
	},

	viewport: function() {
		try {
			return Rectangle.ensure(this.canvas().viewport);
			} catch (er) { // FF doesn't implement viewport ?
			return this.shape.bounds();
		}
	},

	alert: function(varargs) {
		var message = Strings.formatFromArray($A(arguments)),
			openDialog = function() { alert(message) };
		this.setStatusMessage(message, Color.red, undefined, openDialog, undefined, "alert: ")
	}.logErrors('alert'),

	prompt: function(message, callback, defaultInput) {
		// this.world().prompt("your name", function(v) { alert("your name is: "  + v)}, "joe")
		var model = Record.newPlainInstance({Message: message, Input: defaultInput || "", Result: null});
		model.addObserver({ 
			onResultUpdate: function(value) { 
				if (value == true && callback) callback.call(Global, model.getInput());
			}
		});
		var dialog = new PromptDialog(model.newRelay({Message: "-Message", Result: "+Result", Input: "Input"}));
		var window = dialog.openIn(this, pt(0,0));
		window.setPosition(this.positionForNewMorph(window));
	},

    editPrompt: function(message, callback, defaultInput, optContext) {
		var dialog = new PromptDialogMorph();
		dialog.title = message;
		dialog.setText(defaultInput);
		dialog.callback = callback;
		if (optContext) {
			dialog.textPane.innerMorph().evalContext = optContext; 
			dialog.textPane.innerMorph().addScript(function getDoitContext() {
				return this.evalContext;
			})
		}
		dialog.openIn(this, this.positionForNewMorph(dialog));
		return dialog
    },

	confirm: function(message, callback) {
		var model = Record.newPlainInstance({Message: message, Result: null});
		model.addObserver({ 
			onResultUpdate: function(value) { callback && callback.call(Global, value) }});
		var dialog = new ConfirmDialog(model.newRelay({Message: "-Message", Result: "+Result"})),
			window = dialog.openIn(this, pt(0,0));
		window.setPosition(this.positionForNewMorph(window));
		return dialog;
	},
	showErrorDialog: function(error) {
		// Chrome
		if (error.stack) {
			var pane = new lively.ide.ErrorStackViewer();
			pane.setError(error);
			pane.open();
			return
		};

		var pane = this.addTextWindow({
			content: "",
			title: "Error", 
		});
		pane.owner.setPosition(this.positionForNewMorph(pane))
		LastPane  = pane

		// Safari
		if (error.expressionEndOffset && error.expressionBeginOffset && error.sourceURL) {
			// works under Safari 5
			var urlString = error.sourceURL;
			var source = new WebResource(new URL(urlString)).get().content
			this.showErrorDiaglogInWorkspace(source, error.expressionBeginOffset, error.expressionEndOffset, pane)
			pane.owner.setTitle('Error:' + urlString)
			return pane
		}

		if (error.expressionEndOffset && error.expressionBeginOffset && error.sourceId) {
			var sourceReference = EvalSourceRegistry.current().sourceReference(error.sourceId);
			if (sourceReference !== undefined) {
				console.log('error ' + printObject(error))
				var expressionBeginOffset = error.expressionBeginOffset - sourceReference.evalCodePrefixLength;
				var expressionEndOffset  = error.expressionEndOffset - sourceReference.evalCodePrefixLength;
				this.showErrorDiaglogInWorkspace(sourceReference.sourceString, expressionBeginOffset, expressionEndOffset, pane)
				if (sourceReference.morph) {
					sourceReference.morph.showError(error, (sourceReference.offset || 0) - sourceReference.evalCodePrefixLength)
				}

				return pane
			}
		} 

		// Fallback...
		pane.innerMorph().setTextString(printObject(error))	
		return pane
	},
logError: function(er) {
	LastError = er;
	var msg = "" + er
	var world = this;
	this.setStatusMessage(msg, Color.red, 15, 
		function() {
			world.showErrorDialog(er)
		},
		{fontSize: 12, fillOpacity: 1});
},

	showErrorDiaglogInWorkspace: function(source, expressionBeginOffset, expressionEndOffset, pane) {
		// PRIVATE HELPER
		console.log("begin " + expressionBeginOffset + " end " + expressionEndOffset)
		var start = source.lastIndexOf("\n\n", expressionBeginOffset)
		if (start == -1) start = 0;
		var startOffset = expressionBeginOffset - start;
		var stop =  source.indexOf("\n", expressionEndOffset + 1);
		if (stop != -1)	stop =  source.indexOf("\n", stop + 1);
		if (stop != -1)	stop =  source.indexOf("\n", stop + 1);

		if (stop == -1) stop = source.length;

		console.log("source: " + source + "| " + source.length+" expressionEndOffset: " + expressionEndOffset)
		var excerpt =  source.slice(start, stop)
		pane.innerMorph().setTextString(excerpt)

		pane.innerMorph().emphasizeFromTo({color: Color.red}, 
			startOffset, startOffset + expressionEndOffset - expressionBeginOffset);
		pane.innerMorph().replaceSelectionWith
		console.log("found excerpt: " + excerpt + " start: " + start + " stop:" + stop)
	},
},
'new content', {
   
	addFramedMorph: function(morph, title, optLoc, optSuppressControls) {
		var displ = pt(5, 5);
		var w = this.addMorphAt(
			new WindowMorph(morph, title, optSuppressControls), 
			optLoc || this.positionForNewMorph(morph).subPt(displ));
		w.adjustForNewBounds(); // hack
		return w
	},

	addTextWindow: function(spec) {
		// FIXME: typecheck the spec 
		if (Object.isString(spec.valueOf())) spec = {content: spec}; // convenience
		var extent = spec.extent || pt(500, 200);
		var pane = this.internalAddWindow(
				newTextPane(extent.extentAsRectangle(), spec.content || ""),
				spec.title, spec.position);
		if (spec.acceptInput !== undefined) pane.innerMorph().acceptInput = spec.acceptInput;
		if (spec.plug) pane.connectModel(spec.plug, true);
		return pane;
	},

	addTextListWindow: function(spec) {
		// FIXME: typecheck the spec 
		if (spec instanceof Array) spec = {content: spec }; // convenience
		var content = spec.content;
		if (!content) content = "";
		if (!(content instanceof Array)) content = [content];
		var extent = spec.extent || pt(500, Math.min(300, content.length * TextMorph.prototype.fontSize * 1.5));
		var rec = extent.extentAsRectangle();
		var pane = this.internalAddWindow(newTextListPane(rec, content), spec.title, spec.position);
		if (spec.plug) pane.connectModel(spec.plug, true);
		return pane;
	},

	internalAddWindow: function(pane, titleSpec, posSpec) {
		var pos = (posSpec instanceof Point) ? posSpec : undefined;
		pane.setBorderWidth(2);  pane.setBorderColor(Color.black);
		var win = this.addFramedMorph(pane, String(titleSpec || ""), pos || this.firstHand().position().subPt(pt(5, 5)));
		if (posSpec == "center") {
			win.align(win.bounds().center(), this.viewport().center());
		}
		return pane;
	},


	addMorphFrontOrBack: function($super, m, front) {
		var oldTop = this.topWindow();
		var result = $super(m, front);
		if (!front || !(m instanceof WindowMorph)) return result;
		// if adding a new window on top, then make it active
		if (oldTop) oldTop.titleBar.highlight(false);
		m.takeHighlight();
		return result;
	},

	topWindow: function() {
		for (var i= this.submorphs.length - 1; i >= 0; i--) {
			var sub = this.submorphs[i];
			if (sub instanceof WindowMorph) return sub;
		}
		return null;
	},

	positionForNewMorph: function(newMorph, relatedMorph) {
		// this should be much smarter than the following:
		if (relatedMorph)
			return relatedMorph.bounds().topLeft().addPt(pt(5, 0));
		var pos = this.firstHand().getPosition();
		if (!newMorph) return pos;
		var viewRect = this.windowBounds();
		var newMorphBounds = pos.extent(newMorph.getExtent());
		if (viewRect.containsRect(newMorphBounds)) return pos;
		return viewRect.center().subPt(newMorphBounds.extent().scaleBy(0.5));
	},

	reactiveAddMorph: function(morph, relatedMorph) { 	// add morph in response to a user action, make it prominent
		return this.addMorphAt(morph, this.positionForNewMorph(morph, relatedMorph));
	},
    
    resizeByUser: function() {
      var world = this;
      var cb = function(newSizePtLiteral) {
    	  try {
    	    var newPoint = eval(newSizePtLiteral);
    	    basicResize(world, world.canvas(), newPoint.x, newPoint.y);
        } catch(e) {
    	    world.alert('Wrong input ' +  newSizePtLiteral);
  		  }
    	};
    	world.prompt('Enter extent', cb, world.bounds().bottomRight().toString());
    },

	addProgressBar: function(optPt) {
		var center = optPt || this.windowBounds().center()
		var progressBar = new ProgressBarMorph(new Rectangle(0,0, 450, 30))
		this.addMorph(progressBar);
		progressBar.align(progressBar.bounds().center(), center);
		progressBar.ignoreEvents();
		return progressBar
	},
}, 
'Requirements', {
	// this.world().showAddWorldRequirementsMenu(pt(100,100))
	showAddWorldRequirementsMenu: function(pos) {
			var ignoreModules =  "lively.Widgets lively.WikiWidget lively.Data lively.Base lively.defaultconfig  lively.CanvasExpt lively.obsolete lively.Helper lively.miniprototype lively.demofx lively.Text lively.EmuDom lively.Core lively.bindings lively.rhino-compat lively.Tools lively.localconfig  lively.Main  lively.Network  lively.scene lively.simpleMain lively.ChangeSet lively.ide".split(" ")

			var items = ['apps', 'lively', 'Tests', 'draft']
				.select(function(ea){
					return new WebResource(new URL(Config.codeBase).withFilename(ea)).exists()})
				.collect(function(eaDir) {
			return [eaDir, ChangeSet.current()
				.moduleNamesInNamespace(eaDir)
				.sort()
				.reject(function(ea) { return ignoreModules.include(ea) })
				.collect(function(ea){ 
					return [ea, function(){
						module(ea).load();
						ChangeSet.current().addWorldRequirement(ea);
						this.alert("load " + ea + " module")}
				]}
			)]
		});

		var menu = new MenuMorph(items, this.world());
		menu.openIn(this.world(), pos, false, 
			"require module for this page");

	},
	// this.world().showRemoveWorldRequirementsMenu(pt(100,100))
	showRemoveWorldRequirementsMenu: function(pos) {
		var pageModules = ChangeSet.current().getWorldRequirementsList().evaluate() 
		var items = pageModules
			.sort()
			.collect(function(ea){ 
			return [ea, function(){
				ChangeSet.current().removeWorldRequirement(ea);
				this.alert("remove " + ea + " module requirement")}]
		})
		var menu = new MenuMorph(items, this.world())
		menu.openIn(this.world(), pos, false, 
			"remove module requirement for this page");
	}
},
'Feedback and Saving', {

	promptAndSaveWorld: function(asJson) {
		this.prompt("world file (.xhtml)", function(filename) {
			if (!filename.endsWith('.xhtml')) filename += '.xhtml'
			var start = new Date().getTime();	
			var onFinish = function(url) {
				WorldMorph.current().setStatusMessage('goto ' + url, Color.green, undefined, 
					function(){ window.open(url)});

				if (Config.changeLocationOnSaveWorldAs)
					window.location = url;
			};
			if (asJson) this.saveWorldWithJSON(filename, onFinish);
			else this.exportLinkedFile(filename);
			var time = new Date().getTime() - start;
			this.setStatusMessage("world save as " + filename + " in " + time + "ms", Color.green, 3)	


		}.bind(this)); 
	},

	saveWorldWithJSON: function(optURLOrPath, optOnFinish) {
		var world = this,
			url = optURLOrPath || URL.source,
			start = new Date().getTime(),
			onFinished = function(status) {
				if (!status.isDone() || !status.isSuccess()) return;
				var time = new Date().getTime() - start;
				world.setStatusMessage("world saved to " + url + " in " + time +
					"ms \n(" + time + "ms serialization)", Color.green, 3)
				optOnFinish && optOnFinish.call(this, url);
			};
			
		// make relative to absolute URL
		try { url = new URL(url) } catch(e) { url = URL.source.withFilename(url) };
		var warnIfOverriden = url.toString() === URL.source.toString();
		require("lively.persistence.Serializer").toRun(function() {
			if (world._statusMessageContainer) world._statusMessageContainer.remove();
			var doc = lively.persistence.Serializer.serializeWorld(world),
				titleTag = doc.getElementsByTagName('title')[0];
			if (titleTag) titleTag.textContent = url.filename().replace('.xhtml', '');
			new DocLinkConverter(URL.codeBase, url.getDirectory()).convert(doc);
			Exporter.saveDocumentToFile(doc, url, onFinished, warnIfOverriden);
		});

		return url;
	},
	
	saveWorld: function(optURLOrPath) {
		var url = optURLOrPath || URL.source;
		// make relative to absolute URL
		try { url = new URL(url) } catch(e) { url = URL.source.withFilename(url) };
		var start = new Date().getTime(),
			self = this,
			serializeTime,
			onFinished = function() {
				var time = new Date().getTime() - start;
				self.setStatusMessage("world saved to " + url +
					" in " + time + "ms \n(" + serializeTime + "ms serialization)", Color.green, 3);
				},
			statusMessage = WorldMorph.current().setStatusMessage("serializing....");
		(function() {
			var doc, world = this, oldHand = this.firstHand(),
				oldKeyboardFocus = oldHand.keyboardFocus;
			this.removeHand(oldHand);
			try {
				doc = Exporter.shrinkWrapMorph(this.world());
			} catch(e) {
				this.setStatusMessage("Save failed due to:\n" + e, Color.red, 10, function() {
					world.showErrorDialog(e)
				})
			} finally {
				this.addHand(oldHand);
				console.log("setting back keyboard focus to" + oldKeyboardFocus)
				if (oldKeyboardFocus)
					oldKeyboardFocus.requestKeyboardFocus(oldHand);
			}
			new DocLinkConverter(URL.codeBase, url.getDirectory()).convert(doc);
			statusMessage.remove();
			(function removeJSONIfPresent() {
				var jsonEl = doc.getElementById('LivelyJSONWorld');
				if (jsonEl) jsonEl.parentNode.removeChild(jsonEl);
			})()
			serializeTime = new Date().getTime() - start;
			(function() {
				Exporter.saveDocumentToFile(doc, url, onFinished);
			}).bind(this).delay(0);
		}).bind(this).delay(0);
		return url;
	},

	windowBounds: function () {
		var canvas = this.canvas();
		var scale = 1/this.world().getScale();
		var topLeft = pt(Global.pageXOffset - (canvas.offsetLeft || 0), Global.pageYOffset - (canvas.offsetTop || 0));
		var width = Math.min(
			Global.document.documentElement.clientWidth * scale,
			WorldMorph.current().getExtent().x);
		var height = Math.min(
			Global.document.documentElement.clientHeight * scale,
			WorldMorph.current().getExtent().y)
		return topLeft.scaleBy(scale).extent(pt(width, height));
	},
	
	visibleBounds: function() {
		var windowBounds = this.windowBounds();
		var worldBounds = this.shape.bounds(); // use shape so no stick-outs are included
		var upperLeft = pt(Math.max(windowBounds.x, worldBounds.x), Math.max(windowBounds.y, worldBounds.y));
		var lowerRight = pt(Math.min(windowBounds.width, worldBounds.width), Math.min(windowBounds.height, worldBounds.height));
		return upperLeft.extent(lowerRight);
	},

	ensureStatusMessageContainer: function() {
		if (!this._statusMessageContainer || ! this._statusMessageContainer.owner) {
			this._statusMessageContainer = new StatusMessageContainer();
			this._statusMessageContainer.setName("statusMorphContainer");
			this.addMorph(this._statusMessageContainer);
			this._statusMessageContainer.startUpdate();
		};
		return this._statusMessageContainer
	},

	setStatusMessage: function(msg, color, delay, callback, optStyle, messageKind) {
		var container = this.ensureStatusMessageContainer();
		return container.addStatusMessage(msg, color, delay, callback, optStyle, messageKind);
	},	

	showStatusProgress: function(msg) {
		var container = this.ensureStatusMessageContainer();
		var progressBar = container.addProgressBar(msg);		
		return progressBar
	},
	
	askForWorldTitle: function() {
		var self = this;
		this.prompt('new world title', function(input) {
			document.title = input;
			var titleTag = document.getElementsByTagName('title')[0];
			titleTag.textContent = input;
		}, document.title);
	},
	askForUserName: function() {
		this.prompt("Please, give your username", function(name) {
			if (name) {
				alertOK("setting username to: " + name)
				localStorage.livelyUserName = name
			} else {
				alertOK("removing username")
				localStorage.livelyUserName = undefined
			}
		})
	},

},
/**
 *	WorldMorph Menu 
 *
 *  Question: Should features register itself in the menu, 
 *  or should the menu give an overview of available features 
 *  and load the modules on demand?
 */
'Menus ', {
	isProtectedWorld: function() {
		return Global.URL && (URL.source.filename() == "index.xhtml")
	},
	
	morphMenu: function($super, evt) { 
		var menu = $super(evt);
		menu.keepOnlyItemsNamed(["inspect", "edit style"]);
		menu.addItems([['reset scale', function(evt) {
			var h = evt.hand, w = h.world();
			h.setScale(1); w.setScale(1); w.resizeCanvasToFitWorld();
		}]]);
		menu.addLine();
		menu.addItems(this.subMenuItems(evt, menu));
		menu.addLine();
		menu.addItem(["save world as ... ", function() { this.promptAndSaveWorld(true/*asJson*/) }]);

		if (!this.isProtectedWorld())
			menu.addItem(["save world (s)", function() { menu.remove(); this.saveWorldWithJSON() }]);

		menu.addItem(["download world", function() {
			require('lively.persistence.StandAlonePackaging').toRun(function() {
				lively.persistence.StandAlonePackaging.packageCurrentWorld();
			});
		}]);

		return menu;
	},
	
	simpleMorphsSubMenuItems: function(evt) {
		var world = this.world();
		return [
			["Line", function(evt) { 
				var p = evt.point(); 
				var m = Morph.makeLine([p, p.addXY(60, 30)], 2, Color.black);
				world.addMorph(m);
				m.setPosition(evt.point())}],
			["Connector", function(evt) { 
				require('lively.Connector').toRun(function() {
					var m = Morph.makeConnector(evt.point())
					world.addMorph(m);
					m.setGlobalEndPos(evt.point().addXY(60, 30))
				})}],
			["Rectangle", function(evt) { world.addMorph(Morph.makeRectangle(evt.point(), pt(60, 30)));}],
			["Ellipse", function(evt) { world.addMorph(Morph.makeCircle(evt.point(), 25)); }],
			["TextMorph", function(evt) { 
				var text = new TextMorph(evt.point().extent(pt(120, 10)), "This is a TextMorph");
				world.addMorph(text);}],
			["Star",function(evt) { world.addMorph(Morph.makeStar(evt.point()))}],
			["Heart", function(evt) { world.addMorph(Morph.makeHeart(evt.point()))}],
			["Marker", function(evt) {world.addMorph(new MarkerMorph(evt.point().extent(pt(100, 100))))}]
		];
	},

	complexMorphsSubMenuItems: function(evt) {
		var world = this.world();
		return [
			["ButtonMorph", function(evt) { world.addMorph(new ScriptableButtonMorph(evt.point().extent(pt(70, 30))))}],
			["SliderMorph", function(evt) { world.addMorph(Widget.makeSlider(evt.point().extent(pt(120, 40))))}],
			["List pane", function(evt) {
				var m = world.addMorph(newRealListPane(evt.point().extent(pt(300, 400))));
				m.applyStyle({fill: Color.gray, padding: Rectangle.inset(3), suppressHandles: false});
				m.adjustForNewBounds(); // for padding
			}],
 			["Text pane", function(evt) { 
				var m = world.addMorph(newTextPane(evt.point().extent(pt(300, 400)), 'empty'));
				m.applyStyle({fill: Color.gray, padding: Rectangle.inset(3), suppressHandles: false});
				m.adjustForNewBounds(); // for padding
			}],

			// ["ProgressBarMorph", function(evt) { world.addMorph(new ProgressBarMorph(evt.point().extent(pt(70, 30))))}],
			// ["ScaleMorph", function(evt) { world.addMorph(new ScaleMorph(evt.point().extent(pt(70, 30))))}],
			["Clock", function(evt) {
				require('lively.Examples').toRun(function() {
					var m = world.addMorph(new ClockMorph(evt.point(), 50));
					m.startSteppingScripts();
					ChangeSet.current().addWorldRequirement('lively.Examples')
				})}],
			// ["FabrikClock", function(evt) {
				// require('lively.Fabrik').toRun(function() {
					// var clock = new FabrikClockWidget();
					// var morph = clock.buildView();
					// world.addMorph(morph);
					// morph.setPosition(evt.point());
					// morph.startSteppingScripts(); }); }],
			["Piano Keyboard", function(evt) {
				require('lively.Examples').toRun(function() {
					var m = new PianoKeyboard(evt.point());
					m.scaleBy(1.5);	 m.rotateBy(-Math.PI*2/12);
					world.addMorph(m); }); }],
			["Kaleidoscope", function(evt) {
				require('lively.Examples').toRun(function() {
					var kal = WorldMorph.current().addMorph(new SymmetryMorph(300, 7)); 
					kal.startUp(); }) } ],
			["Image Morph", function(evt) {
				world.prompt('Enter image URL', function(urlString) {
					var img = new ImageMorph(evt.point().extent(pt(100,100)), urlString);
					img.openInWorld() }) }],
			["Video Morph", function(evt) {
				VideoMorph.openAndInteractivelyEmbed(evt.point()) }],

			// ["Duplicator Panel", function(evt) { 
			// 	require('lively.Graffle').toRun(function(){
			// 		world.addMorph(Morph.makeDefaultDuplicatorPanel(evt.point()))
			// 	}); 
			// }], 
			["FileUpload Morph", function(evt) { 
				require('lively.FileUploadWidget').toRun(function(){
					var morph = new FileUploadMorph();
					world.addMorph(morph)
					morph.setPosition(evt.point());
				}); 
			}],
		];
	},
	
	toolSubMenuItems: function(evt) {
		var world = this.world();
		var toolMenuItems = [
			["System code browser (b)", function(evt) { require('lively.ide').toRun(function(unused, ide) {new ide.SystemBrowser().openIn(world)})}],
			["Local code Browser (l)", function(evt) { require('lively.ide').toRun(function(unused, ide) {new ide.LocalCodeBrowser().openIn(world)})}],
			// ["Wiki code Browser", function(evt) { require('lively.ide', 'lively.LKWiki').toRun(function(unused, ide) {
				// var cb = function(input) {
					// var repo = new URL(input);
					// new ide.WikiCodeBrowser(repo).open()
				// };
				// world.prompt('Wiki base URL?', cb, URL.source.getDirectory().toString());
				// })}],
			// ["Switch System browser directory...", function(evt) { require('lively.ide').toRun(function(unused, ide) {
				// var cb = function(input) {
					// if (!input.endsWith('/')) input += '/';
					// ide.startSourceControl().switchCodeBase(new URL(input));
				// };
				// world.prompt('Enter System browser directory (URL)', cb, URL.source.getDirectory().toString());
				// })}],				
			["TestRunner", function(evt) { require('lively.TestFramework').toRun(function() { new TestRunner().openIn(world) }) }],
			// ["OMetaWorkspace", function(evt) { require('lively.Ometa').toRun(function() { new OmetaWorkspace().open() }) }],
			["Viewer for latest file changes", function(evt) {
				var cb = function(input) {
					require('lively.LKWiki').toRun(function(u,m) {
						var url = new URL(input);
						console.log(url);
						new LatestWikiChangesList(url).openIn(world);
				}); }
				world.prompt('Url to observe', cb, URL.source.getDirectory().toString()); 
			}],
			["Version Viewer", function(evt) {
				require('lively.ide').toRun(function() {
					ChangeSet.current().addWorldRequirement('lively.ide');
					new lively.ide.FileVersionViewer().openForURL(URL.source);
				});
			}],
			["MiniMap", function(evt) {
				var map = new MiniMapMorph();
				map.name = 'MiniMap';
				map.openInWorld();
				map.setTargetWorld(world);
				map.startSteppingScripts()
			}],			
			["load Scripting", function(evt) {
				module('lively.Scripting').load()
			}],			
		];

		return toolMenuItems
	},

	scriptingSubMenuItems: function(evt) {
		var world = this.world();
		return [
			["TileScriptingBox", function(evt) { require('lively.TileScripting').toRun(function() {new lively.TileScripting.TileBox().openIn(world); }) }],
			["Fabrik Component Box", function(evt) { require('lively.Fabrik').toRun(function() { Fabrik.openComponentBox(world); }) }],
			["Webcards with name", function(evt) { require('apps.Webcards').toRun(function(){
					var sds = new SimpleDataStore(pt(600, 300));
					world.prompt("Name of stack:", sds.openStackWithName.bind(sds));
					world.addFramedMorph(sds, 'WebCards', pt(333, 222));
				}); 
			}],
         
		];
	},

	preferencesSubMenuItems: function(evt) {
		var world = this.world();
		return [
			[(Config.usePieMenus ? "don't " : "") + "use pie menus",
				function() { Config.usePieMenus = !Config.usePieMenus; }],
			[(Morph.prototype.suppressBalloonHelp ? "enable balloon help" : "disable balloon help"),
				this.toggleBalloonHelp],
			[(HandMorph.prototype.useShadowMorphs ? "don't " : "") + "show drop shadows",
				function () { HandMorph.prototype.useShadowMorphs = !HandMorph.prototype.useShadowMorphs}],
			[(Config.showGrabHalo ? "don't " : "") + "show bounds halos",
				function () { Config.showGrabHalo = !Config.showGrabHalo}],
			[HandMorph.prototype.applyDropShadowFilter ? 
				"don't use filter shadows" : "use filter shadows (if supported)",
				function () { 
					HandMorph.prototype.applyDropShadowFilter = !HandMorph.prototype.applyDropShadowFilter}],
			[(Config.isSnappingToGrid ? "[X]": "[]") + " snap to grid",
				function(){Config.isSnappingToGrid = !Config.isSnappingToGrid}],
			[(Config.changeLocationOnSaveWorldAs ? "[X]": "[]") + " change location on save world as",
				function(){Config.changeLocationOnSaveWorldAs = !Config.changeLocationOnSaveWorldAs}],
			["set username", this.askForUserName],
		];
	},
	propertiesSubMenuItems: function(evt) {
		var world = this.world();
		return [
			["choose display theme...", this.chooseDisplayTheme],
			// is now set automatically...
			// ["change title",   this, 'askForWorldTitle'],
			["add module requirements...",
				 function(){this.showAddWorldRequirementsMenu(evt.mousePoint)}],
			["remove module requirements...",
				 function(){this.showRemoveWorldRequirementsMenu(evt.mousePoint)}],
			["resize world", this.resizeByUser],
		];
	},

	deprecatedSubMenuItems: function(evt, menu) {
		var world = this.world();
		return [
			["Tools", [
				["Class Browser", function(evt) { new SimpleBrowser().openIn(world, evt.point()); }],
				["File Browser", function(evt) { new FileBrowser().openIn(world) }],
				["Object Hierarchy Browser", function(evt) { new ObjectBrowser().openIn(world); }],
				["Console", function(evt) {world.addFramedMorph(new ConsoleWidget(50).buildView(pt(800, 100)), "Console"); }],
				["XHTML Browser", function(evt) { 
					var xeno = new XenoBrowserWidget('sample.xhtml');
					xeno.openIn(world); }],

			]],
			["Scripting", this.scriptingSubMenuItems()],
			["New subworld (LinkMorph)", function(evt) { evt.hand.world().addMorph(new LinkMorph(null, evt.point()));}],  
			["External link", function(evt) { evt.hand.world().addMorph(new ExternalLinkMorph(URL.source, evt.point()));}],
			["authenticate for write access", function() {
				new WebResource(URL.source.withFilename('auth')).put();
				// sometimes the wikiBtn seems to break after an authenticate
				if (Config.showWikiNavigator) WikiNavigator.enableWikiNavigator(true); }],

			["save world as ... (XML)", function() { this.promptAndSaveWorld() }],
			["save world (XML)", function() { 
				menu.remove(); 
				this.saveWorld();
			}],

		];
	},

	
	helpSubMenuItems: function(evt) {
		return	[
			["Connect documentation", function(evt) {
				require('lively.bindings').toRun(function() {
					world.openURLasText(new URL("http://lively-kernel.org/trac/wiki/ConnectHelp?format=txt"), "Connect documentation");
				})}],
			["Command key help", function(evt) {
				this.openURLasText(new URL("http://lively-kernel.org/trac/wiki/CommandKeyHelp?format=txt"), "Command key help"); }],
		];
	},
	
	debuggingSubMenuItems: function(evt) {
		var world = this.world();
		var items = [
			["FrameRateMorph", function(evt) {
				var m = world.addMorph(new FrameRateMorph(evt.point().extent(pt(160, 10)), "FrameRateMorph"));
				m.startSteppingScripts(); }],
			["EllipseMaker", function(evt) {
				var m = world.addMorph(new EllipseMakerMorph(evt.point()));
				m.startSteppingScripts(); }],
			['World serialization info', function() {
				require('lively.persistence.Debugging').toRun(function() {
					var json = lively.persistence.Serializer.serialize(world),
						printer = lively.persistence.Debugging.Helper.listObjects(json);
					world.addTextWindow(printer.toString());
				});
			}],
			['inspect ticking scripts', function() {
				world.inspectScheduledActions();
			}],
			["Enable profiling", function() {
				Config.debugExtras = true;
				lively.lang.Execution.installStackTracers(); }],
			["Call Stack Viewer", function(evt) { 
				if (Config.debugExtras) lively.lang.Execution.showStack("use viewer");
				else new StackViewer(this).openIn(world); }],
			["restart system", this.restart],
		];


		if (!Config.debugExtras) return items;

		var index = -1;
		for (var i=0; i<items.length; i++) if (items[i][0] == "Enable profiling") index = i;
		if (index < 0) return items;
		items.splice(index, 1,
			["-----"],
			["Profiling help", function(evt) { this.openURLasText( URL.common.project.withRelativePath(
				"/trac/wiki/ProfilingHelp?format=txt"), "Profiling help"); }],
			["Arm profile for next mouseDown", function() {evt.hand.armProfileFor("MouseDown") }],
			["Arm profile for next mouseUp", function() {evt.hand.armProfileFor("MouseUp") }],
			["Disable profiling", function() {
				Config.debugExtras = false;
				lively.lang.Execution.installStackTracers("uninstall");	 }],
			["-----"]);
	},

	
	subMenuItems: function(evt, menu) {
		//console.log("mouse point == %s", evt.mousePoint);
		return [
			['Simple morphs', this.simpleMorphsSubMenuItems(evt)],
			['Complex morphs', this.complexMorphsSubMenuItems(evt)],
			['Tools', this.toolSubMenuItems(evt)],
			['Properties', this.propertiesSubMenuItems(evt)],
			['Debugging', this.debuggingSubMenuItems(evt)],
			['Deprecated', this.deprecatedSubMenuItems(evt, menu)],
			['Preferences', this.preferencesSubMenuItems(evt)],
			['Help', this.helpSubMenuItems(evt)]];
	},
	
	showPieMenu: function(evt) {
		var beTouchFn;
		if (UserAgent.isTouch) {
			if (Config.touchBeMouse) {
				// If we were in mouse mode; switch back to touch
				beTouchFn = function(e) {
					//ClipboardHack.ensurePasteBuffer().blur();
					Config.touchBeMouse = false; // currently not used
					// evt.hand.lookTouchy()
				};
			} else {
				// Otherwise, switch to mouse mode now (we just clicked in world)
				// ClipboardHack.ensurePasteBuffer().focus();
				Config.touchBeMouse = true; // currently not used
				// evt.hand.lookNormal()
				return;
			}
		}
		var menu, targetMorph = this;
		var items = [
			['make selection ([NE])', function(evt) { targetMorph.makeSelection(evt); }],
			['make selection ([SE])', function(evt) { targetMorph.makeSelection(evt); }],
			['make selection ([SW])', function(evt) { targetMorph.makeSelection(evt); }],
			((UserAgent.isTouch) ? ['use touch ((O))', beTouchFn]
				: ['make selection ([NW])', function(evt) { targetMorph.makeSelection(evt); }])
			];
		menu = new PieMenuMorph(items, this, 0, beTouchFn);
		menu.open(evt);
	}
 
},
'Copy And Paste (Private)',{
	/* Actions */
	
	
	
	pastePosition: function() {
		var pos = this.hands.first().lastMouseDownPoint;
		if (!pos || pos.eqPt(pt(0,0)))
			pos = this.hands.first().getPosition();
		return pos
	},
	
	
	
	// similarities to Fabrik >> pasteComponentFromXMLStringIntoFabrik
	// TODO refactor
	pasteFromSource: function(source){
		var copier = new ClipboardCopier();
		copier.pastePosition = this.pastePosition();
		copier.pasteMorphsFromSource(source, this.pasteDestinationMorph());
	},
	
	copySelectionAsXMLString: function() {
		if (!this.currentSelection) {
			console.log("WorldMorph: don't know what to copy")
			return
		}
		var selectedMorphs = this.currentSelection.selectedMorphs
		if (selectedMorphs.length == 0) {
			console.log("WorldMorph: selection is empty")
			return 
		};
		return  new ClipboardCopier().copyMorphsAsXMLString(selectedMorphs)
	},

	pasteDestinationMorph: function() {
		return this;
	},
	
	
},
'Keyboard Events',{

	takesKeyboardFocus: Functions.True,
	
	onKeyDown: function(evt) {
		// alert("WorldMorph onKeyDown " + this + " ---  " + evt + " char: " + evt.getKeyChar() )
		var key = evt.getKeyChar();
		if (! key.toLowerCase)
			return;

		key = key.toLowerCase();

		if ( evt.isAltDown()) {
			if (key == 'c') {
				this.doCopyStyle()
				evt.stop()
				return true;
			};
			if (key == 'v') {
				this.doPasteStyle()
				evt.stop()
				return true;
			}
		}

		if ( evt.isCommandKey() && evt.isShiftDown()) {
			if (key == 'f') {
				var world = this;
				require('lively.ide').toRun(function(unused, ide) {
					world.prompt("browse references in source", function(whatToSearch) {
						ide.startSourceControl().browseReferencesTo(whatToSearch);
					});
				})
				evt.stop();
				return true;
			};
			if (key == 'b') {
				// for safari where without shift is blocked
				require('lively.ide').toRun(function() { new lively.ide.SystemBrowser().open() });
				evt.stop();
				return true;
			}
		}
		if (evt.isCommandKey() && !evt.isShiftDown()) {
			if (key == 'b') {
				require('lively.ide').toRun(function() { new lively.ide.SystemBrowser().open() });
				evt.stop();
				return true;
			}
			if (key == 'l') { // (L)ocal code browser
				// new ConsoleWidget().open();
				require('lively.ide').toRun(function() { new lively.ide.LocalCodeBrowser().open() });
				evt.stop();
				return true;
			}
			if (key == 'k') { // Workspace
				this.addTextWindow("Workspace");
				evt.stop();
				return true;
			}
			if (key == 's') { // save
				if (!this.isProtectedWorld()) {
					this.saveWorldWithJSON();
				} else {
					this.setStatusMessage("Warning: Did not save world, because it is protected!", Color.red, 3)
				}
				evt.stop();
				return true;

			}
		}
		return ClipboardHack.tryClipboardAction(evt, this);
	},
	
	onKeyPress: function(evt) {
		// do nothing
		// console.log("World onKeyPress " + evt + " char: " + evt.getKeyChar())
		return false;
	},

	onKeyUp: function(evt) {
		// do nothing
		// console.log("World onKeyUp " + evt + " char: " + evt.getKeyChar())
		return false
	},
},
'Commands',{

	doCopy: function() {
		var source = this.copySelectionAsXMLString();
		TextMorph.clipboardString = source;
	},
	
	doPaste: function() {
		if (TextMorph.clipboardString) {
			// console.log("paste morphs...")
			this.pasteFromSource(TextMorph.clipboardString);
		}
	},
	doCopyStyle: function() {
		var target = this.firstHand().keyboardFocus;
		if (this.currentSelection && this.currentSelection.selectedMorphs.length > 0) {
			target = this.currentSelection.selectedMorphs[0]
		};

		alert('copy style: ' + target)
		if (target)
			new StyleCopier().copyFromMorph(target)
		else
			alert("no target")
	},
	doPasteStyle: function() {
		var targets
		if (this.currentSelection && this.currentSelection.selectedMorphs.length > 0) {
			targets = this.currentSelection.selectedMorphs
		} else {
			targets = [this.firstHand().keyboardFocus];
		}
		targets.forEach(function(ea){
			new StyleCopier().pasteToMorph(ea)
		})	
	},


	
	doCut: function() {
		console.log("cut selection")
		this.doCopy();
 		if (this.currentSelection) 
			this.currentSelection.remove();
	},
},
'local code', {
	getChangeSet: function() {
		return ChangeSet.fromWorld(this);
	},
	setChangeSet: function(cs) {
		cs.addHookTo(cs.findOrCreateDefNodeOfWorld(this.rawNode));
	},

	getCodeNode: function() {
		var codeElement = Query.find('./svg:defs/*[local-name()="code"]', this.rawNode);
		return codeElement;
	},
	replaceCodeNode: function(newCodeNode) {
		this.getDefsNode().replaceChild(this.getCodeNode(), newCodeNode);
		return newCodeNode;
	},



},'signals',{
	signalGeometryChange: function() {
		signal(this, 'geometryChanged')
		// don't go to the submorphs
	},

})


Object.extend(WorldMorph, {    
    worldCount: 0,
    
    currentWorld: null,
    
    current: function() {
        return WorldMorph.currentWorld;
    }
});



/**
 * @class HandMorph
 * Since there may be multiple users manipulating a Morphic world
 * simultaneously, we do not want to use the default system cursor.   
 */ 

Morph.subclass("HandMorph", 
'default properties', {   
    documentation: "Defines a visual representation for the user's cursor.",
    applyDropShadowFilter: !!Config.useDropShadow,
    dropShadowFilter: "url(#DropShadowFilter)",
    useShadowMorphs: Config.useShadowMorphs,

    shadowOffset: pt(5,5),
    handleOnCapture: false,
    logDnD: Config.logDnD,
    grabHaloLabelStyle: {fontSize: Math.floor((Config.defaultFontSize || 12) *0.85), padding: Rectangle.inset(0)},

},
'Basic',{
    initialize: function($super, local) {
        $super(new lively.scene.Polygon([pt(0,0), pt(10, 8), pt(4,9), pt(8,16), pt(4,9), pt(0, 12)]));
		this.applyStyle({fill: local ? Color.primary.blue : Color.primary.red, borderColor: Color.black, borderWidth: 1});
	
        this.isLocal = local;

        this.keyboardFocus = null;
        this.mouseFocus = null;
		this.mouseFocusChanges_ = 0; // count mouse focus changes until reset
        this.mouseOverMorph = null;
        this.lastMouseEvent = null;
        this.lastMouseDownPoint = pt(0,0);
        this.lastMouseDownEvent = null;
        this.hasMovedSignificantly = false;
        this.grabInfo = null;
        
        this.mouseButtonPressed = false;

        this.keyboardFocus = null; 

        this.priorPoint = null;
        this.owner = null;
		this.boundMorph = null; // surrounds bounds
		this.layoutChangedCount = 0; // to prevent recursion on layoutChanged
        return this;
    },

	id: function() {
		if (!this.rawNode) {
			return undefined
		}
		return this.rawNode.getAttribute("id");
	},

    world: function() {
        return this.owner;
    },
},
'Looks',{

    lookNormal: function(morph) {
        this.shape.setVertices([pt(0,0), pt(10, 8), pt(4,9), pt(8,16), pt(4,9), pt(0, 12)]);
    },
	
	lookTouchy: function(morph) {
		// Make the cursor look polygonal to indicate touch events go to pan/zoom
		var n = 5, r = 10, theta = 2*Math.PI/n;
		var verts = [0, 1, 2, 3, 4, 0].map(function(i) { return Point.polar(r, i*theta).addXY(20,0) });
		this.shape.setVertices(verts);
    },


    lookLinky: function(morph) {
        this.shape.setVertices([pt(0,0), pt(18,10), pt(10,18), pt(0,0)]);
    },

	lookLikeAnUpDownArrow: function() {
		//       /\
		//     /_ _\
		//     _||_
		//    \   /
		//     \/
		var verts = [
			pt(8.0,0.0), pt(16.0,8.0), pt(12.0,8.0), pt(12.0,16.0), pt(16.0,16.0),
			pt(8.0,24.0), pt(0.0,16.0), pt(4.0,16.0), pt(4.0,8.0), pt(0.0,8.0)
		];
		this.shape.setVertices(verts);
	},
},
'Event Registering',{
	addOrRemoveEvents: function(morphOrNode, eventNames, isRemove) {
		var node = morphOrNode.rawNode || morphOrNode;
		var selector = isRemove ? 'removeEventListener' : 'addEventListener';
		eventNames.forEach(function(name) { 
            node[selector](name, (!UserAgent.isIE ? this : this.handleEvent.bind(this)), this.handleOnCapture);
		}, this);
	},
	
    registerForEvents: function(morphOrNode) {
		this.addOrRemoveEvents(morphOrNode, Event.basicInputEvents);
    },

    unregisterForEvents: function(morphOrNode) {
		this.addOrRemoveEvents(morphOrNode, Event.basicInputEvents, true);
    },
    
    registerForKeyboardEvents: function(morphOrNode) {
		this.addOrRemoveEvents(morphOrNode, Event.keyboardEvents);
    },

    unregisterForKeyboardEvents: function(morphOrNode) {
		this.addOrRemoveEvents(morphOrNode, Event.keyboardEvents, true);
    },

},
'Focus',{
    resetMouseFocusChanges: function() {
		var result = this.mouseFocusChanges_;
		this.mouseFocusChanges_ = 0;
		return result;
    },

    setMouseFocus: function(morphOrNull) {
        //console.log('setMouseFocus: ' + morphOrNull);
		this.mouseFocus = morphOrNull;
		// this.setFill(this.mouseFocus ? Color.primary.blue.lighter(2) : Color.primary.blue);
		this.mouseFocusChanges_ ++;
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
            this.keyboardFocus.onFocus(this);
        }
    },
    
},
'Event Handling',{
	// this is the DOM Event callback
	handleEvent: function HandMorph$handleEvent(rawEvt) {
		var evt = new Event(rawEvt);
		// for mutliple worlds since keyboard events can only be registered for entire documentElement
		if (rawEvt.world && rawEvt.world != this.world())
			return evt;
		rawEvt.world = this.world();
		evt.setCanvas(this.canvas());
		evt.hand = this;
		//if(Config.showLivelyConsole) console.log("event type = " + rawEvt.type + ", platform = " +  window.navigator.platform);

		lively.lang.Execution.resetDebuggingStack();
		switch (evt.type) {
			case "MouseWheel":
			case "MouseMove":
			case "MouseDown":
			case "MouseUp":
				this.handleMouseEvent(evt);
				break;
			case "KeyDown":
			case "KeyPress": 
			case "KeyUp":
				this.handleKeyboardEvent(evt);
				break;
			case "touchstart":
			case "touchmove":
			case "touchend": 
			case "touchcancel":
				this.handleTouchEvent(evt);
				break;
			default:
				console.log("unknown event type " + evt.type);
		}
		evt.stopPropagation();
		return evt; // for touch development FIXME remove
	}.logErrors('Event Handler'),

    armProfileFor: function(evtType) { 
		this.profileArmed = evtType;  // either "MouseDown" or "MouseUp"
    },

	makeANullMove: function() {
		// Process a null mouseMove event -- no change in x, y
		// Allows simulations to respond where, eg, a morph moves under the mouse
		// Note: Fabrik generates also Mouse events with newFakeMouseEvent; to be merged
		var last = this.lastMouseEvent;
		if (!last) return;
		var nullMove = new Event(last.rawEvent);
		nullMove.type = "MouseMove";
		nullMove.hand = this;
		// console.log("last = " + Object.inspect(this.lastMouseEvent));
		// console.log("null = " + Object.inspect(nullMove));
		this.reallyHandleMouseEvent(nullMove);
		this.lastMouseEvent = last;  // Restore -- necess??
	},

	handleMouseEvent: function HandMorph$handleMouseEvent(evt) {
		if(!Config.debugExtras || !this.profileArmed || this.profileArmed != evt.type) {
			// Profile not armed or event doesnt match
			return this.reallyHandleMouseEvent(evt);
		}
		// Run profile during handling of this event
		this.profileArmed = null;  // Only this once
		var result;
		lively.lang.Execution.trace(function() { result = this.reallyHandleMouseEvent(evt) }.bind(this), this.profilingOptions );
		return result;
	},
	handleTouchEvent: function(evt) {
		// to be implemented 
		// console.log('handle touch event ')
	},


	reallyHandleMouseEvent: function HandMorph$reallyHandleMouseEvent(evt) { 
		// console.log("reallyHandleMouseEvent " + evt + " focus " +  this.mouseFocus);
		// var rawPosition = evt.mousePoint;
		var world = this.owner;
		evt.mousePoint = evt.mousePoint.matrixTransform(world.getTransform().createInverse()); // for scaling
		evt.setButtonPressedAndPriorPoint(this.mouseButtonPressed, 
					  this.lastMouseEvent ? this.lastMouseEvent.mousePoint : null);
		//-------------
		// mouse move
		//-------------
		if (evt.type == "MouseMove" || evt.type == "MouseWheel") { // it is just a move
			this.setPosition(evt.mousePoint);
			
			if(evt.isShiftDown())
				this.alignToGrid();
			
			this.updateGrabHalo();
			
			if (evt.mousePoint.dist(this.lastMouseDownPoint) > 10) { 
				this.hasMovedSignificantly = true;
			}
			
			if (this.mouseFocus) { // if mouseFocus is set, events go to that morph
				this.mouseFocus.captureMouseEvent(evt, true);
			} else if (world) {
				var receiver = world.morphToReceiveEvent(evt);
				// console.log("found receiver: " + receiver)
				if (this.checkMouseOverAndOut(receiver, evt)) {	 // mouseOverMorph has changed...
					if (!receiver || !receiver.canvas()) return false;	// prevent errors after world-switch
					// Note if onMouseOver sets focus, it will get onMouseMove
					if (this.mouseFocus) this.mouseFocus.captureMouseEvent(evt, true);
					else if (!evt.hand.hasSubmorphs()) world.captureMouseEvent(evt, false); 
				} else if (receiver) receiver.captureMouseEvent(evt, false);
			}
			this.lastMouseEvent = evt;
			return true;
		} 

	
		//-------------------
		// mouse up or down
		//-------------------
		if (!evt.mousePoint.eqPt(this.position())) { // Only happens in some OSes
			// and when window wake-up click hits a morph
			this.moveBy(evt.mousePoint.subPt(this.position())); 
		}

		this.mouseButtonPressed = (evt.type == "MouseDown"); 
		this.setBorderWidth(this.mouseButtonPressed ? 2 : 1);
		evt.setButtonPressedAndPriorPoint(this.mouseButtonPressed, this.lastMouseEvent ? this.lastMouseEvent.mousePoint : null);
	
		if (this.mouseFocus != null) {
			if (this.mouseButtonPressed) {
				this.mouseFocus.captureMouseEvent(evt, true);
				this.lastMouseDownPoint = evt.mousePoint; 
			} else {
				this.mouseFocus.captureMouseEvent(evt, true);
			}
		} else {
			if (this.hasSubmorphs() && (evt.type == "MouseDown" || this.hasMovedSignificantly)) {
				// If laden, then drop on mouse up or down
				var m = this.topSubmorph();
				var receiver = world.morphToGrabOrReceiveDroppingMorph(evt, m);
				// For now, failed drops go to world; later maybe put them back?
				this.dropMorphsOn(receiver || world);
			} else {
				// console.log("hand dispatching event %s to owner %s", evt, this.owner);
				// This will tell the world to send the event to the right morph
				// We do not dispatch mouseup the same way -- only if focus gets set on mousedown
				if (evt.type == "MouseDown") world.captureMouseEvent(evt, false);
			}
			if (evt.type == "MouseDown") {
				this.lastMouseDownPoint = evt.mousePoint;
				this.lastMouseDownEvent = evt;
				this.hasMovedSignificantly = false; 
			}
		}
		this.lastMouseEvent = evt; 
		return true;
	},
},
'Misc',{	
    checkMouseUpIsInClickTimeSpan: function(mouseUpEvent) {
		// console.log("checkMouseUpIsInClickTimeSpan " + this.lastMouseDownEvent.timeStamp )
		if (!this.lastMouseDownEvent || !mouseUpEvent)
			return false;
		return (mouseUpEvent.timeStamp - this.lastMouseDownEvent.timeStamp) < (400)
	},

    checkMouseOverAndOut: function(newMouseOverMorph, evt) {
		if (newMouseOverMorph === this.mouseOverMorph) return false;

		// if over a new morph, send onMouseOut, onMouseOver
		if (this.mouseOverMorph) this.mouseOverMorph.onMouseOut(evt);
		this.mouseOverMorph = newMouseOverMorph;
		// console.log('msOverMorph set to: ' + Object.inspect(this.mouseOverMorph));
		if (this.mouseOverMorph) this.mouseOverMorph.onMouseOver(evt);
		return true;
	},

    layoutChanged: function($super) {
		this.layoutChangedCount ++;
		try {
			$super();
			if (this.layoutChangedCount == 1) {
				Config.showGrabHalo && this.updateGrabHalo();
			}
		} finally {
			this.layoutChangedCount --;
		}
    },
},
'Keyboard Events',{
	isKeyDown: function(character) {
		if (!this.keysDown)
			return false;
		return this.keysDown[character]
	},
	
	forgetKeyDown: function(evt) {
		if (!this.keysDown)
			return;
		this.keysDown[evt.getKeyChar()] = false;
		// hack, around weired events when command is pressed
		if (evt.getKeyCode() == 91) {
			// console.log("clear keydown list...")
			this.keysDown = {};
		
		};
	},

	rememberKeyDown: function(evt) {
		if (!this.keysDown) {
			this.keysDown = {};
		};
 		//console.log("remember KeyDown " + evt.getKeyChar())
		this.keysDown[evt.getKeyChar().toUpperCase()] = true;
	},

    handleKeyboardEvent: function(evt) { 
		// console.log("event: " + evt )
		if(evt.type == "KeyUp") {
 			this.forgetKeyDown(evt);			
		};
        if (this.hasSubmorphs())  {
            if (evt.type == "KeyDown" && this.moveSubmorphs(evt)) return;
            else if (evt.type == "KeyPress" && this.transformSubmorphs(evt)) return;
        }
		var consumed = false;
        // manual bubbling up b/c the event won't bubble by itself
		var world = this.world();
        for (var responder = this.keyboardFocus || world; responder != null; responder = responder.owner || world) {
			if (responder.takesKeyboardFocus()) {
                var handler = responder[evt.handlerName()];
                if (handler) {
                    if (handler.call(responder, evt)) {
						consumed = true;
                        break; // event consumed?		
					}
                }
            }
			if (responder == world) break;
        }

		if (!consumed) {
			// console.log("not consumed " + evt)
			// the single command key evt 
			if (evt.isCommandKey()) // rk: what is that supposed to do?
				ClipboardHack.selectPasteBuffer();			
				
			// remember key down for mouse events
			if(evt.type == "KeyPress") {
				this.rememberKeyDown(evt);
			};
		};
		this.blockBrowserKeyBindings(evt);
    },
	
    blockBrowserKeyBindings: function(evt) {
		switch (evt.getKeyCode()) {
			case Event.KEY_SPACEBAR: // [don't] scroll
		    	// stop keypress but don't try to stop preceeding keydown,
		    	// which would prevent keypress from firing and being handled by Text etc
		    	if (evt.type == "KeyPress") evt.stop();
		    	break;
		    case Event.KEY_BACKSPACE: // [don't] go to the previous page 
		    	evt.stop();
		    	break;
			case 22:
			case 3:
			case 24:
				if (evt.isCtrlDown() && evt.type == "KeyPress") 
					evt.preventDefault(); // ctrl+x, ctrl+c, or ctrl+v pressed
				break;
			}
		switch (evt.getKeyChar()) {
			case "[":
			case "]":
		    	if (evt.isMetaDown() && evt.type == "KeyPress") {
					// Safari would want to navigate the history
					evt.preventDefault();
					break;
		    }
		}	
    },
},
'Geometry',{
	bounds: function($super) {
		// account for the extra extent of the drop shadow
		// FIXME drop shadow ...
		return this.shadowMorph ? $super().expandBy(this.shadowOffset.x) : $super();
	},

	getInsertPositionFor: function(m, isFront) {
		if (this.submorphs.length == 0) return this.shape.rawNode;
		return isFront ? this.submorphs.last().rawNode : this.submorphs.first().rawNode;
	},

    toString: function($super) { 
        var superString = $super();
        var extraString = Strings.format(", local=%s,id=%s", this.isLocal, this.id());
        if (!this.hasSubmorphs()) 
			return superString + ", an empty hand" + extraString;
        return Strings.format("%s, a hand carrying %s%s", superString, this.topSubmorph(), extraString);
    },

	setPosition: function($super, pos) {
		$super(pos);
		if (this.hasSubmorphs())
			this.scrollDuringDrag()
		return pos;
	},
},
'Indicator',{
	removeIndicatorMorph: function() {
		if (!this.indicatorMorph)
			return;
		this.indicatorMorph.remove();
		this.indicatorMorph = undefined;
	},

	ensureIndicatorMorph: function() {
		if (this.indicatorMorph)
			return this.indicatorMorph;
		var morph = new TextMorph(new Rectangle(0,0,100,20));
		morph.setPosition(this.shape.bounds().bottomRight().addPt(pt(-5,-5)))
		morph.ignoreEvents();
		morph.isEpimorph = true;
		morph.setBorderWidth(0);
		morph.setStrokeOpacity(0);
		morph.setFill(null);
		this.indicatorMorph = morph;
		this.addMorph(morph);
		return morph
	},

	hasSubmorphs: function() {
		if (this.submorphs.length == 0)
			return false;
		else
			return this.submorphs.reject(function(ea) {return ea.isEpimorph}).length != 0;
	},
},
'Scrolling',{
	scrollDuringDrag: function(counter) {
		var scrollSpeed = 0.3; // should go into config options?
		var maxSteps = 30;
		
		var world = this.world();
		var wb = world.windowBounds();
		var pos = this.getPosition();
		counter = counter  || 1;
		
		var worldScale = world.getScale();
		var steps = counter * scrollSpeed * worldScale;
		steps = Math.min(steps, maxSteps);
		var animate = false;
		var self = this;
		
		var scroll = function(delta) {
			var oldPos = pt(Global.scrollX, Global.scrollY)
			Global.scrollBy(delta.x, delta.y);			var newPos = pt(Global.scrollX, Global.scrollY)
			var scrollDelta = newPos.subPt(oldPos).scaleBy(1 / worldScale);
			self.moveBy(scrollDelta.scaleBy(1))
			animate = true;
		};
		var offset = 50
		if (pos.x + offset >  wb.right()) scroll(pt(steps,0));
		if (pos.x - offset <  wb.left()) scroll(pt(-steps,0));
		if (pos.y - offset <  wb.top()) scroll(pt(0, - steps));
		if (pos.y + offset  >  wb.bottom()) scroll(pt(0, steps))
		if (animate) {
			(function(){self.scrollDuringDrag( counter + 1)}).delay()	
		}
	}
},
'Fabrik Extension (DEPRECATED)',{
    changed: function($super, morph) {
        $super();
        this.globalPosition = this.getPosition();
        this.submorphs.forEach(function(ea){
            // console.log("changed "+ ea);
            ea.changed("globalPosition", this.getPosition());
        }, this);
    },
});

Morph.subclass('LinkMorph', {

    documentation: "two-way hyperlink between two Lively worlds",
    helpText: "Click here to enter or leave a subworld.\n" +
        "Use menu 'grab' to move me.  Drag objects\n" +
        "onto me to transport objects between worlds.",
    openForDragAndDrop: false,
    suppressHandles: true,
	style: {
		borderColor: Color.black, 
		fill: lively.lang.let(lively.paint, function(g) { 
			return new g.RadialGradient([new g.Stop(0, Color.blue.lighter()) , new g.Stop(0.5, Color.blue), 
			new g.Stop(1, Color.blue.darker())], pt(0.4, 0.2))})
	},
    
	initialize: function($super, otherWorld, initialPosition) {
		// In a scripter, type: world.addMorph(new LinkMorph(null))

		// Note: Initial position can be specified either as a rectangle or point.
		// If no position is specified, place the icon in the lower left corner
		// of the screen.
		initialPosition = initialPosition || WorldMorph.current().bounds().bottomLeft().addXY(50, -50);
		$super(new lively.scene.Ellipse(initialPosition, 25));
		var bounds = this.shape.bounds();

		// Make me look a bit like a world
		[new Rectangle(0.15,0,0.7,1), new Rectangle(0.35,0,0.3,1), new Rectangle(0,0.3,1,0.4)].forEach(function(each) {
			// Make longitude / latitude lines
			var lineMorph = new Morph(new lively.scene.Ellipse(bounds.scaleByRect(each)));
			lineMorph.applyStyle({fill: null, borderWidth: 1, borderColor: Color.black}).ignoreEvents();
			this.addMorph(lineMorph);
		}, this);

		if (!otherWorld) {
			this.myWorld = this.makeNewWorld(this.canvas());
			this.addPathBack();
		} else {
			this.myWorld = otherWorld;
		}
		return this;
	},
    
	makeNewWorld: function(canvas) {
		return new WorldMorph(canvas);
	},
    
	addPathBack: function() {
		var pathBack = new LinkMorph(WorldMorph.current(), this.bounds().center());

		pathBack.setFill(lively.lang.let(lively.paint, function(gfx) {
			return new gfx.RadialGradient([new gfx.Stop(0, Color.orange), 
			new gfx.Stop(0.5, Color.red), 
			new gfx.Stop(1, Color.red.darker(2))],
			pt(0.4, 0.2));
		}));

		this.myWorld.addMorph(pathBack);
		return pathBack;
	},
    
	onDeserialize: function() {
		//if (!this.myWorld) 
		this.myWorld = WorldMorph.current(); // a link to the current world: a reasonable default?
	},

	handlesMouseDown: function(evt) {
		return true; 
	},

	onMouseDown: function(evt) {
		this.enterMyWorld(evt); 
		return true; 
	},

	morphMenu: function($super, evt) { 
		var menu = $super(evt);
		menu.addItem(["publish linked world as ... ", function() { 
		this.world().prompt("world file (.xhtml)", this.exportLinkedFile.bind(this)); }]);
		menu.replaceItemNamed("package", ["package linked world", function(evt) {
			new PackageMorph(this.myWorld).openIn(this.world(), this.bounds().topLeft()); this.remove()} ]);
		return menu;
	},

	enterMyWorld: function(evt) { // needs vars for oldWorld, newWorld
		carriedMorphs = [];

		// Save, and suspend stepping of, any carried morphs
		evt.hand.unbundleCarriedSelection();
		evt.hand.carriedMorphsDo( function (m) {
			m.suspendAllActiveScripts();
			carriedMorphs.splice(0, 0, m);
			evt.hand.shadowMorphsDo( function(m) { m.stopAllStepping(); });
			evt.hand.showAsUngrabbed(m);
		});
		evt.hand.removeAllMorphs();
		this.hideHelp();
		this.myWorld.changed();
		var oldWorld = WorldMorph.current();
		oldWorld.onExit();    

		if (Config.suspendScriptsOnWorldExit)
			oldWorld.suspendAllActiveScripts();

		var canvas = oldWorld.canvas();
		oldWorld.remove(); // some SVG calls may stop working after this point in the old world.

		console.log('left world %s through %s', oldWorld, this);

		// display world first, then add hand, order is important!
		var newWorld = this.myWorld;
		if (newWorld.owner) {
			console.log("new world had an owner, removing");
			newWorld.remove();
		}

		newWorld.displayOnCanvas(canvas);  // Becomes current at this point

		if (Config.suspendScriptsOnWorldExit) { 
			newWorld.resumeAllSuspendedScripts();
		}

		carriedMorphs.forEach(function(m) {
			var hand = newWorld.firstHand();
			m.resumeAllSuspendedScripts();
			hand.addMorphAsGrabbed(m);
		});

		if (Config.showThumbnail) {
			var scale = 0.1;
			if (newWorld.thumbnail) {
				console.log("disposing of a thumbnail");
				newWorld.thumbnail.remove();
			}
			newWorld.thumbnail = Morph.makeRectangle(Rectangle.fromElement(canvas));
			newWorld.thumbnail.setPosition(this.bounds().bottomRight());
			newWorld.addMorph(newWorld.thumbnail);
			newWorld.thumbnail.setScale(scale);
			newWorld.thumbnail.addMorph(oldWorld);
		}

		if (carriedMorphs.length > 0) newWorld.firstHand().emergingFromWormHole = true; // prevent re-entering
	},
    
	onMouseOver: function($super, evt) {
		if (evt.hand.hasSubmorphs()) { // if hand is laden enter world bearing gifts
			if (!evt.hand.emergingFromWormHole) this.enterMyWorld(evt);
		} else {
			$super(evt);
		}
	},

	onMouseOut: function($super, evt) {
		evt.hand.emergingFromWormHole = false;
		$super(evt);
	},

	getHelpText: function() {
		return this.helpText;
	},
	
	addLabel: function(text) {
		var label = new TextMorph(pt(110, 25).extentAsRectangle(), text).applyStyle({borderRadius: 10, borderWidth: 2});
		this.addMorph(label);
		label.align(label.bounds().leftCenter(), this.shape.bounds().rightCenter().addXY(5, 0));
		label.linkToStyles(['raisedBorder']);
		return label;
	},
    
});

LinkMorph.subclass('ExternalLinkMorph', {

    documentation: "A link to a different web page, presumably containing another LK",

    style: { borderColor: Color.black, fill: new lively.paint.RadialGradient([new lively.paint.Stop(0, Color.green), 
									     new lively.paint.Stop(1, Color.yellow)])},
    
    initialize: function($super, url, position) {
		$super(null, position || pt(0, 0));
		this.url = url;
		this.win = null; // browser window
    },

    makeNewWorld: Functions.Null, 
    
    addPathBack: Functions.Null,

	enterMyWorld: function(evt) {
		if (evt.isCommandKey()) {
			this.world().confirm("Leave current runtime to enter another page?", function (answer) {
				if (answer) Global.location = this.url.toString();
				else console.log("cancelled loading " + this.url);
			});
		} else {
			if (this.win && !this.win.closed) this.win.focus();
			else this.win = Global.window.open(this.url);
		}
	},
    
    getHelpText: function() {
		return "Click to enter " + this.url;
    },

	morphMenu: function($super, evt) { 
		var menu = $super(evt);
		menu.addItem(["set link target...", function() {
			this.world().prompt("Set new target file", function(answer) {
				this.url = URL.source.withFilename(answer);
			}.bind(this), URL.source.toString());
		}]);
		return menu;
	}
    
});


/**
 *  Morpsh for Structuring and Layouting 
 */

Morph.subclass('BoxMorph', {

    documentation: "Occupies a rectangular area of the screen, can be laid out",

    initialize: function($super, initialBounds) {
		$super(new lively.scene.Rectangle(initialBounds));
    },

});

BoxMorph.subclass('ContainerMorph', {
    documentation: "Box morph whose shape grows to contain all its submrphs",

	initialize: function($super,rect) {
		$super(rect);//new Rectangle(0,0,0,0));
	},

    initializeTransientState: function($super) {
        $super();
        this.priorExtent = this.innerBounds().extent();
    },

	addMorph: function($super, m, isFront) {
		var ret = $super(m, isFront);
		var submorphBounds = this.submorphBounds(true);
		if (submorphBounds)
			this.shape.setBounds(submorphBounds.outsetByRect(this.padding));
		return ret;
	},

	adjustForNewBounds: function ($super) {
		// borrowed from PanelMorph
		// Compute scales of old submorph extents in priorExtent, then scale up to new extent
		$super();
		var newExtent = this.innerBounds().extent();
		var scalePt = newExtent.scaleByPt(this.priorExtent.invertedSafely());
		this.submorphs.forEach(function(sub) {
			sub.setPosition(sub.getPosition().scaleByPt(scalePt));
			sub.setExtent(sub.getExtent().scaleByPt(scalePt));
		});
		this.priorExtent = newExtent;
	},    
});
Morph.subclass('PathMorph',
'documentation', {
	documentation: 'Morph that has a path shape. Either a line or a curve. Editable. Hmmmm',
},
'settings', {
	suppressGrabbing: false,
	openForDragAndDrop: false,
	style: {borderWidth: 1, borderColor: Color.black, fill: null},
	isCurve: false,
},
'initializing', {
	initialize: function($super, verts) {
		$super(this.createPathShape(verts));
	},
	createPathShape: function(verts) {
		var g = lively.scene,
			cmds = [new g.MoveTo(true, verts[0].x,  verts[0].y)];
		for (var i = 1; i < verts.length; i++)
			cmds.push(new g.LineTo(true, verts[i].x, verts[i].y));
		return new g.Path(cmds);
	},
},
'accessing', {
	getLength: function() { return this.shape.rawNode.getTotalLength() },
	getPointAtLength: function(length) { return  Point.ensure(this.shape.rawNode.getPointAtLength(length)) },
	getRelativePoint: function(relativeLength) {
		var pos = this.getPointAtLength(this.getLength() * relativeLength);
		// return this.world() ? this.worldPoint(pos).subPt(this.shape.bounds().topLeft()) : pos;
		return pos.matrixTransform(this.getGlobalTransform())
	},

	enableInsertionPoints: function() { this.shape.showInsertionPoints = true },
	disableInsertionPoints: function() { this.shape.showInsertionPoints = false },
},
'geometry computing', {
	pathBetweenRects: function(rect1, rect2) {
		// copied and adpated from graffle Raphael 1.2.1 - JavaScript Vector Library
		var p = [{x: rect1.x + rect1.width / 2, y: rect1.y - 1},
	        {x: rect1.x + rect1.width / 2, y: rect1.y + rect1.height + 1},
	        {x: rect1.x - 1, y: rect1.y + rect1.height / 2},
	        {x: rect1.x + rect1.width + 1, y: rect1.y + rect1.height / 2},
	        {x: rect2.x + rect2.width / 2, y: rect2.y - 1},
	        {x: rect2.x + rect2.width / 2, y: rect2.y + rect2.height + 1},
	        {x: rect2.x - 1, y: rect2.y + rect2.height / 2},
	        {x: rect2.x + rect2.width + 1, y: rect2.y + rect2.height / 2}];
		var d = {}, dis = [];
		for (var i = 0; i < 4; i++) {
			for (var j = 4; j < 8; j++) {
				var dx = Math.abs(p[i].x - p[j].x),
					dy = Math.abs(p[i].y - p[j].y);
				if ((i == j - 4) || (((i != 3 && j != 6) || 
					p[i].x < p[j].x) && ((i != 2 && j != 7) || p[i].x > p[j].x) && ((i != 0 && j != 5) || 
					p[i].y > p[j].y) && ((i != 1 && j != 4) || p[i].y < p[j].y))) {
						dis.push(dx + dy);
						d[dis[dis.length - 1]] = [i, j];
				}
			}
		}
	    res = dis.length == 0 ? [0, 4] : d[Math.min.apply(Math, dis)];

		var x1 = p[res[0]].x,
			y1 = p[res[0]].y,
			x4 = p[res[1]].x,
			y4 = p[res[1]].y,
			dx = Math.max(Math.abs(x1 - x4) / 2, 10),
			dy = Math.max(Math.abs(y1 - y4) / 2, 10),
			x2 = [x1, x1, x1 - dx, x1 + dx][res[0]].toFixed(3),
			y2 = [y1 - dy, y1 + dy, y1, y1][res[0]].toFixed(3),
			x3 = [0, 0, 0, 0, x4, x4, x4 - dx, x4 + dx][res[1]].toFixed(3),
			y3 = [0, 0, 0, 0, y1 + dy, y1 - dy, y4, y4][res[1]].toFixed(3);

		var p1 = this.localize(pt(x1, y1)),
			c1 = this.localize(pt(x2, y2)),
			c2 = this.localize(pt(x3, y3)),
			p2 = this.localize(pt(x4, y4));

		return [p1, c1, c2, p2];
	},
},
'converting', {
	convertToLine: function() {
		this.shape.setElements(this.shape.getElements().collect(function(e) {
			return (e.charCode == 'M' || e.charCode == 'L') ? e : new lively.scene.LineTo(true, e.x, e.y);
		}));
	},
	convertToCurve: function() {
		var g = lively.scene, elements = this.shape.getElements().clone();
		for (var i = 1; i < elements.length; i++) {
			var e = elements[i], prev = elements[i-1];
			// do nothing if it is already a curve
			if (e.charCode == 'Q' || e.charCode == 'C' || e.charCode == 'S') continue;
			var ptArr = this.pathBetweenRects(new Rectangle(prev.x,prev.y,0,0), new Rectangle(e.x,e.y,0,0)),
				c1 = ptArr[1],
				c2 = ptArr[2],
				p = ptArr[3];
			elements[i] = new g.BezierCurve2CtlTo(true, p.x, p.y, c1.x, c1.y, c2.x, c2.y);
		}
		this.shape.setElements(elements);
	},
},
'menu', {
	toggleLineStyle: function() {
		this.isCurve ? this.convertToLine() : this.convertToCurve();
		this.isCurve = !this.isCurve;
	},
	subMenuItems: function($super, evt) {
		var items = $super(evt);
		items.unshift(['Convert to ' + (this.isCurve ? 'line' : 'curve'), this.toggleLineStyle.bind(this)]);
		return items;
	},
});

Morph.subclass('PseudoMorph', {
    description: "This hack to make various objects serializable, despite not being morphs",
    
	initialize: function($super) {
		$super(new lively.scene.Group());
		this.setVisible(false);
	}

});


PseudoMorph.subclass('Invocation', {

	initialize: function($super, actor, scriptName, argIfAny) {
		$super();
		this.actor = actor;
		this.scriptName = scriptName;
		this.argIfAny = argIfAny; // better be primitive
	},

	exec: function Invocation$exec() {
		if (!this.actor) {
			console.warn("no actor on script %s", this);
			return null;
		}
		var func = this.actor[this.scriptName];
		if (func) {
			return func.call(this.actor, this.argIfAny);
		} else {
			//console.warn("no callback on actor %s", this.actor);
			return null;
		}
	},

});

Invocation.subclass('SchedulableAction', {

	documentation: "Description of a periodic action",
	beVerbose: false,

	initialize: function($super, actor, scriptName, argIfAny, stepTime) {
		$super(actor, scriptName, argIfAny);
		this.stepTime = stepTime;
		this.ticks = 0;
	},

	toString: function() {
		return Strings.format("#<SchedulableAction[actor=%s,script=%s,arg=%s,stepTime=%s]>", 
		this.actor, this.scriptName, this.argIfAny, this.stepTime);
	},

	stop: function(world) {
		if (this.beVerbose) console.log("stopped stepping task %s", this);
		world.stopSteppingFor(this);
	},

	start: function(world) {
		if (this.beVerbose) console.log("started stepping task %s", this);
		world.startSteppingFor(this);
	},

	equalActorAndName: function(other) {
		if (!other) 
			return false;
		if (this === other) 
			return true;
		return (this.actor === other.actor) && (this.scriptName == other.scriptName)
	}
});

Morph.addMethods(
'plugs', {
	plugTo: function(model, connectSpec) {
		// experimental protocol
		// This message preserves the model-view "plug" API of MVC's pluggable views,
		// while using the "direct connect" form of change notification
		// {dir: String, name: String, options: Object}
		var view = this;

		function parseStringSpec(stringSpec) {
			var parsed = stringSpec.match(/(<?->?)(.*)/);
			return {dir: parsed[1], name: parsed[2]};
		};

		Properties.forEachOwn(connectSpec, function (viewProp, spec) {
			if (Object.isString(spec)) spec = parseStringSpec(spec);
			var dir = spec.dir || '->',
				options = spec.options || {};
			if (dir == "->" || dir == "<->")
				lively.bindings.connect(view, viewProp, model, spec.name, options)
			if (dir == "<-" || dir == "<->")
				lively.bindings.connect(model, spec.name, view, viewProp, options)
		});
		return this;
	},

});

}) // end of module