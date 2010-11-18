module('lively.persistence.Tests').requires('lively.persistence.Serializer', 'Tests.SerializationTests').toRun(function() {

Object.subclass('lively.persistence.Tests.SmartRefTestDummy', // for testing
'default category', {
	someProperty: 23,
	m1: function() { return 99 },
	toString: function() { return 'a ' + this.constructor.name },
});


TestCase.subclass('lively.persistence.Tests.ObjectGraphLinearizerTest',
'running', {
	setUp: function($super) {
		$super();
		this.sut = new ObjectGraphLinearizer();
	},
},
'testing', {
	test01RegisterObject: function() {
		var obj = {foo: 23};
		var ref = this.sut.register(obj);
		this.assertEquals(23, this.sut.getRegisteredObjectFromId(ref.id).foo);
		this.sut.cleanup()
		this.assert(!this.sut.getIdFromObject(obj), 'id property not removed from original objects');
	},
	test02RegisterObjectsWithReferences: function() {
		var obj1 = {foo: 23}, obj2 = {other: obj1, bar: null};
		this.sut.register(obj2);
		var id1 = this.sut.getIdFromObject(obj1), id2 = this.sut.getIdFromObject(obj2);
		var regObj1 = this.sut.getRegisteredObjectFromId(id1), regObj2 = this.sut.getRegisteredObjectFromId(id2);
		this.assertEquals(23, regObj1.foo);
		this.assertIdentity(null, regObj2.bar);
		this.assert(regObj2.other !== obj1, 'registered object points to real object!')
		this.assert(regObj2.other, 'no reference object created')
		this.assert(regObj2.other.id, 'reference object has no id')
		this.assertEquals(id1, regObj2.other.id)
	},
	test03RegisterObjectsWithArrayReferences: function() {
		var obj1 = {a: true}, obj2 = {b: true}, obj3 = {others: [obj1, [obj2], 99]};
		this.sut.register(obj3);
		var id1 = this.sut.getIdFromObject(obj1),
			id2 = this.sut.getIdFromObject(obj2),
			id3 = this.sut.getIdFromObject(obj3);
			regObj1 = this.sut.getRegisteredObjectFromId(id1),
			regObj2 = this.sut.getRegisteredObjectFromId(id2),
			regObj3 = this.sut.getRegisteredObjectFromId(id3);
		this.assert(Object.isArray(regObj3.others), 'array gone away')
		this.assert(3, regObj3.others.length, 'array strange')
		this.assertEquals(id1, regObj3.others[0].id, 'plain ref in array')
		this.assertEquals(id2, regObj3.others[1][0].id, 'nested ref in array')
		this.assertEquals(99, regObj3.others[2])
	},
	test04RegisterArray: function() {
		var obj1 = {}, obj2 = {}, arr = [obj1, obj2];
		var registeredArr = this.sut.register(arr);
		var id1 = this.sut.getIdFromObject(obj1),
			id2 = this.sut.getIdFromObject(obj2);
		this.assertEquals(id1, registeredArr[0].id, 'obj1')
		this.assertEquals(id2, registeredArr[1].id, 'obj2')
	},
	test05RegisterNumber: function() {
		this.assertEquals(3, this.sut.register(3));
	},
	test06RecreateObjectTree: function() {
		var obj1 = {foo: 23}, obj2 = {other: obj1, bar: 42};
		var id = this.sut.register(obj2).id;
		var result = this.sut.recreateFromId(id)
		this.assertEquals(42, result.bar);
		this.assertEquals(23, result.other.foo);
	},
	test07RecreateObjectTreeWithArray: function() {
		var obj1 = {foo: 23}, obj2 = {bar: 42}, obj3 = {others: [obj1, [obj2], obj1]};
		var id = this.sut.register(obj3).id;
		var result = this.sut.recreateFromId(id)
		this.assertEquals(23, result.others[0].foo, 'not resolved item 0');
		this.assertEquals(42, result.others[1][0].bar, 'not resolved item 1');
		this.assertEquals(23, result.others[2].foo, 'not resolved item 2');
		this.assertIdentity(result.others[0], result.others[2], 'not resolved identity');
	},
	test08RecreateBidirectionalRef: function() {
		var obj1 = {}, obj2 = {};
		obj1.friend = obj2;
		obj2.friend = obj1;
		var id = this.sut.register(obj1).id;
		var result = this.sut.recreateFromId(id)
		var recreated1 = result, recreated2 = result.friend;
		this.assertIdentity(recreated1, recreated2.friend);
		this.assertIdentity(recreated2, recreated1.friend);
	},

	test09SerializeAndDeserialize: function() {
		var obj1 = { value: 1 },
			obj2 = { value: 2, friend: obj1 },
			obj3 = { value: 3, friends: [obj1, obj2]};
		obj1.friend = obj3;

		var json = this.sut.serialize(obj3)
		var result = this.sut.deserialize(json)

		this.assertEqual(3, result.value);
		this.assertEqual(2, result.friends.length);
		this.assertEqual(1, result.friends[0].value);
		this.assertIdentity(result.friends[0], result.friends[1].friend);
		this.assertIdentity(result, result.friends[0].friend);
	},
	testCDATAEndTagIsExcaped: function() {
		var str = 'Some funny string with CDATA end tag: ]]> and again ]]>',
			obj = { value: str };
		var json = this.sut.serialize(obj);
		this.assert(!json.include(']]>'), 'CDATA end tag included')
		var result = this.sut.deserialize(json)
		this.assertEqual(str, result.value);
	},

})


TestCase.subclass('lively.persistence.Tests.ObjectGraphLinearizerPluginTest',
'running', {
	setUp: function($super) {
		$super();
		this.serializer = new ObjectGraphLinearizer();
	},

	createAndAddDummyPlugin: function() {
		var plugin = new ObjectLinearizerPlugin();
		this.serializer.addPlugin(plugin);
		return plugin;
	},
	serializeAndDeserialize: function(obj) {
		return this.serializer.deserialize(this.serializer.serialize(obj))
	},
},
'testing', {
	test01RecreationPlugin: function() {
		var sut = this.createAndAddDummyPlugin()
		var obj = {foo: 23};
		sut.deserializeObj = function(registeredObj) { return {bar: registeredObj.foo * 2} };
		var result = this.serializeAndDeserialize(obj);
		this.assertEquals(23, result.foo);
		this.assertEquals(23*2, result.bar);
	},
	test02SerializeLivelyClassInstance: function() {
		var instance1 = new lively.persistence.Tests.SmartRefTestDummy(),
			instance2 = new lively.persistence.Tests.SmartRefTestDummy();
		instance1.friend = instance2;
		instance2.specialProperty = 'some string';

		this.serializer = ObjectGraphLinearizer.forLively(); // plugin creation should happen there
		var result = this.serializeAndDeserialize(instance1)

		this.assertEqual(instance2.specialProperty, result.friend.specialProperty);
	
		this.assert(result.m1, 'deserialized does not have method');
		this.assertEqual(99, result.m1(), 'wrong method invocation result');
		lively.persistence.Tests.SmartRefTestDummy.prototype.someProperty = -1; // change after serialization
		this.assertEqual(lively.persistence.Tests.SmartRefTestDummy.prototype.someProperty, result.someProperty, 'proto prop');

		this.assertIdentity(lively.persistence.Tests.SmartRefTestDummy, result.constructor, 'constructor 1');
		this.assertIdentity(lively.persistence.Tests.SmartRefTestDummy, result.friend.constructor, 'constructor 2');
		this.assert(result instanceof lively.persistence.Tests.SmartRefTestDummy, 'instanceof 1');
		this.assert(result.friend instanceof lively.persistence.Tests.SmartRefTestDummy, 'instanceof 2');
	},
	test03IgnoreProps: function() {
		var obj = {
			doNotSerialize: ['foo'],
			foo: 23,
			bar: 42,
		};
		this.serializer = ObjectGraphLinearizer.forLively(); // plugin creation should happen there
		var result = this.serializeAndDeserialize(obj);
		this.assert(!result.foo, 'property that was supposed to be ignored was serialized');
		this.assertEquals(42, result.bar, 'property that shouldn\'t be ignored was removed');
	},
	test04FindModulesOfClasses: function() {
		var morph1 = Morph.makeRectangle(0,0, 100, 100),
			morph2 = Morph.makeRectangle(0,0, 50, 50);
		morph1.addMorph(morph2);
		this.serializer = ObjectGraphLinearizer.forLively(); // plugin creation should happen there
		var string = this.serializer.serialize(morph1);
			jso = JSON.parse(string),
			result = lively.persistence.Serializer.sourceModulesIn(jso);
		this.assertEqualState(['Global.lively.Core', 'Global'], result);
	},

	testDoNotSerializeFoundInClassHierarchy: function() {
		Object.subclass('ObjectLinearizerPluginTestClassA', { doNotSerialize: ['x'] });
		ObjectLinearizerPluginTestClassA.subclass('ObjectLinearizerPluginTestClassB', { doNotSerialize: ['y'] });
		var obj = new ObjectLinearizerPluginTestClassB(),
			sut = new LivelyWrapperPlugin();
		this.assert(sut.doNotSerialize(obj, 'y'), 'y');
		this.assert(sut.doNotSerialize(obj, 'x'), 'x');
		this.assert(!sut.doNotSerialize(obj, 'foo'), 'foo');
	},

});

// Tests
TestCase.subclass('lively.persistence.Tests.RestoreTest',
'running', {
	setUp: function($super) {
		$super();
		this.sut = ObjectGraphLinearizer.forLively();
	},
},
'helper', {
	serializeAndDeserialize: function(obj) {
		return this.sut.deserialize(this.sut.serialize(obj))
	},
},
'testing', {

	test01aConnect: function() {
		var obj1 = {}, obj2 = {};
		obj1.ref = obj2;
		connect(obj1, 'x', obj2, 'y');
		obj1.x = 23;
		this.assertEquals(23, obj2.y);
		var result = this.serializeAndDeserialize(obj1);
		result.x = 42
		this.assertEquals(23, obj2.y, 'connect affects non serialized');
		this.assertEquals(42, result.ref.y, 'connect not serialized');
	},

	test01bConnectWithConverter: function() {
		var obj1 = {}, obj2 = {};
		obj1.ref = obj2;
		connect(obj1, 'x', obj2, 'y', {converter: function(val) { return val + 1 }});
		var result = this.serializeAndDeserialize(obj1);
		result.x = 42
		this.assertEquals(43, result.ref.y, 'connect not serialized');
	},

	test02aCopyRelay: function() {
		var morph = new ButtonMorph(new Rectangle(0,0,100,20)),
			model = { onValueUpdate: function(val) { this.wasCalled = val }.asScript() };

		morph.manualModel = model
		morph.relayToModel(model, {Value: '!Value'});
		this.assert(!morph.manualModel.wasCalled, 'strange')
		morph.setValue(true);
		this.assert(morph.manualModel.wasCalled, 'relay connection not working')
		morph.setValue(false);
		var result = this.serializeAndDeserialize(morph);

		result.setValue(true);
		this.assert(!morph.manualModel.wasCalled, 'wrong update')
		this.assert(result.formalModel.setValue, 'formal model has no relay setter');
		this.assert(result.manualModel.wasCalled, 'relay after serialization not working')
	},
	test02bSerializePlainRecord: function() {
		var record = Record.newPlainInstance({Foo: 10}),
			result = this.serializeAndDeserialize(record);

		this.assertEquals(10, result.getFoo());
		result.setFoo(12)
		this.assertEquals(12, result.getFoo());

	},

	test03aSerializeMorphScript: function() {
		var morph = Morph.makeRectangle(0,0,0,0)
		morph.addScriptNamed('someScript', function(val) { this.val = val });
		morph.someScript(23);
		this.assertEquals(23, morph.val);
		var result = this.serializeAndDeserialize(morph);
		result.someScript(42);
		this.assertEquals(42, result.val, 'script not serialized');
	},
	test03bSerializeScript: function() {
		var obj = {foo: function(x) { this.x = x }.asScript()};
		obj.foo(2)
		this.assertEquals(2, obj.x);
		var result = this.serializeAndDeserialize(obj);
		result.foo(3);
		this.assertEquals(3, result.x, 'script not serialized');
	},

});

Tests.SerializationTests.SerializationBaseTestCase.subclass('lively.persistence.Tests.RestoreTestUsingWorldMorph',
'running', {
	setUp: function($super) {
		$super();
		this.sut = ObjectGraphLinearizer.forLively();
	},
},
'helper', {
	serializeAndDeserialize: function(obj) {
		return this.sut.deserialize(this.sut.serialize(obj))
	},
	compare: function(original, newObj) {
		var logger = $morph('logger')
		if (!logger) return
		logger.setTextString(Exporter.stringify(original.rawNode) + '\n\n' + Exporter.stringify(newObj.rawNode));
	},
},
'assertion', {
	assertRawNodeEquals: function(expected, resultRawNode) {
		for (var i = 0; i < expected.attributes.length; i++) {
			var attr = expected.attributes[i];
			var result = resultRawNode.getAttribute(attr.name)
			this.assertEquals(attr.value, result, attr.name + ' does not equal in rawNode')
		}
	},
},
'testing', {
	test01RestoreSimpleMorph: function() {
		var m = new BoxMorph(new Rectangle(10,20, 80, 60));
		this.worldMorph.addMorph(m);
		var result = this.serializeAndDeserialize(m);
		this.assertEquals(pt(10,20), result.getPosition());
		this.assertEquals(pt(80,60), result.getExtent());
		this.assertRawNodeEquals(m.rawNode, result.rawNode);
		this.assertRawNodeEquals(m.shape.rawNode, result.shape.rawNode);
		this.assertIdentity(result.rawNode, result.shape.rawNode.parentNode);
		this.worldMorph.addMorph(result);
	},
	test02RestoreTexteMorph: function() {
		var str = 'Ein Test', m = new TextMorph(new Rectangle(10,20, 80, 60), str);
		m.setFontSize(20);
		this.worldMorph.addMorph(m);
		var result = this.serializeAndDeserialize(m);
		this.assertEquals(str, result.textString);
		this.assertEquals(20, result.getFontSize());
		this.assertRawNodeEquals(m.rawNode, result.rawNode);
		this.assertRawNodeEquals(m.shape.rawNode, result.shape.rawNode);
		this.worldMorph.addMorph(result);
		this.compare(m, result)
	},
	test03RestoreMorphWithFill: function() {
		var m = new BoxMorph(new Rectangle(10,20, 80, 60));
		m.setFill(Styles.radialGradient([[0, Color.red], [1, Color.green]]))
		this.worldMorph.addMorph(m);
		var result = this.serializeAndDeserialize(m);
		this.assert(result.getFill(), 'fill is null');
		this.assert(result.getFill().rawNode, 'fill rawNode not there');
		var fillId = result.getFill().id();
		var realFill = this.worldMorph.canvas().getElementById(fillId);
		this.assert(realFill, 'fill not in dict');
	},
	test04aConnect: function() {
		var obj1 = {}, obj2 = {};
		obj1.ref = obj2;
		connect(obj1, 'x', obj2, 'y');
		obj1.x = 23;
		this.assertEquals(23, obj2.y);
		var result = this.serializeAndDeserialize(obj1);
		result.x = 42
		this.assertEquals(23, obj2.y, 'connect affects non serialized');
		this.assertEquals(42, result.ref.y, 'connect not serialized');
	},
	test05ChangeSet: function() {
		try {
			var src = 'Global.DoitChangeWasEvaluated = true',
				change = DoitChange.create(src),
				cs = ChangeSet.fromWorld(this.worldMorph),
				doc = new Importer().getBaseDocument();
			cs.addSubElements([change]);
			lively.persistence.Serializer.serializeWorldToDocument(this.worldMorph, doc);
			var serializedDoc = stringToXML(Exporter.stringify(doc)).ownerDocument,
				newCs = lively.persistence.Serializer.deserializeChangeSetFromDocument(serializedDoc);
			newCs.evaluateAllButInitializer();
			this.assert(Global.DoitChangeWasEvaluated, 'change not evaluated');
			var world = lively.persistence.Serializer.deserializeWorldFromDocument(serializedDoc);
			world.displayOnCanvas(Query.find('//svg:svg', serializedDoc));
			world.setChangeSet(newCs);
			var newCs2 = ChangeSet.fromWorld(world)
			this.assertEquals(cs.subElements().length, newCs2.subElements().length);
		} finally { // FIXME
			delete Global.DoitChangeWasEvaluated;
		}
	},

});

}) // end of module