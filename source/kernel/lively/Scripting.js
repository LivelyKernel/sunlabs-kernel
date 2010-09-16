module('lively.Scripting').requires('lively.Widgets', 'cop.Layers').toRun(function() {
/*
 *  This module is for textual scripting morphs on a lively page
 */

Object.extend(Layer, {
	allGlobalInstances: function() {
		return Object.values(Global).select(function(ea) {return ea instanceof Layer})
	}
})

cop.create('ScriptingLayer')
.beGlobal()
.refineClass(Morph, {

	layerMenuAddWithLayerItems: function() {
		var self = this;
		var list =  Layer.allGlobalInstances()
			.invoke('getName')
			.sort()
			.collect(function(ea) {return [ea, function() {
				self.world().setStatusMessage(
					"enable withLayer " + ea + " in " + self, Color.blue, 10)
				self.addWithLayer(Global[ea])
			}]});
		if (list.length == 0) 
			return function() {}
		else
			return list	
	},

	layerMenuRemoveWithLayerItems: function() {
		var self = this;
		var list =  this.getWithLayers()
			.invoke('getName')
			.sort()
			.collect(function(ea) {return [ea, 
				function() {
					self.world().setStatusMessage(
							"remove withLayer " + ea + " in " + self, Color.blue, 10);
					self.removeWithLayer(Global[ea])										
				}]});
		if (list.length == 0) 
			return function() {}
		else
			return list
	},

	morphMenu: function(proceed, evt) {
		var menu = proceed(evt);
		menu.addItem(["Scripting", [
			["startSteppingScripts", this.startSteppingScripts],		
			["layers", [
				["addWithLayer", this.layerMenuAddWithLayerItems()],		
				["removeWithLayer", this.layerMenuRemoveWithLayerItems()]]],		
		]])
		return menu;
	}
});


}) // end of module