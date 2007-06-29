morphic.world = WorldMorph.create("canvas");
console.log('created world');




// some support for the circles demo
function makeCircleGrid(itemCount) {
    var canvasWidth = morphic.canvas.bounds().width;
    var canvasHeight = morphic.canvas.bounds().height;
    
    var minR = 10, maxR = canvasWidth / 3;
    for (var j = 0; j < itemCount; ++j) {
	var r = getRandSkewed(minR, maxR);
	var cx = getRand(r,  canvasWidth  - r);
	var cy = getRand(r,  canvasHeight - r);
	//console.log([r, cx, cy]);
	
	var aShape  = Morph.create(Morph, Rectangle.create(cx - r, cy - r, 2*r, 2*r), "ellipse");
	aShape.setColor(randColor(true));
	aShape.shape.setBorderColor(randColor(true));
	aShape.shape.setFillOpacity(getRand(0, 1));
	aShape.shape.setBorderWidth(getRand(0, 3));
	aShape.fullRadius = r + aShape.shape.getBorderWidth();
	
	morphic.world.addMorph(aShape);
	aShape.vector = Point.polar(15, getRand(0, Math.PI *2));
	aShape.startSteppingFunction(30,function(msTime) {
		// var pt = this.getTranslation();
		this.translateBy(this.vector);
		var worldpt = this.origin;
		if ((worldpt.x - this.fullRadius < 0) || (worldpt.x + this.fullRadius > canvasWidth)) {
		    this.vector.x = -this.vector.x;
		}
		if ((worldpt.y - this.fullRadius < 0) || (worldpt.y + this.fullRadius > canvasHeight))
		    this.vector.y = - this.vector.y;


		//this.translateBy(pt.x + 10, pt.y + 10); 
	    });
	//console.log('added ' + aShape.shape);
	//dojo.html.setClass(aShape.getEventSource(), "movable");
    }
}
function getRand(from, to){
    return Math.random() * (to - from) + from;
}

function getRandSkewed(from, to)
{
    // let skew stats to smaller values
    
    var seed = 0;
    for(var i = 0; i < getRandSkewed.skew_stat_factor; ++i){
	seed += Math.random();
    }
    seed = 2 * Math.abs(seed / getRandSkewed.skew_stat_factor - 0.5);
    
    return seed * (to - from) + from;
}
getRandSkewed.skew_stat_factor = 15;

function randColor(alpha)
{
    var red   = getRand(0, 1);
    var green = getRand(0, 1);
    var blue  = getRand(0, 1);
    var opacity = 1;
    var color = new Color(red, green, blue);
    return color;
    
}

var Global = this;

Object.prototype.functionNames = function() {
    var functionNames = [];
    for (var name in this) { 
	try {
	    if (this[name] instanceof Function) 
		functionNames.push(name); 
	} catch (er) {
	    // FF can throw an exception here ...
	}
    }
    return functionNames;//.sort(); 
};

Object.prototype.listClassNames = function() {
    var a = [];
    for (var name in this) {
	if (!this[name] || !this[name].prototype)
	    continue;
	if (name.indexOf("SVG") == 0) 
	    continue; // skip the SVGs
	try {
	    if ((this[name] instanceof Function) 
		&& (this[name].prototype.functionNames().length > Object.prototype.functionNames().length)) {
		a.push(name); 
	    }
	} catch (er) {
	    // FF can throw an exception here
	}

    }
    a.push("Object", "Global"); // a few others of note
    // console.log('found array ' + a.sort());
    return a;//.sort(); 
};

Object.prototype.localFunctionNames = function() {
    var sup;
    if (this.constructor == null || this.constructor.superConstructor == null) {
	sup = (this === Object.prototype) ? null : Object.prototype; 
    } else; // FIXME  
    //sup = this.constructor.superConstructor.prototype;
    var superNames = (sup == null) ? [] : sup.functionNames();
    var localNames = [];
    for (var name in this) {
	if (this[name] instanceof Function) {
	    if (name.indexOf("SVG") == 0) 
		continue;
	    if (!(superNames.indexOf(name) >= 0) || this[name] !== sup[name]) 
		localNames.push(name);
	} 
    }
    return localNames;//.sort(); 
};

Array.prototype.copyWithoutAll = function(otherArray) {
    return this.filter(function(x) { return otherArray.indexOf(x) < 0 });
};

morphic.makeWorld = function() { // set up a world with morphs to copy
	// var zzHand, zzRect, zzEll, zzLine, zzPoly, zzText, zzScript;  //comment to make these global for debugging access
    var w = morphic.world;
    w.addHand(HandMorph.create(true));
    w.setColor(Color.gray);
    var colors = Color.wheel(4);
    var loc = pt(30,450); 
    var widgetExtent = pt(70, 30);
    var dy = pt(0,50); 
    var dx = pt(120,0);
    widget = Morph.create(Morph, loc.extent(widgetExtent), "rect");			// rectangle
    widget.setColor(colors[0]);
    w.addMorph(widget);
    zzRect = widget;
    widget = Morph.create(Morph, loc.addPt(dx).extent(widgetExtent), "ellipse");	// ellipse
    widget.setColor(colors[1]);
    w.addMorph(widget);
    zzEll = widget;
    loc = loc.addPt(dy);
    widget = Morph.makeLine([loc.addXY(0,15),loc.addXY(70,15)], 2, Color.black);
    w.addMorph(widget);
    zzLine = widget;
    var l2 = loc.addPt(dx);
    widget = Morph.create(Morph, l2.asRectangle(),"rect");					// polygon
    widget.setShape(PolygonShape.create([pt(0,0),pt(70,0),pt(40,30),pt(0,0)],
					 colors[2],1,Color.black));
    w.addMorph(widget);
    zzPoly = widget;
    loc = loc.addPt(dy);
    var showBigText = true;
    if(showBigText) {
	widget = TextMorph.create(TextMorph, loc.extent(pt(100,50)),"Big Text");		// big text
	widget.setFontSize(20);
	w.addMorph(widget);
	zzText = widget;
	widget = TextMorph.create(TextMorph, loc.addPt(dx).extent(pt(140,50)),"Unbordered");	// unbordered text
	widget.setFontSize(20);  widget.setBorderWidth(0);  widget.setColor(null);
	w.addMorph(widget); }
    var showPenScript = true;
    if(showPenScript) {  // Make a script pane to try stuff out
	widget = TextMorph.create(TextMorph, pt(50,30).extent(pt(250,50)), Pen.script);
	widget.align(widget.bounds().bottomRight(), w.bounds().topRight().addPt(pt(-50,100))); 
	w.addMorph(widget);
	zzScript = widget; 
    }
    return w; 
};

morphic.buildWorld = function(otherWorld, server) {
    var widget; 
    // zzHand = world.worldState.hands[0];
    var showBitmap = false;
    if(showBitmap) { 
	var width = 800;
	var height = 500;
	var url = "http://maps.google.com/mapdata?"+
	    "Point=b&Point.latitude_e6=61500000&Point.longitude_e6=-3191200000&Point.iconid=15&"+
	    "Point=e&Point=b&Point.latitude_e6=61500000&Point.longitude_e6=-3191200600&Point.iconid=16&"+
	    "Point=e&latitude_e6=61500000&longitude_e6=-3191200000&zm=8000&w=" +
	    width + "&h=" + height + "&cc=US&min_priority=2";
	morphic.world.addMorphBack(new PixmapMorph(url, new Rectangle(50, 10, width, height)));
	var checkurl = "file:Applications/ScriptBrowserDemo/src/widget/templates/check.gif";
	morphic.world.addMorphBack(new PixmapMorph(checkurl, new Rectangle(20, 20, 16*3, 16)));
	
	//world.addMorph(new PixmapMorph('file:Applications/Canvascape/sky.jpg', new Rectangle(50, 50, 500, 150)));
    }
    var showBrowseMenu = true;
    if (showBrowseMenu) {  // Make a stay-up menu
	var classNames = Global.listClassNames();
	// console.log('found classes ' + classNames);
	// Function to o methodPane
	var showMethodPane = function(item, sourceMenu) {
	    var theClass = item[3];
	    var className = item[4];
	    var methodName = item[0];
	    var code = (className == "Global") ? Global[methodName].toString()
	    : theClass.prototype[methodName].toString();
	    if(className != "Global" && methodName != "constructor") {
		code = className + ".prototype." + methodName + " = " + code; }
	    var codePane = TextMorph.create(TextMorph, sourceMenu.position().extent(pt(350,50)),code);
	    sourceMenu.parentMenu.spawnee = codePane; // so it can be removed
	    morphic.world.addMorph(codePane); 
	}
	// Function to show the method names
	var showMethodNameMenu = function(item,sourceMenu) {
	    

	    if (sourceMenu.spawnee != null) sourceMenu.spawnee.remove();
	    var name = item[0];
	    var theClass = Global[name];
	    var fns = (name == "Global") ? Global.functionNames().copyWithoutAll(classNames)
	    : theClass.prototype.localFunctionNames();

	    var fnList = fns.map(function(each) { return [each, this, showMethodPane, theClass, name]});

	    var menu = CheapMenuMorph.create(sourceMenu.bounds().topRight().addXY(0,1), fnList);
	    sourceMenu.spawnee = menu; // so it can be removed
	    menu.parentMenu = sourceMenu;
	    //console.log('started at ' + new Date());
	    morphic.world.addMorph(menu); 
	    //console.log('finished at ' + new Date());
	}
	var items = classNames.map(function(each) { return [each, this, showMethodNameMenu]});
	widget = CheapMenuMorph.create(pt(30,20), items);
	widget.stayUp = true; // keep on screen
	morphic.world.addMorph(widget); 
    }
    
    var showStar = true;
    if(showStar) {  // Make a star
	var makeStarVertices = function(r,center,startAngle) {
	    var vertices = [];
	    var nVerts = 10;
	    for(var i=0; i<=nVerts; i++) {
		var a = startAngle + (2*Math.PI/nVerts*i);
		var p = Point.polar(r,a);
		if(i%2 == 0) p = p.scaleBy(0.39);
		vertices.push(p.addPt(center)); }
	    return vertices; }
	widget = Morph.create(Morph, pt(0,0).asRectangle(), "rect");
	widget.setShape(PolygonShape.create(makeStarVertices(50,pt(0,0),0),Color.yellow,1,Color.black));
	widget.setPosition(pt(300,400));
	morphic.world.addMorph(widget);
	var spinningStar = true;
	if(spinningStar) {  // Make the star spin as a test of stepping
	    widget.startSteppingFunction(60, function(msTime) {
		    this.setRotation(this.getRotation() + 0.02); }) }
    }
    var showClock = true;
    if (showClock) {
	widget  = ClockMorph.create(pt(500,460),50);
	//clockWidget.addClipRect(Rectangle.create(20,20,80,80));
	morphic.world.addMorph(widget);
	widget.startStepping(1000);
    }
    
    var clipWidget = ClipMorph.create(Rectangle.create(500, 200, 150, 150));
    morphic.world.addMorph(clipWidget);
    
    
    var canvasTest = false;
    if(canvasTest) { // canvas test -- doesn't work any more :-(
	widget = new Morph(new Rectangle(20, 20, 100, 100), "rectangle");	
	var b = widget.bounds();
	println("b rect = " + [b.x, b.y, b.width, b.height]);
	widget.clippingCanvas = canvas.primCanvas.createClippingCanvas(b.x, b.y, b.width, b.height);
	widget.clippingCanvas.fillRect(new Rectangle(10, 10, 80, 80), Color.blue);
	widget.clippingCanvas.fillEllipse(new Rectangle(20, 20, 60, 60), Color.red);
	// dojo.mixin(widget, { drawOn: function(canvas, rect) { this.clippingCanvas.render();}  });
	widget.drawOn = function(canvas) { this.clippingCanvas.render();} 
	widget.mouseDown = function(evt) {
	    this.moveBy(pt(10, 10));
	    this.clippingCanvas.setOrigin(this.shape.bounds.x, this.shape.bounds.y); };
	morphic.world.addMorph(widget); 
    }

    var colorPicker = false;
    if(colorPicker) morphic.world.addMorph(new ColorPickerMorph(canvas.bounds.bottomCenter().subPt(pt(0,50)).extent(pt(50,30)),
							world,"setColor",false)) ;	
    // if(innerWorld) world.addMorph(new LinkMorph(otherWorld));
    
    var slideWorld = false;
    if(slideWorld) { // Make a slide for "turning web programming upside down"
		var lm = new LinkMorph(null);
		var morphs = lm.myWorld.submorphs.slice(0);
		for(var i=0; i<morphs.length; i++) { // delete all but return link
			var m = morphs[i];
			if(m.className() != "LinkMorph") m.remove(); }
		lm.setPosition(lm.position().addXY(65,0));
		var loc = pt(100,300);
		var captions = ["               JavaScript","            Widget World","     HTML, DOM, CSS, ETC...","                Browser","   bios:  Network,  Graphics"];
		for(var i=0; i<captions.length; i++) { // add boxed text
			var txt = new TextMorph(loc.extent(pt(300,50)),captions[i]);
			txt.setFontSize(20);
			txt.setColor(Color.hsb(70*i,0.7,0.8));
			loc = loc.addXY(0,33);
			lm.myWorld.addMorph(txt); }
		morphic.world.addMorph(lm); }
	return morphic.world;
}


var rss;
function main() {
    
    if (window.location.query()["rss"]== "true") {
	try {
	    rss = loadRSS(morphic.world, pt(300, 20));
	} catch (e) {
	    console.log('failed to load rss due to: ' + e);
	}
    }
    morphic.makeWorld();
    console.log('made world');
    morphic.buildWorld();
    return;
}




main();
