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
    
    initialize: function(query, raw) {
        this.rawNode = raw; 
	this.query = query; // we capture the query to preserve NS resolution context
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
    
    properties: function() {
	return this.query.evaluate(this.rawNode, "D:propstat", []).pluck('textContent').join('\n');
    }

});

View.subclass('WebFile', { 
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
	var req = new NetRequest({model: this,  // this is not a model
	    setResponseText: "setFileContent", 
	    setStatus: "setRequestStatus"});
	if (Config.suppressWebStoreCaching)
	    req.setRequestHeaders({"Cache-Control": "no-cache"});
	req.get(url);
    },
    
    setFileContent: function(responseText) {
	this.setModelValue("setContent", responseText);
    },

    saveFile: function(url, content) {
	var req = new NetRequest({model: this, setStatus: "setRequestStatus"});
	req.put(url, content);
    },

    setRequestStatus: function(statusInfo) {
	// error reporting
	var method = statusInfo.method;
	var url = statusInfo.url;
	var status = statusInfo.status;
	if (status >= 300) {
	    if (status == 401) {
		WorldMorph.current().alert("not authorized to access " + method + " " + url); // should try to authorize
	    } else {
		WorldMorph.current().alert("failure to " + method + " "  + url + " code " + status);
	    }
	} else 
	    console.log("status " + status + " on " + method + " " + url);
    }
    
});


Model.subclass('FileBrowser', {

    documentation: "A model for a paned file browser",

    initialize: function($super, host, path) {
        $super();
	this.baseUrl = new URL(Global.location.toString()).dirnameURL();
        this.CurrentResource = null; // URL
        this.CurrentResourceContents = "";
        this.DirectoryList = [ this.baseUrl.path ];
        this.CurrentDirectory = null;
        this.CurrentDirectoryContents = null; // :Resource[]
    },


    setRequestStatus: function(statusInfo) {
	// error reporting
	var method = statusInfo.method;
	var url = statusInfo.url;
	var status = statusInfo.status;
	if (status >= 300) {
	    if (status == 401) {
		WorldMorph.current().alert("not authorized to access " + method + " " + url); // should try to authorize
	    } else {
		WorldMorph.current().alert("failure to " + method + " "  + url + " code " + status);
	    }
	} else 
	    console.log("status " + status + " on " + method + " " + url);
    },

    // basic protocol methods:
    fetch: function(url) {
	var req = new NetRequest({model: this, 
	    setResponseText: "setCurrentResourceContents", 
	    setStatus: "setRequestStatus", setRequest: "setRequest" });
	if (Config.suppressWebStoreCaching)
	    req.setRequestHeaders({"Cache-Control": "no-cache"});
	this.CurrentResource = url;
	req.get(url);
    },
    
    save: function(url, content) {
        // retrieve the the contents of the url and save in the indicated model variable
        console.log('saving url ' + url);
	var req = new NetRequest({model: this, setStatus: "setRequestStatus"});
	req.put(url, content);
    },

    getCurrentResourceContents: function() {
        return this.CurrentResourceContents || "";
    },
    
    setCurrentResourceContents: function(contents, view) {
	this.CurrentResourceContents = contents;
	if (view instanceof Morph) { // setting from the GUI (should be reworked?)
	    var safeSize = TextMorph.prototype.maxSafeSize;
            if (contents.length > safeSize) {
		WorldMorph.current().alert("not saving file, size " + contents.length 
					   + " > " + safeSize + ", too large");
            } else {
		this.save(this.CurrentResource, contents);
            }
	} 
	this.changed('getCurrentResourceContents', view);
    },

    
    // to be used by WebFile only
    accessCurrentResource: function() {
	return this.CurrentResource;
    },


    setCurrentResource: function(fileName) { // model
    },

    resourceURL: function(resource) {
        return this.baseUrl.withPath(resource);
    },

    
    getDirectoryList: function() {
        return this.DirectoryList;
    },

    getCurrentDirectory: function() {
        return this.CurrentDirectory;
    },
    
    setCurrentDirectory: function(name) {
        if (!name) return;

        var segments = name.split("/");
        segments.splice(segments.length - 2, 2);
        var parent = segments.join("/") + "/";
	
        // add the parent of the current directory to the DirectoryList if it's not there?	
	if (this.DirectoryList.indexOf(parent) < 0)  {
	    // a hack to add the parent dir to enable navigation, just in case.
	    this.DirectoryList.push(parent);
	    this.changed('getDirectoryList'); // this may set CurrentDirectory to null so assign to it later here
	}

        this.CurrentDirectory = name;
        this.changed('getCurrentDirectory');

        console.log('host %s, dir %s name %s', this.baseUrl.hostname, this.CurrentDirectory, name);
	var req = new NetRequest({model: this, setResponseXML: "setCurrentDirectoryContents", 
	    setStatus: "setRequestStatus"});
        // initialize getting the content
	req.propfind(this.resourceURL(this.CurrentDirectory), 1);
	console.log("finding properties for " + this.resourceURL(this.CurrentDirectory));
	
    },
    
    setCurrentDirectoryContents: function(doc) {
	console.log("processing results ");
	var query = new Query(doc.documentElement);
	var result = query.evaluate(doc.documentElement, "/D:multistatus/D:response", []);

	this.CurrentDirectoryContents = result.map(function(raw) { 
	    return new Resource(query, raw); 
	}.bind(this));
	this.changed('getCurrentDirectoryContents');
    },


    getCurrentDirectoryContents: function() {
        var fullList = (this.CurrentDirectoryContents || []).invoke("name");
	var first = [];
	var last = [];
	// little reorg to show the more relevant stuff first.
	for (var i = 0; i < fullList.length; i++) {
	    var n = fullList[i];
	    if (n.indexOf(".#") == -1) 
		first.push(n);
	    else 
		last.push(n);
	}
	return first.concat(last);
    },
    
    setCurrentResource: function(name) {
        if (!name) 
	    return;
        if (name.endsWith('/')) { // directory, enter it!
            // only entries with trailing slash i.e., directories
            this.CurrentDirectory = name;
            this.changed('getCurrentDirectory');
            console.log('entering directory %s now', this.CurrentDirectory);
	    
            this.DirectoryList = 
                this.getCurrentDirectoryContents().filter(function(res) { return res.endsWith('/')});
	    this.changed("getDirectoryList");
            this.CurrentResource = null;
            this.CurrentDirectoryContents = [];
            this.changed('getCurrentDirectoryContents');
        } else {
            this.CurrentResource = this.baseUrl.withPath(name);
            console.log("current resource set to %s", this.CurrentResource);
            // initialize getting the resource contents
            this.fetch(this.CurrentResource);
	}
    },
		
    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['leftPane', newListPane, new Rectangle(0, 0, 0.5, 0.6)],
            ['rightPane', newListPane, new Rectangle(0.5, 0, 0.5, 0.6)],
            ['bottomPane', newTextPane, new Rectangle(0, 0.6, 1, 0.4)]
        ]);
        panel.leftPane.connectModel({model: this, 
				     getList: "getDirectoryList",
				     getMenu: "getDirectoryMenu",
				     setSelection: "setCurrentDirectory", 
				     getSelection: "getCurrentDirectory"});

        var m = panel.rightPane;
        m.connectModel({model: this, getList: "getCurrentDirectoryContents", setSelection: "setCurrentResource", 
			getMenu: "getFileMenu"});
        m.innerMorph().onKeyPress = function(evt) {
            if (evt.getKeyCode() == Event.KEY_BACKSPACE) { // Replace the selection after checking for type-ahead
		var model = this.getModel();
		var toDelete  = model.resourceURL(this.itemList[this.selectedLineNo()]);
                this.world().confirm("delete resource " + toDelete, function(result) {
		    if (result) {
			new NetRequest({model: model, setStatus: "setRequestStatus"}).del(toDelete);
		    } else console.log("cancelled deletion of " + toDelete);
		});
                evt.stop();
            } else CheapListMorph.prototype.onKeyPress.call(this, evt);
        };

        panel.bottomPane.connectModel({model: this, 
				       getText: "getCurrentResourceContents", 
				       setText: "setCurrentResourceContents"});
        return panel;
    },

    setLoadResult: function(doc) {
	var container = Loader.shrinkWrapContainer(doc);
	var world = null;
	if (container) {
	    var importer = new Importer();
	    world = importer.importWorldFromContainer(container, WorldMorph.current());
	} 
	if (!world) 
	    WorldMorph.current().alert('no morphs found in %s', this.CurrentResource); // FIXME not CurrentResource
    },

    setLoadInSubworldResult: function(doc) {
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
	WorldMorph.current().alert('no morphs found in %s', store.CurrentResource);
    },

    getCurrentResourcePropertiesAsText: function() {
	return this.Properties instanceof Array ? 
	    this.Properties[0].toMarkupString() : "fetching properties " ;
    },

    setCurrentResourceProperties: function(doc) {
	var query = new Query(doc.documentElement);
	var result = query.evaluate(doc.documentElement, "/D:multistatus/D:response", []); 
	this.Properties = result.map(function(raw) { return new Resource(query, raw); }.bind(this));
	this.changed('getCurrentResourcePropertiesAsText');
    },


    getDirectoryMenu: function() {
	var model = this;
	return [
	    ["make subdirectory", function(evt) {
		// FIXME: dialog for name
		var dirname = model.getCurrentDirectory();
		if (!dirname) 
		    return;
		this.world().prompt("new directory name", function(response) {
		    if (!response) return;
		    console.log("current dir is " + dirname);
		    var req = new NetRequest().connectModel({model: model, setStatus: "setRequestStatus"});
		    var url = (new URL(model.resourceURL(dirname)).withPath(dirname + response));
		    req.mkcol(url);
		});
	    }]
	];
	
    },


    getFileMenu: function() {
	var items = [];
	var url = this.CurrentResource;
	if (!url) 
	    return [];
	var fileName = url.toString();
	var model = this;
	var items = [
	    ['edit in separate window', function(evt) {
		var textEdit = newTextPane(new Rectangle(0, 0, 500, 200), "Fetching " + url + "...");
		new WebFile({model: model, getURL: "accessCurrentResource", 
			     setContent: "setCurrentResourceContents", getContent: "getCurrentResourceContents"});
		textEdit.innerMorph().connectModel({model: model, 
						    getText: "getCurrentResourceContents", 
						    setText: "setCurrentResourceContents"});
		this.world().addFramedMorph(textEdit, url.toString(), evt.mousePoint);
	    }],
	    
	    ["get WebDAV info", function(evt) {
		var infoPane = newTextPane(new Rectangle(0, 0, 500, 200), "");
		infoPane.innerMorph().acceptInput = false;
		infoPane.innerMorph().connectModel({model: model, getText: "getCurrentResourcePropertiesAsText"});
		
		var req = new NetRequest({model: model, 
		    setResponseXML: "setCurrentResourceProperties", setStatus: "setRequestStatus"});
		req.propfind(url, 1);
		this.world().addFramedMorph(infoPane, fileName, evt.mousePoint);
	    }]
	];
	
	if (url.filename().endsWith(".xhtml")) {
	    // FIXME: add loading into a new world
	    items.push(["load into current world", function(evt) {
		new NetRequest({model: model, setResponseXML: "setLoadResult", 
				setStatus: "setRequestStatus"}).get(url);
	    }]);
	    
	    items.push(["load into new linked world", function(evt) {
		new NetRequest({model: model, setResponseXML: "setLoadInSubworldResult",
				setStatus: "setRequestStatus"}).get(url);
	    }]);

	} else if (fileName.endsWith(".js")) {
	    // FIXME 
	}
	
	var contents = this.getCurrentResourceContents();
	console.log("fileName = " + fileName + "; contents.length = " + contents.length);
        if (contents && contents.length > 0) {
	    items.unshift(['open a changeList browser', function(evt) {
                var chgList = new FileParser().parseFile(fileName, contents);
		new ChangeList(fileName, contents, chgList).openIn(this.world()); 
	    }]);
	}
	return items; 
    },

    openIn: function(world, loc) {
        if (!loc) loc = world.bounds().center();
        console.log('opening web store at %s', loc);
        var panel = this.buildView(pt(400, 300));
        world.addFramedMorph(panel, "Directory Browser on " + this.baseUrl.hostname, loc);
        // this.addCredentialDialog(panel);
        this.changed('getDirectoryList');
    }

});  

console.log('loaded Storage.js');

