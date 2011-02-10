/*
 * Copyright (c) 2008-2011 Hasso Plattner Institute
 *
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

module('lively.Connector').requires('cop.Layers', 'lively.Helper', 'lively.LayerableMorphs').toRun(function() {

cop.create('NodeMorphLayer')
.refineClass(Morph, {
	getConnectorMorphs: function() {
		if (this.attributeConnections == undefined)
			return [];

		return this.attributeConnections
			.select(function(ea){ return ea.getTargetMethodName() == 'updateConnection'})
			.collect(function(ea){ return ea.getTargetObj()})
	},
	connectLineMorph: function(line) {
		lively.bindings.connect(this, "geometryChanged", line, "updateConnection")
	},
	deconnectLineMorph: function(line) {
		lively.bindings.disconnect(this, "geometryChanged", line, "updateConnection")	
 	},
});


cop.create("ConnectorMorphLayer").refineClass(HandleMorph, {

	onMouseUp: function(evt) {
		var morph = this.findMorphUnderMe(), line = this.owner;
		// console.log("handle mouse up on " + morph)
		this.connectToMorph(morph);		
		var result = cop.proceed(evt);
		line.updateConnection();
		// RESEARCH: the layer is not active any more... because the proceed set owner to nil
		return result;
	},

	onMouseMove: function(evt) {
		var result = cop.proceed(evt);
		// Fabrik connectors intercepted the setVertices in the shape
		// but instance wrappers are fragile but shapes have no "owner" references
		if (this.owner)
			this.owner.updateArrow();
		return result;
	},

	connectToMorph: function(newMorph) {
		var connector = this.owner;
		// Bugfix for connecting to connector itself
		if (newMorph === connector.arrowHead.head) newMorph = null;
		if (newMorph)
			newMorph.setWithLayers([NodeMorphLayer]);
		if (this.isStartHandle()) {
			// console.log("I am a start handle!");
			if (connector.startMorph)
				connector.startMorph.deconnectLineMorph(connector);
			connector.startMorph = newMorph;
		}
		if (this.isEndHandle()) {
			// console.log("I am an end handle!");
			if (connector.endMorph)
				connector.endMorph.deconnectLineMorph(connector);
			connector.endMorph = newMorph;
		}

		if (newMorph) {
			newMorph.connectLineMorph(connector);
			// console.log("connect to new morph " + newMorph)
			connector.updateConnection();
		}			
	},

	isStartHandle: function() {
		return this.partName == 0;
	},

	isEndHandle: function() {
		return this.partName == (this.owner.shape.vertices().length - 1);
	},

	get openForDragAndDrop() {
		return false;
	},

	findMorphUnderMe: function(){	
		var evt = newFakeMouseEvent(this.getGlobalPosition());
		var result;
		cop.withLayers([FindMorphLayer], function(){
			result = this.world().morphToGrabOrReceive(evt, this, true);
		}.bind(this));
		if (result instanceof WorldMorph)
			return undefined;
		return result;
	},

	getGlobalPosition: function() {
		return this.owner ?
			this.owner.getGlobalTransform().transformPoint(this.getPosition()) :
			this.getPosition();
	},
});


/**
 *  Little Helper Layer to allow TextMorphs to be used as valid connector points
 *  even if they don't want to be dragged or dropped
 *  TODO: seperated the find Morph from event and drag and drop behavior
 */
cop.create("FindMorphLayer").refineClass(TextMorph, {
	acceptsDropping: function(){
		return true
	}
});

cop.create('UpdateConnectorLayer')
.beGlobal()
.refineClass(WorldMorph, {
	
	migrateConnectorMorphs: function() {
		// replace old connectors with new instance...
		this.withAllSubmorphsDo(function() {
			if (this instanceof lively.Connector.ConnectorMorph)
				return;

			if (this.startMorph && this.endMorph ) {
				alert("migrate " + this)
				var m = new lively.Connector.ConnectorMorph();
				m.connectMorphs(this.startMorph, this.endMorph);
				this.owner.addMorph(m);
				this.remove()
			}
		})

		// this.withAllSubmorphsDo(function() {
			// if (this.getWithLayers().include(NodeMorphLayer)) 
				// this.setupConnectorBindings();
		// })
 	},

	debuggingSubMenuItems: function(evt) {
		var items = cop.proceed(evt);
		items.push(["update connectors", this.migrateConnectorMorphs.bind(this)]);
		return items
	},
});


Object.extend(Morph, {
	makeConnector:  function(startPoint, endPoint) {
		endPoint = endPoint || startPoint;
		// var m = Morph.makeLine([pt(-1,-1), pt(0,0)], 1, Color.black);
		// m.setWithLayers([ConnectorMorphLayer]);
		// m.setupConnector();
		// m.updateArrow()
		var m =  new lively.Connector.ConnectorMorph();
		m.setGlobalStartPos(startPoint);
		m.setGlobalEndPos(endPoint);
		m.updateArrow()
		return m;
	}
});

PathMorph.subclass('lively.Connector.ConnectorMorph',
'settings', {
	suppressGrabbing: true,
},
'initializing', {
	initialize: function($super, startPoint, endPoint) {
		startPoint = startPoint || pt(0,0);
		endPoint = endPoint || pt(100,100);
		$super([startPoint, endPoint]);
		this.setGlobalStartPos(startPoint);
		this.setGlobalEndPos(endPoint);
		this.setWithLayers([ConnectorMorphLayer]);
		this.setupConnector();
		this.updateArrow()
	},
	setupConnector: function() {
		var lineColor = Color.black;
		this.arrowHead = new ArrowHeadMorph(1, lineColor, lineColor);
		this.addMorph(this.arrowHead);
		this.updateArrow()
	},
},
'morphic', {

	remove: function($super) {
		this.disconnectMorphs();
		return $super();
	}
},
'accessing', {
	getStartPos: function() { return this.shape.vertices().first() },
	getEndPos: function() { return this.shape.vertices().last() },
	
	setStartPos: function(p) {
		var v = this.shape.vertices(); 
		v[0] = p; 
		this.setVertices(v);
	},
	
	setEndPos: function(p) {
		var v = this.shape.vertices(); 
		v[v.length-1] = p; 
		this.setVertices(v);
	},

	setGlobalStartPos: function(p) { this.setStartPos(this.localize(p)) },
	setGlobalEndPos: function(p) { this.setEndPos(this.localize(p)) },
	getGlobalStartPos: function(p) { return this.worldPoint(this.getStartPos()) },
	getGlobalEndPos: function(p) { return this.worldPoint(this.getEndPos()) },
},
'updating', {
  	updateArrow: function() {
		if (!this.arrowHead) return;
		// get to points at the end of the path and calculate a vector
		var toPos = this.getRelativePoint(1),
			fromPos = this.getRelativePoint(0.9); // some point near the end
		this.arrowHead.pointFromTo(fromPos, toPos);
   	},
	updateConnection: function (force) {
		// console.log("updateConnection");
		if (!this.world()) return; // because of localize...
		var obj1 = this.startMorph,
			obj2 = this.endMorph,
			bb1 = obj1 ? obj1.getGlobalTransform().transformRectToRect(obj1.shape.bounds()) :
						rect(this.getGlobalStartPos(), this.getGlobalStartPos()),
			bb2 = obj2 ? obj2.getGlobalTransform().transformRectToRect(obj2.shape.bounds()) :
						bb2 = rect(this.getGlobalEndPos(), this.getGlobalEndPos());

		var ptArr = this.pathBetweenRects(bb1, bb2),
			p1 = ptArr[0],
			c1 = ptArr[1],
			c2 = ptArr[2],
			p2 = ptArr[3],
			oldP1 = this.getStartPos(),
			oldP2 = this.getEndPos();

		if (!force && oldP1.eqPt(p1) && oldP2.eqPt(p2)) return;

		// to not move the connectors because of rounding errors
		p1 = obj1 ? p1 : this.getGlobalStartPos();
		p2 = obj2 ? p2 : this.getGlobalEndPos()

		this.updatePath(p1, c1, c2, p2);
	},
	updatePath: function(p1, c1, c2, p2) {
		this.shape.setVertices([p1,p2]);
		if (this.isCurve) {
			var elements = this.shape.getElements(), e = elements.last();
			// only has an effect when ctrl point was not edited by ser because then it's a Q
			if (e.charCode == 'C') { // it's a BezierCurve with 2 ctrl pts that we will upd
				e.controlX1 = c1.x;
				e.controlY1 = c1.y;
				e.controlX2 = c2.x;
				e.controlY2 = c2.y;
				this.shape.setElements(elements);
			}
		}
		this.updateArrow();
		return;
	},
	toggleLineStyle: function($super) {
		$super();
		this.updateArrow();
	},
},
'connecting', {
	connectMorphs: function(startMorph, endMorph) {
		if (startMorph) startMorph.addWithLayer(NodeMorphLayer);
		if (endMorph) endMorph.addWithLayer(NodeMorphLayer);
		
		if (this.startMorph) this.startMorph.deconnectLineMorph(this);
		if (this.endMorph) this.endMorph.deconnectLineMorph(this)
		
		this.startMorph = startMorph;
		this.endMorph = endMorph;
			
		if (startMorph) startMorph.connectLineMorph(this);
		if (endMorph) endMorph.connectLineMorph(this);
		
		this.updateConnection();				
	},
	connectEndMorph: function(endMorph) {
		if (endMorph) endMorph.addWithLayer(NodeMorphLayer);
		if (this.endMorph) this.endMorph.deconnectLineMorph(this)
		this.endMorph = endMorph;		
		if (endMorph) endMorph.connectLineMorph(this);
		
		this.updateConnection();				
	},

	disconnectMorphs: function(s) {	
		if (this.startMorph) this.startMorph.deconnectLineMorph(this);
		if (this.endMorph) this.endMorph.deconnectLineMorph(this)
		this.startMorph = null;
		this.endMorph = null;			
	},

});



}); // module Connector
