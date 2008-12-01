module('lively.Tests.FabrikTest').requires(
    'lively.TestFramework', 
    'lively.Tests.SerializationTests', 
    'lively.Fabrik').toRun(function(ownModule) {

TestCase.subclass('FabrikTestCase', {
    
    setUp: function() {
        this.fabrikComponent = new FabrikComponent();
    },
    
    buildFabrikWithComponents: function(number, optExtent){
        var fabrik = this.fabrikComponent;
        fabrik.buildView(optExtent);
        this.components = range(1, number).collect(function() {
            return fabrik.plugin(new TextComponent());
        });
        return this.fabrikComponent;
    }, 
});

FabrikTestCase.subclass('FabrikTest', {

    testPluginTextComponent: function() {
        this.textComponent = new TextComponent();
        this.fabrikComponent.plugin(this.textComponent);
        this.assertEqual(this.fabrikComponent.components.length, 1);
    },	

	testBuildView: function() {
    	this.buildFabrikWithComponents(0);
        //this.fabrikComponent.openIn(WorldMorph.current());
    	//this.assert(this.fabrikComponent.morph.openForDragAndDrop);
	},
	testBuildViewAfterPlugin: function() {
		var textComponent = new TextComponent();
	    this.fabrikComponent.plugin(textComponent);
	    this.assert(!textComponent.morph);
	    this.fabrikComponent.buildView();
	    this.assert(textComponent.morph, "buildView has to build the component morphs");
	},
	testConnectTextComponents: function(){
	    this.buildFabrikWithComponents(2);
	    this.components[0].getPin("Text").connectTo(this.components[1].getPin("Text"));
	    this.assertEqual(this.fabrikComponent.connectors.length, 1);
	},
	testDoublePluginConnectors: function(){
	    this.buildFabrikWithComponents(2);
	    this.components[0].getPin("Text").connectTo(this.components[1].getPin("Text"));
	    this.components[0].getPin("Text").connectTo(this.components[1].getPin("Text"));
	    this.assertEqual(this.fabrikComponent.connectors.length, 1);
	},
	testReversePluginConnectors: function(){
	    this.buildFabrikWithComponents(2);
	    this.components[0].getPin("Text").connectTo(this.components[1].getPin("Text"));
	    this.components[1].getPin("Text").connectTo(this.components[0].getPin("Text"));
	    this.assertEqual(this.fabrikComponent.connectors.length, 1);
	},

    testRemoveConnector: function() {
        this.buildFabrikWithComponents(2);
        var con = this.components[0].getPin("Text").connectTo(this.components[1].getPin("Text"));
		this.assert(con, "plugin failed");
		con.remove();
		this.assertEqual(this.fabrikComponent.connectors.length, 0,"connectors: "+ this.fabrikComponent.connectors);	
    },
    
    testRemoveComponent: function() {
        this.buildFabrikWithComponents(1);
        this.components[0].panel.remove(); // high level remove
		this.assertEqual(this.fabrikComponent.components.length, 0, "component not removed");
		this.assert(!this.components[0].fabrik, "fabrik reference still there");
    },
    
    testFabrikInFabrikConnectorsBelongsToInner: function() {
        var innerFabrik = new FabrikComponent();
        this.fabrikComponent.plugin(innerFabrik);
        this.fabrikComponent.buildView();
        this.assertIdentity(innerFabrik.fabrik, this.fabrikComponent, 'innerFabrik is not correctly plugged in');
        this.assertIdentity(innerFabrik.morph.owner, this.fabrikComponent.morph, 'innerFabrik has not correct owner morph');
        
        innerFabrik.addPin('Test1');
        innerFabrik.addPin('Test2');
        // connectPins via addMorph and fakePin to simulate a click
        var fakeP = innerFabrik.getPin('Test1').createFakePinHandle();
        innerFabrik.getPin('Test2').morph.addMorph(fakeP.morph);
        this.assert(innerFabrik.getPin('Test1').isConnectedTo(innerFabrik.getPin('Test2')), 'no connection between pins');
        this.assertEqual(this.fabrikComponent.connectors.length, 0, 'out fabrik has a connector');
        this.assertEqual(innerFabrik.connectors.length, 1, 'no connector added for connected pin');
        this.assert(innerFabrik.connectors.first().morph, 'no morph created for connector');
        this.assertIdentity(innerFabrik.connectors.first().morph.owner, innerFabrik.morph, 'connector has wrong owner morph');
    },
    
    testConnectorRegistration: function() {
        this.buildFabrikWithComponents(2);
        this.assertEqual(this.fabrikComponent.connectors.length, 0, 'already connected things!')
        this.components[0].getPin('Text').connectTo(this.components[1].getPin('Text'));
        this.assertEqual(this.fabrikComponent.connectors.length, 1, 'already connected things!')
    }
});

FabrikTestCase.subclass('FabrikComponentConnectionTest', {
    
    createPinsAndTryToConnect: function(comp1, comp2) {
        var pin1 = comp1.addPin('Test1');
        var pin2 = comp2.addPin('Test2');
        pin1.connectTo(pin2);
        return {from: pin1, to: pin2};
    },
    
    assertConnectable: function(comp1, comp2) {
        var pins = this.createPinsAndTryToConnect(comp1, comp2);
        this.assert(pins.from.isConnectedTo(pins.to),
            'could not create connection from ' + comp1 + ' to ' + comp2);
    },
    
    assertUnconnectable: function(comp1, comp2) {
        var pins = this.createPinsAndTryToConnect(comp1, comp2);
        this.assert(!pins.from.isConnectedTo(pins.to),
            'CONNECTION created from ' + comp1 + ' to ' + comp2);
    },
    /* ------------------------------------------------------------- */
    
    testConnectTwoInnerFabriks: function() {
        var innerFabrik1 = new FabrikComponent();
        var innerFabrik2 = new FabrikComponent();
        this.fabrikComponent.plugin(innerFabrik1);
        this.fabrikComponent.plugin(innerFabrik2);
        this.assertConnectable(innerFabrik1, innerFabrik2);
        this.assertConnectable(innerFabrik2, innerFabrik1);
    },
    
    testConnectTwoFabriks: function() {
        var innerFabrik1 = new FabrikComponent();
        var innerFabrik2 = new FabrikComponent();
        this.assertConnectable(innerFabrik1, innerFabrik2);
        this.assertConnectable(innerFabrik2, innerFabrik1);
    },
    
    testConnectInnerToOuterFabrik: function() {
        var innerFabrik = new FabrikComponent();
        this.fabrikComponent.plugin(innerFabrik);
        this.assertConnectable(innerFabrik, this.fabrikComponent);
        this.assertConnectable(this.fabrikComponent, innerFabrik);
    },
    
    testConnectComponentFromInnerToOuterFabrik: function() {
        var innerFabrik = new FabrikComponent();
        this.fabrikComponent.plugin(innerFabrik);
        var component = new Component();
        innerFabrik.plugin(component);
        this.assertUnconnectable(component, this.fabrikComponent);
        this.assertUnconnectable(this.fabrikComponent, component);
    },
    
    testConnectComponentsInInnerFabriks : function() {
        var innerFabrik1 = new FabrikComponent();
        var innerFabrik2 = new FabrikComponent();
        this.fabrikComponent.plugin(innerFabrik1);
        this.fabrikComponent.plugin(innerFabrik2);
        var component1 = new Component();
        var component2 = new Component();
        innerFabrik1.plugin(component1);
        innerFabrik2.plugin(component2);
        this.assertUnconnectable(component1, component2);
        this.assertUnconnectable(component2, component1);
    },
    
    testConnectComponentsInInnerFabriks : function() {
        var component = new Component();
        this.fabrikComponent.plugin(component);
        var pin = this.fabrikComponent.addPin('Test');
        var fakePin = pin.createFakePinHandle();
        this.assert(pin.isConnectableTo(fakePin), 'cannot create connection between pin and its fakepin');
    }
    
});
FabrikTestCase.subclass('FabrikMorphTest', {

    // not longer necessary, beacause of reachablePins
    // testAllPins: function() {
    //     this.buildFabrikWithComponents(3);
    //     var pins = this.fabrikComponent.morph.allPins();
    //     this.assertEqual(pins.length, 3)
    // },
    
    // testAllPinsConsidersFabriksOwnPins: function() {
    //     this.buildFabrikWithComponents(3);
    //     this.fabrikComponent.addPin('Test');
    //     var pins = this.fabrikComponent.morph.allPins();
    //     this.assertEqual(pins.length, 4)
    // },

    // testallPinSnappPoints: function() {
    //        this.buildFabrikWithComponents(3);
    //        var pins = this.fabrikComponent.morph.allPinSnappPoints();
    //        this.assertEqual(pins.length, 3)
    //    },
    
    setupForGetSubmorphTests: function() {
        this.morph = new FabrikMorph();
        this.morph.setPosition(pt(0,0));
        this.morph.setExtent(pt(300,300));
        this.submorph1 = new ComponentMorph();
        this.morph.addMorph(this.submorph1);
        this.submorph1.setPosition(pt(10,10));
        this.submorph1.setExtent(pt(30,30));
        this.submorph2 = new ComponentMorph();
        this.morph.addMorph(this.submorph2);
        this.submorph2.setPosition(pt(15,15));
        this.submorph2.setExtent(pt(30,30));
        this.submorph3 = new ComponentMorph();
        this.morph.addMorph(this.submorph3);
        this.submorph3.setPosition(pt(12,12));
        this.submorph3.setExtent(pt(50,10));
    },
    
    testGetMorphsNearBorders: function() {
        this.setupForGetSubmorphTests();
        var result = this.morph.getComponentMorphsNearBorders();
        this.assertIdentity(result.left, this.submorph1, 'left morph not found');
        this.assertIdentity(result.top, this.submorph1, 'top morph not found');
        this.assertIdentity(result.right, this.submorph3, 'right morph not found');
        this.assertIdentity(result.bottom, this.submorph2, 'bottom morph not found');
    },
    
    testAddWindowFrameMorph: function() {
        this.buildFabrikWithComponents(1);
        var fabMorph = this.fabrikComponent.morph;
        var window = fabMorph.framed();
        this.assert(window instanceof WindowMorph, 'Window not windowMorph?')
        this.assertIdentity(window, fabMorph.owner, 'window not owner')
    },
    
    testRemoveWindowFrameMorph: function() {
        this.buildFabrikWithComponents(1);
        var fabMorph = this.fabrikComponent.morph;
        var window = fabMorph.framed();
        fabMorph.unframed();
        
        // this.assert(fabMorph.owner !== window, 'owner not removed');
    },
    
    testCollapseRemovesAllComponentMorphsResizesAndMoves: function() {
        this.buildFabrikWithComponents(2);
        var fabMorph = this.fabrikComponent.morph;
        var position = fabMorph.getPosition();
        this.assert(fabMorph.submorphs.include(this.components[0].panel), 'no morph for textComp1');
        this.assert(fabMorph.submorphs.include(this.components[1].panel), 'no morph for textComp2');
        this.assertEqual(fabMorph.getExtent(), this.fabrikComponent.defaultViewExtent, 'strange size');
        fabMorph.collapsedPosition = pt(400,300);
        fabMorph.collapse();
        this.assert(!fabMorph.submorphs.include(this.components[0].panel), 'textComp1 not removed');
        this.assert(!fabMorph.submorphs.include(this.components[1].panel), 'textComp2 not removed');
        this.assertEqual(fabMorph.getPosition(), pt(400,300), 'wrong collapsed position');
        this.assertEqual(fabMorph.getExtent(), this.fabrikComponent.defaultCollapsedExtent, 'not resized');
    },
   
});

FabrikTestCase.subclass('PointSnapperTest', {
    testDetectNearPoint: function() {
        var points = [pt(0,0), pt(0,100), pt(100,100)];
        var snapper = new PointSnapper(null, points);
        this.assertEqualState(snapper.detectPointNear(pt(0,0)), pt(0,0), "no direct match"); 
        this.assertEqualState(snapper.detectPointNear(pt(1,1)), pt(0,0), "no near match"); 
        this.assertEqual(snapper.detectPointNear(pt(40,40)), null), "false hit"; 
    }
});

FabrikTestCase.subclass('UserFrameTest', {
    
    setUp: function($super) {
        $super();
        var fab = this.buildFabrikWithComponents(2, pt(100,100));
        WorldMorph.current().addMorphFrontOrBack(fab.panel, true, true);
        fab.panel.setPosition(pt(0,0));
        // fab.morph.setExtent(pt(100,100));
    },
    
    tearDown: function() {
        var fab = this.fabrikComponent;
        if (fab.morph.owner instanceof WindowMorph)
            fab.morph.owner.remove();
        fab.morph.remove();
    },
    
    testAddUserframe: function() {
        var fab = this.fabrikComponent;
        var handle = fab.morph.makeSelection(newFakeMouseEvent(pt(20,20)));
        handle.onMouseUp(newFakeMouseEvent(pt(80,80))); // simulate a mouse move
        this.assert(fab.morph.currentSelection, 'No selection made');
        this.assertEqual(fab.morph.currentSelection.getExtent(), pt(60,60), 'Selection has wrong size');
    },
    
    testSelectComponents: function() {
        var fab = this.fabrikComponent;
        var comp1 = this.components[0];
        var comp2 = this.components[1];
        comp1.panel.setPosition(pt(25,25));
        comp1.panel.setExtent(pt(50,50));
        comp2.panel.setPosition(pt(60,60));
        comp2.panel.setExtent(pt(50,50));
        var handle = fab.morph.makeSelection(newFakeMouseEvent(pt(20,20)));
        handle.onMouseUp(newFakeMouseEvent(pt(80,80))); // simulate a mouse move
        var sel = fab.morph.currentSelection;
        // debugger;
        this.assertEqual(sel.selectedMorphs.length, 1, 'no selection?');
        this.assert(sel.selectedMorphs.include(comp1.panel), 'wrong selection');
    },
    
    testSelectedMorphsStayWhenCollapsing: function() {
        var fab = this.fabrikComponent;
        var comp1 = this.components[0];
        var comp2 = this.components[1];
        var handle = fab.morph.makeSelection(newFakeMouseEvent(pt(20,20)));
        handle.onMouseUp(newFakeMouseEvent(pt(80,80)));
        var sel = fab.morph.currentSelection;
        // remove this assignment when the test above run
        sel.selectedMorphs = [comp1.panel];
        fab.morph.collapse();
        this.assert(!fab.morph.submorphs.include(comp2.panel), 'not selected morph not removed');
        this.assert(fab.morph.submorphs.include(comp1.panel), 'selected morph removed');
    }
});

FabrikTestCase.subclass('FlowLayoutTest', {
  
    testAutomaticLayout: function() {
        // this test really depends on the extent of the fabric component, so
        // better set it properly so that the test will not go wrong!
        this.fabrikComponent.defaultViewExtent = pt(500,300),
        this.buildFabrikWithComponents(10);
        this.fabrikComponent.morph.automaticLayout();
        // this.assert(this.components[0].panel.position().x < this.components[1].panel.position().x, "second morph must be right");
        //      this.assert(this.components[2].panel.position().y > 0,
        //      "the 3th morph has to be on the next line: " + 
        //      "\n   position: " + this.components[2].morph.position() +
        //      "\n   width: " + this.components[2].morph.bounds().width + 
        //      "\n   fabrik width: " + this.fabrikComponent.morph.bounds().width);
        //      this.assert(this.components[2].panel.position().x < 40, 
        //      "the 3th morph has to be at the beginning of the line" + this.components[4].morph.position());
    },
    testAutomaticLayoutGui: function() {
        this.buildFabrikWithComponents(10);
        this.fabrikComponent.buildView();
        // uncomment next line for having a look at the resulting layout
        // this.fabrikComponent.openIn(WorldMorph.current());
        this.fabrikComponent.morph.automaticLayout();
    },
});

TestCase.subclass('ComponentModelTest', {
    
    setUp: function() {
        this.model = ComponentModel.newModel();
    },

	testSetAndGetText: function() {
		this.model.addField("Text");
		this.assert(this.model.getText instanceof Function, "getText method was not created");
		this.assert(this.model.setText instanceof Function, "setText method was not created");
		
		var text = 'text that will be written to the model';
		this.model.setText(text);
		this.assertEqual(this.model.getText(), text, "Written value cannot be extracted");
	},
	
	testForcedSet: function() {
	    var wasRun = false;
	    var text = 'text that will be written to the model';
	    var test = this;
	    
	    this.model.addField("Test");
	    this.model.addObserver({onTestUpdate: function(val) { test.assertEqual(val, text); wasRun = true }});
	    this.model.setTest(text);
	    this.assert(wasRun, 'not triggered first time');
	    wasRun = false;
	    
	    this.model.setTest(text, null, true);
	    this.assert(wasRun, 'not triggered second time');
	},
	
	testForcedSetViaRelay: function() {
	    var wasRun = false;
	    var text = 'text that will be written to the model';
	    var test = this;
	    
	    this.model.addField("Test");
	    this.model.addObserver({onTestUpdate: function(val) { test.assertEqual(val, text); wasRun = true }});
	    var relay = this.model.newRelay({RelayTest: 'Test'});
	    relay.setRelayTest(text);
	    this.assert(wasRun, 'not triggered first time');
	    wasRun = false;
	    
	    relay.setRelayTest(text, undefined /*optSource*/, true /*force*/);
	    this.assert(wasRun, 'not triggered second time');
	},
	
	testObserver: function() {
		this.model.addField("Text");
		var wasRun;
		var text = 'text';
		var test = this;
		this.model.addObserver({onTextUpdate: function(value) {
				test.assertEqual(value, text);
				wasRun = true;}});
		this.assert(this.model["Text$observers"], "no observer array for text pin");
		this.assertEqual(this.model["Text$observers"].length, 1);
		this.model.setText(text);
		this.assert(wasRun);
	},
	
	setUpForObserverRemoveTest: function() {
		this.model.addField("Field1");
		this.model.addField("Field2");
		this.observerModel = ComponentModel.newModel();
		this.observerModel.addField("ObserverField1");
		this.observerModel.addField("ObserverField2");
	},
	
	testRemoveObserver1: function() { // remove the observer in one fields
		this.setUpForObserverRemoveTest();
		this.model.addObserver(this.observerModel, {Field1: "=setObserverField1"});
		this.model.removeObserver(this.observerModel, "Field1");
		this.assertEqual(this.model["Field1$observers"].length, 0);
		this.model.setField1("text");
		this.assert(!this.observerModel.getObserverField1(), "ObserverField1 was updated although no observer connection exists");
	},
	
	testRemoveObserver2: function() { // remove the observer in two fields
        // debugger;
		this.setUpForObserverRemoveTest();
		this.model.addObserver(this.observerModel, {Field1: "=setObserverField1", Field2: "=setObserverField2"});
		this.model.removeObserver(this.observerModel);
		this.assertEqual(this.model["Field1$observers"].length, 0);
		this.assertEqual(this.model["Field2$observers"].length, 0);
	},
	
	testRemoveObserver3: function() { // remove a specific observer from a specific field, don't delete the observer in another field
		this.setUpForObserverRemoveTest();
		this.model.addObserver(this.observerModel, {Field1: "=setObserverField1"});
		this.model.addObserver(this.observerModel, {Field2: "=setObserverField2"});
		this.model.removeObserver(this.observerModel, "Field1");	
		this.assertEqual(this.model["Field1$observers"].length, 0);
		this.assertEqual(this.model["Field2$observers"].length, 1, "Field2$observers was removed");
	},
	
	testRemoveObserver4: function() { // remove only one dependency from a field and let the other one alone
		this.setUpForObserverRemoveTest();
		var observerModel2 = ComponentModel.newModel();
		observerModel2.addField("Observer2Field");
		this.model.addObserver(this.observerModel, {Field1: "=setObserverField1"});
		this.model.addObserver(observerModel2, {Field1: "=setObserver2Field"});
		this.assertEqual(this.model["Field1$observers"].length, 2, "Setup failure");
		this.model.removeObserver(this.observerModel, "Field1");
		this.assertEqual(this.model["Field1$observers"].length, 1);
		this.model.setField1("text");
		this.assertEqual(observerModel2.getObserver2Field(), "text", "Observer2 did not get the data");
		this.assert(!this.observerModel.getObserverField1(), "Observer received something");
	},
	
	testRemoveObserver5: function() { // remove custom observer
		this.setUpForObserverRemoveTest();
		var o = {onField1Update: { }}
		this.model.addObserver(o);
		this.assertEqual(this.model["Field1$observers"].length, 1, "Field1$observers was not installed");
		this.model.removeObserver(o);
		this.assertEqual(this.model["Field1$observers"].length, 0, "Field1$observers was not removed");
	},
	
	testRemoveObserver6: function() { // delete all observers of a specific field
		this.setUpForObserverRemoveTest();
		this.model.addObserver(this.observerModel, {Field1: "=setObserverField1"});
		this.model.removeObserver(null, 'Field1');
		this.assert(!this.model["Field1$observers"], "Field1$observers was not removed");

	},
	
	// testRemoveObserver5: function() {
	// 	this.setUpForObserverRemoveTest();
	// 	this.model.addObserver(this.observerModel, {Field1: "=setObserverField1"});
	// 	this.model.addObserver(this.observerModel, {Field1: "=setObserverField2"});
	// 	this.assertEqual(this.model["Field1$observers"].length, 2, "Setup failure");
	// 	this.model.removeObserver(this.observerModel, "Field1", "=setObserverField1");
	// 	this.assertEqual(this.model["Field1$observers"].length, 1, "Whole observer was removed");
	// },

	testAddAlreadyExistingField: function() {
		var model = ComponentModel.newModel();
		model.addField("TestPin");
		model.setTestPin("content");
		model.addField("TestPin");
		this.assertEqual(model.getTestPin(), "content", "addField overwrote content");
	},
	
	testCreateModelDoesNotAffectComponentModelClass: function() {
		var model = ComponentModel.newModel();
		var ModelClass = model.constructor;
		model.addField("TestPin");
		this.assert(ModelClass.functionNames().include("getTestPin"), "class wasn't correctly extended");
		this.assert(!Record.functionNames().include("getTestPin"), "Record was modified");
	},
	
	testCreateNewModelClassCreatesIndependentModels: function() {
		var model = ComponentModel.newModel();
		var ModelClass1 = model.constructor;
		var ModelClass2 = ComponentModel.newModel().constructor;
		model.addField("TestPin");
		this.assert(ModelClass1.functionNames().include("getTestPin"));
		this.assert(!ModelClass2.functionNames().include("getTestPin"));
	},
	
	testHowARelayAsASetterAndGetterWorks: function() {
	    this.model.addField("Test");
	    var value = 123;
	    this.model.setTest(value);
	    var relay = this.model.newRelay({OtherNameForTest: "Test"});
	    this.assert(relay.getOtherNameForTest, 'no getter exists');
	    this.assertEqual(relay.getOtherNameForTest(), value, 'getter cannot get value');
	    this.assert(relay.setOtherNameForTest, 'no setter exists');
	    this.model.setTest(null); // reset
	    relay.setOtherNameForTest(value);
	    this.assertEqual(this.model.getTest(), value, 'setter cannot set value');
	}
	
});

TestCase.subclass('FabrikComponentTest', {
        
    testConnectToFabriksWithPins: function() {
        var fab1 = new FabrikComponent();
        var fab2 = new FabrikComponent();
        var pin1 = fab1.addPin('Test1');
        var pin2 = fab2.addPin('Test2');
        pin1.connectTo(pin2);
        
    }
});

TestCase.subclass('ComponentTest', {
    setUp: function() {
        this.component = new Component();
    },

    testCreateFields: function() {
        var comp = this.component;
        this.assert(!comp.getTest, 'component field accessor already existing');
        this.assert(!comp.setTest, 'component field accessor already existing');
        comp.addField('Test');
        this.assert(comp.getTest instanceof Function, "getText method was not created");
        this.assert(comp.setTest instanceof Function, "setText method was not created");
        var text = 'text that will be written to the model';
        comp.setTest(text);
        this.assertEqual(comp.getTest(), text, "Written value cannot be extracted");
    },
	
	testAddPinHandle: function() {
		var comp = this.component;
		this.assertEqual(comp.pinHandles.length, 0, "Already pins inside the component");
		fieldName = 'Test';
		comp.addFieldAndPinHandle(fieldName);
		this.assertEqual(comp.pinHandles.length, 1);
		this.assertEqual(comp.pinHandles[0].getName(), fieldName);
	},
		
	testPinInputModifiesComponentModel: function() {
		var comp = this.component;
		comp.addFieldAndPinHandle('Test');
		var pinHandle = comp.pinHandles[0];
		var content = 'something';
		pinHandle.setValue(content);
		this.assertEqual(comp.getTest(), content, "Pin value did not reach component");
	},
	
	testComponentModelChangeReachesPin: function() {
		var comp = this.component;
		comp.addFieldAndPinHandle('Test');
		var pinHandle = comp.pinHandles[0];
		var content = 'something';
		comp.setTest(content);
		this.assertEqual(pinHandle.getValue(), content, "Component change did not reach Pin");
	},
	
	testGetPinHandle: function() {
		var comp = this.component;
		comp.addFieldAndPinHandle('Test');
        this.assert(comp.getPinHandle("Test"));
    },
    
    testRemovePin: function() {
		var comp = this.component;
		comp.addFieldAndPinHandle('Test');
		comp.removePin('Test');
        // this.assert(!comp.getTest, 'accessors not removed');
        this.assert(!comp.getPin('Test'), 'pin still there');
    },
    
    testRemovePinRemovesConnectors: function() {
		var comp = this.component;
		comp.addPin('Test');
		var otherComp = new Component();
		otherComp.addPin('Test2');
        comp.getPin('Test').connectTo(otherComp.getPin('Test2'));
		
        comp.removePin('Test');
        this.assertEqual(otherComp.getPin('Test2').connectors.length, 0, 'connection not removed');
    },
    
    testPinHandleAndHisMorph: function() {
        var comp = this.component;
        comp.addFieldAndPinHandle('Test');;
        comp.buildView();
        var pinMorph = comp.getPinHandle("Test").morph;
        myComp = comp;
        this.assert(comp.morph.submorphs.any(function(morph) { return morph === pinMorph} ),
            'created no morph for pinhandle');
    },
    
    testPinHandleMorphCreatedWhenPinAdded: function() {
        var comp = this.component;
        comp.buildView();
        comp.addFieldAndPinHandle('Test');

        this.assertEqual(comp.pinHandles.length, 1, 'No morph created for pin');
        var pinMorph = comp.getPinHandle("Test").morph;
        this.assert(pinMorph, 'No morph created for pin test');
        this.assert(comp.morph.submorphs.any(function(morph) { return morph === pinMorph} ),
            'pinHandleMorph not added to component');
    },
    
    testAddTextMorphForField: function() {
        var comp = this.component;
        comp.addFieldAndPinHandle('Test');
        comp.buildView();
        comp.addTextMorphForFieldNamed('Test');
        this.assertEqual(comp.morph.constructor, TextMorph, 'not correct morph');
        comp.morph.setTextString('new text'); // setText triggers doSave directly
        comp.morph.doSave();
        this.assertEqual(comp.getTest(), 'new text', 'error with morph -> component connection');
        comp.setTest('other new text');
        this.assertEqual(comp.morph.getText(), 'other new text', 'error with component -> morph connection');
    },
    
    testResavingFromMorphTextForcesUpdateOfField: function() {
        var test = this;
        var wasTriggered = false;
        var comp = this.component;
        comp.addFieldAndPinHandle('Test');
        comp.formalModel.addObserver({onTestUpdate: function(value) {
                test.assertEqual(value, 'text', 'wrong value'); wasTriggered = true; 
        }});
        comp.buildView();
        comp.addTextMorphForFieldNamed('Test');
        comp.morph.setTextString('text');
        comp.morph.doSave();
        this.assert(wasTriggered, 'somethin is really wrong: setter not even triggered when set first time');
        wasTriggered = false
        comp.morph.setTextString('text'); // setText triggers doSave directly
        comp.morph.doSave();
        this.assert(wasTriggered, 'resaving morph does not forces push');
    },
    
    testModelFieldForcesSet: function() {
		var comp = this.component;
		var wasCalled = false;
		var content = 'something';
		var test = this;
		comp.addFieldAndPinHandle('Test', null, true);
		comp.formalModel.setTest = comp.formalModel.setTest.wrap(function(proceed, value, optSource, force) {
		    proceed(value, optSource, force);
		    wasCalled = true;
		    test.assertEqual(value, content, 'wrong value');
		});
		
		comp.setTest(content);
		this.assert(wasCalled, "not called the first time");
		wasCalled = false;
		comp.setTest(content);
		this.assert(wasCalled, "not called the second time");
		wasCalled = false;
		comp.formalModel.setTest(content);
		this.assert(wasCalled, "not called the third time");
	}
    
});

TestCase.subclass('FunctionComponentTest', {
	
    setUp: function() {
        this.fabrikComponent = new FabrikComponent();
        this.textComponent1 = new TextComponent();
        this.textComponent2 = new TextComponent();
        this.functionComponent1 = new FunctionComponent();
        this.fabrikComponent.plugin(this.textComponent1);
        this.fabrikComponent.plugin(this.textComponent2);
        this.fabrikComponent.plugin(this.functionComponent1);
        this.source = 'return 3 + 4';
    },
	
	testSetFunctionSourceFromView: function() {
        this.fabrikComponent.buildView();
        this.functionComponent1.morph.setTextString(this.source);
        this.functionComponent1.morph.doSave();
        this.assertEqual(this.functionComponent1.getFunctionBody(), this.source, 
            'seting from view to model failed: \n');
    },

	testSetFunction: function() {
		this.functionComponent1.setFunctionBody(this.funcSource);
		this.assert(this.functionComponent1.pvtGetFunction() instanceof Function, "pvtFunction should be a function...");
	},
	
	testConnectResultToTextComponent: function() {
        this.fabrikComponent.buildView();
        this.fabrikComponent.connectComponents(this.functionComponent1, "Result", this.textComponent1, "Text");
        this.functionComponent1.setFunctionBody(this.source);
        this.functionComponent1.execute();
        this.assertEqual(this.textComponent1.morph.getText().asString(), "7");
    },
    
    testExecute: function() {
		this.functionComponent1.setFunctionBody(this.source);
		this.functionComponent1.execute();
		this.assertEqual(this.functionComponent1.getResult(), 7, 'execute should write into a result field / pin');
	},
	
	testAutomaticExecute: function() {
        this.functionComponent1.setFunctionBody(this.source);
        this.assertEqual(this.functionComponent1.getResult(), 7);
        this.functionComponent1.setFunctionBody('return 3 * 4');
        this.assertEqual(this.functionComponent1.getResult(), 12);
    },
    
    testAutomaticExecuteWhenNewPinIsAdded: function() {
        var newPinName = 'NewInput';
        this.assert(!this.functionComponent1['get' + newPinName], 'Should not have another pin or field yet');
        this.functionComponent1.addFieldAndPinHandle(newPinName);
        this.assert(this.functionComponent1['get' + newPinName], 'Should have another pin or field yet');
        this.textComponent1.getPinHandle("Text").connectTo(this.functionComponent1.getPinHandle(newPinName));
        this.functionComponent1.setFunctionBody('return this.get' + newPinName + '()'); 
        this.textComponent1.setText('new text');
        this.assertEqual(this.functionComponent1.getResult(), 'new text', 'no automatic execution')
    },
    
    testAutomaticExecuteInComponent: function() {
        this.fabrikComponent.buildView();
        this.fabrikComponent.connectComponents(this.functionComponent1, "Result", this.textComponent1, "Text");
        this.functionComponent1.setFunctionBody(this.source);
        this.assert(this.textComponent1.getText instanceof Function, "getText not a function");
        this.assertEqual(this.textComponent1.getText(), "7");
        this.assertEqual(this.textComponent1.morph.getText().asString(), "7");
    },
    
    testGuessNewInputFieldName: function() {
        this.assertEqual(this.functionComponent1.guessNewInputFieldName(), "Input2")
    },

    testParameterNames: function() {
        this.assertEqualState(this.functionComponent1.parameterNames(), ["input"])
        this.functionComponent1.addInputFieldAndPin("Input2");
        this.assertEqualState(this.functionComponent1.parameterNames(), ["input", "input2"])
    },

    testParameterValues: function() {
        this.functionComponent1.setInput(3);
        this.assertEqualState(this.functionComponent1.parameterValues(), [3])
        this.functionComponent1.addInputFieldAndPin("Input2");
        this.functionComponent1.setInput2(4);
        this.assertEqualState(this.functionComponent1.parameterValues(), [3, 4])        
    },

    testFunctionHeader: function() {
        this.assertEqualState(this.functionComponent1.functionHeader(), "function f(input)")
    },

    testComposeFunction: function() {
        var f = this.functionComponent1.composeFunction("function f(input)", "return 23");
        this.assertIdentity(f.call(), 23, "return number failed");
        
        var f = this.functionComponent1.composeFunction("function f(input)", "return 'Hallo'");
        this.assertIdentity(f.call(), "Hallo", "return string failed");
    },
        
    testComposeFunctionImplicitReturn: function() {
        var f = this.functionComponent1.composeFunction("function f(input)", "23");
        this.assertIdentity(f.apply(this.functionComponent1, []), 23, "implicit return number failed");
        
        f = this.functionComponent1.composeFunction("function f(input)", "Number(input) + 1");
        this.assertIdentity(f.apply(this.functionComponent1, [23]), 24, "implicit return with variable failed");
                
        f = this.functionComponent1.composeFunction("function f(input)", '"hallo"');
        this.assertIdentity(f.apply(this.functionComponent1, []), "hallo", "implicit return string failed");
        
        f = this.functionComponent1.composeFunction("function f(input)", '23;24;25');
        this.assertIdentity(f.apply(this.functionComponent1, []), 25, "implicit return last of a number failed");
        
        f = this.functionComponent1.composeFunction("function f(input)", '23\n24;\n3+\n4');
        this.assertIdentity(f.apply(this.functionComponent1, []), 7, "implicit return last of a number failed");
        
        try {
            f = this.functionComponent1.composeFunction("function f(input)", '{test: 123, test2: 789}');
            this.assertEqual(f.apply(this.functionComponent1, []).test, 123, "implicit return of object failed");
        } catch(e) {
            if (e.isAssertion) throw e
            else this.assert(false, 'cannot parse implicit returned object function body')
        }
    },
    
    // new FunctionComponentTest().runTest('testFixObjectLiterals')
    testFixObjectLiterals: function() {
        var str = '{abc: 123, def: 456}';
        var expected = '({abc: 123, def: 456})';
        this.assertEqual(this.functionComponent1.fixObjectLiterals(str), expected, '1');
        str = '{abc: 123, def: 456} + {a: 1, d: 4}';
        expected = '({abc: 123, def: 456})+({a: 1, d: 4})';
        this.assertEqual(this.functionComponent1.fixObjectLiterals(str), expected, '2');
        
        
    }


});

TestCase.subclass('TextComponentTest', {
	
    setUp: function() {
        this.fabrikComponent = new FabrikComponent();
        this.textComponent1 = new TextComponent();
        this.textComponent2 = new TextComponent();
        this.textComponent3 = new TextComponent();
        this.fabrikComponent.plugin(this.textComponent1);
        this.fabrikComponent.plugin(this.textComponent2);
        this.fabrikComponent.plugin(this.textComponent3);
        this.text = "Hello World";
    },

	testPlugin: function() {
    	this.assertEqual(this.fabrikComponent.components.length, 3,"components: " + this.fabrikComponent.components );
	},
	
	testSetText: function() {
        this.fabrikComponent.buildView();
	    var s = "Hello World";
	    this.assert(this.textComponent1.morph);
        this.textComponent1.morph.setTextString(s);
        this.textComponent1.morph.doSave();
        this.assertEqual(this.textComponent1.morph.getText().asString(), s, " failed at morph");
        this.assertEqual(this.textComponent1.formalModel.getText(), s, " failed at component model");
    },

	testChangeInModelEffectsMorph: function() {
		this.textComponent1.buildView();
		this.textComponent1.formalModel.setText(this.text);
        // this.assertEqual(this.textComponent1.morph.getModelText(), this.text, "morph.formalModel got no content");
		this.assertEqual(this.textComponent1.morph.getText().asString(), this.text, "morph got no content");
   	},

    testWireFromText1ToText2: function() {
        this.fabrikComponent.buildView();
        this.textComponent1.getPinHandle("Text").connectTo(this.textComponent2.getPinHandle("Text"));
		this.assert(this.textComponent1.formalModel["Text$observers"], "no observers list created in model of textcomponent1")
        var s = "Hello World";
        this.textComponent1.morph.setTextString(s);
        this.textComponent1.morph.doSave();
		this.assertEqual(this.textComponent1.formalModel.getText(), s, "model1 has no text");
		this.assertEqual(this.textComponent2.formalModel.getText(), s, "model2 has no text");
        this.assertEqual(this.textComponent2.morph.getText().asString(), s, "morph2 has no text");   
    },
    setUpThreeTexts: function() {
        this.textComponent3 = new TextComponent();
        this.fabrikComponent.plugin(this.textComponent3);
    },
    setTextInComponent: function(component, text){
        component.morph.setTextString(text);
        component.morph.doSave();
    },
    assertTextInComponents: function(text) {
        this.assertEqual(this.textComponent3.morph.getText().asString(), text, "comp1");   
        this.assertEqual(this.textComponent1.morph.getText().asString(), text, "comp2");   
        this.assertEqual(this.textComponent2.morph.getText().asString(), text, "comp3");
    },
    testWireFromThreeTextsSimple: function() {
        this.fabrikComponent.buildView();
		this.textComponent1.getPinHandle("Text").connectBidirectionalTo(this.textComponent2.getPinHandle("Text"));
		this.textComponent1.getPinHandle("Text").connectBidirectionalTo(this.textComponent3.getPinHandle("Text"));
        this.setTextInComponent(this.textComponent3, this.text);
        this.assertTextInComponents(this.text);
    },
    testWireFromThreeTextsTransitive: function() {
        this.fabrikComponent.buildView();
		this.textComponent1.getPinHandle("Text").connectBidirectionalTo(this.textComponent2.getPinHandle("Text"));
		this.textComponent2.getPinHandle("Text").connectBidirectionalTo(this.textComponent3.getPinHandle("Text"));
        this.setTextInComponent(this.textComponent3, this.text)
        this.assertTextInComponents(this.text);
    },    
    testWireFromThreeTextsReverse: function() {
        this.fabrikComponent.buildView();
		this.textComponent1.getPinHandle("Text").connectBidirectionalTo(this.textComponent2.getPinHandle("Text"));
		this.textComponent3.getPinHandle("Text").connectBidirectionalTo(this.textComponent1.getPinHandle("Text"));
        this.setTextInComponent(this.textComponent3, this.text);
        this.assertTextInComponents(this.text);
    }
});

TestCase.subclass('ConnectorMorphTest', {
    setUp: function() {
        this.componentConnector = new ConnectorMorph();
        this.point1 = pt(100,100);
        this.point2 = pt(200,200);
    },
    testSetStartPoint: function() {
        this.componentConnector.setStartPoint(this.point1);
        this.assert(this.componentConnector.shape.vertices()[0].eqPt(this.point1),
            "startpoint should be the first vertice");
    },
    
    testSetEndPoint: function() {
        this.componentConnector.setEndPoint(this.point2);
        this.assert(this.componentConnector.shape.vertices().last().eqPt(this.point2),
            "endpoint should be the last vertice");
    },
    
    testGetStartPoint: function() {
        this.componentConnector.setStartPoint(this.point1);
        this.assert(this.componentConnector.getStartPoint().eqPt(this.point1),
            "startpoint should be the first vertice");
    },
    
    testGetEndPoint: function() {
         this.componentConnector.setEndPoint(this.point2);
         this.assert(this.componentConnector.getEndPoint().eqPt(this.point2),
            "endpoint should be the first vertice");
    },
    
    testSetEndPointNull: function() {
        try {
          this.componentConnector.setEndPoint(this.point2);
        } catch(e) {
            this.assert(e.msg) && this.assert(e.msg.startsWith("failed")) 
        }
    },
    
    testUpdatePosition: function() {
        c = new ConnectorMorph();
        m1 = Morph.makeRectangle(100,100,10,10);
        m1.getGlobalPinPosition = function(){return this.getPosition()};
        m2 = Morph.makeRectangle(200, 200, 10,10);
        m2.getGlobalPinPosition = m1.getGlobalPinPosition;
        c.formalModel.setStartHandle(m1);
        c.formalModel.setEndHandle(m2);
        c.updateView();
        this.assertEqualState(c.getStartPoint(), pt(100,100), "start point failed");
        this.assertEqualState(c.getEndPoint(), pt(200,200), "end point failed");
    }
});

TestCase.subclass('PinConnectorTest', {
	
	setUp: function() {
		this.comp1 = new Component();
		this.comp1.addField("Field1");
		this.pin1 = this.comp1.addPinHandle("Field1");
		this.comp2 = new Component();
		this.comp2.addField("Field2");
		this.pin2 = this.comp2.addPinHandle("Field2");
	},
	
	testIsConnectedTo: function() {
		this.pin1.connectTo(this.pin2);
		this.assert(this.pin1.isConnectedTo(this.pin2), "made no connection from pin1 to pin2");
		this.assert(!this.pin2.isConnectedTo(this.pin1), "made connection from pin2 to pin1");
	},
	
	// Tests also PinHandle connection logic
	testConnectTwoPins: function() {
		this.pin1.connectTo(this.pin2);
		var data = 'string';
		this.pin1.setValue(data);
		this.assertEqual(this.pin2.getValue(), data, "data could not be send from pin1 to pin2");
	},
	
	testConnectAlreadyConnectedPins: function() {
		this.pin1.connectTo(this.pin2);
		this.assertEqual(1, this.pin1.connectors.length);
		this.assertEqual(1, this.pin2.connectors.length);
		this.pin1.connectTo(this.pin2);
		this.assertEqual(1, this.pin1.connectors.length, "Made another connection for existing connection");
		this.assertEqual(1, this.pin2.connectors.length, "Made another connection for existing connection");
	},
	
	testIsConnectedToBidirectional: function(){
	    this.pin1.connectBidirectionalTo(this.pin2);
	    this.assert(this.pin2.isConnectedTo(this.pin1), "pin2 has no backreference");
	},
	
	testConnectAlsoInOtherDirection: function() {
		var conCount = this.pin1.connectors.length;
		this.pin1.connectTo(this.pin2);
		var connector = this.pin2.connectTo(this.pin1);
		this.assertEqual(conCount + 1, this.pin1.connectors.length, "Made another connection for existing connection");
		this.assertEqual(connector.fromPin, this.pin1);
		this.assertEqual(connector.toPin, this.pin2);
		
		var data = 'string';
		this.pin1.setValue(data);
		this.assertEqual(this.pin2.getValue(), data, "data could not be send from pin1 to pin2");
		
		data = 'otherContent';
		this.pin2.setValue(data);
		this.assertEqual(this.pin1.getValue(), data, "data could not be send from pin2 to pin1");
	},
	
	testCreateFakePinHandleCreatesConnector: function() {
		var fakePin = this.pin1.createFakePinHandle();
		this.assert(fakePin, "no fakePin");
		this.assert(this.pin1.isConnectedTo(fakePin), "there is no connection between pin1 and fake pin");
	},
	
	testDropFakePinHandle: function() {
		var fakePin = this.pin1.createFakePinHandle();
		this.assertEqual(this.pin1.connectors.length, 1, "connectors error");
		this.assertEqual(fakePin.connectors.length, 1, "connectors error");
		this.pin2.connectFromFakeHandle(fakePin);
		// no observer relationship is created when fakePin is created, so not necessarz to test removal
		this.assertEqual(fakePin.connectors.length, 0, "fakePin connector not removed ");
		this.assertEqual(this.pin1.connectors.length, 1, "fakePin connector not removed from pin1");
		this.assert(this.pin1.isConnectedTo(this.pin2), "fakeHandle connection failed");
	},
	
	testRemove: function() {
		var connection = this.pin1.connectTo(this.pin2);
		connection.remove();
		var data = 'string';
		this.pin1.setValue(data);
		this.assert(!this.pin2.getValue(), "pin2 received data although the connection was removed");
	},
	
	testRemoveBidirectionalConnection: function() {
		var connection = this.pin1.connectTo(this.pin2);
		var sameConnection = this.pin2.connectTo(this.pin1);
		this.assert(connection === sameConnection, "Problem with setting up a bidirectional connection");
		connection.remove();
		var data = 'string';
		this.pin1.setValue(data);
		this.assert(!this.pin2.getValue(), "pin2 received data although the connection was removed");
		this.pin1.setValue(null);
		this.pin2.setValue(data);
		this.assert(!this.pin1.getValue(), "pin1 received data although the connection was removed");
	},
	
	testComponentRemovalAlsoRemovesAllConnections: function() {
	    var fabrik = new FabrikComponent();
	    fabrik.buildView();
	    var comp1Morph = this.comp1.buildView();
	    fabrik.morph.addMorph(comp1Morph);
	    fabrik.morph.addMorph(this.comp2.buildView());
	    this.pin1.connectTo(this.pin2); //arghhhh, get rid of this whole global zeugs
	    comp1Morph.remove();
	    this.assertEqual(fabrik.connectors.length, 0, 'conn not removed from fabrik');
	},
	
	testConnectTwoPinsForcesSetInConnected: function() {
		var data = 'string';
		this.pin1.setValue(data);
		this.pin1.connectTo(this.pin2);
		this.assertEqual(this.pin2.getValue(), data, "data was not setted on connection creation to pin2");
		this.pin1.setValue(null); // reset
		this.pin2.setValue(data);
		this.pin2.connectTo(this.pin1); // test bedirectional update
		this.assertEqual(this.pin1.getValue(), data, "data was not setted in bidirectional connection");
	},
});

TestCase.subclass('PinHandleTest', {
	
	createTextComponentWithFabrik: function() {
        var fabrikComponent = new FabrikComponent();
        var component = new TextComponent();
        fabrikComponent.plugin(component);
        fabrikComponent.buildView();
		return component;
	},
		
    testGetPinPosition: function() {
		var comp = this.createTextComponentWithFabrik();
        var pinHandle = comp.getPinHandle("Text");
        var point =  pinHandle.morph.getPinPosition();
        var offset = pt(100,100);
        comp.panel.setPosition(offset);
        this.assertEqualState(pinHandle.morph.getPinPosition(), point.addPt(offset));
    },

    setUpForReachablePinTests: function() {
        var outerFabrik = new FabrikComponent();
        this.outerPin = outerFabrik.addPin('Outer');
        
        var componentInOuter = new TextComponent();
        outerFabrik.plugin(componentInOuter);
        this.componentPinOuter = componentInOuter.getPin('Text');
        
        var innerFabrik = new FabrikComponent();
        outerFabrik.plugin(innerFabrik);
        this.innerPin = innerFabrik.addPin('Inner');
        
        var componentInInner = new TextComponent();
        innerFabrik.plugin(componentInInner);
        this.componentPinInner = componentInInner.getPin('Text');
    },
    
    testReachablePins: function() {
        this.setUpForReachablePinTests();
        
        // argh, assertEqualState does not work in this case... fix it!
        this.assertEqual(this.componentPinInner.reachablePins().length, 1, 'componentPin');
        this.assert(this.componentPinInner.reachablePins().include(this.innerPin), 'componentPinInner - no innerpin');
        
        this.assertEqual(this.outerPin.reachablePins().length, 2, 'outerPin');
        this.assert(this.outerPin.reachablePins().include(this.innerPin), 'outerPin - innerPin');
        this.assert(this.outerPin.reachablePins().include(this.componentPinOuter), 'outerPin - componentPinOuter');
        
        this.assertEqual(this.innerPin.reachablePins().length, 3, 'innerPin');
        this.assert(this.innerPin.reachablePins().include(this.componentPinInner), 'innerPin - no componentPinInner');
        this.assert(this.innerPin.reachablePins().include(this.outerPin), 'innerPin - no outerPin');
        this.assert(this.innerPin.reachablePins().include(this.componentPinOuter), 'innerPin - no componentPinOuter');
        
        this.outerPin.component.buildView(); //outerFabrik
        this.innerPin.component.panel.collapse();
        this.assertEqual(this.innerPin.reachablePins().length, 2, 'innerPin');
        this.assert(this.innerPin.reachablePins().include(this.outerPin), 'innerPin collapsed - no outerPin');
        this.assert(this.innerPin.reachablePins().include(this.componentPinOuter), 'innerPin collapsed - no componentPinOuter');
        
        // this.assertEqualState(this.componentPinInner.reachablePins(), [this.innerPin, this.componentPinInner], 'componentPinInner');
        // this.assertEqualState(this.innerPin.reachablePins(), [this.innerPin, this.componentPinInner, this.outerPin], 'innerPin');
        // this.assertEqualState(this.outerPin.reachablePins(), [this.innerPin, this.outerPin], 'innerPin');
    }
});

TestCase.subclass('PluggableConnectorTest', {

    testPluginArbitraryModel: function() {
		var model = Record.newInstance({Field1: {}, Field2: {}}, {Field1: 'default'}, {});
		var cmp = new PluggableComponent();
		cmp.adoptToModel(model);
		this.assertEqual(cmp.formalModel, model, "component has not the correct model");
		this.assert(cmp.getField1, "component has no accessor method");
		this.assertEqual(cmp.pinHandles.length, 2, "no pins added");
		this.assertEqual(cmp.pinHandles.first().getName(), 'Field1', "wrong pin");
		this.assertEqual(cmp.getField1(), 'default', "cannot access model");
		cmp.setField2('content');
		this.assertEqual(model.getField2(), 'content', "cannot write into model");
    },

	testCreatePinMorphs: function() {
		var model = Record.newInstance({Field1: {}, Field2: {}}, {Field1: 'default'}, {});
		var cmp = new PluggableComponent();
		cmp.buildView();
		cmp.adoptToModel(model);
		var morphs = cmp.panel.submorphs.select(function (ea) { console.log(ea.toString()); return ea.constructor.type == "PinMorph"})
		this.assertEqual(morphs.length, 2, "pinmorphs not created");
    },
});

TestCase.subclass('ComponentMorphTest', {

    assertSubmorphsFitIn: function(morph) {
        this.assertEqual(morph.getExtent(), morph.bounds().extent(), 'morph overlaps!');
    },
    
    assertSubmorphsDoNoOverlap: function(morph) {
        morph.submorphs.each(function(ea) {
            morph.submorphs.each(function(ea2) {
                this.assert(ea === ea2 || !ea.bounds().containsRect(ea2.bounds()),
                    ea.constructor.type + ' overlaps ' + ea2.constructor.type);
            }, this); 
        }, this);
    },
    
    testOpenInWorld: function() {
		var c = new PluggableComponent();
		c.buildView();
    },
    
    testAddTextPane: function() {
        var morph = new ComponentMorph();
        var pane = morph.addTextPane();
        this.assert(pane, 'no pane created');
        this.assert(morph.submorphs.include(pane), 'pane not added to morph');
        this.assertSubmorphsFitIn(morph);
    },
    
    testAddTextAndList: function() {
        var morph = new ComponentMorph();
        morph.addListPane();
        morph.addTextPane();
        this.assertSubmorphsFitIn(morph);
        this.assertSubmorphsDoNoOverlap(morph);
    },
    
    testAddButton: function() {
        var morph = new ComponentMorph();
        var btn = morph.addButton('test');
        this.assert(btn, 'no button created');
        // this.assertEqual(btn.label.testString, 'test', 'label problem');
        this.assert(morph.submorphs.include(btn), 'pane not added to morph');
        this.assertSubmorphsFitIn(morph);
    },

    testAddListPane: function() {
        var morph = new ComponentMorph();
        var list = morph.addListPane();
        this.assert(list, 'no pane created');
        this.assert(morph.submorphs.include(list), 'pane not added to morph');
        // this.assertSubmorphsFitIn(morph);
    },
        
    testAddButtonAndText: function() {
        var morph = new ComponentMorph();
        morph.addTextPane();
        morph.addButton('test');
        this.assertSubmorphsFitIn(morph);
        this.assertSubmorphsDoNoOverlap(morph);
    },
    
    testMakeSpaceForHeightAndGetRect: function() {
        var morph = new ComponentMorph();
        var pane = morph.addTextPane();
        
        // look if everything is ok
        var expectedExtent = morph.getExtent().subPt(morph.padding.topLeft().scaleBy(2));
        this.assertEqual(pane.getExtent(), expectedExtent, 'initial Extent of exisiting morph not correct');
        
        
        var totalShrinkHeight = 20;
        var result = morph.getBoundsAndShrinkIfNecessary(totalShrinkHeight);
        var i = morph.padding.left();
        // this.assertEqualState(result, new Rectangle(i, 100 - 20 - (i * 2), 100 - i, 100 - i));
        this.assert(pane.getExtent().leqPt(expectedExtent.subPt(pt(0, totalShrinkHeight))),
            'shrink not correct');
    },
    
    testAllPinMorphs: function() {
        var comp = new FunctionComponent();
        var morph = comp.buildView();
        this.assertEqual(morph.allPinMorphs().length, 2);
    },    

    testAllConnectors: function() {
        var comp1 = new FunctionComponent();
        var comp2 = new FunctionComponent();
        comp1.buildView();
        comp2.buildView();        
        comp1.getPinHandle("Result").connectTo(comp2.getPinHandle("Input"));
        this.assertEqual(comp1.panel.allConnectors().length, 1);
        this.assertEqual(comp2.panel.allConnectors().length, 1);
    },    

        
    // testMakeSpaceByShrinkingOthers: function() {
    //     var morph = new ComponentMorph(new Rectangle(0,0,100,100));
    //     var pane = morph.addTextPane();
    //     var list = morph.addListPane();
		  //     var expectedExtent = morph.getExtent().subPt(morph.padding.topLeft()).scaleBy(2));
    //     var heightTakenByPaneAndList = pane.bounds().topLeft().dist(list.bounds().bottomLeft());
    //     this.assertEqual(heightTakenByPaneAndList, expectedExtent.y, 'initial Extent of exisiting morph not correct');
    //     var totalShrinkHeight = 20;
    //     morph.makeSpaceByShrinking([pane, list], totalShrinkHeight);
    //     
    //     var newHeightTakenByPaneAndList = pane.bounds().topLeft().dist(list.bounds().bottomLeft());
    //     this.assertEqual(newHeightTakenByPaneAndList, heightTakenByPaneAndList - totalShrinkHeight,
    //         'shrink not correct');
    // }
    
    reshapeSetup: function() {
        this.morph = new ComponentMorph();
        this.morph.setPosition(pt(0,0));
        this.morph.setExtent(pt(100,100));
        this.morph.minExtent = function() { return pt(50,50) };
    },
    
    testReshapeDragHandleFromTopLeftToBottomRight: function() {
        this.reshapeSetup();
        this.morph.reshape('topLeft', pt(20,10), null, true);
        this.assertEqual(this.morph.getPosition(), pt(20,10), 'morph not moved');
        this.assertEqual(this.morph.getExtent(), pt(80,90), 'morph not shrinked');
    },

    testReshapeDragHandleFromTopLeftToBottomRightInsideMinExtent: function() {
        this.reshapeSetup();
        this.morph.reshape('topLeft', pt(60,0), null, true);
        this.assertEqual(this.morph.getPosition(), pt(50,0), 'morph has wrong position');
        this.assertEqual(this.morph.getExtent(), pt(50,100), 'morph not shrinked');
    },
    
    testReshapeDragHandleFromBottomRightToTopLeftInsideMinExtent: function() {
        this.reshapeSetup();
        this.morph.reshape('bottomRight', pt(40,100), null, true);
        this.assertEqual(this.morph.getPosition(), pt(0,0), 'morph has wrong position');
        this.assertEqual(this.morph.getExtent(), pt(50,100), 'morph not shrinked');
    }

});

TestCase.subclass('WebRequestComponentTest', {
    
    setUp: function() {
		/* Mock the NetRequest: save NetRequest */
		this.oldNetRequest = NetRequest;
	},
	
	tearDown: function() {
		NetRequest = this.oldNetRequest;
	},
    
    configureMockNetRequest: function(xmlResponse, textResponse, requestAction) {
        /* Create the mock */
        NetRequest.subclass('MockNetRequest', {
			request: function(method, url, content) {
			    requestAction(method, url, content);
			    this.onReadyStateChange();
    			return this;
			},
			onReadyStateChange: function() {
    			this.setModelValue('setStatus', this.getStatus());
    			this.setModelValue('setResponseText', textResponse);
    			this.setModelValue('setResponseXML', xmlResponse);
    		}
		});
		/* Replace the original NetRequest with the Mock*/
		NetRequest = MockNetRequest;
    },
    
    testGetResponseTextFromDummyUrl: function() {
        var comp = new WebRequestComponent();
        var dummyUrl = URL.source.toString();
        var responseText = 'response text';
        var wasRequested = false;
        this.configureMockNetRequest(null, responseText, function(m, url) {
            wasRequested = true;
            this.assert(url == dummyUrl, 'wrong url');
        }.bind(this));
        // exercise
        comp.setURL(dummyUrl);
        // assert
        this.assert(wasRequested, 'did not called the request');
        this.assertEqual(comp.getResponseText(), responseText, 'false response');
        this.assert(!comp.getResponseXML(), 'XML not null');
    }
});

TestCase.subclass('HandPositionObserverTest', {
   
    setUp: function() {
        this.posOb = new HandPositionObserver()
        this.posOb.hand = new HandMorph();
    },
   
    testStart: function() {
        this.posOb.start();
        this.assert(this.posOb.hand.formalModel.GlobalPosition$observers, "observer is not there")
    },

    testStop: function() {
        this.posOb.stop();
        this.assert(!this.posOb.hand.formalModel.GlobalPosition$observers, "observer is still there")
    },
    
    testFunc: function() {
        var counter = 0;
        this.posOb.func = function() {counter++};
        this.posOb.start();
        this.posOb.hand.formalModel.setGlobalPosition(pt(100,100));
        this.assertEqual(counter, 1);
        this.posOb.hand.formalModel.setGlobalPosition(pt(100,200));
        this.assertEqual(counter, 2);
        this.posOb.stop();
        this.posOb.hand.formalModel.setGlobalPosition(pt(100,200));
        this.assertEqual(counter, 2);
    }
    
});

TestCase.subclass('TextListComponentTest', {

    setUp: function() {
        this.textList = new TextListComponent();
    },

    testEmpty: function() {
        this.assertEqual(this.textList.getList().length, 0);
    },
    
    testSetList: function() {
        this.textList.setList(["Hallo"]);
        this.assertEqual(this.textList.getList().length, 1);
    },

    testSetListNumbers: function() {
        this.textList.setList([1,2])
        this.assertEqual(this.textList.getList().length, 2);
        this.textList.buildView();
        this.assertEqualState(this.textList.morph.getList(), ["1", "2"]);
    },

    testSetListObjects: function() {
        this.textList.setList([Color.blue]);
        this.assertEqual(this.textList.getList().length, 1);
    },
    
    testXMLStringArray: function() {
        var xml = stringToXML('<forecast_information>' + '<city data="Berlin, Berlin"/>' +
                            '<postal_code data="12685"/>' + '</forecast_information>');
        var list = FabrikConverter.xmlToStringArray(xml);
        this.textList.setList(list);
        console.log('THE LIST::::    ' + this.textList.getList());
    },
    
    testRemembersSelectionIndex: function() {
        var list = [{a: 1,  isJSONConformant: true}, {b: 2, isJSONConformant: true}];
        this.textList.setList(list);
        this.textList.setSelection(list[1]);
        this.assertEqual(this.textList.getSelectionIndex(), 1, 'wrong selection index');
        var otherList = [{c: 3, isJSONConformant: true}, {d: 4, isJSONConformant: true}];
        this.textList.setList(otherList);
        this.assertEqual(this.textList.getSelectionIndex(), 1, 'wrong selection index after assigning new list');
        // this.assertIdentity(this.textList.getSelection(), otherList[1], 'wrong selection');
        this.assertEqualState(this.textList.getSelection(), otherList[1], 'wrong selection');
    },
    
    testRemembersSelectionIndexWithMorph: function() {
        var list = [{a: 1, isJSONConformant: true}, {b: 2, isJSONConformant: true}];
        this.textList.buildView();
        var morph = this.textList.morph;
        this.textList.setList(list);
        this.textList.setSelection(list[1]);
        this.assertEqual(morph.selectedLineNo, 1, 'wrong selectedLineNo');
        var otherList = [{c: 3, isJSONConformant: true}, {d: 4, isJSONConformant: true}];
        this.textList.setList(otherList);
        this.assertEqual(morph.selectedLineNo, 1, 'wrong selectedLineNo after assigning new list');
        this.assertEqualState(morph.getSelection(), otherList[1], 'wrong selection');
    }
});


TestCase.subclass('ComponentSerializeTest', {
    
    setUp: function() {
        this.world = WorldMorph.current();
    },
    
    tearDown: function() {
        if (this.morphAddedToWorld) {
            this.world.removeMorph(this.morphAddedToWorld); // to be sure
            this.morphAddedToWorld.remove();
        }
    },
    
    xtestPlainComponent: function() {
        var comp = new Component()
        this.morphAddedToWorld = comp.buildView();
        world.addMorph(this.morphAddedToWorld);
        var doc = Exporter.shrinkWrapMorph(this.world);
        var string = Exporter.stringify(doc);
        this.morphAddedToWorld.remove();

        var importer = new Importer();
        var parser = new DOMParser();
        var xml = parser.parseFromString(string, "text/xml");
        this.assert(xml, "parse failed");
        var newWorld = importer.loadWorldContents(xml);

        console.log(string);
    },


    // this test does way too much!!!
    xtestFabrikWithTextComponent: function() {
        
        // var l = WorldMorph.current().submorphs.length;
        //                         for (var i = l-1; i >= 0; i--) { WorldMorph.current().submorphs[i].remove() };
        
        var fabrik = new FabrikComponent();
        var textComponent = new TextComponent();
        var fieldName = "ThisIsAFieldNameOrSo";
        textComponent.addField(fieldName);
        textComponent.setThisIsAFieldNameOrSo("Tatatatatatataaaa");
        fabrik.plugin(textComponent);

        this.morphAddedToWorld = fabrik.openIn(this.world);
        var doc = Exporter.shrinkWrapMorph(this.world);
        var string = Exporter.stringify(doc);
        this.morphAddedToWorld.remove();
    
        this.assert(string.match("FabrikComponent"), "no FabrikComponent serialized");
        this.assert(string.match(fieldName), "no fieldName serialized");

        var importer = new Importer();
        var parser = new DOMParser();
	    var xml = parser.parseFromString(string, "text/xml");
	    this.assert(xml, "parse failed");
        var newWorld = importer.loadWorldContents(xml);
        
        var fabrikNode = xml.getElementById(fabrik.id());
        this.assert(fabrikNode, "no fabrik node found");
        
        var widgets = $A(xml.getElementsByTagName("widget"));
        this.assert(widgets.length > 0);
        // this.assert(widgets.detect(function(ea){return ea.localName == "PinHandle"}), "no pin handles");
        // this.assert(widgets.detect(function(ea){return ea.localName == "PinConnector"}), "no connectors");

        
        // console.log(string);
    },
    
});

TestCase.subclass('NodeRecordSerializationTest', {
    documentation: 'The new NodeRecord seems to have bugs when serializing/deserializing. Especially \
                    in combination with the new node serialization which is needed for Fabrik WebRequests',
    
    xtestSerializeButtonMorph: function() {
        var x = new ButtonMorph(pt(200,100).extentAsRectangle());
        WorldMorph.current().addMorph(x);
        
        btn1 = x; // Remove
        btn2 = new ButtonMorph(new Rectangle(200,100,200,100));; // Remove
        WorldMorph.current().addMorph(btn2);
        
        Exporter.shrinkWrapMorph(x);
    },
});

TestCase.subclass('FabrikConverterTest', {
   
   xmlString:   '<?xml version="1.0"?>' +
    '<xml_api_reply version="1">' +
            '<weather module_id="0" tab_id="0">' +
                    '<forecast_information>' +
                            '<city data="Berlin, Berlin"/>' +
                            '<postal_code data="12685"/>' +
                    '</forecast_information>' +
                    '<current_conditions>' +
                            '<condition data="Fog"/>' +
                            '<temp_f data="54"/>' +
                            '<temp_c data="12"/>' +
                            '<humidity data="Humidity: 81%"/>' +
                            '<icon data="/images/weather/fog.gif"/>' +
                            '<wind_condition data="Wind: NW at 1 mph"/>' +
                    '</current_conditions>' +
                    '<forecast_conditions>' +
                            '<day_of_week data="Today"/>' +
                            '<low data="48"/>' +
                            '<high data="64"/>' +
                            '<icon data="/images/weather/sunny.gif"/>' +
                            '<condition data="Clear"/>' +
                    '</forecast_conditions>' +
                    '<forecast_conditions>' +
                            '<day_of_week data="Sun"/>' +
                            '<low data="50"/>' +
                            '<high data="64"/>' +
                            '<icon data="/images/weather/mostly_sunny.gif"/>' +
                            '<condition data="Mostly Sunny"/>' +
                    '</forecast_conditions>' +
                    '<forecast_conditions>' +
                            '<day_of_week data="Mon"/>' +
                            '<low data="48"/>' +
                            '<high data="59"/>' +
                            '<icon data="/images/weather/chance_of_rain.gif"/>' +
                            '<condition data="Chance of Rain"/>' +
                    '</forecast_conditions>' +
                    '<forecast_conditions>' +
                            '<day_of_week data="Tue"/>' +
                            '<low data="48"/>' +
                            '<high data="57"/>' +
                            '<icon data="/images/weather/mostly_sunny.gif"/>' +
                            '<condition data="Partly Sunny"/>' +
                    '</forecast_conditions>' +
            '</weather>' +
    '</xml_api_reply>',
    
    setUp: function() {
        this.xml = stringToXML(this.xmlString),
        this.xmlForcastInfo = this.xml.firstChild.firstChild.firstChild,
        this.xmlLeaf = this.xmlForcastInfo.firstChild, // Berlin
        this.converter = FabrikConverter;
    },
    
    testConvertLeaf: function() {
        this.assertEqualState(this.converter.basicToJs(this.xmlLeaf), {city: "Berlin, Berlin"}, 'wrong leaf conversion');
    },
    
    testConvertNonLeaf: function() {
        this.assertEqualState(this.converter.basicToJs(this.xmlForcastInfo), {forecast_information: {}}, 'wrong non-leaf conversion');
    },
    
    testConvertElement: function() {
        var result = this.converter.xmlToJs(this.xmlForcastInfo);
        var expected = {forecast_information: {city: "Berlin, Berlin", postal_code: '12685'}}
        this.assertEqualState(result, expected, 'wrong element conversion');
    },
    
    testConvertAll: function() {
        var result = this.converter.xmlToJs(this.xml);
        console.log('result: ' + JSON.serialize(result));
    },
    
    testStringArrayfromXMLSimple: function() {
        var result = this.converter.xmlToStringArray(this.xmlLeaf);
        this.assertEqual(result.length, 1, 'could not create array from xml');
        this.assertEqual(result.first().string, '<city data="Berlin, Berlin"/>', 'wrong string');
        this.assertIdentity(result.first().xml, this.xmlLeaf, 'wrong xml');
    },
    
    testStringArrayfromXMLElement: function() {
        var result = this.converter.xmlToStringArray(this.xmlForcastInfo);
        var expected = [{string: '<forecast_information>', xml: this.xmlForcastInfo, js: {forecast_information: {city: "Berlin, Berlin", postal_code: "12685"}}, isJSONConformant: true},
                        {string: '\t<city data="Berlin, Berlin"/>', xml: this.xmlForcastInfo.childNodes[0], js: {city: "Berlin, Berlin"}, isJSONConformant: true},
                        {string: '\t<postal_code data="12685"/>', xml: this.xmlForcastInfo.childNodes[1], js: {postal_code: "12685"}, isJSONConformant: true},
                        {string: '</forecast_information>', xml: this.xmlForcastInfo, js: {forecast_information: {city: "Berlin, Berlin", postal_code: "12685"}}, isJSONConformant: true}];
        this.assertEqualState(expected, result, 'error');
    },
    
    testCompatibilityOfConverterWhenWritingXML: function() {
        var json = Converter.toJSONAttribute(this.xmlLeaf);
        this.assertEqual(JSON.unserialize(unescape(json)), JSON.serialize({XML: Exporter.stringify(this.xmlLeaf)}), 'Converter did not convert xml to string');
    },
    
    testCompatibilityOfConverterWhenWritingStringXMLArray: function() {
        var json = Converter.toJSONAttribute(this.converter.xmlToStringArray(this.xmlForcastInfo));
        console.log('Result: -------- ' + unescape(json));
        // this.assertEqual(unescape(json), Exporter.stringify(this.xmlLeaf), 'Converter did not convert xml to string');
    },
    
    testCompatibilityOfConverterWhenUnserializingXML: function() {
        var json = Converter.toJSONAttribute(this.xmlForcastInfo);
        var result = Converter.fromJSONAttribute(json);
        this.assert(result.isEqualNode, 'no xml');
        this.assert(result.isEqualNode(this.xmlForcastInfo), 'wrong nodes');
    },
    
    testStringArrayWithDeserializedXML: function() {
        var xml = stringToXML('<double xmlns="http://www.webserviceX.NET/">0.6923</double>');
        xml = document.importNode(xml.documentElement, true);
        var model = Record.newNodeInstance({});
        model.addField('Test');
        model.setTest(xml);
        this.assert(model.getTest().isEqualNode(xml));
    }
});

SerializationBaseTestCase.subclass('AFabrikSerializationTest', {

    testLoadFabrik: function() {
        // generate with textmate replace: "(<.*>$)" with: "'$1' +"
        var world = this.loadWorldFromSource(
            '<svg xmlns="http://www.w3.org/2000/svg" id="canvas">' +
                '<g type="WorldMorph" id="1:WorldMorph" transform="matrix(1 0 0 1 0 0)" fill="rgb(255,255,255)">'+
                    '<rect x="0" y="0" width="800" height="600"/>' +          
                    '<g xmlns="http://www.w3.org/2000/svg" type="FabrikMorph" id="399:FabrikMorph" transform="translate(0,0)">' +
                    	'<rect x="0" y="0" width="400" height="400" stroke-width="1.5" stroke="rgb(0,0,204)" fill="rgb(127,127,230)" fill-opacity="0.8" stroke-opacity="0.8" rx="3" ry="3"/>' +
                    	'<g type="TextComponentMorph" id="456:TextComponentMorph" transform="translate(0,0)">' +
                    		'<rect x="0" y="0" width="180" height="100" stroke-width="1.5" stroke="rgb(0,0,204)" fill="rgb(127,127,230)" fill-opacity="0.8" stroke-opacity="0.8" rx="8" ry="8"/>' +
                    		'<g type="ScrollPane" id="473:ScrollPane" transform="translate(7,7)">' +
                    			'<rect x="0" y="0" width="166" height="86" stroke-width="1" fill="none" rx="3" ry="3"/>' +
                    			'<g type="ClipMorph" id="474:ClipMorph" clip-path="url(#9:lively.scene.Clip)" transform="translate(1,1)">' +
                    				'<rect x="0" y="0" width="151" height="84" stroke-width="0" fill="rgb(243,243,243)" rx="3" ry="3"/>' +
                    				'<g type="TextMorph" id="470:TextMorph" transform="translate(0,0)">' +
                    					'<rect x="1" y="1" width="151" height="21.2" stroke-width="0" stroke="rgb(0,0,0)" fill="none" rx="3" ry="3"/>' +
                    					'<g type="TextSelectionMorph" id="471:TextSelectionMorph" pointer-events="none" transform="translate(0,0)">' +
                    						'<g transform="matrix(1.000000 0.000000 0.000000 1.000000 0.000000 0.000000)" stroke-width="0" fill="none"/>' +
                    						'<field name="origin" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    						'<field name="fullBounds" family="Rectangle"><![CDATA[{"x":-3,"y":-3,"width":6,"height":6}]]></field>' +
                    						'<field name="mouseHandler">null</field>' +
                    						'<field name="openForDragAndDrop">false</field>' +
                    					'</g>' +
                    					'<text kerning="0" fill="rgb(0,0,0)" font-size="12" font-family="Helvetica">' +
                    						'<tspan x="7" y="15.8">------</tspan>' +
                    					'</text>' +
                    					'<field name="textString"><![CDATA["------"]]></field>' +
                    					'<field name="origin" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    					'<field name="fullBounds" family="Rectangle"><![CDATA[{"x":-3,"y":-3,"width":155,"height":25.200000762939453}]]></field>' +
                    					'<field name="textSelection" ref="471:TextSelectionMorph"/>' +
                    					'<field name="changeClue" ref="472:Morph"/>' +
                    					'<field name="suppressHandles">true</field>' +
                    					'<field name="openForDragAndDrop">false</field>' +
                    					'<relay name="formalModel" ref="395:anonymous_100">' +
                    						'<binding formal="Text" actual="Text"/>' +
                    					'</relay>' +
                    				'</g>' +
                    				'<defs>' +
                    					'<clipPath id="9:lively.scene.Clip">' +
                    						'<rect x="0" y="0" width="151" height="84" stroke-width="0" fill="none"/>' +
                    					'</clipPath>' +
                    				'</defs>' +
                    				'<field name="origin" family="Point"><![CDATA[{"x":1,"y":1}]]></field>' +
                    				'<field name="fullBounds" family="Rectangle"><![CDATA[{"x":1,"y":1,"width":151,"height":84}]]></field>' +
                    				'<field name="clip" ref="9:lively.scene.Clip"/>' +
                    				'<field name="suppressHandles">true</field>' +
                    				'<field name="openForDragAndDrop">false</field>' +
                    			'</g>' +
                    			'<g type="SliderMorph" id="475:SliderMorph" transform="translate(152,1)">' +
                    				'<rect x="0" y="0" width="14" height="85" stroke-width="1" stroke="rgb(0,0,0)" fill="url(#479:lively.paint.LinearGradient)" rx="3" ry="3"/>' +
                    				'<g type="Morph" id="476:Morph" transform="translate(0,0)">' +
                    					'<rect x="0" y="0" width="14" height="85" stroke-width="1" stroke="rgb(0,0,0)" fill="url(#480:lively.paint.LinearGradient)" rx="7" ry="7"/>' +
                    					'<field name="origin" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    					'<field name="fullBounds">null</field>' +
                    					'<field name="styleClass"><![CDATA["slider"]]></field>' +
                    					'<field name="openForDragAndDrop">false</field>' +
                    				'</g>' +
                    				'<field name="origin" family="Point"><![CDATA[{"x":152,"y":1}]]></field>' +
                    				'<field name="fullBounds">null</field>' +
                    				'<relay name="formalModel" ref="473:ScrollPane">' +
                    					'<binding formal="Value" actual="ScrollPosition"/>' +
                    					'<binding formal="SliderExtent" actual="-VisibleExtent"/>' +
                    				'</relay>' +
                    				'<field name="valueScale">1</field>' +
                    				'<field name="slider" ref="476:Morph"/>' +
                    				'<field name="suppressHandles">true</field>' +
                    				'<field name="openForDragAndDrop">false</field>' +
                    			'</g>' +
                    			'<field name="origin" family="Point"><![CDATA[{"x":7,"y":7}]]></field>' +
                    			'<field name="fullBounds" family="Rectangle"><![CDATA[{"x":7,"y":7,"width":166,"height":86}]]></field>' +
                    			'<field name="clipMorph" ref="474:ClipMorph"/>' +
                    			'<field name="scrollBar" ref="475:SliderMorph"/>' +
                    			'<field name="suppressHandles">true</field>' +
                    			'<field name="openForDragAndDrop">false</field>' +
                    		'</g>' +
                    		'<field name="origin" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    		'<field name="fullBounds">null</field>' +
                    		'<field name="openForDragAndDrop">false</field>' +
                    		'<field name="styleClass"><![CDATA["fabrik"]]></field>' +
                    		'<field name="priorExtent" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    		'<field name="priorPosition" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    		'<field name="component" ref="394:TextComponent"/>' +
                    		'<field name="formalModel" ref="395:anonymous_100"/>' +
                    		'<field name="halos" ref="457:Morph"/>' +
                    		'<field name="closeHalo" ref="458:ButtonMorph"/>' +
                    		'<field name="text" ref="470:TextMorph"/>' +
                    		'<field name="ownerWidget" ref="394:TextComponent"/>' +
                    		'<widget id="394:TextComponent">' +
                    			'<record id="395:anonymous_100">' +
                    				'<definition><![CDATA[{"Name":{},"Text":{"to":null}}]]></definition>' +
                    				'<field name="Name"><![CDATA["Abstract Component"]]></field>' +
                    				'<field name="Text"><![CDATA["null"]]></field>' +
                    			'</record>' +
                    			'<field name="formalModel" ref="395:anonymous_100"/>' +
                    			'<field name="actualModel" ref="395:anonymous_100"/>' +
                    			'<array name="pinHandles">' +
                    				'<item ref="396:PinHandle"/>' +
                    			'</array>' +
                    			'<field name="fabrik" ref="388:FabrikComponent"/>' +
                    			'<field name="panel" ref="456:TextComponentMorph"/>' +
                    			'<field name="morph" ref="470:TextMorph"/>' +
                    			'<field name="formalModel" ref="395:anonymous_100"/>' +
                    			'<field name="actualModel" ref="395:anonymous_100"/>' +
                    			'<array name="pinHandles">' +
                    				'<item ref="396:PinHandle"/>' +
                    			'</array>' +
                    			'<field name="fabrik" ref="388:FabrikComponent"/>' +
                    			'<field name="panel" ref="456:TextComponentMorph"/>' +
                    			'<field name="morph" ref="470:TextMorph"/>' +
                    		'</widget>' +
                    		'<field name="pvtOldPosition" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    	'</g>' +
                    	'<g type="TextComponentMorph" id="426:TextComponentMorph" transform="translate(0,0)">' +
                    		'<rect x="0" y="0" width="180" height="100" stroke-width="1.5" stroke="rgb(0,0,204)" fill="rgb(127,127,230)" fill-opacity="0.8" stroke-opacity="0.8" rx="8" ry="8"/>' +
                    		'<g type="ScrollPane" id="448:ScrollPane" transform="translate(7,7)">' +
                    			'<rect x="0" y="0" width="166" height="86" stroke-width="1" fill="none" rx="3" ry="3"/>' +
                    			'<g type="ClipMorph" id="449:ClipMorph" clip-path="url(#8:lively.scene.Clip)" transform="translate(1,1)">' +
                    				'<rect x="0" y="0" width="151" height="84" stroke-width="0" fill="rgb(243,243,243)" rx="3" ry="3"/>' +
                    				'<g type="TextMorph" id="445:TextMorph" transform="translate(0,0)">' +
                    					'<rect x="1" y="1" width="151" height="21.2" stroke-width="0" stroke="rgb(0,0,0)" fill="none" rx="3" ry="3"/>' +
                    					'<g type="TextSelectionMorph" id="446:TextSelectionMorph" pointer-events="none" transform="translate(0,0)">' +
                    						'<g transform="matrix(1.000000 0.000000 0.000000 1.000000 0.000000 0.000000)" stroke-width="0" fill="none"/>' +
                    						'<field name="origin" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    						'<field name="fullBounds" family="Rectangle"><![CDATA[{"x":-3,"y":-3,"width":6,"height":6}]]></field>' +
                    						'<field name="mouseHandler">null</field>' +
                    						'<field name="openForDragAndDrop">false</field>' +
                    					'</g>' +
                    					'<text kerning="0" fill="rgb(0,0,0)" font-size="12" font-family="Helvetica">' +
                    						'<tspan x="7" y="15.8">------</tspan>' +
                    					'</text>' +
                    					'<field name="textString"><![CDATA["------"]]></field>' +
                    					'<field name="origin" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    					'<field name="fullBounds" family="Rectangle"><![CDATA[{"x":-3,"y":-3,"width":155,"height":25.200000762939453}]]></field>' +
                    					'<field name="textSelection" ref="446:TextSelectionMorph"/>' +
                    					'<field name="changeClue" ref="447:Morph"/>' +
                    					'<field name="suppressHandles">true</field>' +
                    					'<field name="openForDragAndDrop">false</field>' +
                    					'<relay name="formalModel" ref="391:anonymous_98">' +
                    						'<binding formal="Text" actual="Text"/>' +
                    					'</relay>' +
                    				'</g>' +
                    				'<defs>' +
                    					'<clipPath id="8:lively.scene.Clip">' +
                    						'<rect x="0" y="0" width="151" height="84" stroke-width="0" fill="none"/>' +
                    					'</clipPath>' +
                    				'</defs>' +
                    				'<field name="origin" family="Point"><![CDATA[{"x":1,"y":1}]]></field>' +
                    				'<field name="fullBounds" family="Rectangle"><![CDATA[{"x":1,"y":1,"width":151,"height":84}]]></field>' +
                    				'<field name="clip" ref="8:lively.scene.Clip"/>' +
                    				'<field name="suppressHandles">true</field>' +
                    				'<field name="openForDragAndDrop">false</field>' +
                    			'</g>' +
                    			'<g type="SliderMorph" id="450:SliderMorph" transform="translate(152,1)">' +
                    				'<rect x="0" y="0" width="14" height="85" stroke-width="1" stroke="rgb(0,0,0)" fill="url(#454:lively.paint.LinearGradient)" rx="3" ry="3"/>' +
                    				'<g type="Morph" id="451:Morph" transform="translate(0,0)">' +
                    					'<rect x="0" y="0" width="14" height="85" stroke-width="1" stroke="rgb(0,0,0)" fill="url(#455:lively.paint.LinearGradient)" rx="7" ry="7"/>' +
                    					'<field name="origin" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    					'<field name="fullBounds">null</field>' +
                    					'<field name="styleClass"><![CDATA["slider"]]></field>' +
                    					'<field name="openForDragAndDrop">false</field>' +
                    				'</g>' +
                    				'<field name="origin" family="Point"><![CDATA[{"x":152,"y":1}]]></field>' +
                    				'<field name="fullBounds">null</field>' +
                    				'<relay name="formalModel" ref="448:ScrollPane">' +
                    					'<binding formal="Value" actual="ScrollPosition"/>' +
                    					'<binding formal="SliderExtent" actual="-VisibleExtent"/>' +
                    				'</relay>' +
                    				'<field name="valueScale">1</field>' +
                    				'<field name="slider" ref="451:Morph"/>' +
                    				'<field name="suppressHandles">true</field>' +
                    				'<field name="openForDragAndDrop">false</field>' +
                    			'</g>' +
                    			'<field name="origin" family="Point"><![CDATA[{"x":7,"y":7}]]></field>' +
                    			'<field name="fullBounds" family="Rectangle"><![CDATA[{"x":7,"y":7,"width":166,"height":86}]]></field>' +
                    			'<field name="clipMorph" ref="449:ClipMorph"/>' +
                    			'<field name="scrollBar" ref="450:SliderMorph"/>' +
                    			'<field name="suppressHandles">true</field>' +
                    			'<field name="openForDragAndDrop">false</field>' +
                    		'</g>' +
                    		'<g type="PinMorph" id="427:PinMorph" transform="translate(-9,40)" pinHandle="url(#392:PinHandle)">' +
                    			'<ellipse cx="9" cy="9" rx="9" ry="9" stroke-width="1" stroke="rgb(0,0,0)" fill="rgb(0,204,0)" fill-opacity="0.5" stroke-opacity="0.5"/>' +
                    			'<field name="origin" family="Point"><![CDATA[{"x":-9,"y":40}]]></field>' +
                    			'<field name="fullBounds" family="Rectangle"><![CDATA[{"x":-9,"y":40,"width":18,"height":18}]]></field>' +
                    			'<field name="suppressHandles">true</field>' +
                    			'<field name="openForDragAndDrop">false</field>' +
                    			'<field name="ownerWidget" ref="392:PinHandle"/>' +
                    			'<widget id="392:PinHandle">' +
                    				'<record id="393:regular">' +
                    					'<field name="Name"><![CDATA["Text"]]></field>' +
                    					'<field name="Type"><![CDATA["regular"]]></field>' +
                    					'<definition><![CDATA[{"Name":{},"Type":{}}]]></definition>' +
                    				'</record>' +
                    				'<field name="formalModel" ref="393:regular"/>' +
                    				'<field name="actualModel" ref="393:regular"/>' +
                    				'<field name="component" ref="390:TextComponent"/>' +
                    				'<array name="connectors">' +
                    					'<item ref="398:PinConnector"/>' +
                    				'</array>' +
                    				'<field name="morph" ref="427:PinMorph"/>' +
                    			'</widget>' +
                    			'<field name="pinHandle" ref="392:PinHandle"/>' +
                    		'</g>' +
                    		'<field name="origin" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    		'<field name="fullBounds">null</field>' +
                    		'<field name="openForDragAndDrop">false</field>' +
                    		'<field name="styleClass"><![CDATA["fabrik"]]></field>' +
                    		'<field name="priorExtent" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    		'<field name="priorPosition" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    		'<field name="component" ref="390:TextComponent"/>' +
                    		'<field name="formalModel" ref="391:anonymous_98"/>' +
                    		'<field name="halos" ref="432:Morph"/>' +
                    		'<field name="closeHalo" ref="433:ButtonMorph"/>' +
                    		'<field name="text" ref="445:TextMorph"/>' +
                    		'<field name="ownerWidget" ref="390:TextComponent"/>' +
                    		'<widget id="390:TextComponent">' +
                    			'<record id="391:anonymous_98">' +
                    				'<definition><![CDATA[{"Name":{},"Text":{"to":null}}]]></definition>' +
                    				'<field name="Name"><![CDATA["Abstract Component"]]></field>' +
                    				'<field name="Text"><![CDATA["null"]]></field>' +
                    			'</record>' +
                    			'<field name="formalModel" ref="391:anonymous_98"/>' +
                    			'<field name="actualModel" ref="391:anonymous_98"/>' +
                    			'<array name="pinHandles">' +
                    				'<item ref="392:PinHandle"/>' +
                    			'</array>' +
                    			'<field name="fabrik" ref="388:FabrikComponent"/>' +
                    			'<field name="panel" ref="426:TextComponentMorph"/>' +
                    			'<field name="morph" ref="445:TextMorph"/>' +
                    			'<field name="formalModel" ref="391:anonymous_98"/>' +
                    			'<field name="actualModel" ref="391:anonymous_98"/>' +
                    			'<array name="pinHandles">' +
                    				'<item ref="392:PinHandle"/>' +
                    			'</array>' +
                    			'<field name="fabrik" ref="388:FabrikComponent"/>' +
                    			'<field name="panel" ref="426:TextComponentMorph"/>' +
                    			'<field name="morph" ref="445:TextMorph"/>' +
                    		'</widget>' +
                    		'<field name="pvtOldPosition" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    	'</g>' +
                    	'<g type="ConnectorMorph" id="428:ConnectorMorph" transform="translate(0,0)">' +
                    		'<polyline points="0,49 0,49" stroke-width="4" stroke="rgb(0,0,204)"/>' +
                    		'<g type="ArrowHeadMorph" id="429:ArrowHeadMorph" transform="translate(0,49)" pointer-events="none">' +
                    			'<g transform="matrix(1.000000 0.000000 0.000000 1.000000 0.000000 0.000000)" fill-opacity="0" stroke-opacity="0"/>' +
                    			'<g type="Morph" id="430:Morph" transform="translate(0,0)" pointer-events="none">' +
                    				'<polygon points="0,0 -16,6 -16,-6" stroke-width="1" stroke="rgb(0,0,204)" fill="rgb(0,0,204)"/>' +
                    				'<field name="origin" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    				'<field name="fullBounds" family="Rectangle"><![CDATA[{"x":-16,"y":-6,"width":16,"height":12}]]></field>' +
                    				'<field name="mouseHandler">null</field>' +
                    			'</g>' +
                    			'<field name="origin" family="Point"><![CDATA[{"x":0,"y":49}]]></field>' +
                    			'<field name="fullBounds">null</field>' +
                    			'<field name="head" ref="430:Morph"/>' +
                    			'<field name="mouseHandler">null</field>' +
                    		'</g>' +
                    		'<field name="pinConnector" ref="398:PinConnector"/>' +
                    		'<field name="origin" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    		'<field name="fullBounds">null</field>' +
                    		'<field name="openForDragAndDrop">false</field>' +
                    		'<field name="arrowHead" ref="429:ArrowHeadMorph"/>' +
                    		'<field name="ownerWidget" ref="398:PinConnector"/>' +
                    		'<widget id="398:PinConnector">' +
                    			'<field name="fromPin" ref="392:PinHandle"/>' +
                    			'<field name="toPin" ref="396:PinHandle"/>' +
                    			'<field name="isBidirectional">false</field>' +
                    			'<field name="fabrik" ref="388:FabrikComponent"/>' +
                    			'<field name="morph" ref="428:ConnectorMorph"/>' +
                    		'</widget>' +
                    		'<field name="connector" ref="398:PinConnector"/>' +
                    	'</g>' +
                    	'<field name="origin" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    	'<field name="fullBounds">null</field>' +
                    	'<field name="openForDragAndDrop">false</field>' +
                    	'<field name="styleClass"><![CDATA["fabrik"]]></field>' +
                    	'<field name="priorExtent" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    	'<field name="priorPosition" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    	'<field name="component" ref="388:FabrikComponent"/>' +
                    	'<field name="formalModel" ref="389:anonymous_97"/>' +
                    	'<field name="halos" ref="413:Morph"/>' +
                    	'<field name="closeHalo" ref="414:ButtonMorph"/>' +
                    	'<field name="collapseHalo" ref="422:ButtonMorph"/>' +
                    	'<field name="ownerWidget" ref="388:FabrikComponent"/>' +
                    	'<widget id="388:FabrikComponent">' +
                    		'<record id="389:anonymous_97">' +
                    			'<definition><![CDATA[{"Name":{}}]]></definition>' +
                    			'<field name="Name"><![CDATA["Abstract Component"]]></field>' +
                    		'</record>' +
                    		'<field name="formalModel" ref="389:anonymous_97"/>' +
                    		'<field name="actualModel" ref="389:anonymous_97"/>' +
                    		'<array name="pinHandles"/>' +
                    		'<array name="components">' +
                    			'<item ref="390:TextComponent"/>' +
                    			'<item ref="394:TextComponent"/>' +
                    		'</array>' +
                    		'<array name="connectors">' +
                    			'<item ref="398:PinConnector"/>' +
                    		'</array>' +
                    		'<field name="panel" ref="399:FabrikMorph"/>' +
                    		'<field name="morph" ref="399:FabrikMorph"/>' +
                    		'<field name="formalModel" ref="389:anonymous_97"/>' +
                    		'<field name="actualModel" ref="389:anonymous_97"/>' +
                    		'<array name="pinHandles"/>' +
                    		'<array name="components">' +
                    			'<item ref="390:TextComponent"/>' +
                    			'<item ref="394:TextComponent"/>' +
                    		'</array>' +
                    		'<array name="connectors">' +
                    			'<item ref="398:PinConnector"/>' +
                    		'</array>' +
                    		'<field name="panel" ref="399:FabrikMorph"/>' +
                    		'<field name="morph" ref="399:FabrikMorph"/>' +
                    	'</widget>' +
                    	'<field name="fabrik" ref="388:FabrikComponent"/>' +
                    	'<field name="pvtOldPosition" family="Point"><![CDATA[{"x":0,"y":0}]]></field>' +
                    '</g>' +
                '</g>'+ 
            '</svg>');
        
        this.assert(world instanceof WorldMorph, "world is no WorldMorph");
        var fabrikMorph = world.submorphs[0];
        var fabrik = fabrikMorph.component;
        this.assert(fabrik instanceof FabrikComponent, "fabrik is no FabrikComponent");
        

        this.assert(fabrik.components, "components are not defined");
        this.assertEqual(fabrik.components.length, 2, "wrong number of components");

        this.assertEqual(fabrik.connectors.length, 1, "wrong number of connectors");
               
        var text1 = fabrik.components[0];
        var text2 = fabrik.components[1];
                        
        this.assert(text1.pinHandles, "no pinHandles in component");              
        
        var connector1 = fabrik.components[0];
        
        //this.assertIdentity(connector1.fromPin, text1.getPin("Text"), " wrong fromPin")
        //this.assertIdentity(connector1.toPin, text2.getPin("Text"), " wrong toPin")
        
        
    },

    testSerializeFabrik: function() {
        var fabrik = new FabrikComponent();
        var text1 = new TextComponent();
        var text2 = new TextComponent();
        fabrik.plugin(text1);
        fabrik.plugin(text2);
	    text1.getPin("Text").connectTo(text2.getPin("Text"));        

        fabrik.buildView(pt(400, 400));
        this.worldMorph.addMorphFrontOrBack(fabrik.panel, true, true);


        var doc = Exporter.shrinkWrapMorph(this.worldMorph);

        var worldNode = doc.getElementById(this.worldMorph.id());
        var fabrikNode = doc.getElementById(fabrik.id());
        
        this.assert(fabrikNode, "no fabrik node with id " + fabrik.id() + " found");
        
        // and here should the tests begin...

        console.log(Exporter.stringify(doc.getElementById(fabrik.panel.id())));
    }

});


console.log("Loaded FabrikTest.js");

}); // end of require