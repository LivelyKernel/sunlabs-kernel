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
    
        // Note: CanvasScapeMorph has been defined in Examples.js
        var widget = new CanvasScapeMorph(new Rectangle(20, 20, 800, 300));
        world.addMorph(new WindowMorph(widget, 'CanvasScape'));

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

