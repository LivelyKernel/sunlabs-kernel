module('Tests.CDBTest').requires('lively.TestFramework', 'apps.CDB').toRun(function() {

TestCase.subclass('Tests.CDBTest.RepositoryTest', {

	setUp: function() {

		this.repositoryName = 'cdb_test';
		this.repository = new CDB.Repository(this.repositoryName);

		this.repository.drop();
		this.repository.create();
		this.repository.initializeDesign();
	},

	tearDown: function() {
		//this.repository.drop();
	},

	testDraftSaveInEmptyRepository: function() {

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		try {
		
			mod.save();
			this.assert(false, 'Module must not be saved successfully');

		} catch (ex) {

			this.assert(ex instanceof CDB.Exception, 'No CDB exception was thrown');
			this.assertEquals(ex.message, 'Code Object is not assigned to a repository');
		}

		var cs = this.repository.createChangeSet();
		cs.add(mod); mod.save();

		try {
		
			var rep = new CDB.Repository(this.repositoryName);
			var mod_retrieved = rep.getCodeObject(CDB.Module, 'TestModule');
			this.assert(false, 'No active version should be available');
		
		} catch (ex) {
			this.assert(ex instanceof CDB.ObjectNotFoundException, 'Unexpected exception was thrown');
		}
	},

	testSaveCommitInEmptyRepository: function() {

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		var cs = this.repository.createChangeSet();
		
		cs.add(mod);
		mod.save();
		cs.commit();

		var rep = new CDB.Repository(this.repositoryName);
		var mod_retrieved = rep.getCodeObject(CDB.Module, 'TestModule');
			
		this.assert(mod_retrieved);
			
		this.assertEquals(mod.name, mod_retrieved.name);
		this.assertEquals(mod.documentation, mod_retrieved.documentation);

		var revHistory = mod.getRevisionHistory();

		this.assert(revHistory);
		this.assert(revHistory.currentRevision);
		this.assertEquals(revHistory.currentRevision.number, 1);
	},

	testRetrieveActiveRevision: function() {

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		var cs = this.repository.createChangeSet();
		
		cs.add(mod);
		mod.save();
		cs.commit();

		cs = this.repository.createChangeSet();
		mod.documentation = 'Now the documentation has changed';

		cs.add(mod);
		mod.save();

		var rep = new CDB.Repository(this.repositoryName);
		var mod_retrieved = rep.getCodeObject(CDB.Module, 'TestModule');
			
		this.assert(mod_retrieved);
			
		this.assertEquals(mod.name, mod_retrieved.name);
		this.assertEquals(mod_retrieved.documentation, 'This is a test module');

		var revHistory = mod.getRevisionHistory();

		this.assert(revHistory);
		this.assert(revHistory.currentRevision);
		this.assertEquals(revHistory.currentRevision.number, 1);

		this.assertEquals(revHistory.revisions.length, 2);
		var draftRevision = revHistory.getRevision(2);
		this.assertEquals(draftRevision.status, 'draft');
	},

	testModuleClassMethod: function() {

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		var cls = new CDB.Klass('TestClass');
		cls.documentation = 'Here is the class summary';
		mod.addClass(cls);

		var meth = new CDB.Method('doSomething');
		meth.documentation = 'This method does something';
		meth.source = 'function(myarg) {\n\talert(myarg);\n}';
		cls.addMethod(meth);

		var cs = this.repository.createChangeSet();

		cs.add(mod);
		mod.save();

		cs.add(cls);
		cls.save();

		cs.add(meth);
		meth.save();
		
		cs.commit();

		var rep = new CDB.Repository(this.repositoryName);
		var mod_retrieved = rep.getCodeObject(CDB.Module, 'TestModule');
			
		this.assert(mod_retrieved);
			
		this.assertEquals(mod.name, mod_retrieved.name);
		this.assertEquals(mod.documentation, mod_retrieved.documentation);

		var cls_retrieved = mod_retrieved.getClass(cls.name);
		this.assert(cls_retrieved);

		this.assertEquals(cls.name, cls_retrieved.name);
		this.assertEquals(cls.documentation, cls_retrieved.documentation);

		var meth_retrieved = cls_retrieved.getMethod(meth.name);
		this.assert(meth_retrieved);

		this.assertEquals(meth.name, meth_retrieved.name);
		this.assertEquals(meth.documentation, meth_retrieved.documentation);
	},

	testListCodeObjects: function() {

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		var cls = new CDB.Klass('TestClass');
		cls.documentation = 'Here is the class summary';
		mod.addClass(cls);

		var meth = new CDB.Method('doSomething');
		meth.documentation = 'This method does something';
		meth.source = 'function(myarg) {\n\talert(myarg);\n}';
		cls.addMethod(meth);

		var cs = this.repository.createChangeSet();

		cs.add(mod);
		mod.save();

		cs.add(cls);
		cls.save();

		cs.add(meth);
		meth.save();
		
		cs.commit();

		var rep = new CDB.Repository(this.repositoryName);
		var modules = rep.listCodeObjects(CDB.Module);
			
		this.assert(modules);
		this.assertEquals(modules.length, 1);
		this.assertEquals(modules[0], mod.name); 

		var classes = rep.listCodeObjects(CDB.Klass, mod.name);

		this.assert(classes);
		this.assertEquals(classes.length, 1);
		this.assertEquals(classes[0], cls.name);
	},

	testCommitWithoutSave: function() {

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		var cs = this.repository.createChangeSet();

		try {

			cs.add(mod);
			cs.commit();
	
		} catch (ex) {
			this.assert(ex instanceof CDB.ConsistencyException);
		}

		mod.save();
		cs.commit();
	},

	testSuperclass: function() {

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		var cls = new CDB.Klass('MyClass');
		cls.superclass = 'YetAnotherClass';
		mod.addClass(cls);

		var cs = this.repository.createChangeSet();

		cs.add(mod);
		mod.save();
		cs.add(cls);
		cls.save();

		cs.commit();
	
		var rep = new CDB.Repository(this.repositoryName);
		var cls_retrieved = rep.getCodeObject(CDB.Klass, 'TestModule', 'MyClass');
			
		this.assert(cls_retrieved);
		this.assertEquals(cls_retrieved.superclass, cls.superclass); 
	},

	testModuleRequirements: function() {

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		mod.requirements.push('lively.ide');
		mod.requirements.push('apps.CouchDB');

		var cs = this.repository.createChangeSet();

		cs.add(mod);
		mod.save();

		cs.commit();
	
		var rep = new CDB.Repository(this.repositoryName);
		var mod_retrieved = rep.getCodeObject(CDB.Module, 'TestModule');
			
		this.assert(mod_retrieved);
		this.assertEquals(JSON.serialize(mod_retrieved.requirements), JSON.serialize(mod.requirements)); 
	},

	testLoadMethodWithoutClass: function() {

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		var cls = new CDB.Klass('TestClass');
		cls.documentation = 'Here is the class summary';
		mod.addClass(cls);

		var meth = new CDB.Method('doSomething');
		meth.documentation = 'This method does something';
		meth.source = 'function(myarg) {\n\talert(myarg);\n}';
		cls.addMethod(meth);

		var cs = this.repository.createChangeSet();

		cs.add(mod);
		mod.save();

		cs.add(cls);
		cls.save();

		cs.add(meth);
		meth.save();
		
		cs.commit();
	
		var rep = new CDB.Repository(this.repositoryName);
		var meth_retrieved = rep.getCodeObject(CDB.Method, 'TestModule', 'TestClass', 'doSomething');
			
		this.assert(meth_retrieved);
		this.assert(meth_retrieved.klass);

		this.assertEquals(meth_retrieved.klass.name, 'TestClass'); 
	},

	testLoadClassWithoutModule: function() {

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		var cls = new CDB.Klass('TestClass');
		cls.documentation = 'Here is the class summary';
		mod.addClass(cls);

		var cs = this.repository.createChangeSet();

		cs.add(mod);
		mod.save();

		cs.add(cls);
		cls.save();
		
		cs.commit();
	
		var rep = new CDB.Repository(this.repositoryName);
		var cls_retrieved = rep.getCodeObject(CDB.Klass, 'TestModule', 'TestClass');
			
		this.assert(cls_retrieved);
		this.assert(cls_retrieved.module);

		this.assertEquals(cls_retrieved.module.name, 'TestModule'); 
	},
	testLoadLayer: function() {

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		var layer = new CDB.Layer('TestLayer');
		layer.documentation = 'Here is the layer doc';
		mod.addLayer(layer);

		var cs = this.repository.createChangeSet();

		cs.add(mod);
		mod.save();

		cs.add(layer);
		layer.save(); // stores draft into repository
		
		cs.commit(); // publish ?
	
		var rep = new CDB.Repository(this.repositoryName);
		var cls_retrieved = rep.getCodeObject(CDB.Layer, 'TestModule', 'TestLayer');

		this.assert(cls_retrieved);
		this.assert(cls_retrieved.module);

		this.assertEquals(cls_retrieved.module.name, 'TestModule'); 
	},


	testListDraftModules: function() {

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		var cs = this.repository.createChangeSet();

		var objects = this.repository.listCodeObjects(CDB.Module, true);
		this.assertMatches([], objects);	

		cs.add(mod);
		mod.save();

		var objects = this.repository.listCodeObjects(CDB.Module, true);

		this.assert(objects);
		this.assertEquals(objects.length, 1);
		this.assertEquals(objects[0], mod.name);		

		cs.commit();
	},

	testCommitWithExistingDraft: function() {

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		var cs = this.repository.createChangeSet();

		cs.add(mod);
		mod.save();

		var objects = this.repository.listCodeObjects(CDB.Module, true);

		var rep = new CDB.Repository(this.repositoryName);
		var cs_new = rep.createChangeSet();

		var mod_new = new CDB.Module('TestModule');
		mod_new.documentation = 'Another module documentation';

		cs_new.add(mod_new);
		mod_new.save();
			
		cs_new.commit();

		var rep_new = new CDB.Repository(this.repositoryName);
		var mod_retrieved = rep_new.getCodeObject(CDB.Module, mod_new.name);

		this.assertEquals(mod_retrieved.revision.number, 2);
	},

	testGetDraftCodeObject: function() {

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		var cs = this.repository.createChangeSet();

		cs.add(mod);
		mod.save();

		var rep = new CDB.Repository(this.repositoryName);
		var mod_retrieved = rep.getCodeObject(CDB.Module, mod.name, true);

		this.assertEquals(mod_retrieved.revision.number, 1);
	},

	testModuleClassMethod2: function() {

		var cs = this.repository.createChangeSet();

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		cs.add(mod);
		mod.save();

		var cls = new CDB.Klass('TestClass');
		cls.documentation = 'Here is the class summary';
		mod.addClass(cls);

		cs.add(cls);
		cls.save();
		mod.save();

		var meth = new CDB.Method('doSomething');
		meth.documentation = 'This method does something';
		meth.source = 'function(myarg) {\n\talert(myarg);\n}';
		cls.addMethod(meth);

		cs.add(meth);
		meth.save();
		cls.save();
		mod.save();

		cs.commit();

		var rep = new CDB.Repository(this.repositoryName);
		var mod_retrieved = rep.getCodeObject(CDB.Module, 'TestModule');
			
		this.assert(mod_retrieved);
			
		this.assertEquals(mod.name, mod_retrieved.name);
		this.assertEquals(mod.documentation, mod_retrieved.documentation);

		var cls_retrieved = mod_retrieved.getClass(cls.name);
		this.assert(cls_retrieved);

		this.assertEquals(cls.name, cls_retrieved.name);
		this.assertEquals(cls.documentation, cls_retrieved.documentation);

		var meth_retrieved = cls_retrieved.getMethod(meth.name);
		this.assert(meth_retrieved);

		this.assertEquals(meth.name, meth_retrieved.name);
		this.assertEquals(meth.documentation, meth_retrieved.documentation);
	},

	testGetCodeObjectAfterDelete: function() {

		var cs = this.repository.createChangeSet();

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		cs.add(mod);
		mod.save();

		this.assertEqual('draft', mod.revision.status, 'status should be "draft"');
		cs.commit();
		this.assertEqual('active', mod.revision.status, 'status should be "active"');

		var mod_retrieved = this.repository.getCodeObject(CDB.Module, 'TestModule');

		this.assertEquals(mod, mod_retrieved);
		this.assertEquals('active', mod_retrieved.revision.status, 'status should be "active"');

		cs = this.repository.createChangeSet();
		mod.deleteFromRepository();	

		cs.add(mod);
		mod.save();

		this.assertEqual('draft', mod.revision.status, 'status should be "draft"');
		cs.commit();
		this.assertEqual('deleted', mod.revision.status, 'status should be "deleted"');

		try {
		
			this.repository.getCodeObject(CDB.Module, 'TestModule');
			this.assert(false, 'should throw an exception');

		} catch (ex) {

			if (ex.isAssertion) throw ex; // caused by this.assert in the try block
			this.assert(ex instanceof CDB.ObjectNotFoundException, 'should throw CDB.ObjectNotFoundException');
		}
	},

	testDraftPropagatedOnRetrieval: function() {

		var cs = this.repository.createChangeSet();

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		var cls = new CDB.Klass('TestClass');
		cls.documentation = 'Here is the class summary';
		mod.addClass(cls);

		cs.add(mod);
		cs.add(cls);

		cls.save();
		mod.save();

		var rep = new CDB.Repository(this.repositoryName);
		var mod_retrieved = rep.getCodeObject(CDB.Module, 'TestModule', true);

		this.assertEqual('draft', mod_retrieved.getClasses()[0].revision.status);
	},

	testCreateAfterDelete: function() {

		var cs = this.repository.createChangeSet();

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		var cls = new CDB.Klass('TestClass');
		cls.documentation = 'Here is the class summary';
		mod.addClass(cls);

		cs.add(mod);
		cs.add(cls);

		cls.save();
		mod.save();

		cs.commit();

		
		// now delete everything
		var cs = this.repository.createChangeSet();

		cs.add(mod);
		cs.add(cls);

		cls.deleteFromRepository();
		mod.deleteFromRepository();

		cls.save();
		mod.save();

		cs.commit();


		// now try to recreate it
		var cs = this.repository.createChangeSet();

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		var cls = new CDB.Klass('TestClass');
		cls.documentation = 'Here is the class summary';
		mod.addClass(cls);

		cs.add(mod);
		cs.add(cls);

		cls.save();
		mod.save();

		cs.commit();
	},

	testCreateOnDraftAfterDelete: function() {

		var cs = this.repository.createChangeSet();

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		cs.add(mod);
		mod.save();

		cs.commit();

		
		// now delete everything
		var cs = this.repository.createChangeSet();

		cs.add(mod);
		mod.deleteFromRepository();
		mod.save();

		cs.commit();


		// now try to recreate it
		var cs = this.repository.createChangeSet();

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		cs.add(mod);
		mod.save();

		// do not commit

		var rep = new CDB.Repository(this.repositoryName);
		var cs = rep.createChangeSet();

		var mod = rep.getCodeObject(CDB.Module, 'TestModule', true);

		cs.add(mod);
		cs.commit();
	},

	testCheckLazilyLoaded: function() {

		var cs = this.repository.createChangeSet();

		var mod = new CDB.Module('TestModule');
		mod.documentation = 'This is a test module';

		var cls = new CDB.Klass('TestClass');
		cls.documentation = 'Here is the class summary';
		mod.addClass(cls);

		var meth = new CDB.Method('doSomething');
		meth.documentation = 'This method does something';
		meth.source = 'function(myarg) {\n\talert(myarg);\n}';
		cls.addMethod(meth);

		cs.add(mod);
		cs.add(cls);
		cs.add(meth);

		mod.save();
		cls.save();
		meth.save();

		cs.commit();

		
		var rep = new CDB.Repository(this.repositoryName);
		var mod = rep.getCodeObject(CDB.Module, 'TestModule');

		var classes = mod.getClasses();
		this.assertEquals(classes[0].name, 'TestClass');

		var methods = classes[0].getMethods();
		this.assertEquals(methods[0].name, 'doSomething');
	}





});

}) // end of module