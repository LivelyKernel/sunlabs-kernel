load('util.js');
load('rhino-compat.js');
load('lang.js');
load('dom.js');
load('fxdom.js');

var javafx = Packages.org.mozilla.javascript.FXWrapFactory.FX;
print('javafx ' + javafx.scene.shape.Rectangle); // << somehow this is necessary?
	
var Color =  javafx.scene.paint.Color;
var Rectangle = javafx.scene.shape.Rectangle;
var Ellipse = javafx.scene.shape.Ellipse;
//print('Rectangle ' + Rectangle);

/*
function rect(x, y) {
    return Rectangle({
	x: x, y: y, width:150, height:150, arcWidth: 15, arcHeight: 15, fill: Color.GREEN, stroke: Color.BLACK
    })
}
*/

var hand = new Hand();

var world = document.createElement(Rectangle({width: 500, height: 500, fill: Color.DARKGRAY, 
    stroke: Color.BLACK, id: 'background'}));
    
var n = document.createElement(Rectangle({
    width:150, height:150, arcWidth: 15, arcHeight: 15, fill: Color.GREEN, stroke: Color.BLACK, id: 'green_rect'
}));
    
n.translateBy(45, 35);

var n2 = n.appendChild(document.createElement(Rectangle({
    width:60, height:60, arcWidth: 15, arcHeight: 15, fill: Color.BLUE, stroke: Color.BLACK, id: 'blue'
})));

n2.translateBy(-5, 100);

var n3 = n.appendChild(document.createElement(Rectangle({
    width:60, height:60, arcWidth: 15, arcHeight: 15, fill: Color.RED, stroke: Color.BLACK, id: 'red'
})));

n3.translateBy(100, 100);
    
print('OK ' + n);

 
world.appendChild(n);

world.appendChild(document.createElement(javafx.scene.text.Text({content: "JavaFX\nJavaFX\nJavaFX\nJavaFX", 
								 translateX: 300, translateY: 20, strokeWidth: 1})));
 


world.appendChild(document.createElement(Ellipse({translateX: 300, translateY: 200,
				  radiusX: 40, radiusY: 20,
				      fill: Color.BLUE,
				      stroke: Color.BLACK,
				      strokeWidth: 1})));
						    

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

var star = document.createElement(javafx.scene.shape.Polygon({
    points: makeStarVertices(50, { x:0, y:0}, 0), 
    strokeWidth: 1, fill: Color.YELLOW, stroke: Color.BLACK
}));
    
star.translateTo(300, 300); 
world.appendChild(star);

var button = document.createElement(javafx.scene.control.Button({ width: 80, height: 30, strong: true,
    text: 'rotate star',
    action: function() {
	star.outerNode.rotate += 20;
    }
}));
button.translateTo(260, 400);			
world.appendChild(button); 

var textInput = document.createElement(javafx.scene.control.TextBox({width: 200, height: 30}));

textInput.translateTo(20, 400);
world.appendChild(textInput);
    

/*
function range(begin, end) {  
    for (var i = begin; i < end; ++i) {  
	yield i;  
    }  
} 

world.appendChild(new FxNode(javafx.scene.control.ListView({
    items: [("Item " + i) for each (i in range(0, 21))],
    //    translateX: 20,
    translateY: 300
})));
*/

     
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
			var domNode = document.fxRegistry.get(evt.source);
			if (domNode === world) {
			    clearEditHalo();
			    return;
			} else if (!domNode) { 
			    print('nope'); 
			    return;
			} else if (evt.shiftDown) {
			    var clone = domNode.cloneNode(true);
			    print('cloned  ' + clone);
			    hand.pick(clone, point);
			} else if (evt.metaDown) {
			    // translateX: bind(ev.target, 'boundsInParent.x')
			    document.editHalo = makeEditHalo(domNode, evt.source);
			} else {
			    hand.pick(domNode, point); 
			}
		    }
		}
	    })
	]
    })
});


button.innerNode.action = (function() {
    var timer = null;
    return function() {
	javafx.lang.FX.deferAction(function() {
	    if (timer == null) {
		button.innerNode.text = 'stop rotation';
		timer = setInterval(function() {
		    star.outerNode.rotate += 5;
		}, 20);
	    } else {
		button.innerNode.text = 'rotate star';
		timer.stop();
		timer = null;
	    }
	});
    }
})();

var location= {}
load('jquery.js');

var glowing = [];
textInput.innerNode.onKeyTyped = function(evt) {
    function clearEffects(n) {
	n.innerNode.effect = null;
    }
    
    //print('event is ' + evt);
    //print('code ' + evt.code + ' vs ' + javafx.scene.input.KeyCode.VK_ENTER);
    if (evt['char'] == '\n') {
	var txt = textInput.innerNode.text;
	print('input ' + txt);
	var query;
	try {
	    query = $(txt);
	    //textInput.innerNode.text  = '';
	} catch (e) {
	    query = { length: 0 };
	    glowing.forEach(function(n) { clearEffects(n) });
	    glowing = [];
	    print(e);
	}
	glowing.forEach(function(n) { clearEffects(n) });
	for (var i = 0; i < query.length; i++) {
	    var node = query[i];
	    print('glowing ' + node.innerNode);
	    node.innerNode.effect = javafx.scene.effect.Glow({level: 0.9});
	    glowing.push(node);
	}
	
	
    } 
    //textInput.innerNode.
}

