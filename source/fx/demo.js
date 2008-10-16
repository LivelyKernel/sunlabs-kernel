/*
 * Copyright � 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

load('browser.js');
load('dom/index.xhtml.js');
print('loaded start document emulation');

load('../kernel/Core.js');
load('../kernel/Text.js');
load('../kernel/Widgets.js');
load('../kernel/Network.js');
load('../kernel/Data.js');
load('../kernel/Tools.js');
load('../kernel/Examples.js');

// example program

var browser = new fx.Frame(1024, 680);

var canvas = document.getElementById("canvas");


function swingDemo() {
    var rect = new Rectangle(0, 0, 500, 300);
    var xeno = new XenoMorph(rect);

    var JScrollPane = Packages.javax.swing.JScrollPane;
    var JEditorPane = Packages.javax.swing.JEditorPane;
    var Dimension = Packages.java.awt.Dimension;
    var URL = Packages.java.net.URL;
    var editorPane = new JEditorPane();
    editorPane.setEditable(false);
    var url = new URL("http://livelykernel.sunlabs.com");
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
    xeno.foRawNode._fxSetComponent(editorScrollPane);
    WorldMorph.current().addFramedMorph(xeno, "Swing Editor: " + url.toString(), pt(50, 50));
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

    if (Config.showClock) {
        var widget = new ClockMorph(pt(80, 100), 50);
        world.addMorph(widget);
        widget.startSteppingScripts();
	widget.setFill(Color.yellow); // cheating b/c we don't have gradients
    }
    var link = new LinkMorph(null, pt(60, 400));
    world.addMorph(link);

    if (Config.showEngine())
        EngineMorph.makeEngine(world, pt(400, 5))
    

    canvas._fxBegin.requestFocus();
    swingDemo();
}

fx.dom.update();
browser.display(canvas._fxBegin);


window.setTimeout(morphicMain, 500);



