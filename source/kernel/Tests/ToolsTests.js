module('lively.Tests.ToolsTests').requires('lively.Tools').toRun(function(thisModule, toolsModule) {

thisModule.createDummyNamespace = function() {
    console.assert(!thisModule['testNS'], 'testNS already existing');
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
    
    shouldRun: false,
    
    setUp: function() {
        this.sut = new toolsModule.SystemBrowser();
    },
    
    testModelStuff: function() {
        this.assert(this.sut.setModules && this.sut.getModules, 'no automatic accessors');
        var model = this.sut.getModel();
        this.assert(model, 'No model');
        this.sut.setModules(1);
        this.assertEqual(model.getModules(), 1);
        // model.setModules(2);
        // this.assertEqual(this.sut.getModules(), 2);
    },
    
    // testOpenSystemBrowser: function() {
    //     this.sut.openIn(WorldMorph.current());
    // }
    
});

TestCase.subclass('lively.Tests.ToolsTests.NodeTest', {
    setUp: function() { thisModule.createDummyNamespace() },
    tearDown: function() { thisModule.removeDummyNamespace() }
});

thisModule.NodeTest.subclass('lively.Tests.ToolsTests.EnvironmentNodeTest', {
    
    testEnvironmentNodeReturnsNS: function() {
        var sut = new toolsModule.EnvironmentNode(thisModule.testNS);
        this.assertIdentity(sut.target, thisModule.testNS);
        var result = sut.childNodes();
        this.assertEqual(result.length, 4);
        result.detect(function(ea) { return ea.target === thisModule.testNS });
        this.assert(result);
    }
});

thisModule.NodeTest.subclass('lively.Tests.ToolsTests.NamespaceNodeTest', {

    testChildNodes: function() {
        var sut = new toolsModule.NamespaceNode(thisModule.testNS);
        sut.mode = 'classes';
        var result = sut.childNodes();
        this.assertEqual(result.length, 1);
        this.assertIdentity(result[0].target, thisModule.testNS.Dummy);
    },
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
        this.sut = new toolsModule.MethodNode(thisModule.testNS.Dummy.prototype.method1); 
    },
        
    testSource: function() {
        this.assertEqual(this.sut.sourceString(), thisModule.testNS.Dummy.prototype.method1.toString());
    }
});

TestCase.subclass('lively.Tests.ToolsTests.FileParserTest', {
    
    setUp: function() {
        this.sut = new FileParser();
        this.sut.verbose = true;
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
})