load('util.js');


load('bootstrap.js');
load('rhino-compat.js');
load('lang.js');

load('dom.js');

print('hello');


var javafx = Packages.FXWrapFactory.javafx;
print('javafx ' + javafx.scene.shape.Rectangle);
	
var Color =  javafx.scene.paint.Color;


var FxNode = fx.dom.Node.extend({
    constructor: {
	value: function(inherited, fxNode) {
	    inherited();
	    this.outerNode = javafx.scene.Group({ content: fxNode !== undefined ? [fxNode] : []});
	    this.innerNode = fxNode;
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

    appendChild: {
	override: true,
	value: function(inherited, node) {
	    inherited(node);
	    this.outerNode.content.push(node.outerNode);
	    return node;
	}
    }


});
    
    if (true) {
	var n = new FxNode(javafx.scene.shape.Rectangle({
	    x: 45, y:35, width:150, height:150, arcWidth: 15, arcHeight: 15, fill: Color.GREEN, stroke: Color.BLACK
	}));
	
	n.appendChild(new FxNode(javafx.scene.shape.Rectangle({
	    x: 145, y:135, width:150, height:150, arcWidth: 15, arcHeight: 15, fill: Color.GREEN, stroke: Color.BLACK
	})));
	
	print('OK ' + n.outerNode);
    }

var stage = javafx.stage.Stage({
    title: 'Declaring is easy!', 
    width: 400, 
    height: 500,
    scene: javafx.scene.Scene({ 
	content: [
	    n.outerNode
	]
    })
});
