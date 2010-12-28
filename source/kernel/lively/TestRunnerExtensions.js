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

/*
 * Some minor benchmarking extensions for the TestFrameWork separated with layers
 *
 */
module('lively.TestRunnerExtensions').requires('lively.Helper', 'cop.Layers', 'lively.TestFramework').toRun(function() {
	
cop.create("TimeEachTestLayer")
.refineClass(TestCase, {
	runTest: function(selector) {
		var start = (new Date()).getTime();	
		cop.proceed(selector);
		var time = (new Date()).getTime() - start;
		this.result.setTimeOfTestRun(this.currentSelector, time)
	},
})
.refineClass(TestResult, {

	setTimeOfTestRun: function(selector, time) {
		if (!this.timeOfTestRuns)
			this.timeOfTestRuns = {};
		this.timeOfTestRuns[selector] = time;
	},

	getSortedTimesOfTestRuns: function() {
		var times = this.timeOfTestRuns
		if(!times) return;	
		var sortedTimes = Object.keys(times).collect(function(eaSelector) {
			return [times[eaSelector], eaSelector]
		}).sort(function(a, b) {return a[0] - b[0]});
		return sortedTimes.collect(function(ea) {return ea.join("\t")}).join("\n")
	}
})
.refineClass(TestRunner, {
	setResultOf: function(testObject) {
		cop.proceed(testObject);
		var msg = "TestRun: " + testObject.constructor.type + "\n" +
			testObject.result.getSortedTimesOfTestRuns();
		WorldMorph.current().setStatusMessage(msg, Color.blue, 10);
	},
})

cop.create("TimeTestLayer")
.beGlobal()
.refineClass(TestRunner, {	
	layersForTestRun: function() {
		var layers = [TimeEachTestLayer];
		if (Config.profileTestRuns)
			layers.push(ProfileEachTestLayer)
		return layers
	},

	runSelectedTestCase: function() {
		cop.withLayers(this.layersForTestRun(), function() {
			cop.proceed()
		})
	}
});

cop.create("ProfileEachTestLayer")
.refineClass(TestCase, {
	runTest: function(selector) {
		var profileName = "profile "  + this.currentSelector 
		console.profile(profileName);
		cop.proceed(selector);
		console.profileEnd(profileName);
	},
});
Config.profileTestRuns = true;

cop.create("DebugTestCaseLayer")
.beGlobal()
.refineClass(TestCase, {
	assert: function(bool, msg) {
		if (!bool)
			debugger
		cop.proceed(bool, msg)
	}
});

});