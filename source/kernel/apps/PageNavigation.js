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

	getURLWithPageNavigation: function(name) {
		if (!name) return;
		var url = this.base.withFilename(name)
		if (Config.pageNavigationName != 'nothing') {
			var queries = Object.extend(url.getQuery(), {
				pageNavigationName: Config.pageNavigationName,
				date: new Date().getTime()});
			url = url.withQuery(queries);
		};
		return url
	},

	nextPageURL: function () {
		return this.getURLWithPageNavigation(this.nextPageName());
	},

	prevPageURL: function () {
		return this.getURLWithPageNavigation(this.prevPageName());
	},
	
	pageIndex: function() {
		return this.list.indexOf(this.pageName())
	},	
	
	pageNumber: function() { return this.pageIndex() + 1 },
	
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

// PageNavigation.current()
Object.extend(PageNavigation, {
	current: function() {
		return Config.pageNavigations[Config.pageNavigationName]
	}
})

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
	
	xtestPageName: function() {
		this.assertEqual(this.sut.pageName(),  "introduction/template.xhtml")
	},

	xtestPageIndex: function() {
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
	},

	onKeyDown: function(proceed, evt) {
		if (proceed(evt)) return true;
		if (!Config.pageNavigationWithKeys) return false;
		var c = evt.getKeyCode();
		if (c == Event.KEY_LEFT) {
			PageNavigation.current().visitPrevPage();
			return true;
		}
		if (c == Event.KEY_RIGHT) {
			PageNavigation.current().visitNextPage();
			return  true;
		}
		return false;
	},

	displayOnCanvas: function(proceed, canvas) {
		proceed(canvas);
		if (Config.showPageNumber && PageNavigation.current().pageNumber() != 1 /*dont show for first*/)
			this.ensurePageNumberMorph();
		else
			this.removePageNumberMorph();
	},
	
	pageNumberMorphName: function() {
		// FIXME! ContextJS does wrap attributes
		return 'pageNumber';
	},
	
	ensurePageNumberMorph: function() {
		if ($morph(this.pageNumberMorphName())) return;
		var no = PageNavigation.current().pageNumber().toString();
		var morph = new TextMorph(pt(0,0).extent(pt(100,100)), no);
		morph.name = this.pageNumberMorphName();
		morph.applyStyle({fill: null, fontSize: 18, borderWidth: 0});
		morph.ignoreEvents();
		morph.openInWorld();
		morph.align(morph.bounds().bottomLeft(), this.bounds().bottomLeft().addPt(pt(10, -10)))
	},
	
	removePageNumberMorph: function() {
		if (!$morph(this.pageNumberMorphName())) return;
		$morph(this.pageNumberMorphName()).remove();
	},	
});

layerClass(PageNavigationLayer, TextMorph, {

	morphMenu: function(proceed, evt) {
		var menu = proceed(evt);
		var self = this;
		var createFontSizeMenu = function(sizes) {
			return sizes.collect(function(ea) { 
				return [String(ea), function() { self.setFontSize(ea)}.bind(this)]
			})
		};
		var createFontFamilyMenu = function(sizes) {
			return sizes.collect(function(ea) { 
				return [String(ea), function() { self.setFontFamily(ea)}.bind(this)]
			})
		};

		if (menu) {
			menu.addItem(
				["style", [
						["font size", createFontSizeMenu([10,12,14,16,18,20,24,30,40]) ],
						["font family", createFontFamilyMenu(['Courier', 'Helvetica', 'Times']) ]
					],
				])
		}
		return menu
	},

})


// Propagate the current Presentation Name to pages when following links
// an alternative way to get that context information is the possibility
// of the destination website to ask: document.referrer
// to get the URL of the refering website
layerClass(PageNavigationLayer, TextMorph, {
	doLinkThing: function(proceed, evt, link) {
		var url = new URL.ensureAbsoluteURL(link);
		if (Config.pageNavigationName != 'nothing') {
			var queries = Object.extend(url.getQuery(), {pageNavigationName: Config.pageNavigationName});
			url = url.withQuery(queries);
		}
		proceed(evt, url.toString())
	}
})

enableLayer(PageNavigationLayer)


}) // end of module