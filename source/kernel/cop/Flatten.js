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

	removeSpacesAfterFunctionKeyword: function(methodString) {
		return methodString.replace(/\s*(function)\s*(\(.*)/, '$1$2');
	},

	methodBody: function(methodString) {
		var result = methodString
		result = result.substring(result.indexOf('{') + 1, result.length);
		result = result.substring(0, result.lastIndexOf('}'));
		result = this.removeLeadingWhitespace(this.removeTrailingWhitespace(result));
		return result
	},

	firstParameter: function(methodString) {
		var regexResult = this.parameterRegex.exec(methodString);
		if (!regexResult || !regexResult[1]) return null;
		var parameterString = regexResult[1];
		if (!parameterString || parameterString.length == 0) return null;

		// if there is just one parameter return it
		if (!parameterString.include(',')) return parameterString;

		// if there are more parameters take the first one
		return parameterString.substring(0, parameterString.indexOf(','));
	},

	removeFirstParameter: function(methodString) {
		// remove the first parameter if existing

		var regexResult = this.parameterRegex.exec(methodString);
		if (!regexResult || !regexResult[1]) return methodString
		var parameterString = regexResult[1];

		// if there is no or just one parameter then parameterString can be empty
		// if there are more parameters remove the first one
		if (parameterString.length > 0 && parameterString.include(','))
				parameterString = parameterString.substring(parameterString.indexOf(',') + 1, parameterString.length)
		else
				parameterString = '';

		// remove trailing spaces
		parameterString = parameterString.replace(/^\s*(.*)/, '$1');

		var result = methodString.replace(this.parameterRegex, 'function(' + parameterString + ')');
		return result;
	},

	inlineProceed: function(layerSrc, originalSrc, proceedVarName) {
		// if layerSrc has a proceed call then replace the call with originalSrc

		layerSrc = this.removeSpacesAfterFunctionKeyword(layerSrc);
		originalSrc = this.removeSpacesAfterFunctionKeyword(originalSrc);

		// super check
		var hasSuperCall = originalSrc.include('$super(');
		if (hasSuperCall)
			throw new Error('inlineProceed recognized super class in method to be inlined, cannot handle it yet');

		// remove proceed parameter
		if (this.firstParameter(layerSrc) == proceedVarName)
			layerSrc = this.removeFirstParameter(layerSrc);

		// remove trailing ,
		originalSrc = this.removeTrailingWhitespace(originalSrc);
		if (originalSrc.endsWith(',')) originalSrc = originalSrc.substring(0, originalSrc.length-1);

		// is there a procced call?
		if (!proceedVarName || !layerSrc.include(proceedVarName)) return layerSrc;

		// fix indentation (each line of original source but the first gets a tab
		var lines = originalSrc.split('\n');
		for (var i = 1; i< lines.length; i++) lines[i] = '\t' + lines[i];
		originalSrc = lines.join('\n');

		return layerSrc.replace(proceedVarName, '(' + originalSrc + ')');
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
		for (var i = 0; i < objects.length; i++) {
			var object = objects[i];
			var isMetaClass = Class.isClass(object);
			var isClass = !isMetaClass && Class.isClass(object.constructor);
			if (!isClass && !isMetaClass) continue; // currently we do not deal with arbitrary objects
			var def = isClass ? object.constructor.type + '.addMethods({\n\n' : 'Object.extend(' + object.type + ', {\n\n';
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
			var src = Strings.format('module(\'%s\').requires().toRun(function() {\n\n%s\n\n}); // end of module',
				moduleName, flattened);
			var w = new lively.ide.ModuleWrapper(moduleName, 'js');
			w.setSource(src);
		}.bind(this));
	},

});

}) // end of module