morphic.world = WorldMorph.create("canvas");
console.log('created world');




// some support for the circles demo
function makeCircleGrid(itemCount) {
    var canvasWidth = morphic.canvas.getWidth();
    var canvasHeight = morphic.canvas.getHeight();
    
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



var rss;
function main() {

 
    if (window.location.query()["rss"]== "true") {
	try {
	    rss = loadRSS(morphic.world, pt(300, 20));
	} catch (e) {
	    console.log('failed to load rss due to: ' + e);
	}
    }
    
    with (morphic) {
        world.addHand(HandMorph.create(true));
	
	world.setColor(Color.lightGray);
	
	if (window.location.query()["world"] == "true") {    
	    var m = Morph.create(Morph, Rectangle.create(40, 20, 50, 50), "rectangle");
	    world.addMorph(m);
	    var rr = Rectangle.create(100, 50, 200, 150);
	    console.log('rectangle is ' + rr.asString());
	    m = Morph.create(Morph, rr, "ellipse");
	    m.setColor(Color.red);
	    
	    world.addMorph(m);
	    //m.addClipRect(Rectangle.create(0,0, 10, 10), "bar");
	    console.log('rectangle ' + Rectangle.create(200, 50, 100, 50) + ' Rectangle ' + Rectangle + "," + Rectangle.prototype);
	    m = Morph.create(Morph, Rectangle.create(200, 50, 100, 50), "rectangle");
	    
	    m.setShape(new Shape("polyline",null,[pt(0,0),pt(70,0),pt(40,30),pt(0,0)],
				 Color.blue,1,Color.black));
	    
	    world.addMorph(m);
	    if (true) {
		var m = TextMorph.create(Rectangle.create(250, 20, 180, 30), "shift-click to add 10 circles");
		
		m.addEventHandler({event: "click", handleEvent: function(evt) { evt.shiftKey && makeCircleGrid(10);}});
		
		world.firstHand().addEventHandler({event: "keydown", handleEvent: function(evt) { console.log('key' + evt.keyCode);}});
		
		
		world.addMorph(m);
	    }

	    var loc = pt(20, 80);
	    var widget = makeLine([loc.addXY(0,15),loc.addXY(70,15)],2,Color.black);
	    world.addMorph(widget);

	}
	// makeCircleGrid(10);
	//m.addClipRect(m.shape.bounds, "foo");
	
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
	    m = Morph.create(Morph, pt(0,0).asRectangle(),"rectangle");
	    m.setShape(new Shape("polyline",null,makeStarVertices(50,pt(0,0),0),Color.yellow,1,Color.black));
	    m.setPosition(pt(100,300));
	    world.addMorph(m);
	    var spinningStar = true;
	    if(spinningStar) {  // Make the star spin as a test of stepping
		m.startSteppingFunction(60,function(msTime) {
			this.setRotation(this.getRotation() + 0.02); }) }
	}
	var showClock = true;
	if (showClock) {
	    var clockWidget = ClockMorph.create(pt(300,300),150);
	    //clockWidget.addClipRect(Rectangle.create(20,20,80,80));
	    world.addMorph(clockWidget);
	    clockWidget.startStepping(1000);
	}

	var clipWidget = ClipMorph.create(Rectangle.create(10, 200, 150, 150));
	world.addMorph(clipWidget);

	/*
	if (true) var handle = window.setInterval(function() {
	
	var t = m.getTransform();
	//console.log('setting it: ' + (t.getRotation() + 0.01));
	m.setRotation(m.getRotation() + 0.02);
	// m.setTransform(new Transform(t.getTranslation(), t.getRotation() + 0.02, t.getScale()));
	// console.log('now ' + m.getTransform().getRotation());
	// if (++ count > 30) window.clearTimeout(handle);
	}, 200);
	*/
	
    }
}


main();
