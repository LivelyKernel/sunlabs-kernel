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
	    log(this.setUpWasRun);
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

console.log('loaded TestFrameworkTests.js');