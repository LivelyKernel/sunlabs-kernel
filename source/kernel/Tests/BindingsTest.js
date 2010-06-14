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
		connect(obj1, 'value', obj2, 'value', {converter: function(val) { return val + 1 }});
		obj1.value = 2;
		this.assertEqual(3, obj2.value);
	},
	
	test10ErrorWhenConverterReferencesEnvironment: function() {
		var obj1 = {};
		var obj2 = {};
		var externalVal = 42;
		connect(obj1, 'value', obj2, 'value', {converter: function(val) { return val + externalVal }});
		obj1.value = 2
		this.assertEqual(2, obj1.value);
		this.assertEqual(undefined, obj2.value);
//		try { obj1.value = 2 } catch(e) { return }
//		this.assert(false, 'no error when using closue covnerter')
	},

	test11NewConnectionReplacesOld: function() {
		var obj1 = {};
		var obj2 = {};
		connect(obj1, 'value', obj2, 'value', {converter: function(val) { return val + 1}});
		connect(obj1, 'value', obj2, 'value', {converter: function(val) { return val + 2}});
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
		c1 = connect(obj1, 'value', obj2, 'value', {converter: function(v) { return v + 1 }});
		c2 = connect(obj1, 'value', obj2, 'value', {converter: function(v) { return v + 2 }});
		this.assert(c1.isSimilarConnection(c2), '2');
		// ----------------------
		c1 = connect(obj1, 'value1', obj2, 'value'); c2 = connect(obj1, 'value', obj2, 'value');
		this.assert(!c1.isSimilarConnection(c2), '3');
		c1 = connect(obj1, 'value', obj2, 'value'); c2 = connect(obj1, 'value', obj3, 'value');
		this.assert(!c1.isSimilarConnection(c2), '4');
	},

	test14EinwegConnection: function () {
		var obj1 = {};
		var obj2 = {};
		connect(obj1, 'value', obj2, 'value', {converter: function(val) { return val + 1 }, removeAfterUpdate: true})
		obj1.value = 2
		this.assertEqual(3, obj2.value);
		this.assert(!obj1.attributeConnections || obj1.attributeConnections.length == 0, 'connection not removed!');
	},

	test15ProvideOldValueInConverters: function () {
		var obj1 = {value: 10};
		var obj2 = {delta: null};
		connect(obj1, 'value', obj2, 'delta', {converter: function(newValue, oldValue) {
			return newValue - oldValue
		}})
		obj1.value = 15;
		this.assertEqual(obj2.delta, 5)
	},
	
	test16Updater: function () {
		var obj1 = {x: null};
		var obj2 = {x: null};

		var c = connect(obj1, 'x', obj2, 'x',
			{updater: function($proceed, newValue, oldValue) { $proceed(newValue) }});
		obj1.x = 15;
		this.assertEqual(obj2.x, 15, 'proceed called');
		c.disconnect();

		c = connect(obj1, 'x', obj2, 'x',
			{updater: function($proceed, newValue, oldValue) { }});
		obj1.x = 3;
		this.assertEqual(obj2.x, 15, 'proceed not called');
		c.disconnect();
	},

	test17Updater: function () {
		var obj1 = {x: 42};
		var obj2 = {m: function(a, b) { obj2.a = a; obj2.b = b }};
		var c = connect(obj1, 'x', obj2, 'm',
			{updater: function($proceed, newValue, oldValue) { $proceed(newValue, oldValue) }});
		obj1.x = 15;
		this.assertEqual(obj2.a, 15);
		this.assertEqual(obj2.b, 42);
	},

	test18UpdaterAndConverter: function () {
		var obj1 = {x: null};
		var obj2 = {x: null};
		var c = connect(obj1, 'x', obj2, 'x',
			{updater: function($proceed, newValue, oldValue) { $proceed(newValue) },
			converter: function(v) { return v + 1 }});
		obj1.x = 15;
		this.assertEqual(obj2.x, 16);
	},
		
	test19NoUpdaterNoConverter: function () {
		var obj1 = {x: null};
		var obj2 = {x: null};
		var c = connect(obj1, 'x', obj2, 'x',
			{updater: function($proceed, newValue, oldValue) { this.getSourceObj().updaterWasCalled = true },
			converter: function(v) { this.getSourceObj().converterWasCalled = true; return v }});
		obj1.x = 3;
		this.assert(obj1.updaterWasCalled, 'no updater called');
		this.assert(!obj1.converterWasCalled, 'converter called');
	},
		
	test20RemoveAfterUpdateOnlyIfUpdaterProceeds: function() {
			// no proceed, no remove
		var obj1 = {};
		var obj2 = {};
		var c = connect(obj1, 'x', obj2, 'x',
			{updater: function(procced, val) { }, removeAfterUpdate: true});
		obj1.x = 2
		this.assertEqual(null, obj2.x, 'a');
		this.assertEqual(1, obj1.attributeConnections.length, 'connection removed!');
		c.disconnect();

		// proceed triggered then remove
		var c = connect(obj1, 'x', obj2, 'y',
			{updater: function($upd, val) { debugger; $upd(val) }, removeAfterUpdate: true});
		obj1.x = 2
		this.assertEqual(2, obj2.y, 'b');
		this.assert(!obj1.attributeConnections || obj1.attributeConnections.length == 0,
			'connection not removed!');
	},

	test21DualUpdate: function() {
			// no proceed, no remove
			var obj1 = {};
			var obj2 = {};
			var obj3 = {};
			var c1 = connect(obj1, 'x', obj2, 'x');
			var c2 = connect(obj1, 'x', obj3, 'x');
			obj1.x = 3;
			
			this.assertEqual(obj2.x, 3, "obj2 update broken");
			this.assertEqual(obj3.x, 3, "obj3 update broken");
			
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
		connect(textMorph1, 'textString', textMorph2, 'updateTextString', {converter: function(v) { return v + 'foo' }});
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
	
	test03UpdaterIsSerialzed: function() {
		var textMorph1 = new TextMorph(new Rectangle(20,400, 100, 30), 'abc');
		var textMorph2 = new TextMorph(new Rectangle(20,400, 100, 30), 'xyz');
		this.worldMorph.addMorph(textMorph1);
		this.worldMorph.addMorph(textMorph2);
		connect(textMorph1, 'textString', textMorph2, 'updateTextString',
			{updater: function(proceed, newV, oldV) { proceed(oldV + newV) }});
		textMorph1.updateTextString('foo');
		this.assertEqual('abcfoo', textMorph2.textString, 'updater not working');
		var doc = this.exportMorph(this.worldMorph) // WorldMorph is test specific
		var newWorld = new Importer().loadWorldContents(doc.ownerDocument);
		var newTextMorph1 = newWorld.submorphs[0];
		var newTextMorph2 = newWorld.submorphs[1];
		this.assertEqual(newTextMorph1.textString, 'foo', 'morph serialization problem');
		newTextMorph1.updateTextString('bar');
		this.assertEqual('foobar', newTextMorph2.textString, 'connect not working after deserialization');
	},


});
Object.subclass('Tests.BindingsTest.BindingsProfiler', {

connectCount: 20000,

startAndShow: function() {
	lively.bindings.connect(this, 'result', WorldMorph.current(), 'addTextWindow');
	this.start()
},

start: function() {
	var runPrefix = 'run';
	var self = this;
	var methods = Functions.all(this).select(function(name) { return name.startsWith(runPrefix) });
	var result = 'Bindings profiling ' + new Date() + '\n' + navigator.userAgent;
	var progressBar = WorldMorph.current().addProgressBar();
	methods.forEachShowingProgress(progressBar, function(name) {
		var time = self[name]();
		name = name.substring(runPrefix.length, name.length);
		result += '\n' + name + ':\t' + time;
	},
	function(name) { return 'running ' + name },
	function(name) { progressBar.remove(); self.result = result });
	return this
},

connectAndRun: function(target, targetProp, options) {
	var source = {x: null};
	var sourceProp = 'x';
	lively.bindings.connect(source, sourceProp, target, targetProp, options);

	var now = new Date();
	for (var i = 0; i < this.connectCount; i++) source.x = i
	return new Date() - now;
},

runSimpleConnect: function() { return this.connectAndRun({y: null}, 'y') },
runMethodConnect: function() { return this.connectAndRun({m: function(v) { this.x = v }}, 'm') },

runConverterConnectAttribute: function() {
	return this.connectAndRun({m: function(v) { this.x = v }}, 'm',
		{converter: function(v) { return v + 1 }});
},

runConverterConnectMethod: function() {
	return this.connectAndRun({y: null}, 'y', 
		{converter: function(v) { return v + 1 }});
},

runUpdaterConnectAttribute: function() {
	return this.connectAndRun({y: null}, 'y',
		{updater: function(upd, newV, oldV) { upd.call(this, newV, oldV) }});
},

runUpdaterConnectMethod: function() {
	return this.connectAndRun({m: function(v1, v2) { this.x = v1++ }}, 'm',
		{updater: function(upd, newV, oldV) { upd.call(this, newV + oldV, oldV) }});
},

runTextMorphConnect: function() {
	var source = new TextMorph(new Rectangle(0,0, 100, 100), '');
	var sourceProp = 'textString';
	var target = new TextMorph(new Rectangle(0,0, 100, 100), '');
	var targetProp = 'setTextString'
	lively.bindings.connect(source, sourceProp, target, targetProp);

	var now = new Date();
	for (var i = 0; i < (this.connectCount / 10); i++) source.textString = i.toString()
	return new Date() - now;
},

runCreateConnection: function() {
	var now = new Date()
	var source = {x: null}, target = {y: null};
	for (var i = 0; i < this.connectCount; i++)
		lively.bindings.connect(source, 'x', target, 'y');
	return new Date() - now
},
runSimpleMethodCall: function() {
	var now = new Date()
	var source = {m: function(v) { source.x = v; target.m(v) }}, target = {m: function(v) { target.x = v }};
	for (var i = 0; i < this.connectCount*10; i++)
		source.m(i);
	return new Date() - now
},

});

}); // end of module