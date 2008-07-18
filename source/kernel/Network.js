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
    },

    subversionWorkspacePath: function() {
	// heuristics to figure out the Subversion path
	var path = this.pathname;
	// note that the trunk/branches/tags convention is only a convention
	var index = path.lastIndexOf('trunk') || path.lastIndexOf('branches') || path.lastIndexOf('tags');
	if (index < 0) throw new Error("url doesn't point inside a svn workspace");
	return "/" + path.substring(index);
    }
    
});

URL.source = new URL(document.baseURI);

URL.proxy = (function() {
    if (!URL.source.protocol.startsWith("file") && !Config.proxyURL) {
	return URL.source.withFilename("/proxy/"); // a default
    } else {
	var str = Config.proxyURL;
	if (!str) return null;
	if (!str.endsWith('/')) str += '/';
	return new URL(str);
    }
})();


URL.subversionWorkspace = (function() {
    // a bit of heuristics to figure the top of the local SVN repository
    var path = URL.source.pathname;
    var index = path.lastIndexOf('trunk') || path.lastIndexOf('branches') || path.lastIndexOf('tags');
    var ws = URL.source.withPath(path.substring(0, index));
    return ws;
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
        if (URL.proxy) {
	    if (URL.proxy.hostname != url.hostname) { // FIXME  protocol?
		url = URL.proxy.withFilename(url.hostname + url.fullPath());
		// console.log("rewrote url " + Object.inspect(url) + " proxy " + URL.proxy);
		// return URL.proxy + url.hostname + "/" + url.fullPath();
	    } else if (URL.proxy.port != url.port) {
		url = URL.proxy.withFilename(url.hostname + "/" + url.port + url.fullPath());
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


View.subclass('Resource', NetRequestReporterTrait, {
    documentation: "a remote document that can be fetched and queried",

    pins: ["ContentDocument", "URL"],

    initialize: function(url, plug) {
	this.forceXML = false;
	if (!plug) plug = new SyntheticModel(this.pins).makePlugSpec();
	this.connectModel(plug);
	if (!this.setModelValue("setURL", url)) // not stored in the model, will store in a var.
	    this.url = url;
    },
    
    updateView: function(aspect, source) { // model vars: getURL, setFeedChannels
        var p = this.modelPlug;
	if (!p) return;
	switch (aspect) {
	case p.getURL:
	    this.fetch(this.getURL()); // request headers?
	    break;
	}
    },

    getURL: function() {
	var url = this.getModelValue("getURL");
	if (!url) return this.url;
	else return url;
    },

    fetch: function(sync, optRequestHeaders) {
	// fetch the document content itself
	var req = new NetRequest({model: this, setResponseXML: "pvtSetDoc", setResponseText: "pvtSetText", setStatus: "setRequestStatus"});
	if (sync) req.beSync();
	if (optRequestHeaders) this.setRequestHeaders(optRequestHeaders);
	req.get(this.getURL());
	return req;
    },

    fetchProperties: function(sync) {
	// fetch the metadata 
	var req = new NetRequest({model: this, setResponseXML: "pvtSetDoc", setStatus: "setRequestStatus"});
	if (sync) req.beSync();
	req.propfind(this.getURL(), 1);
	return req;
    },

    pvtSetText: function(txt) {
	if (this.forceXML) {
	    var parser = new DOMParser();
	    var xml = parser.parseFromString(txt, "text/xml");
	    this.pvtSetDoc(xml);
	} else console.log("expected document, got text " + txt.truncate());
    },

    pvtSetDoc: function(doc) {
	this.setModelValue("setContentDocument", doc);
    },

    findAll: function(query, defaultValue) {
	var content = this.getModelValue("getContentDocument", null);
	if (!content) return defaultValue;
	return query.findAll(content.documentElement, defaultValue);
    }

});



console.log('loaded Network.js');

