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

    // A ButtonMorph is the simplest widget
    // It read and writes the boolean variable, this.model[this.propertyName]
    initialize: function(initialBounds) {
        ButtonMorph.superClass.initialize.call(this, initialBounds, "rect");
        // Styling
        this.setModelValue('setValue', false);
        this.changeAppearanceFor(false);
        this.setToggle(false); // if true each push toggles the model state 
        return this;
    },

    initializeTransientState: function(initialBounds) {
        ButtonMorph.superClass.initializeTransientState.call(this, initialBounds);
        // FIXME make persistent
        // this default self connection may get overwritten by, eg, connectModel()...
        var model = new SimpleModel(this, "Value");

        this.modelPlug = model.makePlug();
        this.baseColor = this.defaultFill;
        this.linkToStyles(['button']);

    },

    // simple way of making values persistent: map to attributes

    // KP: FIXME general way of declaring properties mapping to attributes
    setToggle: function(flag) {
        this.setAttribute("toggle", !!flag);
    },

    isToggle: function() {
        var value = this.getAttribute("toggle");
        if (value && value == 'true') return true;
        else return false;
    },

    restoreFromMarkup: function(importer) {
        ButtonMorph.superClass.restoreFromMarkup.call(this, importer);
        this.updateView('all');
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
        var base = value ? this.baseColor.lighter() : this.baseColor;
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

    restoreFromMarkup: function(importer) {
        ImageMorph.superClass.restoreFromMarkup.call(this, importer);
    },

    loadGraphics: function(localURL, scale) {
        if (this.image && this.image.tagName == 'image') {
            this.removeChild(this.image);
            this.image = null;
        }

        this.setFill(null);
        this.image = NodeFactory.create("use").withHref(localURL);

        if (scale) {
            this.image.applyTransform(Transform.createSimilitude(pt(0, 0), 0, scale));
        }
        
        this.addChildElement(this.image);
    },
    
    loadURL: function(url) {
        if (this.image && this.image.tagName != 'image') {
            this.removeChild(this.image);
            this.image = null;
        }

        if (!this.image) {
            this.image = NodeFactory.create("image", { width: this.dim.x, height: this.dim.y});
            this.image.disableBrowserDrag();
            this.addChildElement(this.image);
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
    barHeight: 20,
    controlSpacing: 3,
    defaultBorderWidth: 0.5,

    initialize: function(headline, windowWidth, windowMorph, isExternal) {
        this.windowMorph = windowMorph;
        const bh = this.barHeight;
        const spacing = this.controlSpacing;
        TitleBarMorph.superClass.initialize.call(this, Rectangle(0, isExternal? - bh : 0, 
                                                 windowWidth, bh), "rect");
        this.linkToStyles(['titleBar']);
        // this.setFill(LinearGradient.makeGradient(Color.primary.blue, Color.primary.blue.lighter(3)));
        this.ignoreEvents();

        var cell = Rectangle(0, 0, bh, bh);
        var closeButton = WindowControlMorph(cell, spacing, Color.primary.orange, windowMorph, 
            function() { this.initiateShutdown(); }, "Close");
        this.addMorph(closeButton);

        // FIXME this should be simpler
        var sign = NodeFactory.create("use").withHref("#CloseIcon");

        sign.applyTransform(Transform.createSimilitude(pt(-9, -9), 0, 0.035));
        closeButton.addChildElement(sign);

        cell = cell.translatedBy(pt(bh - spacing, 0));
        var menuButton = WindowControlMorph(cell, spacing, Color.primary.blue, windowMorph, 
            function(evt) { this.targetMorph.showMorphMenu(evt); }, "Menu");
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

        // var font = FontInfo.forFamily(TextMorph.prototype.fontFamily, TextMorph.prototype.fontSize);

        var label;
        if (headline instanceof TextMorph) {
            label = headline;
        } else { // String
            var width = headline.length * 8; // wild guess headlineString.length * 2 *  font.getCharWidth(' ') + 2;
            label = TextMorph.makeLabel(Rectangle(0, 0, width, bh), headline);
        }

        label.align(label.bounds().topCenter(), this.shape.bounds().topCenter());
        this.addMorph(label);
        return this;
    },

    handlesMouseDown: function(evt) {return false },  // hack for now

    acceptsDropping: function(morph) {
        return morph instanceof WindowControlMorph; // not used yet... how about text...
    },

    okToBeGrabbedBy: function(evt) {
        return this.windowMorph.isCollapsed() ? this : this.windowMorph;
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
        MouseOverHandler.observe(this);
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
        if (this.helpText) {
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
        // FIXME: The size of the balloon should be calculated based on string size
        this.help = TextMorph(Rectangle(evt.x, evt.y, 80, 20), this.helpText);
        // trying to relay mouse events to the WindowControlMorph
        this.help.relayMouseEvents(this, {onMouseDown: "onMouseDown", onMouseMove: "onMouseMove", onMouseUp: "onMouseUp"});
        // some eye candy for the help
        this.help.shape.roundEdgesBy(15);
        this.help.setFill(Color.primary.yellow.lighter(3));
        this.help.shape.setFillOpacity(0.8);
        this.world().addMorph(this.help);
    },
    
    hideHelp: function() {
        if (this.help) this.help.remove();
    },
    
    setHelpText: function ( newText ) {
        this.helpText = newText;
    }
    
});

/**
 * @class WindowMorph: Full-fledged windows with title bar, etc.
 */
  
WindowMorph = HostClass.create('WindowMorph', Morph);
Object.extend(WindowMorph, {
    EXPANDED: "expanded",
    COLLAPSED: "collapsed",
    SHUTDOWN: "shutdown"
});

Object.extend(WindowMorph.prototype, {

    state: WindowMorph.EXPANDED,
    titleBar: null,
    targetMorph: null,
    
    initialize: function(targetMorph, headline, location) {
        var bounds = targetMorph.bounds().clone();
        var titleBar = TitleBarMorph(headline, bounds.width, this, false);
        var titleHeight = titleBar.bounds().height;

        bounds.height += titleHeight;
        WindowMorph.superClass.initialize.call(this, location ? rect(location, bounds.extent()) : bounds, 'rect');
        this.targetMorph = targetMorph;
        this.titleBar = titleBar;
        this.addMorph(this.titleBar);
        bounds.y -= titleHeight;
        targetMorph.translateBy(bounds.topLeft().negated());
        this.addMorph(targetMorph);
        this.linkToStyles(['window']);
        return this;
    },

    toggleCollapse: function() {
        return this.isCollapsed() ? this.expand() : this.collapse();
    },
    
    collapse: function() { 
        if (this.isCollapsed()) {
            console.log('collapsing collapsed window %s?', this);
            return;
        }
        
        this.expandedPosition = this.position();
        var owner = this.owner();

        this.remove();
        owner.addMorph(this.titleBar);

        if (this.collapsedPosition) { 
            this.titleBar.setPosition(this.collapsedPosition);
        } else { 
            this.titleBar.setPosition(this.expandedPosition);
        }

        this.state = WindowMorph.COLLAPSED;
        // this.titleBar.enableEvents();
    },
    
    isCollapsed: function() {
        return this.state === WindowMorph.COLLAPSED;
    },
    
    isShutdown: function() {
        return this.state === WindowMorph.SHUTDOWN;
    },

    expand: function() {
        if (!this.isCollapsed()) {
            console.log('expanding expanded window %s?', this);
            return;
        }
        
        this.collapsedPosition = this.titleBar.position();
        var owner = this.titleBar.owner();
        this.titleBar.remove();
        this.setPosition(this.expandedPosition);        
        owner.addMorph(this);
        this.addMorph(this.titleBar);
        this.titleBar.setPosition(pt(0,0))

        //this.titleBar.ignoreEvents();
        this.state = "expanded";
        //this.action = collapse;
    },

    initiateShutdown: function() {
        this.state = WindowMorph.SHUTDOWN;
        this.targetMorph.shutdown(); // shutdown may be prevented ...
        this.remove();
        return true;
    },

    updateView: function(aspect, controller) {
        var plug = this.modelPlug;
        
        if (!plug) return;
        
        if (aspect == plug.getState) {
            //this.loadURL(this.getModelValue('getURL', ""));
            var state = this.getModelValue('getState', "");
            switch (state) {
            case WindowMorph.EXPANDED:
                if (this.isCollapsed()) this.expand();
                break;
            case WindowMorph.COLLAPSED:
                if (!this.isCollapsed()) this.collapse();
                break;
            case WindowMorph.SHUTDOWN:
                if (!this.isShutdown()) this.initiateShutdown();
                break;
            }
        }
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

    onMouseDown: function(evt) {
        if (evt.altKey) {
            // this.showMorphMenu(evt);
            // if (evt.hand.shiftKeyPressed) this.showColorPicker(evt.mousePoint,this.targetMorph,evt.hand,"setBorderColor");
            // else this.showColorPicker(evt.mousePoint,this.targetMorph,evt.hand,"setFill"); 
            if (evt.shiftKey) {
                this.initialScale = this.targetMorph.getScale();
                // console.log('initial scale ' + this.initialScale + ' initial rotation ' + this.targetMorph.getRotation());
                this.initialRotation = this.targetMorph.getRotation();
            }
        }
        this.hideHelp();
    },
    
    onMouseUp: function(evt) {
        if (!evt.shiftKey && !evt.altKey && !evt.cmdKey) {
            // last call for, eg, vertex deletion
            this.targetMorph.reshape(this.partName, this.bounds().center(), this, true); 
        }
    
        evt.hand.setMouseFocus(null);
        // console.log('removing ' + this.inspect());
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

        var p0 = evt.hand.lastMouseDownPoint;
        var p1 = evt.mousePoint;

        if (evt.altKey) {
            // ctrl-drag for rotation (unshifted) and scale (shifted)
            var ctr = this.targetMorph.owner().worldPoint(this.targetMorph.origin); //origin for rotation and scaling
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
                this.targetMorph.reshape(this.partName, this.targetMorph.localize(evt.mousePoint), this, false);
            } 
        }
    },
    
    showColorPicker: function(loc, target, hand, functionName) { 
        // Need proper logic here to place color picker visible, yet clear of the damage rect
        // Want to align opposite corner of picker with designated corner of handle
        var picker = ColorPickerMorph(loc.addXY(5,5).extent(pt(50,30)),target,functionName,true);
        var world = this.world(); 
        this.remove();
        hand.setMouseFocus(picker);
        this.world().addMorph(picker);
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
        this.selectedMorphs = [];
        this.shape.setFillOpacity(0.1);
        if (defaultworldOrNull == null) {
            this.myWorld = this.world();
        } else {
            this.myWorld = defaultworldOrNull;
        }
        // this.shape.setAttributeNS(null, "stroke-dasharray", "3,2");
        return this;
    },
    
    reshape: function(partName, newPoint, handle, lastCall) {
        SelectionMorph.superClass.reshape.call(this, partName, newPoint, handle, lastCall);
        this.selectedMorphs = [];
        this.owner().submorphs.each((function(m) {
            var p1 = m.bounds().topLeft();
            var p2 = m.bounds().bottomRight();
            if (this.bounds().containsPoint(p1) && this.bounds().containsPoint(p2))
                if (m !== this) this.selectedMorphs.push(m);
            }).bind(this));
            
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
        evt.hand.setMouseFocus(this);
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
            console.log('navigate to next submorph from %s (%s) to %s', current, current.nextNavigableSibling);
        } else {
            console.log('current focus %s, nowhere to go navigate next', current);
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

/**
 * @class CheapListMorph
 */ 

CheapListMorph = HostClass.create('CheapListMorph', TextMorph);

Object.extend(CheapListMorph.prototype, {
    
    defaultBorderColor: Color.black,
    wrap: 'noWrap',

    initialize: function(initialBounds, itemList) {
        // itemList is an array of strings
        // Note:  A proper ListMorph is a list of independent submorphs
        // CheapListMorphs simply leverage Textmorph's ability to display
        // multiline paragraphs, though some effort is made to use a similar interface.
    
        var listText = itemList ? itemList.join("\n") : "";
        CheapListMorph.superClass.initialize.call(this, initialBounds, listText);

        this.itemList = itemList;
        this.setModelValue('setList', itemList);
        //console.log('model now %s', this.modelPlug.model);
        this.layoutChanged();
        return this;
    },

    initializeTransientState: function(initialBounds) {
        CheapListMorph.superClass.initializeTransientState.call(this, initialBounds);
        // FIXME make persistent
        // this default self connection may get overwritten by, eg, connectModel()...
        var model = new SimpleModel(null, 'List', 'Selection');
        this.modelPlug = model.makePlug();
    },

    restoreFromMarkup: function(importer) {
        CheapListMorph.superClass.restoreFromMarkup.call(this, importer);
        this.itemList = this.textString.split('\n');
        this.updateView('all');
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
        evt.hand.setMouseFocus(this);
        this.requestKeyboardFocus(evt.hand);
        this.selectLineAt(this.charOfY(this.localize(evt.mousePoint))); 
    },

    onMouseMove: function(evt) {  
        if (!evt.mouseButtonPressed) return;

        var mp = this.localize(evt.mousePoint);

        if (!this.shape.bounds().containsPoint(mp)) this.selectLineAt(-1);
        else this.selectLineAt(this.charOfY(mp)); 
    },

    onMouseUp: function(evt) {
        evt.hand.setMouseFocus(null);
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
    },

});

/**
 * @class MenuMorph
 */ 

MenuMorph = HostClass.create('MenuMorph', CheapListMorph);

Object.extend(MenuMorph.prototype, {

    defaultBorderColor: Color.blue,
    defaultBorderWidth: 0.5,
    defaultFill: Color.blue.lighter(5),

    initialize: function(items, lines) {
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
        this.lines = lines ? lines : [];
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

    removeItemsNamed: function(nameList) {
        nameList.each(function(n) { this.removeItemNamed(n); }.bind(this));
    },

    keepOnlyItemsNamed: function(nameList) {
        var rejects = [];
	this.items.each( function(item) { if(nameList.indexOf(item[0]) < 0) rejects.push(item[0])});
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
            label.wrap = "shrinkWrap";  label.fitText();
            label.shape.roundEdgesBy(4);
            label.shape.setFillOpacity(0.75);
            label.align(label.bounds().bottomCenter(), this.shape.bounds().topCenter());
            this.addMorph(label);
        }
    },

    compose: function(location) { 
        var itemNames = this.items.map(function (item) { return item[0] });
        MenuMorph.superClass.initialize.call(this, location.extent(pt(200, 200)), itemNames);
        this.wrap = "shrinkWrap";  this.fitText(); // first layout is wasted!


        // styling
        this.textColor = Color.blue;
        //this.setFill(StipplePattern.create(Color.white, 3, Color.blue.lighter(5), 1));
        this.shape.roundEdgesBy(6);
        this.shape.setFillOpacity(0.75);
    },

    onMouseUp: function(evt) {
        if (!this.hasNullSelection()) var item = this.items[this.selectedLineNo()];
        this.setNullSelectionAt(0);  // Clean up now, in case the call fails
        evt.hand.setMouseFocus(null);
        if (!this.stayUp) this.remove(); 

        if (item) { // Now execute the menu item...
	    if (item[1] instanceof Function) { // alternative style, items ['menu entry', function] pairs
		item[1].call(this, evt);
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

    initialize: function(initialBounds, scaleIfAny) {
        SliderMorph.superClass.initialize.call(this, initialBounds, "rect");
        this.scale = (scaleIfAny == null) ? 1.0 : scaleIfAny;

        var slider = Morph(Rectangle(0, 0, 8, 8), "rect");
        slider.relayMouseEvents(this, {onMouseDown: "sliderPressed", onMouseMove: "sliderMoved", onMouseUp: "sliderReleased"});
        this.setNamedMorph("slider", slider);
        this.adjustForNewBounds(); 
    
        return this;
    },

    initializeTransientState: function(initialBounds) {
        SliderMorph.superClass.initializeTransientState.call(this, initialBounds);
        // this default self connection may get overwritten by, eg, connectModel()...
        var model = new SimpleModel(null, 'Value', 'Extent');
        this.modelPlug = model.makePlug();
    },

    restoreFromMarkup: function(importer) {
        SliderMorph.superClass.restoreFromMarkup.call(this, importer);
        this.slider = this.getNamedMorph('slider');
        if (!this.slider) {
            console.warn('no slider in %s, %s', this, this.textContent);
           return;
        }
        console.log('slider %s', this.slider);
        this.slider.relayMouseEvents(this, {onMouseDown: "sliderPressed", onMouseMove: "sliderMoved", onMouseUp: "sliderReleased"});
        this.scale = 1.0; // FIXME restore from markup
        //this.adjustForNewBounds();
    },

    vertical: function() {
        var bnds = this.shape.bounds();
        return bnds.height > bnds.width; 
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
    
        var direction = this.vertical() ? LinearGradient.EastWest : LinearGradient.NorthSouth;
        this.setFill(LinearGradient.makeGradient(Color.primary.blue.lighter().lighter(),
                     Color.primary.blue, direction));
        this.slider.setFill(LinearGradient.makeGradient(Color.primary.green.lighter().lighter(), 
                            Color.primary.green, direction));
    },
    
    sliderPressed: function(evt, slider) {
        //    Note: want setMouseFocus to also cache the transform and record the hitPoint.
        //    Ideally thereafter only have to say, eg, morph.setPosition(evt.hand.adjustedMousePoint)
        this.hitPoint = this.localize(evt.mousePoint).subPt(this.slider.bounds().topLeft());
        evt.hand.setMouseFocus(slider); 
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

    sliderReleased: function(evt, slider) { evt.hand.setMouseFocus(null) },
    
    handlesMouseDown: function(evt) { return !evt.altKey; },
    
    onMouseDown: function(evt) {
        evt.hand.setMouseFocus(this);
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
    
    onMouseUp: function(evt) {
        evt.hand.setMouseFocus(null);
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
        console.log('handled evt %s value now %s', evt, this.getValue());
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

    initialize: function(morphToClip, initialBounds) {
        ScrollPane.superClass.initialize.call(this, initialBounds, "rect");
    
        var bnds = this.shape.bounds();
        var scrollBarWidth = 14;
        var clipR = bnds.withWidth(bnds.width - scrollBarWidth).insetBy(1);
    
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
    var pane = ScrollPane(CheapListMorph(initialBounds,["-----"]), initialBounds); 
    pane.setType("ListPane");
    return pane;
};

/**
 * @class TextPane
 */ 

function TextPane(initialBounds, defaultText) {
    var pane = ScrollPane(TextMorph(initialBounds, defaultText), initialBounds); 
    pane.setType("TextPane");
    return pane;
};

/**
 * @class PrintPane
 */ 

function PrintPane(initialBounds, defaultText) {
    var pane = ScrollPane(PrintMorph(initialBounds, defaultText), initialBounds); 
    pane.setType("PrintPane");
    return pane;
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
        evt.hand.setMouseFocus(null);
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
        var m = this.morphToGrabOrReceive(evt);
        if (m == null) { this.makeSelection(evt); return true; }
        if (m.handlesMouseDown(evt)) return false;
        evt.hand.grabMorph(m, evt);
        return true; 
    },

    makeSelection: function(evt) {  //default behavior is to grab a submorph
        if (this.world().currentSelection != null) this.world().currentSelection.removeOnlyIt();
        if ( !evt.hand.mouseButtonPressed ) return;
        var m = SelectionMorph(evt.mousePoint.extent(pt(5,5)));
        this.world().addMorph(m);
        this.world().currentSelection = m;
        var handle = HandleMorph(evt.mousePoint, "rect", evt.hand, m, "bottomRight");
        m.addMorph(handle);
        handle.setBounds(handle.bounds().center().asRectangle());
        if (evt.hand.mouseFocus instanceof HandleMorph) evt.hand.mouseFocus.remove();
        evt.hand.setMouseFocus(handle);
    }
    
});

/**
 * @class WorldMorph: A Morphic world
 */ 

WorldMorph = HostClass.create('WorldMorph', PasteUpMorph);

Object.extend(WorldMorph, {
    
    worldCount: 0,

    currentWorld: null,
    
    current: function() {
        return WorldMorph.currentWorld;
    },

    setCurrent: function(newWorld) {
        WorldMorph.currentWorld = newWorld;
    },

    // Create an empty world
    createEmptyWorld: function() {
        var w = WorldMorph('canvas');
        // w.displayTheme = WorldMorph.defaultThemes; // * wrong
        // w.applyStyle(); // Because it wasnt there until now
        // w.setFill(StipplePattern.create(Color.neutral.lightGray, 6, new Color(0.83, 0.83, 0.83), 1));
        // w.setFill(LinearGradient({x1:0, y1:0, x2:400, y2:300}).addStop(0, Color.white).addStop("50%", new Color(102/255, 102/255, 136/255)).addStop("400", Color.black));

        // This style is way better for debugging on smaller screens
        // It allows the user to see the console log through the world
        w.shape.setFillOpacity(0.9);

        return w;
    },

    // NOT needed since main calls createEmptyWorld and samples have been moved to main.js
    // Set up a world with morphs to copy
    // FIXME: This is sample code and should be moved elsewhere!
    /*createPrototypeWorld: function() {
       
        var w = this.createEmptyWorld();
        
        return w; 
    },*/

    // Default styles for the style manager    
    defaultThemes: { // --Style architecture is under construction!--
        primitive: { // This is to be the simples widgets -- flat fills and no rounding or translucency
            styleName:   'primitive',
            window:      { rounding: 0 },
            titleBar:    { rounding: 0, borderWidth: 2, bordercolor: Color.black,
            fill:        Color.primary.blue.lighter()},
            panel:       {  },
            vslider:     { borderColor: Color.black, borderWidth: 1, fill: Color.blue.lighter()},
            hslider:     { borderColor: Color.black, borderWidth: 1, fill: Color.blue.lighter()},
            elevator:    { borderColor: Color.black, borderWidth: 1, fill: Color.green.lighter(2)},
            button:      { borderColor: Color.black, borderWidth: 1, rounding: 0,
            baseColor:   Color.neutral.gray, fillType: "simple" },
            widgetPanel: { borderColor: Color.red, borderWidth: 2, rounding: 0,
            fill:        Color.blue.lighter(), opacity: 1},
            clock:       { size: 100, borderColor: Color.green.lighter(), borderWidth: 1,
            fill:        Color.yellow, roman: true},
            link:        { borderColor: Color.green, borderWidth: 1, fill: Color.blue}
        },

        lively: { // This is to be the style we like to show for our personality
            styleName: 'lively',
            window:      { rounding: 8 },
            titleBar:    { rounding: 8, borderWidth: 2, bordercolor: Color.black,
            fill:        LinearGradient.makeGradient(Color.primary.blue, Color.primary.blue.lighter(3))},
            panel:       {  },
            vslider:     { borderColor: Color.black, borderWidth: 1, 
                           fill: LinearGradient.makeGradient(Color.primary.blue.lighter().lighter(), Color.primary.blue, LinearGradient.EastWest)},
            hslider:     { borderColor: Color.black, borderWidth: 1,
                           fill: LinearGradient.makeGradient(Color.primary.blue.lighter().lighter(), Color.primary.blue, LinearGradient.NorthSouth)},
            elevator:    { borderColor: Color.green.lighter(), borderWidth: 1},
            button:      { borderColor: Color.neutral.gray, borderWidth: 0.3, rounding: 4,
            baseColor:   Color.neutral.gray, fillType: "linear gradient" },
            widgetPanel: { borderColor: Color.blue, borderWidth: 4, rounding: 16,
            fill:        Color.blue.lighter(), opacity: 0.4},
            clock:       { size: 100, borderColor: Color.green.lighter(), borderWidth: 1,
            fill:        Color.yellow, roman: true},
            link:        { borderColor: Color.green, borderWidth: 1, fill: Color.blue}
        },

        turquoise: { // Like turquoise, black and silver jewelry, [or other artistic style]
            styleName: 'turquoise',
            window:      { rounding: 8},
            titleBar:    { rounding: 8, borderWidth: 2, bordercolor: Color.black,
            fill:        LinearGradient.makeGradient(Color.turquoise, Color.turquoise.lighter(3))},
            panel:       {  },
            slider:      { borderColor: Color.green.lighter(), borderWidth: 1},
            elevator:    { borderColor: Color.green.lighter(), borderWidth: 1},
            button:      { borderColor: Color.neutral.gray.darker(), borderWidth: 2, rounding: 8,
            baseColor:   Color.turquoise.darker(), fillType: "radial gradient" },
            widgetPanel: { borderColor: Color.neutral.gray.darker(), borderWidth: 4,
            fill:        Color.turquoise.lighter(3), rounding: 16},
            clock:       { size: 100, borderColor: Color.green.lighter(), borderWidth: 1,
            fill:        Color.yellow, roman: true},
            link:        { borderColor: Color.green, borderWidth: 1, fill: Color.blue}
        }
    }

});

Object.extend(WorldMorph.prototype, {

    defaultFill: Color.primary.blue,

    initialize: function(svgId, backgroundImageId) {
        var bounds = document.getElementById(svgId).bounds();
        // sometimes bounds has zero dimensions (when reloading thes same page, timing issues?
        // in Firefox bounds may be 1x1 size?? maybe everything should be run from onload or sth?

        if (bounds.width < 2) {
            bounds.width = 800;
        }

        if (bounds.height < 2) {
            bounds.height = 600;
        }

        if (backgroundImageId) {
            var background = NodeFactory.create("use").withHref(backgroundImageId);
            this.addChildElement(background);
        }
            
        WorldMorph.superClass.initialize.call(this, bounds, "rect");

        this.hands = [];
        this.displayThemes = WorldMorph.defaultThemes;
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

        // Mozilla doesn't like this and starts reloading the page over and over
        if (Prototype.Browser.WebKit) {
            if (this.worldId != 1) {
                window.parent.location.hash = '#world_' + this.worldId;
            } else {
                window.parent.location.hash = "";
            }
        }
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
        console.log('added hand %s', hand);
    },
    
    removeHand: function(hand) {
        this.parentNode.removeChild(hand);
        hand.unregisterForEvents(this);
        hand.unregisterForEvents(hand);

        Event.keyboardEvents.forEach(function(each) {
            document.documentElement.removeEventListener(each, hand.handler, false);
        });

        this.hands.splice(this.hands.indexOf(hand), 1);
    
        console.log('removed hand %s, now %s', hand, this.hands.length);
    },

    morphMenu: function(evt) { 
        var menu = WorldMorph.superClass.morphMenu.call(this,evt);
        menu.keepOnlyItemsNamed(["inspect", "style"]);
        menu.addLine();
        menu.addItem(["new object...", this, 'addMorphs', evt]);
        menu.addItem(["choose display theme", this, 'chooseDisplayTheme']);
        menu.addItem([(Config.suppressBalloonHelp ? "enable balloon help" : "disable balloon help"),
			this, "toggleBalloonHelp"]);
        menu.addItem(["restart system", this, 'restart']);
        return menu;
    },
   
    toggleBalloonHelp: function() {
        Config.suppressBalloonHelp = !Config.suppressBalloonHelp;
    },

    chooseDisplayTheme: function(ignored,evt) { 
        var themes = this.displayThemes;
        var target = this; // trouble with function scope
        var themeNames = Object.properties(themes);
        var items = themeNames.map(
            function(each) { return [each, target, "setDisplayTheme", themes[each]]; });
        MenuMorph(items).openIn(this.world(), evt.mousePoint);
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
    
//    morphMenuItems: function() { // May be overridden
//        return ["inspect", "fill color", "selection color"];
//    },

    startStepping: function(morphOrAction) {
        if (morphOrAction.scriptName == null) {
	// Old code for ticking morphs
	var ix = this.stepList.indexOf(morphOrAction);
        if (ix < 0) this.stepList.push(morphOrAction); 
	if (!this.mainLoop) {
	    // kickstart the timer (note arbitrary delay)
	    this.mainLoop = window.setTimeout(this.mainLoopFunc, 60);
	}
	return; }

	// New code for stepping schedulableActions
	this.scheduleAction(new Date().getTime(), morphOrAction);
    },
    
    stopStepping: function(morph) {
        var ix = this.stepList.indexOf(morph);
        if (ix >= 0) this.stepList.splice(ix, 1); 
    },
    
    doOneCycle: function (world) {
        // Process scheduled scripts
	var msTimer = new Date();
	var msTime = msTimer.getTime();

        // Old ticking scripts...
	var msTime = new Date().getTime();
        var timeOfNextStep = Infinity;
        for (var i = 0; i < this.stepList.length; i++) {
            var time = this.stepList[i].tick(msTime);
	    if (time > 0) 
		timeOfNextStep = Math.min(time, timeOfNextStep);
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
	    action.actor[action.scriptName].call(action.actor, action.argIfAny);
	    // Note: if error in script above, it won't get rescheduled below
	    if (action.stepTime > 0) {
		var nextTime = msTime + action.stepTime;
		this.scheduleAction(nextTime, action)
		timeOfNextStep = Math.min(nextTime, timeOfNextStep);
		}
	    var timeNow = msTimer.getTime();
	    var ticks = timeNow - timeStarted;
	    if (ticks > 0) action.ticks += ticks;  // tally time spent in that script
	    timeStarted = timeNow;
	}
	// Each second, run through the tick tallies and mult by 0.9 to 10-sec "average"
	if (!this.secondTick) this.secondTick = 0;
	var secondsNow = Math.floor(msTime / 1000);
	var tallies = {};
	if (this.secondTick != secondsNow) {
	    this.secondTick = secondsNow;
	    for (var i=0; i<list.length; i++) {
		var action = list[i][1];
		tallies[action.scriptName] = action.ticks;
		action.ticks *= 0.9 // 10-sec decaying moving window
	    }
//	    console.log('Script timings...');
//	    for (var p in tallies) console.log(p + ': ' + tallies[p].toString());
	}
        this.lastStepTime = msTime;
	if (timeOfNextStep == Infinity) { // didn't find anything to cycle through
	    this.mainLoop = null; 
	} else {
            this.mainLoop = window.setTimeout(this.mainLoopFunc, timeOfNextStep - msTime);
	}
    },

    scheduleAction: function(msTime, action) { 
	// Insert a SchedulableAction into the scheduledActions queue
        var list = this.scheduledActions;  // shorthand
	for (var i=list.length-1; i>=0; i--) {
	    var schedNode = list[i];
	    if (schedNode[0] > msTime) {
		list.splice(i+1, 0, [msTime, action]);
		return; 
	    }
	}
	list.splice(0, 0, [msTime, action]);
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
            ["Rectangle", function(evt) { world.addMorph(Morph(evt.mousePoint.extent(pt(50, 30)), "rect"));}],
            ["Ellipse", function(evt) { world.addMorph(Morph(evt.mousePoint.extent(pt(50, 30)), "ellipse"));}],
            ["TextMorph", function(evt) { world.addMorph(TextMorph(evt.mousePoint.extent(pt(120, 10)), "This is a TextMorph"));}],
            ["Image Morph", function(evt) { world.addMorph(ImageMorph(evt.mousePoint.extent(pt(100, 45)), "http://logos.sun.com/images/SunSample.gif"))}],
            ["Clock Morph", function(evt) { world.addMorph(ClockMorph(evt.mousePoint, 50));}],
            ["Class Browser", function(evt) { world.addMorph(new SimpleInspector(this));}],
            //new SimpleInspector(this), "openIn", this.world()],
            ["Doodle Morph", function(evt) { world.addMorph(WindowMorph(DoodleMorph(evt.mousePoint.extent(pt(300, 300))), 'Doodle Morph'))}],
        ];
        MenuMorph(items).openIn(this.world(), evt.mousePoint);
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
    }.logErrors('Event Handler'),
    
});

/**
 * @class HandMorph
 * Defines the little triangle that represents the user's cursor.
 * Since there may be multiple users manipulating a Morphic world
 * simultaneously, we do not want to use the default system cursor.   
 */ 

HandMorph = HostClass.create('HandMorph', Morph);

Object.extend(HandMorph, {
    shadowOffset: pt(5,5),
    handleOnCapture: true
});

Object.extend(HandMorph.prototype, {

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
        this.mode = "normal";
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
        var handler = this.handler;
        Event.basicInputEvents.forEach(function(name) { 
             morph.addEventListener(name, handler, HandMorph.handleOnCapture)}
        );
    },
    
    unregisterForEvents: function(morph) {
        var handler = this.handler; 
        Event.basicInputEvents.forEach(function(name) { 
            morph.removeEventListener(name, handler, HandMorph.handleOnCapture)}
        );
    },
    
    setMouseFocus: function(morphOrNull) {
        this.mouseFocus = morphOrNull; 
    },
    
    setKeyboardFocus: function(morphOrNull) {
        if (this.keyboardFocus === morphOrNull) return;

        if (this.keyboardFocus != null) {
            console.log('blur %s', this.keyboardFocus);
            this.keyboardFocus.onBlur(this);
            this.keyboardFocus.setHasKeyboardFocus(false);
        }
        
        this.keyboardFocus = morphOrNull; 
        
        if (this.keyboardFocus) {
            console.log('focus %s', this.keyboardFocus);
            this.keyboardFocus.onFocus(this);
        }
    },
    
    setHandMode: function(newMode) {
        this.mode = newMode; 
    },
    
    owner: function() {
        return this.ownerWorld;
    },

    world: function() {
        return this.ownerWorld;
    },

    handleMouseEvent: function(evt) { 
        evt.hand = this; // extra copy needed for entry from HandRemoteControl
    
        if (evt.type == "mousemove") { // it is just a move
            evt.setButtonPressedAndPriorPoint(this.mouseButtonPressed, this.lastMouseEvent.mousePoint);
            this.setPosition(evt.mousePoint);
            this.recordChange('origin');
             
            if (evt.mousePoint.dist(this.lastMouseDownPoint) > 10) 
                this.hasMovedSignificantly = true;
                
            if (evt.shiftKey && this.mode == "shiftDragForDup") {
                if (this.hasMovedSignificantly) {
                    var m = this.dragMorph;
                    this.dragMorph = null;
                    this.mode = "normal";
                    m.copyToHand(this);
                    var offset = evt.mousePoint.subPt(this.lastMouseDownPoint);
                    this.submorphs.each(function(m) { m.moveBy(offset); });
                }
                return;
            }

            if (this.mouseFocus==null && this.hasSubmorphs()) { // generate mouseOver events when laden
           	var receiver = this.owner().morphToGrabOrReceive(evt, null);
		if (receiver != null) receiver.onMouseOver(evt);
	    }
	    else {
		(this.mouseFocus || this.owner()).mouseEvent(evt, this.mouseFocus != null);
            }
        
            this.lastMouseEvent = evt;
            return;
        }
    
        // console.log('handling %s',  evt);
        // it is MouseDown or MouseUp
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
            } else 
                this.mouseFocus.mouseEvent(evt, true); 
        } else {
            if (this.hasSubmorphs() && (evt.type == "mousedown" || this.hasMovedSignificantly)) {
                // If laden, then drop on mouse up or down
                var m = this.topSubmorph();
                var receiver = this.owner().morphToGrabOrReceive(evt, m);
                if (receiver == null) {
                    this.ungrab(m);
                } else { 
                    console.log('dropping %s on %s', m, receiver);
            
                    while(this.hasSubmorphs())  // was just receiver.addMorph(m);
                        receiver.addMorph(this.topSubmorph());
            
                   //DI: May need to be updated for multiple drop above...
                   //println('changing ' + m);
                   //m.changed(); // KP: maybe needed for ClipMorphs
                   // m.updateOwner(); 
                   //m.updateBackendFields('origin'); 
                }
            } else {
                // console.log('hand dispatching event ' + event.type + ' to owner '+ this.owner().inspect());
                // KP: this will tell the world to send the event to the right morph
                this.owner().mouseEvent(evt, false);
            }
            
            if (evt.type == "mousedown") {
                this.lastMouseDownPoint = evt.mousePoint;
                this.hasMovedSignificantly = false; 
            }
        }
        this.lastMouseEvent = evt; 
    },

    moveTopMorph: function(evt) {
	switch (evt.sanitizedKeyCode()) {
        case Event.KEY_LEFT: {
	    this.topSubmorph().moveBy(pt(-10,0));
	    evt.stop();
	    return true;
        } 
        case Event.KEY_RIGHT: {
	    // forget the existing selection
	    this.topSubmorph().moveBy(pt(10, 0));
	    evt.stop();
	    return true;
        }
        case Event.KEY_UP: {
	    this.topSubmorph().moveBy(pt(0, -10));
	    evt.stop();
	    return true;
	    
	}
        case Event.KEY_DOWN: {
	    this.topSubmorph().moveBy(pt(0, 10));
	    evt.stop();
	    return true;
        }
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
	    if (evt.type == 'keydown' && this.moveTopMorph(evt))
		return;
	    else if (evt.type == 'keypress' && this.transformTopMorph(evt)) 
		return;
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
	
    grabMorph: function(grabbedMorph, evt) { 
        if (evt.shiftKey && Config.shiftDragForDup && !(grabbedMorph instanceof LinkMorph)) {
            this.mode = "shiftDragForDup";
            this.dragMorph = grabbedMorph; 
            this.setMouseFocus(null);
	    return;
        }
        
        if (evt.altKey) {
            grabbedMorph.showMorphMenu(evt);
            return;
        }

        grabbedMorph = grabbedMorph.okToBeGrabbedBy(evt);
        if (!grabbedMorph) return;

        if (this.keyboardFocus && grabbedMorph !== this.keyboardFocus) {
            this.keyboardFocus.relinquishKeyboardFocus(this);
        }

        //console.log('grabbing %s', grabbedMorph);
        this.grabInfo = [grabbedMorph.owner(), grabbedMorph.position()]; // For cancelling grab or drop [also indexInOwner?]

        //console.log('grabbed %s', grabbedMorph);
        this.addMorph(grabbedMorph);
        
        // grabbedMorph.updateOwner(); 
        this.changed(); //for drop shadow
    },
    
    ungrab: function(morph) { 
        // Needs to put back in former owner, position, submorphIndex
    },
    
    bounds: function() {
        // account for the extra extent of the drop shadow
        // FIXME drop shadow ...
        if (this.shadowMorph)
            return HandMorph.superClass.bounds.call(this).expandBy(HandMorph.shadowOffset.x);
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

LinkMorph = HostClass.create('LinkMorph', Morph);

Object.extend(LinkMorph.prototype, {

//  DI: I feel fisheye is distracting here;  OK in palettes maybe
    baseFisheye: false, 
    fisheyeGrowth: 2, // make it grow more
    fisheyeProximity: 0.5, // make it grow only when the hand gets closer
    defaultFill: Color.black,
    defaultBorderColor: Color.black,
    
    initialize: function(otherWorld /*, rest*/) {
        // In a scripter, type: world.addMorph(LinkMorph(null))
        var bounds = arguments[1];
    
        if (!bounds) {
            bounds = WorldMorph.current().bounds().bottomLeft().addXY(330,-250).asRectangle().expandBy(25);
        } else if (bounds instanceof Point) {
            bounds = bounds.asRectangle().expandBy(25);
        }
    
        LinkMorph.superClass.initialize.call(this, bounds, "ellipse");

        //this.setFill(RadialGradient.makeCenteredGradient(Color.primary.blue.lighter(), Color.black));

        // FIXME this should be simpler
        var sign = NodeFactory.create("use").withHref("#WebSpiderIcon");
        sign.applyTransform(Transform.createSimilitude(pt(-26, -26), 0, 0.1));
        this.addChildElement(sign);

        if (!otherWorld) {
            otherWorld = WorldMorph.createEmptyWorld(Canvas, 2, null);  //*** need a way to generate proper world numbers
            var pathBack = LinkMorph(WorldMorph.current(), bounds);
            pathBack.setFill(RadialGradient.makeCenteredGradient(Color.primary.yellow, Color.black));
            otherWorld.addMorph(pathBack);
        } 
    
        // var defs = NodeFactory.create('defs');
        // morph.addChildElement(defs);
        // defs.appendChild(otherWorld);
        this.myWorld = otherWorld;
    
        // morph.assign('myWorld', otherWorld);

        // Balloon help support
        MouseOverHandler.observe(this);
        this.helpText = "Click here to enter or leave a subworld.\nUse menu 'grab' to move me."; 

        return this;
    },
    
    okToBeGrabbedBy: function(evt) {
        this.enterMyWorld(evt); 
        return null; 
    },

    enterMyWorld: function(evt) { // needs vars for oldWorld, newWorld
        carriedMorphs = [];
	while (evt.hand.hasSubmorphs()) {
	    var m = evt.hand.topSubmorph();
	    carriedMorphs.push(m);
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
        WorldMorph.current().remove();
        
        console.log('left world %s', WorldMorph.current());
        // Canvas.appendChild(this.myWorld);
    
        // display world first, then add hand, order is important!
        WorldMorph.setCurrent(this.myWorld);
        WorldMorph.current().displayWorldOn(canvas);    
        WorldMorph.current().onEnter(); 
	carriedMorphs.each(function(m) { WorldMorph.current().firstHand().addMorph(m) });
	WorldMorph.current().firstHand().emergingFromWormHole = true; // prevent re-entering
    },

    checkForControlPointNear: function(evt) {
        return null;
    },

    onMouseOver: function(evt) {
	// Note this event does not have hand bound except if laden!
        if (evt.hand && evt.hand.hasSubmorphs()) {
	    if(evt.hand.emergingFromWormHole) evt.hand.setMouseFocus(this);
	    else this.enterMyWorld(evt);
	}
	else if (this.helpText) this.showHelp(evt);
    },
    
    onMouseMove: function(evt) {
	// Wait until hand leaves a linkMorph before enabling reentry
	if (this.containsWorldPoint(evt.mousePoint)) return;
	evt.hand.setMouseFocus(null);
	evt.hand.emergingFromWormHole = false;
    },
    
    onMouseOut: function(evt) {
        this.fishEye = this.baseFisheye;
        this.hideHelp();
    },
    
    showHelp: function(evt) {
        if (Config.suppressBalloonHelp) return;  // DI: maybe settable in window menu?
        if (this.owner() instanceof HandMorph) return;
        
        // Create only one help balloon at a time
        if (this.help) return;
        
        this.help = TextMorph(Rectangle(evt.x, evt.y, 250, 20), this.helpText);
        // trying to relay mouse events to the WindowControlMorph
        this.help.relayMouseEvents(this, {onMouseDown: "onMouseDown", onMouseMove: "onMouseMove", onMouseUp: "onMouseUp"});
        
        // some eye candy for the help
        this.help.shape.roundEdgesBy(15);
        this.help.setFill(Color.primary.yellow.lighter(3));
        this.help.shape.setFillOpacity(.8);
        this.help.openForDragAndDrop = false; // so it wont interfere with mouseovers
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

