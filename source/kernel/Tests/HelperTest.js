module('Test.HelperTest').requires('lively.Helper').toRun(function() {

TestCase.subclass('Tests.HelperTest.XMLConverterTest', {

	toXML: function(string) {
		return new DOMParser().parseFromString(string, "text/xml").documentElement;
	},

	setUp: function($super) {
		$super();
		this.sut = new XMLConverter();
	},

	test01XMLNodeToJSON: function() {
		var xml = this.toXML('<test/>');
		var result = this.sut.convertToJSON(xml);
		this.assert(result.tagName, 'test');
		this.assertEqual(Properties.all(result).length, 1);
	},

	test02XMLNodeWithAttributesToJSON: function() {
		var xml = this.toXML('<test id="23" x="foobar" />');
		var result = this.sut.convertToJSON(xml);
		this.assertEqual(result.id, '23');
		this.assertEqual(result.x, 'foobar');
	},

	test03XMLNodeWithAttributesAndChildrenToJSON: function() {
		var xml = this.toXML('<test x="foo"><test2/><test3 abc="def"/></test>');
		var result = this.sut.convertToJSON(xml);
		this.assertEqual(result.children.length, 2);
		this.assertEqual(result.children[0].tagName, 'test2');
		this.assertEqual(result.children[1].abc, 'def');
	},

	test03CDATAAndText: function() {
		var xml = this.toXML('<test><![CDATA[foobar\]\]\> baz</test>');
		var result = this.sut.convertToJSON(xml);
		this.assertEqual(result.children[0].tagName, 'cdataSection');
		this.assertEqual(result.children[0].data, 'foobar');
		this.assertEqual(result.children[1].tagName, 'textNode');
		this.assertEqual(result.children[1].data, ' baz');
	},

	test04JStoXML: function() {
		var jsObj = {tagName: 'script', type: 'foo', 'xlink:href': 'foo.js'};
		var nsMapping = {xlink: Namespace.XLINK};
		var result = this.sut.convertToXML(jsObj, nsMapping, Global.document);
		this.assertEqual(result.tagName, 'script');
		this.assertEqual(result.getAttribute('type'), 'foo');
		this.assertEqual(result.getAttributeNS(Namespace.XLINK, 'href'), 'foo.js');
	},

	test05JStoXMLWithChildNodesAndTextContent: function() {
		var jsObj = {
			tagName: 'foo',
			children: [{
				tagName: 'bar',
				children: [{
					tagName: 'textNode',
					data: 'Hello '
				}, {
					tagName: 'cdataSection',
					data: 'World'
				}]
			}]
		};
		var nsMapping = {};
		var result = this.sut.convertToXML(jsObj, nsMapping, Global.document);
		this.assertEqual(result.tagName, 'foo');
		this.assertEqual(result.childNodes.length, 1);
		this.assertEqual(result.childNodes[0].childNodes.length, 2);
		this.assertEqual(result.childNodes[0].textContent, 'Hello World');
	},

});

}); // end of module