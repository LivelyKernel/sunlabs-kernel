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
 * @class WebStore: Network-based storage
 */ 

var WebStore = Class.extend(Model);

Object.extend(WebStore.prototype, {
    
    initialize: function(host, path) {
        WebStore.superClass.initialize.call(this);
        this.host = host;
        this.path = path;

        this.DirectoryList = [ path ];
        this.CurrentDirectory = null;
        this.CurrentDirectoryContents = null;
        this.CurrentResource =  null;
        this.CurrentResourceContents = null;
        this.LastWriteStatus = 0;
    },

    // basic protocol methods:

    fetch: function(url, modelVariable) {
        // retrieve the the contents of the url and save in the indicated model variable
        console.log('fetching url ' + url);
        var store = this;
        var options = Object.derive(NetRequest.options, {
            method: 'GET',

            onSuccess: function(transport) {
                store[modelVariable] = transport.responseText;
                store.changed('get' + modelVariable);
            },
    
            onFailure: function(transport) {
                WorldMorph.current().alert('failed fetching url ' + url);
                store[modelVariable] = "resource unavailable";
                store.changed('get' + modelVariable);
            }
            // FIXME: on exception

        });

        new Ajax.Request(url, options);
    },

    saveAs: function(name, content) {
        console.log('saving content %s', content);
        this.save("http://%1/%2/%3".format(this.host, this.path, name), content, "LastWriteStatus");
    },

    save: function(url, content, modelVariable) {
        // retrieve the the contents of the url and save in the indicated model variable
        console.log('saving url ' + url);
        var store = this;
        var options = Object.derive(NetRequest.options, {
            method: 'PUT',
            body: content,
            
            onSuccess: function(transport) {
                store[modelVariable] = transport.status;
                store.changed('get' + modelVariable);
            },
    
            onFailure: function(transport) {
                WorldMorph.current().alert('failed saving with response ' + transport.responseText);
                console.log('failed with response %s', transport.responseText);
                //store[modelVariable] = transport.status;
                //store.changed('get' + modelVariable);
            }
        });

        new Ajax.Request(url, options);
    },

    // FIXME handle object argument
    propfind: function(url, depth, xpQueryString, modelVariable) {
        // find the properties given the url and save the results of the indicated query into the model variable
        if (depth != 0 && depth != 1) depth = 'infinity';

        var store = this;
        var options = Object.derive(NetRequest.options, {
            method: 'PROPFIND', 
            requestHeaders: { "Depth": depth },
    
            onFailure: function(transport) {
                WorldMorph.current().alert('%1: failure %2 url %3'.format(transport, transport.status, url));
            },

            onSuccess: function(transport) {
                console.log('propfind received %s', 
                    NetRequest.documentToString(transport.responseXML) || transport.responseText);

                var result = transport.responseXML.documentElement;

                store[modelVariable] = Query.evaluate(result, xpQueryString);
                store.changed('get' + modelVariable);
                // console.info('got listing %s', store[modelVariable].pluck('textContent'));
            }.logErrors('onSuccess')
        });
        
        new Ajax.Request(url, options);
    },
    
    getDirectoryList: function() {
        return this.DirectoryList;
    },

    setCurrentDirectory: function(name) {
        this.CurrentDirectory = name;
        if (this.CurrentDirectory != null) {
            var url = "http://%1%2%3".format(this.host, this.CurrentDirectory.endsWith('/') ? "": '/', this.CurrentDirectory);
            // initialize getting the contents
            this.propfind(url, 1, "/D:multistatus/D:response/D:href", "CurrentDirectoryContents");
        }
    },
    
    getCurrentDirectoryContents: function() {
        return (this.CurrentDirectoryContents || []).pluck("textContent");
    },
    
    setCurrentResource: function(name) {
        if (name) {
            if (name.endsWith('/')) { // directory, enter it!
                this.DirectoryList = this.getCurrentDirectoryContents();
                this.changed('getDirectoryList');
                this.CurrentDirectory = name;//.substring(0, name.length - 1);
                console.log('current directory %s now', this.CurrentDirectory);
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
        var path = this.CurrentResource;
        if (!path) { 
            path = "";
        } else if (path.startsWith('/')) {
            path = path.substring(1);
        }
        return "http://%1/%2".format(this.host, path);
    },
    
    getCurrentResourceContents: function() {
        return this.CurrentResourceContents;
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
        var m = panel.getNamedMorph('leftPane');
        m.connectModel({model: this, getList: "getDirectoryList", setSelection: "setCurrentDirectory"});
        m = panel.getNamedMorph('rightPane');
        m.connectModel({model: this, getList: "getCurrentDirectoryContents", setSelection: "setCurrentResource"});
        m = panel.getNamedMorph('bottomPane');
        m.connectModel({model: this, getText: "getCurrentResourceContents", setText: "setCurrentResourceContents"});

        var model = this;
        
        m.innerMorph().processCommandKeys = function(key) {
            if (key == 's') {
                console.log('in %s', this.owner());
                //model.addCredentialDialog(this.world());
                model.save(model.currentResourceURL(), this.textString, 'LastWriteStatus');
                return;
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

