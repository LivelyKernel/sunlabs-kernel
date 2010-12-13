/*
 * Copyright (c) 2006-2009 Sun Microsystems, Inc.
 *
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Data.js.  Data manipulation (mostly XML).
 */

module('lively.Data').requires('lively.Network').toRun(function(thisModule) {

// FIX for IE9+
if (typeof XPathResult == 'undefined') {
	// constant values taken from Safari implementation (XPath 3.0)
	Object.subclass('XPathResult', { });
	Object.extend(XPathResult, {
		ANY_TYPE: 0,
		ANY_UNORDERED_NODE_TYPE: 8,
		BOOLEAN_TYPE: 3,
		FIRST_ORDERED_NODE_TYPE: 9,
		NUMBER_TYPE: 1,
		ORDERED_NODE_ITERATOR_TYPE: 5,
		ORDERED_NODE_SNAPSHOT_TYPE: 7,
		STRING_TYPE: 2,
		UNORDERED_NODE_ITERATOR_TYPE: 4,
		UNORDERED_NODE_SNAPSHOT_TYPE: 6
	});
}

// FIX for IE9+
Object.subclass('XPathEmulator', {
	initialize: function() {
		this.xmlDom = new ActiveXObject('MSXML2.DOMDocument.6.0');
		this.xmlDom.setProperty('SelectionLanguage', 'XPath');
	},

	evaluate: function(expr, node, nsResolver) {
		this.xmlDom.setProperty("SelectionNamespaces", (typeof nsResolver == 'function' ? this.createNSResolver() : nsResolver));

		var queryObj;
		try {
			if (node.selectNodes('*'))
				 queryObj = node;
		} catch(e) {
			queryObj = this.xmlDom;
			if (node.outerHTML)
				this.xmlDom.loadXML(node.outerHTML);
			else if (node.ownerDocument.documentElement === node) {
				var serializer = new XMLSerializer();
				this.xmlDom.loadXML(serializer.serializeToString(node));
			} else {
				this.xmlDom.loadXML(node.ownerDocument.documentElement.outerHTML);
				queryObj = this.xmlDom.selectSingleNode('//*[@id="' + node.id + '"]');
			}
		}

		return new XPathEmulatorResult(node, queryObj, expr);
	},

	createNSResolver: function(ctx) {
		var ns = '';
		Properties.forEachOwn(Namespace, function(key, value) { ns += 'xmlns:' + key.toLowerCase() + '="' + value + '" '; });
		return ns;
	},
});

// FIX for IE9+
Object.subclass('XPathEmulatorResult', {
	initialize: function(origNode, queryObj, expr) {
		this.sourceNode = origNode;
		this.result = queryObj.selectNodes(expr);
		this.length = this.result.length;
		this.pointer = 0;
	},

	iterateNext: function() {
		if (this.pointer >= this.length)
			return undefined;

		var res = this.result[this.pointer];
		// sync with original source
		if (this.sourceNode.ownerDocument && (Global.document == this.sourceNode.ownerDocument)) {
			var doc = this.sourceNode.ownerDocument;
			var nodeNoStack = [];
			var curNode = res;
			while (curNode.parentNode) {
				var i = 0;
				while (curNode.previousSibling) {
					curNode = curNode.previousSibling;
					if (curNode.nodeType != 8) i++;
				}
				nodeNoStack.push(i);
				curNode = curNode.parentNode;
			}
			nodeNoStack.pop();

			res = document.documentElement;
			while (nodeNoStack.length > 0) 
				res = (res.children ? $A(res.children)[nodeNoStack.pop()] : $A(res.childNodes)[nodeNoStack.pop()]);
		}

		this.pointer += 1;
		return res;
	},
});

View.subclass('Query',  {
    documentation: "Wrapper around XPath evaluation",

    xpe: Global.XPathEvaluator ? new XPathEvaluator() : (console.log('XPath not available, emulating...') || new XPathEmulator()),
    
    formals: ["+Results", // Node[]
		"-ContextNode", // where to evaluate
	],

	initialize: function(expression, optPlug) {
		//if (!this.xpe) throw new Error("XPath not available");
		this.contextNode = null;
		this.expression = expression;
		if (optPlug) this.connectModel(optPlug);
	},

	establishContext: function(node) {
		if (this.nsResolver) return;
		var ctx = node.ownerDocument ? node.ownerDocument.documentElement : node.documentElement;
		if (ctx !== this.contextNode) {
			this.contextNode = ctx;
			this.nsResolver = this.xpe.createNSResolver(ctx);
		}
	},

	manualNSLookup: function() {
		this.nsResolver = function(prefix) {
			return Namespace[prefix.toUpperCase()] || null;
		}
		return this
	},
	
	updateView: function(aspect, controller) {
		var p = this.modelPlug;
		if (!p) return;
		switch (aspect) {
			case p.getContextNode:
			this.onContextNodeUpdate(this.getContextNode());
			break;
		}
	},
    
	onContextNodeUpdate: function(node) {
		if (node instanceof Document) node = node.documentElement;
		var result = this.findAll(node, null);
		this.setResults(result);
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
	},

});
Object.extend(Query, {
	find: function(expr, doc) {
		return new Query(expr).manualNSLookup().findFirst(doc)
	},

	findAll: function(expr, doc) {
		return new Query(expr).manualNSLookup().findAll(doc)
	},
});

TextMorph.subclass('XPathQueryMorph', {
    documentation: "TextMorph with an associated contextNode, evals result in evaluating XPath queries",
    
    initialize: function($super, bounds, contextNode) {
	$super(bounds, "");
	this.contextNode = contextNode;
    },

    boundEval: function(str) {    
	var xq = new Query(str);
	return Exporter.stringifyArray(xq.findAll(this.contextNode, []), '\n');
    }

});


/// RSS Feed support (will be rewritten)

lively.data.Wrapper.subclass('FeedChannel', {
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
		var n = this.titleQ.findFirst(this.rawNode);
		return n.textContent || n.text; // text is a FIX for IE9+
	},
    
});

lively.data.Wrapper.subclass('FeedItem', {
	documentation: "Convenience wrapper around individual RSS feed items",
	titleQ: new Query("title"),
	descriptionQ: new Query("description"),
	linkQ: new Query("link"),

	initialize: function(rawNode) {
		this.rawNode = rawNode;
	},

	title: function() {
		var n = this.titleQ.findFirst(this.rawNode);
		return n.textContent || n.text; // text is a FIX for IE9+
	},

	description: function() {
		var n = this.descriptionQ.findFirst(this.rawNode);
		return n.textContent || n.text; // text is a FIX for IE9+
	},

	link: function() {
		var n = this.linkQ.findFirst(this.rawNode);
		return n.textContent || n.text; // text is a FIX for IE9+
    },

});

View.subclass('Feed', NetRequestReporterTrait, {

    // FIXME: merge into Resource
    formals: ["-URL", "+FeedChannels"],
    channelQuery: new Query("/rss/channel"),

    updateView: function(aspect, source) { // model vars: getURL, setFeedChannels
        var p = this.modelPlug;
	if (!p) return;
	switch (aspect) {
	case p.getURL:
	    this.onURLChange(this.getURL());
	    break;
	}
    },

    onURLChange: function(newValue) {
	this.request(newValue);
    },
    
    deserialize: Functions.Empty,

    kickstart: function() {
	if (this.formalModel) this.onURLChange(this.getURL());
	else if (this.modelPlug) this.updateView(this.modelPlug.getURL, this);
    },
    
    setRawFeedContents: function(responseXML) {
	this.setFeedChannels(this.parseChannels(responseXML));
    },
    
    request: function(url) {
        var hourAgo = new Date((new Date()).getTime() - 1000*60*60);
	var req = new NetRequest(Relay.newInstance({ ResponseXML: "+RawFeedContents", Status: "+RequestStatus"}, this));
	req.setContentType('text/xml');
	req.setRequestHeaders({ "If-Modified-Since": hourAgo.toString() });
	console.log("feed requesting " + url);
	req.get(url);
    },

    parseChannels: function(elt) {
	var results = this.channelQuery.findAll(elt);
        var channels = [];
        for (var i = 0; i < results.length; i++) {
	    channels.push(new FeedChannel(results[i]));
        }
	return channels;
    }

});


}); // end of module