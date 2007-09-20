/**
 * @class TutorialMorph
 */

TutorialMorph = HostClass.create('TutorialMorph', Morph);

// Make sure the class browser knows about the Global context
Global = this;

Object.extend(TutorialMorph.prototype, {

    // Reference to the world 
    world: null,

    // Function to populate the world
    populateWorld: function(world) { 

        // Open a class browser    
        var widget = new SimpleBrowser().openIn(world, pt(20,20));

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

