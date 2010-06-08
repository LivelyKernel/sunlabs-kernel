module('Tests.WidgetTest').requires('lively.TestFramework').toRun(function() {

MorphTestCase.subclass('Tests.WidgetTest.SliderMorphTest', {
	
	setUp: function($super) {
		$super()
		this.sut = new SliderMorph();
		this.openMorphAt(this.sut, pt(20,100))
		this.sut.setExtent(pt(20,100))
	},
	
	testUpdateValueChangesSliderPosition: function() {
		var oldPos = this.sut.slider.getPosition();
		this.sut.setValue(5);
		this.assert(this.sut.slider.getPosition().y > oldPos.y)
	},
	
	testDuplicateSliderMorph: function() {
		this.sutCopy = this.sut.duplicate();
		this.openMorphAt(this.sutCopy, pt(50,100))		

		this.sut.setValue(5);

		this.assert(this.sutCopy.value == 0, " model is somehow shared")
	},
	
	
	
})



}) // end of module