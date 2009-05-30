
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

function seq(array) { // not needed any more
    var type = com.sun.javafx.runtime.TypeInfo.Object;
    return Packages.com.sun.javafx.runtime.sequence.Sequences.make(type, array, array.length)
}

 function fxfloat(value) {
     return Packages.com.sun.javafx.runtime.location.FloatVariable.make(value);
     //return new Packages.javafx.reflect.FXFloatValue(value, ctx.getPrimitiveType('Float'));
 }

 function props(value) {
     var array = [];
     for (var name in value) array.push(name);
     return array;
 }


 function fxMake(clazz, props) {
     // not needed?
     //var jinst = new java.lang.Class.forName(className).newInstance();
     //weirdly, javascript seems to use custom wrappers an object is created through java.lang.Class.forName('x.y.X').newInstance()
     //but *not* when it's created through new Packages.x.y.X()!

     var jinst = clazz.__javaObject__.newInstance();
     for (var name in props) {
	 if (!props.hasOwnProperty(name)) continue;
	 jinst[name] = props[name];
     }
     jinst.initialize$();
     print('initializing ' + clazz.__javaObject__.getName());
     return jinst;
 }

 function test1(width, height) {
     var ctx = Packages.javafx.reflect.FXContext.getInstance();
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

 var stage;

 var javafx = Packages.CustomWrapFactory.javafx;
 function test2() {
     var Color =  Packages.javafx.scene.paint.Color;
     var red = Color.$RED;
     var green = Color.$GREEN;
     var white = Color.$WHITE;
     var blue = Color.$BLUE;


     stage = javafx.stage.Stage({
	 title: 'Declaring is easy!', 
	 width: 400, 
	 height: 500,
	 scene: javafx.scene.Scene({
	     fill: red,
	     content: [
		 javafx.scene.Group({
		     content: [
			 javafx.scene.shape.Rectangle({
			     x: 45, y:35, width:150, height:150, arcWidth: 15, arcHeight: 15, fill: green
			 }),
			 javafx.scene.shape.Circle({
			     centerX: 118, centerY:110, radius:83, fill: white, stroke: red
			 }),
			 javafx.scene.shape.Rectangle({
			     x: 100, y: 35,
			     width: 150, height: 150,
			     arcWidth: 15, arcHeight: 15,
			     fill: green
			 })
		     ]
		 }),
	 	 javafx.scene.shape.Rectangle({
		     x: 45, y:235, width:150, height:150, arcWidth: 15, arcHeight: 15, fill: blue
		 })
	     ]
	 })
     });
     ///print('rect is ' + rect);
     print('stage is ' + stage);
     return stage;

 }


test2();

//Packages.javax.swing.SwingUtilities.invokeLater(function() { test2()});

