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
Object.subclass('Location', {
    
    initialize: (function() { 
	var urlSplitter = new RegExp('(http|https|file)://([^/:]*)(:[0-9]+)?(/.*)');
	var pathSplitter = new RegExp("([^\\?#]*)(\\?[^#]*)?(#.*)?");
	
	return function(url) {
	    //console.log('got url ' + url);
	    var result = url.match(urlSplitter);
	    this.protocol = result[1]; 
	    if (!result[1]) throw new Error("bad url " + url + ", " + result);
	    this.hostname = result[2];
	    if (result[3]) 
		this.port = parseInt(result[3].substring(1));
	    
	    var fullpath = result[4];
	    result = fullpath.match(pathSplitter);
	    this.path = result[1];
	    this.search = result[2];
	    this.hash = result[3];
	}
    })(),
    
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
    }
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
	
	proxy: Loader.proxyURL ? new Location(Loader.proxyURL) : null,

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
            if (!url.startsWith('http')) {
                url = Loader.baseURL;
            }
            var req = new BaseRequest(this.rewriteURL(url), this.options);
            return req.transport;
        },
	
        put: function(url, content) {
            this.options.method = 'put';
            this.options.body = content;
            var req = new BaseRequest(this.rewriteURL(url), this.options);
            return req.transport;
        },

        remove: function(url) { // delete is a reserved word ...
            this.options.method = 'delete';
            var req = new BaseRequest(this.rewriteURL(url), this.options);
            return req.transport;
        },

        propfind: function(url, content) {
            this.options.method = 'propfind';
            if (content) this.options.body = content;
            var req = new BaseRequest(this.rewriteURL(url), this.options);
            return req.transport;
        },

        rewriteURL: function(url) {
            if (this.proxy) {
		var loc = new Location(url);
		if (this.proxy.hostname != loc.hostname) { // FIXME port and protocol?
		    return this.proxy + loc.hostname + "/" + loc.fullPath();
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

Object.subclass('FeedChannel', {

    initialize: function(rawData) {
        this.items = [];
        var results = Query.evaluate(rawData, 'item');
    
        for (var i = 0; i < results.length; i++) {
            this.items.push(new FeedItem(results[i]));
        }
    
        this.title = (Query.evaluate(rawData, 'title', 'none'))[0].textContent;
    }

});

/**
 * @class FeedItem: An individual RSS feed item
 */ 

Object.subclass('FeedItem', {

    initialize: function(rawData) {
        this.title = Query.evaluate(rawData, 'title')[0].textContent;
        this.description = Query.evaluate(rawData, 'description')[0].textContent;
        // console.log('created item %s=%s', this.title, this.description);
    }
    
});

/**
 * @class Feed: RSS feed reader
 */
// FIXME something clever, maybe an external library?

Object.subclass('Feed', {
    dump: false,
    
    initialize: function(url) {
        this.url = url;
        this.channels = null;
    },
    
    query: function(xpQuery, target) {
        return Query.evaluate(target ? target : this.result, xpQuery);
    },

    request: function(model /*, ... model variables*/) {
        // console.log('in request on %s', this.url);

        var feed = this;
        var modelVariables = $A(arguments);
        modelVariables.shift();
        var hourAgo = new Date((new Date()).getTime() - 1000*60*60);

        new NetRequest({
            requestHeaders: { "If-Modified-Since": hourAgo.toString()  },
            contentType: 'text/xml',

            onSuccess: function(transport) {
                if (!transport.responseXML) {
                    feed.processResult(null);
                    return;
                }

                var result = transport.responseXML.documentElement;

                if (feed.dump) console.log('transmission dump %s', Exporter.nodeToString(transport.responseXML));

                feed.processResult(result);
                console.log('%s changing %s', feed, modelVariables);

                for (var i = 0; i < modelVariables.length; i++) {
                    model.changed(modelVariables[i]);
                }
            }.logErrors('Success Handler for ' + feed)
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

        var results = this.query('/rss/channel', result);
        this.channels = [];
        for (var i = 0; i < results.length; i++) {
            this.channels.push(new FeedChannel(results[i]));
        }

    },

    items: function() {
        return this.channels[0].items.pluck('title');
    },
    
    getEntry: function(title) {
        var items = this.channels[0].items;
    
        for (var i = 0; i < items.length; i++) {
            if (items[i].title == title) {
                return items[i].description;
            }
        }
        
        return "";
    },

    buildView: function() {
        var extent = pt(500, 200);
        var panel = new PanelMorph(extent);
        panel.addMorph = panel.addMorph.logCalls();
        panel.setFill(Color.blue.lighter().lighter());
        panel.setBorderWidth(2);
        var feed = this;
        panel.model = Object.extend(new Model(), {
            getItemList:     function()      { return feed.items() },
            setItemTitle:    function(title) { this.itemTitle = title; this.changed("getEntry"); },
            getEntry:        function()      { return feed.getEntry(this.itemTitle) },
            getChannelTitle: function()      { return "RSS feed from " + feed.channels[0].title; }
        });

        // View layout
        var localRect = pt(0,0).extent(extent);
        var m = panel.addMorph(ListPane(localRect.withBottomRight(localRect.bottomCenter())));

        m.connectModel({model: panel.model, getList: "getItemList", setSelection: "setItemTitle"});
        m = panel.addMorph(PrintPane(localRect.withTopLeft(localRect.topCenter())));
        m.connectModel({model: panel.model, getValue: "getEntry"});
        return panel;
    },

    openIn: function(world, location) {
        var panel = this.buildView();
        var title = new TextMorph(new Rectangle(0, 0, 150, 15), 'RSS feed                    ').beLabel();
        title.connectModel({model: panel.model, getText: 'getChannelTitle'});
        var window = world.addMorphAt(new WindowMorph(panel, title), location);
        this.request(panel.model, "getItemList", 'getChannelTitle');
        return window;
    }
    
});

console.log('loaded Network.js');

