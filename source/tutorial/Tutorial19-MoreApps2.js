/*
 * Copyright © 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

/**
 * @class TutorialMorph
 */

TutorialMorph = Morph.subclass("TutorialMorph", {

    // Function to populate the world
    populateWorld: function(world) { 

        // Note: All the widgets and apps used below 
        // have been defined in Examples.js

        // Open a stock widget
        var stockWidget = new StockWidget();
        stockWidget.startSteppingRefreshCharts(stockWidget.openIn(world, pt(20, 20)));

        // Open a map widget
        var tile = apps.maps.tileExtent;
        var map = new apps.maps.MapFrameMorph(new Rectangle(0, 0, 2*tile.x, 2*tile.y), true);
        map.setScale(0.7);
        map.setPosition(pt(900, 25));
        world.addMorph(map);
        world.mapMorph = map;
    
        // Open a weather widget
        var weatherWidget = new WeatherWidget().openIn(world, pt(620, 50));

        // Open an RSS feed reader
        var rssReader = new Feed("http://www.news.com/2547-1_3-0-5.xml").openIn(world, pt(635, 340));

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
    new TutorialMorph();
}

main();

