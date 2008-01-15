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
    
        var widget;
        var colors = Color.wheel(4);
        var widgetExtent = pt(70, 30);
        var loc = pt(30, 50); 
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
    
        // Create sample text widgets
        loc = loc.addPt(dy);    
        widget = new TextMorph(loc.extent(pt(100,50)), "Big Text");
        widget.setFontSize(20);
        widget.setTextColor(Color.blue);
        world.addMorph(widget);

        widget = new TextMorph(loc.addPt(dx).extent(pt(140,50)), "Unbordered");
        widget.setFontSize(20);  
        widget.setBorderWidth(0);  
        widget.setFill(null);
        world.addMorph(widget); 
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

