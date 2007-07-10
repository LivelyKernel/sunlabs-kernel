CheapListMorph = HostClass.create('CheapListMorph', TextMorph);
CheapListMorph.construct = function(initialBounds, itemList) {
//	itemList is an array of strings
//	Note:  A proper ListMorph is a list of independent submorphs
//	CheapListMorphs simply leverage off Textmorph's ability to display
// 	multiline paragraphs, though some effort is made to use a similar interface.
	var listText = (itemList == null) ? "" : itemList.join("\n");
	var m = CheapListMorph.superconstruct(this, initialBounds, listText);
	m.wrap = "noWrap";
	m.itemList = itemList;
	// this default pin may get overwritten by, eg, connect()...
	m.selectionPin = new Pin(m, new Model(m), "mySelection");
	m.listPin = new Pin(m, m.selectionPin.model, "myList");
	m.layoutChanged();
	m.setBorderColor(Color.blue); 
	return m;
};
CheapListMorph.prototype.takesKeyboardFocus = function() { 
    return false;
};
CheapListMorph.prototype.mouseDown = function(evt) {
    evt.hand.setMouseFocus(this);
    this.selectLineAt(this.charOfPoint(this.localize(evt.mousePoint))); 
};
CheapListMorph.prototype.mouseMoved = function(evt) {  
    if (!evt.mouseButtonPressed) return;
    var mp = this.localize(evt.mousePoint);
    if (!this.shape.bounds().containsPoint(mp)) 
	this.selectLineAt(-1);
    else this.selectLineAt(this.charOfPoint(mp)); 
};
CheapListMorph.prototype.mouseUp = function(evt) {
	evt.hand.setMouseFocus(null);
	if (this.hasNullSelection()) return this.selectionPin.write(null);
	var lineNo = this.lineNo(this.ensureTextBox().getBounds(this.selectionRange[0]));
	this.selectionPin.write(this.itemList[lineNo]); 
};
CheapListMorph.prototype.drawSelection = function() {
	if (this.hasNullSelection()) return;
	CheapListMorph.superClass.drawSelection.call(this); 
};
CheapListMorph.prototype.selectLineAt = function(charIx) {  
	this.selectionRange = (charIx == -1) ? [0,-1] : TextMorph.selectWord(this.textString, charIx);
	this.changed(); 
};
CheapListMorph.prototype.lineRect = function(r) { //Menu selection displays full width
    var bounds = this.shape.bounds();
    return CheapListMorph.superClass.lineRect.call(this, Rectangle.create(bounds.x, r.y, bounds.width, r.height)); 
};
CheapListMorph.prototype.updateList = function(newList) {
    this.itemList = newList;
    var listText = (this.itemList == null) ? "" : this.itemList.join("\n");
console.log('***updateList');
    this.updateTextString(listText); 
};

CheapListMorph.prototype.setSelectionToMatch = function(item) {
    var lineStart = -1; 
    var firstChar = 0;
    for (var i = 0; i < this.itemList.length; i++) {
	if (this.itemList[i] == item) {
	    lineStart = firstChar; 
	    break; }
	firstChar += this.itemList[i].length + 1; }
    this.selectLineAt(lineStart); 
};

CheapListMorph.prototype.updateView = function(aspect, controller) {
    if (aspect == this.listPin.varName) {
	this.updateList(this.listPin.read());
    }
    if (aspect == this.selectionPin.varName) 
	this.setSelectionToMatch(this.selectionPin.read()); 
};


//	Basic theory of widgets...
//	A widget is a view/controller, and it views some aspect of a model
//	Viewing is by way of Pins which use MVC-style variable viewing,
//	Each has an "aspect" for for inducing and responding to model changes
//	The idea is that the parent morph has a model for the MVC relationships
//	with the various widgets embedded in it.
//	There are also MessagePins that simply send getter/setter messages

//	A widget comes with a model pointer and a property name for each property
//		that it controls.  The model pointer is typically automatically set to
//		the widget's owner, but it can be pointed at other objects, and even at itself
//		for testing or, eg, for isolated text editing or presentation.

//	Browser example...
//	Add a list to a panel
//		adds a submorph as usual
//		adds properties "part1List", "part1Selection"
//		list1.getList(target) = { classNames(); }
//		list1.setSelection(selection) = { owner.setModelProperty("className",selection,this); }
//	Add second list
//		part2.getList = global[part1.selection].methodNames()
//	if change first selection, how propagate?
//		owner.setModelProperty("selectedClass")
//	ex: setSelectorName
//		sets the name, also triggers update of aspect

function Model(dep) { // An MVC-style model.
    //Broadcasts an update message to all dependents when a value changes.
    this.dependents = (dep != null) ? [dep] : []; 
};
Model.prototype.addDependent = function (dep) { 
    this.dependents.push(dep); 
};
Model.prototype.removeDependent = function (dep) {
    var ix = this.dependents.indexOf(dep);
    if(ix < 0) return;
    this.dependents.splice(ix, 1); 
};
Model.prototype.set = function (varName,newValue,source) {
	this[varName] = newValue;
	this.changed(varName, source); 
};
Model.prototype.changed = function(varName,source) {
	// If source is given, we don't update the source of the change
	// If varName is not given, then null will be the aspect of the updateView()
    for (var i = 0; i < this.dependents.length; i++) {
	if (source != this.dependents[i]) 
	    this.dependents[i].updateView(varName, source); 
    } 
};
Model.prototype.toString = function() {
    var str = "";
    for (var name in this) {
	if (!(this[name] instanceof Function) && (name != "dependents")) 
	    str += name + ": " + this[name] + "\n";
    }
    return str; 
}
 
function Pin(component, model, varName, initialValue) { // A Fabrik-style variable interface
	this.component = component; // the component that will be the source for writes
	this.model = model;  // the model toand from which reads and writes will pass
	this.varName = varName;  // the variable in the model to which this pin is wired
	this.reads = true;
	this.writes = true; // R/W by default
	if (this.varName[0] == "+") {
	    this.varName = this.varName.substring(1); 
	    this.reads = false; 
	}
	if (this.varName[0] == "-") {
	    this.varName = this.varName.substring(1); 
	    this.writes = false; 
	}
	if (initialValue != null) // KP: what if it's undefined?
	    this.write(initialValue); 
};

Pin.prototype.toString = function() {
    return "Pin(" + this.varName + ")";
};

Pin.prototype.read = function (nullValue) {
	var val = (this.reads) ? this.model[this.varName] : null;
	if (this.varName == "this") 
	    val = this.model; // temp hack for model viewer
	return (val == null) ? nullValue : val; 
}
Pin.prototype.write = function (newValue) { 
    // console.log('Pin.write varName: ' + this.varName /* + " newValue: " + newValue.asString() */);
    if (this.writes) 
	this.model.set(this.varName, newValue, this.component); 
}

function MessagePort(component,model,readName,writeName) { // A more flexible message interface
	// Note that widgets can be used with either Fabrik-style variable wiring, or O-O style messages
	this.component = component; // the component that will be the source for writes
	this.model = model;  // the model toand from which reads and writes will pass
	this.readName = readName;
	this.writeName = writeName; 
	this.read = function () { 
	    return (this.readName != null) ? this.model[this.readName].call(this.model) : null; 
	};
	this.write = function (newValue) { 
	    if (this.writeName != null) this.model[this.writeName].call(this.model, newValue); 
	};
};

// Morph model category
Morph.prototype.connect = function(plugSpec) {
    var model = plugSpec.model;
    var mvc = false;
    for (var prop in plugSpec)  {
	if (prop != "model" && plugSpec.hasOwnProperty(prop)) {
	    var portSpec = plugSpec[prop];
	    if (portSpec  instanceof Array) {
		this[prop + "Pin"] = new MessagePort(this, model, portSpec[0], portSpec[1]); 
	    } else {
		// console.log("pin " + portSpec); 
		this[prop + "Pin"] = new Pin(this, model, portSpec); 
		mvc = true; 
	    } 
	}
    }
    if(mvc) 
	model.addDependent(this); 
};
Morph.prototype.updateView = function(aspect, controller) { };


ButtonMorph = HostClass.create('ButtonMorph', Morph);
ButtonMorph.construct = function(initialBounds) {
    // A ButtonMorph is the simplest widget
    // It read and writes the boolean variable, this.model[this.propertyName]
    
    var m = ButtonMorph.superconstruct(this, initialBounds, "rect");
    m.toggles = false; // if true each push toggles the model state
    m.setGradient(LinearGradient.makeGradient(m.baseColor = Color.gray.darker(), m.baseColor.lighter(), LinearGradient.SouthNorth));
    m.setBorderWidth(0.3);
    m.setBorderColor(m.baseColor);
    m.shape.roundEdgesBy(4);
    // this default pin may get overwritten by, eg, connect()...
    m.valuePin = new Pin(m, new Model(m), "myValue"); 
    return m;
};


ButtonMorph.prototype.handlesMouseDown = function(evt) { return true }
ButtonMorph.prototype.mouseDown = function(evt) {
	if(!this.toggles) {this.valuePin.write(true); this.showColorFor(true); } }
ButtonMorph.prototype.mouseMoved = function(evt) { }
ButtonMorph.prototype.mouseUp = function(evt) {
	var newValue = this.toggles ? !this.valuePin.read() : false;
	this.valuePin.write(newValue); this.showColorFor(newValue); }
ButtonMorph.prototype.showColorFor = function(value) {
    var base = value ? this.baseColor.lighter() : this.baseColor;
    this.setGradient(LinearGradient.makeGradient(base, base.lighter(), LinearGradient.SouthNorth));
}
ButtonMorph.prototype.updateView = function(aspect,controller) {
    if (aspect != this.valuePin.varName) return;
    this.showColorFor(this.valuePin.read()); 
};

SliderMorph = HostClass.create('SliderMorph', Morph);
SliderMorph.construct = function(initialBounds) {
    var m = SliderMorph.superconstruct(this, initialBounds, "rect");
    //m.setColor(Color.blue.lighter());
    // KP: setting color moved to adjustForNewBounds
    m.valuePin = new Pin(m, new Model(m), "myValue",0.0); // may get overwritten by, eg, connect()
    m.extentPin = new Pin(m, m.valuePin.model, "myExtent", 0.0);
    m.slider = Morph(Rectangle.create(0,0,8,8), "rect");
    m.slider.relayMouseEvents(m, {mousedown: "sliderPressed", mousemove: "sliderMoved", mouseup: "sliderReleased"})
    m.addMorph(m.slider);
    m.adjustForNewBounds(m.valuePin.read(0.0)); 
    return m;
};

SliderMorph.prototype.vertical = function() {
    var bnds = this.shape.bounds();
    return bnds.height > bnds.width; 
};

SliderMorph.prototype.adjustForNewBounds = function() {
	// This method adjusts the slider for changes in value as well as geometry
    var val = this.valuePin.read(0.0);
    var bnds = this.shape.bounds();
    var ext = this.extentPin.read(0.0);
    if (this.vertical()) { // more vertical...
	var elevPix = Math.max(ext*bnds.height,6); // thickness of elevator in pixels
	var topLeft = pt(0,(bnds.height-elevPix)*val);
	var sliderExt = pt(bnds.width,elevPix); 
    } else { // more horizontal...
	var elevPix = Math.max(ext*bnds.width,6); // thickness of elevator in pixels
	var topLeft = pt((bnds.width-elevPix)*val,0);
	var sliderExt = pt(elevPix,bnds.height); 
    }
    this.slider.setBounds(bnds.topLeft().addPt(topLeft).extent(sliderExt)); 
    this.setGradient(LinearGradient.makeGradient(Color.blue.lighter().lighter(), Color.blue.lighter(),
						 this.vertical() ? LinearGradient.EastWest : LinearGradient.NorthSouth));
    
};
SliderMorph.prototype.sliderPressed = function(evt,slider) {
    
	//	Note: want setMouseFocus to also cache the transform and record the hitPoint.
	//	Ideally thereafter only have to say, eg, morph moveTo: evt.hand.adjustedMousePoint
	this.hitPoint = this.localize(evt.mousePoint).subPt(this.slider.bounds().topLeft());
	evt.hand.setMouseFocus(slider); 
};
SliderMorph.prototype.sliderMoved = function(evt,slider) {
	if(!evt.mouseButtonPressed) return;
	// Compute a new value from a new mouse point, and emit it

	var p = this.localize(evt.mousePoint).subPt(this.hitPoint);
	var bnds = this.shape.bounds();
	var ext = this.extentPin.read(0.0);
	var elevPix = Math.max(ext*bnds.height,6); // thickness of elevator in pixels
	if (this.vertical()) { // more vertical...
	    var newValue = p.y / (bnds.height-elevPix); 
	} else { // more horizontal...
	    var newValue = p.x / (bnds.width-elevPix); 
	}
	this.valuePin.write(this.clipValue(newValue));
	this.adjustForNewBounds(); 
}
SliderMorph.prototype.sliderReleased = function(evt,slider) { evt.hand.setMouseFocus(null) }
SliderMorph.prototype.handlesMouseDown = function(evt) { return true }
SliderMorph.prototype.mouseDown = function(evt) {
	var inc = this.extentPin.read(0.1);
	var newValue = this.valuePin.read(0.0);
	var delta = this.localize(evt.mousePoint).subPt(this.slider.bounds().center());
	if(this.vertical() ? delta.y > 0 : delta.x > 0) newValue += inc;
		else newValue -= inc;
	this.valuePin.write(this.clipValue(newValue));
	this.adjustForNewBounds(); }
SliderMorph.prototype.clipValue = function(val) { return Math.min(1.0,Math.max(0,0,val)); }
SliderMorph.prototype.updateView = function(aspect,controller) {
    if (aspect == this.valuePin.varName || aspect == this.extentPin.varName) 
	this.adjustForNewBounds(); 
};
	
ScrollPane = HostClass.create('ScrollPane', Morph);
ScrollPane.construct = function(morphToClip, initialBounds) {
    var m = ScrollPane.superconstruct(this, initialBounds, "rect");
    var bnds = m.shape.bounds();
    var clipR = bnds.withWidth(bnds.width - 12).insetBy(1);
    m.addMorph(morphToClip); // moved b/c setBounds & setBounds
    morphToClip.setBounds(clipR);  
    morphToClip.setBorderWidth(0);
    morphToClip.clipToPath(clipR.translatedBy(m.bounds().topLeft().negated()).toPath());
    m.innerMorph = morphToClip;
    m.scrollBar = SliderMorph(bnds.withTopLeft(clipR.topRight()))
    m.scrollBar.connect({model: m, value: ["getScrollPosition", "setScrollPosition"], extent: ["getVisibleExtent"]});
    m.addMorph(m.scrollBar);
    m.setBorderWidth(2); 
    m.setColor(null); 
    return m;
};

ScrollPane.prototype.connect = function(plugSpec) { // connection is mapped to innerMorph
	this.innerMorph.connect(plugSpec); 
}
ScrollPane.prototype.getScrollPosition = function() { 
	var ht = this.innerMorph.bounds().height;
	var slideRoom = ht - this.bounds().height;
	return -this.innerMorph.position().y/slideRoom; 
}
ScrollPane.prototype.setScrollPosition = function(scrollPos) { 
	var ht = this.innerMorph.bounds().height;
	var slideRoom = ht - this.bounds().height;
	this.innerMorph.setPosition(pt(this.innerMorph.position().x, -slideRoom*scrollPos)); 
}
ScrollPane.prototype.getVisibleExtent = function(scrollPos) {
	return Math.min(1, this.bounds().height / Math.max(10, this.innerMorph.bounds().height)); 
}
ScrollPane.prototype.scrollToTop = function() {
    this.setScrollPosition(0);
    this.scrollBar.adjustForNewBounds(); 
};

function ListPane(initialBounds) {
    var pane = ScrollPane(CheapListMorph(initialBounds,["-----","-----","-----"]), initialBounds); 
    pane.setAttributeNS(morphic.ns.MORPHIC, "type", "ListPane");
    return pane;
};

function TextPane(initialBounds) {
    var pane = ScrollPane(TextMorph(initialBounds,"-----\n-----\n-----"), initialBounds); 
    pane.setAttributeNS(morphic.ns.MORPHIC, "type", "TextPane");
    return pane;
};

FunctionPane = HostClass.create('FunctionPane', ScrollPane);
FunctionPane.construct = function(initialBounds, functionText) {
    //	Just like a textPane, except it edits a function definition,
    //	And its participation in model networks is as that function body
    if (functionText == null) functionText = "function() { return null; }";
    var m = FunctionPane.superconstruct(this, TextMorph(initialBounds, functionText), initialBounds);
    m.functionText = functionText;
    m.innerMorph.connect({model: m, text: [null, "compileNewDef"]});
    m.compileNewDef(functionText); 
    return m;
};

FunctionPane.prototype.connect = function(plugSpec) { // get around override
    Morph.prototype.connect.call(this, plugSpec); 
};

FunctionPane.prototype.compileNewDef = function(contentString) {
    this.functionBody = eval("(" + contentString + ")");
    if (this.resultPin != null) 
	this.computeResult(); 
};
FunctionPane.prototype.argPins = function() {
    var pins = [];
    for (var pinName in this) {
	// KP: instanceof is an optimization
	if (!(pinName instanceof Function) && pinName.endsWith("Pin") && pinName != "resultPin") 
	    pins.push(this[pinName]);
    }
    return pins; 
};
FunctionPane.prototype.argNames = function() { // pin names parallel to func arg names
    var names = [];
    for (var pinName in this) {
	// KP: instanceof is an optimization
	if (!(pinName instanceof Function) && pinName.endsWith("Pin") && pinName != "resultPin") {
	    names.push(pinName.substring(0, pinName.length - 3)); 
	}
    }
    // console.log('computed argNames as ' + names);
    return names; 
};
FunctionPane.prototype.computeResult = function() {
    // console.log('computing result on ' + this.functionText);
    var args = this.argPins().invoke('read');
    for (var i = 0; i < args.length; i++) {
	if (args[i] == null)  {
	    var offender = this.argPins()[i];
	    // console.log('no value for ' + offender + "," + offender.varName);
	    return; // Only fire if all args have value
	}
    }
    var model = this.resultPin.model;
    var res = this.functionBody.apply(model, args);
    // console.log('eval returned ' + res + ' to result pin ' + this.resultPin);
    this.resultPin.write(res); 
};

FunctionPane.prototype.updateView = function(aspect, controller) {
    // console.log('in ' + this.asString() + '.updateView ' + aspect + ' on function ' + this.functionText);
    if (aspect == "initialize") 
	this.computeResult(); 
    if (this.argNames().include(aspect)) 
	this.computeResult();
};
    
console.log('Loaded Widgets.js');
