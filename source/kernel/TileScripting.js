Object.subclass('Layout', {
    
    initialize: function(baseMorph, resizeAfterLayout) {
        this.baseMorph = baseMorph;
        this.resizeAfterLayout = resizeAfterLayout;
    },
    
    layout: function() {
        this.baseMorph.layoutChanged = Morph.prototype.layoutChanged.bind(this.baseMorph);
        
        this.baseMorph.submorphs.inject(pt(0,0), function(pos, ea) {
            ea.setPosition(pos);
            return this.newPosition(ea);
        }, this);
        if (this.resizeAfterLayout) {        
            var maxExtent = this.baseMorph.submorphs.inject(pt(0,0), function(maxExt, ea) {
                return maxExt.maxPt(ea.getPosition().addPt(ea.getExtent()));
            });
            this.baseMorph.setExtent(maxExtent);
        };
        this.baseMorph.layoutChanged();
        
        this.baseMorph.layoutChanged = this.baseMorph.constructor.prototype.layoutChanged.bind(this.baseMorph);
    },
    
    newPosition: function(lastLayoutedMorph) {
        return lastLayoutedMorph.getPosition();
    }
});

Layout.subclass('VLayout', {
    
    newPosition: function(lastLayoutedMorph) {
        return lastLayoutedMorph.getPosition().addXY(0, lastLayoutedMorph.getExtent().y);
    }
    
});

Layout.subclass('HLayout', {
    
    newPosition: function(lastLayoutedMorph) {
        return lastLayoutedMorph.getPosition().addXY(lastLayoutedMorph.getExtent().x, 0);
    }
    
});

// Extensions
// TODO: Merge

Morph.addMethods({
   layout: function(notResizeSelf) {
       this.layouterClass && new this.layouterClass(this, !notResizeSelf).layout();
       this.owner && this.owner.layout();
   },
   asTile: function() {
       return new ObjectTile(null,this);
   }
});
Morph.prototype.morphMenu = Morph.prototype.morphMenu.wrap(function(proceed, evt) {
    var menu = proceed(evt);
    menu.addItem(["as tile", function(evt) { evt.hand.addMorph(this.asTile()) }.bind(this)], 3);
    // menu.addSubmenuItem(['submenu', function(evt) { return [['1'],['2'],['3']] }])
    return menu;
});

Widget.subclass('TileBox', {

    viewTitle: "Tile Box",
    viewExtent: pt(600,300),
        
    add: function(createFunc, panel) {
        
        var m = createFunc();
        
        m.withAllSubmorphsDo(function() {
            this.handlesMouseDown = Functions.True;
            this.okToBeGrabbedBy = function() {
                return createFunc();
            };
            this.onMouseDown = function(evt) {
                    var compMorph = createFunc();
                    evt.hand.addMorph(compMorph);
                    compMorph.setPosition(pt(0,0));
            };
        });

        var textHeight = 30;
        var wrapper = new ClipMorph(m.getExtent().addPt(pt(0,textHeight)).extentAsRectangle(), "rect");
        m.setBorderWidth(2);
        wrapper.addMorph(m);
        var text = new TextMorph(pt(0,m.getExtent().y).extent(m.getExtent().x, wrapper.getExtent().y), m.constructor.type);
        text.beLabel();
        wrapper.addMorph(text);
        panel.addMorph(wrapper);
    },
    
    // new TileBox().openIn(WorldMorph.current())
    buildView: function(extent) {
        var panel = new PanelMorph(this.viewExtent);
        panel.adjustForNewBounds = Morph.prototype.adjustForNewBounds.bind(this); // so submorphs don't scale
        panel.setFill(Color.white);
        panel.suppressHandles = true;
        
        var defaultCreateFunc = function(theClass, optExtent) {
            return new theClass(optExtent && optExtent.extentAsRectangle());
        };
        
        [Tile, IfTile, DebugTile].each(function(ea) {
            this.add(defaultCreateFunc.curry(ea), panel);
        }, this);
        
        // dbgOn(true);
        new VLayout(panel, true).layout();
        // panel.openDnD();
        
        return panel;
    }
    
});

Object.extend(TileBox, {
    open: function() {
        var tileBox = new TileBox();
        tileBox.openIn(WorldMorph.current());
        return tileBox;
    }
});

Widget.subclass('ScriptEnvironment', {
    
    viewExtent: pt(200,300),
    
    initialize: function($super) {
        $super();
        // this.formalModel = ComponentModel.newModel({Name: "NoName"});
    },
    
    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(this.viewExtent, [
            ['runButton', function(initialBounds) { return new ButtonMorph(initialBounds) }, new Rectangle(0, 0, 0.3, 0.1)],
            ['tileHolder', function(initialBounds) { return new TileHolder(initialBounds) }, new Rectangle(0, 0.1, 1, 0.9)]
        ]);
        
        // var panel = new Morph(extent.extentAsRectangle());
        // panel.runButton = panel.addMorph(new ButtonMorph(panel.bounds().scaleByRect(new Rectangle(0, 0, 0.3, 0.1))));
        // panel.tileHolder = panel.addMorph(new TileHolder(panel.bounds().scaleByRect(new Rectangle(0, 0.1, 1, 0.9))));
        panel.setFill(Color.gray.lighter());
        
        var runButton = panel.runButton;
		runButton.setLabel("Run Script");
		runButton.connectModel({model: this, setValue: "runScript"});
		
		var tileHolder = panel.tileHolder;
		
		panel.openAllToDnD();
		tileHolder.openDnD();
		panel.openDnD();
        return panel;
    },
    
    runScript: function() {
        
    },
    
    openIn: function($super, world, optLoc) {
        var window = $super(world, optLoc);
        window.openAllToDnD();
        window.needsToComeForward = Functions.False;
        // window.captureMouseEvent = Morph.prototype.captureMouseEvent.bind(window).wrap(function(proceed, evt, hasFocus) {
        //             var result = proceed(evt,hasFocus);
        //             dbgOn(Global.x && result);
        //             this.mouseHandler.handleMouseEvent(evt, this); 
        //             return result;
        //         });
        return window;
    }
     
});
   
Object.extend(ScriptEnvironment, {
    open: function() {
        var scrEnv = new ScriptEnvironment();
        scrEnv.openIn(WorldMorph.current());
        return scrEnv;
    }
});

Morph.subclass('TileHolder', {
    
    layouterClass: VLayout,
    dropAreaExtent: pt(80,20),
    
    initialize: function($super, bounds) {
        $super(bounds, "rect");
        this.setFill(Color.gray.lighter());
        this.layout = this.layout.curry(true); // no resizing on layout
        this.closeDnD();
        this.addDropArea();
    },
    
    addMorph: function($super, morph) {
        $super(morph);
        this.layout();
        return morph;
    },
    
    addDropArea: function() {
        var dropArea = new DropArea(this.dropAreaExtent.extentAsRectangle());
        var self = this;
        dropArea.addMorph = dropArea.addMorph.wrap(function(proceed, morph) {
            proceed(morph);
            
            // find empty DropAreas
            var emptyDrop = self.submorphs.detect(function(ea) { return ea.isDropArea && !ea.tile() });
            if (emptyDrop) {
                self.removeMorph(emptyDrop); self.addMorph(emptyDrop); // take it below
            } else {
                self.addDropArea();
            }
            return morph;
        })
        this.addMorph(dropArea);
    }
    
});
    
Morph.subclass('Tile', {

    isTile: true,
    defaultExtent: pt(100,20),
    layouterClass: HLayout,
    
    initialize: function($super, bounds) {
        if (!bounds) bounds = this.defaultExtent.extentAsRectangle();
        $super(bounds, "rect");
        this.suppressHandles = true;
        this.setFill(new Color(0.6, 0.7, 0.8));
        this.setBorderWidth(0);
    },
    
    addMorph: function($super, morph) {
        $super(morph);
        if (morph instanceof HandleMorph) return morph;
        this.layout();
        return morph;
    },
    
    layoutChanged: function($super) {
        $super();
        // this.layouterClass && new this.layouterClass(this, true).layout();
    },
    
    asJs: function() {
        return '';
    }
});

Tile.subclass('DebugTile', {
    
    defaultExtent: pt(100,35),
    layouterClass: null,
    
    initialize: function($super, bounds, sourceString) {
        $super(bounds, "rect");
        
        this.myString = '';
        this.text = this.addMorph(new TextMorph(this.shape.bounds().insetBy(5)));
        this.text.connectModel({model: {setMyString: function(string) { this.myString = string }.bind(this) }, setText: "setMyString"});
        this.text.setText(sourceString);
        
        this.closeAllToDnD();
        // FIXME why is it so hard to use a SIMPLE TextMorph??!  
    },
    
    asJs: function() {
        return this.myString;
    }
});

Tile.subclass('ObjectTile', {
    
    initialize: function($super, bounds, targetMorphOrObject) {
        $super(bounds, "rect");
        
        this.myString = '';
        this.label = this.addMorph(new TextMorph(this.shape.bounds()));
        this.label.beLabel();
        
        if (targetMorphOrObject) this.createAlias(targetMorphOrObject);
        
    },
    
    createAlias: function(morph) {
        this.targetMorph = morph;
        this.label.setTextString(this.objectId());
        this.addMenuButton();
    },
    
    objectId: function() {
        return this.targetMorph.id();
    },
        
    addMenuButton: function() {
        var extent = pt(8,8);
        this.menuTrigger = this.addMorph(new ButtonMorph(extent.extentAsRectangle()));
        this.menuTrigger.moveBy(pt(0,this.getExtent().y/2 - extent.x/2));
        this.menuTrigger.setFill(this.getFill().darker());
        this.menuTrigger.connectModel({model: this, setValue: "openMenu"});
    },
    
    openMenu: function(btnVal) {
        if (!btnVal) return;
        var menu = new TileMenuCreator(this.targetMorph).createMenu();
        var pos = this.getGlobalTransform().transformPoint(this.menuTrigger.getPosition());
    	menu.openIn(this.world(), pos, false, this.targetMorph.toString());
    }
        
});

Object.subclass('TileMenuCreator', {
    
    initialize: function(obj) {
        this.target = obj;
    },
    
    classes: function() {
        var classes = this.target.constructor.superclasses().concat(this.target.constructor);
        classes.shift(); // remove Object
        return classes;
    },
    
    classNames: function() {
        return this.classes().collect(function(ea) { return ea.type });
    },
    
    methodNamesFor: function(className) {
        var allMethods = Global[className].localFunctionNames();
        return allMethods.without.apply(allMethods, this.ignoredMethods);
    },
    
    createMenu: function() {
        var menu = new MenuMorph([], this.target);
        this.classNames().each(function(ea) { this.addClassMenuItem(menu, ea)}, this);
        return menu;
    },
    
    addClassMenuItem: function(menu, className) {
        var self = this;
        menu.addSubmenuItem([className, function(evt) {
            return self.methodNamesFor(className).collect(function(ea) { return [ea] });
        }])
    },
    
    // addMethodMenuItem: function(menu, methodName) {
    //     return [methodName];
    // }
    
    ignoredMethods: [ // from Morph
                    "constructor", "setCopySubmorphsOnGrab", "getCopySubmorphsOnGrab", "internalInitialize", "initialize", "initializePersistentState",
                    "initializeTransientState", "copyFrom", "deserialize", "prepareForSerialization", "restorePersistentState", "restoreDefs",
                    "restoreFromSubnode", "restoreFromSubnodes", "setLineJoin", "setLineCap", "applyStyle", "makeStyleSpec", "applyStyleNamed", "styleNamed",
                    "applyLinkedStyles", "applyFunctionToShape", "internalSetShape", "setShape", "reshape", "setVertices", "internalSetBounds", "setBounds",
                    "addNonMorph", "addWrapper", "addPseudoMorph", "addWrapperToDefs", "addMorphAt", "addMorphFront", "addMorphBack", "addMorphFrontOrBack",
                    "insertMorph", "removeAllMorphs", "hasSubmorphs", "withAllSubmorphsDo", "invokeOnAllSubmorphs", "topSubmorph", "shutdown",
                    "okToDuplicate", "getTransform", "pvtSetTransform", "setTransform", "transformToMorph", "getGlobalTransform", "translateBy",
                    "defaultOrigin", "throb", "align", "centerAt", "toggleFisheye", "setFisheyeScale", "getHelpText", "showHelp", "hideHelp",
                    "captureMouseEvent", "ignoreEvents", "enableEvents", "relayMouseEvents", "handlesMouseDown", "onMouseDown", "onMouseMove", "onMouseUp",
                    "considerShowHelp", "delayShowHelp", "onMouseOver", "onMouseOut", "onMouseWheel", "takesKeyboardFocus", "setHasKeyboardFocus",
                    "requestKeyboardFocus", "relinquishKeyboardFocus", "onFocus", "onBlur", "removeFocusHalo", "adjustFocusHalo", "addFocusHalo",
                    "checkForControlPointNear", "okToBeGrabbedBy", "editMenuItems", "showMorphMenu", "morphMenu", "showPieMenu", "putMeInAWindow",
                    "putMeInATab", "putMeInTheWorld", "immediateContainer", "windowContent", "windowTitle", "toggleDnD", "openDnD", "closeDnD",
                    "closeAllToDnD", "openAllToDnD", "dropMeOnMorph", "pickMeUp", "notify", "showOwnerChain", "copyToHand",
                    "morphToGrabOrReceiveDroppingMorph", "morphToGrabOrReceive", "morphToReceiveEvent", "ownerChain", "acceptsDropping",
                    "startSteppingScripts", "suspendAllActiveScripts", "suspendActiveScripts", "resumeAllSuspendedScripts", "bounds", "submorphBounds",
                    "innerBounds", "localBorderBounds", "worldPoint", "relativize", "relativizeRect", "localize", "localizePointFrom",
                    "transformForNewOwner", "changed", "layoutOnSubmorphLayout", "layoutChanged", "adjustForNewBounds", "position", "clipToPath",
                    "clipToShape", "addSvgInspector", "addModelInspector", "connectModel", "relayToModel", "reconnectModel", "checkModel", "disconnectModel",
                    "getModel", "getActualModel", "getModelPlug", "getModelValue", "setModelValue", "updateView", "exportLinkedFile", "isContainedIn",
                    "leftAlignSubmorphs", "window", "layout","setBorderWidth", "getBorderWidth", "shapeRoundEdgesBy", "setStrokeOpacity", "linkToStyles",
                    "fullContainsPoint", "fullContainsWorldPoint", "removeMorph", "world", "inspect", "stopStepping", "startStepping", "addActiveScript",
                    "getStrokeOpacity", "setStrokeWidth", "getStrokeWidth", "setStroke", "getStroke", "getLineJoin", "getLineCap", "setStrokeDashArray",
                    "getStrokeDashArray", "setStyleClass", "getStyleClass", "getRecordField", "setRecordField", "removeRecordField", "newRelay",
                    "create", "addField", "areEventsIgnored", "getLocalTransform", "addObserver", "removeObserver", "addObserversFromSetters",
                    "getBoundingBox", "nativeBounds", "nativeWorldBounds", "canvas", "nativeContainsWorldPoint", "undisplay", "display", "isDisplayed",
                    "applyFilter", "getBaseTransform", "copy", "getType", "getEncodedType", "newId", "id", "setId", "setDerivedId", "removeRawNode",
                    "replaceRawNodeChildren", "toMarkupString", "uri", "getLivelyTrait", "setLivelyTrait", "removeLivelyTrait", "getLengthTrait",
                    "setLengthTrait", "getTrait", "setTrait", "removeTrait", "preparePropertyForSerialization",
                    
                    // from OMeta
                    "printOn", "delegated", "ownPropertyNames", "hasProperty", "isNumber", "isString", "isCharacter"]
});

Tile.subclass('IfTile', {
    
    initialize: function($super, bounds) {
        $super(bounds, "rect");
        this.addMorph(new TextMorph(new Rectangle(0,0,20,this.bounds().height), 'if').beLabel());
        this.testExprDropArea = this.addMorph(new DropArea(new Rectangle(0,0,50,this.getExtent().y)));
        this.exprDropArea = this.addMorph(new DropArea(new Rectangle(0,0,50,this.getExtent().y)));
    },
    
    asJs: function() {
        return 'if (' + this.testExprDropArea.tile().asJs() + ') {' + this.exprDropArea.tile().asJs() + '};';
    }
});
    
Morph.subclass('DropArea', {

    isDropArea: true,
    layouterClass: VLayout,
    
    initialize: function($super, bounds) {
        $super(bounds, "rect");
        this.suppressHandles = true;
        this.styleNormal();
        return this;
    },
    
    styleNormal: function() {
        this.setFill(Color.gray);
    },
    
    styleCanReceiveTile: function() {
        this.setFill(Color.green.lighter());
    },
    
    tile: function() {
        return this.submorphs.detect(function(ea) { return ea.isTile });
    },
    
    addMorph: function($super, morph) {
        if (this.tile() || !morph.isTile) return morph; // FIXME think that morph was accepted... overwrite acceptmorph for that or closeDnD
        this.setExtent(morph.getExtent());
        $super(morph);
        this.layout();
        this.owner && this.owner.layout();
        // this.layoutChanged();
        // this.closeDnD();
        return morph;
    },
    
    onMouseOver: function(evt) {
        if (this.tile()) return;
        var tile = evt.hand.submorphs.detect(function(ea) { return ea.isTile });
        if (!tile) return;
        this.styleCanReceiveTile();
    },
    
    onMouseOut: function(evt) {
        this.styleNormal();
    }
});