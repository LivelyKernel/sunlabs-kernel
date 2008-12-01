module('lively.Tests.SerializationTests').requires('lively.TestFramework').toRun(function() {

/* Helper Classes */

Morph.subclass('DummyMorph', {

    initialize: function($super) { 
        $super(rect(pt(0,0), pt(100,050)), "rect");
        this.formalModel = Record.newInstance({MyValue: {}},{});
    },
    
    deserialize: function($super, importer, rawNode) {
        console.log("DummyMorph>>deserialize: " + Exporter.stringify(d))
        $super(importer, rawNode);
    },

});

Widget.subclass('DummyWidget', {

    description: "Dummy Widget for serialization",
    viewTitle: "Dummy Widget",
    initialViewExtent: pt(250, 260),

    initialize: function($super) { 
        $super();
        this.model = Record.newNodeInstance({MyText: "tada"});
        this.relayToModel(this.model, {MyText: "+MyText"});
        this.ownModel(this.model);
    },
    
    sayHello: function() {
        this.model.setMyText("Hello World");
    },
    
    buildView: function(extent) {
        this.panel = new Morph(new lively.scene.Rectangle(rect(pt(20,20), pt(150,150))));
        this.panel.setFill(Color.green);
        this.panel.widget = this; // backreference
        this.myMorph1 = new TextMorph(rect(pt(10,10), pt(100,30)));
        this.myMorph2 = new TextMorph(rect(pt(10,40), pt(100,60)));
        this.myMorph1.connectModel(this.model.newRelay({Text: "MyText"}));
        this.myMorph2.connectModel(this.model.newRelay({Text: "MyText"}));
        this.panel.addMorph(this.myMorph1);
        this.panel.addMorph(this.myMorph2);
        
        // this.panel.rawNode.appendChild(this.rawNode); // should we do this manually?
        this.panel.ownerWidget = this;
        return  this.panel;
    },
    
    open: function(){
        this.buildView();
        WorldMorph.current().addMorph(this.panel);
    }
});

TestCase.subclass('SerializationBaseTestCase', {

    /* For Serialization tests we need a own WorldMorph and thus a own SVG canvas */
    setUp: function() {
        this.realWorld = WorldMorph.current();
        this.dom = stringToXML(
            '<svg xmlns="http://www.w3.org/2000/svg" xmlns:lively="http://www.experimentalstuff.com/Lively" '+
                'xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xhtml="http://www.w3.org/1999/xhtml" '+
                'id="canvas" width="100%" height="100%" xml:space="preserve" '+
                'xmlns:xml="http://www.w3.org/XML/1998/namespace" zoomAndPan="disable">' +
                '<title>Lively Kernel canvas</title>' + 
            '</svg>');
        this.oldGlobalDocument = Global.document; // importFromNodeList uses Global.document, so we fake it
        Global.document = this.dom
        this.canvas = this.dom.documentElement;
        this.worldMorph = new WorldMorph(this.canvas);
        this.canvas.appendChild(this.worldMorph.rawNode);
        this.morphs = [];
        
        this.bounds = rect(pt(10,10), pt(100,100));
	    this.parentMorph =  Morph.makeRectangle(0,0, 300, 300);
    },
    
    tearDown: function() {
           WorldMorph.currentWorld = this.realWorld;
           this.morphs.each(function(each){ each.remove()})
           Global.document = this.oldGlobalDocument 
       },

       showMyWorld: function(optWorld) {
           if (optWorld) {
               this.worldMorph = optWorld
           };
           // for debugging
           var oldCanvas = document.getElementById('canvas');
           var owner = oldCanvas.parentElement;
           // hack, so that we do not run into a conflict: when calling importNode the canvas changes
           if (this.worldMorph.rawNode.parentNode) {
               this.worldMorph.rawNode.parentNode.removeChild(this.worldMorph.rawNode);
           };
           var newCanvas = document.importNode(this.canvas, true);

           var oldWorld = this.realWorld;
           oldWorld.onExit();    
           oldWorld.hands.clone().forEach(function(hand) {oldWorld.removeHand(hand)});
           oldWorld.suspendAllActiveScripts(); // ???
           oldWorld.remove();

           var newWorld = this.worldMorph;
           newWorld.displayOnCanvas(newCanvas); 
           newWorld.resumeAllSuspendedScripts();  

           owner.replaceChild(newCanvas, oldCanvas);     
       },

       loadWorldFromSource: function(xmlString) {
           var xml = (new DOMParser()).parseFromString('<?xml version="1.0" standalone="no"?> ' + xmlString, "text/xml");
           this.doc = xml;   
           return (new Importer()).loadWorldContents(xml);
       },

       exportMorph: function(morph) {
           var exporter = new Exporter(morph);
           exporter.extendForSerialization();
           return exporter.rootMorph.rawNode
       },

       getFieldNamed: function(node, fieldName) {
           var result = $A(node.getElementsByTagName("field")).detect(function(ea) {
               return ea.getAttribute("name") == fieldName});
           this.assert(result, "" + node + " (id: " + node.id + ") no field named: " + fieldName);
           return result
       }

});

SerializationBaseTestCase.subclass('ASerializationTest', {
   
    testWorldMorphOnCanvas: function() {
        this.assert(this.worldMorph, 'No WorldMorph');
        this.assert(this.worldMorph.rawNode, 'RawNode');
        this.assertIdentity(this.worldMorph.rawNode.ownerDocument, this.dom, 'wrong owner');
        this.assert(this.dom.getElementById(this.worldMorph.rawNode.id), 'WorldMorph not on canvas');
    },

    testAddMorphAppendsRawNode: function() {
        var morph = Morph.makeRectangle(pt(100,200).extentAsRectangle());
        this.worldMorph.addMorph(morph);
        this.assert(this.dom.getElementById(morph.rawNode.id), 'rawNode not in DOM!');
        this.assert(this.worldMorph.submorphs.include(morph), 'rawNode not in DOM!');
        // this.showMyWorld();
    },
    
    testImportNode: function() {
        var string = 
            '<svg xmlns="http://www.w3.org/2000/svg" id="canvas">'+
                '<g type="Morph" id="101:Morph" transform="matrix(1 0 0 1 11 11)">'+
                    '<rect x="0" y="0" width="130" height="130" fill="rgb(250,250,250)"/>'+
                '</g>'+
            '</svg>';
        var xml = (new DOMParser()).parseFromString('<?xml version="1.0" standalone="no"?> ' + string, "text/xml");   
        this.assertEqual(xml.childNodes[0].childNodes[0].getAttribute("id"), "101:Morph");
        this.assert(xml.childNodes[0].childNodes[0].getAttribute("transform"), "has no transform");

        var node = Global.document.importNode(xml.childNodes[0].childNodes[0], true);
        this.assertEqual(node.id, "101:Morph", "imported node has no id");
        this.assert(node.transform, "imported nod has no transform");

        var morph = (new Importer()).importWrapperFromNode(node);
        this.assert(morph instanceof Morph, "result element is no morph")
        this.assert(morph.shape, "morph has  no shape")    
    },
    
    /* things learned:
     * the svg element is the canvas and is needed for deserialization
     */
    testLoadTwoMorphsWithoutWorld: function() {
        var world = this.loadWorldFromSource( 
            '<svg xmlns="http://www.w3.org/2000/svg" id="canvas">' +
                '<g type="Morph" id="102:Morph" transform="matrix(1 0 0 1 11 11)">'+
                    '<rect x="0" y="0" width="100" height="100" fill="rgb(250,0,0)"/>'+
                '</g>'+
                '<g type="Morph" id="103:Morph" transform="matrix(1 0 0 1 50 50)">'+
                    '<rect x="0" y="0" width="100" height="100" fill="rgb(0,0,250)"/>'+
                '</g>'+
            '</svg>');
        this.assert(world instanceof WorldMorph, "world is no WorldMorph");
        this.assertEqual(world.submorphs.length, 2, "world has two submorphs");
         
        //this.showMyWorld(world)
    },
    
    testLoadWorldWithTwoMorphs: function() {
        var world = this.loadWorldFromSource( 
            '<svg xmlns="http://www.w3.org/2000/svg" id="canvas">' +
                '<g type="WorldMorph" id="1:WorldMorph" transform="matrix(1 0 0 1 0 0)" fill="rgb(255,255,255)">'+
                    '<rect x="0" y="0" width="800" height="600"/>' +
                    '<g type="Morph" id="102:Morph" transform="matrix(1 0 0 1 11 11)">'+
                        '<rect x="0" y="0" width="100" height="100" fill="rgb(250,0,0)"/>'+
                        '<field name="exampleAttributePointAsValue" family="Point"><![CDATA[{"x":12,"y":34}]]></field>' +
                        '<field name="exampleReference" ref="103:Morph"></field>' +
                    '</g>'+
                    '<g type="Morph" id="103:Morph" transform="matrix(1 0 0 1 50 50)">'+
                        '<rect x="0" y="0" width="100" height="100" fill="rgb(0,0,250)"/>'+
                        '<field name="exampleReference" ref="102:Morph"></field>' +
                    '</g>'+
                '</g>'+
            '</svg>');
        this.assert(world instanceof WorldMorph, "world is no WorldMorph");
        var morph1 = world.submorphs[0];
        var morph2 = world.submorphs[1];
         
        this.assertEqual(morph1.exampleAttributePointAsValue, pt(12,34),"exampleAttributePointAsValue failed");
        this.assertEqual(morph1.id(), "102:Morph", "wrong id");
        this.assertIdentity(morph1.exampleReference, morph2, "morph1 failed to reference morph2");
        this.assertIdentity(morph2.exampleReference, morph1, "morph2 failed to reference morph1");
         
        //this.showMyWorld(show)
    },
    
    /*
     * - test an widget embedded into a morph and referenced from a different morph
     */
    testLoadWorldWithTwoMorphsAndWidget: function() {
        var world = this.loadWorldFromSource(
            '<svg xmlns="http://www.w3.org/2000/svg" id="canvas">' +
                '<g type="WorldMorph" id="1:WorldMorph" transform="matrix(1 0 0 1 0 0)" fill="rgb(255,255,255)">'+
                    '<rect x="0" y="0" width="800" height="600"/>' +
                    '<g type="Morph" id="102:Morph" transform="matrix(1 0 0 1 11 11)">'+
                        '<rect x="0" y="0" width="100" height="100" fill="rgb(250,0,0)"/>'+
                        '<field name="exampleAttributePointAsValue" family="Point"><![CDATA[{"x":12,"y":34}]]></field>' +
                        '<field name="exampleReference" ref="103:Morph"></field>' +
                        '<field name="myWidget" ref="104:DummyWidget"></field>' +
                        '<widget id="104:DummyWidget">'   +
                            '<field name="myMorph1" ref="102:Morph"></field>' +
                            '<field name="myMorph2" ref="103:Morph"></field>' +
                            '<field name="myPointValue" family="Point"><![CDATA[{"x":3,"y":4}]]></field>' +
                            '<array name="myArray">' +
                    			'<item ref="102:Morph"/>' +
                    			'<item ref="103:Morph"/>' +
                    		'</array>' +
                        '</widget>' +
                    '</g>'+
                    '<g type="Morph" id="103:Morph" transform="matrix(1 0 0 1 50 50)">'+
                        '<rect x="0" y="0" width="100" height="100" fill="rgb(0,0,250)"/>'+
                        '<field name="exampleReference" ref="102:Morph"></field>' +
                        '<field name="myWidget" ref="104:DummyWidget"></field>' +
                    '</g>'+
                '</g>'+
            '</svg>'); 
        var morph1 = world.submorphs[0];
        var morph2 = world.submorphs[1];
                
        var widget = morph1.myWidget;
        this.assert(widget instanceof DummyWidget, "morph1.myWidget is not DummyWidget");
        this.assertIdentity(morph1.myWidget, morph2.myWidget, "morph1.myWidget is not identical to morph2.myWidget");
        
        this.assert(widget.myMorph1, "widget.myMorph1 not set");
        this.assertIdentity(morph1, widget.myMorph1, "widget.morph1 is not identical to morph1");

        this.assert(widget.myPointValue, "widget.myPointValue not set");
        this.assert(widget.myArray, "widget.myArray not set"); 
        
        
        //this.showMyWorld(world)
    },


    /* Serialize Tests */

    testSerializeMorph: function() {
        var morph = new Morph(new lively.scene.Rectangle(this.bounds));
        morph.simpleNumber = 12345;
        morph.simpleString = "eineZeichenkette";
        this.worldMorph.addMorph(morph);
        var doc = Exporter.shrinkWrapMorph(this.worldMorph);
        
        this.assert(doc, "shrinkWrapMorph failed");
        var worldNode = doc.getElementById(this.worldMorph.id());
        this.assert(worldNode, "no world node by id found (" + this.worldMorph.id() + ")");
        var morphNode = doc.getElementById(morph.id());
        this.assert(morphNode, "no morph node by id found (" + morph.id() + ")"); 

        // console.log(Exporter.stringify(morphNode));
        /*
        <g xmlns="http://www.w3.org/2000/svg" type="Morph" id="171:Morph" transform="translate(10,10)">
           <rect x="0" y="0" width="90" height="90"/><field name="origin" family="Point"><![CDATA[{"x":10,"y":10}]]></field>
           <field name="fullBounds">null</field>
           <field name="simpleNumber">12345</field>
           <field name="simpleString"><![CDATA["eineZeichenkette"]]></field>
        </g>
        */
        var numberNode = this.getFieldNamed(morphNode, "simpleNumber");
        this.assertEqual(numberNode.textContent, "12345", "simpleNumber failed");
        
        var stringNode = this.getFieldNamed(morphNode, "simpleString");    
        this.assertEqual(stringNode.textContent, '"eineZeichenkette"', "simpleString failed");
    },

    testSerializeDummyWidget: function() {
       var widget = new DummyWidget();
       widget.sayHello();
       var view = widget.buildView();
       this.worldMorph.addMorph(view);
       
       var doc = Exporter.shrinkWrapMorph(this.worldMorph);
       var worldNode = doc.getElementById(this.worldMorph.id());
       this.assert(worldNode, "no world node by id found (" + this.worldMorph.id() + ")");
       
       var viewNode = doc.getElementById(view.id());
       this.assert(view, "no view node by id found (" + view.id() + ")");

       var widgetNode = doc.getElementById(widget.id());
       this.assert(widgetNode, "no widget node by id found (" + widget.id() + ")");
       
       var widgetNodeMyMorph1Field = this.getFieldNamed(widgetNode, "myMorph1");    
       this.assertEqual(widgetNodeMyMorph1Field.getAttribute("ref"), widget.myMorph1.id() ,"wrong ref to myMorph1");
       
       var widgetNodeMyMorph2Field = this.getFieldNamed(widgetNode, "myMorph2");
       this.assertEqual(widgetNodeMyMorph2Field.getAttribute("ref"), widget.myMorph2.id() ,"wrong ref to myMorph2");
       
       // console.log(Exporter.stringify(worldNode));
    },
    
    testSerializeDummyWidgetAddField: function() {
       var widget = new DummyWidget();
       widget.sayHello();
       widget.model.addField("MyDynamicField");
       this.assertEqualState(widget.model.definition, {MyText: {}, MyDynamicField: {}}, "dynamic definition missing");
       
       var view = widget.buildView();
       this.worldMorph.addMorph(view);
       var doc = Exporter.shrinkWrapMorph(this.worldMorph);
       var widgetNode = doc.getElementById(widget.id());
       var recordNode = widgetNode.firstChild;
       var definition = recordNode.firstChild;

       this.assertEqual(definition.textContent, '{"MyText":{},"MyDynamicField":{}}', "dynamic definition missing in serialization")
       console.log(Exporter.stringify(widgetNode));
    }
    
    
    
});


TestCase.subclass('DomRecordTest', {

    testAddField: function() {
        this.model = Record.newNodeInstance({StaticField: null});
        this.assertEqualState(this.model.definition, {StaticField: {}});
        this.model.addField("DynamicField");
        this.assertEqualState(this.model.definition, {StaticField: {}, DynamicField: {}});
        this.assert(this.model.getDynamicField && this.model.setDynamicField);
    }
});

}) // end of module