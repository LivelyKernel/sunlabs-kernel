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
Widget.subclass('SimpleBrowser', {

    defaultViewTitle: "Javascript Code Browser",
    pins: ["+ClassList", "-ClassName", "+MethodList", "-MethodName", "MethodString", "+ClassPaneMenu"],

    initialize: function($super) { 
	var model = new SimpleModel(this.pins);
	var plug = model.makePlugSpecFromPins(this.pins);
        $super(plug); 
        this.scopeSearchPath = [Global];
	model.setClassList(this.listClasses());
	model.setClassPaneMenu(this.getClassPaneMenu());
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
            list = list.concat(Class.listClassNames(p).filter(function(n) { return !n.startsWith('SVG')}).sort());
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
            ['leftPane', newListPane, new Rectangle(0, 0, 0.5, 0.5)],
            ['rightPane', newListPane, new Rectangle(0.5, 0, 0.5, 0.5)],
            ['bottomPane', newTextPane, new Rectangle(0, 0.5, 1, 0.5)]
        ]);
	var model = this.getModel();
        var m = panel.leftPane;
        m.connectModel({model: model, getList: "getClassList", setSelection: "setClassName", getMenu: "getClassPaneMenu"});
	m.updateView("getClassList");
        m = panel.rightPane;
        m.connectModel({model: model, getList: "getMethodList", setSelection: "setMethodName"});
        m = panel.bottomPane;
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
            items.push(['load source files', function() {
                if (! SourceControl) {
		    SourceControl = new SourceDatabase();
		    SourceControl.openIn(this.world());
		}
		SourceControl.scanKernelFiles(["prototype.js", "defaultconfig.js", "localconfig.js",
			"Core.js", "Text.js", "svgtext-compat.js",
			"Widgets.js", "Network.js", "Storage.js", "Tools.js",
			"Examples.js", "WebPIM.js"]);
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

    pins: ["+PropList", "PropName", "+PropText", "-Inspectee", "-EvalInput"],
    
    initialize: function($super, targetMorph) {
        $super();
	var model = new SimpleModel(this.pins);
	this.connectModel(model.makePlugSpecFromPins(this.pins));
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
		this.setModelValue("setPropText", Strings.withDecimalPrecision(Object.inspect(prop), 2));
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

    parseFile: function(fname, fstr, db, mode, str) {
	// Scans the file and returns changeList -- a list of informal divisions of the file
	// It should be the case that these, in order, exactly contain all the text of the file
	// Note that if db, a SourceDatabase, is supplied, it will be loaded during the scan
	var ms = new Date().getTime();
	this.fileName = fname;
	this.sourceDB = db;
	this.mode = mode;  // one of ["scan", "search", "import"]
	if (mode == "search") this.searchString = str;

	this.verbose = false;  // fname == "Tools.js";
	this.ptr = 0;
	this.lineNo = 0;
	this.changeList = [];
	if (this.verbose) console.log("Parsing " + this.fileName + ", length = " + len);
	this.currentDef = {type: "preamble", startPos: 0, lineNo: 1};
	this.lines = fstr.split("\n");

	while (this.lineNo < this.lines.length) {
	    var line = this.nextLine();
	    if (this.verbose) console.log("lineNo=" + this.lineNo + " ptr=" + this.ptr + line); 
	    if (this.lineNo > 100) this.verbose = false;

	    if (this.scanComment(line)) {
	    } else if (this.scanClassDef(line)) {
	    } else if (this.scanMethodDef(line)) {
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
    processCurrentDef: function() {
	// this.ptr now points at a new code section.
	// Terminate the currently open definition and process accordingly
	// We will want to do a better job of finding where it ends
	var def = this.currentDef;
	if (this.ptr == 0) return;  // we're being called at new def; if ptr == 0, there's no preamble
	def.endPos = this.ptr-1;
	var descriptor = new SourceCodeDescriptor (this.sourceDB, this.fileName, def.startPos, def.endPos, def.lineNo, def.type, def.name);

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
	this.changed("getChangeItemText", v);
	if (this.searchString) this.changed("getSearchString", v);
    },
    selectedItem: function() {
	if (this.changeBanner == null) return null;
	var i1 = this.changeBanner.indexOf(":");
	var i2 = this.changeBanner.indexOf(":", i1+1);
	var lineNo = this.changeBanner.substring(i1+1, i2);
	lineNo = new Number(lineNo);
	for (var i=0; i < this.changeList.length; i++) {
		var item = this.changeList[i];
		if (item.lineNo == lineNo) return item;
	}
	return null;
    },
    bannerOfItem: function(item) {
        var lineStr = item.lineNo.toString();
	var firstLine = item.getSourceCode().truncate(40);  // a bit wastefull
	var end = firstLine.indexOf("\n");
	if (end >= 0) firstLine = firstLine.substring(0,end);
	end = firstLine.indexOf(":");
	if (end >= 0) firstLine = firstLine.substring(0,end+1);
	return item.fileName.concat(":", lineStr, ": ", firstLine);
    },
    getChangeItemText: function() {
        var item = this.selectedItem();
	if (item == null) return "-----";
        return item.getSourceCode();
    },
    getSearchString: function() {
        return this.searchString;
    },
    setChangeItemText: function(newItemText, v) {
        var item = this.selectedItem();
	if (item == null) return;
	item.putSourceCode(newItemText, v.textBeforeChanges)
	// Now recreate (slow but sure) list from new contents, as things may have changed
	var oldSelection = this.changeBanner;
	this.changeList = item.newChangeList();
	this.changed('getChangeBanners');
	this.setChangeSelection(oldSelection);  // reselect same item in new list (hopefully)
    },
    viewTitle: function() {
	return "Change list for " + this.title;
    },
    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['topPane', newListPane, new Rectangle(0, 0, 1, 0.5)],
            ['bottomPane', newTextPane, new Rectangle(0, 0.5, 1, 1)]
        ]);
        var m = panel.topPane;
        m.connectModel({model: this, getList: "getChangeBanners", setSelection: "setChangeSelection", getMenu: "getListPaneMenu"});
        m = panel.bottomPane;
	m.connectModel({model: this, getText: "getChangeItemText", setText: "setChangeItemText", getSelection: "getSearchString"});
	return panel;
    }
});


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
	// fast access in subsequent queries.

	// One of the fast queries that can be made is to find all references to a
	// given identifier, including comments or not.  The result of such searches
	// is presented as a changeList.

	// The other major service provided by SourceDatabase is the ability to 
	// retrieve and alter pieces of the source code files without invalidating
	// previously scanned changeList-style records.

	// A sourceCodePiece specifies a file name and version number, as well as a 
	// start and stop character index.  When a piece of source code is changed,
	// it will likely invalidate all the other sourceCodePieces that point later
	// in the file.  However, the SourceDatabase is smart (woo-hoo); it knows
	// where previous edits have been made, and what effect they would have had
	// on character ranges of older pieces.  To this end, it maintains an internal
	// version number for each file, along with a list of the changes made between
	// each version.

	// With this minor bit of bookkeeping, the SourceDataBase is able to keep
	// producing source code pieces from old versions of a file without the need
	// to reread the file.  Moreover, to the extent its cache can keep all the
	// file contents, it can do ripping-fast scans for cross reference queries.
	//
	// The DourceDatabase appears on the screen as a changeList.  This is left over
	// from an earlier design.  I think I'm going to use that list as a list of
	// old versions, which will be useful for simple reverts, but I believe it could
	// actually allow roll-backs to any earlier point in the session.

	// A SourceDatabase is created and opened on the screen in response to the
	// 'import sources' command in the browser's classPane menu.
	// Somehow it needs to be specified exactly what sources get imported.
	// For now, we'll include all, or at least all that you would usually
	// want in a typical development session.  We may soon want more control
	// over this and, therefore, a reasonable UI for such control.

    initialize: function($super) {
	this.methodDicts = {};
	this.cachedFullText = {};
        var projectName = 'Changes-di.js';  // Later get this info out of localConfig
	var contents = this.getFileContents(projectName);
	var chgList = new FileParser().parseFile(projectName, contents, this, "scan")
	$super(projectName, null, chgList);
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
	for (var fName in this.cachedFullText) {
		if (this.cachedFullText.hasOwnProperty(fName)) {
			var fullText = this.cachedFullText[fName];
			var refs = new FileParser().parseFile(fName, fullText, this, "search", str)
			fullList = fullList.concat(refs);
		}
	}
    return fullList;
    },
    scanKernelFiles: function(list) {
	for (var i=0; i<list.length; i++) {
		var fName = list[i];
		var fullText = this.getFileContents(fName);
		this.cachedFullText[fName] = fullText;
		new FileParser().parseFile(fName, fullText, this, "import");
	}
    },
    getSourceCodeForDescriptor: function(desc) {
	var fullText = this.getFullText(desc.fileName);
	return fullText.substring(desc.startIndex, desc.stopIndex);
    },
    putSourceCodeForDescriptor: function(desc, newText, originalText) {
	if (originalText && originalText != this.getSourceCodeForDescriptor(desc)) {
		console.log("Original text does not match file; store aborted");
		return;
	}
	var fullText = this.getFullText(desc.fileName);
	var beforeText = fullText.substring(0, desc.startIndex);
	var afterText = fullText.substring(desc.stopIndex);
        var cat = beforeText.concat(newText, afterText);
	console.log("Saving " + desc.fileName + "...");
	new NetRequest({model: new NetRequestReporter(), setStatus: "setRequestStatus"}
			).put(URL.source.withFilename(desc.fileName), cat);
	this.cachedFullText[desc.fileName] = cat;
	console.log("... " + cat.length + " bytes saved.");
    },
    changeListForFileNamed: function(fName) {
	var fullText = this.getFullText(fName);
	return new FileParser().parseFile(fName, fullText, this, "scan");
    },
    getFullText: function(fileName) {
	var fullText = this.cachedFullText[fileName];
	if (fullText) return fullText;
	// Full text not in cache -- retrieve it and enter in cache
	return this.getFileContents(fileName);
    },
    getFileContents: function(fileName) { // convenient helper method
	var ms = new Date().getTime();
	var fullText = new NetRequest().beSync().get(URL.source.withFilename(fileName)).getResponseText();
	ms = new Date().getTime() - ms;
	console.log(fileName + " read in " + ms + " ms.");
	this.cachedFullText[fileName] = fullText;
	return fullText;
    },
    viewTitle: function() {
	return "Source Control for " + this.fileName;
    }
});

module.SourceControl = null;

Object.subclass('SourceCodeDescriptor', {

    initialize: function(sourceControl, fileName, startIndex, stopIndex, lineNo, type, name) {
	this.sourceControl = sourceControl;
	this.fileName = fileName;
	this.startIndex = startIndex;
	this.stopIndex = stopIndex;
	this.lineNo = lineNo;
	this.type = type;
	this.name = name;
	return this;
    },
    getSourceCode: function() {
	return this.sourceControl.getSourceCodeForDescriptor(this);
    },
    putSourceCode: function(newText, originalText) {
	return this.sourceControl.putSourceCodeForDescriptor(this, newText, originalText);
    },
    newChangeList: function() {
	return this.sourceControl.changeListForFileNamed(this.fileName);
    }
});


}).logCompletion("Tools.js")(Global);


