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

	tabCompletionChoicesForLastWord: function(proceed, lastWord) {
			var allChoices = 	TabCompletion.allSymbols();
			return allChoices.select(function(ea){return ea.startsWith(lastWord)});
	},
	
	tabCompletionForLastWord: function(proceed, lastWord, backward) {
			if (this.tabReplacePrefix !== lastWord) {
				this.tabReplaceListIndex = 0;
				this.tabReplacePrefix = lastWord;
			};
			if (!this.tabReplaceListIndex || (this.selectionString().length == 0)) {
				this.tabReplaceListIndex = 0;
			};

			var choices = this.tabCompletionChoicesForLastWord(lastWord);

			this.tabReplaceListIndex = (this.tabReplaceListIndex) % choices.size();
			if (this.tabReplaceListIndex < 0) {
				this.tabReplaceListIndex = this.tabReplaceListIndex + choices.size();
			}
			this.tabReplaceListIndex = this.tabReplaceListIndex + (backward ? -1 : 1);

			return choices[this.tabReplaceListIndex];
	},	
	
	onKeyDown: function(proceed, evt) {
		if (evt.getKeyCode() == Event.KEY_TAB) {
			var cursor = this.selectionRange[0];
			var lastChar = this.textString.substring(cursor - 1, cursor);
			var lastWordRange = this.locale.selectWord(this.textString, cursor )
			var word = this.textString.substring(lastWordRange[0], lastWordRange[1] + 1)
			if (word) {
				var lastWord = this.textString.substring(lastWordRange[0], cursor);
			}
			if (cursor >= lastWordRange[0] && lastWord  && (lastChar != "\t") && !evt.isAltDown()) {			
				var m = lastWord.match(/([A-Za-z0-9]+)$/)
				if (m) {
					lastWord = m[1];
				}
				var fullReplace = this.tabCompletionForLastWord(lastWord, evt.isShiftDown());
				if (fullReplace) {
					var replace = fullReplace.substring(lastWord.length, fullReplace.length);
				};
				if (replace) {
					this.replaceSelectionfromKeyboard(replace);
					this.setSelectionRange(cursor, cursor + replace.size());
				}
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