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

/**
 * @class Resource
 */ 

Object.subclass('Resource', {

    initialize: function(rawNode) {
        this.href = Query.evaluate(rawNode, 'D:href')[0].textContent;
    },

    toString: function() {
        return this.href;
    },
    
    name: function() {
        return decodeURIComponent(this.href);
        /*
        var segments = this.href.split('/');
        if (this.href.endsWith('/')) {
            return segments.splice(segments.length - 2, 2).join('/');
        } else {
            return segments[segments.length -1];
        }
        */
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
	if (arguments.length == 1) { // if called with no arguments
            path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('index.xhtml'));
            if (path == "") path = "/";
	    host = window.location.hostname;
	}

        this.host = host;
        this.path = path;
        this.protocol = "http"; // can be something else...

        this.DirectoryList = [ path ];
        this.CurrentDirectory = null;
        this.CurrentDirectoryContents = null; // :Resource[]
        this.CurrentResource =  null;
        this.CurrentResourceContents = "";
        this.lastWriteStatus = 0;
    },

    // basic protocol methods:
    fetch: function(url, optModelVariable) {
        // retrieve the the contents of the url and save in the indicated model variable
        var store = this;
        var options =  {
            onSuccess: function(transport) {
                store[optModelVariable] = transport.responseText;
                store.changed("get" + optModelVariable);
            },
    
            onFailure: function(transport) {
                WorldMorph.current().alert('failed fetching url ' + url);
                store[optModelVariable] = "resource unavailable";
                store.changed("get" + optModelVariable);
            }
            // FIXME: on exception
        };
        new NetRequest(options).evalJS(false).get(url);
    },
    
    saveAs: function(name, content) {
        console.log('saving content %s', content);
        this.save("%s://%s%s%s".format(this.protocol, this.host, this.path, name), content, "LastWriteStatus");
    },
    
    save: function(url, content, optModelVariable) {
        // retrieve the the contents of the url and save in the indicated model variable
        console.log('saving url ' + url);
        var store = this;
        var options =  {
            onSuccess: function(transport) {
		if (optModelVariable !== undefined) {
                    store[optModelVariable] = transport.status;
                    store.changed("get" + optModelVariable);
		}
            },
            onFailure: function(transport) {
		if (transport.status == 401) { // reauthenticate
		    WorldMorph.current().alert("authentication required for PUT %s", url);
		} else {
                    WorldMorph.current().alert("%s: failure %s url %s", transport, transport.status, url);
		}
            }
        };

        new NetRequest(options).put(url, content);
    },

    deleteResource: function(url, optModelVariable) {
        // retrieve the the contents of the url and save in the indicated model variable
        console.log('deleting url ' + url);
        var store = this;
        var options =  {
            onSuccess: function(transport) {
                // FIXME: the content may indicate that we failed to delete!
                // store[optModelVariable] = transport.status;
		if (optModelVariable !== undefined) {
                    store.changed("get" + optModelVariable);
                    console.log('success deleting:  ' + (transport.responseXML || transport.responseText));
		}
            },
	    
            onFailure: function(transport) {
                WorldMorph.current().alert('failed deleting with response ' + transport.responseText);
            }
    
        };
        new NetRequest(options).remove(url);
    },

    // FIXME handle object argument
    propfind: function(url, depth, xpQueryString, optModelVariable, resultType) {
        // find the properties given the url and save the results of the indicated query into the model variable
        if (depth != 0 && depth != 1) depth = 'infinity';

        var store = this;
        var options = {
            contentType: 'text/xml',
            requestHeaders: { "Depth": depth },
    
            onFailure: function(transport) {
		if (transport.status == 401) { // reauthenticate
		    WorldMorph.current().alert("authentication required for PROPFIND %s", url);
		} else {
                    WorldMorph.current().alert("%s: failure %s url %s", transport, transport.status, url);
		}
            },
    
            onSuccess: function(transport) {
                console.log('propfind received %s', 
                    Exporter.nodeToString(transport.responseXML) || transport.responseText);
                if (!transport.responseXML) return; // FIXME: report problem

                var result = Query.evaluate(transport.responseXML.documentElement, xpQueryString);
		if (optModelVariable !== undefined) {
                    if (!resultType) { 
			store[optModelVariable] = result;
                    } else { 
			store[optModelVariable] = result.map(function(r) { return new Resource(r); });
                    }
                    store.changed("get" + optModelVariable);
		}
            }.logErrors('onSuccess')
        };
        
        new NetRequest(options).propfind(url);
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
        this.propfind(this.currentDirectoryURL(), 1, "/D:multistatus/D:response", "CurrentDirectoryContents", Resource);
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
        if (name) {
            console.log('name is %s', name);
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
                this.CurrentResource = name;
                console.log('current resource set to %s', this.CurrentResource);

                // initialize getting the resource contents
                this.fetch(this.currentResourceURL(), "CurrentResourceContents");
            }
        }
    },
    
    currentResourceURL: function() {
        if (!this.CurrentResource) return this.protocol + "://" + this.host;
        else return "%s://%s%s%s".format(this.protocol, this.host, 
                    this.CurrentResource.startsWith('/') ? "": "/", 
                    this.CurrentResource);
    },
    
    currentDirectoryURL: function() {
        return "%s://%s%s%s".format(this.protocol,
				    this.host, 
				    this.CurrentDirectory.startsWith('/') ? "": "/", 
				    this.CurrentDirectory);
    },
    
    getCurrentResourceContents: function() {
        return this.CurrentResourceContents || "";
    },
    
    setCurrentResourceContents: function(contents) {
        console.log('TODO: set contents to %s', contents);
    },
    
    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['leftPane', ListPane, new Rectangle(0, 0, 0.5, 0.6)],
            ['rightPane', ListPane, new Rectangle(0.5, 0, 0.5, 0.6)],
            ['bottomPane', TextPane, new Rectangle(0, 0.6, 1, 0.4)]
        ]);
        panel.leftPane.connectModel({model: this, getList: "getDirectoryList",
				     setSelection: "setCurrentDirectory", 
				     getSelection: "getCurrentDirectory"});
        var m = panel.rightPane;
        m.connectModel({model: this, getList: "getCurrentDirectoryContents", setSelection: "setCurrentResource"});
        var oldpress = m.innerMorph().onKeyPress;
        m.innerMorph().onKeyPress = function(evt) {
            if (evt.getKeyCode() == Event.KEY_BACKSPACE) { // Replace the selection after checking for type-ahead
                var result = this.world().confirm("delete resource " + this.itemList[this.selectedLineNo()]);
                evt.stop();
                if (result) {
                    model.deleteResource(this.itemList[this.selectedLineNo()], 
                                         "CurrentDirectoryContents");
                }
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
                    model.CurrentResourceContents = this.textString;
                    model.save(model.currentResourceURL(), this.textString, "LastWriteStatus");
                }
                return true;
            } else {
                return TextMorph.prototype.processCommandKeys.call(this, key);
            }
        }
        return panel;
    },
        
    openIn: function(world, loc) {
        if (!loc) loc = world.bounds().center();
        console.log('opening web store at %s', loc);
        var panel = this.buildView(pt(400, 300));
        world.addMorphAt(new WindowMorph(panel, "Directory Browser on " + this.host), loc);
        // this.addCredentialDialog(panel);
        this.changed('getDirectoryList');
    }

});  

console.log('loaded Storage.js');

