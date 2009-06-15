load('util.js');
load('rhino-compat.js');
load('lang.js');
load('dom.js');

var javafx = Packages.org.mozilla.javascript.FXWrapFactory.FX;
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

    width: {
	// FIXME really? innerNode may not have height
	getter: function() {
	    return this.innerNode.width;
	},
	setter: function(value) {
	    this.innerNode.width = value;
	}
    },

    height: {
	// FIXME really? innerNode may not have height
	getter: function() {
	    return this.innerNode.height;
	},
	setter: function(value) {
	    this.innerNode.height = value;
	}
    },


    translateTo: {
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
	    var scenePoint = new javafx.geometry.Point2D({x: pt.x, y: pt.y});
	    var localPoint = this.innerNode.sceneToLocal(scenePoint);
	    try {
		if (this.innerNode.contains(localPoint.x, localPoint.y)) return this;
		else return false;
	    } catch (err) {
		print('innerNode ' + this.innerNode + ' issue ' + err);
		return false;
	    }

	}
    },

    removeChild: {
	override: true,
	value: function(inherited, node) {
	    node = inherited(node);
	    var parent = node.outerNode.parent;
	    if (parent && node) { 
		for (var i = 0; i < parent.content.length; i++) {
		    if (parent.content[i] === node.outerNode) {
			var was = parent.content.remove(i);
			break;
		    }
		}
	    }
	}
    },

    appendChild: {
	override: true,
	value: function(inherited, node) {
	    inherited(node);
	    this.outerNode.content.push(node.outerNode);
	    return node;
	}
    },
    
    cloneNode: {
	value: function(deep) {
	    var copy = Object.create(Object.getPrototypeOf(this));
	    
	    var fxNode = null;
	    var shape = this.innerNode;
	    if (shape instanceof Rectangle) {
		fxNode = new Rectangle({x: shape.x, y: shape.y, width: shape.width, height: shape.height, 
					arcWidth: shape.arcWidth, arcHeight: shape.arcHeight,
					fill: shape.fill, stroke: shape.stroke});
	    } else if (shape instanceof javafx.scene.shape.Polygon) {
		fxNode = new javafx.scene.shape.Polygon({points: shape.points,
							 fill: shape.fill, stroke: shape.stroke});
		
	    }  else {
		throw new Exception('cant handle ' + shape);

	    }
	    copy.outerNode = javafx.scene.Group({ 
		content: fxNode !== undefined ? [fxNode] : [],
	    });
	    copy.innerNode = fxNode;
	    fxRegistry.put(fxNode, copy);
	    
	    //copy['.shapeType'] = this['.shapeType'];
	    // FIXME this is obviously retarded, merge with constructor etc
	    
	    var blacklist = ['outerNode', 'innerNode', 'parentNode', 'childNodes', 
		'boundsInLocal', 'boundsInParent', 'boundsInScene', 'firstChild', 'lastChild', 'previousSibling',
		'nextSibling', 'id'];
	    for (var name in this) {
		if (blacklist.indexOf(name) == -1) {
		    // doesn't handle getters and setters
		    if (name.charAt(0) == '.') continue;
		    var value = this[name];
		    if (value instanceof Function) continue; // FIXME copy if not in prototype?
		    try {
			print('copying ' + name);
			copy[name] = this[name];
		    } catch (er) {
			print('failure while copying ' + name + ", "  + er);
			throw er;
		    }
		}
	    }
	    if (deep) {
		for (var ch = this.firstChild; ch; ch = ch.nextSibling) {
		    copy.appendChild(ch.cloneNode(true));
		}
	    }
	    return copy;
	}
    }


});
    

/*
function rect(x, y) {
    return Rectangle({
	x: x, y: y, width:150, height:150, arcWidth: 15, arcHeight: 15, fill: Color.GREEN, stroke: Color.BLACK
    })
}
*/

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
	    if (node.noGrab) return;		
	    if (editHalo) {
		print('removing editHalo');
		editHalo.parentNode.removeChild(editHalo);
		editHalo = null;
	    }

	    that = node;
	    // FIXME use a real transform 
	    var localPoint = node.outerNode.sceneToLocal(scenePoint); // where node sees the mouse pointer
	    node.translateTo(-localPoint.x, -localPoint.y);
	    //print(node + 'translate will be at ' + [node.translateX, node.translateY]);
	    that = node;
	    // node's local point corresponding to the 
	    this.appendChild(node);
	    //this.insertBefore(node, this.cursor);
	    this.outerNode.effect = this.grabEffect; // what if it already had some effect?
	}
    },
    
    dropOn: {
	value: function(target, scenePoint) {
	    var load = this.load();
	    if (target === load) throw new Error();
	    this.outerNode.effect = null;
	    //print('dropping load ' + load + ' on target ' + target + ' at ' + [scenePoint.x, scenePoint.y]);
	    // FIXME use a real transform on load?
	    var localPoint = target.outerNode.sceneToLocal(scenePoint); // where node sees the mouse pointer
	    load.translateBy(localPoint.x, localPoint.y);
	    target.appendChild(load);
	}
    }
});


var hand = new Hand();

var world = new FxNode(Rectangle({width: 500, height: 500, fill: Color.DARKGRAY, 
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

 
function makeStarVertices(r, center, startAngle) {
    function polar(r, theta) {
	return { x: r*Math.cos(theta), y: r*Math.sin(theta)}
    }
    var vertices = [];
    var nVerts = 10;
    for (var i= 0; i <= nVerts; i++) {
	var a = startAngle + (2*Math.PI/nVerts*i);
	var p = polar(r, a);
	if (i % 2 == 0) 
	    p = { x: p.x *0.39, y: p.y * 0.39}; 
	vertices.push(p.x + center.x);
	vertices.push(p.y + center.y);
    }
    return vertices; 
}

var star = new FxNode(javafx.scene.shape.Polygon({
    points: makeStarVertices(50, { x:0, y:0}, 0), 
    strokeWidth: 1, fill: Color.YELLOW, stroke: Color.BLACK
}));
    
star.translateTo(300, 300); 
world.appendChild(star);

var button = new FxNode(javafx.scene.control.Button({ width: 80, height: 30, strong: true,
    text: 'rotate star',
    action: function() {
	star.outerNode.rotate += 20;
    }
}));
button.translateTo(260, 400);			
			    
							
world.appendChild(button); 

     
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
		onMouseDragged: function(evt) {
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
			} else if (evt.shiftDown) {
			    var clone = domNode.cloneNode(true);
			    print('cloned  ' + clone);
			    hand.pick(clone, point);
			} else if (evt.metaDown) {
			    var box = domNode.outerNode.boundsInParent;
			    print('box is ' + box);
			    // translateX: bind(ev.target, 'boundsInParent.x')
			    var c = Color.WHITE;
			    editHalo = new FxNode(Rectangle({width: box.width, height: box.height, fill: null, stroke: c}));
			    editHalo.translateTo(box.minX, box.minY);
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
			    topRight.translateTo(box.width, 0);
			    var topCenter = editHalo.appendChild(new FxNode(Ellipse({radiusX: r, radiusY: r, fill: c})));
			    topCenter.translateTo(box.width/2, 0);
			    var bottomLeft = editHalo.appendChild(new FxNode(Ellipse({radiusX: r, radiusY: r, fill: c})));
			    bottomLeft.translateTo(0, box.height);
			    var centerLeft = editHalo.appendChild(new FxNode(Ellipse({radiusX: r, radiusY: r, fill: c})));
			    centerLeft.translateTo(0, box.height/2);
			    var bottomRight = editHalo.appendChild(new FxNode(Ellipse({radiusX: r, radiusY: r, fill: c})));
			    bottomRight.translateTo(box.width, box.height);
			    var bottomCenter = editHalo.appendChild(new FxNode(Ellipse({radiusX: r, radiusY: r, fill: c})));
			    bottomCenter.translateTo(box.width/2, box.height);
			    var centerRight = editHalo.appendChild(new FxNode(Ellipse({radiusX: r, radiusY: r, fill: c})));
			    centerRight.translateTo(box.width, box.height/2);
			    
			    editHalo.childNodes.forEach(function(n) {
				n.noGrab = true;
				n.outerNode.blocksMouse = true; // don't pass to the halo rectangle
				// this will also prevent the world from tracking the mouse, so the HandMorph will lag slightly.
				n.outerNode.onMousePressed = function(ev) {
				    n.eventPoint = {x: ev.sceneX, y: ev.sceneY};
				    print('attached ' + [ev.sceneX, ev.sceneY] + ' to ' + n);
				}
				n.outerNode.onMouseReleased = function(ev) {
				    n.eventPoint = null;
				}
			    });
			    
			    var edited = evt.source;
			    print('edited ' + edited);
			    function recompute(editHalo) {
				topRight.translateX = bottomRight.translateX = centerRight.translateX 
				    = editHalo.innerNode.x + editHalo.width;
				topCenter.translateX = bottomCenter.translateX = topRight.translateX/2;
				bottomLeft.translateY = bottomRight.translateY = bottomCenter.translateY 
				    = editHalo.innerNode.y + editHalo.height;
				centerLeft.translateY = centerRight.translateY = bottomLeft.translateY/2;
			    }
			    
			    // FIXME: only correct for topLeft
			    [topLeft, bottomLeft, topRight, bottomRight].forEach(function(n) {
				n.outerNode.onMouseMoved = function(ev) {
				    var tgt = fxRegistry.get(ev.source);
				    //print('moved ' + [tgt, tgt.eventPoint]);
				    if (tgt.eventPoint) {
					var dx = (ev.sceneX - tgt.eventPoint.x);
					var dy = (ev.sceneY - tgt.eventPoint.y);
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
				};
				n.outerNode.onMouseDragged = n.outerNode.onMouseMoved;
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


function set_interval(callback, delay) {
    // env.js setInterval is not Swing-friendly
    var listener = new JavaAdapter(Packages.java.awt.event.ActionListener, {
	actionPerformed: function(actionEvent) {
	    // transform actionEvent ?
	    callback.call(this, actionEvent);
	}
    });
    var timer = new Packages.javax.swing.Timer(delay, listener);
    timer.start();
    return timer;
}
    
function setInterval(action, delay) {
    return set_interval(function() {
	action.apply(this, arguments);
	//fx.dom.update();
    }, delay);

};


button.innerNode.action = (function() {
    var timer = null;
    return function() {
	javafx.lang.FX.deferAction(function() {
	    if (timer == null) {
		timer = setInterval(function() {
		    star.outerNode.rotate += 5;
		}, 20);
	    } else {
		timer.stop();
		timer = null;
	    }
	});
    }
})();

