load('bootstrap.js');
load('rhino-compat.js');
load('lang.js');
load('scene.js');

var location = {};
load('jslib/jquery.js');



var document = null;

fx.module('morphic').require('dom').adoptResult(function() { 

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
    
    function bind(value, field) {
	return new fx.lang.Bind(value, field);
    }

    function jpt(x, y) {
	return new Packages.java.awt.geom.Point2D$Double(x, y);
    }

    var editHalo = null;    
    var Hand = fx.scene.Node.extend({
	constructor: {
	    value: function(inherited) {
		inherited();
		//this.cursor = new fx.scene.Polygon({points: [0, 0, 9, 5, 5, 9, 0, 0], strokeWidth:1, fill: [0, 0, 255]});
		//this.appendChild(this.cursor);
		this.grabEffect = new Packages.com.sun.scenario.effect.DropShadow();
		this.grabEffect.setOffsetX(4);
		this.grabEffect.setOffsetY(2);

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
		if (editHalo) {
		    editHalo.parentNode.removeChild(editHalo);
		    editHalo = null;
		}

		
		var pos = node.outerNode.globalToLocal(jpt(eventPoint.x, eventPoint.y), null);
		node.translateX -= pos.x;
		node.translateY -= pos.y;
		that = node;
		this.appendChild(node);
		//this.insertBefore(node, this.cursor);
		node.effect = this.grabEffect; // what if it already had some effect?
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


    function main() {
	var count = 0;
	var stage = document = new fx.scene.Stage(800, 480, this.applet); // applet could be undefined

	document.getElementById = function(id) {
	    var impl =  this.scene.outerNode.lookup(id);
	    return impl ? impl.getFXChildren().get(0).getAttribute('gfx.shape') : null;
	}
	
	var m = new fx.scene.Rectangle({translateX: 100, translateY:100, width: 200, height: 200,
	    arcWidth: 10, arcHeight: 10,
	    fill: new fx.scene.LinearGradient({ endX: 0, endY: 200, stops: 
						[new fx.scene.Stop({color:[255, 255, 0], offset: 0}), 
						 new fx.scene.Stop({color:[0, 255, 255], offset: 1})], 
						done: true}),
					strokeWidth: 1,
					childNodes: [
					    new fx.scene.Rectangle({translateX: 5, translateY: 5, rotate: 5, width: 100, height: 100, 
			 					    id: 'red_rectangle', strokeWidth: 1, fill: [255, 0, 0]})
					]});
	
	print('rectangle tag is ' + m.tagName);
	
	var grad = new fx.scene.LinearGradient({ endX: 800, endY: 480, stops:
						 [new fx.scene.Stop({color:[80,80,255], offset: 0}),
						  new fx.scene.Stop({color:[80,80,150], offset: 1})],
						 done: true
					       });
	
	var model = new fx.lang.Object({dispX: 50, dispY: 50});
	var world = new fx.scene.Rectangle({ 
	    width: 800, // bind(this, 'parentNode.width');
	    height: 480,
	    fill: grad,//[255,255,255],
	    childNodes: [ 
		m, 
		new fx.scene.Ellipse({translateX: bind(model, 'dispX'), translateY: bind(model, 'dispY'), 
				      radiusX: 40, radiusY: 20,
				      fill: [0, 255, 0],
				      strokeWidth: 1})
	    ]});
	world.id = 'world';

	var handDisplacement = 3;
	world.addEventListener("mousemove", { 
	    handleEvent: function(ev) {
		hand.translateX = ev.clientX;
		hand.translateY = ev.clientY - handDisplacement;
	    }
	});

	var hand = new Hand();
	hand.id = 'hand';
	var scene = new fx.scene.Node({childNodes: [world, hand]});
	stage.display(scene);



	world.addEventListener("mousedown", {
	    handleEvent: function(ev) {
		var p = {x: ev.clientX, y: ev.clientY};
		print('hand intersection list is ' + world.getIntersectionList(p));
		if (hand.load()) { 
		    var receiver = world.getIntersectionList(p)[0];
		    hand.dropOn(receiver, p); // FIXME choose the right drop target
		} else {
		    if (ev.target === world) {
			if (editHalo) {
			    editHalo.parentNode.removeChild(editHalo);
			    editHalo = null;
			}
			
			//print('target is world');
			//model.dispX += 10; // just to show bind
			return; // don't pick up the world
		    }
		    if (ev.shiftKey) {
			var clone = ev.target.cloneNode(true);
			print('cloned  ' + clone);
			hand.pick(clone, p);
		    } else if (ev.ctrlKey) {

			var slots = ev.target['.slots'];
			var own = [];
			var inherited = [];
			for (var name in slots) {
			    if (slots.hasOwnProperty(name)) own.push(name);
			    else inherited.push(name);
			}
			print('own ' + own.join('\n'));
			var txt = new fx.scene.Text({content: own.join('\n'), x: 0, y: 10}); // FIXME
			txt.noGrab = true;
			var bounds = txt.boundsInParent;
			var border = 4;
			var panel = new fx.scene.Rectangle({translateX: p.x, translateY: p.y, width: bounds.width + border*2, height: bounds.height + border*2, 
			    arcWidth: 5, arcHeight: 5, strokeWidth: 1,
			    fill: [220,220,220], childNodes: [ txt.adopt({ translateX: border, translateY: border}) ] });
			world.appendChild(panel);
			print('inherited ' + inherited.join('\n'));
		    } else if (ev.altKey) {
			var box = ev.target.boundsInParent;
			var c = [200,200,255, 0.5];
			// translateX: bind(ev.target, 'boundsInParent.x')
			editHalo = new fx.scene.Rectangle({translateX: box.x, translateY: box.y, width: box.width, height: box.height, strokeWidth: 1, fill: null, stroke: c});
			editHalo.addEventListener("mousedown", {
			    handleEvent: function(evt) {
				if (editHalo) {
				    editHalo.parentNode.removeChild(editHalo);
				    editHalo = null;
				}
			    }
			});
			editHalo.noGrab = true;
			ev.target.parentNode.appendChild(editHalo);
			var r = 4;
			var topLeft =  editHalo.appendChild(new fx.scene.Ellipse({radiusX: r, radiusY: r, fill: c, strokeWidth: 0.5, stroke: [200, 200, 255]}));
			var topRight = editHalo.appendChild(new fx.scene.Ellipse({radiusX: r, radiusY: r, translateX: box.width, fill: c}));
			var topCenter = editHalo.appendChild(new fx.scene.Ellipse({radiusX: r, radiusY: r, translateX: box.width/2, fill: c}));
			var bottomLeft = editHalo.appendChild(new fx.scene.Ellipse({radiusX: r, radiusY: r, translateY: box.height, fill: c}));
			var centerLeft = editHalo.appendChild(new fx.scene.Ellipse({radiusX: r, radiusY: r, translateY: box.height/2, fill: c}));
			var bottomRight = editHalo.appendChild(new fx.scene.Ellipse({radiusX: r, radiusY: r, translateX: box.width, translateY: box.height, fill: c}));
			var bottomCenter = editHalo.appendChild(new fx.scene.Ellipse({radiusX: r, radiusY: r, translateX: box.width/2, translateY: box.height, fill: c}));
			var centerRight = editHalo.appendChild(new fx.scene.Ellipse({radiusX: r, radiusY: r, translateX: box.width, translateY: box.height/2, fill: c}));
			
			editHalo.childNodes.forEach(function(n) {
			    n.noGrab = true;
			    n.outerNode.setMouseBlocker(true); // don't pass to the halo rectangle
			    // this will also prevent the world from tracking the mouse, so the HandMorph will lag slightly.
			    n.addEventListener("mousedown", {
				handleEvent: function(ev) {
				    n.eventPoint = {x: ev.clientX, y: ev.clientY};
				}
			    });
			    n.addEventListener("mouseup", {
				handleEvent: function(ev) {
				    n.eventPoint = null;
				}
			    });
			    
			});
			
			var edited = ev.target;
			function recompute(editHalo) {
			    topRight.translateX = bottomRight.translateX = centerRight.translateX = editHalo.x + editHalo.width;
			    topCenter.translateX = bottomCenter.translateX = topRight.translateX/2;
			    bottomLeft.translateY = bottomRight.translateY = bottomCenter.translateY = editHalo.y + editHalo.height;
			    centerLeft.translateY = centerRight.translateY = bottomLeft.translateY/2;
			}
			
			// FIXME: only correct for topLeft
			[topLeft, bottomLeft, topRight, bottomRight].forEach(function(n) {
			    n.addEventListener("mousemove", {
				handleEvent: function(ev) {
				    var tgt = ev.target;
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
			    })
			});
			
			
			
		    } else {
			print('picked up ' + ev.target);
			hand.pick(ev.target, p);
		    }
		}
	    }
	});
	
	false && m.addEventListener("mousedown", { 
	    handleEvent: function(ev) {
		model.dispX += 10;
		model.dispY += 10;
		ev.stopPropagation();
	    }
	}); 

	print('world is ' + scene.firstChild.firstChild.parentNode);
	
	false && setInterval(function() {
	    model.dispX += 10;
	    model.dispY += 10;
	}, 100);
	

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
	var star = new fx.scene.Polygon({
	    points: makeStarVertices(50, { x:0, y:0}, 0), 
	    strokeWidth: 1, fill: [255, 255, 0], 
	    translateX: 400, translateY: 400});
	world.appendChild(star);
	//print('pivot ' + [star.outerNode.getPivotX(), star.outerNode.getPivotY()]);
	var angle = 0;
	
	setInterval(function() {
	    star.transforms = [new fx.scene.Rotate(angle)];
	    angle += 2;
	}, 30);
	
	
	

	//var ps = new Packages.com.sun.scenario.effect.PerspectiveTransform();
	//cps.setQuadMapping(0, 600, 800, 600,  710, 60, 10, 90);
	//world.effect = ps;
	function walkNode(n, level) {
	    var prefix = "";
	    for (var i = 0; i < level; i++) {
		prefix += "  ";
	    }
	    print(prefix + n + ":");
	    for (var c = n.firstChild; c; c = c.nextSibling) {
		walkNode(c, level + 1);
	    }
	}
	walkNode(document.scene, 0);
	this.walkNode = walkNode;
	that = $('#red_rectangle');
	world.appendChild(new fx.scene.Text({content: "Morphic\nMorphic\nMorphic\nMorphic", x: 20, y: 20, /*stroke: [255,255,255],*/ strokeWidth: 1/*, fill: [255,255,255]*/}));
    }

    
    Packages.java.awt.EventQueue.invokeLater(main);
});


