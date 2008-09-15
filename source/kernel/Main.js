/*
 * Copyright � 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 
	
	
/**
 * Main.js.  System startup and demo loading.
 */
(function(module) {

//Note all demo set-up flags have been moved to defaultconfig.js
//	so that they can be overridden locally by localconfig.js

// Name the methods for showStack
if (Config.tallyLOC && Function.tallyLOC) Function.tallyLOC();  

// Name the methods for showStack
if (Config.debugExtras && Function.installStackTracers) Function.installStackTracers();  

// Class browser visibility can be overridden with Config.browserAnyway
Config.showBrowser = !Config.skipMostExamples || Config.browserAnyway;


function makeSlideWorld(world) {
    var link = new LinkMorph(null, pt(60, 400));
    // KP: note that element deletion interferes with iteration, so
    // we make an array first and then remove 
    link.myWorld.submorphs.clone().forEach(function(m) { 
	if (m instanceof LinkMorph) return;
	m.remove(); 
    });
    populateSlideWorld(link.myWorld)
    return link;
}
    
function populateSlideWorld(world) {
    if(Config.showWebStack) {
	var loc = pt(100, 80);
	var captions = [
		"               JavaScript",
		"                 Widgets",
		"      HTML, CSS, DOM, etc.",
		"                Browser",
		"    OS: Network, Graphics, ..."
	];
	for (var i = 0; i < captions.length; i++) { // add boxed text
		var txt = new TextMorph(loc.extent(pt(300, 50)), captions[i]);
		txt.applyStyle({fontSize: 20, fill: Color.hsb(70*i,0.7,0.8)});
		loc = loc.addXY(0,35);
		world.addMorph(txt); 
	}
    }
    
    if (Config.showStar) {  // Make a star
	var makeStarVertices = function(r,center,startAngle) {
            var vertices = [];
            var nVerts = 10;
            for (var i=0; i <= nVerts; i++) {
		var a = startAngle + (2*Math.PI/nVerts*i);
		var p = Point.polar(r,a);
		if (i%2 == 0) p = p.scaleBy(0.39);
		vertices.push(p.addPt(center)); 
            }
            return vertices; 
	}
	widget = Morph.makePolygon(makeStarVertices(50,pt(0,0),0), 1, Color.black, Color.yellow);
	widget.setPosition(pt(125, 275));
	world.addMorph(widget);
	
	if (Config.showStar && Config.spinningStar) {  // Make the star spin as a test of stepping
            widget.startStepping(60, "rotateBy", 0.1);
	}
    }

    if (Config.showSampleMorphs) {
        var colors = Color.wheel(4);
        var loc = pt(150, 450); 
        var widgetExtent = pt(70, 30);
        var dy = pt(0,50); 
        var dx = pt(120,0);
	
        // Create a sample rectangle       
        widget = new Morph(loc.extent(widgetExtent), "rect");
        widget.setFill(colors[0]);
        world.addMorph(widget);
	
        // Create a sample ellipse
        widget = new Morph(loc.addPt(dx).extent(widgetExtent), "ellipse");
        widget.setFill(colors[1]);
        world.addMorph(widget);
	
        // Create a sample line
        loc = loc.addPt(dy);
        widget = Morph.makeLine([loc.addXY(0,15),loc.addXY(70,15)], 2, Color.black);
        world.addMorph(widget);
	
        // Create a sample polygon
        widget = Morph.makePolygon([pt(0,0),pt(70,0),pt(40,30),pt(0,0)], 1, Color.black, colors[2]);
        world.addMorph(widget);
        widget.setPosition(loc.addPt(dx));
        loc = loc.addPt(dy);    
	
        // Create sample text widgets
        if (Config.showTextSamples) {
            widget = new TextMorph(loc.extent(pt(100,50)),"Big Text"); // big text
            world.addMorph(widget.applyStyle({fontSize: 20, textColor: Color.blue}));
	    
            widget = new TextMorph(loc.addPt(dx).extent(pt(140,50)),"Unbordered"); // unbordered text
            world.addMorph(widget.applyStyle({fontSize: 20, borderWidth: 0, fill: null})); 
        }
    }
}


	// These stubs allow us to run without Tools.js
	if(!Function.showStack) {
	    Object.extend(Function, {
		showStack: function(useViewer) {},
		resetDebuggingStack: function(useViewer) {}
	    });
	}
	// This stub allows us to run without Widgets.js
	if(! WindowMorph) {
	    WindowMorph = function() {};
	}


function populateWorldWithExamples(world) {
    
    if (Config.showOnlySimpleMorphs) {
	// Simply put basic shapes in world and nothing else (for testing)
	populateSlideWorld(world);
	// If Tools.js is loaded, and Config.debugExtras == true
	//   then the following call will print a trace of populateSlideWorld
	//   to the console...
	// Function.trace(function() {populateSlideWorld(world) });
	return;
    }

    var widget;

    if (Config.showClock) {
        widget = Config.originalClock ? new ClockMorph(pt(60, 60), 50) : new FabrikClockMorph(pt(60, 60), 50);
        world.addMorph(widget);
        widget.startSteppingScripts();
    }

    /*
    if (Config.showClipMorph()) {
        world.addMorph(widget = new ClipMorph(new Rectangle(600, 300, 150, 150)));
        widget.setFill(Color.green.lighter());
    }
    */

    if (Config.showEngine()) EngineMorph.makeEngine(world, pt(230, 5));
    
    if (Config.showAsteroids()) using(lk.examples.asteroids).run(function(app) {
        var gameMorph = app.makeGameMorph(pt(500, 360).extent(pt(600, 300)));
        world.addMorph(new WindowMorph(gameMorph, 'Asteroids!'));
        app.initialize();
        gameMorph.runAsteroidsGame();
        gameMorph.owner.collapse();
    });
    
    // Sample icon morph with a fisheye effect 'on'
    if (Config.showIcon()) {
        // maybe the icons should have a rectangle shaped images (unlike here)
        // var icon = new ImageMorph(new Rectangle(30, 330, 80, 50), "http://logos.sun.com/images/SunSample.gif");
	new NetImporter().loadElement("Definitions.svg", "SunLogo");
        var icon = new ImageMorph(new Rectangle(60, 580, 100, 45), "#SunLogo");
        icon.image.scaleBy(0.15);
        icon.setFill(null); // no background
        icon.toggleFisheye();    
        world.addMorph(icon);
    }

    // Sample weather morph
    if (Config.showWeather() && Config.showNetworkExamples) {
        // Maybe the icons should have rectangular images (unlike here)
        var weather = new WeatherWidget().openIn(world, pt(785, 65));
        world.topSubmorph().rotateBy(-0.2);
    }

    if (Config.showStocks() && Config.showNetworkExamples) {
        var stockWidget = new StockWidget();
        stockWidget.openIn(world, pt(350, 500));
    }

    if (Config.show3DLogo()) world.addFramedMorph(new lk.examples.Sun3DMorph(pt(200, 200)), 
						  'Sun 3D Logo', pt(570, 100));

    if (Config.showTester) new TestWidget().openIn(world, pt(835, 450));
    	
    if (Config.showTesterRunnerForDevelopment) TestRunner.openIn();
    if (Config.showWikiNavigator) WikiNavigator.enableWikiNavigator();

	if (Config.showFabrikComponentBox) Fabrik.openComponentBox()
	if (Config.showFahrenheitCelsiusExample) Fabrik.openFahrenheitCelsiusExample();
	if (Config.showTextListExample) Fabrik.openFabrikTextListExample();
	if (Config.openFabrikBrowserExample) Fabrik.openFabrikBrowserExample();

    // Open OmetaWorkspace
    //openOmetaWorkspace();

    // add to Link?
    function addLinkLabel(link, text) {
	var label = new TextMorph(pt(110, 25).extentAsRectangle(), text).applyStyle({borderRadius: 10});
	link.addMorph(label);
	label.align(label.bounds().leftCenter(), link.shape.bounds().rightCenter().addXY(5, 0));
	return label;
    }

    if (Config.showInnerWorld) {
        
        var lm1 = new LinkMorph(null, pt(60, 460));
        world.addMorph(lm1);
	addLinkLabel(lm1, "More complex sample widgets");
	
        lm1.myWorld.onEnter = function() {
	    if (this.enterCount > 0) return;

	    PIM = new WebPIM().openIn(this, pt(110, 110));
	    
            if (Config.showRSSReader() && Config.showNetworkExamples) {
                console.log('initializing RSS reader');
                new FeedWidget("http://news.cnet.com/2547-1_3-0-5.xml").openIn(this, pt(725, 120));
            }
	    
            if (Config.showCanvasScape()) {
                this.addMorph(new WindowMorph(new lk.examples.canvascape.CanvasScapeMorph(new Rectangle(20,50,800,300)), 'CanvasScape')).collapse();
            }
	    
            if (Config.showMap) {
                var tile = lk.examples.maps.tileExtent;
                var map = new MapFrameMorph(new Rectangle(0, 0, 2*tile.x, 2*tile.y), true);
                map.setScale(0.7);
                map.setPosition(pt(160, 250));
                this.addMorph(map);
            }
	    
            // Add sample curve stuff
            if (Config.showCurveExample) {
                // bezier blob
                var shape1 = [pt(0,0), pt(50,0), pt(50,50), pt(0,50), pt(0,0)];
                var widget = new Morph(pt(100,100).asRectangle(),"rect");
                widget.setShape(new PathShape(shape1, Color.red, 3, Color.black));
                this.addMorph(widget);
                widget = new Morph(pt(250,50).asRectangle(),"rect");
		
                // rectangle with rounded corners
                var shape2 = [pt(10,0), pt(60,0), pt(70,10), pt(70,40),
                    pt(60,50), pt(10,50), pt(0,40), pt(0, 10), pt(10,0)];
		
                for (var i = 2; i<=8; i+=2) {
                    // this will work too
                    // shape2[i].radius = pt(10,10); shape2[i].type = "arc";
                    shape2[i].radius = 10; shape2[i].type = "arc";
                }
		
                widget.setShape(new PathShape(shape2, Color.green, 2, Color.red));
                this.addMorph(widget);
            } 
            if (Config.showBitmap) { 
		var width = 800;
		var height = 500;
		var url = "http://maps.google.com/mapdata?"+
		    "Point=b&Point.latitude_e6=61500000&Point.longitude_e6=-3191200000&Point.iconid=15&"+
		    "Point=e&Point=b&Point.latitude_e6=61500000&Point.longitude_e6=-3191200600&Point.iconid=16&"+
		    "Point=e&latitude_e6=61500000&longitude_e6=-3191200000&zm=8000&w=" +
		    width + "&h=" + height + "&cc=US&min_priority=2";
		this.addMorphBack(new WindowMorph(new ImageMorph(new Rectangle(50, 10, width, height), url), 'Tampere'));
            }
	    
            if (Config.showSquiggle()) this.addFramedMorph(new SquiggleMorph(pt(300, 300)), 'Freehand', pt(560, 380));
            
            if (Config.showVideo()) this.addFramedMorph(new PlayerMorph(), "Player", pt(50, 20));
	    
        }
    }
    // load from slideWorld
    if (Config.showSlideWorld) { // Make a slide for "turning web programming upside down"
	if (Config.loadSerializedSubworlds) {
	    var importer = new NetImporter();
	    importer.onWorldLoad = function(slideWorld, er) {
		var link = world.addMorph(new LinkMorph(slideWorld, pt(60, 400)));
		addLinkLabel(link, "Simple example morphs");
	    }
	    importer.loadMarkup(URL.source.withFilename("slide.xhtml"));
	    
	} else { 
	    var link = makeSlideWorld(world);
	    addLinkLabel(link, "Simple example morphs");
	    world.addMorph(link);
	}
    }

    if (Config.showDeveloperWorld) {
        
        var devWorld = new LinkMorph(null, pt(60, 520));
        world.addMorph(devWorld);
	addLinkLabel(devWorld, "Development Tools");

            
        if (Config.showBrowser) new SimpleBrowser().openIn(devWorld.myWorld, pt(20, 20));

        // DI: The ObjectBrowser takes a long time to start due to its long list
        // ... so don't show it when skipping most examples -- can always open from world menu
        if (!Config.skipMostExamples) new ObjectBrowser().openIn(devWorld.myWorld, pt(50, 100));

        // Sample executable script pane
        if (Config.showPenScript) {
	    var parser = new CodeMarkupParser(URL.source.withFilename('Pen.lkml'));
	    parser.onComplete = function() {
		var widget;
		if (Config.showTestText) widget = new TestTextMorph(pt(50,30).extent(pt(250,50)), Pen.script);
		else widget = new TextMorph(pt(50,30).extent(pt(250,50)), Pen.script);
		widget.align(widget.bounds().bottomRight(), world.bounds().topRight().addPt(pt(-150,100))); 
		if (Config.showHilbertFun) Pen.hilbertFun(devWorld.myWorld, widget.bounds().bottomLeft().addXY(180,80));
		devWorld.myWorld.addMorph(widget);
	    }
	    parser.parse();
        }

        if (Config.showWebStore()) {
            var store = new FileBrowser();
            store.openIn(Config.webStoreInMain ? WorldMorph.current() : devWorld.myWorld, pt(460, 120));
        }

        if (Config.showDOMBrowser) {
            var browser = new DOMBrowser();
            console.log('showing DOMBrowser!');
            browser.openIn(Config.webStoreInMain ? WorldMorph.current() : devWorld.myWorld, pt(260, 120));
        }

        if (Config.showTwoPaneObjectBrowser) {
            var browser = new TwoPaneObjectBrowser();
            console.log('showing TwoPaneBrowser!');
            browser.openIn(Config.webStoreInMain ? WorldMorph.current() : devWorld.myWorld, pt(160, 150));
        }

		if (Config.showGridDemo) {
			if (this.enterCount > 0) return;
			var importer = new NetImporter();
			importer.onCodeLoad = function(error) {
				error || GridLayoutMorph.demo(devWorld.myWorld, pt(90,450));
			};
			importer.loadCode(URL.source.withFilename('GridLayout.js'));
		}
		
        if (Config.showTesterRunner) TestRunner.openIn(devWorld.myWorld, pt(500, 100));
    }

    if (Config.showPhoneWorld) {
        var phoneWorld = new LinkMorph(null, pt(60, 320));
        world.addMorph(phoneWorld);
	addLinkLabel(phoneWorld, "Telephone Demo");
        
	phoneWorld.myWorld.onEnter = function() {
	    if (this.enterCount > 0) return;
	    var importer = new NetImporter();
	    importer.onCodeLoad = function(error) {
		error || Global.phoneDemo(phoneWorld.myWorld, pt(250,180), 150);
	    };
	    importer.loadCode(URL.source.withFilename('phone.js'));
        }
    }

    if (Config.showLivelyConsole  && window.console.consumers) {
        new ConsoleWidget(50).openIn(world, pt(0, world.viewport().height - 210));
    }

    if (Config.showFabrik) {
        var fabrikWorld = new LinkMorph(null, pt(60, 330));
        world.addMorph(fabrikWorld);
    	addLinkLabel(fabrikWorld, "Visual programming with Fabrik");

    	fabrikWorld.myWorld.onEnter = function() {
            if (this.enterCount > 0) return;
    	    Fabrik.openFabrikBrowserExample(fabrikWorld.myWorld, pt(70,245));
    	    Fabrik.openFahrenheitCelsiusExample(fabrikWorld.myWorld, pt(100,20));
    	    Fabrik.openComponentBox(fabrikWorld.myWorld, pt(700,300));
            //          if (this.enterCount > 0) return;
            //          var importer = new NetImporter();
            //          importer.onCodeLoad = function(error) {
            // error || Global.phoneDemo(phoneWorld.myWorld, pt(250,180), 150);
            //          };
            //          importer.loadCode(URL.source.withFilename('phone.js'));
        }
    }
    
    return world;
}

function main() {
    var world = null;
    var canvas = Global.document.getElementById("canvas");


    if (canvas.height && canvas.height.baseVal && canvas.height.baseVal.value < 100) {
	// a forced value, some browsers have problems with height=100%
	canvas.setAttribute("height", "800");
    }
    var importer = new Importer();
    var world = importer.loadWorldContents(document);
    if (world) {
	world.displayOnCanvas(canvas);
	console.log("world is " + world);
	
	//just a quick hack...
	console.log('starting WikiNavigator');
    if(Config.showWikiNavigator) WikiNavigator.enableWikiNavigator();
    
	return;
    } else {
	world = new WorldMorph(canvas); 
	// Create an empty world
	world.displayOnCanvas(canvas);
	console.log("created empty world");
    }
    // Populate the world with sample objects, widgets and applications
    if (Config.skipAllExamples) return; // don't populate if we loaded up stuff from a container
    else populateWorldWithExamples(world);

if(Config.testTracing) Function.testTrace();

}

// the delay here is a workaround to give FF 2.0 the time to update
// the DOM to reflect the geometry of objects on the screen, which is
// needed to figure out font geometry. Apparently the update happens
// after control returns to the caller of JS
main.logCompletion("main").delay(Config.mainDelay);

}.logCompletion("Main.js"))();

