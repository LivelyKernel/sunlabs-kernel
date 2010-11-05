/*
 * Copyright (c) 2006-2009 Sun Microsystems, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */


module('lively.ide').requires('lively.Tools', 'lively.Ometa', 'lively.LKFileParser', 'lively.Helper', 'lively.ChangeSet', 'lively.bindings').toRun(function(ide, tools, omet, help) {
    
    // Modules: "+Modules" --> setModule in model
    // Modules: "-Modules" --> getModule in model
    // Modules: "Modules" --> getModule and getModule in model, onModuleUpdate required
 
    //ModulesMenu: [
    // ['test', function() { console.log('click!') }],
    // ['sub', [['test2', function() { console.log('click2!') }]]]
    // ]
 
 
// ===========================================================================
// Browser Framework
// ===========================================================================
Widget.subclass('lively.ide.BasicBrowser',
'default', {
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
		list.setSelection(wanted);
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
		this.inPaneSelectNodeNamed(pane, ''); // unselect
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
			this._statusMorph.applyStyle({borderWidth: 0})
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
			function() { callback.apply(this) });
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
 
Object.subclass('lively.ide.BrowserNode', {

	documentation: 'Abstract node, defining the node interface',

	initialize: function(target, browser, parent) {
		this.target = target;
		this.browser = browser;
		this.parent = parent;
	},

	siblingNodes: function() {
		if (!(this.browser instanceof ide.SystemBrowser)) throw dbgOn(new Error('No browser when tried siblingNodes'));
		return this.browser.siblingsFor(this);
	},

	parent: function() {
		return this.parent;
	},

	childNodes: function() {
		return []
	},

	asString: function() {
		return 'no name for node of type ' + this.constructor.type;
	},

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

	sourceString: function() {
		return this.browser.emptyText
	},

	hasSimilarTarget: function(other) {
		if (!other)
			return false;
		var myString = this.asString();
		var otherString = other.asString();
		return myString.length >= otherString.length ?
		myString.include(otherString) :
		otherString.include(myString);
	},

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
 
    evalSource: function(newSource) {
        return false;
    },
 
    saveSource: function(newSource, sourceControl) {
        return false;
    },
  
    menuSpec: function() {
        return [];
    },
    
    statusMessage: function(string, optColor, optDelay) {
		console.log('Browser statusMessage: ' + string);
        this.browser && this.browser.setStatusMessage(string, optColor, optDelay);
    },
    
    signalChange: function() {
        this.browser.nodeChanged(this);
    },

	signalTextChange: function() {
        this.browser.textChanged(this);
    },
    
	onDrag: function() {
	    console.log(this.asString() + 'was dragged');
	},

	onDrop: function(nodeDroppedOntoOrNull) {
	    console.log(this.asString() + 'was dropped');
	},

	handleDrop: function(nodeDroppedOntoMe) {
		// for double dispatch
		return false;
	},

	mergeFileFragment: function(fileFragment) {
		// for a node that represents multiple FileFragments
		return false
	},

	onSelect: function() {},

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

 
// ===========================================================================
// Browsing js files and OMeta
// ===========================================================================
lively.ide.BasicBrowser.subclass('lively.ide.SystemBrowser', {

	documentation: 'Browser for source code parsed from js files',
	viewTitle: "SystemBrowser",
	isSystemBrowser: true,

	initialize: function($super) {
		$super();
		this.installFilter(lively.ide.NodeTypeFilter.defaultInstance(), 'Pane1');
		this.installFilter(new lively.ide.SortFilter(), 'Root');
		this.evaluate = true;
		this.targetURL = null;
	},

	setupLocationInput: function($super) {
		$super();

		connect(this, 'targetURL', this.locationInput(), 'setTextString',
			{converter: function(value) { return value.toString() }});

		connect(this.locationInput(), 'savedTextString', this, 'setTargetURL',
			{converter: function(value) { return new URL(value) }});
		this.targetURL = this.targetURL // hrmpf

		this.panel.codeBaseDirBtn.setLabel('codebase');
		connect(this.panel.codeBaseDirBtn, 'fire', this, 'setTargetURL',
			{converter: function() { return URL.codeBase.withFilename('lively/')} })

		this.panel.localDirBtn.setLabel('local');
		connect(this.panel.localDirBtn, 'fire', this, 'setTargetURL',
			{converter: function() { return URL.source.getDirectory() }});
	},
	
	getTargetURL: function() {
		if (!this.targetURL) this.targetURL = this.sourceDatabase().codeBaseURL;
		return this.targetURL;
	},
	
	setTargetURL: function(url) {
		this.ensureSourceNotAccidentlyDeleted(function() {
			var prevURL = this.targetURL;
			if (!url.toString().endsWith('/'))
				url = new URL(url.toString() + '/');
			try {
				this.targetURL = url;
				this.rootNode().locationChanged();
				this.allChanged();
			} catch(e) {
				console.log('couldn\'t set new URL ' + url + ' because ' + e);
				this.targetURL = prevURL;
				this.locationInput().setTextString(prevURL.toString());
				return
			}
			this.panel.targetURL = url; // FIXME for persistence
			console.log('new url: ' + url);
		});
	},
	
	rootNode: function() {
		var srcCtrl = lively.ide.startSourceControl();
		if (!this._rootNode)
			this._rootNode = new lively.ide.SourceControlNode(srcCtrl, this, null);
		return this._rootNode;
	},

	commands: function() {
		// lively.ide.BrowserCommand.allSubclasses().collect(function(ea) { return ea.type}).join(',\n')
		return [
			// lively.ide.BrowseWorldCommand,
			lively.ide.AddNewFileCommand,
			lively.ide.AllModulesLoadCommand,
			lively.ide.ShowLineNumbersCommand,
			lively.ide.RefreshCommand,
			lively.ide.EvaluateCommand,
			lively.ide.SortCommand,
			lively.ide.ViewSourceCommand,
			lively.ide.ClassHierarchyViewCommand,
			lively.ide.AddClassToFileFragmentCommand,
			lively.ide.AddLayerToFileFragmentCommand,
			lively.ide.AddMethodToFileFragmentCommand,
			lively.ide.RunTestMethodCommand]
	},


	sourceDatabase: function() {
		return this.rootNode().target;
	},

});
 
Object.extend(lively.ide.SystemBrowser, {
 
	browse: function(module, klass, method) {
	    var browser = new ide.SystemBrowser();
		browser.openIn(WorldMorph.current());
 
		var srcCtrl = ide.startSourceControl();
		srcCtrl.addModule(module);
 
		browser.nodeChanged(null); // FIXME
		
		browser.inPaneSelectNodeNamed('Pane1', module);
		browser.inPaneSelectNodeNamed('Pane2', klass);
		browser.inPaneSelectNodeNamed('Pane3', method);
 
		return browser;
	}
	
});

ide.BasicBrowser.subclass('lively.ide.LocalCodeBrowser', {

	documentation: 'Browser for the local ChangeSet',
	viewTitle: "LocalCodeBrowser",
	allPaneNames: ['Pane1', 'Pane2'],

	panelSpec: [
		//['locationPane', newTextPane, new Rectangle(0, 0, 1, 0.05)],
		['Pane1', newDragnDropListPane, new Rectangle(0, 0, 0.5, 0.4)],
		['Pane2', newDragnDropListPane, new Rectangle(0.5, 0, 0.5, 0.4)],
		['midResizer', function(b) { return new HorizontalDivider(b) }, new Rectangle(0, 0.44, 1, 0.01)],
		['sourcePane', newTextPane, new Rectangle(0, 0.45, 1, 0.49)],
		['bottomResizer', function(b) { return new HorizontalDivider(b) }, new Rectangle(0, 0.94, 1, 0.01)],
		['commentPane', newTextPane, new Rectangle(0, 0.95, 1, 0.05)]
	],

	initialize: function($super, optWorldProxy) {
		$super();
		this.worldProxy = optWorldProxy;
		this.changeSet = (optWorldProxy && optWorldProxy.getChangeSet()) ||
		ChangeSet.current();
		this.evaluate = true;
	},

	rootNode: function() {
		ide.startSourceControl();
		if (!this._rootNode)
			this._rootNode = this.changeSet.asNode(this);
		return this._rootNode;
	},

	commands: function() {
		return [lively.ide.BrowseWorldCommand,
		lively.ide.SaveChangesCommand,
		lively.ide.RefreshCommand,
		lively.ide.EvaluateCommand,
		lively.ide.SortCommand,
		lively.ide.ChangeSetMenuCommand,
		lively.ide.ClassChangeMenuCommand]
	},

});

ide.BasicBrowser.subclass('lively.ide.WikiCodeBrowser', {

	documentation: 'Browser for the local ChangeSet',
	viewTitle: "WikiCodeBrowser",

	panelSpec: [
		['Pane1', newDragnDropListPane, new Rectangle(0, 0, 0.3, 0.45)],
		['Pane2', newDragnDropListPane, new Rectangle(0.3, 0, 0.35, 0.45)],
		['Pane3', newDragnDropListPane, new Rectangle(0.65, 0, 0.35, 0.45)],
		['sourcePane', newTextPane, new Rectangle(0, 0.5, 1, 0.5)],
	],

	initialize: function($super, wikiUrl) {
		$super();
		this.wikiUrl = wikiUrl;
		this.evaluate = true;
	},

	rootNode: function() {
		ide.startSourceControl();
		if (!this._rootNode)
			this._rootNode = new lively.ide.WikiCodeNode(WikiNetworkAnalyzer.forRepo(this.wikiUrl), this, null);
		return this._rootNode;
	},

	commands: function() {
		return [lively.ide.BrowseWorldCommand,
		lively.ide.RefreshCommand,
		lively.ide.EvaluateCommand,
		lively.ide.SortCommand,
		lively.ide.ChangeSetMenuCommand,
		lively.ide.ClassChangeMenuCommand]
	},

});
 
ide.BrowserNode.subclass('lively.ide.SourceControlNode', {

	documentation: 'The root node of the SystemBrowser. Represents a URL',

	initialize: function($super, target, browser, parent) {
		$super(target, browser, parent);
		this.allFiles = [];
	},
	
	addFile: function(file) { this.allFiles.push(file) },
	
	removeFile: function(file) { this.allFiles = this.allFiles.without(file) },
	
	locationChanged: function() {
		try {
			this.allFiles = this.target.interestingLKFileNames(this.browser.getTargetURL());
		} catch(e) {
			// can happen when browser in a serialized world that is moved tries to relativize a URL
			console.warn('Cannot get files for code browser ' + e)
			this.allFiles = [];
		}
	},
	
	childNodes: function() {
		// js files + OMeta files (.txt) + lkml files + ChangeSet current
		//if (this._childNodes) return this._childNodes; // optimization
		var nodes = [];
		var srcDb = this.target;
		var b = this.browser;
		if (this.allFiles.length == 0) this.locationChanged();
		for (var i = 0; i < this.allFiles.length; i++) {
			var fn = this.allFiles[i];
			if (fn.endsWith('.js')) {
				nodes.push(new ide.CompleteFileFragmentNode(srcDb.rootFragmentForModule(fn), b, this, fn));
			} else if (fn.endsWith('.ometa')) {
				nodes.push(new ide.CompleteOmetaFragmentNode(srcDb.rootFragmentForModule(fn), b, this, fn));
			} else if (fn.endsWith('.lkml')) {
				nodes.push(new ide.ChangeSetNode(ChangeSet.fromFile(fn, srcDb.getCachedText(fn)), b, this));
			} else if (fn.endsWith('.st')) {
				require('lively.SmalltalkParserSupport').toRun(function() {
					nodes.push(new StBrowserFileNode(srcDb.rootFragmentForModule(fn), b, this, fn));
				}.bind(this))
			}
		};
		nodes.push(ChangeSet.current().asNode(b)); // add local changes
		this._childNodes = nodes;
		return nodes;
	},
});

ide.BrowserNode.subclass('lively.ide.WikiCodeNode', {
    
	documentation: 'The rootNode which gets the code from worlds of a wiki',

	initialize: function($super, target, browser, parent) {
		"console.assert(target instanceof WikiNetworkAnalyzer);"
		$super(target, browser, parent);
		this.worldsWereFetched = false;
    },
    childNodes: function() {
		if (this._childNodes)
			return this._childNodes;
		if (!this.worldsWereFetched)
			this.updateWithWorlds();
		var nodes = [];
		nodes.push(ChangeSet.current().asNode(this.browser));
		var proxies = this.target.getWorldProxies().select(function(ea) {
			return ea.localName().endsWith('xhtml')
		});
		nodes = nodes.concat(
			proxies.collect(function(ea) {
				return new lively.ide.RemoteChangeSetNode(null, this.browser, this, ea);
		}, this));
		this._childNodes = nodes;
		return nodes;
	},

	updateWithWorlds: function(fileList) {
		this.worldsWereFetched = true;
		this._childNodes = null;
		this.target.fetchFileList(function() {
			this._childNodes = null;
			this.signalChange();
		}.bind(this));
	},
	
});
 
ide.BrowserNode.subclass('lively.ide.FileFragmentNode', {

	toString: function() {
		return this.constructor.name + '<' + this.getName() + '>'
	},

	getName: function() { // not unique!
		return this.target.name || this.sourceString().truncate(22).replace('\n', '') + '(' + this.type + ')';
	},

	sourceString: function() {
		if (!this.target)
			return 'entity not loaded';
		this.savedSource = this.target.getSourceCode();
		return this.savedSource;
	},

	asString: function() {
		var name = this.getName();
		if (this.showLines()) name += ' (' + this.target.startLine() + '-' + this.target.stopLine() + ')';
		return name;
	},

	showLines: function() {
		return this.browser.showLines;
	},

	saveSource: function($super, newSource, sourceControl) {
		this.target.putSourceCode(newSource);
		this.savedSource = this.target.getSourceCode(); // assume that users sees newSource after that
		return true;
	},

	menuSpec: function($super) {
		var spec = $super();
		var node = this;
		spec.push(['add sibling below', function() {
			node.browser.ensureSourceNotAccidentlyDeleted(function() {
				var world = WorldMorph.current();
				world.prompt('Enter source code', function(input) {
					node.target.addSibling(input);
					node.browser.allChanged();
				});
			});
		}]);
		spec.push(['remove', function() {
			node.browser.ensureSourceNotAccidentlyDeleted(function() {
				node.target.remove();
				node.browser.allChanged()
			});
		}]);
		return spec;
	},

	getSourceControl: function() {
		if (this.target.getSourceControl)
			return this.target.getSourceControl();
		return lively.ide.SourceControl;
	},

	onDrop: function(other) {
		if (!other) return;
		console.log(' Moving ' + this.target + ' to ' + other.target);
		if (!other.handleDrop(this))
			this.target.moveTo(other.target.stopIndex+1);
		this.signalChange();
	},

	onDrag: function() {
		// onDrop does all the work
	},

});
lively.ide.FileFragmentNode.subclass('lively.ide.MultiFileFragmentsNode', {

	initialize: function($super, target, browser, parent) {
		$super(target, browser, parent)
		this.targets = [target];
	},

	sourceString: function() {
		throw new Error('Subclass responsibility')
	},

	newSource: function(newSource) {
		// throw new Error('Not yet implemented')
	},

	evalSource: function(newSource) {
        return false;
    },

	saveSource: function($super, newSource, sourceControl) {
		// throw new Error('Not yet implemented')
	},

	menuSpec: function($super) {
		return [];
	},

	onDrop: function(other) {
		throw new Error('Not yet implemented')
	},

	onDrag: function() {
		// onDrop does all the work
	},
 
});

lively.ide.FileFragmentNode.subclass('lively.ide.CompleteFileFragmentNode', { // should be module node
 
	isModuleNode: true,

	maxStringLength: 10000,

    initialize: function($super, target, browser, parent, moduleName) {
        $super(target, browser, parent);
        this.moduleName = moduleName;
		this.showAll = false;
    },
 
    childNodes: function() {
		var acceptedTypes = ['klassDef', 'klassExtensionDef', 'functionDef', 'objectDef', 'copDef', /*'propertyDef'*/];
        var browser = this.browser;
        var completeFileFragment = this.target;
        if (!completeFileFragment) return [];

		var typeToClass = function(type) {
			if (type === 'klassDef' || type === 'klassExtensionDef')
				return lively.ide.CategorizedClassFragmentNode;
			if (type === 'functionDef')
				return lively.ide.FunctionFragmentNode;
			if (type === 'copDef')
				return lively.ide.CopFragmentNode;
			return lively.ide.ObjectFragmentNode;
		}
		return this.target.subElements(2)
			.select(function(ea) { return acceptedTypes.include(ea.type) })
			.collect(function(ff) { return new (typeToClass(ff.type))(ff, browser) });

    },
     
    sourceString: function($super) {
		this.loadModule();
        //if (!this.target) return '';
		var src = $super();
		if (src.length > this.maxStringLength && !this.showAll) return '';
        return src;
    },
    
    asString: function() {
		var name = this.moduleName;
		name = name.substring(name.lastIndexOf('/') + 1, name.length);
		if (!this.target) return name + ' (not parsed)';
		if (!this.showLines()) return name;
		return name + ' (' + this.target.startLine() + '-' + this.target.stopLine() + ')';
    },

	loadModule: function() {
		if (this.target) return;
		this.target = lively.ide.SourceControl.addModule(this.moduleName).ast();
		this.signalChange();
	},

	checkForRedundantClassDefinitions: function() {
		var childNodes = this.childNodes();

		var klassDefs = childNodes
			.select(function(node) { return node.target && !node.target.getSourceCode().startsWith('Object.extend') && (node.target.type == 'klassDef' || node.target.type == 'klassExtensionDef') })
			.pluck('target');

		var multiple = klassDefs.inject([], function(multiple, klassDef) {
			var moreThanOnce = klassDefs.any(function(otherKlassDef) {
				return klassDef !== otherKlassDef && klassDef.name == otherKlassDef.name;
			});
			if (moreThanOnce) multiple.push(klassDef);
			return multiple;
		});

		if (multiple.length == 0) return;

		var msg = 'Warning! Multiple klass definitions in module ' + this.moduleName +':';
		multiple.forEach(function(klassDef) { msg += '\n\t' + klassDef });

		WorldMorph.current().setStatusMessage(msg, Color.blue)
	},

    
	menuSpec: function($super) {
		var menu = [];
   		if (!this.target) return menu;
		var browser = this.browser;
		var node = this;
		menu.unshift(['load', function() {
			try { node.target.getFileString() } catch (e) { WorldMorph.current().notify('Error: ' + e)} }]);
		menu.unshift(['show versions', function() {
			var url = URL.codeBase.withFilename(node.target.fileName);
			new lively.ide.FileVersionViewer().openForURL(url) }]);
		menu.unshift(['open ChangeList viewer', function() {
			new ChangeList(node.moduleName, null, node.target.flattened()).openIn(WorldMorph.current()) }]);
		menu.unshift(['reparse', function() {
    		node.getSourceControl().reparseModule(node.moduleName, true);
    		node.signalChange() }]);
		menu.unshift(['toggle showAll', function() {
    		node.showAll = !node.showAll;
    		node.signalTextChange() }]);
		menu.unshift(['remove', function() {
			browser.sourceDatabase().removeFile(node.moduleName);
			browser.rootNode().removeFile(node.moduleName);
			browser.allChanged()}]);
		menu.unshift(['check for redundant klass definitions', function() {
			node.checkForRedundantClassDefinitions()
		}]);
		menu.unshift(['Add to world requirements', function() {
			var moduleName = module(node.moduleName).namespaceIdentifier;
			ChangeSet.current().addWorldRequirement(moduleName);
			alertOK(moduleName + ' added to local requirements');
		}]);

	return menu;
},

    
});

ide.CompleteFileFragmentNode.subclass('lively.ide.CompleteOmetaFragmentNode', {

	menuSpec: function($super) {
		var menu = $super();
    	var fileName = this.moduleName;
    	if (!this.target) return menu;
		var world = WorldMorph.current();
		menu.unshift(['Translate grammar', function() {
			world.prompt(
				'File name of translated grammar?',
				function(input) {
					if (!input.endsWith('.js')) input += '.js';
					world.prompt(
						'Additional requirements (comma separated)?',
						function(requirementsString) {
							var requirments = requirementsString ? requirementsString.split(',') : null;
							OMetaSupport.translateAndWrite(fileName, input, requirments) }
					);	
				},
				fileName.slice(0, fileName.indexOf('.'))
			) }]);
    		return menu;
	},

	childNodes: function() {
		var fileDef = this.target;
		if (!fileDef) return [];
		var browser = this.browser;
		var ometaNodes = fileDef.subElements()
			.select(function(ea) { return ea.type === 'ometaDef'})
			.collect(function(ea) { return new ide.OMetaGrammarNode(ea, browser, this) });
/***/
ometaNodes.forEach(function(ea) { console.log(ea.target.name) });
/***/
		var rest = fileDef.subElements()
			.select(function(ea) { return !fileDef.subElements().include(ea) })
			.collect(function(ea) { return new ide.ObjectFragmentNode(ea, browser, this) });
		return ometaNodes.concat(rest);
    },

	evalSource: function(newSource) {
		var def = OMetaSupport.translateToJs(newSource);
		if (!def) throw(dbgOn(new Error('Cannot translate!')));
		try {
			eval(def);
		} catch (er) {
			console.log("error evaluating: " + er);
			throw(er)
		}
		console.log('Successfully evaluated OMeta definition');
        return true;
    },

});

ide.FileFragmentNode.subclass('lively.ide.OMetaGrammarNode', {

	isGrammarNode: true,
	
	childNodes: function() {
		var def = this.target;
		var browser = this.browser;
		return this.target.subElements()
			.collect(function(ea) { return new ide.OMetaRuleNode(ea, browser, this) });
	},

	evalSource: lively.ide.CompleteOmetaFragmentNode.prototype.evalSource,

});

ide.FileFragmentNode.subclass('lively.ide.OMetaRuleNode', {

	isMemberNode: true,

	evalSource: function(newSource) {
		var def = this.target.buildNewFileString(newSource);
		lively.ide.CompleteOmetaFragmentNode.prototype.evalSource(def);
		return true;
	},

});

lively.ide.FileFragmentNode.subclass('lively.ide.CategorizedClassFragmentNode', {
 
	isClassNode: true,

	getName: function($super) {
		return $super() + (this.target.type == 'klassExtensionDef' ? ' (extension)' : '')
	},

	childNodes: function() {
		var classFragment = this.target, browser = this.browser, self = this;

		// gather methods and create category nodes

		if (classFragment.categories) {
			var categoryNodes = classFragment.categories.collect(function(ff) {
				return new lively.ide.MethodCategoryFragmentNode(ff, browser, self);
			});
			categoryNodes.unshift(new lively.ide.AllMethodCategoryFragmentNode(classFragment, browser, self));
			return categoryNodes;
		}
		return this.target.subElements().collect(function(ea) {
			return new lively.ide.ClassElemFragmentNode(ea, browser, this);
		}, this);

	},

	menuSpec: function($super) {
		var menu = $super();
		var fragment = this.target;
		var index = fragment.name ? fragment.name.lastIndexOf('.') : -1;
		// don't search for complete namespace name, just its last part
		var searchName = index === -1 ? fragment.name : fragment.name.substring(index+1);
		// menu.unshift(['add to current ChangeSet', function() {
		// 	WorldMorph.current().confirm('Add methods?', function(addMethods) {
		// 		var cs = ChangeSet.current();
		// 		var classChange = new 
		// 	});
		// }]);
		menu.unshift(['references', function() {
			var list = lively.ide.SourceControl
				.searchFor(searchName)
				.without(fragment)
			var title = 'references of' + fragment.name;
			new ChangeList(title, null, list, searchName).openIn(WorldMorph.current()) }]);
		return menu;
	},

	handleDrop: function(nodeDroppedOntoMe) {
		if (!(nodeDroppedOntoMe instanceof lively.ide.ClassElemFragmentNode))
			return false;
		if (this.target.subElements().length == 0) {
			this.statusMessage('FIXME: adding nodes to empty classes!', Color.red);
			return
		}
		this.statusMessage('Adding ' + nodeDroppedOntoMe.asString() + ' to ' + this.asString() + ' and removing original', Color.green);
		var source = nodeDroppedOntoMe.target.getSourceCode();
		nodeDroppedOntoMe.target.remove();
		this.target.subElements().last().addSibling(source);
		
		return true;
	},

	evalSource: function(newSource) {
		try {
			eval(newSource);
		} catch (er) {
			console.log("error evaluating class:" + er);
			throw(er)
		}
		console.log('Successfully evaluated class');
        return true;
    },

	onSelect: function() {
		// FIXME, UGLYYYY!!!!
		var paneName = this.browser.paneNameOfNode(this);
		var idx = Number(paneName[paneName.length-1]);
		var nextPane = 'Pane' + (idx + 1);
		this.browser.inPaneSelectNodeNamed(nextPane, '-- all --')
	},

});

lively.ide.MultiFileFragmentsNode.subclass('lively.ide.MethodCategoryFragmentNode', {

	getName: function() { return this.target.getName() },

	sourceString: lively.ide.FileFragmentNode.prototype.sourceString, // FIXME

	newSource: function(newSource) {
		this.statusMessage('not yet supported, sorry', Color.red);
	},

	childNodes: function() {
		var browser = this.browser;
		return this.target.subElements().collect(function(ea) { return new lively.ide.ClassElemFragmentNode(ea, browser, this) }, this);
	},

	handleDrop: function(nodeDroppedOntoMe) {
		if (!(nodeDroppedOntoMe instanceof lively.ide.ClassElemFragmentNode)) return false;

		if (this.target.subElements().length == 0) { // FIXME also empty categories should work!!!
			this.statusMessage('Adding to empty categories not yet supported, sorry', Color.red);
			return
		}

		this.statusMessage('Adding ' + nodeDroppedOntoMe.asString() + ' to ' + this.asString() + ' and removing original', Color.green);
		var source = nodeDroppedOntoMe.target.getSourceCode();
		nodeDroppedOntoMe.target.remove();
		this.target.subElements().last().addSibling(source);

		return true;
	},

	mergeFileFragment: function(fileFragment) {
		if (fileFragment.type != 'propertyDef') return false;
		if (fileFragment.category != this.target.category) return false;
		if (this.targets.include(fileFragment)) return false;
		this.targets.push(fileFragment);
		return true
	},

});

lively.ide.FileFragmentNode.subclass('lively.ide.AllMethodCategoryFragmentNode', {

	getName: function() { return '-- all --' },

	childNodes: function() {
		var classFragment = this.target;
		var browser = this.browser;
		return classFragment.subElements()
			.select(function(ea) { return ea.type === 'propertyDef' })
			.collect(function(ea) { return new lively.ide.ClassElemFragmentNode(ea, browser, this) }, this);
	},
	
	handleDrop: function(nodeDroppedOntoMe) {
		return false;
		// do nothing
	},

	evalSource: lively.ide.CategorizedClassFragmentNode.prototype.evalSource,

});

lively.ide.FileFragmentNode.subclass('lively.ide.ObjectFragmentNode', {

	isObjectNode: true,

	asString: function($super) {
		return $super() + ' (object)'
	},

    childNodes: function() {
        if (!this.target.subElements()) return [];
        // FIXME duplication with ClassFragmentNode
        var obj = this.target;
        var browser = this.browser;
        return obj.subElements()
            .select(function(ea) { return ea.type === 'propertyDef' })
            // .sort(function(a,b) { if (!a.name || !b.name) return -999; return a.name.charCodeAt(0)-b.name.charCodeAt(0) })
            .collect(function(ea) { return new ide.ClassElemFragmentNode(ea, browser, this) });
    },

	menuSpec: lively.ide.CategorizedClassFragmentNode.prototype.menuSpec, // FIXME
 
})
 
ide.FileFragmentNode.subclass('lively.ide.ClassElemFragmentNode', {

    isMemberNode: true,
    
	menuSpec: function($super) {
		var menu = $super();
		var fragment = this.target;
		var searchName = fragment.name;
		return [
    		['senders', function() {
					var list = lively.ide.SourceControl
						.searchFor(searchName)
						.select(function(ea) {
							if (!ea.name || !ea.name.include(searchName)) return true;
							var src = ea.getSourceCodeWithoutSubElements();
							return src.indexOf(searchName) !== src.lastIndexOf(searchName)
					}); // we don't want pure implementors, but implementors which are also senders should appear
					var title = 'senders of' + searchName;
					new ChangeList(title, null, list, searchName).openIn(WorldMorph.current()) }],
			['implementors', function() {
					var list = lively.ide.SourceControl
						.searchFor(searchName)
						.without(fragment)
						.select(function(ea) { return ea.name === searchName });
					var title = 'implementers of' + searchName;
					new ChangeList(title, null, list, searchName).openIn(WorldMorph.current()) }]
    	].concat(menu);
	},

	sourceString: function($super) {
		var src = $super();
		var view = this.browser.viewAs;
		if (!view) return src;
		if (view != 'javascript' && view != 'smalltalk')
			return 'unknown source view';
		var browserNode = this;
		var result = 'loading Smalltalk module, click again on list item';
		require('lively.SmalltalkParser').toRun(function() {
			var jsSrc = '{' + src + '}' // as literal object
			var jsAst = OMetaSupport.matchAllWithGrammar(BSOMetaJSParser, "topLevel", jsSrc, true);
		  jsAst = jsAst[1][1] // access the binding, not the json object nor sequence node
			var stAst = OMetaSupport.matchWithGrammar(JS2StConverter, "trans", jsAst, true);
			result = view == 'javascript' ? stAst.toJavaScript() : stAst.toSmalltalk();
		});
		return result
	},
	
	evalSource: function(newSource) {
		if (!this.browser.evaluate) return false;
		var ownerName = this.target.className || this.target.findOwnerFragment().name;
		if (!Class.forName(ownerName)) {
			console.log('Didn\'t found class/object');
			return false
		}
		var methodName = this.target.name;
		var methodString = this.target.getSourceCode();
		var layerCommand = this.target.isStatic() ? 'layerObject' : 'layerClass';
		var def;
		if (this.target.layerName) {
			def = Strings.format('%s(%s, %s, {\n\t%s})',
				layerCommand, this.target.layerName, this.target.className, this.target.getSourceCode());
			console.log('Going to eval ' + def);
		} if (this.target.isStatic()) {
			def = 'Object.extend(' + ownerName + ', {\n' + methodString +'\n});';
		} else {
			def = ownerName + ".addMethods({\n" + methodString +'\n});';
		}
		// console.log('Eval: ' + def);
		try {
			eval(def);
		} catch (er) {
			console.log("error evaluating method " + methodString + ': ' + er);
			throw(er)
		}
		console.log('Successfully evaluated #' + methodName);
        return true;
    },

	asString: function($super) {
		var string = $super();
		if (this.target.isStatic instanceof Function)
			string +=  this.target.isStatic() ? ' (static)' : ' (proto)';
		return string;
	},
	
});
 
lively.ide.FileFragmentNode.subclass('lively.ide.FunctionFragmentNode', {

	isFunctionNode: true,

	asString: function($super) {
		return $super() + ' (function)'
	},

	menuSpec: ide.ClassElemFragmentNode.prototype.menuSpec, // FIXME

});

ide.BrowserNode.subclass('lively.ide.ChangeNode', {

	documentation: 'Abstract node for Changes/ChangeSet nodes',

	isChangeNode: true,

	asString: function() {
		return this.target.getName() + (this.target.automaticEvalEnabled() ? '' : ' (disabled)');
	},

	menuSpec: function() {
		var spec = [];
		var n = this;
		var t = n.target;
		spec.push(['remove', function() {
			t.remove();
			n.browser.allChanged() }]);
		if (t.automaticEvalEnabled())	
			spec.push(['disable evaluation at startup', function() {
				t.disableAutomaticEval(); n.signalChange(); }]);
		else
			spec.push(['enable evaluation at startup', function() {
				t.enableAutomaticEval(); n.signalChange(); }]);
		return spec;
	},
	
	sourceString: function() {
		return this.target.asJs();
	},

	saveSource: function(newSource) {
		var fragment = new JsParser().parseNonFile(newSource);
		var change = fragment.asChange();
		this.target.setXMLElement(change.getXMLElement());
		this.savedSource = this.target.asJs();
		return true;
	},
	
	evalSource: function(newSource) {
		if (!this.browser.evaluate) return false;
		/*if (this.target.getDefinition() !== newSource)
		throw dbgOn(new Error('Inconsistency while evaluating and saving?'));*/
		this.target.evaluate();
		return true
	},
	
	onDrop: function(other) {
		if (!other) return;
		console.log(' Moving ' + this.target + ' to ' + other.target);
		this.target.remove();
		other.handleDrop(this);
		this.signalChange();
	},
	
	onDrag: function() {
		// onDrop does all the work
	},
	
	handleDrop: function(nodeDroppedOntoMe) {
		if (!(nodeDroppedOntoMe instanceof lively.ide.ChangeNode))
			return false;
		this.target.addSubElement(nodeDroppedOntoMe.target);
		return true;
	},

});

// ===========================================================================
// Browsing ChangeSets
// ===========================================================================
ide.ChangeNode.subclass('lively.ide.ChangeSetNode', {

    childNodes: function() {
		return this.target.subElements().collect(function(ea) { return ea.asNode(this.browser)}, this);
	},
    
    sourceString: function($super) {
		return '';
    },
    
    asString: function() {
		return this.target.name;
	},

});

ide.ChangeNode.subclass('lively.ide.ChangeSetClassNode', {

	isClassNode: true,
	
	childNodes: function() {
		return this.target.subElements().collect(function(ea) { return ea.asNode(this.browser)}, this);
	}, 
	
	asString: function($super) {
		return $super() + ' [class]';
	},
});

ide.ChangeNode.subclass('lively.ide.ChangeSetClassElemNode', {

	handleDrop: function(nodeDroppedOntoMe) {
		if (!(nodeDroppedOntoMe instanceof lively.ide.ChangeSetClassElemNode))
			return false;
		this.target.parent().addSubElement(nodeDroppedOntoMe.target, this.target);
		return true;
	},

	asString: function() {
		return this.target.getName() + (this.target.isStaticChange ? ' [static]' : ' [proto]');
	},

});

ide.ChangeNode.subclass('lively.ide.ChangeSetDoitNode', {
	
	sourceString: function() {
		return this.target.getDefinition();
	},

	saveSource: function(newSource) {
		this.target.setDefinition(newSource);
		this.savedSource = this.target.getDefinition();
        return true;
    },

	menuSpec: function($super) {
		var spec = $super();
		var n = this;
		var t = n.target;
		spec.unshift(['set name', function() {
			WorldMorph.current().prompt(
				'Set doit name',
				function(input) { t.setName(input);	n.signalChange(); },
				t.getName())
 			}]);
		return spec;
	},

	asString: function($super) {
		return $super() + ' [doit]';
	},
	
	evalSource: function($super, source) {
		var result = $super(source);
		// FIXME move elsewhere....!!!! own subclass?
		if (result && this.target.isWorldRequirementsList) {
			var list = this.target.evaluate();
			if (!Object.isArray(list)) return result;
			list.forEach(function(moduleName) {
				module(moduleName).load();
				console.log('loading ' + moduleName);
			})
		}
		return result;
	},
	
});
lively.ide.ChangeSetNode.subclass('lively.ide.RemoteChangeSetNode', {

	initialize: function($super, target, browser, parent, worldProxy) {
		// target will become a ChangeSet when world is loaded but can now be undefined
        $super(target, browser, parent);
        this.worldProxy = worldProxy;
    },

	childNodes: function($super) {
		if (!this.target)
			this.worldProxyFetchChangeSet();
		return $super();
	},

    sourceString: function($super) {
		if (!this.target)
			this.worldProxyFetchChangeSet();
		return $super();
    },
    
    asString: function() {
		return this.worldProxy.localName() + (this.target == null ? ' (not loaded)' :  '');
	},

	menuSpec: function($super) {
		var spec = [];
		var node = this;
		spec.push(['push changes back', function() {
			node.pushChangesBack();
		}]);
		return $super().concat(spec);
	},

	worldProxyFetchChangeSet: function() {
		this.target = this.worldProxy.getChangeSet();
		this.signalChange();
	},

	pushChangesBack: function() {
		this.worldProxy.writeChangeSet(this.target);
	},

});
lively.ide.FileFragmentNode.subclass('lively.ide.CopFragmentNode', {

	isClassNode: true,

	childNodes: function() {
		return this.target.subElements().collect(function(fileFragment) {
			return new lively.ide.CopRefineFragmentNode(fileFragment, this.browser, this.target)
		}, this);
	},

	evalSource: function(newSource) {
		try {
			eval(newSource);
		} catch (er) {
			console.log("error evaluating layer:" + er);
			throw(er)
		}
		console.log('Successfully evaluated layer');
        return true;
    },

});

lively.ide.FileFragmentNode.subclass('lively.ide.CopRefineFragmentNode', {

	childNodes: function() {
		return this.target.subElements().collect(function(fileFragment) {
			return new lively.ide.CopMemberFragmentNode(fileFragment, this.browser, this)
		}, this);
	},

	evalSource: function(newSource) {
		var source = Strings.format('cop.create("%s")%s', this.parent.getName(), newSource);
		try {
			eval(source);
		} catch (er) {
			this.statusMessage('Could not eval ' + this.asString() + ' because ' + e, Color.red, 5)
		}
		this.statusMessage('Successfully evaled ' + this.asString(), Color.green, 3)
        return true;
    },



});
lively.ide.FileFragmentNode.subclass('lively.ide.CopMemberFragmentNode', {

    isMemberNode: true,
	
	evalSource: function(newSource) {
		this.parent.evalSource(this.parent.sourceString());
		return true;
	},

});

/* Double dispatch Change classes to browser nodes */
ChangeSet.addMethods({
	asNode: function(browser, parent) { return new lively.ide.ChangeSetNode(this, browser, parent) }
});
ClassChange.addMethods({
	asNode: function(browser, parent) { return new ide.ChangeSetClassNode(this, browser, parent) }
});
ProtoChange.addMethods({
	asNode: function(browser, parent) { return new ide.ChangeSetClassElemNode(this, browser, parent) }
});
StaticChange.addMethods({
	asNode: function(browser, parent) { return new ide.ChangeSetClassElemNode(this, browser, parent) }
});
DoitChange.addMethods({
	asNode: function(browser, parent) { return new ide.ChangeSetDoitNode(this, browser, parent) }
});


ide.BrowserCommand.subclass('lively.ide.AllModulesLoadCommand', {

	isActive: Functions.True,

	wantsButton: Functions.True,

	asString: function() { return 'Load all' },

	trigger: function() { 
		var srcCtrl = lively.ide.SourceControl;
		var browser = this.browser;
		var progressBar = WorldMorph.current().addProgressBar();
		var files = srcCtrl.interestingLKFileNames(browser.getTargetURL());
		files.forEachShowingProgress(
			progressBar,
			function(ea) { srcCtrl.addModule(ea) },
			Functions.K, // label func
			function() { progressBar.remove(); browser.allChanged() }); 
	},
});

ide.BrowserCommand.subclass('lively.ide.ShowLineNumbersCommand', {
	
	isActive: Functions.True,

	wantsButton: Functions.True,

	asString: function() { return 'LineNo' },

	trigger: function() {
		browser = this.browser;
		browser.ensureSourceNotAccidentlyDeleted(function() {
			browser.showLines = !browser.showLines;
			browser.allChanged();
		});
	}

});

ide.BrowserCommand.subclass('lively.ide.RefreshCommand', {

	isActive: Functions.True,

	wantsButton: Functions.True,

	asString: function() { return 'Refresh' },

	trigger: function() {
		var browser = this.browser;
		browser.ensureSourceNotAccidentlyDeleted(function() {
			browser.allChanged();
		});
	}

});

ide.BrowserCommand.subclass('lively.ide.EvaluateCommand', {

	isActive: Functions.True,

	wantsButton: Functions.True,

	asString: function() {
		if (this.browser.evaluate) return 'Eval on';
		return 'Eval off'
	},

	trigger: function() {
		this.browser.evaluate = !this.browser.evaluate;
	}

});
ide.BrowserCommand.subclass('lively.ide.ChangesGotoChangeSetCommand', {

	isActive: Functions.True,

	wantsButton: function() {
		return false;//true;
	},

	asString: function() {
		if (this.browser.changesGotoChangeSet) return 'To ChangeSet';
		return 'To files'
	},

	trigger: function() {
		this.browser.changesGotoChangeSet = !this.browser.changesGotoChangeSet;
	}

});

ide.BrowserCommand.subclass('lively.ide.SortCommand', {

	filter: new lively.ide.SortFilter(),

	isActive: Functions.True,

	wantsButton: Functions.True,

	asString: function() {
		if (this.browserIsSorting()) return 'Unsort';
		return 'Sort'
	},

	trigger: function() {
		var filter = this.filter;
		var browser = this.browser;
		var isSorting = this.browserIsSorting();

		browser.ensureSourceNotAccidentlyDeleted(function() {
			browser.filterPlaces.forEach(function(ea) {
				isSorting ?
					browser.uninstallFilters(function(f) { return f === filter }, ea) :
					browser.installFilter(filter, ea);
			});
			browser.allChanged();
		});

	},

	browserIsSorting: function() {
		return this.browser.getPane1Filters().include(this.filter);
	},

});

lively.ide.BrowserCommand.subclass('lively.ide.AddNewFileCommand', {

	isActive: Functions.True,

	wantsButton: Functions.True,

	asString: function() { return 'Add module' },

	world: function() { return WorldMorph.current() },

	createFile: function(filename) {
		var content = '', browser = this.browser;
		if (filename.endsWith('.ometa')) {
			content = this.ometaTemplate();
		} else {
			if (!filename.endsWith('.js')) filename += '.js';
			content = this.moduleTemplateFor(filename);
		}

		var dir = new FileDirectory(this.browser.getTargetURL());
		if (dir.fileOrDirectoryExists(filename)) {
			this.world().notify('File ' + filename + ' already exists!');
			return null
		}
		dir.writeFileNamed(filename, content);
		browser.rootNode().locationChanged();
		browser.allChanged();
		browser.inPaneSelectNodeNamed('Pane1', filename);
	},

	moduleTemplateFor: function(filename) {
		var fnWithoutJs = filename.substring(0, filename.indexOf('.'));
		var moduleBase = this.browser.getTargetURL().withRelativePartsResolved().relativePathFrom(URL.codeBase);
		var moduleName = moduleBase.toString().replace(/\//g, '.') + fnWithoutJs;
		return Strings.format('module(\'%s\').requires().toRun(function() {\n\n// Enter your code here\n\n}) // end of module',
				moduleName);
	},

	ometaTemplate: function(filename) {
		return 'ometa TestParser <: Parser {\n\texampleRule = 1\n}';
	},

	trigger: function() {
		var browser = this.browser;
		this.browser.ensureSourceNotAccidentlyDeleted(function() {
			this.world().prompt('Enter filename (something like foo or foo.js or foo.ometa)', this.createFile.bind(this));
		}.bind(this));
	},
	
});

lively.ide.BrowserCommand.subclass('lively.ide.BrowseWorldCommand', {

	isActive: Functions.True,

	wantsButton: Functions.True,

	asString: function() { return 'Browse world...' },

	trigger: function() {
		var w = WorldMorph.current();
		w.prompt('Enter URL for World', function(url) {
			require('lively.LKWiki').toRun(function() {
				url = new URL(url);
				var proxy = new WikiWorldProxy(url, url.getDirectory());
				new lively.ide.LocalCodeBrowser(proxy).open();				
			})
		});
	},

});

lively.ide.BrowserCommand.subclass('lively.ide.ViewSourceCommand', {

	isActive: function() { return this.browser.selectedNode() && this.browser.selectedNode().isMemberNode },

	wantsButton: Functions.True,

	asString: function() { return 'View as...' },

	trigger: function() {
	var browser = this.browser;
	var world = WorldMorph.current();
	var spec = [
		{caption: 'default', value: undefined},
		{caption: 'javascript', value: 'javascript'},
		{caption: 'smalltalk', value: 'smalltalk'}];
	var items = spec.collect(function(ea) {
	  return [ea.caption,function(evt) {
			browser.ensureSourceNotAccidentlyDeleted(function() {
				browser.viewAs = ea.value;
				browser.selectedNode().signalTextChange()
			});
		}];
	});
	var menu = new MenuMorph(items);
	menu.openIn(world,world.firstHand().getPosition());
},

});
lively.ide.BrowserCommand.subclass('lively.ide.SaveChangesCommand', {

	wantsButton: Functions.True,

	isActive: Functions.True,

	asString: function() {
		return 'Push changes back';
	},

	trigger: function() {
		var b = this.browser;
		var w = WorldMorph.current()
		if (!(b instanceof lively.ide.LocalCodeBrowser)) {
			console.log('Save changes not yet implemented for ' + b);
			return;
		}	
		if (!b.worldProxy) {
			w.setStatusMessage('Browser has no WorldProxy -- cannot save!', Color.red, 5);
			return;
		}
		b.worldProxy.writeChangeSet(b.changeSet);
		w.setStatusMessage('Successfully stored world', Color.green);
	},

});
lively.ide.BrowserCommand.subclass('lively.ide.ChangeSetMenuCommand', {

	wantsMenu: Functions.True,

	isActive: function(pane) {
		return this.browser.selectionInPane('Pane1') instanceof lively.ide.ChangeSetNode && pane == 'Pane2' ||
			this.browser instanceof lively.ide.LocalCodeBrowser && pane == 'Pane1';
	},

	trigger: function() {
		var cmd = this;
		return [['add class', cmd.addClass.bind(this)], ['add doit', cmd.addDoit.bind(this)]];
	},

	getChangeSet: function() {
		if (this.browser.selectionInPane('Pane1') instanceof lively.ide.ChangeSetNode)
			return this.browser.selectionInPane('Pane1').target;
		if (this.browser instanceof lively.ide.LocalCodeBrowser)
			return this.browser.changeSet;
		throw new Error('Do not know which ChangeSet to choose for command');
	},

	addClass: function() {
		var b = this.browser;
		var w = WorldMorph.current();
		var cs = this.getChangeSet();

		var createChange = function(className, superClassName) {
			try {
				var change = ClassChange.create(className, superClassName);
				cs.addSubElement(change);
				if (b.evaluate) change.evaluate();
				b.allChanged();
			} catch(e) {
				if (change) change.remove();
				w.alert('Error when creating class:\n' + e);
			}
		}

		w.prompt('Enter class name', function(n1) {
			w.prompt('Enter super class name', function(n2) {
				createChange(n1, n2);
			}, 'Object')			
		});
	},

	addDoit: function() {
		var b = this.browser;
		var node = this;

		var createChange = function() {
			try {
				var change = DoitChange.create('// empty doit');
				node.getChangeSet().addSubElement(change);
				if (b.evaluate) change.evaluate();
				b.allChanged();
			} catch(e) {
				if (change) change.remove();
				w.alert('Error when creating foit:\n' + e);
			}
		}
		createChange();
	},


});
lively.ide.BrowserCommand.subclass('lively.ide.ClassChangeMenuCommand', {

	wantsMenu: Functions.True,

	isActive: function(pane) {
		var sel = this.browser.selectedNode();
		var paneOfSel = this.browser.paneNameOfNode(sel);
		var paneNoOfSel = Number(paneOfSel.substring('Pane'.length));
		var nextPane = 'Pane' + (paneNoOfSel+1);
		return  sel instanceof lively.ide.ChangeSetClassNode && pane == nextPane ||
			sel instanceof lively.ide.ChangeSetClassElemNode && pane == paneOfSel;
	},


	trigger: function() {
		var cmd = this;
		return [['add method', cmd.addMethod.bind(this)]];
	},
addMethod: function() {
	var b = this.browser;
	var w = WorldMorph.current();
	 classChange = b.selectedNode().target instanceof ClassChange ?
			b.selectedNode().target : b.selectedNode().target.parent();

	var createChange = function(methodName) {
		var change = ProtoChange.create(methodName, 'function() {}');
		classChange.addSubElement(change);
		if (b.evaluate)
			change.evaluate();
		b.allChanged();
	}

	w.prompt('Enter method name', function(n1) {
		createChange(n1);
	});
},

});

lively.ide.BrowserCommand.subclass('lively.ide.ClassHierarchyViewCommand', {

	wantsMenu: Functions.True,

	isActive: function(pane) {
		return this.browser.selectedNode() && this.browser.selectedNode().isClassNode
	},


	trigger: function() {
		return [['view hierarchy', this.viewHierarchy.curry(this.browser.selectedNode().target.name).bind(this)]];
	},

	viewHierarchy: function(klassName) {
		var w = WorldMorph.current();

		var klass = Class.forName(klassName)
		if (!klass) {
			w.alert('Cannot find class ' + klassName)
			return
		}

		var list = klass.withAllSortedSubclassesDo(function(kl, idx, level) {
			var indent = range(1, level).inject('', function(str, idx) { return str + '  ' });
			return {isListItem: true, string: indent + (kl.type || kl.name), value: kl};
		});
		var listPane = newRealListPane(new Rectangle(0,0, 400, 400));
		listPane.innerMorph().updateList(list)
		w.addFramedMorph(listPane, klass.type + ' and its subclasses');
	},

});
lively.ide.BrowserCommand.subclass('lively.ide.AddToFileFragmentCommand', {

	documentation: 'Abstract command. It\'s subclasses are supposed to add some kind of source code to another parsed source entity',

	wantsMenu: Functions.True,

	menuName: null,
	targetPane: null,
	nodeType: 'not specified',

	isActive: function(pane) {
		return pane == this.targetPane && this.findSiblingNode() != null;
	},

	findSiblingNode: function() {
		var isValid = function(node) {
			return node && node[this.nodeType] && node.target;
		}.bind(this);
		var b = this.browser, node = b.selectedNode();
		if (isValid(node)) return node;
		node = b.selectionInPane(this.targetPane);
		if (isValid(node)) return node;
		return b.nodesInPane(this.targetPane).reverse().detect(function(node) { return isValid(node) });
	},

	trigger: function() {
		var siblingNode = this.findSiblingNode(), self = this;
		return [[this.menuName, function() {
			console.log('Doing a ' + self.menuName + ' after ' + siblingNode.asString());
			self.browser.ensureSourceNotAccidentlyDeleted(function() { self.interactiveAddTo(siblingNode) });	
		}]]
	},

	interactiveAddTo: function(siblingNode) {
		throw new Error('Subclass responsibility')
	},

	createSource: function(methodName) {
		throw new Error('Subclass responsibility');
	},
	createAndAddSource: function(/*siblingNode and other args*/) {
		var args = $A(arguments);
		var siblingNode = args.shift();
		var src = this.createSource.apply(this,args);
		var newTarget = siblingNode.target.addSibling(src);
		this.browser.allChanged();
		if (!newTarget) {
			console.warn('Cannot select new browser item that was added with ' + this.menuName)
			return
		}
		this.browser.selectNodeMatching(function(node) { return node && node.target == newTarget });
	},
	selectStringInSourcePane: function(string) {
		var textMorph =	this.browser.panel.sourcePane.innerMorph();
		var index  =  textMorph.textString.indexOf(string);
		textMorph.setSelectionRange(index, index + string.length)
		textMorph.requestKeyboardFocus(WorldMorph.current().firstHand())
	},



});
lively.ide.AddToFileFragmentCommand.subclass('lively.ide.AddClassToFileFragmentCommand', {

	menuName: 'add class',
	targetPane: 'Pane2',
	nodeType: 'isClassNode',

	interactiveAddTo: function(siblingNode) {
		var w = this.world(), b = this.browser, self = this;
		var className = 'MyClass'
		self.createAndAddSource(siblingNode, className, 'Object' );
		this.selectStringInSourcePane(className);
	},

	createSource: function(className, superClassName) {
			return Strings.format('%s.subclass(\'%s\',\n\'default category\', {\n\tm1: function() {},\n});',
				superClassName, className);
		},

});
lively.ide.AddToFileFragmentCommand.subclass('lively.ide.AddLayerToFileFragmentCommand', {

	menuName: 'add layer',
	targetPane: 'Pane2',
	nodeType: 'isClassNode',

	interactiveAddTo: function(siblingNode) {
		var w = this.world(), b = this.browser, self = this;
		var layerName = "MyLayer";
		self.createAndAddSource(siblingNode, "'" + layerName +"'", "MyClass");
		this.selectStringInSourcePane(layerName);
	},

	createSource: function(layerName, className) {
			return Strings.format('cop.create(%s).refineClass(%s, {\n\tm1: function(proceed, a) {return proceed(a)},\n});', layerName, className);
		},

});
Object.subclass('',
'default category', {
	m1: function() {},
});
lively.ide.AddToFileFragmentCommand.subclass('lively.ide.AddMethodToFileFragmentCommand', {

	menuName: 'add method',
	targetPane: 'Pane4',
	nodeType: 'isMemberNode',

	interactiveAddTo: function(siblingNode) {
		var w = this.world(), b = this.browser, self = this;
		var methodName = "newMethod";
		self.createAndAddSource(siblingNode, methodName);
		this.selectStringInSourcePane(methodName);
		LastFragment  = this;
		LastSubling = siblingNode;
	},

	createSource: function(methodName) {
		return Strings.format('%s: function() {},', methodName);
	},

});
lively.ide.BrowserCommand.subclass('lively.ide.RunTestMethodCommand', {

	wantsMenu: Functions.True,

	getSelectedNode: function() {
		return this.browser.selectedNode();
	},

	getTestClass: function() {
		var node = this.getSelectedNode(),
			klass = Class.forName(node.target.className);
		return klass && Global.TestCase && klass.isSubclassOf(TestCase) && klass;
	},

	isActive: function(pane) {
		var node = this.getSelectedNode();
		if (!node || !node.isMemberNode || node.target.isStatic() || !node.target.getName().startsWith('test'))
			return;
		return this.getTestClass() != null;
	},

	runTest: function() {
		var klass = this.getTestClass(),
			testSelector = this.getSelectedNode().target.getName();
		var test = new klass();
		test.runTest(testSelector);
		var failures = test.result.failureList();
		if (failures.length == 0) {
			var msg = klass.name + '>>' + testSelector + ' succeeded'; 
			WorldMorph.current().setStatusMessage(msg, Color.green, 3);
		} else {
			WorldMorph.current().setStatusMessage(failures[0], Color.red, 6);
		}
	},

	trigger: function() {
		return [['run test', this.runTest.bind(this)]]
	},

});


// ===========================================================================
// Another File Parser - uses mostly OMeta for parsing LK sources
// ===========================================================================
Object.subclass('CodeParser', {

	documentation: 'Extended FileParser. Scans source code and extracts SourceCodeDescriptors for ' +
                   'classes, objects, functions, methods. Uses OMeta.',

	ometaRules: [],

	grammarFile: 'LKFileParser.txt',

	initialize: function(forceNewCompile) {
		var prototype = forceNewCompile || !Global['LKFileParser'] ?
			OMetaSupport.fromFile(this.grammarFile) :
			LKFileParser;
		this.ometaParser = Object.delegated(prototype, {_owner: this});
    },

	giveHint: Functions.Null,

	/* parsing */
    prepareParsing: function(src, config) {
        this.src = src;
        this.lines = src.split(/[\n\r]/);
        this.changeList = [];
        
        this.ptr = (config && config.ptr) || 0;
        this.fileName = (config && config.fileName) || null;
    },

	callOMeta: function(rule, src) {
        if (!this.ometaParser) throw dbgOn(new Error('No OMeta parser for parsing file sources!'));
        var errorDescr;
        var errorHandler;
        errorHandler = function(src, rule, grammarInstance, errorIndex) {
         var restLength = src.length - this.ptr
         errorDescr = new ide.ParseErrorFileFragment(src, null, 'errorDef', 0, restLength-1);
         if (this.debugMode)
             OMetaSupport.handleErrorDebug(src, rule, grammarInstance, errorIndex);
        }.bind(this);
        var result = OMetaSupport.matchAllWithGrammar(this.ometaParser, rule, src || this.src, errorHandler);
		return result ? result : errorDescr;
    },

	parseWithOMeta: function(hint) {
        var partToParse = this.src.substring(this.ptr, this.src.length);
        var descr;
        if (hint) descr = this.callOMeta(hint, partToParse);

        if (!descr || descr.isError)
            this.ometaRules
				.without(hint)
				.detect(function(rule) {
					descr = this.callOMeta(rule, partToParse);
					return descr && !descr.isError
				}, this);
        
        if (descr === undefined)
            throw dbgOn(new Error('Could not parse src at ' + this.ptr));
        if (descr.stopIndex === undefined)
            throw dbgOn(new Error('Parse result has an error ' + JSON.serialize(descr) + 'ptr:' + this.ptr));
            
        var tmpPtr = this.ptr;
        this.ptr += descr.stopIndex + 1;
        this.fixIndicesAndMore(descr, tmpPtr);
        return descr;
    },

	parseSource: function(src, optConfig /* FIXME */) {
		if (!src) return [];
		// this is the main parse loop
        var msParseStart;
        var msStart = new Date().getTime();
        this.overheadTime = 0;
        
        this.prepareParsing(src, optConfig);
        var descr;
        
        while (this.ptr < this.src.length) {
            if (this.debugMode) msParseStart = new Date().getTime();
            
            this.currentLine = this.lines[this.currentLineNo()-1];
            var tmpPtr = this.ptr;
 
			descr = this.parseNextPart();
            dbgOn(!descr);
            
            if (this.ptr <= tmpPtr)
				this.couldNotGoForward(descr);

            if (this.debugMode) {
                var msNow = new Date().getTime();
                var duration = msNow-msParseStart;
                console.log(Strings.format('Parsed line %s to %s (%s:%s) after %ss (%sms)%s',
                    this.findLineNo(this.lines, descr.startIndex),
                    this.findLineNo(this.lines, descr.stopIndex),
                    descr.type, descr.name,
                    (msNow-msStart)/1000, duration, (duration > 100 ? '!!!!!!!!!!' : '')));
            }
            descr = null;
        }

        if (this.specialDescr && this.specialDescr.length > 0 &&  (!this.specialDescr.last().subElements().last().isError || !this.changeList.last().isError))
            console.warn('Couldn\'t find end of ' + this.specialDescr.last().type);
            //throw dbgOn(new Error('Couldn\'t find end of ' + specialDescr.last().type));
        
        console.log('Finished parsing in ' + (new Date().getTime()-msStart)/1000 + ' s');
        // console.log('Overhead:................................' + this.overheadTime/1000 + 's');
 
        return this.changeList;
    },
parseNonFile: function(source) {
	var result = this.parseSource(source).first();
	this.doForAllDescriptors(result, function(d) { d._fallbackSrc = source });
	return result;
},


	couldNotGoForward: function(descr, specialDescr) {
		//dbgOn(true);
		console.warn('Could not go forward before line ' + this.findLineNo(this.lines, this.ptr));
		var	errorDescr = new ide.ParseErrorFileFragment(this.src, null, 'errorDef', this.ptr, this.src.length-1, this.fileName),
			lastAdded = this.changeList.last(),
			responsible = lastAdded.flattened().detect(function(ea) { return ea.subElements(1) && ea.subElements(1).include(descr) });
		if (responsible) {
		  responsible._subElements.pop();
		  responsible._subElements.push(errorDescr);
		} else if (lastAdded === descr) {
		  responsible = this.changeList;
		  responsible.pop();
		  responsible.push(errorDescr);
		} else {
		  console.warn('Couldn\'t find last added descriptor');
		}
		this.ptr = errorDescr.stopIndex + 1;
	},

	/* line finders */
	currentLineNo: function() {
        return this.findLineNo(this.lines, this.ptr);
    },
    
    findLineNo: function(lines, ptr) {
         // var ms = new Date().getTime();
        // what a mess, i want ordinary non local returns!
        ptr += 1;
        try {
        lines.inject(0, function(charsUntilNow, line, i) {
            charsUntilNow += line.length + 1;
            if (ptr <= charsUntilNow) throw {_theLineNo: i+1};
            return charsUntilNow;
        });
        } catch(e) {
            // this.overheadTime += new Date().getTime() - ms;
            
            if (e._theLineNo !== undefined) return e._theLineNo;
            throw e
        }
        
        // this.overheadTime += new Date().getTime() - ms;
        
        return null
    },
    
    ptrOfLine: function(lines, lineNo) {
        lineNo = lineNo - 1; // zero index
        var ptr = 0;
        try {
            lines.inject(0, function(charsUntilNow, line, i) {
            if (lineNo === i) throw {_ptr: charsUntilNow};
            charsUntilNow += line.length + 1;            
            return charsUntilNow;
        });
        } catch(e) {
            if (e._ptr !== undefined) return e._ptr;
            throw e
        }
        return null
    },

	/* descriptor modification */
	doForAllDescriptors: function(descr, action) {
        action.call(this, descr);
        if (!descr.subElements()) return;
        descr.subElements().forEach(function(ea) { this.doForAllDescriptors(ea, action) }, this);
    },
    
    fixIndicesAndMore: function(descr, startPos) {
        // var ms = new Date().getTime();
        // ----------
        this.doForAllDescriptors(descr, function(d) {
            d.startIndex += startPos;
            d.stopIndex += startPos;
            d.fileName = this.fileName;
			d.subElements().forEach(function(sub) { sub._owner = d });
			if (d.categories) // FIXME!!!
				d.categories.forEach(function(categoryDescr) {
					categoryDescr.startIndex += startPos;
					categoryDescr.stopIndex += startPos;
					categoryDescr.fileName = d.fileName
				})
        });
        // ----------------
        // this.overheadTime += new Date().getTime() - ms;
    },

	 /* loading */
    sourceFromUrl: function(url) {
		var scrCtrl = lively.ide.startSourceControl();
        return scrCtrl.getCachedText(url.filename());        
    },
    
    //FIXME cleanup
    parseFileFromUrl: function(url) {
        var src = this.sourceFromUrl(url);
        var result = this.parseSource(src);
        
        var flattened = [];
        result.forEach(function(ea) {
            this.doForAllDescriptors(ea, function(d) { flattened.push(d) });
        }, this);
        
        flattened.forEach(function(ea) {
            ea.fileName = url.filename();
        });
        
        return flattened;
    },

});

CodeParser.subclass('JsParser', {
    
    debugMode: false,

    ometaRules: [/*'blankLine',*/ 'comment',
               'klassDef', 'objectDef', 'klassExtensionDef', 'copDef', 'propertyDef',
               'functionDef', 'unknown'],
    
    parseClass: function() {
        return this.callOMeta("klassDef");
    },
    
    parseModuleBegin: function() {
        var match = this.currentLine.match(/^\s*module\([\'\"](.*)[\'\"]\)\.requires\(.*toRun\(.*$/);
        if (!match) return null;
		if (this.debugMode)
			console.log('Found module start in line ' +  this.currentLineNo());
        var descr = new ide.FileFragment(match[1], 'moduleDef', this.ptr, null, this.fileName);
        this.ptr += match[0].length + 1;
        return descr;
    },
    
    parseUsingBegin: function() {
        var match = this.currentLine.match(/^\s*using\((.*)\)\.run\(.*$/);
        if (!match) return null;
		if (this.debugMode)
			console.log('Found using start in line ' +  this.currentLineNo());
        var descr = new ide.FileFragment(match[1], 'usingDef', this.ptr, null, this.fileName);
        this.ptr += match[0].length + 1;
        return descr;
    },
    
    parseModuleOrUsingEnd: function(specialDescr) {
        if (!specialDescr) return null;
        var match = this.currentLine.match(/^\s*\}.*?\)[\;]?.*$/);
        if (!match) return null;
		if (this.debugMode) {
			if (specialDescr.type === 'moduleDef')
				console.log('Found module end in line ' +  this.currentLineNo());
			if (specialDescr.type === 'usingDef')
				console.log('Found using end in line ' +  this.currentLineNo());
		}
        specialDescr.stopIndex = this.ptr + match[0].length - 1;
        this.ptr = specialDescr.stopIndex + 1;
        // FIXME hack
        if (this.src[this.ptr] == '\n') {
            specialDescr.stopIndex += 1;
            this.ptr += 1;
        }
        return specialDescr;
    },

    giveHint: function() {
        if (/^[\s]*([\w\.]+)\.subclass\([\'\"]([\w\.]+)[\'\"]/.test(this.currentLine))
            return 'klassDef';
        // if (/^[\s]*([\w]+)\:[\s]+function/.test(this.currentLine))
        //     return 'protoDef';
        // if (/^[\s]*([\w]+)\:/.test(this.currentLine))
        //     return 'protoDef';
        // if (/^[\s]*function[\s]+([\w]+)[\s]*\(.*\)[\s]*\{.*/.test(this.currentLine)
        //         || /^[\s]*var[\s]+([\w]+)[\s]*\=[\s]*function\(.*\)[\s]*\{.*/.test(this.currentLine))
        //             return 'functionDef';
        if (/^[\s]*Object\.extend.*$/.test(this.currentLine) || /^.*\.addMethods\(.*$/.test(this.currentLine))
                return 'klassExtensionDef';
        // if (/^[\s]*\(function.*/.test(this.currentLine))
        //         return 'funcitonDef';
        return null;
    },

	parseNextPart: function() {
		var descr;
		if (!this.specialDescriptors) this.specialDescriptors = [];
		
		if (descr = this.parseUsingBegin() || this.parseModuleBegin()) { // FIXME nested module/using
			if (this.specialDescriptors.length > 0) this.specialDescriptors.last().subElements().push(descr);
			else this.changeList.push(descr);
			this.specialDescriptors.push(descr)
			return descr;
		};

		if (descr = this.parseModuleOrUsingEnd(this.specialDescriptors.last())) {
		    this.specialDescriptors.pop();
			return descr;
		};

		if (descr = this.parseWithOMeta(this.giveHint())) {
			if (this.specialDescriptors.length > 0) this.specialDescriptors.last().subElements().push(descr);
			else this.changeList.push(descr);
			return descr;
		}
		
		throw new Error('Could not parse ' + this.currentLine + ' ...');
	}
	
});
 
Object.extend(JsParser, {

    parseAndShowFileFromURL: function(url) {
        var chgList = new JsParser().parseFileFromUrl(new URL(url));
        new ChangeList(fileName, null, chgList).openIn(WorldMorph.current()); 
    }
    
});

CodeParser.subclass('OMetaParser', {

	debugMode: true,

	ometaRules: ['ometaDef', 'unknown'],

	parseNextPart: function() {
		var descr = this.parseWithOMeta(this.giveHint());
		if (descr)
			return this.changeList.push(descr);
		throw new Error('Could not parse ' + this.currentLine + ' ...');
	}
	
	
});

Object.subclass('lively.ide.ModuleWrapper', {

	documentation: 'Compatibility layer around normal modules for SourceCodeDatabase and other tools. Will probably merged with normal modules in the future.',
	forceUncached: true,
	
	initialize: function(moduleName, type) {
		if (!moduleName || !type)
			throw new Error('Cannot create ModuleWrapper without moduleName or type!');
		if (!['js', 'ometa', 'lkml', 'st'].include(type))
			throw new Error('Unknown type ' + type + ' for ModuleWrapper ' + moduleName);
		this._moduleName = moduleName;
		this._type = type; // can be js, ometa, lkml, st
		this._ast = null;
		this._cachedSource = null;
	},
	
	type: function() { return this._type },
	
	ast: function() { return this._ast },
	
	moduleName: function() { return this._moduleName },
	
	fileURL: function() {
		return URL.codeBase.withFilename(this.fileName());
	},
	
	fileName: function() {
		return this.moduleName().replace(/\./g, '/') + '.' + this.type();
	},
	
	getSourceUncached: function() {
		var webR = new WebResource(this.fileURL());
		if (this.forceUncached) webR.forceUncached();
		this._cachedSource = webR.getContent() || '';
		return this._cachedSource;
	},
	
	setCachedSource: function(source) { this._cachedSource = source },
	
	getSource: function() {
		return this._cachedSource ? this._cachedSource : this.getSourceUncached();
	},
	
	setSource: function(source, beSync) {
		this.setCachedSource(source);
		new WebResource(this.fileURL()).setContent(source);
	},
	
	retrieveSourceAndParse: function(optSourceDB) {
		return this._ast = this.parse(this.getSource(), optSourceDB);
	},
	
	parse: function(source, optSourceDB) {
		if (source === undefined)
			throw dbgOn(new Error('ModuleWrapper ' + this.moduleName() + ' needs source to parse!'));
		var root;
		if (this.type() == 'js') {
			root = this.parseJs(source);
		} else if (this.type() == 'ometa') {
			root = this.parseOmeta(source);
		} else if (this.type() == 'lkml') {
			root = this.parseLkml(source);
		} else if (this.type() == 'st') {
			root = this.parseSt(source);
		} else { 
			throw dbgOn(new Error('Don\'t know how to parse ' + this.type + ' of ' + this.moduleName()))
		}
		root.flattened().forEach(function(ea) { ea.sourceControl = optSourceDB })
		return root;
	},

	parseJs: function(source) {
		var fileFragments = new JsParser().parseSource(source, {fileName: this.fileName()});
        var root;
        var firstRealFragment = fileFragments.detect(function(ea) { return ea.type !== 'comment' });
        if (firstRealFragment && firstRealFragment.type === 'moduleDef')
            root = firstRealFragment;
        else
            root = new lively.ide.FileFragment(
				this.fileName(), 'completeFileDef', 0, source ? source.length-1 : 0,
				this.fileName(), fileFragments, this);
        return root;
	},

	parseOmeta: function(source) {
		var fileFragments = new OMetaParser().parseSource(source, {fileName: this.fileName()});
		var root = new lively.ide.FileFragment(
			this.fileName(), 'ometaGrammar', 0, source.length-1, this.fileName(), fileFragments, this);
		return root;
	},

	parseLkml: function(source) {
		return ChangeSet.fromFile(this.fileName(), source);
	},
	
	parseSt: function(source) {
		if (!Global['SmalltalkParser']) return null;
		var ast = OMetaSupport.matchAllWithGrammar(SmalltalkParser, "smalltalkClasses", source, true);
		if (!ast) {
		  console.warn('Couldn\'t parse ' + this.fileName());
		  return null;
		}
		ast.setFileName(this.fileName());
		return ast;
	},
	
	remove: function() {
		new WebResource(this.fileURL()).del();
	},
	
});

Object.extend(lively.ide.ModuleWrapper, {
	
	forFile: function(fn) {
		var type = fn.substring(fn.lastIndexOf('.') + 1, fn.length);
		var moduleName = fn;
		moduleName = moduleName.substring(0, moduleName.lastIndexOf('.'));
		moduleName = moduleName.replace(/\//g, '.');
		return new lively.ide.ModuleWrapper(moduleName, type);
	},
	
});
// ===========================================================================
// Keeps track of parsed sources
// ===========================================================================
SourceDatabase.subclass('AnotherSourceDatabase', {
    
	initialize: function($super) {
		this.editHistory = {};
		this.modules = {};
		this.registeredBrowsers = [];
	},

	ensureRealModuleName: function(moduleName) { // for migration to new module names
		if (moduleName.endsWith('.js'))
			throw dbgOn(new Error('Old module name usage: ' + moduleName));
	},

	rootFragmentForModule: function(fileName) {
		if (!Object.isString(fileName))
			throw dbgOn(new Error('Don\'t know what to do with ' + fileName));
		var moduleWrapper = this.findModuleWrapperForFileName(fileName);
		var root = moduleWrapper && moduleWrapper.ast();
		// if (!root)
		// 	throw dbgOn(new Error('Cannot find parsed source for ' + fileName));
		return root;
	},

	allModules: function() {
		return Object.values(this.modules)
			.select(function(ea) { return ea instanceof lively.ide.ModuleWrapper });
	},
	
	findModuleWrapperForFileName: function(fileName) {
		return this.allModules().detect(function(ea) { return ea.fileName() == fileName })
	},
	
	createModuleWrapperForFileName: function(fileName) {
		return lively.ide.ModuleWrapper.forFile(fileName);
	},
	
	addModule: function(fileName, source) {
		var moduleWrapper = this.findModuleWrapperForFileName(fileName);
		if (moduleWrapper) return moduleWrapper;
		var moduleWrapper = this.createModuleWrapperForFileName(fileName);
		if (source) moduleWrapper.setCachedSource(source);
		moduleWrapper.retrieveSourceAndParse(this);
		return this.modules[fileName] = moduleWrapper;
	},

	reparseModule: function(fileName, readAgain) {
		if (readAgain)
			delete this.modules[fileName];
		var moduleWrapper = this.findModuleWrapperForFileName(fileName)
		if (moduleWrapper) {
			moduleWrapper.retrieveSourceAndParse(this);
			return moduleWrapper;
		}
		return this.addModule(fileName);
	},

	parseCompleteFile: function(fileName, newFileString) {
		var moduleWrapper = this.findModuleWrapperForFileName(fileName)
		if (!moduleWrapper)
			throw dbgOn(new Error('Cannot parse for ' + fileName + ' because module is not in SourceControl'));
		var root = newFileString ?
			moduleWrapper.parse(newFileString, this) :
			moduleWrapper.retrieveSourceAndParse(this);
		return root;
	},
	
	putSourceCodeFor: function(fileFragment, newFileString) {
		this.putSourceCodeForFile(fileFragment.fileName, newFileString);
	},

	putSourceCodeForFile: function(fileName, content) {
		if (!fileName)
			throw dbgOn(new Error('No filename when tryinh to put source'));
		var moduleWrapper = this.findModuleWrapperForFileName(fileName) || this.createModuleWrapperForFileName(fileName);
		content = content.replace(/\r/gi, '\n');  // change all CRs to LFs
		console.log("Saving " + fileName + "...");
		moduleWrapper.setSource(content);
		console.log("... " + content.length + " bytes saved.");
	},
    
    getCachedText: function(fileName) { // Return full text of the named file
		var moduleWrapper = this.findModuleWrapperForFileName(fileName);
		if (!moduleWrapper)
			// throw dbgOn(new Error('Cannot retrieve source code for ' + fileName + ' because module is not in SourceControl'));
			return '';
		return moduleWrapper.getSource();
    },

	searchFor: function(str) {
		// search modules
		var roots = Object.values(lively.ide.SourceControl.modules).collect(function(ea) { return ea.ast() });
		var allFragments = roots.inject([], function(all, ea) { return all.concat(ea.flattened().uniq()) });

		// search local code	
		allFragments = allFragments.concat(ChangeSet.current().flattened());

		return allFragments.select(function(ea) {
			return ea.getSourceCodeWithoutSubElements().include(str)
		});

	},

	scanLKFiles: function($super, beSync) {
		var ms = new Date().getTime();
		this.interestingLKFileNames(URL.codeBase.withFilename('lively/')).each(function(fileName) {
			this.addModule(fileName, fileString);
		}, this);
		console.log('Altogether: ' + (new Date().getTime()-ms)/1000 + ' s');
	},
    
	allFiles: function() {
		if (!this._allFiles)
			this._allFiles = this.interestingLKFileNames(this.codeBaseURL).uniq();
		return this._allFiles;
	},

	// browser stuff
	registerBrowser: function(browser) {
		if (this.registeredBrowsers.include(browser)) return;
		this.registeredBrowsers.push(browser);
	},
	
	unregisterBrowser: function(browser) {
		this.registeredBrowsers = this.registeredBrowsers.without(browser);
	},
	
	updateBrowsers: function(changedBrowser, changedNode) {
		var msStart = new Date().getTime();
		this.registeredBrowsers.without(changedBrowser).forEach(function(ea) { ea.allChanged(true, changedNode) });
		console.log('updated ' + this.registeredBrowsers.length + ' browsers in ' + (new Date().getTime()-msStart)/1000 + 's')
	},
	
	update: function() {
		this._allFiles = null;
	},
	
	addFile: function(filename) {
		this._allFiles.push(filename);
	},
	
	removeFile: function(fileName) {
		var moduleWrapper = this.findModuleWrapperForFileName(fileName);
		if (!moduleWrapper) {
			console.log('Trying to remove ' + fileName + ' bot no module found?');
			return;
		}
		moduleWrapper.remove();
	},

	switchCodeBase: function(newCodeBaseURL) {
		this.codeBaseURL = new URL(newCodeBaseURL.withRelativePartsResolved());
		this._allFiles = new WebResource(newCodeBaseURL).getSubElements().subDocuments.collect(function(ea) { return ea.getName() });
	},
	
	prepareForMockModule: function(fileName, src) { // This is just used for testing!!!
		this.modules[fileName] = lively.ide.ModuleWrapper.forFile(fileName);
		this.modules[fileName].setCachedSource(src);
		this.putSourceCodeFor = function(fileFragment, newFileString) {
			this.modules[fileName].setCachedSource(newFileString)
		}.bind(this);
		var root = this.reparseModule(fileName).ast();
		root.flattened().forEach(function(ea) { ea.sourceControl = this }, this);
		return root
	},
});

AnotherSourceDatabase.addMethods({

	createSymbolList: function() {
		// is a list of names of classes, proto and static methods, objects, and functions defined
		// in all currently loaded namespaces
		
		var allClasses = Global.classes(true)
		allClasses.length
		var allClassNames = allClasses.collect(function(klass) { return klass.name /*local name*/ })

		var namespaces = [Global].concat(Global.subNamespaces(true))
		var namespaceNames = namespaces.pluck('namespaceIdentifier')

		// both proto and static
		var allMethodNames = allClasses
			.collect(function(klass) { return klass.localFunctionNames().concat(Functions.own(klass)) })
			.flatten()

		var functionAndObjectNames = namespaces
			.collect(function(ns) {
				var propNames = [];
				for (var name in ns) {
					var value = ns[name];
					if (!value || Class.isClass(value) || value.namespaceIdentifier) continue;
					propNames.push(name)
				}
				return propNames })
			.flatten();

		var symbolList = allClassNames.concat(namespaceNames).concat(allMethodNames).concat(functionAndObjectNames);

		return symbolList;
	},

});
 
Object.extend(lively.ide, {
	// see also lively.Tools.startSourceControl
	startSourceControl: function() {
	    if (lively.ide.SourceControl instanceof AnotherSourceDatabase)
			return lively.ide.SourceControl;
	    lively.ide.SourceControl = new AnotherSourceDatabase();
		return lively.ide.SourceControl;
	},
});

// ===========================================================================
// FileFragments, another SourceCodeDescriptor
// ===========================================================================
Object.subclass('lively.ide.FileFragment', 
'default', {

	initialize: function(name, type, startIndex, stopIndex, fileName, subElems, srcCtrl) {
		this.name = name;
		this.type = type;
		this.startIndex = startIndex;
		this.stopIndex = stopIndex;
		this.fileName = fileName;
		this._subElements = subElems || [];
		this.sourceControl = srcCtrl;
	},

	eq: function(other) {
		if (this == other) return true;
		if (this.constructor != other.constructor) return false;
		return this.name == other.name &&
			// this.startIndex == other.startIndex &&
			// this.stopIndex == other.stopIndex &&
			this.type == other.type &&
			this.fileName == other.fileName &&
			this.getSourceCode() == other.getSourceCode();
	},

	subElements: function(depth) {
		if (!depth || depth === 1)
			return this._subElements; 
		return this._subElements.inject(this._subElements, function(all, ea) { return all.concat(ea.subElements(depth-1)) });
	},

	fragmentsOfOwnFile: function() {
		return this.getSourceControl().rootFragmentForModule(this.fileName)
			.flattened()
			.reject(function(ea) { return ea.eq(this) }, this);
	},

	findOwnerFragment: function() {
		// if (this._owner) return this._owner;
		if (!this.fileName) throw dbgOn(new Error('no fileName for fragment ' + this));
		var self = this;

		var moduleWrapper = this.getSourceControl().findModuleWrapperForFileName(this.fileName)
		if (!moduleWrapper)
			throw new Error('SourceControl doesn\'t have my module: ' + this.fileName)
			
		return moduleWrapper.ast().flattened().detect(function(ea) {
			return ea.subElements().any(function(subElem) { return self.eq(subElem) });
		});
	},

	flattened: function() {
		return this.subElements().inject([this], function(all, ea) { return all.concat(ea.flattened()) });
	},

	checkConsistency: function() {
		this.fragmentsOfOwnFile().forEach(function(ea) { // Just a quick check if fragments are ok...
			if (this.flattened().any(function(ea) {return ea.eq(this)}, this)) return;
			if ((this.startIndex < ea.startIndex && ea.startIndex < this.stopIndex)
				|| (this.startIndex < ea.stopIndex && ea.stopIndex < this.stopIndex))
			throw new Error('Malformed fragment: ' + ea.name + ' ' + ea.type);
		}, this);
	},

	getSourceCode: function() {
		return this.getFileString().substring(this.startIndex, this.stopIndex+1);
	},

	getSourceCodeWithoutSubElements: function() {
		var completeSrc = this.getSourceCode();
		return this.subElements().inject(completeSrc, function(src, ea) {
			var elemSrc = ea.getSourceCode();
			var start = src.indexOf(elemSrc);
			var end = elemSrc.length-1 + start;
			return src.substring(0,start) + src.substring(end+1);
		});
	},

	putSourceCode: function(newString) {
		if (!this.fileName) throw dbgOn(new Error('No filename for descriptor ' + this.name));

		var newMe = this.reparseAndCheck(newString);
		if (!newMe) return null;

		var newFileString = this.buildNewFileString(newString);
		this.getSourceControl().putSourceCodeFor(this, newFileString);

		this.updateIndices(newString, newMe);
		return newMe;
	},

	buildNewFileString: function(newString) {
		var fileString = this.getFileString();
		var beforeString = fileString.substring(0, this.startIndex);
		var afterString = fileString.substring(this.stopIndex+1);
		var newFileString = beforeString.concat(newString, afterString);
		return newFileString;
	},

	reparse: function(newSource) {
		var newFileString = this.buildNewFileString(newSource);
		newFileString = newFileString.slice(0,this.startIndex + newSource.length)

		if (this.type === 'moduleDef' || this.type === 'completeFileDef' || this.type === 'ometaGrammar')
			return this.sourceControl.parseCompleteFile(this.fileName, newFileString);

		// FIXME time to cleanup!!!
		var parser = (this.type === 'ometaDef' || this.type === 'ometaRuleDef') ?
		new OMetaParser() :
		new JsParser();

		parser.ptr = this.startIndex;
		parser.src = newFileString;
		parser.lines = newFileString.split(/[\n\r]/);
		parser.fileName = this.fileName;

		var newFragment = parser.parseWithOMeta(this.type);
		if (newFragment)
			newFragment.flattened().forEach(function(ea) { ea.sourceControl = this.sourceControl }, this);
		return newFragment;
	},

	reparseAndCheck: function(newString) {
		var newMe = this.reparse(newString);

		if (!newMe) dbgOn(true);

		if (newMe && this.startIndex !== newMe.startIndex)
			throw dbgOn(new Error("Inconsistency when reparsing fragment " + this.name + ' ' + this.type));
		if (newMe && (this.type == 'completeFileDef' || this.type == 'moduleDef')
			&& (newMe.type == 'completeFileDef' || newMe.type == 'moduleDef')) {
				this.type = newMe.type; // Exception to the not-change-type-rule -- better impl via subclassing
		}
		if (!newMe || newMe.type !== this.type) {
			newMe.flattened().forEach(function(ea) { ea.sourceControl = this.sourceControl }, this);
			var msg = Strings.format('Error occured during parsing.\n%s (%s) was parsed as %s. End line: %s.\nChanges are NOT saved.\nRemove the error and try again.',
			this.name, this.type, newMe.type, newMe.stopLine());
			console.warn(msg);
			WorldMorph.current().alert(msg);
			return null;
		}

		if (this.type === 'klassDef') { // oh boy, that gets ugly... subclassing, really!
			this.categories = newMe.categories;
		}

		return newMe;
	},


	updateIndices: function(newSource, newMe) {
		this.checkConsistency();

		var prevStop = this.stopIndex;
		var newStop = newMe.stopIndex;
		var delta = newStop - prevStop;

		this.stopIndex = newStop;    // self

		// update fragments which follow after this or where this is a part of
		this.fragmentsOfOwnFile().each(function(ea) {
			if (ea.stopIndex < prevStop) return;
			ea.stopIndex += delta;
			if (ea.startIndex <= prevStop) return;
			ea.startIndex += delta;
		});

		this.name = newMe.name; // for renaming
		this._subElements = newMe.subElements();
	},

	getSourceControl: function() {
		var ctrl = this.sourceControl || lively.ide.startSourceControl();
		if (!ctrl) throw dbgOn(new Error('No sourcecontrol !! '));
		if (!(ctrl instanceof AnotherSourceDatabase)) throw dbgOn(new Error('Using old source control, could lead to errors...'));
		return ctrl;
	},

	sourceCodeWithout: function(childFrag) {
		if (!this.flattened().any(function(ea) {return ea.eq(childFrag)}))
			throw dbgOn(new Error('Fragment' + childFrag + ' isn\'t in my (' + this + ') subelements!'));
		var mySource = this.getSourceCode();
		var childSource = childFrag.getSourceCode();
		var start = childFrag.startIndex - this.startIndex;
		if (start === -1) throw dbgOn(new Error('Cannot find source of ' + childFrag));
		var end = start + childSource.length;
		var newSource = mySource.slice(0, start) + mySource.slice(end);
		return newSource;
	},

	remove: function() {
		var owner = this.findOwnerFragment();
		if (!owner) throw dbgOn(new Error('Cannot find owner of fragment ' + this));
		var newSource = owner.sourceCodeWithout(this);
		owner._subElements = owner.subElements().reject(function(ea) {return ea.eq(this)}, this)
		owner.putSourceCode(newSource);
	},
	
	moveTo: function(index) {
		console.log('Moving from ' + this.startIndex + ' to ' + index)
		var mySrc = this.getSourceCode();
		var myOwner = this.findOwnerFragment();
		step1 = myOwner.sourceCodeWithout(this);
		myOwner = myOwner.putSourceCode(step1);
		//-------
		if (index > this.startIndex)
			index -= mySrc.length;
		this.startIndex = index; this.stopIndex = index + mySrc.length - 1;
		//-------
		var target = myOwner.fragmentsOfOwnFile().detect(function(ea) {
			return ea.startIndex <= index && ea.stopIndex >= index });
		var targetSrc = target.getSourceCode();
		var local = index - target.startIndex;
		step2 = targetSrc.slice(0,local) + mySrc + targetSrc.slice(local, targetSrc.length);
		target.putSourceCode(step2);
		return this;
	},

	getFileString: function() {
		if (!this.fileName && this._fallbackSrc)
			return this._fallbackSrc;
		if (!this.fileName) throw dbgOn(new Error('No filename for descriptor ' + this.name));
		return  this.getSourceControl().getCachedText(this.fileName);
	},

	newChangeList: function() {
		throw dbgOn(new Error('Not yet!'));
	},

	startLine: function() {
		// FIXME!!!
		return JsParser.prototype.findLineNo(this.getFileString().split(/[\n\r]/), this.startIndex);
	},

	stopLine: function() {
		// FIXME!!!
		return JsParser.prototype.findLineNo(this.getFileString().split(/[\n\r]/), this.stopIndex);
	},
	
	isStatic: function() { // makes only sense for propertyDefs
		return this._isStatic; // FIXME
	},

	toString: function() {
		if (this.fileName)
			return Strings.format('%s: %s (%s-%s in %s, starting at line %s, %s subElements)',
				this.type, this.name, this.startIndex, this.stopIndex, this.fileName, this.startLine(), this.subElements().length);
		return Strings.format('%s: %s (%s-%s in NO FILENAME FOUND, %s subElements)',
				this.type, this.name, this.startIndex, this.stopIndex, this.subElements().length);
	},

	inspect: function() {
		try { return this.toString() } catch (err) { return "#<inspect error: " + err + ">" }
	},

	prevElement: function() {
		var siblingsAndMe = this.withSiblings();
		if (!siblingsAndMe) return null;
		var idx = siblingsAndMe.indexOf(this);
		return siblingsAndMe[idx - 1];
	},
	withSiblings: function() {
		var owner = this.findOwnerFragment();
		if (!owner) return null;
		return owner.subElements();
	},
	getComment: function() {
		var prev = this.prevElement();
		if (!prev || prev.type != 'comment') return null;
		var src = prev.getSourceCode();
		// if there multiple comments take the last one
		src = src.split(/\n[\n]+/).last();
		return src;
	},

},
'browser support', {

	browseIt: function() {
		var browser = new ide.SystemBrowser();
		browser.openIn(WorldMorph.current());

		// set the correct path
		var m = this.fileName.match(/(.*\/)(.+)/)
		var pathName = m[1];	
		browser.setTargetURL(URL.codeBase.withFilename(pathName))

		this.basicBrowseIt(browser);
		return browser;
	},
	basicBrowseIt: function(browser) {
		// FIXME ... subclassing

		var logicalPath = [];
		var ff = this;
		while (ff) {
			logicalPath.unshift(ff);
			if (ff.category)
				logicalPath.unshift(ff.findOwnerFragment() /*for all method category node*/);
			ff = ff.findOwnerFragment()
		}

		logicalPath.forEach(function(ea) {
			debugger
			browser.selectNodeMatching(function(node) { return node.target == ea })
		});

},


	addSibling: function(newSrc) {
		if (!this.getSourceCode().endsWith('\n'))
			newSrc = '\n' + newSrc;
		if (!newSrc.endsWith('\n'))
			newSrc += '\n';
		var owner = this.findOwnerFragment();
		var ownerSrc = owner.getSourceCode();
		var stopIndexInOwner = this.stopIndex - owner.startIndex;
		var newOwnerSrc = ownerSrc.slice(0, stopIndexInOwner+1) + newSrc + ownerSrc.slice(stopIndexInOwner+1);
		var newOwner = owner.putSourceCode(newOwnerSrc);
		var sibling = newOwner.subElements().detect(function(ea) { return ea.startIndex > this.stopIndex }, this);
		return sibling;
	},
},
'change compatibility', {

	getName: function() {
		return this.name;
	},

	asChange: function() {
		// FIXMEEEEE!!! subclassing! Unified hierarchy
		var change;
		console.log(Strings.format('Converting %s (%s) to change', this.type, this.getSourceCode()));
		if (this.type === 'klassDef') {
			change = ClassChange.create(this.getName(), this.superclassName);
			this.subElements().forEach(function(ea) { change.addSubElement(ea.asChange()) });
		} else if (this.type === 'propertyDef' && !this.isStatic()) {
			var src = this.getSourceCode().match(/[a-zA-Z0-9]+:\s+((\s|.)*)/)[1];
			if (src.endsWith(','))
				src = src.substr(0,src.length-1);
			change = ProtoChange.create(this.getName(), src, this.className);
		}
		if (change) return change;
		throw dbgOn(new Error(this.type + ' is not yet supported to be converted to a Change'));
	},

	saveAsChange: function(newSrc) { // similar to putSourceCode but creates change instead of modifying src
		var newMe = this.reparseAndCheck(newSrc);
		if (!newMe) return null;
		return newMe.asChange();
	},

});



ide.FileFragment.subclass('lively.ide.ParseErrorFileFragment', {

	isError: true,

	initialize: function($super, fileString, name, type, startI, stopI, fileName, subElems, srcCtrl) {
		$super(name, type, startI, stopI, fileName, subElems, srcCtrl);
		this.fileString = fileString;
    },

	getFileString: function() {
        return this.fileString
    },
});
Widget.subclass('lively.ide.FileVersionViewer',
'settings', {
	
	viewTitle: "Version Viewer",
    initialViewExtent: pt(450, 250),

},
'initializing', {

	buildView: function(extent) {
		var panel = PanelMorph.makePanedPanel(extent, [
			['urlPane', newTextPane, new Rectangle(0, 0, 1, 0.1)],
			['versionList', newRealListPane, new Rectangle(0, 0.1, 1, 0.8)],
			['revertButton', newButton, new Rectangle(0, 0.9, 0.33, 0.1)],
			['openButton', newButton, new Rectangle(0.33, 0.9, 0.33, 0.1)],
			['visitButton', newButton, new Rectangle(0.66, 0.9, 0.34, 0.1)],
		]);

		var m;

		m = panel.urlPane.innerMorph();
		m.beInputLine();
		m.noEval = true;
		m.plugTo(this, {savedTextString: '->setTarget'});

		m = panel.revertButton;
		m.setLabel('revert');
		m.plugTo(this, {fire: '->revert'});

		m = panel.openButton;
		m.setLabel('show');
		m.plugTo(this, {fire: '->showVersion'});

		m = panel.visitButton;
		m.setLabel('visit');
		m.plugTo(this, {fire: '->visitVersion'});

		m= panel.versionList.innerMorph();
		m.dragEnabled = false;
		// m.connectModel(Record.newPlainInstance({List: [], Selection: null})); // FIXME
		
		this.panel = panel;
		return panel;
	},
},
'actions', {
	openForURL: function(url) {
		this.open();
		this.setTarget(url);
		return this;
	},


	setTarget: function(url) {
		try { this.url = new URL(url) } catch(e) {
			return;
		} finally {
			this.panel.urlPane.innerMorph().setTextString(this.url.toString());
		}

		var versionList = this.panel.versionList.innerMorph();
		versionList.updateList(['loading']);
		var res = new WebResource(url);
		lively.bindings.connect(res, 'versions', versionList, 'updateList',
			{converter: function(list) { return list ? list.asListItemArray() : [] }});
		res.beAsync().getVersions();
	},

	fetchSelectedVersionAndDo: function(doBlock) {
		// get the revision and create a WebResource for this.url
		// then let doBlock configure that WebResource. In the end
		// GET the version of this.url
		if (!this.url) return;
		var sel = this.panel.versionList.innerMorph().selection;
		if (!sel) return;
		var rev = sel.rev;
		var resForGet = new WebResource(this.url).beAsync();
		doBlock.call(this, resForGet);
		resForGet.get(rev);
	},
	selectedURL: function() {
		var sel = this.panel.versionList.innerMorph().selection;
		if (!sel) return null;
		var rev = sel.rev;
		versionedURL = new WebResource(this.url).createResource().createVersionURLString(rev);
		return versionedURL
	},


	showVersion: function() {
		this.fetchSelectedVersionAndDo(function(resForGet) {
			lively.bindings.connect(resForGet, 'content', WorldMorph.current(), 'addTextWindow');
		});
	},
	visitVersion: function() {
		Global.open(this.selectedURL())
	},


	revert: function() {
		this.fetchSelectedVersionAndDo(function(resForGet) {
			var resForPut = new WebResource(this.url).beAsync(); // using two to know when status of put
			lively.bindings.connect(resForGet, 'content', resForPut, 'put');
			lively.bindings.connect(resForPut, 'status', this, 'revertDone');
		});
	},
	revertDone: function (status) {
		var w = WorldMorph.current();
		if (status.code() < 400)
			w.setStatusMessage('Successfully reverted ' + this.url, Color.green, 3);
		else
			w.setStatusMessage('Could not revert ' + this.url + ': ' + status, Color.red, 5);
		this.setTarget(this.url); // update list
	},
});

});