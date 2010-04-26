module('apps.PageNavigation').requires('cop.Layers', 'lively.TestFramework').toRun(function() {

Object.subclass("PageNavigation", {
	initialize: function(base, list) {
		this.base = base;
		this.list = list;
	},

	nextPageName: function(){
		return  this.list[(this.pageIndex() + 1) % this.list.length]
	},

	prevPageName: function(){
		return  this.list[(this.pageIndex() - 1) % this.list.length]
	},

	nextPageURL: function () {
			var name = this.nextPageName();
			if (name)
				return this.base.withFilename(name).withQuery({pageNavigationName: Config.pageNavigationName})
	},


	prevPageURL: function () {
			var name = this.prevPageName();
			if (name)
				return this.base.withFilename(name).withQuery({pageNavigationName: Config.pageNavigationName});
	},

	pageIndex: function() {
		return this.list.indexOf(this.pageName())
	},	

	pageName: function () {
			return new URL(document.location).relativePathFrom(new URL(this.base));
	},

	visitNextPage:  function() {
		var url = this.nextPageURL();
		if (url)
			Global.window.location.assign(url)
	},

	visitPrevPage:  function() {
		var url = this.prevPageURL();
		if (url)
			Global.window.location.assign(url);
	},
});

BoxMorph.subclass("PageNavigationMorph", {

	styleClass: ['PageNavigator'],

	padding: new Rectangle(10,10,10,10),

	connections: ['accepted', 'canceled', 'title'], // for documentation only

	initialize: function($super, loc) {
		loc = loc || pt(100,100)
		$super(loc.extent(pt(160,40)));
		this.setFill(Color.white)

		this.layoutManager = new HorizontalLayout();

		this.prevButton = new ButtonMorph(new Rectangle(0,0,70,20));
		this.prevButton.setLabel("prev");
		this.prevButton.setFill(Color.white);
		connect(this.prevButton, "fire", this, 'noFocus');
		connect(this.prevButton, "fire", this, 'visitPrev');
		this.addMorph(this.prevButton);
		
		this.nextButton = new ButtonMorph(new Rectangle(0,0,70,20));
		this.nextButton.setLabel("next");
		this.nextButton.setFill(Color.white);

		connect(this.nextButton, "fire", this, 'noFocus');
		connect(this.nextButton, "fire", this, 'visitNext');
		this.addMorph(this.nextButton);
	},

	noFocus: function() {
		this.world().firstHand().setMouseFocus(null);
		this.world().firstHand().setKeyboardFocus(null);
	
		this.nextButton.changeAppearanceFor(this.nextButton.getValue());
		this.prevButton.changeAppearanceFor(this.prevButton.getValue());
	},

	visitNext: function() {
		PageNavigation.current().visitNextPage()
	},
	
	visitPrev: function() {
		PageNavigation.current().visitPrevPage()
	},


});

TestCase.subclass("PageNavigationTest", {
	setUp: function() {
		this.sut = new PageNavigation(
			new URL(Config.codeBase).withRelativePartsResolved().withFilename('ProjectSeminar2010/'),
			[
				"introduction/title.xhtml",
				"introduction/contents.xhtml",
				"introduction/template.xhtml",
			]);
	},
	
	testPageName: function() {
		this.assertEqual(this.sut.pageName(),  "introduction/template.xhtml")
	},

	testPageIndex: function() {
		this.assertEqual(this.sut.pageIndex(), 2)
	}
})

createLayer("PageNavigationLayer")
layerClass(PageNavigationLayer, WorldMorph, {

	complexMorphsSubMenuItems: function(proceed, evt) {
		var menu = proceed(evt);
		menu.push(["Page Navigation", function(evt) { 
			var morph = new PageNavigationMorph(evt.point());
			morph.openInWorld()
		}])
		return menu
	}
});
enableLayer(PageNavigationLayer)


}) // end of module