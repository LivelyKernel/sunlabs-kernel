load('util.js');
load('rhino-compat.js');
load('lang.js');
load('dom.js');

var javafx = Packages.FXWrapFactory.FX;
print('javafx ' + javafx.scene.shape.Rectangle); // << somehow this is necessary?
	
var Color =  javafx.scene.paint.Color;
var Rectangle = javafx.scene.shape.Rectangle;
var Ellipse = javafx.scene.shape.Ellipse;
//print('Rectangle ' + Rectangle);

var fxRegistry = new java.util.WeakHashMap(); // map f3 nodes to js nodes
var debugCount = 0;
var editHalo;

var FxNode = fx.dom.Node.extend({
    constructor: {
	value: function(inherited, fxNode) {
	    inherited();
	    if (fxNode && !fxNode.id) fxNode.id = String("node_" + debugCount++);
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

    translateX: {
	getter: function() {
	    return this.outerNode.translateX;
	},
	setter: function(value) {
	    this.outerNode.translateX = value;
	}
    },

    translateY: {
	getter: function() {
	    return this.outerNode.translateY;
	},
	setter: function(value) {
	    this.outerNode.translateY = value;
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
    return Rectangle({
	x: x, y: y, width:150, height:150, arcWidth: 15, arcHeight: 15, fill: Color.GREEN, stroke: Color.BLACK
    })
}


var Hand = FxNode.extend({
    constructor: {
	value: function(inherited) {
	    //var cursor = Rectangle({width: 10, height: 10, translateX: 3, translateY: 3, fill: Color.BLACK});
	    inherited(javafx.scene.shape.Polygon({points: [0, 0, 11, 6, 6, 11, 0, 0], 
						  translateX: 3, translateY: 3, strokeWidth:1, fill: Color.BLUE, id: 'hand'}));

	    //this.cursor = new fx.scene.Polygon({
	    this.grabEffect = javafx.scene.effect.DropShadow({offsetX: 4, offsetY: 2});
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
	    if (editHalo) {
		editHalo.parentNode.removeChild(editHalo);
		editHalo = null;
	    }

	    that = node;
	    // FIXME use a real transform 
	    var localPoint = node.outerNode.sceneToLocal(scenePoint); // where node sees the mouse pointer
	    node.moveTo(-localPoint.x, -localPoint.y);
	    //print(node + 'translate will be at ' + [node.translateX, node.translateY]);
	    that = node;
	    // node's local point corresponding to the 
	    this.appendChild(node);
	    //this.insertBefore(node, this.cursor);
	    node.outerNode.effect = this.grabEffect; // what if it already had some effect?
	}
    },
    
    dropOn: {
	value: function(target, scenePoint) {
	    var load = this.load();
	    if (target === load) throw new Error();
	    load.outerNode.effect = null;
	    //print('dropping load ' + load + ' on target ' + target + ' at ' + [scenePoint.x, scenePoint.y]);
	    // FIXME use a real transform on load?
	    var localPoint = target.outerNode.sceneToLocal(scenePoint); // where node sees the mouse pointer
	    load.translateBy(localPoint.x, localPoint.y);
	    target.appendChild(load);
	}
    }
});


var hand = new Hand();

var world = new FxNode(Rectangle({width: 500, height: 500, fill: Color.LIGHTBLUE, 
    stroke: Color.BLACK, id: 'background'}));
						     
						     
var n = new FxNode(Rectangle({
    width:150, height:150, arcWidth: 15, arcHeight: 15, fill: Color.GREEN, stroke: Color.BLACK, id: 'green'
}));
    
n.translateBy(45, 35);

var n2 = n.appendChild(new FxNode(Rectangle({
    width:60, height:60, arcWidth: 15, arcHeight: 15, fill: Color.BLUE, stroke: Color.BLACK, id: 'blue'
})));

n2.translateBy(-5, 100);

var n3 = n.appendChild(new FxNode(Rectangle({
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
			if (domNode === world) {
			    if (editHalo) {
				editHalo.parentNode.removeChild(editHalo);
				editHalo = null;
			    } else print('do nothing');
			    return;
			} else if (!domNode) { 
			    print('nope'); 
			    return;
			} else if (evt.metaDown) {
			    var box = domNode.outerNode.boundsInParent;
			    print('box is ' + box);
			    // translateX: bind(ev.target, 'boundsInParent.x')
			    var c = Color.LIGHTGRAY;
			    editHalo = new FxNode(Rectangle({width: box.width, height: box.height, strokeWidth: 1, fill: null, stroke: c}));
			    editHalo.moveTo(box.minX, box.minY);
			    editHalo.outerNode.onMousePressed = function(evt) {
				if (editHalo) {
				    editHalo.parentNode.removeChild(editHalo);
				    editHalo = null;
				}
			    };
			    editHalo.noGrab = true;
			    domNode.parentNode.appendChild(editHalo);
			    var r = 4;
			    var topLeft =  editHalo.appendChild(new FxNode(Ellipse({radiusX: r, radiusY: r, fill: c})));
			    var topRight = editHalo.appendChild(new FxNode(Ellipse({radiusX: r, radiusY: r, fill: c})));
			    topRight.moveTo(box.width, 0);
			    var topCenter = editHalo.appendChild(new FxNode(Ellipse({radiusX: r, radiusY: r, fill: c})));
			    topCenter.moveTo(box.width/2, 0);
			    var bottomLeft = editHalo.appendChild(new FxNode(Ellipse({radiusX: r, radiusY: r, fill: c})));
			    bottomLeft.moveTo(0, box.height);
			    var centerLeft = editHalo.appendChild(new FxNode(Ellipse({radiusX: r, radiusY: r, 
				translateY: box.height/2, fill: c})));
			    var bottomRight = editHalo.appendChild(new FxNode(Ellipse({radiusX: r, radiusY: r, translateX: box.width, translateY: box.height, fill: c})));
			    var bottomCenter = editHalo.appendChild(new FxNode(Ellipse({radiusX: r, radiusY: r, 
				translateX: box.width/2, translateY: box.height, fill: c})));
			    var centerRight = editHalo.appendChild(new FxNode(Ellipse({radiusX: r, radiusY: r, 
				translateX: box.width, translateY: box.height/2, fill: c})));
			    
			    editHalo.childNodes.forEach(function(n) {
				n.noGrab = true;
				n.outerNode.blocksMouse = true; // don't pass to the halo rectangle
				// this will also prevent the world from tracking the mouse, so the HandMorph will lag slightly.
				n.outerNode.onMousePressed = function(ev) {
				    n.eventPoint = {x: ev.clientX, y: ev.clientY};
				}
				n.outerNode.onMouseReleased = function(ev) {
				    n.eventPoint = null;
				}
			    });
			    
			    var edited = evt.source;
			    function recompute(editHalo) {
				topRight.translateX = bottomRight.translateX = centerRight.translateX = editHalo.x + editHalo.width;
				topCenter.translateX = bottomCenter.translateX = topRight.translateX/2;
				bottomLeft.translateY = bottomRight.translateY = bottomCenter.translateY = editHalo.y + editHalo.height;
				centerLeft.translateY = centerRight.translateY = bottomLeft.translateY/2;
			    }
			    
			    // FIXME: only correct for topLeft
			    [topLeft, bottomLeft, topRight, bottomRight].forEach(function(n) {
				n.outerNode.onMouseMoved = function(ev) {
				    print('caught');
				    var tgt = fxRegistry.get(ev.source);
				    if (tgt.eventPoint) {
					var dx = (ev.clientX - tgt.eventPoint.x);
					var dy = (ev.clientY - tgt.eventPoint.y);
					editHalo.translateX += dx;
					if (edited.x !== undefined) edited.x += dx;
					editHalo.translateY += dy;
					if (edited.y !== undefined) edited.y += dy;
					editHalo.width -= dx;
					if (edited.width !== undefined) edited.width -= dx;
					editHalo.height -= dy;
					if (edited.height !== undefined) edited.height -= dy;
					recompute(editHalo);
					tgt.eventPoint = {x: tgt.eventPoint.x + dx, y: tgt.eventPoint.y + dy}
				    }
				}
			    });
			} else {
			    hand.pick(domNode, point); 
			}
		    }
		}
	    })
	]
    })
});

