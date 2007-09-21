/*
 * Copyright © 2006-2007 Sun Microsystems, Inc.
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

TutorialMorph = HostClass.create('TutorialMorph', Morph);

Object.extend(TutorialMorph.prototype, {

    // Reference to the world 
    world: null,

    makeStarVertices: function(r,center,startAngle) {
        var vertices = [];
        var nVerts = 10;
        for (var i=0; i<=nVerts; i++) {
            var a = startAngle + (2*Math.PI/nVerts*i);
            var p = Point.polar(r,a);
            if (i%2 == 0) p = p.scaleBy(0.39);
            vertices.push(p.addPt(center)); 
        }
        
        return vertices;
    },

    // Function to populate the world
    populateWorld: function(world) { 

        // Create a polygon shape that looks like a star
        var widget = Morph(pt(0,0).asRectangle(), "rect");
        widget.setShape(PolygonShape(this.makeStarVertices(50,pt(0,0),0), Color.yellow, 1, Color.black));
        widget.setPosition(pt(100, 100));
        world.addMorph(widget);
        
        // Rotate the star every 50 milliseconds
        widget.startStepping(50, "rotateBy", 0.1);

        // Add a label to the star
        var widget2 = TextMorph(pt(10, 10).extent(pt(150, 50)), "I'm using a timer...");
        widget2.setFontSize(20);
        widget.addMorph(widget2);

        // Create two additional copies of the object that we just created
        var copy = widget.copy();
        world.addMorph(copy); 
        copy.moveBy(pt(300, 0));

        // Place the second copy on top of the previous one (just for fun...)
        var copy2 = copy.copy();
        copy2.setPosition(pt(0, 0));
        copy.addMorph(copy2); 

        // Add a clock that rotates and moves slowly as it ticks
        var clock = ClockMorph(pt(100, 300), 50);
        world.addMorph(clock);
        clock.startStepping(1000, "rotateBy", 0.1);
        clock.startStepping(1000, "moveBy", pt(10, 0));
        clock.startSteppingScripts();

    },

    // Function that creates the tutorial demo
    createTutorial: function() {
        
        // Create an empty world
        world = WorldMorph(Canvas);
        
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
    TutorialMorph();
}

main();

