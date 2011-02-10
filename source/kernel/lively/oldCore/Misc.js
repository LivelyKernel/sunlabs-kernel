module('lively.oldCore.Misc').requires().toRun(function() {

// ===========================================================================
// Error/warning console (browser dependent)
// ===========================================================================

// console handling
Object.extend(Global, {

	alert: function(msg) {
		var world = Global.WorldMorph && WorldMorph.current()
		if (world) world.alert(String(msg));
		else console.log('ALERT: ' + msg);
	},

	alertOK: function(msg) {
		var world = Global.WorldMorph && WorldMorph.current()
		if (world) world.setStatusMessage(String(msg), Color.green, 5);
		else console.log(msg);
	},

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


(function configFromURL() { // override config options with options from the query part of the URL

    // may have security implications ...
    var query = Global.document.URL.split('?')[1];
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

Object.extend(Global, {
	equals: function(leftObj, rightObj) {
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
	},	
});


Object.subclass('Exporter', {
    documentation: "Implementation class for morph serialization",

    rootMorph: null,

	initialize: function(rootMorph) {
		this.rootMorph = rootMorph;
		(rootMorph instanceof Morph) || console.log("weird, root morph is " + rootMorph);
	},

	extendForSerialization: function(optSystemDictionary) {
		console.log("extendForSerialization " + optSystemDictionary)
		
		// decorate with all the extra needed to serialize correctly. Return the additional nodes, to be removed 
		var helperNodes = [];

		var exporter = this;

		this.rootMorph.withAllSubmorphsDo(function() { 
			exporter.verbose && console.log("serializing " + this);
			this.prepareForSerialization(helperNodes, optSystemDictionary);			
			if (this.owner) { // just add a new line for better readability
				var nl = NodeFactory.createNL();
				this.rawNode.parentNode.insertBefore(nl, this.rawNode);
				helperNodes.push(nl);
			}
		});
		return helperNodes;
	},

	removeHelperNodes: function(helperNodes) {
		for (var i = 0; i < helperNodes.length; i++) {
			var n = helperNodes[i];
			n.parentNode.removeChild(n);
		}
	},
	
	serialize: function(destDocument, optSystemDictionary) {
		// model is inserted as part of the root morph.
		var helpers = this.extendForSerialization(optSystemDictionary);
		var result = destDocument.importNode(this.rootMorph.rawNode, true);
		this.removeHelperNodes(helpers);
		return result;
		
	},
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
		if (!newDoc) 
			throw new Error('Can not continue serializing World beacause the base document is broken')
		newDoc.getElementsByTagName("title")[0].textContent = document.title; // persist the title
		// FIXME this should go to another place?
		// FIXME addSystemDictionary is deprecated
		lively.data.Wrapper.collectSystemDictionaryGarbage(morph);
		var systemDictionary = this.addSystemDictionary(newDoc, morph);
		importer.canvas(newDoc).appendChild(new Exporter(morph).serialize(newDoc, systemDictionary));
		var fieldNodes = $A(newDoc.getElementsByTagName('field'));
		this.stripEpimorphs(fieldNodes);
		this.stripIgnoredMorphs(fieldNodes);
		return newDoc;
	},
	
	stripEpimorphs: function(fieldNodes) {
		var fields = fieldNodes.select(function(ea) {
			return ea.getAttribute("name") == 'isEpimorph'})
		this.stripMorphsOfFields(fields);
	},
	
	stripIgnoredMorphs: function(fieldNodes) {
		var fields = fieldNodes.select(function(ea) {
			return ea.getAttribute("name") == 'ignoreWhenCopying'})
		this.stripMorphsOfFields(fields); 
	},
	
	stripMorphsOfFields: function(fields) {
		$A(fields).each(function(fieldNode){
			var morphNode = fieldNode.parentNode;
			console.log("strip morph: " + morphNode)
			morphNode.parentNode.removeChild(morphNode)
		})
	},
	
	addSystemDictionary: function(doc, morph) {
		var dict = morph.dictionary();
		if (!dict) return;
		var preExisting = doc.getElementById(dict.id);
		if (preExisting) preExisting.parentNode.removeChild(preExisting);
		var newDict = dict.cloneNode(true);
		doc.getElementsByTagName('svg')[0].appendChild(doc.importNode(newDict, true));
		return newDict
	},

	saveDocumentToFile: function(doc, urlOrFilename, callback, checkForOverwrites) {
		console.group("save document");
		if (!urlOrFilename) return null;

		// create and setup WebResource for saving
		var url = this.fixWorldURL(urlOrFilename),
			r = new WebResource(url);
		r.createProgressBar("saving " + urlOrFilename);
		connect(r, 'status', this, 'showSaveStatus');
		connect(r, 'status', {callback: callback}, 'callback');

		// document revision checking and updating
		var docRev, wikiNav = Global.WikiNavigator && WikiNavigator.current;
		if (checkForOverwrites && wikiNav)	{
			docRev = wikiNav.currentDocumentRevision();
			function saveAgain(status) {
				if (status.isDone() && status.code() === 412)
					Exporter.askToOverwrite(doc, urlOrFilename, callback);
			}
			connect(r, 'status', {saveAgain: saveAgain}, 'saveAgain');
		}
		if (wikiNav)
			connect(r, 'status', wikiNav, 'updateDocumentRevision',
				{updater: function($upd, status) { if (status.isDone() && status.isSuccess()) $upd() }});

		// do save
		r.beAsync().put(doc, undefined, docRev);
		return url;
	},
	askToOverwrite: function(doc, urlOrFilename, callback) {
		WorldMorph.current().confirm('A newer version of ' + urlOrFilename +  ' exist! Overwrite?',
			function(answer) {
				if (answer) this.saveDocumentToFile(doc, urlOrFilename, callback);
			}.bind(this));
	},

	fixWorldURL: function(urlOrFilename) {
		var string = urlOrFilename.toString();
		if (!string.endsWith('.xhtml')) string += ".xhtml";
		var url = string.startsWith('http') ? new URL(string) : URL.source.withFilename(string);
		url = url.withoutQuery()
		return url;
	},


	showSaveStatus: function(status) {
		if (!status.isDone()) return; // Might be called when request state changes
		console.groupEnd("save document");
		if (status.isSuccess()) {
			console.log("success publishing world at " + status.url + ", status " + status.code());
			return;
		}
		WorldMorph.current().alert("failure publishing world at " + status.url + ", status " + status.code());		
	},
	
	saveNodeToFile: function(node, filename) {
		return this.saveDocumentToFile(this.shrinkWrapNode(node), filename);
	}

});

Object.subclass('Copier', {
	documentation: "context for performing deep copy of objects",

	isCopier: true,
	
	wrapperMap: null,

	toString: function() { 
		return "#<Copier>"; 
	},

	initialize: function() {
		this.wrapperMap = {};
		this.patchSites = [];
	},

	addMapping: function(oldId, newMorph) {
		dbgOn(!this.wrapperMap);
		this.wrapperMap[oldId] = newMorph; 
	},

	lookup: function(oldId) {
		return this.wrapperMap[oldId];
	},
	
	lookUpOrCopy: function(original) {
		if (!original) 
			return null;
		var replacement = this.lookup(original.id());
		if (!replacement) {
			// console.log("lookUpOrCopy: no replacement found for " + original.id());
		   	var replacement = original.copy(this);
			this.addMapping(original.id(), replacement);
		};
		return replacement
	},

	lookUpOrTakeOriginal: function(original) {
		if (!original) 
			return null;
		var replacement = this.lookup(original.id());
		if (!replacement) {
			return original
		};
		return replacement
	},

	shallowCopyProperties: function(wrapper, other) {	
		for (var p in other) {
		    this.shallowCopyProperty(p, wrapper, other)
		} 
	},	

	copyProperties: function(wrapper, other) {	
		for (var p in other) {
		    this.copyProperty(p, wrapper, other)
		} 
	},

	copyNewProperties: function(wrapper, other) {	
		for (var p in other) {
		    if (wrapper[p])
				continue;
			this.copyProperty(p, wrapper, other)
		} 
	},

	shallowCopyProperty: function(property, wrapper, other) {
		// console.log("smartCopyProperty " + property + " " + wrapper + " from: " + other)
		if (!other.hasOwnProperty(property))
			return;
	    if (!(other[property] instanceof Function) 
			&& other.hasOwnProperty(property) 
			&& other.noShallowCopyProperties
			&& !other.noShallowCopyProperties.include(property)) {
			if (other[property] instanceof lively.data.Wrapper) {
			    var replacement = this.lookup(other[property].id());
			    wrapper[property] = replacement || other[property];
			} else  {			
				wrapper[property] = other[property];
			}
	    }
	},
	
	smartCopyProperty: function(property, wrapper, other) {
		// console.log("smartCopyProperty " + property + " " + wrapper + " from: " + other)
		var original = other[property];
		if (original) {
			if (Object.isArray(original)) {
				wrapper[property] = original.collect(function each(ea) { 
					return this.lookUpOrCopy(ea)}, this);
			} else {			
				wrapper[property] = this.lookUpOrCopy(original)
			};
		};
	},
	
	copyOrPatchProperty: function (property, object, other) {
		var original = other[property]
		if (original && original.id && (original.id instanceof Function)) {
			this.addPatchSite(object, property, original.id());
			object[property] = this.lookUpOrTakeOriginal(original)
		} else {
			// shallow copy
			object[property] = original
		}		
	},
	
	copyProperty: function (property, object, other) {
		// console.log("smartCopyProperty " + property + " " + object + " from: " + other)

	    if (other[property] instanceof Function && other[property].hasLivelyClosure) {
			object[property] = other[property]; // share script
			return
		};

	    if ((other[property] instanceof Function) || !other.hasOwnProperty(property)) return;

		var ignored = false, doNotCopyObj = other;
		while(!ignored && doNotCopyObj) {
			ignored = doNotCopyObj.doNotCopyProperties && doNotCopyObj.doNotCopyProperties.include(property);
			doNotCopyObj = doNotCopyObj.constructor.superclass && doNotCopyObj.constructor.superclass.prototype;
		}
		if (ignored) return;

		var original = other[property];
		if (original !== undefined) {
			if (original && Object.isArray(original)) {
				var a = original.clone();
				for (var i=0; i<a.length; i++) {
					// var ea = a[i];
					// if (ea.id && (ea.id instanceof Function)) {
					//	a[i] = this.lookUpOrTakeOriginal(ea)
					// }
					this.copyOrPatchProperty(i, a, original)
				};
				object[property] = a;
			} else {			
				this.copyOrPatchProperty(property, object, other)
			};
		};
	},

	
	addPatchSite: function(wrapper, name, ref, optIndex) {
		this.patchSites.push([wrapper, name, ref, optIndex]);
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
				if (!wrapper[name]) {
					wrapper[name] = [];
				} else if (!(wrapper[name] instanceof Array)) { 
					throw new Error('whoops, serialization problem?');
				}
				found = (wrapper[name])[index] = this.lookup(ref);
		    } else {
				found = this.lookup(ref);
				if (found)
					wrapper[name] = found; // don't override the original if we could not patch it
		    }
			if (!found && name === 'clip') {
				// last hope, not clean
				var clipRawNode = Global.document.getElementById(ref);
				if (!clipRawNode) return;
				// ok, there must be a better way to deal with it...
				found = wrapper[name] = new lively.scene.Clip(wrapper.shape);
				if (found) console.warn('Found reference somehow but not in the way it was intended to be found!!!')
			}
		    if (!found) {
				// If we could not found it, we assume that it was reference to an object not copied
				// console.warn("no value found for field %s ref %s in wrapper %s", name, ref, wrapper);
				if (wrapper.fixInstanceAfterCopyingFromSite) {
					wrapper.fixInstanceAfterCopyingFromSite(site[1], site[2], site[3])
				}
		    } else {
				//console.log("found " + name + "=" + found + " and assigned to " + wrapper);
		    }
		};
    },
	
	finish: function() {
		this.patchReferences();
	},

}); 

Object.extend(Copier, {
	// 'dummy' copier for simple objects
	marker: Object.extend(new Copier(), {
    	addMapping: Functions.Empty,
    	lookup: Functions.Null
	}),
});


Copier.subclass('Importer', {
    documentation: "Implementation class for morph de-serialization",

	isImporter: true,
	
    verbose: !!Config.verboseImport,
    
	toString: function() { return "#<Importer>" },

	initialize: function($super) {
		$super();
		this.scripts = [];
		this.models = [];
		this.patchSites = [];
	},

	canvas: function(doc) { return locateCanvas(doc) },

	getBaseDocument: function() {
		if (Config.standAlone) {
			var doc = new DOMParser().parseFromString(Exporter.stringify(document), "text/xml");
				svgNode = doc.getElementsByTagName('svg')[0];
			if (svgNode)
				$A(svgNode.childNodes).forEach(function(node) { svgNode.removeChild(node) });
			return doc
		}

		// FIXME memoize
		var webRes = new WebResource(URL.source).get(), status = webRes.status;
		if (!status.isSuccess()) {
			console.log("failure retrieving  " + URL.source + ", status " + status);
			return null;
		}
		var doc = webRes.contentDocument;
		console.log("problems to parse  " + URL.source);
		if (!doc)
			return null;
		// FIX for IE9+
		if (doc.documentElement == null) {
		 	doc = new ActiveXObject('MSXML2.DOMDocument.6.0');
			doc.validateOnParse = false;
			doc.setProperty('ProhibitDTD', false);
			doc.setProperty('SelectionLanguage', 'XPath');
			doc.setProperty('SelectionNamespaces', XPathEmulator.prototype.createNSResolver());
			doc.loadXML(webRes.content);
		}
		this.clearCanvas(doc);
		return doc;
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
			if ((toRemove.localName || toRemove.nodeName) == "g") // nodeName is FIX for IE9+
				canvas.removeChild(toRemove);
		}
	},

	startScripts: function(world) {
		this.verbose && console.log("start scripts %s in %s", this.scripts, world);
		// sometimes there are null values in this.scripts. Filter them out
		this.scripts.select(function(ea) {return ea}).forEach(function(s) { s.start(world); });
	},
        
    importWrapperFromNode: function(rawNode) {
		///console.log('making morph from %s %s', node, LivelyNS.getType(node));
		// call reflectively b/c 'this' is not a Visual yet. 
		var wrapperType = lively.data.Wrapper.getEncodedType(rawNode);
	
		if (!wrapperType || !Class.forName(wrapperType)) {
			if (Config.silentFailOnWrapperClassNotFound) {
				console.log(Strings.format("ERROR: node %s (parent %s) cannot be a morph of %s",
		    		   	rawNode.tagName, rawNode.parentNode, wrapperType));
				var morph = new Morph(this, rawNode);
				morph.applyStyle({borderColor: Color.red, borderWidth: 8});
				morph.isEmergencyMorph = true;
				return morph;
			} else {
			    throw new Error(Strings.format("node %s (parent %s) cannot be a morph of %s",
			    	rawNode.tagName, rawNode.parentNode, wrapperType));	    
			}
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
				try {
					wrapper.onDeserialize();
				} catch(e) {
					console.warn('Cannot deserialize ' + wrapper + ': ' + e + '\n' + e.stack)
				}
			} 
			// collect scripts
			if (wrapper.activeScripts)
				this.scripts = this.scripts.concat(wrapper.activeScripts);
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
		var world = null,
			morphs = this.importFromNodeList(this.canvasContent(doc));

		if (!(0 in morphs)) return null;

		var canvas = this.canvas(doc);

		if (morphs[0] instanceof WorldMorph) {
			world = morphs[0];	
			if (morphs.length > 1) console.log("more than one top level morph following a WorldMorph, ignoring remaining morphs");
		} else {
			// no world, create one and add all the serialized morphs to it.
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

Object.extend(Importer, {
	marker: Object.extend(new Importer(), {
	    addMapping: Functions.Empty,
	    lookup: Functions.Null,
	}),
});


Function.addMethods(
'serialization', {
	toLiteral: function() {
		return {source: String(this)}
	},
	unbind: function() {
		// for serializing functions
		return Function.fromString(this.toString());
	},
	asScript: function(optVarMapping) {
		return lively.Closure.fromFunction(this, optVarMapping).recreateFunc();
	},
	asScriptOf: function(obj, optName) {
		var name = optName || this.name;
		if (!name)
			throw Error("Function that wants to be a script needs a name: " + this);
		var klass = obj.constructor, mapping = {"this": obj};
		if (klass && klass.prototype && klass.prototype[name]) {
			var superFunc = function() { return this.constructor.prototype[name].apply(this, arguments) };
			mapping["$super"] = lively.Closure.fromFunction(superFunc, {"this": obj, name: name}).recreateFunc();
		}
		obj[name] = this.asScript(mapping);
		return obj[name];
	},
});

Object.extend(Function, {
	fromString: function(funcOrString) {
		return eval('(' + funcOrString.toString() + ')') 
	},

	fromLiteral: function(obj) { 
		return Function.fromString(obj.source).asScript();
	},
});


Object.extend(Global, { // various stuff
	basicResize: function(world, canvas, newWidth, newHeight) {
		canvas.setAttribute("width", newWidth);
		canvas.setAttribute("height", newHeight);
		world.setExtent(pt(newWidth, newHeight));
		world.fullBounds = new Rectangle(0, 0, newWidth, newHeight);
	},

	onresize: function(evt) {
		if (!Config.onWindowResizeUpdateWorldBounds) return; 
		var h = document.getElementsByTagName('html')[0];
	    var world = WorldMorph.current();
		if (!world) {
			console.log("Error: No world to resize.")
			return;
		}		
		// Todo: get rid of the arbitrary offset without getting scrollbars
	    var newWidth = h.clientWidth - 4;
	    var newHeight = h.clientHeight-  4;
	},

	$morph: function getMorphNamedShortcut(name) {
		return WorldMorph.current().getMorphNamed(name);
	},

	interactiveEval: function(text) {
	   // FIXME for compatibility, load jQuery for some interactive conveniences
		// ECMAScript 3rd edition, section 12.4: 
		// “Note that an ExpressionStatement cannot start with an opening curly brace because that might make it ambiguous with a Block.“
		//text = '(' + text + ')'; // workaround for that issue
		return eval(text);
	},
	
});


Object.subclass('ClipboardCopier', {
	
	pastePosition: pt(0,0),

	createBaseDocument: function(source) {
		return new DOMParser().parseFromString('<?xml version="1.0" standalone="no"?>' +
			'<svg xmlns:lively="http://www.experimentalstuff.com/Lively" xmlns="http://www.w3.org/2000/svg" id="canvas">' +
                '<g type="WorldMorph" id="1:WorldMorph" transform="matrix(1 0 0 1 0 0)" fill="rgb(255,255,255)">'+
                    '<rect x="0" y="0" width="800" height="600"/>' +          
                    source  +
                '</g>'+ 
            '</svg>', /* "text/xml" */ "application/xml");
	},

	loadMorphsWithWorldTrunkFromSource: function(source) {
    	var xml = this.createBaseDocument(source);
		var systemDictionary = xml.getElementById("SystemDictionary");
		var globalSystemDictionary = lively.data.Wrapper.prototype.dictionary();
		if(systemDictionary) {
			$A(systemDictionary.childNodes).each(function(ea) {
				var result = lively.data.FragmentURI.getElement(ea.id);
				
				// TODO: give the element a new id and map it, is there an implemnentation laying around somewhere here?
				if(!result) 
					globalSystemDictionary.appendChild(ea.cloneNode(true))
			})
		}
		var world = new Importer().loadWorldContents(xml);
		return world.submorphs
    },	

	calcTopLeftOfPoints: function(points) {
		var min_x;
		var min_y;
		points.each(function(ea) {
			if (!min_x || ea.x < min_x)
				min_x = ea.x;
			if (!min_y || ea.y < min_y)
				min_y = ea.y;
		});
		return pt(min_x, min_y)
	},

	

	calcPasteOffsetFrom: function(morphs) {
		if(morphs.length == 0)
			return;
		var topLeft = this.calcTopLeftOfPoints(morphs.collect(function(ea) {return ea.getPosition()}))		
		return this.pastePosition.subPt(topLeft);
	},

	copyMorphsAsXMLString: function(morphs) {
		var copier = new Copier();
		var doc = this.createBaseDocument();
		var worldNode = doc.childNodes[0].childNodes[0];
		
		var container = new Morph.makeRectangle(new Rectangle(0,0,10,10));
		container.isSelectionContainer = true;
				
		morphs.each(function(ea) {
			container.addMorph(ea.copy(copier));
		})
		copier.finish()
		var systemDictionary =	container.rawNode.appendChild(NodeFactory.create("defs"));
		systemDictionary.setAttribute("id", "SystemDictionary");
		
		worldNode.appendChild(container.rawNode);
		var exporter = new Exporter(container);
		container.dictionary = function() { return systemDictionary}
		var helpers = exporter.extendForSerialization(systemDictionary);
		var result = Exporter.stringify(container.rawNode);
		exporter.removeHelperNodes(helpers);
		delete container.dictionary
	
		return result
	},

	// cut and past is not identity preserving
	pasteMorphsFromSource: function(source, pasteDestinationMorph){
		var morphs = this.loadMorphsWithWorldTrunkFromSource(source);
		if (morphs.length == 0) {
			var pos = this.pastePosition();
			var textMorph = new TextMorph(new Rectangle(pos.x,pos.y,200,100), source);
			this.addMorph(textMorph);
			return;
		}
		// unpack potential selection morph
		if(morphs[0] && morphs[0].isSelectionContainer) {
			morphs = morphs[0].submorphs
		};
		var copier = new Copier();
		var offset = this.calcPasteOffsetFrom(morphs);
		morphs.each(function(ea) {
			var copy = ea.copy(copier);
			pasteDestinationMorph.addMorph(copy)
			if (offset) {
				copy.moveBy(offset)
			}	
		}, this);
		copier.finish()
	},

});


/**
 *  Misc
 */

Object.subclass('DocLinkConverter', {

	initialize: function(codeBase, toDir) {
		if (!codeBase.toString().endsWith('/')) codeBase = codeBase.toString() + '/';
		if (!toDir.toString().endsWith('/')) toDir = toDir.toString() + '/';
		this.codeBase = new URL(codeBase);
		this.toDir = new URL(toDir).withRelativePartsResolved();
	},

	convert: function(doc) {
		var scripts = $A(doc.getElementsByTagName('script'));
		if (scripts.length <= 0) {
			console.warn('could not convert scripts in doc in DocLinkConverter because no scripts found!');
			return doc;
		}
		this.convertLinks(scripts);
		this.convertAndRemoveCodeBaseDefs(scripts);
		return doc;
	},

	convertAndRemoveCodeBaseDefs: function(scripts) {
		var codeBaseDefs = scripts.select(function(el) {
			return el.firstChild && el.firstChild.data && el.firstChild.data.startsWith('Config.codeBase=');
		});

		var codeBaseDef = this.createCodeBaseDef(this.codeBaseFrom(this.codeBase, this.toDir));
		
		if (codeBaseDefs.length == 0) {
			var script = NodeFactory.create('script');
			script.setAttribute('name', 'codeBase');
			script.appendChild(NodeFactory.createCDATA(codeBaseDef));

			var localConfigScript = this.findScriptEndingWith('localconfig.js', scripts);
			if (localConfigScript) {
				localConfigScript.parentNode.insertBefore(script, localConfigScript);
				localConfigScript.parentNode.insertBefore(NodeFactory.createNL(), localConfigScript);
			}
			return;
		}

		if (codeBaseDefs.length >= 1) {

			var cdata = codeBaseDefs[0].firstChild;
			cdata.data = codeBaseDef;
		}

		// remove remaining
		for (var i = 1; i < codeBaseDefs.length; i++)
			codeBaseDefs[i].parentNode.removeChild(codeBaseDefs[i]);
	},

	convertLinks: function(scripts) {
		var links = scripts.select(function(el) { return this.getURLFrom(el) != null }, this);
		links.forEach(function(el) {
			var url = this.getURLFrom(el);
			var newUrl = this.convertPath(url);
			this.setURLTo(el, newUrl);
		}, this);
	},

	convertPath: function(path) {
		if (path.startsWith('http')) return path;
		var fn = this.extractFilename(path);
		var relative = this.relativeLivelyPathFrom(this.codeBase, this.toDir);
		return relative + fn;
	},

	codeBaseFrom: function(codeBase, toDir) {
		var urlCodeBase = new URL(codeBase);
		var urlToDir = new URL(toDir);

		if ((urlCodeBase.normalizedHostname() == urlToDir.normalizedHostname()) && (urlCodeBase.port == urlToDir.port))
			return this.relativeCodeBaseFrom(codeBase, toDir);
		else
			return urlCodeBase.toString();
	},

	relativeCodeBaseFrom: function(codeBase, toDir) {
		codeBase = new URL(codeBase);
		toDir = new URL(toDir);
		var relative = toDir.relativePathFrom(codeBase);
		if (relative.startsWith('/')) throw dbgOn(new Error('relative looks different than expected'));
		var levels = relative.split('/').length -1
		var result = range(1, levels).collect(function() { return '..' }).join('/');
		if (result.length > 0) result += '/';
		return result;
	},

	relativeLivelyPathFrom: function(codeBase, toDir) {
		return this.codeBaseFrom(codeBase, toDir) + 'lively/';
	},

	extractFilename: function(url) {
		return url.substring(url.lastIndexOf('/') + 1, url.length);
	},

	createCodeBaseDef: function(relPath) {
		return Strings.format('Config.codeBase=Config.getDocumentDirectory()+\'%s\'', relPath);
	},

	findScriptEndingWith: function(str, scripts) {
		return scripts.detect(function(node) {
				var url = this.getURLFrom(node);
				return url && url.endsWith(str)
			}, this);
	},

	getURLFrom: function(el) {
		return el.getAttribute('xlink:href') || el.getAttribute('src')
	},

	setURLTo: function(el, url) {
		if (el.getAttribute('xlink:href'))
			el.setAttribute('xlink:href', url)
		else
			el.setAttribute('src', url)
	},

});

}) // end of module