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

Object.subclass('Sandbox', {

	initialize: function() {
		this.evalContext = this.setupContext();
	},

	setupContext: function() {
		var ctxt = {require: require, Object: Object, process: process, Script: Script};
		ctxt.Global = ctxt
		Script.runInNewContext('sys = require("sys"); require("./miniprototype"); require("./Base")', ctxt);
		return ctxt;
	},

	eval: function(src) {
		var result = Script.runInNewContext(src, this.evalContext);
		// var result = Script.runInThisContext(src);
		if (Object.isFunction(result)) result = result.toString();
		return result;
	},

	evalToJsonString: function(src) {
			var result = this.eval(src)
			return JSON.stringify({result: result});
	},

});

livelyServer.AbstractHandler.subclass('SandboxHandler', {

	port: 8084,
	
	run: function(request, response, content) {
		
		var json = JSON.parse(content.toString());
		var source = json.src;
		var id = json.id
		
		if (!source) { this.error(response, 'Cannot find field "src" in json'); return }
		if (!id) { this.error(response, 'Cannot find field "id" in json'); return }

		if (!sandboxes[id]) sandboxes[id] = new Sandbox();

		try {
			var jsonString = sandboxes[id].evalToJsonString(source)
		} catch(e) {
			this.error(response, String(e))
		}
		sys.puts('Evaluating: ' + source + ' results in ' + jsonString);

		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.end(jsonString);		
	},
	
});

new SandboxHandler().listen();
