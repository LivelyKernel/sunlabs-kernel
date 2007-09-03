/**
 * Main.js.  System startup and demo loading.
 */

var Global = this;

Config.shiftDragForDup = true; // easy duplicate gesture


WorldMorph.populateWithExamples = function(world, otherWorld, server) {

    //var widget; 
    //Examplemorphs moved here from widgets.js
    var widget, zzRect, zzEll, zzLine, zzPoly, zzText, zzScript; // Comment to make these global for debugging access
    var showSampleMorphs = true;
    if (showSampleMorphs){
      var colors = Color.wheel(4);
      var loc = pt(30,450); 
      var widgetExtent = pt(70, 30);
      var dy = pt(0,50); 
      var dx = pt(120,0);
      // Create a sample rectangle       
      widget = Morph(loc.extent(widgetExtent), "rect");
  
      widget.setFill(colors[0]);
      world.addMorph(widget);
      zzRect = widget;
  
      //widget = Morph.fromMarkup('<g type="Morph" transform="translate(210,395)"><ellipse cx="0" cy="0" rx="35" ry="15" type="ellicapse" fill="rgb(98,179,17)" stroke-width="1" stroke="rgb(0,0,0)"/><g type="Submorphs"/></g>');
  
      // Create a sample ellipse
      widget = Morph(loc.addPt(dx).extent(widgetExtent), "ellipse");
      widget.setFill(colors[1]);
  
      world.addMorph(widget);
      zzEll = widget;
  
      // Create a sample line
      loc = loc.addPt(dy);
      widget = Morph.makeLine([loc.addXY(0,15),loc.addXY(70,15)], 2, Color.black);
      world.addMorph(widget);
      zzLine = widget;
      var l2 = loc.addPt(dx);
      
      // Create a sample polygon
      widget = Morph(l2.asRectangle(),"rect");
      widget.setShape(PolygonShape([pt(0,0),pt(70,0),pt(40,30),pt(0,0)], colors[2],1,Color.black));
      world.addMorph(widget);
      zzPoly = widget;
      loc = loc.addPt(dy);    
      
      // Create sample text widgets
      var showBigText = true;
      if (showBigText) {
          widget = TextMorph(loc.extent(pt(100,50)),"Big Text"); // big text
          widget.setFontSize(20);
          widget.setTextColor(Color.blue);
          world.addMorph(widget);
          zzText = widget;
          widget = TextMorph(loc.addPt(dx).extent(pt(140,50)),"Unbordered"); // unbordered text
          widget.setFontSize(20);  
          widget.setBorderWidth(0);  
          widget.setFill(null);
          world.addMorph(widget); 
      }
          
      // Sample executable script pane
      var showPenScript = true;
      if (showPenScript) {
          widget = TextMorph(pt(50,30).extent(pt(250,50)),Pen.script);
          widget.align(widget.bounds().bottomRight(), world.bounds().topRight().addPt(pt(-50,100))); 
          world.addMorph(widget);
          zzScript = widget; 
      }
  
      if (Config.showTestText) {
          Pen.script = "gggggggggg " +
          "hhhhhhhhhh\n" +
          "iiiiiiiiii " +
          "jjjjjjjjjj\n" +
          "kkkkkkkkkk " +
          "llllllllll\n" +
          "mmmmmmmmmm " +
          "nnnnnnnnnn\n";
          widget = TestTextMorph(pt(50,50).extent(pt(250,50)), Pen.script);
          world.addMorph(widget);
          widget.setScale(3.0);
      }
    }
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
        widget.setShape(PolygonShape(makeStarVertices(50,pt(0,0),0), Color.yellow, 1, Color.black));
        // makeGradient(Color.yellow, Color.yellow.lighter().lighter()));
        widget.setPosition(pt(320, 480));
        world.addMorph(widget);
            
        var spinningStar = !Config.skipMostExamples || Config.spinningStar;
//        if (spinningStar) {  // Make the star spin as a test of stepping
//            widget.startSteppingFunction(60, function(msTime) { this.setRotation(this.getRotation() + 0.1) });
//        }
        if (spinningStar) {  // Make the star spin as a test of stepping
            widget.startStepping(60, "rotateBy", 0.1);
        }
    }

    var showClock = true;
    if (showClock) {
        widget = ClockMorph(pt(500, 525), 50);
        // clockWidget.addClipRect(Rectangle(20,20,80,80));
        world.addMorph(widget);
        widget.startStepping(1000);
    }

    var hilbertFun = true;
    if (hilbertFun) Pen.hilbertFun(world);

    var showClipMorph = Config.skipMostExamples;
    if (showClipMorph) {
        world.addMorph(widget = ClipMorph(Rectangle(600, 300, 150, 150)));
        widget.setFill(Color.green.lighter());
    }
    
    var show3DLogo = !Config.skipMostExamples;
    if (show3DLogo) world.addMorph(WindowMorph(Sun3DMorph(pt(950, 125).extent(pt(200, 200))), 'Sun 3D Logo'));
    
    var showAsteroids = !Config.skipMostExamples;
    if (showAsteroids) {
        var gameMorph = apps.asteroids.makeGameMorph(pt(580, 360).extent(pt(600, 300)));
        world.addMorph(WindowMorph(gameMorph, 'Asteroids!'));
        apps.asteroids.initialize();
        gameMorph.runAsteroidsGame();
    }
    
    var innerWorld = !Config.skipMostExamples;
    if (innerWorld) {
        world.addMorph(widget = LinkMorph(null, pt(260, 460)));

        widget.myWorld.onEnter = function() {

            if (!widget.myWorld.rssReader) {
                console.log('initting RSS reader');
                widget.myWorld.rssReader = new Feed("http://news.com.com/2547-1_3-0-5.xml").openIn(widget.myWorld, pt(725, 120));
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
            var showCanvasScape = true;
            if (showCanvasScape) {
                if (!widget.myWorld.csMorph) {
                    console.log("creating csm");
                    var csm = CanvasScapeMorph(Rectangle(20,400,800,300)/*pt(400, 350).extent(pt(800, 300))*/);
                    widget.myWorld.csMorph = widget.myWorld.addMorph(WindowMorph(csm, 'CanvasScape'));
                    //csm.startSteppingFunction(200, function(msTime) { this.changeKey( 37, 1); });
                    console.log("creating csm done");
                }
            }
        }

        var showBitmap = false;
        if (showBitmap) { 
            var width = 800;
            var height = 500;
            var url = "http://maps.google.com/mapdata?"+
            "Point=b&Point.latitude_e6=61500000&Point.longitude_e6=-3191200000&Point.iconid=15&"+
            "Point=e&Point=b&Point.latitude_e6=61500000&Point.longitude_e6=-3191200600&Point.iconid=16&"+
            "Point=e&latitude_e6=61500000&longitude_e6=-3191200000&zm=8000&w=" +
            width + "&h=" + height + "&cc=US&min_priority=2";
            
            widget.myWorld.addMorphBack(WindowMorph(ImageMorph(Rectangle(50, 10, width, height), url), 'Tampere'));
        }

        var showDoodle = true;
        if (showDoodle) widget.myWorld.addMorph(WindowMorph(DoodleMorph(pt(875, 350).extent(pt(300, 300))), 
                                                'Doodle Morph'));
    }
    
    var slideWorld = true;
    if (slideWorld) { // Make a slide for "turning web programming upside down"
        var lm = LinkMorph(null, pt(260, 520));

        // KP: note that element deletion interferes with iteration, so
        // we make an array first and then remove 
        lm.myWorld.submorphs.toArray().each(function(m) { 
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

    // TODO list morph
    var showTODO = !Config.skipMostExamples;
    if (showTODO) {
        var todoMorph = TextMorph(Rectangle(450, 300, 250,20),
                        "TODO:\n" + 
                        "Browser specific configs(?)\n" +
                        "Browser specific info can be alerted with command: Prototype.Browser.AlertBrowserInfo();\n" +
                        "BuZilla up and running for the release\n" +
                        "More widgets?\n" +
                        "-Widget for managing timers\n" + 
                        "-\"virtual desktop\" widget to drag-and-drop morph to another world?\n"
                        );
        todoMorph.shape.roundEdgesBy(10);
        todoMorph.shape.setFillOpacity(.7);
        world.addMorph(todoMorph);
    }

    // example icon morph with a fisheye effect 'on'
    var showIcon = !Config.skipMostExamples;
    if (showIcon) {
        // maybe the icons should have a rectangle shaped images (unlike here)
        //var icon = ImageMorph(Rectangle(30, 360, 80, 50), "http://logos.sun.com/images/SunSample.gif");
        var icon = ImageMorph(Rectangle(30, 360, 100, 45));

        icon.loadGraphics('#SunLogo', 0.15);
        icon.toggleFisheye();    
        world.addMorph(icon);
    }

    // example weather morph
    var showWeather = !Config.skipMostExamples;
    if (showWeather) {
        // Maybe the icons should have rectangular images (unlike here)
        new WeatherWidget().openIn(world, pt(700, 50));
    }

    var showWidgets = true;
    if (showWidgets) new WidgetTester().openIn(world, pt(460, 20));

    var showBrowser = !Config.skipMostExamples || Config.browserAnyway;
    if (showBrowser) new SimpleBrowser().openIn(world, pt(20,20));

    var showStocks = !Config.skipMostExamples;
    if (showStocks) {
        var stockWidget = new StockWidget();
        stockWidget.startSteppingRefreshCharts(stockWidget.openIn(world, pt(300, 500)));
    }

    var showMessenger = !Config.skipMostExamples;
    if (showMessenger) new MessengerWidget().openIn(world, pt(30, 600));
  
    

    return world;
}

function main() {
    var world = WorldMorph.createEmptyWorld();
    WorldMorph.setCurrent(world);
    world.displayWorldOn(Canvas);
    console.log('made world');
    if (Config.skipAllExamples) return;
    WorldMorph.populateWithExamples(world, !Config.skipMostExamples);
}

main();

if (false) showStatsViewer(TextLine.prototype, "TextLine...");

if (Config.showWebStore) {
    //var store = new WebStore('http://idisk.mac.com/xysztof/Public/Lively');
    var store = new WebStore('localhost', '~kappa');
    store.openIn(WorldMorph.current(), pt(500, 30));
}

console.log('loaded Main.js');

