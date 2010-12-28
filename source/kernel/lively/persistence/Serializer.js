/*
 * Copyright (c) 2008-2011 Hasso Plattner Institute
 *
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

module('lively.persistence.Serializer').requires('lively.persistence.ObjectExtensions').toRun(function() {

Object.subclass('ObjectGraphLinearizer',
'settings', {
	defaultCopyDepth: 70,
	keepIds: false,
},
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
			if (!this.keepIds && entry.originalObject)
				delete entry.originalObject[this.idProperty]
			if (!this.keepIds && entry.recreatedObject)
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
	escapedCDATAEnd: '<=CDATAEND=>',
	CDATAEnd: '\]\]\>',

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
		if (this.copyDepth > this.defaultCopyDepth) {
			debugger;
			inspect(obj)
			throw new Error('Stack overflow while registering objects? ' + obj)
		}
		this.copyDepth++
		var copy = {};
		for (var key in obj) {
			if (!obj.hasOwnProperty(key) || (key === this.idProperty && !this.keepIds)) continue;
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
			this.path.push(key) // for debugging
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
				this.path.push(idx) // for debugging
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
		return this.stringifyJSO(root);
	},
	addIdToObject: function(obj) { return obj[this.idProperty] = this.newId() },
	stringifyJSO: function(jso) {
		var str = JSON.stringify(jso),
			regex = new RegExp(this.CDATAEnd, 'g');
		str = str.replace(regex, this.escapedCDATAEnd);
		return str
	},

},
'deserializing',{
	deserialize: function(json) {
		var jso = this.parseJSON(json);
		return this.deserializeJso(jso);
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
	parseJSON: function(json) {
		var regex = new RegExp(this.escapedCDATAEnd, 'g'),
			converted = json.replace(regex, this.CDATAEnd);
		return JSON.parse(converted);
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
			result.push(key + ':' + value.id + '(' + refRegisteredObj[ClassPlugin.prototype.classNameProperty] + ')');
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
	listObjectsOfWorld: function(url) {
		var doc = new WebResource(url).get().contentDocument;
		if (!doc) { alert('Could not get ' + url); return };
		var worldMetaElement = doc.getElementById(lively.persistence.Serializer.jsonWorldId);
		if (!worldMetaElement) { alert('Could not get json from ' + url); return };
		var jso = this.parseJSON(worldMetaElement.textContent);

		function humanReadableByteSize(n) {
			function round(n) { return Math.round(n * 100) / 100 }
			if (n < 1000) return String(round(n)) + 'bytes'
			n = n / 1024;
			if (n < 1000) return String(round(n)) + 'kb'
			n = n / 1024;
			return String(round(n)) + 'mb'
		}

		// aggregagator with output
		var classes = {
			toString: function() {
				return 'classes:\n' + Properties.own(this)
					.collect(function(prop) { return this[prop]  }, this)
					.sortBy(function(tuple) { return tuple.bytes })
					.collect(function(tuple) {
						return Strings.format('%s: %s (%s - %s per obj)',
							tuple.name, humanReadableByteSize(tuple.bytes), tuple.count,
							humanReadableByteSize(tuple.bytes / tuple.count))

					}, this)
					.join('\n')
			}
		}
	
		Properties.forEachOwn(jso.registry, function(key, value) {
			var className = value.registeredObject[ClassPlugin.prototype.classNameProperty] || 'plain object';
			if (!classes[className]) classes[className] = {count: 0, bytes: 0, name: className};
			classes[className].count++
			classes[className].bytes += JSON.stringify(value.registeredObject).length;
		});

		WorldMorph.current().addTextWindow(classes.toString());
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
			new LayerPlugin()
		]);
		return serializer;
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
		if (!klass || ! (klass instanceof Function)) {
			var msg = 'ObjectGraphLinearizer is trying to deserialize instance of ' +
				className + ' but this class cannot be found!';
			dbgOn(true);
			if (!Config.ignoreClassNotFound) throw new Error(msg);
			console.error(msg);
			lively.bindings.callWhenNotNull(WorldMorph, 'currentWorld',
				{warn: function(world) { world.alert(msg) }}, 'warn');
			return {isClassPlaceHolder: true, className: className};
		}
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
ObjectLinearizerPlugin.subclass('LayerPlugin',
'properties', {
	withLayersPropName: 'withLayers',
	withoutLayersPropName: 'withoutLayers'

},'plugin interface', {
	serializeObj: function(original, persistentCopy) {
		this.serializeLayerArray(original, persistentCopy, this.withLayersPropName)
		this.serializeLayerArray(original, persistentCopy, this.withoutLayersPropName)
	},
	afterDeserializeObj: function(obj) {
		this.deserializeLayerArray(obj, this.withLayersPropName)
		this.deserializeLayerArray(obj, this.withoutLayersPropName)
	},
},'helper',{
	serializeLayerArray: function(original, persistentCopy, propname) {
		var layers = original[propname]
		if (layers && layers.length > 0)
			persistentCopy[propname] = layers.invoke('getName');
	},

	deserializeLayerArray: function(obj, propname) {
		var layers = obj[propname];
		if (layers && layers.length > 0) {
			obj[propname] = layers.collect(function(ea) {
				return Object.isString(ea) ? cop.create(ea, true) : ea;
			});
		}
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
		// FIX for IE9+ which does not implement Function.name
		if (!klass.name) {
			var n = klass.toString().match('^function\s*([^(]*)\\(');
			klass.name = (n ? n[1].strip() : '');
		}
		if (!klass || !klass.name.startsWith('anonymous_')) return;
		ClassPlugin.prototype.removeClassInfoIfPresent(persistentCopy);
		var def = JSON.stringify(original.definition);
		def = def.replace(/[\\]/g, '')
		def = def.replace(/"+\{/g, '{')
		def = def.replace(/\}"+/g, '}')
// if (def.startsWith('{"0":')) debugger
		persistentCopy.definition = def;
		persistentCopy.isInstanceOfAnonymousClass = true;
		if (klass.superclass == Relay) {
			persistentCopy.isRelay = true;
		} else if (klass.superclass == PlainRecord) {
			persistentCopy.isPlainRecord = true;
		} else {
			alert('Cannot serialize model stuff of type ' + klass.superclass.type)
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
			var string = persistentCopy.definition;
			string = string.replace(/[\\]/g, '')
			string = string.replace(/"+\{/g, '{')
			string = string.replace(/\}"+/g, '}')
			var def = JSON.parse(string);
			return ctor[ctorMethodName](def, argIfAny)
		}

		if (persistentCopy.isRelay) {
			var delegate = this.getSerializer().patchObj(persistentCopy.delegate);
			instance = createInstance(Relay, 'newInstance', delegate);
		}

		if (persistentCopy.isPlainRecord) {
			// debugger
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
Object.extend(lively.persistence.Serializer, {
	jsonWorldId: 'LivelyJSONWorld',
	changeSetElementId: 'WorldChangeSet',
	serialize: function(obj, optPlugins, optSerializer) {
		var serializer = optSerializer || ObjectGraphLinearizer.forLively();
		if (optPlugins) optPlugins.forEach(function(plugin) { serializer.addPlugin(plugin) });
		var json = serializer.serialize(obj);
		return json;
	},

	serializeWorld: function(world) {
		var doc = new Importer().getBaseDocument(); // FIXME
		return this.serializeWorldToDocument(world, doc);
	},

	serializeWorldToDocument: function(world, doc) {
		return this.serializeWorldToDocumentWithSerializer(world, doc, ObjectGraphLinearizer.forLively());
	},
	serializeWorldToDocumentWithSerializer: function(world, doc, serializer) {
		// FIXME remove previous meta elements - is this really necessary?
		var metaElement;
		while (metaElement = doc.getElementsByTagName('meta')[0])
			metaElement.parentNode.removeChild(metaElement)

		// FIXME remove system dictionary
		var sysDict = (doc.getElementById ? doc.getElementById('SystemDictionary') : doc.selectSingleNode('//*[@id="SystemDictionary"]'));
		if (sysDict) sysDict.parentNode.removeChild(sysDict);

		// serialize changeset
		var cs = ChangeSet.fromWorld(world)
		if (!UserAgent.isIE) {
			var csElement = doc.importNode(cs.getXMLElement(), true),
				metaCSNode = XHTMLNS.create('meta');
		} else { // FIX for IE9+
			// mr: this is a real IE hack!
			var helperDoc = new ActiveXObject('MSXML2.DOMDocument.6.0');
			helperDoc.loadXML(new XMLSerializer().serializeToString(cs.getXMLElement()));
			var csElement = doc.importNode(helperDoc.firstChild, true),
				metaCSNode = doc.createNode(1, 'meta', Namespace.XHTML);
		}
		metaCSNode.setAttribute('id', this.changeSetElementId);
		metaCSNode.appendChild(csElement);

		// serialize world
		var json = this.serialize(world, null, serializer);
		if (doc instanceof Document)
			var metaWorldNode = XHTMLNS.create('meta');
		else // FIX for IE9+
			var metaWorldNode = doc.createNode(1, 'meta', Namespace.XHTML);
		metaWorldNode.setAttribute('id', this.jsonWorldId)
		metaWorldNode.appendChild(doc.createCDATASection(json))

		var head = doc.getElementsByTagName('head')[0] || doc.selectSingleNode('//*["head"=name()]');
		head.appendChild(metaCSNode);
		head.appendChild(metaWorldNode);

		return doc;
	
	},
	deserialize: function(json, optDeserializer) {
		var deserializer = optDeserializer || ObjectGraphLinearizer.forLively();
		var obj = deserializer.deserialize(json);
		return obj;
	},

	deserializeWorldFromDocument: function(doc) {
		var worldMetaElement = doc.getElementById(this.jsonWorldId);
		if (!worldMetaElement)
			throw new Error('Cannot find JSONified world when deserializing');
		var serializer = ObjectGraphLinearizer.forLively(),
			json = worldMetaElement.textContent,
			world = serializer.deserialize(json);
		return world;
	},

	deserializeWorldFromJso: function(jso) {
		var serializer = ObjectGraphLinearizer.forLively(),
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

	parseJSON: function(json) {
		return new ObjectGraphLinearizer().parseJSON(json);
	},

});

}) // end of module