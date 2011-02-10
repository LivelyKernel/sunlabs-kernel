/*
 * Copyright (c) 2006-2009 Sun Microsystems, Inc.
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


module('lively.ide').requires('lively.Helper', 'lively.ide.SystemCodeBrowser', 'lively.ide.LocalBrowser').toRun(function() {
    
    // Modules: "+Modules" --> setModule in model
    // Modules: "-Modules" --> getModule in model
    // Modules: "Modules" --> getModule and getModule in model, onModuleUpdate required
 
    //ModulesMenu: [
    // ['test', function() { console.log('click!') }],
    // ['sub', [['test2', function() { console.log('click2!') }]]]
    // ] 
 

 
Widget.subclass('lively.ide.FileVersionViewer',
'settings', {
	
	viewTitle: "Version Viewer",
    initialViewExtent: pt(450, 250),

},
'initializing', {

	buildView: function(extent) {
		var panel = PanelMorph.makePanedPanel(extent, [
			['urlPane', newTextPane, new Rectangle(0, 0, 1, 0.1)],
			['versionList', newRealListPane, new Rectangle(0, 0.1, 1, 0.8)],
			['revertButton', newButton, new Rectangle(0, 0.9, 0.33, 0.1)],
			['openButton', newButton, new Rectangle(0.33, 0.9, 0.33, 0.1)],
			['visitButton', newButton, new Rectangle(0.66, 0.9, 0.34, 0.1)],
		]);

		var m;

		m = panel.urlPane.innerMorph();
		m.beInputLine();
		m.noEval = true;
		m.plugTo(this, {savedTextString: '->setTarget'});

		m = panel.revertButton;
		m.setLabel('revert');
		m.plugTo(this, {fire: '->revert'});

		m = panel.openButton;
		m.setLabel('show');
		m.plugTo(this, {fire: '->showVersion'});

		m = panel.visitButton;
		m.setLabel('visit');
		m.plugTo(this, {fire: '->visitVersion'});

		m= panel.versionList.innerMorph();
		m.dragEnabled = false;
		// m.connectModel(Record.newPlainInstance({List: [], Selection: null})); // FIXME
		
		this.panel = panel;
		return panel;
	},
},
'actions', {
	openForURL: function(url) {
		this.open();
		this.setTarget(url);
		return this;
	},


	setTarget: function(url) {
		try { this.url = new URL(url) } catch(e) {
			return;
		} finally {
			this.panel.urlPane.innerMorph().setTextString(this.url.toString());
		}

		var versionList = this.panel.versionList.innerMorph();
		versionList.updateList(['loading']);
		var res = new WebResource(url);
		lively.bindings.connect(res, 'versions', versionList, 'updateList',
			{converter: function(list) { return list ? list.asListItemArray() : [] }});
		res.beAsync().getVersions();
	},

	fetchSelectedVersionAndDo: function(doBlock) {
		// get the revision and create a WebResource for this.url
		// then let doBlock configure that WebResource. In the end
		// GET the version of this.url
		if (!this.url) return;
		var sel = this.panel.versionList.innerMorph().selection;
		if (!sel) return;
		var rev = sel.rev;
		var resForGet = new WebResource(this.url).beAsync();
		doBlock.call(this, resForGet);
		resForGet.get(rev);
	},
	selectedURL: function() {
		var sel = this.panel.versionList.innerMorph().selection;
		if (!sel) return null;
		var rev = sel.rev;
		versionedURL = new WebResource(this.url).createResource().createVersionURLString(rev);
		return versionedURL
	},

	showVersion: function() {
		this.fetchSelectedVersionAndDo(function(resForGet) {
			lively.bindings.connect(resForGet, 'content', WorldMorph.current(), 'addTextWindow');
		});
	},
	visitVersion: function() {
		Global.open(this.selectedURL())
	},


	revert: function() {
		this.fetchSelectedVersionAndDo(function(resForGet) {
			var resForPut = new WebResource(this.url).beAsync(); // using two to know when status of put
			lively.bindings.connect(resForGet, 'content', resForPut, 'put');
			lively.bindings.connect(resForPut, 'status', this, 'revertDone');
		});
	},
	revertDone: function (status) {
		var w = WorldMorph.current();
		if (status.code() < 400)
			w.setStatusMessage('Successfully reverted ' + this.url, Color.green, 3);
		else
			w.setStatusMessage('Could not revert ' + this.url + ': ' + status, Color.red, 5);
		this.setTarget(this.url); // update list
	},
});

Object.subclass('lively.ide.ChromeErrorParser',
'parse', {
	parseStackLine: function(lineString) {
		var m = lineString.match(/.*(http.*\.js)\?(\d+)\:(\d+):(\d+)/)

		var errorLine = new lively.ide.ChromeErrorLine()
		errorLine.full = lineString
		if (m == undefined) {
			return errorLine;
		}
		errorLine.url = m[1] || "";
		errorLine.sourceID = m[2];
		errorLine.line = Number(m[3]);
		errorLine.linePosition = Number(m[4]);

		return errorLine
	},

	parseErrorStack: function(errorStackString) {
		return errorStackString.split("\n")
			.select(function(ea) {return ea.startsWith("    at ")})
			.collect(function(ea) {return this.parseStackLine(ea)}, this) 
	},

	fileFragmentList: function(errorStackString) {
		var parsedStack = this.parseErrorStack(errorStackString)
		var sc = lively.ide.startSourceControl();

		return parsedStack.collect(function(ea) {
			return ea.fileFragment()
		})
	},
	



});
Object.subclass('lively.ide.ModuleFileParser',
'default category', {
	charPosOfLine: function (lines, line) {
		// line counts from 0
		var pos = 0; 
		for (var i = 0; i < line ; i++)
			pos = pos + lines[i].length + 1
		return pos 
	},
	lineOfCharPos: function (lines, charPos) {
		// line counts from 0
		var i = 0;
		var offset = 0;
		while(offset < charPos) {
			offset += lines[i++].length + 1;
		}
		return i
	},

	linesOfString: function (string) {
		return string.split(/[\n\r]/g)
	},
});
lively.ide.ModuleFileParser.subclass('lively.ide.CombinedModulesFileParser',
'default category', {
	combinedModulesFile:  "generated/combinedModules.js",

	parseCombinedModulesString: function(combinedModules) {
		var regExp = /\/\/ contents of [A-Za-z0-9\/]+\.js\:\n/g,
			fileNameRegExp = /\/\/ contents of ([A-Za-z0-9\/]+\.js)\:/,
			matches = [],
			match = true;
		while(match) {
			match = regExp.exec(combinedModules);
			if (match) matches.push({
				offset: regExp.lastIndex,
				file: match[0].match(fileNameRegExp)[1]
			});
		}
		return matches
	},
	moduleForCombinedLineRef: function(combinedModules, line) {
		var fileOffsets = this.parseCombinedModulesString(combinedModules);
		var lines = this.linesOfString(combinedModules);
		var i=0;
		var lastFileOffset;
		var totalCharPos = this.charPosOfLine(lines, line)	
		while(fileOffsets[i] && fileOffsets[i].offset < totalCharPos) {
			lastFileOffset = fileOffsets[i];
			i++
		}
		var fileOffset = totalCharPos - (lastFileOffset ? lastFileOffset.offset || 0 : 0);
		return {file: lastFileOffset.file, offset: fileOffset} 
	},
	getCombinedModulesContent: function() {
		if (!this.combinedModulesContent)
			this.combinedModulesContent = 
				new WebResource(URL.codeBase.withFilename(this.combinedModulesFile)).get().content;
		return this.combinedModulesContent
	},
	transformFileLineAndCharPosReference: function(obj) {
		// charPos is not touched 
		if (!obj) return undefined

		if (obj.file == this.combinedModulesFile) {
			var fileOffset = this.moduleForCombinedLineRef(this.getCombinedModulesContent(), obj.line),
				realFileContent = new WebResource(URL.codeBase.withFilename(fileOffset.file)).get().content,
				realLines = this.linesOfString(realFileContent),
				realLine = this.lineOfCharPos(realLines, fileOffset.offset);
			return {file: fileOffset.file, line: realLine, charPos: obj.charPos}		
		}
		return undefined
	},


});
Object.subclass('lively.ide.ChromeErrorLine',
'default category', {
	toString: function() {
		// return this.full
		if (this.url == undefined)
			return this.full;
		return "" + this.objectPart()+ "." + this.methodPart()  + " (" + this.path() + " " + this.line + ":" + this.linePosition + ")" 
	},
	fileFragment: function() {
		var sc = lively.ide.startSourceControl(),
			moduleWrapper = sc.addModule(this.path());
		if (moduleWrapper == undefined)
			return undefined
		return moduleWrapper.ast().getSubElementAtLine(this.line, 5)
	},

	objectPart: function() {
		m = this.full.match(/at ([A-Za-z0-9$]+)\./)
		if (m) return m[1]
		else return undefined
	},

	methodPart: function() {
		m = this.full.match(/at [A-Za-z0-9$]+\.([A-Za-z0-9$<>]+)/)
		if (m) return m[1]
		else return undefined
	},

	path: function() {
		if (this.url == undefined) return ""
		return new URL(this.url).relativePathFrom(URL.codeBase) 
	},


});
Widget.subclass('lively.ide.ErrorStackViewer',
'settings', {
	
	viewTitle: "Error Stack Viewer",
    initialViewExtent: pt(700, 500),

},
'initializing', {

	buildView: function(extent) {
		extent = extent || this.initialViewExtent;

		var panel = PanelMorph.makePanedPanel(extent, [
			['errorMessage', newTextPane, new Rectangle(0, 0, 1, 0.05)],
			['errorList', newRealListPane, new Rectangle(0, 0.05, 1, 0.45)],
			['browseButton', newButton, new Rectangle(0, 0.5, 0.2, 0.05)],
			['sourcePane', newTextPane, new Rectangle(0, 0.55, 1, 0.45)],
		]);
		
		var browseButton = panel.browseButton;
		browseButton.setLabel('browse');
		browseButton.plugTo(this, {fire: '->browseSelection'});

		this.errorStackListMorph = panel.errorList.innerMorph();
		this.errorStackListMorph.dragEnabled = false;

		this.sourceTextMorph = panel.sourcePane.innerMorph();
		this.sourceTextMorph.setWithLayers([SyntaxHighlightLayer]);

		panel.sourcePane.linkToStyles(["Browser_codePane"])
		panel.sourcePane.innerMorph().linkToStyles(["Browser_codePaneText"])
		panel.sourcePane.clipMorph.setFill(null);

		connect(this.errorStackListMorph, "selection", this, 'updateSourceFromErrorLine')
		connect(this, 'errorStackList', this.errorStackListMorph, 'updateList').update(this.errorStackList)

		this.panel = panel;
		panel.ownerWidget = this;
		
		this.updateErrorMessage();


		return panel;
	},
	
	setErrorStack: function(errorStackString) {
		var list = new lively.ide.ChromeErrorParser().parseErrorStack(errorStackString)
		var combinedModulesParser = new lively.ide.CombinedModulesFileParser();
		list = list.collect(function(ea){ 
			var converted = combinedModulesParser.transformFileLineAndCharPosReference(
				{file: ea.path(), line: ea.line});
			if (converted) {
				ea.url = URL.codeBase.withFilename(converted.file)
				ea.line = converted.line
			}
			return ea
		})
		this.errorStackList = list;
	},
	setError: function(error) {
		if (error.stack)
			this.setErrorStack(error.stack);
		this.errorMessage = error.message;
		this.errorType = error.type;
		this.updateErrorMessage();
	},
},

'actions', {
	updateErrorMessage: function() {
		if (this.panel == undefined)
			return;
		this.panel.errorMessage.innerMorph().setTextString(this.errorType + ': ' + this.errorMessage)
	},

	updateSourceFromErrorLine: function(errorLine) {

		var fileFragment = errorLine.fileFragment();

		this.sourceTextMorph.setTextString(fileFragment.getSourceCode())
		this.sourceTextMorph.highlightJavaScriptSyntax();

		var from = fileFragment.charsUpToLine(errorLine.line) + errorLine.linePosition
		var to = fileFragment.charsUpToLine(errorLine.line + 1) - 1; // line end
		
		// error text selection		
		if (this.sourceTextMorph.errorTextSelection) {
			 this.sourceTextMorph.errorTextSelection.undraw()
		} else {
			this.sourceTextMorph.errorTextSelection = new TextSelectionMorph();
			this.sourceTextMorph.addMorph(this.sourceTextMorph.errorTextSelection)
			this.sourceTextMorph.style = 
				{fill: Color.gray.lighter(), borderWidth: 0, strokeOpacity: 0, borderRadius: 1};
		}
		var selectionRange = [from - 1, to-1];
		this.sourceTextMorph.drawSelectionInRange(this.sourceTextMorph.errorTextSelection, selectionRange)
		this.sourceTextMorph.scrollSelectionIntoView(selectionRange)
	},

	browseSelection: function() {
		var errorLine = this.selectedErrorLine();
		if(errorLine) errorLine.fileFragment().browseIt();

	},

	selectedErrorLine: function() {
		return this.errorStackListMorph.selection
	},
});

});