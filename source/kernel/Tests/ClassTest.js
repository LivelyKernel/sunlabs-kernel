

TestCase.subclass('ClassTest', {
	
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
	}
});

TestCase.subclass('NamespaceTest', {
    
    setUp: function() {
        // create namespaces
        namespace('testNamespace.one');
        namespace('testNamespace.two');
        namespace('testNamespace.three.threeOne');        
        //create classes
        Object.subclass('testNamespace.Dummy');
        Object.subclass('testNamespace.one.Dummy');
        Object.subclass('testNamespace.three.threeOne.Dummy');
    },
    
    tearDown: function() {
        // delete testNamespace;
    },
    
    testNamespaceIsNamespace: function() {
        this.assert(testNamespace, 'no namespace');
        this.assert(testNamespace instanceof lively.lang.Namespace, 'strange namespace');
        this.assert(testNamespace.isNamespace, 'namespace doesn\' know that it is a namespace');
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
        result = testNamespace.classes(false);
        this.assertEqual(result.length, 1);
        this.assert(result.include(testNamespace.Dummy));
    },
    
    testGetAllNamespaceClassesRecursive: function() {
        result = testNamespace.classes(true);
        this.assertEqual(result.length, 3);
        this.assert(result.include(testNamespace.Dummy));
        this.assert(result.include(testNamespace.one.Dummy));
        this.assert(result.include(testNamespace.three.threeOne.Dummy));
    }
})