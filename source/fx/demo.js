/*
 * Copyright � 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 


var fx = {
    Panel: Packages.com.sun.scenario.scenegraph.JSGPanel,
    Group: Packages.com.sun.scenario.scenegraph.SGGroup,
    Shape: Packages.com.sun.scenario.scenegraph.SGShape,
    Transform: Packages.com.sun.scenario.scenegraph.SGTransform,
    ShapeMode: Packages.com.sun.scenario.scenegraph.SGAbstractShape$Mode,
    Ellipse: Packages.java.awt.geom.Ellipse2D.Double,
    Rectangle: Packages.java.awt.geom.Rectangle2D.Double,
    Color: Packages.java.awt.Color,
    Timer: Packages.javax.swing.Timer,
    util: {
	antiAlias: function(shape) {
	    var hints = Packages.java.awt.RenderingHints;
	    shape.setAntialiasingHint(hints.VALUE_ANTIALIAS_ON);
	},
	setBorderWidth: function(shape, width) {
	    var BasicStroke = Packages.java.awt.BasicStroke;
	    shape.setDrawStroke(new BasicStroke(width, BasicStroke.CAP_ROUND,
						BasicStroke.JOIN_MITER));
            shape.setMode(fx.ShapeMode.STROKE_FILL);
	},
	
	addMouseListener: function(shape, eventName, handler) {
	    var adapter  = new fx.util.MouseAdapter();
	    adapter[eventName] = function(awtEvent, sgNode) {
		handler.call(this, awtEvent, sgNode);
	    }
	    var listenerClass = Packages.com.sun.scenario.scenegraph.event.SGMouseListener;
	    var jAdapter = new listenerClass(adapter);
	    shape.addMouseListener(jAdapter);
	}
    }
}

fx.util.MouseAdapter = function() { }
fx.util.MouseAdapter.prototype = {
    mouseClicked: function(awtEvent, sgNode) { },
    mouseDragged: function(awtEvent, sgNode) { },
    mouseEntered: function(awtEvent, sgNode) { },
    mouseExited: function(awtEvent, sgNode) { },
    mouseMoved: function(awtEvent, sgNode) { },
    mousePressed: function(awtEvent, sgNode) { },
    mouseReleased: function(awtEvent, sgNode) { },
    mouseWheelMoved: function(awtEvent, sgNode) { }
}

fx.util.setInterval = function(callback, delay) {
    var listener = new Packages.java.awt.event.ActionListener({
	actionPerformed: function(actionEvent) {
	    // transform actionEvent ?
	    callback.call(this, actionEvent);
	}
    });
    var timer = new fx.Timer(delay, listener);
    timer.start();
}


fx.Frame = function(width, height) {
    this.frame = new Packages.javax.swing.JFrame();
    this.frame.setSize(width, height);
    this.panel = new Packages.com.sun.scenario.scenegraph.JSGPanel();
    this.panel.setBackground(fx.Color.white);
    this.panel.setPreferredSize(new Packages.java.awt.Dimension(width, height));
    this.frame.add(this.panel);
}

fx.Frame.prototype.display = function(node) {
    this.panel.setScene(node);
    this.frame.pack();
    this.frame.setVisible(true);
}

var browser = new fx.Frame(1024,500);
var group = new fx.Group(); 
    
var shape = new fx.Shape();
shape.setShape(new fx.Ellipse(50, 50, 50, 50));
shape.setFillPaint(fx.Color.BLUE);
fx.util.antiAlias(shape);
group.add(shape);
fx.util.addMouseListener(shape, "mousePressed", function(evt) { 
    print('mousePressed event ' + evt);
});



shape = new fx.Shape();
shape.setShape(new fx.Rectangle(150, 150, 50, 50));
shape.setFillPaint(fx.Color.RED);
shape.setDrawPaint(fx.Color.GREEN);
fx.util.antiAlias(shape);
fx.util.setBorderWidth(shape, 2);

var container = new fx.Transform.createRotation(0, shape);
group.add(container);

browser.display(group);
var tickCounter = 0;

fx.util.setInterval(function() {
    group.remove(container);
    tickCounter ++;
    container = fx.Transform.createRotation(tickCounter * Math.PI/32, shape);
    group.add(container);
}, 1000);
