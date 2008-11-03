module('lively.Tests.ToolsTests').requires('lively.Tools').toRun(function(thisModule, toolsModule) {
    
TestCase.subclass('lively.Tests.ToolsTests.SystemBrowserTests', {
    
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
    
    testOpenSystemBrowser: function() {
        this.sut.openIn(WorldMorph.current());
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
    }
    
  
});
})