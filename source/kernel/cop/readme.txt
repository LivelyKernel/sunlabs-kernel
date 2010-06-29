



// Example for static layer activation

Morph.addMethods(LayerableObjectTrait);
Morph.prototype.activateLayersFrom = ["owner"];

cop.createLayer("TokyoTimeLayer");

cop.layerClass(TokyoTimeLayer, ClockMorph, {
 	get timeZoneOffset() {
 		return  8;
 	}
});

// Refactorings

(^\t*)createLayer\( -> $1cop.createLayer\(
(^\t*)layerClassAndSubclasses\( -> $1cop.layerClassAndSubclasses\(

