module('apps.paper').requires('cop.Layers', 'lively.SyntaxHighlighting', 'lively.LayerableMorphs', 'lively.SpellChecker').toRun(function() {

BoxMorph.subclass('ParagraphContainerMorph', 
'intialize', {

	isPaperMorph: true,
	style: {fill: Color.white, borderWidth: 3, borderColor: Color.gray, suppressGrabbing: true},
	margin: 5,
	textMargin: 5,
	textStyle: {fill: null, borderWidth: 0.25, fontSize: 16, suppressHandles: true, suppressGrabbing: true},

}, 'default' ,{

	contentMorphs: function() {
		var others = this.halos;
		others = others.concat(this.submorphs.select(function(m) { return m.isEpimorph }));
		var morphs = Array.prototype.without.apply(this.submorphs, others);
		return morphs.sort(function(a, b) { return a.bounds().top() - b.bounds().top() });
	},

},'helper',{
	initialInsertPos: function() { return pt(this.margin, 30) },

	bottomInsertPos: function() {
		var morphs = this.contentMorphs(); // order by pos y
		if (morphs.length == 0) return this.initialInsertPos();
		var m = morphs.last();
		return m.getPosition().addPt(m.getExtent().withX(0));
	},

},'text conversion',{
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
		this.world().addTextWindow(this.asText());
	},

	asText: function() {
		return this.contentMorphs().inject('', function(text, m) {
			if (m.textString) return text + m.textString + '\n'
			return text
		});
	},
},'persistance',{
	
},'undo',{
	getUndoHistory: function() {
		if (!this.undoHistory)
			this.undoHistory = new UndoHistory();
		return this.undoHistory
	},
},'word counting',{
	countWords: function() {
		var words = 0;
		this.withAllSubmorphsDo(function() {
			if (this.textString)
				words += this.textString.split(/\s+/).length
		})
		return words
	},

	countWordsInTextMorph: function(morph) {
		var words = this.countWords();
		morph.setTextString(	 new Date() + ': \t' +  words + '\n' + morph.textString)
	},

},'layout',{
	reshape: function($super, partName, newPoint, lastCall) {
		this.layoutChangedCalled = true// FIXME
		$super(partName, newPoint, lastCall);
		this.alignContentMorphsHorizontally();	
		this.layoutChangedCalled = false
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


	order: function() {
		// if (this.layoutChangedCalled) return; // FIXME the page does not load with out that???
		this.alignContentMorphsVertically();
		// this.alignContentMorphsHorizontally();
		this.adjustToSubmorphBounds()	
	},
});
ParagraphContainerMorph.subclass('PaperMorph',
// new PaperMorph().openInWorld()
'intialize', {
	isPaperMorph: true,
	haloStyle: {fill: Color.white},
	initialize: function($super, bounds) {
		$super(bounds || new Rectangle(0,0, 400,500));
		this.halos = [];
		this.addHalos();
	},
	onDeserialize: function() {
		this.alignHalosHorizontally() // why???
	},
},
'menu', {
	morphMenu: function($super, evt) {
		var menu = $super(evt);
		var self = this;
		menu.addItem([(this.generateHTML ? "[X]" : "[]") + " generateHTML", 
			function(){self.generateHTML = ! self.generateHTML}]);
		return menu;
	},

},
'file', {
	setFileLocation: function() {
		this.world().prompt('Where should the contents of this paper morph be stored?', function(input) {
			this.fileLocation = input;
		}.bind(this), this.fileLocation || URL.source.withFilename('text.txt').toString())
	},

	save: function() {
		var w = this.world()
		if (!this.fileLocation) {
			w.alert('please set file location of paper morph first');
			return
		}
		try {
			var url = new URL(this.fileLocation);
		} catch(e) {
			w.alert('file location of paper morph not valid');
			return
		}
		var writer = new WebResource(url);
		lively.bindings.connect(writer, 'status', w, 'setStatusMessage', {
			updater: function($upd, status) {
				if (status.isSuccess())
					$upd('successfully saved', Color.green, 3)
				else
					$upd('couldnt save, status code: ' + status.code(), Color.red, 5)
			}});
		writer.beAsync().put(this.asText());
	},

},
'buttons', {	
		addHalos: function() {
		var bounds = new Rectangle(0,0, 50, 20);

		this.createAndAddHalo('order', 'order', bounds);
		this.createAndAddHalo('addTextMorph', 'add', bounds);
		this.createAndAddHalo('openAsText', 'as text', bounds);
		this.createAndAddHalo('setFileLocation', 'set file...', bounds);
		this.createAndAddHalo('save', 'save', bounds);

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

	alignHalosHorizontally: function() {
		this.halos.inject(pt(this.margin, 0), function(pos, halo) {
			halo.align(halo.bounds().topLeft(), pos);
			halo.setExtent(pt(50,20))
			return halo.bounds().topRight();
		});
	},

}
);

// layers

cop.create('PaperMorphLayer')
.refineClass(TextMorph, {
	getPaperMorph: function() {
		return this.ownerChain().detect(function(ea) { return ea.isPaperMorph });
	},

	getUndoHistory: function() {
		// override method in UndoLayer
		// Since it is globally activated this structurally activated layer should trumph it
		// This is actually the first time, that the order of the layer composition is important.
		// This may be because until now I only used layers to refine behavior defined in the base layer 
		// but not in other layers.
		return this.getPaperMorph().getUndoHistory()
	},


	splitInOwer: function(evt) {
		if(!this.owner)
			return;
		var pos = this.getCursorPos();
		
		var morph2 = this.duplicate();
		morph2.setSelectionRange(0, pos);
		morph2.replaceSelectionWith("")
		// hackhackhack
		if (morph2.textString.length == 0)
			morph2.setTextString(" ");

		this.owner.addMorph(morph2);
		morph2.moveBy(pt(0,5)); // move it a bit down, because the paper morph sorts the morphs according to their position
		morph2.setSelectionRange(0, 0);

		this.setSelectionRange(pos, this.textString.size());
		this.replaceSelectionWith("")

		// hackhackhack
		if (this.textString.length == 0)
			this.setTextString(" ");

		morph2.requestKeyboardFocus(evt.hand)		
		
		// at a position....
	},

	joinInOwner: function(evt) {
			var morphs = this.getPaperMorph().contentMorphs()
			var pos = morphs.indexOf(this)
			if (pos > 0) {
				var prev = morphs[pos - 1]
				oldPos = prev.textString.length;
				prev.setTextString(prev.textString + this.textString);
				this.remove();
				prev.setSelectionRange(oldPos, oldPos);
				prev.requestKeyboardFocus(evt.hand)		
			}
	},

	// override the cmd + enter behavior
	onKeyDown: function(evt) {
		// console.log("on key press" + evt)
		if ((evt.getKeyCode() == 8) && (this.selectionRange[0] == 0) && (this.selectionRange[1] == -1)) {
				this.joinInOwner(evt)
		};

		if (evt.isCtrlDown() && (evt.getKeyCode() == 13)) {
				this.splitInOwer(evt);
				// console.log("ctrl on key down" + evt)
			return
		}
		return cop.proceed(evt);
	},

	doSave: function() {
		this.getPaperMorph().save()

		var m = $morph('WordCounter')
		if(m) 
			this.getPaperMorph().countWordsInTextMorph(m);

		this.world().saveWorld();
	},

	getHTMLString: function() {
		var converter = new apps.paper.HTMLCharcterConverter()
		return this.getTextAnnotations().collect(function(ea) {
			var string  = converter.convert(ea[0]);
			var annotation  = ea[1];
			if (!annotation) {
				return string
			};

			if (annotation.link) {
					return "<a href=\"" + annotation.link +"\">" + string + "</a>"
			};

			if (annotation.style) {
				if (annotation.style == 'bold') {
					return "<span class=\"strong\">" + string + "</span>"
				};
				if (annotation.style == 'italic') {
					return "<span class=\"emph\">" + string + "</span>"
				}; 
			}
			// there is an annotation but I don't know what to do with it
			return string
		}).join('');
	},

	getTextAnnotations: function() {
		var index = 0;
		if (!this.textStyle)
			return [[this.textString]]
		return this.textStyle.runs.collect(function(eaRun, i) {
			var to = index + eaRun;
			var r = this.textString.slice(index, to)
			index = to
			return [r, this.textStyle.values[i]]
		}, this)
	},






});
PaperMorph.addMethods(
'contextJS', {
	withLayers: [PaperMorphLayer, SpellCheckerLayer]
});
cop.create('PaperMorphMenuLayer')
.beGlobal()
.refineClass(WorldMorph, {
	toolSubMenuItems: function(evt) {
		var menuItems = cop.proceed(evt);
		menuItems.push(["PaperMorph", function(evt) {
			var m = new PaperMorph();		
			m.openInWorld(evt.mousePoint, "paperMorph")
		}]);
		return menuItems;
	}
});

// PaperMorph.prototype.setWithLayers([PaperMorphLayer, TeXLayer])

Object.subclass('LaTeXTextMorphWrapper', {
// generation logic
// when generating LaTeX support inside TextMorph something like this will be the result:
/*layerClass(TeXLayer, TextMorph, {
	morphMenu: function(evt) { 
		var self = this; var menu = cop.proceed(evt); menu.addLine();
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
		var method = function(evt) {  // inside here this is bound to TextMorph not wrapper
			var menu = cop.proceed(evt); menu.addLine();
			menu.addItems(wrapper.textMorphMenuItemsFor(this));
			return menu;
		};
		this.addMethodsToLayerClass(PaperMorphLayer, klass, {morphMenu: method});
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
		layer.refineClass(klass, methods);
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
cop.create('TeXLayer')
.beGlobal()
.refineObject(LaTeXConverter, {
	addMethods: function(source) {
		// this ensures that everytime the converter is changed the TextMorph gets updated
		// with new generated methods
		var klass = cop.proceed(source);
		LaTeXTextMorphWrapper.wrapTextMorph();
		return klass
	},
})
.refineClass(PaperMorph, {

	createLaTeXBody: function() {
		return  this.convertMorphs( new LaTeXConverter(), this.contentMorphs())
	},
	createHTMLBody: function() {
		var converter = new LaTeXConverter();
		converter.generateHTML = true;
		return '<html><head>\n' +
'<style>\n' +
'body {font-family: Helvetica}\n' +
'div.title { font-size: 30}\n' +
'div.subtitle { font-size: 20}\n' +
'div.abstract { font-style: italic}\n' +
'ul { list-style-position: inside;}\n' +
'li.level1 { padding-left: 0pt;  font-size: 16}\n' +
'li.level2 { padding-left: 30pt;  font-size: 14}\n' +
'span.strong { font-weight: bold}\n' +
'span.emph { font-style: italic}\n' +
'\n</style>\n</head>\n'+
'<body>\n' + this.convertMorphs(converter, this.contentMorphs()) + '\n</body></html>'
	},	

	convertMorphs: function(converter, morphs) {
		var text = morphs.inject('', function(text, m) {
			return text + converter.convertMorph(m)
		});
		return text
	},

	asText: function() {
		if (this.generateHTML) {
			return this.createHTMLBody();
		} else {
			return this.createLaTeXBody();
		}
	},

});

LaTeXConverter.addMethods({
	$Paragraph: {
		html: function(textMorph) { return Strings.format('<p>%s</p>\n', textMorph.getHTMLString()) },
		converter: function(textMorph) { return Strings.format('%s\n\n', textMorph.textString) },
		style: {fill: null, borderWidth: 0.25, fontSize: 16, suppressHandles: true, suppressGrabbing: true},
	},

	$Title: {
		html: function(textMorph) { return Strings.format('<div class="title">%s</div>\n',
			textMorph.getHTMLString()) },
		converter: function(textMorph) { return Strings.format('\\title{%s}\n\n', textMorph.textString) },
		style: {fill: null, borderWidth: 0, fontSize: 24},
	},

	$SubTitle: {
		html: function(textMorph) { return Strings.format('<div class="subtitle">%s</div>\n', 
			textMorph.getHTMLString()) },
		converter: function(textMorph) { return Strings.format('\\subtitle{%s}\n\n', textMorph.textString) },
		style: {fill: null, borderWidth: 0, fontSize: 20},
	},

	$Abstract: {
		html: function(textMorph) { return Strings.format('<div class="abstract">\n%s\n</div>\n',
			 textMorph.getHTMLString()) },
		converter: function(textMorph) { return Strings.format('\\begin{abstract}\n%s\n\\end{abstract}\n\n', textMorph.textString) },
		style: {borderWidth: 0, textColor: Color.web.darkred},
	},

	$Section: {
		html: function(textMorph) { return Strings.format('<h1>%s</h1>\n', textMorph.getHTMLString()) },
		converter: function(textMorph) { return Strings.format('\\section{%s}\n', textMorph.textString) },
		style: {borderWidth: 0, fontSize: 20, textColor: Color.blue},
	},

	$SubSection: {
		html: function(textMorph) { return Strings.format('<h2>%s</h2>\n', textMorph.getHTMLString()) },
		converter: function(textMorph) { return Strings.format('\\subsection{%s}\n', textMorph.textString) },
		style: {borderWidth: 0, textColor: Color.blue},
	},
	
	$SubSubSection: {
		html: function(textMorph) { return Strings.format('<h3>%s</h3>\n', textMorph.getHTMLString()) },
		converter: function(textMorph) { return Strings.format('\\subsubsection{%s}\n', textMorph.textString) },
		style: {borderWidth: 0, textColor: Color.blue},
	},

	$Listing: {
		html: function(textMorph) { return Strings.format('<ul>%s</ul>\n', 
			textMorph.getHTMLString()
				.replace(/(\n|^)- /g,"\n<li class='level1'>")
				.replace(/\n\t- /g,"\n\t<li class='level2'>")) },
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
		if (this.generateHTML) {
			return this[rule].html(morph)
		} else {
			return this[rule].converter(morph)
		}
	},
});
Object.subclass('apps.paper.HTMLCharcterConverter',

'default category', {
	// from http://javascript.jstruebig.de/javascript/76
	ENTITIES: {34: "quot", 60: "lt", 62: "gt", 38: "amp", 160: "nbsp", 161: "iexcl", 162: "cent", 
		163: "pound", 164: "curren", 165: "yen", 166: "brvbar", 167: "sect", 168: "uml", 169: "copy", 
		170: "ordf", 171: "laquo", 172: "not", 173: "shy", 174: "reg", 175: "macr", 176: "deg", 
		177: "plusmn", 178: "sup2", 179: "sup3", 180: "acute", 181: "micro", 182: "para", 183: "middot", 
		184: "cedil", 185: "sup1", 186: "ordm", 187: "raquo", 188: "frac14", 189: "frac12", 190: "frac34", 
		191: "iquest", 192: "Agrave", 193: "Aacute", 194: "Acirc", 195: "Atilde", 196: "Auml", 
		197: "Aring", 198: "AElig", 199: "Ccedil", 200: "Egrave", 201: "Eacute", 202: "Ecirc", 
		203: "Euml", 204: "Igrave", 205: "Iacute", 206: "Icirc", 207: "Iuml", 208: "ETH", 209: "Ntilde", 
		210: "Ograve", 211: "Oacute", 212: "Ocirc", 213: "Otilde", 214: "Ouml", 215: "times", 216: "Oslash", 
		217: "Ugrave", 218: "Uacute", 219: "Ucirc", 220: "Uuml", 221: "Yacute", 222: "THORN", 223: "szlig", 
		224: "agrave", 225: "aacute", 226: "acirc", 227: "atilde", 228: "auml", 229: "aring", 230: "aelig", 
		231: "ccedil", 232: "egrave", 233: "eacute", 234: "ecirc", 235: "euml", 236: "igrave", 
		237: "iacute", 238: "icirc", 239: "iuml", 240: "eth", 241: "ntilde", 242: "ograve", 243: "oacute", 
		244: "ocirc", 245: "otilde", 246: "ouml", 247: "divide", 248: "oslash", 249: "ugrave", 
		250: "uacute", 251: "ucirc", 252: "uuml", 253: "yacute", 254: "thorn", 255: "yuml", 34: "quot", 
		60: "lt", 62: "gt", 38: "amp"},

	convert: function(txt) {
		if(!txt) return '';
		txt = txt.replace(/&/g,"&amp;");
		var new_text = '';
		for(var i = 0; i < txt.length; i++) {
			var c = txt.charCodeAt(i);
			if(typeof this.ENTITIES[c] != 'undefined') {
				new_text += '&' + this.ENTITIES[c] + ';';
			} else if(c < 128) {
				new_text += String.fromCharCode(c);
			}else {
				new_text += '&#' + c +';';
			}
		}
		return new_text.replace(/</g,"&lt;").replace(/>/g,"&gt;");
	},
});


Widget.subclass('PDFGeneratorClient', {

    viewTitle: "PDF generator",
    initialViewExtent: pt(600, 100),

	panelSpec: [
		['latexSourcesLabel', function(bnds){return new TextMorph(bnds)}, 			new Rectangle(0, 		0, 		0.2, 0.2)],
		['latexSourcesInput', function(bnds){return new TextMorph(bnds)}, 				new Rectangle(0.2, 	0, 		0.8, 0.2)],
		['texFileLabel', function(bnds){return new TextMorph(bnds)}, 						new Rectangle(0, 		0.2, 		0.2, 0.2)],
		['texFileInput', function(bnds){return new TextMorph(bnds)}, 							new Rectangle(0.2, 	0.2, 		0.8, 0.2)],
		['pdfURLLabel', function(bnds){return new TextMorph(bnds)},	 					new Rectangle(0, 		0.4, 		0.2, 0.2)],
		['pdfURLInput', function(bnds){return new TextMorph(bnds)}, 						new Rectangle(0.2, 	0.4, 		0.8, 0.2)],
		['openPdfLabel', function(bnds){return new TextMorph(bnds)}, 					new Rectangle(0, 		0.6, 		0.2, 0.2)],
		['openPdfCheckbox', function(bnds){return new CheckBoxMorph(bnds)}, 	new Rectangle(0.2,		0.6, 		0.1, 0.2)],
		['generateButton', function(bnds){return new ButtonMorph(bnds)}, 				new Rectangle(0, 		0.8, 	1, 	0.2)],
	],

	buildView: function(extent) {
		var panel = PanelMorph.makePanedPanel(extent, this.panelSpec);

		var m;

		m = panel.latexSourcesLabel;
		m.setTextString('source dir:')
		m.beLabel();

		m = panel.texFileLabel;
		m.setTextString('main tex file:')
		m.beLabel();

		m = panel.pdfURLLabel;
		m.setTextString('URL for PDF:')
		m.beLabel();

		m = panel.openPdfLabel;
		m.setTextString('open PDF:')
		m.beLabel();

		m = panel.latexSourcesInput;
		m.applyStyle({suppressHandles: true, suppressGrabbing: true});

		m = panel.texFileInput;
		m.applyStyle({suppressHandles: true, suppressGrabbing: true});

		m = panel.pdfURLInput;
		m.applyStyle({suppressHandles: true, suppressGrabbing: true});

		m = panel.generateButton;
		m.setLabel('generate PDF')
		lively.bindings.connect(m, 'fire', this, 'generate');

		this.panel = panel		
		return panel;
	},

	getSourceDir: function() { return this.panel.latexSourcesInput.textString },
	getTexFilePath: function() { return this.panel.texFileInput.textString },

	getPDFURLString: function() {
		var urlString = this.panel.pdfURLInput.textString;
		try {
			new URL(urlString);
		} catch(e) {
			// it's a relative url...
			urlString = URL.source.withFilename(urlString).toString()
		}
		return urlString;
	},

	shouldOpenPDF: function() { return this.panel.openPdfCheckbox.state },

	generate: function() {
		
		if (!this.getPDFURLString() || !this.getSourceDir() || !this.getTexFilePath()) {
			this.failureMsg('Please enter information in all three fields');
			return
		}
		
		this.successMsg('Generating ' + this.getPDFURLString() + ' from ' + this.getSourceDir() + '. Please wait...');

		// FIXME
		var generatorURL = URL.source.toString().include('www') ?
			'http://lively-kernel.org/nodejs/LaTeXServer/createPdf' :
			'http://www.lively-kernel.org/nodejs/LaTeXServer/createPdf'

		var webR = new WebResource(generatorURL);

		var content = {
			directoryURL: this.getSourceDir(),
			texFile: this.getTexFilePath(),
			resultURL: this.getPDFURLString(),
		}
		webR.beAsync().post(JSON.serialize(content));		

		lively.bindings.connect(webR, 'content', this, 'dummy', {
			removeAfterUpdate: true,
			updater: function($upd, content) {
				if (this.wasRun) return
				this.wasRun = true // FIXME
				var client = this.getTargetObj();
				var status = this.getSourceObj().status
				if (!status.isSuccess()) {
					client.failureMsg('Error occured while generating pdf:' + content, Color.red, 5);
					return
				}
				client.successMsg('Successfully generated pdf')
				if (client.shouldOpenPDF()) window.open(content);
			}});
	},
	failureMsg: function(msg) {
		this.panel.world().alert(msg)
	},

	successMsg: function(msg) {
		this.panel.world().setStatusMessage(msg, Color.green, 3);
	},

});

cop.create('UndoLayer').refineClass(PaperMorph, {
	removeMorph: function(morph) {
		if (!morph.isEpimorph) {
			var cmd = new RemoveMorphCommand(this, morph, this.submorphs.indexOf(morph));
			this.getUndoHistory().addCommand(cmd);
		};
		var result;
		cop.withoutLayers([UndoLayer], function() {		
			result = cop.proceed(morph)
		});

		return result
	}
});

}); // end of module