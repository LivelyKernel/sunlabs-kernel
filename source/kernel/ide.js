module('lively.ide').requires('lively.Tools', 'lively.Ometa', 'LKFileParser.js', 'lively.Helper').toRun(function(ide, tools, ometa, help) {
    
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
Widget.subclass('lively.ide.BasicBrowser', {
 
    documentation: 'Abstract widget with three list panes and one text pane. Uses nodes to display and manipulate content.',
    initialViewExtent: pt(620, 450),
    emptyText: '-----',
    allPaneNames: ['Pane1', 'Pane2', 'Pane3'],
    filterPlaces: ['Root', 'Pane1', 'Pane2', 'Pane3'],
    formals: ["Pane1Content", "Pane1Selection", "Pane1Choicer", "Pane1Menu", "Pane1Filters",
              "Pane2Content", "Pane2Selection", "Pane2Choicer", "Pane2Menu", "Pane2Filters",
              "Pane3Content", "Pane3Selection", "Pane3Choicer", "Pane3Menu", "Pane3Filters",
              "SourceString", "StatusMessage", "RootFilters"],
    commands: function() {
        return ide.BrowserCommand.allSubclasses().collect(function(ea) { return new ea(this) }, this);
    },
    
    initialize: function($super) { 
        $super();
        // create empty onUpdate functions
        var panes = this.allPaneNames;
        panes.forEach(function(ea) {
            this['on' + ea + 'MenuUpdate'] = Functions.Null;
			this['on' + ea + 'FiltersUpdate'] = Functions.Null;
        }, this);
        this.onStatusMessageUpdate = Functions.Null;
		this.onRootFiltersUpdate = Functions.Null;
        
        //create a model and relay for connecting the additional components later on
        var model = Record.newPlainInstance((function(){
				return this.formals.inject({}, function(spec, ea){spec[ea]=null; return spec})}.bind(this))());
        var spec = {SourceString: "SourceString", StatusMessage: "StatusMessage", RootFilters: "RootFilters"};
        panes.forEach(function(ea) {
            spec[ea + 'Content'] = ea + 'Content';
            spec[ea + 'Selection'] = ea + 'Selection';
            spec[ea + 'Menu'] = ea + 'Menu';
			spec[ea + 'Filters'] = ea + 'Filters';
        });
        this.relayToModel(model, spec);
		this.filterPlaces.forEach(function(ea) {  /*identity filter*/	
			this['set' + ea + 'Filters']([new lively.ide.NodeFilter()]);
		}, this)
    },
 
    buildView: function (extent) {
 
		extent = extent || this.initialViewExtent;

        this.start();
 
        var panel = PanelMorph.makePanedPanel(extent, [
            ['Pane1', newDragnDropListPane, new Rectangle(0, 0, 0.3, 0.40)],
            ['Pane2', newDragnDropListPane, new Rectangle(0.3, 0, 0.35, 0.45)], //['Pane2', newRealListPane, new Rectangle(0.35, 0, 0.3, 0.4)],
            ['Pane3', newDragnDropListPane, new Rectangle(0.65, 0, 0.35, 0.45)],
            ['sourcePane', newTextPane, new Rectangle(0, 0.5, 1, 0.5)],
            //['statusPane', newTextPane, new Rectangle(0, 0.95, 1, 0.05)]
        ]);
 
        var model = this.getModel();
        var browser = this;
 
        function setupListPanes(paneName) {
            var morph = panel[paneName];
            morph.connectModel(model.newRelay({List:        ("-" + paneName + "Content"),
                                               Selection:   (      paneName + 'Selection'),
                                               Menu:        ("-" + paneName + "Menu")}), true);
            morph.withAllSubmorphsDo(function() {            
                this.onMouseOver = function(evt) { browser.showButtons(evt, morph, paneName) };
                this.onMouseDown = this.onMouseDown.wrap(function(proceed, evt) {
					browser.showButtons(evt, morph, paneName);
                    proceed(evt);
                });
                this.onMouseOut = function(evt) { browser.hideButtons(evt, morph, paneName) };
            })
        }
 
        ['Pane1', 'Pane2', 'Pane3'].each(function(ea) { setupListPanes(ea) });
 
        panel.sourcePane.innerMorph().maxSafeSize = 2e6;
        panel.sourcePane.connectModel(model.newRelay({Text: "SourceString"}));
 
		//panel.statusPane.connectModel(model.newRelay({Text: "-StatusMessage"}));
		this.buildCommandButtons(panel);
 
	    this.panel = panel;
        return panel;
    },

	buildCommandButtons: function(morph) {
		var cmds = this.commands().select(function(ea) { return ea.wantsButton() });
		if (cmds.length === 0) return;

        var height = 20;
        var width = morph.getExtent().x / cmds.length
        var y = morph.getExtent().y * 0.5 - height;

        var btns = cmds.forEach(function(cmd, i) {
            var btn = new ButtonMorph(new Rectangle(i*width, y, width, height));
			btn.setLabel(cmd.asString());
			var btnModel = {action: function(val) { if (!val) cmd.trigger(); btn.setLabel(cmd.asString()); }};
			btn.connectModel({model: btnModel, setValue: 'action'});
			morph.addMorph(btn);
        })
	},

    showButtons: function(evt, morph, paneName) {
        var browser = this;
        var node = browser['get' + paneName + 'Selection']();
        if (!node) return;
 
        var btnSpecs = node.buttonSpecs();
        if (btnSpecs.length === 0) return;
 
        // get or create the buttons
        var offsetX = morph.bounds().left();
        var height = 20;
        var width = (morph.getExtent().x) / btnSpecs.length
        var y = morph.bounds().bottom() /*- height*/;
 
        morph = morph.owner;
 
        var btns = range(0, btnSpecs.length-1).collect(function(i) {
            var existingBtn = morph.submorphs.detect(function(subM) { return subM.label && subM.label.textString === btnSpecs[i].label })
            return existingBtn ? existingBtn : new ButtonMorph(new Rectangle(offsetX + i*width, y, width, height));
        })
 
        // configure the buttons
        btnSpecs.each(function(ea, i) {
            var btnSetValueWrapper = {action: function(value) {
                // if (value) return
                ea.action.apply(browser['get' + paneName + 'Selection']());
                btns.without(btns[i]).each(function(ea) { ea.changeAppearanceFor(false) });
                browser['set' + paneName + 'Selection'](browser['get' + paneName + 'Selection'](), true);
            }};
            btns[i].connectModel({model: btnSetValueWrapper, setValue: 'action'});
            btns[i].toggle = true;
            btns[i].setLabel(ea.label);
            btns[i]['is' + paneName + 'BrowserButton'] = true;
            morph.addMorph(btns[i]);
        })
    },
 
    hideButtons: function(evt, morph, paneName, force) {
        if (evt && morph.shape.containsPoint(morph.localize(evt.point()))) return;
        if (!force && this['get' + paneName + 'Selection']() !== null) return;
        var btnHolder = morph.owner;
        var btns = btnHolder.submorphs.select(function(ea) { return ea['is' + paneName + 'BrowserButton'] });
        btns.each(function(ea) { ea.remove() })
        // var btns = morph.submorphs.select(function(ea) { return ea.isBrowserButton });
        // if (btns.any(function(ea) { return ea.shape.containsPoint(ea.localize(evt.point())) }))
        //     return
        // btns.each(function(ea) { ea.remove() })
    },
    
	mySourceControl: function() {
		var ctrl = lively.Tools.SourceControl;
		if (!ctrl) throw dbgOn(new Error('Browser has no SourceControl!'));
		return ctrl;
	},

    start: function() {
        this.setPane1Content(this.childsFilteredAndAsListItems(this.rootNode(), this.getRootFilters()));
		this.mySourceControl().registerBrowser(this);
    },

    rootNode: function() {
        throw dbgOn(new Error('To be implemented from subclass'));
    },
 
	selectedNode: function() {
		return this.getPane3Selection() || this.getPane2Selection() || this.getPane1Selection();
	},

	selectNode: function(node) {
		var paneName = this.paneNameOfNode(node);
		if (!paneName) return;
		this.inPaneSelectNodeNamed(paneName, node.asString());
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
    
    filterChildNodesOf: function(node, filters) {
    	return filters.inject(node.childNodes(), function(nodes, filter) {
    		return filter.apply(nodes)
    	});
    },
    
    childsFilteredAndAsListItems: function(node, filters) {
    	return 	this.filterChildNodesOf(node, filters).collect(function(ea) { return ea.asListItem() });
    },

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

    
    
	paneNameOfNode: function(node) {
    	return this.allPaneNames.detect(function(ea) { return this.nodesInPane(ea).include(node) }, this);
	},
 
 	inPaneSelectNodeNamed: function(paneName,  nodeName) {
			var nodes = this['get' + paneName + 'Content']();
			var wanted = nodes.detect(function(ea) { return ea && ea.string.include(nodeName) });
			if (!wanted) return null;
			var list = this.panel[paneName].innerMorph();
			var i = list.itemList.indexOf(wanted);
			list.selectLineAt(i, true /*should update*/);
			return wanted;
	},
	
    onPane1SelectionUpdate: function(node) {
        this.setPane2Selection(null, true);
        this.setPane2Content([this.emptyText]);
        if (!node) {
            this.hideButtons(null, this.panel.Pane1, 'Pane1')
            return
        };
		this.setPane2Content(this.childsFilteredAndAsListItems(node, this.getPane1Filters()));
       	this.setSourceString(node.sourceString());
		this.updateTitle();

        this.setPane1Menu(this.commandMenuSpec('Pane1').concat(node.menuSpec()));
		this.setPane2Menu(this.commandMenuSpec('Pane2'));
		this.setPane3Menu(this.commandMenuSpec('Pane3'));
    },
 
    onPane2SelectionUpdate: function(node) {
        this.setPane3Selection(null);
        this.setPane3Content([this.emptyText]);        
        if (!node) {
            this.hideButtons(null, this.panel.Pane2, 'Pane2')
            return
        }
        this.setPane3Content(this.childsFilteredAndAsListItems(node, this.getPane2Filters()));
        this.setSourceString(node.sourceString());
		this.updateTitle();

		this.setPane2Menu(this.commandMenuSpec('Pane2').concat(node.menuSpec()));
		this.setPane3Menu(this.commandMenuSpec('Pane3'));
    },
 
    onPane3SelectionUpdate: function(node) {
        if (!node) {
            this.hideButtons(null, this.panel.Pane3, 'Pane3')
            return
        }
        this.setSourceString(node.sourceString());
		this.updateTitle();

		this.setPane3Menu(this.commandMenuSpec('Pane3').concat(node.menuSpec()));
    },
 
    onSourceStringUpdate: function(methodString) {
        if (!methodString || methodString == this.emptyText) return;
        if (this.selectedNode().sourceString() == methodString) return;
        this.selectedNode().newSource(methodString);
        this.nodeChanged(this.selectedNode());
    },

    hasUnsavedChanges: function() {
        return this.panel.sourcePane.innerMorph().hasUnsavedChanges();
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


    
	allChanged: function(keepUnsavedChanges, changedNode) {
		// optimization: if no node looks like the changed node in my browser do nothing
		if (changedNode && this.allNodes().every(function(ea) {return !changedNode.hasSimilarTarget(ea)}))
			return;
	      // FIXME remove duplication
        var oldN1 = this.getPane1Selection();
        var oldN2 = this.getPane2Selection();
        var oldN3 = this.getPane3Selection();

		var src = keepUnsavedChanges &&
						this.hasUnsavedChanges() &&
						this.panel.sourcePane.innerMorph().textString;

		if (this.hasUnsavedChanges())
			this.setSourceString(this.emptyText);
					
		var revertStateOfPane = function(paneName, oldNode) {
			if (!oldNode) return;
			var nodes = this.nodesInPane(paneName);
			var newNode = nodes.detect(function(ea) {
			    return ea && ea.target && (ea.target == oldNode.target || (ea.target.eq && ea.target.eq(oldNode.target)))
			});
			if (!newNode)
				newNode = nodes.detect(function(ea) {return ea && ea.asString() === oldNode.asString()});
            this['set' + paneName + 'Selection'](newNode, true);
		}.bind(this);
		
		this.start(); // select rootNode and generate new subnodes

		revertStateOfPane('Pane1', oldN1);
		revertStateOfPane('Pane2', oldN2);
		revertStateOfPane('Pane3', oldN3);

		if (!src) return;
		//this.setSourceString(src);
		var text = this.panel.sourcePane.innerMorph();
		text.textString = src; text.changed()
		text.showChangeClue(); // FIXME
	},

    nodeChanged: function(node) {
        // currently update everything, this isn't really necessary
  		this.allChanged();
    },
 
	textChanged: function(node) {
		// be careful -- this can lead to overwritten source code
		this.selectNode(node);
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
		var title = '';
		if (n1) title += n1.asString();
		if (n2) title += ':' + n2.asString();
		if (n3) title += ':' + n3.asString();
		window.setTitle(title);
	},
commandMenuSpec: function(pane) {
	var result = this.commands()
		.select(function(ea) { return ea.wantsMenu() && ea.isActive(pane) })
		.inject([], function(all, ea) { return all.concat(ea.trigger()) });
	if (result.length > 0)
		result.push(['-------']);
	return result;
},
setStatusMessage: function(msg, color, delay) {
	var s = this.panel.sourcePane;	
	if (!this._statusMorph) {
		this._statusMorph = new TextMorph(pt(300,30).extentAsRectangle());
		this._statusMorph.applyStyle({borderWidth: 0})
	}
	var statusMorph = this._statusMorph;
	statusMorph.textString = msg;
	s.addMorph(statusMorph);
	statusMorph.setTextColor(color || Color.black);
	statusMorph.centerAt(s.innerBounds().center());
	(function() { statusMorph.remove() }).delay(delay || 2);
},



});
 
Object.subclass('lively.ide.BrowserNode', {
 
    documentation: 'Abstract node, defining the node interface',
 
    initialize: function(target, browser) {
        this.target = target;
        this.browser = browser;
    },
 
    siblingNodes: function() {
        if (!(this.browser instanceof ide.SystemBrowser)) throw dbgOn(new Error('No browser when tried siblingNodes'));
        return this.browser.siblingsFor(this);
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
        return '-----'
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
        if (!this.saveSource(newSource, tools.SourceControl))
            console.log('couldn\'t save');
	var msgSpec;
	try {
		var success = this.evalSource(newSource);
		msgSpec = success ?
			{msg: 'Successfully evaluated ' + this.target.getName(), color: Color.green} :
			{msg: 'Eval disabled for' + this.target.getName(), color: Color.black}
	} catch(e) {
		msgSpec = {msg: 'Error evaluating ' + this.target.getName() + ': ' + e, color: Color.red, delay: 5}
	}
	this.statusMessage(msgSpec.msg, msgSpec.color, msgSpec.delay); 
	this.browser.signalNewSource(this);
},
 
    evalSource: function(newSource) {
        return false;
    },
 
    saveSource: function(newSource, sourceControl) {
        return false;
    },
 
    buttonSpecs: function() {
        return []
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

 
});

Object.subclass('lively.ide.BrowserCommand', {

	initialize: function(browser) {
		this.browser = browser;
	},

	wantsButton: function() {
		return false;
	},
wantsMenu: function() {
		return false;
	},
isActive: function() {
		return false;
	},



	asString: function() {
		return 'unnamed command'
	},

	trigger: function() {}

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


	initialize: function(nodeClassToFilter) {
		this.nodeClass = nodeClassToFilter;
	},	

	apply: function(nodes) {
	    var k = this.nodeClass;
		if (!k){
			console.log('nodeTypeFilter has no class!!!');
			return nodes;
		}
		return nodes.select(function(ea) { return ea.constructor === k || ea instanceof lively.ide.ChangeNode });
	}
});

 
// ===========================================================================
// Browsing js files and OMeta
// ===========================================================================
ide.BasicBrowser.subclass('lively.ide.SystemBrowser', { // 123
 
    documentation: 'Browser for source code parsed from js files',
    viewTitle: "SystemBrowser",
initialize: function($super) {
	$super();
	this.installFilter(new lively.ide.NodeTypeFilter(lively.ide.ClassFragmentNode), 'Pane1');
},



 
    rootNode: function() {
        ide.startSourceControl();
        if (!this._rootNode)
            this._rootNode = new ide.SourceControlNode(tools.SourceControl, this);
            // this._rootNode = new ide.EnvironmentNode(Global, this);
        return this._rootNode;
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
 
ide.BrowserNode.subclass('lively.ide.SourceControlNode', {
    
	documentation: 'The rootNode of the SystemBrowser',

    childNodes: function() {
		// js files + OMeta files (.txt) + lkml files + ChangeSet current
		var nodes = [];
		var srcDb = this.target;
		var allFiles = srcDb.allFiles();
		for (var i = 0; i < allFiles.length; i++) {
			var fn = allFiles[i];
			if (fn.endsWith('.js')) {
				nodes.push(new ide.CompleteFileFragmentNode(srcDb.rootFragmentForModule(fn), this.browser, fn));
			} else if (fn.endsWith('.txt')) {
				nodes.push(new ide.CompleteOmetaFragmentNode(srcDb.rootFragmentForModule(fn), this.browser, fn));
			} else if (fn.endsWith('.lkml')) {
				nodes.push(new ide.ChangeSetNode(ChangeSet.fromFile(fn, srcDb.getCachedText(fn)), this.browser));
			}
		};
		nodes.push(ChangeSet.fromWorld(WorldMorph.current()).asNode(this.browser));
		return nodes;
	},
});
 
ide.BrowserNode.subclass('lively.ide.FileFragmentNode', {
    
    sourceString: function() {
        this.savedSource = this.target.getSourceCode();
		return this.savedSource;
    },
    
    asString: function() {
        var name = this.target.name || this.sourceString().truncate(22).replace('\n', '') + '(' + this.type + ')';
		if (this.showLines()) name += ' (' + this.target.startLine() + '-' + this.target.stopLine() + ')';
		return name;
    },
    
	showLines: function() {
		return this.browser.showLines;
	},

    saveSource: function(newSource, sourceControl) {
        this.target.putSourceCode(newSource);
		this.savedSource = this.target.getSourceCode(); // assume that users sees newSource after that
        return true;
    },

	menuSpec: function($super) {
	var spec = $super();
	var node = this;
		spec.push(['add sibling below', function() {
			var world = WorldMorph.current();
			world.prompt('Enter source code', function(input) {
				node.target.addSibling(input);
				node.browser.allChanged();
			});
		}]);
		spec.push(['remove', function() {
			node.target.remove();
			node.browser.allChanged() }]);
		return spec;
	},

	getSourceControl: function() {
		if (this.target.getSourceControl)
			return this.target.getSourceControl();
		return tools.SourceControl;
},
onDrop: function(other) {
	console.log(' Moving ' + this.target + ' to ' + other.target);
	if (other.handleDrop(this))
		this.target.remove();
	else
		this.target.moveTo(other.target.stopIndex+1);
	this.signalChange();
},
onDrag: function() {
    // onDrop does all the work
},



});

ide.FileFragmentNode.subclass('lively.ide.CompleteFileFragmentNode', { // should be module node
 
	maxStringLength: 10000,

    initialize: function($super, target, browser, moduleName) {
        $super(target, browser);
        this.moduleName = moduleName;
		this.showAll = false;
    },
 
    childNodes: function() {
        var browser = this.browser;
        var completeFileFragment = this.target;
        if (!completeFileFragment) return [];
		var typeToClass = function(type) {
			if (type === 'klassDef' || type === 'klassExtensionDef')
				return ide.ClassFragmentNode;
			if (type === 'functionDef')
				return ide.FunctionFragmentNode; 
			return ide.ObjectFragmentNode;
		}
		return this.target.subElements(2).collect(function(ea) {
			return new (typeToClass(ea.type))(ea, browser);
		})
    },
 
    buttonSpecs: function() {
		var pane = this.browser.paneNameOfNode(this);
		var b = this.browser;
		var f = b['get'+pane+'Filters']().detect(function(ea) { return ea.isNodeTypeFilter });
		if (!f) {

			f = new lively.ide.NodeTypeFilter(lively.ide.ClassFragmentNode);
			b.installFilter(f, pane);
			console.log('instaling filter.......');
		}
		var configFilter = function(klass) {f.nodeClass = klass}
        return [{label: 'classes', action: configFilter.curry(lively.ide.ClassFragmentNode)},
                    {label: 'functions', action: configFilter.curry(lively.ide.FunctionFragmentNode)},
                    {label: 'objects', action: configFilter.curry(lively.ide.ObjectFragmentNode)}];
    },
    
    menuSpec: function($super) {
		var menu = $super();
   		if (!this.target) return menu;
		var node = this;
		menu.unshift(['open ChangeList viewer', function() {
			new ChangeList(node.moduleName, null, node.target.flattened()).openIn(WorldMorph.current()) }]);
		menu.unshift(['reparse', function() {
    		node.getSourceControl().reparseModule(node.moduleName, true);
    		node.signalChange() }]);
		menu.unshift(['toggle showAll', function() {
    		node.showAll = !node.showAll;
    		node.signalTextChange() }]);
		return menu;
   	
            /*return [['load module', function() {
    			node.loadModule();
                node.signalChange();
            }]];*/
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
		if (!this.target) return name + ' (not loaded)';
		if (!this.showLines()) return name;
		return name + ' (' + this.target.startLine() + '-' + this.target.stopLine() + ')';
    },

	loadModule: function() {
		if (this.target) return;
		this.target = tools.SourceControl.addModule(this.moduleName);
		this.signalChange();
	}
    
});

ide.CompleteFileFragmentNode.subclass('lively.ide.CompleteOmetaFragmentNode', {
    
	buttonSpecs: function() { return [] },

	menuSpec: function($super) {
		var menu = $super();
    	var fileName = this.moduleName;
    	if (!this.target) return menu;
		menu.unshift(['Translate grammar', function() {
			WorldMorph.current().prompt(
				'File name of translated grammar?',
				function(input) {
					if (!input.endsWith('.js')) input += '.js';
					OMetaSupport.translateAndWrite(fileName, input);
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
			.collect(function(ea) { return new ide.OMetaGrammarNode(ea, browser) });
		var rest = fileDef.subElements()
			.select(function(ea) { return !fileDef.subElements().include(ea) })
			.collect(function(ea) { return new ide.ObjectFragmentNode(ea, browser) });
		return ometaNodes.concat(rest);
    },

});

ide.FileFragmentNode.subclass('lively.ide.OMetaGrammarNode', {

	childNodes: function() {
		var def = this.target;
		var browser = this.browser;
		return this.target.subElements()
			.collect(function(ea) { return new ide.OMetaRuleNode(ea, browser) });
	},

});

ide.FileFragmentNode.subclass('lively.ide.OMetaRuleNode', {});

ide.FileFragmentNode.subclass('lively.ide.ClassFragmentNode', {
 
    childNodes: function() {
        var classFragment = this.target;
        var browser = this.browser;
        return classFragment.subElements()
            .select(function(ea) { return ea.type === 'propertyDef' })
            // .sort(function(a,b) { if (!a.name || !b.name) return -999; return a.name.charCodeAt(0)-b.name.charCodeAt(0) })
            .collect(function(ea) { return new ide.ClassElemFragmentNode(ea, browser) });
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
			var list = tools.SourceControl
				.searchFor(searchName)
				.without(fragment)
			var title = 'references of' + fragment.name;
			new ChangeList(title, null, list, searchName).openIn(WorldMorph.current()) }]);
		return menu;
	} 

handleDrop: function(nodeDroppedOntoMe) {
	if (!(nodeDroppedOntoMe instanceof lively.ide.ClassElemFragmentNode))
		return false;
	console.log('Adding' + nodeDroppedOntoMe.asString() + ' to ' + this.asString());
	if (this.target.subElements().length == 0) {
		console.log('FIXME: adding nodes to empty classes!');
		return
	}
	this.target.subElements().last().addSibling(nodeDroppedOntoMe.target.getSourceCode());
	return true;
},
});
 
ide.FileFragmentNode.subclass('lively.ide.ObjectFragmentNode', {
 
    childNodes: function() {
        if (!this.target.subElements()) return [];
        // FIXME duplication with ClassFragmentNode
        var obj = this.target;
        var browser = this.browser;
        return obj.subElements()
            .select(function(ea) { return ea.type === 'propertyDef' })
            // .sort(function(a,b) { if (!a.name || !b.name) return -999; return a.name.charCodeAt(0)-b.name.charCodeAt(0) })
            .collect(function(ea) { return new ide.ClassElemFragmentNode(ea, browser) });
    },

	menuSpec: ide.ClassFragmentNode.prototype.menuSpec, // FIXME
 
})
 
ide.FileFragmentNode.subclass('lively.ide.ClassElemFragmentNode', {

	menuSpec: function($super) {
		var menu = $super();
		var fragment = this.target;
		var searchName = fragment.name;
		return [
    		['senders', function() {
					var list = tools.SourceControl
						.searchFor(searchName)
						.select(function(ea) {
							if (!ea.name || !ea.name.include(searchName)) return true;
							var src = ea.getSourceCodeWithoutSubElements();
							return src.indexOf(searchName) !== src.lastIndexOf(searchName)
					}); // we don't want pure implementors, but implementors which are also senders should appear
					var title = 'senders of' + searchName;
					new ChangeList(title, null, list, searchName).openIn(WorldMorph.current()) }],
			['implementors', function() {
					var list = tools.SourceControl
						.searchFor(searchName)
						.without(fragment)
						.select(function(ea) { return ea.name === searchName });
					var title = 'implementers of' + searchName;
					new ChangeList(title, null, list, searchName).openIn(WorldMorph.current()) }]
    	].concat(menu);
	},

	evalSource: function(newSource) {
		if (!this.browser.evaluate) return false;
		var className = this.target.className;
		if (!Class.forName(className)) {
			console.log('Didn\'t found class');
			return false
		}
		var methodName = this.target.name;
		var methodString = this.target.getSourceCode();
		var def;
		if (this.target.isStatic())
			def = 'Object.extend(' + className + ', {\n' + methodString +'\n});';
		else
			def = className + ".addMethods({\n" + methodString +'\n});';
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
 
ide.FileFragmentNode.subclass('lively.ide.FunctionFragmentNode', {

	menuSpec: ide.ClassElemFragmentNode.prototype.menuSpec, // FIXME

});
ide.BrowserNode.subclass('lively.ide.ChangeNode', {

	documentation: 'Abstract node for Changes/ChangeSet nodes',
asString: function() {
		return this.target.getName();
	},


	menuSpec: function() {
		var spec = [];
		var node = this;
		spec.push(['remove', function() {
			node.target.remove();
			node.browser.allChanged() }]);
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


});

// ===========================================================================
// Browsing ChangeSets
// ===========================================================================
ide.ChangeNode.subclass('lively.ide.ChangeSetNode', {

    childNodes: function() {
		return this.target.subElements().collect(function(ea) { return ea.asNode(this.browser)}, this);
	},
 
    buttonSpecs: lively.ide.CompleteFileFragmentNode.prototype.buttonSpecs,
    
    sourceString: function($super) {
		return '';
/*		this.loadModule();
        //if (!this.target) return '';
		var src = $super();
		if (src.length > this.maxStringLength && !this.showAll) return '';
        return src;*/
    },
    
    asString: function() {
		return this.target.name;
	},



});

ide.ChangeNode.subclass('lively.ide.ChangeSetClassNode', {
	
	childNodes: function() {
		return this.target.subElements().collect(function(ea) { return ea.asNode(this.browser)}, this);
	}, 
	
});

ide.ChangeNode.subclass('lively.ide.ChangeSetClassElemNode');

ide.ChangeNode.subclass('lively.ide.ChangeSetDoitNode', {
	
	sourceString: function() {
		return this.target.getDefinition();
	},

saveSource: function(newSource) {
		this.target.setDefinition(newSource);
		this.savedSource = this.target.getDefinition();
        return true;
    },

evalSource: function(newSource) {
		if (!this.browser.evaluate) return false;
		if (this.target.getDefinition() !== newSource)
			throw dbgOn(new Error('Inconsistency while evaluating and saving?'));
		this.target.evaluate();
		return true
    },


});

ide.BrowserCommand.subclass('lively.ide.AllModulesLoadCommand', {

	wantsButton: function() {
		return true;
	},

	asString: function() {
		return 'Load all'
	},

	trigger: function() {
		var srcCtrl = tools.SourceControl;
		srcCtrl.interestingLKFileNames()
			.concat(srcCtrl.preLoadFileNames())
			.forEach(function(ea) { srcCtrl.addModule(ea) });
		this.browser.allChanged();
	}

});

ide.BrowserCommand.subclass('lively.ide.ShowLineNumbersCommand', {
	
	wantsButton: function() {
		return true;
	},

	asString: function() {
		return 'LineNo'
	},

	trigger: function() {
		this.browser.showLines = !this.browser.showLines;
		this.browser.allChanged();
	}

});

ide.BrowserCommand.subclass('lively.ide.RefreshCommand', {

	wantsButton: function() {
		return true;
	},

	asString: function() {
		return 'Refresh'
	},

	trigger: function() {
		this.browser.allChanged();
	}

});

ide.BrowserCommand.subclass('lively.ide.EvaluateCommand', {

	wantsButton: function() {
		return true;
	},

	asString: function() {
		if (this.browser.evaluate) return 'Eval on';
		return 'Eval off'
	},

	trigger: function() {
		this.browser.evaluate = !this.browser.evaluate;
	}

});
ide.BrowserCommand.subclass('lively.ide.ChangesGotoChangeSetCommand', {

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

	wantsButton: function() {
		return true;
	},

	asString: function() {
		if (this.browserIsSorting()) return 'Unsort';
		return 'Sort'
	},

	trigger: function() {
		var filter = this.filter;
		var b = this.browser;
		var isSorting = this.browserIsSorting()
		b.filterPlaces.forEach(function(ea) {
			isSorting ?
				b.uninstallFilters(function(f) { return f === filter }, ea) :
				b.installFilter(filter, ea);
		});
		b.allChanged();
	},

	browserIsSorting: function() {
		return this.browser.getPane1Filters().include(this.filter);
	},

});
ide.BrowserCommand.subclass('lively.ide.ChangeSetMenuCommand', {

	wantsMenu: function() {
		return true;
	},

	isActive: function(pane) {
		return this.browser.getPane1Selection() instanceof lively.ide.ChangeSetNode
			&& pane == 'Pane2';
	},


	trigger: function() {
		var cmd = this;
		return [['add class', cmd.addClass.bind(this)], ['add doit', cmd.addDoit.bind(this)]];
	},
addClass: function() {
	var b = this.browser;
	var w = WorldMorph.current();
	ownerNode = b.getPane1Selection(); // should be node of changeset
	var cs = ownerNode.target;

	var createChange = function(className, superClassName) {
		var change = ClassChange.create(className, superClassName);
		cs.addSubElement(change);
		b.allChanged();
	}

	w.prompt('Enter class name', function(n1) {
		w.prompt('Enter super class name', function(n2) {
			createChange(n1, n2);
		})			
	});
},
addDoit: function() {
	var b = this.browser;
	var w = WorldMorph.current();
	ownerNode = b.getPane1Selection(); // should be node of changeset
	var cs = ownerNode.target;

	var createChange = function(className, superClassName) {
		var change = DoitChange.create('// empty doit');
		cs.addSubElement(change);
		b.allChanged();
	}
	createChange();
},


});
lively.ide.BrowserCommand.subclass('lively.ide.ClassChangeMenuCommand', {

	wantsMenu: function() {
		return true;
	},

	isActive: function(pane) {
		return this.browser.getPane2Selection() instanceof lively.ide.ChangeSetClassNode
			&& pane == 'Pane3';
	},


	trigger: function() {
		var cmd = this;
		return [['add method', cmd.addMethod.bind(this)]];
	},
addMethod: function() {
	var b = this.browser;
	var w = WorldMorph.current();
	ownerNode = b.getPane2Selection(); // should be class change node
	var classChange = ownerNode.target;

	var createChange = function(methodName) {
		var change = ProtoChange.create(methodName, 'function() {}');
		classChange.addSubElement(change);
		b.allChanged();
	}

	w.prompt('Enter method name', function(n1) {
		createChange(n1);
	});
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
		dbgOn(true);
		console.warn('Could not go forward before line ' + this.findLineNo(this.lines, this.ptr));
		var lastAdded = this.changeList.last();
		var responsible = lastAdded.flattened().detect(function(ea) { return ea.subElements() && ea.subElements().include(descr) });
		if (!responsible && lastAdded === descr) responsible = this.changeList;
		if (!responsible) throw new Error('Couldn\'t find last added descriptor');
		responsible.pop();
		var errorDescr = new ide.ParseErrorFileFragment(this.src, null, 'errorDef', this.ptr, this.src.length-1, this.fileName);
		responsible.push(errorDescr);
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
        lineNo = lineNo - 1 // zero index
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
        });
        // ----------------
        // this.overheadTime += new Date().getTime() - ms;
    },

	 /* loading */
    sourceFromUrl: function(url) {
        if (!tools.SourceControl) tools.SourceControl = new SourceDatabase();
        return tools.SourceControl.getCachedText(url.filename());        
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
               'klassDef', 'objectDef', 'klassExtensionDef', 'propertyDef',
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

    parseAndShowFileNamed: function(fileName) {
        var chgList = new JsParser().parseFileFromUrl(URL.source.withFilename(fileName));
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
 
// ===========================================================================
// Keeps track of parsed sources
// ===========================================================================
SourceDatabase.subclass('AnotherSourceDatabase', {
    
    initialize: function($super) {
        this.cachedFullText = {};
        this.editHistory = {};
        this.modules = {};
		this.registeredBrowsers = [];
    },
    
    rootFragmentForModule: function(moduleName) {
        if (!Object.isString(moduleName))
            throw dbgOn(new Error('Don\'t know what to do with ' + moduleName));
		return this.modules[moduleName];
    },
    
    addModule: function(fileName, fileString) {
		if (this.modules[fileName]) return this.modules[fileName];
        fileString = fileString || this.getCachedText(fileName);
		return this.modules[fileName] = this.parseCompleteFile(fileName, fileString);
    },

	reparseModule: function(moduleName, readAgain) {
		this.modules[moduleName] = null;
		if (readAgain)
			this.cachedFullText[moduleName] = null;
		return this.addModule(moduleName);
	},

	parseCompleteFile: function(fileName, fileString) {
		var root;
		if (fileName.endsWith('.js')) {
			root = this.parseJs(fileName, fileString);
		} else if (fileName.endsWith('.txt')) {
			root = this.parseOmeta(fileName, fileString);
		} else if (fileName.endsWith('.lkml')) {
			root = this.parseLkml(fileName, fileString);
		} else { 
			throw dbgOn(new Error('Don\'t know how to parse ' + fileName))
		}
		root.flattened().forEach(function(ea) { ea.sourceControl = this }, this);
		return root;
	},

	parseJs: function(fileName, fileString) {
		var fileFragments = new JsParser().parseSource(fileString, {fileName: fileName});
        var root;
        var firstRealFragment = fileFragments.detect(function(ea) { return ea.type !== 'comment' });
        if (firstRealFragment.type === 'moduleDef')
            root = firstRealFragment;
        else
            root = new lively.ide.FileFragment(fileName, 'completeFileDef', 0, fileString.length-1, fileName, fileFragments, this);
        return root;
	},

	parseOmeta: function(fileName, fileString) {
		var fileFragments = new OMetaParser().parseSource(fileString, {fileName: fileName});
        var root = new lively.ide.FileFragment(fileName, 'ometaGrammar', 0, fileString.length-1, fileName, fileFragments, this);
        return root;
	},

	parseLkml: function(fileName, fileString) {
		return ChangeSet.fromFile(fileName, fileString);
	},

    putSourceCodeFor: function(fileFragment, newFileString) {
        if (!(fileFragment instanceof lively.ide.FileFragment)) throw dbgOn(new Error('Strange fragment'));
        newFileString = newFileString.replace(/\r/gi, '\n');  // change all CRs to LFs
        console.log("Saving " + fileFragment.fileName + "...");
        new NetRequest({model: new NetRequestReporter(), setStatus: "setRequestStatus"}
                ).put(URL.source.withFilename(fileFragment.fileName), newFileString);
        this.cachedFullText[fileFragment.fileName] = newFileString;
        console.log("... " + newFileString.length + " bytes saved.");
    },
    
	searchFor: function(str) {
		var allFragments = Object.values(tools.SourceControl.modules)
			.inject([], function(all, ea) { return all.concat(ea.flattened().uniq()) });
		return allFragments.select(function(ea) {
			return ea.getSourceCodeWithoutSubElements().include(str)
		});
},

    scanLKFiles: function($super, beSync) {
        // new AnotherSourceDatabase()
        var ms = new Date().getTime();
        this.interestingLKFileNames().each(function(fileName) {
            var action = function(fileString) { this.addModule(fileName, fileString) };
            this.getCachedTextAsync(fileName, action, beSync);
        }, this);
        console.log('Altogether: ' + (new Date().getTime()-ms)/1000 + ' s');
    },
    
    preLoad: function() {
        this.preLoadFileNames().each(function(fileName) {
            var action = function(fileString) { this.addModule(fileName, fileString) };
            this.getCachedTextAsync(fileName, action, true);
        }, this);
    },
    
    preLoadFileNames: function($super) {
		//return ['test.js', 'ide.js', 'Tests/ToolsTests.js', 'TileScripting.js', 'Tests/TileScriptingTests.js']
    return [ 'Tests/ToolsTests.js', 'test.js', 'Tests/MorphTest.js']
    //return [];
    },

	allFiles: function() {
		if (!this._allFiles)
			this._allFiles = this.interestingLKFileNames()
				.concat(this.preLoadFileNames())
				.uniq();
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
		this.registeredBrowsers.without(changedBrowser).forEach(function(ea) {
			ea.allChanged(true, changedNode);
		});
		console.log('updated ' + this.registeredBrowsers.length + ' browsers in ' + (new Date().getTime()-msStart)/1000 + 's')
	},
	
});
 
// see also lively.Tools.startSourceControl
ide.startSourceControl = function() {
    if (tools.SourceControl instanceof AnotherSourceDatabase)
		return tools.SourceControl;
    tools.SourceControl = new AnotherSourceDatabase();
    tools.SourceControl.preLoad();
	return tools.SourceControl;
};

Object.subclass('lively.ide.CodeEntity', {

	documentation: 'Generalizes modifying, removing and versioning FileFragments and Changes',

	getDefinition: Functions.Null

});

// ===========================================================================
// FileFragments, another SourceCodeDescriptor
// ===========================================================================
Object.subclass('lively.ide.FileFragment', {
 
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
	return this.name == other.name &&
		this.startIndex == other.startIndex &&
		this.stopIndex == other.stopIndex &&
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
		if (!this.fileName) throw dbgOn(new Error('no fileName for fragment ' + this));
		var self = this;
		return this.getSourceControl().modules[this.fileName].flattened().detect(function(ea) {
			return ea.subElements().any(function(subElem) { return self.eq(subElem) });
		});
	},

    flattened: function() {
        return this.subElements().inject([this], function(all, ea) {
            return all.concat(ea.flattened());
        });
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

		if (this.type === 'moduleDef' || this.type === 'completeFileDef')
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
		newFragment && newFragment.flattened().forEach(function(ea) {
			ea.sourceControl = this.sourceControl;
		}, this);
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
        var ctrl = this.sourceControl || tools.SourceControl;
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
		return ea.startIndex <= index && ea.stopIndex >= index});
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
        return Strings.format('%s: %s (%s-%s in %s, starting at line %s, %s subElements)',
            this.type, this.name, this.startIndex, this.stopIndex, this.fileName, this.startLine(), this.subElements().length);
    },
 
    inspect: function() {
    	try { return this.toString() } catch (err) { return "#<inspect error: " + err + ">" }
	},
    
});

ide.FileFragment.addMethods({

	browseIt: function() {
		var browser = new ide.SystemBrowser();
		browser.openIn(WorldMorph.current());
		// FIXME ... subclassing
		if (this.type === 'klassDef') {
			browser.inPaneSelectNodeNamed('Pane1', this.fileName);
			browser.inPaneSelectNodeNamed('Pane2', this.name);
		} else if (this.type === 'propertyDef') {
			browser.inPaneSelectNodeNamed('Pane1', this.fileName);
			browser.inPaneSelectNodeNamed('Pane2', this.className);
			browser.inPaneSelectNodeNamed('Pane3', this.name);
		}
		return browser;
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
		var sibling = newOwner.subElements().detect(function(ea) { return ea.startIndex == this.stopIndex+1 }, this);
		return sibling;
	},
});

ide.FileFragment.addMethods({

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
			var src = this.getSourceCode().match(/.*:\s+((\s|.)*)/)[1];
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

// ===========================================================================
// Change/ChangeSet and lkml handling
// ===========================================================================
Object.subclass('Change', {

	documentation: 'Wraps around XML elements which represent code entities',

	initialize: function(xmlElement) {
		this.xmlElement = xmlElement;
	},

	getXMLElement: function() {
		return this.xmlElement;
	},
setXMLElement: function(newElement) {
	var p = this.getXMLElement().parentNode;
	var oldElement = this.getXMLElement()
	if (!p) return;
	if (p.ownerDocument)
		newElement = p.ownerDocument.adoptNode(newElement);
	p.insertBefore(newElement, oldElement);
	p.removeChild(oldElement);
	this.xmlElement = newElement;
},


	getParser: function() {
		return new AnotherCodeMarkupParser();
	},

	getAttributeNamed: function(name, optXmlElement) {
		var element = optXmlElement || this.xmlElement;
		var attr = element.getAttributeNS(null, name);
		if (!attr) console.warn("no " + name + " for" + Exporter.stringify(element));
		return attr;
	},

	getName: function() {
		return this.getAttributeNamed('name');
	},

	getDefinition: function() {
		return this.xmlElement.textContent;
	},
setDefinition: function(src) {
	this.getXMLElement().textContent = src;
},

addSubElement: function(change) {
		var doc = this.xmlElement.ownerDocument;
		var newElem = doc ? doc.importNode(change.getXMLElement(), true) : change.getXMLElement();
		this.xmlElement.appendChild(newElem);
		change.xmlElement = newElem;
		return change;
	},
addSubElements: function(elems) { elems.forEach(function(ea) { this.addSubElement(ea) }, this) },



	remove: function() {
		var elem = this.xmlElement;
		if (!elem.parentNode) return;
		elem.parentNode.removeChild(elem);
	},

	subElements: function() {
		return [];
	},

	evaluate: function() {
		throw dbgOn(new Error('Overwrite me'));
	},

    toString: function() {
		var message = this.constructor.type + ' named ' + this.getName();
		message += ' -- subelems: ' + this.subElements().length;
		return message;
	},
 
    inspect: function() {
    	try { return this.toString() } catch (err) { return "#<inspect error: " + err + ">" }
	}
});

Change.addMethods({

	flattened: ide.FileFragment.prototype.flattened,
	getSourceCode: function() { return this.getDefinition() },
	getSourceCodeWithoutSubElements: ide.FileFragment.prototype.getSourceCodeWithoutSubElements,
	putSourceCode: function() { throw new Error('Not yet, sorry!') },
	getSourceControl: ide.FileFragment.prototype.getSourceControl,
	sourceCodeWithout: ide.FileFragment.prototype.sourceCodeWithout,
	getFileString: function() { throw new Error('Not yet, sorry!') },
});

Change.subclass('ChangeSet', {

	initializerName: 'initializer',

    initialize: function(optName) {
		// Keep track of an ordered list of Changes
		this.changes = []; // necessary? xmlElement should be enough...
		this.xmlElement = null;
		this.name = optName || '';
	},

	initializeFromWorldNode: function(node) {
		if (!this.reconstructFrom(node))
			this.addHookTo(node);
		return this;
	},

	initializeFromFile: function(fileName, fileString) {
		if (!fileString) fileString = new FileDirectory(URL.source).fileContent(fileName);
		var doc = new DOMParser().parseFromString(fileString, "text/xml");
		if (!this.reconstructFrom(doc))
			throw dbgOn(new Error('Couldn\'t create ChangeSet from ' + fileName));
		return this;
	},

	reconstructFrom: function(node) {
		var codeNodes = node.getElementsByTagName('code');
		if (codeNodes.length == 0) return false;
		if (codeNodes.length > 1) console.warn('multiple code nodes in ' + node);
		this.xmlElement = codeNodes[0];
		return true;
	},

	addHookTo: function(node) {
		this.xmlElement = LivelyNS.create("code");
		node.appendChild(this.xmlElement);
	},

	addChange: function(change) {
		this.addSubElement(change);
	},

	subElements: function() {
		var parser = new AnotherCodeMarkupParser();
		return $A(this.xmlElement.childNodes)
			.collect(function(ea) { return parser.createChange(ea) })
			.reject(function(ea) { return !ea });
	},

	evaluate: function() {
		this.subElements().forEach(function(item) { item.evaluate() });
    },

	removeChangeNamed: function(name) {
		var change = this.subElementNamed(name);
		if (!change) return null;
		change.remove();
		return change;
	},

	removeChangeAt: function(i) {
		var changes = this.subElements();
		if (!(i in changes)) return null;
		var change = changes[i];
		change.remove();
		return change;
	},

	remove: function() {
		this.subElements().invoke('remove');
	},

	/*************************************
	   Everything below is deprecated
	 *************************************/
    logChange: function(item) {
	// deprecated!!!
	this.changes.push(item);
	switch (item.type) {
	case 'method':
	    var classNode = this.xmlElement.appendChild(LivelyNS.create("class"));
	    classNode.setAttributeNS(null, "name", item.className);
	    var methodNode = classNode.appendChild(LivelyNS.create("proto"));
	    methodNode.setAttributeNS(null, "name", item.methodName);
	    methodNode.appendChild(NodeFactory.createCDATA(item.methodString));
	    break;
	case 'subclass':
	    var classNode = this.xmlElement.appendChild(LivelyNS.create("class"));
	    classNode.setAttributeNS(null, "name", item.subName);
	    className.setAttributeNS(null, "super", item.className);
	default:
	    console.log('not yet handling type ' + item.type);
	}
    },
    setChanges: function(arrayOfItems) {
	this.changes = arrayOfItems;
    },
    evaluateAll_old: function() {
	// FIXME: use markup parser instead?
	this.changes.forEach(function(item) {this.evalItem(item)}, this);
    },
    evalItem: function(item) {
	// FIXME: use markup parser instead?
	console.log("ChangeSet evaluating a " + item.type + " def.");
	if(item.type == 'method') eval(item.className + '.prototype.' + item.methodName + ' = ' + item.methodString);
	if(item.type == 'subclass') eval(item.className + '.subclass("' + item.subName + '", {})');
	if(item.type == 'doit') eval(item.doitString);
    },
addOrChangeElementNamed: function(name, source) {
	var prev = this.subElements().detect(function(ea) { ea.getName() == name});
	if (prev) {
		prev.setDefinition(source);
		return;
	}
	this.addChange(DoitChange.create(source, name));
},

subElementNamed: function(name) {
	return this.subElements().detect(function(ea) { return ea.getName() == name });
},
ensureHasInitializeScript: function() {
	var initializer = this.subElementNamed(this.initializerName);
	if (initializer) return;
	var content = '// this script is evaluated on world load';
	this.addOrChangeElementNamed(this.initializerName, content);
},
evaluateAllButInitializer: function() {
	this.subElements()
		.reject(function(ea) { return ea.getName() == this.initializerName}, this)
		.forEach(function(ea) { ea.evaluate() });
},
evaluateInitializer: function() {
	this.subElementNamed(this.initializerName).evaluate();
},





});
ChangeSet.addMethods({
	asNode: function(browser) { return new lively.ide.ChangeSetNode(this, browser) }
});


Object.extend(ChangeSet, {

	fromWorld: function(worldOrNode) {
		var node = worldOrNode instanceof WorldMorph ? worldOrNode.getDefsNode() : worldOrNode;
		var cs = new ChangeSet('Local code').initializeFromWorldNode(node);
		cs.ensureHasInitializeScript();
		return cs;
	},

	fromFile: function(fileName, fileString) {
		return new ChangeSet(fileName).initializeFromFile(fileName, fileString);
	},

	current: function() {
		// Return the changeSet associated with the current world
		var world = WorldMorph.current();
		var chgs = world.changes;
		if (!chgs) {
			chgs = ChangeSet.fromWorld(world);
			world.changes = chgs;
		}
		return chgs;
	}

});

Change.subclass('ClassChange', {

	isClassChange: true,

	getSuperclassName: function() {
		return this.getAttributeNamed('super');
	},

	subElements: function() {
		// memorize?
		var parser = this.getParser();
		return $A(this.xmlElement.childNodes)
			.collect(function(ea) { return parser.createChange(ea) })
			.reject(function(ea) { return !ea })
	},

	getProtoChanges: function() {
		return this.subElements().select(function(ea) { return ea.isProtoChange });
	},

	getStaticChanges: function() {
		return this.subElements().select(function(ea) { return ea.isStaticChange });
	},

	evaluate: function() {
		var superClassName = this.getSuperclassName();
		if (!Class.forName(superClassName))
			throw dbgOn(new Error('Could not find class ' + superClassName));
		var className = this.getName();
		if (Class.forName(className))
			console.warn('Class' + klass + 'already defined! Evaluating class change regardless');
		var src = Strings.format('%s.subclass(\'%s\')', superClassName, className);
		var klass = eval(src);
		this.getStaticChanges().concat(this.getProtoChanges()).forEach(function(ea) { ea.evaluate() });
		return klass;
	},
asJs: function() {
	var subElementString = '';
	if (this.subElements().length > 0)
		subElementString = '\n' + this.subElements().invoke('asJs').join('\n') + '\n';
	return Strings.format('%s.subclass(\'%s\', {%s});',
		this.getSuperclassName(), this.getName(), subElementString);
},


});

ClassChange.addMethods({
	asNode: function(browser) { return new ide.ChangeSetClassNode(this, browser) }
});

Object.extend(ClassChange, {

	isResponsibleFor: function(xmlElement) { return xmlElement.tagName === 'class' },

	create: function(name, superClassName) {
		var element = LivelyNS.create('class');
		element.setAttributeNS(null, 'name', name);
		element.setAttributeNS(null, 'super', superClassName);
		return new ClassChange(element);
	},
	
});

Change.subclass('ProtoChange', {

	isProtoChange: true,

	evaluate: function() {
		var className = this.getClassName();
		var klass = Class.forName(className);
		if (!klass) throw dbgOn(new Error('Could not find class of proto change' + this.getName()));
		var src = Strings.format('%s.addMethods({%s: %s})', className, this.getName(), this.getDefinition());
		eval(src);
		return klass.prototype[this.getName()];
	},

	getClassName: function() {
		return this.getAttributeNamed('className')
			|| this.getAttributeNamed('name', this.xmlElement.parentNode);
	},
asJs: function() {
	return this.getName() + ': ' + this.getDefinition() + ',';
},


});

ProtoChange.addMethods({
	asNode: function(browser) { return new ide.ChangeSetClassElemNode(this, browser) }
});

Object.extend(ProtoChange, {
	
	isResponsibleFor: function(xmlElement) { return xmlElement.tagName === 'proto' },
	
	create: function(name, source, optClassName) {
		var element = LivelyNS.create('proto');
		element.setAttributeNS(null, 'name', name);
		if (optClassName) element.setAttributeNS(null, 'className', optClassName);
		element.textContent = source;
		return new ProtoChange(element);
	},
	
});

Change.subclass('StaticChange', {

	isStaticChange: true,

	getClassName: function() { // duplication with protoChange
		return this.getAttributeNamed('name', this.xmlElement.parentNode);
	},

	evaluate: function() {
		var className = this.getClassName();
		var klass = Class.forName(className);
		if (!klass) throw dbgOn(new Error('Could not find class of static change' + this.getName()));
		var src = Strings.format('Object.extend(%s, {%s: %s})', className, this.getName(), this.getDefinition());
		eval(src);
		return klass[this.getName()];
	},

});

StaticChange.addMethods({
	asNode: function(browser) { return new ide.ChangeSetClassElemNode(this, browser) }
});

Object.extend(StaticChange, {

	isResponsibleFor: function(xmlElement) { return xmlElement.tagName === 'static' },

	create: function(name, source, optClassName) { // duplication with proto!!!
		var element = LivelyNS.create('static');
		element.setAttributeNS(null, 'name', name);
		if (optClassName) element.setAttributeNS(null, 'className', optClassName);
		element.textContent = source;
		return new ProtoChange(element);
	},

});

Change.subclass('DoitChange', {

	isDoitChange: true,

	evaluate: function() {
		var result;
		try {
			result = eval(this.getDefinition())
		} catch(e) {
			console.log('Error evaluating ' + this.getName() + ': ' + e);
		}
		return result;
	},

});

DoitChange.addMethods({
	asNode: function(browser) { return new ide.ChangeSetDoitNode(this, browser) }
});

Object.extend(DoitChange, {

	isResponsibleFor: function(xmlElement) { return xmlElement.tagName === 'doit' },

	create: function(source, optName) {
		var element = LivelyNS.create('doit');
		element.setAttributeNS(null, 'name', optName || 'aDoit');
		element.textContent = source;
		return new DoitChange(element);
	},

});

Object.subclass('AnotherCodeMarkupParser', {

	initialize: function() {
		this.files = {};
	},

	changeClasses: Change.allSubclasses().without(ChangeSet),

	createChange: function(xmlElement) {
		var klass = this.changeClasses.detect(function(ea) { return ea.isResponsibleFor(xmlElement) });
		//if (!klass) throw dbgOn(new Error('Found no Change class for ' + Exporter.stringify(xmlElement)));
		if (!klass) {
			console.warn('Found no Change class for ' + Exporter.stringify(xmlElement).replace(/\n|\r/, ' '));
			return null;
		}
		return new klass(xmlElement);
	},

	getDocumentOf: function(url) { /*helper*/
		if (Object.isString(url)) url = new URL(url);
		var existing = this.files[url.toString()];
		if (existing) return existing;
		var resource = new Resource(Record.newPlainInstance({URL: url.toString(), ContentText: null, ContentDocument: null}), "application/xml");
		resource.fetch(true);
		var doc = resource.getContentDocument();
		if (doc) return doc;
		return new DOMParser().parseFromString(resource.getContentText(), "application/xml");
	},

});

});