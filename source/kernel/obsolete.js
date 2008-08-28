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

//===========================================================================
// The Pen/Hilbert curve demo
// ===========================================================================

Object.subclass('Pen', {

    initialize: function(loc) {
        this.location = (loc !== undefined) ? loc : WorldMorph.current().bounds().center();
        this.penWidth = 2;
        this.penColor = Color.blue;
        this.fillColor = null;
        this.heading = 0;
        this.newLine(this.location); 
    },
    
    setPenColor: function(color) { 
        this.penColor = color; 
    },
    
    setPenWidth: function(size) { 
        this.penWidth = size; 
    },
    
    turn: function(degrees) { 
        this.heading += degrees; 
    },
    
    go: function(dist) { 
        this.location = this.location.addPt(Point.polar(dist, this.heading.toRadians()));
        this.vertices.push(this.location); 
    },
    
    drawLines: function() {
        var morph = new Morph(this.startingLocation.asRectangle(), "rect");
        var verts = this.vertices.invoke('subPt', this.startingLocation);
    
        if (this.fillColor) 
            morph.setShape(new PolygonShape(verts, this.fillColor, this.penWidth, this.penColor));
        else 
            morph.setShape(new PolylineShape(verts, this.penWidth, this.penColor));
    
        WorldMorph.current().addMorph(morph); 
    
/* if (morph.world().backend())
        morph.world().backend().createMorph(morph.morphId(), morph, morph.world().morphId());
*/

        return morph;
    },
    
    fillLines: function(color) { 
        this.fillColor = color; 
        return this.drawLines();
    },
    
    hilbert: function(n,s) {
        // Draw an nth level Hilbert curve with side length s.
        if (n == 0) 
            return this.turn(180);
    
        if (n > 0) { 
            var a = 90;  
            var m = n - 1; 
        } else { 
            var a = -90;  
            var m = n + 1; 
        }
        
        this.turn(a); 
        this.hilbert(0 - m, s);
        this.turn(a); 
        this.go(s); 
        this.hilbert(m, s);
        this.turn(0 - a); 
        this.go(s); 
        this.turn(0 - a); 
        this.hilbert(m, s);
        this.go(s); 
        this.turn(a); 
        this.hilbert(0 - m, s);
        this.turn(a); 
    },
    
    filbert: function(n, s, color) {
        // Two Hilbert curves form a Hilbert tile
        this.newLine();  
        this.setPenColor(Color.black); 
        this.setPenWidth(1);
        this.hilbert(n, s); 
        this.go(s);
        this.hilbert(n, s); 
        this.go(s);
        return this.fillLines(color); 
    },
    
    newLine: function(loc) {
        this.startingLocation = loc ? loc : this.location;
        this.vertices = [ this.startingLocation ];
    },
    
    filberts: function(n, s) {
        // Four interlocking filberts
        var n2 = Math.pow(2,n-1);
        var morphs = [ ];
    
        for (var i = 0; i < 4; i++) {
            morphs.push(this.filbert(n, s, Color.wheel(4)[i]));
            this.go((n2 - 1)*s); 
            this.turn(-90); 
            this.go(n2 * s); 
            this.turn(180);
        }

        return morphs; 
    }
    
});

// The menu-driven filled Hilbert curve demo
Pen.hilbertFun = function(world, loc) {
    var logoMenu = new MenuMorph([]);

    for (var i=0; i<=5; i++) {
        logoMenu.addItem([i.toString(), logoMenu, "makeLogo", i]);
    }

    logoMenu.makeLogo = function(order) {
        if (this.morphs) for (var i=0; i<4; i++) this.morphs[i].remove();
        if (i=0) { this.morphs == null; return; }
        var P = new Pen();
        this.morphs = P.filberts(order,5);
    };

    logoMenu.openIn(world, loc, true, "Hilbert Fun");
}

// The default script for the Pen/Hilbert demo
Pen.script = ["P = new Pen();",
"P.setPenColor(Color.red);",
"for (var i=1; i<=40; i++)",
"    { P.go(2*i); P.turn(89); };",
"P.drawLines();",
""].join("\n");



XenoMorph.addMethods({
    test: function(url) {
        url = url || Loader.baseURL + "/sample.xhtml";
        console.log("url is " + url);
        var xeno = new XenoMorph(pt(400,200).extentAsRectangle(), new URL(url));
        WorldMorph.current().addFramedMorph(xeno, url, pt(50,50));
    },
    
    test2: function() {
// var text = '<object width="425" height="355"><param name="movie" value="http://www.youtube.com/v/a0qMe7Z3EYg&hl=en"></param><param name="wmode" value="transparent"></param><embed src="http://www.youtube.com/v/a0qMe7Z3EYg&hl=en" type="application/x-shockwave-flash" wmode="transparent" width="425" height="355"></embed></object>';
        var text = '<xhtml><body><video width="425" height="355" src="http://www.youtube.com/swf/l.swf?video_id=a0qMe7Z3EYg&rel=1" /></body></xhtml>';

        var xeno = new XenoMorph(pt(400,200).extentAsRectangle());
        Object.extend(xeno, NetRequestReporterTrait);
        xeno.setContentText(text, "application/xhtml+xml");
        WorldMorph.current().addFramedMorph(xeno, 'video', pt(50,50));
        return xeno;
    },

    setContentText: function(text, mimeType) {
        var parser = new DOMParser();
        var xhtml = parser.parseFromString(text, mimeType || "text/xml");
        var node = xhtml.getElementsByTagName("body")[0];
        this.body.parentNode.replaceChild(document.importNode(node, true), this.body);
    },



});


var Loader = {

    loadScript: function(ns, url) {
	ns = ns || Namespace.XHTML;
	var script = NodeFactory.createNS(ns, "script");
	var srcAttr = ns === Namespace.XHTML ? "src" : "href";
	script.setAttributeNS(ns === Namespace.XHTML ? ns : Namespace.XLINK, scrAttr, url);
	document.documentElement.appendChild(script);
	//document.documentElement.removeChild(script);
    },

    insertContents: function(iframe) {
	var node = iframe.contentDocument.documentElement;
	document.documentElement.appendChild(document.importNode(node, true));
    }


};



/**
 * @class WeatherWidget
 */
 
// Weather widget works by selecting the city from the list.
// It uses XMLHttpRequest to obtain weather info for the selected city
 
// We should consider using other weather service.
// These images are of low quality
Widget.subclass('OldWeatherWidget', NetRequestReporterTrait, {

    imagepath: "Resources/weather/",
    viewTitle: "Weather widget",
    initialViewExtent: pt(250, 260),
    pins: ["-Locale", "+WeatherDesc", "+Temperature", "+Wind", "+Gusts", "+DewPoint", "+Humidity", "+Visibility"],
    
    initialize: function($super) { 
	var model = new SyntheticModel(this.pins);
	$super(model.makePlugSpecFromPins(this.pins));
	model.addVariable("ImageURL", "http://www.bbc.co.uk/weather/images/banners/weather_logo.gif");
	this.initializeTransientState();
    },
    
    deserialize: function($super, importer, plug) {
	$super(importer, plug);
	this.initializeTransientState();
    },

    initializeTransientState: function() {
	this.feed = new Feed({model: this, setFeedChannels: "parseChannels", setStatus: "setRequestStatus"});
    },
    
    updateView: function(aspect, controller) {
	var p = this.modelPlug;
	if (!p) return;
	switch (aspect) {
	case p.getLocale:
	    this.updateLocale(this.getModelValue('getLocale', null));
	    break;
	}
    },
    
    parseChannels: function(channels) {
	if (channels.length <= 0) return;
	var channel = channels[0];
	var text = channel.items[0].description();
	var arr = text.split(",");
	var topic = channel.items[0].title();
	var weather = topic.substring(topic.indexOf("."), topic.indexOf("GMT:")+4).replace(/^\s+|\s+$/g, '');
	this.setModelValue("setWeatherDesc", weather[0].toUpperCase() + weather.substr(1));
	this.setModelValue("setTemperature", arr[0].replace(/^\s+|\s+$/g, ''));
	this.setModelValue("setWind", arr[1].replace(/^\s+|\s+$/g, ''));
	this.setModelValue("setGusts", arr[2].replace(/^\s+|\s+$/g, ''));
	this.setModelValue("setDewPoint", arr[3].replace(/^\s+|\s+$/g, ''));
	this.setModelValue("setHumidity",arr[4].replace(/^\s+|\s+$/g, '') + ", " + arr[5].replace(/^\s+|\s+$/g, ''));
	this.setModelValue("setVisibility", arr[6].replace(/^\s+|\s+$/g, ''));
    },

    updateLocale: function(item) {
	var citycode = null;
        // initialize UI update
        switch (item) {
        case "San Francisco, California":
            citycode = "6568"; // "USCA0050"  6568 -- San Francisco International (SFO)
            break;
        case "Tampere, Finland":
            citycode = "4974"; // "FIXX0031"  or 4974
            break;
        case "London, United Kingdom":
            citycode = "4583"; // "UKXX0318"  or 4583 
            break;
        }
	if (citycode) {
	    var url = new URL("http://feeds.bbc.co.uk/weather/feeds/rss/obs/world/" + citycode + ".xml");
	    this.feed.request(url);
	}
    },

    
    buildView: function(extent) {
	var model = this.getModel();
        var panel = new PanelMorph(extent);
	panel.applyStyle({borderWidth: 2, 
			  fill: new LinearGradient([Color.white, 1, Color.primary.blue], LinearGradient.NorthSouth)});
        //panel.setBorderColor(Color.blue);
        // TODO: add rounding to all the elements (panel, window & titlebar)
        // or make the titlebar round depending on the window
        var m; 
	
	var r = new Rectangle(10,20,25,20);
        panel.addMorph(m = new ImageMorph(r, this.imagepath + "city.png"));
        m.setFill(null);
        panel.addMorph(m = new ImageMorph(r.withY(55), this.imagepath + "weather.png"));
        m.setFill(null);
	r = r.withWidth(20);
        panel.addMorph(m = new ImageMorph(r.withY(80), this.imagepath + "temperature.png"));
        m.setFill(null);
        panel.addMorph(m = new ImageMorph(r.withY(105), this.imagepath + "wind.png"));
        m.setFill(null);
        panel.addMorph(m = new ImageMorph(r.withY(130), this.imagepath + "wind_dir.png"));
        m.setFill(null);
        panel.addMorph(m = new ImageMorph(r.withY(155), this.imagepath + "barometer.png"));
        m.setFill(null);
        panel.addMorph(m = new ImageMorph(r.withY(180), this.imagepath + "humidity.png"));
        m.setFill(null);
        panel.addMorph(m = new ImageMorph(r.withY(205), this.imagepath + "visibility.png"));
        m.setFill(null);
	
	r = new Rectangle(40, 3, 200, 20);
        m = panel.addMorph(new TextListMorph(r, ["San Francisco, California", "Tampere, Finland", "London, United Kingdom"]));
        m.connectModel({model: model, getSelection: "getLocale", setSelection: "setLocale"});
        m.selectLineAt(0); // Select the first item by default

        // build the textfields for the weather panel
        m = panel.addMorph(new TextMorph(r.withY(55), "---"));
	m.connectModel({model: model, getText: "getWeatherDesc"});
        m.takesKeyboardFocus = Functions.True;
	//m.beLabel();

        m = panel.addMorph(new TextMorph(r.withY(80), "---"));
	m.connectModel({model: model, getText: "getTemperature"});
	//m.beLabel();
        m.takesKeyboardFocus = Functions.True;
	
        m = panel.addMorph(new TextMorph(r.withY(105), "---"));
	m.connectModel({model: model, getText: "getWind"});
        m.takesKeyboardFocus = Functions.True;

        m = panel.addMorph(new TextMorph(r.withY(130), "---"));
	m.connectModel({model: model, getText: "getGusts"});
        m.takesKeyboardFocus = Functions.True;
	
        m = panel.addMorph(new TextMorph(r.withY(155), "---"));
	m.connectModel({model: model, getText: "getDewPoint"});
        m.takesKeyboardFocus = Functions.True;
	
        m = panel.addMorph(new TextMorph(r.withY(180), "---"));
	m.connectModel({model: model, getText: "getHumidity"});
        m.takesKeyboardFocus = Functions.True;
	
        m = panel.addMorph(new TextMorph(r.withY(205), "---"));
	m.connectModel({model: model, getText: "getVisibility"});
        m.takesKeyboardFocus = Functions.True;
	
//        panel.addMorph(TextMorph(new Rectangle(80,230, 200,20), "---")).connectModel({model: this, getText: "getDate"});
    
        var image = panel.addMorph(new ImageMorph(r.withY(230)));
        image.connectModel({model: model, getURL: "getImageURL"});
        image.setFill(null);
    
	this.updateLocale("San Francisco, California");
        return panel;
    }
    
});


  
WidgetModel.subclass('OldStylePanel', {

    documentation: "Interactive style editor for morphs.",
    initialViewExtent: pt(340,100),
    viewTitle: "Style Panel",

    initialize: function($super, targetMorph) {
        $super();
        this.targetMorph = targetMorph;
        this.originalSpec = targetMorph.makeStyleSpec();
        for (var p in this.originalSpec) this[p] = this.originalSpec[p];
    },

    getBorderWidth: function() { return this.borderWidth; },

    setBorderWidth: function(w) {
        this.borderWidth = w.roundTo(0.1);
        this.targetMorph.setBorderWidth(this.borderWidth);
        this.changed('getBorderWidth');
    },

    setBorderColor: function(c) { // Maybe add a little color swatch in the view
        this.borderColor = c;
        this.targetMorph.setBorderColor(this.borderColor);
    },

    getBorderRadius: function() { return this.borderRadius; },
    
    setBorderRadius: function(r) {
        this.targetMorph.shapeRoundEdgesBy(this.borderRadius = r.roundTo(1));
        this.changed('getBorderRadius');
    },

    getFillTypes: function() { return ["simple", "linear gradient", "radial gradient", "stipple"]; },
    getFillType: function() { return this.fillType; },
    setFillType: function(type) { this.fillType = type;  this.setFill(); },
    getFillDirs: function() { return ["NorthSouth", "SouthNorth", "EastWest", "WestEast"]; },
    getFillDir: function() { return this.fillDir; },
    setFillDir: function(dir) { this.fillDir = dir;  this.setFill(); },
    setColor1: function(color) { this.color1 = color; this.setFill(); },
    setColor2: function(color) { this.color2 = color; this.setFill(); },
    
    setFill: function() {
        if (this.fillType == null) this.fillType = 'simple';
        if (this.color1 == null) this.color1 = this.fill;
        if (this.color2 == null) this.color2 = this.fill;

        if (this.fillType == 'simple')  this.targetMorph.setFill(this.color1);
    
        if (this.fillType == 'linear gradient') {
            if (this.fillDir == null) this.fillDir = 'NorthSouth';
            this.targetMorph.setFill(new LinearGradient([this.color1, 1, this.color2], LinearGradient[this.fillDir]));
        }
    
        if (this.fillType == 'radial gradient')
            this.targetMorph.setFill(new RadialGradient([this.color1, 1, this.color2]));
    },
     
    getFillOpacity: function() { return this.fillOpacity; },
    
    setFillOpacity: function(op) {
        this.fillOpacity = op.roundTo(0.01);
        this.targetMorph.setFillOpacity(this.fillOpacity);
        this.changed('getFillOpacity');
        this.setStrokeOpacity(op); // Stroke opacity is linked to fill
    },

    getStrokeOpacity: function() { return this.strokeOpacity; },
    
    setStrokeOpacity: function(op) {
        this.strokeOpacity = op.roundTo(0.01);
        this.targetMorph.setStrokeOpacity(this.strokeOpacity);
        this.changed('getStrokeOpacity');
    },

    setTextColor: function(c) { // Maybe add a little color swatch in the view
        this.textColor = c;
        this.targetMorph.setTextColor(this.textColor);
    },

    getFontFamily: function() { return this.targetMorph.getFontFamily(); },
    
    setFontFamily: function(familyName) {
        this.familyName = familyName;
        this.targetMorph.setFontFamily(familyName);
    },

    getFontSize: function() { return this.targetMorph.getFontSize().toString(); },
    
    setFontSize: function(fontSize) {
        this.fontSize = eval(fontSize);
        this.targetMorph.setFontSize(this.fontSize);
    },

    buildView: function(extent) {
        var panel = new PanelMorph(extent, "rect");
        panel.linkToStyles(["panel"]);
        var m;
        var y = 10;

        panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), "Border Width").beLabel());
        panel.addMorph(m = new PrintMorph(new Rectangle(150, y, 40, 20)));
        m.connectModel({model: this, getValue: "getBorderWidth", setValue: "setBorderWidth"});
        panel.addMorph(m =  new SliderMorph(new Rectangle(200, y, 100, 20), 10.0));
        m.connectModel({model: this, getValue: "getBorderWidth", setValue: "setBorderWidth"});
        y += 30;

        panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Border Color').beLabel());
        panel.addMorph(m = new ColorPickerMorph(new Rectangle(250, y, 50, 30)));
        m.connectModel({model: this, setColor: "setBorderColor"});
        y += 40;

        if (this.targetMorph.shape.roundEdgesBy) {
            panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Round Corners').beLabel());
            panel.addMorph(m = new PrintMorph(new Rectangle(150, y, 40, 20)));
            m.connectModel({model: this, getValue: "getBorderRadius", setValue: "setBorderRadius"});
            panel.addMorph(m = new SliderMorph(new Rectangle(200, y, 100, 20), 50.0));
            m.connectModel({model: this, getValue: "getBorderRadius", setValue: "setBorderRadius"});
            y += 30;
        }

        panel.addMorph(m = new TextListMorph(new Rectangle(50, y, 100, 50),[""]));
        m.connectModel({model: this, getList: "getFillTypes", getSelection: "getFillType", setSelection: "setFillType"});
        panel.addMorph(m = new TextListMorph(new Rectangle(160, y, 75, 60),[""]));
        m.connectModel({model: this, getList: "getFillDirs", getSelection: "getFillDir", setSelection: "setFillDir"});
        panel.addMorph(m = new ColorPickerMorph(new Rectangle(250, y, 50, 30)));
        m.connectModel({model: this, setColor: "setColor1"});
        panel.addMorph(m = new ColorPickerMorph(new Rectangle(250, y+40, 50, 30)));
        m.connectModel({model: this, setColor: "setColor2"});
        y += 80;

        panel.addMorph(new TextMorph(new Rectangle(50, y, 90, 20), 'Fill Opacity').beLabel());
        panel.addMorph(m = new PrintMorph(new Rectangle(150, y, 40, 20)));
        m.connectModel({model: this, getValue: "getFillOpacity", setValue: "setFillOpacity"});
        panel.addMorph(m = new SliderMorph(new Rectangle(200, y, 100, 20), 1.0));
        m.connectModel({model: this, getValue: "getFillOpacity", setValue: "setFillOpacity"});
        y += 30;

        panel.addMorph(new TextMorph(new Rectangle(50, y, 90, 20), 'Stroke Opacity').beLabel());
        panel.addMorph(m = new PrintMorph(new Rectangle(150, y, 40, 20)));
        m.connectModel({model: this, getValue: "getStrokeOpacity", setValue: "setStrokeOpacity"});
        panel.addMorph(m = new SliderMorph(new Rectangle(200, y, 100, 20), 1.0));
        m.connectModel({model: this, getValue: "getStrokeOpacity", setValue: "setStrokeOpacity"});
        y += 30;

        if (this.targetMorph.setTextColor) {
            panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), "Text Color").beLabel());
            panel.addMorph(m = new ColorPickerMorph(new Rectangle(250, y, 50, 30)));
            m.connectModel({model: this, setColor: "setTextColor"});
            y += 40;

            panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Font Family').beLabel());
            panel.addMorph(m = new TextMorph(new Rectangle(150, y, 150, 20)));
            m.connectModel({model: this, getText: "getFontFamily", setText: "setFontFamily"});
            y += 30;

            panel.addMorph(new TextMorph(new Rectangle(50, y, 100, 20), 'Font Size').beLabel());
            panel.addMorph(m = new TextMorph(new Rectangle(150, y, 50, 20)));
            m.connectModel({model: this, getText: "getFontSize", setText: "setFontSize"});
            y += 30;
        }

        var oldBounds = panel.shape.bounds();
        panel.shape.setBounds(oldBounds.withHeight(y + 5 - oldBounds.y))

        panel.morphMenu = function(evt) { 
            var menu = Class.getPrototype(this).morphMenu.call(this, evt);
            menu.addLine();
            menu.addItem(['inspect model', new SimpleInspector(panel.getModel()), "openIn", this.world()]);
            return menu;
        }

        return panel;
    }
    
});

