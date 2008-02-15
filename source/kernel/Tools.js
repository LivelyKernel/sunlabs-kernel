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

// ===========================================================================
// Source Database
// ===========================================================================
Object.subclass('SourceDatabase', {
	// The Source Database holds a cross-reference of the source code
	// and the various methods for scanning, saving, and reloading that info
	//
	// I anticipate that it will also hold a list of projects, each being a list
	// of changes. Whether projects will be associated with worlds as in Squeak
	// or not is not yet clear.  Regardless, at any time, a given project will
	// be 'current', and will accumulate changes made in its changeList, and
	// will journal those changes onto a changes file for that project.
	//
	// The idea is that, upon startup, the 'image' will consist of the Lively
	// Kernel base code.  You may then open (or find open) a list of various
	// Project files in your directory or other directories to which you have access.
	// You may open any of these in the file browser and read the foreward which,
	// by convention, will list, eg, author, date, project name, description, etc.
	// You may further choose to load that project, which will read in all the code,
	// and prepare the system to record and possibly write out any changes made to 
	// that project

    initialize: function() { this.changeList = null; },
    
    isEmpty: function() { return this.changeList == null; },

    scanFiles: function(fnameList) {
	this.changeList = [];

	// For now, just try to read one file
	var store = WebStore.prototype.onCurrentLocation();
	console.log('getCurrentDirectory = ' + store.getCurrentDirectory());
        this.connectModel({model: store, getText: "getCurrentResourceContents"});
	store.setCurrentResource('/~danielingalls/Lively/Tools.js');
	console.log('resource is now set');
    },

    updateView: function(aspect, controller) {
	console.log('updateView with aspect = ' + aspect);
        var p = this.modelPlug;
        if (p && aspect == p.getText) this.scanFileText(p.model);
    },

    scanFileText: function(webStore) {
	console.log('loaded file named: ' + webStore.currentResourceURL());
	console.log('contents begin...\n' + this.getModelValue('getText', "-----").truncate(200));
	WorldMorph.current().notify("scan source files successful", pt(200, 200));
    },

    // View trait borrowed from Morph...
    connectModel: Morph.prototype.connectModel,
    getModel: Morph.prototype.getModel,
    getModelValue: Morph.prototype.getModelValue,
    setModelValue: Morph.prototype.setModelValue,
    addNonMorph: function(ignored) {}
});

var SourceControl = new SourceDatabase();
   
// ===========================================================================
// Class Browser -- A simple browser for Lively Kernel code
// ===========================================================================
Model.subclass('SimpleBrowser', {

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
        else {
            if (this.className == 'Global') return Global.constructor.functionNames().without(this.className).sort();
            else return Global[this.className].localFunctionNames().sort();
        }
    },

    setMethodName: function(n) { this.methodName = n; this.changed("getMethodString"); },

    getMethodString: function() { 
        if (!this.className || !this.methodName) return "no code"; 
        else return Function.methodString(this.className, this.methodName); 
    },

    setMethodString: function(newDef) { eval(newDef); },

    openIn: function(world, location) {
        world.addMorphAt(new WindowMorph(this.buildView(pt(400,300)), 'JavaScript Code Browser'), location);
        this.changed('getClassList')
    },

    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['leftPane', ListPane, new Rectangle(0, 0, 0.5, 0.6)],
            ['rightPane', ListPane, new Rectangle(0.5, 0, 0.5, 0.6)],
            ['bottomPane', TextPane, new Rectangle(0, 0.6, 1, 0.4)]
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
        var menu = new MenuMorph([], this); 
	if (this.className != null) {
            var theClass = Global[this.className];
            if (theClass.prototype != null) {
		menu.addItem(['profile selected class', function() {
                	showStatsViewer(theClass.prototype, this.className + "..."); }]);
	    }
	}
	if (Loader.isLoadedFromNetwork && SourceControl.isEmpty()) {
            menu.addItem(['scan source files', function() {
                	SourceControl.scanFiles(['Tools.js']); }]);
	}
	return menu; 
    }
});


// ===========================================================================
// Object Hierarchy Browser
// ===========================================================================
Model.subclass('ObjectBrowser', {

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

    openIn: function(world, location) {
        world.addMorphAt(new WindowMorph(this.buildView(pt(400, 300)), 'Object Hierarchy Browser'), location);
        this.changed('getObjectList');
    },

    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
            ['namePane', TextMorph, new Rectangle(0, 0, 1, 0.07)],
            ['topPane', ListPane, new Rectangle(0, 0.07, 1, 0.5)],
            ['bottomPane', TextPane, new Rectangle(0, 0.5, 1, 0.5)]
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
   
Model.subclass('SimpleInspector', {

    initialize: function($super, targetMorph) {
        $super();
        this.inspectee = targetMorph;
    },

    getPropList: function() { return Object.properties(this.inspectee); },

    setPropName: function(n, v) { this.propName = n; this.changed("getPropText", v) },

    getPropList: function() { return Object.properties(this.inspectee); },

    getPropText: function() {
        if (this.selectedItem() == null) return "-----";
        return Object.inspect(this.selectedItem()).withDecimalPrecision(2);
    },

    setPropText: function(txt, v) { this.inspectee[this.propName] = eval(this, this.inspectee); },

    selectedItem: function() { return this.inspectee[this.propName]; },

    contextForEval: function() { return this.inspectee; },

    openIn: function(world, location) {
        var rect = (location || pt(50,50)).extent(pt(400,250));
        var window = this.buildView(rect);
        world.addMorph(window);
        this.changed('getPropList');
        // DI: experimental continuous update feature.  It works, but not removed upon close
        // var rightPane = window.targetMorph.rightPane.innerMorph();
        // rightPane.startStepping(1000, 'updateView', 'getPropText');
    },

    open: function() { return this.openIn(WorldMorph.current()); },

    buildView: function(rect) {
        var panel = PanelMorph.makePanedPanel(rect.extent(), [
            ['leftPane', ListPane, new Rectangle(0, 0, 0.5, 0.6)],
            ['rightPane', TextPane, new Rectangle(0.5, 0, 0.5, 0.6)],
            ['bottomPane', TextPane, new Rectangle(0, 0.6, 1, 0.4)]
        ]);
        var m = panel.leftPane;
        m.connectModel({model: this, getList: "getPropList", setSelection: "setPropName"});
        m = panel.rightPane;
        m.connectModel({model: this, getText: "getPropText", setText: "setPropText", doitContext: "contextForEval"});
        m = panel.bottomPane;
        m.connectModel({model: this, doitContext: "contextForEval"});
        m.innerMorph().setTextString("doits here have this === inspectee");

        var thisModel = this;
        panel.morphMenu = function(evt) { // offer to inspect the current selection
            var menu = Morph.prototype.morphMenu.call(this, evt);
            if (thisModel.selectedItem() == null) return menu;
            menu.addLine();
            menu.addItem(['inspect selection', function() {
                new SimpleInspector(thisModel.selectedItem()).openIn(WorldMorph.current())}])
            return menu; 
        }
        return new WindowMorph(panel, 'Inspector (%s)'.format(this.inspectee).truncate(50));
    }

});

// ===========================================================================
// Style Editor Panel
// ===========================================================================
  
/**
 * @class StylePanel: Interactive style editor for morphs 
 */
   
Model.subclass('StylePanel', {

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

    getRounding: function() { return this.rounding; },
    
    setRounding: function(r) {
        this.targetMorph.shape.roundEdgesBy(this.rounding = r.roundTo(1));
        this.changed('getRounding');
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
        this.familyName = familyName ;
        this.targetMorph.setFontFamily(familyName);
    },

    getFontSize: function() { return this.targetMorph.getFontSize().toString(); },
    
    setFontSize: function(fontSize) {
        this.fontSize = eval(fontSize);
        this.targetMorph.setFontSize(this.fontSize);
    },

    openIn: function(world, location) {
        var rect = (location || pt(50,50)).extent(pt(340,100));
        world.addMorph(new WindowMorph(this.buildView(rect), 'Style Panel'));
        this.changed('all');
    },

    open: function(morph) {
        return this.openIn(WorldMorph.current());
    },

    buildView: function(rect) {
        var panelExtent = rect.extent();
        var panel = new PanelMorph(panelExtent, "rect");
        panel.setFill(Color.primary.blue.lighter().lighter());
        panel.setBorderWidth(2);
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
            m.connectModel({model: this, getValue: "getRounding", setValue: "setRounding"});
            panel.addMorph(m = new SliderMorph(new Rectangle(200, y, 100, 20), 50.0));
            m.connectModel({model: this, getValue: "getRounding", setValue: "setRounding"});
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
            menu.addItem(['inspect model', new SimpleInspector(panel.getModel()), "openIn", this.world()])
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
    var t = new TextMorph(pt(0,0).extent(m.bounds().extent()), 'Display and reset stats').beLabel();
    m.addMorph(t);
};

(function() {

    var debuggingStack = [];
    
    Object.extend(Function, {

        showStack: function() {
            var stack = debuggingStack;
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

// Inspection tools, called interactively
Object.extend(console, {

    morphs: function(morph) {
        var array = [];
        (morph || WorldMorph.current()).submorphs.each(function(m) { array.push(m) });
        return array;
    },

    $: function(id) {
        return document.getElementById(id.toString());
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
    initialize: function() {
	// Note this is not a real parse.  The first goal is simply to identify
	// source code ranges of interesting editable chunks such as method definitions
	this.commentLine = "\/\/$";
	this.varLine = "[\s]*var\s$";
	this.funcDef = "[\s]*[\w]+\.prototype\.[\w]+\s\=\sfunction{...";
    },

    parseFile: function(fname) {
	//Note without copying by slice, we get an object where .length is a function	this.str = application.readFileAsString(fname).slice(0);
	this.ptr = 0;
	println("string length = " + this.str.length);
	for(var i=1; i<=150; i++) {
		var line = this.peekLine(this.str,this.ptr);
		println("i="+i+" ptr="+this.ptr+" len="+line.length+": " + line);		if(this.processComment(this.str,this.ptr,line)) {}
		else if(this.processVarStmt(this.str,this.ptr,line)) {}
		else if(this.processFuncDef(this.str,this.ptr,line)) {}
		else if(this.processMethodDef(this.str,this.ptr,line)) {}
		else if(this.processSemicolon(this.str,this.ptr,line)) {}		else if(this.processBlankLine(this.str,this.ptr,line)) {}		else { println("other: "+ line); this.ptr += line.length; }
		 }
	println("done");
    },

    processComment: function(str,ptr,line) {
	if(line.match(/^[\s]*\/\//) == null) return false;
	println("comment: "+ line);
	this.ptr += line.length;  return true;
    },
    processVarStmt: function(str,ptr,line) {
	if(line.match(/^[\s]*var\s/) == null) return false;
	println("var stmt: "+ line);
	this.ptr += line.length;  return true;
    },
    processFuncDef: function(str,ptr,line) {
	var match = line.match(/^[\s]*function[\s]+([\w]+)/);	if(match == null) return false;
	var funcName = match[1];	var def = this.peekBody(str,ptr);	println("function match: " + "function " + funcName);	println("function def: " + def);
	this.ptr += def.length;  return true;
    },
    processMethodDef: function(str,ptr,line) {
	var match = line.match(/^[\s]*([\w]+)\.prototype\.([\w]+)[\s]*\=[\s]*function\W/);	if(match == null) return false;
	var className = match[1];	var methodName = match[2];	var def = this.peekBody(str,ptr);	println("method match: " + className + ".prototype." + methodName);	println("method def: " + def);	this.ptr += def.length;  return true;
    },
    processSemicolon: function(str,ptr,line) {	if(line.match(/^[\s]*;[\s]*$/) == null) return false;	println("semicolon");	this.ptr += line.length; return true;
    },
    processBlankLine: function(str,ptr,line) {	if(line.match(/^[\s]*$/) == null) return false;	println("blank line");	this.ptr += line.length; return true;
    },
    peekLine: function(str,ptr) {	// Peeks ahead to next line-end, returning the line with cr and/or lf	var p2 = ptr;	var c = str[p2];	while(p2 < str.length && (c != "\n" && c != "\r")) {p2++; c = str[p2]; }	if (p2 == str.length) return str.substring(ptr,p2); // EOF	if (p2+1 == str.length) return str.substring(ptr,p2+1); // EOF at lf or cr	if (c == "\n" && str[p2+1] == "\r") return str.substring(ptr,p2+2); // ends w/ lfcr	if (c == "\r" && str[p2+1] == "\n") return str.substring(ptr,p2+2); // ends w/ crlf	 // ends w/ cr or lf alone	return str.substring(ptr,p2+1);
    },
    peekBody: function(str,ptr) {	// Like peekLine, but scans to closing curly bracket	var p2 = ptr;	var c = str[p2];	// Scan up to opening brace	while(p2 < str.length && c != "{") {p2++; c = str[p2]; }	var bc = 1; // set brace count to 1	// Scan until brace count drops to zero	while(p2 < str.length && bc > 0) {		p2++; c = str[p2];		if(c == "{") bc++;		if(c == "}") bc--;}	var endLine = this.peekLine(str,p2+1);	return str.substring(ptr,p2+endLine.length);
    },
    parseLine: function(str,ptr) {
	println("parseLine()");
    }
});console.log('loaded Tools.js');

