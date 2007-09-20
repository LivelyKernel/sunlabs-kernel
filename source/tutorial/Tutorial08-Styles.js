/**
 * @class TutorialMorph
 */

TutorialMorph = HostClass.create('TutorialMorph', Morph);

Object.extend(TutorialMorph.prototype, {

    // Reference to the world 
    world: null,

    // Function to populate the world
    populateWorld: function(world) { 
    
        var widget;
        var colors = Color.wheel(4);
        var widgetExtent = pt(200, 100);
        var loc = pt(500, 50); 
 
        // Create a sample rectangle       
        widget = Morph(loc.extent(widgetExtent), "rect");
        widget.setFill(colors[0]);
        world.addMorph(widget);

        // Open a style panel for the rectangle
        StylePanel.openOn(widget);
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

