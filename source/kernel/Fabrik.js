
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
 * Fabrik.js.  This file contains Fabrik   
 *
 * == List of classes == 
 * - Fabrik
 * - FabrikMorph
 * - FabrikComponent
 * - NewComponentModel
 * - PinMorph
 * - PinHandle
 * - ConnectorMorph
 * - Component
 * - TextComponent
 * - FunctionComponent
 * - ComponentBox
 * - PointSnapper
 * - FlowLayout
 */
 
 /**************************************************
  * Examples for interactive testing and exploring
  */
var Fabrik = {
    
    positionComponentRelativeToOther: function(comp, otherComp, relPos) {
        comp.panel.setPosition(otherComp.panel.getPosition().addPt(relPos));
    },

    addTextComponent: function(toComponent) {
         var c = new TextComponent();
         toComponent.plugin(c);
         return c;
    },

    addFunctionComponent: function(toComponent) {
        var c = new FunctionComponent();
        toComponent.plugin(c);
        return c;
    },

    addFunctionComponent2Inputs: function(toComponent) {
        var c = new FunctionComponent();
        c.addFieldAndPinHandle("Input2");
        c.formalModel.addObserver({onInput2Update: function(){
        	c.execute()}.bind(c)});
        toComponent.plugin(c);
        return c;
    },

    addTextListComponent: function(toComponent) {
        var c = new TextListComponent();
        toComponent.plugin(c);
        return c;
    },

    openComponentBox: function(world, loc) {
        if (!world) world = WorldMorph.current();
        var box = new ComponentBox();
        box.openIn(world, loc);
        return box;
    },

    openFabrikComponent: function(world, loc, extent, title) {
        if (!world) world = WorldMorph.current();
        if (!extent) extent = pt(400, 300);
        if (!loc) loc = pt(100, 100);
        if (!title) title = 'Fabrik Component';
        var c = new FabrikComponent(extent);
        FabrikComponent.current = c;
        c.viewTitle = title;
        c.openIn(world, loc);
        return c;
    },

    openFabrikComponentExample: function() {
        var f = this.openFabrikComponent();
        var c1 = this.addTextComponent(f);
        var c2 = this.addTextComponent(f);
        var c3 = this.addTextComponent(f);
        this.addTextComponent(f);
        this.addTextComponent(f);
        c1.setText("Hello World");
        c2.setText("Hallo Welt");
        c3.setText("Ola mundo");
        f.morph.automaticLayout();
        f.connectPins(c1.getPinHandle("Text"), c2.getPinHandle("Text"));
        f.connectPins(c2.getPinHandle("Text"), c3.getPinHandle("Text"))
        return f;
    },

    openFabrikTextListExample: function() {
        // the next variables are intentionally defined global
        f = this.openFabrikComponent();
        input = this.addFunctionComponent(f);
        input.setFunctionBody("return ['eins', 'zwei', 'drei']")
        list = this.addTextListComponent(f);
        out = this.addTextComponent(f);
        f.connectComponents(input, "Result", list, "List");
        f.connectComponents(list, "Selection", out, "Text");	
        f.morph.automaticLayout();
        return f;
    },
    
    openConnectorMorphExample: function() {
        var c = new ConnectorMorph();
        var m1 = new Morph(new Rectangle(100,100,10,10),"rect");
        var m2 = new Morph(new Rectangle(200,200, 10,10),"rect");
        world = WorldMorph.current();
        world.addMorph(c);
        world.addMorph(m1);
        world.addMorph(m2);

        c.model = NewComponentModel.instantiateNewClass();
        c.model.addField("StartHandle");
        c.model.addField("EndHandle");
        c.model.setStartHandle(m1);
        c.model.setEndHandle(m2);
        c.updateOnChangeInMorph(m1);
        c.updateOnChangeInMorph(m2);
        c.updateView();
        return c;
    },

    openFabrikFunctionComponentExample: function() {
        // the next variables are intentionally defined global
        var f = this.openFabrikComponent();
        var c1 = this.addTextComponent(f);
        var c2 = this.addTextComponent(f);
        var f1 = this.addFunctionComponent(f);
        c1.setText("");
        c2.setText("");

        f1.setFunctionBody("return 3 + 4");
        f.connectComponents(f1, "Result", c2, "Text");

        f.morph.automaticLayout();
        return f;
    },
    
    /*
     * Browser Example:
     *  - Todo: "prepared methods..."
     *  - added second input field to function manually
     * 
     */
    addConvenienceFunctions: function() {
        Global.allFabrikClassNames = function() {
            return ["FabrikMorph", "FabrikComponent", "NewComponentModel", "PinMorph", "PinHandle", "ConnectorMorph", 
                "Component",  "TextComponent", "FunctionComponent", "ComponentBox", "PointSnapper", "FlowLayout"]
        };
        Global.allClassNames = function() {
        	var classNames = [];
        	Class.withAllClassNames(Global, function(n) { n.startsWith('SVG') || classNames.push(n)});
        	return classNames;
        };
        Global.allMethodsFor = function(className) {
            if (className == null) return [];
            return Global[className].localFunctionNames().sort();
        };
        Global.getMethodStringFor = function(className, methodName) { 
        	try {
        		var func = Global[className].prototype[methodName];
        		if (func == null) return "no code";
        		var code = func.getOriginal().toString();
        		return code;
        	} catch(e) { return "no code" }
        };
    },
    
    openFabrikBrowserExample: function(world, loc) {
        this.addConvenienceFunctions();
        
        if (!loc) loc = pt(100, 100);
        var f = this.openFabrikComponent(world, loc, pt(750, 500), 'Fabrik Browser');

        var getClasses = this.addFunctionComponent(f);
    	getClasses.setFunctionBody('return allFabrikClassNames()');
        var getMethods = this.addFunctionComponent(f);
    	getMethods.setFunctionBody('return allMethodsFor(this.getInput())'); 

        var getSource = new FunctionComponent();
      	getSource.addFieldAndPinHandle("Input2");
    	getSource.formalModel.addObserver({onInput2Update: function() {
        	getSource.execute()}.bind(getSource)});
        f.plugin(getSource);	
    	getSource.setFunctionBody('return getMethodStringFor(this.getInput(), this.getInput2())'); 

    	var classList = this.addTextListComponent(f);
        var methodList = this.addTextListComponent(f);


        var methodSource = this.addTextComponent(f);

        f.connectComponents(getClasses, "Result", classList, "List");
     	f.connectComponents(classList, "Selection", getMethods, "Input");	
    	f.connectComponents(getMethods, "Result", methodList, "List");	

    	f.connectComponents(classList, 	"Selection", getSource, "Input");	
    	f.connectComponents(methodList, "Selection", getSource, "Input2");	

    	f.connectComponents(getSource, "Result", methodSource, "Text");	

        f.morph.automaticLayout();

        // some manual layout
        getClasses.panel.setPosition(pt(250,30));
        this.positionComponentRelativeToOther(classList, getClasses, pt(0, getClasses.panel.getExtent().y + 20));
        this.positionComponentRelativeToOther(getMethods, getClasses, pt(getClasses.panel.getExtent().x + 50, 0));
        this.positionComponentRelativeToOther(methodList, getMethods, pt(0, getMethods.panel.getExtent().y + 20));
        this.positionComponentRelativeToOther(methodSource, classList, pt(0, classList.panel.getExtent().y + 20));
        methodSource.panel.setExtent(pt(methodList.panel.getPosition().x - classList.panel.getPosition().x + classList.panel.getExtent().x, 200));
        this.positionComponentRelativeToOther(getSource, methodSource, pt(-1 * (getSource.panel.getExtent().x + 20), 0));

    	getClasses.execute();
        return f;
    },

    openCurrencyConverterExample: function(world, loc) {
        // the next variables are intentionally defined global
        var f = this.openFabrikComponent(world, loc, 'Currency Converter');

        var urlComp = this.addTextComponent(f);
        urlComp.setText("http://www.webservicex.net/CurrencyConvertor.asmx/ConversionRate?FromCurrency=USD&ToCurrency=EUR");
        var reqComp = this.addFunctionComponent(f);
        reqComp.setFunctionBody("new NetRequest().beSync().get('http://www.webservicex.net/CurrencyConvertor.asmx/ConversionRate?FromCurrency=USD&ToCurrency=EUR').getResponseXML().getElementsByTagName('double')[0].textContent;");
        // reqComp.setFunctionBody("");
        f.connectComponents(urlComp, "Text", reqComp, "Input");
        var currencyComp = this.addTextComponent(f);
        //f.connectComponents(reqComp, "Result", currencyComp, "Text");


        var currency1Comp = this.addTextComponent(f);
        var currency2Comp = this.addTextComponent(f);

        var fromToConvComp = this.addFunctionComponent2Inputs(f);
        fromToConvComp.setFunctionBody("return Number(this.getInput()) * Number(this.getInput2())");
        f.connectComponents(fromToConvComp, "Result", currency2Comp, "Text");

        var toFromConvComp = this.addFunctionComponent2Inputs(f);
        toFromConvComp.setFunctionBody("return 1/Number(this.getInput()) * Number(this.getInput2())");
        f.connectComponents(toFromConvComp, "Result", currency1Comp, "Text");

        currencyComp.setText("0");
        currency1Comp.setText("");
        currency2Comp.setText("");


        f.morph.automaticLayout();
        return f;
    },

    openFahrenheitCelsiusExample: function(world, loc) {
        if (!loc) loc = pt(100, 100);
        var f = this.openFabrikComponent(world, loc, pt(940,270), 'Celsius-Fahrenheit Converter');
        celsius = this.addTextComponent(f);
        celsius.setText("");

        var f1 = this.addFunctionComponent(f);
        f1.setFunctionBody("return this.getInput() * 9/5");


        var f2 = this.addFunctionComponent(f);
        f2.setFunctionBody("return this.getInput() + 32");

        var fahrenheit = this.addTextComponent(f);
        fahrenheit.setText("");

        var f3 = this.addFunctionComponent(f);
        //f4.addFieldAndPinHandle('Input');
        f3.setFunctionBody("return this.getInput() * 5/9");

        var f4 = this.addFunctionComponent(f);
        //f3.addFieldAndPinHandle('Input');
        f4.setFunctionBody("return this.getInput() - 32");

        f.connectComponents(celsius, "Text", f1, "Input");
        f.connectComponents(f1, "Result", f2, "Input");
        f.connectComponents(f2, "Result", fahrenheit, "Text");

        // f.connectComponents(fahrenheit, "Text", f3, "Input");
        // f.connectComponents(f3, "Result", f4, "Input");
        // f.connectComponents(f4, "Result", celsius, "Text");

        f.morph.automaticLayout();

        // some manual layouting
        f3.panel.setPosition(f1.panel.getPosition().addPt(pt(0,f1.panel.getExtent().y + 20)));
        f4.panel.setPosition(f2.panel.getPosition().addPt(pt(0,f2.panel.getExtent().y + 20)));
        celsius.panel.setPosition(celsius.panel.getPosition().addPt(pt(0,(celsius.panel.getExtent().y + 20) / 2)));
        fahrenheit.panel.setPosition(fahrenheit.panel.getPosition().addPt(pt(0,(fahrenheit.panel.getExtent().y + 20) / 2)));

        return f;
    },

    openFabrikFunctionComponentExample2: function() {
        // the next variables are intentionally defined global
        var f = this.openFabrikComponent();
        var c1 = this.addTextComponent(f);
        var c2 = this.addTextComponent(f);
        var f1 = this.addFunctionComponent(f);
        c1.setText("");
        c2.setText("");

        f1.setFunctionBody("return this.getInput() * this.getInput()");

        f.connectComponents(f1, "Result", c1, "Text");
        f.connectComponents(c2, "Text", f1, "Input");

        f.morph.automaticLayout();

        return f;
    }
};


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                        Fabrik implementation
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *    
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

Morph.subclass('FabrikMorph', {
    initialize: function($super, bounds) {
        return $super(bounds, "rect");
    },
    
    automaticLayout: function() {
        (new FlowLayout()).layoutElementsInMorph(this.fabrik.components, this)
    },
    
    setupForFabrik: function(fabrik){
         this.fabrik = fabrik;
         this.fabrik.components.each(function(ea) {this.addMorphForComponent(ea) }, this);
         this.fabrik.connectors.each(function(ea) {this.addMorph(ea.buildView())}, this);        
    },
    
    addMorph: function($super, morph) {
        // don't let loose ends lie around
        if (morph.pinHandle && morph.pinHandle.isFakeHandle) {
            // check for failed dropp...
            otherPinMorph = this.morphToGrabOrReceive({mousePoint:morph.worldPoint(pt(5,5))});
            if(otherPinMorph.isPinMorph) {
                return otherPinMorph.addMorph(morph) // let him do the job
            };  
            morph.pinHandle.connectors.first().remove();
            return morph.owner.removeMorph(morph);
        };
        // dropping components into the fabrik component...!
        if (morph.component) this.fabrik.plugin(morph.component);
        return $super(morph);
    }, 
    
    allPins: function(){
          return this.fabrik.components.inject([], function(allPins, ea) {
                  return allPins.concat(ea.pinHandles);
          });
    },
    
    allPinSnappPoints: function() {
        return this.allPins().collect(function(ea){
            return ea.morph.owner.worldPoint(ea.morph.bounds().center())});
    },
    
    addMorphForComponent: function(component) {
        if (component.morph) return; // Morph is already there... 
        this.addMorph(component.buildView());
    },
});
 
/*
 * The main Fabrik Component
 *  - contains other components and connections between them
 */
Widget.subclass('FabrikComponent', {

    defaultViewExtent: pt(750,500),
    defaultViewTitle: "FabrikComponent",

    initialize: function($super, viewExtent) {
        $super(null);
        this.components = [];
        this.connectors = [];
        this.viewExtent = viewExtent;
        return this;
    },
  
    buildView: function() {
        //console.log("buildView for " + this);
        this.panel = PanelMorph.makePanedPanel(this.viewExtent || this.defaultViewExtent,[            
            ['playfield', function(initialBounds){ return new FabrikMorph(initialBounds) },
                new Rectangle(0, 0, 1, 1)]
        ]);
        this.panel.fabrik = this;
        this.morph = this.panel.playfield;
        this.morph.setupForFabrik(this);
        return this.panel;
    },

    // can be called when this.morph does not exist, simply adds components and wires them
    plugin: function(component){
        if (!this.components.include(component)) {
            //console.log("plugin: "+component);
            this.components.push(component);
            component.fabrik = this; // remember me
            if(this.morph)
                this.morph.addMorphForComponent(component);
        } else {
            // what todo when the component is already there?
            console.log('FabrikComponent.plugin(): ' + component + 'was already plugged in.');
        };
    },

    pluginConnector: function(connector) {
        if(this.connectors.include(connector)) {
            console.log("Plugin connector failed: " + connector + " is already plugged in!");
            return;
        };        
        this.connectors.push(connector);
        connector.fabrik = this;
        
        if (this.morph) {
            this.morph.addMorph(connector.buildView());
            connector.updateView();
        };
        return connector;
    },

    connectPins: function(fromPinHandle, toPinHandle) {
        console.log("Fabrik>>connectPins(" + fromPinHandle + ", " + toPinHandle + ")");
        if(!fromPinHandle || !toPinHandle) {
            console.log("FabrikComponent.connectPins(): could not connect " + fromPinHandle + " and " + toPinHandle);
        };

        var con = fromPinHandle.connectTo(toPinHandle);
        //FIXME: alles ausmisten
        if (!con) throw new Error('CouldNotCreateNewConnection');
        
        this.pluginConnector(con);
        return con;
    },

    connectComponents: function(fromComponent, fromPinName, toComponent, toPinName){
        return this.connectPins(fromComponent.getPinHandle(fromPinName), toComponent.getPinHandle(toPinName));
    },

    removeConnector: function(connector) {
        if(this.connectors.include(connector)){
            this.connectors = this.connectors.reject(function(ea) {return ea === connector});
            this.morph.removeMorph(connector.morph);
        } else {
            console.log('FabrikComponent>>removeConnector: tried to remove connector, which is not there')
        }
    },

    // setup after the window is opened
    openIn: function($super, world, location) {
        //console.log(this + ">>openIn ");
        var result = $super(world, location);
        this.morph.openForDragAndDrop = true;
        // when the window is moved, the connectors are updated
        var self = this;
        result.changed = result.changed.wrap(function(proceed, varName, source) {
            self.connectors.each(function(ea){ ea.updateView() });
            return proceed();
        });
        return result;
    }
});

/* Fabrik Model */
PlainRecord.prototype.create({}).subclass("NewComponentModel", {
    
    initialize: function($super, spec, rawNode) {
        if (!rawNode) rawNode = {};
        $super(rawNode, spec);
        console.log("model created");
    },
    
    addField: function(fieldName, coercionSpec) {
        var spec = {}; spec[fieldName] = coercionSpec || {};
        this.constructor.addMethods(new Record.extendRecordClass(spec));
    },
    
    /*
        Deprecated code below. Remove those things!
    */
    addPin: function(pinName, coercionSpec) {
        this.addField(pinName, coercionSpec);
    },
    
    connectPins: function(myPinName, otherModel, otherModelPinName){
        var spec = {};
        spec[myPinName] = "=set" + otherModelPinName;
        this.addObserver(otherModel, spec);
    },
    
    connectPinsBidirectional: function(myPinName, otherModel, otherModelPinName){
        this.connectPins(myPinName, otherModel, otherModelPinName);
        otherModel.connectPins(otherModelPinName, this, myPinName);
    }
});

NewComponentModel.instantiateNewClass = function() {
    return new (NewComponentModel.subclass())();
};


/*
 * PinMorph, the graphical representation of a pin handle
 */
Morph.subclass('PinMorph', {
    
    initialize: function ($super){
        $super(new Rectangle( 0, 0, 15, 15), 'rect');
        this.suppressHandles = true; // no handles
        this.okToBeGrabbedBy = Functions.Null; // no dragging
       
        this.handlesMouseDown = Functions.True; // hack
        this.openForDragAndDrop = true;
        this.onMouseDown = this.onMouseDown.bind(this);
        this.isPinMorph = true;
    
        this.setupMorphStyle();
        
        return this;
    },
    
     /* Drag and Drop of Pin */        
    addMorph: function($super, morph) {
        console.log("dropping pin on other pin...");
        $super(morph); // to remove it out of the hand
        if (!morph.pinHandle) {
            // console.log("PinHandle does not accept dropping of "+ morph);
            WorldMorph.current().addMorph(morph); // I don't want any other morphs so go away
            morph.setPosition(pt(100,100));
            return;
        };
        // console.log("PinHandle accepts dropping "+ morph);
        //self.connectFromFakeHandle(morph.pinHandle);
        //FIXME: just for make things work...
        var fakePin = morph.pinHandle;
        fakePin.connectors.first().remove();
        this.pinHandle.fabrik().connectPins(fakePin.originPin, this.pinHandle);
        
        this.removeMorph(morph);
        this.updatePosition();
    },
    
    setupMorphStyle: function() {
        this.setFill(Color.green);
        this.setFillOpacity(0.5);
    },
    
    changed: function($super, aspect, value) {
        $super();
        if (aspect == "globalPosition" && this.snapper) 
            this.snapper.snap(value);
        this.updatePosition();
    },

    getLocalPinPosition: function() {
        return this.bounds().extent().scaleBy(0.5)
    },
    
    getGlobalPinPosition: function(){
        return this.getGlobalTransform().transformPoint(this.getLocalPinPosition());
    },

    // PinPosition relative to the Fabrik Morph
    getPinPosition: function() {
        return this.pinHandle.fabrik().morph.localize(this.getGlobalPinPosition())
    },

    updatePosition: function(evt){
        // console.log("update position" + this.getPosition());
        this.pinHandle.connectors.each(function(ea){
            ea.updateView();
        });
    },    

    // When PinHandleMorph is there, connect to its onMouseDown
    onMouseDown: function($super, evt) {
        if (this.pinHandle.isFakeHandle) return;
        var fakePin = this.pinHandle.createFakePinHandle();
        fakePin.buildView();
        fakePin.morph.setFill(Color.red); // change style to distinguish between real handles
        fakePin.morph.setExtent(pt(10,10));
        evt.hand.addMorph(fakePin.morph);
        fakePin.morph.setPosition(pt(0,0));
        fakePin.morph.startSnapping();
        
        //FIXME: just for make things work... connect redundant with createFakePinHandle()
        this.pinHandle.component.fabrik.connectPins(this.pinHandle, fakePin);
    },

    getHelpText: function() {
        return this.pinHandle.name;
    },
    
    acceptsDropping: function($super, evt) {
        return $super(evt)
    },
    
    getFakeConnectorMorph: function() {
        return this.pinHandle.connectors.first().morph
    },

	okToBeGrabbedBy: Functions.Null,
    
    startSnapping: function() {
        this.snapper = new PointSnapper(this);
        this.snapper.points = this.pinHandle.fabrik().morph.allPinSnappPoints(); 
        this.snapper.offset = pt(this.bounds().width * -0.5, this.bounds().height * -0.5);
        var self = this;
        this.snapper.formalModel.addObserver({onSnappedUpdate: function(snapped){
            if (self.snapper.formalModel.getSnapped()) {
                self.setFill(Color.green);
                self.getFakeConnectorMorph().setBorderColor(Color.green);

            } else {
                self.setFill(Color.red); 
                self.getFakeConnectorMorph().setBorderColor(Color.red);
            }
        }})
    }
});
    
/*
 * A graphical representation for pins
 * TODO: make use of PinHandleMorph
 */
Widget.subclass('PinHandle', {
    
    isPinHandle: true,
    
    initialize: function($super, component, pinName) {
        $super();
        this.component = component;
        this.name = pinName;
        this.connectors = [];
    },

    buildView: function() {
        this.morph = new PinMorph();
        // perhaps move to morph
        this.morph.pinHandle = this;
    },
 
    setValue: function(value) {
        this.component.formalModel["set" + this.name](value);
    },
    
    getValue: function() {
        return this.component.formalModel["get" + this.name]();
    },
    
    connectTo: function(otherPinHandle) {
        
        var existingConnection = this.detectConnectorWith(otherPinHandle);
        if (existingConnection) {
            console.log('There exists already a connection from ' + this.name + ' to ' + otherPinHandle.name);
            return existingConnection;
        };
                
        // if there exists a connection in the other direction make it two way
        var connector = otherPinHandle.detectConnectorWith(this);
        if (connector) {
            connector.beBidirectional();
            return connector;
        };
        
        // No connection exists; make a new one
        connector = new PinConnector(this, otherPinHandle);
        this.connectors.push(connector);
        otherPinHandle.connectors.push(connector);
        return connector;
    },
    
    connectBidirectionalTo: function(otherPinHandle) {
        this.connectTo(otherPinHandle);
        return otherPinHandle.connectTo(this);
    },
    
    isConnectedTo: function(otherPin) {
        return this.connectors.any(function(ea) {
            return ea.toPin == otherPin || (ea.fromPin == otherPin && ea.isBidirectional);
        });
    },
    
    detectConnectorWith: function(otherPin) {
        return this.connectors.detect(function(ea) {
            return ea.toPin == otherPin;
        });
    },

    connectFromFakeHandle: function(fakePin) {
        // FIXME: remove fakePin connection or replace fakePin with this!
        var con = fakePin.originPin.detectConnectorWith(fakePin);
        if (!con) throw new Error('No connector encountered when removing fakpin connection');
        con.remove();
        
        return fakePin.originPin.connectTo(this);
    },

    createFakePinHandle: function() {
        var fakePin = new PinHandle();
        fakePin.isFakeHandle = true;
        fakePin.originPin = this;
        fakePin.component = this.component;
        this.connectTo(fakePin);        
        return fakePin;
    },
    
    fabrik: function() { 
        return this.component.fabrik 
    },
});

Object.subclass('PinConnector', {
    
    initialize: function(fromPinHandle, toPinHandle) {
        this.isBidirectional = false;
        this.fromPin = fromPinHandle;
        this.toPin = toPinHandle;
        if (toPinHandle.isFakeHandle) return;
        
        // FIXME: Relays inbetween? (Law of Demeter)
        var fromModel = fromPinHandle.component.formalModel;
        var toModel = toPinHandle.component.formalModel;
        
        console.log("PinConnector>>connectTo: Connect pin " + fromPinHandle.name + " to pin " + toPinHandle.name);
        
        // implicit assertion: pinHandle name equals field name of model
        var spec = {};
        spec[fromPinHandle.name] = "=set" + toPinHandle.name;
        fromModel.addObserver(toModel, spec);
    },

    // just for make things work ...
    buildView: function() {
        this.morph = new ConnectorMorph(null, 4, Color.blue, this);
        this.morph.formalModel.setStartHandle(this.fromPin.morph);
        this.morph.formalModel.setEndHandle(this.toPin.morph);
        this.morph.connector = this; // for debugging
        
        return this.morph;
    },
    
    updateView: function(varname, source) {
        if (!this.morph) this.buildView();
        this.morph.updateView(varname, source);
    },
    
    remove: function() {
        // FIXME: View!!!
        if (this.morph) this.morph.remove();
    
        // should be removed! Fabrik should not know about connectors!
        if (this.fabrik)
            this.fabrik.removeConnector(this)

        // FIXME move to PionHandle
        var self = this;
        console.log("remove con from " + this.fromPin.name + " to: " + this.toPin.name);
        this.fromPin.connectors = this.fromPin.connectors.reject(function (ea) { return ea === self}, this);
        this.toPin.connectors = this.toPin.connectors.reject(function (ea) { return ea === self}, this);
        
        if (this.fromPin.isFakeHandle) console.log("frompin is fakePin");
        if (this.toPin.isFakeHandle) console.log("topin is fakePin");
        
        this.fromPin.component.formalModel.removeObserver(this.toPin.component.formalModel, this.fromPin.name);
        if (this.isBidirectional)
            this.toPin.component.formalModel.removeObserver(this.fromPin.component.formalModel, this.toPin.name);
    },
    
    beBidirectional: function() {
        this.isBidirectional = true;
        // FIXME: Relays inbetween? (Law of Demeter)
        var fromModel = this.fromPin.component.formalModel;
        var toModel = this.toPin.component.formalModel;
        
        var spec = {};
        spec[this.toPin.name] = "=set" + this.fromPin.name;
        toModel.addObserver(fromModel, spec);
    },
});


Morph.subclass('ConnectorMorph', {
    
    initialize: function($super, verts, lineWidth, lineColor, pinConnector) {
        if(!verts) verts = [pt(0,0), pt(100,100)];
        if(!lineWidth) lineWidth = 1;  
        if(!lineColor) lineColor = Color.black;   
        this.formalModel = NewComponentModel.instantiateNewClass();
        this.formalModel.addField("StartHandle");
        this.formalModel.addField("EndHandle");
        
        this.pinConnector = pinConnector;
        
        $super(verts[0].asRectangle(), "rect")
        var vertices = verts.invoke('subPt', verts[0]);
        this.setShape(new PolylineShape(vertices, lineWidth, lineColor));
        this.customizeShapeBehavior();
        
        this.okToBeGrabbedBy = function(){return null};
        this.setStrokeOpacity(0.7);
        
        return this;         
    },
    
    customizeShapeBehavior: function() {
        var self = this;
        
        // disable first and last control point of polygone 
        this.shape.controlPointNear = this.shape.controlPointNear.wrap(function(proceed, p) { 
            var part = proceed(p);
            if(part == 0 || part == (this.vertices().length - 1)) return null
            return part 
        });
         
        // change behavior of the control point handles 
        this.shape.possibleHandleForControlPoint =  this.shape.possibleHandleForControlPoint.wrap(
            function(proceed, targetMorph, mousePoint, hand) {
                var handleMorph = proceed(targetMorph, mousePoint, hand);
                if (!handleMorph) return;
                handleMorph.showHelp =  handleMorph.showHelp.wrap(function(proceed, evt) {
                        proceed(evt);
                        self.showContextMenu(evt);
                });
                handleMorph.onMouseDown = handleMorph.onMouseDown.wrap(
                    function(proceed, evt) {
                        proceed(evt); 
                        if (evt.isCommandKey())
                            self.pinConnector.remove() // remove connector
                        });
                  
                return handleMorph;
        });               
    },
    

    showContextMenu: function(evt) {
        if(this.contextMenu) return; // open only one context menu
    
        this.contextMenu = new MenuMorph([["cut", this.pinConnector, "remove"]], self);
        var offset = pt(-40,-40);
        this.contextMenu.openIn(WorldMorph.current(), evt.mousePoint.addPt(offset), false, "");
        
        var connector = this;
        var handObserver = new HandPositionObserver(function(value) {
            if (!connector.contextMenu.owner || 
                value.dist(connector.contextMenu.worldPoint(pt(20,20))) > 40) {
                connector.contextMenu.remove();
                connector.contextMenu = null;
                this.stop();
            }
        });
        handObserver.start();
    },
    
    fullContainsWorldPoint: function($super, p) {
        // to ensure correct dnd behavior when connector is beneath a pinMorph in hand
        if (this.formalModel.getStartHandle().fullContainsWorldPoint(p) || 
            this.formalModel.getEndHandle().fullContainsWorldPoint(p))
            return false;
        return $super(p);
    },

    setStartPoint: function(point) {
        if (!point) 
        throw {msg: "failed setStartPoint " + point};
        var v = this.shape.vertices();
        v[0] = point;
        this.setVertices(v); 
    },
    
    setEndPoint: function(point) {
        if (!point) 
        throw {msg: "failed setEndPoint " + point}; 
        var v = this.shape.vertices();
        v[v.length-1] = point;
        this.setVertices(v); 
    },
    
    getStartPoint: function() {
        return this.shape.vertices().first();
    },
    
    getEndPoint: function() {
        return this.shape.vertices().last();
    },
    
    remove: function(){
        if(this.fabrik)
            this.fabrik.removeConnector(this)
    },
    
    updateView: function (varname, source) {
        // console.log("update View for connector");
        if(!this.formalModel) return;
        var start = this.formalModel.getStartHandle();
        if(start) this.setStartPoint(start.getPinPosition());
        var end = this.formalModel.getEndHandle();
        if(end) this.setEndPoint(end.getPinPosition());
    },
});

Morph.subclass('ComponentMorph', {
    
    initialize: function($super, bounds) {
        $super(bounds, "rect");
        this.openForDragAndDrop = true;
        this.suppressHandles = true;
        return this;
    },
    
    
    addMorph: function($super, morph) {
        $super(morph);
        if (morph.constructor == HandleMorph) return;
        if (morph.constructor == PinMorph) return;
        //this.submorphs.each(function(ea) { if (ea !== morph) ea.remove() });
        
        var inset = 5;
        this.setExtent(morph.getExtent().addPt(pt(inset * 2, inset * 2)));
        morph.setPosition(pt(inset, inset));
        
        if (morph.formalModel) {
            this.component.adoptToModel(morph.formalModel);
        };
        return morph;
    },
    
    okToBeGrabbedBy: function(evt) {
        return this; 
    }
    
});

/*
 * The basic component
 */
Object.subclass('Component', {
    
    initialize: function() {
        this.formalModel = NewComponentModel.instantiateNewClass();
        this.pinHandles = [];
    },
    
	defaultPanelContents: [
        ['text', newTextPane, new Rectangle(0.025, 0.05, 0.95, 0.9)]
    ],

    setupPanel: function(){
        this.panel = PanelMorph.makePanedPanel(pt(200, 100), this.defaultPanelContents),
        this.panel.openForDragAndDrop = false;
        this.panel.suppressHandles = false;
        var self = this;
        this.panel.changed = this.panel.changed.wrap(function(proceed){
            var newPos = this.getGlobalTransform().transformPoint(pt(0,0));
            if (!this.pvtOldPosition || !this.pvtOldPosition.eqPt(newPos)) {
                this.pvtOldPosition = newPos;
                self.pinHandles.each(function(ea){
                    ea.morph.updatePosition();
                });
            };
            proceed();
        });

        // argh, just a quick hack for dropping components into  the fabrikcomponent.
        // see the wrapped addMorph() in FabrikComponent.buildView()
        this.panel.component = this;
    },
    
    setupTextPane: function(){
        this.morph = this.panel.text.innerMorph();
        this.morph.setTextString("------"); // the morph need to have something to work with, ToDo: Fix it
        this.morph.openForDragAndDrop = false;
    },
    
    setupDragAndDrop: function(){
        var self = this;
        var grabFunction = function(evt){
            return self.panel
        };
        this.morph.okToBeGrabbedBy = grabFunction;
        this.morph.owner.okToBeGrabbedBy = grabFunction;  
    },
    
    addField: function(fieldName, coercionSpec) {
        this.pvtCreateAccessorsForField(fieldName);
        this.formalModel.addField(fieldName, coercionSpec);
    },
    
    addFieldAndPinHandle: function(field, coercionSpec) {
        this.addField(field, coercionSpec);
        this.addPinHandle(field);
    },
    
    pvtCreateAccessorsForField: function(fieldName) {
        this["get" + fieldName] = function() {
            return this.formalModel["get" + fieldName]();
        };
        this["set" + fieldName] = function(value) {
            return this.formalModel["set" + fieldName](value);
        };
    },
    
    addPinHandle: function(pinName) {
        // FIXME: Rewrite test that field exists
        if (!this["get" + pinName])
            throw new Error('Cannot add Pin. There exist no field for ' + pinName);
        var pinHandle = new PinHandle(this, pinName);
        this.pinHandles.push(pinHandle);
        return pinHandle;
    },
    
    getPinHandle: function(pinName) {
        console.log('looking for pinHandle named ' + pinName);
        return this.pinHandles.detect(function(ea) {console.log(ea.name); return ea.name == pinName});
    },

    toString: function($super){
        return $super() + this.name
    },

    setupHandles: function() {
        if (!this.panel) return;
        var offset = this.panel.bounds().height / 2 - 10;
        this.pinHandles.each(function(handle){
            handle.buildView();
            handle.morph.setPosition(pt(-5, offset));
            offset += handle.morph.bounds().height + 10;
            this.panel.addMorph(handle.morph);
            handle.morph.openForDragAndDrop = false;
        }, this);
    }
});

Component.subclass('PluggableComponent', {
    
    // just copied, clean this up
    setupPanel: function() {
        this.panel = new ComponentMorph(new Rectangle(0,0,100,100));
        // var xxx = PanelMorph.makePanedPanel(pt(100, 100), [
        //                  ['text', newTextPane, new Rectangle(0.05, 0.05, 0.9, 0.9)]
        //              ]);
        //this.panel.addMorph(new TextMorph(new Rectangle(0,0,300,200), '---'));
        // this.panel = new TextMorph(new Rectangle(0,0,100,100), '---');
        // this.panel.openForDragAndDrop = false;
        var self = this;
        this.panel.changed = this.panel.changed.wrap(function(proceed){
            var newPos = this.getGlobalTransform().transformPoint(pt(0,0));
            if (!this.pvtOldPosition || !this.pvtOldPosition.eqPt(newPos)) {
                this.pvtOldPosition = newPos;
                self.pinHandles.each(function(ea){
                    ea.morph.updatePosition();
                });
            };
            proceed();
        });

        // argh, just a quick hack for dropping components into  the fabrikcomponent.
        // see the wrapped addMorph() in FabrikComponent.buildView()
        this.panel.component = this;
    },

    buildView: function() {
        this.setupPanel();
        // Fix for adding to Fabrik with addMorph()
        this.morph = this.panel;
        //this.panel.text.remove();
        this.panel.addMorph = this.panel.addMorph.wrap(function(proceed, morph) {
            proceed(morph);
        });
        return this.panel;
    },

    adoptToModel: function(model) {
        this.formalModel = model;
        var fieldNames = this.getFieldNamesFromModel(model);
        fieldNames.each(function(ea) {
            this.pvtCreateAccessorsForField(ea);
            this.addPinHandle(ea);
        }, this);
        this.setupHandles();
    },
    
    getFieldNamesFromModel: function(model) {
        var result = [];
        console.log("looking for field names");
        // look for getter/setter functions and extract field names from them
        for (var name in model) {
            if (!name.startsWith('set') || !(model[name] instanceof Function)) continue; 
            var nameWithoutSet = /^set(.*)/.exec(name)[1];
            var getterName = 'get' + nameWithoutSet;
            if (!(model[getterName] instanceof Function)) continue;
            // Ignore the getRecordField and setRecordField which every Record has
            if (nameWithoutSet == 'RecordField') continue;
            // getter and setter are there, we found a field
            console.log("Found field: " + nameWithoutSet);
            result.push(nameWithoutSet);
        };
        return result;
    }
});
    
Component.subclass('TextComponent', {
 
    initialize: function ($super) {
        $super();
        this.addFieldAndPinHandle('Text', {to: String});
    },

    buildView: function() {
        this.setupPanel();
        this.setupTextPane();
           
        this.morph.formalModel = this.formalModel.newRelay({Text: "Text"});
        this.formalModel.addObserver(this.morph, {Text: "!Text"});
        
        this.setupHandles();
        this.setupDragAndDrop();
        return this.panel;
    },
});

Component.subclass('FunctionComponent', {

    initialize: function ($super) {
        $super();
        this.addFieldAndPinHandle("Result");
        this.addFieldAndPinHandle("Input");
        this.addField("FunctionBody");
        this.setupAutomaticExecution();
    },

	defaultPanelContents: [
        ['text', newTextPane, new Rectangle(0.025, 0.05, 0.95, 0.7)],
		['evalButton', function(initialBounds){return new ButtonMorph(initialBounds)}, new Rectangle(0.025, 0.80, 0.95, 0.15)]
    ],
    
    buildView: function() {
        this.setupPanel();
        this.setupTextPane();
		
		var evalButton = this.panel.evalButton;
		evalButton.setLabel("eval");
        evalButton.connectModel({model: this, setValue: "saveAndExecute"});
		
        this.morph.formalModel = this.formalModel.newRelay({Text: "FunctionBody"});
        this.formalModel.addObserver(this.morph, {FunctionBody: "!Text"});

        this.setupHandles();
        
        var input = this.getPinHandle("Input").morph;
        var h = 40;
        input.setFill(Color.blue);
        input.setPosition(pt(-5,h));
        
        var result = this.getPinHandle("Result").morph;
        result.setPosition(pt(195 - 5,h));
        
        this.setupDragAndDrop();
        return this.panel;
    },
    
	saveAndExecute: function() {
		this.morph.doSave();
		this.execute();
	},

    setupAutomaticExecution: function(){
        this.formalModel.addObserver({onFunctionBodyUpdate: function(){
            this.setResult(null); // force an update
            this.execute()}.bind(this)});

        this.formalModel.addObserver({onInputUpdate: function(){
            this.execute()}.bind(this)});
    },
        
    pvtGetFunction: function() {
        try {
            return eval("var x = function() {" + this.getFunctionBody() + "}; x");
        } catch(e) {
            console.log("FunctionComponentModel could not compile source:" + funcSource + " error: " + e.msg);
        }
    },

    execute: function() {
        try {
            this.setResult(this.pvtGetFunction().call(this));
            console.log("Result of function call: " + this.getResult());
        } catch(e) {
            console.log("FunctionComponentModel: error " + e + " when executing " + this.pvtGetFunction);
            throw e;
        }
    },
});

asStringArray = function(input) {
	var list = $A(input);
	if(list.length == 0) 
		return ["------"];  // awful hack around the bug that TextLists break when empty
	return list.collect(function(ea){return ea.toString()});
	
};

Component.subclass('TextListComponent', {

	defaultPanelContents: [
        ['textList', newTextListPane, new Rectangle(0.025, 0.05, 0.95, 0.9)]
    ],
	
    initialize: function ($super) {
           $super();
           this.addFieldAndPinHandle('List', {to: asStringArray});
           this.addFieldAndPinHandle('Selection');
		   this.setList([]);
    },

    buildView: function() {
          this.setupPanel();
		  this.morph = this.panel.textList.innerMorph();
          this.morph.connectModel(this.formalModel.newRelay({List: "List", Selection: "Selection"}));
          this.setupHandles();
          this.setupDragAndDrop();
          return this.panel;
    }
    
}),

Widget.subclass('ComponentBox', {

    viewTitle: "Fabrik Component Box",
    viewExtent: pt(440,150),
    
    initialize: function($super) { 
        $super();
        this.model = NewComponentModel.instantiateNewClass();
    },

    addMorphOfComponent: function(comp, allComponents) {
        allComponents.push(comp);
        var m = comp.buildView();
        m.setExtent(pt(120, 100));
        
        if (m.text) {
            m.text.innerMorph().onMouseDown = m.text.innerMorph().onMouseDown.wrap(
                function(proceed, evt) {
                    var compMorph = new comp.constructor().buildView();
                    evt.hand.addMorph(compMorph);
                    compMorph.setPosition(pt(0,0));
                });
        } else {
            m.okToBeGrabbedBy = m.okToBeGrabbedBy.wrap(function(proceed) {
                return new comp.constructor().buildView();
            });
        }
        this.panel.addMorph(m);
    },
    
    buildView: function(extent) {
        var model = this.model;
        var panel = new PanelMorph(extent);
        this.panel = panel;
        
        panel.applyStyle({borderWidth: 2,
            fill: new LinearGradient([Color.white, 1, Color.primary.blue], LinearGradient.NorthSouth)});

        var components = [];
        var m; 

        //FIXME: remove redundant code
        
        this.addMorphOfComponent(new FunctionComponent(), components);
        this.addMorphOfComponent(new TextComponent(), components);
        this.addMorphOfComponent(new PluggableComponent(), components);
        
        new FlowLayout().layoutElementsInMorph(components, panel),
        panel.openDnD();
        
        return panel;
    }

});

/*********************************
 * Gerneral Purpose Helper Classes
 */
 
/*
 * PoinSnapper: snaps a morph to a list of points in world coordinates
 */
Object.subclass("PointSnapper", {

    initialize: function(morph, points) {
        this.formalModel = Record.newPlainInstance({Snapped: false});
        this.morph = morph;
        this.points = points;
        this.limit = 30;
        this.offset = pt(0,0);
        return this;
    },

    updatePosition: function(newPosition) {
        if (!this.oldPosition || !newPosition.eqPt(this.oldPosition)) {
            this.oldPosition = newPosition;
            this.morph.setPosition(newPosition);
        }
    },

    snap: function(mousePosition) {
        // var oldPosInWorld = this.morph.owner.worldPoint(oldPos);
        // console.log("oldPosInWorld " + oldPosInWorld);
        var newPosInWorld = this.detectPointNear(mousePosition);
        if (!newPosInWorld) {
            this.updatePosition(pt(0,0));
            this.formalModel.setSnapped(false);
            return
        };
        var newPos = this.morph.owner.localize(newPosInWorld);
        this.updatePosition(newPos.addPt(this.offset));
        this.formalModel.setSnapped(true);
    },

    detectPointNear: function(position) {
        return this.points.detect(function(ea) {
            // console.log("detect " + ea);
            var dx = Math.abs(ea.x - position.x);
            var dy = Math.abs(ea.y - position.y);
            // console.log("dx " + dx + " dy " + dy);
            return  dx < this.limit && dy < this.limit;
            }, this);
    },
});

/*
 * A simple FlowLayout, which positions elements of the morph from left to right
 */
Object.subclass('FlowLayout', {
    /*
    * very simple flow layout:
    *   - flow left to right 
    *   - top to bottom
    *   - keep a space between 
    */
    layoutElementsInMorph: function(elements, morph) {
        var inset = 20; 
        var positionX = inset;
        var positionY = inset;
        var maxHeight = 0;
        elements.each(function(ea){
            var bounds = ea.panel.bounds();
            if ((positionX + bounds.width + inset) > morph.bounds().right()) {
                positionX = inset; // start left
                positionY += maxHeight + inset; // on a new line
                maxHeight = 0; // and reset maxHeigth for that new line
            };
            ea.panel.setPosition(pt(positionX, positionY));
            positionX += bounds.width + inset;
            if (bounds.height > maxHeight)
            maxHeight = bounds.height;
        })
    },

});
 
/*
* HandPositionObserver, obsverse the position change of the hand and calls the function
*/
Object.subclass('HandPositionObserver', {

    initialize: function(func) {
        this.hand = WorldMorph.current().hands.first();
        this.func = func;
        return this;
    },

    onGlobalPositionUpdate: function(value) {
        if(this.func)
        this.func.call(this, value)
    },

    start: function() {
        this.hand.formalModel.addObserver(this);
    },

    stop: function() {
        this.hand.formalModel.removeObserver(this);
    },
});

/*
 * Extending ClockMorph for PluggableComponent
 */
if (!Config.originalClock) { // **Wrap clock methods...
ClockMorph.prototype.initialize = ClockMorph.prototype.initialize.wrap(function(proceed, position, radius) {
    this.formalModel = Record.newPlainInstance({Minutes: null, Seconds: null, Hours: null});
    return proceed(position,radius);
});

ClockMorph.prototype.setHands = ClockMorph.prototype.setHands.wrap(function(proceed, hour, minute, second) {
    this.formalModel.setMinutes(minute);
    this.formalModel.setHours(hour);
    this.formalModel.setSeconds(second);
    //    console.log("setting time");
    return proceed(hour, minute, second);
});
//WorldMorph.current().addMorph(new ClockMorph(pt(400, 60), 200));
} // **... end wrap of clock changes...

/*
 * Helper functions for debugging
 */
function emptyString(length){
  for(var s=""; s.length < length ; s += " ") {}  
  return s
};

function logTransformChain(morph, indent, result) {
    if(!result)
        result = ""
    if(!indent)
        indent = 0;
    result += emptyString(indent*2) + morph + " " + morph.getTransform() + "\n";
    if (morph.owner)
        return logTransformChain(morph.owner, indent + 1, result);
    else
        // console.log(result);
        return result
};


function debugFunction(func) {
	var errObj = {};
	Function.installStackTracers();
	try {
		func.call()
	} catch(e) {
		errObj.err = e;

	};
	Function.installStackTracers("uninstall");
	var viewer = new ErrorStackViewer(errObj)
	viewer.openIn(WorldMorph.current(), pt(220, 10));
}



