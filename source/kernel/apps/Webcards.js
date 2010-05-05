
// ===========================================================================
// WebCards 
// ===========================================================================
module('apps.Webcards').requires('lively.Helper','apps.JComponents','apps.CouchDB','cop.Layers').toRun(function() {

createLayer("WebcardsLayer");
createLayer("FrontMorphLayer");
createLayer("MasterContentLayer");

BoxMorph.subclass("SimpleDataStore", {//PanelMorph makes problems because of focus, which eates droped Morpphs.
	documentation: "SimpleDataStore is the main class of WebCards",
	
	totalWidth: 0,
	totalHeight : 0,
	
	cardWidth: 0,
	cardHeight : 0,
	
	borderW : 10, //toolbar distance
	borderH: 10,
	
	buttonBorder: 4,
	
   	initialize: function($super, ext) {
		$super(ext);
		this.stopWords =  this.stopWords.concat(['owner']);
	    this.relaxedMgmt = new RelaxedMgmt(this);
		this.totalWidth = ext.x;
		this.totalHeight = ext.y; 	
		this.leftToolBarWidth = 100;
		this.previewWidth = 150;
		this.cardWidth = this.totalWidth-this.leftToolBarWidth - this.previewWidth;
		this.inputHeight = 21.200000762939453+this.buttonBorder*2;
		this.cardHeight = this.totalHeight-this.inputHeight;
		this.cardHolder = this.addMorph(Morph.makeRectangle(new  Rectangle(0,0,0,0))); 
		this.elementMasterList = this.initElementMasterList(pt(this.leftToolBarWidth, this.totalHeight));
		this.initControllPane(new Rectangle(this.leftToolBarWidth,this.totalHeight-this.inputHeight,
			this.totalWidth-this.leftToolBarWidth,this.inputHeight));
		this.previewList = this.addMorph(new PreviewPane(new Rectangle(this.leftToolBarWidth+this.cardWidth,0,this.previewWidth, this.totalHeight)));
		return this;
    },
    
    initControllPane: function(rectExt) {
    	var controllPane = new BoxMorph(rectExt);
    	controllPane.setFill(Color.lightGray);
    	
    	//Buttons:
    	var fix = this.buttonBorder;
		this.buttonNewCard = controllPane.addMorph(new NewCardButtonMorph(new Rectangle(
			(this.cardWidth/2)-50, 
			fix, 
			100,
			22
		), this));
		this.buttonPrev = controllPane.addMorph(new PrevButtonMorph(new Rectangle(
			(this.cardWidth/2)-50-80-5,
			fix,
			80,
			22
		),this));
		this.buttonNext = controllPane.addMorph(new NextButtonMorph(new Rectangle(
			(this.cardWidth/2)+50+5,
			fix,			
			80, 
			22
		),this));
		
		this.addMorph(controllPane);
		return controllPane;
    },    
    
    initElementMasterList: function(ext){
    	var hi = 21.200000762939453;
		var elementMasterList = new BoxMorph(new Rectangle(0,0,ext.x,ext.y));
		elementMasterList.setWithLayers([MasterContentLayer]);
		elementMasterList.setFill(Color.lightGray);
		elementMasterList.blueRect = elementMasterList.addMorph(new ContentRectangle(this,this.borderW,this.borderH));
		elementMasterList.textMaster = elementMasterList.addMorph(new ContentTextMorph(this,this.borderW,this.borderH));
	    elementMasterList.buttonMaster = elementMasterList.addMorph(new ContentButtonMorph(this,this.borderW,this.borderH));
		var line = new ContentLine(this,this.leftToolBarWidth,this.borderH);
		line.setPosition(pt(this.leftToolBarWidth*0.05,this.borderH*4+80+hi*2));
		elementMasterList.addMorph(line);
		this.addMorph(elementMasterList);
		elementMasterList.openForDragAndDrop = true;
		elementMasterList.acceptsDropping = Functions.True;
		return elementMasterList;
    },
    
	newCard: function(){
		if(!this.stack){
			console.log("create new Stack");
			this.makeStackWithoutGivenName();
		}
		var freshCard = this.stack.newCard();
		this.showCard(freshCard);		
	},
	
	showPrefs: function(obj){
		this.closePrefs();//delete old option Pane
		try{
			var extPoint = pt(this.totalWidth-this.leftToolBarWidth,500);
			if(typeof obj.getPreferenceMorph === "function"){
				var opts = obj.getPreferenceMorph(extPoint);
			}else{
				var colorOpts = (new OptionPanel(obj)).buildView(pt(extPoint.x,255));
				var opts = new JSTabbedPane(colorOpts.getExtent(),'TOP');
				opts.addTab('Color Style','noIcon',colorOpts,'');
			}
			var wm = new WindowMorph(opts, 'Options for '+obj.id().truncate(12,''));
			this.prefs = this.addMorphAt(wm,pt(this.leftToolBarWidth,this.totalHeight));
		}
		catch(e){
			console.warn("Problem wiht Prefs: "+e);

		}
	},
	
	closePrefs: function(){
		if(this.prefs)this.prefs.remove();
	},
	
	/* determines wether the change of the recent card is animated */
	animate:true,
	
	showCard: function(cardToShow){
		if(cardToShow){
			this.closePrefs(); //close Optionpane
			var lastCard = this.currentCard;
			this.currentCard = cardToShow;
			if(lastCard){
				lastCard.closeDnD();
				if(this.animate){
					//(destination, nSteps, msPer, callBackFn, finalScale)
					lastCard.animatedInterpolateTo(this.previewList.guessPositionOfPreview(lastCard),5,60,this.showCardContinue(lastCard).bind(this),0.25); 
				}else{
					this.showCardContinue(lastCard);
				}
			}else{
				//no old card to remove
				this.showCardFin();
			}
			
			return true;
		}
		else{
			return false;
		}
	},
	
	showCardContinue: function(lastCard){
		lastCard.setScale(0.25);
		this.previewList.addCard(lastCard);
		this.showCardFin();
	},
	
	showCardFin: function(){
		var isNewCard = (this.currentCard.getPosition().x === 0) && (this.currentCard.getPosition().y === 0);
		console.log("showCardFin: current position: "+this.currentCard.getPosition()+" new? = "+isNewCard);
		if(!isNewCard) this.cardHolder.addMorphAt(this.currentCard,this.previewList.guessPositionOfPreview(this.currentCard));
		if(this.animate){
			this.currentCard.animatedInterpolateTo(pt(this.leftToolBarWidth,0),5,60,this.showCardAnim2Fin.bind(this),1); 
		}
		else{
			this.showCardAnim2Fin();
		}
		
	},
	
	showCardAnim2Fin: function(){
		this.cardHolder.addMorphAt(this.currentCard,pt(this.leftToolBarWidth,0));
		this.currentCard.setScale(1);
		this.currentCard.openDnD();
	},
	
	/**
	*@param dest number of the card to show
	**/
	go: function(dest){
		if(!this.stack){
			console.log("No Stack jet");
			return;
		}
		var destCard = this.stack.getCardForNr(dest);
		if(destCard){
			console.assert(destCard.cardNr === dest, "Wrong Card found");
			return this.showCard(destCard);
		}
		else{
			console.warn("Card "+dest+" not found");
			return false;
		}
		
	},
    
    handlesMouseDown: Functions.True,
    
    openStackWithName: function(name) {
    	console.log("Try to open stack for Name = %s",name);
    	if(!name){
    		this.world().alert("Need name to open stack");
    		console.log("No Name to open stack");
    		return;
		}
    	var cds;
    	try{
    		var stackname = this.relaxedMgmt.stackNameForAlias(name);
    		console.log("%s -> %s",name, stackname);
    	}catch(e){
    		console.log(e);
    		console.log("Can't get stackname for alias");
    		this.world().alert("No stack with that name");
    		return;
    	}
    	this.relaxedMgmt.initExistingStack(stackname);
    	var stk;
    	withoutLayers([WebcardsLayer], function() {
    		stk = this.relaxedMgmt.getStackObjForName(stackname);
    	}.bind(this));
    	if(stk){
    		this.stack = stk;
    		if(this.owner.setTitle) this.owner.setTitle(name);
    		this.relaxedMgmt.loadAllCmds();
    		if(stk.cards.length>0){
    			this.go(0);
			}
    	}
    	else{
    		//new Name
    		console.log("no Stack with name: %s",name);	
    		this.world().alert("No stack for that name");
    	}    	
    },
    
    giveTheStackAName: function(name) {	
    	if(!name){
    		console.log("needs name");
    		this.world().alert("Needs a name");
    		return;
    	}
    	if(this.stack){
    		var stackName = this.stack.getStackName();
    	}else{
    		//no stack 
    		var orgName = name;
    		var stackName = name.toLowerCase();
    		name = name.toLowerCase();
    	}
    	try{
    		this.aliasForStack(name,stackName);
    		if(orgName && orgName!==stackName){
    			this.aliasForStack(orgName,stackName);
    		}
    	}catch(e){
    		console.log("cant use name %s. Error: %s",name,e);
    		this.world().alert("cant use name "+name+". Error: "+e);
    	}
    	if(!this.stack){
    		this.newStack(name);
    		try{
    			this.relaxedMgmt.initNewStack(name);
    		}catch(e){
				this.world().alert("Could not creat DB for stack: "+e.reason);
				return;
			}
    		this.relaxedMgmt.initalWaitForServerPush();
    		console.assert(this.stack.getStackName() === name, "naming problem");
    	}else{
    		if(this.owner.setTitle) this.owner.setTitle(name);
    	}
    },
    
    aliasForStack: function(alias, stackname) {
    	var aliasDB = new CouchDB("stacknames");
    	var alias = {
    		_id: alias,
    		alias: alias,
    		stackName: stackname
    	};
    	aliasDB.save(alias);
    },
    
    makeStackWithoutGivenName: function() {
    	var name;
    	var errorCount = 0;
    	loop: while(errorCount<10){
	    	try{
	    		name = StaticHelper.generateRandomWord(8+errorCount);
	    		this.aliasForStack(name,name);
	    		break loop;
	    	}catch(e){
	    		console.log("cant use name %s. Error: %s",name,e);
				name = "";
	    		errorCount++;
	    	}
		}
		if(!name){
			console.error("No Name found");
			this.world().alert("Please try again. No random name could be found");
		}else{
			this.relaxedMgmt.initNewStack(name);
			this.newStack(name);
			this.relaxedMgmt.initalWaitForServerPush();
		}
    },
        
    //@private
    newStack: function(name) {
    	var stk = new Stack(this,this.cardWidth, this.cardHeight);
    	stk.setStackName(name);
    	stk.setWithLayers([WebcardsLayer]);
    	this.addMorph(stk);
    	this.stack = stk;
    	if(this.owner.setTitle) this.owner.setTitle(name);
		return stk;
    },
    
    morphMenu: function($super, evt) { 
		var menu = $super(evt);
		menu.addLine();
		menu.addItem(["open stack", function() {
			this.world().prompt("Name of stack to open:", this.openStackWithName.bind(this));
		}.bind(this)]);
		
		menu.addItem(["give the stack a name", function() {
			this.world().prompt("New name for stack:", this.giveTheStackAName.bind(this));
		}.bind(this)]);
		return menu;
	},
	
	getOwnerProg: function ownerProgSds() {
		return this;//its me
    }
    
});


PseudoMorph.subclass("Stack",{
	
	documentation: 'Holds all cards of a WebCards stack',
	stopWords:['ownerProg','owner','$path'],
	
	stackName: null,
	cards: [],
	
	initialize: function($super, ownerProg, cardWidth, cardHeight) {
		$super();
		this.ownerProg = ownerProg;
		this.cardWidth = cardWidth;
		this.cardHeight = cardHeight;
	},
	
	newCard: function() {
		var ext = pt(this.cardWidth,this.cardHeight);
		var realCard = new Card(ext, this.ownerProg);
		var freshCard =  new CompositCard(ext, this.ownerProg);
		freshCard.setForeground(realCard);
		freshCard.openDnD();
		freshCard.setScale(0);
		freshCard.stackName = this.stackName;
		var cardNr = this.cards.length;
		console.log("new Card nr: "+cardNr);
		freshCard.cardNr = cardNr;
		realCard.compositCardNr = cardNr;
		this.cards[cardNr] = freshCard;
		freshCard.setWithLayers([WebcardsLayer]);
		realCard.setWithLayers([FrontMorphLayer]);
		this.addCard(freshCard);
		return freshCard;
	},
	
	addCard: function(freshCard) {
		this.cards[freshCard.cardNr] = freshCard;
		freshCard.setScale(0.25);
		this.ownerProg.previewList.addCard(freshCard);
	},
	
	removeCard: function(card) {
		console.warn("not implemented");
	},
	
	getCardForNr: function(nr) {
		return this.cards[nr];
	},
	
	setStackName:function(name) {
		this.stackName = name;
		this.cards.each(function(e) {
    		e.stackName = name;
    	});
	},
	
	getStackName: function() {
		return this.stackName;
	}
	
});


ButtonMorph.subclass("PrevButtonMorph",{
	
	initialize: function($super, ext, webCardsApp) {
		$super(ext);
		this.webCardsApp = webCardsApp;
		this.setLabel("<");
	},
	
	onMouseDown: function (evt){
		if(!this.webCardsApp.currentCard){
			console.log("no cards yet");
			return;
		}
		var dest = Math.max(this.webCardsApp.currentCard.cardNr-1,0);//muss größer 0 sein.
		console.log("Go to "+dest);
		this.webCardsApp.go(dest); 
	}

});

ButtonMorph.subclass("NextButtonMorph",{
	
	initialize: function($super, ext, webCardsApp) {
		$super(ext);
		this.webCardsApp = webCardsApp;
		this.setLabel(">");
	},
	
	onMouseDown: function (evt){
		if(!this.webCardsApp.currentCard){
			console.log(" no cards yet");
			return;
		}
		var max = 0;
		if(this.webCardsApp.stack && this.webCardsApp.stack.cards) max = this.webCardsApp.stack.cards.length-1;
		var dest = Math.min(this.webCardsApp.currentCard.cardNr+1, max); //dest muss kleiner max sein.
		console.log("Go to "+dest);
		this.webCardsApp.go(dest); 
	}

});


	
	
ButtonMorph.subclass("NewCardButtonMorph",{
	
	initialize: function($super, ext, webCardsApp) {
		$super(ext);
		this.webCardsApp = webCardsApp;
		this.setLabel("New Card");
	},
	
	onMouseDown: function (evt){
		this.webCardsApp.newCard();
	}

});


PanelMorph.subclass("Card",  {
	
	initialize: function($super, ext, ownerProg) {
		$super(ext);
		this.width = ext.x;
		this.height = ext.y;
		this.setFill(Color.white);
		this.originalOnMouseMove = this.onMouseMove;
		this.ownerProg = ownerProg;
		console.assert(this.ownerProg, "Card has no ownerProg");
		this.stopWords = this.stopWords.concat(['ownerProg','webCardModel']);
	},
	
	addMorph: function($super, morph) {	
		console.log("addMorph to Card");
		var result = $super(morph);
		if(!morph.ownerProg){
			morph.ownerProg = this.ownerProg;
		}
		if(typeof morph.initHaloMenu === "function"){
			morph.initHaloMenu();
		}
		return result;
	},
	
	reshape: Functions.Empty,
	
	setIsInTheFront: function(front){
		var opac = front? 0: 1;
		this.setFillOpacity(opac); //is done twice at the moment
		this.isInTheFront = front;
	},

	morphToGrabOrReceive: function($super, evt, droppingMorph, checkForDnD) {
		if(droppingMorph!==null && checkForDnD!==false)console.log("morphToGrabOrReceive called: droppingMorph = %s. checkForDnD = %s.",droppingMorph,checkForDnD);
		// If checkForDnD is false, return the morph to receive this mouse event (or null)
		// If checkForDnD is true, return the morph to grab from a mouse down event (or null)
		// If droppingMorph is not null, then check that this is a willing recipient (else null)
		if(!this.isInTheFront){
			return $super(evt, droppingMorph, checkForDnD);
		}
		else if(this.isInTheFront && checkForDnD && droppingMorph!==null){
			
			var res = $super(evt, droppingMorph, checkForDnD);
			console.log("i ("+this+") am a foreground: i take the morph  with res "+res);
			return res;
			
		}else{
			var superRes = $super(evt, droppingMorph, checkForDnD);
			if(superRes === this){
				return null;
			}else{
				return superRes;
			}
		}
	
	},
	
	toJSON: function(){
		console.warn("toJSON of Card called");
		var jso = {
			"id" : this.id(),
			"width" : this.width,
			"height" : this.height,
			"fill" : this.getFill()
		};
		return jso;
	}

});

Object.subclass('MouseHandlerForForeground', {

    initialize: function (foreground) {
		this.foreground = foreground;
    },

    handleMouseEvent: function(evt, originalTarget) {
    	if (evt.type == "MouseDown"){
    		evt.hand.setMouseFocus(originalTarget);
		}
		evt.hand.resetMouseFocusChanges();
		if(this.foreground.isInTheFront && originalTarget === this.foreground){
			return false;
		}
		
		var targetMorph = this.foreground;
		var handler = targetMorph[evt.handlerName()];
		if (handler) handler.call(targetMorph, evt, originalTarget);
		
		if (evt.type == "MouseUp") {
		    // cancel focus unless it was set in the handler
		    if (evt.hand.resetMouseFocusChanges() == 0) {
				evt.hand.setMouseFocus(null);
		    }
		}
		return true; 
    },

    handlesMouseDown: Functions.True

});

PanelMorph.subclass("CompositCard", {
	
	documentation :"A Card consisting of other Cards",
	
	initialize: function($super, ext,ownerProg) {
		$super(ext);
		this.backgrounds = [];
		this.stopWords = this.stopWords.concat(['owner','ownerProg','webCardModel','preferenceMorph']);
		this.ownerProg = ownerProg;
		this.makeWebCardModel();
	},
	
	makeWebCardModel: function() {
		this.webCardModel = Record.newNodeInstance({BackgroundCardNr:"" });
		return this.webCardModel;
	},

	setForeground: function(mainC,normalize){
		if(this.foreground){
			console.warn("foreground already set");
		}
		this.foreground = mainC;
		mainC.setIsInTheFront(true);
		
		if(this.backgrounds.length>0){
			mainC.setFillOpacity(0.5);
		}
		else{
			mainC.setFillOpacity(1);
		}
		
		this.addMorphFront(mainC);
		if(normalize){
			this.normalize(mainC);
		}
	},
	
	getForeground: function(){
		return this.foreground;
	},
	
	getPreferenceMorph: function(extPoint ){
		//Singelton
		if(this.preferenceMorph){
			return this.preferenceMorph;
		}
		if(!this.webCardModel){
			this.makeWebCardModel();
		}
		else{
			var generalOpts = this.makeGeneralPreferenceMorph(pt(extPoint.x,50));			
			var opts = new JSTabbedPane(generalOpts.getExtent(),'TOP');
			opts.addTab('General','noIcon',generalOpts,'set background here');
			this.preferenceMorph = opts;
			return opts;
		}
	},
	
	makeGeneralPreferenceMorph: function(extent){
		var panel = new PanelMorph(extent);
		panel.linkToStyles(["panel"]);
		var concern = this;
		var y = 10;		
		panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), "Background Card Nr:").beLabel());
		var backgroundCardNrField = panel.addMorph(new TextMorph(new Rectangle(150, y, 200, 20)));
		backgroundCardNrField.connectModel(this.webCardModel.newRelay({Text: 'BackgroundCardNr'}), true);
		backgroundCardNrField.autoAccept = true;
		var hasBackgrounds = this.backgrounds.length>0;
		if(hasBackgrounds){
			//only one background at the moment
			backgroundCardNrField.setAcceptInput(false);
		}
		var hasKidz = this.getForeground().kidz && this.getForeground().kidz.length>0;
		if(hasKidz){
			//backgrounds cant have backgrounds themself
			backgroundCardNrField.setAcceptInput(false);
		}
		this.webCardModel.addObserver({onBackgroundCardNrUpdate: function(newValue) { 
			try{
				//This action is executed to change the background of a card
				if(hasBackgrounds){
					WorldMorph.current().alert("Only one background allowed");
					return;
				}
				if(hasKidz){
					WorldMorph.current().alert("backgrounds can't have backgrounds themself");
					return;
				}
				var card = this.ownerProg.stack.getCardForNr(newValue);
				this.addBackground(card.getForeground());    	
				backgroundCardNrField.autoAccept = false;
				backgroundCardNrField.setAcceptInput(false);
				
			}catch(e){
				console.warn(e);
			}
		}.bind(concern)});
		
		return panel;
	},
	
	morphMenu: function($super, evt) { 
		var menu = $super(evt);
		menu.addLine();
		menu.addItem(["set background", function() {
			this.ownerProg.showPrefs(this);
		}.bind(this)]);
		return menu;
	},
	
	addBackground: function(backC){
		console.log("addBackground "+backC.id()+" to "+this.id());
		this.backgrounds.each(function(ea){
			withoutLayers([WebcardsLayer], function() {
 				ea.setFillOpacity(0);
 			}.bind(this));
		}.bind(this));
		this.backgrounds.push(backC);
		withoutLayers([WebcardsLayer], function() {
			backC.setFillOpacity(1);
		}.bind(this));
		if(this.backgrounds.length===1){//only nessecary, when adding first background
			withoutLayers([WebcardsLayer], function() {
				this.foreground.setFillOpacity(0.5);
			}.bind(this));
			this.foreground.mouseHandler= new MouseHandlerForForeground(this.foreground);
		}		
		withoutLayers([WebcardsLayer], function() {
			this.normalize(backC);			
			this.generateCardForBackground(backC);
		}.bind(this));
	},
	
	normalize: function(morph){
		morph.setPosition(pt(0,0));
		morph.setScale(1);
	},
	
	generateCardForBackground: function(backCard) {
		var shCopier = new SpecialIdHandlingCopier(this.cardNr);
		var copy = backCard.copy(shCopier);
		copy.submorphs.forEach(function each(m) {
			if(typeof m.initHaloMenu === "function") m.initHaloMenu();
		});
		this.addMorphBack(copy);
		this.normalize(copy);
		shCopier.addMapping(backCard.id(), copy);
		shCopier.handelReWrapObjs(this.ownerProg);
	},
	
	afterRestoreFromJso: function($super, jso, relaxer) {
		$super(jso, relaxer);
		this.backgrounds.each(function(backCard){
			console.assert(this.ownerProg, "CompositCard has no ownerProg");
			backCard.ownerProg = this.ownerProg;
		}.bind(this));
	}
});


Copier.subclass('SpecialIdHandlingCopier',{
	
	initialize: function($super,suffix){
		$super();
		console.assert(suffix !== undefined, "no suffix provided");
		this.suffix = suffix;	
		this.reWrapObjs = [];
		this.reWrapObjsSet = {}; //for duplicate avoidence
	},
	
	newIdForOld: function(oldId) {
		return oldId.split(':')[0] +'_'+ this.suffix;
	},
	
	addMapping: function($super, oldId, newMorph){
		$super(oldId, newMorph);
	
		if(this.reWrapObjsSet[oldId]){
			//we have already seen him
			return;
		}
		this.reWrapObjsSet[oldId] = true;
		var newId = this.newIdForOld(oldId);
		newMorph.$oldId = oldId;
		this.reWrapObjs.push(newMorph);
		newMorph.setId(newId);
    },
	
	getReWrapObjs: function() {
		return this.reWrapObjs;
	},
	
	handelReWrapObjs: function(givenOwnerProg) {
		var copies = this.getReWrapObjs();
		
		copies.forEach(function each (ea) {
			if(!ea.ownerProg){
				console.warn("%s has no ownerProg",ea);
				ea.ownerProg = givenOwnerProg;
			}
			
			var newId = this.newIdForOld(ea.$oldId);
			if(ea._id){
				ea._id = newId;
				ea._rev = "doNotSave";
			}
			
			if(typeof ea.cmdCount !== undefined){
				ea.cmdCount = 0;
				ea.commandObjectsList = [];
				ea.allCommandsByNr = [];
				ea.highestHandledCommandNr = 0;
				ea.highestHandledSeqNr = 0;
				ea.kidz = [];
				ea.masterCommandObjectsList = [];
			}else{
				console.warn("submoprh %s copied with no cmdCount",ea.id());
			}
			delete ea.$id;
			
			givenOwnerProg.relaxedMgmt.addMapping(ea);
			
			var org = givenOwnerProg.relaxedMgmt.getMappedObj(ea.$oldId);
			if(org){
				withLayers([WebcardsLayer], function() {
					org.addSubChild(ea);
				}.bind(this));
			}else{
				console.info(ea+" has no master");
			}
			
		}.bind(this));
	}
	

});

Morph.subclass("ContentRectangle", {
	
	initialize: function($super,ownerProg,borderW,borderH) {
		$super(new lively.scene.Rectangle(new Rectangle(borderW,borderH,80,80)));
		this.ownerProg = ownerProg;
		this.noShallowCopyProperties = this.noShallowCopyProperties.concat(['preferenceMorph']);
	},

	style: { borderColor: Color.black, borderWidth: 1, fill: Color.blue},
	
	getPreferenceMorph: function(extPoint) {
		//Singelton
		if(this.preferenceMorph){
			return this.preferenceMorph;
		}
		else{
			var obj = this;			
			var colorOpts = (new OptionPanel(obj)).buildView(pt(extPoint.x,500));			
			var opts = new JSTabbedPane(colorOpts.getExtent(),'TOP');
			opts.addTab('Color Style','noIcon',colorOpts,'Color options');			
			this.preferenceMorph = opts;
			return opts;
		}
	}
		
	
});

Morph.subclass("ContentLine",{
	
	initialize: function($super,ownerProg,leftToolBarWidth,borderH) {
		var verts = [pt(0, 0),pt(leftToolBarWidth*0.9, 0)];
		verts = verts.invoke('subPt', verts[0]);
		$super(new lively.scene.Polyline(verts));
		this.restictedReshape=false;
		this.ownerProg = ownerProg;
		this.noShallowCopyProperties = this.noShallowCopyProperties.concat(['preferenceMorph']);
		this.setFill(null);
	},
	
	minExtent: function() { return pt(1,1); },
	padding: Rectangle.inset(0),
	style: {borderWidth: 2, borderColor: Color.red},
	getPreferenceMorph: function(extPoint) {
		//Singelton
		if(this.preferenceMorph){
			return this.preferenceMorph;
		}
		else{
			var obj = this;
			var colorOpts = (new OptionPanel(obj)).buildView(pt(extPoint.x,500));
			var opts = new JSTabbedPane(colorOpts.getExtent(),'TOP');
			opts.addTab('Color Style','noIcon',colorOpts,'Color options');
			this.preferenceMorph = opts;
			return opts;
		}
	}
	
});

ButtonMorph.subclass("ContentButtonMorph", {

	formals:["name","action"],
	initialize: function($super,ownerProg,borderW,borderH) {
		var hi = 21.200000762939453;
		$super(new Rectangle(borderW,borderH*3+80+hi,50,hi));
		this.ownerProg = ownerProg;
	},
	
	setLabel: function($super,txt) {
		this.label && this.label.remove();
		this.label = TextMorph.makeLabel(txt);
        this.addMorph(this.label);
		this.setExtent(pt(this.label.getExtent().x+21,this.label.getExtent().y+8));
		this.label.centerAt(this.innerBounds().center()); 
        return this;
	},
	
	getPreferenceMorph: function(extPoint) {
		//Singelton
		if(this.preferenceMorph){
			console.log("reuse old prefs");
			return this.preferenceMorph;
		}
		this.makeWebCardModel();
		var obj = this;
		var colorOpts = (new OptionPanel(obj)).buildView(pt(500,500));
		var generalOpts = this.makeGeneralPreferenceMorph(pt(extPoint.x,colorOpts.getExtent().y));
		var opts = new JSTabbedPane(colorOpts.getExtent(),'TOP');
		opts.addTab('General','noIcon',generalOpts,'genral option');
		opts.addTab('Color Style','noIcon',colorOpts,'color options');			
		this.preferenceMorph = opts;
		return opts;
	},
	
	makeWebCardModel: function() {
		this.webCardModel = Record.newNodeInstance({
			Name: this.label? this.label.textString:  "", 
			Action: this.script || ""
		});
	},
	
	makeGeneralPreferenceMorph: function(extent){
		var panel = new PanelMorph(extent);
		panel.linkToStyles(["panel"]);
			
		var y = 10;
		
		panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), "Name:").beLabel());
		const button = this;
		var nameField = panel.addMorph(new TextMorph(new Rectangle(150, y, 200, 20),""+this.webCardModel.getName()));
		nameField.connectModel(this.webCardModel.newRelay({Text: 'Name'}), true);
		nameField.autoAccept = true;
		this.webCardModel.addObserver({onNameUpdate: function(newName) { 
				button.setLabel(newName);
		}});
		
		y+= 30;
		
		panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Action:').beLabel());
		var actionField = panel.addMorph(new TextMorph(new Rectangle(150, y, 200, 80),""+this.webCardModel.getAction()));
		actionField.connectModel(this.webCardModel.newRelay({Text: 'Action'}), true);
		this.webCardModel.addObserver({onActionUpdate: function(script){button.setScript(script);}});
		return panel;
	},
	
	setScript: function(script){
		this.script = script;
	},
	
	getScript: function() {
		return this.script;
	},
	
	onMouseDown: function(evt) {
		if(this.script){
			eval(this.script);
		}
		else{
			console.log("the button has no User defined action");
		}
	},
	
	afterRestoreFromJso: function($super, jso, restorer) {
		$super(jso, restorer);
		var realOwner = this.owner;
		this.owner = null;// no chnaged() should be submitted  to owner
		this.applyLinkedStyles();
        this.changeAppearanceFor(false);
        this.owner = realOwner;
	}
	
});

TextMorph.subclass("ContentTextMorph", {
	
	initialize: function($super,ownerProg,borderW,borderH) {
		$super(new Rectangle(borderW, borderH*2+80,80,21.200000762939453),"Textfield");
		this.stopWords = this.stopWords.concat(['ownerProg','preferenceMorph','webCardModel']);
		this.ownerProg = ownerProg;
		this.noShallowCopyProperties = this.noShallowCopyProperties.concat(['preferenceMorph']);//,'model'webCardModel
		this.copyInitialize();
	},
	
	minExtent: function() { return pt(10,5); },
	padding: Rectangle.inset(4),
	
	copyInitialize: function(){
		this.makeWebCardModel();
		// get rid of old model rawNodes COPY from widget.js
		$A(this.rawNode.childNodes).each(function(ea){
			if(ea.tagName == "record") {
				this.rawNode.removeChild(ea);
			}
		}, this);
		this.rawNode.appendChild(this.webCardModel.rawNode);
	},
	
	makeWebCardModel:function() {
		this.webCardModel = Record.newNodeInstance({
			Name: this.label? this.label.textString : "label" , 
			ShowName: true, 
			LabelPlacement:'FRONT', 
			FontSize: this.getFontSize()+"", 
			FontFamily:this.getFontFamily()+"",
			TextColor: this.getTextColor(), 
			TextColorR:""+this.floor(this.getTextColor().r), 
			TextColorG:""+this.floor(this.getTextColor().g), 
			TextColorB:""+this.floor(this.getTextColor().b),
			AcceptInput: this.getAcceptInput(), 
			LeftAlignment:"",
			CenterAlignment:"", 
			RightAlignment:"", 
			JustifyAlignment:"",
			Bold: false, 
			Italic: false});
	},
	
	getPreferenceMorph: function(extPoint) {
		//Singelton
		if(this.preferenceMorph){
			return this.preferenceMorph;
		}
		this.makeWebCardModel();
		var obj = this;
		var colorOpts = (new OptionPanel(obj)).buildView(pt(extPoint.x,500));
		var generalOpts = this.makeGeneralPreferenceMorph(pt(extPoint.x,colorOpts.getExtent().y));
		var textOpts = this.makeTextPreferenceMorph(pt(extPoint.x,colorOpts.getExtent().y));
		var opts = new JSTabbedPane(colorOpts.getExtent(),'TOP');
		opts.addTab('General','noIcon',generalOpts,'general options');
		opts.addTab('Color Style','noIcon',colorOpts,'color options');
		opts.addTab('Text Style','noIcon',textOpts,'text options');
		this.preferenceMorph = opts;
		return opts;
	},
	
	floor: function (x) { return Math.floor(x*255.99); },
	
	makeTextPreferenceMorph: function(extent){
		var panel = new PanelMorph(extent);
		panel.linkToStyles(["panel"]);
		var concern = this;
		
		var y = 10;
		
		panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), "Font Family:").beLabel());
		var fontFamilyField = panel.addMorph(new TextMorph(new Rectangle(150, y, 200, 20)));
		fontFamilyField.connectModel(this.webCardModel.newRelay({Text: 'FontFamily'}), true);
		this.webCardModel.addObserver({onFontFamilyUpdate: function(newValue) { 
				concern.setFontFamily(newValue);
		}});
		
		y+= 30;
		
		panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Font Size:').beLabel());
		var fontSizeField = panel.addMorph(new TextMorph(new Rectangle(150, y, 40, 20)));
		fontSizeField.connectModel(this.webCardModel.newRelay({Text: 'FontSize'}), true);
		this.webCardModel.addObserver({onFontSizeUpdate: function(newValue){concern.setFontSize(newValue);}});
		
		y+= 30;
		
		panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Alignment:').beLabel());
		
		var leftAlignmentButton = panel.addMorph(new ButtonMorph(new Rectangle(150, y, 40, 20)));
		leftAlignmentButton.setLabel("Left");
		leftAlignmentButton.connectModel(this.webCardModel.newRelay({Value: 'LeftAlignment'}), true);
		this.webCardModel.addObserver({onLeftAlignmentUpdate: function(newValue){concern.emphasizeSelectionOrAll({align: 'left'});}});
		
		var centerAlignmentButton = panel.addMorph(new ButtonMorph(new Rectangle(200, y, 40, 20)));
		centerAlignmentButton.setLabel("Center");
		centerAlignmentButton.connectModel(this.webCardModel.newRelay({Value: 'CenterAlignment'}), true);
		this.webCardModel.addObserver({onCenterAlignmentUpdate: function(newValue){concern.emphasizeSelectionOrAll({align: 'center'});}});
		
		var rightAlignmentButton = panel.addMorph(new ButtonMorph(new Rectangle(250, y, 40, 20)));
		rightAlignmentButton.setLabel("Right");
		rightAlignmentButton.connectModel(this.webCardModel.newRelay({Value: 'RightAlignment'}), true);
		this.webCardModel.addObserver({onRightAlignmentUpdate: function(newValue){concern.emphasizeSelectionOrAll({align: 'right'});}});
		
		var justifyAlignmentButton = panel.addMorph(new ButtonMorph(new Rectangle(300, y, 40, 20)));
		justifyAlignmentButton.setLabel("Justify");
		justifyAlignmentButton.connectModel(this.webCardModel.newRelay({Value: 'JustifyAlignment'}), true);
		this.webCardModel.addObserver({onJustifyAlignmentUpdate: function(newValue){concern.emphasizeSelectionOrAll({align: 'justify'});}});
		
		y+= 30;
		
		panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Style:').beLabel());
		
		var boldButton = panel.addMorph(new ButtonMorph(new Rectangle(150, y, 40, 20)));
		boldButton.setLabel("Bold");
		boldButton.toggle=true;
		boldButton.connectModel(this.webCardModel.newRelay({Value: 'Bold'}), true);
		this.webCardModel.addObserver({onBoldUpdate: function(newValue){concern.emphasizeAllBoldItalic({style: 'bold'});}});
		
		var italicButton = panel.addMorph(new ButtonMorph(new Rectangle(200, y, 40, 20)));
		italicButton.setLabel("Italic");
		italicButton.toggle=true;
		italicButton.connectModel(this.webCardModel.newRelay({Value: 'Italic'}), true);
		this.webCardModel.addObserver({onItalicUpdate: function(newValue){console.log("Italic: "+newValue);concern.emphasizeAllBoldItalic({style: 'italic'});}});
		
		y+= 30;
		
		panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Editable:').beLabel());
		
		var editButton = panel.addMorph(new ButtonMorph(new Rectangle(150, y, 40, 20)));
		editButton.setLabel(""+concern.getAcceptInput());
		editButton.toggle=true;
		editButton.connectModel(this.webCardModel.newRelay({Value: 'AcceptInput'}), true);
		this.webCardModel.addObserver({onAcceptInputUpdate: function(newValue){concern.setAcceptInput(newValue); editButton.setLabel(""+newValue);}});
		
		y+= 30;
		
		panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), "Text Color:").beLabel());
		var colorPick = panel.addMorph(new ColorPickerMorph(new Rectangle(150, y, 90, 30)));
		colorPick.connectModel(this.webCardModel.newRelay({Color: "+TextColor"}),true);
		this.webCardModel.addObserver({onTextColorUpdate: function(newValue){
			concern.setTextColor(newValue);
			concern.webCardModel.setTextColorR(""+concern.floor(newValue.r));
			concern.webCardModel.setTextColorG(""+concern.floor(newValue.g));
			concern.webCardModel.setTextColorB(""+concern.floor(newValue.b));
			
		}});
		
		panel.addMorph(new TextMorph(new Rectangle(250, y, 100, 20), 'r:').beLabel());
		var rColorField = panel.addMorph(new TextMorph(new Rectangle(260, y, 35, 20)));
		rColorField.connectModel(this.webCardModel.newRelay({Text: 'TextColorR'}), true);
		this.webCardModel.addObserver({onTextColorRUpdate: function(newValue){
			
			var c = Color.fromTuple(concern.getTextColor().toTuple());
			c.r = newValue/255.99;
			concern.webCardModel.setTextColor(c);
			concern.setTextColor(c);
		}});
		
		panel.addMorph(new TextMorph(new Rectangle(300, y, 100, 20), 'g:').beLabel());
		var gColorField = panel.addMorph(new TextMorph(new Rectangle(310, y, 35, 20)));
		gColorField.connectModel(this.webCardModel.newRelay({Text: 'TextColorG'}), true);
		this.webCardModel.addObserver({onTextColorGUpdate: function(newValue){
			
			var c = Color.fromTuple(concern.getTextColor().toTuple());
			c.g = newValue/255.99;
			concern.webCardModel.setTextColor(c);
			concern.setTextColor(c);
		}});
		
		panel.addMorph(new TextMorph(new Rectangle(350, y, 100, 20), 'b:').beLabel());
		var bColorField = panel.addMorph(new TextMorph(new Rectangle(360, y, 35, 20)));
		bColorField.connectModel(this.webCardModel.newRelay({Text: 'TextColorB'}), true);
		this.webCardModel.addObserver({onTextColorBUpdate: function(newValue){
			
			var c =  Color.fromTuple(concern.getTextColor().toTuple());
			c.b = newValue/255.99;
			concern.webCardModel.setTextColor(c);
			concern.setTextColor(c);
		}});
		
		y += 40;
		
		return panel;
	},
	
	emphasizeSelectionOrAll: function(emph) {
		if (this.hasNullSelection()){
			this.setSelectionRange(0,this.textString.length);
		}
		this.emphasizeSelection(emph);
    },
	
	emphasizeSelectionOrAllBoldItalic: function(emph) {
		if (this.hasNullSelection()){
			this.setSelectionRange(0,this.textString.length);
		}
		this.emphasizeBoldItalic(emph);
    },
	
	emphasizeAllBoldItalic: function(emph) {
		this.setSelectionRange(0,this.textString.length);
		this.emphasizeBoldItalic(emph);
	},
	
	makeGeneralPreferenceMorph: function(extent){
		var panel = new PanelMorph(extent);
		if(!this.webCardModel){console.warn("no webCardModel"); return panel;}
		panel.linkToStyles(["panel"]);
		const concern = this;
			
		var y = 10;
		
		panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), "Name:").beLabel());
		const textfield = this;
		var nameField = panel.addMorph(new TextMorph(new Rectangle(150, y, 200, 20)));
		nameField.connectModel(this.webCardModel.newRelay({Text: 'Name'}), true);
		nameField.autoAccept = true;
		this.webCardModel.addObserver({onNameUpdate: function(newName) { 
				textfield.updateLabel();
		}});
		
		y+= 30;
		
		panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Show Name:').beLabel());
		var showNameButton = panel.addMorph(new ButtonMorph(new Rectangle(150, y, 40, 20)));
		showNameButton.setLabel(""+this.webCardModel.getShowName());
		showNameButton.toggle=true;
		showNameButton.connectModel(this.webCardModel.newRelay({Value: 'ShowName'}), true);
		this.webCardModel.addObserver({onShowNameUpdate: function(newValue){textfield.updateLabel(); showNameButton.setLabel(""+newValue);}});
		
		y+= 30;
		
		panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Name Placement:').beLabel());
		
		var topPlacementButton = panel.addMorph(new ButtonMorph(new Rectangle(150, y, 40, 20)));
		topPlacementButton.setLabel("Top");
		topPlacementButton.buttonAction(function(){
			this.webCardModel.setLabelPlacement("TOP");
			console.assert(this.webCardModel.getLabelPlacement()==="TOP","top not set");
			},this);
			
		var frontPlacementButton = panel.addMorph(new ButtonMorph(new Rectangle(200, y, 40, 20)));
		frontPlacementButton.setLabel("Front");
		frontPlacementButton.buttonAction(function(){this.webCardModel.setLabelPlacement("FRONT");},this);
		
		var leftPlacementButton = panel.addMorph(new ButtonMorph(new Rectangle(250, y, 40, 20)));
		leftPlacementButton.setLabel("Left");
		leftPlacementButton.buttonAction(function(){this.webCardModel.setLabelPlacement("LEFT");},this);
		
		var bottomPlacementButton = panel.addMorph(new ButtonMorph(new Rectangle(300, y, 40, 20)));
		bottomPlacementButton.setLabel("Bottom");
		bottomPlacementButton.buttonAction(function(){this.webCardModel.setLabelPlacement("BOTTOM");},this);
		
		var view = new View();
		view.onLabelPlacementUpdate =  function(newValue){
			concern.updateLabel();
		};
		this.webCardModel.addObserver(view,{LabelPlacement:'!LabelPlacement'});
		return panel;
	},
	
	updateLabel: function(){
		if(!this.label){
			this.label = new TextMorph(new Rectangle(0, 0, 0, 20),"Label").beLabel();
			this.addMorph(this.label);
		}
		this.label.setTextString(this.webCardModel.getName());
		this.label.setVisible(this.webCardModel.getShowName());
		var dist = 5;
		switch(this.webCardModel.getLabelPlacement()){
			case 'TOP':
				var x = 0;
				var y = -1*this.label.getExtent().y-dist;
				break;
			case 'FRONT':
				var x = -1*this.label.getExtent().x-dist;
				var y =0;
				break;
			case 'LEFT':
				var x =  this.getExtent().x+dist;
				var y = 0;
				break;
			case 'BOTTOM':
				var x = 0;
				var y = this.getExtent().y+dist;
				break;
			}
			
			this.label.setPosition(pt(x,y));
	}
	
});

Object.subclass('CommandObject',{
	
	initialize: function(spec){
		this.action = spec.action;
		this.target = spec.target;
		this.newValue = spec.newValue;
		this.oldValue = spec.oldValue;
		this.lokalTimestamp = spec.lokalTimestamp || (new Date()).getTime();
		this.disabled = false;
	},
	
	getAction: function() {
		return this.action;
	},
	
	getTarget: function() {
		return 	this.target;
	},
	
	setTarget: function(newTarget) {
		this.target = newTarget;
	},
	
	getNewValue: function() {
		return this.newValue;
	},
	
	setNewValue: function(newNewValue) {
		this.newValue = newNewValue;
	},
	
	getLokalTimestamp: function() {
		return this.lokalTimestamp;
	},
	
	doIt: function() {
		if(this.isDisabled()){
			return;
		}
		console.warn("not implemented");	
	},
	
	undo: function() {
		if(this.isDisabled()){
			return;
		}
		console.warn("not implemented");	
	},
	
	repeat: function() {
		console.warn("not implemented");
	},
	
	toString: function() {
		return 'CommandObject: '+this.target+'['+this.action+']('+this.newValue+')';
	},
	
	setDisabled: function(bool) {
		this.disabled = bool;
	},
	
	isDisabled: function() {
		return this.disabled === true;
	}
		
});

CommandObject.subclass('SetGetCommandObject',{
	
	initialize: function($super,spec){
		$super(spec);
	},
	
	doIt: function() {
		if(this.isDisabled()){
			return;
		}
		var func = this.getRealFunc();
		if(!func){
			console.warn("Can't get function for %s to doIt",this.action);
			return;
		}
		var result;
		withoutLayers([WebcardsLayer], function() {
 			result =  func(this.newValue);
 		}.bind(this));
 		return result;
		
	},	
	
	/**
	* an action may be 'shape.setFill'
	**/
	getRealFunc: function() {
		var allSubs = this.action.split('.');
		if(allSubs.length===1){
			var func = this.target[this.action];
			func = func.bind(this.target);
		}else{
			console.assert(allSubs.length===2, "Not yet implemented!");
			var func = this.target[allSubs[0]][allSubs[1]];
			if(!func){
				console.warn("Can't get function for %s with 2 args",this.action);
				return null;
			}
			func = func.bind(this.target[allSubs[0]]);
		}
		return func;
	},
		
	undo: function() {
		if(this.isDisabled()){
			return;
		}
		var func = this.getRealFunc();
		if(!func){
			console.warn("Can't get function for %s to undo",this.action);
			return;
		}
		var result;
		withoutLayers([WebcardsLayer], function() {
 			result =  func(this.oldValue);
 		}.bind(this));
 		return result;
	},
	
	repeat: function() {
		var func = this.getRealFunc();
		return func(this.oldValue);
	}
	
});

/**
* Muli args for set Operation, Single arg for undoing set.
**/
SetGetCommandObject.subclass('MultiArgsSetGetCommandObject',{
	
	initialize: function($super,spec){
		$super(spec);
		this.nrOfArgs = spec.nrOfArgs;
		if(typeof this.nrOfArgs !== 'number'){
			this.nrOfArgs = 1;
			console.info("No nrOfArgs");
		}
	},
	
	
	doIt: function() {
		if(this.isDisabled()){
			return;
		}
		var val = this.newValue;
		var func = this.getRealFunc();
		if(!func){
			console.warn("Can't get function for %s to doIt with multi args",this.action);
			return;
		}
		var result;
		withoutLayers([WebcardsLayer], function() {
			if(this.nrOfArgs>1){
				var result = func.apply(this.target, val);
			}else{
				var result = func(val);
			}
		}.bind(this));
		return result;	
	},
	
	undo: function() {
		if(this.isDisabled()){
			return;
		}
		var val = this.oldValue;
		var func = this.getRealFunc();
		if(!func){
			console.warn("Can't get function for %s to undo with multi args",this.action);
			return;
		}
		var result;
		withoutLayers([WebcardsLayer], function() {
			if(this.nrOfArgs===2){//special handling vor setTextString
				var result = func.apply(this.target, [val,undefined]);
			}else{
				var result = func(val);
			}
		}.bind(this));
		return result;	
	}
	
	
});

CommandObject.subclass('AddRemoveCommandObject',{
	
	initialize: function($super,spec){
		$super(spec);
		this.reverseAction = spec.reverseAction;
		if(!this.reverseAction){
			console.log("no reverseAction");
			this.undoImpossibleCount=0; // For methods with no reverseAction.
		}
	},
	
	doIt: function() {
		if(this.isDisabled()){
			return;
		}
		if(this.undoImpossibleCount>0){
			this.undoImpossibleCount--;
		}
		else{
			var result;
			withoutLayers([WebcardsLayer], function() {
				result = this.target[this.action](this.newValue);
			}.bind(this));
			return result;
		}
	},
	
	undo: function() {
		if(this.isDisabled()){
			return;
		}
		
		if(this.target[this.reverseAction]){
			var result;
			withoutLayers([WebcardsLayer], function() {
				result = this.target[this.reverseAction](this.newValue);
			}.bind(this));
			return result;
		}
		else{
			this.undoImpossibleCount++;
			console.warn("no reverseAction, but called");
		}
	}
	
});

SetGetCommandObject.subclass('MetaCommandObject',{
	
	initialize: function($super,spec){
		$super(spec);
	},
	
	doIt: function() {
		if(this.isDisabled()){
			return;
		}
		var func = this.getRealFunc();
		if(!func){
			console.warn("Can't get function for %s to doIt with meta",this.action);
			return;
		}
		var result = func(this.newValue);
 		return result;
	},	
	
	undo: function() {
		if(this.isDisabled()){
			return;
		}
		console.log("wont undo meta!");
	}
	
});

SetGetCommandObject.subclass('AccumulateingCommandObject',{
	
	initialize: function($super,spec){
		$super(spec);
		this.antiValue = spec.antiValue;
		if(typeof this.antiValue === "undefined"){
			if(typeof this.newValue === "number"){
				this.antiValue = this.newValue*(-1);
			}else if(this.newValue.constructor === Point){
				this.antiValue = pt(this.newValue.x*(-1), this.newValue.y*(-1));
			}
		}
	},
	
	undo: function() {
		var val = this.antiValue;
		var func = this.getRealFunc();
		if(!func){
			console.warn("Can't get function for %s to undo with accumulateing",this.action);
			return;
		}
		var result;
		withoutLayers([WebcardsLayer], function() {
			result = func(val);
		}.bind(this));
		return result;
	}
	
});

CouchDB.subclass("CachingCouchDB",{
	documentation:'All opened and saved docs are kept in a forever cache.',
	
	initialize: function($super, name) {
		$super(name);
		this.cach = {};
	},
	
	open: function($super, docId, options) {
		if(this.cach[docId]){
			return this.cach[docId];
		}
		var result = $super(docId, options);
		if(result){
			this.cach[docId] = result;
		}
		return result;
		
	},
	
	save: function($super, doc, options) {
		var result = $super(doc, options);
		this.cach[result.id] = doc;
		return result;
	},
	
	removeFromCach: function(docId) {
		if(this.cach[docId]){
			this.cach[docId] = undefined;
		}
	},
	
	injectToCach: function(docId, doc) {
		this.cach[docId] = doc;
	},
	
	loadAll: function() {
		var all = this.allDocsBySeq({include_docs:true});
    	var rows = all.rows;
    	if(!rows){
    		console.log("Got no objs");
    	}
    	for(var i = 0; i<rows.length; i++){
    		var currentJso = rows[i].doc;
    		this.injectToCach(currentJso._id, currentJso);
    	}
    	return all;
	}
	
});

Object.subclass("RelaxedMgmt",{
	
	initialize: function(ownerProg) {
		this.morphUnderControll = [];
		this.ownerProg = ownerProg;
		if(!this.objCdb){
			this.objCdb = new CouchDB('t');
		}
		if(!this.commmandRestorer){
			this.commmandRestorer = new Restorer();
		}
		if(!this.commandCdb){
			this.commandCdb = new CachingCouchDB('commands');
		}
		this.aliasDB = new CouchDB("stacknames");
		this.update_seq=0;
	},
		
	saveMorph: function(current, rlxr) {
		try{
			var jso = rlxr.anythingToJson(current,'$');
		}finally{
			rlxr.cleanUp();
		}
		var respons = this.objCdb.save(jso);
		console.assert(respons.ok === true, "Response not okay");
		console.assert(respons.id, "no id in response");
		current._id = respons.id;
		current._rev = respons.rev;
		
	},
	
	initNewObjForCouch: function(obj,relaxer,dontSave,dontChangeId) {
		var newUuid = this.objCdb.newUuids(1)[0];
		obj._id = newUuid;
		if(!dontChangeId) obj.setId(newUuid);
		if(!dontSave){
			var rlxr = relaxer || new Relaxer();
			try{
				var jso =  rlxr.anythingToJson(obj,'$');
			}
			finally{
				rlxr.cleanUp();
			}
			var respons = this.objCdb.save(jso);
			console.assert(respons.ok === true, "Response not okay");
			console.assert(respons.id, "no id in response");
			obj._rev = respons.rev;		
		}
		this.commmandRestorer.id2objMap[obj.id()] = obj;
		return obj;
	},
	
	initNewStack: function(name) {
		var objDb = this.objDbForName(name);
		objDb.createDb();
		var mapFun =  function(doc) {
			if(doc.$type === "Stack" && doc.stackName){
				emit(doc.stackName, doc);
			}
		};
		var view = {
			_id : '_design/stack',
			language : "javascript",
			views: {
				"stackView": {
					map: mapFun.toString()
	       		}
   			}
		};
		objDb.saveView(view);
		var cmdDb = this.cmdDbForName(name);
		cmdDb.createDb();
		
		this.objCdb = objDb;
		this.commandCdb = cmdDb;

		
	},
	
	initExistingStack: function(name) {
		this.objCdb = this.objDbForName(name);
		this.commandCdb =this.cmdDbForName(name);
	},
	
	stackNameForAlias: function(alias) {
		var res = this.aliasDB.open(alias);
		return res.stackName;
	},
	
	objDbForName: function(name) {
		var db = new CouchDB("stack_"+name+"_objs");
		return db;
	},
	
	cmdDbForName: function(name) {
		var db = new CachingCouchDB("stack_"+name+"_cmds");
		return db;
	},
	
	addMapping: function(obj,id) {
		this.commmandRestorer.id2objMap[id||obj.id()] = obj;
	},
	
	removeMapping: function(id) {
		this.commmandRestorer.id2objMap[id] = undefined;
	},
	
	getMappedObj:function(id) {
		return this.commmandRestorer.id2objMap[id];
	},
	
	bannedTypes: ['HandMorph','HandleMorph','SimpleDataStore','WorldMorph','TextSelectionMorph'],//add perhaps: tooltip, menus, focusmorph

	callbackReferenceHandlingSaveIfNew: function(obj,path) {
		if(this.bannedTypes.include(obj.getType())|| obj.dontSaveInDb === true){
			return {refObj: "ignore"};
		}
		if(!obj._id){
			var rlxr = new Relaxer();
			rlxr.setCallbackReferenceHandling(this.callbackReferenceHandlingSaveIfNew.bind(this));
			var dontChangeId = "refcount" in obj;
			this.initNewObjForCouch(obj,null,true,dontChangeId);
			if(typeof obj.cmdCount !== "number" && obj instanceof Morph && obj.getType() !== "SchedulableAction" ){
				if(obj.world()===null){
					console.log("no owner/world. I fix that");
					//an new Card() has no owner:
					var count =0;
					own:while(count++<100){
						var cur = obj;
						if(!cur.owner){
							cur.owner = WorldMorph.current();
							break own;
						}else{
							cur = cur.owner;
						}
					}
					
				}
				if(!obj.ownerProg){
					console.assert(this.ownerProg,"no ownerProg in RelaxedMgmt");
					obj.ownerProg = this.ownerProg;
				}
			}
			this.saveMorph(obj,rlxr);
		}
		return {refObj: "makeRef"};
	},
	
	getStackObjForName: function(name) {
		var all = this.objCdb.view("stack/stackView", null,[name]);
		var rows = all.rows;
		if(rows.length<1){
			return;
		}
		if(rows.length>1){
			console.warn("Too mutch stacks with same name");
		}
		try{
			var restorer = this.commmandRestorer;
			var restored = restorer.restore(rows[0].value);
			var allMorphs = this.loadCasscading(restorer);
			restorer.patchRefs();
			restorer.runDeserializationHooks();
		}finally{
			restorer.cleanAllButNotIds();
		}

		if(!restored.ownerProg){
			console.assert(this.ownerProg,"no ownerProg in mgmt");
			restored.ownerProg = this.ownerProg;
		}
		return restored;
	},

	loadAllCmds: function() {
		var realObjCdb = this.objCdb;
		this.objCdb = new CachingCouchDB(this.objCdb.name);
		this.objCdb.loadAll(); 	
    	var allCmds = this.commandCdb.loadAll();
    	var rows = allCmds.rows;
    	if(!rows){
    		console.log("Got no cmds");
    	}
    	var i;
    	allLoop: for(i = 0; i < rows.length; i++){
    		var currentJso = rows[i].doc;
    		this.commandCdb.injectToCach(currentJso._id, currentJso);
    		var cmd;
    		try{
	    		withoutLayers([WebcardsLayer], function() {
	    			cmd = this.restoreCmd(currentJso);
	    		}.bind(this));
	    		if(!cmd){
	    			console.warn("Cant restore cmd: "+currentJso);
	    			continue allLoop;
	    		}
    		
    			cmd.target.handleCmdObj(cmd,rows[i].key);
    		}catch(e){
    			console.warn(e);
    			console.log("cant use cmd. will ignore it");
    			continue allLoop;
    		}
    	}
    	this.objCdb = realObjCdb;
    	this.initalWaitForServerPush(i);
    },

	loadCasscading: function(restorer) {
		var getNewOnes = function(){
			var newo =  restorer.getUnresolvableObjectRefs().filter(function(x) {return !(x.$type.startsWith('anonymous_') || x.$type === 'HandMorph');});
			var uniq = [];
			var hash = {};
			for(var i = 0; i<newo.length;i++){
				var current = newo[i];
				if (!hash[current.$id]===true){
					hash[current.$id] = true;
					uniq.push(current);
				}
			}
			return uniq;
		};
		
		var  newOnes = getNewOnes();
		var loaded = [];
		var allredyTried = {};
		outer:while(newOnes.length > 0){
			for(var i = 0; i<newOnes.length; i++){
				var current = newOnes[i];
				if(current.$type.startsWith('anonymous_')){
					debugger;	
				}
				if(current.$ref){
					console.log("Using ref to retrieve: %s",current.$ref);
					if(!allredyTried[current.$ref]){
						allredyTried[current.$ref] = true;
						var json = this.objCdb.open(current.$ref);
						var resto = restorer.restore(json);
					}else{
						console.error("Allready tried to retrieve: %s",current.$ref);
						var resto = null;
						break outer;
						
					}
				}else{
					console.log("Using id to retrieve: %s",current.$id);
					var mapf = function(doc) {
						emit(doc.$id, doc);
					};
					var json= this.objCdb.query(mapf,null,{key:current.$id});
					if(json.rows.length !== 1){
						console.warn("wrong nr of rows: "+json.rows.length);
					}
					if(json.rows[0] && json.rows[0].value.$id === current.$id){
						var resto =restorer.restore(json.rows[0].value);
					}else{
						console.error("Bad result. Too much rows or no rows. And first $id is wrong");
						var resto = null;
						break outer;
					}
				}
				if(resto){
					if(!resto.ownerProg) {
						console.assert(this.ownerProg,"no ownerProg in mgmt");
						resto.ownerProg = this.ownerProg;
					}
					loaded.push(resto);
				}
			}
			newOnes = getNewOnes();
		}
		return loaded;
	},
	
	restoreCmd: function(jso) {
		var command = this.commmandRestorer.restore(jso);
		try{
			var allMorphs = this.loadCasscading(this.commmandRestorer);
			this.commmandRestorer.patchRefs();	
			this.commmandRestorer.runDeserializationHooks();
			return command;	
		}finally{
			this.commmandRestorer.cleanAllButNotIds();
		}
	},
	
	initalWaitForServerPush: function(startSeqNr) {
		this.update_seq = startSeqNr || 0;
		this.waitForServerPush();
	},
	
	waitForServerPush: function() {
		var req = null;
	  	if (typeof(XMLHttpRequest) != "undefined") {
	    	req = new XMLHttpRequest();
	  	} else if (typeof(ActiveXObject) != "undefined") {
	    	req = new ActiveXObject("Microsoft.XMLHTTP");
	  	} else {
	    	throw new Error("No XMLHTTPRequest support detected");
	  	}
	  	dbgOn(this.commandCdb.name === "commands");
		req.open("GET", this.commandCdb.uri+"_changes?feed=longpoll&since="+this.update_seq, true);
		req.send("");
		req.onreadystatechange = function(re) {
			reqq = re;
  			var request = re.target;
  			if (request.readyState == 4) {  
     			if(request.status == 200) { 
    				var txt = req.responseText;  
    				var restorer = this.commmandRestorer;
    				var jso = JSON.unserialize(txt);
 					var changeList = jso.results;
 					for(var i = 0; i < changeList.length; i++){
 						var cur = changeList[i];
 						var concernId =  cur.id.substring(0, cur.id.lastIndexOf('_'));
 						var concern = this.getMappedObj(concernId);
 						if(concern){
 							concern.handleIncomingChange(cur);
 						}else{
 							console.warn("no concern");
 						}
 					}
    				var me = 2;
    				this.update_seq = jso.last_seq;
    			}
   				else{
      				console.warn("Error loading server longpoll");  
  				}
  				this.waitForServerPush();
  			}  
  			
		}.bind(this);
	}
	
});

Object.subclass("Relaxer",{
	
	initialize: function() {
		this.objsToClean = [];
		this.referencedObjectsWithId = [];
	},
	
	/**
	* The callback function gets the object and the path an can decide
	* to save the obj, to generate an _id for it or to do nothing at all.
	* the result of the callback has to be an object 
	* with one properties: refObj
	* possible Values for this properties are:
	* ignore, makeRef
	**/
	setCallbackReferenceHandling: function(callback) {
		this.callbackReferenceHandling = callback;
	},
	
	/**
	* default callbackReferenceHandling
	**/
	callbackReferenceHandling: function() {
		return {
			refObj: "makeRef"
		};
	},	
	
	/*
	For referencing see:
	http://www.json.com/2007/10/19/json-referencing-proposal-and-library/
	*/
	objToRelaxedJso: function(obj){
		try{
			var jso = this.anythingToJson(obj,'$');	
		}finally{
			this.cleanUp();
		}
		return jso;
	},
	
	
	cleanUp: function() {
		for(var i = 0; i < this.objsToClean.length; i++){
			var current = this.objsToClean[i];
			console.assert(current.$path);
			delete current.$path;
		}	
		this.objsToClean = [];
	},
	
	objectToJson: function(obj, path) {
		var jso = {};
		for(var key in obj){
			if(!obj.hasOwnProperty(key)){
				continue;
			}
			if( key === 'constructor' || key === '$path' || (typeof obj.shouldNotSerializePropertie === 'function'&& obj.shouldNotSerializePropertie(key))){
				continue;
			}
			dbgOn(path === "$.rawNode");
			dbgOn(key === "webCardModel");
			if(path === undefined){
				console.warn("no path submitted");
				dbgOn(true);
			}
			//keys staring with _ are not allowed by CouchDB, so escape
			if(key !== '_id' && key !== '_rev'&& (key.startsWith("_") || key.startsWith("-"))){
				var escKey = "-"+key;
			}else{
				var escKey = key;
			}
			var res = this.anythingToJson(obj[key],path+'.'+key);
			if(res !== undefined){
				jso[escKey] = res;
			}
		}
		if(typeof obj.afterToJso === 'function'){obj.afterToJso(jso, this, path);}
		return jso;
	},
	
	arrayToJson: function(array,path) {
		var jso = [];
		for(var i=0;i<array.length;i++){
			jso[i] = this.anythingToJson(array[i],path+'['+i+']');
		}
		return jso;
	},
	
	anythingToJson: function(any,path) {
		var typ = typeof any;
		switch(typ){
			case 'boolean':
			case 'number':
			case 'string':
				return any;
				break;
			case 'object':
				if (any===null){
					return any;
				}
				var hasType = any.constructor && any.constructor.getOriginal && any.constructor.getOriginal().type !== undefined;
				var hasId = any.id && typeof any.id === "function" && !!any.rawNode && any.rawNode.getAttribute && any.id() !== null;
				
				if(path !== '$' && hasType && hasId){
					//it has a an id . We can make a ref to it
					var refId = any.id();
					if(refId === undefined || refId === ""|| refId === null || typeof refId === "function") {
						console.warn("Bad id: %s",refId);
					}
					
					/**
					* the result is an oobject with two properties:
					* saveObjBehavior and refObj
					* possible Values are:
					* saveObjBehavior : saveNow, generateId, dontSave
					*refObj: ignore, makeRef
					**/
					var anyPath = any.$path;
					any.$path = undefined;
					var refHandling = this.callbackReferenceHandling(any, path);
					any.$path = anyPath;
					switch(refHandling.refObj){
						case 'ignore':
							return undefined;
							break;	
						case 'makeRef':
							if(!any._id){
								console.info("%s not jet saved",refId);
							}
							if(!any.id().startsWith(any._id)){
								console.warn("Object with id %s has _id %s",any.id(),any._id);
							}
							this.addReferencedObjectWithId(any);
							return {
								"$ref" : any._id || "", 
								"$id" : any.id(),
								"$type" : any.constructor.getOriginal().type
							};
							break;
						default:
							debugger;
							return undefined;	
					}					
				}
				
				//Referenc Path
				if(!any.$path){
					any.$path = path;
					this.objsToClean.push(any);
				}
				else{
					if(any.$path === path){//that would be an error
						dbgOn(true);		
					}else{
						dbgOn(!this.objsToClean.include(any));
						//we have seen this object already
						var refObj = {$ref:any.$path};
						return refObj;
					}
				}
				if(any instanceof Date){
					/*
					i am not sure how to store Date-objects.
					- Current JSON version: (no milliseconds)
					  2009-07-03T08:37:57Z
					- Native JSON (FF) version: (includes milliseconds)
					  2009-07-03T08:31:58.463Z
					- toString:
					  Fri Jul 03 2009 10:31:58 GMT+0200
					- getTime: (Unix Timestand with milliseconds)
					  1246610022592
					the retrieval is a problem aswell:
					Current JSON version and  Native JSON (FF) version,
					both return a String object.
					*/
					return any;
				}
				
				if(Object.isArray(any)){
					return this.arrayToJson(any,path);
				}
				
				
				var objNoId = this.objectToJson(any, path);		
				if(hasType){
					//Probably we have a Object with a class
					objNoId.$type = any.constructor.getOriginal().type;	
				}
				return objNoId;
				
				break;
			case 'function':
				return undefined;
				break;
			case 'undefined':// undefined is no part of JSON
				return undefined;
				break;
			default:
				console.warn("%s with type %s not converted to json",key,typ);
				return undefined;
				break;
		}
	},
	
	/**
	* @return all Morphs and Record wich where referenced.
	**/
	getReferencedObjects: function() {
		return this.referencedObjectsWithId;
	},
		
	//privat
	addReferencedObjectWithId: function(reference) {
		if(!this.referencedObjectsWithId.include(reference)){
			this.referencedObjectsWithId.push(reference);
		}
	}

});

lively.scene.Shape.addMethods({
	
	makeSpec: function() {
		var literal = {};
		var memberNames = $A(this.rawNode.attributes).map(function(e){return e.localName;});
		literal.stroke = this.getStroke();
		if(memberNames.include("stroke-width")) literal.strokeWidth = this.getStrokeWidth(); //default is 1
		if(memberNames.include("fill")) literal.fill = this.getFill();
		if(memberNames.include("fill-opacity")) literal.fillOpacity = this.getFillOpacity();
		if(memberNames.include("stroke-linecap")) literal.strokeLineCap = this.getLineCap();	
		return literal;
	},
	
	applySpec: function(spec) {
    	lively.scene.Shape.fromLiteral(this,spec);
    	return this;
    },
    
    afterToJso: function($super, jso, relaxer, path) {
		$super(jso, relaxer);
    	jso.$shapeSpec = relaxer.anythingToJson(this.makeSpec(), path+'.$shapeSpec');
    },
    
    afterRestoreFromJso: function($super, jso, relaxer) {
		$super(jso, relaxer);
    	if(this.$shapeSpec){
			this.applySpec(this.$shapeSpec);
			delete this.$shapeSpec;
		}
	},
	
	shouldNotSerializePropertie: function(key) {
		// all we need is in $shapeSpec
		return true;
	}
});

lively.scene.Rectangle.addMethods({
	
    makeSpec: function($super) {
    	var lit = $super();
    	var bounds = this.bounds();
    	lit.x = bounds.x;
    	lit.y = bounds.y;
    	lit.width = bounds.width;
    	lit.height = bounds.height;
    	return lit;
    },
    
    applySpec: function($super,spec) {
    	$super(spec);
    	this.setBounds(spec);
    	return this;
    },
    
    justAfterCreationHook: function() {
    	this.rawNode = NodeFactory.create("rect");
    	this.setBounds(new Rectangle(0, 0, 0, 0));
    }
    
});

lively.scene.Ellipse.addMethods({
	
    makeSpec: function($super) {
    	var lit = $super();
    	var bounds = this.bounds();
    	lit.x = bounds.x;
    	lit.y = bounds.y;
    	lit.width = bounds.width;
    	lit.height = bounds.height;
    	return lit;
    },
    
    applySpec: function($super,spec) {
    	$super(spec);
    	this.setBounds(spec);
    	return this;
    },
    
    justAfterCreationHook: function() {
    	this.rawNode = NodeFactory.create("ellipse");
    }
    
});

lively.scene.Polygon.addMethods({
	
    makeSpec: function($super) {
    	var lit = $super();
		lit.points = this.vertices();
		return lit;
    },

    applySpec: function($super,spec) {
    	$super(spec);
    	this.setVertices(spec.points);
    	return this;
    },
    
    justAfterCreationHook: function() {
    	this.rawNode = NodeFactory.create("polygon");
    }
    
});

lively.scene.Polyline.addMethods({
	
    makeSpec: function($super) {
    	var lit = $super();
    	lit.points = this.vertices();
    	return lit;
    },
    
    applySpec: function($super,spec) {
    	$super(spec);
    	this.setVertices(spec.points);
    	return this;
    },
    
    justAfterCreationHook: function() {
    	this.rawNode = NodeFactory.create("polyline");
    }
    
});

lively.scene.Group.addMethods({
	
	makeSpec: function($super) {
    	var lit = $super();
    	lit.content = this.content;
    	return lit;
    },
    
    applySpec: function($super,spec) {
    	$super(spec);
		if(spec.content){
			this.setContent(spec.content);
		}
		if (spec.transforms) {
	    	this.setTransforms(literal.transforms);
		}
		if (spec.clip) {
			var clip = new lively.scene.Clip(spec.clip);
	    	var defs = this.rawNode.appendChild(NodeFactory.create('defs'));
	    	defs.appendChild(clip.rawNode);
	    	clip.applyTo(this);
		}
    	return this;
    },
    
	justAfterCreationHook: function() {
    	this.rawNode = NodeFactory.create("g");
    	this.content = [];
    }
    
});

lively.scene.Image.addMethods({
	
	afterToJso: function($super,jso, relaxer, path) {
		$super(jso, relaxer);
		jso.$url = relaxer.anythingToJson(this.getURL(), path+'.$url');
		jso.$width = relaxer.anythingToJson(this.getWidth(), path+'.$width');
		jso.$height = relaxer.anythingToJson(this.getHeight(), path+'.$height');
	},
	
	afterRestoreFromJso: function($super, jso, relaxer) {
		$super(jso, relaxer);
		if(this.$url){
			if (this.$url.startsWith('#'))
				this.loadUse(this.$url);
			else
				this.loadImage(this.$url,this.$width,this.$height);
			delete this.$url;
			delete this.$width;
			delete this.$height;
		}
	}

});

ImageMorph.addMethods({

	afterRestoreFromJso: function($super, jso, relaxer) {
		$super(jso, relaxer);
		if(this.image.rawNode){
			this.addNonMorph(this.image.rawNode);
		}else{
			console.log("restore ImageMorph with no image");
		}
	}

});

lively.data.Wrapper.addMethods({
	
	stopWords : ['rawNode', 'documentation'],
	goWords : [],
	
	shouldNotSerializePropertie:function(key) {
		if(this.goWords.include(key)){
			return false;
		}
		return this.stopWords.include(key);
	},
	
	afterToJso: function(jso, relaxer, path) {
		if(this.rawNode && this.rawNode.getAttribute){
			jso.$id = this.id();
		}else{
			console.log("no id found");
		}
		jso.$type = this.getType();
	},
	
	afterRestoreFromJso: function(jso, relaxer) {
		//nothing to do
    }
});

lively.paint.Gradient.addMethods({
	
	stopWords : lively.data.Wrapper.prototype.stopWords.concat(['refcount']),
	
	afterRestoreFromJso: function($super, jso, relaxer) {
		$super(jso, relaxer);
		if(this.stops){
			var oldStops = this.stops;
			this.stops = [];
			this.setStops(oldStops);
		}else{
			console.warn("no stops");
		}
	}
});

lively.paint.LinearGradient.addMethods({
		
	justAfterCreationHook: function() {
		this.rawNode = NodeFactory.create("linearGradient"); 
	},
	
	afterRestoreFromJso: function($super, jso, relaxer) {
		$super(jso, relaxer);
		if(this.vector){
			this.setTrait('x1', this.vector.x);
			this.setTrait('y1', this.vector.y);
			this.setTrait('x2', this.vector.maxX());
			this.setTrait('y2', this.vector.maxY());
		}
		else{
			console.warn("no vector");
		}
	}

});

lively.paint.RadialGradient.addMethods({
		
	justAfterCreationHook: function() {
		this.rawNode = NodeFactory.create("radialGradient"); 
	},
	
	afterToJso: function($super, jso, relaxer, path) {
		$super(jso, relaxer);
		var optF =  {
			x:this.getTrait("fx"),
	    	y:this.getTrait("fy")
    	};
		jso.$optF = relaxer.anythingToJson(optF, path+'.$optF');
	},
	
	afterRestoreFromJso: function($super, jso, relaxer) {
		$super(jso, relaxer);
		if (this.$optF) {
		    this.setTrait("fx", this.$optF.x);
		    this.setTrait("fy", this.$optF.y);
		    delete this.$optF;
    	}
	}
	
});

lively.scene.Clip.addMethods({
	
	justAfterCreationHook: function() {
		this.rawNode = NodeFactory.create('clipPath');
	}
	
});

lively.paint.Stop.addMethods({
	
    justAfterCreationHook: function() {
		this.rawNode = NodeFactory.create("stop");
    },
    
    afterToJso: function($super, jso, relaxer, path) {
		$super(jso, relaxer);
		jso.$stopSpec = relaxer.anythingToJson(this.makeSpec(),path+'.$stopSpec');
	},
	
	afterRestoreFromJso: function($super, jso, relaxer) {
		$super(jso, relaxer);
		if (this.$stopSpec) {
		   this.applySpec(this.$stopSpec);
		   delete this.$stopSpec;
    	}
	},
	
	makeSpec: function() {
		return {
			offset : this.offset(),
			color : this.color()
		};
	},
	
	applySpec: function(spec) {
		this.setTrait("stop-color", spec.color);
		this.setLengthTrait("offset",spec.offset);
	}
	
});

lively.scene.Path.addMethods({
	
	makeSpec: function($super) {
    	var lit = $super();
		lit.pathElements = this.elements;
		return lit;
    },

    applySpec: function($super,spec) {
    	$super(spec);
    	if(spec.pathElements){
    		this.setElements(spec.pathElements);
		}
    	return this;
    },
	
	justAfterCreationHook: function() {
		this.rawNode = NodeFactory.create("path");
    }
	
});
SchedulableAction.addMethods({
	
	afterRestoreFromJso: function($super, jso, restorer) {
		$super(jso, restorer);
		try{
			var world = this.world();
			this.start(world || WorldMorph.current());
		}
		catch(e){
			console.warn("Error on starting SchedulableAction: "+e);
		}
	}
});

Morph.addMethods({
	
	toJSON: function() {
		var relaxer = new Relaxer();
		return relaxer.objToRelaxedJso(this);	
	},
	
	shouldNotSerializePropertie:function(key) {
		if(this.goWords.include(key)){
			return false;
		}
		return this.noShallowCopyProperties.include(key) || this.stopWords.include(key);
	},
	
	/**
	* Called right after an Object was created without calling initialize.
	* No $member etc shoulh be expected.
	* rawNode instance creation ect can be placed here. As well as
	* creation of not serialzed members (@see stopWords)
	**/
	justAfterCreationHook: function() {
		this.rawNode = NodeFactory.create("g");
		//copy and past from Core.js::Morph.internalInitialize
		this.submorphs = [];
	    LivelyNS.setType(this.rawNode, this.getType());
	},
	
	goWords : ['shape','activeScripts'],
	
	stopWords : ['documentation', 'extents', 'halos', 'rawNode', 'constructor', '$path','font', 'formalModel', 'ownerProg'],
	
	/**
	* Called after this has been restored from JSON
	* Hooks can be placed her.
	**/
	afterRestoreFromJso: function($super, jso, restorer) {
		$super(jso, restorer);
		var realOwner = this.owner;
		this.owner = null;// no chnaged() should be submitted  to owner
			
		if (this.shape){
			//copy and past from Core.js::Morph.initializePersistentState(shape);
			this.rawNode.appendChild(this.shape.rawNode);
			this.rawNode.insertBefore(this.shape.rawNode,this.rawNode.firstChild);
			if (this.styleClass) { // inherited from prototype
				var attr = this.styleClass.join(' ');
				this.rawNode.setAttribute("class", attr);
				// Safari needs the explicit assignment (perhaps the names have to be real stylesheets).
	    		this.rawNode.className.baseVal = attr;
			}
		}
		else{
			dbgOn(true);
		}
		if(this.$submorphs){
			var orgSubmorphs = this.$submorphs;
			if(!Object.isArray(orgSubmorphs)){
				throw new Erorr(".$submorphs has to be an Array");
			}
			orgSubmorphs = restorer.cleanArray(orgSubmorphs);
			for(var i=0; i<orgSubmorphs.length; i++){
				if(!this.submorphs.include(orgSubmorphs[i])){
					this.submorphs.push(orgSubmorphs[i]);
					this.rawNode.appendChild(orgSubmorphs[i].rawNode);
					if(!orgSubmorphs[i].ownerProg){
						var newOwnerProg = this.ownerProg;
						if(!newOwnerProg && typeof this.getOwnerProg === "function"){
							newOwnerProg = this.getOwnerProg();
						}
						if(!newOwnerProg){
							console.warn(this.id()+" has no ownerProg!");
						}
						else{
							orgSubmorphs[i].ownerProg = newOwnerProg;
						}						
					}
				}
			}
			delete this.$submorphs;
		}
		this.restoreRawNodeFromSubmorphArray();
		if(this.$styleSpec){
			delete this.$styleSpec.fill; //duplicat to shapeSpec
			delete this.$styleSpec.borderColor; //^^
			this.applyStyle(this.$styleSpec);
			delete this.$styleSpec;
		}
		if(this.$transform){
			this.setTransform(this.$transform);
			delete this.$transform;
		}
		
		//Copy and Paste from Core.js::Morph.restorePersistentState()
		if(this.$pointerEvents){
			var pointerEvents = this.$pointerEvents;
			if (pointerEvents == "none") {
			    this.ignoreEvents();
			} else if (pointerEvents) {
			    console.log("can't handle pointer-events " + pointerEvents);
			}
			delete this.$pointerEvents;
		}
		
		if(this.$fill){
			this.setFill(this.$fill);
			delete this.$fill;
		}
		this.owner = realOwner;
		if(!this.owner || '$ref' in this.owner){
			this.owner = WorldMorph.current();
		}
		if(typeof this.initHaloMenu === "function"){ this.initHaloMenu();}
	},
	
	/**
	* Called after this has been converted to an Object for JSON
	* Hooks can be placed her.
	**/
	afterToJso: function($super, jso, relaxer, path) {
		$super(jso, relaxer);
		jso.$styleSpec = relaxer.anythingToJson(this.makeStyleSpec(), path+'.$styleSpec');
		jso.$transform = relaxer.anythingToJson(this.getTransform(), path+'.$transform');
		jso.$pointerEvents = relaxer.anythingToJson(this.getTrait("pointer-events"), path+'.$pointerEvents');
		jso.$submorphs = relaxer.anythingToJson(this.submorphs, path+'.$submorphs');
		if(jso._fill){
			jso.$fill = relaxer.anythingToJson(this.getFill(), path+'.$fill');
			delete jso._fill;
		}
	},
	
	restoreRawNodeFromSubmorphArray: function() {
		var lastNode = null;
		for(var i =0; i<this.submorphs.length; i++){
			if(!this.submorphs[i].rawNode){
				throw new Error("All submorphs need a rawNode");
			}
			if(!this.hasMorphAsChildNode(this.submorphs[i].id())){
				this.rawNode.insertBefore(this.submorphs[i].rawNode,lastNode);
			}
			lastNode = this.submorphs[i].rawNode;
		}
	},
	
	/**
	* returns true, iff this.rawNode has an Child Node with the
	* provided id.
	**/
	hasMorphAsChildNode: function(id) {
		var childs = this.rawNode.childNodes;
		for(var i=0; i<childs.length; i++){
			if(childs[i].getAttribute("id") === id){
				return true;
			}
		}
		return false;
	}
	
});

TextMorph.addMethods({
	
	stopWords: Morph.prototype.stopWords.concat(['textSelection']),
	
	justAfterCreationHook: function($super) {
		$super();
		this.textContent = this.addWrapper(new lively.scene.Text());
		this.textSelection = this.addMorphBack(new TextSelectionMorph());
	},
	
	setAcceptInput: function(newVal) {
		this.acceptInput = newVal;
	},
	
	getAcceptInput: function() {
		return this.acceptInput;
	}
	
});

lively.scene.Text.addMethods({
	
	stopWords: Morph.prototype.stopWords,
	
	justAfterCreationHook: function($super) {
		$super();
		this.rawNode = NodeFactory.create("text", { "kerning": 0 });
	},
	
	afterToJso: function($super, jso, relaxer, path) {
		$super(jso, relaxer);
		jso.$fontSize = relaxer.anythingToJson(this.getFontSize(), path+'.$fontSize');
		jso.$fontFamily = relaxer.anythingToJson(this.getFontFamily(), path+'.$fontFamily');
	},
	
	afterRestoreFromJso: function($super, jso, relaxer) {
		$super(jso, relaxer);
		if(this.$fontSize){
			this.rawNode.setAttributeNS(null, "font-size", this.$fontSize);
			delete this.$fontSize;
		}
        if(this.$fontFamily){
        	this.rawNode.setAttributeNS(null, "font-family", this.$fontFamily);
        	delete this.$fontFamily;
    	}
	}
	
});

Object.subclass("Restorer",{
	
	initialize: function() {
		this.objectsAndKeyWithRefsToPatch = [];
		this.id2objMap = {};
		this.restoreHooks = [];
	},
		
	restoreObjectJson: function(jso, rootObject) {
		var obj = {};
		if(jso.$type){
			obj = this.objectForTypeName(jso.$type);
			console.assert(obj!==null && obj!==undefined, "Problem with restoring :"+jso.$type);
		}
		if(typeof obj.justAfterCreationHook === 'function'){
			obj.justAfterCreationHook();
		}
		if(jso.$id){
			//it's a wrapper, perhapse a morph
			obj.setId(jso.$id.split(':')[0]);//id() and setId() are not compatibel
			//seting of id not done in hook
			this.id2objMap[jso.$id] = obj;
		}
		if(rootObject === undefined){
			var rootObject = obj;
		}
		for(var key in jso){
			if(!jso.hasOwnProperty(key)){
				//Object was extended, such propertys will be ignored
				continue;
			}
			if(key.startsWith("-")){
				//was escaped
				var unescKey = key.substring(1, key.length);
			}else{
				var unescKey = key;
			}
			if(jso[key] !== null && typeof jso[key] === "object" && '$ref' in jso[key]){
				//we have a ref
				obj[unescKey]= jso[key];
				this.addObjToPatcheList(obj, unescKey, rootObject);
				
			}
			else{
				obj[unescKey] = this.restoreAnyJson(jso[key], rootObject);
			}
		}
		if(typeof obj.afterRestoreFromJso === 'function'){
			var callLater = obj.afterRestoreFromJso.bind(obj).curry(jso,this);
			this.restoreHooks.push(callLater);
		}
		return obj;
	},
	
	
	restore: function(jso) {
		//this.sourceObj = jso;
		var result =this.restoreAnyJson(jso);
		return result;
	},
	
	restoreAnyJson: function(any, rootObject) {
		var typ = typeof any;
		switch(typ){
			case 'boolean':
			case 'number':
			case 'string':
				return any;
				break;
			case 'object':
				if (any === null){
					return any;
				}
				else if(Object.isArray(any)){
					return this.restoreArrayJson(any, rootObject);
				}
				else{
					return this.restoreObjectJson(any, rootObject);
				}
				break;
			case 'function':
				throw new Error("function is not part of json! so no function should be passed to restoreAnyJson");
				break;
			case 'undefined':
				console.warn("undefined is not part of json! so no undefined should be passed to restoreAnyJson");
				return undefined;
				break;
			default:
				console.warn("%s with type %s not converted from json",any,typ);
				return undefined;
				break;
		}
	},
	
	restoreArrayJson: function(jso, rootObject) {
		var ary = [];
		if(rootObject === undefined){
			var rootObject = ary;
			console.log("restoring array as main object");
		}
		for(var i = 0; i<jso.length; i++){
			if(jso[i] !== null && typeof jso[i] === "object" && '$ref' in jso[i]){
				this.addObjToPatcheList(ary, i, rootObject);
				ary[i] = jso[i];
			}else{
				ary[i] = this.restoreAnyJson(jso[i], rootObject);
			}
		}
		return ary;
	},
	
	objectForTypeName: function(type) {
		var klass = Class.forName(type);
		if(type.startsWith('anonymous_')){
			debugger;
		}
        if (klass) {
           return new klass(this);
        } else {
            throw new Error("Error: " + type + " is no class");
        }	
	},
	
	addObjToPatcheList: function(obj, key, rootObject){
		var entry = {obj: obj, key:key, rootObject:rootObject};
		this.objectsAndKeyWithRefsToPatch.push(entry);
		
	},
	
	getUnresolvableObjectRefs: function() {
		var res = [];
		for(var i=0;i<this.objectsAndKeyWithRefsToPatch.length;i++){
			var patche = this.objectsAndKeyWithRefsToPatch[i].obj;
			var key = this.objectsAndKeyWithRefsToPatch[i].key;
			if(patche[key] !== null && typeof patche[key] === "object" && '$ref' in patche[key]){
				//we have a ref
				if(patche[key].$type && patche[key].$id){
				//we have a wrapper id
					if(!this.id2objMap[patche[key].$id]){
						res.push(patche[key]);
					}
				}
			}
		}
		
		return res;
	},
	
	patchRefs: function() {
		for(var i=0;i<this.objectsAndKeyWithRefsToPatch.length;i++){
			var patche = this.objectsAndKeyWithRefsToPatch[i].obj;
			var key = this.objectsAndKeyWithRefsToPatch[i].key;
			var rootObject =  this.objectsAndKeyWithRefsToPatch[i].rootObject;
				
			//for(var key in patche){
				if(patche[key] !== null && typeof patche[key] === "object" && '$ref' in patche[key]){
					//we have a ref
					if(patche[key].$ref && patche[key].$ref !== null && patche[key].$ref.startsWith('$')){
						//we have a path
						var pathResult = eval(patche[key].$ref.replace('$','rootObject'));//TODO confirm not evil 
						//the result musst not be a ref again?
						patche[key] = pathResult;
					}
					else if(patche[key].$type && patche[key].$id){
						//we have a morph id
						var resolution = this.id2objMap[patche[key].$id];
						if(resolution !== undefined){
							patche[key] = resolution;
						}else{
							console.warn("No reference resolution for %s in object %s",patche[key].$id,patche);
						}
					}
					else{
						throw new Error("bad reference");
					}
				}else{
					throw new Error("no reference");
				}
		}
	},
	
	/**
	* After patchRefs cleanArray  should be used to delete all unresolved refs from Submorphs
	**/
	cleanArray: function(array) {
		var a = array.map(function(m){
			if(m !== null && typeof m === "object" && "$ref" in m){
				return [];
			}else{ return m;}
		}).flatten();
		return a;
	},
	
	runDeserializationHooks: function() {
		for(var i=0; i<this.restoreHooks.length; i++){
			try{
				this.restoreHooks[i]();
			}catch(e){
				console.warn(e);
			}
		}
	},
	
	cleanAllButNotIds: function() {
		this.objectsAndKeyWithRefsToPatch = [];
		this.restoreHooks = [];
	}
	
});


/**
* Holds the Cards when they are not the currentCard
* and shows a scaled Version of them.
**/
ScrollPane.subclass("PreviewPane", {

	initialize: function($super, ext) {
		this.realContainer = new PanelMorph(pt(ext.width,ext.height));
		this.realContainer.setFill(Color.lightGray);
		$super(this.realContainer,ext);
		this.setFill(Color.lightGray);
		this.adjustForNewBounds();
	},
	
	addCard: function(card){
		var point = this.whereToPutNewCard(card);
		this.innerMorph().addMorphAt(card,point);
		this.adjustForNewBounds();
	},
	
	whereToPutNewCard: function(card){
		const space = 10;
		return pt(space, card.cardNr*card.getExtent().y*0.25+space);
	},
	
	//for animation prupose
	guessPositionOfPreview: function(card){
		var point = this.whereToPutNewCard(card);
		var whiteOfRest = this.getPosition().x; 
		var newY = point.y-this.getSlideRoom()*this.getScrollPosition();
		var guesPoint  = pt(point.x+whiteOfRest,newY);
		return guesPoint;
	},
	
	getSlideRoom: function(){
		var ht = this.innerMorph().bounds().height;
        var slideRoom = ht - this.bounds().height;
		return slideRoom;
	}
	
});

/**
* See Tools.js->StylePanel
**/
StylePanel.subclass('OptionPanel', {

    documentation: "Panel for editing the options of an Element",

	initialize: function(targetMorph) {
		this.targetMorph = targetMorph;
		this.immediateProcessing = true;
		this.sendLayoutChanged = true;  // force propagation of changes
		var spec = targetMorph.makeStyleSpec();
		this.actualModel = Record.newPlainInstance({
			BorderWidth: spec.borderWidth,
			BorderColor: spec.textColor,
			BorderRadius: spec.borderRadius,
			FillOpacity: spec.fillOpacity,
			StrokeOpacity: spec.strokeOpacity,
			FontSize: String(spec.fontSize || TextMorph.prototype.fontSize),
			FontFamily: spec.fontFamily || TextMorph.prototype.fontFamily, 
			FillType: "simple", 
			FillDir: null, 
			Color1: null, 
			Color2: null,
			TextColor: null
		}); 
		this.actualModel.addObserver(this);
	},
	
	
  
    needsControlFor: function(methodName) {
        if (this.targetMorph.canRespondTo) return this.targetMorph.canRespondTo(methodName);
		if (methodName == 'shapeRoundEdgesBy') return this.targetMorph.shape.roundEdgesBy instanceof Function;
		return this.targetMorph[methodName] instanceof Function;
    },

    buildView: function(extent) {
        var panel = new PanelMorph(extent);
        panel.linkToStyles(["panel"]);
        var m;

        var y = 10;
	var model = this.actualModel;

        panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), "Border Width").beLabel());
		
	
	m = panel.addMorph(new PrintMorph(new Rectangle(150, y, 40, 20)));
        m.connectModel(model.newRelay({Value: "BorderWidth"}), true);
	
        m = panel.addMorph(new SliderMorph(new Rectangle(200, y, 100, 20), 10.0));
        m.connectModel(model.newRelay({Value: "BorderWidth"}), true);

        y += 30;

	
        panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Border Color').beLabel());
        m = panel.addMorph(new ColorPickerMorph(new Rectangle(250, y, 50, 30)));
        m.connectModel(model.newRelay({Color: "+BorderColor"}), true);
	
        y += 40;
	
        if (this.needsControlFor('shapeRoundEdgesBy')) {
            panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Round Corners').beLabel());
            m = panel.addMorph(new PrintMorph(new Rectangle(150, y, 40, 20)));
	    m.precision = 1;
            m.connectModel(model.newRelay({Value: "BorderRadius"}), true);
	    m = panel.addMorph(new SliderMorph(new Rectangle(200, y, 100, 20), 50.0));
            m.connectModel(model.newRelay({Value: "BorderRadius"}), true);
	    
	    y += 30;
        }
	
        m = panel.addMorph(new TextListMorph(new Rectangle(50, y, 100, 50), 
					     ["simple", "linear gradient", "radial gradient", "stipple"]));
        m.connectModel(model.newRelay({Selection: "FillType"}), true);
        m = panel.addMorph(new TextListMorph(new Rectangle(160, y, 75, 60),
					     ["NorthSouth", "SouthNorth", "EastWest", "WestEast"]));
        m.connectModel(model.newRelay({Selection: "FillDir"}));
	m = panel.addMorph(new ColorPickerMorph(new Rectangle(250, y, 50, 30)));
        m.connectModel(model.newRelay({Color: "+Color1"}));
        m = panel.addMorph(new ColorPickerMorph(new Rectangle(250, y + 40, 50, 30)));
        m.connectModel(model.newRelay({Color: "+Color2"}));
        y += 80;
	
        panel.addMorph(new TextMorph(new Rectangle(50, y, 90, 20), "Fill Opacity").beLabel());
        panel.addMorph(m = new PrintMorph(new Rectangle(150, y, 40, 20)));
        m.connectModel(model.newRelay({Value: "FillOpacity"}), true);
        m = panel.addMorph(new SliderMorph(new Rectangle(200, y, 100, 20), 1.0));
	m.connectModel(model.newRelay({Value: "FillOpacity"}), true);

        y += 30;
	
        panel.addMorph(new TextMorph(new Rectangle(50, y, 90, 20), "Stroke Opacity").beLabel());
        m = panel.addMorph(new PrintMorph(new Rectangle(150, y, 40, 20)));
        m.connectModel(model.newRelay({Value: "StrokeOpacity"}), true);
	
        panel.addMorph(m = new SliderMorph(new Rectangle(200, y, 100, 20), 1.0));
        m.connectModel(model.newRelay({Value: "StrokeOpacity"}), true);
	
        y += 30;
	
	
        if (this.needsControlFor('setTextColor')) {
            panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), "Text Color").beLabel());
            m = panel.addMorph(new ColorPickerMorph(new Rectangle(250, y, 50, 30)));
            m.connectModel(model.newRelay({Color: "+TextColor"}));
            y += 40;

            panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Font Family').beLabel());
            m = panel.addMorph(new TextMorph(new Rectangle(150, y, 150, 20)));
            m.connectModel(model.newRelay({Text: "FontFamily"}), true);
            y += 30;

            panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Font Size').beLabel());
            m = panel.addMorph(new TextMorph(new Rectangle(150, y, 50, 20)));
            m.connectModel(model.newRelay({Text: "FontSize"}), true);
            y += 30;
        }

	
        var oldBounds = panel.shape.bounds();
        panel.shape.setBounds(oldBounds.withHeight(y + 5 - oldBounds.y));
	
        panel.morphMenu = function(evt) { 
            var menu = Class.getPrototype(this).morphMenu.call(this, evt);
            menu.addLine();
            menu.addItem(['inspect model', new SimpleInspector(panel.getModel()), "openIn", this.world()]);
            return menu;
        };
        return panel;
    }
	
});

//Eqauls

Color.addMethods({
	equals: function(other) {
		if(!other) return false;
		return this.r === other.r && this.g === other.g && this.b === other.b;
	}
});

Rectangle.addMethods({
	equals: function(other) {
		if(!other) return false;
		return Math.abs(this.x - other.x) <= 0.01 && Math.abs(this.y - other.y) <= 0.01  && Math.abs(this.width - other.width) <= 0.01  && Math.abs(this.height - other.height) <= 0.01 ;
	}
});
lively.paint.Stop.addMethods({
	equals: function(other) {
		if(!other) return false;
		return this.offset() === other.offset() && ((this.color() === other.color()) || this.color().equals(other.color()));
	}
});
lively.paint.Gradient.addMethods({
	equals: function(other) {
		if(!other) return false;
		console.assert(this.stops && other.stops,"no stops");
		if(!other.stops || this.stops.length !== other.stops.length) return false;
		for(var i=0; i<this.stops.length; i++){
			if(!this.stops[i].equals(other.stops[i])) return false;
		}
		return true;
	}
});
lively.paint.LinearGradient.addMethods({
	equals: function($super,other) {
		if(!other) return false;
		console.assert(this.vector ,"no vector");
		return this.vector.equals(other.vector) && $super(other);
	
	}
});

Point.addMethods({
	equals: function(other) {
		if(!other) return false;
		return this.x === other.x && this.y === other.y;
	}
});

/**
* Als Vorlage diente TestFramework.js::TestRunner
**/
Widget.subclass('UndoMorph',{
	documentation: 'Shows all CommandObjects and allows to undo them',
	viewTitle: 'Undo',
	initialViewExtent: pt(300,400),
	formals: ['CommandObjects', 'SelectedCommandObjects'],
	
	initialize: function($super,concern){
		$super(null);
		this.buildNewForNewConcern(concern);
		var model = Record.newPlainInstance({CommandObjects:null, SelectedCommandObjects:null});
		this.relayToModel(model, {CommandObjects: 'CommandObjects', SelectedCommandObjects: 'SelectedCommandObjects'});
		this.onCommandObjectsUpdate = Functions.Null;
	},
	
	commandObjectsListChangedCallback: function(comObj) {
		this.commandObjectListMorph.prependItem(comObj);
	},

	undoSelectedCommand: function(buttonDown) {
		if (buttonDown) return;
		var sel = this.getSelectedCommandObjects();//only one obj can be selected
		if(!sel) return;
		this.concern.undoOrRedoIt(sel._id);
		this.getCommandObjectsFromCon();
		this.updateButton();
	},
	
	getCommandObjectsFromCon:function() {
		if(typeof this.concern.getCommandObjects === "function"){
			var newComObjs = this.concern.getCommandObjects().clone().filter(function(inp){return inp !== null;});
			this.setCommandObjects(newComObjs,true);
		}
	},
	
	buildNewForNewConcern: function(newConcern) {
		this.concern = newConcern;
		this.concern.commandObjectsListChangedCallback = this.commandObjectsListChangedCallback.bind(this);
	},
	
	repeatSelectedCommand: function(buttonDown) {
		if (buttonDown) return;
		console.log("repeatSelectedCommand");
		var sel = this.getSelectedCommandObjects();
		if(!sel) return;
		sel.repeat;
	},
	
	onSelectedCommandObjectsUpdate: function(item) {
		this.updateButton();
	},
	
	updateButton: function() {
		var item = this.getSelectedCommandObjects();
		if(item.isDisabled()){
			var text = 'Redo';
		}else{
			var text = 'Undo';
		}
		this.undoButton.setLabel(text);
	}, 
	
	buildView: function(extent) {
		var panel = PanelMorph.makePanedPanel(extent, [
		   ['commandObjectList', newRealListPane, new Rectangle(0, 0, 1, 0.9)],//newRealListPane is slow
		   ['undoButton', function(initialBounds){return new ButtonMorph(initialBounds);},   new Rectangle(0.0, 0.9, 0.5, 0.1)],
		   ['repeatButton', function(initialBounds){return new ButtonMorph(initialBounds);}, new Rectangle(0.5, 0.9, 0.5, 0.1)]
		]);
		var model = this.getModel();
		
		panel.commandObjectList.connectModel(model.newRelay({List: '-CommandObjects', Selection: '+SelectedCommandObjects'}), true);
		panel.commandObjectList.innerMorph().focusHaloBorderWidth = 0;
		panel.commandObjectList.innerMorph().itemPrinter = function(item) { 
             var str = item.action + ' with ' + item.newValue ;
             if(typeof item.isDisabled === "function" && item.isDisabled()){ str = " -- "+str+" -- "; }
             return str;
        };
        this.commandObjectListMorph = panel.commandObjectList.innerMorph();
		this.getCommandObjectsFromCon();
		panel.undoButton.setLabel('Undo');
		panel.undoButton.connectModel({model: this, setValue: 'undoSelectedCommand'});
		this.undoButton = panel.undoButton;
		panel.repeatButton.setLabel('Repeat');
		panel.repeatButton.connectModel({model: this, setValue: 'repeatSelectedCommand'});
		return panel;
	}
	
});


StaticHelper = {
	
	/**
	* by http://james.padolsey.com/javascript/random-word-generator/
	**/
	generateRandomWord: function(length) {
	    var consonants = 'bcdfghjklmnpqrstvwxyz'.split('');
	    var vowels = 'aeiou'.split('');
	    var rand = function(limit) {
	        return Math.floor(Math.random()*limit);
	    };
	    var word='';
	    length = parseInt(length,10);
	    for(var i = 0; i < length/2; i++) {
	        var randConsonant = consonants[rand(consonants.length)];
	        var randVowel = vowels[rand(vowels.length)];
	        word += randConsonant;
	        word += i*2<length-1 ? randVowel : '';
	    }
	    return word;
	}

	
};

/////////////
//// Layer
/////////////

layerClass(WebcardsLayer, CompositCard, {

	addBackground: function(proceed, value) {
		return this.genericAddRemove('addBackground', '', proceed, value);
	}, 
	
	setPosition: function(proceed, value) {
		return proceed(value);
	},
	
	setScale: function(proceed, value) {
		return proceed(value);
	},
	
	setTransform: function(proceed, value) {
		return proceed(value);
	},
	
	translateBy: function(proceed, value) {
		return proceed(value);
	},
	
	addMorph: function(proceed, value) {
		return proceed(value);
	},
	
	addActiveScript : function(proceed, value) {
		return proceed(value);
	}
	
});

layerClassAndSubclasses(WebcardsLayer, ContentButtonMorph, {
	
	setScript: function(proceed, value) {
		return this.genericSet('setScript','getScript', proceed, value);
	}
	
});

layerClass(WebcardsLayer, Stack, {
	
	addCard: function(proceed, value) {
		return this.genericAddRemove('addCard', 'removeCard', proceed, value);
	},
	
	removeCard: function(proceed, value) {
		return this.genericAddRemove('removeCard', 'addCard', proceed, value);
	}
	
});

layerClassAndSubclasses(FrontMorphLayer, Morph, {
	
	/* Halos (by  Lively Fabrik) */

	setupHalos: function() {
		this.halos = Morph.makeRectangle(0, 0, 100, 100);
		this.halos.setWithoutLayers([WebcardsLayer]);
		this.halos.lookupLayersIn=[];
		this.halos.dontSaveInDb = true;
		this.halos.ignoreWhenCopying = true;
		this.halos.okToDuplicate =  Functions.False; 
		this.noShallowCopyProperties = this.noShallowCopyProperties.concat(['halos']);
		var self = this;
		this.halos.setExtent(this.getExtent());
		this.halos.adoptToBoundsChange = function(ownerPositionDelta, ownerExtentDelta) {
		    self.halos.setExtent(self.halos.getExtent().addPt(ownerExtentDelta));
		    self.updateHaloItemPositions();
		};
		this.halos.closeDnD();
		this.halos.setFill(null);
		this.halos.setBorderWidth(0);
		this.halos.ignoreEvents();
		this.setupHaloItems();
		
		if(this.stopWords){
			var baseWords = this.stopWords;
		}
		else{
			var baseWords = [];
		}
		this.stopWords = baseWords.concat(['handObserver','halos']);
    },
    
    setupHaloItems: function() {
        this.addCloseHalo();
        this.addGrabHalo({relativePosition: pt(1,0), positionOffset: pt(-45, -20)});
    },
    
    addCloseHalo: function(){
	var closeHalo = this.addHaloItem("X", new Rectangle(0, 0, 18, 20), 
            {relativePosition: pt(1,0), positionOffset: pt(0, -20)},
            {fill: Color.red/*, fillOpacity: 0.5*/});
        closeHalo.connectModel(Relay.newInstance({Value: "=removeMe"}, {removeMe: function() {this.remove();}.bind(this)}));
    },
    
    addRightLowerHalo: function(proceed, label,halomodel,tooltip){
		var rlHalo = this.addHaloItem(label,  new Rectangle(0,0,45,20),
			{relativePosition: pt(1,1), positionOffset: pt(-45,0)}, 
			{fill: Color.green/*, fillOpacity: 0.5*/});
		rlHalo.connectModel(halomodel);
		if(tooltip) rlHalo.getHelpText = function(){return tooltip;};
    },
    
    addLeftLowerHalo: function(proceed, label,halomodel,tooltip){
		var llHalo = this.addHaloItem(label,  new Rectangle(0,0,45,20),
			{relativePosition: pt(1,1), positionOffset: pt(-90,0)}, 
			{fill: Color.green/*, fillOpacity: 0.5*/});
		llHalo.connectModel(halomodel);
		if(tooltip) llHalo.getHelpText = function(){return tooltip;};
    },
    
    updateHaloItemPositions: function() {
        // select can be removed? no one shpuld be able to add foreign morphs
        this.halos.submorphs.select(function(ea){return ea.layoutFrame;}).each(function(ea){
            var newPos = ea.layoutFrame.relativePosition.scaleByPt(this.getExtent());
            newPos = newPos.addPt(ea.layoutFrame.positionOffset);
			//For Cyles: (bug or feature?)
			newPos = newPos.addPt(this.shape.bounds().topLeft());
            ea.setPosition(newPos);
        }, this);
    },
    
    setupMousOverWrappingForHalos: function(proceed, morph) {
        // Wrap mouse over to make Halos show everytime
		// FIXME this is not serializable
        var self = this;
        var wrapMouseOver = function() {
            this.onMouseOver = this.onMouseOver.wrap(function(proceed, evt) {
                proceed(evt); self.showHalos();
            });
        };
        wrapMouseOver.apply(morph);
        morph.withAllSubmorphsDo(wrapMouseOver);		
	},
	
	isFramed: Functions.False,
	
	/*
	* Entscheidet, ob die Halos tatsächlich gezeigt werden.
	* War früher isUserMode
	*/
	isHalloVisible : Functions.True,

    showHalos: function() {
	if (!this.halos){
		this.setupHalos();
	}
    if (this.isHalloVisible()) {
        if (this.handObserver) return; // we are not finished yet
        var self = this;
    	withoutLayers([WebcardsLayer], function() {
			 this.addMorph(this.halos);//no command should be send
		}.bind(this));
        this.updateHaloItemPositions();
        this.handObserver = new HandPositionObserver(function(value) {
            if (!self.owner || !self.bounds().expandBy(10).containsPoint(self.owner.localize(value))) {
                withoutLayers([WebcardsLayer], function() {
			 		self.removeMorph(self.halos);//no command should be send
				});
                self.adjustForNewBounds();
                this.stop();
                self.handObserver = null;
            }
        });
        this.handObserver.start();
    }        
    }, 
    
    addHaloItem: function(proceed, label, bounds, layoutFrame, style) {
        var button = new ButtonMorph(bounds ||  new Rectangle(0, -20, 40, 20));
        button.setLabel(label || "----");
        button.applyStyle(style || {});
        button.setFillOpacity(0.5);
        button.layoutFrame = layoutFrame || {relativePosition: pt(0,0), positionOffset: pt(0,0)};
        this.halos.addMorph(button);
        //A halo should not accept drops
        button.openForDragAndDrop = false;
        button.label.openForDragAndDrop = false;
        button.setWithoutLayers([WebcardsLayer]);
        return button;
    },
    
    
    addGrabHalo: function(proceed, positionSpec) {
        var grabHalo = this.addHaloItem("drag",  new Rectangle(0,0,45,20),
            positionSpec, {fill: Color.green});
		grabHalo.onMouseDown = function(evt){
			this.dragMe(evt);
		}.bind(this);
	},
	/** end generic Halos**/
	
	initHaloMenu: function(){
		this.stopWords = this.stopWords.concat(['ownerProg','preferenceMorph','webCardModel']);
		this.setupHalos();
		var optModel = Relay.newInstance({Value: "=opts"}, {opts: function(buttonDown) {this.onChangeAction(buttonDown);}.bind(this)});
		this.addRightLowerHalo("options",optModel,"Opens the preferences of this object");
		var undoModel = Relay.newInstance({Value: "=undo"}, {undo: function(buttonDown) {this.onUndoAction(buttonDown);}.bind(this)});
		this.addLeftLowerHalo("undo",undoModel,"Opens the undo list of this object");
	},
	
	isHalloVisible: Functions.True,
		
	onChangeAction: function(proceed, buttonDown){
		if (buttonDown) return;
		try{
			this.ownerProg.showPrefs(this);
		}catch(e){
			console.error(e);
		}
	},
	
	onUndoAction: function(proceed, buttonDown) {
		if (buttonDown) return;
		var undoMorph = new UndoMorph(this);
		undoMorph.openIn(this.world(),pt(20,20));
	},
		
	onMouseOver: function(proceed, evt){

		if(!this.halos){
			this.initHaloMenu();
		}
		this.showHalos();
	
	}

});


layerClass(FrontMorphLayer, Card, {
	onMouseOver: function(proceed, evt){
		return proceed(evt);
	}
});

layerClass(WebcardsLayer, Morph, {
	handlesMouseDown: Functions.True,

  	//changes default behavior such that not too much cmds are produced
	onMouseMove: function(proceed, evt, hasFocus) { 
		if (evt.mouseButtonPressed && this==evt.hand.mouseFocus && this.owner && this.owner.openForDragAndDrop) {
	 	  	this.dragMe(evt);
		}
		if (!evt.mouseButtonPressed) this.checkForControlPointNear(evt);
    }
});

layerClass(WebcardsLayer, PasteUpMorph, {
	handlesMouseDown: Functions.True,

    onMouseDown: function PasteUpMorph$onMouseDown(proceed, evt, hasFocus) {  //default behavior is to grab a submorph
        var m = this.morphToReceiveEvent(evt);
        if (Config.usePieMenus) {
			return proceed(evt, hasFocus);
		}
		if (m == null) { 
        	return proceed(evt, hasFocus);
        } else if (!evt.isCommandKey() && evt.isLeftMouseButtonDown()) {
            if (m === this.world()) { 
               return proceed(evt, hasFocus);
            } else if (m.handlesMouseDown(evt)) return proceed(evt, hasFocus);
        }
        this.dragMe(evt);
        return true; 
    }
    
});

layerClassAndSubclasses(WebcardsLayer, Morph, {

	setPosition: function(proceed, value) {
		return this.genericSet('setPosition','getPosition', proceed, value);
	},
	
	setFill: function(proceed, value) {
		return this.genericSet('setFill','getFill', proceed, value);
	},
	
	setFillOpacity: function(proceed, value) {
		return this.genericSet('setFillOpacity','getFillOpacity', proceed, value);
	},
	
	setBorderColor: function(proceed, value) {
		return this.genericSet('setBorderColor','getBorderColor', proceed, value);
	},
	
	setBorderWidth: function(proceed, value) {
		return this.genericSet('setBorderWidth','getBorderWidth', proceed, value);
	},
	
	setScale: function(proceed, value) {
		return this.genericSet('setScale','getScale', proceed, value);
	},
	
	setRotation: function(proceed, value) {
		return this.genericSet('setRotation','getRotation', proceed, value);
	},
	
	setVisible: function(proceed, value) {
		return this.genericSet('setVisible','isVisible', proceed, value);
	},
	
	setExtent: function(proceed, value) {
		return this.genericSet('setExtent','getExtent', proceed, value);
	},
	
	setBounds: function(proceed, value) {
		return this.genericSet('setBounds','innerBounds', proceed, value); //i am not 100% sure with innerBounds as getter.
	},
	
	setStrokeOpacity: function(proceed, value) {
		return this.genericSet('setStrokeOpacity','getStrokeOpacity', proceed, value); //getStrokeOpacity wurde von mir angelegt.
	},
	
	setBorderRadius: function(proceed, value) {
		return this.genericSet('setBorderRadius','getBorderRadius', proceed, value); //setBorderRadius und getBorderRadius wurden von mir angelegt
	},
	
	setLineCap: function(proceed, value) {
		return this.genericSet('setLineCap','getLineCap', proceed, value); //getLineCap wurde von mir angelegt
	},
	
	setLineJoin: function(proceed, value) {
		return this.genericSet('setLineJoin','getLineJoin', proceed, value); //getLineJoin wurde von mir angelegt
	},
	
	setTransform: function(proceed, value) {
		return this.genericSet('setTransform','getTransform', proceed, value); //getLineJoin wurde von mir angelegt
	},
	
	//for lively.scene.Polyline etc 
	setVertices: function(proceed, value) {
		return this.genericSet('setVertices','', proceed, value); //No getter
	},
	
	setShape: function(proceed, value) {
		return this.genericSet('setShape','', proceed, value); //No getter
	},
	
	reshape: function(proceed, partName, newPoint, lastCall) {
	 	this.enterWrappenMethode();
	 	if(this.shape.getType() === "lively.scene.Rectangle" ||this.shape.getType() === 'lively.scene.Ellipse'){
	 		var oldValue = this.shape.bounds();
	 		var action = 'shape.setBounds';
	 		var result = proceed(partName, newPoint, lastCall);
	 		var newValue = this.shape.bounds();
	 	}else{
	 		var oldValue = this.shape.vertices().clone();
	 		var action = 'shape.setVertices';
	 		var result = proceed(partName, newPoint, lastCall);
	 		var newValue= this.shape.vertices().clone();
	 	}
		this.leaveWrappenMethode();
		if(!this.isInWrappenMethode() && lastCall!==false){
			var spec = {
				action : action,
				target : this,
				newValue : newValue,
				oldValue : this.shape.firstCallReshapeValue || oldValue
			};
			var cmd = new SetGetCommandObject(spec);
			delete this.shape.firstCallReshapeValue;
			this.sendCommand(cmd);
		}else if(!this.isInWrappenMethode() && lastCall==false){
			//Wont send reshape witch is not the last one
			if(!this.shape.firstCallReshapeValue){
				this.shape.firstCallReshapeValue = oldValue;
		 	}
		}
		return result;
 	},
	
	addMorph: function(proceed, value) {
		//addMorph of Morph-Layer
		var result = this.genericAddRemove('addMorph', 'removeMorph', proceed, value);
		//will send extra info
		value.forceInitSetCmd('setTransform','getTransform');
		value.forceInitSetCmd('setPosition','getPosition');
		return result;
	},
	
	removeMorph: function(proceed, value) {
		return this.genericAddRemove('removeMorph', 'addMorph', proceed, value);
	},
	
	translateBy: function(proceed, value) {
		return this.genericAccumulat('translateBy','', proceed, value); //No getter
	},
	
	addActiveScript: function(proceed, value) {
		return this.genericAddRemove('addActiveScript', '', proceed, value);
	},
	
	duplicate: function (proceed) { 
		var result;
		withoutLayers([WebcardsLayer], function() {
			result = proceed();
		}.bind(this));
		this.deleteSuffFromWebcard(result);
		return result;
    },
    
    deleteSuffFromWebcard: function(proceed, obj) {
    	delete obj._id;
		delete obj._rev;
		delete obj.halos;
		delete obj.handObserver;// when Copying, the halos are shown, so the original obj has a handObserver
		obj.cmdCount = 0;
		delete obj.commandObjectsList;
		delete obj.highestHandledCommandNr;
		delete obj.highestHandledSeqNr;
		delete obj.allCommandsByNr;
		
		return obj;
    },
    
    copyToHand: function(proceed) { 
		var result;
		withoutLayers([WebcardsLayer], function() {
			result = proceed();
		}.bind(this));
		this.deleteSuffFromWebcard(result);
		return result;
    },
    
	/*****************************
	** Additional Helper Methdods
	*******************************/
	genericAddRemove: function(proceed, action, reverseAction, theFunction, value) {
		this.enterWrappenMethode();
		var result = theFunction(value);
		this.leaveWrappenMethode();
		
		if(!this.isInWrappenMethode()){
			var spec = {
				action : action,
				target : this,
				newValue : value,			
				reverseAction : reverseAction
			};
			var cmd = new AddRemoveCommandObject(spec);		
			this.sendCommand(cmd);
		}
		return result;
	},
	
	genericAccumulat: function(proceed, setterName, getterName, setterFunction, value) {
		var oldValue = this.getOldValue(getterName);
		this.enterWrappenMethode();
		var result = setterFunction(value);
		this.leaveWrappenMethode();
		if(!this.isInWrappenMethode()){
			var spec = {
				action : setterName,
				target : this,
				newValue : value,
				oldValue : oldValue,
				
				setter: setterName,
				getter: getterName
	
			};
			var cmd = new AccumulateingCommandObject(spec);
			this.sendCommand(cmd);
		}
		return result;
	},
	
	genericSet: function(proceed, setterName, getterName, setterFunction, value) {
		var oldValue = this.getOldValue(getterName);
		this.enterWrappenMethode();
		var result = setterFunction(value);
		this.leaveWrappenMethode();
		if(!this.isInWrappenMethode()){
			var spec = {
				action : setterName,
				target : this,
				newValue : value,
				oldValue : oldValue,
				
				setter: setterName,
				getter: getterName
	
			};
			var cmd = new SetGetCommandObject(spec);
			this.sendCommand(cmd);
		}
		return result;
	},
	
	getOldValue: function(proceed, getterName) {
		if(this[getterName]){
			var oldValue = this[getterName]();
		}else{
			var oldValue = undefined;
			console.warn("layer: getter :"+getterName+" dont exist");
			dbgOn(getterName !== '');
		}
		return oldValue;
	},
	
	forceInitSetCmd: function(proceed, setterName, getterName) {
		var oldValue = this.getOldValue(getterName);
		this.forceSetCmd(setterName, getterName, oldValue, oldValue);
	},
	
	forceSetCmd: function(proceed, setterName, getterName, newValue, oldValue) {
		var spec = {
			action : setterName,
			target : this,
			newValue : newValue,
			oldValue : oldValue,
			
			setter: setterName,
			getter: getterName

		};
		var cmd = new SetGetCommandObject(spec);
		
		this.sendCommand(cmd,true);
	},
	
	getOwnerProg: function(proceed) {
		if(this.ownerProg) return this.ownerProg;
		var pro = proceed();
		if(pro) return pro;
		return this.owner && typeof this.owner.getOwnerProg === "function" ? this.owner.getOwnerProg() : null;
	},
	
	sendCommand: function(proceed, command, force) {
		console.log("CmdSender: sendCommand with "+command);
		if(!command.action || !("newValue" in command) || command.newValue === undefined){
			console.log("wont send command without action or newValue");
			return;
		}
		if(!force && (command.oldValue === command.newValue || (!!command.newValue && typeof command.newValue.equals === "function" && command.newValue.equals(command.oldValue) ))){
			console.log("CmdSender: wont send");
			return;
		}
		try{
			if(!command.target){
				console.warn("CmdSender: No Command target!");
				return;
			}
			var targetOwnerProg = command.target.ownerProg;
			if(!targetOwnerProg){
				if(typeof command.target.getOwnerProg === "function"){
					var targetOwnerProg = command.target.getOwnerProg();
				}
				if(!targetOwnerProg){
					console.warn("CmdSender: Cant get relaxedMgmt!");
					return;
				}
			}
			var relaxedMgmt = targetOwnerProg.relaxedMgmt;
			var rlxr = new Relaxer();		
			rlxr.setCallbackReferenceHandling(relaxedMgmt.callbackReferenceHandlingSaveIfNew.bind(relaxedMgmt));
			var jso = rlxr.objToRelaxedJso(command);
			if(!("newValue" in jso)){
				console.log("CmdSender: wont send command with filterd newValue");
				return;
			}
			var expectedCmdNr = command.target.incHighestHandledCommandNr();
			command._id = command.target.id()+'_'+relaxedMgmt.commandCdb.newUuids(1)[0];// is safer to use target.id() after objToRelaxedJso, becasue id can change in it
			jso._id = command._id;
			jso.$expectedCmdNr = expectedCmdNr; //for testing only

			this.getAllCommandsByNrArray()[expectedCmdNr] = command;
			
			relaxedMgmt.commandCdb.sendAsync(jso);
			
			console.log("CmdSender: Command send: %s :%s with %s",command._id, command.action, command.newValue);			

			if(typeof command.target.addCommanObject === "function"){
				command.target.addCommanObject(command);
			}else{
				console.info("CmdSender: %s has no addCommanObject method", command.target);
			}
		}catch(e){
			console.warn(e);
		}
	},
		
	/**** Reentrent wrapping ***/
	
	 enterWrappenMethode: function() {
	 	if(!this.enterCount){
	 		this.enterCount = 0;
	 	}
	 	this.enterCount++;
 	},
 	
 	leaveWrappenMethode: function() {
 		if(!this.enterCount){
	 		this.enterCount = 0;
	 	}
 		this.enterCount--;
 	},
 	
 	isInWrappenMethode: function() {
 		if(!this.enterCount){
	 		this.enterCount = 0;
	 	}
 		return this.enterCount > 0;
 	},
 	
 	getCmdCount: function() {
 		if(!this.cmdCount){
 			this.cmdCount = 0;
 		}
 		return this.cmdCount;
 	},
 	
 	//increment
 	incCmdCount: function() {
 		if(!this.cmdCount){
 			this.cmdCount = 0;
 		}
 		this.cmdCount++;
 		return this.cmdCount;
 	},
 	
 	decCmdCount: function() {
 		if(!this.cmdCount){
 			this.cmdCount = 0;
 		}
 		this.cmdCount--;
 		return this.cmdCount;
 	},
 	
 	/***
 	** Undo Methods
 	**/
	
	getCommandObjects: function() {
		if(!this.commandObjectsList){
    		this.commandObjectsList = [];	
    	}
    	return this.commandObjectsList;
    },
    
    addCommanObject: function(proceed, comObj) {
    	dbgOn(!comObj);
    	if(!this.commandObjectsList){
    		this.commandObjectsList = [];			
    	}
    	this.commandObjectsList.unshift(comObj);//put in front of the list
    	
    	if(typeof this.commandObjectsListChangedCallback === "function"){
    		this.commandObjectsListChangedCallback(comObj);
    	}
    	
    	if(this.kidz){
    		this.kidz.forEach(function(it) {
    			it.handleCmdFromMaster(comObj);
    		});
    	}
    },
    
    setCommandObjectList: function(proceed, comObjList) {
    	dbgOn(!comObjList.last());
    	this.commandObjectsList = comObjList;
    },
    
    undoOrRedoIt: function(proceed, selId) {
		this.undoOrRedoItWithoutSending(selId);
		
		var spec = {
			action : 'undoOrRedoItWithoutSending',
			target : this,
			newValue : selId
		};
		var cmd = new MetaCommandObject(spec);
		this.sendCommand(cmd,true);
	},
	
	undoOrRedoItWithoutSending: function(proceed, selId) {
		var commandObjs = this.getCommandObjects().clone();//the newest is in front of it.
		this.undoOrRedoItWithCommandObjs(selId, commandObjs);
	},
	
	undoOrRedoItWithCommandObjs: function(proceed, selId, commandObjs) {

		var i;
		var found = false;
		undoLoop: for(i=0; i<commandObjs.length; i++){
			var current = commandObjs[i];
			if(current instanceof MetaCommandObject){
				continue;
			}
			current.undo();
			if(current._id === selId){
				current.setDisabled(!current.isDisabled());
				found = true;
				break undoLoop;
			}
			
		}
		if(!found){
			console.warn("no found %s to undo",selId);
			debugger;
			i--;
		}
		
		redoLoop: for(var j=i; j>=0; j--){
			var current = commandObjs[j];
			if(current instanceof MetaCommandObject){
				continue;
			}
			current.doIt();
		}
	},
	
	//@private
	undoOrRedoItFromMaster: function(proceed, selId) {
		var parentLikeCommandObjs =this.getMasterCommandObjectsList();
		this.undoOrRedoItWithCommandObjs(selId,parentLikeCommandObjs);
	},

	handleCmdFromMaster: function(proceed, cmd) {
	 	var ownCommandObjs = this.getCommandObjects().clone();//the newest is in front of it.
		
	 	//Undo all
	 	var relevantSetGets = {};
	 	for(var i=0; i<ownCommandObjs.length; i++){
			var current = ownCommandObjs[i];
			dbgOn(!current);
			if(current instanceof MetaCommandObject){
				continue;
			}
			if(current instanceof SetGetCommandObject){
				var act = current.getAction();
				if (!(act in relevantSetGets)){
					relevantSetGets[act] = current;
				}
			}
			current.undo();
		}
		
		if(cmd instanceof MetaCommandObject){
				this.undoOrRedoItFromMaster(cmd.newValue);
		}else{
			//cmd anpassen
			var myCmd = this.convertAnAddCmdFromMaster(cmd);
			myCmd.doIt();
		}
		
		//Redo all
		for(var j=ownCommandObjs.length-1; j>=0; j--){
			var current = ownCommandObjs[j];
			if(current instanceof MetaCommandObject){
				continue;
			}
			if(current instanceof SetGetCommandObject){
				var act = current.getAction();
				console.assert(relevantSetGets[act],"SetGetCommandObject not handeld in undo loop");
					if(relevantSetGets[act] !== current){
						continue;
					}
			}
				
			current.doIt();
		}
	},
	 
	convertAnAddCmdFromMaster: function(proceed, cmd) {
	 	var myCmd = Object.clone(cmd);
	 	myCmd.setTarget(this);
	 	
	 	//can't copy lively.paint.LinearGradient
	 	if(myCmd.newValue instanceof lively.data.Wrapper && !(myCmd.newValue instanceof lively.paint.Gradient)){
	 		//determin Owning card
	 		var cur =  this;
	 		var crdNr = -1;
	 		while(cur){
	 			if(cur.cardNr){
	 				crdNr = cur.cardNr;
	 				break;
	 			}else{
	 				cur = cur.owner;
	 			}
	 		}
		 	var shCopier = new SpecialIdHandlingCopier(crdNr);
		 	var newId = shCopier.newIdForOld(myCmd.newValue.id());
		 	newId += ':'+myCmd.newValue.getType();
		 	var rlxmgmt = this.ownerProg.relaxedMgmt;
		 	var mapped = rlxmgmt.getMappedObj(newId);
		 	if(!mapped){
		 		var copy = myCmd.newValue.copy(shCopier);

				if(typeof copy.initHaloMenu === "function") copy.initHaloMenu();
				copy.submorphs.forEach(function each(m) {
					if(typeof m.initHaloMenu === "function") m.initHaloMenu();
				});
				shCopier.addMapping(myCmd.newValue.id(), copy);
				console.assert(this.ownerProg, "no ownerProg for kid/copy");
				shCopier.handelReWrapObjs(this.ownerProg);
				mapped = copy;
			}
			myCmd.setNewValue(mapped);
		}
		if(myCmd.oldValue instanceof lively.data.Wrapper){
			console.warn("impl deep copy for oldValue");
		}
		
	 	
	 	if(!this.masterCommandObjectsList){
    		this.masterCommandObjectsList = [];
			
    	}
    	this.masterCommandObjectsList.unshift(myCmd);//put in front of the list
    	return myCmd;
	},
	 
	getMasterCommandObjectsList: function() {
	 	if(!this.masterCommandObjectsList){
    		this.masterCommandObjectsList = [];
			
    	}
    	return this.masterCommandObjectsList;
	 },
	 
	 addSubChild: function(proceed, child) {
	 	if(!this.kidz){
	 		this.kidz=[];
 		}
	 	this.kidz.push(child);
 	},
 	
 	//Replacement for original dragMe
 	dragMe: function(proceed, evt) {
		var offset = this.getPosition().subPt(this.owner.localize(evt.point()));
		var startPos = this.getPosition();
		var mouseRelay= {
			captureMouseEvent: function(e) { 
				if (e.type == "MouseMove"){
					withoutLayers([WebcardsLayer], function() {
 						this.setPosition(this.owner.localize(e.hand.getPosition()).addPt(offset));
 					}.bind(this));
				}
				if (e.type == "MouseDown" || e.type == "MouseUp"){
					withoutLayers([WebcardsLayer], function() {
 						this.setPosition(this.owner.localize(e.hand.getPosition()).addPt(offset));
 					}.bind(this));
					this.forceSetCmd("setPosition", "getPosition", this.getPosition(), startPos);
					e.hand.setMouseFocus(null); 
				}
				}.bind(this)
			};
		evt.hand.setMouseFocus(mouseRelay);
    },
    
	
	handleIncomingChange: function(proceed,change) {
		try{
			var owning = this.ownerProg ;
			if(!owning && typeof this.getOwnerProg === "function"){
				var owning = this.getOwnerProg();
			}
			if(!owning){
				console.warn("error while proceeding Command: no owner ");
				return;
			}
			var jso = owning.relaxedMgmt.commandCdb.open(change.id);
						
			if(jso===null){
				console.warn("null: so nothing to do");
				return;
			}	
			
			var command = owning.relaxedMgmt.restoreCmd(jso);
			console.log("handleIncomingChange: Got Command %s: %s with param %s",command.target, command.action,command.newValue);
			
			this.handleCmdObj(command, change.seq);
			
		}catch(e){
			console.warn(e);
			console.warn("error: so nothing to do. Command nr %s, will be ignorred",this.getCmdCount());
		}
		
	},
	
	/**
	* highestHandledCommandNr can be equal or greater than CmdCount, as it includes 
	* expected CmdNrs as well.
	*/
	getHighestHandledCommandNr: function(proceed) {
		if(!this.highestHandledCommandNr){
			this.highestHandledCommandNr = 0;
		}
		return this.highestHandledCommandNr;
	},
	
	setHighestHandledCommandNr: function(proceed, nr) {
		this.highestHandledCommandNr = nr;
	},
	
	incHighestHandledCommandNr: function(proceed) {
		if(!this.highestHandledCommandNr){
			this.highestHandledCommandNr = 0;
		}
		this.highestHandledCommandNr++;
		return this.highestHandledCommandNr;
	},
	
	getAllCommandsByNrArray: function() {
		if(!this.allCommandsByNr){
			this.allCommandsByNr = [];
		}
		return this.allCommandsByNr;
	},
	
	handleCmdObj: function(proceed, command, seqNr) {
		try{
			//highestHandledSeqNr is a sanity check only
			if(!this.highestHandledSeqNr){
				this.highestHandledSeqNr=0;
			}
			
			if(this.highestHandledSeqNr>seqNr){
				console.warn("old cmd. wont use");
				return;
			}
			
			var newCommandNr = this.incCmdCount();
			

			if(this.getHighestHandledCommandNr()<newCommandNr){
				console.log("got new command");
				//it's a nice new Command
				command.doIt();
				this.addCommanObject(command);
			}else{
				//we have to handle our expected CmdsNrs
				var allCommandsByNr = this.getAllCommandsByNrArray();
				
				if(allCommandsByNr[newCommandNr]._id === command._id){
					// we already handeled it, so do nothing.
					console.log("got my command :)");
				}else{
					console.info("got complicated command");
					//cleaning wrong expectations
					var expectedCmds = [];
					for(var i = newCommandNr; i<this.getHighestHandledCommandNr(); i++){
						if(allCommandsByNr[i]){
							var old = allCommandsByNr[i];
							expectedCmds.push(old);
							allCommandsByNr[i] = null;
							old.undo();
							
						}else{
							console.info("highestHandledCommandNr is wrong");
						}
						
					}
					console.assert(expectedCmds.length === this.getHighestHandledCommandNr()-newCommandNr,"bad nr of cmds left");
					command.doIt();
					for(var i = newCommandNr+1; i<this.getHighestHandledCommandNr()+1; i++){
						var wrongExpectedCmd = expectedCmds.shift();
						if(!!wrongExpectedCmd && wrongExpectedCmd._id === command._id){
							//should not happen.
							wrongExpectedCmd = expectedCmds.shift();
						}
						if(!wrongExpectedCmd){break;}
						console.assert(allCommandsByNr[i] === null,"Wrong place. Error using optimistic Commands");
						wrongExpectedCmd.doIt();
						allCommandsByNr[i]=wrongExpectedCmd;
					}
					this.setCommandObjectList(allCommandsByNr.clone().reverse());
				}
				
				
			}

			this.setHighestHandledCommandNr(Math.max(newCommandNr,this.getHighestHandledCommandNr()));
			this.highestHandledSeqNr = Math.max(this.highestHandledSeqNr,seqNr);
			this.getAllCommandsByNrArray()[newCommandNr] = command;
			
		}catch(e){
			dbgOn(true);
			console.warn(e);
			console.warn("error: so nothing to do. Command nr %s, will be ignorred",this.getCmdCount());

		}
	}
	
});

layerClass(WebcardsLayer, TextMorph, {
	
	setTextString: function(proceed, replacement, replacementHints) { 
		if(this.textStyle){
			var setterName = "setRichText";
			var getterName = "getRichText";
			var nrOfArgs = 1;
		}else{
			var setterName = "setTextString";
			var getterName = "ensureTextString";	
			var newValue = [replacement, replacementHints];
			var nrOfArgs = 2;
		}
		var oldValue = this.getOldValue(getterName);
		this.enterWrappenMethode();
		var result = proceed(replacement, replacementHints);
		this.leaveWrappenMethode();
		if(this.textStyle){
			var newValue = this.getOldValue(getterName);
		}
		
		if(!this.isInWrappenMethode()){
			var spec = {
				action : setterName,
				target : this,
				newValue : newValue,
				oldValue : oldValue,
				nrOfArgs : nrOfArgs,
				
				setter: setterName,
				getter: getterName
	
			};
			var cmd = new MultiArgsSetGetCommandObject(spec);
			
			this.sendCommand(cmd);
		}
		return result;
	},
	
	setAcceptInput: function(proceed, value) {
		return this.genericSet('setAcceptInput','getAcceptInput', proceed, value);
	},
	
	setTextColor: function(proceed, value) {
		return this.genericSet('setTextColor','getTextColor', proceed, value);
	},
	
	setTabWidth: function(proceed, width, asSpaces) {
		proceed(width, asSpaces);
	},
	
	setRichText: function(proceed, value) {
		return this.genericSet('setRichText','getRichText', proceed, value);
	},
	
	setFontSize: function(proceed, value) {
		return this.genericSet('setFontSize','getFontSize', proceed, value);
	},
	
	setFontFamily: function(proceed, value) {
		return this.genericSet('setFontFamily','getFontFamily', proceed, value);
	},
	
	emphasizeSelection: function(proceed, value) {
		var oldValue = this.getRichText();
		this.enterWrappenMethode();
		var result = proceed(value);
		this.leaveWrappenMethode();
		
		if(!this.isInWrappenMethode()){
			var spec = {
				action : 'setRichText',
				target : this,
				newValue : this.getRichText(),
				oldValue : oldValue
	
			};
			var cmd = new SetGetCommandObject(spec);
			
			this.sendCommand(cmd);
		}
		return result;
		
		
	}
	
	
});

layerClass(WebcardsLayer, Invocation, {
	
	exec: function(proceed) {
		var result;
		withoutLayers([WebcardsLayer], function() {
 			result =  proceed();
 		}.bind(this));
 		return result;
	}

});

layerClassAndSubclasses(MasterContentLayer, Morph, {
	
	handlesMouseDown: Functions.True,
	
	onMouseDown: function(proceed, evt) {
		var copy = this.copyToHand(evt.hand);//works only with modifyed Core
		delete copy._id;
		delete copy._rev;
		delete copy.halos;
		copy.cmdCount = 0;
		delete copy.commandObjectsList;
		delete copy.highestHandledCommandNr;
		delete copy.highestHandledSeqNr;
		delete copy.allCommandsByNr;
		if(copy.initHaloMenu) copy.initHaloMenu();
		if(copy.copyInitialize) copy.copyInitialize();
	}
		
});

layerClass(FrontMorphLayer, ContentRectangle,{
	//COPY AND PAST from Fabrik.js
	minExtent: function() { return pt(50,25); },
	padding: Rectangle.inset(7),
	restictedReshape: true,
	
	//COPY AND PAST from Fabrik.js
    /* reshape changes the bounds of the morph and its shape but makes it not smaller than minExtent()
     * submorphs can react to bounds shape by implementing adoptSubmorphsToNewExtent
     * FIXME what about adoptToBoundsChange???
     */
    reshape: function(proceed, partName, newPoint, lastCall) {
		if(this.restictedReshape===true){
	    	var insetPt = this.padding.topLeft();
	        var priorExtent = this.getExtent().subPt(insetPt);
	        var priorPosition = this.getPosition();
	        var deltaPos = pt(0,0);
	        var morph = this;
	        
	        // overwrite reshape ... move stuff there or in Morph/WindowMorph? Behavior should be correct for most morphs...
	        // FIXME move as much as possible from shape.reshape into this!
	     	this.shape.reshape = function(partName, newPoint, lastCall) {
	            var bnds = this.bounds();
	            var userRect = this.bounds().withPartNamed(partName, newPoint);
	            // do not flip the bounds
	            if (!userRect.partNamed(partName).eqPt(newPoint)) return null;
	            deltaPos = userRect.topLeft(); // vector by which the morph is moved
	            var minExtent = morph.minExtent();
	            // adopt deltaPos and userRect so that newBounds has ar least minExtent
	            if (userRect.extent().x <= minExtent.x) {
	                if (deltaPos.x != 0)
	                    deltaPos = deltaPos.withX(deltaPos.x - (minExtent.x - userRect.extent().x));
	                userRect = userRect.withWidth(minExtent.x);
	            };
	            if (userRect.extent().y <= minExtent.y) {
	                if (deltaPos.y != 0)
	                    deltaPos = deltaPos.withY(deltaPos.y - (minExtent.y - userRect.extent().y));
	                userRect = userRect.withHeight(minExtent.y);
	            };
	            var newBounds = userRect.extent().extentAsRectangle(); // newBounds has position (0,0)
	            this.setBounds(newBounds);
	        }.bind(this.shape);
	        
	        var retval = proceed(partName, newPoint, lastCall);
	        if(this.adoptSubmorphsToNewExtent) this.adoptSubmorphsToNewExtent(priorPosition,priorExtent, this.getPosition(), this.getExtent().subPt(insetPt));
	        this.setPosition(this.getPosition().addPt(deltaPos));
	    	return retval;
		}else{
			return proceed(partName, newPoint, lastCall);
		}
    }
});

Object.extend(Morph.prototype,LayerableObjectTrait);
Morph.prototype.lookupLayersIn=["owner"];
HandleMorph.prototype.setWithoutLayers([WebcardsLayer, FrontMorphLayer, MasterContentLayer]);
TextSelectionMorph.prototype.setWithoutLayers([WebcardsLayer, FrontMorphLayer, MasterContentLayer]);


}); // end of require