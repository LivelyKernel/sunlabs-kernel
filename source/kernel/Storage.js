/*
 * Copyright © 2006-2007 Sun Microsystems, Inc.
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

Resource = Class.create({

    initialize: function(href) {
        this.href = href;
    },

    become: function() {
        this.href = Query.evaluate(this, 'D:href')[0].textContent;
    },

    toString: function() {
        return this.href;
    },
    
    name: function() {
        return this.href;
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
 * @class WebStore: Network-based storage
 */ 

var WebStore = Class.extend(Model);

Object.extend(WebStore, {
    defaultStore: null,
    onCurrentLocation: function() {
        var path = location.pathname.substring(0, location.pathname.lastIndexOf('index.xhtml'));
	if (path == "") 
		path = "/";
        return new WebStore(location.hostname, path);
    }

});

Object.extend(WebStore.prototype, {

    initialize: function(host, path) {
        WebStore.superclass.initialize.call(this);
        this.host = host;
        this.path = path;

        this.DirectoryList = [ path ];
        this.CurrentDirectory = null;
        this.CurrentDirectoryContents = null; // :Resource[]
        this.CurrentResource =  null;
        this.CurrentResourceContents = "";
        this.lastWriteStatus = 0;
    },

    // basic protocol methods:

    fetch: function(url, modelVariable) {
        // retrieve the the contents of the url and save in the indicated model variable
        var store = this;
        var options =  {
            method: 'GET',
            contentType: 'text/xml',

            onSuccess: function(transport) {
                store[modelVariable] = transport.responseText;
                store.changed("get" + modelVariable);
            },
    
            onFailure: function(transport) {
                WorldMorph.current().alert('failed fetching url ' + url);
                store[modelVariable] = "resource unavailable";
                store.changed("get" + modelVariable);
            }
            // FIXME: on exception

        };

        new NetRequest(url, options);
    },

    saveAs: function(name, content) {
        console.log('saving content %s', content);
        this.save("http://%1/%2/%3".format(this.host, this.path, name), content, "LastWriteStatus");
    },

    save: function(url, content, modelVariable) {
        // retrieve the the contents of the url and save in the indicated model variable
        console.log('saving url ' + url);
        var store = this;
        var options =  {
            method: 'PUT',
            body: content,
            contentType: 'text/xml',
    
            onSuccess: function(transport) {
                store[modelVariable] = transport.status;
                store.changed("get" + modelVariable);
            },
    
            onFailure: function(transport) {
                WorldMorph.current().alert('failed saving with response ' + transport.responseText);
                //store[modelVariable] = transport.status;
                //store.changed(modelVariable);
            }
    
        };

        new NetRequest(url, options);
    },


    deleteResource: function(url, modelVariable) {
        // retrieve the the contents of the url and save in the indicated model variable
        console.log('deleting url ' + url);
        var store = this;
        var options =  {
            method: 'DELETE',
            contentType: 'text/xml',
    
            onSuccess: function(transport) {
		// FIXME: the content may indicate that we failed to delete!
                //store[modelVariable] = transport.status;
                store.changed("get" + modelVariable);
		console.log('success deleting:  ' + (transport.responseXML || transport.responseText));
            },
    
            onFailure: function(transport) {
                WorldMorph.current().alert('failed deleting with response ' + transport.responseText);
            }
    
        };

        new NetRequest(url, options);
    },


    // FIXME handle object argument
    propfind: function(url, depth, xpQueryString, modelVariable, resultType) {
        // find the properties given the url and save the results of the indicated query into the model variable
        if (depth != 0 && depth != 1) depth = 'infinity';

        var store = this;
        var options = {
            method: 'PROPFIND', 
            contentType: 'text/xml',
            requestHeaders: { "Depth": depth },
    
            onFailure: function(transport) {
                WorldMorph.current().alert('%1: failure %2 url %3'.format(transport, transport.status, url));
            },
    
            onSuccess: function(transport) {
                console.log('propfind received %s', 
                    Exporter.nodeToString(transport.responseXML) || transport.responseText);
                var result = Query.evaluate(transport.responseXML.documentElement, xpQueryString);
                if (!resultType) { 
                    store[modelVariable] = result;
                } else { 
                    store[modelVariable] = result.map(function(r) { 
                        HostClass.becomeInstance(r, resultType); 
                        r.become(); 
                        return r;
                   })
                }
                store.changed("get" + modelVariable);
            }.logErrors('onSuccess')
        };
        
        new NetRequest(url, options);
    },
    
    getDirectoryList: function() {
        return this.DirectoryList;
    },

    getCurrentDirectory: function() {
        return this.CurrentDirectory;
    },

    setCurrentDirectory: function(name) {
        if (!name) return;

        // add the parent of the current directory to the DirectoryList if it's not there?
        var segments = name.split("/");
        segments.splice(segments.length - 2, 2);
        var parent = segments.join("/") + "/";
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
        return (this.CurrentDirectoryContents || []).invoke("name");
    },
    
    setCurrentResource: function(name) {
        if (name) {
            console.log('name is %s', name);
            if (name.endsWith('/')) { // directory, enter it!
                // only entries with trailing slash i.e., directories
                this.DirectoryList = 
                    this.getCurrentDirectoryContents().filter(function(res) { return res.endsWith('/')});
                this.changed("getDirectoryList");
                this.CurrentDirectory = name;
                this.changed('getCurrentDirectory');
                console.log('entering directory %s now', this.CurrentDirectory);
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
        if (!this.CurrentResource) return "http://" + this.host;
        else return "http://%1%2%3".format(this.host, this.CurrentResource.startsWith('/') ? "": "/", this.CurrentResource);
    },

    currentDirectoryURL: function() {
        return "http://%1%2%3".format(this.host, this.CurrentDirectory.startsWith('/') ? "": "/", this.CurrentDirectory);
    },
    
    getCurrentResourceContents: function() {
        return (this.CurrentResourceContents || "").truncate(TextMorph.prototype.maxSafeSize);
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
        var m = panel.getNamedMorph("leftPane");
        m.connectModel({model: this, getList: "getDirectoryList", setSelection: "setCurrentDirectory", 
            getSelection: "getCurrentDirectory"});
        m = panel.getNamedMorph("rightPane");
        m.connectModel({model: this, getList: "getCurrentDirectoryContents", setSelection: "setCurrentResource"});
	var oldpress = m.innerMorph().onKeyPress;
	m.innerMorph().onKeyPress = function(evt) {
	    if (evt.keyCode == Event.KEY_BACKSPACE) { // Replace the selection after checking for type-ahead
		var result = this.world().confirm("delete file " + this.itemList[this.selectedLineNo()]);
		evt.stop();
		if (result) {
		    model.deleteResource(this.itemList[this.selectedLineNo()], "CurrentDirectoryContents");
		}
	    } else oldpress.call(this, evt);
	};
	

        m = panel.getNamedMorph("bottomPane");
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
        world.addMorphAt(WindowMorph(panel, "Directory Browser on " + this.host), loc);
        // this.addCredentialDialog(panel);
        this.changed('getDirectoryList');
    }

});  

console.log('loaded Storage.js');
