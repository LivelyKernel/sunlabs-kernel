
TestCase.subclass('SharedNodeModelTest', {
    
    setUp: function() {
        this.widget = new Widget();
        this.model = Record.newNodeInstance({MyMorph: null, MyWidget: null});
        this.morph = new Morph();
        this.world = WorldMorph.current();

        this.world.addMorph(this.morph)
        this.morph.linkWrapee();

        this.morph.addNonMorph(this.widget.rawNode);
        this.widget.linkWrapee();

    },
    
    testStoringMorphReferences: function(number){        
        this.model.setMyMorph(this.morph);
        var found = Wrapper.prototype.getWrapperByUri(this.model.getMyMorph());
        this.assertIdentity(found, this.morph, "failed to store morph")
    }, 

    testStoringWidgetReferences: function(number){        
        this.model.setMyWidget(this.widget);
        var found = Wrapper.prototype.getWrapperByUri(this.model.getMyWidget());
        this.assertIdentity(found, this.widget, "failed to store widget")
    }, 
    
    // m = new Morph(); WorldMorph.current().addMorph(m); m.linkWrapee(); n = Global.document.getElementById(m.id()); n.wrapper
    testGetWrapperByUri: function(number){        
        var uri = this.morph.uri();
        this.assert(uri,"no uri");
        this.assert(this.morph.rawNode,"no raw node");
        this.assertIdentity(Wrapper.prototype.getWrapperByUri(uri), this.morph);
    },
    
    tearDown: function() {
        this.morph.remove();
    }
    
});


TestCase.subclass('DomRecordTest', {

    testAddField: function() {
        this.model = Record.newNodeInstance({StaticField: null});
        this.assertEqualState(this.model.definition, {StaticField: {}});
        this.model.addField("DynamicField");
        this.assertEqualState(this.model.definition, {StaticField: {}, DynamicField: {} });
    }

});



