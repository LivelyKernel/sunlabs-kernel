/*
 * Copyright � 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

/**
 * Tools.js.  This file defines various tools such as the class browser,
 * object inspector, style editor, and profiling and debugging capabilities.  
 */
(function(module) {

// ===========================================================================
// Class Browser -- A simple browser for Lively Kernel code
// ===========================================================================

Widget.subclass('SimpleBrowser', {

    defaultViewTitle: "Javascript Code Browser",
    pins: ["+ClassList", "-ClassName", "+MethodList", "-MethodName", "MethodString", "+ClassPaneMenu"],

    initialize: function($super) { 
        var model = new SyntheticModel(this.pins);
        var plug = model.makePlugSpecFromPins(this.pins);
        $super(plug); 
        this.scopeSearchPath = [Global];
        model.setClassList(this.listClasses());
        // override the synthetic model logic to recompute new values
        var browser = this;
        model.getClassPaneMenu = function() {
           return browser.getClassPaneMenu();
        }
    },

    updateView: function(aspect, source) {
        var p = this.modelPlug;
        if (!p) return;

        switch (aspect) {
        case p.getClassName:
            var className = this.getModelValue('getClassName');
        this.setModelValue("setMethodList", this.listMethodsFor(className));
        break;
        case p.getMethodName:
            var methodName = this.getModelValue("getMethodName");
            var className = this.getModelValue("getClassName");
            this.setModelValue("setMethodString", this.getMethodStringFor(className, methodName));
            break;
        case p.getMethodString:
            try {
                eval(this.getModelValue("getMethodString"));
            } catch (er) {
                WorldMorph.current().alert("error evaluating method " + this.getMethodValue("getMethodString"));
            }
            // FIXME errors?
            break;
        }
    },

    listClasses: function() { 
        var list = [];
        for (var i = 0; i < this.scopeSearchPath.length; i++) {
            var p = this.scopeSearchPath[i];
            var scopeCls = [];
            Class.withAllClassNames(p, function(name) { name.startsWith("SVG") || scopeCls.push(name);});
            list = list.concat(scopeCls.sort());
        }
        return list;
    },


    listMethodsFor: function(className) {
        if (className == null) return [];
        var sorted = (className == 'Global')
            ? Global.constructor.functionNames().without(className).sort()
            : Global[className].localFunctionNames().sort();
        var defStr = "*definition";
        var defRef = SourceControl && SourceControl.getSourceInClassForMethod(className, defStr);
        return defRef ? [defStr].concat(sorted) : sorted;
    },
    
    getMethodStringFor: function(className, methodName) { 
        if (!className || !methodName) return "no code"; 
	if (SourceControl != null) var source = SourceControl.getSourceInClassForMethod(className, methodName);
	if (source) return source;
	var func = (className == "Global") ? Global[methodName] : Global[className].prototype[methodName];
	if (func == null) return "no code";
	var code = func.getOriginal().toString();
	if (className == "Global" || methodName == "constructor") return code;
	return className + ".prototype." + methodName + " = " + code; 
    },
    
    setMethodString: function(newDef) { eval(newDef); },

    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['leftPane', newTextListPane, new Rectangle(0, 0, 0.5, 0.5)],
            ['rightPane', newTextListPane, new Rectangle(0.5, 0, 0.5, 0.5)],
            ['bottomPane', newTextPane, new Rectangle(0, 0.5, 1, 0.5)]
        ]);

        var model = this.getModel();
        var m = panel.leftPane;
        m.connectModel({model: model, getList: "getClassList", setSelection: "setClassName", getSelection: "getClassName", getMenu: "getClassPaneMenu"});
        m.updateView("getClassList");
        m = panel.rightPane;
        m.connectModel({model: model, getList: "getMethodList", setSelection: "setMethodName"});
        m = panel.bottomPane;
        m.innerMorph().textSelection.borderRadius = 0;
        m.connectModel({model: model, getText: "getMethodString", setText: "setMethodString", getMenu: "default"});
        return panel;
    },

    getClassPaneMenu: function() {
        var items = [];
        var className = this.getModelValue("getClassName");
        if (className != null) {
            var theClass = Global[className];
            if (theClass.prototype != null) {
                items.push(['profile selected class', 
                    function() { showStatsViewer(theClass.prototype, className + "..."); }]);
            }
        }
        if (!URL.source.protocol.startsWith("file")) {
            items.push(['import source files', function() {
                if (! SourceControl) SourceControl = new SourceDatabase();
                SourceControl.scanKernelFiles(["prototype.js", "defaultconfig.js", "localconfig.js",
                    "Main.js", "Core.js", "Text.js",
                    "Widgets.js", "Network.js", "Storage.js", "Tools.js",
                    "Examples.js", "WebPIM.js", "phone.js"]);
                WorldMorph.current().setFill(new RadialGradient([Color.rgb(36,188,255), 1, Color.rgb(127,15,0)]));
            }]);
        }
        if (!Config.debugExtras && Function.installStackTracers) {
            items.push(['enable call tracing', function() {
                Config.debugExtras = true;
		Function.installStackTracers();  
            }]);
        }
	items.push(["test showStack (in console)", Function.showStack.curry(false)]);
	items.push(["test showStack (in viewer)", Function.showStack.curry(true)]);
        if (Config.debugExtras && Function.installStackTracers) {
	    items.push(["test profiling (in console)", Function.testTrace]);
	    items.push(["test tracing (in console)", this.testTracing]);
            items.push(['disable call tracing', function() {
                Config.debugExtras = false;
		Function.installStackTracers("uninstall"); 
            }]);
        }
        return items; 
    },
    testTracing: function() {
	console.log("Function.prototype.logAllCalls = true; tracing begins...");
	Function.prototype.logAllCalls = true;
	this.toString();
	Function.prototype.logAllCalls = false;
    },


});
   
// ===========================================================================
// Object Hierarchy Browser
// ===========================================================================

WidgetModel.subclass('ObjectBrowser', {

    defaultViewTitle: "Object Hierarchy Browser",
    openTriggerVariable: 'getObjectList',

    initialize: function($super, objectToView) {
        $super();
        this.fullPath     = ""; // The full pathname of the object (string)
        this.nameToView   = ""; // Current name ("node") that we are viewing
        this.objectToView = objectToView || Global; // Start by viewing the Global namespace if no argument
        return this;
    },

    getObjectList: function() {
        var list = [];
        for (var name in this.objectToView) list = list.concat(name);
        list.sort();

        // The topmost row in the object list serves as the "up" operation.
        list.unshift("..");

        if (this.panel) {
            var nameMorph = this.panel.namePane;
            var path = (this.fullPath != "") ? this.fullPath : "Global";
            nameMorph.setTextString(path);
        }

        return list;
    },

    setObjectName: function(n) {
        if (!n) return;

        // Check if we are moving up in the object hierarchy
        if (n.substring(0, 2) == "..") {
            var index = this.fullPath.lastIndexOf(".");
            if (index != -1) {
                this.fullPath     = this.fullPath.substring(0, index);
                this.objectToView = eval(this.fullPath);
            } else {
                this.fullPath     = "";
                this.objectToView = Global;
            }
            this.nameToView = "";
            this.changed("getObjectList");
            return;
        }

        // Check if we are "double-clicking" or choosing another item
        if (n != this.nameToView) {
            // Choosing another item: Get the value of the selected item
            this.nameToView = n;
            this.changed("getObjectValue");
        } else {
            // Double-clicking: Browse child
            if (this.fullPath != "") this.fullPath += ".";

            if ((this.objectToView instanceof Array) && !isNaN(parseInt(n))) {
                this.fullPath += "[" + n + "]";
            } else {
                this.fullPath += this.nameToView;
            }
            this.objectToView = eval(this.fullPath);
            // if (!this.objectToView) this.objectToView = Global;
            this.nameToView = "";
            this.changed("getObjectList");
        }
    },

    getObjectValue: function() {
        if (!this.objectToView || !this.nameToView || this.nameToView == "") return "(no data)";
        return Object.inspect(this.objectToView[this.nameToView]);
    },

    setObjectValue: function(newDef) { eval(newDef); },

    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['namePane', TextMorph, new Rectangle(0, 0, 1, 0.07)],
            ['topPane', newTextListPane, new Rectangle(0, 0.07, 1, 0.5)],
            ['bottomPane', newTextPane, new Rectangle(0, 0.5, 1, 0.5)]
        ]);

        this.panel = panel;

        var m = panel.topPane;
        m.connectModel({model: this, getList: "getObjectList", setSelection: "setObjectName"});
        m = panel.bottomPane;
        m.connectModel({model: this, getText: "getObjectValue", setText: "setObjectValue"});

        return panel;
    }

});

// ===========================================================================
// Object Inspector
// ===========================================================================

/**
 * @class SimpleInspector: A simple JavaScript object (instance) inspector
 */
   
Widget.subclass('SimpleInspector', {

    defaultViewExtent: pt(400,250),

    pins: ["+PropList", "PropName", "+PropText", "-Inspectee", "-EvalInput"],
    
    initialize: function($super, targetMorph) {
        $super();
        var model = new SyntheticModel(this.pins);
        this.connectModel(model.makePlugSpecFromPins(this.pins));
        model.setInspectee(targetMorph);
    },

    updateView: function(aspect, source) {
        var p = this.modelPlug;
        if (!p) return;

        switch (aspect) {
        case p.getInspectee:
            this.setModelValue("setPropList", Properties.all(this.inspectee()));
            break;
        case p.getPropName:
            var prop = this.selectedItem();
            if (!prop) {

                this.setModelValue("setPropText", "----");
            } else {
                this.setModelValue("setPropText", Strings.withDecimalPrecision(Object.inspect(prop), 2));
            }
            break;
        case p.getEvalInput:
            var target = this.inspectee();
            var propName = this.getModelValue("getPropName");
            if (propName) {
                var input = this.getModelValue("getEvalInput");
                var result = (interactiveEval.bind(this.target))(input);
                target[propName] = result;
                this.setModelValue("setPropText", result);
            }
            break;
        }
    },
    
    inspectee: function() {
        return this.getModelValue("getInspectee");
    },
    
    selectedItem: function() {
        var target = this.inspectee();
        return target ? target[this.getModelValue("getPropName")] : undefined;
    },

    viewTitle: function() {
        return Strings.format('Inspector (%s)', this.inspectee()).truncate(50);
    },

    /*
    openIn: function(world, location) {
        // DI: experimental continuous update feature.  It works, but not removed upon close
        // var rightPane = window.targetMorph.rightPane.innerMorph();
        // rightPane.startStepping(1000, 'updateView', 'getPropText');
    },
   */

    buildView: function(extent, model) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['leftPane', newTextListPane, new Rectangle(0, 0, 0.5, 0.6)],
            ['rightPane', newTextPane, new Rectangle(0.5, 0, 0.5, 0.6)],
            ['bottomPane', newTextPane, new Rectangle(0, 0.6, 1, 0.4)]
        ]);

        panel.leftPane.connectModel({model: model, 
            getList: "getPropList", setSelection: "setPropName"});

        panel.rightPane.connectModel({model: model, 
            getText: "getPropText", setText: "setEvalInput", doitContext: "getInspectee"});

        var m = panel.bottomPane;
        m.connectModel({model: model, doitContext: "getInspectee"});
        m.innerMorph().setTextString("doits here have this === inspectee");

        var widget = this;
        panel.morphMenu = function(evt) { // offer to inspect the current selection
            var menu = Class.getPrototype(this).morphMenu.call(this, evt);
            if (!widget.selectedItem()) return menu;
            menu.addLine();
            menu.addItem(['inspect selection', function() { 
                new SimpleInspector(widget.selectedItem()).open()}])
            return menu; 
        }

        // kickstart the dependencies
        model.setInspectee(model.getInspectee());
        return panel;
    }

});

// ===========================================================================
// Style Editor Panel
// ===========================================================================
  
WidgetModel.subclass('StylePanel', {

    documentation: "Interactive style editor for morphs.",
    defaultViewExtent: pt(340,100),
    defaultViewTitle: "Style Panel",

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


// ===========================================================================
// Profiler & Statistics Viewer
// ===========================================================================
Object.profiler = function (object, service) {
    // The wondrous Ingalls profiler...
    // Invoke as, eg, Object.profiler(Color, "start"), or Object.profiler(Color.prototype, "start")
    var stats = {};
    var fnames = object.constructor.localFunctionNames();

    for (var i = 0; i < fnames.length; i++) { 
        var fname = fnames[i];

        if (fname == "constructor") {} // leave the constructor alone
        else if (service == "stop") 
            object[fname] = object[fname].originalFunction;  // restore original functions
        else if (service == "tallies") 
            stats[fname] = object[fname].tally;  // collect the tallies
        else if (service == "ticks") 
            stats[fname] = object[fname].ticks;  // collect the real-time ticks
        else if (service == "reset") { 
            object[fname].tally = 0; object[fname].ticks = 0; // reset the stats
        } else if (service == "start") { // Make a proxy function object that just calls the original
            var tallyFunc = function () {
                var tallyFunc = arguments.callee;
                tallyFunc.tally++;
                msTime = new Date().getTime();
                var result = tallyFunc.originalFunction.apply(this, arguments); 
                tallyFunc.ticks += (new Date().getTime() - msTime);
                return result;
            }
            
            // Attach tallies, and the original function, then replace the original
            if (object[fname].tally == null) 
                tallyFunc.originalFunction = object[fname];
            else 
                tallyFunc = object[fname]; // So repeated "start" will work as "reset"

            tallyFunc.tally = 0;  
            tallyFunc.ticks = 0;
            object[fname] = tallyFunc; 
        } 
    }
    
    return stats; 
};

function showStatsViewer(profilee,title) {
    Object.profiler(profilee, "start");
    var m = new ButtonMorph(WorldMorph.current().bounds().topCenter().addXY(0,20).extent(pt(150, 20)));
    m.getThisValue = function() { return this.onState; };
    m.setThisValue = function(newValue) {
        this.onState = newValue;
	if(this.removed) return;
	if (this.world().firstHand().lastMouseEvent.isShiftDown()) {
		// shift-click means remove profiling
    		Object.profiler(profilee, "stop");
            	if (this.statsMorph != null) this.statsMorph.remove();
		this.remove();
		this.removed = true;
		return;
	}	
        if (newValue == false) { // on mouseup...
            if (this.statsMorph == null) {
                this.statsMorph = new TextMorph(this.bounds().bottomLeft().extent(pt(250,20)), "no text");
                WorldMorph.current().addMorph(this.statsMorph); 
            }
            var tallies = Object.profiler(profilee, "tallies");
            var ticks = Object.profiler(profilee, "ticks");
            var statsArray = [];
            
            for (var field in tallies) {
                if (tallies[field] instanceof Function) continue;
                if (tallies[field] == 0) continue;
                
                statsArray.push([tallies[field], ticks[field], field]);
            }

            statsArray.sort(function(a,b) {return b[1]-a[1];});
            var statsText = "";
            if (title) statsText += title + "\n";
            statsText += "tallies : ticks : methodName\n";
            statsText += statsArray.invoke('join', ' : ').join('\n');
            this.statsMorph.setTextString(statsText);
            Object.profiler(profilee, "reset"); 
        } 
    }
    m.connectModel({model: m, getValue: "getThisValue", setValue: "setThisValue"});
    WorldMorph.current().addMorph(m);
    var t = new TextMorph(m.bounds().extent().extentAsRectangle(), 'Display and reset stats').beLabel();
    m.addMorph(t);
};


// ===========================================================================
// The even-better Execution Tracer
// ===========================================================================
(function() { // begin scoping function
	// The Execution Tracer is enabled by setting Config.debugExtras = true in localconfig.js.
	// When this is done, every method of every user class is wrapped by tracingWrapper (q.v.),
	// And the entire system is running with a shadow stack being maintained in this way.

	// This execution tracer maintains a separate stack or tree of called methods.
	// The variable 'currentContext' points to a TracerNode for the currently executing
	// method.  The caller chain of that node represents the JavaScript call stack, and
	// each node gives its method (which has been tagged with its qualifiedMethodName() ),
	// and also the receiving object, 'itsThis', and the arguments to the call, 'args'.
	// The end result can be seen in, eg, Function.showStack(), which displays a stack trace
	// either in the console or in the StackViewer.  You can test this by invoking
	// "test showStack" in the menu of any morph.

	// At key points in the Morphic environment (like at the beginning of event dispatch and
	// ticking behavior), the stack environment gets reinitialized by a call to 
	// Function.resetDebuggingStack().  This prevents excessively long chains from being
	// held around wasting storage.

	// The tracingWrapper function is the key to how this works.  It calls traceCall()
	// before each method execution, and traceReturn() afterwards.  The important thing
	// is that these messages are sent to the currentContext object.  Therefore the same
	// wrapper works to maintain a simple call stack as well as a full tally and time
	// execution profile.  In the latter case, currentContext and other nodes of the tracing
	// structure are instances of TracerTreeNode, rather than TracerStackNode
	// 
	// A minor demonstration of flexibility is that turning Function.prototype.logCalls
	// to true causes the tracer to spew records of every call to the console.  Don't forget
	// to turn it off ;-).

	// This mechanism can perform much more amazing feats with the use of TracerTreeNode.
	// Here the nodes stay in place, accumulating call tallies and ticks of the millisecond
	// clock.  You start it by calling Function.trace() with a function to run (see the example
	// in Function.testTrace()).  As in normal stack tracing, the value of currentContext is
	// the node associated with the currently running method.

    var rootContext, currentContext;

    Object.subclass('TracerStackNode', {
	initialize: function(caller, method) {
	    this.caller = caller;
	    this.method = method;
	    this.itsThis = null;  // These two get nulled after return
	    this.args = null;  //  .. only used for stack trace on error
	    this.callee = null;
	},
        traceCall: function(method , itsThis, args) {
	    // this is the currentContext (top of stack)
	    // method has been called with itsThis as receiver, and args as arguments
	    // --> Check here for exceptions
	    var newNode = this.callee;  // recycle an old callee node
	    if (!newNode) {             // ... or make a new one
		newNode = new TracerStackNode(this, method);
		this.callee = newNode;
	    } else {
		newNode.method = method;
	    }
	    newNode.itsThis = itsThis;
	    newNode.args = args;
	    if (Function.prototype.logAllCalls) console.log(this.dashes(this.stackSize()) + this);
	    currentContext = newNode;
	},
        traceReturn: function(method) {
	    // this is the currentContext (top of stack)
	    // method is returning
	    this.args = null;  // release storage from unused stack
	    this.itsThis = null;  //   ..
	    currentContext = this.caller;
	},
	each: function(funcToCall) {
	    // Stack walk (leaf to root) applying function
	    for (var c = this; c; c=c.caller) funcToCall(this, c);
	},
	stackSize: function() {
	    var size = 0;
	    for (var c = this; c; c=c.caller) size++;
	    return size;
	},
	dashes: function(n) {
	    var lo = n% 5;
	    return '----|'.times((n-lo)/5) + '----|'.substring(0,lo);
	},
	toString: function() {
	    return "<" + this.method.qualifiedMethodName() + ">";
	}
    });
    
    TracerStackNode.subclass('TracerTreeNode', {
	initialize: function($super, caller, method) {
	    $super(caller, method);
	    this.callees = {};
	    this.tally = 0;
	    this.ticks = 0;
	    this.calltime = null;
	    //console.log("adding node for " + method.qualifiedMethodName());
	},
        traceCall: function(method , itsThis, args) {
	    // this is the currentContext (top of stack)
	    // method has been called with itsThis as receiver, and args as arguments
	    // --> Check here for exceptions
	    var newNode = this.callees[method];
	    if (!newNode) {
		// First hit -- need to make a new node
		newNode = new TracerTreeNode(this, method);
		this.callees[method] = newNode;
	    }
	    newNode.itsThis = itsThis;
	    newNode.args = args;
	    newNode.tally ++;
	    newNode.callTime = new Date().getTime();
	    currentContext = newNode;
	},
        traceReturn: function(method) {
	    // this is the currentContext (top of stack)
	    // method is returning
	    //if(stackNodeCount < 20) console.log("returning from " + method.qualifiedMethodName());
	    this.args = null;  // release storage from unused stack info
	    this.itsThis = null;  //   ..
	    this.ticks += (new Date().getTime() - this.callTime);
	    currentContext = this.caller;
	},
	each: function(funcToCall, level, sortFunc) {
	    // Recursive tree visit with callees order parameter (eg, tallies, ticks, alpha)
	    if (level == null) level = 0;
	    funcToCall(this, level);
	    var sortedCallees = [];
	    Properties.forEachOwn(this.callees, function(meth, node) { sortedCallees.push(node); })
	    if(sortedCallees.length == 0) return;
	    // Default is to sort by tallies, and then by ticks if they are equal (often 0)
	    sortedCallees.sort(sortFunc || function(a, b) {
		if(a.tally == b.tally) return (a.ticks > b.ticks) ? -1 : (a.ticks < b.ticks) ? 1 : 0; 
		return (a.tally > b. tally) ? -1 : 1});
	    sortedCallees.each(function(node) { node.each(funcToCall, level+1, sortFunc); });
	},
	fullString: function() {
	    var str = "Execution profile (#calls / #ticks)\n";
	    this.each(function(each, level) { str += (this.dashes(level) + each + "\n"); }.bind(this), 0, null);
	    return str;
	},
	toString: function() {
	    return '(' + this.tally.toString() + ' / ' + this.ticks.toString() + ') ' + this.method.qualifiedMethodName();
	}
    });
    
    Object.extend(Function, {
	
	resetDebuggingStack: function resetDebuggingStack() {
	    var rootMethod = arguments.callee.caller;
	    rootContext = new TracerStackNode(null, rootMethod);
	    currentContext = rootContext;
	    Function.prototype.logAllCalls = false;
	},
	
        showStack: function(useViewer) {
            if (useViewer) { new StackViewer(this, currentContext).open(); return; }
	    
            if (Config.debugExtras) {
                for (var c = currentContext, i = 0; c != null; c = c.caller, i++) {
                    var args = c.args;
		    if (!args) {
			console.log("no frame at " + i);
			continue;
		    }
                    var header = Object.inspect(args.callee.originalFunction);
                    var frame = i.toString() + ": " + header + "\n";
		    frame += "this: " + c.itsThis + "\n";
		    var k = header.indexOf('(');
                    header = header.substring(k + 1, 999);  // ')' or 'zort)' or 'zort,baz)', etc
                    for (var j = 0; j <args.length; j++) {
                        k = header.indexOf(')');
                        var k2 = header.indexOf(',');
                        if (k2 >= 0) k = Math.min(k,k2);
                        var argName = header.substring(0, k);
                        header = header.substring(k + 2);
                        if (argName.length > 0) frame += argName + ": " + Object.inspect(args[j]) + "\n";
		    }
                    console.log(frame);
		    if (i >= 500) {
			console.log("stack overflow?");
			break;
		    }
                }
            } else {
		var visited = [];
                for (var c = arguments.callee.caller, i = 0; c != null; c = c.caller, i++) {
                    console.log("%s: %s", i, Object.inspect(c));
		    if (visited.indexOf(c) >= 0) {
			console.log("possible recursion");
			break;
		    } else visited.push(c);
		    if (i > 500) {
			console.log("stack overflow?");
			break;
		    }
                }
            }
        },
	
        testTrace: function() {
	    Function.trace(function () { for (var i=0; i<10; i++) RunArray.test([3, 1, 4, 1, 5, 9]); });
	},
	
        trace: function(method) {
	    // Note: trace returns the trace root, not the value of the traced method
	    // If you need the return value, you'll need to store it elsewhwere from the method
	    var traceRoot = new TracerTreeNode(currentContext, method);
	    currentContext = traceRoot;
	    result = method.call(this);
	    currentContext = traceRoot.caller;
	    traceRoot.caller = null;
	    console.log(traceRoot.fullString());
	    return traceRoot;
	},
	
        installStackTracers: function(remove) {
	    console.log("Wrapping all methods with tracingWrapper... " + (remove || ""));
            remove = (remove == "uninstall");  // call with this string to uninstall
            Class.withAllClassNames(Global, function(cName) { 
		if (cName.startsWith('SVG') || cName.startsWith('Tracer')) return;
                if (cName == 'Global' || cName == 'Object') return;
                var theClass = Global[cName];
                var methodNames = theClass.localFunctionNames();
		
                // Replace all methods of this class with a wrapped version
		for (var mi = 0; mi < methodNames.length; mi++) {
                    var mName = methodNames[mi];
                    var originalMethod = theClass.prototype[mName];
		    // Put names on the original methods 
                    originalMethod.declaredClass = cName;
                    originalMethod.methodName = mName;
                    // Now replace each method with a wrapper function (or remove it)
                    if (mName != "constructor") { // leave the constructor alone
			if(!remove) theClass.prototype[mName] = originalMethod.tracingWrapper();
			else if(originalMethod.originalFunction) theClass.prototype[mName] = originalMethod.originalFunction;
		    }
                }
		// Do the same for class methods (need to clean this up)
		var classFns = []; 
		for (var p in theClass) {
		    if (theClass.hasOwnProperty(p) && theClass[p] instanceof Function && p != "superclass")
			classFns.push(p);
		}
                for (var mi = 0; mi < classFns.length; mi++) {
                    var mName = classFns[mi];
                    var originalMethod = theClass[mName];
		    // Put names on the original methods 
                    originalMethod.declaredClass = cName;
                    originalMethod.methodName = mName;
                    // Now replace each method with a wrapper function (or remove it)
                    if (mName != "constructor") { // leave the constructor alone
			if(!remove) theClass[mName] = originalMethod.tracingWrapper();
			else if(originalMethod.originalFunction) theClass[mName] = originalMethod.originalFunction;
		    }
                }
            });
        },
        tallyLOC: function() {
            console.log("Tallying lines of code by decompilation");
            var classNames = [];
            Class.withAllClassNames(Global, function(n) { n.startsWith('SVG') || classNames.push(n)});
            classNames.sort();
            var tallies = "";
            for (var ci= 0; ci < classNames.length; ci++) {
                var cName = classNames[ci];
                if (cName != 'Global' && cName != 'Object') {
                    var theClass = Global[cName];
                    var methodNames = theClass.localFunctionNames();
                    var loc = 0;
                    for (var mi = 0; mi < methodNames.length; mi++) {
                        var mName = methodNames[mi];
                        var originalMethod = theClass.prototype[mName];
                        // decompile and count lines with more than one non-blank character
                        var lines = originalMethod.toString().split("\n");
                        lines.each( function(line) { if(line.replace(/\s/g, "").length>1) loc++ ; } );
                    }
                }
                console.log(cName + " " + loc.toString());
                // tallies += cName + " " + loc.toString() + "\n";
            }
        }
    });
    
    Object.extend(Function.prototype, {
	
        logCalls: false, // turn on the prototype value to get tracing globally.
		// Turn off individually for "hidden" functions.
	
        tracingWrapper: function () {
	    // Make a proxy method (traceFunc) that calls the tracing routines before and after this method
	    var traceFunc = function () {
		var originalFunction = arguments.callee.originalFunction; 
		if( !currentContext) return originalFunction.apply(this, arguments);  // not started yet
		currentContext.traceCall(originalFunction, this, arguments);
                var result = originalFunction.apply(this, arguments); 
                currentContext.traceReturn(originalFunction);
                return result; 
            };
            traceFunc.originalFunction = this;  // Attach this (the original function) to the tracing proxy
            return traceFunc;
        }
    });
    
})(); // end scoping function


// ===========================================================================
// Call Stack Viewer
// ===========================================================================
WidgetModel.subclass('StackViewer', {

    defaultViewTitle: "Call Stack Viewer",
    openTriggerVariable: 'getFunctionList',

    initialize: function($super, param, currentCtxt) {
        $super();
        this.selected = null;
        if (Config.debugExtras) {
            this.stack = [];
            this.thises = [];
            this.argses = [];
            for (var c = currentCtxt; c != null; c = c.caller) {
                this.thises.push (c.itsThis);
                this.argses.push (c.args);
                this.stack.push (c.method);
            }
        } else {
            // if no debugStack, at least build an array of methods
            this.stack = [];
            for (var c = arguments.callee.caller; c != null; c = c.caller) {
                this.stack.push (c);
            }
        }
    },

    getFunctionList: function() {
        var list = [];

        for (var i = 0; i < this.stack.length; i++) {
            list.push(i + ": " + Object.inspect(this.stack[i]));
        }

        return list;
    },

    setFunctionName: function(n) {
        this.selected = null;
        if (n) {
            var itemNumber = parseInt(n);
            if (!isNaN(itemNumber)) {
                this.stackIndex = itemNumber;
                this.selected = this.stack[itemNumber].toString();
            }
        }
       this.changed("getCodeValue");
       this.changed("getVariableList");
    },

    getCodeValue: function() {
        if (this.selected) return this.selected;
        else return "no value";
    },

    setCodeValue: function() { return; },

    getVariableList: function () {
        if (this.selected) {
            var ip = this.selected.indexOf(")");
            if (ip<0) return ["this"];
            varString = this.selected.substring(0,ip);
            ip = varString.indexOf("(");
            varString = varString.substring(ip+1);
            this.variableNames = (varString.length == 0)
                ? ["this"]
                : ["this"].concat(varString.split(", "));
            return this.variableNames
        }
        else return ["----"];
    },

    setVariableName: function(n) {
        this.variableValue = null;
        if (this.variableNames) {
            for (var i = 0; i < this.variableNames.length; i++) {
                if (n == this.variableNames[i]) {
                    this.variableValue = (n == "this")
                        ? this.thises[this.stackIndex]
                        : this.argses[this.stackIndex][i-1];
                    break;
                }
            }
        }
        this.changed("getVariableValue");
    },

    getVariableValue: function(n) {
        return Object.inspect(this.variableValue);
    },

    buildView: function(extent) { 
        var panel;
        if (! this.argses) {
            panel = PanelMorph.makePanedPanel(extent, [
                ['stackPane', newListPane, new Rectangle(0, 0, 0.5, 1)],
                ['codePane', newTextPane, new Rectangle(0.5, 0, 0.5, 1)]
            ]);
            panel.stackPane.connectModel({model: this, getList: "getFunctionList", setSelection: "setFunctionName"});
            panel.codePane.connectModel({model: this, getText: "getCodeValue", setText: "setCodeValue"});
        } else {
            panel = PanelMorph.makePanedPanel(extent, [
                ['stackPane', newListPane, new Rectangle(0, 0, 0.5, 0.6)],
                ['codePane', newTextPane, new Rectangle(0.5, 0, 0.5, 0.6)],
                ['variablePane', newListPane, new Rectangle(0, 0.6, 0.5, 0.4)],
                ['valuePane', newTextPane, new Rectangle(0.5, 0.6, 0.5, 0.4)]
            ]);
            panel.stackPane.connectModel({model: this, getList: "getFunctionList", setSelection: "setFunctionName"});
            panel.codePane.connectModel({model: this, getText: "getCodeValue", setText: "setCodeValue"});
            panel.variablePane.connectModel({model: this, getList: "getVariableList", setSelection: "setVariableName"});
            panel.valuePane.connectModel({model: this, getText: "getVariableValue", setText: "setVariableValue"});
        }
        return panel;
    }
});


// ===========================================================================
// FrameRateMorph
// ===========================================================================
TextMorph.subclass('FrameRateMorph', {

    initialize: function($super, rect, textString) {
        $super(rect, textString);
        this.reset(new Date());
    },

    reset: function(date) {
        this.lastTick = date.getSeconds();
        this.lastMS = date.getTime();
        this.stepsSinceTick = 0;
        this.maxLatency = 0;
    },

    nextStep: function() {
        var date = new Date();
        this.stepsSinceTick ++;
        var nowMS = date.getTime();
        this.maxLatency = Math.max(this.maxLatency, nowMS - this.lastMS);
        this.lastMS = nowMS;
        var nowTick = date.getSeconds();
        if (nowTick != this.lastTick) {
            this.lastTick = nowTick;
            var ms = (1000 / Math.max(this. stepsSinceTick,1)).roundTo(1);
            this.setTextString(this.stepsSinceTick + " frames/sec (" + ms + "ms avg),\nmax latency " + this.maxLatency + " ms.");
            this.reset(date);
        }
    },

    startSteppingScripts: function() { this.startStepping(1,'nextStep'); }

});


// ===========================================================================
// File Parser
// ===========================================================================
Object.subclass('FileParser', {
    // The bad news is: this is not a real parser ;-)
    // It simply looks for class headers, and method headers,
    // and everything in between gets put with the preceding header
    // The good news is:  it can deal with any file,
    // and it does something useful 99 percent of the time ;-)
    // ParseFile() produces an array of SourceCodeDescriptors
    // If mode == "scan", that's all it does
    // If mode == "search", it only collects descriptors for code that matches the searchString
    // If mode == "import", it builds a source code index in SourceControl for use in the browser

    parseFile: function(fname, version, fstr, db, mode, str) {
        // Scans the file and returns changeList -- a list of informal divisions of the file
        // It should be the case that these, in order, exactly contain all the text of the file
        // Note that if db, a SourceDatabase, is supplied, it will be loaded during the scan
        var ms = new Date().getTime();
        this.fileName = fname;
        this.versionNo = version;
        this.sourceDB = db;
        this.mode = mode;  // one of ["scan", "search", "import"]
        if (mode == "search") this.searchString = str;

        this.verbose = false;
        // this.verbose = (fname == "Examples.js");
        this.ptr = 0;
        this.lineNo = 0;
        this.changeList = [];
        if (this.verbose) console.log("Parsing " + this.fileName + ", length = " + fstr.length);
        this.currentDef = {type: "preamble", startPos: 0, lineNo: 1};
        this.lines = fstr.split(/[\n\r]/);

        while (this.lineNo < this.lines.length) {
            var line = this.nextLine();
            if (this.verbose) console.log("lineNo=" + this.lineNo + " ptr=" + this.ptr + line); 
            if (this.lineNo > 100) this.verbose = false;

            if (this.scanComment(line)) {
            } else if (this.scanClassDef(line)) {
            } else if (this.scanMethodDef(line)) {
            } else if (this.scanMainConfigBlock(line)) {
            } else if (this.scanBlankLine(line)) {
            } else this.scanOtherLine(line);
        }
        this.ptr = fstr.length;
        this.processCurrentDef();
        ms = new Date().getTime() - ms;
        console.log(this.fileName + " scanned; " + this.changeList.length + " patches identified in " + ms + " ms.");
        return this.changeList;
    },

    scanComment: function(line) {
        if (line.match(/^[\s]*\/\//) ) {
            if (this.verbose) console.log("// comment: "+ line);
            return true;
        }

        if (line.match(/^[\s]*\/\*/) ) {
            // Attempt to recognize match on one line...
            if (line.match(/^[\s]*\/\*[^\*]*\*\//) ) {
                if (this.verbose) console.log("short /* comment: "+ line);
                return true; 
            }

            // Note that /* and matching */ must be first non-blank chars on a line
            var saveLineNo = this.lineNo;
            var saveLine = line;
            var savePtr = this.ptr;
            if (this.verbose) console.log("long /* comment: "+ line + "...");
            do {
                if (this.lineNo >= this.lines.length) {
                    console.log("Unfound end of long comment beginning at line " + (saveLineNo +1));
                    this.lineNo = saveLineNo;
                    this.currentLine = saveLine;
                    this.ptr = savePtr;
                    return true;
                }
                more = this.nextLine()
            } while ( ! more.match(/^[\s]*\*\//) );

            if (this.verbose) console.log("..." + more);
            return true;
        }

        return false;
    },

    scanClassDef: function(line) {
        // *** Need to catch Object.extend both Foo and Foo.prototype ***
        var match = line.match(/^[\s]*([\w]+)\.subclass\([\'\"]([\w]+)[\'\"]/);
        if (match == null) {
            var match = line.match(/^[\s]*([\w]+)\.subclass\(Global\,[\s]*[\'\"]([\w]+)[\'\"]/);
        }
        if (match == null)  return false;
        this.processCurrentDef();
        if (this.verbose) console.log("Class def: " + match[1] + "." + match[2]);
        this.currentDef = {type: "classDef", name: match[2], startPos: this.ptr, lineNo: this.lineNo};
        return true;
    },

    scanMethodDef: function(line) {
        var match = line.match(/^[\s]*([\w]+)\:/);
        if (match == null) return false;
        this.processCurrentDef();
        if (this.verbose) console.log("Method def: " + this.currentClassName + "." + match[1]);
        this.currentDef = {type: "methodDef", name: match[1], startPos: this.ptr, lineNo: this.lineNo};
        return true;
    },

    scanMainConfigBlock: function(line) {    // Special match for Config blocks in Main.js
        var match = line.match(/^[\s]*(if\s\(Config.show[\w]+\))/);
        if (match == null) return false;
        this.processCurrentDef();
        if (this.verbose) console.log("Main Config: " + this.currentClassName + "." + match[1]);
        this.currentDef = {type: "mainConfig", name: match[1], startPos: this.ptr, lineNo: this.lineNo};
        return true;
    },

    processCurrentDef: function() {
        // this.ptr now points at a new code section.
        // Terminate the currently open definition and process accordingly
        // We will want to do a better job of finding where it ends
        var def = this.currentDef;
        if (this.ptr == 0) return;  // we're being called at new def; if ptr == 0, there's no preamble
        def.endPos = this.ptr-1;  // don't include the newLine
        var descriptor = new SourceCodeDescriptor (this.sourceDB, this.fileName, this.versionNo, def.startPos, def.endPos, def.lineNo, def.type, def.name);

        if (this.mode == "scan") {
            this.changeList.push(descriptor);
        } else if (this.mode == "search") {
            if (this.matchStringInDef(this.searchString)) this.changeList.push(descriptor);
        } else if (this.mode == "import") {
            if (def.type == "classDef") {
                this.currentClassName = def.name;
                this.sourceDB.methodDictFor(this.currentClassName)["*definition"] = descriptor;
            } else if (def.type == "methodDef") {
                this.sourceDB.methodDictFor(this.currentClassName)[def.name] = descriptor;
            }
            this.changeList.push(descriptor);
        }
        this.currentDef = null;
    },
    
    scanBlankLine: function(line) {
        if (line.match(/^[\s]*$/) == null) return false;
        if (this.verbose) console.log("blank line");
        return true;
    },
    
    scanOtherLine: function(line) {
        // Should mostly be code body lines
        if (this.verbose) console.log("other: "+ line); 
        return true;
    },
    
    matchStringInDef: function(str) {
        for (var i=this.currentDef.lineNo-1; i<this.lineNo-1; i++) {
            if (this.lines[i].indexOf(str) >=0) return true;
        }
        return false;
    },
    
    nextLine: function() {
        if (this.lineNo > 0) this.ptr += (this.currentLine.length+1);
        if (this.lineNo < this.lines.length) this.currentLine = this.lines[this.lineNo];
        else this.currentLine = '';
        if (!this.currentLine) this.currentLine = '';  // Split puts nulls instead of zero-length strings!
        this.lineNo++;
        return this.currentLine;
    }
    
});


// ===========================================================================
// ChangeList
// ===========================================================================
WidgetModel.subclass('ChangeList', {
    // The ChangeListBrowser views a list of patches in a JavaScript (or other) file.
    // The patches taken together entirely capture all the text in the file
    // The quality of the fileParser determines how well the file patches correspond
    // to meaningful JavaScript entities.  A changeList accumulated from method defs
    // during a development session should (;-) be completely well-formed in this regard.
    // Saving a change in a ChangeList browser will only edit the file;  no evaluation is implied
    
    defaultViewExtent: pt(400,250),
    openTriggerVariable: 'getChangeBanners',

    initialize: function($super, title, ignored, changes) {
        $super();
        this.title = title;
        this.changeList = changes;
    },
    
    getChangeBanners: function() {
        this.changeBanner = null;
        return this.changeList.map(function(each) { return this.bannerOfItem(each); }, this);
    },

    setChangeSelection: function(n, v) {
        this.changeBanner = n;
        this.changed("getChangeSelection", v);
        this.changed("getChangeItemText", v);
        if (this.searchString) this.changed("getSearchString", v);
    },

    getChangeSelection: function() {
        return this.changeBanner;
    },

    selectedItem: function() {
        if (this.changeBanner == null) return null;
        var i1 = this.changeBanner.indexOf(":");
        var i2 = this.changeBanner.indexOf(":", i1+1);
        var lineNo = this.changeBanner.substring(i1+1, i2);
        lineNo = new Number(lineNo);
        for (var i=0; i < this.changeList.length; i++) {
            var item = this.changeList[i];
            // Note: should confirm fileName here as well for search lists
            // where lineNo might match, but its a different file
            if (item.lineNo == lineNo) return item;
        }
        return null;
    },

    bannerOfItem: function(item) {
        var lineStr = item.lineNo.toString();
        var firstLine = item.getSourceCode().truncate(40);  // a bit wastefull
        if (firstLine.indexOf("\r") >= 0) firstLine = firstLine.replace(/\r/g, "");
        end = firstLine.indexOf(":");
        if (end >= 0) firstLine = firstLine.substring(0,end+1);
        return item.fileName.concat(":", lineStr, ": ", firstLine);
    },

    getChangeItemText: function() {
        var item = this.selectedItem();
        if (item == null) return "-----";
        return item.getSourceCode();
    },

    setChangeItemText: function(newString, view) {
        var item = this.selectedItem();
        if (item == null) return;

        var originalString = view.textBeforeChanges;
        var fileString = item.getSourceCode();
        if (originalString == fileString) {
            this.checkBracketsAndSave(item, newString, view);
            return;
        }

        WorldMorph.current().notify("Sadly it is not possible to save this text because\n"
            + "the original text appears to have been changed elsewhere.\n"
            + "Perhaps you could copy what you need to the clipboard, browse anew\n"
            + "to this code, repeat your edits with the help of the clipboard,\n"
            + "and finally try to save again in that new context.  Good luck.");
        },

    checkBracketsAndSave: function(item, newString, view) {
        var errorIfAny = this.checkBracketError(newString);
        if (! errorIfAny) {this.reallySaveItemText(item, newString, view); return; }

        var msg = "This text contains an unmatched " + errorIfAny + ";\n" +
                  "do you wish to save it regardless?";
        WorldMorph.current().confirm(msg, function (answer) {
            if (answer) this.reallySaveItemText(item, newString, view); }.bind(this));
    },

    reallySaveItemText: function(item, newString, editView) {
        item.putSourceCode(newString);
        editView.acceptChanges();

        // Now recreate (slow but sure) list from new contents, as things may have changed
        if (this.searchString) return;  // Recreating list is not good for searches
        var oldSelection = this.changeBanner;
        this.changeList = item.newChangeList();
        this.changed('getChangeBanners');
        this.setChangeSelection(oldSelection);  // reselect same item in new list (hopefully)
    },

    checkBracketError: function (str) {
        // Return name of unmatched bracket, or null
        var cnts = {};
        cnts.nn = function(c) { return this[c] || 0; };  // count or zero
        for (var i=0; i<str.length; i++)  // tally all characters
            { cnts[ str[i] ] = cnts.nn(str[i]) +1 };
        if (cnts.nn("{") > cnts.nn("}")) return "open brace";
        if (cnts.nn("{") < cnts.nn("}")) return "close brace";
        if (cnts.nn("[") > cnts.nn("]")) return "open bracket";
        if (cnts.nn("[") < cnts.nn("]")) return "close bracket";
        if (cnts.nn("(") > cnts.nn(")")) return "open paren";
        if (cnts.nn("(") < cnts.nn(")")) return "close paren";
        if (cnts.nn('"')%2 != 0) return "double quote";  // "
        if (cnts.nn("'")%2 != 0) return "string quote";  // '
        return null; 
    },

    getSearchString: function() {
        return this.searchString;
    },

    viewTitle: function() {
        return "Change list for " + this.title;
    },

    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['topPane', newListPane, new Rectangle(0, 0, 1, 0.5)],
            ['bottomPane', newTextPane, new Rectangle(0, 0.5, 1, 0.5)]
        ]);
        var m = panel.topPane;
        m.connectModel({model: this, getList: "getChangeBanners", setSelection: "setChangeSelection", getSelection: "getChangeSelection", getMenu: "getListPaneMenu"});
        m = panel.bottomPane;
        m.innerMorph().textSelection.borderRadius = 0;
        m.connectModel({model: this, getText: "getChangeItemText", setText: "setChangeItemText", getSelection: "getSearchString", getMenu: "default"});
        return panel;
    }

});  // ({ balance


// ===========================================================================
// Source Database
// ===========================================================================
ChangeList.subclass('SourceDatabase', {
    // SourceDatabase is an interface to the Lively Kernel source code as stored
    // in a CVS-style repository, ie, as a bunch of text files.

    // First of all, it is capable of scanning all the source files, and breaking
    // them up into reasonable-sized pieces, hopefully very much like the
    // actual class defs and method defs in the files.  The partitioning is done
    // by FileParser and it, in turn, calls setDescriptorInClassForMethod to
    // store the source code descriptors for these variously recognized pieces.

    // In the process, it caches the full text of some number of these files for
    // fast access in subsequent queries, notably alt-w or "where", that finds
    // all occurrences of the current selection.  The result of such searches
    // is presented as a changeList.

    // The other major service provided by SourceDatabase is the ability to 
    // retrieve and alter pieces of the source code files without invalidating
    // previously scanned changeList-style records.

    // A sourceCodeDescriptor (q.v.) has a file name and version number, as well as 
    // start and stop character indices.  When a piece of source code is changed,
    // it will likely invalidate all the other sourceCodePieces that point later
    // in the file.  However, the SourceDatabase is smart (woo-hoo); it knows
    // where previous edits have been made, and what effect they would have had
    // on character ranges of older pieces.  To this end, it maintains an internal
    // version number for each file, and an edit history for each version.

    // With this minor bit of bookkeeping, the SourceDataBase is able to keep
    // producing source code pieces from old references to a file without the need
    // to reread it.  Moreover, to the extent its cache can keep all the
    // file contents, it can do ripping-fast scans for cross reference queries.
    //
    // cachedFullText is a cache of file contents.  Its keys are file names, and
    // its values are the current contents of the named file.

    // editHistory is a parallel dictionary of arrays of edit specifiers.

    // A SourceDatabase is created in response to the 'import sources' command
    // in the browser's classPane menu.  The World color changes to contrast that
    // (developer's) world with any other window that might be testing a new system
    // under develpment.

    // For now, we include all the LK sources, or at least all that you would usually
    // want in a typical development session.  We may soon want more control
    // over this and a reasonable UI for such control.

    initialize: function($super) {
        this.methodDicts = {};
        this.cachedFullText = {};
        this.editHistory = {};
    },

    methodDictFor: function(className) {
        if (!this.methodDicts[className]) this.methodDicts[className] = {}; 
        return this.methodDicts[className];
    },

    getSourceInClassForMethod: function(className, methodName) {
        var methodDict = this.methodDictFor(className);
        var descriptor = methodDict[methodName];
        if (!descriptor) return null;
        // *** Needs version edit tweaks...
        var fullText = this.getCachedText(descriptor.fileName);
        if (!fullText) return null;
        return fullText.substring(descriptor.startIndex, descriptor.stopIndex);
    },

    setDescriptorInClassForMethod: function(className, methodName, descriptor) {
        var methodDict = this.methodDictFor(className);
        methodDict[methodName] = descriptor;
    },

    browseReferencesTo: function(str) {
        var fullList = this.searchFor(str);
        if (fullList.length > 300) {
            WorldMorph.current().notify(fullList.length.toString() + " references abbreviated to 300.");
            fullList = fullList.slice(0,299);
        }
        var refs = new ChangeList("References to " + str, null, fullList);
        refs.searchString = str;
        refs.openIn(WorldMorph.current()); 
    },

    searchFor: function(str) {
        var fullList = [];
        Properties.forEachOwn(this.cachedFullText, function(fileName, fileString) {
            var refs = new FileParser().parseFile(fileName, this.currentVersion(fileName), fileString, this, "search", str);
            fullList = fullList.concat(refs);
        }, this);
        return fullList;
    },

    scanKernelFiles: function(list) {
        for (var i = 0; i<list.length; i++) {
            var fileName = list[i];
            var fileString = this.getCachedText(fileName);
            new FileParser().parseFile(fileName, this.currentVersion(fileName), fileString, this, "import");
        }
    },

    getSourceCodeRange: function(fileName, versionNo, startIndex, stopIndex) {
        // Remember the JS convention that str[stopindex] is not included!!
        var fileString = this.getCachedText(fileName);
        var mapped = this.mapIndices(fileName, versionNo, startIndex, stopIndex);
        return fileString.substring(mapped.startIndex, mapped.stopIndex);
    },

    putSourceCodeRange: function(fileName, versionNo, startIndex, stopIndex, newString) {
        var fileString = this.getCachedText(fileName);
        var mapped = this.mapIndices(fileName, versionNo, startIndex, stopIndex);
        var beforeString = fileString.substring(0, mapped.startIndex);
        var afterString = fileString.substring(mapped.stopIndex);
        var newFileString = beforeString.concat(newString, afterString);
        newFileString = newFileString.replace(/\r/gi, '\n');  // change all CRs to LFs
        var editSpec = {repStart: startIndex, repStop: stopIndex, repLength: newString.length};
        console.log("Saving " + fileName + "...");
        new NetRequest({model: new NetRequestReporter(), setStatus: "setRequestStatus"}
                ).put(URL.source.withFilename(fileName), newFileString);
        // Update cache contents and edit history
        this.cachedFullText[fileName] = newFileString;
        this.editHistory[fileName].push(editSpec);
        console.log("... " + newFileString.length + " bytes saved.");
    },

    mapIndices: function(fileName, versionNo, startIndex, stopIndex) {
        // Figure how substring indices must be adjusted to find the same characters in the fileString
        // given its editHistory.
        // Note: This assumes only three cases: range above replacement, == replacement, below replacement
        // It should check for range>replacement or range<replacement and either indicate error or
        // possibly deal with it (our partitioning may be tractable)
        var edits = this.editHistory[fileName].slice(versionNo);
        var start = startIndex;  var stop = stopIndex;
        for (var i=0; i<edits.length; i++) {  // above replacement
            var edit = edits[i];
            var delta = edit.repLength - (edit.repStop - edit.repStart);  // patch size delta
            if (start >= edit.repStop) {  // above replacement
                start += delta;
                stop += delta;
            } else if (start == edit.repStart && stop == edit.repStop) {  // identical to replacement
                stop += delta;
            }  // else below the replacement so no change
        }  
        return {startIndex: start, stopIndex: stop};
    },

    changeListForFileNamed: function(fileName) {
        var fileString = this.getCachedText(fileName);
        return new FileParser().parseFile(fileName, this.currentVersion(fileName), fileString, this, "scan");
    },

    currentVersion: function(fileName) {
        // Expects to be called only when fileName will be found in cache!
        return this.editHistory[fileName].length;
    },

    getCachedText: function(fileName) {
        // Return full text of the named file, installing it in cache if necessary
        var fileString = this.cachedFullText[fileName];  
        if (fileString == null) { // Not in cache;  fetch and install
            fileString = this.getFileContents(fileName);
            this.cachedFullText[fileName] = fileString;
            this.editHistory[fileName] = [];
        }
        return fileString;
    },

    getFileContents: function(fileName) { // convenient helper method
        var ms = new Date().getTime();
        var fileString = new NetRequest().beSync().get(URL.source.withFilename(fileName)).getResponseText();
        ms = new Date().getTime() - ms;
        console.log(fileName + " read in " + ms + " ms.");
        return fileString;
    },

    viewTitle: function() {
        return "Source Control for " + this.fileName;
    }

});

module.SourceControl = null;


// ===========================================================================
// Source Code Descriptor
// ===========================================================================
Object.subclass('SourceCodeDescriptor', {

    initialize: function(sourceControl, fileName, versionNo, startIndex, stopIndex, lineNo, type, name) {
	// This state represents a given range of a given version of a given file in the SourceControl
	// The lineNo, type and name are further info arrived at during file parsing
        this.sourceControl = sourceControl;
        this.fileName = fileName;
        this.versionNo = versionNo;
        this.startIndex = startIndex;
        this.stopIndex = stopIndex;
        this.lineNo = lineNo;
        this.type = type;  // Do these need to be retained?
        this.name = name;
    },

    getSourceCode: function() {
        return this.sourceControl.getSourceCodeRange(this.fileName, this.versionNo, this.startIndex, this.stopIndex);
    },

    putSourceCode: function(newString) {
        this.sourceControl.putSourceCodeRange(this.fileName, this.versionNo, this.startIndex, this.stopIndex, newString);
    },

    newChangeList: function() {
        return this.sourceControl.changeListForFileNamed(this.fileName);
    }

});

View.subclass('CodeMarkupParser', {
    documentation: "Evaluates code in the lkml code format",
    // this is the first attempt, format subject to change
    classQuery: new Query("/code/class"),
    protoQuery: new Query("proto"),
    staticQuery: new Query("static"),
    
    initialize: function(url) {
	var model = new SyntheticModel(["Document"]);
	this.resource = new Resource(url, {model: model, setContentDocument: "setDocument"});
	this.resource.forceXML = true;
	this.connectModel({model: model, getDocument: "getDocument"});
    },

    parse: function() {
	this.resource.fetch();
    },
    
    updateView: function(aspect, source) {
        var p = this.modelPlug;
        if (!p) return;
        if (aspect == p.getDocument || aspect == 'all') {
	    this.parseCodeDocument(this.getModelValue("getDocument"));
	}
    },

    parseCodeDocument: function(doc) {
	var classes = this.classQuery.findAll(doc);
	for (var i = 0; i < classes.length; i++) 
	    this.parseClass(classes[i], doc);
	this.onComplete();
    },

    onComplete: function() {
	// override to supply an action 
    }, 

    nameOf: function(element) {
	var name = element.getAttributeNS(null, "name");
	if (!name) throw new Error("no class name");
	return name;
    },

    parseClass: function(element, doc) {
	// note eval oreder first parse proto methods, then static methods.
	var superClass = Global[element.getAttributeNS(null, "super")];
	if (!superClass || !Class.isClass(superClass)) throw new Error('no superclass');

	var className = this.nameOf(element);
	var cls = superClass.subclass(className);
	
	var protos = this.protoQuery.findAll(element);
	for (var i = 0; i < protos.length; i++)
	    this.parseProto(protos[i], cls);

	var statics = this.staticQuery.findAll(element);
	for (var i = 0; i < statics.length; i++)
	    this.parseStatic(statics[i], cls);
    },

    evaluateElement: function(element) {
	try {
	    // use intermediate value because eval doesn't seem to return function
	    // values.
	    // this would be a great place to insert a Cajita evaluator.
	    return eval("CodeMarkupParser._=" + element.textContent);
	} catch (er) { 
	    console.log("error " + er + " parsing " + element.textContent);
	    return undefined;
	}
    },

    parseProto: function(protoElement, cls) {
	var name = this.nameOf(protoElement);
	var mixin = {};
	mixin[name] = this.evaluateElement(protoElement);
	cls.addMethods(mixin);
    },

    parseStatic: function(staticElement, cls) {
	var name = this.nameOf(staticElement);
	cls[name] = this.evaluateElement(staticElement);
    }

});


}).logCompletion("Tools.js")(Global);

