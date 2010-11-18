

module('lively.Graffle').requires(['cop.Layers', 'lively.Connector', 'lively.LayerableMorphs']).toRun(function() {
	
cop.create("GraffleLayer")
.beGlobal()
.refineClass(PasteUpMorph, {

	addMorhWithHandleToWorld: function(morph) {
		this.world().addMorph(morph);
		var hand = this.world().hands[0]; 
		var handle = new HandleMorph(pt(0,0), lively.scene.Rectangle, hand, morph, "bottomRight");
		handle.setExtent(pt(0, 0));
		handle.mode = 'reshape';
		morph.addMorph(handle);
		hand.setMouseFocus(handle);
	},

	makeSelection: function(evt) {
		// console.log("make graffle selection");
		if (this.world().currentSelection != null) this.world().currentSelection.removeOnlyIt();
		if (evt.hand.isKeyDown("S")) {
			var m = Morph.makeRectangle(evt.point().asRectangle())
			return this.addMorhWithHandleToWorld(m)
		} else if (evt.hand.isKeyDown("T")) {
			var m = new TextMorph(evt.point().asRectangle());
			m.setBorderWidth(0.5);
			return this.addMorhWithHandleToWorld(m)
		} else if (evt.hand.isKeyDown("C")) {
			var m = Morph.makeConnector(evt.point())
			
			this.world().addMorph(m);
			var handle = m.makeHandle(evt.point(), 1, evt)
			m.addMorph(handle);	
			evt.hand.setMouseFocus(handle);
			handle.onMouseDown(evt);
			return;
		}
		return cop.proceed(evt)
	}
})
.refineClass(WorldMorph, {
	onKeyPress: function(evt) {
		var map = {S: "shape", C: "connect", T: "text"};
		var mode = map[evt.getKeyChar().toUpperCase()];				
		if (mode)
			evt.hand.ensureIndicatorMorph().setTextString(mode);
		return cop.proceed(evt) 
	},

	onKeyUp: function(evt) {
		evt.hand.ensureIndicatorMorph().setTextString("")
		return cop.proceed(evt)
	},
});



	
});