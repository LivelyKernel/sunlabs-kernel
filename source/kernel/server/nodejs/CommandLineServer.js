var sys = require('sys');
var livelyServer = require('./livelyServer');
var exec  = require('child_process').exec;

require('./miniprototype')
require('./Base')

livelyServer.AbstractHandler.subclass('CommandLineServer',
'initializing', {
	port: 8086,
},
'private', {
	runInShell: function(command, options, callback) {
		var setOutput = function(err, stdout, stderr) {
			var result = {
				errorCode: err,
				stdout: stdout,
				stderr: stderr,
			};
			callback && callback(result)
		}
		return exec(command, options, setOutput);
	},
},
'interface', {
	runCommand: function(request, response, content) {

		var json = JSON.parse(content.toString()),
			path = json.path || '.',
			command = json.command;
		
		if (!command) {
			this.error(response, 'json.command must be defined');
			return;
		}

		return this.runInShell(command, {cwd: path}, function(result) {
			response.writeHead(200, {'Content-Type': 'text/plain'});
			response.end(JSON.stringify(result));
		})

	},
});

try { new CommandLineServer().listen() } catch(e) { console.log('CommandLineServer cannot listen because\n' + e) }