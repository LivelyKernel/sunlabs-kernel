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
load('../kernel/Core.js');


Loader.loadScript = function(url /*not really a url yet*/, onLoadAction, embedSerializable) {
    load('../kernel/' + url);
    if (onLoadAction) {
        onLoadAction();
        // why signal moduleLoaded again? should already be included in onLoadAction...???
        if (noPendingRequirements(url)) moduleLoaded(url);
    }
    Loader.wasLoaded[url] = true;
    Loader.pendingActionsFor(url).forEach(function(ea) {
        // console.log(url + ' was loaded. Loading now its pending action for ' + ea.url);
        ea.action();
        if (noPendingRequirements(ea.url)) moduleLoaded(ea.url);
    });
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

var browser = new fx.Frame(1200, 800);


var canvas = document.getElementById("canvas");

fx.dom.update();
browser.display(canvas);


//Config.skipMostExamples = true;
//Config.suppressClipboardHack = true;
//Config.loadSerializedSubworlds = false;
//Config.showPenScript = false;
//load('../kernel/Main.js');


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
    var colors = Color.wheel(4);
    var loc = pt(150, 450); 
    var widgetExtent = pt(70, 30);
    var dy = pt(0,50); 
    var dx = pt(120,0);
    // Create a sample rectangle       
    var widget = new Morph(loc.extent(widgetExtent), "rect");
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

    ClockMorph.addMethods({  //Tweak the clock label size and placement...
    makeNewFace: function(items) {
        var bnds = this.innerBounds();
        var radius = bnds.width/2;
        var labelSize = Math.max(Math.floor(0.04 * (bnds.width + bnds.height)), 2); // room to center with default inset
        for (var i = 0; i < items.length; i++) {
            //var labelPosition = bnds.center().addPt(Point.polar(radius*0.85, ((i/items.length - 0.25)*Math.PI*2)).addXY(labelSize/2, 0));
	    var labelPosition = bnds.center().addPt(Point.polar(radius*0.85, ((i/items.length - 0.25)*Math.PI*2)));
	    this.addMorph(TextMorph.makeLabel(items[i], 9).centerAt(labelPosition.addPt(pt(5, 2))));
        }
        this.hours   = this.addMorph(Morph.makeLine([pt(0,0), pt(0, -radius*0.50)], 4, Color.blue));
        this.minutes = this.addMorph(Morph.makeLine([pt(0,0), pt(0, -radius*0.70)], 3, Color.blue));
        this.seconds = this.addMorph(Morph.makeLine([pt(0,0), pt(0, -radius*0.75)], 2, Color.red));
        this.setHands();
        this.changed(); 
    }
    });

    if (Config.showClock) {
        var widget = new ClockMorph(pt(80, 100), 50);
        world.addMorph(widget);
        widget.startSteppingScripts();
    }
    var link = new LinkMorph(null, pt(60, 400));
    world.addMorph(link);

    if (Config.showEngine()) 
	EngineMorph.makeEngine(world, pt(400, 5))

    
    // piano
    if (false) { // Can be opened from menu - show it later in demo
	module('Main.js').requires('Examples.js').toRun(function() {
        var m = new PianoKeyboard(pt(100, 650));
        m.scaleBy(1.5);  
	m.rotateBy(-0.2);
    	world.addMorph(m);
    }); }
    //return;

    swingDemo();
    //swingFileChooserDemo();
    
    if (Config.showTester)
        require('Examples.js').toRun(function() { new TestWidget().openIn(world, pt(835, 450)) });

    // tile script environment
    Config.activateTileScripting = true;
    if (Config.activateTileScripting) {
	ScriptEnvironment.open();
	world.topSubmorph().moveBy(pt(820, 80));
	TileBox.open();
	world.topSubmorph().moveBy(pt(1050, 80));
    }


}



window.setTimeout(morphicMain, 500);



