



// Example for static layer activation

Morph.addMethods(LayerableObjectTrait);
Morph.prototype.activateLayersFrom = ["owner"];

createLayer("TokyoTimeLayer");

cop.layerClass(TokyoTimeLayer, ClockMorph, {
 	get timeZoneOffset() {
 		return  8;
 	}
});

