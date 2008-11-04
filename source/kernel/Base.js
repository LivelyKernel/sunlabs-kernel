/*
 * Copyright ï¿½ 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 
var Global = this.window.top || this.window; // set to the context enclosing the SVG context.
function dbgOn(cond, optMessage) {
    if (optMessage) console.log(optMessage);
    if (cond) debugger; // note that rhino has issues with this keyword
    // also call as: throw dbgOn(new Error(....))
    return cond;
}

// namespace logic adapted from
// http://higher-order.blogspot.com/2008/02/designing-clientserver-web-applications.html
function using() {
    var args = arguments; // FIXME: enable using('lively.Text')
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
                context[i] = context[i] || new lively.lang.Namespace(context, i);
                namespace(spec[i], context[i]);//recursively descend tree
            }
        }
    } else if (typeof spec === 'string') {
        (function handleStringCase() {
            var parts;
            parts = spec.split('.');
            for (i = 0, N = parts.length; i<N; i++) {
                spec = parts[i];
		if (!Class.isValidIdentifier(spec)) {
                    throw new Error('"'+spec+'" is not a valid name for a package.');
		}
                context[spec] = context[spec] || new lively.lang.Namespace(context, spec);
                context = context[spec];
            }
        })();
    } else {
	throw new TypeError();
    }
}

// this was the beginning of all this...
// function require(/* script file names */) {
//     var args = $A(arguments);
//     var loadAll = function(code) {
//         args.reverse().inject(code, function(onLoadAction, url) {
//             return function() { Loader.loadScript(url, onLoadAction) };
//         })();
//     };
//     return {run: loadAll};
// };


var PendingRequirements = {};

// Semaphore functions
function moduleLoaded(module) {
    // the module is loaded, so remove it from the PendingRequirements list
    console.log('declaring ' + module + ' as loaded');
    Object.keys(PendingRequirements)
        .select(function(ea) { return Object.isArray(PendingRequirements[ea]) })
        .each(function(ea) { PendingRequirements[ea] = PendingRequirements[ea].without(module) });
};
// FIXME depends on 'Document' and Loader
function noPendingRequirements(module) {
    if (!PendingRequirements[module]) return true;
    if (PendingRequirements[module].any(function(ea) { document.getElementById(module) && !Loader.wasLoaded[module] }))
        return false;

    return PendingRequirements[module].length == 0;
};

function module(moduleName, context) {

    var namespacePrefix = 'lively.';
    
    function isNamespaceAwareModule(moduleName) {
        return moduleName.startsWith(namespacePrefix);
    }
    
    function convertUrlToNSIdentifier(url) {
        var result = namespacePrefix + url;
        result = result.replace(/\//, '.');
        result = result.substring(0, result.lastIndexOf('.')); // get rid of '.js'
        return result;
    }
    
    function createNamespaceModule(moduleName) {
        var namespaceIdentifier = isNamespaceAwareModule(moduleName) ? moduleName : convertUrlToNSIdentifier(moduleName);
        
        context = context || Global;
        namespace(namespaceIdentifier, context);
        
        var module = lively.lang.Namespace.objectNamed(namespaceIdentifier, context);
        // module.namespaceIdentifier = namespaceIdentifier; // FIXME just for now...
        return module;
    }
    
    function createUri(moduleName) {
        var baseUrl = document.baseURI;  // FIXME depends on 'Document'
        var url = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1)
        url += isNamespaceAwareModule(moduleName) ? moduleName.substr(namespacePrefix.length).replace(/\./, '/') + '.js' : moduleName;
        dbgOn('http://localhost/lively/js.js' === url);
        return url;
    }

    function waitFor(module, requiredModules) {
	if (!PendingRequirements[module]) {
            PendingRequirements[module] = requiredModules;
            return;
	}
	PendingRequirements[module] = PendingRequirements[module].concat(requiredModules);
    }

    function basicRequire(/*module, requiredModuleNameOrAnArray, anotherRequiredModuleName, ...*/) {
	var args = $A(arguments);    
	var module = args.shift();
	var preReqModuleNames = Object.isArray(args[0]) ? args[0] : args; // support modulenames as array and parameterlist
	var requiredModuleNames = [];
	for (var i = 0; i < preReqModuleNames.length; i++) {
            requiredModuleNames[i] = createUri(preReqModuleNames[i]);
	}
	
	waitFor(module.uri, requiredModuleNames);
	return {toRun: function(code) {
            code = code.curry(module); // pass in own module name for nested requirements
            var codeWrapper = function() { // run code with namespace modules as additional parameters
                code.apply(this, preReqModuleNames.collect(function(ea) {
                    var nsIdentifier = isNamespaceAwareModule(ea) ? ea : convertUrlToNSIdentifier(ea);
                    return lively.lang.Namespace.objectNamed(nsIdentifier)
                }));
            }
            
            Loader.loadScripts(requiredModuleNames, onModuleLoad.curry(module.uri, codeWrapper));
	}};
    };

    dbgOn(!Object.isString(moduleName));

    var module = createNamespaceModule(moduleName);
    module.uri = createUri(moduleName);
    // if (PendingRequirements[module.uri]) throw dbgOn(new Error('Module already exisiting ' + module.uri));
    PendingRequirements[module.uri] = 0;  // FIXME get rid of that Singleton, track pending requirements via module
    module.requires = basicRequire.curry(module);
    return module;
};
    
function require(/*requiredModuleNameOrAnArray, anotherRequiredModuleName, ...*/) {
    var counter = 0;
    function getUniqueName() {
        return 'anonymous_module_' + ++counter; // What a language!
    }
    return module(getUniqueName()).requires($A(arguments));
};

function onModuleLoad(ownModuleName, code) {
    if (noPendingRequirements(ownModuleName)) {
        try {
            code();
        } catch(e) {
	    throw dbgOn(e, JSON.serialize(PendingRequirements));
        } finally {
            if (noPendingRequirements(ownModuleName)) moduleLoaded(ownModuleName);
        };
        return;
    };
    console.log('Trying soon again to load requirements for ' + ownModuleName);
    window.setTimeout(onModuleLoad.curry(ownModuleName, code), 0);
};



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
	    if (!Class.isValidIdentifier(shortName))
		throw new Error("invalid class name " + shortName);
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

	    var getter = source.__lookupGetter__(property);
	    if (getter) this.prototype.__defineGetter__(property, getter);
	    var setter = source.__lookupSetter__(property);
	    if (setter) this.prototype.__defineSetter__(property, setter);
	    if (getter || setter)
		continue;

	    
	    var value = source[property];
	    // weirdly, RegExps are functions in Safari, so testing for Object.isFunction on
	    // regexp field values will return true. But they're not full-blown functions and don't 
	    // inherit argumentNames from Function.prototype
	    
	    if (ancestor && Object.isFunction(value) && value.argumentNames
		&& value.argumentNames().first() == "$super") {
		(function() { // wrapped in a method to save the value of 'method' for advice
        	    var method = value;
                    var advice = (function(m) {
        		return function callSuper() { 
        		    return ancestor[m].apply(this, arguments);
        		};
		    })(property);
		    advice.methodName = "$super:" + (this.superclass ? this.superclass.type + "." : "") + property;
	
		    value = Object.extend(advice.wrap(method), {
	                valueOf:  function() { return method },
		        toString: function() { return method.toString() },
		        originalFunction: method
		    });
	        })();
	    }
	    this.prototype[property] = value;
	    
	    if (property === "formals") {
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
		}
	    }
	}
	return this;

    },

    addProperties: function(spec, recordType) {
	Class.addMixin(this, recordType.prototype.create(spec).prototype);
    },

    isSubclassOf: function(aClass) {
        return this.superclasses().include(aClass);
    },
    
    allSubclasses: function() {
        return Global.classes(true).select(function(ea) { return ea.isSubclassOf(this) }.bind(this));
    },
    
    superclasses: function() {
        if (this.superclass === Object) return [Object];
        return this.superclass.superclasses().concat([this.superclass]);
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
	if (Global.Importer && (arguments[0] instanceof Importer)) {
	    this.deserialize.apply(this, arguments);
	} else if (Global.Copier && (arguments[0] instanceof Copier)) {
	    this.copyFrom.apply(this, arguments);
	} else {
	    // if this.initialize is undefined then prolly the constructor was called without 'new'
	    this.initialize.apply(this, arguments); 
	}
    },

    def: function(constr, superConstr, optProtos, optStatics) {
	// currently not used
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
	    switch (prop) {
	    case "constructor": case "initialize": case "deserialize": case "copyFrom": 
	    case "toString": case "definition": case "description":
		break;
	    default:
		if (cls.prototype[prop] === undefined) // do not override existing values!
		    cls.prototype[prop] = value;
	    }
	}
    }

};



 
var Strings = {
    documentation: "Convenience methods on strings",
    
    format: function() {
	return this.formatFromArray($A(arguments));
    },
    
    // adapted from firebug lite
    formatFromArray: function(objects) {
	var self = objects.shift();
        if(!self) {console.log("Error in Strings>>formatFromArray, self is undefined")};

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
	    var oldFmt = fmt;
	    var parts = [];
	    
	    for (var m = reg.exec(fmt); m; m = reg.exec(fmt)) {
		var type = m[8] || m[5];
		var appender = type in appenderMap ? appenderMap[type] : appendObject;
		var precision = m[3] ? parseInt(m[3]) : (m[4] == "." ? -1 : 0);
		parts.push(fmt.substr(0, m[0][0] == "%" ? m.index : m.index + 1));
		parts.push({appender: appender, precision: precision});
		
		fmt = fmt.substr(m.index + m[0].length);
	    }
	    if (fmt)
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

// bootstrap namespaces
Object.subclass('Namespace', {
    
    isNamespace: true,
    
    initialize: function(context, nsName) {
        this.namespaceIdentifier = context.namespaceIdentifier + '.' + nsName;
    },
    
    gather: function(selector, condition, recursive) {
        var result = Object.values(this).select(function(ea) { return condition.call(this, ea) }, this);
        if (!recursive) return result;
        return  this.subNamespaces().inject(result, function(result, ns) { return result.concat(ns[selector](true)) });
    },
    
    subNamespaces: function(recursive) {
        return this.gather('subNamespaces',
                    function(ea) { try { return ea && ea.isNamespace && ea !== this } catch(e) {return false} },
                    recursive);
    },
    
    classes: function(recursive) {        
        return this.gather('classes',
                    function(ea) { return ea && ea !== this.constructor && Class.isClass(ea) },
                    recursive);
    },
    
    functions: function(recursive) {
        return this.gather('functions',
                    function(ea) { return ea && !Class.isClass(ea) && Object.isFunction(ea) && !ea.declaredClass && this.requires !== ea },
                    recursive);
    }
    
});

// FIXME this is a bad method name, please change
// The method returns an object to a given string, which can include namespaces
// this is neccesary because e.g. Global['lively.Tests.ClassTest'] does not work
Namespace.objectNamed = function(string, context) {
    return string.split('.').inject(context || Global, function(context, name) { return context[name] });
};

// let Glabal act like a namespace itself
Object.extend(Global, Namespace.prototype);
Global.namespaceIdentifier = 'Global';

// namespace('lively.lang');
lively = new Namespace(Global, 'lively');
lively.lang = new Namespace(lively, 'lang');
lively.lang.Namespace = Namespace;
delete Namespace;




lively.lang.Execution = { // will be extended later
    showStack: Functions.Null,
    resetDebuggingStack: Functions.Null,
    installStackTracers: Functions.Null,
};


/*
 * Stack Viewer when Dans StackTracer is not available
 */
function getStack() {
    var result = [];
    for(var caller = arguments.callee.caller; caller; caller = caller.caller) {
        if (result.indexOf(caller) != -1) {
           result.push({name: "recursive call can't be traced"});
           break;
        }
        result.push(caller);
    };
    return result;  
};

function printStack() {  
    function guessFunctionName(func) {
	if(func.name) return func.name;
	var m = func.toString().match(/function (.+)\(/);
	if (m) return m[1];
	return func
    };

    var string = "== Stack ==\n";
    var stack = getStack();
    stack.shift(); // for getStack
    stack.shift(); // for printStack (me)
    var indent = "";
    for(var i=0; i < stack.length; i++) {
        string += indent + i + ": " +guessFunctionName(stack[i]) + "\n";
        indent += " ";        
    };
    return string;
};

function logStack() {
    this.console.log(printStack())
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
	    + (this.methodName || this.name || "anonymous");
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
		logStack();
		// lively.lang.Execution.showStack();
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
		lively.lang.Execution.showStack();
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
            if (name.startsWith("on") && name.endsWith("Update")) {
                var varname = name.substring(2, name.indexOf("Update"));
                if (!this["set" + varname]) {
                     // console.log("ERROR: cannot observe nonexistent variable " + varname);
                     // logStack();
                    throw new Error("cannot observe nonexistent variable " + varname);
		}
                var deps = this[Record.observerListName(varname)];
                if (!deps) deps = this[Record.observerListName(varname)] = [];
                else if (deps.indexOf(dep) >= 0) return;
                deps.push(dep);
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
            Object.keys(this).select(function(ea) {
                return ea.endsWith('$observers')
            });
        observerFields.forEach(function(ea) {
            this[ea] = this[ea].reject(function(relay) { return relay === dep || relay.delegate === dep });
        }, this);
    },


    addObserversFromSetters: function(reverseSpec, dep, optKickstartUpdates) {
	var forwardSpec = {};
	Properties.forEachOwn(reverseSpec, function each(key, value) {
	    
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
		console.log("on kickstart update: " + er + " on " + dep + " " + target
			    + " mapping to " + source + " " + er.stack);
	    }
	}
	
	if (optKickstartUpdates) 
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
        this['set' + fieldName] = this['set' + fieldName].wrap(function(proceed, value, optSource, force) {
            proceed(value, optSource, true);
        })
    }
    
});


Record.subclass('PlainRecord', {
    getRecordField: function(name) { 
	return this.rawNode[name];
    },

    setRecordField: function(name, value) {
	return this.rawNode[name] = value;
    },
    
    removeRecordField: function(name) {
	delete this.rawNode[name];
    }
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
    
    newRecordSetter: function newRecordSetter(name, to, byDefault) {
        return function recordSetter(value, optSource, force) {
            if (value === undefined) {
		this.removeRecordField(name);
            } else {
            	if (value == null && byDefault) value = byDefault;
		var coercedValue = to ? to(value) : value;
		if (!force && this.getRecordField(name) === coercedValue) return;
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
	    if (!impl) { throw dbgOn(new Error("delegate " + this.delegate + " does not implement " + targetName)); }
	    var args = arguments;
	    if (optConv) { args = $A(arguments); args.unshift(optConv(args.shift())); }
	    return impl.apply(this.delegate, args);
	}
    },

    newRelayGetter: function newRelayGetter(targetName, optConv) {
	return function getterRelay(/*...*/) {
	    var impl = this.delegate[targetName];
	    if (!impl) { 
		throw dbgOn(new Error("delegate " + this.delegate + " does not implement " + targetName)); 
	    }
	    var result = impl.apply(this.delegate, arguments);
	    return optConv ? optConv(result) : result;
	}
    },

    newRelayUpdater: function newRelayUpdater(targetName, optConv) {
	return function updateRelay(/*...*/) {
	    var impl = this.delegate[targetName];
	    if (!impl) { 
		throw dbgOn(new Error("delegate " + this.delegate + " does not implement " + targetName)); 
	    }
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
		if (m) {
		    var method = m[methodName];
		    if (!method) return byDefault;
		    var result = method.call(m);
		    return (result === undefined) ? byDefault : (from ? from(result) : result);
		} else {
		    return this.getModelValue(methodName, byDefault);
		}
            }
	}
	
	function newDelegatorSetter(name, to) {
	    var methodName = "set" + name;
	    return function setter(value, force) {
		var m = this.formalModel;
		if (m) {
		    var method = m[methodName];
		    // third arg is source, fourth arg forces relay to set value even if oldValue === value
		    return method && method.call(m, to ? to(value) : value, this, force);
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
	    Properties.forEachOwn(spec, function(name, desc) {
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


namespace('lively');


// See http://www.w3.org/TR/css3-values/
// and http://www.w3.org/TR/CSS2/syndata.html#values    

Object.extend(Object.subclass('lively.Length'), {

    parse: function(string) {
	// FIXME: handle units
	return parseFloat(string);
    }
});


Object.extend(lively.Length.subclass('lively.Coordinate'), {
    parse: function(string) {
	// FIXME: handle units
	return parseFloat(string);
    }
});




Global.console && Global.console.log("loaded basic library");


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
	this.x = lively.Coordinate.parse(array[0]);
	this.y = lively.Coordinate.parse(array[1]);
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

    random: function() {  return new Point(this.x*Math.random(), this.y*Math.random());  },

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
    
    toLiteral: function() { return {x: this.x, y: this.y}; },
    
    inspect: function() {
	return JSON.serialize(this);
    },

    matrixTransform: function(mx, acc) {
	if (!acc) acc = pt(0, 0); // if no accumulator passed, allocate a fresh one
	acc.x = mx.a * this.x + mx.c * this.y + mx.e;
	acc.y = mx.b * this.x + mx.d * this.y + mx.f;
	return acc;
    },

    // Polar coordinates (theta=0 is East on screen, and increases in CCW direction
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

    // Note: theta=0 is East on the screen, and increases in counter-clockwise direction
    polar: function(r, theta) { return new Point(r*Math.cos(theta), r*Math.sin(theta)); },
    random: function(scalePt) { return new Point(scalePt.x.randomSmallerInteger(), scalePt.y.randomSmallerInteger()); },
    
    fromLiteral: function(literal) {
	return pt(literal.x, literal.y);
    }

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

    intersects: function(r) { return this.intersection(r).isNonEmpty(); },  // not the fastest

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
    },

    toLiteral: function() { return {x: this.x, y: this.y, width: this.width, height: this.height}; },
    
});



Object.extend(Rectangle, {

    fromAny: function(ptA, ptB) {
	return rect(ptA.minPt(ptB), ptA.maxPt(ptB));
    },

    fromLiteral: function(literal) {
	return new Rectangle(literal.x, literal.y, literal.width, literal.height);
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
	if (!str) return null;
	dbgOn(!str.match);
	var tuple = Color.fromTuple(str);
	this.r = tuple[0];
	this.g = tuple[1];
	this.b = tuple[2];
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
    },

    fromLiteral: function(spec) {
	return new Color(spec.r, spec.g, spec.b);
    },

    fromTuple: function(tuple) {
	return new Color(tuple[0], tuple[1], tuple[2]);
    },

    fromString: function(str) {
	return Color.fromTuple(Color.parse(str));
    },

    parse: function(str) { 
	// FIXME this should be much more refined
	// FIXME handle keywords
	if (!str || str == 'none')
	    return null;
	var match = str.match("rgb\\((\\d+),(\\d+),(\\d+)\\)");
	var r,g,b;
	if (match) { 
	    r = parseInt(match[1])/255;
	    g = parseInt(match[2])/255;
	    b = parseInt(match[3])/255;
	    return [r, g, b];
	} else if (str.length == 7 && str.charAt(0) == '#') {
	    r = parseInt(str.substring(1,3), 16)/255;
	    g = parseInt(str.substring(3,5), 16)/255;
	    b = parseInt(str.substring(5,7), 16)/255;
	    return [r, g, b];
	} else return null;
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

