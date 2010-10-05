module('Tests.ToolsTests').requires('lively.TestFramework', 'lively.Tools', 'lively.ide', 'Tests.SerializationTests', 'lively.TabCompletion').toRun(function(thisModule, testModule, toolsModule, ideModule) {

thisModule.createDummyNamespace = function() {
    console.assert(!thisModule['testNS'], 'testNS already existing');
    //creating 5 namespaces-    namespace('testNS.one', thisModule);    namespace('testNS.two', thisModule);
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
TestCase.subclass('Tests.ToolsTests.SystemBrowserTests', {

	setUp: function() {
		var browser = this.createBrowser();
		var root = this.createMockNode(browser);
		browser.rootNode = function() { return root };
		this.browser = browser;
	},
createBrowser: function() {
	return new lively.ide.BasicBrowser();
},


	mockNodeClass: lively.ide.BrowserNode.subclass('Tests.ToolsTests.MockNode', {
			initialize: function($super, target, browser, c) { $super(target, browser); this.children = c || [] },
			childNodes: function() { return this.children; }
		}),
		
	createMockNode: function(browser, children, target, name) {
		var node = new this.mockNodeClass(target, browser, children);
		if (name)
			node.asString = function() { return name}
		return node;
	},

	testSelectNodeInFirstPane: function() {
		lively.ide.startSourceControl();
		var browser = this.browser;
		var node1 = this.createMockNode(browser);
		var node2 = this.createMockNode(browser);
		browser.rootNode().children = [node1, node2];
		browser.buildView();
		this.assertEqual(browser.nodesInPane('Pane1').length, 2);
		browser.selectNode(node1);
		this.assertIdentity(node1, browser.selectedNode());
	},

	testFilterChildNodes: function() {
		var browser = this.browser;
		var node1 = this.createMockNode(browser);
		var node2 = this.createMockNode(browser);
		node1.shouldAppear = true; node2.shouldAppear = false;
		browser.rootNode().children = [node1, node2];
		var testFilterClass = lively.ide.NodeFilter.subclass('Tests.ToolsTest.TestFilter', {
			apply: function(nodes) { return nodes.select(function(ea) {return ea.shouldAppear}) }
		});
		var result = browser.filterChildNodesOf(browser.rootNode(), [new testFilterClass()]);
		this.assertEqual(result.length, 1);
		this.assertIdentity(result[0], node1);
	},

	testUninstallFilter: function() {
		var browser = this.browser;
		browser.installFilter(new lively.ide.NodeFilter(), 'Pane1');
		this.assert(browser.getPane1Filters().length > 0);
		browser.uninstallFilters(function(filter) { return filter instanceof lively.ide.NodeFilter }, 'Pane1')
		this.assertEqual(browser.getPane1Filters().length, 0);
	},

	testSortFilter: function() {
		var filter = new lively.ide.SortFilter();
		var n1 = this.createMockNode(null, null, null, 'c');
		var n2 = this.createMockNode(null, null, null, 'a');
		var n3 = this.createMockNode(null, null, null, 'b');
		var result = filter.apply([n1, n2, n3]);
		this.assertEqual(result.length, 3);
		this.assertIdentity(result[0], n2);
		this.assertIdentity(result[1], n3);
		this.assertIdentity(result[2], n1);
	},
testBrowserFourthPane: function() {
	var browser = this.browser;

	var n4 = this.createMockNode(browser, [], null, 'd');
	var n3 = this.createMockNode(browser, [n4], null, 'c');
	var n2 = this.createMockNode(browser, [n3], null, 'b');
	var n1 = this.createMockNode(browser, [n2], null, 'a');
	
	browser.rootNode().children = [n1];

	var m = browser.buildView();
	
	browser.selectNode(n1);
	browser.selectNode(n2);
	browser.selectNode(n3);

	// m.openInWorld()

	this.assertEqual(browser.nodesInPane('Pane4').length, 1);	
	this.assertIdentity(n4, browser.nodesInPane('Pane4')[0]);
},




});
Tests.ToolsTests.SystemBrowserTests.subclass('Tests.ToolsTests.BrowserNodeTest',
'running', {
	createBrowser: function() {
		// FIXME
		return new lively.ide.SystemBrowser();
	},

	buildTestSource: function() {
		// create and parse the source into filefragments
		var src = "\n\Object.subclass('Foo',\n\
'catA', {\n\
	m1: function() { return 23 },\n\
	m2: function() {},\n\
},\n\
'catB', {\n\
	m3: function() { return 42},\n\
});\n\
\n\
Foo.addMethods('catC',{\n\
	m4: function() {},\n\
});"

		this.db = new AnotherSourceDatabase();
		var rootFragment = this.db.prepareForMockModule('dummySource.js', src);

		this.klassDef = rootFragment.subElements()[1]
		this.m1 = this.klassDef.subElements()[0];
		this.m2 = this.klassDef.subElements()[1];
		this.m3 = this.klassDef.subElements()[2];
		this.klassExtensionDef = rootFragment.subElements()[3]
		this.m4 = this.klassExtensionDef.subElements()[0];

		this.fileFragment = rootFragment;

		// setup browser
		var completeFFNode = new lively.ide.CompleteFileFragmentNode(
			this.fileFragment, this.browser, null, this.fileFragment.name)
		var root = this.createMockNode(this.browser, [completeFFNode]);
		this.browser.rootNode =  function() { return root };
	},
	buildCopTestSource: function() {
		// create and parse the source into filefragments
		var src = "cop.create(\"testLayer\")"

		this.db = new AnotherSourceDatabase();
		var rootFragment = this.db.prepareForMockModule('dummyCopSource.js', src);

		this.fileFragment = rootFragment;

		// setup browser
		var completeFFNode = new lively.ide.CompleteFileFragmentNode(
			this.fileFragment, this.browser, null, this.fileFragment.name)
		var root = this.createMockNode(this.browser, [completeFFNode]);

		this.copNode = completeFFNode.childNodes()[0];

		this.browser.rootNode =  function() { return root };
	},



},
'testing', {

	testCopFragmentWholeLayerEvaluate: function() {
		this.browser.buildView();
		this.buildCopTestSource();
		var node = this.copNode;
		var klass = Object.subclass('CopBrowserNodeDummy');
		var src = 'cop.create("testLayer").refineClass(CopBrowserNodeDummy, { m: function() { return 23 } });'
		node.newSource(src);
		withLayers([testLayer], function() {
			this.assertEquals(23, new klass().m());
		}.bind(this))		
	},
	testCopFragmentPartialClassEvaluate: function() {
		this.browser.buildView();
		this.buildCopTestSource();
		var node = this.copNode;
		var klass = Object.subclass('CopBrowserNodeDummy');
		var src = 'cop.create("testLayer").refineClass(CopBrowserNodeDummy, { m: function() { return 23 } });'
		node.newSource(src);
		this.assertEquals(1, node.childNodes().length);
		var klassNode = node.childNodes()[0];
		klassNode.newSource('.refineClass(CopBrowserNodeDummy, { m: function() { return 42 } })')
		withLayers([testLayer], function() {
			this.assertEquals(42, new klass().m(), 'klass not did not evaluate');
		}.bind(this))		
	},
	testCopFragmentMethodEvaluate: function() {
		this.browser.buildView();
		this.buildCopTestSource();
		var node = this.copNode;
		var klass = Object.subclass('CopBrowserNodeDummy');
		var src = 'cop.create("testLayer").refineClass(CopBrowserNodeDummy, {\nm: function() { return 23 }\n});'
		node.newSource(src);
		var methodNode = node.childNodes()[0].childNodes()[0];
		methodNode.newSource('m: function() { return 42 }')
		withLayers([testLayer], function() {
			this.assertEquals(42, new klass().m(), 'method not did not evaluate');
		}.bind(this))		
	},



	testCreateCategoriesFromClassDef: function() {
		this.buildTestSource();
		var browser = this.browser;
		
		var completeFFNode = browser.rootNode().childNodes().first();
		this.assertEqual(2, completeFFNode.childNodes().length);
		var classNode = completeFFNode.childNodes().first();

		this.assertEqual(3, classNode.childNodes().length);
		this.assertEqual('-- all --', classNode.childNodes()[0].getName());
		this.assertEqual('catA', classNode.childNodes()[1].getName());
		this.assertEqual('catB', classNode.childNodes()[2].getName());

		this.assertEqual(3, classNode.childNodes()[0].childNodes().length);
		this.assertEqual(2, classNode.childNodes()[1].childNodes().length);
		this.assertEqual(1, classNode.childNodes()[2].childNodes().length);
		
		var methodNodes = classNode.childNodes()[1].childNodes()
		this.assertEqual('m1', methodNodes[0].getName());
		this.assertEqual('m2', methodNodes[1].getName());

	},
	testCreateCategoriesFromAddMethodDef: function() {
		this.buildTestSource();
		var browser = this.browser;
		// browser.buildView()

		var completeFFNode = browser.rootNode().childNodes().first();
		this.assertEqual(2, completeFFNode.childNodes().length);
		var addMethodNode = completeFFNode.childNodes()[1];

		this.assertEqual(2, addMethodNode.childNodes().length);
		this.assertEqual('-- all --', addMethodNode.childNodes()[0].getName());
		this.assertEqual('catC', addMethodNode.childNodes()[1].getName());

		// category childs
		this.assertEqual(1, addMethodNode.childNodes()[0].childNodes().length);
		this.assertEqual(1, addMethodNode.childNodes()[1].childNodes().length);
		
		var methodNodes = addMethodNode.childNodes()[1].childNodes()
		this.assertEqual('m4', methodNodes[0].getName());

	},


	testAddClassCommand: function() {
		this.buildTestSource();
		var browser = this.browser;
		browser.buildView()

		browser.inPaneSelectNodeNamed('Pane1', 'dummySource.js');
		var commands = browser.commandMenuSpec('Pane2');
		var commandSpec = commands.detect(function(spec) { return spec[0] == 'add class' });
		this.assert(commandSpec && Object.isFunction(commandSpec[1]), 'Cannot find add class command');

		var className = 'NewClass';
		this.answerPromptsDuring(commandSpec[1], [
			{question: 'super class name', answer: 'Object'},
			{question: 'class name', answer: className}]);

		var newClassFragment = this.fileFragment.subElements().detect(function(ff) {
			return ff.getName() == className;
		});

		this.assert(newClassFragment, 'new class not created');
		this.assert(newClassFragment.getSourceCode().startsWith('Object.subclass(\'' + className + '\','),
			'source code of new class is strange');

		// var newNode = browser.selectedNode();
		// this.assertEquals(newClassFragment, newNode.target, 'browser hasn\'t selected the new class');
	},

	testAddMethodCommand: function() {
		this.buildTestSource();
		var browser = this.browser;
		browser.buildView()

		browser.inPaneSelectNodeNamed('Pane1', 'dummySource.js');
		browser.inPaneSelectNodeNamed('Pane2', 'Foo');
		var commands = browser.commandMenuSpec('Pane4');
		var commandSpec = commands.detect(function(spec) { return spec[0] == 'add method' });
		this.assert(commandSpec && Object.isFunction(commandSpec[1]), 'Cannot find add method command');

		var methodName = 'newMethod';
		this.answerPromptsDuring(commandSpec[1], [{question: 'name', answer: methodName}]);

		var newMethodFragment = this.fileFragment.flattened().detect(function(ff) {
			return ff.getName() == methodName;
		});

		this.assert(newMethodFragment, 'new class not created');
		this.assert(newMethodFragment.getSourceCode().startsWith(methodName + ': function() {'),
			'source code of new method is strange');

		// var newNode = browser.selectedNode();
		// this.assertEquals(newMethodFragment, newNode.target, 'browser hasn\'t selected the new method');
	},
	testBrowseIt: function() {
		this.buildTestSource();
		var browser = this.browser;
		browser.buildView()

		this.m1.basicBrowseIt(browser)	

		this.assertEqual(browser.nodesInPane('Pane4').length, 3);	
		this.assertIdentity(this.m1, browser.nodesInPane('Pane4')[0].target);
	},




});

TestCase.subclass('Tests.ToolsTests.FileParserTest', {

    setUp: function() {
        this.sut = new FileParser();
        this.sut.verbose = false;
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

TestCase.subclass('Tests.ToolsTests.JsParserTest', {
    
    setUp: function() {
        this.sut = new JsParser();
    },
    
    assertSubDescriptorsAreValid: function(descr) {
        for (var i = 0; i < descr.length; i++) {
            if (descr[i].subElements()) this.assertSubDescriptorsAreValid(descr[i].subElements());
            if (!descr[i+1]) continue;
            console.log(descr[i].name + ':' + descr[i].startIndex + '-' + descr[i].stopIndex + '<->' + descr[i+1].name + ':' + descr[i+1].startIndex + '-' + descr[i+1].stopIndex);
            this.assert(descr[i].stopIndex < descr[i+1].startIndex,
                'descrs conflict: ' + descr[i].type + ' ' + descr[i].name + ' <----> ' + descr[i+1].type + ' ' + descr[i+1].name);
            
        }        
    },
    
    assertDescriptorsAreValid: function(descr) {
        for (var i = 0; i < descr.length; i++) {
            if (descr[i].subElements()) this.assertSubDescriptorsAreValid(descr[i].subElements());
            if (!descr[i+1]) continue;
            console.log(descr[i].name + ':' + descr[i].startIndex + '-' + descr[i].stopIndex + '<->' + descr[i+1].name + ':' + descr[i+1].startIndex + '-' + descr[i+1].stopIndex);
            this.assertEqual(descr[i].stopIndex, descr[i+1].startIndex - 1,
                'descrs conflict: ' + descr[i].type + ' ' + descr[i].name + ' <----> ' + descr[i+1].type + ' ' + descr[i+1].name);
        }
    },

	srcFromLinesOfFile: function(fileName, startLine, endLine) {
		// for testing parsing parts of files
		// returns a substring of the file begining with first character if startLine and last Character of endLine
		// var db = lively.ide.startSourceControl();
		var src = new WebResource(URL.codeBase.withFilename('lively/' + fileName)).get().content
        // var src = db.getCachedText(fileName);
		var lines = src.split('\n');
		endLine = Math.min(endLine, lines.length-1);
		// get the ptrs
		var start = JsParser.prototype.ptrOfLine(lines, startLine);
		var end = JsParser.prototype.ptrOfLine(lines, endLine) + lines[endLine-1].length-1;
		return src.slice(start, end);
	}
});

thisModule.JsParserTest.subclass('Tests.ToolsTests.JsParserTest1', {
    
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
        this.assertEqual(descriptor.traits[0], 'ViewTrait');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.length - 1);
        this.assertEqual(descriptor.subElements().length, 2);
        this.assertDescriptorsAreValid([descriptor]);
    },
testParseEmptyClass: function() {   // Object.subclass
        var src = 'Object.subclass(\'Foo\',  {\n\n\n});'
        this.sut.src = src;
        var descriptor = this.sut.parseClass();
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'Foo');
        this.assertEqual(descriptor.superclassName, 'Object');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.length - 1);
        this.assertEqual(descriptor.subElements().length, 0);
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
        this.assertEqual(descriptor.subElements().length, 0);
    },
    
    testParseClassAndMethods: function() {  // Object.subclass
        var src = 'Object.subclass(\'Dummy\', {\n' +
                  '\tsetUp: function() { thisModule.createDummyNamespace() },\n' +
                  'formals: ["Pane1Content",\n\t\t"Pane1Selection"],\n' +
                  '\ttearDown: function() { thisModule.removeDummyNamespace() }\n' +
                  '})';
        this.sut.src = src;
        var descriptor = this.sut.parseClass();
        this.assert(descriptor, 'no descriptor');
        
        var dscr = descriptor.subElements();
        this.assertEqual(dscr.length, 3);
        this.assertEqual(dscr[0].name, 'setUp');
        this.assertIdentity(dscr[0].startIndex, src.indexOf('\tsetUp'));
        this.assertIdentity(dscr[0].stopIndex, src.indexOf(',\nformals'));
        this.assertEqual(dscr[1].name, 'formals');
        this.assertIdentity(dscr[1].startIndex, src.indexOf('formals:'));
        this.assertIdentity(dscr[1].stopIndex, src.indexOf(',\n\ttearDown'));
        this.assertEqual(dscr[2].name, 'tearDown');
        this.assertIdentity(dscr[2].startIndex, src.indexOf('\ttearDown'));
        this.assertIdentity(dscr[2].stopIndex, src.lastIndexOf('\n\})'));
        this.assertDescriptorsAreValid([descriptor]);
    },
    
    testParseMethod1: function() {   // xxx: function()...,
        var src = 'testMethod_8: function($super,a,b) { function abc(a) {\n\t1+2;\n}; }';
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('propertyDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'testMethod_8');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.length - 1);
    },
    
    testParseMethod2: function() {   // xxx: function()...,
        var src = 'onEnter: function() {},';
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('propertyDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'onEnter');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.length - 1);
    },
    
    testParseMethod3: function() {   // xxx: function()...,
        var src = 'setShape: function(newShape) {\n\tthis.internalSetShape(newShape);\n}.wrap(Morph.onLayoutChange(\'shape\')),';
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('propertyDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'setShape');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.length - 1);
    },

    testParseMethodWithComment: function() {
    		var src = 'm1: function() { /*\{*/ }';
            this.sut.src = src;
            var descriptor = this.sut.callOMeta('propertyDef');
			this.assert(descriptor, 'no descriptor');
            this.assertEqual(descriptor.name, 'm1');
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
        this.assertEqual(descriptor.subElements().length, 2);
		this.assert(descriptor.subElements()[0].isStatic(), 'non static subelem');
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
        var descriptor = this.sut.callOMeta('functionDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'testModuleLoad');
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
    },
    
    testParseStaticFunctions: function() {  // Klass.method = function() {...};
        var src = 'thisModule.ScriptEnvironment.open = function() {};'
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('propertyDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'open');
        this.assertEqual(descriptor.className, 'thisModule.ScriptEnvironment');
		this.assert(descriptor.isStatic());
        this.assertIdentity(descriptor.startIndex, 0);
        this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'));
        this.assertDescriptorsAreValid([descriptor]);
    },

	testExtensionSubElementsAreStaticProperties: function() {
		var src = 'Object.extend(Bla, {\nm1: function() {\n 1+2\n },\n x: 1\n});';
		this.sut.src = src;
        var descriptor = this.sut.callOMeta('klassExtensionDef');
		this.assertEquals(descriptor.subElements()[0].name, 'm1');
		this.assert(descriptor.subElements()[0].isStatic, 'not static!');
	},
    
    testParseMethodModification: function() {   // Klass.protoype.method = function() {...};
        var src = 'Morph.prototype.morphMenu = Morph.prototype.morphMenu.wrap(function(proceed, evt) {  });';
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('propertyDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'morphMenu');
        this.assertEqual(descriptor.className, 'Morph');
		this.assert(!descriptor.isStatic());
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
        this.assertEqual(descriptor.subElements().length, 1);
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
        this.assertEqual(descriptor.subElements().length, 1);
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
    },
        
});

Tests.ToolsTests.JsParserTest.subclass('Tests.ToolsTests.JsParserParsesCoreTest', {
            
	shouldRun: false,
	
    test01ParseCoreAlternativ: function() {
        // var url = URL.source.withFilename('Core.js');
        // var result = this.sut.parseFileFromUrl(url);
        var db = new SourceDatabase();
        var src = db.getCachedText('Core.js');
        var result = this.sut.parseSource(src);
        this.assert(result && !result.isError)
        // this.assertDescriptorsAreValid(result);
    },



});

Tests.ToolsTests.JsParserTest.subclass('Tests.ToolsTests.JsParserTest2', {

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
        var src = 'Morph.addMethods(\{\})\}\)';
        var result = this.sut.callOMeta('klassExtensionDef', src);
        this.assertEqual(result.type, 'klassExtensionDef');
    },
    
    testFailingPropertyDef: function() {
        var src = 'neutral: \{'  + '\n' +
    	'lightGray: Color.rgb(0xbd, 0xbe, 0xc0),'  + '\n' +
    	'gray: Color.rgb(0x80, 0x72, 0x77)' + '\n' + '\},';
    	var result = this.sut.callOMeta('propertyDef', src);
		this.assert(!result.isStatic());
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
        this.assertEqual(result[1].subElements().length, 1);
    },
    
testParseModuledef: function() {
        var src = 'module(\'lively.TileScripting\').requires(\'lively.Helper\').toRun(function(thisModule) {\n\nMorph.addMethods({})\n});';
        var result = this.sut.parseSource(src);

        this.assertEqual(result.length, 1);
        this.assertEqual(result[0].type, 'moduleDef');
        this.assertEqual(result[0].name, 'lively.TileScripting');
        this.assertEqual(result[0].startIndex, 0);
        this.assertEqual(result[0].stopIndex, src.length-1);
    },
    
	testParseModuleAndClass: function() {
        var src = 'module(\'lively.xyz\').requires(\'abc.js\').toRun(function(thisModule) {\n\Object.subclass(\'Abcdef\', {\n}); // this is a comment\n});';
        var result = this.sut.parseSource(src);

        this.assertEqual(result.length, 1);
        this.assertEqual(result[0].type, 'moduleDef');
        this.assertEqual(result[0].stopIndex, src.length-1);
    },

    testParseModuleAndUsingDef: function() { // /* ... */ || // ...
        var src = 'module(\'lively.TileScripting\').requires(\'lively/Helper.js\').toRun(function(thisModule) {\n\
using().run(function() {\nMorph.addMethods({})\n})\n});';
        var result = this.sut.parseSource(src);
        this.assertEqual(result.length, 1);
        this.assertEqual(result[0].type, 'moduleDef');
        this.assertEqual(result[0].subElements().length, 1);
        this.assertEqual(result[0].subElements()[0].type, 'usingDef');
    },

	testFailingProperty: function() { // multiline properties
		var src = 'documentation: \'Extended FileParser\' +\n\t\t\t\'bla\','
		var result = this.sut.callOMeta('propertyDef', src);
        this.assertEqual(result.type, 'propertyDef');
		this.assert(!result.isStatic());
		this.assertEqual(result.stopIndex, src.length-1);
    },

	testParseError: function() { // unequal number of curly bracktes
		var src = 'Object.subclass(\'ClassAEdited\', \{';
		var result = this.sut.parseSource(src);
		// y = result;
		// FIXME currently Object.subclass is parsed as unknown --> create 'keywords' in parser
		// this.assertEqual(result.length, 1); 
        this.assert(result[1].isError, 'no Error');
    },
testFailingRegex: function() {
	//var src = "toSmalltalk: function() {\nreturn Object.isString(this.value) ? '\\'' + this.value.replace(/'/g, '\'\'') + '\'' : this.value;\n},";
	var src = "toSmalltalk: function() { return /'/ },";
	var result = this.sut.callOMeta('propertyDef', src);
	this.assert(result, 'not recognized');
	this.assertEqual(result.name, 'toSmalltalk');
	this.assertIdentity(result.startIndex, 0);
	this.assertIdentity(result.stopIndex, src.length - 1);
},

	testParseGetter: function() {   // xxx: function()...,
        var src = 'get foo() { return 23 },';
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('propertyDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'foo');
    },
	testParseSetter: function() {   // xxx: function()...,
        var src = 'set foo(val) { this._val = val + 42 },';
        this.sut.src = src;
        var descriptor = this.sut.callOMeta('propertyDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'foo');
    },
testParseKlassWithTwoTraits: function() {
		var src = 'X.subclass(\'Y\', Trait1, Trait2, {\n' +
				'	m1: function(),\n' +
				'});'
		this.sut.src = src;
		var descriptor = this.sut.parseClass();
		this.assert(descriptor, 'no descriptor');

		this.assertEquals('Y', descriptor.name);
		this.assertEquals('Trait1', descriptor.traits[0]);
		this.assertEquals('Trait2', descriptor.traits[1]);
		this.assertDescriptorsAreValid([descriptor]);		
},
	testParseFailingMethodWithComment: function() {
        var src =
			// '    /**\n' +
			// '     * override b/c of parent treatement\n' +
			// '     */\n' +
			'    relativize: function(pt) { \n' +
			'        return 3;\n' +
			'    },'

        this.sut.src = src;
        var descriptor = this.sut.callOMeta('propertyDef');
        this.assert(descriptor, 'no descriptor');
        this.assertEqual(descriptor.name, 'relativize');
	},


});

Tests.ToolsTests.JsParserTest.subclass('Tests.ToolsTests.JsParserTest3', {

	shouldRun: false,
	
	documentation: 'Tests which directly access LK files. Tests are quite brittle because they will fail when th eline numbers of the used files change.',
    
    testParseWorldMorph: function() {    // Object.subclass
		// Class definition of Morph
// debugger
		var src = this.srcFromLinesOfFile('Core.js', 4463, 5640 + 1);
        var descriptor = this.sut.callOMeta('klassDef', src);
        this.assertEqual(descriptor.type, 'klassDef');
    },
    
/*    testParseOldFileParser: function() {
		// Class definition of FileParser
		var src = this.srcFromLinesOfFile('Tools.js', 1223, 1481);
        var descriptor = this.sut.callOMeta('klassDef', src);
        this.assertEqual(descriptor.type, 'klassDef');
    },
    
    testParseTest: function() {
        var src = 'xyz: function() { \'\}\' },'
        var descriptor = this.sut.callOMeta('propertyDef', src);
 this.assertEqual(descriptor.type, 'propertyDef');
        this.assertEqual(descriptor.stopIndex, src.length-1);
    },
    
    testParseTestKlass: function() {
		// Class definition of JsParserTest1
		var src = this.srcFromLinesOfFile('Tests/ToolsTests.js', 134, 367);
        var descriptor = this.sut.callOMeta('klassDef', src);
        this.assertEqual(descriptor.type, 'klassDef');
    },

	testParseFailingAddMethods: function() {
		// addMethods of Morph
		var src = this.srcFromLinesOfFile('Core.js', 3056, 3084);
		var descriptor = this.sut.callOMeta('klassExtensionDef', src);
		this.assertEqual(descriptor.type, 'klassExtensionDef');
	},

	testParseSelectionMorph: function() {
		// Widget.js -- SelectionMorph
		var src = this.srcFromLinesOfFile('Widgets.js', 465, 688);
		var descriptor = this.sut.callOMeta('klassDef', src);
		this.assertEqual(descriptor.type, 'klassDef');
	},

	testParseHandMorph: function() {
		// Core.js -- HandMorph
		//var src = this.srcFromLinesOfFile('Core.js', 4345, 4875);
		var src = 'Morph.subclass("HandMorph", {\ndocumentation: "abc\'s defs",\n});';
		var descriptor = this.sut.callOMeta('klassDef', src);
		this.assertEqual(descriptor.type, 'klassDef');
	},
*/

});
Tests.ToolsTests.JsParserTest.subclass('Tests.ToolsTests.ContextJSParserTest', {
	test01ParseSimpleLayerDef: function() {
	var src = 'cop.create("TestLayer");';
	this.sut.src = src;
	var descriptor = this.sut.callOMeta("copDef");
	this.assert(descriptor, 'no descriptor');
	this.assertEqual(descriptor.name, 'TestLayer');
    },
test02ParseCopAsFile: function() {
	var src = 'cop.create("TestLayer");';
	var result = this.sut.parseSource(src);
	this.assertEqual(result.length, 1);
	this.assertEqual(result[0].type, 'copDef');
	this.assertEqual(result[0].subElements().length, 0);
},
test03ParseCopSubElements: function() {
	var src = 'cop.create("TestLayer")\n\t.refineClass(Foo);';
	this.sut.src = src;
	var descriptor = this.sut.callOMeta("copDef");
	this.assertEqual(descriptor.subElements().length, 1);
	this.assertEqual(descriptor.subElements()[0].name, 'Foo');
},
test04ParseCopSubElements2: function() {
	var src = '.refineObject(Foo, {m1: function() {},\n\t\tm2: function() {},})';
	this.sut.src = src;
	var descriptor = this.sut.callOMeta("copSubElement");
	this.assertEqual(descriptor.name, 'Foo');
	this.assertEqual(descriptor.subElements().length, 2);
	this.assertEqual(descriptor.subElements()[0].name, 'm1');
	this.assertEqual(descriptor.subElements()[1].name, 'm2');
},
test05ParseBeGlobal: function() {
	var src = '.beGlobal()';
	this.sut.src = src;
	var descriptor = this.sut.callOMeta("copSubElement");
	this.assertEqual(descriptor.name, 'beGlobal()');
},




});
Tests.ToolsTests.JsParserTest.subclass('Tests.ToolsTests.MethodCategoryParseTest', {

	test01ParseAddMethodsWithCategory: function() {
		this.sut.debugMode = true
		var src = 'Foo.addMethods(\'categoryA\', { foo: function() { return 23 }, });';
		this.sut.src = src;
		var descriptor = this.sut.callOMeta('klassExtensionDef');
		this.assert(descriptor, 'no descriptor');
		this.assert('Foo', descriptor.name);
		this.assertEqual(descriptor.subElements().length, 1);
		this.assertIdentity(descriptor.startIndex, 0);
		this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'), 'stopIndex wrong');
		this.assertDescriptorsAreValid([descriptor]);
		var methodDescriptor = descriptor.subElements()[0];
		this.assertEqual('foo', methodDescriptor.name);

		this.assertEqual('categoryA', methodDescriptor.category.getName());
		this.assertEquals(methodDescriptor.category.startIndex, 15);
		this.assertEquals(methodDescriptor.category.stopIndex, 61);
		// this.assertEquals('\'categoryA\', { foo: function() { return 23 }, }',
			// methodDescriptor.category.getSourceCode());

		this.assertEquals(1, descriptor.categories.length);
    },
test02ParseSubclassWithCategory: function() {
		this.sut.debugMode = true
		var src = 'Object.subclass(\'Foo\', \'categoryA\', { foo: function() { return 23 }, }, \'categoryB\', { foo2: function() { return 42 }, });';
		this.sut.src = src;
		var descriptor = this.sut.callOMeta('klassDef');
		this.assert(descriptor, 'no descriptor');
		this.assert('Foo', descriptor.name);
		this.assertEqual(descriptor.subElements().length, 2);
		this.assertIdentity(descriptor.startIndex, 0);
		this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'), 'stopIndex wrong');
		this.assertDescriptorsAreValid([descriptor]);

		var methodDescriptor = descriptor.subElements()[0];
		this.assertEqual('foo', methodDescriptor.name);
		this.assertEqual('categoryA', methodDescriptor.category.getName());

		methodDescriptor = descriptor.subElements()[1];
		this.assertEqual('foo2', methodDescriptor.name);
		this.assertEqual('categoryB', methodDescriptor.category.getName());
    },
test03RecognizeCategoriesAsFileFragments: function() {
		this.sut.debugMode = true
		var src = 'Object.subclass(\'Foo\', \'categoryA\', { m1: function() {},  m2: function() {}, });';
		this.sut.src = src;
		var descriptor = this.sut.callOMeta('klassDef');
		this.assert(descriptor, 'no descriptor');
		this.assert('Foo', descriptor.name);
		this.assertEqual(descriptor.subElements().length, 2);
		this.assertIdentity(descriptor.startIndex, 0);
		this.assertIdentity(descriptor.stopIndex, src.lastIndexOf(';'), 'stopIndex wrong');
		this.assertDescriptorsAreValid([descriptor]);

		this.assertEquals(1, descriptor.categories.length);
		// var categoryDescriptor = descriptor.categories()[0];

    },



});

thisModule.JsParserTest.subclass('Tests.ToolsTests.OMetaParserTest', {

	documentation: 'For testing parsing of OMeta grammar definitions themselves',

	setUp: function() {
		this.sut = new OMetaParser();
	},

	testParseBasicGrammar: function() {
		var src = 'ometa LKFileParser <: Parser {}';
        var result = this.sut.callOMeta('ometaDef', src);
        this.assertEqual(result.name, 'LKFileParser');
        this.assertEqual(result.superclassName, 'Parser');
        this.assertIdentity(result.startIndex, 0);
        this.assertIdentity(result.stopIndex, src.length - 1);
	},

	testParseBasicGrammarWithoutInheritance: function() {
		var src = 'ometa LKFileParser {}';
        var result = this.sut.callOMeta('ometaDef', src);
        this.assertEqual(result.name, 'LKFileParser');
	},

	testParseBasicGrammarWithRules: function() {
		var src = 'ometa LKFileParser {\n' +
			'rule1 = abc,\n' +
			'rule2 :x = xyz,\n' +
			'rule3 = abcxyz -> { 1+2 }\n' +
			'}';
        var result = this.sut.parseSource(src);
        this.assertEqual(result[0].name, 'LKFileParser');
		var sub = result[0].subElements();
		this.assertEqual(sub.length, 3);
		this.assertEqual(sub[0].name, 'rule1');
		this.assertEqual(sub[0].type, 'ometaRuleDef');
		this.assertEqual(sub[1].name, 'rule2');
		this.assertEqual(sub[2].name, 'rule3');
	},

	testParseRule: function() {
		var src = 'abc :x :y = seq(\'123\') \'1\'	-> {bla},'
        var result = this.sut.callOMeta('ometaRuleDef', src);
        this.assertEqual(result.name, 'abc');
		this.assertEqualState(result.parameters, ['x', 'y']);
		/*this.assertEqualState(result.ometaPart, ' seq(\'123\') \'1\'	');
		this.assertEqualState(result.jsPart, ' {bla}');*/
		this.assertIdentity(result.type, 'ometaRuleDef');
        this.assertIdentity(result.startIndex, 0);
        this.assertIdentity(result.stopIndex, src.length - 1);
	},

	testParseRule2: function() {
		var src = 'x = abc -> 1\n\t\|xyz -> 2,';
        var result = this.sut.callOMeta('ometaRuleDef', src);
        this.assertEqual(result.name, 'x');
        this.assertIdentity(result.startIndex, 0);
        this.assertIdentity(result.stopIndex, src.length - 1);
	},

	testParseRule3: function() {
		var src = 'x = abc';
        var result = this.sut.callOMeta('ometaRuleDef', src);
        this.assertEqual(result.name, 'x');
        this.assertIdentity(result.startIndex, 0);
        this.assertIdentity(result.stopIndex, src.length - 1);
	},

	testParseRule4: function() {
		var src = 'x -> 2,';
        var result = this.sut.callOMeta('ometaRuleDef', src);
        this.assertEqual(result.name, 'x');
        this.assertIdentity(result.startIndex, 0);
        this.assertIdentity(result.stopIndex, src.length - 1);
	},

});

thisModule.JsParserTest.subclass('Tests.ToolsTests.OMetaParserTestLKFile', {
	
	shouldRun: false,
	
	setUp: function() {
		this.sut = new OMetaParser();
	},

	testParseLKFileParserTxt: function() {
		var fn = 'LKFileParser.txt';
		var src = this.srcFromLinesOfFile(fn, 0, 9999);
		var result = this.sut.parseSource(src, {fileName: fn});
		//new ChangeList(fn, null, result).openIn(WorldMorph.current());
    },
});

Tests.ToolsTests.JsParserTest.subclass('Tests.ToolsTests.ChunkParserTest', {

	setUp: function($super) {
		$super();
		this.ometaParser = this.sut.ometaParser;
		this.chunkParser = Object.delegated(ChunkParser, {});
		this.debugFunction = function(src, grammarInstance, errorIndex) {
			var startIndex = Math.max(0, errorIndex - 100);
        	var stopIndex = Math.min(src.length, errorIndex + 100);
        	var str = src.substring(startIndex, errorIndex) + '<--Error-->' + src.substring(errorIndex, stopIndex);
			console.log(str);
		}
	},

	testParseChunkWithComment: function() {
		var src = '{/* abc */}'; // '{/}';
		var p = this.ometaParser;
		var result = p.matchAll(src, 'chunk', ['{', '}'], this.debugFunction.curry(src));
		this.assert(result, 'couldn\'t parse');
		this.assertEqual(result.length, src.length);
	},

	testParseChunkWithComment2: function() {
		var src = '{// abc\n }';
		var p = this.ometaParser;
		var result = p.matchAll(src, 'chunk', ['{', '}'], this.debugFunction.curry(src));
		this.assert(result, 'couldn\'t parse');	
		this.assertEqual(result.length, src.length);
	},

	testParseChunkWithString: function() {
		var src = '{\'bl\{a\'}';
		var p = this.ometaParser;
		var result = p.matchAll(src, 'chunk', ['{', '}'], this.debugFunction.curry(src));
		this.assert(result, 'couldn\'t parse');
		this.assertEqual(result.length, src.length);
	},

	testParseChunkWithString2: function() {
		var src = "'a\\'b'";
		var p = this.ometaParser;
		var result = p.matchAll(src, 'chunk', ['\'', '\''], this.debugFunction.curry(src));
		this.assert(result, 'couldn\'t parse');
		this.assertEqual(result.length, src.length);
	},

	XtestParseChunkWithTwoSlashes: function() {
		// FIXME annoying bug
		// how to decide if it is a regular expression or a / operator
		// when we don't have a parse tree? Is it possible at all?
		var src = "{  x / 3+ ' / ' }";
		var p = this.ometaParser;
		var result = p.matchAll(src, 'chunk', ['{', '}'], this.debugFunction.curry(src));
		this.assert(result, 'couldn\'t parse');
		this.assertEqual(result.length, src.length);
	},

});

Tests.ToolsTests.JsParserTest.subclass('Tests.ToolsTests.FileFragmentTest', {

	setUp: function() {
		this.jsParser = new JsParser();
		// we don't want to see alert
		this.oldAlert = WorldMorph.prototype.alert;
		WorldMorph.prototype.alert = Functions.Null;

		this.setUpSource();
	},
setUpSource: function() {
		/* creates:
		moduleDef: foo.js (0-277 in foo.js, starting at line 1, 4 subElements)
		klassDef: ClassA (55-123 in foo.js, starting at line 2, 1 subElements)
		propertyDef (proto): m1 (82-119 in foo.js, starting at line 3, 0 subElements)
		propertyDef (static): m3 (124-155 in foo.js, starting at line 8, 0 subElements)
		functionDef: abc (156-179 in foo.js, starting at line 9, 0 subElements)
		klassDef: ClassB (180-257 in foo.js, starting at line 10, 2 subElements)
		propertyDef (proto): m2 (209-230 in foo.js, starting at line 11, 0 subElements)
		propertyDef (proto): m3 (232-253 in foo.js, starting at line 12, 0 subElements)
		*/
		this.db = new AnotherSourceDatabase();
		this.src = 'module(\'foo.js\').requires(\'bar.js\').toRun(function() {\n' +
			'Object.subclass(\'ClassA\', {\n\tm1: function(a) {\n\t\ta*15;\n\t\t2+3;\n\t},\n});\n' +
			'ClassA.m3 = function() { 123 };\n' +
			'function abc() { 1+2 };\n' +
			'ClassA.subclass(\'ClassB\', {\n\tm2: function(a) { 3 },\nm3: function(b) { 4 }\n});\n' +
			'}); // end of module';
		this.root = this.db.prepareForMockModule('foo.js', this.src);
},


	setUpAlternateSource: function() {
	    var src = 'Object.subclass("Dummy1", {});\n'+
	        'Object.subclass("Dummy", {\ntest1: 1,\ntest2: 2,\n\ntest2: 2,\n});';
		this.db = new AnotherSourceDatabase();
		this.root = this.db.prepareForMockModule('foo2.js', src);
		this.src = src;
	},

	setUpAlternateSource2: function() {
		var src = 'module(\'foo.js\').requires(\'bar.js\').toRun(function() {\n' +
		'/*\n' +
		' * my comment\n' +
		' */\n'+
		'\n' +
		'// ClassA is so important\n' +
		'// foo bar\n' +
		'Object.subclass(\'ClassA\', {\n\n' +
		'\tm1: function(a) {\n\t\ta*15;\n\t\t2+3;\n\t},\n});\n\n' +
		'}); // end of module';
		this.db = new AnotherSourceDatabase();
		this.root = this.db.prepareForMockModule('foo.js', src);
		this.src = src;
	},
   
	tearDown: function($super) {
		$super();
		WorldMorph.prototype.alert = this.oldAlert;
	},

	fragmentNamed: function(name, optFilter) {
		return this.root.flattened().detect(function(ea) {
			var select = ea.name == name;
			if (optFilter)
				select = select && optFilter(ea)
			return select;
		});
	},

	testCorrectNumberOfFragments: function() {
		this.assertEqual(this.root.type, 'moduleDef');
		this.assertEqual(this.root.flattened().length, 8);
	},

	testFragmentsOfOwnFile: function() {
		var classFragment = this.fragmentNamed('ClassA');
		this.assertEqual(classFragment.fragmentsOfOwnFile().length, 8-1);
	},

	testPutNewSource: function() {
		var classFragment = this.fragmentNamed('ClassA');
		classFragment.putSourceCode('Object.subclass(\'ClassA\', { //thisHas17Chars\n\tm1: function(a) {\n\t\ta*15;\n\t\t2+3;\n\t}\n});\n');
		this.assertEqual(classFragment.startIndex, 55, 'classFrag1 start');
		this.assertEqual(classFragment.stopIndex, 123+17, 'classFrag1 stop');
		this.assertEqual(classFragment.subElements().length, 1);
		this.assertEqual(classFragment.subElements()[0].startIndex, 82, 'method1 start');
		this.assertEqual(classFragment.subElements()[0].stopIndex, 119+17, 'method1 stop');
		var otherClassFragment = this.fragmentNamed('ClassB');
		this.assertEqual(otherClassFragment.startIndex, 180+17, 'classFrag2 start');
		this.assertEqual(otherClassFragment.stopIndex, 257+17, 'classFrag2 stop');
		this.assertEqual(this.root.stopIndex, 277+17, 'root stop');
		// this.assertEqual(this.root.subElements()[0].stopIndex, 277+17);
	},

	testGetSourceCodeWithoutSubElements: function() {
		var fragment = this.fragmentNamed('ClassB');
		this.assert(fragment, 'no fragment found');
		var expected =  'ClassA.subclass(\'ClassB\', {\n\n});\n';
		this.assertEqual(fragment.getSourceCodeWithoutSubElements(), expected);
	},

	testRenameClass: function() {
		var fragment = this.fragmentNamed('ClassA');
		var newName = 'ClassARenamed';
		fragment.putSourceCode('Object.subclass(\'' + newName + '\', {\n\tm1: function(a) {\n\t\ta*15;\n\t\t2+3;\n\t}\n});\n');
		this.assertEqual(fragment.name, newName);
		var foundAgain = this.fragmentNamed(newName);
		this.assertIdentity(foundAgain, fragment);
		var old = this.fragmentNamed('ClassA');
		this.assert(!old, 'old fragment still exisiting!');
	},

	testSourceWithErrorsWillNotBeSaved: function() {
		var fragment = this.fragmentNamed('ClassA');
		var newName = 'ClassAEdited';
		fragment.putSourceCode('Object.subclass(\'' + newName + '\', \{\n');

		this.assert(!this.db.getCachedText('foo.js').include('ClassAEdited'))
	},

	testReparse: function() {
		var fragment = this.fragmentNamed('ClassA');
		var result = fragment.reparse(fragment.getSourceCode());
		this.assertEqual(fragment.type, result.type);
		this.assertEqual(fragment.name, result.name);
		this.assertEqual(fragment.stopIndex, result.stopIndex);
		this.assertEqual(fragment.startIndex, result.startIndex);
		this.assertEqual(fragment.subElements().length, result.subElements().length);
	},

	testReparseCompleteFileFrag: function() {
		var src = '\nfunction abc() { 1+2 }\n\n';
		var fileName = 'bar.js';
		var frag = new lively.ide.FileFragment(fileName, 'completeFileDef', 0, src.length-1, fileName, [], this.db);
		this.db.modules[fileName] = lively.ide.ModuleWrapper.forFile(fileName);
		var result = frag.reparse(src);
		this.assertEqual(frag.type, result.type);
		this.assert(result.subElements().length > 0);
		this.assertEqual(result.stopIndex, src.length-1);
	},

	testPutNewSourceWithChangingCompleteFileFrag: function() {
		var oldSrc = '\nfunction abc() { 1+2 }\n\n';
		var fileName = 'bar.js';		
		var frag = this.db.addModule(fileName, oldSrc).ast();
		var newSrc = 'module(\'bar.js\').requires().toRun({function() {' + oldSrc + '});';
		frag.putSourceCode(newSrc);
		this.assertEqual(frag.type, 'moduleDef');
	},

	TODOtestReparseWithError: function() {
		// TODO make this work
		/*
		var fragment = this.fragmentNamed('ClassA');
		var newSrc = 'Object.subclass(\'ClassAEdited\', \{\n';
		var result = fragment.reparse(newSrc);
		dbgOn(true)
		this.assert(result.isError, 'no errorFileFrag');
		*/
	},

	testBuildNewSourceString: function() {
		var fragment = this.fragmentNamed('ClassA');
		var newString = 'Object.subclass(\'ClassXYZ\', {});\n';
		var result = fragment.buildNewFileString(newString);
		var expected = 'module(\'foo.js\').requires(\'bar.js\').toRun(function() {\n' +
		'Object.subclass(\'ClassXYZ\', {});\n' +
		'ClassA.m3 = function() { 123 };\n' +
		'function abc() { 1+2 };\n' +
		'ClassA.subclass(\'ClassB\', {\n\tm2: function(a) { 3 },\nm3: function(b) { 4 }\n});\n' +
		'}); // end of module';
		this.assertEqual(expected, result);
	},

	testSourceCodeWithout: function() {
		var fragment = this.fragmentNamed('m1');
		var owner = this.fragmentNamed('ClassA');
		var result = owner.sourceCodeWithout(fragment);
		var expected = 'Object.subclass(\'ClassA\', {\n\n});\n';
		this.assertEqual(expected, result);
	},

	testRemoveFragment: function() {
		var fragment = this.fragmentNamed('ClassA');
		var src = fragment.getSourceCode();
		var expectedLength = fragment.getFileString().length - fragment.getSourceCode().length;
		fragment.remove();
		this.assert(!this.root.flattened().include(fragment), 'root still includes fragment');
		var fileString = this.db.getCachedText('foo.js');
		this.assert(!fileString.include(src), 'filestring includes fragments sourceCode');
		this.assertEqual(expectedLength, fileString.length, 'strange length');
	},

	testAddSibling: function() {
		var classFragment = this.fragmentNamed('ClassA');
		var oldNoOfSubelements = classFragment.findOwnerFragment().subElements().length;
		var src = 'Object.subclass(\'ClassC\', {});\n'
		var newClassFragment = classFragment.addSibling(src);
		this.assertEqual(newClassFragment.getSourceCode(), src);
		this.assertEqual(newClassFragment.startIndex, classFragment.stopIndex+1, 'newcCassFrag1 start');
		var newNoOfSubelements = newClassFragment.findOwnerFragment().subElements().length;
		this.assertEqual(oldNoOfSubelements, newNoOfSubelements-1, 'no of subelems');
	},
	testAddSibling2: function() {
		var fragment = this.fragmentNamed('m2');
		var next = this.fragmentNamed('m1');
		var owner = this.fragmentNamed('ClassA');
		var expectedLength = owner.getFileString().length + fragment.getSourceCode().length;
		next.addSibling(fragment.getSourceCode());
		var string = owner.getFileString();
		this.assertEqual(expectedLength+2, string.length, 'strange length');
		this.assertEqual(owner.subElements().length, 2);
		this.assertEqual(owner.subElements()[1].getSourceCode(), fragment.getSourceCode());
	},
	testFindOwnerWhenSubelementsChange: function() {
		var fragment = this.fragmentNamed('m1');
		var owner = this.fragmentNamed('ClassA');
		this.assertEqual(fragment.findOwnerFragment(), owner, 1);
		owner.reparse(owner.getSourceCode());
		this.assertEqual(fragment.findOwnerFragment(), owner, 2);
	},

	testFindOwnerWithSimilarFragment: function() {
		this.setUpAlternateSource();
		var fragment = this.fragmentNamed('Dummy');
		this.assertEqual(fragment.subElements().length, 3);
		var f1 = fragment.subElements()[1];
		var f2 = fragment.subElements()[2];
		this.assertEqual(f1.getSourceCode(), f2.getSourceCode());
		this.assertEqual(f1.startIndex, 68, 1); this.assertEqual(f1.stopIndex, 76, 2);
		this.assertEqual(f2.startIndex, 79, 3); this.assertEqual(f2.stopIndex, 87, 4);

		this.assertEqual(fragment.sourceCodeWithout(f2), 'Object.subclass("Dummy", {\ntest1: 1,\ntest2: 2,\n\n\n});');
		this.assertEqual(fragment.sourceCodeWithout(f1), 'Object.subclass("Dummy", {\ntest1: 1,\n\n\ntest2: 2,\n});');
	},

	testMoveFragment: function() {
		this.setUpAlternateSource();
		var o = this.fragmentNamed('Dummy');
		var f = o.subElements()[2];
		f.moveTo(o.subElements()[0].startIndex);
		var newO = this.fragmentNamed('Dummy');
		this.assertEqual(f.getSourceCode(), newO.subElements()[0].getSourceCode(), 1);
		this.assertEqual(f.getSourceCode(), 'test2: 2,', 2);
		//this.assert(newO.eq(o), 6);
		this.assert(f.findOwnerFragment().eq(newO), 3);
		this.assert(f.eq(newO.subElements()[0]), 4);
		this.assertEqual(newO.getSourceCode(), 'Object.subclass("Dummy", {\ntest2: 2,test1: 1,\ntest2: 2,\n\n\n});', 5);
	},

	testMoveFragment2: function() {
		this.setUpAlternateSource();
		var targetIndex = this.src.indexOf('}'); // Dummy1
		var f = this.fragmentNamed('test2'); // first one
		f.moveTo(targetIndex);
		this.assertEqual(f.getSourceCode(), 'test2: 2,', 1);
		this.assertEqual(f.getFileString(), 'Object.subclass("Dummy1", {test2: 2,});\n'+
		'Object.subclass("Dummy", {\ntest1: 1,\n\n\ntest2: 2,\n});');
	},

	testEq1: function() {
		var f = this.fragmentNamed('m2');
		this.assert(f.eq(f), 1);
		var f1 = this.jsParser.parseNonFile('m2: function() { bla bla }');
		var f2 = this.jsParser.parseNonFile('m2: function() { bla bla }');
		this.assert(f1.eq(f2), 2);
		f1.type = 'unknown';
		this.assert(!f1.eq(f2), 3);
		f1.type = f2.type;
		f1._fallbackSrc = 'x' + f1._fallbackSrc;
		this.assert(!f1.eq(f2), 4);
		f1._fallbackSrc = f2._fallbackSrc;
		f1.startIndex++;
		this.assert(!f1.eq(f2), 5);
	},
testFindPrevFragment: function() {
	this.setUpAlternateSource2();
	var def = this.fragmentNamed('ClassA');
	var prev = def.prevElement();
	this.assertEquals('comment', prev.type);
},
testGetComment: function() {
	this.setUpAlternateSource2();
	var def = this.fragmentNamed('ClassA');
	var comment = def.getComment();
	this.assertEquals('// ClassA is so important\n// foo bar\n', comment);
},



});

Tests.ToolsTests.FileFragmentTest.subclass('Tests.ToolsTests.FileFragmentNodeTests', {

	setUp: function($super) {
		$super();
		this.browser = {};
	},

	testFragmentsOfNodesDiffer: function() {
		/* just use updating via registered browsers, no need for hasCurrentSource
		var class1Frag = this.fragmentNamed('ClassA');
		var node1 = new ideModule.ClassFragmentNode(class1Frag, this.browser);
		node1.sourceString(); // 'show' node1
		var class2Frag = this.fragmentNamed('ClassB');
		var node2 = new ideModule.ClassFragmentNode(class2Frag, this.browser);
		node2.sourceString(); // 'show' node2
		this.assert(node1.hasCurrentSource(), 'node1 hasCurrentSource');
		this.assert(node2.hasCurrentSource(), 'node2 hasCurrentSource');
		node1.newSource('Object.subclass(\'ClassA\', {});\n');
		this.assert(node1.hasCurrentSource(), 'node1 hasCurrentSource 2');
		this.assert(!node2.hasCurrentSource(), 'node2 hasCurrentSource 2');
		*/
	}
});

TestCase.subclass('Tests.ToolsTests.ChangesTests', {

	setUp: function() {
		this.parser = new AnotherCodeMarkupParser();
		this.cleanUpItems = [];
	},

	tearDown: function() {
		this.cleanUpItems.forEach(function(ea) { Class.deleteObjectNamed(ea) });
	},
	testEquals: function() {
		var c1 = DoitChange.create('1+2');
		var c2 = DoitChange.create('1+2');
		this.assert(c1.eq(c2), 'changes not equal');
	},


	testCreateProtoMethodChange: function() {
		var xml = stringToXML('<proto name="m1"><![CDATA[function(color) { 1+ 2 }]]></proto>');
		var change = this.parser.createChange(xml);
		this.assert(change.isProtoChange);
		this.assertEqual(change.getName(), 'm1');
		this.assertEqual(change.getDefinition(), 'function(color) { 1+ 2 }');
	},

	testCreateClassChange: function() {
		var xml = stringToXML('<class name="lively.Test" super="Object"></class>');
		var change = this.parser.createChange(xml);
		this.assert(change.isClassChange);
		this.assertEqual(change.getName(), 'lively.Test');
		this.assertEqual(change.getSuperclassName(), 'Object');
	},

	testCreateClassChangeWithSubElems: function() {
		var xml = stringToXML('<class name="lively.Test" super="Object"><proto name="m1"><![CDATA[function() {xyz}]]></proto></class>');
		var change = this.parser.createChange(xml);
		var sub = change.getProtoChanges();
		this.assertEqual(sub.length, 1);
		var pChange = sub.first();
		this.assertEqual(pChange.getName(), 'm1');
	},

	testEvaluateMethodChangeWithNonExistingClass1: function() {
		var xml = stringToXML('<proto name="m1"><![CDATA[function(color) { 1+ 2 }]]></proto>');
		var change = this.parser.createChange(xml);
		this.assert(change.evaluate, 'no eval func');
		try { change.evaluate(); } catch(e) { return }
		this.assert(false, 'could evaluate proto method without class');
	},

	testEvaluateMethodChangeWithNonExistingClass2: function() {
		var xml = stringToXML('<class name="lively.Test" super="Object"><proto name="m1"><![CDATA[function() {xyz}]]></proto></class>');
		var change = this.parser.createChange(xml).getProtoChanges().first();
		this.assert(change.evaluate, 'no eval func');
		try { change.evaluate(); } catch(e) { return }
		this.assert(false, 'could evaluate proto method without exisiting class in system');
	},

	testEvaluateMethodWithClassInSystem: function() {
		var className = 'Tests.ToolsTests.DummyForChangeTests1';
		this.cleanUpItems.push(className);
		Object.subclass(className);
		var xml = stringToXML('<class name="' + className +'" super="Object"><proto name="m1"><![CDATA[function() {1+2}]]></proto></class>');
		var change = this.parser.createChange(xml).getProtoChanges().first();
		var m = change.evaluate();
		this.assert(m instanceof Function);
		this.assert(Class.forName(className).functionNames().include('m1'), 'no function');
	},

	testEvaluateClassChange: function() {
		var className = 'Tests.ToolsTests.DummyForChangeTests2';
		this.cleanUpItems.push(className);
		var xml = stringToXML('<class name="'+ className +'" super="Object"><proto name="m1"><![CDATA[function() {1+2}]]></proto></class>');
		var change = this.parser.createChange(xml);
		var klass = change.evaluate();
		this.assert(klass && Class.isClass(klass));
		this.assert(klass.functionNames().include('m1'), 'no function');
	},

	testEvalauteClassChnageWithStaticElem: function() {
		var className = 'Tests.ToolsTests.DummyForChangeTests3';
		this.cleanUpItems.push(className);
		var xml = stringToXML('<class name="'+ className +'" super="Object"><proto name="m1"><![CDATA[function() {1+2}]]></proto><static name="staticM1"><![CDATA[function(xyz) { 1+1 }]]></static></class>');
		var change = this.parser.createChange(xml);
		var klass = change.evaluate();
		this.assert(klass.functionNames().include('m1'), 'no proto function');
		this.assert(klass['staticM1'] instanceof Function, 'no static function');
	},

	testLoadPenLkml: function() {
		delete Global['Pen'];
		ChangeSet.fromFile('Tests/testRessources/Pen.lkml').evaluate();
		this.assert(Global['Pen']);
	},

	testDoit: function() {
		var objName = 'Tests.ToolsTests.DummyObj';
		this.assert(!Class.forName(objName), 'TestObj already exists');
		this.cleanUpItems.push(objName);
		var xml = stringToXML('<doit><![CDATA[' + objName + ' = {test: 1}; 1+2;]]></doit>');
		var change = this.parser.createChange(xml);
		this.assert(change.isDoitChange);
		this.assertEqual(change.evaluate(), 3);
		this.assert(Class.forName(objName), 'TestObj not created');
	},

	testCreateProtoChange: function() {
		var name = 'test';
		var src = 'function() { 1+ 2 }';
		var className = 'lively.Dummy';
		var change = ProtoChange.create(name, src, className);
		this.assertEqual(change.getName(), name);
		this.assertEqual(change.getDefinition(), src);
		this.assertEqual(change.getClassName(), className);
	},

	testSetNewDoitDef: function() {
		var oldSrc = '1+2+3';
		var change = DoitChange.create(oldSrc);
		this.assertEqual(change.getDefinition(), oldSrc);
		var newSrc = '4+5+6';
		change.setDefinition(newSrc);
		this.assertEqual(change.getDefinition(), newSrc);
	},
	testSetXMLElement: function() {
		// ensure that ne is placed at the same pos as old
		var classChange = ClassChange.create('TestClass', 'Object');
		var proto1 = new ProtoChange.create('test1', '123');
		var proto2 = new ProtoChange.create('test2', '456');
		classChange.addSubElements([proto1, proto2]);
		var proto3 = new ProtoChange.create('test3', '789');
		proto1.setXMLElement(proto3.getXMLElement());
		this.assertEqual(proto1.getDefinition(), '789', 'def is wrong');
		this.assertIdentity(classChange.subElements()[0].getName(), 'test3', 'proto1 not at old pos');
	},
	testSetNewName: function() {
		var change = DoitChange.create('123');
		this.assertEqual(change.getName(), 'aDoit');
		change.setName('myDoit');
		this.assertEqual(change.getName(), 'myDoit');
	},
	testChangeHasCDATASection: function() {
		var name = 'testChangeHasCDATASection_doit';
		var source = '4+1';
		var doit = DoitChange.create(source, name);
		var element = doit.getXMLElement();
		this.assertEqual(source, element.textContent);
		this.assertEqual(1, element.childNodes.length);
		this.assertEqual(element.CDATA_SECTION_NODE, element.childNodes[0].nodeType, 'node type');
	},

});

Tests.ToolsTests.FileFragmentTest.subclass('Tests.ToolsTests.ChangesConversionTest', {

	setUp: function($super) {
		$super();
		this.jsParser = new JsParser();
		this.changesParser = new AnotherCodeMarkupParser();
	},

	testConvertClassFFToChange: function() {
		var frag = this.fragmentNamed('ClassA');
		var change = frag.asChange();
		this.assert(change.isClassChange, 'is not a class change');
		this.assertEqual(change.subElements().length, 1, 'subelements?');
		this.assert(change.subElements()[0].isProtoChange, 'subelements[0]?');
		this.assertEqual(change.subElements()[0].getName(), 'm1', 'subelements[0] name?');
	},
	testConvertMethodFFToProtoChange: function() {
		var f = this.fragmentNamed('m1');
		this.assertEqual(f.type, 'propertyDef');
		var result = f.asChange();
		this.assert(result.isProtoChange, 'no protoChange');
		this.assertEqual(result.getDefinition(), 'function(a) {\n\t\ta*15;\n\t\t2+3;\n\t}');
	},
	testPropertyFFToChange: function() {
		var s = 'initialStyle: {borderWidth: 0, fillOpacity: .5, fill: Color.veryLightGray},';
		var f = this.jsParser.parseNonFile(s);
		var c = f.asChange();
		this.assertEqual(c.asJs(), s);
	},

	testProtoChangeAsJs: function() {
		var protoC = ProtoChange.create('test', 'function(a,b) {\n 1+2}', 'Dummy');
		var result = protoC.asJs();
		this.assertEqual(result, 'test: function(a,b) {\n 1+2},');
		var convertedBack = this.jsParser.parseNonFile(result);

		convertedBack.asChange();
	},
	testClassChangeAsJs: function() {
		var classC = ClassChange.create('TestClass', 'SuperTestClass');
		var result = classC.asJs();
		this.assertEqual(result, 'SuperTestClass.subclass(\'TestClass\', {});');
		var protoC1 = ProtoChange.create('test1', 'function() {1}', 'TestClass');
		var protoC2 = ProtoChange.create('test2', 'function() {2}', 'TestClass');
		classC.addSubElements([protoC1, protoC2]);
		result = classC.asJs();
		this.assertEqual(result, 'SuperTestClass.subclass(\'TestClass\', {\n\n' +
		'test1: function() {1},\n\ntest2: function() {2},\n\n});');
		var convertedBack = this.jsParser.parseNonFile(result);
		var newChange = convertedBack.asChange();
		this.assertEqual(newChange.subElements().length, 2);
	},

});

TestCase.subclass('Tests.ToolsTests.ModuleWrapperTest', {
	
	testCreateWrapper: function() {
		var sut = lively.ide.ModuleWrapper.forFile('foobar.js');
		this.assertEquals(sut.moduleName(), 'foobar');
		this.assertEquals(sut.type(), 'js');
		var sut = lively.ide.ModuleWrapper.forFile('lively/parser.ometa');
		this.assertEquals(sut.moduleName(), 'lively.parser');
		this.assertEquals(sut.fileName(), 'lively/parser.ometa');
		this.assertEquals(sut.type(), 'ometa');
	},
	
});

Tests.SerializationTests.SerializationBaseTestCase.subclass('Tests.ToolsTests.ChangeSetTests', {

	setUp: function($super) {
		$super();
		this.parser = new AnotherCodeMarkupParser();
		this.cleanUpItems = [];
	},

	tearDown: function($super) {
		$super();
		this.cleanUpItems.forEach(function(ea) { Class.deleteObjectNamed(ea) });
	},

	testEquals: function() {
		var cs1 = ChangeSet.fromWorld(this.worldMorph);
		cs1.addChange(DoitChange.create('1+2'));
		var cs2 = ChangeSet.fromWorld(this.worldMorph);
		this.assert(cs1.eq(cs2), 'changes not equal');
	},

	testAddChangeSetToWorldPlusReconstruct: function() {
		var world = this.worldMorph;
		var cs = ChangeSet.fromWorld(world);
		this.assert(cs.xmlElement, 'no xmlElement');
		this.assertIdentity(world.getDefsNode().getElementsByTagName('code')[0], cs.xmlElement);
		var cs2 = ChangeSet.fromWorld(world);
		this.assertIdentity(world.getDefsNode().getElementsByTagName('code')[0], cs2.xmlElement);
		this.assertIdentity(world.getDefsNode().getElementsByTagName('code')[0], cs.xmlElement);
	},

	testAddChangesToChangeSet: function() {
		var cs = ChangeSet.fromWorld(this.worldMorph);
		var xml = stringToXML('<class name="lively.Test" super="Object"></class>');
		var change = this.parser.createChange(xml);
		var length = cs.subElements().length;
		cs.addChange(change);
		var result = cs.subElements();
		this.assertEqual(result.length, length+1);
		this.assert(result.last().isClassChange);
		this.assertEqual(result.last().getName(), change.getName());
	},

	testAddedChangeSetGetsSerialized: function() {
		var world = this.worldMorph;
		var cs = ChangeSet.fromWorld(world);
		// create change
		var xml = stringToXML('<class name="lively.Test" super="Object"></class>');
		var change = this.parser.createChange(xml);
		cs.addChange(change);
		// serialize a bit
		var doc = Exporter.shrinkWrapMorph(world);
		var worldNode = doc.getElementById(world.id());
		var codeNode = worldNode.getElementsByTagName('code')[0];
		this.assert(codeNode, 'node codeNode');
		this.assert(codeNode.childNodes.length > 1);
		var newChange = this.parser.createChange($A(codeNode.childNodes).last());
		this.assert(newChange);
		this.assertEqual(newChange.getName(), change.getName());
	},

	testSerializeAndDeserializeChangeSet: function() {
		var world = this.worldMorph;
		var cs = ChangeSet.fromWorld(world);
		// create change
		var xml = stringToXML('<class name="lively.Test" super="Object"></class>');
		var change = this.parser.createChange(xml);
		cs.addChange(change);
		var length = cs.subElements().length;
		// serialize a bit
		var doc = Exporter.shrinkWrapMorph(world);
		var newWorld = new Importer().loadWorldContents(doc);
		var newCs = ChangeSet.fromWorld(newWorld);
		this.assertEqual(newCs.subElements().length, length);
		this.assertEqual(newCs.subElements().last().getName(), change.getName());
	},

	testEvalChangeSet: function() {
		var className = 'Tests.ToolsTests.DummyForChangeTests4';
		this.cleanUpItems.push(className);
		var xml = stringToXML('<class name="'+ className +'" super="Object"><proto name="m1"><![CDATA[function() {1+2}]]></proto></class>');
		var change = this.parser.createChange(xml);
		var cs = ChangeSet.fromWorld(this.worldMorph);
		cs.addChange(change);
		cs.evaluate();
		var klass = Class.forName(className);
		this.assert(klass && Class.isClass(klass), 'no class?');
		this.assert(klass.functionNames().include('m1'), 'no function');
	},

	testRemoveNamedChanges: function() {
		var change = DoitChange.create('1+2');
		this.assertEqual(change.getName(), 'aDoit', 'change has no name');
		var cs = ChangeSet.fromWorld(this.worldMorph);
		var length = cs.subElements().length;
		cs.addChange(change);
		cs.removeChangeNamed('aDoit');
		this.assertEqual(cs.subElements().length, length);
	},

	testRemoveChangeAtIndex: function() {
		var change = DoitChange.create('1+2');
		this.assertEqual(change.getName(), 'aDoit', 'change has no name');
		var cs = ChangeSet.fromWorld(this.worldMorph);
		var length = cs.subElements().length;
		cs.addChange(change);
		cs.removeChangeAt(cs.subElements().length - 1);
		this.assertEqual(cs.subElements().length, length);
	},

	testRemoveAllChanges: function() {
		var change = DoitChange.create('1+2');
		this.assertEqual(change.getName(), 'aDoit', 'change has no name');
		var cs = ChangeSet.fromWorld(this.worldMorph);
		cs.addChange(change);
		change = DoitChange.create('3+4');
		cs.addChange(change);
		cs.remove();
		this.assertEqual(cs.subElements().length, 0);
	},

	testStartUpEvaluating: function() {
		Tests.ToolsTests.ChangeSetTests.doit1WasRun = false;
		Tests.ToolsTests.ChangeSetTests.doit2WasRun = false;
		Tests.ToolsTests.ChangeSetTests.initializerWasRun = false;
		var newChange1 = DoitChange.create('Tests.ToolsTests.ChangeSetTests.doit1WasRun = true');
		var newChange2 = DoitChange.create('Tests.ToolsTests.ChangeSetTests.doit2WasRun = true');
		var cs = ChangeSet.fromWorld(this.worldMorph);
		cs.addSubElements([newChange1, newChange2]);
		var init = cs.getInitializer();
		init.setDefinition('Tests.ToolsTests.ChangeSetTests.initializerWasRun = true');
		cs.evaluateAllButInitializer();
		this.assert(Tests.ToolsTests.ChangeSetTests.doit1WasRun, 'doit1');
		this.assert(Tests.ToolsTests.ChangeSetTests.doit2WasRun, 'doit2');
		this.assert(!Tests.ToolsTests.ChangeSetTests.initializerWasRun, 'init 1');
		cs.evaluateInitializer();
		this.assert(Tests.ToolsTests.ChangeSetTests.initializerWasRun, 'init 2');
	},
	testStartUpEvaluatingWithDisabledChanges: function() {
		Tests.ToolsTests.ChangeSetTests.doit1WasRun = false;
		Tests.ToolsTests.ChangeSetTests.doit2WasRun = false;
		var newChange1 = DoitChange.create('Tests.ToolsTests.ChangeSetTests.doit1WasRun = true');
		var newChange2 = DoitChange.create('Tests.ToolsTests.ChangeSetTests.doit2WasRun = true');
		newChange2.disableAutomaticEval();
		var cs = ChangeSet.fromWorld(this.worldMorph);
		cs.addSubElements([newChange1, newChange2]);
		cs.evaluateAllButInitializer();
		this.assert(Tests.ToolsTests.ChangeSetTests.doit1WasRun, 'doit1');
		this.assert(!Tests.ToolsTests.ChangeSetTests.doit2WasRun, 'doit2');
	},

	xtestReal: function() {
		var src1 = 'var extent = pt(200,200);\n\
var pos = WorldMorph.current().getExtent().scaleBy(0.5).subPt(extent.scaleBy(0.5));\n\
var m = new BoxMorph(pos.extent(extent));\n\
m.openInWorld();';
		var c1 = DoitChange.create(src1);
		var src2 = 'WorldMorph.current().submorphs.last().setFill(Color.red)';
		var c2 = DoitChange.create(src2);
		var cs = ChangeSet.current();
		cs.addChange(c1);
		cs.addChange(c2);
	},
	
	testModuleNamesInNamespace: function() {
		var sut = ChangeSet.fromWorld(this.worldMorph);
		var list = sut.moduleNamesInNamespace('apps')
		this.assert(list.length > 0, "nothing founds");
	},

	testAddAndRemoveWorldRequirement: function() {
		var sut = ChangeSet.fromWorld(this.worldMorph);
		var list = sut.getWorldRequirementsList().evaluate();
		this.assertEqual(list.length, 0, "list is not empty") 

		sut.addWorldRequirement('lively.TestFramework')
		list = sut.getWorldRequirementsList().evaluate();
		this.assertEqual(list.length, 1, "add failed") 

		sut.removeWorldRequirement('lively.TestFramework')
		list = sut.getWorldRequirementsList().evaluate();
		this.assertEqual(list.length, 0, "remove failed") 

	},
	
});
TestCase.subclass('Tests.ToolsTests.FileVersionViewerTests', {});

TestCase.subclass('Tests.ToolsTests.KeyboardTest', {
    
    shouldRun: false,
    
    testStartKeyWatcher: function() {
		var keyWatcher = Morph.makeRectangle(0,0,100,20);
		keyWatcher.setFill(Color.red);
  
		var label = new TextMorph(keyWatcher.bounds().translatedBy(0,50));
        label.takesKeyboardFocus = Functions.False;
        label.onKeyDown = Functions.False;
        label.onKeyPress = Functions.False;

        keyWatcher.addMorph(label);
        keyWatcher.takesKeyboardFocus = Functions.True;
        keyWatcher.onKeyDown = function(evt) {
                console.log('PRESS');
				if (evt.rawEvent.ctrlKey) console.log('Ctrl key pressed');
             //debugger;
            label.setTextString(evt.getKeyChar() + '---' + evt.getKeyCode());
            // evt.stop();
        }
        
        keyWatcher.openInWorld();
        //keyWatcher.requestKeyboardFocus(WorldMorph.current().hands.first());
		WorldMorph.current().hands.first().setKeyboardFocus(keyWatcher);
    }
})
    
TestCase.subclass('Tests.ToolsTests.MouseEventTest', {

	testMouseEvents: function() {
		var mouseWatcher = Morph.makeRectangle(0,0,100,20);
		mouseWatcher.setFill(Color.red);

        mouseWatcher.takesMouseFocus = Functions.True;
		mouseWatcher.handlesMouseDown = Functions.True;
        mouseWatcher.onMouseDown = function(evt) {
                console.log('CLICK');
				console.log(evt.rawEvent.button)
				if (evt.rawEvent.ctrlKey) console.log('Ctrl key pressed');
				evt.stop();
        }

        mouseWatcher.openInWorld();
        //keyWatcher.requestKeyboardFocus(WorldMorph.current().hands.first());
		WorldMorph.current().hands.first().setKeyboardFocus(mouseWatcher);
    }
});

TestCase.subclass('Tests.ToolsTests.TabCompletionTest', {

	testAllSymbols: function() {
		this.assert(TabCompletion.allSymbols().length > 1000)
	},

	testAllSymbolsAreUnique: function() {
		var all = TabCompletion.allSymbols(true);
		var uniq = all.clone().uniq();
		this.assertEqual(all.length, uniq.length, "not unique");
	},
	
	testExtractLocalSymbols: function() {
		var text = "abc abbc\nabbd\tabbe";
		var all = TabCompletion.extractLocalSymbols(text)
		this.assert(all.length == 4, "wrong lenth")
	}

});
TestCase.subclass('Tests.ToolsTests.TabCompletionLayerTest', {

	createText: function(string) {
		var sut = new TextMorph(new Rectangle(0,0,100,100), string);
		sut.setWithLayers([TabCompletionLayer]);
		return sut
	},

	testTabCompletionChoicesForLastWord: function() {
		var string = "\nfunc\nNextLine\n"
		var sut = this.createText(string);
		sut.setSelectionRange(string.indexOf("\nNextLine"), 0);
		var coices = sut.tabCompletionChoicesForLastWord("func");
		this.assert(coices.length > 0);
	},

	testTabCompletionChoicesForLastWord: function() {
		var string = "\nfunc\nNextLine\n"
		var sut = this.createText(string);
		sut.setSelectionRange(string.indexOf("\nNextLine"), 0);
		// this.assertEqual(sut.tabCompletionForLastWord("func", false), "function");
	}
});

}) // end of module