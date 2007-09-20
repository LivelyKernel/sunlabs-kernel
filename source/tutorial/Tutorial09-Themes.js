/**
 * @class TutorialMorph
 */

TutorialMorph = HostClass.create('TutorialMorph', Morph);

Object.extend(TutorialMorph.prototype, {

    // Reference to the world 
    world: null,

    // Function to populate the world
    populateWorld: function(world) { 
    
        var widget = new WidgetTester();
        widget.openIn(world, pt(50, 50));
        
        world.addMorph(WindowMorph(Sun3DMorph(pt(520, 50).extent(pt(200, 200))), 'Sun 3D Logo'));

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

