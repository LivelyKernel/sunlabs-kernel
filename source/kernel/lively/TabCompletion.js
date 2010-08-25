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

TestCase.subclass('TabCompletionTest', {
	testAllSymbols: function() {
		this.assert(TabCompletion.allSymbols().length > 1000)
	},

	testAllSymbolsAreUnique: function() {
		var all = TabCompletion.allSymbols(true);
		var uniq = all.clone().uniq();
		this.assertEqual(all.length, uniq.length, "not unique");
	},
	
	testExtractLocalSymbols: function() {
		var text = "abc abbc\nabbd\tabbe";
		var all = TabCompletion.extractLocalSymbols(text)
		this.assert(all.length == 4, "wrong lenth")
	}

});


TestCase.subclass('TabCompletionLayerTest', {

	createText: function(string) {
		var sut = new TextMorph(new Rectangle(0,0,100,100), string);
		sut.setWithLayers([TabCompletionLayer]);
		return sut
	},

	testTabCompletionChoicesForLastWord: function() {
		var string = "\nfunc\nNextLine\n"
		var sut = this.createText(string);
		sut.setSelectionRange(string.indexOf("\nNextLine"), 0);
		var coices = sut.tabCompletionChoicesForLastWord("func");
		this.assert(coices.length > 0);
	},

	testTabCompletionChoicesForLastWord: function() {
		var string = "\nfunc\nNextLine\n"
		var sut = this.createText(string);
		sut.setSelectionRange(string.indexOf("\nNextLine"), 0);
		// this.assertEqual(sut.tabCompletionForLastWord("func", false), "function");
	}
});


cop.create('TabCompletionLayer').refineClass(TextMorph, {

	tabCompletionChoicesForLastWord: function(proceed, lastWord) {
			var selector = function(ea){return ea.startsWith(lastWord)};
			var choices = this.checkForPropertyChoicesAt(this.selectionRange[0]);
			// console.log("choices " + choices)
			if (choices) {
				return choices.uniq().select(selector);
			}
			var allChoices = 	TabCompletion.allSymbols();
			var localCoices = TabCompletion.extractLocalSymbols(this.textString);
			localCoices = localCoices.reject(function(ea){return ea == "lastWord"}); // don't match yourself
			var selectedAllChoices = allChoices.select(selector);
			var selectedLocalChoices = localCoices.select(selector); ;
			return selectedAllChoices.concat(selectedLocalChoices).uniq().sort()
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

	allPropertiesOf: function (proceed, object) {
		if (typeof object !== 'object') throw new TypeError('not an object');
		var names = []; // check behavior wrt arrays
		for (var name in object) {
						names.push(name);
		}
		return names;
	},

	checkForLastExpression: function(proceed, cursor) {
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
	
	checkForPropertyChoicesAt: function(proceed, cursor) {
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
	
	onKeyDown: function(proceed, evt) {
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
		return proceed(evt)
	},

});


TabCompletionLayer.beGlobal();

})