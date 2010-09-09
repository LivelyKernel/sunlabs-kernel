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
			{updater: function($upd, val) { $upd(val) }, removeAfterUpdate: true});
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
	test22ConnectTwoMethods: function() {
		var obj1 = {m1: function() { return 3 }};
		var obj2 = {m2: function(val) { return val + 2 }};
		connect(obj1, 'm1', obj2, 'm2');
		var result = obj1.m1();
		this.assertEqual(5, result, 'method connection not working');
	},
	test23ConnectTwoMethodsWithUpdater: function() {
		var obj1 = {m1: function() { return 3 }};
		var obj2 = {m2: function(val) { return val + 2 }};
		connect(obj1, 'm1', obj2, 'm2', {
			updater: function($proceed, val) {
				if (val != 3)
					throw new Error('updater didnt get the correct value');
				return $proceed(val)
			}});
		var result = obj1.m1();
		this.assertEqual(5, result, 'method connection not working');
	},
	test24ConnectTwoMethodsTwice: function() {
		var obj1 = {m1: function() { return 3 }};
		var obj2 = {m2: function(val) { return val + 2 }};
		connect(obj1, 'm1', obj2, 'm2');
		connect(obj1, 'm1', obj2, 'm2');
		this.assert(Object.isFunction(obj1.m1), 'wrapping failed');
		var result = obj1.m1();
		this.assertEqual(5, result, 'method connection not working');
	},
	test25DoubleConnectTwoMethods: function() {
		var obj1 = {m1: function() { return 3 }};
		var obj2 = {m2: function(val) { return val + 2 }};
		var obj3 = {m3: function(val) { return val * 2 }};

		var m1 = obj1.m1;

		var con1 = connect(obj1, 'm1', obj2, 'm2');
		var con2 = connect(obj1, 'm1', obj3, 'm3');

		var result;
		result = obj1.m1();
		this.assertEqual(10, result, 'double method connection not working');

		con1.disconnect();
		result = obj1.m1();
		this.assertEqual(6, result, 'double method connection not working');

		con2.disconnect();
		result = obj1.m1();
		this.assertEqual(3, result, 'double method connection not working');

		this.assertIdentity(m1, obj1.m1, 'original method was not restored after method connection');
	},
	test26TransitiveMethodConnect: function() {
		var obj1 = {m1: function() { return 3 }};
		var obj2 = {m2: function(val) { return val + 2 }};
		var obj3 = {m3: function(val) { return val * 2 }};

		var con1 = connect(obj1, 'm1', obj2, 'm2');
		var con2 = connect(obj2, 'm2', obj3, 'm3');

		var result = obj1.m1();
		this.assertEqual(10, result, 'double method connection not working');

		con1.disconnect();
		this.assertEqual(3, obj1.m1(), 'one method connection not working after disconnect of con1');
		this.assertEqual(6, obj2.m2(1), 'remaining connection not working');

		con2.disconnect();
		this.assertEqual(3, obj2.m2(1), 'after con2 disconnect m2');
		this.assertEqual(2, obj3.m3(1), 'after con2 disconnect m3');
	},
	test27ConnectMethodToArribute: function() {
		var obj1 = {m1: function() { return 3 }};
		var obj2 = {x: null};

		connect(obj1, 'm1', obj2, 'x');

		var result = obj1.m1();
		this.assertEqual(3, result, 'connected attribute not set correctly');
	},






});

Tests.SerializationTests.SerializationBaseTestCase.subclass('Tests.BindingsTest.ConnectionSerializationTest', {

	setUp: function($super) {
		$super();
		// FIXME
		this.oldImporterCanvasMethod = Importer.prototype.canvas;
		Importer.prototype.canvas = function() { return this.canvas }.bind(this)
	},
	
	tearDown: function($super) {
		$super();
		Importer.prototype.canvas = this.oldImporterCanvasMethod
	},
	
	createAndAddMorphs: function() {
		this.textMorph1 = new TextMorph(new Rectangle(20,400, 100, 30), 'abc');
		this.textMorph2 = new TextMorph(new Rectangle(20,400, 100, 30), 'xyz');
		this.worldMorph.addMorph(this.textMorph1);
		this.worldMorph.addMorph(this.textMorph2);
	},

	doSave: function() {
		var doc = this.exportMorph(this.worldMorph) // WorldMorph is test specific
		var newWorld = new Importer().loadWorldContents(doc.ownerDocument);
		this.newTextMorph1 = newWorld.submorphs[0];
		this.newTextMorph2 = newWorld.submorphs[1];
	},

	test01HelperAttributeIsNotSerialized: function() {
		this.createAndAddMorphs();

		connect(this.textMorph1, 'textString', this.textMorph2, 'updateTextString');
		this.textMorph1.updateTextString('foo');
		this.assertEqual(this.textMorph1.textString, this.textMorph2.textString, 'connect not working');

		this.doSave();

		this.assertEqual(this.newTextMorph1.textString, 'foo', 'morph serialization problem');
		this.newTextMorph1.updateTextString('bar');
		this.assertEqual(this.newTextMorph1.textString, this.newTextMorph2.textString, 'connect not working after deserialization');
		// ensure that serialization has cleaned up
		var c = this.newTextMorph1.attributeConnections[0];
		var setter1 = c.__lookupSetter__('sourceObj');
		var setter2 = c.__lookupSetter__('targetObj');
		this.assert(!setter1, 'serialization cleanup failure 1');
		this.assert(!setter2, 'serialization cleanup failure 2');
	},
	
	test02ConverterIsSerialzed: function() {
		this.createAndAddMorphs();

		connect(this.textMorph1, 'textString', this.textMorph2, 'updateTextString', {converter: function(v) { return v + 'foo' }});
		this.textMorph1.updateTextString('foo');
		this.assertEqual('foofoo', this.textMorph2.textString, 'connect not working');

		this.doSave();

		this.assertEqual(this.newTextMorph1.textString, 'foo', 'morph serialization problem');
		this.newTextMorph1.updateTextString('bar');
		this.assertEqual('barfoo', this.newTextMorph2.textString, 'connect not working after deserialization');
	},
	
	test03UpdaterIsSerialzed: function() {
		this.createAndAddMorphs();

		connect(this.textMorph1, 'textString', this.textMorph2, 'updateTextString',
			{updater: function(proceed, newV, oldV) { proceed(oldV + newV) }});
		this.textMorph1.updateTextString('foo');
		this.assertEqual('abcfoo', this.textMorph2.textString, 'updater not working');

		this.doSave();

		this.assertEqual(this.newTextMorph1.textString, 'foo', 'morph serialization problem');
		this.newTextMorph1.updateTextString('bar');
		this.assertEqual('foobar', this.newTextMorph2.textString, 'connect not working after deserialization');
	},
test04DOMNodeIsSerialized: function() {
		this.createAndAddMorphs();
		var nodeBefore = this.dom.importNode(XHTMLNS.create('input'));
		this.dom.documentElement.appendChild(nodeBefore);
		connect(this.textMorph1, 'textString', nodeBefore, 'value')
		this.textMorph1.setTextString('test');
		this.assertEqual('test', nodeBefore.value, 'node connection not working');
		this.doSave();
		this.assert(nodeBefore.getAttribute('id'), 'node hasnt gotten any id assigned');
		var nodeAfter = this.dom.getElementsByTagName('input')[0];
		this.assert(nodeAfter, 'cannot find node in DOM')
		this.newTextMorph1.setTextString('test2');
		this.assertEqual('test2', nodeAfter.value, 'connect not working after deserialization');
	},
	test05MethodToMethodConnectionIsSerialized: function() {
		this.createAndAddMorphs();

		connect(this.textMorph1, 'getRichText', this.textMorph2, 'setRichText');
		this.textMorph1.setTextString('foo');
		this.textMorph1.getRichText(); // invoke connection
		this.assertEqual('foo', this.textMorph1.textString, 'connect not working 1');
		this.assertEqual('foo', this.textMorph2.textString, 'connect not working 2');

		this.doSave();

		this.textMorph1.setTextString('bar');
		this.textMorph1.getRichText(); // invoke connection
		this.assertEqual('bar', this.textMorph1.textString, 'connect not working after deserialize 1');
		this.assertEqual('bar', this.textMorph2.textString, 'connect not working after deserialize 2');
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

TestCase.subclass('Tests.BindingsTest.BindingsDuplicateTest', {

	setUp: function() {
		this.sut = Morph.makeRectangle(new Rectangle(100,100,100,50));
		this.sut.text = new TextMorph(new Rectangle(0,0,100,20));
		this.sut.addMorph(this.sut.text);

		connect(this.sut, 'origin', this.sut.text, 'setTextString', {
			converter: function(ea) {return String(ea)}}).update();

		connect(this.sut, 'origin', this.sut.text, 'setFill', {
			converter: function(ea) {return Color.red},
			updater: function($proceed, newVal, oldVal) {
				if (newVal.x > 200) $proceed(newVal, oldVal)}
			}).update();
	},

	testBindingWorks: function() {
		var p = pt(50,50);
		this.sut.setPosition(p);
		this.assertEqual(this.sut.text.textString, String(p))
	},

	testDuplicateBinding: function() {
		var p = pt(50,50);
		copy = this.sut.duplicate();
		this.assertEqual(copy.attributeConnections.length, this.sut.attributeConnections.length,
			 	" number of attributes connections is broken");
		this.assert(copy.attributeConnections[1].getTargetObj(), "no source object in copy");
		this.assert(copy.attributeConnections[1].getTargetObj(), "no taget object in copy");
		this.assert(copy.text !== this.sut.text, "text object did not change");
		
		this.assertIdentity(copy.attributeConnections[1].getTargetObj(), copy.text,"no taget object in copy");
		copy.setPosition(p);
		this.assertEqual(copy.text.textString, String(p))
	},

	testAttributeConnectionsAreDuplicated: function() {
		var copy = this.sut.duplicate();
		this.assert(this.sut.attributeConnections, "original has no connections");
		this.assert(copy.attributeConnections, "copy has no connections");
		this.assert(copy.attributeConnections !== this.sut.attributeConnections, "cconnections are not copied");
	},

	testCopyHasObservers: function() {
		this.assert(this.sut.__lookupGetter__('origin'), "original as no observer")
		var copy = this.sut.duplicate();
		this.assert(copy.__lookupGetter__('origin'), "copy as no observer")

	},

	testUpdaterIsCopied: function() {
		this.assert(this.sut.attributeConnections[1].updater, "no update in fillConnection");
		var copy = this.sut.duplicate();
		this.assert(copy.attributeConnections[1].updater, "no update in fillConnection copy");
	},
	
	testCopyPlainObjects: function() {
		var o1 = {x: null};
		var o2 = {y: null};
		var sut = lively.bindings.connect(o1, 'x', o2, 'y');
		
		this.assert(this.sut.attributeConnections[1].updater, "no update in fillConnection");
		var copy = this.sut.duplicate();
		this.assert(copy.attributeConnections[1].updater, "no update in fillConnection copy");
	},

});


}); // end of module