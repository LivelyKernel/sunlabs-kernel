module('lively.SpellChecker').requires('lively.Text', 'cop.Layers', 'lively.TestFramework').toRun(function() {
createLayer("SpellCheckerLayer");
// enableLayer(SpellCheckerLayer);

// disableLayer(SpellCheckerLayer);

Object.subclass("SpellChecker", {

	querySpellCheckService: function(input, optLang) {
		var self = this;
		var lang = optLang || "en";
	
		var url = "http://lively-kernel.org/cgi/send_req.pl?lang="+ lang+"&hl=" +lang
		var post = '<?xml version="1.0" encoding="utf-8" ?> \
<spellrequest textalreadyclipped="0" ignoredups="0"  ignoredigits="1" ignoreallcaps="1">\
    <text>' +input.asString() +'</text>\
</spellrequest>';

		var r = new WebResource(new URL(url));		
		r.post(post);

		return r.content
	},
	
	extractSpellCheck: function(xml){
		nodes = $A(xml.childNodes[0].childNodes).collect(function(ea) {
			console.log("c.o = " + Number(ea.getAttribute("o")));
			return {offset:  Number(ea.getAttribute("o")), 
				length: Number(ea.getAttribute("l")), 
				confidence:  Number(ea.getAttribute("s")),
				suggestions:  ea.textContent}
		})
		return nodes
	},

	onResponse: function(request) {
		console.log("I got something" + request.getResponseText());
 
	}
});

Object.extend(SpellChecker, {

	genIngoreListName: function(lang) {
		return 'SpellCheckingIgnoreList' + (lang || "en").capitalize()
	},

	getIgnoreList: function(lang) {
		// JSON.stringify(['Hello'])
		//localStorage['SpellCheckingIgnoreListTest']
		var s = localStorage[this.genIngoreListName(lang)];
		if (s) {
			return JSON.parse(s)
		} else {
			return []
		}
	},

	setIgnoreList: function(list, lang) {
		localStorage[this.genIngoreListName(lang)] = JSON.stringify(list)		
	},
	
	addIgnoreWord: function(word, lang) {
		var list = this.getIgnoreList(lang)
		if ( ! list.include(word)) {
			list.push(word)
			this.setIgnoreList(list, lang)	
		}
	},
})

cop.create('SpellCheckerLayer')
.refineClass(TextMorph, {

	correctWithSuggestion: function(offset, length, suggestion) {
		console.log("correct from " + offset + " to " + 
			offset + length +" with: " + suggestion);		
		this.setSelectionRange(offset, offset + length);
		this.replaceSelectionWith(suggestion);
		this.emphasizeFromTo({color: null, spellchecksuggestions: null }, offset, offset + suggestion.length)
	},
	
	ignoreWordWhileSpellChecking: function(word) {
		SpellChecker.addIgnoreWord(word, this.getSpellCheckLang());

	},

	morphMenu: function(evt) {
		var spellCheck = this.spellCheckUnderMouse(evt);
		var menu = cop.proceed(evt);
		var self = this;
		if (menu && spellCheck ) {
			menu.addItem(["-----", function(){ }], 0 );
			menu.addItem(["ignore \"" + spellCheck.word + '" in ' + this.getSpellCheckLang(), function() { 
				self.ignoreWordWhileSpellChecking(spellCheck.word)
			}], 0 );
			var suggestions = spellCheck.suggestions;
			if (suggestions) {
				suggestions.split('	').reverse().each(function(ea) {
					menu.addItem([ea, function() { 
						self.correctWithSuggestion(spellCheck.offset, spellCheck.length, ea)
					}], 0 );
				})
			}
		}
		menu.addItem(["check spelling", this.spellCheckAll])
		menu.addItem(["disable spellchecking", this.unspellCheckAll])
		return menu
	},

	getSpellCheckLang: function() {		
		return this.spellCheckLang || "en"
	},

	spellCheckAll: function() {
		var checker = new SpellChecker();
		var lang = this.getSpellCheckLang();
		var xmlString = checker.querySpellCheckService(this.textString, lang);
		if (!xmlString) {
			throw new Error('Spell Checking: no response')
		};
		var self = this;
		var xml = new DOMParser().parseFromString(xmlString, "text/xml");
		var ignoreList = SpellChecker.getIgnoreList(lang)
		corrections = checker.extractSpellCheck(xml)
		corrections.each(function(ea){
			var a = ea.offset;
			var b = a + ea.length ;
			var word = this.textString.slice(a, b)
			// console.log("spellCheck " + word);
			if (!ignoreList.include(word)) {
				var style = {color: "red",
						spellchecksuggestions: ea.suggestions };
				self.emphasizeFromTo(style,  a, b);
				console.log("color from " + a + " to " + b)
			}
		}, this)
	},
	unspellCheckAll: function() {
		console.log('disable spell checking')
		if (!this.textStyle)
			return;
		for (var i=0; i< this.textStyle.values.length; i++) {
			var style = this.textStyle.values[i];
			console.log('style ' + style.spellchecksuggestions)
			
			if ('spellchecksuggestions' in style) {
				console.log('delete style ')
				delete style.spellchecksuggestions;
				delete style.color;
			}
			
		}
		this.textStyle = this.textStyle.coalesce();
		this.composeAfterEdits()
	},
 
	spellCheckUnderMouse: function(evt) {	 
		if (!this.textStyle) return null;
		var charIx = this.charOfPoint(this.localize(evt.mousePoint));
		var style = this.textStyle.valueAt(charIx);
		if (! ('spellchecksuggestions' in style) )
			return;
		// we have to compute it, because it changes.....
		var mark = this.textStyle.markAt(charIx)
		var offset = charIx - mark.offset;
		var length = this.textStyle.runs[mark.runIndex] - 1;
		var word = this.textString.slice(offset, offset + length);
		// console.log("word " + word + "offset " + offset + " length " + length )
		var suggestions = style.spellchecksuggestions;
		return {
			word: word,
			offset: offset,
			length: length,
			suggestions: suggestions
		};		  
	},

});

TestCase.subclass("lively.SpellChecker.SpellCheckerTest", {

	testQuerySpellCheckService: function() {

		var self = this;
		var checker = new SpellChecker();
		
		var expected = '<?xml version="1.0" encoding="UTF-8"?><spellresult error="0" clipped="0" charschecked="13"><c o="10" l="3" s="0">text	TX	ext</c></spellresult>'
	
		var result = checker.querySpellCheckService("This is a txt");
		this.assertEqual(result, expected, "wrong xml");	
	},

	testQuerySpellCheckServiceGerman: function() {
		var self = this;
		var checker = new SpellChecker();
		var expected = '<?xml version="1.0" encoding="UTF-8"?><spellresult error="0" clipped="0" charschecked="18"><c o="9" l="4" s="1">kein	Kai	Kamin	Karin	Hain</c><c o="14" l="4" s="1">Text	Axt	Tat	Taft	Takt	Taxi</c></spellresult>'
	
		var result = checker.querySpellCheckService("Dies ist kain Taxt", 'de');

		this.assertEqual(result, expected, "wrong xml");	
	},

	testExtractSuggestions: function() {

		var checker = new SpellChecker();
		var xmlString = '<?xml version="1.0" encoding="UTF-8"?><spellresult error="0" clipped="0" charschecked="23"><c o="5" l="3" s="1">text	TX	ext</c><c o="13" l="3" s="1">two	toe	Te	to	Theo</c></spellresult>';

		var xml = new DOMParser().parseFromString(xmlString, "text/xml");
		this.assert(xml, "could not parse " + xmlString);
		var spellChecks = checker.extractSpellCheck(xml);
		this.assertEqual(spellChecks.length, 2, "wrong number of spellchecks");
		this.assert(spellChecks[0].offset, " no offset");
		this.assert(spellChecks[0].length, " no length");
		this.assert(spellChecks[0].confidence, " no confidence");
		this.assert(spellChecks[0].suggestions, " no suggestions");
	},

	testSetGetIngoreList: function() {
		SpellChecker.setIgnoreList(["TestWord"],"test")
		
		var list = SpellChecker.getIgnoreList("test")
		this.assertEqual(list[0], "TestWord")
	},
	
	testAddIgnoreWord: function() {
		SpellChecker.setIgnoreList([],"test")
		SpellChecker.addIgnoreWord("TestWord2","test")
		
		var list = SpellChecker.getIgnoreList("test")
		this.assertEqual(list[0], "TestWord2")
	},
});

});