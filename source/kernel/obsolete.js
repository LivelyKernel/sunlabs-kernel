Object.extend(String.prototype, {

    withNiceDecimals: function() {

        // JS can't print nice decimals  // KP: I think it can be convinced, use toFixed
        var dotIx = this.indexOf('.');
        // return unchanged unless all digits with exactly one dot
        if (dotIx < 0 || this.indexOf('.', dotIx+1) >= 0) return this;
        
        for (var i=0; i< this.length; i++) {
            if ('0123456789.'.indexOf(this[i]) < 0) return this; 
        }

        // truncate to 8 digits and trim trailing zeroes
        var ss = this.substr(0, dotIx + 8);
        var len = ss.length;

        for (var i=len-1; i>dotIx+1; i--) {
            if (ss[i] == '0') len--;
            else return ss.substr(0, len) 
        }

        return ss.substr(0,len);
    }
});


Object.extend(Class, {

    // KP: obsolete, use Object.isClass
    isClass: function(object) {
	return (object instanceof Function) 
	    && object.prototype 
	    && (object.functionNames().length > Object.functionNames().length);
    }

});




// http://www.sitepen.com/blog/2008/03/18/javascript-metaclass-programming/
Object.freeze = function(object) {

    var constr = object.constructor;
    var proto = constr.prototype
    if (constr._privatize) {    // note, doesn't work with addMethods, should be done there
	constr._privatize = { privates: {}, functions: [] };
	for (var key in proto) {
	    var value = proto[key];
	    if (key.charAt(0) === "_") {
		constr._privatize.privates[key.slice(1)] = value;
		delete proto[key];
	    } else if (Object.isFunction(value)) {
		constr._privatize.functions.push(key);
	    }
	}
    }
    var context = Object.beget(object, constr._privatize.privates);
    context.$public = object;
    
    var fns = constr._privatize.functions;
    for (var i = 0; i < fns.length; i++) {
	var fname = fns[i];
	object[fname] = object[fname].bind(context); // ouch, object-private bindings
    }

};


// boodman/crockford delegation
Object.beget = function(object, properties) {
    function Delegate(){};
    Delegate.prototype = object;
    var d = new Delegate();
    properties && Object.extend(d, properties);
    return d;
};



/**
 * @class MenuMorph: Popup menus
 */ 
CheapListMorph.subclass("CheapMenuMorph", {

    style: { 
        borderColor: Color.blue,
        borderWidth: 0.5,
        textColor: Color.blue,
        fill: Color.blue.lighter(5),
        borderRadius: 6, 
        fillOpacity: 0.75, 
        wrapStyle: WrapStyle.Shrink
    },

    labelStyle: {
         borderRadius: 4, 
         fillOpacity: 0.75, 
         wrapStyle: WrapStyle.Shrink
    },

    initialize: function($super, items, targetMorph, lines) {
        // items is an array of menuItems, each of which is an array of the form
        // [itemName, target, functionName, parameterIfAny]
        // At mouseUp, the call is of the form
        // target.function(parameterOrNull,event,menuItem)
        // Note that the last item is seldom used, but it allows the caller to put
        // additional data at the end of the menuItem, where the receiver can find it.
        // The optional parameter lineList is an array of indices into items.
        // It will cause a line to be displayed below each item so indexed
    
        // It is intended that a menu can also be created incrementally
        // with calls of the form...
        //     var menu = MenuMorph([]);
        //     menu.addItem(nextItem);  // May be several of these
        //     menu.addLine();          // interspersed with these
        //     menu.openIn(world,location,stayUp,captionIfAny);

        // KP: noe that the $super is not called ... should be called at some point
        this.items = items;
        this.targetMorph = targetMorph || this;
        this.lines = lines || [];
        //this.layoutChanged();
        return this;
    },

    addItem: function(item) { 
        this.items.push(item);
    },

    addLine: function(item) { // Not yet supported
        // The idea is for this to add a real line on top of the text
        this.items.push(['-----']);
    },

    removeItemNamed: function(itemName) {
        // May not remove all if some have same name
        // Does not yet fix up the lines array
        for (var i = 0; i < this.items.length; i++)
            if (this.items[i][0] == itemName)
                this.items.splice(i,1);
    },

    replaceItemNamed: function(itemName, newItem) {
        for (var i = 0; i < this.items.length; i++)
            if (this.items[i][0] == itemName)
                this.items[i] = newItem;
    },

    removeItemsNamed: function(nameList) {
        nameList.forEach(function(n) { this.removeItemNamed(n); }, this);
    },

    keepOnlyItemsNamed: function(nameList) {
        var rejects = [];
        this.items.forEach( function(item) { if (nameList.indexOf(item[0]) < 0) rejects.push(item[0])});
        this.removeItemsNamed(rejects);
    },

    openIn: function(world, location, remainOnScreen, captionIfAny) { 
        if (this.items.length == 0) return;
        // Note: on a mouseDown invocation (as from a menu button),
        // mouseFocus should be set immediately before or after this call
        this.stayUp = remainOnScreen; // set true to keep on screen
        this.caption = captionIfAny;  // Not yet implemented

        this.compose(location);

        world.addMorph(this);
        if (captionIfAny) { // Still under construction
            var label = new TextMorph(new Rectangle(0, 0, 200, 20), captionIfAny);
            label.applyStyle(this.labelStyle);
            label.fitText();
            
            label.align(label.bounds().bottomCenter(), this.shape.bounds().topCenter());
            this.addMorph(label);
        }
        // If menu and/or caption is off screen, move it back so it is visible
        var menuRect = this.bounds();  //includes caption if any
        // Intersect with world bounds to get visible region.  Note we need shape.bounds,
        // since world.bounds() would include stick-outs, including this menu!
        var visibleRect = menuRect.intersection(this.owner.shape.bounds()); 
        var delta = visibleRect.topLeft().subPt(menuRect.topLeft());  // delta to fix topLeft off screen
        delta = delta.addPt(visibleRect.bottomRight().subPt(menuRect.bottomRight()));  // same for bottomRight
        if (delta.dist(pt(0,0)) > 1) this.moveBy(delta);  // move if significant

        // Note menu gets mouse focus by default if pop-up.  If you don't want it, you'll have to null it
        if (!remainOnScreen) world.firstHand().setMouseFocus(this);
    },

    compose: function(location) { 
        var itemNames = this.items.map(function (item) { return item[0] });
        CheapListMorph.prototype.initialize.call(this, location.extent(pt(200, 200)), itemNames);

        // styling
        this.applyStyle(this.style);
        this.fitText(); // first layout is wasted!

        //this.setFill(StipplePattern.create(Color.white, 3, Color.blue.lighter(5), 1));
    },

    onMouseUp: function(evt) {
        var item = null;
        if (!this.hasNullSelection()) item = this.items[this.selectedLineNo()];
        this.setNullSelectionAt(0);  // Clean up now, in case the call fails
        if (!this.stayUp) this.remove(); 

        if (item) { // Now execute the menu item...
            if (item[1] instanceof Function) { // alternative style, items ['menu entry', function] pairs
                item[1].call(this.targetMorph || this, evt);
            } else if (item[1] instanceof String || typeof item[1] == 'string') {
                // another alternative style, send a message to the targetMorph's menu target (presumably a view).
                var responder = (this.targetMorph || this).getModelValue("getMenuTarget");
                if (responder) {
                    console.log("menu target is " + responder);
                    var func = responder[item[1]];
                    if (!func) console.log("didn't find function " + item[1]);
                    else func.call(responder, item[2], evt, item);
                } else {
                    console.log("no menu target, menu target " + this.targetMorph);
                }
            } else {
                var func = item[1][item[2]];  // target[functionName]
                if (func == null) console.log('Could not find function ' + item[2]);
                // call as target.function(parameterOrNull,event,menuItem)
                else func.call(item[1], item[3], evt, item); 
            }
        }
    }

});


// ===========================================================================
// The Bouncing Spheres Example
// ===========================================================================

/**
 * @class BouncingSpheres
 */

Object.subclass('BouncingSpheres');

Object.extend(BouncingSpheres, {
    makeCircleGrid: function (itemCount) {
        var canvasWidth = this.canvas().bounds().width;
        var canvasHeight = this.canvas().bounds().height;

        var minR = 10, maxR = canvasWidth / 3;

        for (var j = 0; j < itemCount; ++j) {
            var r = BouncingSpheres.getRandSkewed(minR, maxR);
            var cx = BouncingSpheres.getRand(r,  canvasWidth  - r);
            var cy = BouncingSpheres.getRand(r,  canvasHeight - r);
            //console.log([r, cx, cy]);
    
            var aShape  = new Morph(new Rectangle(cx - r, cy - r, 2*r, 2*r), "ellipse");
            aShape.setFill(BouncingSpheres.randColor(true));
            aShape.setBorderColor(BouncingSpheres.randColor(true));
            aShape.setFillOpacity(BouncingSpheres.getRand(0, 1));
            aShape.setBorderWidth(BouncingSpheres.getRand(0, 3));
            aShape.fullRadius = r + aShape.shape.getStrokeWidth();
    
            WorldMorph.current().addMorph(aShape);
    
            aShape.vector = Point.polar(15, BouncingSpheres.getRand(0, Math.PI *2));
	    aShape.bounce = function() {
                // var pt = this.getTranslation();
                this.translateBy(this.vector);
                var worldpt = this.origin;
		
                if ((worldpt.x - this.fullRadius < 0) || (worldpt.x + this.fullRadius > canvasWidth)) {
                    this.vector.x = -this.vector.x;
                }
		
                if ((worldpt.y - this.fullRadius < 0) || (worldpt.y + this.fullRadius > canvasHeight)) {
                    this.vector.y = - this.vector.y;
                }
	    };
	    
            aShape.startStepping(30, "bounce");
            
        }
    },

    getRand: function(from, to) {
        return Math.random() * (to - from) + from;
    },
    
    getRandSkewed: function(from, to) {
        // let skew stats to smaller values
        var seed = 0;

        for (var i = 0; i < BouncingSpheres.skew_stat_factor; ++i) {
            seed += Math.random();
        }

        seed = 2 * Math.abs(seed / BouncingSpheres.skew_stat_factor - 0.5);
        return seed * (to - from) + from;
    },
    
    skew_stat_factor: 15,
    
    randColor: function(alpha) {
        var red   = BouncingSpheres.getRand(0, 1);
        var green = BouncingSpheres.getRand(0, 1);
        var blue  = BouncingSpheres.getRand(0, 1);
        var opacity = 1;
        var color = new Color(red, green, blue);
        return color;    
    }

});
   
 ImageMorph.subclass("IconMorph", {

    documentation: "Simple icon",
    
    initialize: function($super, viewPort, url, name, targetUrl) {
        $super(viewPort, url);
        this.label = new TextMorph(new Rectangle(viewPort.width, viewPort.height/3, 100, 30), name).beLabel();
        this.target = targetUrl;
        this.label.setFill(Color.white);
        this.addMorph(this.label);
        return this;
    },
    
    okToBeGrabbedBy: function(evt) { // TODO fix the same movement problem as in linkmorph
        this.open(); 
        return null; 
    },

    open: function () {
        window.open(this.target);
    }

});


if (UserAgent.webKitVersion) { 
    Error.prototype.inspect = function() {
	return this.name + " in " + this.sourceURL + ":" + this.line + ": " + this.message;
    }
} else if (UserAgent.isMozilla) {
    Error.prototype.inspect = function() {
	return this.name + " in " + this.fileName + ":" + this.lineNumber + ": " + this.message;
    }
}

/**
  * @class StipplePattern (NOTE: PORTING-SENSITIVE CODE)
  */

Wrapper.subclass('StipplePattern', {

    initialize: function(color1, h1, color2, h2) {
	this.rawNode = NodeFactory.create("pattern", 
					  {patternUnits: 'userSpaceOnUse', x: 0, y: 0, width: 100, height: h1 + h2});
	this.rawNode.appendChild(NodeFactory.create('rect', {x: 0, y: 0,  width: 100, height: h1,      fill: color1}));
	this.rawNode.appendChild(NodeFactory.create('rect', {x: 0, y: h1, width: 100, height: h1 + h2, fill: color2}));
	return this;
    }

});


if (UserAgent.canExtendBrowserObjects) Object.extend(Global.document, {
    oncontextmenu: function(evt) { 
	var targetMorph = evt.target.parentNode; // target is probably shape (change me if pointer-events changes for shapes)
	if ((targetMorph instanceof Morph) 
	    && !(targetMorph instanceof WorldMorph)) {
	    evt.preventDefault();
	    var topElement = targetMorph.canvas().parentNode;
	    evt.mousePoint = pt(evt.pageX - (topElement.offsetLeft || 0), 
				evt.pageY - (topElement.offsetTop  || 0) - 3);
	    // evt.mousePoint = pt(evt.clientX, evt.clientY);
	    targetMorph.showMorphMenu(evt); 
	} // else get the system context menu
    }.logErrors('Context Menu Handler')
});



 // Obsoleted by a transient morph
Visual.subclass('TextSelection', {
   
    fill: Color.primary.green,
    borderWidth: 0,
    borderRadius: 1,
    
    initialize: function() {
	this.rawNode = NodeFactory.create("g", {"fill" : this.fill,  "stroke-width": this.borderWidth});
	LivelyNS.setType(this.rawNode, "Selection");
    },
    
    addRectangle: function(rect) {
	this.rawNode.appendChild(new RectShape(rect).roundEdgesBy(this.borderRadius).rawNode);
    },

    undraw: function() {
	this.replaceRawNodeChildren(null);
    }
});


TextWord.addMethods({
    getFontFamily: function() {
        for (var node = this.rawNode; node && (/text|tspan/).test(node.tagName); node = node.parentNode) {
            var result = node.getAttributeNS(null, "font-family");
            if (result) return result;
        }
        return null; // ???
    },
    
    getFontSize: function() {
        for (var node = this.rawNode; node && (/text|tspan/).test(node.tagName); node = node.parentNode) {
            var result = node.getAttributeNS(null, "font-size");
            if (result) return Converter.parseLength(result);
        }
        return 0; // Should we return a default size?
    }
});