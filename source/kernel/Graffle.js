

module('lively.Graffle').requires(['cop.Layers', 'lively.Connector']).toRun(function() {
	
createLayer("GraffleLayer");
enableLayer(GraffleLayer);


layerClass(GraffleLayer, PasteUpMorph, {
	makeSelection: function(proceed, evt) {
		// console.log("make graffle selection");
		if (this.world().currentSelection != null) this.world().currentSelection.removeOnlyIt();
		if (evt.hand.isKeyDown("S")) {
			var m = Morph.makeRectangle(evt.point().asRectangle());
			this.world().addMorph(m);
			var handle = new HandleMorph(pt(0,0), lively.scene.Rectangle, evt.hand, m, "bottomRight");
			handle.setExtent(pt(0, 0));
			handle.mode = 'reshape';
			m.addMorph(handle);
			evt.hand.setMouseFocus(handle);
			return
		} else if (evt.hand.isKeyDown("T")) {
			var m = new TextMorph(evt.point().asRectangle());
			m.setBorderWidth(0);
			this.world().addMorph(m);
			var handle = new HandleMorph(pt(0,0), lively.scene.Rectangle, evt.hand, m, "bottomRight");
			handle.setExtent(pt(0, 0));
			handle.mode = 'reshape';
			m.addMorph(handle);
			evt.hand.setMouseFocus(handle);
			return
		} else if (evt.hand.isKeyDown("L")) {
			var m = Morph.makeLine([pt(-1,-1), pt(0,0)], 1, Color.black);
			m.setPosition(evt.point());
			this.world().addMorph(m);
			var handle = m.makeHandle(evt.point(), 1, evt)
			m.addMorph(handle);	
			evt.hand.setMouseFocus(handle);
			return
		} else if (evt.hand.isKeyDown("C")) {

			var m = Morph.makeLine([pt(-1,-1), pt(0,0)], 1, Color.black);
			m.setPosition(evt.point());
			this.world().addMorph(m);

			m.setWithLayers([ConnectorMorphLayer]);

			var handle = m.makeHandle(evt.point(), 1, evt)
			m.addMorph(handle);	
			evt.hand.setMouseFocus(handle);
			handle.onMouseDown(evt);
			// evt.hand.grabMorph(handle,evt);			
			return;
		}
		return proceed(evt)
	}
});


	
});