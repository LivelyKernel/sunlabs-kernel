module('Tests.ConnectorTest').requires(['lively.Connector', 'lively.TestFramework']).toRun(function() {

TestCase.subclass("Tests.ConnectorTest.NodeMorphLayeredMorphTest", {
	setUp: function() {
		this.morph = Morph.makeRectangle(new Rectangle(50,50,100,100));
		this.morph.setWithLayers([NodeMorphLayer])
	},

	testConnectLineMorph: function() {
		var line = "LineMock";
		this.morph.connectLineMorph(line);
		this.assert(this.morph.connectorMorphs.include(line));
	}

});

TestCase.subclass("Tests.ConnectorTest.ConnectorMorphLayerHandleTest", {
	setUp: function() {
		var pos = pt(0,0);
		var pos2 = pt(200,0);
		this.line = Morph.makeLine([pos, pos2], 1, Color.black);
		this.sut = this.line.makeHandle(pos2, 1, newFakeMouseEvent(pos2));
		this.line.addMorph(this.sut);
		this.line.setPosition(pt(100,100));
		this.line.setWithLayers([ConnectorMorphLayer]);

		// fake world
		var world = Morph.makeRectangle(rect(pt(0,0),pt(500,500)));
		world.world = function(){return this};
		world.addMorph(this.line);

		this.endPoint = pt(250, 50)
		this.newMorph = Morph.makeRectangle(rect(
			pt(this.endPoint.x - 25, this.endPoint.y - 25),
			pt(this.endPoint.x + 25, this.endPoint.y + 25)));
		world.addMorph(this.newMorph);
			
		// WorldMorph.current().addMorph(this.newMorph)
		// WorldMorph.current().addMorph(this.line)
	},
	
	tearDown: function() {
	},

	testHandle: function() {
		this.assert(this.sut instanceof HandleMorph, "handle is no handle morph")
	},

	testLayerActivation: function() {
		this.assertEqual(this.sut.owner, this.line, " Handle has no owner")
		this.assertEqual(this.sut.getActivatedLayers()[0], ConnectorMorphLayer)
	},	

	testGetGlobalPosition: function() {	
		this.assert(this.sut.getGlobalPosition(), "no global position")
	},

	testFindMorphUnderMe: function() {
		// console.log("morph " + this.sut.findMorphUnderMe());
		this.sut.setPosition(this.sut.owner.localize(this.endPoint));
		this.assert(this.sut.findMorphUnderMe())
	},

	testIsEndHandle: function() {
		this.assert(this.sut.isEndHandle(), "is no end handle")
	},

	testConnectToMorph: function() {
		this.sut.connectToMorph(this.newMorph);
		this.assert(this.line.endMorph, "no end morph");
		this.assertEqual(this.line.endMorph.getActivatedLayers().length, 1, 
			"morph is not in connection layers");

		this.assert(this.line.endMorph.connectorMorphs.include(this.line), 
			"line not in connector morphs");

		// this.assertEqualState(this.line.getGlobalEndPos(), this.endPoint, "wrong end point ");
	}

});


}); // module

