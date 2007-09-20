/**
 * Examples.js.  This file contains the sample morphs (mini-applications)
 * that will be included in the system when it starts. 
 */

// ===========================================================================
// Widget (panel) Tester Demo
// ===========================================================================

/**
 * @class WidgetTester
 * This class implements a panel with various sample widgets
 * such as buttons, sliders, etc.  
 */

WidgetTester = Class.extend(Model);

Object.extend(WidgetTester.prototype, {

    initialize: function() { 
        WidgetTester.superClass.initialize.call(this);
    },

    openIn: function(world, location) {
        var view = this.buildView(pt(300, 220));
        world.addMorphAt(view, location);
        return view;
    },
    
    buildView: function(extent) {
        var panel = PanelMorph(extent);
        // Make a fancy panel.  Note: Transparency does not
        // work with gradients or stipple patterns yet!
        panel.linkToStyles(['widgetPanel']);
        var model = new SimpleModel(null, 'Text', 'TextSel', 'ListItem', 'PrintValue', 'B1Value', 'B2Value', 'SliderValue', 'SliderExtent');
        panel.connectModel({model: model});
        var m; 

        // Two simple buttons, one toggles...
        panel.addMorph(m = ButtonMorph(Rectangle(20,20,50,20)));
        m.connectModel({model: model, getValue: "getB1Value", setValue: "setB1Value"});
        panel.addMorph(m = ButtonMorph(Rectangle(20,50,50,20)));
        m.connectModel({model: model, getValue: "getB1Value", setValue: "setB1Value"});
        m.setToggle(true);

        // Two buttons sharing same value...
        panel.addMorph(m = ButtonMorph(Rectangle(80,20,50,20)));
        m.connectModel({model: model, getValue: "getB2Value", setValue: "setB2Value"});
        panel.addMorph(m = ButtonMorph(Rectangle(80,50,50,20)));
        m.connectModel({model: model, getValue: "getB2Value", setValue: "setB2Value"});

        // Two lists sharing same selection...
        panel.addMorph(m = CheapListMorph(Rectangle(20,80,50,20),["one","two","three"]));
        m.connectModel({model: model, getSelection: "getListItem", setSelection: "setListItem"});
        panel.addMorph(m = CheapListMorph(Rectangle(80,80,50,20),["one","two","three"]));
        m.connectModel({model: model, getSelection: "getListItem", setSelection: "setListItem"});

        // Three text views sharing same text...
        panel.addMorph(m = TextMorph(Rectangle(140,20,140,20),"Hello World"));
        m.connectModel({model: model, getText: "getText", setText: "setText", setSelection: "setTextSel"});
        panel.addMorph(m = TextMorph(Rectangle(140,50,140,20),"Hello World"));
        m.connectModel({model: model, getText: "getText", setText: "setText", setSelection: "setTextSel"});
        panel.addMorph(m = TextMorph(Rectangle(140,80,140,20),"Hello World"));
        m.connectModel({model: model, getText: "getText", setText: "setText", setSelection: "setTextSel"});
        m.autoAccept = true;
        panel.addMorph(m = TextMorph(Rectangle(140,110,140,20),"selection"));
        m.connectModel({model: model, getText: "getTextSel"});
        model.SharedText = "Hello World";

        // Two linked print views sharing the same value
        panel.addMorph(m = PrintMorph(Rectangle(20,140,100,20),"3+4"));
        m.connectModel({model: model, getValue: "getPrintValue", setValue: "setPrintValue"});
        panel.addMorph(m = PrintMorph(Rectangle(20,170,100,20),"3+4"));
        m.connectModel({model: model, getValue: "getPrintValue", setValue: "setPrintValue"});

        // Slider linked to print view, with another for slider width
        panel.addMorph(m = PrintMorph(Rectangle(140,140,80,20),"0.5"));
        m.connectModel({model: model, getValue: "getSliderValue", setValue: "setSliderValue"});
        panel.addMorph(m = PrintMorph(Rectangle(230,140,50,20),"0.1"));
        m.connectModel({model: model, setValue: "setSliderExtent"});
        panel.addMorph(m = SliderMorph(Rectangle(140,170,140,20)));
        m.connectModel({model: model, getValue: "getSliderValue", setValue: "setSliderValue", getExtent: "getSliderExtent"});

        model.SliderValue = 0.2;
        model.SliderExtent = 0.1;
        
        return panel;
    }

});

// ===========================================================================
// The Clock example
// ===========================================================================

/**
 * @class ClockMorph
 */

ClockMorph = HostClass.create('ClockMorph', Morph);

Object.extend(ClockMorph.prototype, {

    defaultBorderWidth: 2,

    initialize: function(position, radius) {
        ClockMorph.superClass.initialize.call(this, position.asRectangle().expandBy(radius), "ellipse");
        this.openForDragAndDrop = false;
        this.linkToStyles(['clock']);
        this.makeNewFace();
        return this;
    },

/*
    copy: function() {
        var newClock = ClockMorph.superClass.copy.call(this);
        newClock.removeAllMorphs();
        newClock.makeNewFace();
        return newClock; 
    },
*/

    makeNewFace: function() {
        var bnds = this.shape.bounds();
        var radius = bnds.width/2;
        var labels = [];
        var fontSize = Math.max(Math.floor(0.04 * (bnds.width + bnds.height)),2);
        var labelSize = fontSize; // room to center with default inset

        for (var i = 0; i < 12; i++) {
            var labelPosition = bnds.center().addPt(Point.polar(radius*0.85,((i-3)/12)*Math.PI*2)).addXY(labelSize, 0);
            var label = TextMorph(pt(0,0).extent(pt(labelSize*3,labelSize)), 
            // (i>0 ? i : 12) + "");  // English numerals
            ['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'][i]); // Roman
            label.setWrapStyle(WrapStyle.SHRINK);
            label.setFontSize(fontSize);    label.setInset(pt(0,0));        
            label.setBorderWidth(0);        label.setFill(null);
            label.align(label.bounds().center(),labelPosition.addXY(-3,1));
            this.addMorph(label);
        }
    
        this.setNamedMorph("hours", Morph.makeLine([pt(0,0),pt(0,-radius*0.5)],4,Color.blue));
        this.setNamedMorph("minutes", Morph.makeLine([pt(0,0),pt(0,-radius*0.7)],3,Color.blue));
        this.setNamedMorph("seconds", Morph.makeLine([pt(0,0),pt(0,-radius*0.75)],2,Color.red));
    
        this.setHands();
        this.changed(); 
    },
    
    reshape: function(a,b,c,d) { /*no reshaping*/ },
    
    startSteppingScripts: function() {
        this.startStepping(1000, "setHands"); // once per second
    },

    setHands: function() {
        var currentDate = new Date();
        var center = this.shape.bounds().center();
        var second = currentDate.getSeconds();
        var minute = currentDate.getMinutes() + second/60;
        var hour = currentDate.getHours() + minute/60;
        this.getNamedMorph('hours').setRotation(hour/12*2*Math.PI);
        this.getNamedMorph('minutes').setRotation(minute/60*2*Math.PI);
        this.getNamedMorph('seconds').setRotation(second/60*2*Math.PI); 
    }
    
});

// ===========================================================================
// The Pen/Hilbert curve demo
// ===========================================================================

/**
 * @class Pen
 */
  
Pen = Class.create();

Object.extend(Pen.prototype, {

    initialize: function(loc) {
        this.location = (loc !== undefined) ? loc : WorldMorph.current().bounds().center();
        this.penWidth = 2;
        this.penColor = Color.blue;
        this.fillColor = null;
        this.heading = 0;
        this.newLine(this.location); 
    },
    
    setPenColor: function(color) { 
        this.penColor = color; 
    },
    
    setPenWidth: function(size) { 
        this.penWidth = size; 
    },
    
    turn: function(degrees) { 
        this.heading += degrees; 
    },
    
    go: function(dist) { 
        this.location = this.location.addPt(Point.polar(dist, this.heading.toRadians()));
        this.vertices.push(this.location); 
    },
    
    drawLines: function() {
        var morph = Morph(this.startingLocation.asRectangle(), "rect");
        var verts = Shape.translateVerticesBy(this.vertices, this.startingLocation.negated());
    
        if (this.fillColor) 
            morph.setShape(PolygonShape(verts, this.fillColor, this.penWidth, this.penColor));
        else 
            morph.setShape(PolylineShape(verts, this.penWidth, this.penColor));
    
        WorldMorph.current().addMorph(morph); 
    
        /* if (morph.world().backend()) 
        morph.world().backend().createMorph(morph.morphId(), morph, morph.world().morphId());*/

        return morph;
    },
    
    fillLines: function(color) { 
        this.fillColor = color; 
        return this.drawLines();
    },
    
    hilbert: function(n,s) {
        // Draw an nth level Hilbert curve with side length s.
        if (n == 0) 
            return this.turn(180);
    
        if (n > 0) { 
            var a = 90;  
            var m = n - 1; 
        } else { 
            var a = -90;  
            var m = n + 1; 
        }
        
        this.turn(a); 
        this.hilbert(0 - m, s);
        this.turn(a); 
        this.go(s); 
        this.hilbert(m, s);
        this.turn(0 - a); 
        this.go(s); 
        this.turn(0 - a); 
        this.hilbert(m, s);
        this.go(s); 
        this.turn(a); 
        this.hilbert(0 - m, s);
        this.turn(a); 
    },
    
    filbert: function(n, s, color) {
        // Two Hilbert curves form a Hilbert tile
        this.newLine();  
        this.setPenColor(Color.black); 
        this.setPenWidth(1);
        this.hilbert(n, s); 
        this.go(s);
        this.hilbert(n, s); 
        this.go(s);
        return this.fillLines(color); 
    },
    
    newLine: function(loc) {
        this.startingLocation = loc ? loc : this.location;
        this.vertices = [ this.startingLocation ];
    },
    
    filberts: function(n, s) {
        // Four interlocking filberts
        var n2 = Math.pow(2,n-1);
        var morphs = [ ];
    
        for (var i = 0; i < 4; i++) {
            morphs.push(this.filbert(n, s, Color.wheel(4)[i]));
            this.go((n2 - 1)*s); 
            this.turn(-90); 
            this.go(n2 * s); 
            this.turn(180);
        }

        return morphs; 
    }
    
});

// The menu-driven filled Hilbert curve demo
Pen.hilbertFun = function(world) {
    var logoMenu = MenuMorph([]);

    for (var i=0; i<=5; i++) {
        logoMenu.addItem([i.toString(), logoMenu, "makeLogo", i]);
    }

    logoMenu.makeLogo = function(order) {
        if (this.morphs) for (var i=0; i<4; i++) this.morphs[i].remove();
        if (i=0) { this.morphs == null; return; }
        var P = new Pen();
        this.morphs = P.filberts(order,5);
    };

    logoMenu.openIn(world, pt(380, 380), true, "Hilbert Fun");
}

// The default script for the Pen/Hilbert demo
Pen.script = ["P = new Pen();",
"P.setPenColor(Color.red);",
"for(var i=1; i<=40; i++)",
"	{ P.go(2*i); P.turn(89); };",
"P.drawLines();",
""].join("\n");

// ===========================================================================
// The Doodle Draw Example
// ===========================================================================

/**
 * @class DoodleMorph
 */

DoodleMorph = HostClass.create('DoodleMorph', ClipMorph);

Object.extend(DoodleMorph.prototype, {

    defaultBorderWidth: 0,
    defaultFill: Color.veryLightGray,
    imagepath: "Resources/doodle/",

    initialize: function(rect) {
        DoodleMorph.superClass.initialize.call(this, rect, "rect");
        this.drawingColor = Color.red;
        this.lineWidth = 2.0;
        
        // The doodle that we are creating currently
        this.currentMorph = null;
        this.start = null;

        const iconSize = 40;
        console.log("Images from " + this.imagepath + "line.png");
        var r = Rectangle(0, 0, iconSize, iconSize);
        this.linebutton = new ImageButtonMorph(r, this.imagepath + "line.png", this.imagepath + "line_down.png");
        var r = Rectangle(0, iconSize, iconSize, iconSize);
        this.rectbutton = new ImageButtonMorph(r, this.imagepath + "rectangle.png", this.imagepath + "rectangle_down.png");
        var r = Rectangle(0, iconSize*2, iconSize, iconSize);
        this.circlebutton = new ImageButtonMorph(r, this.imagepath + "circle.png", this.imagepath + "circle_down.png");
        var r = Rectangle(0, iconSize*3, iconSize, iconSize);
        this.widthbutton = new ImageButtonMorph(r, this.imagepath + "lines.png", this.imagepath + "lines_down.png");
        var r = Rectangle(0, iconSize*4, iconSize, iconSize);
        this.colorsbutton = new ImageButtonMorph(r, this.imagepath + "colors.png", this.imagepath + "colors_down.png");
        var r = Rectangle(0, iconSize*5, iconSize, iconSize);
        this.stylebutton = new ImageButtonMorph(r, this.imagepath + "style.png", this.imagepath + "style_down.png");

        this.linebutton.onMouseUp = function(evt) {
            var newValue = this.isToggle() ? !this.getValue() : false;
            this.changeAppearanceFor(newValue); 
        };
        this.linebutton.connectModel({model: this, setValue: "addLine"});
        this.addMorph(this.linebutton);

        this.rectbutton.onMouseUp = function(evt) {
            var newValue = this.isToggle() ? !this.getValue() : false;
           this.changeAppearanceFor(newValue); 
        };
        this.rectbutton.connectModel({model: this, setValue: "addRect"});
        this.addMorph(this.rectbutton);

        this.circlebutton.onMouseUp = function(evt) {
            var newValue = this.isToggle() ? !this.getValue() : false;
            this.changeAppearanceFor(newValue); 
        };
        this.circlebutton.connectModel({model: this, setValue: "addCirc"});
        this.addMorph(this.circlebutton);
                
        this.widthbutton.onMouseUp = function(evt) {
            var newValue = this.toggles ? !this.getValue() : false;
            this.changeAppearanceFor(newValue); 
        };
        this.widthbutton.connectModel({model: this, setValue: "setLine"});
        this.addMorph(this.widthbutton);

        this.colorsbutton.setToggle(true);
        this.colorsbutton.connectModel({model: this, setValue: "setColor", getValue: "getColor"});
        this.addMorph(this.colorsbutton);

        this.stylebutton.onMouseUp = function(evt) {
            var newValue = this.isToggle() ? !this.getValue() : false;
            this.changeAppearanceFor(newValue); 
        };
        this.stylebutton.connectModel({model: this, setValue: "setStyle"});
        this.addMorph(this.stylebutton);

        // Position for new objects created from menus
        this.newPos = 25;

        return this;
    },
    
    onMouseMove: function(evt) {
    },

    onMouseUp: function(evt) {
        evt.hand.setFill(Color.primary.blue); 
    },

    mouseEvent: function(evt, hasFocus) {
	if (hasFocus && evt.hand.mouseFocus !== this) return;
	if (evt.type == "mousedown" && this.onMouseDown(evt)) return; 
        DoodleMorph.superClass.mouseEvent.call(this, evt, hasFocus); 
    },

    onMouseDown: function(evt) { // Default behavior is to grab a submorph
        this.openForDragAndDrop = true;
        var m = this.morphToReceiveEvent(evt);
        if (m == null || m == this) { this.makeSelection(evt); return true; }
        if (m.handlesMouseDown(evt)) return false;
        evt.hand.grabMorph(m, evt);
        return true; 
    },

    handlesMouseDown: function() { return true; },

    makeSelection: function(evt) { // Default behavior is to grab a submorph
        if (this.currentSelection != null) this.currentSelection.removeOnlyIt();
        if ( !evt.hand.mouseButtonPressed ) return;
        var m = SelectionMorph(evt.mousePoint.extent(pt(5,5)), this);
        m.shape.setAttributeNS(null, "stroke-dasharray", "3,2");
        this.addMorph(m);
        this.currentSelection = m;
        var handle = HandleMorph(evt.mousePoint, "rect", evt.hand, m, "bottomRight");
        m.addMorph(handle);
        handle.setBounds(handle.bounds().center().asRectangle());
        if (evt.hand.mouseFocus instanceof HandleMorph) evt.hand.mouseFocus.remove();
        evt.hand.setMouseFocus(handle);
    },    

    // Add menu items for creating rectangles and ellipses
    morphMenu: function(evt) {
        var menu = DoodleMorph.superClass.morphMenu.call(this, evt);
        menu.addLine();
        menu.addItem(["add rectangle", this, 'addRect']);
        menu.addItem(["add ellipse",   this, 'addCircle']);
        return menu;
    },

    addLine: function() {
        var morph = Morph(Rectangle(this.newPos * 2, this.newPos, 60, 20), 'rect');
        morph.setFill(null);
        morph.setBorderWidth(this.lineWidth);
        morph.setBorderColor(this.drawingColor);
        morph.setShape(PolylineShape([pt(0,20),pt(60,0)], this.lineWidth, this.drawingColor));
        this.addMorph(morph);

        this.newPos += 25;
        if (this.newPos > 125) this.newPos = 25;            
    },

    addRect: function() {
        var morph = Morph(Rectangle(this.newPos * 2, this.newPos, 60, 20), 'rect');
        morph.setFill(this.fillColor);
        morph.setBorderWidth(this.lineWidth);
        morph.setBorderColor(this.drawingColor);
        this.addMorph(morph);

        this.newPos += 25;
        if (this.newPos > 125) this.newPos = 25;            
    },
    
    addCirc: function() {
        var morph = Morph(Rectangle(this.newPos * 2, this.newPos, 60, 20), 'ellipse');
        morph.setFill(this.fillColor);
        morph.setBorderWidth(this.lineWidth);
        morph.setBorderColor(this.drawingColor);
        this.addMorph(morph);

        this.newPos += 25;
        if (this.newPos > 125) this.newPos = 25;            
    },
    
    setColor: function(val) {
        this.colorvalue = val;
        if ( !this.colorvalue ) { // false
            this.colorMorph.remove();
            return;
        }
        if ( this.colorMorph != null ) {
            if ( this.colorMorph.position() != this.colorsbutton.bounds().topRight().subPt(pt(0,20)) ) {
                this.colorMorph.setPosition(this.colorsbutton.bounds().topRight().subPt(pt(0,20)));
            }
            this.addMorph(this.colorMorph);
            return;
        }
  
        this.colorMorph = Morph(Rectangle(0, 0, 100, 110));
        this.colorMorph.shape.roundEdgesBy(10);
        this.colorMorph.setFill(Color.white);
        this.colorMorph.shape.setFillOpacity(.7);

        var m = TextMorph(Rectangle(-45, -50, 80, 20), "Border color");
        m.relayMouseEvents(this.colorMorph, {onMouseDown: "onMouseDown", onMouseUp: "onMouseUp"});
        m.setBorderWidth(0);
        m.shape.roundEdgesBy(10);
        m.shape.setFillOpacity(0);
        this.colorMorph.addMorph(m);
        m = TextMorph(Rectangle(-45, 0, 80, 20), "Fill color");
        m.relayMouseEvents(this.colorMorph, {onMouseDown: "onMouseDown", onMouseUp: "onMouseUp"});
        m.setBorderWidth(0);
        m.shape.roundEdgesBy(10);
        m.shape.setFillOpacity(0);
        this.colorMorph.addMorph(m);

        this.colorpicker = ColorPickerMorph(Rectangle(-45, -30, 50, 30));
        this.colorMorph.addMorph(this.colorpicker);
        this.fillpicker = ColorPickerMorph(Rectangle(-45, 20, 50, 30));
        this.colorMorph.addMorph(this.fillpicker);

        this.colorMorph.borderRect = Morph(Rectangle(15, -30, 30, 30), 'ellipse');
        this.colorMorph.borderRect.setFill(this.drawingColor);
        this.colorMorph.addMorph(this.colorMorph.borderRect);
        this.colorMorph.fillRect = Morph(Rectangle(15, 20, 30, 30), 'ellipse');
        this.colorMorph.fillRect.setFill(this.fillColor);
        this.colorMorph.addMorph(this.colorMorph.fillRect);

        this.colorMorph.moveBy(this.colorsbutton.bounds().topRight().subPt(pt(0,20)));
        this.addMorph(this.colorMorph);
        this.colorpicker.connectModel({model: this, setColor: "setColoring"});
        this.fillpicker.connectModel({model: this, setColor: "setFillColor"});
    },
    
    getColor: function() {
        return this.colorvalue;
    },
    
    setColoring: function(color) {
        this.drawingColor = color;
        this.colorMorph.borderRect.setFill(this.drawingColor);
        if ( this.currentSelection != null ) {
            this.currentSelection.setBorderColor(this.drawingColor);
        }
    },

    setFillColor: function(color) {
        this.fillColor = color;
        this.colorMorph.fillRect.setFill(this.fillColor);
        if ( this.currentSelection != null ) {
            this.currentSelection.setFill(this.fillColor);
        }

    },

    setLine: function() {
        var items = [
            ["No borders", this, "setLineWidth", 0],
            ["1", this, "setLineWidth", 1],
            ["2", this, "setLineWidth", 2],
            ["3", this, "setLineWidth", 3],
            ["4", this, "setLineWidth", 4],
            ["5", this, "setLineWidth", 5],
            ["10", this, "setLineWidth", 10],
            ["15", this, "setLineWidth", 15],
        ];
        MenuMorph(items, this).openIn(this.world(), this.worldPoint(this.widthbutton.bounds().topRight()));//evt.mousePoint);
    }, 
    
    setLineWidth: function (newWidth) {
        this.lineWidth = newWidth;
        if ( this.currentSelection != null ) {
            this.currentSelection.setBorderWidth(this.lineWidth);
        }
    },
    
    setStyle: function() {
        if (this.currentSelection != null) {
            new StylePanel(this.currentSelection).open();
        }
    },
    
    // TODO probably totally irrelevant since we're not using selection mode any more
    setSelectionMode: function (val, v) {
        this.value = val;
    },
    
    getSelectionMode: function () {
        return this.value;
    }
        
});

// Namespace for applications
var apps = {};

// ===========================================================================
// The 3D Rotation Example
// ===========================================================================

/*==============================================================================
 * ThreeDeeDemo.js -- 3D object rotation demo
 * Based on C code written originally in the 1980s
 * and a Java version written in 1998.
 *============================================================================*/

apps.threedee = function() {

    // Rapid sin and cos functions inherited from the original
    // C program.  Note that you must supply a multiplier in 
    // addition to the (decimal) angle parameter,
    // or otherwise the result is always 0 or 1.

    // Tables for rapid sin calculation
    var upper = new Array( 
        0, 3050, 5582, 6159, 1627, 5440, 7578, 3703, 3659, 9461, 2993, 
        4887, 226, 7813, 8902, 7469, 6260, 1054, 5473, 6862, 3701, 5349, 
        4523, 978, 9455, 9604, 1604, 2008, 6059, 6048, 1, 3990, 6695, 
        1275, 6679, 8431, 4456, 4841, 6329, 3241, 3302, 5690, 1901, 860, 
        2796, 5741, 9414, 4187, 3469, 1923, 4309, 2870, 6152, 3863, 5473, 
        5603, 6047, 3457, 1412, 5011, 2521, 5462, 3319, 1496, 3801, 4411, 
        3244, 4157, 7398, 6297, 5625, 538, 5266, 8623, 8015, 652, 7317, 
        9010, 5819, 374, 7325, 5375, 5393, 5859, 1997, 6283, 819, 2186, 
        3281, 6565, 1
    ); 

    var lower = new Array(
        1, 174761, 159945, 117682, 23324, 62417, 72497, 30385, 26291, 60479, 
        17236, 25612, 1087, 34732, 36797, 28858, 22711, 3605, 17711, 21077, 
        10821, 14926, 12074, 2503, 23246, 22725, 3659, 4423, 12906, 12475, 2, 
        7747, 12634, 2341, 11944, 14699, 7581, 8044, 10280, 5150, 5137, 8673, 
        2841, 1261, 4025, 8119, 13087, 5725, 4668, 2548, 5625, 3693, 7807, 4837, 
        6765, 6840, 7294, 4122, 1665, 5846, 2911, 6245, 3759, 1679, 4229, 4867, 
        3551, 4516, 7979, 6745, 5986, 569, 5537, 9017, 8338, 675, 7541, 9247, 
        5949, 381, 7438, 5442, 5446, 5903, 2008, 6307, 821, 2189, 
        3283, 6566, 1
    );

    function rapidSin90(multiplier, sin) {
        return Math.round(multiplier * upper[sin] / lower[sin]);
    }

    function rapidSin(multiplier, sin) {

        while (sin < 0) sin += 360; // Can be slow...
        sin %= 360;

        if (sin <=  90) return rapidSin90(multiplier, sin);
        if (sin <= 180) return rapidSin90(multiplier, 180-sin);
        if (sin <= 270) return -rapidSin90(multiplier, sin-180);
        return -rapidSin90(multiplier, 360-sin);
    }
    
    function rapidCos(multiplier, cos) {
        return rapidSin(multiplier, cos+90);
    }

/*==============================================================================
 * Constants for the 3D viewer
 *============================================================================*/

    // center: Used for storing the center coordinates
    // of our physical drawing plane (window).
    var center = pt(90, 100); // Math.round(window.width / 2), Math.round(window.height / 2);

    // planeDist: The 2D projection plane distance from origo
    var planeDist = -180;

    // clipPlane: Object move limit (to avoid clipping problems)
    var clipPlane = -5750;

/*==============================================================================
 * 3D object definition (the object to be rotated/displayed)
 *============================================================================*/

    // points3D: The endpoints of the wireframe image
    // Define "Sun rose" as a wireframe image
    var points3D  = [
    [750, 200, 0], 
    [553, 234, 0],
    [380, 334, 0],
    [252, 487, 0],
    [183, 675, 0],
    [175, 2700, 0],
    [650, 2700, 0],
    [650, 775, 0],
    [850, 775, 0],
    [850, 2700, 0],
    [1325, 2700, 0],
    [1316, 675, 0],
    [1248, 487, 0],
    [1119, 334, 0],
    [946, 234, 0],
    [750, 200, 0],

    [2150, 2700, 0],
    [1953, 2665, 0],
    [1780, 2565, 0],
    [1652, 2412, 0],
    [1583, 2225, 0],
    [1575, 200, 0],
    [2050, 200, 0],
    [2050, 2125, 0],
    [2250, 2125, 0],
    [2250, 200, 0],
    [2725, 200, 0],
    [2716, 2225, 0],
    [2648, 2412, 0],
    [2519, 2565, 0],
    [2346, 2665, 0],
    [2150, 2700, 0],

    [-200, 750, 0],
    [-234, 553, 0],
    [-334, 380, 0],
    [-487, 252, 0],
    [-675, 184, 0],
    [-2700, 175, 0],
    [-2700, 650, 0],
    [-775, 650, 0],
    [-775, 850, 0],
    [-2700, 850, 0],
    [-2700, 1325, 0],
    [-675, 1316, 0],
    [-487, 1248, 0],
    [-334, 1119, 0],
    [-234, 946, 0],
    [-200, 750, 0],

    [-2700, 2150, 0],
    [-2665, 1953, 0],
    [-2565, 1780, 0],
    [-2412, 1652, 0],
    [-2225, 1583, 0],
    [-200, 1575, 0],
    [-200, 2050, 0],
    [-2125, 2050, 0],
    [-2125, 2250, 0],
    [-200, 2250, 0],
    [-200, 2725, 0],
    [-2225, 2716, 0],
    [-2412, 2648, 0],
    [-2565, 2519, 0],
    [-2665, 2346, 0],
    [-2700, 2150, 0],

    [-2150, -2700, 0],
    [-2346, -2665, 0],
    [-2519, -2565, 0],
    [-2648, -2412, 0],
    [-2716, -2225, 0],
    [-2725, -200, 0],
    [-2250, -200, 0],
    [-2250, -2125, 0],
    [-2050, -2125, 0],
    [-2050, -200, 0],
    [-1575, -200, 0],
    [-1583, -2225, 0],
    [-1652, -2412, 0],
    [-1780, -2565, 0],
    [-1953, -2665, 0],
    [-2150, -2700, 0],

    [-750, -200, 0],
    [-946, -235, 0],
    [-1119, -335, 0],
    [-1248, -488, 0],
    [-1316, -675, 0],
    [-1325, -2700, 0],
    [-850, -2700, 0],
    [-850, -775, 0],
    [-650, -775, 0],
    [-650, -2700, 0],
    [-175, -2700, 0],
    [-183, -675, 0],
    [-252, -488, 0],
    [-380, -335, 0],
    [-553, -235, 0],
    [-750, -200, 0],

    [2700, -2150, 0],
    [2665, -2346, 0],
    [2565, -2519, 0],
    [2412, -2648, 0],
    [2225, -2716, 0],
    [200, -2725, 0],
    [200, -2250, 0],
    [2125, -2250, 0],
    [2125, -2050, 0],
    [200, -2050, 0],
    [200, -1575, 0],
    [2225, -1583, 0],
    [2412, -1652, 0],
    [2565, -1780, 0],
    [2665, -1953, 0],
    [2700, -2150, 0],

    [200, -750, 0],
    [235, -946, 0],
    [335, -1119, 0],
    [488, -1248, 0],
    [675, -1316, 0],
    [2700, -1325, 0],
    [2700, -850, 0],
    [775, -850, 0],
    [775, -650, 0],
    [2700, -650, 0],
    [2700, -175, 0],
    [675, -184, 0],
    [488, -252, 0],
    [335, -380, 0],
    [235, -553, 0],
    [200, -750, 0],

    [0, 0, 0],
    [0, 0, 2000]
];

/*==============================================================================
 * WireObject instance constructor
 *============================================================================*/

WireObject = Class.create();

Object.extend(WireObject.prototype, {
    // WireObject constructor: create the wireframe object
    initialize: function(hereX, hereY, hereZ) {

        // Set the location of the object
        this.x = hereX;
        this.y = hereY;
        this.z = hereZ;

        // Allocate arrays for storing the individual point
        // projection coordinates of the object
        this.px = [];
        this.py = [];
        this.pz = [];

        // Initialize the 3D projection vector
        for (var i = 0; i < points3D.length; i++) {
            this.px[i] = points3D[i][0];
            this.py[i] = points3D[i][1];
            this.pz[i] = points3D[i][2];
        }
                
        // Create the 2D projection (view) vector
        this.vx = [];
        this.vy = [];

    },
    
    /*==============================================================================
     * WireObject instance rotation and projection methods
     *============================================================================*/

    // Function WireObject.rotate: rotate the object by the given angle
    // (angles are expressed in decimal degrees, i.e., full circle = 360)
    rotate: function(angleX, angleY, angleZ) {

        var limit = points3D.length;
        
        for (var i = 0; i < limit; i++) {
            var rx = points3D[i][0];
            var ry = points3D[i][1];
            var rz = points3D[i][2];
    
            // Rotate around X axis
            if (angleX != 0) {
                var nry = ry;
                ry = rapidCos(ry, angleX) -
                    rapidSin(rz, angleX);
                rz = rapidSin(nry, angleX) +
                    rapidCos(rz, angleX);
            }
            
            // Rotate around Y axis
            if (angleY != 0) {
                var nrx = rx;
                rx = rapidCos(rx, angleY) -
                    rapidSin(rz, angleY);
                rz = rapidSin(nrx, angleY) +
                    rapidCos(rz, angleY);
            }
    
            // Rotate around Z axis
            if (angleZ != 0) {
                var nrx = rx;
                rx = rapidCos(rx, angleZ) -
                    rapidSin(ry, angleZ);
                ry = rapidSin(nrx, angleZ) +
                    rapidCos(ry, angleZ);
            }
            
            this.px[i] = rx;
            this.py[i] = ry;
            this.pz[i] = rz;
        }
    },
      
    // Function WireObject.project: calculate a 2D projection
    // for the wireframe object based on the camera coordinates
    project: function(cameraX, cameraY, cameraZ) {
        var sx, sy, sz;
        var cx, cy;
        
        var limit = points3D.length;
        for (var i = 0; i < limit; i++) {
            sx = this.x + this.px[i] + cameraX;
            sy = this.y + this.py[i] + cameraY;
            sz = this.z + this.pz[i] + cameraZ;
            
            // Calculate perspective projection
            cx = Math.round(sx * planeDist / sz);
            cy = Math.round(sy * planeDist / sz);
            
            // Note: for parallel (non-perspective) projection,
            // replace 'cx' and 'cy' below with 'sx' and 'sy'
            this.vx[i] = center.x  + cx;
            this.vy[i] = center.y - cy;
        }
    },

    // Function WireObject.display: display the 2D projection of the object
    display: function(morphArray) {
    
        // NOTE: Sun Logo consists of eight U's
        // Because we cannot use different colors
        // for drawing the different line segments,
        // we draw the logo as eight separate polyline
        // morphs, all generated from the same projection
        // vector.
    
        var U = 0;
    
        for (var i = 0; i < 8; i++) { 
            var shape = PolygonShape([pt(this.vx[U],this.vy[U])], Color.primary.blue, 2, Color.black);
            shape.setLineJoin(Shape.LineJoins.ROUND);
            morphArray[i].setShape(shape);
            // shape.setFill(new Color(0xAA, 0, 0xCC)); // Approximate Sun purple color

            var verts = shape.vertices();
        
            // Note: Loop starts from 1 intentionally!
            for (var j = 1; j < 16; j++) {
                var thisPt = pt(this.vx[U+j], this.vy[U+j]);
                verts.push(thisPt);
            }
            shape.setVertices(verts);
        
            // Proceed to the next Sun U
            U += 16;
        }
    },

    // Function paint(): (Re)paint the 3D view
    paint: function(morphArray, angleX, angleY, angleZ) {
        this.rotate(angleX, angleY, angleZ);
        this.project(0, 0, 0);
        this.display(morphArray);
    }

});
    // module exports
    return { WireObject: WireObject }

}(); // end of the 3D demo module

/**
 * @class Sun3DMorph
 */
  
Sun3DMorph = HostClass.create('Sun3DMorph', ClipMorph);

Object.extend(Sun3DMorph.prototype, {

    defaultFill: Color.veryLightGray,
    
    initialize: function(rect) {

        Sun3DMorph.superClass.initialize.call(this, rect, "rect");

        this.shape.setFillOpacity(0.2);        

        // Create a bunch of polyline objects for drawing the Sun U's 
        this.morphArray = [];
        for (var i = 0; i < 8; i++) {
            this.morphArray[i] = Morph(pt(10,10).asRectangle());
            this.morphArray[i].setShape(PolylineShape([pt(0,0)], 2, Color.red));
            this.addMorph(this.morphArray[i]);
        }

        this.wireObject = new apps.threedee.WireObject(0,  0, -6000);
        this.wireObject.paint(this.morphArray, 0, 0, 0);

        return this;
    },

    onMouseMove: function(evt) {

        var angleY = -evt.mousePoint.x;
        var angleX = -evt.mousePoint.y;
        this.wireObject.paint(this.morphArray, angleX, angleY, 0);
    
        return true;
    }

});

// ===========================================================================
// The Asteroids Game Example
// ===========================================================================

// The JavaScript implementation of the Asteroids game
// is derived from a Java applet written and copyrighted
// by Mike Hall in 1998

// Note: The code below has been translated from the original
// Java implementation (and it still shows...)

// FIXME: There are still problems with the coordinate space.
// For instance, shooting is not as precise as in the original game.

/*****************************************************************************

  Asteroids.js

  Keyboard Controls:

  S            - Start Game    P           - Pause Game
  Cursor Left  - Rotate Left   Cursor Up   - Fire Thrusters
  Cursor Right - Rotate Right  Cursor Down - Fire Retro Thrusters
  Spacebar     - Fire Cannon   H           - Hyperspace
  M            - Toggle Sound  D           - Toggle Graphics Detail

*****************************************************************************/

apps.asteroids = function() {

// The game instance
var gameMorph = null;
    
/* Graphics parameters */

// Dimensions of the graphics area (should be based on the size of the window)
var gameWidth  = 600;
var gameHeight = 300;

/************************************************************************************************
  The AsteroidsSprite class defines a game object, including it's shape, position, movement and
  rotation. It also can detemine if two objects collide.
************************************************************************************************/

AsteroidsSprite = Class.create();

Object.extend(AsteroidsSprite.prototype, {
    /* boolean */ active: false,    // Active flag.
    /* double */  angle: 0,         // Current angle of rotation.
    /* double */  deltaAngle:  0,   // Amount to change the rotation angle.
    /* double */  currentX: 0,      // Current position on screen.
    /* double */  currentY: 0,
    /* double */  deltaX: 0,        // Amount to change the screen position.
    /* double */  deltaY: 0,
    /* Point[] */ shape: null,  // Initial sprite shape, centered at the origin (0,0).
    /* PolygonShape */ sprite: null, // Final location and shape of sprite after applying rotation and
    // moving to screen position. Used for drawing on the screen and
    // in detecting collisions.
    // Morphic-specific data
    morph: null,
    morphShape: null,

    initialize: function(vertices) {
        this.shape = vertices;
        this.sprite = PolygonShape([], Color.black, 1, Color.yellow);
    },
    
    // Methods:

    advance: function() {
        // Update the rotation and position of the sprite based on the delta values. If the sprite
        // moves off the edge of the screen, it is wrapped around to the other side.

        this.angle += this.deltaAngle;
        if (this.angle < 0)
            this.angle += 2 * Math.PI;
        if (this.angle > 2 * Math.PI)
            this.angle -= 2 * Math.PI;
        this.currentX += this.deltaX;
        if (this.currentX < -gameWidth / 2)
            this.currentX += gameWidth;
        if (this.currentX > gameWidth / 2)
            this.currentX -= gameWidth;
        this.currentY -= this.deltaY;
        if (this.currentY < -gameHeight / 2)
            this.currentY += gameHeight;
        if (this.currentY > gameHeight / 2)
            this.currentY -= gameHeight;
    },
    
    render: function() {
        // Render the sprite's shape and location by rotating its base shape
        // and moving it to its proper screen position.

        var matrix = Transform.createSimilitude(pt(this.currentX + gameWidth/2, this.currentY + gameHeight/2), -this.angle, 1).matrix;

        this.sprite.setVertices(this.shape.map(function(v) { return v.matrixTransform(matrix)}));
        // Create a new morph based on the sprite
        this.morph = this.createMorph(this.sprite);
    },
    
    isColliding: function(/* AsteroidsSprite */ s) {
        // Determine if one sprite overlaps with another, i.e., if any vertice
        // of one sprite lands inside the other.

        var mine = this.sprite.vertices();
        var other = s.sprite.vertices();
        for (var i = 0; i < other.length; i++)
            if (this.sprite.containsPoint(other[i]))
                return true;
        for (var i = 0; i < mine.length; i++)
            if (s.sprite.containsPoint(mine[i]))
                return true;
        return false;
    },

    createMorph: function(sprite) {
        // This function creates a Morph out of a game polygon/sprite
        var verts = sprite.vertices();
        if (verts.length > 0) {
            var morph;
            // This is inefficient: We should reuse the shape instead of creating a new one
            if (this.morph) {
                morph = this.morph; 
                morph.setPosition(verts[0]);
                morph.setShape(sprite);
            } else {
                morph = Morph(verts[0].extent(pt(20, 20)), "rect");
                morph.setShape(sprite);
                gameMorph.addMorph(morph);
            }
            return morph;
        } else {
            return null;
        }
    }

});

/************************************************************************************************
  Main application code -- constants and variables
************************************************************************************************/

  // Constants

  /* static final int */ var SHORTDELAY = 50;         // Milliseconds between screen updates.
  /* static final int */ var LONGDELAY = 1000;        // Longer delay when the game is collapsed.
  /* static final int */ var DELAY = -1;              // Milliseconds between screen updates.


  /* static final int */ var MAX_SHIPS = 3;           // Starting number of ships per game.

  /* static final int */ var MAX_SHOTS =  6;          // Maximum number of sprites for photons,
  /* static final int */ var MAX_ROCKS =  8;          // asteroids and explosions.
  /* static final int */ var MAX_SCRAP = 20;

  /* static final int */ var SCRAP_COUNT = 30;        // Counter starting values.
  /* static final int */ var HYPER_COUNT = 60;
  /* static final int */ var STORM_PAUSE = 30;
  /* static final int */ var UFO_PASSES  =  3;

  /* static final int */ var MIN_ROCK_SIDES =  8;     // Asteroid shape and size ranges.
  /* static final int */ var MAX_ROCK_SIDES = 12;
  /* static final int */ var MIN_ROCK_SIZE  = 15;     // Used to be 20
  /* static final int */ var MAX_ROCK_SIZE  = 30;     // Used to be 40
  /* static final int */ var MIN_ROCK_SPEED =  2;
  /* static final int */ var MAX_ROCK_SPEED = 12;

  /* static final int */ var BIG_POINTS    =  25;     // Points for shooting different objects.
  /* static final int */ var SMALL_POINTS  =  50;
  /* static final int */ var UFO_POINTS    = 250;
  /* static final int */ var MISSILE_POINTS = 500;

  /* static final int */ var NEW_SHIP_POINTS = 5000;  // Number of points needed to earn a new ship.
  /* static final int */ var NEW_UFO_POINTS  = 2750;  // Number of points between flying saucers.

  // Background stars.

  /* int */ var numStars = 0;
  /* Point[] */ stars = [];

  // Game data.

  /* int */ var score = 0;
  /* int */ var highScore = 0;
  /* int */ var newShipScore = 0;
  /* int */ var newUfoScore = 0;

  /* boolean */ var loaded = false;
  /* boolean */ var paused = false;
  /* boolean */ var playing = false;
  /* boolean */ var sound = false;
  /* boolean */ var detail = false;

  // Key flags.

  /* boolean */ var left  = false;
  /* boolean */ var right = false;
  /* boolean */ var up    = false;
  /* boolean */ var down  = false;

  // Sprite objects.

  /* AsteroidsSprite */   var ship = null;
  /* AsteroidsSprite */   var ufo = null;
  /* AsteroidsSprite */   var missile = null;
  /* AsteroidsSprite[] */ var photons    = []; /* new AsteroidsSprite[MAX_SHOTS]; */
  /* AsteroidsSprite[] */ var asteroids  = []; /* new AsteroidsSprite[MAX_ROCKS]; */
  /* AsteroidsSprite[] */ var explosions = []; /* new AsteroidsSprite[MAX_SCRAP]; */

  // Ship data.

  /* int */ var shipsLeft = 0;       // Number of ships left to play, including current one.
  /* int */ var shipCounter = 0;     // Time counter for ship explosion.
  /* int */ var hyperCounter = 0;    // Time counter for hyperspace.

  // Photon data.

  /* int[] */ var photonCounter = []; /* new int[MAX_SHOTS]; */ // Time counter for life of a photon.
  /* int   */ var photonIndex = 0;                              // Next available photon sprite.

  // Flying saucer data.

  /* int */ var ufoPassesLeft = 0;    // Number of flying saucer passes.
  /* int */ var ufoCounter = 0;       // Time counter for each pass.

  // Missile data.

  /* int */ var missileCounter;       // Counter for life of missile.

  // Asteroid data.

  /* boolean[] */ var asteroidIsSmall = [] /* new boolean[MAX_ROCKS]; */ // Asteroid size flag.
  /* int       */ var asteroidsCounter = 0;                              // Break-time counter.
  /* int       */ var asteroidsSpeed = 0;                                // Asteroid speed.
  /* int       */ var asteroidsLeft = 0;                                 // Number of active asteroids.

  // Explosion data.

  /* int[] */ var explosionCounter = []; /* new int[MAX_SCRAP]; */ // Time counters for explosions.
  /* int   */ var explosionIndex = 0;                              // Next available explosion sprite.

  // Sound clips.
  // NOTE: Audio is not supported yet in the JavaScript version
  /* AudioClip */ var crashSound = null;
  /* AudioClip */ var explosionSound = null;
  /* AudioClip */ var fireSound = null;
  /* AudioClip */ var missileSound = null;
  /* AudioClip */ var saucerSound = null;
  /* AudioClip */ var thrustersSound = null;
  /* AudioClip */ var warpSound = null;

  // Flags for looping sound clips.

  /* boolean */ var thrustersPlaying = false;
  /* boolean */ var saucerPlaying = false;
  /* boolean */ var missilePlaying = false;

  // Values for the offscreen image.

  /* Dimension */ var offDimension = null;
  /* Image */     var offImage = null;
  /* Graphics */  var offGraphics = null;

  // Font data.
  /* NOTE: Fonts are not supported yet in the JavaScript version
  Font font = new Font("Helvetica", Font.BOLD, 12);
  FontMetrics fm;
  */
  
  var text_score = null;
  var text_ships = null;
  var text_high  = null;
  var text_name  = null;
  var text_info  = null;
  
  var fontWidth = 16;
  var fontHeight = 16; // getStringHeight("X");

/************************************************************************************************
  Main application code -- Methods.
************************************************************************************************/

  // Application initialization
  function initAsteroidsGame() {

      // Generate starry background.
      initBackground();
      
      // Show score, opening texts, etc.
      showTextStrings();
      
      // Create shape for the ship sprite.
      
      ship = new AsteroidsSprite([pt(0, -10), pt(7, 10), pt(-7, 10)]);
      
      // Create shape for the photon sprites.
      
      for (var i = 0; i < MAX_SHOTS; i++) {
          photons[i] = new AsteroidsSprite([pt(1,1), pt(1,-1), pt(-1,1), pt(-1,-1)]);
      }
      
      // Create shape for the flying saucer.
      
      ufo = new AsteroidsSprite([pt(-15,0), pt(-10,-5), pt(-5,-5), pt(-5,-9), pt(5,-9), pt(5,-5), pt(10,-5), pt(15,0), pt(10,5),pt(-10,5)]);
      
      // Create shape for the guided missile.
      
      missile = new AsteroidsSprite([pt(0,-4), pt(1,-3), pt(1,3), pt(2,4), pt(-2,4),pt(-1,3), pt(-1,-3)]);
      
      // Create asteroid sprites.
      
      for (i = 0; i < MAX_ROCKS; i++)
          asteroids[i] = new AsteroidsSprite([]);
      
      // Create explosion sprites.
      
      for (i = 0; i < MAX_SCRAP; i++)
          explosions[i] = new AsteroidsSprite([]);

    // Set font data.
    /* NOTE: Fonts are not supported yet
    g.setFont(font);
    fm = g.getFontMetrics();
    fontWidth = fm.getMaxAdvance();
    fontHeight = fm.getHeight();
    */

    // Initialize game data and put us in 'game over' mode.

    highScore = 0;
    sound = false;
    detail = false;
    initGame();
    endGame();
  }

  function initGame() {

    // Initialize game data and sprites.

    score = 0;
    shipsLeft = MAX_SHIPS;
    asteroidsSpeed = MIN_ROCK_SPEED;
    newShipScore = NEW_SHIP_POINTS;
    newUfoScore = NEW_UFO_POINTS;
    initShip();
    initPhotons();
    stopUfo();
    stopMissile();
    initAsteroids();
    initExplosions();
    playing = true;
    paused = false;
  }

  function endGame() {

    // Stop ship, flying saucer, guided missile and associated sounds.

    playing = false;
    stopShip();
    stopUfo();
    stopMissile();
  }

  // Create the starry background
  function initBackground() {

    numStars = Math.floor(gameWidth * gameHeight / 5000);
    stars = []; /* new Point[numStars]; */

    for (var i = 0; i < numStars; i++) {
        stars[i] = pt((Math.random() * gameWidth), (Math.random() * gameHeight));

        var m = Morph(stars[i].extent(pt(1, 1)), "rect");
        m.setFill(Color.yellow);
        m.setBorderColor(Color.yellow);
        gameMorph.addMorph(m);
    }
  }

  function showTextStrings() {
  
    if (!text_score) {
        text_score = TextMorph(Rectangle(10, 0, 100, fontHeight), "Score: " + score);
        text_score.setFill(Color.black);
        text_score.setTextColor(Color.yellow);
        gameMorph.addMorph(text_score);
    } else {
        text_score.setTextString("Score: " + score);
    }

    if (!text_ships) {
        text_ships = TextMorph(Rectangle(10, gameHeight-fontHeight-6, 100, fontHeight), "Ships: " + shipsLeft);
        text_ships.setFill(Color.black);
        text_ships.setTextColor(Color.yellow);
        gameMorph.addMorph(text_ships);
    } else {
        text_ships.setTextString("Ships: " + shipsLeft);
    }

    if (!text_high) {
        text_high = TextMorph(Rectangle(gameWidth-120, 0, 100, fontHeight), "High: " + highScore);
        text_high.setFill(Color.black);
        text_high.setTextColor(Color.yellow);
        gameMorph.addMorph(text_high);
    } else {
        text_high.setTextString("High: " + highScore);
    }

    if (!playing) {
      if (!text_name) {
          text_name = TextMorph(Rectangle(gameWidth / 2 - 140, gameHeight / 2 - 36, 280, 16), "A S T E R O I D S ! Copyright 1998 by Mike Hall");
          text_name.setFill(Color.black);
          text_name.setTextColor(Color.yellow);
          gameMorph.addMorph(text_name);
      }
      
      if (!text_info) {
          text_info = TextMorph(Rectangle(gameWidth / 2 - 100, gameHeight / 2, 200, 16), "Game Over: Press S to start");
          text_info.setFill(Color.black);
          text_info.setTextColor(Color.yellow);
          gameMorph.addMorph(text_info);
      }
    } else {
        if (text_name) {
            text_name.remove();
            text_name = null;
        }
        
        if (text_info) {
            text_info.remove();
            text_info = null;    
        }  
    }
  }

var GameMorph = HostClass.create('GameMorph', ClipMorph);

var USE_FUNCTIONAL_DELAY = false;

GameMorph.prototype.runAsteroidsGame = function() {

    // This is the main loop.
    
    // Load sounds.
    
    if (!loaded) {
        loadSounds();
        loaded = true;
        // loadThread.stop();
    }

    if (!paused) {

        // Move and process all sprites.

        updateShip();
        updatePhotons();
        updateUfo();
        updateMissile();
        updateAsteroids();
        updateExplosions();

        // Check the score and advance high score, add a new ship or start the flying
        // saucer as necessary.

        if (score > highScore)
            highScore = score;
        if (score > newShipScore) {
            newShipScore += NEW_SHIP_POINTS;
            shipsLeft++;
        }
        if (playing && score > newUfoScore && !ufo.active) {
            newUfoScore += NEW_UFO_POINTS;
            ufoPassesLeft = UFO_PASSES;
            initUfo();
        }

        // If all asteroids have been destroyed create a new batch.

        if (asteroidsLeft <= 0) {
            if (--asteroidsCounter <= 0)
                initAsteroids();
        }

        // Update the screen and set the timer for the next loop.
        // repaint();
        
        // Update score
        showTextStrings();

    }

    // If the game is collapsed, use a longer delay to reduce CPU usage
    var oldDelay = DELAY;
    DELAY = this.owner().isCollapsed() ? LONGDELAY : SHORTDELAY;
    if (oldDelay != DELAY) console.log("Changing timer from %s to %s for Asteroids", oldDelay, DELAY);
    
    // Set new timer delay for the game
    if (this.timeoutID) window.clearTimeout(this.timeoutID);
    if (!this.timerCallback) this.timerCallback = arguments.callee.bind(this).logErrors('Asteroid Timer');
    this.timeoutID = USE_FUNCTIONAL_DELAY ? this.timerCallback.delay(DELAY/1000) : window.setTimeout(this.timerCallback, DELAY);
};

  function loadSounds() {

    // Load all sound clips by playing and immediately stopping them.

    /* NOTE: Sounds are not supported yet
    try {
      crashSound     = getAudioClip(new URL(getDocumentBase(), "crash.au"));
      explosionSound = getAudioClip(new URL(getDocumentBase(), "explosion.au"));
      fireSound      = getAudioClip(new URL(getDocumentBase(), "fire.au"));
      missileSound   = getAudioClip(new URL(getDocumentBase(), "missile.au"));
      saucerSound    = getAudioClip(new URL(getDocumentBase(), "saucer.au"));
      thrustersSound = getAudioClip(new URL(getDocumentBase(), "thrusters.au"));
      warpSound      = getAudioClip(new URL(getDocumentBase(), "warp.au"));
    }
    catch (MalformedURLException e) {}

    crashSound.play();     crashSound.stop();
    explosionSound.play(); explosionSound.stop();
    fireSound.play();      fireSound.stop();
    missileSound.play();    missileSound.stop();
    saucerSound.play();    saucerSound.stop();
    thrustersSound.play(); thrustersSound.stop();
    warpSound.play();      warpSound.stop();
    */
  }

  function initShip() {

    ship.active = true;
    ship.angle = 0.0;
    ship.deltaAngle = 0.0;
    ship.currentX = 0.0;
    ship.currentY = 0.0;
    ship.deltaX = 0.0;
    ship.deltaY = 0.0;
    ship.render();
//    if (loaded)
//      thrustersSound.stop();
    thrustersPlaying = false;

    hyperCounter = 0;
  }

  function updateShip() {

    var dx, dy, limit;

    if (!playing)
      return;

    // Rotate the ship if left or right cursor key is down.

    if (left) {
      ship.angle += Math.PI / 16.0;
      if (ship.angle > 2 * Math.PI)
        ship.angle -= 2 * Math.PI;
    }
    if (right) {
      ship.angle -= Math.PI / 16.0;
      if (ship.angle < 0)
        ship.angle += 2 * Math.PI;
    }

    // Fire thrusters if up or down cursor key is down. Don't let ship go past
    // the speed limit.

    dx = -Math.sin(ship.angle);
    dy =  Math.cos(ship.angle);
    limit = 0.8 * MIN_ROCK_SIZE;
    if (up) {
      if (ship.deltaX + dx > -limit && ship.deltaX + dx < limit)
        ship.deltaX += dx;
      if (ship.deltaY + dy > -limit && ship.deltaY + dy < limit)
        ship.deltaY += dy;
    }
    if (down) {
      if (ship.deltaX - dx > -limit && ship.deltaX - dx < limit)
        ship.deltaX -= dx;
      if (ship.deltaY - dy > -limit && ship.deltaY - dy < limit)
        ship.deltaY -= dy;
    }

    // Move the ship. If it is currently in hyperspace, advance the countdown.

    if (ship.active) {
      ship.advance();
      ship.render();

      if (ship.morph) {
          ship.morph.setBorderColor(Color.purple);
      }  


      if (hyperCounter > 0) {
        hyperCounter--;

        if (ship.morph) {
            // var c = 255 - (255 / HYPER_COUNT) * hyperCounter;
            ship.morph.setFill(Color.random());    
        }
      }
    }

    // Ship is exploding, advance the countdown or create a new ship if it is
    // done exploding. The new ship is added as though it were in hyperspace.
    // (This gives the player time to move the ship if it is in imminent danger.)
    // If that was the last ship, end the game.

    else {
      if (--shipCounter <= 0) {
        if (shipsLeft > 0) {
          initShip();
          hyperCounter = HYPER_COUNT;
        }
        else
          endGame();
      }
    }
  }

  function stopShip() {

    ship.active = false;
    shipCounter = SCRAP_COUNT;
    if (shipsLeft > 0)
      shipsLeft--;
//    if (loaded)
//      thrustersSound.stop();
    thrustersPlaying = false;
    
    if (ship.morph) {
        ship.morph.remove();
        ship.morph = null;
    } 
  }

  function initPhotons() {

    for (var i = 0; i < MAX_SHOTS; i++) {
      photons[i].active = false;
      photonCounter[i] = 0;

      if (photons[i].morph) {
          photons[i].morph.remove();
          photons[i].morph = null;
      } 

    }
    photonIndex = 0;
  }

  function updatePhotons() {

    // Move any active photons. Stop it when its counter has expired.

    for (var i = 0; i < MAX_SHOTS; i++)
      if (photons[i].active) {
    
        photons[i].advance();
        photons[i].render();

        if (--photonCounter[i] < 0) {
          photons[i].active = false;
                              
          if (photons[i].morph) {
              photons[i].morph.remove();
              photons[i].morph = null;
          }
        }
      }
  }

  function initUfo() {

    var temp;

    // Randomly set flying saucer at left or right edge of the screen.

    ufo.active = true;
    ufo.currentX = -gameWidth / 2;
    ufo.currentY = Math.random() * gameHeight;
    ufo.deltaX = MIN_ROCK_SPEED + Math.random() * (MAX_ROCK_SPEED - MIN_ROCK_SPEED);
    if (Math.random() < 0.5) {
      ufo.deltaX = -ufo.deltaX;
      ufo.currentX = gameWidth / 2;
    }
    ufo.deltaY = MIN_ROCK_SPEED + Math.random() * (MAX_ROCK_SPEED - MIN_ROCK_SPEED);
    if (Math.random() < 0.5)
      ufo.deltaY = -ufo.deltaY;
    ufo.render();
    saucerPlaying = true;
//    if (sound)
//      saucerSound.loop();

    // Set counter for this pass.

    ufoCounter = Math.floor(gameWidth / Math.abs(ufo.deltaX));
  }

  function updateUfo() {

    var i, d;

    // Move the flying saucer and check for collision with a photon. Stop it when its
    // counter has expired.

    if (ufo.active) {
      ufo.advance();
      ufo.render();
      if (--ufoCounter <= 0) {
        if (--ufoPassesLeft > 0)
          initUfo();
        else
          stopUfo();
      } else {
        for (i = 0; i < MAX_SHOTS; i++)
          if (photons[i].active && ufo.isColliding(photons[i])) {
//            if (sound)
//              crashSound.play();
            explode(ufo);
            stopUfo();
            score += UFO_POINTS;
          }

          // On occasion, fire a missile at the ship if the saucer is not
          // too close to it.

          d = Math.max(Math.abs(ufo.currentX - ship.currentX), Math.abs(ufo.currentY - ship.currentY));
          if (ship.active && hyperCounter <= 0 && ufo.active && !missile.active &&
              d > 4 * MAX_ROCK_SIZE && Math.random() < .03)
            initMissile();
       }
    }
  }

  function stopUfo() {

    ufo.active = false;
    ufoCounter = 0;
    ufoPassesLeft = 0;
//    if (loaded)
//      saucerSound.stop();
    saucerPlaying = false;

    if (ufo.morph) {
        ufo.morph.remove();
        ufo.morph = null;
    } 
  }

  function initMissile() {

    missile.active = true;
    missile.angle = 0.0;
    missile.deltaAngle = 0.0;
    missile.currentX = ufo.currentX;
    missile.currentY = ufo.currentY;
    missile.deltaX = 0.0;
    missile.deltaY = 0.0;
    missile.render();
    missileCounter = 3 * Math.max(gameWidth, gameHeight) / MIN_ROCK_SIZE;
//    if (sound)
//      missileSound.loop();
    missilePlaying = true;
  }

  function updateMissile() {

    var i;

    // Move the guided missile and check for collision with ship or photon. Stop it when its
    // counter has expired.

    if (missile.active) {
      if (--missileCounter <= 0)
        stopMissile();
      else {
        guideMissile();
        missile.advance();
        missile.render();

        if (missile.morph) {
            var c = Math.min(missileCounter * 24, 255);
            missile.morph.setBorderColor(new Color(c, c, c));
        }

        for (i = 0; i < MAX_SHOTS; i++)
          if (photons[i].active && missile.isColliding(photons[i])) {
//            if (sound)
//              crashSound.play();
            explode(missile);
            stopMissile();
            score += MISSILE_POINTS;
          }
        if (missile.active && ship.active && hyperCounter <= 0 && ship.isColliding(missile)) {
//          if (sound)
//            crashSound.play();
          explode(ship);
          stopShip();
          stopUfo();
          stopMissile();
        }
      }
    }
  }

  function guideMissile() {

    /* double */ var dx, dy, angle;

    if (!ship.active || hyperCounter > 0)
      return;

    // Find the angle needed to hit the ship.

    dx = ship.currentX - missile.currentX;
    dy = ship.currentY - missile.currentY;
    if (dx == 0 && dy == 0)
      angle = 0;
    if (dx == 0) {
      if (dy < 0)
        angle = -Math.PI / 2;
      else
        angle = Math.PI / 2;
    }
    else {
      angle = Math.atan(Math.abs(dy / dx));
      if (dy > 0)
        angle = -angle;
      if (dx < 0)
        angle = Math.PI - angle;
    }

    // Adjust angle for screen coordinates.

    missile.angle = angle - Math.PI / 2;

    // Change the missile's angle so that it points toward the ship.

    missile.deltaX = MIN_ROCK_SIZE / 3 * -Math.sin(missile.angle);
    missile.deltaY = MIN_ROCK_SIZE / 3 *  Math.cos(missile.angle);
  }

  function stopMissile() {

    missile.active = false;
    missileCounter = 0;
//    if (loaded)
//      missileSound.stop();
    missilePlaying = false;

    if (missile.morph) {
        missile.morph.remove();
        missile.morph = null;
    } 
  }

  function initAsteroids() {

    var i, j;
    var s;
    /* double */ var theta, r;
    var x, y;

    // Create random shapes, positions and movements for each asteroid.

    for (i = 0; i < MAX_ROCKS; i++) {

      // Create a jagged shape for the asteroid and give it a random rotation.
      if (asteroids[i].morph) {
          asteroids[i].morph.remove();
          asteroids[i].morph = null;
      }
       
      asteroids[i].shape = [];
      s = MIN_ROCK_SIDES + (Math.random() * (MAX_ROCK_SIDES - MIN_ROCK_SIDES));
      for (j = 0; j < s; j ++) {
        theta = 2 * Math.PI / s * j;
        r = MIN_ROCK_SIZE + (Math.random() * (MAX_ROCK_SIZE - MIN_ROCK_SIZE));
        x = -Math.round(r * Math.sin(theta));
        y =  Math.round(r * Math.cos(theta));
        asteroids[i].shape.push(pt(x, y));
      }
      asteroids[i].active = true;
      asteroids[i].angle = 0.0;
      asteroids[i].deltaAngle = (Math.random() - 0.5) / 10;

      // Place the asteroid at one edge of the screen.

      if (Math.random() < 0.5) {
        asteroids[i].currentX = -gameWidth / 2;
        if (Math.random() < 0.5)
          asteroids[i].currentX = gameWidth / 2;
        asteroids[i].currentY = Math.random() * gameHeight;
      }
      else {
        asteroids[i].currentX = Math.random() * gameWidth;
        asteroids[i].currentY = -gameHeight / 2;
        if (Math.random() < 0.5)
          asteroids[i].currentY = gameHeight / 2;
      }

      // Set a random motion for the asteroid.

      asteroids[i].deltaX = Math.random() * asteroidsSpeed;
      if (Math.random() < 0.5)
        asteroids[i].deltaX = -asteroids[i].deltaX;
      asteroids[i].deltaY = Math.random() * asteroidsSpeed;
      if (Math.random() < 0.5)
        asteroids[i].deltaY = -asteroids[i].deltaY;

      asteroids[i].render();
      asteroidIsSmall[i] = false;
    }

    asteroidsCounter = STORM_PAUSE;
    asteroidsLeft = MAX_ROCKS;
    if (asteroidsSpeed < MAX_ROCK_SPEED)
      asteroidsSpeed++;
  }

  function initSmallAsteroids(n) {

    var count;
    var i, j;
    var s;
    /* double */ var tempX, tempY;
    /* double */ var theta, r;
    var x, y;

    // Create one or two smaller asteroids from a larger one using inactive asteroids. The new
    // asteroids will be placed in the same position as the old one but will have a new, smaller
    // shape and new, randomly generated movements.

    count = 0;
    i = 0;
    tempX = asteroids[n].currentX;
    tempY = asteroids[n].currentY;
    do {
      if (!asteroids[i].active) {

        if (asteroids[i].morph) {
            asteroids[i].morph.remove();
            asteroids[i].morph = null;
        }

        asteroids[i].shape = [];
        s = MIN_ROCK_SIDES + (Math.random() * (MAX_ROCK_SIDES - MIN_ROCK_SIDES));
        for (j = 0; j < s; j ++) {
          theta = 2 * Math.PI / s * j;
          r = (MIN_ROCK_SIZE + (Math.random() * (MAX_ROCK_SIZE - MIN_ROCK_SIZE))) / 2;
          x = -Math.round(r * Math.sin(theta));
          y =  Math.round(r * Math.cos(theta));
          asteroids[i].shape.push(pt(x, y));
        }
        asteroids[i].active = true;
        asteroids[i].angle = 0.0;
        asteroids[i].deltaAngle = (Math.random() - 0.5) / 10;
        asteroids[i].currentX = tempX;
        asteroids[i].currentY = tempY;
        asteroids[i].deltaX = Math.random() * 2 * asteroidsSpeed - asteroidsSpeed;
        asteroids[i].deltaY = Math.random() * 2 * asteroidsSpeed - asteroidsSpeed;
        asteroids[i].render();
        asteroidIsSmall[i] = true;
        count++;
        asteroidsLeft++;
      }
      i++;
    } while (i < MAX_ROCKS && count < 2);
  }

  function updateAsteroids() {

    var i, j;

    // Move any active asteroids and check for collisions.

    for (i = 0; i < MAX_ROCKS; i++)
      if (asteroids[i].active) {
      
        asteroids[i].advance();
        asteroids[i].render();

        // If hit by photon, kill asteroid and advance score. If asteroid is large,
        // make some smaller ones to replace it.

        for (j = 0; j < MAX_SHOTS; j++)
          if (photons[j].active && asteroids[i].active && asteroids[i].isColliding(photons[j])) {
            asteroidsLeft--;
            asteroids[i].active = false;
            photons[j].active = false;

//            if (sound)
//              explosionSound.play();
            explode(asteroids[i]);
            
            if (asteroids[i].morph) {
                asteroids[i].morph.remove();
                asteroids[i].morph = null;
            }
            
            if (photons[j].morph) {
                photons[j].morph.remove();
                photons[j].morph = null;
            }

            if (!asteroidIsSmall[i]) {
              score += BIG_POINTS;
              initSmallAsteroids(i);
            }
            else
              score += SMALL_POINTS;
          }

        // If the ship is not in hyperspace, see if it is hit.

        if (ship.active && hyperCounter <= 0 && asteroids[i].active && asteroids[i].isColliding(ship)) {
//          if (sound)
//            crashSound.play();
          explode(ship);
          stopShip();
          stopUfo();
          stopMissile();
        }
    }
  }

  function initExplosions() {

    for (var i = 0; i < MAX_SCRAP; i++) {
      explosions[i].shape = [];
      explosions[i].active = false;
      explosionCounter[i] = 0;

      if (explosions[i].morph) {
          explosions[i].morph.remove();
          explosions[i].morph = null;
      }

    }
    explosionIndex = 0;
  }

  function explode(/* AsteroidsSprite */ s) {

    var c, i, j;

    // Create sprites for explosion animation. The each individual line segment of the given sprite
    // is used to create a new sprite that will move outward  from the sprite's original position
    // with a random rotation.

    s.render();
    var sverts = s.sprite.vertices();
    c = 2;
    if (detail || sverts.length < 6)
      c = 1;
    for (i = 0; i < sverts.length; i += c) {
      explosionIndex++;
      if (explosionIndex >= MAX_SCRAP)
        explosionIndex = 0;
        
      if (explosions[explosionIndex].morph) {
          explosions[explosionIndex].morph.remove();
          explosions[explosionIndex].morph = null;
      }
        
      explosions[explosionIndex].active = true;
      explosions[explosionIndex].shape = [];
      explosions[explosionIndex].shape.push(s.shape[i].clone());
      j = i + 1;
      if (j >= sverts.length)
        j -= sverts.length;
      explosions[explosionIndex].shape.push(s.shape[j].clone());
      explosions[explosionIndex].angle = s.angle;
      explosions[explosionIndex].deltaAngle = (Math.random() * 2 * Math.PI - Math.PI) / 15;
      explosions[explosionIndex].currentX = s.currentX;
      explosions[explosionIndex].currentY = s.currentY;
      explosions[explosionIndex].deltaX = -s.shape[i].x / 5;
      explosions[explosionIndex].deltaY = -s.shape[i].y / 5;
      explosionCounter[explosionIndex] = SCRAP_COUNT;
    }
  }

  function updateExplosions() {

    // Move any active explosion debris. Stop explosion when its counter has expired.

    for (var i = 0; i < MAX_SCRAP; i++)
      if (explosions[i].active) {
        explosions[i].advance();
        explosions[i].render();
        
        if (explosions[i].morph) {
            // var c = (255 / SCRAP_COUNT) * explosionCounter[i];
            explosions[i].morph.setFill(Color.random() /* new Color(0, c, c) */);
            explosions[i].morph.setBorderColor(Color.random() /* new Color(0, c, c) */);
        }
        
        if (--explosionCounter[i] < 0) {
          explosions[i].active = false;
          
          if (explosions[i].morph) {
              explosions[i].morph.remove();
              explosions[i].morph = null;
          }
        }
      }
  }

/*
 * The game morph and event handlers
 */
  /* Keycodes */

  var KEY_S = 83; // Start
  var KEY_M = 77; // Mute
  var KEY_D = 68; // Detail
  var KEY_P = 80; // Pause
  var KEY_H = 72; // Hyperspace

  function keyDown(event) {

    var key = event.keyCode || event.charCode;

    // Check if any cursor keys have been pressed and set flags.

    if (key == Event.KEY_LEFT)
      left = true;
    if (key == Event.KEY_RIGHT)
      right = true;
    if (key == Event.KEY_UP)
      up = true;
    if (key == Event.KEY_DOWN)
      down = true;

    if ((up || down) && ship.active && !thrustersPlaying) {
//      if (sound && !paused)
//        thrustersSound.loop();
      thrustersPlaying = true;
    }

    // Spacebar: fire a photon and start its counter.

    if (key == Event.KEY_SPACEBAR && ship.active) {
//      if (sound & !paused)
//        fireSound.play();
      photonIndex++;
      if (photonIndex >= MAX_SHOTS)
        photonIndex = 0;
      photons[photonIndex].active = true;
      photons[photonIndex].currentX = ship.currentX;
      photons[photonIndex].currentY = ship.currentY;
      photons[photonIndex].deltaX = MIN_ROCK_SIZE * -Math.sin(ship.angle);
      photons[photonIndex].deltaY = MIN_ROCK_SIZE *  Math.cos(ship.angle);
      photonCounter[photonIndex] = Math.min(gameWidth, gameHeight) / MIN_ROCK_SIZE;
    }

    // 'H' key: warp ship into hyperspace by moving to a random location and starting counter.

    if (key == KEY_H && ship.active && hyperCounter <= 0) {
      ship.currentX = Math.random() * gameWidth;
      ship.currentX = Math.random() * gameHeight;
      hyperCounter = HYPER_COUNT;
//      if (sound & !paused)
//        warpSound.play();
    }

    // 'P' key: toggle pause mode and start or stop any active looping sound clips.

    if (key == KEY_P) {
      if (paused) {
//        if (sound && missilePlaying)
//          missileSound.loop();
//        if (sound && saucerPlaying)
//          saucerSound.loop();
//        if (sound && thrustersPlaying)
//          thrustersSound.loop();
      }
      else {
//        if (missilePlaying)
//          missileSound.stop();
//        if (saucerPlaying)
//          saucerSound.stop();
//        if (thrustersPlaying)
//          thrustersSound.stop();
      }
      paused = !paused;
    }

    // 'M' key: toggle sound on or off and stop any looping sound clips.

    if (key == KEY_M && loaded) {
/*
      if (sound) {
        crashSound.stop();
        explosionSound.stop();
        fireSound.stop();
        missileSound.stop();
        saucerSound.stop();
        thrustersSound.stop();
        warpSound.stop();
      }
      else {
        if (missilePlaying && !paused)
          missileSound.loop();
        if (saucerPlaying && !paused)
          saucerSound.loop();
        if (thrustersPlaying && !paused)
          thrustersSound.loop();
      }
      sound = !sound;
*/
    }

    // 'D' key: toggle graphics detail on or off.

    if (key == KEY_D) {
      detail = !detail;
    }

    // 'S' key: start the game, if not already in progress.

    if (key == KEY_S && loaded && !playing)
      initGame();

    return true;
  }

  function keyUp(event) {

    var key = event.keyCode || event.charCode;

    // Check if any cursor keys where released and set flags.

    if (key == Event.KEY_LEFT)
      left = false;
    if (key == Event.KEY_RIGHT)
      right = false;
    if (key == Event.KEY_UP)
      up = false;
    if (key == Event.KEY_DOWN)
      down = false;

    if (!up && !down && thrustersPlaying) {
//      thrustersSound.stop();
      thrustersPlaying = false;
    }

    return true;
  }

Object.extend(GameMorph.prototype, {
    
    timeoutID: null,
    
    initialize: function(rect) {
        GameMorph.superClass.initialize.call(this, rect, "rect");
        // Set black background color for the game
        this.setFill(Color.black);
        return this;
    },
    
    handlesMouseDown: function() {
        return true; // hack
    },

    onMouseDown: function(evt) {
        this.requestKeyboardFocus(evt.hand);
        return true; 
    },

    setHasKeyboardFocus: function(newSetting) { 
        return newSetting;
    },
    
    takesKeyboardFocus: function() { 
        return true; 
    },

    onKeyDown: function(evt) { 
        keyDown(evt);
        if (evt.keyCode == Event.KEY_ESC) {
            this.relinquishKeyboardFocus(this.world().firstHand());
        }
        evt.stop();
        return true; 
    },

    onKeyUp: function(evt) { 
        keyUp(evt);
        evt.stop();
        return true; 
    },

    shutdown: function() {
        if (this.timeoutID) {
            console.log('shutting down the game');
            window.clearTimeout(this.timeoutID);
        }
        GameMorph.superClass.shutdown.call(this);
    }

});

    function makeGameMorph(rect) {
        gameMorph = GameMorph(rect); 
        return gameMorph;
    }

    // module exports
    return {
        initialize: initAsteroidsGame,
        makeGameMorph: makeGameMorph
    };

}(); // end of the asteroid game module

// ===========================================================================
// The Weather Widget Example
// ===========================================================================

/**
 * @class WeatherWidget
 */
 
// Weather widget works by selecting the city from the list.
// It uses XMLHttpRequest to obtain weather info for the selected city
 
// We should consider using other weather service.
// These images are of low quality
WeatherWidget = Class.extend(Model);

Object.extend(WeatherWidget.prototype, {

    imagepath: "Resources/weather/",
    
    initialize: function() { 
        WeatherWidget.superClass.initialize.call(this);
        // Fetch weather upon starting the widget
        this.getWeather("6568"); // San Francisco International (SFO) as default
    },
    
    openIn: function(world, location) {
        world.addMorphAt(WindowMorph(this.buildView(), 'Weather Widget'), location);
    },
    
    getListItem: function() {
        return this.listItem;            
    },
    
    setListItem: function(item, v) {
        this.listItem = item; 
        this.changed("getListItem", v); 
        
        // initialize UI update
        switch (item) {
        case "San Francisco, California":
            this.getWeather("6568");
//          this.getWeather("stanford", "US", "CA"); // "USCA0050"  6568 -- San Francisco International (SFO)
            // bbc's USA cities: http://www.bbc.co.uk/cgi-perl/weather/search/new_search.pl?search_query=USA&x=0&y=0
            break;
        case "Tampere, Finland":
            this.getWeather("4974");
//          this.getWeather("tampere", "finland"); // "FIXX0031"  or 4974
            break;
        case "London, United Kingdom":
            this.getWeather("4583");
//          this.getWeather("london", "united_kingdom"); // "UKXX0318"  or 4583           
            break;
        }
    },

    feed: null,
    weatherDataArr: null,
    previousResult: null,
    
    imageurl: "http://www.bbc.co.uk/weather/images/banners/weather_logo.gif",
    
    parseWeatherData: function() {
        if (this.previousResult != this.feed.channels[0]) {
            this.weatherDataArr = [];
            // we got a new value asynchronously
            this.previousResult = this.feed.channels[0];
            //this.weatherDataArr = this.previousResult.items[0].description.split(",");
            var text = this.previousResult.items[0].description;
            var arr = text.split(",");
            var topic = this.previousResult.items[0].title;
            var weather = topic.substring(topic.indexOf("."), topic.indexOf("GMT:")+4).replace(/^\s+|\s+$/g, '');
            this.weatherDataArr[0] = weather[0].toUpperCase() + weather.substr(1);
            this.weatherDataArr[1] = arr[0].replace(/^\s+|\s+$/g, '');
            this.weatherDataArr[2] = arr[1].replace(/^\s+|\s+$/g, '');
            this.weatherDataArr[3] = arr[2].replace(/^\s+|\s+$/g, '');
            this.weatherDataArr[4] = arr[3].replace(/^\s+|\s+$/g, '');
            this.weatherDataArr[5] = arr[4].replace(/^\s+|\s+$/g, '') + ", " + arr[5].replace(/^\s+|\s+$/g, '');
            this.weatherDataArr[6] = arr[6].replace(/^\s+|\s+$/g, '');
        }
        
        return this.weatherDataArr;
    },

    getWeatherDesc: function() { return this.parseWeatherData()[0]; },
    getTemperature: function() { return this.parseWeatherData()[1]; },
    getWind: function()        { return this.parseWeatherData()[3]; },
    getHumidity: function()    { return this.parseWeatherData()[4]; },
    getDewPoint: function()    { return this.parseWeatherData()[5]; },
    getGusts: function()       { return this.parseWeatherData()[2]; },
    getVisibility: function()  { return this.parseWeatherData()[6]; },
    getImageURL: function()    { return this.imageurl; },
    
    buildView: function() {
        var panel = PanelMorph(pt(250, 260));
        panel.setBorderWidth(2);
        //panel.setBorderColor(Color.blue);
        panel.setFill(LinearGradient.makeGradient(Color.white, Color.primary.blue, LinearGradient.WestEast));
        // TODO: add rounding to all the elements (panel, window & titlebar)
        // or make the titlebar round depending on the window
        var m; 

        panel.addMorph(m = ImageMorph(Rectangle(10,20,25,20), this.imagepath + "city.png"));
        m.setFill(null);
        panel.addMorph(m = ImageMorph(Rectangle(10,55,25,20), this.imagepath + "weather.png"));
        m.setFill(null);
        panel.addMorph(m = ImageMorph(Rectangle(10,80,20,20), this.imagepath + "temperature.png"));
        m.setFill(null);
        panel.addMorph(m = ImageMorph(Rectangle(10,105,20,20), this.imagepath + "wind.png"));
        m.setFill(null);
        panel.addMorph(m = ImageMorph(Rectangle(10,130,20,20), this.imagepath + "wind_dir.png"));
        m.setFill(null);
        panel.addMorph(m = ImageMorph(Rectangle(10,155,20,20), this.imagepath + "barometer.png"));
        m.setFill(null);
        panel.addMorph(m = ImageMorph(Rectangle(10,180,20,20), this.imagepath + "humidity.png"));
        m.setFill(null);
        panel.addMorph(m = ImageMorph(Rectangle(10,205,20,20), this.imagepath + "visibility.png"));
        m.setFill(null);

        panel.addMorph(m = CheapListMorph(Rectangle(40,3,200,20),["San Francisco, California", "Tampere, Finland", "London, United Kingdom"]));
        m.connectModel({model: this, getSelection: "getListItem", setSelection: "setListItem"});
        m.selectLineAt(0); // Select the first item by default

        // build the textfields for the weather panel
        var m;
        panel.addMorph(m = TextMorph(Rectangle(40,55, 200,20), "---")).connectModel({model: this, getText: "getWeatherDesc"});
        m.takesKeyboardFocus = function() {return false;};
        panel.addMorph(m = TextMorph(Rectangle(40,80, 200,20), "---")).connectModel({model: this, getText: "getTemperature"});
        m.takesKeyboardFocus = function() {return false;};
        panel.addMorph(m = TextMorph(Rectangle(40,105, 200,20), "---")).connectModel({model: this, getText: "getWind"});
        m.takesKeyboardFocus = function() {return false;};
        panel.addMorph(m = TextMorph(Rectangle(40,130, 200,20), "---")).connectModel({model: this, getText: "getGusts"});
        m.takesKeyboardFocus = function() {return false;};
        panel.addMorph(m = TextMorph(Rectangle(40,155, 200,20), "---")).connectModel({model: this, getText: "getDewPoint"});
        m.takesKeyboardFocus = function() {return false;};
        panel.addMorph(m = TextMorph(Rectangle(40,180, 200,20), "---")).connectModel({model: this, getText: "getHumidity"});
        m.takesKeyboardFocus = function() {return false;};
        panel.addMorph(m = TextMorph(Rectangle(40,205, 200,20), "---")).connectModel({model: this, getText: "getVisibility"});
        m.takesKeyboardFocus = function() {return false;};
//        panel.addMorph(TextMorph(Rectangle(80,230, 200,20), "---")).connectModel({model: this, getText: "getDate"});
    
        var image = panel.addMorph(ImageMorph(Rectangle(40,230,100,20)));
        image.connectModel({model: this, getURL: "getImageURL"});
        image.setFill(null);
        this.changed('getImageURL');
        return panel;
    },

    getWeather: function(citycode) {
//    getWeather: function(city, country, state) {
//        this.feed = new Feed("http://weatherforecastmap.com/" + country + "/" + city + "/index.html");
//        this.feed.request(this, 'getWeatherDesc', "getTemperature", "getWind", "getPressure", 
//                          "getVisibility", "getHumidity", "getUV", "getDate");
        this.feed = new Feed("http://feeds.bbc.co.uk/weather/feeds/rss/obs/world/" + citycode + ".xml");
        this.feed.request(this, 'getWeatherDesc', "getTemperature", "getWind", "getGusts", 
                          "getDewPoint", "getHumidity", "getVisibility");
        var model = this;
    }
    
});

// ===========================================================================
// The Stock Widget Example
// ===========================================================================

/**
 * @class StockWidget
 */

StockWidget = Class.extend(Model);

Object.extend(StockWidget.prototype, {
    
    initialize: function() { 
        StockWidget.superClass.initialize.call(this);
        this.imageurl = null;
        this.feed = null;
        return this;
    },
    
    openIn: function(world, location) {
        var view = this.buildView((pt(580, 460)));
        this.windowMorph = WindowMorph(view, 'Stock Widget');
        world.addMorphAt(this.windowMorph, location);
        this.setStockIndex('DOW JONES');
        return view;
    },

    makeURL: function(ticker) {
        return "http://finance.google.com/finance?morenews=10&rating=1&q=INDEX" + ticker + "&output=rss";
    },

    // FIXME: The image links here are no longer necessary.  Remove later.
    config: $H({
    "DOW JONES": { 
        ticker: 'DJX:.DJI', 
        image: "http://bigcharts.marketwatch.com/charts/gqplus/fpDJIA-narrow.gqplus?167" },
        // image: "http://newsimg.bbc.co.uk/media/images/42214000/jpg/_42214402_dowtwo.jpg" },
    "NASDAQ": { 
        ticker: 'NASDAQ:.IXIC',
        image: "http://bigcharts.marketwatch.com/charts/gqplus/fpNASDAQ-narrow.gqplus?167" },
        // image: "http://content.nasdaq.com/graphs/HOMEIXIC.gif?89649" },
    "NYSE": { 
        ticker: 'NYSE:NYA.X',
        image: "http://www.forecasts.org/images/stock-market/nysecomp.gif"},

    "S&P INX": { 
        ticker: 'SP:.INX',
        image: "http://stockcharts.com/charts/historical/images/SPX1960t.png" }
    }),
       
    getStockIndex: function() { 
        return this.listItem; 
    },
    
    setStockIndex: function(item, v) { 
        this.listItem = item; 
        var entry = this.config[this.listItem];
        this.imageurl = entry.image;
        this.changed('getIndexChartURL');
        this.feed = new Feed(this.makeURL(entry.ticker));
        this.feed.request(this, 'getNewsHeaders');
        this.changed("getStockIndex", v); 
    },
    
    getNewsHeaders: function() {
        return this.feed.channels[0].items.pluck('title');
    },

    getIndexChartURL: function() { 
        return this.imageurl; 
    },
    
    getCompany: function() { 
        return this.companyListItem; 
    },

    setCompany: function(item, v) {
        this.companyListItem = item; 
        console.log('setting item ' + item);
        this.getUrl("http://download.finance.yahoo.com/d/quotes.csv",
                    { s:item.toLowerCase(), f:'sl1d1t1c1ohgv', e: '.csv'});
        this.changed("getCompany", v); 
    },

    buildView: function(extent) {
        var panel = PanelMorph(extent);
        
        // panel.setFill(StipplePattern.create(Color.primary.blue.lighter(), 1, Color.gray.lighter(), 1));
        panel.setFill(LinearGradient.makeGradient(Color.white, Color.primary.blue.lighter(), LinearGradient.EastWest));
        panel.setBorderWidth(2);
        //panel.setBorderColor(Color.blue);
        //var url = "http://www.nasdaq.com/aspxcontent/NasdaqRSS.aspx?data=quotes&symbol=stock"

        // Marketwatch/Bigcharts logo
        var m = panel.addMorph(ImageMorph(Rectangle(20, 10, 135, 68), "http://b.mktw.net/images/logo/frontpage.gif" ));
        
        // Dow Jones chart
        var image = ImageMorph(Rectangle(160, 10, 175, 160), "http://bigcharts.marketwatch.com/charts/gqplus/fpDJIA-narrow.gqplus?167");
        panel.leftChartImage = image;
        m = panel.addMorph(image);
        m.setFill(Color.white);
        
        // NASDAQ chart
        image = ImageMorph(Rectangle(360, 10, 175, 160), "http://bigcharts.marketwatch.com/charts/gqplus/fpNASDAQ-narrow.gqplus?167");
        panel.rightChartImage = image;
        m = panel.addMorph(image);
        m.setFill(Color.white);
        // m.connectModel({model: this, getURL: "getIndexChartURL"});

        // Newsfeed selector
        m = panel.addMorph(CheapListMorph(Rectangle(20, 180, 90, 20), this.config.keys()));
        m.connectModel({model: this, getSelection: "getStockIndex", setSelection: "setStockIndex"});

        // Newsfeed panel
        m = panel.addMorph(ListPane(Rectangle(160, 180, 410, 150)));
        m.connectModel({model: this, getList: "getNewsHeaders"});

        // Company-specific stock quotes
        //this.dataList = panel.addMorph(CheapListMorph(Rectangle(20,300,130,40), this.dataArray));
        m = panel.addMorph(TextMorph(Rectangle(160, 340, 410, 20), "")).connectModel({model: this, getText: 'getQuotes'});

        // Company selector for stock quotes
        m = panel.addMorph(CheapListMorph(Rectangle(20, 340, 120, 40), ["JAVA", "NOK", "GOOG", "QQQQ"]));
        m.connectModel({model: this, getSelection: "getCompany", setSelection: "setCompany"});
        this.setCompany('JAVA');
        var model = this;
        
        panel.shutdown = function() {
            PanelMorph.superClass.shutdown.call(this);
            console.log('shutting down the stock widget');
            model.timer && window.clearInterval(model.timer);
        }
        
        return panel;
    },

    getQuotes: function() {
        return this.formatQuote(this.lastQuote);
    },

    refreshCharts: function(panel) {
        console.log("Refreshing charts...");
        panel.leftChartImage.reload(); 
        panel.rightChartImage.reload(); 
    },

    startSteppingRefreshCharts: function(panel) {
        // this.startSteppingFunction(30000, this.refreshCharts);
        this.timer = setInterval(this.refreshCharts.bind(this).curry(panel).logErrors('Stock Refresh'), 30000);
    },

    getUrl: function(url, params) {
        NetRequest.requestNetworkAccess();
        var req = new NetRequest(this);

        req.process = function(transport) {
            var text = transport.responseText;
            console.log('got data %s', text);
            this.model.lastQuote = transport.responseText.split(',');
            this.model.changed('getQuotes');
        };

        req.request(url, {contentType: 'text/html', parameters: params || {} });
    },
  
    formatQuote: function(arr) {
        return "Name: " + arr[0] + "\n" 
            + "Last: " + arr[1]+ "\n"
            + "Change: " + arr[4]+ "\n"
            + "Open: " + arr[5]+ "\n"
            + "High: " + arr[6]+ "\n"
            + "Low: " + arr[7]+ "\n"
            + "Volume: " + this.trim(arr[8]);
    },
  
    trim: function(str) {
        if (!str) return null;
        return str.toString().strip().replace(/[\s]{2,}/,' ');
    }

});

// ===========================================================================
// The Map Widget Example
// ===========================================================================

apps.maps = function() {

// 6 is largest as a system print, lower numbers are debugprints
// 6 is to be used if user must be notified lower levels to developer use
var debugpriority = 6;
pd = function (text, priority) {
    if (priority >= debugpriority) {
        console.log(text);
    }
}

// Constants that all mapmorphs use
var IMAGEFOLDER = "Resources/map/";

var MAPSFOLDER = IMAGEFOLDER + "maps";
var MAPSURL = []; //format "http://mt.google.com/mt?n=404&v=w2.99&x=" + tempx + "&y=" + tempy + "&zoom="+zoomRatio
MAPSURL[0] = "http://mt.google.com/mt?n=404&v=w2.99&x=";
MAPSURL[1] = "&y=";
MAPSURL[2] = "&zoom=";

var SATELLITESFOLDER = IMAGEFOLDER + "satellitemaps";
var SATELLITESURL = [];//format http://kh.google.com/kh?n=404&v=10&t=%s
SATELLITESURL[0] = "http://kh.google.com/kh?n=404&v=10&t=";
SATELLITESURL[1] = "";
SATELLITESURL[2] = "";

var TileSize = pt(256, 256);
//var IMAGEWIDTH = 256;
//var IMAGEHEIGHT = 256;

/**
 * @class ZoomLevel
 * -tells everything program needs to know for certain zoomlevel
 */
function Zoomlevel() {
    this.zoom = 0;
    this.maxX = 0;
    this.maxY = 0;
    this.hotspotX = 0;
    this.hotspotY = 0;
    this.toSource = function toSource() {
        return this.zoom + ":" + this.maxX + ":" + this.maxY;
    }
}

/**
 * @class Maparea
 *   -tells how big is the functional map area
 *   -and its location
 *   -contains function (boolean) returns true if x,y is inside area
 */
function MapArea() {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.Contains = function(x_, y_){
        if ( (x_ >= this.x) && (x_ < (this.x + this.width)) ) {
            if ( (y_ >= this.y) && (y_ < (this.y + this.height)) ) {
                return true;
            }
        }
        return false;
    }
}

/**
 * @class MapFrameMorph
 */

/*
Mapframe has all buttons and cliprect where the actual map is located
Typically the actual map is used straigth with this.map 
online parameter tells should the application load the maps from google

Mapframe has menu which can be accessed by Ctrl+MouseClick in frame area
*/

MapFrameMorph = HostClass.create('MapFrameMorph', Morph);

Object.extend(MapFrameMorph.prototype, {
    defaultBorderWidth: 5,
    defaultFill: new Color(0.5,0.5,0.5,0.8),

    initialize: function( initialBounds, online) { 
        pd("MapFrameMorph",2);
        MapFrameMorph.superClass.initialize.call(this,initialBounds,"rectangle");
        this.online = online;
        this.topLeft = this.bounds().topLeft();
        this.bottomRight = this.bounds().bottomRight();

        var clipInset = 23;
        this.mapclip = ClipMorph(pt(0, 0).extent(initialBounds.extent()).insetBy(clipInset));

        this.map = new MapMorph(new Rectangle(0, 0, 5*TileSize.x, 5*TileSize.y), this.online);
        this.map.hasFrame = true;
        this.mapclip.addMorph(this.map);
        this.addMorph(this.mapclip);

        this.mapmodel = new MapModel(this);

        const iconSize = 40;
        var r = Rectangle(0, 0, iconSize/2, initialBounds.height - iconSize - 10);
        this.leftbutton = ImageButtonMorph(r, IMAGEFOLDER + "buttonleft.PNG", 
                                          IMAGEFOLDER + "buttonleftdown.PNG");
        this.leftbutton.align(this.leftbutton.bounds().rightCenter(), 
                              this.mapclip.bounds().leftCenter().addXY(-clipInset, 0));
        this.leftbutton.connectModel({model: this.mapmodel, setValue: "goLeft", getValue: "isStepping"});
        this.leftbutton.setToggle(true);
        this.addMorph(this.leftbutton);

        this.rightbutton = new ImageButtonMorph(r, IMAGEFOLDER + "buttonright.PNG", 
                                                IMAGEFOLDER + "buttonrightdown.PNG");
        this.rightbutton.align(this.rightbutton.bounds().leftCenter(), 
        this.mapclip.bounds().rightCenter().addXY(clipInset, 0));

        this.rightbutton.connectModel({model: this.mapmodel, setValue: "goRight", getValue: "isStepping"});
        this.rightbutton.setToggle(true);
        this.addMorph(this.rightbutton);

        r = Rectangle(this.topLeft.x + 25,this.topLeft.y-20,this.bottomRight.x-this.topLeft.x-52,20);
        this.upbutton =  ImageButtonMorph(r, IMAGEFOLDER + "buttonup.PNG",IMAGEFOLDER + "buttonupdown.PNG");
        this.upbutton.connectModel({model: this.mapmodel, setValue: "goUp", getValue: "isStepping"});
        this.upbutton.setToggle(true);
        this.addMorph(this.upbutton);

        r = Rectangle(this.topLeft.x + 25,this.bottomRight.y,this.bottomRight.x-this.topLeft.x-52,20);
        this.downbutton = ImageButtonMorph(r, IMAGEFOLDER + "buttondown.PNG", IMAGEFOLDER + "buttondowndown.PNG");
        this.downbutton.connectModel({model: this.mapmodel, setValue: "goDown", getValue: "isStepping"});
        this.downbutton.setToggle(true);
        this.addMorph(this.downbutton);

        r = Rectangle(0, 0, iconSize, iconSize);
        this.zinbutton = ImageButtonMorph(r, IMAGEFOLDER + "zoom.PNG",IMAGEFOLDER + "zoomdown.PNG");
        this.zinbutton.align(this.zinbutton.bounds().topLeft(), this.bounds().topLeft());
        this.zinbutton.connectModel({model: this.mapmodel, setValue: "setZoomIn"});
        this.addMorph(this.zinbutton);

        this.zoutbutton = ImageButtonMorph(r, IMAGEFOLDER + "zoomout.PNG", IMAGEFOLDER + "zoomoutdown.PNG");
        this.zoutbutton.align(this.zoutbutton.bounds().bottomRight(), this.bounds().bottomRight());
        this.zoutbutton.connectModel({model: this.mapmodel, setValue: "setZoomOut"}); 
        this.addMorph(this.zoutbutton);

        this.maptypebutton = ImageButtonMorph(r, IMAGEFOLDER + "maptype.PNG", IMAGEFOLDER + "maptype2.PNG");
        this.maptypebutton.align(this.maptypebutton.bounds().bottomLeft(), this.bounds().bottomLeft());
        this.maptypebutton.connectModel({model: this.mapmodel, setValue: "setMapType", getValue: "isSatelliteView"});
        this.maptypebutton.setToggle(true);
        this.addMorph(this.maptypebutton);

        pd("MapFrameMorph constructed",2);
        return this;
    } 
    
});

/**
 * @class MapModel
 */

MapModel = Class.extend(Model);

Object.extend(MapModel.prototype, {

    initialize: function(frame) {
        MapModel.superClass.initialize.call(this, frame);
        this.frame = frame;
    },

    goTo: function(flag, dx, dy) {
        var map = this.frame.map;
        console.log('stopped stepping for %s %s', dx, dy);
        if (!flag) {
            map.stopStepping();
            map.stepping = false;
        } else {
            map.startSteppingFunction(100, function(msTime) { 
                var value = this.getScale()*20;
                var vector = pt(value*dx, value*dy);
                this.moveBy(vector); 
                this.onScrollTest(vector);
            });
            map.stepping = true;
        }
    },
    
    isStepping: function() {
        console.log('is stepping %s', this.frame.map.stepping);
        return this.frame.map.stepping;
    },
    
    goRight: function(flag) {
        this.goTo(flag, -1, 0);
    },
    
    goLeft: function(flag) {
        this.goTo(flag, 1, 0);
    },

    goUp: function(flag) {
        this.goTo(flag, 0, 1);
    },
    
    goDown: function(flag) {
        this.goTo(flag, 0, -1);
    },
    
    setZoomIn: function(flag) {
        if (flag) this.frame.map.loadImagesToMap("zoomin");
    },
    
    setZoomOut: function(flag) {
        if (flag) this.frame.map.loadImagesToMap("zoomout");
    },

    setMapType: function(flag) {
        this.frame.map.changeMapType();
    },
    
    isSatelliteView: function() {
        return this.frame.map.selectedmap == SATELLITESFOLDER;
    }

});

/**
 * @class MapMorph
 *
 * Mapmorph is the 5x5 maptile largemap located inside Mapframe cliprect
 * It can be moved with dragging. 
 * When dragged longer distance than 1 tile new maps are loaded and map is centered
 *
 * May have mapmarkers as submorphs
 */

MapMorph = HostClass.create('MapMorph', Morph);

Object.extend(MapMorph.prototype, {
    initialize: function( initialBounds, online) { 
      pd("MapMorph",2);
      MapMorph.superClass.initialize.call(this,initialBounds,"rect");

      this.setFill(Color.blue.lighter());
      this.setBorderWidth(0);
      this.selectedmap = MAPSFOLDER; 
      this.selectedURL = [];
      this.selectedURL = MAPSURL;
      
      this.images = [ [], [], [], [], [] ];
      this.imagerects = [ [], [], [], [], [] ];
      
      //maparea 
      this.maparea = new MapArea();
      this.maparea.x = 0;
      this.maparea.y = 0;
      this.maparea.width = 3*TileSize.x;
      this.maparea.height = 3*TileSize.y;
      // Current map zoom ratio
      this.zoomRatio;
      this.mapmovedX = 0;
      this.mapmovedY = 0;
      //zoomobjects
      this.zo = []; 
      //image in process
      this.x = 0; //this.ix = 0;
      this.y = 0; //,this.iy = 0;
      /* Imagemap 5x5 matrix like this 3x3
      (x-1,y-1)  (x  ,y-1)  (x+1,y-1)
      (x-1,y  )  (x  ,y  )  (x+1,y  ) 
      (x-1,y+1)  (x  ,y+1)  (x+1,y+1)
      */
      this.imagesloaded = false;
      
      //these for calculatin moved amount
      this.startpoint = null;
      this.endpoint = null;
      
      this.pointerimages = [];
      
      this.online = online;
      this.hasFrame = false;
      this.initMap();

      this.stepping = false;
      return this;
    }, 
  
    copy: function() {
        var newMap = MapMorph.superClass.copy.call(this);
        newMap.removeAllMorphs();
        return newMap; 
    },

    draw: function() {
        var success = false;
        for (var iy = 0; iy < 5; iy ++) {
            for (var ix = 0; ix < 5; ix ++) {
                if (this.images[iy][ix]) {
                    // pd("adding image " + this.images[this.iy][this.ix] + " ix " + this.ix + " iy " + this.iy,2);
                    var imgId = "mapFragment_" + this.id + "_" + iy + "_" + ix;
                    var oldImg = document.getElementById(imgId);
                    if (oldImg) {
                        oldImg.parentNode.removeChild(oldImg);
                    }
    
                    var img = NodeFactory.create("image", 
                    {x: -TileSize.x + ix*TileSize.x, y: -TileSize.y + iy*TileSize.y, width: 256, height: 256}).withHref(this.images[iy][ix]);
                    img.setAttribute("id", imgId);
                    img.disableBrowserDrag();
                    this.addChildElement(img);
                }
            }
       }
       pd("Draw complete",2);
    
    }, 
  
  /*
  This function updates mapmovement and it also adds menu to mapframe
  */
  okToBeGrabbedBy: function(evt) {
    pd("coords" + evt.mousePoint + " center " + this.bounds().center()+ " in wc " +this.worldPoint(this.bounds().center()), 2);
    this.startpoint = evt.mousePoint; //this line is here only bacause this morph does not listen mousedown events
    return null; //otherwise map will be able to take out from mapframe  
  },
  
  handlesMouseDown: function(evt) {
      pd("handlesMouseDown", 2);
      return false;
  },
  
  onScrollTest: function(p) { 
      //pd("onScrollTest",3);
      var currentscale = this.getScale();
      this.mapmovedX += p.x;
      this.mapmovedY += p.y;
      // pd("moved x " + this.mapmovedX + " y " + this.mapmovedY, 2);
      if ( ( this.mapmovedX > TileSize.x*currentscale )) {
          //do until map is at place
          while ( this.mapmovedX > TileSize.x*currentscale) {
                    this.mapmovedX -= TileSize.x*currentscale;
                    this.mapX = -TileSize.x*currentscale;
                    //moving map right
                    //alert("right");
                    this.x -= 1;
                    this.x = this.getValueX(this.x);
                    this.loadImagesToMap("left");
                    this.moveBy(pt(-TileSize.x*currentscale,0));
          }
          
      } else if ( ( this.mapmovedX < -TileSize.x*currentscale) ) {
                //do until map is at place
                while ( this.mapmovedX < -TileSize.x*currentscale) {
                    this.mapmovedX += TileSize.x*currentscale;
                    this.mapX = -TileSize.x*currentscale;
                    //moving map left
                    //alert("left");
                    this.x += 1;
                    this.x = this.getValueX(this.x);
                    this.loadImagesToMap("right");
                    this.moveBy(pt(TileSize.x*currentscale,0));
                }
      }
      
      if ( ( this.mapmovedY < -TileSize.y*currentscale) ) {
                //do until map is at place
                while ( this.mapmovedY < -TileSize.y*currentscale) {        
                    this.mapmovedY += TileSize.y*currentscale;
                    this.mapY = -TileSize.y*currentscale;
                    //moving map up
                    //alert("up");
                    this.y += 1;
                    this.y = this.getValueY(this.y);
                    this.loadImagesToMap("down");
                    this.moveBy(pt(0,TileSize.y*currentscale));
                }

      } else if ( ( this.mapmovedY > TileSize.y*currentscale) ) {
                //do until map is at place
                while ( this.mapmovedY > TileSize.y*currentscale) {    
                    this.mapmovedY -= TileSize.y*currentscale;
                    this.mapY = -TileSize.y*currentscale;
                    //moving map down
                    //alert("down");
                    this.y -= 1;
                    this.y = this.getValueY(this.y);
                    this.loadImagesToMap("up");
                    this.moveBy(pt(0,-TileSize.y*currentscale));
   
                }
      }

      this.buttondown = false;
      this.startpoint = null;
      this.endpoint = null;
      this.changed();
  },
  
  addMapMarker: function(url, rect){
      if (rect == null) {rect = new Rectangle(this.shape.bounds.center().x,this.shape.bounds.center().y,16,20);}
      this.pointerimages.push(new MapMarkerMorph(url, rect, pt(0,0)));
      this.addMorph(this.pointerimages[this.pointerimages.length-1]);
  },
  
  getMapMarkers: function(){
      return this.pointerimages;
  },
  
  initMap: function(){
      this.initializeZoomObjects();
      this.zoomRatio = 13;
      //map starting position corner is topleft and not in screen but above it!
      this.mapX = this.maparea.x -TileSize.x, this.mapY = this.maparea.y -TileSize.y;
      this.mapmovedX = 0, this.mapmovedY = 0;
      this.x = this.zo[this.zoomRatio].hotspotX, this.y = this.zo[this.zoomRatio].hotspotY;
      this.loadInitImages();
      pd("init complete",2);
  },
  
  loadInitImages: function() {
        for (var iy = 0; iy < 5; iy += 1){
            for (var ix = 0; ix < 5; ix += 1){
            this.loadImagesCorrectly(ix, iy);
            }
        }
        this.draw();
        this.imagesloaded = true;
  },
  
  getValueX: function(x){
      var value = x;
      if (value < 0) value = this.zo[this.zoomRatio].maxX + 1 + value;
      if (value > this.zo[this.zoomRatio].maxX) value = value - this.zo[this.zoomRatio].maxX -1;
      return value;
  },
  
  getValueY: function(y){
      var value = y;
      if (value < 0) value = this.zo[this.zoomRatio].maxY + 1 + value; //for handling not only -1 but -x also
      if (value > this.zo[this.zoomRatio].maxY) value = value - this.zo[this.zoomRatio].maxY -1;
      return value;
  },
  
  loadImagesCorrectly: function(ix, iy){
    pd("loadImagesCorrectly ",2);
    var tempx = this.getValueX(this.x + ix -2);
    var tempy = this.getValueY(this.y + iy -2);
    var img = null;
    if (!this.online) img = this.loadImageFromDisk(tempx, tempy, this.zoomRatio);
    var satURL ="";
    //alert("URL x " + tempx + " y "+ tempy  + " xmax " + (1 + zo[zoomRatio].maxX) + " " + generateSatelliteURL(tempx,tempy));
    if (img){
        this.images[iy][ix] = img;
        //this.images[iy][ix] = new Pixmap(img , canvas.primCanvas, this.shape.bounds);
        this.imagerects[iy][ix] = new Rectangle(ix*TileSize.x, iy*TileSize.y, TileSize.x*5, TileSize.y*5);
        if (this.images[iy][ix] == null ) {
              pd("--image is NULL!", 5);
        } else {pd("loaded image from file:" + this.images[iy][ix], 5);}
    } else {
        pd("Loading",2);
        if (this.selectedURL == MAPSURL){
            img = this.selectedURL[0] + tempx + this.selectedURL[1] + tempy + this.selectedURL[2] + this.zoomRatio;
        } else if (this.selectedURL == SATELLITESURL){
            satURL = this.generateSatelliteURL(tempx,tempy);
            img = this.selectedURL[0] + satURL;
        }
        if (img != null ){
            if (this.selectedURL == MAPSURL){
                //saveImageToDisk(this.selectedURL[0] + tempx + this.selectedURL[1] + tempy + this.selectedURL[2] + zoomRatio, tempx, tempy,zoomRatio);
            } else if (this.selectedURL == SATELLITESURL){
                satURL = this.generateSatelliteURL(tempx,tempy);
                //saveImageToDisk(this.selectedURL[0] + satURL, tempx, tempy,zoomRatio);
            }
            pd("Loading img online:" + img + " ix " + ix + " iy " + iy, 2);
            this.images[iy][ix] = img;
            this.imagerects[iy][ix] = new Rectangle(ix*TileSize.x, iy*TileSize.y, TileSize.x*5, TileSize.y*5);
            
        } else {
            //alert("error processing ixiy" + ix + iy + " image " + img);
            this.images[iy][ix] = null; 
            this.imagerects[iy][ix] = null;
            pd("Error processing map image",6);
        }
    }
    this.changed();
  },
  
  /*Tries to find image from file
    if not found 
    returns null                    TODO find how to tell if url has content.?
    or
    image
  */
  loadImageFromDisk: function(x,y,zoom){
    var filename = "map"+x+"_"+y+".png";
    var foldername = "file:" + this.selectedmap + "/" +zoom+ "/";
    pd("loaded: " + foldername+filename,1);
    return foldername+filename;
  },
  
  loadImagesToMap: function(direction) {
      pd("MapMorph.prototype.loadImagesToMap direction" + direction,2);
      switch (direction) {
      case "down":
            this.rollImage(direction);
            var iy = 4;
            for (var ix = 0; ix < 5; ix += 1){
                this.loadImagesCorrectly(ix, iy);    
            }
            this.imagesloaded = true;
            break;
      case "up":
            this.rollImage(direction);
            var iy = 0;
            for (var ix = 0; ix < 5; ix ++) {
                this.loadImagesCorrectly(ix, iy);   
            }
            this.imagesloaded = true;
            break;
      case "right":
            this.rollImage(direction);
            var ix = 4;
            for (var iy = 0; iy < 5; iy ++) {
                this.loadImagesCorrectly(ix, iy);  
            }
            this.imagesloaded = true;
            break;    
      case "left":
            this.rollImage(direction);
            var ix = 0;
            for (var iy = 0; iy < 5; iy ++) {
                this.loadImagesCorrectly(ix, iy);    
            }
            this.imagesloaded = true;
            break;
      case "zoomin":
            this.ZoomIn();
            break;
      case "zoomout":
            this.ZoomOut();
            break;
    
      }
      this.draw();
      this.changed();
  },
  
    ZoomIn: function() {
        pd("MapMorph.prototype.ZoomIn",2);
        this.zoomRatio -= 1;
        if (this.zoomRatio < 0) {
            this.zoomRatio = 0;
            pd("Minimum zoom level reached",6);
        } else {
            //try to keep the center in same position in new zoom
            this.x = this.x*2
            this.y = this.y*2;
        }
        this.loadInitImages();
    },
  
    ZoomOut: function() {
        pd("MapMorph.prototype.ZoomOut",2);
        this.zoomRatio += 1;
        if (this.zoomRatio > 16) {
            this.zoomRatio = 16;
            pd("Maximum zoom level reached",6);
        } else {
            //try to keep the center in same position in new zoom
            this.x = Math.floor(this.x/2);
            this.y = Math.floor(this.y/2);
        }
        this.loadInitImages();
    },
    
  generateSatelliteURL: function(x,y){
      //pd("MapMorph.prototype.generateSatelliteURL",2);
    var tempx = x;
    var tempy = y;
    var x_max = 0;
    x_max = (1 + this.zo[this.zoomRatio].maxX);
    var zoom = this.zoomRatio;
    var URLstring = "t";
    /*QuadTree search for mapURL*/
    //for (var i = 0; i < (17 - zoomRatio); i++){
    while (x_max > 1) {
        if ( tempx > (x_max/2) ){
            if ( tempy > (x_max/2) ){
                //downright s
                URLstring += "s";
                //reduce y by half of ymax to next round
                tempy = tempy - x_max/2;
            } else {
                //toprigth r
                URLstring += "r";
            }
            //reduce x by half of ymax to next round
            tempx = tempx - x_max/2;
        } else {
            if ( tempy > (x_max/2) ){
                //downleft t
                URLstring += "t";
                //reduce y by half of ymax to next round
                tempy = tempy - x_max/2;
            } else {
                //topleft q
                URLstring += "q";
            }

        }
        x_max = x_max / 2;//zo[16 - i ].maxY +1;
    }
    pd("MapMorph.prototype.generateSatelliteURL returns string" + URLstring,1);
    return URLstring;
    
  },

    changeMapType: function() {
        pd("MapMorph.prototype.ChangeMapType",2);
        if (this.selectedmap == SATELLITESFOLDER){
            this.selectedmap = MAPSFOLDER;
            this.selectedURL = MAPSURL;
            this.loadInitImages();
        } else if (this.selectedmap == MAPSFOLDER){
            this.selectedmap = SATELLITESFOLDER;
            this.selectedURL = SATELLITESURL;
            this.loadInitImages();
            //alert("Entering experimental mapmode.");
        }
        this.changed();
  },

  // Move the imagematrix to some direction
  // done before loading images
  rollImage: function(direction) {
    pd("MapMorph.prototype.rollImage direction" + direction,2);
    switch (direction) {

    case "down":
        this.images[0][0] = this.images[1][0];
        this.images[0][1] = this.images[1][1];
        this.images[0][2] = this.images[1][2];
        this.images[0][3] = this.images[1][3];
        this.images[0][4] = this.images[1][4];
                        
        this.images[1][0] = this.images[2][0];
        this.images[1][1] = this.images[2][1];
        this.images[1][2] = this.images[2][2];
        this.images[1][3] = this.images[2][3];
        this.images[1][4] = this.images[2][4]; 
                
        this.images[2][0] = this.images[3][0];
        this.images[2][1] = this.images[3][1];
        this.images[2][2] = this.images[3][2];
        this.images[2][3] = this.images[3][3];
        this.images[2][4] = this.images[3][4];   
              
        this.images[3][0] = this.images[4][0];
        this.images[3][1] = this.images[4][1];
        this.images[3][2] = this.images[4][2];
        this.images[3][3] = this.images[4][3];
        this.images[3][4] = this.images[4][4]; 
        //roll also mapmarks
        for(var i = 0; i < this.pointerimages.length; i++){
            this.pointerimages[i].moveBy(pt(0, -TileSize.y));
        }              
        //images.shift();
        break;

    case "up":
        this.images[4][0] = this.images[3][0];
        this.images[4][1] = this.images[3][1];
        this.images[4][2] = this.images[3][2];
        this.images[4][3] = this.images[3][3];
        this.images[4][4] = this.images[3][4]; 
               
        this.images[3][0] = this.images[2][0];
        this.images[3][1] = this.images[2][1];
        this.images[3][2] = this.images[2][2];
        this.images[3][3] = this.images[2][3];
        this.images[3][4] = this.images[2][4]; 
            
        this.images[2][0] = this.images[1][0];
        this.images[2][1] = this.images[1][1];
        this.images[2][2] = this.images[1][2];
        this.images[2][3] = this.images[1][3];
        this.images[2][4] = this.images[1][4]; 
               
        this.images[1][0] = this.images[0][0];
        this.images[1][1] = this.images[0][1];
        this.images[1][2] = this.images[0][2];
        this.images[1][3] = this.images[0][3];
        this.images[1][4] = this.images[0][4];        

        //images[2] = images[1]; // DO NOT DO THIS, -> javascript nice copy-features
        //images[1] = images[0];
        
        //roll also mapmarks
        for(var i = 0; i < this.pointerimages.length; i++){
            this.pointerimages[i].moveBy(pt(0, TileSize.y));
        }
        break;
    
    case "right":
        this.images[0][0] = this.images[0][1];
        this.images[1][0] = this.images[1][1];
        this.images[2][0] = this.images[2][1];
        this.images[3][0] = this.images[3][1];
        this.images[4][0] = this.images[4][1];       
        
        this.images[0][1] = this.images[0][2];
        this.images[1][1] = this.images[1][2];
        this.images[2][1] = this.images[2][2];
        this.images[3][1] = this.images[3][2];
        this.images[4][1] = this.images[4][2]; 

        this.images[0][2] = this.images[0][3];
        this.images[1][2] = this.images[1][3];
        this.images[2][2] = this.images[2][3];
        this.images[3][2] = this.images[3][3];
        this.images[4][2] = this.images[4][3]; 

        this.images[0][3] = this.images[0][4];
        this.images[1][3] = this.images[1][4];
        this.images[2][3] = this.images[2][4];
        this.images[3][3] = this.images[3][4];
        this.images[4][3] = this.images[4][4]; 
        for(var i = 0; i < this.pointerimages.length; i++){
            this.pointerimages[i].moveBy(pt(-TileSize.x, 0));
        }                    
        break;

    case "left":
        this.images[0][4] = this.images[0][3];
        this.images[1][4] = this.images[1][3];
        this.images[2][4] = this.images[2][3];
        this.images[3][4] = this.images[3][3];
        this.images[4][4] = this.images[4][3];

        this.images[0][3] = this.images[0][2];
        this.images[1][3] = this.images[1][2];
        this.images[2][3] = this.images[2][2];
        this.images[3][3] = this.images[3][2];
        this.images[4][3] = this.images[4][2];
    
        this.images[0][2] = this.images[0][1];
        this.images[1][2] = this.images[1][1];
        this.images[2][2] = this.images[2][1];
        this.images[3][2] = this.images[3][1];
        this.images[4][2] = this.images[4][1];        
        
        this.images[0][1] = this.images[0][0];
        this.images[1][1] = this.images[1][0];
        this.images[2][1] = this.images[2][0];
        this.images[3][1] = this.images[3][0];
        this.images[4][1] = this.images[4][0];        
        for(var i = 0; i < this.pointerimages.length; i++){
            this.pointerimages[i].moveBy(pt(TileSize.x, 0));
        }      
        break;
    }
  },
  
  /*Initializes Map areas for each zoomlevel
  Hotspots are the locations of Tampere at the moment
  */
  initializeZoomObjects: function(){
    //zo.length = 18
    for (var i = 0; i < 18; i +=1){
        this.zo[i] = null;
    }

    //alert("zo length " + zo.length);
    this.zo[0] = new Zoomlevel();
    this.zo[0].maxX = 130880;     //estimate
    this.zo[0].maxY = 130880;     //estimate
    this.zo[0].hotspotX = 74188;
    this.zo[0].hotspotY = 36946;
    
    this.zo[1] = new Zoomlevel();
    this.zo[1].maxX = 65540;     //estimate
    this.zo[1].maxY = 65440;     //estimate
    this.zo[1].hotspotX = 37094;
    this.zo[1].hotspotY = 18473;
    
    this.zo[2] = new Zoomlevel();
    this.zo[2].maxX = 32736;     //estimate
    this.zo[2].maxY = 32736;     //estimate
    this.zo[2].hotspotX = 18547;
    this.zo[2].hotspotY = 9236;
    
    this.zo[3] = new Zoomlevel();
    this.zo[3].maxX = 16368;     //estimate
    this.zo[3].maxY = 16368;     //estimate
    this.zo[3].hotspotX = 9273;
    this.zo[3].hotspotY = 4618;
    
    this.zo[4] = new Zoomlevel();
    this.zo[4].maxX = 8184;     //estimate
    this.zo[4].maxY = 8184;     //estimate
    this.zo[4].hotspotX = 4636;
    this.zo[4].hotspotY = 2309;
    
    this.zo[5] = new Zoomlevel();
    this.zo[5].maxX = 4092;     //estimate
    this.zo[5].maxY = 4092;     //estimate
    this.zo[5].hotspotX = 2318;
    this.zo[5].hotspotY = 1154;
    
    this.zo[6] = new Zoomlevel();
    this.zo[6].maxX = 2047;     //estimate
    this.zo[6].maxY = 2047;     //estimate
    this.zo[6].hotspotX = 1159;
    this.zo[6].hotspotY = 577;
        
    this.zo[7] = new Zoomlevel();
    this.zo[7].maxX = 1023;
    this.zo[7].maxY = 1023;
    this.zo[7].hotspotX = 579;
    this.zo[7].hotspotY = 288;
    
    this.zo[8] = new Zoomlevel();
    this.zo[8].maxX = 511;
    this.zo[8].maxY = 511;
    this.zo[8].hotspotX = 289;
    this.zo[8].hotspotY = 144;
    
    this.zo[9] = new Zoomlevel();
    this.zo[9].maxX = 255;
    this.zo[9].maxY = 255;
    this.zo[9].hotspotX = 144;
    this.zo[9].hotspotY = 72;
    
    this.zo[10] = new Zoomlevel();
    this.zo[10].maxX = 127;
    this.zo[10].maxY = 127;
    this.zo[10].hotspotX = 72;
    this.zo[10].hotspotY = 36;
    
    this.zo[11] = new Zoomlevel();
    this.zo[11].maxX = 63;
    this.zo[11].maxY = 63;
    this.zo[11].hotspotX = 36;
    this.zo[11].hotspotY = 18;
    
    this.zo[12] = new Zoomlevel();
    this.zo[12].maxX = 31;
    this.zo[12].maxY = 31;
    this.zo[12].hotspotX = 18;
    this.zo[12].hotspotY = 8;
    
    this.zo[13] = new Zoomlevel();
    this.zo[13].maxX = 15;
    this.zo[13].maxY = 15;
    this.zo[13].hotspotX = 8;
    this.zo[13].hotspotY = 4;
    
    this.zo[14] = new Zoomlevel();
    this.zo[14].maxX = 7;
    this.zo[14].maxY = 7;
    this.zo[14].hotspotX = 4;
    this.zo[14].hotspotY = 2;
    
    this.zo[15] = new Zoomlevel();
    this.zo[15].maxX = 3;
    this.zo[15].maxY = 3;
    this.zo[15].hotspotX = 2;
    this.zo[15].hotspotY = 1;
    
    this.zo[16] = new Zoomlevel();
    this.zo[16].maxX = 1;
    this.zo[16].maxY = 1;
    this.zo[16].hotspotX = 1;
    this.zo[16].hotspotY = 1;

  }
  
});

    // module exports
    return { MapFrameMorph: MapFrameMorph, tileExtent: TileSize }

}(); // end of the map demo module

// ===========================================================================
// The Bouncing Spheres Example
// ===========================================================================

/**
 * @class BouncingSpheres
 */

var BouncingSpheres = Class.create();

Object.extend(BouncingSpheres, {
    makeCircleGrid: function (itemCount) {
        var canvasWidth = this.canvas().bounds().width;
        var canvasHeight = this.canvas().bounds().height;

        var minR = 10, maxR = canvasWidth / 3;

        for (var j = 0; j < itemCount; ++j) {
            var r = BouncingSpheres.getRandSkewed(minR, maxR);
            var cx = BouncingSpheres.getRand(r,  canvasWidth  - r);
            var cy = BouncingSpheres.getRand(r,  canvasHeight - r);
            //console.log([r, cx, cy]);
    
            var aShape  = Morph(Rectangle(cx - r, cy - r, 2*r, 2*r), "ellipse");
            aShape.setFill(BouncingSpheres.randColor(true));
            aShape.setBorderColor(BouncingSpheres.randColor(true));
            aShape.setFillOpacity(BouncingSpheres.getRand(0, 1));
            aShape.setBorderWidth(BouncingSpheres.getRand(0, 3));
            aShape.fullRadius = r + aShape.shape.getStrokeWidth();
    
            WorldMorph.current().addMorph(aShape);
    
            aShape.vector = Point.polar(15, BouncingSpheres.getRand(0, Math.PI *2));
            aShape.startSteppingFunction(30,function(msTime) {

                // var pt = this.getTranslation();
                this.translateBy(this.vector);
                var worldpt = this.origin;

                if ((worldpt.x - this.fullRadius < 0) || (worldpt.x + this.fullRadius > canvasWidth)) {
                    this.vector.x = -this.vector.x;
                }

                if ((worldpt.y - this.fullRadius < 0) || (worldpt.y + this.fullRadius > canvasHeight)) {
                    this.vector.y = - this.vector.y;
                }

            });
            
        }
    },

    getRand: function(from, to) {
        return Math.random() * (to - from) + from;
    },
    
    getRandSkewed: function(from, to) {
        // let skew stats to smaller values
        var seed = 0;

        for (var i = 0; i < BouncingSpheres.skew_stat_factor; ++i) {
            seed += Math.random();
        }

        seed = 2 * Math.abs(seed / BouncingSpheres.skew_stat_factor - 0.5);
        return seed * (to - from) + from;
    },
    
    skew_stat_factor: 15,
    
    randColor: function(alpha) {
        var red   = BouncingSpheres.getRand(0, 1);
        var green = BouncingSpheres.getRand(0, 1);
        var blue  = BouncingSpheres.getRand(0, 1);
        var opacity = 1;
        var color = new Color(red, green, blue);
        return color;    
    }

});
    
// ===========================================================================
// The Instant Messenger Widget Example
// ===========================================================================

/**
 * @class MessengerWidget
 * Placeholder for an instant messenger widget (to be completed) 
 */
 
MessengerWidget = Class.extend(Model);

Object.extend(MessengerWidget.prototype, {

    initialize: function() { 
        MessengerWidget.superClass.initialize.call(this);
        //this.id = 1971055351;
        this.id = Math.round(Math.random()*2147483647);
        this.text = "";
        this.chatroom = "";
        this.server = "http://dev.experimentalstuff.com:8093/";
//        console.log("address == " + this.server + "foreground.html?login=IM");
        var id = this.id
        new Ajax.Request(this.server + "foreground.html?login=IM", { 
            method: 'get',
            
            onSuccess: function(transport) {
//                console.log("accessing database: " + id +"\n" + transport.responseText);
            },
            
            onFailure: function(transport) {
                console.log(transport.responseText);
            },
    
            onException: function(e) {
            }
        });
    },
    
    openIn: function(world, location) {
        world.addMorphAt(WindowMorph(this.buildView(), 'Instant Messenger'), location);
    },
    
    buildView: function() {
        var panel = PanelMorph(pt(300, 255));
        panel.setBorderWidth(2);
        panel.setFill(LinearGradient.makeGradient(Color.white, Color.primary.blue.lighter(), LinearGradient.EastWest));
        var m = null;
        panel.addMorph(this.textpanel = TextPane( Rectangle(10, 10, 280, 180), " ")).connectModel({model: this, getText: "getChatText", setText: "setChatText"});
//        m.innerMorph().autoAccept = true;
        panel.addMorph(m = TextMorph( Rectangle(10, 210, 220, 50), "<enter text here>")).connectModel({model: this, getText: "getIMText", setText: "setIMText"});
        m.autoAccept = true;
        panel.addMorph(m = ImageButtonMorph(Rectangle(240, 200,  50,  50), 
        "http://www.cs.tut.fi/~taivalsa/Software/Talk.PNG", "http://www.cs.tut.fi/~taivalsa/Software/Talk_down.PNG")).connectModel({model: this, setValue: "send"});
        // disable the 2 set value calls for the button
        m.onMouseUp = function(evt) {
            var newValue = this.isToggle() ? !this.getValue() : false;
            this.changeAppearanceFor(newValue); 
        };        
        return panel;
    },
    
    setIMText: function(newtext) {
        this.text = newtext;
        this.changed("getIMText");
    },

    getIMText: function() {
        return this.text;
    },

    getChatText: function() {
        return this.chatroom;
    },

    setChatText: function(newtext) {
        if ( this.chatroom == "" ) {
            this.chatroom = newtext + "\n";
        } else {
            this.chatroom = this.getChatText() + newtext + "\n";
        }
        this.changed("getChatText");
    },
    
    send: function() {
        var parent = this;
        if ( this.text != null && this.text != "" ) {
            new Ajax.Request(this.server + "foreground.html?action=updatemany&key." + this.id + "=" + this.text, { 
                method: 'get',
                
                onSuccess: function(transport) {
                    parent.setChatText(parent.id + ": " + parent.getIMText()); // add the current line immediately
                    parent.setIMText(""); // yes yes.. so its a little laggy to add the current line and delete it...
                    parent.textpanel.setScrollPosition(1);//this.textpanel.innerMorph().bounds().height);
                },
                
                onFailure: function(transport) {
                    console.log('problem with %s', transport);
                },
        
                onException: function(e) {
                    console.log('exception  %s, %s', e, Object.toJSON(e));
                }
            });
        }
        
        this.load();
    }, 
    
    load: function() {
        var parent = this;
        new Ajax.Request(this.server + "background.html", { 
            method: 'get',
            
            onSuccess: function(transport) {
                // what crap is coming with the response?? function something something..
                try {
                    var end = transport.responseText.indexOf("function");
                    if ( end == -1 ) {
                        var text = transport.responseText.substr(0);
                    } else {
                        var text = transport.responseText.substring(0, end);
                    }
                    parent.parseResponse(text);
                    parent.textpanel.setScrollPosition(1);//this.textpanel.innerMorph().bounds().height);
                } catch (e) { console.log('got error %s', e); }
            },
            
            onFailure: function(transport) {
                console.log('problem with %s', transport);
            },
    
            onException: function(e) {
                console.log('exception on load function %s, %s', e, Object.toJSON(e));
            }
        });

    },
    
    parseResponse: function (response) {
        // remove whitespaces
        //var IDstring = response.replace(/\(\{(.*)\}\)/gm, " ");
//        console.log("parsing response %s", response);
        var IDstring = response.replace(/^\s+|\s+$/g, '');
        var IDs = IDstring.match(/\d+/g);
        if ( !IDs ) {
            return;
        }
        for ( var i = 0; i < IDs.length; i++ ) {
            if ( IDs[i] != this.id ) {
                // parse answer..
                // gets the line from the first '=', starting from the location of the given ID
                var begin = response.indexOf("=", response.indexOf(IDs[i]))+1;
                var end = response.indexOf("=", begin);
                if ( end == -1 ) {
                    end = response.length;
                }
                var contents = response.substring(begin, end);
                var line = ""; 
                if (IDs.length > 1) {
                    var lastwhitespace = contents.lastIndexOf(" ");
                    line = contents.substring(0, lastwhitespace);
                } else {
                    line = contents;
                }
                line = line.replace(/^\s+|\s+$/g, ''); // remove white spaces
                console.log(i + ": " + IDs[i] + "=" + line + "\n");

                // set it to chat window
                if ( line != "" || line != null ) {
                    this.setChatText(IDs[i] + ": " + line);
                }
            }
/*
// FIXME: kill the database if needed           
                new Ajax.Request(this.server + "foreground.html?action=updatemany&key." + IDs[i] + "=", { 
                method: 'get',
                
                onSuccess: function(transport) {
                },
                
                onFailure: function(transport) {
                    console.log('problem with %s', transport);
                },
        
                onException: function(e) {
                    console.log('exception  %s, %s', e, Object.toJSON(e));
                }
            });*/
        }
    }
    
});

// ===========================================================================
// The CanvasScape 3D Maze Walker Example
// ===========================================================================

// This code is derived from an implementation written and copyrighted
// by Abraham Joffe (http://www.abrahamjoffe.com.au/ben/canvascape/).
// We have intentionally left the gun out of the game...  

/**
 * @class MiniMapMorph: The "radar view" for the game
 */

MiniMapMorph = HostClass.create('MiniMapMorph', Morph);

Object.extend(MiniMapMorph.prototype, {

    initialize: function(rect) {
        MiniMapMorph.superClass.initialize.call(this, rect, "rect");
        console.log("minimap init"); 
        this.setFill(Color.black); 
        this.x = rect.topLeft().x;
        this.y = rect.topLeft().y;
        this.width = 0;//8*arena.length;
        this.height = 0;//8*arena[0].length;
        this.color = Color.yellow;//0xcc33333;
        this.background = Color.black;
        this.px = 0;//this.x + this.width / 2; //player pos
        this.py = 0;//this.y +  this.height / 2;       
        this.player;
        console.log("minimap init done"); 
        
        return this;
    }, 
    
    updatePlayerLocation: function(xloc, yloc) {
        //this.pLoc = this.worldPoint(pt(xloc,yloc));
        //console.log("location " + this.pLoc.x + " " + this.pLoc.y);
        if (this.player) {
          this.removeMorph(this.player)
          this.player = Morph(Rectangle(xloc -3, yloc -3, 6, 6),"ellipse");   
          this.player.setFill(Color.blue);
          this.addMorph(this.player);
        } else {
          this.player = Morph(Rectangle(xloc -3, yloc -3, 6, 6),"ellipse");   
          this.player.setFill(Color.blue);
          this.addMorph(this.player);
        }
    }, 
    
    getPlayerLocation: function(){
        return this.pLoc;
    }
    
});

/**
 * @class CanvasScapeMorph
 */

CanvasScapeMorph = HostClass.create('CanvasScapeMorph', ClipMorph);

Object.extend(CanvasScapeMorph.prototype, {
    
    initialize: function(rect) {
        CanvasScapeMorph.superClass.initialize.call(this, rect, "rect");
        console.log("init"); 
        this.setFill(Color.veryLightGray);
        this.initParameters();
        this.initGame(); 
        this.loadLevel(1);
        //this.initUnderMap();
        this.addMorph(this.map);
        return this;
    }, 
    
    initGame: function() {
        console.log("initGame"); 
        this.level = "Level 1";
        this.timepassed = 0;
        this.mseconds = 0;
        this.timeleft = this.level1time;
        this.timepassed = 0;
        this.found = 0;
        this.gameon = true;
        this.timeleft = this.level1time;
        this.playerPos=[2,2]; // x,y (from top left)
        this.playerDir=0.2; // theta, facing right=0=2pi
        this.note = "Click on the floor and press space bar to start the game. Use arrow keys to steer yourself through the maze.";
        this.drawCanvas();
        //this.startSteppingFunction(200, function(msTime) { this.changeKey( 37, 1); });
        //this.startSteppingFunction(1000, function(msTime) { /*changeKey(37, 1);*/  });
    },
    
    handlesMouseDown: function() {
        return true;
    },

    onMouseDown: function(evt) {
        this.requestKeyboardFocus(evt.hand);
        return true; 
    },
   
    setHasKeyboardFocus: function(newSetting) { 
        return newSetting;
    },
    
    takesKeyboardFocus: function() {
        return true; 
    },

    onKeyDown: function(evt) { 
        this.keyDown(evt);
        return true; 
    },

    onKeyUp: function(evt) { 
        this.keyUp(evt);
        return true; 
    },

    initParameters: function(){
        console.log("initParameters");
        this.startint = 0;
        this.sinterval = 0;
        this.level1time = 70;
        this.level2time = 80;
        this.level3time = 180;
      
        this.arena=[];
        this.arena[0]= [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        this.arena[1]= [1,0,0,0,2,0,0,0,0,0,1,2,0,1]
        this.arena[2]= [1,0,0,1,0,1,1,1,0,0,0,0,1,1]
        this.arena[3]= [1,0,1,0,0,0,0,1,0,0,1,0,0,1]
        this.arena[4]= [1,0,0,0,0,1,0,1,0,0,1,1,0,1]
        this.arena[5]= [1,0,1,1,0,0,0,0,0,0,0,0,0,1]
        this.arena[6]= [1,0,2,1,0,1,1,1,0,0,1,2,1,1]
        this.arena[7]= [1,1,0,1,0,0,0,1,0,0,0,0,0,1]
        this.arena[8]= [1,0,0,1,0,1,0,0,0,0,1,1,0,1]
        this.arena[9]= [1,0,2,0,0,1,0,0,0,0,1,2,0,1]
        this.arena[10]=[1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        this.found  = 0;
        this.maxobjects = 6; // number 2:s in map
      
        if (!this.difficulty) this.difficulty = "medium";
      
        this.gameon = false;
        this.sky = ImageMorph(Rectangle(0,20,4800,150), "Resources/canvasscape/sky2.jpg");
        this.sky.setHasKeyboardFocus = function(newSetting) { return newSetting;
        this.owner().setHasKeyboardFocus( true); };
        this.sky.takesKeyboardFocus = function() { this.owner().setHasKeyboardFocus( true);};
        this.sky.onKeyUp = function(evt) {console.log("skyonup")}; 
        this.sky.onKeyDown = function(evt) {console.log("skyondown")};
        this.sky.relayMouseEvents(this, {onKeyDown: "onKeyDown", onKeyUp: "onKeyUp", setHasKeyboardFocus: "setHasKeyboardFocus", takesKeyboardFocus: "takesKeyboardFocus"});
        this.addMorph(this.sky);
      
        /*this.floor = ImageMorph(Rectangle(0,150, 450, 150), "http://www.cs.tut.fi/~reijula/images/floor.png");
        this.floor.setScale(2);
        this.floor.relayMouseEvents(this, {onKeyDown: "onKeyDown", onKeyUp: "onKeyUp"});
        this.addMorph(this.floor);*/
        
        this.objArray = new Array();    
        this.overlay;      
        this.pi=Math.PI;    
        this.total=0;     
        this.samples=400;
        this.playerPos=[2,2]; // x,y (from top left)
        this.playerDir=0.2; // theta, facing right=0=2pi
        this.playerPosZ=1;
        this.key=[0,0,0,0,0]; // left, right, up, down
        this.playerVelY=0;
        this.face=[];
        this.jumpCycle=0;
        this.color = Color.red;
        this.note = "";
        this.map = MiniMapMorph(Rectangle(5,25,8*this.arena.length,8*this.arena[0].length));
        this.morphArray =[];
        console.log("initParameters completed");
    },
     
    wallDistance: function(theta) {

        var data=[];
        this.face=[];
    
        var x = this.playerPos[0], y = this.playerPos[1];
        var deltaX, deltaY;
        var distX, distY;
        var stepX, stepY;
        var mapX, mapY;
        
        var atX=Math.floor(x), atY=Math.floor(y);
    
        var thisRow=-1;
        var thisSide=-1;
    
        var lastHeight=0;
    
        this.objArray = new Array();
      
        for (var i=0; i<this.samples; i++) {
            theta+=this.pi/(3*this.samples)+2*this.pi;
            theta%=2*this.pi;
    
            mapX = atX, mapY = atY;
    
            deltaX=1/Math.cos(theta);
            deltaY=1/Math.sin(theta);
    
            if (deltaX>0) {
                stepX = 1;
                distX = (mapX + 1 - x) * deltaX;
            } else {
                stepX = -1;
                distX = (x - mapX) * (deltaX*=-1);        
            }
            
            if (deltaY>0) {
                stepY = 1;
                distY = (mapY + 1 - y) * deltaY;
            } else {
                stepY = -1;
                distY = (y - mapY) * (deltaY*=-1);
            }

            for (var j=0; j<20; j++) {
                if (distX < distY) {
                    mapX += stepX;
                    //drawString(0,75, "a mapx " + mapX + " mapy " + mapY);
                    if (this.arena[mapX][mapY]) {
                        if (thisRow!=mapX || thisSide!=0) {
    
                            if (i>0) {
                                if (this.arena[mapX][mapY] == 2){
                                    this.objArray.push(data.length);
                                }
                                data.push(i);
                                data.push(lastHeight);
                            }
                            if (this.arena[mapX][mapY] == 2){
                                this.objArray.push(data.length);
                            }
                            data.push(i);
                            data.push(distX);
                            thisSide=0;
                            thisRow=mapX;
    
                            this.face.push(1+stepX);
                        }
                        lastHeight=distX;
                        break;
                    }
                    distX += deltaX;
                }
                else {
                    mapY += stepY;
                    if (this.arena[mapX][mapY]) {
                        if (thisRow!=mapY || thisSide!=1) {
                            
                            if (i>0) {
                                if (this.arena[mapX][mapY] == 2){
                                this.objArray.push(data.length);
                                }
                                data.push(i);
                                data.push(lastHeight);
                            }
                            if (this.arena[mapX][mapY] == 2){
                                this.objArray.push(data.length);
                            }    
                            data.push(i);
                            data.push(distY);
                            thisSide=1;
                            thisRow=mapY;
    
                            this.face.push(2+stepY)
                        }
                        lastHeight=distY;
                        break;
                    }
                    distY += deltaY;
                }
            }
        }
        data.push(i);
        data.push(lastHeight);
        return data;
    }, 
    
    drawCanvas: function(){
        var morppi;

        //console.log("ma" + this.morphArray.length + " " + this.submorphs.length);
        for (var r = 0; r < this.morphArray.length; r++){
            this.morphArray[r].remove();
        }
        
        this.morphArray = [];
        // drawImage(Math.floor(-this.playerDir/(2*this.pi)*2400), canvas.y, sky);
        // console.log("imgpos" + -this.playerDir/(2*this.pi)*2400);
        this.sky.setPosition(pt( -this.playerDir/(2*this.pi)*2400, 0));
        
        morppi = TextMorph(Rectangle(0,0,800,20));
        morppi.setTextString(this.level+ ". Blue walls found " + this.found + " / " + this.maxobjects + ". Time left: " + this.timeleft + ". Time passed: " + this.timepassed);
        morppi.relayMouseEvents(this, {onMouseDown: "onMouseDown", onMouseUp: "onMouseUp"});
        this.addMorph(morppi);
        this.morphArray.push(morppi);
        
        if (this.note != "") {
            morppi = TextMorph(Rectangle(0,280,800,20));
            morppi.setTextString(this.note);
            morppi.relayMouseEvents(this, {onMouseDown: "onMouseDown", onMouseUp: "onMouseUp"});
            this.addMorph(morppi);
            this.morphArray.push(morppi);
        }
        
        var theta = this.playerDir-this.pi/6;    
        var wall=this.wallDistance(theta);
        this.map.updatePlayerLocation(8*this.playerPos[0], 8*this.playerPos[1]);
        this.color = Color.black;//setColor(0);

        var linGrad;
        var tl,tr,bl,br;        
        var theta1,theta2,fix1,fix2;
        var drawobject = false;

        for (var i=0; i<wall.length; i+=4) {
    
            theta1=this.playerDir-this.pi/6 + this.pi*wall[i]/(3*this.samples);
            theta2=this.playerDir-this.pi/6 + this.pi*wall[i+2]/(3*this.samples);
            
            fix1 = Math.cos(theta1-this.playerDir);
            fix2 = Math.cos(theta2-this.playerDir);
    
            var h=2-this.playerPosZ;
    
            var wallH1=100/(wall[i+1]*fix1);
            var wallH2=100/(wall[i+3]*fix2);
    
            tl=[wall[i]*2, 150-wallH1*h];
            tr=[wall[i+2]*2, 150-wallH2*h]
            br=[wall[i+2]*2, tr[1]+wallH2*2];
            bl=[wall[i]*2, tl[1]+wallH1*2]
    
            var shade1=Math.floor(wallH1*2+20); if (shade1>255) shade1=255;
            var shade2=Math.floor(wallH2*2+20); if (shade2>255) shade2=255;
    
            drawobject = false;
            for (var s = 0; s < this.objArray.length; s+=1) {
                //stop("oA " + this.objArray[s] + " i " + i + " len " + this.objArray.length + " " + wall.length);
                if ( (this.objArray[s] >= i-1) && (this.objArray[s] < i + 2) ) {
                    //wall is an object
                    //setColor(0xcc3333);
                    wallH1=100/(wall[i+1]*fix1);
                    wallH2=100/(wall[i+3]*fix2);
    
                    tl=[wall[i]*2, 150-wallH1*h];
                    tr=[wall[i+2]*2, 150-wallH2*h]
                    br=[wall[i+2]*2, tr[1]+wallH2*2];
                    bl=[wall[i]*2, tl[1]+wallH1*2]
                    drawobject = true;
                }
            }

            if ( (i/4)%2 == 0) {
                var c = ((this.face[i/4]%2==0 ? shade1 : 1) * (this.face[i/4]==1 ? shade1 : 1) * (this.face[i/4]==2 ? 1 : shade1))/255;
                this.color= new Color(shade1/512,shade1/512,shade1/512);
            } else {
                var c = ((this.face[i/4]%2==0 ? shade1 : 1) * (this.face[i/4]==1 ? shade1 : 1) * (this.face[i/4]==2 ? 1 : shade1))/255;
                this.color= new Color(c,c,c);
                this.color= new Color(shade2/512,shade2/512,shade2/512);
            }

            if (drawobject) {
                morppi = Morph(pt(0,0).asRectangle(),"rect"); // polygon
                morppi.relayMouseEvents(this, {onMouseDown: "onMouseDown", onMouseUp: "onMouseUp"});
                morppi.setShape(PolygonShape([pt(tl[0],tl[1]),pt(tr[0],tr[1]),pt(br[0],br[1]),pt(bl[0],bl[1])],
                                Color.blue,1,Color.black));
                this.addMorph(morppi);
            } else {
                morppi = Morph(pt(0,0).asRectangle(),"rect"); // polygon
                morppi.relayMouseEvents(this, {onMouseDown: "onMouseDown", onMouseUp: "onMouseUp"});
                morppi.setShape(PolygonShape([pt(tl[0],tl[1]),pt(tr[0],tr[1]),pt(br[0],br[1]),pt(bl[0],bl[1])],
                                this.color,1,Color.black));
                this.addMorph(morppi);
            }
            
            this.morphArray.push(morppi);
               
        }

    }, 
    
    nearWall: function(x,y){
        var xx,yy;
        if (isNaN(x)) x=this.playerPos[0];
        if (isNaN(y)) y=this.playerPos[1];

        for (var i=-0.1; i<=0.1; i+=0.2) {
            xx=Math.floor(x+i);
            for (var j=-0.1; j<=0.1; j+=0.2) {
                yy=Math.floor(y+j);
                if (this.arena[xx][yy] == 2) {
                //drawString(0,60,"Object hit");
                this.arena[xx][yy] = 0;
                this.found += 1;
                if (this.found == this.maxobjects){
                    this.endLevel();
                }
                }
                if (this.arena[xx][yy]) return true;
            }
        }
        
        return false;
    },

    wobbleGun: function(){
        var mag=this.playerVelY;
        //this.overlay.style.backgroundPosition=(10+Math.cos(this.total/6.23)*mag*90)+"px "+(10+Math.cos(this.total/5)*mag*90)+"px";
    },
    
    update: function(){
        this.total++;
        var change=false;
    
        if (this.jumpCycle) {
            this.jumpCycle--;
            change=true;
            this.playerPosZ = 1 + this.jumpCycle*(20-this.jumpCycle)/110;
        } else if (this.key[4]) this.jumpCycle=20;
        
        if (this.key[0]) {
            if (!this.key[1]) {
                this.playerDir-=0.07; //left
                change=true;
            }
        } else if (this.key[1]) {
            this.playerDir+=0.07; //right
            change=true;
        }
    
        if (change) {
            this.playerDir+=2*this.pi;
            this.playerDir%=2*this.pi;
            //document.getElementById("sky").style.backgroundPosition=Math.floor(1-this.playerDir/(2*this.pi)*2400)+"px 0";
        }
    
        if (this.key[2] && !this.key[3]) {
            if (this.playerVelY<0.1) this.playerVelY += 0.02;
        } else if (this.key[3] && !this.key[2]) {
            if (this.playerVelY>-0.1) this.playerVelY -= 0.02;
        } else {
            if (this.playerVelY<-0.02) this.playerVelY += 0.015;
            else if (this.playerVelY>0.02) this.playerVelY -= 0.015;
            else this.playerVelY=0;
        }

        if (this.playerVelY!=0) {
    
            var oldX=this.playerPos[0];;
            var oldY=this.playerPos[1];        
            var newX=oldX+Math.cos(this.playerDir)*this.playerVelY;
            var newY=oldY+Math.sin(this.playerDir)*this.playerVelY;
    
            if (!this.nearWall(newX, oldY)) {
                this.playerPos[0]=newX;
                oldX=newX;
                change=true;
            }

            if (!this.nearWall(oldX, newY)) {
                this.playerPos[1]=newY;
                change=true;
            }
    
        }
        
        if (this.playerVelY) this.wobbleGun();
        if (change) this.drawCanvas();
    
    }, 

    initUnderMap: function(){ // now its actually drawMinimap
        this.map.removeAllMorphs();
        var morppi;

        this.color = this.map.color;
        for (var i=0; i<this.arena.length; i++) {
            for (var j=0; j<this.arena[i].length; j++) {
                if (this.arena[i][j] && this.arena[i][j] != 2) {
                    if (this.difficulty != "hard") {
                        morppi = Morph(Rectangle( i*8,  j*8, 8, 8),"rect");   
                        morppi.setFill(this.color);
                        this.map.addMorph(morppi);
                    }
                } 
                if (this.arena[i][j] == 2 && this.difficulty == "easy") {
                    //this.color = Color.red;//setColor(0xcccc33);
                    morppi = Morph(Rectangle( i*8,  j*8, 8, 8),"rect");   
                    morppi.setFill(Color.red);
                    this.map.addMorph(morppi);
                }
            }    
        }
        
        this.color = Color.black;
    },

    calculateMaxObjects: function() {
        var count = 0;
        for (i = 0; i < this.arena.length; i++){
            for (j = 0; j < this.arena[i].length; j++){
                if (this.arena[i][j] == 2){
                    count +=1;
                }
            }
        }
        this.maxobjects = count;
    },
    
    endLevel: function() {
        if (this.level == "Level 1") {
            this.note = "Level 2";
            this.loadLevel(2);
            this.timeleft = this.timeleft + this.level2time;
            return;
        } else if (this.level == "Level 2") {
            this.note = "Level 3";
            this.loadLevel(3);
            this.timeleft = this.timeleft + this.level3time;
            return;
        } else if (this.level == "Level 3"){
            this.note = "Game completed.  Press space bar for another game.";
            this.level="Finished";
            this.endGame();
        }
    },

    changeKey: function(which, to) {
        // FIXME: Hard-coded key codes used here!
        switch (which){
            case 65: case 37: this.key[0]=to; break; // left
            case 87: case 38: this.key[2]=to; break; // up
            case 68: case 39: this.key[1]=to; break; // right
            case 83: case 40: this.key[3]=to; break; // down
            //case 32: this.key[4]=to; break; // space bar;
            case 17: 
                //newGame();
                break; 
        }
        //this.update();
    },

    keyDown: function(event) {
        event = event || window.event;

        var key = event.keyCode || event.charCode;
      
        // Check if any cursor keys have been pressed and set flags.      
        if (key == Event.KEY_LEFT)
            this.changeKey(37, 1);
        else if (key == Event.KEY_RIGHT)
            this.changeKey(39, 1);
        else if (key == Event.KEY_UP)
            this.changeKey(38, 1);
        else if (key == Event.KEY_DOWN)
            this.changeKey(40, 1);
        else if (event.keyCode == Event.KEY_SPACEBAR) { 
            this.startGame();
        }
    },
      
    keyUp: function(event) {
        event = event || window.event;
    
        var key = event.keyCode || event.charCode;
    
        // Check if any cursor keys have been pressed and set flags.
        if (key == Event.KEY_LEFT)
            this.changeKey(37, 0);
        else if (key == Event.KEY_RIGHT)
            this.changeKey(39, 0);
        else if (key == Event.KEY_UP)
            this.changeKey(38, 0);
        else if (key == Event.KEY_DOWN)
            this.changeKey(40, 0);
    },

    loadLevel: function(number){
    
        if (number == 1) {
            this.arena = [];
            this.arena[0]= [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            this.arena[1]= [1,0,0,0,2,0,0,0,0,0,1,2,0,1]
            this.arena[2]= [1,0,0,1,0,1,1,1,0,0,0,0,1,1]
            this.arena[3]= [1,0,1,0,0,0,0,1,0,0,1,0,0,1]
            this.arena[4]= [1,0,0,0,0,1,0,1,0,0,1,1,0,1]
            this.arena[5]= [1,0,1,1,0,0,0,0,0,0,0,0,0,1]
            this.arena[6]= [1,0,2,1,0,1,1,1,0,0,1,2,1,1]
            this.arena[7]= [1,1,0,1,0,0,0,1,0,0,0,0,0,1]
            this.arena[8]= [1,0,0,1,0,1,0,0,0,0,1,1,0,1]
            this.arena[9]= [1,0,2,0,0,1,0,0,0,0,1,2,0,1]
            this.arena[10]=[1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            this.calculateMaxObjects();
            this.level = "Level 1";

        } else if (number == 2) {
            this.arena = [];
            this.arena[0]= [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            this.arena[1]= [1,0,0,0,0,0,1,0,0,0,0,2,0,1]
            this.arena[2]= [1,0,0,0,1,0,1,0,1,2,1,1,0,1]
            this.arena[3]= [1,1,1,1,1,0,1,0,1,0,0,2,0,1]
            this.arena[4]= [1,0,0,0,0,0,0,0,1,1,1,1,0,1]
            this.arena[5]= [1,0,1,1,1,0,1,0,0,0,0,0,0,1]
            this.arena[6]= [1,0,0,0,0,0,0,0,0,0,0,1,1,1]
            this.arena[7]= [1,0,1,0,0,0,0,1,1,1,0,0,0,1]
            this.arena[8]= [1,0,2,1,1,1,0,1,2,1,0,1,0,1]
            this.arena[9]= [1,1,0,0,0,0,2,0,0,0,0,1,2,1]
            this.arena[10]=[1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            this.calculateMaxObjects();
            this.level = "Level 2";

        } else if (number == 3) {
            this.arena = [];
            this.arena[0]= [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            this.arena[1]= [1,0,0,1,0,0,0,2,1,2,0,0,1,0,1,2,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1]
            this.arena[2]= [1,0,0,1,0,0,0,2,1,0,1,0,1,0,0,1,0,0,1,1,1,1,2,0,0,1,0,1,0,1,0,0,0,1,0,1,1,1,1,1,1,0,1,0,2,1,2,0,1]
            this.arena[3]= [1,1,0,1,0,1,0,0,0,0,1,0,1,0,0,1,0,0,2,1,1,1,1,0,0,1,0,1,0,1,2,0,0,1,0,1,0,0,0,0,1,0,1,0,1,1,1,0,1]
            this.arena[4]= [1,0,0,1,0,1,1,1,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1,0,1,2,2,1,0,1,0,0,1,0,0,1]
            this.arena[5]= [1,0,0,1,0,1,0,1,0,0,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,0,0,0,1,0,1,2,2,1,0,1,0,0,1,0,0,1]
            this.arena[6]= [1,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,2,1,0,0,0,0,0,0,0,1,0,0,1,0,1,1,1,1,0,1,0,1,1,1,0,1]
            this.arena[7]= [1,0,0,0,1,1,1,1,0,1,1,1,1,0,1,2,1,0,1,0,1,2,1,0,1,0,1,0,0,0,0,0,1,2,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1]
            this.arena[8]= [1,0,1,1,1,2,0,0,0,1,1,0,0,2,1,0,1,0,1,2,1,0,1,0,0,2,1,1,1,1,1,0,1,0,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1]
            this.arena[9]= [1,0,0,2,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,1,0,2,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1]
            this.arena[10]=[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            this.calculateMaxObjects();
            this.level = "Level 3";
        }
        
        this.playerPos=[2,2]; // x,y (from top left)
        this.playerDir=0.2; // theta, facing right=0=2pi
        this.map.width = 8*this.arena.length;
        this.map.height = 8*this.arena[0].length;
        this.map.updatePlayerLocation(8*this.playerPos[0], 8*this.playerPos[1]);
        this.map.shape.setBounds(Rectangle(0,0,this.map.width, this.map.height));
        this.initUnderMap();
        
        this.key=[0,0,0,0,0];
        this.found = 0;

        this.drawCanvas();
    },

    stopGame: function(){
        this.note = "You ran out of time.  Press space bar for another game.";
        this.update();
        //this.removeAllMorphs();
        if (this.map) this.map.remove();
        //this.initParameters();
        this.initGame(); 
        this.initUnderMap();
        this.addMorph(this.map);
        this.stopStepping();
    },

    startGame: function(){
        //this.removeAllMorphs();
        if (this.map) this.map.remove();
        //this.initParameters();
        this.initGame();
        this.map = MiniMapMorph(Rectangle(5,25,8*this.arena.length,8*this.arena[0].length)); 
        this.initUnderMap();
        this.addMorph(this.map);
        this.note="";
        this.startSteppingFunction(35, function(msTime) { 
            this.mseconds += 35;
        
            if (this.mseconds > 1000) {
                this.mseconds -= 1000;
                this.timepassed += 1;
                this.timeleft -= 1;
                if (this.timeleft <= 0) this.stopGame();
            }
            this.update(); 
        });
    },

    setDifficulty: function(dif){
        this.difficulty = dif;
        this.startGame();
    },

    morphMenu: function(evt) {
        var menu = CanvasScapeMorph.superClass.morphMenu.call(this, evt);
        menu.addLine();
        menu.addItem(["Stop game",  this, 'stopGame']);
        menu.addItem(["Start easy game",  this, 'setDifficulty', 'easy']);
        menu.addItem(["Start medium game",  this, 'setDifficulty', 'medium']);
        menu.addItem(["Start hard game",  this, 'setDifficulty', 'hard']);
        return menu;
    }
    
});

console.log('loaded Examples.js');

