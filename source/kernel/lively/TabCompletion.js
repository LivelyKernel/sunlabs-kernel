module('lively.TabCompletion').requires('cop.Layers', 'lively.TestFramework').toRun(function() {

Object.subclass('TabCompletion');
Object.extend(TabCompletion, {
	allSymbols: function(force) { 
		if (!this.symbolCache || force) {
			this.symbolCache = lively.ide.startSourceControl().createSymbolList().sort().uniq(true).sort();
		}
		return this.symbolCache;
	}
});

TestCase.subclass('TabCompletionTest', {
	testAllSymbols: function() {
		this.assert(TabCompletion.allSymbols().length > 1000)
	},

	testAllSymbolsAreUnique: function() {
		var all = TabCompletion.allSymbols(true);
		var uniq = all.clone().uniq();
		this.assertEqual(all.length, uniq.length, "not unique");
	},

});

cop.create('TabCompletionLayer').refineClass(TextMorph, {
	
	onKeyDown: function(proceed, evt) {
		if (evt.getKeyCode() == Event.KEY_TAB) {
			var cursor = this.selectionRange[0];
			var lastChar = this.textString.substring(cursor - 1, cursor);
			var lastWordRange = this.locale.selectWord(this.textString, cursor )
			var word = this.textString.substring(lastWordRange[0], lastWordRange[1] + 1)
			if (word) {
				var lastWord = this.textString.substring(lastWordRange[0], cursor);
			}
			
			if (cursor >= lastWordRange[0] && (lastWord || (lastChar == ".")) && (lastChar != "\t") && !evt.isAltDown()) {
			
				var m = lastWord.match(/([A-Za-z0-9]+)$/)
				if (m) {
					lastWord = m[1]
				}
	
				if (!this.tabReplacePrefix === lastWord)
				this.tabReplaceListIndex = 0;
				this.tabReplacePrefix = lastWord;
				var allChoices = 	TabCompletion.allSymbols();
				var choices = allChoices.select(function(ea){return ea.startsWith(lastWord)});
				if (!this.tabReplaceListIndex)
					this.tabReplaceListIndex = 0;

				this.tabReplaceListIndex = (this.tabReplaceListIndex) % choices.size();
				var fullReplace = choices[this.tabReplaceListIndex];

				if (fullReplace) {
					var replace = fullReplace.substring(lastWord.length, fullReplace.length);
				};
				// console.log("replace " + replace + " " + fullReplace + " choices " + choices.length + " word " + word + " lastWorld" + lastWord)
				if (replace) {
					this.replaceSelectionfromKeyboard(replace);
					this.setSelectionRange(cursor, cursor + replace.size());
				}
				this.tabReplaceListIndex = this.tabReplaceListIndex + 1;
			} else {
				this.replaceSelectionfromKeyboard("\t");
			}
			evt.stop();
			return 
		}
		return proceed(evt)
	},

});

TabCompletionLayer.beGlobal();

})