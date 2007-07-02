morphic.world = WorldMorph.create("canvas");
console.log('created world');




// some support for the circles demo
function makeCircleGrid(itemCount) {
    var canvasWidth = this.canvas().bounds().width;
    var canvasHeight = this.canvas().bounds().height;
    
    var minR = 10, maxR = canvasWidth / 3;
    for (var j = 0; j < itemCount; ++j) {
	var r = getRandSkewed(minR, maxR);
	var cx = getRand(r,  canvasWidth  - r);
	var cy = getRand(r,  canvasHeight - r);
	//console.log([r, cx, cy]);
	
	var aShape  = Morph.create(Morph, Rectangle.create(cx - r, cy - r, 2*r, 2*r), "ellipse");
	aShape.setColor(randColor(true));
	aShape.setBorderColor(randColor(true));
	aShape.setFillOpacity(getRand(0, 1));
	aShape.setBorderWidth(getRand(0, 3));
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

morphic.buildWorld = function(otherWorld, server) {
    morphic.world.addHand(HandMorph.create(true));
    
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
    if(colorPicker) morphic.world.addMorph(ColorPickerMorph.create(canvas.bounds().bottomCenter().subPt(pt(0,50)).extent(pt(50,30)),
								   morphic.world,"setColor",false)) ;	
    var innerWorld = false;
    if (innerWorld) 
	morphic.world.addMorph(LinkMorph.create(morphic.world, null));

    
    var showWidgets = true;
    if (showWidgets) { 
	var panel = Morph.create(Morph, Rectangle.create(580,260,300,200), "rect");
	panel.setColor(Color.blue.lighter().lighter());
	panel.setBorderWidth(2);
	panel.setBorderColor(Color.red);
	panel.model = new Model();
	var m; 
	// Two simple buttons, one toggles...
	panel.addMorph(m = ButtonMorph.create(Rectangle.create(20,20,50,20)));
	m.connect({model: panel.model, value: "buttonValue"});
	panel.addMorph(m = ButtonMorph.create(Rectangle.create(20,50,50,20)));
	m.connect({model: panel.model, value: "buttonValue"});
	m.toggles = true;
	// Two buttons sharing same value...
	panel.addMorph(m = ButtonMorph.create(Rectangle.create(80,20,50,20)));
	m.connect({model: panel.model, value: "buttonValue2"});
	panel.addMorph(m = ButtonMorph.create(Rectangle.create(80,50,50,20)));
	m.connect({model: panel.model, value: "buttonValue2"});
	// Two lists sharing same selection...
	panel.addMorph(m = CheapListMorph.create(Rectangle.create(20,80,50,20),["one","two","three"]));
	m.connect({model: panel.model, selection: "selectedItem"});
	panel.addMorph(m = CheapListMorph.create(Rectangle.create(80,80,50,20),["one","two","three"]));
	m.connect({model: panel.model, selection: "selectedItem"});
	// Three text views sharing same text...
	panel.addMorph(m = TextMorph.create(TextMorph, Rectangle.create(140,20,140,20),"Hello World"));
	m.connect({model: panel.model, text: "sharedText", selection: "textSelection"});
	panel.addMorph(m = TextMorph.create(TextMorph, Rectangle.create(140,50,140,20),"Hello World"));
	m.connect({model: panel.model, text: "sharedText", selection: "textSelection"});
	panel.addMorph(m = TextMorph.create(TextMorph, Rectangle.create(140,80,140,20),"Hello World"));
	m.connect({model: panel.model, text: "sharedText", selection: "textSelection"});
	m.autoAccept = true;
	panel.addMorph(m = TextMorph.create(TextMorph, Rectangle.create(140,110,140,20),"selection"));
	m.connect({model: panel.model, text: "textSelection"});
	panel.addMorph(m = PrintMorph.create(Rectangle.create(20,140,100,20),"3+4"));
	m.connect({model: panel.model, value: "printValue"});
	panel.addMorph(m = PrintMorph.create(Rectangle.create(20,170,100,20),"3+4"));
	m.connect({model: panel.model, value: "printValue"});
	panel.addMorph(m = PrintMorph.create(Rectangle.create(140,140,80,20),"0.5"));
	m.connect({model: panel.model, value: "sliderValue"});
	panel.addMorph(m = PrintMorph.create(Rectangle.create(230,140,50,20),"0.1"));
	m.connect({model: panel.model, value: "sliderExtent"});
	panel.addMorph(m = SliderMorph.create(Rectangle.create(140,170,100,20)));
	m.connect({model: panel.model, value: "sliderValue", extent: "-sliderExtent"});
	// Add a PrintMorph in the world to view the model state
	morphic.world.addMorph(m = PrintMorph.create(Rectangle.create(500,120,300,200),"model"));
	m.connect({model: panel.model, value: "this"});
	morphic.world.addMorph(panel); 
    }
    var showBrowser = false;
    if(showBrowser) { // Good-old three-pane browser...
	var panel = Morph.create(Morph, Rectangle.create(20,20,400,320),"rect");
	panel.setColor(Color.blue.lighter().lighter());
	panel.setBorderWidth(2);
	 	panel.model = new Model();
	 	var m; 
		panel.addMorph(m = new TextMorph(new Rectangle(120,0,200,150),"JavaScript Code Browser"));
			m.wrap = false; m.layoutChanged();;
		panel.addMorph(m = new ListPane(new Rectangle(0,20,200,150)));
			m.connect({model: panel.model, list: "classList", selection: "className"});
		panel.addMorph(m = new ListPane(new Rectangle(200,20,200,150)));
			m.connect({model: panel.model, list: "methodList", selection: "methodName"});
		panel.addMorph(m = new TextPane(new Rectangle(0,170,400,150)));
			m.connect({model: panel.model, text: "methodString", selection: "methodSelection"});
//	Note function components need to get split from function views
//	for now we use a dangling morph as a component.  Later we'll put a component in the model
//	and a view in the model inspector
		m = new FunctionPane(new Rectangle(0,300,400,22),"function() { return Global.classNames() }");
			m.connect({model: panel.model, result: "classList"});
		m = new FunctionPane(new Rectangle(0,322,400,36),"function(className) { return methodNameList(className) }");
			m.connect({model: panel.model, className: "className", result: "methodList"});
		m = new FunctionPane(new Rectangle(0,358,400,50),"function(className,methodName) { return methodString(className,methodName); }");
			m.connect({model: panel.model, className: "className", methodName: "methodName", result: "methodString"});
	 	world.addMorph(panel);
	 	panel.model.changed("initialize");
		// Add a PrintMorph in the world to view the model state
		// world.addMorph(m = new PrintMorph(new Rectangle(500,20,300,200),"model"));
		//	m.connect({model: panel.model, value: "this"});
		zzPanel = panel; }









    
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
    WorldMorph.makeWorld();
    console.log('made world');
    morphic.buildWorld();
    return;
}




main();
