/*
 * Copyright (c) 2006-2009 Sun Microsystems, Inc.
 *
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */


load('browser.js');
load('dom/index.xhtml.js');

print('loaded start document emulation');
Config.suppressImageElementSerializationHack = true;
Config.suppressBalloonHelp = true;  // to reduce distraction during demos
Config.rollOut = true;  // config for quick setup

load('../kernel/scene.js');
load('../kernel/Core.js');


Loader.loadedFiles = [];
Loader.loadJs = function(url, onLoadAction, embedSerializable) {
    var fileName = url.startsWith('http') ? /\/([a-zA-Z0-9]+\.js)/.exec(url)[1] : url;
    load('../kernel/' + fileName);
    if (onLoadAction) onLoadAction();
    Loader.loadedFiles.push(url);
}

Loader.scriptInDOM = function(url) {
    var preLoaded = ['Text.js', 'Core.js', 'scene.js', 'Widgets.js', 'Network.js',
        'Data.js','Tools.js', 'Examples.js', 'TileScripting.js', 'Helper.js', 'demofx.js' ];
    if (preLoaded.some(function(ea) { return url.include(ea) })) return true;
    return Loader.loadedFiles.include(url);
}


load('../kernel/Text.js');
load('../kernel/Widgets.js');

XenoMorph.addMethods({
    setFXComponent: function(component) {
	this.foRawNode._fxSetComponent(component);
    }
});


load('../kernel/Network.js');
load('../kernel/Data.js');
load('../kernel/Tools.js');
load('../kernel/Examples.js');


// example program

var browser = new fx.Frame(1200, 800, window.applet); //applet may be undefined


var canvas = document.getElementById("canvas");

fx.dom.update();
browser.display(canvas);


//Config.skipMostExamples = true;
//Config.suppressClipboardHack = true;
//Config.loadSerializedSubworlds = false;
//Config.showPenScript = false;
//load('../kernel/Main.js');

load('../kernel/Helper.js');
load('../kernel/TileScripting.js');



function swingDemo() {
    var rect = new Rectangle(0, 0, 500, 300);
    var xeno = new XenoMorph(rect);

    var JScrollPane = Packages.javax.swing.JScrollPane;
    var JEditorPane = Packages.javax.swing.JEditorPane;
    var Dimension = Packages.java.awt.Dimension;
    var URL = Packages.java.net.URL;
    var editorPane = new JEditorPane();
    editorPane.setEditable(false);
//    var url = new URL("http://livelykernel.sunlabs.com");
    var url = new URL("file:../kernel/sample.xhtml");
    try {
        editorPane.setPage(url);
    } catch (e) {
        console.log("Attempted to read a bad URL: " + url);
    }
    
    //Put the editor pane in a scroll pane.
    var editorScrollPane = new JScrollPane(editorPane);
    editorScrollPane.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_ALWAYS);
    editorScrollPane.setPreferredSize(new Dimension(rect.width, rect.height));
    editorScrollPane.setMinimumSize(new Dimension(10, 10));
    xeno.setFXComponent(editorScrollPane);
    //WorldMorph.current().addMorph(xeno).moveBy(pt(100,200));
    WorldMorph.current().addFramedMorph(xeno, "Swing Editor: " + url.toString(), pt(50, 50));
}


function swingFileChooserDemo()  {
    var JFileChooser = Packages.javax.swing.JFileChooser;
    var Dimension = Packages.java.awt.Dimension;

    var rect = new Rectangle(0, 0, 500, 300);
    var xeno = new XenoMorph(rect);
    var chooser = new JFileChooser();
    chooser.setMinimumSize(new Dimension(10, 10));
    WorldMorph.current().addFramedMorph(xeno, "Choose file ", pt(250, 150));
    xeno.setFXComponent(chooser);
}



function morphicMain() {
    var canvas = Global.document.getElementById("canvas");
    var world = new WorldMorph(canvas); 
    //world.setFill(Color.blue.lighter());
    console.log('created empty world ' + world);
    world.displayOnCanvas(canvas);
    console.log("displayed world");

    var createSimpleObjects = function (world) {  // ----- start createSimpleObjects
    var colors = Color.wheel(4);
    var loc = pt(150, 450); 
    var widgetExtent = pt(70, 30);
    var dy = pt(0,50); 
    var dx = pt(120,0);
    // Create a sample rectangle       
    var widget = Morph.makeRectangle(loc.extent(widgetExtent));
    widget.setFill(colors[0]);
    world.addMorph(widget);

    // Create a sample ellipse
    widget = new Morph(new lively.scene.Ellipse(loc.addPt(dx).extent(widgetExtent)));
    widget.applyStyle({fill:colors[1], borderWidth: 1, borderColor:Color.black});
    world.addMorph(widget);

     // Create a sample line
     loc = loc.addPt(dy);
     widget = Morph.makeLine([pt(0,15), pt(70,15)], 2, Color.black);
    widget.setPosition(loc);
     world.addMorph(widget);
     
     // Create a sample polygon
     widget = Morph.makePolygon([pt(0,0),pt(70,0),pt(40,30),pt(0,0)], 1, Color.black, colors[2]);
     world.addMorph(widget);
     widget.setPosition(loc.addPt(dx));
     loc = loc.addPt(dy);    
     
     // Create sample text widgets
    widget = new TextMorph(loc.extent(pt(100,50)),"Big Text"); // big text
    world.addMorph(widget.applyStyle({fontSize: 20, textColor: Color.blue}));
    widget = new TextMorph(loc.addPt(dx).extent(pt(140,50)),"Unbordered"); // unbordered text
    world.addMorph(widget.applyStyle({fontSize: 20, borderWidth: 0, fill: null})); 

    if (true) {  // Make a star
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
	
	if (true) {  // Make the star spin as a test of stepping
            widget.startStepping(60, "rotateBy", 0.1);
	}
    }
    }	// ----- end createSimpleObjects

    if (Config.showClock) {
        var widget = new ClockMorph(pt(80, 100), 50);
        world.addMorph(widget);
        widget.startSteppingScripts();
        if (false) {  // needs XMLHttpRequest :-(
            require('lively.Tools').toRun(function() {
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
            });
        }
    }
    var link = new LinkMorph(null, pt(60, 400));
    world.addMorph(link);
    createSimpleObjects(link.myWorld);

    if (Config.showEngine()) 
	EngineMorph.makeEngine(world, pt(400, 5))

    
    if (!Config.rollOut) swingDemo();
    //swingFileChooserDemo();
    
    if (Config.showTester && !Config.rollOut)
        require('Examples.js').toRun(function() { new TestWidget().openIn(world, pt(835, 450)) });

    // tile script environment
    Config.activateTileScripting = true;
    if (Config.activateTileScripting && !Config.rollOut) {
        require('TileScripting.js').toRun(function() {
            lively.TileScripting.ScriptEnvironment.open();
            world.topSubmorph().moveBy(pt(820, 80));
            lively.TileScripting.TileBox.open();
            world.topSubmorph().moveBy(pt(1050, 80));
        });
    }

    if(Config.useShadowMorphs) HandMorph.prototype.useShadowMorphs = true;

    load('../kernel/demofx.js');
    console.log('world morph is ' + WorldMorph.current());
    try {
	require('demofx.js').toRun(Functions.Empty);
    } catch (er) { console.log('failed demofx, er' + er);}

}



window.setTimeout(morphicMain, 500);



