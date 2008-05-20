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

/**
 * @class ButtonMorph
 */ 
Morph.subclass("ButtonMorph", {
    
    documentation: "Simple button",
    focusHaloBorderWidth: 3, // override the default
    borderWidth: 0.3,
    fill: Color.neutral.gray,
    borderColor: Color.neutral.gray,
    label: null,
    
    pins: ["Value"],

    // A ButtonMorph is the simplest widget
    // It read and writes the boolean variable, this.model[this.propertyName]
    initialize: function($super, initialBounds) {
        this.baseFill = null; 

        $super(initialBounds, "rect");
        
        var model = new SyntheticModel(this.pins);
        // this default self connection may get overwritten by, eg, connectModel()...
        this.modelPlug = new ModelPlug(model.makePlugSpec());
        // Styling
        this.setValue(false);
        this.linkToStyles(['button']);
        this.changeAppearanceFor(false);
        this.setToggle(false); // if true each push toggles the model state 
        return this;
    },

    restorePersistentState: function($super, importer) {
        $super(importer);
        this.baseFill = this.fill;
        this.changeAppearanceFor(this.getModelValue('getValue', false));
    },

    getBaseColor: function() {
        if (this.fill instanceof Color) return this.fill;
        else if (this.fill instanceof LinearGradient) return this.fill.stopColor(0);
        else if (this.fill instanceof RadialGradient) return this.fill.stopColor(1);
        else throw new Error('cannot handle fill ' + this.fill);
    },

    // KP: FIXME general way of declaring properties mapping to attributes
    setToggle: function(flag) {
        this.setLivelyTrait("toggle", !!flag);
    },

    isToggle: function() {
        var value = this.getLivelyTrait("toggle");
        if (value && value == 'true') return true;
        else return false;
    },

    handlesMouseDown: function(evt) { return !evt.isCommandKey(); },
    
    onMouseDown: function(evt) {
        this.requestKeyboardFocus(evt.hand);
        if (!this.isToggle()) {
            this.setValue(true); 
            this.changeAppearanceFor(true); 
        } 
    },
    
    onMouseMove: Functions.Empty,

    onMouseUp: function(evt) {
        var newValue = this.isToggle() ? !this.getValue() : false;
        this.setValue(newValue); 
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
        if (p) {
            if (aspect == p.getValue || aspect == 'all') this.changeAppearanceFor(this.getValue());
            return this.getValue();
        }
    },

    getValue: function() {
        if (this.modelPlug) return this.getModelValue('getValue', false);
    },

    setValue: function(value) {
        if (this.modelPlug) this.setModelValue('setValue', value);
    },

    takesKeyboardFocus: Functions.True,          // unlike, eg, cheapMenus
    
    setHasKeyboardFocus: Functions.K, 

    onKeyDown: function(evt) {
        switch (evt.getKeyCode()) {
        case Event.KEY_RETURN:
        case Event.KEY_SPACEBAR:
            this.changeAppearanceFor(true);
            evt.stop();
            return true;
        }
        return false;
    },

    onKeyUp: function(evt) {
        var newValue = this.isToggle() ? !this.getValue() : false;
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
    pins: ["-URL"],
    
    initialize: function($super, viewPort, url) {
        $super(viewPort, "rect");
        this.image = new Image(url, viewPort.width, viewPort.height);
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
    
    updateView: function(aspect, controller) {
        var p = this.modelPlug;
        if (!p) return;
        if (aspect == p.getURL) {
            this.loadFromURL(this.getModelValue('getURL', ""));
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
        this.image.relayMouseEvents(this, {onMouseDown: "onMouseDown", onMouseMove: "onMouseMove", onMouseUp: "onMouseUp"});
    },
    
    changeAppearanceFor: function(value) {
        //console.log('changing on %s from %s to %s', value, this.activatedImageHref, this.normalImageHref);
        this.image.loadFromURL(value ? this.activatedImageHref : this.normalImageHref);
    }
    
});


// ===========================================================================
// Window widgets
// ===========================================================================

Morph.subclass("ClipMorph", {

    documentation: "A clipping window/view",

    fill: null,
    borderWidth: 0,

    deserialize: function($super, importer, rawNode) {
        $super(importer, rawNode);
        this.clipToShape();
    },

    initialize: function($super, initialBounds) {
        $super(initialBounds, "rect");
    
        // A clipMorph is like a window through which its submorphs are seen
        // Its bounds are strictly limited by its shape
        // Display of its submorphs are strictly clipped to its shape, and
        // (optionally) reports of damage from submorphs are also clipped so that,
        // eg, scrolling can be more efficient
        // this.setBorderColor(Color.black);
        // this.setFill(null);
        // this.setBorderWidth(0); 
        this.clipToShape();
        return this;
    },

    defaultOrigin: function(bounds) { 
        return bounds.topLeft(); 
    },
    
    // do not include submorphs in bounds calculations
    submorphBounds: Functions.Null,

    innerMorph: function() {
        this.submorphs.length != 1 && console.log("not a single inner morph");
        return this.submorphs.first();
    }
    
});

Morph.subclass("TitleBarMorph", {

    documentation: "Title bar for WindowMorphs",

    borderWidth: 0.5,
    controlSpacing: 3,
    barHeight: 22,


    initialize: function($super, headline, windowWidth, windowMorph) {
	var bounds = new Rectangle(0, 0, windowWidth, this.barHeight);
        $super(bounds, "rect");
	/*
	var shape = new PathShape();
	var radius = 6;
	shape.moveTo(0, this.barHeight);
	shape.lineTo(0, radius);
	shape.arcTo(radius, 0, radius);
	shape.lineTo(windowWidth - radius, 0);
	shape.arcTo(windowWidth, radius, radius);
	shape.lineTo(windowWidth, this.barHeight);
	shape.lineTo(0, this.barHeight);
	shape.close();
	this.setShape(shape);
*/
        this.windowMorph = windowMorph;
        this.linkToStyles(['titleBar']);
        this.ignoreEvents();

        // Note: Layout of submorphs happens in adjustForNewBounds (q.v.)
        var cell = new Rectangle(0, 0, this.barHeight, this.barHeight);
        var closeButton = new WindowControlMorph(cell, this.controlSpacing, Color.primary.orange, windowMorph, 
            "initiateShutdown", "Close");
        this.closeButton =  this.addMorph(closeButton);
        // FIXME this should be simpler
        // var sign = NodeFactory.create("use").withHref("#CloseIcon");
        // new Similitude(pt(-9, -9), 0, 0.035).applyTo(sign);
        // closeButton.addNonMorph(sign);

        var menuButton = new WindowControlMorph(cell, this.controlSpacing, Color.primary.blue, windowMorph, 
            "showTargetMorphMenu", "Menu");
        this.menuButton = this.addMorph(menuButton);

        var collapseButton = new WindowControlMorph(cell, this.controlSpacing, Color.primary.yellow, windowMorph, 
            "toggleCollapse", "Collapse");
        this.collapseButton = this.addMorph(collapseButton);

        var label;
        if (headline instanceof TextMorph) {
            label = headline;
        } else { // String
            var width = headline.length * 8; // wild guess headlineString.length * 2 *  font.getCharWidth(' ') + 2;
            label = new TextMorph(new Rectangle(0, 0, width, this.barHeight), headline).beLabel();
        }
        label.applyStyle({ borderRadius: 8, padding: Rectangle.inset(6, 3)});
        this.label = this.addMorph(label);
	label.setFill(new LinearGradient([Color.white, 1, Color.gray]));
	
        this.adjustForNewBounds();  // This will align the buttons and label properly
        return this;
    },

    deserialize: function($super, importer, rawNode) {
        $super(importer, rawNode);
        if (LivelyNS.getType(this.rawNode.parentNode) == "WindowMorph") {
            console.log("patching up to " + this.windowMorph);
            this.closeButton.action.actor    = this.windowMorph;
            this.menuButton.action.actor     = this.windowMorph;
            this.collapseButton.action.actor = this.windowMorph;
        }
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
        return this.windowMorph.isCollapsed() ? this : this.windowMorph;
    },

    adjustForNewBounds: function($super) {
        this.shape.setBounds(this.innerBounds().withHeight(this.barHeight));
        $super();
        var loc = this.innerBounds().topLeft().addXY(3, 3);
        var l0 = loc;
        var dx = pt(this.barHeight - this.controlSpacing, 0);
        if (this.menuButton) { this.menuButton.setPosition(loc);  loc = loc.addPt(dx); }
        if (this.collapseButton) { this.collapseButton.setPosition(loc);  loc = loc.addPt(dx); }
        
	
        if (this.label) {
            this.label.align(this.label.bounds().topCenter(),
			     this.innerBounds().topCenter().addXY(0, -1));
            if (this.label.bounds().topLeft().x < loc.x) {
                this.label.align(this.label.bounds().topLeft(), loc.addXY(0,-2));
            }
        }


	if (this.closeButton) { 
	    loc = this.innerBounds().topRight().addXY(-3 -this.closeButton.shape.bounds().width, 3);
	    this.closeButton.setPosition(loc);  
	    // loc = loc.addPt(dx); 
	}

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

    initialize: function($super, rect, inset, color, targetMorph, actionScript, helpText) {
        $super(rect.insetBy(inset), 'ellipse');
        this.setFill(new RadialGradient([color.lighter(2), 1, color, 1, color.darker()], this.focus));
        this.targetMorph = targetMorph;
        // FIXME should be a superclass(?) of SchedulableAction
        this.action = this.addWrapper(new SchedulableAction(targetMorph, actionScript, null, 0));
        this.helpText = helpText; // string to be displayed when mouse is brought over the icon
        return this;
    },

    handlesMouseDown: Functions.True,

    onMouseDown: function($super, evt) {
        $super(evt);
        if (!this.action) {
            console.warn("%s has no action?", this);
            return;
        }
        this.action.argIfAny = evt;
        return this.action.exec();
    },

    onMouseOver: function($super, evt) {
        var prevColor = this.fill.stopColor(1);
        this.setFill(new RadialGradient([Color.white, 1, prevColor, 1, prevColor.darker()], this.focus));
        $super(evt);
    },
    
    onMouseOut: function($super, evt) {
        var prevColor = this.fill.stopColor(1);
        this.setFill(new RadialGradient([prevColor.lighter(2), 1, prevColor, 1, prevColor.darker()], this.focus));
        // this.setFill(new RadialGradient([prevColor.lighter(2), 1, prevColor]));
        $super(evt);
    },
    
    checkForControlPointNear: Functions.False,
    
    okToBeGrabbedBy: Functions.Null,
    
    getHelpText: function() {
        return this.helpText;
    },

    // note that we override a method that normally adds ticking scripts
    addActiveScript: function(action) {
        this.action = action;
    }
 
});

var WindowState = Class.makeEnum(['Expanded', 'Collapsed', 'Shutdown']);

Morph.subclass('WindowMorph', {

    documentation: "Full-fledged windows with title bar, menus, etc.",
    state: WindowState.Expanded,
    titleBar: null,
    targetMorph: null,
    
    initialize: function($super, targetMorph, headline, location) {
        var bounds = targetMorph.bounds().copy();
        var titleBar = this.makeTitleBar(headline, bounds.width);
        var titleHeight = titleBar.bounds().height;

        bounds.height += titleHeight;
        $super(location ? rect(location, bounds.extent()) : bounds, 'rect');
        this.targetMorph = this.addMorph(targetMorph);
        this.titleBar = this.addMorph(titleBar);
        this.contentOffset = pt(0, titleHeight);
        targetMorph.setPosition(this.contentOffset);
        this.linkToStyles(['window']);
        this.closeAllToDnD();
        return this;
    },

    deserialize: function($super, importer, rawNode) {
        $super(importer, rawNode);
        this.titleBar.windowMorph = this;
        this.closeAllToDnD();
    },

    toString: function($super) {
        var label = this.titleBar && this.titleBar.label;
        return $super() + (label ? ": " + label.textString : ""); 
    },

    restorePersistentState: function($super, importer) {
        $super(importer);
        //this.targetMorph = this.targetMorph;
        // this.titleBar = this.titleBar;
        this.contentOffset = pt(0, this.titleBar.bounds().height);
    },
    
    makeTitleBar: function(headline, width) {
        // Overridden in TabbedPanelMorph
        return new TitleBarMorph(headline, width, this);
    },

    windowContent: function() { return this.targetMorph; },
    
    immediateContainer: function() { return this;  },

    toggleCollapse: function() {
        return this.isCollapsed() ? this.expand() : this.collapse();
    },
    
    collapse: function() { 
        if (this.isCollapsed()) return;
	if (Config.useSimpleCollapse) {
	    // won't remember old position
	    this.targetMorph.undisplay();
	    this.shape.setBounds(this.titleBar.bounds());
	    this.layoutChanged();
	} else {
            this.expandedTransform = this.getTransform();
            this.tbTransform = this.titleBar.getTransform();
            var owner = this.owner;
            owner.addMorph(this.titleBar);
            this.titleBar.setTransform(this.collapsedTransform ? this.collapsedTransform : this.expandedTransform);
            this.titleBar.setRotation(this.titleBar.getRotation());  // see comment in HandMorph
            if (this.titleBar.collapsedExtent) this.titleBar.setExtent(this.titleBar.collapsedExtent);
            this.titleBar.enableEvents();
            this.remove();
	}
        this.titleBar.highlight(false);
        this.state = WindowState.Collapsed;
    },
    
    expand: function() {
        if (!this.isCollapsed()) return;
	if (Config.useSimpleCollapse) {
	    this.targetMorph.display();
	    this.shape.setBounds(this.targetMorph.bounds().union(this.titleBar.bounds()));
	    this.layoutChanged();
	} else {
            this.collapsedTransform = this.titleBar.getTransform();
            this.titleBar.collapsedExtent = this.titleBar.innerBounds().extent();
            var owner = this.titleBar.owner;
            owner.addMorph(this);
            this.setTransform(this.expandedTransform);        
            // this.titleBar.remove();  //next statement removes it from prior owner
            this.addMorph(this.titleBar);
            this.titleBar.setTransform(this.tbTransform)
            this.titleBar.setExtent(pt(this.innerBounds().width, this.titleBar.innerBounds().height));
            this.titleBar.setPosition(this.innerBounds().topLeft());
            this.titleBar.ignoreEvents();
	}
        this.takeHighlight();
        this.state = WindowState.Expanded;
    },

    isCollapsed: function() { return this.state === WindowState.Collapsed; },

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
        if (!this.fullContainsWorldPoint(evt.mousePoint)) return false;  // not clicked in me
        if (this === this.world().topSubmorph()) return false;  // already on top
        if (this.isCollapsed()) return false;  // collapsed labels OK from below
        if (this.titleBar.fullContainsWorldPoint(evt.mousePoint)) return false;  // labels OK from below
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
        var oldTop = WorldMorph.current().topWindow();
        if (oldTop) oldTop.titleBar.highlight(false);
        this.titleBar.highlight(true);
    },
    // End of window promotion methods----------------

    isShutdown: function() { return this.state === WindowState.Shutdown; },
    
    initiateShutdown: function() {
        if (this.isShutdown()) return;
        this.targetMorph.shutdown(); // shutdown may be prevented ...
        if (!Config.useSimpleCollapse && this.isCollapsed()) this.titleBar.remove();
        else this.remove();
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

    world: function() {
	// note, the window may be removed from the world and its titlebar only in the world, hence the following: 
	return WorldMorph.current();
	// there should be a better way though.
    },

    adjustForNewBounds: function ($super) {
        $super();
        if (!this.titleBar || !this.targetMorph) return;
        var titleHeight = this.titleBar.innerBounds().height;
        var bnds = this.innerBounds();
        var newWidth = bnds.extent().x;
        var newHeight = bnds.extent().y;
        this.titleBar.setExtent(pt(newWidth, titleHeight));
        this.targetMorph.setExtent(pt(newWidth, newHeight - titleHeight));
        this.titleBar.setPosition(bnds.topLeft());
        this.targetMorph.setPosition(bnds.topLeft().addXY(0, titleHeight));
    }

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
    },
    
    onMouseUp: function(evt) {
        if (!evt.isShiftDown() && !evt.isCommandKey() && !evt.isMetaDown() &&
            // these hack tests should be replaced by receiver tests
            !(this.targetMorph instanceof WindowMorph || this.targetMorph instanceof TitleBarMorph)) {
                // last call for, eg, vertex deletion
                this.targetMorph.reshape(this.partName, this.targetMorph.localize(evt.mousePoint), this, true); 
        }
        this.remove(); 
    },
    
    onMouseMove: function(evt) {
        // When dragged, I also drag the designated control point of my target
        if (!evt.mouseButtonPressed) { 
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
        if (evt.isCommandKey()) {
            // ctrl-drag for rotation (unshifted) and scale (shifted)
            var ctr = this.targetMorph.owner.worldPoint(this.targetMorph.origin);  //origin for rotation and scaling
            var v1 = p1.subPt(ctr); //vector from origin
            var v0 = p0.subPt(ctr); //vector from origin at mousedown
            
            if (evt.isShiftDown()) {
                var ratio = v1.r() / v0.r();
                ratio = Math.max(0.1,Math.min(10,ratio));
                // console.log('set scale to ' + this.initialScale + ' times ' +  ratio);
                this.targetMorph.setScale(this.initialScale*ratio); 
            } else { 
                this.targetMorph.setRotation(this.initialRotation + v1.theta() - v0.theta()); 
            } 
        } else {    // normal drag for reshape (unshifted) and borderWidth (shifted)
            var d = p1.dist(p0); //dist from mousedown
        
            if (evt.isShiftDown()) {
                this.targetMorph.setBorderWidth(Math.max(0, Math.floor(d/3)/2), true);
            } else { 
                this.targetMorph.reshape(this.partName, this.targetMorph.localize(evt.mousePoint), this, false);
            } 
        }
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

    initialize: function($super, viewPort, defaultworldOrNull) {
        $super(viewPort, "rect");
        this.originalPoint = viewPort.topLeft();
        this.reshapeName = "bottomRight";
        this.selectedMorphs = [];
        this.initialSelection = true;
	this.applyStyle(this.style);
        this.myWorld = defaultworldOrNull ? defaultworldOrNull : this.world();
        // this.shape.setStrokeDashArray([3,2]);
        return this;
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
        if (lastCall && this.selectedMorphs.length == 0) this.remove();
    },

    morphMenu: function($super, evt) { 
        var menu = $super(evt);
        menu.removeItemNamed("inspect");
        menu.removeItemNamed("XML");
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
        Class.getSuperPrototype(this).remove.call(this);
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

    // TODO: there MUST be a better way to do this
    // there "might" be some performance issues with this :)
    setRotation: function($super, theta) {
        for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
            this.addMorph(this.selectedMorphs[i]);
        }
        $super(theta);
        for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
            this.world().addMorph(this.selectedMorphs[i]);
        }
    },
    
// TODO: there MUST be a better way to do this.. but it works without a sweat
// there "might" be some performance issues with this :)
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

/**
 * @class PanelMorph
 */
Morph.subclass('PanelMorph', {

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
        var scalePt = newExtent.scaleByPt(this.priorExtent.inverted());
        this.priorExtent = newExtent;
        for (var i= 0; i<this.submorphs.length; i++) {
            var sub = this.submorphs[i];
            var subBnds = sub.innerBounds();
            sub.setPosition(sub.getPosition().scaleByPt(scalePt));
            sub.setExtent(sub.getExtent().scaleByPt(scalePt));
        }
    },

    updateView: function(aspect, controller) {
        var plug = this.modelPlug;
        if (!plug) return;
        
        if (aspect == plug.getVisible || aspect == 'all') {
            var state = this.getModelValue('getVisible', true);
            if (state == false) this.remove();
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
        panel.applyStyle({fill: Color.primary.blue.lighter(2), borderWidth: 2});

        paneSpecs.forEach(function(spec) {
            var paneName = spec[0];
            var paneConstructor = spec[1];
            var paneRect = pt(0,0).extent(extent).scaleByRect(spec[2]);
            panel[paneName] = panel.addMorph(new paneConstructor(paneRect));
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
    wrap: WrapStyle.None,
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

    deserialize: function($super, importer, rawNode) {
        $super(importer, rawNode);
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
            this.undrawSelection();
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
                this.updateList(this.getList());
                return this.itemList; // debugging
            case this.modelPlug.getSelection:
                var selection = this.getSelection();
                if (this !== controller) this.setSelectionToMatch(selection);
                return selection; //debugging
            case this.modelPlug.getDeletionConfirmation: //someone broadcast a deletion
                if (this.getModelValue("getDeletionConfirmation") == true) {
                    // update self to reflect that model changed
                    var index = this.selectedLineNo();
                    var list = this.getList();
                    list.splice(index, 1);
                    this.updateList(list);
                } 
                return null;
            }
        }
    },

    getList: function() {
        if (this.modelPlug) return this.getModelValue('getList', ["-----"]);
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
    pins: ["List", "Capacity", "ListDelta", "Selection", "-DeletionConfirmation", "+DeletionRequest"],
    itemMargin: Rectangle.inset(1), // stylize
    defaultCapacity: 50,
    highlightItemsOnMove: false,
    

    initialize: function($super, initialBounds, itemList, optMargin, optTextStyle) {
        // itemList is an array of strings
        var height = Math.max(initialBounds.height, itemList.length * (TextMorph.prototype.fontSize + this.itemMargin.top() + this.itemMargin.bottom()));
        initialBounds = initialBounds.withHeight(height);
        $super(initialBounds, itemList);
        this.itemList = itemList;
        this.selectedLineNo = -1;
        this.generateSubmorphs(itemList, initialBounds.width, optTextStyle);
        this.alignAll(optMargin);
        var model = new SyntheticModel(this.pins);
        this.modelPlug = new ModelPlug(model.makePlugSpecFromPins(this.pins));
        this.setModelValue('setList', itemList);
        this.savedFill = null; // for selecting items
        return this;
    },

    deserialize: function($super, importer, rawNode) {
        $super(importer, rawNode);
        this.itemList = [];
        for (var i = 0; i < this.submorphs.length; i++ ) {
            var m = this.submorphs[i];
            m.beListItem();
            m.relayMouseEvents(this, {onMouseDown: "onMouseDown", onMouseMove: "onMouseMove"});
           this.itemList.push(m.textString);
        }
        this.setModelValue('setList', this.itemList);
        this.layoutChanged();
    },

    handlesMouseDown: Functions.True,
    
    generateSubmorphs: function(itemList, width, additionalStyling) {
	var rect = pt(width, TextMorph.prototype.fontSize).extentAsRectangle().insetByRect(this.itemMargin);
	for (var i = 0; i < itemList.length; i++)  {
	    var m = new TextMorph(rect, itemList[i]).beListItem();
	    if (additionalStyling) m.applyStyle(additionalStyling);
	    this.addMorph(m);
	    m.relayMouseEvents(this, {onMouseDown: "onMouseDown", onMouseMove: "onMouseMove"});
	}
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
            this.setModelValue("setDeletionRequest", this.itemList[this.selectedLineNo]);
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
        var capacity = this.getModelValue("getCapacity", this.defaultCapacity);
        var priorItem = this.getSelection();
        var removed = this.itemList.length + newItems.length - capacity;
        if (removed > 0) {
            for (var i = 0; i < removed; i++) {
                this.submorphs[0].remove();
            }
            this.itemList = this.itemList.slice(removed);
        }
        this.itemList = this.itemList.concat(newItems);
        this.generateSubmorphs(newItems, this.bounds().width);
        this.alignAll();
        if (this.selectedLineNo + removed >= this.itemList.length - 1) {
            this.selectedLineNo = -1;
        }
        this.resetScrollPane(true);
    },
    
    updateList: function(newList) {
        var priorItem = this.getSelection();
        this.itemList = newList;
        this.removeAllMorphs();
        this.generateSubmorphs(newList, this.bounds().width);
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
    
    updateView: function(aspect, controller) {
        var c = this.modelPlug;
        if (c) { // New style connect
            switch (aspect) {
            case this.modelPlug.getList:
            case 'all':
                this.updateList(this.getList());
                return this.itemList; // debugging

            case this.modelPlug.getListDelta:
                this.appendList(this.getModelValue("getListDelta"));
                // this.setModelValue("setListDelta", []);
                return this.itemList;

            case this.modelPlug.getSelection:
                var selection = this.getSelection();
                console.log("got selection "  + selection);
                this.setSelectionToMatch(selection);
                return selection; //debugging

            case this.modelPlug.getDeletionConfirmation: //someone broadcast a deletion
                if (this.getModelValue("getDeletionConfirmation") == true) {
                    // update self to reflect that model changed
                    var index = this.selectedLineNo;
                    var list = this.getList();
                    list.splice(index, 1);
                    this.updateList(list);
                } 
                return null;
            }
        }
    },

    getList: function() {
        if (this.modelPlug) return this.getModelValue('getList', ["-----"]);
    },

    getSelection: function() {
        if (this.modelPlug) return this.getModelValue('getSelection', null);
    },

    setSelection: function(item) {
        if (this.modelPlug) this.setModelValue('setSelection', item); 
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

Morph.subclass("MenuMorph", {

    listStyle: { 
        borderColor: Color.blue,
        borderWidth: 0.5,
        fill: Color.blue.lighter(5),
        borderRadius: 4, 
        fillOpacity: 0.75, 
        wrapStyle: WrapStyle.Shrink
    },

    textStyle: {
        textColor: Color.blue
    },

    labelStyle: {
        borderRadius: 4, 
        fillOpacity: 0.75, 
        wrapStyle: WrapStyle.Shrink
    },

    suppressHandles: true,
    focusHaloBorderWidth: 0,
    
    initialize: function($super, items, targetMorph) {
        // items is an array of menuItems, each of which is an array of the form
        // [itemName, target, functionName, parameterIfAny]
        // At mouseUp, the call is of the form
        // target.function(parameterOrNull,event,menuItem)
        // Note that the last item is seldom used, but it allows the caller to put
        // additional data at the end of the menuItem, where the receiver can find it.
        // The optional parameter lineList is an array of indices into items.
        // It will cause a line to be displayed below each item so indexed
    
        // It is intended that a menu can also be created incrementally
        // with calls of the form...
        //     var menu = MenuMorph([]);
        //     menu.addItem(nextItem);  // May be several of these
        //     menu.addLine();          // interspersed with these
        //     menu.openIn(world,location,stayUp,captionIfAny);
	
        $super(pt(100, 0).extentAsRectangle(), "rect");
        this.items = items;
        this.targetMorph = targetMorph || this;
        this.listMorph = null;
        this.applyStyle({fill: null, borderWidth: 0, fillOpacity: 0});
    },

    addItem: function(item) { 
        this.items.push(item);
    },

    addLine: function(item) { // Not yet supported
        // The idea is for this to add a real line on top of the text
        this.items.push(['-----']);
    },

    removeItemNamed: function(itemName) {
        // May not remove all if some have same name
        // Does not yet fix up the lines array
        for (var i = 0; i < this.items.length; i++)
            if (this.items[i][0] == itemName)
                this.items.splice(i,1);
    },

    replaceItemNamed: function(itemName, newItem) {
        for (var i = 0; i < this.items.length; i++)
            if (this.items[i][0] == itemName)
                this.items[i] = newItem;
    },

    removeItemsNamed: function(nameList) {
        nameList.forEach(function(n) { this.removeItemNamed(n); }, this);
    },

    keepOnlyItemsNamed: function(nameList) {
        var rejects = [];
        this.items.forEach( function(item) { if (nameList.indexOf(item[0]) < 0) rejects.push(item[0])});
        this.removeItemsNamed(rejects);
    },

    estimateListWidth: function(proto) {
	// estimate with based on some prototypical TextMorph object
	// lame but let's wait to do the right thing until the layout business is complete
	var maxWidth = 0;
	for (var i = 0; i < this.items.length; i++) {
	    if (this.items[i][0].length > maxWidth) maxWidth = this.items[i][0].length;
	}
	return maxWidth*proto.fontSize/2 + proto.padding.left() + proto.padding.right();
    },

    openIn: function(parentMorph, loc, remainOnScreen, captionIfAny) { 
        if (this.items.length == 0) return;

        // Note: on a mouseDown invocation (as from a menu button),
        // mouseFocus should be set immediately before or after this call
        this.stayUp = remainOnScreen; // set true to keep on screen

        parentMorph.addMorphAt(this, loc);
	
	var textList = this.items.map(function(item) { return item[0]; });
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
            label.fitText();
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

        this.listMorph.relayMouseEvents(this, {onMouseUp: "onMouseUp", onMouseMove: "onMouseMove", onMouseDown: "onMouseMove"});
        // Note menu gets mouse focus by default if pop-up.  If you don't want it, you'll have to null it
        if (!remainOnScreen) {
	    var hand = parentMorph.world().firstHand();
	    hand.setMouseFocus(this);
            hand.setKeyboardFocus(this.listMorph);
        }
    },
    
    removeOnEvent: function(evt) {
        this.remove();
        if (evt.hand.mouseFocus === this) {
            evt.hand.setMouseFocus(null);
        }
    },

    onMouseUp: function(evt) {
        // console.log("menu got " + evt);
        var target = this.listMorph.morphToReceiveEvent(evt);
        var index = this.listMorph.submorphs.indexOf(target);
	if (!this.invokeItemAtIndex(evt, index) && !this.stayUp) {
	    evt.hand.setMouseFocus(this); // moved away, don't lose the focus
	    evt.hand.setKeyboardFocus(this.listMorph);
	}
    },

    onMouseDown: function(evt) {
        var target = this.listMorph.morphToReceiveEvent(evt);
        var index = this.listMorph.submorphs.indexOf(target);
        if (!(index in this.items) && !this.stayUp) { 
            this.removeOnEvent(evt);
        }
    },

    onMouseMove: function(evt) {
        evt.hand.setMouseFocus(this);
	evt.hand.setKeyboardFocus(this.listMorph);
        var target = this.listMorph.morphToReceiveEvent(evt);
        var index = this.listMorph.submorphs.indexOf(target);
        this.listMorph.highlightItem(evt, index, false);
    },
    
    invokeItemAtIndex: function(evt, index) {
	if (!(index in this.items)) return false;
        try {
	    this.invokeItem(evt, this.items[index]);
        } finally {
	    if (!this.stayUp) this.removeOnEvent(evt);
        }
	return true;
    },
    
    invokeItem: function(evt, item) {
        if (!item) return;

        if (item[1] instanceof Function) { // alternative style, items ['menu entry', function] pairs
            item[1].call(this.targetMorph || this, evt);
        } else if (item[1] instanceof String || typeof item[1] == 'string') {
            // another alternative style, send a message to the targetMorph's menu target (presumably a view).
            var responder = (this.targetMorph || this).getModelValue("getMenuTarget");
            if (responder)  {
                console.log("menu target is " + responder);
                var func = responder[item[1]];
                if (!func) console.log("didn't find function " + item[1]);
                else func.call(responder, item[2], evt, item);
            } else {
                console.log("no menu target, menu target " + this.targetMorph);
            }
        } else {
            var func = item[1][item[2]];  // target[functionName]
            if (func == null) console.log('Could not find function ' + item[2]);
            // call as target.function(parameterOrNull,event,menuItem)
            else func.call(item[1], item[3], evt, item); 
        }
    }

});

Morph.subclass("SliderMorph", {

    documentation: "Slider/scroll control",
    mss: 8,  // minimum slider size
    pins: ["Value", "SliderExtent"],

    initialize: function($super, initialBounds, scaleIfAny) {
        $super(initialBounds, "rect");
        // this default self connection may get overwritten by, eg, connectModel()...
        var model = new SyntheticModel(this.pins);
        this.modelPlug = new ModelPlug(model.makePlugSpec());
        this.scale = (scaleIfAny == null) ? 1.0 : scaleIfAny;
        var slider = new Morph(new Rectangle(0, 0, this.mss, this.mss), "rect");
        slider.relayMouseEvents(this, {onMouseDown: "sliderPressed", onMouseMove: "sliderMoved", onMouseUp: "sliderReleased"});
        this.slider = this.addMorph(slider);
        this.linkToStyles(['slider']);
        this.adjustForNewBounds(); 
        return this;
    },
    
    restorePersistentState: function($super, importer) {
        $super(importer);
        this.scale = 1.0; // FIXME restore from markup
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
        this.adjustSliderParts()
    },
    
    adjustSliderParts: function($super) {
        // This method adjusts the slider for changes in value as well as geometry
        var val = this.getValue();
        var bnds = this.shape.bounds();
        var ext = this.getSliderExtent();

        if (this.vertical()) { // more vertical...
            var elevPix = Math.max(ext*bnds.height,this.mss); // thickness of elevator in pixels
            var topLeft = pt(0,(bnds.height-elevPix)*val);
            var sliderExt = pt(bnds.width,elevPix); 
        } else { // more horizontal...
            var elevPix = Math.max(ext*bnds.width,this.mss); // thickness of elevator in pixels
            var topLeft = pt((bnds.width-elevPix)*val,0);
            var sliderExt = pt(elevPix,bnds.height); 
        }
    
        this.slider.setBounds(bnds.topLeft().addPt(topLeft).extent(sliderExt)); 

        if (this.fill instanceof LinearGradient) {
            var direction = this.vertical() ? LinearGradient.EastWest : LinearGradient.NorthSouth;
            var baseColor = this.fill.stopColor(1);
            this.fill = new LinearGradient([this.fill.stopColor(0), 1, baseColor], direction);
            this.setFill(this.fill);
            this.slider.setFill(new LinearGradient([baseColor.lighter(), 1, baseColor.darker()], direction));
        } else {
            this.setFill(this.fill);
            this.slider.setFill(this.fill.darker());
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
    
        this.setValue(this.clipValue(newValue));
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
    
        this.setValue(this.clipValue(newValue));
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

    updateView: function(aspect, controller) {
        var p = this.modelPlug;
        if (p) {
            if (aspect == p.getValue || aspect == p.getSliderExtent || aspect == 'all') this.adjustForNewBounds();
            return;
        }
    },

    getValue: function() {
        if (this.modelPlug) return this.getModelValue('getValue', 0) / this.scale;
    },

    setValue: function(value) {
        if (this.modelPlug) this.setModelValue('setValue', value * this.scale);
    },

    getSliderExtent: function() {
        if (this.modelPlug) return this.getModelValue('getSliderExtent', 0.0);
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
        this.adjustForNewBounds();
        this.setValue(this.clipValue(this.getValue() + delta * this.getSliderExtent()));
        evt.stop();
        return true;
    }

});

/**
 * @class ScrollPane
 */ 
Morph.subclass("ScrollPane", {

    borderWidth: 2,
    fill: null,
    scrollBarWidth: 14,

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
        this.scrollBar.connectModel({model: this, 
            getValue: "getScrollPosition", setValue: "setScrollPosition", 
            getSliderExtent: "getVisibleExtent"});

        // suppress handles throughout
        [this, this.clipMorph, morphToClip, this.scrollBar].map(function(m) {m.suppressHandles = true});
        // alert('inner morph is ' + this.innerMorph());

        return this;
    },

    restorePersistentState: function($super, importer) { // FIXME duplication between here and initialize
        $super(importer);
        this.scrollBar && this.scrollBar.connectModel({model: this, 
            getValue: "getScrollPosition", setValue: "setScrollPosition", 
            getSliderExtent: "getVisibleExtent"});
        if (this.menuButton) {
            this.menuButton.relayMouseEvents(this, {onMouseDown: "menuButtonPressed"});
        }
    },

    innerMorph: function() {
        return this.clipMorph.innerMorph();
    },

    connectModel: function(plugSpec) { // connection is mapped to innerMorph
        this.innerMorph().connectModel(plugSpec);
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
	    items.forEach(function(item) {menu.addItems(item); });
	} else {
	    var menu = new MenuMorph(editItems.concat(items), this);
	}
        menu.openIn(this.world(), evt.mousePoint, false); 
    },

    getScrollPosition: function() { 
        var ht = this.innerMorph().bounds().height;
        var slideRoom = ht - this.bounds().height;
        return -this.innerMorph().position().y/slideRoom; 
    },
    
    setScrollPosition: function(scrollPos) { 
        var ht = this.innerMorph().bounds().height;
        var slideRoom = ht - this.bounds().height;
        this.innerMorph().setPosition(pt(this.innerMorph().position().x, -slideRoom*scrollPos)); 
        this.scrollBar.adjustForNewBounds();
        // console.log("setScrollPos  ht = " + ht + ", slideRoom = " + slideRoom + ", scrollPos = " + scrollPos);
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

function newListPane(initialBounds) {
    return new ScrollPane(new CheapListMorph(initialBounds,["-----"]), initialBounds); 
};

function newTextListPane(initialBounds) {
    return new ScrollPane(new TextListMorph(initialBounds, ["-----"]), initialBounds); 
};

function newTextPane(initialBounds, defaultText) {
    return new ScrollPane(new TextMorph(initialBounds, defaultText), initialBounds); 
};

function newPrintPane(initialBounds, defaultText) {
    return new ScrollPane(new PrintMorph(initialBounds, defaultText), initialBounds); 
};

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
    pins: ["+Color"],

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
        var r = this.shape.bounds().insetBy(this.shape.getStrokeWidth());
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
            var r = this.bounds().insetBy(this.shape.getStrokeWidth());
            r = pt(0,0).extent(r.extent());
            var rh2 = r.height/2;
            var wheel = this.colorWheel(r.width+1);
            var relp = r.constrainPt(this.localize(evt.mousePoint).addXY(-2,-2));
            // console.log('mp = ' + Object.inspect(this.localize(evt.mousePoint)) + ' / relp = ' + Object.inspect(relp));
            var selectedColor = this.colorMap(relp.x,relp.y,rh2,wheel);
            this.setModelValue('setColor', selectedColor);
        } 
    }
    
});

ClipMorph.subclass('XenoMorph', {

    documentation: "Contains a foreign object, most likely XHTML",
    borderWidth: 2,
    fill: Color.gray.lighter(),

    initialize: function($super, bounds, url) { 
        $super(bounds, "rect"); 
        this.foRawNode = NodeFactory.createNS(Namespace.SVG, "foreignObject", 
                             {x: bounds.x, y: bounds.y, 
                              width: bounds.width,
                              height: bounds.height });

        var body = this.body = this.foRawNode.appendChild(NodeFactory.createNS(Namespace.XHTML, "body"));
        body.appendChild(document.createTextNode("no content"));
        this.addNonMorph(this.foRawNode);
        this.foRawNode.appendChild(this.body);
	if (!url) return;
	if (!(url instanceof URL)) {
	    url = new URL(Loader.baseURL + "/" + url);
	}
        this.fetchURL(url);
    },

    fetchURL: function(url) {
        var model = new Model();
        var req = new NetRequest({model: this, setResponseXML: "setContent"});//, setResponseText: "setContentText"});
        req.setContentType("text/xml");
        req.get(url);
    },

    setContent: function(doc) {
        this.body.parentNode.replaceChild(document.adoptNode(doc.documentElement), this.body);
    },
    
    setContentText: function(text, mimeType) {
        var parser = new DOMParser();
        var xhtml = parser.parseFromString(text, mimeType || "text/xml");
        var node = xhtml.getElementsByTagName("body")[0];
        this.body.parentNode.replaceChild(document.importNode(node, true), this.body);
    },

    adjustForNewBounds: function($super) {
        $super();
        var bounds = this.shape.bounds();
        this.foRawNode.setAttributeNS(null, "width", bounds.width);
        this.foRawNode.setAttributeNS(null, "height", bounds.height);
    },
    
    test: function(url) {
        url = url || Loader.baseURL + "/sample.xhtml";
        console.log("url is " + url);
        var xeno = new XenoMorph(pt(400,200).extentAsRectangle(), new URL(url));
        WorldMorph.current().addFramedMorph(xeno, url, pt(50,50));
    },
    
    test2: function() {
// var text = '<object width="425" height="355"><param name="movie" value="http://www.youtube.com/v/a0qMe7Z3EYg&hl=en"></param><param name="wmode" value="transparent"></param><embed src="http://www.youtube.com/v/a0qMe7Z3EYg&hl=en" type="application/x-shockwave-flash" wmode="transparent" width="425" height="355"></embed></object>';
        var text = '<xhtml><body><video width="425" height="355" src="http://www.youtube.com/swf/l.swf?video_id=a0qMe7Z3EYg&rel=1" /></body></xhtml>';

        var xeno = new XenoMorph(pt(400,200).extentAsRectangle());
        Object.extend(xeno, NetRequestReporterTrait);
        xeno.setContentText(text, "application/xhtml+xml");
        WorldMorph.current().addFramedMorph(xeno, 'video', pt(50,50));
        return xeno;
    }

});

// most likely deprecated, should use Widget, which is a view.
Model.subclass('WidgetModel', {

    defaultViewExtent: pt(400, 300),
    defaultViewTitle: "Widget",
    defaultViewPosition: pt(50, 50),
    openTriggerVariable: 'all',
    documentation: "Convenience base class for widget models",
    
    viewTitle: function() { // a string or a TextMorph
        return this.defaultViewTitle;
    },

    buildView: function(extent) {
        throw new Error("override me");
    },

    initialViewPosition: function(world, hint) {
        return hint || this.defaultViewPosition;
    },

    initialViewExtent: function(world, hint) {
        return hint || this.defaultViewExtent;
    },
    
    openIn: function(world, loc) {
        var win = 
            world.addFramedMorph(this.buildView(this.initialViewExtent(world)), 
                this.viewTitle(), 
                this.initialViewPosition(world, loc));
        if (this.openTriggerVariable) {
            this.changed(this.openTriggerVariable);
        }
        return win;
    },

    open: function() { // call interactively
        return this.openIn(WorldMorph.current());
    }

});

View.subclass('Widget', { // FIXME remove code duplication

    defaultViewExtent: pt(400, 300),
    defaultViewTitle: "Widget",
    defaultViewPosition: pt(50, 50),
    documentation: "Nonvisual component of a widget",
    
    viewTitle: function() { // a string or a TextMorph
        return this.defaultViewTitle;
    },

    buildView: function(extent, model) {
        throw new Error("override me");
    },

    initialViewPosition: function(world, hint) {
        return hint || this.defaultViewPosition;
    },

    initialViewExtent: function(world, hint) {
        return hint || this.defaultViewExtent;
    },
    
    viewMenu: function(items) {
	// Default function passes through all view items if not overridden by a given application
        return items;
    },
    
    openIn: function(world, loc) {
        var win = 
            world.addFramedMorph(this.buildView(this.initialViewExtent(world), this.getModel()), 
                 this.viewTitle(), 
                 this.initialViewPosition(world, loc));
        return win;
    },

    open: function() { // call interactively
        return this.openIn(WorldMorph.current());
    },

    deserialize: function(importer, modelPlug) {
        this.connectModel(modelPlug);
    }

});

Widget.subclass('Dialog', {
    inset: 10,
    style: { borderColor: Color.blue, borderWidth: 4, borderRadius: 16,
             fill: Color.blue.lighter(), opacity: 0.9},

    initialize: function(plug) {
        if (plug) this.connectModel(plug);
    },

    openIn: function(world, loc) {
        var view = this.buildView(this.initialViewExtent(world), this.getModel());
        world.addMorphAt(view, loc);
        return view;
    }
    
});

Dialog.subclass('ConfirmDialog', {

    pins: ["-Callback", "-Message"],
    defaultViewExtent: pt(300, 90),
    
    defaultCallback: function(result) {
        console.log("Confirmed? " + result);
    },

    setCancel: function(value) {
        if (!value) return;
        this.panel.remove();
        var callback = this.getModelValue("getCallback", this.defaultCallback);
        callback.call(Global, false);
    },
    
    setConfirm: function(value) {
        if (!value) return;
        this.panel.remove();
        var callback = this.getModelValue("getCallback", this.defaultCallback);
        callback.call(Global, true);
    },
    
    buildView: function(extent, model) {
        var panel = new PanelMorph(extent);
        this.panel = panel;
        panel.applyStyle(this.style);

        var r = new Rectangle(this.inset, this.inset, extent.x - 2*this.inset, 30);
        var label = panel.addMorph(new TextMorph(r, this.getModelValue("getMessage")).beLabel());

        var indent = extent.x - 2*70 - 3*this.inset;
        r = new Rectangle(r.x + indent, r.maxY() + this.inset, 70, 30);
        var yesButton = panel.addMorph(new ButtonMorph(r)).setLabel("Yes");

        yesButton.connectModel({model: this, setValue: "setConfirm"});
        r = new Rectangle(r.maxX() + this.inset, r.y, 70, 30);
        var noButton = panel.addMorph(new ButtonMorph(r)).setLabel("No");
        noButton.connectModel({model: this, setValue: "setCancel"});
        return panel;
    }

});

Dialog.subclass('PromptDialog', {

    pins: ["-Message", "-Callback", "Input"],
    defaultViewExtent: pt(300, 130),

    openIn: function($super, world, loc) {
        var view = $super(world, loc);
        world.firstHand().setMouseFocus(view.inputLine);
        world.firstHand().setKeyboardFocus(view.inputLine);
        return view;
    },

    defaultCallback: function(result) {
        console.log("Input " + result);
    },
    
    setCancel: function(value) {
        if (!value) return;
        this.panel.remove();
        var callback = this.getModelValue("getCallback", this.defaultCallback);
        callback.call(Global, null);
    },
    
    setConfirm: function(value) {
        if (!value) return;
        this.panel.remove();
        var callback = this.getModelValue("getCallback", this.defaultCallback);
        callback.call(Global, this.getModelValue("getInput"));
    },

    buildView: function(extent, model) {
        var panel = new PanelMorph(extent);
        this.panel = panel;
        panel.applyStyle(this.style);

        var r = new Rectangle(this.inset, this.inset, extent.x - 2*this.inset, 30);
        var label = panel.addMorph(new TextMorph(r, this.getModelValue("getMessage")).beLabel());

        r = new Rectangle(r.x, r.maxY() + this.inset, r.width, r.height);

        panel.inputLine = panel.addMorph(new TextMorph(r, "").beInputLine());
        panel.inputLine.autoAccept = true;

        panel.inputLine.connectModel({model: this.getModel(), getText: "getInput", setText: "setInput"});

        var indent = extent.x - 2*70 - 3*this.inset;
        r = new Rectangle(r.x + indent, r.maxY() + this.inset, 70, 30);
        var okButton = panel.addMorph(new ButtonMorph(r)).setLabel("OK");

        okButton.connectModel({model: this, setValue: "setConfirm"});
        r = new Rectangle(r.maxX() + this.inset, r.y, 70, 30);
        var cancelButton = panel.addMorph(new ButtonMorph(r)).setLabel("Cancel");
        cancelButton.connectModel({model: this, setValue: "setCancel"});
        return panel;
    }
});

Widget.subclass('ConsoleWidget', {

    defaultViewTitle: "Console",
    pins: ["LogMessages", "RecentLogMessages", "Commands", "CommandCursor", "LastCommand", "Menu"],
    ctx: {},
    
    initialize: function($super, capacity) {
        $super(null);
        var model = new SyntheticModel(this.pins);
        this.connectModel(model.makePlugSpecFromPins(this.pins));
        model.setCommands([]);
        model.setLogMessages([]);
        model.setCommandCursor(0);
        model.getLogMessageCapacity = function() { return capacity; }
        model.Menu = [["command history", this, "addCommandHistoryInspector"] ];
        Global.console.consumers.push(this);
        this.ans = undefined; // last computed value
        return this;
    },
    
    addCommandHistoryInspector: function() {
        var extent = pt(500, 40);
        var commands = this.getModelValue("getCommands", []).join('\n');
        var rect = extent.extentAsRectangle();
        var pane = new ScrollPane(new TextMorph(rect, commands), rect); 
        var world = WorldMorph.current();
        world.addFramedMorph(pane, "Command history", world.positionForNewMorph());
    },

    initialViewPosition: function(world, hint) {
        return hint || pt(0, world.viewport().y - 200);
    },

    initialViewExtent: function(world, hint) {
        return hint || pt(world.viewport().width, 160); 
    },
    
    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['messagePane', newTextListPane, new Rectangle(0, 0, 1, 0.8)],
            ['commandLine', TextMorph, new Rectangle(0, 0.8, 1, 0.2)]
        ]);

        var model = this.getModel();
        var m = panel.messagePane;
        m.connectModel({model: model, getList: "getLogMessages", getListDelta: "getRecentLogMessages", 
                        getCapacity: "getLogMessageCapacity", getMenu: "getMenu"});
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
        m.connectModel({model: model, 
                        getHistory: "getCommands", 
                        getHistoryCursor: "getCommandCursor", setHistoryCursor: "setCommandCursor",
                        setText: "setLastCommand", getText: "getLastCommand"});
        return panel;
    },

    updateView: function(aspect, source) {
        var p = this.modelPlug;
        if (!p) return;
        switch (aspect) {
        case p.getLastCommand:
            this.evalCommand(this.getModelValue("getLastCommand"));
            break;
        }
    },

    evaluate: interactiveEval.bind(this.ctx),

    evalCommand: function(text) {
        if (!text) return;
        try {
            var ans = this.evaluate(text);
            if (ans !== undefined) {
                this.ans = ans;
                this.log(ans !== undefined && ans !== null && ans.toString());
            }
            this.setModelValue("setLastCommand", "");
        } catch (er) {
            console.log("Evaluation error: "  + er);
        }
    },
    
    log: function(message) {
        this.setModelValue("setRecentLogMessages", [message]);
    }
    
});

console.log('loaded Widgets.js');

