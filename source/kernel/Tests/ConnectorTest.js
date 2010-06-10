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
	},
	
});

TestCase.subclass("Tests.ConnectorTest.ConnectorNodeInteractionTest", {

	testConnectMorphs: function() {
		var m1 = Morph.makeRectangle(new Rectangle(0,0,50,50));
		var m2 = Morph.makeRectangle(new Rectangle(100,100,50,50));		
		var c = Morph.makeConnector(pt(0,0), pt(1,1));
		c.connectMorphs(m1, m2);
	},

	testCopyConnector: function() {
		var container = Morph.makeRectangle(new Rectangle(0,0,300,300));
		container.m1 = Morph.makeRectangle(new Rectangle(0,0,50,50));
		container.m2 = Morph.makeRectangle(new Rectangle(100,100,50,50));		
		container.c = Morph.makeConnector(pt(0,0), pt(1,1));

		container.addMorph(container.m1);
		container.addMorph(container.m2);
		container.addMorph(container.c);
		
		container.c.connectMorphs(container.m1, container.m2);
		var containerCopy = container.duplicate();
		this.assert(container.m1 !== containerCopy.m1, " m1 did not copy")
		this.assert(container.c !== containerCopy.c, " c did not copy")
		this.assert(container.c.startMorph !== containerCopy.c.startMorph, " startMorph did not copy")
		this.assert(container.m1.connectorMorphs !== containerCopy.m1.connectorMorphs, " connectorMorphs array did not copy")		
		this.assert(container.m1.connectorMorphs[0] !== containerCopy.m1.connectorMorphs[0], " connectorMorphs[0] did not copy")		
		
		this.assert(containerCopy.c.startMorph === containerCopy.m1, " startMorph did not copy")		
		this.assert(containerCopy.c.endMorph === containerCopy.m2, " endMorph did not copy")
	},

	testCopyConnectorWithoutContainer: function() {
		var m1 = Morph.makeRectangle(new Rectangle(0,0,50,50));
		var m2 = Morph.makeRectangle(new Rectangle(100,100,50,50));		
		var c = Morph.makeConnector(pt(0,0), pt(1,1));
		
		c.connectMorphs(m1, m2);
		var copier = new Copier();
		// Change order of coping...
		var cC = c.copy(copier); 
		var m1C = m1.copy(copier);
		var m2C = m2.copy(copier);
		copier.finish();

		this.assert(m1 !== m1C, " m1 did not copy")
		this.assert(c !== cC, " c did not copy")
		this.assert(c.startMorph !== cC.startMorph, " startMorph did not copy")
		this.assert(m1.connectorMorphs !== m1C.connectorMorphs, " connectorMorphs array did not copy")		
		this.assert(m1.connectorMorphs[0] !== m1C.connectorMorphs[0], " connectorMorphs[0] did not copy")		
		
		this.assert(cC.startMorph === m1C, " startMorph did not copy")		
		this.assert(cC.endMorph === m2C, " endMorph did not copy")
	},

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

		var world = Morph.makeRectangle(rect(pt(0,0),pt(500,500)));
		world.world = function(){return this};
		world.addMorph(this.line);
		
		this.endPoint = pt(250, 50)
		this.newMorph = Morph.makeRectangle(rect(
			pt(this.endPoint.x - 25, this.endPoint.y - 25),
			pt(this.endPoint.x + 25, this.endPoint.y + 25)));
		world.addMorph(this.newMorph);
			
		WorldMorph.current().addMorph(this.newMorph)
		WorldMorph.current().addMorph(this.line)

		this.morphs = [this.newMorph, this.line]
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
	},
	
	tearDown: function() {
		if (this._errorOccured) {
			// let it stay open
		} else {
			this.morphs.each(function(ea){ea.remove()})
		}		
	},
});


}); // module

