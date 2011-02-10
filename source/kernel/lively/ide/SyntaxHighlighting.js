module('lively.ide.SyntaxHighlighting').requires('cop.Layers', 'lively.ide').toRun(function() {

Object.subclass("SyntaxHighlighter", {

});

Object.extend(SyntaxHighlighter, {
	JavaScriptRules: {
		// based on http://code.google.com/p/jquery-chili-js/ regex and colors
		num: { 
			  match: /\b[+-]?(?:\d*\.?\d+|\d+\.?\d*)(?:[eE][+-]?\d+)?\b/g
			, style: {color: Color.web.blue}
		},
		reg_exp: { 
			  match: /\/[^\/\\\n]*(?:\\.[^\/\\\n]*)*\/[gim]*/g
			, style: {color: Color.web.maroon}
		},
		brace: { 
			  match: /[\{\}]/g
			, style: {color: Color.web.green, style: "normal"}
		},
		statement: { 
			  match: /\b(with|while|var|try|throw|switch|return|if|for|finally|else|do|default|continue|const|catch|case|break)\b/g
			, style: {color: Color.web.navy, style: "normal"}
		},
		object: { 
			  match: /\b(String|RegExp|Object|Number|Math|Function|Date|Boolean|Array)\b/g
			, style: {color: Color.web.deeppink}
		},
		superclassOrLayer: { 
			  match: /([A-Za-z.]+)(?=\.(subclass|refineClass|addMethods|extend))/g
			, style: {color: Color.web.navy, style: "normal"}
		},
		methodName: { 
			  match: /([A-Za-z0-9_$]+:)/g   // (?= function)
			, style: {color: Color.web.darkred, style: "normal"}
		},
		lively: { 
			  match: /\b(subclass|refineClass|addMethods|extend)\b/g
			, style: {color: Color.web.gray}
		},
		error: { 
			  match: /\b(URIError|TypeError|SyntaxError|ReferenceError|RangeError|EvalError|Error)\b/g
			, style: {color: Color.web.coral}
		},
		property: { 
			  match: /\b(undefined|arguments|NaN|Infinity)\b/g
			, style: {color: Color.web.purple, style: "normal"}
		},
		'function': { 
			  match: /\b(parseInt|parseFloat|isNaN|isFinite|eval|encodeURIComponent|encodeURI|decodeURIComponent|decodeURI)\b/g
			, style: {color: Color.web.olive}
		},
		operator: {
			  match: /\b(void|typeof|this|new|instanceof|in|function|delete)\b/g
			, style: {color: Color.web.darkblue, style: "normal"}
		},
		string: { 
			  match: /(?:\'[^\'\\\n]*(?:\\.[^\'\\\n]*)*\')|(?:\"[^\"\\\n]*(?:\\.[^\"\\\n]*)*\")/g
			, style: {color: Color.web.teal}
		},
		ml_comment: { 
			  match: /\/\*[^*]*\*+(?:[^\/][^*]*\*+)*\//g
			, style: {color: Color.web.gray}
		}
		, sl_comment: { 
			  match: /\/\/.*/g
			, style: {color: Color.web.green}
		}
	}
});



RunArray.addMethods('SyntaxHighlight', {
	// does not coerce
	simpleMergeStyle: function(emph, start, stop) {
		var newRun = this.slice(start, stop+1).mergeAllStyle(emph);
		if (start > 0) newRun = this.slice(0, start).concat(newRun);
		if (stop < this.length()-1) newRun = newRun.concat(this.slice(stop+1, this.length()));
		return newRun;
	},
})

TextMorph.addMethods('SyntaxHighlight',{
	// does not compose after edit
	simpleEmphasizeFromTo: function(emph, from, to) {
		var txt = new lively.Text.Text(this.textString, this.textStyle);
		txt.emphasize(emph, from, to);
		this.textStyle = txt.style;
	},

	highlightJavaScriptSyntaxFromTo: function(from, to) {
		this.emphasizeFromTo({color: Color.black, style: 'unbold'}, 0, this.textString.length);
		var string = this.textString.substring(from,to),
			style = this.textStyle,
			highlighterRules = SyntaxHighlighter.JavaScriptRules;
		// var style = new RunArray([s.length],	[new TextEmphasis({})]);
		
		for (var ruleName in highlighterRules) {
			if (!highlighterRules.hasOwnProperty(ruleName)) continue;
			var rule = highlighterRules[ruleName],
				exp = rule.match, m;
			while(m = exp.exec(string)) {
				// this.emphasizeFromTo(rule.style, from + m.index, from + m.index + m[0].length - 1 )
				style = style.simpleMergeStyle(new TextEmphasis(rule.style), from + m.index, from + m.index + m[0].length - 1) // TODO ckeck "-1"
			}
		};

		// override all other styles... to be refactored
		// this.textStyle =  this.textStyle.mergeStyle(style, from, to)	
		this.textStyle = style.coalesce();
		var replacementHints = {selStart: from, selStop: to, repLength: string.length};
		this.composeAfterEdits(replacementHints);
	},

	highlightJavaScriptSyntax: function() {
		this.highlightJavaScriptSyntaxFromTo(0, this.textString.length);
	},

	delayedSyntaxHighlighting: function(optFrom, optTo) {
		// console.log("delayedSyntaxHig...." + optFrom + "," + optTo)
		var string = this.textString,
			self = this,
			from = optFrom || 0,
			to = optTo || self.textString.length;			

		this.highlightJavaScriptMinFrom = Math.min(this.highlightJavaScriptMinFrom, from) || from
		this.highlightJavaScriptMaxTo = Math.max(this.highlightJavaScriptMaxTo, to) || to

		// console.log("to " + to)
		// console.log("highlightJavaScriptMaxTo " + this.highlightJavaScriptMaxTo)

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
				// WorldMorph.current().setStatusMessage("delayed hightlight in " + time +"ms " + 
				//	self.highlightJavaScriptMinFrom + "," + self.highlightJavaScriptMaxTo, Color.blue, 3)
				delete self.highlightJavaScriptProgress
				delete self.highlightJavaScriptMinFrom
				delete self.highlightJavaScriptMaxTo
			}
		};
		func(0)
	},
})

cop.create("SyntaxHighlightLayer").refineClass(TextMorph, {

	// replaceSelectionWith: function(replacement) {
	//	var result = cop.proceed(replacement);
	//	var cursorPos = t.getCursorPos();
	//	this.delayedSyntaxHighlighting(this.textString.lastIndexOf("\n", cursorPos - 1), this.textString.indexOf("\n", cursorPos));
	//	return result;	
	// },

 	// tryBoundEval: function(str, offset, printIt) {
		// var result = cop.proceed(str, offset, printIt);
		// The syntax highlighting triggers a bug in TextMorph
		// where newlines are not composed correctly
		// this.highlightJavaScriptSyntaxFromTo(offset,  offset + str.length);
		// this.delayedSyntaxHighlighting(offset,  offset + str.length)	
		// return result
	// },

	subMenuStyleItems: function(evt) {
		var items;
		withoutLayers([SyntaxHighlightLayer], function() {
			items= cop.proceed(evt);
		});
		var enabled = this.getWithLayers().include(BrowserSyntaxHighlightLayer);
		items.push([(enabled ? "[X]" : "[]") + " Syntax Highlighting", function() {
			if(!enabled) {
				this.highlightJavaScriptSyntax();
				this.setWithLayers(this.getWithLayers().concat([BrowserSyntaxHighlightLayer]))
			} else {
				this.emphasizeAll({color: "black", style: 'unbold'})
				this.setWithLayers(this.getWithLayers().reject(
					function(ea){return ea === BrowserSyntaxHighlightLayer}))
			}
		}])		
		return items
	},
})
.refineClass(lively.ide.BasicBrowser, {

	hightlightSourcePane: function() {
		var m = this.panel.sourcePane.innerMorph();
		if (m.textString.length < 10000) {
			try {
				// var time = Functions.timeToRun(function(){m.highlightJavaScriptSyntax()});
				m.delayedSyntaxHighlighting();
			} catch (er) {
				console.log("Error during Syntax Highligthing " + er)
			}
			m.setFontFamily('Courier')
		}
		// WorldMorph.current().setStatusMessage('Browser Syntax Highligth ' +time+ "ms", Color.blue, 3)
	},

	onPane2SelectionUpdate: function(node) {
		cop.proceed(node);
		this.hightlightSourcePane();
    },

	onPane4SelectionUpdate: function(node) {
		cop.proceed(node);
		this.hightlightSourcePane();
    },

	buildView: function(extent) {
		var morph = cop.proceed(extent)
		this.panel.sourcePane.innerMorph().setWithLayers([BrowserSyntaxHighlightLayer])
		return morph
	}
});

cop.create('BrowserSyntaxHighlightLayer').refineClass(TextMorph, {
	doSave: function() {
		cop.proceed();
		this.highlightJavaScriptSyntax()
	},
});

SyntaxHighlightLayer.beGlobal()

}) // end of module