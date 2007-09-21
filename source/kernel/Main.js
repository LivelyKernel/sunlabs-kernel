/**
 * Main.js.  System startup and demo loading.
 */

Config.shiftDragForDup = true; // allows easy object duplication using the Shift key
Config.useNewScheduler = true; // both schedulers active now

// Small stuff that will always be shown
Config.showClock = true;
Config.showStar = true;
Config.showHilbertFun = true;
Config.showPenScript = true;
Config.showTester = true;
Config.showBitmap = false;
Config.showMap = true;
Config.showSampleMorphs = true;
Config.showTextSamples = true;

// enables/disables network-dependent demos
Config.showNetworkExamples = true;

// More complex demos
Config.showClipMorph = Config.skipMostExamples;
Config.show3DLogo = !Config.skipMostExamples;
Config.showAsteroids = !Config.skipMostExamples;
Config.showIcon = !Config.skipMostExamples;
Config.showWeather = !Config.skipMostExamples;
Config.showMessenger = !Config.skipMostExamples;
Config.showStocks = !Config.skipMostExamples;
Config.showTODO = !Config.skipMostExamples;
Config.showOSReleaseTODO = !Config.skipMostExamples;
Config.showInnerWorld = !Config.skipMostExamples;
Config.showCanvasScape = !Config.skipMostExamples;
Config.showRSSReader = !Config.skipMostExamples;
Config.slideWorld = !Config.skipMostExamples;
Config.showDoodle = !Config.skipMostExamples;

// Class browser visibility can be overridden with Config.browserAnyway
Config.showBrowser = !Config.skipMostExamples || Config.browserAnyway;

function populateWorldWithExamples(world, otherWorld, server) {

    var widget;

    if (Config.showStar) {  // Make a star

        if (Config.loadFromMarkup) {
            world.addMorphWithContainerId('RotatingStar');
        } else {
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
            widget.setShape(PolygonShape(makeStarVertices(50,pt(0,0),0), Color.yellow, 1, Color.black));
            // makeGradient(Color.yellow, Color.yellow.lighter().lighter()));
            widget.setPosition(pt(135, 360));
            world.addMorph(widget);
            
            var spinningStar = !Config.skipMostExamples || Config.spinningStar;
            if (spinningStar) {  // Make the star spin as a test of stepping
                widget.startStepping(60, "rotateBy", 0.1);
            }
        }
    }

    if (Config.showClock) {
        widget = ClockMorph(pt(65, 410), 50);
        // clockWidget.addClipRect(Rectangle(20,20,80,80));
        world.addMorph(widget);
        widget.startSteppingScripts();
    }

    if (Config.showHilbertFun) Pen.hilbertFun(world);

    if (Config.showClipMorph) {
        world.addMorph(widget = ClipMorph(Rectangle(600, 300, 150, 150)));
        widget.setFill(Color.green.lighter());
    }
    
    if (Config.show3DLogo) world.addMorph(WindowMorph(Sun3DMorph(pt(950, 125).extent(pt(200, 200))), 'Sun 3D Logo'));
    
    if (Config.showAsteroids) {
        var gameMorph = apps.asteroids.makeGameMorph(pt(580, 360).extent(pt(600, 300)));
        world.addMorph(WindowMorph(gameMorph, 'Asteroids!'));
        apps.asteroids.initialize();
        gameMorph.runAsteroidsGame();
    }
    
    // Sample executable script pane
    if (Config.showPenScript) {
        if (Config.showTestText) widget = TestTextMorph(pt(50,30).extent(pt(250,50)),Pen.script);
        else widget = TextMorph(pt(50,30).extent(pt(250,50)),Pen.script);
        widget.align(widget.bounds().bottomRight(), world.bounds().topRight().addPt(pt(-50,100))); 
        world.addMorph(widget);
    }

    // Sample icon morph with a fisheye effect 'on'
    if (Config.showIcon) {
        // maybe the icons should have a rectangle shaped images (unlike here)
        // var icon = ImageMorph(Rectangle(30, 360, 80, 50), "http://logos.sun.com/images/SunSample.gif");
        var icon = ImageMorph(Rectangle(30, 500, 100, 45));

        icon.loadGraphics('#SunLogo', 0.15);
        icon.toggleFisheye();    
        world.addMorph(icon);
    }

    // Sample weather morph
    if (Config.showWeather && Config.showNetworkExamples) {
        // Maybe the icons should have rectangular images (unlike here)
        new WeatherWidget().openIn(world, pt(700, 50));
    }

    if (Config.showTester) new WidgetTester().openIn(world, pt(460, 10));

    if (Config.showBrowser) new SimpleBrowser().openIn(world, pt(20,20));

    if (Config.showStocks && Config.showNetworkExamples) {
        var stockWidget = new StockWidget();
        stockWidget.startSteppingRefreshCharts(stockWidget.openIn(world, pt(300, 500)));
    }

    if (Config.showMessenger && Config.showNetworkExamples) new MessengerWidget().openIn(world, pt(30, 600));

    if (Config.showTODO) {
        var todoMorph = TextMorph(Rectangle(440, 240, 300, 20),
                        "TODO (LARGE):\n" + 
                        "- Web page generation support\n" +
                        "- Local/remote storage capabilities\n" +
                        '- Demo applications should be more "Morphic"\n' +
                        "- Collaboration capabilities\n" +
                        "- Better development/debugging tools\n" +
                        "TODO (SMALL):\n" + 
                        "- Clean up demo world(s)\n" +
                        "- Clean up console warning/error messages\n" +
                        "- Use common location for external resources\n" +
                        "MAJOR BUGS:\n" + 
                        "- Coordinate transformations are broken\n" +
                        '- "Same origin" networking policy violated\n' +
                        "- Shortcut keys don't work on Safari/Windows\n" +
                        "- It is still far too easy to rip things apart\n" +
                        "MINOR BUGS:\n" + 
                        "- Selection tray creation/removal has bugs\n" +
                        "- Selection/resizing only works in one direction\n" +
                        "- Text selection has bugs"
                        );

        todoMorph.shape.roundEdgesBy(10);
        todoMorph.shape.setFillOpacity(0.6);
        world.addMorph(todoMorph);
    }

    if (Config.showOSReleaseTODO) {
        var todoOSReleaseMorph = TextMorph(Rectangle(1200, 500, 350, 20),
                        "Administrative issues:\n" + 
                        "- Deciding what will actually be released\n" +
                        "  + Which applications?\n" +
                        "  + HTML tutorial\n" +
                        "  + Tutorial implemented with the system itself?\n" +
                        "  + Technical documentation?\n" + 
                        "  + FAQ\n" + 
                        "- Setting up associated infrastructure\n" + 
                        "  + web site + server\n" + 
                        "  + mailing list\n" + 
                        "  + discussion forums\n" + 
                        "  + bug reporting service?\n" + 
                        "  + blogs (yes, I hate them too!)?\n" + 
                        "- Determining how to let others participate in development\n" +
                        "- Trademarking, licensing & other legal issues"
                        );
        todoOSReleaseMorph.shape.roundEdgesBy(10);
        todoOSReleaseMorph.shape.setFillOpacity(0.6);
        world.addMorph(todoOSReleaseMorph);
    }

    if (Config.showInnerWorld) {
        
        var lm1 = LinkMorph(null, pt(280, 400));
        world.addMorph(lm1);

        lm1.myWorld.onEnter = function() {

            if (Config.showCanvasScape) {
                if (!lm1.myWorld.csMorph) {
                    var csm = CanvasScapeMorph(Rectangle(30,30,800,300)/*pt(400, 350).extent(pt(800, 300))*/);
                    lm1.myWorld.csMorph = lm1.myWorld.addMorph(WindowMorph(csm, 'CanvasScape'));
                }
            }

            if (Config.showMap) {
                if (!lm1.myWorld.mapMorph) {
                    var tile = apps.maps.tileExtent;
                    var map = apps.maps.MapFrameMorph(new Rectangle(0, 0, 2*tile.x, 2*tile.y), true);
                    map.setScale(0.7);
                    map.setPosition(pt(320, 275));
                    lm1.myWorld.addMorph(map);
                    lm1.myWorld.mapMorph = map;
                }
            }

            if (!lm1.myWorld.rssReader && Config.showRSSReader && Config.showNetworkExamples) {
                console.log('initting RSS reader');
                lm1.myWorld.rssReader = new Feed("http://www.news.com/2547-1_3-0-5.xml").openIn(lm1.myWorld, pt(725, 120));
            }

        }

        if (Config.showBitmap) { 
            var width = 800;
            var height = 500;
            var url = "http://maps.google.com/mapdata?"+
            "Point=b&Point.latitude_e6=61500000&Point.longitude_e6=-3191200000&Point.iconid=15&"+
            "Point=e&Point=b&Point.latitude_e6=61500000&Point.longitude_e6=-3191200600&Point.iconid=16&"+
            "Point=e&latitude_e6=61500000&longitude_e6=-3191200000&zm=8000&w=" +
            width + "&h=" + height + "&cc=US&min_priority=2";
            
            lm1.myWorld.addMorphBack(WindowMorph(ImageMorph(Rectangle(50, 10, width, height), url), 'Tampere'));
        }

        if (Config.showDoodle) lm1.myWorld.addMorph(WindowMorph(DoodleMorph(pt(875, 350).extent(pt(300, 300))), 'Doodle Morph'));
    }
    
    if (Config.slideWorld) { // Make a slide for "turning web programming upside down"
        var lm2 = LinkMorph(null, pt(280, 460));

        // KP: note that element deletion interferes with iteration, so
        // we make an array first and then remove 
        lm2.myWorld.submorphs.toArray().each(function(m) { 
            if (m instanceof LinkMorph) return;
            m.remove(); 
        });
        
        // lm2.setPosition(lm2.position().addXY(65,0));
        var loc = pt(100, 200);
        var captions = ["               JavaScript","                 Widgets","      HTML, CSS, DOM, etc.","                Browser","    OS: Network, Graphics, ..."];
    
        for (var i = 0; i < captions.length; i++) { // add boxed text
            var txt = TextMorph(loc.extent(pt(300,50)), captions[i]);
            txt.setFontSize(20);
            txt.setFill(Color.hsb(70*i,0.7,0.8));
            loc = loc.addXY(0,33);
            lm2.myWorld.addMorph(txt); 
        }
    
        world.addMorph(lm2); 

        if (Config.showSampleMorphs){
            var colors = Color.wheel(4);
            var loc = pt(30,450); 
            var widgetExtent = pt(70, 30);
            var dy = pt(0,50); 
            var dx = pt(120,0);
     
            // Create a sample rectangle       
            widget = Morph(loc.extent(widgetExtent), "rect");
            widget.setFill(colors[0]);
            lm2.myWorld.addMorph(widget);
  
            // Create a sample ellipse
            widget = Morph(loc.addPt(dx).extent(widgetExtent), "ellipse");
            widget.setFill(colors[1]);
            lm2.myWorld.addMorph(widget);
  
            // Create a sample line
            loc = loc.addPt(dy);
            widget = Morph.makeLine([loc.addXY(0,15),loc.addXY(70,15)], 2, Color.black);
            lm2.myWorld.addMorph(widget);
      
            // Create a sample polygon
            var l2 = loc.addPt(dx);
            widget = Morph(l2.asRectangle(),"rect");
            widget.setShape(PolygonShape([pt(0,0),pt(70,0),pt(40,30),pt(0,0)], colors[2],1,Color.black));
            lm2.myWorld.addMorph(widget);
            loc = loc.addPt(dy);    
      
            // Create sample text widgets
            if (Config.showTextSamples) {
                widget = TextMorph(loc.extent(pt(100,50)),"Big Text"); // big text
                widget.setFontSize(20);
                widget.setTextColor(Color.blue);
                lm2.myWorld.addMorph(widget);

                widget = TextMorph(loc.addPt(dx).extent(pt(140,50)),"Unbordered"); // unbordered text
                widget.setFontSize(20);  
                widget.setBorderWidth(0);  
                widget.setFill(null);
                lm2.myWorld.addMorph(widget); 
            }
        }
    }

    return world;
}

function main() {

    // Create an empty world
    var world = WorldMorph(Canvas);
    WorldMorph.setCurrent(world);
    world.displayWorldOn(Canvas);
    console.log('made world');

    // Populate the world with sample objects, widgets and applications
    if (Config.skipAllExamples) return;
    else populateWorldWithExamples(world, /* !Config.skipMostExamples*/ true);

    if (false) { // Display a color swatch
        var colors = Color.wheelHsb(10,0,1,1);
        var m;
        for (var i=0; i<colors.length; i++) {
            world.addMorph(m = Morph(Rectangle(i*40, 0, 35, 35), "rect"));
            m.setFill(colors[i]);
            console.log(colors[i].toString());
        };
     }

    if (false) showStatsViewer(TextLine.prototype, "TextLine...");
    
    if (Config.showWebStore) {
        if (location.protocol == 'file:') {
            var store = new WebStore('localhost', '~kappa'); // TODO: hardcoded
        } else {
            var store = new WebStore(location.hostname, location.pathname.substring(0, location.pathname.lastIndexOf('lively.xhtml')));
        }
        WebStore.defaultStore = store;
        store.openIn(WorldMorph.current(), pt(500, 30));
    }
}

main();

console.log('loaded Main.js');

