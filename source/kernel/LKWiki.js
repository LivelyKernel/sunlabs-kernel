Widget.subclass('WikiWindow', {

	defaultViewTitle: "WikiWindow",
	defaultViewExtent: pt(550, 350),
	pins: ['Content', 'Url'],
	ctx: {},
	defaultUrl: URL.proxy.toString() + 'wiki',
	
	initialize: function($super) {
		$super(null);		
		var model = new SyntheticModel(this.pins);
		this.versions = [];
		this.connectModel(model.makePlugSpecFromPins(this.pins));
		return this;
	},

	buildView: function(extent) {
		var panel = PanelMorph.makePanedPanel(extent, [
			['urlPane', newTextPane, new Rectangle(0, 0, 0.7, 0.1)],
			['goUrlButton', function(initialBounds){return new ButtonMorph(initialBounds)}, new Rectangle(0.7, 0, 0.3, 0.1)],
			['contentPane', newTextPane, new Rectangle(0, 0.1, 0.7, 0.8)],
			['versionList', newTextListPane, new Rectangle(0.7, 0.1, 0.3, 0.9)],
			['saveContentButton', function(initialBounds){return new ButtonMorph(initialBounds)}, new Rectangle(0, 0.9, 0.7, 0.1)],
		]);

		var model = this.getModel();
		
		var urlPane = panel.urlPane;
		urlPane.connectModel({model: model, getText: "getUrl", setText: "setUrl"});
		urlPane.innerMorph().autoAccept = true;
		
		var goUrlButton = panel.goUrlButton;
		goUrlButton.setLabel("Go");
		goUrlButton.connectModel({model: this, setValue: "goToUrl"});
		
		var contentPane = panel.contentPane;
		contentPane.connectModel({model: model, getText: "getContent", setText: "setContent"});
		contentPane.innerMorph().autoAccept = true;
		
		this.versionList = panel.versionList;
		this.versionList.connectModel({model: this, getList: "getVersions", setList: "setVersions", setSelection: "setVersion"});
		
		var saveContentButton = panel.saveContentButton;
		saveContentButton.setLabel("Save");
		saveContentButton.connectModel({model: this, setValue: "saveContents"});
		
		this.setModelValue("setUrl", this.defaultUrl);
		this.goToUrl(model.getUrl());
		
		return panel;
	},
	
	goToUrl: function(value) {
		if (!value) return;
		var model = this.getModel();
		var url = model.getUrl();
		// 1. GetHeadRevision. If one exists loadMetadataFromRev() is called (2.).
		// 
		// Get the HeadRevision in detail: If the requested file does not exist then set
		// urlIsValid to false. In the moment setRequestStatus must be wrapped for this.
		// Reasons are:
		// a) setRequestStatus directly informs the user with a popup. This is not wanted here.
		// b) WikiWindow cannot get the RequestStatus because it doesn't uses setModelValue
		// (there is not even a pin...)
		var svnResource = new SVNResource(this.defaultUrl, url, {model: this, setHeadRevision: "loadMetadataFromRev"});
		var wikiWindow = this;
		svnResource.setRequestStatus = svnResource.setRequestStatus.wrap(function(proceed, status) {
			// 404 status code should appear when something isn't there but sometimes
			// its also a 500? mod_dav_svn specific?
			if (status.code() == 404 || status.code() == 500) {
				wikiWindow.informAboutNonExistingUrl();
				return;
			};
			proceed(status);
		});
		svnResource.fetchHeadRevision(true);
	},
	
	loadMetadataFromRev: function(revision) {
		var svnResource = new SVNResource(this.defaultUrl, this.getModelValue("getUrl"),
			{model: this, setMetadata: "setVersions"});
		svnResource.fetchMetadata(false, null, revision);
	},
		
	saveContents: function(value) {
		if (!value) return;
		var model = this.getModel();
		var svnResource = new SVNResource(this.defaultUrl, model.getUrl());
		
		// Whooohaaa, this is ugly :-)
		// setRequestStatus() gets called when the store request is Done (check if it really is?)
		// We overwrite the method in the object to trigger the reload of the resource identified by url
		// A direct connection via a modelPlug is not possible because setRequestStatus does not
		// trigger a setModelValue(), so we don't know when its done
		var wikiWindow = this;
		svnResource.setRequestStatus = svnResource.setRequestStatus.wrap(function(proceed, status) {
			wikiWindow.goToUrl(model.getUrl());
			proceed(status);
		});	
		svnResource.store(model.getContent());
	},
	
	getVersions: function() {
		// returns ['---'] if there are no versions because an empty collection
		// seems to break the ListMorph */
		return this.versions.length == 0 ?
			['---'] : this.versions.collect(function(ea) {return ea.date});
	},
	
	setVersions: function(logArray) {
		this.versions = logArray;
		// display the most recent version as current in content pane
		if (this.versions.length != 0)
			this.setVersion(this.versions[0].date);
		// FIXME
		this.versionList.updateView('getVersions');
	},
	
	setVersion: function(string) {
		var selection = this.versions.detect(function(ea) {
			return ea.date == string;
		});
		var url = this.getModelValue("getUrl");
		if (!selection) {
			this.setModelValue("setContent", "error occurred. Can't find the selected version!");
			return;
		};
		var svnResource = new SVNResource(this.defaultUrl, url,
			{model: this.getModel(), setContentText: "setContent"});
		svnResource.fetch(false, null, selection.rev);
	},
	
	setContent: function(content) {
		this.setModelValue("setContent")
	},
	
	informAboutNonExistingUrl: function() {
		this.setVersions([]);
		this.getModel().getUrl();
		var text = this.getModelValue("getUrl").endsWith('/') ?
			'Directory does not exist.' :
			'File does not exist. Press Save to create file.';
		this.setModelValue("setContent", text);
	}
});

function openWikiWindow() {
	var wiki = new WikiWindow();
	wiki.openIn(WorldMorph.current(), pt(50, 20));
	return wiki;
};