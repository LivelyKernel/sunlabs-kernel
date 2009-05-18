fx.module('scene').require('dom').adoptResult(fx.lang.Object, 
					      fx.dom.NodeList, 
					      function(Base, NodeList) {
						  
    var Color = Packages.java.awt.Color;
    var BasicStroke = Packages.java.awt.BasicStroke;
    var ShapeMode = Packages.com.sun.scenario.scenegraph.SGAbstractShape$Mode;
    var Transform = Packages.com.sun.scenario.scenegraph.SGTransform;

    var AffineTransform = Packages.java.awt.geom.AffineTransform;

    function jpt(x, y) {
	return new Packages.java.awt.geom.Point2D$Double(x, y);
    }


    function isInstanceOf(object, fxClassName) {
	return Packages.java.lang.Class.forName(fxClassName).isInstance(object);
    }

    function Null() { return null };
    
    function antiAliasText(shape) {
	var hints = Packages.java.awt.RenderingHints;
	shape.setAntialiasingHint(hints.VALUE_TEXT_ANTIALIAS_ON);
	return shape;
    }

    function convertPaint(paint) {
	if (isInstanceOf(paint, 'java.awt.Color')) {
	    return [paint.getRed(), paint.getGreen(), paint.getBlue(), paint.getTransparency()];
	} else return paint;
    }
    function rgb(r, g, b, a) {
	return new Color(r/255, g/255, b/255, a === undefined ? 1 : a)	
    }


    var nodeKey = 'gfx.shape'; // FIXME
    function shapeFromScenarioNode(sgNode) {
	return sgNode.getAttribute(nodeKey);
    }
						  
    function dispatch(type, awtEvent, sgNode) {
	var source = shapeFromScenarioNode(sgNode);
	var event = new fx.dom.MouseEvent(type, awtEvent, source);
	source.dispatchEvent(event);
    }
    
    var MouseAdapter = new Base({
	mouseClicked: Null,
	mouseDragged: function(awtEvent, sgNode) {
	    dispatch("mousemove", awtEvent, sgNode);
	},
	mouseEntered: Null,
	mouseExited: Null,
	mouseMoved: function(awtEvent, sgNode) {
	    dispatch("mousemove", awtEvent, sgNode);
	},
	mousePressed: function(awtEvent, sgNode) {
	    dispatch("mousedown", awtEvent, sgNode);
	},
	mouseReleased: function(awtEvent, sgNode) {
	    dispatch("mouseup", awtEvent, sgNode);
	},
	mouseWheelMoved: function(awtEvent, sgNode) {
	    dispatch("mousewheel", awtEvent, sgNode);
	}
    });
    
    var defaultListener = Packages.com.sun.scenario.scenegraph.event.SGMouseListener(MouseAdapter);
						  
    var Node = fx.dom.Node.extend({
	tagName: {
	    writable: false, // note: if there's no getter, assignment will overwrite the prototype value?
	    getter: function() {
		return this['.shapeType'];
	    },
	    setter: function() { // empty
	    }
	},
	
	'.shapeType': {
	    value: 'Group'
	},

	className: {
	    // CSS class (a string, can be a list)
	    getter: function() {
		return this['.className'];
	    },
	    setter: function(value) {
		this['.className'] = value;
	    }
	},

	id: {
	    getter: function() {
		return this.outerNode.getID();
	    },
	    setter: function(value) {
		this.outerNode.setID(String(value));
	    }
	},

	initialize: {
	    value: function() {
		// according to http://weblogs.java.net/blog/aim/archive/2009/01/layout_primer_f.html
		// the internal nodes are (root to leaf): translate, rotate, scale, transforms[], clip, opacity, cache, effect, shape
		// should the JS version just insert 'group' after effect?
		var outerNode = this.outerNode = new Packages.com.sun.scenario.scenegraph.fx.FXGroup();
		var innerNode = this.innerNode = new Packages.com.sun.scenario.scenegraph["SG" + this['.shapeType']];

		outerNode.add(innerNode);
		if (!isInstanceOf(innerNode, 'com.sun.scenario.scenegraph.SGGroup')) {
		    var hints = Packages.java.awt.RenderingHints;
    		    innerNode.setAntialiasingHint(hints.VALUE_ANTIALIAS_ON);
		}
		innerNode.putAttribute(nodeKey, this);
		this.innerNode.addMouseListener(defaultListener);
	    }
	},

	constructor: {
	    value: function(inherited, spec) {
		// a Javascript node maps to several scenegraph nodes
		// currently there's an outer translation and innner pivoted rotation
		this.initialize();
		inherited(spec);
	    }
	},

	translateX: {
	    getter: function() {
		return this.outerNode.getTranslateX();
	    },
	    setter: function(x) {
		this.outerNode.setTranslateX(x);
	    }
	},
	
	translateY: {
	    getter: function() {
		return this.outerNode.getTranslateY();
	    },
	    setter: function(y) {
		this.outerNode.setTranslateY(y);
	    }
	},
	
	rotate: {
	    getter: function() {
		var radians = this.outerNode.getRotation();
		return (radians*180/Math.PI) %360;
	    },
	    setter: function(degrees) {
		var radians = (degrees/180)*Math.PI;
		this.outerNode.setRotation(radians);
	    }
	},
	
	boundsInLocal: { 
	    getter: function() {
		return this.outerNode.getBoundsInLocal();
	    }
	},
	
	boundsInParent: {
	    getter: function() {
		return this.outerNode.getBoundsInParent();
	    }
	},

	boundsInScene: {
	    getter: function() {
		return this.outerNode.getBoundsInScene();
	    }
	},

	fill: {
	    setter: function(t) {
		// FIXME ad hoc
		if (t instanceof Array)
		    this.innerNode.setFillPaint(rgb.apply(undefined, t));
		else if (t) {
		    // FIXME?
		    this['.fill'] = t;
		    this.innerNode.setFillPaint(t['.impl']);
		} else {
		    this['.fill'] = null;
		    this.innerNode.setFillPaint(null);
		}
		
		return this;
	    },
	    
	    getter: function() {
		var paint = this.innerNode.getFillPaint();
		if (paint == null) return null;
		if (isInstanceOf(paint, 'java.awt.Color')) {
		    return convertPaint(paint);
		} else if (isInstanceOf(paint, 'com.sun.javafx.scene.paint.LinearGradientPaint')) {
		    // FIXME
		    return this['.fill'];
		} else return [0,0,0];
	    }
	},
	
	stroke: {
	    getter: function(t) {
		return convertPaint(this.innerNode.getDrawPaint());
	    },

	    setter: function(t) {
		this.innerNode.setDrawPaint(rgb.apply(undefined, t));
		return this;
	    }
	},
	
	// beware of ordering issues!!
	strokeWidth: {
	    setter: function(width) {
		var stroke = new BasicStroke(width);
		if (this.innerNode.getMode() === ShapeMode.FILL)
		    this.innerNode.setMode(ShapeMode.STROKE_FILL);
		this.innerNode.setDrawStroke(stroke);
	    },
	    
	    getter: function() {
		return this.innerNode.getDrawStroke().getLineWidth();
	    }
	},


	appendChild: {
	    override: true,
	    value: function(inherited, node) {
		inherited(node);
		this.outerNode.add(node.outerNode);
		return node;
	    }
	},
	
	insertBefore: {
	    override: true,
	    value: function(inherited, node, refChild) {
		inherited(node, refChild);
		this.outerNode.add(0, node.outerNode);
		return node;
	    }
	},

	removeChild: {
	    override: true,
	    value: function(inherited, node) {
		inherited(node);
		this.outerNode.remove(node.outerNode);
		return node;// TODO check spec?
	    }
	},

	transforms: {
	    setter: function(value) {
		if (!value) return;
		if (value.length > 1) throw new Error('FIXME');
		this['.transforms'] = Array.slice(value); // copy
		if (value.length == 1)
		    this.outerNode.setTransform(value[0].impl);
	    },
	    getter: function(value) {
		return this['.transforms'];
	    }
	},
	
	toString: {
	    override: true,
	    value: function() {
		if (!this.outerNode) return "Node"; // probably called on prototype
		var id = this.id;
		if (id !== null)
		    return this.tagName + ":" + id;
		else 
		    return this.tagName;
	    }
	},

	effect: {
	    setter: function(value) {
		this.outerNode.setEffect(value);
	    },
	    getter: function() {
		return this.outerNode.getEffect();
	    }
	},

	getIntersectionList: {
	    // modeled somewhat on SVGElement.getIntersectionList
	    value: function(pt) {
		var result = [];
		var iter = this.outerNode.pick(jpt(pt.x, pt.y)).iterator();
		while (iter.hasNext()) {
		    var sgNode = iter.next();
		    var node = sgNode.getAttribute(nodeKey);
		    // get the JS node, not the underlying node
		    if (node) result.push(node);
		}
		return result;
	    }
	},

	cloneNode: {
	    value: function(deep) {
		var copy = Object.create(Object.getPrototypeOf(this));
		copy['.shapeType'] = this['.shapeType'];
		copy.initialize();
		// FIXME this is obviously retarded, merge with constructor etc
		
		var blacklist = ['outerNode', 'innerNode', 'parentNode', 'childNodes', 
		    'boundsInLocal', 'boundsInParent', 'boundsInScene', 'firstChild', 'lastChild', 'previousSibling',
		    'nextSibling', '.shapeType', 'id'];
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

    var Ellipse = Node.extend({

	'.shapeType': {
	    override: true,
	    value: 'Ellipse'
	},

	centerX: {
	    setter: function(value) {
		this.innerNode.setCenterX(value);
		// FIXME this should work with boundsInLocal
	    },
	    getter: function() { 
		return this.innerNode.getCenterX();
	    }
	},
	
	centerY: {
	    setter: function(value) {
		this.innerNode.setCenterY(value);
		// FIXME this should work with boundsInLocal
	    },
	    getter: function() { 
		return this.innerNode.getCenterY();
	    }
	},
	
	radiusX: {
	    getter: function() {
		return this.innerNode.getRadiusX();
	    },
	    setter: function(value) {
		this.innerNode.setRadiusX(value);
	    }
	},

	radiusY: {
	    getter: function() {
		return this.innerNode.getRadiusY();
	    },
	    setter: function(value) {
		this.innerNode.setRadiusY(value);
	    }
	},

	inspect: {
	    override: true,
	    value: function() {
		return "Ellipse[centerX:" + this.centerX.toFixed(1) + ",centerY:" + this.centerY.toFixed(1) + ",radiusX:" + this.radiusX.toFixed(1) + ",radiusY:" + this.radiusY.toFixed(1)  + "]";
	    }
	}
    });
    
    var Rectangle = Node.extend({
	'.shapeType': {
	    override: true,
	    value: 'Rectangle'
	},
	
	
	width: {
	    getter: function() {
		return this.innerNode.getWidth();
	    },
	    setter: function(value) {
		this.innerNode.setWidth(value);
	    }
	},

	height: {
	    getter: function() {
		return this.innerNode.getHeight();
	    },
	    setter: function(value) {
		this.innerNode.setHeight(value);
	    }
	},
	x: {
	    getter: function() {
		return this.innerNode.getX();
	    },

	    setter: function(value) {
		this.innerNode.setX(value);
	    }
	},

	y: {
	    getter: function() {
		return this.innerNode.getY();
	    },
	    
	    setter: function(value) {
		this.innerNode.setY(value);
	    }
	},

	arcWidth: {
	    getter: function() {
		return this.innerNode.getArcWidth();
	    },
	    setter: function(value) {
		this.innerNode.setArcWidth(value);
	    }
	},

	arcHeight: {
	    getter: function() {
		return this.innerNode.getArcHeight();
	    },
	    setter: function(value) {
		this.innerNode.setArcHeight(value);
	    }
	},

	inspect: {
	    override: true,
	    value: function() {
		return "Rectangle[x:" + this.x.toFixed(1) + ",y:" + this.y.toFixed(1) + ",width:" + this.width.toFixed(1) + ",height:" + this.height.toFixed(1)  + "]";
	    }
	}

    });
    
    var Polygon = Node.extend({
	'.shapeType': {
	    override: true,
	    value: 'Shape' // FIXME?
	},

	tagName: {
	    override: true,
	    getter: function() {
		return 'Polygon';
	    },
	    setter: function() {
	    }
	},

	points: {
	    setter: function(points) {
		var j2Shape = new Packages.java.awt.geom.GeneralPath();
		if (points.length > 0) {
		    var px = points[0];
		    var py = points[1];
		    j2Shape.moveTo(points[0], points[1] || 0);
 		    //print('moveto ' + [points[0], points[1]]);
		    for (var i = 2; i < points.length; i += 2) {
			j2Shape.lineTo(points[i], points[i + 1]);
			//print('lineto ' + [points[i], points[i + 1]]);
		    }
		    j2Shape.closePath();
		}
		this['.points'] = points;
		this.innerNode.setShape(j2Shape);
		//print('made ' + j2Shape + " from " + points +  ' parent ' + this.innerNode.getParent());
	    },
	    getter: function() {
		return this['.points']; // FIXME
	    }
	},

	
	inspect: {
	    override: true,
	    value: function() {
		return "Polygon[points:" + this.points.map(function(n) { return n.toFixed(1) }) + "]";
	    }
	}
	
    });

    var Text = Node.extend({
	'.shapeType': {
	    override: true,
	    value: 'Shape' // FIXME?
	},

	tagName: {
	    override: true,
	    getter: function() {
		return 'Text';
	    },
	    setter: function() {
		print('ignoring setTagName');
	    }
	},
	
	x: {
	    getter: function() {
		return this.innerNode.getLocation().x;
	    },
	    setter: function(value) {
		var loc = this.innerNode.getLocation();
		loc.x = value;
		this.innerNode.setLocation(loc);
	    }
	},

	y: {
	    getter: function() {
		return this.innerNode.getLocation().y;
	    },
	    
	    setter: function(value) {
		var loc = this.innerNode.getLocation();
		loc.y = value;
		this.innerNode.setLocation(loc);
	    }
	},

	content: {
	    setter: function(value) {
		this.innerNode.setText(value);
	    },
	    getter: function() {
		return this.innerNode.getText();
	    }
	},
	
	initialize: { // FIXME duplication!
	    override: true,
	    value: function() {
		// according to http://weblogs.java.net/blog/aim/archive/2009/01/layout_primer_f.html
		// the internal nodes are (root to leaf): translate, rotate, scale, transforms[], clip, opacity, cache, effect, shape
		// should the JS version just insert 'group' after effect?
		var outerNode = this.outerNode = new Packages.com.sun.scenario.scenegraph.fx.FXGroup();
		var innerNode = this.innerNode = new Packages.com.sun.scenario.scenegraph.fx.FXText();

		outerNode.add(innerNode);
		var hints = Packages.java.awt.RenderingHints;
		//innerNode.setAntialiasingHint(hints.VALUE_TEXT_ANTIALIAS_ON);
		innerNode.putAttribute(nodeKey, this);
		this.innerNode.addMouseListener(defaultListener);
	    }
	}

    });

	

    var LinearGradient = Base.extend({
	endX: {
	    setter: function(value) {
		this['.endX'] = value;
	    }
	},

	endY: {
	    setter: function(value) {
		this['.endY'] = value;
	    }
	},

	stops: {
	    setter: function(value) {
		this['.stops'] = value;
	    }
	},
	
	done: {
	    //init: function() 
	    setter: function(unused) {
		var offsets = this['.stops'].map(function(s) { return s['.offset']});
		var colors =  this['.stops'].map(function(s) { return s['.color']});
		var impl = new Packages.com.sun.javafx.scene.paint.LinearGradientPaint(0, 0, this['.endX'], this['.endY'], offsets, colors);
		this['.impl'] = impl;
	    }
	}
	
    });

    var Stop = Base.extend({
	color: {
	    setter: function(value) {
		this['.color'] = rgb(value[0], value[1], value[2], value[3]);
	    }
	},
	
	offset: {
	    setter: function(value) {
		this['.offset'] = value;
	    }
	}

    });
    

    var Stage = Base.extend({
	constructor: {
	    value: function(inherited, width, height, applet) {
		this.isApplet = !!applet;
		this.frame = applet ? applet.getPlatformApplet() :  new Packages.javax.swing.JFrame();
		if (!applet)
		    this.frame.setSize(width, height);
		this.panel = new Packages.com.sun.scenario.scenegraph.JSGPanel();
		this.panel.setBackground(Packages.java.awt.Color.white);
		this.panel.setPreferredSize(new Packages.java.awt.Dimension(width, height));
		print('applet is ' + applet);
		this.frame.add(this.panel);
	    }
	},
	
	scene: {
	    getter: function() {
		return this['.scene'];
	    }
	},
	
	display: {
	    value: function(node) {
		this['.scene'] = node;
		this.panel.setScene(node.outerNode);
		if (!this.isApplet) {
		    this.frame.pack();
		    this.frame.setVisible(true);
		}
	    }
	},

	toString: {
	    override: true,
	    value: function() {
		return '[Stage]';
	    }
	}
    });
    
    var Transform = Base.extend({


    });

    var Rotate = Transform.extend({						  
	constructor: {
	    value: function(inherited, degrees, pivotX, pivotY) {
		inherited();
		var radians = degrees/180 *Math.PI;
		this.impl = Packages.java.awt.geom.AffineTransform.getRotateInstance(radians, pivotX || 0, pivotY|| 0);
	    }
	}
    });

    return new Base({
	Node: Node,
	Stage: Stage,
	Ellipse: Ellipse,
	Rectangle: Rectangle,
	Polygon: Polygon,
	Rotate: Rotate,
	Stop: Stop,
	Text: Text,
	LinearGradient: LinearGradient
    });

});
    
    //var node = fx({$:'Node'}, [fx.scene]);
    