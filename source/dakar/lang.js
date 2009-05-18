// Ideally this would be the single top level variable introduced into the system.
// the name fx is short and generic. No reference to existing products necessarily implied.
// Should not make assumptions about other libraries, besides standard JS libraries (incl ES3.1)
// Could act as a capability, i.e, if the fx object is not available, various runtime things can't happen

var fx = (function() { // scope function


    var slotDescriptorSetKey = ".slots";

    function getOwnSlots(target) {
	return target.hasOwnProperty(slotDescriptorSetKey) ? target[slotDescriptorSetKey] : undefined;
    }

    function getSlots(target) {
	return target[slotDescriptorSetKey];
    }
    
    function defineSlots(target, descriptorSet) {
	for (var name in descriptorSet) {
	    if (descriptorSet.hasOwnProperty(name))
		defineSlot(target, name, descriptorSet[name]);
	}
	return target;
    }

    var slotDescriptorSchema = {
	type: "object",
	properties: {
	    override: {
		type: "boolean",
		optional: true
	    },
	    value: {
		type: "any",
		optional: true
	    },
	    getter: {
		optional: true
	    },
	    setter: {
		optional: true
	    }
	}
    };

    var Base; // forward definition
    //new slot, i.e., member (re)definition pattern, inspired by ES3.1 Object.defineProperty
    function defineSlot(target, name, descriptor) {
	if (typeof descriptor !== 'object') throw new TypeError('descriptor is not an object');
	if (name === "constructor") {
	    // we might check that we're not trying to override a constructor,
	    // unless we're defining a mixin, in which case it's OK
	}
	// FIXME check overriding a getter/setter with a regular property, probably incorrect
	var previousValue = target[name];
	if (previousValue !== undefined) {
	    if (!target.hasOwnProperty(name)) {
		if (!descriptor.override && name !== 'constructor') {
		    // name is inherited and not defined locally, we want to shadow it but don't declare it
		    throw new Error('undeclared override of ' + name);
		} else if (descriptor.value instanceof Function) { // note that Safari regexps may be functions ..
		    if(!(previousValue instanceof Function)) 
			throw new Error('overriding non-function ' + name + ' with a function');
		    var defined = descriptor.value;
		    // FIXME: alloc new descriptor instead of modifying the old one?
		    descriptor.value = function wrapper() {
			Array.prototype.unshift.call(arguments, previousValue.bind(this));
			return defined.apply(this, arguments);
		    }
		} 
	    } // otherwise we're overwriting own property, not present up the proto chain
	    
	} else {
	    // property is not defined anywhere
	    if (descriptor.override == true) {
		throw new Error('property ' + name + ' declared as override but nothing to override');
	    }
	}
	
	// we define schemas on the object (and not its constructor), since individual object's schema may
	// differ from the schema of its "constructor family" (the set of all the objects defined by a 
	// given constructor.
	
	var slots = getSlots(target);
	if (!getOwnSlots(target)) {
	    // lazily create .slots, make use the existing .slots as parent
	    // constructors have each their own .slots, non-constructors inherit through chain
	    if (!slots && !(target instanceof Function)) throw new Error();
	    slots = Object.create(slots);
	    // now create the special field holding the descriptor set
	    Object.defineProperty(target, slotDescriptorSetKey, { enumerable: false, value: slots});
	}
	// FIXME validate descriptor
	if (this.dojox) {
	    var result = dojox.json.schema.validate(descriptor, slotDescriptorSchema);
	    if (!result.valid) print('property ' + name + " errors "  + dojox.json.ref.toJson(result));
	}
	slots[name] = descriptor;// ideally this would be a Base, but we don't have it yet
	
	return Object.defineProperty(target, name, descriptor);
	// react to descriptor.replace, allow local replace of previously defined function?
    }


    function extend(base, slots) {
	//creates a new class,
	// if derived not specified, lets just call the argument, which should be the superconstructor,
	// with no arguments
	// note that the .constructor property will shadow the inherited Object.prototype.constructor, 
	// which should be OK
	var derived = slots && slots.constructor && slots.constructor.value;
	var constr;
	if (derived) {
	    constr = function(/*...*/) {
		// this is initialized to a new object
		var args = Array.slice(arguments);
		args.unshift(base.bind(this));
		derived.apply(this, args);
		return this;
	    }
	} else {
	    // essentially just clone the base constr
	    constr = function(/*...*/) {
		base.apply(this, arguments);
	    }
	}
	
	constr.prototype = Object.create(base.prototype);
	if (!slots || slots.constructor === Object.prototype.constructor) {
	    // no defined constructor, i.e., slots has only the constructor property inherited from 
	    // Object.prototype
	    constr.prototype.constructor = constr;
	}
	// else bootstrap.defineSlotsOf will handle the case
	Object.defineProperties(constr, BasicMixin);
	Object.defineProperties(constr, ConstructorMixin);
	defineSlots(constr.prototype, slots);
	return constr;
    }
	
    function mixin(base, slots) {    
	// return new class, with the mixin mixed in. 
	// Uses prototype chaining, so mixin properties will shadow base properties
	
	var hook = slots && slots.constructor && slots.constructor.value;
	function constr() {
	    base.apply(this, arguments);
	    hook && hook.call(this);
	}
	constr.prototype = Object.create(base.prototype);
	if (!slots || slots.constructor === Object.prototype.constructor) {
	    // no defined constructor, i.e., slots has only the constructor property inherited from 
	    // Object.prototype
	    constr.prototype.constructor = constr;
	}
	defineSlots(constr.prototype, slots);
	Object.defineProperties(constr, BasicMixin);
	return Object.defineProperties(constr, ConstructorMixin); 
    }

    var BasicMixin = { // both prototpes and our constructors functions get it.
	defineSlots: {
	    value: function(descriptorSet) {
		return defineSlots(this, descriptorSet);
	    }
	},
 
       respondsTo: {
           value: function(methodName) {
               return (this[methodName] instanceof Function);
           }
       },
       
       tryToPerform:  {
           value: function(methodName /* ...*/) {
               if (!methodName) return undefined;
               Array.prototype.shift.apply(arguments);
               if (this.respondsTo(methodName)) {
                   return this[methodName].apply(this, arguments);
               }
               return undefined;
           }
       }
    };

    var ConstructorMixin = {
	// every synthetic constructor will get these
	extend: { 
	    value: function(slots) {
		return extend(this, slots);
	    }
	},
	mixin: {
	    value: function(descriptorSet) {
		return mixin(this, descriptorSet);
	    }
	},

	toString: {
	    override: true,
	    value: function() {
		return "[Constructor]";
	    }
	}
    };

    
    // base class with lively conveniences built-in
    // note that it's a value
    var Base = extend(function(spec) {
	// we're avoiding using defineSlots, it needs baseSlots
	spec && this.adopt(spec);
    });

    Object.defineProperties(Base.prototype, BasicMixin);

    // now we can define base slots
    var SlotSet = Base.extend();
    Base.prototype[slotDescriptorSetKey] = new SlotSet();
    Base[slotDescriptorSetKey] = new SlotSet();
    
    var Bind = null;

    // now Base can define its slots itself.
    Base.prototype.defineSlots({
	defineSlot: {
	    description: "convenience method, redirects to Base.defineSlot",
	    value: function(name, descriptor) {
		return defineSlot(this, name, descriptor);
	    }
	},

	toString: {
	    override: true,
	    value: function() {
		return "[fx]"; // FIXME?
	    }
	},

	inspect: {
	    value: function() {
		return dojox.json.ref.toJson(this, true);
	    }
	},

	getCumulativeValue: {
	    value: function(name) {
		// sometimes the value of a multivalued slot should notionally be the union of the values
		// of the slot for all the objects in the prototype chain
		var values = [];
 		for (var obj = this; obj && obj[name]; obj = Object.getPrototypeOf(obj)) {
		    if (obj.hasOwnProperty(name)) {
			values = values.concat(obj[name]);
		    }
		}
		return values;
	    }
	},

	beget: {
	    value: function(props) {
		var obj = Object.create(this);
		if (obj.initialize) obj.initialize();
		if (props) obj.adopt(props);
		return obj;
	    }
	},
	
	adopt: {
            definition: "make arguments's own properties receiver's own",
	    // FIXME: iterate in the lexical order of property definitions
            value: function(object, ignoreUnknown) {
		for (var name in object) {
		    if (object.hasOwnProperty(name)) {
			if (ignoreUnknown && (this[name] === undefined)) continue;
			var value = object[name];
			if (Bind && (value instanceof Bind))  { // early on Bind may be undefined
			    value.bindTo(this, name);
			    //print('set to ' + value.source[value.property]);
			} else 
			    this[name] = value;
		    }
		}
		return this;
            }
	},

	adoptResult: {
            definition: 'call the argument and adopt the result',
	    // in flux, consider renaming, attributes
            value: function(/* */) {
		var fun = arguments[arguments.length - 1];
		return this.adopt(fun.apply(undefined, Array.slice(arguments, 0, -1))); 
            }
	},
	
	query: { //different name?
	    definition: 'run a query and get result',
	    value: function(value) {
		if (typeof value === 'string')
		    return dojox.json.query(value, this);
 		else if (typeof value ===  'function')
		    return value.call(undefined, this); //?
		else throw new TypeError();
	    }
	}
	
    });
    
    
    defineSlots(Base, {

	getConstructorOf: {
	    value: function(target) {
		return Object.getPrototypeOf(target).constructor;
	    }
	},

	inspect: {
	    value: function(target) {
		if (!target) return String(target);
		if (!target.inspect) return dojox.json.ref.toJson(target, true);
		switch (typeof target.inspect) {
		case 'function':
		    return target.inspect();
		case 'object': // for the rare case of slot descriptors
		    if (target.inspect && (typeof target.inspect.value === 'function')) {
			// FIXME: what to return?
			return target.inspect.value.apply(target);
		    }  
		default:
		    throw new TypeError();
		}
	    }
	},

	clone: { 
	    description: "invoke the optional filter on every source member before assigning to target",
	    value: function(source, filter) { 
		var dest = Object.create(Object.getPrototypeOf(source));
		for (var name in source) 
		    if (source.hasOwnProperty(name)) {
			// doesn't handle getters and setters
			dest[name] = filter(source, name);
		    }
		return dest;
	    }
	},
	
	
	shallowCopy: {
	    description: "shallow clone",
	    value: function(source, optBlacklist) {
		function filter(source, name) {
		    if (optBlacklist && optBlacklist.indexOf(name) >= 0) return undefined;
		    else return source[name];
		}
		return Base.clone(source, filter);
	    }
	},
	
	deepCopy: { 
	    description: ["clone using a default deep cloner",
			  "not terribly efficient due to apparent lack of hashcodes in javascript"],
	    value: function(source, optBlacklist) {
		// consider fast path for objects that have hashcodes
		var visited = []; // visited.lastIndexOf(object) is the index of objects' copy in the copies array
		var copies = []; 
		function cloner(source, name) {
		    if (optBlacklist && optBlacklist.indexOf(name) >= 0) return undefined;
		    var object = source[name];
		    if (typeof object === 'object') {
			var index = visited.lastIndexOf(object); // ouch, array positions as hash codes
			if (index < 0) {
			    visited.push(object);
			    var copy = Base.clone(object, cloner);
			    copies.push(copy);
			    return copy;
			}  else return copies[index];
		    } else return object; // primitive
		}
		return this.clone(source, cloner);
	    }
	},
	
	visitPropertiesOf: { 
	    description: "visit all the own properties; untested",
	    value: function(object, visitor) { 
		for (var name in object) 
		    if (object.hasOwnProperty(name)) {
			// doesnt handle getters and setters
			visitor(object, name);
		    }
		return object;
	    }
	},
	
	visitAll: {
	    value: function(source, inspector) {
		// consider fast path for objects that have hashcodes
		var visited = []; 
		inspector = inspector || Functions.Empty;
		function visitor(object, name) {
		    var value = object[name];
		    // value is the value of the property
		    //var value = dereferencer(object, name); // pre-order visit
		    if (typeof value === 'object') {
			var index = visited.lastIndexOf(value); // ouch, array positions as hash codes
			if (index < 0) {
			    //print('visiting ' + value + ' with new id ' + visited.length);
			    index = visited.length;
			    visited.push(value);
			    inspector(object, name, index);
			    Base.visitPropertiesOf(value, visitor);
			} else {
			    inspector(object, name, index);
			    //print('not recursing into ' + value + ' with id ' + index);
			}
		    }  else {
			inspector(object, name, undefined);
		    }
		}
		return Base.visitPropertiesOf(source, visitor);
	    }
	}
    });

    var EventTarget = new Base({ 
	'.eventListeners': {
	    enumerable: false,
	    value: null
	},
	
	addEventListener: {
	    value: function(type, listener, useCapture) {
		var eventListeners = this['.eventListeners'] = this['.eventListeners'] || {};
		eventListeners[type] = eventListeners[type] || [];
		eventListeners[type].push(listener);
	    }
	},
	
	// TODO check the spec again
	removeEventListener: {
	    value: function(type, listener, useCapture) {
		var eventListeners =  this['.eventListeners'] = this['.eventListeners'] || {};
		var listeners = eventListeners[type];
		if (listeners && listeners.indexOf(listener) >= 0)
		    listeners.splice(listeners.indexOf(listener), 1);
		//TODO();
	    }
	},
	
	dispatchEvent: {
	    value: function(evt) {
		var listeners = this['.eventListeners'] && this['.eventListeners'][evt.type];
		evt['.currentTarget'] = this;
		if (listeners) listeners.forEach(function(l) { 
		    if (l instanceof Function) l.call(this, evt);
		    else l.handleEvent(evt); 
		});
		if (false) {
		    // FIXME who does the dispatch up?
		    if (this.parentNode && this.parentNode.dispatchEvent) { // FIXME DOM dependency
			if (!evt['.stoppedPropagation']) {
			    if (evt.type != 'mousemove') print('propagating up');
			    this.parentNode.dispatchEvent(evt);
			}
		    } 
		}
	    }
	}
    });
    
    Base.prototype.defineSlots(EventTarget);
    
    function makeObservable(source, property) {
	var descriptor = {};
	var pvtField = "." + property;
	
	var currentDesc = Object.getOwnPropertyDescriptor(source,  property);
	if (currentDesc) {
	    if (currentDesc.getter || currentDesc.setter) {
		print('has getter/setter for field ' + property + ', should check if it is an observable getter');
		return;
	    }
	}
	if (source[pvtField] !== undefined)  {
	    // now what? we want to move value to a 'secret' field but it's already defined?
	    // it could be defined in the prototype, which would probably be OK
	}
	// note that this way of binding will change only the
	// current instance, so if the prototype definition changes, the instance won't notice
	descriptor[pvtField] = {
	    value: source[property]
	};
	
	// FIXME: what if property already has getter and setter?
	// what if we'd want to remove getter and setter at a later time
	// what if we delete 'property' on object but the prototype already defines a different value
	// what if we'd like to share getter and setter function in object's prototype
	descriptor[property] = {
	    getter: function() {
		return this[pvtField];
	    },
	    setter: function(value) {
		var oldValue = this[pvtField];
		this[pvtField] = value;
		// FIXME forward reference
		this.dispatchEvent(new fx.dom.PropertyChangeEvent(this, property, oldValue, value));
	    }
	}
	source.defineSlots(descriptor);
    }
    
    Bind = Base.extend({
	// Bind will act as a handler
	constructor: {
	    value: function(inherited, source, property) {
		inherited();
		this.sourceProperty = property;
		this.source = source; 
		makeObservable(source, property);
		// the following makes 'source' broadcast updates to 'property'
	    }
	},
	
	dot: {
	    value: function(fieldName) {
		// FIXME unimplemented,  bind x.y.z -> new Bind(x, 'y').dot('z')
		// register for updates to field y of x, and whenever x.y changes, register for updates of x.y's value
		// registerFor(this.target[this.currentPath], fieldName)
		// this.currentPath += "." + fieldName
		return this;
	    }
	},
	
	handleEvent: {
	    value: function(evt) {
		if (evt.propertyName === this.sourceProperty) {
		    this.target[this.targetProperty] = evt.newValue;
		}
	    }
	},
	
	bindTo: {
	    value: function(target, name) {
		this.targetProperty = name;
		this.target = target;
		print('bind source property ' + this.sourceProperty + ' to target ' + name);
		target[this.targetProperty] = this.source[this.sourceProperty]; // initial value
		this.source.addEventListener('propertychange', this);
	    }
	}
    });


    var global = this;
    var Module = Base.extend({
	require: {
	    value: function(/**/) {
		for (var i = 0; i < arguments.length; i++) {
		    // FIXME make real file -> module mapping, make real loader
		    if (!global.fx[arguments[i]]) { // FIXME
			load(this.toFilename(arguments[i]));
		    }
		}
		return this;
	    }
	},

	module: {
	    value: function(name, rest) {
		var module = new Module();
		this.defineSlot(name, {
		    writable: false,
		    value: module
		});
		if (arguments.length > 1) {
		    module.adoptResult.apply(module, Array.slice(arguments, 1));
		}
		return module;
	    }
	},

	toFilename: {
	    value: function(moduleName) {
		// for now, just get the last '.'-separated segment of the module name
		return moduleName.slice(moduleName.lastIndexOf('.') + 1) + ".js"; 
	    }
	}
    });

    defineSlots(Base, {
	resolve: {
	    value: function link(literal, path) { 
		//variableMap = variableMap || {};
		var variableMap = {};
		return resolver.link(literal, [], undefined, variableMap, path || [], undefined); 
	    }
	}
    });
    
    var top = new Module();
    defineSlots(Module, {
	top: {
	    // the anonymous top module
	    writable: false,
	    value: top
	}
    });
    var fx = top.module('fx'); 
    fx.module('lang', function() { return {Object: Base, Module: Module, Bind: Bind} });
    return fx;
    
}).call(this);


//load('jslib/dojo.js.uncompressed.js');
load('jslib/jsonx.js');
//load('jquery.js');

//    this.location = {}

if (this.arguments && this.arguments[0] == 'test') {
    //print('query is ' + dojox.json.query);
    print('query is ' + fx.lang.Object.resolve({x: {y: 10}}).query('.x.y'));
    //print('query2 is ' + fx.$('.lang.Object'));
    print('q3 ' + fx.lang.Object.resolve({ar: ['a','b','c', 'd']}).query('.ar[1:2:3]'));
    
    //print('q3 ' + fx.$(function(x) { return dojox.json.ref.toJson(x) }));
    
    print('q4 ' + fx.lang.Object.resolve({x: 10, y: 10}).inspect());
    var k = fx.lang.Object.resolve({tag: 'k'});
    var q = fx.lang.Object.resolve({x:1, y: 'foo', t: k, z: {f1: 10, t: k, f2: null}});
    q.z.f2 = q;
    print('g5 ' + q.inspect());

}
print('loaded lang.js');

//    Object.keys(fx.lang.Object)
