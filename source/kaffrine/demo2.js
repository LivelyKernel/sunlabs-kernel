load('util.js');


load('rhino-compat.js');
load('lang.js');

load('dom.js');

print('hello');


var javafx = Packages.FXWrapFactory.javafx;
print('javafx ' + javafx.scene.shape.Rectangle);
	
var Color =  javafx.scene.paint.Color;


var EventAdapter = {
    onMouseMoved: function(evt)  {
    },
    onMousePressed: function(evt) {
	print("click on " + evt.source);
    },
    onMouseReleased: function(evt) {
    }
};

var fxRegistry = new java.util.WeakHashMap();

var FxNode = fx.dom.Node.extend({
    constructor: {
	value: function(inherited, fxNode) {
	    inherited();
	    this.outerNode = javafx.scene.Group({ 
		content: fxNode !== undefined ? [fxNode] : [],
		//onMouseMoved: EventAdapter.onMouseMoved,
		//onMousePressed: EventAdapter.onMousePressed,
		//onMouseReleased: EventAdapter.onMouseReleased
	    });
	    this.innerNode = fxNode;
	    fxRegistry.put(fxNode, this);
	}
    },
    
    id: {
	getter: function() {
	    return this.outerNode.id;
	},
	setter: function(value) {
	    this.outerNode.id = String(value);
	}
    },

    appendChild: {
	override: true,
	value: function(inherited, node) {
	    inherited(node);
	    var parent = node.outerNode.parent;
	    if (parent) { 
		for (var i = 0; i < parent.content.length; i++) {
		    if (parent.content[i] === node.outerNode) {
			var was = parent.content.remove(i);
			break;
		    }
		}
	    }
	    this.outerNode.content.push(node.outerNode);
	    return node;
	}
    }
});
    

function rect(x, y) {
    return javafx.scene.shape.Rectangle({
	x: x, y: y, width:150, height:150, arcWidth: 15, arcHeight: 15, fill: Color.GREEN, stroke: Color.BLACK
    })
}

if (true) {
    var n = new FxNode(javafx.scene.shape.Rectangle({
	x: 45, y:35, width:150, height:150, arcWidth: 15, arcHeight: 15, fill: Color.GREEN, stroke: Color.BLACK
    }));
    
    n.appendChild(new FxNode(javafx.scene.shape.Rectangle({
	x: 145, y:135, width:60, height:60, arcWidth: 15, arcHeight: 15, fill: Color.BLUE, stroke: Color.BLACK
    })));
    
    print('OK ' + n.outerNode);
}

var Hand = FxNode.extend({
    constructor: {
	value: function(inherited) {
	    //var cursor = javafx.scene.shape.Rectangle({width: 10, height: 10, translateX: 3, translateY: 3, fill: Color.BLACK});
	    var cursor = javafx.scene.shape.Polygon({points: [0, 0, 11, 6, 6, 11, 0, 0], translateX: 3, translateY: 3, strokeWidth:1, fill: Color.BLUE});
	    inherited(cursor);
	    //this.cursor = new fx.scene.Polygon({
	    //this.grabEffect = new Packages.com.sun.scenario.effect.DropShadow();
	    //this.grabEffect.setOffsetX(4);
	    //this.grabEffect.setOffsetY(2);

	}
    },
    
    load: {
	value: function() {
	    return this.firstChild;
	    //return this.cursor.previousSibling;
	}
    },
    
    pick: {
	value: function(node, eventPoint) {
	    // find the event point wrt/node's origin
	    //if (node.noGrab) return;		
	    /*
	    if (editHalo) {
		editHalo.parentNode.removeChild(editHalo);
		editHalo = null;
	    }

            */
	    that = node.outerNode;
	    var pos = node.outerNode.sceneToLocal(javafx.geometry.Point2D({x: eventPoint.x, y: eventPoint.y}));
	    print(pos);
	    node.outerNode.translateX -= pos.x;
	    node.outerNode.translateY -= pos.y;
	    //that = node;
	    // FIXME get the dom node from the node
	    this.appendChild(node);
	    //this.insertBefore(node, this.cursor);
	    //node.effect = this.grabEffect; // what if it already had some effect?
	}
    },
    
    dropOn: {
	value: function(target, eventPoint) {
	    var load = this.load();
	    if (target === load) throw new Error();
	    //load.effect = null;
	    // FIXME: do the whole transform thing?
	    // FIXME why inner here?
	    var pos = target.outerNode.sceneToLocal(javafx.geometry.Point2D({x: eventPoint.x, y: eventPoint.y}));
	    //print('pos is ' + [pos.x, pos.y] + ' on evt ' + [eventPoint.x, eventPoint.y]);
	    load.translateX += pos.x;
	    load.translateY += pos.y;
	    target.appendChild(load);
	}
    }
});


var hand = new Hand();

var background = javafx.scene.shape.Rectangle({width: 500, height: 500, fill: Color.WHITE, stroke: Color.BLACK});

var world = new FxNode(javafx.scene.Group({
    content: [ background, n.outerNode, hand.outerNode],
    onMouseMoved: function(evt) {
	//print('evt ' + evt);
	hand.outerNode.translateX = evt.sceneX;
	hand.outerNode.translateY = evt.sceneY;
    },
    onMousePressed: function(evt) {
	print('source ' + evt.source + " , " + evt.source.boundsInParent);
	//print('click on ' + evt.source.content[0]);
	// FIXME really the node containing the surrounding group

	if (hand.load()) { 
	    //var receiver = world.getIntersectionList(p)[0];
	    var receiver = world;
	    hand.dropOn(receiver, {x: evt.sceneX, y: evt.sceneY}); // FIXME choose the right drop target
	} else {
	    print('picked up ' + evt.source);
	    var domNode = fxRegistry.get(evt.source);
	    if (domNode) hand.pick(domNode, {x: evt.sceneX, y: evt.sceneY});
	}
	    
    }
    
}));

    
var stage = javafx.stage.Stage({
    title: 'Declaring is easy!', 
    width: 400, 
    height: 500,
    scene: javafx.scene.Scene({
	content: [ world.outerNode ]
    })
});
