module('lively.Tests.ClamatoTest').requires('lively.TestFramework', 'lively.Ometa', 'lively.ClamatoParser').toRun(function() {

TestCase.subclass('lively.Tests.ClamatoTest.ClamatoParserTest', {
setUp: function() {
	this.parser = ClamatoParser;
},
parse: function(rule, src) {
	var errorcb = OMetaSupport.handleErrorDebug;
	return OMetaSupport.matchAllWithGrammar(this.parser, rule, src, errorcb);
},
test01ParseUnaryMessageSend: function() {
	var src = 'x foo';
	var result = this.parse('expression', src);
	this.assert(result.isMessage, 'not a message node');
	this.assert(result.isUnary , 'not unary');
	this.assert(result.receiver.isVariable, 'receiver is not a variable');
	this.assertEqual('x', result.receiver.name, 'wrong receiver name');
	this.assertEqual('foo', result.messageName, 'wrong message name');
	this.assertEqual(null, result.args);
},
test02ParseBinaryMessageSend: function() {
	var src = 'x ++ 1';
	var result = this.parse('expression', src);
	this.assert(result.isMessage, 'not a message node');
	this.assert(result.isBinary , 'not binary');
	this.assertEqual('x', result.receiver.name, 'wrong receiver name');
	this.assertEqual('++', result.messageName, 'wrong message name');
	this.assertEqual(1, result.args.length);
	this.assert(result.args.first().isLiteral);
	this.assertEqual(1, result.args.first().value);
},
test03aKeywordyMessageSend: function() {
	var src = 'x foo: -42';
	var result = this.parse('expression', src);
	this.assert(result.isMessage, 'not a message node');
	this.assert(result.isKeyword , 'not keyword');
	this.assertEqual('foo:', result.messageName, 'wrong message name');
	this.assertEqual(1, result.args.length);
	this.assert(result.args.first().isLiteral);
	this.assertEqual(-42, result.args.first().value);
},
test03bKeywordyMessageSend: function() {
	var src = 'x foo: 42 bar: blupf baz: 23';
	var result = this.parse('expression', src);
	this.assert(result.isMessage, 'not a message node');
	this.assert(result.isKeyword , 'not keyword');
	this.assertEqual('foo:bar:baz:', result.messageName, 'wrong message name');
	this.assertEqual(3, result.args.length);
	this.assert(result.args[0].isLiteral);
	this.assertEqual(42, result.args[0].value);
	this.assert(result.args[1].isVariable);
	this.assertEqual('blupf', result.args[1].name);
	this.assert(result.args[2].isLiteral);
	this.assertEqual(23, result.args[2].value);
},
test03cKeywordAndBinary: function() {
	var src = 'x + y foo: 1';
	var result = this.parse('expression', src);
	this.assert(result.isKeyword , 'not keyword');
	this.assertEqual('foo:', result.messageName, 'wrong message name');
	this.assert(result.args[0].isLiteral , 'not literal arg');
	this.assert(result.receiver.isBinary , 'not binary receiver');
},


test04aChainedUnaryMessages: function() {
	var src = 'x foo bar';
	var result = this.parse('expression', src);
	this.assert(result.isMessage, 'not a message node');
	this.assert(result.isUnary , 'not unary');
	this.assertEqual('bar', result.messageName, 'wrong message name');
	result = result.receiver;
	this.assert(result.isMessage, 'not a message node 2');
	this.assert(result.isUnary , 'not unary 2');
	this.assertEqual('foo', result.messageName, 'wrong message name 2');
	this.assert(result.receiver.isVariable , 'wrong receiver 2');
},test04bChainedBinaryMessages: function() {
	var src = 'x + 1 * 2';
	var result = this.parse('expression', src);
	this.assert(result.isMessage, 'not a message node');
	this.assert(result.isBinary , 'not binary');
	this.assertEqual('*', result.messageName, 'wrong message name');
	this.assertEqual(2, result.args[0].value, 'wrong arg');
	result = result.receiver;
	this.assert(result.isMessage, 'not a message node 2');
	this.assert(result.isBinary , 'not binary 2');
	this.assertEqual('+', result.messageName, 'wrong message name 2');
	this.assertEqual(1, result.args[0].value, 'wrong arg 2');
	this.assert(result.receiver.isVariable , 'wrong receiver 2');
},
test05UnaryBinaryKeywordMessage: function() {
	var src = 'x foo: 2--3 bar: 1 baz';
	var result = this.parse('expression', src);
	this.assert(result.isKeyword , 'not keyword');
	this.assertEqual('foo:bar:', result.messageName, 'wrong message name');
	this.assertEqual('x', result.receiver.name, 'wrong receiver name');
	/* -------- */
	this.assert(result.args[0].isBinary , 'first arg not binary');
	this.assertEqual(2, result.args[0].receiver.value, 'first arg wrong receiver');
	this.assertEqual(3, result.args[0].args[0].value, 'first arg wrong arg');
	this.assertEqual('--', result.args[0].messageName, 'first arg wrong msgName');
	/* -------- */
	this.assert(result.args[1].isUnary , 'secon arg not unary');
	this.assertEqual('baz', result.args[1].messageName, 'second arg wrong msgName');
	this.assertEqual(1, result.args[1].receiver.value, 'second arg wrong receiver');
},
test06aSubexpressionAndUnary: function() {
	var src = '(x + y) foo';
	var result = this.parse('expression', src);
	this.assert(result.isUnary , 'not unary');
	this.assertEqual('foo', result.messageName, 'wrong message name');
	this.assert(result.receiver.isBinary , 'not binary');
},
test06bSubexpressionAndUnary: function() {
	var src = 'x + (y foo: 1)';
	var result = this.parse('expression', src);
	this.assert(result.isBinary , 'not binary');
	this.assertEqual('+', result.messageName, 'wrong message name');
	this.assert(result.args[0].isKeyword , 'not Keyword');
	this.assertEqual('foo:', result.args[0].messageName , 'wrong Keyword');
},
test07aAssignment: function() {
	var src = 'xyz := 1';
	var result = this.parse('expression', src);
	this.assert(result.isAssignment , 'no assignment');
	this.assertEqual('xyz', result.variable.name, 'wrong var name');
	this.assertEqual(1, result.value.value , 'wrong value');
},
test07bAssignment: function() {
	var src = 'x := yz:=1';
	var result = this.parse('expression', src);
	this.assert(result.isAssignment , 'no assignment');
	this.assertEqual('x', result.variable.name, 'wrong var name');
	this.assert(result.value.isAssignment , 'value not assignment');
	this.assertEqual('yz', result.value.variable.name, 'wrong var name 2');
	this.assert(result.value.value.isLiteral , 'value.value not literal');
},
test08aString: function() {
	var string = ' this is a string';
	var src = '\'' + string + '\'';
	var result = this.parse('expression', src);
	this.assert(result.isLiteral , 'no string');
	this.assertEqual(string, result.value, 'didnt recognize string');
},
test08bStringWithEscapedQuote: function() {
	var string = 'That\'s fun';
	var src = '\'That\'\'s fun\'';
	var result = this.parse('expression', src);
	this.assert(result.isLiteral , 'no string');
	this.assertEqual(string, result.value, 'didnt recognize string');
},
test08cEmptyString: function() {
	var src = '\'\'';
	var result = this.parse('expression', src);
	this.assert(result.isLiteral , 'no string');
	this.assertEqual('', result.value, 'didnt recognize string');
},

test09aParseSequence: function() {
	var src = 'x foo. x := 1+2. x + bar';
	var result = this.parse('sequence', src);
xx=result;
	this.assert(result.isSequence , 'no sequence');
	this.assertEqual(3, result.children.length, 'block squence length wrong');
	this.assert(result.children[0].isUnary, 'wrong expression in block 1');
	this.assert(result.children[1].isAssignment, 'wrong expression in block 2');
	this.assert(result.children[2].isBinary, 'wrong expression in block 3');
},

test10aParseBlockWithoutArgs: function() {
	var src = '[1+ 3.  ]';
	var result = this.parse('expression', src);
	this.assert(result.isBlock , 'no block');
	this.assertEqual(1, result.sequence.children.length, 'block squence wrong');
	this.assert(result.sequence.children[0].isBinary, 'wrong expression in block');
},
test10bParseBlockWithDeclaredVariables: function() {
	var src = '[:a |  |x yz | ]';
	var result = this.parse('expression', src);
	this.assert(result.isBlock , 'no block');
	this.assertEqual(2, result.declaredVars.length, 'declaredVars length wrong');
	this.assertEqual('x', result.declaredVars[0].name, 'first var');
	this.assertEqual('yz', result.declaredVars[1].name, 'second var');
},

test11aParseCommentsAsWithspace: function() {
	var src = ' x+ "this is a comment" yz';
	var result = this.parse('expression', src);
	this.assert(result.isBinary , 'not binary');
	this.assertEqual('x', result.receiver.name);
	this.assertEqual('yz', result.args[0].name);
},

test12aClamatoMethod: function() {
	var src = '- foo\n\
	@selector := \'xyz\'.\n\
	self.';
	var result = this.parse('propertyOrMethod', src);
	this.assert(result.isMethod, 'not a method');
	this.assertEqual('foo', result.methodName, 'wrong name');
	this.assertEqual(2, result.sequence.children.length, 'wrong sequence');
	this.assertIdentity(false, result.isMeta, 'meta method');
	this.assert(result.sequence.children[0].isAssignment, 'wrong sequence 1');
	this.assert(result.sequence.children[1].isVariable, 'wrong sequence 2');
},
test12bBinaryMethod: function() {
	var src = '- ++ arg\n\
	self + arg.';
	var result = this.parse('propertyOrMethod', src);
	this.assert(result.isMethod, 'not a method');
	this.assertEqual('++', result.methodName, 'wrong name');
	this.assertEqual('arg', result.args[0], 'wrong arg name');
},
test12cKeywordMethod: function() {
	var src = '- foo: arg1 bar:arg2\n\
	arg1 baz: arg2.';
	var result = this.parse('propertyOrMethod', src);
	this.assert(result.isMethod, 'not a method');
	this.assertEqual('foo:bar:', result.methodName, 'wrong name');
	this.assertEqual('arg1', result.args[0], 'wrong arg name');
	this.assertEqual('arg2', result.args[1], 'wrong arg name');
},
test13aParseClass: function() {
	var src =
'<Object> \n\
- = other self foo = other.\n\
- and: aBlock\n\
	(self = true)\n\
		ifTrue: aBlock\n\
		ifFalse: [false].'
	var result = this.parse('clamatoClass', src);
	this.assert(result.isClass, 'not a class');
	this.assertEqual('Object', result.className, 'wrong name');
	this.assertEqual(2, result.methods.length, 'wrong number of methods');
},
test13bParseClass: function() {
	var src ='<ClassA:Object>';
	var result = this.parse('clamatoClass', src);
	this.assert(result.isClass, 'not a class');
	this.assertEqual('ClassA', result.className, 'wrong name');
	this.assertEqual('Object', result.superclassName, 'wrong name');
	this.assertEqual(0, result.methods.length, 'wrong number of methods');
},

test14aParseJsPrimitive: function() {
	var body = '{ this.bar() }';
	var src = '- foo ' + body;
	var result = this.parse('propertyOrMethod', src);
	this.assert(result.isPrimitive, 'not a primitve');
	this.assertEqual('foo', result.methodName, 'wrong name');
	this.assertEqual(body, result.primitiveBody, 'wrong primBody');
},
test14bParseJsPrimitive: function() {
	var body = '{ (function() { 1 + 2})() }';
	var src = '- foo ' + body;
	var result = this.parse('propertyOrMethod', src);
	this.assert(result.isPrimitive, 'not a primitve');
	this.assertEqual('foo', result.methodName, 'wrong name');
	this.assertEqual(body, result.primitiveBody, 'wrong primBody');
},
test15aCascades: function() {
	var src = 'x blupf; bla: 3';
	var result = this.parse('expression', src);
	this.assert(result.isCascade, 'no cascade');
	this.assertEqual(2, result.messages.length);
	this.assertEqual('blupf', result.messages[0].messageName);
	this.assertEqual('x', result.messages[0].receiver.name);
	this.assertEqual('bla:', result.messages[1].messageName);
	this.assertEqual(1, result.messages[1].args.length);
	this.assertEqual('x', result.messages[1].receiver.name);
},
test16aPropertyDefInClass: function() {
	var src = '<ClassA>\n- property1 := 1.\n+ property2 := 2.';
	var result = this.parse('clamatoClass', src);
	this.assert(result.isClass, 'no class');
	var props = result.properties;
	this.assertEqual(2, props.length, 'propertyDefs  length not 1');
	this.assert(props[0].assignment.isAssignment, 'not assignment');
	this.assert(!props[0].isMeta, 'not not meta');
	this.assertEqual('property1' , props[0].assignment.variable.name, 'not correct var name');
	this.assert(props[1].isMeta, 'not meta');
},








});
TestCase.subclass('lively.Tests.ClamatoTest.ParseExistingSourcesTest', {
shouldRun: true,
setUp: function() {
	this.parser = ClamatoParser;
},
parse: function(rule, src) {
	var test = this;
	var errorcb = OMetaSupport.handleErrorDebug.wrap(function() {
		var args = $A(arguments), procceed = args.shift();
		proceed(args);
		test.assert(false, 'Couldn\'t parse file');
	});
	return OMetaSupport.matchAllWithGrammar(this.parser, rule, src, errorcb);
},
urls: [
	'http://clamato.net/bin/test.st',
	'http://clamato.net/examples/counter.st',
	'http://clamato.net/lib/web.st',
	'http://clamato.net/lib/browse.st',
	'http://clamato.net/lib/build.st',
	'http://clamato.net/lib/parser.st',
	'http://clamato.net/lib/peg.st',
	'http://clamato.net/lib/workspace.st'
],
testAll: function() {
	this.urls.forEach(function(url) {
		console.log('...... Parsing: ' + url);
		var content = FileDirectory.getContent(url);
		this.parse('clamatoClasses', content);
	}, this)
},



});

TestCase.subclass('lively.Tests.ClamatoTest.JS2StConversionTest', {
shouldRun: true,

errorCb: function() {
	var test = this;
	return function() {
			OMetaSupport.handleErrorDebug.apply(Global,arguments);
			test.assert(false, 'Couldn\'t parse');
	 	}
},
setUp: function() {
	this.jsParser = BSJSParser;
	this.stParser = ClamatoParser;
	this.js2StConverter = JS2StConverter;
},

assertNodeMatches: function(expectedSpec, node) {
	for (name in expectedSpec) {
		var expected = expectedSpec[name];
		if (Object.isFunction(expected)) continue;
		var actual = node[name];
		switch (expected.constructor) {
			case String:
			case Boolean:
			case Number: {
				this.assertEqual(expected, actual, name + ' was expected to be ' + expected);
				continue;
			}
		};
		this.assertNodeMatches(expected, actual);
	}
},

jsAst2StAst: function(jsAst) {
	return OMetaSupport.matchWithGrammar(this.js2StConverter, "trans", jsAst, this.errorCb());
},
parseJs: function(src, optRule) {
	var rule = optRule || 'topLevel';
	return OMetaSupport.matchAllWithGrammar(this.jsParser, rule, src, this.errorCb());
},
convert: function(jsSrcOrAst, jsParseRule) {
	jsAst = stAst = null;
	jsAst = Object.isArray(jsSrcOrAst) ? jsSrcOrAst : this.parseJs(jsSrcOrAst, jsParseRule);
	stAst = this.jsAst2StAst(jsAst);
	return stAst;
},
test01aConvertTempVarGet: function() {
	var src = 'tempVar';
	var result = this.convert(src, 'expr');
	var expected = {
		isVariable: true,
		name: 'tempVar'
	};
	this.assertNodeMatches(expected, result);
},
test01bConvertInstVarGet: function() {
	var src = 'this.instVar';
	var result = this.convert(src, 'expr');
	var expected = {
		isVariable: true,
		isInstance: true,
		name: '@instVar'
	};
	this.assertNodeMatches(expected, result);
},
test01cPropOfOtherObjIsConvertedIntoMethodSend: function() {
	var src = 'x.instVar';
	var result = this.convert(src, 'expr');
	var expected = {
		isMessage: true,
		isKeyword: true,
		messageName: 'getVar:',
		receiver: {name: 'x'},
		args: [{value: 'instVar'}],
	};
	this.assertNodeMatches(expected, result);
},

test02aConvertMutliArgExpression: function() {
	var src = 'foo.bar()';
	var result = this.convert(src, 'expr');
	var expected = {
		isKeyword: true,
		messageName: 'bar:',
		receiver: {isVariable: true, name: 'foo'},
		args: []
	};
	this.assertNodeMatches(expected, result);
},
test02bConvertBinaryExpression: function() {
	var src = 'a + 4';
	var result = this.convert(src, 'expr');
	var expected = {
		isBinary: true,
		messageName: '+',
		receiver: {isVariable: true, name: 'a'},
		args: [{isLiteral: true, value: 4}]
	};
	this.assertNodeMatches(expected, result);
},

test02cConvertMutliArgExpression: function() {
	var src = 'foo.bar(1, baz)';
	var result = this.convert(src, 'expr');
	var expected = {
		isKeyword: true,
		messageName: 'bar:',
		receiver: {isVariable: true, name: 'foo'},
		args: [{isLiteral: true}, {isVariable: true}]
	};
	this.assertNodeMatches(expected, result);
},
test03aParseSimpleMethod: function() {
	// {foo: function() {}}
	var ast = ["binding", "foo", ["func", [], ["begin"]]];
	var result = this.convert(ast);
	var expected = {
		isMethod: true,
		methodName: 'foo',
		args: [],
		sequence: {children: []}
	};
	this.assertNodeMatches(expected, result);
},
test03bParseSimpleMethodWithArgs: function() {
	// {foo: function(a, b) {}}
	var ast = ["binding", "foo", ["func", ["a", "b"], ["begin"]]];
	var result = this.convert(ast);
	var expected = {
		isMethod: true,
		methodName: 'foo',
		args: ['a', 'b'],
		sequence: {children: []}
	};
	this.assertNodeMatches(expected, result);
},
test04aParseFunctionWithStatements: function() {
	var src = 'function() { 3 + 4; 4 + 7 }';
	var result = this.convert(src, 'expr');
	var expected = {
		isBlock: true,
		sequence: {children: [
			{messageName: '+', receiver: {value: 3}, args: [{value: 4}]},
			{isMessage: true}]}
	};
	this.assertNodeMatches(expected, result);
},



testXXaConvertClassWithMethod: function() {
	var src = 'Object.subclass(\'Foo\')';
	var result = this.convert(src, 'expr');
	var expected = {isClass: true, className: 'Foo'};
	this.assertNodeMatches(expected, result);
},

testXXbConvertClassWithMethod: function() {
	var src = 'Object.subclass(\'Foo\', {\n x: function(a) { 1 },\ny: function() {}})';
	var result = this.convert(src, 'expr');
	var expected = {
		isClass: true,
		className: 'Foo',
		methods: [{methodName: 'x', args: ['a']}, {methodName: 'y'}]};
	this.assertNodeMatches(expected, result);
},
testXXcConvertClassWithPropertiesAndMethod: function() {
	var src = 'Object.subclass(\'Foo\', {\n x: 2,\ny: \'foo\', z: function() { 1 }})';
	 result = this.convert(src, 'expr');
	var expected = {
		isClass: true,
		className: 'Foo',
		methods: [{methodName: 'z', args: []}],
		properties: [{variable: {name: 'x'}, value: {value: 2}}, {isAssignment: true}]
	};
	this.assertNodeMatches(expected, result);
},;
	this.assertNodeMatches(expected, result);
},{
	var src = 'Object.subclass(\'Foo\', {\n x: 1,\ny: \'foo\', z: function() { 1 }})';
	var result = this.convert(src, 'expr');
	var expected = {
		isClass: true,
		className: 'Foo',
		methods: [{methodName: 'z', args: []}],
		properties: [{assignment: {variable: {}}]
		//properties: [{assignment: {variable: {name: 'x'}, value: 2}}]
	};
	this.assertNodeMatches(expected, result);
},




});


});