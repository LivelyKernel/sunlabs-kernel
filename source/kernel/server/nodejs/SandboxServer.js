var sys = require('sys');
var livelyServer = require('./livelyServer');
var Script = process.binding('evals').Script;


// experimental
// spawn = require('child_process').spawn
// runCommand = function(command, parameter, callback) {
// 	var proc = spawn(command, parameter);
// 	var stdout = '';
// 	var stderr = '';
// 	proc.stdout.addListener('data', function (data) { stdout += data });
// 	proc.stderr.addListener('data', function (data) { stderr += data });
// 	proc.addListener('exit', function (code) {
// 		// sys.puts(command + ' done, exit code: ' + code);
// 		callback && callback(code, stdout, stderr);
// 	});
// 	return proc;
// };

var sandboxes = {};

function setupSandbox() {
	var sandbox = {require: require, Object: Object, process: process, Script: Script};
	sandbox.Global = sandbox
	Script.runInNewContext('sys = require("sys"); require("./miniprototype"); require("./Base")', sandbox);
	return sandbox;
}

livelyServer.AbstractHandler.subclass('SandboxHandler', {

	port: 8084,
	
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
			
		if (!sandboxes[id]) sandboxes[id] = setupSandbox();

		sys.puts('Evaluating: ' + source);

		var jsonString;
		try {
			var result = Script.runInNewContext(source, sandboxes[id]);
			// var result = Script.runInThisContext(source);
			if (Object.isFunction(result)) result = result.toString();
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

new SandboxHandler().listen();
