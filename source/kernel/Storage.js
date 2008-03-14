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
		if (filename) Exporter.shrinkWrapNodeToFile(this.serialized, filename) }.bind(this))}]);
        return menu;
    },

    unwrapAt: function(loc) {
	if (!this.serialized) {
	    console.log("no morph to unwrap");
	    return;
	}
	var importer = new Importer();
	var targetMorph = importer.importFromString(Exporter.stringify(this.serialized));
	if (targetMorph instanceof WorldMorph) {
	    this.world().addMorph(new LinkMorph(targetMorph, loc));
	    for (var i = 0; i < targetMorph.submorphs.length; i++) {
		var m = targetMorph.submorphs[i];
		if (m instanceof LinkMorph) { 
		    // is it so obvious ? should we mark the link world to the external word 		    
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

    loadWorldInSubworld: function(responseText) {
	var container = Loader.shrinkWrapContainer(doc);
	if (container) {
	    var importer = new Importer();
	    var world = new WorldMorph(Canvas);
	    var morphs = importer.importFromContainer(container, world);
	    if (morphs.length > 0) {
		for (var i = 0; i < morphs.length; i++) {
		    // flatten: 
		    if (morphs[i] instanceof WorldMorph) {
			morphs[i].remove();
			var subs = morphs[i].submorphs;
			subs.invoke('remove');
			subs.map(function(m) { world.addMorph(m) });
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
    },


    loadJavascript: function(responseText) {
	console.log("evaluating " + responseText);
	try {
	    eval(responseText);
	} catch (er) {
	    WorldMorph.current().alert("eval got error " + er);
	}
    }
    
});


View.subclass('WebFile', NetRequestReporterTrait, { 
    documentation: "Read/Write file",
    outlets: ["Content", "-URL"],
    
    url: function() {
	return this.getModelValue('getURL');
    },

    initialize: function($super, plug) {
	$super(plug);
	// kickstart it to start fetching.
	this.updateView(this.modelPlug.getURL, this);
    },

    updateView: function(aspect, source) {
	var p = this.modelPlug;
	if (!p) return;
	switch (aspect) {
	case p.getURL:
	    this.fetchFile(this.url());
	    // initiated here, contents will be saved later.
	    break;
	case p.getContent:
	    this.saveFile(this.url(), this.getModelValue('getContent'));
	    break;
	}
    },

    fetchFile: function(url) {
	var req = new NetRequest({model: this,  // this is not a full model
	    setResponseText: "pvtSetFileContent", 
	    setStatus: "setRequestStatus"});
	if (Config.suppressWebStoreCaching)
	    req.setRequestHeaders({"Cache-Control": "no-cache"});
	req.get(url);
    },

    saveFile: function(url, content) {
	var req = new NetRequest({model: this, setStatus: "setRequestStatus"});
	req.put(url, content);
    },

    pvtSetFileContent: function(responseText) {
	this.setModelValue("setContent", responseText);
    }
    
});



Widget.subclass('FileBrowser', NetRequestReporterTrait, {

    initialize: function(baseUrl) {
	if (!baseUrl) baseUrl = URL.source.dirnameURL();
	var model = new SimpleModel(null, 
	    "RootNode", //: URL, constant
	    "SelectedSuperNode", //:URL
	    "SelectedSubNode",  // :Resource
	    "SelectedSuperNodeName", "SelectedSubNodeName", //:String
	    "SelectedSubNodeContents", //:String
	    "SelectedSubNodeProperties", //:String
	    "SuperNodeList",  //:URL[]
	    "SubNodeList",   // :Resource[]
	    "SuperNodeNameList", // :String[]
	    "SubNodeNameList", // :String[]
	    "SuperNodeListMenu", "SubNodeListMenu",
	    "SubNodeDeletionRequest", "SubNodeDeletionConfirmation");
	
	// this got a bit out of hand
	this.connectModel({model: model, 
			   getSelectedSuperNodeName: "getSelectedSuperNodeName", setSelectedSuperNodeName: "setSelectedSuperNodeName",
			   setSelectedSuperNode: "setSelectedSuperNode", getSelectedSuperNode: "getSelectedSuperNode",
			   getSubNodeList: "getSubNodeList", setSubNodeList: "setSubNodeList", 
			   getSubNodeNameList: "getSubNodeNameList", setSubNodeNameList: "setSubNodeNameList",
			   getSuperNodeList: "getSuperNodeList", setSuperNodeList: "setSuperNodeList", 
			   getSuperNodeNameList: "getSuperNodeNameList", setSuperNodeNameList: "setSuperNodeNameList", 
			   getSelectedSubNodeName: "getSelectedSubNodeName", 
			   getSelectedSubNode: "getSelectedSubNode", setSelectedSubNode: "setSelectedSubNode",
			   getSelectedSubNodeContents: "getSelectedSubNodeContents", setSelectedSubNodeContents: "setSelectedSubNodeContents", 
			   getSubNodeListMenu: "getSubNodeListMenu",
			   getSuperNodeListMenu: "getSuperNodeListMenu",
			   setSubNodeDeletionConfirmation: "setSubNodeDeletionConfirmation",
			   getSubNodeDeletionRequest: "getSubNodeDeletionRequest",
			   getRootNode: "getRootNode"
			  });
	model.setRootNode(baseUrl);
	model.setSuperNodeList([baseUrl]);
	model.setSuperNodeNameList(["./"]);

	model.getSuperNodeListMenu =  function() { // cheating: non stereotypical model
	    var model = this;
	    return [
		["make subdirectory", function(evt) {
		    var selected = model.getSelectedSuperNode();
		    if (!selected) 
			return;
		    var dir = selected.dirnameURL();
		    this.world().prompt("new directory name", function(response) {
			if (!response) return;
			var newdir = dir.withFilename(response);
			console.log("current dir is " + newdir);
			var req = new NetRequest().connectModel({model: model, setStatus: "setRequestStatus"});
			req.mkcol(newdir);
			// FIXME: reload subnodes
		    });
		}]
	    ];
	};

	model.getSelectedSubNodeURL = function() { // cheating: non stereotypical model
	    return this.SelectedSubNode && this.SelectedSubNode.toURL();
	};

	model.getSubNodeListMenu =  function() { // cheating: non stereotypical model
	    var items = [];
	    var url = this.getSelectedSubNodeURL();
	    if (!url) 
		return [];
	    var fileName = url.toString();
	    var model = this;
	    var items = [
		['edit in separate window', function(evt) {
		    var textEdit = newTextPane(new Rectangle(0, 0, 500, 200), "Fetching " + url + "...");
		    new WebFile({model: model, getURL: "getSelectedSubNodeURL", // FIXME: url vs resource 
				 setContent: "setSelectedSubNodeContents", getContent: "getSelectedSubNodeContents"});
		    textEdit.innerMorph().connectModel({model: model, 
							getText: "getSelectedSubNodeContents", 
							setText: "setSelectedSubNodeContents"});
		    this.world().addFramedMorph(textEdit, url.toString(), evt.mousePoint);
		}],
		
		["get WebDAV info", function(evt) {
		    var infoPane = newTextPane(new Rectangle(0, 0, 500, 200), "");
		    infoPane.innerMorph().acceptInput = false;
		    infoPane.innerMorph().connectModel({model: model, getText: "getSelectedSubNodeProperties"});
		    
		    var req = new NetRequest({model: model, 
			setResponseText: "setSelectedSubNodeProperties", setStatus: "setRequestStatus"});
		    req.propfind(url, 1);
		    this.world().addFramedMorph(infoPane, fileName, evt.mousePoint);
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
		
	    } else if (fileName.endsWith(".js")) {
		items.push(["evaluate as Javascript", function(evt) {
		    var loader = new LoadHandler(url);
		    new NetRequest({model: loader, setResponseText: "loadJavascript",
				    setStatus: "setRequestStatus"}).get(url);
		}]);
	    }
	    
	    var contents = this.getSelectedSubNodeContents();
	    console.log("fileName = " + fileName + "; contents.length = " + contents.length);
            if (contents && contents.length > 0) {
		items.unshift(['open a changeList browser', function(evt) {
                    var chgList = new FileParser().parseFile(fileName, contents);
		    new ChangeList(fileName, contents, chgList).openIn(this.world()); 
		}]);
	    }
	    return items; 
	};
	
    },
    
    getSelectedSubNodeResource: function() {
	var result = this.getModelValue("getSelectedSubNode");
	result && (result instanceof Resource) || console.log(result + " not instanceof Resource");
	return result;
    },
    
    setSelectedSubNodeResource: function(resource) {
	resource && (resource instanceof Resource) || console.log(resource + " not instanceof Resource");
	this.setModelValue("setSelectedSubNode", resource);
    },
    
    getSelectedSuperNodeUrl: function() {
	return this.getModelValue("getSelectedSuperNode");
    },

    clearSubNodes: function() {
	this.setModelValue("setSubNodeList", []);
	this.setModelValue("setSubNodeNameList", []);
	this.setSelectedSubNodeResource(null);
	this.setModelValue("setSelectedSubNodeName", null);
	this.setModelValue("setSelectedSubNodeContents", "");
    },

    updateView: function(aspect, source) {
	var p = this.modelPlug;
	if (!p) return;
	switch (aspect) {
	case p.getSelectedSuperNodeName:
	    var dirname = this.getModelValue("getSelectedSuperNodeName");
	    if (!dirname) break;
	    if (dirname == "..") alert("should go up from " + this.getSelectedSuperNodeUrl());
	    var newUrl = dirname == ".." ? 
		this.getSelectedSuperNodeUrl().dirnameURL() : 
		(dirname == "./" ? 
		 this.getModelValue("getRootNode") :
		 this.getModelValue("getSuperNodeList", []).detect(function(url) { return url.filename() == dirname}));
	    
	    if (!newUrl) { 
		console.log("didn't find " + dirname + " in " + this.getModelValue("getSuperNodeList")); 
		break;
	    }
	    
	    if (newUrl.isDirectory()) {
		this.setModelValue("setSelectedSuperNode", newUrl);
		//this.setModelValue("setSelectedSuperNodeName", newUrl.filename());
		this.fetchDirectory(newUrl);
	    } else {
		//this.clearSubNodes();
		console.log("selected non-directory " + newUrl + " on the left");
	    }
	    break;
	    
	case p.getSelectedSubNodeName:
	    var dirUrl = this.getSelectedSuperNodeUrl();
	    var fileName = this.getModelValue("getSelectedSubNodeName");
	    if (!fileName) break;
	    var newUrl = fileName == ".." ? dirUrl : dirUrl.withFilename(fileName);
	    if (!newUrl.isDirectory()) {
		// locate Resource based on the fileName;
		var res = this.getModelValue("getSubNodeList", []).detect(function(r) { return r.shortName() == fileName});
		this.setSelectedSubNodeResource(res); 
		res && this.fetchFile(res.toURL());
	    } else {
		this.setModelValue("setSuperNodeList", this.getModelValue("getSubNodeList").invoke("toURL"));
		this.setModelValue("setSuperNodeNameList", this.getModelValue("getSubNodeNameList"));
		this.setModelValue("setSelectedSuperNode", newUrl);
		this.setModelValue("setSelectedSuperNodeName", fileName);
		if (fileName == "..") {
		    this.clearSubNodes();
		} else {
		    this.fetchDirectory(newUrl);
		}
	    }
	    break;
	case p.setSelectedSubNodeContents:
	    alert('should save ' + this.getSelectedSubNodeResource());
	    break;
	case p.getSubNodeDeletionRequest:
	    this.deleteResource(this.getSelectedSubNodeResource());
	    break;
	}
    },

    fetchDirectory: function(url) {
	var req = new NetRequest({model: this, setResponseXML: "setSelectedSuperNodeProperties", 
	    setStatus: "setRequestStatus"});
        // initialize getting the content
	var dirUrl = this.getSelectedSuperNodeUrl();
	req.propfind(dirUrl, 1);
	console.log("finding properties for " + dirUrl);
    },
    
    setSelectedSuperNodeProperties: function(responseXML) {
	var query = new Query(responseXML.documentElement);
	var result = query.evaluate(responseXML.documentElement, "/D:multistatus/D:response", []);
	var baseUrl = this.getModelValue("getRootNode");
	var files = result.map(function(raw) { return new Resource(query, raw, baseUrl); });
	files = this.arrangeFiles(files);
	this.setModelValue("setSubNodeList", files);
	var dirURLString = this.getSelectedSuperNodeUrl().toString();
	// FIXME: this may depend too much on correct normalization, which we don't quite do.
	
	var fileNames = files.map(function(r) { 
	    if (r.toURL().toString() == dirURLString)
		return "..";
	    else return  r.shortName(); 

	});
	this.setModelValue("setSubNodeNameList", fileNames);
    },


    fetchFile: function(url) { // copied from WebFile
	var req = new NetRequest({model: this,  // this is not a full model
	    setResponseText: "pvtSetFileContent", 
	    setStatus: "setRequestStatus"});
	if (Config.suppressWebStoreCaching)
	    req.setRequestHeaders({"Cache-Control": "no-cache"});
	req.get(url);
    },

    pvtSetFileContent: function(content) {
	this.setModelValue("setSelectedSubNodeContents", content);
    },

    arrangeFiles: function(fullList) {
	var first = [];
	var last = [];
	// little reorg to show the more relevant stuff first.
	for (var i = 0; i < fullList.length; i++) {
	    var n = fullList[i];
	    if (n.name().indexOf(".#") == -1) 
		first.push(n);
	    else 
		last.push(n);
	}
	return first.concat(last);
    },

    deleteResource: function(resource) {
	var model = this.getModel();
	if (resource.toURL().isDirectory()) {
	    WorldMorph.current().alert("will not erase directory " + resource.toURL());
	    model.setSubNodeDeletionConfirmation(false);
	}
	
        WorldMorph.current().confirm("delete resource " + resource.toURL(), function(result) {
	    if (result) {
		var eraser = { 
		    setRequestStatus: function(status) { 
			if (status.status < 300) 
			    model.setSubNodeDeletionConfirmation(true);
			NetRequestReporterTrait.setRequestStatus.call(this, status);
		    }
		};
		new NetRequest({model: eraser, setStatus: "setRequestStatus"}).del(resource.toURL());
	    } else console.log("cancelled deletion of " + resource.toURL());
	});
    },


    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['leftPane', newListPane, new Rectangle(0, 0, 0.5, 0.6)],
            ['rightPane', newListPane, new Rectangle(0.5, 0, 0.5, 0.6)],
            ['bottomPane', newTextPane, new Rectangle(0, 0.6, 1, 0.4)]
        ]);
	var model = this.getModel();
        panel.leftPane.connectModel({model: model,
				     getList: "getSuperNodeNameList",
				     getMenu: "getSuperNodeListMenu",
				     setSelection: "setSelectedSuperNodeName", 
				     getSelection: "getSelectedSuperNodeName"});

        var m = panel.rightPane;
        m.connectModel({model: model, getList: "getSubNodeNameList", setSelection: "setSelectedSubNodeName", 
			getDeletionConfirmation: "getSubNodeDeletionConfirmation",
			setDeletionRequest: "setSubNodeDeletionRequest",
			getMenu: "getSubNodeListMenu"});
	
	
        panel.bottomPane.connectModel({model: model, 
				       getText: "getSelectedSubNodeContents", 
				       setText: "setSelectedSubNodeContents"});
	
	// kickstart
	var im = panel.leftPane.innerMorph();
	im.updateView(im.modelPlug.getList, im);
        return panel;
    },

    viewTitle: function() {
	var title = new PrintMorph(new Rectangle(0, 0, 150, 15), 'File Browser').beLabel();
	title.formatValue = function(value) { return String(value) }; // don't inspect URLs, just toString() them.
	title.connectModel({model: this.getModel(), getValue: "getSelectedSuperNode"});
	return title;
    }

});


}.logCompletion('Storage.js'))();

