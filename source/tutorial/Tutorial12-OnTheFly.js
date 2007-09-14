/**
 * @class TutorialMorph
 */

TutorialMorph = HostClass.create('TutorialMorph', Morph);

Object.extend(TutorialMorph.prototype, {

    // Reference to the world 
    world: null,

    // Scripts that we use in the text boxes
    script1: "P = new Pen(); \nP.setPenColor(Color.red); \nfor (var i=1; i<=60; i++) \n   { P.go(2*i); P.turn(59); }; \nP.drawLines(); \n",
    script2: "P = new Pen(); \nP.setPenColor(Color.green); \nfor (var i=1; i<=60; i++) \n   { P.go(2*i); P.turn(69); }; \nP.drawLines(); \n",
    script3: "P = new Pen(); \nP.setPenColor(Color.blue); \nfor (var i=1; i<=60; i++) \n   { P.go(2*i); P.turn(79); }; \nP.drawLines(); \n",
    script4: "P = new Pen(); \nP.setPenColor(Color.black); \nfor (var i=1; i<=60; i++) \n   { P.go(2*i); P.turn(89); }; \nP.drawLines(); \n",

    // Function to populate the world
    populateWorld: function(world) { 
    
        var widget = TextMorph(pt( 50,  30).extent(pt(250, 50)), this.script1);
        world.addMorph(widget);

        var widget = TextMorph(pt(400,  30).extent(pt(250, 50)), this.script2);
        world.addMorph(widget);

        var widget = TextMorph(pt( 50, 120).extent(pt(250, 50)), this.script3);
        world.addMorph(widget);

        var widget = TextMorph(pt(400, 120).extent(pt(250, 50)), this.script4);
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

