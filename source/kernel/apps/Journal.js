module('apps.Journal').requires('cop.Layers', 'apps.DateFormat').toRun(function() {

cop.createLayer('JournalEntryLayer')

layerClass(JournalEntryLayer, TextMorph, {
	splitInOwer: function(proceed, evt) {
		if(!this.owner)
			return;
		var pos = this.getCursorPos();
		
		var morph2 = this.duplicate();
		morph2.setSelectionRange(0, pos);
		morph2.replaceSelectionWith("")
		this.owner.addMorph(morph2);
		morph2.setSelectionRange(0, 0);

		this.setSelectionRange(pos, this.textString.size());
		this.replaceSelectionWith("")
	
		this.owner.relayout();
		this.owner.adjustToSumorphBounds();
		morph2.requestKeyboardFocus(evt.hand)		
		
		// at a position....
	},

	onKeyDown: function(proceed, evt) {
		// console.log("on key press" + evt)
		if (evt.isCtrlDown() && (evt.getKeyCode() == 13)) {
				this.splitInOwer(evt);
				console.log("ctrl on key down" + evt)
			return
		}
		return proceed(evt);
	}
		
})

Widget.subclass('JournalWidget', {
	
	initialize: function($super) {
		$super();
		
	},

	buildView: function(bounds) {
		this.panel = new BoxMorph(new Rectangle(0,0,300,300));
		this.panel.setFill(null);
		this.panel.ownerWidget = this;
		this.panel.suppressGrabbing = true;

		this.buttons = new BoxMorph(new Rectangle(0,0,100,20));
		this.buttons.layoutManager = new HorizontalLayout();
		this.buttons.setFill(null)

		this.newEntryButton = new ButtonMorph(new Rectangle(0,0,70,25)).setLabel("new entry");
		this.newEntryButton.margin = new Rectangle(5,5,5,5);
		connect(this.newEntryButton, 'fire', this, 'makeNewEntry');
		this.buttons.addMorph(this.newEntryButton);

		this.sortButton = new ButtonMorph(new Rectangle(0,0,70,25)).setLabel("sort");
		this.sortButton.margin = new Rectangle(5,5,5,5);
		connect(this.sortButton, 'fire', this, 'sortEntries');
		this.buttons.addMorph(this.sortButton);

		this.reverseButton = new ButtonMorph(new Rectangle(0,0,70,25)).setLabel("reverse");
		this.reverseButton.margin = new Rectangle(5,5,5,5);
		connect(this.reverseButton, 'fire', this, 'reverseEntries');	
		this.buttons.addMorph(this.reverseButton);

		this.panel.addMorph(this.buttons);

		this.container = new JournalEntryContainer(new Rectangle(50,100,600,500));

		this.panel.addMorph(this.container);
		this.container.setPosition(pt(0,30))

		
		return this.panel
	},

	makeNewEntry: function() {
		console.log("make new entry")
		var entry = new JournalEntryMorph();
		this.container.addMorph(entry)
		this.container.reverseSortEntries()
	},

	sortEntries: function() {
		console.log("sort")
		this.container.sortEntries()
	},

	reverseEntries: function() {
		console.log("reverse")
		this.container.reverseSortEntries()
	},

	

})

BoxMorph.subclass('JournalEntryContainer', {
	style: {fill: null},
	padding: new Rectangle(5,5,5,5),
	layoutManager: new VerticalLayout(),
	suppressGrabbing: true,

	intialize: function(bounds) {
		$super(bounds);
		this.setupStyle();
	},

	setupStyle: function() {
		this.layoutManager = new VerticalLayout();
		this.applyStyle(this.style);
	},	

	sortEntries: function($super) {
		var sortedEntries = this.submorphs.clone();
		sortedEntries.sort(function(a,b) {return a.compare(b)});
		this.orderMorphs(sortedEntries)
	},

	reverseSortEntries: function($super) {
		var sortedEntries = this.submorphs.clone();
		sortedEntries.sort(function(a,b) {return a.compare(b)});
		sortedEntries.reverse();
		this.orderMorphs(sortedEntries);
	},

	relayout: function($super) {
		$super();


	},

	adjustToSumorphBounds: function() {
		var bounds = this.submorphBounds(true);
		if (!bounds)
			return;
		bounds = bounds.outsetByRect(this.padding)
		this.setExtent(bounds.extent())

	},

	orderMorphs: function(morphs) {
		morphs.each(function(ea) {ea.remove()});
		morphs.each(function(ea) { this.addMorph(ea)}, this);
		this.relayout(); // addMorph does somehow not take padding into account...
	},

})


Morph.subclass('JournalEntryMorph', {

	layoutManager: new VerticalLayout(),

	padding: new Rectangle(10,10,10,10),
	margin: new Rectangle(5,5,5,5),

	initialize: function($super, bounds) {
		bounds = bounds || new Rectangle(0,0, 900, 150);
		$super(new lively.scene.Rectangle(bounds));
		this.ensureDateText();
		this.setupStyle();
		this.setupConnections();
		this.setWithLayers([JournalEntryLayer])
	},

	setupStyle: function() {
		this.applyStyle({
			borderWidth: 3, 
			borderColor: Color.rgb(200,200,220),
			fill: Color.rgb(245,245,250),
			fillOpacity: 1, 
			borderRadius: 10}),

		this.submorphs.each(function(ea) {
			ea.suppressGrabbing = true;
			
			// fix border width issue
			if (ea.getBorderWidth() == 0) 
				ea.setBorderWidth(0)
		})
	},
	
	visibleSubmorphs: function($super) {
		return $super().reject(function(ea){ return ea instanceof HandleMorph})
	},

	addMorph: function($super, m) {
			console.log("add morph");
			var result = $super(m);

			if (m instanceof HandleMorph) {
				// console.log("normal add...")
			} else {
				connect(m, 'fullBounds', this, 'updateLayoutFor', {
					converter: function() {return this.sourceObj }}).update();
				// this.updateLayoutFor(m);
			} 
			return result
		},

	removeMorph: function($super, m) {
		console.log("add morph");
		var result = $super(m);
		this.relayout();
		this.adjustToSumorphBounds();
		return result
	},

	updateLayoutFor: function(m) {
		// console.log("update for " + m)

		var newExtent = m.getExtent();
		if (!m.previousExtent || !m.previousExtent.eqPt(newExtent))	{
			// console.log("relaout because of " + m )
			this.relayout();
			this.adjustToSumorphBounds();
		}		

		m.previousExtent = newExtent;
	},

	setupConnections: function() {
		// connect(this.dateText, 'fullBounds', this, 'adjustToSumorphBounds')
	},
	
	ensureDateText: function() {
		if (!this.dateText) {
			var morph = this.findDateText();
			if (morph)  {
				this.dateText = morph;
			} else {
				this.dateText = morph
				this.dateText = new TextMorph(new Rectangle(20,20,700,300));
				this.dateText.applyStyle({fillOpacity: 0, borderWidth: 0, fontSize: 18});
				this.dateText.setTextString(new Date().format("yyyy-mm-dd, ddd"));
				this.addMorph(this.dateText)
			}
		}
		return this.dateText
	},

	compare: function(otherEntry) {
			if (!otherEntry.ensureDateText)
				return 0;
			var s1 = this.ensureDateText().textString;
			var s2 = otherEntry.ensureDateText().textString;
			if( s1 == s2)
				return 0 ;
			else if (s1 < s2)
				return -1;
			else
				return +1;
	},

	findDateText: function() {
		return this.submorphs.detect(function(ea) {
			return /20[0-9][0-9]-[0-9][0-9]-[0-9][0-9].*/.match(ea.textString)
		})
	},

	okToBeGrabbedBy: function(evt) {
        return null; 
    },

	adjustToSumorphBounds: function() {
		var bounds = this.submorphBounds(true);
		if (!bounds)
			return;
		bounds = bounds.outsetByRect(this.padding)
		var oldExtent = this.getExtent();
		var newExtent = 	bounds.extent();

		if (!oldExtent.eqPt(newExtent)) {
			this.setExtent(newExtent)
			// console.log("adjust " + this)
			if (this.owner) {
				this.owner.relayout();
			}
		}
	},


});

}) // end of module