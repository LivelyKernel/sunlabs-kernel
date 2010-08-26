var sys = require('sys');
var http = require('http');
var livelyServer = require('./livelyServer');

var port = 8084;

livelyServer.AbstractHandler.subclass('SandboxHandler', {
	
	initialize: function() {
	},
	
	run: function(request, response, content) {
		// var self = this;
		// 
		// var errorHandler = function (err) {
		// 	try {
		// 		self.cleanup();
		// 	} finally {
		// 		sys.puts('Caught exception: ' + err + '\n' + err.stack);
		// 		self.error(response, 'Cannot process request because: ' + err + '\n' + err.stack );
		// 		process.removeListener('uncaughtException', errorHandler);
		// 	}
		// }
		// process.addListener('uncaughtException', errorHandler);
		// 
		// var json = JSON.parse(content.toString());
		// var dir = json.directoryURL;
		// var texFile = json.texFile;
		// var resultURL = json.resultURL;
		// // sys.puts('Server got ' + JSON.stringify(json));
		// 
		// this.pdfCreator.downloadAndCompile(dir, texFile, resultURL, function() {
		// 	response.writeHead(200, {'Content-Type': 'text/plain'});
		// 	response.end(resultURL);
		// });

		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.end('foo');
		
	},
	
});

var handler = new SandboxHandler();
handler.listenOn(port);