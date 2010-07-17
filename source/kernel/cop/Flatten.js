module('cop.Flatten').requires('cop.Layers').toRun(function() {

Object.subclass('MethodManipulator', {

	initialize: function() {
		this.parameterRegex = /function\s*\(([^\)]*)\)/;
	},

	removeTrailingWhitespace: function(string) {
		while (string.length > 0 && /\s|\n|\r/.test(string[string.length - 1]))
			string = string.substring(0, string.length - 1);
		return string;
	},

	removeLeadingWhitespace: function(string) {
		return string.replace(/^[\n\s]*(.*)/, '$1');
	},
removeSurroundingWhitespaces: function(str) {
	return this.removeLeadingWhitespace(this.removeTrailingWhitespace(str));
},


	removeSpacesAfterFunctionKeyword: function(methodString) {
		return methodString.replace(/\s*(function)\s*(\(.*)/, '$1$2');
	},

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
		// replace the calls with args, this means something like "$proceed(args)"
		layerSrc = layerSrc.replace(new RegExp(proceedVarName + '\\(([^\\)]+)\\)'), originalSrc + '.call(this, $1)');
		// replace the calls without args, this means something like "$proceed()"
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
		var layerDef = this.layerDefOfObject(obj);
		return Properties.all(layerDef).reject(function(ea) { return layerDef[ea] == obj /*discard _layered_object*/});
	},

	generateMethodReplacement: function(object, methodName) {
		var methodManipulator = new MethodManipulator();
		var methodString = this.layerDefOfProperty(object, methodName);
		if (!methodString)
			throw new Error('method ' + object.type ? object.type : object + '>>' + methodName + ' not layered in ' + this);
		var originalMethodString = object[methodName].getOriginal().toString();

		var proceedParameter = methodManipulator.firstParameter(methodString);
		methodString = methodManipulator.inlineProceed(methodString, originalMethodString, proceedParameter);

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

	flattened: function() {
		var objects = this.layeredObjects();
		var objectDefs = [];
		var createDefStart = function(obj) {
			if (Class.isClass(obj))
				return 'Object.extend(' + obj.type + ', {\n\n';
			if (obj.namespaceIdentifier)
				return 'Object.extend(' + obj.namespaceIdentifier + ', {\n\n';
			if (Class.isClass(obj.constructor))
				return obj.constructor.type + '.addMethods({\n\n';
			return null;
		}
		for (var i = 0; i < objects.length; i++) {
			var object = objects[i];
			var def = createDefStart(object);
			if (!def) continue;
			var props = this.namesOfLayeredProperties(object);
			def += props.collect(function(prop) { return '\t' + this.generatePropertyReplacement(object, prop) }, this). join('\n\n');
			if (props.length > 0) def += '\n\n';
			var methods = this.namesOfLayeredMethods(object);
			def += methods.collect(function(method) { return '\t' + this.generateMethodReplacement(object, method) }, this). join('\n\n');
			if (methods.length > 0) def += '\n\n';
			def += '});'
			objectDefs.push(def);
		}

		return objectDefs.join('\n\n')
	},
	
	writeFlattened: function(moduleName) {
		require('lively.ide').toRun(function() {
			var flattened = this.flattened();
			var note = Strings.format('/* This file was created with: %s.writeFlattened(\'%s\') */', this.name, moduleName);
			var src = Strings.format('%s\nmodule(\'%s\').requires().toRun(function() {\n\n%s\n\n}); // end of module',
				note, moduleName, flattened);
			var w = new lively.ide.ModuleWrapper(moduleName, 'js');
			w.setSource(src);
		}.bind(this));
	},

});

}) // end of module