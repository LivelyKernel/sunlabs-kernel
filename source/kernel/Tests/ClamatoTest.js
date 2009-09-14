module('lively.Tests.ClamatoTest').requires('lively.TestFramework', 'lively.Ometa', 'lively.ClamatoParser').toRun(function() {

TestCase.subclass('lively.Tests.ClamatoTest.ClamatoParserTest', {
setUp: function() {
	this.parser = ClamatoParser;
},
parse: function(rule, src) {
	return OMetaSupport.matchAllWithGrammar(this.parser, rule, src, null /*error callback*/);
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











});

});