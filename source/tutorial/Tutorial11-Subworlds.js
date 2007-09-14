/**
 * @class TutorialMorph
 */

TutorialMorph = HostClass.create('TutorialMorph', Morph);

Object.extend(TutorialMorph.prototype, {

    // Reference to the world 
    world: null,

    // Function to populate the world
    populateWorld: function(world) { 
    
        // Add a LinkMorph
        var widget = LinkMorph(null, pt(100, 100));
        world.addMorph(widget);

        // Add a TextMorph
        widget = TextMorph(pt(250, 80).extent(pt(300, 50)), "This is the top-level world");
        widget.setFontSize(20);
        widget.setTextColor(Color.blue);
        world.addMorph(widget);

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

