module('apps.paper').requires('cop.Layers').toRun(function() {

BoxMorph.subclass('PaperMorph', {

	isPaperMorph: true,
	style: {fill: Color.white, borderWidth: 3, borderColor: Color.gray, suppressGrabbing: true},
	margin: 5,
	textMargin: 5,
	textStyle: {fill: null, borderWidth: 0.25, fontSize: 16, suppressHandles: true, suppressGrabbing: true},
	haloStyle: {fill: Color.white},

	initialize: function($super, bounds) {
		$super(bounds || new Rectangle(0,0, 400,500));
		this.halos = [];
		this.addHalos();
	},

	contentMorphs: function() {
		var others = this.halos;
		others = others.concat(this.submorphs.select(function(m) { return m.isEpimorph }));
		var morphs = Array.prototype.without.apply(this.submorphs, others);
		return morphs.sort(function(a, b) { return a.bounds().top() - b.bounds().top() });
	},

	initialInsertPos: function() { return pt(this.margin, 30) },

	bottomInsertPos: function() {
		var morphs = this.contentMorphs(); // order by pos y
		if (morphs.length == 0) return this.initialInsertPos();
		var m = morphs.last();
		return m.getPosition().addPt(m.getExtent().withX(0));
	},

	addHalos: function() {
		var bounds = new Rectangle(0,0, 50, 20);

		this.createAndAddHalo('openAsText', 'as text', bounds);
		this.createAndAddHalo('order', 'order', bounds);
		this.createAndAddHalo('addTextMorph', 'text', bounds);

		this.alignHalosHorizontally();
	},

	createAndAddHalo: function(name, label, bounds) {
		// create and add a button that is added to the halo object with the key name
		// also connect halo's fire with a method this[name]
		var halo = new ButtonMorph(bounds);
		halo.applyStyle(this.haloStyle);
		halo.setLabel(label);
		lively.bindings.connect(halo, 'fire', this, name);
		this.addMorph(halo);
		this.halos.push(halo);
		return halo;
	},

	addTextMorph: function(string) {
		var m = new TextMorph(pt(this.getExtent().x - 2*this.margin, 20).extentAsRectangle(), string || '...');
		m.applyStyle(this.textStyle);
		var pos = this.bottomInsertPos();
		m.align(m.getPosition(), pos.addXY(0, this.textMargin));
		this.addMorph(m);
		m.isParagraph = true // FIXME actually defined in LaTeX support
		return m
	},

	openAsText: function() {
		var text = this.contentMorphs().inject('', function(text, m) {
			if (m.textString) return text + m.textString + '\n'
			return text
		});

		this.world().addTextWindow(text);
	},


});


PaperMorph.addMethods({ // Layout logiv

	onDeserialize: function() {
		this.alignHalosHorizontally() // why???
	},

	reshape: function($super, partName, newPoint, lastCall) {
		this.layoutChangedCalled = true// FIXME
		$super(partName, newPoint, lastCall);
		this.alignContentMorphsHorizontally();	
		this.layoutChangedCalled = false
		// this.alignHalosHorizontally();
	},

	layoutChanged: function($super) {
		$super();
		if (this.layoutChangedCalled) return;
		this.layoutChangedCalled = true
		this.order();
		this.layoutChangedCalled = false
	},

	adjustToSubmorphBounds: function() {
			var bounds = this.submorphBounds(true);
			if (!bounds) return;
			bounds = bounds.outsetByRect(this.padding)
			this.setExtent(bounds.extent().addXY(this.margin*2, this.margin))
		},


	alignContentMorphsHorizontally: function() {
		this.contentMorphs().forEach(function(ea) {
			ea.setPosition(pt(this.margin, ea.getPosition().y));
			ea.setExtent(pt(this.getExtent().x - 2*this.margin, ea.getExtent().y));
		}, this)
	},

	alignContentMorphsVertically: function() {
		// contentMorphs list already ordered by y position
		this.contentMorphs().inject(this.initialInsertPos(), function(pos, morph) {
			morph.align(morph.getPosition(), pos);
			return pos.addXY(0, morph.getExtent().y + this.textMargin);
		}, this);
	},

	alignHalosHorizontally: function() {
		this.halos.inject(pt(this.margin, 0), function(pos, halo) {
			halo.align(halo.bounds().topLeft(), pos);
			halo.setExtent(pt(50,20))
			return halo.bounds().topRight();
		});
	},

	order: function() {
		// if (this.layoutChangedCalled) return; // FIXME the page does not load with out that???
		this.alignContentMorphsVertically();
		// this.alignContentMorphsHorizontally();
		this.adjustToSubmorphBounds()	
	},
});

// layers
Object.extend(Morph.prototype, LayerableObjectTrait);
Morph.prototype.lookupLayersIn = ["owner"];

createLayer('PaperMorphLayer');
PaperMorph.prototype.setWithLayers([PaperMorphLayer])

layerClass(PaperMorphLayer, TextMorph, {
	getPaperMorph: function() {
		return this.ownerChain().detect(function(ea) { return ea.isPaperMorph });
	},

	onKeyDown: function($proceed, evt) {
		if (evt.getKeyCode() == Event.KEY_RETURN && evt.isCommandKey()) {
			var textMorph =  this.getPaperMorph().addParagraph();
			textMorph.requestKeyboardFocus(evt.hand);
			evt.stop()
			return true;
		};
		return $proceed(evt);
	}
});

createLayer('TeXLayer');
// PaperMorph.prototype.setWithLayers([PaperMorphLayer, TeXLayer])
enableLayer(TeXLayer)

Object.subclass('LaTeXTextMorphWrapper', {
// generation logic
// when generating LaTeX support inside TextMorph something like this will be the result:
/*layerClass(TeXLayer, TextMorph, {
	morphMenu: function(proceed, evt) { 
		var self = this; var menu = proceed(evt); menu.addLine();
		menu.addItems([
			["be paper title", function() { self.bePaperTitle() }],
			["be paper section", function() { self.bePaperSection() }],
			...
		]);
		return menu;
	},
	resetPaperType: function() { isPaperTitle = false; isPaperSection = false; ... },
	bePaperTitle: function() { this.resetPaperType(); this.isPaperTitle = true; return this; },
	beSomethingElse ...
});*/

	converterNames: function() {
	return Properties.all(LaTeXConverter.prototype).select(function(ea) { return ea.startsWith('$' ) });
},

	textMorphTypes: function() {
		return this.converterNames().collect(function(ea) { return ea.substring(1, ea.length) });
	},

	instVarNames: function() {
		// ['isTitle', 'isAnstract', ...]
		return this.textMorphTypes().collect(function(ea) { return this.instVarNameFor(ea) }, this);
	},


	generateResetMethodFor: function(klass) {
		// this.isPaperTitle = false; ...
		var style = this.defaultStyle();
		var instVarNames = this.instVarNames();
		var method = function() { // inside here this is bound to TextMorph not wrapper
			this.applyStyle(style);
			instVarNames.forEach(function(instVarName) { this[instVarName] = false }, this);
		};
		this.addMethodsToLayerClass(TeXLayer, klass, {resetPaperType: method});
	},

	generateTypeSetterFor: function(klass) {
		// bePaperTitle() etc.
		this.textMorphTypes().forEach(function(type) {
			var methods = {};
			var setterName = this.setterMethodNameFor(type);
			methods[setterName] = this.setterMethodFor(type);
			this.addMethodsToLayerClass(TeXLayer, klass, methods);
		}, this)
	},

	generateMorphMenuFor: function(klass) {
		var types = this.textMorphTypes();
		var wrapper = this;
		var method = function(proceed, evt) {  // inside here this is bound to TextMorph not wrapper
			var menu = proceed(evt); menu.addLine();
			menu.addItems(wrapper.textMorphMenuItemsFor(this));
			return menu;
		};
		this.addMethodsToLayerClass(TeXLayer, klass, {morphMenu: method});
	},

	generateConverterRuleMethod: function(klass) {
		// for a morph that has isTitle = true the method returnd $Title
		var instVarsAndConverNames = this.instVarNames().zip(this.converterNames());

		var wrapper = this;
		var method = function() {  // inside here this is bound to TextMorph not wrapper
			for (var i = 0; i < instVarsAndConverNames.length; i++)
				if (this[instVarsAndConverNames[i][0]])
					return instVarsAndConverNames[i][1]
			return null;
		};
		this.addMethodsToLayerClass(TeXLayer, klass, {laTeXConverterRule: method});
	},

	// helper
	textMorphMenuItemsFor: function(instance) {
		// [["be paper title", function() { self.bePaperTitle() }], ...]
		var wrapper = this;
		return this.textMorphTypes().collect(function(typeName) {
			var itemName = 'be paper ' + typeName.toLowerCase();
			return [itemName, function() { instance[wrapper.setterMethodNameFor(typeName)]() }];
		}, this);
	},

	instVarNameFor: function(typeName) { return 'is' + typeName },
converterNameFor: function(typeName) { return '$' + typeName },

	setterMethodNameFor: function(typeName) { return 'be' + typeName },
defaultStyle: function() {
	return LaTeXConverter.prototype.defaultStyle
},
styleFor: function(typeName) {
		return LaTeXConverter.prototype[this.converterNameFor(typeName)].style
	},

	
	setterMethodFor: function(typeName) {
		var instVarName = this.instVarNameFor(typeName);
		var style = this.styleFor(typeName);
		// inside here this is bound to TextMorph not wrapper
		return function() {
			this.resetPaperType();
			this[instVarName] = true;
			if (style) this.applyStyle(style);
			return this;
		};
	},
	addMethodsToLayerClass: function(layer, klass, methods) {
		layerClass(layer, klass, methods);
		// klass.addMethods(methods)
	},

});

Object.extend(LaTeXTextMorphWrapper, {
	wrapTextMorph: function() {
		// LaTeXTextMorphWrapper.wrapTextMorph()
		var klass =TextMorph;
		var wrapper = new this();
		wrapper.generateResetMethodFor(klass);
		wrapper.generateTypeSetterFor(klass)
		wrapper.generateMorphMenuFor(klass)
		wrapper.generateConverterRuleMethod(klass)
	},
});


Object.subclass('LaTeXConverter');
layerObject(TeXLayer, LaTeXConverter, {
	addMethods: function(proceed, source) {
		// this ensures that everytime the converter is changed the TextMorph gets updated
		// with new generated methods
		var klass = proceed(source);
		LaTeXTextMorphWrapper.wrapTextMorph();
		return klass
	},
});
LaTeXConverter.addMethods({

	$Paragraph: {
		converter: function(textMorph) { return Strings.format('%s\n\n', textMorph.textString) },
		style: {fill: null, borderWidth: 0.25, fontSize: 16, suppressHandles: true, suppressGrabbing: true},
	},

	$Title: {
		converter: function(textMorph) { return Strings.format('\\title{%s}\n\n', textMorph.textString) },
		style: {fill: null, borderWidth: 0, fontSize: 24},
	},

	$SubTitle: {
		converter: function(textMorph) { return Strings.format('\\subtitle{%s}\n\n', textMorph.textString) },
		style: {fill: null, borderWidth: 0, fontSize: 20},
	},

	$Abstract: {
		converter: function(textMorph) { return Strings.format('\\begin{abstract}\n%s\n\\end{abstract}\n\n', textMorph.textString) },
		style: {},
	},

	$Section: {
		converter: function(textMorph) { return Strings.format('\\section{%s}\n', textMorph.textString) },
		style: {borderWidth: 0, fontSize: 20},
	},

	$SubSection: {
		converter: function(textMorph) { return Strings.format('\\subsection{%s}\n', textMorph.textString) },
		style: {borderWidth: 0},
	},

	$SubSubSection: {
		converter: function(textMorph) { return Strings.format('\\subsubsection{%s}\n', textMorph.textString) },
		style: {borderWidth: 0},
	},

	$Listing: {
		converter: function(textMorph) { return Strings.format('\\begin{lstlisting}%s\n\\end{lstlisting}\n\n', textMorph.textString) },
		style: {},
	},

	defaultStyle: {fill: null, borderWidth: 0.25, fontSize: 16, suppressHandles: true, suppressGrabbing: true},

	convertMorph: function(morph) {
		if (!morph.laTeXConverterRule) {
			console.warn('cannot convert morph to LaTeX because morph does not implement laTeXConverterRule');
			return ''
		}

		var rule = morph.laTeXConverterRule()
		if (!rule) {
			console.warn('no LaTeX rule for ' + morph);
			return ''
		}

		return this[rule].converter(morph)
	},
});

layerClass(TeXLayer, PaperMorph, {

	createLaTeXBody: function() {
		var converter = new LaTeXConverter();
		var text = this.contentMorphs().inject('', function(text, m) {
			return text + converter.convertMorph(m)
		});
		return text
	},

	openAsText: function(proceed) {
		var text = this.createLaTeXBody();
		this.world().addTextWindow(text);
	},

});

}); // end of module