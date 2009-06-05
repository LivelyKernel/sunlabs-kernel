load('util.js');
load('bootstrap.js');

function fxInverseBind(fxObject, fxFieldName, jsObject, jsFieldName) {
    Object.defineProperty(jsObject, jsFieldName, {
	getter: function() {
	    return fxObject[fxFieldName];
	},
	setter: function(value) {
	    fxObject[fxFieldName] = value;
	}
    });
}
    
function fxBind(fxObject, fxFieldName, jsObject, jsFieldName, inverse) {
    jsObject[jsFieldName] = fxObject[fxFieldName];
    FXRuntime.observe(fxObject, fxFieldName, function(old, aNew) { jsObject[jsFieldName] = aNew; });
    if (inverse) fxInverseBind(fxObject, fxFieldName, jsObject, jsFieldName);
}


var t1 = new Packages.FXTest();


var javafx = Packages.FXWrapFactory.javafx;

//FXRuntime.observe(t1, 'field', function(old, anew) { print('change: ' + [old,anew]); } )
//FXRuntime.observe(r, 'width', function(old, anew) { print('r changed: ' + [old,anew]); } )
//FXRuntime.observe(r, 'width', function(old, aNew) { anObject.aField = aNew; });
/*
Object.defineProperty(slider, 'position', {
    bind: function() {
	return r.x + 10;
    }
});
*/













var r = javafx.scene.shape.Rectangle({x: 10, width: 10, height: 10});
var slider = { position: 0 }; 
    // var slider = { position: bind r.x with inverse }
    // var slider = { position: bind(function() { return r.x }, true) }
fxBind(r, 'x', slider, 'position', true); 






