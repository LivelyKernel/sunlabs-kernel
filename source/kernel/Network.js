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
    splitter: new RegExp('(http:|https:|file:)' + '(//[^/:]*(:[0-9]+)?)?' + '(/.*)?'),
    pathSplitter: new RegExp("([^\\?#]*)(\\?[^#]*)?(#.*)?"),
    
    initialize: function(/*...*/) { // same field names as window.location
	if (arguments[0] instanceof String || typeof arguments[0] == 'string') {
	    var urlString = arguments[0];
	    var result = urlString.match(this.splitter);
	    if (!result) throw new Error("malformed URL string '" + urlString + "'");
	    this.protocol = result[1]; 
	    if (!result[1]) 
		throw new Error("bad url " + urlString + ", " + result);
	    this.hostname = result[2] && result[2].substring(2); // skip the leading slashes
	    this.port = result[3] && parseInt(result[3].substring(1)); // skip the colon
	    
	    var fullpath = result[4];
	    if (fullpath) {
		result = fullpath.match(this.pathSplitter);
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
	var result = path.match(this.pathSplitter);
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
	Properties.forEachOwn(record, function(p) {
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

URL.source = new URL(document.baseURI);

var Loader = {

    loadScript: function(ns, url) {
	ns = ns || Namespace.XHTML;
	var script = NodeFactory.createNS(ns, "script");
	var srcAttr = ns === Namespace.XHTML ? "src" : "href";
	script.setAttributeNS(ns === Namespace.XHTML ? ns : Namespace.XLINK, scrAttr, url);
	document.documentElement.appendChild(script);
	//document.documentElement.removeChild(script);
    },

    insertContents: function(iframe) {
	var node = iframe.contentDocument.documentElement;
	document.documentElement.appendChild(document.importNode(node, true));
    },

    isLoadedFromNetwork: (function() {
	// TODO this is not foolproof.
	return document.baseURI.startsWith("http");
    })(),

    baseURL: (function() {
	var segments = document.baseURI.split('/');
	segments.splice(segments.length - 1, 1); // remove the last segment, incl query
	return segments.join('/');
    })()
};

Loader.proxy = (function() {
    var str;
    if (Loader.isLoadedFromNetwork && !Config.proxyURL) {
	str = Loader.baseURL + "/proxy/"; // a default
    } else {
	str = Config.proxyURL;
    }
    if (!str) return null;
    if (!str.endsWith('/')) str += '/';
    return new URL(str);
})();


Object.subclass('NetRequestStatus', {
    documentation: "nice parsed status information, returned by NetRequest.getStatus when request done",

    initialize: function(method, url, transport) {
	this.method = method;
	this.url = url;
	this.transport = transport;
	this.exception = null;
    },
    
    isSuccess: function() {
	var code = this.transport.status;
	return code >= 200 && code < 300;
    },

    setException: function(e) {
	this.exception = e;
    },

    toString: function() {
	return Strings.format("#<NetRequestStatus{%s,%s,%s}>", this.method, this.url, this.exception || this.transport.status);
    },
    
    requestString: function() {
	return this.method + " " + this.url;
    },

    code: function() {
	return this.transport.status;
    },

    getResponseHeader: function(name) {
	return this.transport.getResponseHeader(name);
    }

});



View.subclass('NetRequest', {
    documentation: "a view that writes the contents of an http request into the model",
    
    // see XMLHttpRequest documentation for the following:
    Unsent: 0,
    Opened: 1,
    HeadersReceived: 2,
    Loading: 3,
    Done: 4,

    pins: ["+Status",  // Updated once, when request is {Done} with the value returned from 'getStatus'.
	   "+ReadyState", // Updated on every state transition of the request.
	   "+ResponseXML", // Updated at most once, when request state is {Done}, with the parsed XML document retrieved.
	   "+ResponseText" // Updated at most once, when request state is {Done}, with the text content retrieved.
	  ],
    
    rewriteURL: function(url) {
	url = url instanceof URL ? url : new URL(url);
        if (Loader.proxy) {
	    if (Loader.proxy.hostname != url.hostname) { // FIXME port and protocol?
		url = Loader.proxy.withFilename(url.hostname + url.fullPath());
		// console.log("rewrote url " + Object.inspect(url) + " proxy " + Loader.proxy);
		// return Loader.proxy + url.hostname + "/" + url.fullPath();
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
        if (Global.netscape && Global.location.protocol == "file:") {       
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
	    this.setModelValue('setStatus', this.getStatus());
	    if (this.transport.responseText) 
		this.setModelValue('setResponseText', this.getResponseText());
	    if (this.transport.responseXML) 
		this.setModelValue('setResponseXML', this.getResponseXML());
	    this.disconnectModel(); // autodisconnect?
	}
    },

    setRequestHeaders: function(record) {
	Properties.forEachOwn(record, function(prop) {
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
	return new NetRequestStatus(this.method, this.url, this.transport);
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
	    Properties.forEachOwn(this.requestHeaders, function(p) {
		this.transport.setRequestHeader(p, this.requestHeaders[p]);
	    }, this);
	    this.transport.send(content || undefined);
	    return this;
	} catch (er) {
	    var status = this.getStatus();
	    status.setException(er);
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


// extend your objects with this trait if you don't want to deal with error reporting yourself.
NetRequestReporterTrait = {
    setRequestStatus: function(status) { 
	var world = WorldMorph.current();
	// error reporting
	if (status.exception) {
	    world.alert("exception " + status.exception + " accessing " + status.requestString());
	} else if (status.code() >= 300) {
	    if (status.code() == 301) {
		// FIXME reissue request? need the 'Location' response header for it
		world.alert("HTTP/301: Moved to " + status.getResponseHeader("Location") + "\non " + status.requestString());
	    } else if (status.code() == 401) {
		world.alert("not authorized to access " + status.requestString()); 
		// should try to authorize
	    } else {
		world.alert("failure to " + status.requestString() + " code " + status.code());
	    }
	} else 
	    console.log("status " + status.code() + " on " + status.requestString());
    }
};

// convenience base class with built in handling of errors
Object.subclass('NetRequestReporter', NetRequestReporterTrait);

Importer.subclass('NetImporter', NetRequestReporterTrait, {
    onCodeLoad: function(error) {
	if (error) WorldMorph.current().alert("eval got error " + error);
    },
    
    pvtLoadCode: function(responseText) {
	try {
	    eval(responseText); 
	} catch (er) {
	    this.onCodeLoad(er);
	    return;
	}
	this.onCodeLoad(null);
    },
    
    loadCode: function(url, isSync) {
	var req = new NetRequest({model: this, setResponseText: "pvtLoadCode", setStatus: "setRequestStatus"});
	if (isSync) req.beSync();
	req.get(url);
    },

    onWorldLoad: function(world, error) {
	if (error) WorldMorph.current().alert("doc got error " + error);
    },

    pvtLoadMarkup: function(doc) {
	var world;
	try {
	    world = this.loadWorldContents(doc);
	} catch (er) {
	    this.onWorldLoad(null, er);
	    return;
	}
	this.onWorldLoad(world, null);
    },
    
    loadMarkup: function(url, isSync) {
	var req = new NetRequest({model: this, setStatus: "setRequestStatus", setResponseXML: "pvtLoadMarkup"});
	if (isSync) req.beSync();
	req.get(url);
    },
    
    loadElement: function(filename, id) {
	var result;
	this.processResult = function(doc) {
	    var elt = doc.getElementById(id);
	    if (elt) {
		var canvas = document.getElementById("canvas"); // note, no error handling
		var defs = canvas.getElementsByTagName("defs")[0];
		result = defs.appendChild(document.importNode(elt, true));
	    }
	}
	var url = URL.source.withFilename(filename);
	new NetRequest({model: this, setStatus: "setRequestStatus", setResponseXML: "processResult"}).beSync().get(url);
	return result;
    }

});




View.subclass('Query',  {
    documentation: "Wrapper around XPath evaluation",

    xpe: Global.XPathEvaluator && new XPathEvaluator(),
    
    pins: ["+Results", // Node[]
	   "-ContextNode", // where to evaluate
	  ],

    initialize: function(expression, optPlug) {
	if (!this.xpe) throw new Error("XPath not available");
	this.contextNode = null;
	this.expression = expression;
	if (optPlug) this.connectModel(optPlug);
    },

    establishContext: function(node) {
	var ctx = node.ownerDocument ? node.ownerDocument.documentElement : node.documentElement;
	if (ctx !== this.contextNode) {
	    this.contextNode = ctx;
	    this.nsResolver = this.xpe.createNSResolver(ctx);
	}
    },

    updateView: function(aspect, controller) {
	var p = this.modelPlug;
	if (!p) return;
	switch (aspect) {
	case p.getContextNode:
	    var node = this.getModelValue("getContextNode", document);
	    if (node instanceof Document) node = node.documentElement;
	    var result = this.findAll(node, null);
	    this.setModelValue("setResults", result);
	    break;
	}
    },

    resolver: function(prefix) {
	if (prefix == null || prefix == "") 
	    prefix = "SVG";
	else 
	    prefix = prefix.toUpperCase();
	return Namespace[prefix];
    },

    findAll: function(node, defaultValue) {
	this.establishContext(node);
	var result = this.xpe.evaluate(this.expression, node, this.nsResolver, XPathResult.ANY_TYPE, null);
	var accumulator = [];
	var res = null;
	while (res = result.iterateNext()) accumulator.push(res);
	return accumulator.length > 0 || defaultValue === undefined ? accumulator : defaultValue;
    },

    findFirst: function(node) {
	this.establishContext(node);
	var result = this.xpe.evaluate(this.expression, node, this.nsResolver, XPathResult.ANY_TYPE, null);
	return result.iterateNext();
    }

});




Wrapper.subclass('FeedChannel', {
    documentation: "Convenience wrapper around RSS Feed Channel XML nodes",

    titleQ: new Query("title"),
    itemQ: new Query("item"),

    initialize: function(rawNode) {
	this.rawNode = rawNode;
        this.items = [];
        var results = this.itemQ.findAll(rawNode);
	
        for (var i = 0; i < results.length; i++) {
            this.items.push(new FeedItem(results[i]));
        }
    },

    title: function() {
	return this.titleQ.findFirst(this.rawNode).textContent;
    }
    
});

Wrapper.subclass('FeedItem', {
    documentation: "Convenience wrapper around individual RSS feed items",
    titleQ: new Query("title"),
    descriptionQ: new Query("description"),

    initialize: function(rawNode) {
	this.rawNode = rawNode;
    },
    
    title: function() {
	return this.titleQ.findFirst(this.rawNode).textContent;
    },

    description: function() {
	return this.descriptionQ.findFirst(this.rawNode).textContent;
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
	var results = new Query("/rss/channel").findAll(elt);
        var channels = [];
        for (var i = 0; i < results.length; i++) {
	    channels.push(new FeedChannel(results[i]));
        }
	return channels;
    }

});

console.log('loaded Network.js');

