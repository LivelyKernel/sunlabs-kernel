cop.create('TabCompletionLayer').refineClass(TextMorph, {

	tabCompletionChoicesForLastWord: function(proceed, lastWord) {
			var allChoices = 	TabCompletion.allSymbols();
			var localCoices = this.textString.match(/([A-za-z0-9\$]+)/g).uniq();
			var selectedAllChoices = allChoices.select(function(ea){return ea.startsWith(lastWord)});
			var selectedLocalChoices = localCoices.select(function(ea){return ea.startsWith(lastWord)}); ;
			return selectedAllChoices.concat(selectedLocalChoices).uniq()
	},
	
	tabCompletionForLastWord: function(proceed, lastWord, backward) {
			if (this.tabReplacePrefix !== lastWord) {
				this.tabReplaceListIndex = 0;
				this.tabReplacePrefix = lastWord;
			};

			var choices = this.tabCompletionChoicesForLastWord(lastWord);
			// || (this.selectionString().length == 0)
			if (this.tabReplaceListIndex === undefined) {
				this.tabReplaceListIndex = 0;
			} else {
				this.tabReplaceListIndex = this.tabReplaceListIndex + (backward ? -1 : 1);
				this.tabReplaceListIndex = (this.tabReplaceListIndex) % choices.size();
				if (this.tabReplaceListIndex < 0) {
					this.tabReplaceListIndex = this.tabReplaceListIndex + choices.size();
				}
			}
			// console.log("choices: "  + choices + " " + this.tabReplaceListIndex);
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
		this.tabReplaceListIndex = undefined
		return proceed(evt)
	},

});
