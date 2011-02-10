module('lively.ide.BrowserFramework').requires('lively.bindings', 'lively.Widgets').toRun(function() {

Widget.subclass('lively.ide.BasicBrowser',
'settings', {
	documentation: 'Abstract widget with three list panes and one text pane. Uses nodes to display and manipulate content.',
	emptyText: '-----',
	connections: ['targetURL', 'sourceString', 'pane1Selection', 'pane2Selection', 'pane3Selection', 'pane4Selection'],
},
'initializing', {

	initialViewExtent: pt(820, 550),

	panelSpec: [
			['locationPane', newTextPane, new Rectangle(0, 0, 0.8, 0.04)],
			['codeBaseDirBtn', function(bnds) { 
					return new ButtonMorph(bnds) }, new Rectangle(0.8, 0, 0.12, 0.04)],
			['localDirBtn', function(bnds) { 
					return new ButtonMorph(bnds) }, new Rectangle(0.92, 0, 0.08, 0.04)],
			['Pane1', newDragnDropListPane, new Rectangle(0, 0.05, 0.25, 0.35)],
			['Pane2', newDragnDropListPane, new Rectangle(0.25, 0.05, 0.25, 0.35)],
			['Pane3', newDragnDropListPane, new Rectangle(0.5, 0.05, 0.25, 0.35)],
			['Pane4', newDragnDropListPane, new Rectangle(0.75, 0.05, 0.25, 0.35)],
			['midResizer', function(bnds) { 
					return new HorizontalDivider(bnds) }, new Rectangle(0, 0.44, 1, 0.01)],
			['sourcePane', newTextPane, new Rectangle(0, 0.45, 1, 0.49)],
			['bottomResizer', function(bnds) { 
					return new HorizontalDivider(bnds) }, new Rectangle(0, 0.94, 1, 0.01)],
			['commentPane', newTextPane, new Rectangle(0, 0.95, 1, 0.05)]
		],

	allPaneNames: ['Pane1', 'Pane2', 'Pane3', 'Pane4'],

	filterPlaces: ['Root', 'Pane1', 'Pane2', 'Pane3', 'Pane4'],

	formals: ["Pane1Content", "Pane1Selection", "Pane1Menu", "Pane1Filters",
			"Pane2Content", "Pane2Selection", "Pane2Menu", "Pane2Filters",
			"Pane3Content", "Pane3Selection", "Pane3Menu", "Pane3Filters",
			"Pane4Content", "Pane4Selection", "Pane4Menu", "Pane4Filters",
			"SourceString", "StatusMessage", "RootFilters"],

	initialize: function($super) {
		$super();

		//create a model and relay for connecting the additional components later on
		var formals = this.formals,
			defaultValues = (function() {
				return formals.inject({}, function(spec, ea) { spec[ea] = null; return spec });
			})(),
			model = Record.newPlainInstance(defaultValues);

		this.initializeModelRelay(model);

		this.buttonCommands = [];
	},
	initializeModelRelay: function(actualModel) {
		var panes = this.allPaneNames,
			spec = {SourceString: "SourceString", StatusMessage: "StatusMessage", RootFilters: "RootFilters"};
		panes.forEach(function(ea) {
			spec[ea + 'Content'] = ea + 'Content';
			spec[ea + 'Selection'] = ea + 'Selection';
			spec[ea + 'Menu'] = ea + 'Menu';
			spec[ea + 'Filters'] = ea + 'Filters';
		});
		this.relayToModel(actualModel, spec);
		this.filterPlaces.forEach(function(ea) {  /*identity filter*/	
			this['set' + ea + 'Filters']([new lively.ide.NodeFilter()]);
		}, this);
	},

	
    buildView: function (extent) {
 
		extent = extent || this.initialViewExtent;

        this.start();
 
		var panel = new lively.ide.BrowserPanel(extent);
        PanelMorph.makePanedPanel(extent, this.panelSpec, panel);
		this.panel = panel;
 
		this.setupListPanes();
		this.setupSourceInput();
		this.setupLocationInput();
 
		//panel.statusPane.connectModel(model.newRelay({Text: "-StatusMessage"}));
		this.buildCommandButtons(panel);
 		this.setupResizers(panel);

		panel.commentPane.linkToStyles(["Browser_commentPane"])
		panel.commentPane.innerMorph().linkToStyles(["Browser_commentPaneText"])
		panel.commentPane.clipMorph.setFill(null);

		panel.ownerWidget = this;
        return panel;
    },

	setupListPanes: function() {
		var model = this.getModel(), browser = this;
		function setupListPane(paneName) {
            var morph = browser.panel[paneName];
			// morph.innerMorph().plugTo(model, {
				// selection: '->set' + paneName + 'Selection',
				// selection: '<-get' + paneName + 'Selection',
				// getList: '->get' + paneName + 'Content',
				// updateList: '<-set' + paneName + 'Content',
			// })
            morph.connectModel(model.newRelay({List:        ("-" + paneName + "Content"),
                                               Selection:   (      paneName + 'Selection'),
                                               Menu:        ("-" + paneName + "Menu")}), true);
            morph.withAllSubmorphsDo(function() {
				if (this.constructor == SliderMorph) return;
                this.onMouseDown = this.onMouseDown.wrap(function(proceed, evt) {
					browser.ensureSourceNotAccidentlyDeleted(proceed.curry(evt));
                });
            })
        }
		this.allPaneNames.each(function(ea) { setupListPane(ea) });
	},

	setupSourceInput: function() {
		this.sourceInput().maxSafeSize = 2e6;
		// this.sourceInput().styleClass = ['codePane'];
		this.panel.sourcePane.connectModel(this.getModel().newRelay({Text: "SourceString"}));
		// this.panel.sourcePane.innerMorph().plugTo(this, {
		// 		setTextString: '<-setSourceString',
		// 		savedTextString: '->setSourceString',
		// 	});
		// 	this.setSourceString('test');

		this.panel.sourcePane.linkToStyles(["Browser_codePane"])
		this.panel.sourcePane.innerMorph().linkToStyles(["Browser_codePaneText"])
		this.panel.sourcePane.clipMorph.setFill(null);

		// lively.bindings.connect(this, 'sourceString', this.panel.sourcePane.innerMorph(), 'setTextString');
		// lively.bindings.connect(this.panel.sourcePane.innerMorph(), 'savedTextString', this, 'setSourceString');
		// lively.bindings.connect(this, 'sourceString', console, 'log',
			// {converter: function(v) { return v ? v : 'null----' }});
	},
	
	setupLocationInput: function() {
		var locInput = this.locationInput();
		if (!locInput) return;
		locInput.beInputLine();
		locInput.noEval = true;
		locInput.linkToStyles(["Browser_locationInput"])
	},
	
	setupResizers: function() {
		var panel = this.panel;
		
		// for compatibility to old pages -- FIXME remove
		if (!panel.bottomResizer || !panel.midResizer) return 
		
		// resizer in the middle resiszes top panes, buttons and source pane
		this.allPaneNames.collect(function(name) {
			panel.midResizer.addScalingAbove(panel[name]);
		});
		panel.midResizer.addScalingBelow(panel.sourcePane)

		// buttons
		panel.submorphs.forEach(function(m) {
			if (m.constructor == ButtonMorph && m != panel.codeBaseDirBtn && m != panel.localDirBtn)
				panel.midResizer.addFixed(m);
		})

		// bottom resizer divides code and comment pane
		panel.bottomResizer.addScalingAbove(panel.sourcePane)
		panel.bottomResizer.addScalingBelow(panel.commentPane)

		panel.bottomResizer.linkToStyles(["Browser_resizer"]);
		panel.midResizer.linkToStyles(["Browser_resizer"]);
	},
	
	buildCommandButtons: function(morph) {
		var cmds = this.commands()
			.collect(function(ea) { return new ea(this) }, this)
			.select(function(ea) { return ea.wantsButton() });
		if (cmds.length === 0) return;

		var height = Math.round(morph.getExtent().y * 0.04);
		var width = morph.getExtent().x / cmds.length
		var y = morph.getExtent().y * 0.44 - height;

		var btns = cmds.forEach(function(cmd, i) {
			// Refactor me!!!
			var btn = new ButtonMorph(new Rectangle(i*width, y, width, height));
			btn.command = cmd; // used in connection
			btn.setLabel(cmd.asString());
			lively.bindings.connect(btn, 'fire', cmd, 'trigger');
			lively.bindings.connect(btn, 'fire', btn, 'setLabel', {
				converter: function() { return this.getSourceObj().command.asString() }
			});
			// *wuergs* mixed old model and connect FIXME!!!
			var btnModel = {
				setIsActive: function(val) { btn.onIsActiveUpdate(val) },
				getIsActive: function(val) { return cmd.isActive() }
			};
			btn.connectModel({model: btnModel, setIsActive: 'setIsActive', getIsActive: 'getIsActive'});
			cmd.button = btn; // used in onPaneXUpdate, to be removed!!!

			morph.addMorph(btn);
			btnModel.setIsActive(cmd.isActive());
		})
		this.buttonCommands = cmds;
	},

    start: function() {
        this.setPane1Content(this.childsFilteredAndAsListItems(this.rootNode(), this.getRootFilters()));
		this.mySourceControl().registerBrowser(this);
    },
	
	stop: function() {
		this.mySourceControl().unregisterBrowser(this);
    },

},
'testing', {
    hasUnsavedChanges: function() {
        return this.panel.sourcePane.innerMorph().hasUnsavedChanges();
    },
},
'accessing', {

	commands: function() { return [] },

	locationInput: function() { return this.panel.locationPane && this.panel.locationPane.innerMorph() },
	
	sourceInput: function() { return this.panel.sourcePane.innerMorph() },

	mySourceControl: function() {
		var ctrl = lively.ide.startSourceControl();
		if (!ctrl) throw new Error('Browser has no SourceControl!');
		return ctrl;
	},
},
'browser nodes', {

    rootNode: function() {
        throw dbgOn(new Error('To be implemented from subclass'));
    },
 
	selectedNode: function() {
		return this.getPane4Selection() || this.getPane3Selection() || this.getPane2Selection() || this.getPane1Selection();
	},

	allNodes: function() {
		return this.allPaneNames.collect(function(ea) { return this.nodesInPane(ea) }, this).flatten();
	},

	siblingsFor: function(node) {
		var siblings = this.allPaneNames
		.collect(function(ea) { return this.nodesInPane(ea) }, this)
		.detect(function(ea) { return ea.include(node) });
		if (!siblings) return [];
		return siblings.without(node);
	},

	nodesInPane: function(paneName) { // panes have listItems, no nodes
		var listItems = this['get' + paneName + 'Content']();
		if (!listItems) return [];
		if (!listItems.collect) {
			console.log('Weird bug: listItems: ' + listItems + ' has no collect in pane ' + paneName);
			return [];
		}
		return listItems.collect(function(ea) { return ea.value })    
	},
	
	paneNameOfNode: function(node) {
    	return this.allPaneNames.detect(function(pane) {
			// FIXME quality
			return this.nodesInPane(pane).any(function(otherNode) { return otherNode.target == node.target })
		}, this);
	},

	selectionInPane: function(pane) {
		return this['get'+pane+'Selection'](); 
	},

	childsFilteredAndAsListItems: function(node, filters) {
    	return 	this.filterChildNodesOf(node, filters || []).collect(function(ea) { return ea.asListItem() });
    },

    filterChildNodesOf: function(node, filters) {
    	return filters.inject(node.childNodes(), function(nodes, filter) {
    		return filter.apply(nodes)
    	});
    },

 	inPaneSelectNodeNamed: function(paneName,  nodeName) {
		return this.inPaneSelectNodeMatching(paneName, function(node) {
			return node && node.asString && node.asString().replace(/ ?\(.*\)/,"").endsWith(nodeName) });
	},

	inPaneSelectNodeMatching: function(paneName,  test) {
		var listItems = this['get' + paneName + 'Content']();
		if (!listItems) return null;
		var nodes = listItems.pluck('value');
		var wanted = nodes.detect(test);
		if (!wanted) return null;
		var list = this.panel[paneName].innerMorph();
		list.setSelection(wanted, true);
		return wanted;
	},

	selectNode: function(node) {
		return this.selectNodeMatching(function(otherNode) { return node == otherNode });
		// var paneName = this.paneNameOfNode(node);
		// if (!paneName) return;
		// this.inPaneSelectNodeNamed(paneName, node.asString());
	},

	selectNodeMatching: function(testFunc) {
		for (var i = 0; i < this.allPaneNames.length; i++) {
			var paneName = this.allPaneNames[i];
			var node = this.inPaneSelectNodeMatching(paneName, testFunc);
			if (node) return node;
		}
		return null;
	},
	selectNodeNamed: function(name) {
		return this.selectNodeMatching(function(node) {
			return node && node.asString && node.asString().include(name);
		});
	},
	selectNothing: function() {
		if (this.panel) this.setPane1Selection(null, true);
	},


    onPane1SelectionUpdate: function(node) {

		this.pane1Selection = node; // for bindings

		this.panel['Pane2'] && this.panel['Pane2'].innerMorph().clearFilter(); // FIXME, lis filter, not a browser filter!
		
        this.setPane2Selection(null, true);
        this.setPane2Content([this.emptyText]);
        if (!node) return

		this.setPane2Content(this.childsFilteredAndAsListItems(node, this.getPane1Filters()));
       	this.setSourceString(node.sourceString());
		this.updateTitle();

        this.setPane1Menu(node.menuSpec().concat(this.commandMenuSpec('Pane1')));
		this.setPane2Menu(this.commandMenuSpec('Pane2'));
		this.setPane3Menu(this.commandMenuSpec('Pane3'));

		this.buttonCommands.forEach(function(cmd) { cmd.button.setIsActive(cmd.isActive()) })

		node.onSelect();
    },
 
    onPane2SelectionUpdate: function(node) {
	
		this.pane2Selection = node; // for bindings

		this.panel['Pane3'] && this.panel['Pane3'].innerMorph().clearFilter(); // FIXME, lis filter, not a browser filter!
	
        this.setPane3Selection(null);
        this.setPane3Content([this.emptyText]);        
        if (!node) return

        this.setPane3Content(this.childsFilteredAndAsListItems(node, this.getPane2Filters()));
        this.setSourceString(node.sourceString());
		this.updateTitle();

		this.setPane2Menu(node.menuSpec().concat(this.commandMenuSpec('Pane2')));
		this.setPane3Menu(this.commandMenuSpec('Pane3'));

		this.buttonCommands.forEach(function(cmd) { cmd.button.setIsActive(cmd.isActive()) })

		node.onSelect();
    },
 
	onPane3SelectionUpdate: function(node) {
		this.pane3Selection = node; // for bindings

		this.panel['Pane4'] && this.panel['Pane4'].innerMorph().clearFilter(); // FIXME, lis filter, not a browser filter!
	
        this.setPane4Selection(null);
        this.setPane4Content([this.emptyText]);        
        if (!node) return;

        this.setPane4Content(this.childsFilteredAndAsListItems(node, this.getPane3Filters()));
        this.setSourceString(node.sourceString());
		this.updateTitle();

		this.setPane3Menu(node.menuSpec().concat(this.commandMenuSpec('Pane3')));
		this.setPane4Menu(this.commandMenuSpec('Pane4'));

		this.buttonCommands.forEach(function(cmd) { cmd.button.setIsActive(cmd.isActive()) })

		node.onSelect();
    },

	onPane4SelectionUpdate: function(node) {
		this.pane4Selection = node; // for bindings

		if (!node) return;

		this.setSourceString(node.sourceString());
		this.updateTitle();

		this.setPane4Menu(node.menuSpec().concat(this.commandMenuSpec('Pane4')));
		this.buttonCommands.forEach(function(cmd) { cmd.button.setIsActive(cmd.isActive()) })

		node.onSelect();
    },

	onSourceStringUpdate: function(methodString, source) {
		this.sourceString = methodString;
		if (!methodString || methodString == this.emptyText || !this.selectedNode()) return;
		if (this.selectedNode().sourceString() == methodString &&
			source !== this.panel.sourcePane.innerMorph())
				return;
		this.selectedNode().newSource(methodString);
		this.nodeChanged(this.selectedNode());
	},

	onPane1ContentUpdate: function() {
	},

	onPane2ContentUpdate: function() {
	},

	onPane3ContentUpdate: function(items, source) {
		if (source !== this.panel.Pane3.innerMorph())
		    return;
		// handle drag and drop of items
		console.log('Got ' + items);
	},

	onPane4ContentUpdate: function(items, source) {
	},

	onPane1MenuUpdate: Functions.Null,
	onPane2MenuUpdate: Functions.Null,
	onPane3MenuUpdate: Functions.Null,
	onPane4MenuUpdate: Functions.Null,
	onPane1FiltersUpdate: Functions.Null,
	onPane2FiltersUpdate: Functions.Null,
	onPane3FiltersUpdate: Functions.Null,
	onPane4FiltersUpdate: Functions.Null,
	onStatusMessageUpdate: Functions.Null,
	onRootFiltersUpdate: Functions.Null,

	allChanged: function(keepUnsavedChanges, changedNode) {
		// optimization: if no node looks like the changed node in my browser do nothing
		if (changedNode && this.allNodes().every(function(ea) {return !changedNode.hasSimilarTarget(ea)}))
			return;

		// FIXME remove duplication
		var oldN1 = this.getPane1Selection();
		var oldN2 = this.getPane2Selection();
		var oldN3 = this.getPane3Selection();
		var oldN4 = this.getPane4Selection();

		var sourcePos = this.panel.sourcePane.getVerticalScrollPosition();

		var src = keepUnsavedChanges &&
					this.hasUnsavedChanges() &&
					this.panel.sourcePane.innerMorph().textString;

		if (this.hasUnsavedChanges())
			this.setSourceString(this.emptyText);

		var revertStateOfPane = function(paneName, oldNode) {
			if (!oldNode) return;
			var nodes = this.nodesInPane(paneName);
			var newNode = nodes.detect(function(ea) {
			    return ea && ea.target &&
					(ea.target == oldNode.target || (ea.target.eq && ea.target.eq(oldNode.target)))
			});
			if (!newNode)
				newNode = nodes.detect(function(ea) {return ea && ea.asString() === oldNode.asString()});
	           this['set' + paneName + 'Selection'](newNode, true);
		}.bind(this);
	
		this.start(); // select rootNode and generate new subnodes

		revertStateOfPane('Pane1', oldN1);
		revertStateOfPane('Pane2', oldN2);
		revertStateOfPane('Pane3', oldN3);
		revertStateOfPane('Pane4', oldN4);

		if (!src) {
			this.panel.sourcePane.setVerticalScrollPosition(sourcePos);
			return;
		}

		//this.setSourceString(src);
		var text = this.panel.sourcePane.innerMorph();
		text.setTextString(src.toString())
		this.panel.sourcePane.setVerticalScrollPosition(sourcePos);
		// text.changed()
		text.showChangeClue(); // FIXME
	},

    nodeChanged: function(node) {
        // currently update everything, this isn't really necessary
  		this.allChanged();
    },
 
	textChanged: function(node) {
		// be careful -- this can lead to overwritten source code
		var pane = this.paneNameOfNode(node);
		if (!pane) return;
		this.inPaneSelectNodeMatching(pane, Functions.False); // unselect
		this.inPaneSelectNodeMatching(pane, function(other) { return other.target == node.target });
		// this.setSourceString(node.sourceString());
	},
    
	signalNewSource: function(changedNode) {
		this.mySourceControl().updateBrowsers(this, changedNode);
	},

	updateTitle: function() {
		var window = this.panel.owner;
		if (!window) return;
		var n1 = this.getPane1Selection();
	       var n2 = this.getPane2Selection();
	       var n3 = this.getPane3Selection();
		var n4 = this.getPane4Selection();
		var title = '';
		if (n1) title += n1.asString();
		if (n2) title += ':' + n2.asString();
		if (n3) title += ':' + n3.asString();
		if (n4) title += ':' + n4.asString();
		window.setTitle(title);
	},

},
'browser related', {

    installFilter: function(filter, paneName) {
		var getter = 'get' + paneName + 'Filters';
		var setter = 'set' + paneName + 'Filters';
    	this[setter](this[getter]().concat([filter]).uniq());
    },

    uninstallFilters: function(testFunc, paneName) {
    	// testFunc returns true if the filter should be removed
		var getter = 'get' + paneName + 'Filters';
		var setter = 'set' + paneName + 'Filters';
    	this[setter](this[getter]().reject(testFunc));
    },

	commandMenuSpec: function(pane) {
		var result = this.commands()
			.collect(function(ea) { return new ea(this) }, this)
			.select(function(ea) { return ea.wantsMenu() && ea.isActive(pane) })
			.inject([], function(all, ea) { return all.concat(ea.trigger()) });
		if (result.length > 0)
			result.unshift(['-------']);
		return result;
	},

	setStatusMessage: function(msg, color, delay) {
		var s = this.panel.sourcePane;	
		if (!this._statusMorph) {
			this._statusMorph = new TextMorph(pt(300,30).extentAsRectangle());
			this._statusMorph.applyStyle({borderWidth: 0, strokeOpacity: 0})
		}
		var statusMorph = this._statusMorph;
		statusMorph.setTextString(msg);
		s.addMorph(statusMorph);
		statusMorph.setTextColor(color || Color.black);
		statusMorph.centerAt(s.innerBounds().center());
		(function() { statusMorph.remove() }).delay(delay || 2);
	},

	confirm: function(question, callback) {
		WorldMorph.current().confirm(question, callback.bind(this));
	},

	ensureSourceNotAccidentlyDeleted: function(callback) {
		// checks if the source code has unsaved changes if it hasn't or if the
		// user wants to discard them then run the callback
		// otherwise do nothing
		if (!this.hasUnsavedChanges()) {
			callback.apply(this);
			return;
		}
		this.confirm('There are unsaved changes. Discard them?',
			function(answer) { answer && callback.apply(this) });
	},

},
'source pane', {
	selectStringInSourcePane: function(string) {
		var textMorph =	this.panel.sourcePane.innerMorph(),
			index  =  textMorph.textString.indexOf(string);
		textMorph.setSelectionRange(index, index + string.length)
		textMorph.requestKeyboardFocus(WorldMorph.current().firstHand())
	},
});

PanelMorph.subclass('lively.ide.BrowserPanel', {

	documentation: 'Hack for deserializing my browser widget',

	openForDragAndDrop: false,
	
	onDeserialize: function($super) {
		var widget = new this.ownerWidget.constructor();
		if (widget instanceof lively.ide.WikiCodeBrowser) return; // FIXME deserialize wiki browser
		var selection = this.getSelectionSpec();
		if (this.targetURL) widget.targetURL = this.targetURL;
		this.owner.targetMorph = this.owner.addMorph(widget.buildView(this.getExtent()));
		this.owner.targetMorph.setPosition(this.getPosition());
		this.remove();
		this.resetSelection(selection, widget);
    },

	getPane: function(pane) { return this[pane] && this[pane].innerMorph() },
	
	getSelectionTextOfPane: function(pane) {
		var pane = this.getPane(pane);
		if (!pane) return null;
		var index = pane.selectedLineNo;
		if (index === undefined) return null;
		var textItem = pane.submorphs[index];
		return textItem && textItem.textString;
	},

	getSelectionSpec: function() {
		var basicPaneName = 'Pane', spec = {}, i = 1;
		while (1) {
			var paneName = basicPaneName + i;
			var sel = this.getSelectionTextOfPane(paneName);
			if (!sel) return spec;
			spec[paneName] = sel;
			i++;
		}			
	},
	
	resetSelection: function(selectionSpec, widget) {
		for (var paneName in selectionSpec)
			widget.inPaneSelectNodeNamed(paneName, selectionSpec[paneName]);
	},

	shutdown: function($super) {
		$super();
		var browser = this.ownerWidget;
		if (!browser.stop) {
			console.log('cannot unregister browser: ' + browser);
			return;
		}
		console.log('unregister browser: ' + browser);
		browser.stop();
	},

});

Object.subclass('lively.ide.BrowserNode',
'documentation', {
	documentation: 'Abstract node, defining the node interface',
},
'initializing', {
	initialize: function(target, browser, parent) {
		this.target = target;
		this.browser = browser;
		this.parent = parent;
	},
},
'accessing', {
	siblingNodes: function() { return this.browser.siblingsFor(this) },
	parent: function() { return this.parent },
	childNodes: function() { return [] },
	sourceString: function() { return this.browser.emptyText },
},
'conversion', {
	asString: function() { return 'no name for node of type ' + this.constructor.type },
	asListItem: function() {
		//FIXME make class listitem
		var node = this;
		return {
			isListItem: true,
			string: this.asString(),
			value: this,
			onDrop: function(item) { node.onDrop( item && item.value) },	//convert to node
			onDrag: function() { node.onDrag() },
		};
	},
},
'testing', {
	hasSimilarTarget: function(other) {
		if (!other)
			return false;
		var myString = this.asString();
		var otherString = other.asString();
		return myString.length >= otherString.length ?
		myString.include(otherString) :
		otherString.include(myString);
	},
},
'source code management', {
	newSource: function(newSource) {
		var errorOccurred = false,
			failureOccurred = false,
			msg = 'Saving ' + this.target.getName() + '...\n',
			srcCtrl = this.target.getSourceControl ? this.target.getSourceControl() : lively.ide.SourceControl;

		// save source
		try {
			if (this.saveSource(newSource, srcCtrl)) {
				msg += 'Successfully saved';
			} else {
				msg += 'Couldn\'t save';
				failureOccurred = true;
			} 
		} catch(e) {
			dbgOn(true)
			msg += 'Error while saving: ' + e;
			errorOccurred = true;
		}

		msg += '\n';
		
		// eval source
		try {
			if (this.evalSource(newSource)) {
				msg += 'Successfully evaluated ' + this.target.getName();
			} else {
				msg += 'Eval disabled for ' + this.target.getName();
				failureOccurred = true;
			}
		} catch(e) {
			msg += 'Error evaluating ' + e;
			// TODO don't reference UI directly? 
			this.browser.panel.sourcePane.innerMorph().showError(e)
			errorOccurred = true;
		}
		var color = errorOccurred ? Color.red : (failureOccurred ? Color.black : Color.green);
		var delay = errorOccurred ? 5 : null;
		this.statusMessage(msg, color, delay);
		this.browser.signalNewSource(this);
	},
    evalSource: function(newSource) { return false }, 
    saveSource: function(newSource, sourceControl) { return false },
},
'menu', {
    menuSpec: function() { return [] },
},
'logging and feedback', {
    statusMessage: function(string, optColor, optDelay) {
		console.log('Browser statusMessage: ' + string);
        this.browser && this.browser.setStatusMessage(string, optColor, optDelay);
    },
},
'updating', {    
    signalChange: function() { this.browser.nodeChanged(this) },
	signalTextChange: function() { this.browser.textChanged(this) },
	onSelect: function() {  },
},
'dragging and dropping', {
	onDrag: function() { console.log(this.asString() + 'was dragged') },
	onDrop: function(nodeDroppedOntoOrNull) { console.log(this.asString() + 'was dropped') },
	handleDrop: function(nodeDroppedOntoMe) {
		// for double dispatch
		return false;
	},
},
'file framgent support -- FIXME', {
	mergeFileFragment: function(fileFragment) {
		// for a node that represents multiple FileFragments
		return false
	},
});

Object.subclass('lively.ide.BrowserCommand', {

	initialize: function(browser) { this.browser = browser },

	wantsButton: Functions.False,

	wantsMenu: Functions.False,

	isActive: Functions.False,

	asString: function() { return 'unnamed command' },

	trigger: function() {},

	world: function() { return WorldMorph.current() },

});

Object.subclass('lively.ide.NodeFilter', {
	apply: function(nodes) { return nodes }
});

lively.ide.NodeFilter.subclass('lively.ide.SortFilter', {
	apply: function(nodes) {
		return nodes.sort(function(a,b) {
			if (a.asString().toLowerCase() < b.asString().toLowerCase()) return -1;
			if (a.asString().toLowerCase() > b.asString().toLowerCase()) return 1;
			return 0;
		});
	}
});

lively.ide.NodeFilter.subclass('lively.ide.NodeTypeFilter', {

	documentation: 'allows only nodes of the specified class',
	isNodeTypeFilter: true,

	initialize: function(attrsThatShouldBeTrue) {
		this.attributes = attrsThatShouldBeTrue;
	},	

	apply: function(nodes) {
		var attrs = this.attributes;
		if (!attrs) {
			console.log('nodeTypeFilter has no attributes!!!');
			return nodes;
		}
		return nodes.select(function(node) {
			return attrs.any(function(attr) { return node[attr] });
		});
	}
});

Object.extend(lively.ide.NodeTypeFilter, {
	defaultInstance: function() {
		return new lively.ide.NodeTypeFilter([
			'isClassNode',
			'isGrammarNode',
			'isChangeNode',
			'isFunctionNode',
			'isObjectNode']);
	},
});

}) // end of module