module('lively.SerializationRefactoring').requires('cop.Layers', 'Tests.SerializationTests').toRun(function() {

// morphic stuff
Morph.addMethods('serialization', {
	onrestore: function() {
		this.restoreShapeRelation();
		this.restoreSubMorphRelation();
	},

	restoreShapeRelation: function() {
		// shape relation
		if (!this.rawNode || !this.shape.rawNode) {
			console.warn('No rawNode when trying to restore for ' + morph);
			return
		}
		this.rawNode.appendChild(this.shape.rawNode);
	},

	restoreSubMorphRelation: function() {
		this.submorphs.forEach(function(subMorph) {
			if (!subMorph.rawNode) {
				debugger
				console.error('No rawNode when trying to restore for submorph' + subMorph)
				return
			}
			this.rawNode.appendChild(subMorph.rawNode)
		}, this)
	},

})

TextMorph.addMethods('serialization', {

	doNotSerialize: TextMorph.prototype.doNotSerialize.concat(['undoHistory']),

	onrestore: function($super) {
		$super();
		if (this.rawNode && this.textContent.rawNode) {
			this.rawNode.appendChild(this.textContent.rawNode);
			this.changed();
		}
		this.initializeTransientState();
	},
})

WorldMorph.addMethods('serialization', {
	onrestore: function($super) {
		$super()
		this.hands = [];
		this.scheduledActions = [];

		var scripts = [];
		this.mainLoopFunc = this.doOneCycle.bind(this).logErrors('Main Loop');
		this.withAllSubmorphsDo(function() {
			if (this.activeScripts && this.activeScripts.length > 0)
				scripts = scripts.concat(this.activeScripts);
		})
		scripts.forEach(function(s) { s && s.start(this); }, this);
	},
});
ClipMorph.addMethods('serialization', {
	onrestore: function($super) {
		$super()
		this.setupClipNode();
	},
});
lively.paint.Gradient.addMethods('serialization', {
	onrestore: function() {
		this.initializeNode();
	},
});
AttributeConnection.addMethods('serialization', {
	onrestore: function() {
		this.connect();
	},
});
lively.ide.SystemBrowser.addMethods('serialization', {
	onrestore: function() {
		// lively.ide.startSourceControl();

		// this.initializeModelRelay(this.getModel());
		// this.setupListPanes();
		// this.setupSourceInput();
		
		this.panel.onDeserialize.bind(this.panel).delay(0);
		// (function() {
		// 	var oldPanel = this.panel,
		// 		newPanel = this.buildView(oldPanel.getExtent()),
		// 		selection = oldPanel.getSelectionSpec(),
		// 		window = oldPanel.owner;
		// 	window.targetMorph = window.addMorph(newPanel);
		// 	newPanel.setPosition(oldPanel.getPosition());
		// 	oldPanel.remove();
		// 	newPanel.resetSelection(selection, this);
		// }).bind(this).delay(0);
	},
});


cop.create('SmartRefSerializationCompatibility')
.refineClass(lively.data.Wrapper, {
	getLengthTrait: function(name) {
		return this[name] ? this[name] : lively.data.Length.parse(this.rawNode.getAttributeNS(null, name));
	},
	setTrait: function(name, value) {
		this[name] = value;
		return this.rawNode.setAttributeNS(null, name, String(value));
	},
	getTrait: function(name) {
		return this[name] ? String(this[name]) : this.rawNode.getAttributeNS(null, name);
	},
})
.refineClass(lively.scene.Rectangle, {
	bounds: function() {
		var x = this.x || this.rawNode.x.baseVal.value;
		var y = this.y || this.rawNode.y.baseVal.value;
		var width = this.width || this.rawNode.width.baseVal.value;
		var height = this.height || this.rawNode.height.baseVal.value;
		return new Rectangle(x, y, width, height);
	},
	containsPoint: function(p) {
		var x = this.x || this.rawNode.x.baseVal.value;
		var width = this.width || this.rawNode.width.baseVal.value;
		if (!(x <= p.x && p.x <= x + width))
			return false;
		var y = this.y || this.rawNode.y.baseVal.value;
		var height = this.height || this.rawNode.height.baseVal.value;
		return y <= p.y && p.y <= y + height;
	},
})
;


// lively.scene.Rectangle.addMethods('SmartRefSerialization',{
	// rawNodeType: "rect",
// })
// lively.scene.Ellipse.addMethods('SmartRefSerialization',{
	// rawNodeType: "ellipse",
// })
// lively.scene.Polygon.addMethods('SmartRefSerialization',{
	// rawNodeType: "polygon",
// })
// lively.scene.Polyline.addMethods('SmartRefSerialization',{
	// rawNodeType: "polyline",
// })
// lively.scene.Group.addMethods('SmartRefSerialization',{
	// rawNodeType: "g",
// })
// lively.scene.Image.addMethods('SmartRefSerialization',{
	// rawNodeType: "image", // FIXME
// })
// lively.scene.Clip.addMethods('SmartRefSerialization',{
	// rawNodeType: "clipPath",
// })
// lively.scene.Text.addMethods('SmartRefSerialization',{
	// rawNodeType: "text",
// })
// lively.paint.Stop.addMethods('SmartRefSerialization',{
	// rawNodeType: "stop",
// })
// lively.paint.LinearGradient.addMethods('SmartRefSerialization',{
	// rawNodeType: "linearGradient",
// })
// lively.paint.RadialGradient.addMethods('SmartRefSerialization',{
	// rawNodeType: "radialGradient",
// });

// Tests
TestCase.subclass('RestoreTest',
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
Tests.SerializationTests.SerializationBaseTestCase.subclass('RestoreTestUsingWorldMorph',
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
			ObjectGraphLinearizer.serializeWorldToDocument(this.worldMorph, doc);
			var serializedDoc = stringToXML(Exporter.stringify(doc)).ownerDocument,
				newCs = ObjectGraphLinearizer.deserializeChangeSetFromDocument(serializedDoc);
			newCs.evaluateAllButInitializer();
			this.assert(Global.DoitChangeWasEvaluated, 'change not evaluated');
			var world = ObjectGraphLinearizer.deserializeWorldFromDocument(serializedDoc);
			world.displayOnCanvas(Query.find('//svg:svg', serializedDoc));
			world.setChangeSet(newCs);
			var newCs2 = ChangeSet.fromWorld(world)
			this.assertEquals(cs.subElements().length, newCs2.subElements().length);
		} finally { // FIXME
			delete Global.DoitChangeWasEvaluated;
		}
	},

});

}); // end of module