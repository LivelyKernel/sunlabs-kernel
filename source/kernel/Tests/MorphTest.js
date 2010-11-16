module('Tests.MorphTest').requires('lively.TestFramework').toRun(function() {

TestCase.subclass('Tests.MorphTest.MorphTest', {
	
	createTestMorph: function(owner) {
	    var m =  Morph.makeRectangle( 0,  0, 10, 10);
	    if (owner) owner.addMorph(m);
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

	testOwnerWidget: function() {
		var w = new Widget();
		this.m1.ownerWidget = w;
		this.assertIdentity(this.m1.getOwnerWidget(), w, "m1")
		this.assertIdentity(this.m2.getOwnerWidget(), w, "m2")
	},
});

TestCase.subclass('Tests.MorphTest.TextListMorphTest', {

	setUp: function() {
		this.morph = new TextListMorph(new Rectangle(0,0,100,100),[]);
		this.model = Record.newNodeInstance({List: [], Selection: null, Capacity: 4, 
			ListDelta: [], DeletionConfirmation: null, DeletionRequest: null});
	    this.morph.relayToModel(this.model, {
						List: "List", Selection: "Selection", Capacity: "-Capacity", 
						ListDelta: "-ListDelta", DeletionConfirmation: "-DeletionConfirmation", 
						DeletionRequest: "+DeletionRequest"});
	},
	
	tearDown: function() {
		this.morph.remove();
	},
	
	openMorph: function() {
		WorldMorph.current().addMorph(this.morph);		
	},
	
    testUpdateList: function() {
		this.morph.updateList(["Hallo"]);
		this.assertEqual(this.morph.itemList.length, 1);
    },
	
	testAppendList: function() {
		this.morph.appendList(["Hallo"]);
		this.assertEqual(this.morph.itemList.length, 1);
	},
	
	testDefaultCapacity: function() {
		this.assertEqual(this.morph.getCapacity(), 4);
		
	},
	
	testAppendListOverCapaciy: function() {
		this.openMorph();
		this.morph.updateList(["1","2","3"]);
		var firstY = this.morph.submorphs[0].getPosition().y;
		this.morph.appendList(["4","5","6"]);
		this.assertEqual(this.morph.itemList.length, 4);
		var resultPosY = Math.round(this.morph.submorphs[0].getPosition().y*100)/100
		var roundedFirstY = Math.round(firstY*100)/100
		this.assertEqual(resultPosY, roundedFirstY, "the layout did not get updated");
	},


});

TestCase.subclass('Tests.MorphTest.ListMorphTest', {

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
TestCase.subclass('Tests.MorphTest.DragnDropListTest',
'default category', {
	xtestDropItem: function() {
		var items = [{isListItem: true, string: 'a', value: 1},
			{isListItem: true, string: 'b', value: 2},
			{isListItem: true, string: 'c', value: 3}];
		var list = new FilterableListMorph(new Rectangle(0,0,100,300), items);
		var morphName = 'dragAndDropListTestMorph';
		var m = $morph(morphName); if (m) m.remove(); 
		list.name = morphName;
		list.openInWorld();
		list.setExtent(pt(300,300));
		var source = ["1","2","3","4"]	

		var dragWrapper = new DragWrapper(source[2],source, 2, newFakeMouseEvent(pt(5,5)))
		// var dropee = new TextMorph(new Rectangle(0,0,100,30), "dropee");
		// dropee.applyStyle({fill: null, borderWidth: 0});
		// dropee.ignoreEvents();
		var fakeHand = new HandMorph();
		fakeHand.setPosition(pt(5,5));
		fakeHand.addMorph(dragWrapper);
		dragWrapper.dropMeOnMorph(list);

		this.assertEqual(list.submorphs.length, 4, "wrong submorphs length")

		this.assertEqual(list.itemList.length, 4, "wrong item number")
},
});
TestCase.subclass('Tests.MorphTest.FilterableListMorphTest', {

	test01FilterDoesNotModifyItems: function() {
		var items = [{isListItem: true, string: 'a', value: 1},
			{isListItem: true, string: 'b', value: 2},
			{isListItem: true, string: 'c', value: 3}];
		var list = new FilterableListMorph(new Rectangle(0,0,100,300), items);
		this.assertEqual(3, list.submorphs.length);
		this.assertEqual(3, list.itemList.length);
		list.setFilter(/a|c/);
		this.assertEqual(2, list.submorphs.length);
		this.assertEqual(3, list.itemList.length);
		list.setFilter(/.*/);
		this.assertEqual(3, list.submorphs.length);
		this.assertEqual(3, list.itemList.length);
	},

});


TestCase.subclass('Tests.MorphTest.HandMorphTest', {
        
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
    
	testRemoveIndicatorMorph: function () {
		var hand = new HandMorph();
		hand.ensureIndicatorMorph();

		var indicatorMorph = hand.indicatorMorph;
		hand.removeIndicatorMorph();
		this.assert(!hand.indicatorMorph, "info text is still there");
		this.assert(!hand.submorphs.include(indicatorMorph), 
			"info morph still in submorphs");
	},

	testEnsusreIndicatorMorph: function () {
		var hand = new HandMorph()
		hand.ensureIndicatorMorph();
		this.assert(hand.indicatorMorph, "no info text");
		this.assert(hand.submorphs.include(hand.indicatorMorph), 
			"info text not in submorphs");
	},

    tearDown: function(){
        if(this.morph) this.morph.remove();
        if(this.morph2) this.morph2.remove();
    },
    
});

MorphTestCase.subclass('Tests.MorphTest.TextMorphTest', {
	setUp: function($super) {
		$super()
		this.m = new TextMorph(new Rectangle(0,0,100,100),"Hello World\n\n3+4\n123\t\tEnde");
		this.openMorph(this.m);
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
		var pos = 'Hello World'.length;
		m.startSelection(pos);
		m.extendSelection(pos+3);
		/*this.assertEqual(m.getCursorPos(), 5);
		this.assertEqual(m.getSelectionString(), '');
		m.extendSelection(4);*/
	},

	testSetTextUpdatesStyle: function() {
		var m = this.m;
		m.setTextString("1234")
		m.emphasizeAll({color: "green"})
		this.assertEqual(m.textString.size(), m.textStyle.length() - 1, "style broken 1")	

		m.setTextString("1234 Bla Bla")
		this.assert(!m.textStyle, "text style is not removed")	
	},

	testBrokenTextStyleIsDetected: function() {
		var m = this.m;
		m.setTextString("Hello")
		m.emphasizeAll({color: "green"})
		this.assertEqual(m.textString.size(), m.textStyle.length() - 1, "text and style have differnt length")	
		m.setTextString("Hello World")
		m.fitText();
	},

	testSetFontSizeDoesNotChangePadding: function() {
		var textMorph = new TextMorph(new Rectangle(0,0,100,100), "Hello");
		textMorph.autoAdjustPadding = false;
		
		var padding = Rectangle.inset(0, 0)
		textMorph.padding = padding;
	
		this.openMorph(textMorph);
	
		this.assertIdentity(textMorph.padding, padding, "padding changed before")
		textMorph.setFontSize(13);
		this.assertIdentity(textMorph.padding, padding, "padding changed after setFontSize")
	},


	testSetTestFontSizeDoesChangePaddingIfRequested: function() {
		var textMorph = new TextMorph(new Rectangle(0,0,100,100), "Hello");
		textMorph.autoAdjustPadding = true;
		
		var padding = Rectangle.inset(0, 0)
		textMorph.padding = padding;
	
		this.openMorph(textMorph);
	
		this.assertIdentity(textMorph.padding, padding, "padding changed before")
		textMorph.setFontSize(13);
		this.assert(textMorph.padding !== padding, "padding did not changed after setFontSize")
	},
	
});

TestCase.subclass('Tests.MorphTest.ImageMorphTest', {

	setUp: function() {
		this.m = new ImageMorph(rect(pt(0,0),pt(100,100)),"Resources/images/Halloween4.jpg");
        this.m.openInWorld();
		this.dontRemove = false;
	},

	testSetExtent: function() {
		
		// this.assertEqual(this.m.image.getWidth(), 100, "initial extent is false");
		this.m.setExtent(pt(200,200));
		this.assertEqual(this.m.image.getWidth(), 200, "extent is false");
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

TestCase.subclass('Tests.MorphTest.ScrollPaneTest', {

	testDisableScrollBar: function() {
		var scrollPane = Global.newTextListPane(new Rectangle(0,0,100,100));
		var scrollBar = scrollPane.getVerticalScrollBar();
		scrollPane.disableScrollBars();
		this.assert(!scrollBar.owner, "scrollBar is still open");
		this.assert(!scrollPane.verticalScrollBar, "scrollBar is still referenced");
    },

	testEnableScrollBar: function() {
		var scrollPane = Global.newTextListPane(new Rectangle(0,0,100,100));
		scrollPane.disableScrollBars();
		scrollPane.addVerticalScrollBar();
		this.assert(scrollPane.getVerticalScrollBar(), "scrollBar is not referenced");
		this.assert(scrollPane.getVerticalScrollBar().owner, "scrollBar is not open");
    },

});


TestCase.subclass('Tests.MorphTest.VideoMorphTest', {

	sourceFromYoutube: function() {
		return '<object width="425" height="344"><param name="movie" value="http://www.youtube.com/v/gGw09RZjQf8&hl=en&fs=1"></param><param name="allowFullScreen" value="true"></param><param name="allowscriptaccess" value="always"></param><embed src="http://www.youtube.com/v/gGw09RZjQf8&hl=en&fs=1" type="application/x-shockwave-flash" allowscriptaccess="always" allowfullscreen="true" width="425" height="344"></embed></object>';
	},
sourceFromVimeo: function() {
		return '<object width="400" height="544"><param name="allowfullscreen" value="true" /><param name="allowscriptaccess" value="always" /><param name="movie" value="http://vimeo.com/moogaloop.swf?clip_id=3038424&amp;server=vimeo.com&amp;show_title=1&amp;show_byline=1&amp;show_portrait=0&amp;color=&amp;fullscreen=1" /><embed src="http://vimeo.com/moogaloop.swf?clip_id=3038424&amp;server=vimeo.com&amp;show_title=1&amp;show_byline=1&amp;show_portrait=0&amp;color=&amp;fullscreen=1" type="application/x-shockwave-flash" allowfullscreen="true" allowscriptaccess="always" width="400" height="544"></embed></object><br /><a href="http://vimeo.com/3038424">Sun Lively Kernel on iPhone (simulator)</a> from <a href="http://vimeo.com/user825365">Steve Lloyd</a> on <a href="http://vimeo.com">Vimeo</a>';
	},


	testExtractURLFromVideoEmbedCode: function() {
	var sut = new VideoMorph();
	var result = sut.extractURL(this.sourceFromYoutube());
	this.assertEqual(result, "http://www.youtube.com/v/gGw09RZjQf8&hl=en&fs=1");
},
testExtractURLFromVideoEmbedCode2: function() {
	var sut = new VideoMorph();
	var result = sut.extractURL(this.sourceFromVimeo());
	this.assertEqual(result, "http://vimeo.com/moogaloop.swf?clip_id=3038424&amp;server=vimeo.com&amp;show_title=1&amp;show_byline=1&amp;show_portrait=0&amp;color=&amp;fullscreen=1");
},

testExtractExtent: function() {
	var sut = new VideoMorph();
	var result = sut.extractExtent(this.sourceFromYoutube());
	this.assertEqual(result.x, 425);
	this.assertEqual(result.y, 344);
},

});


TestCase.subclass('Tests.MorphTest.NodeMorphTest', {
	
	setUp: function() {
		this.spec = {maxDist: 100, minDist: 50, step: 20};
		var owner = Morph.makeRectangle(new Rectangle(0,0,10,10))
		owner.worldPoint = function(p) {return p};
		for (var i = 1; i <=3; i++) {
			var m = new NodeMorph(new Rectangle(0,0,20,20));
			m.configure(this.spec);
			m.setPosition(pt(0,0));
			owner.addMorph(m); // need owner for world position calculation...
			this['node' + i] = m; 
			
		}
	},

	assertEqualPt: function(p1, p2) { // sometimes the optimized functions are not 100% precise
		this.assert(Math.abs(p1.x-p2.x) < 0.01, 'point.x! ' + p1.x + ' vs. ' + p2.x);
		this.assert(Math.abs(p1.y-p2.y) < 0.01, 'point.y! '  + p1.y + ' vs. ' + p2.y);
	},

	testNodeConnectorForTwoNodeMorphs: function() {
		var connector = new ConnectorMorph(this.node1, this.node2);
		this.assertEqual(connector.getStartPos(), this.node1.getCenter());
		this.assertEqual(connector.getEndPos(), this.node2.getCenter());
	},

	testConnectorMovesWithMorphs: function() {
		var connector = new ConnectorMorph(this.node1, this.node2);
		this.node1.setPosition(pt(200,200));
		this.assertEqual(connector.getStartPos(), this.node1.getCenter());
		this.assertEqual(connector.getEndPos(), this.node2.getCenter());
	},

	testUnregisterNode: function() {
		var orig = this.node1.changed;
		var connector = new ConnectorMorph(this.node1, this.node2);
		this.assert(this.node1.changed != orig);
		connector.unregister('Start');
		this.assertEqual(orig, this.node1.changed);
		this.node1.setPosition(pt(99,99));
		this.assert(this.node1.getPosition() != connector.getStartPos());
	},

	testComputeRepulsionWithOneNode1: function() {
		this.node1.setPosition(pt(100,100));
		this.node2.setPosition(pt(150,100));
		var result = this.node1.forceOfMorphs([this.node2]);
		this.assertEqualPt(result, pt(-20, 0));
	},

	testComputeRepulsionWithOneNode2: function() {
		this.node1.setPosition(pt(100,100));
		this.node2.setPosition(pt(175,100));
		var result = this.node1.forceOfMorphs([this.node2]);
		this.assertEqualPt(result, pt(-20, 0));
	},

	testComputeRepulsionWithOneNode3: function() {
		this.node1.setPosition(pt(100,100));
		this.node2.setPosition(pt(201,100));
		var result = this.node1.forceOfMorphs([this.node2]);
		this.assertEqualPt(result, pt(0, 0));
	},

	testComputeRepulsion1: function() {
		this.node1.setPosition(pt(100,100));
		this.node2.setPosition(pt(60,100));
		this.node3.setPosition(pt(140,100));
		var result = this.node1.forceOfMorphs([this.node2, this.node3]);
		this.assertEqual(result, pt(0, 0)); // maxRepuslion = 20, minDist = 50, maxDist=100
	},

	testComputeRepulsion2: function() {
		this.node1.setPosition(pt(100,100));
		this.node2.setPosition(pt(120,100));
		this.node3.setPosition(pt(100,80));
		var result = this.node1.forceOfMorphs([this.node2, this.node3]);
		this.assertEqualPt(result, Point.polar(20, pt(-1,1).theta())); // maxRepuslion = 20, minDist = 50, maxDist=100
	},

	testConnectNodes1: function() {
		this.node1.connectTo(this.node2);
		this.assert(this.node1.connectedNodes().include(this.node2), 'node1->node2');
		this.assert(!this.node2.connectedNodes().include(this.node1), 'node2 -> node1 1');
		this.assert(this.node1.isConnectedTo(this.node2), 'node1->node2 *2');
		this.assert(!this.node2.isConnectedTo(this.node1), 'node2->node1 2');
	},

	testConnectNodes2: function() {
		this.node1.connectTo(this.node2);
		this.node2.connectTo(this.node1);
		this.assert(this.node1.connectedNodes().include(this.node2), 'node1->node2');
		this.assert(this.node2.connectedNodes().include(this.node1), 'node2 -> node1 1');
		this.assert(this.node1.isConnectedTo(this.node2), 'node1->node2 *2');
		this.assert(this.node2.isConnectedTo(this.node1), 'node2->node1 2');
	},

	testConnectNodes3: function() {
		this.node1.connectTo(this.node2);
		this.node2.remove();
		this.assertEqual(this.node1.connectedNodes().length, 0);
	},


	testDisconnectNodes1: function() {
		var con = this.node1.connectTo(this.node2);
		this.assert(this.node1.isConnectedTo(this.node2), 'node1->node2');
		this.node1.disconnect(this.node2);
		this.assert(!this.node1.isConnectedTo(this.node2), 'node1, node2 still connected');
		this.assert(!this.node1.connections.include(con));
		this.assert(!this.node2.connections.include(con));
	},


	testComputeAttraction1: function() {
		this.node1.setPosition(pt(100,100));
		this.node2.setPosition(pt(150,100)); // = minDist, no attraction
		this.node1.connectTo(this.node2);
		var result = this.node1.forceOfMorphs([this.node2]);
		this.assertEqualPt(result, pt(0, 0));
	},

	testComputeAttraction2: function() {
		this.node1.setPosition(pt(100,100));
		this.node2.setPosition(pt(175,100)); // = maxDist/2, half of max attraction
		this.node1.connectTo(this.node2);
		var result = this.node1.forceOfMorphs([this.node2]);
		this.assertEqualPt(result, pt(0, 0)); // maxRepuslion = 20, minDist = 50, maxDist=100
	},

	testComputeAttraction3: function() {
		this.node1.setPosition(pt(100,100));
		this.node2.setPosition(pt(60,100));
		this.node3.setPosition(pt(140,100)); // both nodes pull on node1
		this.node1.connectTo(this.node2);
		this.node1.connectTo(this.node3);
		var result = this.node1.forceOfMorphs([this.node2, this.node3]);
		this.assertEqual(result, pt(0, 0)); // maxRepuslion = 20, minDist = 50, maxDist=100
	},
});


// (new TestRunner()).openIn(this.world())
TestCase.subclass("Tests.MorphTest.HTMLFontCharWidthCompositionTest", {

	testFontComputeExtents: function() {
		var font = lively.Text.Font.forFamily("Helvetica", 100);
		var boldFont = lively.Text.Font.forFamily("Helvetica", 100, 'bold')
		var extents;
		var boldExtents;
		extents = font.computeExtents(font.family, font.size);

		var code = "l".charCodeAt(0);
		var charWidthOfW =  extents[code]
		this.assertEqualState(charWidthOfW, new lively.Text.CharacterInfo(22, 115), " char width of l is wrong");

		boldExtents = font.computeExtents(boldFont.family, boldFont.size, boldFont.style);
		var boldCharWidthOfW =  boldExtents[code]
		this.assertEqualState(boldCharWidthOfW, new lively.Text.CharacterInfo(28, 115), " char width of bold l is wrong");
		this.assert(charWidthOfW.width < boldCharWidthOfW.width, " bold l is not wider than regular l");
	}
})


TestCase.subclass("Tests.MorphTest.ProgressBarMorphTest", {

	setUp: function() {
		var morphName = "TheProgressTestMorph";
		if($morph(morphName))
			$morph(morphName).remove();
		this.progress = new ProgressBarMorph(new Rectangle(0,100,100,20));
		this.progress.name = morphName
		// this.progress.openInWorld()
	},

	testInitialize: function() {
		this.progress.openInWorld()
	},

	testSetValue: function() {
		this.progress.setValue(0.5);
		this.assertEqual(this.progress.bar.bounds().width, 50, "bar has wrong width")

		this.progress.setValue(0.75);
		this.assertEqual(this.progress.bar.bounds().width, 75, "bar has wrong width")
	}
})


TestCase.subclass('Tests.MorphTest.HorizontalDividerTest', {

	setUp: function($super) {
		$super();
		this.morphs = [];
	},

	tearDown: function($super) {
		$super()
		this.morphs.invoke('remove');
	},

	addMorphs: function(morphs) {
		this.morphs = morphs
		morphs.invoke('openInWorld');
	},

	test01ResizeMorphsAboveAndBelow: function() {
		var sut = new HorizontalDivider(new Rectangle(100,100, 100,15));
		var above = new BoxMorph(new Rectangle(100, 0, 10, 60));
		var below = new BoxMorph(new Rectangle(100, 110, 10, 50));
		sut.addScalingAbove(above);
		sut.addScalingBelow(below);
		this.addMorphs([sut, above, below]);
		sut.movedVerticallyBy(-10);
		this.assertEqual(50, above.getExtent().y)
		this.assertEqual(60, below.getExtent().y)
		this.assertEqual(100, below.getPosition().y)
	},

	test02MoveFixedMorphsAboveAndBelow: function() {
		var sut = new HorizontalDivider(new Rectangle(100,100, 100,15));
		var above = new BoxMorph(new Rectangle(100, 0, 10, 60));
		var below = new BoxMorph(new Rectangle(100, 110, 10, 50));
		sut.addFixed(above);
		sut.addFixed(below);
		this.addMorphs([sut, above, below]);
		sut.movedVerticallyBy(20);
		this.assertEqual(60, above.getExtent().y)
		this.assertEqual(50, below.getExtent().y)
		this.assertEqual(20, above.getPosition().y)
		this.assertEqual(130, below.getPosition().y)
	},

});
TestCase.subclass("Tests.MorphTest.LayoutTest",
'running', {
	
	setUp: function($super) {
		$super();
		this.layouter = new this.layouterClass()
	},

	tearDown: function($super) {
		$super();
		if (!this._errorOccured && this.morph)
			this.morph.remove() // othrwise let it stay open
	},

	createTestMorph: function(arg) {
		var spec = !arg || Object.isString(arg) ? {name: arg} : arg;
		spec.name = spec.name || this.currentSelector + '_testMorph';
		var pos = pt(0,0), extent = spec.extent || pt(300,100);
		if($morph(spec.name)) {
			pos = $morph(spec.name).getPosition();
			$morph(spec.name).remove();
		}
 		this.morph = new BoxMorph(pos.extent(extent));
		this.morph.layoutManager = this.layouter;
		this.morph.name = spec.name;
		this.morph.setFill(Color.gray);
		this.morph.openInWorld();
		return this.morph;		
	},

	box: function(extentX, extentY) {
		var m = Morph.makeRectangle(0,0, extentX || 50, extentY || 50);
		m.applyStyle({borderWidth: 0, fill: Color.random()})
		return m;
	},
},
'settings', {
	layouterClass: Global.LayoutManager2 || LayoutManager,
},
'testing', {
	test01aProportionalScaleMorph: function() {
		var m = this.createTestMorph({extent: pt(100, 100)}),
			box = this.box(10,10);
		m.setBorderWidth(0);
		box.hResizing = 'proportional';
		box.vResizing = 'proportional';
		m.addMorph(box);
		m.setExtent(pt(110, 110));
		this.assertEqual(box.getExtent(), pt(11,11), "wrong extent after resize");
	},
	test01bProportionalScaleAndMoveMorph: function() {
		var m = this.createTestMorph({extent: pt(100, 100)}),
			box = this.box(10,10);
		box.setPosition(pt(10,10))
		box.hResizing = 'proportional';
		box.vResizing = 'proportional';
		m.addMorph(box);
		m.setBorderWidth(0);
		m.setExtent(pt(110, 110));
		this.assertEqual(new Rectangle(11, 11, 11, 11), box.bounds(), "wrong extent after resize");
	},

});



Tests.MorphTest.LayoutTest.subclass("Tests.MorphTest.HorizontalLayoutTest",
'settings', {
	layouterClass: Global.HorizontalLayout2 || HorizontalLayout,
},
'testing', {

	test01aToLiteral: function() {
		var sut = new HorizontalLayout();
		this.assertEqualState(sut.toLiteral(), {} )
	},
	
	test01bFromLiteral: function() {
		var sut = HorizontalLayout.fromLiteral({})
		this.assert(sut instanceof HorizontalLayout)
	},

	test03Layout: function() {
		var m = this.createTestMorph("HorizontalLayoutTest_M2"),
			s1 = this.box(50,50),
			s2 = this.box(50,50),
			s3 = this.box(50,50);

		m.addMorph(s1);
		m.addMorph(s2);
		m.addMorph(s3);

		s2.remove();
		m.layoutManager.layout(m);	

		this.assertEqual(s1.getPosition(), pt(0,0), "s1 bad");
		this.assertEqual(s3.getPosition(), pt(50, 0), "s3 bad");
	},

	test02aLayoutOnAddMorph: function() {
		var m = this.createTestMorph(),
			s1 = this.box(50,50),
			s2 = this.box(50,50),
			s3 = this.box(50,50);

		m.addMorph(s1);
		m.addMorph(s2);
		m.addMorph(s3);
	
		this.assertEqual(s1.getPosition(), pt(0,0), "s1 bad");
		this.assertEqual(s2.getPosition(), pt(50, 0), "s2 bad");
		this.assertEqual(s3.getPosition(), pt(100, 0), "s3 bad");
	},

	test02bAddInGap: function() {
		var m = this.createTestMorph(),
			s1 = this.box(50,50),
			s2 = this.box(50,50),
			s3 = this.box(50,50),
			s4 = this.box(50,50);
		m.addMorph(s1);
		m.addMorph(s2);
		m.addMorph(s3);
		s2.remove();
		m.addMorph(s4);
		this.assertEqual(s4.getPosition(), pt(100, 0), "s4 bad " + s4.getPosition().x);
		s1.remove(); s4.remove(); m.addMorph(s4);
		this.assertEqual(s4.getPosition(), pt(50, 0), "s4 bad 2" + s4.getPosition().x);
	},

	test03aVerticalSpaceFillSubMorph: function() {
		var m = this.createTestMorph({extent: pt(100, 200)}),
			box = this.box(50,50);
		box.vResizing = 'spaceFill';
		m.addMorph(box);
		this.assertEquals(pt(50, 200), box.getExtent());
	},

	test03bHorizontalSpaceFillSubMorph: function() {
		var m = this.createTestMorph({extent: pt(300, 70)}),
			box1 = this.box(50,50), box2 = this.box(50,50), box3 = this.box(50,50);
		m.padding = Rectangle.inset(10,0,0,0)
		box1.hResizing = 'spaceFill';
		box2.hResizing = 'spaceFill';
		box3.hResizing = 'rigid';
		m.addMorph(box1);
		m.addMorph(box2);
		m.addMorph(box3);
		this.assertEquals(pt(50, 50), box3.getExtent(), 'box3');
		this.assertEquals(pt(120, 50), box1.getExtent(), 'box1');
		this.assertEquals(pt(120, 50), box2.getExtent(), 'box2');
	},

	test03cComputeMorphBounds: function() {
		var box1 = this.box(20,20), box2 = this.box(20,20);
		box1.hResizing = 'spaceFill';
		box2.hResizing = 'rigid';
		var bounds = this.layouter.computeMorphBounds([box1, box2], new Rectangle(0,0, 100, 20), pt(80, 20));
		this.assertEquals(new Rectangle(0,0, 80, 20), bounds[0]);
		this.assertEquals(new Rectangle(80,0, 20, 20), bounds[1])
	},
	test04aResizeAndCheckSubmorphPositions: function() {
		var m = this.createTestMorph({extent: pt(100, 100)}),
			b1 = this.box(50,100), b2 = this.box(50,100);
		m.addMorph(b1);
		m.addMorph(b2);
		this.assertEqual(b1.getPosition(), pt(0,0), "b1 pos before");
		this.assertEqual(b2.getPosition(), pt(50,0), "b2 pos before");
		m.setBounds(new Rectangle(-50, 0, 50, 100));
		this.assertEqual(b1.getPosition(), pt(0,0), "b1 pos after");
		this.assertEqual(b2.getPosition(), pt(50,0), "b2 pos after");
	},
	test05aMarginAndSpaceFill: function() {
		var m = this.createTestMorph({extent: pt(50, 50)}),
			box = this.box(10,10);
		box.margin = Rectangle.inset(10,10,10,10);
		box.hResizing = 'spaceFill';
		box.vResizing = 'spaceFill';
		m.addMorph(box);

		this.assertEquals(new Rectangle(10, 10, 30, 30), box.bounds());
	},
	test06aNoLayoutDuring: function() {
		var m = this.createTestMorph(),
			s1 = this.box(50,50),
			s2 = this.box(50,50);

		LayoutManager.noLayoutDuring(function() {
			m.addMorph(s1);
			m.addMorph(s2);
		});
		this.assertEqual(pt(0, 0), s1.getPosition());
		this.assertEqual(pt(0, 0), s2.getPosition());
		m.relayout();
		this.assertEqual(pt(50, 0), s2.getPosition());
	},




})


Tests.MorphTest.LayoutTest.subclass("Tests.MorphTest.VerticalLayoutTest",
'settings', {
	layouterClass: Global.VerticalLayout2 || VerticalLayout,
},
'testing', {

	test01Layout: function() {
		var m = this.createTestMorph(),
			s1 = this.box(50,50),
			s2 = this.box(50,50),
			s3 = this.box(50,50);

		s1.setBorderWidth(1);
		s2.setBorderWidth(1);
		s3.setBorderWidth(1);

		m.addMorph(s1);
		m.addMorph(s2);
		m.addMorph(s3);

		s2.remove();
		m.layoutManager.layout(m);	

		this.assertEqualState(s1.getPosition(), pt(0,0), "s1 bad");
		this.assertEqualState(s3.getPosition(), pt(0,50), "s3 bad");
	},

	test02LayoutBeforeAddMorph: function() {
		var m = this.createTestMorph(),
			s1 = this.box(50,50),
			s2 = this.box(50,50),
			s3 = this.box(50,50);

		s1.setBorderWidth(1);
		s2.setBorderWidth(1);
		s3.setBorderWidth(1);

		m.addMorph(s1);
		m.addMorph(s2);
		m.addMorph(s3);
	
		this.assertEqualState(s1.getPosition(), pt(0,0), "s1 bad");
		this.assertEqualState(s2.getPosition(), pt(0,50), "s2 bad");
		this.assertEqualState(s3.getPosition(), pt(0,100), "s3 bad");
	},
	test03aComputeMorphBoundsTwoMorphWithSpaceFill: function() {
		var box1 = this.box(20,20), box2 = this.box(20,20);
		box1.vResizing = 'spaceFill';
		box1.hResizing = 'rigid';
		box2.vResizing = 'rigid';
		box2.hResizing = 'spaceFill';
		var bounds = this.layouter.computeMorphBounds([box1, box2], new Rectangle(0,0, 60, 100), pt(40, 80));
		this.assertEquals(new Rectangle(0,0, 20, 80), bounds[0]);
		this.assertEquals(new Rectangle(0,80, 60, 20), bounds[1]);
	},
	test03bComputeSpaceFillPerMorphAndAttachToOwner: function() {
		var m = this.createTestMorph({extent: pt(100, 100)}),
			box1 = this.box(10,10), box2 = this.box(10,10);
		m.padding = Rectangle.inset(0,0,0,10);
		box2.margin = Rectangle.inset(0, 10, 0, 0);
		box1.hResizing = 'spaceFill';
		box1.vResizing = 'spaceFill';
		box2.hResizing = 'spaceFill';
		box2.vResizing = 'rigid';

		m.addMorph(box1);
		m.addMorph(box2);

		// this.layouter.computeSpaceFillExtentPerMorph(m, m.innerBounds(), m.submorphs);
		// this.assertEquals(pt(100 / 2, 50 - 10 - 10 - 5), m.getSpaceFillExtent(), "spaceFillExtent");
		this.assertEquals(new Rectangle(0,  0, 100, 70), box1.bounds(), "box1");
		this.assertEquals(new Rectangle(0, 80, 100, 10), box2.bounds(), "box2");
	},
	test05aMarginAndSpaceFill: function() {
		var m = this.createTestMorph({extent: pt(50, 50)}),
			box = this.box(10,10);
		box.margin = Rectangle.inset(10,10,10,10);
		box.hResizing = 'spaceFill';
		box.vResizing = 'spaceFill';
		m.addMorph(box);

		this.assertEquals(new Rectangle(10, 10, 30, 30), box.bounds());
	},

	test05bMarginAndRigid: function() {
		var m = this.createTestMorph({extent: pt(50, 50)}),
			box = this.box(10,10);
		box.margin = Rectangle.inset(10,10,10,10);
		box.hResizing = 'spaceFill';
		box.vResizing = 'rigid';
		m.addMorph(box);

		this.assertEquals(new Rectangle(10, 10, 30, 10), box.bounds());
	},

})


MorphTestCase.subclass("Tests.MorphTest.DuplicateTextMorphTest", {

	setUp: function($super) {
		$super();
		this.sut = new TextMorph(new Rectangle(0,0,100,100, "Hello World"));
	},
	
	testDuplicateWithFontSize: function() {
		var fontSize = 50;
		this.sut.setFontSize(fontSize);
		var copy = this.sut.duplicate();
		this.assertEqual(copy.fontSize, fontSize, "font size did not copy")	
	},
	
	testDuplicateCustomProperty: function() {
		var custom = "Hello Text";
		this.sut.myCustom = custom;
		var copy = this.sut.duplicate();
		this.assertEqual(copy.myCustom, custom, "custom property did not copy")	
	},
	
	
	testDuplicateRectangle: function() {
		var morph = Morph.makeRectangle(new Rectangle(100,100,100,50));
		morph.text = new TextMorph(new Rectangle(0,0,100,20));
		morph.addMorph(morph.text)

		// this.openMorph(morph);

		
		var copy = morph.duplicate();
		
		// this.assert(false)
		this.assert(morph.text !== copy.text, "text did not get copied")
	},
	
})


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
// logMethod(Morph.prototype, "onMouseDown");
//logMethod(HandMorph.prototype, "reallyHandleMouseEvent");

MorphTestCase.subclass('Tests.MorphTest.MouseEventTest', {

	test01OwnerCanCaptureEvent: function() {
		// tests if the owner morph's event handler is activated when first event handler returns false
		var evtForMorph1WasCaptured = false, evtForMorph2WasCaptured = false;
		var morph1 = new BoxMorph(new Rectangle(0,0, 100, 100))
		var morph2 = new BoxMorph(new Rectangle(10,10, 70, 70))
		morph1.setFill(Color.red); morph2.setFill(Color.green); // for debugging
		morph1.addMorph(morph2);
		this.openMorph(morph1);

		morph1.handlesMouseDown = Functions.True;
		morph2.handlesMouseDown = Functions.True;
		morph1.onMouseWheel = function(evt) {
			evtForMorph1WasCaptured = true
			console.log('morph1')
			return true;
		}

		morph2.onMouseWheel = function(evt) {
			evtForMorph2WasCaptured = true
			console.log('morph2')
			return false;
		}

		this.world.firstHand().setMouseFocus(null)
		this.doMouseEvent('mousewheel', pt(50,50), this.world);

		this.assert(evtForMorph2WasCaptured, 'not captured in morph2')
		this.assert(evtForMorph1WasCaptured, 'not captured in morph1')
	},

});


TestCase.subclass('Tests.MorphTest.RunArrayTest', {

	testSerializeRunArray: function() {
		var sut = new RunArray();
		var sut = new RunArray([10], [new TextEmphasis({color: new Color(1,0,0,1)})]);
		var string = JSON.serialize(sut.toLiteral());
		var copy= RunArray.fromLiteral(JSON.unserialize(string));
		this.assert(sut.values[0] instanceof TextEmphasis, "sut TextEmphasis broken");
		this.assert(copy.values[0] instanceof TextEmphasis, "copy TextEmphasis broken");	
		this.assert(sut.values[0].color instanceof Color,"sut is no color");
		this.assert(copy.values[0].color instanceof Color,"copy is no color");
	
		this.assertEqualState(sut.values[0], copy.values[0],"wrong values");
	},

	testSerializeTextEmphasis: function() {
		var sut = new TextEmphasis({color: Color.green})
		var string = JSON.serialize(sut)
	},

	testToLiteral: function() {
		var sut = new RunArray([10], [new TextEmphasis({color: Color.rgb(255,0,0)})])
		var string = JSON.serialize(sut.toLiteral());
		this.assertEqual(string, '{"runs":[10],"values":[{"color":{"r":1,"g":0,"b":0,"a":1}}]}')
	},

	testFromLiteral: function() {
		var obj = {runs: [10], values: [{color: {r: 100, g: 0, b: 0, a: 1}}]};

		var sut = RunArray.fromLiteral(obj);

		this.assert(sut.values[0] instanceof TextEmphasis)
		this.assert(sut.values[0].color instanceof Color, "color is no Color")

	},
	
})

TestCase.subclass('Tests.MorphTest.CopyLabelTest', {

	testCopyLabel: function() {
		var sut = new TextMorph(new Rectangle(0,0,100,100), "A Label").beLabel();
		this.assertIdentity(sut.mouseHandler, null, "mouseHandler is not null")

		var copy = sut.duplicate()
		this.assertEqual(copy.getTrait("pointer-events"), "none")
		this.assertIdentity(copy.mouseHandler, null, "the 'null' mouseHandler is not copied")
	},


})


TestCase.subclass('Tests.MorphTest.ClipMorphTest',
'testing', {
	testDuplicateClipMorph: function() {
		try {
			var  m = new BoxMorph(new Rectangle(0,0, 100,100))
			m.beClipMorph();
			m.openInWorld();
			this.assert(m.clip.rawNode, 'original clip has no rawNode');
			var m2 = m.duplicate();
			this.assert(m2.clip.rawNode, 'rawNode was not copied of clip!')
		} finally {
			m.remove();
		}
	},
});
}) // end of module