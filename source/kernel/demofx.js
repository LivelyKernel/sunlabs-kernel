using().module('lively.demofx').run(function() {	

    Morph.subclass('lively.demofx.WrapperMorph', {
	initialize: function($super, content, model) {
	    // passing this as second argument wil mean that all the linked literals
	    // with the $var name will be instance fields 
	    $super(using(lively.scene, lively.paint, lively.data).model(model).link(content, this));

	}
    });

    lively.demofx.WrapperMorph.subclass('lively.demofx.SceneMorph', {
	content: {},
	initialize: function($super, model) {
	    $super(this.content, model);
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
                 height: closeSize //{$:"Bind", eval " ex.layoutBounds.height"},
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
	    // FIXME this !== this
	}
	
    });

    using().run(function() {
    const knobWidth = 25;
    const minimum = 0.0;
    const maximum = 1.0;

    lively.demofx.SceneMorph.subclass('lively.demofx.Knob',  {
	formals: ["_KnobValue",  // private to morph
		  "ImageRotation", // public
		  "KnobWidth",
		  "_KnobHandleLength"
		 ],
	content: {
	    $:"Group", 
	    content: [
		{$:"Ellipse", 
		 radius: {$:"Bind", to: "KnobWidth"},
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
		
		{$:"Line", EndX: {$:"Bind", to: "_KnobHandleLength"}, EndY : 0,
		 transforms: [{$:"Rotate", Angle: {$:"Bind", to: "_KnobValue"}}],
		 stroke: Color.white,
		 strokeWidth: 2.5
		},
		
		{$:"Line", EndX: {$:"Bind", to: "_KnobHandleLength"}, EndY: 0,
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
	    var v = this.origValue + (drag.x / this.getKnobWidth());
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
	},

	onKnobWidthUpdate: function(value) {
	    this.set_KnobHandleLength(value/2 + 2);
	}

    });
    });
 
    
    using().run(function() {
	const width = 100;
	const height = 20;

    lively.demofx.SceneMorph.subclass('lively.demofx.Button',  {
	formals: ["GlowColor", "GlowOpacity"],
	content: {
	    $:"Group",
	    content: [
		{$:"Rectangle",
                 //cursor: Cursor.HAND
                 width: width,
                 height: height,
                 fill: {$:"LinearGradient",
			startX: 0,
			startY: 0,
			endX: 0,
			endY: 1,
			stops: [
                            {$:"Stop", offset: 0.0, color: Color.rgb( 65,  65,  65) },
                            {$:"Stop", offset: 0.4, color: Color.rgb(  1,   1,   1) },
                            {$:"Stop", offset: 0.8, color: Color.rgb( 21,  21,  21) },
                            {$:"Stop", offset: 1.0, color: Color.rgb(  4,   4,   4) }
                        ]
                       },
                 stroke: {$:"LinearGradient", startX: 0, startY: 0, endX: 0, endY: 1,
                          stops: [
                              {$:"Stop", offset: 0.0, color: Color.rgb(  5,   5,   5) },
                              {$:"Stop", offset: 1.0, color: Color.rgb( 85,  85,  85) },
                          ]
			 } ,
		 /// FIXME fade/in/out behavior here
		 
		},
                {$:"Rectangle",
		 $var: "rect",  // this.rect will be bound to this value
                 x: 1,
                 y: 1,
                 width: width - 1,
                 height: height - 1,
		 fillOpacity: {$:"Bind", to: "GlowOpacity"},
                 fill: {$:"Bind", to: "GlowColor"}
                }
	    ]
	},
	
	handlesMouseDown: Functions.True,
	suppressHandles: true,

	onMouseOver: function() {
	    this.setGlowColor(new Color(0.5, 0.5, 0.5, 0.5));
	    this.setGlowOpacity(0.5);
	},

	onMouseOut: function() {
	    this.setGlowColor(Color.white);
	    this.setGlowOpacity(0);
	},
	
	initialize: function($super, model, labelText) {
	    $super(model);
	    var label = new TextMorph(new Rectangle(0, 0, 0, 0), labelText);
	    label.beLabel();
	    label.setTextColor(Color.white);
	    label.setFontSize(11);
	    this.addMorph(label);
	    label.align(label.bounds().center(), this.shape.bounds().center());
	    label.translateBy(pt(0, -3)); // ouch
	}
	
    });

    });

    const twidth = 82;
    const theight = 71;
    const selColor =  Color.white;
    const topColor = new Color(0.3, 0.3, 0.3);


    lively.demofx.SceneMorph.subclass('lively.demofx.Preview',  {
	formals: ["Selected", "ThumbImage", "_BorderColor"],
	suppressHandles: true,
	
	content: {
	    $:"Group",
            //blocksMouse: true
            //cursor: Cursor.HAND
	    
            content: [
		{$:"Group",
		 //cache: true,
		 clip: {$:"Rectangle", /*smooth: false*/ width: twidth, height: theight },
                 content: [
		     {$:"Group", 
/*		      transforms: [{$:"Translate", 
				    //X: {$:"Bind", eval: "(twidth - control.thumbImage.layoutBounds.width) / 2 - control.thumbImage.layoutBounds.minX"}, Y: 0}
				    X: 0, Y: 0} ], */
		      content: [{$:"Bind", to: "ThumbImage", debugString: 'here'}] // eval: "control.thumbImage"}]
		     },
		     {$:"Rectangle",
                      y: theight * 0.72,
                      width: twidth,
                      height: theight * 0.28,
                      fill: new Color(0, 0, 0, 0.7),
                      stroke: Color.black
		     }
		     /*text = {$:"Text",
                        translateX: bind (twidth - text.layoutBounds.width) / 2 - text.layoutBounds.minX
                        translateY: bind rect.layoutBounds.minY + (rect.layoutBounds.height / 2) + 4
                        font: Font { size: 10 }
                        content: label
                        fill: Color.WHITE
                    },*/
		 ]},

		{$:"Rectangle",
		 width: twidth,
		 height: theight,
		 fill: null,
                 stroke: {$:"Bind", to: "_BorderColor"}
                },

                {$:"Polygon",
                 visible: {$:"Bind", to: "Selected"},
		 transforms: [{$:"Translate", X:twidth / 2, Y: -7}],
                 points: [pt(0, 0), pt(5, 5), pt(-5, 5)],
                fill: Color.rgb(190, 190, 190)
                },
                {$:"Polygon",
                 visible: {$:"Bind", to: "Selected"},
		 transforms:[{$:"Translate", X:twidth / 2, Y: theight + 3}],
                 points: [pt(-5, 0), pt(5, 0), pt(0, 5)],
                 fill: Color.rgb(190, 190, 190)
                }
	    ]
	},

	onThumbImageUpdate: function(img) {
	    console.log('patching owner to ' + img);
	    img.owner = this; // ouch FIXME
	},
	
	onMouseOver: function(evt) {
	    this.set_BorderColor(selColor);
	},

	onMouseOut: function(evt) {
    	    this.set_BorderColor(topColor);
	},

	handlesMouseDown: Functions.True,
	
	onMouseDown: function(evt) {
	    // tell someone to select me
	    console.log('selected ' + this  + ", label " + this.label + " center " + this.bounds().bottomCenter());
	},

	initialize: function($super, model, labelText) {
	    $super(model);
	    this.label = new TextMorph(new Rectangle(0,0,0,0), labelText).beLabel();
	    this.label.beLabel();
	    this.label.setWrapStyle(lively.Text.WrapStyle.Shrink);
	    this.label.setFontSize(10);
	    this.label.setTextColor(Color.gray);
	    this.addMorph(this.label);
	    this.label.align(this.label.bounds().bottomCenter(), this.bounds().bottomCenter());
	    this.label.translateBy(pt(4, 0));
	    console.log('added label ' + label + " text " + this.label.textString + " vs " + labelText);	    

	}
	
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
	LabelValue: "radius +0.00"});
    
    var targetImage = new ImageMorph(new Rectangle(0, 0, 500, 333), 
	URL.source.withFilename('Resources/demofx/flower.jpg').toString());
    var theEffect = new lively.scene.GaussianBlurEffect(0.001, "myfilter");
    theEffect.applyTo(targetImage);

    sliderModel.addObserver({
	onAdjValueUpdate: function(value) {
	    var radius = value*10 || 1;
	    theEffect.setRadius(radius);
	    sliderModel.setLabelValue("radius +" + radius.toFixed(2));
	}
    });
    
    var canvasModel = Record.newPlainInstance({Image: targetImage, ImageRotation: 0, _CanvasX: 0, _CanvasY: 0, _KnobValue: 0, KnobWidth: 25, _KnobHandleLength: (25/2 + 2)}); // FIXME: note explicit calculation

    var container = new BoxMorph(new Rectangle(230, 30, canvasWidth, canvasHeight + 100));


    var closeModel = Record.newPlainInstance({ Color: Color.rgb(153, 153, 153) });
    var closeMorph = container.addMorph(new lively.demofx.CloseButton(closeModel));
    closeMorph.align(closeMorph.bounds().topRight(), container.shape.bounds().topRight());
    closeMorph.suppressHandles = true;
    closeMorph.handlesMouseDown = Functions.True;
    closeMorph.onMouseDown = function() {
	container.remove();
    }

    var canvasMorph = container.addMorph(new lively.demofx.Canvas(canvasModel));
    canvasMorph.align(canvasMorph.bounds().topRight(), closeMorph.bounds().bottomRight());
    canvasMorph.connectModel(canvasModel.newRelay({Image: "Image", 
						   _CanvasX: "+_CanvasX", 
						   _CanvasY: "+_CanvasY"}), true);
    
    
    WorldMorph.current().addMorph(container);


    function makePreview(effect, name, shortName) {
	var factor = 0.17;
	var thumbImage = new ImageMorph(new Rectangle(0, 0, 500*factor, 333*factor),
	    URL.source.withFilename('Resources/demofx/' + shortName).toString());
	thumbImage.setFillOpacity(0);
	var previewModel = Record.newPlainInstance({Selected: true, ThumbImage: thumbImage, _BorderColor: topColor});
	var previewMorph = new lively.demofx.Preview(previewModel, name);
	previewMorph.connectModel(previewModel.newRelay({ThumbImage: "ThumbImage", _BorderColor: "+_BorderColor"}), 
				  true);
	if (effect) effect.applyTo(previewModel.getThumbImage());
	return previewMorph;
    }


    var firstRow = {$:"Group",
	content: [
            {$:"Group",
             transforms: [{$:"Translate", X: 0, Y: {$:"Bind", to: "FirstRowStartY"}}],
	     content: [
                 {$:"Rectangle",
                  width: width,
                  height: theight + 21,
                  fill: {$:"LinearGradient",
                         startX: 0, startY: 0, endX: 0, endY: 1,
                         stops: [
                             {$:"Stop", offset: 0.0,  color: Color.rgb(107, 107, 107) },
                             {$:"Stop", offset: 0.95, color: Color.black },
                         ]
			}
                 },
                 //firstRowPreviews (these are morphs)
             ]
            }
	]};

    var rowModel = Record.newPlainInstance({FirstRowStartY: 3});
    var rowMorph = new lively.demofx.WrapperMorph(firstRow, rowModel);
    container.addMorph(rowMorph);
    rowMorph.align(rowMorph.bounds().topCenter(), canvasMorph.bounds().bottomCenter());


    var effectNames = ["Blend", "Blur", "Motion Blur", "Bloom", "Glow", "Color Adjust"];
    var shortFileNames = ["flower.jpg", "flower.jpg", "flower-motion-blur.png",
	"flower-bloom.png", "flower-glow.png", "flower-color-adjust.png"];
    
    var gaussian = 
	rowMorph.addMorph(makePreview(new lively.scene.BlendEffect(1, "effect0"), 
				      effectNames[0], shortFileNames[0]));
    gaussian.translateBy(pt(10, 8)); 


    var previous = gaussian;
    var margin = 10;
    for (var i = 1; i < 6; i++) {

	var effect = null;
	if (i == 1) effect = new lively.scene.GaussianBlurEffect(i, "effect" + i);
	//URL.source.withFilename('Resources/demofx/water.jpg').toString())
	var preview = makePreview(effect, effectNames[i], shortFileNames[i]);
	//var preview2	= makePreview(new lively.scene.ColorAdjustEffect("previewColorAdjust"));
	//var preview2 = mak  ePreview(new lively.scene.SaturateEffect("preview2", 0.4));
	preview.align(preview.bounds().topLeft(), previous.bounds().topRight());
	rowMorph.addMorph(preview);
	preview.translateBy(pt(margin, 0));
	previous = preview;
    }


    var controlPlate = new BoxMorph(new Rectangle(0, 0, canvasWidth, 40));
    controlPlate.setFill(using(lively.paint).link(
        {$:"LinearGradient",
         startX: 0,
         startY: 0,
         endX: 0,
         endY: 1,
         stops: [ {$:"Stop", offset: 0.0,  color: Color.rgb(102, 102, 102) },
                  {$:"Stop", offset: 0.5,  color: Color.rgb(148, 148, 148) },
                  {$:"Stop", offset: 1.0,  color: Color.rgb(102, 102, 102) },
                ]
	 
        }));

    container.addMorph(controlPlate);
    controlPlate.align(controlPlate.bounds().topCenter(), rowMorph.bounds().bottomCenter());
    
    var sliderMorph = controlPlate.addMorph(new lively.demofx.Slider(sliderModel));
    sliderMorph.align(sliderMorph.bounds().topCenter(), controlPlate.shape.bounds().topCenter());
    sliderMorph.translateBy(pt(0, 10));
    
    var label = controlPlate.addMorph(new TextMorph(new Rectangle(0,0,0,0)).beLabel());
    label.setTextColor(Color.white);
    label.connectModel(sliderModel.newRelay({Text: "LabelValue"}), true);
    label.align(label.bounds().leftCenter(), sliderMorph.bounds().rightCenter());
    label.translateBy(pt(10, 0));




    lively.demofx.SceneMorph.subclass('lively.demofx.Footer', {
	content: {$:"Group",
		  content: [
		      {$:"Path", 
		       elements: [
                           {$:"MoveTo", x: 0, y: 0 },
                           {$:"LineTo", x: width, y: 0 },
                           {$:"LineTo", x: width, y: 27 },
                           {$:"QuadCurveTo", x: width - 3, y: 33, controlX: width, controlY: 33 },
			   {$:"QuadCurveTo", x: 3, y: 33, controlX: width / 2, controlY: 100 },
                           {$:"QuadCurveTo", x: 0, y: 30, controlX: 0, controlY: 33 }
		       ]
		      }
		  ]
		 }
    });

    var footer = container.addMorph(new lively.demofx.Footer(buttonModel));
    footer.align(footer.bounds().topCenter(), controlPlate.bounds().bottomCenter());




    var buttonModel = Record.newPlainInstance({GlowColor: null, GlowOpacity: 0});
    var button = new lively.demofx.Button(buttonModel, "Open Image 1");
    button.connectModel(buttonModel.newRelay({GlowColor: "+GlowColor", GlowOpacity: "+GlowOpacity"}));
    footer.addMorph(button);
    button.align(button.bounds().topLeft(), footer.shape.bounds().topLeft());
    button.translateBy(pt(20, 3));


    var knobMorph = footer.addMorph(new lively.demofx.Knob(canvasModel));
    knobMorph.align(knobMorph.bounds().topCenter(), footer.shape.bounds().topCenter());
    knobMorph.translateBy(pt(0, 5));
    knobMorph.connectModel(canvasModel.newRelay({_KnobValue: "+_KnobValue", 
						 KnobWidth: "-KnobWidth",
						 ImageRotation: "ImageRotation"}));

 
}.logErrors());