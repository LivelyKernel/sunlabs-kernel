/* An adhoc testFramework. It defines a TestCase class which should be subclassed for
creating own tests. TestResult and TestSuite are used internally for running the Tests.
TestRunner is a Widget which creates a standard xUnit TestRunner window. All tests of 
the system can be run from it */

function log(aString) {
	console.log(aString)
}

function logln(aString) {
	log(aString)
}

//Error.subclass("AssertionFaild", {});
//AssertionFaild = new Error();

Object.subclass('TestCase', {
   
	initialize: function(testResult) {
		if (testResult) {
			this.result = testResult;	 
		} else {
			this.result = new TestResult();	   
		}
	},
	
	runAll: function() {
		var self = this;
		this.allTestSelectors().each(function(ea) {
			self.runTest(ea)
		});
	},
	
	setUp: function() {},
	
	tearDown: function() {},
	
	runTest: function(aSelector) {
		log('Running test: ' + aSelector);
		try {
			this.setUp();
			this[aSelector]();
			this.result.addSuccess(this.constructor.type, aSelector);
			logln(' ++ succeeded ++');
		}
		catch (e) {
		    //if(!e.isAssertion)
			//    throw e;
			this.result.addFailure(this.constructor.type, aSelector, e);
			logln(' -- failed -- ' + '(' + e.message + ')');
		}
		finally {
			this.tearDown();
		}
	},

	assert: function(bool, msg) {
		if(!bool)  {
			throw {isAssertion: true, message: " assert failed " + "(" + msg +")"}
		}
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
					console.log('comparing: ' + left[value] + ' ' + right[value]);
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
	}
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
			ea.runAll();
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
		return this.failed.collect(function(ea) {
			return ea.classname + '.' + ea.selector + '-->' + ea.err.message;
		});
	}
});

/**
 * @class TestRunner
 * Just a simple Tool for running tests in the LivelyKernel environment
 */
Widget.subclass('TestRunner', {

	defaultViewTitle: "TestRunner",
	defaultViewExtent: pt(600,500),
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
		model.setResultText(testObject.result.shortResult());
		model.setFailureList(testObject.result.failureList());
		this.setBarColor(testObject.result.failureList().length == 0 ? Color.green : Color.red);
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
		});
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
		failuresList.connectModel({model: model, getList: "getFailureList"});
		
		return panel;
		},
		
		setBarColor: function(color) {
				this.resultBar.innerMorph().setFill(color);
	}
	
});

function openTestRunner() {
	new TestRunner().openIn(WorldMorph.current(), pt(120, 10));
};

console.log("loaded TestFramework.js");
