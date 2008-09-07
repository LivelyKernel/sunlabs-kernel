/* An adhoc testFramework. It defines a TestCase class which should be subclassed for
creating own tests. TestResult and TestSuite are used internally for running the Tests.
TestRunner is a Widget which creates a standard xUnit TestRunner window. All tests of 
the system can be run from it */

Object.subclass('TestCase', {
   
	initialize: function(testResult) {
		if (testResult) {
			this.result = testResult;	 
		} else {
			this.result = new TestResult();	   
		};
	},
	
	verbose: function() {
	    return true;
	},
	
	log: function(aString) {
    	if(this.verbose())
    	    console.log(aString);
	},
	
	runAll: function() {
		this.allTestSelectors().each(function(ea) {
			this.runTest(ea)
		}, this);
	},
	
	setUp: function() {},
	
	tearDown: function() {},
	
	runTest: function(aSelector) {
		this.log('Running test: ' + aSelector);
		try {
			this.setUp();
			this[aSelector]();
			this.result.addSuccess(this.constructor.type, aSelector);
			this.log(' ++ succeeded ++');
		} catch (e) {
			this.result.addFailure(this.constructor.type, aSelector, e);
			this.log(' -- failed -- ' + '(' + e.message + ')');
			//if (!e.isAssertion) throw e;
		} finally {
			this.tearDown();
		}
	},
	
	debugTest: function(selector) {
		// FIXME
		Function.installStackTracers();
		this.runTest(selector);
		Function.installStackTracers("uninstall");
		return this.result.failed.last();
	},

	assert: function(bool, msg) {
		if (bool) return;
		throw {isAssertion: true, message: " assert failed " + "(" + msg + ")"}
	},

	assertEqual: function(firstValue, secondValue, msg){
		if(!(firstValue == secondValue))  {
			/* Better call assert() and assemble error message
			in AssertionError */
			throw {isAssertion: true, message: (msg ? msg	 : "") + " (" + firstValue +" != " + secondValue +") "};
		}
	},
	
	assertEqualState: function(leftObj, rightObj, msg) {
		var self = this;
		msg = (msg ? msg : ' ')  + leftObj + " != " + rightObj + " because ";
		if (!leftObj && !rightObj) return;
		if (!leftObj || !rightObj) self.assert(false, msg);
		switch (leftObj.constructor) {
			case String:
			case Boolean:
			case Number: {
				self.assertEqual(leftObj, rightObj, msg);
				return;
			}
		};
		var cmp = function(left, right) {
			for (var value in left) {
				if (!(left[value] instanceof Function)) {
					self.log('comparing: ' + left[value] + ' ' + right[value]);
					self.assertEqualState(left[value], right[value], msg);
				};
			};
		};
		cmp(leftObj, rightObj);
		cmp(rightObj, leftObj);		
	},

	allTestSelectors: function() {
		/* How to get the properties of this as an Enumerable?
		toArray() does not work. If we would have the properties
		as an Enumarable we could call select() on it */
		var selectors = [];
		for (var property in this) {
			if (typeof this[property] == 'function' &&
			property.startsWith('test')) {
				selectors.push(property);
			}
		}
		return selectors;
	},
	
	toString: function($super) {
	    return $super() + "(" + this.timeToRun +")"
	},
	
});

Object.subclass('TestSuite', {
	initialize: function() {
		this.result = new TestResult();
	},
	
	setTestCases: function(testCaseClasses) {
		var self = this;
		this.testCases = testCaseClasses.collect(function(ea) {
			return new ea(self.result);
		});
	},
	
	runAll: function() {
		this.testCases.each(function(ea) {
		    var startTime = (new Date()).getTime();
			ea.runAll();
			ea.timeToRun = (new Date()).getTime() - startTime;
		});
	}
});


Object.subclass('TestResult', {
	initialize: function() {
		this.failed = [];
		this.succeeded = [];
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
				err: error});
	},
	
	runs: function() {
			return this.failed.length + this.succeeded.length;
	},
	
	// not used, but can be useful for just getting a string
	toString: function() {
		var string = 'Tests run: ' + this.runs() + ' -- Tests failed: ' + this.failed.length;
		string += ' -- Failed tests: ';
		return this.failed.inject(string, function(memo, ea) {
			return memo + ea.classname + '.' + ea.selector + '-->' + ea.err.message + ' --- ';
		});
	},
	
	shortResult: function() {
		return 'Tests run: ' + this.runs() + ' -- Tests failed: ' + this.failed.length;
	},
	
	failureList: function() {
		var result = this.failed.collect(function(ea) {
			return ea.classname + '.' + ea.selector + '-->' + ea.err.message;
		});
		return result
	}
});

/**
 * @class TestRunner
 * Just a simple Tool for running tests in the LivelyKernel environment
 */
Widget.subclass('TestRunner', {

	viewTitle: "TestRunner",
	initialViewExtent: pt(600,500),
	pins: ['+TestClasses', 'SelectedTestClass', 'ResultText', 'FailureList'],
	ctx: {},
	
	initialize: function($super) {
		$super(null);
		var model = new SyntheticModel(this.pins);
		this.connectModel(model.makePlugSpecFromPins(this.pins));
		
		//Why does this not work here but in buildView?
		//model.setTestClasses(this.listTestClasses());

		return this;
	},
	
	runTests: function(value) {
		if (!value) return;
		var testClass = this.getModel().getSelectedTestClass();
		if (!testClass) return;
		var testCase = new Global[testClass]();
		testCase.runAll();
		this.setResultOf(testCase);
	},
	
	runAllTests: function(value) {
		if (!value) return;
		var testSuite = new TestSuite();
		//all classes from the list
		testSuite.setTestCases(this.getModel().getTestClasses().collect(function(ea) {
				return Global[ea];
		}));
		testSuite.runAll();
		this.setResultOf(testSuite);
	},
		
	setResultOf: function(testObject) {
		var model = this.getModel();
		this.testObject = testObject;
		model.setResultText(this.testObject.result.shortResult());
		model.setFailureList(this.testObject.result.failureList());
		this.setBarColor(this.testObject.result.failureList().length == 0 ? Color.green : Color.red);
	},
	
	listTestClasses: function() {
		return TestCase.allSubclasses().collect(function(ea) {
			return ea.type;
		}).select(function(ea) {return !ea.startsWith('Dummy')
		}).select(function(ea) {
		    if(Config.skipGuiTests)
		        return !ea.endsWith('GuiTest')
		    else
	            return true;
		}).sort();
	},
	
	buildView: function(extent) {
		var panel = PanelMorph.makePanedPanel(extent, [
		   ['testClassList', newTextListPane, new Rectangle(0, 0, 1, 0.6)],
		   ['runButton', function(initialBounds){return new ButtonMorph(initialBounds)}, new Rectangle(0, 0.6, 0.5, 0.05)],
		   ['runAllButton', function(initialBounds){return new ButtonMorph(initialBounds)}, new Rectangle(0.5, 0.6, 0.5, 0.05)],
		   ['resultBar', newTextPane, new Rectangle(0, 0.65, 1, 0.05)],
		   ['failuresList', newTextListPane, new Rectangle(0, 0.7, 1, 0.3)],
		   
		]);

		var model = this.getModel();
		// necessary?
		var self = this;
		
		var testClassList = panel.testClassList;
		testClassList.connectModel({model: model, getList: "getTestClasses", setSelection: "setSelectedTestClass"});
		this.setModelValue("setTestClasses", this.listTestClasses());
		//model.setTestClasses(this.listTestClasses());
		testClassList.innerMorph().focusHaloBorderWidth = 0;

		var runButton = panel.runButton;
		runButton.setLabel("Run Tests");
		runButton.connectModel({model: self, setValue: "runTests"});
		
		var runAllButton = panel.runAllButton;
		runAllButton.setLabel("Run All Tests");
		runAllButton.connectModel({model: self, setValue: "runAllTests"});
		
		// directly using the morph for setting the color -- 
		this.resultBar = panel.resultBar;
		this.resultBar.connectModel({model: model, getText: "getResultText"});

		var failuresList = panel.failuresList;
		failuresList.connectModel({model: model, getList: "getFailureList", setSelection: "setFailure"});
		// quick hack for building stackList
		model.setFailure = (function(failureDescription) {
			// FIXME: put his in testResult
			var i = this.testObject.result.failureList().indexOf(failureDescription);
			this.openErrorStackViewer(this.testObject.result.failed[i]);
		}).bind(this);
		
		return panel;
		},
		
		setBarColor: function(color) {
				this.resultBar.innerMorph().setFill(color);
	},
	
	openErrorStackViewer: function(testFailedObj) {
		var testCase = new Global[testFailedObj.classname]();
		var failedDebugObj = testCase.debugTest(testFailedObj.selector);
		
		if (!failedDebugObj.err.stack) {
			console.log("Cannot open ErrorStackViewer: no stack");
			return;
		};
		
		new ErrorStackViewer(failedDebugObj).openIn(WorldMorph.current(), pt(220, 10));
	}
	
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
		if (!testFailedObj) return;
		var list = [];		
		testFailedObj.err.stack.each(function(currentNode, c) { list.push(c) });
		this.formalModel = Record.newInstance(
			{StackList: {}, MethodSource: {}, ArgumentsList: {}, SelectedCaller: {}},
			{StackList: list, MethodSource: "", ArgumentsList: [], SelectedCaller: null}, {});
		return this;
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
			return ea.method.qualifiedMethodName() + argsString});
	},
	
	setCaller: function(callerString) {
		var i = this.getCallerList().indexOf(callerString);
		var contextNode = this.formalModel.getStackList()[i];
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


// For convenience
SimpleInspector.inspectObj = function(object) {
    new SimpleInspector(object).openIn(WorldMorph.current(), pt(200,10))
};

console.log("loaded TestFramework.js");