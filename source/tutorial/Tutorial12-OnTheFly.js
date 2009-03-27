/*
 * Copyright (c) 2006-2009 Sun Microsystems, Inc.
 *
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * @class TutorialExample
 */

Object.subclass("TutorialExample", {

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
    new TutorialExample();
}

main();

