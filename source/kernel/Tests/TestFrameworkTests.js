/* These tests are used for testing the test framework itself 
TestCase, TestResult, and TestSuite are tested */

TestCase.subclass('DummyTestCase', {
    testGreen1: function() {this.assert(true);},
	testGreen2: function() {},
	testRed: function() { this.assert(false, 'dummyMessage'); }
});

TestCase.subclass('DummyTestCase1', { testGreenTest1: function() { this.assert(true); } });
TestCase.subclass('DummyTestCase2', { testGreenTest2: function() { this.assert(true); } });
TestCase.subclass('DummyTestCase3', { testRedTest1: function() { this.assert(false); } });

/**
 * @class TestTestCase
 * Tests the TestCase class
 */
TestCase.subclass('TestTestCase', {
	setUp: function() {
		this.setUpWasRun = true;
	},
	
	testWasRun: function() {
		this.wasRun = true;
	},
	
	testAssertFails: function() {
        try {
            this.assert(false, 'This should fail');
        } catch(e) {
            return;
        };
        // Not really tests the assert...
        this.assert(false);
	},
	
	testRunSetUp: function() {
	    this.log(this.setUpWasRun);
	    this.assert(this.setUpWasRun, 'setUp method was not invoked');
	},
	
	testAssertFailsNot: function() {
		this.assert(true, 'This should not fail');
    },

    testAssertEqualFails: function() { 
        try {
            this.assertEqual(3,4, 'This should fail');
	    } catch(e) {
	        return;
	    };
	    this.assert(false);
	},

    testAssertEqualFailsNot: function() {
		this.assertEqual(3,3, 'This should not fail');
	},
	
	testAssertEqualState: function() {
		this.assertEqualState({a: 123, b: 'xyz'}, {a: 123, b: 'xyz'});
	},
	
	testAssertEqualStateFails: function() {
		try {
			this.assertEqualState([], [{a: 123, b: 'xyz'}]);
		} catch(e) {
			if (e.isAssertion) return;
		};
		this.assert(false, 'State of objects are not equal!');
	},
	
	testTearDown: function() {
        var counter = 0;
        // Use a existing DummyClass...!
        TestCase.subclass('DummyTearDownTestCase', {
            test1: function() {},
            test2: function() {},
            tearDown: function() {counter += 1},
        });
        new DummyTearDownTestCase().runAll();
        this.assertEqual(counter, 2);
	},
	testDonCatchErrors: function() {
        TestCase.subclass('DummyTestCatchError', {
            test1: function() {throw Error},
        });
        try {
            new DummyTestCatchError().runAll();
            this.assert(false, "should not get here");
        } catch (e) {
            this.assert(true, "should get here")
        };
	}	
	
});

/**
 * @class TestResultTest
 */
TestCase.subclass('TestResultTest', {
	setUp: function() {
        this.dummyTestCase = new DummyTestCase();
	},

    testDummyIsThere: function() {
        this.assert(this.dummyTestCase);
    },
    
    testResultForOneSucceedingTest: function() {
        var greenTestSel = 'testGreen1';
        this.dummyTestCase.runTest(greenTestSel);
        var result = this.dummyTestCase.result;
        this.assertEqual(result.runs(), 1);
        this.assertEqual(result.succeeded.first().selector, greenTestSel);
        this.assertEqual(result.succeeded.first().classname, 'DummyTestCase');
    },
    
    testResultForTwoSucceedingTest: function() {
        this.dummyTestCase.runTest('testGreen1');
        this.dummyTestCase.runTest('testGreen2');;
        this.assertEqual(this.dummyTestCase.result.runs(), 2);
    },
    
    testResultForFailingTest: function() {
        var redTestSel = 'testRed';
        this.dummyTestCase.runTest(redTestSel);
        var result = this.dummyTestCase.result;
        this.assertEqual(this.dummyTestCase.result.runs(), 1);
        this.assertEqual(result.failed.first().selector, redTestSel);
        this.assertEqual(result.failed.first().classname, 'DummyTestCase');
    },
    
    testStringRepresentation: function() {
        this.dummyTestCase.runAll();
        var result = this.dummyTestCase.result;
        this.assertEqual(result.shortResult(), 'Tests run: 3 -- Tests failed: 1');
        this.assertEqual(result.failureList().length, 1);
    }
});

/**
 * @class TestSuiteTest
 */
TestCase.subclass('TestSuiteTest', {
	testRunAll: function() {
	    ts = new TestSuite();
	    ts.setTestCases([DummyTestCase1, DummyTestCase2, DummyTestCase3]);
	    ts.runAll();
	    this.assertEqual(ts.result.runs(), 3, 'result');
	}
});

TestCase.subclass('RememberStackTest', {
	
	a: function(a, b, c) {
		this.assert(false);
	},
	
	b: function(parameter) {
		throw new Error();
	},
	
	dummyTest: function() {
		console.log("dummy: " + getCurrentContext());
		this.a(1, 2, 3);
	},
	
	myFailure: function() {
		this.a(1, 2, 3, ['a', 'b', 'c']);
	},
	
	// testFailure: function() {
	// 	this.a(1, 2, 3, ['a', 'b', 'c']);
	// },
	
	myError: function() {
		this.b(1);
	},
	
	// testOpenStackViewer: function() {
	// 	Config.debugExtras = true;
	// 	var result = this.debugTest("testError");
	// 	new StackViewer(this, result.err.stack).openIn(WorldMorph.current(), pt(1,1));
	// 	Config.debugExtras = false;
	// },
	
	testReturnCurrentContextWhenFail: function() {
		var testCase = new this.constructor();
		var originalSource = testCase.a.toString();
		//root = Function.trace(this.dummyTest());
		var error = testCase.debugTest("dummyTest");
		
		this.assert(error.err.stack, "Failed to capture currentContext into assertion.stack");
		this.assertEqual(error.err.stack.caller.method.qualifiedMethodName(), "RememberStackTest.a");
		
		this.assert(testCase.a.toString() == originalSource, "Functions are not unwrapped");
	},
	
	testGetArgumentNames: function() {
		var errorStackViewer = new ErrorStackViewer();
		var result = errorStackViewer.getArgumentNames(this.a.toString());
		this.assertEqual(result.length, 3);
		this.assertEqual(result[0], 'a');
		this.assertEqual(result[1], 'b');
		this.assertEqual(result[2], 'c');
	},
	
	testGetArgumentNames2: function() {
		var errorStackViewer = new ErrorStackViewer();
		var result = errorStackViewer.getArgumentNames(this.myError.toString());
		this.assertEqual(result.length, 0);
	},
	
	testGetArgumentValueNamePairs: function() {
		var testCase = new this.constructor();
		var testResult = testCase.debugTest("myError");
		
		var errorStackViewer = new ErrorStackViewer();
		var result = errorStackViewer.getArgumentValueNamePairs(testResult.err.stack);
		this.assertEqual(result.length, 1);
		this.assertEqual(result[0], 'parameter: 1');
	},
	
	testGetArgumentValueNamePairsForMethodWithUnnamedParameters: function() {
		var testCase = new this.constructor();
		var testResult = testCase.debugTest("myFailure");
		
		var errorStackViewer = new ErrorStackViewer();
		// testResult.err.stack is the assertion, so use caller
		var result = errorStackViewer.getArgumentValueNamePairs(testResult.err.stack.caller);
		console.log('Result: ' + result);
		this.assertEqual(result.length, 4);
		this.assertEqual(result[0], 'a: 1');
	},
	
	testGetArgumentValueNamePairsForMethodWithUnnamedParameters: function() {
		var testCase = new this.constructor();
		var testResult = testCase.debugTest("myError");
		
		var errorStackViewer = new ErrorStackViewer();
		// testResult.err.stack is the assertion, so use caller
		var result = errorStackViewer.getArgumentValueNamePairs(testResult.err.stack.caller);
			console.log('Result: ' + result);
		this.assertEqual(result.length, 0);
	}
});

console.log('loaded TestFrameworkTests.js');