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
		var menu;
		// TOTO remove this workaround ContextJS issue (morphMenu is overriden in TextMorph and called with $super) 
		withoutLayers([ScriptingLayer], function() {
			menu= proceed(evt);
		});
		menu.addItem(["Scripting", [
			["startSteppingScripts", this.startSteppingScripts],		
			["layers", [
				["addWithLayer", this.layerMenuAddWithLayerItems()],		
				["removeWithLayer", this.layerMenuRemoveWithLayerItems()]]],		
		]])
		return menu;
	}
});

Morph.addMethods({
	showNameField: function() {
		this.removeNameField();
		var nameField = new TextMorph(new Rectangle(0,-15,100,20), this.name);
		this.addMorph(nameField);
		nameField.beLabel();
		nameField.applyStyle({fill: null, borderWidth: 0, textColor: Color.gray.darker(), fontSize: 10})
		nameField.isNameField = true;
		connect(this, 'name', nameField, 'setTextString')
	},

	removeNameField: function() {
		this.submorphs.select(function(ea) {return ea.isNameField}).invoke('remove')
	},

	isShowingNameField: function() {
		return this.submorphs.detect(function(ea) {return ea.isNameField}) !== undefined
	}
})


cop.create('DisplayMorphNameLayer').refineClass(Morph, {
	subMenuPropertiesItems: function (proceed, evt) {
		var name, func; 
		var self = this;
		if(this.isShowingNameField() ) {
			name = "[X] show name field" ;
			func = function() {self.removeNameField()}
		} else {
			name = "[] show name field" ;
			func = function() {self.showNameField()}

		}
		return proceed(evt).concat([[name, func]])
	}
}).beGlobal()

cop.create('CopyCheapListMorphLayer').refineClass(CheapListMorph, {
	morphMenu: function(proceed, evt){
		var menu = proceed(evt);
		var self = this;
		menu.addItem(["duplicate as TextMorph", function() {
			evt.hand.addMorph(new TextMorph(new Rectangle(0,0,500,300), self.textString))
		}])

		return menu
	}
})
CopyCheapListMorphLayer.beGlobal()




}) // end of module