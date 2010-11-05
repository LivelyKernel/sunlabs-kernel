/*
 * Copyright (c) 2009-2010 Hasso-Plattner-Institut
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

/*
 * COP Layers for JavaScript
 */

module('cop.Layers').requires().toRun(function(thisModule) {

/* Private Helpers for Development */

var log_layer_code = false;	
var log = function log(string) { if(log_layer_code) console.log(string); }; 

var object_id_counter = 0; // hack, to work around absence of identity dictionaries in JavaScript 
// we could perhaps limit ourselfs to layer only those objects that respond to object.id()

// because working with objects is a serialization problem in itself, perhaps we should restrict ourself in working with classes
// So classes have names and names can be used as keys in dictionaries :-)


/*
 * Private State
 */

Object.extend(cop, {
	effectiveLayerCompositionStack: [],
	GlobalLayers: [],
});

/*
 * Private Methods
 */
Object.extend(cop, {

	// for debbuggin ContextJS itself
	withLogLayerCode: function(func) {
		try {
			var old  = log_layer_code; 
			log_layer_code = true;
			func();
		} finally {
			log_layer_code = old;
		}	
	},

	getLayerDefinitionForObject: function(layer, object) {
		// log("cop.getLayerDefinitionForObject(" + layer + "," + object +")")
		if (!layer || !object) return;
		var result = layer[object._layer_object_id];
		return result ? result : cop.getLayerDefinitionForObject(layer, object.prototype);
	},


	ensurePartialLayer: function(layer, object) {
		if (!layer)
			throw new Error("in ensurePartialLayer: layer is nil");
		if (!object.hasOwnProperty("_layer_object_id"))
			object._layer_object_id = object_id_counter++;
		if (!layer[object._layer_object_id])
			layer[object._layer_object_id] = {_layered_object: object};
		return layer[object._layer_object_id];
	},

	layerMethod: function(layer, object,  property, func) {
		cop.ensurePartialLayer(layer, object)[property] = func;
		func.displayName = "layered " + layer.name + " " + (object.constructor ? (object.constructor.type + "$"): "") + property;
		cop.makeFunctionLayerAware(object, property);
	},

	layerGetterMethod: function(layer, object, property, getter) {	
		cop.ensurePartialLayer(layer, object).__defineGetter__(property, getter);
	},

	layerSetterMethod: function(layer, object, property, setter) {
		cop.ensurePartialLayer(layer, object).__defineSetter__(property, setter);
	},

	layerProperty: function(layer, object,  property, defs) {
		if (!defs) {
			return cop.layerPropertyWithShadow(layer, object, property);
		}
		var getter = defs.__lookupGetter__(property);
		if (getter) {
			cop.layerGetterMethod(layer, object,  property, getter);
		};
	    var setter = defs.__lookupSetter__(property);
		if (setter) {
			cop.layerSetterMethod(layer, object,  property, setter);
		};
		if (getter || setter) {
			cop.makePropertyLayerAware(object, property);
		} else {		
			cop.layerMethod(layer, object,  property, defs[property]);
		};
	},

	layerPropertyWithShadow: function(layer, object, property) {
		var defs = {};
		var selector = "_layered_"+layer.name+"_"+ property; 
		defs.__defineGetter__(property, function(proceed){
			if(this[selector] === undefined && proceed) {
				// fallback / procceed on property lookup if layer does not define it own state
				return cop.proceed();
			} else {
				return this[selector];
			}});
		defs.__defineSetter__(property, function(proceed, v) { 
			this[selector] = v;});
		cop.layerProperty(layer, object, property, defs);
	},

	computeLayersFor: function Layers$computeLayersFor(obj) { 
		if (obj && obj.activeLayers) {
			// the object is now fully responsible for the layer composition
			return obj.activeLayers(cop.currentLayers);
		};
		var layers = cop.currentLayers(obj);
		return layers;
	},

	composeLayers: function(stack, index, obj) {
		// console.log("compose " + stack + " index: " + index)
		if (index === undefined) {
			index = stack.length - 1;
		};
		if (index == 0) {
			if (obj && obj.getActivatedLayers) {
				var objectLayers = obj.getActivatedLayers();
				if (objectLayers) {
					return cop.GlobalLayers.clone().concat(objectLayers);
				};
			};
			return cop.GlobalLayers.clone();
		};
		var current = stack[index];
		var rest = cop.composeLayers(stack, index - 1, obj);
		if (current.withLayers) {
			rest = rest.reject(function(ea){return current.withLayers.include(ea);});
			return rest.concat(current.withLayers.clone());
		};
		if (current.withoutLayers) {
			rest = rest.reject(function(ea){return current.withoutLayers.include(ea);});
			return rest;
		};
		throw new Error("Error: Problems in layer composition");
	},

	currentLayers: function(obj) {
		if (cop.LayerStack.length == 0) {
			throw new Error("The default layer is missing");
		};
		var result;
		// NON OPTIMIZED VERSION FOR STATE BASED LAYER ACTIVATION
		if (obj) {
			result = cop.composeLayers(cop.LayerStack, cop.LayerStack.length - 1, obj);
		} else {
			var current = cop.LayerStack.last();
			if (!current.composition) {
				current.composition = cop.composeLayers(cop.LayerStack, cop.LayerStack.length - 1);
			};
			result = current.composition;
		}
		// return result

		// NON OPTIMIZED VERSION FOR LAYER SELECTION	
		return result.select(function(ea) {
			return ea && (!ea.selectAfterComposition || ea.selectAfterComposition(obj, result));
		});
	},

	// clear cached layer compositions
	invalidateLayerComposition: function() {
		cop.LayerStack.each(function(ea) {
			ea.composition = null;
		});
	},

	resetLayerStack: function() {
		cop.LayerStack = [{isStatic: true, toString: function() {return "BaseLayer";}, composition: null}];
		cop.invalidateLayerComposition();
	},

	lookupLayeredFunctionForObject: function(self, layer, function_name, methodType, n) {
		if (!layer) return undefined;
		// we have to look for layers defintions for self, self.prototype, ... there may be layered methods 
		// in a subclass of "obj"			
		var layered_function, layer_definition_for_object = cop.getLayerDefinitionForObject(layer, self);
		if (layer_definition_for_object) {
			// log("  found layer definitions for object");
			// TODO: optional proceed goes here....
			if (methodType == 'getter') {
				layered_function = layer_definition_for_object.__lookupGetter__(function_name);
			} else if (methodType == 'setter'){
				layered_function = layer_definition_for_object.__lookupSetter__(function_name);
			} else {
				if (layer_definition_for_object.hasOwnProperty(function_name)) {
					layered_function = layer_definition_for_object[function_name];
				}
			}
		}
		if (!layered_function) {
			// try the superclass hierachy
			// log("look for superclass of: " + self.constructor)
			var superclass = self.constructor.superclass;
			if (superclass) {
				foundClass = superclass;
				// log("layered function is not found in this partial method, lookup for my prototype?")
				return cop.lookupLayeredFunctionForObject(superclass.prototype, layer, function_name, methodType);
			} else {
				// log("obj has not prototype")
			}
		}
		return layered_function;
	},

	pvtMakeFunctionOrPropertyLayerAware:  function(base_obj, function_name, base_function, methodType) {
		if (!base_function.isLayerAware) {
			var wrapped_function = function() {
				var composition = new cop.PartialLayerComposition(this, base_obj, function_name, base_function, methodType);
				cop.effectiveLayerCompositionStack.push(composition);
				var result ;
				try {
					result = cop.proceed.apply(this, arguments);
					// return executeWithLayers(base_function, this, cop.computeLayersFor(this), 0, base_obj, function_name, args);
				} finally {
					cop.effectiveLayerCompositionStack.pop()
				};
				return result
			};
			wrapped_function.isLayerAware = true;
		
			// For wrapped_function.getOriginal()
			wrapped_function.originalFunction = base_function;

			if (methodType == "getter") {
				base_obj.__defineGetter__(function_name, wrapped_function);
			} else if (methodType == "setter") {
				base_obj.__defineSetter__(function_name, wrapped_function);
			} else { 
				base_obj[function_name] = wrapped_function;
			}
		}
	},

	makeFunctionLayerAware: function(base_obj, function_name) {
			if (!base_obj) throw new Error("can't layer an non existent object");

			/* ensure base function */	
			var base_function = base_obj[function_name];
			if (!base_function) {
				// console.log("WARNING can't layer an non existent function" + function_name +" , so do nothing")
				// return;
				base_function = Functions.Null;
			};
			cop.pvtMakeFunctionOrPropertyLayerAware(base_obj, function_name, base_function)
	},

	makePropertyLayerAware: function(base_obj, property) {
		if (!base_obj) throw new Error("can't layer an non existent object");

		/* ensure base getter and setter */	    
		var getter = base_obj.__lookupGetter__(property);
		var layered_property = "__layered_" + property +"__";
		if (!getter) {
			// does not work when dealing with classes and instances...
			base_obj[layered_property] = base_obj[property]; // take over old value
			getter = function() {
				return this[layered_property];
			};		
			base_obj.__defineGetter__(property, getter);
		}; 
		var setter = base_obj.__lookupSetter__(property);
		if (!setter) {
			setter = function(value, value2) {
				this[layered_property] = value;
			};
			base_obj.__defineSetter__(property, setter);
		};

		cop.pvtMakeFunctionOrPropertyLayerAware(base_obj, property, getter, 'getter');
		cop.pvtMakeFunctionOrPropertyLayerAware(base_obj, property, setter, 'setter');
	}
});

/* PUPLIC COP  Layer Definition */
Object.extend(cop, {
	// creates a named global layer
	create: function(name, silent) {
		if( silent === undefined) {
			silent = true; // default
		}
		if (Global[name]) {
			if (!silent)
				console.log("Layer "+ name + " is already there");
			return Global[name];
		};
		var layer = new Layer(name);
		Global[name] = layer;
		return layer;
	},

	// DEPRICATED
	layer: function(name) {
		console.log("SyntaxDepricated: cop.create(... use cop.create(")
		return cop.create(name, true);
	},

	// DEPRICATED
	createLayer: function(name) {
		console.log("SyntaxDepricated: cop.create(... use cop.create(")
		return cop.create(name, false);
	},

	// Layering objects may be a garbage collection problem, because the layers keep strong reference to the objects
	layerObject: function(layer, object, defs) {
		// log("cop.layerObject");
		Object.keys(defs).each(function(function_name) {
			// log(" layer property: " + function_name);
			cop.layerProperty(layer, object, function_name, defs);
		});
	},

	// layer around only the class methods
	layerClass: function(layer, classObject, defs) {
		cop.layerObject(layer, classObject.prototype, defs);
	},

	// layer around class methods and all subclass methods
	// (might be related to Aspect oriented programming)
	layerClassAndSubclasses: function(layer, classObject, defs) {
		// log("layerClassAndSubclasses");
		cop.layerClass(layer, classObject, defs);
	
		// and now wrap all overriden methods...
		classObject.allSubclasses().each(function(eaClass) {
			// log("make m1 layer aware in " + eaClass)
			var obj = eaClass.prototype;
			Object.keys(defs).each(function(eaFunctionName) {
				if (obj.hasOwnProperty(eaFunctionName)) {
					if (obj[eaFunctionName] instanceof Function) {
						cop.makeFunctionLayerAware(obj, eaFunctionName);
					} else {
						// to be tested...
						// cop.makePropertyLayerAware(eaClass.prototype, m1)
					}
				};
			});
		});
	},

	/* Layer Activation */
	withLayers: function withLayers(layers, func) {
		cop.LayerStack.push({withLayers: layers});
		// console.log("callee: " + cop.withLayers.caller)
		try {
			func();
		} finally {
			cop.LayerStack.pop();
		}
	},

	withoutLayers: function withoutLayers(layers, func) {
		cop.LayerStack.push({withoutLayers: layers});
		try {
			func();
		} finally {
			cop.LayerStack.pop();
		}
	},


	/* Global Layer Activation */
	enableLayer: function(layer) {
		if (cop.GlobalLayers.include(layer))
			return;
		else {
			cop.GlobalLayers.push(layer);
			cop.invalidateLayerComposition();
		};
	},

	disableLayer: function(layer) {
		if (!cop.GlobalLayers.include(layer))
			return;
		else {
			cop.GlobalLayers = cop.GlobalLayers.reject(function(ea) { return ea == layer;});
			cop.invalidateLayerComposition();
		}
	},

	proceed: function(/* arguments */) {
		// COP Proceed Function
		var composition = cop.effectiveLayerCompositionStack.last();
		if (!composition) {
			console.log('ContextJS: no composition to proceed (stack is empty) ')
			return
		};
		
		// TODO use index instead of shifiting?
		if (composition.partialMethodIndex == undefined)
			composition.partialMethodIndex = composition.partialMethods.length - 1;
		
		var index = composition.partialMethodIndex;
		var partialMethod = composition.partialMethods[index];		
		if (!partialMethod) {
			if (!partialMethod) throw new COPError('no partialMethod to proceed')
		} else {
			try {
				composition.partialMethodIndex  = index - 1;
				if (!Config.ignoredepricatedProceed && partialMethod.toString().match(/^[\t ]*function ?\(\$?proceed/)) {	
					var args = $A(arguments);
					args.unshift(cop.proceed);
					var msg = "proceed in arguments list in " + composition.functionName
					if (Config.throwErrorOnDepricated) throw new Error("DEPRICATED ERROR: " + msg);
					if (Config.logDepricated) {
						// console.log("source: " + partialMethod.toString())
						console.log("DEPRICATED WARNING: " + msg);
					}
					var result = partialMethod.apply(composition.object, args);
				} else {
					var result = partialMethod.apply(composition.object, arguments);
				}

			} finally {
				composition.partialMethodIndex = index	
			}
			return result
		}
	}
})


// Mark old ContextJS API as Depricated
var markNamespaceEntryAsDepricated = function(newNamespace, newName, oldNamespace, oldName) {
	oldNamespace[oldName] = newNamespace[newName].wrap(function(proceed) {
		if (Config.throwErrorOnDepricated) throw new Error("DEPRICATED ERROR: " + oldName + " is depricated");
		if (Config.logDepricated) console.log("DEPRICATED WARNING: " + oldName + " is depricated");	
		var args = $A(arguments);
		args.shift();
		return proceed.apply(this, args);
	});
};

markNamespaceEntryAsDepricated(cop, "enableLayer", Global,  "enableLayer");
markNamespaceEntryAsDepricated(cop, "disableLayer", Global,  "disableLayer");
markNamespaceEntryAsDepricated(cop, "withLayers", Global,  "withLayers");
markNamespaceEntryAsDepricated(cop, "withoutLayers", Global,  "withoutLayers");
markNamespaceEntryAsDepricated(cop, "createLayer", Global,  "createLayer");
markNamespaceEntryAsDepricated(cop, "layerObject", Global,  "layerObject");
markNamespaceEntryAsDepricated(cop, "layerClass", Global,  "layerClass");
markNamespaceEntryAsDepricated(cop, "layerClassAndSubclasses", Global,  "layerClassAndSubclasses");

// Class Definitions

// TODO How to make this independend from the Lively Kernel class system?
Object.subclass("Layer", {
	
	initialize: function(name) {
		this.name = name;
	},
	
	getName: function() {
		return this.name;
	},
	
	toString: function() {
		return this.name;
	},	
	
	toLiteral: function() {
		if (!this.name)
			console.warn("Layer: Can not serialize without a name!");
		return {
			name: this.name
		};
	},
	
	layerClass: function(classObj, methods) {
		cop.layerClass(this, classObj, methods);
		return this;
	},
	
	layerObject: function(obj, methods) {
		cop.layerObject(this, obj, methods);
		return this;
	},
	
	beGlobal: function() {
		cop.enableLayer(this);
		return this;
	},

	beNotGlobal: function() {
		cop.disableLayer(this);
		return this;
	},
	
	refineClass: function(classObj, methods) {
		cop.layerClass(this, classObj, methods);
		return this
	},

	refineObject: function(obj, methods) {
		cop.layerObject(this, obj, methods);
		return this
	}
	
});

// Lively Kernel Literal Serialization
Object.extend(Layer, {
	fromLiteral: function(literal) {
		// console.log("Deserializing Layer Activation from: " + literal.name)
		return cop.create(literal.name, false);
	}
});

/* Example implementation of a layerable object */
Object.extend(Global, {LayerableObjectTrait: {}});
Object.extend(LayerableObjectTrait, {
	activeLayers: function() {
		var result = {withLayers: [], withoutLayers: []};	
		result = this.dynamicLayers(result);
		result = this.structuralLayers(result)
		result = this.globalLayers(result)
		return result.withLayers
	},	

	collectWithLayersIn: function(layers, result) {
		for(var i=0; i < layers.length; i++) {
			var ea = layers[i]
			if ((result.withLayers.indexOf(ea) === -1) && (result.withoutLayers.indexOf(ea) === -1)) {
				result.withLayers.unshift(ea)
			}
		};
	},

	collectWithoutLayersIn: function(layers, result) {
		for(var i=0; i < layers.length; i++) {
			var ea = layers[i]
			if ((result.withoutLayers.indexOf(ea) === -1)) {
				result.withoutLayers.push(ea)
			}
		};
	},

	dynamicLayers: function(result) {
		// optimized version, that does not use closures and recursion
		var stack = cop.LayerStack;
		// top down, ignore bottom element
		for (var j = stack.length - 1; j > 0; j--) { 
			var current = stack[j];
			if (current.withLayers) {
				this.collectWithLayersIn(current.withLayers, result);
			};
			if (current.withoutLayers) {
				this.collectWithoutLayersIn(current.withoutLayers, result);
			}
		}
		return result
	},

	structuralLayers: function(result) {
		var allLayers =  result.withLayers;
		var allWithoutLayers = result.withoutLayers;
		var obj = this;

		// go ownerchain backward and gather all layer activations and deactivations
		while(obj) {		
			// don't use accessor methods because of speed... (not measured yet)
			if (obj.withLayers) {
				this.collectWithLayersIn(obj.withLayers, result);
			};
			if (obj.withoutLayers) {
				this.collectWithoutLayersIn(obj.withoutLayers, result);
			};
			// recurse, stop if owner is undefined
			obj = obj.owner
		}
		return result;
	},

	globalLayers: function(result) {
		this.collectWithLayersIn(cop.GlobalLayers, result);
		return result
	},	

	setWithLayers: function(layers) {
		this.withLayers = layers;
	},

	addWithLayer: function(layer) {
		var layers = this.getWithLayers(); 
		if (layers.include(layer))
			return;
		layers.push(layer);
		this.setWithLayers(layers)
	},

	removeWithLayer: function(layer) {
		var layers = this.getWithLayers(); 
		if (!layers.include(layer))
			return;
		this.setWithLayers(layers.reject(function(ea) {return ea === layer}))
	},

	setWithoutLayers: function(layers) {
		this.withoutLayers = layers;
	},
	
	getWithLayers: function(layers) {
		if (this.withLayers) {
			return this.withLayers;
		};
		return [];
	},

	getWithoutLayers: function(layers) {
		if (this.withoutLayers) {
			return this.withoutLayers;
		};
		return [];
	},	
});

Object.subclass("LayerableObject", LayerableObjectTrait);

Object.subclass('COPError', {
	initialize: function(msg) {
		this.msg = msg
	},

	toString: function() {
		return "COP Error: " + this.msg
	}

});

Object.subclass("cop.PartialLayerComposition", {
	initialize: function(obj,  prototypeObject, functionName, baseFunction, methodType) {
		this.partialMethods = [baseFunction];
		var layers = cop.computeLayersFor(obj);
		for(var i=0; i< layers.length; i++) {
			var layer = layers[i];
			var partialMethod = cop.lookupLayeredFunctionForObject(obj, layer, functionName, methodType);
			if (partialMethod)
				this.partialMethods.push(partialMethod);
		};
		this.object = obj;
		this.prototypeObject = prototypeObject;
		this.functionName = functionName;
	}
})

// DEPRICATED Syntactic Sugar: Layer in Class

/*
 * extend the subclassing behavior of Lively Kernel to allow fo Layer-In-Class constructs  
 */	
Object.extend(Function.prototype, { 
	subclass: Object.subclass.wrap(function(proceed) {
		var args = $A(arguments);
		args.shift();
		var layeredMethods = [];
	
		for (var i=1; i < args.length; i++) {
			var methods = args[i];
			if (Object.isString(methods)) continue; // if it's a category
			Object.keys(methods).each(function(ea) {
				var m = ea.match(/([A-Za-z0-9]+)\$([A-Za-z0-9]*)/);
				if (m) {
					var getter = methods.__lookupGetter__(m[0]);
					var setter = methods.__lookupSetter__(m[0]);
					layeredMethods.push({layerName: m[1], methodName: m[2], methodBody: methods[ea], 
						getterMethod: getter, setterMethod: setter});
					delete methods[ea];
				};
			});
		};
		var klass =  proceed.apply(this, args);
		layeredMethods.each(function(ea){
			// log("layer property " + ea.methodName + " in " + ea.layerName);
			var layer = Global[ea.layerName];
			if (!layer) throw new Error("could not find layer: " + ea.layerName);
			if (ea.getterMethod || ea.setterMethod) {
				if (ea.getterMethod) {
					cop.layerGetterMethod(layer, klass.prototype, ea.methodName, ea.getterMethod);
				};
				if (ea.setterMethod) {
					cop.layerSetterMethod(layer, klass.prototype, ea.methodName, ea.setterMethod);
				};
				cop.makePropertyLayerAware(klass.prototype, ea.methodName);
			} else {
				// log("layer method " + ea.methodName + " in " + ea.layerName);
				cop.layerMethod(layer, klass.prototype, ea.methodName, ea.methodBody);
			}
		});
		return klass;
	})
});

cop.resetLayerStack();

});