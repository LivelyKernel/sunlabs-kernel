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
	print("click on " + evt.node.content[0]);
    },
    onMouseReleased: function(evt) {
    }
};

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
	x: 145, y:135, width:150, height:150, arcWidth: 15, arcHeight: 15, fill: Color.GREEN, stroke: Color.BLACK
    })));
    
    print('OK ' + n.outerNode);
}

var Hand = FxNode.extend({
    constructor: {
	value: function(inherited) {
	    inherited(javafx.scene.shape.Rectangle({width: 10, height: 10, fill: Color.BLACK}));
	    //this.cursor = new fx.scene.Polygon({points: [0, 0, 9, 5, 5, 9, 0, 0], strokeWidth:1, fill: [0, 0, 255]});
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
	    if (node.noGrab) return;		
	    /*
	    if (editHalo) {
		editHalo.parentNode.removeChild(editHalo);
		editHalo = null;
	    }
            */
	    //var pos = node.outerNode.globalToLocal(jpt(eventPoint.x, eventPoint.y), null);
	    //node.translateX -= pos.x;
	    //node.translateY -= pos.y;
	    //that = node;
	    this.outerNode.content.push(node);
	    //this.appendChild(node);
	    //this.insertBefore(node, this.cursor);
	    //node.effect = this.grabEffect; // what if it already had some effect?
	}
    },
    
    dropOn: {
	value: function(target, eventPoint) {
	    var load = this.load();
	    if (target === load) throw new Error();
	    load.effect = null;
	    // FIXME: do the whole transform thing?
	    // FIXME why inner here?
	    var pos = target.innerNode.globalToLocal(jpt(eventPoint.x, eventPoint.y), null);
	    print('pos is ' + [pos.x, pos.y] + ' on evt ' + [eventPoint.x, eventPoint.y]);
	    load.translateX += pos.x;
	    load.translateY += pos.y;
	    
	    target.appendChild(load);
	}
    }
});


var hand = new Hand();

var background = javafx.scene.shape.Rectangle({width: 500, height: 500, fill: Color.WHITE});
var world = javafx.scene.Group({
    content: [ background, n.outerNode, hand.outerNode],
    onMouseMoved: function(evt) {
	print('evt ' + evt);
	hand.outerNode.translateX = evt.sceneX;
	hand.outerNode.translateY = evt.sceneY;
    },
    onMousePressed: function(evt) {
	print("click on " + evt.node.content[0]);
	hand.pick(evt.node.content[0], {x: evt.sceneX, y: evt.sceneY});
    }
    
});

    
var stage = javafx.stage.Stage({
    title: 'Declaring is easy!', 
    width: 400, 
    height: 500,
    scene: javafx.scene.Scene({
	content: [ world ]
    })
});
