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

module('cop.Flatten').requires('cop.Layers').toRun(function() {

Object.subclass('MethodManipulator',
'initializing', {
	initialize: function() {
		this.parameterRegex = /function\s*\(([^\)]*)\)/;
	},
},
'string manipulation', {
	
	removeSurroundingWhitespaces: function(str) {
		return Strings.removeSurroundingWhitespaces(str);
	},

	removeSpacesAfterFunctionKeyword: function(methodString) {
		return methodString.replace(/\s*(function)\s*(\(.*)/, '$1$2');
	},
},
'method accessing', {
	methodBody: function(methodString) {
		var result = methodString
		result = result.substring(result.indexOf('{') + 1, result.length);
		result = result.substring(0, result.lastIndexOf('}'));
		result = this.removeSurroundingWhitespaces(result);
		return result
	},

	parameterNames: function(methodString) {
		var regexResult = this.parameterRegex.exec(methodString);
		if (!regexResult || !regexResult[1]) return [];
		var parameterString = regexResult[1];
		if (parameterString.length == 0) return [];
		var parameters = parameterString.split(',').collect(function(str) {
			return this.removeSurroundingWhitespaces(str)
		}, this);
		return parameters;
	},

	firstParameter: function(methodString) {
		return this.parameterNames(methodString)[0] || null
	},
},
'method manipulation', {
	removeFirstParameter: function(methodString) {
		var params = this.parameterNames(methodString);
		params.shift(); // remove first
		return methodString.replace(this.parameterRegex, 'function(' + params.join(', ') + ')');
	},

	addFirstParameter: function(methodString, param) {
		var params = this.parameterNames(methodString);
		params.unshift(param); // remove first
		return methodString.replace(this.parameterRegex, 'function(' + params.join(', ') + ')');
	},

	inlineProceed: function(layerSrc, originalSrc, proceedVarName) {
		// if layerSrc has a proceed call then replace the call with originalSrc

		layerSrc = this.removeSpacesAfterFunctionKeyword(layerSrc);
		originalSrc = this.removeSpacesAfterFunctionKeyword(originalSrc);

		// remove proceed parameter
		if (this.firstParameter(layerSrc) == proceedVarName)
			layerSrc = this.removeFirstParameter(layerSrc);

		// super check
		var superVarName = '$super';
		var hasSuper = this.firstParameter(originalSrc) == superVarName;
		if (hasSuper) {
			originalSrc = this.removeFirstParameter(originalSrc);
			layerSrc = this.addFirstParameter(layerSrc, superVarName);
		}

		// remove trailing ,
		originalSrc = this.removeTrailingWhitespace(originalSrc);
		if (originalSrc.endsWith(',')) originalSrc = originalSrc.substring(0, originalSrc.length-1);

		// is there a procced call?
		if (!proceedVarName || !layerSrc.include(proceedVarName)) return layerSrc;

		// fix indentation (each line of original source but the first gets a tab
		var lines = originalSrc.split('\n');
		for (var i = 1; i< lines.length; i++) lines[i] = '\t' + lines[i];
		originalSrc = lines.join('\n');

		originalSrc = '(' + originalSrc + ')';
		proceedVarName = proceedVarName.replace('$', '\\$')
		// replace the calls with args, this means something like "cop.proceed(args)"
		layerSrc = layerSrc.replace(new RegExp(proceedVarName + '\\(([^\\)]+)\\)'), originalSrc + '.call(this, $1)');
		// replace the calls without args, this means something like "cop.proceed()"
		layerSrc = layerSrc.replace(new RegExp(proceedVarName + '\\(\s*\\)'), originalSrc + '.call(this)');
		// replace the proceeds that are not normally activated
		layerSrc = layerSrc.replace(proceedVarName, originalSrc);

		return layerSrc;
	},

});

Layer.addMethods({

	layerDefOfObject: function(object) {
		var result = this[object._layer_object_id];
		if (!result) return {};
			// throw new Error('Cannot access layer def for ' + object.type ? object.type : object + ' in ' + this);
		return result
	},

	layerDefOfProperty: function(object, name) {
		var layerDef = this.layerDefOfObject(object);
		var getter = layerDef.__lookupGetter__(name)
		if (getter) return getter.toString()
		return layerDef[name].toString();
	},

	namesOfLayeredMethods: function(obj) {
		var layerDef = this.layerDefOfObject(obj);
		return Functions.all(layerDef).reject(function(ea) { return Class.isClass(layerDef[ea]) });
	},
	
	namesOfLayeredProperties: function(obj) {
		var layerDef = this.layerDefOfObject(obj), result = [];
		for (var name in layerDef) {
			var value = layerDef[name];
			if (value === obj) continue; /*discard _layered_object*/
			if (Object.isFunction(value) && !obj.__lookupGetter__(name)) continue;
			result.push(name);
		}
		return result
	},

	generateMethodReplacement: function(object, methodName) {
		var methodManipulator = new MethodManipulator(),
			methodString = this.layerDefOfProperty(object, methodName);
		if (!methodString)
			throw new Error('method ' + object.type ? object.type : object +
				'>>' + methodName + ' not layered in ' + this);

		var originalMethodString = object[methodName].getOriginal().toString(),
			proceedName = 'cop.proceed';
		methodString = methodManipulator.inlineProceed(methodString, originalMethodString, proceedName);

		return Strings.format('%s: %s,', methodName, methodString);
	},
	
	generatePropertyReplacement: function(object, propName) {
		var def = this.layerDefOfProperty(object, propName);
		if (!def)
			throw new Error('property ' + object.type ? object.type : object + '>>' + propName + ' not layered in ' + this);
		if (def.startsWith('function')) def = def.replace(/^function/, 'get');
		if (!def.endsWith(',')) def += ',';
		return def
	},


	layeredObjects: function() {
		// retrieve all the defs objects stored inside me with counter numbers
		var result = [];
		for (var name in this) {
			var prop = this[name]
			if (prop._layered_object && !result.include(prop._layered_object))
				result.push(prop._layered_object)
		}
		return result;
	},

	flattened: function(blacklist) {
		blacklist = blacklist || [];
		var objects = this.layeredObjects();
		var objectDefs = [];
		for (var i = 0; i < objects.length; i++) {
			var object = objects[i];
			if (!this.objectName(object)) continue;
			var def = '\n\n';
			var props = this.namesOfLayeredProperties(object);
			props = props.reject(function(prop) {
				return blacklist.any(function(spec) { return spec.object == object && spec.name == prop });
			});
			def += props.collect(function(prop) { return '\t' + this.generatePropertyReplacement(object, prop) }, this). join('\n\n');
			if (props.length > 0) def += '\n\n';
			var methods = this.namesOfLayeredMethods(object);
			methods = methods.reject(function(method) {
				return blacklist.any(function(spec) { return spec.object == object && spec.name == method });
			});
			def += methods.collect(function(method) { return '\t' + this.generateMethodReplacement(object, method) }, this). join('\n\n');
			if (methods.length > 0) def += '\n\n';
			objectDefs.push(this.objectDef(object, def));
		}

		return objectDefs.join('\n\n')
	},
	
	writeFlattened: function(moduleName, blacklist, requirements) {
		blacklist = blacklist || [];
		var blacklistDescr = blacklist.collect(function(spec) {
			return '{object: ' + this.objectName(spec.object) + ', name: ' + spec.name + '}'
		}, this);
		require('lively.ide').toRun(function() {
			var flattened = this.flattened(blacklist);
			var note = Strings.format('/*\n * Generated file\n * %s\n * %s.writeFlattened(\'%s\', [%s], [%s])\n */',
				new Date(), this.name, moduleName, blacklistDescr.join(','), JSON.stringify(requirements));
			var src = Strings.format('%s\nmodule(\'%s\').requires(%s).toRun(function() {\n\n%s\n\n}); // end of module',
				note, moduleName, JSON.stringify(requirements), flattened);
			var w = new lively.ide.ModuleWrapper(moduleName, 'js');
			w.setSource(src);
		}.bind(this));
	},

	objectName: function(obj) {
		if (Class.isClass(obj))
			return obj.type;
		if (obj.namespaceIdentifier)
			obj.namespaceIdentifier;
		if (Class.isClass(obj.constructor))
			return obj.constructor.type + '.prototype';
		return null;
	},

	objectDef: function(obj, bodyString) {
		if (Class.isClass(obj))
			return 'Object.extend(' + obj.type + ', {' + bodyString + '});';
		if (obj.namespaceIdentifier)
			return 'Object.extend(' + obj.namespaceIdentifier + ', {' + bodyString + '});';
		if (Class.isClass(obj.constructor))
			return obj.constructor.type + '.addMethods({' + bodyString + '});';
		return null;
	},

});

}) // end of module