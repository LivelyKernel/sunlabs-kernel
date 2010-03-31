module('Tests.WikiWidgetTest').requires('lively.TestFramework', 'lively.WikiWidget').toRun(function(thisModule) {

TestCase.subclass('Tests.WikiWidgetTest.WikiTextTranslationTest', {

assertMatchesSpec: function(spec, realObject) {
	for (name in spec) {
		var expected = spec[name];
		if (Object.isFunction(expected)) continue;
		var actual = realObject[name];
		if (!expected && !actual) return;
		switch (expected.constructor) {
			case String:
			case Boolean:
			case Number: {
				this.assertEqual(expected, actual, name + ' was expected to be ' + expected);
				continue;
			}
		};
		this.assertMatchesSpec(expected, actual);
	}
},

	translate: function(src, rule) {
		if (!rule) rule = 'wikiTextDescription';
		return OMetaSupport.matchAllWithGrammar(WikiParser, rule, src);
	},

test01aTranslateParagraph: function() {
	var text = 'foo';
 	var result = this.translate(text);
 	var expected = [{textString: text}];
 	this.assertMatchesSpec(expected, result);
},
test01bTranslateParagraph: function() {
 	var text = 'foo\nbar';
 	var result = this.translate(text);
 	var expected = [{textString: text}];
 	this.assertMatchesSpec(expected, result);
},
test01cTranslateParagraph: function() {
 	var text = 'foo\n\nbar';
 	var result = this.translate(text);
 	var expected = [{textString: 'foo'}, {textString: 'bar'}];
 	this.assertMatchesSpec(expected, result);
},
test02aHeading: function() {
 	var text = '==Heading==';
 	var result = this.translate(text);
 	var expected = [{textString: 'Heading'}];
 	this.assertMatchesSpec(expected, result);
},

test02bHeadingWothParagraph: function() {
 	var text = '==Heading==\nfoobar\nbaz';
 	var result = this.translate(text);
 	var expected = [{textString: 'Heading'}, {textString: 'foobar\nbaz'}];
 	this.assertMatchesSpec(expected, result);
},
test03aBoldText: function() {
 	var text = "foo '''bar''' baz";
 	var result = this.translate(text);
 	var expected = [{textString: 'foo bar baz'}];
 	this.assertMatchesSpec(expected, result);
	this.assert(result.first().getRichText().emphasisAt(4).style, 'bold');
},
test04aUnorderedList: function() {
 	var text = "foo\n*bar\n*baz\n*boo";
 	var result = this.translate(text);
 	var expected = [{textString: 'foo\n\t• bar\n\t• baz\n\t• boo\n'}];
 	this.assertMatchesSpec(expected, result);
},
test05aSimpleLink: function() {
 	var text = "fooo [myPage.xhtml]";
 	var result = this.translate(text);
 	var expected = [{textString: 'fooo myPage.xhtml'}];
 	this.assertMatchesSpec(expected, result);
	this.assert(result.first().getRichText().emphasisAt(5).link, 'myPage.xhtml');
},
test05bLinkName: function() {
 	var text = "fooo [myPage.xhtml somePage]";
 	var result = this.translate(text);
 	var expected = [{textString: 'fooo somePage'}];
 	this.assertMatchesSpec(expected, result);
	this.assert(result.first().getRichText().emphasisAt(5).link, 'myPage.xhtml');
},
test06DontRecognizeListInText: function() {
 	var text = "Jens *Draft* foo bar.";
 	result = this.translate(text);
 	var expected = [{textString: 'Jens 	• Draft<ERROR>*Draft* foo bar.</ERROR>'}];
 	this.assertMatchesSpec(expected, result);
},


});

});