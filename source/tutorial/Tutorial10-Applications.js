/**
 * @class TutorialMorph
 */

TutorialMorph = HostClass.create('TutorialMorph', Morph);

Object.extend(TutorialMorph.prototype, {

    // Reference to the world 
    world: null,

    // Function to populate the world
    populateWorld: function(world) { 
    
        // Note: All the morphs used below 
        // have been defined in Examples.js

        // Add a clock
        var widget = ClockMorph(pt(110, 110), 100);
        world.addMorph(widget);
        widget.startSteppingScripts();

        // Add a Doodle Morph
        widget = WindowMorph(DoodleMorph(pt(445, 10).extent(pt(300, 300))), 'Doodle Morph');
        world.addMorph(widget);
        
        // Add Asteroids game
        var gameMorph = apps.asteroids.makeGameMorph(pt(150, 90).extent(pt(600, 300)));
        world.addMorph(WindowMorph(gameMorph, 'Asteroids!'));
        apps.asteroids.initialize();
        gameMorph.runAsteroidsGame();
        
    },

    // Function that creates the tutorial demo
    createTutorial: function() {
        
        // Create an empty world
        world = WorldMorph.createEmptyWorld();
        
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

