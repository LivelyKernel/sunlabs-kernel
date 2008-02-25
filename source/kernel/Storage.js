/*
 * Copyright � 2006-2008 Sun Microsystems, Inc.
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


/**
 * @class Resource
 */ 
Wrapper.subclass('Resource', {
    
    initialize: function(base, raw) {
        this.rawNode = raw; 
	this.base = base;
    },
    
    name: function() {
        return decodeURIComponent(Query.evaluate(this.rawNode, "D:href")[0].textContent);
    }

});

/**
 * @class WebStore
 */ 

Model.subclass('WebStore', {

    documentation: "Network-based storage (WebDAV)",
    
    // FIXME a single argument that is like location (protocol, hostname, port, pathname, hash, search)
    initialize: function($super, host, path) {
        $super();
	if (host === undefined && path === undefined) { // if called with no arguments
            path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('index.xhtml'));
            if (path == "") path = "/";
	    host = window.location.hostname;
	}
	
        this.host = host;
        this.path = path;
        this.protocol = "http"; // can be something else...
	
        this.CurrentResource =  null;
        this.CurrentResourceContents = "";
	this.world = WorldMorph.current();
    },

    // basic protocol methods:
    fetch: function(filename, optModelVariable) {
	var url = this.resourceURL(filename);
        // retrieve the the contents of the url and save in the indicated model variable
        var options =  {
            onSuccess: function(transport) {
                this[optModelVariable] = transport.responseText;
                this.changed("get" + optModelVariable);
            }.bind(this),
    
            onFailure: function(transport) {
                this.world.alert('failed fetching url ' + url);
                this[optModelVariable] = "resource unavailable";
                this.changed("get" + optModelVariable);
            }.bind(this)
            // FIXME: on exception
        };
        new NetRequest(options).evalJS(false).get(url);
    },
    
    save: function(filename, content, optModelVariable) {
	var url = this.resourceURL(filename);
        // retrieve the the contents of the url and save in the indicated model variable
        console.log('saving url ' + url);
        var options =  {
            onSuccess: function(transport) {
		if (optModelVariable !== undefined) {
                    this[optModelVariable] = transport.status;
                    this.changed("get" + optModelVariable);
		}
            }.bind(this),
            onFailure: function(transport) {
		if (transport.status == 401) { // reauthenticate
		    this.world.alert("authentication required for PUT %s", url);
		} else {
                    this.world.alert("%s: failure %s url %s", transport, transport.status, url);
		}
            }.bind(this)
        };

        new NetRequest(options).put(url, content);
    },

    deleteResource: function(filename, optModelVariable) {
	var url = this.resourceURL(filename);
        // retrieve the the contents of the url and save in the indicated model variable
        console.log('deleting url ' + url);
        var options =  {
            onSuccess: function(transport) {
                // FIXME: the content may indicate that we failed to delete!
                // this[optModelVariable] = transport.status;
		if (optModelVariable !== undefined) {
                    this.changed("get" + optModelVariable);
                    console.log('success deleting ' + url);
		}
            }.bind(this),
	    
            onFailure: function(transport) {
                this.world.alert('failed deleting with response ' + transport.responseText);
            }.bind(this)
    
        };
        new NetRequest(options).remove(url);
    },

    // FIXME handle object argument
    // FIXME this doesn't abstract over the actual properties (only href is extracte)
    propfind: function(url, depth, xpQueryString, optModelVariable) {
        // find the properties given the url and save the results of the indicated query into the model variable
        if (depth != 0 && depth != 1) depth = 'infinity';

        var options = {
            contentType: 'text/xml',
            requestHeaders: { "Depth": depth },
    
            onFailure: function(transport) {
		if (transport.status == 401) { // reauthenticate
		    this.world.alert("authentication required for PROPFIND %s", url);
		} else {
                    this.world.alert("%s: failure %s url %s", transport, transport.status, url);
		}
            }.bind(this),
    
            onSuccess: function(transport) {
                // console.log('propfind received %s', Exporter.nodeToString(transport.responseXML));
                var result = Query.evaluate(transport.responseXML.documentElement, xpQueryString);
		if (optModelVariable !== undefined) {
		    this[optModelVariable] = result.map(function(raw) { 
			return new Resource(url, raw); 
		    });
                    this.changed("get" + optModelVariable);
		}
            }.bind(this)
        };
        
        new NetRequest(options).propfind(url);
    },


    getCurrentResourceContents: function() {
        return this.CurrentResourceContents || "";
    },
    
    setCurrentResourceContents: function(contents) {
	this.CurrentResourceContents = contents;
    },

    setCurrentResource: function(name) {
        if (!name) 
	    return;
        this.CurrentResource = name;
        console.log("current resource set to %s", name);
	
        // initialize getting the resource contents
        this.fetch(this.CurrentResource, "CurrentResourceContents");
    },

    resourceURL: function(resource) {
        if (!resource) return this.protocol + "://" + this.host;
        else return "%s://%s%s%s".format(this.protocol, this.host, 
					 resource.startsWith('/') ? "": "/", 
					 resource);
    }

});


WebStore.subclass('FileBrowser', {

    documentation: "A model for a paned file browser",

    initialize: function($super, host, path) {
	$super(host, path);
        this.DirectoryList = [ this.path ];
        this.CurrentDirectory = null;
        this.CurrentDirectoryContents = null; // :Resource[]
        this.LastWriteStatus = 0;
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
        segments.splice(-2);
        var parent = segments.join("/") + "/";
	
        // add the parent of the current directory to the DirectoryList if it's not there?	
	if (this.DirectoryList.indexOf(parent) < 0)  {
	    // a hack to add the parent dir to enable navigation, just in case.
	    this.DirectoryList.push(parent);
	    this.changed('getDirectoryList'); // this may set CurrentDirectory to null so assign to it later here
	}

        this.CurrentDirectory = name;
        this.changed('getCurrentDirectory');

        console.log('host %s, dir %s name %s', this.host, this.CurrentDirectory, name);
        // initialize getting the contents
        this.propfind(this.currentDirectoryURL(), 1, "/D:multistatus/D:response", "CurrentDirectoryContents");
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

    setCurrentResource: function($super, name) {
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
	    $super(name);
	}
    },
		
    currentDirectoryURL: function() {
        return "%s://%s%s%s".format(this.protocol,
				    this.host, 
				    this.CurrentDirectory.startsWith('/') ? "": "/", 
				    this.CurrentDirectory);
    },
    
    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['leftPane', ListPane, new Rectangle(0, 0, 0.5, 0.6)],
            ['rightPane', ListPane, new Rectangle(0.5, 0, 0.5, 0.6)],
            ['bottomPane', TextPane, new Rectangle(0, 0.6, 1, 0.4)]
        ]);
        panel.leftPane.connectModel({model: this, 
				     getList: "getDirectoryList",
				     setSelection: "setCurrentDirectory", 
				     getSelection: "getCurrentDirectory"});
        var m = panel.rightPane;
        m.connectModel({model: this, getList: "getCurrentDirectoryContents", setSelection: "setCurrentResource", 
			getMenu: "getFileMenu"});
        var oldpress = m.innerMorph().onKeyPress;
        m.innerMorph().onKeyPress = function(evt) {
            if (evt.getKeyCode() == Event.KEY_BACKSPACE) { // Replace the selection after checking for type-ahead
		
		var toDelete  = this.itemList[this.selectedLineNo()];
                var result = this.world().confirm("delete resource " + model.resourceURL(toDelete),
		    function(result) {
			if (result) {
			    model.deleteResource(toDelete, "CurrentDirectoryContents");
			    model.setCurrentDirectory(model.setCurrentDirectory());
			} else console.log("cancelled deletion of " + toDelete);
		    });
                evt.stop();
            } else oldpress.call(this, evt);
        };

        m = panel.bottomPane;
        m.connectModel({model: this, getText: "getCurrentResourceContents", setText: "setCurrentResourceContents"});

        var model = this;
        
        m.innerMorph().processCommandKeys = function(key) {
            if (key == 's') {
                if (model.CurrentResourceContents.length > TextMorph.prototype.maxSafeSize) {
                    this.world().alert("not saving file, size " + model.CurrentResourceContents.length 
                        + " > " + TextMorph.prototype.maxSafeSize + ", too large");
                } else {
                    model.setCurrentResourceContents(this.textString);
                    model.save(model.CurrentResource, this.textString, "LastWriteStatus");
                }
                return true;
            } else {
                return TextMorph.prototype.processCommandKeys.call(this, key);
            }
        }
        return panel;
    },
        
    getFileMenu: function() {
	var items = [];
	var fileName = this.CurrentResource;
	if (fileName) {
	    var contents = this.getCurrentResourceContents();
	    console.log("fileName = " + fileName + "; contents.length = " + contents.length);
            if (contents && contents.length > 0) {
		items.push(['open a changeList browser', function(evt) {
                    var changeList = new FileParser(fileName, contents);
		    new ChangeListBrowser(fileName, contents, changeList).openIn(this.world(), evt.mousePoint); }]);
	    }
	    
	    items.push(['edit in separate window', function(evt) {
		var textEdit = TextPane(new Rectangle(0, 0, 500, 200), "Fetching " + fileName + "...").innerMorph();
		var webStore = new WebStore();
		
		textEdit.connectModel({model: webStore, getText: "getCurrentResourceContents"});

		textEdit.processCommandKeys = function(key) {
		    if (key == 's') {
			if (webStore.CurrentResourceContents.length > TextMorph.prototype.maxSafeSize) {
			    this.world().alert("not saving file, size " + webStore.CurrentResourceContents.length 
					       + " > " + TextMorph.prototype.maxSafeSize + ", too large");
			} else {
			    webStore.CurrentResourceContents = this.textString;
			    webStore.save(webStore.CurrentResource, this.textString, "LastWriteStatus");
			}
			return true;
		    } else {
			return TextMorph.prototype.processCommandKeys.call(this, key);
		    }
		}
		
		webStore.setCurrentResource(fileName);
		this.world().addFramedMorph(textEdit, fileName, evt.mousePoint);
	    }]);
	    
	    items.push(["get WebDAV info", function(evt) {
		var infoPane = TextPane(new Rectangle(0, 0, 500, 200), "");
		infoPane.innerMorph().acceptInput = false;
		var store = new WebStore();
		store.getProperties = function() {
		    if (this.Properties instanceof Array) 
			return this.Properties[0].toMarkupString();
		    else
			return "fetching properties for " + fileName;
		};
		infoPane.innerMorph().connectModel({model: store, getText: "getProperties"});
		store.propfind(store.resourceURL(fileName), 1, "/D:multistatus/D:response", "Properties");
		this.world().addFramedMorph(infoPane, fileName, evt.mousePoint);
		
	    }]);
	}
	return items; 
    },

    openIn: function(world, loc) {
        if (!loc) loc = world.bounds().center();
        console.log('opening web store at %s', loc);
        var panel = this.buildView(pt(400, 300));
        world.addFramedMorph(panel, "Directory Browser on " + this.host, loc);
        // this.addCredentialDialog(panel);
        this.changed('getDirectoryList');
    }

});  

console.log('loaded Storage.js');

