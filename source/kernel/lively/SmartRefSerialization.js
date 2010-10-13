module('lively.SmartRefSerialization').requires('lively.TestFramework', 'apps.ProtoVisInterface', 'lively.SerializationRefactoring').toRun(function() {


Object.subclass('ObjectGraphLinearizer',
'initializing', {

	initialize: function() {
		this.idCounter = 0;
		this.registry = {};
		this.plugins = [];
		this.copyDepth = 0;
		this.path = [];
	},

	cleanup: function() {
		// remive ids from all original objects and the original objects as well as any recreated objects
		for (var id in this.registry) {
			var entry = this.registry[id];
			if (entry.originalObject)
				delete entry.originalObject[this.idProperty]
			if (entry.recreatedObject)
				delete entry.recreatedObject[this.idProperty]
			delete entry.originalObject;
			delete entry.recreatedObject;
		}
	},

},
'testing', {
	isReference: function(obj) {
		return obj && obj.__isSmartRef__
	},
	isValueObject: function(obj) {
		if (obj == null) return true;
		if (typeof obj !== 'object') return true;
		if (this.isReference(obj)) return true;
		return false
	},
},
'accessing', {
	idProperty: '__SmartId__',

	newId: function() { return this.idCounter++ },
	getIdFromObject: function(obj) {
		return obj.hasOwnProperty(this.idProperty) ? obj[this.idProperty] : undefined;
	},
	getRegisteredObjectFromId: function(id) {
		return this.registry[id] && this.registry[id].registeredObject
	},
	getRecreatedObjectFromId: function(id) {
		return this.registry[id] && this.registry[id].recreatedObject
	},
	setRecreatedObject: function(object, id) {
		var registryEntry = this.registry[id];
		if (!registryEntry)
			throw new Error('Trying to set recreated object in registry but cannot find registry entry!');
		registryEntry.recreatedObject = object
	},

},
'plugins', {
	addPlugin: function(plugin) {
		this.plugins.push(plugin);
		plugin.setSerializer(this);
	},
	addPlugins: function(plugins) {
		plugins.forEach(function(ea) { this.addPlugin(ea) }, this);
	},

	somePlugin: function(methodName, args) {
		// invoke all plugins with methodName and return the first non-undefined result (or null)
		for (var i = 0; i < this.plugins.length; i++) {
			var plugin = this.plugins[i],
				pluginMethod = plugin[methodName];
			if (!pluginMethod) continue;
			var result = pluginMethod.apply(plugin, args);
			if (result) return result
		}
		return null;
	},
	letAllPlugins: function(methodName, args) {
		// invoke all plugins with methodName and args
		for (var i = 0; i < this.plugins.length; i++) {
			var plugin = this.plugins[i],
				pluginMethod = plugin[methodName];
			if (!pluginMethod) continue;
			pluginMethod.apply(plugin, args);
		}
	},
},
'object registry -- serialization', {
	register: function(obj) {
		if (this.isValueObject(obj))
			return obj

		if (Object.isArray(obj))
			return obj.collect(function(item, idx) {
				return this.somePlugin('ignoreProp', [obj, idx, item]) ? null : this.register(item);
			}, this);

		var id = this.addIdAndAddToRegistryIfNecessary(obj);
		return this.registry[id].ref;
	},

	addIdAndAddToRegistryIfNecessary: function(obj) {
		var id = this.getIdFromObject(obj);
		if (id === undefined) id = this.addIdToObject(obj);
		if (!this.registry[id]) this.addNewRegistryEntry(id, obj)
		return id
	},

	addNewRegistryEntry: function(id, obj) {
		// copyObjectAndRegisterReferences must be done AFTER setting the registry entry
		// to allow reference cycles  
		var entry = this.createRegistryEntry(obj, id);
		this.registry[id] = entry;
		entry.registeredObject = this.copyObjectAndRegisterReferences(obj)
		return entry
	},

	createRegistryEntry: function(obj, id) {
		return {
			originalObject: obj,
			registeredObject: null, // copy of original with replaced refs
			recreatedObject: null, // new created object with patched refs
			ref: {__isSmartRef__: true, id: id},
		}
	},

	copyObjectAndRegisterReferences: function(obj) {
		if (this.copyDepth > 30) {
			debugger;
			throw new Error('Stack overflow while registering objects? ' + obj)
		}
		this.copyDepth++
		var copy = {};
		for (var key in obj) {
			if (!obj.hasOwnProperty(key) || key === this.idProperty) continue;
			var value = obj[key];
			if (this.somePlugin('ignoreProp', [obj, key, value])) continue;
this.path.push(key)
			copy[key] = this.register(value);
this.path.splice(this.path.length-1, 1); // remove last
		}
		this.letAllPlugins('serializeObj', [obj, copy]);
		this.copyDepth--
		return copy
	},

},
'object registry -- deserialization', {

	recreateFromId: function(id) {
		var recreated = this.getRecreatedObjectFromId(id);
		if (recreated) return recreated;

		// take the registered object (which has unresolveed references) and
		// create a new similiar object with patched references		
		var registeredObj = this.getRegisteredObjectFromId(id),
			recreated = this.somePlugin('deserializeObj', [registeredObj]) || {};
		this.setRecreatedObject(recreated, id); // important to set recreated before patching refs!
		for (var key in registeredObj) {
			if (key === this.classNameProperty) continue;
this.path.push(key)
			var value = registeredObj[key];
			recreated[key] = this.patchObj(value);
this.path.splice(this.path.length-1, 1); // remove last
		};
		this.letAllPlugins('afterDeserializeObj', [recreated]);
		return recreated;
	},

	patchObj: function(obj) {
		if (this.isReference(obj))
			return this.recreateFromId(obj.id)

		if (Object.isArray(obj))
			return obj.collect(function(item, idx) {
this.path.push(idx)
				var result = this.patchObj(item);
this.path.splice(this.path.length-1, 1); // remove last
				return result;
			}, this)

		return obj;		
	},

},
'serializing', {
	serialize: function(obj) {
		try {
			var start = new Date();
			var ref = this.register(obj);
			var root = {id: ref.id, registry: this.registry};
			this.log('Serializing done in ' + (new Date() - start) + 'ms');
		} catch (e) {
			this.log('Cannot serialize ' + obj + ' because ' + e);
			return null;
		} finally {
			this.cleanup();
		}
		return JSON.stringify(root);
	},
	addIdToObject: function(obj) { return obj[this.idProperty] = this.newId() },
},
'deserializing',{
	deserialize: function(jsonString) {
		var jsonObj = JSON.parse(jsonString);
		return this.deserializeJso(jsonObj);
	},
	deserializeJso: function(jsonObj) {
		var start = new Date(),
			id = jsonObj.id;
		this.registry = jsonObj.registry;
		var result = this.recreateFromId(id);
		this.letAllPlugins('deserializationDone');
		this.log('Deserializing done in ' + (new Date() - start) + 'ms');
		this.cleanup();
		return result;
	},

},
'debugging', {
	serializedPropertiesOfId: function(id) {
		return Properties.all(this.getRegisteredObjectFromId(id))
	},
	referencesOfId: function(id) {
		var registeredObj = this.getRegisteredObjectFromId(id);
		var result = []
		Properties.forEachOwn(registeredObj, function(key, value) {
			if (!value || !this.isReference(value)) return;
			var refRegisteredObj = this.getRegisteredObjectFromId(value.id)
			result.push(key + ':' + value.id + '(' + refRegisteredObj[ClassPlugin.classNameProperty] + ')');
		}, this);
		return result;
	},
	objectsThatReferenceId: function(wantedId) {
		var result = [], serializer = this;
		function searchIn(obj, id) {
			Object.values(obj).forEach(function(ref) {
				if (serializer.isReference(ref) && ref.id == wantedId) result.push(id);
				if (Object.isArray(ref)) searchIn(ref, id);
			})
		}
		Properties.all(this.registry).forEach(function(id) {
			searchIn(this.getRegisteredObjectFromId(id), id);
		}, this)
		return result;
	},

	log: function(msg) {
		WorldMorph.current() ?
			WorldMorph.current().setStatusMessage(msg, Color.blue, 6) :
			console.log(msg);
	},
	getPath: function() {
		 return '["' + this.path.join('"]["') + '"]'
	},

});
Object.extend(ObjectGraphLinearizer, {
	forLively: function() {
		var serializer = new ObjectGraphLinearizer();
		serializer.addPlugins([
			new ClassPlugin(),
			new LivelyWrapperPlugin(),
			new OldModelFilter(),
			new ScriptFilter(),
		]);
		return serializer;
	},

	// FIXME this should go in an own class
	changeSetElementId: 'WorldChangeSet',
	jsonWorldId: 'LivelyJSONWorld',
	serializeWorld: function(world) {
		var doc = new Importer().getBaseDocument(); // FIXME
		return this.serializeWorldToDocument(world, doc);
	},


	serializeWorldToDocument: function(world, doc) {

		// FIXME remove previous meta elements - is this really necessary?
		var metaElement;
		while (metaElement = doc.getElementsByTagName('meta')[0])
			metaElement.parentNode.removeChild(metaElement)

		// FIXME remove system dictionary
		var sysDict = doc.getElementById('SystemDictionary');
		if (sysDict) sysDict.parentNode.removeChild(sysDict);

		// serialize changeset
		var cs = ChangeSet.fromWorld(world),
			csElement = doc.importNode(cs.getXMLElement(), true),
			metaCSNode = doc.createElement('meta')
		metaCSNode.setAttribute('id', this.changeSetElementId);
		metaCSNode.appendChild(csElement);

		// serialize world
		var serializer = this.forLively(),
			json = serializer.serialize(world);
			metaWorldNode = doc.createElement('meta');
		metaWorldNode.setAttribute('id', this.jsonWorldId)
		metaWorldNode.appendChild(doc.createCDATASection(json))

		doc.head.appendChild(metaCSNode)
		doc.head.appendChild(metaWorldNode)

		return doc;
	},

	deserializeWorldFromDocument: function(doc) {
		var worldMetaElement = doc.getElementById(this.jsonWorldId);
		if (!worldMetaElement)
			throw new Error('Cannot find JSONified world when deserializing');
		var serializer = this.forLively(),
			json = worldMetaElement.textContent,
			world = serializer.deserialize(json);
		return world;
	},
	deserializeWorldFromJso: function(jso) {
		var serializer = this.forLively(),
			world = serializer.deserializeJso(jso);
		return world;
	},

	deserializeChangeSetFromDocument: function(doc) {
		var csMetaElement = doc.getElementById(this.changeSetElementId);
		if (!csMetaElement)
			throw new Error('Cannot find ChangeSet meta element when deserializing');
		return ChangeSet.fromNode(csMetaElement);
	},


	sourceModulesIn: function(jso) {
		return new ClassPlugin().sourceModulesIn(jso.registry);
	},




});

Object.subclass('ObjectLinearizerPlugin',
'accessing', {
	getSerializer: function() { return this.serializer },
	setSerializer: function(s) { this.serializer = s },
},
'plugin interface', {
	serializeObj: function(original, persistentCopy) {},
	deserializeObj: function(persistentCopy) {},
	ignoreProp: function(obj, propName) {},
	afterDeserializeObj: function(obj) {},
	deserializationDone: function() {},

});
ObjectLinearizerPlugin.subclass('ClassPlugin',
'properties', {
	isInstanceRestorer: true, // for Class.intializer
	classNameProperty: '__LivelyClassName__',
	sourceModuleNameProperty: '__SourceModuleName__',
},
'plugin interface', {
	serializeObj: function(original, persistentCopy) {
		this.addClassInfoIfPresent(original, persistentCopy);
	},
	deserializeObj: function(persistentCopy) {
		return this.restoreIfClassInstance(persistentCopy);
	},
	ignoreProp: function(obj, propName) {
		return propName == this.classNameProperty
	},
	afterDeserializeObj: function(obj) {
		this.removeClassInfoIfPresent(obj)
	},


},
'class info persistence', {
	addClassInfoIfPresent: function(original, persistentCopy) {
		// store class into persistentCopy if original is an instance
		if (!original || !original.constructor) return;
		var className = original.constructor.type;
		persistentCopy[this.classNameProperty] = className;
		var srcModule = original.constructor.sourceModule
		if (srcModule)
			persistentCopy[this.sourceModuleNameProperty] = srcModule.namespaceIdentifier;
	},
	restoreIfClassInstance: function(persistentCopy) {
		// if (!persistentCopy.hasOwnProperty[this.classNameProperty]) return;
		var className = persistentCopy[this.classNameProperty];
		if (!className) return;
		var klass = Class.forName(className);
		if (!klass) throw new Error('ObjectGraphLinearizer is trying to deserialize instance of' +
				className + ' but this class cannot be found!');
		return new klass(this);
	},


	removeClassInfoIfPresent: function(obj) {
		if (obj[this.classNameProperty])
			delete obj[this.classNameProperty];
	},

},
'searching', {
	sourceModulesIn: function(registryObj) {
		var result = [];
		Properties.forEachOwn(registryObj, function(key,value) {
			if (!value.registeredObject) return;
			var sourceModule = value.registeredObject[this.sourceModuleNameProperty];
			if (sourceModule && !sourceModule.startsWith('Global.anonymous_'))
				result.push(sourceModule);
		}, this)
		return result.uniq();
	},
});
ObjectLinearizerPlugin.subclass('LivelyWrapperPlugin', // for serializing lively.data.Wrappers
'names', {
	rawNodeInfoProperty: '__rawNodeInfo__',
},
'initializing', {
	initialize: function($super) {
		$super();
		this.restoreObjects = [];
	},
},
'testing', {
	hasRawNode: function(obj) {
		// FIXME how to ensure that it's really a node? instanceof?
		return obj.rawNode && obj.rawNode.nodeType
	},
	doNotSerialize: function(obj, propName) {
		if (!obj.doNotSerialize) return false;
		if (obj.doNotSerialize.include(propName)) return true;
		return (function lookInHierarchy(klass) {
			if (!klass || klass === Object) return false;
			if (klass.prototype.doNotSerialize && klass.prototype.doNotSerialize.include(propName))
				return true;
			return lookInHierarchy(klass.superclass);
		})(obj.constructor);
	},

},
'plugin interface', {
	serializeObj: function(original, persistentCopy) {
		if (typeof original.onstore === 'function')
			original.onstore()
		if (this.hasRawNode(original))
			this.captureRawNode(original, persistentCopy);
	},
	ignoreProp: function(obj, propName, value) {
		try {
			if (propName == 'withLayers') return true;
			if (this.doNotSerialize(obj, propName)) return true;
			// if (obj.isPropertyOnIgnoreList && obj.isPropertyOnIgnoreList(propName)) return true;
			if (!value) return false;
			if (value.nodeType) return true; // FIXME dont serialize nodes
			if (value === Global) return true;
		} catch(e) {
			// strange objects that are created by layers make problems here:
			// layer[object._layer_object_id] = {_layered_object: object};
			// NodeMorphLayer, e.g. layers isPropertyOnIgnoreList and this strange object than
			// has this method -- but the wrapped version with proceed...
			// console.warn(e);
			// debugger
			return false
		}
			
		return false;
	},
	afterDeserializeObj: function(obj) {
		this.restoreRawNode(obj);
		if (typeof obj.onrestore === 'function')
			this.restoreObjects.push(obj);
	},
	deserializationDone: function() {
		this.restoreObjects.invoke('onrestore');
	},
},
'rawNode handling', {
	captureRawNode: function(original, copy) {
		var attribs = $A(original.rawNode.attributes).collect(function(attr) {
			return {key: attr.name, value: attr.value, namespaceURI: attr.namespaceURI}
		})
		var rawNodeInfo = {
			tagName: original.rawNode.tagName,
			namespaceURI: original.rawNode.namespaceURI,
			attributes: attribs,
		};
		copy[this.rawNodeInfoProperty] = rawNodeInfo;
	},

	restoreRawNode: function(newObj) {
		var rawNodeInfo = newObj[this.rawNodeInfoProperty];
		if (!rawNodeInfo) return;
		delete newObj[this.rawNodeInfoProperty];
		var rawNode = document.createElementNS(rawNodeInfo.namespaceURI, rawNodeInfo.tagName);
		rawNodeInfo.attributes.forEach(function(attr) {
			rawNode.setAttributeNS(attr.namespaceURI, attr.key, attr.value);
		});
		newObj.rawNode = rawNode;
	},
});
ObjectLinearizerPlugin.subclass('OldModelFilter',
'initializing', {
	initialize: function($super) {
		$super();
		this.relays = [];
	},
},
'plugin interface', {
	ignoreProp: function(source, propName, value) {
		// if (propName === 'formalModel') return true;
		// if (value && value.constructor && value.constructor.name.startsWith('anonymous_')) return true;
		return false;
	},
	serializeObj: function(original, persistentCopy) {
		var klass = original.constructor;
		if (!klass || !klass.name.startsWith('anonymous_'))
			return;
		ClassPlugin.prototype.removeClassInfoIfPresent(persistentCopy);
		persistentCopy.definition = JSON.stringify(original.definition)
		persistentCopy.isInstanceOfAnonymousClass = true;
		if (klass.superclass == Relay) {
			persistentCopy.isRelay = true;
		} else if (klass.superclass == PlainRecord) {
			persistentCopy.isPlainRecord = true;
		} else {
			alert('Cannot serialize mode stuff of type ' + klass.superclass.type)
		}
	},
	afterDeserializeObj: function(obj) {
		// if (obj.isRelay) this.relays.push(obj);
	},
	deserializationDone: function() {
		// this.relays.forEach(function(relay) {
			// var def = JSON.parse(relay.definition);
		// })
	},
	deserializeObj: function(persistentCopy) {
		if (!persistentCopy.isInstanceOfAnonymousClass) return null;
		var instance;
		function createInstance(ctor, ctorMethodName, argIfAny) {
			var def = JSON.parse(persistentCopy.definition);
			return ctor[ctorMethodName](def, argIfAny)
		}

		if (persistentCopy.isRelay) {
			var delegate = this.getSerializer().patchObj(persistentCopy.delegate);
			instance = createInstance(Relay, 'newInstance', delegate);
		}

		if (persistentCopy.isPlainRecord) {
			debugger
			instance = createInstance(Record, 'newPlainInstance');
		}

		if (!instance) alert('Cannot serialize old model object: ' + JSON.stringify(persistentCopy))
		return instance;
	},



});
ObjectLinearizerPlugin.subclass('ScriptFilter',
'accessing', {
	serializedScriptsProperty: '__serializedScripts__',
	getSerializedScriptsFrom: function(obj) {
		if (!obj.hasOwnProperty(this.serializedScriptsProperty)) return null;
		return obj[this.serializedScriptsProperty]
	},
},
'plugin interface', {
	serializeObj: function(original, persistentCopy) {
		var scripts = {}, found = false;
		Functions.own(original).forEach(function(funcName) {
			var func = original[funcName];
			if (!func.isSerializable) return;
			found = true;
			scripts[funcName] = func.toString();
		});
		if (!found) return;
		persistentCopy[this.serializedScriptsProperty] = scripts;
	},
	afterDeserializeObj: function(obj) {
		var scripts = this.getSerializedScriptsFrom(obj);
		if (!scripts) return;
		Properties.forEachOwn(scripts, function(scriptName, scriptSource) {
			Function.fromString(scriptSource).asScriptOf(obj, scriptName);
		})
		delete obj[this.serializedScriptsProperty];
	},
});
ObjectLinearizerPlugin.subclass('GenericFilter',
'initializing', {
	initialize: function($super) {
		$super();
		this.ignoredClasses = [];
		this.ignoredProperties = [];
		this.filterFunctions = [];
	},
},
'plugin interface', {
	addClassToIgnore: function(klass) {
		this.ignoredClasses.push(klass.type);
	},
	addPropertyToIgnore: function(name) {
		this.ignoredProperties.push(name);
	},

	addFilter: function(filterFunction) {
		this.filterFunctions.push(filterFunction);
	},
	ignoreProp: function(obj, propName, value) {
		return this.ignoredProperties.include(propName) || 
			(value && this.ignoredClasses.include(value.constructor.type)) ||
			this.filterFunctions.any(function(func) { return func(obj, propName, value) });
	},
});


Object.subclass('SmartRefTestDummy', // for testing
'default category', {
	someProperty: 23,
	m1: function() { return 99 },
	toString: function() { return 'a ' + this.constructor.name },
});


TestCase.subclass('ObjectGraphLinearizerTest',
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

})


TestCase.subclass('ObjectGraphLinearizerPluginTest',
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
		var instance1 = new SmartRefTestDummy(), instance2 = new SmartRefTestDummy();
		instance1.friend = instance2;
		instance2.specialProperty = 'some string';

		this.serializer = ObjectGraphLinearizer.forLively(); // plugin creation should happen there
		var result = this.serializeAndDeserialize(instance1)

		this.assertEqual(instance2.specialProperty, result.friend.specialProperty);
	
		this.assert(result.m1, 'deserialized does not have method');
		this.assertEqual(99, result.m1(), 'wrong method invocation result');
		SmartRefTestDummy.prototype.someProperty = -1; // change after serialization
		this.assertEqual(SmartRefTestDummy.prototype.someProperty, result.someProperty, 'proto prop');

		this.assertIdentity(SmartRefTestDummy, result.constructor, 'constructor 1');
		this.assertIdentity(SmartRefTestDummy, result.friend.constructor, 'constructor 2');
		this.assert(result instanceof SmartRefTestDummy, 'instanceof 1');
		this.assert(result.friend instanceof SmartRefTestDummy, 'instanceof 2');
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
			result = ObjectGraphLinearizer.sourceModulesIn(jso);
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
Widget.subclass('SmartRefSerializationInspector',
'settings', {
	viewTitle: 'SmartRef Serialization Inspector',
	initialViewExtent: pt(500, 300),
	defaultText: 'doits here have this === selected inspectee',
},
'view', {
	buildView: function(extent) {
		function chainedLists(bounds) {
			return new ChainedListMorph(bounds, 4);
		}
		var panel = PanelMorph.makePanedPanel(extent, [
			['listPane', chainedLists, new Rectangle(0, 0, 1, 0.48)],
			['resizer', function(bnds){return new HorizontalDivider(bnds)}, new Rectangle(0, 0.48, 1, 0.02)],
			['sourcePane', newTextPane, new Rectangle(0, 0.5, 1, 0.5)],
		]);

		// list content and list selection 
		panel.listPane.plugTo(this, {
			setRoot: {dir: '<-', name: 'rootObj', options: {
				converter: function(obj) { return new InspectorNode('', obj) }}},
			selection: {dir: '->', name: 'inspectee', options: {
				converter: function(node) { return node.object }}},
		});

		// set title
		panel.listPane.plugTo(panel, {
			selection: {dir: '->', name: 'setTitle', options: {
				converter: function(node) {return node.object ? node.object.toString() : String(node.object)}}},
		});

		// source pane
		panel.sourcePane.innerMorph().plugTo(this, { getDoitContext: '->doitContext' });
		panel.sourcePane.innerMorph().setTextString(this.defaultText);

		// resizer setup
		panel.resizer.addScalingAbove(panel.listPane);
		panel.resizer.addScalingBelow(panel.sourcePane)

		panel.ownerWidget = this; // For serialization
		return panel;
	},

},
'inspecting', {
	inspect: function(obj) {
		this.rootObj = obj; // rest is connect magic
	},
	doitContext: function() {
		return this.inspectee || this.rootObj
	},
});
ChainedListMorphNode.subclass('SmartRefSerializationInspector',
'initializing', {
	initialize: function(name, obj) {
		this.name = name;
		this.object = obj;
	},
},
'interface', {
	asString: function() { return String(this.name) },
	childNodes: function() {
		if (Object.isString(this.object)) return [];
		return Properties.all(this.object)
			.sort()
			.collect(function(key) { return new InspectorNode(key, this.object[key]) }, this)
	},
});


// ProtoVisDrawing.subclass('SmartRefForceDiagram',
// 'initializing', {
// 	initialize: function($super, serializer, expanding, rootId) {
// 		$super();
// 		this.serializer = serializer;
// 		this.expanding = expanding;
// 		this.rootId = rootId || 0;
// 	},
// },
// 'data creation', {
// 	nodes: function(depth) {
// 		if (this._cachedNodes) return this._cachedNodes;
// 		return this._cachedNodes = Properties.all(this.serializer.registry).collect(function(id) {
// 			return this.createNodeFromId(id);
// 		}, this).sortBy(function(a) { return Number(a.id) });
// 	},
// 	revealedNodes: function() {
// 		var root = this.nodes()[this.rootId];
// 		return root.collectChildrenAndPointers([]);
// 	},
// 	revealedLinks: function() {
// 		var nodes = this.revealedNodes(),
// 			links = nodes.invoke('links').flatten();
// 		return links.select(function(link) {
// 			var hasSource = false, hasTarget = false;
// 			nodes.forEach(function(node) {
// 				if (link.sourceNode == node) hasSource = true;
// 				if (link.targetNode == node) hasTarget = true;
// 			});
// 			return hasSource && hasTarget;
// 		})
// 	},
// 
// 
// 	createNodeFromId: function(id) {
// 		if (!serializer.allClasses) serializer.allClasses = [];
// 		var regObj = serializer.getRegisteredObjectFromId(id),
// 			className = regObj[ClassPlugin.prototype.classNameProperty],
// 			self = this;
// 		serializer.allClasses = serializer.allClasses.concat([className]).uniq();
// 		return {
// 			id: id,
// 			nodeName: id.toString() + (className ? (':' + className) : ''),
// 			group: function() { return serializer.allClasses ? serializer.allClasses.indexOf(className) : 1 },
// 			radius: function() { return 20 },
// 			diameter: function() { return Math.min(150, 10 + Math.pow(this.linkDegree, 2) * this.radius()) }, 
// 			links: function() {
// 				if (this._cachedLinks) return this._cachedLinks;
// 				return this._cachedLinks = self.links().select(function(link) {
// 					return link.sourceNode == this;
// 				}, this);
// 			},
// 			children: [],
// 			expandChildren: function() {
// 				this.children = this.links().collect(function(link) { return link.targetNode });
// 			},
// 			nodesPointingToMe: [],
// 			expandObjectsPointingToMe: function() {
// 				this.nodesPointingToMe = self.links()
// 					.select(function(link) { return link.targetNode === this }, this)
// 					.collect(function(link) { return link.sourceNode });
// 			},
// 			collectChildrenAndPointers: function(collector) {
// 				if (collector.include(this)) return collector;
// 				collector.push(this);
// 				this.nodesPointingToMe.concat(this.children).invoke('collectChildrenAndPointers', collector);
// 				return collector;
// 			},
// 			reset: function() {
// 				this.x = 0
// 				this.y = 0
// 				this.px = 0
// 				this.py = 0
// 				this.vx = 0
// 				this.vy = 0
// 			},
// 			get vx() { var sign = this._vx < 0 ? -1 : 1; return sign * Math.min(5, Math.abs(this._vx)) },
// 			set vx(val) { this._vx = val },
// 			get vy() { var sign = this._vy < 0 ? -1 : 1; return sign * Math.min(5, Math.abs(this._vy)) },
// 			set vy(val) { this._vy = val },
// 		}
// 	},
// 
// 	linksOfId: function(id) {
// 		var serializer = this.serializer,
// 			registeredObj = serializer.getRegisteredObjectFromId(id),
// 			self = this;
// 		var result = []
// 		// normal refs
// 		function addLink(arr, sourceObj, propName, linkName) {
// 			var value = sourceObj[propName];
// 			if (!value) return arr;
// 			if (serializer.isReference(value)) {
// 				arr.push({
// 					sourceNode: self.nodes()[id],
// 					targetNode: self.nodes()[value.id],
// 					sourceId: id,
// 					targetId: value.id,
// 					name: linkName,
// 					startPos: function() { return this.sourceNode ? pt(this.sourceNode.x, this.sourceNode.y) : pt(0,0) },
// 					endPos: function() { return this.targetNode ? pt(this.targetNode.x, this.targetNode.y) : pt(0,0) },
// 					arrowPos: function() { return this.endPos().subPt(this.vector().normalized().scaleBy(20)) },
// 					vector: function() { return this.endPos().subPt(this.startPos()) },
// 					center: function() { return this.startPos().addPt(this.vector().scaleBy(0.5)) },
// 					angle: function() { return this.vector().theta() - Math.PI/2 },
// 
// 					// regObj: registeredObj,
// 					// propName: propName
// 				})
// 			}
// 			if (Object.isArray(value))
// 				value.forEach(function(item, idx) { addLink(arr, value, idx, linkName + '[' + idx + ']') })
// 			return arr
// 		}
// 
// 		var links = Properties.all(registeredObj).inject([], function(links, propName) {
// 			return addLink(links, registeredObj, propName, propName);
// 		});
// 		return links;
// 	},
// 	links: function() {
// 		if (this._cachedLinks) return this._cachedLinks;
// 		return this._cachedLinks = Properties.all(this.serializer.registry)
// 			.collect(function(id) { return this.linksOfId(id) }, this)
// 			.flatten()
// 	},
// 
// 
// },
// 'rendering', {
// 	draw: function() {
// 		var	w = 800, h = 800,
// 			colors = pv.Colors.category19();
// 
// 		var vis = new pv.Panel()
// 			.width(w)
// 			.height(h)
// 			.fillStyle("white")
// 			.event("mousedown", pv.Behavior.pan())
// 			.event("mousewheel", pv.Behavior.zoom());
// 
// 		var force = vis.add(pv.Layout.Force)
// 			// .links(this.links.bind(this))
// 			// .nodes(this.nodes.bind(this))
// 			.links(this.expanding ? this.revealedLinks.bind(this) : this.links())
// 			.nodes(this.expanding ? this.revealedNodes.bind(this) : this.nodes())
// 			// .bound(true)
// 			// .iterations(0)
// 			// .chargeTheta(50)
// 			// .chargeConstant(-100)
// 			// .dragConstant(0.9)
// 			.springLength(function() { return this.springLength || 20 }.bind(this));
// 
// 		force.link.add(pv.Line);
// 
// 		var nodeDot = force.node.add(pv.Dot)
// 			.size(function(d) { return d.diameter() })
// 			.fillStyle(function(d) { return colors(d.group()) })
// 			// .fillStyle('rgba(0.3,0.3,0.3, 0.5)')
// 			.strokeStyle(function() { return this.fillStyle().darker() })
// 			.lineWidth(1)
// 			.event("mousedown", pv.Behavior.drag())
// 			.event("drag", force)
// 
// 		nodeDot.anchor('center').add(pv.Label)
// 				.text(function(d) { return d.nodeName })
// 				.font("12px sans-serif")
// 
// 		if (this.expanding) {
// 			nodeDot.add(pv.Dot)
// 					.fillStyle('red')
// 					.size(10)
// 					.shape('circle')
// 					.top(function(d) { return d.y + d.diameter() * 0.05 })
// 					.event("click", function(d) { d.expandChildren(); force.reset(); force.render() })
// 				.add(pv.Dot)
// 					.fillStyle('blue')
// 					.top(function(d) { return d.y + d.diameter() * -0.05 })
// 					.event("click", function(d) { d.expandObjectsPointingToMe(); force.reset(); force.render() })
// 		}
// 
// 		force.add(pv.Label)
// 			.data(function() { return force.links() })
// 			.textAlign('center')
// 			.top(function(link) { return link.center().y })
// 			.left(function(link) { return link.center().x })
// 			.text(function(link) { return link.name })
// 			.font("9px sans-serif")
// 			.add(pv.Dot)
// 				.shape('triangle')
// 				.top(function(link) { return link.arrowPos().y })
// 				.left(function(link) {return link.arrowPos().x })
// 				.fillStyle('rgba(0.6,0.6,0.6, 1)')
// 				.lineWidth(0)
// 				.size(8)
// 				.angle(function(link) { return link.angle() })
// 
// 
// 		this.force = force;
// 
// 		return vis;
// 	},
// 
// 
// 	step: function() {
// 		var wasRemoved = this.canvas().parentNode == null;
// 		if (wasRemoved) return; // stop and dont call again
// 
// 		var s = this.force,
// 			sim = pv.simulation(s.nodes());
// 		sim.force(pv.Force.drag(d.force.dragConstant()));
// 		sim.force(pv.Force.charge(s.chargeConstant())
// 		     .domain(s.chargeMinDistance(), s.chargeMaxDistance())
// 		     .theta(s.chargeTheta()));
// 
// 		sim.force(pv.Force.spring(s.springConstant())
// 		    .damping(s.springDamping())
// 		    .length(s.springLength())
// 		    .links(s.links()));
// 
// 		sim.constraint(pv.Constraint.position());
// 		sim.constraint(pv.Constraint.bound().x(6, s.width() - 6).y(6, s.height() - 6));
// 
// 
// 		sim.step()
// 		s.render()
// 	},
// 
// });

}); // end of module
