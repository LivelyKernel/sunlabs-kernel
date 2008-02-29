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
    
    initialize: function(/*...*/) {
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
	} else {
	    var spec = arguments[0];
	    this.protocol = spec.protocol || "http";
	    this.port = spec.port;
	    this.hostname = spec.hostname;
	    this.path = spec.path || "";
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
	return new URL({protocol: this.protocol, port: this.port, hostname: this.hostname, path: 
			result[1], search: result[2], hash: result[3] });
    },
    
    withFilename: function(filename) {
	return new URL({protocol: this.protocol, port: this.port, hostname: this.hostname, path: this.dirname() + filename });
    }
    
});

Object.extend(URL, {
    splitter: new RegExp('(http|https|file)://([^/:]*)(:[0-9]+)?(/.*)?'),
    pathSplitter: new RegExp("([^\\?#]*)(\\?[^#]*)?(#.*)?")
});

/**
 * @class NetRequest
 */ 

var NetRequest = (function() {
    var logger = {
        onComplete: function(request, transport, json) {
            if (transport.status.toString().startsWith('2')) {
                console.info("%s %s: status %s", request.method, request.url, transport.status);
            } else {
                console.warn("%s %s: status %s", request.method, request.url, transport.status);
            }
        },

        onException: function(request, exception) {
            console.warn("%s %s: exception %s", request.method, request.url, exception);
	    if (e.originalStack) { 
		console.log("captured stack:");
		Function.showStack(e.originalStack);
	    }
        }

    };
    Ajax.Responders.register(logger);
    
    var BaseRequest = Class.create(Ajax.Request, {
	
	dispatchException: function($super, e) {
	    e.originalStack = Function.cloneStack();
	    //Function.showStack(e.originalStack);
	    $super(e);
	},

        // literally copied but override prototype.js's verb simulation over post
        request: function(url) {
            this.url = url;
            this.method = this.options.method;
            var params = Object.clone(this.options.parameters);
    
            /* remove simulation over post
              if (!['get', 'post'].include(this.method)) {
               // simulate other verbs over post
               params['_method'] = this.method;
               this.method = 'post';
               }
            */
    
            this.parameters = params;
    
            if (params = Object.toQueryString(params)) {
                // when GET, append parameters to URL
                if (this.method == 'get') {
                    this.url += (this.url.include('?') ? '&' : '?') + params;
                } else if (/Konqueror|Safari|KHTML/.test(navigator.userAgent)) {
                    params += '&_=';
                }
            }
    
            try {
                var response = new Ajax.Response(this);
                if (this.options.onCreate) this.options.onCreate(response);
                Ajax.Responders.dispatch('onCreate', this, response);

                this.transport.open(this.method.toUpperCase(), this.url, 
                                    this.options.asynchronous);

                if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);

                this.transport.onreadystatechange = this.onStateChange.bind(this);
                this.setRequestHeaders();

                // this.body = this.method == 'post' ? (this.options.postBody || params) : null;
                this.body = /put|post/.test(this.method) ? (this.options.body || this.options.postBody || params) : null;

                this.transport.send(this.body);

                /* Force Firefox to handle ready state 4 for synchronous requests */
                if (!this.options.asynchronous && this.transport.overrideMimeType) {
                    this.onStateChange();
                }
            } catch (e) {
                this.dispatchException(e);
            }
        }.logErrors("request"),

        // Overridden for debugging 
        setRequestHeaders: function() {
            var headers = {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
            };
    
            if (this.method == 'post') {
                headers['Content-type'] = this.options.contentType +
                    (this.options.encoding ? '; charset=' + this.options.encoding : '');

                /* Force "Connection: close" for older Mozilla browsers to work
                 * around a bug where XMLHttpRequest sends an incorrect
                 * Content-length header. See Mozilla Bugzilla #246651.
                 */
                if (this.transport.overrideMimeType &&
                    (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
                    headers['Connection'] = 'close';
                }
    
            // user-defined headers
            if (typeof this.options.requestHeaders == 'object') {
                var extras = this.options.requestHeaders;

                if (Object.isFunction(extras.push)) {
                    for (var i = 0, length = extras.length; i < length; i += 2) {
                        headers[extras[i]] = extras[i+1];
                    }
                } else {
                    for (var name in extras) {
                        if (!extras.hasOwnProperty(name)) continue;
                        headers[name] = extras[name];
                    }
                }
            }
    
            for (var name in headers) {
                this.transport.setRequestHeader(name, headers[name]);
            }    
        }

    });
    
    var NetRequest = Object.subclass('NetRequest', {
	
	proxy: Loader.proxyURL ? new URL(Loader.proxyURL.endsWith("/") ? Loader.proxyURL : Loader.proxyURL + "/") : null,
	
        initialize: function(options) {
            this.requestNetworkAccess();
            this.options = options || {};
        },

        beSynchronous: function(flag) {
            if (flag === undefined) flag = true;
            this.options.asynchronous = !flag;
            return this;
        },

        evalJS: function(flag) {
            if (flag === undefined) flag = true;
            this.options.evalJS = flag ? "force" : false;
            return this;
        },

        get: function(url) {
            this.options.method = 'get';
            if (!url.toString().startsWith('http')) {
                url = new URL(Loader.baseURL);
            }
            var req = new BaseRequest(this.rewriteURL(url).toString(), this.options);
            return req.transport;
        },
	
        put: function(url, content) {
            this.options.method = 'put';
            this.options.body = content;
            var req = new BaseRequest(this.rewriteURL(url).toString(), this.options);
            return req.transport;
        },

        remove: function(url) { // delete is a reserved word ...
            this.options.method = 'delete';
            var req = new BaseRequest(this.rewriteURL(url).toString(), this.options);
            return req.transport;
        },

        propfind: function(url, content) {
            this.options.method = 'propfind';
            if (content) this.options.body = content;
            var req = new BaseRequest(this.rewriteURL(url).toString(), this.options);
            return req.transport;
        },

        rewriteURL: function(url) {
	    url = url instanceof URL ? url : new URL(url);
            if (this.proxy) {
		if (this.proxy.hostname != url.hostname) { // FIXME port and protocol?
		    url = this.proxy.withFilename(url.hostname + url.fullPath());
		    // console.log("rewrote url " + Object.inspect(url) + " proxy " + this.proxy);
		    // return this.proxy + url.hostname + "/" + url.fullPath();
		}
	    }
            return url;
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
        }
    });
    return NetRequest;

})();


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


/**
 * @class Feed: RSS feed reader
 */
// FIXME something clever, maybe an external library?

WidgetModel.subclass('Feed', {

    defaultViewExtent: pt(500, 200),
    openTriggerVariable: null,
    
    initialize: function($super, urlString) {
	$super(null);
        this.url = new URL(urlString);
        this.channels = null;
    },
    
    request: function(model /*, ... model variables*/) {
        // console.log('in request on %s', this.url);
        var modelVariables = $A(arguments);
        modelVariables.shift();
        var hourAgo = new Date((new Date()).getTime() - 1000*60*60);
	
        new NetRequest({
            requestHeaders: { "If-Modified-Since": hourAgo.toString()  },
            contentType: 'text/xml',

            onSuccess: function(transport) {
                if (!transport.responseXML) {
                    this.processResult(null);
                    return;
                }
                var result = transport.responseXML.documentElement;
                this.processResult(result);
		
                for (var i = 0; i < modelVariables.length; i++) {
                    model.changed(modelVariables[i]);
                }
            }.bind(this).logErrors('Success Handler for ' + this)
        }).get(this.url);
    },

    toString: function() {
        return "#<Feed: " + this.url + ">";
    },
    
    processResult: function(result) {
        if (!result) {
            console.log('no results for %s', this);
            return;
        }
        var results = Query.evaluate(result, '/rss/channel');
        this.channels = [];
        for (var i = 0; i < results.length; i++) {
            this.channels.push(new FeedChannel(results[i]));
        }
    },
    
    items: function(index) {
        return this.channels[index || 0].items;
    },
    
    getEntry: function(title) {
        var items = this.items();
        for (var i = 0; i < items.length; i++) {
            if (items[i].title() == title) {
                return items[i].description();
            }
        }
        return "";
    },
    
    getItemList: function() { 
	return this.items().invoke('title');
    },

    setItemTitle: function(title) { 
	this.itemTitle = title; 
	this.changed("getCurrentEntry"); 
    },
    
    getCurrentEntry: function() { 
	return this.getEntry(this.itemTitle);
    },

    getChannelTitle: function(index) { 
	return "RSS feed from " + this.channels[index || 0].title(); 
    },

    buildView: function(extent) {
        var panel = new PanelMorph(extent);
	panel.applyStyle({fill: Color.blue.lighter(2), borderWidth: 2});
	
        var rect = extent.extentAsRectangle();
        var m = panel.addMorph(newListPane(rect.withBottomRight(rect.bottomCenter())));
        m.connectModel({model: this, getList: "getItemList", setSelection: "setItemTitle", getMenu: "getItemMenu"});
        
	m = panel.addMorph(newTextPane(rect.withTopLeft(rect.topCenter())));
	m.innerMorph().acceptInput = false;
        m.connectModel({model: this, getText: "getCurrentEntry"});
        return panel;
    },
    
    getItemMenu: function() {
	var feed = this;
	return [ 
	    ["get XML source", function(evt) {
		var index = this.innerMorph().selectedLineNo();
		var item = feed.items()[index];
		var txt = item ? item.toMarkupString() : "?";
		var infoPane = newTextPane(new Rectangle(0, 0, 500, 200), txt);
		infoPane.innerMorph().acceptInput = false;
		this.world().addFramedMorph(infoPane, "XML source for " + item.title(), evt.mousePoint);
	    }]
	];
    },
    
    viewTitle: function() {
	var title = new TextMorph(new Rectangle(0, 0, 150, 15), 'RSS feed                    ').beLabel();
	title.connectModel({model: this, getText: 'getChannelTitle'});
	return title;
    },
    
    openIn: function($super, world, location) {
	var win = $super(world, location);
        this.request(this, "getItemList", 'getChannelTitle');
        return win;
    }
    
});

console.log('loaded Network.js');

