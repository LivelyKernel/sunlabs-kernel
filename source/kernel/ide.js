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

	emptyText: '-----',

	allPaneNames: ['Pane1', 'Pane2', 'Pane3'],

    initialViewExtent: pt(620, 450),
    formals: ["Pane1Content", "Pane1Selection", "Pane1Choicer", "Pane1Menu",
              "Pane2Content", "Pane2Selection", "Pane2Choicer", "Pane2Menu",
              "Pane3Content", "Pane3Selection", "Pane3Choicer", "Pane3Menu",
              "SourceString", "StatusMessage"],
 
    initialize: function($super) { 
        $super();
        // create empty onUpdate functions
        var paneNames = ['Pane1', 'Pane2', 'Pane3'];
        paneNames.forEach(function(ea) {
            this['on' + ea + 'ContentUpdate'] = Functions.Null;
            this['on' + ea + 'MenuUpdate'] = Functions.Null;
        }, this);
        this.onStatusMessageUpdate = Functions.Null;
        
        //create a model and relay for connecting the additional components later on
        var model = Record.newPlainInstance((function(){var x={};this.formals.each(function(ea){x[ea]=null});return x}.bind(this))());
        var spec = {SourceString: "SourceString", StatusMessage: "StatusMessage"};
        paneNames.forEach(function(ea) {
            spec[ea + 'Content'] = ea + 'Content';
            spec[ea + 'Selection'] = ea + 'Selection';
            spec[ea + 'Menu'] = ea + 'Menu';
        });
        this.relayToModel(model, spec);
    },
 
	mySourceControl: function() {
		var ctrl = lively.Tools.SourceControl;
		if (!ctrl) throw dbgOn(new Error('Browser has no SourceControl!'));
		return ctrl;
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
		return this.allPaneNames.collect(function(ea) { return this.nodesInPane(ea) }, this);
	},

	paneNameOfNode: function(node) {
    	return this.allPaneNames.detect(function(ea) { return this.nodesInPane(ea).include(node) }, this);
	},

    start: function() {
        this.setPane1Content(this.rootNode().childNodesAsListItems());
		this.mySourceControl().registerBrowser(this);
    },
 
    buildView: function (extent) {
 
		extent = extent || this.initialViewExtent;

        this.start();
 
        var panel = PanelMorph.makePanedPanel(extent, [
            ['Pane1', newRealListPane, new Rectangle(0, 0, 0.3, 0.40)],
            ['Pane2', newRealListPane, new Rectangle(0.3, 0, 0.35, 0.45)], //['Pane2', newRealListPane, new Rectangle(0.35, 0, 0.3, 0.4)],
            ['Pane3', newRealListPane, new Rectangle(0.65, 0, 0.35, 0.45)],
            ['sourcePane', newTextPane, new Rectangle(0, 0.5, 1, 0.5)],
            //['statusPane', newTextPane, new Rectangle(0, 0.95, 1, 0.05)]
        ]);
 
        var model = this.getModel();
        var browser = this;
 
        function setupListPanes(paneName) {
            var morph = panel[paneName];
            morph.connectModel(model.newRelay({List:        ("-" + paneName + "Content"),
                                               Selection:   ('+' + paneName + 'Selection'),
                                               Menu:        ("-" + paneName + "Menu")}), true);
            morph.withAllSubmorphsDo(function() {            
                this.onMouseOver = function(evt) { browser.showButtons(evt, morph, paneName) };
                this.onMouseDown = this.onMouseDown.wrap(function(proceed, evt) {
                    proceed(evt);
                    browser.showButtons(evt, morph, paneName);
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
 
    onPane1SelectionUpdate: function(node) {
        this.setStatusMessage('');
        this.setPane2Selection(null, true);
        this.setPane2Content([this.emptyText]);
        if (!node) {
            this.hideButtons(null, this.panel.Pane1, 'Pane1')
            return
        };
        this.setPane2Content(node.childNodesAsListItems());
        this.setPane1Menu(node.menuSpec());
       	this.setSourceString(node.sourceString());
		this.updateTitle();
    },
 
    onPane2SelectionUpdate: function(node) {
        this.setStatusMessage('');
        this.setPane3Selection(null);
        this.setPane3Content([this.emptyText]);        
        if (!node) {
            this.hideButtons(null, this.panel.Pane2, 'Pane2')
            return
        }
        this.setPane3Content(node.childNodesAsListItems());
        this.setPane2Menu(node.menuSpec());
        this.setSourceString(node.sourceString());
		this.updateTitle();
    },
 
    onPane3SelectionUpdate: function(node) {
        this.setStatusMessage('');
        if (!node) {
            this.hideButtons(null, this.panel.Pane3, 'Pane3')
            return
        }
        this.setPane3Menu(node.menuSpec());
        this.setSourceString(node.sourceString());
		this.updateTitle();
    },
 
    onSourceStringUpdate: function(methodString) {
        if (!methodString || methodString == this.emptyText) return;
        if (this.selectedNode().sourceString() == methodString) return;
        this.selectedNode().newSource(methodString);
        this.nodeChanged(this.selectedNode());
    },

    nodesInPane: function(paneName) { // panes have listItems, no nodes
             var listItems = this['get' + paneName + 'Content']();
             if (!listItems) return [];
             if (!listItems.collect) {
    			console.log('Weird bug: listItems: ' + listItems + ' has no collect in pane ' + paneName);
    			Global.y = listItems;
    			dbgOn(true);
    			return [];
    		}
            return listItems.collect(function(ea) { return ea.value })    
        },
    
    siblingsFor: function(node) {
        var siblings = this.allPaneNames
             .collect(function(ea) { return this.nodesInPane(ea) }, this)
             .detect(function(ea) { return ea.include(node) });
        if (!siblings) return [];
        return siblings.without(node);
    },
    
    hasUnsavedChanges: function() {
        return this.panel.sourcePane.innerMorph().hasUnsavedChanges();
    },
    
	allChanged: function(keepUnsavedChanges, changedNode) {

		// optimization: if no node looks like the changed node in my browser do nothing
		if (changedNode)
			if (this.allNodes().flatten().every(function(ea) { return !changedNode.hasSimilarTarget(ea) }))
				return;

	      // FIXME remove duplication
        var oldN1 = this.getPane1Selection();
        var oldN2 = this.getPane2Selection();
        var oldN3 = this.getPane3Selection();

		var src;
		if (keepUnsavedChanges && this.hasUnsavedChanges())
			src = this.panel.sourcePane.innerMorph().textString;

        this.start();
        if (oldN1) {
            var newN1 = this.nodesInPane('Pane1').detect(function(ea) { return ea.target === oldN1.target });
			if (!newN1) newN1 = this.nodesInPane('Pane1').detect(function(ea) { return ea.asString() === oldN1.asString() });
			if (newN1) newN1.mode = oldN1.mode;
            this.setPane1Selection(newN1, true);
        }
        if (oldN2) {
            var newN2 = this.nodesInPane('Pane2').detect(function(ea) { return ea.target === oldN2.target });
			if (!newN2) newN2 = this.nodesInPane('Pane2').detect(function(ea) { return ea.asString() === oldN2.asString() });
			if (newN2) newN2.mode = oldN2.mode;
            this.setPane2Selection(newN2, true);
        }	
        if (oldN3) {
            var newN3 = this.nodesInPane('Pane3').detect(function(ea) { return ea.target === oldN3.target });
			if (!newN3) newN3 = this.nodesInPane('Pane3').detect(function(ea) { return ea.asString() === oldN3.asString() });
			if (newN3) newN3.mode = oldN3.mode;
            this.setPane3Selection(newN3, true);
        }

		if (src) {
			this.setSourceString(src);
			this.panel.sourcePane.innerMorph().showChangeClue(); // FIXME
		}
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

	inPaneSelectNodeNamed: function(paneName,  nodeName) {
			var nodes = this['get' + paneName + 'Content']();
			var wanted = nodes.detect(function(ea) { return ea.string.include(nodeName) });
			if (!wanted) return null;
			var list = this.panel[paneName].innerMorph();
			var i = list.itemList.indexOf(wanted);
			list.selectLineAt(i, true /*should update*/);
			return wanted;
	},

	commands: function() {
		var cmdClasses = ide.BrowserCommand.allSubclasses();
		return cmdClasses.collect(function(ea) { return new ea(this) }, this);
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
 
    childNodesAsListItems: function() {
        var items = this.childNodes().collect(function(ea) {
            return {isListItem: true, string: ea.asString(), value: ea}
        });
		if (!this.browser.alphabetize) return items;
		return items.sort(function(a,b) {
			if (a.string.toLowerCase() < b.string.toLowerCase()) return -1;
			if (a.string.toLowerCase() > b.string.toLowerCase()) return 1;
			return 0;
		});
    },
 
    asString: function() {
        return 'no name for node of type ' + this.constructor.type;
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
        // throw dbgOn(new Error("Shouldn't try to eval and save things now..."));
        if (!this.saveSource(newSource, tools.SourceControl))
            console.log('couldn\'t save');
		if (!this.evalSource(newSource)) {
            console.log('couldn\'t eval');
        }
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
    
    statusMessage: function(string) {
		console.log('Browser statusMessage: ' + string);
        this.browser && this.browser.setStatusMessage(string);
    },
    
    signalChange: function() {
        this.browser.nodeChanged(this);
    },

	signalTextChange: function() {
        this.browser.textChanged(this);
    }
 
});

Object.subclass('lively.ide.BrowserCommand', {

	initialize: function(browser) {
		this.browser = browser;
	},

	wantsButton: function() {
		return false;
	},

	asString: function() {
		return 'unnamed command'
	},

	trigger: function() {}

});

/*
 *  Nodes for viewing classes, functions, objects (from within the system, no parsed source)
 */
ide.BrowserNode.subclass('lively.ide.EnvironmentNode', {
 
    childNodes: function() {
        return this.target.subNamespaces(true).concat([this.target]).collect(function(ea) { return new ide.NamespaceNode(ea, this.browser) }, this);
    }
});
 
ide.BrowserNode.subclass('lively.ide.NamespaceNode', { // rename to ModuleNode
 
    initialize: function($super, target, browser) {
        $super(target, browser);
        // modes will be replaced with FilterObjects
        // for now mode can be one of: functions, classes, objects
        this.mode = 'classes';
    },
 
    childNodes: function() {
        var browser = this.browser;
        var ns = this.target;
        switch (this.mode) {
           case "classes":
            return this.target.classes()
                .sort()
                .collect(function(ea) { return new ide.ClassNode(ea, browser) });
           case "functions":
            return Object.keys(this.target)
                .select(function(ea) { return ns[ea] && ns.hasOwnProperty(ea) && !Class.isClass(ns[ea]) && Object.isFunction(ns[ea]) && !ns[ea].declaredClass})
                .sort()
                .collect(function(ea) { return new ide.FunctionNode(ns[ea], browser, ea) });
           case "objects":
            return Object.keys(ns)
                .reject(function(ea) { return Object.isFunction(ns[ea]) })
                .sort()
                .collect(function(ea) { return new ide.ObjectNode(ns[ea], browser, ea) });
           default: return []
        }
    },
 
    asString: function() {
        return this.target.namespaceIdentifier;
    },
 
    buttonSpecs: function() {
        var node = this;
        return [
            {label: 'classes',action: function() {
                node.siblingNodes().concat([node]).each(function(ea) { ea.mode = 'classes' }) 
            }},
            {label: 'functions', action: function() {
                node.siblingNodes().concat([node]).each(function(ea) { ea.mode = 'functions' })
            }},
            {label: 'objects', action: function() {
                node.siblingNodes().concat([node]).each(function(ea) { ea.mode = 'objects' })
            }}
        ]
    }
});
 
ide.BrowserNode.subclass('lively.ide.ClassNode', {
    initialize: function($super, target, browser) {
        $super(target, browser);
        // again: get rid of modes
        // for now mode can be one of: class, instance
        this.mode = 'instance';
    },
 
    childNodes: function() {
        var theClass = this.target;
        var browser = this.browser;
        switch (this.mode) {
            case "instance":
                return theClass.functionNames()
                    .sort()
                    .select(function(ea) { return theClass.prototype.hasOwnProperty(ea) })
                    .collect(function(ea) { return new ide.MethodNode(theClass.prototype[ea], browser, theClass) });
            case "class":
                return Object.keys(theClass)
                    .sort()
                    .select(function(ea) { return theClass.hasOwnProperty(ea) && Object.isFunction(theClass[ea]) && !Class.isClass(theClass[ea])})
                    .collect(function(ea) { return new ide.ClassMethodNode(theClass[ea], browser, theClass, ea) });
            default: return []
        }
    },
 
    asString: function() {
        function classNameWithoutNS(className) {
            if (!className) return 'unnamed class';
            return className.substr(className.lastIndexOf('.')+1, className.length);
        }
        return classNameWithoutNS(this.target.type);
    },
 
    buttonSpecs: function() {
        var node = this;
        return [
            {label: 'instance',action: function() {
                node.siblingNodes().concat([node]).each(function(ea) { ea.mode = 'instance' })
            }},
            {label: 'class', action: function() {
                node.siblingNodes().concat([node]).each(function(ea) { ea.mode = 'class' })
            }}
        ]
    },
 
    sourceString: function() {
        var source = tools.SourceControl.methodDictFor(this.target.type)['*definition'];
        if (source) {
            this.statusMessage('Definition of class of SourceDB.');
            return source.getSourceCode()
        };
        this.statusMessage('No definition of class in SourceDB found.');
        return 'class def of ' + this.target.type
    },
});
 
ide.BrowserNode.subclass('lively.ide.ObjectNode', {
 
    initialize: function($super, target, browser, nameInOwner) {
        $super(target, browser);
        this.nameInOwner = nameInOwner;
    },
 
    childNodes: function() {
        // FIXME duplication with Classnode
        var obj = this.target;
        var browser = this.browser;
        return Object.keys(obj)
            .select(function(ea) { return obj[ea] && obj.hasOwnProperty(ea) && !Class.isClass(obj[ea]) && Object.isFunction(obj[ea]) && !obj[ea].declaredClass})
            .sort()
            .collect(function(ea) { return new ide.FunctionNode(obj[ea], browser, ea) });
    },
 
    asString: function() {
        return this.nameInOwner;
    },
 
    sourceString: function() {
        var source;
        try {
            source = JSON.serialize(this.target)
        } catch(e) {
            this.statusMessage('Couldn\'t JSON.serialize target');
            source = 'object def of ' + this.nameInOwner;
        }
        return source;
    },
})
 
ide.BrowserNode.subclass('lively.ide.MethodNode', {
 
    initialize: function($super, target, browser, theClass) {
        $super(target, browser);
        this.theClass = theClass;
    },
 
    methodName: function() {
        return this.target.methodName || this.target.name || 'method without property methodName'
    },
 
    sourceString: function() {
        if (!tools.SourceControl) {
            this.statusMessage('No SourceDB available, using decompiled source');
            return '// Decompiled source:\n' + this.target.toString();
        };
 
        var source = tools.SourceControl.methodDictFor(this.theClass.type)[this.methodName()];
        if (source) {
            this.statusMessage('Source in source control. Native version.');
            return source.getSourceCode();
        };
 
        this.statusMessage('No source in source control. Decompiled version.');
        return '// Decompiled source:\n' + this.target.toString();
    },
 
    asString: function() {
        return this.methodName();
    },
 
    evalSource: function(newSource) {
        var methodName = this.target.methodName;
        if (!methodName) throw dbgOn(new Error('No method name!'));
        var methodDef = this.theClass.type + ".prototype." + methodName + " = " + newSource;
        try {
            eval(methodDef);
            console.log('redefined ' + methodName);
        } catch (er) {
            WorldMorph.current().alert("error evaluating method " + methodDef);
            return false;
        }
        // ChangeSet.current().logChange({type: 'method', className: className, methodName: methodName, methodString: methodString});
        return true;
    },
 
    saveSource: function(newSource, sourceControl) {
        var methodName = this.target.methodName;
        var methodDict = sourceControl.methodDictFor(this.theClass.type);
        var methodDescr = methodDict[methodName];
        if (!methodDescr) {
            console.log('can\'t find method descriptor for ' + methodName);
            return false;
        }
        if (!newSource.startsWith(methodName)) newSource = methodName + ': ' + newSource;
        if (!newSource.endsWith(',')) newSource += ',';
        methodDescr.putSourceCode(newSource);
        return true; //FIXME test that saving successful?
    }
});
 
ide.MethodNode.subclass('lively.ide.ClassMethodNode', {
 
    initialize: function($super, target, browser, theClass, nameInOwner) {
        $super(target, browser, theClass);
        this.nameInOwner = nameInOwner;
    },
 
    asString: function() {
        return this.nameInOwner || this.target.name || 'anonymous class function';
    },
 
});
ide.BrowserNode.subclass('lively.ide.FunctionNode', {
 
    initialize: function($super, target, browser, nameInOwner) {
        $super(target, browser);
        this.nameInOwner = nameInOwner;
    },
 
    sourceString: function() {
        return this.target.toString();
    },
 
    asString: function() {
        return this.nameInOwner || this.target.name || 'anonymous function';
    },
});
 
 
/*
 *  SystemBrowser implementation for browsing parsed sources
 */
ide.BasicBrowser.subclass('lively.ide.SystemBrowser', { // 123
 
    documentation: 'Browser for source code parsed from js files',
    viewTitle: "SystemBrowser",
 
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
    
    childNodes: function() {
        return this.target.interestingLKFileNames()
			.concat(this.target.preLoadFileNames())
			.uniq()
			.collect(function(ea) {
				var nodeClass = ea.endsWith('.js') ? // FIXME
					ide.CompleteFileFragmentNode :
					ide.CompleteOmetaFragmentNode;
            	return new nodeClass(this.target.rootFragmentForModule(ea), this.browser, ea)
		}, this);
    }
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
		return spec.concat([
			['remove', function() {
				node.target.remove();
				node.browser.allChanged();
			}]
		])
	},
    
});

ide.FileFragmentNode.subclass('lively.ide.CompleteFileFragmentNode', { // should be module node
 
	maxStringLength: 10000,

    initialize: function($super, target, browser, moduleName) {
        $super(target, browser);
        this.mode = 'classes';
        this.moduleName = moduleName;
		this.showAll = false;
    },
 
    childNodes: function() {
        var browser = this.browser;
        var completeFileFragment = this.target;
        if (!completeFileFragment) return [];
        switch (this.mode) {
           case "classes":
            return this.target.flattened()
                .select(function(ea) { return ea.type === 'klassDef' || ea.type === 'klassExtensionDef'})
                // .sort(function(a,b) { return a.name.charCodeAt(0)-b.name.charCodeAt(0) })
                .collect(function(ea) { return new ide.ClassFragmentNode(ea, browser) });
           case "functions":
            return this.target.flattened()
                .select(function(ea) { return ea.type === 'staticFuncDef' || ea.type === 'executedFuncDef' || ea.type === 'methodModificationDef' || ea.type === 'functionDef' })
                // .sort(function(a,b) { if (!a.name || !b.name) return -999; return a.name.charCodeAt(0)-b.name.charCodeAt(0) })
                .collect(function(ea) { return new ide.FunctionFragmentNode(ea, browser) });
           case "objects":
            return this.target.flattened()
               .select(function(ea) { return ea.type === 'objectDef' || ea.type === 'unknown' || ea.type === 'moduleDef' || ea.type === 'usingDef'})
               // .sort(function(a,b) { if (!a.name || !b.name) return -999; return a.name.charCodeAt(0)-b.name.charCodeAt(0) })
               .collect(function(ea) { return new ide.ObjectFragmentNode(ea, browser) });
           default: return ['Huh']
        }
    },
 
    buttonSpecs: function() {
		var browser = this.browser;
		var myPane = browser.paneNameOfNode(this);
        return [
            {label: 'classes',action: function() {
                browser.nodesInPane(myPane).each(function(ea) { ea.mode = 'classes' }) 
            }},
            {label: 'functions', action: function() {
                browser.nodesInPane(myPane).each(function(ea) { ea.mode = 'functions' })
            }},
            {label: 'objects', action: function() {
                browser.nodesInPane(myPane).each(function(ea) { ea.mode = 'objects' })
            }}
        ]
    },
    
    menuSpec: function($super) {
		var menu = $super();
   		if (!this.target) return menu;
		var node = this;
   		return menu.concat([
			['toggle showAll', function() {
    			node.showAll = !node.showAll;
    			node.signalTextChange()}
			],
    		['open ChangeList viewer', function() {
    			new ChangeList(node.moduleName, null, node.target.flattened()).openIn(WorldMorph.current())}
			],
    	])
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
    
    asString: function() {
		var name = this.moduleName;
		if (!this.target) return name + ' (not loaded)';
		if (!this.showLines()) return name;
		return name + ' (' + this.target.startLine() + '-' + this.target.stopLine() + ')';
    },

	buttonSpecs: function() { return [] },

	menuSpec: function($super) {
		var menu = $super();
    		var fileName = this.moduleName;
    		if (!this.target) return menu;
    		return menu.concat([
    			['Translate grammar', function() {
					WorldMorph.current().prompt(
						'File name of translated grammar?',
						function(input) {
							if (!input.endsWith('.js'))
								input += '.js';
							OMetaSupport.translateAndWrite(fileName, input);
						},
						fileName.slice(0, fileName.indexOf('.'))
					);
				}]
				]);
        },

	childNodes: function() {
		var fileDef = this.target;
		if (!fileDef) return [];
		var browser = this.browser;
		var ometaNodes = fileDef.subElements
			.select(function(ea) { return ea.type === 'ometaDef'})
			.collect(function(ea) { return new ide.OMetaGrammarNode(ea, browser) });
		var rest = fileDef.subElements
			.select(function(ea) { return !fileDef.subElements.include(ea) })
			.collect(function(ea) { return new ide.ObjectFragmentNode(ea, browser) });
		return ometaNodes.concat(rest);
    },

});

ide.FileFragmentNode.subclass('lively.ide.OMetaGrammarNode', {

	childNodes: function() {
		var def = this.target;
		var browser = this.browser;
		return this.target.subElements
			.collect(function(ea) { return new ide.OMetaRuleNode(ea, browser) });
	},

});

ide.FileFragmentNode.subclass('lively.ide.OMetaRuleNode', {});

ide.FileFragmentNode.subclass('lively.ide.ClassFragmentNode', {
 
    childNodes: function() {
        var classFragment = this.target;
        var browser = this.browser;
        return classFragment.subElements
            .select(function(ea) { return ea.type === 'propertyDef' || ea.type === 'methodDef' })
            // .sort(function(a,b) { if (!a.name || !b.name) return -999; return a.name.charCodeAt(0)-b.name.charCodeAt(0) })
            .collect(function(ea) { return new ide.ClassElemFragmentNode(ea, browser) });
    },

	menuSpec: function($super) {
		var menu = $super();
		var fragment = this.target;
		var index = fragment.name ? fragment.name.lastIndexOf('.') : -1;
		// don't search for complete namespace name, just its last part
		var searchName = index === -1 ? fragment.name : fragment.name.substring(index+1);
		return menu.concat([
    		['references', function() {
					var list = tools.SourceControl
						.searchFor(searchName)
						.without(fragment)
					var title = 'references of' + fragment.name;
					new ChangeList(title, null, list, searchName).openIn(WorldMorph.current()) }]])
	} 

});
 
ide.FileFragmentNode.subclass('lively.ide.ObjectFragmentNode', {
 
    childNodes: function() {
        if (!this.target.subElements) return [];
        // FIXME duplication with ClassFragmentNode
        var obj = this.target;
        var browser = this.browser;
        return obj.subElements
            .select(function(ea) { return ea.type === 'propertyDef' || ea.type === 'methodDef' })
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
		return menu.concat([
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
    	]);
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
		var def = className + ".addMethods({\n" + methodString +'\n});';
		try {
			eval(def);
		} catch (er) {
			console.log("error evaluating method " + methodString + ': ' + er);
			return false;
		}
		console.log('Successfully evaluated #' + methodName);
        return true;
    }

});
 
ide.FileFragmentNode.subclass('lively.ide.FunctionFragmentNode', {

	menuSpec: ide.ClassElemFragmentNode.prototype.menuSpec, // FIXME

});

ide.BrowserCommand.subclass('lively.ide.AllModulesLoadCommand', {

	wantsButton: function() {
		return true;
	},

	asString: function() {
		return 'Load all modules'
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
		return 'Toggle LineNo'
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
		if (this.browser.evaluate) return 'Turn eval off';
		return 'Turn eval on'
	},

	trigger: function() {
		this.browser.evaluate = !this.browser.evaluate;
	}

});

ide.BrowserCommand.subclass('lively.ide.SortCommand', {

	wantsButton: function() {
		return true;
	},

	asString: function() {
		if (this.browser.alphabetize) return 'Unsort';
		return 'Sort'
	},

	trigger: function() {
		this.browser.alphabetize = !this.browser.alphabetize;
		this.browser.allChanged();
	}

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
        
        if (this.specialDescr && this.specialDescr.length > 0 &&  (!this.specialDescr.last().subElements.last().isError || !this.changeList.last().isError))
            console.warn('Couldn\'t find end of ' + this.specialDescr.last().type);
            //throw dbgOn(new Error('Couldn\'t find end of ' + specialDescr.last().type));
        
        console.log('Finished parsing in ' + (new Date().getTime()-msStart)/1000 + ' s');
        // console.log('Overhead:................................' + this.overheadTime/1000 + 's');
 
        return this.changeList;
    },

	couldNotGoForward: function(descr, specialDescr) {
		dbgOn(true);
		console.warn('Could not go forward before line ' + this.findLineNo(this.lines, this.ptr));
		var lastAdded = this.changeList.last();
		var responsible = lastAdded.flattened().detect(function(ea) { return ea.subElements && ea.subElements.include(descr) });
		if (!responsible && lastAdded === descr) responsible = this.changeList;
		if (!responsible) throw new Error('Couldn\'t find last added descriptor');
		responsible.pop();
		var errorDescr = new ide.ParseErrorFileFragment(this.src, null, 'errorDef', this.ptr, this.src.length-1);
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
        if (!descr.subElements) return;
        descr.subElements.forEach(function(ea) { this.doForAllDescriptors(ea, action) }, this);
    },
    
    fixIndicesAndMore: function(descr, startPos) {
        // var ms = new Date().getTime();
        // ----------
        this.doForAllDescriptors(descr, function(d) {
            d.startIndex += startPos;
            d.stopIndex += startPos;
            d.lineNo = this.findLineNo(this.lines, d.startIndex);
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
               'klassDef', 'objectDef', 'klassExtensionDef',
               'functionDef', 'staticFuncDef', 'executedFuncDef', 'methodModificationDef',
               'unknown'],
    
    parseClass: function() {
        return this.callOMeta("klassDef");
    },
    
    parseModuleBegin: function() {
        var match = this.currentLine.match(/^\s*module\([\'\"](.*)[\'\"]\)\.requires\(.*toRun\(.*$/);
        if (!match) return null;
		if (this.debugMode)
			console.log('Found module start in line ' +  this.currentLineNo());
        var descr = new ide.FileFragment(match[1], 'moduleDef', this.ptr, null, this.currentLineNo(), this.fileName);
        this.ptr += match[0].length + 1;
        return descr;
    },
    
    parseUsingBegin: function() {
        var match = this.currentLine.match(/^\s*using\((.*)\)\.run\(.*$/);
        if (!match) return null;
		if (this.debugMode)
			console.log('Found using start in line ' +  this.currentLineNo());
        var descr = new ide.FileFragment(match[1], 'usingDef', this.ptr, null, this.currentLineNo(), this.fileName);
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
        //     return 'methodDef';
        // if (/^[\s]*([\w]+)\:/.test(this.currentLine))
        //     return 'propertyDef';
        // if (/^[\s]*function[\s]+([\w]+)[\s]*\(.*\)[\s]*\{.*/.test(this.currentLine)
        //         || /^[\s]*var[\s]+([\w]+)[\s]*\=[\s]*function\(.*\)[\s]*\{.*/.test(this.currentLine))
        //             return 'functionDef';
        if (/^[\s]*Object\.extend.*$/.test(this.currentLine) || /^.*\.addMethods\(.*$/.test(this.currentLine))
                return 'klassExtensionDef';
        // if (/^[\s]*\(function.*/.test(this.currentLine))
        //         return 'executedFuncDef';
        return null;
    },

	parseNextPart: function() {
		var descr;
		if (!this.specialDescriptors) this.specialDescriptors = [];
		
		if (descr = this.parseUsingBegin() || this.parseModuleBegin()) { // FIXME nested module/using
			if (this.specialDescriptors.length > 0) this.specialDescriptors.last().subElements.push(descr);
			else this.changeList.push(descr);
			this.specialDescriptors.push(descr)
			return descr;
		};

		if (descr = this.parseModuleOrUsingEnd(this.specialDescriptors.last())) {
		    this.specialDescriptors.pop();
			return descr;
		};

		if (descr = this.parseWithOMeta(this.giveHint())) {
			if (this.specialDescriptors.length > 0) this.specialDescriptors.last().subElements.push(descr);
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
		var descr;
		if (descr = this.parseWithOMeta(this.giveHint())) {
			this.changeList.push(descr);
			return descr;
		}
		
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
    
    rootFragmentForModule: function(moduleOrModuleName) {
        if (!Object.isString(moduleOrModuleName) || !(moduleOrModuleName.endsWith('.js') || moduleOrModuleName.endsWith('.txt')))
            throw dbgOn(new Error('I do not support modules yet... ' + moduleOrModuleName + ', sorry!'));
        return this.modules[moduleOrModuleName];
    },
    
    addModule: function(fileName, fileString) {
		if (this.modules[fileName]) return this.modules[fileName];
        fileString = fileString || this.getCachedText(fileName);
		var root;
		if (fileName.endsWith('.js')) {
			root = this.parseJs(fileName, fileString);
		} else if (fileName.endsWith('.txt')) {
			root = this.parseOmeta(fileName, fileString);
		} else { 
			throw dbgOn(new Error('Don\'t know how to parse ' + fileName))
		}
        root.flattened().forEach(function(ea) { ea.sourceControl = this }, this);
        this.modules[fileName] = root;
        return root;
    },
    
	parseJs: function(fileName, fileString) {
		var fileFragments = new JsParser().parseSource(fileString, {fileName: fileName});
        var root;
        var firstRealFragment = fileFragments.detect(function(ea) { return ea.type !== 'comment' });
        if (firstRealFragment.type === 'moduleDef')
            root = firstRealFragment;
        else
            root = new lively.ide.FileFragment(fileName, 'completeFileDef', 0, fileString.length-1, null, fileName, fileFragments, this);
        return root;
	},

	parseOmeta: function(fileName, fileString) {
		var fileFragments = new OMetaParser().parseSource(fileString, {fileName: fileName});
        var root = new lively.ide.FileFragment(fileName, 'ometaGrammar', 0, fileString.length-1, null, fileName, fileFragments, this);
        return root;
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
    return [ 'Tests/ToolsTests.js', 'test.js']
    //return [];
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
 
// another SourceCodeDescriptor
Object.subclass('lively.ide.FileFragment', {
 
    initialize: function(name, type, startIndex, stopIndex, lineNo, fileName, subElems, srcCtrl) {
        this.name = name;
        this.type = type;
        this.startIndex = startIndex;
        this.stopIndex = stopIndex;
        this.lineNo = lineNo;   // FIXME make virtual
        this.fileName = fileName;
        this.subElements = subElems || [];
        this.sourceControl = srcCtrl;
    },
    
    fragmentsOfOwnFile: function() {
        return this.getSourceControl().rootFragmentForModule(this.fileName).flattened().without(this);
    },
    
	findOwnerFragment: function() {
		if (!this.fileName) throw dbgOn(new Error('no fileName for fragment ' + this));
		return this.getSourceControl().modules[this.fileName].flattened().detect(function(ea) {
			return ea.subElements.include(this);
		}, this);
	},

    flattened: function() {
        return this.subElements.inject([this], function(all, ea) {
            return all.concat(ea.flattened());
        });
    },
 
    checkConsistency: function() {
        this.fragmentsOfOwnFile().any(function(ea) { // Just a quick check if fragments are ok...
            if (this.flattened().include(ea)) return;
            if ((this.startIndex < ea.startIndex && ea.startIndex < this.stopIndex)
                    || (this.startIndex < ea.stopIndex && ea.stopIndex < this.stopIndex))
                throw new Error('Malformed fragment: ' + ea.name + ' ' + ea.type);
        }, this);
    },
    
    getSourceCode: function() {
        if (!this.fileName) throw dbgOn(new Error('No filename for descriptor ' + this.name));
        return this.getFileString().substring(this.startIndex, this.stopIndex+1);
    },
 
	getSourceCodeWithoutSubElements: function() {
		var completeSrc = this.getSourceCode();
		return this.subElements.inject(completeSrc, function(src, ea) {
			var elemSrc = ea.getSourceCode();
			var start = src.indexOf(elemSrc);
			var end = elemSrc.length-1 + start;
			return src.substring(0,start) + src.substring(end+1);
		});
    },

    putSourceCode: function(newString) {
        if (!this.fileName) throw dbgOn(new Error('No filename for descriptor ' + this.name));

        var newMe = this.reparse(newString);
        dbgOn(!newMe);
        if (/*newMe.type !== this.type ||*/ /*bla*/ this.startIndex !== newMe.startIndex)
            throw dbgOn(new Error("Inconsistency when reparsing fragment " + this.name + ' ' + this.type));
		if (newMe.type !== this.type) {
			var msg = Strings.format('Error occured during parsing.\n%s (%s) was parsed as %s. End line: %s.\nChanges are NOT saved.\nRemove the error and try again.',
				this.name, this.type, newMe.type, newMe.stopLine());
			console.warn(msg);
			WorldMorph.current().alert(msg);
			return;
		}

		var newFileString = this.buildNewFileString(newString);
        this.getSourceControl().putSourceCodeFor(this, newFileString);
        
        /*if (newMe.getSourceCode() !== newString) {
            console.warn('newString not equal source of new fragment...???!!!');
            console.log(newMe.getSourceCode());
            console.log('vs');
            console.log(newString)
        }
         */   

        this.updateIndices(newString, newMe);
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

		// FIXME time to cleanup!!!
		var parser;
		if (this.type === 'ometaDef' || this.type === 'ometaRuleDef') {
			parser = new OMetaParser();
			parser.ptr = this.startIndex;
        	parser.src = newFileString;
        	parser.lines = newFileString.split(/[\n\r]/);
        	parser.fileName = this.fileName;
        	return parser.parseWithOMeta(this.type);
		}

        parser = new JsParser();
        if (this.type === 'moduleDef')
            return parser.parseSource(newFileString, {ptr: this.startIndex, fileName: this.fileName})[0];

        parser.ptr = this.startIndex;
        parser.src = newFileString;
        parser.lines = newFileString.split(/[\n\r]/);
        parser.fileName = this.fileName;
        return parser.parseWithOMeta(this.type);
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
        this.subElements = newMe.subElements;
		this.flattened().forEach(function(ea) { ea.sourceControl = this.sourceControl }, this);
    },
    
    getSourceControl: function() {
        var ctrl = this.sourceControl || tools.SourceControl;
        if (!ctrl) throw dbgOn(new Error('No sourcecontrol !! '));
        if (!(ctrl instanceof AnotherSourceDatabase)) throw dbgOn(new Error('Using old source control, could lead to errors...'));
        return ctrl;
    },

	sourceCodeWithout: function(childFrag) {
		if (!this.flattened().include(childFrag)) throw dbgOn(new Error('Fragment' + childFrag + ' isn\'t in my (' + this + ') subelements!'));
		var mySource = this.getSourceCode();
		var childSource = childFrag.getSourceCode();
		x = childSource;
		var start = mySource.indexOf(childSource);
		if (start === -1) throw dbgOn(new Error('Cannot find source of ' + childFrag));
		var end = start + childSource.length;
		var newSource = mySource.slice(0, start) + mySource.slice(end);
		return newSource;
	},

	remove: function() {
		var owner = this.findOwnerFragment();
		if (!owner) throw dbgOn(new Error('Cannot find owner of fragment ' + this));
		var newSource = owner.sourceCodeWithout(this);
		y = newSource;
		owner.subElements = owner.subElements.without(this);
		owner.putSourceCode(newSource);
	},

    getFileString: function() {
        if (!this.fileName) throw dbgOn(new Error('No filename for descriptor ' + this.name));
        return this.getSourceControl().getCachedText(this.fileName);
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
		return JsParser.prototype.findLineNo(this.getFileString().split('\n'), this.stopIndex);
	},
    
    toString: function() {
        return Strings.format('%s: %s (%s-%s in %s, starting at line %s, %s subElements)',
            this.type, this.name, this.startIndex, this.stopIndex, this.fileName, this.lineNo, this.subElements && this.subElements.length);
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
		} else if (this.type === 'methodDef') {
			browser.inPaneSelectNodeNamed('Pane1', this.fileName);
			browser.inPaneSelectNodeNamed('Pane2', this.className);
			browser.inPaneSelectNodeNamed('Pane3', this.name);
		}
		return browser;
	}
});

ide.FileFragment.subclass('lively.ide.ParseErrorFileFragment', {

	isError: true,

	initialize: function($super, fileString, name, type, startI, stopI, lineNo, fileName, subElems, srcCtrl) {
		$super(name, type, startI, stopI, lineNo, fileName, subElems, srcCtrl);
		this.fileString = fileString;
    },

	getFileString: function() {
        return this.fileString
    },
});

Morph.subclass('TestMorph', {
        style: {borderColor: Color.black, 
        	    fill: lively.lang.let(lively.paint, function(g) { 
        		return new g.RadialGradient([new g.Stop(0, Color.blue.lighter()) , new g.Stop(0.5, Color.blue), 
        					     new g.Stop(1, Color.blue.darker())], pt(0.4, 0.2))})
        	   },
});

});