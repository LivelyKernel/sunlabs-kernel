module('lively.SyntaxHighlighting').requires('cop.Layers', 'lively.TestFramework').toRun(function() {

var rgb = Color.rgb;

Color.web = {
	maroon: rgb(128,0,0),
	darkred: rgb(139,0,0),
	firebrick: rgb(178,34,34),
	brown: rgb(165,42,42),
	crimson: rgb(220,20,60),
	red: rgb(255,0,0),
	orangered: rgb(255,69,0),
	indianred: rgb(205,92,92),
	darksalmon: rgb(233,150,122),
	lightsalmon: rgb(255,160,122),
	coral: rgb(255,127,80),
	tomato: rgb(253,99,71),
	salmon: rgb(250,128,114),
	lightcoral: rgb(240,128,128),
	palevioletred: rgb(219,112,147),
	mediumvioletred: rgb(199,21,133),
	deeppink: rgb(255,20,147),
	fuchsia: rgb(255,0,255),
	magenta: rgb(255,0,255),
	hotpink: rgb(255,105,180),
	lightpink: rgb(255,182,193),
	pink: rgb(255,192,203),
	thistle: rgb(216,191,216),
	plum: rgb(221,160,221),
	violet: rgb(238,130,238),
	orchid: rgb(218,112,214),
	mediumorchid: rgb(186,85,211),
	darkorchid: rgb(153,50,204),
	darkviolet: rgb(148,0,211),
	purple: rgb(128,0,128),
	darkmagenta: rgb(139,0,139),
	indigo:	rgb(75,0,130),
	blueviolet: rgb(138,43,226),
	mediumpurple: rgb(147,112,219),
	mediumslateblue: rgb(123,104,238),
	slateblue: rgb(106,90,205),
	darkslateblue: rgb(72,61,139),
	midnightblue: rgb(25,25,112),
	navy: rgb(0,0,128),
	darkblue: rgb(0,0,139),
	mediumblue: rgb(0,0,205),
	blue: rgb(0,0,255),
	royalblue: rgb(65,105,225),
	cornflowerblue: rgb(100,149,237),
	steelblue: rgb(70,130,180),
	dodgerblue: rgb(30,144,255),
	deepskyblue: rgb(0,191,255),
	lightskyblue: rgb(135,206,250),
	skyblue: rgb(135,206,235),
	lightsteelblue: rgb(176,196,222),
	lightblue: rgb(173,216,230),
	powderblue: rgb(176,224,230),
	paleturquoise: rgb(175,238,238),
	mediumturquoise: rgb(72,209,204),
	lightseagreen: rgb(32,178,170),
	darkcyan: rgb(0,139,139),
	teal: rgb(0,128,128),
	cadetblue: rgb(95,158,160),
	darkturquoise: rgb(0,206,209),
	aqua: rgb(0,255,255),
	cyan: rgb(0,255,255),
	turquoise: rgb(64,224,208),
	aquamarine: rgb(127,255,212),
	mediumaquamarine: rgb(102,205,170),
	darkseagreen: rgb(143,188,143),
	mediumseagreen: rgb(60,179,113),
	seagreen: rgb(46,139,87),
	darkgreen: rgb(0,100,0),
	green: rgb(0,128,0),
	forestgreen: rgb(34,139,34),
	limegreen: rgb(50,205,50),
	springgreen: rgb(0,255,127),
	mediumspringgreen: rgb(0,250,154),
	palegreen: rgb(152,251,152),
	lightgreen: rgb(144,238,144),
	lime: rgb(0,255,0),
	chartreuse: rgb(127,255,0),
	lawngreen: rgb(124,252,0),
	greenyellow: rgb(173,255,47),
	yellowgreen: rgb(154,205,50),
	darkolivegreen: rgb(85,107,47),
	olivedrab: rgb(107,142,35),
	olive: rgb(128,128,0),
	darkkhaki: rgb(189,183,107),
	darkgoldenrod: rgb(184,134,11),
	goldenrod: rgb(218,165,32),
	gold: rgb(255,215,0),
	yellow: rgb(255,255,0),
	khaki: rgb(240,230,140),
	palegoldenrod: rgb(238,232,170),
	sandybrown: rgb(244,164,96),
	orange: rgb(255,165,0),
	darkorange: rgb(255,140,0),
	chocolate: rgb(210,105,30),
	saddlebrown: rgb(139,69,19),
	sienna: rgb(160,82,45),
	peru: rgb(205,133,63),
	burlywood: rgb(222,184,135),
	tan: rgb(210,180,140),
	wheat: rgb(245,222,179),
	navajowhite: rgb(255,222,173),
	moccasin: rgb(255,228,181),
	blanchedalmond: rgb(255,255,205),
	rosybrown: rgb(188,143,143),
	mistyrose: rgb(255,228,225),
	lavenderblush: rgb(255,240,245),
	lavender: rgb(230,230,250),
	ghostwhite: rgb(248,248,255),
	azure: rgb(240,255,255),
	lightcyan: rgb(224,255,255),
	aliceblue: rgb(240,248,255),
	mintcream: rgb(245,255,250),
	honeydew: rgb(240,255,240),
	lightgoldenrodyellow: rgb(250,250,210),
	lemonchiffon: rgb(255,250,205),
	beige: rgb(245,245,220),
	lightyellow: rgb(255,255,224),
	ivory: rgb(255,240,240),
	floralwhite: rgb(255,250,240),
	linen: rgb(250,240,230),
	oldlace: rgb(253,245,230),
	cornsilk: rgb(255,248,220),
	antiquewhite: rgb(250,235,215),
	bisque: rgb(255,228,196),
	peachpuff: rgb(255,239,213),
	papayawhip: rgb(255,239,213),
	seashell: rgb(255,245,238),
	snow: rgb(255,250,250),
	white: rgb(255,255,255),
	whitesmoke: rgb(245,245,245),
	gainsboro: rgb(220,220,220),
	lightgrey: rgb(211,211,211),
	silver: rgb(192,192,192),
	darkgray: rgb(169,169,169),
	gray: rgb(128,128,128),
	dimgray: rgb(105,105,105),
	lightslategray: rgb(119,136,153),
	slategray: rgb(112,128,144),
	darkslategray: rgb(47,79,79),
	black: rgb(0,0,0)
}

Object.extend(Color, {
	
	webColorTableMorph: function() {
		var colors = Properties.own(Color.web)
		var h = 20
		var y = 0;
		var x = 0;
		container = Morph.makeRectangle(0,0,600,480);
		container.name = "WebColors"
		container.setFill(Color.gray)
		colors.each(function(name) {
			var morph = new TextMorph(new Rectangle(x, y, 100,h), name)
			morph.ignoreEvents()
			y += h;
			morph.setFill(Color.web[name])
			container.addMorph(morph);
			if (y > 460) {
				y = 0;
				x += 100;
			}

		})
		return container
	},
		
	showWebColorTable: function(){
		this.webColorTableMorph().openInWorld()
	}
})

// Color.showWebColorTable()





Object.subclass("SyntaxHighlighter", {

})

Object.extend(SyntaxHighlighter, {
	JavaScriptRules: {
		// based on http://code.google.com/p/jquery-chili-js/ regex and colors
		ml_comment: { 
			  match: /\/\*[^*]*\*+(?:[^\/][^*]*\*+)*\//g
			, style: {color: Color.web.gray}
		}
		, sl_comment: { 
			  match: /\/\/.*/g
			, style: {color: Color.web.green}
		}
		, string: { 
			  match: /(?:\'[^\'\\\n]*(?:\\.[^\'\\\n]*)*\')|(?:\"[^\"\\\n]*(?:\\.[^\"\\\n]*)*\")/g
			, style: {color: Color.web.teal}
		}
		, num: { 
			  match: /\b[+-]?(?:\d*\.?\d+|\d+\.?\d*)(?:[eE][+-]?\d+)?\b/g
			, style: {color: Color.web.red}
		}
		, reg_exp: { 
			  match: /\/[^\/\\\n]*(?:\\.[^\/\\\n]*)*\/[gim]*/g
			, style: {color: Color.web.maroon}
		}
		, brace: { 
			  match: /[\{\}]/g
			, style: {color: Color.web.red, style: "bold"}
		}
		, statement: { 
			  match: /\b(with|while|var|try|throw|switch|return|if|for|finally|else|do|default|continue|const|catch|case|break)\b/g
			, style: {color: Color.web.navy, style: "bold"}
		}
		, error: { 
			  match: /\b(URIError|TypeError|SyntaxError|ReferenceError|RangeError|EvalError|Error)\b/g
			, style: {color: Color.web.coral}
		}
		, object: { 
			  match: /\b(String|RegExp|Object|Number|Math|Function|Date|Boolean|Array)\b/g
			, style: {color: Color.web.deepPink}
		}
		, property: { 
			  match: /\b(undefined|arguments|NaN|Infinity)\b/g
			, style: {color: Color.web.purple, style: "bold"}
		}
		, 'function': { 
			  match: /\b(parseInt|parseFloat|isNaN|isFinite|eval|encodeURIComponent|encodeURI|decodeURIComponent|decodeURI)\b/g
			, style: {color: Color.web.olive}
		}
		, operator: {
			  match: /\b(void|typeof|this|new|instanceof|in|function|delete)\b/g
			, style: {color: Color.web.royalBlue, style: "bold"}
		}
	}
})


cop.create("SyntaxHighlightLayer").refineClass(TextMorph, {

	highlightJavaScriptSyntaxFromTo: function(proceed, from, to) {
		this.emphasizeFromTo({Color: Color.black, style: 'unbold'}, from, to)
		Properties.own(SyntaxHighlighter.JavaScriptRules).each(function(ea) {
			var r = SyntaxHighlighter.JavaScriptRules[ea];
			var exp = new RegExp(r.match);
			var m;
			var s = this.textString.substring(from,to)
			while(m = exp.exec(s)) {
				this.emphasizeFromTo(r.style, from + m.index, from + m.index + m[0].length - 1)
			}
		}, this);
	},

	highlightJavaScriptSyntax: function() {
		this.highlightJavaScriptSyntaxFromTo(0, this.textString.length);
	},


	delayedSyntaxHighlighting: function(proceed, optFrom, optTo) {
		console.log("delayedSyntaxHig...." + optFrom + "," + optTo)
		var string = this.textString;
		var self = this;
		var from = optFrom || 0;
		var to = optTo || self.textString.length;			

		this.highlightJavaScriptMinFrom = Math.min(this.highlightJavaScriptMinFrom, from) || from
		this.highlightJavaScriptMaxTo = Math.max(this.highlightJavaScriptMaxTo, to) || to

		console.log("to " + to)
		console.log("highlightJavaScriptMaxTo " + this.highlightJavaScriptMaxTo)


		var lastHighlightJavaScriptProgress = this.highlightJavaScriptProgress;
		this.highlightJavaScriptProgress = {last: Date.now()};

		if ((Date.now() - lastHighlightJavaScriptProgress < 2000)) {
			// WorldMorph.current().setStatusMessage("delayed hightlight in Progress", Color.darkGray, 3)
			return
		}
		var func = function() {
			if ((Date.now() - self.highlightJavaScriptProgress) < 500) {
				// WorldMorph.current().setStatusMessage("delay hightlight", Color.red, 2)
				func.delay(0);
			} else {	
				var time = Functions.timeToRun(function() {
						self.highlightJavaScriptSyntaxFromTo(
							self.highlightJavaScriptMinFrom, self.highlightJavaScriptMaxTo)});
				WorldMorph.current().setStatusMessage("delayed hightlight in " + time +"ms " + 
					self.highlightJavaScriptMinFrom + "," + self.highlightJavaScriptMaxTo, Color.blue, 3)
				delete self.highlightJavaScriptProgress
				delete self.highlightJavaScriptMinFrom
				delete self.highlightJavaScriptMaxTo
			}
		};
		func(0)
	},

	replaceSelectionWith: function(proceed, replacement) {
		var result = proceed(replacement);
		var cursorPos = t.getCursorPos();
		this.delayedSyntaxHighlighting(this.textString.lastIndexOf("\n", cursorPos - 1), this.textString.indexOf("\n", cursorPos));
		return result;	
	},

	tryBoundEval: function(proceed, str, offset) {
		var result = proceed(str, offset);
		this.delayedSyntaxHighlighting(offset,  offset + str.length)	
		return result
	},

	doSave: function(proceed) {
		proceed()
		// this.delayedSyntaxHighlighting()
	},

})

cop.create("BenchmarkReplaceTextSelectionLayer").refineClass(TextMorph, {
	
	replaceSelectionWith: function(proceed, replacement) {
		var m = $morph('BenchmarkReplaceTextSelectionResultMorph');
		var result;
		var time = Functions.timeToRun(function() {
			result = proceed(replacement) 
		}.bind(this))
		m.setTextString("replace	" + replacement.length + "	"+ time + "ms" + '\n' + m.textString)
		return result;	
	}

})

})





