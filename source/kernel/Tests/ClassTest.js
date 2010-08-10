module('Tests.ClassTest').requires('lively.TestFramework').toRun(function() {

TestCase.subclass('Tests.ClassTest.ClassTest', {
	
	testIsSuperclass: function() {
		TestCase.subclass('Dummy1', {});
		this.assert(Dummy1.isSubclassOf(TestCase));
		this.assert(Global["Dummy1"]);
	},
		
	testIsSuperclassDeep: function() {
		TestCase.subclass('Dummy1', {});
		Dummy1.subclass('Dummy2', {});
		this.assert(Dummy2.isSubclassOf(Dummy1));
		this.assert(Dummy2.isSubclassOf(TestCase));
	},
	
	testAllSubclasses: function() {
		TestCase.subclass('DummyClass', {}); 
		DummyClass.subclass('SubDummyClass1', {});
		this.assert(SubDummyClass1.isSubclassOf(DummyClass));
		DummyClass.subclass('SubDummyClass2', {}); 
		SubDummyClass1.subclass('SubSubDummyClass', {});
		this.assert(Class.isClass(DummyClass));	 
		this.assertEqual(DummyClass.allSubclasses().length, 3); 
		//this.assertEquals(SubDummyClass1.allSubclasses[0], SubSubDummyClass); 
	},
	
	testAllSubclassesWithNamespace: function() {
		TestCase.subclass('OtherDummyClass', {});
		namespace('lively.Dummy');
		OtherDummyClass.subclass('lively.Dummy.SubDummyClass', {});
		this.assert(lively.Dummy.SubDummyClass.isSubclassOf(OtherDummyClass), 'isSubclassOf');
		this.assertEqual(OtherDummyClass.allSubclasses().length, 1); 
	},
	
	testGetSuperClasses: function() {
	    TestCase.subclass('A', {});
		A.subclass('B', {});
		var result = A.superclasses();
		this.assertEqualState(result, [Object, TestCase, A]);
	},
	
	testSuperMethodsAreAssignedCorrectly: function() {
	    var className = 'DummyTestSuperMethods';
	    this.assert(!Global[className], 'Test already there');
		var f1 = function ($super) { 1; };
	
	    Object.subclass(className, {
            a: f1,
            b: function($super) { 2; }
        });
        var aSource = Global[className].prototype.a.toString();
        delete Global[className];
        this.assertEqual(aSource, f1.toString());
	},
	
	testSubclassingDoesNotReplaceExistingClass: function() {
		var className = 'DummyTestOverrideSubclass';
	    this.assert(!Global[className], 'Test already there');
		try {
	    
			Object.subclass(className, {
            	a: function () {return 1;},
			});
			var oldClass = Global[className];
			this.assert(oldClass, 'class is not there there');
			Object.subclass(className, {
				b: function() {return 2;},
			})
			var newClass = Global[className];
			this.assertIdentity(oldClass, newClass , 'class identity changed...');
		} finally {
			delete Global[className];
		}
	},
	
	testNewClassDefinitionOfExistingClass: function() {
		TestCase.subclass('Dummy23', { m: function() { return 1 }});
		var instance = new Dummy23();
		TestCase.subclass('Dummy23', { m: function() { return 2 }});
		this.assertEqual(instance.m(), 2);
	},
	
});

TestCase.subclass('Tests.ClassTest.NamespaceTest', {
    
    setUp: function() {
        // create namespaces
		namespace('testNamespace.one');
        namespace('testNamespace.two');
		namespace('testNamespace.three.threeOne');
        // create classes
        Object.subclass('testNamespace.Dummy');
        Object.subclass('testNamespace.one.Dummy');
        Object.subclass('testNamespace.three.threeOne.Dummy');
        // create functions
        testNamespace.dummyFunc = function() { return 1 };
        testNamespace.three.threeOne.dummyFunc = function() { return 2 };
    },
    
    tearDown: function() {
		// delete Global.testNamespace; // delete leads to errors when test is re-run?
    },
    
    testNamespaceIsNamespace: function() {
        this.assert(testNamespace, 'no namespace');
        this.assert(testNamespace instanceof lively.lang.Namespace, 'strange namespace');
        // this.assert(testNamespace.isNamespace, 'namespace doesn\' know that it is a namespace');
    },
    
    testGetAllNamespaces: function() {
        var result = testNamespace.subNamespaces(false);
        this.assertEqual(result.length, 3);
        this.assert(result.include(testNamespace.one));
        this.assert(result.include(testNamespace.two));
        this.assert(result.include(testNamespace.three));
    },
    
    testGetAllNamespacesRecursive: function() {
        var result = testNamespace.subNamespaces(true);
        this.assertEqual(result.length, 4);
        this.assert(result.include(testNamespace.three.threeOne));
    },
    
    testGetAllNamespaceClasses: function() {
		var result = testNamespace.classes(false);
        this.assertEqual(result.length, 1);
        this.assert(result.include(testNamespace.Dummy));
    },
    
    testGetAllNamespaceClassesRecursive: function() {
        var result = testNamespace.classes(true);
        this.assertEqual(result.length, 3);
        this.assert(result.include(testNamespace.Dummy));
        this.assert(result.include(testNamespace.one.Dummy));
        this.assert(result.include(testNamespace.three.threeOne.Dummy));
    },
    
    testGetAllNamespaceFunctions: function() {
        var result = testNamespace.functions(false);
        this.assertEqual(result.length, 1);
        this.assert(result.include(testNamespace.dummyFunc));
    },
    
    testGetAllNamespaceFunctionsrecursive: function() {
        var result = testNamespace.functions(true);
        this.assertEqual(result.length, 2);
        this.assert(result.include(testNamespace.dummyFunc));
        this.assert(result.include(testNamespace.three.threeOne.dummyFunc));
    },
})

TestCase.subclass('Tests.ClassTest.MethodCategoryTest', 
'running', {

	tearDown: function() {
		if (Tests.ClassTest.Dummy)
			delete Tests.ClassTest.Dummy;
	},
},
'testing', {
	testAddMethodsWorksWithCategoryString: function() {
		Object.subclass('Tests.ClassTest.Dummy');
		Tests.ClassTest.Dummy.addMethods('category1', { foo: function() { return 23 } });
		Tests.ClassTest.Dummy.addMethods('category1', { baz: 23 });
		Tests.ClassTest.Dummy.addMethods('category2', { bar: function() { return 42 } });

		var method1 = Tests.ClassTest.Dummy.prototype.foo
		var method2 = Tests.ClassTest.Dummy.prototype.bar
		var property1 = Tests.ClassTest.Dummy.prototype.baz

		this.assert(method1, 'foo not there')
		this.assert(method2, 'bar not there')
		this.assert(property1, 'baz not there')

		this.assertEquals('category1', Tests.ClassTest.Dummy.categoryNameFor('foo'));
		this.assertEquals('category1', Tests.ClassTest.Dummy.categoryNameFor('baz'));
		this.assertEquals('category2', Tests.ClassTest.Dummy.categoryNameFor('bar'));
	},
testAddMethodsWithMultipleCategories: function() {
		Object.subclass('Tests.ClassTest.Dummy');
		Tests.ClassTest.Dummy.addMethods(
			'catA', { m1: function() { return 23 } },
			'catB', { m2: function() { return 42 } });

		var m1 = Tests.ClassTest.Dummy.prototype.m1
		var m2 = Tests.ClassTest.Dummy.prototype.m2

		this.assert(m1, 'm1 not there')
		this.assert(m2, 'm2 not there')

		this.assertEquals('catA', Tests.ClassTest.Dummy.categoryNameFor('m1'));
		this.assertEquals('catB', Tests.ClassTest.Dummy.categoryNameFor('m2'));
	},


	testSubclassWorksWithCategory: function() {
		Object.subclass('Tests.ClassTest.Dummy',
			'category1', { foo: function() { return 23 } }, { baz: 23 },
			'category2', { bar: function() { return 42 } }
		);

		this.assert(Tests.ClassTest.Dummy, 'class not defined')

		var method1 = Tests.ClassTest.Dummy.prototype.foo
		var method2 = Tests.ClassTest.Dummy.prototype.bar
		var property1 = Tests.ClassTest.Dummy.prototype.baz

		this.assert(method1, 'foo not there')
		this.assert(method2, 'bar not there')
		this.assert(property1, 'baz not there')

		this.assertEquals('category1', Tests.ClassTest.Dummy.categoryNameFor('foo'));
		this.assertEquals('category1', Tests.ClassTest.Dummy.categoryNameFor('baz'));
		this.assertEquals('category2', Tests.ClassTest.Dummy.categoryNameFor('bar'));
	},

});
}) // end of module