module('lively.Tests.MorphTest').requires('lively.TestFramework').toRun(function() {

TestCase.subclass('MorphTest', {
	
	createTestMorph: function(owner){
	    var m =  Morph.makeRectangle( 0,  0, 10, 10);
	    if(owner)
	        owner.addMorph(m);
	    return m
	},
	
	setUp: function() {
	    this.m1 = this.createTestMorph();
	    this.m2 = this.createTestMorph(this.m1);
	    this.m3 = this.createTestMorph(this.m2);
	    this.m4 = this.createTestMorph();
	},
	
	testIsContainedIn: function() {
	    this.assert(this.m2.isContainedIn(this.m1));
	    this.assert(this.m3.isContainedIn(this.m1));
	    this.assert(!this.m2.isContainedIn(this.m3));
	    this.assert(!this.m4.isContainedIn(this.m1));
	},
	
});

TestCase.subclass('ButtonMorphTest', {
	
	
	// testConnectButton: function() {
	// 	var b = new ButtonMorph(rect(10,10,20,20));
	// 	var counter = 0;
	// 	b.connectModel({onUpdateValue: function(value) {
	// 		counter += 1;
	// 	});
	// },
	
});

TestCase.subclass('ListMorphTest', {

    setUp: function() {
        this.model =  Record.newPlainInstance({MyList: [], MySelection: null});
        this.list  = new ListMorph(new Rectangle(80,80,50,20), ["----nope----"]);
        this.list.connectModel(this.model.newRelay({List: "MyList", Selection: "MySelection"}));
    },

    testStringList: function() {
        var myList = ["Hans", "Peter", "Maria"];
        this.model.setMyList(myList);
        this.assertEqual(this.list.itemList, myList);
        this.list.selectLineAt(1, true);
        this.assert(this.list.getSelection(), "list has no selection");
        this.assertEqual(this.list.submorphs.first().textString, "Hans", "wrong display of object");
        
    },

    testNumberList: function() {
        var myList = [1, 2, 3];
        this.model.setMyList(myList);
        this.assertEqual(this.list.itemList, myList);
        this.list.selectLineAt(1, true);
        this.assert(this.list.getSelection(), "list has no selection");
        this.assert(Object.isNumber(this.list.getSelection()), "selection is no number");
    },
    
    testObjectList: function() {
        var toStringFunc = function() {return this.msg}; 
        var myList = [{msg: "Hello"}, {msg: "World"}];
        myList[0].toString =  toStringFunc;
        this.model.setMyList(myList);
        this.assertEqual(this.list.itemList, myList);
        this.list.selectLineAt(1, true);
        // this.list.itemPrinter = function(item) {return item.msg};
        this.assert(this.list.getSelection().msg, "selection has no msg");
        this.assert(this.list.getSelection().msg, "Hello","wrong selection");
        this.assertEqual(this.list.submorphs.length, 2, "wrong number of submorphs");
        this.assertEqual(this.list.submorphs.first().textString, "Hello", "wrong display of object");
    },
    
    
    testItemPrinter: function() {
        this.list.itemPrinter = function(item) {return item.msg}; 
        var myList = [{msg: "Hello"}, {msg: "World"}];
        this.model.setMyList(myList);
        this.assertEqual(this.list.itemList, myList);

        this.list.selectLineAt(1, true);
        this.assert(this.list.getSelection().msg, "selection has no msg");
        this.assert(this.list.getSelection().msg, "Hello","wrong selection");
        this.assertEqual(this.list.submorphs.length, 2, "wrong number of submorphs");
        this.assertEqual(this.list.submorphs.first().textString, "Hello", "wrong display of object");
    },
    
    
    
});


TestCase.subclass('HandMorphTest', {
        
    testHandleMouseEvent: function() {
        var world = WorldMorph.current();
        var hand = world.hands.first();
        hand.mouseFocus = null;
        var morph = Morph.makeRectangle(100,100,200,200);
        this.morph = morph;
        morph.getHelpText  = function(){return "This is no help text!"};
        world.addMorph(morph);
        
        var evt = newFakeMouseEvent(pt(150,150));
        hand.reallyHandleMouseEvent(evt)
        this.assert(!hand.mouseFocus, "there is a focus where there should not be one");
        this.assert(hand.mouseOverMorph === morph, "morph is not mouseOverMorph");      
        
        var oldFocus = hand.mouseFocus;
        var m = Morph.makeRectangle(100,100,200,200);
        this.morph2 = m;
        WorldMorph.current().addMorph(m);
        m.setPosition(pt(400,400));
        this.assertIdentity(oldFocus, hand.mouseFocus);
        
        var evt = newFakeMouseEvent(pt(151,151));
        hand.reallyHandleMouseEvent(evt)
        this.assert(!hand.mouseFocus, "there is a focus where there should not be one");
        this.assert(hand.mouseOverMorph === morph, "morph is not mouseOverMorph");        
    },
    
    
    tearDown: function(){
        if(this.morph) this.morph.remove();
        if(this.morph2) this.morph2.remove();
    },
    
});

TestCase.subclass('TextMorphTest', {
    setUp: function() {
        this.m = new TextMorph(new Rectangle(0,0,100,100),"Hello\nWorld\n3+4\nEnde");
        WorldMorph.current().addMorph(this.m);
    },
    
    testLineNumberForIndex: function() {
        this.assertEqual(this.m.lines.length, 4, "wrong line numbers");
        this.assertEqual(this.m.lineNumberForIndex(0), 0);
        this.assertEqual(this.m.lineNumberForIndex(7), 1);
        this.assertEqual(this.m.lineNumberForIndex(13), 2);
        
    },
    
    testSelectionRange: function() {
        this.m.setSelectionRange(0,5);
        this.assertEqual(this.m.getSelectionString(), "Hello");
        this.m.setSelectionRange(6,11);
        this.assertEqual(this.m.getSelectionString(), "World");
    },
    
    tearDown: function() {
        this.m.remove();
        delete this.m
    },
    
});

TestCase.subclass('PinMorphInteractionTest', {

    testHandleMouseEventPinMorph: function() {
        var world = WorldMorph.current();
        var hand = world.hands.first();
        hand.mouseFocus = null;

        var fabrik = new FabrikComponent();
        var component = Fabrik.addTextComponent(fabrik); 
        this.window = fabrik.openIn(world);
        this.window.setPosition(pt(100,100));
        component.panel.setPosition(pt(100,100));
        
        var pinMorph = component.getPinHandle("Text").morph;
        var pos = pinMorph.worldPoint(pt(5,5));
        var evt = newFakeMouseEvent(pos);
        hand.reallyHandleMouseEvent(evt)
        this.assert(!hand.mouseFocus, "there is a focus where there should not be one");
        this.assert(hand.mouseOverMorph === pinMorph, "morph is not mouseOverMorph");              
        
        //var m = new Morph();
        // BUG: opening a morph in the world make the next morph loopup fail
        //WorldMorph.current().addMorph(m);
        //this.window.addMorph(m)
        // m.setPosition(pt(400,400));

        var pos = pinMorph.worldPoint(pt(6,6));
        var evt = newFakeMouseEvent(pos);
        hand.reallyHandleMouseEvent(evt)
        this.assert(!hand.mouseFocus, "there is a focus where there should not be one");
        this.assert(hand.mouseOverMorph === pinMorph, "morph is not mouseOverMorph");              

    },

    tearDown: function(){
        if(this.window) this.window.remove();
    },


});

// logMethod(Morph.prototype, "morphToGrabOrReceive");
// logMethod(Morph.prototype, "onMouseOut");
// logMethod(Morph.prototype, "onMouseOver");
// logMethod(HandMorph.prototype, "reallyHandleMouseEvent");

TestCase.subclass('SerializeMorphTest', {
	
	setUp: function() {
		this.bounds = rect(pt(10,10), pt(100,100));
	    this.parentMorph =  Morph.makeRectangle(0,0, 300, 300);
	},
	
	exportMorph: function(morph) {
	    var exporter = new Exporter(morph);
    	exporter.extendForSerialization();
		return exporter.rootMorph.rawNode
	},
	
	xtestSerializeMorph: function(){
	    this.morph = new Morph(new lively.scene.Rectangle(this.bounds));
		this.morph.simpleNumber = 1232342;
		this.morph.simpleString = "eineZeichenkette";
		this.parentMorph.addMorph(this.morph);
		var node = this.exportMorph(this.morph);
		this.assert(node);
		var string = Exporter.stringify(node);
		this.assert(string.match(this.morph.simpleNumber.toString()), "number is not serialized");
		 this.assert(string.match(this.morph.simpleString), "string is not serialized");
		//<g xmlns="http://www.w3.org/2000/svg" type="Morph" id="261" transform="matrix(1.000000 0.000000 0.000000 1.000000 10.000000 10.000000)"><rect x="0" y="0" width="90" height="90" fill="rgb(178,188,0)" stroke-width="1" stroke="rgb(0,0,0)"/></g>
		// console.log(Exporter.stringify(node));
	},
    
    xtestSerializeTextMorph: function(){
            this.morph = new TextMorph(this.bounds);
            this.parentMorph.addMorph(this.morph);
            var node = this.exportMorph(this.morph);
            this.assert(node);
           //<g xmlns="http://www.w3.org/2000/svg" type="TextMorph" id="258" stored-text="" transform="matrix(1.000000 0.000000 0.000000 1.000000 10.000000 10.000000)">
           //   <rect x="0" y="0" width="90" height="90" fill="rgb(243,243,243)" stroke-width="1" stroke="rgb(0,0,0)"/>
           //   <field name="textSelection" ref="259"/>
           //   <g type="TextSelectionMorph" id="259" pointer-events="none" transform="matrix(1.000000 0.000000 0.000000 1.000000 0.000000 0.000000)">
           //      <rect x="0" y="0" width="0" height="0" fill="none" stroke-width="0" stroke="rgb(0,0,0)"/>
           //   </g>
           //   <text kerning="0" fill="rgb(0,0,0)" font-size="12" font-family="Helvetica"/>
           //</g>
           //console.log(Exporter.stringify(node));
    },
    
    xtestSerializeTextMorphWithModel: function(){
        var text = "Hello World";
        // var rawNode =  NodeFactory.create("g");
        var rawNode = {};
        this.model = Record.newInstance({Message: {}},{},rawNode);
        this.morph = new TextMorph(this.bounds);
        this.morph.connectModel(this.model.newRelay({Text: "Message"}));
        this.model.setMessage(text);
        this.assertEqual(this.morph.getText(), text);
        //WorldMorph.current().addMorph(this.morph);
        this.parentMorph.addMorph(this.morph);
        var node = this.exportMorph(this.morph);
        this.assert(node);
      
        // <g xmlns="http://www.w3.org/2000/svg" type="TextMorph" id="261" stored-text="%22Hello%20World%22" 
        //  transform="matrix(1.000000 0.000000 0.000000 1.000000 10.000000 10.000000)">
        //     <rect x="0" y="0" width="90" height="21.2" fill="rgb(243,243,243)" stroke-width="1" stroke="rgb(0,0,0)"/>
        //     <field name="textSelection" ref="262"/>
        //     <g type="TextSelectionMorph" id="262" pointer-events="none" 
        //      transform="matrix(1.000000 0.000000 0.000000 1.000000 0.000000 0.000000)">
        //         <rect x="0" y="0" width="0" height="0" fill="none" stroke-width="0" stroke="rgb(0,0,0)"/></g>
        //         <text kerning="0" fill="rgb(0,0,0)" font-size="12" font-family="Helvetica">
        //             <tspan x="6" y="14.8">Hello</tspan><tspan x="38" y="14.8">World</tspan>
        //         </text>
        //     </g>
        //console.log(Exporter.stringify(node));
        
        console.log("Model:" + Exporter.stringify(this.model.rawNode));
    },
    

	xtestSerializeDummyWidget: function(){
       dm = new DummyWidget();
       dm.sayHello();
       dm.openIn(WorldMorph.current())
       d = Exporter.shrinkWrapMorph(WorldMorph.current());
       console.log(Exporter.stringify(d))
       //dm.remove();
    },

  


	// t = new ASerializeMorphTest(); debugFunction(function(){t.setUp(); t.testSerializeDummyMorph()})
	xtestSerializeDummyMorph: function(){
	    // var world = new WorldMorph(Global.document.getElementById("canvas"));
	    var world = WorldMorph.current();
        var morph = new DummyMorph();
        var myValue = "EinsZweiDrei";
        morph.formalModel.setMyValue(myValue);
        world.addMorph(morph);
        var doc = Exporter.shrinkWrapMorph(world);
        var string = Exporter.stringify(doc);
        // <g type="WorldMorph" id="1" transform="matrix(1.000000 0.000000 0.000000 1.000000 0.000000 0.000000)">
        //  <defs>
        //      <linearGradient x1="0" y1="0" x2="0" y2="1" gradientTransform="translate(0, -0.1) skewY(10)" id="gradient_1">
        //          <stop offset="0" stop-color="rgb(169,193,208)"/>
        //          <stop offset="0.25" stop-color="rgb(83,130,161)"/>
        //          <stop offset="0.5" stop-color="rgb(169,193,208)"/>
        //          <stop offset="0.75" stop-color="rgb(83,130,161)"/>
        //          <stop offset="1" stop-color="rgb(169,193,208)"/>
        //      </linearGradient>
        //  </defs>
        //  <rect x="0" y="0" width="1105" height="653" fill="url(#gradient_1)" stroke-width="1" stroke="rgb(0,0,0)"/>
        //  <g type="DummyMorph" id="4" transform="matrix(1.000000 0.000000 0.000000 1.000000 0.000000 0.000000)">
        //      <rect x="0" y="0" width="100" height="40" fill="rgb(178,188,0)" stroke-width="1" stroke="rgb(0,0,0)"/>
        //      <g MyValue="EinsZweiDrei" id="model_0"/>
        //  </g>
        // </g>
        // console.log("SERIALIZE:" + string);
        this.assert(string.match(myValue), "myValue got not serialized");
        //dm.remove();
    },
	
	xtestSerializeDummyMorph2: function(){
  	    // var world = new WorldMorph(Global.document.getElementById("canvas"));
  	    var world = WorldMorph.current();
          var morph = new DummyMorph();
          var morph2 = new DummyMorph();
          var myValue = "EinsZweiDrei";
          var myValue2 = "OneTwoThree";
          morph.formalModel.setMyValue(myValue);
          morph2.formalModel.setMyValue(myValue2);
          world.addMorph(morph);
          world.addMorph(morph2);
          var doc = Exporter.shrinkWrapMorph(world);
          var string = Exporter.stringify(doc);
          this.assert(string.match(myValue), "myValue got not serialized");
          this.assert(string.match(myValue2), "myValue2 got not serialized");
          // console.log("SERIALIZE:" + string);
          // ...<g type="DummyMorph" id="4" transform="matrix(1.000000 0.000000 0.000000 1.000000 0.000000 0.000000)">
          //    <rect x="0" y="0" width="100" height="40" fill="rgb(178,188,0)" stroke-width="1" stroke="rgb(0,0,0)"/>
          //    <g MyValue="EinsZweiDrei" id="model_0"/>
          // </g>
          // <g type="DummyMorph" id="5" transform="matrix(1.000000 0.000000 0.000000 1.000000 0.000000 0.000000)">
          //    <rect x="0" y="0" width="100" height="40" fill="rgb(178,188,0)" stroke-width="1" stroke="rgb(0,0,0)"/>
          //    <g MyValue="OneTwoThree" id="model_1"/>
          // </g>....
    },
     
    xtestSerializeDummyMorph2OneModel: function(){
  	    // var world = new WorldMorph(Global.document.getElementById("canvas"));
  	    var world = WorldMorph.current();
          var morph = new DummyMorph();
          var morph2 = new DummyMorph();
          var myValue = "EinsZweiDrei";
          morph.formalModel.setMyValue(myValue);
          morph2.connectModel(morph.formalModel.newRelay({MyValue: "MyValue"}));
          world.addMorph(morph);
          world.addMorph(morph2);
          var doc = Exporter.shrinkWrapMorph(world);
          var string = Exporter.stringify(doc);
          this.assert(string.match(myValue), "myValue got not serialized");
          console.log("SERIALIZE:" + string);
          
        // <g type="DummyMorph" id="4" transform="matrix(1.000000 0.000000 0.000000 1.000000 0.000000 0.000000)">
        //      <rect x="0" y="0" width="100" height="40" fill="rgb(178,188,0)" stroke-width="1" stroke="rgb(0,0,0)"/>
        // </g>
        // <g type="DummyMorph" id="5" transform="matrix(1.000000 0.000000 0.000000 1.000000 0.000000 0.000000)">
        //      <rect x="0" y="0" width="100" height="40" fill="rgb(178,188,0)" stroke-width="1" stroke="rgb(0,0,0)"/>
        //      <g MyValue="EinsZweiDrei" id="model_0"/>
        // </g>
    }, 
     
     
	tearDown: function() {
        
	},
	
});



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
        this.setMyText("Hello World");
    },
    
    buildView: function(extent) {
        this.panel = new Morph(new lively.scene.Rectangle(rect(pt(20,20), pt(150,150))));
        this.panel.setFill(Color.green);    
        this.morph =  new TextMorph(rect(pt(10,10), pt(100,30)));
        this.morph2 =  new TextMorph(rect(pt(10,40), pt(100,60)));
        this.morph.widget = this;
        this.morph.connectModel(this.model.newRelay({Text: "MyText"}));
        this.morph2.connectModel(this.model.newRelay({Text: "MyText"}));
        this.panel.addMorph(this.morph);
        this.panel.addMorph(this.morph2);        
        return  this.panel;
    },
    
    open: function(){
        this.buildView();
        WorldMorph.current().addMorph(this.panel);
    }

});


// 
// TestCase.subclass('ObjectExplorerTest', {
// 	
// 	testHelloWorld: function(){
// 		var items = [new SelectorFolder(this, "Hello World", [])]
// 		var model =  new SelectorFolder(this, "The Model", items);
// 		var view = new SelectorView(rect(pt(10,10), pt(100,100)));
// 		view.setModel(model);
// 		view.updateView();
// 		WorldMorph.current().addMorph(view);
// 		this.assertEqual(view.submorphs.length, 1);
// 	},
// 	
// });
// 



//logMethod(Morph.prototype, "morphToGrabOrReceive");
//logMethod(Morph.prototype, "onMouseDown");
//logMethod(HandMorph.prototype, "reallyHandleMouseEvent");

}) // end of module