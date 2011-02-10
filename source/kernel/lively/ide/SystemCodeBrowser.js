module('lively.ide.SystemCodeBrowser').requires('lively.ide.BrowserFramework', 'lively.ide.SystemBrowserNodes', 'lively.ide.BrowserCommands', 'lively.ide.SourceDatabase').toRun(function() {

// ===========================================================================
// Browsing js files and OMeta
// ===========================================================================
lively.ide.BasicBrowser.subclass('lively.ide.SystemBrowser', {

	documentation: 'Browser for source code parsed from js files',
	viewTitle: "SystemBrowser",
	isSystemBrowser: true,

	initialize: function($super) {
		$super();
		this.installFilter(lively.ide.NodeTypeFilter.defaultInstance(), 'Pane1');
		this.evaluate = true;
		this.targetURL = null;
	},

	setupLocationInput: function($super) {
		$super();

		connect(this, 'targetURL', this.locationInput(), 'setTextString',
			{converter: function(value) { return value.toString() }});

		connect(this.locationInput(), 'savedTextString', this, 'setTargetURL',
			{converter: function(value) { return new URL(value) }});
		this.targetURL = this.targetURL // hrmpf

		this.panel.codeBaseDirBtn.setLabel('codebase');
		connect(this.panel.codeBaseDirBtn, 'fire', this, 'setTargetURL',
			{converter: function() { return URL.codeBase.withFilename('lively/')} })

		this.panel.localDirBtn.setLabel('local');
		connect(this.panel.localDirBtn, 'fire', this, 'setTargetURL',
			{converter: function() { return URL.source.getDirectory() }});
	},
	
	getTargetURL: function() {
		if (!this.targetURL) this.targetURL = this.sourceDatabase().codeBaseURL;
		return this.targetURL;
	},
	
	setTargetURL: function(url) {
		url = url.withRelativePartsResolved();
		this.selectNothing();
		this.ensureSourceNotAccidentlyDeleted(function() {
			var prevURL = this.targetURL;
			if (!url.toString().endsWith('/'))
				url = new URL(url.toString() + '/');
			try {
				this.targetURL = url;
				this.rootNode().locationChanged();
				this.allChanged();
			} catch(e) {
				console.log('couldn\'t set new URL ' + url + ' because ' + e);
				this.targetURL = prevURL;
				this.locationInput().setTextString(prevURL.toString());
				return
			}
			this.panel.targetURL = url; // FIXME for persistence
			console.log('new url: ' + url);
		});
	},
	
	rootNode: function() {
		var srcCtrl = lively.ide.startSourceControl();
		if (!this._rootNode)
			this._rootNode = new lively.ide.SourceControlNode(srcCtrl, this, null);
		return this._rootNode;
	},

	commands: function() {
		// lively.ide.BrowserCommand.allSubclasses().collect(function(ea) { return ea.type}).join(',\n')
		return [
			// lively.ide.BrowseWorldCommand,
			lively.ide.AddNewFileCommand,
			lively.ide.AllModulesLoadCommand,
			lively.ide.ShowLineNumbersCommand,
			lively.ide.RefreshCommand,
			lively.ide.EvaluateCommand,
			lively.ide.SortCommand,
			lively.ide.ViewSourceCommand,
			lively.ide.ClassHierarchyViewCommand,
			lively.ide.AddClassToFileFragmentCommand,
			lively.ide.AddObjectExtendToFileFragmentCommand,
			lively.ide.AddLayerToFileFragmentCommand,
			lively.ide.AddMethodToFileFragmentCommand,
			lively.ide.RunTestMethodCommand]
	},


	sourceDatabase: function() {
		return this.rootNode().target;
	},

});
 
Object.extend(lively.ide.SystemBrowser, {
	// lively.ide.SystemBrowser.browse('lively.Examples')
	browse: function(moduleName, klassName, methodName) {
		var browser = new lively.ide.SystemBrowser();
		browser.openIn(WorldMorph.current());

		var targetModule = module(moduleName),
			moduleURL = new URL(targetModule.uri()),
			dir = moduleURL.getDirectory(),
			fileName  = moduleURL.filename();

		var srcCtrl = lively.ide.startSourceControl();
		srcCtrl.addModule(targetModule.relativePath());

		browser.setTargetURL(dir);
		fileName && browser.inPaneSelectNodeNamed('Pane1', fileName);
		klassName && browser.inPaneSelectNodeNamed('Pane2', klassName);
		methodName && browser.inPaneSelectNodeNamed('Pane4', methodName);

		return browser;
	},
});

}) // end of module