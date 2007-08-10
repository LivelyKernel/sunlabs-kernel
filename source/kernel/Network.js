
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
    }
});


/**
 * @class Feed: RSS feed reader
 */
  
// FIXME something clever, maybe an external library?
var Feed = Class.create();

Object.extend(Feed.prototype, {

    url: null,
    result: null,
    
    initialize: function(name, url) {
        this.name = name;
        this.url = url;
    },
    
    query: function(xpQuery, target) {
	return morphic.query(target ? target : this.result, xpQuery) || [];
    },

    request: function(model, modelVariable) {
        // console.log('in request on %s', this.url);
        var self = this;
        new Ajax.Request(this.url, Object.extend({
            method: 'get', 
            requestHeaders: { "If-Modified-Since": "Sat, 1 Jan 2000 00:00:00 GMT" },

            onSuccess: function(transport) {
                self.result = transport.responseXML.documentElement;
                console.log('success %s', transport.status);
                var channels = self.query('/rss/channel');
                var items = self.query('/rss/channel/item');
                console.log('items ' + items.length); 
		
                self.contents = new Hash();
                
                for (var i = 0; i < items.length; i++) {
                    var title = self.query('title', items[i])[0].textContent;
                    self.contents[title] =  self.query('description', items[i])[0].textContent;
                }
                
                model.changed(modelVariable);
            }
	    
        }, NetRequest.options));
    },

    items: function() {
        return this.contents.keys();
    },
    
    getEntry: function(title) {
        return this.contents[title];
    }
    
});
