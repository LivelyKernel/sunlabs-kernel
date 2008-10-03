/* For Serialization tests we need a own WorldMorph and thus a own SVG canvas */

TestCase.subclass('ASerializationTestCase', {
   
    setUp: function() {
        this.realWorld = WorldMorph.current();
        this.dom = stringToXML('<svg xmlns="http://www.w3.org/2000/svg" xmlns:lively="http://www.experimentalstuff.com/Lively" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xhtml="http://www.w3.org/1999/xhtml" id="canvas" width="100%" height="100%" xml:space="preserve" xmlns:xml="http://www.w3.org/XML/1998/namespace" zoomAndPan="disable">' +
            '<title>Lively Kernel canvas</title>' + '</svg>');
        this.canvas = this.dom.documentElement;
        this.worldMorph = new WorldMorph(this.canvas);
        this.canvas.appendChild(this.worldMorph.rawNode);
   },
   
   tearDown: function() {
       WorldMorph.currentWorld = this.realWorld;
   },

   showMyWorld: function() {
       // for debugging
       var oldCanvas = document.getElementById('canvas');
       var owner = oldCanvas.parentElement;
       // hack, so that we do not run into a conflict: when calling importNode the canvas changes
       this.worldMorph.rawNode.parentNode.removeChild(this.worldMorph.rawNode);
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
       var morph = new Morph(pt(100,200).extentAsRectangle());
       this.worldMorph.addMorph(morph);
       this.assert(this.dom.getElementById(morph.rawNode.id), 'rawNode not in DOM!');
       this.assert(this.worldMorph.submorphs.include(morph), 'rawNode not in DOM!');
       // this.showMyWorld();
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