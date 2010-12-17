module('Tests.ContextJSFlattenTest').requires('lively.TestFramework', 'cop.Flatten').toRun(function() {

Object.subclass('Tests.ContextJSFlattenTest.Dummy', {

	m1: function() { return 23 },

	m2: function(arg) { return arg + 2 },

	m3: function(arg) { return arg + 9 },

	m4: function(arg) {
		var result = arg * 3;
		return result + 9
	},

});

Object.extend(Tests.ContextJSFlattenTest.Dummy, {
	classMethod1: function() { return 49 },
});

cop.create('FlattenTestLayer')
.refineClass(Tests.ContextJSFlattenTest.Dummy, {
	
	get x() { return 4 },

	m1: function() { return 42 },
	
	m2: function(arg) { return arg + 3 },

	m3: function(arg) {
		cop.proceed(arg);
		return arg + 10;
	},

	m4: function(arg) {
		var x = cop.proceed(arg);
		return  x + 9;
	},
})
.refineObject(Tests.ContextJSFlattenTest.Dummy, {
	classMethod1: Functions.Null
})
.refineObject(Tests.ContextJSFlattenTest, {
	get foo() { return 3 },
})

TestCase.subclass('MethodManipulatorTest', {

	setUp: function() {
		this.sut = new MethodManipulator();
		this.dummyClass = Tests.ContextJSFlattenTest.Dummy;
	},

	test01ExtractFirstParameter: function() {
		var src = 'function() { return 42 },';
		var result = this.sut.firstParameter(src);
		this.assertEqual(null, result)

		src = 'function($proceed, arg) {\n\t\t$proceed(arg);\n\t\treturn arg + 10;\n\t	},';
		result = this.sut.firstParameter(src);
		this.assertEqual('$proceed', result)
	},

	test02ExtractMethodBody: function() {
		var src = 'function() { return 42 },';
		var result = this.sut.methodBody(src);
		var expected = 'return 42'
		this.assertEquals(expected, result, 'm1');

		src = 'function($proceed, arg) {\n\t\t$proceed(arg);\n\t\treturn arg + 10;\n\t},'
		result = this.sut.methodBody(src);	
		expected = '$proceed(arg);\n\t\treturn arg + 10;';
		this.assertEquals(expected, result, 'm3');
	},

	test03RemoveFirstParameter: function() {
		var src = 'function(arg1, arg2) { this.foo(); },';
		var expected = 'function(arg2) { this.foo(); },';
		var result = this.sut.removeFirstParameter(src);
		this.assertEquals(expected, result);
	},
	
	test04InlineProceed: function() {
		var proceedName = '$p';
		var data = [
			{layer: 'function() { this.foo(); },', original: 'function(arg1, arg2) { this.bar() },'},
			{layer: 'function($p, arg1) { this.foo(); },', original: 'function(arg1) { this.bar() },', expected: 'function(arg1) { this.foo(); },'},
			{layer: 'function($p, arg1) { this.foo(); },', original: 'function(arg1) { this.bar() },', expected: 'function(arg1) { this.foo(); },'},
			{layer: 'function($p) {\n$p()\nthis.foo(); },', original: 'function() { this.bar() },', expected: 'function() {\n(function() { this.bar() }).call(this)\nthis.foo(); },'},
			{layer: 'function($p) { $p() + 1 },', original: 'function($super) { $super(23) },', expected: 'function($super) { (function() { $super(23) }).call(this) + 1 },'},
		]
		for (var i = 0; i < data.length; i++) {
			var spec = data[i];
			var layerSrc = spec.layer;
			var originalSrc = spec.original;
			var expected = spec.expected || spec.layer;
			var result = this.sut.inlineProceed(layerSrc, originalSrc, proceedName);
			this.assertEquals(expected, result);	
		}
	},

});


TestCase.subclass('FlattenTest', {

	setUp: function() {
		this.sut = FlattenTestLayer;
		this.dummyClass = Tests.ContextJSFlattenTest.Dummy;
	},

	test01aFindLayeredMethods: function() {
		var result = this.sut.namesOfLayeredMethods(this.dummyClass.prototype),
			expected = ['m1', 'm2', 'm3' ,'m4'];
	
		result = this.sut.namesOfLayeredMethods(this.dummyClass);
		expected = ['classMethod1'];
		this.assertEqualState(expected, result);
	},
	test01bFindLayeredProperties: function() {
		var result = this.sut.namesOfLayeredProperties(this.dummyClass.prototype),
			expected = ['x'];
		this.assertEqualState(expected, result);

		result = this.sut.namesOfLayeredProperties(this.dummyClass);
		expected = [];
		this.assertEqualState(expected, result);
	},

	test01cFindAllLayeredObjects: function() {
		var result = this.sut.layeredObjects(),
			expected = [this.dummyClass.prototype, this.dummyClass, Tests.ContextJSFlattenTest];
		this.assertEqualState(expected, result);
	},


	test02GenerateReplaceMethod: function() {
		var result = this.sut.generateMethodReplacement(this.dummyClass.prototype, 'm1'),
			expected = 'm1: function() { return 42 },'
		this.assertEquals(expected, result);
	},

	test03GenerateReplaceMethodWhenProceedIsThereButNotUsed: function() {
		var result = this.sut.generateMethodReplacement(this.dummyClass.prototype, 'm2'),
			expected = 'm2: function(arg) { return arg + 3 },'
		this.assertEquals(expected, result);
	},
	test04GenerateReplaceMethod: function() {
		var result = this.sut.generateMethodReplacement(this.dummyClass.prototype, 'm4'),
			expected = 'm4: function(arg) {\n\
		var x = (function(arg) {\n\
			var result = arg * 3;\n\
			return result + 9\n\
		}).call(this, arg);\n\
		return  x + 9;\n\
	},'
		this.assertEquals(expected, result);
	},

	test05GenerateReplaceProperty: function() {
		var result = this.sut.generatePropertyReplacement(this.dummyClass.prototype, 'x'),
			expected = 'get x() { return 4 },'
		this.assertEquals(expected, result);
	},
	test06FlattenLayer: function() {
		var blacklist = [{object: Tests.ContextJSFlattenTest.Dummy.prototype, name: 'm2'}],
			result = this.sut.flattened(blacklist),
			expected =
'Tests.ContextJSFlattenTest.Dummy.addMethods({\n\n\
	get x() { return 4 },\n\n\
	m1: function() { return 42 },\n\n\
	m3: function(arg) {\n\
		(function(arg) { return arg + 9 }).call(this, arg);\n\
		return arg + 10;\n\
	},\n\n\
	m4: function(arg) {\n\
		var x = (function(arg) {\n\
			var result = arg * 3;\n\
			return result + 9\n\
		}).call(this, arg);\n\
		return  x + 9;\n\
	},\n\n\
});\n\n\
Object.extend(Tests.ContextJSFlattenTest.Dummy, {\n\n\
	classMethod1: function Functions$Null() { return null; },\n\n\
});\n\n\
Object.extend(Global.Tests.ContextJSFlattenTest, {\n\n\
	get foo() { return 3 },\n\n\
});'
		this.assertEquals(expected, result);
	},

});

}); // end of module