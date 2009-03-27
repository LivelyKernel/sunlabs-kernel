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

    // Function to populate the world
    populateWorld: function(world) { 
    
        var widget;
        var colors = Color.wheel(4);
        var widgetExtent = pt(70, 30);
        var loc = pt(30, 50); 
        var dy = pt(0, 50); 
        var dx = pt(120, 0);
 
        // Create a sample rectangle       
        widget = new Morph(loc.extent(widgetExtent), "rect");
        widget.setFill(colors[0]);
        world.addMorph(widget);

        // Create a sample ellipse
        widget = new Morph(loc.addPt(dx).extent(widgetExtent), "ellipse");
        widget.setFill(colors[1]);
        world.addMorph(widget);

        // Create a sample line
        loc = loc.addPt(dy);
        widget = Morph.makeLine([loc.addXY(0,15),loc.addXY(70,15)], 2, Color.black);
        world.addMorph(widget);
        
        // Create a sample polygon
        var l2 = loc.addPt(dx);
        widget = new Morph(l2.asRectangle(),"rect");
        widget.setShape(new PolygonShape([pt(0,0),pt(70,0),pt(40,30),pt(0,0)], colors[2],1,Color.black));
        world.addMorph(widget);
    
        // Create sample text widgets
        loc = loc.addPt(dy);    
        widget = new TextMorph(loc.extent(pt(100,50)), "Big Text");
        widget.setFontSize(20);
        widget.setTextColor(Color.blue);
        world.addMorph(widget);

        widget = new TextMorph(loc.addPt(dx).extent(pt(140,50)), "Unbordered");
        widget.setFontSize(20);  
        widget.setBorderWidth(0);  
        widget.setFill(null);
        world.addMorph(widget); 
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

