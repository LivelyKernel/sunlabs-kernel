URL.common.localWiki = URL.proxy.withFilename('wiki/');

// Deprecated
Widget.subclass('WikiWindow', NetRequestReporterTrait, {
    
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
	
	// maybe better when we do this with rewrite rules?
	removeBaselinePartsFrom: function(url) {
	    // concatenates the two ends of the url
	    // "http://localhost/livelyBranch/proxy/wiki/!svn/bc/187/test/index.xhtml"
	    // --> "http://localhost/livelyBranch/proxy/wiki/index.xhtml"
	    var reg = /(.*)!svn\/bc\/[0-9]+\/(.*)/;
	    return url.replace(reg, '$1$2');
	},
	
	buildView: function(extent) {
	    var panel = PanelMorph.makePanedPanel(extent, [
			['saveContentButton', function(initialBounds){return new ButtonMorph(initialBounds)}, new Rectangle(0.1, 0.2, 0.1, 0.6)],
			['versionList', newTextListPane, new Rectangle(0.3, 0.2, 0.5, 0.6)]
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
        this.findVersions();
        var versionList = panel.versionList;
        // FIXME This is for value conversion. Much better is using conversion method support of relay (see below)
        var convertSVNMetadataToStrings = function(data) { return data.collect(function(ea) { return ea.date + ' ' + ea.author }) };
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

		this.panel = panel;
		return panel;
	},
	
	saveWorld: function(value) {
	    if (!value) return;
	    
        if (this.panel) this.panel.remove();
        if (this.btn) this.btn.remove();
	    
        var status = this.svnResource.store(Exporter.shrinkWrapMorph(WorldMorph.current()), true).getStatus();        

    	if (status.isSuccess()) {
    	    console.log("success saving world at " + this.model.getURL().toString() + ", to wiki. Status: " + status.code());
    	    this.findVersions();
    	    this.onVersionUpdate(this.model.getVersions().first().toString());
    	} else {
    	    console.log("Failure saving world at " + this.model.getURL().toString() + ", to wiki");
    	    this.createWikiNavigatorButton();
    	}
	},
	
	onVersionUpdate: function(versionString) {
	    // FIXME ... looking for correct version ... better with conversion methods
	    var selectedVersion = this.model.getVersions().detect(function(ea) { return ea.date + ' ' + ea.author == versionString});
	    var svnres = this.svnResource;
	    svnres.withBaselineUriDo(selectedVersion.rev, function() {
	        console.log("visiting: " + svnres.getURL());
            Config.askBeforeQuit = false;
            window.location.assign(svnres.getURL());
	    });
	    
	},
	
	findVersions: function() {
	    this.svnResource.fetchMetadata(true);
        this.model.setVersions(this.svnResource.getMetadata());
	},
		
	createWikiNavigatorButton: function() {
	    var btn =  new TextMorph(new Rectangle(0,0,200,50), 'Wiki control');
	    btn.supressHandles = true;
	    btn.handlesMouseDown = Functions.False;
	    var self = this;
	    btn.onMouseOver = function(evt) {
	        var navMorph = self.buildView(pt(700,75));
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
    enableWikiNavigator: function() {
        if (WikiNavigator.current) return;
        var nav = new WikiNavigator(URL.source);
        // var nav = new WikiNavigator('http://localhost/livelyBranch/proxy/wiki/test/blabla');
        if (!nav.isActive()) return;
        nav.createWikiNavigatorButton();
        WorldMorph.current().addMorph(nav.btn);
        nav.btn.startStepping(1000, "positionInLowerLeftCorner");
        WikiNavigator.current = nav;
    }
});
