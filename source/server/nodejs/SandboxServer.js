var sys = require('sys');
var http = require('http');
var livelyServer = require('./livelyServer');
var Script = process.binding('evals').Script;

var port = 8084;

var sandboxes = {};

livelyServer.AbstractHandler.subclass('SandboxHandler', {
	
	initialize: function() {
	},
	
	run: function(request, response, content) {
		
		var json = JSON.parse(content.toString());
		var source = json.src;
		var id = json.id
		
		if (!source) {
			this.error(response, 'Cannot find field "src" in json');
			return
		}
		
		if (!id) {
			this.error(response, 'Cannot find field "id" in json');
			return
		}
			
		if (!sandboxes[id]) {
			sandboxes[id] = {require: require, Object: {}};
			sandboxes[id].Global = sandboxes[id]
			Script.runInNewContext('sys = require(sys); require("./miniprototype"); require("./Base")', sandboxes[id]);
		}
			
		

		sys.puts('Evaluating: ' + source);

		var jsonString;
		try {
			var result = Script.runInNewContext(source, sandboxes[id], 'myfile.js');
			jsonString = JSON.stringify({result: result});
		} catch(e) {
			this.error(response, String(e))
		}

		sys.puts('...results in ' + jsonString);
				
		// sys.puts(sys.inspect(sandbox));

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
		response.end(jsonString);
		
	},
	
});

var handler = new SandboxHandler();
handler.listenOn(port);
