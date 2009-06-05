load('util.js');


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






