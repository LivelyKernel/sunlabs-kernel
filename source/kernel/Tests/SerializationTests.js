module('lively.Tests.SerializationTests').requires('lively.TestFramework').toRun(function() {

/* For Serialization tests we need a own WorldMorph and thus a own SVG canvas */

TestCase.subclass('ASerializationTestCase', {
   
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
        return (new Importer()).loadWorldContents(xml);
    },

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
                            '<field name="morph1" ref="102:Morph"></field>' +
                            '<field name="morph2" ref="102:Morph"></field>' +
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
        
        this.assert(morph1.myWidget instanceof DummyWidget, "morph1.myWidget is not DummyWidget");
        this.assertIdentity(morph1.myWidget, morph2.myWidget, "morph1.myWidget is not identical to morph2.myWidget");
        
        var widget = morph1.myWidget;
        //this.assert(widget.morph1, "widget.morph1 not set");
        //this.assertIdentity(morph1, widget.morph1, "widget.morph1 is not identical to morph1");
        //this.showMyWorld(world)
    }
});



// 
// TestCase.subclass('SharedNodeModelTest', {
//     
//     setUp: function() {
//         this.widget = new Widget();
//         this.model = Record.newNodeInstance({MyMorph: null, MyWidget: null});
//         this.morph = new Morph();
//         this.world = WorldMorph.current();
// 
//         this.world.addMorph(this.morph)
// 
//         this.morph.addNonMorph(this.widget.rawNode);
// 
//     },
//     
//     // testStoringMorphReferences: function(number){        
//     //     this.model.setMyMorph(this.morph);
//     //     var found = Wrapper.prototype.getWrapperByUri(this.model.getMyMorph());
//     //     this.assertIdentity(found, this.morph, "failed to store morph")
//     // }, 
// 
//     // testStoringWidgetReferences: function(number){        
//     //     this.model.setMyWidget(this.widget);
//     //     var found = Wrapper.prototype.getWrapperByUri(this.model.getMyWidget());
//     //     this.assertIdentity(found, this.widget, "failed to store widget")
//     // }, 
//     split
//     // m = new Morph(); WorldMorph.current().addMorph(m); m.linkWrapee(); n = Global.document.getElementById(m.id()); n.wrapper
//     // testGetWrapperByUri: function(number){        
//     //     var uri = this.morph.uri();
//     //     this.assert(uri,"no uri");
//     //     this.assert(this.morph.rawNode,"no raw node");
//     //     this.assertIdentity(Wrapper.prototype.getWrapperByUri(uri), this.morph);
//     // },
//     
//     tearDown: function() {
//         this.morph.remove();
//     }
//     
// });
// 
// 
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