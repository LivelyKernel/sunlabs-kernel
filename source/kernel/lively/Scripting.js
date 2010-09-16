module('lively.Scripting').requires('lively.Widgets', 'cop.Layers').toRun(function() {
/*
 *  This module is for textual scripting morphs on a lively page
 */

cop.create('ScriptingLayer').refineClass('Morph', {

	morphMenu: function(proceed, evt) {
		var menu = proceed(evt);

	
		return menu;
	}

})




// Enter your code here

}) // end of module