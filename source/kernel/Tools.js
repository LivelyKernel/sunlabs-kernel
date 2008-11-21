 /*
 * Copyright � 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

/**
 * Tools.js.  This file defines various tools such as the class browser,
 * object inspector, style editor, and profiling and debugging capabilities.  
 */

module('lively.Tools').requires('lively.Text' /*,'lively.Ometa'*/).toRun(function(module, text) {

// Modules: "+Modules" --> setModule in model
// Modules: "-Modules" --> getModule in model
// Modules: "Modules" --> getModule and getModule in model, onModuleUpdate required

//ModulesMenu: [
// ['test', function() { console.log('click!') }],
// ['sub', [['test2', function() { console.log('click2!') }]]]
// ]



Widget.subclass('lively.Tools.SystemBrowser', {

    documentation: 'Widget with three list panes and one text pane. Uses nodes to display and manipulate content.',
    viewTitle: "Enhanced Javascript Code Browser",
    initialViewExtent: pt(620, 450),
    formals: ["Pane1Content", "Pane1Selection", "Pane1Choicer",
              "Pane2Content", "Pane2Selection", "Pane2Choicer",
              "Pane3Content", "Pane3Selection", "Pane3Choicer",
              "SourceString", "StatusMessage"],
    
    initialize: function($super) { 
        $super();
        
        this.onPane1ContentUpdate = Functions.Null;
        this.onPane2ContentUpdate = Functions.Null;
        this.onPane3ContentUpdate = Functions.Null;
        this.onStatusMessageUpdate = Functions.Null;
        var model = Record.newPlainInstance((function(){var x={};this.formals.each(function(ea){x[ea]=null});return x}.bind(this))());
        this.relayToModel(model, {Pane1Content: "Pane1Content", Pane1Selection: "Pane1Selection",
                                  Pane2Content: "Pane2Content", Pane2Selection: "Pane2Selection",
                                  Pane3Content: "Pane3Content", Pane3Selection: "Pane3Selection",
                                  SourceString: "SourceString", StatusMessage: "StatusMessage"});
    },
    
    rootNode: function() {
        if (!this._rootNode)
            this._rootNode = new module.EnvironmentNode(Global, this);
        return this._rootNode;
    },
    
    start: function() {
        // FIXME this doesn't belong here
        
        if (!module.SourceControl) {
            module.SourceControl = new SourceDatabase();
            module.SourceControl.scanLKFiles();
        }
        
        this.setPane1Content(this.rootNode().childNodesAsListItems());
    },
    
    buildView: function (extent) {
        
        this.start();
        
        var panel = PanelMorph.makePanedPanel(extent, [
            ['Pane1', newRealListPane, new Rectangle(0, 0, 0.35, 0.40)],
            ['Pane2', newRealListPane, new Rectangle(0.35, 0, 0.3, 0.40)],
            ['Pane3', newRealListPane, new Rectangle(0.65, 0, 0.35, 0.45)],
            ['sourcePane', newTextPane, new Rectangle(0, 0.45, 1, 0.5)],
            ['statusPane', newTextPane, new Rectangle(0, 0.95, 1, 0.05)]
        ]);

        var model = this.getModel();
        var browser = this;
        
        function setupListPanes(paneName) {
            var morph = panel[paneName];
            morph.connectModel(model.newRelay({List: ("-" + paneName + "Content"), Selection: ('+' + paneName + 'Selection')}), true);
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
        
        panel.sourcePane.connectModel(model.newRelay({Text: "SourceString"}));
	
	panel.statusPane.connectModel(model.newRelay({Text: "-StatusMessage"}));
	
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
                ea.action.apply(node);
                btns.without(btns[i]).each(function(ea) { ea.changeAppearanceFor(false) });
                browser['set' + paneName + 'Selection'](node, true);
            }};
            btns[i].connectModel({model: btnSetValueWrapper, setValue: 'action'});
            btns[i].toggle = true;
            btns[i].setLabel(ea.label);
            btns[i]['is' + paneName + 'BrowserButton'] = true;
            morph.addMorph(btns[i]);
        })
    },
    
    hideButtons: function(evt, morph, paneName) {
        if (evt && morph.shape.containsPoint(morph.localize(evt.point()))) return;
        if (this['get' + paneName + 'Selection']() !== null) return;
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
        this.setSourceString(node.sourceString());
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
        this.setSourceString(node.sourceString());
    },
    
    onPane3SelectionUpdate: function(node) {
        this.setStatusMessage('');
        if (!node) {
            this.hideButtons(null, this.panel.Pane3, 'Pane3')
            return
        }
        this.setSourceString(node.sourceString());
    },
        
    onSourceStringUpdate: function(methodString) {
        if (methodString == '-----') return;
        var responsibleNode = this.getPane3Selection() || this.getPane2Selection() || this.getPane1Selection();
        if (responsibleNode.sourceString() == methodString) return;
        responsibleNode.newSource(methodString);
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
    }
});

Object.subclass('lively.Tools.BrowserNode', {
    
    documentation: 'Abstract node, defining the node interface',
    
    initialize: function(target, browser) {
        this.target = target;
        this.browser = browser;
    },
    
    siblingNodes: function() {
        if (!(this.browser instanceof module.SystemBrowser)) throw dbgOn(new Error('No browser when tried siblingNodes'));
        return this.browser.siblingsFor(this);
    },
    
    childNodes: function() {
        return []
    },
    
    childNodesAsListItems: function() {
        return this.childNodes().collect(function(ea) {
            return {isListItem: true, string: ea.asString(), value: ea}
        })
    },
    
    asString: function() {
        return 'no name for node of type ' + this.constructor.type;
    },
    
    sourceString: function() {
        return '-----'
    },
    
    newSource: function(newSource) {
        throw dbgOn(new Error("Shouldn't try to eval and save things now..."));
        if (!this.evalSource(newSource)) {
            console.log('couldn\'t eval');
            return
        }
        if (!this.saveSource(newSource, module.SourceControl))
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
    
    statusMessage: function(string) {
        this.browser && this.browser.setStatusMessage(string);
    }
    
});
    
module.BrowserNode.subclass('lively.Tools.EnvironmentNode', {
        
    childNodes: function() {
        return this.target.subNamespaces(true).concat([this.target]).collect(function(ea) { return new module.NamespaceNode(ea, this.browser) }.bind(this));
    }
});

module.BrowserNode.subclass('lively.Tools.NamespaceNode', { // rename to ModuleNode

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
                .collect(function(ea) { return new module.ClassNode(ea, browser) });
           case "functions":
            return Object.keys(this.target)
                .select(function(ea) { return ns[ea] && ns.hasOwnProperty(ea) && !Class.isClass(ns[ea]) && Object.isFunction(ns[ea]) && !ns[ea].declaredClass})
                .sort()
                .collect(function(ea) { return new module.FunctionNode(ns[ea], browser, ea) });
           case "objects":
            return Object.keys(ns)
                .reject(function(ea) { return Object.isFunction(ns[ea]) })
                .sort()
                .collect(function(ea) { return new module.ObjectNode(ns[ea], browser, ea) });
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

module.BrowserNode.subclass('lively.Tools.ClassNode', {
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
                    .collect(function(ea) { return new module.MethodNode(theClass.prototype[ea], browser, theClass) });
            case "class":
                return Object.keys(theClass)
                    .sort()
                    .select(function(ea) { return theClass.hasOwnProperty(ea) && Object.isFunction(theClass[ea]) && !Class.isClass(theClass[ea])})
                    .collect(function(ea) { return new module.ClassMethodNode(theClass[ea], browser, theClass, ea) });
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
        var source = module.SourceControl.methodDictFor(this.target.type)['*definition'];
        if (source) {
            this.statusMessage('Definition of class of SourceDB.');
            return source.getSourceCode()
        };
        this.statusMessage('No definition of class in SourceDB found.');
        return 'class def of ' + this.target.type
    },
});

module.BrowserNode.subclass('lively.Tools.ObjectNode', {
    
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
            .collect(function(ea) { return new module.FunctionNode(obj[ea], browser, ea) });
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

module.BrowserNode.subclass('lively.Tools.MethodNode', {
    
    initialize: function($super, target, browser, theClass) {
        $super(target, browser);
        this.theClass = theClass;
    },
    
    methodName: function() {
        return this.target.methodName || this.target.name || 'method without property methodName'
    },
    
    sourceString: function() {
        if (!module.SourceControl) {
            this.statusMessage('No SourceDB available, using decompiled source');
            return '// Decompiled source:\n' + this.target.toString();
        };
        
        var source = module.SourceControl.methodDictFor(this.theClass.type)[this.methodName()];
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

module.MethodNode.subclass('lively.Tools.ClassMethodNode', {
    
    initialize: function($super, target, browser, theClass, nameInOwner) {
        $super(target, browser, theClass);
        this.nameInOwner = nameInOwner;
    },
    
    asString: function() {
        return this.nameInOwner || this.target.name || 'anonymous class function';
    },
        
});
module.BrowserNode.subclass('lively.Tools.FunctionNode', {
    
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

// ===========================================================================
// Class Browser -- A simple browser for Lively Kernel code
// ===========================================================================

Widget.subclass('SimpleBrowser', {

    viewTitle: "Javascript Code Browser",
    pins: ["+ClassList", "-ClassName", "+MethodList", "-MethodName", "MethodString", "+ClassPaneMenu"],

    initialize: function($super) { 
        var model = new SyntheticModel(this.pins);
        var plug = model.makePlugSpecFromPins(this.pins);
        $super(plug); 
        this.scopeSearchPath = [Global];
        model.setClassList(this.listClasses());
        // override the synthetic model logic to recompute new values
        var browser = this;
        model.getClassPaneMenu = function() {
           return browser.getClassPaneMenu();
        }
    },

    updateView: function(aspect, source) {
        var p = this.modelPlug;
        if (!p) return;

        switch (aspect) {
        case p.getClassName:
            var className = this.getModelValue('getClassName');
        this.setModelValue("setMethodList", this.listMethodsFor(className));
        break;
        case p.getMethodName:
            var methodName = this.getModelValue("getMethodName");
            var className = this.getModelValue("getClassName");
            var source = this.getMethodStringFor(className, methodName);    
            if (Config.highlightSyntax)
                require('Ometa.js').toRun(function() {
                    source = new SyntaxHighlighter().highlightFunction(source);
                    //FIXME for setting rich text, otherwise hard to implmenent currently
                    var textMorph = this.getModel().dependents.detect(function(ea) { return ea instanceof TextMorph});
                    textMorph.setRichText(source);
                }.bind(this));
            else this.setModelValue("setMethodString", source);
            
            break;
        case p.getMethodString:
            var className = this.getModelValue("getClassName");
            var methodName = this.getModelValue("getMethodName");
            var methodString = this.getModelValue("getMethodString");
            var methodDef = className + ".prototype." + methodName + " = " + methodString;
	    try {
                eval(methodDef);
            } catch (er) {
                WorldMorph.current().alert("error evaluating method " + methodDef);
            }
            ChangeSet.current().logChange({type: 'method', className: className, methodName: methodName, methodString: methodString});
            break;
        }
    },

    listClasses: function() { 
        return Global.classes(true)
		.collect(function(ea) {return Class.className(ea)})
		.select(function(ea) {return !ea.startsWith("anonymous")})
		.concat(["Global"])
		.sort();  
    },


    listMethodsFor: function(className) {
        if (className == null) return [];
        var sorted = (className == 'Global')
            ? this.functionNames(Global).sort()
            : Class.forName(className).localFunctionNames().sort();
        var defStr = "*definition";
        var defRef = module.SourceControl && module.SourceControl.getSourceInClassForMethod(className, defStr);
        return defRef ? [defStr].concat(sorted) : sorted;
    },
    
    functionNames: function(namespace) {
	// This logic should probably be in, eg, Namespace.functionNames()
	return Object.keys(namespace)
		.select(function(ea) {
			var func = namespace[ea];
			return func && !Class.isClass(func) && Object.isFunction(func) && !func.declaredClass})
		.collect(function(ea) { return namespace[ea].name || ea})
    },
    
    getMethodStringFor: function(className, methodName) { 
        if (!className || !methodName) return "no code"; 
	if (module.SourceControl) 
	    var source = module.SourceControl.getSourceInClassForMethod(className, methodName);
	    if(source) return source;
	var func = (className == "Global") ? Global[methodName] : Class.forName(className).prototype[methodName];
	if (!func) return "-- no code --";
	if (module.SourceControl) return "// **Decompiled code** //\n" + func.getOriginal().toString();
	return func.getOriginal().toString();
    },
    
    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['leftPane', newTextListPane, new Rectangle(0, 0, 0.5, 0.5)],
            ['rightPane', newTextListPane, new Rectangle(0.5, 0, 0.5, 0.5)],
            ['bottomPane', newTextPane, new Rectangle(0, 0.5, 1, 0.5)]
        ]);
        var model = this.getModel();
        var m = panel.leftPane;
        m.connectModel({model: model, getList: "getClassList", setSelection: "setClassName", getSelection: "getClassName", getMenu: "getClassPaneMenu"});
        m.updateView("getClassList");
        m = panel.rightPane;
        m.connectModel({model: model, getList: "getMethodList", setSelection: "setMethodName"});
        m = panel.bottomPane;
        m.innerMorph().textSelection.borderRadius = 0;
        m.connectModel({model: model, getText: "getMethodString", setText: "setMethodString", getMenu: "default"});
        return panel;
    },

    getClassPaneMenu: function() {
        var items = [];
        var className = this.getModelValue("getClassName");
        if (className != null) {
            var theClass = Global[className];
            items.push(['make a new subclass', 
                    function() { WorldMorph.current().prompt("name of subclass", this.makeSubclass.bind(this));}.bind(this)]);
            if (theClass.prototype != null) {
                items.push(['profile selected class', 
                    function() { showStatsViewer(theClass.prototype, className + "..."); }]);
            }
        }
        if (!URL.source.protocol.startsWith("file")) {
            items.push(['import source files', function() {
                if (! module.SourceControl) module.SourceControl = new SourceDatabase();
                // Note: the list isn't used anymore in importKernelFiles!
                module.SourceControl.importKernelFiles(["JSON.js", "miniprototype.js", "defaultconfig.js", "localconfig.js", "Base.js", "scene.js", "Core.js", "Text.js", "Widgets.js", "Network.js", "Data.js", "Storage.js", "Tools.js", "Examples.js", "Main.js"]);
                WorldMorph.current().setFill(new lively.paint.RadialGradient([Color.rgb(36,188,255), 1, Color.rgb(127,15,0)]));
            }]);
        }
        if (!Config.debugExtras) {
            items.push(['enable call tracing', function() {
                Config.debugExtras = true;
		lively.lang.Execution.installStackTracers();  
            }]);
        }
	items.push(["test showStack (in console)", lively.lang.Execution.showStack.curry(false)]);
	items.push(["test showStack (in viewer)", lively.lang.Execution.showStack.curry(true)]);
        if (Config.debugExtras) {
	    items.push(["test profiling (in console)", lively.lang.Execution.testTrace]);
	    items.push(["test tracing (in console)", this.testTracing]);
            items.push(['disable call tracing', function() {
                Config.debugExtras = false;
		lively.lang.Execution.installStackTracers("uninstall"); 
            }]);
        }
        return items; 
    },
    makeSubclass: function(subName) {
        var className = this.getModelValue("getClassName");
        var theClass = Global[className];
	theClass.subclass(subName, {});
	// Need to regenerate the class list and select the new sub
        this.getModel().setClassList(this.listClasses());
        this.getModel().setClassName(subName);
	var doitString = className + '.subclass("' + subName + '", {})';
	ChangeSet.current().logChange({type: 'subclass', className: className, subName: subName});

    },
    testTracing: function() {
	console.log("Function.prototype.logAllCalls = true; tracing begins...");
	Function.prototype.logAllCalls = true;
	this.toString();
	Function.prototype.logAllCalls = false;
    }
});
   
// ===========================================================================
// Object Hierarchy Browser
// ===========================================================================

WidgetModel.subclass('ObjectBrowser', {

    viewTitle: "Object Hierarchy Browser",
    openTriggerVariable: 'getObjectList',

    initialize: function($super, objectToView) {
        $super();
        this.fullPath     = ""; // The full pathname of the object (string)
        this.nameToView   = ""; // Current name ("node") that we are viewing
        this.objectToView = objectToView || Global; // Start by viewing the Global namespace if no argument
        return this;
    },

    getObjectList: function() {
        var list = [];
        for (var name in this.objectToView) list = list.concat(name);
        list.sort();

        // The topmost row in the object list serves as the "up" operation.
        list.unshift("..");

        if (this.panel) {
            var nameMorph = this.panel.namePane;
            var path = (this.fullPath != "") ? this.fullPath : "Global";
            nameMorph.setTextString(path);
        }

        return list;
    },

    setObjectName: function(n) {
        if (!n) return;

        // Check if we are moving up in the object hierarchy
        if (n.substring(0, 2) == "..") {
            var index = this.fullPath.lastIndexOf(".");
            if (index != -1) {
                this.fullPath     = this.fullPath.substring(0, index);
                this.objectToView = eval(this.fullPath);
            } else {
                this.fullPath     = "";
                this.objectToView = Global;
            }
            this.nameToView = "";
            this.changed("getObjectList");
            return;
        }

        // Check if we are "double-clicking" or choosing another item
        if (n != this.nameToView) {
            // Choosing another item: Get the value of the selected item
            this.nameToView = n;
            this.changed("getObjectValue");
        } else {
            // Double-clicking: Browse child
            if (this.fullPath != "") this.fullPath += ".";

            if ((this.objectToView instanceof Array) && !isNaN(parseInt(n))) {
                this.fullPath += "[" + n + "]";
            } else {
                this.fullPath += this.nameToView;
            }
            this.objectToView = eval(this.fullPath);
            // if (!this.objectToView) this.objectToView = Global;
            this.nameToView = "";
            this.changed("getObjectList");
        }
    },

    getObjectValue: function() {
        if (!this.objectToView || !this.nameToView || this.nameToView == "") return "(no data)";
        return Object.inspect(this.objectToView[this.nameToView]);
    },

    setObjectValue: function(newDef) { eval(newDef); },

    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['namePane', TextMorph, new Rectangle(0, 0, 1, 0.07)],
            ['topPane', newTextListPane, new Rectangle(0, 0.07, 1, 0.5)],
            ['bottomPane', newTextPane, new Rectangle(0, 0.5, 1, 0.5)]
        ]);

        this.panel = panel;

        var m = panel.topPane;
        m.connectModel({model: this, getList: "getObjectList", setSelection: "setObjectName"});
        m = panel.bottomPane;
        m.connectModel({model: this, getText: "getObjectValue", setText: "setObjectValue"});

        return panel;
    }

});

// ===========================================================================
// Object Inspector
// ===========================================================================

Widget.subclass('SimpleInspector', {

    description: "A simple JavaScript object (instance) inspector",

    initialViewExtent: pt(400,250),

    formals: ["+PropList", "PropName", "+PropText", "-Inspectee"],
    
    initialize: function($super, targetMorph) {
        $super();
        this.relayToModel(Record.newPlainInstance({PropList: [], PropName: null, Inspectee: targetMorph, PropText: "",
						   PropMenu: [['inspect selection', function() { 
						       var name = this.getPropName();
						       if (!name) return;
						       new SimpleInspector(this.propValue(name)).open()}.bind(this)]]}));
    },
    
    onPropTextUpdate: function(input, source) {
	if (source === this) return;
        var propName = this.getPropName();
        if (propName) {
	    var target = this.getInspectee();
	    try {
		var result = (interactiveEval.bind(this.target))(input);
	    } catch (er) { throw dbgOn(er); }
            target[propName] = result;
        }
    },

    onInspecteeUpdate: function(inspectee) {
	this.setPropList(Properties.all(inspectee));
    },

    onPropNameUpdate: function(propName) {
        var prop = this.propValue(propName);
	if (prop == null) {
            this.setPropText("----");
        } else {
            this.setPropText(Strings.withDecimalPrecision(Object.inspect(prop), 2));
        }
    },

    
    propValue: function(propName) {
        var target = this.getInspectee();
        return target ? target[propName] : undefined;
    },

    getViewTitle: function() {
        return Strings.format('Inspector (%s)', this.getInspectee()).truncate(50);
    },

    /*
    openIn: function(world, location) {
        // DI: experimental continuous update feature.  It works, but not removed upon close
        // var rightPane = window.targetMorph.rightPane.innerMorph();
        // rightPane.startStepping(1000, 'updateView', 'getPropText');
    },
   */

    buildView: function(extent, model) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['leftPane', newTextListPane, new Rectangle(0, 0, 0.5, 0.6)],
            ['rightPane', newTextPane, new Rectangle(0.5, 0, 0.5, 0.6)],
            ['bottomPane', newTextPane, new Rectangle(0, 0.6, 1, 0.4)]
        ]);
	
	var model = this.getModel();
	
        panel.leftPane.relayToModel(model, {List: "-PropList", Selection: "+PropName", Menu: "-PropMenu"});
	
	panel.rightPane.relayToModel(model, {Text: "PropText", DoitContext: "-Inspectee"});

	
	var m = panel.bottomPane;
	m.relayToModel(model, {DoitContext: "-Inspectee"});
        m.innerMorph().setTextString("doits here have this === inspectee");

        var widget = this;
        panel.morphMenu = function(evt) { // offer to inspect the current selection
            var menu = Class.getPrototype(this).morphMenu.call(this, evt);
            if (!widget.propValue(widget.getPropName())) return menu;
            menu.addLine();
            menu.addItem(['inspect selection', function() { 
                new SimpleInspector(widget.propValue(widget.getPropName())).open()}])
            return menu; 
        }
	// FIXME: note that we already relay to a model
	this.relayToModel(model, {PropList: "+PropList", PropName: "PropName", 
				  PropText: "PropText", Inspectee: "-Inspectee"}, true);

        return panel;
    }

});

// ===========================================================================
// Style Editor Panel
// ===========================================================================
Widget.subclass('StylePanel', {

    documentation: "Interactive style editor for morphs",
    initialViewExtent: pt(340,100),
    viewTitle: "Style Panel",

    initialize: function($super, targetMorph) {
        $super();
        this.targetMorph = targetMorph;
        var spec = targetMorph.makeStyleSpec();
	this.actualModel = Record.newPlainInstance({
	    BorderWidth: spec.borderWidth,
	    BorderColor: spec.textColor,
	    BorderRadius: spec.borderRadius,
	    FillOpacity: spec.fillOpacity,
	    StrokeOpacity: spec.strokeOpacity,
	    FontSize: spec.fontSize,
	    FontFamily: null, 
	    FillType: "simple", 
	    FillDir: null, 
	    Color1: null, 
	    Color2: null,
	    TextColor: null
	}); 
	this.actualModel.addObserver(this);
	this.color1 = null;
	this.color2 = null;
	this.fillDir = null;
	this.fillType = this.actualModel.getFillType();
	var base = targetMorph.getFill();
	this.baseColor = (base instanceof lively.paint.Gradient) ? base.stops[0].color() : base;
    },

    onBorderWidthUpdate: function(w) {
        this.targetMorph.setBorderWidth(w.roundTo(0.1));
    },

    onBorderColorUpdate: function(c) { // Maybe add a little color swatch in the view
        this.targetMorph.setBorderColor(c);
    },
    
    onBorderRadiusUpdate: function(r) {
        this.targetMorph.shapeRoundEdgesBy(r.roundTo(1));
    },

    onFillTypeUpdate: function(type) { this.fillType = type; this.setFill(); },
    onFillDirUpdate: function(dir) { this.fillDir = dir;  this.setFill(); },

    onColor1Update: function(color) { this.color1 = color; this.setFill(); },
    onColor2Update: function(color) { this.color2 = color; this.setFill(); },
    
    setFill: function() {
        if (this.fillType == null) this.fillType = 'simple';
        if (this.color1 == null) this.color1 = this.baseColor;
        if (this.color2 == null) this.color2 = this.baseColor;
	
        if (this.fillType == 'simple')  this.targetMorph.setFill(this.color1);
    
	var gfx = lively.paint;
        if (this.fillType == 'linear gradient') {
            if (this.fillDir == null) this.fillDir = 'NorthSouth';
            this.targetMorph.setFill(new gfx.LinearGradient([new gfx.Stop(0, this.color1), new gfx.Stop(1, this.color2)], 
							    gfx.LinearGradient[this.fillDir]));
        }
	
        if (this.fillType == 'radial gradient')
            this.targetMorph.setFill(new gfx.RadialGradient([new gfx.Stop(0, this.color1), new gfx.Stop(1, this.color2)]));
    },
    
    
    onFillOpacityUpdate: function(op) {
	var value = op.roundTo(0.01);
        this.targetMorph.setFillOpacity(value);
        this.actualModel.setStrokeOpacity(value); // Stroke opacity is linked to fill
    },

    onStrokeOpacityUpdate: function(op) {
        var value = op.roundTo(0.01);
        this.targetMorph.setStrokeOpacity(value);
    },

    onTextColorUpdate: function(c) { // Maybe add a little color swatch in the view
        this.targetMorph.setTextColor(c);
    },

    onFontFamilyUpdate: function(familyName) {
        this.targetMorph.setFontFamily(familyName);
    },
    
    onFontSizeUpdate: function(fontSize) {
        this.targetMorph.setFontSize(Number(fontSize));
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
	
        if (this.targetMorph.shape.roundEdgesBy) {
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
	
	
        if (this.targetMorph.setTextColor) {
            panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), "Text Color").beLabel());
            m = panel.addMorph(new ColorPickerMorph(new Rectangle(250, y, 50, 30)));
            m.connectModel(model.newRelay({Color: "+TextColor"}));
            y += 40;

            panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Font Family').beLabel());
            m = panel.addMorph(new TextMorph(new Rectangle(150, y, 150, 20)));
            m.connectModel(model.newRelay({Text: "+FontFamily"}));
            y += 30;

            panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Font Size').beLabel());
            m = panel.addMorph(new TextMorph(new Rectangle(150, y, 50, 20)));
            m.connectModel(model.newRelay({Text: "+FontSize"}), true);
            y += 30;
        }

	
        var oldBounds = panel.shape.bounds();
        panel.shape.setBounds(oldBounds.withHeight(y + 5 - oldBounds.y));
	
        panel.morphMenu = function(evt) { 
            var menu = Class.getPrototype(this).morphMenu.call(this, evt);
            menu.addLine();
            menu.addItem(['inspect model', new SimpleInspector(panel.getModel()), "openIn", this.world()]);
            return menu;
        }

        return panel;
    }
    
});


// ===========================================================================
// Profiler & Statistics Viewer
// ===========================================================================
Object.profiler = function (object, service) {
    // The wondrous Ingalls profiler...
    // Invoke as, eg, Object.profiler(Color, "start"), or Object.profiler(Color.prototype, "start")
    var stats = {};
    var fnames = object.constructor.localFunctionNames();

    for (var i = 0; i < fnames.length; i++) { 
        var fname = fnames[i];

        if (fname == "constructor") {} // leave the constructor alone
        else if (service == "stop") 
            object[fname] = object[fname].originalFunction;  // restore original functions
        else if (service == "tallies") 
            stats[fname] = object[fname].tally;  // collect the tallies
        else if (service == "ticks") 
            stats[fname] = object[fname].ticks;  // collect the real-time ticks
        else if (service == "reset") { 
            object[fname].tally = 0; object[fname].ticks = 0; // reset the stats
        } else if (service == "start") { // Make a proxy function object that just calls the original
            var tallyFunc = function () {
                var tallyFunc = arguments.callee;
                tallyFunc.tally++;
                msTime = new Date().getTime();
                var result = tallyFunc.originalFunction.apply(this, arguments); 
                tallyFunc.ticks += (new Date().getTime() - msTime);
                return result;
            }
            
            // Attach tallies, and the original function, then replace the original
            if (object[fname].tally == null) 
                tallyFunc.originalFunction = object[fname];
            else 
                tallyFunc = object[fname]; // So repeated "start" will work as "reset"

            tallyFunc.tally = 0;  
            tallyFunc.ticks = 0;
            object[fname] = tallyFunc; 
        } 
    }
    
    return stats; 
};

function showStatsViewer(profilee,title) {
    Object.profiler(profilee, "start");
    var m = new ButtonMorph(WorldMorph.current().bounds().topCenter().addXY(0,20).extent(pt(150, 20)));
    m.getThisValue = function() { return this.onState; };
    m.setThisValue = function(newValue) {
        this.onState = newValue;
	if(this.removed) return;
	if (this.world().firstHand().lastMouseEvent.isShiftDown()) {
		// shift-click means remove profiling
    		Object.profiler(profilee, "stop");
            	if (this.statsMorph != null) this.statsMorph.remove();
		this.remove();
		this.removed = true;
		return;
	}	
        if (newValue == false) { // on mouseup...
            if (this.statsMorph == null) {
                this.statsMorph = new TextMorph(this.bounds().bottomLeft().extent(pt(250,20)), "no text");
                WorldMorph.current().addMorph(this.statsMorph); 
            }
            var tallies = Object.profiler(profilee, "tallies");
            var ticks = Object.profiler(profilee, "ticks");
            var statsArray = [];
            
            for (var field in tallies) {
                if (tallies[field] instanceof Function) continue;
                if (tallies[field] == 0) continue;
                
                statsArray.push([tallies[field], ticks[field], field]);
            }

            statsArray.sort(function(a,b) {return b[1]-a[1];});
            var statsText = "";
            if (title) statsText += title + "\n";
            statsText += "tallies : ticks : methodName\n";
            statsText += statsArray.invoke('join', ' : ').join('\n');
            this.statsMorph.setTextString(statsText);
            Object.profiler(profilee, "reset"); 
        } 
    }
    m.connectModel({model: m, getValue: "getThisValue", setValue: "setThisValue"});
    WorldMorph.current().addMorph(m);
    var t = new TextMorph(m.bounds().extent().extentAsRectangle(), 'Display and reset stats').beLabel();
    m.addMorph(t);
};


// ===========================================================================
// The even-better Execution Tracer
// ===========================================================================
using().run(function() { // begin scoping function
	// The Execution Tracer is enabled by setting Config.debugExtras = true in localconfig.js.
	// When this is done, every method of every user class is wrapped by tracingWrapper (q.v.),
	// And the entire system is running with a shadow stack being maintained in this way.

	// This execution tracer maintains a separate stack or tree of called methods.
	// The variable 'currentContext' points to a TracerNode for the currently executing
	// method.  The caller chain of that node represents the JavaScript call stack, and
	// each node gives its method (which has been tagged with its qualifiedMethodName() ),
	// and also the receiving object, 'itsThis', and the arguments to the call, 'args'.
	// The end result can be seen in, eg, lively.lang.Execution.showStack(), which displays a stack trace
	// either in the console or in the StackViewer.  You can test this by invoking
	// "test showStack" in the menu of any morph.

	// At key points in the Morphic environment (like at the beginning of event dispatch and
	// ticking behavior), the stack environment gets reinitialized by a call to 
	// lively.lang.Execution.resetDebuggingStack().  This prevents excessively long chains from being
	// held around wasting storage.

	// The tracingWrapper function is the key to how this works.  It calls traceCall()
	// before each method execution, and traceReturn() afterwards.  The important thing
	// is that these messages are sent to the currentContext object.  Therefore the same
	// wrapper works to maintain a simple call stack as well as a full tally and time
	// execution profile.  In the latter case, currentContext and other nodes of the tracing
	// structure are instances of TracerTreeNode, rather than TracerStackNode
	// 

	// This mechanism can perform much more amazing feats with the use of TracerTreeNode.
	// Here the nodes stay in place, accumulating call tallies and ticks of the millisecond
	// clock.  You start it by calling lively.lang.Execution.trace() with a function to run (see the example
	// in lively.lang.Execution.testTrace()).  As in normal stack tracing, the value of currentContext is
	// the node associated with the currently running method.

    var rootContext, currentContext;

	Global.getCurrentContext = function() {
		return currentContext;
	};

    Object.subclass('TracerStackNode', {
	initialize: function(caller, method) {
	    this.caller = caller;
	    this.method = method;
	    this.itsThis = null;  // These two get nulled after return
	    this.args = null;  //  .. only used for stack trace on error
	    this.callee = null;
	},
	copyMe: function() {
	    var result = new TracerStackNode(this.caller, this.method);
	    result.itsThis = this.itsThis;
	    result.args = this.args;
	    result.callee = this.callee;
	    return result;
	},
        traceCall: function(method , itsThis, args) {
	    // this is the currentContext (top of stack)
	    // method has been called with itsThis as receiver, and args as arguments
	    // --> Check here for exceptions
	    var newNode = this.callee;  // recycle an old callee node
	    if (!newNode) {             // ... or make a new one
		newNode = new TracerStackNode(this, method);
		this.callee = newNode;
	    } else {
		newNode.method = method;
	    }
	    newNode.itsThis = itsThis;		
	    newNode.args = args;
	    if (Function.prototype.logAllCalls) console.log(this.dashes(this.stackSize()) + this);
	    currentContext = newNode;
	},
        traceReturn: function(method) {
	    // this is the currentContext (top of stack)
	    // method is returning
	    this.args = null;  // release storage from unused stack
	    this.itsThis = null;  //   ..
	    currentContext = this.caller;
	},
	each: function(funcToCall) {
	    // Stack walk (leaf to root) applying function
	    for (var c = this; c; c=c.caller) funcToCall(this, c);
	},
	stackSize: function() {
	    var size = 0;
	    for (var c = this; c; c=c.caller) size++;
	    return size;
	},
	dashes: function(n) {
	    var lo = n% 5;
	    return '----|'.times((n-lo)/5) + '----|'.substring(0,lo);
	},
	toString: function() {
	    return "<" + this.method.qualifiedMethodName() + ">";
	}
    });
    
    TracerStackNode.subclass('TracerTreeNode', {
	initialize: function($super, caller, method) {
	    $super(caller, method);
	    this.callees = {};
	    this.tally = 0;
	    this.ticks = 0;
	    this.calltime = null;
	    //console.log("adding node for " + method.qualifiedMethodName());
	},
        traceCall: function(method , itsThis, args) {
	    // this is the currentContext (top of stack)
	    // method has been called with itsThis as receiver, and args as arguments
	    // --> Check here for exceptions
	    var newNode = this.callees[method];
	    if (!newNode) {
		// First hit -- need to make a new node
		newNode = new TracerTreeNode(this, method);
		this.callees[method] = newNode;
	    }
	    newNode.itsThis = itsThis;
	    newNode.args = args;
	    newNode.tally++;
	    newNode.callTime = new Date().getTime();
	    currentContext = newNode;
	},
        traceReturn: function(method) {
	    // this is the currentContext (top of stack)
	    // method is returning
	    //if(stackNodeCount < 20) console.log("returning from " + method.qualifiedMethodName());
	    this.args = null;  // release storage from unused stack info
	    this.itsThis = null;  //   ..
	    this.ticks += (new Date().getTime() - this.callTime);
	    currentContext = this.caller;
	},
	each: function(funcToCall, level, sortFunc) {
	    // Recursive tree visit with callees order parameter (eg, tallies, ticks, alpha)
	    if (level == null) level = 0;
	    funcToCall(this, level);
	    var sortedCallees = [];
	    Properties.forEachOwn(this.callees, function(meth, node) { sortedCallees.push(node); })
	    if(sortedCallees.length == 0) return;
	    // Default is to sort by tallies, and then by ticks if they are equal (often 0)
	    sortedCallees.sort(sortFunc || function(a, b) {
		if(a.tally == b.tally) return (a.ticks > b.ticks) ? -1 : (a.ticks < b.ticks) ? 1 : 0; 
		return (a.tally > b. tally) ? -1 : 1});
	    sortedCallees.each(function(node) { node.each(funcToCall, level+1, sortFunc); });
	},
	fullString: function() {
	    var str = "Execution profile (#calls / #ticks)\n";
	    this.each(function(each, level) { str += (this.dashes(level) + each + "\n"); }.bind(this), 0, null);
	    return str;
	},
	toString: function() {
	    return '(' + this.tally.toString() + ' / ' + this.ticks.toString() + ') ' + this.method.qualifiedMethodName();
	}
    });
    
    Object.extend(lively.lang.Execution, {
	
	resetDebuggingStack: function resetDebuggingStack() {
	    var rootMethod = arguments.callee.caller;
	    rootContext = new TracerStackNode(null, rootMethod);
	    currentContext = rootContext;
	    Function.prototype.logAllCalls = false;
	},
	
        showStack: function(useViewer, c) {
	    var currentContext = c;
            if (useViewer) { new StackViewer(this, currentContext).open(); return; }
	    
            if (Config.debugExtras) {
                for (var c = currentContext, i = 0; c != null; c = c.caller, i++) {
                    var args = c.args;
		    if (!args) {
			console.log("no frame at " + i);
			continue;
		    }
                    var header = Object.inspect(args.callee.originalFunction);
                    var frame = i.toString() + ": " + header + "\n";
		    frame += "this: " + c.itsThis + "\n";
		    var k = header.indexOf('(');
                    header = header.substring(k + 1, 999);  // ')' or 'zort)' or 'zort,baz)', etc
                    for (var j = 0; j <args.length; j++) {
                        k = header.indexOf(')');
                        var k2 = header.indexOf(',');
                        if (k2 >= 0) k = Math.min(k,k2);
                        var argName = header.substring(0, k);
                        header = header.substring(k + 2);
                        if (argName.length > 0) frame += argName + ": " + Object.inspect(args[j]) + "\n";
		    }
                    console.log(frame);
		    if (i >= 500) {
			console.log("stack overflow?");
			break;
		    }
                }
            } else {
		var visited = [];
                for (var c = arguments.callee.caller, i = 0; c != null; c = c.caller, i++) {
                    console.log("%s: %s", i, Object.inspect(c));
		    if (visited.indexOf(c) >= 0) {
			console.log("possible recursion");
			break;
		    } else visited.push(c);
		    if (i > 500) {
			console.log("stack overflow?");
			break;
		    }
                }
            }
        },

        testTrace: function() {
	    this.trace(function () { for (var i=0; i<10; i++) RunArray.test([3, 1, 4, 1, 5, 9]); });
	},
	
        trace: function(method) {
	    // Note: trace returns the trace root, not the value of the traced method
	    // If you need the return value, you'll need to store it elsewhwere from the method
	    var traceRoot = new TracerTreeNode(currentContext, method);
	    currentContext = traceRoot;
	    result = method.call(this);
	    currentContext = traceRoot.caller;
	    traceRoot.caller = null;
	    console.log(traceRoot.fullString());
	    return traceRoot;
	},
	
        installStackTracers: function(remove) {
	    console.log("Wrapping all methods with tracingWrapper... " + (remove || ""));
            remove = (remove == "uninstall");  // call with this string to uninstall
            Class.withAllClassNames(Global, function(cName) { 
		if (cName.startsWith('SVG') || cName.startsWith('Tracer')) return;
                if (cName == 'Global' || cName == 'Object') return;
                var theClass = Class.forName(cName);
                var methodNames = theClass.localFunctionNames();
		
                // Replace all methods of this class with a wrapped version
		for (var mi = 0; mi < methodNames.length; mi++) {
                    var mName = methodNames[mi];
                    var originalMethod = theClass.prototype[mName];
		    // Put names on the original methods 
                    originalMethod.declaredClass = cName;
                    originalMethod.methodName = mName;
                    // Now replace each method with a wrapper function (or remove it)
                    if (!Class.isClass(originalMethod)) {  // leave the constructor alone and other classes alone
			if(!remove) theClass.prototype[mName] = originalMethod.tracingWrapper();
			else if(originalMethod.originalFunction) theClass.prototype[mName] = originalMethod.originalFunction;
		    }
                }
		// Do the same for class methods (need to clean this up)
		var classFns = []; 
		for (var p in theClass) {
		    if (theClass.hasOwnProperty(p) && theClass[p] instanceof Function && p != "superclass")
			classFns.push(p);
		}
                for (var mi = 0; mi < classFns.length; mi++) {
                    var mName = classFns[mi];
                    var originalMethod = theClass[mName];
		    // Put names on the original methods 
                    originalMethod.declaredClass = cName;
                    originalMethod.methodName = mName;
                    // Now replace each method with a wrapper function (or remove it)
                    if (!Class.isClass(originalMethod)) { // leave the constructor alone and other classes alone
			if(!remove) theClass[mName] = originalMethod.tracingWrapper();
			else if(originalMethod.originalFunction) theClass[mName] = originalMethod.originalFunction;
		    }
                }
            });
        },
        tallyLOC: function() {
            console.log("Tallying lines of code by decompilation");
            var classNames = [];
            Class.withAllClassNames(Global, function(n) { n.startsWith('SVG') || classNames.push(n)});
            classNames.sort();
            var tallies = "";
            for (var ci= 0; ci < classNames.length; ci++) {
                var cName = classNames[ci];
                if (cName != 'Global' && cName != 'Object') {
                    var theClass = Class.forName(cName);
                    var methodNames = theClass.localFunctionNames();
                    var loc = 0;
                    for (var mi = 0; mi < methodNames.length; mi++) {
                        var mName = methodNames[mi];
                        var originalMethod = theClass.prototype[mName];
                        // decompile and count lines with more than one non-blank character
                        var lines = originalMethod.toString().split("\n");
                        lines.forEach( function(line) { if(line.replace(/\s/g, "").length>1) loc++ ; } );
                    }
                }
                console.log(cName + " " + loc);
                // tallies += cName + " " + loc.toString() + "\n";
            }
        }
    });
    
    Object.extend(Function.prototype, {
	
        tracingWrapper: function () {
	    // Make a proxy method (traceFunc) that calls the tracing routines before and after this method
	    var traceFunc = function () {
		var originalFunction = arguments.callee.originalFunction; 
		if (!currentContext) return originalFunction.apply(this, arguments);  // not started yet
		try {
			currentContext.traceCall(originalFunction, this, arguments);
			var result = originalFunction.apply(this, arguments); 
			currentContext.traceReturn(originalFunction);
			return result;
		} catch(e) {
		    console.log('got error:' + e.message);
		    if (!e.stack) console.log('caller ' + currentContext.caller);
		    
		    if (!e.stack) e.stack = currentContext.copyMe();
		    throw e;
		};
            };
            traceFunc.originalFunction = this;  // Attach this (the original function) to the tracing proxy
            return traceFunc;
        }
    });
    
}); // end scoping function


// ===========================================================================
// Call Stack Viewer
// ===========================================================================
WidgetModel.subclass('StackViewer', {

    viewTitle: "Call Stack Viewer",
    openTriggerVariable: 'getFunctionList',

    initialize: function($super, param, currentCtxt) {
        $super();
        this.selected = null;
        if (Config.debugExtras) {
            this.stack = [];
            this.thises = [];
            this.argses = [];
            for (var c = currentCtxt; c != null; c = c.caller) {
                this.thises.push (c.itsThis);
                this.argses.push (c.args);
                this.stack.push (c.method);
            }
        } else {
            // if no debugStack, at least build an array of methods
	    // KP: what about recursion?
            this.stack = [];
            for (var c = arguments.callee.caller; c != null; c = c.caller) {
                this.stack.push (c);
            }
        }
    },
    
    getFunctionList: function() {
        var list = [];

        for (var i = 0; i < this.stack.length; i++) {
            list.push(i + ": " + Object.inspect(this.stack[i]));
        }

        return list;
    },

    setFunctionName: function(n) {
        this.selected = null;
        if (n) {
            var itemNumber = parseInt(n);
            if (!isNaN(itemNumber)) {
                this.stackIndex = itemNumber;
                this.selected = this.stack[itemNumber].toString();
            }
        }
       this.changed("getCodeValue");
       this.changed("getVariableList");
    },

    getCodeValue: function() {
        if (this.selected) return this.selected;
        else return "no value";
    },

    setCodeValue: function() { return; },

    getVariableList: function () {
        if (this.selected) {
            var ip = this.selected.indexOf(")");
            if (ip<0) return ["this"];
            varString = this.selected.substring(0,ip);
            ip = varString.indexOf("(");
            varString = varString.substring(ip+1);
            this.variableNames = (varString.length == 0)
                ? ["this"]
                : ["this"].concat(varString.split(", "));
            return this.variableNames
        }
        else return ["----"];
    },

    setVariableName: function(n) {
        this.variableValue = null;
        if (this.variableNames) {
            for (var i = 0; i < this.variableNames.length; i++) {
                if (n == this.variableNames[i]) {
                    this.variableValue = (n == "this")
                        ? this.thises[this.stackIndex]
                        : this.argses[this.stackIndex][i-1];
                    break;
                }
            }
        }
        this.changed("getVariableValue");
    },

    getVariableValue: function(n) {
        return Object.inspect(this.variableValue);
    },

    buildView: function(extent) { 
        var panel;
        if (! this.argses) {
            panel = PanelMorph.makePanedPanel(extent, [
                            ['stackPane', newListPane, new Rectangle(0, 0, 0.5, 1)],
                            ['codePane', newTextPane, new Rectangle(0.5, 0, 0.5, 1)]
                        ]);
                        panel.stackPane.connectModel({model: this, getList: "getFunctionList", setSelection: "setFunctionName"});
                        panel.codePane.connectModel({model: this, getText: "getCodeValue", setText: "setCodeValue"});
        } else {
            panel = PanelMorph.makePanedPanel(extent, [
                ['stackPane', newListPane, new Rectangle(0, 0, 0.5, 0.6)],
                ['codePane', newTextPane, new Rectangle(0.5, 0, 0.5, 0.6)],
                ['variablePane', newListPane, new Rectangle(0, 0.6, 0.5, 0.4)],
                ['valuePane', newTextPane, new Rectangle(0.5, 0.6, 0.5, 0.4)]
            ]);
            panel.stackPane.connectModel({model: this, getList: "getFunctionList", setSelection: "setFunctionName"});
            panel.codePane.connectModel({model: this, getText: "getCodeValue", setText: "setCodeValue"});
            panel.variablePane.connectModel({model: this, getList: "getVariableList", setSelection: "setVariableName"});
            panel.valuePane.connectModel({model: this, getText: "getVariableValue", setText: "setVariableValue"});
        }
        return panel;
    }
});


// ===========================================================================
// FrameRateMorph
// ===========================================================================
TextMorph.subclass('FrameRateMorph', {

    initialize: function($super, rect, textString) {
	// Steps at maximum speed, and gathers stats on ticks per sec and max latency
        $super(rect, textString);
        this.reset(new Date());
    },

    reset: function(date) {
        this.lastTick = date.getSeconds();
        this.lastMS = date.getTime();
        this.stepsSinceTick = 0;
        this.maxLatency = 0;
    },

    nextStep: function() {
        var date = new Date();
        this.stepsSinceTick ++;
        var nowMS = date.getTime();
        this.maxLatency = Math.max(this.maxLatency, nowMS - this.lastMS);
        this.lastMS = nowMS;
        var nowTick = date.getSeconds();
        if (nowTick != this.lastTick) {
            this.lastTick = nowTick;
            var ms = (1000 / Math.max(this. stepsSinceTick,1)).roundTo(1);
            this.setTextString(this.stepsSinceTick + " frames/sec (" + ms + "ms avg),\nmax latency " + this.maxLatency + " ms.");
            this.reset(date);
        }
    },

    startSteppingScripts: function() { this.startStepping(1,'nextStep'); }

});


// ===========================================================================
// EllipseMaker
// ===========================================================================
ButtonMorph.subclass('EllipseMakerMorph', {

    initialize: function($super, loc) {
	// Under construction -- will be a button that emits bouncing ellipses
	// to test graphical performance in conjunction with FrameRateMorph
        $super(loc.extent(pt(200, 50)));
	this.ellipses = [];
        this.report();
	this.repRate = 200; // ms
	this.lastTick = new Date().getTime();
    	this.connectModel({model: this, getValue: "getThisValue", setValue: "setThisValue"});
	this.pushed = false;
    },
    setThisValue: function(bool) {
        this.pushed = bool;
	console.log("this.pushed = " + this.pushed);
    },
    getThisValue: function(bool) { return this.pushed },

    makeNewEllipse: function(date) {
        var e = new Morph(new lively.scene.Ellipse(pt(25, 25), 25));
	e.applyStyle({ fill: Color.random(), fillOpacity: Math.random(), borderWidth: 1, borderColor: Color.random()});
	e.velocity = pt(20,20).random();
	e.bounceInBounds = this.bounceInBounds;
	this.world().addMorph(e);
	this.ellipses.push(e);
	this.report()
    },
    report: function(date) {
        this.setLabel("Make more ellipses (" + this.ellipses.length + ")");
    },
    nextStep: function() {
        this.stepEllipses();
	if (!this.pushed) return;
	var thisTick = new Date().getTime();
	if (thisTick - this.lastTick < this.repRate) return;
	this.makeNewEllipse();
	this.lastTick = thisTick;
    },
    stepEllipses: function() {
        this.ellipses.forEach( function(e) { e.moveBy(e.velocity); e.bounceInBounds(); });
    },
    bounceInBounds: function() {
	// should be in particles protocol of Morph
        var b = this.bounds();
	var ob = this.owner.innerBounds();
	if (b.x < ob.x || b.maxX() > ob.maxX()) {
	    this.velocity = this.velocity.scaleByPt(pt(-1, 1));
	    this.moveBy(this.velocity);
	}
	if (b.y < ob.y || b.maxY() > ob.maxY()) {
	    this.velocity = this.velocity.scaleByPt(pt(1, -1));
	    this.moveBy(this.velocity);
	}
    },
    startSteppingScripts: function() { this.startStepping(30,'nextStep'); }
});


// ===========================================================================
// File Parser
// ===========================================================================
Object.subclass('FileParser', {
    // The bad news is: this is not a real parser ;-)
    // It simply looks for class headers, and method headers,
    // and everything in between gets put with the preceding header
    // The good news is:  it can deal with any file,
    // and it does something useful 99 percent of the time ;-)
    // ParseFile() produces an array of SourceCodeDescriptors
    // If mode == "scan", that's all it does
    // If mode == "search", it only collects descriptors for code that matches the searchString
    // If mode == "import", it builds a source code index in SourceControl for use in the browser

    parseFile: function(fname, version, fstr, db, mode, str) {
        // Scans the file and returns changeList -- a list of informal divisions of the file
        // It should be the case that these, in order, exactly contain all the text of the file
        // Note that if db, a SourceDatabase, is supplied, it will be loaded during the scan
        var ms = new Date().getTime();
        this.fileName = fname;
        this.versionNo = version;
        this.sourceDB = db;
        this.mode = mode;  // one of ["scan", "search", "import"]
        if (mode == "search") this.searchString = str;

        this.verbose = this.verbose || false;
        // this.verbose = (fname == "Examples.js");
        this.ptr = 0;
        this.lineNo = 0;
        this.changeList = [];
        if (this.verbose) console.log("Parsing " + this.fileName + ", length = " + fstr.length);
        this.currentDef = {type: "preamble", startPos: 0, lineNo: 1};
        this.lines = fstr.split(/[\n\r]/);

        while (this.lineNo < this.lines.length) {
            var line = this.nextLine();
            if (this.verbose) console.log("lineNo=" + this.lineNo + " ptr=" + this.ptr + line); 
            if (this.lineNo > 100) this.verbose = false;

            if (this.scanComment(line)) {
            } else if (this.scanModuleDef(line)) {
            } else if (this.scanFunctionDef(line)) {
            } else if (this.scanClassDef(line)) {
            } else if (this.scanMethodDef(line)) {
            } else if (this.scanMainConfigBlock(line)) {
            } else if (this.scanBlankLine(line)) {
            } else this.scanOtherLine(line);
        }
        this.ptr = fstr.length;
        this.processCurrentDef();
        ms = new Date().getTime() - ms;
        console.log(this.fileName + " scanned; " + this.changeList.length + " patches identified in " + ms + " ms.");
        return this.changeList;
    },

    scanComment: function(line) {
        if (line.match(/^[\s]*\/\//) ) {
            if (this.verbose) console.log("// comment: "+ line);
            return true;
        }

        if (line.match(/^[\s]*\/\*/) ) {
            // Attempt to recognize match on one line...
            if (line.match(/^[\s]*\/\*[^\*]*\*\//) ) {
                if (this.verbose) console.log("short /* comment: "+ line);
                return true; 
            }

            // Note that /* and matching */ must be first non-blank chars on a line
            var saveLineNo = this.lineNo;
            var saveLine = line;
            var savePtr = this.ptr;
            if (this.verbose) console.log("long /* comment: "+ line + "...");
            do {
                if (this.lineNo >= this.lines.length) {
                    console.log("Unfound end of long comment beginning at line " + (saveLineNo +1));
                    this.lineNo = saveLineNo;
                    this.currentLine = saveLine;
                    this.ptr = savePtr;
                    return true;
                }
                more = this.nextLine()
            } while ( ! more.match(/^[\s]*\*\//) );

            if (this.verbose) console.log("..." + more);
            return true;
        }

        return false;
    },

    scanModuleDef: function(line) {
        // FIXME module defs ending on the same line
        var match = line.match(/\s*module\([\'\"]([a-zA-Z\.]*)[\'\"]\).*\(\{\s*/);
        if (match == null)  return false;
        this.processCurrentDef();
        if (this.verbose) console.log("Module def: " + match[1]);
        this.currentDef = {type: "moduleDef", name: match[1], startPos: this.ptr, lineNo: this.lineNo};
        return true;
    },
    
    scanFunctionDef: function(line) {
        var match = line.match(/^[\s]*function[\s]+([\w]+)[\s]*\(.*\)[\s]*\{.*/);
        if (!match)
            match = line.match(/^[\s]*var[\s]+([\w]+)[\s]*\=[\s]*function\(.*\)[\s]*\{.*/);
        if (match == null) return false;
        this.processCurrentDef();
        if (this.verbose) console.log("Function def: " + match[1]);
        this.currentDef = {type: "functionDef", name: match[1], startPos: this.ptr, lineNo: this.lineNo};
        return true;
    },
    
    scanClassDef: function(line) {
        // *** Need to catch Object.extend both Foo and Foo.prototype ***
        var match = line.match(/^[\s]*([\w\.]+)\.subclass\([\'\"]([\w\.]+)[\'\"]/);
        if (match == null) {
            var match = line.match(/^[\s]*([\w\.]+)\.subclass\(Global\,[\s]*[\'\"]([\w\.]+)[\'\"]/);
        }
        if (match == null)  return false;
        this.processCurrentDef();
        if (this.verbose) console.log("Class def: " + match[1] + "." + match[2]);
        this.currentDef = {type: "classDef", name: match[2], startPos: this.ptr, lineNo: this.lineNo};
        return true;
    },

    scanMethodDef: function(line) {
        var match = line.match(/^[\s]*([\w]+)\:/);
        if (match == null) return false;
        this.processCurrentDef();
        if (this.verbose) console.log("Method def: " + this.currentClassName + "." + match[1]);
        this.currentDef = {type: "methodDef", name: match[1], startPos: this.ptr, lineNo: this.lineNo};
        return true;
    },

    scanMainConfigBlock: function(line) {    // Special match for Config blocks in Main.js
        var match = line.match(/^[\s]*(if\s\(Config.show[\w]+\))/);
        if (match == null) return false;
        this.processCurrentDef();
        if (this.verbose) console.log("Main Config: " + this.currentClassName + "." + match[1]);
        this.currentDef = {type: "mainConfig", name: match[1], startPos: this.ptr, lineNo: this.lineNo};
        return true;
    },

    processCurrentDef: function() {
        // this.ptr now points at a new code section.
        // Terminate the currently open definition and process accordingly
        // We will want to do a better job of finding where it ends
        var def = this.currentDef;
        if (this.ptr == 0) return;  // we're being called at new def; if ptr == 0, there's no preamble
        def.endPos = this.ptr-1;  // don't include the newLine
        var descriptor = new SourceCodeDescriptor (this.sourceDB, this.fileName, this.versionNo, def.startPos, def.endPos, def.lineNo, def.type, def.name);

        if (this.mode == "scan") {
            this.changeList.push(descriptor);
        } else if (this.mode == "search") {
            if (this.matchStringInDef(this.searchString)) this.changeList.push(descriptor);
        } else if (this.mode == "import") {
            if (def.type == "classDef") {
                this.currentClassName = def.name;
                this.sourceDB.methodDictFor(this.currentClassName)["*definition"] = descriptor;
            } else if (def.type == "methodDef") {
                this.sourceDB.methodDictFor(this.currentClassName)[def.name] = descriptor;
            } else if (def.type == "functionDef") {
                this.sourceDB.addFunctionDef(descriptor);
            }
            this.changeList.push(descriptor);
        }
        this.currentDef = null;
    },
    
    scanBlankLine: function(line) {
        if (line.match(/^[\s]*$/) == null) return false;
        if (this.verbose) console.log("blank line");
        return true;
    },
    
    scanOtherLine: function(line) {
        // Should mostly be code body lines
        if (this.verbose) console.log("other: "+ line); 
        return true;
    },
    
    matchStringInDef: function(str) {
        for (var i=this.currentDef.lineNo-1; i<this.lineNo-1; i++) {
            if (this.lines[i].indexOf(str) >=0) return true;
        }
        return false;
    },
    
    nextLine: function() {
        if (this.lineNo > 0) this.ptr += (this.currentLine.length+1);
        if (this.lineNo < this.lines.length) this.currentLine = this.lines[this.lineNo];
        else this.currentLine = '';
        if (!this.currentLine) this.currentLine = '';  // Split puts nulls instead of zero-length strings!
        this.lineNo++;
        return this.currentLine;
    }
    
});

// ===========================================================================
// Another File Parser - to see how fast OMeta is
// ===========================================================================

Object.subclass('AnotherFileParser', {
    
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
        return OMetaSupport.matchAllWithGrammar(this.ometaParser, rule, src || this.src, false/*hideErrors?*/);
    },
    
    parseClass: function() {
        return this.callOMeta("klassDef");
    },
    
    /* parsing */
    prepareParsing: function(src) {
        this.ptr = 0;
        this.src = src;
        this.lines = src.split(/[\n\r]/);
        this.changeList = [];
    },
    
    parseModuleBegin: function() {
        var match = this.currentLine.match(/^\s*module\([\'\"](.*)[\'\"]\)\.requires\(.*toRun\(.*$/);
        if (!match) return null;
        var descr = {type: 'moduleDef', name: match[1], startIndex: this.ptr, lineNo: this.currentLineNo(), subElements: []};
        this.ptr += match[0].length + 1;
        return descr;
    },
    
    parseUsingBegin: function() {
        var match = this.currentLine.match(/^\s*using\((.*)\)\.run\(.*$/);
        if (!match) return null;
        var descr = {type: 'usingDef', name: match[1], startIndex: this.ptr, lineNo: this.currentLineNo(), subElements: []};
        this.ptr += match[0].length + 1;
        return descr;
    },
    
    parseModuleOrUsingEnd: function(specialDescr) {
        if (specialDescr.length === 0) return null;
        var match = this.currentLine.match(/^\s*\}.*?\)[\;]?.*$/);
        if (!match) return null;
        dbgOn(true);
        specialDescr.last().stopIndex = this.ptr + match[0].length - 1;
        this.addDecsriptorMethods(specialDescr.last());
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
    
    parseSource: function(src) {
        var msParseStart;
        var msStart = new Date().getTime();
        this.overheadTime = 0;
        
        this.prepareParsing(src);
        var specialDescr = [];
        var descr;
        
        while (this.ptr < this.src.length) {
            msParseStart = new Date().getTime();
            
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
            
            var msNow = new Date().getTime();
            var duration = msNow-msParseStart;
            console.log('Parsed line ' +
                        this.findLineNo(this.lines, descr.startIndex) + ' to ' + this.findLineNo(this.lines, descr.stopIndex) +
                        ' (' + descr.type + ':' + descr.name + ') after ' + (msNow-msStart)/1000 + 's (' + duration + 'ms)' +
                        (duration > 100 ? '!!!!!!!!!!' : ''));
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
            this.addDecsriptorMethods(d);
        });
        // ----------------
        // this.overheadTime += new Date().getTime() - ms;
    },

    addDecsriptorMethods: function(descr) {
        descr.getSourceCode = function() {
            var src = this.src.substring(descr.startIndex, descr.stopIndex+1);
            return src;
        }.bind(this);
        descr.getDescrName = function() { return descr.name };
        descr.putSourceCode = function(newString) { throw new Error('Not yet!') };
        descr.newChangeList = function() { return ['huch'] };
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
    
    /* loading */
    sourceFromUrl: function(url) {
        if (!module.SourceControl) module.SourceControl = new SourceDatabase();
        return module.SourceControl.getCachedText(url.filename());        
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
    ometaParser: null,
    
    withOMetaParser: function() {
        var prototype = AnotherFileParser.ometaParser|| OMetaSupport.fromFile(AnotherFileParser.grammarFile);
        AnotherFileParser.ometaParser = prototype;
        var parser = Object.delegated(prototype, {_parser: this});
        return new AnotherFileParser(parser);
    },
    
    parseAndShowFileNamed: function(fileName) {
        var chgList = AnotherFileParser.withOMetaParser().parseFileFromUrl(URL.source.withFilename(fileName));
        new ChangeList(fileName, null, chgList).openIn(WorldMorph.current()); 
    }
    
});


// ===========================================================================
// ChangeList
// ===========================================================================
WidgetModel.subclass('ChangeList', {
    // The ChangeListBrowser views a list of patches in a JavaScript (or other) file.
    // The patches taken together entirely capture all the text in the file
    // The quality of the fileParser determines how well the file patches correspond
    // to meaningful JavaScript entities.  A changeList accumulated from method defs
    // during a development session should (;-) be completely well-formed in this regard.
    // Saving a change in a ChangeList browser will only edit the file;  no evaluation is implied
    
    initialViewExtent: pt(400,250),
    openTriggerVariable: 'getChangeBanners',

    initialize: function($super, title, ignored, changes) {
        $super();
        this.title = title;
        this.changeList = changes;
    },
    
    getChangeBanners: function() {
        this.changeBanner = null;
        return this.changeList.map(function(each) { return this.bannerOfItem(each); }, this);
    },

    setChangeSelection: function(n, v) {
        this.changeBanner = n;
        this.changed("getChangeSelection", v);
        this.changed("getChangeItemText", v);
        if (this.searchString) this.changed("getSearchString", v);
    },

    getChangeSelection: function() {
        return this.changeBanner;
    },

    selectedItem: function() {
        if (this.changeBanner == null) return null;
        var i1 = this.changeBanner.indexOf(":");
        var i2 = this.changeBanner.indexOf(":", i1+1);
        var lineNo = this.changeBanner.substring(i1+1, i2);
        lineNo = new Number(lineNo);
        for (var i=0; i < this.changeList.length; i++) {
            var item = this.changeList[i];
            // Note: should confirm fileName here as well for search lists
            // where lineNo might match, but its a different file
            if (item.lineNo == lineNo) return item;
        }
        return null;
    },

    bannerOfItem: function(item) {
        var lineStr = item.lineNo.toString();
        var firstLine = item.getSourceCode().truncate(40);  // a bit wastefull
        if (firstLine.indexOf("\r") >= 0) firstLine = firstLine.replace(/\r/g, "");
        end = firstLine.indexOf(":");
        if (end >= 0) firstLine = firstLine.substring(0,end+1);
        return item.fileName.concat(":", lineStr, ": ", firstLine);
    },

    getChangeItemText: function() {
        var item = this.selectedItem();
        if (item == null) return "-----";
        return item.getSourceCode();
    },

    setChangeItemText: function(newString, view) {
        var item = this.selectedItem();
        if (item == null) return;

        var originalString = view.textBeforeChanges;
        var fileString = item.getSourceCode();
        if (originalString == fileString) {
            this.checkBracketsAndSave(item, newString, view);
            return;
        }

        WorldMorph.current().notify("Sadly it is not possible to save this text because\n"
            + "the original text appears to have been changed elsewhere.\n"
            + "Perhaps you could copy what you need to the clipboard, browse anew\n"
            + "to this code, repeat your edits with the help of the clipboard,\n"
            + "and finally try to save again in that new context.  Good luck.");
        },

    checkBracketsAndSave: function(item, newString, view) {
        var errorIfAny = this.checkBracketError(newString);
        if (! errorIfAny) {this.reallySaveItemText(item, newString, view); return; }

        var msg = "This text contains an unmatched " + errorIfAny + ";\n" +
                  "do you wish to save it regardless?";
        WorldMorph.current().confirm(msg, function (answer) {
            if (answer) this.reallySaveItemText(item, newString, view); }.bind(this));
    },

    reallySaveItemText: function(item, newString, editView) {
        item.putSourceCode(newString);
        editView.acceptChanges();

        // Now recreate (slow but sure) list from new contents, as things may have changed
        if (this.searchString) return;  // Recreating list is not good for searches
        var oldSelection = this.changeBanner;
        this.changeList = item.newChangeList();
        this.changed('getChangeBanners');
        this.setChangeSelection(oldSelection);  // reselect same item in new list (hopefully)
    },

    checkBracketError: function (str) {
        // Return name of unmatched bracket, or null
        var cnts = {};
        cnts.nn = function(c) { return this[c] || 0; };  // count or zero
        for (var i=0; i<str.length; i++)  // tally all characters
            { cnts[ str[i] ] = cnts.nn(str[i]) +1 };
        if (cnts.nn("{") > cnts.nn("}")) return "open brace";
        if (cnts.nn("{") < cnts.nn("}")) return "close brace";
        if (cnts.nn("[") > cnts.nn("]")) return "open bracket";
        if (cnts.nn("[") < cnts.nn("]")) return "close bracket";
        if (cnts.nn("(") > cnts.nn(")")) return "open paren";
        if (cnts.nn("(") < cnts.nn(")")) return "close paren";
        if (cnts.nn('"')%2 != 0) return "double quote";  // "
        if (cnts.nn("'")%2 != 0) return "string quote";  // '
        return null; 
    },

    getSearchString: function() {
        return this.searchString;
    },

    getViewTitle: function() {
        return "Change list for " + this.title;
    },

    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['topPane', newListPane, new Rectangle(0, 0, 1, 0.5)],
            ['bottomPane', newTextPane, new Rectangle(0, 0.5, 1, 0.5)]
        ]);
        var m = panel.topPane;
        m.connectModel({model: this, getList: "getChangeBanners", setSelection: "setChangeSelection", getSelection: "getChangeSelection", getMenu: "getListPaneMenu"});
        m = panel.bottomPane;
        m.innerMorph().textSelection.borderRadius = 0;
        m.connectModel({model: this, getText: "getChangeItemText", setText: "setChangeItemText", getSelection: "getSearchString", getMenu: "default"});
        return panel;
    }

});  // ({ balance


// ===========================================================================
// Source Database
// ===========================================================================
ChangeList.subclass('SourceDatabase', {
    // SourceDatabase is an interface to the Lively Kernel source code as stored
    // in a CVS-style repository, ie, as a bunch of text files.

    // First of all, it is capable of scanning all the source files, and breaking
    // them up into reasonable-sized pieces, hopefully very much like the
    // actual class defs and method defs in the files.  The partitioning is done
    // by FileParser and it, in turn, calls setDescriptorInClassForMethod to
    // store the source code descriptors for these variously recognized pieces.

    // In the process, it caches the full text of some number of these files for
    // fast access in subsequent queries, notably alt-w or "where", that finds
    // all occurrences of the current selection.  The result of such searches
    // is presented as a changeList.

    // The other major service provided by SourceDatabase is the ability to 
    // retrieve and alter pieces of the source code files without invalidating
    // previously scanned changeList-style records.

    // A sourceCodeDescriptor (q.v.) has a file name and version number, as well as 
    // start and stop character indices.  When a piece of source code is changed,
    // it will likely invalidate all the other sourceCodePieces that point later
    // in the file.  However, the SourceDatabase is smart (woo-hoo); it knows
    // where previous edits have been made, and what effect they would have had
    // on character ranges of older pieces.  To this end, it maintains an internal
    // version number for each file, and an edit history for each version.

    // With this minor bit of bookkeeping, the SourceDataBase is able to keep
    // producing source code pieces from old references to a file without the need
    // to reread it.  Moreover, to the extent its cache can keep all the
    // file contents, it can do ripping-fast scans for cross reference queries.
    //
    // cachedFullText is a cache of file contents.  Its keys are file names, and
    // its values are the current contents of the named file.

    // editHistory is a parallel dictionary of arrays of edit specifiers.

    // A SourceDatabase is created in response to the 'import sources' command
    // in the browser's classPane menu.  The World color changes to contrast that
    // (developer's) world with any other window that might be testing a new system
    // under develpment.

    // For now, we include all the LK sources, or at least all that you would usually
    // want in a typical development session.  We may soon want more control
    // over this and a reasonable UI for such control.

    initialize: function($super) {
        this.methodDicts = {};
        this.functionDefs = {};
        this.cachedFullText = {};
        this.editHistory = {};
    },

    addFunctionDef: function(def) {
        if (def.type !== 'functionDef') throw dbgOn(new Error('Wrong def'));
        this.functionDefs[def.name] = def;
    },
    
    functionDefFor: function(functionName) {
        return this.functionDefs[functionName];
    },
    
    methodDictFor: function(className) {
        if (!this.methodDicts[className]) this.methodDicts[className] = {}; 
        return this.methodDicts[className];
    },

    getSourceInClassForMethod: function(className, methodName) {
        var methodDict = this.methodDictFor(className);
        var descriptor = methodDict[methodName];
        if (!descriptor) return null;
        // *** Needs version edit tweaks...
        var fullText = this.getCachedText(descriptor.fileName);
        if (!fullText) return null;
        return fullText.substring(descriptor.startIndex, descriptor.stopIndex);
    },

    setDescriptorInClassForMethod: function(className, methodName, descriptor) {
        var methodDict = this.methodDictFor(className);
        methodDict[methodName] = descriptor;
    },

    browseReferencesTo: function(str) {
        var fullList = this.searchFor(str);
        if (fullList.length > 300) {
            WorldMorph.current().notify(fullList.length.toString() + " references abbreviated to 300.");
            fullList = fullList.slice(0,299);
        }
        var refs = new ChangeList("References to " + str, null, fullList);
        refs.searchString = str;
        refs.openIn(WorldMorph.current()); 
    },

    searchFor: function(str) {
        var fullList = [];
        Properties.forEachOwn(this.cachedFullText, function(fileName, fileString) {
            var refs = new FileParser().parseFile(fileName, this.currentVersion(fileName), fileString, this, "search", str);
            fullList = fullList.concat(refs);
        }, this);
        return fullList;
    },

    importKernelFiles: function(list) {
        // rk: list is not used anymore, can we get rid of that method?
        //     I also assume that the scanning should be syncronous, adding flag for that
        this.scanLKFiles(true);
	this.testImportFiles();
    },
    
    getSourceCodeRange: function(fileName, versionNo, startIndex, stopIndex) {
        // Remember the JS convention that str[stopindex] is not included!!
        var fileString = this.getCachedText(fileName);
        var mapped = this.mapIndices(fileName, versionNo, startIndex, stopIndex);
        return fileString.substring(mapped.startIndex, mapped.stopIndex);
    },

    putSourceCodeRange: function(fileName, versionNo, startIndex, stopIndex, newString) {
        var fileString = this.getCachedText(fileName);
        var mapped = this.mapIndices(fileName, versionNo, startIndex, stopIndex);
        var beforeString = fileString.substring(0, mapped.startIndex);
        var afterString = fileString.substring(mapped.stopIndex);
        var newFileString = beforeString.concat(newString, afterString);
        newFileString = newFileString.replace(/\r/gi, '\n');  // change all CRs to LFs
        var editSpec = {repStart: startIndex, repStop: stopIndex, repLength: newString.length};
        console.log("Saving " + fileName + "...");
        new NetRequest({model: new NetRequestReporter(), setStatus: "setRequestStatus"}
                ).put(URL.source.withFilename(fileName), newFileString);
        // Update cache contents and edit history
        this.cachedFullText[fileName] = newFileString;
        this.editHistory[fileName].push(editSpec);
        console.log("... " + newFileString.length + " bytes saved.");
    },

    mapIndices: function(fileName, versionNo, startIndex, stopIndex) {
        // Figure how substring indices must be adjusted to find the same characters in the fileString
        // given its editHistory.
        // Note: This assumes only three cases: range above replacement, == replacement, below replacement
        // It should check for range>replacement or range<replacement and either indicate error or
        // possibly deal with it (our partitioning may be tractable)
        var edits = this.editHistory[fileName].slice(versionNo);
        var start = startIndex;  var stop = stopIndex;
        for (var i=0; i<edits.length; i++) {  // above replacement
            var edit = edits[i];
            var delta = edit.repLength - (edit.repStop - edit.repStart);  // patch size delta
            if (start >= edit.repStop) {  // above replacement
                start += delta;
                stop += delta;
            } else if (start == edit.repStart && stop == edit.repStop) {  // identical to replacement
                stop += delta;
            }  // else below the replacement so no change
        }  
        return {startIndex: start, stopIndex: stop};
    },

    changeListForFileNamed: function(fileName) {
        var fileString = this.getCachedText(fileName);
        return new FileParser().parseFile(fileName, this.currentVersion(fileName), fileString, this, "scan");
    },

    currentVersion: function(fileName) {
        // Expects to be called only when fileName will be found in cache!
        return this.editHistory[fileName].length;
    },

    getViewTitle: function() {
        return "Source Control for " + this.fileName;
    },

    testImportFiles: function() {
        // Enumerate all classes and methods, and report cases where we have no source descriptors
    },
    
    testMethodDefs: function() {
        // test if methods were parsed correctly
        // go to the source of all methods and use #checkBracketError for counting brackets
        var methodDefs = Object.values(this.methodDicts).inject([], function(methodDefs, classDef) {
            return methodDefs.concat(Object.values(classDef));
        });
        var defsWithError = methodDefs.select(function(ea) {
            if (Object.isFunction(ea) || !ea.getSourceCode) {
                console.log('No MethodDescriptor ' + ea);
                ea.error = 'Problem with descriptor, it is itself a function!';
                return true;
            };
            var error = this.checkBracketError(ea.getSourceCode());
            if (!error) return false;
            console.log('MethodDescriptor ' + ea.name + ' has an error.');
            ea.error = error;
            return true;
        }, this);
        return defsWithError;
    },
    
    // ------ reading files --------
    getCachedText: function(fileName) {
        // Return full text of the named file
        var fileString;
        var action = function(fileStringArg) { fileString = fileStringArg };
        this.getCachedTextAsync(fileName, action, true);
        return fileString;
    },
    
    getCachedTextAsync: function(fileName, action, beSync) {
        // Calls action with full text of the named file, installing it in cache if necessary
        var fileString = this.cachedFullText[fileName];
        if (fileString) {
            action.call(this, fileString);
            return;
        }
        
        var prepareDB = function(fileString) {
            this.cachedFullText[fileName] = fileString;
            this.editHistory[fileName] = [];
            action.call(this, fileString);
        }.bind(this);
        this.getFileContentsAsync(fileName, prepareDB, beSync);
    },
    
    getFileContentsAsync: function(fileName, action, beSync) {
	// DI:  This should be simplified - I removed timing (meaningless here for async)
	// rk: made async optional, added measure of timing again. Even in async mode it might be
	//     interesting how long it takes to read a file
	// convenient helper method
	var ms = new Date().getTime();
	var actionWrapper = function(fileString) {
	    ms = new Date().getTime() - ms;
            console.log(fileName + " read in " + ms + " ms.");
	    action.call(this, fileString);
	}.bind(this);
	
	var request = new NetRequest({model: {callback: actionWrapper}, setResponseText: 'callback'});
	if (beSync) request.beSync();
        request.get(URL.source.withFilename(fileName));
    },
    
    scanLKFiles: function(beSync) {
        this.interestingLKFileNames().each(function(fileName) {
            var action = function(fileString) {
                new FileParser().parseFile(fileName, this.currentVersion(fileName), fileString, this, "import");
            }.bind(this);
            this.getCachedTextAsync(fileName, action, beSync);
        }, this);
    },
    
    interestingLKFileNames: function() {
        var kernelFileNames = new FileDirectory(URL.source).filenames();
        var testFileNames = []/*new FileDirectory(URL.source.withFilename('Tests/')).filenames()*/;
        var jsFiles = kernelFileNames.concat(testFileNames).select(function(ea) { return ea.endsWith('.js') });
        jsFiles = jsFiles.uniq();
        // FIXME remove
        var rejects = ["Contributions.js", "Develop.js", "GridLayout.js", "obsolete.js", "requireTest01.js", "rhino-compat.js",
                       "Serialization.js", "test.js", "test1.js", "test2.js", "test3.js", "test4.js", "testaudio.js",
                       "workspace.js"]
        return jsFiles.reject(function(ea) { return rejects.include(ea) });
    },

});

module.SourceControl = null;


// ===========================================================================
// Source Code Descriptor
// ===========================================================================
Object.subclass('SourceCodeDescriptor', {

    initialize: function(sourceControl, fileName, versionNo, startIndex, stopIndex, lineNo, type, name) {
	// This state represents a given range of a given version of a given file in the SourceControl
	// The lineNo, type and name are further info arrived at during file parsing
        this.sourceControl = sourceControl;
        this.fileName = fileName;
        this.versionNo = versionNo;
        this.startIndex = startIndex;
        this.stopIndex = stopIndex;
        this.lineNo = lineNo;
        this.type = type;  // Do these need to be retained?
        this.name = name;
    },

    getSourceCode: function() {
        return this.sourceControl.getSourceCodeRange(this.fileName, this.versionNo, this.startIndex, this.stopIndex);
    },

    putSourceCode: function(newString) {
        this.sourceControl.putSourceCodeRange(this.fileName, this.versionNo, this.startIndex, this.stopIndex, newString);
    },

    newChangeList: function() {
        return this.sourceControl.changeListForFileNamed(this.fileName);
    }

});

SourceDatabase.subclass('AnotherSourceDatabase', {
    
    initialize: function($super) {
        this.cachedFullText = {};
        this.editHistory = {};
    },
    
    scanLKFiles: function($super, beSync) {
        this.interestingLKFileNames().each(function(fileName) {
            var action = function(fileString) {
            //     new FileParser().parseFile(fileName, this.currentVersion(fileName), fileString, this, "import");
                // console.log('Parsing ' + fileName);
                AnotherFileParser.withOMetaParser().parseSource(fileString);
            }.bind(this);
            this.getCachedTextAsync(fileName, action, beSync);
        }, this);
    },
    
    interestingLKFileNames: function($super) {
        // var kernelFileNames = new FileDirectory(URL.source).filenames();
        // var testFileNames = []/*new FileDirectory(URL.source.withFilename('Tests/')).filenames()*/;
        // var jsFiles = kernelFileNames.concat(testFileNames).select(function(ea) { return ea.endsWith('.js') });
        // jsFiles = jsFiles.uniq();
        // // FIXME remove
        // var rejects = ["Contributions.js", "Develop.js", "GridLayout.js", "obsolete.js", "requireTest01.js", "rhino-compat.js",
        //                "Serialization.js", "test.js", "test1.js", "test2.js", "test3.js", "test4.js", "testaudio.js",
        //                "workspace.js"]
        // return jsFiles.reject(function(ea) { return rejects.include(ea) });
        // new AnotherSourceDatabase().scanLKFiles()
        return ['Core.js', 'Base.js', 'Widgets.js', "scene.js", "Text.js", "Network.js", "Tools.js", "Data.js", "Storage.js", "Examples.js", "Main.js"];
    },
});
    
Object.subclass('BasicCodeMarkupParser', {
    documentation: "Evaluates code in the lkml code format",
    // this is the first attempt, format subject to change
    classQuery: new Query("/code/class"),
    protoQuery: new Query("proto"),
    staticQuery: new Query("static"),

    nameOf: function(element) {
	var name = element.getAttributeNS(null, "name");
	if (!name) throw new Error("no class name");
	return name;
    },

    parseDocumentElement: function(element, isHack) {
	var classes;
	if (isHack) {
	    var xpe = new XPathEvaluator();
	    function resolver(arg) {
		return Namespace.SVG;
	    }
	    var result = xpe.evaluate("/hack:code/hack:class", element, resolver, XPathResult.ANY_TYPE, null);
	    var res = null;
	    classes = [];
	    while (res = result.iterateNext()) classes.push(res);
	}  else {
	    classes = this.classQuery.findAll(element);
	}

	for (var i = 0; i < classes.length; i++) 
	    this.parseClass(classes[i], isHack);
	return classes;
    },

    parseClass: function(element, isHack) {
	// note eval oreder first parse proto methods, then static methods.
	var className = this.nameOf(element);
	var klass = null;
	var superName = element.getAttributeNS(null, "super");
	
	if (superName) { // super is present so we are subclassing (too hackerish?)
	    var superClass = Class.forName(superName);
	    if (!Class.isClass(superClass)) throw new Error('no superclass');
	    klass = superClass.subclass(className);
	} else {
	    klass = Class.forName(className);
	}
	
	var protos;

	if (isHack) {
	    var xpe = new XPathEvaluator();
	    function resolver(arg) {
		return Namespace.SVG;
	    }
	    var result = xpe.evaluate("hack:proto", element, resolver, XPathResult.ANY_TYPE, null);
	    protos = [];
	    var res = null;
	    while (res = result.iterateNext()) protos.push(res);
	}  else {
	    protos = this.protoQuery.findAll(element);
	}

	for (var i = 0; i < protos.length; i++)
	    this.parseProto(protos[i], klass);

	var statics = this.staticQuery.findAll(element);
	for (var i = 0; i < statics.length; i++)
	    this.parseStatic(statics[i], klass);
    },

    evaluateElement: function(element) {
	try {
	    // use intermediate value because eval doesn't seem to return function
	    // values.
	    // this would be a great place to insert a Cajita evaluator.
	    return eval("BasicCodeMarkupParser._=" + element.textContent);
	} catch (er) { 
	    console.log("error " + er + " parsing " + element.textContent);
	    return undefined;
	}
    },

    parseProto: function(protoElement, cls) {
	var name = this.nameOf(protoElement);
	var mixin = {};
	mixin[name] = this.evaluateElement(protoElement);
	cls.addMethods(mixin);
    },

    parseStatic: function(staticElement, cls) {
	var name = this.nameOf(staticElement);
	cls[name] = this.evaluateElement(staticElement);
    }

});



BasicCodeMarkupParser.subclass('CodeMarkupParser', ViewTrait, {
    formals: ["CodeDocument", "CodeText", "URL"],

    initialize: function(url) {
	var model = Record.newPlainInstance({ CodeDocument: null, CodeText: null, URL: url});
	this.resource = new Resource(model.newRelay({ ContentDocument: "+CodeDocument", ContentText: "+CodeText", URL: "-URL"}), 
				     "application/xml");
	this.connectModel(model.newRelay({ CodeDocument: "CodeDocument", CodeText: "CodeText"}));
    },

    parse: function() {
	this.resource.fetch();
    },
    
    onCodeTextUpdate: function(txt) {
	if (!txt) return;
	// in case the document is served as text anyway, try forcing xml
	var parser = new DOMParser();
	var xml = parser.parseFromString(txt, "text/xml");
	this.onCodeDocumentUpdate(xml);
    },

    onCodeDocumentUpdate: function(doc) {
	if (!doc) return;
	this.parseDocumentElement(doc.documentElement);
	this.onComplete();
    },

    onComplete: function() {
	// override to supply an action 
    }, 

});

Object.extend(CodeMarkupParser, {
    load: function(filename, callback) {
	var parser = new CodeMarkupParser(URL.source.withFilename(filename));
	if (callback) parser.onComplete = callback;
	parser.parse();
    }
});


// ===========================================================================
// ChangeSet
// ===========================================================================
Object.subclass('ChangeSet', {

    initialize: function(world) {
	// Keep track of an ordered list of changes for this world
        this.changes = [];
	this.changesNode = LivelyNS.create("code");
	world.addWrapperToDefs(undefined); // just ensure that defs exists
	world.defs.appendChild(this.changesNode);
    },
    logChange: function(item) {
	this.changes.push(item);
	switch (item.type) {
	case 'method':
	    var classNode = this.changesNode.appendChild(LivelyNS.create("class"));
	    classNode.setAttributeNS(null, "name", item.className);
	    var methodNode = classNode.appendChild(LivelyNS.create("proto"));
	    methodNode.setAttributeNS(null, "name", item.methodName);
	    methodNode.appendChild(NodeFactory.createCDATA(item.methodString));
	    break;
	case 'subclass':
	    var classNode = this.changesNode.appendChild(LivelyNS.create("class"));
	    classNode.setAttributeNS(null, "name", item.subName);
	    className.setAttributeNS(null, "super", item.className);
	default:
	    console.log('not yet handling type ' + item.type);
	}
    },
    setChanges: function(arrayOfItems) {
	this.changes = arrayOfItems;
    },
    evaluateAll: function() {
	// FIXME: use markup parser instead?
	this.changes.forEach(function(item) {this.evalItem(item)}, this);
    },
    evalItem: function(item) {
	// FIXME: use markup parser instead?
	console.log("ChangeSet evaluating a " + item.type + " def.");
	if(item.type == 'method') eval(item.className + '.prototype.' + item.methodName + ' = ' + item.methodString);
	if(item.type == 'subclass') eval(item.className + '.subclass("' + item.subName + '", {})');
	if(item.type == 'doit') eval(item.doitString);
    }
});

ChangeSet.current = function() {
    // Return the changeSet associated with the current world
    var world = WorldMorph.current();
    var chgs = world.changes;
    if (!chgs) {
	chgs = new ChangeSet(world);
	world.changes = chgs;
    }
    return chgs;
};



}.logCompletion("Tools.js"));

