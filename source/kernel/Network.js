/*
 * Copyright © 2006-2007 Sun Microsystems, Inc.
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

/**
 * @class NetRequest
 */ 

var NetRequest = Class.extend(Ajax.Request);

Object.extend(NetRequest.prototype, {

    logger: {
        onComplete: function(request, transport, json) {
            if (transport.status.toString().startsWith('2')) {
                console.info("%s %s: status %s", request.method, request.url, transport.status);
            } else {
                console.warn("%s %s: status %s", request.method, request.url, transport.status);
            }
        },

        onException: function(request, exception) {
            console.warn("%s %s: exception %s", request.method, request.url, exception);
        }

    },

    initialize: function(url, options) {
        this.requestNetworkAccess();
        NetRequest.superclass.initialize.call(this, this.rewriteURL(url), options);
    },

    rewriteURL: function(url) {
        if (Config.proxyURL) {
            var splitter = new RegExp("http://([^/:]*)(:[0-9]+)?(/.*)");
            var urlMatch = url.match(splitter);
            var proxyMatch = Config.proxyURL.match(splitter);
	    var portMatch = urlMatch[2];
	    if (portMatch) portMatch = "/" + portMatch.substring(1);  // replace ":" with "
	    else portMatch = "";
            if (urlMatch && proxyMatch && (proxyMatch[1] != urlMatch[1] || proxyMatch[2] != urlMatch[2])) {
                var result = Config.proxyURL + urlMatch[1]  + portMatch + urlMatch[3];
	    	//console.warn("url match " + urlMatch + " on " + url + " to " + result);
                return result;
            }
        } 
        return url;
    },
    
    requestNetworkAccess: function() {
        if (window.location.protocol == "file:"  && window["netscape"]) {       
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
      if (this.method == 'get')
        this.url += (this.url.include('?') ? '&' : '?') + params;
      else if (/Konqueror|Safari|KHTML/.test(navigator.userAgent))
        params += '&_=';
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
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();
        
    }
    catch (e) {
      this.dispatchException(e);
    }
  }.logErrors("request"),


    // Overridden for debugging 
  setRequestHeaders: function() {
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

      if (Object.isFunction(extras.push))
        for (var i = 0, length = extras.length; i < length; i += 2)
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value });
    }

    for (var name in headers)
      this.transport.setRequestHeader(name, headers[name]);
  },

    
});

Ajax.Responders.register(NetRequest.prototype.logger);

/**
 * @class FeedChannel
 */ 

var FeedChannel = Class.create({

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

var FeedItem = Class.create({

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

var Feed = Class.create({
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

        new NetRequest(this.url, {
            method: 'get',
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
        });
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
        var title = TextMorph(new Rectangle(0, 0, 150, 15), 'RSS feed                    ').beLabel();
        title.connectModel({model: panel.model, getText: 'getChannelTitle'});
        var window = world.addMorphAt(WindowMorph(panel, title), location);
        this.request(panel.model, "getItemList", 'getChannelTitle');
        return window;
    }
    
});

console.log('loaded Network.js');

