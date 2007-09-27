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
 * @class ButtonMorph: Simple buttons
 */ 

ButtonMorph = HostClass.create('ButtonMorph', Morph);

Object.category(ButtonMorph.prototype, "core", function() { return {

    focusHaloBorderWidth: 3, // override the default
    defaultBorderWidth: 0.3,
    defaultFill: Color.neutral.gray,
    defaultBorderColor: Color.neutral.gray,
    defaultEdgeRoundingRadius: 4,

    baseColor: Color.neutral.gray, // KP: stopgap fix for serialization??

    // A ButtonMorph is the simplest widget
    // It read and writes the boolean variable, this.model[this.propertyName]
    initialize: function(initialBounds) {
        ButtonMorph.superClass.initialize.call(this, initialBounds, "rect");
        
        var model = new SimpleModel(this, "Value");
        // this default self connection may get overwritten by, eg, connectModel()...
        this.modelPlug = this.addChildElement(model.makePlug());

        // Styling
        this.setModelValue('setValue', false);
        this.changeAppearanceFor(false);
        this.setToggle(false); // if true each push toggles the model state 
        return this;
    },

    initializeTransientState: function(initialBounds) {
        ButtonMorph.superClass.initializeTransientState.call(this, initialBounds);
        // FIXME make persistent
        this.baseColor = this.defaultFill;
        this.linkToStyles(['button']);
    },

    restorePersistentState: function(importer) {
        ButtonMorph.superClass.restorePersistentState.call(this, importer);
        this.changeAppearanceFor(this.getModelValue('getValue', false));
    },

    // KP: FIXME general way of declaring properties mapping to attributes
    setToggle: function(flag) {
        this.setAttributeNS(Namespace.LIVELY, "toggle", !!flag);
    },

    isToggle: function() {
        var value = this.getAttributeNS(Namespace.LIVELY, "toggle");
        if (value && value == 'true') return true;
        else return false;
    },

    handlesMouseDown: function(evt) { return !evt.altKey; },
    
    onMouseDown: function(evt) {
        this.requestKeyboardFocus(evt.hand);
        if (!this.isToggle()) {
            this.setValue(true); 
            this.changeAppearanceFor(true); 
        } 
    },
    
    onMouseMove: function(evt) { },

    onMouseUp: function(evt) {
        var newValue = this.isToggle() ? !this.getValue() : false;
        this.setValue(newValue); 
        this.changeAppearanceFor(newValue); 
    },
    
    changeAppearanceFor: function(value) {
        var base = value ? this.baseColor : this.baseColor.darker();
        switch (this.fillType) {
        case "linear gradient" :
            this.setFill(LinearGradient.makeGradient(base, base.lighter(), LinearGradient.SouthNorth));
            break;
        case "radial gradient" :
            this.setFill(RadialGradient.makeCenteredGradient(base.lighter(), base));
            break;
        default:
            this.setFill(base);
        }
    },

    applyStyle: function(spec) {
        ButtonMorph.superClass.applyStyle.call(this,spec);
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

    takesKeyboardFocus: function() { 
        // unlike, eg, cheapMenus
        return true; 
    },
    
    setHasKeyboardFocus: function(newSetting) { 
        return newSetting; // no need to remember
    },

    onKeyDown: function(evt) {
        switch (evt.sanitizedKeyCode()) {
        case Event.KEY_ENTER:
        case Event.KEY_SPACEBAR:
            this.changeAppearanceFor(true);
            evt.stop();
            return true;
        }
        return false;
    },

    onKeyUp: function(evt) {
        var newValue = this.isToggle() ? !this.getValue() : false;
        switch (evt.sanitizedKeyCode()) {
        case Event.KEY_ENTER:
        case Event.KEY_SPACEBAR:
            this.changeAppearanceFor(newValue);
            this.setValue(newValue);
            evt.stop();
            return true;
        }
        return false;
    }

}});

/**
 * @class ImageMorph: Simple images
 */

ImageMorph = HostClass.create('ImageMorph', Morph);

Object.extend(ImageMorph.prototype, {
    
    defaultFill: Color.blue.lighter(),
    defaultBorderWidth: 0,
   
    initialize: function(viewPort, url) {
        ImageMorph.superClass.initialize.call(this, viewPort, "rect");
        this.url = url;
        this.dim = viewPort.extent();
        if (url) { 
            this.loadURL(url);
        }
    },

    restoreFromElement: function(element, importer) /*:Boolean*/ {
        if (TextMorph.superClass.restoreFromElement.call(this, element, importer)) return true;

        var type = DisplayObject.prototype.getType.call(element);

        switch (type) {
        case 'Image':
            var image = element;
            if (image.namespaceURI != Namespace.SVG) {
                // this brittle and annoying piece of code is a workaround around the likely brokenness
                // of Safari's XMLSerializer's handling of namespaces
                this.removeChild(image);
                this.dim = pt(parseInt(image.getAttribute("width")), parseInt(image.getAttribute("height")));
                var href = image.getAttributeNS(null /* "xlink"*/, "href");
                this.loadURL(href);
            } else {
                this.image = image;
            }
            return true;
        default:
            return false;
        }
    },

    loadGraphics: function(localURL, scale) {
        if (this.image && this.image.tagName == 'image') {
            this.removeChild(this.image);
            this.image = null;
        }

        this.setFill(null);
        var image = this.image = NodeFactory.create("use").withHref(localURL);
        image.setType('Image');
        if (scale) {
            image.applyTransform(Transform.createSimilitude(pt(0, 0), 0, scale));
        }
        this.addChildElement(image);

    },

    loadURL: function(url) {
        if (this.image && this.image.tagName != 'image') {
            this.removeChild(this.image);
            this.image = null;
        }

        if (!this.image) {
            var image = this.image = NodeFactory.create("image", { width: this.dim.x, height: this.dim.y});
            image.setType('Image');
            image.disableBrowserDrag();
            this.addChildElement(image);
        }

        this.image.withHref(url);
    },

    reload: function() {
        if (this.url) {
            this.url = this.url + "?" + new Date();
            this.loadURL(this.url);
        }
    },

    updateView: function(aspect, controller) {
        var p = this.modelPlug;
        if (!p) return;
        if (aspect == p.getURL) {
            this.loadURL(this.getModelValue('getURL', ""));
        }
    }

});

/**
 * @class ImageButtonMorph: Buttons with images
 */ 

ImageButtonMorph = HostClass.create('ImageButtonMorph', ButtonMorph);

Object.extend(ImageButtonMorph.prototype, {

    initialize: function(initialBounds, normalImageHref, activatedImageHref) {
        this.image = ImageMorph(Rectangle(0, 0, initialBounds.width, initialBounds.height), normalImageHref);
        this.normalImageHref = normalImageHref;
        this.activatedImageHref = activatedImageHref;
        ImageButtonMorph.superClass.initialize.call(this, initialBounds);
        this.addMorph(this.image);
        this.image.handlesMouseDown = function() { return true; }
        this.image.relayMouseEvents(this, {onMouseDown: "onMouseDown", onMouseMove: "onMouseMove", onMouseUp: "onMouseUp"});
    },
    
    changeAppearanceFor: function(value) {
        //console.log('changing on %s from %s to %s', value, this.activatedImageHref, this.normalImageHref);
        if (value) this.image.loadURL(this.activatedImageHref);
        else this.image.loadURL(this.normalImageHref);
    }
    
});

/**
 * @class IconMorph: Simple icons
 */

IconMorph = HostClass.create('IconMorph', ImageMorph);

Object.extend(IconMorph.prototype, {

    initialize: function(viewPort, url, name, targetUrl) {
        IconMorph.superClass.initialize.call(this, viewPort, url);
        this.label = new TextMorph(Rectangle(viewPort.width, viewPort.height/3, 100, 30), name).beLabel();
        this.target = targetUrl;
        this.label.setFill(Color.white);
        this.addMorph(this.label);
        return this;
    },
    
    okToBeGrabbedBy: function(evt) { // TODO fix the same movement problem as in linkmorph
        this.open(); 
        return null; 
    },

    open: function () {
        window.open(this.target);
    }

});

// ===========================================================================
// Window widgets
// ===========================================================================

/**
 * @class ClipMorph: A clipping window/view
 */
ClipMorph = HostClass.create('ClipMorph', Morph);

Object.extend(ClipMorph.prototype, {

    defaultFill: null,
    defaultBorderWidth: 0,

    initialize: function(initialBounds) {
        ClipMorph.superClass.initialize.call(this, initialBounds, "rect");
    
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

    bounds: function() {
        if (this.fullBounds != null) return this.fullBounds;
        this.fullBounds = this.retrieveTransform().transformRectToRect(this.shape.bounds());
    
        if (/polyline|polygon/.test(this.shape.getType())) {
            // double border margin for polylines to account for elbow protrusions
            this.fullBounds.expandBy(this.shape.getStrokeWidth()*2);
        } else {
            this.fullBounds.expandBy(this.shape.getStrokeWidth());
        }
        
        // same copy&pasete from Morph but not including the submorphs
        
        if (this.fullBounds.width < 3 || this.fullBounds.height < 3) {
            // Prevent horizontal or vertical lines from being ungrabbable
            this.fullBounds = this.fullBounds.expandBy(3); 
        }
        
        if (this.drawBounds) this.updateBoundsElement();
    
        return this.fullBounds; 
    }
    
});

/**
 * @class TitleBarMorph: Title bars for Window morphs
 */
  
TitleBarMorph = HostClass.create('TitleBarMorph', Morph);

Object.extend(TitleBarMorph.prototype, {
    // prototype variables
    barHeight: 22,
    controlSpacing: 3,
    defaultBorderWidth: 0.5,

    initialize: function(headline, windowWidth, windowMorph, isExternal) {
        this.windowMorph = windowMorph;
        const bh = this.barHeight;
        const spacing = this.controlSpacing;
        TitleBarMorph.superClass.initialize.call(this, Rectangle(0, isExternal? - bh : 0, 
                                                 windowWidth, bh), "rect");
        this.linkToStyles(['titleBar']);
        this.ignoreEvents();

        var cell = Rectangle(0, 0, bh, bh);
        var closeButton = WindowControlMorph(cell, spacing, Color.primary.orange, windowMorph, 
            function() { this.initiateShutdown(); }, "Close");
        this.addMorph(closeButton);

        // FIXME this should be simpler
        // var sign = NodeFactory.create("use").withHref("#CloseIcon");

        // sign.applyTransform(Transform.createSimilitude(pt(-9, -9), 0, 0.035));
        // closeButton.addChildElement(sign);

        cell = cell.translatedBy(pt(bh - spacing, 0));
        var menuButton = WindowControlMorph(cell, spacing, Color.primary.blue, windowMorph, 
            function(evt) { windowMorph.showTargetMorphMenu(evt); }, "Menu");
        this.addMorph(menuButton);

        // uncomment for extra icon fun
        /*
        sign = NodeFactory.create("use").withHref("#GearIcon");
        sign.setAttributeNS(null, 'transform', 'translate(-10, -10) scale(0.040)');
        menuButton.addChildElement(sign);
        */
        
        cell = cell.translatedBy(pt(bh - spacing, 0));
        var collapseButton = WindowControlMorph(cell, spacing, Color.primary.yellow, windowMorph, 
            function() { this.toggleCollapse(); }, "Collapse");
        this.addMorph(collapseButton);

        // var font = Font.forFamily(TextMorph.prototype.fontFamily, TextMorph.prototype.fontSize);

        if (headline instanceof TextMorph) {
            this.label = headline;
        } else { // String
            var width = headline.length * 8; // wild guess headlineString.length * 2 *  font.getCharWidth(' ') + 2;
            this.label = TextMorph(Rectangle(0, 0, width, bh), headline).beLabel();
	    this.label.shape.roundEdgesBy(8);
        }

        this.label.align(this.label.bounds().topCenter(), this.shape.bounds().topCenter().addXY(0,1));
        this.label.ignoreEvents();
        this.addMorph(this.label);
        return this;
    },

    acceptsDropping: function(morph) {
        //console.log('accept drop from %s of %s, %s', this, morph, morph instanceof WindowControlMorph);
        return morph instanceof WindowControlMorph; // not used yet... how about text...
    },

    highlight: function(trueForLight) {
        if (trueForLight) this.label.setFill(Color.white);
	else this.label.setFill(null);
    },

    okToBeGrabbedBy: function(evt) {
        return this.windowMorph.isCollapsed() ? this : this.windowMorph;
    },

    okToDuplicate: function(evt) {
	return false;
    }

});

/**
 * @class TitleTabMorph: Title bars for Window morphs
 */
  
TitleTabMorph = HostClass.create('TitleTabMorph', TitleBarMorph);

Object.extend(TitleTabMorph.prototype, {

    initialize: function(headline, windowWidth, windowMorph, isExternal) {
        this.windowMorph = windowMorph;
        const bh = this.barHeight;
        const spacing = this.controlSpacing;
        TitleBarMorph.superClass.initialize.call(this, Rectangle(0, isExternal? - bh : 0, 
                                                 windowWidth, bh), "rect");
        this.linkToStyles(['titleBar']);
        this.ignoreEvents();

        var cell = Rectangle(0, 0, bh, bh);
        var menuButton = WindowControlMorph(cell, spacing, Color.primary.blue, windowMorph, 
            function(evt) { windowMorph.showTargetMorphMenu(evt); }, "Menu");
        this.addMorph(menuButton);
        
        // Collapse button is retained only while we get things going...
        cell = cell.translatedBy(pt(bh - spacing, 0));
        var collapseButton = WindowControlMorph(cell, spacing, Color.primary.yellow, windowMorph, 
            function() { this.toggleCollapse(); }, "Collapse");
        this.addMorph(collapseButton);

        var label;
        if (headline instanceof TextMorph) {
            label = headline;
        } else { // String
            var width = headline.length * 8;
            // wild guess headlineString.length * 2 *  font.getCharWidth(' ') + 2; 
            label = TextMorph(Rectangle(0, 0, width, bh), headline).beLabel();
        }
        var topY = this.shape.bounds().y;
        label.align(label.bounds().topLeft(), cell.topRight());
        this.addMorph(label);
        this.shape.setBounds(this.shape.bounds().withTopRight(pt(label.bounds().maxX(), topY)))
        this.suppressHandles = true;
        return this;
    },

    okToBeGrabbedBy: function(evt) {
        return this;
    },

    handlesMouseDown: function() { return true; },

    onMouseDown: function(evt) {
    },

    onMouseUp: function(evt) {
        this.windowMorph.toggleCollapse();
    }

});

/**
 * @class WindowControlMorph: Event handling for Window morphs
 * Transient?
 */ 

WindowControlMorph = HostClass.create('WindowControlMorph', Morph);

Object.extend(WindowControlMorph.prototype, {

    defaultBorderWidth: 0,

    initialize: function(rect, inset, color, target, action, helpText) {
        WindowControlMorph.superClass.initialize.call(this, rect.insetBy(inset), 'ellipse');
        this.setFill(RadialGradient.makeCenteredGradient(color.lighter(2), color));
        this.target = target;
        this.action = action;
        this.color = color;
        this.helpText = helpText; // string to be displayed when mouse is brought over the icon
        return this;
    },

    handlesMouseDown: function() { return true; },

    onMouseDown: function(evt) {
        this.hideHelp();
        return this.action.call(this.target, evt);
    },

    onMouseOver: function(evt) {
        this.setFill(RadialGradient.makeCenteredGradient(Color.white, this.color));
        if (this.helpText && !this.helpOpen) {
            this.showHelp(evt);
        }
    },
    
    onMouseOut: function(evt) {
        this.setFill(RadialGradient.makeCenteredGradient(this.color.lighter(2), this.color));
        this.hideHelp();
    },
    
    onMouseMove: function(evt) {
        // really want onMouseLeave
        //console.log('got event %s', evt);
    },
    
    checkForControlPointNear: function() { return false; },
    
    okToBeGrabbedBy: function() { return this.isDesignMode() ? this : null; },
    
    showHelp: function(evt) {
        if (Config.suppressBalloonHelp) return;  // DI: maybe settable in window menu?
        this.helpOpen = true;
        // FIXME: The size of the balloon should be calculated based on string size
        if ( !this.help ) {
            this.help = TextMorph(Rectangle(evt.x, evt.y, 80, 20), this.helpText);
            this.help.relayMouseEvents(this, {onMouseDown: "onMouseDown", onMouseMove: "onMouseMove", onMouseUp: "onMouseUp"});
            // some eye candy for the help
            this.help.shape.roundEdgesBy(15);
            this.help.setFill(Color.primary.yellow.lighter(3));
            this.help.shape.setFillOpacity(0.8);
        } else if ( this.help.position() != pt(evt.x, evt.y) ) {
            this.help.setPosition(pt(evt.x, evt.y));
        }
        // trying to relay mouse events to the WindowControlMorph
        this.world().addMorph(this.help);
    },
    
    hideHelp: function() {
        if (this.help) {this.help.remove(); this.helpOpen = false;}
    },
    
    setHelpText: function ( newText ) {
        this.helpText = newText;
    }
    
});

/**
 * @class WindowMorph: Full-fledged windows with title bar, etc.
 */
WindowMorph = HostClass.create('WindowMorph', Morph);

Object.extend(WindowMorph.prototype, {

    state: "expanded",
    titleBar: null,
    targetMorph: null,
    
    initialize: function(targetMorph, headline, location) {
        var bounds = targetMorph.bounds().clone();
        var titleBar = this.makeTitleBar(headline, bounds.width);
        var titleHeight = titleBar.bounds().height;

        bounds.height += titleHeight;
        WindowMorph.superClass.initialize.call(this, location ? rect(location, bounds.extent()) : bounds, 'rect');
        this.targetMorph = targetMorph;
        this.titleBar = titleBar;
        this.addMorph(this.titleBar);
        this.addMorph(targetMorph);
        this.contentOffset = pt(0, titleHeight);
        targetMorph.setPosition(this.contentOffset);
        this.linkToStyles(['window']);
        this.closeAllToDnD();
        return this;
    },

    makeTitleBar: function(headline, width) {
        // Overridden in TabbedPanelMorph
        return TitleBarMorph(headline, width, this, false);
    },

    windowContent: function() { return this.targetMorph; },
    
    immediateContainer: function() { return this;  },

    toggleCollapse: function() {
        return this.isCollapsed() ? this.expand() : this.collapse();
    },
    
    collapse: function() { 
        if (this.isCollapsed()) return;
        this.expandedTransform = this.getTransform();
        this.tbTransform = this.titleBar.getTransform();
        var owner = this.owner();
        var titleTransform = this.titleBar.cumulativeTransform();
        owner.addMorph(this.titleBar);
        this.titleBar.setTransform(this.collapsedTransform ? this.collapsedTransform : this.expandedTransform);
        this.titleBar.setRotation(this.titleBar.getRotation());  // see comment in HandMorph
        this.titleBar.enableEvents();
        this.remove();
        this.state = "collapsed";
    },
    
    expand: function() {
        if (!this.isCollapsed()) return;
        this.collapsedTransform = this.titleBar.getTransform();
        var owner = this.titleBar.owner();
        owner.addMorph(this);
        this.setTransform(this.expandedTransform);        
        this.titleBar.remove();
        this.addMorph(this.titleBar);
        this.titleBar.setTransform(this.tbTransform)
        this.titleBar.ignoreEvents();
        this.state = "expanded";
    },

    isCollapsed: function() { return this.state == "collapsed"; },

    //Following methods promote windows on first click----------------
    morphToGrabOrReceive: function(evt, droppingMorph, checkForDnD) {
	// If this window is doesn't need to come forward, then respond normally
	if (!this.needsToComeForward(evt)) {
	    return WindowMorph.superClass.morphToGrabOrReceive.call(this, evt, droppingMorph, checkForDnD)
	}
	// Otherwise, hold mouse focus until mouseUp brings it to the top
	return this;
    },

    needsToComeForward: function(evt) {
	if (!this.fullContainsWorldPoint(evt.mousePoint)) return false;  // not clicked in me
	if (this === this.world().topSubmorph()) return false;  // already on top
	if (this.isCollapsed()) return false;  // collapsed labels OK from below
	if (this.titleBar.fullContainsWorldPoint(evt.mousePoint)) return false;  // labels OK from below
	return true;  // it's in my content area
    },
	
    // Next four methods hold onto control until mouseUp brings the window forward.
    handlesMouseDown: function(evt) { return this.needsToComeForward(evt); },

    onMouseDown: function(evt) { },

    onMouseMove: function(evt) {
	if(!evt.mouseButtonPressed) WindowMorph.superClass.onMouseMove.call(this, evt);
	},    

    onMouseUp: function(evt) {
	// I've been clicked on when not on top.  Bring me to the top now
	var oldTop = this.world().topSubmorph();
	if(oldTop instanceof WindowMorph) oldTop.titleBar.highlight(false);
	this.world().addMorphFront(this);
	evt.hand.setMouseFocus(null);
	this.titleBar.highlight(true);
	return true;
    },

    mouseEvent: function(evt, hasFocus) {
	if (!this.needsToComeForward(evt)) {
	    return WindowMorph.superClass.mouseEvent.call(this, evt, hasFocus)
	}
        return this.mouseHandler.handleMouseEvent(evt, this); 
    },
    //End of window promotion methods----------------

    isShutdown: function() { return this.state == "shutdown"; },

    initiateShutdown: function() {
        if (this.isShutdown()) return;
        this.targetMorph.shutdown(); // shutdown may be prevented ...
        if (this.isCollapsed()) this.titleBar.remove();
        else this.remove();
        this.state = "shutdown"; // no one will ever know...
        return true;
    },
    
    showTargetMorphMenu: function(evt) { 
        var tm = this.targetMorph.morphMenu(evt);
        tm.replaceItemNamed("remove", ["remove", this, 'initiateShutdown']);
        tm.replaceItemNamed("reset rotation", ["reset rotation", this, 'setRotation', 0]);
        tm.replaceItemNamed("reset scaling", ["reset scaling", this, 'setScale', 1]);
        tm.removeItemNamed("duplicate");
        tm.removeItemNamed("turn fisheye on");
        tm.openIn(WorldMorph.current(), evt.mousePoint, false, this.targetMorph.inspect().truncate()); 
    },

    updateView: function(aspect, controller) {
        var plug = this.modelPlug;
        if (!plug) return;
        
        if (aspect == plug.getState) {
            //this.loadURL(this.getModelValue('getURL', ""));
            var state = this.getModelValue('getState', "");
            switch (state) {
            case "expanded":
                this.expand();  break;
            case "collapsed":
                this.collapse();  break;
            case "shutdown":
                this.initiateShutdown();  break;
            }
        }
    }

});
   
/**
 * @class TabbedPanelMorph: Alternative to windows for off-screen content
 */
  
TabbedPanelMorph = HostClass.create('TabbedPanelMorph', WindowMorph);

Object.extend(TabbedPanelMorph.prototype, {

    initialize: function(targetMorph, headline, location, sideName) {
        // A TabbedPanelMorph is pretty much like a WindowMorph, in that it is intended to 
        // be a container for applications that may frequently want to be put out of the way.
        // With windows, you collapse them to their title bars, with tabbed panels, you
        // click their tab and they retreat to the edge of the screen like a file folder.
        this.sideName = sideName ? sideName : "south";
        TabbedPanelMorph.superClass.initialize.call(this, targetMorph, headline, location);
        this.setFill(null);
        this.setBorderColor(null);
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
        return TitleTabMorph(headline, width, this, false);
    }

});
   
// ===========================================================================
// Handles and selection widgets
// ===========================================================================

/**
 * @class HandleMorph
 * HandleMorphs are small rectangular objects that are displayed
 * whenever there is a chance to manipulate the shape of the current
 * object, e.g., to resize, re-scale, or rotate it.  
 */ 

HandleMorph = HostClass.create('HandleMorph', Morph);

Object.extend(HandleMorph, {
    // Counter for displaying balloon help only a certain number of times
    helpCounter: 0,
});

Object.extend(HandleMorph.prototype, {

    defaultFill: null,
    defaultBorderColor: Color.blue,
    defaultBorderWidth: 1,

    controlHelpText: "Drag to resize this morph\n" + 
        "Cmd+shift+drag to scale the morph \n" + 
        "Shift+drag to change border width \n" + 
        "Cmd+drag to rotate the morph \n",
    circleHelpText: "Drag to reshape the line\n" + 
        "Cmd+shift+drag to scale the morph\n" + 
        "Shift+drag to change border width\n" + 
        "Cmd+drag to rotate the morph",

    initialize: function(location, shapeType, hand, targetMorph, partName) {
        HandleMorph.superClass.initialize.call(this, location.asRectangle().expandBy(5), shapeType);
        this.targetMorph = targetMorph;
        this.partName = partName; // may be a name like "topRight" or a vertex index
        this.initialScale = null;
        this.initialRotation = null; 
        return this;
    },

    showHelp: function(evt) {
        if (Config.suppressBalloonHelp) return;  // DI: maybe settable in window menu?
        // Show the balloon help only if it hasn't been shown too many times already
        if (HandleMorph.helpCounter < 20) {
            HandleMorph.helpCounter++;
            if (this.shape.getType() == "rect") {
                this.help = TextMorph(Rectangle(evt.x, evt.y, 200, 20), this.controlHelpText);
            } else {
                this.help = TextMorph(Rectangle(evt.x, evt.y, 200, 20), this.circleHelpText);
            }
            // trying to relay mouse events to the WindowControlMorph
            this.help.relayMouseEvents(this, {onMouseDown: "onMouseDown", onMouseMove: "onMouseMove", onMouseUp: "onMouseUp"});
            // some eye candy for the help
            this.help.shape.roundEdgesBy(15);
            this.help.setFill(Color.primary.yellow.lighter(3));
            this.help.shape.setFillOpacity(.8);
            this.world().addMorph(this.help);
        }
    },
    
    hideHelp: function() {
        if (this.help) this.help.remove();
    },
    
    setHelpText: function ( newText ) {
        this.helpText = newText;
    },

    okToDuplicate: function(evt) {
        return false;
    },

    onMouseDown: function(evt) {
        this.hideHelp();
    },
    
    onMouseUp: function(evt) {
        if (!evt.shiftKey && !evt.altKey && !evt.cmdKey &&
            // these hack tests should be replaced by receiver tests
            !(this.targetMorph.getType() == "WindowMorph" || this.targetMorph.getType() == "TitleBarMorph")) {
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
        this.align(this.bounds().center(), this.owner().localize(evt.mousePoint));

        var p0 = evt.hand.lastMouseDownPoint; // in world coords
        var p1 = evt.mousePoint;
        if (!this.initialScale) this.initialScale = this.targetMorph.getScale();
        if (!this.initialRotation) this.initialRotation = this.targetMorph.getRotation();
        if (evt.altKey) {
            // ctrl-drag for rotation (unshifted) and scale (shifted)
            var ctr = this.targetMorph.owner().worldPoint(this.targetMorph.origin);  //origin for rotation and scaling
            var v1 = p1.subPt(ctr); //vector from origin
            var v0 = p0.subPt(ctr); //vector from origin at mousedown
            
            if (evt.shiftKey) {
                var ratio = v1.r() / v0.r();
                ratio = Math.max(0.1,Math.min(10,ratio));
                // console.log('set scale to ' + this.initialScale + ' times ' +  ratio);
                this.targetMorph.setScale(this.initialScale*ratio); 
            } else { 
                this.targetMorph.setRotation(this.initialRotation + v1.theta() - v0.theta()); 
            } 
        } else {    // normal drag for reshape (unshifted) and borderWidth (shifted)
            var d = p1.dist(p0); //dist from mousedown
        
            if (evt.shiftKey) {
                this.targetMorph.setBorderWidth(Math.max(0, Math.floor(d/3)/2), true);
            } else { 
                // these hack tests should be replaced by receiver tests
                if (this.targetMorph.getType() == "WindowMorph" || this.targetMorph.getType() == "TitleBarMorph"){
                  // scale the whole window instead of reframing
                  // DI:  Note this should reframe windows, with proportional layout of the interior frames
                  // this code is all copied -- should be factored or, better, removed
                  var ctr = this.targetMorph.owner().worldPoint(this.targetMorph.origin);
                  var v1 = p1.subPt(ctr); //vector from origin
                  var v0 = p0.subPt(ctr); //vector from origin at mousedown
                  var ratio = v1.r() / v0.r();
                  ratio = Math.max(0.1,Math.min(10,ratio));
                  this.targetMorph.setScale(this.initialScale*ratio); 
                } else {
                  this.targetMorph.reshape(this.partName, this.targetMorph.localize(evt.mousePoint), this, false);
                }                
            } 
        }
    },
    
    inspect: function() {
        return HandleMorph.superClass.inspect.call(this) + " on " + Object.inspect(this.targetMorph);
    },
    
    scaleFor: function(scaleFactor) {
        this.applyFunctionToShape(function(s) {
            this.setBounds(this.bounds().center().asRectangle().expandBy(5/s));
            this.setStrokeWidth(1/s); 
        }, scaleFactor);
    }
    
});

/**
 * @class SelectionMorph: The selection "tray" object that
 * allows multiple objects to be moved and otherwise manipulated
 * simultaneously. 
 */

SelectionMorph = HostClass.create('SelectionMorph', Morph);

Object.extend(SelectionMorph.prototype, {
    
    defaultBorderWidth: 1,
    defaultBorderColor: Color.blue,
    defaulFill: Color.secondary.blue,

    initialize: function(viewPort, defaultworldOrNull) {
        SelectionMorph.superClass.initialize.call(this, viewPort, "rect");
        this.originalPoint = viewPort.topLeft();
        this.reshapeName = "bottomRight";
        this.selectedMorphs = [];
	this.initialSelection = true;
        this.shape.setFillOpacity(0.1);
        this.myWorld = defaultworldOrNull ? defaultworldOrNull : this.world();
        // this.shape.setAttributeNS(null, "stroke-dasharray", "3,2");
        return this;
    },
    
    reshape: function(partName, newPoint, handle, lastCall) {
        // Initial selection might actually move in another direction than toward bottomRight
        // This code watches that and changes the control point if so
        if (this.initialSelection) {
		var selRect = Rectangle.fromAny(pt(0,0), newPoint);
        	if (selRect.width*selRect.height > 30) {
            		this.reshapeName = selRect.partNameNearest(Rectangle.corners, newPoint);
        	}
        	this.setBounds(this.originalPoint.asRectangle())
	} else { this.reshapeName = partName; }

        SelectionMorph.superClass.reshape.call(this, this.reshapeName, newPoint, handle, lastCall);
        this.selectedMorphs = [];
        this.owner().submorphs.each(function(m) {
            if (m !== this && this.bounds().containsRect(m.bounds())) this.selectedMorphs.push(m);
        }.bind(this));
        this.selectedMorphs.reverse();
            
        if (lastCall) this.initialSelection = false;
	if (lastCall && this.selectedMorphs.length == 0) this.remove();
    },

    morphMenu: function(evt) { 
        var menu = SelectionMorph.superClass.morphMenu.call(this,evt);
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
        SelectionMorph.superClass.remove.call(this);
    },
    
    copyToHand: function(hand) { 
        this.selectedMorphs.invoke('copyToHand', hand);
    },
    
    setBorderWidth: function(width) { 
        if (this.selectedMorphs.length==0) {
            SelectionMorph.superClass.setBorderWidth.call(this,width);
        } else { 
            this.selectedMorphs.invoke('setBorderWidth', width);
            for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
                if (this.selectedMorphs[i].hasSubmorphs()) {
                    this.selectedMorphs[i].withAllSubmorphsDo(function() {this.setBorderWidth(width)}, null);
                }
            }
        }
    },
    
    setFill: function(color) { 
        if (this.selectedMorphs.length==0) {
            SelectionMorph.superClass.setFill.call(this,color);
        } else {
            this.selectedMorphs.invoke('setFill', color);
            for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
                if (this.selectedMorphs[i].hasSubmorphs()) {
                    this.selectedMorphs[i].withAllSubmorphsDo(function() {this.setFill(color)}, null);
                }
            }
        }
    },
    
    setBorderColor: function(color) { 
        if (this.selectedMorphs.length==0) {
            SelectionMorph.superClass.setBorderColor.call(this,color);
        } else {
            this.selectedMorphs.invoke('setBorderColor', color);
            for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
                if (this.selectedMorphs[i].hasSubmorphs()) {
                    this.selectedMorphs[i].withAllSubmorphsDo(function() {this.setBorderColor(color)}, null);
                }
            }
        }
    },
    
    setFillOpacity: function(op) { 
        if (this.selectedMorphs.length==0) {
            SelectionMorph.superClass.setFillOpacity.call(this,op);
        } else { 
            this.selectedMorphs.invoke('setFillOpacity', op);
            for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
                if (this.selectedMorphs[i].hasSubmorphs()) {
                    this.selectedMorphs[i].withAllSubmorphsDo(function() {this.setFillOpacity(op)}, null);
                }
            }
        }
    },
    
    setStrokeOpacity: function(op) { 
        if (this.selectedMorphs.length==0) {
            SelectionMorph.superClass.setStrokeOpacity.call(this,op);
        } else { 
            this.selectedMorphs.invoke('setStrokeOpacity', op);
            for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
                if (this.selectedMorphs[i].hasSubmorphs()) {
                    this.selectedMorphs[i].withAllSubmorphsDo(function() {this.setStrokeOpacity(op)}, null);
                }
            }
        }
    },

    // TODO: there MUST be a better way to do this
    // there "might" be some performance issues with this :)
    setRotation: function(theta) {
        for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
            this.addMorph(this.selectedMorphs[i]);
        }
        SelectionMorph.superClass.setRotation.call(this,theta);
        for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
            this.world().addMorph(this.selectedMorphs[i]);
        }
    },
    
// TODO: there MUST be a better way to do this.. but it works without a sweat
// there "might" be some performance issues with this :)
    setScale: function(scale) {
        for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
            this.addMorph(this.selectedMorphs[i]);
        }
        SelectionMorph.superClass.setScale.call(this,scale);
        for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
            this.world().addMorph(this.selectedMorphs[i]);
        }
    },
    
    okToBeGrabbedBy: function(evt) { // DI: Need to verify that z-order is preserved
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

PanelMorph = HostClass.create('PanelMorph', Morph);

Object.extend(PanelMorph.prototype, {

    initialize: function(extent/*:Point*/) {
        PanelMorph.superClass.initialize.call(this, pt(0, 0).extent(extent), 'rect');
        this.lastNavigable = null;
    },

    takesKeyboardFocus: function() {
        return true;
    },

    onMouseDown: function(evt) {
        this.requestKeyboardFocus(evt.hand);
        return true;
    },    
    
    onKeyPress: function(evt) {
        switch (evt.sanitizedKeyCode()) {
        case Event.KEY_TAB: { 
            this.focusOnNext(evt);
            evt.stop();
            return true;
        }
        }
    },
    
    handlesMouseDown: function(evt) { 
        return false;
    },

    focusOnNext: function(evt) {
        var current = evt.hand.keyboardFocus;
        if (current && current.nextNavigableSibling) {
            current.relinquishKeyboardFocus(evt.hand);
            current.nextNavigableSibling.requestKeyboardFocus(evt.hand);
        } 
    },

    addMorphFrontOrBack: function(m, front) {
        if (m.takesKeyboardFocus()) {
            if (this.lastNavigable) this.lastNavigable.nextNavigableSibling = m;
            this.lastNavigable = m;
        }

        return PanelMorph.superClass.addMorphFrontOrBack.call(this, m, front);
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
        //     ['leftPane', ListPane, Rectangle(0, 0, 0.5, 0.6)],
        // See example calls in, eg, SimpleBrowser.buildView() for how to use this
        var panel = PanelMorph(extent);
        panel.setFill(Color.primary.blue.lighter().lighter());
        panel.setBorderWidth(2);

        paneSpecs.each( function(spec) {
            var paneName = spec[0];
            var paneConstructor = spec[1];
            var paneRect = pt(0,0).extent(extent).scaleByRect(spec[2]);
            panel.setNamedMorph(paneName, paneConstructor(paneRect));
        });

        return panel;
    }

});

/**
 * @class CheapListMorph
 */ 

CheapListMorph = HostClass.create('CheapListMorph', TextMorph);

Object.extend(CheapListMorph.prototype, {
    
    defaultBorderColor: Color.black,
    wrap: WrapStyle.NONE,

    initialize: function(initialBounds, itemList) {
        // itemList is an array of strings
        // Note:  A proper ListMorph is a list of independent submorphs
        // CheapListMorphs simply leverage Textmorph's ability to display
        // multiline paragraphs, though some effort is made to use a similar interface.
    
        var listText = itemList ? itemList.join("\n") : "";
        CheapListMorph.superClass.initialize.call(this, initialBounds, listText);
        // this default self connection may get overwritten by, eg, connectModel()...
        var model = new SimpleModel(null, "List", "Selection");
        this.modelPlug = this.addChildElement(model.makePlug());
        this.itemList = itemList;
        this.setModelValue('setList', itemList);
        //console.log('model now %s', this.modelPlug.model);
        if (!this.font) alert('wha, null font in %1'.format(this));
        this.layoutChanged();
        return this;
    },

    restorePersistentState: function(importer) {
        CheapListMorph.superClass.restorePersistentState.call(this, importer);
        this.itemList = this.textString.split('\n');
        this.setModelValue('setList', this.itemList);
    },
    
    takesKeyboardFocus: function() { 
        return true;
    },

    onKeyPress: function(evt) {
        switch (evt.sanitizedKeyCode()) {
        case Event.KEY_UP: {
            var lineNo = this.selectedLineNo();
            if (lineNo > 0) {
                this.selectLineAt(this.selectionRange[0] - 2); 
                this.setSelection(this.itemList[lineNo - 1]); 
            } 
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
        }

    },

    onKeyDown: function(evt) {
        // do nothing
    },
    
    onMouseDown: function(evt) {
        this.requestKeyboardFocus(evt.hand);
        // this.selectLineAt(this.charOfY(this.localize(evt.mousePoint))); 
        this.onMouseMove(evt); 
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
        return this.charOfPoint(pt(this.inset.x+1,p.y)); 
    },
    
    selectedLineNo: function() { // Return the item index for the current selection
        return this.lineNo(this.ensureTextBox().getBounds(this.selectionRange[0]));
    },
    
    showsSelectionWithoutFocus: function() { 
        return true;  // Overridden in, eg, Lists
    },

    drawSelection: function() {
        if (this.hasNullSelection()) { // Null sel in a list is blank
            this.undrawSelection();
        } else CheapListMorph.superClass.drawSelection.call(this); 
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
    
    lineRect: function(r) { //Menu selection displays full width
        var bounds = this.shape.bounds();
        return CheapListMorph.superClass.lineRect.call(this, Rectangle(bounds.x+2, r.y, bounds.width-4, r.height)); 
    },
    
    updateList: function(newList) {
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
                this.setSelectionToMatch(selection);
                return selection; //debugging
            }
        }
    },//.logCalls('updateView'),

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

/**
 * @class MenuMorph
 */ 

MenuMorph = HostClass.create('MenuMorph', CheapListMorph);

Object.extend(MenuMorph.prototype, {

    defaultBorderColor: Color.blue,
    defaultBorderWidth: 0.5,
    defaultFill: Color.blue.lighter(5),

    initialize: function(items, targetMorph, lines) {
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

        this.items = items;
        this.targetMorph = targetMorph;
        this.lines = lines ? lines : [];
        console.log('what, font is %s in %s', this.font, this);
        //this.layoutChanged();
        return this;
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
        for (var i=0; i<this.items.length; i++)
            if (this.items[i][0] == itemName)
                this.items.splice(i,1);
    },

    replaceItemNamed: function(itemName, newItem) {
        for (var i=0; i<this.items.length; i++)
            if (this.items[i][0] == itemName)
                this.items[i] = newItem;
    },

    removeItemsNamed: function(nameList) {
        nameList.each(function(n) { this.removeItemNamed(n); }.bind(this));
    },

    keepOnlyItemsNamed: function(nameList) {
        var rejects = [];
        this.items.each( function(item) { if (nameList.indexOf(item[0]) < 0) rejects.push(item[0])});
        this.removeItemsNamed(rejects);
    },

    openIn: function(world, location, remainOnScreen, captionIfAny) { 
        // Note: on a mouseDown invocation (as from a menu button),
        // mouseFocus should be set immediately before or after this call
        this.stayUp = remainOnScreen; // set true to keep on screen
        this.caption = captionIfAny;  // Not yet implemented
        this.compose(location);
        world.addMorph(this);
        if (captionIfAny) { // Still under construction
            var label = new TextMorph(Rectangle(0, 0, 200, 20), captionIfAny);
            label.setWrapStyle(WrapStyle.SHRINK);  label.fitText();
            label.shape.roundEdgesBy(4);
            label.shape.setFillOpacity(0.75);
            label.align(label.bounds().bottomCenter(), this.shape.bounds().topCenter());
            this.addMorph(label);
        }
        // If menu and/or caption is off screen, move it back so it is visible
        var menuRect = this.bounds();  //includes caption if any
        // Intersect with world bounds to get visible region.  Note we need shape.bounds,
        // since world.bounds() would include stick-outs, including this menu!
        var visibleRect = menuRect.intersection(this.owner().shape.bounds()); 
        var delta = visibleRect.topLeft().subPt(menuRect.topLeft());  // delta to fix topLeft off screen
        delta = delta.addPt(visibleRect.bottomRight().subPt(menuRect.bottomRight()));  // same for bottomRight
        if (delta.dist(pt(0,0)) > 1) this.moveBy(delta);  // move if significant

        // Note menu gets mouse focus by default if pop-up.  If you don't want it, you'll have to null it
        if (!remainOnScreen) world.firstHand().setMouseFocus(this);
    },

    compose: function(location) { 
        var itemNames = this.items.map(function (item) { return item[0] });
        MenuMorph.superClass.initialize.call(this, location.extent(pt(200, 200)), itemNames);
        this.setWrapStyle(WrapStyle.SHRINK);  
        this.fitText(); // first layout is wasted!
        // styling
        this.textColor = Color.blue;
        //this.setFill(StipplePattern.create(Color.white, 3, Color.blue.lighter(5), 1));
        this.shape.roundEdgesBy(6);
        this.shape.setFillOpacity(0.75);
    },

    onMouseUp: function(evt) {
        if (!this.hasNullSelection()) var item = this.items[this.selectedLineNo()];
        this.setNullSelectionAt(0);  // Clean up now, in case the call fails
        if (!this.stayUp) this.remove(); 

        if (item) { // Now execute the menu item...
            if (item[1] instanceof Function) { // alternative style, items ['menu entry', function] pairs
                item[1].call(this.targetMorph || this, evt);
            } else {
                var func = item[1][item[2]];  // target[functionName]
                if (func == null) console.log('Could not find function ' + item[2]);
                // call as target.function(parameterOrNull,event,menuItem)
                else func.call(item[1], item[3], evt, item); 
            }
        }
    }

});

/**
 * @class SliderMorph
 */ 

SliderMorph = HostClass.create('SliderMorph', Morph);

Object.extend(SliderMorph.prototype, {

    baseColor: Color.primary.blue, // KP: stopgap fix for serialization??
    
    initialize: function(initialBounds, scaleIfAny) {
        SliderMorph.superClass.initialize.call(this, initialBounds, "rect");
        var model = new SimpleModel(null, "Value", "Extent");
        // this default self connection may get overwritten by, eg, connectModel()...
        this.modelPlug = this.addChildElement(model.makePlug());
        this.scale = (scaleIfAny == null) ? 1.0 : scaleIfAny;
        var slider = Morph(Rectangle(0, 0, 8, 8), "rect");
        slider.relayMouseEvents(this, {onMouseDown: "sliderPressed", onMouseMove: "sliderMoved", onMouseUp: "sliderReleased"});
        this.setNamedMorph("slider", slider);
        this.linkToStyles(['slider']);
        this.adjustForNewBounds(); 

        return this;
    },
    
    restorePersistentState: function(importer) {
        SliderMorph.superClass.restorePersistentState.call(this, importer);
        this.slider = this.getNamedMorph('slider');
        if (!this.slider) {
            console.warn('no slider in %s, %s', this, this.textContent);
           return;
        }
        this.slider.relayMouseEvents(this, {onMouseDown: "sliderPressed", onMouseMove: "sliderMoved", onMouseUp: "sliderReleased"});
        this.scale = 1.0; // FIXME restore from markup
        //this.adjustForNewBounds();
    },

    vertical: function() {
        var bnds = this.shape.bounds();
        return bnds.height > bnds.width; 
    },
    
    applyStyle: function(spec) {
        this.baseColor = Color.primary.blue;
        this.fillType = "simple";
        SliderMorph.superClass.applyStyle.call(this, spec);
        // need to call adjust to update graphics, but only after slider exists
        if (this.slider) this.adjustForNewBounds(); 
    },
    
    adjustForNewBounds: function() {
        SliderMorph.superClass.adjustForNewBounds.call(this);

        // This method adjusts the slider for changes in value as well as geometry
        var val = this.getValue();
        var bnds = this.shape.bounds();
        var ext = this.getExtent();
    
        if (this.vertical()) { // more vertical...
            var elevPix = Math.max(ext*bnds.height,8); // thickness of elevator in pixels
            var topLeft = pt(0,(bnds.height-elevPix)*val);
            var sliderExt = pt(bnds.width,elevPix); 
        } else { // more horizontal...
            var elevPix = Math.max(ext*bnds.width,8); // thickness of elevator in pixels
            var topLeft = pt((bnds.width-elevPix)*val,0);
            var sliderExt = pt(elevPix,bnds.height); 
        }
    
        this.slider.setBounds(bnds.topLeft().addPt(topLeft).extent(sliderExt)); 
    
        if (this.fillType == "linear gradient") {
            var direction = this.vertical() ? LinearGradient.EastWest : LinearGradient.NorthSouth;
            this.setFill(LinearGradient.makeGradient(this.baseColor.lighter(2), this.baseColor, direction));
            this.slider.setFill(LinearGradient.makeGradient(this.baseColor.lighter(), this.baseColor.darker(), direction));
        } else {
            this.setFill(this.baseColor);
            this.slider.setFill(this.baseColor.darker());
        }
    },
    
    sliderPressed: function(evt, slider) {
        //    Note: want setMouseFocus to also cache the transform and record the hitPoint.
        //    Ideally thereafter only have to say, eg, morph.setPosition(evt.hand.adjustedMousePoint)
        this.hitPoint = this.localize(evt.mousePoint).subPt(this.slider.bounds().topLeft());
    },
    
    sliderMoved: function(evt, slider) {
        if (!evt.mouseButtonPressed) return;
        // Compute a new value from a new mouse point, and emit it
    
        var p = this.localize(evt.mousePoint).subPt(this.hitPoint);
        var bnds = this.shape.bounds();
        var ext = this.getExtent();
        var elevPix = Math.max(ext*bnds.height,6); // thickness of elevator in pixels
    
        if (this.vertical()) { // more vertical...
            var newValue = p.y / (bnds.height-elevPix); 
        } else { // more horizontal...
            var newValue = p.x / (bnds.width-elevPix); 
        }
    
        this.setValue(this.clipValue(newValue));
        this.adjustForNewBounds(); 
    },

    sliderReleased: function(evt, slider) { },
    
    handlesMouseDown: function(evt) { return !evt.altKey; },
    
    onMouseDown: function(evt) {
        this.requestKeyboardFocus(evt.hand);
        var inc = this.getExtent();
        var newValue = this.getValue();
        var delta = this.localize(evt.mousePoint).subPt(this.slider.bounds().center());

        if (this.vertical() ? delta.y > 0 : delta.x > 0) newValue += inc;
        else newValue -= inc;
    
        this.setValue(this.clipValue(newValue));
        this.adjustForNewBounds(); 
    },
    
    onMouseMove: function(evt) {
        // Overriden so won't drag me if mouse pressed
        if (evt.mouseButtonPressed) return
        return SliderMorph.superClass.onMouseMove.call(this, evt);
    },
    
   clipValue: function(val) { 
        return Math.min(1.0,Math.max(0,0,val.roundTo(0.001))); 
    },

    updateView: function(aspect, controller) {
        var p = this.modelPlug;
        if (p) {
            if (aspect == p.getValue || aspect == p.getExtent || aspect == 'all') this.adjustForNewBounds();
            return;
        }
    },

    getValue: function() {
        if (this.modelPlug) return this.getModelValue('getValue', 0) / this.scale;
    },

    setValue: function(value) {
        if (this.modelPlug) this.setModelValue('setValue', value * this.scale);
    },

    getExtent: function() {
        if (this.modelPlug) return this.getModelValue('getExtent',(0.0));
    },

    takesKeyboardFocus: function() { 
        // unlike, eg, cheapMenus
        return true; 
    },
    
    setHasKeyboardFocus: function(newSetting) { 
        return newSetting; // no need to remember
    },

    onKeyPress: function(evt) {
        var delta = 0;
        if (this.vertical()) {
            switch (evt.sanitizedKeyCode()) {
            case Event.KEY_DOWN: delta = 1; break;
            case Event.KEY_UP:  delta = -1; break;
            default: return false;
            } 
        } else {
            switch (evt.sanitizedKeyCode()) {
            case Event.KEY_RIGHT: delta = 1;  break;    
            case Event.KEY_LEFT:  delta = -1; break;
            default: return false;
            }    
        }
        this.adjustForNewBounds();
        this.setValue(this.clipValue(this.getValue() + delta * this.getExtent()));
        evt.stop();
        return true;
    }

});

/**
 * @class ScrollPane
 */ 

ScrollPane = HostClass.create('ScrollPane', Morph);

Object.extend(ScrollPane.prototype, {

    defaultBorderWidth: 2,
    defaultFill: null,
    scrollBarWidth: 14,

    initialize: function(morphToClip, initialBounds) {
        ScrollPane.superClass.initialize.call(this, initialBounds, "rect");
    
        var bnds = this.shape.bounds();
        var clipR = bnds.withWidth(bnds.width - this.scrollBarWidth+1).insetBy(1);
        morphToClip.shape.setBounds(clipR); // FIXME what if the targetmorph should be bigger than the clipmorph?
        // Make a clipMorph with the content (morphToClip) embedded in it
        var clipMorph = this.setNamedMorph('clipMorph', ClipMorph(clipR));    
        clipMorph.shape.setFill(morphToClip.shape.getFill());
        morphToClip.setBorderWidth(0);
        morphToClip.setPosition(clipR.topLeft());
        clipMorph.addMorph(morphToClip);
    
        // Add a scrollbar
        var scrollBar = this.setNamedMorph('scrollBar', SliderMorph(bnds.withTopLeft(clipR.topRight())));
        scrollBar.connectModel({model: this, getValue: "getScrollPosition", setValue: "setScrollPosition", 
                                getExtent: "getVisibleExtent"});

        // suppress handles throughout
        [this, clipMorph, morphToClip, scrollBar].map(function(m) {m.suppressHandles = true});
        return this;
    },
    
    innerMorph: function() {
        return this.clipMorph.submorphs.firstChild;
    },

    connectModel: function(plugSpec) { // connection is mapped to innerMorph
        this.innerMorph().connectModel(plugSpec); 
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
    },
    
    getVisibleExtent: function(scrollPos) {
        return Math.min(1, this.bounds().height / Math.max(10, this.innerMorph().bounds().height)); 
    },
    
    scrollToTop: function() {
        this.setScrollPosition(0);
        this.scrollBar.adjustForNewBounds(); 
    }
    
});

/**
 * @class ListPane
 */ 

function ListPane(initialBounds) {
    return ScrollPane(CheapListMorph(initialBounds,["-----"]), initialBounds); 
};

/**
 * @class TextPane
 */ 

function TextPane(initialBounds, defaultText) {
    return ScrollPane(TextMorph(initialBounds, defaultText), initialBounds); 
};

/**
 * @class PrintPane
 */ 

function PrintPane(initialBounds, defaultText) {
    return ScrollPane(PrintMorph(initialBounds, defaultText), initialBounds); 
};

// ===========================================================================
// Utility widgets
// ===========================================================================

/**
 * @class ColorPickerMorph
 */ 

ColorPickerMorph = HostClass.create('ColorPickerMorph', Morph);

Object.extend(ColorPickerMorph.prototype, {

    defaultFill: null,
    defaultBorderWidth: 1, 
    defaultBorderColor: Color.black,

    initialize: function(initialBounds, targetMorph, setFillName, popup) {
        ColorPickerMorph.superClass.initialize.call(this, initialBounds, "rect");
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
        for (var x = 0; x < r.width; x+=dd) {
            for (var y = 0; y < r.height; y+=dd) { // lightest down to neutral
                var patchFill = this.colorMap(x, y, rh2, this.colorWheel(r.width + 1)).toString();
                var element = RectShape(Rectangle(x + r.x, y + r.y, dd, dd), patchFill, 0, null);
                // element.setAttributeNS("fill", this.colorMap(x, rh2, rh2, this.colorWheel(r.width + 1)).toString());
                this.addChildElement(element);
            }
        }
    },

    colorMap: function(x,y,rh2,wheel) {
        var columnHue = wheel[x];
        if (y <= rh2) return columnHue.mixedWith(Color.white,y/rh2); // lightest down to neutral
        else return Color.black.mixedWith(columnHue,(y-rh2)/rh2);  // neutral down to darkest
    },

    colorWheel: function(n) { 
        if (this.colorWheelCache && this.colorWheelCache.length == n) return this.colorWheelCache;
        console.log("computing wheel for " + n);
        return this.colorWheelCache = Color.wheelHsb(n,338,1,1);
    },

    handlesMouseDown: function(evt) { 
        return !evt.altKey;
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
            // console.log('mp = ' + this.localize(evt.mousePoint).inspect() + ' / relp = ' + relp.inspect());
            var selectedColor = this.colorMap(relp.x,relp.y,rh2,wheel);
            this.setModelValue('setColor', selectedColor);
        } 
    }
    
});

// ===========================================================================
// World-related widgets
// ===========================================================================

// A unique characteristics of the Morphic graphics system is that
// all objects can live in a "world" that is shared between different
// objects and even different users.  A world can contain a large number
// of different applications/widgets, much like in an operating system
// a folder can contain a lot of files.  Worlds can be linked to each
// other using LinkMorphs.  As a consequence, the entire system can
// contain a large number of worlds, each of which contains a large
// number of simultaneously running applications. 

/**
 * @class PasteUpMorph
 * PasteUp morphs are used for layouts,
 * most notably for the world and, eg, palettes
 */ 

PasteUpMorph = HostClass.create('PasteUpMorph', Morph);

Object.extend(PasteUpMorph.prototype, {

    initialize: function(bounds, shapeType) {
        return PasteUpMorph.superClass.initialize.call(this, bounds, shapeType);
    },
    
    mouseEvent: function(evt, hasFocus) {
        if (evt.type == "mousedown" && this.onMouseDown(evt)) return; 
        PasteUpMorph.superClass.mouseEvent.call(this, evt, hasFocus); 
    },

    onMouseDown: function(evt) {  //default behavior is to grab a submorph
        var m = this.morphToReceiveEvent(evt);
        if (m == null) { this.makeSelection(evt); return true; }
        if (!evt.altKey) {
            if (m == this.world()) { this.makeSelection(evt); return true; }
            if (m.handlesMouseDown(evt)) return false;
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
        var m = SelectionMorph(evt.mousePoint.extent(pt(0,0)));
        this.world().addMorph(m);
        this.world().currentSelection = m;
        var handle = HandleMorph(pt(0,0), "rect", evt.hand, m, "bottomRight");
        m.addMorph(handle);
        handle.setBounds(handle.bounds().center().asRectangle());
        m.setBounds(evt.mousePoint.asRectangle()); // prevent handle from making bounds any larger
        // if (evt.hand.mouseFocus instanceof HandleMorph) evt.hand.mouseFocus.remove(); // DI: necess?
        evt.hand.setMouseFocus(handle);
    }
    
});

/**
 * @class WorldMorph: A Morphic world
 */ 
// KP: WorldMorph isn't really a widget

WorldMorph = HostClass.create('WorldMorph', PasteUpMorph);

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

Object.extend(WorldMorph.prototype, {

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
                           fill: RadialGradient.makeCenteredGradient(Color.yellow.lighter(2), Color.yellow) },
            link:        { borderColor: Color.green, borderWidth: 1, fill: Color.blue}
        },

        lively: { // This is to be the style we like to show for our personality
            styleName: 'lively',
            window:      { rounding: 8 },
            titleBar:    { rounding: 8, borderWidth: 2, bordercolor: Color.black,
                           fill: LinearGradient.makeGradient(Color.primary.blue, Color.primary.blue.lighter(3))},
            panel:       {  },
            slider:      { borderColor: Color.black, borderWidth: 1, 
                           baseColor: Color.primary.blue, fillType: "linear gradient"},
            button:      { borderColor: Color.neutral.gray, borderWidth: 0.3, rounding: 4,
                           baseColor:   Color.primary.blue, fillType: "linear gradient" },
            widgetPanel: { borderColor: Color.blue, borderWidth: 4, rounding: 16,
                           fill: Color.blue.lighter(), opacity: 0.4},
            clock:       { borderColor: Color.black, borderWidth: 1,
                           fill: RadialGradient.makeCenteredGradient(Color.primary.blue.lighter(2), Color.primary.blue.lighter()) },
            link:        { borderColor: Color.green, borderWidth: 1, fill: Color.blue}
        },

        turquoise: { // Like turquoise, black and silver jewelry, [or other artistic style]
            styleName: 'turquoise',
            window:      { rounding: 8},
            titleBar:    { rounding: 8, borderWidth: 2, bordercolor: Color.black,
                           fill: LinearGradient.makeGradient(Color.turquoise, Color.turquoise.lighter(3))},
            panel:       {  },
            slider:      { borderColor: Color.black, borderWidth: 1, 
                           baseColor: Color.turquoise, fillType: "linear gradient"},
            button:      { borderColor: Color.neutral.gray.darker(), borderWidth: 2, rounding: 8,
                           baseColor: Color.turquoise, fillType: "radial gradient" },
            widgetPanel: { borderColor: Color.neutral.gray.darker(), borderWidth: 4,
                           fill: Color.turquoise.lighter(3), rounding: 16},
            clock:       { borderColor: Color.black, borderWidth: 1,
                           fill: RadialGradient.makeCenteredGradient(Color.turquoise.lighter(2), Color.turquoise) },
            link:        { borderColor: Color.green, borderWidth: 1, fill: Color.blue}
        }
    },


    initialize: function(canvas, backgroundImageId) {
        var bounds = canvas.bounds();
        // sometimes bounds has zero dimensions (when reloading thes same page, timing issues?
        // in Firefox bounds may be 1x1 size?? maybe everything should be run from onload or sth?

        if (bounds.width < 2) {
            bounds.width = 1280;
        }

        if (bounds.height < 2) {
            bounds.height = 1024;
        }

        if (backgroundImageId) {
            var background = NodeFactory.create("use").withHref(backgroundImageId);
            this.addChildElement(background);
        }
            
        WorldMorph.superClass.initialize.call(this, bounds, "rect");

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

    remove: function() {
        if (!this.parentNode) return null;  // already removed
        this.stopStepping();
        this.parentNode.removeChild(this);
        return this;

        // console.log('removed ' + this.inspect());
        // this.owner = null; 
    },

    displayWorldOn: function(canvas) {
        this.remove();
        canvas.appendChild(this);
        this.addHand(HandMorph(true));
    },
    
    addHand: function(hand) {
        this.hands.push(hand);
        hand.ownerWorld = this;
        hand.registerForEvents(this);
        hand.registerForEvents(hand);
        hand.layoutChanged();
    
        Event.keyboardEvents.forEach(function(each) {
            document.documentElement.addEventListener(each, hand.handler, false);
        });
        
        this.parentNode.appendChild(hand);
    },
    
    removeHand: function(hand) {
        this.parentNode.removeChild(hand);
        hand.unregisterForEvents(this);
        hand.unregisterForEvents(hand);

        Event.keyboardEvents.forEach(function(each) {
            document.documentElement.removeEventListener(each, hand.handler, false);
        });

        this.hands.splice(this.hands.indexOf(hand), 1);
    },

    morphMenu: function(evt) { 
        var menu = WorldMorph.superClass.morphMenu.call(this,evt);
        menu.keepOnlyItemsNamed(["inspect", "style"]);
        menu.addItem([(Config.suppressBalloonHelp ? "enable balloon help" : "disable balloon help"),
                     this.toggleBalloonHelp]);
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
        var menu = MenuMorph(items, this);
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
            func.call(action.actor, action.argIfAny);
            // Note: if error in script above, it won't get rescheduled below (this is good)

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
        return pt.matrixTransform(this.parentNode.getTransformToElement(this)); 
    },
    
    addMorphs: function(evt) {
        console.log("mouse point == %s", evt.mousePoint);
        var world = this.world();
        var items = [
            ["New subworld (LinkMorph)", function(evt) { world.addMorph(LinkMorph(null, evt.mousePoint));}],
            ["Line", function(evt) { world.addMorph(Morph.makeLine([evt.mousePoint, evt.mousePoint.addXY(60, 30)], 2, Color.black));}],
            ["Rectangle", function(evt) { world.addMorph(Morph(evt.mousePoint.extent(pt(60, 30)), "rect"));}],
            ["Ellipse", function(evt) { world.addMorph(Morph(evt.mousePoint.extent(pt(50, 50)), "ellipse"));}],
            ["TextMorph", function(evt) { world.addMorph(TextMorph(evt.mousePoint.extent(pt(120, 10)), "This is a TextMorph"));}],
            ["Class Browser", function(evt) { new SimpleBrowser().openIn(world, evt.mousePoint); }]
        ];
	if (window.location.protocol == "http:") {
	    items.push(["File Browser", function(evt) { WebStore.onCurrentLocation().openIn(world, evt.mousePoint) }])
	}
        MenuMorph(items, this).openIn(this.world(), evt.mousePoint);
    },

    makeShrinkWrappedWorldWith: function(morphs, filename) {
        if (filename == null) {
            console.log('null filename, not publishing %s', morphs);
           return;
        }

        if (!WebStore.defaultStore) {
            this.alert("no store to access the startup file, location " + location);
            return;
        }

        console.log('morphs is %s', morphs);

        var newDoc = null;
        var url = "http://" + WebStore.defaultStore.host + "/" + WebStore.defaultStore.path + "/lively.xhtml";
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
        url = "http://" + WebStore.defaultStore.host + "/" + WebStore.defaultStore.path + "/" + filename;
        var container = newDoc.createElementNS(Namespace.SVG, 'g');

        morphs.each(function(morph) {

            var model = morph.getModel();
            console.log('processing morph %s model %s', morph, model);
            var modelNode = null;
            if (model) { 
                modelNode = morph.addChildElement(model.toMarkup(newDoc));
            }
            container.appendChild(newDoc.importNode(morph, true));
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

        new NetRequest(url, { 
            method: 'put',
            asynchronous: false,
            body: content,
            onSuccess: function(transport) {
                failed = false;
            },
	    onFailure: function(transport) {
		this.alert('failed saving world at url %s', url);
		failed = true;
	    }

        });
    },

    addMorphsFrom: function(id) {
        var container = document.getElementById(id);
	if (!container) return null;
        var morphs = [];
        for (var node = container.firstChild; node != null; node = node.nextSibling) {
            if (node.tagName != 'g') continue;
            morphs.push(node);
        }

        var importer = new Importer();
        morphs.each(function(m) { this.addMorph(importer.importFromNode(m)) }.bind(this));
	return morphs;
    },

    alert: function(message) {
        var fill = this.getFill();
        this.setFill(Color.black); // poor man's modal dialog

        var menu = MenuMorph([["OK", function() { this.setFill(fill)}]], this);
        // menu.setFontSize(20);
        menu.openIn(this, this.bounds().center(), false, message); 
    }.logErrors('alert'),

    prompt: function(message) {
        // FIXME replace with a native solution
        return window.prompt(message);
    }

});

/**
 * @class DomEventHandler
 */ 

// HandMorph could be its own event listener but FF doesn't like it when
// an svg element is registered as a handler
DomEventHandler = Class.create();

Object.extend(DomEventHandler.prototype, {
    
    initialize: function (hand) {
        this.hand = hand;
        return this;
    },
    
    handleEvent: function(evt) {
        evt.hand = this.hand;
        evt.init();
        // console.log('original target ' + evt.target);

        switch(evt.type) {
        case "mousemove":
        case "mousedown":
        case "mouseup":
            this.hand.handleMouseEvent(evt);
            // evt.preventDefault();
            break;
        case "keydown":
        case "keypress": 
        case "keyup":
            this.hand.handleKeyboardEvent(evt);
            break;
        default:
            console.log("unknown event type " + evt.type);
        }
        evt.stopPropagation();
    }.logErrors('Event Handler')
    
});

/**
 * @class HandMorph
 * Defines the little triangle that represents the user's cursor.
 * Since there may be multiple users manipulating a Morphic world
 * simultaneously, we do not want to use the default system cursor.   
 */ 

HandMorph = HostClass.create('HandMorph', Morph);

Object.extend(HandMorph.prototype, {

    shadowOffset: pt(5,5),
    handleOnCapture: true,
    applyDropShadowFilter: false,

    initialize: function(local) {
        HandMorph.superClass.initialize.call(this, pt(5,5).extent(pt(10,10)), "rect");
    
        this.setShape(PolygonShape([pt(0,0),pt(9,5), pt(5,9), pt(0,0)], 
                     (local ? Color.blue : Color.red), 1, Color.black));
        this.shape.disablePointerEvents();
    
        this.replaceChild(this.submorphs, this.shape);
        this.appendChild(this.shape); // make sure submorphs are render first, then the hand shape 

        this.isLocal = local;
        this.setFill(local? Color.primary.blue : Color.primary.green); 

        this.keyboardFocus = null;
        this.mouseFocus = null;
        this.mouseOverMorph = null;
        this.lastMouseEvent = Event.makeSyntheticMouseEvent().init();
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

        this.handler = new DomEventHandler(this);
        this.ownerWorld = null;

        return this;
    },
    
    registerForEvents: function(morph) {
        var self = this;
        Event.basicInputEvents.forEach(function(name) { 
            morph.addEventListener(name, self.handler, self.handleOnCapture)});
    },
    
    unregisterForEvents: function(morph) {
        var self = this; 
        Event.basicInputEvents.forEach(function(name) { 
            morph.removeEventListener(name, self.handler, self.handleOnCapture)});
    },
    
    setMouseFocus: function(morphOrNull) {
        // console.log('setMouseFocus: ' + Object.inspect(morphOrNull));
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
    
    owner: function() {
        return this.ownerWorld;
    },

    world: function() {
        return this.ownerWorld;
    },

    handleMouseEvent: function(evt) { 
        evt.hand = this; // extra copy needed for entry from HandRemoteControl
	evt.setButtonPressedAndPriorPoint(this.mouseButtonPressed, this.lastMouseEvent.mousePoint);
    
        //-------------
	// mouse move
	//-------------
	if (evt.type == "mousemove") { // it is just a move
            this.setPosition(evt.mousePoint);
            this.recordChange('origin');
             
            if (evt.mousePoint.dist(this.lastMouseDownPoint) > 10) 
                this.hasMovedSignificantly = true;
                
            if (this.mouseFocus) { // if mouseFocus is set, events go to that morph
		this.mouseFocus.mouseEvent(evt, true);

            } else {
		if (this.owner()) {
		    var receiver = this.owner().morphToReceiveEvent(evt);
		    if (receiver !== this.mouseOverMorph) {

			// if over a new morph, send onMouseOut, onMouseOver
			if(this.mouseOverMorph) this.mouseOverMorph.onMouseOut(evt);
			this.mouseOverMorph = receiver;
			// console.log('msOverMorph set to: ' + Object.inspect(this.mouseOverMorph));
			this.mouseOverMorph.onMouseOver(evt);
			if (!receiver || !receiver.canvas()) return;  // prevent errors after world-switch

		    // Note if onMouseOver sets focus, it will get onMouseMove
		    if(this.mouseFocus) this.mouseFocus.mouseEvent(evt, true);
		    else if(!evt.hand.hasSubmorphs()) this.owner().mouseEvent(evt, false); }
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
        evt.setButtonPressedAndPriorPoint(this.mouseButtonPressed, this.lastMouseEvent.mousePoint);
    
        if (this.mouseFocus != null) {
            if (this.mouseButtonPressed) {
                this.mouseFocus.mouseEvent(evt, true);
                this.lastMouseDownPoint = evt.mousePoint; 
            }
	    else this.mouseFocus.mouseEvent(evt, true); 
        } else {
            if (this.hasSubmorphs() && (evt.type == "mousedown" || this.hasMovedSignificantly)) {
                // If laden, then drop on mouse up or down
                var m = this.topSubmorph();
                var receiver = this.owner().morphToGrabOrReceiveDroppingMorph(evt, m);
                // For now, failed drops go to world; later maybe put them back?
                if (receiver == null) receiver = this.world();
                console.log('dropping %s on %s', m, receiver);
                this.dropMorphsOn(receiver);
            } else {
                // console.log('hand dispatching event ' + event.type + ' to owner '+ this.owner().inspect());
                // This will tell the world to send the event to the right morph
                // We do not dispatch mouseup the same way -- only if focus gets set on mousedown
                if (evt.type == "mousedown") this.owner().mouseEvent(evt, false);
            }
            if (evt.type == "mousedown") {
                this.lastMouseDownPoint = evt.mousePoint;
                this.hasMovedSignificantly = false; 
            }
        }
        this.lastMouseEvent = evt; 
    },

    grabMorph: function(grabbedMorph, evt) { 
        if (evt.shiftKey && !(grabbedMorph instanceof LinkMorph)) {
	    if (!grabbedMorph.okToDuplicate()) return;
	    grabbedMorph.copyToHand(this);
	    return;
        }
        if (evt.altKey) {
            grabbedMorph.showMorphMenu(evt);
            return;
        }
        // Give grabbed morph a chance to, eg, spawn a copy or other referent
        grabbedMorph = grabbedMorph.okToBeGrabbedBy(evt);
        if (!grabbedMorph) return;

        if (grabbedMorph.owner() && !grabbedMorph.owner().openForDragAndDrop) return;

        if (this.keyboardFocus && grabbedMorph !== this.keyboardFocus) {
            this.keyboardFocus.relinquishKeyboardFocus(this);
        }
        // console.log('grabbing %s', grabbedMorph);
        // Save info for cancelling grab or drop [also need indexInOwner?]
        // But for now we simply drop on world, so this isn't needed
        this.grabInfo = [grabbedMorph.owner(), grabbedMorph.position()];
        // console.log('grabbed %s', grabbedMorph);
        this.addMorph(grabbedMorph);
        if (this.applyDropShadowFilter) {
            grabbedMorph.setAttributeNS(null, "filter", "url(#DropShadowFilter)");
        }
        // grabbedMorph.updateOwner(); 
        this.changed(); //for drop shadow
    },
    
    dropMorphsOn: function (receiver) {
 	if (receiver !== this.world()) this.unbundleCarriedSelection();
	while (this.hasSubmorphs()) { // drop in same z-order as in hand
	    var m = this.submorphs.firstChild;
	    receiver.addMorph(m); // this removes it from hand
	    //DI: May need to be updated for collaboration...
	    //m.updateBackendFields('origin'); 

	    // FIXME - folowing stmt is a workaround for the fact that if the targetMorph gets
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
        switch (evt.sanitizedKeyCode()) {
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
        evt.hand = this; // KP: just to be sure
        if (this.hasSubmorphs())  {
            if (evt.type == 'keydown' && this.moveTopMorph(evt)) return;
            else if (evt.type == 'keypress' && this.transformTopMorph(evt)) return;
        }

        // manual bubbling up b/c the event won't bubble by itself    
        for (var responder = this.keyboardFocus; responder != null; responder = responder.owner()) {
            if (responder.takesKeyboardFocus()) {
                var handler = responder["on" + evt.capitalizedType()];
                if (handler) {
                    if (handler.call(responder, evt)) break; // event consumed?
                }
            }
        } 
    },

    bounds: function() {
        // account for the extra extent of the drop shadow
        // FIXME drop shadow ...
        if (this.shadowMorph)
            return HandMorph.superClass.bounds.call(this).expandBy(this.shadowOffset.x);
        else return HandMorph.superClass.bounds.call(this); 
    },
    
    inspect: function() { 
        var superString = HandMorph.superClass.inspect.call(this);
        var extraString = ", local=%1,id=%2".format(this.isLocal, this.id);
        if (!this.hasSubmorphs()) return superString + ", an empty hand" + extraString;
        return "%1, a hand carrying %2%3".format(superString, this.topSubmorph(), extraString);
    }
    
});

/**
 * @class LinkMorph
 * LinkMorph implements a two-way hyperlink between two Morphic worlds
 */ 
// KP: LinkMorph isn't really a widget

LinkMorph = HostClass.create('LinkMorph', Morph);

Object.extend(LinkMorph.prototype, {

    defaultFill: Color.black,
    defaultBorderColor: Color.black,
    helpText: "Click here to enter or leave a subworld.\n" +
              "Use menu 'grab' to move me.  Drag objects\n" +
              "onto me to transport objects between worlds.",
    
    initialize: function(otherWorld /*, rest*/) {
        // In a scripter, type: world.addMorph(LinkMorph(null))
        var bounds = arguments[1];
    
        if (!bounds) {
            bounds = WorldMorph.current().bounds().bottomLeft().addXY(330,-250).asRectangle().expandBy(25);
        } else if (bounds instanceof Point) {
            bounds = bounds.asRectangle().expandBy(25);
        }
    
        LinkMorph.superClass.initialize.call(this, bounds, "ellipse");

        // Make me look a bit like a world
        this.setFill(RadialGradient.makeCenteredGradient(Color.green, Color.blue));
        [Rectangle(0.15,0,0.7,1), Rectangle(0.35,0,0.3,1), Rectangle(0,0.3,1,0.4)].each( function(each) {
            // Make longitude / latitude lines
            var lineMorph = Morph(bounds.scaleByRect(each), "ellipse");
            lineMorph.setFill(null); lineMorph.setBorderWidth(1); lineMorph.setBorderColor(Color.black);
            lineMorph.align(lineMorph.bounds().center(),this.shape.bounds().center());
            lineMorph.ignoreEvents();
            this.addMorph(lineMorph);
        }.bind(this));
        this.openForDragAndDrop = false;
	this.suppressHandles = true;

        if (!otherWorld) {
            otherWorld = WorldMorph(Canvas);
            var pathBack = LinkMorph(WorldMorph.current(), bounds);
            pathBack.setFill(RadialGradient.makeCenteredGradient(Color.orange, Color.red.darker()));
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
            if (m.activeScripts) { //Fixme: this must be deep
                m.suspendedScripts = m.activeScripts.clone();
                m.stopSteppingScripts();
            }
            carriedMorphs.splice(0, 0, m);
            m.remove();
        }
        this.hideHelp();
        this.myWorld.changed();
        WorldMorph.current().onExit();    

        // remove old hands
        WorldMorph.current().hands.clone().each(function(hand) { 
            WorldMorph.current().removeHand(hand);
        });
        
        var canvas = WorldMorph.current().canvas();
        var oldWorld = WorldMorph.current();
        oldWorld.remove();
        
        console.log('left world %s', oldWorld);
        // Canvas.appendChild(this.myWorld);
    
        // display world first, then add hand, order is important!
        var newWorld = this.myWorld;
        WorldMorph.setCurrent(newWorld);

        newWorld.displayWorldOn(canvas); 

        newWorld.onEnter(); 
        carriedMorphs.each(function(m) {
            newWorld.firstHand().addMorph(m)
            if (m.suspendedScripts) {
                for (var i=0; i<m.suspendedScripts.length; i++) newWorld.startStepping(m.suspendedScripts[i]);
                m.suspendedScripts = null;
            }
        });

        if (Config.showThumbnail) {
            const scale = 0.1;
            if (newWorld.thumbnail) {
                newWorld.thumbnail.remove();
            }
            newWorld.thumbnail = Morph(Rectangle(0, 0, canvas.bounds().width*scale, canvas.bounds().height*scale), "rect");
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
        if (this.owner() instanceof HandMorph) return;
        
        // Create only one help balloon at a time
        if (this.help) return;
        
        this.help = TextMorph(Rectangle(evt.x, evt.y, 260, 20), this.helpText);
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

console.log('loaded Widgets.js');

