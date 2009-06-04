
var jsctx = Packages.org.mozilla.javascript.Context.currentContext;

print('wrap factory ' + Packages.FXWrapFactory);
jsctx.setWrapFactory(new Packages.FXWrapFactory());

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
     //jinst.complete$();
     print('initializing ' + clazz.__javaObject__.getName());
     return jinst;
 }

 function fxexit() {
     var FX = java.lang.Class.forName('javafx.lang.FX');
     FX.getMethod('exit').invoke(FX);
 }

/*
 function fxSeq(array) {
     var pkg = Packages.com.sun.javafx.runtime;
     var seq = pkg.sequence.Sequences.make(pkg.TypeInfo.Object, array, array.length);
     return pkg.location.SequenceVariable.make(pkg.TypeInfo.Object, seq);
 }
*/


//Packagesx.javax.swing.SwingUtilities.invokeLater(function() { test2()});

