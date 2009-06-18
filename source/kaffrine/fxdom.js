var document = new fx.lang.Object({
    fxRegistry: new java.util.WeakHashMap(), // map f3 nodes to js nodes
    getElementById: function(id) {
	var node = stage.scene.lookup(id);
	return node && this.fxRegistry.get(node);
    },
    editHalo: null,
    createElement: function(fxObject) {
	var node = new FxNode(fxObject, props);
	this.fxRegistry.put(fxObject, node);
	return node;
    }
});

var debugCount = 0;

var FxNode = fx.dom.Node.extend({
    constructor: {
	value: function(inherited, fxObject) {
	    inherited();
	    this.outerNode = javafx.scene.Group({ 
		content: fxObject !== undefined ? [fxObject] : [],
	    });
	    this.outerNode.id = String("fx_" + debugCount++);
	    this.innerNode = fxObject;
	}
    },

    ownerDocument: {
	getter: function() {
	    return document; // FIXME
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
	    return this.innerNode.id;
	},
	setter: function(value) {
	    this.innerNode.id = String(value);
	}
    },

    
    className: {
	getter: function() {
	    return this.innerNode.styleClass;
	},
	setter: function(value) {
	    this.innerNode.styleClass = value;
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
	    } else if (shape instanceof Ellipse) {
		fxNode = new Ellipse({ 
		    translateX: shape.translateX, translateY: shape.translateY,
		    radiusX: shape.radiusX, radiusY: shape.radiusY, fill: shape.fill, stroke: shape.stroke});
	    }  else {
		throw new Error('cant handle ' + shape);

	    }
	    copy.outerNode = javafx.scene.Group({ 
		content: fxNode !== undefined ? [fxNode] : [],
	    });
	    copy.innerNode = fxNode;
	    document.fxRegistry.put(fxNode, copy);
	    
	    //copy['.shapeType'] = this['.shapeType'];
	    // FIXME this is obviously retarded, merge with constructor etc
	    
	    var blacklist = ['outerNode', 'innerNode', 'parentNode', 'childNodes', 'ownerDocument',
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
	    clearEditHalo();
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



function clearEditHalo() {
    if (document.editHalo) {
	document.editHalo.parentNode.removeChild(document.editHalo);
	document.editHalo = null;
    }
}

function makeEditHalo(domNode, edited) {
    var box = domNode.outerNode.boundsInParent;
    print('box is ' + box);
    
    var c = Color.WHITE;
    var editHalo = new FxNode(Rectangle({width: box.width, height: box.height, fill: null, stroke: c}));
    editHalo.translateTo(box.minX, box.minY);
    editHalo.outerNode.onMousePressed = function(evt) {
	clearEditHalo();
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
	    var tgt = document.fxRegistry.get(ev.source);
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
	n.outerNode.onMouseDragged = function(ev) {
	    n.outerNode.onMouseMoved(ev);
	    //stage.scene.content[0].onMouseMoved(ev);
	}
    });
    return editHalo;
    
}


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

