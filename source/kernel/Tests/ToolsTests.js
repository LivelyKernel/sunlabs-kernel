module('lively.Tests.ToolsTests').requires('lively.TestFramework', 'lively.Tools', 'lively.ide').toRun(function(thisModule, testModule, toolsModule, ideModule) {

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
        var browser = new ideModule.SystemBrowser();
        browser.rootNode = function() { return new ideModule.EnvironmentNode(thisModule.testNS, browser) };
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
        this.assert(node instanceof ideModule.NamespaceNode, 'no nsNode');
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
        var sut = new ideModule.EnvironmentNode(thisModule.testNS);
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
        this.sut = new ideModule.NamespaceNode(thisModule.testNS);
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
        var sibling = new ideModule.NamespaceNode(thisModule.testNS.one);
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
        this.sut = new ideModule.ClassNode(thisModule.testNS.Dummy); 
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
        this.sut = new ideModule.MethodNode(theClass.prototype.method1, null, theClass); 
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
        this.sut = AnotherFileParser.withOMetaParser();
    },
    
    assertSubDescriptorsAreValid: function(descr) {
        for (var i = 0; i < descr.length; i++) {
            if (descr[i].subElements) this.assertSubDescriptorsAreValid(descr[i].subElements);
            if (!descr[i+1]) continue;
            console.log(descr[i].name + ':' + descr[i].startIndex + '-' + descr[i].stopIndex + '<->' + descr[i+1].name + ':' + descr[i+1].startIndex + '-' + descr[i+1].stopIndex);
            this.assert(descr[i].stopIndex < descr[i+1].startIndex,
                'descrs conflict: ' + descr[i].type + ' ' + descr[i].name + ' <----> ' + descr[i+1].type + ' ' + descr[i+1].name);
            
        }        
    },
    
    assertDescriptorsAreValid: function(descr) {
        for (var i = 0; i < descr.length; i++) {
            if (descr[i].subElements) this.assertSubDescriptorsAreValid(descr[i].subElements);
            if (!descr[i+1]) continue;
            console.log(descr[i].name + ':' + descr[i].startIndex + '-' + descr[i].stopIndex + '<->' + descr[i+1].name + ':' + descr[i+1].startIndex + '-' + descr[i+1].stopIndex);
            this.assertEqual(descr[i].stopIndex, descr[i+1].startIndex - 1,
                'descrs conflict: ' + descr[i].type + ' ' + descr[i].name + ' <----> ' + descr[i+1].type + ' ' + descr[i+1].name);
            
        }
    }
});

thisModule.AnotherFileParserTest.subclass('lively.Tests.ToolsTests.AnotherFileParserTest1', {
    
    testParseClass: function() {    // Object.subclass
        var src = 'Object.subclass(\'Dummy\', {\n' +
                  '\tsetUp: function() { thisModule.createDummyNamespace() },\n' +
                  '\ttearDown: function() { thisModule.removeDummyNamespace() }\n' +
                  '})';
        this.sut.src = src;
        var descriptor = this.sut.parseClass();
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'Dummy');
        this.assertEqual(descriptor.superclassName, 'Object');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.length - 1);
        this.assertDescriptorsAreValid([descriptor]);
    },
    
    testParseClassWithTrait: function() {   // Object.subclass
        var src = 'lively.xyz.ABC.TheClass.subclass(\'CodeMarkupParser\', ViewTrait, {\n' +
            'formals: ["CodeDocument", "CodeText", "URL"],\n\n' +
            'initialize: function(url) {\n\n}\n\n});'
        this.sut.src = src;
        var descriptor = this.sut.parseClass();
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'CodeMarkupParser');
        this.assertEqual(descriptor.superclassName, 'lively.xyz.ABC.TheClass');
        this.assertEqual(descriptor.trait, 'ViewTrait');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.length - 1);
        this.assertEqual(descriptor.subElements.length, 2);
        this.assertDescriptorsAreValid([descriptor]);
    },
    
    testParseSimpleSubclassing: function() {
        var src = 'Wrapper.subclass(\'lively.scene.Node\');';
        this.sut.src = src;
        var descriptor = this.sut.parseClass();
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'lively.scene.Node');
        this.assertEqual(descriptor.superclassName, 'Wrapper');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.length - 1);
        this.assertEqual(descriptor.subElements.length, 0);
    },
    
    testParseClassAndMethods: function() {  // Object.subclass
        var src = 'Object.subclass(\'Dummy\', {\n' +
                  '\tsetUp: function() { thisModule.createDummyNamespace() },\n' +
                  'formals: ["Pane1Content",\n\t\t"Pane1Selection", "Pane1Choicer"],\n' +
                  '\ttearDown: function() { thisModule.removeDummyNamespace() }\n' +
                  '})';
        this.sut.src = src;
        var descriptor = this.sut.parseClass();
        this.assert(descriptor, 'no descriptor');
        
        var dscr = descriptor.subElements;
        this.assertEqual(dscr.length, 3);
        this.assertEqual(dscr[0].name, 'setUp');
        this.assertIdentity(dscr[0].startIndex, src.indexOf('setUp'));
        this.assertIdentity(dscr[0].stopIndex, src.indexOf(',\nformals'));
        this.assertEqual(dscr[1].name, 'formals');
        this.assertIdentity(dscr[1].startIndex, src.indexOf('formals:'));
        this.assertIdentity(dscr[1].stopIndex, src.indexOf(',\n\ttearDown'));
        this.assertEqual(dscr[2].name, 'tearDown');
        this.assertIdentity(dscr[2].startIndex, src.indexOf('tearDown'));
        this.assertIdentity(dscr[2].stopIndex, src.lastIndexOf('\n})'));
        this.assertDescriptorsAreValid([descriptor]);
    },
    
    testParseMethod1: function() {   // xxx: function()...,
        var src = 'testMethod_8: function($super,a,b) { function abc(a) {\n\t1+2;\n}; }';
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('methodDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'testMethod_8');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.length - 1);
    },
    
    testParseMethod2: function() {   // xxx: function()...,
        var src = 'onEnter: function() {},';
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('methodDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'onEnter');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.length - 1);
    },
    
    testParseMethod3: function() {   // xxx: function()...,
        var src = 'setShape: function(newShape) {\n\tthis.internalSetShape(newShape);\n}.wrap(Morph.onLayoutChange(\'shape\')),';
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('methodDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'setShape');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.length - 1);
    },
    
    testParseProperty: function() { // xxx: yyy,
        var src = 'initialViewExtent: pt(400,250),';
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('propertyDef');
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
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('objectDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'Converter');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
        this.assertEqual(descriptor.subElements.length, 2);
        this.assertDescriptorsAreValid([descriptor]);
    },
    
    testParseFunction1: function() {    // function abc() {...};
        var src = 'function equals(leftObj, rightObj) {\n\t\treturn cmp(leftObj, rightObj);\n\t};'
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('functionDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'equals');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
    },
    
    testParseFunction2: function() {    // var abc = function() {...};
        var src = 'var equals = function(leftObj, rightObj) {\n\t\treturn cmp(leftObj, rightObj);\n\t};'
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('functionDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'equals');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
    },
    
    testParseExecutedFunction: function() { // (function() {...});
        var src = '(function testModuleLoad() {\n\t\tvar modules = Global.subNamespaces(true);\n\t}).delay(5);';
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('executedFuncDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'testModuleLoad');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
    },
    
    testParseStaticFunctions: function() {  // Klass.method = function() {...};
        var src = 'thisModule.ScriptEnvironment.open = function() {};'
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('staticFuncDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'open');
        this.assertEqual(descriptor.klassName, 'thisModule.ScriptEnvironment');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
        this.assertDescriptorsAreValid([descriptor]);
    },
    
    testParseMethodModification: function() {   // Klass.protoype.method = function() {...};
        var src = 'Morph.prototype.morphMenu = Morph.prototype.morphMenu.wrap(function(proceed, evt) {  });';
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('methodModificationDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'morphMenu');
        this.assertEqual(descriptor.klassName, 'Morph');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
        this.assertDescriptorsAreValid([descriptor]);
    },
    
    testParseClassExtension01: function() { // Object.extend(...);
        var src = 'Object.extend(thisModule.ScriptEnvironment, { \nopen: function() {\n\t\t1+2\n\t}\n});';
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('klassExtensionDef');
        this.assert(descriptor, 'no descriptor');
        this.assert(descriptor.name.startsWith('thisModule.ScriptEnvironment'));
        this.assertEqual(descriptor.subElements.length, 1);
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
        this.assertDescriptorsAreValid([descriptor]);
    },
    
    testParseClassExtension02: function() { // Klass.addMethods(...); || Klass.addProperties(...);
        var src = 'Morph.addMethods({\n\ngetStyleClass: function() {\n\treturn this.styleClass;\n},});';
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('klassExtensionDef');
        this.assert(descriptor, 'no descriptor');
        this.assert(descriptor.name.startsWith('Morph'));
        this.assertEqual(descriptor.subElements.length, 1);
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
        this.assertDescriptorsAreValid([descriptor]);
    },
    
    testParseComment: function() { // /* ... */ || // ...
        var src = '   /*\n * bla bla bla\n *\n */';
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('comment');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.type, 'comment');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf('/'));
        this.assertDescriptorsAreValid([descriptor]);
    },
            
    xtestFileContent: function() {
        var src = '// Bla\n// ===\n\nnamespace(\'lively.data\');\n\nObject.subclass(\'lively.data.Wrapper\', { });\n\n';
        this.sut.src = src;
        var all = this.sut.callOMeta('fileContent');
        this.assertEqual(all.length, 6);
    }
        
});

thisModule.AnotherFileParserTest.subclass('lively.Tests.ToolsTests.AnotherFileParserSpecialTest', {
            
    testParseCoreAlternativ: function() {
        // var url = URL.source.withFilename('Core.js');
        // var result = this.sut.parseFileFromUrl(url);
        var db = new SourceDatabase();
        var src = db.getCachedText('Core.js');
        var result = this.sut.parseSource(src);
        // this.assertDescriptorsAreValid(result);
    },
});

thisModule.AnotherFileParserTest.subclass('lively.Tests.ToolsTests.AnotherFileParserTest2', {
        
    testFindLinNo: function() {
        var str = 'abc\ndef123\n\n\nxyz\n';
        var lines = str.split(/[\n\r]/);
        this.assertEqual(this.sut.findLineNo(lines, 0), 1);
        this.assertEqual(this.sut.findLineNo(lines, 2), 1);
        this.assertEqual(this.sut.findLineNo(lines, 3), 1);
        this.assertEqual(this.sut.findLineNo(lines, 4), 2);
        this.assertEqual(this.sut.findLineNo(lines, 10), 2);
        this.assertEqual(this.sut.findLineNo(lines, 11), 3);
        this.assertEqual(this.sut.findLineNo(lines, 14), 5);
        this.assertEqual(this.sut.findLineNo(lines, 16), 5);
    },
    
    testParseCompleteSource: function() {
        var src = '// Bla\n// ===\n\nnamespace(\'lively.data\');\n\nObject.subclass(\'lively.data.Wrapper\', { });\n\n';
        var result = this.sut.parseSource(src);
        this.assertEqual(result.length, 5);
    },
    
    testOverlappingIndices: function() {
        var src =   
                    '/*' + '\n' +
                    ' * Copyright ï¿½ 2006-2008 Sun Microsystems, Inc.' + '\n' +
                    ' * All rights reserved.  Use is subject to license terms.' + '\n' +
                    ' * This distribution may include materials developed by third parties.' + '\n' +
                    ' *  ' + '\n' +
                    ' * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks' + '\n' +
                    ' * or registered trademarks of Sun Microsystems, Inc. in the U.S. and' + '\n' +
                    ' * other countries.' + '\n' +
                    ' */ ' + '\n' +
                    '\n' +
                    '/**' + '\n' +
                    '* Core.js.  This file contains the core system definition' + '\n' +
                    '* as well as the core Morphic graphics framework. ' + '\n' +
                    '*/' + '\n' + '\n' + '\n' +
                    '/* Code loader. Appends file to DOM. */' + '\n' +
                    'var Loader = {' + '\n' +
                    '\n' +
                    '     loadJs: function(url, onLoadCb, embedSerializable) {' + '\n' +
                    '\n' +
                    '         if (document.getElementById(url)) return;' + '\n' +
                    '\n' +
                    '         var script = document.createElement(\'script\');' + '\n' +
                    '         script.id = url;' + '\n' +
                    '         script.type = \'text/javascript\';' + '\n' +
                    '         script.src = url;' + '\n' +
                    '         var node = document.getElementsByTagName(embedSerializable ? "defs" : "script")[0];' + '\n' +
                    '         if (onLoadCb) script.onload = onLoadCb;' + '\n' +
                    '         node.appendChild(script);' + '\n' +
                    '     },' + '\n' +
                    '\n' +
                    '     scriptInDOM: function(url) {' + '\n' +
                    '         if (document.getElementById(url)) return true;' + '\n' +
                    '         var preloaded = document.getElementsByTagName(\'defs\')[0].childNodes;' + '\n' +
                    '         for (var i = 0; i < preloaded.length; i++)' + '\n' +
                    '             if (preloaded[i].getAttribute &&' + '\n' +
                    '                     preloaded[i].getAttribute(\'xlink:href\') &&' + '\n' +
                    '                         url.endsWith(preloaded[i].getAttribute(\'xlink:href\')))' + '\n' +
                    '                             return true' + '\n' +
                    '         return false;' + '\n' +
                    '     }' + '\n' +
                    '};';

        var result = this.sut.parseSource(src);
        this.assertDescriptorsAreValid(result);
    },
    
    testFailingKlass: function() { // scene.js 841
        var src = 'this.PathElement.subclass(\'lively.scene.MoveTo\', {\n\
    charCode: \'M\',\n\n\
    initialize: function(x, y) {\n\
    this.x = x;\n\
    this.y = y;\n\
    },\n\n\
    allocateRawNode: function(rawPathNode) {\n\
    this.rawNode = rawPathNode.createSVGPathSegMovetoAbs(this.x, this.y);\n\
    return this.rawNode;\n\
    },\n\n\
    controlPoints: function() {\n\
    return [pt(this.x, this.y)];\n\
    },\n\n\n\n});';
        var result = this.sut.parseSource(src);
        this.assert(result.length = 1); // FIXME
        this.assertEqual(result.last().type, 'klassDef');
        this.assertDescriptorsAreValid(result);
    },
    
    testFailingKlassExtension1: function() { // Core 1899 and before
        var src = '\n// Morph bindings to its parent, world, canvas, etc.' + '\n' +
        'Morph.addMethods({' + '\n' + '\n' +
            '   world: function() {' + '\n' +
        	'   return this.owner ? this.owner.world() : null;' + '\n' +
            '},' + '\n' + '\n' +
            '// Morph coordinate transformation functions' + '\n' + '\n' +
            '// SVG has transform so renamed to getTransform()' + '\n' +
            'getTransform: function() {' + '\n' +
        	'    if (this.pvtCachedTransform) return this.pvtCachedTransform;\n}' + '\n' + '\n' +
        	'});';
        var result = this.sut.parseSource(src);
        this.assert(result.length >= 1); // FIXME
        this.assertEqual(result.last().type, 'klassExtensionDef');
        this.assertDescriptorsAreValid(result);
    },
    
    testFailingKlassExtension2: function() { // Base 1945
        var src = 'Object.extend(Color, {' + '\n' +
        '    darkGray: Color.gray.darker(),' + '\n' +
        '    lightGray: Color.gray.lighter(),' + '\n' +
        '    veryLightGray: Color.gray.lighter().lighter(),' + '\n' +
        '    turquoise: Color.rgb(0, 240, 255),' + '\n' +
        '    //    brown: Color.rgb(182, 67, 0),' + '\n' +
        '    //    red: Color.rgb(255, 0, 0),' + '\n' +
        '    orange: Color.rgb(255, 153, 0),' + '\n' +
        '    //    yellow: Color.rgb(204, 255, 0),' + '\n' +
        '    //    limeGreen: Color.rgb(51, 255, 0),' + '\n' +
        '    //    green: Color.rgb(0, 255, 102),' + '\n' +
        '    //    cyan: Color.rgb(0, 255, 255),' + '\n' +
        '    //    blue: Color.rgb(0, 102, 255),' + '\n' +
        '    //    purple: Color.rgb(131, 0, 201),' + '\n' +
        '    //    magenta: Color.rgb(204, 0, 255),' + '\n' +
        '    //    pink: Color.rgb(255, 30, 153),' + '\n' +
        '    primary: {' + '\n' +
        '	// Sun palette' + '\n' +
        '	blue: Color.rgb(0x53, 0x82, 0xA1),' + '\n' +
        '	orange: Color.rgb(0xef, 0x6f, 0x00),' + '\n' +
        '	green: Color.rgb(0xb2, 0xbc, 00),' + '\n' +
        '	yellow: Color.rgb(0xff, 0xc7, 0x26)' + '\n' +
        '    },' + '\n' +
        '' + '\n' +
        '    secondary: {' + '\n' +
        '	blue: Color.rgb(0x35, 0x55, 0x6b),' + '\n' +
        '	orange: Color.rgb(0xc0, 0x66, 0x00),' + '\n' +
        '	green: Color.rgb(0x7f, 0x79, 0x00),' + '\n' +
        '	yellow: Color.rgb(0xc6, 0x92, 0x00)' + '\n' +
        '    },' + '\n' +
        '' + '\n' +
        '    neutral: {' + '\n' +
        '	lightGray: Color.rgb(0xbd, 0xbe, 0xc0),' + '\n' +
        '	gray: Color.rgb(0x80, 0x72, 0x77)' + '\n' +
        '    }' + '\n});';
        var result = this.sut.callOMeta('klassExtensionDef', src);
        this.assertEqual(result.type, 'klassExtensionDef');
    },
    
    testFailingKlassExtension3: function() {
        var src = 'Morph.addMethods({})})';
        var result = this.sut.callOMeta('klassExtensionDef', src);
        this.assertEqual(result.type, 'klassExtensionDef');
    },
    
    testFailingPropertyDef: function() {
        var src = 'neutral: {'  + '\n' +
    	'lightGray: Color.rgb(0xbd, 0xbe, 0xc0),'  + '\n' +
    	'gray: Color.rgb(0x80, 0x72, 0x77)' + '\n' + '},';
    	var result = this.sut.callOMeta('propertyDef', src);
        this.assertEqual(result.type, 'propertyDef');
    },
    
    testFailingUsing: function() { // from Main.js
        var src = '/**\n\
* Main.js.  System startup and demo loading.\n\
*/\n\
using(lively.lang.Execution).run(function(exec) {\n\
main.logCompletion("main").delay(Config.mainDelay);\n\
}.logCompletion("Main.js"));';
        var result = this.sut.parseSource(src);

        this.assertEqual(result.length, 2);
        this.assertEqual(result[1].type, 'usingDef');
        this.assertEqual(result[1].stopIndex, src.length-1);
        this.assertEqual(result[1].subElements.length, 1);
    },
    
    testParseModuledef: function() {
        var src = 'module(\'lively.TileScripting\').requires(\'Helper.js\').toRun(function(thisModule) {\n\nMorph.addMethods({})\n});';
        var result = this.sut.parseSource(src);

        this.assertEqual(result.length, 1);
        this.assertEqual(result[0].type, 'moduleDef');
        this.assertEqual(result[0].name, 'lively.TileScripting');
        this.assertEqual(result[0].startIndex, 0);
        this.assertEqual(result[0].stopIndex, src.length-1);
    },
    
    testParseModuleAndUsingDef: function() { // /* ... */ || // ...
        var src = 'module(\'lively.TileScripting\').requires(\'Helper.js\').toRun(function(thisModule) {\n\
using().run(function() {\nMorph.addMethods({})\n})\n});';
        var result = this.sut.parseSource(src);
        this.assertEqual(result.length, 1);
        this.assertEqual(result[0].type, 'moduleDef');
        this.assertEqual(result[0].subElements.length, 1);
        this.assertEqual(result[0].subElements[0].type, 'usingDef');
    },

});

thisModule.AnotherFileParserTest.subclass('lively.Tests.ToolsTests.AnotherFileParserTest3', {
    
    setUp: function($super) {
        $super();
        var db = new SourceDatabase();
        this.src = db.getCachedText('Core.js');
    },
    
    xtestParseMorph: function() {    // Object.subclass        
        var src = this.src;
        src = src.slice(src.indexOf('lively.data.Wrapper.subclass(\'Morph\', {'), src.indexOf('});\n\nMorph.addMethods')+3);
        this.sut.src = src;
        var descriptor = this.sut.parseClass();
        this.assertEqual(descriptor.type, 'klassDef');
    },
    
    testParseWorldMorph: function() {    // Object.subclass
        var src = this.src;
        src = src.slice(src.indexOf('PasteUpMorph.subclass("WorldMorph", {'), src.indexOf('});\n\nObject.extend(WorldMorph, {')+3);
        var descriptor = this.sut.callOMeta('klassDef', src);
        this.assertEqual(descriptor.type, 'klassDef');
    },
    
    testParseOldFileParser: function() {
        var db = new SourceDatabase();
        var src = db.getCachedText('Tools.js');
        this.assert(src, 'no source!');
        src = src.slice(src.indexOf('Object.subclass(\'FileParser\', {'), src.search(/\}\)\;\n\n\n\/\/ =+\n\/\/ ChangeList/)+3);
        var descriptor = this.sut.callOMeta('klassDef', src);
        this.assertEqual(descriptor.type, 'klassDef');
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