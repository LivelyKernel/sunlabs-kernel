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
 * @class TutorialMorph
 */

TutorialMorph = Morph.subclass("TutorialMorph", {

    // Scripts that we use in the text boxes
    script1: "P = new Pen(); \nP.setPenColor(Color.red); \nfor (var i=1; i<=60; i++) \n   { P.go(2*i); P.turn(59); }; \nP.drawLines(); \n",
    script2: "P = new Pen(); \nP.setPenColor(Color.green); \nfor (var i=1; i<=60; i++) \n   { P.go(2*i); P.turn(69); }; \nP.drawLines(); \n",
    script3: "P = new Pen(); \nP.setPenColor(Color.blue); \nfor (var i=1; i<=60; i++) \n   { P.go(2*i); P.turn(79); }; \nP.drawLines(); \n",
    script4: "P = new Pen(); \nP.setPenColor(Color.black); \nfor (var i=1; i<=60; i++) \n   { P.go(2*i); P.turn(89); }; \nP.drawLines(); \n",

    // Function to populate the world
    populateWorld: function(world) { 
    
        var widget;

        widget = new TextMorph(pt( 50,  30).extent(pt(250, 50)), this.script1);
        world.addMorph(widget);

        widget = new TextMorph(pt(400,  30).extent(pt(250, 50)), this.script2);
        world.addMorph(widget);

        widget = new TextMorph(pt( 50, 120).extent(pt(250, 50)), this.script3);
        world.addMorph(widget);
        widget.rotateBy(0.1); // Just for fun...

        widget = new TextMorph(pt(400, 120).extent(pt(250, 50)), this.script4);
        world.addMorph(widget);
        widget.rotateBy(0.2); // Just for fun...
        widget.setScale(1.2); // Just for fun...

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

