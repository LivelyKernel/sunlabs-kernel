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
function dbgOn(cond) {
    if (cond) debugger; // note that rhino has issues with this keyword
    // also call as: throw dbgOn(new Error(....))
    return cond;
}

// namespace logic adapted frm
// http://higher-order.blogspot.com/2008/02/designing-clientserver-web-applications.html
function using() {
    var args = arguments; // FIXME: enable using('lk::text')
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
            parts = spec.split('::');
            for (i = 0, N = parts.length; i<N; i++) {
                spec = parts[i];
		if (!Class.isValidIdentifier(spec)) {
                    throw new Error('"'+spec+'" is not a valid name for a package.');
		}
                context[spec] = context[spec] || {};
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

var getUniqueName = (function() { 
    var counter = 0;
    return function() {
        return 'anonymous_module_' + ++counter; // What a language!
    }
})();

var PendingRequirements = {};

// Semaphore functions
function moduleLoaded(module) {
    console.log('declaring ' + module + ' as loaded');
    Object.keys(PendingRequirements)
        .select(function(ea) { return Object.isArray(PendingRequirements[ea]) })
        .each(function(ea) {
        if (PendingRequirements[ea])
            PendingRequirements[ea] = PendingRequirements[ea].without(module);
    });
};
function waitFor(module, requiredModules) {
    if (!PendingRequirements[module]){
        PendingRequirements[module] = requiredModules;
        return;
    }
    PendingRequirements[module] = PendingRequirements[module].concat(requiredModules);
};
function noPendingRequirements(module) {
    if (!PendingRequirements[module]) return true;
    
    if (PendingRequirements[module].any(function(ea) { document.getElementById(module) && !Loader.wasLoaded[module] }))
        return false;

    return PendingRequirements[module].length == 0;
};

function module(moduleName) {
    PendingRequirements[moduleName] = 0;
    return {requires: basicRequire.curry(moduleName)};
};

function require(/*requiredModuleNameOrAnArray, anotherRequiredModuleName, ...*/) {
    return module(getUniqueName()).requires($A(arguments));
};
    
function basicRequire(/*ownModuleName, requiredModuleNameOrAnArray, anotherRequiredModuleName, ...*/) {
    var args = $A(arguments);    
    var ownModuleName = args.shift();
    var preReqModuleNames = Object.isArray(args[0]) ? args[0] : args;
    var requiredModuleNames = [];
    for (var i = 0; i < preReqModuleNames.length; i++) {
        requiredModuleNames[i] = preReqModuleNames[i];
    }
    
    waitFor(ownModuleName, requiredModuleNames);
    return {toRun: function(code) {
        code = code.curry(ownModuleName); // pass in the own module name for nested requirements
        Loader.loadScripts(requiredModuleNames, onModuleLoad.curry(ownModuleName, code)) }};
};

function onModuleLoad(ownModuleName, code) {
    if (noPendingRequirements(ownModuleName)) {
        try {
            code();
        } catch(e) {
            console.log(JSON.serialize(PendingRequirements));
            dbgOn(true); throw e;
        } finally {
            if (noPendingRequirements(ownModuleName)) moduleLoaded(ownModuleName);
        };
        return;
    };
    console.log('Trying soon again to load requirements for ' + ownModuleName);
    window.setTimeout(onModuleLoad.curry(ownModuleName, code), 0);
};

/* Code loader. Appends file to DOM. */
var Loader = {
    
    wasLoaded: {},
    
    pendingActions: [],
    
    pendingActionsFor: function(url) {
        return Loader.pendingActions.inject([], function(all, ea) {
            if (ea.url == url) all.push(ea);
            return all;
        }); 
    },
    
    loadScripts: function(urls, actionWhenDone) {
        if (urls.length == 0) {
            actionWhenDone();
            return;
        };
        var notifier = function(url) {
            urls = urls.without(url);
            if (urls.length == 0) actionWhenDone();
        };
        urls.each(function(ea) { Loader.loadScript(ea, notifier.curry(ea)) });
    },
    
    loadScript: function(url /*not really a url yet*/, onLoadAction, embedSerializable) {
        console.log('Begin to load ' + url + (embedSerializable ? ' into <defs>' : ''));
        if (document.getElementById(url)) {
            // console.log(url + ' already loaded');
            if (onLoadAction) {
                if (Loader.wasLoaded[url]) {
                    console.log("The action which is dependend from " + url +
                                " will be directly run because " + url + " is in the DOM and loaded");
                    onLoadAction();
                    // When url is already there, onModuleLoad isn't run again, so remove url from the requirement list manually
                    if (noPendingRequirements(url)) moduleLoaded(url);
                } else  {
                    // in the DOM but not loaded yet
                    // console.log('adding a pending action for ' + url);
                    Loader.pendingActions.unshift({url: url, action: onLoadAction});
                }
            };
            return;
        };
        
        var node = embedSerializable ? // add it to other script elements in svg to make it serializable
            document.getElementsByTagName("defs")[0]:
            document.getElementsByTagName("body")[0];
        var script = document.createElement('script');
        script.id = url;
        script.type = 'text/javascript';
        script.src = url;
        
        var loaderWrapper = function() {
            if (onLoadAction) {
                onLoadAction();
                // why signal moduleLoaded again? should already be included in onLoadAction...???
                if (noPendingRequirements(url)) moduleLoaded(url);
            }
            Loader.wasLoaded[url] = true;
            Loader.pendingActionsFor(url).each(function(ea) {
                // console.log(url + ' was loaded. Loading now its pending action for ' + ea.url);
                ea.action();
                if (noPendingRequirements(ea.url)) moduleLoaded(ea.url);
            });
        };
        script.onload = loaderWrapper;
        node.appendChild(script);
        
        return this;
    }
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
	    var path = className.split('::');
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
	    var value = source[property];
	    // weirdly, RegExps are functions in Safari, so testing for Object.isFunction on
	    // regexp field values will return true. But they're not full-blown functions and don't 
	    // inherit argumentNames from Function.prototype
	    
	    if (ancestor && Object.isFunction(value) && value.argumentNames
		&& value.argumentNames().first() == "$super") {
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

    addProperties: function(spec, optRecordType) {
	Class.addMixin(this, (optRecordType || DOMRecord).prototype.create(spec).prototype);
    },

    isSubclassOf: function(aClass) {
	if (!Class.isClass(aClass) || this === Object || !this.superclass)
	    return false;
	if (this.superclass === aClass)
	    return true;
	return this.superclass.isSubclassOf(aClass);
    },
    
    allSubclasses: function() {
        var self = this; 
        return Object.values(Global).select(function(ea) {
            try {
                return ea && Class.isClass(ea) && ea.isSubclassOf(self);
            } catch(e) {
                return false;
            };
        });
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

/*
 * Stack Viewer when Dans StackTracer is not available
 */
function getStack() {
    var result = [];
    for(var caller = arguments.callee.caller; caller; caller = caller.caller) {
        if (result.indexOf(caller) != -1) {
           result.push({name: "recursive call cant be traced"});
           break;
        }
        result.push(caller);
    };
    return result;  
};

function guessFunctionName(func) {
       if(func.name) return func.name;
       var m = func.toString().match(/function (.+)\(/);
       if (m) return m[1];
       return func
};

function printStack() {  
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
        // Function.showStack();
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
	    storeClass = DOMNodeRecord;
	    optStore = NodeFactory.create("record"); // FIXME flat JavaScript instead by default?
	} else {
	    storeClass = optStore instanceof Global.Node ? DOMNodeRecord : PlainRecord;
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
    


Global.console && Global.console.log("loaded basic library");
