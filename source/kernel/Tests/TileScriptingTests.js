
module('TileScriptingTests.js').requires('TileScripting.js').toRun(function() {
    
TestCase.subclass('TileTest', {
    
    testDropAcceptsTile: function() {
        var drop = new DropArea();
        var tile = new Tile();
        
        drop.addMorph(tile);
        this.assertIdentity(tile.owner, drop);
        this.assert(drop.submorphs.include(tile));
    },
    
    testDropAcceptsOnlyOneTile: function() {
        var drop = new DropArea();
        var tile1 = new Tile();
        var tile2 = new Tile();
        
        drop.addMorph(tile1);
        drop.addMorph(tile2);
        this.assertIdentity(tile1.owner, drop);
        this.assert(!tile2.owner, 'tile 2 has a owner...');
        this.assert(!drop.submorphs.include(tile2), 'tile 2 was added to dropArea');
    }
});

TestCase.subclass('IfTileTest', {
    
    testCanAddExprAndTestExpression: function() {
        var tile = new IfTile();
        var testTile = new Tile();
        this.assert(tile.testExprDropArea instanceof Morph, 'No testExpression morph');
        tile.testExprDropArea.addMorph(testTile);        
        this.assertIdentity(testTile, tile.testExprDropArea.tile);
        
        this.assert(tile.exprDropArea instanceof Morph, 'No expr morph');
        var exprTile = new Tile();
        tile.exprDropArea.addMorph(exprTile);
        this.assertIdentity(exprTile, tile.exprDropArea.tile);
    },
    
    testGetJs: function() {
        var tile = new IfTile();
        var testTile = new DebugTile(null,'test');
        var exprTile = new DebugTile(null,'body');
        tile.testExprDropArea.addMorph(testTile);
        tile.exprDropArea.addMorph(exprTile);
        var expected = 'if (test) {body};';
        this.assertEqual(tile.asJs(), expected);
    }
});

TestCase.subclass('LayoutTests', {
    
    setUp: function() {
        this.baseMorph = new Morph(new Rectangle(0,0,50,200));
    },
    
    assertAbove: function(m1, m2) {
        this.assert(m2.getPosition().y >= m1.getPosition().y + m1.getExtent().y,
                    m1 + '('+ m1.getPosition() + ') not above ' + m2 + '(' + m2.getPosition() + ')');
    },
    
    assertLeft: function(m1, m2) {
        this.assert(m2.getPosition().x >= m1.getPosition().x + m1.getExtent().x,
                    m1 + '('+ m1.getPosition() + ') not left from ' + m2 + '(' + m2.getPosition() + ')');
    },
    
    testVLayoutThreeMorphsAboveEachOther: function() {
        var sut = new VLayout(this.baseMorph);
        this.assertIdentity(sut.baseMorph, this.baseMorph);
        var morph1 = new Morph(new Rectangle(0,0,20,30)),
            morph2 = new Morph(new Rectangle(0,0,30,40)),
            morph3 = new Morph(new Rectangle(0,0,10,90));
        this.baseMorph.addMorph(morph1);
        this.baseMorph.addMorph(morph2);
        this.baseMorph.addMorph(morph3);
        sut.layout();
        this.assertAbove(morph1, morph2);
        this.assertAbove(morph1, morph3);
        this.assertAbove(morph2, morph3);
    },
    
    testHLayoutTwoMorphsHorizontalAndResize: function() {
        var sut = new HLayout(this.baseMorph, true);
        var morph1 = new Morph(new Rectangle(0,0,20,30)),
            morph2 = new Morph(new Rectangle(0,0,30,40));
        this.baseMorph.addMorph(morph1);
        this.baseMorph.addMorph(morph2);
        sut.layout();
        this.assertLeft(morph1, morph2);
        this.assertEqual(sut.baseMorph.getExtent(), pt(50, 40));
    }
})

});