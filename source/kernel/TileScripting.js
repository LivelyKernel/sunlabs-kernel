module('lively.TileScripting').requires('Helper.js').toRun(function(thisModule) {

Object.subclass('Layout', {
    
    initialize: function(baseMorph, layoutSpec) {
        this.layoutSpec = layoutSpec || {};
        this.baseMorph = baseMorph;
    },
    
    layout: function() {
        
        // this.baseMorph.layoutChanged = Morph.prototype.layoutChanged.bind(this.baseMorph);
        
        this.baseMorph.submorphs
            .reject(function(ea) { return ea instanceof HandleMorph})
            .inject(pt(0,0), function(pos, ea) {
                ea.setPosition(pos);
                return this.newPosition(ea);
            }, this);

        if (!this.layoutSpec.noResize) {        
            var maxExtent = this.baseMorph.submorphs.inject(pt(0,0), function(maxExt, ea) {
                return maxExt.maxPt(ea.getPosition().addPt(ea.getExtent()));
            });
            this.baseMorph.setExtent(maxExtent);
        };
        
        if (this.layoutSpec.center) { this.centerMorphs() };
        
        // this.baseMorph.layoutChanged();        
        // this.baseMorph.layoutChanged = this.baseMorph.constructor.prototype.layoutChanged.bind(this.baseMorph);
    },
    
    newPosition: function(lastLayoutedMorph) {
        return lastLayoutedMorph.getPosition();
    },
    
    centerMorphs: function() {}
});

Layout.subclass('VLayout', {
    
    newPosition: function($super, lastLayoutedMorph) {
        return lastLayoutedMorph.getPosition().addXY(0, lastLayoutedMorph.getExtent().y);
    },
    
    centerMorphs: function() {
        var centerX = this.baseMorph.shape.bounds().center().x;
        this.baseMorph.submorphs.each(function(ea) {
            ea.setPosition(ea.getPosition().withX(centerX - ea.getExtent().x/2));
        }, this)
    }
    
});

Layout.subclass('HLayout', {
    
    newPosition: function(lastLayoutedMorph) {
        return lastLayoutedMorph.getPosition().addXY(lastLayoutedMorph.getExtent().x, 0);
    },
    
    centerMorphs: function() {
        var centerY = this.baseMorph.shape.bounds().center().y;
        this.baseMorph.submorphs.each(function(ea) {
            ea.setPosition(ea.getPosition().withY(centerY - ea.getExtent().y/2));
        }, this)
    }
    
});

// Some Mokeypatching :-)
// TODO: Merge

Morph.addMethods({
   layout: function(notResizeSelf) {
       this.layoutSpec && this.layoutSpec.layouterClass && new this.layoutSpec.layouterClass(this, this.layoutSpec).layout();
       this.owner && this.owner.layout();
   },
   asTile: function() {
       return new thisModule.ObjectTile(null,this);
   }
});
Morph.prototype.morphMenu = Morph.prototype.morphMenu.wrap(function(proceed, evt) {
    var menu = proceed(evt);
    menu.addItem(["as tile", function(evt) { evt.hand.addMorph(this.asTile()) }.bind(this)], 3);
    return menu;
});
Morph.prototype.removeMorph = Morph.prototype.removeMorph.wrap(function(proceed, morph) {
    proceed(morph);
    this.layout();
    return this;
})

PanelMorph.subclass('lively.TileScripting.TileBoxPanel', {
    onDeserialize: function() {
        // FIXME complete new morph is build, is this really necessary?
        this.owner.targetMorph = this.owner.addMorph(new TileBox().buildView(this.getExtent()));
        this.owner.targetMorph.setPosition(this.getPosition());
        this.remove();
    }
})
Widget.subclass('lively.TileScripting.TileBox', {

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
        var panel = new thisModule.TileBoxPanel(this.viewExtent);
        panel.adjustForNewBounds = Morph.prototype.adjustForNewBounds.bind(this); // so submorphs don't scale
        panel.setFill(Color.white);
        panel.setBorderWidth(1);
        panel.suppressHandles = true;
        
        var defaultCreateFunc = function(theClass, optExtent) {
            return new theClass(optExtent && optExtent.extentAsRectangle());
        };
        [thisModule.IfTile, thisModule.DebugTile, thisModule.NumberTile].each(function(ea) {
            this.add(defaultCreateFunc.curry(ea), null, null, panel);
        }, this);
        
        var buildScriptBox = function() {
            var world = WorldMorph.current();
            var window = new thisModule.ScriptEnvironment().openIn(world);
            // window.remove();
            world.removeMorph(window);
            return window;
        }
        this.add(buildScriptBox, new TitleBarMorph('ScriptBox', 150), 'ScriptBox', panel);
        
        // dbgOn(true);
        new VLayout(panel, {}).layout();
        // panel.openDnD();
        
        return panel;
    }
    
});

Object.extend(thisModule.TileBox, {
    open: function() {
        var tileBox = new thisModule.TileBox();
        tileBox.openIn(WorldMorph.current());
        return tileBox;
    }
});

Widget.subclass('lively.TileScripting.ScriptEnvironment', {
    
    viewTitle: "ScriptBox",
    viewExtent: pt(200,300),
    
buildView: function (extent) {
        var panel = PanelMorph.makePanedPanel(this.viewExtent, [
            ['runButton', function(initialBounds) { return new ButtonMorph(initialBounds) }, new Rectangle(0, 0, 0.3, 0.1)],
            ['delayText', function(initialBounds) { return new TextMorph(initialBounds) }, new Rectangle(0.5, 0, 0.2, 0.1)],
            ['repeatButton', function(initialBounds) { return new ButtonMorph(initialBounds) }, new Rectangle(0.7, 0, 0.3, 0.1)],
            ['tileHolder', function(initialBounds) { return new thisModule.TileHolder(initialBounds) }, new Rectangle(0, 0.1, 1, 0.9)]
        ]);
        
        // var panel = new Morph(extent.extentAsRectangle());
        // panel.runButton = panel.addMorph(new ButtonMorph(panel.bounds().scaleByRect(new Rectangle(0, 0, 0.3, 0.1))));
        // panel.tileHolder = panel.addMorph(new TileHolder(panel.bounds().scaleByRect(new Rectangle(0, 0.1, 1, 0.9))));
        panel.setFill(Color.gray.lighter());
        
        var tileHolder = panel.tileHolder;
        
        var runButton = panel.runButton;
		runButton.setLabel("Run Script");
		runButton.connectModel({model: tileHolder, setValue: "runScript"});
		
		var delayText = panel.delayText;
		delayText.autoAccept = true;
		
		var repeatButton = panel.repeatButton;
		repeatButton.setLabel("Repeat");
		repeatButton.connectModel({model: tileHolder, setValue: "repeatScript"});
		
		
		
		panel.openAllToDnD();
		tileHolder.openDnD();
		panel.openDnD();
		
		this.panel = panel;
        return panel;
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
   
Object.extend(thisModule.ScriptEnvironment, {
    open: function() {
        var scrEnv = new thisModule.ScriptEnvironment();
        scrEnv.openIn(WorldMorph.current());
        return scrEnv;
    }
});

Morph.subclass('lively.TileScripting.TileHolder', {
    
    layoutSpec: {layouterClass: VLayout},
    dropAreaExtent: pt(80,20),
    formals: ["Value"],
    
    initialize: function($super, bounds) {
        $super(bounds, "rect");
        this.setFill(Color.gray.lighter());
        this.layout = this.layout.curry(true); // no resizing on layout --> FIXME
        this.closeDnD();
        this.suppressHandles = true;
        this.addDropArea();
        
    },
    
    onDeserialize: function() {
        // FIXME just a hack...
        console.log('------------------------------------------------>>>>>>>>>> connecting tilescripting buttons...')
        
        var runButton = this.owner.runButton;
		runButton.connectModel({model: this, setValue: "runScript"});
				
		var repeatButton = this.owner.repeatButton;
		repeatButton.connectModel({model: this, setValue: "repeatScript"});
    },
    
    addMorph: function($super, morph) {
        if (morph instanceof SchedulableAction) return $super(morph);
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
        
        var dropArea = new thisModule.DropArea(this.dropAreaExtent.extentAsRectangle(), cleanUp);
        dropArea.setExtent(pt(this.getExtent().x, dropArea.getExtent().y));

        return this.addMorph(dropArea);
    },
    
    tilesAsJs: function() {
        var lines = this.submorphs.select(function(ea) { return ea.tile && ea.tile() }).collect(function(ea) { return ea.tile().asJs() });
        return lines.join(';\n');
    },
    
    runScript: function(btnVal) {
        if (btnVal) return;
        // debugger;
        if (!this.calls) this.calls = 0;
        this.calls++;
        var code = this.tilesAsJs();
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
        if (this.activeScripts) {
            this.owner.repeatButton.setLabel("Repeat");
            
            console.log('stopping tile script');
            this.stopStepping();
            return;
        }
        
        
        var delay = Number(this.owner.delayText.textString);
        if (!delay) return;
        this.owner.repeatButton.setLabel("Stop");
        console.log('starting tile script');
        this.startStepping(delay, 'runScript');
    },
    
    okToBeGrabbedBy: Functions.Null,
     
     layoutChanged: function($super) {
         $super();
         var maxExtent = this.submorphs.select(function(ea){ return ea.isDropArea }).inject(pt(0,0), function(maxExt, ea) {
             return maxExt.maxPt(ea.getPosition().addPt(ea.getExtent()));
         });
         if (this.getExtent().x < maxExtent.x) {
             // FIXME
             // this.owner && this.owner.owner && this.owner.owner.setExtent(pt(maxExtent.x, this.owner.owner.getExtent().y));
             // this.owner && this.owner.setExtent(pt(maxExtent.x, this.owner.getExtent().y));
             // this.setExtent(pt(maxExtent.x, this.getExtent().y));
         }
     }
});

Object.subclass('Test', {

    a: function($super) { 1 },
        
    b: function($super) { 2 }

});

Morph.subclass('lively.TileScripting.Tile', {

    isTile: true,
    defaultExtent: pt(100,20),
    layoutSpec: {layouterClass: HLayout, center: true},
    
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

thisModule.Tile.subclass('lively.TileScripting.DebugTile', {
    
    defaultExtent: pt(100,35),
    layoutSpec: {layouterClass: null},
    
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

thisModule.Tile.subclass('lively.TileScripting.ObjectTile', {
    
    initialize: function($super, bounds, targetMorphOrObject) {
        $super(bounds, "rect");
        
        this.targetMorph = null;
        this.opTile = null;
        this.menuTrigger = null;
        
        this.label = this.addMorph(new TextMorph(this.shape.bounds()));
        this.label.beLabel();
        
        if (targetMorphOrObject) this.createAlias(targetMorphOrObject);
        
    },
    
    onDeserialize: function() {
        if (this.menuTrigger) this.menuTrigger.remove();
        this.addMenuButton();
    },
    
    createAlias: function(morph) {
        this.targetMorph = morph;
        this.label.setTextString(this.objectId());
        this.addMenuButton();
        this.layout();
    },
    
    objectId: function() {
        return this.targetMorph.id();
    },
        
    addMenuButton: function() {
        var extent = pt(10,10);
        this.menuTrigger = this.addMorph(new ButtonMorph(extent.extentAsRectangle()));
        this.menuTrigger.moveBy(pt(0,this.getExtent().y/2 - extent.x/2));
        this.menuTrigger.setFill(this.getFill().darker());
        this.menuTrigger.connectModel({model: this, setValue: "openMenu"});
    },
    
    addFunctionTile: function(methodName) {
        this.menuTrigger && this.menuTrigger.remove();
        this.opTile = new thisModule.FunctionTile(null, methodName);
        this.addMorph(this.opTile);
    },
    
    openMenu: function(btnVal) {
        if (btnVal) return;
        var menu = new thisModule.TileMenuCreator(this.targetMorph, this).createMenu();
        var pos = this.getGlobalTransform().transformPoint(this.menuTrigger.getPosition());
    	menu.openIn(this.world(), pos, false, this.targetMorph.toString());
    },
    
    asJs: function() {
        var result = 'lively.TileScripting.ObjectTile.findMorph(\'' +  this.objectId() + '\')';
        if (this.opTile)
            result += this.opTile.asJs();
        return result
    }
        
});

thisModule.ObjectTile.findMorph = function(id) {
    // FIXME arrgh, what about morphs in subworlds?
    var result;
    WorldMorph.current().withAllSubmorphsDo(function() { if (this.id() === id) result = this });
    return result;
};

Object.subclass('lively.TileScripting.TileMenuCreator', {
    
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
        return this.classes().pluck('type');
    },
    
    methodNamesFor: function(className) {
        var allMethods = Class.forName(className).localFunctionNames();
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
                    "create", "addField", "areEventsIgnored", "addObserver", "removeObserver", "addObserversFromSetters",
                    "nativeWorldBounds", "canvas", "setVisible", "isVisible",
                    "applyFilter", "copy", "getType", "newId", "id", "setId", "setDerivedId", "removeRawNode",
                    "replaceRawNodeChildren", "toMarkupString", "uri", "getLivelyTrait", "setLivelyTrait", "removeLivelyTrait", "getLengthTrait",
                    "setLengthTrait", "getTrait", "setTrait", "removeTrait", "preparePropertyForSerialization",
                    
                    // from OMeta
                    "printOn", "delegated", "ownPropertyNames", "hasProperty", "isNumber", "isString", "isCharacter"]
});

thisModule.Tile.subclass('lively.TileScripting.FunctionTile', {
    
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
        
        var dropArea = new thisModule.DropArea(new Rectangle(0,0,20,15), this.addDropArea.bind(this));
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

thisModule.Tile.subclass('lively.TileScripting.IfTile', {
    
    initialize: function($super, bounds) {
        $super(bounds, "rect");
        this.addMorph(new TextMorph(new Rectangle(0,0,20,this.bounds().height), 'if').beLabel());
        this.testExprDropArea = this.addMorph(new thisModule.DropArea(new Rectangle(0,0,50,this.getExtent().y)));
        this.exprDropArea = this.addMorph(new thisModule.DropArea(new Rectangle(0,0,50,this.getExtent().y)));
    },
    
    asJs: function() {
        return 'if (' + this.testExprDropArea.tile().asJs() + ') {' + this.exprDropArea.tile().asJs() + '}';
    }
});

thisModule.Tile.subclass('lively.TileScripting.NumberTile', {
    
    layoutSpec: {layouterClass: null, center: true},
    eps: 0.001,
    
    initialize: function($super, bounds) {
        bounds = pt(50,20).extentAsRectangle();
        $super(bounds, "rect");
        this.numberText = this.addMorph(new TextMorph(pt(30,20).extentAsRectangle(), '1').beLabel());
        this.addUpDownButtons();
        this.layout();
    },
    
    onDeserialize: function() {
        this.upButton.remove();
        this.downButton.remove();
        this.addUpDownButtons();
    },

    addUpDownButtons: function() {
        var extent = pt(10,10);
        this.upButton = this.addMorph(new ButtonMorph(pt(25,5).extent(extent)));
        this.upButton.setLabel('+');
        this.upButton.connectModel({model: this, setValue: "countUp"});
        this.downButton = this.addMorph(new ButtonMorph(pt(38,5).extent(extent)));
        this.downButton.setLabel('-');
        this.downButton.connectModel({model: this, setValue: "countDown"});
    },
    
    countUp: function(btnVal) {
        if (btnVal) return;
        var number = Number(this.numberText.textString);
        number *= 10;
        number += Math.abs(number) < 10 ? 1 : 10;
        number /= 10;
        this.numberText.setTextString(number.toString());
        this.layout();
    },
    
    countDown: function(btnVal) {
        if (btnVal) return;
        var number = Number(this.numberText.textString);
        number *= 10;
        number -= Math.abs(number) > 10 ? 10 : 1;
        number /= 10;
        this.numberText.setTextString(number.toString());
        this.layout();
    },
    
    asJs: function() {
        return this.numberText.textString;
    }
    
});
Morph.subclass('lively.TileScripting.DropArea', {

    isDropArea: true,
    layoutSpec: {layouterClass: VLayout},
    
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