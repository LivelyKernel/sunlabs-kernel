module('lively.Tests.SceneTest').requires('lively.TestFramework').toRun(function() {

TestCase.subclass('lively.Tests.SceneTest.PointTest', {

	testTransformDirection: function() {
		var tfm = new lively.scene.Similitude()
		var p1 = pt(10, 0);
		p2 = p1.matrixTransformDirection(tfm)
		this.assertEqualState(p2, p1, "identity transform broken ")
	}
})

});