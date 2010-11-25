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