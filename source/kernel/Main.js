var Global = this;
var showMostExamples = true;  // DI: Set to false for much faster turnaround time on slow machines

var stockWidget = null;

WorldMorph.populateWithExamples = function(world, otherWorld, server) {

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
        widget.setPosition(pt(320, 380));
        world.addMorph(widget);
            
        var spinningStar = showMostExamples;
        if (spinningStar) {  // Make the star spin as a test of stepping
            widget.startSteppingFunction(60, function(msTime) { this.setRotation(this.getRotation() + 0.1) });
        }
    }

    var showClock = true;
    if (showClock) {
        widget = ClockMorph(pt(500, 420), 50);
        // clockWidget.addClipRect(Rectangle(20,20,80,80));
        world.addMorph(widget);
        widget.startStepping(1000);
    }

    var showClipMorph = false;
    if (showClipMorph) world.addMorph(ClipMorph(Rectangle(500, 200, 150, 150)));
    
    var show3DLogo = showMostExamples;
    if (show3DLogo) world.addMorph(WindowMorph(Sun3DMorph(pt(950, 125).extent(pt(200, 200))), 'Sun 3D Logo'));
    
    var showAsteroids = showMostExamples;
    if (showAsteroids) {
        var gameMorph = apps.asteroids.makeGameMorph(pt(580, 360).extent(pt(600, 300)));
        world.addMorph(WindowMorph(gameMorph, 'Asteroids!'));
        apps.asteroids.initialize();
        gameMorph.runAsteroidsGame();
    }
    
    var innerWorld = showMostExamples;
    if (innerWorld) {
        world.addMorph(widget = LinkMorph(null, pt(260, 460)));

        widget.myWorld.onEnter = function() {

            if (!widget.myWorld.rssReader) {
                console.log('initting RSS reader');
                widget.myWorld.rssReader = loadRSS(widget.myWorld, pt(725, 120));
            }

            var showMap = true;
            if (showMap) {
                if (!widget.myWorld.mapMorph) {
                    var tile = apps.maps.tileExtent;
                    var map = apps.maps.MapFrameMorph(new Rectangle(0, 0, 2*tile.x, 2*tile.y), true);
                    map.setScale(0.7);
                    map.setPosition(pt(320, 175));
                    widget.myWorld.addMorph(map);
                    widget.myWorld.mapMorph = map;
                }
            }
        }

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

        var showDoodle = true;
        if (showDoodle) widget.myWorld.addMorph(WindowMorph(DoodleMorph(pt(875, 350).extent(pt(300, 300))), 'Doodle Morph'));
    }
    
    var slideWorld = showMostExamples;
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

    // example icon morph with a fisheye effect 'on'
    var showIcon = showMostExamples;
    if (showIcon) {
        // maybe the icons should have a rectangle shaped images (unlike here)
        var icon = ImageMorph(Rectangle(30, 360, 80, 50), "http://logos.sun.com/images/SunSample.gif");
        icon.toggleFisheye();    
        world.addMorph(icon);
    }

    // example weather morph
    var showWeather = showMostExamples;
    if (showWeather) {
        // Maybe the icons should have rectangular images (unlike here)
        new WeatherWidget().openIn(world, pt(700, 50));
    }

    var showWidgets = true;
    if (showWidgets) new WidgetTester().openIn(world, pt(460, 20));

    var showBrowser = showMostExamples;
    if (showBrowser) new SimpleBrowser().openIn(world, pt(20,20));

    var showStocks = showMostExamples;
    if (showStocks) {
        stockWidget = new StockWidget().openIn(world, pt(300, 500));
        stockWidget.startSteppingRefreshCharts(stockWidget);
    }

    var showMessenger = showMostExamples;
    if (showMessenger) new MessengerWidget().openIn(world, pt(30, 600));

    var showRSS = false;
    if (showRSS) loadRSS(world, pt(300, 20));

    return world;
}

var rss;
function main() {
    var world = WorldMorph.createPrototypeWorld();
    WorldMorph.setCurrent(world);
    world.displayWorldOn(morphic.canvas);
    console.log('made world');
    WorldMorph.populateWithExamples(world, showMostExamples);
}

main();

console.log('loaded Main');

if (false) showStatsViewer(TextLine.prototype, "TextLine...");

if (this['showWebStore']) {
    // var store = new WebStore('http://idisk.mac.com/xysztof/Public/Lively');
    var store = new WebStore('localhost', '~kappa');
    store.openIn(WorldMorph.current(), pt(500, 30));
}

