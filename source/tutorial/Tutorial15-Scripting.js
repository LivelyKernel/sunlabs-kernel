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

    makeStarVertices: function(r,center,startAngle) {
        var vertices = [];
        var nVerts = 10;
        for (var i=0; i<=nVerts; i++) {
            var a = startAngle + (2*Math.PI/nVerts*i);
            var p = Point.polar(r,a);
            if (i%2 == 0) p = p.scaleBy(0.39);
            vertices.push(p.addPt(center)); 
        }
        
        return vertices;
    },

    // Function to populate the world
    populateWorld: function(world) { 

        // Create a polygon shape that looks like a star
        var widget = new Morph(pt(0,0).asRectangle(), "rect");
        widget.setShape(new PolygonShape(this.makeStarVertices(50,pt(0,0),0), Color.yellow, 1, Color.black));
        widget.setPosition(pt(100, 100));
        world.addMorph(widget);
        
        // Rotate the star every 50 milliseconds
        widget.startStepping(50, "rotateBy", 0.1);

        // Add a label to the star
        var widget2 = new TextMorph(pt(10, 10).extent(pt(150, 50)), "I'm using a timer...");
        widget2.setFontSize(20);
        widget.addMorph(widget2);

        // Create two additional copies of the object that we just created
        var copy = widget.copy();
        world.addMorph(copy); 
        copy.moveBy(pt(300, 0));

        // Place the second copy on top of the previous one (just for fun...)
        var copy2 = copy.copy();
        // copy2.setPosition(pt(0, 0));
        copy.addMorph(copy2); 

        // Add a clock that rotates and moves slowly as it ticks
        var clock = new ClockMorph(pt(100, 300), 50);
        world.addMorph(clock);
        clock.startStepping(1000, "rotateBy", 0.1);
        clock.startStepping(1000, "moveBy", pt(10, 0));
        clock.startSteppingScripts();

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

