TestCase.subclass('FabrikTest', {
    setUp: function() {
        this.fabrikComponent = new FabrikComponent();
    },
    buildFabrikWithComponents: function(number){        
        var self = this;
        this.components = [];
        for (var i=0; i<number; i++) {
            this.components.push(new TextComponent());
        };
        view = this.fabrikComponent.buildView();
        this.components.each(function(ea){self.fabrikComponent.plugin(ea)});
    },
	testPluginTextComponent: function() {
	    this.textComponent = new TextComponent();
	    this.fabrikComponent.plugin(this.textComponent);
	    this.assertEqual(this.fabrikComponent.components.length, 1);
	    this.assertEqual(this.fabrikComponent.components.length, 1);
	},	
	testBuildView: function() {
    	this.buildFabrikWithComponents(0);
        //this.fabrikComponent.openIn(WorldMorph.current());
    	//this.assert(this.fabrikComponent.morph.openForDragAndDrop);
    },
	testBuildViewAfterPlugin: function() {
	    this.buildFabrikWithComponents(2);
	    var self = this;
	    this.components.each(function(ea){self.fabrikComponent.plugin(ea)});
	    this.fabrikComponent.buildView();
	    this.assert(this.components[0].morph, "buildView has to build the component morphs");
	},
	testAutomaticLayout: function() {
	    this.buildFabrikWithComponents(10);
        this.fabrikComponent.automaticLayout();
        this.assert(this.components[0].panel.position().x < this.components[1].panel.position().x, "second morph must be right");
        this.assert(this.components[4].panel.position().y > 0,
            "the 5th morph has to be on the next line: " + 
            "\n   position: " + this.components[4].morph.position() +
            "\n   width: " + this.components[4].morph.bounds().width + 
            "\n   fabrik width: " + this.fabrikComponent.morph.bounds().width);
        this.assert(this.components[4].panel.position().x < 20, 
            "the 5th morph has to be at the beginning of the line" + this.components[4].morph.position());
	},
	testAutomaticLayoutGui: function() {
	    this.buildFabrikWithComponents(10);
	    this.fabrikComponent.buildView();
        // uncomment next line for having a look at the resulting layout
        // this.fabrikComponent.openIn(WorldMorph.current());
        this.fabrikComponent.automaticLayout();
	},
	testConnectPins: function(){
	    this.buildFabrikWithComponents(2);
        var con = this.fabrikComponent.connectPins(
	        this.components[0].getPinHandle("Text"), 
	        this.components[1].getPinHandle("Text"));
        this.assert(con);
	    this.assertEqual(this.fabrikComponent.connectors.length, 1);
	},
	testConnectTextComponents: function(){
	    this.buildFabrikWithComponents(2);
        this.fabrikComponent.connectTextComponents( this.components[0], this.components[1])
	    this.assertEqual(this.fabrikComponent.connectors.length, 1);
	},
});

TestCase.subclass('ComponentModelTest', {
    setUp: function() {
    	this.fabrikComponent = new FabrikComponent();
        this.textComponent1 = new TextComponent();
        this.fabrikComponent.plugin(this.textComponent1);
        this.fabrikComponent.buildView();
        this.text = "Hello World"
    },
    testChangeModel: function() {
        this.fabrikComponent.model.setValue1(this.text);
        this.assertEqual(this.textComponent1.model.getValue(), this.text, " faild at component model");
        this.assertEqual(this.textComponent1.morph.getText().asString(), this.text, " faild at morph");
	},
	testChangeView: function() {
        this.textComponent1.morph.setTextString(this.text);
        this.textComponent1.morph.doSave();
        this.assertEqual(this.textComponent1.model.getValue(), this.text, " faild at component model");
        this.assertEqual(this.textComponent1.morph.getText().asString(), this.text, " faild at morph");
   	},
	testSecondComponent: function() {
	    this.textComponent2 = new TextComponent();
	    this.fabrikComponent.plugin(this.textComponent2);
	    var cm = this.textComponent2.model;
	    this.assertEqual(cm.model, this.fabrikComponent.model);
	    this.assertEqual(cm.varname, "Value2");

        this.assertEqual(cm.model.getterName(cm.varname), "getValue2");
        this.fabrikComponent.model.setValue2(this.text);
        
        this.assertEqual(this.textComponent2.morph.getModelValue("getText"), this.text);
   	},
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
    	this.assertEqual(this.fabrikComponent.pins.length, 3,"pins: "+ this.fabrikComponent.pins);
	    this.assertEqual(this.fabrikComponent.pins[0], "Value1");
	    this.assertEqual(this.fabrikComponent.pins[1], "Value2");
	    this.assert(this.fabrikComponent.model.variables().include("Value1"), "variables:" + this.fabrikComponent.model.variables());
	},
	testSetText: function() {
        this.fabrikComponent.buildView();
	    s = "Hello World";
	    this.assert( this.textComponent1.morph);
        this.textComponent1.morph.setTextString(s);
        this.textComponent1.morph.doSave();
        this.assertEqual(this.textComponent1.morph.getText().asString(),s);
        this.assert(this.fabrikComponent.model.getValue1(),"Value1 has to be defined");
        this.assertEqual(this.fabrikComponent.model.getValue1().asString(), s);
    },
    testValue1: function() {
        this.fabrikComponent.buildView();
	    s = "Hello Value1";
	    this.assert( this.textComponent1.morph);
        this.fabrikComponent.model.setValue1(s);
        this.assertEqual(this.textComponent1.morph.getText().asString(), s);
    },
    testValue2: function() {
        this.fabrikComponent.buildView();
        s = "Hello Value2";
        this.assert( this.textComponent2.morph);
        this.fabrikComponent.model.setValue2(s);
        this.assertEqual(this.textComponent2.morph.getText().asString(), s);
    },
    testWireFromText1ToText2: function() {
        this.fabrikComponent.buildView();
        this.fabrikComponent.connectCompontentsFromTo(this.textComponent1, this.textComponent2);
        s = "Hello World";
        this.textComponent1.morph.setTextString(s);
        this.textComponent1.morph.doSave();
        this.assertEqual(this.textComponent2.morph.getText().asString(), s);   
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
        this.fabrikComponent.connectCompontentsFromTo(this.textComponent1, this.textComponent2);
        this.fabrikComponent.connectCompontentsFromTo(this.textComponent1, this.textComponent3);
        this.setTextInComponent(this.textComponent3, this.text);
        this.assertTextInComponents(this.text);
    },
    testWireFromThreeTextsTransitive: function() {
        this.fabrikComponent.buildView();
        this.fabrikComponent.connectCompontentsFromTo(this.textComponent1, this.textComponent2);
        this.fabrikComponent.connectCompontentsFromTo(this.textComponent2, this.textComponent3);
        this.setTextInComponent(this.textComponent3, this.text)
        this.assertTextInComponents(this.text);
    },    
    testWireFromThreeTextsReverse: function() {
        this.fabrikComponent.buildView();
        this.fabrikComponent.connectCompontentsFromTo(this.textComponent1, this.textComponent2);
        this.fabrikComponent.connectCompontentsFromTo(this.textComponent3, this.textComponent1);
        this.setTextInComponent(this.textComponent3, this.text);
        this.assertTextInComponents(this.text);
    }
});

TestCase.subclass('ComponentConnectorTest', {
    setUp: function() {
        this.fabrikComponent = new FabrikComponent();
        this.componentConnector = new ComponentConnector(pt(0,0),pt(100,100));
        this.fabrikComponent.buildView();
        this.componentConnector.buildView();
        this.fabrikComponent.morph.addMorph(this.componentConnector.morph);
        this.point1 = pt(100,100);
        this.point2 = pt(200,200);
    },
    testSetStartPoint: function() {
        this.componentConnector.setStartPoint(this.point1);
        this.assert(this.componentConnector.morph.shape.vertices()[0].eqPt(this.point1),
            "startpoint should be the first vertice");
        
    },
    testSetEndPoint: function() {
        this.componentConnector.setEndPoint(this.point2);
        this.assert(this.componentConnector.morph.shape.vertices().last().eqPt(this.point2),
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
            this.assert(e.msg) && this.assert(e.msg.startsWith("faild")) 
        }
    },
    
});


TestCase.subclass('PinHandleTest', {
    setUp: function() {
        this.fabrikComponent = new FabrikComponent();
        this.component1 = new TextComponent();
        this.fabrikComponent.plugin(this.component1);
        this.fabrikComponent.buildView();
    },
    testGetPinHandleForText: function() {
        this.pinHandle = this.component1.getPinHandle("Text");
        this.assert(this.pinHandle);
    },
    testGetPosition: function() {
        this.pinHandle = this.component1.getPinHandle("Text");
        var point =  pt(0,45)
        this.assertEqualState(this.pinHandle.getPosition(), point);
        var offset = pt(100,100);
        this.component1.panel.setPosition(offset);
        this.assertEqualState(this.pinHandle.getPosition(), point.addPt(offset));
    },
});

