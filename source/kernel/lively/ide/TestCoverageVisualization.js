module('lively.ide.TestCoverageVisualization').requires('lively.ide.TestCoverage').toRun(function() {

Widget.subclass('TestCoverageVisualization', {
	initialize: function(classNames) {
		this.classNames = classNames
	},

	buildView: function() {
		this.pane = new BoxMorph(new Rectangle(0,0, 400,400));
		this.pane.applyStyle({fill: Color.gray});

		this.pane.layoutManager = new HorizontalLayout();
		return this.pane
	},


	updateClassMorphs: function() {
		if (this.pane == undefined)
			return;

	
		this.pane.submorphs.clone().invoke('remove');

		this.classNames.each(function(ea) {
			this.pane.addMorph(this.makeClassMorph(ea))
		}, this)
	},

	makeClassMorph: function(className) {
		var classObject = eval(className);

        var text = new lively.Text.Text(className + "\n", {style: 'bold', color: Color.black});

		Properties.own(classObject.categories).each(function(eaCategory) {
			text = text.concat(new lively.Text.Text(eaCategory + ":\n", {style: 'italic', color: Color.darkGray}))
			classObject.categories[eaCategory].uniq().each(function(ea) {
				var style = {style: 'normal', color: Color.black};
				var func = classObject.prototype[ea];
				if (! func.getOriginal) return;
				var originalFunction = classObject.prototype[ea].getOriginal();
				
				var coveredMethods = TestCoverage.getCoveredMethods(originalFunction);
				if (coveredMethods.length > 0)
					style.color = Color.blue;
				else 
					style.color = Color.orange;

				text = text.concat(new lively.Text.Text(" " +ea + "()\n", style))  
			})
		})


		var classMorph = new TextMorph(new Rectangle(0,0,200,100), text)				
		classMorph.targetName = className;	

		return classMorph
	}

})

}) // end of module