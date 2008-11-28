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
    formals: ["Pane1Content", "Pane1Selection", "Pane1Choicer", "Pane1Menu",
              "Pane2Content", "Pane2Selection", "Pane2Choicer", "Pane2Menu",
              "Pane3Content", "Pane3Selection", "Pane3Choicer", "Pane3Menu",
              "SourceString", "StatusMessage"],
 
    initialize: function($super) { 
        $super();
 		//test123
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
 
    rootNode: function() {
        throw dbgOn(new Error('To be implemented from subclass'));
    },
 
	selectedNode: function() {
		return this.getPane3Selection() || this.getPane2Selection() || this.getPane1Selection();
	},

    start: function() {
        this.setPane1Content(this.rootNode().childNodesAsListItems());
    },
 
    buildView: function (extent) {
 
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
        this.setPane2Content(['-----']);
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
        this.setPane3Content(['-----']);        
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
        if (methodString == '-----') return;
        if (this.selectedNode().sourceString() == methodString) return;
        this.selectedNode().newSource(methodString);
        this.nodeChanged(this.selectedNode());
    },
 
    nodesInPane: function(paneName) { // panes have listItems, no nodes
        var listItems = this['get' + paneName + 'Content']();
        if (!listItems) return [];
        return listItems.collect(function(ea) { return ea.value })    
    },
 
    siblingsFor: function(node) {
        var siblings = ['Pane1', 'Pane2', 'Pane3']
            .collect(function(ea) { return this.nodesInPane(ea) }.bind(this))
            .detect(function(ea) { return ea.include(node) });
        if (!siblings) return null;
        return siblings.without(node);
    },
    
	allChanged: function() {
	      // FIXME remove duplication
        var oldN1 = this.getPane1Selection();
        var oldN2 = this.getPane2Selection();
        var oldN3 = this.getPane3Selection();
        this.start();
        
        if (oldN1) {
            var newN1 = this.nodesInPane('Pane1').detect(function(ea) { return ea.target === oldN1.target });
            this.setPane1Selection(newN1, true);
        }
        if (oldN2) {
            var newN2 = this.nodesInPane('Pane2').detect(function(ea) { return ea.target === oldN2.target });
            this.setPane2Selection(newN2, true);
        }
        if (oldN3) {
            var newN3 = this.nodesInPane('Pane3').detect(function(ea) { return ea.target === oldN3.target });
            this.setPane3Selection(newN3, true);
        }
},

    nodeChanged: function(node) {
        // currently update everything, this isn't really necessary
  		this.allChanged();
    },
 
	textChanged: function(node) {
		 this.setSourceString(node.sourceString());
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
			if (!wanted) return;
			var list = this.panel[paneName].innerMorph();
			var i = list.itemList.indexOf(wanted);
			list.selectLineAt(i, true /*should update*/);
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
			if (a.string < b.string) return -1;
			if (a.string > b.string) return 1;
			return 0;
		});
    },
 
    asString: function() {
        return 'no name for node of type ' + this.constructor.type;
    },
 
    sourceString: function() {
        return '-----'
    },
 
    newSource: function(newSource) {
        // throw dbgOn(new Error("Shouldn't try to eval and save things now..."));
        if (!this.evalSource(newSource)) {
            console.log('couldn\'t eval');
        }
        if (!this.saveSource(newSource, tools.SourceControl))
            console.log('couldn\'t save');
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
        return this.target.subNamespaces(true).concat([this.target]).collect(function(ea) { return new ide.NamespaceNode(ea, this.browser) }.bind(this));
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
            	return new ide.CompleteFileFragmentNode(this.target.rootFragmentForModule(ea), this.browser, ea);
        	}.bind(this));
    }
});
 
ide.BrowserNode.subclass('lively.ide.FileFragmentNode', {
    
    sourceString: function() {
        this.savedSource = this.target.getSourceCode();
		return this.savedSource;
    },
    
    asString: function() {
        return this.target.name || this.sourceString().truncate(22).replace('\n', '') + '(' + this.type + ')'
    },
    
    saveSource: function(newSource, sourceControl) {
		if (!this.hasCurrentSource()) throw dbgOn(new Error('Old Source, Refresh!'));
        this.target.putSourceCode(newSource);
		this.savedSource = this.target.getSourceCode(); // assume that users sees newSource after that
        return true;
    },

	hasCurrentSource: function() {
		if (!this.target) return false;
		if (!this.savedSource) return false;
		return this.savedSource == this.target.getSourceCode();
	}
    
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
    },
    
    menuSpec: function() {
    		var node = this;
    		if (!this.target) return [];
    		return [
    			['toggle showAll', function() {
    				node.showAll = !node.showAll;
    				node.signalTextChange()}],
    			['open ChangeList viewer', function() {
    				new ChangeList(node.moduleName, null, node.target.flattened()).openIn(WorldMorph.current())}]
    		];

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
        return this.moduleName + (this.target ? '' : ' (not loaded)');
    },

	loadModule: function() {
		if (this.target) return;
		this.target = tools.SourceControl.addModule(this.moduleName);
		this.signalChange();
	}
    
});


ide.FileFragmentNode.subclass('lively.ide.ClassFragmentNode', {
 
    childNodes: function() {
        var classFragment = this.target;
        var browser = this.browser;
        return classFragment.subElements
            .select(function(ea) { return ea.type === 'propertyDef' || ea.type === 'methodDef' })
            // .sort(function(a,b) { if (!a.name || !b.name) return -999; return a.name.charCodeAt(0)-b.name.charCodeAt(0) })
            .collect(function(ea) { return new ide.ClassElemFragmentNode(ea, browser) });
    },

	menuSpec: function() {
		var fragment = this.target;
		var index = fragment.name.lastIndexOf('.');
		// don't search for complete namespace name, just its last part
		var searchName = index === -1 ? fragment.name : fragment.name.substring(index+1);
		return [
    		['references', function() {
					var list = tools.SourceControl
						.searchFor(searchName)
						.without(fragment)
					var title = 'references of' + fragment.name;
					new ChangeList(title, null, list, searchName).openIn(WorldMorph.current()) }]]
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

	menuSpec: function() {
		var fragment = this.target;
		var searchName = fragment.name;
		return [
    		['senders', function() {
					var list = tools.SourceControl
						.searchFor(searchName)
						.select(function(ea) {
							if (!ea.name.include(searchName)) return true;
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
    	];
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
		return 'load all modules'
	},

	trigger: function() {
		var srcCtrl = tools.SourceControl;
		srcCtrl.interestingLKFileNames()
			.concat(srcCtrl.preLoadFileNames())
			.forEach(function(ea) { srcCtrl.addModule(ea) });
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

ide.BrowserCommand.subclass('lively.ide.AlphabetizeCommand', {

	wantsButton: function() {
		return true;
	},

	asString: function() {
		if (this.browser.alphabetize) return 'unsort';
		return 'sort'
	},

	trigger: function() {
		this.browser.alphabetize = !this.browser.alphabetize;
		this.browser.allChanged();
	}

});


// ===========================================================================
// Another File Parser - uses mostly OMeta for parsing LK sources
// ===========================================================================
Object.subclass('AnotherFileParser', {
    
    debugMode: false,
    
    documentation: 'Extended FileParser. Scans source code and extracts SourceCodeDescriptors for ' +
                   'classes, objects, functions, methods. Uses OMeta.',
    
    ometaRules: [/*'blankLine',*/ 'comment',
               'klassDef', 'objectDef', 'klassExtensionDef',
               'functionDef', 'staticFuncDef', 'executedFuncDef', 'methodModificationDef',
               'unknown'],
 
    initialize: function(ometaParser) {
        this.ometaParser = ometaParser;
    },
    
    callOMeta: function(rule, src) {
        if (!this.ometaParser) throw dbgOn(new Error('No OMeta parser for parsing file sources!'))
        return OMetaSupport.matchAllWithGrammar(this.ometaParser, rule, src || this.src, !this.debugMode/*hideErrors?*/);
    },
    
    parseClass: function() {
        return this.callOMeta("klassDef");
    },
    
    /* parsing */
    prepareParsing: function(src, config) {
        this.src = src;
        this.lines = src.split(/[\n\r]/);
        this.changeList = [];
        
        this.ptr = (config && config.ptr) || 0;
        this.fileName = (config && config.fileName) || null;
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
        if (specialDescr.length === 0) return null;
        var match = this.currentLine.match(/^\s*\}.*?\)[\;]?.*$/);
        if (!match) return null;
		if (this.debugMode) {
			if (specialDescr.last().type === 'moduleDef')
				console.log('Found module end in line ' +  this.currentLineNo());
			if (specialDescr.last().type === 'usingDef')
				console.log('Found using end in line ' +  this.currentLineNo());
		}
        specialDescr.last().stopIndex = this.ptr + match[0].length - 1;
        this.ptr = specialDescr.last().stopIndex + 1;
        // FIXME hack
        if (this.src[this.ptr] == '\n') {
            specialDescr.last().stopIndex += 1;
            this.ptr += 1;
        }
        return specialDescr.last();
    },
    
    parseWithOMeta: function(hint) {
        var partToParse = this.src.substring(this.ptr, this.src.length);
        var descr;
        if (hint) descr = this.callOMeta(hint, partToParse);
        // if (descr) console.log('hint helped!!!!');
        if (!descr)
            this.ometaRules.detect(function(rule) { return descr = this.callOMeta(rule, partToParse) }, this);
 
        if (descr === undefined)
            throw dbgOn(new Error('Could not parse src at ' + this.ptr));
        if (descr.stopIndex === undefined)
            throw dbgOn(new Error('Parse result has an error ' + JSON.serialize(descr) + 'ptr:' + this.ptr));
            
        var tmpPtr = this.ptr;
        this.ptr += descr.stopIndex + 1;
        this.fixIndicesAndMore(descr, tmpPtr);
        return descr;
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
    
    parseSource: function(src, optConfig /* FIXME */) {
        var msParseStart;
        var msStart = new Date().getTime();
        this.overheadTime = 0;
        
        this.prepareParsing(src, optConfig);
        var specialDescr = [];
        var descr;
        
        while (this.ptr < this.src.length) {
            if (this.debugMode) msParseStart = new Date().getTime();
            
            this.currentLine = this.lines[this.currentLineNo()-1];
            var tmpPtr = this.ptr;
 
            /*******/
           if (descr = this.parseUsingBegin() || this.parseModuleBegin()) { // FIXME nested module/using
               if (specialDescr.length > 0) specialDescr.last().subElements.push(descr);
               else this.changeList.push(descr);
               specialDescr.push(descr);
            } else if (this.parseModuleOrUsingEnd(specialDescr)) {
                specialDescr.pop();
                continue;
            } else if (descr = this.parseWithOMeta(this.giveHint())) {
                if (specialDescr.length > 0) specialDescr.last().subElements.push(descr);
                else this.changeList.push(descr);
            } else {
                throw new Error('Could not parse ' + this.currentLine + ' ...');
            }
            /*******/
            if (this.ptr <= tmpPtr) throw dbgOn(new Error('Could not go forward: ' + tmpPtr));

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
        
        if (specialDescr.length > 0)
            throw dbgOn(new Error('Couldn\'t find end of ' + specialDescr.last().type));
        
        console.log('Finished parsing in ' + (new Date().getTime()-msStart)/1000 + ' s');
        // console.log('Overhead:................................' + this.overheadTime/1000 + 's');
 
        return this.changeList;
    },
    
    /* helper */
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
 
Object.extend(AnotherFileParser, {
    
    grammarFile: 'LKFileParser.txt',    
    
    withOMetaParser: function(force) {
        var prototype;
        if (force)
            prototype = OMetaSupport.fromFile(AnotherFileParser.grammarFile);
        else
            prototype = LKFileParser || OMetaSupport.fromFile(AnotherFileParser.grammarFile);
        var parser = Object.delegated(prototype, {_owner: this});
        return new AnotherFileParser(parser);
    },
    
    parseAndShowFileNamed: function(fileName) {
        var chgList = AnotherFileParser.withOMetaParser().parseFileFromUrl(URL.source.withFilename(fileName));
        new ChangeList(fileName, null, chgList).openIn(WorldMorph.current()); 
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
    },
    
    rootFragmentForModule: function(moduleOrModuleName) {
        if (!Object.isString(moduleOrModuleName) || !moduleOrModuleName.endsWith('.js'))
            throw dbgOn(new Error('I do not support modules yet... ' + moduleOrModuleName + 'isn\'t valid, sorry!'));
        return this.modules[moduleOrModuleName];
    },
    
    reparse: function(fragment) {
        // this does not belong here ... 
        if (!(fragment instanceof lively.ide.FileFragment)) throw dbgOn(new Error('Strange fragment'));
        var parser = AnotherFileParser.withOMetaParser();
        
        // FIXME whoaa, that's ugly, better dispatch in fragments!
        if (fragment.type === 'moduleDef') {
            return parser.parseSource(fragment.getFileString(), {ptr: fragment.startIndex, fileName: fragment.fileName})[0];
        }        
        parser.ptr = fragment.startIndex;
        parser.src = fragment.getFileString();
        parser.lines = parser.src.split(/[\n\r]/);
        parser.fileName = fragment.fileName;
        return parser.parseWithOMeta(fragment.type);
    },
    
    addModule: function(fileName, fileString) {
		if (this.modules[fileName]) return this.modules[fileName];
        fileString = fileString || this.getCachedText(fileName);
        var fileFragments = AnotherFileParser.withOMetaParser().parseSource(fileString, {fileName: fileName});
        var root;
        var firstRealFragment = fileFragments.detect(function(ea) { return ea.type !== 'comment' });
        if (firstRealFragment.type === 'moduleDef')
            root = firstRealFragment;
        else
            root = new lively.ide.FileFragment(fileName, 'completeFileDef', 0, fileString.length-1, null, fileName, fileFragments, this);
        root.flattened().forEach(function(ea) { ea.sourceControl = this }, this);
        this.modules[fileName] = root;
        return root;
    },
    
    putSourceCodeFor: function(fileFragment, newString) {
        if (!(fileFragment instanceof lively.ide.FileFragment)) throw dbgOn(new Error('Strange fragment'));
        var fileString = fileFragment.getFileString();
        var beforeString = fileString.substring(0, fileFragment.startIndex);
        var afterString = fileString.substring(fileFragment.stopIndex+1);
        var newFileString = beforeString.concat(newString, afterString);
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
		return [ 'Tests/ToolsTests.js' ]
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
    
    updateIndices: function(newSource) {
        this.checkConsistency();
        
        var prevStop = this.stopIndex;
        var newStop = this.startIndex + newSource.length - 1;
        var delta = newStop - prevStop;
        
        this.stopIndex = newStop;    // self
        
        // update fragments which follow after this or where this is a part of
        this.fragmentsOfOwnFile().each(function(ea) {
            if (ea.stopIndex < prevStop) return;
            ea.stopIndex += delta;
            if (ea.startIndex <= prevStop) return;
            ea.startIndex += delta;
        });
 
        // re parse this for updating the subelements
        var newMe = this.getSourceControl().reparse(this);
        dbgOn(!newMe);
        if (newMe.type !== this.type || this.startIndex !== newMe.startIndex || this.stopIndex !== newMe.stopIndex)
            throw dbgOn(new Error("Inconsistency when reparsing fragment " + this.name + ' ' + this.type));
		this.name = newMe.name; // for renaming
        this.subElements = newMe.subElements;
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
        this.getSourceControl().putSourceCodeFor(this, newString);
        // dbgOn(true);
        this.updateIndices(newString);
    },
    
    getSourceControl: function() {
        var ctrl = this.sourceControl || tools.SourceControl;
        if (!ctrl) throw dbgOn(new Error('No sourcecontrol !! '));
        if (!(ctrl instanceof AnotherSourceDatabase)) console.warn('Using old source control, could lead to errors...');
        return ctrl;
    },
    
    getFileString: function() {
        if (!this.fileName) throw dbgOn(new Error('No filename for descriptor ' + this.name));
        return this.getSourceControl().getCachedText(this.fileName);
    },
    
    newChangeList: function() {
        throw dbgOn(new Error('Not yet!'));
    },
    
    toString: function() {
        return Strings.format('%s: %s (%s-%s in %s, starting at line %s, %s subElements)',
            this.type, this.name, this.startIndex, this.stopIndex, this.fileName, this.lineNo, this.subElements.length);
    },
 
    inspect: function() {
    	try { return this.toString() } catch (err) { return "#<inspect error: " + err + ">" }
	}
    
})
 
});