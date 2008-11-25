using().module('lively.demofx').run(function() {	

    Morph.subclass('lively.demofx.SceneMorph', {
	content: {},
	initialize: function($super, model) {
	    $super(using(lively.scene, lively.paint, lively.data).model(model).link(this.content));
	}
    });


    lively.demofx.SceneMorph.subclass('lively.demofx.Label', { // FIXME: Unfinished
	formals: ["Text", "FormattedValue", "FormattedPosition"],
	content: {
	    $:"Group",
	    content: [
		{$:"Text", content: {$:"Bind", to: "Text"},
		 fontSize: 10,
		 fill: Color.white
		},
		{$:"Text", content: {$:"Bind", to: "FormattedValue"},
		 transforms: [{$:"Translate", X: {$:"Bind", to: "FormattedPosition"}}],  
		 fontSize: 10,
		 fill: Color.rgb(40, 40, 40),
		}
	    ]
	}
    });
    

    using().run(function() {
    const closeSize = 12;
    lively.demofx.SceneMorph.subclass('lively.demofx.CloseButton', {

	formals: ["Color"],

	content: {
	    $:"Group",
	    content: [
		{$:"Rectangle",
                 x: 0, //{$:"Bind", eval: "ex.layoutBounds.minX"},
                 y: 0, //{$:"Bind", eval:  "ex.layoutBounds.minY"},
                 width: closeSize, //{$:"Bind", eval: "ex.layoutBounds.width"},
                 height: closeSize, //{$:"Bind", eval " ex.layoutBounds.height"},
                 //fill: null
                },
		{ $:"Group",
		  content: [
		      {$:"Polyline", points: [pt(2,2), pt(closeSize - 2, closeSize - 2)],
		       stroke: {$:"Bind", to: "Color"},
		       strokeWidth: 3
		       //strokeLineCap: StrokeLineCap.ROUND
		      },
		      {$:"Polyline", points: [pt(2, closeSize - 2), pt(closeSize - 2, 2)],
		       stroke: {$:"Bind", to: "Color"},
		       strokeWidth: 3
		       //strokeLineCap: StrokeLineCap.ROUND
		      }
		  ]
		}
	    ]
	}
	
    });
    });

    using().run(function() { // scoping 
    var thumbWidth = 20;
    var thumbHeight = 12;
    const minimum = 0.0;
    const maximum = 1.0;

    lively.demofx.SceneMorph.subclass('lively.demofx.SliderThumb', {
	formals: ["_ThumbValue",  // private
		  "AdjValue", 
		  "Width", 
		  "_Value"
		 ],
	
	content: {
	    $:"Group", 
	    transforms: [{$:"Translate", X: {$:"Bind", to: "_ThumbValue" }, Y: -2}],
	    content:[
		{$:"Rectangle",
		 width: thumbWidth,
		 height: thumbHeight,
		 arcWidth: 7,
		 fill: {$:"LinearGradient", 
			stops: [
			    {$:"Stop", offset: 0.0,  color: Color.rgb(107, 107, 107) },
			    {$:"Stop", offset: 0.55, color: Color.black },
			    {$:"Stop", offset: 0.7,  color: Color.rgb( 75,  75,  75) },
			    {$:"Stop", offset: 1.0,  color: Color.rgb( 23,  23,  23) }
			]},
		 stroke: {$:"LinearGradient",
			  stops: [
                              {$:"Stop", offset: 0.0, color: Color.rgb(  3,   3,   3) },
                              {$:"Stop", offset: 1.0, color: Color.rgb( 82,  82,  82) }
			  ]
			 },
		 strokeWidth: 1
		},
		{$:"Polygon", 
		 transforms: [{$:"Translate", X: (thumbWidth/2 - 3.8), Y: thumbHeight/2}],
		 points: [pt(0, 0), pt(3, -3), pt(3, 3)],
		 fill: Color.white
		},
		{$:"Polygon",
		 transforms: [{$:"Translate", X: thumbWidth/2 + 1.8, Y: thumbHeight/2}],
		 points: [pt(3, 0), pt(0, -3), pt(0, 3)],
		 fill: Color.white
		}
	    ]},
	
	initialize: function($super, model) {
	    $super(model);
	    this.connectModel(model);
	    model.addObserver(this);
	},
	
	handlesMouseDown: Functions.True,
	
	onMouseMove: function(evt) {
	    if (evt.mouseButtonPressed) return;
	    return Morph.prototype.onMouseMove.call(this, evt);
	},
	
	onMouseDown: function(evt) {
	    this.origValue = this.getAdjValue(); 
	    this.hitPoint = this.localize(evt.point());
	},
	
	onMouseMove: function(evt) {
	    if (!evt.mouseButtonPressed) return;
	    var drag = this.localize(evt.point()).subPt(this.hitPoint);
	    var v = this.origValue + (drag.x / this.getWidth());
	    if (v < 0) {
		v = 0;
	    } else if (v > 1) {
		v = 1;
	    }
	    // FIXME reference to minimum/maximum
	    this.set_Value(minimum + (v * (maximum-minimum)));

	    this.layoutChanged(); // FIXME this should happen elsewhere, reflects the fact that setting Value
	    // will update the thumb position (thumb being rendered as a Group) but the parent won't notice
	},

	on_ValueUpdate: function(value) {
	    var minimum = 0.0;
	    var maximum = 1.0;
	    var adjValue = (value - minimum)/(maximum - minimum);
	    this.setAdjValue(adjValue);
	},

	onAdjValueUpdate: function(adjValue) {
	    var thumbValue = adjValue * this.getWidth() - thumbWidth/2;
	    this.set_ThumbValue(thumbValue);
	},
	
	onWidthUpdate: function(width) {
	    this.set_ThumbValue(this.getAdjValue() * width - thumbWidth/2);
	},

	on_ThumbValueUpdate: function(value) {
	    //console.log('thumb value ' + value);
	}
    });
    });

    Morph.subclass('lively.demofx.Slider', {
	formals: ["Width"],
	content: {
	    $:"Group",
	    content: [
		{$:"Rectangle", 
		 width: {$:"Bind", to: "Width"},
		 height: 8,
		  arcWidth: 10,
		 //                 arcHeight: 10
		 fill: {$:"LinearGradient",
			startX: 0,
			startY: 0,
			endX: 0,
			endY: 1,
			stops: [
                            {$:"Stop", offset: 0.0, color: Color.rgb(172, 172, 172) },
                            {$:"Stop", offset: 0.6, color: Color.rgb(115, 115, 115) },
                            {$:"Stop", offset: 1.0, color: Color.rgb(124, 124, 124) }
			]
		       },
		 stroke: {$:"LinearGradient",
			  startX: 0,
			  startY: 0,
			  endX: 0,
			  endY: 1,
			  stops: [
                              {$:"Stop", offset: 0.0, color: Color.rgb( 15,  15,  15) },
                              {$:"Stop", offset: 1.0, color: Color.rgb(224, 224, 224) }
			   ]
			 }
		}
	    ]},
	initialize: function($super, model, optExtension) {
	    //$super(using(lively.scene, lively.paint, lively.data).model(model).link(this.content));
	    $super(using(lively.scene, lively.paint, lively.data).model(model).extend(this.content, optExtension || {}));
	    this.addMorph(new lively.demofx.SliderThumb(model));
	}
	
    });

    Object.extend(lively.demofx.Slider, {
	fromLiteral: function(literal, model) {
	    var morph = new lively.demofx.Slider(model);
	    if (literal.transforms) { 
		morph.setTransforms(literal.transforms);
	    }
	    return morph;
	}
    });

    


    const width = 600;//(6 * (82 + 10)) + 20;    
    const canvasWidth = width-10;
    const canvasHeight = 333 + 40;
    
    lively.demofx.SceneMorph.subclass('lively.demofx.Canvas', {
	formals: ["Image",  // public
		  "_CanvasX", // private to class
		  "_CanvasY",   // private to class
		  "ImageRotation" // external, not strictly necessary?
		 ],
	content: {
	    $:"Group", 
            clip: {$:"Rectangle", /*smooth: false,*/ width: canvasWidth, height: canvasHeight + 1 },
            content: [
		{$:"Rectangle",
		 width: canvasWidth,
		 height: canvasHeight,
		 fill: {$:"LinearGradient", startX: 0, startY: 0, endX: 0, endY: 1,
			stops: [ {$:"Stop", offset: 0.1, color: Color.black },
				 {$:"Stop", offset: 1.0, color: Color.rgb(193, 193, 193) } ]}
		},
		
		{$:"Group",
		 //cache: true,
		 transforms: [{$:"Translate", X: {$:"Bind", to: "_CanvasX"}, Y: {$:"Bind", to: "_CanvasY"}},
			      {$:"Rotate", Angle: {$:"Bind", to: "ImageRotation"}, X: canvasWidth/2, Y: canvasHeight/2}],
		 // very dirty, mixing scene graph with morphs, parent doesnt know that it has a submorph
		 content: [{$:"Bind",  to: "Image"} ] 
		},
		
		{$:"Rectangle", 
		 width: canvasWidth,
		 height: 2,
		 fill: Color.rgb(103, 103, 103)
		},
		{$:"Rectangle",
		 y: canvasHeight,
		 width: canvasWidth,
		 height: 1,
		 fill: Color.rgb(240, 240, 240)
		}
            ]
	},

	onImageUpdate: function(imageMorph) {
	    this.set_CanvasX((canvasWidth - imageMorph.image.getWidth())/2);
	    this.set_CanvasY(canvasHeight/2 - imageMorph.image.getHeight()/2);
	}
	
    });

    using().run(function() {
    const knobWidth = 25;
    const minimum = 0.0;
    const maximum = 1.0;

    lively.demofx.SceneMorph.subclass('lively.demofx.KnobMorph',  {
	formals: ["_KnobValue",  // private to morph
		  "ImageRotation" // public
		 ],
	content: {
	    $:"Group", 
	    content: [
		{$:"Ellipse", 
		 radius: knobWidth,  // Bind width
		 fill: {$:"LinearGradient", 
			stops: [
			    {$:"Stop", offset: 0.0, color: Color.rgb(172, 172, 172) },
			    {$:"Stop", offset: 0.5, color: Color.rgb(115, 115, 115) },
			    {$:"Stop", offset: 1.0, color: Color.rgb(130, 130, 130) },
			] },
		 stroke: {$:"LinearGradient",
			  stops: [
			      {$:"Stop",  offset: 0.0, color: Color.rgb( 69,  69,  69) },
			      {$:"Stop",  offset: 1.0, color: Color.rgb(224, 224, 224) },
			  ] },
		 strokeWidth: 2
		},
		
		{$:"Ellipse", centerX: 0.5, centerY: 0.5, radius: 5 },
		
		{$:"Polyline", points: [pt(0, 0), pt(knobWidth/2 + 2, 0)],
		 transforms: [{$:"Rotate", Angle: {$:"Bind", to: "_KnobValue"}}],
		 stroke: Color.white,
		 strokeWidth: 2.5
		},
		
		{$:"Polyline", points: [pt(0,0), pt(knobWidth/2 + 2, 0)],
		 transforms: [{$:"Rotate", Angle: {$:"Bind", to: "_KnobValue"}}],
		 stroke: {$:"LinearGradient",
			  stops: [{$:"Stop", offset: 0.0, color: Color.rgb( 40,  40,  40)},
				  {$:"Stop", offset: 1.0, color: Color.rgb(102, 102, 102)}]
			 }
		}
	    ]
	},

	handlesMouseDown: Functions.True,
	
	onMouseDown: function(evt) {
	    this.origValue = this.getImageRotation();
	    this.hitPoint = this.localize(evt.point());
	},
	
	onMouseMove: function(evt) {
	    if (!evt.mouseButtonPressed) return;
	    var drag = this.localize(evt.point()).subPt(this.hitPoint);
	    var v = this.origValue + (drag.x / knobWidth);
	    //console.log('drag ' + [drag, v, this.origValue]);
	    /*if (v < 0) {
		    v = 0;
		} else if (v > 1) {
		    v = 1;
		}*/
	    
	    // FIXME reference to minimum/maximum
	    var newValue = (minimum + (v * (maximum-minimum)))*180;
	    this.setImageRotation(newValue % 360);
	    this.layoutChanged(); // FIXME this should happen elsewhere, reflects the fact that setting Value
	    // will update the thumb position (thumb being rendered as a Group) but the parent won't notice
	},

	onImageRotationUpdate: function(value) {
	    this.set_KnobValue(0 - value);
	}

    });
    });
 


    false && using().test(function() {
	// more structural experiments
	var LabeledSliderBlueprint = {
	    $:"Morph",
	    shape: {$:"Rectangle", width: {$:"Bind", to: "Width"}, height: 20},
	    formals: ["Padding", "Width"],
	    submorphs: [
		{$:"TextMorph", textColor: Color.white, content: "Hello", label: true},
		{$:"Slider", 
		 transforms: [{$:"Translate", X: {$:"Bind", to:"Padding"}, Y: 0}],
		 width: {$:"Bind", to: "Width"}
		}
	    ]
	};
	
	var testModel = Record.newPlainInstance({Padding: 100, Width: 300, _ThumbValue: 0, _Value: 0, AdjValue: 0, "Text": "Foo"});
	var m = WorldMorph.current().addMorph(using(lively.scene, lively.paint, lively.data, lively.demofx, Global).model(testModel).link(LabeledSliderBlueprint));
	m.setPosition(WorldMorph.current().bounds().center());
    });

    /*********************************************/
    // application code



    var sliderModel = Record.newPlainInstance({_Value: 0, Width: 150, AdjValue: 0, _ThumbValue: 0, 
	LabelValue: "radius 0.00"});
    
    var targetImage = new ImageMorph(new Rectangle(100, 100, 500, 333), 
	URL.source.withFilename('Resources/images/flower.jpg').toString());
    var effect = new lively.scene.GaussianBlur(0.001, "myfilter");

    effect.applyTo(targetImage);

    sliderModel.addObserver({
	onAdjValueUpdate: function(value) {
	    var radius = value*10;
	    effect.setRadius(radius);
	    sliderModel.setLabelValue("radius " + radius.toFixed(2));
	}
    });
    
    var canvasModel = Record.newPlainInstance({Image: targetImage, ImageRotation: 0, _CanvasX: 0, _CanvasY: 0, _KnobValue: 0});

    var container = new BoxMorph(new Rectangle(230, 100, canvasWidth, canvasHeight + 100));


    var closeModel = Record.newPlainInstance({ Color: Color.rgb(153, 153, 153) });
    var closeMorph = container.addMorph(new lively.demofx.CloseButton(closeModel));
    closeMorph.align(closeMorph.bounds().topRight(), container.shape.bounds().topRight());
    closeMorph.suppressHandles = true;
    closeMorph.handlesMouseDown = Functions.True;
    closeMorph.onMouseDown = function() {
	container.remove();
    }

    var canvasMorph = container.addMorph(new lively.demofx.Canvas(canvasModel));
    if (Global.FIXME_lastMorph) {
	//canvasMorph.addMorph(Global.FIXME_lastMorph);
    }
    //    alert('its ' + Global.FIXME_lastMorph);
    
    canvasMorph.align(canvasMorph.bounds().topRight(), closeMorph.bounds().bottomRight());
    canvasMorph.connectModel(canvasModel.newRelay({Image: "Image", _CanvasX: "+_CanvasX", _CanvasY: "+_CanvasY"}), true);


    
    
    var sliderMorph = container.addMorph(new lively.demofx.Slider(sliderModel));
    sliderMorph.align(sliderMorph.bounds().topCenter(), canvasMorph.bounds().bottomCenter());
    sliderMorph.translateBy(pt(0, 5));

    var label = container.addMorph(new TextMorph(new Rectangle(0,0,0,0)).beLabel());
    label.setTextColor(Color.white);
    label.connectModel(sliderModel.newRelay({Text: "LabelValue"}), true);
    label.align(label.bounds().leftCenter(), sliderMorph.bounds().rightCenter());
    label.translateBy(pt(10, 0));


    var knobMorph = container.addMorph(new lively.demofx.KnobMorph(canvasModel));
    knobMorph.align(knobMorph.bounds().topCenter(), sliderMorph.bounds().bottomCenter());
    knobMorph.translateBy(pt(0, 5));
    knobMorph.connectModel(canvasModel.newRelay({_KnobValue: "+_KnobValue", ImageRotation: "ImageRotation"}));
    
    WorldMorph.current().addMorph(container);
 
}.logErrors());