/*
 * Copyright © 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

/**
 * Network.js.  Networking capabilities.
 *
 * Note: In a browser-based implementation of our system,
 * most of the necessary networking functionality is 
 * inherited from the browser.  
 */

Object.subclass('URL', {
    
    initialize: function(/*...*/) { // same field names as window.location
	if (arguments[0] instanceof String || typeof arguments[0] == 'string') {
	    var urlString = arguments[0];
	    //console.log('got urlString ' + urlString);
	    var result = urlString.match(URL.splitter);
	    if (!result) throw new Error("malformed URL string " + urlString);
	    this.protocol = result[1]; 
	    if (!result[1]) 
		throw new Error("bad url " + urlString + ", " + result);
	    this.hostname = result[2];
	    if (result[3]) 
		this.port = parseInt(result[3].substring(1));
	    
	    var fullpath = result[4];
	    if (fullpath) {
		result = fullpath.match(URL.pathSplitter);
		this.pathname = result[1];
		this.search = result[2];
		this.hash = result[3];
	    } else {
		this.pathname = "/";
		this.search = "";
		this.hash = "";
	    }
	} else { // spec is either an URL or window.location
	    var spec = arguments[0];
	    this.protocol = spec.protocol || "http";
	    this.port = spec.port;
	    this.hostname = spec.hostname;
	    this.pathname = spec.pathname || "";
	    if (spec.search !== undefined) this.search = spec.search;
	    if (spec.hash !== undefined) this.hash = spec.hash;
	}
    },
    
    inspect: function() {
	return JSON.serialize(this);
    },
    
    toString: function() {
	return this.protocol + "//" + this.hostname + (this.port ? ":" + this.port : "") + this.fullPath();
    },

    fullPath: function() {
	return this.pathname + (this.search || "") + (this.hash || "");
    },
    
    isLeaf: function() {
	return !this.fullPath().endsWith('/');
    },
    
    // POSIX style
    dirname: function() {
	var p = this.fullPath();
	var slash = p.endsWith('/') ? p.lastIndexOf('/', p.length - 2) : p.lastIndexOf('/');
	return p.substring(0, slash + 1);
    },

    filename: function() {
	var p = this.fullPath();
	var slash = p.endsWith('/') ? p.lastIndexOf('/', p.length - 2) : p.lastIndexOf('/');
	return p.substring(slash + 1);
    },

    getDirectory: function() {
	return this.withPath(this.dirname());
    },

    withPath: function(path) { 
	var result = path.match(URL.pathSplitter);
	if (!result) return null;
	return new URL({protocol: this.protocol, port: this.port, hostname: this.hostname, pathname: 
			result[1], search: result[2], hash: result[3] });
    },
    
    withFilename: function(filename) {
	if (filename == "./" || filename == ".") // a bit of normalization, not foolproof
	    filename = "";
	var dirPart = this.isLeaf() ? this.dirname() : this.fullPath();
	return new URL({protocol: this.protocol, port: this.port, 
			hostname: this.hostname, pathname: dirPart + filename});
    },

    toQueryString: function(record) {
	var results = [];
	Object.forEachOwnProperty(record, function(p) {
	    var value = record[p];
	    results.push(encodeURIComponent(p) + "=" + encodeURIComponent(String(value)));
	});
	return results.join('&');
    },

    withQuery: function(record) {
	return new URL({protocol: this.protocol, port: this.port, hostname: this.hostname, pathname: this.pathname,
			search: "?" + this.toQueryString(record), hash: this.hash});
    },

    eq: function(url) {
	if (!url) return false;
	else return url.protocol == this.protocol && url.port == this.port && url.hostname == this.hostname
	    && url.pathname == this.pathname && url.search == this.search && url.hash == this.hash;
    }
    
    
});

Object.extend(URL, {
    splitter: new RegExp('(http:|https:|file:)//([^/:]*)(:[0-9]+)?(/.*)?'),
    pathSplitter: new RegExp("([^\\?#]*)(\\?[^#]*)?(#.*)?"),
    source: new URL(Global.location)
});

View.subclass('NetRequest', {

    Unsent: 0,
    Opened: 1,
    HeadersReceived: 2,
    Loading: 3,
    Done: 4,

    documentation: "a view that writes the contents of an http request into the model",
    pins: ["+Status", "+ReadyState", "+ResponseXML", "+ResponseText"],

    proxy: Loader.proxyURL ? new URL(Loader.proxyURL.endsWith("/") ? Loader.proxyURL : Loader.proxyURL + "/") : null,

    rewriteURL: function(url) {
	url = url instanceof URL ? url : new URL(url);
        if (this.proxy) {
	    if (this.proxy.hostname != url.hostname) { // FIXME port and protocol?
		url = this.proxy.withFilename(url.hostname + url.fullPath());
		//console.log("rewrote url " + Object.inspect(url) + " proxy " + this.proxy);
		// return this.proxy + url.hostname + "/" + url.fullPath();
	    }
	}
        return url;
    },

    initialize: function($super, modelPlug) {
	this.transport = new XMLHttpRequest();
	this.requestNetworkAccess();
	this.transport.onreadystatechange = this.onReadyStateChange.bind(this);
	this.isSync = false;
	this.requestHeaders = {};
	$super(modelPlug)
    },

    requestNetworkAccess: function() {
        if (Global.netscape && window.location.protocol == "file:") {       
            try {
                netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
                console.log("requested browser read privilege");
                return true;
            } catch (er) {
                console.log("no privilege granted: " + er);
                return false;
            }
        }
    },

    beSync: function() {
	this.isSync = true;
	return this;
    },
    
    onReadyStateChange: function() {
	this.setModelValue('setReadyState', this.getReadyState());
	if (this.getReadyState() === this.Done) {
	    // console.log("done with " + this.method + " " + this.url + " status " + this.getStatus());
	    this.setModelValue('setStatus', this.getStatus());
	    if (this.transport.responseText) 
		this.setModelValue('setResponseText', this.getResponseText());
	    if (this.transport.responseXML) 
		this.setModelValue('setResponseXML', this.getResponseXML());
	    this.disconnectModel(); // autodisconnect?
	}
    },

    setRequestHeaders: function(record) {
	Object.forEachOwnProperty(record, function(prop) {
	    this.requestHeaders[prop] = record[prop];
	}, this);
    },
    
    setContentType: function(string) {
	// valid before send but after open?
	this.requestHeaders["Content-Type"] = string;
    },

    getReadyState: function() {
	return this.transport.readyState;
    },

    getResponseText: function() {
	return this.transport.responseText || "";
    },
    
    getResponseXML: function() {
	return this.transport.responseXML || "";
    },

    getStatus: function() {
	return { method: this.method, url: this.url, status: this.transport.status};
    },

    updateView: function(aspect, controller) {
	// console.log("update view on aspect " + aspect);
	// nothing, does not result to model changes (yet?)
	// should it result to setting the url by fetching it?
    },
    
    request: function(method, url, content) {
	try {
	    this.url = url;
	    this.method = method.toUpperCase();
	    this.transport.open(this.method, url.toString(), !this.isSync);
	    Object.forEachOwnProperty(this.requestHeaders, function(p) {
		this.transport.setRequestHeader(p, this.requestHeaders[p]);
	    }, this);
	    this.transport.send(content || undefined);
	    return this;
	} catch (er) {
	    var status = this.getStatus();
	    status.exception = er;
	    this.setModelValue("setStatus", status);
	    throw er;
	}
    },
    
    get: function(url) {
	return this.request("GET", this.rewriteURL(url), null);
    },

    put: function(url, content) {
	return this.request("PUT", this.rewriteURL(url), content);
    },

    propfind: function(url, depth, content) {
	this.setContentType("text/xml"); // complain if it's set to something else?
	if (depth != 0 && depth != 1)
	    depth = "infinity";
	this.setRequestHeaders({ "Depth" : depth });
	return this.request("PROPFIND", this.rewriteURL(url), content);
    },

    mkcol: function(url, content) {
	return this.request("MKCOL", this.rewriteURL(url), content);
    },
    
    del: function(url) {
	return this.request("DELETE", this.rewriteURL(url));
    },
    
    toString: function() {
	return "#<NetRequest{"+ this.method + " " + this.url + "}>";
    }

});


NetRequestReporterTrait = {
    setRequestStatus: function(statusInfo) { 
	// error reporting
	var method = statusInfo.method;
	var url = statusInfo.url;
	var status = statusInfo.status;
	if (status.exception) {
	    WorldMorph.current().alert("exception " + status.exception + " accessing " + method + " " + url);
	} else if (status >= 300) {
	    if (status == 401) {
		WorldMorph.current().alert("not authorized to access " + method + " " + url); 
		// should try to authorize
	    } else {
		WorldMorph.current().alert("failure to " + method + " "  + url + " code " + status);
	    }
	} else 
	    console.log("status " + status + " on " + method + " " + url);
    }
};

// convenience base class with built in handling of errors
Object.subclass('NetRequestReporter', NetRequestReporterTrait);

/**
 * @class FeedChannel: RSS feed channel
 */ 

Wrapper.subclass('FeedChannel', {

    initialize: function(rawNode) {
	this.rawNode = rawNode;
        this.items = [];
        var results = this.queryNode('item');
    
        for (var i = 0; i < results.length; i++) {
            this.items.push(new FeedItem(results[i]));
        }
    },

    title: function() {
        return this.queryNode('title', 'none')[0].textContent;
    }
    
});

/**
 * @class FeedItem: An individual RSS feed item
 */ 

Wrapper.subclass('FeedItem', {

    initialize: function(rawNode) {
	this.rawNode = rawNode;
    },
    
    title: function() {
	return this.queryNode('title', "none")[0].textContent;
    },

    description: function() {
	return this.queryNode('description', "none")[0].textContent;
    }
    
});

View.subclass('Feed', NetRequestReporterTrait, {

    pins: ["-URL", "+FeedChannels"],

    updateView: function(aspect, source) { // model vars: getURL, setFeedChannels
        var p = this.modelPlug;
	if (!p) return;
	switch (aspect) {
	case p.getURL:
	    var url = this.getModelValue('getURL');
	    this.request(url);
	    break;
	}
    },
    
    deserialize: function() { },

    kickstart: function() {
	if (this.modelPlug)
	    this.updateView(this.modelPlug.getURL, this);
    },
    
    setRawFeedContents: function(responseXML) {
	this.setModelValue('setFeedChannels', this.parseChannels(responseXML));
    },
    
    request: function(url) {
        var hourAgo = new Date((new Date()).getTime() - 1000*60*60);
	var req = new NetRequest({model: this, setResponseXML: "setRawFeedContents", setStatus: "setRequestStatus"});
	req.setContentType('text/xml');
	req.setRequestHeaders({ "If-Modified-Since": hourAgo.toString() });
	console.log("feed requesting " + url);
	req.get(url);
    },

    parseChannels: function(elt) {
	var results = new Query(elt).evaluate(elt, '/rss/channel', []);
        var channels = [];
        for (var i = 0; i < results.length; i++) {
	    channels.push(new FeedChannel(results[i]));
        }
	return channels;
    }

});



/**
 * @class Feed: RSS feed reader
 */
// FIXME something clever, maybe an external library?

Widget.subclass('FeedWidget', {

    defaultViewExtent: pt(500, 200),
    pins: [ "URL", "+ItemList", "+ChannelTitle", "-SelectedItemTitle", "+SelectedItemContent", "+Widget"],
    
    initialize: function($super, urlString) {
	var model = new SimpleModel(["FeedURL", "ItemList", "ChannelTitle", "SelectedItemContent", "SelectedItemTitle", 
	    "ItemMenu", "Widget"]);

	$super({model: model, 
		setURL: "setFeedURL", getURL: "getFeedURL",
		setItemList: "setItemList",
		setChannelTitle: "setChannelTitle", 
		setWidget: "setWidget",
		getSelectedItemTitle: "getSelectedItemTitle", 
		setSelectedItemContent: "setSelectedItemContent"});

	this.setModelValue("setURL", urlString);
	this.initializeTransientState();
    },

    deserialize: function($super, importer, plug) {
	$super(importer, plug);
	this.initializeTransientState();
    },

    getURL: function() {
	return new URL(this.getModelValue("getURL"));
    },

    setURL: function(urlString) {
	var code = this.setModelValue("setURL", urlString);
	this.feed.kickstart();
    },

    initializeTransientState: function() {
	this.channels = null;
	this.getModel().ItemMenu = [["get XML source", "makeSourcePane"],
				    ["Jonathan Schwartz's Blog", "setURL", "http://blogs.sun.com/jonathan/feed/entries/rss"],
				    ["Unofficial Apple blog", "setURL", "http://feeds.tuaw.com/weblogsinc/tuaw"],
				    ["Ajaxian", "setURL", "http://feeds.feedburner.com/ajaxian"],
				   ];
	this.feed = new Feed({model: this, setFeedChannels: "pvtSetFeedChannels", getURL: "getURL"});
	this.setModelValue("setWidget", this);
	this.feed.kickstart();
    },


    makeSourcePane: function(ignored, evt) {
	var item = this.getEntry(this.getModelValue("getSelectedItemTitle"));
	if (!item) return; // complain?
	var infoPane = newTextPane(new Rectangle(0, 0, 500, 200), item.toMarkupString());
	infoPane.innerMorph().acceptInput = false;
	WorldMorph.current().addFramedMorph(infoPane, "XML source for " + item.title(), evt.mousePoint);
    },

    pvtSetFeedChannels: function(channels) {
	this.channels = channels;
	var items = this.extractItemList(channels);
	//console.log("set items to " + items);
	this.setModelValue("setItemList",  items);
	this.setModelValue("setChannelTitle", "RSS feed from " +  channels[0].title());
    },
    
    updateView: function(aspect, controller) {
	var p = this.modelPlug;
	if (!p) return;
	switch (aspect) {
	case this.modelPlug.getSelectedItemTitle:
	    var title = this.getModelValue("getSelectedItemTitle");
	    if (title) {
		var entry = this.getEntry(title);
		// console.log("got entry " + entry);
		this.setModelValue("setSelectedItemContent", entry ? entry.description() : "?");
	    }
	    break;
	}
    },
    
    extractItemList: function(channels) {
	return channels[0].items.invoke('title');
    },

    getEntry: function(title) {
        var items = this.channels[0].items;
        for (var i = 0; i < items.length; i++) {
            if (items[i].title() == title) {
                return items[i];
            }
        }
	return null;
    },
    
    getSelectedItemDescription: function() { 
	var entry = this.getEntry(this.getModelValue("getSelectedItemTitle"));
	return entry && entry.description();
    },

    

    buildView: function(extent, model) {
        var panel = new PanelMorph(extent);
	panel.applyStyle({fill: Color.blue.lighter(2), borderWidth: 2});


        var rect = extent.extentAsRectangle();
        var m = panel.addMorph(newListPane(rect.withBottomRight(rect.bottomCenter())));
        m.connectModel({model: model, getList: "getItemList", 
			setSelection: "setSelectedItemTitle", getMenu: "getItemMenu", getMenuTarget: "getWidget"});
	
	var m = panel.addMorph(newTextPane(rect.withTopLeft(rect.topCenter())));
	m.innerMorph().acceptInput = false;
        m.connectModel({model: model, getText: "getSelectedItemContent"});
        return panel;
    },
    
    viewTitle: function() {
	var title = new TextMorph(new Rectangle(0, 0, 150, 15), 'RSS feed                    ').beLabel();
	title.connectModel({model: this.getModel(), getText: 'getChannelTitle'});
	return title;
    }
    
});

console.log('loaded Network.js');

