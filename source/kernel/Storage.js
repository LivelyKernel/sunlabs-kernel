/*
 * Copyright � 2006-2007 Sun Microsystems, Inc.
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
 * @class WebStore: Network-based storage
 */ 

Resource = Class.create();

Object.extend(Resource.prototype, {
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


var WebStore = Class.extend(Model);

Object.extend(WebStore.prototype, {
    maxFileSize: 3000,

    initialize: function(host, path) {
        WebStore.superClass.initialize.call(this);
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
		if (!resultType) 
                    store[modelVariable] = result;
		else 
		    store[modelVariable] = result.map(function(r) { 
			HostClass.becomeInstance(r, resultType); 
			r.become(); 
			return r;
		    });
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
	if (!name) 
	    return;

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
        return (this.CurrentResourceContents || "").truncate(this.maxFileSize);
    },
    
    setCurrentResourceContents: function(contents) {
        console.log('TODO: set contents to %s', contents);
    },
    
    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['leftPane', ListPane, Rectangle(0, 0, 0.5, 0.6)],
            ['rightPane', ListPane, Rectangle(0.5, 0, 0.5, 0.6)],
            ['bottomPane', TextPane, Rectangle(0, 0.6, 1, 0.4)]
        ]);
        var m = panel.getNamedMorph("leftPane");
        m.connectModel({model: this, getList: "getDirectoryList", setSelection: "setCurrentDirectory", 
			getSelection: "getCurrentDirectory"});
        m = panel.getNamedMorph("rightPane");
        m.connectModel({model: this, getList: "getCurrentDirectoryContents", setSelection: "setCurrentResource"});
        m = panel.getNamedMorph("bottomPane");
        m.connectModel({model: this, getText: "getCurrentResourceContents", setText: "setCurrentResourceContents"});

        var model = this;
        
        m.innerMorph().processCommandKeys = function(key) {
            if (key == 's') {
		if (model.CurrentResourceContents.length > model.maxFileSize) {
		    this.world().alert("not saving file, size " + model.CurrentResourceContents.length 
				       + " > " + model.maxFileSize + ", too large");
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
    
    addCredentialDialog: function(panel) {
        (new Credential()).openIn(panel.world(), panel.worldPoint(panel.bounds().topLeft()).addXY(30, 20));
    },
    
    openIn: function(world, location) {
        console.log('opening web store in %s', location);
        var panel = this.buildView(pt(400,300));
        world.addMorphAt(WindowMorph(panel, "Directory Browser on " + this.host), location);
        // this.addCredentialDialog(panel);
        this.changed('getDirectoryList');
    }

});  

/**
 * @class Credential
 */ 

var Credential = Class.extend(Model);

Object.extend(Credential.prototype, {
    userName: "",
    password: "",
    status: "active",

    setUserName: function(string) {
        console.log('user name ' + string);
        this.userName = string;
    },

    setPassword: function(string) {
        console.log('password ' + string);
        this.password = string;
    },

    setCancelValue: function(arg) {
        this.status = "cancel";
        this.changed('getOKValue');
        this.changed('shouldDisplayPanel');
    },

    setOKValue: function(arg) {
        this.status = "ok";
        this.changed('getCancelValue');
        this.changed('shouldDisplayPanel');
    },

    getCancelValue: function(arg) {
        return this.status == "cancel";
    },

    getOKValue: function(arg) {
        return this.status == "ok";
    },

    shouldDisplayPanel: function(arg) {
        return this.status == 'active';
    },

    buildView: function() {
        var extent = pt(300, 160);
        var panel = PanelMorph(extent);
        panel.shape.roundEdgesBy(5);
        panel.setFill(StipplePattern.create(Color.white, 3, Color.blue.lighter(5), 1));

        panel.setBorderWidth(2);
        const height = 20;
        var y = height;

        panel.addMorph(TextMorph(panel.shape.bounds().insetBy(height).withHeight(height), 'Authorization').beLabel());

        y += 30;
        panel.addMorph(TextMorph(Rectangle(30, y, 80, height), 'User name').beLabel());

        var m = panel.addMorph(TextMorph(Rectangle(150, y, 100, height)).beInputLine());
        m.connectModel({model: this, setText: "setUserName"});

        m.requestKeyboardFocus(WorldMorph.current().firstHand()); //??
        m.setNullSelectionAt(0);

        y+= 30;
        panel.addMorph(TextMorph(Rectangle(30, y, 80, height), 'Password').beLabel());
        m = panel.addMorph(TextMorph(Rectangle(150, y, 100, height)).beInputLine());
        m.connectModel({model: this, setText: "setPassword"});

        y+= 40;
        m = panel.addMorph(ButtonMorph(Rectangle(80, y, 50, height)));
        m.addMorph(TextMorph(m.shape.bounds(), 'OK').beLabel());
        m.setToggle(true);
        m.connectModel({model: this, getValue: "getOKValue", setValue: "setOKValue"});

        m = panel.addMorph(ButtonMorph(Rectangle(140, y, 50, height)));
        m.addMorph(TextMorph(m.shape.bounds(), "Cancel").beLabel());
        m.setToggle(true);
        m.connectModel({model: this, getValue: "getCancelValue", setValue: "setCancelValue"});

        panel.connectModel({model: this, getVisible: "shouldDisplayPanel"});
        return panel;

    },

    openIn: function(world, location) {
        console.log('opening credential dialog in %s', location);
        world.addMorphAt(this.buildView(), location);
        //this.changed('getDirectoryList');
    }

});

console.log('loaded Storage.js');

