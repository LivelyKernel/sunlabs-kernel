
module('lively.Presentation').requires().toRun(function() {

Morph.subclass("lively.Presentation.PageMorph", {
	initialize: function($super, bounds) {
		$super(new lively.scene.Rectangle(bounds));
		this.setFill(Color.white);
		this.setBorderColor(Color.white);
	},
	
	okToBeGrabbedBy: Functions.Null,
	
	morphMenu: function($super, evt) { 
		var menu = $super(evt);
		
		menu.addItem(["fullscreen", function() {
			this.toggleFullScreen();
		}.bind(this)]);
		return menu;
	},
	
	toggleFullScreen: function() {
		
		if (!this.oldPosition) {
			this.oldPosition = this.getPosition();
			var ratio =  WorldMorph.current().getExtent().y / this.getExtent().y;
			if (ratio > 0 && ratio < 100) {
				this.setScale(ratio);
				this.setPosition(pt((WorldMorph.current().getExtent().x - this.bounds().extent().x) / 2, 0));
			}
		} else {
			this.setScale(1);
			this.setPosition(this.oldPosition);
			this.oldPosition = null;	
		}
	}
	
})

});

