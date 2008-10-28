
module('Tests/TileScriptingTests.js').requires('TileScripting.js').toRun(function() {

TestCase.subclass('ScriptEnvironmentTest', {
    // testRunScript: function() {
    //     var sut = new ScriptEnvironment();
    //     var tileHolder = sut.buildView().tileHolder;
    //     var tile = new DebugTile(null, '123;');
    //     tileHolder.submorphs.last().addMorph(tile);
    //     var result = sut.runScript();
    //     this.assertIdentity(123, result);
    // }
});

TestCase.subclass('TileHolderTest', {
    
    testAddNewDropWhenExistingOneWasUsed: function() {
        var holder = new TileHolder(pt(50,50).extentAsRectangle());
        var tile = new Tile();
        
        this.assertEqual(holder.submorphs.length, 1, 'More or less than one submorph');
        this.assert(holder.submorphs[0].isDropArea, 'No DropArea');
        // debugger;
        holder.submorphs[0].addMorph(tile);
        this.assertEqual(holder.submorphs.length, 2, 'No new DropArea added');
        this.assert(holder.submorphs[1].isDropArea, 'No DropArea');
    },
    
    testTilesAsJs: function() {
        var holder = new TileHolder(pt(50,50).extentAsRectangle());
        var tile1 = new DebugTile(null, '123');
        var tile2 = new DebugTile(null, 'console.log(\'hello world\')');
        var expected = '123;\nconsole.log(\'hello world\')';
        holder.submorphs.last().addMorph(tile1);
        holder.submorphs.last().addMorph(tile2);
        var result = holder.tilesAsJs();
        this.assertEqual(expected,result);
    },
    
    testRunScript: function() {
        var sut = new TileHolder(pt(50,50).extentAsRectangle());
        var tile = new DebugTile(null, '123;');
        sut.submorphs.last().addMorph(tile);
        var result = sut.runScript();
        this.assertIdentity(123, result);
    }
});

TestCase.subclass('DropAreaTest', {
    
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
    },
    
    testResizeWhenTileAdded: function() {
        var drop = new DropArea(pt(20,20).extentAsRectangle());
        var tile = new Tile(pt(50,50).extentAsRectangle());
        drop.addMorph(tile);
        this.assertEqual(drop.getExtent(), tile.getExtent(), 'no resizing...');
    },
    
    testCreateTileFromMorph: function() {
        var morph = new Morph(pt(20,20).extentAsRectangle());
        var result = morph.asTile();
        
        this.assertIdentity(morph, result.targetMorph);
        this.assertEqual(morph.id(), result.objectId());
    }
});

TestCase.subclass('ObjectTileTest', {
   
        // var morph = new Morph(new Rectangle(10,10,110,210));
        // morph.closeDnD();
        // morph.handlesMouseDown = Functions.True;
        // morph.onMouseDown = function() { console.log('clicked')};
        // morph.openInWorld();
         
    testAcceptsMorph: function() {
        var tile = new ObjectTile();
        var morph = new Morph(pt(20,20).extentAsRectangle());
        
        tile.createAlias(morph);
        this.assertEqual(tile.objectId(), morph.id(), 'Morph id not added ti tile');
    },
    
    testTileMenuSpecCreation: function() {
        Object.subclass('Dummy', { a: function() {}, b: function() {}, c: 123});
        var obj = new Dummy();
        var sut = new TileMenuCreator(obj);
        
        var classNames = sut.classNames();
        this.assertEqualState(classNames, ['Dummy']);
        
        var methodNames = sut.methodNamesFor('Dummy');
        this.assertEqualState(methodNames, ['a', 'b']);
    },
    
    testTileMenuCreation: function() {
        Object.subclass('Dummy', { a: function() {}, b: function() {}, c: 123});
        var obj = new Dummy();
        var sut = new TileMenuCreator(obj);
        
        var menu = sut.createMenu();
        this.assertEqual(menu.items.length, 1, 'wrong number of menu items');
    },
    
    testAsJsEval: function() {
        var tile = new ObjectTile();
        var morph = new Morph(pt(20,20).extentAsRectangle());
        
        tile.createAlias(morph);
        morph.openInWorld();
        try { var foundMorph = eval(tile.asJs()); }
        finally { morph.remove(); };
        this.assertIdentity(foundMorph, morph);
    },
    
    testAsJsWithFunction: function() {
        var tile = new ObjectTile();
        var morph = new Morph(pt(20,20).extentAsRectangle());
        
        tile.createAlias(morph);
        tile.addFunctionTile('getPosition');
        
        morph.openInWorld();
        try { var js = tile.asJs(); }
        finally { morph.remove(); };
        this.assertEqual(js, 'ObjectTile.findMorph(\'' + morph.id() + '\').getPosition()');
    }
});

TestCase.subclass('FunctionTileTest', {
    
    testHasTextAndDropZone: function() {
        var tile = new FunctionTile(null, 'test');
        this.assertEqual(tile.submorphs.length, 3, 'text or dropzone are missing');
        this.assert(tile.submorphs[1].isDropArea, 'no droparea');
    },
    
    testAsJsWithParameters: function() {
        var tile = new FunctionTile(null, 'test');
        var argTile1 = new DebugTile(null, '123');
        var argTile2 = new DebugTile(null, '456');
        tile.argumentDropAreas.last().addMorph(argTile1);
        tile.argumentDropAreas.last().addMorph(argTile2);
        var js = tile.asJs()
        var expected = '.test(123,456)';
        this.assertEqual(js, expected);
    }
});

TestCase.subclass('IfTileTest', {
    
    testCanAddExprAndTestExpression: function() {
        var tile = new IfTile();
        var testTile = new Tile();
        this.assert(tile.testExprDropArea instanceof Morph, 'No testExpression morph');
        tile.testExprDropArea.addMorph(testTile);        
        this.assertIdentity(testTile, tile.testExprDropArea.tile());
        
        this.assert(tile.exprDropArea instanceof Morph, 'No expr morph');
        var exprTile = new Tile();
        tile.exprDropArea.addMorph(exprTile);
        this.assertIdentity(exprTile, tile.exprDropArea.tile());
    },
    
    testGetJs: function() {
        var tile = new IfTile();
        var testTile = new DebugTile(null,'test');
        var exprTile = new DebugTile(null,'body');
        tile.testExprDropArea.addMorph(testTile);
        tile.exprDropArea.addMorph(exprTile);
        var expected = 'if (test) {body}';
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