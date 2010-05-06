module('Tests.SceneTest').requires('lively.TestFramework').toRun(function() {


printMatrix =  function(m) {
	var p = 0.001
		 
	return "{a:" + m.a.roundTo(p) + ", b:" + m.b.roundTo(p) + 
		", c:" + m.c.roundTo(p) + ", d:" + m.d.roundTo(p) + 
		", e:" + m.e.roundTo(p) + ", f:" + m.f.roundTo(p) + "}"
}

TestCase.subclass('Tests.SceneTest.PointTest', {

	testTransformDirection: function() {
		
		var tfm = new lively.scene.Similitude()
		var p1 = pt(10, 0);
		p2 = p1.matrixTransformDirection(tfm)
		
		this.assertEqualState(p2, p1, "identity transform broken ")
	},
})

TestCase.subclass('Tests.SceneTest.MatrixTest', {
	
	setUp: function() {
		this.sut = new lively.scene.Similitude().toMatrix()
	},

	testTranslate: function() {
		var tfm = this.sut.translate(10, 20);
		var p2 = pt(0,0).matrixTransform(tfm);
		this.assertEqualState(p2, pt(10, 20), "matrix translate broken ")
	},

	testRotate: function() {
		var tfm = this.sut.rotate(90);
		var p2 = pt(0,10).matrixTransform(tfm);
		this.assertEqualState(p2.roundTo(0.001), pt(-10, 0), "matrix translate broken ")
	},

	testMultiplyIndentities: function() {
		var tfm1 = new lively.scene.Similitude().toMatrix();
		var tfm2 = new lively.scene.Similitude().toMatrix();
		var tfm3 = tfm1.multiply(tfm2);
		printMatrix(tfm3)
		this.assertEqual(printMatrix(tfm3),"{a:1, b:0, c:0, d:1, e:0, f:0}", "matrix multiply broken ")
	},

	testMultiplyTranslations: function() {
		var tfm1 = new lively.scene.Similitude().toMatrix();
		var tfm1 = this.sut.translate(10, 20);
		var tfm2 = new lively.scene.Similitude().toMatrix();
		var tfm2 = this.sut.translate(30, 40);
		var tfm3 = tfm1.multiply(tfm2);
		this.assertEqual(printMatrix(tfm3),"{a:1, b:0, c:0, d:1, e:40, f:60}", "matrix multiply forward broken ")
		// order does not play a role for multiplying translations
		var tfm4 = tfm2.multiply(tfm1);
		this.assertEqual(printMatrix(tfm4),"{a:1, b:0, c:0, d:1, e:40, f:60}", "matrix multiply back broken ")
	},


	testMultiplyTranslationWithRotation: function() {
		var tfm1 = new lively.scene.Similitude().toMatrix();
		var tfm1 = this.sut.translate(10, 20);
		var tfm2 = new lively.scene.Similitude().toMatrix();
		var tfm2 = this.sut.rotate(90);
		var tfm3 = tfm1.multiply(tfm2);
		this.assertEqual(printMatrix(tfm3),"{a:0, b:1, c:-1, d:0, e:10, f:20}", "matrix multiply forward broken ")
		// order does play a role for multiplying translation with rotation
		var tfm4 = tfm2.multiply(tfm1);
		this.assertEqual(printMatrix(tfm4),"{a:0, b:1, c:-1, d:0, e:-20, f:10}", "matrix multiply back broken ")
	},



})



TestCase.subclass('Tests.SceneTest.RotateMorphTest', {
	
	setUp: function() {
		var name = 'RotateMorphTestMorph';
		if($morph(name))
			$morph(name).remove();
		this.origin = pt(500,100);
		this.extent =  pt(200,100);
		this.morph = Morph.makeRectangle(this.origin.extent(this.extent))
		this.morph.name = name;

		this.morph.openInWorld()
	},

	testSetTransform: function() {
		
		var pos = pt(10,20)
		var newTfm = new lively.scene.Similitude().toMatrix();
		newTfm = newTfm.translate(pos.x, pos.y);
		this.morph.setTransform(new lively.scene.Similitude(newTfm));

		this.assertEqualState(this.morph.origin.roundTo(0.001), pos)
	},

	testRotate: function() {
		
		var pos = pt(0,100)
		var tfm = new lively.scene.Similitude().toMatrix();
		tfm = tfm.rotate(-90);
		tfm = tfm.translate(pos.x, pos.y);

		this.morph.setTransform(new lively.scene.Similitude(tfm));
		this.assertEqualState(this.morph.origin.roundTo(0.001), pt(100,0))
	},


	testRotateFixedAround: function() {
		
		//var center = pt(600,150)
		var center = pt(100,50)


		var tfm = new lively.scene.Similitude().toMatrix();
		tfm = tfm.translate(center.x, center.y);
		tfm = tfm.rotate(-90)		
		tfm = tfm.translate( -center.x, -center.y);
	
		var oldTfm = new lively.scene.Similitude().toMatrix();
		oldTfm = oldTfm.translate(this.origin.x, this.origin.y);
		
		var tfm = oldTfm.multiply(tfm);
		
		this.morph.setTransform(new lively.scene.Similitude(tfm));
		this.assertEqualState(this.morph.origin.roundTo(0.001), pt(550,250))
	},

	testCombineTransform: function() {
		
		var oldTfm = this.morph.getTransform().toMatrix();		
		var pos = pt(10,20)
		var newTfm = new lively.scene.Similitude().toMatrix();
		newTfm = newTfm.translate(pos.x, pos.y);
		var newTfm = newTfm.multiply(oldTfm);
		this.morph.setTransform(new lively.scene.Similitude(newTfm));

		this.assertEqualState(this.morph.origin.roundTo(0.001), this.origin.addPt(pos))
	},

	testRotateAround: function() {
		this.assertEqualState(this.morph.origin, pt(500, 100), " morph has wrong origin ")

		var center = pt(600,150);
		var center = pt(100,50);
		this.morph.rotateAround(-90, center)

		this.assertEqualState(this.morph.origin.roundTo(0.001), pt(550,250), " rotation broken ")
	},

	tearDown: function() {

		this.morph.remove()

	}
})

TestCase.subclass('Tests.SceneTest.PointTest', {

	testTransformDirection: function() {
		var tfm = new lively.scene.Similitude()
		var p1 = pt(10, 0);
		p2 = p1.matrixTransformDirection(tfm)
		this.assertEqualState(p2, p1, "identity transform broken ")
	}
})

TestCase.subclass('Tests.SceneTest.FillGarbageCollectionTest', {

	testCollectAllFillsInObject: function() {
		var gfx = lively.paint;
		var fill = new gfx.LinearGradient([new gfx.Stop(0, Color.white), new gfx.Stop(1, Color.lightGray)]);
		var obj = {a: 1, b: fill};
		var result = lively.data.Wrapper.collectAllFillsInObject(obj)
		this.assertIdentity(result[0], fill, "fill got not collected")
	},

	testCollectAllFillsInObjects: function() {
		var gfx = lively.paint;
		var fill = new gfx.LinearGradient([new gfx.Stop(0, Color.white), new gfx.Stop(1, Color.lightGray)]);
		var obj = {a: 1, b: fill};
		var result = lively.data.Wrapper.collectAllFillsInObjects([obj, 3, "Hello", Morph])
		this.assertIdentity(result[0], fill, "fill got not collected")
	},

	testCollectAllFillsInLinkMorph: function() {
		var fill = LinkMorph.prototype.style.fill;
		var result = lively.data.Wrapper.collectAllFillsInObject(LinkMorph)
		this.assert(result.include(fill), "fill got not collected")
	},
	
})

Object.subclass("FillCollectingBenchmark", {

	bechmarkCollectFillsStartingFromGlobal: function() {
		var start = new Date().getTime();	
		var result = lively.data.Wrapper.collectAllFillsInObjects(Object.values(Global))
		var time = new Date().getTime() - start;
		console.log("Collected all Fills in Global in " + time + "ms")
		return time
	}
});

});




















