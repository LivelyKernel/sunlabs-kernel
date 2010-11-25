module('Tests.LayoutTests').requires('Tests.MorphTest', 'draft.DraftLayout').toRun(function() {

TestCase.subclass("Tests.LayoutTests.LayoutTest",
'running', {
	
	setUp: function($super) {
		$super();
		this.layouter = new this.layouterClass()
	},

	tearDown: function($super) {
		$super();
		if (!this._errorOccured && this.morph)
			this.morph.remove() // othrwise let it stay open
	},

	createTestMorph: function(arg) {
		var spec = !arg || Object.isString(arg) ? {name: arg} : arg;
		spec.name = spec.name || this.currentSelector + '_testMorph';
		var pos = pt(0,0), extent = spec.extent || pt(300,100);
		if($morph(spec.name)) {
			pos = $morph(spec.name).getPosition();
			$morph(spec.name).remove();
		}
 		this.morph = new BoxMorph(pos.extent(extent));
		this.morph.layoutManager = this.layouter;
		this.morph.name = spec.name;
		this.morph.setFill(Color.gray);
		this.morph.openInWorld();
		return this.morph;		
	},

	box: function(extentX, extentY) {
		var m = Morph.makeRectangle(0,0, extentX || 50, extentY || 50);
		m.applyStyle({borderWidth: 0, fill: Color.random()})
		return m;
	},
},
'settings', {
	layouterClass: Global.LayoutManager2 || LayoutManager,
},
'testing', {
	test01aProportionalScaleMorph: function() {
		var m = this.createTestMorph({extent: pt(100, 100)}),
			box = this.box(10,10);
		m.setBorderWidth(0);
		box.hResizing = 'proportional';
		box.vResizing = 'proportional';
		m.addMorph(box);
		m.setExtent(pt(110, 110));
		this.assertEqual(box.getExtent(), pt(11,11), "wrong extent after resize");
	},
	test01bProportionalScaleAndMoveMorph: function() {
		var m = this.createTestMorph({extent: pt(100, 100)}),
			box = this.box(10,10);
		box.setPosition(pt(10,10))
		box.hResizing = 'proportional';
		box.vResizing = 'proportional';
		m.addMorph(box);
		m.setBorderWidth(0);
		m.setExtent(pt(110, 110));
		this.assertEqual(new Rectangle(11, 11, 11, 11), box.bounds(), "wrong extent after resize");
	},

});



Tests.LayoutTests.LayoutTest.subclass("Tests.LayoutTests.HorizontalLayoutTest",
'settings', {
	layouterClass: Global.HorizontalLayout2 || HorizontalLayout,
},
'testing', {

	test01aToLiteral: function() {
		var sut = new HorizontalLayout();
		this.assertEqualState(sut.toLiteral(), {} )
	},
	
	test01bFromLiteral: function() {
		var sut = HorizontalLayout.fromLiteral({})
		this.assert(sut instanceof HorizontalLayout)
	},

	test03Layout: function() {
		var m = this.createTestMorph("HorizontalLayoutTest_M2"),
			s1 = this.box(50,50),
			s2 = this.box(50,50),
			s3 = this.box(50,50);

		m.addMorph(s1);
		m.addMorph(s2);
		m.addMorph(s3);

		s2.remove();
		m.layoutManager.layout(m);	

		this.assertEqual(s1.getPosition(), pt(0,0), "s1 bad");
		this.assertEqual(s3.getPosition(), pt(50, 0), "s3 bad");
	},

	test02aLayoutOnAddMorph: function() {
		var m = this.createTestMorph(),
			s1 = this.box(50,50),
			s2 = this.box(50,50),
			s3 = this.box(50,50);

		m.addMorph(s1);
		m.addMorph(s2);
		m.addMorph(s3);
	
		this.assertEqual(s1.getPosition(), pt(0,0), "s1 bad");
		this.assertEqual(s2.getPosition(), pt(50, 0), "s2 bad");
		this.assertEqual(s3.getPosition(), pt(100, 0), "s3 bad");
	},

	test02bAddInGap: function() {
		var m = this.createTestMorph(),
			s1 = this.box(50,50),
			s2 = this.box(50,50),
			s3 = this.box(50,50),
			s4 = this.box(50,50);
		m.addMorph(s1);
		m.addMorph(s2);
		m.addMorph(s3);
		s2.remove();
		m.addMorph(s4);
		this.assertEqual(s4.getPosition(), pt(100, 0), "s4 bad " + s4.getPosition().x);
		s1.remove(); s4.remove(); m.addMorph(s4);
		this.assertEqual(s4.getPosition(), pt(50, 0), "s4 bad 2" + s4.getPosition().x);
	},

	test03aVerticalSpaceFillSubMorph: function() {
		var m = this.createTestMorph({extent: pt(100, 200)}),
			box = this.box(50,50);
		box.vResizing = 'spaceFill';
		m.addMorph(box);
		this.assertEquals(pt(50, 200), box.getExtent());
	},

	test03bHorizontalSpaceFillSubMorph: function() {
		var m = this.createTestMorph({extent: pt(300, 70)}),
			box1 = this.box(50,50), box2 = this.box(50,50), box3 = this.box(50,50);
		m.padding = Rectangle.inset(10,0,0,0)
		box1.hResizing = 'spaceFill';
		box2.hResizing = 'spaceFill';
		box3.hResizing = 'rigid';
		m.addMorph(box1);
		m.addMorph(box2);
		m.addMorph(box3);
		this.assertEquals(pt(50, 50), box3.getExtent(), 'box3');
p1 = pt(120, 50)
p2 = box1.getExtent()
		this.assertEquals(pt(120, 50), box1.getExtent(), 'box1');
		this.assertEquals(pt(120, 50), box2.getExtent(), 'box2');
	},

	test03cComputeMorphBounds: function() {
		var box1 = this.box(20,20), box2 = this.box(20,20);
		box1.hResizing = 'spaceFill';
		box2.hResizing = 'rigid';
		var bounds = this.layouter.computeMorphBounds([box1, box2], new Rectangle(0,0, 100, 20), pt(80, 20));
		this.assertEquals(new Rectangle(0,0, 80, 20), bounds[0]);
		this.assertEquals(new Rectangle(80,0, 20, 20), bounds[1])
	},
	test04aResizeAndCheckSubmorphPositions: function() {
		var m = this.createTestMorph({extent: pt(100, 100)}),
			b1 = this.box(50,100), b2 = this.box(50,100);
		m.addMorph(b1);
		m.addMorph(b2);
		this.assertEqual(b1.getPosition(), pt(0,0), "b1 pos before");
		this.assertEqual(b2.getPosition(), pt(50,0), "b2 pos before");
		m.setBounds(new Rectangle(-50, 0, 50, 100));
		this.assertEqual(b1.getPosition(), pt(0,0), "b1 pos after");
		this.assertEqual(b2.getPosition(), pt(50,0), "b2 pos after");
	},
	test05aMarginAndSpaceFill: function() {
		var m = this.createTestMorph({extent: pt(50, 50)}),
			box = this.box(10,10);
		box.margin = Rectangle.inset(10,10,10,10);
		box.hResizing = 'spaceFill';
		box.vResizing = 'spaceFill';
		m.addMorph(box);

		this.assertEquals(new Rectangle(10, 10, 30, 30), box.bounds());
	},
	test06aNoLayoutDuring: function() {
		var m = this.createTestMorph(),
			s1 = this.box(50,50),
			s2 = this.box(50,50);

		LayoutManager.noLayoutDuring(function() {
			m.addMorph(s1);
			m.addMorph(s2);
		});
		this.assertEqual(pt(0, 0), s1.getPosition());
		this.assertEqual(pt(0, 0), s2.getPosition());
		m.relayout();
		this.assertEqual(pt(50, 0), s2.getPosition());
	},
	test06bNoLayoutRecursively: function() {
		var test = this;
		LayoutManager.noLayoutDuring(function() {
			LayoutManager.noLayoutDuring(function() {});
			test.assert(!LayoutManager.layoutAllowed(), 'layout allowed although in no layout block')
		});
	},





})


Tests.LayoutTests.LayoutTest.subclass("Tests.LayoutTests.VerticalLayoutTest",
'settings', {
	layouterClass: Global.VerticalLayout2 || VerticalLayout,
},
'testing', {

	test01Layout: function() {
		var m = this.createTestMorph(),
			s1 = this.box(50,50),
			s2 = this.box(50,50),
			s3 = this.box(50,50);

		s1.setBorderWidth(1);
		s2.setBorderWidth(1);
		s3.setBorderWidth(1);

		m.addMorph(s1);
		m.addMorph(s2);
		m.addMorph(s3);

		s2.remove();
		m.layoutManager.layout(m);	

		this.assertEqualState(s1.getPosition(), pt(0,0), "s1 bad");
		this.assertEqualState(s3.getPosition(), pt(0,50), "s3 bad");
	},

	test02LayoutBeforeAddMorph: function() {
		var m = this.createTestMorph(),
			s1 = this.box(50,50),
			s2 = this.box(50,50),
			s3 = this.box(50,50);

		s1.setBorderWidth(1);
		s2.setBorderWidth(1);
		s3.setBorderWidth(1);

		m.addMorph(s1);
		m.addMorph(s2);
		m.addMorph(s3);
	
		this.assertEqualState(s1.getPosition(), pt(0,0), "s1 bad");
		this.assertEqualState(s2.getPosition(), pt(0,50), "s2 bad");
		this.assertEqualState(s3.getPosition(), pt(0,100), "s3 bad");
	},
	test03aComputeMorphBoundsTwoMorphWithSpaceFill: function() {
		var box1 = this.box(20,20), box2 = this.box(20,20);
		box1.vResizing = 'spaceFill';
		box1.hResizing = 'rigid';
		box2.vResizing = 'rigid';
		box2.hResizing = 'spaceFill';
		var bounds = this.layouter.computeMorphBounds([box1, box2], new Rectangle(0,0, 60, 100), pt(40, 80));
		this.assertEquals(new Rectangle(0,0, 20, 80), bounds[0]);
		this.assertEquals(new Rectangle(0,80, 60, 20), bounds[1]);
	},
	test03bComputeSpaceFillPerMorphAndAttachToOwner: function() {
		var m = this.createTestMorph({extent: pt(100, 100)}),
			box1 = this.box(10,10), box2 = this.box(10,10);
		m.padding = Rectangle.inset(0,0,0,10);
		box2.margin = Rectangle.inset(0, 10, 0, 0);
		box1.hResizing = 'spaceFill';
		box1.vResizing = 'spaceFill';
		box2.hResizing = 'spaceFill';
		box2.vResizing = 'rigid';

		m.addMorph(box1);
		m.addMorph(box2);

		// this.layouter.computeSpaceFillExtentPerMorph(m, m.innerBounds(), m.submorphs);
		// this.assertEquals(pt(100 / 2, 50 - 10 - 10 - 5), m.getSpaceFillExtent(), "spaceFillExtent");
		this.assertEquals(new Rectangle(0,  0, 100, 70), box1.bounds(), "box1");
		this.assertEquals(new Rectangle(0, 80, 100, 10), box2.bounds(), "box2");
	},
	test05aMarginAndSpaceFill: function() {
		var m = this.createTestMorph({extent: pt(50, 50)}),
			box = this.box(10,10);
		box.margin = Rectangle.inset(10,10,10,10);
		box.hResizing = 'spaceFill';
		box.vResizing = 'spaceFill';
		m.addMorph(box);

		this.assertEquals(new Rectangle(10, 10, 30, 30), box.bounds());
	},

	test05bMarginAndRigid: function() {
		var m = this.createTestMorph({extent: pt(50, 50)}),
			box = this.box(10,10);
		box.margin = Rectangle.inset(10,10,10,10);
		box.hResizing = 'spaceFill';
		box.vResizing = 'rigid';
		m.addMorph(box);

		this.assertEquals(new Rectangle(10, 10, 30, 10), box.bounds());
	},

});



}) // end of module