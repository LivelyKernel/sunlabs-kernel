/*
 * Copyright (c) 2008-2011 Hasso Plattner Institute
 *
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

module('lively.TabCompletion').requires('cop.Layers', 'lively.TestFramework').toRun(function() {

Object.subclass('TabCompletion');
Object.extend(TabCompletion, {
	customSymbols: function() {
		return [
			'function(){}', 
			'for(var i=0; i<10; i++){\n}',
			'collect(function(ea){ return ea})',
			'select(function(ea){ return ea})',
			'reject(function(ea){ return ea})',
			'inject(0, function(sum, ea){ return sum +1})',
			'Object.subclass("ClassName", {\n\tm: function(){}\n})', 
			'cop.create("MyLayer").refineClass(MyClass, {\n})']
	},
	choicesForPrefix: function(prefix) {
			var allChoices = 	this.allSymbols();
			return allChoices.select(function(ea){return ea.startsWith(prefix)});
	},

	allSymbols: function(force) { 
		if (!this.symbolCache || force || !this.lastCacheAccess || (Date.now() - this.lastCacheAccess > 10000)) {
			// console.log("cache miss")
			this.symbolCache = lively.ide.startSourceControl().createSymbolList().concat(this.customSymbols()).sort().uniq(true).sort();
		}
		this.lastCacheAccess = Date.now()
		return this.symbolCache;
	},

	extractLocalSymbols: function(string) {
		return string.match(/([A-za-z0-9\$]+)/g).uniq()
	},

});





cop.create('TabCompletionLayer').refineClass(TextMorph, {

	tabCompletionChoicesForLastWord: function(lastWord) {
			var selector = function(ea){return ea.startsWith(lastWord)};
			var choices = this.checkForPropertyChoicesAt(this.selectionRange[0]);
			// console.log("choices " + choices)
			var allChoices = 	TabCompletion.allSymbols();
			if (choices) {
				allChoices = allChoices.concat(choices.uniq().select(selector)).sort();
			}
			var localCoices = TabCompletion.extractLocalSymbols(this.textString);
			localCoices = localCoices.reject(function(ea){return ea == "lastWord"}); // don't match yourself
			var selectedAllChoices = allChoices.select(selector);
			var selectedLocalChoices = localCoices.select(selector); ;
			return selectedAllChoices.concat(selectedLocalChoices).uniq().sort()
	},

	tabCompletionForLastWord: function(lastWord, backward) {
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

	allPropertiesOf: function (object) {
		if (typeof object !== 'object') throw new TypeError('not an object');
		var names = []; // check behavior wrt arrays
		for (var name in object) {
						names.push(name);
		}
		return names;
	},

	checkForLastExpression: function(cursor) {
			var index = this.textString.lastIndexOf("\n", cursor -1);
			if (index !== -1) {
				var exp =  this.textString.substring(index, cursor );
				// console.log("exp " + exp + " index " + index)
				// "hello.".match(/[\n \t]*([A-Za-z0-9]+)\.([A-Za-z0-9]*)$/)
				// "hello.wo".match(/[\n \t]*([A-Za-z0-9]+)\.([A-Za-z0-9]*)$/)
				// "bla(hello.wo".match(/[\n \t]*([A-Za-z0-9]+)\.([A-Za-z0-9]*)$/)


				var m = exp.match(/[\n \t]*([A-Za-z0-9]+)\.([A-Za-z0-9]*)$/) 
				if (m) {
					return m[1]
				}
			}
	},
	
	checkForPropertyChoicesAt: function(cursor) {
			var lastExpression =	this.checkForLastExpression(cursor);
			// console.log("lastExpression: " + lastExpression )
			var propertiesChoices;
			if (lastExpression) {
				try {
					return this.allPropertiesOf(eval(lastExpression))
				}	catch (er) {
					// console.log("failed to eval" + lastExpression + " for tab completion")
				}
			}
	},
	
	onKeyDown: function(evt) {
		if (evt.getKeyCode() == Event.KEY_TAB) {
			var cursor = this.selectionRange[0];
			var lastChar = this.textString.substring(cursor - 1, cursor);
			var lastWordRange = this.locale.selectWord(this.textString, cursor -1 )

			var word = this.textString.substring(lastWordRange[0], lastWordRange[1] + 1)
			if (word) {
				var lastWord = this.textString.substring(lastWordRange[0], cursor);
			}
			// console.log("lastWordRange " + lastWordRange);
			// console.log("lastWord " + lastWord)
			if (cursor >= lastWordRange[0] && lastWord  && (lastChar != "\t") && (lastChar != "\n") && !evt.isAltDown()) {			
				
				var m = lastWord.match(/([A-Za-z0-9]+)$/)
				if (m) {
					lastWord = m[1];
				}
				var fullReplace = this.tabCompletionForLastWord(lastWord, evt.isShiftDown());
				// console.log("fullReplace " + fullReplace)
				if (fullReplace) {
						var replace = fullReplace.substring(lastWord.length, fullReplace.length);
				};
				// console.log("lastWord " + lastWord)
				if (replace) {
					this.replaceSelectionfromKeyboard(replace);
					this.setSelectionRange(cursor, cursor + replace.size());
				}  else {
					// do nothing... whait for more typing the shell makes a sound a this point 
				}
			} else {
				this.replaceSelectionfromKeyboard("\t");
			}
			evt.stop();
			return 
		}
		this.tabReplaceListIndex = undefined
		return cop.proceed(evt)
	},

});


TabCompletionLayer.beGlobal();

})