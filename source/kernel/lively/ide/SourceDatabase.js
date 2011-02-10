module('lively.ide.SourceDatabase').requires('lively.Tools'/*FIXME*/, 'lively.ide.FileParsing').toRun(function() {

// ===========================================================================
// Keeps track of parsed sources
// ===========================================================================
Object.subclass('lively.ide.ModuleWrapper',
'documentation', {
	documentation: 'Compatibility layer around normal modules for SourceCodeDatabase and other tools. Will probably merged with normal modules in the future.',
},
'settings', {
	forceUncached: true,
	doNotSerialize: ['_cachedSource'],
},
'initialization', {

	initialize: function(moduleName, type) {
		if (!moduleName || !type)
			throw new Error('Cannot create ModuleWrapper without moduleName or type!');
		if (!['js', 'ometa', 'lkml', 'st'].include(type))
			throw new Error('Unknown type ' + type + ' for ModuleWrapper ' + moduleName);
		this._moduleName = moduleName;
		this._type = type; // can be js, ometa, lkml, st
		this._ast = null;
		this._cachedSource = null;
	},

},
'accessing', {	
	type: function() { return this._type },
	ast: function() { return this._ast },
	moduleName: function() { return this._moduleName },
	fileURL: function() { return URL.codeBase.withFilename(this.fileName()) },
	fileName: function() {
		return this.moduleName().replace(/\./g, '/') + '.' + this.type();
	},
	
	getSourceUncached: function() {
		var webR = new WebResource(this.fileURL());
		if (this.forceUncached) webR.forceUncached();
		this._cachedSource = webR.getContent() || '';
		return this._cachedSource;
	},
	
	setCachedSource: function(source) { this._cachedSource = source },
	
	getSource: function() {
		return this._cachedSource ? this._cachedSource : this.getSourceUncached();
	},
	
	setSource: function(source, beSync) {
		this.setCachedSource(source);
		new WebResource(this.fileURL()).setContent(source);
	},

},
'parsing', {

	retrieveSourceAndParse: function(optSourceDB) {
		return this._ast = this.parse(this.getSource(), optSourceDB);
	},
	
	parse: function(source, optSourceDB) {
		if (source === undefined)
			throw dbgOn(new Error('ModuleWrapper ' + this.moduleName() + ' needs source to parse!'));
		var root;
		if (this.type() == 'js') {
			root = this.parseJs(source);
		} else if (this.type() == 'ometa') {
			root = this.parseOmeta(source);
		} else if (this.type() == 'lkml') {
			root = this.parseLkml(source);
		} else if (this.type() == 'st') {
			root = this.parseSt(source);
		} else { 
			throw dbgOn(new Error('Don\'t know how to parse ' + this.type + ' of ' + this.moduleName()))
		}
		root.flattened().forEach(function(ea) { ea.sourceControl = optSourceDB })
		return root;
	},

	parseJs: function(source) {
		var fileFragments = new JsParser().parseSource(source, {fileName: this.fileName()});
        var root;
        var firstRealFragment = fileFragments.detect(function(ea) { return ea.type !== 'comment' });
        if (firstRealFragment && firstRealFragment.type === 'moduleDef')
            root = firstRealFragment;
        else
            root = new lively.ide.FileFragment(
				this.fileName(), 'completeFileDef', 0, source ? source.length-1 : 0,
				this.fileName(), fileFragments, this);
        return root;
	},

	parseOmeta: function(source) {
		var fileFragments = new OMetaParser().parseSource(source, {fileName: this.fileName()});
		var root = new lively.ide.FileFragment(
			this.fileName(), 'ometaGrammar', 0, source.length-1, this.fileName(), fileFragments, this);
		return root;
	},

	parseLkml: function(source) {
		return ChangeSet.fromFile(this.fileName(), source);
	},
	
	parseSt: function(source) {
		if (!Global['SmalltalkParser']) return null;
		var ast = OMetaSupport.matchAllWithGrammar(SmalltalkParser, "smalltalkClasses", source, true);
		if (!ast) {
		  console.warn('Couldn\'t parse ' + this.fileName());
		  return null;
		}
		ast.setFileName(this.fileName());
		return ast;
	},
},
'removing', {
	
	remove: function() {
		new WebResource(this.fileURL()).del();
	},
	
});

Object.extend(lively.ide.ModuleWrapper, {
	
	forFile: function(fn) {
		var type = fn.substring(fn.lastIndexOf('.') + 1, fn.length);
		var moduleName = fn;
		moduleName = moduleName.substring(0, moduleName.lastIndexOf('.'));
		moduleName = moduleName.replace(/\//g, '.');
		return new lively.ide.ModuleWrapper(moduleName, type);
	},
	
});

SourceDatabase.subclass('AnotherSourceDatabase', {
    
	initialize: function($super) {
		this.editHistory = {};
		this.modules = {};
		this.registeredBrowsers = [];
	},

	ensureRealModuleName: function(moduleName) { // for migration to new module names
		if (moduleName.endsWith('.js'))
			throw dbgOn(new Error('Old module name usage: ' + moduleName));
	},

	rootFragmentForModule: function(fileName) {
		if (!Object.isString(fileName))
			throw dbgOn(new Error('Don\'t know what to do with ' + fileName));
		var moduleWrapper = this.findModuleWrapperForFileName(fileName);
		var root = moduleWrapper && moduleWrapper.ast();
		// if (!root)
		// 	throw dbgOn(new Error('Cannot find parsed source for ' + fileName));
		return root;
	},

	allModules: function() {
		return Object.values(this.modules)
			.select(function(ea) { return ea instanceof lively.ide.ModuleWrapper });
	},
	
	findModuleWrapperForFileName: function(fileName) {
		return this.allModules().detect(function(ea) { return ea.fileName() == fileName })
	},
	
	createModuleWrapperForFileName: function(fileName) {
		return lively.ide.ModuleWrapper.forFile(fileName);
	},
	
	addModule: function(fileName, source) {
		var moduleWrapper = this.findModuleWrapperForFileName(fileName);
		if (moduleWrapper) return moduleWrapper;
		var moduleWrapper = this.createModuleWrapperForFileName(fileName);
		if (source) moduleWrapper.setCachedSource(source);
		moduleWrapper.retrieveSourceAndParse(this);
		return this.modules[fileName] = moduleWrapper;
	},

	reparseModule: function(fileName, readAgain) {
		if (readAgain)
			delete this.modules[fileName];
		var moduleWrapper = this.findModuleWrapperForFileName(fileName)
		if (moduleWrapper) {
			moduleWrapper.retrieveSourceAndParse(this);
			return moduleWrapper;
		}
		return this.addModule(fileName);
	},

	parseCompleteFile: function(fileName, newFileString) {
		var moduleWrapper = this.findModuleWrapperForFileName(fileName)
		if (!moduleWrapper)
			throw dbgOn(new Error('Cannot parse for ' + fileName + ' because module is not in SourceControl'));
		var root = newFileString ?
			moduleWrapper.parse(newFileString, this) :
			moduleWrapper.retrieveSourceAndParse(this);
		return root;
	},
	
	putSourceCodeFor: function(fileFragment, newFileString) {
		this.putSourceCodeForFile(fileFragment.fileName, newFileString);
	},

	putSourceCodeForFile: function(fileName, content) {
		if (!fileName)
			throw dbgOn(new Error('No filename when tryinh to put source'));
		var moduleWrapper = this.findModuleWrapperForFileName(fileName) || this.createModuleWrapperForFileName(fileName);
		content = content.replace(/\r/gi, '\n');  // change all CRs to LFs
		console.log("Saving " + fileName + "...");
		moduleWrapper.setSource(content);
		console.log("... " + content.length + " bytes saved.");
	},
    
    getCachedText: function(fileName) { // Return full text of the named file
		var moduleWrapper = this.findModuleWrapperForFileName(fileName);
		if (!moduleWrapper)
			// throw dbgOn(new Error('Cannot retrieve source code for ' + fileName + ' because module is not in SourceControl'));
			return '';
		return moduleWrapper.getSource();
    },

	searchFor: function(str) {
		// search modules
		var roots = Object.values(lively.ide.SourceControl.modules).collect(function(ea) { return ea.ast() });
		var allFragments = roots.inject([], function(all, ea) { return all.concat(ea.flattened().uniq()) });

		// search local code	
		allFragments = allFragments.concat(ChangeSet.current().flattened());

		return allFragments.select(function(ea) {
			return ea.getSourceCodeWithoutSubElements().include(str)
		});

	},

	scanLKFiles: function($super, beSync) {
		var ms = new Date().getTime();
		this.interestingLKFileNames(URL.codeBase.withFilename('lively/')).each(function(fileName) {
			this.addModule(fileName, fileString);
		}, this);
		console.log('Altogether: ' + (new Date().getTime()-ms)/1000 + ' s');
	},
    
	allFiles: function() {
		if (!this._allFiles)
			this._allFiles = this.interestingLKFileNames(this.codeBaseURL).uniq();
		return this._allFiles;
	},

	// browser stuff
	registerBrowser: function(browser) {
		if (this.registeredBrowsers.include(browser)) return;
		this.registeredBrowsers.push(browser);
	},
	
	unregisterBrowser: function(browser) {
		this.registeredBrowsers = this.registeredBrowsers.without(browser);
	},
	
	updateBrowsers: function(changedBrowser, changedNode) {
		var msStart = new Date().getTime();
		this.registeredBrowsers.without(changedBrowser).forEach(function(ea) { ea.allChanged(true, changedNode) });
		console.log('updated ' + this.registeredBrowsers.length + ' browsers in ' + (new Date().getTime()-msStart)/1000 + 's')
	},
	
	update: function() {
		this._allFiles = null;
	},
	
	addFile: function(filename) {
		this._allFiles.push(filename);
	},
	
	removeFile: function(fileName) {
		var moduleWrapper = this.findModuleWrapperForFileName(fileName);
		if (!moduleWrapper) {
			console.log('Trying to remove ' + fileName + ' bot no module found?');
			return;
		}
		moduleWrapper.remove();
	},

	switchCodeBase: function(newCodeBaseURL) {
		this.codeBaseURL = new URL(newCodeBaseURL.withRelativePartsResolved());
		this._allFiles = new WebResource(newCodeBaseURL).getSubElements().subDocuments.collect(function(ea) { return ea.getName() });
	},
	
	prepareForMockModule: function(fileName, src) { // This is just used for testing!!!
		this.modules[fileName] = lively.ide.ModuleWrapper.forFile(fileName);
		this.modules[fileName].setCachedSource(src);
		this.putSourceCodeFor = function(fileFragment, newFileString) {
			this.modules[fileName].setCachedSource(newFileString)
		}.bind(this);
		var root = this.reparseModule(fileName).ast();
		root.flattened().forEach(function(ea) { ea.sourceControl = this }, this);
		return root
	},
});

AnotherSourceDatabase.addMethods({

	createSymbolList: function() {
		// is a list of names of classes, proto and static methods, objects, and functions defined
		// in all currently loaded namespaces
		
		var allClasses = Global.classes(true)
		allClasses.length
		var allClassNames = allClasses.collect(function(klass) { return klass.name /*local name*/ })

		var namespaces = [Global].concat(Global.subNamespaces(true))
		var namespaceNames = namespaces.pluck('namespaceIdentifier')

		// both proto and static
		var allMethodNames = allClasses
			.collect(function(klass) { return klass.localFunctionNames().concat(Functions.own(klass)) })
			.flatten()

		var functionAndObjectNames = namespaces
			.collect(function(ns) {
				var propNames = [];
				for (var name in ns) {
					var value = ns[name];
					if (!value || Class.isClass(value) || value.namespaceIdentifier) continue;
					propNames.push(name)
				}
				return propNames })
			.flatten();

		var symbolList = allClassNames.concat(namespaceNames).concat(allMethodNames).concat(functionAndObjectNames);

		return symbolList;
	},

});
 
Object.extend(lively.ide, {
	// see also lively.Tools.startSourceControl
	startSourceControl: function() {
	    if (lively.ide.SourceControl instanceof AnotherSourceDatabase)
			return lively.ide.SourceControl;
	    lively.ide.SourceControl = new AnotherSourceDatabase();
		return lively.ide.SourceControl;
	},
});

}) // end of module