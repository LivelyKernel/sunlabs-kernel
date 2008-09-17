
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
 * - ... to be updated ...
 */
 
 /**************************************************
  * Examples for interactive testing and exploring
  */
  
Loader.loadScript('Helper.js');

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
        toComponent.plugin(c);
        return c;
    },

    addTextListComponent: function(toComponent) {
        var c = new TextListComponent();
        toComponent.plugin(c);
        return c;
    },

    addWebRequestComponent: function(toComponent) {
        var c = new WebRequestComponent();
        toComponent.plugin(c);
        c.panel.setExtent(pt(220,50));
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
        var c = new FabrikComponent();
        c.defaultExtent = extent;
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
        
        var m1 = new Morph(new Rectangle(100,100,30,30),"rect");
        var m2 = new Morph(new Rectangle(200,200, 30,30),"rect");
        m1.getPinPosition = function(){return this.getPosition()};
        m2.getPinPosition = m1.getPinPosition;  

        m1.changed = function(){c.updateView()};
        m2.changed = function(){c.updateView()};
        
        world = WorldMorph.current();
        world.addMorph(c);
        world.addMorph(m1);
        world.addMorph(m2);

        c.formalModel = NewComponentModel.instantiateNewClass();
        c.formalModel.addField("StartHandle");
        c.formalModel.addField("EndHandle");
        c.formalModel.setStartHandle(m1);
        c.formalModel.setEndHandle(m2);
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
        getSource.formalModel.addObserver({onInput2Update: function() { getSource.execute()}.bind(getSource)});
        f.plugin(getSource);    
        getSource.setFunctionBody('return getMethodStringFor(this.getInput(), this.getInput2())'); 

        var classList = this.addTextListComponent(f);
        var methodList = this.addTextListComponent(f);


        var methodSource = this.addTextComponent(f);

        f.connectComponents(getClasses, "Result", classList, "List");
        f.connectComponents(classList, "Selection", getMethods, "Input");   
        f.connectComponents(getMethods, "Result", methodList, "List");  

        f.connectComponents(classList,  "Selection", getSource, "Input");   
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

    openFabrikWebRequestExample: function(world, loc) {
            if (!loc) loc = pt(100, 100);
            var f = this.openFabrikComponent(world, loc, pt(650, 250), 'WebRequest Example');

            var urlHolder = this.addTextComponent(f);
            urlHolder.setText("http://www.webservicex.net/CurrencyConvertor.asmx/ConversionRate?FromCurrency=USD&ToCurrency=EUR");
            
            var req = this.addWebRequestComponent(f);
            
            var result = this.addTextComponent(f);
            
            f.morph.automaticLayout();
            
            return f;
    },
    
    openCurrencyConverterExample: function(world, loc) {
        // the next variables are intentionally defined global
        if (!loc) loc = pt(10,10);
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
        //f4.panel.setPosition(f2.panel.getPosition().addPt(pt(0,f2.panel.getExtent().y - 10)));
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

/* Fabrik Model. It is used to store the data of the components. Data flow is simulated
   by establishing observer relationships bewtween the models of the components */
PlainRecord.prototype.create({}).subclass("NewComponentModel", {
    
    initialize: function($super, spec, rawNode) {
        if (!rawNode) rawNode = {};
        $super(rawNode, spec);
    },
    
    addField: function(fieldName, coercionSpec, forceSet) {
        var spec = {}; spec[fieldName] = coercionSpec || {};
        this.constructor.addMethods(new Record.extendRecordClass(spec));
        if (!forceSet) return;
        this['set' + fieldName] = this['set' + fieldName].wrap(function(proceed, value, optSource, force) {
            proceed(value, optSource, true);
        })
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
    
    isPinMorph: true,
    
    initialize: function ($super){
        $super(new Rectangle( 0, 0, 10, 10), 'ellipse');
        
        this.suppressHandles = true; // no handles
        this.okToBeGrabbedBy = Functions.Null; // no dragging
       
        this.handlesMouseDown = Functions.True; // hack
        this.openForDragAndDrop = true;
        this.onMouseDown = this.onMouseDown.bind(this);
    
        this.setupMorphStyle();
        this.setExtent(pt(18,18)); // fixes ellipse pt(0,0) === center behavior
         return this;
    },
    
     /* Drag and Drop of Pin */        
    addMorph: function($super, morph) {
        if (!morph.pinHandle || !morph.pinHandle.isFakeHandle) return;
        console.log("dropping pin on other pin...");
        $super(morph); // to remove it out of the hand

        //FIXME: just for make things work...
        var fakePin = morph.pinHandle;
        fakePin.connectors.first().remove();
        this.pinHandle.component.fabrik.connectPins(fakePin.originPin, this.pinHandle);
        
        this.removeMorph(morph);
    },
    
    setupMorphStyle: function() {
        this.setFill(Color.green);
        this.setFillOpacity(0.5);
    },
    
    setupInputMorphStyle: function() {
        this.setFill(Color.blue);
        if (this.pinHandle.component) {
            var inputPins = this.pinHandle.component.inputPins();
            var index = inputPins.indexOf(this.pinHandle);
            if (index > 0) {
                var prevPinPosition = (inputPins[index - 1]).morph.getPosition();
                console.log("prev pos " + prevPinPosition);
                this.setPosition(prevPinPosition.addPt(pt(0,25)));
            }       
        }
    },
    
    changed: function($super, aspect, value) {
        $super();
        if (aspect == "globalPosition" && this.snapper) 
            this.snapper.snap(value);
        this.updatePosition();
    },

    getLocalPinPosition: function() {
        return this.getExtent().scaleBy(0.5);
    },
    
    getGlobalPinPosition: function(){
        return this.getGlobalTransform().transformPoint(this.getLocalPinPosition());
    },
    
    dropMeOnMorph: function(receiver) {
        // logCall(arguments, this);
        if (receiver && receiver.isPinMorph)
            receiver.addMorph(this);
        else {
            otherPinMorph = this.window().morphToGrabOrReceive(
                newFakeMouseEvent(this.worldPoint(this.getExtent().scaleBy(0.5))));
            if (otherPinMorph.isPinMorph) {
                return otherPinMorph.addMorph(this); // let him do the job
            } else {
                console.log("Pin DnD Problem: found  " + String(otherPinMorph));
            }; 
            console.log("found other pin " + otherPinMorph)
            this.pinHandle.connectors.first().remove();
            this.remove();
        };
    },

    // PinPosition relative to the Fabrik Morph
    getPinPosition: function() {
        // arghhhhhh, law of demeter
        return this.pinHandle.component.fabrik.morph.localize(this.getGlobalPinPosition());
    },

    updatePosition: function(evt) {
        // console.log("update position" + this.getPosition());
        if (!this.pinHandle) return;
        this.pinHandle.connectors.each(function(ea){ ea.updateView() });
    },    

    snapToPointInside: function(point) {
        var oldPos = point
        point = point.maxPt(pt(0,0));
        point = point.minPt(this.owner.shape.bounds().extent());
        this.setPosition(point.subPt(this.shape.bounds().extent().scaleBy(0.5)));
    },
    
    onMouseMove: function(evt) {
        if (evt.isMetaDown()) {
            this.snapToPointInside(this.owner.localize(evt.mousePoint))
        }
    },

    // When PinHandleMorph is there, connect to its onMouseDown
    onMouseDown: function($super, evt) {
        logCall(arguments, this);
        
        
        if (evt.isMetaDown()) return;
        // for not grabbing non-fake pins.
        // Extend, so that pins can be moved around componentmorphs
        if (evt.hand.topSubmorph() === this) {
                // this.setPosition(this.getNearestValidPositionTo(evt))}
            evt.hand.showAsUngrabbed(this);
        };
        
        if (this.pinHandle.isFakeHandle) return;
        var fakePin = this.pinHandle.createFakePinHandle();
        fakePin.buildView();
        
        // change style to distinguish between real handles... put into an own method...?
        fakePin.morph.setFill(Color.red);
        fakePin.morph.setExtent(pt(10,10));
        
        evt.hand.addMorph(fakePin.morph);
        fakePin.morph.setPosition(pt(0,0));
        fakePin.morph.startSnapping();
        
        //FIXME: just for make things work... connect redundant with createFakePinHandle()
        this.pinHandle.component.fabrik.connectPins(this.pinHandle, fakePin);
        this.updatePosition();
    },

    getHelpText: function() {
        return this.pinHandle.name;
    },
    
    acceptsDropping: function($super, evt) {
        return $super(evt)
    },
    
    getFakeConnectorMorph: function() {
        return this.pinHandle.connectors.first().morph;
    },

    okToBeGrabbedBy: Functions.Null,
    
    startSnapping: function() {
        this.snapper = new PointSnapper(this);
        this.snapper.points = this.pinHandle.component.fabrik.morph.allPinSnappPoints(); 
        this.snapper.offset = pt(this.bounds().width * -0.5, this.bounds().height * -0.5);
        var self = this;
        this.snapper.formalModel.addObserver({onSnappedUpdate: function(snapped) {
            if (self.snapper.formalModel.getSnapped()) {
                self.setFill(Color.green);
                self.getFakeConnectorMorph().setBorderColor(Color.green);

            } else {
                self.setFill(Color.red); 
                self.getFakeConnectorMorph().setBorderColor(Color.red);
            }
        }})
    },
    
    adoptToBoundsChange: function(ownerPositionDelta, ownerExtentDelta, scaleDelta) {
        var center = this.getExtent().scaleBy(0.5);
        // console.log("center: " + center);
        var centerPos = this.getPosition().addPt(center);
        // console.log("centerPos: " + centerPos);
        var scaledPos = centerPos.scaleByPt(scaleDelta);
        // console.log("scaledPos: " + scaledPos);
        var newPos = scaledPos.subPt(center);
        // console.log("newPos: " + newPos);
        this.setPosition(newPos);
    }
    
});
    
/*
 * A graphical representation for pins
 */
Widget.subclass('PinHandle', {
    
    isPinHandle: true,
    isInputPin: false,
    
    initialize: function($super, component, pinName) {
        $super();
        this.component = component;
        this.name = pinName;
        this.connectors = [];
    },

    becomeInputPin: function() {
        this.isInputPin= true;
        if (this.morph) this.morph.setupInputMorphStyle();
    },

    buildView: function() {
        this.morph = new PinMorph();
        // perhaps move to morph
        this.morph.pinHandle = this;
        if (this.isInputPin)
            this.morph.setupInputMorphStyle();
        return this.morph;
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

    // Not used right now! Instead PinMorph.addMorph has all the logic! Refactor!
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
        // in PinMorph.onMouseDown() fabrik.connectPins is send again after the connector morph was created
        // for adding the connector morph to the update position logic. This is redundant, how to remove this
        // without mixing model and view logic?
        this.connectTo(fakePin);
        return fakePin;
    }
    
});

Morph.subclass('ArrowHeadMorph', {
     
    initialize: function($super, lineWidth, lineColor, fill, length, width) {
        $super();
        this.setFillOpacity(0);
        this.setStrokeOpacity(0);
        this.head = new Morph(pt(0,0).asRectangle(), "rect");

        lineWidth = lineWidth || 1;
        lineColor = lineColor || Color.black;
        fill = fill || Color.black;
        length = length || 16;
        width = width || 12;

        var verts = [pt(0,0), pt(-length, 0.5* width), pt(-length, -0.5 * width)];
        this.head.setShape(new PolygonShape(verts, fill, 1, lineColor, fill));
        this.addMorph(this.head);
        this.ignoreEvents();
        this.head.ignoreEvents();
        
        //this.head.setFillOpacity(0.7);
        //this.head.setStrokeOpacity(0.7);
        
        return this;
    },
    
    pointFromTo: function(from, to) {
        var dir = (to.subPt(from)).theta()
        this.setRotation(dir)
        this.setPosition(to);
    }

});


Morph.subclass('ConnectorMorph', {
    
    isConnectorMorph: true,
    
    initialize: function($super, verts, lineWidth, lineColor, pinConnector) {
        if (!verts) verts = [pt(0,0), pt(100,100)];
        if (!lineWidth) lineWidth = 1;  
        if (!lineColor) lineColor = Color.red;   
        this.formalModel = NewComponentModel.instantiateNewClass();
        this.formalModel.addField("StartHandle");
        this.formalModel.addField("EndHandle");
        
        this.pinConnector = pinConnector;
        
        $super(verts[0].asRectangle(), "rect")
        var vertices = verts.invoke('subPt', verts[0]);
        this.setShape(new PolylineShape(vertices, lineWidth, lineColor));
        this.customizeShapeBehavior();
        
        this.setStrokeOpacity(0.7);
        this.lineColor = lineColor;
        
        this.closeAllToDnD();    
        
        // try to disable drag and drop for me, but it does not work
        this.okToBeGrabbedBy = function(){return null};
        this.morphToGrabOrReceive = Functions.Null;
        this.handlesMouseDown = Functions.True;

        this.arrowHead = new ArrowHeadMorph(1, lineColor, lineColor);
        this.addMorph(this.arrowHead);

        var self = this;
        this.shape.setVertices = this.shape.setVertices.wrap(function(proceed) {
            var args = $A(arguments); args.shift(); 
            proceed.apply(this, args);
            self.updateArrow();
        });
    
    },
    
    // I don't know who sends this, but by intercepting here I can stop him....
    // logStack shows no meaningfull results here
    translateBy: function($super, delta) {
        //logStack();
        //$super(delta)
    },
    
    customizeShapeBehavior: function() {
        var self = this;
        
        this.shape.controlPointProximity = 20;
        
        // disable first and last control point of polygone 
        this.shape.controlPointNear = this.shape.controlPointNear.wrap(function(proceed, p) { 
            var part = proceed(p);
            if (part == 0 || part == (this.vertices().length - 1)) return null
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
                handleMorph.onMouseDown = handleMorph.onMouseDown.wrap(function(proceed, evt) {
                    proceed(evt); 
                    if (evt.isCommandKey())
                    self.pinConnector.remove() // remove connector
                });
                handleMorph.onMouseMove = handleMorph.onMouseMove.wrap(function(proceed, evt) {
                    proceed(evt); 
                });                
                return handleMorph;
        });               
    },
    
    showContextMenu: function(evt) {
        if (this.contextMenu) return; // open only one context menu
    
        this.contextMenu = new MenuMorph([["cut", this.pinConnector, "remove"]], self);
        var offset = pt(-40,-40);
        var pos = this.window().localize(evt.mousePoint).addPt(offset)
        this.contextMenu.openIn(this.window(), pos, false, "");
        
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
    
    containsWorldPoint: Functions.Null,
    
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
    
    remove: function($super) {
        $super();
        if (!this.fabrik) console.log('no fabrik!!!');
        if (this.fabrik) this.fabrik.removeConnector(this);
    },

    updateArrow: function() {
        var v = this.shape.vertices();
        var toPos = v[v.length-1];
        var fromPos = v[v.length-2];
        this.arrowHead.pointFromTo(fromPos, toPos);
        if (this.pinConnector && this.pinConnector.isBidirectional) {
            if (!this.arrowHeadBack) {
                this.arrowHeadBack = new ArrowHeadMorph(1, this.lineColor, this.lineColor);
                this.addMorph(this.arrowHeadBack);
                this.closeAllToDnD();
            };
            toPos = v[0];
            fromPos = v[1];        
            this.arrowHeadBack.pointFromTo(fromPos, toPos);
        };
    },
    
    updateView: function (varname, source) {
        // console.log("update View for connector");
        if (!this.formalModel) return;
        var start = this.formalModel.getStartHandle();
        if (start) this.setStartPoint(start.getPinPosition());
        var end = this.formalModel.getEndHandle();
        if (end) this.setEndPoint(end.getPinPosition());
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

        // implicit assertion: pinHandle name equals field name of model
        var spec = {};
        spec[fromPinHandle.name] = "=set" + toPinHandle.name;
        fromModel.addObserver(toModel, spec);
        
        console.log("PinConnector says: Connected pin " + fromPinHandle.name + " to pin " + toPinHandle.name);
    },

    // just for make things work ...
    buildView: function() {
        this.morph = new ConnectorMorph(null, 4, Color.blue, this);
        this.morph.formalModel.setStartHandle(this.fromPin.morph);
        this.morph.formalModel.setEndHandle(this.toPin.morph);
        this.morph.connector = this; // for debugging... of course...
        return this.morph;
    },
    
    updateView: function(varname, source) {
        if (!this.morph) this.buildView();
        this.morph.updateView(varname, source);
    },
    
    remove: function() {
        // FIXME: View!!!
        if (this.morph) {
            console.log('remove con');
            this.morph.remove();
        }
    
        // should be removed! Fabrik should not know about connectors!
        if (this.fabrik) this.fabrik.removeConnector(this);

        // FIXME move to PionHandle
        var self = this;
        console.log("remove con from " + this.fromPin.name + " to: " + this.toPin.name);
        this.fromPin.connectors = this.fromPin.connectors.reject(function (ea) { return ea === self}, this);
        this.toPin.connectors = this.toPin.connectors.reject(function (ea) { return ea === self}, this);
        
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
        this.updateView();
    },
});

Morph.subclass('ComponentMorph', {
    
    inset: 7,
    defaultExtent: pt(180,100),

    initialize: function($super, bounds) {
        bounds = bounds || this.defaultExtent.extentAsRectangle();
        $super(bounds, "rect");
        this.closeDnD();
        
        this.linkToStyles(['fabrik']);
        this.shapeRoundEdgesBy(8);
        this.setFillOpacity(0.7);
        this.setStrokeOpacity(0.7);
        
        this.priorExtent = pt(0,0);
        this.priorPosition = pt(0,0);
                
        return this;
    },
    
    setComponent: function(component) {
        this.component = component;
        this.setupWithComponent();
    },
    
    setupWithComponent: function() {
        this.component.setupHandles();
        this.setupHalos();
        this.updateHaloItemPositions();        
    },
    
    changed: function($super) {
        $super();
        if (!this.component) return;
        // update the position of the pins
        var newPos = this.getGlobalTransform().transformPoint(pt(0,0));
        if (!this.pvtOldPosition || !this.pvtOldPosition.eqPt(newPos)) {
            this.pvtOldPosition = newPos;
            this.component.pinHandles.each(function(ea) { if (ea.morph) ea.morph.updatePosition() });
        };
    },
    
    morphMenu: function($super, evt) { 
        var menu = $super(evt);
        var self = this;
        menu.addItem(["add pin named...", function() { 
            WorldMorph.current().prompt('Name for Pin?', function(name) {
                 self.component.addFieldAndPinHandle(name) }, 'Test')}]
             );
        return menu;
    },
    
    okToBeGrabbedBy: function(evt) {
        return this; 
    },
    
    innerBounds: function($super) {
        return $super().insetByRect(pt(this.inset, this.inset).asRectangle());
    },
    
    // addMorph and layout logic
    addMorph: function($super, morph, accessorname) {
        // FIXME: cleanup
        if (morph.formalModel) {
            this.submorphs.each(function(ea) { ea.remove() });
            $super(morph);
            this.setExtent(morph.getExtent().addPt(pt(this.inset * 2, this.inset * 2)));
            morph.setPosition(pt(this.inset, this.inset));
            this.component.adoptToModel(morph.formalModel);
            return morph;
        };

        if (morph.isPinMorph)
            this.addMorphFront(morph)
        else
            this.addMorphBack(morph);

        morph.closeDnD();
        morph.withAllSubmorphsDo(function() {this.closeDnD()});
        
        // FIXME cleanup
        if (this[accessorname]) throw new Error("Added two times same type of morph. See add methods");
        if (accessorname) this[accessorname] = morph;

        // Wrap mouse over to make Halos show everytime
        var self = this;
        var wrapMouseOver = function() {
            this.onMouseOver = this.onMouseOver.wrap(function(proceed, evt) {
                proceed(evt);
                self.showHalos();
            });
        };
        wrapMouseOver.apply(morph);
        morph.withAllSubmorphsDo(wrapMouseOver);

        return morph;
    },
    
    getBoundsAndShrinkIfNecessary: function(minHeight) {
        // assume that we have all the space
        var topLeft = pt(this.inset, this.inset);
        var bottomRight = this.getExtent().subPt(pt(this.inset, this.inset));
        // see if other morphs are there and if yes shrink them so that minHeight fits into this
        var otherRelevantMorphs = this.submorphs.reject(function(ea) { return ea.constructor === PinMorph});
        if (otherRelevantMorphs.length > 0) {
            this.adoptSubmorphsToNewExtent(this.getPosition(), this.getExtent(),
                this.getPosition(), this.getExtent().subPt(pt(0, minHeight)));
            // new topLeft so that we can put morph below the last one. let inset/2 space between morphs
            topLeft = topLeft.addPt(pt(0, bottomRight.y - minHeight - this.inset / 2));
        };
        return rect(topLeft, bottomRight);
    },
    
    addVisualChangeClue: function(textMorph) {
        var changeClue = new Morph(new Rectangle(0,0,5,5));
        changeClue.setFill(Color.red);
        changeClue.ignoreEvents(); 
        textMorph.replaceSelectionWith =  textMorph.replaceSelectionWith.wrap(function(proceed, replacement, delayComposition, justMoreTyping){      
            proceed(replacement, delayComposition, justMoreTyping);
            this.addMorph(changeClue)
        })
        textMorph.doSave = textMorph.doSave.wrap(function(proceed, str) {
            proceed();
            this.removeMorph(changeClue)
        });
    },
    
    // CLEANUp!!!!!!!!!!!!!!!
    addTextPane: function() {
        var minHeight = 70;
        var morph = newTextPane(this.getBoundsAndShrinkIfNecessary(minHeight), "------");
        morph.adoptToBoundsChange = function(ownerPositionDelta, ownerExtentDelta) {
            morph.setExtent(morph.getExtent().addPt(ownerExtentDelta));
        };
        morph.innerMorph().saveContents = morph.innerMorph().saveContents.wrap(function(proceed, contentString) {    
            this.setText(contentString, true /*force new value*/);
        });
        var spec = {fontSize: 12, borderWidth: 0, opacity: 0.9, borderRadius: 3};
        morph.submorphs[0].applyStyle(spec); 
        morph.submorphs[1].applyStyle(spec);
        spec.fill = null;
        morph.innerMorph().applyStyle(spec); 
        spec.borderWidth = 1;
        morph.applyStyle(spec); 

        morph.openForDragAndDrop = false;
        morph.innerMorph().openForDragAndDrop = false;
        morph.okToBeGrabbedBy = this.okToBeGrabbedBy;
        morph.innerMorph().okToBeGrabbedBy = this.okToBeGrabbedBy;
        
        morph.relayMouseEvents(morph.innerMorph(), {onMouseDown: "onMouseDown", onMouseMove: "onMouseMove", onMouseUp: "onMouseUp"});
    
        this.addVisualChangeClue(morph.innerMorph());
        
        return this.addMorph(morph, 'text');
    },

    addLabel: function(label) {
        if (!label) label = "------";
        var minHeight = 15;
        var morph = new TextMorph(this.getBoundsAndShrinkIfNecessary(minHeight),label).beLabel();
        morph.adoptToBoundsChange = function(ownerPositionDelta, ownerExtentDelta) {
            morph.setExtent(morph.getExtent().addPt(ownerExtentDelta));
        };
        return this.addMorph(morph, 'label');
    },
    
    addListPane: function() {
        var minHeight = 80;
        var morph = newRealListPane(this.getBoundsAndShrinkIfNecessary(minHeight));
        morph.adoptToBoundsChange = function(ownerPositionDelta, ownerExtentDelta) {
            morph.setExtent(morph.getExtent().addPt(ownerExtentDelta));
            morph.setPosition(morph.getPosition().addPt(ownerPositionDelta));
        };
        var spec = {fontSize: 12, borderWidth: 0, opacity: 0.75, borderRadius: 3};
        morph.innerMorph().applyStyle(spec); 
        spec.fill = null;
        morph.submorphs[0].applyStyle(spec);
        morph.submorphs[1].applyStyle(spec); 
        spec.borderWidth = 1;
        morph.applyStyle(spec);
        
        morph.openForDragAndDrop = false;
        morph.innerMorph().openForDragAndDrop = false;
        morph.okToBeGrabbedBy = this.okToBeGrabbedBy;
        morph.innerMorph().okToBeGrabbedBy = this.okToBeGrabbedBy;
        
        return this.addMorph(morph, 'textList');
    },
    
    addLabeledText: function(label) {
        var minHeight = 80;
        var morph = new LabeledTextMorph(this.getBoundsAndShrinkIfNecessary(minHeight), label , '-----');
        morph.reshape = morph.reshape.wrap(function(proceed, partName, newPoint, handle, lastCall) {
            proceed(partName, newPoint, handle, lastCall);
            var owner = this.owner;
            if (owner.getExtent().subPt(pt(owner.inset, owner.inset)).y < this.bounds().extent().y) {
                owner.setExtent(this.getExtent().addPt(pt(owner.inset, owner.inset)));
            }
        });
        
        var spec = {borderWidth: 0, opacity: 0.9, borderRadius: 3};
        morph.applyStyle(spec);        
        
        morph.openForDragAndDrop = false;
        morph.innerMorph().openForDragAndDrop = false;
        morph.okToBeGrabbedBy = this.okToBeGrabbedBy;
        morph.innerMorph().okToBeGrabbedBy = this.okToBeGrabbedBy;
        
        return this.addMorph(morph, 'labeledText');
    },
    
    addButton: function(buttonLabel) {
        var height = 22;
        var morph = new ButtonMorph(this.getBoundsAndShrinkIfNecessary(height));
        morph.adoptToBoundsChange = function(ownerPositionDelta, ownerExtentDelta) {
            morph.setPosition(morph.getPosition().addPt(pt(0, ownerExtentDelta.y)));
            morph.setExtent(morph.getExtent().addPt(pt(ownerExtentDelta.x, 0)));
            morph.setPosition(morph.getPosition().addPt(ownerPositionDelta));
        };
        morph.setLabel(buttonLabel);
        return this.addMorph(morph, 'button');
    },

    reshape: function($super, partName, newPoint, handle, lastCall) {
        var insetPt = pt(this.inset, this.inset);
        var priorExtent = this.getExtent().subPt(insetPt);
        var priorPosition = this.getPosition();

        // FIXME: cleanup!!!
        var delta = pt(0,0);
        var self = this.shape;
        this.shape.reshape = function(partName, newPoint, handle, lastCall) {
            var r = self.bounds().withPartNamed(partName, newPoint);
            var newWidth = Math.max(r.width, 50);
            var newHeight = Math.max(r.height, 50);
            delta = r.topLeft().subPt(pt(newWidth - r.width, newHeight - r.height));
            r = new Rectangle(0,0, newWidth, newHeight);                
            self.setBounds(r);
        };
        $super(partName, newPoint, handle, lastCall);
        
        this.adoptSubmorphsToNewExtent(priorPosition,priorExtent, this.getPosition(), this.getExtent().subPt(insetPt))
        this.setPosition(this.getPosition().addPt(delta));
    },
    
    setExtent: function($super, newExt) {
        this.adoptSubmorphsToNewExtent(this.getPosition(), this.getExtent(), this.getPosition(), newExt);
        $super(newExt);
    },

    adoptSubmorphsToNewExtent: function (priorPosition, priorExtent, newPosition, newExtent) {
        var positionDelta = newPosition.subPt(priorPosition);
        var extentDelta = newExtent.subPt(priorExtent);
        var scaleDelta = newExtent.scaleByPt(priorExtent.invertedSafely());
        this.submorphs.select(function(ea) { return ea.adoptToBoundsChange }).each(function(morph) {
            // console.log("adopting to bounds change: " + morph);
            morph.adoptToBoundsChange(positionDelta, extentDelta, scaleDelta, rect(newPosition, newExtent));
        });
    },

    setupMenu: function() {
        this.menuButton = new ButtonMorph(new Rectangle(0, -20, 40, 20));
        this.menuButton.setLabel("Menu");
        this.menuButton.setFill(Color.blue);
        this.menuButton.setFillOpacity(0.5);
        this.halos.addMorph(this.menuButton);
        this.menuButton.connectModel({model: this, setValue: "openComponentMenu"});   
    },
    
    getMenuItems: function() {
        return [["say Hello ", function(){ alert("Hello")}]]
    },
    
    openComponentMenu: function(buttonDown) {
        if (!buttonDown) return;
        if (this.componentMenu)
            this.componentMenu.remove();
        this.componentMenu = new MenuMorph(this.getMenuItems(), this);
        this.componentMenu.openIn(this, this.menuButton.getPosition());
    },

    setupHalos: function() {
        this.halos = new Morph();
        // to be replace by some general layout mechanism ... aber kloar
        var self = this;
        this.halos.setExtent(this.getExtent());
        this.halos.adoptToBoundsChange = function(ownerPositionDelta, ownerExtentDelta) {
            self.halos.setExtent(self.halos.getExtent().addPt(ownerExtentDelta));
            self.updateHaloItemPositions();
        };
        this.halos.setFill(null);
        this.halos.setBorderWidth(0);
        this.halos.ignoreEvents();
        this.setupHaloItems();
    },
    
    setupHaloItems: function() {
        this.closeHalo = this.addHaloItem("X", new Rectangle(0, 0, 20, 20), 
            {relativePosition: pt(1,0), positionOffset: pt(0, -20)},
            {fill: Color.red, fillOpacity: 0.5});
        this.closeHalo.connectModel(Relay.newInstance({Value: "=onRemoveButtonPress"}, this));
    },
    
    updateHaloItemPositions: function() {
        this.halos.submorphs.each(function(ea){
            var newPos = ea.layoutFrame.relativePosition.scaleByPt(this.getExtent());
            newPos = newPos.addPt(ea.layoutFrame.positionOffset);
            ea.setPosition(newPos);
        }, this)
        //this.closeHalo.setPosition(pt(this.getExtent().x - 0, -20));
    },
    
    onRemoveButtonPress: function(value) {
        // if (value) return;
        this.remove()
    },
    
    showHalos: function() {
        if (this.halos) {
            if (this.handObserver) return; // we are not finished yet
            var self = this;
            this.addMorph(this.halos);
            this.updateHaloItemPositions();
            this.handObserver = new HandPositionObserver(function(value) {
                if (!self.owner || !self.bounds().expandBy(10).containsPoint(self.owner.localize(value))) {
                    self.removeMorph(self.halos);
                    this.stop();
                    self.handObserver = null;
                };
            });
            this.handObserver.start();
        }        
    }, 
    
    addHaloItem: function(label, bounds, layoutFrame, style) {
        var button = new ButtonMorph(bounds ||  new Rectangle(0, -20, 40, 20));
        button.setLabel(label || "----");       
        button.applyStyle(style || {});
        button.layoutFrame = layoutFrame || {relativePosition: pt(0,0), positionOffset: pt(0,0)};
        this.halos.addMorph(button);
        return button;
    },
    
    onMouseOver: function() {
        this.showHalos();
    },
    
    allPinMorphs: function() {
       return this.submorphs.select(function(ea){return ea.isPinMorph})
    },
    
    allConnectors: function() {
        return this.allPinMorphs().inject([], function(all, ea){
            return all.concat(ea.pinHandle.connectors)
        })
    },
    
    remove: function($super) {
        $super();
        this.allConnectors().each(function(ea){ea.remove()})
    },
  
});

/*
 * The basic component
 */
Widget.subclass('Component', {
    
    morphClass: ComponentMorph,
    
    initialize: function() {
        this.formalModel = NewComponentModel.instantiateNewClass();
        this.pinHandles = [];
    },

    buildView: function(optExtent) {
        var bounds = optExtent && optExtent.extentAsRectangle();
        this.panel = new this.morphClass(bounds);
        this.morph = this.panel;
        this.panel.setComponent(this);
        // this.setupHandles();
        // Fix for adding to Fabrik with addMorph()
        return this.panel;
    },
             
    addField: function(fieldName, coercionSpec, forceSet) {
        this.formalModel.addField(fieldName, coercionSpec, forceSet);
        this.pvtCreateAccessorsForField(fieldName);
    },
    
    addFieldAndPinHandle: function(field, coercionSpec, forceSet) {
        this.addField(field, coercionSpec, forceSet);
        return this.addPinHandle(field);
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
        if (this.morph) this.setupPinHandle(pinHandle);
        return pinHandle;
    },
    
    // deprecated, use getPin!
    getPinHandle: function(pinName) {
        console.log('looking for pinHandle named ' + pinName);
        return this.pinHandles.detect(function(ea) {console.log(ea.name); return ea.name == pinName});
    },
    
    getPin: function(pinName) {
        return this.getPinHandle(pinName);
    },

    inputPins: function() {
        return this.pinHandles.select(function(ea){return ea.isInputPin})
    },

    toString: function($super){
        return $super() + this.name
    },

    // move this to morph!! Just say addNewPinHandle. Morph must figure out where it should go.
    setupHandles: function() {
        if (!this.panel) return;
        var offset = this.panel.bounds().height / 2 - 10;
        this.pinHandles.each(function(handle) {
            if (!handle.morph) this.setupPinHandle(handle);
            handle.morph.setPosition(pt(-1 * (handle.morph.getExtent().x / 2), offset));
            offset += handle.morph.bounds().height + 10;
        }, this);
    },
    
    setupPinHandle: function(pin) {
        pin.buildView();
        this.panel.addMorph(pin.morph);
        pin.morph.openForDragAndDrop = false;
    },
    
    addTextMorphForFieldNamed: function(fieldName) {
        if (!this.panel) throw new Error('Adding morph before base morph (panel exists)');
        this.morph = this.panel.addTextPane().innerMorph();
        this.morph.formalModel = this.formalModel.newRelay({Text: fieldName});
        var spec = {}; spec[fieldName] = '!Text';
        this.formalModel.addObserver(this.morph, spec);
        return this.morph
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

/* Morph and Component for encapsulating other components */
ComponentMorph.subclass('FabrikMorph', {
        
    automaticLayout: function() {
        (new FlowLayout()).layoutElementsInMorph(this.fabrik.components, this);
    },
    
    setupForFabrik: function(fabrik){
         this.fabrik = fabrik;
         this.fabrik.components.each(function(ea) {this.addMorphForComponent(ea) }, this);
         this.fabrik.connectors.each(function(ea) {this.addMorph(ea.buildView())}, this);        
    },
    
    setupHaloItems: function($super) {
        $super();        
        var grabHalo = this.addHaloItem("grap",  new Rectangle(0,0,45,20),
            {relativePosition: pt(1,0), positionOffset: pt(-45,0)}, 
            {fill: Color.green, fillOpacity: 0.5});
        
        grabHalo.connectModel(Relay.newInstance({Value: '=grabbed'}, {grabbed: function() { this.pickMeUp() }.bind(this)}));
        // evalHalo.getHelpText = function(){return "accept text in component [alt+s]"}
    },
    
    addMorph: function($super, morph) {
        // don't let loose ends lie around
        if (morph.pinHandle && morph.pinHandle.isFakeHandle) {
            throw new Error("Pin dropped on fabrik, this should not happen any more")
        };
        
        if (morph.constructor === FabrikMorph) {
            console.log("got another fabrik!!!");
        };
        // dropping components into the fabrik component...!
        if (morph.component) this.fabrik.plugin(morph.component);
        
        
        if (morph.isConnectorMorph) return this.addMorphFront(morph);
        else return this.addMorphBack(morph);
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
Component.subclass('FabrikComponent', {

    morphClass: FabrikMorph,
    defaultViewExtent: pt(750,500),
    defaultViewTitle: "FabrikComponent",

    initialize: function($super) {
        $super(null);
        this.components = [];
        this.connectors = [];
        return this;
    },
  
    buildView: function($super, optExtent) {
        //console.log("buildView for " + this);
        // this.panel = PanelMorph.makePanedPanel(this.viewExtent || optExtent || this.defaultViewExtent,
        //     [['playfield', function(initialBounds){ return new FabrikMorph(initialBounds) }, pt(1,1).extentAsRectangle()]]
        // );
        // this.morph = this.panel.playfield;
        
        $super(optExtent || this.defaultViewExtent);
        this.panel.fabrik = this;
        
        
        this.morph.setupForFabrik(this);
        // this.panel.linkToStyles(['fabrik']);
        this.morph.linkToStyles(['fabrik']);
            
        return this.panel;
    },

    // can be called when this.morph does not exist, simply adds components and wires them
    plugin: function(component) {
        if (this.components.include(component)) {
            console.log('FabrikComponent.plugin(): ' + component + 'was already plugged in.');
            return;
        }
        this.components.push(component);
        component.fabrik = this; // remember me
        if (this.morph) this.morph.addMorphForComponent(component);
        return component;
    },

    pluginConnector: function(connector) {
        if (this.connectors.include(connector)) {
            console.log("Plugin connector failed: " + connector + " is already plugged in!");
            return;
        };        
        this.connectors.push(connector);
        // argh! is this really necessary??
        connector.fabrik = this;
        
        if (this.morph) {
            this.morph.addMorph(connector.buildView());
            connector.updateView();
        };
        return connector;
    },

    connectPins: function(fromPinHandle, toPinHandle) {
        console.log("Fabrik>>connectPins(" + fromPinHandle + ", " + toPinHandle + ")");
        if (!fromPinHandle || !toPinHandle) {
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
        if (!this.connectors.include(connector)) {
            console.log('FabrikComponent>>removeConnector: tried to remove connector, which is not there');
        };
        console.log('Removing connectir')
        this.connectors = this.connectors.reject(function(ea) { return ea === connector });
        this.morph.removeMorph(connector.morph);
    },

    // setup after the window is opened
    openIn: function($super, world, location) {
        var result = $super(world, location);
        result.setExtent(this.defaultViewExtent); // FIXME: 1000 places were extent is set... arghhh!
        this.morph.openForDragAndDrop = true;
        return result;
    }
});

Component.subclass('PluggableComponent', {
    
    buildView: function($super, extent) {
        $super(extent);
        this.morph.openDnD();
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
});
    
ComponentMorph.subclass('TextComponentMorph', {
        
    setupWithComponent: function($super) {
        $super();
        this.text = this.component.addTextMorphForFieldNamed('Text')
    },
    
    setupHaloItems: function($super) {
        $super();        
        var evalHalo = this.addHaloItem("accept",  new Rectangle(0,0,45,20),
            {relativePosition: pt(1,1), positionOffset: pt(-45,2)}, 
            {fill: Color.green, fillOpacity: 0.5});
        evalHalo.connectModel({model: this, setValue: "onAcceptPressed"});
        evalHalo.getHelpText = function(){return "accept text in component [alt+s]"}
    },  
    
    onAcceptPressed: function(value) {
        this.text.doSave()
    },    
});
     
Component.subclass('TextComponent', {
    
    morphClass: TextComponentMorph,
 
    initialize: function ($super) {
        $super();
        this.addFieldAndPinHandle('Text', {to: String});
    },

    buildView: function($super) {
        $super();
        this.setupHandles();
        return this.panel;
    },
});

ComponentMorph.subclass('FunctionComponentMorph', {

    setupWithComponent: function($super) {
        $super();
        var label = this.addLabel();
        label.connectModel(this.component.formalModel.newRelay({Text: "-FunctionHeader"}), true);        
        this.functionBodyMorph = this.component.addTextMorphForFieldNamed('FunctionBody');
    },

    setupHaloItems: function($super) {
        $super();
         var inputHalo = this.addHaloItem("+input", new Rectangle(0,0,45,20),
            {relativePosition: pt(0,0), positionOffset: pt(0,-20)},
            {fill: Color.blue, fillOpacity: 0.5});
        inputHalo.connectModel({model: this.component, setValue: "interactiveAndNewInputField"});
        
        var evalHalo = this.addHaloItem("eval",  new Rectangle(0,0,45,20),
            {relativePosition: pt(1,1), positionOffset: pt(-45,0)}, 
            {fill: Color.green, fillOpacity: 0.5});
        evalHalo.connectModel({model: this.component, setValue: "evalButtonPressed"});
    },
    
    setupTextField: function() {
        var self = this;
        this.functionBodyMorph.boundEval = this.functionBodyMorph.boundEval.wrap(function(proceed, str) {
            var source = self.component.pvtGetFunction(str);			
            return eval(source).apply(self.component, self.component.parameterValues());
        });
    }
    
         
});

Component.subclass('FunctionComponent', {

    morphClass: FunctionComponentMorph,

    initialize: function ($super) { // fix here...
        $super();
        this.addField("FunctionBody");
        this.addField("FunctionHeader");
        this.addFieldAndPinHandle("Result");
        this.addInputFieldAndPin("Input");
        this.setupAutomaticExecution();
    },
    
    buildView: function($super, extent) {
        $super(extent)

        

        this.panel.setupTextField();
        
        this.setupHandles();
        
        // FIXME cleanup
        var input = this.getPinHandle("Input").morph;
        input.setupInputMorphStyle();
        input.setPosition(pt(-1 * input.getExtent().x / 2, 
            (this.panel.getExtent().y / 2) - (input.getExtent().y / 2)));
        
        var result = this.getPinHandle("Result").morph;
        result.setPosition(pt(this.panel.getExtent().x - (input.getExtent().x / 2), 
            (this.panel.getExtent().y / 2) - (input.getExtent().y / 2)));
        
        return this.panel;
    },

    guessNewInputFieldName: function() {
        return "Input" + (this.inputPins().length + 1)
    },
    
    evalButtonPressed: function(buttonDown) {
        if(buttonDown) return;
        this.saveAndExecute();
    },
    
    interactiveAndNewInputField: function(buttonDown) {
        if (buttonDown) return;
        var name = this.guessNewInputFieldName();
        WorldMorph.current().prompt('Name for Input Pin?', function(name) {
            this.addInputFieldAndPin(name);
        }.bind(this), name)
    },
    
    addInputFieldAndPin: function(name) {
        this.addFieldAndPinHandle(name);
        this.getPinHandle(name).becomeInputPin();
        this.updateFunctionHeader();
    },
    
    saveAndExecute: function() {
        this.morph.doSave();
        this.execute();
    },

    setupAutomaticExecution: function(){
        this.formalModel.addObserver({onFunctionBodyUpdate: function() {
            this.setResult(null); // force an update
            this.execute()
        }.bind(this)});
        // arg, thats dirty. addFieldAndPinHandle automatically adds an observer for all pins...
        // solve this with input/output pins!
        this.formalModel.removeObserver(null, 'Result');
    },
    
    addFieldAndPinHandle: function($super, field, coercionSpec) {
        var result = $super(field, coercionSpec);
        // for automatic execution when input values change
        var specObj = {};
        specObj['on' + field + 'Update'] = function() { this.execute() }.bind(this);
        this.formalModel.addObserver(specObj);
        return result;
    },
      
    parameterNames: function() {
        return this.inputPins().collect(function(ea){return ea.name.toLowerCase()}); 
    },  

    parameterValues: function() {
        return this.inputPins().collect(function(ea){return ea.getValue()}); 
    },  

    functionHeader: function() {
        return  'function f(' + this.parameterNames() + ')';
    },

    updateFunctionHeader: function() {
        this.setFunctionHeader(this.functionHeader());
    },

    pvtGetFunction: function(body) {
        body = body || this.getFunctionBody();
        if(!body) return function(){};
        this.updateFunctionHeader();
        var funcSource = "var x = "+ this.getFunctionHeader();
        if(this.getFunctionBody().match(/return /))
            funcSource += " { " + this.getFunctionBody() + "}; x";
        else
            funcSource += " { return eval(" + this.getFunctionBody() + ")}; x"; // implicit return
        try {
            return eval(funcSource);
        } catch(e) {
            console.log("Error when evaluating:" + funcSource + " error: " + e.msg);
            return function(){} // do nothing
        }
    },

    execute: function() {
        try {
            this.setResult(this.pvtGetFunction().apply(this, this.parameterValues()));
            console.log("Result of function call: " + this.getResult());
        } catch(e) {
            console.log("FunctionComponentModel: error " + e + " when executing " + this.pvtGetFunction);
            throw e;
        }
    },
});

Component.subclass('WebRequestComponent', {
    
    initialize: function ($super) {
        $super();
        this.addFieldAndPinHandle("URL", null, true); // force sets even if value the same
        this.addFieldAndPinHandle("ResponseText");
        this.addFieldAndPinHandle("ResponseXML");
        
        this.formalModel.addObserver({onURLUpdate: function() { this.makeRequest() }.bind(this)});
        this.formalModel.addObserver({onResponseTextUpdate: function() { console.log('getting response...') }});
    },
    
    buildView: function($super, optExtent) {
        $super(optExtent);

        this.morph = this.panel.addLabeledText('Url').innerMorph();;            
        this.morph.formalModel = this.formalModel.newRelay({Text: 'URL'});
        this.formalModel.addObserver(this.morph, {URL: '!Text'});
        
        this.setupHandles();
        return this.panel;
    },
    
    setupHandles: function($super) {
        $super();
        var morph = this.getPin("URL").morph;
        morph.setPosition(pt(-1 * (morph.getExtent().x / 2), this.panel.getExtent().y / 2));
        // FIXME: positions below are not really correct, but when scaling the pins, things get messed up...
        var morph = this.getPin("ResponseText").morph;
        morph.setPosition(pt(this.panel.getExtent().x - morph.getExtent().x / 2, this.panel.getExtent().y * 1/4));
        var morph = this.getPin("ResponseXML").morph;
        morph.setPosition(pt(this.panel.getExtent().x - morph.getExtent().x / 2, this.panel.getExtent().y * 3/5));  
    },
    
    makeRequest: function() {
        console.log('making reqest to: ' + this.getURL());
        // var x = new Resource(this.formalModel.newRelay({URL: '-URL', ContentText: '+ResponseText', ContentDocument: '+ResponseXML'}));
        
        var x = new Resource(Record.newPlainInstance({URL: this.getURL(), ContentText: '', ContentDocument: null}));
        x.formalModel.addObserver({onContentTextUpdate: function(response){ this.setResponseText(response) }.bind(this)});
        x.formalModel.addObserver({onContentDocumentUpdate: function(response){ this.setResponseXML(new XMLSerializer().serializeToString(response))}.bind(this)});
        
        x.fetch();
    }
});

asStringArray = function(input) {
    var list = $A(input);
    if (list.length == 0) 
        return ["------"];  // awful hack around the bug that TextLists break when empty
    return list.collect(function(ea){return ea.toString()});    
};

Component.subclass('TextListComponent', {

    initialize: function ($super) {
           $super();
           this.addFieldAndPinHandle('List', {to: asStringArray});
           this.addFieldAndPinHandle('Selection');
           this.setList([]);
    },

    buildView: function($super, optExtent) {
        $super(optExtent);
        this.morph = this.panel.addListPane().innerMorph();
        this.morph.connectModel(this.formalModel.newRelay({List: "List", Selection: "Selection"}));
        this.setupHandles();
        return this.panel;
    }
    
}),

Widget.subclass('ComponentBox', {

    viewTitle: "Fabrik Component Box",
    viewExtent: pt(540,300),
    
    initialize: function($super) { 
        $super();
        this.model = NewComponentModel.instantiateNewClass();
    },
    
    addMorphOfComponent: function(comp, createFunc, optExtent) {
        var m = comp.buildView();
        
        m.setExtent(optExtent || pt(120, 100));
        
        m.withAllSubmorphsDo(function() {
            this.handlesMouseDown = Functions.True;
            this.okToBeGrabbedBy = function() {
                return createFunc();
            };
            this.onMouseDown = function(evt) {
                    var compMorph = createFunc();
                    evt.hand.addMorph(compMorph);
                    compMorph.setPosition(pt(0,0));
            };
        });

        var textHeight = 30;
        var wrapper = new ClipMorph(m.getExtent().addPt(pt(0,textHeight)).extentAsRectangle(), "rect");
        wrapper.addMorph(m);
        var text = new TextMorph(pt(0,m.getExtent().y).extent(m.getExtent().x, wrapper.getExtent().y), comp.constructor.type);
        text.beLabel();
        wrapper.addMorph(text);
        this.panel.addMorph(wrapper);
    },
    
    buildView: function(extent) {
        var model = this.model;
        var panel = new PanelMorph(this.viewExtent);
        this.panel = panel;
        
        panel.applyStyle({borderWidth: 2,
            fill: new LinearGradient([Color.white, 1, Color.primary.blue], LinearGradient.NorthSouth)});


        this.addMorphOfComponent(new FabrikComponent(), function() {
            var fabrik = new FabrikComponent(pt(400,400));
            fabrik.viewTitle = 'Fabrik';
            fabrik.openIn(WorldMorph.current(), WorldMorph.current().hands.first().getPosition());
            return fabrik.panel.owner;
        });
        
        var defaultCreateFunc = function(theClass, optExtent) {
            return new theClass().buildView(optExtent);
        };
        
        this.addMorphOfComponent(new FunctionComponent(), defaultCreateFunc.curry(FunctionComponent));
        this.addMorphOfComponent(new TextComponent(), defaultCreateFunc.curry(TextComponent));
        this.addMorphOfComponent(new PluggableComponent(), defaultCreateFunc.curry(PluggableComponent));
        this.addMorphOfComponent(new TextListComponent(), defaultCreateFunc.curry(TextListComponent));
        this.addMorphOfComponent(new WebRequestComponent(), defaultCreateFunc.curry(WebRequestComponent, pt(220,50)), pt(220,50));
                
        new FlowLayout(this.panel).layoutSubmorphsInMorph();
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
        if(!this.points) return;
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
    
    initialize: function(morphToLayout) {
        this.morphToLayout = morphToLayout;
        this.inset = 20; 
        this.positionX = this.inset;
        this.positionY = this.inset;
        this.maxHeight = 0;
    },
    
    layoutSubmorphsInMorph: function() {
        this.morphToLayout.submorphs.each(function(ea) {
            this.setPositionFor(ea);
        }, this);
    },
    
    layoutElementsInMorph: function(components, morph) {
        this.morphToLayout = morph;
        components.each(function(ea) { this.setPositionFor(ea.panel) }, this);
    },
    
    setPositionFor: function(submorph) {
        var bounds = submorph.bounds();
        if ((this.positionX + bounds.width + this.inset) > this.morphToLayout.bounds().right()) {
            this.positionX = this.inset; // start left
            this.positionY += this.maxHeight + this.inset; // on a new line
            this.maxHeight = 0; // and reset maxHeigth for that new line
        };
        submorph.setPosition(pt(this.positionX, this.positionY));
        this.positionX += bounds.width + this.inset;
        if (bounds.height > this.maxHeight) this.maxHeight = bounds.height;
    }

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
        if (this.func)
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
Morph.subclass("FabrikClockMorph", {
    borderWidth: 2,
    openForDragAndDrop: false,

    initialize: function($super, position, radius) {
        $super(position.asRectangle().expandBy(radius), "ellipse");
        this.formalModel = Record.newPlainInstance({Minutes: null, Seconds: null, Hours: null});
        this.linkToStyles(['clock']);
        this.makeNewFace(['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI']);  // Roman
        return this;
    },

    makeNewFace: function(items) {
        var bnds = this.innerBounds();
        var radius = bnds.width/2;
        var labelSize = Math.max(Math.floor(0.04 * (bnds.width + bnds.height)), 2); // room to center with default inset

        for (var i = 0; i < items.length; i++) {
            var labelPosition = bnds.center().addPt(Point.polar(radius*0.85, ((i-3)/items.length)*Math.PI*2)).addXY(labelSize/2, 0);
            var label = new TextMorph((pt(labelSize*3, labelSize).extentAsRectangle()), items[i]);
            label.applyStyle({borderWidth: 0, fill: null, wrapStyle: lk.text.WrapStyle.Shrink, fontSize: labelSize, padding: Rectangle.inset(0)});
            label.align(label.bounds().center(), labelPosition.addXY(1, 0));
            this.addMorph(label);
        }

        this.hours   = this.addMorph(Morph.makeLine([pt(0,0), pt(0, -radius*0.50)], 4, Color.blue));
        this.minutes = this.addMorph(Morph.makeLine([pt(0,0), pt(0, -radius*0.70)], 3, Color.blue));
        this.seconds = this.addMorph(Morph.makeLine([pt(0,0), pt(0, -radius*0.75)], 2, Color.red));

        this.updateHands();
        this.changed(); 
    },

    reshape: function(a,b,c,d) { /*no reshaping*/ },

    startSteppingScripts: function() {
        this.startStepping(1000, "updateHands"); // once per second
    },

    updateHands: function() {
        var currentDate = new Date();
        var seconds     = currentDate.getSeconds();
        var minutes     = currentDate.getMinutes() + seconds/60
        var hours       = currentDate.getHours() + minutes/60
        this.setHands(seconds, minutes, hours);
    },

    setHands: function(seconds, minutes, hours) {
        this.formalModel.setMinutes(minutes);
        this.formalModel.setHours(hours);
        this.formalModel.setSeconds(seconds);

        this.hours.setRotation(hours/12*2*Math.PI);
        this.minutes.setRotation(minutes/60*2*Math.PI);
        this.seconds.setRotation(seconds/60*2*Math.PI); 
    }

});

/*
* Helper functions for debugging
*/
function emptyString(length){
    for(var s=""; s.length < length ; s += " ") {}  
    return s
};

function logTransformChain(morph, indent, result) {
    if (!result)
    result = ""
    if (!indent)
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
        return func.call()
    } catch(e) {
        errObj.err = e;
        Function.installStackTracers("uninstall");
        var viewer = new ErrorStackViewer(errObj)
        viewer.openIn(WorldMorph.current(), pt(220, 10));
    };
};

newFakeMouseEvent = function(point) {
    var rawEvent = {type: "mousemove", pageX: 100, pageY: 100, altKey: false, shiftKey: false, metaKey: false}; 
    var evt = new Event(rawEvent);
    evt.hand = WorldMorph.current().hands.first();
    if (point) evt.mousePoint = point;
    return evt;
};
