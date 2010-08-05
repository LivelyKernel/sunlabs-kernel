module('Tests.JournalTest').requires('apps.Journal').toRun(function() {

	TestCase.subclass('Tests.JournalTest.FigureMorphTest', {
		
		testCreateFromFilePath: function() {			
			figure = FigureMorph.createFromFilePath(URL.codeBase.withFilename('Tests/testRessources/sampleImage_336x224.jpg').toString())
			// figure.openInWorld()
		}
	});

}) // end of module