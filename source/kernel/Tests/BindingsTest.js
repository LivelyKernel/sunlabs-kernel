module('Tests.BindingsTest').requires('lively.TestFramework', 'Tests.SerializationTests', 'lively.bindings').toRun(function() {

TestCase.subclass('Tests.BindingsTest.ConnectionTest', {

	test01SimpleConnection: function() {
		var obj1 = {x: 4};
		var obj2 = {xchanged: function(newVal) { obj2.value = newVal }};
		connect(obj1, 'x', obj2, 'xchanged');
		obj1.x = 2;
		this.assertEqual(obj2.value, 2, 'connection not working');
	},

	test02MultipleConnections: function() {
		var obj1 = {x: 4};
		var obj2 = {xchanged: function(newVal) { obj2.value = newVal }};
		var obj3 = {xchangedAgain: function(newVal) { obj3.value = newVal }};
		connect(obj1, 'x', obj2, 'xchanged');
		connect(obj1, 'x', obj3, 'xchangedAgain');
		obj1.x = 2;
		this.assertEqual(obj2.value, 2, 'connection not working obj2');
		this.assertEqual(obj3.value, 2, 'connection not working obj3');
	},

	test03RemoveConnections: function() {
		var obj1 = {x: 4};
		var obj2 = {xchanged: function(newVal) { obj2.value = newVal }};
		var obj3 = {xchangedAgain: function(newVal) { obj3.value = newVal }};
		connect(obj1, 'x', obj2, 'xchanged');
		connect(obj1, 'x', obj3, 'xchangedAgain');
		disconnect(obj1, 'x', obj2, 'xchanged');
		obj1.x = 2;
		this.assertEqual(obj2.value, null, 'obj2 not disconnected');
		this.assertEqual(obj3.value, 2, 'obj3 wrongly disconnected');
		disconnect(obj1, 'x', obj3, 'xchangedAgain');
		obj1.x = 3;
		this.assertEqual(obj3.value, 2, 'obj3 not disconnected');
		this.assert(!obj1.__lookupSetter__('x'), 'disconnect cleanup failure');
		this.assertEqual(obj1.x, 3, 'disconnect cleanup failure 2');
		this.assert(!obj1['$$x'], 'disconnect cleanup failure 3');
	},

	test04BidirectionalConnect: function() {
		var obj1 = {update: function(newVal) { obj1.value = newVal }};
		var obj2 = {update: function(newVal) { obj2.value = newVal }};

		connect(obj1, 'value', obj2, 'update');
		connect(obj2, 'value', obj1, 'update');

		obj1.value = 3;
		this.assertEqual(3, obj1.value, 'obj1 not updated');
		this.assertEqual(3, obj2.value, 'obj2 not updated');
	},

	test05AttributeAttributeConnections: function() {
		var obj1 = {value: 0};
		var obj2 = {value: 1};
		connect(obj1, 'value', obj2, 'value');
		obj1.value = 3;
		this.assertEqual(3, obj2.value, 'obj2 not updated');
	},

	test06AttributeAttributeConnectionsWhenNothingDefined: function() {
		var obj1 = {};
		var obj2 = {};
		connect(obj1, 'value', obj2, 'value');
		obj1.value = 3;
		this.assertEqual(3, obj2.value, 'obj2 not updated');
	},

	test07ConnectWhenAlreadyConnected: function() {
		var obj1 = {};
		var obj2 = {};
		connect(obj1, 'value', obj2, 'value');
		connect(obj1, 'value', obj2, 'value');
		this.assertEqual(1, obj1.attributeConnections.length, 'multiple connections added');
		obj1.value = 3;
		this.assertEqual(3, obj2.value, 'obj2 not updated');
	},

	test08ManuallyUpdateConnection: function() {
		var obj1 = {};
		var obj2 = {};
		connect(obj1, 'value1', obj2, 'value2');
		updateAttributeConnection(obj1, 'value1', 3);
		this.assertEqual(3, obj2.value2, 'obj2 not updated');
	},
	
	test09Converter: function() {
		var obj1 = {};
		var obj2 = {};
		connect(obj1, 'value', obj2, 'value', function(val) { return val + 1});
		obj1.value = 2;
		this.assertEqual(3, obj2.value);
	},
	
	test10ErrorWhenConverterReferencesEnvironment: function() {
		var obj1 = {};
		var obj2 = {};
		var externalVal = 42;
		connect(obj1, 'value', obj2, 'value', function(val) { return val + externalVal });
		obj1.value = 2
		this.assertEqual(2, obj1.value);
		this.assertEqual(undefined, obj2.value);
//		try { obj1.value = 2 } catch(e) { return }
//		this.assert(false, 'no error when using closue covnerter')
	},

	test11NewConnectionReplacesOld: function() {
		var obj1 = {};
		var obj2 = {};
		connect(obj1, 'value', obj2, 'value', function(val) { return val + 1});
		connect(obj1, 'value', obj2, 'value', function(val) { return val + 2});
		obj1.value = 2
		this.assertEqual(4, obj2.value);
		this.assertEqual(1, obj1.attributeConnections.length);
	},

	test12DisconnectDoesNotRemoveAttribute: function () {
		var obj1 = {};
		var obj2 = {};
		var c = connect(obj1, 'value', obj2, 'value');
		obj1.value = 2;
		c.disconnect();
		this.assertEqual(2, obj1.value);
		this.assertEqual(2, obj2.value);
	},
test13IsSimilarConnection: function () {
		var c1, c2, obj1 = {}, obj2 = {}, obj3 = {};
		c1 = connect(obj1, 'value', obj2, 'value'); c2 = connect(obj1, 'value', obj2, 'value');
		this.assert(c1.isSimilarConnection(c2), '1');
		c1 = connect(obj1, 'value', obj2, 'value', function(v) { return v + 1} );
		c2 = connect(obj1, 'value', obj2, 'value', function(v) { return v + 2});
		this.assert(c1.isSimilarConnection(c2), '2');
		// ----------------------
		c1 = connect(obj1, 'value1', obj2, 'value'); c2 = connect(obj1, 'value', obj2, 'value');
		this.assert(!c1.isSimilarConnection(c2), '3');
		c1 = connect(obj1, 'value', obj2, 'value'); c2 = connect(obj1, 'value', obj3, 'value');
		this.assert(!c1.isSimilarConnection(c2), '4');
	},


});

Tests.SerializationTests.SerializationBaseTestCase.subclass('Tests.BindingsTest.ConnectionSerializationTest', {

	test01HelperAttributeIsNotSerialized: function() {
		var textMorph1 = new TextMorph(new Rectangle(20,400, 100, 30), 'abc');
		var textMorph2 = new TextMorph(new Rectangle(20,400, 100, 30), 'abc');
		this.worldMorph.addMorph(textMorph1);
		this.worldMorph.addMorph(textMorph2);
		connect(textMorph1, 'textString', textMorph2, 'updateTextString');
		textMorph1.updateTextString('foo');
		this.assertEqual(textMorph1.textString, textMorph2.textString, 'connect not working');
		var doc = this.exportMorph(this.worldMorph) // WorldMorph is test specific
		var newWorld = new Importer().loadWorldContents(doc.ownerDocument);
		var newTextMorph1 = newWorld.submorphs[0];
		var newTextMorph2 = newWorld.submorphs[1];

		this.assertEqual(newTextMorph1.textString, 'foo', 'morph serialization problem');
		newTextMorph1.updateTextString('bar');
		this.assertEqual(newTextMorph1.textString, newTextMorph2.textString, 'connect not working after deserialization');
		// ensure that serialization has cleaned up
		var c = newTextMorph1.attributeConnections[0];
		var setter1 = c.__lookupSetter__('sourceObj');
		var setter2 = c.__lookupSetter__('targetObj');
		this.assert(!setter1, 'serialization cleanup failure 1');
		this.assert(!setter2, 'serialization cleanup failure 2');
	},
	
	test02ConverterIsSerialzed: function() {
		var textMorph1 = new TextMorph(new Rectangle(20,400, 100, 30), 'abc');
		var textMorph2 = new TextMorph(new Rectangle(20,400, 100, 30), 'abc');
		this.worldMorph.addMorph(textMorph1);
		this.worldMorph.addMorph(textMorph2);
		connect(textMorph1, 'textString', textMorph2, 'updateTextString', function(v) { return v + 'foo'});
		textMorph1.updateTextString('foo');
		this.assertEqual('foofoo', textMorph2.textString, 'connect not working');
		var doc = this.exportMorph(this.worldMorph) // WorldMorph is test specific
		var newWorld = new Importer().loadWorldContents(doc.ownerDocument);
		var newTextMorph1 = newWorld.submorphs[0];
		var newTextMorph2 = newWorld.submorphs[1];
		this.assertEqual(newTextMorph1.textString, 'foo', 'morph serialization problem');
		newTextMorph1.updateTextString('bar');
		this.assertEqual('barfoo', newTextMorph2.textString, 'connect not working after deserialization');
	},

});

}); // end of module