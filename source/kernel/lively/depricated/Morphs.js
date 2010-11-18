
module('lively.depricated.Graffle').requires(['cop.Layers', 'lively.Connector', 'lively.LayerableMorphs']).toRun(function() {

Morph.subclass("MorphDuplicatorPanel", {

	borderSpace: 5, 
	slotWidth: 45,

	initialize: function($super, position, numberOfSlots) {
		numberOfSlots = numberOfSlots || 7;
		var totalWidth = this.slotWidth * numberOfSlots + this.borderSpace;
		$super(new lively.scene.Rectangle(position.extent(pt(totalWidth, 50))));
		this.applyStyle({borderWidth: 2, borderColor: Color.darkGray, fill: Color.white});
		this.shapeRoundEdgesBy(10);
		for (var i=0; i < numberOfSlots; i++) {
			this.addSlot(i);
		}
	},

	suppressHandles: true,

	addSlot: function(n) {
		var slot = new MorphDuplicatorMorph(pt( n * this.slotWidth + this.borderSpace, this.borderSpace));
		this.addMorph(slot);
	}
})


/*
 * MorphDuplicatorMorph 
 * - duplicates its submorph and puts it into the hand
 * - can be customized by dropping a morph on it
 */
Morph.subclass('MorphDuplicatorMorph', {
	
	initialize: function($super, position) {
		$super(new lively.scene.Rectangle(position.extent(pt(40,40))));
		this.applyStyle({borderWidth: 1, borderColor: Color.gray, fill: Color.white});
		this.setWithLayers([MorphPrototypeLayer]);
		this.shapeRoundEdgesBy(10);
		this.beClipMorph();
	},

	suppressHandles: true,

	addMorph: function($super, morph) {
		var oldTarget = this.target();
		if (oldTarget)
		 	oldTarget.remove();
		this.setScale(1);
		var scale = this.bounds().width / morph.shape.bounds().width;

		morph.ignoreEvents();
		$super(morph);

		morph.setScale(scale + 0.1);		
		morph.centerAt(this.shape.bounds().center());
		console.log("scale " + scale);

	},

	okToBeGrabbedBy: function() {
		return false		
	},
	
	target: function() {
		return this.submorphs[0]
	},

	handlesMouseDown: Functions.True,

	onMouseDown: function(evt) {
		if (!this.target()) return;
		var duplicate = this.target().duplicate();
		duplicate.enableEvents();
		duplicate.setPosition(pt(0,0));
		duplicate.setScale(1);
		evt.hand.grabMorph(duplicate, evt)	
	},

	onMouseMove: Functions.True,

	activeLayers: function() { return []}
});

cop.createLayer("MorphPrototypeLayer");

// Disabled for performance issues
/*
cop.layerClassAndSubclasses(MorphPrototypeLayer, Morph, {
	get openForDragAndDrop() {
		return false;
	},

	okToBeGrabbedBy: function() {
		return false		
	},

	get suppressHandles() {
		return true;
	},

	handlesMouseDown: function() {

	}
});
*/

Morph.makeDefaultDuplicatorPanel = function(point) {
	var pane = new MorphDuplicatorPanel(point, 10);
	var i = 0;
	var add = function(m) {pane.submorphs[i].addMorph(m); i++};

	add(new TextMorph(pt(0,0).extent(pt(120, 10)), "Text"));
	add(Morph.makeLine([pt(0,0), pt(60, 30)], 2, Color.black));
	add(Morph.makeConnector(pt(0,0), pt(60, 30)));
	add(Morph.makeRectangle(pt(0,0), pt(60, 30)));
	add(Morph.makeCircle(pt(0,0), 25));
	add(Morph.makeStar(pt(0,0)));
	add(new MarkerMorph(pt(0,0).extent(pt(50, 50))));
	
	return pane
}

})