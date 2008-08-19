

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
		
	}
});
