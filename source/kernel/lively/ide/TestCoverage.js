module('lively.ide.TestCoverage').requires('cop.Layers', 'lively.Widgets', 'lively.TestFramework').toRun(function() {

cop.create('TestCoverageLayer');

Object.subclass('TestCoverage', {
	
	ignoreMethods: ['constructor'],

	layerClassForCoverage: function(classObject) {
		var self = this;	
		Functions.own(classObject.prototype).forEach(function(ea) {
			self.layerMethodForCoverage(classObject, ea);
		})
	},

	layerMethodForCoverage: function(classObject, methodName) {
		var partialClass = {};
		partialClass[methodName] = function() {
			// alert("cover " + classObject.name + " " + methodName )

			var originalFunction = classObject.prototype[methodName].getOriginal();

			// Here we would need parametrized layer activation
			var currentTest = TestCoverage.currentTest;
			if (currentTest) {
				var coveredTests = TestCoverage.getCoveredMethods(originalFunction);
				if (!coveredTests.include(currentTest))
					coveredTests.push(currentTest)
				return cop.proceed.apply(this, arguments)	
			}
		
		}
		TestCoverageLayer.refineClass(classObject, partialClass)

	},
})

Object.extend(TestCoverage, {

	getCoveredMethods: function(functionObj) {
		var originalFunction = functionObj.getOriginal();
		if (originalFunction.coveredTests == undefined)
			originalFunction.coveredTests = [];
		return originalFunction.coveredTests
	}
});

cop.create('TestCoverageRunLayer').refineClass(TestCase, {
	runTest: function(selector) {
		TestCoverage.currentTest = this.constructor.name + "." + selector
		withLayers([TestCoverageLayer], function() {
			cop.proceed(selector);
		})
		TestCoverage.currentTest = undefined
	},
});







}) // end of module