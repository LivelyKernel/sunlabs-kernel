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
test04bChainedBinaryMessages: function() {
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





});

});