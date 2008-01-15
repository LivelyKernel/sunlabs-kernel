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
    
        // Note: All the morphs used below 
        // have been defined in Examples.js

        // Add a clock
        var widget = new ClockMorph(pt(110, 110), 100);
        world.addMorph(widget);
        widget.startSteppingScripts();

        // Add a Doodle Morph
        widget = new WindowMorph(new DoodleMorph(pt(425, 10).extent(pt(300, 300))), 'Doodle Morph');
        world.addMorph(widget);
        
        // Add Asteroids game
        var gameMorph = apps.asteroids.makeGameMorph(pt(150, 90).extent(pt(600, 300)));
        world.addMorph(new WindowMorph(gameMorph, 'Asteroids!'));
        apps.asteroids.initialize();
        gameMorph.runAsteroidsGame();
        
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

