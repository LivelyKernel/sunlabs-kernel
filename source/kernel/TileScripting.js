module('TileScripting.js').requires('Helper.js').toRun(function() {

Object.subclass('Layout', {
    
    initialize: function(baseMorph, resizeAfterLayout) {
        this.baseMorph = baseMorph;
        this.resizeAfterLayout = resizeAfterLayout;
    },
    
    layout: function() {
        
        // this.baseMorph.layoutChanged = Morph.prototype.layoutChanged.bind(this.baseMorph);
        
        this.baseMorph.submorphs
            .reject(function(ea) { return ea instanceof HandleMorph})
            .inject(pt(0,0), function(pos, ea) {
                ea.setPosition(pos);
                return this.newPosition(ea);
            }, this);
        
        if (this.resizeAfterLayout) {        
            var maxExtent = this.baseMorph.submorphs.inject(pt(0,0), function(maxExt, ea) {
                return maxExt.maxPt(ea.getPosition().addPt(ea.getExtent()));
            });
            this.baseMorph.setExtent(maxExtent);
        };
        
        // this.baseMorph.layoutChanged();        
        // this.baseMorph.layoutChanged = this.baseMorph.constructor.prototype.layoutChanged.bind(this.baseMorph);
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
Morph.prototype.removeMorph = Morph.prototype.removeMorph.wrap(function(proceed, morph) {
    proceed(morph);
    this.layout();
    return this;
})

Widget.subclass('TileBox', {

    viewTitle: "Tile Box",
    viewExtent: pt(600,300),
        
    add: function(createFunc, demoMorph, caption, panel) {
        
        var m = demoMorph || createFunc();

        var textHeight = 30;
        var wrapper = new ClipMorph(m.getExtent().addPt(pt(0,textHeight)).extentAsRectangle(), "rect");
        wrapper.setBorderWidth(1);
        m.setBorderWidth(2);
        wrapper.addMorph(m);
        var text = new TextMorph(pt(0,m.getExtent().y).extent(m.getExtent().x, wrapper.getExtent().y), caption || m.constructor.type);
        text.beLabel();
        wrapper.addMorph(text);
        panel.addMorph(wrapper);
        
        wrapper.withAllSubmorphsDo(function() {
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
    },
    
    // new TileBox().openIn(WorldMorph.current())
    buildView: function(extent) {
        var panel = new PanelMorph(this.viewExtent);
        panel.adjustForNewBounds = Morph.prototype.adjustForNewBounds.bind(this); // so submorphs don't scale
        panel.setFill(Color.white);
        panel.setBorderWidth(1);
        panel.suppressHandles = true;
        
        var defaultCreateFunc = function(theClass, optExtent) {
            return new theClass(optExtent && optExtent.extentAsRectangle());
        };
        [IfTile, DebugTile].each(function(ea) {
            this.add(defaultCreateFunc.curry(ea), null, null, panel);
        }, this);
        
        var buildScriptBox = function() {
            var world = WorldMorph.current();
            var window = new ScriptEnvironment().openIn(world);
            // window.remove();
            world.removeMorph(window);
            return window;
        }
        this.add(buildScriptBox, new TitleBarMorph('ScriptBox', 150), 'ScriptBox', panel);
        
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
    
    viewTitle: "ScriptBox",
    viewExtent: pt(200,300),
    
    initialize: function($super) {
        $super();
        this.repeatAction = null;
        this.calls = 0;
        // this.formalModel = ComponentModel.newModel({Name: "NoName"});
    },
    
    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(this.viewExtent, [
            ['runButton', function(initialBounds) { return new ButtonMorph(initialBounds) }, new Rectangle(0, 0, 0.3, 0.1)],
            ['delayText', function(initialBounds) { return new TextMorph(initialBounds) }, new Rectangle(0.5, 0, 0.2, 0.1)],
            ['repeatButton', function(initialBounds) { return new ButtonMorph(initialBounds) }, new Rectangle(0.7, 0, 0.3, 0.1)],
            ['tileHolder', function(initialBounds) { return new TileHolder(initialBounds) }, new Rectangle(0, 0.1, 1, 0.9)]
        ]);
        
        // var panel = new Morph(extent.extentAsRectangle());
        // panel.runButton = panel.addMorph(new ButtonMorph(panel.bounds().scaleByRect(new Rectangle(0, 0, 0.3, 0.1))));
        // panel.tileHolder = panel.addMorph(new TileHolder(panel.bounds().scaleByRect(new Rectangle(0, 0.1, 1, 0.9))));
        panel.setFill(Color.gray.lighter());
        
        var runButton = panel.runButton;
		runButton.setLabel("Run Script");
		runButton.connectModel({model: this, setValue: "runScript"});
		
		var delayText = panel.delayText;
		delayText.autoAccept = true;
		
		var repeatButton = panel.repeatButton;
		repeatButton.setLabel("Repeat");
		repeatButton.connectModel({model: this, setValue: "repeatScript"});
		
		var tileHolder = panel.tileHolder;
		
		panel.openAllToDnD();
		tileHolder.openDnD();
		panel.openDnD();
		
		this.panel = panel;
        return panel;
    },
    
    runScript: function(btnVal) {
        if (btnVal) return;
        this.calls ++;
        var code = this.panel.tileHolder.tilesAsJs();
        var result;
        try {
            result = eval(code);
        } catch(e) {
            console.log('Script: Error ' + e + ' occured when evaluating:');
            console.log(code);
        }
        return result;
    },
    
    repeatScript: function(btnVal) {
        if (btnVal) return
        if (this.repeatAction) {
            console.log('stopping tile script');
            this.repeatAction.stop(this.panel.world());
            this.repeatAction = null;
            this.panel.repeatButton.setLabel("Repeat");
            return;
        }
        
        
        var delay = Number(this.panel.delayText.textString);
        if (!delay) return;
        this.repeatAction = new SchedulableAction(this, 'runScript', null, delay);
        
        console.log('starting tile script');
        this.repeatAction.start(this.panel.world());
        this.panel.repeatButton.setLabel("Stop");
    },
    
    openIn: function($super, world, optLoc) {
        var window = $super(world, optLoc);
        window.openAllToDnD();
        window.suppressHandles = true;
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
        this.suppressHandles = true;
        this.addDropArea();
        
    },
    
    addMorph: function($super, morph) {
        if (!morph.isDropArea) this.addDropArea().addMorph(morph);
        else $super(morph);
        this.layout();
        return morph;
    },
    
    ensureEmptyDropAreaExists: function() {
        if (this.submorphs.last().isDropArea && !this.submorphs.last().tile())
            return;
        this.addDropArea();
    },
    
    addDropArea: function() {
        
        var cleanUp = function() {
            var emptyDrops = this.submorphs.select(function(ea) { return ea.isDropArea && !ea.tile() });
            emptyDrops.invoke('remove');
            this.ensureEmptyDropAreaExists();
        }.bind(this);
        
        var dropArea = new DropArea(this.dropAreaExtent.extentAsRectangle(), cleanUp);
        dropArea.setExtent(pt(this.getExtent().x, dropArea.getExtent().y));

        return this.addMorph(dropArea);
    },
    
    tilesAsJs: function() {
        var lines = this.submorphs.select(function(ea) { return ea.tile && ea.tile() }).collect(function(ea) { return ea.tile().asJs() });
        return lines.join(';\n');
    },
    
    okToBeGrabbedBy: Functions.Null,
    
    layoutChanged: function($super) {
        $super();
        var maxExtent = this.submorphs.select(function(ea){ return ea.isDropArea }).inject(pt(0,0), function(maxExt, ea) {
            return maxExt.maxPt(ea.getPosition().addPt(ea.getExtent()));
        });
        if (this.getExtent().x < maxExtent.x) {
            // FIXME
            this.owner.owner && this.owner.owner.setExtent(pt(maxExtent.x, this.owner.owner.getExtent().y));
            this.owner && this.owner.setExtent(pt(maxExtent.x, this.owner.getExtent().y));
            this.setExtent(pt(maxExtent.x, this.getExtent().y));
        }
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
        this.layout();
        return morph;
    },
    
    // layoutChanged: function($super) {
    //     $super();
    //     // this.layouterClass && new this.layouterClass(this, true).layout();
    // },
    
    asJs: function() {
        return '';
    }
});

Tile.subclass('DebugTile', {
    
    defaultExtent: pt(100,35),
    layouterClass: null,
    
    initialize: function($super, bounds, sourceString) {
        $super(bounds, "rect");
        
        this.text = this.addMorph(new TextMorph(this.shape.bounds().insetBy(5)));
        this.text.autoAccept
        this.text.setTextString(sourceString);
        
        this.closeAllToDnD();
    },
    
    asJs: function() {
        return this.text.textString;
    }
});

Tile.subclass('ObjectTile', {
    
    initialize: function($super, bounds, targetMorphOrObject) {
        $super(bounds, "rect");
        
        this.targetMorph = null;
        this.opTile = null;
        this.menuTrigger = null;
        
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
    
    addFunctionTile: function(methodName) {
        this.menuTrigger && this.menuTrigger.remove();
        this.opTile = new FunctionTile(null, methodName);
        this.addMorph(this.opTile);
    },
    
    openMenu: function(btnVal) {
        if (!btnVal) return;
        var menu = new TileMenuCreator(this.targetMorph, this).createMenu();
        var pos = this.getGlobalTransform().transformPoint(this.menuTrigger.getPosition());
    	menu.openIn(this.world(), pos, false, this.targetMorph.toString());
    },
    
    asJs: function() {
        var result = 'ObjectTile.findMorph(\'' +  this.objectId() + '\')';
        if (this.opTile)
            result += this.opTile.asJs();
        return result
    }
        
});

ObjectTile.findMorph = function(id) {
    // FIXME arrgh, what about morphs in subworlds?
    var result;
    WorldMorph.current().withAllSubmorphsDo(function() { if (this.id() === id) result = this });
    return result;
};

Object.subclass('TileMenuCreator', {
    
    initialize: function(target, tile) {
        this.target = target;
        this.tile = tile;
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
            return self.methodNamesFor(className).collect(function(ea) { return [ea, function() { self.tile.addFunctionTile(ea) }] });
        }]);
    },
    
    ignoredMethods: [ // from Morph
                    "constructor", "internalInitialize", "initialize", "initializePersistentState",
                    "initializeTransientState", "copyFrom", "deserialize", "prepareForSerialization", "restorePersistentState", "restoreDefs",
                    "restoreFromSubnode", "restoreFromSubnodes", "setLineJoin", "setLineCap", "applyStyle", "makeStyleSpec", "applyStyleNamed", "styleNamed",
                    "applyLinkedStyles", "applyFunctionToShape", "internalSetShape", "setShape", "reshape", "setVertices", "internalSetBounds", "setBounds",
                    "addNonMorph", "addWrapper", "addPseudoMorph", "addWrapperToDefs", "addMorphAt", "addMorphFront", "addMorphBack", "addMorphFrontOrBack",
                    "insertMorph", "removeAllMorphs", "hasSubmorphs", "withAllSubmorphsDo", "invokeOnAllSubmorphs", "topSubmorph", "shutdown",
                    "okToDuplicate", "getTransform", "pvtSetTransform", "setTransform", "transformToMorph", "getGlobalTransform", "translateBy",
                    "defaultOrigin", "align", "centerAt", "toggleFisheye", "setFisheyeScale", "getHelpText", "showHelp", "hideHelp",
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

Tile.subclass('FunctionTile', {
    
    layouterClass: HLayout,
    
    initialize: function($super, bounds, methodName) {
        $super(bounds, "rect");

        this.text1 = this.addMorph(new TextMorph(new Rectangle(0,0,20,15), '.' + methodName + '('));
        this.text1.beLabel();
        
        this.text2 = this.addMorph(new TextMorph(new Rectangle(0,0,20,15), ')'));
        this.text2.beLabel();
        
        this.argumentDropAreas = [];
        this.addDropArea();
    },
    
    addDropArea: function() {
        this.removeMorph(this.text2.remove());
        
        var dropArea = new DropArea(new Rectangle(0,0,20,15), this.addDropArea.bind(this));
        this.argumentDropAreas.push(this.addMorph(dropArea));
        
        this.addMorph(this.text2);
    },
    
    asJs: function() {
        var result = this.text1.textString;
        var args = this.argumentDropAreas.select(function(ea) { return ea.tile() }).collect(function(ea) { return ea.tile().asJs() });
        result += args.join(',');
        result += ')'
        return  result;
    }

});

Tile.subclass('IfTile', {
    
    initialize: function($super, bounds) {
        $super(bounds, "rect");
        this.addMorph(new TextMorph(new Rectangle(0,0,20,this.bounds().height), 'if').beLabel());
        this.testExprDropArea = this.addMorph(new DropArea(new Rectangle(0,0,50,this.getExtent().y)));
        this.exprDropArea = this.addMorph(new DropArea(new Rectangle(0,0,50,this.getExtent().y)));
    },
    
    asJs: function() {
        return 'if (' + this.testExprDropArea.tile().asJs() + ') {' + this.exprDropArea.tile().asJs() + '}';
    }
});
    
Morph.subclass('DropArea', {

    isDropArea: true,
    layouterClass: VLayout,
    
    initialize: function($super, bounds, actionWhenDropped) {
        $super(bounds, "rect");
        this.suppressHandles = true;
        this.styleNormal();
        this.actionWhenDropped = actionWhenDropped;
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
        this.actionWhenDropped && this.actionWhenDropped(morph);
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
    },
    
    okToBeGrabbedBy: function() {
        if (this.tile())
            return this.tile();
        return null;
    }
});

});