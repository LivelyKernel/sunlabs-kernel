/*
 * Copyright � 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

/**
 * Widgets.js.  This file defines the various graphical widgets
 * (morphs) that will be included in the system when it starts.
 */

//  Basic theory of widgets...
//  A widget is a view/controller morph, and it views some aspect of a model
//  Viewing is by way of "plugs" which use MVC-style viewing, and select some
//  aspect or aspects of the model to be viewed.

//  See the comments in Model, and the Model protocol in Morph (getModelValue(), etc)
//  The Inspector and Browser are fairly simple examples of this architecture in use.

// ===========================================================================
// Simple widgets
// ===========================================================================



using(lively.text).run(function(text) {


Morph.subclass('ButtonMorph', {
    
    documentation: "Simple button",
    focusHaloBorderWidth: 3, // override the default
    borderWidth: 0.3,
    fill: Color.neutral.gray,
    borderColor: Color.neutral.gray,
    label: null,
    toggle: false, //if true each push toggles the model state 
    
    formals: ["Value"],

    // A ButtonMorph is the simplest widget
    // It read and writes the boolean variable, this.model[this.propertyName]
    initialize: function($super, initialBounds) {
        this.baseFill = null;
        $super(initialBounds, "rect");
	if (Config.selfConnect) {
            var model = Record.newNodeInstance({Value: false});
	    // this default self connection may get overwritten by, eg, connectModel()...
	    this.relayToModel(model, {Value: "Value"});
	}
        // Styling
        this.linkToStyles(['button']);
        this.changeAppearanceFor(false);
        return this;
    },

    onDeserialize: function() {
        this.baseFill = this.fill;
        this.changeAppearanceFor(this.getValue(false));
    },

    getBaseColor: function() {
        if (this.fill instanceof Color) return this.fill;
        else if (this.fill instanceof LinearGradient) return this.fill.stopColor(0);
        else if (this.fill instanceof RadialGradient) return this.fill.stopColor(1);
        else throw new Error('cannot handle fill ' + this.fill);
    },

    handlesMouseDown: function(evt) { return !evt.isCommandKey(); },
    
    onMouseDown: function(evt) {
        this.requestKeyboardFocus(evt.hand);
        if (!this.toggle) {
            this.setValue(true); 
            this.changeAppearanceFor(true); 
        } 
    },
    
    onMouseMove: Functions.Empty,

    onMouseUp: function(evt) {
        var newValue = this.toggle ? !this.getValue() : false;
        this.setValue(newValue); 
	// the following should happen in response
        this.changeAppearanceFor(newValue); 
    },
    
    changeAppearanceFor: function(value) {
        var delta = value ? 1 : 0;
        if (this.baseFill instanceof LinearGradient) {
            var base = this.baseFill.stopColor(0).lighter(delta);
	    this.setFill(new LinearGradient([base, 1, base.lighter()], LinearGradient.SouthNorth));
	    // console.log("set gradient " + gradient);
        } else if (this.baseFill instanceof RadialGradient) {
            var base = this.baseFill.stopColor(0).lighter(delta);
            this.setFill(new RadialGradient([base.lighter(), 1, base]));
        } else if (this.baseFill instanceof Color) {
            this.setFill(this.baseFill.lighter(delta)); 
        } else throw new Error('unsupported fill type ' + this.baseFill);
    },
    
    applyStyle: function($super, spec) {
        $super(spec);
        this.baseFill = this.fill; // we may change appearance depending on the value
        this.changeAppearanceFor(this.getValue());
    },

    updateView: function(aspect, controller) {
        var p = this.modelPlug;
	if (!p) return;
        if (aspect == p.getValue || aspect == 'all') 
	    this.onValueUpdate(this.getValue());
    },

    onValueUpdate: function(value) {
	if (this.toggle) console.log("got updated with value " + value);
	this.changeAppearanceFor(value);
    },

    takesKeyboardFocus: Functions.True,          // unlike, eg, cheapMenus
    
    setHasKeyboardFocus: Functions.K, 

    onKeyDown: function(evt) {
        switch (evt.getKeyCode()) {
        case Event.KEY_RETURN:
        case Event.KEY_SPACEBAR:
            this.setValue(true); 
            this.changeAppearanceFor(true);
            evt.stop();
            return true;
        }
        return false;
    },

    onKeyUp: function(evt) {
        var newValue = this.toggle ? !this.getValue() : false;
        switch (evt.getKeyCode()) {
        case Event.KEY_RETURN:
        case Event.KEY_SPACEBAR:
            this.changeAppearanceFor(newValue);
            this.setValue(newValue);
            evt.stop();
            return true;
        }
        return false;
    },

    setLabel: function(txt) {
        this.label && this.label.remove();
        // FIXME remove random values
        var l = this.label = new TextMorph(new Rectangle(0, 0, 50, 20), txt).beLabel();
        l.align(l.bounds().center(), this.innerBounds().center());
        this.addMorph(l);
        return this;
    }

});


Morph.subclass("ImageMorph", {

    documentation: "Image container",
    background: Color.blue.lighter(),
    borderWidth: 0,
    formals: ["-URL"],
    
    initialize: function($super, viewPort, url) {
        $super(viewPort, "rect");
        this.image = new Image(url, viewPort.width, viewPort.height);
        console.log("making an image from: " + url);
        if (url) this.addWrapper(this.image); // otherwise we didn't make a rawNode
    },

    // FIXME:
    restoreFromSubnode: function($super, importer, node) /*:Boolean*/ {
        if ($super(importer, node)) return true;

        switch (node.localName) {
        case "image":
        case "use":
           this.image = new Image(importer, node);
           return true;
        default:
            console.log("got unhandled node " + node.localName + ", " + node.namespaceURI + " node " + node);
            return false;
        }
    },
    
    loadGraphics: function(localURL) {
        this.setFill(null);
        var node = this.image.loadUse(localURL);
        node && this.addNonMorph(node);
    },

    loadFromURL: function(url) {
        this.setFill(this.background);
        var node = this.image.loadImage(url.toString());
        node && this.addNonMorph(node);
    },

    reload: function() {
        this.image.reload();
    },

    onURLUpdate: function(url) {
	this.loadFromURL(url);
    },
    
    updateView: function(aspect, controller) {
        var p = this.modelPlug;
        if (!p) return;
        if (aspect == p.getURL) {
	    this.onURLUpdate(this.getURL());
	}
    }

});

ButtonMorph.subclass("ImageButtonMorph", {

    documentation: "Button with an image",
    focusHaloBorderWidth: 0,

    initialize: function($super, initialBounds, normalImageHref, activatedImageHref) {
        this.image = new ImageMorph(new Rectangle(0, 0, initialBounds.width, initialBounds.height), normalImageHref);
        this.normalImageHref = normalImageHref;
        this.activatedImageHref = activatedImageHref;
        $super(initialBounds);
        this.addMorph(this.image);
        this.image.handlesMouseDown = Functions.True,
        this.image.relayMouseEvents(this);
    },
    
    changeAppearanceFor: function(value) {
        //console.log('changing on %s from %s to %s', value, this.activatedImageHref, this.normalImageHref);
        this.image.loadFromURL(value ? this.activatedImageHref : this.normalImageHref);
    }
    
});


Morph.subclass("ClipMorph", {

    documentation: "A clipping window/view",
    // A clipMorph is like a window through which its submorphs are seen
    // Its bounds are strictly limited by its shape
    // Display of its submorphs are strictly clipped to its shape, and
    // (optionally) reports of damage from submorphs are also clipped so that,
    // eg, scrolling can be more efficient
    
    fill: null,
    borderWidth: 0,

    initializeTransientState: function($super, initialBounds) {
	$super(initialBounds);
	this.clipToShape();
    },

    defaultOrigin: function(bounds) { 
        return bounds.topLeft(); 
    },

    bounds: function(ignoreTransients) {
	// intersection  of its shape and its children's shapes
	if (!this.fullBounds) {
	    var tfm = this.getTransform();
	    var bounds = this.shape.bounds();
	    // var subBounds = this.submorphBounds(ignoreTransients);
	    // this.fullBounds = tfm.transformRectToRect(subBounds ? subBounds.intersection(bounds) : bounds);
	    // DI:  ClipMorph bounds should be independent of subMorphs, right?
	    // DI:  so we should be able to replace the 2 lines above with this simpler one...
	    this.fullBounds = tfm.transformRectToRect(bounds);
	}
	return this.fullBounds;
    },
    
    innerMorph: function() {
        this.submorphs.length != 1 && console.log("not a single inner morph");
        return this.submorphs.first();
    },

    layoutOnSubmorphLayout: function() {
	return false;
    }
    
});

   
// ===========================================================================
// Handles and selection widgets
// ===========================================================================

Morph.subclass('HandleMorph', {
    
    fill: null,
    borderColor: Color.blue,
    borderWidth: 1,

    controlHelpText: "Drag to resize this object\n" + 
        "Alt+drag to rotate the object \n" +
        "Alt+shift+drag to scale the object \n" + 
        "Shift+drag to change border width ", 
    circleHelpText: "Drag to reshape the line\n" + 
        "Cmd+drag to rotate the object \n" +
        "Cmd+shift+drag to scale the object \n" + 
        "Shift+drag to change width ",
    maxHelpCount: 20,
    helpCount: 0,
    transientBounds: true,
    
    initialize: function($super, location, shapeType, hand, targetMorph, partName) {
        $super(location.asRectangle().expandBy(5), shapeType);
        this.targetMorph = targetMorph;
        this.partName = partName; // may be a name like "topRight" or a vertex index
        this.initialScale = null;
        this.initialRotation = null; 
	this.mode = null;
	this.rollover = true;  // the default
        return this;
    },
    
    getHelpText: function() {
        return (this.shape instanceof RectShape) ? this.controlHelpText : this.circleHelpText;
    },
    
    showHelp: function($super, evt) {
        if (this.helpCount > this.maxHelpCount) return false;
        var wasShown = $super(evt);
        if (wasShown) {
            HandleMorph.prototype.helpCount++;
        }
        return wasShown;
    },

    okToDuplicate: Functions.False,

    onMouseDown: function(evt) {
        this.hideHelp();
	if (!this.rollover) return;  // if not a rollover, mode is probably set
        if (evt.isCommandKey()) this.mode = evt.isShiftDown() ? 'scale' : 'rotate';
		else this.mode = evt.isShiftDown() ? 'borderWidth' : 'reshape';
    },
    
    onMouseMove: function(evt) {
        // When dragged, I also drag the designated control point of my target
        if (this.rollover && !evt.mouseButtonPressed) { 
            // Mouse up: Remove handle if mouse drifts away
            if (!this.containsWorldPoint(evt.mousePoint)) {
                evt.hand.setMouseFocus(null);
                this.hideHelp();
                this.remove(); 
            }
            return; 
        }
    
        // Mouse down: edit targetMorph
        this.align(this.bounds().center(), this.owner.localize(evt.mousePoint));

	var p0 = evt.hand.lastMouseDownPoint; // in world coords
	var p1 = evt.mousePoint;
	if (!this.initialScale) this.initialScale = this.targetMorph.getScale();
	if (!this.initialRotation) this.initialRotation = this.targetMorph.getRotation();
	var ctr = this.targetMorph.owner.worldPoint(this.targetMorph.origin);  //origin for rotation and scaling
	var v1 = p1.subPt(ctr); //vector from origin now
	var v0 = p0.subPt(ctr); //vector from origin at mousedown
	var d = p1.dist(p0); //dist from mousedown
            
	switch(this.mode) {  // Note mode is set in mouseDown
	    case 'scale' :
		var ratio = v1.r() / v0.r();
		ratio = Math.max(0.1,Math.min(10,ratio));
		this.targetMorph.setScale(this.initialScale*ratio);
		break; 
	    case 'rotate' :
		this.targetMorph.setRotation(this.initialRotation + v1.theta() - v0.theta());
		break; 
	    case 'borderWidth' :
		this.targetMorph.setBorderWidth(Math.max(0, Math.floor(d/3)/2), true);
		break;
	    case 'reshape' :
		this.targetMorph.reshape(this.partName, this.targetMorph.localize(evt.mousePoint), this, false);
		break;
        }
    },
    
    onMouseUp: function(evt) {
        if (!evt.isShiftDown() && !evt.isCommandKey() && !evt.isMetaDown()) {
	    // last call for, eg, vertex deletion
	    if (this.partName) this.targetMorph.reshape(this.partName, this.targetMorph.localize(evt.mousePoint), this, true); 
        }
        this.remove(); 
    },
    
    inspect: function($super) {
        return $super() + " on " + Object.inspect(this.targetMorph);
    },
    
    scaleFor: function(scaleFactor) {
        this.applyFunctionToShape(function(s) {
            this.setBounds(this.bounds().center().asRectangle().expandBy(5/s));
            this.setStrokeWidth(1/s); 
        }, scaleFactor);
    }
    
});

Morph.subclass("SelectionMorph", {
    documentation: 'selection "tray" object that allows multiple objects to be moved and otherwise '
	+ 'manipulated simultaneously',

    style: {borderWidth: 1, borderColor: Color.blue, fill: Color.secondary.blue, fillOpacity: 0.1 },

    removeWhenEmpty: true,
    
    initialize: function($super, viewPort, defaultworldOrNull) {
        $super(viewPort, "rect");
        this.originalPoint = viewPort.topLeft();
        this.reshapeName = "bottomRight";
	this.applyStyle(this.style);
        this.myWorld = defaultworldOrNull ? defaultworldOrNull : this.world();
        // this.shape.setStrokeDashArray([3,2]);
        return this;
    },

    initializeTransientState: function() {
	this.selectedMorphs = [];
        this.initialSelection = true;
    },

    
    reshape: function($super, partName, newPoint, handle, lastCall) {
        // Initial selection might actually move in another direction than toward bottomRight
        // This code watches that and changes the control point if so
        if (this.initialSelection) {
            var selRect = new Rectangle.fromAny(pt(0,0), newPoint);
            if (selRect.width*selRect.height > 30) {
                this.reshapeName = selRect.partNameNearest(Rectangle.corners, newPoint);
            }
            this.setExtent(pt(0, 0)) // dont extend until we know what direction to grow
            $super(this.reshapeName, newPoint, handle, lastCall);
        } else {
            $super(partName, newPoint, handle, lastCall);
        }
        this.selectedMorphs = [];
        this.owner.submorphs.forEach(function(m) {
            if (m !== this && this.bounds().containsRect(m.bounds())) this.selectedMorphs.push(m);
        }, this);
        this.selectedMorphs.reverse();
            
        if (lastCall) this.initialSelection = false;
        if (lastCall && this.selectedMorphs.length == 0 && this.removeWhenEmpty) this.remove();
    },

    morphMenu: function($super, evt) { 
        var menu = $super(evt);
        menu.keepOnlyItemsNamed(['duplicate', 'remove', 'reset rotation', 'reset scaling', ]);
        menu.removeItemNamed('---');
        menu.addLine();
	menu.addItem(["align vertically", this.alignVertically]);
        menu.addItem(["space vertically", this.spaceVertically]);
        menu.addItem(["align horizontally", this.alignHorizontally]);
        menu.addItem(["space horizontally", this.spaceHorizontally]);
        menu.addItem(["align to grid...", this.alignToGrid]);

        return menu;
    },
    
    remove: function() { 
        this.selectedMorphs.invoke('remove');
        this.removeOnlyIt();
    },
    
    removeOnlyIt: function() {
        if ( this.myWorld == null ) {
            this.myWorld = this.world();
        } 
        this.myWorld.currentSelection = null;
        // Class.getSuperPrototype(this).remove.call(this);
        Morph.prototype.remove.call(this);
    },
    
    // Note: the next four methods should be removed after we have gridding, i think (DI)
    alignVertically: function() { 
	// Align all morphs to same left x as the top one.
	var morphs = this.selectedMorphs.slice(0).sort(function(m,n) {return m.position().y - n.position().y});
	var minX = morphs[0].position().x;  // align to left x of top morph
	morphs.forEach(function(m) { m.setPosition(pt(minX,m.position().y)) });
    },
    alignHorizontally: function() { 
	var minY = 9999;
	this.selectedMorphs.forEach(function(m) { minY = Math.min(minY, m.position().y); });
	this.selectedMorphs.forEach(function(m) { m.setPosition(pt(m.position().x, minY)) });
    },
    
    spaceVertically: function() { 
	// Sort the morphs vertically
	var morphs = this.selectedMorphs.clone().sort(function(m,n) {return m.position().y - n.position().y});
	// Align all morphs to same left x as the top one.
	var minX = morphs[0].position().x;
	var minY = morphs[0].position().y;
	// Compute maxY and sumOfHeights
	var maxY = minY;
	var sumOfHeights = 0;
	morphs.forEach(function(m) {
		var ht = m.innerBounds().height;
		sumOfHeights += ht;
		maxY = Math.max(maxY, m.position().y + ht);
	});
	// Now spread them out to fit old top and bottom with even spacing between
	var separation = (maxY - minY - sumOfHeights)/Math.max(this.selectedMorphs.length - 1, 1);
	var y = minY;
	morphs.forEach(function(m) {
		m.setPosition(pt(minX, y));
		y += m.innerBounds().height + separation;
	});
    },

    spaceHorizontally: function() { 
	// Sort the morphs vertically
	var morphs = this.selectedMorphs.clone().sort(function(m, n) { 
	    return m.position().x - n.position().x;
	});
	// Align all morphs to same left x as the top one.
	var minX = morphs[0].position().x;
	var minY = morphs[0].position().y;
	// Compute maxX and sumOfWidths
	var maxX = minY;
	var sumOfWidths = 0;
	morphs.forEach(function(m) {
	    var wid = m.innerBounds().width;
	    sumOfWidths += wid;
	    maxX = Math.max(maxX, m.position().x + wid);
	});	// Now spread them out to fit old top and bottom with even spacing between
	var separation = (maxX - minX - sumOfWidths)/Math.max(this.selectedMorphs.length - 1, 1);
	var x = minX;
	morphs.forEach(function(m) {
	    m.setPosition(pt(x, minY));
	    x += m.innerBounds().width + separation;
	});
    },
 
    copyToHand: function(hand) { 
        this.selectedMorphs.invoke('copyToHand', hand);
    },
    
    setBorderWidth: function($super, width) { 
        if (this.selectedMorphs.length == 0) {
            $super(width);
        } else { 
            this.selectedMorphs.invoke('withAllSubmorphsDo', function() { this.setBorderWidth(width)});
        }
    },
    
    setFill: function($super, color) { 
        if (this.selectedMorphs.length == 0) {
            $super(color);
        } else {
            this.selectedMorphs.invoke('withAllSubmorphsDo', function() { this.setFill(color)});
        }
    },
    
    setBorderColor: function($super, color) { 
        if (this.selectedMorphs.length == 0) {
            $super(color);
        } else {
            this.selectedMorphs.invoke('withAllSubmorphsDo', function() { this.setBorderColor(color)});
        }
    },
    shapeRoundEdgesBy: function($super, r) { 
        if (this.selectedMorphs.length == 0) {
            $super(r);
        } else {
            this.selectedMorphs.invoke('withAllSubmorphsDo', function() { this.shapeRoundEdgesBy(r)});
        }
    },
    
    setFillOpacity: function($super, op) { 
        if (this.selectedMorphs.length == 0) {
            $super(op);
        } else { 
            this.selectedMorphs.invoke('withAllSubmorphsDo', function() { this.setFillOpacity(op)});
        }
    },
    
    setStrokeOpacity: function($super, op) { 
        if (this.selectedMorphs.length == 0) {
            $super(op);
        } else {
            this.selectedMorphs.invoke('callOnAllSubmorphs', function() { this.setStrokeOpacity(op)});
        }
    },

    setRotation: function($super, theta) {
        for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
            this.addMorph(this.selectedMorphs[i]);
        }
        $super(theta);
        for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
            this.world().addMorph(this.selectedMorphs[i]);
        }
    },
    
    setScale: function($super, scale) {
        for (var i = 0; i < this.selectedMorphs.length; i++ ) {
            this.addMorph(this.selectedMorphs[i]);
        }
        $super(scale);
        for (var i = 0; i < this.selectedMorphs.length; i++ ) {
            this.world().addMorph(this.selectedMorphs[i]);
        }
    },
    
    okToBeGrabbedBy: function(evt) {
        this.selectedMorphs.forEach( function(m) { evt.hand.addMorph(m); } );
        return this;
    }
    
});

// ===========================================================================
// Panels, lists, menus, sliders, panes, etc.
// ===========================================================================

Morph.subclass('PanelMorph', {

    fill: undefined,        // rely on styling
    borderWidth: undefined, // rely on styling
    borderColor: undefined, // rely on styling
    
    documentation: "a panel",
    initialize: function($super, extent/*:Point*/) {
        $super(extent.extentAsRectangle(), 'rect');
        this.lastNavigable = null;
    },

    initializeTransientState: function($super, bounds) {
        $super(bounds);
        this.priorExtent = this.innerBounds().extent();
    },

    takesKeyboardFocus: Functions.True, 

    onMouseDown: function(evt) {
        this.requestKeyboardFocus(evt.hand);
        return true;
    },    
    
    onKeyPress: function(evt) {
        switch (evt.getKeyCode()) {
        case Event.KEY_TAB: { 
            this.focusOnNext(evt);
            evt.stop();
            return true;
        }
        }
    },
    
    handlesMouseDown: Functions.False,

    focusOnNext: function(evt) {
        var current = evt.hand.keyboardFocus;
        if (current && current.nextNavigableSibling) {
            current.relinquishKeyboardFocus(evt.hand);
            current.nextNavigableSibling.requestKeyboardFocus(evt.hand);
        } 
    },

    addMorphFrontOrBack: function($super, m, front) {
        if (m.takesKeyboardFocus()) {
            if (this.lastNavigable) this.lastNavigable.nextNavigableSibling = m;
            this.lastNavigable = m;
        }
        return $super(m, front);
    },

    adjustForNewBounds: function ($super) {
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
    
    onVisibleUpdate: function(state) {
	if (state == false) this.remove();
    },

    updateView: function(aspect, controller) {
        var plug = this.modelPlug;
        if (!plug) return;
        
        if (aspect == plug.getVisible || aspect == 'all') {
	    this.onVisibleUpdate(this.getModelValue('getVisible', true));
        }
    }

});

Object.extend(PanelMorph, {

    makePanedPanel: function(extent, paneSpecs) {
        // Generalized constructor for paned window panels
        // paneSpec is an array of arrays of the form...
        //     ['leftPane', newTextListPane, new Rectangle(0, 0, 0.5, 0.6)],
        // See example calls in, eg, SimpleBrowser.buildView() for how to use this
        var panel = new PanelMorph(extent);
        panel.linkToStyles(['panel']);

        paneSpecs.forEach(function(spec) {
            var paneName = spec[0];
            var paneConstructor = spec[1];
            var paneRect = extent.extentAsRectangle().scaleByRect(spec[2]);
            // fix for mixed class vs. function initialization bug
            var pane = Class.isClass(paneConstructor) ? new paneConstructor(paneRect) : paneConstructor(paneRect);
            panel[paneName] = panel.addMorph(pane)
        });
        panel.suppressHandles = true;
        return panel;
    }

});

/**
 * @class CheapListMorph
 */ 
TextMorph.subclass("CheapListMorph", {
    
    borderColor: Color.black,

    maxSafeSize: 4e4,  // override max for subsequent updates
    pins: ["List", "Selection", "-DeletionConfirmation", "+DeletionRequest"],
    
    initialize: function($super, initialBounds, itemList) {
        // itemList is an array of strings
        // Note:  A proper ListMorph is a list of independent submorphs
        // CheapListMorphs simply leverage Textmorph's ability to display
        // multiline paragraphs, though some effort is made to use a similar interface.
        // Bug: currently selection doesn't work right if items have leading spaces
        itemList = this.sanitizedList(itemList);
        var listText = itemList ? itemList.join("\n") : "";
        $super(initialBounds, listText);
	
	this.setWrapStyle(text.WrapStyle.None);
        this.itemList = itemList;
        // this default self connection may get overwritten by, eg, connectModel()...
        var model = new SyntheticModel(this.pins);
        this.modelPlug = new ModelPlug(model.makePlugSpec());
        this.setModelValue('setList', itemList);
        this.layoutChanged();
        return this;
    },

    sanitizedList: function(list) { // make sure entries with new lines don't confuse the list
        return list && list.invoke('replace', /\n/g, " ");
    },

    setExtent: function(ignored) {
        // Defeat recomposition when reframing windows
        // May have deleterious side-effects
    },

    onDeserialize: function() {
        this.layoutChanged();
    },

    restorePersistentState: function($super, importer) {
        $super(importer);
        this.itemList = this.textString.split('\n');
        this.setModelValue('setList', this.itemList);
    },
    
    takesKeyboardFocus: Functions.True,

    onKeyPress: Functions.Empty,

    onKeyDown: function(evt) {
        switch (evt.getKeyCode()) {
        case Event.KEY_UP: {
            var lineNo = this.selectedLineNo();
            if (lineNo > 0) {
                this.selectLineAt(this.selectionRange[0] - 2); 
                this.setSelection(this.itemList[lineNo - 1]); 
            } 
            evt.stop();
            break;
        }
        case Event.KEY_BACKSPACE: {
            // request deletion by setting a deletion request in the model
            // if model is subsequently updated with a "setDeletionConfirmation"
            // the selected item will be removed from the view.
            this.setModelValue("setDeletionRequest", this.itemList[this.selectedLineNo()]);
            evt.stop();
            break;
        }
        case Event.KEY_DOWN: {
            var lineNo = this.selectedLineNo();
            if (lineNo < this.itemList.length - 1) {
                this.selectLineAt(this.selectionRange[1] + 2); // skip the '\n' ?
                this.setSelection(this.itemList[lineNo + 1]); 
            } 
            evt.stop();
            break;
        }
        case Event.KEY_ESC: {
            this.relinquishKeyboardFocus(this.world().firstHand());
            evt.stop();
            break;
        }    
        case Event.KEY_SPACEBAR: { // FIXME this should be more general
            // avoid paging down
            evt.stop();
            return true;
        }
        }

    },

    onMouseDown: function(evt) {
        this.onMouseMove(evt); 
        this.requestKeyboardFocus(evt.hand);
    },

    onMouseMove: function(evt) {  
        if (!evt.mouseButtonPressed) return;

        var mp = this.localize(evt.mousePoint);

        if (!this.shape.bounds().containsPoint(mp)) this.selectLineAt(-1);
        else this.selectLineAt(this.charOfY(mp)); 
    },

    onMouseUp: function(evt) {
        this.emitSelection(); 
    },

    emitSelection: function() {
        if (this.hasNullSelection()) return this.setSelection(null);
        this.setSelection(this.itemList[this.selectedLineNo()]); 
    },

    charOfY: function(p) { // Like charOfPoint, for the leftmost character in the line
        return this.charOfPoint(pt(this.padding.left() + 1, p.y)); 
    },
    
    selectedLineNo: function() { // Return the item index for the current selection
        return this.lineNo(this.getCharBounds(this.selectionRange[0]));
    },
    
    showsSelectionWithoutFocus: Functions.True,

    drawSelection: function($super) {
        if (this.hasNullSelection()) { // Null sel in a list is blank
            this.textSelection.undraw();
        } else $super();
    },

    selectLineAt: function(charIx) {  
        this.selectionRange = (charIx == -1) ? [0,-1] : this.lineRange(this.textString, charIx);
        this.drawSelection(); 
    },
    
    lineRange: function(str, charIx) { // like selectWord, but looks for matching newLines 
        var i1 = charIx;
        while (i1>0 && str[i1-1] != '\n') i1--; // scan back to prior newline
        var i2 = i1;
        while (i2<str.length-1 && str[i2+1] != '\n') i2++; // and forward to next newline
        return [i1, i2];
    },
    
    lineRect: function($super, r) { //Menu selection displays full width
        var bounds = this.shape.bounds();
        return $super(new Rectangle(bounds.x + 2, r.y, bounds.width - 4, r.height)); 
    },
    
    updateList: function(newList) {
        newList = this.sanitizedList(newList);
        var priorItem = this.getSelection();
        this.itemList = newList;
        var listText = (newList == null) ? "" : newList.join("\n");
        this.updateTextString(listText);
        this.setSelectionToMatch(priorItem);
        this.emitSelection(); 
    },

    setSelectionToMatch: function(item) {
        var lineStart = -1; 
        var firstChar = 0;
        for (var i = 0; i < this.itemList.length; i++) {
            if (this.itemList[i] == item) {
                lineStart = firstChar; 
               break; 
            }
            firstChar += this.itemList[i].length + 1; 
        }
        this.selectLineAt(lineStart); 
    },

    updateView: function(aspect, controller) {
        var c = this.modelPlug;

        if (c) { // New style connect
            switch (aspect) {
            case this.modelPlug.getList:
            case 'all':
                this.updateList(this.getList(["----"]));
                return this.itemList; // debugging
            case this.modelPlug.getSelection:
                var selection = this.getSelection();
                if (this !== controller) this.setSelectionToMatch(selection);
                return selection; //debugging
            case this.modelPlug.getDeletionConfirmation: //someone broadcast a deletion
                if (this.getModelValue("getDeletionConfirmation") == true) {
                    // update self to reflect that model changed
                    var index = this.selectedLineNo();
                    var list = this.getList(["----"]);
                    list.splice(index, 1);
                    this.updateList(list);
                } 
                return null;
            }
        }
    },

    getSelection: function() {
        if (this.modelPlug) return this.getModelValue('getSelection', null);
    },

    setSelection: function(item) {
        if (this.modelPlug) this.setModelValue('setSelection', item); 
    }

});

Morph.addMethods({
    
    leftAlignSubmorphs: function(pad, inset) { 

        var ownExtent = inset;
        var topLeft = pt(ownExtent.x + pad.left(), ownExtent.y + pad.top());
	
        for (var i = 0; i < this.submorphs.length; i++) {
            var morph = this.submorphs[i];
            morph.setPosition(topLeft);
            var ext = morph.getExtent();
            ownExtent = pt(Math.max(ownExtent.x, pad.left()  + ext.x + pad.right()),  
			   topLeft.y + pad.top() + ext.y + pad.bottom());
            topLeft = topLeft.withY(ownExtent.y);
        }
	ownExtent = ownExtent.withY(ownExtent.y + inset.y);
	
	var bounds = this.getPosition().extent(ownExtent);
	
        if (this.owner) 
            this.setBounds(bounds);
	else
            this.internalSetBounds(bounds);
    }
    
});


Morph.subclass("TextListMorph", {

    documentation: "A list that uses TextMorphs to display individual items",
    borderColor: Color.black,
    borderWidth: 1,
    fill: Color.white,
    formals: ["List", "Selection", "-Capacity", "-ListDelta", "-DeletionConfirmation", "+DeletionRequest"],
    itemMargin: Rectangle.inset(1), // stylize
    defaultCapacity: 50,
    highlightItemsOnMove: false,
    

    initialize: function($super, initialBounds, itemList, optMargin, optTextStyle) {
        // itemList is an array of strings
	this.baseWidth = initialBounds.width;
        var height = Math.max(initialBounds.height, itemList.length * (TextMorph.prototype.fontSize + this.itemMargin.top() + this.itemMargin.bottom()));
        initialBounds = initialBounds.withHeight(height);
        $super(initialBounds, itemList);
        this.itemList = itemList;
        this.selectedLineNo = -1;
	this.textStyle = optTextStyle;
	this.generateSubmorphs(itemList);
        this.alignAll(optMargin);
	if (Config.selfConnect) { // self connect logic, not really needed 
            var model = Record.newNodeInstance({List: [], Selection: null, Capacity: this.defaultCapacity, 
		ListDelta: [], DeletionConfirmation: null, DeletionRequest: null});
	    this.relayToModel(model, {List: "List", Selection: "Selection", Capacity: "-Capacity", 
				      ListDelta: "-ListDelta",
				      DeletionConfirmation: "-DeletionConfirmation", DeletionRequest: "+DeletionRequest"});
	}
        this.setList(itemList);
        this.savedFill = null; // for selecting items
        return this;
    },
    
    onDeserialize: function() {
        this.itemList = [];
        for (var i = 0; i < this.submorphs.length; i++ ) {
            var m = this.submorphs[i];
            m.beListItem();
            m.relayMouseEvents(this);
           this.itemList.push(m.textString);
        }
        this.setList(this.itemList);
        this.layoutChanged();
    },

    handlesMouseDown: Functions.True,
    
    generateSubmorphs: function(itemList) {
	var rect = pt(this.baseWidth, TextMorph.prototype.fontSize).extentAsRectangle().insetByRect(this.itemMargin);
	for (var i = 0; i < itemList.length; i++)  {
	    var m = new TextMorph(rect, itemList[i]).beListItem();
	    if (this.textStyle) m.applyStyle(this.textStyle);
	    this.addMorph(m);
	    m.relayMouseEvents(this);
	}
    },

    adjustForNewBounds: function($super) {
	$super();
	// FIXME: go through all the submorphs adjust?
	// Really, just fold into the layout logic, when in place
	this.baseWidth = this.bounds().width;
    },

    alignAll: function(optMargin) {
        this.leftAlignSubmorphs(this.itemMargin, optMargin || pt(0, 0));
    },

    defaultOrigin: function(bounds) { 
        return bounds.topLeft(); 
    },

    takesKeyboardFocus: Functions.True,

    setHasKeyboardFocus: function(newSetting) { 
        this.hasKeyboardFocus = newSetting;
        return newSetting;
    },
    
    onMouseDown: function(evt) {
	var target = this.morphToReceiveEvent(evt);
	var index = this.submorphs.indexOf(target);
	this.highlightItem(evt, index, true);
	evt.hand.setMouseFocus(this); // to get moves
    },

    onMouseMove: function(evt) {
         // console.log("%s got evt %s", this.getType(),  evt);
         if (!this.highlightItemsOnMove) return;
         var target = this.morphToReceiveEvent(evt);
         var index = this.submorphs.indexOf(target);
         this.highlightItem(evt, index, false);
    },
    
    onMouseWheel: function(evt) {
	console.log("wheel event " + evt + "," + evt.wheelDelta() + " on " + this); // no break
    },

    highlightItem: function(evt, index, updateModel) {
        if (index >= 0) {
            this.selectLineAt(index, updateModel);
            this.requestKeyboardFocus(evt.hand);
            return true;
        }
        if (!updateModel) this.selectLineAt(-1, updateModel);
        return false;
    },

    onKeyPress: Functions.Empty,

    onKeyDown: function(evt) {
        switch (evt.getKeyCode()) {
        case Event.KEY_UP: {
            var lineNo = this.selectedLineNo;
            if (lineNo > 0) {
                this.selectLineAt(lineNo - 1, true); 
            } 
            evt.stop();
            break;
        }
        case Event.KEY_BACKSPACE: {
            // request deletion by setting a deletion request in the model
            // if model is subsequently updated with a "setDeletionConfirmation"
            // the selected item will be removed from the view.
            this.setDeletionRequest(this.itemList[this.selectedLineNo]);
            evt.stop();
            break;
        }
        case Event.KEY_DOWN: {
            var lineNo = this.selectedLineNo;
            if (lineNo < this.itemList.length - 1) {
                this.selectLineAt(lineNo + 1, true); 
            } 
            evt.stop();
            break;
        }
        case Event.KEY_ESC: {
            this.relinquishKeyboardFocus(evt.hand);
            this.selectLineAt(-1, true);
            evt.stop();
            break;
        }    
        case Event.KEY_SPACEBAR: { // FIXME this should be more generally
            // avoid paging down
            evt.stop();
            return true;
        }
        }
    },

    selectLineAt: function(lineNo, shouldUpdateModel) {  
        if (this.selectedLineNo in this.submorphs) { 
            this.submorphs[this.selectedLineNo].setFill(this.savedFill);
        }

        this.selectedLineNo = lineNo;

        var selectionContent = null;
        if (lineNo in this.submorphs) {
            var item = this.submorphs[lineNo];
            this.savedFill = item.getFill();
            item.setFill(TextSelectionMorph.prototype.style.fill);
            selectionContent = item.textString;
            this.scrollItemIntoView(item);
        }
        shouldUpdateModel && this.setSelection(selectionContent);
    },

    appendList: function(newItems) {
        var capacity = this.getCapacity();
        var priorItem = this.getSelection();
        var removed = this.itemList.length + newItems.length - capacity;
        if (removed > 0) {
            for (var i = 0; i < removed; i++) {
                this.submorphs[0].remove();
            }
            this.itemList = this.itemList.slice(removed);
        }
        this.itemList = this.itemList.concat(newItems);
        this.generateSubmorphs(newItems);
        this.alignAll();
        if (this.selectedLineNo + removed >= this.itemList.length - 1) {
            this.selectedLineNo = -1;
        }
        this.resetScrollPane(true);
    },
    
    updateList: function(newList) {
	if(!newList || newList.length == 0) newList = ["-----"]; // jl 2008-08-02 workaround... :-(
        var priorItem = this.getSelection();
        this.itemList = newList;
        this.removeAllMorphs();
        this.generateSubmorphs(newList);
        this.alignAll();
        this.setSelectionToMatch(priorItem);
        this.resetScrollPane();
        // this.emitSelection(); 
    },

    setSelectionToMatch: function(item) {
        for (var i = 0; i < this.submorphs.length; i++) {
            if (this.submorphs[i].textString === item) {
                this.selectLineAt(i, false);
                return true;
            }
        }
        return false;
    },

    onListUpdate: function(list) {
	this.updateList(list);
    },

    // FIXME containing ScrollPane has a Menu formal var  but update callbacks will be directed the List
    onMenuUpdate: Functions.Empty, 

    onListDeltaUpdate: function(delta) {
	this.appendList(delta);
    },

    onSelectionUpdate: function(selection) {
	console.log("got selection "  + selection);
        this.setSelectionToMatch(selection);
    },

    onDeletionConfirmationUpdate: function(conf) {
        if (conf == true) {
            // update self to reflect that model changed
            var index = this.selectedLineNo;
            var list = this.getList();
            list.splice(index, 1);
            this.updateList(list);
        } 
    },
    
    updateView: function(aspect, controller) {
        var c = this.modelPlug;
	if (!c) return;
        switch (aspect) {
        case this.modelPlug.getList:
        case 'all':
            this.onListUpdate(this.getList());
            return this.itemList; // debugging

        case this.modelPlug.getListDelta:
            this.onListDeltaUpdate(this.getListDelta());
            return this.itemList;

        case this.modelPlug.getSelection:
            var selection = this.getSelection();
	    this.onSelectionUpdate(selection);
            return selection; //debugging
	    
        case this.modelPlug.getDeletionConfirmation: //someone broadcast a deletion
	    this.onDeletionConfirmationUpdate(this.getDeletionConfirmation());
            return null;
        }
    },

    enclosingScrollPane: function() { 
        // Need a cleaner way to do this
        if (! (this.owner instanceof ClipMorph)) return null;
        var sp = this.owner.owner;
        if (! (sp instanceof ScrollPane)) return null;
        return sp;
    },
    
    scrollItemIntoView: function(item) { 
        var sp = this.enclosingScrollPane();
        if (!sp) return;
        sp.scrollRectIntoView(item.bounds()); 
    },
    
    resetScrollPane: function(toBottom) { 
        // Need a cleaner way to do this ;-)
        var sp = this.enclosingScrollPane();
        if (!sp) return false;
        if (toBottom) sp.scrollToBottom();
        else sp.scrollToTop();
        return true;
    }

});

// it should be the other way round...
TextListMorph.subclass("ListMorph", {

    generateListItem: function(value, rect) {
        if (this.itemPrinter)
            value = this.itemPrinter(value);
        return new TextMorph(rect, value.string /*fix for Fabrik XMLStringArray, use itemPrinter*/ || value.toString()).beListItem();
    },

    generateSubmorphs: function(itemList) {
        var rect = pt(this.baseWidth, TextMorph.prototype.fontSize).extentAsRectangle().insetByRect(this.itemMargin);
        for (var i = 0; i < itemList.length; i++)  {
            var m = this.generateListItem(itemList[i], rect);
            if (this.textStyle) m.applyStyle(this.textStyle);
            this.addMorph(m);
            m.closeDnD();
            m.relayMouseEvents(this);
        }
    },
    
    selectLineAt: function(lineNo, shouldUpdateModel) {  
        if (this.selectedLineNo in this.submorphs) { 
            this.submorphs[this.selectedLineNo].setFill(this.savedFill);
        }

        this.selectedLineNo = lineNo;

        var selectionContent = null;
        if (lineNo in this.submorphs) {
            var item = this.submorphs[lineNo];
            this.savedFill = item.getFill();
            item.setFill(TextSelectionMorph.prototype.style.fill);
            selectionContent = this.itemList[lineNo];
            this.scrollItemIntoView(item);
        }
        shouldUpdateModel && this.setSelection(selectionContent);
    },
    
    updateList: function($super, newList) {
        $super(newList);
        this.selectLineAt(this.selectedLineNo);
    }
});

PseudoMorph.subclass('MenuItem', {
    
    initialize: function($super, name, closureOrMorph, selectorOrClosureArg, selectorArg) {
	$super();
	this.name = name;
	this.action = closureOrMorph;
	this.para1 = selectorOrClosureArg;
	this.para2 = selectorArg;
    },
    asArrayItem: function() { // for extrinsic menu manipulations
	return [this.name, this.action, this.para1, this.para2];
    },

    invoke: function(evt, targetMorph) {
        if (this.action instanceof Function) { // alternative style, items ['menu entry', function] pairs
            this.action.call(targetMorph || this, evt);
        } else if (Object.isString(this.action.valueOf())) {
            // another alternative style, send a message to the targetMorph's menu target (presumably a view).
            var responder = (targetMorph || this).getModelValue("getMenuTarget");
            if (responder)  {
                var func = responder[this.action];
                if (!func) console.log(this.action + " not found in menu target " + responder);
                else func.call(responder, this.para1, evt, this);
            } else {
                console.log("no menu target " + targetMorph);
            }
        } else {
	    var functionName = this.para1;
            var func = this.action[functionName];  // target[functionName]
            if (func == null) console.log('Could not find function ' + functionName + " on " + this.action);
            // call as target.function(parameterOrNull,event,menuItem)
            else { 	    
		var arg = this.para2;
//console.log("menu.invoke: " + Object.inspect(this.action) + " action=" + functionName + " arg =" + Object.inspect(arg));
		func.call(this.action, arg, evt, this); 
	    }
        }
    }

});

MenuItem.subclass("SubMenuItem", {
        
    isSubMenuItem: true,
    
    initialize: function($super, name, closureOrArray) {
        var closure = Object.isArray(closureOrArray) ? function() { return closureOrArray } : closureOrArray;
        $super(name + ' ->', closure);    
    },
    
    getList: function(evt, targetMorph) {
        if (!this.action) return [];
        return this.action.call(targetMorph || this, evt);
    },
    
    showMenu: function(evt, originalMenu) {
        var target = originalMenu.targetMorph;
        var menu = this.menu || new MenuMorph(this.getList(evt, target), target, originalMenu);
        var ownIndex = originalMenu.items.indexOf(this);
        var pos = pt(originalMenu.getPosition().x + originalMenu.listMorph.getExtent().x,
                     originalMenu.getPosition().y + originalMenu.listMorph.submorphs[ownIndex].getPosition().y);
        menu.openIn(originalMenu.owner, pos, false); 
        this.menu = menu;
    },
    
    closeMenu: function(evt, originalMenu) {
        if (!this.menu) return;
        this.menu.remove();
        this.menu = null;
    }
});

Morph.subclass("MenuMorph", {

    listStyle: { 
        borderColor: Color.blue,
        borderWidth: 0.5,
        fill: Color.blue.lighter(5),
        borderRadius: 4, 
        fillOpacity: 0.75, 
        wrapStyle: text.WrapStyle.Shrink
    },

    textStyle: {
        textColor: Color.blue
    },

    labelStyle: {
        borderRadius: 4, 
        fillOpacity: 0.75, 
        wrapStyle: text.WrapStyle.Shrink
    },

    suppressHandles: true,
    focusHaloBorderWidth: 0,
    
    initialize: function($super, items, targetMorph, ownerMenu) {
        // items is an array of menuItems, each of which is an array of the form
        // 	[itemName, target, functionName, parameterIfAny]
        // At mouseUp, the item will be executed as follows:
        // 	target.function(parameterOrNull,event,menuItem)
        // The last item is seldom used, but it allows the caller to put
        // additional data at the end of the menuItem, where the receiver can find it.

	// Note that an alternative form of item is supported, as:
	// 	[itemName, itemFunction]
	// which will be executed as follows:
	//	itemFunction.call(targetMorph || this, evt)
	// See MenuItem for yet another form of invocation for targets matching
	//	var responder = (targetMorph || this).getModelValue("getMenuTarget");


        // The optional parameter lineList is an array of indices into items.
        // It will cause a line to be displayed below each item so indexed
    
        // It is intended that a menu can also be created incrementally
        // with calls of the form...
        //     var menu = MenuMorph([]);
        //     menu.addItem(nextItem);  // May be several of these
        //     menu.addLine();          // interspersed with these
        //     menu.openIn(world,location,stayUp,captionIfAny);
	
        $super(pt(0, 0).extentAsRectangle(), "rect");
        this.items = items.map(function(item) {
            return this.addPseudoMorph(Object.isArray(item[1]) ?
                    new SubMenuItem(item[0], item[1], item[2], item[3]) :
                    new MenuItem(item[0], item[1], item[2], item[3])); 
	}, this);
        this.targetMorph = targetMorph || this;
        this.listMorph = null;
        this.applyStyle({fill: null, borderWidth: 0, fillOpacity: 0});
        this.ownerMenu = ownerMenu;
    },
    onDeserialize: function() {
	this.listMorph.relayMouseEvents(this);
    },

    addItem: function(item, index) {
        var item = this.addPseudoMorph(new MenuItem(item[0], item[1], item[2], item[3]));
        if (!index) {
            this.items.push(item);
            return
        }
        if (index > this.items.length || index < 0) throw dbgOn(new Error('Strange index'));
        var parts = this.items.partition(function(ea, i) { return i < index });
        parts[0].push(item);
        this.items = parts[0].concat(parts[1]);
        
    },
    arrayItems: function() {
	return this.items.map( function(item) { return item.asArrayItem(); });
    },


    addLine: function(item) { // Not yet supported
        // The idea is for this to add a real line on top of the text
        this.items.push(this.addPseudoMorph(new MenuItem('-----')));
    },

    addSubmenuItem: function(item) {
        var item = new SubMenuItem(item[0], item[1], item[2], item[3]);
        this.items.push(this.addPseudoMorph(item));
    },
    
    removeItemNamed: function(itemName) {
        // May not remove all if some have same name
        // Does not yet fix up the lines array
        for (var i = 0; i < this.items.length; i++)
            if (this.items[i].name == itemName) {
		this.items[i].remove();
                this.items.splice(i,1);
	    }
    },

    replaceItemNamed: function(itemName, newItem) {
        for (var i = 0; i < this.items.length; i++)
            if (this.items[i].name == itemName)
                this.items[i] = this.addPseudoMorph(new MenuItem(newItem[0], newItem[1], newItem[2], newItem[3]));
    },

    removeItemsNamed: function(nameList) {
        nameList.forEach(function(n) { this.removeItemNamed(n); }, this);
    },

    keepOnlyItemsNamed: function(nameList) {
        var rejects = [];
        this.items.forEach(function(item) { if (nameList.indexOf(item.name) < 0) rejects.push(item.name)});
        this.removeItemsNamed(rejects);
    },

    estimateListWidth: function(proto) {
	// estimate with based on some prototypical TextMorph object
	// lame but let's wait to do the right thing until the layout business is complete
	var maxWidth = 0;
	for (var i = 0; i < this.items.length; i++)
	    if (this.items[i].name.length > maxWidth) maxWidth = this.items[i].name.length;
	var protoPadding = Rectangle.inset(6, 4);
	return maxWidth*proto.fontSize/2 + protoPadding.left() + protoPadding.right();
    },

    openIn: function(parentMorph, loc, remainOnScreen, captionIfAny) { 
        if (this.items.length == 0) return;

        // Note: on a mouseDown invocation (as from a menu button),
        // mouseFocus should be set immediately before or after this call
        this.stayUp = remainOnScreen; // set true to keep on screen

        parentMorph.addMorphAt(this, loc);
	
	var textList = this.items.pluck('name');
        this.listMorph = new TextListMorph(pt(this.estimateListWidth(TextMorph.prototype), 0).extentAsRectangle(), 
					   textList, pt(0, this.listStyle.borderRadius), this.textStyle);
	
	var menu = this;
	this.listMorph.onKeyDown = function(evt) {
	    var result = Class.getPrototype(this).onKeyDown.call(this, evt);
	    switch (evt.getKeyCode()) {
	    case Event.KEY_ESC:
		if (!menu.stayUp) menu.removeOnEvent(evt);
		evt.stop();
		return true;
	    case Event.KEY_RETURN: {
		if (menu.invokeItemAtIndex(evt, this.selectedLineNo)) 
		    evt.stop();
		return true;
	    }
	    }
	};

        this.listMorph.applyStyle(this.listStyle);
        this.listMorph.suppressHandles = true;
        this.listMorph.focusHaloBorderWidth = 0;
        this.listMorph.highlightItemsOnMove = true;
        this.addMorph(this.listMorph);

        this.label = null;
        if (captionIfAny) { // Still under construction
            var label = new TextMorph(new Rectangle(0, 0, 200, 20), captionIfAny);
            label.applyStyle(this.labelStyle);
            label.beLabel();
            label.align(label.bounds().bottomCenter(), this.listMorph.shape.bounds().topCenter());
            this.label = this.addMorph(label);
	    this.label.setFill(new LinearGradient([Color.white, 1, Color.gray]));
        }


        // If menu and/or caption is off screen, move it back so it is visible
        var menuRect = this.bounds();  //includes caption if any
        // Intersect with parentMorph bounds to get visible region.  Note we need shape.bounds,
        // since parentMorph.bounds() would include stick-outs, including this menu!
        var visibleRect = menuRect.intersection(this.owner.shape.bounds()); 
        var delta = visibleRect.topLeft().subPt(menuRect.topLeft());  // delta to fix topLeft off screen
        delta = delta.addPt(visibleRect.bottomRight().subPt(menuRect.bottomRight()));  // same for bottomRight
        if (delta.dist(pt(0, 0)) > 1) this.moveBy(delta);  // move if significant

        this.listMorph.relayMouseEvents(this);
        // Note menu gets mouse focus by default if pop-up.  If you don't want it, you'll have to null it
        if (!remainOnScreen) {
	    var hand = parentMorph.world().firstHand();
	    hand.setMouseFocus(this);
            hand.setKeyboardFocus(this.listMorph);
        }
    },
    
    selectedItemIndex: function(evt) {
        var target = this.listMorph.morphToReceiveEvent(evt);
        var index = this.listMorph.submorphs.indexOf(target);
        if (index === -1) return null;
        return index;
    },
    
    submenuItems: function() {
        return this.items.select(function(ea) { return ea.isSubMenuItem });
    },
    
    handOverMenu: function(hand) {
        return this.listMorph.bounds().containsPoint(this.localize(hand.getPosition()));
    },
    
    setMouseFocus: function(evt) {
        evt.hand.setMouseFocus(this);
        evt.hand.setKeyboardFocus(this.listMorph);    
    },

    setMouseFocusOverSubmenu: function(evt) {
        var submenuItem = this.submenuItems().detect(function(ea) { return ea.menu && ea.menu.handOverMenu(evt.hand) }) ;
        if (!submenuItem) return;
        submenuItem.menu.setMouseFocus(evt);
    },
    
    setMouseFocusOverOwnerMenu: function(evt) {
        if (this.ownerMenu && this.ownerMenu.handOverMenu(evt.hand))
            this.ownerMenu.setMouseFocus(evt);
    },
    
    setMouseFocusOverOwnerMenuOrSubMenu: function(evt) {
        this.setMouseFocusOverOwnerMenu(evt);
        this.setMouseFocusOverSubmenu(evt);
    },
        
    removeOnEvent: function(evt) {
        this.submenuItems().invoke('closeMenu');
        this.remove();
        this.ownerMenu && this.ownerMenu.removeOnEvent(evt);
        if (evt.hand.mouseFocus === this) evt.hand.setMouseFocus(null);
    },

    onMouseUp: function(evt) {
	if (!this.invokeItemAtIndex(evt, this.selectedItemIndex(evt)) && !this.stayUp)
	    this.setMouseFocus(evt); // moved away, don't lose the focus
    },

    onMouseDown: function(evt) {
        if (this.selectedItemIndex(evt) === null && !this.stayUp)
            this.removeOnEvent(evt);
    },

    onMouseMove: function(evt) {
        if (!this.handOverMenu(evt.hand)) {
            this.setMouseFocusOverOwnerMenuOrSubMenu(evt);
            return;    
        }

       this.setMouseFocus(evt);

        var index = this.selectedItemIndex(evt);
        if (index === null) return;
        this.listMorph.highlightItem(evt, index, false);
        
        this.submenuItems().without(this.items[index]).invoke('closeMenu');
        this.items[index].isSubMenuItem && !this.items[index].menu && this.items[index].showMenu(evt, this);
        
        this.setMouseFocus(evt);
    },
    
    // does not work
    onMouseOut: function(evt) {
        console.log("mouse moved away ....");
        this.setMouseFocusOverSubmenu(evt);
        if (this.stayUp) return;
        this.removeOnEvent(evt);
    },
    
    invokeItemAtIndex: function(evt, index) {
	if (index === null) return false;
        try {
	    this.invokeItem(evt, this.items[index]);
        } finally {
	    if (!this.stayUp) this.removeOnEvent(evt);
        }
	return true;
    },
    
    invokeItem: function invokeItem(evt, item) {
        if (!item) return;
	item.invoke(evt, this.targetMorph);
    }

});

Morph.subclass("SliderMorph", {

    documentation: "Slider/scroll control",
    mss: 12,  // minimum slider size
    formals: { 
	Value:        {byDefault: 0}, // from: function(value) { alert('from!' + value); return value;}}, 
	SliderExtent: {mode: "-", byDefault: 0} 
    },
    selfModelClass: PlainRecord.prototype.create({Value: { byDefault: 0 }, SliderExtent: { byDefault: 0}}),

    initialize: function($super, initialBounds, scaleIfAny) {
        $super(initialBounds, "rect");
        // this default self connection may get overwritten by, eg, connectModel()...
	var modelClass = this.selfModelClass;
        var model = new modelClass({}, {});
	this.connectModel(model.newRelay({Value: "Value", SliderExtent: "SliderExtent"}));
        this.scale = (scaleIfAny === undefined) ? 1.0 : scaleIfAny;
        var slider = new Morph(new Rectangle(0, 0, this.mss, this.mss), "rect");
        slider.relayMouseEvents(this, {onMouseDown: "sliderPressed", onMouseMove: "sliderMoved", onMouseUp: "sliderReleased"});
        this.slider = this.addMorph(slider);
        this.slider.linkToStyles(['slider']);
        this.adjustForNewBounds(); 
        return this;
    },
    
    onDeserialize: function() {
        if (!this.slider) {
            console.warn('no slider in %s, %s', this, this.textContent);
           return;
        }
        this.slider.relayMouseEvents(this, {onMouseDown: "sliderPressed", onMouseMove: "sliderMoved", onMouseUp: "sliderReleased"});
    },
    
    vertical: function() {
        var bnds = this.shape.bounds();
        return bnds.height > bnds.width; 
    },
    
    applyStyle: function($super, spec) {
        $super(spec);
        // need to call adjust to update graphics, but only after slider exists
        if (this.slider) this.adjustForNewBounds(); 
    },
    
    adjustForNewBounds: function($super) {
        $super();
        this.adjustSliderParts();
    },
    
    adjustSliderParts: function($super) {
        // This method adjusts the slider for changes in value as well as geometry
        var val = this.getScaledValue();
        var bnds = this.shape.bounds();
        var ext = this.getSliderExtent(); 

	
        if (this.vertical()) { // more vertical...
            var elevPix = Math.max(ext*bnds.height, this.mss); // thickness of elevator in pixels
            var topLeft = pt(0, (bnds.height - elevPix)*val);
            var sliderExt = pt(bnds.width, elevPix); 
        } else { // more horizontal...
            var elevPix = Math.max(ext*bnds.width, this.mss); // thickness of elevator in pixels
            var topLeft = pt((bnds.width - elevPix)*val, 0);
            var sliderExt = pt(elevPix, bnds.height); 
        }
        this.slider.setBounds(bnds.topLeft().addPt(topLeft).extent(sliderExt));

	//this.slider.shapeRoundEdgesBy((this.vertical() ? sliderExt.x : sliderExt.y)/2);
	this.slider.shapeRoundEdgesBy(Math.min(sliderExt.x, sliderExt.y)/2);
	

        if (this.slider.fill instanceof LinearGradient) {
            var direction = this.vertical() ? LinearGradient.EastWest : LinearGradient.NorthSouth;
            var baseColor = this.slider.fill.stopColor(0);
	    this.setFill(new LinearGradient([baseColor, 1, baseColor.lighter(2), 1, baseColor], direction));
	    // FIXME: just flip the gradient
            this.slider.setFill(new LinearGradient([baseColor, 1, this.slider.fill.stopColor(1)], direction));
	    this.setBorderWidth(this.slider.getBorderWidth());
        } else {
            this.setFill(this.slider.fill.lighter());
        }
    },
    
    sliderPressed: function(evt, slider) {
        //    Note: want setMouseFocus to also cache the transform and record the hitPoint.
        //    Ideally thereafter only have to say, eg, morph.setPosition(evt.hand.adjustedMousePoint)
        this.hitPoint = this.localize(evt.mousePoint).subPt(this.slider.bounds().topLeft());
    },
    
    sliderMoved: function(evt, slider) {
        if (!evt.mouseButtonPressed) return;

        // Compute the value from a new mouse point, and emit it
        var p = this.localize(evt.mousePoint).subPt(this.hitPoint);
        var bnds = this.shape.bounds();
        var ext = this.getSliderExtent(); 
    
        if (this.vertical()) { // more vertical...
            var elevPix = Math.max(ext*bnds.height,this.mss); // thickness of elevator in pixels
            var newValue = p.y / (bnds.height-elevPix); 
        } else { // more horizontal...
            var elevPix = Math.max(ext*bnds.width,this.mss); // thickness of elevator in pixels
            var newValue = p.x / (bnds.width-elevPix); 
        }
    
        this.setScaledValue(this.clipValue(newValue));
        this.adjustForNewBounds(); 
    },

    sliderReleased: Functions.Empty,
    
    handlesMouseDown: function(evt) { return !evt.isCommandKey(); },

    onMouseDown: function(evt) {
        this.requestKeyboardFocus(evt.hand);
        var inc = this.getSliderExtent();
        var newValue = this.getValue();

        var delta = this.localize(evt.mousePoint).subPt(this.slider.bounds().center());
        if (this.vertical() ? delta.y > 0 : delta.x > 0) newValue += inc;
        else newValue -= inc;
    
        this.setScaledValue(this.clipValue(newValue));
        this.adjustForNewBounds(); 
    },
    
    onMouseMove: function($super, evt) {
        // Overriden so won't drag me if mouse pressed
        if (evt.mouseButtonPressed) return;
        return $super(evt);
    },
    
    clipValue: function(val) { 
        return Math.min(1.0,Math.max(0,0,val.roundTo(0.0001))); 
    },

    updateView: function(aspect, controller) { // obsolete soon ?
        var p = this.modelPlug;
	if (!p) return;
	if (aspect == p.getValue || aspect == 'all') {
	    this.onValueUpdate(this.getValue());
	} else if (aspect == p.getSliderExtent || aspect == 'all')  {
	    this.onSliderExtentUpdate(this.getSliderExtent()); 
	}
    },

    onSliderExtentUpdate: function(extent) {
	this.adjustForNewBounds();
    },

    onValueUpdate: function(value) {
	this.adjustForNewBounds();
    },

    getScaledValue: function() {
        return (this.getValue() || 0) / this.scale; // FIXME remove 0
    },

    setScaledValue: function(value) {
        return this.setValue(value * this.scale);
    },
    
    takesKeyboardFocus: Functions.True,
    
    setHasKeyboardFocus: function(newSetting) { 
        return newSetting; // no need to remember
    },

    onKeyPress: Functions.Empty,

    onKeyDown: function(evt) {
        var delta = 0;
        if (this.vertical()) {
            switch (evt.getKeyCode()) {
            case Event.KEY_DOWN: delta = 1; break;
            case Event.KEY_UP:  delta = -1; break;
            default: return false;
            } 
        } else {
            switch (evt.getKeyCode()) {
            case Event.KEY_RIGHT: delta = 1;  break;    
            case Event.KEY_LEFT:  delta = -1; break;
            default: return false;
            }    
        }
        this.setScaledValue(this.clipValue(this.getScaledValue() + delta * (this.getSliderExtent())));
        this.adjustForNewBounds();
        evt.stop();
        return true;
    }

});

Morph.subclass("ScrollPane", {

    description: "A scrolling container",
    borderWidth: 2,
    fill: null,
    scrollBarWidth: 14,
    ScrollBarFormalRelay: Relay.create({Value: "ScrollPosition", SliderExtent: "-VisibleExtent"}), // a class for relays

    initialize: function($super, morphToClip, initialBounds) {
        $super(initialBounds, "rect");

        var bnds = this.innerBounds();
        var clipR = bnds.withWidth(bnds.width - this.scrollBarWidth+1).insetBy(1);
        morphToClip.shape.setBounds(clipR); // FIXME what if the targetmorph should be bigger than the clipmorph?
        // Make a clipMorph with the content (morphToClip) embedded in it
        this.clipMorph = this.addMorph(new ClipMorph(clipR));    
        this.clipMorph.shape.setFill(morphToClip.shape.getFill());
        morphToClip.setBorderWidth(0);
        morphToClip.setPosition(clipR.topLeft());
        this.clipMorph.addMorph(morphToClip);
	
        // Add a scrollbar
        this.scrollBar = this.addMorph(new SliderMorph(bnds.withTopLeft(clipR.topRight())));
	this.scrollBar.connectModel(new (this.ScrollBarFormalRelay)(this));
	
        // suppress handles throughout
        [this, this.clipMorph, morphToClip, this.scrollBar].forEach(function(m) {m.suppressHandles = true});
        // alert('inner morph is ' + this.innerMorph());
	
        return this;
    },
    
    onDeserialize: function() { // FIXME duplication between here and initialize
        if (this.scrollBar && this.ScrollBarFormalRelay) 
	    this.scrollBar.formalModel = new (this.ScrollBarFormalRelay)(this);
        if (this.menuButton)
            this.menuButton.relayMouseEvents(this, {onMouseDown: "menuButtonPressed"});
    },

    submorphBounds: function() {
	// a little optimization 
	// FIXME: epimorphs should be included
	return this.clipMorph.bounds();
    },

    innerMorph: function() {
        return this.clipMorph.innerMorph();
    },

    connectModel: function(plugSpec, optFlag) { // connection is mapped to innerMorph
        this.innerMorph().connectModel(plugSpec, optFlag);
        if (plugSpec.getMenu) this.addMenuButton();
    },
    
    disconnectModel: function() {
        this.innerMorph().disconnectModel();
    },
    
    getModel: function() {
        return this.innerMorph().getModel();
    },

    getModelPlug: function() {
        return this.innerMorph().getModelPlug();
    },

    updateView: function(aspect, source) {
        return this.innerMorph().updateView(aspect, source);
    },
    
    addMenuButton: function() {
        if (this.menuButton) return;

        var w = this.scrollBarWidth;
        this.menuButton = this.addMorph(new Morph(new Rectangle(0, 0, w, w)));
        this.menuButton.setFill(Color.white);
        // Make it look like 4 tiny lines of text (doesn't work yet...)
        var p0 = this.menuButton.innerBounds().topLeft().addXY(2, 2);
        for (var i = 1; i <= 4; i++) {
            var line = Morph.makeLine([pt(0, i*2), pt([6, 2, 4, 6][i-1], i*2)], 1, Color.black);
            line.translateBy(p0);
            this.menuButton.addMorph(line);
            line.ignoreEvents();
        }
        if (this.scrollBar) {
            this.menuButton.setPosition(this.scrollBar.getPosition());
            this.menuButton.setFill(this.scrollBar.getFill());
            this.scrollBar.setBounds(this.scrollBar.bounds().withTopLeft(
            this.scrollBar.bounds().topLeft().addXY(0, w)));
        }
        this.menuButton.relayMouseEvents(this, {onMouseDown: "menuButtonPressed"});
    },

    menuButtonPressed: function(evt, button) {
        evt.hand.setMouseFocus(null);
        var editItems = this.innerMorph().editMenuItems();
	var items = this.innerMorph().getModelValue("getMenu") || [];
        if (editItems.length == 0 && items.length == 0) return;
        var menu;
	if (editItems.length > 0 && items.length > 0) {
            var menu = new MenuMorph(editItems, this);
	    menu.addLine();
	    items.forEach(function(item) {menu.addItem(item); });
	} else {
	    var menu = new MenuMorph(editItems.concat(items), this);
	}
        menu.openIn(this.world(), evt.mousePoint, false); 
    },

    getScrollPosition: function() { 
        var ht = this.innerMorph().bounds().height;
        var slideRoom = ht - this.bounds().height;
	// note that inner morph may have exactly the same size as outer morph so slideRoom may be zero
        return slideRoom && -this.innerMorph().position().y/slideRoom; 
    },
    
    setScrollPosition: function(scrollPos) { 
        var ht = this.innerMorph().bounds().height;
        var slideRoom = ht - this.bounds().height;
        this.innerMorph().setPosition(pt(this.innerMorph().position().x, -slideRoom*scrollPos)); 
        this.scrollBar.adjustForNewBounds();
	//console.log("setScrollPos  ht = " + ht + ", slideRoom = " + slideRoom + ", scrollPos = " + scrollPos);
    },

    getVisibleExtent: function(scrollPos) {
        return Math.min(1, this.bounds().height / Math.max(10, this.innerMorph().bounds().height)); 
    },
    
    scrollToTop: function() {
        this.setScrollPosition(0);
        this.scrollBar.adjustForNewBounds(); 
    },

    scrollToBottom: function() {
        this.setScrollPosition(1);
        this.scrollBar.adjustForNewBounds(); 
    },

    scrollRectIntoView: function(r) {
        var im = this.innerMorph();
        if (!r || !im) return;
        var bnds = this.innerBounds();
        var yToView = r.y + im.getPosition().y;  // scroll down if above top
        if (yToView < bnds.y) {
            im.moveBy(pt(0, bnds.y - yToView));
            this.scrollBar.adjustForNewBounds();
            return;
        }
        var yToView = r.y + r.height + im.getPosition().y;  // scroll up if below bottom
        var tweak = 5;  // otherwise it doesnt scroll up enough to look good
        if (yToView > bnds.maxY() - tweak) {
            im.moveBy(pt(0, bnds.maxY() - tweak - yToView))
            this.scrollBar.adjustForNewBounds();
        }
    },
    
    adjustForNewBounds: function ($super) {
        // Compute new bounds for clipMorph and scrollBar
        $super();
        if (!this.clipMorph || !this.scrollBar) return;
        var bnds = this.innerBounds();
        var clipR = bnds.withWidth(bnds.width - this.scrollBarWidth+1).insetBy(1);
        this.clipMorph.setExtent(clipR.extent());
        this.innerMorph().setExtent(clipR.extent());
        var barBnds = bnds.withTopLeft(clipR.topRight());
        if (this.menuButton) {
            var w = this.scrollBarWidth;
            this.menuButton.setPosition(barBnds.topLeft());
            //this.menuButton.setBounds(barBnds.topLeft().extent(pt(w, w)));
            barBnds = barBnds.withTopLeft(barBnds.topLeft().addXY(0, w));
        }
        this.scrollBar.setBounds(barBnds);
    }

});

Global.newListPane = function(initialBounds) {
    return new ScrollPane(new CheapListMorph(initialBounds,["-----"]), initialBounds); 
};

Global.newTextListPane = function(initialBounds) {
    return new ScrollPane(new TextListMorph(initialBounds, ["-----"]), initialBounds); 
};

Global.newRealListPane = function(initialBounds) {
    return new ScrollPane(new ListMorph(initialBounds, ["-----"]), initialBounds); 
};

Global.newTextPane = function(initialBounds, defaultText) {
    return new ScrollPane(new TextMorph(initialBounds, defaultText), initialBounds); 
};

Global.newPrintPane = function(initialBounds, defaultText) {
    return new ScrollPane(new PrintMorph(initialBounds, defaultText), initialBounds); 
};

Global.newXenoPane = function(initialBounds) {
    return new ScrollPane(new XenoMorph(initialBounds.withHeight(1000)), initialBounds);
}

// ===========================================================================
// Utility widgets
// ===========================================================================

/**
 * @class ColorPickerMorph
 */ 
Morph.subclass("ColorPickerMorph", {

    fill: null,
    borderWidth: 1, 
    borderColor: Color.black,
    formals: ["+Color"],

    initialize: function($super, initialBounds, targetMorph, setFillName, popup) {
        $super(initialBounds, "rect");
        this.targetMorph = targetMorph;
        this.setFillFunctionName = setFillName; // name like "setBorderColor"
        if (targetMorph != null) this.connectModel({model: targetMorph, setColor: setFillName});
        this.colorWheelCache = null;
        this.isPopup = popup; 
        this.buildView();
        return this;
    },

    buildView: function() {
        // Slow -- should be cached as a bitmap and invalidated by layoutChanged
        // Try caching wheel as an interim measure
        var r = this.shape.bounds().insetBy(this.getBorderWidth());
        var rh2 = r.height/2;
        var dd = 2; // grain for less resolution in output (input is still full resolution)
        
        //DI: This could be done with width*2 gradients, instead of width*height simple fills
        //    For now it seems to perform OK at 2x granularity, and actual color choices 
        //    are still full resolution
        for (var x = 0; x < r.width; x += dd) {
            for (var y = 0; y < r.height; y += dd) { // lightest down to neutral
                var patchFill = this.colorMap(x, y, rh2, this.colorWheel(r.width + 1)).toString();
                var element = new RectShape(new Rectangle(x + r.x, y + r.y, dd, dd), patchFill, 0, null);
                // element.setAttributeNS("fill", this.colorMap(x, rh2, rh2, this.colorWheel(r.width + 1)).toString());
                this.addWrapper(element);
            }
        }
    },

    colorMap: function(x,y,rh2,wheel) {
        var columnHue = wheel[x];
        if (y <= rh2) return columnHue.mixedWith(Color.white, y/rh2); // lightest down to neutral
        else return Color.black.mixedWith(columnHue, (y - rh2)/rh2);  // neutral down to darkest
    },

    colorWheel: function(n) { 
        if (this.colorWheelCache && this.colorWheelCache.length == n) return this.colorWheelCache;
        console.log("computing wheel for " + n);
        return this.colorWheelCache = Color.wheelHsb(n,338,1,1);
    },

    handlesMouseDown: function(evt) { 
        return !evt.isCommandKey();
    },

    onMouseDown: function(evt) {
        return this.onMouseMove(evt);
    },

    onMouseUp: function(evt) {
        if (!this.isPopup) return;
        this.remove();
    },

    onMouseMove: function(evt) {
        if (evt.mouseButtonPressed) { 
            var r = this.bounds().insetBy(this.getBorderWidth());
            r = pt(0,0).extent(r.extent());
            var rh2 = r.height/2;
            var wheel = this.colorWheel(r.width+1);
            var relp = r.constrainPt(this.localize(evt.mousePoint).addXY(-2,-2));
            // console.log('mp = ' + Object.inspect(this.localize(evt.mousePoint)) + ' / relp = ' + Object.inspect(relp));
            var selectedColor = this.colorMap(relp.x,relp.y,rh2,wheel);
            this.setColor(selectedColor);
        } 
    }
    
});

Morph.subclass('XenoMorph', {

    documentation: "Contains a foreign object, most likely XHTML",
    borderWidth: 0,
    fill: Color.gray.lighter(),

    initialize: function($super, bounds) { 
        $super(bounds, "rect"); 
        this.foRawNode = NodeFactory.createNS(Namespace.SVG, "foreignObject", 
                             {x: bounds.x, y: bounds.y, 
                              width: bounds.width,
                              height: bounds.height });

        this.foRawNode.appendChild(document.createTextNode("no content, load an URL"));
        this.addNonMorph(this.foRawNode);
	
    },

    onURLUpdate: function(url) {
	if (!url) return;
	var xeno = this;
	function clearChildren(node) {
	    while(node.firstChild) node.removeChild(node.firstChild);
	}
	var callback = Object.extend(new NetRequestReporter(), {
	    setContent: function(doc) {
		clearChildren(xeno.foRawNode);
		xeno.foRawNode.appendChild(document.adoptNode(doc.documentElement));
	    },
	    setContentText: function(txt) {
		clearChildren(xeno.foRawNode);
		xeno.foRawNode.appendChild(document.createTextNode(txt));
	    }
	});
        var req = new NetRequest({model: callback, setResponseXML: "setContent", setResponseText: "setContentText"});
        req.setContentType("text/xml");
        req.get(url);
    },

    adjustForNewBounds: function($super) {
        $super();
        var bounds = this.shape.bounds();
	console.log("bounds " + bounds + " vs " + bounds.width + "," + bounds.height);
        this.foRawNode.setAttributeNS(null, "width", bounds.width);
        //this.foRawNode.setAttributeNS(null, "height", bounds.height);
    }

});



// most likely deprecated, should use Widget, which is a view.
Model.subclass('WidgetModel', {

    viewTitle: "Widget",
    initialViewExtent: pt(400, 300),

    openTriggerVariable: 'all',
    documentation: "Convenience base class for widget models",
    
    getViewTitle: function() { // a string or a TextMorph
        return this.viewTitle;
    },

    buildView: function(extent) {
        throw new Error("override me");
    },

    getInitialViewExtent: function(world, hint) {
        return hint || this.initialViewExtent;
    },
    
    openIn: function(world, loc) {
        var win = 
	    world.addFramedMorph(this.buildView(this.getInitialViewExtent(world)), 
				 this.getViewTitle(), loc);
        if (this.openTriggerVariable) {
            this.changed(this.openTriggerVariable);
        }
        return win;
    },

    open: function() { // call interactively
        return this.openIn(WorldMorph.current());
    }

});

Wrapper.subclass('Widget', ViewTrait, { // FIXME remove code duplication

    viewTitle: "Widget",
    initialViewExtent: pt(400, 300),
    initialViewPosition: pt(50, 50),
    documentation: "Nonvisual component of a widget",
    useLightFrame: false,
    
    getViewTitle: function() { // a string or a TextMorph
        return this.viewTitle;
    },

    buildView: function(extent, model) {
        throw new Error("override me");
    },

    getInitialViewExtent: function(world, hint) {
        return hint || this.initialViewExtent;
    },
    
    viewMenu: function(items) {
	// Default function passes through all view items if not overridden by a given application
        return items;
    },
    
    openIn: function(world, optLoc) {
	var view = this.buildView(this.getInitialViewExtent(world), this.getModel());
	view.ownerWidget = this; // ??
	return world.addFramedMorph(view, this.getViewTitle(), optLoc, this.useLightFrame);
    },
    
    ownModel: function(model) {
	this.actualModel = model;
	this.rawNode.appendChild(model.rawNode);
    },

    open: function() { // call interactively
        return this.openIn(WorldMorph.current());
    },

    initialize: function($super, plug) {
	$super();
	this.rawNode = NodeFactory.create("widget");
	this.setId(this.newId());
        if (plug) this.connectModel(plug);
    },

    parentWindow: function(view) {
	var parent = view.owner;
	while (parent && !(parent instanceof WindowMorph)) {
	    parent = parent.owner;
	}
	return parent;
    }

});

Widget.subclass('Dialog', {
    inset: 10,
    style: { borderColor: Color.blue, borderWidth: 4, borderRadius: 16,
             fill: Color.blue.lighter(), opacity: 0.9},
    useLightFrame: true,
    viewTitle: "",
    removeTopLevel: function() {
        (this.parentWindow(this.panel) || this.panel).remove();
    },

    openIn: function($super, world, position) {
	var view = $super(world, position);
	if (position)  // slight usability improvement
	    view.align(view.bounds().center(), position);
	return view;

    },
    
});

Dialog.subclass('ConfirmDialog', {

    formals: ["+Result",  // yes or no, listen for updates
	      "-Message"], // what to display
    initialViewExtent: pt(300, 90),
    
    openIn: function($super, world, position) {
	var view = $super(world, position);
        world.firstHand().setKeyboardFocus(view.targetMorph.submorphs[1]);
	return view;

    },
    
    cancelled: function(value, source) {
        this.removeTopLevel();
	if (value == false) this.setResult(false);
    },
    
    confirmed: function(value, source) {
        this.removeTopLevel();
	if (value == true) this.setResult(true);
    },
    
    buildView: function(extent, model) {
        var panel = new PanelMorph(extent);
        this.panel = panel;
        panel.linkToStyles(["panel"]);

        var r = new Rectangle(this.inset, this.inset, extent.x - 2*this.inset, 30);
        var label = panel.addMorph(new TextMorph(r, this.getMessage()).beLabel());

        var indent = extent.x - 2*70 - 3*this.inset;
        
	r = new Rectangle(r.x + indent, r.maxY() + this.inset, 70, 30);
        var yesButton = panel.addMorph(new ButtonMorph(r)).setLabel("Yes");
        yesButton.connectModel({model: this, setValue: "confirmed"});
        
	r = new Rectangle(r.maxX() + this.inset, r.y, 70, 30);
        var noButton = panel.addMorph(new ButtonMorph(r)).setLabel("No");
        noButton.connectModel({model: this, setValue: "cancelled"});
        return panel;
    }

});

Dialog.subclass('PromptDialog', {

    formals: ["-Message", "Input", "+Result"],
    initialViewExtent: pt(300, 130),

    openIn: function($super, world, loc) {
        var view = $super(world, loc);
        world.firstHand().setKeyboardFocus(view.targetMorph.inputLine);
        return view;
    },

    onInputUpdate: Functions.Empty, // shouldn't there be a better way?

    cancelled: function(value) {
        if (value == false) return;
        this.removeTopLevel();
	this.setResult(false);
    },
    
    confirmed: function(value) {
        if (value == false) return;
        this.removeTopLevel();
	this.setResult(true);
    },

    buildView: function(extent, model) {
        var panel = new PanelMorph(extent);
        this.panel = panel;
        panel.linkToStyles(["panel"]);


        var r = new Rectangle(this.inset, this.inset, extent.x - 2*this.inset, 30);
        var label = panel.addMorph(new TextMorph(r, this.getMessage()).beLabel());

        r = new Rectangle(r.x, r.maxY() + this.inset, r.width, r.height);

        panel.inputLine = panel.addMorph(new TextMorph(r, "").beInputLine());
        panel.inputLine.autoAccept = true;
	
        panel.inputLine.connectModel({model: this, getText: "getInput", setText: "setInput"});
	// FIXME is this necessary
	if (this.getInput()) panel.inputLine.updateTextString(this.getInput());
	
        var indent = extent.x - 2*70 - 3*this.inset;
        r = new Rectangle(r.x + indent, r.maxY() + this.inset, 70, 30);
        var okButton = panel.addMorph(new ButtonMorph(r)).setLabel("OK");

        okButton.connectModel({model: this, setValue: "confirmed"});
        r = new Rectangle(r.maxX() + this.inset, r.y, 70, 30);
        var cancelButton = panel.addMorph(new ButtonMorph(r)).setLabel("Cancel");
        cancelButton.connectModel({model: this, setValue: "cancelled"});
        return panel;
    }
});

PromptDialog.test = function() {
    return WorldMorph.current().prompt("what", function(value) { alert('got input ' + value) });
}

Widget.subclass('ConsoleWidget', {

    viewTitle: "Console",
    formals: ["LogMessages", "RecentLogMessages", "Commands", "CommandCursor", "LastCommand", "Menu", "Capacity"],
    ctx: {},
    
    initialize: function($super, capacity) {
        $super(null);

	// note newNodeInstance causes problems with serializing Menu
        var model = Record.newNodeInstance({LogMessages: [], RecentLogMessages: [], Commands: [], 
	    CommandCursor: 0,  LastCommand: "", Capacity: capacity,
	    Menu: [["command history", this, "addCommandHistoryInspector"]]});
	
        this.relayToModel(model, {LogMessages: "LogMessages",
				  RecentLogMessages: "+RecentLogMessages",
				  Commands: "Commands",
				  LastCommand: "LastCommand",
				  Menu: "Menu",
				  Capacity: "-Capacity"});
        Global.console.consumers.push(this);
        this.ans = undefined; // last computed value
        return this;
    },
    
    addCommandHistoryInspector: function() {
        WorldMorph.current().addTextListWindow({
	    extent:pt(500, 40),
	    content: this.getCommands([]),
	    title: "Command history"
	});
    },

    getInitialViewExtent: function(world, hint) {
        return hint || pt(world.viewport().width, 160); 
    },
    
    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['messagePane', newTextListPane, new Rectangle(0, 0, 1, 0.8)],
            ['commandLine', TextMorph, new Rectangle(0, 0.8, 1, 0.2)]
        ]);

        var model = this.getModel();
        var m = panel.messagePane;
	
        m.relayToModel(model, {List: "-LogMessages", ListDelta: "RecentLogMessages", 
			       Capacity: "-Capacity", Menu: "-Menu"});
	
	m.innerMorph().focusHaloBorderWidth = 0;
	
        var self = this;
        panel.shutdown = function() {
            Class.getPrototype(this).shutdown.call(this);
            var index = window.console.consumers.indexOf(self);
            if (index >= 0) {
                window.console.consumers.splice(index);
            }
        };

        m = panel.commandLine.beInputLine(100);
	m.relayToModel(model, { History: "-Commands", HistoryCursor: "CommandCursor", Text: "LastCommand"});
        return panel;
    },

    evaluate: interactiveEval.bind(this.ctx),
    
    onLastCommandUpdate: function(text) {
        if (!text) return;
        try {
            var ans = this.evaluate(text);
            if (ans !== undefined) this.ans = ans;
	    var command = Object.inspect(ans);
	    this.setRecentLogMessages([command]);
        } catch (er) {
	    dbgOn(true);
            alert("Whoa Evaluation error: "  + er);
        }
    },
    
    log: function(message) {
        this.setRecentLogMessages([message]);
    }
    
});


Widget.subclass('XenoBrowserWidget', {
    
    initialViewExtent: pt(800, 300),

    initialize: function($super, filename) {
	var url = filename ? URL.source.withFilename(filename) : null;
	this.actualModel = Record.newPlainInstance({URL: url});
	$super();
    },
    
    buildView: function(extent) {
	var panel = PanelMorph.makePanedPanel(extent, [
	    ['urlInput', TextMorph, new Rectangle(0, 0, 1, 0.1)],
	    ['contentPane', newXenoPane, new Rectangle(0, 0.1, 1, 0.9)]
	]);
	var model = this.actualModel;
	
	panel.urlInput.beInputLine();
	panel.urlInput.connectModel(model.newRelay({Text: { name: "URL", to: URL.create, from: String }}), true);
	panel.contentPane.connectModel(model.newRelay({URL: "-URL"}), true);
	
	return panel;
    }
});
    

// ===========================================================================
// Window widgets
// ===========================================================================


Morph.subclass("TitleBarMorph", {

    documentation: "Title bar for WindowMorphs",

    controlSpacing: 3,
    barHeight: 22,
    shortBarHeight: 15,
    borderWidth: 0,
    fill: null,
    labelStyle: { borderRadius: 8, padding: Rectangle.inset(6, 2), fill: new LinearGradient([Color.white, 1, Color.gray]) },

    initialize: function($super, headline, windowWidth, windowMorph, optSuppressControls) {
	if (optSuppressControls)  this.barHeight = this.shortBarHeight; // for dialog boxes
	var bounds = new Rectangle(0, 0, windowWidth, this.barHeight);
	
        $super(bounds, "rect");
	
	// contentMorph is bigger than the titleBar, so that the lower rounded part of it can be clipped off
	// arbitrary paths could be used, but FF doesn't implement the geometry methods :(
	// bounds will be adjusted in adjustForNewBounds()
	var contentMorph = new Morph(bounds, "rect");
	this.addMorph(new ClipMorph(bounds)).addMorph(contentMorph);
	contentMorph.linkToStyles(["titleBar"]);
	
	this.ignoreEvents();
	contentMorph.ignoreEvents();
	contentMorph.owner.ignoreEvents();
	this.contentMorph = contentMorph;
	
        this.windowMorph = windowMorph;

	    
        // Note: Layout of submorphs happens in adjustForNewBounds (q.v.)
        var label;
        if (headline instanceof TextMorph) {
	    label = headline;
        } else if (headline != null) { // String
	    // wild guess headlineString.length * 2 *  font.getCharWidth(' ') + 2;
	    var width = headline.length * 8; 
	    label = new TextMorph(new Rectangle(0, 0, width, this.barHeight), headline).beLabel();
        }
        label.applyStyle(this.labelStyle);
        this.label = this.addMorph(label);
	if (!optSuppressControls) {
            var cell = new Rectangle(0, 0, this.barHeight, this.barHeight);
            this.closeButton =  this.addMorph(new WindowControlMorph(cell, this.controlSpacing, Color.primary.orange));
	    this.menuButton = this.addMorph(new WindowControlMorph(cell, this.controlSpacing, Color.primary.blue));
            this.collapseButton = this.addMorph(new WindowControlMorph(cell, this.controlSpacing, Color.primary.yellow));
	    this.connectButtons(windowMorph);
	} 
        this.adjustForNewBounds();  // This will align the buttons and label properly
        return this;
    },
    
    connectButtons: function(w) {
	this.closeButton.relayToModel(w, {HelpText: "-CloseHelp", Trigger: "=initiateShutdown"});
	this.menuButton.relayToModel(w, {HelpText: "-MenuHelp", Trigger: "=showTargetMorphMenu"});
	this.collapseButton.relayToModel(w, {HelpText: "-CollapseHelp", Trigger: "=toggleCollapse"});
    },

    
    onDeserialize: function() {
        this.connectButtons(this.windowMorph);
    },

    acceptsDropping: function(morph) {
        //console.log('accept drop from %s of %s, %s', this, morph, morph instanceof WindowControlMorph);
        return morph instanceof WindowControlMorph; // not used yet... how about text...
    },

    highlight: function(trueForLight) {
	this.label.setFill(trueForLight ? new LinearGradient([Color.white, 1, Color.lightGray]) : null);
    },

    okToBeGrabbedBy: function(evt) {
        var oldTop = this.world().topSubmorph();
	if (oldTop instanceof WindowMorph) oldTop.titleBar.highlight(false);
        return this.windowMorph;
    },

    adjustForNewBounds: function($super) {
	var innerBounds = this.innerBounds();
	var sp = this.controlSpacing;
        $super();
        var loc = this.innerBounds().topLeft().addXY(sp, sp);
        var l0 = loc;
        var dx = pt(this.barHeight - sp, 0);
        if (this.menuButton) { 
	    this.menuButton.setPosition(loc);  
	    loc = loc.addPt(dx); 
	}
        if (this.label) {
            this.label.align(this.label.bounds().topCenter(), this.innerBounds().topCenter());
            if (this.label.bounds().topLeft().x < loc.x) {
                this.label.align(this.label.bounds().topLeft(), loc.addXY(0,-3));
            }
        }
	if (this.closeButton) { 
	    loc = this.innerBounds().topRight().addXY(-sp - this.closeButton.shape.bounds().width, sp);
	    this.closeButton.setPosition(loc);  
	    loc = loc.subPt(dx); 
	}
        if (this.collapseButton) { 
	    this.collapseButton.setPosition(loc);  
	    //loc = loc.subPt(dx); 
	}
	
	
	var style = this.styleNamed("titleBar");
	var w = style.borderWidth;
	var r = style.borderRadius;
	this.contentMorph.setBounds(new Rectangle(w/2, w/2, innerBounds.width, this.barHeight + r));
	var clip = this.contentMorph.owner;
	clip.setBounds(innerBounds.insetByRect(Rectangle.inset(-w/2, -w/2, -w/2, 0)));
    },

    okToDuplicate: Functions.False

});

Morph.subclass("TitleTabMorph", {

    documentation: "Title bar for tabbed window morphs",

    barHeight: 0,
    controlSpacing: 0,
    suppressHandles: true,
    
    initialize: function($super, headline, windowWidth, windowMorph) {
        $super(new Rectangle(0, 0, windowWidth, this.barHeight), "rect");
        this.windowMorph = windowMorph;
        this.linkToStyles(['titleBar']);
        this.ignoreEvents();

        var label;
        if (headline instanceof TextMorph) {
            label = headline;
        } else { // String
            var width = headline.length * 8;
            // wild guess headlineString.length * 2 *  font.getCharWidth(' ') + 2; 
            label = new TextMorph(new Rectangle(0, 0, width, this.barHeight), headline).beLabel();
        }
        var topY = this.shape.bounds().y;
        label.align(label.bounds().topLeft(), pt(0,0));
        this.label = this.addMorph(label);
        this.shape.setBounds(this.shape.bounds().withTopRight(pt(label.bounds().maxX(), topY)));
        return this;
    },

    okToBeGrabbedBy: function(evt) {
        return this;
    },

    handlesMouseDown: Functions.True,

    onMouseDown: Functions.Empty,

    onMouseUp: function(evt) {
        this.windowMorph.toggleCollapse();
    },

    highlight: TitleBarMorph.prototype.highlight

});

Morph.subclass("WindowControlMorph", {

    documentation: "Event handling for Window morphs",

    borderWidth: 0,
    
    focus: pt(0.4, 0.2),
    formals: ["-HelpText", "-Trigger"],
    
    initialize: function($super, rect, inset, color) {
        $super(rect.insetBy(inset), 'ellipse');
        this.setFill(new RadialGradient([color.lighter(2), 1, color, 1, color.darker()], this.focus));
        return this;
    },

    handlesMouseDown: Functions.True,

    onMouseDown: function($super, evt) {
        $super(evt);
	// interesting case for the MVC architecture
        return this.formalModel.onTriggerUpdate(evt);
    },

    onMouseOver: function($super, evt) {
        var prevColor = this.fill.stopColor(1);
        this.setFill(new RadialGradient([Color.white, 1, prevColor, 1, prevColor.darker()], this.focus));
        $super(evt);
    },
    
    onMouseOut: function($super, evt) {
        var prevColor = this.fill.stopColor(1);
        this.setFill(new RadialGradient([prevColor.lighter(2), 1, prevColor, 1, prevColor.darker()], this.focus));
        $super(evt);
    },
    
    checkForControlPointNear: Functions.False,
    
    okToBeGrabbedBy: Functions.Null

 
});

Morph.subclass('StatusBarMorph', {

    borderWidth: 0,
    fill: null,

    initialize: function($super, titleBar) {
	var bounds = titleBar.getExtent().extentAsRectangle().withHeight(8);
	
        $super(bounds, "rect");
	
	// contentMorph is bigger than the titleBar, so that the lower rounded part of it can be clipped off
	// arbitrary paths could be used, but FF doesn't implement the geometry methods :(
	// bounds will be adjusted in adjustForNewBounds()
	var contentMorph = new Morph(bounds.withHeight(bounds.height*2).withY(-bounds.height), "rect");
	this.addMorph(new ClipMorph(bounds.withHeight(bounds.height + 2).withWidth(bounds.width + 2))).addMorph(contentMorph);
	contentMorph.linkToStyles(["titleBar"]);
	
	this.ignoreEvents();
	contentMorph.ignoreEvents();
	contentMorph.owner.ignoreEvents();
	this.contentMorph = contentMorph;
        return this;
    },
    adjustForNewBounds: function ($super) {
        $super();
	var cm = this.contentMorph;
	if (cm) cm.setExtent(pt(this.bounds().width, cm.bounds().height))
    }
});

var WindowState = Class.makeEnum(['Expanded', 'Collapsed', 'Shutdown']);

Morph.subclass('WindowMorph', {

    documentation: "Full-fledged windows with title bar, menus, etc.",
    state: WindowState.Expanded,
    titleBar: null,
    statusBar: null,
    targetMorph: null,
    
    initialize: function($super, targetMorph, headline, optSuppressControls) {
        var bounds = targetMorph.bounds();
        $super(bounds, "rect");
        var titleBar = this.makeTitleBar(headline, bounds.width, optSuppressControls);
        var titleHeight = titleBar.bounds().height;
	this.setBounds(bounds.withHeight(bounds.height + titleHeight));
        this.targetMorph = this.addMorph(targetMorph);
        this.titleBar = this.addMorph(titleBar);
        this.contentOffset = pt(0, titleHeight - titleBar.getBorderWidth()/2); // FIXME: hack
        targetMorph.setPosition(this.contentOffset);
	this.applyStyle({borderWidth: 0, fill: null, borderRadius: 0});
        this.closeAllToDnD();
	this.collapsedTransform = null;
	this.collapsedExtent = null;
        this.expandedTransform = null;
	this.expandedExtent = null;
	this.ignoreEventsOnExpand = false;
	if (Config.useStatusBar) this.statusBar = this.addMorph(new StatusBarMorph(this.titleBar));
	this.adjustForNewBounds();
        return this;
    },

    toString: function($super) {
        var label = this.titleBar && this.titleBar.label;
        return $super() + (label ? ": " + label.textString : ""); 
    },

    restorePersistentState: function($super, importer) {
        $super(importer);
	// remove the following:
        //this.contentOffset = pt(0, this.titleBar.bounds().height);
    },
    
    makeTitleBar: function(headline, width, optSuppressControls) {
        // Overridden in TabbedPanelMorph
        return new TitleBarMorph(headline, width, this, optSuppressControls);
    },

    windowContent: function() { return this.targetMorph; },
    
    immediateContainer: function() { return this;  },

    toggleCollapse: function() {
        return this.isCollapsed() ? this.expand() : this.collapse();
    },
    
    collapse: function() { 
        if (this.isCollapsed()) return;
        this.expandedTransform = this.getTransform();
	this.expandedExtent = this.getExtent();
	this.ignoreEventsOnExpand = this.targetMorph.areEventsIgnored();
	this.targetMorph.ignoreEvents(); // unconditionally
	this.targetMorph.undisplay();
	this.setTransform(this.collapsedTransform  || this.expandedTransform);

        this.state = WindowState.Collapsed;  // Set it now so setExtent works right
        if (this.collapsedExtent) this.setExtent(this.collapsedExtent);
	this.shape.setBounds(this.titleBar.bounds());
	this.layoutChanged();
        this.titleBar.highlight(false);
    },
    
    expand: function() {
        if (!this.isCollapsed()) return;
        this.collapsedTransform = this.getTransform();
        this.collapsedExtent = this.innerBounds().extent();
        this.setTransform(this.expandedTransform); 
	this.targetMorph.display();
	// enable events if they weren't disabled in expanded form
	if (!this.ignoreEventsOnExpand) this.targetMorph.enableEvents();

        this.state = WindowState.Expanded;  // Set it now so setExtent works right
	if (this.expandedExtent) {
	    this.setExtent(this.expandedExtent);
	    this.shape.setBounds(this.expandedExtent.extentAsRectangle());
	}
	this.layoutChanged();
        this.takeHighlight();
    },

    isCollapsed: function() { return this.state === WindowState.Collapsed; },

    getCloseHelp: function() { return "Close"; },

    getMenuHelp: function() { return "Menu"; },
    
    getCollapseHelp: function() { return this.isCollapsed() ? "Expand" : "Collapse"; },

    contentIsVisible: function() { return !this.isCollapsed(); },

    // Following methods promote windows on first click----------------
    morphToGrabOrReceive: function($super, evt, droppingMorph, checkForDnD) {
        // If this window is doesn't need to come forward, then respond normally
        if (!this.needsToComeForward(evt) || droppingMorph != null) {
            return $super(evt, droppingMorph, checkForDnD)
        }
        // Otherwise, hold mouse focus until mouseUp brings it to the top
        return this;
    },

    needsToComeForward: function(evt) {
        if (this.owner !== this.world()) return true; // weird case -- not directly in world
        if (!this.fullContainsWorldPoint(evt.point())) return false;  // not clicked in me
        if (this === this.world().topSubmorph()) return false;  // already on top
        if (this.isCollapsed()) return false;  // collapsed labels OK from below
        if (this.titleBar.fullContainsWorldPoint(evt.point())) return false;  // labels OK from below
        return true;  // it's in my content area
    },

    // Next four methods hold onto control until mouseUp brings the window forward.
    handlesMouseDown: function(evt) { return this.needsToComeForward(evt); },

    onMouseDown: Functions.Empty,

    onMouseMove: function($super, evt) {
        if (!evt.mouseButtonPressed) $super(evt);
    },    

    onMouseUp: function(evt) {
        // I've been clicked on when not on top.  Bring me to the top now
        this.takeHighlight()
        var oldTop = this.world().topSubmorph();
        this.world().addMorphFront(this);
        evt.hand.setMouseFocus(null);
	if(this.targetMorph.takesKeyboardFocus()) evt.hand.setKeyboardFocus(this.targetMorph);
        return true;
    },

    captureMouseEvent: function($super, evt, hasFocus) {
        if (!this.needsToComeForward(evt) && evt.mouseButtonPressed) {
            return $super(evt, hasFocus);
        }
        return this.mouseHandler.handleMouseEvent(evt, this); 
    },

    okToBeGrabbedBy: function(evt) {
        this.takeHighlight();
        return this; 
    },

    takeHighlight: function() {
        // I've been clicked on.  unhighlight old top, and highlight me
        var oldTop = this.world().topWindow();
	if (!oldTop.titleBar) return; // may be too early when in deserialization
        if (oldTop instanceof WindowMorph) oldTop.titleBar.highlight(false);
        this.titleBar.highlight(true);
    },
    // End of window promotion methods----------------

    isShutdown: function() { return this.state === WindowState.Shutdown; },
    
    initiateShutdown: function() {
        if (this.isShutdown()) return;
        this.targetMorph.shutdown(); // shutdown may be prevented ...
        this.remove();
        this.state = WindowState.Shutdown; // no one will ever know...
        return true;
    },
    
    showTargetMorphMenu: function(evt) { 
        var tm = this.targetMorph.morphMenu(evt);
        tm.replaceItemNamed("remove", ["remove", this, 'initiateShutdown']);
        tm.replaceItemNamed("reset rotation", ["reset rotation", this, 'setRotation', 0]);
        tm.replaceItemNamed("reset scaling", ["reset scaling", this, 'setScale', 1]);
        tm.removeItemNamed("duplicate");
        tm.removeItemNamed("turn fisheye on");
        tm.openIn(this.world(), evt.mousePoint, false, this.targetMorph.inspect().truncate()); 
    },

    reshape: function($super, partName, newPoint, handle, lastCall) {
	// Minimum size for reshap should probably be a protoype var
	var r = this.innerBounds().withPartNamed(partName, newPoint);
	var maxPoint = r.withExtent(r.extent().maxPt(pt(100,120))).partNamed(partName);
	$super(partName, maxPoint, handle, lastCall);
    },

    adjustForNewBounds: function ($super) {
        $super();
        if (!this.titleBar || !this.targetMorph) return;
        var titleHeight = this.titleBar.innerBounds().height;
        var bnds = this.innerBounds();
        var newWidth = bnds.width;
        var newHeight = bnds.height;
        this.titleBar.setExtent(pt(newWidth, titleHeight));
        this.titleBar.setPosition(bnds.topLeft());
	if (this.statusBar) {  // DI: this doesn't track reframing...
	    this.statusBar.setPosition(pt(0, this.isCollapsed() ? titleHeight : bnds.height));
	    this.statusBar.setExtent(pt(newWidth, this.statusBar.innerBounds().height));
	}
        if (this.isCollapsed()) return;
	this.targetMorph.setExtent(pt(newWidth, newHeight - titleHeight));
        this.targetMorph.setPosition(bnds.topLeft().addXY(0, titleHeight));
    }

});
   
// every morph should be able to get his window
// e.g. helper texts are created in the window, not in the world
Morph.addMethods({
    // KP: shouldn't this be replaced by Morph.immediateContainer?
    window: function(morph) {
        if(!this.owner) return this;
        return this.owner.window();
    },
});

WindowMorph.addMethods({
    // KP: shouldn't this be replaced by Morph.immediateContainer?
    window: function(morph) {
        return this
    },
});
   
   
WindowMorph.subclass("TabbedPanelMorph", {

    documentation: "Alternative to windows for off-screen content",

    initialize: function($super, targetMorph, headline, location, sideName) {
        // A TabbedPanelMorph is pretty much like a WindowMorph, in that it is intended to 
        // be a container for applications that may frequently want to be put out of the way.
        // With windows, you collapse them to their title bars, with tabbed panels, you
        // click their tab and they retreat to the edge of the screen like a file folder.
        this.sideName = sideName ? sideName : "south";
        $super(targetMorph, headline, location);
        this.applyStyle({fill: null, borderColor: null});
        this.newToTheWorld = true;
        this.setPositions();
        this.moveBy(this.expandedPosition.subPt(this.position()));
        return this;
    },

    setPositions: function() {
        // Compute the nearest collapsed and expanded positions for side tabs
        var wBounds = WorldMorph.current().shape.bounds();
        if (this.sideName == "south") {
            var edgePt = this.position().nearestPointOnLineBetween(wBounds.bottomLeft(), wBounds.bottomRight());
            this.collapsedPosition = edgePt.subPt(this.contentOffset);  // tabPosition
            this.expandedPosition = edgePt.addXY(0,-this.shape.bounds().height);
        }
    },

    makeTitleBar: function(headline, width) {
        return new TitleTabMorph(headline, width, this);
    }

});


Morph.subclass("PieMenuMorph", {

    documentation: "Fabrik-style gesture menus for fast one-button UI",

    initialize: function($super, items, targetMorph, offset) {
        // items is an array of menuItems, each of which is an array of the form
        // [itemName, closure], and
	// itemName has the form 'menu text (pie text)'
	// If offset is zero, the first item extends CW from 12 o'clock
	// If offset is, eg, 0.5, then the first item begins 1/2 a slice-size CCW from there.
        this.items = items;
	this.targetMorph = targetMorph;
	this.r1 = 15;  // inner radius
	this.r2 = 50;  // outer radius
	this.offset = offset;
        $super(new Rectangle(100, 100, this.r2*2, this.r2*2), 'ellipse');
	this.hasCommitted = false;  // Gesture not yet outside commitment radius
	return this;
    },
    helpString: function() {
	var help = "Pie menus let you choose mouse-down actions";
	help += "\nbased on the direction of your stroke.";
	help += "\nIf you hold the button down without moving,";
	help += "\nyou will see a map of the directions and actions.";
	help += "\nThis menu has the same items with words to";
	help += "\nexplain the abbreviated captions in the map.";
	help += "\nRelease in the center to get the normal menu.";
	return help;
    },
    open: function(evt) {
        // Note current mouse position and start a timer
	this.mouseDownPoint = evt.mousePoint;
	this.originalEvent = evt;
	this.setPosition(this.mouseDownPoint.subPt(this.bounds().extent().scaleBy(0.5)));
	var opacity = 0.1;  this.setFillOpacity(opacity);  this.setStrokeOpacity(opacity);
	WorldMorph.current().addMorph(this);
	evt.hand.setMouseFocus(this);
        this.world().scheduleForLater(new SchedulableAction(this, "makeVisible", evt, 0), 300, false);
    },
    onMouseMove: function(evt) {
        // Test for whether we have reached the commitment radius.
	var delta = evt.mousePoint.subPt(this.mouseDownPoint)
	if (delta.dist(pt(0, 0)) < this.r1) return
	// If so dispatch to appropriate action
	this.hasCommitted = true;
	this.remove();
	evt.hand.setMouseFocus(null);
	var n = this.items.length;
	var index = (delta.theta()/(Math.PI*2) + (this.offset/2)) * n;
	index = (index+n).toFixed(0)%n;  // 0..n-1
	var item = this.items[index];
	if (item[1] instanceof Function) item[1](this.originalEvent)
	//	else what?
    },
    onMouseUp: function(evt) {
        // This should only happen inside the commitment radius.
	// If the help disk has not been shown, then show it,
	// otherwise, display the default (normal) menu.
	if (this.hasCommitted) return;  // shouldn't happen
	var world = this.world();
	var menuItems = [
		["pie menu help", function(helpEvt) {
			var helpMenu = new MenuMorph(this.items, this.targetMorph);
			helpMenu.openIn(world, evt.mousePoint, false, this.helpString());
			}.bind(this)],
		["-----"]
		].concat(this.targetMorph.morphMenu(evt).arrayItems());
	var normalMenu = new MenuMorph(menuItems, this.targetMorph);
	this.remove();
	normalMenu.openIn(world, evt.mousePoint, false, Object.inspect(this.targetMorph).truncate());
	evt.hand.setMouseFocus(normalMenu);
    },
    makeVisible: function(openEvent) {
	if (this.hasCommitted) return;
	var opacity = 0.5;
	this.setFillOpacity(opacity);
	this.setStrokeOpacity(opacity);
	// Make an inner circle with 'menu'
	var nItems = this.items.length;
	if(nItems == 0) return;
	for (var i=0; i<nItems; i++) {
		var theta = (((i-this.offset)/nItems)-(1/4))*Math.PI*2;
		var line = Morph.makeLine([Point.polar(this.r1, theta), Point.polar(this.r2, theta)], 1, Color.black);
		line.setStrokeOpacity(opacity);
		this.addMorph(line);
		var labelString = this.items[i][0];
		var x = labelString.indexOf('(');
		if (x < 0) continue
		labelString = labelString.slice(x+1, labelString.length-1);  // drop parens
		var labelPt = Point.polar(this.r2*0.7, theta+(0.5/nItems*Math.PI*2))
		this.addMorph(TextMorph.makeLabel(labelString).centerAt(labelPt));
	}
	this.addMorph(TextMorph.makeLabel("menu").centerAt(pt(0, 0)));
    },
    addHandleTo: function(morph, evt, mode) {
    	var handle = new HandleMorph(evt.mousePoint, 'ellipse', evt.hand, morph, null);
	handle.mode = mode;
	handle.rollover = false;
	morph.addMorph(handle);
	evt.hand.setMouseFocus(handle);
    }
});
Object.extend(PieMenuMorph, {
    setUndo: function(undoFunction) {
    	PieMenuMorph.undoer = undoFunction;
    },
    doUndo: function() {
    	if(PieMenuMorph.undoer) PieMenuMorph.undoer();
	PieMenuMorph.undoer = null;
    }
});

Widget.addMethods({
    
    deserializeModelFromNode: function(importer, node) {    
	// for Fabrik widget deserialization
        console.log(" unserialize node " + node.id)
        if (node.textContent)
            var spec = JSON.unserialize(node.textContent);
        else
            var spec = {};
        var Rec = lively.data.DOMRecord.prototype.create(spec);
        var model = new Rec(importer, node);
        return model;
    },
});


}.logCompletion('loaded Widgets.js')); // end using

