/**
 * Network.js.  Networking extensions for the Flair system.
 *
 * Note: In a browser-based implementation of the Flair system,
 * most of the necessary networking functionality is inherited
 * from the browser.  
 */

// explicitly override prototype.js's verb simulation over post
Ajax.Request.prototype.request = function(url) {
    this.url = url;
    this.method = this.options.method;
    var params = Object.clone(this.options.parameters);
    /*
    if (!['get', 'post'].include(this.method)) {
      // simulate other verbs over post
      params['_method'] = this.method;
      this.method = 'post';
    }
    */

    this.parameters = params;

    if (params = Hash.toQueryString(params)) {
        // when GET, append parameters to URL
        if (this.method == 'get') {
            this.url += (this.url.include('?') ? '&' : '?') + params;
        } else if (/Konqueror|Safari|KHTML/.test(navigator.userAgent)) {
            params += '&_=';
        }
    }

    try {
        if (this.options.onCreate) this.options.onCreate(this.transport);

        Ajax.Responders.dispatch('onCreate', this, this.transport);

        this.transport.open(this.method.toUpperCase(), this.url,
                            this.options.asynchronous);

        if (this.options.asynchronous) {
            setTimeout(function() { this.respondToReadyState(1) }.bind(this).logErrors('Network Timer'), 10);
        }

        this.transport.onreadystatechange = this.onStateChange.bind(this).logErrors('Network Request Handler');

        this.setRequestHeaders();

        this.body = /put|post/.test(this.method) ? (this.options.body || this.options.postBody || params) : null;

        this.transport.send(this.body);
      
        /* Force Firefox to handle ready state 4 for synchronous requests */
        if (!this.options.asynchronous && this.transport.overrideMimeType) {
            this.onStateChange();
        }

    } catch (e) {
        console.log('error %s, stack %s', e, Function.callStack());
        this.dispatchException(e);
    }
};

// Debugging
Ajax.Request.prototype.setRequestHeaders = function() {
    var headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Prototype-Version': Prototype.Version,
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

        if (typeof extras.push == 'function') {
            for (var i = 0, length = extras.length; i < length; i += 2) {
                headers[extras[i]] = extras[i+1];
            }
        } else {
            $H(extras).each(function(pair) { headers[pair.key] = pair.value });
        }
    }

    for (var name in headers) {
        // Avoid inheriting state, e.g. functions
        if (!headers.hasOwnProperty(name)) continue;

        // console.log('setting %s = %s', name, headers[name]);
        this.transport.setRequestHeader(name, headers[name]);
    }
};

/**
 * @class NetRequest
 */ 

var NetRequest = Class.create();

Object.extend(NetRequest, {
    options: {
        contentType: 'text/xml',
        asynchronous: true,
        requester: null,

        onLoaded: function(transport) { 
            console.info('%s: loaded %s %s', transport.status, transport); 
        },

        onFailure: function(transport) {
            console.warn('%s: failure %s %s', transport.status, transport);
        },

        onInteractive: function(transport) {
            console.info('receiving %s %s', transport.status, transport);
        },

        onException: function(e) {
            console.warn('exception %s', e);
        }
    },
    
    requestNetworkAccess: function() {
        if (window.location.href.startsWith('file:')) {       
            this['netscape'] && netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
        }
    },
    
    documentToString: function(doc) {
        if (doc != null) return new XMLSerializer().serializeToString(doc.documentElement); 
        else return null;
    }

});

Object.extend(NetRequest.prototype, {
    
    initialize: function(model) {
        this.model = model;
    },

    process: function(transport) {
        console.log('override me');
    },

    request: function(url, options) {
        if (options === NetRequest.options) options = options.clone();
    
        options = Object.derive(NetRequest.options, options);
        
        options.onSuccess = function(transport) {
            var result = transport;
            console.info('%s success, status %s', url, transport.status);
            this.process(result);
        }.bind(this);
    
        new Ajax.Request(url, options);
    }

});

/**
 * @class FeedChannel
 */ 

var FeedChannel = Class.create();

Object.extend(FeedChannel.prototype, {

    become: function() {
        this.items = Query.evaluate(this, 'item');
    
        for (var i = 0; i < this.items.length; i++) {
            HostClass.becomeInstance(this.items[i], FeedItem);
            this.items[i].become();
        }
    
        this.title = (Query.evaluate(this, 'title', 'none'))[0].textContent;
    }

});

/**
 * @class FeedItem
 */ 

var FeedItem = Class.create();

Object.extend(FeedItem.prototype, {

    become: function() {
        this.title = Query.evaluate(this, 'title')[0].textContent;
        this.description = Query.evaluate(this, 'description')[0].textContent;
        // console.log('created item %s=%s', this.title, this.description);
    }
    
});

/**
 * @class Feed: RSS feed reader
 */
// FIXME something clever, maybe an external library?

var Feed = Class.create();

Object.extend(Feed.prototype, {
    
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

        new Ajax.Request(this.url, Object.derive(NetRequest.options, {
            method: 'get',
            requestHeaders: { "If-Modified-Since": "Sat, 1 Jan 2000 00:00:00 GMT" },
        
            onSuccess: function(transport) {
                if (!transport.responseXML) {
                    feed.processResult(null);
                   return;
                }

                var result = transport.responseXML.documentElement;
                console.info('%s: success %s', feed, transport.status);
        
                if (feed.dump) console.log('transmission dump %s', NetRequest.documentToString(transport.responseXML));
        
                feed.processResult(result);
                console.log('%s changing %s', feed, modelVariables);

                for (var i = 0; i < modelVariables.length; i++) {
                    model.changed(modelVariables[i]);
                }
            }.logErrors('Success Handler for ' + feed)
        }));
    },

    toString: function() {
        return "#<Feed: " + this.url + ">";
    },
    
    processResult: function(result) {
        if (!result) {
            console.log('no results for %s', this);
           return;
        }

        this.channels = this.query('/rss/channel', result);
    
        for (var i = 0; i < this.channels.length; i++) {
            HostClass.becomeInstance(this.channels[i], FeedChannel);
            this.channels[i].become();
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
        var panel = PanelMorph(extent, "rect");
        panel.addMorph = panel.addMorph.logCalls('addMorph');
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
        var title = TextMorph.makeLabel(Rectangle(0, 0, 150, 15), 'RSS feed                    ');
        title.connectModel({model: panel.model, getText: 'getChannelTitle'});
        var window = world.addMorphAt(WindowMorph(panel, title), location);
        this.request(panel.model, "getItemList", 'getChannelTitle');
        return window;
    }
    
});

console.log('loaded Network.js');

