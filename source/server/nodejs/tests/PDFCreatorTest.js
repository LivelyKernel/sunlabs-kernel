var async_testing = require('./async_testing');
var PDFCreator = require('../PDFCreator').PDFCreator;

var suites = {};

suites.DownloaderTest = new async_testing.TestSuite()
.setup(function() {
	this.sut = new PDFCreator().downloader;
})
.addTests({
	computeURLDepth: function(assert) {
		var url = 'http://www.lively-kernel.org/repository/webwerkstatt/issues/media/'
		assert.equal(4, this.sut.urlDepth(url));
		url = 'http://www.lively-kernel.org/repository/webwerkstatt/issues/media'
		assert.equal(4, this.sut.urlDepth(url));
		url = 'http://www.lively-kernel.org/'
		assert.equal(0, this.sut.urlDepth(url));
	},
});


async_testing.runSuites(suites);


// var pdfCreator = new PDFCreator();
// var path = pdfCreator.fileHandler.createNewDir();
// pdfCreator.downloader.downloadContents('http://www.lively-kernel.org/repository/webwerkstatt/ProjectSeminar2010/TR/', path);

// pdfCreator.typesetter.compile('/Users/robertkrahn/SWA/LivelyKernel/nodeJs/0_PDFCreator', 'HTML5/JaegerKrahn_2010_WDE_HTML5.tex');


// var c = pdfCreator.fileHandler.readFile('/Users/robertkrahn/SWA/LivelyKernel/nodeJs/0_PDFCreator/TeX/Pape_2010_WDE_TeXParagraphLayout.pdf')
// 
// pdfCreator.fileHandler.writeFile('/Users/robertkrahn/SWA/LivelyKernel/nodeJs/0_PDFCreator/TeX/Pape_2010_WDE_TeXParagraphLayout2.pdf', c.substring(0,100))