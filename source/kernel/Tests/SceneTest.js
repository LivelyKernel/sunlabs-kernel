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


TestCase.subclass('Tests.SceneTest.PathElementTest', {

	assertPathsEqual: function(expected, result) {
		this.assertEqual(expected.length/2, result.length, 'element count not the same');
		for (var i = 0, j = 0; i < expected.length; i+=2, j++) {
			// e sth like ['CurveTo', {isAbsolute: true, x: 100, y: 100}]
			var eClassName = expected[i];
			var props = expected[i+1]
			var r = result[j];
			rClassName = r.constructor.type
			rClassName = rClassName.substring(rClassName.lastIndexOf('.')+1, rClassName.length);
			this.assertEqual(eClassName, rClassName);
			this.assertMatches(props, r);
		}
	},

	test01ParsePathData: function() {
		var expected = ['MoveTo', {isAbsolute: true, x: 100, y: 100}]

		var result = lively.scene.PathElement.parse('M100,100');
		this.assertPathsEqual(expected, result);

		var result = lively.scene.PathElement.parse('M 100,100');
		this.assertPathsEqual(expected, result);

		var result = lively.scene.PathElement.parse('M100 ,100');
		this.assertPathsEqual(expected, result);

		var result = lively.scene.PathElement.parse('M  100 100');
		this.assertPathsEqual(expected, result);
	},

	test02ParseMultiplePaths1: function() {
		var data = 'm 1,2.97 c 0,3 -2.4,7 -7,9 0,0 0,1 0,1 l 0,-1.1 z';
		var expected = [
		'MoveTo', {isAbsolute: false, x: 1, y: 2.97},
		'BezierCurve2CtlTo', {isAbsolute: false, x: -7, y: 9, controlX1: 0, controlY1: 3, controlX2: -2.4, controlY2: 7},
		'BezierCurve2CtlTo', {isAbsolute: false, x: 0, y: 1, controlX1: 0, controlY1: 0, controlX2: 0, controlY2: 1},
		'LineTo', {isAbsolute: false, x: 0, y: -1.1},
		'ClosePath', {isAbsolute: false},
		];

		var result = lively.scene.PathElement.parse(data);
		this.assertPathsEqual(expected, result);
	},

	test02ParseMultiplePaths2: function() {
		var data = 'M0,0T48.25,-5.77T85.89,15.05T61.36,32.78';
		var expected = [
		'MoveTo', {isAbsolute: true, x: 0, y: 0},
		'CurveTo', {x: 48.25, y: -5.77},
		'CurveTo', {x: 85.89, y: 15.05},
		'CurveTo', {x: 61.36, y: 32.78},
		];

		var result = lively.scene.PathElement.parse(data);
		this.assertPathsEqual(expected, result);
	},



	test03AttributeFormat: function() {
		var data = "m 23.94392,1027.9701 c 0,3.8101 -2.42801,7.9937 -7.09725,9.2637 0,0.4856 0.0373,1.0086 0.0373,1.4942";
		var elems = lively.scene.PathElement.parse(data);
		var result = elems.collect(function(ea) { return ea.attributeFormat() }).join(' ');
		var expected = "m23.94392,1027.9701 c0,3.8101 -2.42801,7.9937 -7.09725,9.2637 c0,0.4856 0.0373,1.0086 0.0373,1.4942";
		this.assertEquals(expected, result);
	},
	
	test04NormalizeRelativePath: function() {
		var data = "m1,101 c0,3 -2,7 -7,0 m7,3 L5,105 C3,107 2,110, 6,120 M1,89 Z";
		p = new lively.scene.Path();
		p.setElementsFromSVGData(data);
		p.normalize();
		var result = p.createSVGDataFromElements();
		var expected = "m0,0 c0,3 -2,7 -7,0 m7,3 L4,4 C2,6 1,9 5,19 M0,-12 Z ";
		this.assertEquals(expected, result);
	},

});

});