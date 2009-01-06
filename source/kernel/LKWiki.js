module('lively.LKWiki').requires().toRun(function(ownModule) {

URL.common.localWiki = URL.proxy.withFilename('wiki/');

// Deprecated
Widget.subclass('WikiWindow', NetRequestReporterTrait, { // FIXME deprected, remove!
    
    viewTitle: "WikiWindow",
    initialViewExtent: pt(550, 350),
    pins: ['Content', 'Url'],
    ctx: {},
    defaultUrl: URL.common.localWiki.toString(),
    
    initialize: function($super) {
	$super(null);		
	var model = new SyntheticModel(this.pins);
	this.versions = [];
	this.connectModel(model.makePlugSpecFromPins(this.pins));
	return this;
    },
    
    buildView: function(extent) {
	var panel = PanelMorph.makePanedPanel(extent, [
	    ['urlPane', newTextPane, new Rectangle(0, 0, 1, 0.1)],
//	    ['goUrlButton', ButtonMorph, new Rectangle(0.7, 0, 0.3, 0.1)],
	    ['contentPane', newTextPane, new Rectangle(0, 0.1, 0.7, 0.8)],
	    ['versionList', newTextListPane, new Rectangle(0.7, 0.1, 0.3, 0.9)],
	    ['saveContentButton', ButtonMorph, new Rectangle(0, 0.9, 0.7, 0.1)],
	]);
	
	var model = this.getModel();
	
	var urlPane = panel.urlPane;
	urlPane.connectModel({model: model, getText: "getUrl", setText: "setUrl"});
	urlPane.innerMorph().autoAccept = false;
	
        // var goUrlButton = panel.goUrlButton;
        // goUrlButton.setLabel("Go");
        // goUrlButton.connectModel({model: this, setValue: "goToUrl"});
	
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
    
    getUrl: function() {
	return this.url;
    },
    
    
    goToUrl: function(value) {
	if (!value) return;
	var model = this.getModel();
	this.url = model.getUrl();
	
	console.log("loading url: " + this.url);
	// 1. GetHeadRevision. If one exists loadMetadataFromRev() is called (2.).
	// 
	// Get the HeadRevision in detail: If the requested file does not exist then set
	// urlIsValid to false. In the moment setRequestStatus must be wrapped for this.
	// Reasons are:
	// a) setRequestStatus directly informs the user with a popup. This is not wanted here.
	// b) WikiWindow cannot get the RequestStatus because it doesn't uses setModelValue
	// (there is not even a pin...)
	var svnResource = new SVNResource(this.defaultUrl, {model: this, 
	    getURL: "getUrl", setHeadRevision: "loadMetadataFromRev", setStatus: "setRequestStatus"});
	var wikiWindow = this;
	svnResource.setRequestStatus = svnResource.setRequestStatus.wrap(function(proceed, status) {
	    // 404 status code should appear when something isn't there but sometimes
	    // its also a 500? mod_dav_svn specific?
	    if (status.code() == 404 || status.code() == 500) {
		wikiWindow.informAboutNonExistingUrl();
		return;
	    };
	    console.log("got head rev from, proceeding in setRequestStatus: " + this.url);
	    proceed(status);
	});
	svnResource.fetchHeadRevision(true);
	console.log("finished loading url: " + this.url);
    },
    
    loadMetadataFromRev: function(revision) {
	var svnResource = new SVNResource(this.defaultUrl, 
	    {model: this, setMetadata: "setVersions", getURL: "getUrl", setStatus: "setRequestStatus"});
	svnResource.fetchMetadata(true, null, revision);
    },
    
    saveContents: function(value) {
	if (!value) return;
	var model = this.getModel();
	var svnResource = new SVNResource(this.defaultUrl, 
	    { model: model, getURL: "getUrl", setStatus: "setRequestStatus"});
	
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
	var svnResource = new SVNResource(this.defaultUrl, {model: this.getModel(), 
	    setStatus: "setRequestStatus",
	    setContentText: "setContent", getURL: "getUrl"});
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

WikiWindow.open = function() {
    var wiki = new WikiWindow();
    wiki.open();
    return wiki;
};

Widget.subclass('WikiNavigator', {
    
    repoUrl: function() {
            // FIXME: assertion: */proxy/wiki is used as the repository
            // if URL.source.getDirectory() is http://localhost/livelyBranch/proxy/wiki/test/
            // the regexp outputs ["http://localhost/livelyBranch/proxy/wiki/test/", "http://localhost/livelyBranch/proxy/wiki"]
            if (!URL.source.toString().include("wiki")) return URL.source.getDirectory().toString();
            return /(.*wiki).*/.exec(URL.source.getDirectory().toString())[1];
    },
   
    initialize: function($super, url, world) {
		$super(null);
		if (!world) world = WorldMorph.current();
		this.world = world;
		url = new URL(url);
		this.model = Record.newPlainInstance({Versions: [], Version: null, URL: url.notSvnVersioned().withoutQuery() });
		this.model.addObserver(this, { Version: "!Version" });
		
		this.svnResource = new SVNResource(this.repoUrl(), Record.newPlainInstance({URL: this.model.getURL().toString(), HeadRevision: null, Metadata: null}));
		
		return this;
	},
	
	buildView: function(extent) {
	    var panel = PanelMorph.makePanedPanel(extent, [
			['saveContentButton', function(initialBounds){return new ButtonMorph(initialBounds)}, new Rectangle(0.05, 0.2, 0.1, 0.6)],
			['versionList', newTextListPane, new Rectangle(0.25, 0.2, 0.55, 0.6)]
		]);

        // delete panel when moving the mouse away from it
        panel.onMouseOut = panel.onMouseOut.wrap(function(proceed, evt) {
            if (this.submorphs.any(function(ea) { return ea.fullContainsWorldPoint(evt.point()) })) return;
            this.remove();
        });
        
		var saveContentButton = panel.saveContentButton;
		saveContentButton.setLabel("Save");
		saveContentButton.connectModel({model: this, setValue: "saveWorld"});
		
/*****/
        var versionList = panel.versionList;
        // FIXME This is for value conversion. Much better is using conversion method support of relay (see below)
        var convertSVNMetadataToStrings = function(data) { return data.collect(function(ea) { return ea.toString() }) };
        versionList.innerMorph().setList = versionList.innerMorph().setList.wrap(function(proceed, values) {
            console.log("wrapped setList");
            proceed(convertSVNMetadataToStrings(values));
        });    
        versionList.innerMorph().onListUpdate = versionList.innerMorph().onListUpdate.wrap(function(proceed, values) {
            console.log("wrapped onListUpdate");
            proceed(convertSVNMetadataToStrings(values));
        });      
        versionList.connectModel(this.model.newRelay({List: "Versions", Selection: "Version"}), true /* kickstart if morph was deleted*/);
        //When using conversion methods this.model.setVersions no longer triggers the onListUpdate... why?
        // Relay.create({List: {mode: '', name: 'Versions', from: Number, to: String}})
        // var relay = Relay.newInstance({
        //         List: {name: 'Versions', mode: '',
        //                 to: function(list) { console.log("to conv setVersions triggered!"); return ['list']; },
        //                 from: function(list) { console.log("from conv of setVersions triggered!"); return list; }},
        //         Selection: {name: 'Version', mode: '', to: String}},
        //         this.model);
        //         versionList.connectModel(relay, true /* kickstart if morph was deleted*/);
/*****/
        this.findVersions();
		this.panel = panel;
		return panel;
	},
	
	prepareForSaving: function() {
	    if (this.panel) this.panel.remove();
        // remove all control btns.... remove this when all pages updated
        var x = WorldMorph.current().submorphs.select(function(ea) { return ea.constructor == TextMorph });
        x = x.select(function(ea) { return ea.textContent && ea.textContent.rawNode.textContent == 'Wikicontrol' });
        x.each(function(ea) { ea.remove() });
        // if (this.btn) this.btn.remove();
	},
	
	doSave: function() {
	    this.prepareForSaving();
        return this.svnResource.store(Exporter.shrinkWrapMorph(WorldMorph.current()), true).getStatus();
	},
	
	saveWorld: function(value) {
	    if (!value) return;
	    var status = this.doSave();
    	if (status.isSuccess()) {
    	    console.log("success saving world at " + this.model.getURL().toString() + ", to wiki. Status: " + status.code());
            this.navigateToUrl();
    	} else {
    	    console.log("Failure saving world at " + this.model.getURL().toString() + ", to wiki");
    	    this.createWikiNavigatorButton();
    	    // FISXME CLEANUP
    	    WorldMorph.current().addMorph(this.btn);
            this.btn.startStepping(1000, "positionInLowerLeftCorner");
    	}
	},
	
	askToNavigateToUrl: function(world) {    
        if (!Config.confirmNavigation) {this.navigateToUrl(); return; }  // No other browsers confirm clickaway

        var msg = 'Go to ' + this.model.getURL() + ' ?';
        var label1 = this.worldExists() ? 'Save and follow link' : 'Save, create, follow link';
        var label2 = this.worldExists() ? 'Just follow link' : 'Create and follow link';
        
             var model = Record.newPlainInstance({
                 Button1: null, Button2: null, Message: msg, LabelButton1: label1, LabelButton2: label2 });
             model.addObserver({
                 onButton1Update: function(value) {
                     if (!value) return;
                     if (WikiNavigator.current && WikiNavigator.current.doSave().isSuccess()) {
                         if (!this.worldExists()) this.doSave(); // create other world
                         this.navigateToUrl();
                         return; // Alibi
                     }
                     world.alert('World cannot be saved. Did not follow link.');
                 }.bind(this),
                 onButton2Update: function(value) {
                     if (!value) return;
                     if (!this.worldExists())
                        if (!this.doSave().isSuccess()) return;
                     this.navigateToUrl()
                 }.bind(this)});
             var dialog = new WikiLinkDialog(model.newRelay({
                 Button1: "+Button1", Button2: "+Button2", Message: "-Message",
                 LabelButton1: "-LabelButton1", LabelButton2: "-LabelButton2"}));
             dialog.openIn(world, world.positionForNewMorph());
             return dialog;
    },
	    
	navigateToUrl: function() {
	    Config.askBeforeQuit = false;
	    window.location.assign(this.model.getURL().toString() + '?' + new Date().getTime());
	},
	
	onVersionUpdate: function(versionString) {
	    // FIXME ... looking for correct version ... better with conversion methods
	    var selectedVersion = this.model.getVersions().detect(function(ea) { return ea.toString() == versionString});
	    var svnres = this.svnResource;
	    svnres.withBaselineUriDo(selectedVersion.rev, function() {
	        console.log("visiting: " + svnres.getURL());
	        // FIXME use navigateToUrl
            Config.askBeforeQuit = false;
            window.location.assign(svnres.getURL());
	    });
	    
	},
	
	findVersions: function() {
	    if (this.model.getVersions().length == 0) this.model.setVersions(['Please wait, fetching version infos...']);
	    this.svnResource.formalModel.addObserver({onHeadRevisionUpdate: function(headRevision) {
            this.svnResource.fetchMetadata(false, null, headRevision);
        }.bind(this)});
        this.svnResource.formalModel.addObserver({onMetadataUpdate: function() {
            this.model.setVersions(this.svnResource.getMetadata());
        }.bind(this)});
	    this.svnResource.fetchHeadRevision();
        
	},
		
	createWikiNavigatorButton: function() {
	    var btn =  new TextMorph(new Rectangle(0,0,80,50), 'Wiki control');
	    btn.supressHandles = true;
	    btn.handlesMouseDown = Functions.False;
	    var self = this;
	    btn.onMouseOver = function(evt) {
	        var navMorph = self.buildView(pt(800,105));
	        self.world.addMorph(navMorph);
	        navMorph.setPosition(pt(0, 0))
	    };
	    btn.positionInLowerLeftCorner = function() { btn.setPosition(pt(0, 0)) };
	    this.btn = btn;
	},
	
	isActive: function() {
	    // just look if url seems to point to a wiki file
        return this.model.getURL().toString().include("wiki");
	},
	
    worldExists: function() {
        return new NetRequest().beSync().get(this.model.getURL()).getStatus().isSuccess();
    }
});

Object.extend(WikiNavigator, {
    enableWikiNavigator: function(force) {
        if (!force && WikiNavigator.current) return;
        if (WikiNavigator.current && WikiNavigator.current.btn) WikiNavigator.current.btn.remove();
        var nav = new WikiNavigator(URL.source);
        // var nav = new WikiNavigator('http://localhost/livelyBranch/proxy/wiki/test/blabla');
        if (!nav.isActive()) return;
        nav.createWikiNavigatorButton();
        WorldMorph.current().addMorph(nav.btn);
        nav.btn.startStepping(1000, "positionInLowerLeftCorner");
        WikiNavigator.current = nav;
    }
});

Dialog.subclass('WikiLinkDialog', {

    formals: ["-LabelButton1", "-LabelButton2", "+Button1", "+Button2", "-Message"],
    initialViewExtent: pt(350, 90),
    
    openIn: function($super, world, position) {
	    var view = $super(world, position);
        world.firstHand().setKeyboardFocus(view.targetMorph.submorphs[1]);
	    return view;
    },
    
    cancelled: function(value, source) {
        this.removeTopLevel();
    },
    
    confirmed1: function(value, source) {
        this.removeTopLevel();
	    if (value == true) this.setButton1(true);
    },
    
    confirmed2: function(value, source) {
        this.removeTopLevel();
	    if (value == true) this.setButton2(true);
    },
    
    buildView: function(extent, model) {
        var panel = new PanelMorph(extent);
        this.panel = panel;
        panel.linkToStyles(["panel"]);

        var r = new Rectangle(this.inset, this.inset, extent.x - 2*this.inset, 30);
        this.label = panel.addMorph(new TextMorph(r, this.getMessage()).beLabel());
        var indent = extent.x - 135 - 120 - 60 - 3*this.inset;
        var height = r.maxY() + this.inset;
        
        r = new Rectangle(r.x + indent, height, 135, 30);
        var confirm1Button = panel.addMorph(new ButtonMorph(r)).setLabel(this.getLabelButton1());
        confirm1Button.connectModel({model: this, setValue: "confirmed1"});
        
        r = new Rectangle(r.x + confirm1Button.getExtent().x + this.inset, height, 120, 30);
        var confirm2Button = panel.addMorph(new ButtonMorph(r)).setLabel(this.getLabelButton2());
        confirm2Button.connectModel({model: this, setValue: "confirmed2"});

        r = new Rectangle(r.maxX() + this.inset, height, 55, 30);
        var noButton = panel.addMorph(new ButtonMorph(r)).setLabel("Cancel");
        noButton.connectModel({model: this, setValue: "cancelled"});
        return panel;
    }

});

Object.subclass('WikiPatcher', {
    
    documentation: 'Wiki pages which do not run with the current source code can be fixed with this object.\n\
                    It will rewrite te failing xhtml so that it uses compatible source code again.',
    
    findLinks: /(xlink\:href\=)"(.*?)(\w+\.js)"/g,
    
    initialize: function(repoUrl) {
        this.repoUrl = repoUrl;
    },
    
    patchFile: function(fileName, optRevision) {
        var dir = new FileDirectory(this.repoUrl);
        var rev = optRevision || this.findFirstRevision(fileName);
        var unpatchedSrc = dir.fileContent(fileName);
        var patchedSrc = this.patchSrc(unpatchedSrc, rev);
        dir.writeFileNamed(fileName, patchedSrc);
    },
    
    unpatchFile: function(fileName) {
        var dir = new FileDirectory(this.repoUrl);
        var patchedSrc = dir.fileContent(fileName);
        var unpatchedSrc = this.unpatchSrc(patchedSrc);
        dir.writeFileNamed(fileName, unpatchedSrc);
    },
    
    findFirstRevision: function(fileName) {
        var url = this.repoUrl.toString();
        var fullUrl = url + fileName;
        var res = new SVNResource(url, Record.newPlainInstance({URL: fullUrl, Metadata: null, HeadRevision: null}));
        res.fetchMetadata(true, null);
    	timestamp = res.getMetadata().last();
    	var rev = timestamp.toString().match(/.*Revision (.*)/)[1];
        return Number(rev);
    },
    
    patchSrc: function(src, revision) {
        return src.replace(this.findLinks, '$1"' + this.repoUrl.toString() + '!svn/bc/' + revision + '/' + '$3"');
    },
    
    unpatchSrc: function(src) {
        return src.replace(this.findLinks, '$1"$3"');
    },
});

PanelMorph.subclass('LatestWikiChangesListPanel', {

	documentation: 'Just a hack for deserializing my widget',

    onDeserialize: function() {
        // FIXME
		var widget = new LatestWikiChangesList(URL.source.getDirectory())
        this.owner.targetMorph = this.owner.addMorph(widget.buildView(this.getExtent()));
        this.owner.targetMorph.setPosition(this.getPosition());
        this.remove();
		widget.searchForNewestFiles();
    }

});

Widget.subclass('LatestWikiChangesList', {

    viewTitle: "Latest changes",

    initialViewExtent: pt(280, 210),

	formals: ["URL", "DirectoryContent", "Filter", "VersionList", "VersionSelection"],

	defaultFilter: /^.*xhtml$/,

	maxListLength: 20,

	initialize: function(url) {
		var model = Record.newPlainInstance({URL: url, DirectoryContent: [], Filter: this.defaultFilter, VersionList: [], VersionSelection: null});
		this.relayToModel(model, {URL: "-URL", DirectoryContent: "DirectoryContent", Filter: "Filter", VersionList: "VersionList", VersionSelection: "VersionSelection"});
	},

	buildView: function(extent) {
		var panel;
		panel = new LatestWikiChangesListPanel(extent);
		panel = PanelMorph.makePanedPanel(extent, [
			['refreshButton', function(initialBounds){return new ButtonMorph(initialBounds)}, new Rectangle(0, 0, 0.5, 0.1)],
			['filterButton', function(initialBounds){return new ButtonMorph(initialBounds)}, new Rectangle(0.5, 0, 0.5, 0.1)],
			['versionList', newRealListPane, new Rectangle(0, 0.1, 1, 0.9)]
		], panel);

		var m;
		var model = this.getModel();

		m = panel.refreshButton;
		m.setLabel("Refresh");
		m.connectModel({model: this, setValue: "refresh"});

		m = panel.filterButton;
		m.setLabel("Filename filter");
		m.connectModel({model: this, setValue: "filterDialog"});

		m = panel.versionList;
		m.connectModel(model.newRelay({List: "-VersionList", Selection: "+VersionSelection"}));

		return panel;
	},

	notify: function(msg) { // to let the user now what's goin on
			this.setVersionList([msg]);
	},

	versionListHasOnlyNotifications: function() {
		var l = this.getVersionList();
		if (l.length !== 1) return false;
		return !l.first().isListItem // notifications are just strings...
	},

	searchForNewestFiles: function() {
		this.notify('Please wait, fetching files');
		var webfile = new lively.storage.WebFile(this.getModel().newRelay({CollectionItems: "+DirectoryContent", RootNode: "-URL"}));
		webfile.fetchContent(this.getURL());
	},
	
	onDirectoryContentUpdate: function(colItems) {
		this.notify('Please wait, fetching version infos');
		// TODO -- Use filter here!
		colItems = colItems.select(function(ea) { return ea.shortName().match(this.getFilter()) }, this);
		var t = new Date();
		var list = colItems
			.collect(function(ea) { return this.createListItemFor(ea) }, this)
			.sort(function(a,b) { return b.value.versionInfo.rev - a.value.versionInfo.rev });
		list = list.slice(0, this.maxListLength);
		console.log('time: ' + (new Date()-t)/1000 + 's');
		this.setVersionList(list);
	},
	
	createListItemFor: function(colItem) {
		var versionInfo = colItem.asSVNVersionInfo();
		return {
			isListItem: true,
			string: colItem.shortName() + ' (' + versionInfo.rev + ' -- ' + versionInfo.author + ')',
			value: {colItem: colItem, versionInfo: versionInfo}};
	},

	refresh: function(btnVal) {
		if (btnVal) return;
		this.searchForNewestFiles();
	},
	
	filterDialog: function(btnVal) {
		if (btnVal) return;
		var world = WorldMorph.current();
		var cb = function(input) {
			var regexp;
			try { regexp = eval(input) } catch(e) {};
			if (!(regexp instanceof RegExp)) {
				world.prompt('Invalid regular expression!', cb, input);
				return;
			}
			this.setFilter(regexp);
			this.searchForNewestFiles();
		}.bind(this);
		world.prompt('Change the regular expression', cb, this.getFilter().toString());
	},

	onFilterUpdate: Functions.Null,
	
	onVersionSelectionUpdate: function(listItem) {
		console.log('new sel');
		world = WorldMorph.current();
		var url = this.getURL().toString() + listItem.colItem.shortName();
		world.confirm('Navigate to ' + url + '?', function(response) {
			if (!response) return;
			Config.askBeforeQuit = false;
			window.location.assign(url + '?' + new Date().getTime());
		});
	},
	
	onVersionListUpdate: Functions.Null,

});

}) // end of module