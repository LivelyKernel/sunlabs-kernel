/**
 * Storage.js.  Storage system implementation for the Flair system.
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
                store[modelVariable] = "resource unavailable";
                store.changed('get' + modelVariable);
            }
            // FIXME: on exception

        });

        new Ajax.Request(url, options);
    },

    saveAs: function(name, content) {
	console.log('saving content %s', content);
	this.save('http://' + this.host + '/' +  this.path + "/" + name, content, 'LastWriteStatus');
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
                console.log('failed with response %s', transport.responseText);
                console.log('authenticate %s',transport.getResponseHeader('WWW-Authenticate'));
                store[modelVariable] = transport.status;
                store.changed('get' + modelVariable);
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
    
            onSuccess: function(transport) {
                try {
                    console.log('propfind received %s', 
                    NetRequest.documentToString(transport.responseXML) || transport.responseText);
    
                    var result = transport.responseXML.documentElement;
    
                    store[modelVariable] = Query.evaluate(result, xpQueryString);
                    store.changed('get' + modelVariable);
                    // console.info('got listing %s', store[modelVariable].pluck('textContent'));
                } catch (e) {
                    console.log('exception %s in %s', e, Function.callStack());
                }
            } 
        });
        
        new Ajax.Request(url, options);
    },
    
    getDirectoryList: function() {
        return [ this.path ];
    },

    setCurrentDirectory: function(name) {
        this.CurrentDirectory = name;
        if (this.CurrentDirectory != null) {
            var url = "http://" + this.host + "/" + this.CurrentDirectory;
            // initialize getting the contents
           this.propfind(url, 1, '/D:multistatus/D:response/D:href', 'CurrentDirectoryContents');
        }
    },
    
    getCurrentDirectoryContents: function() {
        return (this.CurrentDirectoryContents || []).map(function(n) { 
            // strip the leading slashes b/c ListMorph doesn't like them???
            var txt = n.textContent;
            if (txt) {
                if (txt.startsWith('/')) { 
                    return txt.substring(1);
                }
            }
           return txt;
        });
    },
    
    setCurrentResource: function(name) {
        this.currentResource = name;
        if (this.currentResource) {
            // initialize getting the resource contents
            this.fetch(this.currentResourceURL(), 'CurrentResourceContents');
        }
    },
    
    currentResourceURL: function() {
        return 'http://' + this.host + '/' +  this.currentResource;
    },

    getCurrentResourceContents: function() {
        return this.CurrentResourceContents;
    },
    
    setCurrentResourceContents: function(contents) {
        console.log('TODO: set contents to %s', contents);
    },
    
    buildView: function(extent) {
        var panel = PanelMorph(extent, "rect");
        panel.setFill(Color.blue.lighter().lighter());
        panel.setBorderWidth(2);
        panel.model = this;
    
        panel.addMorph(m = ListPane(Rectangle(0,0,200,150)));
        m.connectModel({model: this, getList: "getDirectoryList", setSelection: "setCurrentDirectory"});
        panel.addMorph(m = ListPane(Rectangle(200,0,200,150)));
        m.connectModel({model: this, getList: "getCurrentDirectoryContents", setSelection: "setCurrentResource"});
        panel.addMorph(m = TextPane(Rectangle(0,150,400,150)));

        m.connectModel({model: this, getText: "getCurrentResourceContents", setText: "setCurrentResourceContents"});

        var model = this;
        
        m.innerMorph().processCommandKeys = function(key) {
            if (key == 's') {
                console.log('in %s', this.owner());
                // model.addCredentialDialog(this.world());
                model.save('http://' + model.host + '/' +  model.currentResource, 
                this.textString, 'LastWriteStatus');
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
        //this.addCredentialDialog(panel);
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

        panel.addMorph(TextMorph.makeLabel(panel.shape.bounds().insetBy(height).withHeight(height), 'Authorization'));

        y += 30;
        panel.addMorph(TextMorph.makeLabel(Rectangle(30, y, 80, height), 'User name'));

        var m = panel.addMorph(TextMorph.makeInputLine(Rectangle(150, y, 100, height)));
        m.connectModel({model: this, setText: "setUserName"});

        m.requestKeyboardFocus(WorldMorph.current().firstHand()); //??
        m.setNullSelectionAt(0);

        y+= 30;
        panel.addMorph(TextMorph.makeLabel(Rectangle(30, y, 80, height), 'Password'));
        m = panel.addMorph(TextMorph.makeInputLine(Rectangle(150, y, 100, height)));
        m.connectModel({model: this, setText: "setPassword"});

        y+= 40;
        m = panel.addMorph(ButtonMorph(Rectangle(80, y, 50, height)));
        m.addMorph(TextMorph.makeLabel(m.shape.bounds(), 'OK'));
        m.setToggle(true);
        m.connectModel({model: this, getValue: "getOKValue", setValue: "setOKValue"});

        m = panel.addMorph(ButtonMorph(Rectangle(140, y, 50, height)));
        m.addMorph(TextMorph.makeLabel(m.shape.bounds(), 'Cancel'));
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

