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
	this.assertEqual(null, result.arguments);
},
test02ParseBinaryMessageSend: function() {
	var src = 'x ++ 1';
	var result = this.parse('expression', src);
xx=result;
	this.assert(result.isMessage, 'not a message node');
	this.assert(result.isBinary , 'not binary');
	this.assertEqual('x', result.receiver.name, 'wrong receiver name');
	this.assertEqual('++', result.messageName, 'wrong message name');
	this.assertEqual(1, result.arguments.length);
	this.assert(1, result.arguments.length);
	this.assert(result.arguments.first().isLiteral);
	this.assertEqual(1, result.arguments.first().value);
},

});

});