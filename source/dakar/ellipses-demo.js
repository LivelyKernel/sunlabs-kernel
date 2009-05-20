load('bootstrap.js');
load('rhino-compat.js');
load('lang.js');
load('jslib/dojo.js.uncompressed.js');

load('scene.js');

(function() {
    var jsctx = Packages.org.mozilla.javascript.Context.currentContext;
    print('opt level ' + jsctx.getOptimizationLevel());
})();


var Global = this;

function parentChain(fxInstance) {
    var parents = [];
    for (var p = fxInstance; p != null; p = p.getParent()) {
	parents.push(p);
    }
    return parents;
}
    
function isInstanceOf(object, fxClassName) {
    return Packages.java.lang.Class.forName(fxClassName).isInstance(object);
}
    
function set_interval(callback, delay) {
    // env.js setInterval is not Swing-friendly
    var listener = new JavaAdapter(Packages.java.awt.event.ActionListener, {
	actionPerformed: function(actionEvent) {
	    // transform actionEvent ?
	    callback.call(Global, actionEvent);
	}
    });
    var timer = new Packages.javax.swing.Timer(delay, listener);
    timer.start();
    return timer;
}
    
function setTimeout(action, delay) {
    var timer = set_interval(function() {
	action.apply(this, arguments);
	//fx.dom.update();
    }, delay);
    timer.setRepeats(false);
    return timer;
};
    
    
function setInterval(action, delay) {
    return set_interval(function() {
	action.apply(this, arguments);
	//fx.dom.update();
    }, delay);
};

    
fx.scene.Node.prototype.adopt({ // DOJO stuff
    getEventSource: function(){
	return this; // since Shape is the "DOM node" itself
    },
    
    connect: function(name, object, method){
	// summary: connects a handler to an event on this shape
	
	// COULD BE RE-IMPLEMENTED BY THE RENDERER!
	
	return arguments.length > 2 ?	// Object
	dojo.connect(this.getEventSource(), name, object, method) :
	    dojo.connect(this.getEventSource(), name, object);
    },
    disconnect: function(token){
	// summary: connects a handler by token from an event on this shape
	
	// COULD BE RE-IMPLEMENTED BY THE RENDERER!
	
	dojo.disconnect(token);
    }
});
    
var demo = new fx.lang.Object();
    
demo.Moveable = fx.lang.Object.extend({
    constructor: {
	value: function(inherited, shape, params) {
	    inherited();
	    // summary: an object, which makes a shape moveable
	    // shape: dojox.gfx.Shape: a shape object to be moved
	    // params: Object: an optional object with additional parameters;
	    //	following parameters are recognized:
	    //		delay: Number: delay move by this number of pixels
	    //		mover: Object: a constructor of custom Mover
	    this.shape = shape;
	    this.delay = (params && params.delay > 0) ? params.delay : 0;
	    this.mover = (params && params.mover) ? params.mover : demo.Mover;
	    this.events = [
		this.shape.connect("onmousedown", this, "onMouseDown")
		// cancel text selection and text dragging
		//, dojo.connect(this.handle, "ondragstart",   dojo, "stopEvent")
		//, dojo.connect(this.handle, "onselectstart", dojo, "stopEvent")
	    ];
	}
    },
    
    // methods
    destroy: {
	value: function(){
	    // summary: stops watching for possible move, deletes all references, so the object can be garbage-collected
	    this.events.forEach(this.shape.disconnect, this.shape);
	    this.events = this.shape = null;
	}
    },
    
    // mouse event processors
    onMouseDown: {
	value: function(e){
	    // summary: event processor for onmousedown, creates a Mover for the shape
	    // e: Event: mouse event
	    if(this.delay){
		this.events.push(this.shape.connect("onmousemove", this, "onMouseMove"));
		this.events.push(this.shape.connect("onmouseup", this, "onMouseUp"));
		this._lastX = e.clientX;
		this._lastY = e.clientY;
	    }else{
		new this.mover(this.shape, e, this);
	    }
	    dojo.stopEvent(e);
	}
    },
    
    onMouseMove: {
	value: function(e){
	    // summary: event processor for onmousemove, used only for delayed drags
	    // e: Event: mouse event
	    if(Math.abs(e.clientX - this._lastX) > this.delay || Math.abs(e.clientY - this._lastY) > this.delay){
		this.onMouseUp(e);
		
		new this.mover(this.shape, e, this);
	    }
	    dojo.stopEvent(e);
	}
    },
    
    onMouseUp: {
	value: function(e){
	    // summary: event processor for onmouseup, used only for delayed delayed drags
	    // e: Event: mouse event
	    this.shape.disconnect(this.events.pop());
	    this.shape.disconnect(this.events.pop());
	}
    },
    
    // local events
    onMoveStart: {
	value: function(/* dojox.gfx.Mover */ mover){
	    // summary: called before every move operation
	    dojo.publish("/gfx/move/start", [mover]);
	    //dojo.addClass(dojo.body(), "dojoMove");
	}
    },
    
    onMoveStop:  {
	value: function(/* dojox.gfx.Mover */ mover){
	    // summary: called after every move operation
	    dojo.publish("/gfx/move/stop", [mover]);
	    //dojo.removeClass(dojo.body(), "dojoMove");
	}
    },
    onFirstMove: {
	value: function(/* dojox.gfx.Mover */ mover){
	    // summary: called during the very first move notification,
	    //	can be used to initialize coordinates, can be overwritten.
	    
	    // default implementation does nothing
	}
    },
    onMove: {
	value: function(/* dojox.gfx.Mover */ mover, /* Object */ shift){
	    // summary: called during every move notification,
	    //	should actually move the node, can be overwritten.
	    this.onMoving(mover, shift);
	    this.shape.translateX += shift.dx;
	    this.shape.translateY += shift.dy;
	    this.onMoved(mover, shift);
	}
    },
    onMoving: {
	value: function(/* dojox.gfx.Mover */ mover, /* Object */ shift){
	    // summary: called before every incremental move,
	    //	can be overwritten.
	    
	    // default implementation does nothing
	}
    },
    onMoved: {
	value: function(/* dojox.gfx.Mover */ mover, /* Object */ shift){
	    // summary: called after every incremental move,
	    //	can be overwritten.
	    
	    // default implementation does nothing
	}
    }
});
    
demo.Mover = fx.lang.Object.extend({
    constructor: {
	value: function (inherited, shape, e, host){
	    inherited();
	    // summary: an object, which makes a shape follow the mouse,
	    //	used as a default mover, and as a base class for custom movers
	    // shape: dojox.gfx.Shape: a shape object to be moved
	    // e: Event: a mouse event, which started the move;
	    //	only clientX and clientY properties are used
	    // host: Object?: object which implements the functionality of the move,
	    //	 and defines proper events (onMoveStart and onMoveStop)
	    this.shape = shape;
	    this.lastX = e.clientX
	    this.lastY = e.clientY;
	    var h = this.host = host, d = shape.getEventSource(), //d was document,
		firstEvent = dojo.connect(d, "onmousemove", this, "onFirstMove");
	    this.events = [
		dojo.connect(d, "onmousemove", this, "onMouseMove"),
		dojo.connect(d, "onmouseup",   this, "destroy"),
		// cancel text selection and text dragging
		dojo.connect(d, "ondragstart",   dojo, "stopEvent"),
		dojo.connect(d, "onselectstart", dojo, "stopEvent"),
		firstEvent
	    ];
	    
	    print('new mover ' + e + ' shape ' + shape.boundsInLocal + ',' + shape.boundsInParent);
	    
	    // notify that the move has started
	    if(h && h.onMoveStart) {
		h.onMoveStart(this);
	    }
	}
    },
    // mouse event processors
    onMouseMove: {
	value: function(e){
	    // summary: event processor for onmousemove
	    // e: Event: mouse event
	    var x = e.clientX;
	    var y = e.clientY;
	    this.host.onMove(this, {dx: x - this.lastX, dy: y - this.lastY});
	    this.lastX = x;
	    this.lastY = y;
	    dojo.stopEvent(e);
	}
    },
    // utilities
    onFirstMove: {
	value: function(){
	    // summary: it is meant to be called only once
	    this.host.onFirstMove(this);
	    dojo.disconnect(this.events.pop());
	}
    },
    
    destroy: {
	value: function() {
	    // summary: stops the move, deletes all references, so the object can be garbage-collected
	    this.events.forEach(dojo.disconnect);
	    // undo global settings
	    var h = this.host;
	    if(h && h.onMoveStop) {
		h.onMoveStop(this);
	    }
	    // destroy objects
	    this.events = this.shape = null;
	}
    }
});
    
    
function runDemo(applet) {


    var browser = new fx.scene.Stage(800, 480, applet); // applet could be undefined
    
    browser.display(new fx.scene.Node());
    
	
    
    var container = null,
	//	surface = null,
    surface_size = null;
    
    function getRand(from, to){
	return Math.random() * (to - from) + from;
    }
    
    var skew_stat_factor = 15;
    
    function getRandSkewed(from, to){
	// let skew stats to smaller values
	var seed = 0;
	for(var i = 0; i < skew_stat_factor; ++i){
	    seed += Math.random();
	}
	seed = 2 * Math.abs(seed / skew_stat_factor - 0.5);
	return seed * (to - from) + from;
    }
    
    function randColor(alpha){
	var red  = Math.floor(getRand(0, 255)),
	    green = Math.floor(getRand(0, 255)),
	    blue  = Math.floor(getRand(0, 255)),
	    opacity = alpha ? getRand(0.1, 1) : 1;
	return [red, green, blue, opacity];
    }
    
    var gShapes = {}
    var gShapeCounter = 0;
    var makeEllipses = true;

    function makeCircleGrid(itemCount){
	var minR = 10, maxR = surface_size.width / 3;
	for (var j = 0; j < itemCount; ++j){
	    var rx = getRandSkewed(minR, maxR),
		ry = getRandSkewed(minR, maxR),
		cx = getRand(rx, surface_size.width  - rx),
		cy = getRand(ry, surface_size.height - ry);
	    /*
	    var shape = 
		makeEllipses ? fx.lang.Object.resolve({$:'Ellipse', centerX: cx, centerY: cy, radiusX: rx, radiusY: ry,
						       strokeWidth: getRand(0, 3), stroke: randColor(true), fill: randColor(true) }, 
						      [fx.scene])
	    : fx.lang.Object.resolve({$:'Rectangle', x: cx, y: cy, width: rx, height: ry,
				      strokeWidth: getRand(0, 3), stroke: randColor(true), fill: randColor(true) }, 
				     [fx.scene]);
*/


	    var shape = 
		makeEllipses ? fx.scene.Ellipse.prototype.beget({centerX: cx, centerY: cy, radiusX: rx, radiusY: ry,
								 strokeWidth: getRand(0, 3), stroke: randColor(true), 
								 fill: randColor(true) }) 
	    : fx.scene.Rectangle.prototype.beget({x: cx, y: cy, width: rx, height: ry,
						  strokeWidth: getRand(0, 3), stroke: randColor(true), fill: randColor(true) });

	    browser.scene.appendChild(shape);
	    //browser.scene.appendChild(fx.lang.Object.deepCopy(shape));
	    
	    //print('moveable is ' + dojox.gfx.Moveable);
	    //print('shapes ' + dojox.json.ref.toJson(shapes));
	    new demo.Moveable(shape);
	}
	print('keys ' + Object.keys(fx.scene.Rectangle.prototype));
	//browser.scene().appendChild(fx.scene.Rectangle.prototype.beget({x: 100, y:100, width: 500, height: 500, stroke: randColor(true), fill: randColor(true), strokeWidth: 10}));
    }
    
    function initGfx(){
	var container = browser.scene;//dojo.byId("gfx_holder");
	surface_size = {width: 800, height: 480};
	
	makeCircleGrid(100);
	
	// cancel text selection and text dragging
	//dojo.connect(container, "ondragstart",   dojo, "stopEvent");
	//dojo.connect(container, "onselectstart", dojo, "stopEvent");
    }	
    initGfx();

    // print('number of circles: ' + shapes.length);
    var jchildren = browser.scene.childNodes;
    print('number of circles: ' + jchildren.length);
    var s = 20;//Math.min(ext.x/10, ext.y/10, 20);
    
    
    for (var i = 0; i < jchildren.length; i++) {
	var sh = jchildren.item(i);
	sh.velocity = [Math.random()*s, Math.random()*s];
	sh.angularVelocity = 0.3  * Math.random();
    }

    Global.setInterval(function() {
	
	for (var i = 0; i < jchildren.length; i++) {
	    var c = jchildren.item(i);
	    // if (!(c instanceof fx.scene.Ellipse)) break;
	    bounceInBounds(c, 800, 480);
	    if (c.velocity) {
		c.translateX += c.velocity[0];
		c.translateY += c.velocity[1];
	    }
	 if (c.angularVelocity) c.rotate += c.angularVelocity;
	};
    }, 30);
    
}

Packages.java.awt.EventQueue.invokeLater(function() {
    print('running demo in thread ' + Packages.java.lang.Thread.currentThread());
    runDemo(this.applet);
});
 
 function ppMatrix(m) {
     return Object.keys(m).map(function(k){ return k + '=' + m[k].toFixed(2)});
 }
 
 
 function bounceInBounds(c, maxX, maxY) {
     var bbox = c.boundsInParent;
     // if velocity already changed, do not change again
     if ((bbox.x + bbox.width >= maxX) || (bbox.x < 0)) {
	 if (!c.vxChanged) {
	     c.velocity[0] = -c.velocity[0];
	     c.vxChanged = true;
	 }
     } else c.vxChanged = false;
     if ((bbox.y + bbox.height >= maxY) || (bbox.y < 0)) {
	 if (!c.vyChanged) {
	     c.velocity[1] = -c.velocity[1];
	     c.vyChanged = true;
	 }
     } else c.vyChanged = false;
 }
 
