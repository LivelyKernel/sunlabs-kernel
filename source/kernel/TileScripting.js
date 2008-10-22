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
        this.add(defaultCreateFunc.curry(Tile), panel);
        this.add(defaultCreateFunc.curry(IfTile), panel);
        this.add(defaultCreateFunc.curry(DebugTile), panel);
        
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
    
    initialize: function($super) {
        $super();
        // this.formalModel = ComponentModel.newModel({Name: "NoName"});
    },
    
    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['runButton', function(initialBounds) { return new ButtonMorph(initialBounds) }, new Rectangle(0, 0, 0.3, 0.1)],
            ['tileHolder', function(initialBounds) { return new TileHolder(initialBounds) }, new Rectangle(0, 0.1, 1, 0.9)]
        ]);
        
        var runButton = panel.runButton;
		runButton.setLabel("Run Script");
		runButton.connectModel({model: this, setValue: "runScript"});
		
		var tileHolder = panel.tileHolder;
		
        return panel;
    },
    
    runScript: function() {
        
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
    
    dropAreaExtent: pt(80,20),
    
    initialize: function($super, bounds) {
        $super(bounds, "rect");
        this.setFill(Color.gray.lighter());
        this.addMorph(new DropArea(this.dropAreaExtent.extentAsRectangle()));
    },
    
    addMorph: function($super, morph) {
        $super(morph);
        new VLayout(this).layout();
        return morph;
    }
    
});
    
Morph.subclass('Tile', {

    isTile: true,
    defaultExtent: pt(100,20),
    
    initialize: function($super, bounds) {
        if (!bounds) bounds = this.defaultExtent.extentAsRectangle();
        $super(bounds, "rect");
    },
    
    addMorph: function($super, morph) {
        $super(morph);
        new HLayout(this).layout();
        return morph;
    },
    
    asJs: function() {
        return '';
    }
});

Tile.subclass('DebugTile', {
    
    initialize: function($super, bounds, sourceString) {
        $super(bounds, "rect");
        this.myString = '';
        this.text = this.addMorph(new TextMorph(this.shape   .bounds().insetBy(2)));
        this.text.connectModel({model: this, setText: "setMyString"});
        this.text.setText(sourceString || '"enter code"');
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
        return 'if (' + this.testExprDropArea.tile.asJs() + ') {' + this.exprDropArea.tile.asJs() + '};';
    }
});
    
Morph.subclass('DropArea', {

    initialize: function($super, bounds) {
        $super(bounds, "rect");
        this.tile = null;
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
    
    addMorph: function($super, morph) {
        if (this.tile || !(morph instanceof Tile)) return;
        this.tile = morph;
        $super(morph);
        return morph;
    },
    
    onMouseOver: function(evt) {
        var tile = evt.hand.submorphs.detect(function(ea) { return ea.isTile });
        if (!tile) return;
        this.styleCanReceiveTile();
    },
    
    onMouseOut: function(evt) {
        this.styleNormal();
    }
});

Object.subclass('Layout', {
    
    initialize: function(baseMorph, resizeAfterLayout) {
        this.baseMorph = baseMorph;
        this.resizeAfterLayout = resizeAfterLayout;
    },
    
    layout: function() {
        this.baseMorph.submorphs.inject(pt(0,0), function(pos, ea) {
            ea.setPosition(pos);
            return this.newPosition(ea);
        }, this);
        if (!this.resizeAfterLayout) return;
        
        var maxExtent = this.baseMorph.submorphs.inject(pt(0,0), function(maxExt, ea) {
            return maxExt.maxPt(ea.getPosition().addPt(ea.getExtent()));
        });
        this.baseMorph.setExtent(maxExtent);
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