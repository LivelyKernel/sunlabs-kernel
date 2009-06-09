load('util.js');


load('rhino-compat.js');
load('lang.js');

load('dom.js');

print('hello');


var javafx = Packages.FXWrapFactory.javafx;
print('javafx ' + javafx.scene.shape.Rectangle);
	
var Color =  javafx.scene.paint.Color;


var fxRegistry = new java.util.WeakHashMap(); // map f3 nodes to js nodes
var debugCount = 0;

var FxNode = fx.dom.Node.extend({
    constructor: {
	value: function(inherited, fxNode) {
	    inherited();
	    if (fxNode && !fxNode.id) fxNode.id = String(debugCount++);
	    
	    this.outerNode = javafx.scene.Group({ 
		content: fxNode !== undefined ? [fxNode] : [],
	    });
	    this.innerNode = fxNode;
	    fxRegistry.put(fxNode, this);
	}
    },

    toString: {
	override: true,
	value: function() {
	    return "FxNode(" + this.innerNode.toString() + ")";
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

    translateBy: {
	value: function(x, y) {
	    var outer = this.outerNode;
	    outer.translateX += x;
	    outer.translateY += y;
	}
    },

    moveTo: {
	value: function(x, y) {
	    var outer = this.outerNode;
	    outer.translateX = x;
	    outer.translateY = y;
	}
    },


    containingNode: {
	value: function(pt) {
	    for (var i = 0; i < this.childNodes.length; i++) {
		var n = this.childNodes.item(i);
		if (!n) print('what, null? ' + this.childNodes + "," + n + ', i=' + i);
		var answer =  n.containingNode(pt);
		if (answer) return answer;
	    }
	    var scenePoint = javafx.geometry.Point2D({x: pt.x, y: pt.y});
	    var localPoint = this.innerNode.sceneToLocal(scenePoint);
	    if (this.innerNode.contains(localPoint.x, localPoint.y)) return this;
	    else return false;
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


var Hand = FxNode.extend({
    constructor: {
	value: function(inherited) {
	    //var cursor = javafx.scene.shape.Rectangle({width: 10, height: 10, translateX: 3, translateY: 3, fill: Color.BLACK});
	    var cursor = javafx.scene.shape.Polygon({points: [0, 0, 11, 6, 6, 11, 0, 0], translateX: 3, translateY: 3, strokeWidth:1, fill: Color.BLUE, id: 'hand'});
	    inherited(cursor);
	    //this.cursor = new fx.scene.Polygon({
	    this.grabEffect = new javafx.scene.effect.DropShadow({offsetX: 4, offsetY: 2});
	}
    },
    
    load: {
	value: function() {
	    return this.firstChild;
	    //return this.cursor.previousSibling;
	}
    },
    
    pick: {
	value: function(node, scenePoint) {
	    // find the event point wrt/node's origin
	    //if (node.noGrab) return;		
	    /*
	    if (editHalo) {
		editHalo.parentNode.removeChild(editHalo);
		editHalo = null;
	    }
            */
	    that = node;
	    // FIXME use a real transform 
	    var localPoint = node.outerNode.sceneToLocal(scenePoint); // where node sees the mouse pointer
	    node.moveTo(-localPoint.x, -localPoint.y);
	    //print(node + 'translate will be at ' + [node.translateX, node.translateY]);
	    that = node;
	    // node's local point corresponding to the 
	    this.appendChild(node);
	    //this.insertBefore(node, this.cursor);
	    node.innerNode.effect = this.grabEffect; // what if it already had some effect?
	}
    },
    
    dropOn: {
	value: function(target, scenePoint) {
	    var load = this.load();
	    if (target === load) throw new Error();
	    load.innerNode.effect = null;
	    //print('dropping load ' + load + ' on target ' + target + ' at ' + [scenePoint.x, scenePoint.y]);
	    // FIXME use a real transform on load?
	    var localPoint = target.outerNode.sceneToLocal(scenePoint); // where node sees the mouse pointer
	    load.translateBy(localPoint.x, localPoint.y);
	    target.appendChild(load);
	}
    }
});


var hand = new Hand();

var world = new FxNode(javafx.scene.shape.Rectangle({width: 500, height: 500, fill: 
						     Color.WHITE, stroke: Color.BLACK, id: 'background'}));
						     
						     
var n = new FxNode(javafx.scene.shape.Rectangle({
    width:150, height:150, arcWidth: 15, arcHeight: 15, fill: Color.GREEN, stroke: Color.BLACK, id: 'green'
}));
    
n.translateBy(45, 35);

var n2 = n.appendChild(new FxNode(javafx.scene.shape.Rectangle({
    width:60, height:60, arcWidth: 15, arcHeight: 15, fill: Color.BLUE, stroke: Color.BLACK, id: 'blue'
})));

n2.translateBy(-5, 100);

var n3 = n.appendChild(new FxNode(javafx.scene.shape.Rectangle({
    width:60, height:60, arcWidth: 15, arcHeight: 15, fill: Color.RED, stroke: Color.BLACK, id: 'red'
})));

n3.translateBy(100, 100);
    
print('OK ' + n);

 
world.appendChild(n);
    
var stage = javafx.stage.Stage({
    title: 'Declaring is easy!', 
    width: 400, 
    height: 500,
    scene: javafx.scene.Scene({
	content: [ 
	    javafx.scene.Group({
		content: [ world.outerNode, hand.outerNode],
		onMouseMoved: function(evt) {
		    hand.outerNode.translateX = evt.sceneX;
		    hand.outerNode.translateY = evt.sceneY;
		},
		onMousePressed: function(evt) {
		    //print('source ' + evt.source);
		    //print('click on ' + evt.source.content[0]);
		    // FIXME really the node containing the surrounding group
		    var point = javafx.geometry.Point2D({x: evt.sceneX, y: evt.sceneY});
		    if (hand.load()) { 
			//var receiver = world.getIntersectionList(p)[0];
			var receiver = world.containingNode(point);
			hand.dropOn(receiver, point); // FIXME choose the right drop target
		    } else {
			//print('pick up source ' + evt.source + "," + evt.source.boundsInParent);
			//print('pick up loc ' + evt.node);
			var domNode = fxRegistry.get(evt.source);
			if (domNode) hand.pick(domNode, point); else print('nope');
		    }
		}
	    })
	]
    })
});

