/*
 * Some minor benchmarking extensions for the TestFrameWork separated with layers
 *
 */


module('lively.TestRunnerExtensions').requires('lively.Helper', 'cop.Layers', 'lively.TestFramework').toRun(function() {
	
createLayer("TimeTestRunLayer");

layerClass(TimeTestRunLayer, TestCase, {
	runTest: function(proceed) {
		var profileName = "runTest " + this.currentSelector 
		console.profile(profileName);
		var start = (new Date()).getTime();	
		proceed();
		var time = (new Date()).getTime() - start;
		console.profileEnd(profileName);
		TimeTestRunLayer.setTimeOfTestRun(this.constructor.name, this.currentSelector, time)
	}
})

layerClass(TimeTestRunLayer, TestRunner, {
	setResultOf: function(proceed, testObject) {
		proceed(testObject);
		console.log( "\nTime TestRuns:\n" + TimeTestRunLayer.getSortedTimeOfTestRuns());
		TimeTestRunLayer.timeOfTestRuns = {} // clear the run...
	}
})

createLayer("DeployTimeTestRunLayer");
enableLayer(DeployTimeTestRunLayer);

// TimeTestRunLayer should only be active, when the controll flow goes throuh runTests...
// DeployTimeTestRunLayer is used to separate the concern, but not to specify additional dynamic behavior

layerClass(DeployTimeTestRunLayer, TestRunner, {
	runTests: function(proceed, buttonDown) {
		withLayers([TimeTestRunLayer], function() {
			proceed(buttonDown)
		})
	}
})

// Private Helper Functions
TimeTestRunLayer.setTimeOfTestRun = function(className, selector, time) {
	if (!this.timeOfTestRuns)
		this.timeOfTestRuns = {};
		
	if(!this.timeOfTestRuns[className])
		this.timeOfTestRuns[className]={};
	
	this.timeOfTestRuns[className][selector] = time;
};

TimeTestRunLayer.getSortedTimeOfTestRuns = function() {
	if(!this.timeOfTestRuns)
		return;
	
	var result = []
	Object.keys(this.timeOfTestRuns).each(function(eaClass) {
		Object.keys(this.timeOfTestRuns[eaClass]).each(function(eaSelector) {
			result.push([this.timeOfTestRuns[eaClass][eaSelector], eaClass, eaSelector])
		}, this)
	}, this);
	
	result = result.sort(function(a, b) {return a[0] - b[0]});
	var string = "";
	result.each(function(ea) {
		string = string + ea[0] + "\t" + ea[1] + ">>" + ea[2] + "\n"
	})
	return string 
}





});