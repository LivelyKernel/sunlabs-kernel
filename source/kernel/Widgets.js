// Note:  The widget/model connection mechanism is in transition.
// The new model simply adds a modelPlug object to each view, and it 
// contains references to the model and method names corresponding to 
// each of the getters and setters appropriate to the view.

// The old model used "pin" connectors to access variables.
// When these have been completely supplanted, the various getModelValue

/**
 * @class ColorPickerMorph
 */ 

ColorPickerMorph = HostClass.create('ColorPickerMorph', Morph);

Object.extend(ColorPickerMorph.prototype, {

    initialize: function(initialBounds, targetMorph, setFillName, popup) {
        ColorPickerMorph.superClass.initialize.call(this, initialBounds, "rect");
        this.targetMorph = targetMorph;
        this.setFillFunctionName = setFillName; // name like "setBorderColor"
        if (targetMorph != null) this.connectModel({model: targetMorph, setColor: setFillName});
	this.setFill(null);
        this.setBorderWidth(1); 
        this.setBorderColor(Color.black);
        this.colorWheelCache = null;
        this.isPopup = popup; 
        this.buildView();
        return this;
    },

    buildView: function() {
        // Slow -- should be cached as a bitmap and invalidated by layoutChanged
        // Try caching wheel as an interim measure
        var r = this.shape.bounds().insetBy(this.shape.getStrokeWidth());
        var rh2 = r.height/2;
        var dd = 2; // grain for less resolution in output (input is still full resolution)
        
        //DI: This could be done with width*2 gradients, instead of width*height simple fills
        //    For now it seems to perform OK at 2x granularity, and actual color choices 
        //    are still full resolution
        for (var x = 0; x < r.width; x+=dd) {
            for (var y = 0; y < r.height; y+=dd) { // lightest down to neutral
                var patchFill = this.colorMap(x, y, rh2, this.colorWheel(r.width + 1)).toString();
                var element = RectShape(null, Rectangle(x + r.x, y + r.y, dd, dd), patchFill, 0, null);
                // element.setAttributeNS("fill", this.colorMap(x, rh2, rh2, this.colorWheel(r.width + 1)).toString());
                this.addChildElement(element);
            }
        }
    },

    colorMap: function(x,y,rh2,wheel) {
        var columnHue = wheel[x];
        if (y <= rh2) return columnHue.mixedWith(Color.white,y/rh2); // lightest down to neutral
        else return Color.black.mixedWith(columnHue,(y-rh2)/rh2);  // neutral down to darkest
    },

    colorWheel: function(n) { 
        if (this.colorWheelCache && this.colorWheelCache.length == n) return this.colorWheelCache;
        console.log("computing wheel for " + n);
        return this.colorWheelCache = Color.wheelHsb(n,338,1,1);
    },

    handlesMouseDown: function(evt) { 
        return true;
    },

    onMouseDown: function(evt) {
        return this.onMouseMove(evt);
    },

    onMouseUp: function(evt) {
        if (!this.isPopup) return;
        this.remove();
        evt.hand.setMouseFocus(null);
    },

    onMouseMove: function(evt) {
        if (evt.mouseButtonPressed) { 
            var r = this.bounds().insetBy(this.shape.getStrokeWidth());
            var rh2 = r.height/2;
            var wheel = this.colorWheel(r.width+1);
            var relp = r.constrainPt(evt.mousePoint.addXY(-2,-2)).subPt(r.topLeft());
            var selectedColor = this.colorMap(relp.x,relp.y,rh2,wheel);
            this.setModelValue('setColor', selectedColor);
        } 
    },

    isTransient: function(name) {
        if (ColorPickerMorph.superClass.isTransient.call(this, name)) return true;
        return ["colorWheelCache"].include(name);
    }
    
});

/**
 * @class CheapListMorph
 */ 

CheapListMorph = HostClass.create('CheapListMorph', TextMorph);

Object.extend(CheapListMorph.prototype, {
    
    initialize: function(initialBounds, itemList) {
        //    itemList is an array of strings
        //    Note:  A proper ListMorph is a list of independent submorphs
        //    CheapListMorphs simply leverage Textmorph's ability to display
        //    multiline paragraphs, though some effort is made to use a similar interface.
    
        var listText = (itemList == null) ? "" : itemList.join("\n");
        CheapListMorph.superClass.initialize.call(this, initialBounds, listText);

        this.wrap = "noWrap";
        this.itemList = itemList;
    
        // this default self connection may get overwritten by, eg, connectModel()...
        this.modelPlug = {model: this,
		getList: "getMyList",
		getSelection: "getMySelection",
		setSelection: "setMySelection"};

        this.layoutChanged();
        this.setBorderColor(Color.black); 
    
        return this;
    },
    
    takesKeyboardFocus: function() { 
        return true;
    },

    onKeyDown: function(evt) {
        switch (evt.keyCode) {
        case Event.KEY_UP: {
            var lineNo = this.selectedLineNo();
            if (lineNo > 0) {
                this.selectLineAt(this.selectionRange[0] - 1); 
                this.setSelection(this.itemList[lineNo - 1]); 
            } 
            break;
        }
    
        case Event.KEY_DOWN: {
            var lineNo = this.selectedLineNo();
            if (lineNo < this.itemList.length - 1) {
                this.selectLineAt(this.selectionRange[1] + 2); // skip the '\n' ?
                this.setSelection(this.itemList[lineNo + 1]); 
            } 
            break;
        }
        }
    
        Event.stop(evt);
    },

    onMouseDown: function(evt) {
        evt.hand.setMouseFocus(this);
    
        if (this.takesKeyboardFocus()) {
            evt.hand.setKeyboardFocus(this);
            this.setHasKeyboardFocus(true); 
        }
    
        this.selectLineAt(this.charOfY(this.localize(evt.mousePoint))); 
    },

    onMouseMove: function(evt) {  
        if (!evt.mouseButtonPressed) return;

        var mp = this.localize(evt.mousePoint);

        if (!this.shape.bounds().containsPoint(mp)) this.selectLineAt(-1);
        else this.selectLineAt(this.charOfY(mp)); 
    },

    onMouseUp: function(evt) {
        evt.hand.setMouseFocus(null);
        this.emitSelection(); 
    },

    emitSelection: function() {
        if (this.hasNullSelection()) return this.setSelection(null);
        this.setSelection(this.itemList[this.selectedLineNo()]); 
    },

    charOfY: function(p) { // Like charOfPoint, for the leftmost character in the line
        return this.charOfPoint(pt(this.inset.x+1,p.y)); 
    },
    
    selectedLineNo: function() { // Return the item index for the current selection
        return this.lineNo(this.ensureTextBox().getBounds(this.selectionRange[0]));
    },
    
    showsSelectionWithoutFocus: function() { 
        return true;  // Overridden in, eg, Lists
    },

    drawSelection: function() {
        if (this.hasNullSelection()) { // Null sel in a list is blank
            for (var child = this.selectionElement.firstChild; child != null; child = child.nextSibling) {
                this.selectionElement.removeChild(child);
            }
        } else CheapListMorph.superClass.drawSelection.call(this); 
    },
    
    selectLineAt: function(charIx) {  
        this.selectionRange = (charIx == -1) ? [0,-1] : this.lineRange(this.textString, charIx);
        this.drawSelection(); 
    },
    
    lineRange: function(str, charIx) { // like selectWord, but looks for matching newLines 
        var i1 = charIx;
	while (i1>0 && str[i1-1] != '\n') i1--; // scan back to prior newline
	var i2 = i1;
	while (i2<str.length-1 && str[i2+1] != '\n') i2++; // and forward to next newline
	return [i1, i2];
    },
    
    lineRect: function(r) { //Menu selection displays full width
        var bounds = this.shape.bounds();
        return CheapListMorph.superClass.lineRect.call(this, Rectangle(bounds.x+2, r.y, bounds.width-4, r.height)); 
    },
    
    updateList: function(newList) {
        var priorItem = this.getSelection();
	this.itemList = newList;
        var listText = (this.itemList == null) ? "" : this.itemList.join("\n");
        this.updateTextString(listText);
	this.setSelectionToMatch(priorItem);
        this.emitSelection(); 
    },

    setSelectionToMatch: function(item) {
        var lineStart = -1; 
        var firstChar = 0;
    
        for (var i = 0; i < this.itemList.length; i++) {
            if (this.itemList[i] == item) {
                lineStart = firstChar; 
               break; 
            }
            firstChar += this.itemList[i].length + 1; 
        }
        this.selectLineAt(lineStart); 
    },

    updateView: function(aspect, controller) {
        var c = this.modelPlug;
        if(c) { // New style connect
		if (aspect == c.getList) this.updateList(this.getList());
		if (aspect == c.getSelection) this.setSelectionToMatch(this.getSelection());
		return;
	}
        if (this.listPin && aspect == this.listPin.varName) {
            this.updateList(this.listPin.read());
        }
        if (this.selectionPin && aspect == this.selectionPin.varName) {
            this.setSelectionToMatch(this.selectionPin.read()); 
        }
    },

    getList: function() {
        if(this.modelPlug) return this.getModelValue('getList', ["-----"]);
	else return this.listPin.read(null);
    },

    getSelection: function() {
        if(this.modelPlug) return this.getModelValue('getSelection', null);
	else return this.selectionPin.read(null);
    },

    setSelection: function(item) {
        if(this.modelPlug) this.setModelValue('setSelection', item); 
	else this.selectionPin.write(item); 
    },

    getMyList: function() { // Getter and setter for when this is its own model
        return this.itemlist;
    },

    getMySelection: function() {
        return this.mySelection;
    },

    setMySelection: function(value) {
        this.mySelection = value;
    }   
});

/**
 * @class MenuMorph
 */ 

MenuMorph = HostClass.create('MenuMorph', CheapListMorph);

Object.extend(MenuMorph.prototype, {

    initialize: function(items, lines) {
        //    items is an array of menuItems, each of which is an array of the form
	//	[itemName, target, functionName, parameterIfAny]
        //    At mouseUp, the call is of the form
	//	target.function(parameterOrNull,event,menuItem)
	//    Note that the last item is seldom used, but it allows the caller to put
	//	additional data at the end of the menuItem, where the receiver can find it.
	//    The optional parameter lineList is an array of indices into items.
	//	It will cause a line to be displayed below each item so indexed
    
        //    It is intended that a menu can also be created incrementally
	//	with calls of the form...
	//	    var menu = MenuMorph([]);
	//	    menu.addItem(nextItem);  //May be several of these
	//	    menu.addLine();          // interspersed with these
	//	    menu.openIn(world,location,stayUp,captionIfAny);

        this.items = items;
	this.lines = lines ? lines : [];
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
	for(var i=0; i<this.items.length; i++)
		if(this.items[i][0] == itemName) this.items.splice(i,1);
    },

    openIn: function(world, location, remainOnScreen, captionIfAny) { 
	// Note: on a mouseDown invocation (as from a menu button),
	// mouseFocus should be set immediately before or after this call
        this.stayUp = remainOnScreen; // set true to keep on screen
	this.caption = captionIfAny;  // Not yet implemented
	this.compose(location);
        this.setBorderColor(Color.blue); 
	world.addMorph(this);
    },

    compose: function(location) { 
	var itemNames = this.items.map(function (item) { return item[0] });
        MenuMorph.superClass.initialize.call(this, location.extent(pt(200, 200)), itemNames);

        // styling
        this.textColor = Color.blue;
        this.setBorderWidth(0.5);
        this.setFill(Color.blue.lighter(5));
        
        //this.setFill(StipplePattern.create(Color.white, 3, Color.blue.lighter(5), 1));
        this.shape.roundEdgesBy(6);
        this.shape.setFillOpacity(0.75);
    },

    takesKeyboardFocus: function() { 
        return false;
    },

    onMouseUp: function(evt) {
        if (!this.hasNullSelection()) var item = this.items[this.selectedLineNo()];
        this.setNullSelectionAt(0);  // Clean up now, in case the call fails
        evt.hand.setMouseFocus(null);
        if (!this.stayUp) this.remove(); 

	if (item) { // Now execute the menu item...
            var func = item[1][item[2]];  // target[functionName]
            if (func == null) console.log('Could not find function ' + item[2]);
        	// call as target.function(parameterOrNull,event,menuItem)
		else func.call(item[1], item[3], evt, item); 
	}
    }
});

/**
 * @class CheapMenuMorph
 */ 

CheapMenuMorph = HostClass.create('CheapMenuMorph', CheapListMorph);

Object.extend(CheapMenuMorph.prototype, {

    initialize: function(location, target, targetFunctionName, itemList, parametersIfAny) {
        //    target and targetFunctionName determine the call at mouseUp
        //    itemList is an array of strings
        //    parametersIfAny is a parallel list or a singleton, or null
    
        //    Note:  A proper ListMorph is a list of independent submorphs
        //    CheapListMorphs simply leverage off Textmorph's ability to display multiline paragraphs

        itemList = itemList.concat("--old menu--");  //Please update so we can remove CheapMenuMorph
	CheapMenuMorph.superClass.initialize.call(this, location.extent(pt(200, 200)), itemList);

        this.target = target;
        this.targetFunctionName = targetFunctionName;
        this.parameters = parametersIfAny;
        this.stayUp = false; // set true to keep on screen
    
        // styling
        this.textColor = Color.blue;
        this.setBorderWidth(0.5);
        this.setFill(Color.blue.lighter(5));
        
        //this.setFill(StipplePattern.create(Color.white, 3, Color.blue.lighter(5), 1));
        this.shape.roundEdgesBy(6);
        this.shape.setFillOpacity(0.75);
    
        return this;
    },

    takesKeyboardFocus: function() { 
        return false;
    },

    onMouseUp: function(evt) {
        evt.hand.setMouseFocus(null);

        if (!this.hasNullSelection()) {
        
            var lineNo = this.selectedLineNo();
            var selectedItem = this.itemList[lineNo];
            var parameter = (this.parameters instanceof Array) ? this.parameters[lineNo] : this.parameters;
        
            if (selectedItem) {
                var func = this.target[this.targetFunctionName];
                if (func == null) console.log('Could not find function ' + this.targetFunctionName);
                    // call as target.targetFunctionName(selectedItem,parameter,evt)
                else func.call(this.target, selectedItem, parameter, evt); 
            }
        }
    
        this.setNullSelectionAt(0);

        if (!this.stayUp) this.remove(); 
    }
});

//    Basic theory of widgets...
//    A widget is a view/controller, and it views some aspect of a model
//    Viewing is by way of Pins which use MVC-style variable viewing,
//    Each has an "aspect" for for inducing and responding to model changes
//    The idea is that the parent morph has a model for the MVC relationships
//    with the various widgets embedded in it.
//    There are also MessagePins that simply send getter/setter messages

//    A widget comes with a model pointer and a property name for each property
//        that it controls.  The model pointer is typically automatically set to
//        the widget's owner, but it can be pointed at other objects, and even at itself
//        for testing or, eg, for isolated text editing or presentation.

//    Browser example...
//    Add a list to a panel
//        adds a submorph as usual
//        adds properties "part1List", "part1Selection"
//        list1.getList(target) = { classNames(); }
//        list1.setSelection(selection) = { owner.setModelProperty("className",selection,this); }
//    Add second list
//        part2.getList = global[part1.selection].methodNames()
//    if change first selection, how propagate?
//        owner.setModelProperty("selectedClass")
//    ex: setSelectorName
//        sets the name, also triggers update of aspect

/**
 * @class Model
 */ 

Model = Class.create();// An MVC-style model.

Object.extend(Model.prototype, {

    initialize: function(dep) { 
        // Broadcasts an update message to all dependents when a value changes.
        this.dependents = (dep != null) ? [dep] : []; 
    },

    addDependent: function (dep) { 
        this.dependents.push(dep); 
    },

    removeDependent: function (dep) {
        var ix = this.dependents.indexOf(dep);
        if (ix < 0) return;
        this.dependents.splice(ix, 1); 
    },

    set: function (varName, newValue, source) {
        this[varName] = newValue;
        this.changed(varName, source); 
    },

    changed: function(varName, source) {
        // If source is given, we don't update the source of the change
        // If varName is not given, then null will be the aspect of the updateView()
//console.log('changed ' + varName);
        for (var i = 0; i < this.dependents.length; i++) {
            if (source !== this.dependents[i])
            	{
		this.dependents[i].updateView(varName, source);
		} 
        } 
    },
    
    toString: function() {
        var str = "";
    
        for (var name in this) {
            if (!(this[name] instanceof Function) && (name != "dependents")) 
                str += name + ": " + this[name] + "\n";
        }
    
        return str; 
    }
    
});

/**
 * @class Pin
 */ 

Pin = Class.create();

Object.extend(Pin.prototype, {
    
    initialize: function(component, model, varName, initialValue) { // A Fabrik-style variable interface
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
    
    },

    toString: function() {
        return "Pin(" + this.varName + ")";
    },

    read: function(nullValue) {
        var val = (this.reads) ? this.model[this.varName] : null;
        
        if (this.varName == "this") 
            val = this.model; // temp hack for model viewer
    
        return (val == null) ? nullValue : val; 
    },

    write: function(newValue) { 
        // console.log('Pin.write varName: ' + this.varName /* + " newValue: " + newValue.inspect() */);
        if (this.writes) 
            this.model.set(this.varName, newValue, this.component); 
    }
    
});

/**
 * @class MessagePort
 */ 

MessagePort = Class.create();

Object.extend(MessagePort.prototype, {

    initialize: function(component, model, readName, writeName) { // A more flexible message interface
        // Note that widgets can be used with either Fabrik-style variable wiring, or O-O style messages
        this.component = component; // the component that will be the source for writes
        this.model = model;  // the model toand from which reads and writes will pass
        this.readName = readName;
        this.writeName = writeName; 
    },

    read: function () { 
        return (this.readName != null) ? this.model[this.readName].call(this.model) : null; 
    },

    write: function (newValue) { 
        if (this.writeName != null) this.model[this.writeName].call(this.model, newValue); 
    }
    
});

/**
 * @class Morph
 */ 
          
// Morph model category
Object.extend(Morph.prototype, {
    connect: function(plugSpec) { // Old variable access version from widget panel
			// and other apps that got built in its image
        var model = plugSpec.model;
	var mvc = false;
	this.modelPlug = null; // defeat default self-model
    
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
    
        if (mvc) model.addDependent(this); 
    },

    connectModel: function(plug) {
	// connector makes this view pluggable to different models, as in
	// {model: someModel, getList: "getItemList", setSelection: "chooseItem"}
	this.modelPlug = plug;
        if(plug.model.addDependent)  // for mvc-style updating
		plug.model.addDependent(this); 
    },

    getModelValue: function(functionName, defaultValue) {
	// Allows for graceful handling of missing accessors
	var plug = this.modelPlug;
	if(plug == null || plug.model == null || functionName == null) return defaultValue;
        var func = plug.model[plug[functionName]];
	if(func == null) return defaultValue;
//console.log("reading %s as %s", functionName, func.call(plug.model));
	return func.call(plug.model); 
    },

    setModelValue: function(functionName, newValue, view) {
	// Allows for graceful handling of missing accessors
//console.log("set %s to %s", functionName, newValue);
	var plug = this.modelPlug;
	if(plug == null || plug.model == null || functionName == null) return;
        var func = plug.model[plug[functionName]];
        if(func == null) return;
	func.call(plug.model, newValue, view); 
    },

    updateView: function(aspect, controller) { }
    
});

/**
 * @class ButtonMorph
 */ 

ButtonMorph = HostClass.create('ButtonMorph', Morph);

Object.extend(ButtonMorph.prototype, {

    // A ButtonMorph is the simplest widget
    // It read and writes the boolean variable, this.model[this.propertyName]
    initialize: function(initialBounds) {
        ButtonMorph.superClass.initialize.call(this, initialBounds, "rect");
        this.toggles = false; // if true each push toggles the model state

        // this default self connection may get overwritten by, eg, connectModel()...
        this.modelPlug = {model: this, getValue: "getMyValue", setValue: "setMyValue"};
	    
        // Styling
        this.baseColor = Color.gray.darker();
        this.setFill(LinearGradient.makeGradient(this.baseColor, this.baseColor.lighter(), LinearGradient.SouthNorth));
        this.setBorderWidth(0.3);
        this.setBorderColor(this.baseColor);
        this.shape.roundEdgesBy(4);
    
        return this;
    },

    handlesMouseDown: function(evt) { return true; },
    
    onMouseDown: function(evt) {
        if (!this.toggles) {
            this.setValue(true); 
            this.showColorFor(true); 
        } 
    },
    
    onMouseMove: function(evt) { },

    onMouseUp: function(evt) {
        var newValue = this.toggles ? ! this.getValue() : false;
        this.setValue(newValue); 
        this.showColorFor(newValue); 
    },
    
    showColorFor: function(value) {
        var base = value ? this.baseColor.lighter() : this.baseColor;
        this.setFill(LinearGradient.makeGradient(base, base.lighter(), LinearGradient.SouthNorth));
    },

    updateView: function(aspect, controller) {
        var p = this.modelPlug;
        if(p) {
		if (aspect == p.getValue) this.showColorFor(this.getValue());
		return;
	}
	if (aspect == this.valuePin.varName) 
        	this.showColorFor(this.getValue());
    },

    getValue: function() {
	if(this.modelPlug) return this.getModelValue('getValue', false);
	else return this.valuePin.read(false);  // variable style access
    },

    setValue: function(value) {
        if(this.modelPlug) this.setModelValue('setValue', value);
	else this.valuePin.write(value);
    },

    getMyValue: function() { // Getter and setter for when this is its own model
        return this.myValue;
    },

    setMyValue: function(value) {
        this.myValue = value;
    }
});

/**
 * @class SliderMorph
 */ 

SliderMorph = HostClass.create('SliderMorph', Morph);

Object.extend(SliderMorph.prototype, {

    initialize: function(initialBounds, scaleIfAny) {
        SliderMorph.superClass.initialize.call(this, initialBounds, "rect");
        this.scale = (scaleIfAny == null) ? 1.0 : scaleIfAny;
	this.setFill(Color.blue.lighter());

        // this default self connection may get overwritten by, eg, connectModel()...
        this.modelPlug = {model: this, getValue: "getMyValue", setValue: "setMyValue", getExtent: "getMyExtent"};
	this.myValue = 0.0;
 
        this.slider = Morph(Rectangle(0, 0, 8, 8), "rect");
        this.slider.relayMouseEvents(this, {onMouseDown: "sliderPressed", onMouseMove: "sliderMoved", onMouseUp: "sliderReleased"})
        this.addMorph(this.slider);
        this.adjustForNewBounds(this.getValue()); 
    
        return this;
    },

    vertical: function() {
        var bnds = this.shape.bounds();
        return bnds.height > bnds.width; 
    },
    
    adjustForNewBounds: function() {
        // This method adjusts the slider for changes in value as well as geometry
        var val = this.getValue();
        var bnds = this.shape.bounds();
        var ext = this.getExtent();
    
        if (this.vertical()) { // more vertical...
            var elevPix = Math.max(ext*bnds.height,8); // thickness of elevator in pixels
            var topLeft = pt(0,(bnds.height-elevPix)*val);
            var sliderExt = pt(bnds.width,elevPix); 
        } else { // more horizontal...
            var elevPix = Math.max(ext*bnds.width,8); // thickness of elevator in pixels
            var topLeft = pt((bnds.width-elevPix)*val,0);
            var sliderExt = pt(elevPix,bnds.height); 
        }
    
        this.slider.setBounds(bnds.topLeft().addPt(topLeft).extent(sliderExt)); 
    
        this.setFill(LinearGradient.makeGradient(Color.blue.lighter().lighter(), Color.blue.lighter(),
                     this.vertical() ? LinearGradient.EastWest : LinearGradient.NorthSouth));
    
    },
    
    sliderPressed: function(evt, slider) {
        //    Note: want setMouseFocus to also cache the transform and record the hitPoint.
        //    Ideally thereafter only have to say, eg, morph moveTo: evt.hand.adjustedMousePoint
        this.hitPoint = this.localize(evt.mousePoint).subPt(this.slider.bounds().topLeft());
        evt.hand.setMouseFocus(slider); 
    },
    
    sliderMoved: function(evt, slider) {
        if (!evt.mouseButtonPressed) return;
        // Compute a new value from a new mouse point, and emit it
    
        var p = this.localize(evt.mousePoint).subPt(this.hitPoint);
        var bnds = this.shape.bounds();
        var ext = this.getExtent();
        var elevPix = Math.max(ext*bnds.height,6); // thickness of elevator in pixels
    
        if (this.vertical()) { // more vertical...
            var newValue = p.y / (bnds.height-elevPix); 
        } else { // more horizontal...
            var newValue = p.x / (bnds.width-elevPix); 
        }
    
        this.setValue(this.clipValue(newValue));
        this.adjustForNewBounds(); 
    },

    sliderReleased: function(evt, slider) { evt.hand.setMouseFocus(null) },
    
    handlesMouseDown: function(evt) { return true; },
    
    onMouseDown: function(evt) {
        evt.hand.setMouseFocus(this);
        var inc = this.getExtent();
        var newValue = this.getValue();
        var delta = this.localize(evt.mousePoint).subPt(this.slider.bounds().center());
    
        if (this.vertical() ? delta.y > 0 : delta.x > 0) newValue += inc;
        else newValue -= inc;
    
        this.setValue(this.clipValue(newValue));
        this.adjustForNewBounds(); 
    },
    
    onMouseUp: function(evt) {
        evt.hand.setMouseFocus(null);
    },
    
    clipValue: function(val) { 
        return Math.min(1.0,Math.max(0,0,val.roundTo(0.001))); 
    },

    updateView: function(aspect, controller) {
        var p = this.modelPlug;
        if(p) {
		if (aspect == p.getValue || aspect == p.getExtent) this.adjustForNewBounds();
		return;
	}
        if (aspect == this.valuePin.varName || aspect == this.extentPin.varName) 
            this.adjustForNewBounds(); 
    },

    getValue: function() {
        var c = this.modelPlug;
	if(c) return c.model[c.getValue](0.0) / this.scale;  // call the model's value accessor
	else return this.valuePin.read(0.0) / this.scale;  // variable style access
    },

    setValue: function(value) {
        var c = this.modelPlug;
	if(c) c.model[c.setValue](value * this.scale);  // call the model's value accessor
	else this.valuePin.write(value * this.scale);  // variable style access
    },

    getExtent: function() {
	if(this.modelPlug) return this.getModelValue('getExtent',(0.0));
	else return this.extentPin.read(0.0);
    },

    getMyExtent: function() { // Getter and setter for when this is its own model
        return 0.0 ;
    },

    getMyValue: function() {
        return this.myValue;
    },

    setMyValue: function(value) {
        this.myValue = value;
    }
});

/**
 * @class ScrollPane
 */ 

ScrollPane = HostClass.create('ScrollPane', Morph);

Object.extend(ScrollPane.prototype, {

    initialize: function(morphToClip, initialBounds) {
        ScrollPane.superClass.initialize.call(this, initialBounds, "rect");
        this.setBorderWidth(2);
        this.setFill(null); 
    
        var bnds = this.shape.bounds();
        var scrollBarWidth = 14;
	var clipR = bnds.withWidth(bnds.width - scrollBarWidth).insetBy(1);
    
        // Make a clipMorph with the content (morphToClip) embedded in it
        this.clipMorph = ClipMorph(clipR);    
        this.clipMorph.setBorderWidth(0);
        this.clipMorph.shape.setFill(morphToClip.shape.getFill());
        morphToClip.setBorderWidth(0);
        morphToClip.setPosition(clipR.topLeft());
        this.innerMorph = morphToClip;
        this.clipMorph.addMorph(morphToClip);
        this.addMorph(this.clipMorph);
    
        // Add a scrollbar
        this.scrollBar = SliderMorph(bnds.withTopLeft(clipR.topRight()))
        this.scrollBar.connect({model: this, value: ["getScrollPosition", "setScrollPosition"], extent: ["getVisibleExtent"]});
        this.addMorph(this.scrollBar);
        
        return this;
    },

    connect: function(plugSpec) { // connection is mapped to innerMorph
        this.innerMorph.connect(plugSpec); 
    },
    
    connectModel: function(plugSpec) { // connection is mapped to innerMorph
        this.innerMorph.connectModel(plugSpec); 
    },
    
    getScrollPosition: function() { 
        var ht = this.innerMorph.bounds().height;
        var slideRoom = ht - this.bounds().height;
        return -this.innerMorph.position().y/slideRoom; 
    },
    
    setScrollPosition: function(scrollPos) { 
        var ht = this.innerMorph.bounds().height;
        var slideRoom = ht - this.bounds().height;
        this.innerMorph.setPosition(pt(this.innerMorph.position().x, -slideRoom*scrollPos)); 
    },
    
    getVisibleExtent: function(scrollPos) {
        return Math.min(1, this.bounds().height / Math.max(10, this.innerMorph.bounds().height)); 
    },
    
    scrollToTop: function() {
        this.setScrollPosition(0);
        this.scrollBar.adjustForNewBounds(); 
    }
    
});

/**
 * @class ListPane
 */ 

function ListPane(initialBounds) {
    var pane = ScrollPane(CheapListMorph(initialBounds,["-----"]), initialBounds); 
    Morph.setType(pane, "ListPane");
    return pane;
};

/**
 * @class TextPane
 */ 

function TextPane(initialBounds, defaultText) {
    var pane = ScrollPane(TextMorph(initialBounds, defaultText), initialBounds); 
    pane.setAttributeNS(morphic.ns.MORPHIC, "type", "TextPane");
    return pane;
};

/**
 * @class PrintPane
 */ 

function PrintPane(initialBounds, defaultText) {
    var pane = ScrollPane(PrintMorph(initialBounds, defaultText), initialBounds); 
    pane.setAttributeNS(morphic.ns.MORPHIC, "type", "printPane");
    return pane;
};

    
console.log('Loaded Widgets.js');

