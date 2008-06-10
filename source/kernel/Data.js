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
 * Data.js.  Data manipulation (mostly XML).
 */

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

/*
    resolver: function(prefix) {
	if (prefix == null || prefix == "") 
	    prefix = "SVG";
	else 
	    prefix = prefix.toUpperCase();
	return Namespace[prefix];
    },
*/

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


/// RSS Feed support (will be rewritten)

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

