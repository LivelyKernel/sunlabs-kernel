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
        widget.setPosition(pt(320, 400));
        world.addMorph(widget);
            
        var spinningStar = true;
        if (spinningStar) {  // Make the star spin as a test of stepping
            widget.startSteppingFunction(60, function(msTime) { this.setRotation(this.getRotation() + 0.1) });
        }
    }

    var showClock = true;
    if (showClock) {
        widget = ClockMorph(pt(500, 480), 50);
        // clockWidget.addClipRect(Rectangle(20,20,80,80));
        world.addMorph(widget);
        widget.startStepping(1000);
    }
    
    var showClipMorph = false;
    if (showClipMorph) world.addMorph(ClipMorph(Rectangle(500, 200, 150, 150)));
    
    var showColorPicker = true;
    if (showColorPicker) world.addMorph(ColorPickerMorph(world.bounds().bottomCenter().subPt(pt(0,50)).extent(pt(50,30)),
                                        world, "setFill", false));
    
    var show3DLogo = true;
    if (show3DLogo) world.addMorph(Sun3DMorph(pt(900, 130).extent(pt(200, 200))));
    
    var showAsteroids = true;
    if (showAsteroids) world.addMorph(GameMorph(pt(580, 360).extent(pt(600, 300))));
    
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
    if (showWidgets) new WidgetTester().openIn(morphic.world, pt(500, 60));
 
    var showBrowser = true;
    if (showBrowser) new SimpleBrowser().openIn(morphic.world, pt(20,20));
    
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
    var world = WorldMorph.createPrototypeWorld();
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

if (true) showStatsViewer(TextLine.prototype, "TextLine...");

console.log('loaded Main');

