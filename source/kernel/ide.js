module('lively.ide').requires('lively.Text', 'lively.Tools', 'lively.Ometa', 'LKFileParser.js').toRun(function(module, text, tools, ometa) {
    
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
Widget.subclass('lively.ide.SystemBrowser', {

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
        if (!tools.SourceControl) throw new Error('No source control!');
        if (!this._rootNode)
            this._rootNode = new module.SourceControlNode(tools.SourceControl, this);
            // this._rootNode = new module.EnvironmentNode(Global, this);
        return this._rootNode;
    },

    start: function() {
        // FIXME this doesn't belong here

        this.setPane1Content(this.rootNode().childNodesAsListItems());
    },

    buildView: function (extent) {

        this.start();

        var panel = PanelMorph.makePanedPanel(extent, [
            ['Pane1', newRealListPane, new Rectangle(0, 0, 0.35, 0.40)],
            ['Pane2', newRealListPane, new Rectangle(0.35, 0, 0.3, 0.45)], //['Pane2', newRealListPane, new Rectangle(0.35, 0, 0.3, 0.4)],
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

Object.subclass('lively.ide.BrowserNode', {

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

    statusMessage: function(string) {
        this.browser && this.browser.setStatusMessage(string);
    }

});

module.BrowserNode.subclass('lively.ide.EnvironmentNode', {

    childNodes: function() {
        return this.target.subNamespaces(true).concat([this.target]).collect(function(ea) { return new module.NamespaceNode(ea, this.browser) }.bind(this));
    }
});

module.BrowserNode.subclass('lively.ide.NamespaceNode', { // rename to ModuleNode

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

module.BrowserNode.subclass('lively.ide.ClassNode', {
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
        var source = tools.SourceControl.methodDictFor(this.target.type)['*definition'];
        if (source) {
            this.statusMessage('Definition of class of SourceDB.');
            return source.getSourceCode()
        };
        this.statusMessage('No definition of class in SourceDB found.');
        return 'class def of ' + this.target.type
    },
});

module.BrowserNode.subclass('lively.ide.ObjectNode', {

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

module.BrowserNode.subclass('lively.ide.MethodNode', {

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

module.MethodNode.subclass('lively.ide.ClassMethodNode', {

    initialize: function($super, target, browser, theClass, nameInOwner) {
        $super(target, browser, theClass);
        this.nameInOwner = nameInOwner;
    },

    asString: function() {
        return this.nameInOwner || this.target.name || 'anonymous class function';
    },

});
module.BrowserNode.subclass('lively.ide.FunctionNode', {

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

// Nodes for using just source code from files, for AnotherSourceDatabase
module.BrowserNode.subclass('lively.ide.SourceControlNode', {
    childNodes: function() {
        return this.target.modules.collect(function(ea) { return new module.CompleteFileDefNode(ea, this.browser) }.bind(this));
    }
});

module.NamespaceNode.subclass('lively.ide.CompleteFileDefNode', {

    initialize: function($super, target, browser) {
        $super(target, browser);
        this.getDefsFromModuleAndUsingDefs();
    },

    getDefsFromModuleAndUsingDefs: function() {
        var l = this.target.subElements.length;
        for (var i = 0; i < l; i++) {
            var type = this.target.subElements[i].type;
            if (type === 'moduleDef' || type == 'usingDef')
                this.target.subElements = this.target.subElements.concat(this.target.subElements[i].subElements)
        }            
    },

    childNodes: function() {
        var browser = this.browser;
        var completeFileDef = this.target;
        switch (this.mode) {
           case "classes":
            return this.target.subElements
                .select(function(ea) { return ea.type === 'klassDef' || ea.type === 'klassExtensionDef'})
                .sort(function(a,b) { return a.name.charCodeAt(0)-b.name.charCodeAt(0) })
                .collect(function(ea) { return new module.ClassDefNode(ea, browser) });
           case "functions":
            return this.target.subElements
                .select(function(ea) { return ea.type === 'staticFuncDef' || ea.type === 'executedFuncDef' || ea.type === 'methodModificationDef' || ea.type === 'functionDef' })
                .sort(function(a,b) { if (!a.name || !b.name) return -999; return a.name.charCodeAt(0)-b.name.charCodeAt(0) })
                .collect(function(ea) { return new module.FunctionDefNode(ea, browser) });
           case "objects":
            return this.target.subElements
               .select(function(ea) { return ea.type === 'objectDef' || ea.type === 'unknown' || ea.type === 'moduleDef' || ea.type === 'usingDef'})
               .sort(function(a,b) { if (!a.name || !b.name) return -999; return a.name.charCodeAt(0)-b.name.charCodeAt(0) })
               .collect(function(ea) { return new module.ObjectDefNode(ea, browser) });
           default: return ['Huh']
        }
    },

    asString: function() {
        return this.target.name;
    },

    buttonSpecs: function($super) {
        return $super().concat([{label: 'doits',action: function() {}}]);
    },

    sourceString: function() {
        return this.target.getSourceCode();
    },

});

module.BrowserNode.subclass('lively.ide.ClassDefNode', {

    childNodes: function() {
        var classDef = this.target;
        var browser = this.browser;
        return classDef.subElements
            .select(function(ea) { return ea.type === 'propertyDef' || ea.type === 'methodDef' })
            .sort(function(a,b) { if (!a.name || !b.name) return -999; return a.name.charCodeAt(0)-b.name.charCodeAt(0) })
            .collect(function(ea) { return new module.ClassElemDefNode(ea, browser) });
    },

    asString: function() {
        return this.target.name || 'has no name!'
    },

    sourceString: function() {
        return this.target.getSourceCode();
    },

    saveSource: function(newSource, sourceControl) {
        this.target.putSourceCode(newSource);
    }
});

module.BrowserNode.subclass('lively.ide.ObjectDefNode', {

    childNodes: function() {
        if (!this.target.subElements) return [];
        // FIXME duplication with ClassDefNode
        var obj = this.target;
        var browser = this.browser;
        return obj.subElements
            .select(function(ea) { return ea.type === 'propertyDef' || ea.type === 'methodDef' })
            .sort(function(a,b) { if (!a.name || !b.name) return -999; return a.name.charCodeAt(0)-b.name.charCodeAt(0) })
            .collect(function(ea) { return new module.ClassElemDefNode(ea, browser) });
    },

    asString: function() {
        return this.target.name || 'has no name!'
    },

    sourceString: function() {
        return this.target.getSourceCode();
    },

    saveSource: function(newSource, sourceControl) {
        this.target.putSourceCode(newSource);
    }
})

module.BrowserNode.subclass('lively.ide.ClassElemDefNode', {

    methodName: function() {
        return this.target.name || 'no name!';
    },

    sourceString: function() {
        return this.target.getSourceCode();
    },

    asString: function() {
        return this.methodName();
    },

    evalSource: function(newSource) {
        // var methodName = this.target.methodName;
        // if (!methodName) throw dbgOn(new Error('No method name!'));
        // var methodDef = this.theClass.type + ".prototype." + methodName + " = " + newSource;
        // try {
        //     eval(methodDef);
        //     console.log('redefined ' + methodName);
        // } catch (er) {
        //     WorldMorph.current().alert("error evaluating method " + methodDef);
        //     return false;
        // }
        // // ChangeSet.current().logChange({type: 'method', className: className, methodName: methodName, methodString: methodString});
        // return true;
    },

    saveSource: function(newSource, sourceControl) {
        this.target.putSourceCode(newSource);
    }
});

module.BrowserNode.subclass('lively.ide.FunctionDefNode', {

    asString: function() {
        return this.target.name
    },

    sourceString: function() {
        return this.target.getSourceCode();
    },
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
        return OMetaSupport.matchAllWithGrammar(this.ometaParser, rule, src || this.src, true/*hideErrors?*/);
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
    
    parseSource: function(src, optFilename /* FIXME */) {
        this.fileName = optFilename; // for writing
        var msParseStart;
        var msStart = new Date().getTime();
        this.overheadTime = 0;
        
        this.prepareParsing(src);
        var specialDescr = [];
        var descr;
        
        while (this.ptr < this.src.length) {
            // msParseStart = new Date().getTime();
            
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
            
            // var msNow = new Date().getTime();
            // var duration = msNow-msParseStart;
            // console.log('Parsed line ' +
            //             this.findLineNo(this.lines, descr.startIndex) + ' to ' + this.findLineNo(this.lines, descr.stopIndex) +
            //             ' (' + descr.type + ':' + descr.name + ') after ' + (msNow-msStart)/1000 + 's (' + duration + 'ms)' +
            //             (duration > 100 ? '!!!!!!!!!!' : ''));
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
        descr.versionNo = 0;
        descr.fileName = this.fileName;
        descr.putSourceCode = function(newString) {
            if (!descr.fileName) throw dbgOn(new Error('No filename for descriptor ' + descr.name));
            tools.SourceControl.putSourceCodeRange(descr.fileName, descr.versionNo, descr.startIndex, descr.stopIndex, newString);
            descr.versionNo++;
            descr.getSourceCode = function() { return newString };
        },
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

SourceDatabase.subclass('AnotherSourceDatabase', {
    
    initialize: function($super) {
        this.cachedFullText = {};
        this.editHistory = {};
        this.modules = [];
    },
    
    scanLKFiles: function($super, beSync) {
        // new AnotherSourceDatabase()
        var ms = new Date().getTime();
        this.interestingLKFileNames().each(function(fileName) {
            var action = function(fileString) {
                this.modules.push({
                    name: fileName,
                    type: 'completeFileDef',
                    startIndex: 0,
                    stopIndex: fileString.length-1,
                    subElements: AnotherFileParser.withOMetaParser().parseSource(fileString, fileName),
                    getSourceCode: function() { return fileString }
                });
            };
            this.getCachedTextAsync(fileName, action, beSync);
        }, this);
        console.log('Altogether: ' + (new Date().getTime()-ms)/1000 + ' s');
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
        // return ['Core.js', 'Base.js', "Tools.js", /*'Widgets.js', "scene.js", "Text.js", "Network.js", "Data.js", "Storage.js", "Examples.js", "Main.js"*/];
        // return ["miniprototype.js", "defaultconfig.js", "localconfig.js", "Base.js", "scene.js", "Core.js", "Text.js", "Widgets.js", "Network.js", "Data.js", "Storage.js", "Tools.js", "Examples.js", "Main.js"];
        return ["test.js"];
    },
});

// see also lively.Tools.startSourceControl
module.startSourceControl = function() {
    if (tools.SourceControl instanceof AnotherSourceDatabase) return;
    tools.SourceControl = new AnotherSourceDatabase();
    tools.SourceControl.scanLKFiles(true);
};

});