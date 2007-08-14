
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
      if (this.method == 'get')
        this.url += (this.url.include('?') ? '&' : '?') + params;
      else if (/Konqueror|Safari|KHTML/.test(navigator.userAgent))
        params += '&_=';
    }

    try {
      if (this.options.onCreate) this.options.onCreate(this.transport);
	
      Ajax.Responders.dispatch('onCreate', this, this.transport);

      this.transport.open(this.method.toUpperCase(), this.url,
        this.options.asynchronous);
	
      if (this.options.asynchronous)
        setTimeout(function() { this.respondToReadyState(1) }.bind(this), 10);

      this.transport.onreadystatechange = this.onStateChange.bind(this);
	
      this.setRequestHeaders();

      this.body = /put|post/.test(this.method) ? (this.options.body || this.options.postBody || params) : null;
	
      this.transport.send(this.body);
      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();

    }
    catch (e) {
	console.log('error %s, stack %s', e, Function.callStack());
	this.dispatchException(e);
    }
};

//debugging
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

      if (typeof extras.push == 'function')
        for (var i = 0, length = extras.length; i < length; i += 2)
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value });
    }

    for (var name in headers) {
	if (!headers.hasOwnProperty(name))
	    continue; //avoid inheriting state, e.g. functions
	// console.log('setting %s = %s', name, headers[name]);
	this.transport.setRequestHeader(name, headers[name]);
    }
};


var NetRequest = Class.create();

Object.extend(NetRequest, {
    options: {
	contentType: 'text/xml',
	asynchronous: true,

	onLoaded: function(transport) { 
	    console.info('loaded %s %s', transport.status, transport); 
	},
	
	onFailure: function(transport) {
	    console.warn('failure %s %s', transport.status, transport);
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
	if (doc != null) 
	    return new XMLSerializer().serializeToString(doc.documentElement); 
	else
	    return "[not xml?]";
    }

});

Object.extend(NetRequest.prototype, {
    
    process: function(documentElement) {
	console.log('override me');
    },

    request: function(url, options, model, variable) {
	if (options === NetRequest.options) 
	    options = options.clone();
        // options.requestHeaders =  { "If-Modified-Since": "Sat, 1 Jan 2000 00:00:00 GMT" };
	options.method = 'get';
        options.onSuccess = function(transport) {
            var result = transport.responseXML.documentElement;
            console.log('success %s', transport.status);
	    this.process(result);
            model.changed(modelVariable);
        }.bind(this);
	new Ajax.Request(url, options);
    }

});

var FeedChannel = Class.create();


Object.extend(FeedChannel.prototype, {
    initialize: function() {
	this.items =  morphic.query(this, 'item') || [];
	for (var i = 0; i < this.items.length; i++) {
	    HostClass.becomeInstance(this.items[i], FeedItem);
	    this.items[i].initialize();
	}
	this.title = (morphic.query(this, 'title') || ['none'])[0].textContent;
	console.log('title %s', this.title);
    }

});

var FeedItem = Class.create();
Object.extend(FeedItem.prototype, {
    initialize: function() {
	this.title = morphic.query(this, 'title')[0].textContent;
	this.description = morphic.query(this, 'description')[0].textContent;
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
	return morphic.query(target ? target : this.result, xpQuery) || [];
    },

    request: function(model /*model variables*/) {
        // console.log('in request on %s', this.url);
        var feed = this;
	var modelVariables = $A(arguments);
	modelVariables.shift();

        new Ajax.Request(this.url, Object.extend({
            method: 'get', 
            requestHeaders: { "If-Modified-Since": "Sat, 1 Jan 2000 00:00:00 GMT" },
	    
            onSuccess: function(transport) {
                var result = transport.responseXML.documentElement;
                console.log('success %s', transport.status);
		if (feed.dump)
		    console.log('transmission dump %s', NetRequest.documentToString(transport.responseXML));
		
		feed.processResult(result);
		console.log('changing %s', modelVariables);
		for (var i = 0; i < modelVariables.length; i++) {
                    model.changed(modelVariables[i]);
		}
            }
	    
        }, NetRequest.options));

    },

    processResult: function(result) {
        this.channels = this.query('/rss/channel', result);
	for (var i = 0; i < this.channels.length; i++) {
	    HostClass.becomeInstance(this.channels[i], FeedChannel);
	    this.channels[i].initialize();
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
    }
    
});
