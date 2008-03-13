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
		this.path = result[1];
		this.search = result[2];
		this.hash = result[3];
	    } else {
		this.path = "/";
		this.search = "";
		this.hash = "";
	    }
	} else { // spec is either an URL or window.location
	    var spec = arguments[0];
	    this.protocol = spec.protocol || "http";
	    this.port = spec.port;
	    this.hostname = spec.hostname;
	    this.path = spec.pathname || "";
	    if (spec.search !== undefined) this.search = spec.search;
	    if (spec.hash !== undefined) this.hash = spec.hash;
	}
    },
    
    inspect: function() {
	return Object.toJSON(this);
    },
    
    toString: function() {
	return this.protocol + "://" + this.hostname + (this.port ? ":" + this.port : "") + this.fullPath();
    },

    fullPath: function() {
	return this.path + (this.search || "") + (this.hash || "");
    },
    
    isDirectory: function() {
	return this.fullPath().endsWith('/');
    },
    
    // POSIX style
    dirname: function() {
	var p = this.fullPath();
	return p.substring(0, p.lastIndexOf('/') + 1);
    },

    filename: function() {
	var p = this.fullPath();
	return p.substring(p.lastIndexOf('/') + 1);
    },

    dirnameURL: function() {
	return this.withPath(this.dirname());
    },

    withPath: function(path) { 
	var result = path.match(URL.pathSplitter);
	this.path = result[1];
	this.search = result[2];
	this.hash = result[3];
	return new URL({protocol: this.protocol, port: this.port, hostname: this.hostname, pathname: 
			result[1], search: result[2], hash: result[3] });
    },
    
    withFilename: function(filename) {
	var dirPart = this.dirname();
	var i = filename.indexOf(dirPart);
	var localname = filename;
	if (i >= 0) localname = filename.substring(i + dirPart.length); // strip off leading directory ref
	var proto = this.protocol;
	if(proto.endsWith(":")) { // Deal with extra colon on protocol part
		console.log("bad protocol = " + proto);
		proto = proto.substring(0,proto.length-1);
		console.log("fixed protocol = " + proto);
	}
	return new URL({protocol: proto, port: this.port, 
			hostname: this.hostname, pathname: this.dirname() + localname});
    },

    withQuery: function(record) {
	return new URL({protocol: this.protocol, port: this.port, hostname: this.hostname, pathname: this.path,
			search: "?" + $H(record).toQueryString(), hash: this.hash});
    }
    
});

Object.extend(URL, {
    splitter: new RegExp('(http|https|file)://([^/:]*)(:[0-9]+)?(/.*)?'),
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
	this.requestHeaders = new Hash();
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
        $H(record).each(function(pair) { this.requestHeaders.set(pair.key, pair.value) }.bind(this));
    },
    
    setContentType: function(string) {
	// valid before send but after open?
	this.requestHeaders.set("Content-Type", string);
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
	this.url = url;
	this.method = method.toUpperCase();
	this.transport.open(this.method, url.toString(), !this.isSync);
	this.requestHeaders.each(function(p) { 
	    this.transport.setRequestHeader(p.key, p.value);
	}.bind(this));
	
	this.transport.send(content || undefined);
	return this;
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
    },


    test: function() {
	var model = new SimpleModel(null, "Result");
	var request = new NetRequest({model: model, setResult: "setResponseText"});
	var v = new View();
	v.updateView = function(aspect, controller) { 
	    if (aspect == this.modelPlug.getResult)
		console.log("got result " + this.getModelValue("getResult", ""));
	}
	v.connectModel({model: model, getResult: "getResponseText"});
	request.get(URL.source);
	
	request = new NetRequest(true);
	console.log("2) result " 
		    + request.get(URL.source).beSync().getModelValue('getResponseText', ""));
    }

});

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

View.subclass('Feed', {
    documentation: "populates model with feed results", // FIXME

    toString: function() {
	return "#<Feed>";
    },
    
    updateView: function(aspect, source) { // model vars: getURL, getRawFeedContents, setRawFeedContents, setFeedChannels
        var p = this.modelPlug;
	if (!p) return;
	switch (aspect) {
	case p.getURL:
	    var url = this.getModelValue('getURL');
	    this.request(url, p.setRawFeedContents);
	    break;
        case p.getRawFeedContents:
	    var elt = this.getModelValue('getRawFeedContents');
	    var ch = this.parseChannels(elt);
	    this.setModelValue('setFeedChannels', this.parseChannels(elt));
	    break;
	}
    },
    
    request: function(url, destVariable) {
        var hourAgo = new Date((new Date()).getTime() - 1000*60*60);
	var req = new NetRequest({model: this.getModel(), setResponseXML: destVariable});
	req.setContentType('text/xml');
	req.setRequestHeaders({ "If-Modified-Since": hourAgo.toString() });
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
    
    initialize: function($super, urlString) {
	var model = new SimpleModel(null, "FeedURL", "RawFeed",
	    "ItemList", "ChannelTitle", "SelectedItemContent", "SelectedItemTitle", "FeedChannels", "ItemMenu");

	$super({model: model, 
		getFeedChannels: "getFeedChannels", 
		setURL: "setFeedURL",
		setItemList: "setItemList",
		setChannelTitle: "setChannelTitle", 
		getSelectedItemTitle: "getSelectedItemTitle", 
		setSelectedItemContent: "setSelectedItemContent"});
	var feed = new Feed({model: model, 
	    setRawFeedContents: "setRawFeed", getRawFeedContents: "getRawFeed", 
	    setFeedChannels: "setFeedChannels",
	    getURL: "getFeedURL"});
	this.channels = null;
	this.setModelValue('setURL', new URL(urlString));

	var widget = this; 
	model.ItemMenu = [ 
	    ["get XML source", function(evt) {
		var index = this.innerMorph().selectedLineNo();
		var item = widget.channels[0].items[index]; // FIXME model-view dependency
		var txt = item ? item.toMarkupString() : "?";
		var infoPane = newTextPane(new Rectangle(0, 0, 500, 200), txt);
		infoPane.innerMorph().acceptInput = false;
		this.world().addFramedMorph(infoPane, "XML source for " + item.title(), evt.mousePoint);
	    }]
	];
    },
    
    toString: function() {
        return "#<FeedWidget>";
    },

    updateView: function(aspect, controller) {
	var p = this.modelPlug;
	if (!p) return;
	switch (aspect) {
	case this.modelPlug.getFeedChannels: 
	    this.channels = this.getModelValue("getFeedChannels");
	    this.setModelValue("setItemList",  this.extractItemList(this.channels));
	    this.setModelValue("setChannelTitle", "RSS feed from " +  this.channels[0].title());
	    break;
	case this.modelPlug.getSelectedItemTitle:
	    this.setModelValue("setSelectedItemContent",  this.getEntry(this.getModelValue("getSelectedItemTitle")));
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
                return items[i].description();
            }
        }
        return "";
    },
    
    getSelectedItemDescription: function() { 
	return this.getEntry(this.getModelValue("getSelectedItemTitle"));
    },

    buildView: function(extent) {
        var panel = new PanelMorph(extent);
	panel.applyStyle({fill: Color.blue.lighter(2), borderWidth: 2});
	
	var model = this.getModel();
	
        var rect = extent.extentAsRectangle();
        var m = panel.addMorph(newListPane(rect.withBottomRight(rect.bottomCenter())));
        m.connectModel({model: model, getList: "getItemList", 
			setSelection: "setSelectedItemTitle", getMenu: "getItemMenu"});
	m = panel.addMorph(newTextPane(rect.withTopLeft(rect.topCenter())));
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

