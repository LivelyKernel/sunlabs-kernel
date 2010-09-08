module('lively.SpellChecker').requires('lively.Text', 'cop.Layers', 'lively.TestFramework').toRun(function() {
createLayer("SpellCheckerLayer");
// enableLayer(SpellCheckerLayer);

// disableLayer(SpellCheckerLayer);
createLayer("NetRquestsAreSyncLayer")
layerClass(NetRquestsAreSyncLayer, NetRequest, {

	get isSync() {
		return true;
	}
});

Object.subclass("SpellChecker", {

	querySpellCheckService: function(input) {
		var self = this;
		var request = new NetRequest({model: this, setStatus: "onResponse"});
		var url = "http://lively-kernel.org/cgi/send_req.pl?lang=en&hl=en"
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
})


cop.create('SpellCheckerLayer')
.refineClass(TextMorph, {

	correctWithSuggestion: function(proceed, offset, length, suggestion) {
		console.log("correct from " + offset + " to " + 
			offset + length +" with: " + suggestion);		
		this.setSelectionRange(offset, offset + length);
		this.replaceSelectionWith(suggestion);
		this.emphasizeFromTo({color: null, spellchecksuggestions: null }, offset, offset + suggestion.length)
	},

	morphMenu: function(proceed, evt) {
		var spellCheck = this.spellCheckUnderMouse(evt);
		var menu = proceed(evt);
		var self = this;
		if (menu && spellCheck && spellCheck.suggestions) {
			var suggestions = spellCheck.suggestions;
			menu.addItem(["-----", function(){ }], 0 );
			console.log("spellCheck: " + suggestions)
			suggestions.split('	').reverse().each(function(ea) {
				menu.addItem([ea, function() { 
					self.correctWithSuggestion(spellCheck.offset, spellCheck.length, ea)
				}], 0 );
			})
		}
		menu.addItem(["check spelling", this.spellCheckAll])
		return menu
	},

	spellCheckAll: function() {
		var checker = new SpellChecker();
		var xmlString = checker.querySpellCheckService(this.textString);
		if (!xmlString) {
			throw new Error('Spell Checking: no response')
		};
		var self = this;
		var xml = new DOMParser().parseFromString(xmlString, "text/xml");
		corrections = checker.extractSpellCheck(xml)
		corrections.each(function(ea){
			var a = ea.offset;
			var b = a + ea.length ;
			console.log("spellCheck = " + ea);
			var style = {color: "red",
					spellchecksuggestions: ea.suggestions };
			self.emphasizeFromTo(style,  a, b);
			console.log("color from " + a + " to " + b)
		})
	},

 
	spellCheckUnderMouse: function(proceed, evt) {	 
		if (!this.textStyle) return null;
		var charIx = this.charOfPoint(this.localize(evt.mousePoint));
		var style = this.textStyle.valueAt(charIx);
		// we have to compute it, because it changes.....
		var mark = this.textStyle.markAt(charIx)
		return {
			offset: charIx - mark.offset,
			length: this.textStyle.runs[mark.runIndex] - 1,
			suggestions: style.spellchecksuggestions
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
	}
});

});