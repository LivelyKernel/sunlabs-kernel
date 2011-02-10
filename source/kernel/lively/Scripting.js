module('lively.Scripting').requires('lively.Widgets', 'cop.Layers', 'lively.Connector').toRun(function() {
/*
 *  This module is for textual scripting morphs on a lively page
 */

Object.extend(Layer, {
	allGlobalInstances: function() {
		return Object.values(Global).select(function(ea) {return ea instanceof Layer})
	},
})

cop.create('ScriptingLayer')
.beGlobal()
.refineClass(Morph, {
	layerMenuAddWithLayerItems: function() {
		var self = this;
		var list =  Layer.allGlobalInstances()
			.invoke('getName')
			.sort()
			.collect(function(ea) {return [ea, function() {
				self.world().setStatusMessage(
					"enable withLayer " + ea + " in " + self, Color.blue, 10)
				self.addWithLayer(Global[ea])
			}]});
		if (list.length == 0) 
			return function() {}
		else
			return list	
	},

	layerMenuRemoveWithLayerItems: function() {
		var self = this;
		var list =  this.getWithLayers()
			.invoke('getName')
			.sort()
			.collect(function(ea) {return [ea, 
				function() {
					self.world().setStatusMessage(
							"remove withLayer " + ea + " in " + self, Color.blue, 10);
					self.removeWithLayer(Global[ea])										
				}]});
		if (list.length == 0) 
			return function() {}
		else
			return list
	},

	morphMenu: function(evt) {
		var menu;
		// TOTO remove this workaround ContextJS issue (morphMenu is overriden in TextMorph and called with $super) 
		withoutLayers([ScriptingLayer], function() {
			menu= cop.proceed(evt);
		});
		menu.addItem(["Scripting", [
			["startSteppingScripts", this.startSteppingScripts],		
			["copy to puplic PartsBin", this.copyToPartsBin],		
			["copy to my PartsBin", this.interactiveCopyToMyPartsBin],
			["layers", [
				["addWithLayer", this.layerMenuAddWithLayerItems()],		
				["removeWithLayer", this.layerMenuRemoveWithLayerItems()]]],		
		]])
		return menu;
	}
}).refineClass(WorldMorph, {

	debuggingSubMenuItems: function(evt) {
		var items = cop.proceed(evt);
		items.push(["remove broken attribute connections", this.disconnectBrokenAttributeConnections.bind(this)])
		items.push(["display connections", this.displayConnections.bind(this)])
		items.push(["hide connections", this.hideConnections.bind(this)])
		return items;
	},

	disconnectBrokenAttributeConnections: function() {
		this.withAllSubmorphsDo(function() {
			if (this.attributeConnections == undefined) return; 			
			this.attributeConnections.each(function(ea) {
				if (ea.getTargetObj() == null) {
					alert('disconnect ' + ea)
					ea.disconnect();				
				}
			})
		})

	},
	complexMorphsSubMenuItems: function(evt) {
		var items = cop.proceed(evt);
		items.push(["PartsBin", 
			function(){ 
				var partsBin = new lively.Scripting.PartsBin(URL.codeBase.withFilename("PartsBin/"));
				partsBin.openInWorld(evt.mousePoint, "partsBin");
				partsBin.loadAll();
			}]);
		return items
	},
	displayConnections: function() {
		this.withAllSubmorphsDo(function() { showConnections(this) })
	},
	hideConnections: function() {
		hideAllConnections(WorldMorph.current());
	},

	

})

Morph.addMethods({
	showNameField: function() {
		if (this.isEpimorph) return;

		this.removeNameField();
		var nameField = new TextMorph(new Rectangle(0,-15,100,20), this.name);
		this.addMorph(nameField);
		nameField.beLabel();
		nameField.applyStyle({
			fill: null, borderWidth: 0, strokeOpacity: 0, 
			textColor: Color.gray.darker(), fontSize: 10})
		nameField.isNameField = true;
		connect(this, 'name', nameField, 'setTextString')
	},

	removeNameField: function() {
		this.submorphs.select(function(ea) {return ea.isNameField}).invoke('remove')
	},

	isShowingNameField: function() {
		return this.submorphs.detect(function(ea) {return ea.isNameField}) !== undefined
	},

	showAllNameFields: function() {
		this.removeNameField();
		this.submorphs.invoke('showAllNameFields');
		this.showNameField();
	},

	hideAllNameFields: function() {
		this.removeNameField();
		this.submorphs.invoke('hideAllNameFields');
	},

})


cop.create('DisplayMorphNameLayer').refineClass(Morph, {
	subMenuPropertiesItems: function(evt) {
		var items = cop.proceed(evt);
		if(this.isShowingNameField() ) {
			items.push(["[X] show name field", this.removeNameField])
		} else {
			items.push(["[] show name field", this.showNameField])
		}
		items.push(["show all name fields", this.showAllNameFields])
		items.push(["hide all name fields", this.hideAllNameFields])
		return items
	}
}).beGlobal()

cop.create('CopyCheapListMorphLayer').refineClass(CheapListMorph, {
	morphMenu: function(evt){
		var menu = cop.proceed(evt);
		var self = this;
		menu.addItem(["duplicate as TextMorph", function() {
			evt.hand.addMorph(new TextMorph(new Rectangle(0,0,500,300), self.textString))
		}])

		return menu
	}
})
CopyCheapListMorphLayer.beGlobal()

BoxMorph.subclass("lively.Scripting.DuplicatorPanel", {
	padding: new Rectangle(5, 5, 0, 0),

	initialize: function($super, position, numberOfSlots) {
		numberOfSlots = numberOfSlots || 7;
		var totalWidth = this.slotWidth * numberOfSlots + this.borderSpace;
		$super(new lively.scene.Rectangle(position.extent(pt(totalWidth, 50))));
		this.applyStyle({borderWidth: 2, borderColor: Color.darkGray, fill: Color.white});
		this.shapeRoundEdgesBy(10);
		this.layoutManager = new HorizontalLayout();
		for (var i=0; i < numberOfSlots; i++) {
			this.addSlot(i);
		};
		this.setExtent(this.submorphBounds().extent().addPt(pt(10,10)));
	},

	suppressHandles: true,

	addSlot: function(n) {
		var slot = new lively.Scripting.DuplicatorMorph();
		this.addMorph(slot);
	}
});


/*
 * MorphDuplicatorMorph 
 * - duplicates its submorph and puts it into the hand
 * - can be customized by dropping a morph on it
 */
ClipMorph.subclass('lively.Scripting.DuplicatorMorph', {
	
	defaultExtent: pt(80,80),

	openForDragAndDrop: true,


	initialize: function($super) {
		$super(pt(0,0).extent(this.defaultExtent));
		this.applyStyle({borderWidth: 1, borderColor: Color.gray, fill: Color.lightGray});
		this.shapeRoundEdgesBy(16);
		this.setStrokeOpacity(1);
		// this.beClipMorph();
	},

	suppressHandles: true,

	addMorph: function($super, morph) {
		var oldTarget = this.target();
		if (oldTarget)
		 	oldTarget.remove();
		this.setScale(1);
		var targetWidth = morph.shape.bounds().width
		var scale = targetWidth ? this.bounds().width / targetWidth : 1;


		morph.withAllSubmorphsDo(function() {
			if (this.mouseHandler)
				this.ignoreEvents();
			this.disabledEventsForDuplicating = true
		});

		$super(morph);

		morph.setScale(scale - 0.1);		
		morph.centerAt(this.shape.bounds().center());
		console.log("scale " + scale);

	},

	okToBeGrabbedBy: function() {
		return false		
	},
	
	target: function() {
		return this.submorphs[0]
	},

	handlesMouseDown: Functions.True,

	onMouseDown: function(evt) {
		if (!this.target()) return;
		var duplicate = this.target().duplicate();

		duplicate.withAllSubmorphsDo(function() {
			if (this.disabledEventsForDuplicating)
				this.enableEvents();
			delete this.disabledEventsForDuplicating;
		});
		duplicate.setPosition(pt(0,0));
		duplicate.setScale(1);
		evt.hand.grabMorph(duplicate, evt)	
	},

	onMouseMove: Functions.True,
});

Object.extend(Morph, {
	makeDefaultDuplicatorPanel: function(point) {
		var pane = new lively.Scripting.DuplicatorPanel(point, 10);
		var i = 0;
		var add = function(m) {pane.submorphs[i].addMorph(m); i++};

		add(new TextMorph(pt(0,0).extent(pt(120, 10)), "Text"));
		add(Morph.makeLine([pt(0,0), pt(60, 30)], 2, Color.black));
		add(Morph.makeConnector(pt(0,0), pt(60, 30)));
		add(Morph.makeRectangle(pt(0,0), pt(60, 30)));
		add(Morph.makeCircle(pt(0,0), 25));
		add(Morph.makeStar(pt(0,0)));
		add(new MarkerMorph(pt(0,0).extent(pt(50, 50))));
		
		return pane
	}
});


cop.create('AttributeConnectionMorphLayer')
.refineClass(lively.Connector.ConnectorMorph, {

	setup: function() {
		this.setBorderWidth(2);
		var color = Color.blue;
		this.setBorderColor(color);
		this.arrowHead.head.setFill(color);
		this.arrowHead.head.setBorderColor(color);
		this.isMetaMorph = true;
		this.labelStyle = {fill: Color.white, textColor: Color.blue};
		lively.bindings.connect(this, 'geometryChanged', this, 'updateLabelPositions');
	}, 

	updateLabelPositions: function() {
		if (this.startLabel) this.startLabel.setPosition(this.getStartPos());
		if (this.endLabel) this.endLabel.setPosition(this.getEndPos());
		if (this.middleLabel) this.middleLabel.setPosition(this.getRelativePoint(0.5));
	},

	setupStartLabel: function() {
		var startLabel = new TextMorph(new Rectangle(0, 0, 100, 30), 
			"from: " + this.connection.getSourceAttrName()).beLabel();
		startLabel.applyStyle(this.labelStyle);
		this.addMorph(startLabel);
		this.startLabel = startLabel;
	}, 

	setConverter: function(newSource) {
		var func
		try {
			func = eval("(" + newSource + ")"); // test if correct
			this.connection.converterString = newSource;
			this.connection.converter = null;
		} catch(error) {
			alert("Could not update converter in " + this.connection)
			this.world().logError(error)
		}
	},

	setupMiddleLabel: function() {
		var c = this.connection;
		if (!c) return;
		if (c.converterString) {
			var middleLabel = new TextMorph(new Rectangle(0,0, 300,30), c.converterString);
			middleLabel.setWithoutLayers([ConnectorMorphLayer]); // normal handle behavior!
			middleLabel.setWithLayers([SyntaxHighlightLayer]);
			middleLabel.highlightJavaScriptSyntax();
			this.addMorph(middleLabel);
			middleLabel.applyStyle({fill: Color.white,  fillOpacity: 0.5, borderRadius: 6});
			middleLabel.noEval = true;
			middleLabel.addScript(function getDoitContext() { return this.owner.connection} )

			lively.bindings.connect(middleLabel, "savedTextString", this, 'setConverter')
			lively.bindings.connect(middleLabel, "savedTextString", middleLabel, 'highlightJavaScriptSyntax')
			this.middleLabel = middleLabel;
		}
	}, 

	setupEndLabel: function() {
		var endLabel = new TextMorph(new Rectangle(0,0, 100,30), 
			"to: " + this.connection.getTargetMethodName()).beLabel();
		endLabel.applyStyle(this.labelStyle);
		this.addMorph(endLabel);
		this.endLabel = endLabel;
	},

	editConverter: function() {
		if (!this.connection) return;

		// initialize defefault
		if (!this.connection.converterString) this.connection.converterString = "function(v) { return v}";

		this.setupMiddleLabel();
		this.updateLabelPositions();
	},

	morphMenu: function(evt) {
		// var menu = cop.proceed(evt);
		var menu = new MenuMorph([], this)

		menu.addItem(['remove connection', function() {
			if (!this.connection) return;
			alertOK("disconnecting " + this.connection)
			this.remove();
			this.connection.disconnect();
			}], 0)

		menu.addItem(['edit converter', this.editConverter], 1)
		menu.addItem(['hide', this.remove], 2)

		return menu
	}		
}); 


cop.create('ScriptingConnectionsLayer')
.refineClass(TextMorph, {
	getConnectionTargets: function() {
		return [ "setTextString"]
	},
})
.refineClass(Morph, {

	getConnectionTargets: function() {
		var result = [ "setPosition", "setCenter", "setScale", "setExtent", "setBounds"];
		if (this.connectionTargets)
			result = result.concat(this.connectionTargets)
		return result
	},

	getConnectionAttributes: function() {
		var result = ["origin", "geometryChanged", "fullBounds", "value"];
		if (this.connectionSources)
			result = result.concat(this.connectionSources)
		return result
	},

	connectionAttributeMenuItems: function(evt) {		
		var self = this;
		return this.getConnectionAttributes()
			.collect(function(eaAttribute){ 
				return [eaAttribute, function() {
						var handle = Morph.makeRectangle(0, 0, 15,15);
						handle.openInWorld(evt.hand.getPosition().addPt(pt(-5,-5)))
						handle.suppressHandles = true;
						handle.isConnectionHandle = true;
						handle.addScript(function dropMeOnMorph (receiver) {
							if (this.receiver instanceof WorldMorph) {
								this.connector.remove();
								this.remove();
							}
							this.connector.connectEndMorph(receiver);
							
							var items = [
								["cancel", function() {this.remove();this.connector.remove()}]
							];
							var connector = this.connector;

							if (!receiver.getConnectionTargets) {
								connector.remove(); this.remove();
								return;
							}

							items = items.concat(receiver.getConnectionTargets().collect(
								function(eaTargetSelector) {
									return [eaTargetSelector, 
										function() {
											connector.connection = connect(
												connector.startMorph, connector.sourceAttributeName,  
												connector.endMorph, eaTargetSelector);
											connector.setupStartLabel();
											connector.setupEndLabel();
											connector.updateLabelPositions();
										}]
								}));

							var menu = new MenuMorph(items, this);
							menu.openIn(this.world(), this.connector.getGlobalEndPos())
				
							alertOK("connect to " + receiver)
							this.remove();


						});


						var connector = Morph.makeConnector(pt(100,100),evt.mousePoint.addPt(pt(200,0)));
						handle.connector = connector;
						connector.addWithLayer(AttributeConnectionMorphLayer);
						connector.setup();
						
						connector.openInWorld();
						connector.connectMorphs(self, handle);
						connector.sourceAttributeName = eaAttribute;					

						evt.hand.addMorph(handle)
				}]
			})
	},

	morphMenu: function(evt) {
		var menu = cop.proceed(evt);
		menu.addItem(["conntect attribute", this.connectionAttributeMenuItems(evt)], 5)
	
		return menu
	}
})


BoxMorph.subclass('lively.Scripting.PartsBin',
'default category', {
	defaultExtent: pt(760,500),
	columns: 7,

	initialize: function($super,  partsBinURL) {
		$super(pt(0,0).extent(this.defaultExtent));
		this.url = partsBinURL;
		this.applyStyle({fill: Color.white, borderColor: Color.black, borderRadius: 6});
		this.setupButtons();

	},
	setupButtons: function(){
		var buttonBar = new BoxMorph(new Rectangle(0,0,100,30));

		var label = new TextMorph(new Rectangle(0,0,100,30), 'PartsBin').beLabel();
		label.setFontSize(30);
		this.addMorph(label);

		this.reloadButton = new ButtonMorph(new Rectangle(200,20,70,20)).setLabel("reload");
		this.addMorph(this.reloadButton);
		lively.bindings.connect(this.reloadButton, 'fire', this, 'reload');
		
		this.closeButton = new ButtonMorph(new Rectangle(0,0,30,30)).setLabel("X");
		lively.bindings.connect(this.closeButton, 'fire', this, 'remove');
		this.addMorph(this.closeButton);
		this.closeButton.align(
			this.closeButton.bounds().topRight().addPt(pt(10,-10)),
			this.shape.bounds().topRight())
	},
	


	createPartLoader: function(targetName) {
		return new lively.Scripting.PartPinItem(this.url, targetName);
	},



	loadNames: function() {
		 return new WebResource(this.url).subElements()
			.sort()
			.invoke('getURL')
			.invoke('filename')
			.select(function(ea){ return  ea.match(/(.+)\.json$/)})
			.collect(function(ea){ return ea.replace(".json", "")})
	},

	loadAll: function() {

		var partMorphs = this.loadNames().collect(function(ea) {
			return this.createPartLoader(ea)
		}, this);
		var max = partMorphs.length
		for (var row=0; row < max / this.columns; row++) {
			var columnMorph = new BoxMorph(new Rectangle(0 ,row * 100 + 50,400,100));
			columnMorph.applyStyle({fillOpacity: 0})
			columnMorph.layoutManager = new HorizontalLayout();
			for (var i=0; i<this.columns; i++) { 
				var m = partMorphs.shift();
				if (m)	columnMorph.addMorph(m)
			};
			this.addMorph(columnMorph);
		}; 
	},
	reload: function() {
		this.submorphs.clone().invoke('remove');
		this.setupButtons();
		this.loadAll();
	},
});
Object.extend(lively.Scripting.PartsBin, {
	loadPartFromURL: function(url) {
		var targetJSON = new WebResource(url).forceUncached().get().content;
		var serializer = ObjectGraphLinearizer.forLively();
		serializer.log = function(){}; // be silent
		var	partMorph = serializer.deserializeJso(JSON.unserialize(targetJSON));
		return partMorph
	},
});
BoxMorph.subclass('lively.Scripting.PartPinItem',
'default category', {
	defaultExtent: pt(100,100),
	initialize: function($super, partsBinURL, targetName) {
		$super(pt(0,0).extent(this.defaultExtent));
		this.applyStyle({fill: Color.white, borderColor: Color.black, borderRadius: 6});
		this.partsBinURL = partsBinURL
		this.targetName = targetName;
		this.setupLogo();
		this.beClipMorph();
	},

	setupLogo: function() {
		var logoURL = this.getLogoURL();
		var logoSVG = new ImageMorph(new Rectangle(0,0,100,100), logoURL.withQuery({time: new Date().getTime()}).toString());
		logoSVG.setExtent(pt(100,100));
		logoSVG.setFill(null);
		logoSVG.ignoreEvents();
		this.addMorph(logoSVG)
		var nameLabel = new TextMorph(new Rectangle(10,10,100,20), this.targetName).beLabel();
		this.addMorph(nameLabel);
	},
	getLogoURL: function() {
		return this.partsBinURL.withFilename(this.targetName + ".svg")
	},
	getTargetURL: function() {
		return this.partsBinURL.withFilename(this.targetName + ".json")
	},
	makeUpPartName: function() {
		if ($morph(this.targetName)){
			var i = 2
			while($morph(this.targetName + i)) { i++}
			return this.targetName + i;
		} else {
			return this.targetName;
		}
	},




	handlesMouseDown: function (evt) {return true},
	onMouseMove: function(evt) {return true},
	onMouseDown: function(evt) {	
		var partMorph = lively.Scripting.PartsBin.loadPartFromURL(this.getTargetURL());
		evt.hand.addMorph(partMorph);
		partMorph.name = this.makeUpPartName();
		partMorph.setPosition(pt(0,0));
		return true;
	},
	morphMenu: function($super, evt) {
		var menu = $super(evt);
		menu.addItem(["delete item", this.interactiveDeleteOnServer])
		return menu
	},
	deleteOnServer: function() {
		(new WebResource(this.getLogoURL())).del();	
		(new WebResource(this.getTargetURL())).del();	
	},
	interactiveDeleteOnServer: function() {
		this.world().confirm("really delete " + this.targetName + " in PartsBin?", function(answer) {
			if (answer) {
				this.deleteOnServer();
				this.remove();
				alertOK("deleted " + this.targetName + " in " + this.partsBinURL);
			
			}
		}.bind(this))
	},



});
Morph.addMethods( {
	copyToPartsBin: function() {
		if(!this.name) {
			alert('cannot copy to partsBin without a name');
			return;
		}

		this.copyToPartsBinUrl(URL.codeBase.withFilename("PartsBin/"));

		alert("copied " +this.name + " to PartsBin")
	},
	copyToMyPartsBin: function() {
		var userName = localStorage.livelyUserName;
		if (!userName) throw Error('Cannot copyToMyPartsBin without userName')
	
		var userDir = URL.codeBase.withFilename(userName + '/MyPartsBin/');
		var wr = new WebResource(userDir);
		if (!wr.exists()) {
			alert("created " + userDir)
			 wr.create();
		}

		var partsBinUrl = URL.codeBase.withFilename(userName +  '/MyPartsBin/');
		wr = new WebResource(partsBinUrl);
		if (!wr.exists()) {
			alert("created " + partsBinUrl)
			wr.create();
		}

		this.copyToPartsBinUrl(partsBinUrl);
	},

	interactiveCopyToMyPartsBin: function() {
		if (!localStorage.livelyUserName) {
			this.world().askForUserName()		

		};
		if(!this.name) {			
			this.world().promt('cannot copy to partsBin without a name', function(name) {
				if (name == this.toString()) {
					alert('Cannot copy '+this.toString() + 'to MyPartsBin without a name ');
					return;
				}
				this.name = name;
				this.copyToMyPartsBin()
			}.bind(this), this.toString())
		} else {
			this.copyToMyPartsBin()
		}
	},

	copyToPartsBinUrl: function(partsBinURL) {
		var serializer = ObjectGraphLinearizer.forLivelyCopy()

		var oldPos = this.getPosition();
		this.setPosition(pt(0,0));
		var json, logoMorph;
		try {
			json = serializer.serialize(this);
			svgLogo = this.asSVGLogo()
		} catch(e){
			throw e 
		} finally {
			this.setPosition(oldPos);
		}

		var targetURL = partsBinURL.withFilename(this.name +".json");
		new WebResource(targetURL).put(json)

		var logoURL = partsBinURL.withFilename(this.name +".svg");
		new WebResource(logoURL).put(svgLogo);
	},

	asSVGLogo: function() {
		var oldPos = this.getPosition();
		this.setPosition(pt(0,0))
		var logoMorph = this.asLogo()
		this.setPosition(oldPos)
		// width="2000pt" height="2000pt"
		return '<?xml version="1.0" encoding="UTF-8"?>\n'+
		'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
		'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '+
		'xmlns:ev="http://www.w3.org/2001/xml-events" version="1.1" baseProfile="full" >\n' +
			Exporter.stringify(logoMorph.rawNode) + 
		'</svg>';
	},

});
}) // end of module