module('apps.JComponents').requires('lively.Helper').toRun(function() {

PanelMorph.subclass("JSTabbedPane", {

	
	tabPlacement: 'TOP',
	currentTabNr: -1,
	defaultButtonWidth: 88,//50, //TODO determine width with text label length
	defaultButtonHight: 23, //TODO  determine hight  with text hight or later icon higth
	dynamicButtonWidth: 0,
	dynamicButtonHight: 0,
	initialize: function($super, ext,tabPlacement) {
		$super(ext);
		this.components = [];
		this.buttons = [];
		if(tabPlacement) this.setTabPlacement(tabPlacement);
	},
	
	generateTabs: function(){
		this.clearUpMorph();
		
		var that = this;
		var ext = this.getExtent();
		var anz = this.components.length;
		var fract = 1/anz;
		var totalWidth = ext.x; 
		var totalHight = ext.y; 
		var dynamicWidth = totalWidth/anz; 
		var width = this.defaultButtonWidth;
		var hight =  this.defaultButtonHight;
		var dynamicHight= totalHight/anz;
		this.dynamicButtonHight = dynamicHight;
		this.dynamicButtonWidth = dynamicWidth;
		this.components.forEach(function(ea,i){
			console.log("verarbeit tab "+i+" : "+ea.title);
			var count = i*fract;
			var tabSpec = ea;
			switch(that.tabPlacement){
				case 'TOP':
					console.log("top");
					var rect = new Rectangle(count*totalWidth,0,dynamicWidth,hight);
					break;
				case 'BOTTOM':
					console.log("bottom");
					var rect = new Rectangle(count*totalWidth,totalHight-hight,dynamicWidth,hight);
					break;
				case 'LEFT':
					console.log("width= "+width);
					var rect = new Rectangle(0, totalHight*count,width,dynamicHight);
					break;
				case 'RIGHT':
					var rect = new Rectangle(totalWidth-width, totalHight*count,width,dynamicHight);
					break;
			}
			/*var button = new ButtonMorph(rect); 
			console.log("erzeuge knopf für tab "+i+" : "+tabSpec.title+" mit "+count);
			button.setLabel(tabSpec.title);
			button.buttonAction(function() {
				console.log(tabSpec.title + " chosen. count = "+count+" i = "+i);
				that.updateTabNr(i);
			},that);
			that.addMorph(button);
			that.buttons.push(button);*/
			
			var tooltip = tabSpec.tooltip;
			var tabId = that.buttons.length;
			console.log("tabId: "+tabId);
			var tabFlag = new TabFlagMorph(tabSpec.title,rect,that.tabPlacement,that,tabId,tooltip);
			that.addMorph(tabFlag);
			that.buttons.push(tabFlag);
			//~ tabFlag.formalModel.addObserver({onValueUpdate: function(value){
				//~ if(value){
					//~ console.log("tab Selected");
				//~ }else{
					//~ console.log("tab not Selected");
				//~ }
			//~ }})
		});
		
		//if some tabs exist, and no tab is selected, than the fisrt one is choosen
		if(this.currentTabNr ===-1 && this.buttons.length>0){
			console.log("Showing tab 0");
			this.updateTabNr(0);
		}
		that.correctTabFlagHighlight(that.currentTabNr);
		
	},
	
	/*
	*@private 
	* Berechnet den Punkt mit hilfe dessen die Position einer Component gestetz wird
	*/
	getOfsetpoint: function(){
		switch(this.tabPlacement){
			case 'TOP':
				var point = pt(0,this.defaultButtonHight);
				break;
			case 'BOTTOM':
				var point = pt(0,0);
				break;
			case 'LEFT':
				var point = pt(this.defaultButtonWidth,0);
				break;
			case 'RIGHT':
				var point = pt(0,0);
				break;
		}
		return point;
	},
	
	updateTabNr: function(nr){
		console.log("new tab nr is :"+nr);
		this.currentTabNr = nr;
		var tabSpec = this.getTabSpecAt(nr);
		var component = tabSpec.component;
		console.log(component);
		var oldMorph = this.currentTabMorph;
		if(oldMorph){
			this.removeMorph(oldMorph);
		}
		this.currentTabMorph = component;
		this.addMorphAt(component,this.getOfsetpoint());
		//component.setPosition(this.getOfsetpoint());
		
		//unhighlight
		this.correctTabFlagHighlight(nr);
	},
	
	correctTabFlagHighlight: function(nr){
		this.buttons.forEach(function(ea,i){
			ea.highlight((ea.tabId === nr));
		});
	},
	
	//callback
	tabWasChoosen: function(tabId,tab){
		console.log("tabWasChosen: "+tabId);
		this.updateTabNr(tabId);
		
	},
	
	/**
	*@public
	**/
	getTabSpecAt: function(nr){
		try{
			return this.components[nr];
		}catch(e){
			console.warn(nr+" is no vaild Tab Number");
			throw e;
		}
	},
	
	//@private
	clearUpMorph: function(){
		var that = this;
		this.buttons.forEach(function(ea,i){
			that.removeMorph(ea);
		});
		this.buttons = [];
	},
	
	/**
	* @public
	**/
	addTab: function(title, icon, component, tip ){
		this.components.push({
			title: title,
			icon: icon,
			component: component,
			tooltip: tip
		});
		this.generateTabs();
	},
	
	//~ /**
	//~ * @public
	//~ **/
	//~ remove: function(){
		//~ //TODO
		//~ this.generateTabs();
	//~ },
	
	/**
	* @public
	**/
	removeAll: function(){
		this.components = [];
		this.clearUpMorph();
	},
	
	/**
	*@public
	* Possible Values: 'TOP', 'BOTTOM' , 'LEFT' or 'RIGHT'
	* Default value is TOP.
	**/
	setTabPlacement :function(tabPlacement){
		if((tabPlacement === 'TOP')||(tabPlacement === 'BOTTOM')||(tabPlacement === 'LEFT')||(tabPlacement === 'RIGHT')){
			this.tabPlacement = tabPlacement;
			this.generateTabs();
		}else{
			throw new Error("IllegalArgumentException: arg has to be a String. Possible Values: 'TOP', 'BOTTOM' , 'LEFT' or 'RIGHT'");
		}
	},
	
	/**
	*@public
	* Possible Values: 'TOP', 'BOTTOM' , 'LEFT' or 'RIGHT'
	**/
	getTabPlacement :function(){
		return this.tabPlacement;
	},
	
	/**
	*@public
	* Returns number of tabs
	**/
	getTabRunCount :function(){
		return this.buttons.length;
	}
	
	
});

/**
* strongly inspired by Widgets.js->TitleTabMorph
* and a bit ba ButtonMorph
**/
BoxMorph.subclass("TabFlagMorph", {

    documentation: "A Flag symbolizes a tab in a JSTabbedPane",

    controlSpacing: 3,
    barHeight: 22,
    //~ shortBarHeight: 15,
    style: {borderWidth: 0, fill: null},
    labelStyle: { borderRadius: 8, padding: Rectangle.inset(6, 2), 
		  fill: lively.paint.LinearGradient([new lively.paint.Stop(0, Color.white),
						     new lively.paint.Stop(1, Color.gray)])
		},
    formals: ["Value"],
    
    initialize: function($super, headline, bounds, tabPlacement, ownerProg, tabId, tooltip) {
	//~ windowMorph,
	//~ optSuppressControls
	
	//~ if (optSuppressControls)  this.barHeight = this.shortBarHeight; // for dialog boxes
	//var bounds = new Rectangle(0, 0, windowWidth, this.barHeight);
	
	//~ if (Config.selfConnect) {
		//~ var model = Record.newNodeInstance({Value: false});
	    //~ // this default self connection may get overwritten by, eg, connectModel()...
	    //~ this.relayToModel(model, {Value: "Value"});
	//~ }
	console.log("bounds = "+bounds)
        $super(bounds);
	
	this.tabPlacement = tabPlacement;
	this.ownerProg = ownerProg;
	this.tabId = tabId;
	this.tooltip = tooltip;
	
	//this.barHeight = bounds.height;
	console.log("barHeight = "+this.barHeight);
	// contentMorph is bigger than the titleBar, so that the lower rounded part of it can be clipped off
	// arbitrary paths could be used, but FF doesn't implement the geometry methods :(
	// bounds will be adjusted in adjustForNewBounds()
	var contentMorph = Morph.makeRectangle(bounds);
	this.addMorph(new ClipMorph(bounds)).addMorph(contentMorph);
	contentMorph.linkToStyles(["titleBar"]);
//	this.ignoreEvents();
	contentMorph.ignoreEvents();
	contentMorph.owner.ignoreEvents();
	this.contentMorph = contentMorph;
	contentMorph.okToBeGrabbedBy = Functions.Null;
	contentMorph.owner.okToBeGrabbedBy = Functions.Null;
        //~ this.windowMorph = windowMorph;

	    
        // Note: Layout of submorphs happens in adjustForNewBounds (q.v.)
        var label;
        if (headline instanceof TextMorph) {
	    label = headline;
        } else if (headline != null) { // String
	    // wild guess headlineString.length * 2 *  font.getCharWidth(' ') + 2;
	    var width = headline.length * 8; 
		var hight = 22; //this.barHeight TODO
	    label = new TextMorph(new Rectangle(0, 0, width, hight), headline).beLabel();
        }
        label.applyStyle(this.labelStyle);
        this.label = this.addMorph(label);
	//~ if (!optSuppressControls) {
            //~ var cell = new Rectangle(0, 0, this.barHeight, this.barHeight);
            //~ this.closeButton =  this.addMorph(new WindowControlMorph(cell, this.controlSpacing, Color.primary.orange));
	    //~ this.menuButton = this.addMorph(new WindowControlMorph(cell, this.controlSpacing, Color.primary.blue));
            //~ this.collapseButton = this.addMorph(new WindowControlMorph(cell, this.controlSpacing, Color.primary.yellow));
	    //~ this.connectButtons(windowMorph);
	//~ } 
        this.adjustForNewBounds();  // This will align the buttons and label properly
        return this;
    },
    
    //~ connectButtons: function(w) {
	//~ this.closeButton.relayToModel(w, {HelpText: "-CloseHelp", Trigger: "=initiateShutdown"});
	//~ this.menuButton.relayToModel(w, {HelpText: "-MenuHelp", Trigger: "=showTargetMorphMenu"});
	//~ this.collapseButton.relayToModel(w, {HelpText: "-CollapseHelp", Trigger: "=toggleCollapse"});
    //~ },

    
    //~ onDeserialize: function() {
        //~ this.connectButtons(this.windowMorph);
    //~ },

    //~ acceptsDropping: function(morph) {
        //~ //console.log('accept drop from %s of %s, %s', this, morph, morph instanceof WindowControlMorph);
        //~ return morph instanceof WindowControlMorph; // not used yet... how about text...
    //~ },

    highlight: function(trueForLight) {
	var gfx = lively.paint;
	this.label.setFill(trueForLight ? new gfx.LinearGradient([new gfx.Stop(0, Color.white), 
								  new gfx.Stop(1, Color.lightGray)]) : null);
    },

    //~ okToBeGrabbedBy: function(evt) {
        //~ var oldTop = this.world().topSubmorph();
	//~ if (oldTop instanceof WindowMorph) oldTop.titleBar.highlight(false);
        //~ return this.windowMorph;
    //~ },

    okToBeGrabbedBy: Functions.Null,
    
    adjustForNewBounds: function($super) {
	var innerBounds = this.innerBounds();
	var sp = this.controlSpacing;
        $super();
        var loc = this.innerBounds().topLeft().addXY(sp, sp);
        var l0 = loc;
        //~ var dx = pt(this.barHeight - sp, 0);
        //~ if (this.menuButton) { 
	    //~ this.menuButton.setPosition(loc);  
	    //~ loc = loc.addPt(dx); 
	//~ }
        if (this.label) {
            this.label.align(this.label.bounds().topCenter(), this.innerBounds().topCenter());
            if (this.label.bounds().topLeft().x < loc.x) {
                this.label.align(this.label.bounds().topLeft(), loc.addXY(0,-3));
            }
        }
	//~ if (this.closeButton) { 
	    //~ loc = this.innerBounds().topRight().addXY(-sp - this.closeButton.shape.bounds().width, sp);
	    //~ this.closeButton.setPosition(loc);  
	    //~ loc = loc.subPt(dx); 
	//~ }
        //~ if (this.collapseButton) { 
	    //~ this.collapseButton.setPosition(loc);  
	    //loc = loc.subPt(dx); 
	//~ }
	
	/*ORIGINAL
	var style = this.styleNamed("titleBar");
	var w = style.borderWidth;
	var r = style.borderRadius;
	this.contentMorph.setBounds(new Rectangle(w/2, w/2, innerBounds.width, this.barHeight + r));
	var clip = this.contentMorph.owner;
	clip.setBounds(innerBounds.insetByRect(Rectangle.inset(-w/2, -w/2, -w/2, 0)));
	*/
	
	var style = this.styleNamed("titleBar");
	var w = style.borderWidth;
	var r = style.borderRadius;
	this.contentMorph.setBounds(new Rectangle(w/2, w/2, innerBounds.width, 33 + r));//this.barHeight
	var clip = this.contentMorph.owner;
	switch(this.tabPlacement){
		case 'TOP':
			var rect0 = new Rectangle(w/2, w/2, innerBounds.width, 33 + r);
			var rect = Rectangle.inset(-w/2, -w/2, -w/2, 0);
			break;
		case 'BOTTOM':
			var rect0 = new Rectangle(w/2, w/2, innerBounds.width, 33 + r);
			var rect = Rectangle.inset(0, -w/2, -w/2, -w/2);
			break;
		case 'LEFT':
			var rect0 = new Rectangle(w/2, w/2, this.innerBounds().width+r, 33);
			var rect = Rectangle.inset(-w/2, -w/2, 0, -w/2);
			break;
		case 'RIGHT':
			var rect0 = new Rectangle(w/2-r, w/2, this.innerBounds().width+r, 33);
			var rect = Rectangle.inset(0, 0,0, 0);
			break;
	}
	this.contentMorph.setBounds(rect0);
	this.contentMorph.owner.setBounds(innerBounds.insetByRect(rect));
	/*
	So geht es für LEFT:
	this.contentMorph.setBounds(new Rectangle(2/2, 2/2, this.innerBounds().width+8, 33));
this.contentMorph.owner.setBounds(this.innerBounds().insetByRect(Rectangle.inset(-1, -1,0, -1))); oder überall -1 ista usch giz

und so für RIGHT
this.contentMorph.setBounds(new Rectangle(2/2, 2/2, this.innerBounds().width+8, 33));
this.contentMorph.owner.setBounds(this.innerBounds().insetByRect(Rectangle.inset(-8, 0,0, 0)));

this.contentMorph.setBounds(new Rectangle(2/2-8, 2/2, this.innerBounds().width+8, 33)); undefined
this.contentMorph.owner.setBounds(this.innerBounds().insetByRect(Rectangle.inset(-1, -1,-1,-1)));
	
	this.contentMorph.setBounds(new Rectangle(2/2, 2/2, this.innerBounds().width, 33+ 8)); undefined
this.styleNamed("titleBar").borderRadius 8
 this.barHeight 22
	this.styleNamed("titleBar").borderWidth; 2
this.contentMorph.owner.setBounds(this.innerBounds().insetByRect(Rectangle.inset(2, -1, -1, -1)));
	*/
    },
	
	setTitle: function(string) {
		this.label.setTextString(string);
		this.adjustForNewBounds();  // This will align the buttons and label properly
	},

    okToDuplicate: Functions.False,
    
    handlesMouseDown: Functions.True,
    onMouseMove: Functions.Empty, //disabel moving of the tabFlag
	
	onMouseDown: function ($super, evt) {
		$super(evt);
		console.log("tab clicked");
		//~ this.setValue(true);
		this.ownerProg.tabWasChoosen(this.tabId, this);
		this.highlight(true);
		
    },
	
	getHelpText: function(){
		return this.tooltip || "";
	}
	
	
	//~ onValueUpdate: function(value) {
		//~ console.log("tabflag: onValueUpdate called");
		//~ this.highlight(value);
	//~ }
    

});



});// end JuliusComponents