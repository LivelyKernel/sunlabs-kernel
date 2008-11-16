module('lively.Tests.ToolsTests').requires('lively.TestFramework', 'lively.Tools').toRun(function(thisModule, testModule, toolsModule) {

thisModule.createDummyNamespace = function() {
    console.assert(!thisModule['testNS'], 'testNS already existing');
    //creating 5 namespaces
    namespace('testNS.one', thisModule);
    namespace('testNS.two', thisModule);
    namespace('testNS.three.threeOne', thisModule);        
    // create classes
    Object.subclass(thisModule.namespaceIdentifier + '.testNS.Dummy', { method1: function() { 1 } });
    Object.subclass(thisModule.namespaceIdentifier + '.testNS.one.Dummy');
    Object.subclass(thisModule.namespaceIdentifier + '.testNS.three.threeOne.Dummy');
    // create functions
    thisModule.testNS.dummyFunc = function() { return 1 };
    thisModule.testNS.three.threeOne.dummyFunc = function() { return 2 };
};

thisModule.removeDummyNamespace = function() {
    delete thisModule['testNS'];
};

// Browser related tests
TestCase.subclass('lively.Tests.ToolsTests.SystemBrowserTests', {
    
    shouldRun: true,
    
    setUp: function() {
        thisModule.createDummyNamespace();
        var browser = new toolsModule.SystemBrowser();
        browser.rootNode = function() { return new toolsModule.EnvironmentNode(thisModule.testNS, browser) };
        browser.start();
        this.sut = browser;
    },
    
    testModelStuff: function() {
        this.assert(this.sut.setPane1Content && this.sut.getPane1Content, 'no automatic accessors');
        var model = this.sut.getModel();
        this.assert(model, 'No model');
        this.sut.setPane1Content(1);
        this.assertEqual(model.getPane1Content(), 1);
        // model.setModules(2);
        // this.assertEqual(this.sut.getModules(), 2);
        
        this.assert(this.sut.setStatusMessage);
    },
    
    testGetNodeSiblings: function() {
        var node = this.sut.nodesInPane('Pane1').first()
        this.assert(node instanceof toolsModule.NamespaceNode, 'no nsNode');
        var result = this.sut.siblingsFor(node);
        this.assert(result, 'siblingsFor returned nothing useful');
        var allNodesButOne = Array.prototype.without.apply(this.sut.nodesInPane('Pane1'), result);
        
        this.assertEqual(allNodesButOne.length, 1);
        this.assertIdentity(allNodesButOne.first(), node);
    },

    testOpenSystemBrowser: function() {
        this.sut.openIn(WorldMorph.current());
    },
    
    tearDown: function() {
        thisModule.removeDummyNamespace();
    }
        
    

    
});

TestCase.subclass('lively.Tests.ToolsTests.NodeTest', {
    setUp: function() { thisModule.createDummyNamespace() },
    tearDown: function() { thisModule.removeDummyNamespace() }
});

thisModule.NodeTest.subclass('lively.Tests.ToolsTests.EnvironmentNodeTest', {
    
    testEnvironmentNodeReturnsNS: function() {
        var sut = new toolsModule.EnvironmentNode(thisModule.testNS);
        this.assertIdentity(sut.target, thisModule.testNS);
        var result = sut.childNodes().collect(function(ea) { return ea.target });
        this.assertEqual(result.length, 5);
        this.assert(result.include(thisModule.testNS));
        this.assert(result.include(thisModule.testNS.three.threeOne));
    }
});

thisModule.NodeTest.subclass('lively.Tests.ToolsTests.NamespaceNodeTest', {

    setUp: function($super) {
        $super();
        this.sut = new toolsModule.NamespaceNode(thisModule.testNS);
    },
    
    testChildNodes: function() {
        this.sut.mode = 'classes';
        var result = this.sut.childNodes();
        this.assertEqual(result.length, 1);
        this.assertIdentity(result[0].target, thisModule.testNS.Dummy);
    },
    
    testModeButtons: function() {
        var result = this.sut.buttonSpecs();
        this.assertEqual(result.length, 3);
        // test if button specs are correct
        this.assertEqual(result[0].label, 'classes');
        this.assert(result[0].action instanceof Function);
        this.assertEqual(result[1].label, 'functions');
        this.assert(result[1].action instanceof Function);
        // test the button action
        var sibling = new toolsModule.NamespaceNode(thisModule.testNS.one);
        sibling.mode = 'classes';
        this.sut.siblingNodes = function() { return [sibling] };
        this.assertEqual(this.sut.mode, 'classes');
        result[1].action();
        this.assertEqual(this.sut.mode, 'functions');
        this.assertEqual(sibling.mode, 'functions');
    }
});

thisModule.NodeTest.subclass('lively.Tests.ToolsTests.ClassNodeTest', {
    
    setUp: function($super) {
        $super();
        this.sut = new toolsModule.ClassNode(thisModule.testNS.Dummy); 
    },
    
    testChildNodes: function() {
        var sut = this.sut;
        sut.mode = 'instance';
        var result = sut.childNodes();
        this.assertEqual(result.length, sut.target.functionNames().length);
        result.each(function(ea) { this.assertIdentity(ea.theClass, sut.target) }.bind(this));
        var method = result.detect(function(ea) { return ea.target.methodName === 'method1' });
        this.assert(method);
    },
    
    testSource: function() {
        // implement me!
    }
});

thisModule.NodeTest.subclass('lively.Tests.ToolsTests.MethodNodeTest', {
    
    setUp: function($super) {
        $super();
        var theClass = thisModule.testNS.Dummy;
        this.sut = new toolsModule.MethodNode(theClass.prototype.method1, null, theClass); 
    },
        
    testSource: function() {
        this.assert(this.sut.sourceString().endsWith(thisModule.testNS.Dummy.prototype.method1.toString()));
    },
    
    testEvaluateNewSource: function() {
        var newSource = 'function () { 2 }';
        this.assert(this.sut.evalSource(newSource));
        this.assertEqual(thisModule.testNS.Dummy.prototype.method1.toString(), newSource);
    },
    
    testSaveNewSource: function() {
        var newSource = 'function () { 2 }';
        var sourceControl = {
            methodDictFor: function(className) {
                this.assertEqual(className, 'thisModule.testNS.Dummy');
                return {
                    method1: {putSourceCode: function(src) {
                        this.assertEqual(src, 'method1: function () { 2 },')
                    }.bind(this)}
                }
            }.bind(this)
        }
        this.assert(this.sut.evalSource(newSource));
        this.assertEqual(thisModule.testNS.Dummy.prototype.method1.toString(), newSource);
    }
});

TestCase.subclass('lively.Tests.ToolsTests.FileParserTest', {
    
    setUp: function() {
        this.sut = new FileParser();
        this.sut.verbose = true;
    },
    
    testCheckExistingMethodDefs: function() {
        var sourceControl = new SourceDatabase();
        sourceControl.scanLKFiles(true);
        var errors = sourceControl.testMethodDefs();
        this.assertEqual(errors.length, 0);
    },
    
    testParseClassDef: function() {
        var source = "Object.subclass('Test', {});"
        this.sut.parseFile('1', 0, source, null/*db*/, 'scan', null/*search_str*/)
        this.assertEqual(this.sut.changeList.length, 1);
        this.assertEqual(this.sut.changeList.first().name, 'Test');
        this.assertEqual(this.sut.changeList.first().type, 'classDef');
    },
    
    testScanModuleDef: function() {
        var source = "module('bla.blupf').requires('blupf.bla').toRun({\nObject.subclass('Test', {\n});\n\n});"
        this.sut.parseFile('2', 0, source, null/*db*/, 'scan', null/*search_str*/)
        this.assertEqual(this.sut.changeList.length, 2);
        this.assertEqual(this.sut.changeList[0].type, 'moduleDef');
    },
    
    testScanFunctionDef01: function() {
        var source = "module('bla.blupf').requires('blupf.bla').toRun({\nfunction abc(a,b,c) {\n return 1+2;\n};\nObject.subclass('Test', {\n});\n\n});"
        this.sut.parseFile('3', 0, source, null/*db*/, 'scan', null/*search_str*/)
        this.assertEqual(this.sut.changeList.length, 3);
        this.assertEqual(this.sut.changeList[1].type, 'functionDef');
    },
    
    testScanFunctionDef02: function() {
        var source = "module('bla.blupf').requires('blupf.bla').toRun({\nvar abc = function(a,b,c) {\n return 1+2;\n};\nObject.subclass('Test', {\n});\n\n});"
        this.sut.parseFile('4', 0, source, null/*db*/, 'scan', null/*search_str*/)
        this.assertEqual(this.sut.changeList.length, 3);
        this.assertEqual(this.sut.changeList[1].type, 'functionDef');
    },
    
    testScanFunctionDefInDB: function() {
        var source = "function abc(a,b,c) {\n return 1+2;\n};"
        var db = new SourceDatabase();
        this.sut.parseFile('5', 0, source, db, 'import', null/*search_str*/)
        this.assertEqual(this.sut.changeList.length, 1);
        this.assertEqual(this.sut.changeList[0].type, 'functionDef');
    }
    
});

TestCase.subclass('lively.Tests.ToolsTests.AnotherFileParserTest', {
    
    setUp: function() {
        this.sut = new AnotherFileParser();
        this.sut.verbose = true;
    },
    
    testParseClass: function() {    // Object.subclass
        var src = 'Object.subclass(\'Dummy\', {\n' +
                  '\tsetUp: function() { thisModule.createDummyNamespace() },\n' +
                  '\ttearDown: function() { thisModule.removeDummyNamespace() }\n' +
                  '})';
        this.sut.source = src;
        var descriptor = this.sut.parseClass();
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'Dummy');
        this.assertEqual(descriptor.superclassName, 'Object');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.length - 1);
    },
    
    testParseClassWithTrait: function() {   // Object.subclass
        var src = 'lively.xyz.ABC.TheClass.subclass(\'CodeMarkupParser\', ViewTrait, {\n' +
            'formals: ["CodeDocument", "CodeText", "URL"],\n\n' +
            'initialize: function(url) {\n\n}\n\n});'
        this.sut.source = src;
        var descriptor = this.sut.parseClass();
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'CodeMarkupParser');
        this.assertEqual(descriptor.superclassName, 'lively.xyz.ABC.TheClass');
        this.assertEqual(descriptor.trait, 'ViewTrait');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.length - 1);
        this.assertEqual(descriptor.subElements.length, 2);
    },
    
    testParseClassAndMethods: function() {  // Object.subclass
        var src = 'Object.subclass(\'Dummy\', {\n' +
                  '\tsetUp: function() { thisModule.createDummyNamespace() },\n' +
                  'formals: ["Pane1Content",\n\t\t"Pane1Selection", "Pane1Choicer"],\n' +
                  '\ttearDown: function() { thisModule.removeDummyNamespace() }\n' +
                  '})';
        this.sut.source = src;
        var descriptor = this.sut.parseClass();
        this.assert(descriptor, 'no descriptor');
        
        var dscr = descriptor.subElements;
        this.assertEqual(dscr.length, 3);
        this.assertEqual(dscr[0].name, 'setUp');
        this.assertIdentity(dscr[0].startIndex, src.indexOf('setUp'));
        this.assertIdentity(dscr[0].stopIndex, src.indexOf('},\nformals'));
        this.assertEqual(dscr[1].name, 'formals');
        this.assertIdentity(dscr[1].startIndex, src.indexOf('formals:'));
        this.assertIdentity(dscr[1].stopIndex, src.indexOf(',\n\ttearDown'));
        this.assertEqual(dscr[2].name, 'tearDown');
        this.assertIdentity(dscr[2].startIndex, src.indexOf('tearDown'));
        this.assertIdentity(dscr[2].stopIndex, src.indexOf('}\n})'));
    },
    
    testParseMethod: function() {   // xxx: function()...,
        var src = 'testMethod_8: function($super,a,b) { function abc(a) {\n\t1+2;\n}; }';
        this.sut.source = src;
        var descriptor = this.sut.parse('methodDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'testMethod_8');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.length - 1);
    },
    
    testParseProperty: function() { // xxx: yyy,
        var src = 'initialViewExtent: pt(400,250),';
        this.sut.source = src;
        var descriptor = this.sut.parse('propertyDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'initialViewExtent');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(','));
    },

    testParseObject: function() {   // var object = {...};
        var src = 'var Converter = {\n'+
            '\tdocumentation: "singleton used to parse DOM attribute values into JS values",\n\n\n\n' +
            'toBoolean: function toBoolean(string) {\n' +
        	'return string && string == \'true\';\n}\n\n};';
        this.sut.source = src;
        var descriptor = this.sut.parse('objectDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'Converter');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
        this.assertEqual(descriptor.subElements.length, 2);
    },
    
    testParseFunction1: function() {    // function abc() {...};
        var src = 'function equals(leftObj, rightObj) {\n\t\treturn cmp(leftObj, rightObj);\n\t};'
        this.sut.source = src;
        var descriptor = this.sut.parse('functionDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'equals');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
    },
    
    testParseFunction2: function() {    // var abc = function() {...};
        var src = 'var equals = function(leftObj, rightObj) {\n\t\treturn cmp(leftObj, rightObj);\n\t};'
        this.sut.source = src;
        var descriptor = this.sut.parse('functionDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'equals');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
    },
    
    testParseExecutedFunction: function() { // (function() {...});
        var src = '(function testModuleLoad() {\n\t\tvar modules = Global.subNamespaces(true);\n\t}).delay(5);';
        this.sut.source = src;
        var descriptor = this.sut.parse('executedFuncDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'testModuleLoad');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
    },
    
    testParseStaticFunctions: function() {  // Klass.method = function() {...};
        var src = 'thisModule.ScriptEnvironment.open = function() {};'
        this.sut.source = src;
        var descriptor = this.sut.parse('staticFuncDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'open');
        this.assertEqual(descriptor.klassName, 'thisModule.ScriptEnvironment');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
    },
    
    testParseMethodModification: function() {   // Klass.protoype.method = function() {...};
        var src = 'Morph.prototype.morphMenu = Morph.prototype.morphMenu.wrap(function(proceed, evt) {  });';
        this.sut.source = src;
        var descriptor = this.sut.parse('methodModificationDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'morphMenu');
        this.assertEqual(descriptor.klassName, 'Morph');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
    },
    
    testParseClassExtension01: function() { // Object.extend(...);
        var src = 'Object.extend(thisModule.ScriptEnvironment, { \nopen: function() {\n\t\t1+2\n\t}});';
        this.sut.source = src;
        var descriptor = this.sut.parse('klassExtensionDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'thisModule.ScriptEnvironment');
        this.assertEqual(descriptor.subElements.length, 1);
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
    },
    
    testParseClassExtension02: function() { // Klass.addMethods(...); || Klass.addProperties(...);
        var src = 'Morph.addMethods({\n\ngetStyleClass: function() {\n\treturn this.styleClass;\n},});';
        this.sut.source = src;
        var descriptor = this.sut.parse('klassExtensionDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'Morph');
        this.assertEqual(descriptor.subElements.length, 1);
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
    },
    
    testParseComment: function() { // /* ... */ || // ...
        var src = '   /*\n * bla bla bla\n *\n */';
        this.sut.source = src;
        var descriptor = this.sut.parse('comment');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.type, 'comment');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf('/'));
    },
    
    testFileContent: function() {
        //var src = '// Bla\n// ===\n\nnamespace(\'lively.data\');\n\nObject.subclass(\'lively.data.Wrapper\', { });\n\n';
        var src = '// Bla\n// ===\nnamespace(\'lively.data\');\nObject.subclass(\'lively.data.Wrapper\', { });';
        this.sut.source = src;
        var all = this.sut.parse('fileContent');
        this.assertEqual(all.length, 6);
    }
    
    
});

TestCase.subclass('lively.Tests.ToolsTests.KeyboardTest', {
    
    shouldRun: false,
    
    testStartKeyWatcher: function() {
        var keyWatcher = Morph.makeRectangle(0,0,100,30);
        var label = new TextMorph(keyWatcher.bounds());
        label.takesKeyboardFocus = Functions.False;
        label.onKeyDown = Functions.False;
        label.onKeyPress = Functions.False;
        keyWatcher.addMorph(label);
        keyWatcher.takesKeyboardFocus = Functions.True;
        keyWatcher.onKeyPress = function(evt) {
                console.log('PRESS');
             //debugger;
            label.setTextString(evt.getKeyChar() + '---' + evt.getKeyCode());
            // evt.stop();
        }
        
        keyWatcher.openInWorld();
        keyWatcher.requestKeyboardFocus(WorldMorph.current().hands.first());
    }
})
    
})