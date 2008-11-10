/*
 * Copyright ï¿½ 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

/**
* Core.js.  This file contains the core system definition
* as well as the core Morphic graphics framework. 
*/


/* Code loader. Appends file to DOM. */
var Loader = {
    
    wasLoaded: {},
    
    pendingActions: [],
    
    pendingActionsFor: function(url) {
        return Loader.pendingActions.inject([], function(all, ea) {
            if (ea.url == url) all.push(ea);
            return all;
        }); 
    },
    
    loadScripts: function(urls, actionWhenDone) {
        if (urls.length == 0) {
            actionWhenDone();
            return;
        };
        var notifier = function(url) {
            urls = urls.without(url);
            if (urls.length == 0) actionWhenDone();
        };
        urls.forEach(function(ea) { Loader.loadScript(ea, notifier.curry(ea)) });
    },
    
    loadScript: function(url /*not really a url yet*/, onLoadAction, embedSerializable) {
        console.log('Begin to load ' + url + (embedSerializable ? ' into <defs>' : ''));
        if (document.getElementById(url)) {
            // console.log(url + ' already loaded');
            if (onLoadAction) {
                if (Loader.wasLoaded[url]) {
                    console.log("The action which is dependend from " + url +
                                " will be directly run because " + url + " is in the DOM and loaded");
                    onLoadAction();
                    // When url is already there, onModuleLoad isn't run again, so remove url from the requirement list manually
                    if (noPendingRequirements(url)) moduleLoaded(url);
                } else  {
                    // in the DOM but not loaded yet
                    // console.log('adding a pending action for ' + url);
                    Loader.pendingActions.unshift({url: url, action: onLoadAction});
                }
            };
            return;
        };
        
	// add it to other script elements in svg to make it serializable
        var node = document.getElementsByTagName(embedSerializable ? "defs" : "script")[0];

	
        var script = document.createElement('script');
        script.id = url;
        script.type = 'text/javascript';
        script.src = url;
        
        var loaderWrapper = function() {
            if (onLoadAction) {
                onLoadAction();
                // why signal moduleLoaded again? should already be included in onLoadAction...???
                if (noPendingRequirements(url)) moduleLoaded(url);
            }
            Loader.wasLoaded[url] = true;
            Loader.pendingActionsFor(url).forEach(function(ea) {
                // console.log(url + ' was loaded. Loading now its pending action for ' + ea.url);
                ea.action();
                if (noPendingRequirements(ea.url)) moduleLoaded(ea.url);
            });
        };
        script.onload = loaderWrapper;
        node.appendChild(script);
        
        return this;
    }
};

    


// ===========================================================================
// Error/warning console (browser dependent)
// ===========================================================================

// console handling
(function() { 
    
    // from firebug lite
    function escapeHTML(value) {
	return value;
	
	function replaceChars(ch) {
	    switch (ch) {
	    case "<":
		return "&lt;";
	    case ">":
		return "&gt;";
	    case "&":
		return "&amp;";
	    case "'":
		return "&#39;";
	    case '"':
		return "&quot;";
	    }
	    return "?";
	}
	
	return String(value).replace(/[<>&"']/g, replaceChars); //KP: this comment to workaround a bug in my Emacs's javascript mode " ])
    }
    
    function LogWindow() {
	this.win = (function() { 
	    var win = Global.window.open("", "log", "scrollbars,width=900,height=300"); 
	    win.title = "Lively Kernel Log";
	    win.document.write("<pre>"); 
	    return win; 
	})();
	
	this.log = function(msg) {
	    if (!this.win) return;
	    this.win.document.writeln(escapeHTML(msg));
	}
    };
    
    var platformConsole = Global.window.console || ( Global.window.parent && Global.window.parent.console); 
    if (!platformConsole) {
	window.alert && window.alert('no console! console output disabled');
	platformConsole = { log: function(msg) { } } // do nothing as a last resort
    }
    
    if (platformConsole.warn && platformConsole.info && platformConsole.assert) {
	// it's a Firebug/Firebug lite console, it does all we want, so no extra work necessary
	try {
            Global.console = platformConsole;
            Global.console.consumers = [platformConsole]; // compatibility fix	        
	} catch (e) {
	    platformConsole.log('Problem with setting Global.console?');
	}
    } else {
	// rebind to something that has all the calls
	Global.console = {
	    
	    consumers: [ platformConsole], // new LogWindow() ],
	    
	    warn: function() {
		var args = $A(arguments);
		this.consumers.forEach(function(c) { 
		    if (c.warn) c.warn.apply(c, args); 
		    else c.log("Warn: " + Strings.formatFromArray(args));
		});
	    },
	    
	    info: function() {
		var args = $A(arguments);
		this.consumers.forEach(function(c) { 
		    if (c.info) c.info.apply(c, args); 
		    else c.log("Info: " + Strings.formatFromArray(args));
		});
	    },
	    
	    log: function() {
		this.consumers.invoke('log', Strings.formatFromArray($A(arguments)));
	    },
	    
	    assert: function(expr, msg) {
		if (!expr) this.log("assert failed:" + msg);
	    }
	}
    }
    
})(); 

Object.extend(Global.window, {
    onerror: function(message, url, code) {
	console.log('in %s: %s, code %s', url, message, code);
    },
    onbeforeunload: function(evt) { 
	if (Config.askBeforeQuit) {
	    var msg = "Lively Kernel data may be lost if not saved.";
	    evt.returnValue = msg; 
	    return msg;
	} else return null;
    }
    // onblur: function(evt) { console.log('window got blur event %s', evt); },
    // onfocus: function(evt) { console.log('window got focus event %s', evt); }
});


(function() { // override config options with options from the query part of the URL

    // may have security implications ...
    var query = Global.document.baseURI.split('?')[1];
    if (!query) return;

    var configOverrides = query.toQueryParams();
    for (var p in configOverrides) {
	if (Config.hasOwnProperty(p)) { // can't set unknown properties
	    // this is surprisingly convoluted in Javascript:
	    if ((typeof Config[p].valueOf()) === 'boolean') { 
		// make sure that "false" becomes false
		Config[p] = configOverrides[p].toLowerCase() == "true";
	    } else {
		Config[p] = configOverrides[p];
	    }
	} else {
	    console.log("ignoring unknown property " + p);
	}
    }
})();    


// ===========================================================================
// DOM manipulation (Browser and graphics-independent)
// ===========================================================================

Namespace =  {
    SVG : "http://www.w3.org/2000/svg", 
    LIVELY : UserAgent.usableNamespacesInSerializer ? "http://www.experimentalstuff.com/Lively"  : null, 
    XLINK : "http://www.w3.org/1999/xlink", 
    XHTML: "http://www.w3.org/1999/xhtml"
};

var Converter = {
    documentation: "singleton used to parse DOM attribute values into JS values",


    toBoolean: function toBoolean(string) {
	return string && string == 'true';
    },

    fromBoolean: function fromBoolean(object) {
	if (object == null) return "false";
	var b = object.valueOf();
	// this is messy and should be revisited
	return (b === true || b === "true") ? "true" : "false";
    },

    parseInset: function(string) {
	// syntax: <left>(,<top>(,<right>,<bottom>)?)?
	
	if (!string || string == "none") return null;
	try {
	    var box = string.split(",");
	} catch (er) {alert("string is " + string + " string? " + (string instanceof String)) }
	var t, b, l, r;
	switch (box.length) {
	case 1:
	    b = l = r = t = lively.Length.parse(box[0].strip());
	    break;
	case 2:
	    t = b = lively.Length.parse(box[0].strip());
	    l = r = lively.Length.parse(box[1].strip());
	    break;
	case 4:
	    t = lively.Length.parse(box[0].strip());
	    l = lively.Length.parse(box[1].strip());
	    b = lively.Length.parse(box[2].strip());
	    r = lively.Length.parse(box[3].strip());
	    break;
	default:
	    console.log("unable to parse padding " + padding);
	    return null;
	} 
        return Rectangle.inset(t, l, b, r);
    },

    wrapperAndNodeEncodeFilter: function(baseObj, key) {
	var value = baseObj[key];
	if (value instanceof lively.data.Wrapper) return value.uri();
	if (value instanceof Document || value instanceof Element || value instanceof DocumentType)
        return JSON.serialize({XML: Exporter.stringify(value)});
	return value;
    },

    nodeEncodeFilter: function(baseObj, key) {
        var value = baseObj[key];
	if (!value) return value;
        if (!value.nodeType) return value;
        if (value.nodeType !== document.DOCUMENT_NODE && value.nodeType !== document.DOCUMENT_TYPE_NODE)
            return JSON.serialize({XML: Exporter.stringify(value)});
        throw new Error('Cannot store Document/DocumentType'); // to be removed
    },
    
    toJSONAttribute: function(obj) {
	return obj ? escape(JSON.serialize(obj, Converter.wrapperAndNodeEncodeFilter)) : "";
    },

    nodeDecodeFilter: function(baseObj, key) {
	var value = baseObj[key];
	if (!value || !Object.isString(value) || !value.include('XML')) return value;
	var unserialized = JSON.unserialize(value);
	if (!unserialized.XML) return value;
	// var xmlString = value.substring("XML:".length);
	// FIXME if former XML was an Element, it has now a new parentNode, seperate in Elements/Documents?
	//dbgOn(true);
	var node = new DOMParser().parseFromString(unserialized.XML, "text/xml");
        return document.importNode(node.documentElement, true);
    },

    fromJSONAttribute: function(str) {
	return str ?  JSON.unserialize(unescape(str), Converter.nodeDecodeFilter) : null;
    },
    
    needsJSONEncoding: function(value) {
	// some objects can be saved in as DOM attributes using their
	// .toString() form, others need JSON
	if (value instanceof Color) return false;
	var type = typeof value.valueOf();
	return type != "string" && type != "number"; 
    },

    encodeProperty: function(prop, propValue) {
	var desc = LivelyNS.create("field", {name: prop});
	if (Converter.isJSONConformant(propValue) || propValue instanceof Array) { // hope for the best wrt/arrays
	    // FIXME: deal with arrays of primitives etc?
	    var encoding;
	    if (propValue === null)
		encoding = NodeFactory.createText("null");
	    else switch (typeof propValue) {
	    case "number":
	    case "boolean":
		encoding = NodeFactory.createText(String(propValue));
		break;
	    default:
		encoding = NodeFactory.createCDATA(JSON.serialize(propValue, Converter.nodeEncodeFilter));
	    }
	    desc.appendChild(encoding);
	    return desc;
	} 
	
	if (propValue && propValue.toLiteral) {
	    desc.setAttributeNS(null, "family", propValue.constructor.type);
	    desc.appendChild(NodeFactory.createCDATA(JSON.serialize(propValue.toLiteral())));
	    return desc;
	}
	if (propValue.nodeType) {
	    switch (propValue.nodeType) {
	    case document.DOCUMENT_NODE:
	    case document.DOCUMENT_TYPE_NODE:
		throw new Error('Cannot store Document/DocumentType'); // to be removed
	    default:
		desc.setAttributeNS(null, "isNode", true); // Replace with DocumentFragment
		desc.appendChild(propValue);
	    }
	    return desc;
	} 
	return null;
    },
    
    isJSONConformant: function(value) { // for now, arrays not handled but could be
        if (value instanceof Element && value.ownerDocument === document) return false;
        // why disallow all objects?
	// KP: because we don't know how to handle them up front, special cases handled bye encodeProperty
	// this makes simple objects like {a: 1} hard to serialize
	// fix for now: objects can determine by themselves if isJSONConformant should be true
        return value == null || value.isJSONConformant || (typeof value.valueOf()  !== 'object');
    }

};


var NodeFactory = {

    createNS: function(ns, name, attributes) {
	var element = Global.document.createElementNS(ns, name);
	return NodeFactory.extend(ns, element, attributes);
    },

    create: function(name, attributes) {
	//return this.createNS(Namespace.SVG, name, attributes);  // doesn't work
	var element = Global.document.createElementNS(Namespace.SVG, name);
	return NodeFactory.extend(null, element, attributes);
    },

    extend: function(ns, element, attributes) {
	if (attributes) {
	    for (var name in attributes) {
		if (!attributes.hasOwnProperty(name)) continue;
		element.setAttributeNS(ns, name, attributes[name]);
	    }
	}
	return element;
    },

    createText: function(string) {
	return Global.document.createTextNode(string);
    },
    
    createNL: function(string) {
	return Global.document.createTextNode("\n");
    },

    createCDATA: function(string) {
	return Global.document.createCDATASection(string);
    }


};

XLinkNS = {
    setHref: function(node, href) {
	return node.setAttributeNS(Namespace.XLINK, "href", href);
    },
    
    getHref: function(node) {
	return node.getAttributeNS(Namespace.XLINK, "href");
    }
};

LivelyNS = {
    
    create: function(name, attributes) {
	return NodeFactory.createNS(Namespace.LIVELY, name, attributes);
    },
    
    getAttribute: function(node, name) {
	return node.getAttributeNS(Namespace.LIVELY, name);
    },

    removeAttribute: function(node, name) {
	return node.removeAttributeNS(Namespace.LIVELY, name);
    },

    setAttribute: function(node, name, value) {
	node.setAttributeNS(Namespace.LIVELY, name, value);
    },

    getType: function(node) {
	return node.getAttributeNS(Namespace.LIVELY, "type");
    },
    
    setType: function(node, string) {
	node.setAttributeNS(Namespace.LIVELY, "type", string);
    }
};

    
Class.addMixin(lively.data.DOMRecord, lively.data.Wrapper.prototype);
Class.addMixin(lively.data.DOMNodeRecord, lively.data.Wrapper.prototype);



console.log("Loaded basic DOM manipulation code");

// ===========================================================================
// Event handling foundations
// ===========================================================================

/**
  * @class Event: replacement Event class. (NOTE: PORTING-SENSITIVE CODE)
  * The code below rebinds the Event class to a LK substitute that wraps around 
  * the browser implementation.
  * For a detailed description of the Event class provided by browsers,
  * refer to, e.g., David Flanagan's book (JavaScript: The Definitive Guide).
  */

var Event = (function() {
    var tmp = Event; // note we're rebinding the name Event to point to a different class 

    var capitalizer = { mouseup: 'MouseUp', mousedown: 'MouseDown', mousemove: 'MouseMove', 
	mouseover: 'MouseOver', mouseout: 'MouseOut', mousewheel: 'MouseWheel',
	keydown: 'KeyDown', keypress: 'KeyPress', keyup: 'KeyUp' };


    var Event = Object.subclass('Event', {

	initialize: function(rawEvent) {
	    this.rawEvent = rawEvent;
	    this.type = capitalizer[rawEvent.type] || rawEvent.type;
	    //this.charCode = rawEvent.charCode;

	    if (isMouse(rawEvent)) {
		var x = rawEvent.pageX || rawEvent.clientX;
		var y = rawEvent.pageY || rawEvent.clientY;
		var topElement = this.canvas().parentNode;

		// note that FF doesn't doesnt calculate offsetLeft/offsetTop early enough we don't precompute these values
		// assume the parent node of Canvas has the same bounds as Canvas
		this.mousePoint = pt(x - (topElement.offsetLeft || 0), 
				     y - (topElement.offsetTop  || 0) - 3);
		// console.log("mouse point " + this.mousePoint);
		//event.mousePoint = pt(event.clientX, event.clientY  - 3);
		this.priorPoint = this.mousePoint; 
	    } 
	    this.hand = null;

	    // use event.timeStamp
	    // event.msTime = (new Date()).getTime();
	    this.mouseButtonPressed = false;
	},

	simpleCopy: function() {
	    return new Event(this.rawEvent);
	},

	canvas: function() {
	    if (!UserAgent.usableOwnerSVGElement) {
		// so much for multiple worlds on one page
		return Global.document.getElementById("canvas");
	    } else {
		return this.rawEvent.currentTarget.ownerSVGElement;
	    }
	},

	stopPropagation: function() {
	    this.rawEvent.stopPropagation();
	},

	preventDefault: function() {
	    this.rawEvent.preventDefault();
	},

	stop: function() {
	    this.preventDefault();
	    this.stopPropagation();
	},

	isAltDown: function() {
	    return this.rawEvent.altKey;
	},

	isCommandKey: function() {
	    // this is LK convention, not the content of the event
	    return Config.useMetaAsCommand ? this.isMetaDown() : this.isAltDown();
	},

	isShiftDown: function() {
	    return this.rawEvent.shiftKey;
	},

	isMetaDown: function() {
	    return this.rawEvent.metaKey;
	},

	toString: function() {
	    return Strings.format("#<Event:%s%s%s>", this.type, this.mousePoint ?  "@" + this.mousePoint : "",
				  this.getKeyCode() || "");
	},

	setButtonPressedAndPriorPoint: function(buttonPressed, priorPoint) {
	    this.mouseButtonPressed = buttonPressed;
	    // if moving or releasing, priorPoint will get found by prior morph
	    this.priorPoint = priorPoint; 
	},

	handlerName: function() {
	    return "on" + this.type;
	},

	getKeyCode: function() {
	    return this.rawEvent.keyCode;
	},

	getKeyChar: function() {
	    if (this.type == "KeyPress") {
		var id = this.rawEvent.charCode;
		if (id > 63000) return ""; // Old Safari sends weird key char codes
		return id ? String.fromCharCode(id) : "";
	    } else  {
		var code = this.rawEvent.which;
		return code && String.fromCharCode(code);
	    }
	},

	wheelDelta: function() {
	    // FIXME: make browser-independent
	    return this.rawEvent.wheelDelta;
	},

	point: function() {
	    // likely origin of event, obvious for mouse events, the hand's position for
	    // keyboard events
	    return this.mousePoint || this.hand.getPosition();
	}

    });

    Event.rawEvent = tmp;

    Object.extend(Event, {
	// copied from prototype.js:
	KEY_BACKSPACE: 8,
	KEY_TAB:       9,
	KEY_RETURN:   13,
	KEY_ESC:      27,
	KEY_LEFT:     37,
	KEY_UP:       38,
	KEY_RIGHT:    39,
	KEY_DOWN:     40,
	KEY_DELETE:   46,
	KEY_HOME:     36,
	KEY_END:      35,
	KEY_PAGEUP:   33,
	KEY_PAGEDOWN: 34,
	KEY_INSERT:   45,

	// not in prototype.js:
	KEY_SPACEBAR: 32

    });

    var basicMouseEvents =  ["mousedown", "mouseup", "mousemove", "mousewheel"];
    var extendedMouseEvents = [ "mouseover", "mouseout"];
    var mouseEvents = basicMouseEvents.concat(extendedMouseEvents);

    Event.keyboardEvents = ["keypress", "keyup", "keydown"];
    Event.basicInputEvents = basicMouseEvents.concat(Event.keyboardEvents);

    function isMouse(rawEvent) {
	return mouseEvents.include(rawEvent.type);
    };

    return Event;
})();


(function() {
    var disabler = {    
	handleEvent: function(evt) { 	
	    evt.preventDefault(); 
	    return false;
	}
    };
    var canvas = Global.document.getElementById("canvas");
    canvas.addEventListener("dragstart", disabler, true);
    canvas.addEventListener("selectstart", disabler, true);
})();



function equals(leftObj, rightObj) {
    if (!leftObj && !rightObj) return true;
    if (!leftObj || !rightObj) return false;
    switch (leftObj.constructor) {
        case String:
	case Boolean:
	case Number:
            return leftObj == rightObj;
    };
    if (leftObj.isEqualNode)
        return leftObj.isEqualNode(rightObj);
    var cmp = function(left, right) {
	for (var value in left)
	    if (!(left[value] instanceof Function))
		return equals(left[value], right[value]);
    };
    return cmp(leftObj, rightObj) && cmp(rightObj, leftObj);
};


Object.subclass('Exporter', {
    documentation: "Implementation class for morph serialization",

    rootMorph: null,

    initialize: function(rootMorph) {
	this.rootMorph = rootMorph;
	(rootMorph instanceof Morph) || console.log("weird, root morph is " + rootMorph);
    },

    extendForSerialization: function() {
	// decorate with all the extra needed to serialize correctly. Return the additional nodes, to be removed 
	var helperNodes = [];

	var exporter = this;
	this.rootMorph.withAllSubmorphsDo(function() { 
	    exporter.verbose && console.log("serializing " + this);
	    
	    this.prepareForSerialization(helperNodes);
	    // some formatting
	    var nl = NodeFactory.createNL();
	    this.rawNode.parentNode.insertBefore(nl, this.rawNode);
	    helperNodes.push(nl);
	});
	return helperNodes;
    },

    removeHelperNodes: function(helperNodes) {
	for (var i = 0; i < helperNodes.length; i++) {
	    var n = helperNodes[i];
	    n.parentNode.removeChild(n);
	}
    },

    serialize: function(destDocument) {
	// model is inserted as part of the root morph.
	var helpers = this.extendForSerialization();
	var result = destDocument.importNode(this.rootMorph.rawNode, true);
	this.removeHelperNodes(helpers);
	return result;
    }


});

Object.extend(Exporter, {

    stringify: function(node) {
	return node ? new XMLSerializer().serializeToString(node) : null;
    },

    stringifyArray: function(nodes, conj) {
	return nodes.map(function(n) { return Exporter.stringify(n) }).join(conj);
    },

    shrinkWrapNode: function(node) {
	// FIXME deal with subdirectories: rewrite the base doc and change xlink:href for scripts
	var importer = new Importer();
	var newDoc = importer.getBaseDocument();
	importer.canvas(newDoc).appendChild(newDoc.importNode(node, true));
	return newDoc;
    },

    shrinkWrapMorph: function(morph) {
	var importer = new Importer();
	var newDoc = importer.getBaseDocument();
	importer.canvas(newDoc).appendChild(new Exporter(morph).serialize(newDoc));
	return newDoc;
    },

    saveDocumentToFile: function(doc, filename) {
	if (!filename) return null;
	if (!filename.endsWith('.xhtml')) {
	    filename += ".xhtml";
	    console.log("changed url to " + filename + " for base " + URL.source);
	}

	var url = URL.source.withFilename(filename);
	
	var status = new Resource(Record.newPlainInstance({URL: url})).store(doc, true).getStatus();
	
	if (status.isSuccess()) {
	    console.log("success publishing world at " + url + ", status " + status.code());
	    return url;
	} else {
	    WorldMorph.current().alert("failure publishing world at " + url + ", status " + status.code());
	}
	return null;
    },
    
    saveNodeToFile: function(node, filename) {
	return this.saveDocumentToFile(this.shrinkWrapNode(node), filename);
    }

});

Object.subclass('Copier', {
    documentation: "context for performing deep copy of objects",

    wrapperMap: null,

    toString: function() { 
	return "#<Copier>"; 
    },

    initialize: function() {
	this.wrapperMap = {};
    },

    addMapping: function(oldId, newMorph) {
	dbgOn(!this.wrapperMap);
	this.wrapperMap[oldId] = newMorph; 
    },

    lookup: function(oldId) {
	return this.wrapperMap[oldId];
    }

}); 

// 'dummy' copier for simple objects
Copier.marker = Object.extend(new Copier(), {
    addMapping: Functions.Empty,
    lookup: Functions.Null
});

Copier.subclass('Importer', {
    documentation: "Implementation class for morph de-serialization",

    verbose: !!Config.verboseImport,
    
    toString: function() {
	return "#<Importer>";
    },

    initialize: function($super) {
	$super();
	this.scripts = [];
	this.models = [];
	this.patchSites = [];
    },

    canvas: function(doc) {
	// find the first "svg" element with id "canvas"
	var elements = doc.getElementsByTagName("svg");
	for (var i = 0; i < elements.length; i++) {
	    var el = elements.item(i);
	    if (el.getAttribute("id") == "canvas") {
		return el;
	    }
	}
	console.log("canvas not found in document " + doc);
	return null;
    },

    getBaseDocument: function() {
	// FIXME memoize
	var rec = Record.newPlainInstance({URL: URL.source});
	var req = new Resource(rec).fetch(true);
	var status = req.getStatus();
	if (!status.isSuccess()) {
	    console.log("failure retrieving  " + URL.source + ", status " + status);
	    return null;
	} else {
	    var doc = req.getResponseXML();
	    this.clearCanvas(doc);
	    return doc;
	}
    },

    
    canvasContent: function(doc) {
        var canvas = this.canvas(doc);
        var elements = [];
	for (var node = canvas.firstChild; node != null; node = node.nextSibling) {
           switch (node.localName) {
           case "g":
               elements.push(node);
               break;
           }
	}
	return elements;
    },
    
    clearCanvas: function(doc) {
	var canvas = this.canvas(doc);
	var node = canvas.firstChild;
	while (node) {
	    var toRemove = node;
	    node = node.nextSibling;
	    if (toRemove.localName == "g") 
		canvas.removeChild(toRemove);
	}
    },

    startScripts: function(world) {
	this.verbose && console.log("start scripts %s in %s", this.scripts, world);
	// sometimes there are null values in this.scripts. Filter them out
	this.scripts.select(function(ea) {return ea}).forEach(function(s) { s.start(world); });
    },
    
    addPatchSite: function(wrapper, name, ref, optIndex) {
	this.patchSites.push([wrapper, name, ref, optIndex]);
    },
    
    importWrapperFromNode: function(rawNode) {
	///console.log('making morph from %s %s', node, LivelyNS.getType(node));
	// call reflectively b/c 'this' is not a Visual yet. 
	var wrapperType = lively.data.Wrapper.getEncodedType(rawNode);
	
	if (!wrapperType || !Class.forName(wrapperType)) {
	    throw new Error(Strings.format("node %s (parent %s) cannot be a morph of %s",
					   rawNode.tagName, rawNode.parentNode, wrapperType));
	}

	return new (Class.forName(wrapperType))(this, rawNode);
	/*
	try {

	} catch (er) {
	    console.log("%s instantiating type %s from node %s", er, 
			wrapperType, Exporter.stringify(rawNode));
	    throw er;
	}*/
    },

    importWrapperFromString: function(string) {
	return this.importWrapperFromNode(this.parse(string));
    },

    parse: function(string) {
	var parser = new DOMParser();
	var xml = parser.parseFromString('<?xml version="1.0" standalone="no"?> ' + string, "text/xml");
	if (xml.documentElement.tagName == "html") {
	    throw new Error("xml parse error: " + Exporter.stringify(xml.documentElement));
	} 
	return document.importNode(xml.documentElement, true);
    },

    importFromNodeList: function(nodes) {
	var morphs = [];
	for (var i = 0; i < nodes.length; i++) {
	    var node = nodes[i];
	    // console.log("found node " + Exporter.stringify(node));
	    if (node.localName != "g")  continue;
	    morphs.push(this.importWrapperFromNode(node.ownerDocument === Global.document ? 
						   node : Global.document.importNode(node, true)));
	}
	return morphs;
    },

    finishImport: function(world) {
	this.patchReferences();
	this.hookupModels();
	this.runDeserializationHooks();
	try {
	    this.startScripts(world);
	} catch (er) {
	    console.log("scripts failed: " + er);
	}
    },

    patchReferences: function() {
	for (var i = 0, N = this.patchSites.length; i < N; i++) {
	    var site = this.patchSites[i];
	    var wrapper = site[0];
	    var name = site[1];
	    var ref = site[2];
	    var index = site[3];
	    var found;
	    if (index !== undefined) {
		if (!wrapper[name]) wrapper[name] = [];
		else if (!(wrapper[name] instanceof Array)) throw new Error('whoops, serialization problem?');
		found = (wrapper[name])[index] = this.lookup(ref);
	    } else {
		found = wrapper[name] = this.lookup(ref);
	    }
	    if (!found) {
		console.warn("no value found for field %s ref %s in wrapper %s", name, ref, wrapper);
	    } else {
		//console.log("found " + name + "=" + found + " and assigned to " + wrapper);
	    }
	}
    },

    hookupModels: function() {
	Properties.forEachOwn(this.wrapperMap, function each(key, wrapper) {
	    if (wrapper.reconnectModel) {// instanceof View
		var m = wrapper.reconnectModel();
		m && console.log('connecting model on ' + wrapper + " model " + m);
	    }
	});
    },

    runDeserializationHooks: function() {
	Properties.forEachOwn(this.wrapperMap, function each(key, wrapper) {
	    if (wrapper.onDeserialize) {
		wrapper.onDeserialize();
	    }
	    // collect scripts
	    if (wrapper.activeScripts) this.scripts = this.scripts.concat(wrapper.activeScripts);
	}, this);
    },


    loadWorldInSubworld: function(doc) {
	var nodes = this.canvasContent(doc);
	if (!nodes) {
	    WorldMorph.current().alert('no morphs found');
	    return null;
	}
	var world = new WorldMorph(WorldMorph.current().canvas());
	var morphs = this.importFromNodeList(nodes);

	morphs.forEach(function(morph) {
	    if (morph instanceof WorldMorph) morph.submorphs.clone().forEach(function(m) { world.addMorph(m) });
	    else world.addMorph(morph);
	});
	
	// post addition
	this.finishImport(world);
	
	var link = WorldMorph.current().reactiveAddMorph(new LinkMorph(world));
	link.addPathBack();
	return world;
    },

    loadWorldContentsInCurrent: function(doc) {
	var world = this.loadWorldContents(doc);
	// FIXME? scripts have started already ?
	world.submorphs.clone().forEach(function(m) { 
	    WorldMorph.current().addMorph(m) 
	});
    },
    
    loadWorldContents: function(doc) { 
	// possibly doc === Global.document; 
	var world = null;
	var morphs = this.importFromNodeList(this.canvasContent(doc));
	
	if (!(0 in morphs)) 
	    return null;
	
	if (morphs[0] instanceof WorldMorph) {
	    world = morphs[0];
	    if (morphs.length > 1) console.log("more than one top level morph following a WorldMorph, ignoring remaining morphs");
	} else {
	    // no world, create one and add all the serialized morphs to it.
	    var canvas = document.getElementById("canvas");
	    world = new WorldMorph(canvas);
	    // this adds a the WorldMorph's <g> at the end of the list
	    canvas.appendChild(world.rawNode);
	    // the following will reparent all the existing morphs under the WorldMorph's <g>
	    morphs.clone().forEach(function(m) { world.addMorph(m); });
	}
	this.finishImport(world);

	return world;
    }

    

});

Importer.marker = Object.extend(new Importer(), {
    addMapping: Functions.Empty,
    lookup: Functions.Null
});


// ===========================================================================
// Morph functionality
// ===========================================================================

Object.subclass('MouseHandlerForDragging', {

    handleMouseEvent: function(evt, targetMorph) {
	if (evt.type == "MouseDown") evt.hand.setMouseFocus(targetMorph);
	evt.hand.resetMouseFocusChanges();

	var handler = targetMorph[evt.handlerName()];
	if (handler) handler.call(targetMorph, evt, targetMorph);

	if (evt.type == "MouseUp") {
	    // cancel focus unless it was set in the handler
	    if (evt.hand.resetMouseFocusChanges() == 0) {
		evt.hand.setMouseFocus(null);
	    }
	}
	return true; 
    },

    handlesMouseDown: Functions.False
});

Object.subclass('MouseHandlerForRelay', {

    initialize: function (target, eventSpec) {
	//  Send events to a different target, with different methods
	//    Ex: box.relayMouseEvents(box.owner, {onMouseUp: "boxReleased", onMouseDown: "boxPressed"})
	this.target = target;
	this.eventSpec = eventSpec || {onMouseDown: "onMouseDown", onMouseMove: "onMouseMove", onMouseUp: "onMouseUp"};
    },

    handleMouseEvent: function(evt, originalTarget) {
	if (evt.type == "MouseDown") evt.hand.setMouseFocus(originalTarget);
	evt.hand.resetMouseFocusChanges();
	
	var handler = this.target[this.eventSpec[evt.handlerName()]];
	if (handler) handler.call(this.target, evt, originalTarget);

	if (evt.type == "MouseUp") {
	    // cancel focus unless it was set in the handler
	    if (evt.hand.resetMouseFocusChanges() == 0) {
		evt.hand.setMouseFocus(null);
	    }
	}
	return true; 
    },

    handlesMouseDown: Functions.True

});


lively.data.Wrapper.subclass('Morph', {

    documentation: "Base class for every graphical, manipulatable object in the system", 

    // prototype vars
    rotation: 0.0,
    scale: 1.0,
    fill: Color.primary.green,
    borderWidth: 1,
    borderColor: Color.black,

    focusHaloBorderWidth: 4,

    fishEye: false,        // defines if fisheye effect is used
    fisheyeScale: 1.0,     // set the default scaling to 1.0
    fisheyeGrowth: 1.0,    // up to fisheyeGrowth size bigger (1.0 = double size)
    fisheyeProximity: 0.5, // where to react wrt/ size (how close we need to be)

    clipPath: null, // KP: should every morph should have one of those?
    keyboardHandler: null, //a KeyboardHandler for keyboard repsonse, etc
    layoutHandler: null, //a LayoutHandler for special response to setExtent, etc
    openForDragAndDrop: true, // Submorphs can be extracted from or dropped into me
    mouseHandler: MouseHandlerForDragging.prototype, //a MouseHandler for mouse sensitivity, etc
    noShallowCopyProperties: ['id', 'rawNode', 'shape', 'submorphs', 'defs', 'activeScripts', 'nextNavigableSibling', 'focusHalo', 'fullBounds', 'clipPath'],
    transientBounds: false,

    suppressBalloonHelp: Config.suppressBalloonHelp,

    nextNavigableSibling: null, // keyboard navigation

    internalInitialize: function(rawNode, shouldAssign) {
	this.rawNode = rawNode;
	this.submorphs = [];
	this.owner = null;
	if (shouldAssign) {
 	    LivelyNS.setType(this.rawNode, this.getType());
	    this.setId(this.newId());
	}
    },

    initialize: function(initialBounds, shapeType) {
	//console.log('initializing morph %s %s', initialBounds, shapeType);

	if(!initialBounds) initialBounds = new Rectangle(0,0,100,100);
	if(!shapeType) shapeType = "rect";
	this.internalInitialize(NodeFactory.create("g"), true);

	this.pvtSetTransform(new lively.scene.Similitude(this.defaultOrigin(initialBounds, shapeType)));
	this.initializePersistentState(initialBounds, shapeType);
	this.initializeTransientState(initialBounds);
    },

    initializePersistentState: function(initialBounds /*:Rectangle*/, shapeType/*:String*/) {
	// a rect shape by default, will change later
	switch (shapeType) {
	case "ellipse":
	    this.shape = new lively.scene.Ellipse(initialBounds.translatedBy(this.origin.negated()));
	    break;
	default:
	    // polygons and polylines are set explicitly later
	    this.shape = new lively.scene.Rectangle(initialBounds.translatedBy(this.origin.negated()));
	    break;
	}
	this.setFill(this.fill);
	this.setBorderWidth(this.borderWidth);
	this.setBorderColor(this.borderColor);
	this.rawNode.appendChild(this.shape.rawNode);
	return this;
    },

    // setup various things 
    initializeTransientState: function(initialBounds) { 
	this.fullBounds = initialBounds; // a Rectangle in owner coordinates
	// this includes the shape as well as any submorphs
	// cached here and lazily computed by bounds(); invalidated by layoutChanged()

	// this.created = false; // exists on server now
	// some of this stuff may become persistent
    },
    
    copyFrom: function(copier, other) {
	this.internalInitialize(other.rawNode.cloneNode(false), true);
	
	this.pvtSetTransform(this.getTransform());

	this.initializePersistentState(pt(0,0).asRectangle(), "rect");

	if (other.hasSubmorphs()) { // deep copy of submorphs
	    other.submorphs.forEach(function each(m) { 
		var copy = m.copy(copier);
		copier.addMapping(m.id(), copy);
		copy.owner = null;  // Makes correct transfer of transform in next addMorph
		this.addMorph(copy);
	    }, this);
	}

	for (var p in other) {
	    if (!(other[p] instanceof Function) 
		&& other.hasOwnProperty(p) 
		&& !this.noShallowCopyProperties.include(p)) {
		if (other[p] instanceof Morph) {
		    var replacement = (p === "owner") ? null : copier.lookup(other[p].id());
		    this[p] = replacement || other[p];
		    // an instance field points to a submorph, so copy
		    // should point to a copy of the submorph
		} else if (other[p] instanceof lively.scene.Image) {
		    this[p] = other[p].copy(copier);
		    this.addWrapper(this[p]);
		} else if (!(other[p] instanceof lively.paint.Gradient)) {		    
		    this[p] = other[p];
		} 
	    }
	} // shallow copy by default, note that arrays of Morphs are not handled
	

	this.internalSetShape(other.shape.copy());
	this.origin = other.origin.copy();

	if (other.pvtCachedTransform) { 
	    this.pvtCachedTransform = other.pvtCachedTransform.copy();
	} 
	
	if (other.defs) {
	    this.restoreDefs(copier, other.defs, true);
	}

	this.initializeTransientState(null);
	
	if (other.activeScripts != null) { 
	    for (var i = 0; i < other.activeScripts.length; i++) {
		var a = other.activeScripts[i];
		// Copy all reflexive scripts (messages to self)
		if (a.actor === other) {
		    this.startStepping(a.stepTime, a.scriptName, a.argIfAny);
		    // Note -- may want to startStepping other as well so they are sync'd
		}
	    }
	} 

	this.layoutChanged();
	return this; 
    },

    deserialize: function($super, importer, rawNode) {
	// FIXME what if id is not unique?
	$super(importer, rawNode);
	this.internalInitialize(rawNode, false);
	this.pvtSetTransform(this.getTransform());
	
	this.restoreFromSubnodes(importer);
	this.restorePersistentState(importer);    
	
	this.initializeTransientState(null);
	importer.verbose && console.log("deserialized " + this);
    },

    prepareForSerialization: function($super, extraNodes) {
	// this is the morph to serialize
	if (Config.useTransformAPI) {
	    // gotta set it explicitly, it's not in SVG
	    this.setTrait("transform", this.getTransform().toAttributeValue());
	    // FIXME, remove?
	}
	return $super(extraNodes);
    },
    
    restorePersistentState: function(importer) {
	var pointerEvents = this.getTrait("pointer-events");
	if (pointerEvents == "none") {
	    this.ignoreEvents();
	} else if (pointerEvents) {
	    console.log("can't handle pointer-events " + pointerEvents);
	}
	return; // override in subclasses
    },

    restoreDefs: function(importer, originalDefs, isOnClone) {
	function applyGradient(gradient, owner) {
	    gradient.setDerivedId(owner);
	    if (owner.shape) {
		var myFill = owner.shape.getFill();
		if (myFill)
		    owner.shape.setFill(gradient.uri());
		else console.warn('myFill undefined on %s', owner);
	    } else console.warn("cannot set fill %s (yet?), no shape...", gradient.id());
	    return gradient;
	}
	
	for (var def = originalDefs.firstChild; def != null; def = def.nextSibling) {
	    if (isOnClone) def = def.cloneNode(true);
	    switch (def.tagName) {
	    case "clipPath":
		if (!this.getTrait('clip-path'))
		    console.log('myClip is undefined on %s', this); 
		if (this.clipPath) throw new Error("how come clipPath is set to " + this.clipPath);
		this.clipPath = new lively.scene.Clip(Importer.marker, def).setDerivedId(this);
		this.setTrait('clip-path', this.clipPath.uri());
		this.addWrapperToDefs(this.clipPath);
		break;
	    case "linearGradient":
		this.fill = this.addWrapperToDefs(applyGradient(new lively.paint.LinearGradient(Importer.marker, def), this));
		break;
	    case "radialGradient": // FIXME gradients can be used on strokes too
		this.fill = this.addWrapperToDefs(applyGradient(new lively.paint.RadialGradient(Importer.marker,  def), this));
		break;
	    case "code":
		if (!Config.skipChanges) { // Can be blocked by URL param 
		    this.changes = new ChangeSet(this);
		    // this.changes.evaluateAll(); 
		    // FIXME probably wrong order, should be at the end of deserialization
		    new BasicCodeMarkupParser().parseDocumentElement(def, true);
		    console.log("Successfully evalled " + this.changes);
		}
		break;
	    default:
		console.warn('unknown def %s', Exporter.stringify(def));
	    }
	}
    },

    restoreFromSubnode: function(importer, node) {
	// Override me
    },

    restoreFromSubnodes: function(importer) {
	//  wade through the children
	var children = [];
	var helperNodes = [];
	var origDefs;
	for (var desc = this.rawNode.firstChild; desc != null; desc = desc.nextSibling) {
	    if (desc.nodeType == Node.TEXT_NODE || desc.nodeType == Node.COMMENT_NODE) {
		if (desc.textContent == "\n") helperNodes.push(desc); // remove newlines, which will be reinserted for formatting
		continue; // ignore whitespace and maybe other things
	    }
	    if (desc.localName == "defs") {
		origDefs = desc;
		continue;
	    } 
	    var type = lively.data.Wrapper.getEncodedType(desc);
	    // depth first traversal
	    if (type) {
		var wrapper = importer.importWrapperFromNode(desc);
		if (wrapper instanceof Morph) {
		    this.submorphs.push(wrapper); 
		    wrapper.owner = this;
		} else children.push(desc);
	    } else {
		children.push(desc);
	    }
	}

	if (origDefs) origDefs.parentNode.removeChild(origDefs);

	for (var i = 0; i < children.length; i++) {
	    var node = children[i];
            // debugger;
	    switch (node.localName) {
	    case "ellipse":
		this.shape = new lively.scene.Ellipse(importer, node);
		break;
	    case "rect":
		this.shape = new lively.scene.Rectangle(importer, node);
		break;
	    case "polyline":
		this.shape = new lively.scene.Polyline(importer, node);
		break;
	    case "polygon":
		this.shape = new lively.scene.Polygon(importer, node);
		break;
            case "path":
		this.shape = new lively.scene.Path(importer, node);
		break;
	    case "defs": 
		throw new Error();
	    case "g":
		this.restoreFromSubnode(importer, node);
		break;
		// nodes from the Lively namespace
	    case "field": {
		// console.log("found field " + Exporter.stringify(node));
		helperNodes.push(node);
		var name = LivelyNS.getAttribute(node, "name");
		
		if (name) {
		    var ref = LivelyNS.getAttribute(node, "ref");
		    if (ref) {
			importer.addPatchSite(this, name, ref);
		    } else {
			var value = node.textContent;
			if (value) {
			    var family = LivelyNS.getAttribute(node, "family");
			    if (family) {
				var cls = Class.forName(family);
				if (!cls) throw new Error('uknown type ' + family);
				this[name] = cls.fromLiteral(JSON.unserialize(value));
			    } else this[name] = JSON.unserialize(value);
			}
		    }
		}
		break;
	    }
	    case "widget": {
		// FIXME!
		var type = lively.data.Wrapper.getEncodedType(node);
		if (type) {
		    var klass = Class.forName(type);
		    if (klass)
		        var widget = new klass(importer, node);
		    else
		        console.log("Error in deserializing " + type + ", no class");
		    $A(node.getElementsByTagName("record")).forEach(function(child) {
			var spec = JSON.unserialize(child.getElementsByTagName("definition")[0].textContent);
			var Rec = lively.data.DOMRecord.prototype.create(spec);
			var model = new Rec(importer, child);
			var id = child.getAttribute("id");
			if (id) importer.addMapping(id, model); 
			widget.actualModel = model;
		    });
		    
		    $A(node.getElementsByTagName("relay")).forEach(function(child) {
			var spec = {};
			$A(child.getElementsByTagName("binding")).forEach(function(elt) {
			    var key = elt.getAttributeNS(null, "formal");
			    var value = elt.getAttributeNS(null, "actual");
			    spec[key] = value;
			});
			
			var name = LivelyNS.getAttribute(child, "name");
			if (name) {
			    // here widget instead of name is the only difference
			    var relay = widget[name] = Relay.newInstance(spec, null);
			    var ref = LivelyNS.getAttribute(child, "ref");
			    importer.addPatchSite(relay, "delegate", ref);
			}
		    });
		}
		
		break;
	    }
	    case "array": {
		helperNodes.push(node);
		var name = LivelyNS.getAttribute(node, "name");
		this[name] = [];
		var index = 0;
		$A(node.getElementsByTagName("item")).forEach(function(elt) {
		    var ref = LivelyNS.getAttribute(elt, "ref");
		    if (ref) {
			importer.addPatchSite(this, name, ref, index);
		    } else this[name].push(null);
		    index ++;
		}, this);
		break;
	    }

	    case "relay": {
		var spec = {};
		$A(node.getElementsByTagName("binding")).forEach(function(elt) {
		    var key = elt.getAttributeNS(null, "formal");
		    var value = elt.getAttributeNS(null, "actual");
		    spec[key] = value;
		});
		var name = LivelyNS.getAttribute(node, "name");
		if (name) {
		    var relay = this[name] = Relay.newInstance(spec, null);
		    var ref = LivelyNS.getAttribute(node, "ref");
		    importer.addPatchSite(relay, "delegate", ref);
		}
		break;
	    }
	    default: {
		if (node.nodeType === Node.TEXT_NODE) {
		    console.log('text tag name %s', node.tagName);
		    // whitespace, ignore
		} else if (!this.restoreFromSubnode(importer, node)) {
		    console.warn('cannot handle node %s, %s', node.tagName || node.nodeType, node.textContent);
		}
	    }
	    }
	} // end for

	if (origDefs) { 
	    this.restoreDefs(importer, origDefs);
	}

	for (var i = 0; i < helperNodes.length; i++) {
	    var n = helperNodes[i];
	    n.parentNode.removeChild(n);
	}
    }
    
});

Morph.addMethods({  // tmp copy

    getStyleClass: function() {
	return this.styleClass;
    },

    setStyleClass: function(value) {
	this.styleClass = value;
    },

    canvas: function() {
	if (!UserAgent.usableOwnerSVGElement) {
	    // so much for multiple worlds on one page
	    return Global.document.getElementById("canvas");
	} else {
	    return (this.rawNode && this.rawNode.ownerSVGElement) || Global.document.getElementById("canvas");
	}
    },
    
    setVisible: function(flag) { // FIXME delegate to sceneNode when conversion finished
	if (flag) this.rawNode.removeAttributeNS(null, "display");
	else this.rawNode.setAttributeNS(null, "display", "none");
	return this;
    },
    
    isVisible: function() { // FIXME delegate to sceneNode when conversion finished
	// Note: this may not be correct in general in SVG due to inheritance,
	// but should work in LIVELY.
	var hidden = this.rawNode.getAttributeNS(null, "display") == "none";
	return hidden == false;
    },

    applyFilter: function(filterUri) {// FIXME delegate to sceneNode when conversion finished
	if (filterUri) 
	    this.rawNode.setAttributeNS(null, "filter", filterUri);
	else
	    this.rawNode.removeAttributeNS(null, "filter");
    }
});


// Functions for change management
Object.extend(Morph, {
    
    onLayoutChange: function(fieldName) { 
	return function layoutChangeAdvice(/* arguments*/) {
	    var priorExtent = this.innerBounds().extent();
	    this.changed();
	    var args = $A(arguments);
	    var proceed = args.shift();
	    var result = proceed.apply(this, args);
	    this.layoutChanged(priorExtent);
	    this.changed(); 
	    return result;
	}
    },

    fromLiteral: function(literal) {
	var morph = new Morph(literal.bounds, literal.shape);
	if (literal.submorphs) {
	    if (Object.isArray(literal.submorphs))
		morph.setSubmorphs(literal.submorphs);
	    else throw new TypeError();
	}
	return morph;
    }

});

// Functions for manipulating the visual attributes of Morphs
Morph.addMethods({

    setFill: function(fill) {
	var old = this.fill;
	this.fill = fill;
	if (old instanceof lively.data.Wrapper) 
	    old.removeRawNode();
	var attr;
	if (fill == null) {
	    attr = "none";
	} else if (fill instanceof Color) {
	    attr = fill.toString();
	} else if (fill instanceof lively.paint.Gradient) { 
	    this.fill = fill.copy().setDerivedId(this);
	    this.addWrapperToDefs(this.fill);
	    attr = this.fill.uri();
	}
	this.shape.setFill(attr);
    },

    getFill: function() {
	return this.fill; 
    },

    setBorderColor: function(newColor) { this.shape.setStroke(newColor); },

    getBorderColor: function() {
	return new Color(Importer.marker, this.shape.getStroke());
    },

    setBorderWidth: function(newWidth) {
	this.shape.setStrokeWidth(newWidth); 
    },
    
    getBorderWidth: function() {
	return this.shape.getStrokeWidth() || 0; // FIXME: fix defaults logic
    },

    shapeRoundEdgesBy: function(r) {
	this.shape.roundEdgesBy(r);
    },

    setFillOpacity: function(op) { this.shape.setFillOpacity(op); },

    setStrokeOpacity: function(op) { this.shape.setStrokeOpacity(op); },

    setLineJoin: function(joinType) { this.shape.setLineJoin(joinType); },

    setLineCap: function(capType) { this.shape.setLineCap(capType); },

    applyStyle: function(specs) { // note: use reflection instead?
	for (var i = 0; i < arguments.length; i++) {
	    var spec = arguments[i];
	    dbgOn(!spec);
	    if (spec.borderWidth !== undefined) this.setBorderWidth(spec.borderWidth);
	    if (spec.borderColor !== undefined) this.setBorderColor(spec.borderColor);
	    if (spec.fill !== undefined) this.setFill(spec.fill);
	    if (spec.opacity !== undefined) {
		this.setFillOpacity(spec.opacity);
		this.setStrokeOpacity(spec.opacity); 
	    }
	    if (spec.fillOpacity !== undefined) this.setFillOpacity(spec.fillOpacity);
	    if (spec.strokeOpacity !== undefined) this.setStrokeOpacity(spec.strokeOpacity);

	    if (this.shape.roundEdgesBy && spec.borderRadius !== undefined) { 
		this.shape.roundEdgesBy(spec.borderRadius);
	    }
	}
	return this;
    },

    makeStyleSpec: function() {
	// Adjust all visual attributes specified in the style spec
	var spec = { };
	spec.borderWidth = this.getBorderWidth();
	spec.borderColor = this.getBorderColor();
	spec.fill = this.getFill();
	if (this.shape.getBorderRadius) spec.borderRadius = this.shape.getBorderRadius() || 0.0;
	spec.fillOpacity = this.shape.getFillOpacity() || 1.0;
	spec.strokeOpacity = this.shape.getStrokeOpacity() || 1.0;
	return spec;
    },

    applyStyleNamed: function(name) {
	this.applyStyle(this.styleNamed(name));
    },

    styleNamed: function(name) {
	// Look the name up in the Morph tree, else in current world
	if (this.displayTheme) return this.displayTheme[name];
	if (this.owner) return this.owner.styleNamed(name);
	if (WorldMorph.current()) return WorldMorph.current().styleNamed(name);
	return WorldMorph.prototype.displayThemes.lively[name]; // FIXME for onDeserialize, when no world exists yet
    },

    linkToStyles: function(styleClassList, optSupressApplication) {
	// Record the links for later updates, and apply them now
	this.setStyleClass(styleClassList.join(' '));
	if (!optSupressApplication) this.applyLinkedStyles();
	return this;
    },

    applyLinkedStyles: function() {
	// Apply all the styles to which I am linked, in order
	var styleClassDecl = this.getStyleClass();
	if (!styleClassDecl) return;
	var styleClasses = styleClassDecl.split(' '); // better parsing?
	for (var i = 0; i < styleClasses.length; i++) {
	    this.applyStyleNamed(styleClasses[i]); 
	}
    },

    // NOTE:  The following four methods should all be factored into a single bit of reshaping logic
    applyFunctionToShape: function() {  // my kingdom for a Smalltalk block!
	var args = $A(arguments);
	var func = args.shift();
	func.apply(this.shape, args);
	if (this.clipPath) {
	    // console.log('clipped to new shape ' + this.shape);
	    this.clipToShape();
	}
	this.adjustForNewBounds();
    }.wrap(Morph.onLayoutChange('shape')),

    internalSetShape: function(newShape) {
	if (!newShape.rawNode) {
	    console.log('newShape is ' + newShape);
	    lively.lang.Execution.showStack();
	}
	
	this.rawNode.replaceChild(newShape.rawNode, this.shape.rawNode);
	this.shape = newShape;
	//this.layoutChanged(); 
	if (this.clipPath) {
	    // console.log('clipped to new shape ' + this.shape);
	    this.clipToShape();
	}
	this.adjustForNewBounds();
    },

    setShape: function(newShape) {
	this.internalSetShape(newShape);
    }.wrap(Morph.onLayoutChange('shape')),

    reshape: function(partName, newPoint, handle, lastCall) {
	this.shape.reshape(partName,newPoint,handle,lastCall); 

	// FIXME: consider converting polyline to polygon when vertices merge.
	if (this.clipPath) {
	    // console.log('clipped to new shape ' + this.shape);
	    this.clipToShape();
	}
	this.adjustForNewBounds();
    }.wrap(Morph.onLayoutChange('shape')),

    setVertices: function(newVerts) {
	// particular to polygons
	this.shape.setVertices(newVerts);
	this.adjustForNewBounds();
    }.wrap(Morph.onLayoutChange('shape')),

    internalSetBounds: function(newRect) {
	// DI: Note get/setBounds should be deprecated in favor of get/setExtent and get/setPosition
	// This is so that layout management can move things around without triggering redundant or
	// recursive calls on adjustForNewBounds(q.v.)

	// All calls on morph.setBounds should be converted to two calls as above (or just one if,
	// eg, only the extent or position is changing).

	// Of course setBounds remains entirely valid as a message to the *shape* object and, 
	// in fact, shape.setBounds() will have to be called from both setPosition and setExtent
	// but adjustForNewBounds will only need to be called from setExtent.

	// Finally, there is an argument for calling layoutChanged from setPosition and setExtent,
	// since the caller must do it otherwise.  This would simplify things overall.

	// DI:  Note that there is an inconsistency here, in that we are reading and comparing
	// the full bounds, yet if we set extent, it only affects the shape (ie, innerBounds)

	var priorBounds = this.bounds();

	if(!newRect.topLeft().eqPt(priorBounds.topLeft())) {  // Only set position if it changes
		this.setPosition(newRect.topLeft());
	}
	if(!newRect.extent().eqPt(priorBounds.extent())) {  // Only set extent if it changes
		// FIXME some shapes don't support setFromRect
		this.shape.setBounds(newRect.extent().extentAsRectangle());
 		this.adjustForNewBounds();
	}
	if (this.clipPath) {
	    // console.log('clipped to new shape ' + this.shape);
            this.clipToShape();
	}
    },

    setBounds: function(newRect) {
 	//this.shape.setBounds(this.relativizeRect(newRect)); // FIXME some shapes don't support setFromRect
	this.internalSetBounds(newRect);
    }.wrap(Morph.onLayoutChange('shape')),

    setExtent: function(newExtent) {
	this.setBounds(this.getPosition().extent(newExtent));
    },

    getExtent: function(newRect) { return this.shape.bounds().extent() },

    containsPoint: function(p) { 
	// p is in owner coordinates
	if (!this.bounds().containsPoint(p)) return false;
	return this.shape.containsPoint(this.relativize(p)); 
    },

    containsWorldPoint: function(p) { // p is in world coordinates
	if (this.owner == null) return this.containsPoint(p);
	return this.containsPoint(this.owner.localize(p)); 
    },

    fullContainsPoint: function(p) { // p is in owner coordinates
	return this.bounds().containsPoint(p); 
    },

    fullContainsWorldPoint: function(p) { // p is in world coordinates
	if (this.owner == null) return this.fullContainsPoint(p);
	return this.fullContainsPoint(this.owner.localize(p)); 
    },

    addNonMorph: function(node) {
	if (node instanceof lively.data.Wrapper) throw new Error("add rawNode, not the wrapper itself");
	return this.rawNode.insertBefore(node, this.shape && this.shape.rawNode.nextSibling);
    },

    addWrapper: function(w) {
	if (w && w.rawNode) {
	    this.addNonMorph(w.rawNode);
	    return w;
	} else return null;
    },

    addPseudoMorph: function(pseudomorph) {
	if (pseudomorph instanceof Global.PseudoMorph) {
	    return this.addMorph(pseudomorph);
	} else throw new Error(pseudomorph + " is not a PseudoMorph");
    },

    addWrapperToDefs: function(wrapper) {
	if (!this.defs) {
	    this.defs = this.rawNode.insertBefore(NodeFactory.create("defs"), this.rawNode.firstChild);
	} 
	if (wrapper)
	    this.defs.appendChild(wrapper.rawNode);
	return wrapper;
    }

});

// Submorph management functions
Morph.addMethods({ 

    addMorph: function(morph) { return this.addMorphFrontOrBack(morph, true) },

    addMorphAt: function(morph, position) {
	var morph = this.addMorphFrontOrBack(morph, true);
	morph.setPosition(position);
	return morph;
    },

    addMorphFront: function(morph) { return this.addMorphFrontOrBack(morph, true) },

    addMorphBack: function(morph) { return this.addMorphFrontOrBack(morph, false) },

    addMorphFrontOrBack: function(m, front) {
	console.assert(m instanceof Morph, "not an instance");

	if (m.owner) {
	    var tfm = m.transformForNewOwner(this);
	    m.owner.removeMorph(m); // KP: note not m.remove(), we don't want to stop stepping behavior
	    m.setTransform(tfm); 
	    // FIXME transform is out of date
	    // morph.setTransform(tfm); 
	    // m.layoutChanged(); 
	} 
	this.insertMorph(m, front);
	m.changed();
	m.layoutChanged();
	this.layoutChanged();
	return m;
    },

    setSubmorphs: function(morphs) {
	console.assert(morphs instanceof Array, "not an array");
	if (morphs != null) {
	    this.submorphs = [].concat(morphs);
	    this.submorphs.forEach(function (m) { 
		if (m.owner) {
		    var tfm = m.transformForNewOwner(this);
		    m.owner.removeMorph(m);
		    m.setTransform(tfm); 
		} 
		this.rawNode.appendChild(m.rawNode); 
		m.owner = this;
		m.changed();
		m.layoutChanged();
	    }, this);
	}
	this.layoutChanged();
    },


    insertMorph: function(m, isFront) { // low level
	var insertionPt = this.submorphs.length == 0 ? this.shape.rawNode.nextSibling :
	    isFront ? this.submorphs.last().rawNode.nextSibling : this.submorphs.first().rawNode;
	// the last one, so drawn last, so front
	this.rawNode.insertBefore(m.rawNode, insertionPt);

	if (isFront)
	    this.submorphs.push(m);
	else
	    this.submorphs.unshift(m);
	m.owner = this;
	return m;
    },

    removeMorph: function(m) {
	var index = this.submorphs.indexOf(m);
	if (index < 0) {
	    m.owner !== this && console.log("%s has owner %s that is not %s?", m, m.owner, this);
	    return null;
	}

	m.removeRawNode();
	var spliced = this.submorphs.splice(index, 1);
	if (spliced instanceof Array) spliced = spliced[0];
	if (m !== spliced) {
	    console.log("invariant violated removing %s, spliced %s", m, spliced);
	}
	m.owner = null;
	m.setHasKeyboardFocus(false);
	return m;
    },

    removeAllMorphs: function() {
	this.submorphs.invoke('removeRawNode');
	this.submorphs.clear();
	this.layoutChanged(); 
    },

    hasSubmorphs: function() {
	return this.submorphs.length != 0;
    },

    remove: function() {
	if (!this.owner) return null;  // already removed

	this.stopStepping();
	this.owner.removeMorph(this);

	return this;
    },

    withAllSubmorphsDo: function(func, rest) {
	// Call the supplied function on me and all of my submorphs by recursion.
	var args = $A(arguments);
	args.shift();
	func.apply(this, args);
	for (var i = 0; i < this.submorphs.length; i++) {
	    this.submorphs[i].withAllSubmorphsDo(func, rest);
	}
    },

    invokeOnAllSubmorphs: function(selector, rest) {
	var args = $A(arguments);
	args.shift();
	var func = this[selector];
	func.apply(this, args);
	for (var i = 0; i < this.submorphs.length; i++)
	    this.submorphs[i].invokeOnAllSubmorphs(selector, rest);
    },

    topSubmorph: function() {
	// the morph on top is the last one in the list
	return this.submorphs.last();
    },

    // morph gets an opportunity to shut down when WindowMorph closes 
    shutdown: function() {
	this.remove();
    },

    okToDuplicate: Functions.True  // default is OK

});

// Morph bindings to its parent, world, canvas, etc.
Morph.addMethods({

    world: function() {
	return this.owner ? this.owner.world() : null;
    },

    toString: function() {
	try {
	    return Strings.format("%s(%s)", this.rawNode && this.id() || "" , 
				  this.shape ? "[" + this.shape.bounds().toTuple() + "]" : "");
	} catch (e) {
	    //console.log("toString failed on %s", [this.id(), this.getType()]);
	    return "#<Morph?{" + e + "}>";
	}
    },

    inspect: function() {
	try {
	    return this.toString();
	} catch (err) {
	    return "#<inspect error: " + err + ">";
	}
    },

    // Morph coordinate transformation functions

    // SVG has transform so renamed to getTransform()
    getTransform: function() {
	if (this.pvtCachedTransform) return this.pvtCachedTransform;
	
	if (Config.useTransformAPI) {
	    var impl = this.rawNode.transform.baseVal.consolidate();
	    this.pvtCachedTransform = new lively.scene.Transform(impl ? impl.matrix : null); // identity if no transform specified
	} else {
	    // parse the attribute: by Dan Amelang
	    var s = this.rawNode.getAttributeNS(null, "transform");
	    console.log('recalculating transform from ' + s);
	    var matrix = null;
	    var match = s.match(/(\w+)\s*\((.*)\)/);
	    if (match) {
		matrix = this.canvas().createSVGMatrix();
		var args = match[2].split(/(?:\s|,)+/).
		map(function(n) { return parseFloat(n) || 0; });
		switch (match[1]) {
		case 'matrix':
		    matrix.a = args[0]; matrix.b = args[1];
		    matrix.c = args[2]; matrix.d = args[3];
		    matrix.e = args[4]; matrix.f = args[5];
		    break;
		case 'translate':
		    matrix = matrix.translate(args[0], args[1] || 0); // may be just one arg
		    break;
		case 'scale':
		    matrix = matrix.scaleNonUniform(args[0], args[1] || 1.0);
		    break;
		case 'rotate':
		    // FIXME check:
		    matrix = matrix.translate(-args[1], -args[2]).rotate(args[0]).translate(args[1], args[2]);
		    console.log('made ' + matrix + ' from ' + args);
		    break;
		case 'skewX':
		    matrix = matrix.skewX(args[0]);
		    break;
		case 'skewY':
		    matrix = matrix.setSkewY(args[0]);
		    break;
		}
	    }
	    this.pvtCachedTransform = new lively.scene.Transform(matrix);
	}
	return this.pvtCachedTransform;
    },

    pvtSetTransform: function(tfm) {
	this.origin = tfm.getTranslation();
	this.rotation = tfm.getRotation().toRadians();
	this.scale = tfm.getScale();
	// we must make sure the Morph keeps its original size (wrt/fisheyeScale)
	this.scale = this.scale/this.fisheyeScale;
	this.transformChanged();
    },

    setTransform: function(tfm) { this.pvtSetTransform(tfm); }.wrap(Morph.onLayoutChange('transform')),

    transformToMorph: function(other) {
	// getTransformToElement has issues on some platforms
	dbgOn(!other);
	if (Config.useGetTransformToElement) {
	    return this.rawNode.getTransformToElement(other.rawNode);
	} else {
	    var tfm = this.getGlobalTransform();
	    var inv = other.getGlobalTransform().createInverse();
	    //console.log("own global: " + tfm + " other inverse " + inv);
	    tfm.preConcatenate(inv);
	    //console.log("transforming " + this + " to " + tfm);
	    return tfm;
	}
    },

    getGlobalTransform: function() {
	var globalTransform = new lively.scene.Transform();
	var world = this.world();
	// var trace = [];
	for (var morph = this; morph != world; morph = morph.owner) {
	    globalTransform.preConcatenate(morph.getTransform());
	    // trace.push(globalTransform.copy());
	}
	// console.log("global transform trace [" + trace + "] for " + this);
	return globalTransform;
    },

    translateBy: function(delta) {
	this.changed();
	this.origin = this.origin.addPt(delta);
	// this.layoutChanged();
	// Only position has changed; not extent.  Thus no internal layout is needed
	this.transformChanged();
	if (this.fullBounds != null) this.fullBounds = this.fullBounds.translatedBy(delta);
	// DI: I don't think this can affect owner.  It may increase fullbounds
	//     due to stickouts, but not the bounds for layout...
	if (this.owner /* && this.owner !== this.world() */ && !this.transientBounds) this.owner.layoutChanged(); 
	this.changed();
	return this; 
    },

    setRotation: function(theta) { // in radians
	this.rotation = theta;
	// layoutChanged will cause this.transformChanged();
    }.wrap(Morph.onLayoutChange('rotation')),
    
    setScale: function(scale/*:float*/) {
	this.scale = scale;
	// layoutChanged will cause this.transformChanged();
    }.wrap(Morph.onLayoutChange('scale')),

    defaultOrigin: function(bounds, shapeType) { 
	return (shapeType == "rect" || shapeType == "rectangle") ? bounds.topLeft() : bounds.center(); 
    },

    getTranslation: function() { 
	return this.getTransform().getTranslation(); 
    },

    getRotation: function() { 
	return this.getTransform().getRotation().toRadians(); 
    },

    getScale: function() { 
	return this.getTransform().getScale(); 
    },

    moveBy: function(delta) {
	this.translateBy(delta);
    },

    rotateBy: function(delta) {
	this.setRotation(this.getRotation()+delta);
    },

    scaleBy: function(delta) {
	this.setScale(this.getScale()*delta);
    },

    throb: function() {
	this.scaleBy(this.getScale() <= 1 ? 2 : 0.9);
    },

    align: function(p1, p2) {
	return this.translateBy(p2.subPt(p1)); 
    },

    centerAt: function(p) {
	return this.align(this.bounds().center(), p); 
    },

    // toggle fisheye effect on/off
    toggleFisheye: function() {
	// if fisheye is true, we need to scale the morph to original size
	if (this.fishEye) {
	    this.scale = this.getScale()/this.fisheyeScale;
	    this.setFisheyeScale(1.0);
	    this.changed();
	}

	// toggle fisheye
	this.fishEye = !this.fishEye;
    },

    // sets the scaling factor for the fisheye between 1..fisheyeGrowth
    setFisheyeScale: function (newScale) {
	// take the original centerpoint
	var p = this.bounds().center();

	this.fisheyeScale = newScale;
	this.pvtCachedTransform = null;
	this.layoutChanged();  
	this.changed();

	// if the fisheye was on move the fisheye'd morph by the difference between 
	// original center point and the new center point divided by 2
	if (this.fishEye) {
	    // (new.center - orig.center)/2
	    var k = this.bounds().center().subPt(p).scaleBy(.5).negated();
	    if (!pt(0,0).eqPt(k)) {
		this.setPosition(this.position().addPt(k));
		this.layoutChanged();  
		this.changed();
	    }
	}
    },

    // Experimental radial "black hole" scrolling feature: When
    // an object comes close enough to the "event horizon" (specified
    // by 'towardsPoint'), the object is zoomed into the black hole.
    // Negative 'howMuch' values are used to "collapse" the display, 
    // while positive values expand and restore the display back to its 
    // original state.  For further information, see  
    // Sun Labs Technical Report SMLI TR-99-74, March 1999.
    moveRadially: function(towardsPoint, howMuch) {
	var position = this.getPosition();
	var relativePt = position.subPt(towardsPoint);
	var distance = towardsPoint.dist(position);
	if (!this.inBlackHole) this.inBlackHole = 0;

	// The object disappears entirely when it is less than 5 pixels away
	// The 'inBlackHole' counter keeps track of how many levels deep
	// the object is in the black hole, allowing the display to be
	// restored correctly.
	if (distance <= 5) {
	    if (howMuch < 0) {
		this.inBlackHole++;
		this.setScale(0);
	    } else {
		this.inBlackHole--;            
	    }
	} 

	if (this.inBlackHole == 0) {
	    // Start shrinking the object when it is closer than 200 pixels away
	    if (distance > 5 && distance < 200) this.setScale(distance/200);
	    else if (distance >= 200 && this.getScale() != 1) this.setScale(1);

	    // Calculate new location for the object
	    var theta = Math.atan2(relativePt.y, relativePt.x);
	    var newDistance = distance + howMuch;
	    if (newDistance < 0) newDistance = 1;    
	    var newX = newDistance * Math.cos(theta);
	    var newY = newDistance * Math.sin(theta);
	    this.setPosition(towardsPoint.addPt(pt(newX,newY)));
	}
    }

});

Morph.addMethods({     // help handling

    getHelpText: Functions.Null,  // override to supply help text


    showHelp: function(evt) {

	if (this.suppressBalloonHelp) return false;
	if (this.owner instanceof HandMorph) return false;
	var helpText = this.getHelpText();
	if (!helpText) return false;

	// Create only one help balloon at a time
	if (this.helpBalloonMorph && !this.helpBalloonMorph.getPosition().eqPt(evt.point())) {
	    this.helpBalloonMorph.setPosition(this.window().localize(evt.point()));
	    return false;
	} else {
	    var width = Math.min(helpText.length * 20, 260); // some estimate of width.
	    var window = this.window();
	    var pos = window.localize(evt.point());
	    this.helpBalloonMorph = new TextMorph(pos.addXY(10, 10).extent(pt(width, 20)), helpText);
	    window.addMorph(this.helpBalloonMorph.beHelpBalloonFor(this));
	    return true;
	}
    },

    hideHelp: function() {
	if (!this.helpBalloonMorph)  
	    return;
	this.helpBalloonMorph.remove();
	delete this.helpBalloonMorph;
    }

});



// Morph mouse event handling functions
Morph.addMethods({

    // KP: equivalent of the DOM capture phase
    // KP: hasFocus is true if the receiver is the hands's focus (?)
    captureMouseEvent: function Morph$captureMouseEvent(evt, hasFocus) {
	// Dispatch this event to the frontmost receptive morph that contains it
	// Note boolean return for event consumption has not been QA'd
	// if we're using the fisheye... 
	if (this.fishEye) {
	    // get the distance to the middle of the morph and check if we're 
	    // close enough to start the fisheye
	    var size = Math.max(this.bounds().width, this.bounds().height);

	    var dist = evt.mousePoint.dist(this.bounds().center()) / this.fisheyeProximity;
	    if (dist <= size) {
		// the fisheye factor is between 1..fisheyeGrowth
		this.setFisheyeScale(1 + this.fisheyeGrowth * Math.abs(dist/size - 1));
	    } else {
		// just a precaution to make sure fisheye scaling isn't 
		// affecting its surrounding any more
		this.setFisheyeScale(1.0);
	    }
	}

	if (hasFocus) return this.mouseHandler.handleMouseEvent(evt, this);

	if (!evt.priorPoint || !this.fullContainsWorldPoint(evt.priorPoint)) return false;
	
	if (this.hasSubmorphs()) {
	    // If any submorph handles it (ie returns true), then return
	    for (var i = this.submorphs.length - 1; i >= 0; i--) {
		if (this.submorphs[i].captureMouseEvent(evt, false)) return true;
	    }
	}
	if (this.mouseHandler == null)
	    return false;

	if (!evt.priorPoint || !this.shape.containsPoint(this.localize(evt.priorPoint))) 
	    return false;


	return this.mouseHandler.handleMouseEvent(evt, this); 
    },


    areEventsIgnored: function() {
	return this.getTrait("pointer-events") == "none";
    },

    ignoreEvents: function() { // will not respond nor get focus
	this.mouseHandler = null;
	this.setTrait("pointer-events", "none");
	return this;
    },

    enableEvents: function() {
	this.mouseHandler = MouseHandlerForDragging.prototype;
	this.removeTrait("pointer-events");
	
	return this;
    },

    relayMouseEvents: function(target, eventSpec) {
	this.mouseHandler = new MouseHandlerForRelay(target, eventSpec); 
    },

    handlesMouseDown: function(evt) {
	if (this.mouseHandler == null || evt.isCommandKey()) return false;  //default behavior
	return this.mouseHandler.handlesMouseDown(); 
    },

    onMouseDown: function(evt) { 
	this.hideHelp();
    }, //default behavior

    onMouseMove: function(evt, hasFocus) { //default behavior
	if (evt.mouseButtonPressed && this==evt.hand.mouseFocus && this.owner && this.owner.openForDragAndDrop) { 
	    this.moveBy(evt.mousePoint.subPt(evt.priorPoint));
	} // else this.checkForControlPointNear(evt);
	if (!evt.mouseButtonPressed) this.checkForControlPointNear(evt);
    },

    onMouseUp: function(evt) { }, //default behavior

    considerShowHelp: function(oldEvt) {
        // if the mouse has not moved reasonably
	var hand = oldEvt.hand;
	if (!hand) return; // this is not an active world so it doesn't have a hand
        else if (hand.getPosition().dist(oldEvt.mousePoint) < 10)
            this.showHelp(oldEvt);
    },
    
    delayShowHelp: function(evt) {
        var scheduledHelp = new SchedulableAction(this, "considerShowHelp", evt, 0);
        if (this.world())
            this.world().scheduleForLater(scheduledHelp, Config.ballonHelpDelay || 1000, false);
    },

    onMouseOver: function(evt) {
        this.delayShowHelp(evt);
    }, 

    onMouseOut: function(evt) { 
	this.hideHelp();
    }, 

    onMouseWheel: function(evt) { 
    }, // default behavior

    takesKeyboardFocus: Functions.False,

    setHasKeyboardFocus: Functions.False, // no matter what, say no

    requestKeyboardFocus: function(hand) {
	if (this.takesKeyboardFocus()) {
	    if (this.setHasKeyboardFocus(true)) {
		hand.setKeyboardFocus(this);
		return true;
	    }
	}
	return false;
    },

    relinquishKeyboardFocus: function(hand) {
	hand.setKeyboardFocus(null);
	return this.setHasKeyboardFocus(false); 
    },

    onFocus: function(hand) {
	this.addFocusHalo();
    },

    onBlur: function(hand) {
	this.removeFocusHalo();
    },

    removeFocusHalo: function() {
	if (!this.focusHalo) return false;
	//this.focusHalo.removeRawNode();
	this.focusHalo.remove();
	this.focusHalo = null;
	return true;
    },

    focusHaloInset: 2,

    focusStyle: {
	fill: null, 
	borderColor: Color.blue,
	strokeOpacity: 0.3
    },
    
    adjustFocusHalo: function() {
	this.focusHalo.internalSetBounds(this.localBorderBounds().expandBy(this.focusHaloInset));
    },

    addFocusHalo: function() {
	if (this.focusHalo || this.focusHaloBorderWidth <= 0) return false;
	this.focusHalo = new Morph(this.localBorderBounds().expandBy(this.focusHaloInset), "rect");
	this.focusHalo.transientBounds = true;  // Do this before adding the halo
	this.addMorph(this.focusHalo);
	this.focusHalo.applyStyle(this.focusStyle);
	this.focusHalo.setBorderWidth(this.focusHaloBorderWidth);
	this.focusHalo.setLineJoin(lively.scene.LineJoins.Round);
	this.focusHalo.ignoreEvents();
	return true;
    }

});


// Morph grabbing and menu functionality
Morph.addMethods({

    checkForControlPointNear: function(evt) {
	if (this.suppressHandles) return false; // disabled
	if (this.owner == null) return false; // can't reshape the world
	var partName = this.shape.partNameNear(this.localize(evt.point()));
	if (!partName) return false;
	var loc = this.shape.partPosition(partName);
	
	var handle = this.addMorph(this.makeHandle(loc, partName, evt.hand));  
	// after which it should get converted appropriately here
	handle.showHelp(evt);
	if (evt.hand.mouseFocus instanceof HandleMorph) evt.hand.mouseFocus.remove();
	evt.hand.setMouseFocus(handle);
	return true; 
    },
    
    makeHandle: function(position, partName, evt) { // can be overriden
	var handleShape = Object.isString(partName) || partName >= 0 ? "rect" : "ellipse";
	return new HandleMorph(position, handleShape, evt.hand, this, partName);
    },


    copySubmorphsOnGrab: false, // acts as a palette if true.
    
    // May be overridden to preempt (by returning null) the default action of grabbing me
    // or to otherwise prepare for being grabbed or find a parent to grab instead
    okToBeGrabbedBy: function(evt) {
	return this; 
    },

    editMenuItems: function(evt) { 
	return [];  // Overridden by, eg, TextMorph
    },

    showMorphMenu: function(evt) { 
	var menu = this.morphMenu(evt);
	// if (evt.mouseButtonPressed) evt.hand.setMouseFocus(menu);
	// evt.hand.setMouseFocus(menu);
	menu.openIn(this.world(), evt.point(), false, Object.inspect(this).truncate()); 
    },

    morphMenu: function(evt) {
	var items = [
	    ["remove", this.remove],
	    ["inspect", function(evt) { new SimpleInspector(this).openIn(this.world(), evt.point())}],
	    ["show class in browser", function(evt) { var browser = new SimpleBrowser(this);
					      browser.openIn(this.world(), evt.point());
					      browser.getModel().setClassName(this.getType());
					    }],
	    ["style", function() { new StylePanel(this).open()}],
	    ["drill", this.showOwnerChain.curry(evt)],
	    ["grab", this.pickMeUp.curry(evt)],
	    ["reset rotation", this.setRotation.curry(0)],
	    ["reset scaling", this.setScale.curry(1)],
	    [((this.fishEye) ? "turn fisheye off" : "turn fisheye on"), this.toggleFisheye],
	    ["-----"],
	    ["put me in a window", this.putMeInAWindow.curry(this.position())], 
	    ["put me in a tab", this.putMeInATab.curry(this.position())],
	    ["put me in the open", this.putMeInTheWorld.curry(this.position())],
	    ["-----"],
	    [((this.openForDragAndDrop) ? "close DnD" : "open DnD"), this.toggleDnD.curry(evt.point())],
	    ["show Lively markup", this.addSvgInspector.curry(this)],
	    ["package", function(evt) {  // FIXME insert package morph in exactly the same position?
		new PackageMorph(this).openIn(this.world(), this.bounds().center()); this.remove(); } ],
	    ["publish packaged ...", function() { this.world().prompt('publish as (.xhtml)', this.exportLinkedFile.bind(this)); }] 
	];
	if (this.okToDuplicate())
	    items.unshift(["duplicate", this.copyToHand.curry(evt.hand)]);

	if (this.getModel() instanceof SyntheticModel)
	    items.push( ["show Model dump", this.addModelInspector.curry(this)]);
	
	if (this.copySubmorphsOnGrab == true) 
	    items.push(["unpalettize", function() { this.copySubmorphsOnGrab = false; }]);
	else 
	    items.push(["palettize", function() { this.copySubmorphsOnGrab = true; }]);
	
	return new MenuMorph(items, this);
    },

    showPieMenu: function(evt) {
    	var menu, targetMorph = this;
	var items = [
		['border width ([])', function(evt) {
			var oldWidth = targetMorph.getBorderWidth();
			PieMenuMorph.setUndo(function() { targetMorph.setBorderWidth(oldWidth); });
			menu.addHandleTo(targetMorph, evt, 'borderWidth'); }],
		['duplicate (o-->o)', function(evt) {
			evt.hand.setPosition(menu.mouseDownPoint);
			menu.targetMorph.copyToHand(evt.hand);
			var theCopy = evt.hand.submorphs[0];
			PieMenuMorph.setUndo(function() { theCopy.remove(); });  // Why doesn't this work??
			}],
		['move (o-->)', function(evt) {
			var oldPos = targetMorph.getPosition();
			PieMenuMorph.setUndo(function() { targetMorph.setPosition(oldPos); });
			evt.hand.setPosition(menu.mouseDownPoint);
			evt.hand.addMorph(menu.targetMorph);
			if (menu.targetMorph instanceof SelectionMorph)  // Fixme:  This should be in SelectionMorph
				menu.targetMorph.selectedMorphs.forEach( function(m) { evt.hand.addMorph(m); });
			}],
		['scale (o < O)', function(evt) {
			var oldScale = targetMorph.getScale();
			PieMenuMorph.setUndo(function() { targetMorph.setScale(oldScale); });
			menu.addHandleTo(targetMorph, evt, 'scale');
			}],
		['rotate (G)', function(evt) {
			var oldRotation = targetMorph.getRotation();
			PieMenuMorph.setUndo(function() { targetMorph.setRotation(oldRotation); });
			menu.addHandleTo(targetMorph, evt, 'rotate');
			}],
		['delete (X)', function(evt) {
			var oldOwner = targetMorph.owner;
			PieMenuMorph.setUndo(function() { oldOwner.addMorph(targetMorph); });
			targetMorph.remove();
			}],
		['undo (~)', function(evt) { PieMenuMorph.doUndo(); }],
		['fill color (<>)', function(evt) {
			var oldFill = targetMorph.getFill();
			PieMenuMorph.setUndo(function() { targetMorph.setFill(oldFill); });
			var picker = new ColorPickerMorph(evt.mousePoint.extent(pt(50, 30)), targetMorph, "setFill", true);
			targetMorph.world().addMorph(picker);
			evt.hand.setMouseFocus(picker); }]
	];
	menu = new PieMenuMorph(items, this, 0.5);
	menu.open(evt);
    },

    putMeInAWindow: function(loc) {
	var c = this.immediateContainer();
	var w = this.world();
	var wm = new WindowMorph(this.windowContent(), this.windowTitle());
	// Position it so the content stays in place
	w.addMorphAt(wm, loc.subPt(wm.contentOffset));
	if (c) c.remove();
    },

    putMeInATab: function(loc) {
	var c = this.immediateContainer();
	var w = this.world();
	var wm = new TabbedPanelMorph(this.windowContent(), this.windowTitle());
	w.addMorphAt(wm, wm.getPosition());
	if (c) c.remove();
    },

    putMeInTheWorld: function(loc) {
	var c = this.immediateContainer();
	var loc = c ? c.position().addPt(c.contentOffset) : this.position();
	this.world().addMorphAt(this, loc);
	if (c) c.remove();
    },

    immediateContainer: function() { // Containers override to return themselves
	if (this.owner) return this.owner.immediateContainer();
	else return null;
    },

    windowContent: function() {
	return this; // Default response, overridden by containers
    },

    windowTitle: function() {
	return Object.inspect(this).truncate(); // Default response, overridden by containers
    },

    toggleDnD: function(loc) {
        // console.log(this + ">>toggleDnD");
	this.openForDragAndDrop = !this.openForDragAndDrop;
    },

    openDnD: function(loc) {
	this.openForDragAndDrop = true;
    },

    closeDnD: function(loc) {
        // console.log(this + ">>closeDnD");
	this.openForDragAndDrop = false;
    },

    closeAllToDnD: function(loc) {
        // console.log(this + ">>closeAllDnD");
        // Close this and all submorphs to drag and drop
        this.closeDnD(); 
        // make this recursive to give children a chance to interrupt...
        this.submorphs.forEach( function(ea) { ea.closeAllToDnD(); });
    },

    openAllToDnD: function() {
	// Open this and all submorphs to drag and drop
	this.withAllSubmorphsDo( function() { this.openDnD(); });
    },
    
    dropMeOnMorph: function(receiver) {
        receiver.addMorph(this); // this removes me from hand
    },

    pickMeUp: function(evt) {
	var offset = evt.hand.getPosition().subPt(evt.point());
	this.moveBy(offset);
	evt.hand.addMorph(this);
	evt.hand.showAsGrabbed(this);
    },

    notify: function(msg, loc) {
	if (!loc) loc = this.world().positionForNewMorph();
	new MenuMorph([["OK", 0, "toString"]], this).openIn(this.world(), loc, false, msg); 
    },

    showOwnerChain: function(evt) {
	var items = this.ownerChain().reverse().map(
	    function(each) { return [Object.inspect(each).truncate(), function(evt2) { each.showMorphMenu(evt) }]; });
	new MenuMorph(items, this).openIn(this.world(), evt.point(), false, "Top item is topmost");
    },

    copyToHand: function(hand) {
	// Function.prototype.shouldTrace = true;
	var copy = this.copy(new Copier());
	// when copying submorphs, make sure that the submorph that becomes a top-level morph 
	// reappears in the same location as its original.
	console.log('copied %s', copy);
	copy.owner = null; // so following addMorph will just leave the tfm alone
	this.owner.addMorph(copy); // set up owner as the original parent so that...        
	hand.addMorph(copy);  // ... it will be properly transformed by this addMorph()
	hand.showAsGrabbed(copy);
	// copy.withAllSubmorphsDo(function() { this.startStepping(null); }, null);
    },

    morphToGrabOrReceiveDroppingMorph: function(evt, droppingMorph) {
	return this.morphToGrabOrReceive(evt, droppingMorph, true);
    },

    morphToGrabOrReceive: function(evt, droppingMorph, checkForDnD) {
	// If checkForDnD is false, return the morph to receive this mouse event (or null)
	// If checkForDnD is true, return the morph to grab from a mouse down event (or null)
	// If droppingMorph is not null, then check that this is a willing recipient (else null)
	        
	if (!this.fullContainsWorldPoint(evt.mousePoint)) return null; // not contained anywhere
	// First check all the submorphs, front first
	for (var i = this.submorphs.length - 1; i >= 0; i--) {
	    var hit = this.submorphs[i].morphToGrabOrReceive(evt, droppingMorph, checkForDnD); 
	    if (hit != null) { 
	        //console.log(this + ">>morphToGrabOrReceive hit");
		return hit;  // hit a submorph
	    }
	}

	// Check if it's really in this morph (not just fullBounds)
	if (!this.containsWorldPoint(evt.mousePoint)) return null;

	// If no DnD check, then we have a hit (unless no handler in which case a miss)
	if (!checkForDnD) return this.mouseHandler ? this : null;

	// On drops, check that this is a willing recipient
	if (droppingMorph != null) {
	    return this.acceptsDropping(droppingMorph) ? this : null;
	} else {
	    // On grabs, can't pick up the world or morphs that handle mousedown
	    // DI:  I think the world is adequately checked for now elsewhere
	    // else return (!evt.isCommandKey() && this === this.world()) ? null : this; 
	    return this;
	}

    },

    morphToReceiveEvent: function(evt) {
	// This should replace morphToGrabOrReceive... in Hand where events
	// must be displatched to morphs that are closed to DnD
	return this.morphToGrabOrReceive(evt, null, false);
    },

    ownerChain: function() {
	// Return an array of me and all my owners
	// First item is, eg, world; last item is me
	if (!this.owner) return [this];
	var owners = this.owner.ownerChain();
	owners.push(this);
	return owners;
    },

    acceptsDropping: function(morph) { 
	return this.openForDragAndDrop && !(morph instanceof WindowMorph);
    }

});

Morph.subclass('PseudoMorph', {
    description: "This hack to make various objects serializable, despite not being morphs",
    
    initialize: function($super) {
	$super(pt(0,0).extent(0,0), "rect");
	this.setVisible(false);
    }

});


PseudoMorph.subclass('Invocation', {
    initialize: function($super, actor, scriptName, argIfAny) {
	$super();
	this.actor = actor;
	this.scriptName = scriptName;
	this.argIfAny = argIfAny; // better be primitive
    },

    exec: function Invocation$exec() {
	if (!this.actor) {
	    console.warn("no actor on script %s", this);
	    return null;
	}
	var func = this.actor[this.scriptName];
	if (func) {
	    return func.call(this.actor, this.argIfAny);
	} else {
	    //console.warn("no callback on actor %s", this.actor);
	    return null;
	}
    }

});


Invocation.subclass('SchedulableAction', {

    documentation: "Description of a periodic action",
    beVerbose: false,

    initialize: function($super, actor, scriptName, argIfAny, stepTime) {
	$super(actor, scriptName, argIfAny);
	this.stepTime = stepTime;
	this.ticks = 0;
    },

    toString: function() {
	return Strings.format("#<SchedulableAction[script=%s,arg=%s,stepTime=%s]>", 
			      this.scriptName, this.argIfAny, this.stepTime);
    },

    stop: function(world) {
	if (this.beVerbose) console.log("stopped stepping task %s", this);
	world.stopSteppingFor(this);
    },

    start: function(world) {
	if (this.beVerbose) console.log("started stepping task %s", this);
	world.startSteppingFor(this);
    }

});

// Morph stepping/timer functions
Morph.addMethods({

    startSteppingScripts: function() { }, // May be overridden to start stepping scripts

    stopStepping: function() {
	if (!this.activeScripts) return;
	// ignore null values
	this.activeScripts.select(function (ea) { return ea }).invoke('stop', this.world());
	this.activeScripts = null;
    },

    startStepping: function(stepTime, scriptName, argIfAny) {
	if (!scriptName) 
	    throw Error("Old code");
	var action = new SchedulableAction(this, scriptName, argIfAny, stepTime);
	this.addActiveScript(action);
	action.start(this.world());
	return action;
    },

    addActiveScript: function(action) {
	// Every morph carries a list of currently active actions (alarms and repetitive scripts)
	if (!this.activeScripts) this.activeScripts = [action];
	else this.activeScripts.push(action);
	if (!action.rawNode.parentNode) 
	    this.addMorph(action);
	return this;
	// if we're deserializing the rawNode may already be in the markup
    },


    suspendAllActiveScripts: function() {
	this.withAllSubmorphsDo( function() { this.suspendActiveScripts(); });
    },

    suspendActiveScripts: function() {
	if (this.activeScripts) { 
	    this.suspendedScripts = this.activeScripts.clone();
	    this.stopStepping();
	}
    },

    resumeAllSuspendedScripts: function() {
	var world = this.world();
	this.withAllSubmorphsDo( function() {
	    if (this.suspendedScripts) {
	    // ignore null values
		this.suspendedScripts.select(function (ea) { return ea }).invoke('start', world);
		this.activeScripts = this.suspendedScripts;
		this.suspendedScripts = null;
	    }
	});
    }

});

// Morph bounds, coordinates, moving and damage reporting functions
Morph.addMethods({ 
    
    // bounds returns the full bounding box in owner coordinates of this morph and all its submorphs
    bounds: function(ignoreTransients) {
	if (this.fullBounds != null) return this.fullBounds;

	var tfm = this.getTransform();
	//var fullBounds = tfm.transformRectToRect(this.localBorderBounds());
	var fullBounds = this.localBorderBounds(tfm);

	var subBounds = this.submorphBounds(ignoreTransients);
	if (subBounds != null) {
	    // could be simpler when no rotation...
	    fullBounds = fullBounds.union(tfm.transformRectToRect(subBounds));
	}

	if (fullBounds.width < 3 || fullBounds.height < 3) {
	    // Prevent Horiz or vert lines from being ungrabable
	    fullBounds = fullBounds.expandBy(3); 
	}
	this.fullBounds = fullBounds;
	return fullBounds; 
    },
    
    submorphBounds: function(ignoreTransients) {
	var subBounds = null;
	for (var i = 0; i < this.submorphs.length; i++) {
	    var m = this.submorphs[i];
	    if ((ignoreTransients && m.transientBounds))
		continue;
	    if (!m.isVisible()) {
		continue;
	    }
	    subBounds = subBounds == null ? m.bounds(ignoreTransients) : subBounds.union(m.bounds(ignoreTransients));
	}
	return subBounds;
    },
    
    // innerBounds returns the bounds of this morph only, and in local coordinates
    innerBounds: function() { 
	return this.shape.bounds();
    },
    
    localBorderBounds: function(optTfm) {
	// defined by the external edge of the border
	// if optTfm is defined, transform the vertices first, then take the union
	var bounds = optTfm ? Rectangle.unionPts(this.shape.vertices().invoke('matrixTransform', optTfm)) : this.shape.bounds();
	
	// double border margin for polylines to account for elbow protrusions
	bounds.expandBy(this.getBorderWidth()/2*(this.shape.hasElbowProtrusions ? 2 : 1));
	return bounds;
    },
    
    
    /** 
      * mapping coordinates in the hierarchy
      * @return [Point]
      */

    // map local point to world coordinates
    worldPoint: function(pt) { 
	return pt.matrixTransform(this.transformToMorph(this.world())); 
    },

    // map owner point to local coordinates
    relativize: function(pt) { 
	if (!this.owner) { 
	    throw new Error('no owner; call me after adding to a morph? ' + this);
	}
	try {
	    return pt.matrixTransform(this.owner.transformToMorph(this)); 
	} catch (er) {
	    // console.info("ignoring relativize wrt/%s", this);
	    return pt;
	}
    },

    // map owner rectangle to local coordinates
    relativizeRect: function(r) { 
	return rect(this.relativize(r.topLeft()), this.relativize(r.bottomRight()));
    },

    // map world point to local coordinates
    localize: function(pt) {
	if (pt == null) console.log('null pt');   
	if (this.world() == null) {
	    console.log('null this.world()');   
	    return pt;
	}
	return pt.matrixTransform(this.world().transformToMorph(this));
    },

    // map local point to owner coordinates
    localizePointFrom: function(pt, otherMorph) {   
	try {
	    return pt.matrixTransform(otherMorph.transformToMorph(this));
	} catch (er) {
	    // lively.lang.Execution.showStack();
	    console.log("problem " + er + " on " + this + " other " + otherMorph);
	    return pt;
	}
    },

    transformForNewOwner: function(newOwner) {
	return new lively.scene.Transform(this.transformToMorph(newOwner));
    },

    changed: function() {
	// (this.owner || this).invalidRect(this.bounds());
    },
    
    layoutOnSubmorphLayout: function(submorph) {
	// override to return false, in which case layoutChanged() will not be propagated to
	// the receiver when a submorph's layout changes. 
	return true;
    },

    transformChanged: function() {
	this.pvtCachedTransform = new lively.scene.Similitude(this.origin, this.rotation, this.scale * this.fisheyeScale);
	this.pvtCachedTransform.applyTo(this.rawNode);
    },

    layoutChanged: function Morph$layoutChanged() {
	// layoutChanged() is called whenever the cached fullBounds may have changed
	// It invalidates the cache, which will be recomputed when bounds() is called
	// Naturally it must be propagated up its owner chain.
	// Note the difference in meaning from adjustForNewBounds()
	// KP: the following may or may not be necessary:
	this.transformChanged(); // DI: why is this here?
	
	this.fullBounds = null;
	if (this.owner && this.owner.layoutOnSubmorphLayout(this) && !this.transientBounds) {     // May affect owner as well...
	    this.owner.layoutChanged();
	}
    },

    adjustForNewBounds: function() {
	// adjustForNewBounds() is called whenever the innerBounds may have changed in extent
	//  -- it should really be called adjustForNewExtent --
	// Depending on the morph and its layoutManager, it may then re-layout its
	// submorphs and, in the process, propagate the message down to leaf morphs (or not)
	// Of course a change in innerBounds implies layoutChanged() as well,
	// but, for now, these are called separately.
	// NB:  Because some morphs may re-lay themselves out in response to adjustForNewBounds()
	// adjustForNewBounds() *must never be called from* a layout operation;
	// The layout process should only move and resize submorphs, but never change the innerBounds

	// If this method is overridden by a subclass, it should call super as well
	if (this.focusHalo) this.adjustFocusHalo();
    },

    position: function() { // Deprecated -- use getPosition
	return this.shape.bounds().topLeft().addPt(this.origin); 
    },

    getPosition: function() {
	return this.shape.bounds().topLeft().addPt(this.origin); 
    },

    setPosition: function(newPosition) {
	var delta = newPosition.subPt(this.getPosition());
	this.translateBy(delta); 
    }

});

// Morph clipping functions
Morph.addMethods({

    clipToPath: function(shape) {
	if (this.clipPath) this.clipPath.removeRawNode();
	var clip = new lively.scene.Clip(shape).setDerivedId(this);
	this.addWrapperToDefs(clip);
	this.rawNode.setAttributeNS(null, "clip-path", clip.uri());
	this.clipPath = clip;
    },

    clipToShape: function() {
	this.clipToPath(this.shape);
    }

});

// Inspectors for Morphs
Morph.addMethods( {

    addSvgInspector: function() {
	var xml = Exporter.stringify(new Exporter(this).serialize(Global.document));
	var txt = this.world().addTextWindow({
	    content: xml,
	    title: "XML dump", 
	    position: this.world().positionForNewMorph(this)
	});
	txt.innerMorph().xml = xml; // FIXME a sneaky way of passing original text.
    },

    addModelInspector: function() {
	var model = this.getModel();
	if (model instanceof SyntheticModel) {
	    var variables = model.variables();
	    var list = [];
	    for (var i = 0; i < variables.length; i++) {
		var varName = variables[i];
		list.push(varName + " = " + model.get(varName));
	    }
	    this.world().addTextListWindow({
		content: list,
		title: "Simple Model dump",
		position: this.world().positionForNewMorph(this)
	    });
	}
    }
});


// Morph factory methods for creating simple morphs easily
Object.extend(Morph, {

    makeLine: function(verts, lineWidth, lineColor) {
	// make a line with its origin at the first vertex
	// Note this works for simple lines (2 vertices) and general polylines
	var line = new Morph(verts[0].asRectangle(), "rect");
	var vertices = verts.invoke('subPt', verts[0]);
	line.setShape(new lively.scene.Polyline(vertices, lineWidth, lineColor));
	return line; 
    },

    makeCircle: function(location, radius, lineWidth, lineColor, fill) {
	// make a circle of the given radius with its origin at the center
	var circle = new Morph(location.asRectangle().expandBy(radius), "ellipse");
	return circle.applyStyle({fill: fill, borderWidth: lineWidth, borderColor: lineColor});
    },

    makePolygon: function(verts, lineWidth, lineColor, fill) {
	// make a polygon with its origin at the starting vertex
	var poly = new Morph(pt(0,0).asRectangle(), "rect");
	poly.setShape(new lively.scene.Polygon(verts, fill, lineWidth, lineColor));
	return poly; 
    }
});

// View trait
ViewTrait = {
    connectModel: function(plugSpec, optKickstartUpdates) {
	// FIXME what if already connected, 
	if (plugSpec instanceof Relay) {
	    // new style model
	    this.formalModel = plugSpec;
	    // now, go through the setters and add notifications on model
	    if (plugSpec.delegate instanceof Record) 
		plugSpec.delegate.addObserversFromSetters(plugSpec.definition, this, optKickstartUpdates);
	    return;
	} else if (plugSpec instanceof Record) {
	    this.formalModel = plugSpec;
	    plugSpec.addObserversFromSetters(plugSpec.definition, this, optKickstartUpdates);
	    return;
	}
	// connector makes this view pluggable to different models, as in
	// {model: someModel, getList: "getItemList", setSelection: "chooseItem"}
	var newPlug = (plugSpec instanceof ModelPlug) ? plugSpec : new ModelPlug(plugSpec);
	
	var model = newPlug.model;
	if (!(model instanceof Model) && !this.checkModel(newPlug))
	    console.log("model " + model +  " is not a Model, view " + this);

	this.modelPlug = newPlug;

	if (model.addDependent) { // for mvc-style updating
	    model.addDependent(this);
	} 
	return this;
    },

    relayToModel: function(model, optSpec, optKickstart) {
	return this.connectModel(Relay.newInstance(optSpec || {}, model), optKickstart);
    },

    reconnectModel: function() {
	if (this.formalModel instanceof Relay) {
	    // now, go through the setters and add notifications on model
	    //alert('delegate ' + this.formalModel.delegate);
	    if (this.formalModel.delegate instanceof Record)  {
		this.formalModel.delegate.addObserversFromSetters(this.formalModel.definition, this);
	    }
	} else if (this.formalModel instanceof Record) {
	    this.formalModel.addObserversFromSetters(this.formalModel.definition, this);
	} //else alert('formal model ' + this.formalModel);
    },

    checkModel: function(plugSpec) {
	// For non-models, check that all supplied handler methods can be found
	var result = true;
	Properties.forEachOwn(plugSpec, function(modelMsg, value) {
	    if (modelMsg == 'model') return;
	    var handler = plugSpec.model[value];
	    
	    if (!handler || !(handler instanceof Function)) {
		// console.log
		alert("Supplied method name, " + value + " does not resolve to a function.");
		result = false;
	    }
	});
	return result;
    },

    disconnectModel: function() {
	var model = this.getModel();
	if (model && model.removeDependent) { // for mvc-style updating
	    model.removeDependent(this);
	} 
    },

    getModel: function() {
	var plug = this.getModelPlug();
	if (plug) return plug.model;
	else return this.getActualModel();
    },

    getActualModel: function() {
	return this.formalModel instanceof Relay ? this.formalModel.delegate : this.formalModel;
    },
    
    getModelPlug: function() { 
	var plug = this.modelPlug;
	return (plug && plug.delegate) ?  plug.delegate : plug;
    },

    getModelValue: function(functionName, defaultValue) {
	// functionName is a view-specific message, such as "getList"
	// The model plug then provides a reference to the model, as well as
	// the specific model accessor for the aspect being viewed, say "getItemList"
	// Failure at any stage will return the default value.
	// TODO: optionally verify that variable name is listed in this.pins
	if (this.formalModel) {  
	    // snuck in compatiblitiy with new style models
	    var impl = this.formalModel[functionName];
	    return impl ? impl.call(this.formalModel) : defaultValue;
	}
	
	var plug = this.getModelPlug();
	if (plug == null || plug.model == null || functionName == null) return defaultValue;
	var func = plug.model[plug[functionName]];
	if (func == null) return defaultValue;
	return func.call(plug.model); 
    },

    setModelValue: function(functionName, newValue) {
	// functionName is a view-specific message, such as "setSelection"
	// The model plug then provides a reference to the model, as well as
	// the specific model accessor for the aspect being viewed, say "chooseItem"
	// Failure at any stage is tolerated without error.
	// Successful sets to the model supply not only the newValue, but also
	// a reference to this view.  This allows the model's changed() method
	// to skip this view when broadcasting updateView(), and thus avoid
	// needless computation for a view that is already up to date.
	// TODO: optionally verify that variable name is listed in this.pins
	if (this.formalModel) { 
	    // snuck in compatiblitiy with new style models
	    var impl = this.formalModel[functionName];
	    return impl && impl.call(this.formalModel, newValue);
	}
	var plug = this.getModelPlug();
	if (plug == null || plug.model == null || functionName == null) return null;
	var func = plug.model[plug[functionName]];
	if (func == null) return null;
	func.call(plug.model, newValue, this);
	return plug[functionName];
    },

    updateView: function(aspect, controller) {
	// This method is sent in response to logic within the model executing
	//     this.changed(aspect, source)
	// The aspect used is the name of the get-message for the aspect
	// that needs to be updated in the view (and presumably redisplayed)
	// All actual view morphs will override this method with code that
	// checks for their aspect and does something useful in that case.
    }
};

Object.subclass('View', ViewTrait, {

    initialize: function(modelPlug) {
	if (modelPlug)
	    this.connectModel(modelPlug);
    },

    getType: function() { // convenience
	return this.constructor.getOriginal().type;
    },

    toString: function() {
	return "#<" + this.getType() + ">";
    }

});

Morph.addMethods(ViewTrait);


// ===========================================================================
// MVC model support
// ===========================================================================

/**
  * @class Model
  * An MVC style model class that allows changes to be automatically
  * propagated to multiple listeners/subscribers/dependents. 
  */ 

// A typical model/view relationship is set up in the following manner:
//        panel.addMorph(m = newTextListPane(new Rectangle(200,0,200,150)));
//        m.connectModel({model: this, getList: "getMethodList", setSelection: "setMethodName"});
// The "plug" object passed to connectModel() points to the model, and converts from
// view-specific messages like getList() and setSelection() to model-specific messages
// like getMethodList() and setMethodName.  This allow a single model to have, eg,
// several list views, each viewing a different list aspect of the model.

// A number of morphs are used as views, or "widgets".  These include TextMorph,
// ListMorph, ButtonMorph, SliderMorph, etc.  Each of these morphs uses the above
// plug mechanism to get or set model values and to respond to model changes.
// these are documented in Morph.getModelValue, setModelValue, and updateView

Object.subclass('Model', {

    initialize: function(dep) { 
	// Broadcasts an update message to all dependents when a value changes.
	this.dependents = (dep != null) ? [dep] : [];
    },

    addDependent: function (dep) { 
	this.dependents.push(dep); 
    },

    removeDependent: function (dep) {
	var ix = this.dependents.indexOf(dep);
	if (ix < 0) return;
	this.dependents.splice(ix, 1); 
    },

    changed: function(varName, source) {
	// Broadcast the message "updateView" to all dependents
	// If source (a dependent) is given, we skip it (already updated)
	// If varName is not given, then null will be the aspect of the updateView()
	//console.log('changed ' + varName);
	for (var i = 0; i < this.dependents.length; i++) {
	    if (source !== this.dependents[i]) {
		// console.log('updating %s for name %s', this.dependents[i], varName);
		this.dependents[i].updateView(varName, source);
	    } 
	} 
    },

    toString: function() {
	return Strings.format("#<Model:%s>", this.dependents);
    },

    // test?
    copyFrom: function(copier, other) {
	this.dependents = [];
	other.dependents.forEach(function(dep) { this.dependents.push(copier.lookup(dep.id())) }, this);
    }

});

lively.data.Wrapper.subclass('ModelPlug', { // obsolete with CheapListMorph?
    documentation: "A 'translation' from view's variable names to model's variable names",

    initialize: function(spec) {
	var props = [];
	Properties.forEachOwn(spec, function(p) {
	    this[p] = spec[p];
	    props.push(p);
	}, this);
    },
    
    toString: function() {
	var pairs = [];
	Properties.forEachOwn(this, function(p, value) { if (p != 'model') pairs.push(p + ":" + value) });
	return "#<ModelPlug{" + pairs.join(',') + "}>";
    },

    serialize: function(modelId) {
	var rawNode = LivelyNS.create("modelPlug", {model: modelId});
	Properties.forEachOwn(this, function(prop, value) {
	    switch (prop) {
	    case 'model':
	    case 'rawNode':
		break;
	    default:
		rawNode.appendChild(LivelyNS.create("accessor", {formal: prop, actual: value}));
	    }
	}, this);
	return rawNode;
    },

    inspect: function() {
	return JSON.serialize(this);
    },

    deserialize: function(importer, rawNode) {
	for (var acc = rawNode.firstChild; acc != null;  acc = acc.nextSibling) {
	    if (acc.localName != 'accessor') continue;
	    this[LivelyNS.getAttribute(acc, "formal")] = LivelyNS.getAttribute(acc, "actual");
	}
    }
});


Model.subclass('SyntheticModel', {
    documentation: "A stereotyped model synthesized from a list of model variables",

    initialize: function($super, vars) {
	$super(null);
	if (!(vars instanceof Array)) 
	    throw new Error("wrong argument to SyntheticModel: " + vars);
	for (var i = 0; i < vars.length; i++) {
	    var v = vars[i];
	    if (v.startsWith('-') || v.startsWith('+')) 
		v = v.slice(1);
	    this.addVariable(v, null);
	}
    },

    makeGetter: function(name) {
	// functional programming is fun!
	
	return function() { 
	    return this[name]; 
	};
    },

    makeSetter: function(name) {
	return function(newValue, v) { 
	    this[name] = newValue; 
	    this.changed(this.getterName(name), v); 
	};
    },

    addVariable: function(varName, initialValue) {
	this[varName] = initialValue;
	this[this.getterName(varName)] = this.makeGetter(varName);
	this[this.setterName(varName)] = this.makeSetter(varName);
    },

    getterName: function(varName) {
	return "get" + varName;
    },

    get: function(varName) {
	var method = this[this.getterName(varName)];
	if (!method) throw new Error(this.getterName(varName) + " not present ");
	return method.call(this, varName);
    },

    setterName: function(varName) {
	return "set" + varName;
    },

    set: function(varName, value) {
	var method = this[this.setterName(varName)]
	if (!method) throw new Error(this.setterName(varName) + " not present");
	return method.call(this, varName, value);
    },

    makePlugSpecFromPins: function(pinList) {
	var spec = { model: this};
	pinList.forEach(function(decl) {
	    if (!decl.startsWith('-')) { // not read-only
		var stripped = decl.startsWith('+') ? decl.slice(1) : decl;
		spec[this.setterName(stripped)] = this.setterName(stripped);
	    }
	    if (!decl.startsWith('+')) { // not write-only
		var stripped = decl.startsWith('-') ? decl.slice(1) : decl;
		spec[this.getterName(stripped)] = this.getterName(stripped);
	    }
	}, this);
	return spec;
    },

    makePlugSpec: function() {
	// make a plug of the form {model: this, getVar1: "getVar1", setVar1: "setVar1" .. }
	var spec = {model: this};
	this.variables().forEach(function(v) { 
	    var name = this.getterName(v);
	    spec[name] = name;
	    name = this.setterName(v);
	    spec[name] = name;
	}, this);
	return spec;
    },

    variables: function() {
	return Properties.own(this).filter(function(name) { return name != 'dependents'});
    }
});


Morph.addMethods({
    
    exportLinkedFile: function(filename) {
	var url = Exporter.saveDocumentToFile(Exporter.shrinkWrapMorph(this), filename);
	if (url) this.world().reactiveAddMorph(new ExternalLinkMorph(url));
	return url;
    }

});


// ===========================================================================
// World-related widgets
// ===========================================================================

// A unique characteristics of the Morphic graphics system is that
// all the objects (morphs) live in a "world" that is shared between 
// different objects and even between different users.  A world can
// contain a large number of different applications/widgets, much like
// in an operating system a folder can contain a lot of files.  Worlds
// can be linked to each other using LinkMorphs.  As a consequence,
// the entire system can contain a large number of worlds, each of
// which contains a large number of simultaneously running applications
// and widgets. 

Morph.subclass("PasteUpMorph", {

    documentation: "used for layout, most notably the world and, e.g., palettes",

    initialize: function($super, bounds, shapeType) {
        return $super(bounds, shapeType);
    },
    
    captureMouseEvent: function PasteUpMorph$captureMouseEvent($super, evt, hasFocus) {
        if (evt.type == "MouseDown" && this.onMouseDown(evt)) return; 
        $super(evt, hasFocus); 
    },

    onMouseDown: function PasteUpMorph$onMouseDown($super, evt) {  //default behavior is to grab a submorph
	$super(evt);
        var m = this.morphToReceiveEvent(evt);
        if (Config.usePieMenus) {
		if (m.handlesMouseDown(evt)) return false;
		m.showPieMenu(evt, m);
		return true;
	}
	if (m == null) { 
            this.makeSelection(evt); 
            return true; 
        } else if (!evt.isCommandKey()) {
            if (m === this.world()) { 
                this.makeSelection(evt); 
                return true; 
            } else if (m.handlesMouseDown(evt)) return false;
        }
        evt.hand.grabMorph(m, evt);
        return true; 
    },

    okToBeGrabbedBy: function(evt) {
        // Paste-ups, especially the world, cannot be grabbed normally
        return null; 
    },

    makeSelection: function(evt) {  //default behavior is to grab a submorph
        if (this.world().currentSelection != null) this.world().currentSelection.removeOnlyIt();
        var m = new SelectionMorph(evt.point().asRectangle());
        this.world().addMorph(m);
        this.world().currentSelection = m;
        var handle = new HandleMorph(pt(0,0), "rect", evt.hand, m, "bottomRight");
	handle.setExtent(pt(0, 0));
	handle.mode = 'reshape';
        m.addMorph(handle);
        evt.hand.setMouseFocus(handle);
    }
    
});


namespace('lively.Text');

using(lively.Text).run(function(text) {

/**
 * @class WorldMorph
 */ 

PasteUpMorph.subclass("WorldMorph", {
    
    documentation: "A Morphic world (a visual container of other morphs)",
    fill: Color.primary.blue,
    defaultExtent: pt(1280, 1024),
    // Default themes for the theme manager    
    displayThemes: {
        primitive: { // Primitive look and feel -- flat fills and no rounding or translucency
            styleName:   'primitive',
            titleBar:    { borderRadius: 0, borderWidth: 2, bordercolor: Color.black,
                           fill: Color.neutral.gray.lighter() },
	    
            slider:      { borderColor: Color.black, borderWidth: 1, 
                           fill: Color.neutral.gray.lighter() },
            button:      { borderColor: Color.black, borderWidth: 1, borderRadius: 0,
                           fill: Color.lightGray },
            widgetPanel: { borderColor: Color.red, borderWidth: 2, borderRadius: 0,
                           fill: Color.blue.lighter()},
            clock:       { borderColor: Color.black, borderWidth: 1,
                           fill: new lively.paint.RadialGradient([Color.yellow.lighter(2), 1, Color.yellow]) },
	    panel:       { fill: Color.primary.blue.lighter(2), borderWidth: 2, borderColor: Color.black},
            link:        { borderColor: Color.green, borderWidth: 1, fill: Color.blue},
	    helpText:    { borderRadius: 15, fill: Color.primary.yellow.lighter(3), fillOpacity: .8},
	    fabrik:      { borderColor: Color.red, borderWidth: 2, borderRadius: 0, fill: Color.blue.lighter(), opacity: 1}
        },

        lively: { // This is to be the style we like to show for our personality
            styleName: 'lively',
            titleBar:    { borderRadius: 8, borderWidth: 2, bordercolor: Color.black,
                           fill: new lively.paint.LinearGradient([Color.primary.blue.lighter(), 1, Color.primary.blue, 1, Color.primary.blue.lighter(2)], 
						    lively.paint.LinearGradient.SouthNorth)},
            slider:      { borderColor: Color.black, borderWidth: 1, 
			   fill: new lively.paint.LinearGradient([Color.primary.blue.lighter(2), 1, Color.primary.blue])},
            button:      { borderColor: Color.neutral.gray, borderWidth: 0.3, borderRadius: 4,
                           fill: new lively.paint.LinearGradient([Color.darkGray, 1, Color.darkGray.lighter(2)], lively.paint.LinearGradient.SouthNorth) },
            widgetPanel: { borderColor: Color.blue, borderWidth: 4, borderRadius: 16,
                           fill: Color.blue.lighter(), opacity: 0.4},
            clock:       { borderColor: Color.black, borderWidth: 1,
                           fill: new lively.paint.RadialGradient([Color.primary.blue.lighter(2), 1, Color.primary.blue.lighter()]) },
	    panel:       { fill: Color.primary.blue.lighter(2), borderWidth: 2, borderColor: Color.black},
            link:        { borderColor: Color.green, borderWidth: 1, fill: Color.blue},
	    helpText:    { borderRadius: 15, fill: Color.primary.yellow.lighter(3), fillOpacity: .8},
        // fabrik:      { borderColor: Color.gray.lighter(), borderWidth: 2, borderRadius: 3,
        //                     fill: Color.gray, opacity: 1}
        fabrik:      { borderColor: Color.blue, borderWidth: 1.5 , borderRadius: 3,
                            fill: Color.blue.lighter(), opacity: 0.8}
        },

        turquoise: { // Like turquoise, black and silver jewelry, [or other artistic style]
            styleName: 'turquoise',
            titleBar:    { borderRadius: 8, borderWidth: 2, bordercolor: Color.black,
                           fill: new lively.paint.LinearGradient([Color.turquoise, 1, Color.turquoise.lighter(3)])},
            slider:      { borderColor: Color.black, borderWidth: 1, 
			   fill: new lively.paint.LinearGradient([Color.turquoise.lighter(2), 1, Color.turquoise])},
            button:      { borderColor: Color.neutral.gray.darker(), borderWidth: 2, borderRadius: 8,
                           fill: new lively.paint.RadialGradient([Color.turquoise.lighter(), 1, Color.turquoise]) },
            widgetPanel: { borderColor: Color.neutral.gray.darker(), borderWidth: 4,
                           fill: Color.turquoise.lighter(3), borderRadius: 16},
            clock:       { borderColor: Color.black, borderWidth: 1,
                           fill: new lively.paint.RadialGradient([Color.turquoise.lighter(2), 1, Color.turquoise]) },
	    panel:       {fill: Color.primary.blue.lighter(2), borderWidth: 2, borderColor: Color.black},
            link:        { borderColor: Color.green, borderWidth: 1, fill: Color.blue},
	    helpText:    { borderRadius: 15, fill: Color.primary.yellow.lighter(3), fillOpacity: .8},
	    fabrik:      { borderColor: Color.neutral.gray.darker(), borderWidth: 4,
                               fill: Color.turquoise.lighter(3), borderRadius: 16}
        }
    },

    initialize: function($super, canvas, backgroundImageId) {
        var bounds = Rectangle.fromElement(canvas);

        // sometimes bounds has zero dimensions (when reloading thes same page, timing issues?
        // in Firefox bounds may be 1x1 size?? maybe everything should be run from onload or sth?
        if (bounds.width < 2) {
            bounds.width = this.defaultExtent.x;
        }

        if (bounds.height < 2) {
            bounds.height = this.defaultExtent.y;
        }

        if (backgroundImageId) {
            var background = NodeFactory.create("use");
	    XLinkNS.setHref(background, backgroundImageId);
            this.addNonMorph(background);
        }
        $super(bounds, "rect");

	var gradient = new lively.paint.LinearGradient([Color.primary.blue.lighter(), 1, Color.primary.blue, 1, Color.primary.blue.lighter(), 1, Color.primary.blue, 1, Color.primary.blue.lighter()]);
	gradient.rawNode.setAttributeNS(null, "gradientTransform", "translate(0, -0.1) skewY(10)");
        this.setFill(gradient);
	
	
	this.enterCount = 0;
    },

    initializeTransientState: function($super, initialBounds) {
        $super(initialBounds);
        this.hands = [];
        this.setDisplayTheme(this.displayThemes['lively']);

        this.scheduledActions = [];  // an array of schedulableActions to be evaluated
        this.lastStepTime = (new Date()).getTime();
        this.mainLoopFunc = this.doOneCycle.bind(this).logErrors('Main Loop');
        this.mainLoop = Global.setTimeout(this.mainLoopFunc, 30);
        this.worldId = ++WorldMorph.worldCount;

        return this;
    },

    
    remove: function() {
        if (!this.rawNode.parentNode) return null;  // already removed
        this.stopStepping();
	this.removeRawNode();
        return this;
    },

    toggleNativeCursor: function(flag) {
	this.canvas().setAttributeNS(null, "cursor", flag ? "auto" : "none");
    },

    displayOnCanvas: function(canvas) {
	// this.remove();
	if (this.rawNode.parentNode !== canvas) canvas.appendChild(this.rawNode);
        var hand = this.addHand(new HandMorph(true));
	WorldMorph.currentWorld = this; // this conflicts with mutliple worlds
        this.onEnter(); 
	
	this.enterCount ++;
    },
    
    addHand: function(hand) {
        if (this.hands.length > 0 && !this.hands.first())
            this.hands.shift(); // FIXME: Quick bugfix. When deserializing the world the hands.first() is sometimes undefined
        this.hands.push(hand);
        hand.owner = this;
        hand.registerForEvents(this);
        hand.registerForEvents(hand);
        hand.layoutChanged();
	
        Event.keyboardEvents.forEach(function(each) {
            document.documentElement.addEventListener(each, hand, hand.handleOnCapture);
        });

        this.rawNode.parentNode.appendChild(hand.rawNode);
	return hand;
    },
    
    removeHand: function(hand) {
	hand.setMouseFocus(null); // cleanup, just in case
	hand.setKeyboardFocus(null); // cleanup (calls blur(), which will remove the focus halo)
	hand.removeRawNode();
        hand.unregisterForEvents(this);
        hand.unregisterForEvents(hand);

        Event.keyboardEvents.forEach(function(each) {
            document.documentElement.removeEventListener(each, hand, hand.handleOnCapture);
        });

        this.hands.splice(this.hands.indexOf(hand), 1);
    },

    morphMenu: function($super, evt) { 
        var menu = $super(evt);
        menu.keepOnlyItemsNamed(["inspect", "style"]);
        menu.addLine();
        menu.addItem(["new object...", this.addMorphs.curry(evt)]);
        menu.addLine();
        menu.addItem([(Config.usePieMenus ? "don't " : "") + "use pie menus",
                      function() { Config.usePieMenus = !Config.usePieMenus; }]);
        menu.addItem(["choose display theme...", this.chooseDisplayTheme]);
        menu.addItem([(Morph.prototype.suppressBalloonHelp ? "enable balloon help" : "disable balloon help"),
                      this.toggleBalloonHelp]);
        menu.addItem([(HandMorph.prototype.applyDropShadowFilter ? "disable " : "enable ") + "drop shadow (if supported)",
		      function () { HandMorph.prototype.applyDropShadowFilter = !HandMorph.prototype.applyDropShadowFilter}]);
        menu.addItem([(Config.useDebugBackground ? "use normal background" : "use debug background"),
                      this.toggleDebugBackground]);
        if(Config.debugExtras) {
		menu.addItem(["arm profile for next mouseDown", function() {evt.hand.armProfileFor("MouseDown") }]);
        	menu.addItem(["arm profile for next mouseUp", function() {evt.hand.armProfileFor("MouseUp") }]);
	}
        menu.addLine();
        menu.addItem(["authenticate for write access", function() { new NetRequest().put(URL.source.withFilename('auth'));
                      if (Config.showWikiNavigator) WikiNavigator.enableWikiNavigator(true); /* sometimes the wikiBtn seems to break after an authenticate*/ }]);
        menu.addItem(["publish world as ... ", function() { this.prompt("world file (.xhtml)", this.exportLinkedFile.bind(this)); }]);
	if (URL.source.filename() != "index.xhtml") { 
	    // save but only if it's not the startup world
            menu.addItem(["save current world to current URL", function() { 
		menu.remove(); 
		Exporter.saveDocumentToFile(Exporter.shrinkWrapMorph(this), URL.source.filename());
	    }]);
	}
        menu.addItem(["restart system", this.restart]);
        return menu;
    },
    
    showPieMenu: function(evt) {
    	var menu, targetMorph = this;
	var items = [
		['make selection ([NE])', function(evt) { targetMorph.makeSelection(evt); }],
		['make selection ([SE])', function(evt) { targetMorph.makeSelection(evt); }],
		['make selection ([SW])', function(evt) { targetMorph.makeSelection(evt); }],
		['make selection ([NW])', function(evt) { targetMorph.makeSelection(evt); }],
		];
	menu = new PieMenuMorph(items, this, 0);
	menu.open(evt);
    },

    toggleBalloonHelp: function() {
        Morph.prototype.suppressBalloonHelp = !Morph.prototype.suppressBalloonHelp;
    },

    toggleDebugBackground: function() {
        // Debug background is transparent, so that we can see the console
        // if it is not otherwise visible
        Config.useDebugBackground = !Config.useDebugBackground;
        this.shape.setFillOpacity(Config.useDebugBackground ? 0.8 : 1.0);
    },

    chooseDisplayTheme: function(evt) { 
        var themes = this.displayThemes;
        var target = this; // trouble with function scope
        var themeNames = Properties.own(themes);
        var items = themeNames.map(
            function(each) { return [each, target, "setDisplayTheme", themes[each]]; });
        var menu = new MenuMorph(items, this);
        menu.openIn(this.world(), evt.point());
    },
    
    setDisplayTheme: function(styleDict) { 
        this.displayTheme = styleDict;
        this.withAllSubmorphsDo( function() { this.applyLinkedStyles(); });
    },
    
    restart: function() {
        window.location && window.location.reload();
    },

    defaultOrigin: function(bounds) { 
        return bounds.topLeft(); 
    },
    
    layoutChanged: function() {
	// do nothing
    },

    layoutOnSubmorphLayout: function() {
	return false;
    },
    
    world: function() { 
        return this; 
    },
    
    firstHand: function() {
        return this.hands[0];
    },
    
    moveBy: function(delta) { // don't try to move the world
    },
    
    //  *** The new truth about ticking scripts ***
    //  A morph may have any number of active scripts
    //  Each is activated by a call such as
    //      this.startStepping(50, "rotateBy", 0.1);
    //  Note that stepTime is in milliseconds, as are all lower-level methods
    //  The arguments are: stepTime, scriptName, argIfAny
    //  This in turn will create a SchedulableAction of the form
    //  { actor: aMorph, scriptName: "rotateBy", argIfAny: 0.1, stepTime: 50, ticks: 0 }
    //  and this action will be both added to an array, activeScripts in the morph,
    //  and it will be added to the world's scheduledActions list, which is an array of
    //  tuples of the form [msTimeToRun, action]
    //  The ticks field is used to tally ticks spent in each schedulableAction --
    //  It is incremented on every execution, and it is multiplied by 0.9 every second
    //  Thus giving a crude 10-second average of milliseconds spent in this script
    //  every 10 seconds.  The result is divided by 10 in the printouts.
    //
    //  The message startSteppingScripts can be sent to morphs when they are placed in the world.
    //  It is intended that this may be overridden to start any required stepping.
    //  The message stopStepping will be sent when morphs are removed from the world.
    //  In this case the activeScripts array of the morph is used to determine exactly what
    //  scripts need to be unscheduled.  Note that startSteppingScripts is not sent
    //  automatically, whereas stopStepping is.  We know you won't forget to 
    //  turn your gadgets on, but we're more concerned to turn them off when you're done.

    scheduleForLater: function(action, delayInMs, removePrior) {
        if (removePrior) this.stopSteppingFor(action, true);  // unschedule earlier
        this.scheduleAction(new Date().getTime() + delayInMs, action);
    },
    
    startSteppingFor: function(action) {
        if (!action.scriptName)
	    throw new Error("old code");
        // New code for stepping schedulableActions
        this.stopSteppingFor(action, true);  // maybe replacing arg or stepTime
        this.scheduleAction(new Date().getTime(), action);
    },
    
    stopSteppingFor: function(action, fromStart) { // should be renamed to unschedule()
        // fromStart means it is just getting rid of a previous one if there,
        // so not an error if not found
	// DI FIXME: This only removes the first one found (alarms may be multiply scheduled)

        if (this.currentScript === action) {
	    // Not in queue; just prevent it from being rescheduled
	    this.currentScript = null;
	    return;
	}
	var list = this.scheduledActions;  // shorthand
        for (var i = 0; i < list.length; i++) {
            var actn = list[i][1];
            if (actn === action) {
                list.splice(i, 1);
                return; 
            }
        }
        // Never found that action to remove.  Note this is not an error if called
        // from startStepping just to get rid of previous version
        if (!fromStart) {
	    console.log('failed to stopStepping ' + action);
	    lively.lang.Execution.showStack();
	}
    },
    
    inspectScheduledActions: function() {
        // inspect an array of all the actions in the scheduler.  Note this
        // is not the same as scheduledActions which is an array of tuples with times
        new SimpleInspector(this.scheduledActions.map(function(each) { return each[1]; })).open();
    },

    doOneCycle: function WorldMorph$doOneCycle(world) {
        // Process scheduled scripts

        // Run through the scheduledActions queue, executing those whose time has come
        // and rescheduling those that have a repeatRate
        // Note that actions with error will not get rescheduled
        // (and, unless we take the time to catch here, will cause all later 
        // ones in the queue to miss this tick.  Better less overhead, I say
        // DI: **NOTE** this needs to be reviewed for msClock rollover
        // -- also note we need more time info for multi-day alarm range
        // When we do this, I suggest that actions carry a date and msTime
        // and until their day is come, they carry a msTime > a day
        // That way they won't interfere with daily scheduling, but they can
        // still be dealt with on world changes, day changes, save and load.
	var msTime = new Date().getTime();
	var timeOfNextStep = Infinity;
        var list = this.scheduledActions;  // shorthand
        var timeStarted = msTime;  // for tallying script overheads
	while (list.length > 0 && list[list.length - 1][0] <= msTime) {
            var schedNode = list.pop();  // [time, action] -- now removed
            var action = schedNode[1];
            this.currentScript = action; // so visible from stopStepping
            lively.lang.Execution.resetDebuggingStack();  // Reset at each tick event
	    try {
                action.exec();
            } catch (er) {
                console.warn("error on actor %s: %s", action.actor, er);
                dbgOn(true);
                lively.lang.Execution.showStack();
		timeStarted = new Date().getTime();
		continue;
            }
            // Note: if error in script above, it won't get rescheduled below (this is good)
	    
            // Note: stopStepping may set currentScript to null so it won't get rescheduled
            if (this.currentScript && action.stepTime > 0) {
                var nextTime = msTime + action.stepTime;
                this.scheduleAction(nextTime, action)
            }
            this.currentScript = null;

            var timeNow = new Date().getTime();
            var ticks = timeNow - timeStarted;
            if (ticks > 0) action.ticks += ticks;  // tally time spent in that script
            timeStarted = timeNow;
        }
	//  Need to generate a mouseMove if any ticking scripts have run
	//  Allows simulations to respond where, eg, a morph moves under the mouse
	var myHand = this.firstHand();
	if (myHand) myHand.makeAMove();

        if (list.length > 0) timeOfNextStep = Math.min(list[list.length-1][0], timeOfNextStep);

        // Each second, run through the tick tallies and mult by 0.9 to 10-sec "average"
        if (!this.secondTick) this.secondTick = 0;
        var secondsNow = Math.floor(msTime / 1000);
        if (this.secondTick != secondsNow) {
            this.secondTick = secondsNow;
            var tallies = {};
            for (var i=0; i<list.length; i++) {
                var action = list[i][1];
                tallies[action.scriptName] = action.ticks;
                action.ticks *= 0.9 // 10-sec decaying moving window
            }
            if (Config.showSchedulerStats && secondsNow % 10 == 0) {
                console.log('New Scheduler length = ' + this.scheduledActions.length);
                console.log('Script timings...');  // approx ms per second per script
                for (var p in tallies) console.log(p + ': ' + (tallies[p]/10).toString());
            }
        }
        this.lastStepTime = msTime;
        this.setNextStepTime(timeOfNextStep);
    },

    setNextStepTime: function(timeOfNextStep) {
        if (timeOfNextStep == Infinity) { // didn't find anything to cycle through
            this.mainLoop = null; 
        } else {
            this.mainLoop = Global.setTimeout(this.mainLoopFunc, timeOfNextStep - this.lastStepTime);
        }
    },

    kickstartMainLoop: function() {
        // kickstart the timer (note arbitrary delay)
        this.mainLoop = Global.setTimeout(this.mainLoopFunc, 10);
    },

    scheduleAction: function(msTime, action) { 
        // Insert a SchedulableAction into the scheduledActions queue

        var list = this.scheduledActions;  // shorthand
        for (var i=list.length-1; i>=0; i--) {
            var schedNode = list[i];
            if (schedNode[0] > msTime) {
                list.splice(i+1, 0, [msTime, action]);
                if (!this.mainLoop) this.kickstartMainLoop();
                return; 
            }
        }
        list.splice(0, 0, [msTime, action]);
        if (!this.mainLoop) this.kickstartMainLoop();
    },

    onEnter: function() {},
    onExit: function() {},

    /**
     * override b/c of parent treatement
     */
    relativize: function(pt) { 
        return pt;
        //return pt.matrixTransform(this.rawNode.parentNode.getTransformToElement(this.rawNode)); 
    },
    
    addMorphs: function(evt) {
        //console.log("mouse point == %s", evt.mousePoint);
	// FIXME this boilerplate code should be abstracted somehow.
        var world = this.world();
        var morphItems = [
            ["Line", function(evt) { var p = evt.point(); world.addMorph(Morph.makeLine([p, p.addXY(60, 30)], 2, Color.black));}],
            ["Rectangle", function(evt) { world.addMorph(new Morph(evt.point().extent(pt(60, 30)), "rect"));}],
            ["Ellipse", function(evt) { world.addMorph(new Morph(evt.point().extent(pt(50, 50)), "ellipse"));}],
            ["TextMorph", function(evt) { world.addMorph(new TextMorph(evt.point().extent(pt(120, 10)), "This is a TextMorph"));}],
            ["Star", function(evt) { 
                var makeStarVertices = function(r,center,startAngle) {
                    var vertices = [];
                    var nVerts = 10;
                    for (var i=0; i <= nVerts; i++) {
                        var a = startAngle + (2*Math.PI/nVerts*i);
                        var p = Point.polar(r,a);
                        if (i%2 == 0) p = p.scaleBy(0.39);
                        vertices.push(p.addPt(center)); 
                    }
                    return vertices; 
                }
            	var widget = Morph.makePolygon(makeStarVertices(50,pt(0,0),0), 1, Color.black, Color.yellow);
            	widget.setPosition(evt.point());
                world.addMorph(widget)}],
            ["Heart", function(evt) { 
                var shape1 = [pt(0,0), pt(50,0), pt(50,50), pt(0,50), pt(0,0)];
                var widget = new Morph(evt.point().extent(pt(100,100)),"path");
                widget.setShape(new lively.scene.Path(shape1, Color.red, 3, Color.red));
                widget.rotateBy(3.9);
                world.addMorph(widget);
                document.getElementById(widget.id()).childNodes[0].setAttribute('d', "M0,0T48.25658178329468,-5.770838260650635T85.89215588569641,15.051417827606201T61.36309051513672,32.78068518638611T53.225199699401855,46.00089120864868T25.02833652496338,68.58267283439636T1.0328261852264404,40.347657918930054T0,0")
                }],
        ];
        var complexMorphItems =  [
            ["SliderMorph", function(evt) { world.addMorph(new SliderMorph(evt.point().extent(pt(120, 40))))}],
            ["Clock", function(evt) {
                var m = world.addMorph(new ClockMorph(evt.point(), 50));
                m.startSteppingScripts(); }],
            ["Piano Keyboard", function(evt) {
                module('Main.js').requires('Examples.js').toRun(function() {
                    var m = new PianoKeyboard(evt.point());
                    m.scaleBy(1.5);  m.rotateBy(-0.2);
                    world.addMorph(m)})
             }],
        ];
        var toolMenuItems = [
            ["Class Browser", function(evt) { new SimpleBrowser().openIn(world, evt.point()); }],
            ["Enhanced Class Browser", function(evt) { new lively.Tools.SystemBrowser().openIn(world, evt.point()) }],
            ["File Browser", function(evt) { new FileBrowser().openIn(world, evt.point()) }],
            ["Console", function(evt) {world.addFramedMorph(new ConsoleWidget(50).buildView(pt(800, 100)), "Console", evt.point()); }],
            ["Object Hierarchy Browser", function(evt) { new ObjectBrowser().openIn(world, evt.point()); }],    
            ["TestRunner", function(evt) { new TestRunner().openIn(world, evt.point()); }],
            ["OmetaWorkspace", function(evt) { new OmetaWorkspace().openIn(world, evt.point()); }],
    	    ["Call Stack Viewer", function(evt) { 
    		if (Config.debugExtras) lively.lang.Execution.showStack("use viewer");
    		else new StackViewer(this).openIn(world, evt.point()); }],    
            ["FrameRateMorph", function(evt) {
                var m = world.addMorph(new FrameRateMorph(evt.point().extent(pt(160, 10)), "FrameRateMorph"));
                m.startSteppingScripts(); }],
    	    ["XHTML Browser", function(evt) { 
    		var xeno = new XenoBrowserWidget('sample.xhtml');
    		xeno.openIn(world, evt.point()); 
    	    }]
        ];
        var scriptingMenuItems = [
            ["TileScriptingBox", function(evt) { require('lively.TileScripting').toRun(function() {new lively.TileScripting.TileBox().openIn(world, evt.point()); }) }],
            ["Fabrik Component Box", function(evt) { require('Fabrik.js').toRun(function() { Fabrik.openComponentBox(world, evt.point()); }) }]
        ];
        var miscItems = [
            ["New subworld (LinkMorph)", function(evt) { world.addMorph(new LinkMorph(null, evt.point()));}],  
	    ["External link", function(evt) { world.addMorph(new ExternalLinkMorph(URL.source, evt.point()));}],
	    ["Model documentation", function(evt) { // FIXME this is hardcoded, remove later, shows how Subversion can be accessed directly.
    	        var url = URL.common.project.withRelativePath("/index.fcgi/wiki/NewModelProposal?format=txt");
    	        var model = Record.newPlainInstance({URL: url,  ContentText: null});
    	        world.addTextWindow({
    		    content: "fetching ... ",
    		    title: "Model documentation",
    		    plug: model.newRelay({Text: "-ContentText"}),
    		    position: "center"
    	        });
    	    var res = new Resource(model);
    	    res.fetch();
    	    }]
        ];
        var items = [
            ['Simple morphs', morphItems],
            ['Complex morphs', complexMorphItems],
            ['Tools', toolMenuItems],
            ['Scripting', scriptingMenuItems],
            ['Misc', miscItems]];
        var menu = new MenuMorph(items, this).openIn(this.world(), evt.point());;
    },
    
    viewport: function() {
	try {
	    return Rectangle.ensure(this.canvas().viewport);
	} catch (er) { // FF doesn't implement viewport ?
	    return this.shape.bounds();
	}
    },

    alert: function(varargs) {
        var fill = this.getFill();
        this.setFill(Color.black); // poor man's modal dialog

        var menu = new MenuMorph([["OK", function() { this.world().setFill(fill); this.remove() }]]);
        menu.onMouseUp = function(/*...*/) { 
            if (!this.stayUp) this.world().setFill(fill); // cleanup
	    Class.getPrototype(this).onMouseUp.apply(this, arguments);
        };

	var caption = Strings.formatFromArray($A(arguments));
        menu.openIn(this, this.viewport().center(), true, caption); 
	menu.label.wrapStyle = text.WrapStyle.Normal;
	if (false) {
	    // FIXME: how to center?
	    var txt = new Text(menu.label.textString, menu.label.textStyle);
	    txt.emphasize({align: 'center'}, 0, menu.label.textString.length);
	    menu.label.textStyle = txt.style;
	}
	menu.label.fitText();
        menu.scaleBy(2.5);
    }.logErrors('alert'),

    prompt: function(message, callback, defaultInput) {
	var model = Record.newPlainInstance({Message: message, Input: defaultInput || "", Result: null});
	model.addObserver({ 
	    onResultUpdate: function(value) { 
		if (value == true && callback) callback.call(Global, model.getInput());
	    }});
	var dialog = new PromptDialog(model.newRelay({Message: "-Message", Result: "+Result", Input: "Input"}));
	dialog.openIn(this, this.positionForNewMorph());
    },

    confirm: function(message, callback) {
	var model = Record.newPlainInstance({Message: message, Result: null});
	model.addObserver({ 
	    onResultUpdate: function(value) { 
		if (value && callback) callback.call(Global, value);
	    }});
	var dialog = new ConfirmDialog(model.newRelay({Message: "-Message", Result: "+Result"}));
	dialog.openIn(this, this.positionForNewMorph());
	return dialog;
    },
    
    addFramedMorph: function(morph, title, optLoc, optSuppressControls) {
	var displ = pt(5, 5);
	return this.addMorphAt(new WindowMorph(morph, title, optSuppressControls), 
			       optLoc || this.positionForNewMorph().subPt(displ));
    },

    addTextWindow: function(spec) {
	// FIXME: typecheck the spec 
	if (Object.isString(spec.valueOf())) spec = {content: spec}; // convenience
	var extent = spec.extent || pt(500, 200);
	
	var pane  = 
	    this.internalAddWindow(newTextPane(extent.extentAsRectangle(), spec.content || ""),
				  spec.title, spec.position);
	if (spec.acceptInput !== undefined) pane.innerMorph().acceptInput = spec.acceptInput;
	if (spec.plug) pane.connectModel(spec.plug, true);
	return pane;
    },

    addTextListWindow: function(spec) {
	// FIXME: typecheck the spec 
	if (spec instanceof Array) spec = {content: spec }; // convenience
	var content = spec.content;
	if (!content) content = "";
	if (!(content instanceof Array)) content = [content];
	var extent = spec.extent || pt(500, Math.min(300, content.length * TextMorph.prototype.fontSize * 1.5));
	var rec = extent.extentAsRectangle();
	var pane = this.internalAddWindow(newTextListPane(rec, content), spec.title, spec.position);
	if (spec.plug) pane.connectModel(spec.plug, true);
	return pane;
    },

    internalAddWindow: function(pane, titleSpec, posSpec) {
	var pos = (posSpec instanceof Point) ? posSpec : undefined;
	var win = this.addFramedMorph(pane, String(titleSpec || ""), pos || this.firstHand().position().subPt(pt(5, 5)));
	if (posSpec == "center") {
	    win.align(win.bounds().center(), this.viewport().center());
	}
	return pane;
    },


    addMorphFrontOrBack: function($super, m, front) {
	var oldTop = this.topWindow();
	var result = $super(m, front);
	if (!front || !(m instanceof WindowMorph)) return result;
	// if adding a new window on top, then make it active
        if (oldTop) oldTop.titleBar.highlight(false);
	m.takeHighlight();
  	return result;
    },

    topWindow: function() {
	for (var i= this.submorphs.length - 1; i >= 0; i--) {
	    var sub = this.submorphs[i];
	    if (sub instanceof WindowMorph) return sub;
	}
	return null;
    },

    positionForNewMorph: function(relatedMorph) {
	// this should be much smarter than the following:
	return relatedMorph ?
	    relatedMorph.bounds().topLeft().addPt(pt(5, 0)) :
	    this.firstHand().getPosition();
    },

    reactiveAddMorph: function(morph, relatedMorph) { 	// add morph in response to a user action, make it prominent
	return this.addMorphAt(morph, this.positionForNewMorph(relatedMorph));
    }

});

Object.extend(WorldMorph, {    
    worldCount: 0,
    
    currentWorld: null,
    
    current: function() {
        return WorldMorph.currentWorld;
    }

    
});

}); // using(lively.Text)


/**
 * @class HandMorph
 * Since there may be multiple users manipulating a Morphic world
 * simultaneously, we do not want to use the default system cursor.   
 */ 

Morph.subclass("HandMorph", {
    
    documentation: "Defines a visual representation for the user's cursor.",
    applyDropShadowFilter: !!Config.useDropShadow,
    dropShadowFilter: "url(#DropShadowFilter)",
    

    shadowOffset: pt(5,5),
    handleOnCapture: true,
    logDnD: Config.logDnD,
    grabHaloLabelStyle: {fontSize: Math.floor((Config.defaultFontSize || 12) *0.85), padding: Rectangle.inset(0)},

    initialize: function($super, local) {
        $super(pt(5,5).extent(pt(10,10)), "rect");
	
        this.setShape(new lively.scene.Polygon([pt(0,0), pt(9,5), pt(5,9), pt(0,0)], 
					       (local ? Color.primary.blue : Color.primary.red), 1, Color.black));
	
        this.isLocal = local;

        this.keyboardFocus = null;
        this.mouseFocus = null;
	this.mouseFocusChanges_ = 0; // count mouse focus changes until reset
        this.mouseOverMorph = null;
        this.lastMouseEvent = null;
        this.lastMouseDownPoint = pt(0,0);
        this.hasMovedSignificantly = false;
        this.grabInfo = null;
        
        this.mouseButtonPressed = false;

        this.keyboardFocus = null; 

        this.priorPoint = null;
        this.owner = null;
	this.boundMorph = null; // surrounds bounds
	this.layoutChangedCount = 0; // to prevent recursion on layoutChanged
	
	this.formalModel =  Record.newPlainInstance({GlobalPosition: null});
	
        return this;
    },
    lookNormal: function(morph) {
        this.shape.setVertices([pt(0,0), pt(9,5), pt(5,9), pt(0,0)]);
    },
    lookLinky: function(morph) {
        this.shape.setVertices([pt(0,0), pt(18,10), pt(10,18), pt(0,0)]);
    },
    
    registerForEvents: function(morph) {
        Event.basicInputEvents.forEach(function(name) { 
            morph.rawNode.addEventListener(name, this, this.handleOnCapture);}, this);
    },
    
    unregisterForEvents: function(morph) {
        Event.basicInputEvents.forEach(function(name) { 
            morph.rawNode.removeEventListener(name, this, this.handleOnCapture);}, this);
    },
    
    resetMouseFocusChanges: function() {
	var result = this.mouseFocusChanges_;
	this.mouseFocusChanges_ = 0;
	return result;
    },

    setMouseFocus: function(morphOrNull) {
        // console.log('setMouseFocus: ' + morphOrNull);
        this.mouseFocus = morphOrNull;
	this.setFill(this.mouseFocus ? Color.primary.blue.lighter(2) : Color.primary.blue);
	this.mouseFocusChanges_ ++;
    },
    
    setKeyboardFocus: function(morphOrNull) {
        if (this.keyboardFocus === morphOrNull) return;

        if (this.keyboardFocus != null) {
            // console.log('blur %s', this.keyboardFocus);
            this.keyboardFocus.onBlur(this);
            this.keyboardFocus.setHasKeyboardFocus(false);
        }
        
        this.keyboardFocus = morphOrNull; 
        
        if (this.keyboardFocus) {
            this.keyboardFocus.onFocus(this);
        }
    },
    
    world: function() {
        return this.owner;
    },

    // this is the DOM Event callback
    handleEvent: function HandMorph$handleEvent(rawEvt) {
        var evt = new Event(rawEvt);
        evt.hand = this;

        lively.lang.Execution.resetDebuggingStack();
        switch (evt.type) {
        case "MouseWheel":
        case "MouseMove":
        case "MouseDown":
        case "MouseUp":
            this.handleMouseEvent(evt);
            break;
        case "KeyDown":
        case "KeyPress": 
        case "KeyUp":
            this.handleKeyboardEvent(evt);
            break;
        default:
            console.log("unknown event type " + evt.type);
        }
        evt.stopPropagation();
    }.logErrors('Event Handler'),

    armProfileFor: function(evtType) { 
	this.profileArmed = evtType;  // either "MouseDown" or "MouseUp"
    },

    makeAMove: function() {
	// Process a null mouseMove event -- no change in x, y
	// Allows simulations to respond where, eg, a morph moves under the mouse
	// Note: Fabrik generates also Mouse events with newFakeMouseEvent; to be merged
	var last = this.lastMouseEvent;
	if (!last) return;
	var nullMove = new Event(last.rawEvent);
	nullMove.type = "MouseMove";
	nullMove.hand = this;
	// console.log("last = " + Object.inspect(this.lastMouseEvent));
	// console.log("null = " + Object.inspect(nullMove));
	this.reallyHandleMouseEvent(nullMove);
	this.lastMouseEvent = last;  // Restore -- necess??
    },

    handleMouseEvent: function HandMorph$handleMouseEvent(evt) { 
	if(!Config.debugExtras || !this.profileArmed || this.profileArmed != evt.type) {
		// Profile not armed or event doesnt match
		return this.reallyHandleMouseEvent(evt);
	}
	// Run profile during handling of this event
	this.profileArmed = null;  // Only this once
	var result;
	lively.lang.Execution.trace(function() { result = this.reallyHandleMouseEvent(evt) }.bind(this));
	return result;
    },

    reallyHandleMouseEvent: function HandMorph$reallyHandleMouseEvent(evt) { 
	
        evt.setButtonPressedAndPriorPoint(this.mouseButtonPressed, 
					  this.lastMouseEvent ? this.lastMouseEvent.mousePoint : null);
	var world = this.owner;
        //-------------
        // mouse move
        //-------------
        if (evt.type == "MouseMove" || evt.type == "MouseWheel") { // it is just a move
            this.setPosition(evt.mousePoint);
            
            if(evt.isShiftDown())
                this.alignToGrid(this.topSubmorph());
            
	    this.updateGrabHalo();
            
            if (evt.mousePoint.dist(this.lastMouseDownPoint) > 10) { 
                this.hasMovedSignificantly = true;
            }
            
            if (this.mouseFocus) { // if mouseFocus is set, events go to that morph
                this.mouseFocus.captureMouseEvent(evt, true);
            } else if (world) {
                var receiver = world.morphToReceiveEvent(evt);
                if (this.checkMouseOverAndOut(receiver, evt)) {  // mouseOverMorph has changed...
                    if (!receiver || !receiver.canvas()) return false;  // prevent errors after world-switch
                    // Note if onMouseOver sets focus, it will get onMouseMove
                    if (this.mouseFocus) this.mouseFocus.captureMouseEvent(evt, true);
                    else if (!evt.hand.hasSubmorphs()) world.captureMouseEvent(evt, false); 
                } else if (receiver) receiver.captureMouseEvent(evt, false);
            }
            this.lastMouseEvent = evt;
            return true;
        } 

	
        //-------------------
        // mouse up or down
        //-------------------
        if (!evt.mousePoint.eqPt(this.position())) { // Only happens in some OSes
            // and when window wake-up click hits a morph
            this.moveBy(evt.mousePoint.subPt(this.position())); 
        }

        this.mouseButtonPressed = (evt.type == "MouseDown"); 
        this.setBorderWidth(this.mouseButtonPressed ? 3 : 1);
        evt.setButtonPressedAndPriorPoint(this.mouseButtonPressed, this.lastMouseEvent ? this.lastMouseEvent.mousePoint : null);
	
        if (this.mouseFocus != null) {
            if (this.mouseButtonPressed) {
                this.mouseFocus.captureMouseEvent(evt, true);
                this.lastMouseDownPoint = evt.mousePoint; 
            } else 
		this.mouseFocus.captureMouseEvent(evt, true); 
        } else {
	    if (this.hasSubmorphs() && (evt.type == "MouseDown" || this.hasMovedSignificantly)) {
                // If laden, then drop on mouse up or down
                var m = this.topSubmorph();
                var receiver = world.morphToGrabOrReceiveDroppingMorph(evt, m);
                // For now, failed drops go to world; later maybe put them back?
                this.dropMorphsOn(receiver || world);
            } else {
                // console.log("hand dispatching event %s to owner %s", evt, this.owner);
                // This will tell the world to send the event to the right morph
                // We do not dispatch mouseup the same way -- only if focus gets set on mousedown
                if (evt.type == "MouseDown") world.captureMouseEvent(evt, false);
            }
            if (evt.type == "MouseDown") {
                this.lastMouseDownPoint = evt.mousePoint;
                this.hasMovedSignificantly = false; 
            }
        }
        this.lastMouseEvent = evt; 
	return true;
    },
    
    checkMouseOverAndOut: function(newMouseOverMorph, evt) {
	if (newMouseOverMorph === this.mouseOverMorph) return false;

	// if over a new morph, send onMouseOut, onMouseOver
	if (this.mouseOverMorph) this.mouseOverMorph.onMouseOut(evt);
	this.mouseOverMorph = newMouseOverMorph;
	// console.log('msOverMorph set to: ' + Object.inspect(this.mouseOverMorph));
	if (this.mouseOverMorph) this.mouseOverMorph.onMouseOver(evt);
	return true;
    },

    layoutChanged: function($super) {
	this.layoutChangedCount ++;
	try {
	    $super();
	    if (this.layoutChangedCount == 1) {
		this.grabHaloMorph && this.updateGrabHalo();
	    }
	} finally {
	    this.layoutChangedCount --;
	}
    },


    showAsGrabbed: function(grabbedMorph) {
        if (this.applyDropShadowFilter) grabbedMorph.applyFilter(this.dropShadowFilter); 

	if (Config.showGrabHalo) {
	    var bounds = grabbedMorph.bounds(true);
	    this.grabHaloMorph = this.addMorphBack(new Morph(bounds, "rect").applyStyle({fill: null, borderWidth: 0.5 }));
	    this.grabHaloMorph.shape.setStrokeDashArray(String([3,2]));
	    this.grabHaloMorph.setLineJoin(lively.scene.LineJoins.Round);
	    this.grabHaloMorph.ignoreEvents();

	    var idLabel = new TextMorph(pt(20,10).extentAsRectangle(), String(grabbedMorph.id())).beLabel();
	    idLabel.applyStyle(this.grabHaloLabelStyle);
	    this.grabHaloMorph.addMorph(idLabel);
	    idLabel.align(idLabel.bounds().bottomLeft(), this.grabHaloMorph.innerBounds().topRight());
	    
	    var pos = grabbedMorph.getPosition();
	    var posLabel = new TextMorph(pt(20, 10).extentAsRectangle(), "").beLabel();
	    posLabel.applyStyle(this.grabHaloLabelStyle);
	    this.grabHaloMorph.positionLabel = this.grabHaloMorph.addMorph(posLabel);
	    
	    this.updateGrabHalo();
	}
    },

    showAsUngrabbed: function(grabbedMorph) {
	if (this.applyDropShadowFilter) grabbedMorph.applyFilter(null);
	if (this.grabHaloMorph) {
	    this.grabHaloMorph.remove();
	    this.grabHaloMorph = null;
	}
    },

    alignToGrid: function(draggedMorph) {
        if(!this.grabHaloMorph) return;
        var grid = function(a) {
                return a - (a % (Config.alignToGridSpace || 5))};
        if (!this.grabHaloMorph.orgSubmorphPosition)
            this.grabHaloMorph.orgSubmorphPosition = draggedMorph.getPosition();
        var oldPos = this.worldPoint(this.grabHaloMorph.orgSubmorphPosition);
        var gridPos = pt(grid(oldPos.x), grid(oldPos.y));
        draggedMorph.setPosition(this.localize(gridPos));
    },

    updateGrabHalo: function Morph$updateGrabHalo() {
	if (this.grabHaloMorph) {
	    this.grabHaloMorph.setBounds( this.topSubmorph().bounds(true).expandBy(3));
	    if (this.grabHaloMorph.positionLabel) {
		var pos = this.worldPoint(this.topSubmorph().getPosition());
		var posLabel  = this.grabHaloMorph.positionLabel;
		posLabel.setTextString(pos.x.toFixed(1) + "," + pos.y.toFixed(1));
		posLabel.align(posLabel.bounds().bottomCenter(), this.grabHaloMorph.innerBounds().topLeft());
	    }
	}
    },

    
    grabMorph: function(grabbedMorph, evt) { 
        if (evt.isShiftDown() || (grabbedMorph.owner && grabbedMorph.owner.copySubmorphsOnGrab == true)) {
            if (!grabbedMorph.okToDuplicate()) return;
            grabbedMorph.copyToHand(this);
            return;
        }
        if (evt.isCommandKey()) {
            grabbedMorph.showMorphMenu(evt);
            return;
        }
        // Give grabbed morph a chance to, eg, spawn a copy or other referent
        grabbedMorph = grabbedMorph.okToBeGrabbedBy(evt);
        if (!grabbedMorph) return;

        if (grabbedMorph.owner && !grabbedMorph.owner.openForDragAndDrop) return;

        if (this.keyboardFocus && grabbedMorph !== this.keyboardFocus) {
            this.keyboardFocus.relinquishKeyboardFocus(this);
        }
        // console.log('grabbing %s', grabbedMorph);
        // Save info for cancelling grab or drop [also need indexInOwner?]
        // But for now we simply drop on world, so this isn't needed
        this.grabInfo = [grabbedMorph.owner, grabbedMorph.position()];
        if (this.logDnD) console.log('%s grabbing %s', this, grabbedMorph);
        this.addMorph(grabbedMorph);
	this.showAsGrabbed(grabbedMorph);
        // grabbedMorph.updateOwner(); 
        this.changed(); //for drop shadow
    },
    
    dropMorphsOn: function(receiver) {
        if (receiver !== this.world()) this.unbundleCarriedSelection();
	if (this.logDnD) console.log("%s dropping %s on %s", this, this.topSubmorph(), receiver);
        while (this.hasSubmorphs()) { // drop in same z-order as in hand
            var m = this.submorphs.first();
            m.dropMeOnMorph(receiver);
	    this.showAsUngrabbed(m);
        }
    },

    unbundleCarriedSelection: function() {
        // Unpack the selected morphs from a selection prior to drop or jump to other world
        if (!this.hasSubmorphs() || !(this.topSubmorph() instanceof SelectionMorph)) return;
        var selection = this.topSubmorph();
        for (var i=0; i<selection.selectedMorphs.length; i++) {
            this.addMorph(selection.selectedMorphs[i])
        }
        selection.removeOnlyIt();
    },

    moveSubmorphs: function(evt) {
        var world = this.world();
	
        // Display height is returned incorrectly by many web browsers.
        // We use an absolute Y-value instead. 
        var towardsPoint = pt(world.bounds().center().x, 350);

        switch (evt.getKeyCode()) {
        case Event.KEY_LEFT:
            this.submorphs.invoke('moveBy', pt(-10,0));
            evt.stop();
            return true;
        case Event.KEY_RIGHT:
            // forget the existing selection
            this.submorphs.invoke('moveBy', pt(10, 0));
            evt.stop();
            return true;
        case Event.KEY_UP:
            this.submorphs.invoke('moveBy', pt(0, -10));
            evt.stop();
            return true;
        case Event.KEY_DOWN:
            this.submorphs.invoke('moveBy', pt(0, 10));
            evt.stop();
            return true;

            // Experimental radial scrolling feature
            // Read the comments near method Morph.moveRadially()
        case Event.KEY_PAGEUP:
        case 65: // The "A" key
	    world.submorphs.invoke('moveRadially', towardsPoint, 10);
            this.moveRadially(towardsPoint, 10);            
            evt.stop();
            return true;
        case Event.KEY_PAGEDOWN:
        case 90: // The "Z" key
	    world.submorphs.invoke('moveRadially', towardsPoint, -10);
            this.moveRadially(towardsPoint, -10);            
            evt.stop();
            return true;
        }
        
        return false;
    },

    transformSubmorphs: function(evt) {
	var fun = null;
        switch (evt.getKeyChar()) {
        case '>':
	    fun = function(m) { m.setScale(m.getScale()*1.1) };
	    break;
        case '<':
	    fun = function(m) { m.setScale(m.getScale()/1.1) };
	    break;
        case ']':
	    fun = function(m) { m.setRotation(m.getRotation() + 2*Math.PI/16) };
	    break;
        case '[':
            fun = function(m) { m.setRotation(m.getRotation() - 2*Math.PI/16) };
	    break;
        }
	if (fun) {
	    this.submorphs.forEach(fun);
	    evt.stop();
	    return true;
	} else return false;
    },

    handleKeyboardEvent: function(evt) { 
        if (this.hasSubmorphs())  {
            if (evt.type == "KeyDown" && this.moveSubmorphs(evt)) return;
            else if (evt.type == "KeyPress" && this.transformSubmorphs(evt)) return;
        }

        // manual bubbling up b/c the event won't bubble by itself    
        for (var responder = this.keyboardFocus; responder != null; responder = responder.owner) {
            if (responder.takesKeyboardFocus()) {
                var handler = responder[evt.handlerName()];
                if (handler) {
                    if (handler.call(responder, evt)) 
                        break; // event consumed?
                }
            }
        } 
	this.blockBrowserKeyBindings(evt);
    },

    blockBrowserKeyBindings: function(evt) {
	switch (evt.getKeyCode()) {
	case Event.KEY_SPACEBAR: // [don't] scroll
	    // stop keypress but don't try to stop preceeding keydown,
	    // which would prevent keypress from firing and being handled by Text etc
	    if (evt.type == "KeyPress") evt.stop();
	    break;
	    case Event.KEY_BACKSPACE: // [don't] go to the previous page 
	    evt.stop();
	    break;
	}
	switch (evt.getKeyChar()) {
	case "[":
	case "]":
	    if (evt.isMetaDown() && evt.type == "KeyPress") {
		// Safari would want to navigate the history
		evt.preventDefault();
		break;
	    }
	}
	
    },

    bounds: function($super) {
        // account for the extra extent of the drop shadow
        // FIXME drop shadow ...
        if (this.shadowMorph)
            return $super().expandBy(this.shadowOffset.x);
        else return $super();
    },

    insertMorph: function(m, isFront) {
	// overrides Morph.prototype.insertMorph
	var insertionPt = this.submorphs.length == 0 ? this.shape.rawNode :
	    isFront ? this.submorphs.last().rawNode : this.submorphs.first().rawNode;
        // the last one, so drawn last, so front
	
	this.rawNode.insertBefore(m.rawNode, insertionPt);

	if (isFront)
            this.submorphs.push(m);
	else
            this.submorphs.unshift(m);
	m.owner = this;
	return m;
    },
    
    toString: function($super) { 
        var superString = $super();
        var extraString = Strings.format(", local=%s,id=%s", this.isLocal, this.id());
        if (!this.hasSubmorphs()) return superString + ", an empty hand" + extraString;
        return Strings.format("%s, a hand carrying %s%s", superString, this.topSubmorph(), extraString);
    }
    
});


Morph.subclass('LinkMorph', {

    documentation: "two-way hyperlink between two Lively worlds",
    helpText: "Click here to enter or leave a subworld.\n" +
        "Use menu 'grab' to move me.  Drag objects\n" +
        "onto me to transport objects between worlds.",
    openForDragAndDrop: false,
    suppressHandles: true,
    style: {borderColor: Color.black, fill: new lively.paint.RadialGradient([Color.blue.lighter(), 1, Color.blue, 1, Color.blue.darker()], pt(0.4, 0.2))},
    
    initialize: function($super, otherWorld, initialPosition) {
        // In a scripter, type: world.addMorph(new LinkMorph(null))
        var bounds = initialPosition;

        // Note: Initial position can be specified either as a rectangle or point.
        // If no position is specified, place the icon in the lower left corner
        // of the screen.
        if (!bounds) {
            bounds = WorldMorph.current().bounds().bottomLeft().addXY(50, -50).asRectangle().expandBy(25);
        } else if (bounds instanceof Point) {
            bounds = bounds.asRectangle().expandBy(25);
        }
	
        $super(bounds, "ellipse");
	
        // Make me look a bit like a world
        this.applyStyle(this.style);
        [new Rectangle(0.15,0,0.7,1), new Rectangle(0.35,0,0.3,1), new Rectangle(0,0.3,1,0.4)].forEach(function(each) {
            // Make longitude / latitude lines
            var lineMorph = new Morph(bounds.scaleByRect(each), "ellipse");
	    lineMorph.applyStyle({fill: null, borderWidth: 1, borderColor: Color.black}).ignoreEvents();
            lineMorph.align(lineMorph.bounds().center(),this.shape.bounds().center());
            this.addMorph(lineMorph);
        }, this);

        if (!otherWorld) {
            this.myWorld = this.makeNewWorld(this.canvas());
	    this.addPathBack();
	} else 
            this.myWorld = otherWorld;

        return this;
    },
    
    makeNewWorld: function(canvas) {
	return new WorldMorph(canvas);
    },
    
    addPathBack: function() {
	var pathBack = new LinkMorph(WorldMorph.current(), this.bounds().center());
        pathBack.setFill(new lively.paint.RadialGradient([Color.orange, 1, Color.red, 1, Color.red.darker(2)], 
							 pt(0.4, 0.2)));
        this.myWorld.addMorph(pathBack);
	return pathBack;
    },
    
    onDeserialize: function() {
        //if (!this.myWorld) 
	this.myWorld = WorldMorph.current(); // a link to the current world: a reasonable default?
    },

    handlesMouseDown: function(evt) {
        return true; 
    },
    onMouseDown: function(evt) {
        this.enterMyWorld(evt); 
        return true; 
    },

    morphMenu: function($super, evt) { 
        var menu = $super(evt);
        menu.addItem(["publish linked world as ... ", function() { 
	    this.world().prompt("world file (.xhtml)", this.exportLinkedFile.bind(this)); }]);
	menu.replaceItemNamed("package", ["package linked world", function(evt) {
	    new PackageMorph(this.myWorld).openIn(this.world(), this.bounds().topLeft()); this.remove()} ]);
        return menu;
    },

    enterMyWorld: function(evt) { // needs vars for oldWorld, newWorld
        carriedMorphs = [];
        // Save, and suspend stepping of, any carried morphs
        evt.hand.unbundleCarriedSelection();
        while (evt.hand.hasSubmorphs()) {
            var m = evt.hand.topSubmorph();
            m.suspendAllActiveScripts();
            carriedMorphs.splice(0, 0, m);
	    evt.hand.showAsUngrabbed(m);
            m.remove();
        }
        this.hideHelp();
        this.myWorld.changed();
        var oldWorld = WorldMorph.current();
        oldWorld.onExit();    
        // remove old hands
        oldWorld.hands.clone().forEach(function(hand) { 
            oldWorld.removeHand(hand);
        });
        
        if (Config.suspendScriptsOnWorldExit) {
            oldWorld.suspendAllActiveScripts();
        }

        var canvas = oldWorld.canvas();
        oldWorld.remove(); // some SVG calls may stop working after this point in the old world.
        
        console.log('left world %s through %s', oldWorld, this);
	
        // display world first, then add hand, order is important!
        var newWorld = this.myWorld;
        if (newWorld.owner) {
            console.log("new world had an owner, removing");
            newWorld.remove();
        }

        newWorld.displayOnCanvas(canvas); 
	
        if (Config.suspendScriptsOnWorldExit) { 
            newWorld.resumeAllSuspendedScripts();
        }

        carriedMorphs.forEach(function(m) {
	    var hand = newWorld.firstHand();
	    hand.addMorph(m);
	    hand.showAsGrabbed(m);
            m.resumeAllSuspendedScripts();
        });

        if (Config.showThumbnail) {
            var scale = 0.1;
            if (newWorld.thumbnail) {
                console.log("disposing of a thumbnail");
                newWorld.thumbnail.remove();
            }
            newWorld.thumbnail = new Morph(Rectangle.fromElement(canvas), "rect");
            newWorld.thumbnail.setPosition(this.bounds().bottomRight());
            newWorld.addMorph(newWorld.thumbnail);
            newWorld.thumbnail.setScale(scale);
            newWorld.thumbnail.addMorph(oldWorld);
        }

        if (carriedMorphs.length > 0) newWorld.firstHand().emergingFromWormHole = true; // prevent re-entering
    },
    
    onMouseOver: function($super, evt) {
        if (evt.hand.hasSubmorphs()) { // if hand is laden enter world bearing gifts
            if (!evt.hand.emergingFromWormHole) this.enterMyWorld(evt);
        } else {
	    $super(evt);
	}
    },
    
    onMouseOut: function($super, evt) {
        evt.hand.emergingFromWormHole = false;
	$super(evt);
    },

    getHelpText: function() {
	return this.helpText;
    }
    
});

LinkMorph.subclass('ExternalLinkMorph', {

    documentation: "A link to a different web page, presumably containing another LK",

    style: {borderColor: Color.black, fill: new lively.paint.RadialGradient([Color.green, 1, Color.yellow])},
    
    initialize: function($super, url, position) {
	$super(null, position || pt(0, 0));
	this.url = url;
	this.win = null; // browser window
    },

    makeNewWorld: Functions.Null, 
    
    addPathBack: Functions.Null,

    enterMyWorld: function(evt) {
	if (evt.isCommandKey()) {
	    this.world().confirm("Leave current runtime to enter another page?", function (answer) {
		if (answer) Global.location = this.url.toString();
		else console.log("cancelled loading " + this.url);
	    });
	} else {
	    if (this.win && !this.win.closed) this.win.focus();
	    else this.win = Global.window.open(this.url);
	}
    },
    
    getHelpText: function() {
	return "Click to enter " + this.url;
    },


    morphMenu: function($super, evt) { 
	var menu = $super(evt);
	menu.addItem(["set link target...", function() {
	    this.world().prompt("Set new target file", function(answer) {
		this.url = URL.source.withFilename(answer);
	    }.bind(this), URL.source.toString());
	}]);
	return menu;
    }
    
});



// Some SVG/DOM bindings 



// adds convenience functions
function interactiveEval(text) { 
    /*
    function $h() {  
	// history
	for (var i = self.commandBuffer.length - 1; i > 0; i--) {
	    self.log(i + ") " + self.commandBuffer[i]);
	}
    }
    function $c() {
	self.setModelValue("setRecentMessages", []);
    }

*/
    function $w() { 
	// current world
	return WorldMorph.current(); 
    }
    function $m(morph) {
	// morphs
	return [].concat((morph || WorldMorph.current()).submorphs);
    }
    function $i(id) { // maybe just '$'
	return document.getElementById(id.toString());
    }
    function $x(node) {
	return Exporter.stringify(node);
    }
    function $f(id) {
	// format node by id
	return $x($i(id));
    }
    function $p(obj) {
	return Properties.all(obj);
    }
    function $x(node, expr) {
	return new Query(expr).findAll(node.rawNode || node);
    }
    return eval(text);
};

// for Fabrik
Morph.addMethods({
    isContainedIn: function(morph) {
        if (!this.owner)
            return false;
        if (this.owner === morph)
            return true;
        else
            return this.owner.isContainedIn(morph)
    },
});




// for Fabrik
HandMorph.addMethods({
    changed: function($super, morph) {
        $super();
        if (this.formalModel)
            this.formalModel.setGlobalPosition(this.getPosition());
        this.submorphs.forEach(function(ea){
            // console.log("changed "+ ea);
            ea.changed("globalPosition", this.getPosition());
        }, this);
    }
});

ClipboardHack = {
    ensurePasteBuffer: function() {
       var buffer = document.getElementById("copypastebuffer");
       if (!buffer) {
           buffer = document.createElement("textarea");
           buffer.setAttribute("cols","1");
           buffer.setAttribute("rows","1");
           buffer.setAttribute("id","copypastebuffer");
           buffer.setAttribute("style","position:absolute;left:0px; top:1px; width:1px; height:1px;");
           buffer.textContent = "NoText";
           document.body.appendChild(buffer);
           buffer = document.getElementById("copypastebuffer");
       };
       return buffer
   }
}

console.log('loaded Core.js');

