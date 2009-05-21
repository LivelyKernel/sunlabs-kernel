var ctx = Packages.javafx.reflect.FXContext.getInstance();
var jsctx = Packages.org.mozilla.javascript.Context.currentContext;

jsctx.setWrapFactory(new Packages.CustomWrapFactory);


function a2l(object) {
    return java.util.Arrays.asList(object);
}

function a2js(array) {
    var result = [];
    for (var i = 0; i < array.length; i++)
	result.push(array[i]);
    return result;
}

function jclassOf(fxObj) {
     return fxObj.asObject().getClass();
}

function listAllMethods(fxObj) {
     return a2js(fxObj.getClass().getMethods()).join('\n');
}

function listMethods(fxObj) {
     return a2js(fxObj.getClass().getDeclaredMethods()).join('\n');
}

function listFields(fxObj) {
     return a2js(fxObj.getClass().getDeclaredFields()).join('\n');
}


function optlevel(level) {
    if (level === undefined)
	return jsctx.getOptimizationLevel();
    else 
	return jsctx.setOptimizationLevel(level);
}

function seq(array) {
    var type = com.sun.javafx.runtime.TypeInfo.Object;
    return Packages.com.sun.javafx.runtime.sequence.Sequences.make(type, array, array.length)
}

 function fxfloat(value) {
     return Packages.com.sun.javafx.runtime.location.FloatVariable.make(value);
     //return new Packages.javafx.reflect.FXFloatValue(value, ctx.getPrimitiveType('Float'));
 }


 function fxMake(className, props) {
     var jinst = new java.lang.Class.forName(className).newInstance();
     var loc = Packages.com.sun.javafx.runtime.location.ObjectVariable.make(jinst);
     for (var name in props) {
	 if (!props.hasOwnProperty(name)) continue;
	 var field = jinst['get$' + name].call(jinst);
	 switch (typeof props[name]) { // FIXME: dispatch on the type of field instead?
	 case 'number': 
	     field.setAsFloatFromLiteral(props[name]);
	     break;
	 case 'object':
	 case 'string':
	     //print('setting from literal ' + props[name]);
	     //jinst[name] = props[name];  // XXX
	     field.setFromLiteral(props[name]);
	     break;
	 default:
	     print('weird ' + (typeof props[name]));
	 }
     }
     print('initializing ' + className);
     jinst.initialize$();
     return loc;
 }

 function test1(width, height) {
     var Stage = ctx.findClass('javafx.stage.Stage');
     var s = Stage.allocate();
     js = s.asObject();
     js.get$width().setAsFloatFromLiteral(width);
     js.get$height().setAsFloatFromLiteral(height);
     js.get$title().setFromLiteral("Declaring is easy!");
     s.initialize();
 }

 function fxexit() {
     var FX = java.lang.Class.forName('javafx.lang.FX');
     FX.getMethod('exit').invoke(FX);
 }

 function test2() {
     var Color =  Packages.javafx.scene.paint.Color;
     var red = Color.$RED;
     var green = Color.$GREEN;
     var white = Color.$WHITE;
     
     stage = fxMake('javafx.stage.Stage', {
	 title: 'Declaring is easy!', 
	 width: 400, 
	 height: 500,
	 scene: fxMake('javafx.scene.Scene', {
	 //    fill: red,
	     content: seq([
		 fxMake('javafx.scene.shape.Rectangle', {
		     x: 45, y:35, width:150, height:150, arcWidth: 15, arcHeight: 15, fill: green
		 }).get(),
		 fxMake('javafx.scene.shape.Circle', {
		     centerX: 118, centerY:110, radius:83, fill: white, stroke: red
		 }).get(),
		 fxMake('javafx.scene.shape.Rectangle', {
		     x: 100, y: 35,
		     width: 150, height: 150,
		     arcWidth: 15, arcHeight: 15,
		     fill: green
		 }).get()
	     ])
	 }).get()
     });
     ///print('rect is ' + rect);
     return stage;

 }

test2();

//Packages.javax.swing.SwingUtilities.invokeLater(function() { test2()});

