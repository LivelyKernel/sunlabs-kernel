/**
 * @class TutorialMorph
 */

TutorialMorph = HostClass.create('TutorialMorph', Morph);

Object.extend(TutorialMorph.prototype, {

    // Reference to the world 
    world: null,

    // Function to populate the world
    populateWorld: function(world) { 
    
        // Note: CanvasScapeMorph has been defined in Examples.js
        var widget = CanvasScapeMorph(Rectangle(20, 20, 800, 300));
        world.addMorph(WindowMorph(widget, 'CanvasScape'));

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

