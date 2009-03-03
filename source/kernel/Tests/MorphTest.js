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
        this.m = new TextMorph(new Rectangle(0,0,100,100),"Hello World\n\n3+4\n123\t\tEnde");
        this.m.openInWorld();
		this.dontRemove = false;
    },
    
    testLineNumberForIndex: function() {
        this.assertEqual(this.m.lines.length, 4, "wrong line numbers");
        this.assertEqual(this.m.lineNumberForIndex(0), 0);
        this.assertEqual(this.m.lineNumberForIndex(7), 0);
        this.assertEqual(this.m.lineNumberForIndex(12), 1);
    },
    
    testSelectionRange: function() {
        this.m.setSelectionRange(0,5);
        this.assertEqual(this.m.getSelectionString(), "Hello");
        this.m.setSelectionRange(6,11);
        this.assertEqual(this.m.getSelectionString(), "World");
    },

	testExtendSelection: function() {
		var m = this.m;
		this.dontRemove = false;
		m.startSelection(5);
		this.assertEqual(m.getCursorPos(), 5);
		this.assertEqual(m.getSelectionString(), '');
		m.extendSelection(4);
		this.assertEqual(m.getCursorPos(), 4);
		this.assertEqual(m.getSelectionString(), 'o');
		m.extendSelection(11);
		this.assertEqual(m.getCursorPos(), 11);
		this.assertEqual(m.getSelectionString(), ' World');
	},

	testExtendSelection2: function() {
		var m = this.m;
		this.dontRemove = true;
		var pos = 'Hello World'.length;
		m.startSelection(pos);
		m.extendSelection(pos+3);
		/*this.assertEqual(m.getCursorPos(), 5);
		this.assertEqual(m.getSelectionString(), '');
		m.extendSelection(4);*/
	},
 
    tearDown: function() {
		if (this.dontRemove) {
			this.m.requestKeyboardFocus(WorldMorph.current().firstHand());
			return;
		}
        this.m.remove();
    },
    
});

TestCase.subclass('AImageMorphTest', {

	setUp: function() {
		this.m = new ImageMorph(rect(pt(0,0),pt(100,100)),"Resources/images/Halloween4.jpg");
        this.m.openInWorld();
		this.dontRemove = false;
	},

	testSetExtent: function() {
		
		this.assertEqual(this.m.image.getWidth(), 100, "initial extent is false");
		this.m.setExtent(pt(200,200));
		// should this work?
		// this.assertEqual(this.m.image.getWidth(), 200, "extent did not get updated false");
    },

	testSetImageWidth: function() {
		this.m.image.setWidth(200);
		this.assertEqual(this.m.image.getWidth(), 200);
    },

	testSetImageHeight: function() {
		this.m.image.setHeight(200);
		this.assertEqual(this.m.image.getHeight(), 200);
    },

    tearDown: function() {
		if (this.dontRemove) {
			this.m.requestKeyboardFocus(WorldMorph.current().firstHand());
			return;
		}
        this.m.remove();
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
TestCase.subclass('VideoMorphTest', {

	sourceFromYoutube: function() {
		return '<object width="425" height="344"><param name="movie" value="http://www.youtube.com/v/gGw09RZjQf8&hl=en&fs=1"></param><param name="allowFullScreen" value="true"></param><param name="allowscriptaccess" value="always"></param><embed src="http://www.youtube.com/v/gGw09RZjQf8&hl=en&fs=1" type="application/x-shockwave-flash" allowscriptaccess="always" allowfullscreen="true" width="425" height="344"></embed></object>';
	},

	testExtractURLFromVideoEmbedCode: function() {
	var sut = new VideoMorph();
	var result = sut.extractURL(this.sourceFromYoutube());
	this.assertEqual(result, "http://www.youtube.com/v/gGw09RZjQf8&hl=en&fs=1");
},
testExtractExtent: function() {
	var sut = new VideoMorph();
	var result = sut.extractExtent(this.sourceFromYoutube());
	this.assertEqual(result.x, 425);
	this.assertEqual(result.y, 344);
},

});

// logMethod(Morph.prototype, "morphToGrabOrReceive");
// logMethod(Morph.prototype, "onMouseOut");
// logMethod(Morph.prototype, "onMouseOver");
// logMethod(HandMorph.prototype, "reallyHandleMouseEvent");


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