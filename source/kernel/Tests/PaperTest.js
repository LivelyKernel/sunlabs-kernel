module('Tests.PaperTest').requires('apps.paper').toRun(function() {

	TestCase.subclass('Tests.PaperTest.LaTeXTest', {
		setUp: function($super) {
			$super();
			this.sut = new PaperMorph()
		},

		test01CreateSimpleLaTeXOutput: function() {
			var title = this.sut.addTextMorph('LaTeXGenerator').beTitle();
			var abstract = this.sut.addTextMorph('Some abstract...').beAbstract();
			var section1 = this.sut.addTextMorph('This is section 1').beSection();
			var para1 = this.sut.addTextMorph('This is pargraph 1.').beParagraph();
			var subsection1 = this.sut.addTextMorph('This is a subsection').beSubSection();
			var para2 = this.sut.addTextMorph('This is pargraph 2.').beParagraph();

			var result = this.sut.createLaTeXBody();
			var expected =
'\\title{LaTeXGenerator}\n\n\
\\begin{abstract}\nSome abstract...\n\\end{abstract}\n\n\
\\section{This is section 1}\n\
This is pargraph 1.\n\n\
\\subsection{This is a subsection}\n\
This is pargraph 2.\n\n\
'
			this.assertEquals(expected, result);
		},

	});

}) // end of module