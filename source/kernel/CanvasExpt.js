//
//	To run The Lively Kernel in a Canvas Element, start your browser at expt.xhtml
//
//  Yet To do: 
//	Fix damage rect of hand -- keeps registering damage when no move
//		also, eg, keeps registering damage rect of ticking star after grab/release
//			this effect is cleared by leaving world, so extra ticking??
//		this is a pre-existing condition revealed by damage display
//	Possibly related: spinning star changes speed after a few world changes
//
//	Font changes not shown correctly on canvas
//	Asteroids not clipped when window collapsed
//	Display of Images not yet working.
//	Morphs dragged through worm-holes get coords offset by current location
//	Simple example morphs world needs to be rebuilt, since serialized form not available
//	And, er, of course we need to replace XML serialization be, eg, JSON etc.
//
//	Performance - cache color strings, gradient objects

Morph.addMethods({  // Damage propagation
    changed: function() { // Means we have to redraw due to altered content
	if(this.owner) this.owner.invalidRect(this.bounds());
     },
    invalidRect: function(rect) { // rect is in local coordinates
	// owner == null is presumably caught by WorldMorph's override
	if(this.owner) this.owner.invalidRect(this.getTransform().transformRectToRect(rect)); }
});

Morph.addMethods({  // Canvas Display
    fullDrawOn: function(graphicContext, clipRect) {
	// Display this morph and all of its submorphs (back to front)
	if (! this.isVisible() || !(clipRect.intersects(this.bounds()))) return;
        var bnds = this.innerBounds();
	graphicContext.save();
	graphicContext.translate(this.origin.x, this.origin.y);
	if (this.rotation != 0) graphicContext.rotate(this.rotation);
	var s = this.scalePoint;
	if (s.x != 1 || s.y != 1) graphicContext.scale(s.x, s.y);
	this.drawOn(graphicContext, bnds);
	this.drawSubmorphsOn(graphicContext, clipRect)
	graphicContext.restore(); },
    drawOn: function(graphicContext, bnds) {
	if (this.isClipMorph) {  // Check for clipping behavior
		this.shape.setPath(graphicContext, bnds);
		graphicContext.clip(); }
	this.shape.drawOn(graphicContext, bnds);
	},
    drawSubmorphsOn: function(graphicContext, clipRect) {
	// Display all submorphs, back to front
	if(this.submorphs == null || this.submorphs.length == 0) return;
	var subClip = this.getTransform().createInverse().transformRectToRect(clipRect);
	for(var i=0; i<this.submorphs.length; i++)
		this.submorphs[i].fullDrawOn(graphicContext, subClip);
	}
});

TextMorph.addMethods({  // Canvas Display
    drawOn: function(graphicContext, bnds) {
	this.shape.drawOn(graphicContext, bnds.outsetByRect(this.padding));
	},
    drawSubmorphsOn: function(graphicContext, clipRect) {
	// First display the submorphs (including selection), then the text
	if(this.submorphs == null) return
	for(var i=0; i<this.submorphs.length; i++)
		this.submorphs[i].fullDrawOn(graphicContext, clipRect);
	this.drawTextOn(graphicContext, clipRect); },
    fontString: function(font) {
	var styleString = " ";
		if (font.style.indexOf("bold") >= 0) styleString += "bold ";
		if (font.style.indexOf("italic") >= 0) styleString += "italic ";
	var fontString = (font.size*0.75).toString() + "pt " + styleString + font.family;
	console.log ("fontString = " + fontString);
	return fontString; },
    drawTextOn: function(graphicContext, bnds, clipRect) {
	if (this.lines == null) return;
	// Still need to intersect clipRect with line rects for performance
        var bnds = this.innerBounds();
	graphicContext.textBaseline = 'top';
	graphicContext.fillStyle = this.shape.canvasFillFor(this.textColor);
	var currentFont = this.font;
	graphicContext.font = this.fontString(this.font);
	//console.log(graphicContext.font);
	//console.log();
	for (var i=0; i<this.lines.length; i++) {
		var line = this.lines[i];
		var str = line.textString;
		for (var j=0; j<line.chunks.length; j++) {
			var word = line.chunks[j];
			var slice = str.slice(word.startIndex,word.stopIndex+1);
			if (!word.isWhite) {
				if (word.font && word.font !== currentFont) {
					currentFont = word.font;
					graphicContext.font = this.fontString(currentFont);
				}
				graphicContext.fillText(slice, word.bounds.x, word.bounds.y-2);  // *** why -2? Fix me
			}
		}
	}
	}
});

/* This doesn't work yet...
ImageMorph.addMethods({  // Canvas Display
    drawOn: function(graphicContext, bnds) {
	graphicContext.drawImage(this.image, bnds.x, bnds.y);
	}
});
*/ //End of non-working ImageMorph method

ClipMorph.addMethods({  // Canvas Display
	// Note also the conditional clause in Morph.drawOn()
    invalidRect: function($super, rect) { // limit damage report to clipped region
	$super(rect.intersection(this.innerBounds()));
	}
});

WorldMorph.addMethods({  // World
    invalidRect: function(rect) {
	if (!this.damageManager) this.damageManager = new DamageManager();
	this.damageManager.recordInvalidRect(rect); },
    fullDrawOn: function($super, ctx, clipRect) {
	$super(ctx, clipRect);
	var hands = this.hands;
	for(var i=hands.length-1; i>=0; i--) { hands[i].fullDrawOn(ctx, clipRect); } },
//
    testCanvas: function() {
//	*** Here is where we display the world on the canvas
//	This is called after World.doOneCycle, and Hand.handleEvent
	var useDamageRectangles = true;  // computes change rects, repaints only affected areas
	var showDamageRectangles = false;  // shows change rects, but does full repaint to clear them

	if (this !== WorldMorph.current()) { // still needed?
		// console.log('inactive world');
		return; }
	var canvas = document.getElementById('lively.canvas');
	if (!canvas || !canvas.getContext) return;
	var ctx = canvas.getContext("2d");
	ctx.font = "9pt Helvetica";  // our current default
	ctx.fillStyle = 'gray'; ctx.fillRect (10, 10, 20, 20);
	ctx.strokeStyle = 'black';
	
	if (useDamageRectangles || showDamageRectangles) {
		if (!this.damageManager) this.damageManager = new DamageManager();  // init
		damageRects = this.damageManager.invalidRects;
		this.damageManager.resetInvalidRects();
	} else { damageRects = [canvas.bounds];
	}
	if (showDamageRectangles || !useDamageRectangles) {
		// Complete redisplay (also needed to clear show-damage)
		canvas.width = canvas.width; // erase canvas
		this.fullDrawOn(ctx, canvas.bounds);
	} else {
		// Redisplay only damaged regions
		for(var i=0; i<damageRects.length; i++) {
			var rect = damageRects[i].expandBy(1);
			ctx.save();
			lively.scene.Shape.prototype.setPath(ctx, rect);
			ctx.clip();
			this.fullDrawOn(ctx, rect);
			ctx.restore(); }
	}
	if (showDamageRectangles) {
		// draw boxes around each damaged region
		ctx.strokeStyle = 'blue';
		for(var i=0; i<damageRects.length; i++) {
			var rect = damageRects[i];
			ctx.strokeRect(rect.x, rect.y, rect.width, rect.height); }
	}
	},
    realDisplayOnCanvas: WorldMorph.prototype.displayOnCanvas,
    displayOnCanvas: function(notThis) {  // Patch in a full display
	this.realDisplayOnCanvas(notThis);
	var canvas = document.getElementById('lively.canvas');
	if (!canvas || !canvas.getContext) return;
	var ctx = canvas.getContext("2d");
	this.fullDrawOn(ctx, this.innerBounds());
	},
    realDoOneCycle: WorldMorph.prototype.doOneCycle,
    doOneCycle: function(world) {  // Patch in a call on testCanvas
	this.testCanvas();
	return this.realDoOneCycle(world);
	}
});

HandMorph.addMethods({  // Canvas Display
    registerForEvents: function(morph) {
        Event.basicInputEvents.forEach(function(name) { 
            morph.rawNode.addEventListener(name, this, this.handleOnCapture);}, this);
	// Register for events from the 2D canvas as well
	var canvas = document.getElementById('lively.canvas');
	if(morph === this || canvas == null) return;
	Event.basicInputEvents.forEach(function(name) { 
            canvas.addEventListener(name, this, this.handleOnCapture);}, this);
    },
    unregisterForEvents: function(morph) {
        Event.basicInputEvents.forEach(function(name) { 
            morph.rawNode.removeEventListener(name, this, this.handleOnCapture);}, this);
	// Unregister for events from the 2D canvas as well
	var canvas = document.getElementById('lively.canvas');
	if(morph === this || canvas == null) return;
	Event.basicInputEvents.forEach(function(name) { 
            canvas.removeEventListener(name, this, this.handleOnCapture);}, this);
    },
    realHandleEvent: HandMorph.prototype.handleEvent,
    handleEvent: function(event) {  // Patch in a call on testCanvas
        result = this.realHandleEvent(event);
	var w=this.world()
	if(w) w.testCanvas();
	return result;
    }
});

Object.subclass('DamageManager', {  // Damage repair
    initialize: function() {
	this.invalidRects = [];
	},
    recordInvalidRect: function(rect) { 
	if(this.invalidRects.length == 0) {this.invalidRects = [rect]; return; }
	for(var i=0; i<this.invalidRects.length; i++) { // merge with an intersecting rect
		var irect = this.invalidRects[i];
		if(irect.intersects(rect)) { this.invalidRects[i] = irect.union(rect); return; } }
	for(var i=0; i<this.invalidRects.length; i++) { // merge with a nearby rect
		var irect = this.invalidRects[i];
		if(irect.dist(rect) < 50) { this.invalidRects[i] = irect.union(rect); return; } }
	this.invalidRects.push(rect); },  // add it as a separate rect
    resetInvalidRects: function() { this.invalidRects = []; }});

lively.scene.Shape.addMethods({  // Graphic Shapes
    drawOn: function(graphicContext, bnds) {
	// Display this shape
	var pathSet = false;
	if (this.getFill()) { // Fill first, then stroke
		var alpha = this.getFillOpacity();
		if (alpha != 1) graphicContext.globalAlpha = alpha;
		graphicContext.fillStyle = this.canvasFillFor(this.getFill(), graphicContext, bnds);
		this.drawFillOn(graphicContext, bnds);
		pathSet = true; }
	if (this.getStroke() && this.getStrokeWidth() > 0) {
		var alpha = this.getStrokeOpacity();
		if (alpha != 1) graphicContext.globalAlpha = alpha;
		graphicContext.strokeStyle = this.canvasFillFor(this.getStroke(), graphicContext, bnds);
		graphicContext.lineWidth = this.getStrokeWidth();
		this.drawStrokeOn(graphicContext, bnds, pathSet); }
	},
    drawFillOn: function(graphicContext, bnds) {
	this.setPath(graphicContext, bnds);
	graphicContext.fill();
	},
    drawStrokeOn: function(graphicContext, bnds, pathSet) {
	if (! pathSet) this.setPath(graphicContext, bnds);
	graphicContext.stroke();
	},
    canvasFillFor: function(ourFill, graphicContext, bnds) {
	if (ourFill == null) return null;
	if (ourFill instanceof Color) return ourFill.toString();
	var grad = null;
	if (ourFill instanceof lively.paint.LinearGradient) {
		cv = bnds.scaleByRect(ourFill.vector || lively.paint.LinearGradient.NorthSouth);
		grad = graphicContext.createLinearGradient(cv.x, cv.y, cv.maxX(), cv.maxY());
		}
	if (ourFill instanceof lively.paint.RadialGradient) {
		var c = bnds.center();
		var c0 = c.scaleBy(0.7).addPt(bnds.topLeft().scaleBy(0.3));
		grad = graphicContext.createRadialGradient(c0.x, c0.y, 0, c.x, c.y, bnds.width/2);
		}
	if (grad) {
		var stops = ourFill.stops;
		for (var i=0; i<stops.length; i++) {
			grad.addColorStop(stops[i].offset(), this.canvasFillFor(stops[i].color())); }
		return grad;
		}
	return null;
	},
    setPath: function(graphicContext, bnds) { // Rectangular default my be overridden
	graphicContext.beginPath();
	graphicContext.moveTo(bnds.x, bnds.y);
	graphicContext.lineTo(bnds.maxX(), bnds.y);
	graphicContext.lineTo(bnds.maxX(), bnds.maxY());
	graphicContext.lineTo(bnds.x, bnds.maxY());
	graphicContext.closePath();
	}
});

lively.scene.Rectangle.addMethods({  // Graphic Shapes
	initialize: function($super, rect) {
		$super();
		this.rawNode = NodeFactory.create("rect");
		this.setBounds(rect || new Rectangle(0, 0, 0, 0));
		return this;
    },
	drawFillOn: function($super, graphicContext, bnds) {
	if (this.getBorderRadius()!=0) $super(graphicContext, bnds);
	else graphicContext.fillRect(bnds.x, bnds.y, bnds.width, bnds.height);
	},
    drawStrokeOn: function($super, graphicContext, bnds, pathSet) {
	if (this.getBorderRadius()!=0) $super(graphicContext, bnds);
	else graphicContext.strokeRect(bnds.x, bnds.y, bnds.width, bnds.height);
	},
    setPath: function($super, graphicContext, bnds) { // Rectangular default my be overridden
	var r = this.getBorderRadius();
	if (r == 0) return $super(graphicContext, bnds);
	var dx = pt(r, 0), dy = pt(0, r), pi2 = Math.PI/2, p = null;
	graphicContext.beginPath();
	p = bnds.topLeft().addPt(dx); graphicContext.moveTo(p.x, p.y);
	p = bnds.topRight().subPt(dx); graphicContext.lineTo(p.x, p.y);
	c = p.addPt(dy); graphicContext.arc(c.x, c.y, r, pi2*3, pi2*0, false);
	p = bnds.bottomRight().subPt(dy); graphicContext.lineTo(p.x, p.y);
	c = p.subPt(dx); graphicContext.arc(c.x, c.y, r, pi2*0, pi2*1, false);
	p = bnds.bottomLeft().addPt(dx); graphicContext.lineTo(p.x, p.y);
	c = p.subPt(dy); graphicContext.arc(c.x, c.y, r, pi2*1, pi2*2, false);
	p = bnds.topLeft().addPt(dy); graphicContext.lineTo(p.x, p.y);
	c = p.addPt(dx); graphicContext.arc(c.x, c.y, r, pi2*2, pi2*3, false);
	graphicContext.closePath();
	}
});

lively.scene.Polygon.addMethods({  // Graphic Shapes
    setPath: function(graphicContext, bnds) {
	var verts = this.vertices();
	graphicContext.beginPath();
	graphicContext.moveTo(verts[0].x, verts[0].y);
	for (var i=1; i<verts.length; i++) graphicContext.lineTo(verts[i].x, verts[i].y);
	graphicContext.closePath();
	}
});

lively.scene.Polyline.addMethods({
    setPath: lively.scene.Polygon.prototype.setPath
});

lively.scene.Ellipse.addMethods({  // Ellipse as four quadratic Beziers
    setPath: function(graphicContext, bnds) {
        var aX = bnds.x, aY = bnds.y,
		hB = (bnds.width / 2) * .5522848,
		vB = (bnds.height / 2) * .5522848,
		eX = aX + bnds.width,
		eY = aY + bnds.height,
		mX = aX + bnds.width / 2,
		mY = aY + bnds.height / 2;
	graphicContext.beginPath();
        graphicContext.moveTo(aX, mY);
        graphicContext.bezierCurveTo(aX, mY - vB, mX - hB, aY, mX, aY);
        graphicContext.bezierCurveTo(mX + hB, aY, eX, mY - vB, eX, mY);
        graphicContext.bezierCurveTo(eX, mY + vB, mX + hB, eY, mX, eY);
        graphicContext.bezierCurveTo(mX - hB, eY, aX, mY + vB, aX, mY);
        graphicContext.closePath();
    }
});

Event.addMethods({  // Tweak y-coordinates if negative (temporary)
    realInitialize: Event.prototype.initialize,
    initialize: function(rawEvent) {
	this.realInitialize(rawEvent);
	if (this.mousePoint && this.mousePoint.y < 0) {
		var canvas = document.getElementById('lively.canvas');
		var offset = canvas ? canvas.height : 0;
		this.mousePoint = pt(this.mousePoint.x, this.mousePoint.y + offset); }
	}
});

console.log("***Scratch.js completed.");

