var sys = require('sys');
var livelyServer = require('./livelyServer');
var exec  = require('child_process').exec;

require('./miniprototype')
require('./Base')

livelyServer.AbstractHandler.subclass('CommandLineServer',
'initializing', {
	port: 8086,
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

		var callback = function(err, stdout, stderr) {
			var result = {
				errorCode: err,
				stdout: stdout,
				stderr: stderr,
			};
			response.writeHead(200, {'Content-Type': 'text/plain'});
			response.end(JSON.stringify(result));
		}

		return exec(command, {cwd: path}, callback);

	},
});

new CommandLineServer().listen();