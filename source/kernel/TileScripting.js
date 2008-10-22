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

Morph.addMethods({
   layout: function(notResizeSelf) {
       this.layouterClass && new this.layouterClass(this, !notResizeSelf).layout();
       this.owner && this.owner.layout();
   }
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
            self.addDropArea();
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
        if (morph instanceof HandleMorph) return;
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
        this.text.connectModel({model: this, setText: "setMyString"});
        this.text.setText(sourceString || '"enter code"');
        this.closeAllToDnD();
        // FIXME why is it so hard to use a SIMPLE TextMorph??!
        
    },
    
    setMyString: function(string) { this.myString = string },
    
    asJs: function() {
        return this.myString;
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
        return 'if (' + this.testExprDropArea.tile().asJs() + ') {' + this.exprDropArea.tile().asJs() + '};';
    }
});
    
Morph.subclass('DropArea', {

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
        // dbgOn(true);
        if (this.tile() || !(morph instanceof Tile)) return morph;
        
        this.setExtent(morph.getExtent());
        $super(morph);
        morph.setPosition(pt(0,0));
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