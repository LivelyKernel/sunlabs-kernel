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
 * Storage.js.  Storage system implementation.
 */

(function(module) {


Morph.subclass('PackageMorph', {
    documentation: "Visual representation for a serialized morph",
    borderWidth: 3,
    borderColor: Color.black,
    fill: Color.primary.orange,
    openForDragAndDrop: false,
    suppressHandles: true,
    size: 40,
    
    initialize: function($super, targetMorph) {
	var size = this.size;
	var delta = this.borderWidth/2;
	$super(pt(size, size).extentAsRectangle(), "rect");
        var exporter = new Exporter(targetMorph);
	var helpers = exporter.extendForSerialization();
	if (!this.defs)  
	    this.defs = this.rawNode.insertBefore(NodeFactory.create("defs"), this.rawNode.firstChild);
        this.serialized = this.defs.appendChild(targetMorph.rawNode.cloneNode(true));
	exporter.removeHelperNodes(helpers);
	this.helpText = "Shrink-wrapped " + targetMorph.getType() + ".\nSelect unwrap from menu to deserialize contents.";
	this.addMorph(Morph.makeLine([pt(delta, size/2), pt(size - delta, size/2)], 3, Color.black)).ignoreEvents();
	this.addMorph(Morph.makeLine([pt(size/2, delta), pt(size/2, size - delta)], 3, Color.black)).ignoreEvents();
    },

    getHelpText: function() {
	return this.helpText;
    },
    
    openIn: function(world, loc) {
        world.reactiveAddMorph(this);
    },
    
    morphMenu: function($super, evt) { 
        var menu = $super(evt);
        menu.replaceItemNamed("shrink-wrap", ["unwrap", function(evt) { 
	    this.unwrapAt(this.getPosition()); 
	}.bind(this)]);
	menu.replaceItemNamed("show Lively markup", ["show packaged Lively markup", function(evt) {
	    var extent = pt(500, 300);
            var pane = newTextPane(extent.extentAsRectangle(), "");
	    pane.innerMorph().setTextString(Exporter.stringify(this.serialized));
            this.world().addFramedMorph(pane, "XML dump", this.world().positionForNewMorph(this));
	}.bind(this)]);
	
	menu.replaceItemNamed("publish shrink-wrapped ...", ["save shrink-wrapped morph as ... ", function() { 
	    this.world().prompt("save shrink-wrapped morph as (.xhtml)", function(filename) { 
		if (filename) Exporter.saveDocumentToFile(Exporter.shrinkWrapNode(this.serialized), filename) }.bind(this))}]);
        return menu;
    },

    unwrapAt: function(loc) {
	if (!this.serialized) {
	    console.log("no morph to unwrap");
	    return;
	}
	var importer = new Importer();
	// var targetMorph = importer.importFromString(Exporter.stringify(this.serialized));
	var targetMorph = importer.importFromNode(this.serialized);
	importer.hookupModels();
	if (targetMorph instanceof WorldMorph) {
	    this.world().addMorph(new LinkMorph(targetMorph, loc));
	    for (var i = 0; i < targetMorph.submorphs.length; i++) {
		var m = targetMorph.submorphs[i];
		if (m instanceof LinkMorph) { 
		    // is it so obvious ? should we mark the link world to the external word?
		    m.myWorld = this.world();
		}
	    }
	    importer.startScripts(targetMorph);
	} else {
	    this.world().addMorphAt(targetMorph, loc);
	    importer.startScripts(this.world());
	}
	this.remove();
    },

    restoreFromSubnode: function($super, importer, node) {
	if (!$super(importer, node)) {
	    if (node.parentNode && node.parentNode.localName == "defs" && node.localName == "g") {
		this.serialized = node;
		console.log("package located " + node);
		return true;
	    } else return false;
	} else return true;
    }
});


/**
 * @class Resource
 */ 
Wrapper.subclass('Resource', {
    
    documentation: "Wrapper around information returned from WebDAV's PROPFIND",
    
    initialize: function(query, raw, baseUrl) {
        this.rawNode = raw; 
	this.query = query; // we capture the query to preserve NS resolution context
	this.baseUrl = baseUrl;
    },
    
    name: function() {
	// FIXME: resolve prefix "D" to something meaningful?
        //return decodeURIComponent(this.queryNode("D:href")[0].textContent)
	
	var result = this.query.findFirst(this.rawNode, "D:href");
	if (!result) {
	    console.log("query failed " + Exporter.stringify(this.rawNode));
	    return "?"
	} else 
	    return decodeURIComponent(result.textContent);
    },

    toURL: function() {
	return this.baseUrl.withPath(this.name());
    },

    toString: function() {
	return "#<" + this.getType() + "," + this.toURL() + ">";
    },

    shortName: function() {
	var n = this.name();
	var slash = n.endsWith('/') ? n.lastIndexOf('/', n.length - 2) : n.lastIndexOf('/');
	return n.substring(slash + 1);
    },
    
    properties: function() {
	return this.query.evaluate(this.rawNode, "D:propstat", []).pluck('textContent').join('\n');
    }

});


NetRequestReporter.subclass('LoadHandler', {
    initialize: function(url) {
	this.url = url;
    },

    loadWorldInSubworld: function(doc) {
	var container = Loader.shrinkWrapContainer(doc);
	if (container) {
	    var importer = new Importer();
	    var world = new WorldMorph(Canvas);
	    var morphs = importer.importFromContainer(container, world);
	    if (morphs.length > 0) {
		for (var i = 0; i < morphs.length; i++) {
		    // flatten: 
		    if (morphs[i] instanceof WorldMorph) {
			morphs[i].submorphs.map(function(m) { world.addMorph(m) });
		    } else {
			world.addMorph(morphs[i]);
		    }
		}
		var link = WorldMorph.current().reactiveAddMorph(new LinkMorph(world));
		link.addPathBack();
		return;
	    } 
	}
	WorldMorph.current().alert('no morphs found in ' + this.url); 
    },

    loadWorldContents: function(doc) {
	var container = Loader.shrinkWrapContainer(doc);
	var world = null;
	if (container) {
	    var importer = new Importer();
	    world = importer.importWorldFromContainer(container, WorldMorph.current());
	} 
	if (!world) 
	    WorldMorph.current().alert('no morphs found in %s', this.url);
	else {
	    world.submorphs.forEach(function(m) { WorldMorph.current().addMorph(m) });
	}
	    
    },


    loadJavascript: function(responseText) {
	try {
	    eval(responseText);
	} catch (er) {
	    WorldMorph.current().alert("eval got error " + er);
	}
    }
    
});


View.subclass('WebFile', NetRequestReporterTrait, { 
    documentation: "Read/Write file",
    
    getFile: function() {
	return this.getModelValue('getFile');
    },

    initialize: function($super, plug) {
	$super(plug);
	this.lastFile = null;
    },

    toString: function() {
	return "#<" + this.getType() + "," + this.getFile() + ">";
    },

    startFetchingFile: function() {
	this.updateView(this.modelPlug.getFile, this);
    },

    updateView: function(aspect, source) { // setContent, getContent, getFile
	var p = this.modelPlug;
	if (!p) return;
	switch (aspect) {
	case p.getFile:
	    var file = this.getFile();
	    if (file)
		this.fetchContent(file);
	    break;
	case p.getContent:
	    var file = this.lastFile; // this.getFile();
	    console.log("saving " + file + " source " + source);
	    if (file)
		this.saveFileContent(file, this.getModelValue('getContent'));
	    break;
	}
    },
    
    
    fetchContent: function(url) {
	this.lastFile = url; // FIXME, should be connected to a variable
	if (url.isLeaf()) {
	    var req = new NetRequest({model: this,  // this is not a full model
		setResponseText: "pvtSetFileContent", 
		setStatus: "setRequestStatus"});
	    if (Config.suppressWebStoreCaching)
		req.setRequestHeaders({"Cache-Control": "no-cache"});
	    req.get(url);
	} else {
	    var req = new NetRequest({model: this, setResponseXML: "pvtSetDirectoryContent", 
		setStatus: "setRequestStatus"});
            // initialize getting the content
	    req.propfind(url, 1);
	}
    },


    pvtSetDirectoryContent: function(responseXML) {
	var query = new Query(responseXML.documentElement);
	var result = query.evaluate(responseXML.documentElement, "/D:multistatus/D:response", []);
	var baseUrl = this.getModelValue("getRootNode");
	
	var files = result.map(function(raw) { return new Resource(query, raw, baseUrl).toURL(); });
	files = this.arrangeFiles(files);
	this.setModelValue("setDirectoryList", files);
    },

    saveFileContent: function(url, content) {
	var req = new NetRequest({model: this, setStatus: "setRequestStatus"});
	req.put(url, content);
    },

    pvtSetFileContent: function(responseText) {
	this.setModelValue("setContent", responseText);
    },

    arrangeFiles: function(fullList) {
	var dirs = [];
	var second = [];
	var last = [];
	// little reorg to show the more relevant stuff first.
	for (var i = 0; i < fullList.length; i++) {
	    var n = fullList[i];
	    if (n.filename().endsWith('/')) {
		dirs.push(n);
	    } else if (n.filename().indexOf(".#") == -1) {
		second.push(n);
	    } else {
		last.push(n);
	    }
	}
	return dirs.concat(second).concat(last);
    }
    
});



Widget.subclass('TwoPaneBrowser', { // move to Widgets.js sometime

    pins: ["-RootNode", "TopNode", 
	   "UpperNodeList" , "UpperNodeNameList", "SelectedUpperNode", "SelectedUpperNodeName", "-UpperNodeListMenu", 
	   "LowerNodeList", "LowerNodeNameList", "SelectedLowerNode", "SelectedLowerNodeName", "-LowerNodeListMenu", 
	   "+LowerNodeDeletionConfirmation", "-LowerNodeDeletionRequest"],
	   
    initialize: function(rootNode, lowerFetcher, upperFetcher) {
	// this got a bit out of hand
	var model = new SyntheticModel(["RootNode", //: Node, constant
	    "TopNode", //:Node the node whose contents are viewed in the left pane
	    
	    "UpperNodeList",  //:Node[]
	    "UpperNodeNameList", // :String[]
	    "SelectedUpperNode", //:Node
	    "SelectedUpperNodeName", //: String
	    "SelectedUpperNodeContents", //:String
	    "UpperNodeListMenu", 

	    "LowerNodeList",   // :Node[]
	    "LowerNodeNameList", // :String[]
	    "SelectedLowerNode",  // :Node
	    "SelectedLowerNodeName", //:String
	    "SelectedLowerNodeContents", // : String
	    "LowerNodeListMenu",

	    "SelectedLowerNodeProperties", //:String
	    "LowerNodeDeletionRequest", 
	    "LowerNodeDeletionConfirmation"]);
	

	this.connectModel(model.makePlugSpecFromPins(this.pins));
	
	model.setRootNode(rootNode);
	model.setUpperNodeList([rootNode]);
	model.setUpperNodeNameList([this.SELFLINK]);
	model.setTopNode(rootNode);

	this.lowerFetcher = lowerFetcher;
	lowerFetcher.connectModel({model: model, 
				   getRootNode: "getRootNode",
				   getContent: "getSelectedLowerNodeContents",
				   setContent: "setSelectedLowerNodeContents",
				   setDirectoryList: "setLowerNodeList"});

	this.upperFetcher = upperFetcher;
	upperFetcher.connectModel({model: model, 
				   getRootNode: "getRootNode", 
				   getContent: "getSelectedUpperNodeContents",
				   setContent: "setSelectedUpperNodeContents",
				   setDirectoryList: "setUpperNodeList"});

    },

    UPLINK: "<up>",
    SELFLINK: "<top>",
    
    getSelectedLowerNode: function() {
	return this.getModelValue("getSelectedLowerNode");
    },
    
    setSelectedLowerNode: function(url) {
	console.log("setting selected lower to " + url);
	this.setModelValue("setSelectedLowerNode", url);
    },
    
    getSelectedUpperNode: function() {
	return this.getModelValue("getSelectedUpperNode");
    },

    setSelectedUpperNode: function(url) {
	console.log("setting selected upper to " + url);
	return this.setModelValue("setSelectedUpperNode", url);
    },

    clearLowerNodes: function() {
	this.setModelValue("setLowerNodeList", []);
	this.setModelValue("setLowerNodeNameList", []);
	this.setSelectedLowerNode(null);
	this.setModelValue("setSelectedLowerNodeName", null);
	this.setModelValue("setSelectedLowerNodeContents", "");
    },

    getRootNode: function() {
	return this.getModelValue("getRootNode");
    },
    
    getTopNode: function() {
	return this.getModelValue("getTopNode");
    },

    handleUpperNodeSelection: function(upperName) {
	if (!upperName) return;
	if (upperName == this.UPLINK) { 
	    if (this.nodeEqual(this.getTopNode(), this.getRootNode())) {
		// console.log("we are at root, do nothing");
		return;
	    } else {
		var newTop = this.retrieveParentNode(this.getTopNode());
		this.setModelValue("setTopNode", newTop); 
		console.log("walking up to " + newTop);
		
		// copy left pane to right pane 
		this.setModelValue("setLowerNodeList", this.getModelValue("getUpperNodeList")); 
		this.setModelValue("setLowerNodeNameList", this.getModelValue("getUpperNodeNameList"));
		this.setModelValue("setSelectedLowerNodeName", upperName);
		this.setSelectedUpperNode(null);
		this.upperFetcher.fetchContent(newTop);
	    } 
	} else {
	    var newUpper = upperName == this.SELFLINK ? 
		this.getRootNode() : this.deriveChildNode(this.getTopNode(), upperName);
	    this.setSelectedUpperNode(newUpper);
	    this.lowerFetcher.fetchContent(newUpper);
	}
    },

    handleLowerNameSelection: function(lowerName) {
	if (!lowerName) return;
	var selectedUpper = this.getSelectedUpperNode();
	var newNode = (lowerName == this.UPLINK) ? selectedUpper : this.deriveChildNode(selectedUpper, lowerName);
	if (this.isLeafNode(newNode)) {
	    this.setSelectedLowerNode(newNode);
	} else {
	    this.setModelValue("setTopNode", selectedUpper);
	    this.setModelValue("setUpperNodeList", this.getModelValue("getLowerNodeList"));
	    this.setModelValue("setUpperNodeNameList", this.getModelValue("getLowerNodeNameList"));
	    // the above will cause the list to set selection, to a new upper name, which will 
	    // cause the corresp. upper node to be loaded 
	    this.setModelValue("setSelectedUpperNodeName", lowerName); 
	    this.setSelectedUpperNode(newNode);
	    this.setSelectedLowerNode(null);
	    if (lowerName == this.UPLINK) {
		this.clearLowerNodes();
		return;
	    } 
	} 
	this.lowerFetcher.fetchContent(newNode);

    },


    updateView: function(aspect, source) {
	var p = this.modelPlug;
	if (!p) return;
	switch (aspect) {
	case p.getSelectedUpperNodeName:
	    this.handleUpperNodeSelection(this.getModelValue("getSelectedUpperNodeName"));
	    break;

	case p.getSelectedLowerNodeName:
	    this.handleLowerNameSelection(this.getModelValue("getSelectedLowerNodeName"));
	    break;
	    
	case p.getLowerNodeList: 
	    this.setModelValue("setLowerNodeNameList", 
			       this.nodesToNames(this.getModelValue("getLowerNodeList"), 
						 this.getSelectedUpperNode()));
	    break;
	    
	case p.getUpperNodeList: 
	    this.setModelValue("setUpperNodeNameList", 
			       this.nodesToNames(this.getModelValue("getUpperNodeList"), 
						 this.getTopNode()));
	    break;

	case p.getLowerNodeDeletionRequest:
	    this.removeNode(this.getSelectedLowerNode());
	    break;
	}
    },

    removeNode: function(node) {
	console.log("implement remove node?");
    },
    
    buildView: function(extent, model) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['leftPane', newTextListPane, new Rectangle(0, 0, 0.5, 0.6)],
            ['rightPane', newTextListPane, new Rectangle(0.5, 0, 0.5, 0.6)],
            ['bottomPane', newTextPane, new Rectangle(0, 0.6, 1, 0.4)]
        ]);
        panel.leftPane.connectModel({model: model,
				     getList: "getUpperNodeNameList",
				     getMenu: "getUpperNodeListMenu",
				     setSelection: "setSelectedUpperNodeName", 
				     getSelection: "getSelectedUpperNodeName"});

        var m = panel.rightPane;
        m.connectModel({model: model, getList: "getLowerNodeNameList", setSelection: "setSelectedLowerNodeName", 
			getDeletionConfirmation: "getLowerNodeDeletionConfirmation",
			setDeletionRequest: "setLowerNodeDeletionRequest",
			getMenu: "getLowerNodeListMenu"});
	
	
        panel.bottomPane.connectModel({model: model, 
				       getText: "getSelectedLowerNodeContents", 
				       setText: "setSelectedLowerNodeContents"});
	
	// kickstart
	var im = panel.leftPane.innerMorph();
	im.updateView(im.modelPlug.getList, im);
        return panel;
    },

    viewTitle: function() {
	var title = new PrintMorph(new Rectangle(0, 0, 150, 15), 'Browser ').beLabel();
	title.formatValue = function(value) { return String(value).truncate(50) }; // don't inspect URLs, just toString() them.
	title.connectModel({model: this.getModel(), getValue: "getTopNode"});
	// kickstart
	title.updateView(title.modelPlug.getValue);
	return title;
    }

});


TwoPaneBrowser.subclass('FileBrowser', {

    initialize: function($super, rootNode) {
	if (!rootNode) rootNode = URL.source.getDirectory();
	$super(rootNode, new WebFile(), new WebFile());
	var model = this.getModel();
	var browser = this;
	model.getUpperNodeListMenu =  function() { // cheating: non stereotypical model
	    var model = this;
	    return [
		["make subdirectory", function(evt) {
		    var selected = model.getSelectedUpperNode();
		    if (!selected) 
			return;
		    var dir = browser.retrieveParentNode(selected);
		    this.world().prompt("new directory name", function(response) {
			if (!response) return;
			var newdir = dir.withFilename(response);
			//console.log("current dir is " + newdir);
			var req = new NetRequest().connectModel({model: model, setStatus: "setRequestStatus"});
			req.mkcol(newdir);
			// FIXME: reload subnodes
		    });
		}]
	    ];
	};

	model.getLowerNodeListMenu =  function() { // cheating: non stereotypical model
	    var items = [];
	    var url = this.getSelectedLowerNode();
	    if (!url) 
		return [];
	    var fileName = url.toString();
	    var model = this;
	    var items = [
		['edit in separate window', function(evt) {
		    var textEdit = newTextPane(new Rectangle(0, 0, 500, 200), "Fetching " + url + "...");
		    var webfile = new WebFile({model: model, 
			getFile: "getSelectedLowerNode", 
			setContent: "setSelectedLowerNodeContents",
			getContent: "getSelectedLowerNodeContents"
			});
		    webfile.startFetchingFile();
		    textEdit.innerMorph().connectModel({model: model, 
							getText: "getSelectedLowerNodeContents", 
							setText: "setSelectedLowerNodeContents"});
		    this.world().addFramedMorph(textEdit, url.toString(), evt.mousePoint);
		}],
		
		["get WebDAV info", function(evt) {
		    var infoPane = newTextPane(new Rectangle(0, 0, 500, 200), "");
		    infoPane.innerMorph().acceptInput = false;
		    infoPane.innerMorph().connectModel({model: model, getText: "getSelectedLowerNodeProperties"});
		    
		    var req = new NetRequest({model: model, 
			setResponseText: "setSelectedLowerNodeProperties", setStatus: "setRequestStatus"});
		    req.propfind(url, 1);
		    this.world().addFramedMorph(infoPane, url.toString(), evt.mousePoint);
		}]
	    ];
	    
	    if (url.filename().endsWith(".xhtml")) {
		// FIXME: add loading into a new world
		items.push(["load into current world", function(evt) {
		    var loader = new LoadHandler(url);
		    new NetRequest({model: loader, setResponseXML: "loadWorldContents", 
				    setStatus: "setRequestStatus"}).get(url);
		}]);
		
		items.push(["load into new linked world", function(evt) {
		    var loader = new LoadHandler(url);
		    new NetRequest({model: loader, setResponseXML: "loadWorldInSubworld",
				    setStatus: "setRequestStatus"}).get(url);
		}]);
		
	    } else if (url.toString().endsWith(".js")) {
		items.push(["evaluate as Javascript", function(evt) {
		    var loader = new LoadHandler(url);
		    new NetRequest({model: loader, setResponseText: "loadJavascript",
				    setStatus: "setRequestStatus"}).get(url);
		}]);
	    }
	    
	    if (SourceControl) {
		var fileName = url.filename();
		items.unshift(['open a changeList browser', function(evt) {
                    var chgList = SourceControl.changeListForFileNamed(fileName);
		    new ChangeList(fileName, null, chgList).openIn(this.world()); 
		}]);
	    }
	    return items; 
	};

    },

    removeNode: function(url) {
	var model = this.getModel();
	if (!url.isLeaf()) {
	    WorldMorph.current().alert("will not erase directory " + url);
	    model.setLowerNodeDeletionConfirmation(false);
	    return;
	}
	
        WorldMorph.current().confirm("delete resource " + url, function(result) {
	    if (result) {
		var eraser = { 
		    setRequestStatus: function(status) { 
			if (status.status < 300) 
			    model.setLowerNodeDeletionConfirmation(true);
			NetRequestReporterTrait.setRequestStatus.call(this, status);
		    }
		};
		new NetRequest({model: eraser, setStatus: "setRequestStatus"}).del(url);
	    } else console.log("cancelled removal of " + url);
	});
    },


    retrieveParentNode: function(node) {
	return node.getDirectory();
    },

    nodesToNames: function(nodes, parent) {
	var UPLINK = this.UPLINK;
	// FIXME: this may depend too much on correct normalization, which we don't quite do.
	return nodes.map(function(node) { return node.eq(parent) ?  UPLINK : node.filename()});
    },

    isLeafNode: function(node) {
	return node.isLeaf();
    },
    
    deriveChildNode: function(parentNode, childName)  {
	return parentNode.withFilename(childName);
    },

    nodeEqual: function(n1, n2) {
	return n1.eq(n2);
    }

	
});


View.subclass('DOMFetcher', {

    initialize: function($super, plug) {
	$super(plug);
	this.lastNode = null;
    },

    updateView: function(aspect, source) { // setContent, getContent, getFile
	var p = this.modelPlug;
	if (!p) return;
	switch (aspect) {
	case p.getContent:
	    var file = this.lastNode; // this.getFile();
	    console.log("!not saving " + file + " source " + source);
	    break;
	}
    },
    
    fetchContent: function(node) {
	console.log("fetching " + node);
	this.lastNode = node; // FIXME, should be connected to a variable
	var nodes = [];
	for (var n = node.firstChild; n != null; n = n.nextSibling)
	    nodes.push(n);
	this.setModelValue("setDirectoryList", nodes);
	
	var info;
	if (node.nodeType !== Node.ELEMENT_NODE) {
	    info = node.textContent;
	} else {
	    info = "tagName=" + node.tagName;
	    
	    if (node.attributes) {
		var attributes = [];
		for (var i = 0; i < node.attributes.length; i++)  {
		    var a = node.attributes[i];
		    info += "\n" + a.name + "=" + a.value;
		}
	    }
	}
	this.setModelValue("setContent", info);
    }

});


TwoPaneBrowser.subclass('DOMBrowser', {

    // indexed by Node.nodeType
    nodeTypes: [ "", "Node", "Attribute", "Text", "CData", "EntityReference", "Entity", "ProcessingInstruction", 
		 "Comment", "Document", "DocumentType", "DocumentFragment", "Notation"],

    initialize: function($super, element) {
	$super(element || document.documentElement, new DOMFetcher(), new DOMFetcher());
    },

    nodesToNames: function(nodes, parent) {
	// FIXME: this may depend too much on correct normalization, which we don't quite do.
	var result = [];
	var nodeTypes = this.nodeTypes;
	function printNode(n) {
	    var id = n.getAttribute && n.getAttribute("id");
	    var t = n.getAttributeNS && LivelyNS.getType(n);
	    return (n.nodeType == Node.ELEMENT_NODE ? n.tagName : nodeTypes[n.nodeType]) 
		+ (id ? ":" + id : "") + (t ? ":" + t : "");
	}
	
	for (var i = 0; i < nodes.length; i++) {
	    result[i] = String(i) + ":" + printNode(nodes[i]);
	}
	result.unshift(this.UPLINK);
	return result;
    },

    retrieveParentNode: function(node) {
	return node.parentNode;
    },

    isLeafNode: function(node) {
	return !node || node.firstChild == null;
    },

    deriveChildNode: function(parentNode, childName)  {
	var index = parseInt(childName.substring(0, childName.indexOf(':')));
	if (isNaN(index))
	    return parentNode;
	else 
	    return parentNode && parentNode.childNodes.item(index);
    },

    nodeEqual: function(n1, n2) {
	return n1 === n2;
    }
    
});


// move elsewhere
View.subclass('ObjectFetcher', {

    initialize: function($super, plug) {
	$super(plug);
	this.lastNode = null;
    },

    updateView: function(aspect, source) { // setContent, getContent, getFile
	var p = this.modelPlug;
	if (!p) return;
	switch (aspect) {
	case p.getContent:
	    var file = this.lastNode; // this.getFile();
	    console.log("!not saving " + file + " source " + source);
	    break;
	}
    },
    
    fetchContent: function(node) {
	console.log("fetching properties of " + node);
	this.lastNode = node; // FIXME, should be connected to a variable
	// console.log("properties are " + Properties.all(node));
	var values = Properties.own(node).map(function(name) { return node[name]; });
	this.setModelValue("setDirectoryList", values);
	this.setModelValue("setContent", Object.inspect(node));
    }

});



TwoPaneBrowser.subclass('TwoPaneObjectBrowser', {
    // clearly not quite finished

    initialize: function($super) {
	$super(WorldMorph.current(), new ObjectFetcher(), new ObjectFetcher());
    },

    nodesToNames: function(nodes, parent) {
	var props = Properties.own(parent);
	var names = [];
	// FIXME! ouch quadratic
	for (var i = 0; i < nodes.length; i++) 
	    for (var j = 0; j < props.length; j++) {
		if (parent[props[j]] === nodes[i] && nodes[i])
		    names[i] = props[j];
	    }
	names.unshift(this.UPLINK);
	
	return names;
    },


    retrieveParentNode: function(node) {
	return this.getRootNode(); // ???
    },

    isLeafNode: function(node) {
	return Properties.own(node).length == 0;
    },

    deriveChildNode: function(parentNode, childName)  {
	return parentNode[childName];
    },

    nodeEqual: function(n1, n2) {
	return n1 === n2;
    }
    
});



}.logCompletion('Storage.js'))();

