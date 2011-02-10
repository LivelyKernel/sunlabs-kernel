module('lively.OldBase').requires().toRun(function() {

// Relays and the other stuff

Object.subclass('Record', {

	description: "abstract data structure that maps getters/setters onto DOM properties or plain JS objects",
	definition: "none yet",
	// Note: can act as a mixin, so no instance state!

	initialize: function(rawNode, spec) {
		this.rawNode = rawNode; // DOM or plain JS Object
		Properties.forEachOwn(spec, function(key, value) { 
			this["set" + key].call(this, value); 
		}, this);
	},
	
	newRelay: function(spec) {
		return Relay.newInstance(spec, this);
	},

	addObserver: function(dep, optForwardingSpec) {
		if (optForwardingSpec) {
			// do forwarding
			dep = Relay.newInstance(optForwardingSpec, dep);
		}
		// find all the "on"<Variable>"Update" methods of dep
		for (var name in dep) {
			var match = name.match(/on(.*)Update/);
			if (match) {
				var varname = match[1];
				if (!this["set" + varname])
					throw new Error("cannot observe nonexistent variable " + varname);
				Record.addObserverTo(this, varname, dep);
			}
		}
	},

	// dep may be the relay or relay.delegate, can be called with dep, dep and fielName, or only with fielName
	removeObserver: function(dep, fieldName) {
		if (fieldName && !this[fieldName + '$observers']) {
			console.log('Tried to remove non existing observer:' + fieldName + '$observers');
			return;
		};
		if (fieldName && !dep) { // remove all abservers from this field
			this[Record.observerListName(fieldName)] = null;
			return;
		};
		var observerFields = fieldName ?
			[Record.observerListName(fieldName)] :
			Object.keys(this).select(function(ea) { return ea.endsWith('$observers') });
		observerFields.forEach(function(ea) {
			this[ea] = this[ea].reject(function(relay) { return relay === dep || relay.delegate === dep });
		}, this);
	},

	addObserversFromSetters: function(reverseSpec, dep, optKickstartUpdates) {
		var forwardSpec = {};
		Properties.forEachOwn(reverseSpec, function each(key, value) {
			if (Object.isString(value.valueOf())) {
				if (!value.startsWith("+")) // if not write only, get updates
					forwardSpec[value.startsWith("-") ? value.substring(1) : value] = "!" + key;
			} else if (value.mode !== '+') {
				var spec = forwardSpec[value.name] =  {};
				spec.name = "!" + key;
				// FIXME: Q&A the following
				spec.from = value.from;
				spec.to = value.to;
			}
		});
		// FIXME: sometimes automatic update callbacks are not desired!
		this.addObserver(dep, forwardSpec);
		function callUpdate(self, key, value, from) {
			var target = "on" + key + "Update";
			var source = "get" + value;
			// trigger updates
			try {
				var tmp = self[source].call(self);
				dep[target].call(dep, from ? from(tmp) : tmp);
			} catch (er) {
				console.log("on kickstart update: " + er + " on " + dep + " " + target
				+ " mapping to " + source + " " + er.stack);
			}
		}

		if (!optKickstartUpdates) return;
		Properties.forEachOwn(reverseSpec, function each(key, value) {
			if (Object.isString(value.valueOf())) {
				if (!value.startsWith("+")) {
					if (value.startsWith("-")) value = value.substring(1);
					callUpdate(this, key, value, value.from);
				}
			} else if (value.mode !== '+') {
				callUpdate(this, key, value.name, value.from);
			}
		}, this);
	},


	toString: function() {
		return "#<Record{" + String(JSON.serialize(this.definition)) + "}>";
	},

	create: function(bodySpec) { // called most likely on the prototype object
		var klass = this.constructor.subclass.apply(this.constructor);
		//console.log('got record type ' + this.constructor.name);
		klass.addMethods(Record.extendRecordClass(bodySpec));
		klass.prototype.definition = bodySpec;
		return klass;
	},
	
	// needed for adding fields for fabric
	addField: function(fieldName, coercionSpec, forceSet) {
		var spec = {}; spec[fieldName] = coercionSpec || {};
		this.constructor.addMethods(new Record.extendRecordClass(spec));
		this.definition[fieldName]= spec[fieldName];
		if (!forceSet) return;
		// does this do anything now?
		this['set' + fieldName] = this['set' + fieldName].wrap(function(proceed, value, optSource, force) {
			proceed(value, optSource, true);
		})
	}
	
});


Record.subclass('PlainRecord', {
	getRecordField: function(name) { return this.rawNode[name] },

	setRecordField: function(name, value) { return this.rawNode[name] = value },

	removeRecordField: function(name) { delete this.rawNode[name] }
});

Object.extend(Record, {
	
	newPlainInstance: function(spec) {
		var argSpec = {};
		var fieldSpec = {};
		Properties.forEachOwn(spec, function (key, value) {
			fieldSpec[key] = {};
			argSpec[key] = value;
		});
		return this.newInstance(fieldSpec, argSpec, {});
	},

	newNodeInstance: function(spec) { // backed by a DOM node
		var argSpec = {};
		var fieldSpec = {};
		Properties.forEachOwn(spec, function (key, value) {
			fieldSpec[key] = {};
			argSpec[key] = value;
		});
		return this.newInstance(fieldSpec, argSpec, NodeFactory.create("record"));
	},

	newInstance: function(fieldSpec, argSpec, optStore) {
		if (arguments.length < 2) throw new Error("call with two or more arguments");
		var storeClass;
		if (!optStore) {
			storeClass = lively.data.DOMNodeRecord; // FXIME forward reference
			optStore = NodeFactory.create("record"); // FIXME flat JavaScript instead by default?
		} else {
			storeClass = optStore instanceof Global.Node ? lively.data.DOMNodeRecord : PlainRecord;
		}

		var Rec = storeClass.prototype.create(fieldSpec);
		return new Rec(optStore, argSpec);
	},

	extendRecordClass: function(bodySpec) {
		var def = {};
		Properties.forEachOwn(bodySpec, function(name, value) {
			Record.addAccessorMethods(def, name, value);
		});
		return def;
	},

	addAccessorMethods: function(def, fieldName, spec) {
		dbgOn(fieldName.startsWith("set") || fieldName.startsWith("get")); // prolly a prob
		if (spec.mode !== "-")
			def["set" + fieldName] = this.newRecordSetter(spec.name || fieldName, spec.to, spec.byDefault);
		if (spec.mode !== "+")
			def["get" + fieldName] = this.newRecordGetter(spec.name || fieldName, spec.from, spec.byDefault);
	},

	
	observerListName: function(name) { return name + "$observers"},

	addObserverTo: function(rec, varname, dep) {
		var deps = rec[Record.observerListName(varname)];
		if (!deps) deps = rec[Record.observerListName(varname)] = [];
		else if (deps.indexOf(dep) >= 0) return;
		deps.push(dep);
	},
   
	notifyObserversOf: function(rec, fieldName, coercedValue, optSource, oldValue, force) {
		var deps = rec[Record.observerListName(fieldName)];
		if (!force && (oldValue === coercedValue)) {
			// console.log("--- notifyObserversOf stops here: " + rec + ", "+ fieldName + ", " + coercedValue);
			return;
		};
		var updateName = "on" + fieldName + "Update";
		if (!deps) return;
		for (var i = 0; i < deps.length; i++) {
			var dep = deps[i];
			// shouldn't this be uncoerced value? ......
			var method = dep[updateName];
			// console.log('updating  ' + updateName + ' in ' + Object.keys(dep));
			// "force" should not be propageted
			method.call(dep, coercedValue, optSource || rec /*rk: why pass rec in ?*/);
		}
	},

	newRecordSetter: function newRecordSetter(fieldName, to, byDefault) {
		var name = fieldName;
		return function recordSetter(value, optSource, optForce) {
			// console.log("set " + value + ", " + optSource + ", " + force)
			var coercedValue;
			if (value === undefined) {
				this.removeRecordField(name);
			} else {
				if (value == null && byDefault) value = byDefault;
				coercedValue = to ? to(value) : value;
				var oldValue = this.getRecordField(name);
				this.setRecordField(name, coercedValue);
			}
			Record.notifyObserversOf(this, name, coercedValue, optSource, oldValue, optForce);
			return coercedValue;
		}
	},
	
	newRecordGetter: function newRecordGetter(name, from, byDefault) {
		return function recordGetter() {
			if (this === this.constructor.prototype) // we are the prototype? not foolproof but works in LK
				return byDefault; 
			if (!this.rawNode)
				throw new Error("no rawNode");
			var value = this.getRecordField(name);
			if (!value && byDefault) return byDefault;
			else if (from) return from(value);
			else return value;
		}
	},

	createDependentObserver: function(target, computedProperty, baseProperties /*:Array*/) {
		// create an observer that will trigger the observers of
		// computedProperty whenever one of the baseProperties changes
		// The returned observer has to be added to target (as in target.addObserver

		var getterName = "get" + computedProperty;
		if (!target[getterName])
			throw new Error('unknown computedProperty ' + computedProperty);

		function notifier(value, source, record) {
			var newValue = record[getterName].call(record);
			return Record.notifyObserversOf(record, computedProperty, newValue);
		}
		var observer = {};
		baseProperties.forEach(function(prop) {
			// FIXME check if target has field "get" + prop
			observer["on" + prop + "Update"] = notifier;
		});
		return observer;
	},

});

Object.subclass('Relay', {
	documentation: "Property access forwarder factory",
	initialize: function(delegate) {
		// FIXME here a checker could verify this.prototype and check
		// that the delegate really has all the methods
		this.delegate = delegate; 
	}
});

Object.extend(Relay, {

	newRelaySetter: function newRelaySetter(targetName, optConv) {
		return function setterRelay(/*...*/) {
			if (!this.delegate)
				new Error("delegate in relay not existing " + targetName);
			var impl = this.delegate[targetName];
			if (!impl)
				throw dbgOn(new Error("delegate " + this.delegate + " does not implement " + targetName));
			var args = arguments;
			if (optConv) {
				args = $A(arguments);
				args.unshift(optConv(args.shift()));
			}
			return impl.apply(this.delegate, args);
		}
	},

	newRelayGetter: function newRelayGetter(targetName, optConv) {
		return function getterRelay(/*...*/) {
			if (!this.delegate)
				throw dbgOn(new Error("delegate in relay not existing " + targetName)); 
			var impl = this.delegate[targetName];
			if (!impl)
				throw dbgOn(new Error("delegate " + this.delegate + " does not implement " + targetName)); 
			var result = impl.apply(this.delegate, arguments);
			return optConv ? optConv(result) : result;
		}
	},

	newRelayUpdater: function newRelayUpdater(targetName, optConv) {
		return function updateRelay(/*...*/) {
			var impl = this.delegate[targetName];
			if (!impl)
				throw dbgOn(new Error("delegate " + this.delegate + " does not implement " + targetName)); 
			return impl.apply(this.delegate, arguments);
		}
	},

	handleStringSpec: function(def, key, value) {
		dbgOn(value.startsWith("set") || value.startsWith("get")); // probably a mixup

		if (value.startsWith("!")) {
			// call an update method with the derived name
			def["on" + key + "Update"] = Relay.newRelayUpdater("on" + value.substring(1) + "Update");
			// see below
			def["set" + key] = Relay.newRelayUpdater("on" + value.substring(1) + "Update");
		} else if (value.startsWith("=")) {
			// call exactly that method
			def["on" + key + "Update"] = Relay.newRelayUpdater(value.substring(1));
			// FIXME: e.g. closeHalo is a ButtonMorph,
			// this.closeHalo.connectModel(Relay.newInstance({Value: "=onRemoveButtonPress"}, this)); should call
			// this.onRemoveButtonPress()
			// the method newDelegatorSetter --> setter() which is triggered from setValue() of the button would only look
			// for the method setValue in def, but there is onyl onValueUpdate, so add also setValue ...
			def["set" + key] = Relay.newRelayUpdater(value.substring(1));
		} else {
			if (!value.startsWith('-')) { // not read-only
				var stripped = value.startsWith('+') ? value.substring(1) : value;
				def["set" + key] = Relay.newRelaySetter("set" + stripped);
			}
			if (!value.startsWith('+')) { // not write-only
				var stripped = value.startsWith('-') ? value.substring(1) : value;
				def["get" + key] = Relay.newRelayGetter("get" + stripped);
			}
		}
	},


	handleDictSpec: function(def, key, spec) { // FIXME unused
		var mode = spec.mode;
		if (mode === "!") {
			// call an update method with the derived name
			def["on" + key + "Update"] = Relay.newRelayUpdater("on" + spec.name + "Update", spec.from);
		} else if (mode === "=") {
			// call exactly that method
			def["on" + key + "Update"] = Relay.newRelayUpdater(spec.name, spec.from);
		} else {
			if (mode !== '-') { // not read-only
				def["set" + key] = Relay.newRelaySetter("set" + spec.name, spec.to);
			}
			if (mode !== '+') { // not write-only
				def["get" + key] = Relay.newRelayGetter("get" + spec.name, spec.from);
			}
		}
	},

	create: function(args) {
		var klass = Relay.subclass();
		var def = {
			definition: Object.clone(args), // how the relay was constructed
			copy: function(copier) {
				var result =  Relay.create(this.definition);
				copier.shallowCopyProperty("delegatee", result, this);
				return result
			},
			toString: function() {
				return "#<Relay{" + String(JSON.serialize(args)) + "}>";
			}
		};
		Properties.forEachOwn(args, function(key, spec) { 
			if (Object.isString(spec.valueOf()))
				Relay.handleStringSpec(def, key, spec); 
			else 
			Relay.handleDictSpec(def, key, spec);
		});

		klass.addMethods(def);
		return klass;
	},

	newInstance: function(spec, delegate) {
		var Fwd = Relay.create(spec); // make a new class
		return new Fwd(delegate); // now make a new instance
	},
	
	// not sure if it belongs in Relay	  
	newDelegationMixin: function(spec) {

		function newDelegatorGetter (name, from, byDefault) {
			var methodName = "get" + name;
			return function getter() {
				var m = this.formalModel;
				if (!m)
					return this.getModelValue(methodName, byDefault);
				var method = m[methodName];
				if (!method) return byDefault;
				var result = method.call(m);
				return (result === undefined) ? byDefault : (from ? from(result) : result);
			}
		}

		function newDelegatorSetter(name, to) {
			var methodName = "set" + name;
			return function setter(value, force) {
				var m = this.formalModel;
				if (!m) 
					return this.setModelValue(methodName, value);
				var method = m[methodName];
				// third arg is source, fourth arg forces relay to set value even if oldValue === value
				return method && method.call(m, to ? to(value) : value, this, force);
			}
		}

		var klass = Object.subclass();

		if (spec instanceof Array) {
			spec.forEach(function(name) {
				if (!name.startsWith('-')) { // not read-only
					var stripped = name.startsWith('+') ? name.substring(1) : name;
					klass.prototype["set" + stripped] = newDelegatorSetter(stripped);
				}
				if (!name.startsWith('+')) { // not write-only
					var stripped = name.startsWith('-') ? name.substring(1) : name;
					klass.prototype["get" + stripped] = newDelegatorGetter(stripped);
				}
			});
		} else {
			Properties.forEachOwn(spec, function(name, desc) {
				var mode = desc.mode;
				if (mode !== "-")
					klass.prototype["set" + name] = newDelegatorSetter(name, desc.to);
				if (mode !== "+")
					klass.prototype["get" + name] = newDelegatorGetter(name, desc.from, desc.byDefault);
			});
		}
		return klass;
	}

});

// --------------------
// --- other stuffff
// --------------------

namespace('lively.data');
// FIXME the following does not really belong to Base should be somewhere else
Record.subclass('lively.data.DOMRecord', {
	description: "base class for records backed by a DOM Node",
	noShallowCopyProperties: ['id', 'rawNode', '_livelyDataWrapperId_'],

	initialize: function($super, store, argSpec) {
		$super(store, argSpec);
		this.setId(this.newId());
		var def = this.rawNode.appendChild(NodeFactory.create("definition"));
		def.appendChild(NodeFactory.createCDATA(String(JSON.serialize(this.definition))));
	},

	deserialize: function(importer, rawNode) {
		this.rawNode = rawNode;
	},

	getRecordField: function(name) { 
		dbgOn(!this.rawNode || !this.rawNode.getAttributeNS);
		var result = this.rawNode.getAttributeNS(null, name);
		if (result === null) return undefined;
		else if (result === "") return null;
		if (result.startsWith("json:")) return Converter.fromJSONAttribute(result.substring("json:".length));
		else return result;
	},

	setRecordField: function(name, value) {
		if (value === undefined) {
			throw new Error("use removeRecordField to remove " + name);
		}
		if (value && Converter.needsJSONEncoding(value)) {
			value = "json:" + Converter.toJSONAttribute(value);
		}

		this.rawNode.setAttributeNS(null, name, value || "");
		return value;
	},

	removeRecordField: function(name) {
		return this.rawNode.removeAttributeNS(null, name);
	},

	copyFrom: function(copier, other) {
		// console.log("COPY DOM RECORD")
		if (other.rawNode) this.rawNode = other.rawNode.cloneNode(true);
		this.setId(this.newId());
		copier.addMapping(other.id(), this);

		copier.shallowCopyProperties(this, other);
		
		return this; 
	},

});

lively.data.DOMRecord.subclass('lively.data.DOMNodeRecord', {
	documentation: "uses nodes instead of attributes to store values",

	getRecordField: function(name) { 
		var fieldElement = this[name + "$Element"];
		if (fieldElement) {
			if (lively.data.Wrapper.isInstance(fieldElement)) {
				return fieldElement; // wrappers are stored directly
			};			
			if (LivelyNS.getAttribute(fieldElement, "isNode")) return fieldElement.firstChild; // Replace with DocumentFragment
			var value = fieldElement.textContent;
			if (value) {
			var family = LivelyNS.getAttribute(fieldElement, "family");
			if (family) {
				var klass = Class.forName(family);
				if (klass) throw new Error('unknown type ' + family);
				return klass.fromLiteral(JSON.unserialize(value, Converter.nodeDecodeFilter));
				} else {
					if (value == 'NaN') return NaN;
					if (value == 'undefined') return undefined;
					if (value == 'null') return null;
					// jl: fixes a bug but wrapperAndNodeDecodeFilter is not clever enought... 
					// so waiting for pending refactoring
					// return JSON.unserialize(value, Converter.wrapperAndNodeDecodeFilter);
					return JSON.unserialize(value);
				}
			}
		} else {
			// console.log('not found ' + name);
			return undefined;
		}
	},
	
	setRecordField: function(name, value) {
		if (value === undefined) {
			throw new Error("use removeRecordField to remove " + name);
		}
		var propName = name + "$Element"; 
		var fieldElement = this[propName];
		if (fieldElement && fieldElement.parentElement === this.rawNode) {
			this.rawNode.removeChild(fieldElement);
		}
		
		if (lively.data.Wrapper.isInstance(value)) { 
			this[propName] = value; // don't encode wrappers, handle serialization somewhere else 
		} else {
			fieldElement = Converter.encodeProperty(name, value);
			if (fieldElement) this.rawNode.appendChild(fieldElement);
			else console.log("failed to encode " + name + "= " + value);
			this[propName] = fieldElement;
		}
		return value;
		// console.log("created cdata " + fieldElement.textContent);
	},
	
	removeRecordField: function(name) {
		var fieldElement = this[name + "$Element"];
		if (fieldElement) {
			try { // FIXME ... argh!!!
				this.rawNode.removeChild(fieldElement);
			} catch(e) {
				console.warn('Cannot remove record field' + name + ' of ' + this + ' because ' + e);
			}
			delete this.fieldElement;
		}
	},

	deserialize: function(importer, rawNode) {
		this.rawNode = rawNode;
	
		var bodySpec = JSON.unserialize(rawNode.getElementsByTagName('definition')[0].firstChild.textContent);
		this.constructor.addMethods(Record.extendRecordClass(bodySpec));
		this.definition = bodySpec;
	
		$A(rawNode.getElementsByTagName("field")).forEach(function(child) {
				// this[name + "$Element"] = child.getAttributeNS(null, "name");
			this[child.getAttributeNS(null, "name") + "$Element"] = child;
		}, this);
	},

	copyFrom: function($super, copier, other) {
		$super(copier, other);
		this.constructor.addMethods(Record.extendRecordClass(other.definition));
		$A(this.rawNode.getElementsByTagName("field")).forEach(function(child) {
			this[child.getAttributeNS(null, "name") + "$Element"] = child;
		}, this);
		return this; 
	},

	updateDefintionNode: function() {
		var definitionNode = this.rawNode.getElementsByTagName("definition")[0];
		definitionNode.removeChild(definitionNode.firstChild);
		definitionNode.appendChild(NodeFactory.createCDATA(String(JSON.serialize(this.definition))));  
	},
	
	addField: function($super, fieldName, coercionSpec, forceSet) {
		$super(fieldName, coercionSpec, forceSet);
		this.updateDefintionNode();
	}
	
});

// note: the following happens later
//Class.addMixin(DOMRecord, lively.data.Wrapper.prototype);

Record.subclass('lively.data.StyleRecord', {
	description: "base class for records backed by a DOM Node",
	getRecordField: function(name) { 
		dbgOn(!this.rawNode || !this.rawNode.style);
		var result = this.rawNode.style.getPropertyValue(name);

		if (result === null) return undefined;
		else if (result === "") return null;
		else return result;
	},

	setRecordField: function(name, value) {
		dbgOn(!this.rawNode || !this.rawNode.style);
		if (value === undefined) {
			throw new Error("use removeRecordField to remove " + name);
		}
		this.rawNode.style.setProperty(name, value || "", "");
		return value;
	},

	removeRecordField: function(name) {
		dbgOn(!this.rawNode || !this.rawNode.style);
		return this.rawNode.style.removeProperty(name);
	}

});


Object.subclass('lively.data.Bind', {
	// unify with the record mechanism
	
	// note that Bind could specify which model to bind to, not just the default one
	initialize: function(varName, kickstart, debugString) {
		this.varName = varName;
		this.kickstart = kickstart;
		this.key = null;
		this.debugString = debugString;
		this["on" + varName + "Update"] = this.update;
	},

	update: function(value) {
		if (Object.isNumber(this.key)) {
			console.log('cannot notify owner of array ' + this.target + ' to update element ' + this.key);
			return;
		}
		var method = this.target["set" + this.key];
		if (!method) { console.warn('no method for binding ' + this.varName + " to " + this.key); return }
		if (this.debugString) console.log('triggering update of ' + this.varName  + " to " + value 
		+ " context " + this.debugString);
		method.call(this.target, value);
	},


	get: function(model) {
		if (!model) return undefined;
		var method = model["get" + this.varName];
		dbgOn(!method);
		var result = method.call(model);
		if (this.debugString) 
			console.log('Bind to:' + this.varName  + " retrieved model value " + result	 
		+ ' context '  + this.debugString);
		return result;
	},

	toString: function() {
		return "{Bind to: " + this.varName + "}";
	},

	hookup: function(target, model) {
		this.target = target;
		model.addObserver(this);
		if (this.kickstart)
			this.update(this.get(model)); // kickstart
	}
});

Object.extend(lively.data.Bind, {
	fromLiteral: function(literal) {
		return new lively.data.Bind(literal.to, literal.kickstart || false, literal.debugString);
	}	
});



Object.subclass('lively.data.Resolver', {
	description: "resolves literals to full-blown objects",
	storedClassKey: '$', // type info, missing in 
	variableBindingKey: '$var',
	defaultSearchPath: [Global],

	link: function(literal, binders, key, variableBindings, optSearchPath, optModel) {
		var constr;
		var type = literal[this.storedClassKey];
		if (type) {
			var path = optSearchPath || this.defaultSearchPath;
			for (var i = 0; i < path.length; i++)  {
				constr = path[i][type];
				if (constr) 
					break;
			}
			//console.log('was looking for ' + type + ' in ' +	path + ' and found ' + constr);
		} else if (literal.constructor !== Object) { 
			// not of the form {foo: 1, bar: "baz"},  return it as is
			return literal; 
		}

		var initializer = {}; 
		var subBinders = [];
		for (var name in literal) {
			if (name === this.storedClassKey) continue;
			if (name === this.variableBindingKey) continue;
			if (!literal.hasOwnProperty(name)) continue;
			var value = literal[name];
			if (value === null || value === undefined)
				initializer[name] = value;
			else switch (typeof value) {
				case "number":
				case "string":
				case "boolean":
				initializer[name] = value;
				break;
				case "function":
				break; // probably an error
				case "object": {
					if (value instanceof Array) {
						var array = initializer[name] = [];
						for (var i = 0; i < value.length; i++)	{
							array.push((this.link(value[i], subBinders, i, variableBindings, optSearchPath, optModel)));
						}
					} else {
						initializer[name] = this.link(value, subBinders, name, variableBindings, optSearchPath, optModel);
					}
					break;
				}
				default: 
				throw new TypeError('unexpeced type of value ' + value);
			}
		}

		var reified;
		if (type) {
			if (!constr) throw new Error('no class named ' + type);
			if (!constr.fromLiteral) throw new Error('class ' + constr.name + ' does not support fromLiteral');
			reified = constr.fromLiteral(initializer, optModel);
			if (reified instanceof lively.data.Bind) {
				reified.key = key;
				binders.push(reified);
				reified = reified.get(optModel);
			} else {
				subBinders.forEach(function(binder) {
					binder.hookup(reified, optModel);
				});
			}

		} else {
			//console.log('reified is ' + (initializer && initializer.constructor) + " vs  " + literal);
			reified = initializer;
		}

		if (literal[this.variableBindingKey]) {
			var varName = literal[this.variableBindingKey];
			//console.log('binding ' + varName + ' to ' + reified + " on " + variableBindings);
			variableBindings[varName] = reified;
		}

		return reified;
	}
});

});