/*
 * Copyright © 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

/**
 * @class TutorialMorph
 */

TutorialMorph = Morph.subclass("TutorialMorph", {

    // Function to populate the world
    populateWorld: function(world) { 
    
        // Add a LinkMorph
        var link = new LinkMorph(null, pt(50, 50));
        world.addMorph(link);

        // Add a TextMorph to the main world
        var text = new TextMorph(pt(150, 40).extent(pt(300, 50)), "This is the top-level world");
        text.setFontSize(20);
        text.setTextColor(Color.blue);
        world.addMorph(text);

        var widget;
        var colors = Color.wheel(4);
        var widgetExtent = pt(70, 30);
        var loc = pt(30, 150); 
        var dy = pt(0, 50); 
        var dx = pt(120, 0);
 
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
        var l2 = loc.addPt(dx);
        widget = new Morph(l2.asRectangle(),"rect");
        widget.setShape(new PolygonShape([pt(0,0),pt(70,0),pt(40,30),pt(0,0)], colors[2],1,Color.black));
        world.addMorph(widget);
    
        // Add an ImageMorph to the subworld
        var image = new ImageMorph(pt(140, 60).extent(672/2, 448/2), "../Resources/images/Halloween4.jpg");
        link.myWorld.addMorph(image); 

        // Add a TextMorph
        var credits = new TextMorph(pt(140, 300).extent(pt(400, 300)), 
                          "Our Core Team Members (pictured from left to right):\n"
                        + "- Tommi Mikkonen\n" 
                        + "- Krzysztof Palacz\n"
                        + "- Dan Ingalls\n"
                        + "- Antero Taivalsaari");
        credits.setBorderWidth(0);  
        credits.setFill(null);
        link.myWorld.addMorph(credits); 
    },

    // Function that creates the tutorial demo
    createTutorial: function() {
        
        // Create an empty world
        var world = new WorldMorph(Canvas);
        
        // Set the world current and display it
        WorldMorph.setCurrent(world);
        world.displayWorldOn(Canvas);

        // Populate the world with sample objects
        this.populateWorld(world);        
    },
    
    // Demo instantiation
    initialize: function() {
        this.createTutorial();
    }

});

// Instantiate the tutorial
function main() {
    new TutorialMorph();
}

main();

