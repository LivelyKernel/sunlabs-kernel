module('apps.PageNavigation').requires('cop.Layers').toRun(function() {

Object.extend(Config, {
	showWikiNavigator: false,
	resizeScreenToWorldBounds: false,
});

cop.create("PageNavigationLayer")
	.beGlobal()
	.refineClass(WorldMorph, {
		complexMorphsSubMenuItems: function(evt) {
			var menu = cop.proceed(evt);
			menu.push(["Page Navigation", function(evt) { 
				var morph = new PageNavigationMorph(evt.point());
				morph.openInWorld()
			}])
			return menu
		},

		onKeyDown: function(evt) {
			if (cop.proceed(evt)) return true;
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

		displayOnCanvas: function(canvas) {
			cop.proceed(canvas);
			if (Config.showPageNumber &&
				PageNavigation.current() &&
				PageNavigation.current().pageNumber() != 1 /*dont show for first*/)
					this.ensurePageNumberMorph();
			else
				this.removePageNumberMorph();
		},

		pageNumberMorphName: function() {
			// FIXME! ContextJS does wrap attributes
			return 'pageNumber'
		},

		
		pageNumberMorph: function() {
			return $morph(this.pageNumberMorphName());
		},
		
		ensurePageNumberMorph: function() {
			var no = PageNavigation.current().pageNumber();
			if (no === 0) return;
			if (this.pageNumberMorph()) {
				this.pageNumberMorph().setTextString(no.toString());
				return;
			};
			var morph = new TextMorph(pt(0,0).extent(pt(100,100)), no);
			morph.name = this.pageNumberMorphName();
			morph.applyStyle({fill: null, fontSize: 18, borderWidth: 0, strokeOpacity: 0});
			morph.ignoreEvents();
			morph.openInWorld();
			morph.align(morph.bounds().bottomLeft(), this.bounds().bottomLeft().addPt(pt(10, -10)))
		},
		
		removePageNumberMorph: function() {
			if (this.pageNumberMorph())
				this.pageNumberMorph().remove();
		},

		applyCustomStyles: function() {
			PageNavigation.current().styleAll();
		},

		morphMenu: function(evt) {
			var menu = cop.proceed(evt);
			if (!menu) return menu;
			if (this.pageNumberMorph())
				menu.addItem(['remove slide number',   this, 'removePageNumberMorph' ]);
			else
				menu.addItem(['add slide number',   this, 'ensurePageNumberMorph' ]);
			menu.addItem(["apply custom styles",   this, 'applyCustomStyles' ]);
			return menu
		},
		
	})
	.refineClass(TextMorph, {
		morphMenu: function(evt) {
			var menu = cop.proceed(evt);
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

		doLinkThing: function(evt, link) {
			// Propagate the current Presentation Name to pages when following links
			// an alternative way to get that context information is the possibility
			// of the destination website to ask: document.referrer
			// to get the URL of the refering website
			var url = new URL.ensureAbsoluteURL(link);
			if (Config.pageNavigationName != 'nothing') {
				var queries = Object.extend(url.getQuery(), {pageNavigationName: Config.pageNavigationName});
				url = url.withQuery(queries);
			}
			cop.proceed(evt, url.toString())
		},

	});


cop.create('ResizeWorldLayer')
	.beGlobal()
	.refineClass(WorldMorph, {
		displayOnCanvas: function(canvas) {
			cop.proceed(canvas);
			basicResize(this, this.canvas(), 1020, 760)
		}
	});




Object.subclass("PageNavigation", {

	url: null,
	slideNames: null,

	initialize: function(baseURL, slideNames) {
		this.baseURL = this.url || baseURL;
		this.slides = this.slideNames || slideNames;
	},

	nextPageName: function(){
		return  this.slides[(this.pageIndex() + 1) % this.slides.length]
	},

	prevPageName: function(){
		var i = (this.pageIndex() - 1) % this.slides.length;
		if (i < 0) i += this.slides.length
		return  this.slides[i]
	},

	getURLWithPageNavigation: function(name) {
		if (!name) return;
		var url = this.baseURL.withFilename(name)
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
		return this.slides.indexOf(this.pageName())
	},	
	
	pageNumber: function() { return this.pageIndex() + 1 },
	
	pageName: function () {
			return URL.source.relativePathFrom(new URL(this.baseURL));
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
	
	ensureNavigationMorph: function() {
		"PageNavigation.current().ensureNaviationMorph()"

		var oldMorph = this.findPageNavigationMorph();
		if (oldMorph) oldMorph.remove();
		var morph = new PageNavigationMorph();
		morph.align(morph.bounds().bottomRight(), this.world().bounds().bottomRight());
		morph.name = 'PageNavigation';
		this.world().addMorph(morph);
	},
findPageNavigationMorph: function() {
	return this.world().submorphs.detect(function(ea) {
		return ea instanceof PageNavigationMorph;
	});
},

	
	world: function() {
		return WorldMorph.current()
	},

	styleAll: function() {
		// can be overridden to apply a "master layout" for slide
	},
	
	styleWorldMorph: function() {
		// shrink the world to demo size
		basicResize(this.world(), this.world().canvas(), 1024, 768);
		this.world().setBorderColor(Color.black);
		this.world().setBorderWidth(0.25)
	},

	customPageStyle: {
		itemLevel1: { fontSize: 30},
		itemLevel2: { fontSize: 20},
	},

});

// PageNavigation.current()
Object.extend(PageNavigation, {
	pageNavigations: {},

	current: function() {
		if (this._current) return this._current;
		if (!Config.pageNavigationName || Config.pageNavigationName == 'nothing') {
			console.warn('Cannot find page navigation instance!');
			return new PageNavigation(URL.source.getDirectory(), []);
		}

		var klass = Global[Config.pageNavigationName];
		if (klass && Class.isClass(klass)) {
			this._current = new klass();
			return this._current
		}

		if (!this.pageNavigations || !Config.pageNavigations) return null;

		// FIXME why store pageNavigations in Config?! pollution!
		return this.pageNavigations[Config.pageNavigationName] ||
			Config.pageNavigations[Config.pageNavigationName];
	},

	loadSlideNamesFromJSON: function(filename) {
		var res = new WebResource(URL.codeBase.withFilename(filename));
		var content = res.getContent();
		return JSON.parse(content);
	},
	
});


PageNavigation.subclass('HPIPresentationTemplate', {

	styleAll: function($super) {
		$super();

		CustomColor = {
			orange: Color.rgb(223,70,0),
			tangerine: Color.rgb(248, 149,24),
			blue:  Color.rgb(0,90,143),
			black: Color.rgb(40,40,40),
			tungsten: Color.rgb(51,51,51),
		}

		var m;

		m = $morph("topTitle");
		if (m) {
			m.ignoreEvents()
			m.setPosition(pt(-2,-2))
			m.setFontSize(16)
		}

		m = $morph("titleText");
		if (m) {
			m.setTextColor(CustomColor.blue)
			m.setPosition(pt(50.0,30.0));
		}

		m = $morph("subtitleText")
		if (m) {
			m.setTextColor(CustomColor.tangerine);
		}

		m = $morph("logoImage");
		if (m) {
			m.setPosition(pt(950.0,15.0));
			m.setExtent(pt(60,60));
			m.suppressHandles = true;
			m.suppressGrabbing = true;
		}

		m = $morph("contentText");
		if (m) {
			m.setTextColor(CustomColor.tungsten)
			m.setPosition(pt(60,130))
		}

		if (DisplayThemes['hpi'])
			WorldMorph.current().setDisplayTheme(DisplayThemes['hpi'])

		this.styleWorldMorph();
		this.ensureNavigationMorph();

		return true;
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


}); // end of module