


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
	
	var aShape  = Morph(Rectangle(cx - r, cy - r, 2*r, 2*r), "ellipse");
	aShape.setFill(randColor(true));
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

morphic.buildWorld = function(otherWorld, server) {
    morphic.world.addHand(HandMorph(true));
    morphic.world.hands.each(function(hand) { morphic.canvas.appendChild(hand); }.bind(this));

    console.log('added hand ' + morphic.world.firstHand().inspect());
    var widget; 
    // zzHand = world.worldState.hands[0];
    var showBrowseMenu = false;
    if (showBrowseMenu) {  // Make a stay-up menu
	var classNames = Global.listClassNames("SVG");
	// console.log('found classes ' + classNames);
	// Function to o methodPane
	var showMethodPane = function(item, sourceMenu) {
	    var theClass = item[3];
	    var className = item[4];
	    var methodName = item[0];
	    var code = (className == "Global") ? Global.constructor[methodName].toString()
	    : theClass.prototype[methodName].toString();
	    if (className != "Global" && methodName != "constructor") {
		code = className + ".prototype." + methodName + " = " + code; 
	    }
	    var codePane = TextMorph(sourceMenu.position().extent(pt(350,50)),code);
	    sourceMenu.parentMenu.spawnee = codePane; // so it can be removed
	    morphic.world.addMorph(codePane); 
	}
	// Function to show the method names
	var showMethodNameMenu = function(item,sourceMenu) {
	    if (sourceMenu.spawnee != null) sourceMenu.spawnee.remove();
	    var name = item[0];
	    var theClass = Global[name];
	    var fns = (name == "Global") ? Global.constructor.functionNames().without(classNames)
	    : theClass.localFunctionNames();

	    var fnList = fns.map(function(each) { return [each, this, showMethodPane, theClass, name]}, this);

	    var menu = CheapMenuMorph(sourceMenu.bounds().topRight().addXY(0,1), fnList);
	    sourceMenu.spawnee = menu; // so it can be removed
	    menu.parentMenu = sourceMenu;
	    morphic.world.addMorph(menu); 
	}
	var items =  classNames.map(function(each) { return [each, this, showMethodNameMenu]}, this);
	widget = CheapMenuMorph(pt(30,20), items);
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
	widget = Morph(pt(0,0).asRectangle(), "rect");
	widget.setShape(PolygonShape.create(makeStarVertices(50,pt(0,0),0),Color.yellow,1,Color.black));
	//makeGradient(Color.yellow, Color.yellow.lighter().lighter()));
	widget.setPosition(pt(300,400));
	morphic.world.addMorph(widget);
	var spinningStar = true;
	if(spinningStar) {  // Make the star spin as a test of stepping
	    widget.startSteppingFunction(60, function(msTime) {
		    this.setRotation(this.getRotation() + 0.02); }) }
    }
    var showClock = true;
    if (showClock) {
	widget  = ClockMorph(pt(500,460),50);
	//clockWidget.addClipRect(Rectangle(20,20,80,80));
	morphic.world.addMorph(widget);
	widget.startStepping(1000);
	}
    
    if (false) {
	var clipWidget = ClipMorph(Rectangle(500, 200, 150, 150));
    	morphic.world.addMorph(clipWidget);
    }
    
    var colorPicker = false;
    if(colorPicker) morphic.world.addMorph(ColorPickerMorph(canvas.bounds().bottomCenter().subPt(pt(0,50)).extent(pt(50,30)),
							    morphic.world,"setFill",false)) ;	
    var innerWorld = true;
    if (innerWorld) {
	morphic.world.addMorph(widget = LinkMorph(null, pt(260, 460)));

	var showBitmap = true;
	if(showBitmap) { 
	    var width = 800;
	    var height = 500;
	    var url = "http://maps.google.com/mapdata?"+
		"Point=b&Point.latitude_e6=61500000&Point.longitude_e6=-3191200000&Point.iconid=15&"+
		"Point=e&Point=b&Point.latitude_e6=61500000&Point.longitude_e6=-3191200600&Point.iconid=16&"+
		"Point=e&latitude_e6=61500000&longitude_e6=-3191200000&zm=8000&w=" +
		width + "&h=" + height + "&cc=US&min_priority=2";
	    widget.myWorld.addMorphBack(PixmapMorph(Rectangle(50, 10, width, height), url));
	}
	
    }
    
    var showWidgets = true;
    if (showWidgets) { 
	var panel = Morph(Rectangle(600,300,300,200), "rect");
	//panel.setFill(Color.blue.lighter().lighter());

	panel.setFill(StipplePattern.create(Color.blue.lighter().lighter(), 4, Color.gray.lighter(), 1));

	panel.setBorderWidth(2);
	panel.setBorderColor(Color.red);
	panel.model = new Model();
	var m; 
	// Two simple buttons, one toggles...
	panel.addMorph(m = ButtonMorph(Rectangle(20,20,50,20)));
	m.connect({model: panel.model, value: "buttonValue"});
	panel.addMorph(m = ButtonMorph(Rectangle(20,50,50,20)));
	m.connect({model: panel.model, value: "buttonValue"});
	m.toggles = true;
	// Two buttons sharing same value...
	panel.addMorph(m = ButtonMorph(Rectangle(80,20,50,20)));
	m.connect({model: panel.model, value: "buttonValue2"});
	panel.addMorph(m = ButtonMorph(Rectangle(80,50,50,20)));
	m.connect({model: panel.model, value: "buttonValue2"});
	// Two lists sharing same selection...
	panel.addMorph(m = CheapListMorph(Rectangle(20,80,50,20),["one","two","three"]));
	m.connect({model: panel.model, selection: "selectedItem"});
	panel.addMorph(m = CheapListMorph(Rectangle(80,80,50,20),["one","two","three"]));
	m.connect({model: panel.model, selection: "selectedItem"});
	// Three text views sharing same text...
	panel.addMorph(m = TextMorph(Rectangle(140,20,140,20),"Hello World"));
	m.connect({model: panel.model, text: "sharedText", selection: "textSelection"});
	panel.addMorph(m = TextMorph(Rectangle(140,50,140,20),"Hello World"));
	m.connect({model: panel.model, text: "sharedText", selection: "textSelection"});
	panel.addMorph(m = TextMorph(Rectangle(140,80,140,20),"Hello World"));
	m.connect({model: panel.model, text: "sharedText", selection: "textSelection"});
	m.autoAccept = true;
	panel.addMorph(m = TextMorph(Rectangle(140,110,140,20),"selection"));
	m.connect({model: panel.model, text: "textSelection"});
	panel.addMorph(m = PrintMorph(Rectangle(20,140,100,20),"3+4"));
	m.connect({model: panel.model, value: "printValue"});
	panel.addMorph(m = PrintMorph(Rectangle(20,170,100,20),"3+4"));
	m.connect({model: panel.model, value: "printValue"});
	panel.addMorph(m = PrintMorph(Rectangle(140,140,80,20),"0.5"));
	m.connect({model: panel.model, value: "sliderValue"});
	panel.addMorph(m = PrintMorph(Rectangle(230,140,50,20),"0.1"));
	m.connect({model: panel.model, value: "sliderExtent"});
	panel.addMorph(m = SliderMorph(Rectangle(140,170,100,20)));
	m.connect({model: panel.model, value: "sliderValue", extent: "-sliderExtent"});
	// Add a PrintMorph in the world to view the model state
	morphic.world.addMorph(m = PrintMorph(Rectangle(600,140,300,200),"model"));
	m.connect({model: panel.model, value: "this"});
	morphic.world.addMorph(panel); 
    }
    var showBrowser = true;
    if(showBrowser) { // Good-old three-pane browser...
	var panel = Morph(Rectangle(20,20,400,320), "rect");
	panel.setFill(Color.blue.lighter().lighter());
	panel.setBorderWidth(2);
	panel.model = new Model();
	var titleBar = Morph(Rectangle(0,0,400,20), "rect");
	titleBar.setFill(LinearGradient.makeGradient(Color.blue.lighter(), Color.blue.lighter().lighter().lighter()));
	panel.addMorph(titleBar);
	titleBar.handlesMouseDown = function(evt) {return true};  // hack for now
	titleBar.ignoreEvents();
	var m = TextMorph(Rectangle(0,0,160,150), "JavaScript Code Browser");
	titleBar.addMorph(m);
	m.setFill(null);  m.setBorderWidth(0);  m.ignoreEvents();
	m.wrap="shrinkWrap";  m.layoutChanged();
	m.align(m.bounds().topCenter(), titleBar.shape.bounds().topCenter());
	    
	panel.addMorph(m = ListPane(Rectangle(0,20,200,150)));
	m.connect({model: panel.model, list: "classList", selection: "className"});
	panel.addMorph(m = ListPane(Rectangle(200,20,200,150)));
	m.connect({model: panel.model, list: "methodList", selection: "methodName"});
	panel.addMorph(m = TextPane(Rectangle(0,170,400,150)));
	m.connect({model: panel.model, text: "methodString", selection: "methodSelection"});
	//	Note function components need to get split from function views
	//	for now we use a dangling morph as a component.  Later we'll put a component in the model
	//	and a view in the model inspector
	m = FunctionPane(Rectangle(0,300,400,22), "function() { return Global.listClassNames('SVG') }");
	m.connect({model: panel.model, result: "classList"});
	m = FunctionPane(Rectangle(0,322,400,36), "function(className) {" +
"	    var theClass = Global[className];" +
"	    return (className == 'Global') ? Global.constructor.functionNames().without(classNames)" +
"	    	: theClass.localFunctionNames(); }");
	m.connect({model: panel.model, className: "className", result: "methodList"});
	m = FunctionPane(Rectangle(0,358,400,50), "function(className,methodName) { return Function.methodString(className,methodName); }");
	m.connect({model: panel.model, className: "className", methodName: "methodName", result: "methodString"});
	
	morphic.world.addMorph(panel);
	panel.model.changed("initialize");
	// Add a PrintMorph in the world to view the model state
	// morphic.world.addMorph(m = PrintMorph(Rectangle(500,20,300,200), "model"));
	// m.connect({model: panel.model, value: "this"});
	zzPanel = panel; 
    }
    
    var slideWorld = true;
    if(slideWorld) { // Make a slide for "turning web programming upside down"
	var lm = LinkMorph(null, pt(260, 520));

	// KP: note that element deletion interferes with iteration, so
	// we make an array first and then remove 
	lm.myWorld.submorphs().toArray().each(function(m) { 
		if (m instanceof LinkMorph) 
		    return;
		m.remove(); 
	    });
	// lm.setPosition(lm.position().addXY(65,0));
	var loc = pt(100, 200);
	var captions = ["               JavaScript","            Widget World","     HTML, DOM, CSS, ETC...","                Browser","   bios:  Network,  Graphics"];
	for (var i = 0; i < captions.length; i++) { // add boxed text
	    var txt = TextMorph(loc.extent(pt(300,50)), captions[i]);
	    txt.setFontSize(20);
	    txt.setFill(Color.hsb(70*i,0.7,0.8));
	    loc = loc.addXY(0,33);
	    lm.myWorld.addMorph(txt); 
	}
	morphic.world.addMorph(lm); 
    }
    return morphic.world;
}


var rss;
function main() {
    morphic.world = WorldMorph.createPrototypeWorld();
    morphic.world.displayWorldOn(morphic.canvas);
    if (window.location.query()["rss"]== "true") {
	try {
	    rss = loadRSS(morphic.world, pt(300, 20));
	} catch (e) {
	    console.log('failed to load rss due to: ' + e);
	}
    }

    console.log('made world');
    morphic.buildWorld();
    return;
}

main();

function extra() {

    var model = new Model();
    
    var m = ButtonMorph(morphic.world.bounds().rightCenter().subPt(pt(300, 0)).extent(pt(250, 20)));
    m.connect({model: model, value: "active"});
    m.toggles = true;
    morphic.world.addMorph(m);

    // before advice
    var oldAddMorph = HandMorph.prototype.addMorph;
    HandMorph.prototype.addMorph = function(m) {
	if (this.grabbedMorphPin != null) {
	    this.grabbedMorphPin.write(m);
    	}
	return oldAddMorph.call(this, m);
    };

    // before advice
    var oldRemoveMorph = HandMorph.prototype.removeMorph;
    HandMorph.prototype.removeMorph = function(m) {
	if (this.grabbedMorphPin != null) {
	    this.grabbedMorphPin.write(null);
    	}
	return oldRemoveMorph.call(this, m);
    };

    morphic.world.firstHand().connect({model: model, grabbedMorph: 'grabbedMorph'});
    var serializer = function(active, grabbedMorph) { 
	if (!active) 
	    return "toggle button for an XML dump of the grabbed morph";
	console.log('grabbed morph is ' + grabbedMorph); 
	if (grabbedMorph.hasSubmorphs()) 
	    return "not serializing complex morph " + grabbedMorph.inspect() + " to avoid mayhem";
	return new XMLSerializer().serializeToString(grabbedMorph); 
    };
    
    var evaluator = FunctionPane(m.bounds().bottomLeft().extent(pt(9999, 9999)), serializer.toString());
    evaluator.connect({model: model, active: "active", grabbedMorph: 'grabbedMorph', result: "serializedMorph"});
    
    m = TextMorph(m.bounds().bottomLeft().extent(pt(250, 300)), "toggle button for an XML dump of the grabbed morph");

    m.connect({model: model, text: "serializedMorph"});
    
    morphic.world.addMorph(m);

};
//   extra();

/*
	    TextMorph.prototype.profiler("start");
	    var stats = TextMorph.prototype.profiler("ticks");
	    	    TextMorph.prototype.profiler("stop");
	    for (var field in stats) {
		if (stats[field] instanceof Function) 
		    continue;
		if (stats[field] == 0)
		    continue;
		console.info('stat: ' + field + " = " + stats[field]);
	    	}
*/

function showStatsViewer(profilee,ticksOrTallies) {
	profilee.profiler("start");
	var m = ButtonMorph(morphic.world.bounds().topCenter().addXY(0,20).extent(pt(150, 20)));
    	m.connect({model: m, value: ["getValue", "setValue"]});
	m.setValue = function(newValue) {this.onState = newValue;
					 if(newValue == false) { // on mouseup...
			if(this.statsMorph == null) {
				this.statsMorph = TextMorph(this.bounds().bottomLeft().extent(pt(200,20)), "no text");
				morphic.world.addMorph(this.statsMorph); }
			var stats = profilee.profiler(ticksOrTallies);
			var statsText = "";
			for (var field in stats) {
				if (stats[field] instanceof Function) continue;
				if (stats[field] == 0) continue;
				statsText += (ticksOrTallies + ': ' + field + " = " + stats[field] + "\n");
	    			}
			this.statsMorph.setTextString(statsText);
			profilee.profiler("reset"); } }
	m.getValue = function() {return (this. onState == null) ? false : this. onState};
	morphic.world.addMorph(m);
	t = TextMorph(pt(0,0).extent(m.bounds().extent()), 'Display and reset stats');
	t.ignoreEvents();  t.setFill(null); t.setBorderWidth(0);
	m.addMorph(t);
	};
  showStatsViewer(TextMorph.prototype,"ticks");