module('Tests.MiniPrototypeTest').requires('lively.TestFramework').toRun(function() {

/**
 * @class ObjectTest
 * Tests for extending the MiniPrototype
 */
TestCase.subclass('Tests.MiniPrototypeTest.ObjectTest', {

    testExtendSetsDisplayName: function() {
		var obj = {};
		Object.extend(obj, {foo: function() {return "bar"}})
		this.assertEqual(obj.foo.displayName, "foo")
    },

    testExtendDoesNotOverrideExistingName: function() {
		var obj = {};
		Object.extend(obj, {foo: function myFoo() {return "bar"}})
		this.assertEqual(obj.foo.name, "myFoo", "name changed")
		this.assert(!obj.foo.displayName, "displayName is set")
    },

    testExtendDoesNotOverrideExistingDisplayName: function() {
		var obj = {};
		var f = function() {return "bar"};
		f.displayName = "myDisplayFoo"
		Object.extend(obj, {foo: f})
		this.assertEqual(obj.foo.name, "", "function has a name")
		this.assertEqual(obj.foo.displayName, "myDisplayFoo", "displayName was overridden")
    },

})



console.log('loaded MiniPrototypeTest.js');

}) // end of module