/*
 * Copyright (c) 2006-2009 Sun Microsystems, Inc.
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


/* An adhoc testFramework. It defines a TestCase class which should be subclassed for
creating own tests. TestResult and TestSuite are used internally for running the Tests.
TestRunner is a Widget which creates a standard xUnit TestRunner window. All tests of 
the system can be run from it */

/*
 * Related Work:
 * - http://www.cjohansen.no/en/javascript/test_driven_development_with_javascript_part_two
 */

module('lively.TestFramework').requires('lively.bindings').toRun(function(thisModule) {

/* 
 * *** Error properties for documentation: ***
 *  Example from WebKit
 *    message:  assert failed (no files read), 
 *    line: 70
 *    expressionBeginOffset: 1765
 *    expressionEndOffset: 1836
 *    sourceId: 18326
 *    sourceURL: http://localhost/lk/kernel/TestFramework.js
 */

Global.printError = function printError(e) {
   var s = "" + e.constructor.name + ": ";
   for (i in e) { s += i + ": " + String(e[i]) + ", "}; // get everything out....
   return s
}

Global.logError = function logError(e) {
    console.log("Error: " + printError(e));
}

Object.subclass('TestCase',
'parameters', {

    shouldRun: true,

	verbose: Functions.True,
},
'initializing', {
    
	initialize: function(testResult, optTestSelector) {
		this.result = testResult || new TestResult();
		this.currentSelector = optTestSelector;
		this.statusUpdateFunc = null;
	},	
		
	createTests: function() {
		return this.allTestSelectors().collect(function(sel) {
			return new this.constructor(this.result, sel);
		}, this);
	},

},
'accessing', {
	name: function() { return this.constructor.type },
	
	id: function() { return this.name() + '>>' + this.currentSelector },

	allTestSelectors: function() {
	    return this.constructor.functionNames().select(function(ea) {
	        return this.constructor.prototype.hasOwnProperty(ea) && ea.startsWith('test');
	    }, this);
	},

	toString: function($super) {
	    return $super() + "(" + this.timeToRun +")"
	},

},
'running', {

	runAll: function(statusUpdateFunc) {
		var tests = this.createTests()
		var t = Functions.timeToRun(function() {
			tests.forEach(function(test) {
				test.statusUpdateFunc = statusUpdateFunc;
				test.runTest();
			})
		})
		this.result.setTimeToRun(this.name(), t);
		
	},
	
	setUp: function() {},
	
	tearDown: function() {},
	
	runTest: function(aSelector) {
	    if (!this.shouldRun) return;
		this.currentSelector = aSelector || this.currentSelector;

		this.running();
		try {
			this.setUp();
			this[this.currentSelector]();
			this.addAndSignalSuccess();
		} catch (e) {
			this.addAndSignalFailure(e);
		} finally {
			try {
				this.tearDown();
			} catch(e) {
				this.log('Couldn\'t run tearDown for ' + this.id() + ' ' + printError(e));
			}
		}
	},
	
	debugTest: function(selector) {
		// FIXME
            lively.lang.Execution.installStackTracers();
	    this.runTest(selector);
            lively.lang.Execution.installStackTracers("uninstall");
	    return this.result.failed.last();
	},
},
'running (private)', {
	show: function(string) { this.log(string) },

	running: function() {
		this.show('Running ' + this.id());
		this.statusUpdateFunc && this.statusUpdateFunc(this, 'running');
	},

	success: function() {
		this.show(this.id()+ ' done', 'color: green;');
		this.statusUpdateFunc && this.statusUpdateFunc(this, 'success');
	},

	failure: function(error) {
		this._errorOccured = true; 
		var message = error.toString();
		var file = error.sourceURL || error.fileName;
		var line = error.line || error.lineNumber;
		message += ' (' + file + ':' + line + ')';
		message += ' in ' + this.id();
		this.show(message , 'color: red;');
		this.statusUpdateFunc && this.statusUpdateFunc(this, 'failure', message);
	},

	addAndSignalSuccess: function() {
		this.result.addSuccess(this.constructor.type, this.currentSelector);
		this.success();
	},

	addAndSignalFailure: function(e) {
		this.result.addFailure(this.constructor.type, this.currentSelector, e);
		this.failure(e);
	},
	
},
'assertion', {
    assert: function(bool, msg) {
        if (bool) return;
        msg = " assert failed " + msg ? '(' + msg + ')' : '';
		this.show(this.id() + msg);
        throw {isAssertion: true, message: msg, toString: function() { return msg }}
    },
      
	// deprecated!!!
	assertEqual: function(firstValue, secondValue, msg) { this.assertEquals(firstValue, secondValue, msg) },
	
	assertEquals: function(firstValue, secondValue, msg){
		if (firstValue instanceof Point &&
			secondValue instanceof Point &&
			firstValue.eqPt(secondValue)) return;
		if (firstValue instanceof Rectangle &&
			secondValue instanceof Rectangle &&
			firstValue.equals(secondValue)) return;
		if (firstValue instanceof Color &&
			secondValue instanceof Color &&
			firstValue.equals(secondValue)) return;

		if (firstValue == secondValue) return;

		this.assert(false, (msg ? msg : '') + ' (' + firstValue +' != ' + secondValue +')');
	},
	
	assertIdentity: function(firstValue, secondValue, msg){
		if(firstValue === secondValue) return
		this.assert(false, (msg ? msg : '') + ' (' + firstValue +' !== ' + secondValue +')');
	},

	assertEqualState: function(leftObj, rightObj, msg) {
        msg = (msg ? msg : ' ') + leftObj + " != " + rightObj + " because ";
		if (!leftObj && !rightObj) return;
		if (!leftObj || !rightObj) this.assert(false, msg);
		switch (leftObj.constructor) {
			case String:
			case Boolean:
			case Boolean:
			case Number: {
				this.assertEqual(leftObj, rightObj, msg);
				return;
			}
		};
		if (leftObj.isEqualNode) {
		    this.assert(leftObj.isEqualNode(rightObj), msg);
            return;
		};
		var cmp = function(left, right) {
			for (var value in left) {
				if (!(left[value] instanceof Function)) {
					// this.log('comparing: ' + left[value] + ' ' + right[value]);
					try {
					    this.assertEqualState(left[value], right[value], msg);
					} catch (e) {
                        // debugger;
					    throw e;
					}
				};
			};
		}.bind(this);
		cmp(leftObj, rightObj);
		cmp(rightObj, leftObj);		
	},
	
	assertMatches: function(expectedSpec, obj, msg) {
	  for (var name in expectedSpec) {
		var expected = expectedSpec[name];
		var actual = obj[name];
		if (expected === undefined || expected === null) {
		  this.assertEquals(expected, actual, name + ' was expected to be ' + expected + (msg ? ' -- ' + msg : ''));
		  continue;
		}
		if (expected.constructor === Function) continue;
		//if (!expected && !actual) return;
		switch (expected.constructor) {
		  case String:
		  case Boolean:
		  case Number: {
			this.assertEquals(expected, actual, name + ' was expected to be ' + expected + (msg ? ' -- ' + msg : ''));
			continue;
		  }
		};
		this.assertMatches(expected, actual, msg);
	  }
	},
	
    assertIncludesAll: function(arrayShouldHaveAllItems, fromThisArray, msg) {
        fromThisArray.each(function(ea, i) {
            this.assert(arrayShouldHaveAllItems.include(ea), 'difference at: ' + i + ' ' + msg)
        }, this);
    },

},
'logging', {
		log: function(aString) {
        if (this.verbose())
            console.log(aString);
	},
},
'world test support', {
	answerPromptsDuring: function(func, questionsAndAnswers) {
		// for providing sunchronous answers when world.prompt is used
		var oldPrompt = WorldMorph.prototype.prompt;
		WorldMorph.prototype.prompt = function(msg, cb, defaultInput) {
			for (var i = 0; i < questionsAndAnswers.length; i++) {
				var spec = questionsAndAnswers[i];
				if (new RegExp(spec.question).test(msg)) {
					console.log('Answering ' + msg + ' with ' + spec.answer);
					cb && cb(spec.answer);
					return
				}
			}
			if (defaultInput) {
				console.log('Answering ' + msg + ' with ' + defaultInput);
				cb && cb(defaultInput);
				return;
			}
			console.log('Could not answer ' + msg);
		}
		
		try {
			func();
		} finally {
			WorldMorph.prototype.prompt = oldPrompt;
		}
	},
},
'event test support', {
	// event simulation methods
	// FIXME this does not really belon here?

	createMouseEvent: function(type, pos) {
		// event.initMouseEvent(type, canBubble, cancelable, view, 
	    // detail, screenX, screenY, clientX, clientY, 
	    // ctrlKey, altKey, shiftKey, metaKey, 
	    // button, relatedTarget);

		var simulatedEvent = document.createEvent("MouseEvent");
		simulatedEvent.initMouseEvent(type, true, true, window, 1, 
			0, 0, //pos.x, pos.y+100,
			pos.x - Global.scrollX, pos.y - Global.scrollY,
			false, false, false, false,
			0/*left*/, null);
		return simulatedEvent;
	},

	doMouseEvent: function(type, pos, targetMorphOrNode, shouldFocus) {
		// type one of click, mousedown, mouseup, mouseover, mousemove, mouseout.
		var evt = this.createMouseEvent(type, pos);
		if (targetMorphOrNode instanceof Morph) {
			if (shouldFocus) {
				var hand = targetMorphOrNode.world().firstHand()
				hand.setMouseFocus(targetMorphOrNode);
			}
			targetMorphOrNode.world().rawNode.dispatchEvent(evt);
			return
		}
		targetMorphOrNode.dispatchEvent(evt)
	},

});

TestCase.subclass('AsyncTestCase', {

	initialize: function($super, testResult, testSelector) {
		$super(testResult, testSelector);
		this._maxWaitDelay = 1000; // ms
		this._done = false;
	},

	setMaxWaitDelay: function(ms) { this._maxWaitDelay = ms },

	show: function(string) { console.log(string) },

	done: function() {
		this._done = true;
	},

	isDone: function() { return this._done },

	delay: function(func, ms) {
		var self = this;
		console.log('Scheduled action for ' + self.currentSelector);
		(function() {
			console.log('running delayed action for ' + self.currentSelector);
			try { func.call(self) } catch(e) { self.addAndSignalFailure(e) }
		}).delay(ms / 1000)
	},

	runTest: function(aSelector) {
	    if (!this.shouldRun) return;
		this.currentSelector = aSelector || this.currentSelector;
		this.running();
		try {
			this.setUp();
			this[this.currentSelector]();
		} catch (e) { this.addAndSignalFailure(e) }
	},

	runAll: function(statusUpdateFunc) {
		var tests = this.createTests();

		tests.forEach(function(test) {
			test.statusUpdateFunc = statusUpdateFunc;
			test.scheduled();
		});

		var runAllAsync = tests.reverse().inject(
			function() { console.log('All tests of ' + this.name() + ' done'); }.bind(this),
			function(testFunc, test) { return test.runAndDoWhenDone.bind(test).curry(testFunc) }
		);

		runAllAsync();

		return tests;
	},

	runAndDoWhenDone: function(func) {
		this.runTest();
		var self = this;
		var waitMs = 100; // time for checking if test is done
		(function doWhenDone(timeWaited) {
				if (timeWaited >= self._maxWaitDelay) {
					if (!self._errorOccured) {
						var msg = 'Asynchronous test was not done after ' + timeWaited + 'ms';
						self.addAndSignalFailure({message: msg, toString: function() { return msg }});
					}
					self.done();
				}
				if (!self.isDone()) {
					doWhenDone.curry(timeWaited + waitMs).delay(waitMs / 1000);
					return;
				}
				try {
					self.tearDown();
				} catch(e) { if (!self._errorOccured) self.addAndSignalFailure(e) }
				if (!self._errorOccured) self.addAndSignalSuccess();
				func();
		})(0);
	},

	scheduled: function() { this.show('Scheduled ' + this.id()) },

	success: function($super) {
		this.isDone() ? $super() : this.running();
	},

});

TestCase.subclass('MorphTestCase', {
	
	setUp: function() {
		this.morphs = [];
		this.world = WorldMorph.current();
	},
	
	tearDown: function() {
		if (!this._errorOccured)
			this.morphs.each(function(ea) { ea.remove()})
		// let the morphs stay open otherwise
	},
	
	openMorph: function(m) {
		this.morphs.push(m);
		this.world.addMorph(m)
	},

	openMorphAt: function(m, loc) {
		this.morphs.push(m);
		this.world.addMorphAt(m, loc)
	},

});
Object.extend(TestCase, {
	isAbstract: true
});
Object.extend(AsyncTestCase, {
	isAbstract: true
});
Object.extend(MorphTestCase, {
	isAbstract: true
});


Object.subclass('TestSuite', {
	initialize: function() {
		this.result = new TestResult();
		this.testsToRun = []
		
	},
	
	setTestCases: function(testCaseClasses) {
		this.testCaseClasses = testCaseClasses
	},
	
	testCasesFromModule: function(m) {
		if (!m) throw new Error('testCasesFromModule: Module not defined!');
		var testClasses = m.classes().select(function(ea) {
			return ea.isSubclassOf(TestCase) && ea.prototype.shouldRun;
		});
		this.setTestCases(testClasses);
	},
	
	runAll: function() {
	    this.testClassesToRun = this.testCaseClasses;
	    this.runDelayed();
	},
	
	runDelayed: function() {
	    var testCaseClass = this.testClassesToRun.shift();
	    if (!testCaseClass) {
	        if (this.runFinished)
	            this.runFinished();
	        return
	    }
		var testCase = new testCaseClass(this.result)
	    if (this.showProgress)
	        this.showProgress(testCase);
        testCase.runAll();
        var scheduledRunTests = new SchedulableAction(this, "runDelayed", null, 0);
        WorldMorph.current().scheduleForLater(scheduledRunTests, 0, false);
	},	
});


Object.subclass('TestResult', {
	initialize: function() {
		this.failed = [];
		this.succeeded = [];
		this.timeToRun = {};
	},
	
	setTimeToRun: function(testCaseName, time) {
	    return this.timeToRun[testCaseName]= time
	},
	
	getTimeToRun: function(testCaseName) {
	    return this.timeToRun[testCaseName]
	},
	
	addSuccess: function(className, selector) {
		this.succeeded.push({
				classname: className,
				selector: selector});
	},
	
	addFailure: function(className, selector, error) {
		this.failed.push({
			classname: className,
			selector: selector,
			err: error,
			toString: function(){ return Strings.format('%s.%s failed: \n\t%s (%s)',
				className, selector, error.toString(), error.constructor? error.constructor.type : '' ) 
			},
		});
	},
	
	runs: function() {
		if (!this.failed) 
			return 0; 
		return this.failed.length + this.succeeded.length;
	},
	
	toString: function() {
        return "[TestResult " + this.shortResult() + "]"
	},
	
	// not used, but can be useful for just getting a string
	printResult: function() {
		var string = 'Tests run: ' + this.runs() + ' -- Tests failed: ' + this.failed.length;
		string += ' -- Failed tests: \n';
		this.failed.each(function(ea) {
			string +=  ea.classname + '.' + ea.selector + '\n   -->' 
			    + ea.err.message +  '\n';
		});
		string += ' -- TestCases timeToRuns: \n';
		var self = this;
		var sortedList = $A(Properties.all(this.timeToRun)).sort(function(a,b) {
		    return self.getTimeToRun(a) - self.getTimeToRun(b)});
		sortedList.each(function(ea){
		   string +=  this.getTimeToRun(ea)  + " " + ea+ "\n"
		}, this);
		return string
	},
	
	shortResult: function() {
		if (!this.failed)
			return;
		var time = Object.values(this.timeToRun).inject(0, function(sum, ea) {return sum + ea});
		var msg = Strings.format('Tests run: %s -- Tests failed: %s -- Time: %ss',
			this.runs(), this.failed.length, time/1000);
		return  msg;
	},
	
	getFileNameFromError: function(err) {
	    if (err.sourceURL)
            return new URL(err.sourceURL).filename()
        else
            return "";
	},
	
	failureList: function() {
		var result = this.failed.collect(function(ea) {
			return Strings.format('%s in %s %s\n\t%s',
				ea.toString(),
				this.getFileNameFromError(ea.err),
				(ea.err.line ? ' ( Line '+ ea.err.line + ')' : ""),
				(ea.err.stack ? ' ( Stack '+ ea.err.stack + ')' : ""))
			}, this);
		return result
	},
	
	successList: function() {
		return this.succeeded.collect(function(ea) { return ea.classname + '.' + ea.selector });
	}
});

if (!lively.Widgets) return // for usage in non lively environments
	
PanelMorph.subclass('TestRunnerPanel', {

	documentation: 'Just a hack for deserializing my widget',

	urlString: URL.source.getDirectory().toString(),
	
	onDeserialize: function($super) {
	//	$super();
        // FIXME
		var widget = new TestRunner();
        this.owner.targetMorph = this.owner.addMorph(widget.buildView(this.getExtent()));
        this.owner.targetMorph.setPosition(this.getPosition());
        this.remove();
    }

});

Widget.subclass('TestRunner', 
'settings', {

	viewTitle: "TestRunner",
	documentation: 'Just a simple Tool for running tests in the Lively Kernel environment',
	initialViewExtent: pt(600,500),
	formals: ['TestClasses', 'SelectedTestClass', 'ResultText', 'FailureList', 'Failure'],
	ctx: {},
},
'initialization', {
	
	initialize: function($super, optTestModule) {
		$super(null);
		var model = Record.newPlainInstance(
			(function(){
				var x={};
				this.formals.forEach(function(ea){ x[ea] = null });
				return x;
			}.bind(this))());

		this.relayToModel(model, {
			TestClasses: 'TestClasses',
			SelectedTestClass: 'SelectedTestClass',
			ResultText: 'ResultText',
			FailureList: 'FailureList',
			Failure: 'Failure',
		});
		
		this.testModule = optTestModule;
		this.refresh();
	},

	refresh: function() {
		this.getModel().setTestClasses(this.testModule ?
			this.testClassesOfModule(this.testModule) : this.allTestClasses());
	},
},
'view', {
	buildView: function(extent) {
		var panel;
		panel = new TestRunnerPanel(extent);
		panel = PanelMorph.makePanedPanel(extent, [
			['testClassList', newDragnDropListPane, new Rectangle(0, 0, 1, 0.6)],
			['runButton', function(initialBounds){return new ButtonMorph(initialBounds)}, new Rectangle(0, 0.6, 0.35, 0.05)],
			['runAllButton', function(initialBounds){return new ButtonMorph(initialBounds)}, new Rectangle(0.35, 0.6, 0.35, 0.05)],
			['refreshButton', function(initialBounds){return new ButtonMorph(initialBounds)}, new Rectangle(0.7, 0.6, 0.3, 0.05)],
			['resultBar', function(initialBounds){return new ProgressBarMorph(initialBounds)}, new Rectangle(0, 0.65, 1, 0.05)],
			['failuresList', newTextListPane, new Rectangle(0, 0.7, 1, 0.3)],
		], panel);

		var model = this.getModel();
		// necessary?
		var self = this;
		var testClassList = panel.testClassList;
		this.testClassListMorph = testClassList.innerMorph();
		this.testClassListMorph.itemPrinter = function(item) { 
		     var string = "";
		     if (self.testObject) {
		         var time = self.testObject.result.getTimeToRun(item);
		         if (time) string += "  ("+ time + "ms)";
		     }
             return  item.toString() + string ;
        };
		
		
		testClassList.connectModel(model.newRelay({List: '-TestClasses', Selection: '+SelectedTestClass'}), true);
		testClassList.innerMorph().focusHaloBorderWidth = 0;
	
		var runButton = panel.runButton;
		runButton.setLabel("Run TestCase");
		lively.bindings.connect(runButton, 'fire', this, 'runTests');
		
		var runAllButton = panel.runAllButton;
		runAllButton.setLabel("Run All TestCases");
		lively.bindings.connect(runAllButton, 'fire', this, 'runAllTests');
		
		var refreshButton = panel.refreshButton;
		refreshButton.setLabel("Refresh");
		lively.bindings.connect(refreshButton, 'fire', this, 'refresh');

		// directly using the morph for setting the color -- 
		this.resultBar = panel.resultBar;
		this.resultBar.setValue(0)
		this.resultBar.label.connectModel(model.newRelay({Text: '-ResultText'}));
		var failuresList = panel.failuresList;
		failuresList.connectModel(model.newRelay({List: '-FailureList', Selection: '+Failure'}));
		// quick hack for building stackList
		model.setFailure = model.setFailure.wrap(function(proceed, failureDescription) {
			// FIXME: put his in testResult
			proceed(failureDescription);
			if (!self.testObject) {
			    console.log('could not find my testObject :-(');
			    return;
			}
			var i = self.testObject.result.failureList().indexOf(failureDescription);
			self.openErrorStackViewer(self.testObject.result.failed[i]);
		});
		
		return panel;
	},
		
	setBarColor: function(color) {
		this.resultBar.bar.setFill(color);
	},
	
	openErrorStackViewer: function(testFailedObj) {

	    if (!testFailedObj) return;
	    
		var testCase = new (Class.forName(testFailedObj.classname))();
		var failedDebugObj = testCase.debugTest(testFailedObj.selector);

		if (!failedDebugObj.err.stack) {
			console.log("Cannot open ErrorStackViewer: no stack");
			return;
		};
		
		new ErrorStackViewer(failedDebugObj).openIn(WorldMorph.current(), pt(220, 10));
	},
},
'model related', {
	onTestClassesUpdate: Functions.Null,
	onSelectedTestClassUpdate: Functions.Null,
	onResultTextUpdate: Functions.Null,
	onFailureListUpdate: Functions.Null,
	onFailureUpdate: Functions.Null,
},
'running', {
	
	runTests: function(buttonDown) {
		if (buttonDown) return;
		this.runSelectedTestCase();
	},

	runAllTests: function(buttonDown) {
		if (buttonDown) return;
		this.runAllTestCases();
	},

	runSelectedTestCase: function() {
		var testClassName = this.getSelectedTestClass();
		if (!testClassName) return;
		var testCase = new (Class.forName(testClassName))();
		this.setBarColor(Color.darkGray);
		testCase.runAll();
		this.resultBar.label.setExtent(this.resultBar.getExtent());
		this.setResultOf(testCase);
	},
	
	runAllTestCases: function() {
		var testSuite = new TestSuite();
		var counter = 1;
		//all classes from the list
		testSuite.setTestCases(this.getTestClasses().map(function(ea) {
		    return Class.forName(ea);
		}));
		var self = this;
		var max = testSuite.testCaseClasses.length;
	 	this.setBarColor(Color.darkGray);
		testSuite.showProgress = function(testCase) {
		    self.setResultText(testCase.constructor.type);
		 	var progress = counter /  max;   
			self.resultBar.setValue(progress);
			// console.log("progress " + progress)
			self.resultBar.label.setExtent(self.resultBar.getExtent());

		    var failureList = testSuite.result.failureList();
		    if(failureList.length > 0) {
		        self.setFailureList(failureList);
		        self.setBarColor(Color.red);
		    };
		    counter += 1;
		};
		testSuite.runAll();
		testSuite.runFinished = function() {
	        self.setResultOf(testSuite);
		};		
		
	},

},
'results', {
		
	setResultOf: function(testObject) {
		this.testObject = testObject;
		this.setResultText(this.testObject.result.shortResult());
		this.setFailureList(this.testObject.result.failureList());
		this.setBarColor(this.testObject.result.failureList().length == 0 ? Color.green : Color.red);
		this.resultBar.setValue(1)
		console.log(testObject.result.printResult());
		// updating list with timings
		this.setTestClasses(this.getTestClasses(),true);
	},

},
'accessing', {
	testClassesOfModule: function(m) {
		return m.classes()
			.select(function(ea) { return ea.isSubclassOf(TestCase) && ea.prototype.shouldRun })
		    .collect(function(ea) { return ea.type })
		    .select(function(ea) { return !ea.include('Dummy') })
		    .select(function(ea) { return Config.skipGuiTests ? !ea.endsWith('GuiTest') : true })
            .sort();
	},

	allTestClasses: function() {
		return TestCase.allSubclasses()
		    .select(function(ea) { return ea.prototype.shouldRun && !ea.isAbstract })
		    .collect(function(ea) { return ea.type })
		    .select(function(ea) { return !ea.include('Dummy') })
		    .select(function(ea) { return Config.skipGuiTests ? !ea.endsWith('GuiTest') : true })
            .sort();
	},
	
});

TestRunner.openIn = function(world, loc) {
    if (!world) world = WorldMorph.current();
    if (!loc) loc = pt(120, 10);
	new TestRunner().openIn(world, loc);
};

Widget.subclass('ErrorStackViewer', {

	defaultViewTitle: "ErrorStackViewer",
	defaultViewExtent: pt(450,350),
	
	initialize: function($super, testFailedObj) {
		$super();
		var list = [];	
		if(testFailedObj && testFailedObj.err && testFailedObj.err.stack) {
		    if(! testFailedObj.err.stack.each)
		        console.log("ErrorStackViewer: don't know what to do with" +testFailedObj.err.stack )
		    else
		        testFailedObj.err.stack.each(function(currentNode, c) { list.push(c.copyMe()) });
		};
		this.formalModel = Record.newInstance(
			{StackList: {}, MethodSource: {}, ArgumentsList: {}, SelectedCaller: {}},
			{StackList: list, MethodSource: "", ArgumentsList: [], SelectedCaller: null}, {});
		return this;
	},
	
	setStackList: function(list) {
        this.formalModel.setStackList(list)
	},
	
	buildView: function(extent) {
		var panel = PanelMorph.makePanedPanel(extent, [
			['callerList', newTextListPane, new Rectangle(0, 0, 1, 0.3)],
			['argumentsList', newTextListPane, new Rectangle(0, 0.3, 0.7, 0.2)],
			['inspectButton', function(initialBounds){return new ButtonMorph(initialBounds)}, new Rectangle(0.7, 0.3, 0.3, 0.2)],
			['methodSource', newTextPane, new Rectangle(0, 0.5, 1, 0.5)]
		]);
		
		var model = this.formalModel;
		
		var callerList = panel.callerList;
		callerList.connectModel({model: this, getList: "getCallerList", setSelection: "setCaller"});
		callerList.updateView("all");
		
		var argumentsList = panel.argumentsList;
		this.argumentsList = argumentsList;
		argumentsList.connectModel({model: model, getList: "getArgumentsList"});
		
		var inspectButton = panel.inspectButton;
		this.inspectButton = inspectButton;
		inspectButton.setLabel("Inspect");
		inspectButton.connectModel({model: this, setValue: "inspectCaller"});
		
		var methodSource = panel.methodSource;
		// FIXME
		this.methodSource = methodSource;
		methodSource.connectModel({model: model, getText: "getMethodSource"});
		
		formalModel = this.formalModel;
		var self = this;
		methodSource.innerMorph().boundEval = methodSource.innerMorph().boundEval.wrap(function(proceed, str) {
			console.log("eval " + str);
			try {
				var stackNode = formalModel.getSelectedCaller();
				var argNames = self.extractArgumentString(stackNode.method.toString());
				var source = "argFunc = function("+ argNames +") {return eval(str)}; argFunc";			
				return eval(source).apply(formalModel.getSelectedCaller().itsThis, stackNode.args); // magic...
			} catch(e) {
				console.log("Error in boundEval: " + e.toString())
				return ""
			}
		}); 

		return panel;
	},
	
	getCallerList: function() {
		return this.formalModel.getStackList().collect(function(ea) {
			var argsString = '---'
			var args = $A(ea.args);
			if (args.length > 0)
				argsString = '(' + args + ')';
			if(!(ea.method && ea.method.qualifiedMethodName))	
				return "no method found for " + printObject(ea);
				
			return ea.method.qualifiedMethodName() + argsString});
	},
	
	setCaller: function(callerString) {
		if (!callerString) return;
		var i = this.getCallerList().indexOf(callerString);
		var contextNode = this.formalModel.getStackList()[i];
		if (!contextNode) {
			this.formalModel.setMethodSource('Error: Can\'t find contextNode in stack!');
			this.methodSource.updateView("getMethodSource");
			return;
		}
		this.formalModel.setSelectedCaller(contextNode);
		this.formalModel.setMethodSource(contextNode.method.inspectFull());
		this.methodSource.updateView("getMethodSource");
		
		this.formalModel.setArgumentsList(this.getArgumentValueNamePairs(contextNode));
		this.argumentsList.updateView("getArgumentsList");
	},
	
	inspectCaller: function(value) {
		if (!value) return;
		var contextNode = this.formalModel.getSelectedCaller(contextNode);
		new SimpleInspector(contextNode).openIn(WorldMorph.current(), pt(200,10))
	},
	
	getArgumentValueNamePairs: function(stackNode) {
		var args = $A(stackNode.args);
		var argNames = this.getArgumentNames(stackNode.method.toString());
		console.log('Argnames: ' + args);
		var nameValues = argNames.inject([], function(nameValuePairs, eaArgName) {
			nameValuePairs.push(eaArgName + ': ' + args.shift());
			return nameValuePairs;
		});
		nameValues = nameValues.concat(args.collect(function(ea) {
			return 'unnamed: ' + ea;
		}));
		return nameValues;
	},
	
	extractArgumentString: function(methodSource) {
		var match =  /function.*?\((.*?)\)/.exec(methodSource);
		if (!match) {
			console.log("Error in extractArgumentString: " +methodSource);
			return ""
		};
		return match[1]
	},
	
	getArgumentNames: function(methodSrc) {
		var match =  /function.*?\((.*?)\)/.exec(methodSrc);
		if (!match) return [];
		var parameterString = match[1];
		return parameterString.split(", ").reject(function(ea) { return ea == '' });
	}
});

Global.openStackViewer = function openStackViewer() {
   var stack = getStack();
   stack.shift();
   stack.shift();
   var stackList = stack.collect(function(ea){return {method: ea, args: []}});
   var viewer = new ErrorStackViewer();
   viewer.setStackList(stackList);
   var window = viewer.openIn(WorldMorph.current(), pt(220, 10));
   return window;
};

console.log("loaded TestFramework.js");

});