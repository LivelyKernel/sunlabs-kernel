module('apps.CDBBrowser').requires('cop.Layers', 'lively.ide', 'apps.CDB').toRun(function() {

Object.subclass('CodeDBObjectWrapper', {

	documentation: 'Code object wrapper for the couchDB code repository',

	initialize: function(target, moduleName, className, methodName) {
		if (!target)
			throw new Error('Cannot create CodeDBObjectWrapper without a target!');
		this._moduleName = moduleName;
		this._className = className;
		this._methodName = methodName;
		this.target = target;
	},

	loadModulesFromDB: function() {
		return CodeDBSourceDatabase.prototype.loadModulesFromDB.apply(this.target, arguments);
	},

	loadModuleSource: function() {
		return CodeDBSourceDatabase.prototype.loadModuleSource.apply(this.target, arguments);
	},

	loadModuleObject: function() {
		return CodeDBSourceDatabase.prototype.loadModuleObject.apply(this.target, arguments);
	},

	loadClassesFromDB: function() {
		return CodeDBSourceDatabase.prototype.loadClassesFromDB.apply(this.target, arguments);
	},

	loadClassSource: function() {
		return CodeDBSourceDatabase.prototype.loadClassSource.apply(this.target, arguments);
	},

	loadClassObject: function() {
		return CodeDBSourceDatabase.prototype.loadClassObject.apply(this.target, arguments);
	},

	loadMethodsFromDB: function() {
		return CodeDBSourceDatabase.prototype.loadMethodsFromDB.apply(this.target, arguments);
	},

	loadMethodSource: function() {
		return CodeDBSourceDatabase.prototype.loadMethodSource.apply(this.target, arguments);
	},

	loadMethodObject: function() {
		return CodeDBSourceDatabase.prototype.loadMethodObject.apply(this.target, arguments);
	},

	getName: function() {
		if (this._methodName) {
			return '' + this._className + '.' + this._methodName + ' (' + this.target._db.databaseName + ')';
		}
		if (this._className) {
			return this._className + ' (' + this.target._db.databaseName + ')';
		}
		if (this._moduleName) {
			return this._moduleName + ' (' + this.target._db.databaseName + ')';
		}
		return '[NONAME]';
	},

});

SourceDatabase.subclass('CodeDBSourceDatabase', {

	initialize: function($super, dbName) {
		$super();
		this.registeredBrowsers = [];
		this._db = new CDB.Repository(dbName);
		this.startNewChangeSet();
	},

	startNewChangeSet: function() {
		this._changeSet = this._db.createChangeSet();
	},

	registerBrowser: function(browser) {
		if (this.registeredBrowsers.include(browser)) return;
		this.registeredBrowsers.push(browser);
	},

	unregisterBrowser: function(browser) {
		this.registeredBrowsers = this.registeredBrowsers.without(browser);
	},

	loadModulesFromDB: function(drafts) {
		drafts = drafts || false;
		var moduleNames = this._db.listCodeObjects(CDB.Module, drafts);
		return moduleNames;
	},

	loadModuleSource: function(moduleName, drafts) {
		return 'Blubb Module';
	},

	loadModuleObject: function(moduleName, drafts) {
		drafts = drafts || false;
		return this._db.getCodeObject(CDB.Module, moduleName, drafts);
	},

	loadClassesFromDB: function(moduleName, drafts) {
		drafts = drafts || false;
		var classNames = this._db.listCodeObjects(CDB.Klass, moduleName, drafts);
		return classNames;
	},

	loadClassSource: function(moduleName, className, drafts) {
		return 'Blubb Class';
	},

	loadClassObject: function(moduleName, className, drafts) {
		drafts = drafts || false;
		return this._db.getCodeObject(CDB.Klass, moduleName, className, drafts);
	},

	loadMethodsFromDB: function(moduleName, className, drafts) {
		drafts = drafts || false;
		var methodNames = this._db.listCodeObjects(CDB.Method, moduleName, className, drafts);
		return methodNames;
	},

	loadMethodSource: function(moduleName, className, methodName, drafts) {
		drafts = drafts || false;
		var codeObj = this._db.getCodeObject(CDB.Method, moduleName, className, methodName, drafts);
		return codeObj.source;
	},

	loadMethodObject: function(moduleName, className, methodName, drafts) {
		drafts = drafts || false;
		return this._db.getCodeObject(CDB.Method, moduleName, className, methodName, drafts);
	},

	getName: function() {
		return this.name;
	},

});

lively.ide.BrowserNode.subclass('CodeDBBaseNode', {

	initialize: function($super, target, browser, parent) {
		$super(target, browser, parent);
		this.allModules = [];
	},


	locationChanged: function() {
		var b = this.browser;
		try {
			this.allModules = this.target.loadModulesFromDB(b.showDrafts);
		} catch(e) {
			// can happen when browser in a serialized world that is moved tries to relativize a URL
			console.warn('Cannot get modules for code browser ' + e)
			this.allModules = [];
 		}
	},

	childNodes: function() {
		var nodes = [];
		var srcDb = this.target;
		var b = this.browser;
		if (this.allModules.length == 0) {
			console.log('Modules reloaded' + (b.showDrafts ? ' (DRAFT)' : ''));
			this.allModules = srcDb.loadModulesFromDB(b.showDrafts);
		}
		for (var i = 0; i < this.allModules.length; i++) {
			var mn = this.allModules[i];
			nodes.push(new CodeDBModuleNode(new CodeDBObjectWrapper(srcDb, mn), b, this, mn));
		};
		this._childNodes = nodes;
		return nodes;
	},

});

lively.ide.BrowserNode.subclass('CodeDBModuleNode', {

	initialize: function($super, target, browser, parent, moduleName) {
		$super(target, browser, parent);
		this.moduleName = moduleName;
		this.allClasses = [];
		this.codeObject = this.target.loadModuleObject(this.moduleName, this.browser.showDrafts);
	},

	asString: function(attributed) {
		attributed = attributed || false;
		var b = this.browser;

		var ret = this.moduleName;
		if (b.showDrafts && this.codeObject && this.codeObject.isDraft() && attributed) ret += " [DRAFT]";
		return ret;
	},

	asListItem: function($super) {
		var node = $super();
		node.string = this.asString(true);
		return node;
	},

	sourceString: function($super) {
		return $super();
	},

	childNodes: function() {
		var nodes = [];
		var srcDb = this.target;
		var b = this.browser;
		if (this.allClasses.length == 0) this.allClasses = srcDb.loadClassesFromDB(this.moduleName, b.showDrafts);
		for (var i = 0; i < this.allClasses.length; i++) {
			var cn = this.allClasses[i];
			nodes.push(new CodeDBClassNode(new CodeDBObjectWrapper(srcDb.target, this.moduleName, cn), b, this, cn));
		};
		this._childNodes = nodes;
		return nodes;
	},

});

lively.ide.BrowserNode.subclass('CodeDBClassNode', {

	initialize: function($super, target, browser, parent, className) {
		$super(target, browser, parent);
		this.className = className;
		this.allMethods = [];
		this.codeObject = this.target.loadClassObject(this.parent.moduleName, this.className, this.browser.showDrafts);
	},

	asString: function(attributed) {
		attributed = attributed || false;
		var b = this.browser;

		var ret = this.className;
		if (b.showDrafts && this.codeObject && this.codeObject.isDraft() && attributed) ret += " [DRAFT]";
		return ret;
	},

	asListItem: function($super) {
		var node = $super();
		node.string = this.asString(true);
		return node;
	},

	childNodes: function() {
		var nodes = [];
		var srcDb = this.target;
		var b = this.browser;
		if (this.allMethods.length == 0) this.allMethods = srcDb.loadMethodsFromDB(this.parent.moduleName, this.className, b.showDrafts);
		for (var i = 0; i < this.allMethods.length; i++) {
			var mn = this.allMethods[i];
			nodes.push(new CodeDBMethodNode(new CodeDBObjectWrapper(srcDb.target, this.parent.moduleName, this.className, mn), b, this, mn));
		};
		this._childNodes = nodes;
		return nodes;
	},

});

lively.ide.BrowserNode.subclass('CodeDBMethodNode', {

	initialize: function($super, target, browser, parent, methodName) {
		$super(target, browser, parent);
		this.methodName = methodName;
		this.allMethods = [];
		this.codeObject = this.target.loadMethodObject(this.parent.parent.moduleName, this.parent.className, this.methodName, this.browser.showDrafts);
	},

	asString: function(attributed) {
		attributed = attributed || false;
		var b = this.browser;

		var ret = this.methodName;
		if (b.showDrafts && this.codeObject && this.codeObject.isDraft() && attributed) ret += " [DRAFT]";
		return ret;
	},

	asListItem: function($super) {
		var node = $super();
		node.string = this.asString(true);
		return node;
	},

	sourceString: function() {
		var srcDb = this.target;
		var b = this.browser;

		return srcDb.loadMethodSource(this.parent.parent.moduleName, this.parent.className, this.methodName, b.showDrafts);
	},

	saveSource: function(newSource) {
		var changeSet = this.browser.mySourceControl()._changeSet;

		if (!changeSet) {
			throw 'Browser has no change set!';
		} else {
			if (!changeSet.includes(this.codeObject)) {
				changeSet.add(this.codeObject);
			}
			this.codeObject.source = newSource;
			this.codeObject.save();
		}
		return true;
	},

	evalSource: function(newSource) {
		if (!this.browser.evaluate)
			return false;

		var ownerName = this.parent.className; // || this.target.findOwnerFragment().name;
		if (!Class.forName(ownerName)) {
			console.log('Didn\'t found class/object');
			return false;
		}
		var methodName = this.methodName;
		var methodString = newSource; // this.target.getSourceCode();

		var def;
//		var layerCommand = this.target.isStatic() ? 'layerObject' : 'layerClass';
//		if (this.target.layerName) {
//			def = Strings.format('%s(%s, %s, {\n\t%s})',
//				layerCommand, this.target.layerName, this.target.className, this.target.getSourceCode());
//			console.log('Going to eval ' + def);
//		}
//		if (this.target.isStatic()) {
//			def = 'Object.extend(' + ownerName + ', {\n' + methodString +'\n});';
//		} else {
			def = Strings.format('%s.addMethods({\n\t%s: %s\n});', ownerName, methodName, methodString);
//		}

		try {
			eval(def);
		} catch (er) {
			console.log("error evaluating method " + methodString + ': ' + er);
			throw(er)
		}
		console.log('Successfully evaluated #' + methodName);
		return true;
	},

});

lively.ide.BrowserCommand.subclass('CodeDBCommitCommand', {

	wantsButton: Functions.True,

	isActive: Functions.True,

	asString: function() {
		return 'Commit changes';
	},

	trigger: function() {
		var browser = this.browser;
		var world = WorldMorph.current();
		var changeSet = browser.mySourceControl()._changeSet;
		var node = browser.selectedNode();

		if (!changeSet) {
			world.setStatusMessage('Browser has no change set -- cannot save!', Color.red, 5);
		} else {
			var commit = function(msg) {
				changeSet.message = msg;
				try {
					changeSet.commit();
				} catch(e) {
					world.setStatusMessage('Could not commit changes:\n' + e.message, Color.red, 5);
					return;
				}
				browser.mySourceControl().startNewChangeSet();
				browser.rootNode().locationChanged();
				browser.allChanged();
				world.setStatusMessage('Successfully commited all changes.', Color.green, 5);
			};
			world.prompt('Enter commit message', function(msg) {
				commit(msg);
			}, 'no message');
		}
	},

});

lively.ide.BasicBrowser.subclass('CodeDBRepositoryBrowser', {

	documentation: 'Browser for the couchDB code repository',
	viewTitle: "CodeRepositoryBrowser",
	allPaneNames: ['Pane1', 'Pane2', 'Pane3'],

	panelSpec: [
		['locationPane', newTextPane, new Rectangle(0, 0, 0.9, 0.05)],
		['codeBaseDirBtn', function(bnds) { return new ButtonMorph(bnds) }, new Rectangle(0.9, 0, 0.1, 0.05)],
		['Pane1', newDragnDropListPane, new Rectangle(0, 0.05, 0.3, 0.35)],
		['Pane2', newDragnDropListPane, new Rectangle(0.3, 0.05, 0.35, 0.35)],
		['Pane3', newDragnDropListPane, new Rectangle(0.65, 0.05, 0.35, 0.35)],
		['midResizer', function(b) { return new HorizontalDivider(b) }, new Rectangle(0, 0.44, 1, 0.01)],
		['metaPane', newTextPane, new Rectangle(0, 0.45, 1, 0.05)],
		['mid2Resizer', function(b) { return new HorizontalDivider(b) }, new Rectangle(0, 0.50, 1, 0.01)],
		['sourcePane', newTextPane, new Rectangle(0, 0.51, 1, 0.43)],
		['bottomResizer', function(b) { return new HorizontalDivider(b) }, new Rectangle(0, 0.94, 1, 0.01)],
		['commentPane', newTextPane, new Rectangle(0, 0.95, 1, 0.05)]
	],

	initialize: function($super, optWorldProxy) {
		$super();
//		this.panel['metaPane'].innerMorph().beLabel();
		this.worldProxy = optWorldProxy;
		this.evaluate = true;
		this.showDrafts = true;
		this.targetURL = 'code_db';
	},

	setupLocationInput: function($super) {
		$super();

		connect(this, 'targetURL', this.locationInput(), 'setTextString',
						{converter: function(value) { return value.toString() }});
		connect(this.locationInput(), 'savedTextString', this, 'setTargetURL');
		this.targetURL = this.targetURL // hrmpf

		this.panel.codeBaseDirBtn.setLabel('select');
//		connect(this.panel.codeBaseDirBtn, 'fire', this, 'setTargetURL',
//			{converter: function() { return this.locationInput(); }});
	},

	getTargetURL: function() {
		return this.targetURL;
	},

	setTargetURL: function(url, force) {
		force = force || false;
		this.ensureSourceNotAccidentlyDeleted(function() {
			var prevURL = this.targetURL;
			try {
				this.checkDB(url, force);
				this.targetURL = url;
				this._rootNode = null;
				this.rootNode().locationChanged();
				this.allChanged();
			} catch(e) {
				console.log('couldn\'t set new URL ' + url + ' because ' + e);
				this.targetURL = prevURL;
				this.locationInput().setTextString(prevURL.toString());
				return;
			}
			this.panel.targetURL = url; // FIXME for persistence
			console.log('new url: ' + url);
		});
	},

	checkDB: function(db, force) {
		var rep = new CDB.Repository(db);

		var info = rep.db.info();
		if (info.error) {
			if (!force) {
				this.confirm('The CouchDB "' + db + '" does not yet exist. Do you want to create it?',
					function(answer) {
						if (answer) {
							rep.create();
							rep.initializeDesign();
							this.setTargetURL(db, true);
						}
					});
				throw Error('DB does not exist.');
			}
			rep.create();
		}
		if (!rep.isInitialized()) {
			if (!force) {
				this.confirm('The CouchDB "' + db + '" is not initialized. Do you want to livelyfy it?',
					function(answer) {
						if (answer) {
							rep.initializeDesign();
							this.setTargetURL(db, true);
						}
					});
				throw Error('DB is not initialized / livelyfied.');
			}
			rep.initializeDesign();
		}
		// TODO: check for the right version!
		console.log('' + db + ' is ok!');
	},

	rootNode: function() {
		if (!this._rootNode) {
			this._rootNode = new CodeDBBaseNode(new CodeDBSourceDatabase(this.targetURL), this, null);
		}
		return this._rootNode;
	},

	mySourceControl: function() {
		var ctrl = this.rootNode().target;
		if (!ctrl) throw new Error('Browser has no SourceControl!');
		return ctrl;
	},

	commands: function() {
		return [CodeDBNewModuleCommand,
			CodeDBCommitCommand,
			CodeDBDraftCommand,
			CodeDBModuleMenuCommand,
			CodeDBClassMenuCommand,
			CodeDBMethodMenuCommand,
			lively.ide.EvaluateCommand];
/*		[lively.ide.BrowseWorldCommand,
		lively.ide.RefreshCommand,
		lively.ide.EvaluateCommand,
		lively.ide.SortCommand,
		lively.ide.ChangeSetMenuCommand,
		lively.ide.ClassChangeMenuCommand] */
	},

	signalNewSource: function($super, changedNode) {
//		this.mySourceControl().updateBrowsers(this, changedNode);
	},

});

lively.ide.BrowserCommand.subclass('CodeDBModuleMenuCommand', {

	wantsMenu: Functions.True,

	isActive: function(pane) {
		return this.browser.selectionInPane('Pane1') instanceof CodeDBModuleNode && (pane == 'Pane1');
	},

	trigger: function() {
		var cmd = this;
		return [
			['add class', cmd.addClass.bind(this)],
			['remove module', cmd.removeModule.bind(this)],
			['add to change set', cmd.addToChangeSet.bind(this)]];
	},

	addToChangeSet: function() {
		var browser = this.browser;
		var world = WorldMorph.current();
		var changeSet = browser.mySourceControl()._changeSet;
		var node = browser.selectionInPane('Pane1');

		if (!changeSet) {
			world.setStatusMessage('Browser has no change set -- cannot add module!', Color.red, 5);
		} else {
			var mod = node.codeObject;

			if (!changeSet.includes(mod)) {
				changeSet.add(mod);
			}

			node.statusMessage('Successfully added ' + node.moduleName + ' to change set!', Color.green, 5);
		}
	},

	addClass: function() {
		var browser = this.browser;
		var world = WorldMorph.current();
		var changeSet = browser.mySourceControl()._changeSet;
		var node = browser.selectionInPane('Pane1');

		if (!changeSet) {
			world.setStatusMessage('Browser has no change set -- cannot create class!', Color.red, 5);
		} else {
			var createChange = function(changeSet, className, superClassName) {
				try {
					var cls = new CDB.Klass(className);
					cls.documentation = '';
					cls.superclass = superClassName

					var mod = node.codeObject;
					mod.addClass(cls);

					changeSet.add(cls);
					cls.save();

					if (!changeSet.includes(mod)) {
						changeSet.add(mod);
					}
					mod.save();

					if (browser.evaluate) {
						try {
							var change = ClassChange.create(className, superClassName);
							change.evaluate();
						} catch (e) {
							if (change) change.remove();
							node.statusMessage("Eval disabled for " + className + ".\n" + e.message, Color.black, 5);
						}
					}
					browser.allChanged();
				} catch(e) {
					world.alert('Error when creating class:\n' + e.message);
				}
			}
			world.prompt('Enter class name', function(n1) {
				world.prompt('Enter super class name', function(n2) {
					createChange(changeSet, n1, n2);
				}, 'Object')
			});
		}
	},

	removeModule: function() {
		var browser = this.browser;
		var world = WorldMorph.current();
		var changeSet = browser.mySourceControl()._changeSet;
		var node = browser.selectionInPane('Pane1');

		if (!changeSet) {
			world.setStatusMessage('Browser has no change set -- cannot remove module!', Color.red, 5);
		} else {
			try {
				var mod = node.codeObject;

				if (!changeSet.includes(mod)) {
					changeSet.add(mod);
				}

				var classes = mod.getClasses();
				classes.each(function(cls) {
					if (!changeSet.includes(cls)) {
						changeSet.add(cls);
					}

					var methods = cls.getMethods();
					methods.each(function(meth) {
						if (!changeSet.includes(meth)) {
							changeSet.add(meth);
						}
						meth.deleteFromRepository();
						meth.save();
					});

					cls.deleteFromRepository();
					cls.save();
				});

				mod.deleteFromRepository();
				mod.save();

//				if (browser.evaluate) change.evaluate();
				browser.allChanged();
			} catch(e) {
				world.alert('Error while removing module:\n' + e.message);
			}
		}
	},
});

lively.ide.BrowserCommand.subclass('CodeDBClassMenuCommand', {

	wantsMenu: Functions.True,

	isActive: function(pane) {
		return this.browser.selectionInPane('Pane2') instanceof CodeDBClassNode && (pane == 'Pane2');
	},

	trigger: function() {
		var cmd = this;
		return [
			['add method', cmd.addMethod.bind(this)],
			['remove class', cmd.removeClass.bind(this)],
			['add to change set', cmd.addToChangeSet.bind(this)]];
	},

	addToChangeSet: function() {
		var browser = this.browser;
		var world = WorldMorph.current();
		var changeSet = browser.mySourceControl()._changeSet;
		var node = browser.selectionInPane('Pane2');

		if (!changeSet) {
			world.setStatusMessage('Browser has no change set -- cannot add class!', Color.red, 5);
		} else {
			var cls = node.codeObject;
			var mod = node.parent.codeObject;

			if (!changeSet.includes(mod)) {
				changeSet.add(mod);
			}

			if (!changeSet.includes(cls)) {
				changeSet.add(cls);
			}

			node.statusMessage('Successfully added ' + node.className + ' to change set!', Color.green, 5);
		}
	},

	addMethod: function() {
		var browser = this.browser;
		var world = WorldMorph.current();
		var changeSet = browser.mySourceControl()._changeSet;
		var node = browser.selectionInPane('Pane2');

		if (!changeSet) {
			world.setStatusMessage('Browser has no change set -- cannot create method!', Color.red, 5);
		} else {
			var createChange = function(changeSet, methodName, source) {
				try {
					var meth = new CDB.Method(methodName);
					meth.documentation = '';
					meth.source = source;

					var cls = node.codeObject;
					cls.addMethod(meth);

					var mod = node.parent.codeObject;

					if (!changeSet.includes(mod)) {
						changeSet.add(mod);
					}
					mod.save();

					if (!changeSet.includes(cls)) {
						changeSet.add(cls);
					}
					cls.save();

					changeSet.add(meth);
					meth.save();

					if (browser.evaluate) {
						var className = cls.name;
						try {
							var change = ProtoChange.create(methodName, source, className);
							change.evaluate();
						} catch (e) {
							if (change) change.remove();
							node.statusMessage("Eval disabled for " + className + "." + methodName + ".\n" + e.message, Color.black, 5);
						}
					}

					browser.allChanged();
				} catch(e) {
					world.alert('Error when creating class:\n' + e.message);
				}
			}
			world.prompt('Enter method name', function(n1) {
				world.prompt('Enter source code', function(src) {
					createChange(changeSet, n1, src);
				}, 'function(arg1) {\n\tconsole.log(arg1);\n}')
			});
		}
	},

	removeClass: function() {
		var browser = this.browser;
		var world = WorldMorph.current();
		var changeSet = browser.mySourceControl()._changeSet;
		var node = browser.selectionInPane('Pane2');

		if (!changeSet) {
			world.setStatusMessage('Browser has no change set -- cannot remove class!', Color.red, 5);
		} else {
			try {
				var cls = node.codeObject;
				var mod = node.parent.codeObject;

				if (!changeSet.includes(mod)) {
					changeSet.add(mod);
				}

				if (!changeSet.includes(cls)) {
					changeSet.add(cls);
				}

				var methods = cls.getMethods();
				methods.each(function(meth) {
					if (!changeSet.includes(meth)) {
						changeSet.add(meth);
					}
					meth.deleteFromRepository();
					meth.save();
				});

				cls.deleteFromRepository();

				cls.save();
				mod.save();

//				if (browser.evaluate) change.evaluate();
				browser.allChanged();
			} catch(e) {
				world.alert('Error while removing class:\n' + e.message);
			}
		}
	},

});

lively.ide.BrowserCommand.subclass('CodeDBMethodMenuCommand', {

	wantsMenu: Functions.True,

	isActive: function(pane) {
		return this.browser.selectionInPane('Pane3') instanceof CodeDBMethodNode && (pane == 'Pane3');
	},

	trigger: function() {
		var cmd = this;
		return [
			['remove method', cmd.removeMethod.bind(this)],
			['add to change set', cmd.addToChangeSet.bind(this)]];
	},

	addToChangeSet: function() {
		var browser = this.browser;
		var world = WorldMorph.current();
		var changeSet = browser.mySourceControl()._changeSet;
		var node = browser.selectionInPane('Pane3');

		if (!changeSet) {
			world.setStatusMessage('Browser has no change set -- cannot add method!', Color.red, 5);
		} else {
			var meth = node.codeObject;
			var cls = node.parent.codeObject;
			var mod = node.parent.parent.codeObject;

			if (!changeSet.includes(mod)) {
				changeSet.add(mod);
			}

			if (!changeSet.includes(cls)) {
				changeSet.add(cls);
			}

			if (!changeSet.includes(meth)) {
				changeSet.add(meth);
			}

			node.statusMessage('Successfully added ' + node.methodName + ' to change set!', Color.green, 5);
		}
	},

	removeMethod: function() {
		var browser = this.browser;
		var world = WorldMorph.current();
		var changeSet = browser.mySourceControl()._changeSet;
		var node = browser.selectionInPane('Pane3');

		if (!changeSet) {
			world.setStatusMessage('Browser has no change set -- cannot remove method!', Color.red, 5);
		} else {
			try {
				var meth = node.codeObject;
				var cls = node.parent.codeObject;
				var mod = node.parent.parent.codeObject;

				if (!changeSet.includes(mod)) {
					changeSet.add(mod);
				}

				if (!changeSet.includes(cls)) {
					changeSet.add(cls);
				}

				if (!changeSet.includes(meth)) {
					changeSet.add(meth);
				}

				meth.deleteFromRepository();

				meth.save();
				cls.save();
				mod.save();

//				if (browser.evaluate) change.evaluate();
				browser.allChanged();
			} catch(e) {
				world.alert('Error while removing method:\n' + e.message);
			}
		}
	},

});

lively.ide.BrowserCommand.subclass('CodeDBDraftCommand', {

	isActive: Functions.True,

	wantsButton: Functions.True,

	asString: function() {
		if (this.browser.showDrafts) return 'Draft on';
		return 'Draft off'
	},

	trigger: function() {
		this.browser.showDrafts = !this.browser.showDrafts;
		this.browser.rootNode().locationChanged();
		this.browser.allChanged();
	}

});

lively.ide.BrowserCommand.subclass('CodeDBNewModuleCommand', {

	isActive: Functions.True,

	wantsButton: Functions.True,

	asString: function() { return 'Add module' },

	trigger: function() {
		var browser = this.browser;
		var world = WorldMorph.current();
		var changeSet = browser.mySourceControl()._changeSet;

		if (!changeSet) {
			world.setStatusMessage('Browser has no change set -- cannot create module!', Color.red, 5);
		} else {
			var createChange = function(changeSet, moduleName) {
				try {
					var mod = new CDB.Module(moduleName);
					mod.documentation = '';
					changeSet.add(mod);
					mod.save();

					browser.rootNode().locationChanged();
					browser.allChanged();
				} catch(e) {
					world.alert('Error when creating module:\n' + e.message);
				}
			}

			world.prompt('Enter module name', function(n1) {
				createChange(changeSet, n1);
			});
		}
	},
	
});
cop.create('CDBBrowserLayer')
	.beGlobal()
	.refineClass(WorldMorph, {
		toolSubMenuItems: function(proceed, evt) {
			var menu = proceed(evt);
			menu.push(["CodeDB repository browser", function(evt) {
				var cdb = new CodeDBRepositoryBrowser();
				cdb.openIn(WorldMorph.current());
			}]);
			return menu;
		}
});

}) // end of module
