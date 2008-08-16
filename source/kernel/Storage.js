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
    openForDragAndDrop: false,
    suppressHandles: true,
    size: 40,
    
    initialize: function($super, targetMorph) {
	var size = this.size;
	$super(pt(size, size).extentAsRectangle(), "rect");
        var exporter = new Exporter(targetMorph);
	var helpers = exporter.extendForSerialization();
	if (!this.defs)  
	    this.defs = this.rawNode.insertBefore(NodeFactory.create("defs"), this.rawNode.firstChild);
        this.serialized = this.defs.appendChild(targetMorph.rawNode.cloneNode(true));
	exporter.removeHelperNodes(helpers);
	this.helpText = "Packaged " + targetMorph.getType() + ".\nSelect unpackage from menu to deserialize contents.";
	var delta = this.borderWidth/2;
	this.addMorph(Morph.makeLine([pt(delta, size/2), pt(size - delta, size/2)], 3, Color.black)).ignoreEvents();
	this.addMorph(Morph.makeLine([pt(size/2, delta), pt(size/2, size - delta)], 3, Color.black)).ignoreEvents();
	this.applyStyle({ fill: new RadialGradient([Color.primary.orange, 1, Color.primary.orange.lighter(), 2, Color.primary.orange]), borderRadius: 6});
    },

    getHelpText: function() {
	return this.helpText;
    },
    
    openIn: function(world, loc) {
        world.addMorphAt(this, loc);
    },
    
    morphMenu: function($super, evt) { 
        var menu = $super(evt);
        menu.replaceItemNamed("package", ["unpackage", function(evt) { 
	    this.unpackageAt(this.getPosition()); 
	}]);
	menu.replaceItemNamed("show Lively markup", ["show packaged Lively markup", function(evt) {
	    this.world().addTextWindow({
		content: Exporter.stringify(this.serialized),
		title: "XML dump",
		position: this.world().positionForNewMorph(this)
	    });
	}]);
	
	menu.replaceItemNamed("publish packaged ...", ["save packaged morph as ... ", function() { 
	    var node = this.serialized;
	    this.world().prompt("save packaged morph as (.xhtml)", function(filename) { 
		filename && Exporter.saveNodeToFile(node, filename) })}]);
        return menu;
    },

    unpackageAt: function(loc) {
	if (!this.serialized) {
	    console.log("no morph to unpackage");
	    return;
	}
	var importer = new Importer();
	// var targetMorph = importer.importFromString(Exporter.stringify(this.serialized));
	var targetMorph = importer.importFromNode(this.serialized);
	if (targetMorph instanceof WorldMorph) {
	    this.world().addMorph(new LinkMorph(targetMorph, loc));
	    for (var i = 0; i < targetMorph.submorphs.length; i++) {
		var m = targetMorph.submorphs[i];
		if (m instanceof LinkMorph) { 
		    // is it so obvious ? should we mark the link world to the external word?
		    m.myWorld = this.world();
		}
	    }
	    importer.finishImport(targetMorph);
	} else {
	    this.world().addMorphAt(targetMorph, loc);
	    importer.finishImport(this.world());
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


Wrapper.subclass('CollectionItem', {
    documentation: "Wrapper around information returned from WebDAV's PROPFIND",

    nameQ: new Query("D:href"),
    propertiesQ: new Query("D:propstat"),
    
    initialize: function(raw, baseUrl) {
        this.rawNode = raw; 
	this.baseUrl = baseUrl;
    },
    
    name: function() {
	// FIXME: resolve prefix "D" to something meaningful?
	var result = this.nameQ.findFirst(this.rawNode);
	if (!result) {
	    console.log("query failed " + Exporter.stringify(this.rawNode));
	    return "?";
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
	return this.propertiesQ.findAll(this.rawNode).pluck('textContent').join('\n');
    }

});


View.subclass('WebFile', NetRequestReporterTrait, { 
    documentation: "Read/Write file",     // merge with Resource?
    pins: ["-File", "Content", "+DirectoryList", "-RootNode"],

    
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
	var result = new Query("/D:multistatus/D:response").findAll(responseXML.documentElement);
	var baseUrl = this.getModelValue("getRootNode");
	
	var files = result.map(function(rawNode) { return new CollectionItem(rawNode, baseUrl).toURL(); });
	files = this.arrangeFiles(files);
	this.setModelValue("setDirectoryList", files);
    },

    saveFileContent: function(url, content) {
	new Resource(url).store(content);
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

	function addSubversionItems(url, items) {
	    var svnPath = url.subversionWorkspacePath();
	    if (!svnPath) return;
	    items.push(["repository info", function(evt) {
		var m = new SyntheticModel(["Info"]);
		new Subversion({model: m, setServerResponse: "setInfo"}).info(svnPath);
		this.world().addTextWindow({acceptInput: false,
					    title: "info " + url,
					    position: evt.point(),
					    plug: {model: m, getText: "getInfo"} });
	    }]);
	    items.push(["repository diff", function(evt) {
		var m = new SyntheticModel(["Diff"]);
		this.world().addTextWindow({acceptInput: false,
					    plug: {model: m, getText: "getDiff"},
					    title: "diff " + url,
					    position: evt.point() });
		new Subversion({model: m, setServerResponse: "setDiff"}).diff(svnPath);
		
	    }]);
	    items.push(["repository commit", function(evt) {
		var world = this.world();
		world.prompt("Enter commit message", function(message) {
		    if (!message) {
			// FIXME: pop an alert if message empty
			console.log("cancelled commit");
			return;
		    }
		    var m = new SyntheticModel(["CommitStatus"]);
		    this.world().addTextWindow({acceptInput: false,
						title: "commit " + url, 
						plug: {model: m, getText: "getCommitStatus"}, 
						position: evt.point() });
		    new Subversion({model: m, setServerResponse: "setCommitStatus"}).commit(svnPath, message);
		});
	    }]);
	}
	function addWebDAVItems(url, items) { 
	    items.push(["get WebDAV info", function(evt) {
		var m = new SyntheticModel(["InfoDocument", "AllProperties"]);
		m.setInfoDocument = function(doc, source) {
		    // translate from nodes to text for the text morph to understand
		    this.setAllProperties(Exporter.stringify(doc), source);
		};
		this.world().addTextWindow({acceptInput: false,
					    plug: {model: m, getText: "getAllProperties"},
					    title: url,
					    position: evt.point() });
		var res = new Resource(url, {model: m, setContentDocument: "setInfoDocument" });
		res.fetchProperties();
		
	    }]);
	    
	    // a different way of doing te same thing, to ponder about
	    if (false) items.push(["also get WebDAV info", function(evt) {
		var r = new Resource(url);
		var model = r.getModel();
		var w = this.world();
		var v = new View({model: model, setContentDocument: "setContentDocument", getContentDocument: "getContentDocument"});
		v.updateView = function(aspect, source) {
		    var p = this.modelPlug;
		    if (!p) return;
		    switch (aspect) {
		    case p.getContentDocument:
			w.addTextWindow({ 
			    content: Exporter.stringify(this.getModelValue('getContentDocument').documentElement),
			    title: "WebDAV dump",
			    position: evt.point()
			});
			break;
		    }
		}
		r.fetchProperties(true);
	    }]);
	}
	

	model.getUpperNodeListMenu =  function() { // cheating: non stereotypical model
	    var model = this;
	    var selected = model.getSelectedUpperNode();
	    if (!selected) return [];
	    
	    var items = [
		["make subdirectory", function(evt) {
		    var dir = browser.retrieveParentNode(selected);
		    this.world().prompt("new directory name", function(response) {
			if (!response) return;
			var newdir = dir.withFilename(response);
			//console.log("current dir is " + newdir);
			var req = new NetRequest({model: model, setStatus: "setRequestStatus"});
			req.mkcol(newdir);
			// FIXME: reload subnodes
		    });
		}]
	    ];
	    addWebDAVItems(selected, items);
	    addSubversionItems(selected, items);
	    return items;
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
		    this.world().addTextWindow({
			content: "Fetching " + url + "...",
			plug: {model: model, getText: "getSelectedLowerNodeContents", setText: "setSelectedLowerNodeContents"},
			title: url.toString(),
			position: evt.point()
		    });
		    var webfile = new WebFile({
			model: model, 
			getFile: "getSelectedLowerNode", 
			setContent: "setSelectedLowerNodeContents",
			getContent: "getSelectedLowerNodeContents" 
		    });
		    webfile.startFetchingFile();
		}],
		["get XPath query morph", browser, "onMenuAddQueryMorph", url],
		["get modification time (temp)", browser, "onMenuShowModificationTime", url] // will go away
	    ];
	    addWebDAVItems(url, items);
	    addSubversionItems(url, items);
	    
	    // FIXME if not trunk, diff with trunk here.
	    
	    if (url.filename().endsWith(".xhtml")) {
		items.push(["load into current world", function(evt) {
		    new NetRequest({model: new NetImporter(), setResponseXML: "loadWorldContentsInCurrent", 
				    setStatus: "setRequestStatus"}).get(url);
		}]);
		
		items.push(["load into new linked world", function(evt) {
		    new NetRequest({model: new NetImporter(), setResponseXML: "loadWorldInSubworld",
				    setStatus: "setRequestStatus"}).get(url);
		}]);
		
	    } else if (url.filename().endsWith(".js")) {
		items.push(["evaluate as Javascript", function(evt) {
		    var importer = NetImporter();
		    importer.onCodeLoad = function(error) {
			if (error) evt.hand.world().alert("eval got error " + error);
		    }
		    importer.loadCode(url); 
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

    onMenuAddQueryMorph: function(url, evt) {
	var req = new NetRequest().beSync();
	var doc = req.propfind(url, 1).getResponseXML(); // FIXME: make async
	var m = new XPathQueryMorph(new Rectangle(0, 0, 500, 200), doc.documentElement);
	WorldMorph.current().addFramedMorph(m, url.toString(), evt.point());
    },

    onMenuShowModificationTime: function(url, evt) {
	// to be removed
	var model = new SyntheticModel(["InspectedNode", "ModTime"]);
	var res = new Resource(url, {model: model, setContentDocument: "setInspectedNode" });
	var query = new Query("/D:multistatus/D:response/D:propstat/D:prop/D:getlastmodified", 
	    {model: model, getContextNode: "getInspectedNode", setResults: "setModTime"});
	res.fetchProperties(true);
	WorldMorph.current().alert('result is ' + Exporter.stringifyArray(model.getModTime(), '\n'));
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
			if (status.isSuccess()) 
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

View.subclass('Subversion',  NetRequestReporterTrait, {
    documentation: "A simple subversion client",
    
    pins:["ServerResponse"],

    initialize: function($super, plug) {
	$super(plug);
	this.server = new URL(URL.source);
	this.server.port = Config.personalServerPort; 
	this.server.search = undefined;
	this.server.pathname = "/trunk/source/server/svn.sjs";
	this.setModelValue("setServerResponse", "");
    },

    diff: function(repoPath) {
	var req = new NetRequest({model: this, setStatus: "setRequestStatus", setResponseText: "setSubversionResponse"});
	this.setModelValue("setServerResponse", "");
	req.get(this.server.withQuery({command: "diff " + (repoPath || "")}));
    },

    info: function(repoPath) {
	var req = new NetRequest({model: this, setStatus: "setRequestStatus", setResponseText: "setSubversionResponse"});
	// use space as argument separator!
	return req.get(this.server.withQuery({command: "info " + (repoPath|| "")}));
    },

    commit: function(repoPath, message) {
	var req = new NetRequest({model: this, setStatus: "setRequestStatus", setResponseText: "setSubversionResponse"});
	// use space as argument separator!
	return req.get(this.server.withQuery({command: "commit " + (repoPath || "") + ' -m "' + message + '"'}));
    },

    setSubversionResponse: function(txt) {	
	this.setModelValue("setServerResponse", txt);
    }

});


Subversion.test = function() { 
    alert(new Subversion().info("trunk/source/kernel/Network.js"));
}


}.logCompletion('Storage.js'))();

