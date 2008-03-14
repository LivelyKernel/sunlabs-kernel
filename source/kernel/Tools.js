/*
 * Copyright © 2006-2008 Sun Microsystems, Inc.
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
WidgetModel.subclass('SimpleBrowser', {

    openTriggerVariable: 'getClassList',
    defaultViewTitle: "Javascript Code Browser",

    initialize: function($super) { 
        $super(); 
        this.scopeSearchPath = [Global];
    },

    getClassList: function() { 
        var list = [];
        for (var i = 0; i < this.scopeSearchPath.length; i++) {
            var p = this.scopeSearchPath[i];
            list = list.concat(Class.listClassNames(p).filter(function(n) { return !n.startsWith('SVG')}).sort());
        }
        return list;
    },

    setClassName: function(n) { this.className = n; this.changed("getMethodList"); },

    getMethodList: function() {
        if (this.className == null) return [];
	var sorted = (this.className == 'Global')
		? Global.constructor.functionNames().without(this.className).sort()
		: Global[this.className].localFunctionNames().sort();
	var defStr = "*definition";
	var defRef = SourceControl && SourceControl.getSourceInClassForMethod(this.className, defStr);
	return defRef ? [defStr].concat(sorted) : sorted;
    },

    setMethodName: function(n) { this.methodName = n; this.changed("getMethodString"); },

    getMethodString: function() { 
        if (!this.className || !this.methodName) return "no code"; 
        else return Function.methodString(this.className, this.methodName); 
    },

    setMethodString: function(newDef) { eval(newDef); },

    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['leftPane', newListPane, new Rectangle(0, 0, 0.5, 0.5)],
            ['rightPane', newListPane, new Rectangle(0.5, 0, 0.5, 0.5)],
            ['bottomPane', newTextPane, new Rectangle(0, 0.5, 1, 0.5)]
        ]);
        var m = panel.leftPane;
        m.connectModel({model: this, getList: "getClassList", setSelection: "setClassName", getMenu: "getClassPaneMenu"});
        m = panel.rightPane;
        m.connectModel({model: this, getList: "getMethodList", setSelection: "setMethodName"});
        m = panel.bottomPane;
        m.connectModel({model: this, getText: "getMethodString", setText: "setMethodString"});
        return panel;
    },

    getClassPaneMenu: function() {
        var items = [];
	if (this.className != null) {
            var theClass = Global[this.className];
            if (theClass.prototype != null) {
		items.push(['profile selected class', function() {
                    showStatsViewer(theClass.prototype, this.className + "..."); }.bind(this)]);
	    }
	}
	if (Loader.isLoadedFromNetwork && SourceControl == null) {
            items.push(['load source files', function() {
                SourceControl = new SourceDatabase();
		SourceControl.openIn(this.world());
		this.world().firstHand().setMouseFocus(null);  // DI: Is this necessary ?? ***
		SourceControl.scanKernelFiles(["Core.js", "Text.js", "Widgets.js", "Tools.js", "Examples.js", "Network.js", "Storage.js"]);
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
        return this.objectToView[this.nameToView].toString();
    },

    setObjectValue: function(newDef) { eval(newDef); },

    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['namePane', TextMorph, new Rectangle(0, 0, 1, 0.07)],
            ['topPane', newListPane, new Rectangle(0, 0.07, 1, 0.5)],
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

    initialize: function($super, targetMorph) {
        $super();
	var model = new SimpleModel("PropList", "PropName", "PropText", "Inspectee", "EvalInput");
	this.connectModel({model: model, 
			   setPropList: "setPropList", 
			   setPropName: "setPropName", getPropName: "getPropName",
			   setPropText: "setPropText",
			   getEvalInput: "getEvalInput",
			   getInspectee: "getInspectee" });
	model.setInspectee(targetMorph);
    },

    updateView: function(aspect, source) {
	var p = this.modelPlug;
	if (!p) return;
	switch (aspect) {
	case p.getInspectee:
	    this.setModelValue("setPropList", Object.properties(this.inspectee()));
	    break;
	case p.getPropName:
	    var prop = this.selectedItem();
	    if (!prop) {
		this.setModelValue("setPropText", "----");
	    } else {
		this.setModelValue("setPropText", Object.inspect(prop).withDecimalPrecision(2));
	    }
	    break;
	case p.getEvalInput:
	    var target = this.inspectee();
	    var propName = this.getModelValue("getPropName");
	    if (propName) {
		var input = this.getModelValue("getEvalInput");
		var result = eval(input, target);
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
	return 'Inspector (%s)'.format(this.inspectee()).truncate(50);
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
            ['leftPane', newListPane, new Rectangle(0, 0, 0.5, 0.6)],
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
        this.changed('getStrokeOpacity')
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

        panel.addMorph(m = new CheapListMorph(new Rectangle(50, y, 100, 50),[]));
        m.connectModel({model: this, getList: "getFillTypes", getSelection: "getFillType", setSelection: "setFillType"});
        panel.addMorph(m = new CheapListMorph(new Rectangle(160, y, 75, 60),[]));
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
    m.connectModel({model: m, getValue: "getThisValue", setValue: "setThisValue"});
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

        showStack: function(stack) {
            stack = stack || debuggingStack;
            if (Config.debugExtras) {
                for (var i = 0; i < stack.length; i++) {
                    var args = stack[i];
                    var header = Object.inspect(args.callee.originalFunction);
                    console.log("%s) %s", i, header);
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
                    console.log("%s) %s", i, Object.inspect(c));
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
            var classNames = Class.listClassNames(Global).filter(function(n) { return !n.startsWith('SVG')});
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
                debuggingStack.push(arguments);  // Push the arguments object on the stack ...
                var originalFunction = arguments.callee.originalFunction; 
		
                if (/*originalFunction.*/ Function.prototype.shouldTrace) {
                    var indent = "-".times(debuggingStack.length);
                    console.log(debuggingStack.length + "" + indent + originalFunction.qualifiedMethodName());
                }

                var result = originalFunction.apply(this, arguments); 
                debuggingStack.pop();            // ... and then pop them off before returning
                return result; 
            };
            traceFunc.originalFunction = this;  // Attach this (the original function) to the tracing proxy
            return traceFunc;
        }
    });
    
})(); // end scoping function

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
            this.setTextString(this. stepsSinceTick.toString() + " frames/sec (" + ms.toString() + "ms avg),\nmax latency " + this.maxLatency.toString() + " ms.");
            this.reset(date);
        }
    },

    startSteppingScripts: function() { this.startStepping(1,'nextStep'); }

});


// ===========================================================================
// FileParser
// ===========================================================================
 
Object.subclass('FileParser', {
	// First of all, this is not a real parser ;-)
	// It simply looks for class headers, and method headers,
	// and everything in between gets put with the preceding header
	// There are hundreds of ways this can fail,
	// but, heh-heh, it works 99 percent of the time ;-)

	// Yet to do...
	// Do a better job of trimming code chunks
	// Scan method bodies for <ident>. or ident( and build dict of senders
	// Figure out what to do for various global functions and other unmatched code.
	// Note probably best is ChangeList view of file sequence
	// ...so, parseFile should probably also build that as well wile it scans
	//	the view would just be a list of items <lineNo>: <1st 40 chars>...
    
    parseFile: function(fname, fstr, db) {
	// Scans the file and returns changeList -- a list of informal divisions of the file
	// It should be the case that these, in order, exactly contain all the text of the file
	// Note that if db, a SourceDatabase, is supplied, it will be loaded during the scan
	var ms = new Date().getTime();
	this.verbose = false;
	this.fileName = fname;
	this.str = fstr;
	var len = this.str.length;
	this.sourceDB = db;
	this.ptr = 0;
	this.lineNo = 0;
	this.changeList = [];
	if (this.verbose) console.log("Parsing " + this.fileName + ", length = " + len);
	this.currentDef = {type: "preamble", startPos: 0, lineNo: 1};
	while (this.ptr < len) {
	    var line = this.nextLine(this.str);
	    if (this.verbose) console.log("lineNo=" + this.lineNo + " ptr=" + this.ptr + line);		
	    if (this.scanComment(line)) {
	    } else if (this.scanClassDef(line)) {
	    } else if (this.scanMethodDef(line)) {
	    } else if (this.scanBlankLine(line)) {
	    } else if (this.verbose) { console.log("other: "+ line); 
	    }
	}
	this.ptr = len;
	this.processCurrentDef();
	ms = new Date().getTime() - ms;
	console.log(this.fileName + " scanned; " + this.changeList.length + " patches identified in " + ms + " ms.");
	return this.changeList;
    },
    scanComment: function(line) {
	if (line.match(/^[\s]*\/\//) ) {
		if (this.verbose) console.log("comment: "+ line);
		return true; }
	if (line.match(/^[\s]*\/\*/) ) {
		if (this.verbose) console.log("long comment: "+ line + "...");
		do { line = this.nextLine(this.str) }
		while ( !line.match(/^[\s]*\*\//) );
		if (this.verbose) console.log("..." + line);
		return true;
	}
	return false;
    },
    scanClassDef: function(line) {
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
    processCurrentDef: function() {
	// this.ptr now points at a new code section.
	// Terminate the currently open definition and process accordingly
	// We will want to do a better job of finding where it ends
	var def = this.currentDef;
	if (this.ptr == 0) return;  // we're bring called at new def; if ptr == 0, there's no preamble
	def.endPos = this.ptr-1;
	if (def.type == "classDef") {
		this.currentClassName = def.name;
		if(this.sourceDB) this.sourceDB.methodDictFor(this.currentClassName)["*definition"] =
			{fileName: this.fileName, startPos: def.startPos, endPos: this.ptr-1};
	} else if (def.type == "methodDef") {
		if(this.sourceDB) this.sourceDB.methodDictFor(this.currentClassName)[def.name] =
			{fileName: this.fileName, startPos: def.startPos, endPos: this.ptr-1};
	}
	this.changeList.push(this.currentDef);
	// console.log("startPos = " + def.startPos + "; endPos = " + def.endPos);
	this.currentDef = null;
    },
    scanBlankLine: function(line) {
	if (line.match(/^[\s]*$/) == null) return false;
	if (this.verbose) console.log("blank line");
	return true;
    },
    nextLine: function(s) {
	// Peeks ahead to next line-end, returning the line with cr and/or lf
	// I'm sure this could be simpler, either by use of regex's
	// or just by knowing what line-ending is used
	// Note p1, p2 are first and last characters of the line (inc ending)
	if (this.currentLine) this.ptr += this.currentLine.length;
	this.lineNo ++;
	var len = s.length;
	var p1 = this.ptr;
	var p2 = p1;
	var c = s[p2];
	while (p2 < len && (c != "\n" && c != "\r")) {
	    p2++; 
	    c = s[p2]; 
	}
	if (p2 == len) return this.currentLine = s.substring(p1,p2); // EOF; p2 is beyond end
	if (p2+1 == len) return this.currentLine = s.substring(p1,p2+1); // EOF at lf or cr
	if (c == "\n" && s[p2+1] == "\r") return this.currentLine = s.substring(p1,p2+2); // ends w/ lfcr
	if (c == "\r" && s[p2+1] == "\n") return this.currentLine = s.substring(p1,p2+2); // ends w/ crlf
	 // ends w/ cr or lf alone
	return this.currentLine = s.substring(p1,p2+1);
    }
    
});

// ===========================================================================
// ChangeList
// ===========================================================================

WidgetModel.subclass('ChangeList', {
	// The ChangeListBrowser views a list of patches in a JavaScript (or other) file.
	// The patches taken together entirely capture all the test in the file
	// The quality of the fileParser determines how well the file patches correspond
	// to meaningful JavaScript entities.  A changeList accumulated from method defs
	// during a development session should (;-) be completely well-formed in this regard.
	// Saving a change in a CLB will only edit the file;  no evaluation is implied
    
    defaultViewExtent: pt(400,250),
    openTriggerVariable: 'getChangeBanners',

    initialize: function($super, fn, contents, changes) {
        $super();
        this.fileName = fn;
        this.fileContents = contents;
        this.changeList = changes;
    },

    getChangeBanners: function() {
	this.changeBanner = null;
	return this.changeList.map( function(each) { return this.bannerOfItem(each); }.bind(this));
    },

    setChangeSelection: function(n, v) { this.changeBanner = n; this.changed("getChangeItemText", v) },

    selectedItem: function() {
	if (this.changeBanner == null) return null;
	var i2 = this.changeBanner.indexOf(":");
	var lineNo = this.changeBanner.substring(0, i2);
	lineNo = new Number(lineNo);
	for (var i=0; i < this.changeList.length; i++) {
		var item = this.changeList[i];
		if (item.lineNo == lineNo) return item;
	}
	return null;
    },

    fulTextOfItem: function(item) {
	return this.fileContents.substring(item.startPos, item.endPos+1);
    },

    bannerOfItem: function(item) {
        var lineStr = item.lineNo.toString();
	var firstLine = this.fulTextOfItem(item).truncate(40);
	var end = firstLine.indexOf("\n");
	if (end >= 0) firstLine = firstLine.substring(0,end);
	end = firstLine.indexOf(":");
	if (end >= 0) firstLine = firstLine.substring(0,end+1);
	return lineStr + ": " + firstLine;
    },

    getChangeItemText: function() {
        var item = this.selectedItem();
	if (item == null) return "-----";
        return this.fulTextOfItem(item);
    },

    setChangeItemText: function(newItemText, v) {
        var item = this.selectedItem();
	if (item == null) return;
	var beforeText = this.fileContents.substring(0, item.startPos);
	var afterText = this.fileContents.substring(item.endPos+1);
        var cat = beforeText.concat(newItemText, afterText);
	console.log("Saving " + this.fileName + "; length = " + cat.length);
	new NetRequest({model: new NetRequestReporter(), setStatus: "setRequestStatus"}).put(new URL(this.fileName), cat);
	// Now recreate (slow but sure) list from new contents, as things may have changed
	var oldSelection = this.changeBanner;
	this.fileContents = cat;
	this.changeList = new FileParser().parseFile(this.fileName, this.fileContents);
	this.changed('getChangeBanners');
	this.setChangeSelection(oldSelection);  // reselect same item in new list (hopefully)
    },

    loadFileNamed: function (fn) {
	this.fileName = fn;
	this.fileContents = new NetRequest().beSync().get(URL.source.withFilename(this.fileName)).getResponseText();
	this.changeList = new FileParser().parseFile(this.fileName, this.fileContents);
	this.changed('getChangeBanners');
    },

    viewTitle: function() {
	return "Change list for " + this.fileName;
    },
    
    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['topPane', newListPane, new Rectangle(0, 0, 1, 0.5)],
            ['bottomPane', newTextPane, new Rectangle(0, 0.5, 1, 1)]
        ]);
        var m = panel.topPane;
        m.connectModel({model: this, getList: "getChangeBanners", setSelection: "setChangeSelection"});
        m = panel.bottomPane;
	m.connectModel({model: this, getText: "getChangeItemText", setText: "setChangeItemText"});
	return panel;
    }
});


// ===========================================================================
// Source Database
// ===========================================================================
ChangeList.subclass('SourceDatabase', {
	// The Source Database holds a cross-reference of the source code
	// and the various methods for scanning, saving, and reloading that info
	//
	// It also holds a list of changes for the current project, and maintains
	// the associated changes file.  The idea is that whenever changes are made
	// they update the changeList and its associated file.
	//
	// Normally, upon startup, the 'image' will consist of the Lively
	// Kernel base code.  You may then open (or find open) a list of various
	// Project files in your directory or other directories to which you have access.
	// You may open any of these in the file browser and read the foreward which,
	// by convention, will list, eg, author, date, project name, description, etc.
	// You may further choose to load that project, which will read in all the code,
	// and prepare the system to record and possibly write out any changes made to 
	// that project

    initialize: function($super) {
	this.methodDicts = {};
	this.cachedFullText = {};
        
        var projectName = 'Changes-di.js';  // Later get this info out of localConfig
	var contents = this.getFileContents(projectName);
	var chgList = new FileParser().parseFile(projectName, contents)
	$super(projectName, contents, chgList);
    },

    methodDictFor: function(className) {
	if (!this.methodDicts[className]) this.methodDicts[className] = {}; 
	return this.methodDicts[className];
    },

    getSourceInClassForMethod: function(className, methodName) {
	var methodDict = this.methodDictFor(className);
	var descriptor = methodDict[methodName];
	if (!descriptor) return null;
	var fullText = this.getFullText(descriptor.fileName);
	if (!fullText) return null;
	return fullText.substring(descriptor.startPos, descriptor.endPos);
    },

    getFullText: function(fileName) {
	var fullText = this.cachedFullText[fileName];
	if (fullText) return fullText;
	// Full text not in cache -- retrieve it and enter in cache
	return null;
    },

    setDescriptorInClassForMethod: function(className, methodName, descriptor) {
	var methodDict = this.methodDictFor(className);
	methodDict[methodName] = descriptor;
    },

    scanKernelFiles: function(list) { // if(true) return;
	for (var i=0; i<list.length; i++) {
		var fileName = list[i];
		var fullText = this.getFileContents(fileName);
		new FileParser().parseFile(fileName, fullText, this);
	}
    },

    getFileContents: function(fileName) { // convenient helper method
	var ms = new Date().getTime();
	var fullText = new NetRequest().beSync().get(URL.source.withFilename(fileName)).getResponseText();
	ms = new Date().getTime() - ms;
	console.log(this.fileName + " read in " + ms + " ms.");
	return fullText;
    },

    viewTitle: function() {
	return "Source Control for " + this.fileName;
    }
});

module.SourceControl = null;

}).logCompletion("Tools.js")(Global);


