/*
 * Copyright � 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

 /**
 * Core.js.  This file contains the core system definition
 * as well as the core Morphic graphics framework. 
 */

var Global = this.window.top || this.window; // set to the context enclosing the SVG context.

// namespace logic borrowed from 
// http://higher-order.blogspot.com/2008/02/designing-clientserver-web-applications.html
function using() {
    var args = arguments;
    return {run: function(inner) { return inner.apply(args[0], args); }};
}

function namespace(spec, context) {
    var  i,N;
    context = context || Global;
    spec = spec.valueOf();
    if (typeof spec === 'object') {
        if (typeof spec.length === 'number') {//assume an array-like object
            for (i = 0,N = spec.length; i < N; i++) {
                namespace(spec[i], context);
            }
        }
        else {//spec is a specification object e.g, {com: {trifork: ['model,view']}}
            for (i in spec) if (spec.hasOwnProperty(i)) {
                context[i] = context[i] || {};
                namespace(spec[i], context[i]);//recursively descend tree
            }
        }
    } else if (typeof spec === 'string') {
        (function handleStringCase() {
            var parts;
            if (!Class.isValidIdentifier(spec)) {
                throw new Error('"'+spec+'" is not a valid name for a package.');
            }
            parts = spec.split('.');
            for (i = 0, N = parts.length; i<N; i++) {
                spec = parts[i];
                context[spec] = context[spec] || {};
                context = context[spec];
            }
        })();
    } else {
	throw new TypeError();
    }
}


// ===========================================================================
// Our JS library extensions (JS 1.5, no particular browser or graphics engine)
// ===========================================================================

/**
  * LK class system.
  */

Object.extend(Function.prototype, {

    subclass: function(/*... */) {
	// Main method of the LK class system.

	// {className} is the name of the new class constructor which this method synthesizes
	// and binds to {className} in the Global namespace. 
	// Remaining arguments are (inline) properties and methods to be copied into the prototype 
	// of the newly created constructor.

	// modified from prototype.js
	
	var args = arguments;
	var className = args[0];
	var targetScope = Global;
	var shortName = null;
	if (className) {
	    var path = className.split('.');
	    if (path.length > 1) {
		for (var i = 0; i < path.length - 1; i++) {
		    if (!Class.isValidIdentifier(path[i]))
			throw new Error("invalid package name " + path[i]);
		    targetScope = targetScope[path[i]];
		}
		shortName = path[path.length - 1];
	    } else {
		shortName = className;
	    }
	    if (!Class.isValidIdentifier(className))
		throw new Error("invalid class name " + className);
	} 
	
	if (shortName == null) {
	    shortName = "anonymous_" + (Class.anonymousCounter ++);
	    if (!className) className = shortName;
	}
	

	var klass = Class.newInitializer(shortName);
	
	klass.superclass = this;

	var protoclass = function() { }; // that's the constructor of the new prototype object
	protoclass.prototype = this.prototype;

	klass.prototype = new protoclass();
	

	klass.prototype.constructor = klass;
	// KP: .name would be better but js ignores .name on anonymous functions
	klass.prototype.constructor.type = className;

	for (var i = 1; i < args.length; i++) {
	    klass.addMethods(args[i] instanceof Function ? (args[i])() : args[i]);
	}
	if (!klass.prototype.initialize) {
	    klass.prototype.initialize = Functions.Empty;
	}

	if (className) targetScope[shortName] = klass; // otherwise it's anonymous
	return klass;
    },

    addMethods: function(source) {
	// copy all the methods and properties from {source} into the
	// prototype property of the receiver, which is intended to be
	// a class constructor.  Method arguments named '$super' are treated
	// specially, see Prototype.js documentation for "Class.create()" for details.
	// derived from Class.Methods.addMethods() in prototype.js
	var ancestor = this.superclass && this.superclass.prototype;

	for (var property in source) {
	    var value = source[property];
	    // weirdly, RegExps are functions in Safari, so testing for Object.isFunction on
	    // regexp field values will return true. But they're not full-blown functions and don't 
	    // inherit argumentNames from Function.prototype
	    if (ancestor && Object.isFunction(value) && value.argumentNames &&
		value.argumentNames().first() == "$super") {
		var method = value;
		var advice = (function(m) {
		    return function callSuper() { 
			try { 
			    return ancestor[m].apply(this, arguments);
			} catch (e) { 
			    debugger;
			    console.log("problem with ancestor %s.%s(%s):%s",
					Object.inspect(ancestor), m, $A(arguments), e);
			    Function.showStack();
			    throw e;
			}
		    };
		})(property);
		advice.methodName = "$super:" + (this.superclass ? this.superclass.type + "." : "") + property;
		
		value = Object.extend(advice.wrap(method), {
		    valueOf:  function() { return method },
		    toString: function() { return method.toString() },
		    originalFunction: method
		});
	    } 
	    this.prototype[property] = value;

	    if (property == "formals") {
		// special property (used to be pins, but now called formals to disambiguate old and new style
		Class.addPins(this, value);
	    } else if (Object.isFunction(value)) {
		for ( ; value; value = value.originalFunction) {
		    if (value.methodName) {
			//console.log("class " + this.prototype.constructor.type 
			// + " borrowed " + value.qualifiedMethodName());
		    }
		    value.declaredClass = this.prototype.constructor.type;
		    value.methodName = property;
		    if (!this.prototype.constructor.type) {
			//console.log("named " + value.qualifiedMethodName());
		    }
		}
	    }
	}
	return this;

    },

    addProperties: function(spec) {
	Class.addMixin(this, Record.create(spec).prototype);
    },

    isSubclassOf: function(aClass){
	if (!Class.isClass(aClass) && this === Object && !this.superclass)
	    return false;
	if (this.superclass === aClass)
	    return true;
	return this.superclass.isSubclassOf(aClass)
    },
    
    allSubclasses: function(){
        var self = this; 
        return Object.values(Global).select(function(ea) {
            try {
                return ea && Class.isClass(ea) && ea.isSubclassOf(self);
            }
            catch(e) {
                return false;
            };
        })
    }

});

var Class = {
    
    anonymousCounter: 0,
    
    initializerTemplate: (function CLASS(){ Class.initializer.apply(this, arguments) }).toString(),
    
    newInitializer: function(name) {
	// this hack ensures that class instances have a name
	return eval(Class.initializerTemplate.replace(/CLASS/g, name) + ";" + name);
    },
    
    initializer: function initializer() {
	// check for the existence of Importer, which may not be defined very early on
	if (Global.Importer && (arguments[0] instanceof Importer || arguments[0] === Importer.prototype)) { 
	    this.deserialize.apply(this, arguments);
	} else if (Global.Copier && (arguments[0] instanceof Copier || arguments[0] === Copier.prototype)) {
	    this.copyFrom.apply(this, arguments);
	} else {
	    this.initialize.apply(this, arguments); 
	}
    },


    def: function(constr, superConstr, optProtos, optStatics) {
	// Main method of the LK class system.

	// {className} is the name of the new class constructor which this method synthesizes
	// and binds to {className} in the Global namespace. 
	// Remaining arguments are (inline) properties and methods to be copied into the prototype 
	// of the newly created constructor.

	// modified from prototype.js

	var klass = Class.newInitializer("klass");
	klass.superclass = superConstr;
	
	var protoclass = function() { }; // that's the constructor of the new prototype object
	protoclass.prototype = superConstr.prototype;

	klass.prototype = new protoclass();
	
	// Object.extend(klass.prototype, constr.prototype);
	klass.prototype.constructor = klass; 
	var className  = constr.name; // getName()
	klass.addMethods({initialize: constr});
	// KP: .name would be better but js ignores .name on anonymous functions
	klass.type = className;

	
	if (optProtos) klass.addMethods(optProtos);
	if (optStatics) Object.extend(klass, optStatics);
	
	Global[className] = klass;
	return klass;
    },
    
    isValidIdentifier: function(str) {
	return (/^(?:[a-zA-Z_]\w*[.])*[a-zA-Z_]\w*$/).test(str);
    },
    
    isClass: function(object) {
	return (object instanceof Function) && (object.superclass || object === Object);
    },

    withAllClassNames: function(scope, callback) {
	for (var name in scope) {
	    try {
		if (Class.isClass(scope[name]))
		    callback(name);
	    } catch (er) { // FF exceptions
	    }
	}
	callback("Object");
	callback("Global");
    },

    makeEnum: function(strings) {
	// simple mechanism for making objecs with property values set to
	// property names, to be used as enums.
	
	var e = {};
	for (var i = 0; i < strings.length; i++) {
	    e[strings[i]] = strings[i];
	}
	return e;
    },

    getConstructor: function(object) {
	return object.constructor.getOriginal();
    },
    
    getPrototype: function(object) {
	return object.constructor.getOriginal().prototype;
    },

    applyPrototypeMethod: function(methodName, target, args) {
	var method = this.getPrototype(target);
	if (!method) throw new Error("method " + methodName + " not found");
	return method.apply(this, args);
    },
    
    getSuperConstructor: function(object) {
	return object.constructor.getOriginal().superclass;
    },

    getSuperPrototype: function(object) {
	var sup = this.getSuperConstructor(object);
	return sup && sup.prototype;
    },

    addPins: function(cls, spec) {
	Class.addMixin(cls, Relay.newDelegationMixin(spec).prototype);
    },
    
    addMixin: function(cls, source) { // FIXME: do the extra processing like addMethods does
	for (var prop in source) {
	    var value = source[prop];

	    if (prop == "constructor" || prop == "initialize" || prop == "toString" || prop == "definition") 
		continue;
	    cls.prototype[prop] = value;
	}
    },

};


var Strings = {
    documentation: "Convenience methods on strings",
    
    format: function() {
	return this.formatFromArray($A(arguments));
    },
    
    // adapted from firebug lite
    formatFromArray: function(objects) {
	var self = objects.shift();

	function appendText(object, string) {
	    return "" + object;
	}
	
	function appendObject(object, string) {
	    return "" + object;
	}
	
	function appendInteger(value, string) {
	    return value.toString();
	}
	
	function appendFloat(value, string, precision) {
	    if (precision > -1) return value.toFixed(precision);
	    else return value.toString();
	}
	
	var appenderMap = {s: appendText, d: appendInteger, i: appendInteger, f: appendFloat}; 
	var reg = /((^%|[^\\]%)(\d+)?(\.)([a-zA-Z]))|((^%|[^\\]%)([a-zA-Z]))/; 
	
	function parseFormat(fmt) {
	    
	    var parts = [];
	    
	    for (var m = reg.exec(fmt); m; m = reg.exec(fmt)) {
		var type = m[8] || m[5];
		var appender = type in appenderMap ? appenderMap[type] : appendObject;
		var precision = m[3] ? parseInt(m[3]) : (m[4] == "." ? -1 : 0);
		parts.push(fmt.substr(0, m[0][0] == "%" ? m.index : m.index + 1));
		parts.push({appender: appender, precision: precision});
		
		fmt = fmt.substr(m.index + m[0].length);
	    }
	    
	    parts.push(fmt.toString());
	    
	    return parts;
	};
	
	var parts = parseFormat(self);
	var str = "";
	var objIndex = 0;
	
	for (var i = 0; i < parts.length; ++i) {
	    var part = parts[i];
	    if (part && typeof(part) == "object") {
		var object = objects[objIndex++];
		str += (part.appender || appendText)(object, str, part.precision);
	    } else {
		str += appendText(part, str);
	    }
	}
	return str;
    },

    withDecimalPrecision: function(str, precision) {
	var floatValue = parseFloat(str);
	return isNaN(floatValue) ? str : floatValue.toFixed(precision);
    }

};


var Functions = {
    documentation: "colllection of reusable functions",

    Empty: function() {},
    K: function(arg) { return arg; },
    Null: function() { return null; },
    False: function() { return false; },
    True: function() { return true; }
};
    
var Properties = {
    documentation: "convenience property access functions",

    all: function(object, predicate) {
	var a = [];
	for (var name in object) {  
	    if (!(object[name] instanceof Function) && (predicate ? predicate(name, object) : true)) {
		a.push(name);
	    }
	} 
	return a;
    },
    
    own: function(object) {
	var a = [];
	for (var name in object) {  
	    if (object.hasOwnProperty(name)) {
		var value = object[name];
		if (!(value instanceof Function))
		    a.push(name);
	    }
	} 
	return a;
    },

    forEachOwn: function forEachOwn(object, func, context) {
	for (var name in object) {
	    if (object.hasOwnProperty(name)) {
		var value = object[name];
		if (!(value instanceof Function)) {
		    var result = func.call(context || this, name, value);
		    // cont && cont.call(context || this, result); 
		}
	    }
	}
    }
};




/**
/* Our extensions to JavaScript base classes
 */

/**
  * Extensions to class Function
  */  
Object.extend(Function.prototype, {

    inspectFull: function() {
	var methodBody = this.toString();
	methodBody = methodBody.substring(8, methodBody.length);
	return this.qualifiedMethodName() + methodBody;
    },

    inspect: function() {
	// Print method name (if any) and the first 80 characters of the decompiled source (without 'function')
	var methodBody = this.toString();
	methodBody = methodBody.substring(8, 88) + (methodBody.length > 88 ? '...' : '');
	return this.qualifiedMethodName() + methodBody;
    },

    qualifiedMethodName: function() {
	return (this.declaredClass ? this.declaredClass + "." : "")  
	    + (this.methodName || "anonymous");
    },

    functionNames: function(filter) {
	var functionNames = [];

	for (var name in this.prototype) { 
	    try {
		if ((this.prototype[name] instanceof Function) 
		    && (!filter || filter(name))) { 
		    functionNames.push(name);
		} 
	    } catch (er) {
		// FF can throw an exception here ...
	    }
	}

	return functionNames;
    },

    withAllFunctionNames: function(callback) {
	for (var name in this.prototype) { 
	    try {
		var value = this.prototype[name];
		if (value instanceof Function) 
		    callback(name, value, this);
	    } catch (er) {
		// FF can throw an exception here ...
	    }
	}
    },
    
    localFunctionNames: function() {
	var sup = this.superclass || ((this === Object) ? null : Object);
	
	try {
	    var superNames = (sup == null) ? [] : sup.functionNames();
	} catch (e) {
	    var superNames = [];
	}
	var result = [];
	
	this.withAllFunctionNames(function(name, value, target) {
	    if (!superNames.include(name) || target.prototype[name] !== sup.prototype[name]) 
		result.push(name);
	});
	return result;
    },
    
    getOriginal: function() {
	// get the original 'unwrapped' function, traversing as many wrappers as necessary.
	var func = this;
	while (func.originalFunction) func = func.originalFunction;
	return func;
    },
    
    logErrors: function(prefix) {
	if (Config.ignoreAdvice) return this;
	
	var advice = function logErrorsAdvice(proceed/*,args*/) {
	    var args = $A(arguments); args.shift(); 
	    try {
		return proceed.apply(this, args); 
	    } catch (er) {
		if (prefix) console.warn("%s.%s(%s): err: %s %s", this, prefix, args,  er, er.stack || "");
		else console.warn("%s %s", er, er.stack || "");
		Function.showStack();
		throw er;
	    }
	}
	
	advice.methodName = "$logErrorsAdvice";
	var result = this.wrap(advice);
	result.originalFunction = this;
	result.methodName = "$logErrorsWrapper";
	return result;
    },
    
    logCompletion: function(module) {
	if (Config.ignoreAdvice) return this;
	
	var advice = function logCompletionAdvice(proceed) {
	    var args = $A(arguments); args.shift(); 
	    try {
		var result = proceed.apply(this, args);
	    } catch (er) {
		console.warn('failed to load %s: %s', module, er);
		Function.showStack && Function.showStack();
		throw er;
	    }
	    console.log('completed %s', module);
	    return result;
	}
	
	advice.methodName = "$logCompletionAdvice::" + module;

	var result = this.wrap(advice);
	result.methodName = "$logCompletionWrapper::" + module;
	result.originalFunction = this;
	return result;
    },

    logCalls: function(isUrgent) {
	if (Config.ignoreAdvice) return this;

	var original = this;
	var advice = function logCallsAdvice(proceed) {
	    var args = $A(arguments); args.shift(); 
	    var result = proceed.apply(this, args);
	    if (isUrgent) { 
		console.warn('%s(%s) -> %s', original.qualifiedMethodName(), args, result); 
	    } else {
		console.log( '%s(%s) -> %s', original.qualifiedMethodName(), args, result);
	    }
	    return result;
	}

	advice.methodName = "$logCallsAdvice::" + this.qualifiedMethodName();

	var result = this.wrap(advice);
	result.originalFunction = this;
	result.methodName = "$logCallsWrapper::" + this.qualifiedMethodName();
	return result;
    },
    
    traceCalls: function(stack) {
	var advice = function traceCallsAdvice(proceed) {
	    var args = $A(arguments); args.shift();
	    stack.push(args);
	    var result = proceed.apply(this, args);
	    stack.pop();
	    return result;
	};
	return this.wrap(advice);
    }
    
});


/**
  * Extensions to class Number
  */  
Object.extend(Number.prototype, {

    // random integer in 0 .. n-1
    randomSmallerInteger: function() {
	return Math.floor(Math.random()*this); 
    },
    
    roundTo: function(quantum) {
	return Math.round(this/quantum)*quantum; 
    },
    
    toDegrees: function() { 
	return (this*180/Math.PI) % 360; 
    },

    toRadians: function() { 
	return this/180 * Math.PI; 
    }

});

/**
  * Extensions to class String
  */  
Object.extend(String.prototype, {
    size: function() { // so code can treat, eg, Texts like Strings
	return this.length;
    },
    
    asString: function() { // so code can treat, eg, Texts like Strings
	return this;
    }
});


Object.subclass('CharSet', {
    documentation: "limited support for charsets"
});

Object.extend(CharSet, {
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
    underscore: "_",
    nonAlpha: "`1234567890-=[]\;',./",
    shiftedNonAlpha: '~!@#$%^&*()_+{}:"<>?|',
    leftBrackets: "*({[<'" + '"',
    rightBrackets: "*)}]>'" + '"'
});

Object.extend(CharSet, {
    // select word, brackets
    alphaNum: CharSet.lowercase + CharSet.uppercase + CharSet.digits + CharSet.underscore,
    charsAsTyped: CharSet.uppercase + CharSet.nonAlpha,
    charsUnshifted: CharSet.lowercase + CharSet.nonAlpha,
    charsShifted: CharSet.uppercase + CharSet.shiftedNonAlpha,

    nonBlank: function(cc) {  
	return " \n\r\t".include(cc) == false;
    }

});
    
// a new unified mechanism for properties that map onto the DOM
Object.subclass('Record', {

    initialize: function(rawNode, spec) {
	this.rawNode = rawNode;
	Properties.forEachOwn(spec, function(key) { 
	    this["set" + key].call(this, spec[key]); 
	}, this);
    },
    
    newRelay: function(spec) {
	return Relay.newInstance(spec, this);
    },

    getRecordField: function(name) {
	if (this.rawNode instanceof Global.Node) {
	    var ns = null;
	    var result = this.rawNode.getAttributeNS(ns, name);
	    if (result === null) return undefined;
	    else if (result === "") return null;
	    else return result;
	} else {
	    return this.rawNode[name];
	}
    },

    setRecordField: function(name, value) {
	if (this.rawNode instanceof Global.Node) {
	    var ns = null;
	    if (value === undefined) {
		throw new Error("use removeRecordField to remove " + name);
	    }
	    return this.rawNode.setAttributeNS(ns, name, value || "");
	} else {
	    return this.rawNode[name] = value;
	}
    },
    
    removeRecordField: function(name) {
	if (this.rawNode instanceof Global.Node) {
	    var ns = null;
	    return this.rawNode.removeAttributeNS(ns, name);
	} else {
	    delete this.rawNode[name];
	}
    }

});

Object.extend(Record, {
	
    create: function(bodySpec) {
	var klass = Record.subclass();
	this.addObserverMethods(klass);
	this.extendRecordClass(klass, bodySpec);
	klass.prototype.definition = bodySpec;
	klass.addMethods({toString: function() { return "#<Record{" + String(JSON.serialize(this.definition)) + "}"; }});
	return klass;
    },

    newPlainInstance: function(spec) {
	var argSpec = {};
	var fieldSpec = {};
	Properties.forEachOwn(spec, function (key) {
	    fieldSpec[key] = {};
	    argSpec[key] = spec[key];
	});
	return this.newInstance(fieldSpec, argSpec, {});
    },

    newInstance: function(fieldSpec, argSpec, optStore) {
	if (arguments.length < 2) throw new Error("call with two or more arguments");
	var Rec = Record.create(fieldSpec);
	if (!optStore) optStore = NodeFactory.create("model"); // FIXME flat JavaScript instead by default?
	return new Rec(optStore, argSpec);
    },

    extendRecordClass: function(klass, bodySpec) {
	var def = {};
	Properties.forEachOwn(bodySpec, function(name) {
            var spec = bodySpec[name];
	    Record.addAccessorMethods(def, name, spec);
        });
    	klass.addMethods(def);
    },

    addAccessorMethods: function(def, fieldName, spec) {
	if (fieldName.startsWith("set") || fieldName.startsWith("get")) debugger; // prolly a prob
	if (spec.mode !== "-")
            def["set" + fieldName] = this.newRecordSetter(spec.name || fieldName, spec.to, spec.byDefault);
	if (spec.mode !== "+")
            def["get" + fieldName] = this.newRecordGetter(spec.name || fieldName, spec.from, spec.byDefault);
    },


    observerListName: function(name) { return name + "$observers"},
    
    newRecordSetter: function newRecordSetter(name, to, byDefault) {
        return function recordSetter(value, optSource) {
            if (value === undefined) {
            	this.removeRecordField(name); // return ?
            } else {
            	if (!value && byDefault) value = byDefault;
		var coercedValue = to ? to(value) : value;
		if (this.getRecordField(name) === coercedValue) return;
            	this.setRecordField(name, coercedValue);
            }
            var deps = this[Record.observerListName(name)];
	    var updateName = "on" + name + "Update";
            if (deps) {
            	for (var i = 0; i < deps.length; i++) {
                    var dep = deps[i];
		    // shouldn't this be uncoerced value? ......
                    dep[updateName].call(dep, coercedValue, optSource);
            	}
            }
        }
    },
    
    newRecordGetter: function newRecordGetter(name, from, byDefault) {
        return function recordGetter() {
            if (this.rawNode) {
                var value = this.getRecordField(name);
                if (!value && byDefault) return byDefault;
                else if (from) return from(value);
                else return value;
            } else if (this === this.constructor.prototype) { // we are the prototype? not foolproof but works in LK
                return byDefault; 
            } else {
                throw new Error("no rawNode");
            }
        }
    },
    
    addObserverMethods: function(klass) {
        var def = {
            addObserver: function(dep, optForwardingSpec) {
                if (optForwardingSpec) {
                    // do forwarding
                    dep = Relay.newInstance(optForwardingSpec, dep);
                }
                // find all the "on"<Variable>"Update" methods of dep
                for (var name in dep) {
                    if (name.startsWith("on") && name.endsWith("Update")) {
                        var varname = name.substring(2, name.indexOf("Update"));
                        if (!this["set" + varname]) {
                            debugger; throw new Error("cannot observe nonexistent variable " + varname);
			}
                        var deps = this[Record.observerListName(varname)];
                        if (!deps) deps = this[Record.observerListName(varname)] = [];
                        else if (deps.indexOf(dep) >= 0) return;
                        deps.push(dep);
                    }
                }
            },
            // dep may be the relay or relay.delegate
            removeObserver: function(dep, fieldName) {              
                if (fieldName && !this[fieldName + '$observers']) {
                    console.log('Tried to remove non existing observer:' + fieldName + '$observers');
                    return;
                };
                var observerFields = fieldName ?
                    [Record.observerListName(fieldName)] :
                    Object.keys(this).select(function(ea) {
                        return ea.endsWith('$observers')
                    });
                observerFields.forEach(function(ea) {
                    this[ea] = this[ea].reject(function(relay) { return relay === dep || relay.delegate === dep });
                }, this);
            },

	    addObserversFromSetters: function(reverseSpec, dep, optKickstartUpdates) {
		var forwardSpec = {};
		Properties.forEachOwn(reverseSpec, function each(key) {
		    var value = reverseSpec[key];

		    if (Object.isString(value.valueOf())) {
			if (!value.startsWith("+")) {  // if not write only, get updates
			    forwardSpec[value.startsWith("-") ? value.substring(1) : value] = "!" + key;
			}
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
			debugger;
			console.log("on kickstart update: " + er + " on " + dep + " " + target
				    + " mapping to " + source + " " + er.stack);
		    }
		}

		if (optKickstartUpdates) 
		    Properties.forEachOwn(reverseSpec, function each(key) {
			var value = reverseSpec[key];
			if (Object.isString(value.valueOf())) {
			    if (!value.startsWith("+")) {
				if (value.startsWith("-")) value = value.substring(1);
				callUpdate(this, key, value, value.from);
			    }
			} else if (value.mode !== '+') {
			    callUpdate(this, key, value.name, value.from);
			}
		    }, this);
		
	    }
        };
        klass.addMethods(def);
    }
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
	    var impl = this.delegate[targetName];
	    if (!impl) { debugger; throw new Error("delegate " + this.delegate + " does not implement " + targetName); }
	    var args = arguments;
	    if (optConv) { args = $A(arguments); args.unshift(optConv(args.shift())); }
	    return impl.apply(this.delegate, args);
	}
    },

    newRelayGetter: function newRelayGetter(targetName, optConv) {
	return function getterRelay(/*...*/) {
	    var impl = this.delegate[targetName];
	    if (!impl) { debugger; throw new Error("delegate " + this.delegate + " does not implement " + targetName); }
	    var result = impl.apply(this.delegate, arguments);
	    return optConv ? optConv(result) : result;
	}
    },

    newRelayUpdater: function newRelayUpdater(targetName, optConv) {
	return function updateRelay(/*...*/) {
	    var impl = this.delegate[targetName];
	    if (!impl) { debugger; throw new Error("delegate " + this.delegate + " does not implement " + targetName); }
	    return impl.apply(this.delegate, arguments);
	}
    },

    handleStringSpec: function(def, key, value) {
	if (value.startsWith("set") || value.startsWith("get")) debugger; // probably a mixup

	if (value.startsWith("!")) {
	    // call an update method with the derived name
	    def["on" + key + "Update"] = Relay.newRelayUpdater("on" + value.substring(1) + "Update");
	} else if (value.startsWith("=")) {
	    // call exactly that method
	    def["on" + key + "Update"] = Relay.newRelayUpdater(value.substring(1));
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
	    toString: function() {
		return "#<Relay{" + String(JSON.serialize(args)) + "}>";
	    }
	};
	Properties.forEachOwn(args, function(key) { 
	    var spec = args[key];
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
		if (m) {
		    var method = m[methodName];
		    if (!method) return byDefault;
		    var result = method.call(m);
		    return (result === undefined) ? byDefault : (from ? from(result) : result);
		} else return this.getModelValue(methodName, byDefault);
            }
	}
	
	function newDelegatorSetter(name, to) {
	    var methodName = "set" + name;
	    return function setter(value) {
		var m = this.formalModel;
		if (m) {
		    var method = m[methodName];
		    return method && method.call(m, to ? to(value) : value, this); // third arg is source
		} else return this.setModelValue(methodName, value);
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
	    Properties.forEachOwn(spec, function(name) {
		var desc = spec[name];
		var mode = desc.mode;
		if (mode !== "-") {
		    klass.prototype["set" + name] = newDelegatorSetter(name, desc.to);
		}
		if (mode !== "+") {
		    klass.prototype["get" + name] = newDelegatorGetter(name, desc.from, desc.byDefault);
		}
	    });
	}
	return klass;
    }
    

});
    


Global.console && Global.console.log("loaded basic library");

// ===========================================================================
// Error/warning console (browser dependent)
// ===========================================================================

// console handling
(function() { 
    
    // from firebug lite
    function escapeHTML(value) {
	return value;
	
	function replaceChars(ch) {
	    switch (ch) {
	    case "<":
		return "&lt;";
	    case ">":
		return "&gt;";
	    case "&":
		return "&amp;";
	    case "'":
		return "&#39;";
	    case '"':
		return "&quot;";
	    }
	    return "?";
	}
	
	return String(value).replace(/[<>&"']/g, replaceChars); //KP: this comment to workaround a bug in my Emacs's javascript mode " ])
    }
    
    function LogWindow() {
	this.win = (function() { 
	    var win = Global.window.open("", "log", "scrollbars,width=900,height=300"); 
	    win.title = "Lively Kernel Log";
	    win.document.write("<pre>"); 
	    return win; 
	})();
	
	this.log = function(msg) {
	    if (!this.win) return;
	    this.win.document.writeln(escapeHTML(msg));
	}
    };
    
    var platformConsole = Global.window.console || Global.window.parent.console; 
    if (!platformConsole) {
	alert('no console! console output disabled');
	platformConsole = { log: function(msg) { } } // do nothing as a last resort
    }
    
    if (platformConsole.warn && platformConsole.info && platformConsole.assert) {
	// it's a Firebug/Firebug lite console, it does all we want, so no extra work necessary
	Global.console = platformConsole;
	Global.console.consumers = [platformConsole]; // compatibility fix
    } else {
	// rebind to something that has all the calls
	Global.console = {
	    
	    consumers: [ platformConsole], // new LogWindow() ],
	    
	    warn: function() {
		var args = $A(arguments);
		this.consumers.forEach(function(c) { 
		    if (c.warn) c.warn.apply(c, args); 
		    else c.log("Warn: " + Strings.formatFromArray(args));
		});
	    },
	    
	    info: function() {
		var args = $A(arguments);
		this.consumers.forEach(function(c) { 
		    if (c.info) c.info.apply(c, args); 
		    else c.log("Info: " + Strings.formatFromArray(args));
		});
	    },
	    
	    log: function() {
		this.consumers.invoke('log', Strings.formatFromArray($A(arguments)));
	    },
	    
	    assert: function(expr, msg) {
		if (!expr) this.log("assert failed:" + msg);
	    }
	}
    }
    
})(); 

Object.extend(Global.window, {
    onerror: function(message, url, code) {
	console.log('in %s: %s, code %s', url, message, code);
    },
    onbeforeunload: function(evt) { 
	if (Config.askBeforeQuit) {
	    var msg = "Lively Kernel data may be lost if not saved.";
	    evt.returnValue = msg; 
	    return msg;
	} else return null;
    }
    // onblur: function(evt) { console.log('window got blur event %s', evt); },
    // onfocus: function(evt) { console.log('window got focus event %s', evt); }
});


(function() { // override config options with options from the query part of the URL

    // may have security implications ...
    var query = Global.document.baseURI.split('?')[1];
    if (!query) return;

    var configOverrides = query.toQueryParams();
    for (var p in configOverrides) {
	if (Config.hasOwnProperty(p)) { // can't set unknown properties
	    // this is surprisingly convoluted in Javascript:
	    if ((typeof Config[p].valueOf()) === 'boolean') { 
		// make sure that "false" becomes false
		Config[p] = configOverrides[p].toLowerCase() == "true";
	    } else {
		Config[p] = configOverrides[p];
	    }
	} else {
	    console.log("ignoring unknown property " + p);
	}
    }
})();    


// ===========================================================================
// DOM manipulation (Browser and graphics-independent)
// ===========================================================================

Namespace =  {
    SVG : "http://www.w3.org/2000/svg", 
    LIVELY : UserAgent.usableNamespacesInSerializer ? "http://www.experimentalstuff.com/Lively"  : null, 
    XLINK : "http://www.w3.org/1999/xlink", 
    XHTML: "http://www.w3.org/1999/xhtml"
};

var Converter = {
    documentation: "singleton used to parse DOM attribute values into JS values",

    parseLength: function(string) {
	// convert into system coords (pt?)
	// FIXME: handle units
	return parseFloat(string);
    },

    parseCoordinate: function(string) {
	// convert into system coords (pt?)
	// FIXME: handle units
	return parseFloat(string);
    },

    toBoolean: function(string) {
	return string && string == 'true';
    },

    fromBoolean: function(object) {
	var b = object.valueOf();
	return b === true ? true : false;
    },

    parseURL: function(string) {
	return new URL(string);
    },

    
    parseInset: function(string) {
	// syntax: <left>(,<top>(,<right>,<bottom>)?)?
	
	if (!string || string == "none") return null;
	try {
	    var box = string.split(",");
	} catch (er) {alert("string is " + string + " string? " + (string instanceof String)) }
	var t, b, l, r;
	switch (box.length) {
	case 1:
	    b = l = r = t = this.parseLength(box[0].strip());
	    break;
	case 2:
	    t = b = this.parseLength(box[0].strip());
	    l = r = this.parseLength(box[1].strip());
	    break;
	case 4:
	    t = this.parseLength(box[0].strip());
	    l = this.parseLength(box[1].strip());
	    b = this.parseLength(box[2].strip());
	    r = this.parseLength(box[3].strip());
	    break;
	default:
	    console.log("unable to parse padding " + padding);
	    return null;
	} 
        return Rectangle.inset(t, l, b, r);
    },

    toJSONAttribute: function(obj) {
	return obj ? escape(JSON.serialize(obj)) : "";
    },

    fromJSONAttribute: function(str) {
	return str ?  JSON.unserialize(unescape(str)) : null;
    }
};


var NodeFactory = {

    createNS: function(ns, name, attributes) {
	var element = Global.document.createElementNS(ns, name);
	return NodeFactory.extend(ns, element, attributes);
    },

    create: function(name, attributes) {
	//return this.createNS(Namespace.SVG, name, attributes);  // doesn't work
	var element = Global.document.createElementNS(Namespace.SVG, name);
	return NodeFactory.extend(null, element, attributes);
    },

    extend: function(ns, element, attributes) {
	if (attributes) {
	    for (var name in attributes) {
		if (!attributes.hasOwnProperty(name)) continue;
		element.setAttributeNS(ns, name, attributes[name]);
	    }
	}
	return element;
    },

    createText: function(string) {
	return Global.document.createTextNode(string);
    },
    
    createNL: function(string) {
	return Global.document.createTextNode("\n");
    },

    createCDATA: function(string) {
	return Global.document.createCDATASection(string);
    }


};

XLinkNS = {
    setHref: function(node, href) {
	return node.setAttributeNS(Namespace.XLINK, "href", href);
    },
    
    getHref: function(node) {
	return node.getAttributeNS(Namespace.XLINK, "href");
    }
};

LivelyNS = {
    
    create: function(name, attributes) {
	return NodeFactory.createNS(Namespace.LIVELY, name, attributes);
    },
    
    getAttribute: function(node, name) {
	return node.getAttributeNS(Namespace.LIVELY, name);
    },

    removeAttribute: function(node, name) {
	return node.removeAttributeNS(Namespace.LIVELY, name);
    },

    setAttribute: function(node, name, value) {
	node.setAttributeNS(Namespace.LIVELY, name, value);
    },

    getType: function(node) {
	return node.getAttributeNS(Namespace.LIVELY, "type");
    },
    
    setType: function(node, string) {
	node.setAttributeNS(Namespace.LIVELY, "type", string);
    }
};

Object.subclass('Wrapper', {
    documentation: "A wrapper around a native object, stored as rawNode",

    rawNode: null,

    getType: function() {
	var ctor = this.constructor.getOriginal();
	if (ctor.type) return ctor.type;
	console.log("no type for " + ctor);
	Function.showStack();
	return null;
    },

    deserialize: function(importer, rawNode) {
	this.rawNode = rawNode;
    },

    copyFrom: function(copier, other) {
	if (other.rawNode) this.rawNode = other.rawNode.cloneNode(true);
    },

    copy: function(copier) {
	try {
	    return new Global[this.getType()](copier || Copier.marker, this);
	} catch (er) { debugger }
    },

    id: function() {
	return this.rawNode.getAttribute("id");
    },

    setId: function(value) {
	var prev = this.id();
	this.rawNode.setAttribute("id", value); // this may happen automatically anyway by setting the id property
	return prev;
    },

    removeRawNode: function() {
	var parent = this.rawNode && this.rawNode.parentNode;
	return parent && parent.removeChild(this.rawNode);
    },

    replaceRawNodeChildren: function(replacement) {
	while (this.rawNode.firstChild) this.rawNode.removeChild(this.rawNode.firstChild);
	if (replacement) this.rawNode.appendChild(replacement);
    },

    toString: function() {
	try {
	    return "#<" + this.getType() +  ":" + this.rawNode + ">";
	} catch (err) {
	    return "#<toString error: " + err + ">";
	}
    },

    inspect: function() {
	try {
	    return this.toString() + "[" + this.toMarkupString() + "]";
	} catch (err) {
	    return "#<inspect error: " + err + ">";
	}
    },

    toMarkupString: function() {
	// note forward reference
	return Exporter.stringify(this.rawNode);
    },

    uri: function() {
	return "url(#" + this.id() + ")";
    },


    // convenience attribute access
    getLivelyTrait: function(name) {
	return this.rawNode.getAttributeNS(Namespace.LIVELY, name);
    },

    // convenience attribute access
    setLivelyTrait: function(name, value) {
	return this.rawNode.setAttributeNS(Namespace.LIVELY, name, value);
    },

    // convenience attribute access
    removeLivelyTrait: function(name) {
	return this.rawNode.removeAttributeNS(Namespace.LIVELY, name);
    },
    
    getLengthTrait: function(name) {
	return Converter.parseLength(this.rawNode.getAttributeNS(null, name));
    },

    setLengthTrait: function(name, value) {
	this.setTrait(name, value);
    },

    getTrait: function(name) {
	return this.rawNode.getAttributeNS(null, name);
    },

    setTrait: function(name, value) {
	return this.rawNode.setAttributeNS(null, name, String(value));
    },
    
    removeTrait: function(name) {
	return this.rawNode.removeAttributeNS(null, name);
    }

});





console.log("Loaded basic DOM manipulation code");

// ===========================================================================
// Portable graphics foundations
// ===========================================================================

Object.subclass("Point", {
    documentation: "2D Point",

    initialize: function(x, y) {
	this.x = x;
	this.y = y;
	return this;
    },

    deserialize: function(importer, string) { // reverse of toString
	var array = string.substring(3, string.length - 1).split(',');
	this.x = Converter.parseCoordinate(array[0]);
	this.y = Converter.parseCoordinate(array[1]);
    },

    addPt: function(p) { return new Point(this.x + p.x, this.y + p.y); },
    addXY: function(dx,dy) { return new Point(this.x + dx, this.y + dy); },
    midPt: function(p) { return new Point((this.x + p.x)/2, (this.y + p.y)/2); },
    subPt: function(p) { return new Point(this.x - p.x, this.y - p.y); },
    negated: function() { return new Point(-this.x, -this.y); },
    inverted: function() { return new Point(1.0/this.x, 1.0/this.y); },
    invertedSafely: function() { return new Point(this.x && 1.0/this.x, this.y && 1.0/this.y); },
    scaleBy: function(scale) { return new Point(this.x*scale,this.y*scale); },
    scaleByPt: function(scalePt) { return new Point(this.x*scalePt.x,this.y*scalePt.y); },
    lessPt: function(p) { return this.x < p.x && this.y < p.y; },
    leqPt: function(p) { return this.x <= p.x && this.y <= p.y; },
    eqPt: function(p) { return this.x == p.x && this.y == p.y; },
    withX: function(x) { return pt(x, this.y); },
    withY: function(y) { return pt(this.x, y); },

    minPt: function(p, acc) { 
	if (!acc) acc = new Point(0, 0); 
	acc.x = Math.min(this.x, p.x); 
	acc.y = Math.min(this.y, p.y);  
	return acc;
    },

    maxPt: function(p, acc) { 
	if (!acc) acc = new Point(0, 0);
	acc.x = Math.max(this.x, p.x);
	acc.y = Math.max(this.y, p.y); 
	return acc;
    },

    roundTo: function(quantum) { return new Point(this.x.roundTo(quantum), this.y.roundTo(quantum)); },

    dist: function(p) { 
	var dx = this.x - p.x;
	var dy = this.y - p.y;
	return Math.sqrt(dx*dx + dy*dy); 
    },

    nearestPointOnLineBetween: function(p1, p2) { // fasten seat belts...
	if (p1.x == p2.x) return pt(p1.x, this.y);
	if (p1.y == p2.y) return pt(this.x, p1.y);
	var x1 = p1.x;
	var y1 = p1.y;
	var x21 = p2.x - x1;
	var y21 = p2.y - y1;
	var t = (((this.y - y1) / x21) + ((this.x - x1) / y21)) / ((x21 / y21) + (y21 / x21));
	return pt(x1 + (t * x21) , y1 + (t * y21)); 
    },

    asRectangle: function() { return new Rectangle(this.x, this.y, 0, 0); },
    extent: function(ext) { return new Rectangle(this.x, this.y, ext.x, ext.y); },
    extentAsRectangle: function() { return new Rectangle(0, 0, this.x, this.y) },

    toString: function() {
	return Strings.format("pt(%1.f,%1.f)", this.x, this.y);
    },
    
    toTuple: function() {
	return [ this.x, this.y ];
    },
    
    toJSON: function() { return {x: this.x, y: this.y}; },
    
    inspect: function() {
	return JSON.serialize(this);
    },

    matrixTransform: function(mx, acc) {
	if (!acc) acc = pt(0, 0); // if no accumulator passed, allocate a fresh one
	acc.x = mx.a * this.x + mx.c * this.y + mx.e;
	acc.y = mx.b * this.x + mx.d * this.y + mx.f;
	return acc;
    },

    // Polar coordinates...
    r: function() { return this.dist(pt(0,0)); },
    theta: function() { return Math.atan2(this.y,this.x); },

    copy: function() { return new Point(this.x, this.y); }
});

Object.extend(Point, {

    ensure: function(duck) { // make sure we have a Lively point
	if (duck instanceof Point) { 
	    return duck;
	} else { 
	    return new Point(duck.x, duck.y);
	}
    },

    polar: function(r, theta) { return new Point(r*Math.cos(theta), r*Math.sin(theta)); },
    random: function(scalePt) { return new Point(scalePt.x.randomSmallerInteger(), scalePt.y.randomSmallerInteger()); }

});

// Shorthand for creating point objects
function pt(x, y) { 
    return new Point(x, y);
}

Object.subclass("Rectangle", {

    documentation: "primitive rectangle", 
    // structually equivalent to SVGRect 
    
    initialize: function(x, y, w, h) {
	this.x = x;
	this.y = y;
	this.width = w;
	this.height = h;
	return this;
    },

    copy: function() { return new Rectangle(this.x, this.y, this.width, this.height);  },
    maxX: function() { return this.x + this.width; },
    maxY: function() { return this.y + this.height; },
    withWidth: function(w) { return new Rectangle(this.x, this.y, w, this.height)},
    withHeight: function(h) { return new Rectangle(this.x, this.y, this.width, h)},
    withX: function(x) { return new Rectangle(x, this.y, this.width, this.height)},
    withY: function(y) { return new Rectangle(this.x, y, this.width, this.height)},
    extent: function() { return new Point(this.width,this.height); },
    withExtent: function(ext) { return new Rectangle(this.x, this.y, ext.x, ext.y); },
    center: function() { return new Point(this.x+(this.width/2),this.y+(this.height/2))},
    //Control point readers and writers
    topLeft: function() { return new Point(this.x, this.y)},
    topRight: function() { return new Point(this.maxX(), this.y)},
    bottomRight: function() { return new Point(this.maxX(), this.maxY())},
    bottomLeft: function() { return new Point(this.x, this.maxY())},
    leftCenter: function() { return new Point(this.x, this.center().y)},
    rightCenter: function() { return new Point(this.maxX(), this.center().y)},
    topCenter: function() { return new Point(this.center().x, this.y)},
    bottomCenter: function() { return new Point(this.center().x, this.maxY())},
    withTopLeft: function(p) { return Rectangle.fromAny(p, this.bottomRight()) },
    withTopRight: function(p) { return Rectangle.fromAny(p, this.bottomLeft()) },
    withBottomRight: function(p) { return Rectangle.fromAny(p, this.topLeft()) },
    withBottomLeft: function(p) { return Rectangle.fromAny(p, this.topRight()) },
    withLeftCenter: function(p) { return new Rectangle(p.x, this.y, this.width + (this.x - p.x), this.height)},
    withRightCenter: function(p) { return new Rectangle(this.x, this.y, p.x - this.x, this.height)},
    withTopCenter: function(p) { return new Rectangle(this.x, p.y, this.width, this.height + (this.y - p.y))},
    withBottomCenter: function(p) { return new Rectangle(this.x, this.y, this.width, p.y - this.y)}
});

Rectangle.addMethods({

    containsPoint: function(p) {
	return this.x <= p.x && p.x <= this.x + this.width && this.y<= p.y && p.y <= this.y + this.height;
    },

    containsRect: function(r) {
	return this.x <= r.x && this.y<= r.y && r.maxX()<=this.maxX() && r.maxY()<=this.maxY();
    },

    constrainPt: function(pt) { return pt.maxPt(this.topLeft()).minPt(this.bottomRight()); },

    intersection: function(r) {
	return rect(this.topLeft().maxPt(r.topLeft()),this.bottomRight().minPt(r.bottomRight())); 
    },

    union: function(r) {
	return rect(this.topLeft().minPt(r.topLeft()),this.bottomRight().maxPt(r.bottomRight())); 
    },

    isNonEmpty: function(rect) { return this.topLeft().lessPt(this.bottomRight()); },

    dist: function(r) { // dist between two rects
	var p1 = this.closestPointToPt(r.center()); 
	var p2 = r.closestPointToPt(p1);  
	return p1.dist(p2); 
    },

    closestPointToPt: function(p) { // Assume p lies outside me; return a point on my perimeter
	return pt(Math.min(Math.max(this.x, p.x), this.maxX()),
		  Math.min(Math.max(this.y, p.y), this.maxY())); 
    },

    translatedBy: function(d) {
	return new Rectangle(this.x+d.x, this.y+d.y, this.width, this.height); 
    },

    scaleByRect: function(r) { // r is a relative rect, as a pane spec in a window
	return new Rectangle (
	    this.x + (r.x*this.width),
	    this.y + (r.y*this.height),
	    r.width * this.width,
	    r.height * this.height ); 
    },

    scaleRectIn: function(fullRect) { // return a relative rect for this as a part of fullRect
	return new Rectangle (
	    (this.x - fullRect.x) / fullRect.width,
	    (this.y - fullRect.y) / fullRect.height,
	    this.width  / fullRect.width,
	    this.height / fullRect.height ); 
    },

    insetBy: function(d) {
	return new Rectangle(this.x+d, this.y+d, this.width-(d*2), this.height-(d*2));
    },

    insetByPt: function(p) {
	return new Rectangle(this.x+p.x, this.y+p.y, this.width-(p.x*2), this.height-(p.y*2));
    },

    expandBy: function(delta) { return this.insetBy(0 - delta); }

});

Object.extend(Rectangle, {
    corners: ["topLeft","topRight","bottomRight","bottomLeft"], 
    sides: ["leftCenter","rightCenter","topCenter","bottomCenter"]
});

Rectangle.addMethods({

    partNamed: function(partName) { 
	return this[partName].call(this); 
    },

    withPartNamed: function(partName,newValue) {
	return this[this.setterName(partName)].call(this, newValue); 
    },

    setterName: function(partName) {
	return "with" + partName.substring(0,1).toUpperCase() + partName.substring(1); 
    },

    partNameNear: function(partNames,p,dist) { 
	var partName = this.partNameNearest(partNames,p);
	return (p.dist(this.partNamed(partName)) < dist) ? partName : null; 
    },

    partNameNearest: function(partNames, p) { 
	var dist = 1.0e99;
	var partName = partNames[0];

	for (var i=0; i<partNames.length; i++) { 
	    var partName = partNames[i];
	    var pDist = p.dist(this.partNamed(partName));
	    if (pDist < dist) {var nearest = partName; dist = pDist} 
	}

	return nearest; 
    },

    toString: function() { 
	return Strings.format("rect(%s,%s)", this.topLeft(), this.bottomRight());
    },
    
    toTuple: function() {
	return [this.x, this.y, this.width, this.height];
    },

    inspect: function() {
	return JSON.serialize(this);
    }
});

Rectangle.addMethods({
    // These methods enable using rectangles as insets, modeled after
    // the CSS box model, see http://www.w3.org/TR/REC-CSS2/box.html
    // note topLeft() bottomRight() etc, return the intuitively
    // correct values for Rectangles used as insets.

    left: function() {
	return this.x;
    },

    right: function() {
	return this.maxX();
    },

    top: function() {
	return this.y;
    },

    bottom: function() {
	return this.maxY();
    },

    toInsetTuple: function() {
	return [this.left(), this.top(), this.right(), this.bottom()];
    },

    toAttributeValue: function(d) {
	var d = 0.01;
	var result = [this.left()];
	if (this.top() === this.bottom() && this.left() === this.right()) {
	    if (this.top() === this.left()) result.push(this.top());
	} else result = result.concat([this.top(), this.right(), this.bottom()]);
	return result.invoke('roundTo', d || 0.01);
    },

    insetByRect: function(r) {
	return new Rectangle(this.x + r.left(), this.y + r.top(), this.width - (r.left() + r.right()), this.height - (r.top() + r.bottom()));
    }
});



Object.extend(Rectangle, {

    fromAny: function(ptA, ptB) {
	return rect(ptA.minPt(ptB), ptA.maxPt(ptB));
    },
    
    unionPts: function(points) {
	var min = points[0];
	var max = points[0];

	// AT: Loop starts from 1 intentionally
	for (var i = 1; i < points.length; i++) {
	    min = min.minPt(points[i]);
	    max = max.maxPt(points[i]); 
	}

	return rect(min, max); 
    },

    ensure: function(duck) {
	if (duck instanceof Rectangle) {
	    return duck;
	} else {
	    return new Rectangle(duck.x, duck.y, duck.width, duck.height);
	}
    },

    fromElement: function(element) {
	return new Rectangle(element.x.baseVal.value, element.y.baseVal.value, 
			     element.width.baseVal.value, element.height.baseVal.value);
    },

    inset: function(left, top, right, bottom) {
	if (top === undefined) top = left;
	if (right === undefined) right = left;
	if (bottom === undefined) bottom = top;
	return new Rectangle(left, top, right - left, bottom - top);
    }

});

// Shorthand for creating rectangle objects
function rect(location, corner) {
    return new Rectangle(location.x, location.y, corner.x - location.x, corner.y - location.y);
};

// ===========================================================================
// Color support
// ===========================================================================

Object.subclass("Color", { 

    documentation: "Fully portable support for RGB colors",

    initialize: function(r, g, b) {
	this.r = r;
	this.g = g;
	this.b = b;
    },

    // Mix with another color -- 1.0 is all this, 0.0 is all other
    mixedWith: function(other, proportion) { 
	var p = proportion;
	var q = 1.0 - p;
	return new Color(this.r*p + other.r*q, this.g*p + other.g*q, this.b*p + other.b*q); 
    },

    darker: function(recursion) { 
	var result = this.mixedWith(Color.black, 0.5);
	return recursion > 1  ? result.darker(recursion - 1) : result;
    },

    lighter: function(recursion) { 
	if (recursion == 0) 
	    return this;
	var result = this.mixedWith(Color.white, 0.5);
	return recursion > 1 ? result.lighter(recursion - 1) : result;
    },

    toString: function() {
	function floor(x) { return Math.floor(x*255.99) };
	return "rgb(" + floor(this.r) + "," + floor(this.g) + "," + floor(this.b) + ")";
    },
    
    toTuple: function() {
	return [this.r, this.g, this.b];
    },

    deserialize: function(importer, str) {
	if (!str || str == "none") return null;

	// FIXME this should be much more refined
	var match = str.match("rgb\\((\\d+),(\\d+),(\\d+)\\)");
	if (match) { 
	    this.r = parseInt(match[1])/255;
	    this.g = parseInt(match[2])/255;
	    this.b = parseInt(match[3])/255;
	} else { 
	    throw new Error('color ' + str + ' unsupported');
	}
    }
});

Object.extend(Color, {

    black: new Color(0,0,0),
    white: new Color(1,1,1),
    gray: new Color(0.8,0.8,0.8),
    red: new Color(0.8,0,0),
    green: new Color(0,0.8,0),
    yellow: new Color(0.8,0.8,0),
    blue:  new Color(0,0,0.8),
    purple: new Color(1,0,1),
    magenta: new Color(1,0,1),

    random: function() {
	return new Color(Math.random(),Math.random(),Math.random()); 
    },

    hsb: function(hue,sat,brt) {
	var s = sat;
	var b = brt;
	// zero saturation yields gray with the given brightness
	if (sat == 0) return new Color(b,b,b);
	var h = hue % 360;
	var h60 = h / 60;
	var i = Math.floor(h60); // integer part of hue
	var f = h60 - i; // fractional part of hue
	var p = (1.0 - s) * b;
	var q = (1.0 - (s * f)) * b;
	var t = (1.0 - (s * (1.0 - f))) * b;

	switch (i) {
	case 0:  return new Color(b,t,p);
	case 1:  return new Color(q,b,p);
	case 2:  return new Color(p,b,t);
	case 3:  return new Color(p,q,b);
	case 4:  return new Color(t,p,b);
	case 5:  return new Color(b,p,q);
	default: return new Color(0,0,0); 
	} 
    },

    wheel: function(n) { 
	return Color.wheelHsb(n,0.0,0.9,0.7); 
    },

    // Return an array of n colors of varying hue
    wheelHsb: function(n,hue,sat,brt) {
	var a = new Array(n);
	var step = 360.0 / (Math.max(n,1));

	for (var i = 0; i < n; i++) 
	    a[i] = Color.hsb(hue + i*step, sat, brt);

	return a; 
    },

    rgb: function(r, g, b) {
	return new Color(r/255, g/255, b/255);
    }

});

Object.extend(Color, {
    darkGray: Color.gray.darker(),
    lightGray: Color.gray.lighter(),
    veryLightGray: Color.gray.lighter().lighter(),
    turquoise: Color.rgb(0, 240, 255),
    //    brown: Color.rgb(182, 67, 0),
    //    red: Color.rgb(255, 0, 0),
    orange: Color.rgb(255, 153, 0),
    //    yellow: Color.rgb(204, 255, 0),
    //    limeGreen: Color.rgb(51, 255, 0),
    //    green: Color.rgb(0, 255, 102),
    //    cyan: Color.rgb(0, 255, 255),
    //    blue: Color.rgb(0, 102, 255),
    //    purple: Color.rgb(131, 0, 201),
    //    magenta: Color.rgb(204, 0, 255),
    //    pink: Color.rgb(255, 30, 153),
    primary: {
	// Sun palette
	blue: Color.rgb(0x53, 0x82, 0xA1),
	orange: Color.rgb(0xef, 0x6f, 0x00),
	green: Color.rgb(0xb2, 0xbc, 00),
	yellow: Color.rgb(0xff, 0xc7, 0x26)
    },

    secondary: {
	blue: Color.rgb(0x35, 0x55, 0x6b),
	orange: Color.rgb(0xc0, 0x66, 0x00),
	green: Color.rgb(0x7f, 0x79, 0x00),
	yellow: Color.rgb(0xc6, 0x92, 0x00)
    },

    neutral: {
	lightGray: Color.rgb(0xbd, 0xbe, 0xc0),
	gray: Color.rgb(0x80, 0x72, 0x77)
    }

});

console.log("Loaded platform-independent graphics primitives");

// ===========================================================================
// Gradient colors, stipple patterns and coordinate transformatins
// ===========================================================================


/**
  * @class Gradient (NOTE: PORTING-SENSITIVE CODE)
  */

Wrapper.subclass("Gradient", {


    addStop: function(offset, color) {
	this.rawNode.appendChild(NodeFactory.create("stop", {offset: offset, "stop-color": color}));
	return this;
    },

    rawStopNodes: function() {
	var array = [];
	var subnodes = this.rawNode.childNodes;
	for (var i = 0; i < subnodes.length; i++) {
	    var n = subnodes.item(i);
	    if (n.localName == "stop") 
		array.push(n);
	}
	return array;
    },

    stopColor: function(index) {
	var stops = this.rawStopNodes();
	if (!stops || !stops[index || 0]) return null;
	return new Color(Importer.prototype, stops[index || 0].getAttributeNS(null, "stop-color"));
    },

    offset: function(index) {
	var stops = this.rawStopNodes();
	if (!stops || !stops[index || 0]) return null;
	return Converter.parseLength(stops[index || 0].getAttributeNS(null, "offset"));
    },

    processSpec: function(stopSpec) {
	// spec is an array of the form [color_1, delta_1, color_2, delta_2 .... color_n],
	// deltas are converted into stop-offsets by normalizing to the sum of all deltas,
	// e.g [c1, 1, c2, 3, c3] results three stops at 0, 25% and 100%.
	
	if (stopSpec.length %2 == 0) throw new Error("invalid spec");
	var sum = 0; // [a, 1, b]
	for (var i = 1; i < stopSpec.length; i += 2)
	    sum += stopSpec[i];
	var offset = 0; 
	for (var i = 1; i <= stopSpec.length; i += 2) {
	    this.addStop(offset, stopSpec[i - 1]);
	    if (i != stopSpec.length)
		offset += stopSpec[i]/sum;
	}
    },

    setDerivedId: function(owner) {
	this.setId("gradient_" + owner.id());
	return this;
    }

});


/**
  * @class LinearGradient (NOTE: PORTING-SENSITIVE CODE)
  */

// note that Colors and Gradients are similar
Gradient.subclass("LinearGradient", {

    initialize: function($super, stopSpec, vector) {
	vector = vector || LinearGradient.NorthSouth;
	this.rawNode = NodeFactory.create("linearGradient",
					  {x1: vector.x, y1: vector.y, 
					   x2: vector.maxX(), y2: vector.maxY()}); 
	this.processSpec(stopSpec);
	return this;
    },

    mixedWith: function(color, proportion) {
	var stops = this.rawStopNodes();
	var rawNode = NodeFactory.create("linearGradient");
	var result = new LinearGradient(Importer.prototype, rawNode);
	for (var i = 0; i < stops.length; i++) {
	    result.addStop(this.offset(i), this.stopColor(i).mixedWith(color, proportion));
	}
	return result;
    },

    toString: function() {
	return "#<" + this.getType() + this.toMarkupString() + ">";
    }

});

Object.extend(LinearGradient, {
    NorthSouth: rect(pt(0, 0), pt(0, 1)),
    SouthNorth: rect(pt(0, 1), pt(0, 0)),
    EastWest:   rect(pt(0, 0), pt(1, 0)),
    WestEast:   rect(pt(1, 0), pt(0, 0))
});

/**
  * @class RadialGradient (NOTE: PORTING-SENSITIVE CODE)
  */

Gradient.subclass('RadialGradient', {

    initialize: function($super, stopSpec, optF) {
	this.rawNode = NodeFactory.create("radialGradient");
	if (optF) {
	    this.rawNode.setAttributeNS(null, "fx", optF.x);
	    this.rawNode.setAttributeNS(null, "fy", optF.y);
	}
	this.processSpec(stopSpec);
    }
});

Wrapper.subclass('ClipPath', {
    initialize: function(shape) {
	this.rawNode = NodeFactory.create('clipPath');
	// Safari used to require a path, not just any shape
	//this.rawNode.appendChild(shape.toPath().rawNode);
	// FIXME cleanup the unused attributes (stroke width and such).
	this.rawNode.appendChild(shape.rawNode.cloneNode(false));
    },

    setDerivedId: function(owner) {
	this.setId("clipPath_" + owner.id());
	return this;
    }

});

/**
  * @class Similitude (NOTE: PORTING-SENSITIVE CODE)
  */

Object.subclass('Similitude', {

    documentation: "Support for object rotation, scaling, etc.",
    translation: null, // may be set by instances to a component SVGTransform
    rotation: null, // may be set by instances to a component SVGTransform
    scaling: null, // may be set by instances to a component SVGTransform
    eps: 0.0001, // precision

    /**
      * createSimilitude: a similitude is a combination of translation rotation and scale.
      * one could argue that Similitude is a superclass of Transform, not subclass.
      * @param [Point] delta
      * @param [float] angleInRadians
      * @param [float] scale
      */
    initialize: function(delta, angleInRadians, scale) {
	if (angleInRadians === undefined) angleInRadians = 0.0;
	if (scale === undefined) scale = 1.0;
	this.a = scale * Math.cos(angleInRadians);
	this.b = scale * Math.sin(angleInRadians);
	this.c = scale * - Math.sin(angleInRadians);
	this.d = scale * Math.cos(angleInRadians);
	this.e =  delta.x;
	this.f =  delta.y;
	this.matrix_ = this.toMatrix();
    },

    getRotation: function() { // in degrees
	var r =  Math.atan2(this.b, this.a).toDegrees();
	return Math.abs(r) < this.eps ? 0 : r; // don't bother with values very close to 0
    },

    getScale: function() {
	var a = this.a;
	var b = this.b;
	var s = Math.sqrt(a * a + b * b);
	return Math.abs(s - 1) < this.eps ? 1 : s; // don't bother with values very close to 1
    },

    isTranslation: function() {
	return this.matrix_.type === SVGTransform.SVG_TRANSFORM_TRANSLATE;
    },

    getTranslation: function() {
	return pt(this.e, this.f);
    },

    toAttributeValue: function() {
	var delta = this.getTranslation();
	var attr = "translate(" + delta.x + "," + delta.y +")";
	var theta = this.getRotation();

	if (theta != 0.0)
	    attr += " rotate(" + this.getRotation()  +")"; // in degrees

	var factor = this.getScale();

	if (factor != 1.0) 
	    attr += " scale(" + this.getScale() + ")";

	return attr;
    },

    applyTo: function(visual) {
	var rawNode = visual.rawNode;
	if (Config.useTransformAPI) {
	    var list = rawNode.transform.baseVal;
	    var canvas = visual.canvas();

	    if (!this.translation) this.translation = canvas.createSVGTransform();
	    this.translation.setTranslate(this.e, this.f);
	    list.initialize(this.translation);
	    if (this.b || this.c) {
		if (!this.rotation) this.rotation = canvas.createSVGTransform();
		this.rotation.setRotate(this.getRotation(), 0, 0);
		list.appendItem(this.rotation);
	    }
	    if (this.a != 1.0 || this.d != 1.0) {
		if (!this.scaling) this.scaling = canvas.createSVGTransform();
		var scale = this.getScale();
		this.scaling.setScale(scale, scale);
		list.appendItem(this.scaling);
	    }
	} else {
	    rawNode.setAttributeNS(null, "transform", this.toAttributeValue());
	}
    },

    toString: function() {
	return this.toAttributeValue();
    },

    transformPoint: function(p, acc) {
	return p.matrixTransform(this, acc);
    },

    transformRectToRect: function(r) {
	var p = this.transformPoint(r.topLeft());
	var min = p.copy();
	var max = p.copy();

	p = this.transformPoint(r.topRight(), p);
	min = min.minPt(p, min);
	max = max.maxPt(p, max);

	p = this.transformPoint(r.bottomRight(), p);
	min = min.minPt(p, min);
	max = max.maxPt(p, max);

	p = this.transformPoint(r.bottomLeft(), p);
	min = min.minPt(p, min);
	max = max.maxPt(p, max);

	return rect(min, max);
    },

    copy: function() {
	return new Transform(this);
    },

    canvas: function() {
	var world = WorldMorph.current(); // forward reference to WorldMorph :(
	if (world) return world.canvas();
	else return Global.document.getElementById("canvas"); // in early stages world may be null
    },

    toMatrix: function() {
	var mx = this.canvas().createSVGMatrix();
	// note that if a,b,.. f are not numbers, it's usually a
	// problem, which may crash browsers (like Safari) that don't
	// do good typechecking of SVGMatrix properties before passing
	// them to native code. We could check here, but the problem
	// most likely happened much earlier
	mx.a = this.a;
	mx.b = this.b;
	mx.c = this.c;
	mx.d = this.d;
	mx.e = this.e;
	mx.f = this.f;
	return mx;
    },

    fromMatrix: function(mx) {
	this.a = mx.a;
	this.b = mx.b;
	this.c = mx.c;
	this.d = mx.d;
	this.e = mx.e;
	this.f = mx.f;
	this.matrix_ = this.toMatrix();
    },
    
    preConcatenate: function(t) {
	var m = this.matrix_;
	this.a =  t.a * m.a + t.c * m.b;
	this.b =  t.b * m.a + t.d * m.b;
	this.c =  t.a * m.c + t.c * m.d;
	this.d =  t.b * m.c + t.d * m.d;
	this.e =  t.a * m.e + t.c * m.f + t.e;
	this.f =  t.b * m.e + t.d * m.f + t.f;
	this.matrix_ = this.toMatrix();
	return this;
    }
    

});

/**
  * @class Transform (NOTE: PORTING-SENSITIVE CODE)
  * This code is dependent on SVG transformation matrices.
  * See: http://www.w3.org/TR/2003/REC-SVG11-20030114/coords.html#InterfaceSVGMatrix 
  */

Similitude.subclass('Transform', {

    initialize: function(duck) { // matrix is a duck with a,b,c,d,e,f, could be an SVG matrix or a Lively Transform
	// note: doesn't call $super
	if (duck) {
	    this.fromMatrix(duck);
	} else {
	    this.a = this.d = 1.0;
	    this.b = this.c = this.e = this.f = 0.0;
	    this.matrix_ = this.toMatrix();
	}
    },

    createInverse: function() {
	return new Transform(this.matrix_.inverse());
    }

});

// ===========================================================================
// Event handling foundations
// ===========================================================================

/**
  * @class Event: replacement Event class. (NOTE: PORTING-SENSITIVE CODE)
  * The code below rebinds the Event class to a LK substitute that wraps around 
  * the browser implementation.
  * For a detailed description of the Event class provided by browsers,
  * refer to, e.g., David Flanagan's book (JavaScript: The Definitive Guide).
  */

var Event = (function() {
    var tmp = Event; // note we're rebinding the name Event to point to a different class 

    var capitalizer = { mouseup: 'MouseUp', mousedown: 'MouseDown', mousemove: 'MouseMove', 
	mouseover: 'MouseOver', mouseout: 'MouseOut', mousewheel: 'MouseWheel',
	keydown: 'KeyDown', keypress: 'KeyPress', keyup: 'KeyUp' };


    var Event = Object.subclass('Event', {

	initialize: function(rawEvent) {
	    this.rawEvent = rawEvent;
	    this.type = capitalizer[rawEvent.type] || rawEvent.type;
	    //this.charCode = rawEvent.charCode;

	    if (isMouse(rawEvent)) {
		var x = rawEvent.pageX || rawEvent.clientX;
		var y = rawEvent.pageY || rawEvent.clientY;
		var topElement = this.canvas().parentNode;

		// note that FF doesn't doesnt calculate offsetLeft/offsetTop early enough we don't precompute these values
		// assume the parent node of Canvas has the same bounds as Canvas
		this.mousePoint = pt(x - (topElement.offsetLeft || 0), 
				     y - (topElement.offsetTop  || 0) - 3);
		// console.log("mouse point " + this.mousePoint);
		//event.mousePoint = pt(event.clientX, event.clientY  - 3);
		this.priorPoint = this.mousePoint; 
	    } 
	    this.hand = null;

	    // use event.timeStamp
	    // event.msTime = (new Date()).getTime();
	    this.mouseButtonPressed = false;
	},

	canvas: function() {
	    if (!UserAgent.usableOwnerSVGElement) {
		// so much for multiple worlds on one page
		return Global.document.getElementById("canvas");
	    } else {
		return this.rawEvent.currentTarget.ownerSVGElement;
	    }
	},

	stopPropagation: function() {
	    this.rawEvent.stopPropagation();
	},

	preventDefault: function() {
	    this.rawEvent.preventDefault();
	},

	stop: function() {
	    this.preventDefault();
	    this.stopPropagation();
	},

	isAltDown: function() {
	    return this.rawEvent.altKey;
	},

	isCommandKey: function() {
	    // this is LK convention, not the content of the event
	    return Config.useMetaAsCommand ? this.isMetaDown() : this.isAltDown();
	},

	isShiftDown: function() {
	    return this.rawEvent.shiftKey;
	},

	isMetaDown: function() {
	    return this.rawEvent.metaKey;
	},

	toString: function() {
	    return Strings.format("#<Event:%s%s%s>", this.type, this.mousePoint ?  "@" + this.mousePoint : "",
				  this.getKeyCode() || "");
	},

	setButtonPressedAndPriorPoint: function(buttonPressed, priorPoint) {
	    this.mouseButtonPressed = buttonPressed;
	    // if moving or releasing, priorPoint will get found by prior morph
	    this.priorPoint = priorPoint; 
	},

	handlerName: function() {
	    return "on" + this.type;
	},

	getKeyCode: function() {
	    return this.rawEvent.keyCode;
	},

	getKeyChar: function() {
	    if (this.type == "KeyPress") {
		var id = this.rawEvent.charCode;
		if (id > 63000) return ""; // Old Safari sends weird key char codes
		return id ? String.fromCharCode(id) : "";
	    } else  {
		var code = this.rawEvent.which;
		return code && String.fromCharCode(code);
	    }
	},

	wheelDelta: function() {
	    // FIXME: make browser-independent
	    return this.rawEvent.wheelDelta;
	},

	point: function() {
	    // likely origin of event, obvious for mouse events, the hand's position for
	    // keyboard events
	    return this.mousePoint || this.hand.getPosition();
	}

    });

    Event.rawEvent = tmp;

    Object.extend(Event, {
	// copied from prototype.js:
	KEY_BACKSPACE: 8,
	KEY_TAB:       9,
	KEY_RETURN:   13,
	KEY_ESC:      27,
	KEY_LEFT:     37,
	KEY_UP:       38,
	KEY_RIGHT:    39,
	KEY_DOWN:     40,
	KEY_DELETE:   46,
	KEY_HOME:     36,
	KEY_END:      35,
	KEY_PAGEUP:   33,
	KEY_PAGEDOWN: 34,
	KEY_INSERT:   45,

	// not in prototype.js:
	KEY_SPACEBAR: 32

    });

    var basicMouseEvents =  ["mousedown", "mouseup", "mousemove", "mousewheel"];
    var extendedMouseEvents = [ "mouseover", "mouseout"];
    var mouseEvents = basicMouseEvents.concat(extendedMouseEvents);

    Event.keyboardEvents = ["keypress", "keyup", "keydown"];
    Event.basicInputEvents = basicMouseEvents.concat(Event.keyboardEvents);

    function isMouse(rawEvent) {
	return mouseEvents.include(rawEvent.type);
    };

    return Event;
})();


(function() {
    var disabler = {    
	handleEvent: function(evt) { 	
	    evt.preventDefault(); 
	    return false;
	}
    };
    var canvas = Global.document.getElementById("canvas");
    canvas.addEventListener("dragstart", disabler, true);
    canvas.addEventListener("selectstart", disabler, true);
})();


// ===========================================================================
// Graphics primitives (SVG specific, browser-independent)
// ===========================================================================

Wrapper.subclass('Visual');

Visual.addProperties({ 
    FillOpacity: { name: "fill-opacity", from: Number, to: String, byDefault: 1.0},
    StrokeOpacity: { name: "stroke-opacity", from: Number, to: String, byDefault: 1.0},
    StrokeWidth: { name: "stroke-width", from: Number, to: String, byDefault: 0.0},
    Stroke: { name: "stroke", byDefault: "none"} // FIXME byDefault should be in JS not DOM type
});

Visual.addMethods({   

    documentation:  "Objects that can be located on the screen",
    //In this particular implementation, graphics primitives are
    //mapped onto various SVG objects and attributes.

    useNativeBounds: !!Config.useNativeBounds,

    rawNode: null, // set by subclasses

    /**
      * @param [String] string the string specification of the fill attribute.
      */
    setFill: function(string) {
	if (string) {
	    if (!string.startsWith) 
		console.log("what, string is " + string + " .. " + (typeof string.valueOf()));
	    else if (string.startsWith("uri"))
		console.log("setting %s on %s", string, this);
	}
	this.rawNode.setAttributeNS(null, "fill", string  || "none");
    },

    getFill: function() {
	return this.rawNode.getAttributeNS(null, "fill");
    },

    setLineJoin: function(joinType) {
	if (!joinType) throw new Error('undefined joinType');
	this.rawNode.setAttributeNS(null, 'stroke-linejoin', joinType);
    },

    setLineCap: function(capType) {
	if (!capType) throw new Error('undefined capType');
	this.rawNode.setAttributeNS(null, 'stroke-linecap', capType);
    },

    setStrokeDashArray: function(array) {
	if (!(array instanceof Array)) throw new Error('wrong type ' + array);
	this.rawNode.setAttributeNS(null, "stroke-dasharray", array);
    },

    setBounds: function(bounds) { 
	throw new Error('setBounds unsupported on type ' + this.getType());
    },

    // should that be disable?
    ignoreEvents: function() {
	this.setTrait("pointer-events", "none");
	return this;
    },

    enableEvents: function() {
	this.removeTrait("pointer-events");
	return this;
    },

    areEventsIgnored: function() {
	return this.getTrait("pointer-events") == "none";
    },
    
    getLocalTransform: function() {
	var impl = this.rawNode.transform.baseVal.consolidate();
	return new Transform(impl ? impl.matrix : null); // identity if no transform specified
    },

    getBoundingBox: function() { // bounds, but using native SVG functionality, and in the object's coordinates.
	return Rectangle.ensure(this.rawNode.getBBox());
    },

    nativeBounds: function() {
	var box = this.getBoundingBox();
	var ltfm = this.getLocalTransform();
	if (ltfm.isTranslation()) return box.translatedBy(ltfm.getTranslation());
	else return ltfm.transformRectToRect(box);
    },

    nativeWorldBounds: function() {
	var box = this.getBoundingBox();
	return new Transform(this.rawNode.getCTM()).transformRectToRect(box);
    },

    canvas: function() {
	if (!UserAgent.usableOwnerSVGElement) {
	    // so much for multiple worlds on one page
	    return Global.document.getElementById("canvas");
	} else {
	    return (this.rawNode && this.rawNode.ownerSVGElement) || Global.document.getElementById("canvas");
	}
    },
    
    nativeContainsWorldPoint: function(p) {
	var r = this.canvas().createSVGRect();
	r.x = p.x;
	r.y = p.y;
	r.width = r.height = 0;
	return this.canvas().checkIntersection(this.rawNode, rect);
    },

    undisplay: function() {
	return this.rawNode.setAttributeNS(null, "display", "none");
    },

    display: function() {
	this.rawNode.removeAttributeNS(null, "display");
    },

    isDisplayed: function() {
	// Note: this may not be correct in general in SVG due to inheritance,
	// but should work in LK.
	var hidden = this.rawNode.getAttributeNS(null, "display") == "none";
	return hidden == false;
    },

    applyFilter: function(filterUri) {
	if (filterUri) 
	    this.rawNode.setAttributeNS(null, "filter", filterUri);
	else
	    this.rawNode.removeAttributeNS(null, "filter");
    }

});



// ===========================================================================
// Shape functionality
// ===========================================================================

// Shapes are portable graphics structures that are used for isolating
// the implementation details of the underlying graphics architecture from
// the programmer.  Each Morph in our system has an underlying Shape object
// that maps the behavior of the Morph to the underlying graphics system
// in a fully portable fashion.

/**
  * @class Shape
  */ 

Visual.subclass('Shape', {

    shouldIgnorePointerEvents: false,
    controlPointProximity: 10,
    hasElbowProtrusions: false,

    toString: function() {
	return Strings.format("a Shape(%s,%s)", this.getType(), this.bounds());
    },

    initialize: function(fill, strokeWidth, stroke) {

	if (this.shouldIgnorePointerEvents)
	    this.ignoreEvents();

	if (fill !== undefined)
	    this.setFill(fill && fill.toString());

	if (strokeWidth !== undefined)
	    this.setStrokeWidth(strokeWidth);

	if (stroke !== undefined)
	    this.setStroke(stroke);

    },

    applyFunction: function(func,arg) { 
	func.call(this, arg); 
    },

    toPath: function() {
	throw new Error('unimplemented');
    }

});

// Default visual attributes for Shapes
Object.extend(Shape, {

    translateVerticesBy: function(vertices, delta) { // utility class method
	return vertices.invoke('addPt', delta); 
    },
    LineJoins: Class.makeEnum(["Miter", "Round", "Bevel" ]), // note that values become attribute values
    LineCaps:  Class.makeEnum(["Butt",  "Round", "Square"])  // likewise

});

 Shape.subclass('RectShape', {


    documentation: "Rectangle shape",

    initialize: function($super, rect, color, borderWidth, borderColor) {
	this.rawNode = NodeFactory.create("rect");
	this.setBounds(rect);
	$super(color, borderWidth, borderColor);
	return this;
    },

    setBounds: function(r) {
	this.setLengthTrait("x", r.x);
	this.setLengthTrait("y", r.y);
	this.setLengthTrait("width", Math.max(0, r.width));
	this.setLengthTrait("height", Math.max(0, r.height));
	return this;
    },

    toPath: function() {
	// FIXME account for rounded edges
	return new PathShape(this.bounds());
    },

    bounds: function() {
	if (this.useNativeBounds) {
	    var b = this.nativeBounds();
	    if (b.width && b.height) return b;
	    // else something is suspicious
	}

	var x = this.rawNode.x.baseVal.value;
	var y = this.rawNode.y.baseVal.value;
	var width = this.rawNode.width.baseVal.value;
	var height = this.rawNode.height.baseVal.value;
	return new Rectangle(x, y, width, height);
    },

    containsPoint: function(p) {
	var x = this.rawNode.x.baseVal.value;
	var width = this.rawNode.width.baseVal.value;
	if (!(x <= p.x && p.x <= x + width))
	    return false;
	var y = this.rawNode.y.baseVal.value;
	var height = this.rawNode.height.baseVal.value;
	return y <= p.y && p.y <= y + height;
    },

    reshape: function(partName,newPoint, ignored1, ignored2) {
	var r = this.bounds().withPartNamed(partName, newPoint);
	this.setBounds(r);
    },

    controlPointNear: function(p) {
	var bnds = this.bounds();
	return bnds.partNameNear(Rectangle.corners, p, this.controlPointProximity);
    },

    possibleHandleForControlPoint: function(targetMorph,mousePoint,hand) {
	var partName = this.controlPointNear(mousePoint);
	if (partName == null) 
	    return null;
	var loc = this.bounds().partNamed(partName);
	return new HandleMorph(loc, "rect", hand, targetMorph, partName); 
    },

    getBorderRadius: function() {
	return this.getLengthTrait("rx") || 0;
    },

    roundEdgesBy: function(r) {
	if (r) {
	    this.setLengthTrait("rx", r);
	    this.setLengthTrait("ry", r);
	    this.setStrokeWidth(this.getStrokeWidth());  // DI:  This is here only to force an update on screen
	}
	return this;
    }

});

Shape.subclass('EllipseShape', {

    documentation: "Ellipses and circles",

    initialize: function($super, rect, color, borderWidth, borderColor) {
	this.rawNode = NodeFactory.create("ellipse");
	this.setBounds(rect);
	$super(color, borderWidth, borderColor);
    },

    setBounds: function(r) {
	this.setLengthTrait("cx", r.x + r.width/2);
	this.setLengthTrait("cy", r.y + r.height/2);
	this.setLengthTrait("rx", r.width/2);
	this.setLengthTrait("ry", r.height/2);
	return this;
    },

    // For ellipses, test if x*x + y*y < r*r
    containsPoint: function(p) {
	var w = this.rawNode.rx.baseVal.value * 2;
	var h = this.rawNode.ry.baseVal.value * 2;
	var c = pt(this.rawNode.cx.baseVal.value, this.rawNode.cy.baseVal.value);
	var dx = Math.abs(p.x - c.x);
	var dy = Math.abs(p.y - c.y)*w/h;
	return (dx*dx + dy*dy) <= (w*w/4) ; 
    },

    bounds: function() {
	if (this.useNativeBounds) {
	    var b = this.nativeBounds();
	    if (b.width && b.height) return b;
	    // else something is suspicious
	}
	//console.log("rawNode " + this.rawNode);
	var w = this.rawNode.rx.baseVal.value * 2;
	var h = this.rawNode.ry.baseVal.value * 2; 
	var x = this.rawNode.cx.baseVal.value - this.rawNode.rx.baseVal.value;
	var y = this.rawNode.cy.baseVal.value - this.rawNode.ry.baseVal.value;
	return new Rectangle(x, y, w, h);
    }, 

    controlPointNear: function(p) {
	var bnds = this.bounds();
	return bnds.partNameNear(Rectangle.sides, p, this.controlPointProximity);
    },

    reshape: RectShape.prototype.reshape,

    possibleHandleForControlPoint: RectShape.prototype.possibleHandleForControlPoint

});

Shape.subclass('PolygonShape', {
    documentation: "polygon",

    hasElbowProtrusions: true,

    initialize: function($super, vertlist, color, borderWidth, borderColor) {
	this.rawNode = NodeFactory.create("polygon");
	this.setVertices(vertlist);
	$super(color, borderWidth, borderColor);
	return this;
    },

    setVertices: function(vertlist) {
	if (this.rawNode.points) {
	    this.rawNode.points.clear();
	}
	this.rawNode.setAttributeNS(null, "points", vertlist.map(function (p) { return p.x + "," + p.y }).join(' '));
	// FIXME: use DOM instead of attributes for the above
	// vertlist.forEach( function(p) {  this.points.appendItem(p); }, this);
    },

    vertices: function() {
	var array = [];
	for (var i = 0; i < this.rawNode.points.numberOfItems; i++) {
	    array.push(Point.ensure(this.rawNode.points.getItem(i)));
	}
	return array;
    },

    toString: function() {
	var pts = this.vertices();
	return this.rawNode.tagName + "[" + pts + "]";
    },

    bounds: function() {
	if (this.useNativeBounds) {
	    var b = this.nativeBounds();
	    if (b.width && b.height) return b;
	    // else something is suspicious
	}
	// FIXME very quick and dirty, consider caching or iterating over this.points
	var vertices = this.vertices();
	// Opera has been known not to update the SVGPolygonShape.points property to reflect the SVG points attribute
	console.assert(vertices.length > 0, 
		       "PolygonShape.bounds: vertices has zero length, " + this.rawNode.points 
		       + " vs " + this.rawNode.getAttributeNS(null, "points"));
	return Rectangle.unionPts(vertices);
    },

    reshape: function(partName, newPoint, handle, lastCall) {
	var ix = partName; // better name -- it's an index into vertices
	var verts = this.vertices();  // less verbose
	if (ix < 0) { // negative means insert a vertex
	    ix = -partName;
	    handle.partName = ix; 
	    handle.type = "rect"; // become a regular handle
	    verts.splice(ix, 0, newPoint);
	    this.setVertices(verts);
	    return; 
	}
	var closed = verts[0].eqPt(verts[verts.length - 1]);
	if (closed && ix == 0) {  // and we're changing the shared point (will always be the first)
	    verts[0] = newPoint;  // then change them both
	    verts[verts.length - 1] = newPoint; 
	} else {
	    verts[ix] = newPoint;
	}
	handle.setBorderColor(Color.blue);
	var howClose = 6;
	if (verts.length > 2) {
	    // if vertex being moved is close to an adjacent vertex, make handle show it (red)
	    // and if its the last call (mouse up), then merge this with the other vertex
	    if (ix > 0 && verts[ix - 1].dist(newPoint) < howClose) {
		if (lastCall) { 
		    verts.splice(ix, 1); if (closed) verts[0] = verts[verts.length - 1]; 
		} else {
		    handle.setBorderColor(Color.red);
		} 
	    }

	    if (ix < verts.length - 1 && verts[ix + 1].dist(newPoint)<howClose) {
		if (lastCall) { 
		    verts.splice(ix, 1); 

		    if (closed) { 
			verts[verts.length - 1] = verts[0];
		    }

		} else {
		    handle.setBorderColor(Color.red);
		} 
	    }
	}
	this.setVertices(verts); 
    },

    controlPointNear: function(p) {
	var verts = this.vertices();

	for (var i = 0; i < verts.length; i++) { // vertices
	    if (verts[i].dist(p) < this.controlPointProximity) 
		return i; 
	}

	for (var i = 0; i < verts.length - 1; i++) { // midpoints (for add vertex) return - index
	    if (verts[i].midPt(verts[i + 1]).dist(p) < this.controlPointProximity) 
		return -(i + 1); 
	}

	return null; 
    },

    // borrowed from http://local.wasp.uwa.edu.au/~pbourke/geometry/insidepoly/
    containsPoint: function(p) {
	var counter = 0;
	var vertices = this.vertices();
	var p1 = vertices[0];
	for (var i = 1; i <= vertices.length; i++) {
	    var p2 = vertices[i % vertices.length];
	    if (p.y > Math.min(p1.y, p2.y)) {
		if (p.y <= Math.max(p1.y, p2.y)) {
		    if (p.x <= Math.max(p1.x, p2.x)) {
			if (p1.y != p2.y) {
			    var xinters = (p.y-p1.y)*(p2.x-p1.x)/(p2.y-p1.y)+p1.x;
			    if (p1.x == p2.x || p.x <= xinters)
				counter ++;
			}
		    }
		}
	    }
	    p1 = p2;
	}

	if (counter % 2 == 0) {
	    return false;
	} else {
	    return true;
	}
    },

    possibleHandleForControlPoint: function(targetMorph, mousePoint, hand) {
	var partName = this.controlPointNear(mousePoint);

	if (partName == null) 
	    return null;

	var vertices = this.vertices();

	if (partName >= 0) { 
	    var loc = vertices[partName]; 
	    var shape = "rect"; 
	} else { 
	    var loc = vertices[-partName].midPt(vertices[-partName-1]); 
	    var shape = "ellipse"; 
	} 

	return new HandleMorph(loc, shape, hand, targetMorph, partName); 
    }

});

Shape.subclass('PolylineShape', {
    documentation: "Like polygon but not necessarily closed and does not include the interior",
    
    hasElbowProtrusions: true,

    initialize: function($super, vertlist, borderWidth, borderColor) {
	this.rawNode = NodeFactory.create("polyline");
	this.setVertices(vertlist);
	$super(null, borderWidth, borderColor);
    },

    containsPoint: function(p) {
	var howNear = 6;
	var vertices = this.vertices();
	for (var i = 1; i < vertices.length; i++) {
	    var pNear = p.nearestPointOnLineBetween(vertices[i-1], vertices[i]);
	    if (pNear.dist(p) < howNear) {
		return true; 
	    }
	}
	return false; 
    },

    // poorman's traits :)
    bounds: PolygonShape.prototype.bounds,
    vertices: PolygonShape.prototype.vertices,
    setVertices: PolygonShape.prototype.setVertices,
    reshape: PolygonShape.prototype.reshape,
    controlPointNear: PolygonShape.prototype.controlPointNear,
    possibleHandleForControlPoint: PolygonShape.prototype.possibleHandleForControlPoint

});

Shape.subclass('PathShape', {
    documentation: "Generic Path with arbitrary Bezier curves",

    hasElbowProtrusions: true,

    initialize: function($super, vertlistOrRect, color, borderWidth, borderColor) {
	this.rawNode = NodeFactory.create("path");
	$super(color, borderWidth, borderColor);
	if (vertlistOrRect instanceof Rectangle) {
	    var r = vertlistOrRect;
	    this.moveTo(r.x, r.y);
	    this.lineTo(r.x + r.width, r.y); 
	    this.lineTo(r.x + r.width, r.y + r.height);
	    this.lineTo(r.x, r.y + r.height);
	    this.close(); 
	} else this.setVertices(vertlistOrRect || []);
	return this;
    },

    setVertices: function(vertlist) {
	// emit SVG path symbol based on point attributes
	// p==point, i=array index
	function map2svg(p,i) {
	    var code;
	    if (i==0 || p.type && p.type=="move") {
		code = "M";
	    } else if (p.type && p.type=="line") {
		code = "L";
	    } else if (p.type && p.type=="arc" && p.radius) {
		code = "A" + (p.radius.x || p.radius) + "," +
		    (p.radius.y || p.radius) + " " + (p.angle || "0") +
		    " " + (p.mode || "0,1") + " ";
	    } else if (p.type && p.type=="curve" && p.control) {
		// keep control points relative so translation works
		code = "Q" + (p.x+p.control.x) + "," + (p.y+p.control.y) + " ";
	    } else {
		code = "T";  // default - bezier curve with implied control pts
	    }
	    return code + p.x + "," + p.y;
	}
	var d = vertlist.map(map2svg).join('');
	//console.log("d=" + d);
	if (d.length > 0)
	    this.rawNode.setAttributeNS(null, "d", d);
	this.verticesList = vertlist;
    },

    vertices: function() {
	return this.verticesList;
    },

    moveTo: function(x, y) {
	this.rawNode.pathSegList.appendItem(this.rawNode.createSVGPathSegMovetoAbs(x, y));
    },

    arcTo: function(x, y, r) {
	this.rawNode.pathSegList.appendItem(this.rawNode.createSVGPathSegArcAbs(x, y, r));
    },

    lineTo: function(x, y) {
	this.rawNode.pathSegList.appendItem(this.rawNode.createSVGPathSegLinetoAbs(x, y));
    },

    close: function() {
	this.rawNode.pathSegList.appendItem(this.rawNode.createSVGPathSegClosePath());
    },
    
    containsPoint: function(p) {
	if (UserAgent.webKitVersion >= 525)
	    return Rectangle.unionPts(this.verticesList).containsPoint(p);
	else return this.nativeContainsWorldPoint(p);
    },

    bounds: function() {
	try {
	    var r = this.rawNode.getBBox();
	    // check the coordinates!
	    return new Rectangle(r.x, r.y, r.width, r.height);
	} catch (er) {
	    var u = Rectangle.unionPts(this.verticesList);
	    return u;
	}
    },

    setBounds: function(bounds) { 
	console.log('setBounds unsupported on type ' + this.getType());
    },
    
    // poorman's traits :)
    controlPointNear: PolygonShape.prototype.controlPointNear,
    possibleHandleForControlPoint: PolygonShape.prototype.possibleHandleForControlPoint,
    reshape: PolygonShape.prototype.reshape,
    controlPointNear: PolygonShape.prototype.controlPointNear

});


Visual.subclass('Image', {
    description: "Primitive wrapper around images",
    
    initialize: function(url, width, height) {
	if (!url) return;
	var node;
	if (url.startsWith('#'))
	    this.loadUse(url);
	else
	    this.loadImage(url, width, height);
    },
    
    deserialize: function($super, importer, rawNode) {
	if (rawNode.namespaceURI != Namespace.SVG) {
            // this brittle and annoying piece of code is a workaround around the likely brokenness
            // of Safari's XMLSerializer's handling of namespaces
            var href = rawNode.getAttributeNS(null /* "xlink"*/, "href");
	    if (href)
		if (href.startsWith("#")) {
		    // not clear what to do, use target may or may not be in the target document
		    this.loadUse(href);
		} else {
		    this.loadImage(href);
		}
	} else {
	    $super(importer, rawNode);
	}
    },

    getWidth: function(optArg) {
	return Converter.parseLength((optArg || this.rawNode).getAttributeNS(null, "width"));
    },

    getHeight: function(optArg) {
	return Converter.parseLength((optArg || this.rawNode).getAttributeNS(null, "height"));
    },

    reload: function() {
	if (this.rawNode.localName == "image")  {
	    XLinkNS.setHref(this.rawNode, this.getURL() + "?" + new Date());
	}
    },

    getURL: function() {
	return XLinkNS.getHref(this.rawNode);
    },

    scaleBy: function(factor) {
	new Similitude(pt(0, 0), 0, factor).applyTo(this);
    },

    loadUse: function(url) {
	if (this.rawNode && this.rawNode.localName == "use") {
	    XLinkNS.setHref(this.rawNode, url);
	    return null; // no new node;
	} else {
	    this.removeRawNode();
	    this.rawNode = NodeFactory.create("use");
	    XLinkNS.setHref(this.rawNode, url);
	    return this.rawNode;
	}
    },

    loadImage: function(href, width, height) {
	if (this.rawNode && this.rawNode.localName == "image") {
	    XLinkNS.setHref(this.rawNode, href);
	    return null;
	} else {
	    var useDesperateSerializationHack = true;
	    if (useDesperateSerializationHack) {
		width = width || this.getWidth();
		height = height || this.getHeight();
		
		// this desperate measure appears to be necessary to work
		// around Safari's serialization issues.  Note that
		// somehow this code has to be used both for normal
		// loading and loading at deserialization time, otherwise
		// it'll fail at deserialization
		var xml = Strings.format('<image xmlns="http://www.w3.org/2000/svg" ' 
		    + 'xmlns:xlink="http://www.w3.org/1999/xlink" ' 
		    + ' width="%s" height="%s" xlink:href="%s"/>', width, height, href);
		
		this.rawNode = new Importer().parse(xml);
	    } else {
		
		// this should work but doesn't:
		
		this.rawNode = NodeFactory.createNS(Namespace.SVG, "image");
		this.rawNode.setAttribute("width", width);
		this.rawNode.setAttribute("height", height);
		XLinkNS.setHref(this.rawNode, href);
	    }
	    return this.rawNode;
	}
    }
});


Object.subclass('Exporter', {
    documentation: "Implementation class for morph serialization",

    rootMorph: null,

    initialize: function(rootMorph) {
	this.rootMorph = rootMorph;
	(rootMorph instanceof Morph) || console.log("weird, root morph is " + rootMorph);
    },

    extendForSerialization: function() {
	// decorate with all the extra needed to serialize correctly. Return the additional nodes, to be removed 
	var helperNodes = [];
	var simpleModels = []; // models are identified by their index in this array

	var exporter = this;
	this.rootMorph.withAllSubmorphsDo(function() { 
	    exporter.verbose && console.log("serializing " + this);
	    
	    this.prepareForSerialization(helperNodes, simpleModels);
	    // some formatting
	    var nl = NodeFactory.createNL();
	    this.rawNode.parentNode.insertBefore(nl, this.rawNode);
	    helperNodes.push(nl);
	});


	for (var i = 0; i < simpleModels.length; i++) {
	    // ...
	}
	return helperNodes;
    },

    removeHelperNodes: function(helperNodes) {
	for (var i = 0; i < helperNodes.length; i++) {
	    var n = helperNodes[i];
	    n.parentNode.removeChild(n);
	}
    },

    serialize: function(destDocument) {
	// model is inserted as part of the root morph.
	var helpers = this.extendForSerialization();
	var result = destDocument.importNode(this.rootMorph.rawNode, true);
	this.removeHelperNodes(helpers);
	return result;
    }


});

Object.extend(Exporter, {

    stringify: function(node) {
	return node ? new XMLSerializer().serializeToString(node) : null;
    },

    stringifyArray: function(nodes, conj) {
	return nodes.map(function(n) { return Exporter.stringify(n) }).join(conj);
    },

    shrinkWrapNode: function(node) {
	// FIXME deal with subdirectories: rewrite the base doc and change xlink:href for scripts
	var importer = new Importer();
	var newDoc = importer.getBaseDocument();
	importer.canvas(newDoc).appendChild(newDoc.importNode(node, true));
	return newDoc;
    },

    shrinkWrapMorph: function(morph) {
	var importer = new Importer();
	var newDoc = importer.getBaseDocument();
	importer.canvas(newDoc).appendChild(new Exporter(morph).serialize(newDoc));
	return newDoc;
    },

    saveDocumentToFile: function(doc, filename) {
	if (!filename) return null;
	if (!filename.endsWith('.xhtml')) {
	    filename += ".xhtml";
	    console.log("changed url to " + filename + " for base " + URL.source);
	}

	var url = URL.source.withFilename(filename);
	
	var status = new Resource(Record.newPlainInstance({URL: url})).store(doc, true).getStatus();
	
	if (status.isSuccess()) {
	    console.log("success publishing world at " + url + ", status " + status.code());
	    return url;
	} else {
	    WorldMorph.current().alert("failure publishing world at " + url + ", status " + status.code());
	}
	return null;
    },
    
    saveNodeToFile: function(node, filename) {
	return this.saveDocumentToFile(this.shrinkWrapNode(node), filename);
    }

});

Object.subclass('Copier', {
    documentation: "context for performing deep copy of objects",

    morphMap_: null,

    toString: function() { 
	return "#<Copier>"; 
    },

    initialize: function() {
	this.morphMap_ = [];
    },

    addMapping: function(oldId, newMorph) {
	this.morphMap_[Number(oldId)] = newMorph; 
    },

    lookupMorph: function(oldId) {
	return this.morphMap_[Number(oldId)];
    }

}); 

// 'dummy' copier for simple objects
Copier.marker = Object.extend(new Copier(), {
    addMapping: Functions.Empty,
    lookupMorph: Functions.Null
});

Copier.subclass('Importer', {
    documentation: "Implementation class for morph de-serialization",

    verbose: true,
    
    toString: function() {
	return "#<Importer>";
    },

    initialize: function($super) {
	$super();
	this.scripts = [];
	this.models = [];
    },

    canvas: function(doc) {
	// find the first "svg" element with id "canvas"
	var elements = doc.getElementsByTagName("svg");
	for (var i = 0; i < elements.length; i++) {
	    var el = elements.item(i);
	    if (el.getAttribute("id") == "canvas") {
		return el;
	    }
	}
	console.log("canvas not found in document " + doc);
	return null;
    },

    getBaseDocument: function() {
	// FIXME memoize
	var rec = Record.newPlainInstance({URL: URL.source});
	var req = new Resource(rec).fetch(true);
	var status = req.getStatus();
	if (!status.isSuccess()) {
	    console.log("failure retrieving  " + URL.source + ", status " + status);
	    return null;
	} else {
	    var doc = req.getResponseXML();
	    this.clearCanvas(doc);
	    return doc;
	}
    },

    
    canvasContent: function(doc) {
	var canvas = this.canvas(doc);
	var elements = [];
	for (var node = canvas.firstChild; node != null; node = node.nextSibling) {
	    switch (node.localName) {
	    case "g":
		elements.push(node);
		break;
	    }
	}
	return elements;
    },

    clearCanvas: function(doc) {
	var canvas = this.canvas(doc);
	var node = canvas.firstChild;
	while (node) {
	    var toRemove = node;
	    node = node.nextSibling;
	    if (toRemove.localName == "g") 
		canvas.removeChild(toRemove);
	}
    },

    addScripts: function(array) {
	if (array) this.scripts = this.scripts.concat(array); 
    },

    addModel: function(modelNode) {
	console.info("found modelNode %s", Exporter.stringify(modelNode));
	this.models.push(modelNode);
    },

    startScripts: function(world) {
	this.verbose && console.log("start scripts %s in %s", this.scripts, world);
	this.scripts.forEach(function(s) { s.start(world); });
    },

    
    importFromNode: function(rawNode) {
	///console.log('making morph from %s %s', node, LivelyNS.getType(node));
	// call reflectively b/c 'this' is not a Visual yet. 
	var morphTypeName = LivelyNS.getType(rawNode);
	
	if (!morphTypeName || !Global[morphTypeName]) {
	    throw new Error(Strings.format("node %s (parent %s) cannot be a morph of %s",
					   rawNode.tagName, rawNode.parentNode, morphTypeName));
	}

	try {
	    return new Global[morphTypeName](this, rawNode);
	} catch (er) {
	    console.log("%s instantiating type %s from node %s", er, 
			morphTypeName, Exporter.stringify(rawNode));
	    throw er;
	}
    },

    importFromString: function(string) {
	return this.importFromNode(this.parse(string));
    },

    parse: function(string) {
	var parser = new DOMParser();
	var xml = parser.parseFromString('<?xml version="1.0" standalone="no"?> ' + string, "text/xml");
	if (xml.documentElement.tagName == "html") {
	    throw new Error("xml parse error: " + Exporter.stringify(xml.documentElement));
	} 
	return document.importNode(xml.documentElement, true);
    },

    importFromNodeList: function(nodes) {
	var morphs = [];
	for (var i = 0; i < nodes.length; i++) {
	    var node = nodes[i];
	    // console.log("found node " + Exporter.stringify(node));
	    if (node.localName != "g")  continue;
	    morphs.push(this.importFromNode(node.ownerDocument === Global.document ? 
					    node : Global.document.importNode(node, true)));
	}
	return morphs;
    },

    finishImport: function(world) {
	this.hookupModels();
	try {
	    this.startScripts(world);
	} catch (er) {
	    console.log("scripts failed: " + er);
	}
    },

    importWorldFromNodeList: function(nodes, world) {
	var morphs = this.importFromNodeList(nodes);
	if (morphs[0]) {
	    if (morphs[0] instanceof WorldMorph) {
		world = morphs[0];
		if (morphs.length > 1) console.log("more than one top level morph following a WorldMorph, ignoring remaining morphs");
	    } else {
		// no world, create one and add all the shrinkwrapped morphs to it.
		world = world || new WorldMorph(document.getElementById("canvas"));
		morphs.clone().forEach(function(m) { world.addMorph(m); });
	    }
	}
	this.finishImport(world);
	return world;
    },

    loadWorldInSubworld: function(doc) {
	var nodes = this.canvasContent(doc);
	if (!nodes) {
	    WorldMorph.current().alert('no morphs found');
	    return null;
	}
	var world = new WorldMorph(WorldMorph.current().canvas());
	var morphs = this.importFromNodeList(nodes, world);

	morphs.forEach(function(morph) {
	    if (morph instanceof WorldMorph) morph.submorphs.clone().forEach(function(m) { world.addMorph(m) });
	    else world.addMorph(morph);
	});
	
	// post addition
	this.finishImport(world);
	
	var link = WorldMorph.current().reactiveAddMorph(new LinkMorph(world));
	link.addPathBack();
	return world;
    },

    loadWorldContentsInCurrent: function(doc) {
	var world = this.loadWorldContents(doc);
	// FIXME? scripts have started already ?
	world.submorphs.clone().forEach(function(m) { 
	    WorldMorph.current().addMorph(m) 
	});
    },
    
    loadWorldContents: function(doc) { 
	// possibly doc === Global.document; 
	var world = null;
	var morphs = this.importFromNodeList(this.canvasContent(doc));
	
	if (!(0 in morphs)) 
	    return null;
	
	if (morphs[0] instanceof WorldMorph) {
	    world = morphs[0];
	    if (morphs.length > 1) console.log("more than one top level morph following a WorldMorph, ignoring remaining morphs");
	} else {
	    // no world, create one and add all the serialized morphs to it.
	    world = new WorldMorph(document.getElementById("canvas"));
	    morphs.clone().forEach(function(m) { world.addMorph(m); });
	}
	
	this.finishImport(world);

	return world;
    },

    
    hookupModels: function() {
	this.models.forEach(function(node) { this.importModelFrom(node); }, this);
    },
    
    importModelFrom: function(modelNode) {
	var model = new SyntheticModel([]);
	var dependentViews = [];
	for (var node = modelNode.firstChild; node != null; node = node.nextSibling) {
	    if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.COMMENT_NODE)
		continue;
	    switch (node.localName) {
	    case "dependent":
		var oldId = LivelyNS.getAttribute(node, "ref");
		var dependent = this.lookupMorph(oldId);
		if (!dependent)  {
		    console.warn('dep %s not found', oldId);
		    continue; 
		}
		dependent.modelPlug.model = model;
		model.addDependent(dependent);
		break;

	    case "dependentView":
		dependentViews.push(node);
		break;
		
	    case "variable":
		var name = LivelyNS.getAttribute(node, "name");
		var content = node.firstChild;
		model.addVariable(name, JSON.unserialize(content.textContent));
		break;

	    case "dependentVariable":
		var name = LivelyNS.getAttribute(node, "name");
		var index = LivelyNS.getAttribute(node, "index");
		var dep = model.dependents[index];
		if (!dep) console.log("didnt find depdendentVariable at index " + index);
		else model.addVariable(name, dep); // FIXME order dependent!
		break;

	    default:
		console.log('got unexpected node %s %s', node.tagName, node); 
	    }
	}
	
	for (var i = 0; i < dependentViews.length; i++) {
	    var dep = dependentViews[i];
	    var type = LivelyNS.getAttribute(dep, "type");
	    if (type && Global[type]) {
		var plug = new ModelPlug(this, dep.firstChild);
		plug.model = model;
		try {
		    var dependent = new Global[type](this, plug);
		    this.verbose && console.log("deserialized dependent " + dependent + " with model " + model);
		} catch (er) {
		    alert("problem instantiating " + type);
		}
	    }
	}
	
	console.log('restored model %s', model);
	return model;
    }

});


// ===========================================================================
// Morph functionality
// ===========================================================================

Object.subclass('MouseHandlerForDragging', {

    handleMouseEvent: function(evt, targetMorph) {
	if (evt.type == "MouseDown") evt.hand.setMouseFocus(targetMorph);
	evt.hand.resetMouseFocusChanges();

	var handler = targetMorph[evt.handlerName()];
	if (handler) handler.call(targetMorph, evt, targetMorph);

	if (evt.type == "MouseUp") {
	    // cancel focus unless it was set in the handler
	    if (evt.hand.resetMouseFocusChanges() == 0) {
		evt.hand.setMouseFocus(null);
	    }
	}
	return true; 
    },

    handlesMouseDown: Functions.False
});

Object.subclass('MouseHandlerForRelay', {

    initialize: function (target, eventSpec) {
	//  Send events to a different target, with different methods
	//    Ex: box.relayMouseEvents(box.owner, {onMouseUp: "boxReleased", onMouseDown: "boxPressed"})
	this.target = target;
	this.eventSpec = eventSpec || {onMouseDown: "onMouseDown", onMouseMove: "onMouseMove", onMouseUp: "onMouseUp"};
    },

    handleMouseEvent: function(evt, originalTarget) {
	if (evt.type == "MouseDown") evt.hand.setMouseFocus(originalTarget);
	evt.hand.resetMouseFocusChanges();
	
	var handler = this.target[this.eventSpec[evt.handlerName()]];
	if (handler) handler.call(this.target, evt, originalTarget);

	if (evt.type == "MouseUp") {
	    // cancel focus unless it was set in the handler
	    if (evt.hand.resetMouseFocusChanges() == 0) {
		evt.hand.setMouseFocus(null);
	    }
	}
	return true; 
    },

    handlesMouseDown: Functions.True

});


namespace('lk.text');


using(lk.text).run(function(text) {


Visual.subclass('Morph', {

    documentation: "Base class for every graphical, manipulatable object in the system", 

    // prototype vars
    fill: Color.primary.green,
    borderWidth: 1,
    borderColor: Color.black,

    focusHaloBorderWidth: 4,

    fishEye: false,        // defines if fisheye effect is used
    fisheyeScale: 1.0,     // set the default scaling to 1.0
    fisheyeGrowth: 1.0,    // up to fisheyeGrowth size bigger (1.0 = double size)
    fisheyeProximity: 0.5, // where to react wrt/ size (how close we need to be)

    clipPath: null, // KP: should every morph should have one of those?
    keyboardHandler: null, //a KeyboardHandler for keyboard repsonse, etc
    layoutHandler: null, //a LayoutHandler for special response to setExtent, etc
    openForDragAndDrop: true, // Submorphs can be extracted from or dropped into me
    mouseHandler: MouseHandlerForDragging.prototype, //a MouseHandler for mouse sensitivity, etc
    noShallowCopyProperties: ['id', 'rawNode', 'shape', 'submorphs', 'defs', 'activeScripts', 'nextNavigableSibling', 'focusHalo', 'fullBounds', 'clipPath'],
    transientBounds: false,

    suppressBalloonHelp: Config.suppressBalloonHelp,

    nextNavigableSibling: null, // keyboard navigation

    internalInitialize: function(rawNode, transform) {
	this.rawNode = rawNode;
	this.submorphs = [];
	this.owner = null;
	LivelyNS.setType(this.rawNode, this.getType());
	this.setId(this.newMorphId());
    },

    initialize: function(initialBounds, shapeType) {
	//console.log('initializing morph %s %s', initialBounds, shapeType);
	this.internalInitialize(NodeFactory.create("g"));
	this.pvtSetTransform(new Similitude(this.defaultOrigin(initialBounds, shapeType)));
	this.initializePersistentState(initialBounds, shapeType);
	this.initializeTransientState(initialBounds);
    },
    
    deserialize: function(importer, rawNode) {

	// FIXME what if id is not unique?
	importer.addMapping(rawNode.getAttribute("id"), this); 
	this.internalInitialize(rawNode);
	this.pvtSetTransform(this.getLocalTransform());

	this.restoreFromSubnodes(importer);
	this.restorePersistentState(importer);    

	this.initializeTransientState(null);


	// collect scripts
	if (this.activeScripts) importer.addScripts(this.activeScripts);
	importer.verbose && console.log("deserialized " + this);
    },

    copyFrom: function(copier, other) {
	this.internalInitialize(other.rawNode.cloneNode(false));
	this.pvtSetTransform(this.getLocalTransform());

	this.initializePersistentState(pt(0,0).asRectangle(), "rect");

	if (other.hasSubmorphs()) { // deep copy of submorphs
	    other.submorphs.forEach(function each(m) { 
		var copy = m.copy(copier);
		copier.addMapping(m.id(), copy);
		copy.owner = null;  // Makes correct transfer of transform in next addMorph
		this.addMorph(copy);
	    }, this);
	}

	for (var p in other) {
	    if (!(other[p] instanceof Function) 
		&& other.hasOwnProperty(p) 
		&& !this.noShallowCopyProperties.include(p)) {
		if (other[p] instanceof Morph) {
		    var replacement = (p === "owner") ? null : copier.lookupMorph(other[p].id());
		    this[p] = replacement || other[p];
		    // an instance field points to a submorph, so copy
		    // should point to a copy of the submorph
		} else if (other[p] instanceof Image) {
		    this[p] = other[p].copy(copier);
		    this.addWrapper(this[p]);
		} else if (!(other[p] instanceof Gradient)) {		    
		    this[p] = other[p];
		} 
	    }
	} // shallow copy by default, note that arrays of Morphs are not handled
	

	this.internalSetShape(other.shape.copy());
	this.origin = other.origin.copy();

	if (other.cachedTransform) { 
	    this.cachedTransform = other.cachedTransform.copy();
	} 
	
	if (other.defs) {
	    this.restoreDefs(copier, other.defs, true);
	}

	this.initializeTransientState(null);
	
	if (other.activeScripts != null) { 
	    for (var i = 0; i < other.activeScripts.length; i++) {
		var a = other.activeScripts[i];
		// Copy all reflexive scripts (messages to self)
		if (a.actor === other) {
		    this.startStepping(a.stepTime, a.scriptName, a.argIfAny);
		    // Note -- may want to startStepping other as well so they are sync'd
		}
	    }
	} 

	this.layoutChanged();
	return this; 
    },

    restorePersistentState: function(importer) {
	var pointerEvents = this.getTrait("pointer-events");
	if (pointerEvents == "none") {
	    this.ignoreEvents();
	} else if (pointerEvents) {
	    console.log("can't handle pointer-events " + pointerEvents);
	}
	return; // override in subclasses
    },

    restoreDefs: function(importer, originalDefs, isOnClone) {
	function applyGradient(gradient, owner) {
	    gradient.setDerivedId(owner);
	    if (owner.shape) {
		var myFill = owner.shape.getFill();
		if (myFill)
		    owner.shape.setFill(gradient.uri());
		else console.warn('myFill undefined on %s', owner);
	    } else console.warn("cannot set fill %s (yet?), no shape...", gradient.id());
	    return gradient;
	}
	
	for (var def = originalDefs.firstChild; def != null; def = def.nextSibling) {
	    if (isOnClone) def = def.cloneNode(true);
	    switch (def.tagName) {
	    case "clipPath":
		if (!this.rawNode.getAttributeNS(null, 'clip-path'))
		    console.log('myClip is undefined on %s', this); 
		if (this.clipPath) throw new Error("how come clipPath is set to " + this.clipPath);
		this.clipPath = new ClipPath(Importer.prototype, def).setDerivedId(this);
		this.rawNode.setAttributeNS(null, 'clip-path', this.clipPath.uri());
		this.addWrapperToDefs(this.clipPath);
		break;
	    case "linearGradient":
		this.fill = this.addWrapperToDefs(applyGradient(new LinearGradient(Importer.prototype, def), this));
		break;
	    case "radialGradient": // FIXME gradients can be used on strokes too
		this.fill = this.addWrapperToDefs(applyGradient(new RadialGradient(Importer.prototype,  def), this));
		break;
	    case "g":
		this.restoreFromSubnode(importer, def);
		break;
	    default:
		console.warn('unknown def %s', def);
	    }
	}
    },

    restoreFromSubnode: function(importer, node) {
	// Override me
    },

    restoreFromSubnodes: function(importer) {
	//  wade through the children
	var children = [];
	var origDefs;
	for (var desc = this.rawNode.firstChild; desc != null; desc = desc.nextSibling) {
	    if (desc.nodeType == Node.TEXT_NODE || desc.nodeType == Node.COMMENT_NODE)
		continue; // ignore whitespace and maybe other things
	    if (desc.localName == "defs") {
		origDefs = desc;
		continue;
	    } 
	    var type = LivelyNS.getAttribute(desc, "type");
	    // alert("got node " + Exporter.stringify(desc));
	    // depth first traversal
	    if (type) {
		var morph = importer.importFromNode(desc);
		this.submorphs.push(morph); 
		morph.owner = this;
	    } else {
		children.push(desc);
	    }
	}

	if (origDefs) 
	    origDefs.parentNode.removeChild(origDefs);

	var modelNode = null;
	var helperNodes = [];

	for (var i = 0; i < children.length; i++) {
	    var node = children[i];
	    switch (node.localName) {
	    case "ellipse":
		this.shape = new EllipseShape(importer, node);
		break;
	    case "rect":
		this.shape = new RectShape(importer, node);
		break;
	    case "polyline":
		this.shape = new PolylineShape(importer, node);
		break;
	    case "polygon":
		this.shape = new PolygonShape(importer, node);
		break;
	    case "defs": 
		throw new Error();
	    case "g":
		this.restoreFromSubnode(importer, node);
		break;
		// nodes from the Lively namespace
	    case "action": {
		var a = new SchedulableAction(importer, node);
		a.actor = this;
		this.addActiveScript(a);
		// console.log('deserialized script ' + a);
		// don't start the action until morph fully constructed
		break;
	    }
	    case "model": {
		if (modelNode) console.warn("%s already has modelNode %s", this, modelNode);
		modelNode = node;
		// currently model node is not stored.
		helperNodes.push(node);
		// postpone hooking up model until all the morphs are reconstructed
		importer.addModel(modelNode);
		break;
	    } 
	    case "modelPlug": {
		this.modelPlug = new ModelPlug(importer, node);
		helperNodes.push(node);
		// console.info("%s reconstructed plug %s", this, this.modelPlug);
		break;
	    } 
	    case "field": {
		// console.log("found field " + Exporter.stringify(node));
		helperNodes.push(node);
		var name = LivelyNS.getAttribute(node, "name");
		var ref = LivelyNS.getAttribute(node, "ref");
		if (name) {
		    var found = this[name] = importer.lookupMorph(ref);
		    if (!found) {
			console.warn("no value found for field %s ref %s", name, ref);
		    } else {
			//node.parentNode.removeChild(node);
			// console.log("found " + name + "=" + found + "and assigned to " + this.id());
		    }
		}
		break;
	    }
	    default: {
		if (node.nodeType === Node.TEXT_NODE) {
		    console.log('text tag name %s', node.tagName);
		    // whitespace, ignore
		} else if (!this.restoreFromSubnode(importer, node)) {
		    console.warn('cannot handle node %s, %s', node.tagName || node.nodeType, node.textContent);
		}
	    }
	    }
	} // end for

	if (origDefs) { 
	    this.restoreDefs(importer, origDefs);
	}

	for (var i = 0; i < helperNodes.length; i++) {
	    var n = helperNodes[i];
	    n.parentNode.removeChild(n);
	}
    },

    initializePersistentState: function(initialBounds /*:Rectangle*/, shapeType/*:String*/) {
	// a rect shape by default, will change later
	switch (shapeType) {
	case "ellipse":
	    this.shape = new EllipseShape(initialBounds.translatedBy(this.origin.negated()),
					  this.fill, this.borderWidth, this.borderColor);
	    break;
	default:
	    // polygons and polylines are set explicitly later
	    this.shape = new RectShape(initialBounds.translatedBy(this.origin.negated()),
				       this.fill, this.borderWidth, this.borderColor);
	    break;
	}
	this.rawNode.appendChild(this.shape.rawNode);
	return this;
    },

    // setup various things 
    initializeTransientState: function(initialBounds) { 
	this.fullBounds = initialBounds; // a Rectangle in owner coordinates
	// this includes the shape as well as any submorphs
	// cached here and lazily computed by bounds(); invalidated by layoutChanged()

	// this.created = false; // exists on server now
	// some of this stuff may become persistent
    },


    pvtSerializeModel: function(extraNodes, simpleModels) {
	var model = this.getModel();
	if (model instanceof SyntheticModel) {
	    var index = simpleModels.indexOf(model);
	    if (index < 0) { // not seen before, serialize model
		index = simpleModels.length;
		var modelNode = model.toMarkup(index);
		simpleModels.push(model);
		modelNode.setAttribute("id", "model_" + index); 
		extraNodes.push(this.addNonMorph(modelNode));
	    }
	    extraNodes.push(this.addNonMorph(this.getModelPlug().serialize(index)));
	} else if (this.formalModel) {
	    var modelNode = this.getActualModel().rawNode;
	    if (modelNode instanceof Global.Node) {
		var index = simpleModels.indexOf(modelNode);
		if (index < 0) { // not seen before, serialize model
		    index = simpleModels.length;
		    simpleModels.push(modelNode);
		    alert('serializing ' + Exporter.stringify(modelNode) + "," + modelNode);
		    modelNode.setAttribute("id", "model_" + index); 
		    extraNodes.push(this.addNonMorph(modelNode));
		}
		// FIXME serialize hookup
		extraNodes.push(this.addNonMorph(this.formalModel.rawNode));
	    }
	} // else don't do anything
    },

    prepareForSerialization: function(extraNodes, simpleModels) {
	// this is the morph to serialize
	this.pvtSerializeModel(extraNodes, simpleModels);
	if (Config.useTransformAPI) {
	    // gotta set it explicitly, it's not in SVG
	    this.setTrait("transform", this.getTransform().toAttributeValue());
	    // FIXME, remove?
	}
	for (var prop in this) {
	    var m = this[prop];
	    if (m instanceof Morph) {
		if (prop == 'owner') 
		    continue; // we'll deal manually
		console.log("serializing field name='%s', ref='%s'", prop, m.id(), m.getType());
		var desc = LivelyNS.create("field", {name: prop, ref: m.id()});
		extraNodes.push(this.addNonMorph(desc));
	    }
	}
    },
    
    newMorphId: (function() { 
	var morphCounter = 0;
	return function() {
	    return ++ morphCounter;
	}
    })()
    
});

Morph.addProperties({ 
    CopySubmorphsOnGrab: {name: "copy-submorphs-on-grab", from:Converter.toBoolean, to:Converter.fromBoolean, byDefault: false}
});

// Functions for change management
Object.extend(Morph, {
    
    onLayoutChange: function(fieldName) { 
	return function layoutChangeAdvice(/* arguments*/) {
	    var priorExtent = this.innerBounds().extent();
	    this.changed();
	    var args = $A(arguments);
	    var proceed = args.shift();
	    var result = proceed.apply(this, args);
	    this.layoutChanged(priorExtent);
	    this.changed(); 
	    return result;
	}
    }

});

// Functions for manipulating the visual attributes of Morphs
Morph.addMethods({

    setFill: function(fill) {
	var old = this.fill;
	this.fill = fill;
	if (old instanceof Wrapper) 
	    old.removeRawNode();
	var attr;
	if (fill == null) {
	    attr = "none";
	} else if (fill instanceof Color) {
	    attr = fill.toString();
	} else if (fill instanceof Gradient) { 
	    this.fill = fill.copy().setDerivedId(this);
	    this.addWrapperToDefs(this.fill);
	    attr = this.fill.uri();
	}
	this.shape.setFill(attr);
    },

    getFill: function() {
	return this.fill; 
    },

    setBorderColor: function(newColor) { this.shape.setStroke(newColor); },

    getBorderColor: function() {
	return new Color(Importer.prototype, this.shape.getStroke());
    },

    setBorderWidth: function(newWidth) {
	this.shape.setStrokeWidth(newWidth); 
    },
    
    getBorderWidth: function() {
	return this.shape.getStrokeWidth(); 
    },

    shapeRoundEdgesBy: function(r) {
	this.shape.roundEdgesBy(r);
    },

    setFillOpacity: function(op) { this.shape.setFillOpacity(op); },

    setStrokeOpacity: function(op) { this.shape.setStrokeOpacity(op); },

    setLineJoin: function(joinType) { this.shape.setLineJoin(joinType); },

    setLineCap: function(capType) { this.shape.setLineCap(capType); },

    applyStyle: function(specs) { // note: use reflection instead?
	for (var i = 0; i < arguments.length; i++) {
	    var spec = arguments[i];
	    if (spec.borderWidth !== undefined) this.setBorderWidth(spec.borderWidth);
	    if (spec.borderColor !== undefined) this.setBorderColor(spec.borderColor);
	    if (spec.fill !== undefined) this.setFill(spec.fill);
	    if (spec.opacity !== undefined) {
		this.setFillOpacity(spec.opacity);
		this.setStrokeOpacity(spec.opacity); 
	    }
	    if (spec.fillOpacity !== undefined) this.setFillOpacity(spec.fillOpacity);
	    if (spec.strokeOpacity !== undefined) this.setStrokeOpacity(spec.strokeOpacity);

	    if (this.shape.roundEdgesBy && spec.borderRadius !== undefined) { 
		this.shape.roundEdgesBy(spec.borderRadius);
	    }
	}
	return this;
    },

    makeStyleSpec: function() {
	// Adjust all visual attributes specified in the style spec
	var spec = { };
	spec.borderWidth = this.getBorderWidth();
	spec.borderColor = this.getBorderColor();
	spec.fill = this.getFill();
	if (this.shape.getBorderRadius) spec.borderRadius = this.shape.getBorderRadius() || 0.0;
	spec.fillOpacity = this.shape.getFillOpacity() || 1.0;
	spec.strokeOpacity = this.shape.getStrokeOpacity() || 1.0;
	return spec;
    },

    applyStyleNamed: function(name) {
	this.applyStyle(this.styleNamed(name));
    },

    styleNamed: function(name) {
	// Look the name up in the Morph tree, else in current world
	if (this.displayTheme) return this.displayTheme[name];
	if (this.owner) return this.owner.styleNamed(name);
	return WorldMorph.current().styleNamed(name);
    },

    linkToStyles: function(arrayOfNames) {
	// Record the links for later updates, and apply them now
	this.styleLinks = arrayOfNames;
	this.applyLinkedStyles();
    },

    respondToChangingStyleNamed: function(name) {
	// (re)Apply my linked styles if name refers to one of them
	if (this.styleLinks && this.styleLinks.include(name)) this.applyLinkedStyles();
    },

    applyLinkedStyles: function() {
	// Apply all the styles to which I am linked, in order
	if (!this.styleLinks) return;

	for (var i = 0; i < this.styleLinks.length; i++) {
	    this.applyStyleNamed(this.styleLinks[i]); 
	}
    },

    // NOTE:  The following four methods should all be factored into a single bit of reshaping logic
    applyFunctionToShape: function() {  // my kingdom for a Smalltalk block!
	var args = $A(arguments);
	var func = args.shift();
	func.apply(this.shape, args);
	if (this.clipPath) {
	    // console.log('clipped to new shape ' + this.shape);
	    this.clipToShape();
	}
	this.adjustForNewBounds();
    }.wrap(Morph.onLayoutChange('shape')),

    internalSetShape: function(newShape) {
	if (!newShape.rawNode) {
	    console.log('newShape is ' + newShape);
	    Function.showStack();
	}
	
	this.rawNode.replaceChild(newShape.rawNode, this.shape.rawNode);
	this.shape = newShape;
	//this.layoutChanged(); 
	if (this.clipPath) {
	    // console.log('clipped to new shape ' + this.shape);
	    this.clipToShape();
	}
	this.adjustForNewBounds();
    },

    setShape: function(newShape) {
	this.internalSetShape(newShape);
    }.wrap(Morph.onLayoutChange('shape')),

    reshape: function(partName, newPoint, handle, lastCall) {
	this.shape.reshape(partName,newPoint,handle,lastCall); 

	// FIXME: consider converting polyline to polygon when vertices merge.
	if (this.clipPath) {
	    // console.log('clipped to new shape ' + this.shape);
	    this.clipToShape();
	}
	this.adjustForNewBounds();
    }.wrap(Morph.onLayoutChange('shape')),

    setVertices: function(newVerts) {
	// particular to polygons
	this.shape.setVertices(newVerts);
	this.adjustForNewBounds();
    }.wrap(Morph.onLayoutChange('shape')),

    internalSetBounds: function(newRect) {
	// DI: Note get/setBounds should be deprecated in favor of get/setExtent and get/setPosition
	// This is so that layout management can move things around without triggering redundant or
	// recursive calls on adjustForNewBounds(q.v.)

	// All calls on morph.setBounds should be converted to two calls as above (or just one if,
	// eg, only the extent or position is changing).

	// Of course setBounds remains entirely valid as a message to the *shape* object and, 
	// in fact, shape.setBounds() will have to be called from both setPosition and setExtent
	// but adjustForNewBounds will only need to be called from setExtent.

	// Finally, there is an argument for calling layoutChanged from setPosition and setExtent,
	// since the caller must do it otherwise.  This would simplify things overall.

	// DI:  Note that there is an inconsistency here, in that we are reading and comparing
	// the full bounds, yet if we set extent, it only affects the shape (ie, innerBounds)

	var priorBounds = this.bounds();

	if(!newRect.topLeft().eqPt(priorBounds.topLeft())) {  // Only set position if it changes
		this.setPosition(newRect.topLeft());
	}
	if(!newRect.extent().eqPt(priorBounds.extent())) {  // Only set extent if it changes
		// FIXME some shapes don't support setFromRect
		this.shape.setBounds(newRect.extent().extentAsRectangle());
 		this.adjustForNewBounds();
	}
	if (this.clipPath) {
	    // console.log('clipped to new shape ' + this.shape);
	    this.clipToShape();
	}
    },

    setBounds: function(newRect) {
 	//this.shape.setBounds(this.relativizeRect(newRect)); // FIXME some shapes don't support setFromRect
	this.internalSetBounds(newRect);
    }.wrap(Morph.onLayoutChange('shape')),

    setExtent: function(newExtent) {
	this.setBounds(this.getPosition().extent(newExtent));
    },

    getExtent: function(newRect) { return this.shape.bounds().extent() },

    containsPoint: function(p) { 
	// p is in owner coordinates
	if (!this.bounds().containsPoint(p)) return false;
	return this.shape.containsPoint(this.relativize(p)); 
    },

    containsWorldPoint: function(p) { // p is in world coordinates
	if (this.owner == null) return this.containsPoint(p);
	return this.containsPoint(this.owner.localize(p)); 
    },

    fullContainsPoint: function(p) { // p is in owner coordinates
	return this.bounds().containsPoint(p); 
    },

    fullContainsWorldPoint: function(p) { // p is in world coordinates
	if (this.owner == null) return this.fullContainsPoint(p);
	return this.fullContainsPoint(this.owner.localize(p)); 
    },

    addNonMorph: function(node) {
	if (node instanceof Wrapper) throw new Error("add rawNode, not the wrapper itself");
	return this.rawNode.insertBefore(node, this.shape && this.shape.rawNode.nextSibling);
    },

    addWrapper: function(w) {
	if (w && w.rawNode) {
	    this.addNonMorph(w.rawNode);
	    return w;
	} else return null;
    },

    addWrapperToDefs: function(wrapper) {
	if (!this.defs) {
	    this.defs = this.rawNode.insertBefore(NodeFactory.create("defs"), this.rawNode.firstChild);
	} 
	if (wrapper)
	    this.defs.appendChild(wrapper.rawNode);
	return wrapper;
    }

});

// Submorph management functions
Morph.addMethods({ 

    addMorph: function(morph) { return this.addMorphFrontOrBack(morph, true) },

    addMorphAt: function(morph, position) {
	var morph = this.addMorphFrontOrBack(morph, true);
	morph.setPosition(position);
	return morph;
    },

    addMorphFront: function(morph) { return this.addMorphFrontOrBack(morph, true) },

    addMorphBack: function(morph) { return this.addMorphFrontOrBack(morph, false) },

    addMorphFrontOrBack: function(m, front) {
	console.assert(m instanceof Morph, "not an instance");

	if (m.owner) {
	    var tfm = m.transformForNewOwner(this);
	    m.owner.removeMorph(m); // KP: note not m.remove(), we don't want to stop stepping behavior
	    m.setTransform(tfm); 
	    // FIXME transform is out of date
	    // morph.setTransform(tfm); 
	    // m.layoutChanged(); 
	} 

	m.owner = this;
	this.internalAddMorph(m, front);
	m.changed();
	m.layoutChanged();
	this.layoutChanged();
	return m;
    },

    internalAddMorph: function(m, isFront) {
	var insertionPt = this.submorphs.length == 0 ? this.shape.rawNode.nextSibling :
	    isFront ? this.submorphs.last().rawNode.nextSibling : this.submorphs.first().rawNode;
	// the last one, so drawn last, so front
	this.rawNode.insertBefore(m.rawNode, insertionPt);

	if (isFront)
	    this.submorphs.push(m);
	else
	    this.submorphs.unshift(m);
    },

    removeMorph: function(m) {
	var index = this.submorphs.indexOf(m);
	if (index < 0) {
	    m.owner !== this && console.log("%s has owner %s that is not %s?", m, m.owner, this);
	    return null;
	}

	m.removeRawNode();
	var spliced = this.submorphs.splice(index, 1);
	if (spliced instanceof Array) spliced = spliced[0];
	if (m !== spliced) {
	    console.log("invariant violated removing %s, spliced %s", m, spliced);
	}
	m.owner = null;
	m.setHasKeyboardFocus(false);
	return m;
    },

    removeAllMorphs: function() {
	this.submorphs.invoke('removeRawNode');
	this.submorphs.clear();
	this.layoutChanged(); 
    },

    hasSubmorphs: function() {
	return this.submorphs.length != 0;
    },

    remove: function() {
	if (!this.owner) return null;  // already removed

	this.stopStepping();
	this.owner.removeMorph(this);

	return this;
    },

    applyToAllSubmorphs: function(func, argumentArray) {
	func.apply(this, argumentArray);
	this.submorphs.invoke('withAllSubmorphsDo', func, argumentArray);
    },

    withAllSubmorphsDo: function(func, rest) {
	// Call the supplied function on me and all of my submorphs by recursion.
	var args = $A(arguments);
	args.shift();
	func.apply(this, args);
	for (var i = 0; i < this.submorphs.length; i++) {
	    this.submorphs[i].withAllSubmorphsDo(func, rest);
	}
    },

    topSubmorph: function() {
	// the morph on top is the last one in the list
	return this.submorphs.last();
    },

    // morph gets an opportunity to shut down when WindowMorph closes 
    shutdown: function() {
	this.remove();
    },

    okToDuplicate: Functions.True  // default is OK

});

// Morph bindings to its parent, world, canvas, etc.
Morph.addMethods({

    world: function() {
	return this.owner ? this.owner.world() : null;
    },

    toString: function() {
	try {
	    return Strings.format("%s(#%s,%s)", this.getType(), this.rawNode && this.id() || "" , 
				  this.shape ? "[" + this.shape.bounds().toTuple() + "]" : "");
	} catch (e) {
	    //console.log("toString failed on %s", [this.id(), this.getType()]);
	    return "#<Morph?{" + e + "}>";
	}
    },

    inspect: function() {
	try {
	    return this.toString();
	} catch (err) {
	    return "#<inspect error: " + err + ">";
	}
    },

    // Morph coordinate transformation functions

    // SVG has transform so renamed to getTransform()
    getTransform: function() {
	if (this.cachedTransform == null) { 
	    // we need to include fisheyeScaling to the transformation
	    this.cachedTransform = new Similitude(this.origin, this.rotation, this.scale * this.fisheyeScale);
	}
	return this.cachedTransform;
    },

    pvtSetTransform: function(tfm) {
	this.origin = tfm.getTranslation();
	this.rotation = tfm.getRotation().toRadians();
	this.scale = tfm.getScale();
	// we must make sure the Morph keeps its original size (wrt/fisheyeScale)
	this.scale = this.scale/this.fisheyeScale;
	this.cachedTransform = tfm; //new Similitude(this.origin, this.rotation, this.scale);
    },

    setTransform: function(tfm) { this.pvtSetTransform(tfm); }.wrap(Morph.onLayoutChange('transform')),

    transformToMorph: function(other) {
	// getTransformToElement has issues on some platforms
	if (Config.useGetTransformToElement) {
	    return this.rawNode.getTransformToElement(other.rawNode);
	} else {
	    var tfm = this.getGlobalTransform();
	    var inv = other.getGlobalTransform().createInverse();
	    // console.log("global: " + tfm + " inverse " + inv);
	    tfm.preConcatenate(inv);
	    //console.log("transforming " + this + " to " + tfm);
	    return tfm;
	}
    },

    getGlobalTransform: function() {
	var globalTransform = new Transform();
	var world = this.world();
	// var trace = [];
	for (var morph = this; morph != world; morph = morph.owner) {
	    globalTransform.preConcatenate(morph.getTransform());
	    // trace.push(globalTransform.copy());
	}
	// console.log("global transform trace [" + trace + "] for " + this);
	return globalTransform;
    },

    translateBy: function(delta) {
	this.changed();
	this.origin = this.origin.addPt(delta);
	this.cachedTransform = null;
	// this.layoutChanged();
	// Only position has changed; not extent.  Thus no internal layout is needed
	// This should become a new transformChanged() method
	this.getTransform().applyTo(this);
	if (this.fullBounds != null) this.fullBounds = this.fullBounds.translatedBy(delta);
	// DI: I don't think this can affect owner.  It may increase fullbounds
	//     due to stickouts, but not the bounds for layout...
	if (this.owner /* && this.owner !== this.world() */ && !this.transientBounds) this.owner.layoutChanged(); 
	this.changed(); 
    },

    setRotation: function(theta) { // in radians
	this.rotation = theta;
	this.cachedTransform = null;
    }.wrap(Morph.onLayoutChange('rotation')),

    setScale: function(scale/*:float*/) {
	this.scale = scale;
	this.cachedTransform = null;
    }.wrap(Morph.onLayoutChange('scale')),

    defaultOrigin: function(bounds, shapeType) { 
	return (shapeType == "rect" || shapeType == "rectangle") ? bounds.topLeft() : bounds.center(); 
    },

    getTranslation: function() { 
	return this.getTransform().getTranslation(); 
    },

    getRotation: function() { 
	return this.getTransform().getRotation().toRadians(); 
    },

    getScale: function() { 
	return this.getTransform().getScale(); 
    },

    moveBy: function(delta) {
	this.translateBy(delta);
    },

    rotateBy: function(delta) {
	this.setRotation(this.getRotation()+delta);
    },

    scaleBy: function(delta) {
	this.setScale(this.getScale()*delta);
    },

    throb: function() {
	this.scaleBy(this.getScale() <= 1 ? 2 : 0.9);
    },

    align: function(p1, p2) {
	this.translateBy(p2.subPt(p1)); 
    },

    // toggle fisheye effect on/off
    toggleFisheye: function() {
	// if fisheye is true, we need to scale the morph to original size
	if (this.fishEye) {
	    this.scale = this.getScale()/this.fisheyeScale;
	    this.setFisheyeScale(1.0);
	    this.changed();
	}

	// toggle fisheye
	this.fishEye = !this.fishEye;
    },

    // sets the scaling factor for the fisheye between 1..fisheyeGrowth
    setFisheyeScale: function (newScale) {
	// take the original centerpoint
	var p = this.bounds().center();

	this.fisheyeScale = newScale;
	this.cachedTransform = null;
	this.layoutChanged();  
	this.changed();

	// if the fisheye was on move the fisheye'd morph by the difference between 
	// original center point and the new center point divided by 2
	if (this.fishEye) {
	    // (new.center - orig.center)/2
	    var k = this.bounds().center().subPt(p).scaleBy(.5).negated();
	    if (!pt(0,0).eqPt(k)) {
		this.setPosition(this.position().addPt(k));
		this.layoutChanged();  
		this.changed();
	    }
	}
    },

    // Experimental radial "black hole" scrolling feature: When
    // an object comes close enough to the "event horizon" (specified
    // by 'towardsPoint'), the object is zoomed into the black hole.
    // Negative 'howMuch' values are used to "collapse" the display, 
    // while positive values expand and restore the display back to its 
    // original state.  For further information, see  
    // Sun Labs Technical Report SMLI TR-99-74, March 1999.
    moveRadially: function(towardsPoint, howMuch) {
	var position = this.getPosition();
	var relativePt = position.subPt(towardsPoint);
	var distance = towardsPoint.dist(position);
	if (!this.inBlackHole) this.inBlackHole = 0;

	// The object disappears entirely when it is less than 5 pixels away
	// The 'inBlackHole' counter keeps track of how many levels deep
	// the object is in the black hole, allowing the display to be
	// restored correctly.
	if (distance <= 5) {
	    if (howMuch < 0) {
		this.inBlackHole++;
		this.setScale(0);
	    } else {
		this.inBlackHole--;            
	    }
	} 

	if (this.inBlackHole == 0) {
	    // Start shrinking the object when it is closer than 200 pixels away
	    if (distance > 5 && distance < 200) this.setScale(distance/200);
	    else if (distance >= 200 && this.getScale() != 1) this.setScale(1);

	    // Calculate new location for the object
	    var theta = Math.atan2(relativePt.y, relativePt.x);
	    var newDistance = distance + howMuch;
	    if (newDistance < 0) newDistance = 1;    
	    var newX = newDistance * Math.cos(theta);
	    var newY = newDistance * Math.sin(theta);
	    this.setPosition(towardsPoint.addPt(pt(newX,newY)));
	}
    }

});

Morph.addMethods({     // help handling

    getHelpText: Functions.Null,  // override to supply help text


    showHelp: function(evt) {
	if (this.suppressBalloonHelp) return false;
	if (this.owner instanceof HandMorph) return false;
	var helpText = this.getHelpText();
	if (!helpText) return false;

	// Create only one help balloon at a time
	if (this.helpBalloonMorph && !this.helpBalloonMorph.getPosition().eqPt(evt.point())) {
	    this.helpBalloonMorph.setPosition(evt.point());
	    return false;
	} else {
	    var width = Math.min(helpText.length * 20, 260); // some estimate of width.
	    this.helpBalloonMorph = new TextMorph(evt.point().addXY(10, 10).extent(pt(width, 20)), helpText);
	    this.world().addMorph(this.helpBalloonMorph.beHelpBalloonFor(this));
	    return true;
	}
    },

    hideHelp: function() {
	if (!this.helpBalloonMorph)  
	    return;
	this.helpBalloonMorph.remove();
	delete this.helpBalloonMorph;
    }

});



// Morph mouse event handling functions
Morph.addMethods({

    // KP: equivalent of the DOM capture phase
    // KP: hasFocus is true if the receiver is the hands's focus (?)
    captureMouseEvent: function Morph$captureMouseEvent(evt, hasFocus) {
	// Dispatch this event to the frontmost receptive morph that contains it
	// Note boolean return for event consumption has not been QA'd
	// if we're using the fisheye... 
	if (this.fishEye) {
	    // get the distance to the middle of the morph and check if we're 
	    // close enough to start the fisheye
	    var size = Math.max(this.bounds().width, this.bounds().height);

	    var dist = evt.mousePoint.dist(this.bounds().center()) / this.fisheyeProximity;
	    if (dist <= size) {
		// the fisheye factor is between 1..fisheyeGrowth
		this.setFisheyeScale(1 + this.fisheyeGrowth * Math.abs(dist/size - 1));
	    } else {
		// just a precaution to make sure fisheye scaling isn't 
		// affecting its surrounding any more
		this.setFisheyeScale(1.0);
	    }
	}

	if (hasFocus) return this.mouseHandler.handleMouseEvent(evt, this);

	if (!evt.priorPoint || !this.fullContainsWorldPoint(evt.priorPoint)) return false;

	if (this.hasSubmorphs()) {
	    // If any submorph handles it (ie returns true), then return
	    for (var i = this.submorphs.length - 1; i >= 0; i--) {
		if (this.submorphs[i].captureMouseEvent(evt, false)) return true;
	    }
	}

	if (this.mouseHandler == null)
	    return false;

	if (!evt.priorPoint || !this.shape.containsPoint(this.localize(evt.priorPoint))) 
	    return false;

	return this.mouseHandler.handleMouseEvent(evt, this); 
    },

    ignoreEvents: function($super) { // will not respond nor get focus
	this.mouseHandler = null;
	this.setTrait("pointer-events", "none");
	return this;
    },

    enableEvents: function($super) {
	$super();
	this.mouseHandler = MouseHandlerForDragging.prototype;
	return this;
    },

    relayMouseEvents: function(target, eventSpec) {
	this.mouseHandler = new MouseHandlerForRelay(target, eventSpec); 
    },

    handlesMouseDown: function(evt) {
	if (this.mouseHandler == null || evt.isCommandKey()) return false;  //default behavior
	return this.mouseHandler.handlesMouseDown(); 
    },

    onMouseDown: function(evt) { 
	this.hideHelp();
    }, //default behavior

    onMouseMove: function(evt, hasFocus) { //default behavior
	if (evt.mouseButtonPressed && this==evt.hand.mouseFocus && this.owner && this.owner.openForDragAndDrop) { 
	    this.moveBy(evt.mousePoint.subPt(evt.priorPoint));
	} // else this.checkForControlPointNear(evt);
	if (!evt.mouseButtonPressed) this.checkForControlPointNear(evt);
    },

    onMouseUp: function(evt) { }, //default behavior

    onMouseOver: function(evt) { 
	this.showHelp(evt);
    }, 

    onMouseOut: function(evt) { 
	this.hideHelp();
    }, 

    onMouseWheel: function(evt) { 
    }, // default behavior

    takesKeyboardFocus: Functions.False,

    setHasKeyboardFocus: Functions.False, // no matter what, say no

    requestKeyboardFocus: function(hand) {
	if (this.takesKeyboardFocus()) {
	    if (this.setHasKeyboardFocus(true)) {
		hand.setKeyboardFocus(this);
		return true;
	    }
	}
	return false;
    },

    relinquishKeyboardFocus: function(hand) {
	hand.setKeyboardFocus(null);
	return this.setHasKeyboardFocus(false); 
    },

    onFocus: function(hand) {
	this.addFocusHalo();
    },

    onBlur: function(hand) {
	this.removeFocusHalo();
    },

    removeFocusHalo: function() {
	if (!this.focusHalo) return false;
	//this.focusHalo.removeRawNode();
	this.focusHalo.remove();
	this.focusHalo = null;
	return true;
    },

    focusHaloInset: 2,

    focusStyle: {
	fill: null, 
	borderColor: Color.blue,
	strokeOpacity: 0.3
    },
    
    adjustFocusHalo: function() {
	this.focusHalo.internalSetBounds(this.localBorderBounds().expandBy(this.focusHaloInset));
    },

    addFocusHalo: function() {
	if (this.focusHalo || this.focusHaloBorderWidth <= 0) return false;
	this.focusHalo = new Morph(this.localBorderBounds().expandBy(this.focusHaloInset), "rect");
	this.focusHalo.transientBounds = true;  // Do this before adding the halo
	this.addMorph(this.focusHalo);
	this.focusHalo.applyStyle(this.focusStyle);
	this.focusHalo.setBorderWidth(this.focusHaloBorderWidth);
	this.focusHalo.setLineJoin(Shape.LineJoins.Round);
	this.focusHalo.ignoreEvents();
	return true;
    }

});


// Morph grabbing and menu functionality
Morph.addMethods({

    checkForControlPointNear: function(evt) {
	// console.log('checking %s', this);
	if (this.suppressHandles) return false; // disabled
	if (this.owner == null) return false; // can't reshape the world
	var handle = this.shape.possibleHandleForControlPoint(this, this.localize(evt.mousePoint), evt.hand);
	if (handle == null) return false;
	this.addMorph(handle);  // after which it should get converted appropriately here
	handle.showHelp(evt);
	if (evt.hand.mouseFocus instanceof HandleMorph) evt.hand.mouseFocus.remove();
	evt.hand.setMouseFocus(handle);
	return true; 
    },

    // May be overridden to preempt (by returning null) the default action of grabbing me
    // or to otherwise prepare for being grabbed or find a parent to grab instead
    okToBeGrabbedBy: function(evt) {
	return this; 
    },

    editMenuItems: function(evt) { 
	return [];  // Overridden by, eg, TextMorph
    },

    showMorphMenu: function(evt) { 
	var menu = this.morphMenu(evt);
	// if (evt.mouseButtonPressed) evt.hand.setMouseFocus(menu);
	// evt.hand.setMouseFocus(menu);
	menu.openIn(this.world(), evt.point(), false, Object.inspect(this).truncate()); 
    },

    morphMenu: function(evt) { 
	var items = [
	    ["remove", this.remove],
	    ["inspect", function(evt) { new SimpleInspector(this).openIn(this.world(), evt.point())}],
	    ["show class in browser", function(evt) { var browser = new SimpleBrowser(this);
					      browser.openIn(this.world(), evt.point());
					      browser.getModel().setClassName(this.getType());
					    }],
	    ["style", function() { new StylePanel(this).open()}],
	    ["drill", this.showOwnerChain.curry(evt)],
	    ["grab", this.pickMeUp.curry(evt)],
	    ["reset rotation", this.setRotation.curry(0)],
	    ["reset scaling", this.setScale.curry(1)],
	    [((this.fishEye) ? "turn fisheye off" : "turn fisheye on"), this.toggleFisheye],
	    ["-----"],
	    ["put me in a window", this.putMeInAWindow.curry(this.position())], 
	    ["put me in a tab", this.putMeInATab.curry(this.position())],
	    ["put me in the open", this.putMeInTheWorld.curry(this.position())],
	    ["-----"],
	    [((this.openForDragAndDrop) ? "close DnD" : "open DnD"), this.toggleDnD.curry(evt.point())],
	    ["show Lively markup", this.addSvgInspector.curry(this)],
	    ["package", function(evt) {  // FIXME insert package morph in exactly the same position?
		new PackageMorph(this).openIn(this.world(), this.bounds().center()); this.remove(); } ],
	    ["publish packaged ...", function() { this.world().prompt('publish as (.xhtml)', this.exportLinkedFile.bind(this)); }] 
	];
	if (this.okToDuplicate()) items.unshift(["duplicate", this.copyToHand.curry(evt.hand)]);

	if (this.getModel() instanceof SyntheticModel)
	    items.push( ["show Model dump", this.addModelInspector.curry(this)]);
	
	if (this.getCopySubmorphsOnGrab() == true) 
	    items.push(["unpalettize", this.setCopySubmorphsOnGrab.curry(false)]);
	else 
	    items.push(["palettize", this.setCopySubmorphsOnGrab.curry(true)]);
	
	var menu = new MenuMorph(items, this); 

	return menu;
    },

    putMeInAWindow: function(loc) {
	var c = this.immediateContainer();
	var w = this.world();
	var wm = new WindowMorph(this.windowContent(), this.windowTitle());
	// Position it so the content stays in place
	w.addMorphAt(wm, loc.subPt(wm.contentOffset));
	if (c) c.remove();
    },

    putMeInATab: function(loc) {
	var c = this.immediateContainer();
	var w = this.world();
	var wm = new TabbedPanelMorph(this.windowContent(), this.windowTitle());
	w.addMorphAt(wm, wm.getPosition());
	if (c) c.remove();
    },

    putMeInTheWorld: function(loc) {
	var c = this.immediateContainer();
	var loc = c ? c.position().addPt(c.contentOffset) : this.position();
	this.world().addMorphAt(this, loc);
	if (c) c.remove();
    },

    immediateContainer: function() { // Containers override to return themselves
	if (this.owner) return this.owner.immediateContainer();
	else return null;
    },

    windowContent: function() {
	return this; // Default response, overridden by containers
    },

    windowTitle: function() {
	return Object.inspect(this).truncate(); // Default response, overridden by containers
    },

    toggleDnD: function(loc) {
        // console.log(this + ">>toggleDnD");
	this.openForDragAndDrop = !this.openForDragAndDrop;
    },

    openDnD: function(loc) {
	this.openForDragAndDrop = true;
    },

    closeDnD: function(loc) {
        // console.log(this + ">>closeDnD");
	this.openForDragAndDrop = false;
    },

    closeAllToDnD: function(loc) {
        // console.log(this + ">>closeAllDnD");
	// Close this and all submorphs to drag and drop
	this.withAllSubmorphsDo( function() { this.closeDnD(); });
    },

    openAllToDnD: function(loc) {
	// Close this and all submorphs to drag and drop
	this.withAllSubmorphsDo( function() { this.openDnD(); });
    },

    pickMeUp: function(evt) {
	var offset = evt.hand.getPosition().subPt(evt.hand.lastMouseDownPoint);
	this.moveBy(offset);
	evt.hand.addMorph(this);
	evt.hand.showAsGrabbed(this);
    },

    notify: function(msg, loc) {
	if (!loc) loc = this.world().firstHand().lastMouseDownPoint;
	new MenuMorph([["OK", 0, "toString"]], this).openIn(this.world(), loc, false, msg); 
    },

    showOwnerChain: function(evt) {
	var items = this.ownerChain().reverse().map(
	    function(each) { return [Object.inspect(each).truncate(), function() { each.showMorphMenu(evt) }]; });
	new MenuMorph(items, this).openIn(this.world(), evt.point(), false, "Top item is topmost");
    },

    copyToHand: function(hand) {
	// Function.prototype.shouldTrace = true;
	var copy = this.copy(new Copier());
	// when copying submorphs, make sure that the submorph that becomes a top-level morph 
	// reappears in the same location as its original.
	console.log('copied %s', copy);
	copy.owner = null; // so following addMorph will just leave the tfm alone
	this.owner.addMorph(copy); // set up owner as the original parent so that...        
	hand.addMorph(copy);  // ... it will be properly transformed by this addMorph()
	hand.showAsGrabbed(copy);
	// copy.withAllSubmorphsDo(function() { this.startStepping(null); }, null);
    },

    morphToGrabOrReceiveDroppingMorph: function(evt, droppingMorph) {
	return this.morphToGrabOrReceive(evt, droppingMorph, true);
    },

    morphToGrabOrReceive: function(evt, droppingMorph, checkForDnD) {
	// If checkForDnD is false, return the morph to receive this mouse event (or null)
	// If checkForDnD is true, return the morph to grab from a mouse down event (or null)
	// If droppingMorph is not null, then check that this is a willing recipient (else null)

	if (!this.fullContainsWorldPoint(evt.mousePoint)) return null; // not contained anywhere
	// First check all the submorphs, front first
	for (var i = this.submorphs.length - 1; i >= 0; i--) {
	    var hit = this.submorphs[i].morphToGrabOrReceive(evt, droppingMorph, checkForDnD); 
	    if (hit != null) { 
		return hit;  // hit a submorph
	    }
	}

	// Check if it's really in this morph (not just fullBounds)
	if (!this.containsWorldPoint(evt.mousePoint)) return null;

	// If no DnD check, then we have a hit (unless no handler in which case a miss)
	if (!checkForDnD) return this.mouseHandler ? this : null;

	// On drops, check that this is a willing recipient
	if (droppingMorph != null) {
	    return this.acceptsDropping(droppingMorph) ? this : null;
	} else {
	    // On grabs, can't pick up the world or morphs that handle mousedown
	    // DI:  I think the world is adequately checked for now elsewhere
	    // else return (!evt.isCommandKey() && this === this.world()) ? null : this; 
	    return this;
	}

    },

    morphToReceiveEvent: function(evt) {
	// This should replace morphToGrabOrReceive... in Hand where events
	// must be displatched to morphs that are closed to DnD
	return this.morphToGrabOrReceive(evt, null, false);
    },

    ownerChain: function() {
	// Return an array of me and all my owners
	// First item is, eg, world; last item is me
	if (!this.owner) return [this];
	var owners = this.owner.ownerChain();
	owners.push(this);
	return owners;
    },

    acceptsDropping: function(morph) { 
	return this.openForDragAndDrop && !(morph instanceof WindowMorph);
    }

});

Wrapper.subclass('SchedulableAction', {

    documentation: "Description of a periodic action",
    beVerbose: false,

    initialize: function($super, actor, scriptName, argIfAny, stepTime) {
	$super();
	this.actor = actor;
	this.rawNode = LivelyNS.create("action"); // FIXME stop generating these eagerly
	this.scriptName = scriptName;
	this.argIfAny = argIfAny;
	this.stepTime = stepTime;
	this.ticks = 0;
	this.rawNode.appendChild(NodeFactory.createCDATA(JSON.serialize(this)));
    },

    deserialize: function($super, importer, rawNode) {
	$super(importer, rawNode);
	this.rawNode = rawNode;
	var init = JSON.unserialize(rawNode.textContent);
	Object.extend(this, init);
    },

    toJSON: function() {
	// do not try to to convert actor to JSON
	return {scriptName: this.scriptName, argIfAny: this.argIfAny, stepTime: this.stepTime, ticks: this.ticks};
    },

    toString: function() {
	return Strings.format("#<SchedulableAction[script=%s,arg=%s,stepTime=%s]>", this.scriptName, this.argIfAny, this.stepTime);
    },

    stop: function(world) {
	if (this.beVerbose) console.log("stopped stepping task %s", this);
	world.stopSteppingFor(this);
    },

    start: function(world) {
	if (this.beVerbose) console.log("started stepping task %s", this);
	world.startSteppingFor(this);
    },

    exec: function SchedulableAction$exec() {
	if (!this.actor) {
	    console.warn("no actor on script %s", this);
	    return null;
	}
	var func = this.actor[this.scriptName];
	if (func) {
	    return func.call(this.actor, this.argIfAny);
	} else {
	    console.warn("no callback on actor %s", this.actor);
	    return null;
	}
    }
});

// Morph stepping/timer functions
Morph.addMethods({

    startSteppingScripts: function() { }, // May be overridden to start stepping scripts

    stopStepping: function() {
	if (!this.activeScripts) return;
	this.activeScripts.invoke('stop', this.world());
	this.activeScripts = null;
    },

    startStepping: function(stepTime, scriptName, argIfAny) {
	if (!scriptName) 
	    throw Error("Old code");
	var action = new SchedulableAction(this, scriptName, argIfAny, stepTime);
	this.addActiveScript(action);
	action.start(this.world());
	return action;
    },

    addActiveScript: function(action) {
	// Every morph carries a list of currently active actions (alarms and repetitive scripts)
	if (!this.activeScripts) this.activeScripts = [action];
	else this.activeScripts.push(action);
	if (!action.rawNode.parentNode) 
	    this.addWrapper(action);
	return this;
	// if we're deserializing the rawNode may already be in the markup
    },


    suspendAllActiveScripts: function() {
	this.withAllSubmorphsDo( function() { this.suspendActiveScripts(); });
    },

    suspendActiveScripts: function() {
	if (this.activeScripts) { 
	    this.suspendedScripts = this.activeScripts.clone();
	    this.stopStepping();
	}
    },

    resumeAllSuspendedScripts: function() {
	var world = this.world();
	this.withAllSubmorphsDo( function() {
	    if (this.suspendedScripts) {
		this.suspendedScripts.invoke('start', world);
		this.activeScripts = this.suspendedScripts;
		this.suspendedScripts = null;
	    }
	});
    }

});

// Morph bounds, coordinates, moving and damage reporting functions
Morph.addMethods({ 
    
    // bounds returns the full bounding box in owner coordinates of this morph and all its submorphs
    bounds: function(ignoreTransients) {
	if (this.fullBounds != null) return this.fullBounds;
	if (this.useNativeBounds && !ignoreTransients && this.nativeCanvas()) {
	    this.fullBounds = this.nativeBounds();
	    if (this.fullBounds.width && this.fullBounds.height) {
		return this.fullBounds;
	    } 
	    // else: something is suspicious, fall through
	}

	var tfm = this.getLocalTransform();
	var fullBounds = tfm.transformRectToRect(this.localBorderBounds());
	
	var subBounds = this.submorphBounds(ignoreTransients);
	if (subBounds != null) {
	    // could be simpler when no rotation...
	    fullBounds = fullBounds.union(tfm.transformRectToRect(subBounds));
	}

	if (fullBounds.width < 3 || fullBounds.height < 3) {
	    // Prevent Horiz or vert lines from being ungrabable
	    fullBounds = fullBounds.expandBy(3); 
	}
	this.fullBounds = fullBounds;
	return fullBounds; 
    },
    
    submorphBounds: function(ignoreTransients) {
	var subBounds = null;
	for (var i = 0; i < this.submorphs.length; i++) {
	    var m = this.submorphs[i];
	    if ((ignoreTransients && m.transientBounds))
		continue;
	    if (!m.isDisplayed()) {
		continue;
	    }
	    subBounds = subBounds == null ? m.bounds(ignoreTransients) : subBounds.union(m.bounds(ignoreTransients));
	}
	return subBounds;
    },
    
    // innerBounds returns the bounds of this morph only, and in local coordinates
    innerBounds: function() { 
	return this.shape.bounds();
    },
    
    localBorderBounds: function() {
	// defined by the external edge of the border
	var bounds = this.shape.bounds();
	// double border margin for polylines to account for elbow protrusions
	bounds.expandBy(this.shape.getStrokeWidth()/2*(this.shape.hasElbowProtrusions ? 2 : 1));
	return bounds;
    },
    
    
    /** 
      * mapping coordinates in the hierarchy
      * @return [Point]
      */

    // map local point to world coordinates
    worldPoint: function(pt) { 
	return pt.matrixTransform(this.transformToMorph(this.world())); 
    },

    // map owner point to local coordinates
    relativize: function(pt) { 
	if (!this.owner) { 
	    throw new Error('no owner; call me after adding to a morph? ' + this);
	}
	try {
	    return pt.matrixTransform(this.owner.transformToMorph(this)); 
	} catch (er) {
	    // console.info("ignoring relativize wrt/%s", this);
	    return pt;
	}
    },

    // map owner rectangle to local coordinates
    relativizeRect: function(r) { 
	return rect(this.relativize(r.topLeft()), this.relativize(r.bottomRight()));
    },

    // map world point to local coordinates
    localize: function(pt) {
	if (pt == null) console.log('null pt');   
	if (this.world() == null) {
	    console.log('null this.world()');   
	    return pt;
	}
	return pt.matrixTransform(this.world().transformToMorph(this));
    },

    // map local point to owner coordinates
    localizePointFrom: function(pt, otherMorph) {   
	try {
	    return pt.matrixTransform(otherMorph.transformToMorph(this));
	} catch (er) {
	    // Function.showStack();
	    console.log("problem " + er + " on " + this + " other " + otherMorph);
	    return pt;
	}
    },

    transformForNewOwner: function(newOwner) {
	return new Transform(this.transformToMorph(newOwner));
    },

    changed: function() {
	// (this.owner || this).invalidRect(this.bounds());
    },
    
    layoutOnSubmorphLayout: function(submorph) {
	// override to return false, in which case layoutChanged() will not be propagated to
	// the receiver when a submorph's layout changes. 
	return true;
    },

    layoutChanged: function Morph$layoutChanged() {
	// layoutChanged() is called whenever the cached fullBounds may have changed
	// It invalidates the cache, which will be recomputed when bounds() is called
	// Naturally it must be propagated up its owner chain.
	// Note the difference in meaning from adjustForNewBounds()
	this.getTransform().applyTo(this);  // DI: why is this here?
	this.fullBounds = null;
	if (this.owner && this.owner.layoutOnSubmorphLayout(this) && !this.transientBounds) {     // May affect owner as well...
	    this.owner.layoutChanged();
	}
    },

    adjustForNewBounds: function() {
	// adjustForNewBounds() is called whenever the innerBounds may have changed in extent
	//  -- it should really be called adjustForNewExtent --
	// Depending on the morph and its layoutManager, it may then re-layout its
	// submorphs and, in the process, propagate the message down to leaf morphs (or not)
	// Of course a change in innerBounds implies layoutChanged() as well,
	// but, for now, these are called separately.
	// NB:  Because some morphs may re-lay themselves out in response to adjustForNewBounds()
	// adjustForNewBounds() *must never be called from* a layout operation;
	// The layout process should only move and resize submorphs, but never change the innerBounds

	// If this method is overridden by a subclass, it should call super as well
	if (this.focusHalo) this.adjustFocusHalo();
    },

    position: function() { // Deprecated -- use getPosition
	return this.shape.bounds().topLeft().addPt(this.origin); 
    },

    getPosition: function() {
	return this.shape.bounds().topLeft().addPt(this.origin); 
    },

    setPosition: function(newPosition) {
	var delta = newPosition.subPt(this.getPosition());
	this.translateBy(delta); 
    }

});

// Morph clipping functions
Morph.addMethods({

    clipToPath: function(shape) {
	if (this.clipPath) this.clipPath.removeRawNode();
	var clip = new ClipPath(shape).setDerivedId(this);
	this.addWrapperToDefs(clip);
	this.rawNode.setAttributeNS(null, "clip-path", clip.uri());
	this.clipPath = clip;
    },

    clipToShape: function() {
	this.clipToPath(this.shape);
    }

});

// Inspectors for Morphs
Morph.addMethods( {

    addSvgInspector: function() {
	var xml = Exporter.stringify(new Exporter(this).serialize(Global.document));
	var txt = this.world().addTextWindow({
	    content: xml,
	    title: "XML dump", 
	    position: this.world().positionForNewMorph(this)
	});
	txt.xml = xml; // FIXME a sneaky way of passing original text.
    },

    addModelInspector: function() {
	var model = this.getModel();
	if (model instanceof SyntheticModel) {
	    var variables = model.variables();
	    var list = [];
	    for (var i = 0; i < variables.length; i++) {
		var varName = variables[i];
		list.push(varName + " = " + model.get(varName));
	    }
	    this.world().addTextListWindow({
		content: list,
		title: "Simple Model dump",
		position: this.world().positionForNewMorph(this)
	    });
	}
    }
});


// Morph factory methods for creating simple morphs easily
Object.extend(Morph, {

    makeLine: function(verts, lineWidth, lineColor) {
	// make a line with its origin at the first vertex
	// Note this works for simple lines (2 vertices) and general polylines
	var line = new Morph(verts[0].asRectangle(), "rect");
	var vertices = verts.invoke('subPt', verts[0]);
	line.setShape(new PolylineShape(vertices, lineWidth, lineColor));
	return line; 
    },

    makeCircle: function(location, radius, lineWidth, lineColor, fill) {
	// make a circle of the given radius with its origin at the center
	var circle = new Morph(location.asRectangle().expandBy(radius), "ellipse")
	return circle.applyStyle({fill: fill, borderWidth: lineWidth, borderColor: lineColor});
    },

    makePolygon: function(verts, lineWidth, lineColor, fill) {
	// make a polygon with its origin at the starting vertex
	var poly = new Morph(pt(0,0).asRectangle(), "rect");
	poly.setShape(new PolygonShape(verts, fill, lineWidth, lineColor));
	return poly; 
    }
});

// View trait
ViewTrait = {
    connectModel: function(plugSpec, optKickstartUpdates) {
	// FIXME what if already connected, 
	if (plugSpec instanceof Relay) {
	    // new style model
	    this.formalModel = plugSpec;
	    // now, go through the setters and add notifications on model
	    if (plugSpec.delegate instanceof Record) 
		plugSpec.delegate.addObserversFromSetters(plugSpec.definition, this, optKickstartUpdates);
	    return;
	} else if (plugSpec instanceof Record) {
	    this.formalModel = plugSpec;
	    plugSpec.addObserversFromSetters(plugSpec.definition, this, optKickstartUpdates);
	    return;
	}
	// connector makes this view pluggable to different models, as in
	// {model: someModel, getList: "getItemList", setSelection: "chooseItem"}
	var newPlug = (plugSpec instanceof ModelPlug) ? plugSpec : new ModelPlug(plugSpec);
	
	var model = newPlug.model;
	if (!(model instanceof Model) && !this.checkModel(newPlug))
	    console.log("model " + model +  " is not a Model, view " + this);

	this.modelPlug = newPlug;

	if (model.addDependent) { // for mvc-style updating
	    model.addDependent(this);
	} 
	return this;
    },


    checkModel: function(plugSpec) {
	// For non-models, check that all supplied handler methods can be found
	var result = true;
	Properties.forEachOwn(plugSpec, function(modelMsg) {
	    if (modelMsg == 'model') return;
	    var handler = plugSpec.model[plugSpec[modelMsg]];
	    
	    if (!handler || !(handler instanceof Function)) {
		// console.log
		alert("Supplied method name, " + plugSpec[modelMsg] + " does not resolve to a function.");
		result = false;
	    }
	});
	return result;
    },

    disconnectModel: function() {
	var model = this.getModel();
	if (model && model.removeDependent) { // for mvc-style updating
	    model.removeDependent(this);
	} 
    },

    getModel: function() {
	var plug = this.getModelPlug();
	if (plug) return plug.model;
	else return this.getActualModel();
    },

    getActualModel: function() {
	return this.formalModel instanceof Relay ? this.formalModel.delegate : this.formalModel;
    },
    
    getModelPlug: function() { 
	var plug = this.modelPlug;
	return (plug && plug.delegate) ?  plug.delegate : plug;
    },

    getModelValue: function(functionName, defaultValue) {
	// functionName is a view-specific message, such as "getList"
	// The model plug then provides a reference to the model, as well as
	// the specific model accessor for the aspect being viewed, say "getItemList"
	// Failure at any stage will return the default value.
	// TODO: optionally verify that variable name is listed in this.pins
	if (this.formalModel) {  
	    // snuck in compatiblitiy with new style models
	    var impl = this.formalModel[functionName];
	    return impl ? impl.call(this.formalModel) : defaultValue;
	}
	
	var plug = this.getModelPlug();
	if (plug == null || plug.model == null || functionName == null) return defaultValue;
	var func = plug.model[plug[functionName]];
	if (func == null) return defaultValue;
	return func.call(plug.model); 
    },

    setModelValue: function(functionName, newValue) {
	// functionName is a view-specific message, such as "setSelection"
	// The model plug then provides a reference to the model, as well as
	// the specific model accessor for the aspect being viewed, say "chooseItem"
	// Failure at any stage is tolerated without error.
	// Successful sets to the model supply not only the newValue, but also
	// a reference to this view.  This allows the model's changed() method
	// to skip this view when broadcasting updateView(), and thus avoid
	// needless computation for a view that is already up to date.
	// TODO: optionally verify that variable name is listed in this.pins
	if (this.formalModel) { 
	    // snuck in compatiblitiy with new style models
	    var impl = this.formalModel[functionName];
	    return impl && impl.call(this.formalModel, newValue);
	}
	var plug = this.getModelPlug();
	if (plug == null || plug.model == null || functionName == null) return null;
	var func = plug.model[plug[functionName]];
	if (func == null) return null;
	func.call(plug.model, newValue, this);
	return plug[functionName];
    },

    updateView: function(aspect, controller) {
	// This method is sent in response to logic within the model executing
	//     this.changed(aspect, source)
	// The aspect used is the name of the get-message for the aspect
	// that needs to be updated in the view (and presumably redisplayed)
	// All actual view morphs will override this method with code that
	// checks for their aspect and does something useful in that case.
    }
};

Object.subclass('View', ViewTrait, {

    initialize: function(modelPlug) {
	if (modelPlug)
	    this.connectModel(modelPlug);
    },

    getType: function() { // convenience
	return this.constructor.getOriginal().type;
    },

    toString: function() {
	return "#<" + this.getType() + ">";
    }

});

Morph.addMethods(ViewTrait);


// ===========================================================================
// MVC model support
// ===========================================================================

/**
  * @class Model
  * An MVC style model class that allows changes to be automatically
  * propagated to multiple listeners/subscribers/dependents. 
  */ 

// A typical model/view relationship is set up in the following manner:
//        panel.addMorph(m = newTextListPane(new Rectangle(200,0,200,150)));
//        m.connectModel({model: this, getList: "getMethodList", setSelection: "setMethodName"});
// The "plug" object passed to connectModel() points to the model, and converts from
// view-specific messages like getList() and setSelection() to model-specific messages
// like getMethodList() and setMethodName.  This allow a single model to have, eg,
// several list views, each viewing a different list aspect of the model.

// A number of morphs are used as views, or "widgets".  These include TextMorph,
// ListMorph, ButtonMorph, SliderMorph, etc.  Each of these morphs uses the above
// plug mechanism to get or set model values and to respond to model changes.
// these are documented in Morph.getModelValue, setModelValue, and updateView

Object.subclass('Model', {

    initialize: function(dep) { 
	// Broadcasts an update message to all dependents when a value changes.
	this.dependents = (dep != null) ? [dep] : [];
    },

    addDependent: function (dep) { 
	this.dependents.push(dep); 
    },

    removeDependent: function (dep) {
	var ix = this.dependents.indexOf(dep);
	if (ix < 0) return;
	this.dependents.splice(ix, 1); 
    },

    changed: function(varName, source) {
	// Broadcast the message "updateView" to all dependents
	// If source (a dependent) is given, we skip it (already updated)
	// If varName is not given, then null will be the aspect of the updateView()
	//console.log('changed ' + varName);
	for (var i = 0; i < this.dependents.length; i++) {
	    if (source !== this.dependents[i]) {
		// console.log('updating %s for name %s', this.dependents[i], varName);
		this.dependents[i].updateView(varName, source);
	    } 
	} 
    },

    toString: function() {
	return Strings.format("#<Model:%s>", this.dependents);
    },

    // test?
    copyFrom: function(copier, other) {
	this.dependents = [];
	other.dependents.forEach(function(dep) { this.dependents.push(copier.lookupMorph(dep.id())) }, this);
    }

});

Wrapper.subclass('ModelPlug', {
    documentation: "A 'translation' from view's variable names to model's variable names",

    initialize: function(spec) {
	var props = [];
	Properties.forEachOwn(spec, function(p) {
	    this[p] = spec[p];
	    props.push(p);
	}, this);
    },
    
    toString: function() {
	var pairs = [];
	Properties.forEachOwn(this, function(p) { if (p != 'model') pairs.push(p + ":" + this[p]) }, this);
	return "#<ModelPlug{" + pairs.join(',') + "}>";
    },

    serialize: function(modelId) {
	var rawNode = LivelyNS.create("modelPlug", {model: modelId});
	Properties.forEachOwn(this, function(prop, value) {
	    switch (prop) {
	    case 'model':
	    case 'rawNode':
		break;
	    default:
		rawNode.appendChild(LivelyNS.create("accessor", {formal: prop, actual: value}));
	    }
	}, this);
	return rawNode;
    },

    inspect: function() {
	return JSON.serialize(this);
    },

    deserialize: function(importer, rawNode) {
	for (var acc = rawNode.firstChild; acc != null;  acc = acc.nextSibling) {
	    if (acc.localName != 'accessor') continue;
	    this[LivelyNS.getAttribute(acc, "formal")] = LivelyNS.getAttribute(acc, "actual");
	}
    }
});


Model.subclass('SyntheticModel', {
    documentation: "A stereotyped model synthesized from a list of model variables",

    initialize: function($super, vars) {
	$super(null);
	if (!(vars instanceof Array)) 
	    throw new Error("wrong argument to SyntheticModel: " + vars);
	for (var i = 0; i < vars.length; i++) {
	    var v = vars[i];
	    if (v.startsWith('-') || v.startsWith('+')) 
		v = v.slice(1);
	    this.addVariable(v, null);
	}
    },

    makeGetter: function(name) {
	// functional programming is fun!
	
	return function() { 
	    return this[name]; 
	};
    },

    makeSetter: function(name) {
	return function(newValue, v) { 
	    this[name] = newValue; 
	    this.changed(this.getterName(name), v); 
	};
    },

    addVariable: function(varName, initialValue) {
	this[varName] = initialValue;
	this[this.getterName(varName)] = this.makeGetter(varName);
	this[this.setterName(varName)] = this.makeSetter(varName);
    },

    getterName: function(varName) {
	return "get" + varName;
    },

    get: function(varName) {
	var method = this[this.getterName(varName)];
	if (!method) throw new Error(this.getterName(varName) + " not present ");
	return method.call(this, varName);
    },

    setterName: function(varName) {
	return "set" + varName;
    },

    set: function(varName, value) {
	var method = this[this.setterName(varName)]
	if (!method) throw new Error(this.setterName(varName) + " not present");
	return method.call(this, varName, value);
    },

    makePlugSpecFromPins: function(pinList) {
	var spec = { model: this};
	pinList.forEach(function(decl) {
	    if (!decl.startsWith('-')) { // not read-only
		var stripped = decl.startsWith('+') ? decl.slice(1) : decl;
		spec[this.setterName(stripped)] = this.setterName(stripped);
	    }
	    if (!decl.startsWith('+')) { // not write-only
		var stripped = decl.startsWith('-') ? decl.slice(1) : decl;
		spec[this.getterName(stripped)] = this.getterName(stripped);
	    }
	}, this);
	return spec;
    },

    makePlugSpec: function() {
	// make a plug of the form {model: this, getVar1: "getVar1", setVar1: "setVar1" .. }
	var spec = {model: this};
	this.variables().forEach(function(v) { 
	    var name = this.getterName(v);
	    spec[name] = name;
	    name = this.setterName(v);
	    spec[name] = name;
	}, this);
	return spec;
    },

    variables: function() {
	return Properties.own(this).filter(function(name) { return name != 'dependents'});
    },

    toMarkup: function(index) {
	var element = LivelyNS.create("model");
	var vars = this.variables();
	for (var i = 0; i < this.dependents.length; i++) { // write dependents first so that model variables can refer to it
	    var dependent = this.dependents[i];
	    console.log("model dependent " + dependent);
	    if (dependent instanceof Morph) {
		element.appendChild(LivelyNS.create("dependent", {ref: dependent.id()}));
	    } else if (dependent instanceof View) { // stateless view, will be recreated from type
		var viewElement = 
		    element.appendChild(LivelyNS.create("dependentView", { type: dependent.getType()}));
		var plug = dependent.modelPlug && dependent.modelPlug.serialize(index || 0);
		if (plug) viewElement.appendChild(plug);
	    } else {
		console.log("cant handle dependent " + dependent);
	    }
	    element.appendChild(NodeFactory.createNL());
        }
	for (var i = 0; i < vars.length; i++) {
	    var name = vars[i];
	    var index = this.dependents.indexOf(this[name]);
	    var varEl;
	    if (index >= 0) {
		varEl = LivelyNS.create("dependentVariable", {name: name, index: index});
		console.log("model dependent " + this[name] + " index " + index);
	    } else {
		varEl = LivelyNS.create("variable", {name: name});
		// console.log("trying to serialize " + this[name]);
		// FIXME check if it's actually serializable
		varEl.appendChild(NodeFactory.createCDATA(JSON.serialize(this[name])));
	    }
	    element.appendChild(varEl);
	    element.appendChild(NodeFactory.createNL());
	}
	    
        console.log("produced markup " + element);
        return element;
    }
});


Morph.addMethods({
    
    exportLinkedFile: function(filename) {
	var url = Exporter.saveDocumentToFile(Exporter.shrinkWrapMorph(this), filename);
	if (url) this.world().reactiveAddMorph(new ExternalLinkMorph(url));
	return url;
    }

});


// ===========================================================================
// World-related widgets
// ===========================================================================

// A unique characteristics of the Morphic graphics system is that
// all the objects (morphs) live in a "world" that is shared between 
// different objects and even between different users.  A world can
// contain a large number of different applications/widgets, much like
// in an operating system a folder can contain a lot of files.  Worlds
// can be linked to each other using LinkMorphs.  As a consequence,
// the entire system can contain a large number of worlds, each of
// which contains a large number of simultaneously running applications
// and widgets. 

/**
 * @class PasteUpMorph
 */ 
Morph.subclass("PasteUpMorph", {

    documentation: "used for layout, most notably the world and, e.g., palettes",

    initialize: function($super, bounds, shapeType) {
        return $super(bounds, shapeType);
    },
    
    captureMouseEvent: function PasteUpMorph$captureMouseEvent($super, evt, hasFocus) {
        if (evt.type == "MouseDown" && this.onMouseDown(evt)) return; 
        $super(evt, hasFocus); 
    },

    onMouseDown: function PasteUpMorph$onMouseDown($super, evt) {  //default behavior is to grab a submorph
	$super(evt);
        var m = this.morphToReceiveEvent(evt);
        if (m == null) { 
            this.makeSelection(evt); 
            return true; 
        } else if (!evt.isCommandKey()) {
            if (m == this.world()) { 
                this.makeSelection(evt); 
                return true; 
            } else if (m.handlesMouseDown(evt)) return false;
        }
        evt.hand.grabMorph(m, evt);
        return true; 
    },

    okToBeGrabbedBy: function(evt) {
        // Paste-ups, especially the world, cannot be grabbed normally
        return null; 
    },

    makeSelection: function(evt) {  //default behavior is to grab a submorph
        if (this.world().currentSelection != null) this.world().currentSelection.removeOnlyIt();
        var m = new SelectionMorph(evt.point().asRectangle());
        this.world().addMorph(m);
        this.world().currentSelection = m;
        var handle = new HandleMorph(pt(0,0), "rect", evt.hand, m, "bottomRight");
	handle.setExtent(pt(0, 0));
        m.addMorph(handle);
        evt.hand.setMouseFocus(handle);
    }
    
});

/**
 * @class WorldMorph
 */ 

PasteUpMorph.subclass("WorldMorph", {
    
    documentation: "A Morphic world (a visual container of other morphs)",
    fill: Color.primary.blue,
    defaultExtent: pt(1280, 1024),
    // Default themes for the theme manager    
    displayThemes: {
        primitive: { // Primitive look and feel -- flat fills and no rounding or translucency
            styleName:   'primitive',
            titleBar:    { borderRadius: 0, borderWidth: 2, bordercolor: Color.black,
                           fill: Color.neutral.gray.lighter() },
	    
            slider:      { borderColor: Color.black, borderWidth: 1, 
                           fill: Color.neutral.gray.lighter() },
            button:      { borderColor: Color.black, borderWidth: 1, borderRadius: 0,
                           fill: Color.lightGray },
            widgetPanel: { borderColor: Color.red, borderWidth: 2, borderRadius: 0,
                           fill: Color.blue.lighter()},
            clock:       { borderColor: Color.black, borderWidth: 1,
                           fill: new RadialGradient([Color.yellow.lighter(2), 1, Color.yellow]) },
	    panel:       { fill: Color.primary.blue.lighter(2), borderWidth: 2},
            link:        { borderColor: Color.green, borderWidth: 1, fill: Color.blue},
	    helpText:    { borderRadius: 15, fill: Color.primary.yellow.lighter(3), fillOpacity: .8}
        },

        lively: { // This is to be the style we like to show for our personality
            styleName: 'lively',
            titleBar:    { borderRadius: 8, borderWidth: 2, bordercolor: Color.black,
                           fill: new LinearGradient([Color.primary.blue.lighter(), 1, Color.primary.blue, 1, Color.primary.blue.lighter(2)], 
						    LinearGradient.SouthNorth)},
            slider:      { borderColor: Color.black, borderWidth: 1, 
			   fill: new LinearGradient([Color.primary.blue.lighter(2), 1, Color.primary.blue])},
            button:      { borderColor: Color.neutral.gray, borderWidth: 0.3, borderRadius: 4,
                           fill: new LinearGradient([Color.darkGray, 1, Color.darkGray.lighter(2)], LinearGradient.SouthNorth) },
            widgetPanel: { borderColor: Color.blue, borderWidth: 4, borderRadius: 16,
                           fill: Color.blue.lighter(), opacity: 0.4},
            clock:       { borderColor: Color.black, borderWidth: 1,
                           fill: new RadialGradient([Color.primary.blue.lighter(2), 1, Color.primary.blue.lighter()]) },
	    panel:       { fill: Color.primary.blue.lighter(2), borderWidth: 2},
            link:        { borderColor: Color.green, borderWidth: 1, fill: Color.blue},
	    helpText:    { borderRadius: 15, fill: Color.primary.yellow.lighter(3), fillOpacity: .8}
        },

        turquoise: { // Like turquoise, black and silver jewelry, [or other artistic style]
            styleName: 'turquoise',
            titleBar:    { borderRadius: 8, borderWidth: 2, bordercolor: Color.black,
                           fill: new LinearGradient([Color.turquoise, 1, Color.turquoise.lighter(3)])},
            slider:      { borderColor: Color.black, borderWidth: 1, 
			   fill: new LinearGradient([Color.turquoise.lighter(2), 1, Color.turquoise])},
            button:      { borderColor: Color.neutral.gray.darker(), borderWidth: 2, borderRadius: 8,
                           fill: new RadialGradient([Color.turquoise.lighter(), 1, Color.turquoise]) },
            widgetPanel: { borderColor: Color.neutral.gray.darker(), borderWidth: 4,
                           fill: Color.turquoise.lighter(3), borderRadius: 16},
            clock:       { borderColor: Color.black, borderWidth: 1,
                           fill: new RadialGradient([Color.turquoise.lighter(2), 1, Color.turquoise]) },
	    panel:       {fill: Color.primary.blue.lighter(2), borderWidth: 2},
            link:        { borderColor: Color.green, borderWidth: 1, fill: Color.blue},
	    helpText:    { borderRadius: 15, fill: Color.primary.yellow.lighter(3), fillOpacity: .8}
        }
    },

    initialize: function($super, canvas, backgroundImageId) {
        var bounds = Rectangle.fromElement(canvas);

        // sometimes bounds has zero dimensions (when reloading thes same page, timing issues?
        // in Firefox bounds may be 1x1 size?? maybe everything should be run from onload or sth?
        if (bounds.width < 2) {
            bounds.width = this.defaultExtent.x;
        }

        if (bounds.height < 2) {
            bounds.height = this.defaultExtent.y;
        }

        if (backgroundImageId) {
            var background = NodeFactory.create("use");
	    XLinkNS.setHref(background, backgroundImageId);
            this.addNonMorph(background);
        }
        $super(bounds, "rect");

	var gradient = new LinearGradient([Color.primary.blue.lighter(), 1, Color.primary.blue, 1, Color.primary.blue.lighter(), 1, Color.primary.blue, 1, Color.primary.blue.lighter()]);
	gradient.rawNode.setAttributeNS(null, "gradientTransform", "translate(0, -0.1) skewY(10)");
        this.setFill(gradient);
	
	
	this.enterCount = 0;
    },

    initializeTransientState: function($super, initialBounds) {
        $super(initialBounds);
        this.hands = [];
        this.setDisplayTheme(this.displayThemes['lively']);

        this.scheduledActions = [];  // an array of schedulableActions to be evaluated
        this.lastStepTime = (new Date()).getTime();
        this.mainLoopFunc = this.doOneCycle.bind(this).logErrors('Main Loop');
        this.mainLoop = Global.setTimeout(this.mainLoopFunc, 30);
        this.worldId = ++WorldMorph.worldCount;

        return this;
    },

    deserialize: function($super, importer, rawNode) {
        $super(importer, rawNode);
	var persistedChanges = this.getLivelyTrait("changes");
	if (persistedChanges) {
	    console.log("recreating changes from stored trait");
	    this.changes = new ChangeSet;
	    this.changes.setChanges(JSON.unserialize(unescape(persistedChanges)));
	    if(!Config.skipChanges) this.changes.evaluateAll(); // Can be blocked by URL param 
	    console.log("Successfully evalled " + this.changes.changes.length + " changes.");
	}
    },
    
    remove: function() {
        if (!this.rawNode.parentNode) return null;  // already removed
        this.stopStepping();
	this.removeRawNode();
        return this;
    },

    toggleNativeCursor: function(flag) {
	this.canvas().setAttributeNS(null, "cursor", flag ? "auto" : "none");
    },

    displayOnCanvas: function(canvas) {
	// this.remove();
        canvas.appendChild(this.rawNode);
        var hand = this.addHand(new HandMorph(true));
	WorldMorph.currentWorld = this; // this conflicts with mutliple worlds
        this.onEnter(); 
	
	this.enterCount ++;
    },
    
    addHand: function(hand) {
        this.hands.push(hand);
        hand.owner = this;
        hand.registerForEvents(this);
        hand.registerForEvents(hand);
        hand.layoutChanged();
	
        Event.keyboardEvents.forEach(function(each) {
            document.documentElement.addEventListener(each, hand, hand.handleOnCapture);
        });

        this.rawNode.parentNode.appendChild(hand.rawNode);
	return hand;
    },
    
    removeHand: function(hand) {
	hand.setMouseFocus(null); // cleanup, just in case
	hand.setKeyboardFocus(null); // cleanup (calls blur(), which will remove the focus halo)
	hand.removeRawNode();
        hand.unregisterForEvents(this);
        hand.unregisterForEvents(hand);

        Event.keyboardEvents.forEach(function(each) {
            document.documentElement.removeEventListener(each, hand, hand.handleOnCapture);
        });

        this.hands.splice(this.hands.indexOf(hand), 1);
    },

    morphMenu: function($super, evt) { 
        var menu = $super(evt);
        menu.keepOnlyItemsNamed(["inspect", "style"]);
        menu.addItem([(Morph.prototype.suppressBalloonHelp ? "enable balloon help" : "disable balloon help"),
                      this.toggleBalloonHelp]);
        menu.addItem([(HandMorph.prototype.applyDropShadowFilter ? "disable " : "enable ") + "drop shadow (if supported)",
		      function () { HandMorph.prototype.applyDropShadowFilter = !HandMorph.prototype.applyDropShadowFilter}]);
        menu.addLine();
        menu.addItem(["new object...", this.addMorphs.curry(evt)]);
        menu.addLine();
        menu.addItem(["choose display theme...", this.chooseDisplayTheme]);
        menu.addItem([(Config.useDebugBackground ? "use normal background" : "use debug background"),
                      this.toggleDebugBackground]);
        if(Config.debugExtras) {
		menu.addItem(["arm profile for next mouseDown", function() {evt.hand.armProfileFor("MouseDown") }]);
        	menu.addItem(["arm profile for next mouseUp", function() {evt.hand.armProfileFor("MouseUp") }]);
	}
        menu.addLine();
        menu.addItem(["publish world as ... ", function() { this.prompt("world file (.xhtml)", this.exportLinkedFile.bind(this)); }]);
	if (URL.source.filename() != "index.xhtml") { 
	    // save but only if it's not the startup world
            menu.addItem(["save current world to current URL", function() { 
		menu.remove(); 
		Exporter.saveDocumentToFile(Exporter.shrinkWrapMorph(this), URL.source.filename());
	    }]);
	}
        menu.addItem(["restart system", this.restart]);
        return menu;
    },
    
    toggleBalloonHelp: function() {
        Morph.prototype.suppressBalloonHelp = !Morph.prototype.suppressBalloonHelp;
    },

    toggleDebugBackground: function() {
        // Debug background is transparent, so that we can see the console
        // if it is not otherwise visible
        Config.useDebugBackground = !Config.useDebugBackground;
        this.shape.setFillOpacity(Config.useDebugBackground ? 0.8 : 1.0);
    },

    chooseDisplayTheme: function(evt) { 
        var themes = this.displayThemes;
        var target = this; // trouble with function scope
        var themeNames = Properties.own(themes);
        var items = themeNames.map(
            function(each) { return [each, target, "setDisplayTheme", themes[each]]; });
        var menu = new MenuMorph(items, this);
        menu.openIn(this.world(), evt.point());
    },
    
    setDisplayTheme: function(styleDict) { 
        this.displayTheme = styleDict;
        this.withAllSubmorphsDo( function() { this.applyLinkedStyles(); });
    },
    
    restart: function() {
        window.location && window.location.reload();
    },

    defaultOrigin: function(bounds) { 
        return bounds.topLeft(); 
    },

    layoutOnSubmorphLayout: function() {
	return false;
    },
    
    world: function() { 
        return this; 
    },
    
    firstHand: function() {
        return this.hands[0];
    },
    
    moveBy: function(delta) { // don't try to move the world
    },
    
    //  *** The new truth about ticking scripts ***
    //  A morph may have any number of active scripts
    //  Each is activated by a call such as
    //      this.startStepping(50, "rotateBy", 0.1);
    //  Note that stepTime is in milliseconds, as are all lower-level methods
    //  The arguments are: stepTime, scriptName, argIfAny
    //  This in turn will create a SchedulableAction of the form
    //  { actor: aMorph, scriptName: "rotateBy", argIfAny: 0.1, stepTime: 50, ticks: 0 }
    //  and this action will be both added to an array, activeScripts in the morph,
    //  and it will be added to the world's scheduledActions list, which is an array of
    //  tuples of the form [msTimeToRun, action]
    //  The ticks field is used to tally ticks spent in each schedulableAction --
    //  It is incremented on every execution, and it is multiplied by 0.9 every second
    //  Thus giving a crude 10-second average of milliseconds spent in this script
    //  every 10 seconds.  The result is divided by 10 in the printouts.
    //
    //  The message startSteppingScripts can be sent to morphs when they are placed in the world.
    //  It is intended that this may be overridden to start any required stepping.
    //  The message stopStepping will be sent when morphs are removed from the world.
    //  In this case the activeScripts array of the morph is used to determine exactly what
    //  scripts need to be unscheduled.  Note that startSteppingScripts is not sent
    //  automatically, whereas stopStepping is.  We know you won't forget to 
    //  turn your gadgets on, but we're more concerned to turn them off when you're done.

    scheduleForLater: function(action, delayInMs, removePrior) {
        if (removePrior) this.stopSteppingFor(action, true);  // unschedule earlier
        this.scheduleAction(new Date().getTime() + delayInMs, action);
    },
    
    startSteppingFor: function(action) {
        if (!action.scriptName)
	    throw new Error("old code");
        // New code for stepping schedulableActions
        this.stopSteppingFor(action, true);  // maybe replacing arg or stepTime
        this.scheduleAction(new Date().getTime(), action);
    },
    
    stopSteppingFor: function(action, fromStart) { // should be renamed to unschedule()
        // fromStart means it is just getting rid of a previous one if there,
        // so not an error if not found
	// DI FIXME: This only removes the first one found (alarms may be multiply scheduled)

        if (this.currentScript === action) {
	    // Not in queue; just prevent it from being rescheduled
	    this.currentScript = null;
	    return;
	}
	var list = this.scheduledActions;  // shorthand
        for (var i = 0; i < list.length; i++) {
            var actn = list[i][1];
            if (actn === action) {
                list.splice(i, 1);
                return; 
            }
        }
        // Never found that action to remove.  Note this is not an error if called
        // from startStepping just to get rid of previous version
        if (!fromStart) {
	    console.log('failed to stopStepping ' + action);
	    Function.showStack();
	}
    },
    
    inspectScheduledActions: function() {
        // inspect an array of all the actions in the scheduler.  Note this
        // is not the same as scheduledActions which is an array of tuples with times
        new SimpleInspector(this.scheduledActions.map(function(each) { return each[1]; })).open();
    },

    doOneCycle: function WorldMorph$doOneCycle(world) {
        // Process scheduled scripts

        // Run through the scheduledActions queue, executing those whose time has come
        // and rescheduling those that have a repeatRate
        // Note that actions with error will not get rescheduled
        // (and, unless we take the time to catch here, will cause all later 
        // ones in the queue to miss this tick.  Better less overhead, I say
        // DI: **NOTE** this needs to be reviewed for msClock rollover
        // -- also note we need more time info for multi-day alarm range
        // When we do this, I suggest that actions carry a date and msTime
        // and until their day is come, they carry a msTime > a day
        // That way they won't interfere with daily scheduling, but they can
        // still be dealt with on world changes, day changes, save and load.
	var msTime = new Date().getTime();
	var timeOfNextStep = Infinity;
        var list = this.scheduledActions;  // shorthand
        var timeStarted = msTime;  // for tallying script overheads
        while (list.length > 0 && list[list.length - 1][0] <= msTime) {
            var schedNode = list.pop();  // [time, action] -- now removed
            var action = schedNode[1];
            this.currentScript = action; // so visible from stopStepping
            Function.resetDebuggingStack();  // Reset at each tick event
	    try {
                action.exec();
            } catch (er) {
                console.warn("error on actor %s: %s", action.actor, er);
                Function.showStack();
		timeStarted = new Date().getTime();
		continue;
            }
            // Note: if error in script above, it won't get rescheduled below (this is good)
	    
            // Note: stopStepping may set currentScript to null so it won't get rescheduled
            if (this.currentScript && action.stepTime > 0) {
                var nextTime = msTime + action.stepTime;
                this.scheduleAction(nextTime, action)
            }
            this.currentScript = null;

            var timeNow = new Date().getTime();
            var ticks = timeNow - timeStarted;
            if (ticks > 0) action.ticks += ticks;  // tally time spent in that script
            timeStarted = timeNow;
        }

        if (list.length > 0) timeOfNextStep = Math.min(list[list.length-1][0], timeOfNextStep);

        // Each second, run through the tick tallies and mult by 0.9 to 10-sec "average"
        if (!this.secondTick) this.secondTick = 0;
        var secondsNow = Math.floor(msTime / 1000);
        if (this.secondTick != secondsNow) {
            this.secondTick = secondsNow;
            var tallies = {};
            for (var i=0; i<list.length; i++) {
                var action = list[i][1];
                tallies[action.scriptName] = action.ticks;
                action.ticks *= 0.9 // 10-sec decaying moving window
            }
            if (Config.showSchedulerStats && secondsNow % 10 == 0) {
                console.log('New Scheduler length = ' + this.scheduledActions.length);
                console.log('Script timings...');  // approx ms per second per script
                for (var p in tallies) console.log(p + ': ' + (tallies[p]/10).toString());
            }
        }
        this.lastStepTime = msTime;
        this.setNextStepTime(timeOfNextStep);
    },

    setNextStepTime: function(timeOfNextStep) {
        if (timeOfNextStep == Infinity) { // didn't find anything to cycle through
            this.mainLoop = null; 
        } else {
            this.mainLoop = Global.setTimeout(this.mainLoopFunc, timeOfNextStep - this.lastStepTime);
        }
    },

    kickstartMainLoop: function() {
        // kickstart the timer (note arbitrary delay)
        this.mainLoop = Global.setTimeout(this.mainLoopFunc, 10);
    },

    scheduleAction: function(msTime, action) { 
        // Insert a SchedulableAction into the scheduledActions queue

        var list = this.scheduledActions;  // shorthand
        for (var i=list.length-1; i>=0; i--) {
            var schedNode = list[i];
            if (schedNode[0] > msTime) {
                list.splice(i+1, 0, [msTime, action]);
                if (!this.mainLoop) this.kickstartMainLoop();
                return; 
            }
        }
        list.splice(0, 0, [msTime, action]);
        if (!this.mainLoop) this.kickstartMainLoop();
    },

    onEnter: function() {},
    onExit: function() {},

    /**
     * override b/c of parent treatement
     */
    relativize: function(pt) { 
        return pt;
        //return pt.matrixTransform(this.rawNode.parentNode.getTransformToElement(this.rawNode)); 
    },
    
    addMorphs: function(evt) {
        //console.log("mouse point == %s", evt.mousePoint);
	// FIXME this boilerplate code should be abstracted somehow.
        var world = this.world();
        var items = [
            ["New subworld (LinkMorph)", function(evt) { world.addMorph(new LinkMorph(null, evt.point()));}],
            ["Line", function(evt) { var p = evt.point(); world.addMorph(Morph.makeLine([p, p.addXY(60, 30)], 2, Color.black));}],
            ["Rectangle", function(evt) { world.addMorph(new Morph(evt.point().extent(pt(60, 30)), "rect"));}],
            ["Ellipse", function(evt) { world.addMorph(new Morph(evt.point().extent(pt(50, 50)), "ellipse"));}],
            ["TextMorph", function(evt) { world.addMorph(new TextMorph(evt.point().extent(pt(120, 10)), "This is a TextMorph"));}],
            ["Class Browser", function(evt) { new SimpleBrowser().openIn(world, evt.point()); }],
            ["Object Hierarchy Browser", function(evt) { new ObjectBrowser().openIn(world, evt.point()); }],    
            ["TestRunner", function(evt) { new TestRunner().openIn(world, evt.point()); }],
            ["OmetaWorkspace", function(evt) { new OmetaWorkspace().openIn(world, evt.point()); }],
			["Call Stack Viewer", function(evt) { 
		if (Config.debugExtras) Function.showStack("use viewer");
		else new StackViewer(this).openIn(world, evt.point()); }],    
            ["Clock", function(evt) {
                var m = world.addMorph(new ClockMorph(evt.point(), 50));
                m.startSteppingScripts(); }],
            ["Piano Keyboard", function(evt) {
                var m = new PianoKeyboard(evt.point());
                m.scaleBy(1.5);  m.rotateBy(-0.2);
				world.addMorph(m)}],

	    ["Console", function(evt) {
		world.addFramedMorph(new ConsoleWidget(50).buildView(pt(800, 100)), "Console", evt.point());
	    }],
            ["FrameRateMorph", function(evt) {
                var m = world.addMorph(new FrameRateMorph(evt.point().extent(pt(160, 10)), "FrameRateMorph"));
                m.startSteppingScripts(); }],
	    ["XenoBrowser", function(evt) { 
		var xeno = new XenoBrowserWidget();
		xeno.openIn(world, evt.point()); 
	    }],
	    ["External link", function(evt) { world.addMorph(new ExternalLinkMorph(URL.source.toString(), evt.point()));}],

        ];
        items.push(["File Browser", function(evt) { new FileBrowser().openIn(world, evt.point()) }]);
	// FIXME this is hardcoded, remove later, shows how Subversion can be accessed directly.
	items.push(["Model documentation", function(evt) { 
	    var url = new URL("http://livelykernel.sunlabs.com/repository/lively-kernel/trunk/doc/wiki/model.txt");
	    var model = Record.newPlainInstance({URL: url,  Content: null});
	    world.addTextWindow({
		content: "fetching ... ",
		title: "Model documentation",
		plug: {model: model, getText: "getContent"},
		position: evt.point()
	    });
	    var res = new Resource( model);
	    res.fetch();
	}]);
        new MenuMorph(items, this).openIn(this.world(), evt.point());
    },
    
    viewport: function() {
	try {
	    return Rectangle.ensure(this.canvas().viewport);
	} catch (er) { // FF doesn't implement viewport ?
	    return this.shape.bounds();
	}
    },

    alert: function(varargs) {
        var fill = this.getFill();
        this.setFill(Color.black); // poor man's modal dialog

        var menu = new MenuMorph([["OK", function() { this.world().setFill(fill); this.remove() }]]);
        menu.onMouseUp = function(/*...*/) { 
            if (!this.stayUp) this.world().setFill(fill); // cleanup
	    Class.getPrototype(this).onMouseUp.apply(this, arguments);
        };

	var caption = Strings.formatFromArray($A(arguments));
        menu.openIn(this, this.viewport().center(), true, caption); 
	menu.label.wrapStyle = text.WrapStyle.Normal;
	if (false) {
	    // FIXME: how to center?
	    var txt = new Text(menu.label.textString, menu.label.textStyle);
	    txt.emphasize({align: 'center'}, 0, menu.label.textString.length);
	    menu.label.textStyle = txt.style;
	}
	menu.label.fitText();
        menu.scaleBy(2.5);
    }.logErrors('alert'),

    prompt: function(message, callback, defaultInput) {
	var model = Record.newPlainInstance({Message: message, Input: defaultInput || "", Result: null});
	model.addObserver({ 
	    onResultUpdate: function(value) { 
		if (value == true && callback) callback.call(Global, model.getInput());
	    }});
	var dialog = new PromptDialog(model.newRelay({Message: "-Message", Result: "+Result", Input: "Input"}));
	dialog.openIn(this, this.hands[0].lastMouseDownPoint);
    },

    confirm: function(message, callback) {
	var model = Record.newPlainInstance({Message: message, Result: null});
	model.addObserver({ 
	    onResultUpdate: function(value) { 
		if (value && callback) callback.call(Global, value);
	    }});
	var dialog = new ConfirmDialog(model.newRelay({Message: "-Message", Result: "+Result"}));
	dialog.openIn(this, this.firstHand().lastMouseDownPoint);
	return dialog;
    },
    
    addFramedMorph: function(morph, title, optLoc, optSuppressControls) {
	var displ = pt(5, 5);
	return this.addMorphAt(new WindowMorph(morph, title, optSuppressControls), 
			       optLoc || this.firstHand().lastMouseDownPoint.subPt(displ));
    },

    addTextWindow: function(spec) {
	// FIXME: typecheck the spec 
	if (Object.isString(spec.valueOf())) spec = {content: spec}; // convenience
	var extent = spec.extent || pt(500, 200);
	var pane = newTextPane(extent.extentAsRectangle(), spec.content || "");
	if (spec.acceptInput !== undefined) pane.innerMorph().acceptInput = spec.acceptInput;
	if (spec.plug) pane.innerMorph().connectModel(spec.plug);
	this.addFramedMorph(pane, String(spec.title || ""), spec.position);
	return pane.innerMorph();
    },

    addTextListWindow: function(spec) {
	// FIXME: typecheck the spec 
	if (spec instanceof Array) spec = {content: spec }; // convenience
	var content = spec.content;
	if (!content) content = "";
	if (!(content instanceof Array)) content = [content];

	var extent = spec.extent || pt(500, Math.min(300, content.length * TextMorph.prototype.fontSize * 1.5));
	var rec = extent.extentAsRectangle();

	var pane = new ScrollPane(new TextListMorph(rec, content), rec); 
	if (spec.plug) pane.innerMorph().connectModel(spec.plug);
	this.addFramedMorph(pane, 
			    spec.title ? String(spec.title) : "", 
			    spec.position || this.firstHand().position().subPt(pt(5, 5)));
	return pane.innerMorph();
    },


    addMorphFrontOrBack: function($super, m, front) {
	var oldTop = this.topWindow();
	var result = $super(m, front);
	if (!front || !(m instanceof WindowMorph)) return result;
	// if adding a new window on top, then make it active
        if (oldTop) oldTop.titleBar.highlight(false);
	m.takeHighlight();
  	return result;
    },

    topWindow: function() {
	for (var i= this.submorphs.length - 1; i >= 0; i--) {
	    var sub = this.submorphs[i];
	    if (sub instanceof WindowMorph) return sub;
	}
	return null;
    },

    positionForNewMorph: function(relatedMorph) {
	// this should be much smarter than the following:
	return relatedMorph ? relatedMorph.bounds().topLeft().addPt(pt(5, 0)) : this.firstHand().lastMouseDownPoint;
    },

    reactiveAddMorph: function(morph, relatedMorph) { 	// add morph in response to a user action, make it prominent
	return this.addMorphAt(morph, this.positionForNewMorph(relatedMorph));
    }

});

Object.extend(WorldMorph, {    
    worldCount: 0,
    
    currentWorld: null,
    
    current: function() {
        return WorldMorph.currentWorld;
    }

    
});

/**
 * @class HandMorph
 * Since there may be multiple users manipulating a Morphic world
 * simultaneously, we do not want to use the default system cursor.   
 */ 

Morph.subclass("HandMorph", {
    
    documentation: "Defines a visual representation for the user's cursor.",
    applyDropShadowFilter: !!Config.useDropShadow,
    dropShadowFilter: "url(#DropShadowFilter)",
    

    shadowOffset: pt(5,5),
    handleOnCapture: true,
    logDnD: false,
    grabHaloLabelStyle: {fontSize: Math.floor((Config.defaultFontSize || 12) *0.85), padding: Rectangle.inset(0)},

    initialize: function($super, local) {
        $super(pt(5,5).extent(pt(10,10)), "rect");
	
        this.setShape(new PolygonShape([pt(0,0), pt(9,5), pt(5,9), pt(0,0)], 
				       (local ? Color.primary.blue : Color.primary.red), 1, Color.black));
        this.shape.ignoreEvents();
	
        this.isLocal = local;

        this.keyboardFocus = null;
        this.mouseFocus = null;
	this.mouseFocusChanges_ = 0; // count mouse focus changes until reset
        this.mouseOverMorph = null;
        this.lastMouseEvent = null;
        this.lastMouseDownPoint = pt(0,0);
        this.hasMovedSignificantly = false;
        this.grabInfo = null;
        
        this.mouseButtonPressed = false;

        this.keyboardFocus = null; 

        this.priorPoint = null;
        this.owner = null;
	this.boundMorph = null; // surrounds bounds
	this.layoutChangedCount = 0; // to prevent recursion on layoutChanged
	
	this.formalModel =  Record.newPlainInstance({GlobalPosition: null});
	
        return this;
    },
    lookNormal: function(morph) {
        this.shape.setVertices([pt(0,0), pt(9,5), pt(5,9), pt(0,0)]);
    },
    lookLinky: function(morph) {
        this.shape.setVertices([pt(0,0), pt(18,10), pt(10,18), pt(0,0)]);
    },
    
    registerForEvents: function(morph) {
        Event.basicInputEvents.forEach(function(name) { 
            morph.rawNode.addEventListener(name, this, this.handleOnCapture);}, this);
    },
    
    unregisterForEvents: function(morph) {
        Event.basicInputEvents.forEach(function(name) { 
            morph.rawNode.removeEventListener(name, this, this.handleOnCapture);}, this);
    },
    
    resetMouseFocusChanges: function() {
	var result = this.mouseFocusChanges_;
	this.mouseFocusChanges_ = 0;
	return result;
    },

    setMouseFocus: function(morphOrNull) {
        // console.log('setMouseFocus: ' + morphOrNull);
        this.mouseFocus = morphOrNull;
	this.setFill(this.mouseFocus ? Color.primary.blue.lighter(2) : Color.primary.blue);
	this.mouseFocusChanges_ ++;
    },
    
    setKeyboardFocus: function(morphOrNull) {
        if (this.keyboardFocus === morphOrNull) return;

        if (this.keyboardFocus != null) {
            // console.log('blur %s', this.keyboardFocus);
            this.keyboardFocus.onBlur(this);
            this.keyboardFocus.setHasKeyboardFocus(false);
        }
        
        this.keyboardFocus = morphOrNull; 
        
        if (this.keyboardFocus) {
            this.keyboardFocus.onFocus(this);
        }
    },
    
    world: function() {
        return this.owner;
    },

    // this is the DOM Event callback
    handleEvent: function HandMorph$handleEvent(rawEvt) {
        var evt = new Event(rawEvt);
        evt.hand = this;

        Function.resetDebuggingStack();
        switch (evt.type) {
        case "MouseWheel":
        case "MouseMove":
        case "MouseDown":
        case "MouseUp":
            this.handleMouseEvent(evt);
            break;
        case "KeyDown":
        case "KeyPress": 
        case "KeyUp":
            this.handleKeyboardEvent(evt);
            break;
        default:
            console.log("unknown event type " + evt.type);
        }
        // evt.stopPropagation();
    }.logErrors('Event Handler'),

    armProfileFor: function(evtType) { 
	this.profileArmed = evtType;  // either "MouseDown" or "MouseUp"
    },

    handleMouseEvent: function HandMorph$handleMouseEvent(evt) { 
	if(!Config.debugExtras || !this.profileArmed || this.profileArmed != evt.type) {
		// Profile not armed or event doesnt match
		return this.reallyHandleMouseEvent(evt);
	}
	// Run profile during handling of this event
	this.profileArmed = null;  // Only this once
	var result;
	Function.trace(function() { result = this.reallyHandleMouseEvent(evt) }.bind(this));
	return result;
    },

    reallyHandleMouseEvent: function HandMorph$reallyHandleMouseEvent(evt) { 

        evt.setButtonPressedAndPriorPoint(this.mouseButtonPressed, 
					  this.lastMouseEvent ? this.lastMouseEvent.mousePoint : null);
	var world = this.owner;
        //-------------
        // mouse move
        //-------------
        if (evt.type == "MouseMove" || evt.type == "MouseWheel") { // it is just a move
            this.setPosition(evt.mousePoint);
	    this.updateGrabHalo();
            
            if (evt.mousePoint.dist(this.lastMouseDownPoint) > 10) { 
                this.hasMovedSignificantly = true;
            }
            
            if (this.mouseFocus) { // if mouseFocus is set, events go to that morph
                this.mouseFocus.captureMouseEvent(evt, true);
            } else if (world) {
                var receiver = world.morphToReceiveEvent(evt);
                if (receiver !== this.mouseOverMorph) {
                    // if over a new morph, send onMouseOut, onMouseOver
                    if (this.mouseOverMorph) this.mouseOverMorph.onMouseOut(evt);
                    this.mouseOverMorph = receiver;
                    // console.log('msOverMorph set to: ' + Object.inspect(this.mouseOverMorph));
                    if (this.mouseOverMorph) this.mouseOverMorph.onMouseOver(evt);
                    if (!receiver || !receiver.canvas()) return false;  // prevent errors after world-switch
                    // Note if onMouseOver sets focus, it will get onMouseMove
                    if (this.mouseFocus) this.mouseFocus.captureMouseEvent(evt, true);
                    else if (!evt.hand.hasSubmorphs()) world.captureMouseEvent(evt, false); 
                } else if (receiver) receiver.captureMouseEvent(evt, false);
            }
            this.lastMouseEvent = evt;
            return true;
        } 

	
        //-------------------
        // mouse up or down
        //-------------------
        if (!evt.mousePoint.eqPt(this.position())) { // Only happens in some OSes
            // and when window wake-up click hits a morph
            this.moveBy(evt.mousePoint.subPt(this.position())); 
        }

        this.mouseButtonPressed = (evt.type == "MouseDown"); 
        this.setBorderWidth(this.mouseButtonPressed ? 3 : 1);
        evt.setButtonPressedAndPriorPoint(this.mouseButtonPressed, this.lastMouseEvent ? this.lastMouseEvent.mousePoint : null);
	
        if (this.mouseFocus != null) {
            if (this.mouseButtonPressed) {
                this.mouseFocus.captureMouseEvent(evt, true);
                this.lastMouseDownPoint = evt.mousePoint; 
            } else 
		this.mouseFocus.captureMouseEvent(evt, true); 
        } else {
	    if (this.hasSubmorphs() && (evt.type == "MouseDown" || this.hasMovedSignificantly)) {
                // If laden, then drop on mouse up or down
                var m = this.topSubmorph();
                var receiver = world.morphToGrabOrReceiveDroppingMorph(evt, m);
                // For now, failed drops go to world; later maybe put them back?
                this.dropMorphsOn(receiver || world);
            } else {
                // console.log("hand dispatching event %s to owner %s", evt, this.owner);
                // This will tell the world to send the event to the right morph
                // We do not dispatch mouseup the same way -- only if focus gets set on mousedown
                if (evt.type == "MouseDown") world.captureMouseEvent(evt, false);
            }
            if (evt.type == "MouseDown") {
                this.lastMouseDownPoint = evt.mousePoint;
                this.hasMovedSignificantly = false; 
            }
        }
        this.lastMouseEvent = evt; 
	return true;
    },
    
    layoutChanged: function($super) {
	this.layoutChangedCount ++;
	try {
	    $super();
	    if (this.layoutChangedCount == 1) {
		this.grabHaloMorph && this.updateGrabHalo();
	    }
	} finally {
	    this.layoutChangedCount --;
	}
    },


    showAsGrabbed: function(grabbedMorph) {
        if (this.applyDropShadowFilter) grabbedMorph.applyFilter(this.dropShadowFilter); 

	if (Config.showGrabHalo) {
	    var bounds = grabbedMorph.bounds(true);
	    this.grabHaloMorph = this.addMorphBack(new Morph(bounds, "rect").applyStyle({fill: null, borderWidth: 0.5 }));
	    this.grabHaloMorph.setStrokeDashArray([3,2]);
	    this.grabHaloMorph.setLineJoin(Shape.LineJoins.Round);
	    this.grabHaloMorph.ignoreEvents();

	    var idLabel = new TextMorph(pt(20,10).extentAsRectangle(), String(grabbedMorph.id())).beLabel();
	    idLabel.applyStyle(this.grabHaloLabelStyle);
	    this.grabHaloMorph.addMorph(idLabel);
	    idLabel.align(idLabel.bounds().bottomLeft(), this.grabHaloMorph.innerBounds().topRight());
	    
	    var pos = grabbedMorph.getPosition();
	    var posLabel = new TextMorph(pt(20, 10).extentAsRectangle(), "").beLabel();
	    posLabel.applyStyle(this.grabHaloLabelStyle);
	    this.grabHaloMorph.positionLabel = this.grabHaloMorph.addMorph(posLabel);
	    
	    this.updateGrabHalo();
	}
    },

    showAsUngrabbed: function(grabbedMorph) {
	if (this.applyDropShadowFilter) grabbedMorph.applyFilter(null);
	if (this.grabHaloMorph) {
	    this.grabHaloMorph.remove();
	    this.grabHaloMorph = null;
	}
    },

    updateGrabHalo: function Morph$updateGrabHalo() {
	if (this.grabHaloMorph) {
	    this.grabHaloMorph.setBounds(this.topSubmorph().bounds(true).expandBy(3));
	    if (this.grabHaloMorph.positionLabel) {
		var pos = this.topSubmorph().worldPoint(this.topSubmorph().getPosition());
		var posLabel  = this.grabHaloMorph.positionLabel;
		posLabel.setTextString(pos.x.toFixed(1) + "," + pos.y.toFixed(1));
		posLabel.align(posLabel.bounds().bottomCenter(), this.grabHaloMorph.innerBounds().topLeft());
	    }
	}
    },

    
    grabMorph: function(grabbedMorph, evt) { 
        if (evt.isShiftDown() || (grabbedMorph.owner && grabbedMorph.owner.getCopySubmorphsOnGrab() == true)) {
            if (!grabbedMorph.okToDuplicate()) return;
            grabbedMorph.copyToHand(this);
            return;
        }
        if (evt.isCommandKey()) {
            grabbedMorph.showMorphMenu(evt);
            return;
        }
        // Give grabbed morph a chance to, eg, spawn a copy or other referent
        grabbedMorph = grabbedMorph.okToBeGrabbedBy(evt);
        if (!grabbedMorph) return;

        if (grabbedMorph.owner && !grabbedMorph.owner.openForDragAndDrop) return;

        if (this.keyboardFocus && grabbedMorph !== this.keyboardFocus) {
            this.keyboardFocus.relinquishKeyboardFocus(this);
        }
        // console.log('grabbing %s', grabbedMorph);
        // Save info for cancelling grab or drop [also need indexInOwner?]
        // But for now we simply drop on world, so this isn't needed
        this.grabInfo = [grabbedMorph.owner, grabbedMorph.position()];
        if (this.logDnD) console.log('%s grabbing %s', this, grabbedMorph);
        this.addMorph(grabbedMorph);
	this.showAsGrabbed(grabbedMorph);
        // grabbedMorph.updateOwner(); 
        this.changed(); //for drop shadow
    },
    
    dropMorphsOn: function(receiver) {
        if (receiver !== this.world()) this.unbundleCarriedSelection();
        while (this.hasSubmorphs()) { // drop in same z-order as in hand
            var m = this.submorphs.first();
            receiver.addMorph(m); // this removes it from hand
            if (this.logDnD) console.log("%s dropping %s on %s", this, m, receiver);
	    this.showAsUngrabbed(m);

        }
    },

    unbundleCarriedSelection: function() {
        // Unpack the selected morphs from a selection prior to drop or jump to other world
        if (!this.hasSubmorphs() || !(this.topSubmorph() instanceof SelectionMorph)) return;
        var selection = this.topSubmorph();
        for (var i=0; i<selection.selectedMorphs.length; i++) {
            this.addMorph(selection.selectedMorphs[i])
        }
        selection.removeOnlyIt();
    },

    moveSubmorphs: function(evt) {
        var world = this.world();
	
        // Display height is returned incorrectly by many web browsers.
        // We use an absolute Y-value instead. 
        var towardsPoint = pt(world.bounds().center().x, 350);

        switch (evt.getKeyCode()) {
        case Event.KEY_LEFT:
            this.submorphs.invoke('moveBy', pt(-10,0));
            evt.stop();
            return true;
        case Event.KEY_RIGHT:
            // forget the existing selection
            this.submorphs.invoke('moveBy', pt(10, 0));
            evt.stop();
            return true;
        case Event.KEY_UP:
            this.submorphs.invoke('moveBy', pt(0, -10));
            evt.stop();
            return true;
        case Event.KEY_DOWN:
            this.submorphs.invoke('moveBy', pt(0, 10));
            evt.stop();
            return true;

            // Experimental radial scrolling feature
            // Read the comments near method Morph.moveRadially()
        case Event.KEY_PAGEUP:
        case 65: // The "A" key
	    world.submorphs.invoke('moveRadially', towardsPoint, 10);
            this.moveRadially(towardsPoint, 10);            
            evt.stop();
            return true;
        case Event.KEY_PAGEDOWN:
        case 90: // The "Z" key
	    world.submorphs.invoke('moveRadially', towardsPoint, -10);
            this.moveRadially(towardsPoint, -10);            
            evt.stop();
            return true;
        }
        
        return false;
    },

    transformSubmorphs: function(evt) {
	var fun = null;
        switch (evt.getKeyChar()) {
        case '>':
	    fun = function(m) { m.setScale(m.getScale()*1.1) };
	    break;
        case '<':
	    fun = function(m) { m.setScale(m.getScale()/1.1) };
	    break;
        case ']':
	    fun = function(m) { m.setRotation(m.getRotation() + 2*Math.PI/16) };
	    break;
        case '[':
            fun = function(m) { m.setRotation(m.getRotation() - 2*Math.PI/16) };
	    break;
        }
	if (fun) {
	    this.submorphs.forEach(fun);
	    evt.stop();
	    return true;
	} else return false;
    },

    handleKeyboardEvent: function(evt) { 
        if (this.hasSubmorphs())  {
            if (evt.type == "KeyDown" && this.moveSubmorphs(evt)) return;
            else if (evt.type == "KeyPress" && this.transformSubmorphs(evt)) return;
        }
        // manual bubbling up b/c the event won't bubble by itself    
        for (var responder = this.keyboardFocus; responder != null; responder = responder.owner) {
            if (responder.takesKeyboardFocus()) {
                var handler = responder[evt.handlerName()];
                if (handler) {
                    if (handler.call(responder, evt)) 
                        break; // event consumed?
                }
            }
        } 
	this.blockBrowserKeyBindings(evt);
    },

    blockBrowserKeyBindings: function(evt) {
	switch (evt.getKeyCode()) {
	case Event.KEY_SPACEBAR: // [don't] scroll
	    // stop keypress but don't try to stop preceeding keydown,
	    // which would prevent keypress from firing and being handled by Text etc
	    if (evt.type == "KeyPress") evt.stop();
	    break;
	    case Event.KEY_BACKSPACE: // [don't] go to the previous page 
	    evt.stop();
	    break;
	}
	switch (evt.getKeyChar()) {
	case "[":
	case "]":
	    if (evt.isMetaDown() && evt.type == "KeyPress") {
		// Safari would want to navigate the history
		evt.preventDefault();
		break;
	    }
	}
	
    },

    bounds: function($super) {
        // account for the extra extent of the drop shadow
        // FIXME drop shadow ...
        if (this.shadowMorph)
            return $super().expandBy(this.shadowOffset.x);
        else return $super();
    },

    internalAddMorph: function(m, isFront) {
	// override
	var insertionPt = this.submorphs.length == 0 ? this.shape.rawNode :
	    isFront ? this.submorphs.last().rawNode : this.submorphs.first().rawNode;
        // the last one, so drawn last, so front
	
	this.rawNode.insertBefore(m.rawNode, insertionPt);

	if (isFront)
            this.submorphs.push(m);
	else
            this.submorphs.unshift(m);
    },
    
    toString: function($super) { 
        var superString = $super();
        var extraString = Strings.format(", local=%s,id=%s", this.isLocal, this.id());
        if (!this.hasSubmorphs()) return superString + ", an empty hand" + extraString;
        return Strings.format("%s, a hand carrying %s%s", superString, this.topSubmorph(), extraString);
    }
    
});


Morph.subclass('LinkMorph', {

    documentation: "two-way hyperlink between two Lively worlds",
    helpText: "Click here to enter or leave a subworld.\n" +
        "Use menu 'grab' to move me.  Drag objects\n" +
        "onto me to transport objects between worlds.",
    openForDragAndDrop: false,
    suppressHandles: true,
    style: {borderColor: Color.black, fill: new RadialGradient([Color.blue.lighter(), 1, Color.blue, 1, Color.blue.darker()], pt(0.4, 0.2))},
    
    initialize: function($super, otherWorld, initialPosition) {
        // In a scripter, type: world.addMorph(new LinkMorph(null))
        var bounds = initialPosition;

        // Note: Initial position can be specified either as a rectangle or point.
        // If no position is specified, place the icon in the lower left corner
        // of the screen.
        if (!bounds) {
            bounds = WorldMorph.current().bounds().bottomLeft().addXY(50, -50).asRectangle().expandBy(25);
        } else if (bounds instanceof Point) {
            bounds = bounds.asRectangle().expandBy(25);
        }
	
        $super(bounds, "ellipse");
	
        // Make me look a bit like a world
        this.applyStyle(this.style);
        [new Rectangle(0.15,0,0.7,1), new Rectangle(0.35,0,0.3,1), new Rectangle(0,0.3,1,0.4)].forEach(function(each) {
            // Make longitude / latitude lines
            var lineMorph = new Morph(bounds.scaleByRect(each), "ellipse");
	    lineMorph.applyStyle({fill: null, borderWidth: 1, borderColor: Color.black}).ignoreEvents();
            lineMorph.align(lineMorph.bounds().center(),this.shape.bounds().center());
            this.addMorph(lineMorph);
        }, this);

        if (!otherWorld) {
            this.myWorld = this.makeNewWorld(this.canvas());
	    this.addPathBack();
	} else 
            this.myWorld = otherWorld;

        return this;
    },
    
    makeNewWorld: function(canvas) {
	return new WorldMorph(canvas);
    },
    
    addPathBack: function() {
	var pathBack = new LinkMorph(WorldMorph.current(), this.bounds().center());
        pathBack.setFill(new RadialGradient([Color.orange, 1, Color.red, 1, Color.red.darker(2)], 
					    pt(0.4, 0.2)));
        this.myWorld.addMorph(pathBack);
	return pathBack;
    },
    
    restorePersistentState: function($super, importer) {
        $super(importer);
        if (!this.myWorld) this.myWorld = WorldMorph.current(); // a link to the current world: a reasonable default?
    },

    okToBeGrabbedBy: function(evt) {
        this.enterMyWorld(evt); 
        return null; 
    },

    morphMenu: function($super, evt) { 
        var menu = $super(evt);
        menu.addItem(["publish linked world as ... ", function() { 
	    this.world().prompt("world file (.xhtml)", this.exportLinkedFile.bind(this)); }]);
	menu.replaceItemNamed("package", ["package linked world", function(evt) {
	    new PackageMorph(this.myWorld).openIn(this.world(), this.bounds().topLeft()); this.remove()} ]);
        return menu;
    },

    enterMyWorld: function(evt) { // needs vars for oldWorld, newWorld
        carriedMorphs = [];
        // Save, and suspend stepping of, any carried morphs
        evt.hand.unbundleCarriedSelection();
        while (evt.hand.hasSubmorphs()) {
            var m = evt.hand.topSubmorph();
            m.suspendAllActiveScripts();
            carriedMorphs.splice(0, 0, m);
	    evt.hand.showAsUngrabbed(m);
            m.remove();
        }
        this.hideHelp();
        this.myWorld.changed();
        var oldWorld = WorldMorph.current();
        oldWorld.onExit();    
        // remove old hands
        oldWorld.hands.clone().forEach(function(hand) { 
            oldWorld.removeHand(hand);
        });
        
        if (Config.suspendScriptsOnWorldExit) {
            oldWorld.suspendAllActiveScripts();
        }

        var canvas = oldWorld.canvas();
        oldWorld.remove(); // some SVG calls may stop working after this point in the old world.
        
        console.log('left world %s through %s', oldWorld, this);
	
        // display world first, then add hand, order is important!
        var newWorld = this.myWorld;
        if (newWorld.owner) {
            console.log("new world had an owner, removing");
            newWorld.remove();
        }

        newWorld.displayOnCanvas(canvas); 
	
        if (Config.suspendScriptsOnWorldExit) { 
            newWorld.resumeAllSuspendedScripts();
        }

        carriedMorphs.each(function(m) {
	    var hand = newWorld.firstHand();
	    hand.addMorph(m);
	    hand.showAsGrabbed(m);
            m.resumeAllSuspendedScripts();
        });

        if (Config.showThumbnail) {
            var scale = 0.1;
            if (newWorld.thumbnail) {
                console.log("disposing of a thumbnail");
                newWorld.thumbnail.remove();
            }
            newWorld.thumbnail = new Morph(Rectangle.fromElement(canvas), "rect");
            newWorld.thumbnail.setPosition(this.bounds().bottomRight());
            newWorld.addMorph(newWorld.thumbnail);
            newWorld.thumbnail.setScale(scale);
            newWorld.thumbnail.addMorph(oldWorld);
        }

        if (carriedMorphs.length > 0) newWorld.firstHand().emergingFromWormHole = true; // prevent re-entering
    },
    
    onMouseOver: function($super, evt) {
        if (evt.hand.hasSubmorphs()) { // if hand is laden enter world bearing gifts
            if (!evt.hand.emergingFromWormHole) this.enterMyWorld(evt);
        } else {
	    $super(evt);
	}
    },
    
    onMouseOut: function($super, evt) {
        evt.hand.emergingFromWormHole = false;
	$super(evt);
    },

    getHelpText: function() {
	return this.helpText;
    }
    
});

LinkMorph.subclass('ExternalLinkMorph');

ExternalLinkMorph.addProperties({
    URL: { name: "url"}
});

ExternalLinkMorph.addMethods({
    documentation: "A link to a different web page, presumably containing another LK",

    style: {borderColor: Color.black, fill: new RadialGradient([Color.green, 1, Color.yellow])},
    
    initialize: function($super, url, position) {
	$super(null, position || pt(0, 0));
	this.setURL(url.toString());
	this.win = null; // browser window
    },

    makeNewWorld: Functions.Null, 
    
    addPathBack: Functions.Null,

    enterMyWorld: function(evt) {
	var url = this.getURL();
	if (evt.isCommandKey()) {
	    this.world().confirm("Leave current runtime to enter another page?",
				 function (answer) {
				     if (answer) Global.location = url;
				     else console.log("cancelled loading " + url);
				 });
	} else {
	    if (this.win && !this.win.closed) this.win.focus();
	    else this.win = Global.window.open(url);
	}
    },
    
    getHelpText: function() {
	return "Click to enter " + this.getURL();
    },


    morphMenu: function($super, evt) { 
	var menu = $super(evt);
	menu.addItem(["set link target...", function() {
	    this.world().prompt("Set new target file", function(answer) {
		this.setURL(URL.source.withFilename(answer));
	    }.bind(this), URL.source.toString());
	}]);
	return menu;
    }
    
});

}); // using lk.text

// Some SVG/DOM bindings 



// adds convenience functions
function interactiveEval(text) { 
    /*
    function $h() {  
	// history
	for (var i = self.commandBuffer.length - 1; i > 0; i--) {
	    self.log(i + ") " + self.commandBuffer[i]);
	}
    }
    function $c() {
	self.setModelValue("setRecentMessages", []);
    }

*/
    function $w() { 
	// current world
	return WorldMorph.current(); 
    }
    function $m(morph) {
	// morphs
	var array = [];
	(morph || WorldMorph.current()).submorphs.forEach(function(m) { array.push(m) });
	return array;
    }
    function $i(id) { // maybe just '$'
	return document.getElementById(id.toString());
    }
    function $x(node) {
	return Exporter.stringify(node);
    }
    function $f(id) {
	// format node by id
	return $x($i(id));
    }
    function $p(obj) {
	return Properties.all(obj);
    }
    function $x(node, expr) {
	return new Query(expr).findAll(node.rawNode || node);
    }
    return eval(text);
};

// for Fabrik
Morph.addMethods({
    isContainedIn: function(morph) {
        if (!this.owner)
            return false;
        if (this.owner === morph)
            return true;
        else
            return this.owner.isContainedIn(morph)
    }

});

// for Fabrik
HandMorph.addMethods({
    changed: function($super, morph) {
        $super();
        if (this.formalModel)
            this.formalModel.setGlobalPosition(this.getPosition());
        this.submorphs.forEach(function(ea){
            // console.log("changed "+ ea);
            ea.changed("globalPosition", this.getPosition());
        }, this);
    }
});



console.log('loaded Core.js');

