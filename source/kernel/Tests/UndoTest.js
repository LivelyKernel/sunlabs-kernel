/*
 * Copyright (c) 2008-2010 Software Architecture Group, Hasso Plattner Institute 
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
module("Tests.UndoTest").requires("lively.Undo", 'lively.TestFramework').toRun(function(){

TestCase.subclass("Tests.UndoTest.TextReplacementCommandTest", {
	setUp: function() {
		this.text = new TextMorph(new Rectangle(100,100,10,10));
		this.text.renderAfterReplacement = function() {};	
	},

	testUndoAndRedo: function() {
		this.text.setTextString("Hello");
		var cmd = new ReplaceTextCommand(this.text, 0, "", "H");
		cmd.undo();
		this.assertEqual(this.text.textString, "ello", "undo first broken")
		cmd.redo();
		this.assertEqual(this.text.textString, "Hello", "redo first broken")

		cmd = new ReplaceTextCommand(this.text, 1, "abcde", "ell");
		cmd.undo();
		this.assertEqual(this.text.textString, "Habcdeo", "undo middle broken")
		cmd.redo();
		this.assertEqual(this.text.textString, "Hello", "redo middle broken")

		cmd = new ReplaceTextCommand(this.text, 5, "Last", "");
		cmd.undo();
		this.assertEqual(this.text.textString, "HelloLast", "undo last broken")
		cmd.redo();
		this.assertEqual(this.text.textString, "Hello", "redo last broken")
	},


	testUndoRichText: function() {
		this.text.setTextString("Hello ");
		var oldText = new lively.Text.Text("World", {color: Color.green});
		
		var cmd = new ReplaceTextCommand(this.text, 6, oldText, "");
		cmd.undo();
		this.assertEqual(this.text.textString, "Hello World", "undo textString broken");
		this.assertEqual(this.text.textStyle.valueAt(7).color, Color.green, "undo textString broken")
	},


	testSlicdeRichText: function() {
		this.text.setTextString("Hello World how are you?");
	
		this.text.setSelectionRange(6, 12);
		this.text.emphasizeSelection({color: Color.green});
		var styleSlice = this.text.textStyle.slice(4,14);

		this.assertEqual(styleSlice.valueAt(0).color, undefined, "0");
		this.assertEqual(styleSlice.valueAt(3).color, Color.green, "1");

		this.assert(styleSlice.runs , "no runs in slice");
		this.assertEqual(styleSlice.runs.length, 3, "wrong number of runs");

		var stringSlice = this.text.textString.slice(4,14);

	
		var textObj = new lively.Text.Text(stringSlice, styleSlice);
		this.text.setSelectionRange(1, 2);
		this.text.replaceSelectionWith(textObj);
		console.log("text: " + textObj);
	},

});


TestCase.subclass("Tests.UndoTest.UndoHistoryTest", {

	setUp: function() {
		this.sut = new UndoHistory();
	},

	testAddCommand: function() {
		var cmd = new UndoableCommand();
		this.sut.addCommand(cmd);
		this.assertEqual(this.sut.undoStack.length, 1)
	},

	testUndo: function() {
		var undoWasRun = false;
		var cmd = new UndoableCommand();
		cmd.undo = function() {undoWasRun = true};
		this.sut.addCommand(cmd);
		this.sut.undo();
		this.assertEqual(this.sut.undoStack.length, 0);
		this.assert(undoWasRun, "undo was not performed");
		this.assertEqual(this.sut.redoStack.length, 1)
	},

	testForgetRedoHistoryAfterNewCommand: function() {
		this.sut.addCommand(new UndoableCommand());
		this.sut.undo();
		this.assertEqual(this.sut.redoStack.length, 1);
		this.sut.addCommand(new UndoableCommand());
		this.assertEqual(this.sut.undoStack.length, 1);
		this.assertEqual(this.sut.redoStack.length, 0);
	},


	testRedo: function() {
		var redoWasRun = false;
		var cmd = new UndoableCommand();
		cmd.redo = function() {redoWasRun = true};
		this.sut.addCommand(cmd);
		this.sut.undo();
		this.sut.redo();
		this.assertEqual(this.sut.undoStack.length, 1);
		this.assert(redoWasRun, "undo was not performed");
		this.assertEqual(this.sut.redoStack.length, 0);
	},


	testHasUndoableCommand: function() {
		this.assertEqual(this.sut.hasUndoableCommand(), false);
		var cmd = new UndoableCommand();
		this.sut.addCommand(cmd);
		this.assertEqual(this.sut.hasUndoableCommand(), true);
		this.sut.undo();
		this.sut.undo(); // emtpy
	},	
});


TestCase.subclass("Tests.UndoTest.TextWithUndoStackTest", {

	setUp: function() {
		this.text = new TextMorph(new Rectangle(100,100,10,10));		
		this.text.setWithLayers([UndoLayer]);
		// text composition seems to depend on a text is is actually displayed in a world
		// so we disable the non working part...
		this.text.renderAfterReplacement = function() {};
		// WorldMorph.current().addMorph(this.text); 
	},

	testSetTextStringProducesCommand: function() {
		this.text.undoHistory = new UndoHistory();
		this.text.setTextString("A New Text");
		this.assert(this.text.undoHistory.hasUndoableCommand(), "no undoable cmd")
	},

	testUndoDoesNotProduceAnUndo: function() {
		this.text.setTextString("Old Text");
		this.text.undoHistory = new UndoHistory();
		this.text.setTextString("New Text");
		var addCommandExecuted = false;
		this.text.addCommand = function() {addCommandExecuted = true}
		this.text.undoHistory.undo();
		this.assert(!addCommandExecuted, "addCommand was executed in undo");
		this.assertEqual(this.text.undoHistory.undoStack.length, 0);

		this.assertEqual(this.text.textString, "Old Text", " undo did not work")
	},

	testMultipleUndoAndRedo: function() {
		this.text.setTextString("Old Text");
		this.text.undoHistory = new UndoHistory();
		this.text.setTextString("New Text 1");
		this.text.setTextString("New Text 2");
		this.text.setTextString("New Text 3");

		this.assertEqual(this.text.textString, "New Text 3", " undo did not work");

		this.text.undoHistory.undo();
		this.assertEqual(this.text.textString, "New Text 2", " undo did not work");

		this.text.undoHistory.undo();
		this.assertEqual(this.text.textString, "New Text 1", " undo did not work");
		
		this.text.undoHistory.undo();
		this.assertEqual(this.text.textString, "Old Text", " undo did not work");

		this.text.undoHistory.undo();
		this.assertEqual(this.text.textString, "Old Text", " undo after emty did not work");

		this.text.undoHistory.redo();
		this.assertEqual(this.text.textString, "New Text 1", " redo did not work");

	},

	testReplaceSelectionTriggersUndo: function() {
		this.text.setTextString("Old Text");
		this.text.undoHistory = new UndoHistory();
		this.text.setSelectionRange(0, 3);
		this.text.replaceSelectionWith("New");
		this.assertEqual(this.text.textString, "New Text", " replace did not work");
		this.text.undoHistory.undo();
		this.assertEqual(this.text.textString, "Old Text", " undo did not work");
	},

	testUndoPreservesStyle: function() {
		this.text.setTextString("Old Text");

		this.text.setSelectionRange(0, 3);
		this.text.emphasizeSelection({color: Color.green});
		this.assertEqual(this.text.textStyle.valueAt(1).color, Color.green, "styling broken");

		this.text.undoHistory = new UndoHistory();
		this.text.setSelectionRange(0, 3);
		this.text.replaceSelectionWith("");
	
		this.text.undoHistory.undo();
		this.assertEqual(this.text.textStyle.valueAt(1).color, Color.green, "undo forgets style");


	},


	tearDown: function() {
		// this.text.remove();
	}

});

});

// WorldMorph.current().submorphs.select(function(ea){return ea instanceof WindowMorph})[2].submorphs[0].submorphs[0].submorphs[0].textString
