
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
 * - ComponentModel
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

module('lively.Fabrik').requires('Helper.js').toRun(function() {

// logMethod(Morph.prototype, 'onMouseDown');

Global.Fabrik = {
    
    positionComponentRelativeToOther: function(comp, otherComp, relPos) {
        comp.panel.setPosition(otherComp.panel.getPosition().addPt(relPos));
    },

    setPositionRel: function(relPos, morph) {
        console.assert(morph.owner, 'no owner');
        morph.setPosition(relPos.scaleByPt(morph.owner.getExtent()));
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
    
    addFabrikComponent: function(toComponent, title) {
        var c = new FabrikComponent();
        c.viewTitle = title;
        toComponent.plugin(c);
        // c.panel.setExtent(pt(220,50));
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
        c.defaultViewExtent = extent;
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
        c1.getPinHandle("Text").connectTo(c2.getPinHandle("Text"));
        c2.getPinHandle("Text").connectTo(c3.getPinHandle("Text"));
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
        
        var m1 = Morph.makeRectangle(100,100,30,30);
        var m2 = Morph.makeRectangle(200,200, 30,30);
        m1.getPinPosition = function(){return this.getPosition()};
        m2.getPinPosition = m1.getPinPosition;  

        m1.changed = function(){c.updateView()};
        m2.changed = function(){c.updateView()};
        
        world = WorldMorph.current();
        world.addMorph(c);
        world.addMorph(m1);
        world.addMorph(m2);

        // FIXME Why isnt this handled at a central point?????
        c.formalModel = ComponentModel.newModel();
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
            return ["FabrikMorph", "FabrikComponent", "ComponentModel", "PinMorph", "PinHandle", "ConnectorMorph", 
                "Component",  "TextComponent", "FunctionComponent", "ComponentBox", "PointSnapper", "FlowLayout"]
        };
        Global.allClassNames = function() {
            var classNames = [];
            Class.withAllClassNames(Global, function(n) { n.startsWith('SVG') || classNames.push(n)});
            return classNames;
        };
        Global.allMethodsFor = function(className) {
            if (className == null) return [];
            return Class.forName(className).localFunctionNames().sort();
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
        if (!loc) loc = pt(120, 110);
        var f = this.openFabrikComponent(world, loc, pt(730, 170), 'WebRequest Example');

        var urlHolder = this.addTextComponent(f);
        urlHolder.setText("http://www.webservicex.net/CurrencyConvertor.asmx/ConversionRate?FromCurrency=USD&ToCurrency=EUR");

        var req = this.addWebRequestComponent(f);

        var result = this.addTextComponent(f);

        f.morph.automaticLayout();

        return f;
    },

    openFabrikWeatherWidgetExample: function(world, loc) {
        if (!loc) loc = pt(100, 100);
        
        
        
        var base = this.openFabrikComponent(world, loc.addXY(-50,-20), pt(800, 400), 'Current Weather Conditions');
        // var urlInput = this.addTextComponent(base); urlInput.panel.setExtent(pt(180,60));
        var zipInput = this.addTextComponent(base); zipInput.panel.setExtent(pt(100,50));
        
        /* 
         * Building the requester Fabrik
         */
        var requestor = this.openFabrikComponent(world, loc, pt(700, 250), 'Request Weather');
        requestor.morph.owner.remove(); // FIXME hack so that window morph disappears...
        base.morph.addMorph(requestor.morph);
        requestor.morph.setExtent(pt(700,250));
        requestor.morph.setPosition(pt(50,50));
        
        /* Pins */
        // var urlPin = requestor.addPin('URL'); this.setPositionRel(pt(0.1, 0), urlPin.morph);
        var zipPin = requestor.addPin('ZIP'); this.setPositionRel(pt(0.2, 0), zipPin.morph);
        var infoPin = requestor.addPin('Info'); this.setPositionRel(pt(0.9, 0.96), infoPin.morph);
        var conditionsPin = requestor.addPin('Conditions'); this.setPositionRel(pt(0.8, 0.96), conditionsPin.morph);
        // urlInput.getPin('Text').connectTo(urlPin);
        zipInput.getPin('Text').connectTo(zipPin);
        
        /* Function component for combining url and zip */
        var combineURLAndZIP = this.addFunctionComponent(requestor);
        // var pin = combineURLAndZIP.addIncputFieldAndPin('Url'); this.setPositionRel(pt(-0.04,0.33), pin.morph);
        combineURLAndZIP.addInputFieldAndPin('Zip');
        combineURLAndZIP.removePin('Input');
        zipPin.connectTo(combineURLAndZIP.getPin('Zip'));
        // urlPin.connectTo(combineURLAndZIP.getPin('Url'));

        /* WebRequestor */
        var req = this.addWebRequestComponent(requestor);
        combineURLAndZIP.getPin('Result').connectTo(req.getPin('URL'));
                
        /* Lists for extracting Information */
        var infoList = this.addTextListComponent(requestor);
        // debugger;
        req.getPin('ResponseXML').connectTo(infoList.getPin('List'));
        infoList.getPin('Selection').connectTo(infoPin);
        var conditionList = this.addTextListComponent(requestor);
        conditionList.getPin('Selection').connectTo(conditionsPin);
        req.getPin('ResponseXML').connectTo(conditionList.getPin('List'));
        
        requestor.morph.automaticLayout();
        requestor.morph.collapseToggle(true);
        
        // Base fabrik: create data processing components
        var extractInfos = this.addFunctionComponent(base);
        extractInfos.removePin('Result');
        var cityPin = extractInfos.addPin('City'); this.setPositionRel(pt(0.96, 0.3), cityPin.morph);
        var datePin = extractInfos.addPin('Date'); this.setPositionRel(pt(0.96, 0.6), datePin.morph);
        extractInfos.setFunctionBody('if (input) { \n var infos = input.js.forecast_information; \n this.setCity(infos.city); \n this.setDate(infos.forecast_date); \n }');
        
        var extractCondition = this.addFunctionComponent(base);
        extractCondition.removePin('Result');
        var conditionPin = extractCondition.addPin('Condition'); this.setPositionRel(pt(0.96, 0.2), conditionPin.morph);
        var tempPin = extractCondition.addPin('Temp'); this.setPositionRel(pt(0.96, 0.4), tempPin.morph);
        var humidityPin = extractCondition.addPin('Humidity'); this.setPositionRel(pt(0.96, 0.6), humidityPin.morph);
        var windPin = extractCondition.addPin('Wind'); this.setPositionRel(pt(0.96, 0.8), windPin.morph);
        var imagePin = extractCondition.addPin('Image'); this.setPositionRel(pt(0.5, 0.96), imagePin.morph);
        extractCondition.setFunctionBody('if (input) {\n var infos = input.js.current_conditions; \n this.setCondition(infos.condition); \n this.setTemp(infos.temp_c + "°C / " + infos.temp_f + "°F"); \n this.setHumidity(infos.humidity); \n this.setWind(infos.wind_condition); \n this.setImage("http://www.google.com/ig" + infos.icon);\n }');
                
        // add the 'UI'
        var extent = pt(80,50);
        var cityTxt = this.addTextComponent(base);
        cityTxt.panel.setExtent(extent);
        cityPin.connectTo(cityTxt.getPin('Text'));
        
        var dateTxt = this.addTextComponent(base);
        dateTxt.panel.setExtent(extent);
        datePin.connectTo(dateTxt.getPin('Text'));
        
        var conditionTxt = this.addTextComponent(base);
        conditionTxt.panel.setExtent(extent);
        conditionPin.connectTo(conditionTxt.getPin('Text'));
        
        var tempTxt = this.addTextComponent(base);
        tempTxt.panel.setExtent(extent);
        tempPin.connectTo(tempTxt.getPin('Text'));
        
        var humidityTxt = this.addTextComponent(base);
        humidityTxt.panel.setExtent(extent);
        humidityPin.connectTo(humidityTxt.getPin('Text'));
        
        var windTxt = this.addTextComponent(base);
        windTxt.panel.setExtent(extent);
        windPin.connectTo(windTxt.getPin('Text'));        
        
        base.morph.automaticLayout();
        
        var dist = 0;
        [tempTxt, conditionTxt, humidityTxt, windTxt].each(function(ea) { ea.panel.setExtent(pt(220,35)) });
        conditionTxt.panel.setPosition(pt(290, 250));
        this.positionComponentRelativeToOther(tempTxt, conditionTxt, pt(0, conditionTxt.panel.getExtent().y + dist));
        this.positionComponentRelativeToOther(humidityTxt, tempTxt, pt(0, tempTxt.panel.getExtent().y + dist));
        this.positionComponentRelativeToOther(windTxt, humidityTxt, pt(0, humidityTxt.panel.getExtent().y + dist));
        
        this.positionComponentRelativeToOther(cityTxt, conditionTxt, pt(0, -1*(cityTxt.panel.getExtent().y + dist)));
        this.positionComponentRelativeToOther(dateTxt, cityTxt, pt(conditionTxt.panel.getExtent().x-dateTxt.panel.getExtent().x, 0));
        
        extractCondition.panel.setExtent(pt(255.0,145.0));
        this.positionComponentRelativeToOther(extractCondition, windTxt, pt(0 - extractCondition.panel.getExtent().x - 30, windTxt.panel.getExtent().y - extractCondition.panel.getExtent().y));
        extractInfos.panel.setExtent(pt(255.0,145.0));
        this.positionComponentRelativeToOther(extractInfos, windTxt, pt(windTxt.panel.getExtent().x + 30, windTxt.panel.getExtent().y - extractInfos.panel.getExtent().y));
        
        zipInput.panel.setExtent(pt(220,35));
        this.positionComponentRelativeToOther(zipInput, cityTxt, pt(0, -1*(zipInput.panel.getExtent().y + dist)));
        
        
        // get things going
        infoList.setSelectionIndex(1);
        conditionList.setSelectionIndex(10);
        zipInput.setText('12685');
        combineURLAndZIP.setFunctionBody("'http://www.google.com/ig/api?weather=' + zip");
        
        
        
        return base;
    },
    
    openCurrencyConverterExample: function(world, loc) {
        // the next variables are intentionally defined global
        if (!loc) loc = pt(10,10);
        var f = this.openFabrikComponent(world, loc, pt(940,270), 'Currency Converter');

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
        f1.setFunctionBody("input * 9/5 + 32");

        var fahrenheit = this.addTextComponent(f);
        fahrenheit.setText("");

        var f2 = this.addFunctionComponent(f);
        //f4.addFieldAndPinHandle('Input');
        f2.setFunctionBody("(input - 32) * 5/9");

        f.connectComponents(celsius, "Text", f1, "Input");
        f.connectComponents(f1, "Result", fahrenheit, "Text");

        // f.connectComponents(fahrenheit, "Text", f3, "Input");
        // f.connectComponents(f3, "Result", f4, "Input");
        // f.connectComponents(f4, "Result", celsius, "Text");

        f.morph.automaticLayout();

        // some manual layouting
        // f3.panel.setPosition(f1.panel.getPosition().addPt(pt(0,f1.panel.getExtent().y + 20)));
        // f4.panel.setPosition(f2.panel.getPosition().addPt(pt(0,f2.panel.getExtent().y + 20)));
        //f4.panel.setPosition(f2.panel.getPosition().addPt(pt(0,f2.panel.getExtent().y - 10)));
        this.positionComponentRelativeToOther(f2, f1, pt(0, f1.panel.getExtent().y + 20));
        celsius.panel.setPosition(celsius.panel.getPosition().addPt(pt(0,celsius.panel.getExtent().y / 2)));
        fahrenheit.panel.setPosition(fahrenheit.panel.getPosition().addPt(pt(0,(fahrenheit.panel.getExtent().y + 20) / 2)));

        return f;
    },


    openFahrenheitCelsiusExampleSimple: function(world, loc) {
        if (!loc) loc = pt(100, 100);
        var f = this.openFabrikComponent(world, loc, pt(940,270), 'Celsius-Fahrenheit Converter');
        celsius = this.addTextComponent(f);
        celsius.setText("");

        var f1 = this.addFunctionComponent(f);
        f1.setFunctionBody("input * 9/5 + 32");

        var fahrenheit = this.addTextComponent(f);
        fahrenheit.setText("");

        var f2 = this.addFunctionComponent(f);
        //f4.addFieldAndPinHandle('Input');
        f2.setFunctionBody("(input - 32) * 5/9");

        f.connectComponents(celsius, "Text", f1, "Input");
        f.connectComponents(f1, "Result", fahrenheit, "Text");

        // f.connectComponents(fahrenheit, "Text", f3, "Input");
        // f.connectComponents(f3, "Result", f4, "Input");
        // f.connectComponents(f4, "Result", celsius, "Text");

        f.morph.automaticLayout();

        // some manual layouting
        // f3.panel.setPosition(f1.panel.getPosition().addPt(pt(0,f1.panel.getExtent().y + 20)));
        // f4.panel.setPosition(f2.panel.getPosition().addPt(pt(0,f2.panel.getExtent().y + 20)));
        //f4.panel.setPosition(f2.panel.getPosition().addPt(pt(0,f2.panel.getExtent().y - 10)));
        this.positionComponentRelativeToOther(f2, f1, pt(0, f1.panel.getExtent().y + 20));
        celsius.panel.setPosition(celsius.panel.getPosition().addPt(pt(0,celsius.panel.getExtent().y / 2)));
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

/*
 * PinMorph, the graphical representation of a pin handle
 */
Morph.subclass('PinMorph', {
    
    isPinMorph: true,
    style: {fill: Color.green, opacity: 0.5, borderWidth: 1, borderColor: Color.black},
    
    initialize: function ($super){
        $super(new lively.scene.Ellipse(pt( 0, 0), 10));
        
        this.suppressHandles = true; // no handles
        this.okToBeGrabbedBy = Functions.Null; // no dragging
       
        this.handlesMouseDown = Functions.True; // hack
        this.openForDragAndDrop = true;
        this.onMouseDown = this.onMouseDown.bind(this);
    
        this.setExtent(pt(18,18)); // fixes ellipse pt(0,0) === center behavior
        return this;
    },
    
    deserialize: function($super, importer, rawNode) {
        $super(importer, rawNode);    
        console.log("###deserialize " + this.id() +  " raw: " + rawNode.id)
    },
    
    restorePersistentState: function($super, importer) {
        console.log("###restorePersistentState " + this.id())
        var uri = this.getTrait("pinHandle");
        if (uri)
            console.log(" uri: " + uri);
        else
        console.log(" NO URI FOUND");
        this.debugValue = "I was here"

        // this.pinHandle = Wrapper.prototype.getWrapperByUri(uri);
        // console.log("found wrapper: " + this.pinHandle);
        // if (!this.pinHandle)
        //     console.log("no wrapper found")       
    },
    
    setPinHandle: function(pinHandle) {
        console.log("setPinHandle" + pinHandle)
        this.setTrait("pinHandle", pinHandle.uri());
        this.pinHandle = pinHandle;
    },
    
     /* Drag and Drop of Pin */        
    addMorph: function($super, morph) {
        if (!morph.pinHandle || !morph.pinHandle.isFakeHandle) return;
        console.log("dropping pin on other pin...");
        $super(morph); // to remove it out of the hand

        //FIXME: just for make things work...
        var fakePin = morph.pinHandle;
        fakePin.connectors.first().remove();
        
        // FIXME only kludge for connect problem, use double dispatch
        fakePin.originPin.connectTo(this.pinHandle);
                
        this.removeMorph(morph);
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
    
    getGlobalPinPosition: function() {
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
        // FIXME kludge
        if (this.pinHandle.component instanceof FabrikComponent)
            return this.pinHandle.component.morph.localize(this.getGlobalPinPosition());
        if (this.pinHandle.component.fabrik)
            return this.pinHandle.component.fabrik.morph.localize(this.getGlobalPinPosition());
        // we have no fabrik so we are probably global
        return this.getGlobalPinPosition()
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
        if (evt.hand.topSubmorph() === this) evt.hand.showAsUngrabbed(this);
        
        if (this.pinHandle.isFakeHandle) return;
        
        var fakePin = this.pinHandle.createFakePinHandle();
        
        if (!fakePin.morph) fakePin.buildView(); // Could already be triggered in connectTo in create....
        // change style to distinguish between real handles... put into an own method...?
        fakePin.morph.setFill(Color.red);
        fakePin.morph.setExtent(pt(10,10));
        
        evt.hand.addMorph(fakePin.morph);
        fakePin.morph.setPosition(pt(0,0));
        fakePin.morph.startSnapping(fakePin.reachablePins());
                
        this.updatePosition();
    },

    getHelpText: function() {
        return this.pinHandle.getName() + "\n" + this.pinHandle.getValue();
    },
    
    acceptsDropping: function($super, evt) {
        return $super(evt)
    },
    
    getFakeConnectorMorph: function() {
        return this.pinHandle.connectors.first().morph;
    },

    okToBeGrabbedBy: Functions.Null,
    
    startSnapping: function(pinSnapPoints) {
        if (!this.pinHandle.component.fabrik && !(this.pinHandle.component instanceof FabrikComponent))
            return; // wihtout a fabrik we don't know what other points to snap
        this.snapper = new PointSnapper(this);
        //FIXME
        this.snapper.points = pinSnapPoints.collect(function(ea) { return ea.morph.owner.worldPoint(ea.morph.bounds().center()) });
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

    initialize: function($super, component, pinName) {
        $super();
        
        // Why isnt this handled at a central point?????
        this.formalModel = ComponentModel.newModel({Name: pinName, Type: "regular"});
        //this.formalModel = Record.newPlainInstance({Name: pinName, Type: "regular"});
        //this.name = pinName;
        //this.type = "regular";
        this.component = component;
        this.initializeTransientState();

        this.rawNode.appendChild(this.getModel().rawNode);
    },
    
    initializeTransientState: function() {
        this.connectors = [];            
    },

    getName: function() {
        return this.formalModel.getName();
        //return this.name
    },
    
    isInputPin: function() {
        return this.formalModel.getType() === "input"   
        //return  this.type === "input";
    },
    
    becomeInputPin: function() {
        this.formalModel.setType("input");
        //this.type = "input" 
        if (this.morph) this.morph.setupInputMorphStyle();
    },

    buildView: function() {
        this.morph = new PinMorph();
        // perhaps move to morph
        this.morph.setPinHandle(this);
        if (this.isInputPin())
            this.morph.setupInputMorphStyle();
        return this.morph;
    },
    
    deserialize: function($super, importer, rawNode) {
        $super(importer, rawNode);
        console.log("###deserialize " + this.id())
        
        var records = this.rawNode.getElementsByTagName('record')
        if(records.length > 0) {
            this.formalModel = this.deserializeModelFromNode(importer, records[0]);
            this.formalModel.owner = this; // remember the component diretly in a non persisten way 
        };
    },
    
    setValue: function(value) {
        this.component.formalModel["set" + this.getName()](value);
    },
    
    getValue: function() {
        return this.component.formalModel["get" + this.getName()]();
    },

    reachablePins: function() {
        // this method determines all pins which are "physically" reachable, this means
        // the own pins, the pins of the outer FabrikComponent and pins of the own components
        // (when this.component is a fabrikCompoment)
        // filter all through isConnectableTo()
        
        //FIXME
        // ----------
        var ownPins = this.component.pinHandles;
        // ----------
        var ownerPins = this.component.fabrik ?
            this.component.fabrik.components.inject(this.component.fabrik.pinHandles, function(pins, ea) {
                return ea == this.component ? pins : pins.concat(ea.pinHandles) }) :
            [];
        ownerPins = this.component.fabrik && this.component.fabrik.panel && this.component.fabrik.panel.isCollapsed ?
                    [] :
                    ownerPins;
        // ----------
        var childPins = this.component instanceof FabrikComponent ?
            this.component.components.inject([], function(pins, ea) { return pins.concat(ea.pinHandles) }) :
            [];
        childPins = this.component && this.component.panel && this.component.panel.isCollapsed ?
                    [] :
                    childPins;
                        
        var allPins = ownPins.concat(ownerPins).concat(childPins);
        return allPins.uniq().select(function(ea) { return this.isConnectableTo(ea) }, this);
    },
    
    isConnectableTo: function(otherPin) {
        if (otherPin === this || otherPin === this.originPin) return false;
        if (otherPin.isFakeHandle && this === otherPin.originPin) return true;
        if (this.component instanceof FabrikComponent && this.component.components.include(otherPin.component)) return true;
        if (otherPin.component instanceof FabrikComponent && otherPin.component.components.include(this.component)) return true;
        if (this.component.fabrik === otherPin.component.fabrik) return true;
        return false;
    },
    
    connectTo: function(otherPinHandle) {

        if (!this.isConnectableTo(otherPinHandle)) {
            console.log('tried to connect pins but a connection is not allowed')
            return;
        }
        
        // force an update, even if there is already a connection
        if (!otherPinHandle.isFakeHandle && otherPinHandle.getValue() != this.getValue())
            otherPinHandle.setValue(this.getValue());
                    
        var existingConnection = this.detectConnectorWith(otherPinHandle);
        if (existingConnection) {
            console.log('There exists already a connection from ' + this.getName() + ' to ' + otherPinHandle.getName());
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
        
        //FIXME
        if (this.component instanceof FabrikComponent && this.component === otherPinHandle.component)
            this.component.pluginConnector(connector);
        else if (this.component instanceof FabrikComponent && this.component.fabrik === otherPinHandle.component)
            otherPinHandle.component.pluginConnector(connector);
        else if (this.component instanceof FabrikComponent && this.component === otherPinHandle.component.fabrik)
            this.component.pluginConnector(connector);
        else
            this.component.fabrik && this.component.fabrik.pluginConnector(connector);
                    
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
    },
    
    remove: function() {
        this.connectors.each(function(ea) { ea.remove() });
        if (this.morph) this.morph.remove();
    }
    
});

Morph.subclass('ArrowHeadMorph', {
     
    initialize: function($super, lineWidth, lineColor, fill, length, width) {
        $super(new lively.scene.Group());
        
        /* FIXME
         * Morph abuse!
         */
        this.setFillOpacity(0);
        this.setStrokeOpacity(0);


        lineWidth = lineWidth || 1;
        lineColor = lineColor || Color.black;
        fill = fill || Color.black;
        length = length || 16;
        width = width || 12;

        var verts = [pt(0,0), pt(-length, 0.5* width), pt(-length, -0.5 * width)];
	var poly = new lively.scene.Polygon(verts);
	// FIXME: positioning hack, remove the following
	poly.origin = function() { return pt(0,0) }
        this.head = this.addMorph(new Morph(poly));
	this.head.applyStyle({fill: fill, borderWidth: 1, borderColor: lineColor});
        
        this.setPosition(this.head.getPosition());
        this.setExtent(this.head.getExtent());
        this.ignoreEvents();
        this.head.ignoreEvents();
        
        // this.head.setFillOpacity(0.7);
        // this.head.setStrokeOpacity(0.7);
        
        return this;
    },
    
    pointFromTo: function(from, to) {
        var dir = (to.subPt(from)).theta()
        this.setRotation(dir)
        this.setPosition(to);
    }

});

ComponentModel = {
    newModel: function(optSpec) {
        // FIXME Why isnt this handled at a central point?????
        return Record.newNodeInstance(optSpec || {});
    }
}

Morph.subclass('ConnectorMorph', {
    
    isConnectorMorph: true,
    
    initialize: function($super, verts, lineWidth, lineColor, pinConnector) {
        if (!verts) verts = [pt(0,0), pt(100,100)];
        if (!lineWidth) lineWidth = 1;  
        if (!lineColor) lineColor = Color.red;   
        this.formalModel = Record.newPlainInstance({StartHandle: null, EndHandle: null});
        
        this.pinConnector = pinConnector;
        
        var vertices = verts.invoke('subPt', verts[0]);
        $super(new lively.scene.Polyline(vertices));
	this.applyStyle({borderWidth: lineWidth, borderColor: lineColor});
        this.customizeShapeBehavior();
        
        // this.setStrokeOpacity(0.7);
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
        
        this.shape.controlPointProximity = 20;
        
        // disable first and last control point of polygone 
        this.shape.partNameNear = this.shape.partNameNear.wrap(function(proceed, p) { 
            var part = proceed(p);
            if (part == 0 || part == (this.vertices().length - 1)) return null
            return part 
        });
	
    },

    makeHandle: function($super, position, partName, evt) {
        // change behavior of the control point handles 
	var handleMorph = $super(position, partName, evt);
	var self = this;
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
    },
    
    
    showContextMenu: function(evt) {
        if (this.contextMenu) return; // open only one context menu
    
        this.contextMenu = new MenuMorph([["cut", this.pinConnector, "remove"]], self);
        var offset = pt(-40,-40);
        var pos = this.window().localize(evt.mousePoint).addPt(offset)
        this.contextMenu.openIn(this.window(), pos, false, "");
        
        var connector = this;
        var handObserver = new HandPositionObserver(function(value) {
            if (!connector.contextMenu.owner || value.dist(connector.contextMenu.worldPoint(pt(20,20))) > 40) {
                    connector.contextMenu.remove();
                    connector.contextMenu = null;
                    this.stop();
            }
        });
        handObserver.start();
    },
    
    containsWorldPoint: Functions.Null,
    
    fullContainsWorldPoint: function($super, p) {
        if (!this.formalModel)
            return false;
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
        if (!this.formalModel) {
            console.log("no formal model found for connector: " + this);
            return;
        }
        var start = this.formalModel.getStartHandle();
        // if (start) this.setStartPoint(start.getPinPosition());
        if (start) this.setStartPoint(this.localize(start.getGlobalPinPosition()));
        var end = this.formalModel.getEndHandle();
        // if (end) this.setEndPoint(end.getPinPosition());
        if (end) this.setEndPoint(this.localize(end.getGlobalPinPosition()));
    },
});

Widget.subclass('PinConnector', {
    
    initialize: function($super, fromPinHandle, toPinHandle) {
        $super();
        
        // manual serialization for now: until the Records are fixe to handle references correctly
        this.fromPin = fromPinHandle; 
        this.toPin = toPinHandle;                 
        this.isBidirectional = false;
        
        if (toPinHandle.isFakeHandle) return;
        
        // FIXME: Relays inbetween? Serialization?
        var fromModel = fromPinHandle.component.formalModel;
        var toModel = toPinHandle.component.formalModel;

        // implicit assertion: pinHandle name equals field name of model
        var spec = {};
        spec[fromPinHandle.getName()] = "=set" + toPinHandle.getName();
        fromModel.addObserver(toModel, spec);
        
        console.log("PinConnector says: Connected pin " + fromPinHandle.getName() + " to pin " + toPinHandle.getName());
    },

    prepareForSerialization: function($super, helperNodes) {
        $super(helperNodes);
        this.setTrait("bidirectional", this.isBidirectional);
        this.setTrait("fromPin", this.fromPin);
        this.setTrait("toPin", this.toPin);
    },

    deserialize: function($super, importer, rawNode) {
        $super(importer, rawNode);
        // this.fromPin = Wrapper.prototype.getWrapperByUri(this.getTrait("fromPin"));
        // this.fromPin = Wrapper.prototype.getWrapperByUri(this.getTrait("fromPin"));
        // this.isBidirectional = this.getTrait("bidirectional") == "true";
    },

    // just for make things work ...
    buildView: function() {
        this.morph = new ConnectorMorph(null, 4, Color.blue, this);
        if (!this.fromPin.morph) this.fromPin.buildView();
        if (!this.toPin.morph) this.toPin.buildView();
        this.morph.formalModel.setStartHandle(this.fromPin.morph);
        this.morph.formalModel.setEndHandle(this.toPin.morph);
        this.morph.connector = this; // for debugging... of course...
        return this.morph;
    },

    // FIXME do we need this anymore? Can be directly called from pinMorph?... ?
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
        console.log("remove con from " + this.fromPin.getName() + " to: " + this.toPin.getName());
        this.fromPin.connectors = this.fromPin.connectors.reject(function (ea) { return ea === self}, this);
        this.toPin.connectors = this.toPin.connectors.reject(function (ea) { return ea === self}, this);
        
        this.fromPin.component.formalModel.removeObserver(this.toPin.component.formalModel, this.fromPin.getName());
        if (this.isBidirectional)
            this.toPin.component.formalModel.removeObserver(this.fromPin.component.formalModel, this.toPin.getName());
    },
    
    beBidirectional: function() {
        this.isBidirectional = true;
        // FIXME: Relays inbetween? (Law of Demeter)
        var fromModel = this.fromPin.component.formalModel;
        var toModel = this.toPin.component.formalModel;
        
        var spec = {};
        spec[this.toPin.getName()] = "=set" + this.fromPin.getName();
        toModel.addObserver(fromModel, spec);
        this.updateView();
    },
});

BoxMorph.subclass('ComponentMorph', {
    
    padding: Rectangle.inset(7),
    defaultExtent: pt(180,100),

    initialize: function($super, bounds) {
        bounds = bounds || this.defaultExtent.extentAsRectangle();
        $super(bounds);
        this.closeDnD();
            
        this.linkToStyles(['fabrik']);
        this.shapeRoundEdgesBy(8);
        // this.setFillOpacity(0.7);
        // this.setStrokeOpacity(0.7);
        
        this.priorExtent = pt(0,0);
        this.priorPosition = pt(0,0);
                
        return this;
    },
    
    prepareForSerialization: function($super, helperNodes) {
        $super(helperNodes);
        this.component.prepareForSerialization(helperNodes)
    },
    
    deserialize: function($super, importer, rawNode) {
        $super(importer, rawNode);

        console.log("+++deserialize Morph: " + this.id());
        var uri = this.getLivelyTrait("model");
        // this.formalModel = Wrapper.prototype.getWrapperByUri(uri);
        // if(this.formalModel) {
        //     this.component = this.formalModel.owner;
        //     if(this.component)
        //         this.component.panel = this;
        //     else
        //         console.log("no owner for formalModel found")
        // } else {
        //     console.log("no formalModel found for " + uri)
        // }
    },
    
    setComponent: function(component) {
        this.component = component;
        //this.relayToModel(component.getModel(), {Name: "Name"});
        this.formalModel = component.getModel()
        this.setupWithComponent();
        this.rawNode.setAttribute("model", this.formalModel.uri()); // ok, lets do this by hand...
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
            this.component.pinHandles.each(function(ea) { ea.morph && ea.morph.updatePosition() });
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
    
    
    // addMorph and layout logic
    addMorph: function($super, morph, accessorname) {
        // FIXME: cleanup
        if (morph.formalModel) {
            this.submorphs.each(function(ea) { ea.remove() });
            $super(morph);
            this.setExtent(morph.getExtent().addPt(pt(this.padding.left() * 2, this.padding.top() * 2)));
            morph.setPosition(this.padding.topLeft());
            this.component.adoptToModel(morph.formalModel);
            return morph;
        };

        if (morph.isPinMorph) this.addMorphFront(morph)
        else this.addMorphBack(morph);

        morph.closeDnD();
        morph.closeAllToDnD();
        
        // FIXME cleanup
        if (this[accessorname]) throw new Error("Added two times same type of morph. See add methods");
        if (accessorname) this[accessorname] = morph;

        // Wrap mouse over to make Halos show everytime
        var self = this;
        var wrapMouseOver = function() {
            this.onMouseOver = this.onMouseOver.wrap(function(proceed, evt) {
                proceed(evt); self.showHalos();
            });
        };
        wrapMouseOver.apply(morph);
        morph.withAllSubmorphsDo(wrapMouseOver);

        return morph;
    },
    
    getBoundsAndShrinkIfNecessary: function(minHeight) {
        // assume that we have all the space
        var topLeft = pt(this.padding.left(), this.padding.top());
        var bottomRight = this.getExtent().subPt(pt(this.padding.right(), this.padding.bottom()));
        // see if other morphs are there and if yes shrink them so that minHeight fits into this
        var otherRelevantMorphs = this.submorphs.reject(function(ea) { return ea.constructor === PinMorph});
        if (otherRelevantMorphs.length > 0) {
            this.adoptSubmorphsToNewExtent(this.getPosition(), this.getExtent(),
                this.getPosition(), this.getExtent().subPt(pt(0, minHeight)));
            // new topLeft so that we can put morph below the last one. let inset/2 space between morphs
            topLeft = topLeft.addPt(pt(0, bottomRight.y - minHeight - this.padding.top() / 2));
        };
        return rect(topLeft, bottomRight);
    },
    
    addVisualChangeClue: function(textMorph) {
        var changeClue = Morph.makeRectangle(0,0,5,5);
        changeClue.setFill(Color.red);
        changeClue.ignoreEvents(); 
        textMorph.replaceSelectionWith = textMorph.replaceSelectionWith.wrap(function(proceed, replacement, delayComposition, justMoreTyping){      
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
        var spec = {fontSize: 12, borderWidth: 0, /*opacity: 0.9,*/ borderRadius: 3};
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
        var spec = {fontSize: 12, borderWidth: 0, /*opacity: 0.75,*/ borderRadius: 3};
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
            if (owner.getExtent().subPt(pt(owner.padding.topLeft())).y < this.bounds().extent().y) {
                owner.setExtent(this.getExtent().addPt(owner.padding.topLeft()));
            }
        });
        
        var spec = {borderWidth: 0, /*opacity: 0.9,*/ borderRadius: 3};
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

    minExtent: function() { return pt(50,25) },
    
    /* reshape changes the bounds of the morph and its shape but makes it not smaller than minExtent()
     * submorphs can react to bounds shape by implementing adoptSubmorphsToNewExtent
     * FIXME what about adoptToBoundsChange???
     */
    reshape: function($super, partName, newPoint, handle, lastCall) {
        var insetPt = this.padding.topLeft();
        var priorExtent = this.getExtent().subPt(insetPt);
        var priorPosition = this.getPosition();
        var deltaPos = pt(0,0);
        var morph = this;
        
        // overwrite reshape ... move stuff there or in Morph/WindowMorph? Behavior should be correct for most morphs...
        // FIXME move as much as possible from shape.reshape into this!
        this.shape.reshape = function(partName, newPoint, handle, lastCall) {
            var bnds = this.bounds();
            var userRect = this.bounds().withPartNamed(partName, newPoint);
            // do not flip the bounds
            if (!userRect.partNamed(partName).eqPt(newPoint)) return;
            deltaPos = userRect.topLeft(); // vector by which the morph is moved
            var minExtent = morph.minExtent();
            // adopt deltaPos and userRect so that newBounds has ar least minExtent
            if (userRect.extent().x <= minExtent.x) {
                if (deltaPos.x != 0)
                    deltaPos = deltaPos.withX(deltaPos.x - (minExtent.x - userRect.extent().x));
                userRect = userRect.withWidth(minExtent.x);
            };
            if (userRect.extent().y <= minExtent.y) {
                if (deltaPos.y != 0)
                    deltaPos = deltaPos.withY(deltaPos.y - (minExtent.y - userRect.extent().y));
                userRect = userRect.withHeight(minExtent.y);
            };
            var newBounds = userRect.extent().extentAsRectangle(); // newBounds has position (0,0)
            this.setBounds(newBounds);
        }.bind(this.shape);
        
        $super(partName, newPoint, handle, lastCall);
        this.adoptSubmorphsToNewExtent(priorPosition,priorExtent, this.getPosition(), this.getExtent().subPt(insetPt))
        this.setPosition(this.getPosition().addPt(deltaPos));
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
        // this.menuButton.setFillOpacity(0.5);
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
        this.halos = Morph.makeRectangle(0, 0, 100, 100);
        // to be replace by some general layout mechanism ... aber kloar
        var self = this;
        this.halos.setExtent(this.getExtent());
        this.halos.adoptToBoundsChange = function(ownerPositionDelta, ownerExtentDelta) {
            self.halos.setExtent(self.halos.getExtent().addPt(ownerExtentDelta));
            self.updateHaloItemPositions();
        };
        this.halos.closeDnD();
        this.halos.setFill(null);
        this.halos.setBorderWidth(0);
        this.halos.ignoreEvents();
        this.setupHaloItems();
    },
    
    setupHaloItems: function() {
        this.closeHalo = this.addHaloItem("X", new Rectangle(0, 0, 18, 20), 
            {relativePosition: pt(1,0), positionOffset: pt(0, -20)},
            {fill: Color.red/*, fillOpacity: 0.5*/});
        this.closeHalo.connectModel(Relay.newInstance({Value: "=removeMe"}, {removeMe: function() {this.remove()}.bind(this)}));
        this.addGrabHalo({relativePosition: pt(1,0), positionOffset: pt(-45, -20)})
    },
    
    updateHaloItemPositions: function() {
        // select can be removed? no one shpuld be able to add foreign morphs
        this.halos.submorphs.select(function(ea){return ea.layoutFrame}).each(function(ea){
            var newPos = ea.layoutFrame.relativePosition.scaleByPt(this.getExtent());
            newPos = newPos.addPt(ea.layoutFrame.positionOffset);
            ea.setPosition(newPos);
        }, this)
        //this.closeHalo.setPosition(pt(this.getExtent().x - 0, -20));
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
                    self.adjustForNewBounds();
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
        button.setFillOpacity(0.5);
        button.layoutFrame = layoutFrame || {relativePosition: pt(0,0), positionOffset: pt(0,0)};
        this.halos.addMorph(button);
        return button;
    },
    
    addGrabHalo: function(positionSpec) {
        var grabHalo = this.addHaloItem("grab",  new Rectangle(0,0,45,20),
            positionSpec, {fill: Color.green/*, fillOpacity: 0.5*/});

        var grabFunction = function(value) {
            if (!value) return;

            
            if (this.isFramed()) this.unframed();
            this.owner.removeMorph(this);
            this.owner = null;
            
            var hand = WorldMorph.current().hands.first(); //FIXME -- get the click event?
            hand.addMorph(this);
            this.setPosition(pt(0,0));
            this.moveBy(grabHalo.getPosition().negated().subPt(grabHalo.getExtent().scaleBy(0.5)));
        }.bind(this);
        grabHalo.connectModel(Relay.newInstance({Value: '=grabbed'}, {grabbed: grabFunction}));
    },
    
    handlesMouseDown: Functions.True,
    
    onMouseOver: function() {
        this.showHalos();
    },
    
    onMouseDown: function ($super, evt) {
        console.log('making selection');
        $super(evt);
        return true;
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
        this.allConnectors().each(function(ea){ ea.remove() });
        this.component.remove();
    },
    
    adjustForNewBounds: function($super) {
        this.fullBounds = null;
        $super();
    },
    
    isFramed: Functions.False,
  
});

/*
 * The basic component
 *
 *  Componet - NodeRecord - ComponentMorph
 *   the relation beteween component and component morph is implicitly established via the shared formalModel
 */
Widget.subclass('Component', {
    
    morphClass: ComponentMorph,
    
    initialize: function($super) {
        $super();
        
// FIXME Why isnt this handled at a central point?????
        this.formalModel = ComponentModel.newModel({Name: "NoName"});
                
        //this.addField("Name"); // just to have something for testing....
        this.formalModel.setName("Abstract Component");
              
        this.rawNode.appendChild(this.getModel().rawNode);
        
        this.pinHandles = [];
        
        this.initializeTransientState();
    },
    
    initializeTransientState: function() {

    },
    
    prepareForSerialization: function(helperNodes) {
        this.pinHandles.each(function(ea){
            this.rawNode.appendChild(ea.rawNode)
        }, this)
    },
    
    deserialize: function($super, importer, rawNode) {
        $super(importer, rawNode);
        console.log("###deserialize " + this.id())
        // dam it only morphs are clever right now... so I have to be stupid!
        
        var records = this.rawNode.getElementsByTagName('record')
        if (records.length > 0) {
            // this.formalModel = this.deserializeModelFromNode(importer, records[0]);
            this.formalModel = new lively.data.DOMNodeRecord(importer, rawNode.getElementsByTagName('record')[0])
            this.formalModel.owner = this; // remember the component diretly in a non persisten way 
        } else console.warn('No record for ' + this);
        
        // var widgets = [];        
        // $A(this.rawNode.childNodes).each(function(node) {
        //     console.log(" node: "+ node.id)
        //     if (node.localName == "widget") {
        //         var type = Wrapper.getEncodedType(node);
        //         console.log(" found widget node (" + node.id + ")")
        //         if (node.wrapper) {
        //             widgets.push(node.wrapper)
        //         } else if (type) {
        //             var constructor = Global[type];
        //             if (!constructor)
        //                 console.log("ERROR: no constructor for " + type)
        //             else {
        //                 var widget = new constructor(importer, node);
        //                 widgets.push(widget);
        //             }
        //         } else {
        //             console.log("no type found ")
        //         } 
        //     }
        // });
        // this.setupChildWidgets(widgets);
        this.initializeTransientState();
    },
    
    setupChildWidgets: function(widgets) {
        this.pinHandles = widgets.select(function(ea){return ea instanceof PinHandle});        
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
        this['set' + fieldName](null); // FIXME do with spec
    },
    
    addFieldAndPinHandle: function(field, coercionSpec, forceSet) {
        // automaticaly create field if no field exists for pin
        return this.addPin(field, coercionSpec, forceSet);
    },
    
    pvtCreateAccessorsForField: function(fieldName) {
        this["get" + fieldName] = function() {
            return this.formalModel["get" + fieldName]();
        };
        this["set" + fieldName] = function(value) {
            return this.formalModel["set" + fieldName](value);
        };
    },
    
    // deprecated, use addPin
    addPinHandle: function(pinName) {
        return this.addPin(pinName);
    },
    
    addPin: function(pinName, optCoercionSpec, force) {
        // FIXME: Rewrite test that field exists
        if (!this["get" + pinName]) this.addField(pinName, optCoercionSpec, force);
        var pinHandle = new PinHandle(this, pinName);
        this.pinHandles.push(pinHandle);
        if (this.morph) this.setupPinHandle(pinHandle);
        return pinHandle;
    },
    
    removePin: function(name) {
        this.getPin(name).remove();
        this.pinHandles = this.pinHandles.without(this.getPin(name));
        // delete this['get' + name];
        // delete this['set' + name];
    },
    
    // deprecated, use getPin!
    getPinHandle: function(pinName) {
        return this.getPin(pinName);
    },
    
    getPin: function(pinName) {
        return this.pinHandles.detect(function(ea) { return ea.getName() == pinName });
    },

    inputPins: function() {
        return this.pinHandles.select(function(ea){return ea.isInputPin()})
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
    },
    
    remove: function() {
        if (this.fabrik) this.fabrik.unplug(this);
    }
        
});

SelectionMorph.subclass('UserFrameMorph', {
    
    removeWhenEmpty: false,
    
    reshape: function($super, partName, newPoint, handle, lastCall) {
        // Initial selection might actually move in another direction than toward bottomRight
        // This code watches that and changes the control point if so
        if (this.initialSelection) {
            var selRect = new Rectangle.fromAny(pt(0,0), newPoint);
            if (selRect.width*selRect.height > 30) {
                this.reshapeName = selRect.partNameNearest(Rectangle.corners, newPoint);
            }
            this.setExtent(pt(0, 0)) // dont extend until we know what direction to grow
            // $super(this.reshapeName, newPoint, handle, lastCall);
            Morph.prototype.reshape.call(this, this.reshapeName, newPoint, handle, lastCall)
        } else {
            // $super(partName, newPoint, handle, lastCall);
            Morph.prototype.reshape.call(this, partName, newPoint, handle, lastCall)
        }
        this.selectedMorphs = [];
        this.owner.submorphs.forEach(function(m) {
            if (m !== this && this.bounds().containsRect(m.bounds()) && m instanceof ComponentMorph) this.selectedMorphs.push(m);
        }, this);
        this.selectedMorphs.reverse();

        if (lastCall) this.initialSelection = false;
        // if (lastCall /*&& this.selectedMorphs.length == 0 && this.removeWhenEmpty*/) this.remove();
        if (lastCall && this.selectedMorphs.length == 0 && this.removeWhenEmpty) this.remove();
        // this.selectedMorphs = [];
        
        if (!lastCall) return;
        if ((this.shape.bounds().extent().x < 10 && this.shape.bounds().extent().y < 10) ||
            (this.shape.bounds().extent().x < 3 || this.shape.bounds().extent().y < 3))
            this.remove();
    },
    
    // removeWhenEmpty: false, 
    
    remove: function() { 
        // this.selectedMorphs.invoke('remove');
        // this.owner.removeMorph(this); // FIXME
        Morph.prototype.remove.call(this);
        if (this.fabrik) this.fabrik.currentSelection = null
    },
    
    okToBeGrabbedBy: function(evt) {
        // this.selectedMorphs.forEach( function(m) { evt.hand.addMorph(m); } );
        return this;
    },
    
    createHandle: function(hand) {
        var handle = new HandleMorph(pt(0,0), lively.scene.Rectangle, hand, this, "bottomRight");
        handle.setExtent(pt(5, 5));
        this.addMorph(handle);
        hand.setMouseFocus(handle);
        return handle;
    },
    
    handleCollapseFor: function(fabrikMorph) {
        // remove morphs and connectors
        fabrikMorph.component.connectors.each(function(ea) { fabrikMorph.removeMorph(ea.morph) } );
        var compMorphs = fabrikMorph.component.components.collect(function(ea) { return ea.panel });
        var morphsToHide = this.selectedMorphs ?
            compMorphs.reject(function(ea) { return this.selectedMorphs.include(ea) }.bind(this)) :
            compMorphs;
        morphsToHide.each(function(ea) { fabrikMorph.removeMorph(ea) });
        
        // we move the fabrikMorph to where this selection currently is, the selectedMorphs have to be moved in the other direction
        this.positionDelta = this.getPosition();
        fabrikMorph.positionAndExtentChange(fabrikMorph.getPosition().addPt(this.positionDelta), this.getExtent());
        this.selectedMorphs.each(function(ea) {
            ea.component.pinHandles.each(function(pin) { ea.removeMorph(pin.morph) });
            ea.moveBy(this.positionDelta.negated());
        }.bind(this));
        
        fabrikMorph.removeMorph(this);
    },
    
    handleUncollapseFor: function(fabrikMorph) {
        // remove morphs and connectors
        var compMorphs = fabrikMorph.component.components.collect(function(ea) { return ea.panel });
        var morphsToShow = this.selectedMorphs ?
            compMorphs.reject(function(ea) { return this.selectedMorphs.include(ea) }.bind(this)) :
            compMorphs;
        morphsToShow.each(function(ea) { fabrikMorph.addMorph(ea) });
        
        this.selectedMorphs.each(function(ea) {
            ea.component.pinHandles.each(function(pin) { ea.addMorph(pin.morph) })
            this.positionDelta && ea.moveBy(this.positionDelta);
        }.bind(this));
                
        fabrikMorph.addMorph(this);
    }

});

/* Morph and Component for encapsulating other components */
ComponentMorph.subclass('FabrikMorph', {
    
    padding: Rectangle.inset(0),
    
    initialize: function($super, bounds) {
        $super(bounds);
    },
    
    initializeTransientState: function($super) {
        $super();
    },
    
    automaticLayout: function() {
        (new FlowLayout()).layoutElementsInMorph(this.fabrik.components, this);
    },

    deserialize: function($super, importer, rawNode) {
        $super(importer, rawNode);
    },
    
    // remove and put stuff in setupforcomponent instead
    setupForFabrik: function(fabrik){
         this.fabrik = fabrik;  // remove instance var, component is sufficient
         this.component = fabrik;
         this.component.components.each(function(ea) { this.addMorphForComponent(ea) }, this);
         this.component.connectors.each(function(ea) { this.addMorph(ea.morph || ea.buildView()) }, this);        
    },
    
    setupHaloItems: function($super) {
        this.closeHalo = this.addHaloItem("X", new Rectangle(0, 0, 18, 20), 
            {relativePosition: pt(1,0), positionOffset: pt(0, -20)},
            {fill: Color.red/*, fillOpacity: 0.5*/});
        this.closeHalo.connectModel(Relay.newInstance({Value: "=removeMe"}, {removeMe: function() {this.remove()}.bind(this)}));

        this.addGrabHalo({relativePosition: pt(1,0), positionOffset: pt(-45,0)});

        this.collapseHalo = this.addHaloItem("collapse",  new Rectangle(0,0,60,20),
            {relativePosition: pt(1,0), positionOffset: pt(-105,0)}, 
            {fill: Color.orange/*, fillOpacity: 0.5*/});
        this.collapseHalo.connectModel(Relay.newInstance({Value: '=collapseToggle'}, this));
    },
    
    addMorph: function($super, morph) {
        // don't let loose ends stay around
        if (morph.pinHandle && morph.pinHandle.isFakeHandle)
            throw new Error("Pin dropped on fabrik, this should not happen any more")
        
        // dropping components into the fabrik component...!
        if (morph.component)
            this.component.plugin(morph.component);
        
        if (morph.isConnectorMorph) 
            this.addMorphFront(morph);
        else 
            this.addMorphBack(morph);
                
        return morph;
    }, 
    
    addMorphForComponent: function(component) {
        // wouldnt it be better to do:
        // this.addMorph(component.morph || component.buildView());
        // or
        // if (component.morph && this.submorphs.include(component.morph)) return;
        // this.addMorph(component.morph || component.buildView());
        // ?
        if (component.morph) return; // Morph is already there... 
        this.addMorph(component.buildView());
    },

    okToBeGrabbedBy: function(evt) {
        return null; 
    },
    
    // handlesMouseDown: Functions.True,
    
    onMouseDown: function ($super, evt) {
        console.log('making selection');
        if (!this.isCollapsed) this.makeSelection(evt); 
        return true;
    },

    makeSelection: function(evt) {  //default behavior is to grab a submorph
        if (this.currentSelection != null) this.currentSelection.remove();
        var frame = new UserFrameMorph(this.localize(evt.point()).asRectangle());
        frame.fabrik = this;
        this.currentSelection = this.addMorph(frame);
        return frame.createHandle(evt.hand);
    },
    
    collapseToggle: function(value) {
        if (!value) return; // FIXME value from button click... ignore!
        if (this.isCollapsed) this.uncollapse()
        else this.collapse();
        this.updateHaloItemPositions();
        if (this.isFramed())
            this.setExtent(this.getExtent().addPt(this.owner.titleBar.getExtent().withX(0)));
    },
    
    collapse: function() {
        console.log('collapse fabrik');
        this.isCollapsed = true;
        this.collapseHalo.setLabel('uncollapse');
        this.uncollapsedExtent = this.getExtent();
        this.uncollapsedPosition = this.getPosition();
        this.setFill(Color.gray);
        
        if (this.currentSelection) {
            this.currentSelection.handleCollapseFor(this);
        } else {
            this.component.components.each(function(ea) { this.removeMorph(ea.panel) }.bind(this));
            this.component.connectors.each(function(ea) { this.removeMorph(ea.morph) }.bind(this));
            this.positionAndExtentChange(this.collapsedPosition || this.getPosition(),
                                         this.collapsedExtent || this.component.defaultCollapsedExtent);
        }
    },
    
    uncollapse: function() {
        console.log('uncollapse fabrik');
        this.isCollapsed = false;
        this.collapseHalo.setLabel('collapse');
        this.setFill(Color.blue.lighter());
        
        if (this.currentSelection) {
            this.positionAndExtentChange(this.uncollapsedPosition || this.getPosition(), this.uncollapsedExtent || this.component.defaultViewExtent);
            this.currentSelection.handleUncollapseFor(this);
        } else {
            this.collapsedExtent = this.getExtent();
            this.collapsedPosition = this.getPosition();
            this.positionAndExtentChange(this.uncollapsedPosition || this.getPosition(), this.uncollapsedExtent || this.component.defaultViewExtent);
            this.component.components.each(function(ea) { this.addMorph(ea.panel) }.bind(this));
        };
        
        this.component.connectors.each(function(ea) { this.addMorph(ea.morph); ea.updateView(); }.bind(this) );
    },
    
    minExtent: function() {
        return pt(10,5);
        // if (this.isCollapsed) return pt(10,5);
        //         var borderMorphs = this.getComponentMorphsNearBorders();
        //         var topY = borderMorphs.top ? borderMorphs.top.getPosition().y : 0;
        //         var leftX = borderMorphs.left ? borderMorphs.left.getPosition().y : 0;
        //         var bottomY = borderMorphs.bottom ? borderMorphs.bottom.bounds().maxY() : 50;
        //         var rightX = borderMorphs.right ? borderMorphs.right.bounds().maxX() : 50;
        //         return pt(rightX - leftX, bottomY - topY);
    },
    
    getComponentMorphsNearBorders: function() {
        var compMorphs = this.submorphs.select(function(ea) { return ea instanceof ComponentMorph});
        var borderMorphs = {};
        var cmpFuncs = {top: function(m1, m2) { return m1.getPosition().y <= m2.getPosition().y},
                        left: function(m1, m2) { return m1.getPosition().x <= m2.getPosition().x},
                        right: function(m1, m2) { return m1.bounds().maxX() >= m2.bounds().maxX()},
                        bottom: function(m1, m2) { return m1.bounds().maxY() >= m2.bounds().maxY()}};
        // for in does not work with ometa...
        ['top', 'left', 'right', 'bottom'].each(function(pos) {
            compMorphs.each(function(eaMorph) {
                if (!borderMorphs[pos]) borderMorphs[pos] = eaMorph;
                borderMorphs[pos] = cmpFuncs[pos](eaMorph, borderMorphs[pos]) ? eaMorph : borderMorphs[pos];
            });
        });
        return borderMorphs;
    },
    
    closeAllToDnD: function(loc) {
        // ok, lets handle this myself
    },
    
    // considers windowMorph when exsiting
    positionAndExtentChange: function(pos, ext) {
        var morphToModify = this.owner instanceof WindowMorph ? this.owner : this;
        morphToModify.setPosition(pos);
        morphToModify.setExtent(ext);
    },
    
    isFramed: function() {
        return this.owner instanceof WindowMorph;
    },
    
    framed: function() {
        if (this.isFramed()) return;
        // debugger;
        var window = new WindowMorph(this, this.component.viewTitle, false);
        window.suppressHandles = true;
        this.reshape = this.reshape.wrap(function(proceed, partName, newPoint, handle, lastCall) {
            proceed(partName, newPoint, handle, lastCall);
            var windowdBnds = window.bounds().topLeft().extent(this.shape.bounds().extent().addXY(0, window.titleBar.innerBounds().height));
            // window.setExtent(windowdBnds.extent());
            window.setBounds(windowdBnds);
            window.adjustForNewBounds();
        });
        
        this.collapseToggle = this.collapseToggle.wrap(function(proceed, val) {
            proceed(val);
            window.setExtent(this.getExtent().addXY(0, window.titleBar.innerBounds().height));
            window.adjustForNewBounds();
        });
        // undo closeAllToDnD
        this.openDnD();
        this.openInWindow = window;
        // this.component.fabrik = null;
        return window;
    },
    
    unframed: function() {
        if (!this.isFramed()) return;
        this.owner.remove();
        this.openInWindow = null;
        this.reshape = this.constructor.prototype.reshape.bind(this);
        this.collapseToggle = this.constructor.prototype.collapseToggle.bind(this);
        return this;
    }

});

/*
 * The main Fabrik Component
 *  - contains other components and connections between them
 */
Component.subclass('FabrikComponent', {

    morphClass: FabrikMorph,
    defaultViewExtent: pt(750, 500),
    defaultCollapsedExtent: pt(200, 100), // move to morph?
    defaultViewTitle: "FabrikComponent",

    initialize: function($super) {
        $super(null);
        this.initializeTransientState();
        this.components = [];
        this.connectors = [];
        return this;
    },
  
    initializeTransientState: function($super) {
        $super()
    },
    
    prepareForSerialization: function($super, helperNodes) {
        $super();
        this.connectors.each(function(ea){
            this.rawNode.appendChild(ea.rawNode)
        }, this)
    },

    setupChildWidgets: function($super, widgets) {
        console.log("///////////setupChildWidgets: " + widgets.length)
        $super(widgets);
        this.components = widgets.select(function(ea) {
            return ea instanceof Component});
        this.connectors = widgets.select(function(ea) {
            return ea instanceof PinConnector});

    },
  
    buildView: function($super, optExtent) {
        //console.log("buildView for " + this);
        // this.panel = PanelMorph.makePanedPanel(this.viewExtent || optExtent || this.defaultViewExtent,
        //     [['playfield', function(initialBounds){ return new FabrikMorph(initialBounds) }, pt(1,1).extentAsRectangle()]]
        // );
        // this.morph = this.panel.playfield;
        
        $super(optExtent || this.defaultViewExtent);
        this.panel.fabrik = this;
        this.panel.setComponent(this);
     
        var pseudo = new PseudoMorph();
        WorldMorph.current().addMorphBack(pseudo);
        pseudo.addNonMorph(this.rawNode); // fabrik hangs the all compontens implicit into this tree position
     
     
        this.morph.setupForFabrik(this);
        // this.panel.linkToStyles(['fabrik']);
        this.morph.linkToStyles(['fabrik']);
            
        return this.panel;
    },
    
    deserialize: function($super, importer, rawNode) {
        $super(importer, rawNode);
    },

    // can be called when this.morph does not exist, simply adds components and wires them
    plugin: function(component) {
        this.rawNode.appendChild(component.rawNode);
        
        if (this.components.include(component)) {
            console.log('FabrikComponent.plugin(): ' + component + 'was already plugged in.');
            return;
        }
        this.components.push(component);
        component.fabrik = this; // remember me
        if (this.morph) this.morph.addMorphForComponent(component);
        return component;
    },

    unplug: function(component) {
        this.components = this.components.reject(function(ea) { return ea === component });
        if (this.rawNode && $A(this.rawNode.childNodes).include(component.rawNode))
            this.rawNode.removeChild(component.rawNode);
        component.fabrik = null;
    },
    
    pluginConnector: function(connector) {
        if (this.connectors.include(connector)) {
            console.log("Plugin connector failed: " + connector + " is already plugged in!");
            return;
        };        
        this.connectors.push(connector);
        // argh! is this really necessary??
        connector.fabrik = this;
        
        if (!this.morph) return connector;
        
        if (!connector.morph)
            connector.buildView();
        if (!this.morph.submorphs.include(connector.morph))
            this.morph.addMorph(connector.morph);
        connector.updateView();
        return connector;
    },

    connectComponents: function(fromComponent, fromPinName, toComponent, toPinName){
        return fromComponent.getPin(fromPinName).connectTo(toComponent.getPin(toPinName));
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
    openIn: function($super, world, location, optExtent) {
        var morph = this.panel || this.buildView(optExtent);
        var window = world.addMorph(morph.framed());
        window.setPosition(location || morph.getPosition());
        return window;
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
            {fill: Color.green/*, fillOpacity: 0.5*/});
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
            {fill: Color.blue.lighter().lighter()/*, fillOpacity: 0.5*/});
        inputHalo.connectModel({model: this.component, setValue: "interactiveAndNewInputField"});
        
        var evalHalo = this.addHaloItem("eval",  new Rectangle(0,0,45,20),
            {relativePosition: pt(1,1), positionOffset: pt(-45,0)}, 
            {fill: Color.green/*, fillOpacity: 0.5*/});
        evalHalo.connectModel({model: this.component, setValue: "evalButtonPressed"});
    },
    
    setupTextField: function() {
        var self = this;
        this.functionBodyMorph.boundEval = this.functionBodyMorph.boundEval.wrap(function(proceed, str) {
            var source = self.component.composeFunction(self.component.getFunctionHeader(), str, interactiveEval);
            console.log("eval: " + source)			
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
        var pin = this.addFieldAndPinHandle(name);
        pin.becomeInputPin();
        this.updateFunctionHeader();
        return pin;
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
        return this.inputPins().collect(function(ea){return ea.getName().toLowerCase()}); 
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

    pvtGetFunction: function() {
        this.updateFunctionHeader();
        return this.composeFunction(this.getFunctionHeader(), this.getFunctionBody() || "", interactiveEval)
    },
    
    composeFunction: function(header, body, evalFunc) {
        var funcSource = "var x = "+ header;
        var evalImplicit = ! body.match(/return /)
        if(evalImplicit) {
            body = this.fixObjectLiterals(body);
            funcSource = funcSource.replace("(", "(pvtArgToEvalBody, ");
            funcSource = funcSource.replace(", )", ")") // just in case we would have no other parameter
            funcSource += ' { return eval(pvtArgToEvalBody)}; x'; // implicit return
        } else {
            funcSource += " { " + body + "}; x";
        };
        evalFunc = evalFunc || eval;
        try {
            if(evalImplicit)
                return evalFunc(funcSource).curry(body).bind(this)
            else
                return evalFunc(funcSource).bind(this);
        } catch(e) {
            console.log("Error when evaluating:" + funcSource + " error: " + e.msg);
            return function(){} // do nothing
        }
    },

    fixObjectLiterals: function(str) {
        // var lines = str.split(/\n|\r/);
        str = ' ' + str + ' '; // whoaaa, ugly
        var regExp = /(.*)[^\(]\{(.*?)\}[^\)](.*)/;
        // debugger;
        while (regExp.test(str)) {
            var parts = regExp.exec(str);
            str = parts[1] + '({' + parts[2] + '})' + parts[3];
        };
        // return lines.join('\n');
        return str
    },
    
    execute: function() {
        try {
            this.setResult(this.pvtGetFunction().apply(this, this.parameterValues()) || null);
            console.log("Result of function call: " + this.getResult());
        } catch(e) {
            dbgOn(true);
            console.log("FunctionComponentModel: error " + e + " when executing body" + this.getFunctionBody());
            // throw e;
        }
    },
});

Component.subclass('WebRequestComponent', {
    
    initialize: function ($super) {
        $super();
        // this.addFieldAndPinHandle("URL", null, true); // force sets even if value the same
        this.addFieldAndPinHandle("URL");
        this.addFieldAndPinHandle("ResponseText");
        this.addFieldAndPinHandle("ResponseXML");
        
        this.formalModel.addObserver({onURLUpdate: function(url) { this.makeRequest() }.bind(this)});
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
        if (!this.getURL()) return;
        console.log('making reqest to: ' + this.getURL());
        
        try {
            var url = new URL(this.getURL());
        } catch(e) {
            console.log('Invalid URL!');
            return // invalid url, we do not proceed
        }
        // var x = new Resource(this.formalModel.newRelay({URL: '-URL', ContentText: '+ResponseText', ContentDocument: '+ResponseXML'}));
        
        var x = new Resource(Record.newPlainInstance({URL: url, ContentText: '', ContentDocument: null}));
        x.formalModel.addObserver({onContentTextUpdate: function(response) { this.setResponseText(response) }.bind(this)});
        x.formalModel.addObserver({onContentDocumentUpdate: function(response) {
                var elem = document.importNode(response.documentElement, true);
                this.setResponseXML(FabrikConverter.xmlToStringArray(elem));
        }.bind(this)});
        x.fetch();
    }
});

Component.subclass('ImageComponent', {
    
    initialize: function ($super) {
        $super();
        this.addFieldAndPinHandle("URL");
    },
    
    buildView: function($super, optExtent) {
        $super(optExtent);

        var url = this.getURL() || 'http://livelykernel.sunlabs.com/favicon.ico';
        this.morph = new ImageMorph(this.panel.getBoundsAndShrinkIfNecessary(80), url);
        this.morph.adoptToBoundsChange = function(ownerPositionDelta, ownerExtentDelta, scaleDelta) {
            this.morph.setExtent(this.morph.getExtent().addPt(ownerExtentDelta));
            this.morph.image.scaleBy(Math.max(scaleDelta.x, scaleDelta.y) || 1);
        }.bind(this);
        this.morph.openForDragAndDrop = false;
        this.morph.okToBeGrabbedBy = function() { return this.panel }.bind(this);
        this.formalModel.addObserver(this.morph, {URL: '!URL'});
        this.panel.addMorph(this.morph, 'image');
        
        // this.setupHandles();
        return this.panel;
    }
});

Component.subclass('TextListComponent', {

    initialize: function ($super) {
        $super();
        this.addFieldAndPinHandle('List');
        this.addFieldAndPinHandle('Selection');
        this.addField('SelectionIndex');
        this.setList([]);
        this.setupListEnhancement();
    },

    buildView: function($super, optExtent) {
        $super(optExtent);
        this.morph = this.panel.addListPane().innerMorph();
        this.morph.connectModel(this.formalModel.newRelay({List: "List", Selection: "Selection"}));
        this.setupHandles();
        return this.panel;
    },
    
    // remember selection idx when list changes, let also the morph know
    // TODO should be called during deserialization
    setupListEnhancement: function() {
        this.formalModel.addObserver({onListUpdate: function(newList) {
            if (!this.getSelectionIndex()) return;
            this.setSelection(this.getList()[this.getSelectionIndex()]);
        }.bind(this) });        
        this.formalModel.addObserver({onSelectionUpdate: function(sel) {
            var idx;
            this.getList().each(function(ea, i) { if (equals(ea, sel)) idx = i;  });
            this.setSelectionIndex(idx);
            this.morph && this.morph.selectLineAt(idx);
        }.bind(this) });
    }
    
}),

Widget.subclass('ComponentBox', {

    viewTitle: "Fabrik Component Box",
    viewExtent: pt(600,300),
    
    initialize: function($super) { 
        $super();
        // FIXME Why isnt this handled at a central point?????
        this.model = ComponentModel.newModel();
    },
    
    addMorphOfComponent: function(comp, createFunc, optExtent) {
        var m = comp.buildView(optExtent);
        
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
			  fill: new lively.paint.LinearGradient([Color.white, 1, Color.primary.blue], 
								lively.paint.LinearGradient.NorthSouth)});
	

        this.addMorphOfComponent(new FabrikComponent(), function() {
            var extent = pt(300,250);
            var fabrik = new FabrikComponent();
            fabrik.defaultViewExtent = extent;
            fabrik.viewTitle = 'Fabrik';
            fabrik.openIn(WorldMorph.current(), WorldMorph.current().hands.first().getPosition().midPt(extent));
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
        this.addMorphOfComponent(new ImageComponent(), defaultCreateFunc.curry(ImageComponent, pt(50,50)), pt(50,50));
        
        
                
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
        this.padding = Rectangle.inset(20);
        this.positionX = this.padding.left();
        this.positionY = this.padding.top();
        this.maxHeight = 0;
    },
    
    layoutSubmorphsInMorph: function() {
        this.morphToLayout.submorphs.forEach(function(ea) {
            this.setPositionFor(ea);
        }, this);
    },
    
    layoutElementsInMorph: function(components, morph) {
        this.morphToLayout = morph;
        components.each(function(ea) { this.setPositionFor(ea.panel) }, this);
    },
    
    setPositionFor: function(submorph) {
        //var bounds = rect(submorph.getPosition(), submorph.getExtent());
        var bounds = submorph.bounds();
        if ((this.positionX + bounds.width + this.padding.right()) > this.morphToLayout.bounds().right()) {
            this.positionX = this.padding.left(); // start left
            this.positionY += this.maxHeight + this.padding.top(); // on a new line
            this.maxHeight = 0; // and reset maxHeigth for that new line
        };
        submorph.setPosition(pt(this.positionX, this.positionY));
        this.positionX += bounds.width + this.padding.left();
        if (bounds.height > this.maxHeight) this.maxHeight = bounds.height;
    }

});

/* Very simple XML converter */
Global.FabrikConverter = {
   
    basicToJs: function(xml) {
        var obj = {};
        // FIXME assumes data is only important attribute...
        obj[xml.nodeName] = xml.hasChildNodes() ? {} : (xml.attributes && xml.getAttribute('data')) || xml.textContent;
        return obj;
    },
    
    xmlToJs: function(xml) {
        var baseObj = FabrikConverter.basicToJs(xml);
        var childObjs = $A(xml.childNodes).collect(function(ea) { return FabrikConverter.xmlToJs(ea) });
        function firstKey(obj) { return Object.keys(obj).first() };
        childObjs.each(function(ea) { baseObj[firstKey(baseObj)][firstKey(ea)] = ea[firstKey(ea)] });
        return baseObj;
    },
    
    // flattens XML and creates string representations for each node
    xmlToStringArray: function(xml, indent) {
        if (!indent) indent = '';
        
        var objCreator = function(string, xml) { return {string: string, xml: xml, js: FabrikConverter.xmlToJs(xml), isJSONConformant: true} };
        
        if (!xml || xml instanceof DocumentType) return [];
        if (!xml.parentNode) return FabrikConverter.xmlToStringArray(xml.firstChild, indent); // omit root
        if (!xml.hasChildNodes()) return [objCreator(indent + Exporter.stringify(xml), xml)];
        var list = $A(xml.childNodes).inject([], function(all, ea) {
            return all.concat(FabrikConverter.xmlToStringArray(ea, indent + '\t')) });
        // get just the tag opener and closer for the string
        var ownXMLStrings = /(<.*?>).*(<.*?>)/.exec(Exporter.stringify(xml));
        list.unshift(objCreator(indent + ownXMLStrings[1], xml));
        list.push(objCreator(indent + ownXMLStrings[2], xml));
        return list;
    }
};

/*
 * Extending ClockMorph for PluggableComponent
 */
Morph.subclass("FabrikClockMorph", {
    style: {borderWidth: 2},
    openForDragAndDrop: false,

    initialize: function($super, position, radius) {
        $super(new lively.scene.Ellipse(position, radius));
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
            label.applyStyle({borderWidth: 0, fill: null, wrapStyle: lively.Text.WrapStyle.Shrink, fontSize: labelSize, padding: Rectangle.inset(0)});
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

/* Changing the behavior of the WorldMorph: when a FabrikMorph is dropped, make it framed */
    WorldMorph.prototype.addMorphFrontOrBack = WorldMorph.prototype.addMorphFrontOrBack.wrap(function(proceed, m, front, override) {
    if (m instanceof FabrikMorph && !override/* && !m.openInWindow*/) {
        m.halos.remove();
        m.adjustForNewBounds();
        console.log('adding fabrikmorph to world...')
        return m.component.openIn(this, this.hands.first().getPosition().addPt(m.getPosition()));
    };
    return proceed(m, front);
})

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
    lively.lang.Execution.installStackTracers();
    try {
        return func.call()
    } catch(e) {
        errObj.err = e;
        lively.lang.Execution.installStackTracers("uninstall");
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

console.log('loaded Fabrik.js');

}); // end of require