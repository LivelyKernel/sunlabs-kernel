



// Example for static layer activation

Morph.addMethods(LayerableObjectTrait);
Morph.prototype.activateLayersFrom = ["owner"];

cop.create('TokyoTimeLayer').refineClass(ClockMorph, {
 	get timeZoneOffset() {
 		return  8;
 	}
});

// Refactorings

(^\t*)createLayer\( -> $1cop.create\(
(^\t*)layerClassAndSubclasses\( -> $1cop.layerClassAndSubclasses\(

