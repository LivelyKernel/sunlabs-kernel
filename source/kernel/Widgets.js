/*
 * Copyright © 2006-2008 Sun Microsystems, Inc.
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
var ButtonMorph = Morph.subclass("ButtonMorph", {

    focusHaloBorderWidth: 3, // override the default
    borderWidth: 0.3,
    fill: Color.neutral.gray,
    borderColor: Color.neutral.gray,

    baseColor: Color.neutral.gray, // KP: stopgap fix for serialization??

    // A ButtonMorph is the simplest widget
    // It read and writes the boolean variable, this.model[this.propertyName]
    initialize: function($super, initialBounds) {
        $super(initialBounds, "rect");
        
        var model = new SimpleModel(this, "Value");
        // this default self connection may get overwritten by, eg, connectModel()...
        this.modelPlug = model.makePlug();
        this.addNonMorph(this.modelPlug.rawNode);

        // Styling
        this.setModelValue('setValue', false);
        this.changeAppearanceFor(false);
        this.setToggle(false); // if true each push toggles the model state 
        return this;
    },

    initializeTransientState: function($super, initialBounds) {
        $super(initialBounds);
        // FIXME make persistent
        this.baseColor = this.fill;
        this.linkToStyles(['button']);
    },

    restorePersistentState: function($super, importer) {
        $super(importer);
        this.changeAppearanceFor(this.getModelValue('getValue', false));
    },

    // KP: FIXME general way of declaring properties mapping to attributes
    setToggle: function(flag) {
        this.rawNode.setAttributeNS(Namespace.LIVELY, "toggle", !!flag);
    },

    isToggle: function() {
        var value = this.rawNode.getAttributeNS(Namespace.LIVELY, "toggle");
        if (value && value == 'true') return true;
        else return false;
    },

    handlesMouseDown: function(evt) { return !evt.isAltDown(); },
    
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
            this.setFill(new LinearGradient(base, base.lighter(), LinearGradient.SouthNorth));
            break;
        case "radial gradient" :
            this.setFill(new RadialGradient(base.lighter(), base));
            break;
        default:
            this.setFill(base);
        }
    },

    applyStyle: function($super, spec) {
        $super(spec);
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
    }

});

/**
 * @class ImageMorph: Simple images
 */
var ImageMorph = Morph.subclass("ImageMorph", {
    
    fill: Color.blue.lighter(),
    borderWidth: 0,
   
    initialize: function($super, viewPort, url) {
        $super(viewPort, "rect");
        this.url = url;
        this.dim = viewPort.extent();
        if (url) { 
            this.loadURL(url);
        }
    },
    
    restoreContainerFIXME: function($super, element, type, importer) /*:Boolean*/ {
        if ($super(element, type, importer)) return true;

        switch (type) {
        case 'Image':
            var image = element;
            if (image.namespaceURI != Namespace.SVG) {
                // this brittle and annoying piece of code is a workaround around the likely brokenness
                // of Safari's XMLSerializer's handling of namespaces
                this.removeChild(image);
                this.dim = pt(Converter.parseLength(image.getAttributeNS(null, "width")), 
                              Converter.parseLength(image.getAttributeNS(null, "height")));
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
        var image = this.image = NodeFactory.create("use");
        image.setAttributeNS(Namespace.XLINK, "href", localURL);
        image.setAttributeNS(Namespace.LIVELY, "type", 'Image');
        if (scale) {
            new Similitude(pt(0, 0), 0, scale).applyTo(image);
        }
        this.addNonMorph(image);

    },

    loadURL: function(url) {
        if (this.image && this.image.tagName != 'image') {
            this.removeChild(this.image);
            this.image = null;
        }

        if (!this.image) {
            var image = this.image = NodeFactory.create("image", { width: this.dim.x, height: this.dim.y});
            image.setAttributeNS(Namespace.LIVELY, "type", 'Image');
            this.addNonMorph(image);
        }

        this.image.setAttributeNS(Namespace.XLINK, "href", url);
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
var ImageButtonMorph = ButtonMorph.subclass("ImageButtonMorph", {

    focusHaloBorderWidth: 0,

    initialize: function($super, initialBounds, normalImageHref, activatedImageHref) {
        this.image = new ImageMorph(new Rectangle(0, 0, initialBounds.width, initialBounds.height), normalImageHref);
        this.normalImageHref = normalImageHref;
        this.activatedImageHref = activatedImageHref;
        $super(initialBounds);
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
var IconMorph = ImageMorph.subclass("IconMorph", {

    initialize: function($super, viewPort, url, name, targetUrl) {
        $super(viewPort, url);
        this.label = new TextMorph(new Rectangle(viewPort.width, viewPort.height/3, 100, 30), name).beLabel();
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
var ClipMorph = Morph.subclass("ClipMorph", {

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

    bounds: function() {
        if (this.fullBounds != null) return this.fullBounds;
        this.fullBounds = this.getLocalTransform().transformRectToRect(this.shape.bounds());
    
        if (this.shape.hasElbowProtrusions) {
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
        
        return this.fullBounds; 
    }
    
});

/**
 * @class TitleBarMorph
 */
var TitleBarMorph = (function() { 

    // "class" private variables
    var controlSpacing = 3;
    var barHeight = 22;
    
    return Morph.subclass("TitleBarMorph", {

    // prototype variables
    borderWidth: 0.5,
    documentation: "Title bar for WindowMorphs",

    initialize: function($super, headline, windowWidth, windowMorph, isExternal) {
        $super(new Rectangle(0, isExternal? - barHeight : 0, windowWidth, barHeight), "rect");
        this.windowMorph = windowMorph;
        this.linkToStyles(['titleBar']);
        this.ignoreEvents();

        // Note: Layout of submorphs happens in adjustForNewBounds (q.v.)
        var cell = new Rectangle(0, 0, barHeight, barHeight);
        var closeButton = new WindowControlMorph(cell, controlSpacing, Color.primary.orange, windowMorph, 
            function() { this.initiateShutdown(); }, "Close");
        this.closeButton =  this.addMorph(closeButton);
        // FIXME this should be simpler
        // var sign = NodeFactory.create("use").withHref("#CloseIcon");
        // new Similitude(pt(-9, -9), 0, 0.035).applyTo(sign);
        // closeButton.addNonMorph(sign);

        var menuButton = new WindowControlMorph(cell, controlSpacing, Color.primary.blue, windowMorph, 
            function(evt) { windowMorph.showTargetMorphMenu(evt); }, "Menu");
        this.menuButton = this.addMorph(menuButton);

        var collapseButton = new WindowControlMorph(cell, controlSpacing, Color.primary.yellow, windowMorph, 
            function() { this.toggleCollapse(); }, "Collapse");
        this.collapseButton = this.addMorph(collapseButton);

        // var font = Font.forFamily(TextMorph.prototype.fontFamily, TextMorph.prototype.fontSize);

        var label;
        if (headline instanceof TextMorph) {
            label = headline;
        } else { // String
            var width = headline.length * 8; // wild guess headlineString.length * 2 *  font.getCharWidth(' ') + 2;
            label = new TextMorph(new Rectangle(0, 0, width, barHeight), headline).beLabel();
            label.shape.roundEdgesBy(8);
        }

        label.ignoreEvents();
        this.label = this.addMorph(label);

        this.adjustForNewBounds();  // This will align the buttons and label properly
        return this;
    },

    deserialize: function($super, importer, rawNode) {
        $super(importer, rawNode);
        if (this.rawNode.parentNode.getAttributeNS(Namespace.LIVELY, "type") == "WindowMorph") {
            this.closeButton.targetMorph = this.menuButton.targetMorph 
            = this.collapseButton.targetMorph = this.windowMorph.targetMorph;
        }
        this.linkToStyles(['titleBar']);
        this.ignoreEvents();
        this.label.ignoreEvents();
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
        var oldTop = WorldMorph.current().topSubmorph();
        if (oldTop instanceof WindowMorph) oldTop.titleBar.highlight(false);
        return this.windowMorph.isCollapsed() ? this : this.windowMorph;
    },

    adjustForNewBounds: function($super) {
        this.shape.setBounds(this.innerBounds().withHeight(barHeight));
        $super();
        var loc = this.innerBounds().topLeft().addXY(3, 3);
        var l0 = loc;
        var dx = pt(barHeight - controlSpacing, 0);
        if (this.closeButton) { this.closeButton.setPosition(loc);  loc = loc.addPt(dx); }
        if (this.menuButton) { this.menuButton.setPosition(loc);  loc = loc.addPt(dx); }
        if (this.collapseButton) { this.collapseButton.setPosition(loc);  loc = loc.addPt(dx); }
        if (this.label) {
            this.label.align(this.label.bounds().topCenter(),
            this.innerBounds().topCenter().addXY(0, 1));
            if (this.label.bounds().topLeft().x < loc.x) {
                this.label.align(this.label.bounds().topLeft(), loc.addXY(0,-2));
            }
        }
    },

    okToDuplicate: function(evt) {
        return false;
    }

})})();

/**
 * @class TitleTabMorph: Title bars for tabbed window morphs
 */
var TitleTabMorph = Morph.subclass("TitleTabMorph", {
    
    initialize: function($super, headline, windowWidth, windowMorph, isExternal) {
        this.windowMorph = windowMorph;
        var  bh = 0;//this.barHeight;
        var spacing = 0;// this.controlSpacing;
        $super(new Rectangle(0, isExternal? - bh : 0, windowWidth, bh), "rect");
        this.linkToStyles(['titleBar']);
        this.ignoreEvents();

        var cell = new Rectangle(0, 0, bh, bh);
        var menuButton = new WindowControlMorph(cell, spacing, Color.primary.blue, windowMorph, 
            function(evt) { windowMorph.showTargetMorphMenu(evt); }, "Menu");
        this.addMorph(menuButton);
        
        // Collapse button is retained only while we get things going...
        cell = cell.translatedBy(pt(bh - spacing, 0));
        var collapseButton = new WindowControlMorph(cell, spacing, Color.primary.yellow, windowMorph, 
            function() { this.toggleCollapse(); }, "Collapse");
        this.addMorph(collapseButton);

        var label;
        if (headline instanceof TextMorph) {
            label = headline;
        } else { // String
            var width = headline.length * 8;
            // wild guess headlineString.length * 2 *  font.getCharWidth(' ') + 2; 
            label = new TextMorph(new Rectangle(0, 0, width, bh), headline).beLabel();
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
 * @class WindowControlMorph
 */ 
var WindowControlMorph = Morph.subclass("WindowControlMorph", {

    borderWidth: 0,
    documentation: "Event handling for Window morphs",

    initialize: function($super, rect, inset, color, targetMorph, action, helpText) {
        $super(rect.insetBy(inset), 'ellipse');
        this.setFill(new RadialGradient(color.lighter(2), color));
        this.targetMorph = targetMorph;
        this.color = color;
        // serialization helper there's no easy way to extract the base color from a radial gradient
        this.rawNode.setAttributeNS(Namespace.LIVELY, "base-color", color.toString());
        this.action = action;
        this.helpText = helpText; // string to be displayed when mouse is brought over the icon
        return this;
    },

    restorePersistentState: function($super, importer) {
        $super(importer);
        // FIXME errors
        this.color = Color.parse(this.rawNode.getAttributeNS(Namespace.LIVELY, "base-color"));
    },

    handlesMouseDown: function() { return true; },

    onMouseDown: function(evt) {
        this.hideHelp();
        if (!this.action) {
            console.warn("%s has no action?", this);
            return;
        }
        return this.action.call(this.targetMorph, evt);
    },

    onMouseOver: function(evt) {
        this.setFill(new RadialGradient(Color.white, this.color));
        if (this.helpText) {
            this.showHelp(evt);
        }
    },
    
    onMouseOut: function(evt) {
        this.setFill(new RadialGradient(this.color.lighter(2), this.color));
        this.hideHelp();
    },
    
    onMouseMove: function(evt) {
        // really want onMouseLeave
        //console.log('got event %s', evt);
    },
    
    checkForControlPointNear: function() { return false; },
    
    okToBeGrabbedBy: function() { return null; },
    
    showHelp: function(evt) {
        if (this.suppressBalloonHelp) return;  // DI: maybe settable in window menu?
        // FIXME: The size of the balloon should be calculated based on string size
        if (!this.help) {
            this.help = new TextMorph(evt.mousePoint.extent(pt(80, 20)), this.helpText);
            this.help.beHelpBalloonFor(this);

        } else if (this.help.position() != evt.mousePoint) {
            this.help.setPosition(evt.mousePoint);
        }
        if (!this.help.owner) this.world().addMorph(this.help);
    },
    
    hideHelp: function() {
        if (this.help) this.help.remove();
    },
    
    setHelpText: function ( newText ) {
        this.helpText = newText;
    }
    
});

/**
 * @class WindowMorph: Full-fledged windows with title bar, menus, etc.
 */
Morph.subclass('WindowMorph', {

    state: "expanded",
    titleBar: null,
    targetMorph: null,
    
    initialize: function($super, targetMorph, headline, location) {
        var bounds = targetMorph.bounds().copy();
        var titleBar = this.makeTitleBar(headline, bounds.width);
        var titleHeight = titleBar.bounds().height;

        bounds.height += titleHeight;
        $super(location ? rect(location, bounds.extent()) : bounds, 'rect');
        this.targetMorph = this.addMorph(targetMorph);
        this.titleBar =  this.addMorph(titleBar);
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
        this.targetMorph = this.targetMorph;
        this.titleBar = this.titleBar;
        this.contentOffset = pt(0, this.titleBar.bounds().height);
    },
    
    makeTitleBar: function(headline, width) {
        // Overridden in TabbedPanelMorph
        return new TitleBarMorph(headline, width, this, false);
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
        var owner = this.owner;
        owner.addMorph(this.titleBar);
        this.titleBar.setTransform(this.collapsedTransform ? this.collapsedTransform : this.expandedTransform);
        this.titleBar.setRotation(this.titleBar.getRotation());  // see comment in HandMorph
        if (this.titleBar.collapsedExtent) this.titleBar.setExtent(this.titleBar.collapsedExtent);
        this.titleBar.enableEvents();
        this.titleBar.highlight(false);
        this.remove();
        this.state = "collapsed";
    },
    
    expand: function() {
        if (!this.isCollapsed()) return;
        this.collapsedTransform = this.titleBar.getTransform();
        this.titleBar.collapsedExtent = this.titleBar.innerBounds().extent();
        var owner = this.titleBar.owner;
        this.takeHighlight();
        owner.addMorph(this);
        this.setTransform(this.expandedTransform);        
        // this.titleBar.remove();  //next statement removes it from prior owner
        this.addMorph(this.titleBar);
        this.titleBar.setTransform(this.tbTransform)
        this.titleBar.setExtent(pt(this.innerBounds().width, this.titleBar.innerBounds().height));
        this.titleBar.setPosition(this.innerBounds().topLeft());
        this.titleBar.ignoreEvents();
        this.state = "expanded";
    },

    isCollapsed: function() { return this.state == "collapsed"; },

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

    onMouseDown: function(evt) { },

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
        if (!this.needsToComeForward(evt)) {
            return $super(evt, hasFocus)
        }
        return this.mouseHandler.handleMouseEvent(evt, this); 
    },

    okToBeGrabbedBy: function(evt) {
        this.takeHighlight();
        return this; 
    },

    takeHighlight: function() {
        // I've been clicked on.  unhighlight old top, and highlight me
        var oldTop = WorldMorph.current().topSubmorph();
        if (oldTop instanceof WindowMorph) oldTop.titleBar.highlight(false);
        this.titleBar.highlight(true);
    },
    // End of window promotion methods----------------

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

    adjustForNewBounds: function ($super) {
        $super();
        if (!this.titleBar || !this.targetMorph) return
        var titleHeight = this.titleBar.innerBounds().height;
        var bnds = this.innerBounds();
        var newWidth = bnds.extent().x;
        var newHeight = bnds.extent().y;
        this.titleBar.setExtent(pt(newWidth, titleHeight));
        this.targetMorph.setExtent(pt(newWidth, newHeight - titleHeight));
        this.titleBar.setPosition(bnds.topLeft());
        this.targetMorph.setPosition(bnds.topLeft().addXY(0, titleHeight));
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
var TabbedPanelMorph = WindowMorph.subclass("TabbedPanelMorph", {

    initialize: function($super, targetMorph, headline, location, sideName) {
        // A TabbedPanelMorph is pretty much like a WindowMorph, in that it is intended to 
        // be a container for applications that may frequently want to be put out of the way.
        // With windows, you collapse them to their title bars, with tabbed panels, you
        // click their tab and they retreat to the edge of the screen like a file folder.
        this.sideName = sideName ? sideName : "south";
        $super(targetMorph, headline, location);
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
        return new TitleTabMorph(headline, width, this, false);
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
var HandleMorph = (function () {

    // Counter for displaying balloon help only a certain number of times
    var helpCounter = 0;

    return Morph.subclass("HandleMorph", {

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

    initialize: function($super, location, shapeType, hand, targetMorph, partName) {
        $super(location.asRectangle().expandBy(5), shapeType);
        this.targetMorph = targetMorph;
        this.partName = partName; // may be a name like "topRight" or a vertex index
        this.initialScale = null;
        this.initialRotation = null; 
        return this;
    },

    showHelp: function(evt) {
        if (this.suppressBalloonHelp) return;  // DI: maybe settable in window menu?
        // Show the balloon help only if it hasn't been shown too many times already
        if (helpCounter < 20) {
            helpCounter ++;
            this.help = new TextMorph(evt.mousePoint.extent(pt(200, 20)), 
                this.shape instanceof RectShape ? this.controlHelpText : this.circleHelpText);
            this.help.beHelpBalloonFor(this);
            if (!this.help.owner) this.world().addMorph(this.help);
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
        if (!evt.isShiftDown() && !evt.isAltDown() && !evt.isCmdDown() &&
            // these hack tests should be replaced by receiver tests
            !(this.targetMorph instanceof WindowMorph || this.targetMorph.getType() instanceof TitleBarMorph)) {
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
        if (evt.isAltDown()) {
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
    
})})();

/**
 * @class SelectionMorph: The selection "tray" object that
 * allows multiple objects to be moved and otherwise manipulated
 * simultaneously. 
 */
var SelectionMorph = Morph.subclass("SelectionMorph", {
    
    borderWidth: 1,
    borderColor: Color.blue,
    fill: Color.secondary.blue,

    initialize: function($super, viewPort, defaultworldOrNull) {
        $super(viewPort, "rect");
        this.originalPoint = viewPort.topLeft();
        this.reshapeName = "bottomRight";
        this.selectedMorphs = [];
        this.initialSelection = true;
        this.shape.setFillOpacity(0.1);
        this.myWorld = defaultworldOrNull ? defaultworldOrNull : this.world();
        // this.shape.setAttributeNS(null, "stroke-dasharray", "3,2");
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
            this.setBounds(this.originalPoint.asRectangle())
        } else { this.reshapeName = partName; }

        $super(this.reshapeName, newPoint, handle, lastCall);
        this.selectedMorphs = [];
        this.owner.submorphs.each(function(m) {
            if (m !== this && this.bounds().containsRect(m.bounds())) this.selectedMorphs.push(m);
        }.bind(this));
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
        SelectionMorph.superclass.prototype.remove.call(this);
    },
    
    copyToHand: function(hand) { 
        this.selectedMorphs.invoke('copyToHand', hand);
    },
    
    setBorderWidth: function($super, width) { 
        if (this.selectedMorphs.length == 0) {
            $super(width);
        } else { 
            this.selectedMorphs.invoke('setBorderWidth', width);
            for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
                if (this.selectedMorphs[i].hasSubmorphs()) {
                    this.selectedMorphs[i].withAllSubmorphsDo(function() {this.setBorderWidth(width)}, null);
                }
            }
        }
    },
    
    setFill: function($super, color) { 
        if (this.selectedMorphs.length==0) {
            $super(color);
        } else {
            this.selectedMorphs.invoke('setFill', color);
            for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
                if (this.selectedMorphs[i].hasSubmorphs()) {
                    this.selectedMorphs[i].withAllSubmorphsDo(function() {this.setFill(color)}, null);
                }
            }
        }
    },
    
    setBorderColor: function($super, color) { 
        if (this.selectedMorphs.length==0) {
            $super(color);
        } else {
            this.selectedMorphs.invoke('setBorderColor', color);
            for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
                if (this.selectedMorphs[i].hasSubmorphs()) {
                    this.selectedMorphs[i].withAllSubmorphsDo(function() {this.setBorderColor(color)}, null);
                }
            }
        }
    },
    
    setFillOpacity: function($super, op) { 
        if (this.selectedMorphs.length==0) {
            $super(op);
        } else { 
            this.selectedMorphs.invoke('setFillOpacity', op);
            for ( var i = 0; i < this.selectedMorphs.length; i++ ) {
                if (this.selectedMorphs[i].hasSubmorphs()) {
                    this.selectedMorphs[i].withAllSubmorphsDo(function() {this.setFillOpacity(op)}, null);
                }
            }
        }
    },
    
    setStrokeOpacity: function($super, op) { 
        if (this.selectedMorphs.length==0) {
            $super(op);
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
        console.log('ok');
        for (var i = 0; i < this.selectedMorphs.length; i++ ) {
            this.addMorph(this.selectedMorphs[i]);
        }
        $super(scale);
        for (var i = 0; i < this.selectedMorphs.length; i++ ) {
            this.world().addMorph(this.selectedMorphs[i]);
        }
    },
    
    okToBeGrabbedBy: function(evt) {
        this.selectedMorphs.each( function(m) { evt.hand.addMorph(m); } );
        return this;
    }
    
});

// ===========================================================================
// Panels, lists, menus, sliders, panes, etc.
// ===========================================================================

/**
 * @class PanelMorph
 */
Morph.subclass("PanelMorph", {

    initialize: function($super, extent/*:Point*/) {
        $super(pt(0, 0).extent(extent), 'rect');
        this.lastNavigable = null;
        this.priorExtent = this.innerBounds().extent();
    },

    takesKeyboardFocus: function() {
        return true;
    },

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
        //     ['leftPane', ListPane, new Rectangle(0, 0, 0.5, 0.6)],
        // See example calls in, eg, SimpleBrowser.buildView() for how to use this
        var panel = new PanelMorph(extent);
        panel.setFill(Color.primary.blue.lighter().lighter());
        panel.setBorderWidth(2);

        paneSpecs.each( function(spec) {
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
var CheapListMorph = TextMorph.subclass("CheapListMorph", {
    
    borderColor: Color.black,
    wrap: WrapStyle.NONE,
    
    initialize: function($super, initialBounds, itemList) {
        // itemList is an array of strings
        // Note:  A proper ListMorph is a list of independent submorphs
        // CheapListMorphs simply leverage Textmorph's ability to display
        // multiline paragraphs, though some effort is made to use a similar interface.
        var listText = itemList ? itemList.join("\n") : "";
        $super(initialBounds, listText);
        this.itemList = itemList;
        // this default self connection may get overwritten by, eg, connectModel()...
        var model = new SimpleModel(null, "List", "Selection");
        this.modelPlug = model.makePlug();
        this.addNonMorph(this.modelPlug.rawNode);
        this.setModelValue('setList', itemList);
        //console.log('model now %s', this.modelPlug.model);
        if (!this.font) alert("wha, null font in %s".format(this));
        this.layoutChanged();
        return this;
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
    
    takesKeyboardFocus: function() { 
        return true;
    },

    onKeyPress: function(evt) {
        // nothing
    },

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
        }

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
        return this.lineNo(this.getCharBounds(this.selectionRange[0]));
    },
    
    showsSelectionWithoutFocus: function() { 
        return true;  // Overridden in, eg, Lists
    },

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

/**
 * @class MenuMorph: Popup menus
 */ 
var MenuMorph = CheapListMorph.subclass("MenuMorph", {

    borderColor: Color.blue,
    borderWidth: 0.5,
    fill: Color.blue.lighter(5),

    initialize: function($super, items, targetMorph, lines) {
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
        //console.log('what, font is %s in %s', this.font, this);
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
            var label = new TextMorph(new Rectangle(0, 0, 200, 20), captionIfAny);
            label.setWrapStyle(WrapStyle.SHRINK);  
            label.fitText();
            label.shape.roundEdgesBy(4);
            label.shape.setFillOpacity(0.75);
            label.align(label.bounds().bottomCenter(), this.shape.bounds().topCenter());
            this.addMorph(label);
        }
        // If menu and/or caption is off screen, move it back so it is visible
        var menuRect = this.bounds();  //includes caption if any
        // Intersect with world bounds to get visible region.  Note we need shape.bounds,
        // since world.bounds() would include stick-outs, including this menu!
        var visibleRect = menuRect.intersection(this.owner.shape.bounds()); 
        var delta = visibleRect.topLeft().subPt(menuRect.topLeft());  // delta to fix topLeft off screen
        delta = delta.addPt(visibleRect.bottomRight().subPt(menuRect.bottomRight()));  // same for bottomRight
        if (delta.dist(pt(0,0)) > 1) this.moveBy(delta);  // move if significant

        // Note menu gets mouse focus by default if pop-up.  If you don't want it, you'll have to null it
        if (!remainOnScreen) world.firstHand().setMouseFocus(this);
    },

    compose: function(location) { 
        var itemNames = this.items.map(function (item) { return item[0] });

        CheapListMorph.prototype.initialize.call(this, location.extent(pt(200, 200)), itemNames);

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
 * @class SliderMorph: Slider/scroll control
 */ 
var SliderMorph = Morph.subclass("SliderMorph", {

    initialize: function($super, initialBounds, scaleIfAny) {
        $super(initialBounds, "rect");
        var model = new SimpleModel(null, "Value", "Extent");
        // this default self connection may get overwritten by, eg, connectModel()...
        this.modelPlug = model.makePlug();
        this.addNonMorph(this.modelPlug.rawNode);

        this.scale = (scaleIfAny == null) ? 1.0 : scaleIfAny;
        var slider = new Morph(new Rectangle(0, 0, 8, 8), "rect");
        slider.relayMouseEvents(this, {onMouseDown: "sliderPressed", onMouseMove: "sliderMoved", onMouseUp: "sliderReleased"});
        this.slider = this.addMorph(slider);
        // this.linkToStyles(['slider']);
        this.adjustForNewBounds(); 
        return this;
    },

    initializeTransientState: function($super, initialBounds) {
        $super(initialBounds);
        // FIXME make persistent ?
        this.linkToStyles(['slider']);
    },

    restorePersistentState: function($super, importer) {
        $super(importer);
        this.slider = this.slider;
        //console.log("SliderMorph restored slider %s", this.slider);
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
    
    applyStyle: function($super, spec) {
        this.baseColor = Color.primary.blue;
        this.fillType = "simple";
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
            this.setFill(new LinearGradient(this.baseColor.lighter(2), this.baseColor, direction));
            this.slider.setFill(new LinearGradient(this.baseColor.lighter(), this.baseColor.darker(), direction));
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
        var ext = this.getSliderExtent();
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
    
    handlesMouseDown: function(evt) { return !evt.isAltDown(); },
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
        return Math.min(1.0,Math.max(0,0,val.roundTo(0.001))); 
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
        if (this.modelPlug) return this.getModelValue('getSliderExtent',(0.0));
    },

    takesKeyboardFocus: function() { 
        // unlike, eg, cheapMenus
        return true; 
    },
    
    setHasKeyboardFocus: function(newSetting) { 
        return newSetting; // no need to remember
    },

    onKeyPress: function(evt) {
        // nothing
    },

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
var ScrollPane = Morph.subclass("ScrollPane", {

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
        this.scrollBar.connectModel({model: this, getValue: "getScrollPosition", setValue: "setScrollPosition", 
                                getSliderExtent: "getVisibleExtent"});

        // suppress handles throughout
        [this, this.clipMorph, morphToClip, this.scrollBar].map(function(m) {m.suppressHandles = true});
        return this;
    },
    
    innerMorph: function() {
        return this.clipMorph.submorphs.first();
    },

    connectModel: function(plugSpec) { // connection is mapped to innerMorph
        this.innerMorph().connectModel(plugSpec);
        if (plugSpec.getMenu) this.addMenuButton(plugSpec.getMenu);
    },
    
    addMenuButton: function(modelMsg) {
        this.paneMenuMessage = modelMsg;
        var w = this.scrollBarWidth;
        this.menuButton = this.addMorph(new Morph(new Rectangle(0, 0, w, w)));
        this.menuButton.setFill(Color.white);
        // Make it look like 4 tiny lines of text (doesn't work yet...)
        var p0 = this.menuButton.innerBounds().topLeft().addXY(2, 2);
        for (var i=1; i<=4; i++) {
            var line = Morph.makeLine([pt(0, i*2), pt([6, 2, 4, 6][i-1], i*2)], 1, Color.black);
            line.translateBy(p0);
            this.menuButton.addMorph(line);
            line.ignoreEvents();
        }
        this.menuButton.setPosition(this.scrollBar.getPosition());
        if (this.scrollBar) this.menuButton.setFill(this.scrollBar.getFill());
        this.menuButton.relayMouseEvents(this, {onMouseDown: "menuButtonPressed"});
        this.scrollBar.setBounds(this.scrollBar.bounds().withTopLeft(
        this.scrollBar.bounds().topLeft().addXY(0, w)));
    },

    menuButtonPressed: function(evt, button) {
        evt.hand.setMouseFocus(null);
        var menu = this.innerMorph().getModel()[this.paneMenuMessage]();
        if (!menu) return;
        menu.openIn(WorldMorph.current(), evt.mousePoint, false); 
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
    },
    
    adjustForNewBounds: function ($super) {
        // Compute new bounds for clipMorph and scrollBar
        $super();
        if (!this.clipMorph || !this.scrollBar) return;
        var bnds = this.innerBounds();
        var clipR = bnds.withWidth(bnds.width - this.scrollBarWidth+1).insetBy(1);
        this.clipMorph.setExtent(clipR.extent());
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

/**
 * @class ListPane
 */ 
function ListPane(initialBounds) {
    return new ScrollPane(new CheapListMorph(initialBounds,["-----"]), initialBounds); 
};

/**
 * @class TextPane
 */ 
function TextPane(initialBounds, defaultText) {
    return new ScrollPane(new TextMorph(initialBounds, defaultText), initialBounds); 
};

/**
 * @class PrintPane
 */ 
function PrintPane(initialBounds, defaultText) {
    return new ScrollPane(new PrintMorph(initialBounds, defaultText), initialBounds); 
};

// ===========================================================================
// Utility widgets
// ===========================================================================

/**
 * @class ColorPickerMorph
 */ 
var ColorPickerMorph = Morph.subclass("ColorPickerMorph", {

    fill: null,
    borderWidth: 1, 
    borderColor: Color.black,

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
        for (var x = 0; x < r.width; x+=dd) {
            for (var y = 0; y < r.height; y+=dd) { // lightest down to neutral
                var patchFill = this.colorMap(x, y, rh2, this.colorWheel(r.width + 1)).toString();
                var element = new RectShape(new Rectangle(x + r.x, y + r.y, dd, dd), patchFill, 0, null);
                // element.setAttributeNS("fill", this.colorMap(x, rh2, rh2, this.colorWheel(r.width + 1)).toString());
                this.addNonMorph(element.rawNode);
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
        return !evt.isAltDown();
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

/**
 * @class XenoMorph
 */ 
Morph.subclass('XenoMorph', {
    
    borderWidth: 2,
    fill: Color.gray.lighter(),

    initialize: function($super, bounds, url) { 
        $super(bounds, "rect"); 
        this.foRawNode = NodeFactory.createNS(Namespace.SVG, "foreignObject", 
                             {x: bounds.x, y: bounds.y, 
                              width: bounds.width,
                              height: bounds.height });

        var body = this.foRawNode.appendChild(NodeFactory.createNS(Namespace.XHTML, "body"));
        body.appendChild(document.createTextNode("no content"));
        new NetRequest({

            //contentType: 'text/xml',
            contentType: 'text/xml',
    
            onSuccess: function(transport) {
                console.log('transmission dump %s', 
                    transport.responseXML ? Exporter.nodeToString(transport.responseXML) : transport.responseText);
                var node;
                if (!transport.responseXML) {
                    var parser = new DOMParser();
                    var xhtml = parser.parseFromString(transport.responseText, "text/xml");
                    node = xhtml.getElementsByTagName("body")[0];
                } else {
                    node = transport.responseXML.documentElement;
                }
                var parent = body.parentNode;
                parent.removeChild(body);
                parent.appendChild(document.adoptNode(node));

            }.logErrors('Success Handler for XenoMorph ' + url)
        }).get(url);

        this.foRawNode.appendChild(body);
        this.addNonMorph(this.foRawNode);
    },

    adjustForNewBounds: function($super) {
        $super();
        var bounds = this.shape.bounds();
        this.foRawNode.setAttributeNS(null, "width", bounds.width);
        this.foRawNode.setAttributeNS(null, "height", bounds.height);
    },
    
    test: function(url) {
        url = url || "http://livelykernel.sunlabs.com/test.xhtml";
        var xeno = new XenoMorph(pt(0, 0).extent(pt(400,200)), url);
        WorldMorph.current().addMorphAt(new WindowMorph(xeno, url), pt(50,50));
    }

});

console.log('loaded Widgets.js');

