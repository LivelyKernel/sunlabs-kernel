var sys = require('sys');
var http = require('http');
var livelyServer = require('./livelyServer');
var PDFCreator = require('./PDFCreator').PDFCreator;

livelyServer.AbstractHandler.subclass('LaTeXHandler', {

	port: 8083,
	
	initialize: function() {
		this.logFile = 'LaTeXServer.log';
		this.pdfCreator = new PDFCreator();
	},
	
	createPdf: function(request, response, content) {
		var self = this;
		
		var errorHandler = function (err) {
			try {
				self.cleanup();
			} finally {
				sys.puts('Caught exception: ' + err + '\n' + err.stack);
				self.error(response, 'Cannot process request because: ' + err + '\n' + err.stack );
				process.removeListener('uncaughtException', errorHandler);
			}
		}
		process.addListener('uncaughtException', errorHandler);
		
		var json = JSON.parse(content.toString());
		var dir = json.directoryURL;
		var texFile = json.texFile;
		var resultURL = json.resultURL;
		// sys.puts('Server got ' + JSON.stringify(json));

		this.pdfCreator.downloadAndCompile(dir, texFile, resultURL, function() {
			response.writeHead(200, {'Content-Type': 'text/plain'});
			response.end(resultURL);
		});

		// streaming directly doesn't work...? Encoding!?	
		// var content = pdfCreator.fileHandler.readFile('test.pdf')
		// sys.puts('sending ' + content.length + ' bytes');
		// response.writeHead(200, {
		// 	'Content-Type': 'application/pdf',
		// 	'Content-transfer-encoding': 'binary',
		// 	'Content-Disposition': 'attachment; filename="downloaded.pdf"',
		// 	'Content-Length': content.length.toString(),
		// 	'Expires': '0',
		// });
		// response.write(content, 'binary');
		// response.end()
	},

	LaTeXServerLogEnd: function(request, response) {
		var noOfLinesToShow = 1000;
		var fn = this.logFile;
		this.pdfCreator.fileHandler.lastNLines(fn, noOfLinesToShow, function(result) {
			// sys.puts('done' + result)
			result = 'Last ' + noOfLinesToShow + ' lines of ' + fn + ':\n' + result;
			response.writeHead(200, {'Content-Type': 'text/plain', 'Content-Length': result.length});
			response.end(result);
		});
		
		var result ='test'
		// response.writeHead(200, {'Content-Type': 'text/plain', 'Content-Length': result.length});
		// response.end(result);

		// var noOfLinesToShow = 200;
		// var result = this.pdfCreator.fileHandler.lastNLines(this.logFile, noOfLinesToShow, function(result) {
		// 	result = 'last ' + noOfLinesToShow + ' of ' + this.logFile + ':\n';
		// 	response.writeHead(200, {'Content-Type': 'text/plain', 'Content-Length': result.length});
		// 	response.end('test');
		// });
		// var lines = log.split('\r\n')
		// result = lines.slice(-noOfLinesToShow).join('\n'); // last lines

	},
	
	cleanup: function() {
		this.pdfCreator.cleanup();
	},
	
});

new LaTeXHandler().listen();