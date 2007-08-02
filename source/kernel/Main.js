// AT: It seems that this file still contains a lot of stuff
// that should be moved to separate file(s).  For instance,
// all the demos as well as browser/inspector related 
// functionality should be stored elsewhere.

// some support for the circles demo
function makeCircleGrid(itemCount) {
    var canvasWidth = this.canvas().bounds().width;
    var canvasHeight = this.canvas().bounds().height;
    
    var minR = 10, maxR = canvasWidth / 3;

    for (var j = 0; j < itemCount; ++j) {
        var r = getRandSkewed(minR, maxR);
        var cx = getRand(r,  canvasWidth  - r);
        var cy = getRand(r,  canvasHeight - r);
        //console.log([r, cx, cy]);
    
        var aShape  = Morph(Rectangle(cx - r, cy - r, 2*r, 2*r), "ellipse");
        aShape.setFill(randColor(true));
        aShape.setBorderColor(randColor(true));
        aShape.setFillOpacity(getRand(0, 1));
        aShape.setBorderWidth(getRand(0, 3));
        aShape.fullRadius = r + aShape.shape.getStrokeWidth();
    
        WorldMorph.current().addMorph(aShape);

        aShape.vector = Point.polar(15, getRand(0, Math.PI *2));
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

            // this.translateBy(pt.x + 10, pt.y + 10); 
        });
        
        // console.log('added ' + aShape.shape);
        // dojo.html.setClass(aShape.getEventSource(), "movable");
    }
}

function getRand(from, to) {
    return Math.random() * (to - from) + from;
}

function getRandSkewed(from, to) {
    // let skew stats to smaller values
    var seed = 0;
    
    for (var i = 0; i < getRandSkewed.skew_stat_factor; ++i){
        seed += Math.random();
    }
    
    seed = 2 * Math.abs(seed / getRandSkewed.skew_stat_factor - 0.5);
    return seed * (to - from) + from;
}

getRandSkewed.skew_stat_factor = 15;

function randColor(alpha) {
    var red   = getRand(0, 1);
    var green = getRand(0, 1);
    var blue  = getRand(0, 1);
    var opacity = 1;
    var color = new Color(red, green, blue);
    return color;    
}

var Global = this;

WorldMorph.populateWithExamples = function(world, otherWorld, server) {
    world.addHand(HandMorph(true));
    world.hands.each(function(hand) { world.parentNode.appendChild(hand); });

    console.log('added hand %s', world.firstHand());

    var widget; 
    // zzHand = world.worldState.hands[0];
    
    var showStar = true;
    if (showStar) {  // Make a star
        var makeStarVertices = function(r,center,startAngle) {
            var vertices = [];
            var nVerts = 10;
            for (var i=0; i<=nVerts; i++) {
                var a = startAngle + (2*Math.PI/nVerts*i);
                var p = Point.polar(r,a);
                if (i%2 == 0) p = p.scaleBy(0.39);
                vertices.push(p.addPt(center)); 
            }
            
            return vertices; 
        }
    
        widget = Morph(pt(0,0).asRectangle(), "rect");
        widget.setShape(PolygonShape(null, makeStarVertices(50,pt(0,0),0), Color.yellow,1,Color.black));
        // makeGradient(Color.yellow, Color.yellow.lighter().lighter()));
        widget.setPosition(pt(300, 400));
        world.addMorph(widget);
            
        var spinningStar = true;
        if (spinningStar) {  // Make the star spin as a test of stepping
            widget.startSteppingFunction(60, function(msTime) { this.setRotation(this.getRotation() + 0.1) });
        }
    }
    
    var showClock = true;
    if (showClock) {
        widget = ClockMorph(pt(500, 460), 50);
        // clockWidget.addClipRect(Rectangle(20,20,80,80));
        world.addMorph(widget);
        widget.startStepping(1000);
    }
    
    var showClipMorph = false;
    if (showClipMorph) world.addMorph(ClipMorph(Rectangle(500, 200, 150, 150)));
    
    var showColorPicker = true;
    if (showColorPicker) world.addMorph(ColorPickerMorph(world.bounds().bottomCenter().subPt(pt(0,50)).extent(pt(50,30)),
			world, "setFill", false));
    
    var innerWorld = true;
    if (innerWorld) {
        world.addMorph(widget = LinkMorph(null, pt(260, 460)));
        widget.myWorld.onEnter = function() { if (!world.rssReader) world.rssReader = loadRSS(world, pt(900, 50)); }
    
        var showBitmap = true;
        if (showBitmap) { 
            var width = 800;
            var height = 500;
            var url = "http://maps.google.com/mapdata?"+
		"Point=b&Point.latitude_e6=61500000&Point.longitude_e6=-3191200000&Point.iconid=15&"+
		"Point=e&Point=b&Point.latitude_e6=61500000&Point.longitude_e6=-3191200600&Point.iconid=16&"+
		"Point=e&latitude_e6=61500000&longitude_e6=-3191200000&zm=8000&w=" +
		width + "&h=" + height + "&cc=US&min_priority=2";
            widget.myWorld.addMorphBack(ImageMorph(Rectangle(50, 10, width, height), url));
        }
	
        widget.myWorld.addMorph(DoodleMorph(pt(500, 50).extent(pt(400,400))));
    }
    
    var showWidgets = true;
    if (showWidgets)
	new WidgetTester().openIn(morphic.world, pt(600,150));
 
    var showBrowser = true;
    if (showBrowser)
	new SimpleBrowser().openIn(morphic.world, pt(20,20));
    
    var slideWorld = true;
    if (slideWorld) { // Make a slide for "turning web programming upside down"
        var lm = LinkMorph(null, pt(260, 520));

        // KP: note that element deletion interferes with iteration, so
        // we make an array first and then remove 
        lm.myWorld.submorphs().toArray().each(function(m) { 
            if (m instanceof LinkMorph) return;
            m.remove(); 
        });
        
        // lm.setPosition(lm.position().addXY(65,0));
        var loc = pt(100, 200);
        var captions = ["               JavaScript","            Widget World","     HTML, DOM, CSS, ETC...","                Browser","   bios:  Network,  Graphics"];
    
        for (var i = 0; i < captions.length; i++) { // add boxed text
            var txt = TextMorph(loc.extent(pt(300,50)), captions[i]);
            txt.setFontSize(20);
            txt.setFill(Color.hsb(70*i,0.7,0.8));
            loc = loc.addXY(0,33);
            lm.myWorld.addMorph(txt); 
        }
    
        world.addMorph(lm); 
    }

    return world;
}

var rss;
function main() {
    var world  = WorldMorph.createPrototypeWorld();
    morphic.world = world;
    world.displayWorldOn(morphic.canvas);
    if (window.location.query()["rss"]== "true") {
        try {
            rss = loadRSS(world, pt(300, 20));
        } catch (e) {
            console.log('failed to load rss due to: ' + e);
        }
    }
    console.log('made world');
    morphic.world = WorldMorph.populateWithExamples(world);
    
    return;
}

main();

function extra() {

    var model = new Model();
    
    var m = ButtonMorph(morphic.world.bounds().rightCenter().subPt(pt(300, 0)).extent(pt(250, 20)));
    m.connect({model: model, value: "active"});
    m.toggles = true;
    morphic.world.addMorph(m);

    // before advice
    var oldAddMorph = HandMorph.prototype.addMorph;
    HandMorph.prototype.addMorph = function(m) {

        if (this.grabbedMorphPin != null) {
            this.grabbedMorphPin.write(m);
        }

        return oldAddMorph.call(this, m);
    };

    // before advice
    var oldRemoveMorph = HandMorph.prototype.removeMorph;
    HandMorph.prototype.removeMorph = function(m) {
        if (this.grabbedMorphPin != null) {
            this.grabbedMorphPin.write(null);
        }
    
        return oldRemoveMorph.call(this, m);
    };

    morphic.world.firstHand().connect({model: model, grabbedMorph: 'grabbedMorph'});
    
    var serializer = function(active, grabbedMorph) { 
        if (!active) 
            return "toggle button for an XML dump of the grabbed morph";
    
        console.log('grabbed morph is %s', grabbedMorph); 
    
        if (grabbedMorph.hasSubmorphs()) 
            return "not serializing complex morph " + grabbedMorph.inspect() + " to avoid mayhem";
    
        return new XMLSerializer().serializeToString(grabbedMorph); 
    };
    
    var evaluator = FunctionPane(m.bounds().bottomLeft().extent(pt(9999, 9999)), serializer.toString());
    evaluator.connect({model: model, active: "active", grabbedMorph: 'grabbedMorph', result: "serializedMorph"});
    
    m = TextMorph(m.bounds().bottomLeft().extent(pt(250, 300)), "toggle button for an XML dump of the grabbed morph");
    
    m.processCommandKeys = function(key) {

	if (key == 's') {
	    console.log('DOMParser: ' + new DOMParser());
	    //console.log('intercepting command-s');
	    var snippet = document.implementation.createDocument("", "", null);
	    snippet.write(this.textString);
	    console.log('snippet is %s', new XMLSerializer().serializeToString(snippet.documentElement));
	    return;
	} else {
	    return TextMorph.prototype.processCommandKeys.call(this, key);
	}

    };

    m.connect({model: model, text: "serializedMorph"});
    
    morphic.world.addMorph(m);
};

function showXMLDump(morph) {
    var panel = Morph(morph.bounds().topLeft().addPt(pt(5,0)).extent(pt(250, 300)), "rect");
    morphic.world.addMorph(panel);
    var tb = panel.addMorph(Morph.makeTitleBar("XML dump", panel.bounds().width, panel));
    var tbheight = tb.bounds().height;
    
    if (morph.hasSubmorphs()) {
        var xml = 'not serializing complex morph to avoid mayhem';
    } else {
        var xml = new XMLSerializer().serializeToString(morph); 
    }

    var txtMorph = TextMorph(Rectangle(0, tbheight, panel.bounds().width, panel.bounds().height - tbheight), xml);
    txtMorph.processCommandKeys = function(key) {
	if (key == 's') {
	    WorldMorph.current().addMorph(Morph.becomeMorph($X(txtMorph.textString)));
	    return;
        } else {
            return TextMorph.prototype.processCommandKeys.call(this, key);
	}
    };
    panel.addMorph(txtMorph);
};


if (this['localconfig'] && localconfig.xmldumper)
    extra();


if(true) showStatsViewer(TextMorph.prototype, "ticks");


console.log('loaded Main');
