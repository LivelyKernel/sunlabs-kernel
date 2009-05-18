(function() {
// ES 3.1 proposed static functions
// according to rationale_for_es3_1_static_object_methodsaug26.pdf on wiki.ecmascript.org
// implementation uses __defineGetter__/__proto__ logic

    var global = this;
    // FIXME the following is Rhino-dependent
    function dontEnum(object, property) {
	if (!global.Packages) return;
	var cx = Packages.org.mozilla.javascript.Context.currentContext;
	var wrapped = cx.wrapFactory.wrapAsJavaObject(cx, global, object, null);
        wrapped.setAttributes(property, Packages.org.mozilla.javascript.ScriptableObject.DONTENUM);
    }
   
    function readOnly(object, property) {
	if (!global.Packages) return;
	var cx = Packages.org.mozilla.javascript.Context.currentContext;
	var wrapped = cx.wrapFactory.wrapAsJavaObject(cx, global, object, null);
        wrapped.setAttributes(property, Packages.org.mozilla.javascript.ScriptableObject.READONLY);
    }

    Object.defineProperty = function(object, property, descriptor) {
	if (typeof descriptor  !== 'object') throw new TypeError('descriptor is not an object: ' + descriptor);
	if (descriptor.hasOwnProperty('value')) {
	    object[String(property)] = descriptor.value;
	} else {
	    if (descriptor.hasOwnProperty('getter'))
		object.__defineGetter__(property, descriptor.getter);
	    if (descriptor.hasOwnProperty('setter'))
		object.__defineSetter__(property, descriptor.setter);
	}
	// FIXME: what if we're changing it back to enumerable? check spec
	if (descriptor.enumerable == false) dontEnum(object, property);
	if (descriptor.writable == false) readOnly(object, property);
	    
	return object;
    };
    
    Object.defineProperties = function(object, descriptorSet) {
	for (var name in descriptorSet) {
	    if (!descriptorSet.hasOwnProperty(name)) continue;
	    Object.defineProperty(object, name, descriptorSet[name]);
	}
	return object;
    }
    
     Object.defineProperties(Object, {
	 create: { 
	     value: function(proto, descriptorSet) { //descriptor can be undefined
		 var object = {};
		 object.__proto__ = proto;
		 Object.defineProperties(object, descriptorSet);
		 return object;
	     }
	 },
	 
	 keys: { 
	     value: function(object, optFast) {
		 if (typeof object !== 'object') throw new TypeError('not an object');
		 var names = []; // check behavior wrt arrays
		 for (var name in object) {
		     if (object.hasOwnProperty(name)) 
			 names.push(name);
		 }
		 if (!optFast) names.sort();
		 return names;
	     }
	 },
	 
	 getOwnPropertyNames: { 
	     value: function(object) {
		 // would be different from keys if we could access non-enumerable properties
		 return Object.keys(object);
	     }
	 },
	 
	 getPrototypeOf: { 
	     value: function(object) {
		 if (typeof object !== 'object') throw new TypeError('type ' + (typeof object) + ' does not have a prototype');
		 return object.__proto__;
	     }
	 },
	 
	 getOwnPropertyDescriptor: { 
	     value: function(object, name) {
		 if (!object.hasOwnProperty(name)) return null; // FIXME check spec
		 var descriptor = { enumerable: true, writable: true, configurable: true}; // FIXME get the actual values!
		 var getter = object.__lookupGetter__(name);
		 var setter = object.__lookupSetter__(name);
		 if (getter || setter) {
		     descriptor.getter = getter;
		     descriptor.setter = setter;
		 } else descriptor.value = object[name];
		 return descriptor;
	     }
	 },
	 
	 seal: {
	     value: function(object) {
		 // prevent adding and removing properties
		 if (!global.Packages) return;
		 try {
		     var cx = Packages.org.mozilla.javascript.Context.currentContext;
		     var wrapped = cx.wrapFactory.wrapAsJavaObject(cx, global, object, null);
		     wrapped.sealObject();
		 } catch (er) {} // FIXME really?
		 return object;
	     }
	 },
	 
	 freeze: { 
	     value: function(object) {
		 // like seal, but properties are read-only now
		 // note that read-only could be implemented partially by renaming all properties 
		 // and replacing them with getters
		 // not implementable yet
		 return Object.seal(object);
	     }
	 },
	 
	 isSealed: {
	     value: function(object) {
		 return false;  // FIXME
	     }
	 },
	 

	 isFrozen: {
	     value: function(object) {
		 return Object.isSealed(object); // FIXME
	     }
	 }
	 
     });
     
     Object.defineProperties(Function.prototype, {
	 bind: {
	     value: function bind(receiver) { // only single argument supported
		 var __method = this;
		 return function bound() {
		     return __method.apply(receiver, arguments);
		 }
	     }
	 }
     });
     
 })();


