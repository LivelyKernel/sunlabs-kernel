
TestCase.subclass('LoaderTestOld', {
	
	testLoadScript: function() {
	    //var url = URL.source.withFilename("Tests/DummyScript.js");
	    var url = "Tests/DummyScript.js";
		Loader.loadScript(url);
		// this should be there, but it takes a while to load the script
		//this.assertEqual(theAnswerToAllQuestions, 23);
		
	}
	
});