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
        else return Function.methodString(className, methodName); 
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
        m.connectModel({model: model, getList: "getClassList", setSelection: "setClassName", getMenu: "getClassPaneMenu"});
	m.updateView("getClassList");
        m = panel.rightPane;
        m.connectModel({model: model, getList: "getMethodList", setSelection: "setMethodName"});
        m = panel.bottomPane;
 		m.innerMorph().textSelection.borderRadius = 0;
       m.connectModel({model: model, getText: "getMethodString", setText: "setMethodString"});
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
	if (Loader.isLoadedFromNetwork) {
            items.push(['import source files', function() {
                if (! SourceControl) SourceControl = new SourceDatabase();
		SourceControl.scanKernelFiles(["prototype.js", "defaultconfig.js", "localconfig.js",
			"Main.js", "Core.js", "Text.js",
			"Widgets.js", "Network.js", "Storage.js", "Tools.js",
			"Examples.js", "WebPIM.js", "phone.js"]);
		WorldMorph.current().setFill(new RadialGradient(Color.rgb(36,188,255), Color.rgb(127,15,0)));
		}]);
	}
	return items; 
    }
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
            var menu = Morph.prototype.morphMenu.call(this, evt);
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
  
/**
 * @class StylePanel: Interactive style editor for morphs 
 */
   
WidgetModel.subclass('StylePanel', {

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
        this.targetMorph.shape.roundEdgesBy(this.borderRadius = r.roundTo(1));
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
            this.targetMorph.setFill(new LinearGradient(this.color1, this.color2, LinearGradient[this.fillDir]));
        }
    
        if (this.fillType == 'radial gradient')
            this.targetMorph.setFill(new RadialGradient(this.color1, this.color2));
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
	panel.applyStyle({fill: Color.primary.blue.lighter(2), borderWidth: 2});
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
            var menu = Morph.prototype.morphMenu.call(this,evt);
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

/**
 * Dan's JavaScript profiler & debugger
 */
  
Object.profiler = function (object, service) {
    // The wondrous Ingalls profiler...
    // Invoke as, eg, Object.profiler(Color, "start"), or Object.profiler(Color.prototype, "start")
    var stats = {};
    var fnames = object.constructor.functionNames();

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

(function() {

    var debuggingStack = [];
    
    Object.extend(Function, {

	cloneStack: function() {
	    return [].concat(debuggingStack);
	},

        showStack: function(useViewer) {
            stack = debuggingStack;
            if (useViewer) { new StackViewer(this, debuggingStack).open(); return; }

			if (Config.debugExtras) {
               for (var i = 0; i < stack.length; i+=2) {
                    var args = stack[i+1];
                   var header = Object.inspect(args.callee.originalFunction);
                    console.log("%s) %s", i/2, header);
                    var k = header.indexOf('(');
                    header = header.substring(k + 1, 999);  // ')' or 'zort)' or 'zort,baz)', etc
                    for (var j = 0; j <args.length; j++) {
                        k = header.indexOf(')');
                        var k2 = header.indexOf(',');
                        if (k2 >= 0) k = Math.min(k,k2);
                        argName = header.substring(0, k)
                        header = header.substring(k + 2, 999);
                        console.log("%s: %s", argName, Object.inspect(args[j]));
                    }
                }
            } else {
                for (var c = arguments.callee.caller, i = 0; c != null; c = c.caller, i++) {
                    console.log("%s: %s", i, Object.inspect(c));
                }
            }
        },

        resetDebuggingStack: function() {
            debuggingStack.clear();
            Function.prototype.shouldTrace = false;
        },

        installStackTracers: function(debugStack) {
            // Adds stack tracing to methods of most "classes"
            console.log("installing stack tracers");
            var classNames = [];
	    Class.withAllClassNames(Global, function(n) { n.startsWith('SVG') || classNames.push(n)});
            for (var ci= 0; ci < classNames.length; ci++) {
                var cName = classNames[ci];
                if (cName != 'Global' && cName != 'Object') {
                    var theClass = Global[cName];
                    var methodNames = theClass.localFunctionNames();
                    for (var mi = 0; mi < methodNames.length; mi++) {
                        var mName = methodNames[mi];
                        var originalMethod = theClass.prototype[mName]; 
                        if (!originalMethod.declaredClass) { // already added 
                            originalMethod.declaredClass = cName;
                        }
                        if (!originalMethod.methodName) { // Attach name to method
                            originalMethod.methodName = mName;
                        }
                        // Now replace each method with a wrapper function that records calls on debugStack
                        theClass.prototype[mName] = originalMethod.stackWrapper(debugStack);
                    }
                }
            }
        }
    });
    
    Object.extend(Function.prototype, {

        shouldTrace: false, // turn on the prototype value to get tracing globally. Turn off individually for "hidden" functions.

        stackWrapper: function () {
            // Make a proxy method (traceFunc) that calls the original method after pushing 'arguments' on stack
            // Normally, it will pop it off before returning, but ***check interaction with try/catch
            var traceFunc = function () {
                debuggingStack.push(this, arguments);  // Push this and the arguments object on the stack ...
                var originalFunction = arguments.callee.originalFunction; 
		
                if (/*originalFunction.*/ Function.prototype.shouldTrace) {
                    var indent = "-".times(debuggingStack.length);
                    console.log(debuggingStack.length + "" + indent + originalFunction.qualifiedMethodName());
                }

                var result = originalFunction.apply(this, arguments); 
                debuggingStack.pop();            // and then pop them off before returning
                debuggingStack.pop();            // ... 
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

    initialize: function($super, param, debugStack) {
        $super();
		this.selected = null;
        if (debugStack && debugStack.length > 0) {
			this.stack = [];
			this.thises = [];
			this.argses = [];
			for (i = debugStack.length-2; i>=0; i-=2) {
            	this.thises.push (debugStack[i]);
            	this.argses.push (debugStack[i+1]);
            	this.stack.push (debugStack[i+1].callee.originalFunction);
			}
		} else {
			// if no debugStack, at least build an array of methods
			this.stack = [];
			for (var c = arguments.callee.caller, i = 0; c != null; c = c.caller, i++) {
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
		if(this.variableNames) {
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
        this.lastMS = date.getMilliseconds();
        this.stepsSinceTick = 0;
        this.maxLatency = 0;
    },

    nextStep: function() {
        var date = new Date();
        this.stepsSinceTick ++;
        var nowMS = date.getMilliseconds();
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
// FileParser
// ===========================================================================
 
Object.subclass('FileParser', {
	// The bad new is: this is not a real parser ;-)
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
	    } else this.scanOtherLine(line)
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
		return true; }
	if (line.match(/^[\s]*\/\*/) ) {
		// Attempt to recognize match on one line...
		if (line.match(/^[\s]*\/\*[^\*]*\*\//) ) {
			if (this.verbose) console.log("short /* comment: "+ line);
			return true; }
		// Note that /* and matching */ must be first non-blank chars on a line
		var saveLineNo = this.lineNo;
		var saveLine = line;
		var savePtr = this.ptr;
		if (this.verbose) console.log("long /* comment: "+ line + "...");
		do {
			if(this.lineNo >= this.lines.length) {
				console.log("Unfound end of long comment beginning at line " + (saveLineNo +1));
				this.lineNo = saveLineNo;
				this.currentLine = saveLine;
				this.ptr = savePtr;
				return true;
			}
			more = this.nextLine()
		}
		while ( ! more.match(/^[\s]*\*\//) );
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
		//  where lineNo might match, but its a different file
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
            ['topPane', newTextListPane, new Rectangle(0, 0, 1, 0.5)],
            ['bottomPane', newTextPane, new Rectangle(0, 0.5, 1, 0.5)]
        ]);
        var m = panel.topPane;
        m.connectModel({model: this, getList: "getChangeBanners", setSelection: "setChangeSelection", getSelection: "getChangeSelection", getMenu: "getListPaneMenu"});
        m = panel.bottomPane;
	m.innerMorph().textSelection.borderRadius = 0;
	m.connectModel({model: this, getText: "getChangeItemText", setText: "setChangeItemText", getSelection: "getSearchString"});
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

Object.subclass('SourceCodeDescriptor', {

    initialize: function(sourceControl, fileName, versionNo, startIndex, stopIndex, lineNo, type, name) {
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

}).logCompletion("Tools.js")(Global);


