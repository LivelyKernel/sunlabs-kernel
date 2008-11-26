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

    showMyWorld: function() {
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
        var string      = 
            '<svg xmlns="http://www.w3.org/2000/svg" id="canvas">'+
                '<g type="Morph" id="101:Morph" transform="matrix(1 0 0 1 11 11)">'+
                    '<rect x="0" y="0" width="130" height="130" fill="rgb(250,250,250)"/>'+
                '</g>'+
            '</svg>';
        var parser      = new DOMParser();    
        var xml         = parser.parseFromString('<?xml version="1.0" standalone="no"?> ' + string, "text/xml");   
        this.assertEqual(xml.childNodes[0].childNodes[0].getAttribute("id"), "101:Morph");
        this.assert(xml.childNodes[0].childNodes[0].getAttribute("transform"), "has no transform");

        var node        = Global.document.importNode(xml.childNodes[0].childNodes[0], true);
        this.assertEqual(node.id, "101:Morph", "imported node has no id");
        this.assert(node.transform, "imported nod has no transform");

        var importer    = new Importer();
        var morph       = importer.importWrapperFromNode(node);
        this.assert(morph instanceof Morph, "result element is no morph")
        this.assert(morph.shape, "morph has  no shape")    
    },
    
    /* things learned:
     * the svg element is the canvas and is needed for deserialization
     */
    testLoadTwoMorphsWithoutWorld: function() {
         var string = 
             '<svg xmlns="http://www.w3.org/2000/svg" id="canvas">' +
                 '<g type="Morph" id="102:Morph" transform="matrix(1 0 0 1 11 11)">'+
                     '<rect x="0" y="0" width="100" height="100" fill="rgb(250,0,0)"/>'+
                 '</g>'+
                 '<g type="Morph" id="103:Morph" transform="matrix(1 0 0 1 50 50)">'+
                     '<rect x="0" y="0" width="100" height="100" fill="rgb(0,0,250)"/>'+
                 '</g>'+
             '</svg>';

         var parser = new DOMParser();    
         var xml = parser.parseFromString('<?xml version="1.0" standalone="no"?> ' + string, "text/xml");   

         this.assertEqual(xml.childNodes[0].childNodes[0].getAttribute("id"), "102:Morph");
         this.assert(xml.childNodes[0].childNodes[0].getAttribute("transform"), "has no transform");

         var importer = new Importer();
         var world = importer.loadWorldContents(xml);

         this.assert(world instanceof WorldMorph, "world is no WorldMorph");
         this.assertEqual(world.submorphs.length, 2,  "world has two submorphs");
         
         // this.worldMorph = world;
         // this.showMyWorld()
    },
    
    
    testLoadWorldWithTwoMorphs: function() {
         var string = 
             '<svg xmlns="http://www.w3.org/2000/svg" id="canvas">' +
                 '<g type="WorldMorph" id="1:WorldMorph" transform="matrix(1 0 0 1 0 0)" fill="rgb(255,255,255)">'+
                     '<rect x="0" y="0" width="800" height="600"/>' +
                     '<g type="Morph" id="102:Morph" transform="matrix(1 0 0 1 11 11)">'+
                        '<rect x="0" y="0" width="100" height="100" fill="rgb(250,0,0)"/>'+
                     '</g>'+
                     '<g type="Morph" id="103:Morph" transform="matrix(1 0 0 1 50 50)">'+
                        '<rect x="0" y="0" width="100" height="100" fill="rgb(0,0,250)"/>'+
                     '</g>'+
                 '</g>'+
             '</svg>';
         var parser = new DOMParser();    
         var xml = parser.parseFromString('<?xml version="1.0" standalone="no"?> ' + string, "text/xml");   
         var importer = new Importer();
         var world = importer.loadWorldContents(xml);
         this.assert(world instanceof WorldMorph, "world is no WorldMorph");
         
         //this.worldMorph = world;
         //this.showMyWorld()
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