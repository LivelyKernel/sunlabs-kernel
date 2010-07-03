var sys = require('sys');
var http = require('http');

require('./miniprototype')
require('./Base')


Object.subclass('AbstractHandler', {

	actionFromURLString: function(url) {
		return /^\/(.*)/.exec(url)[1];
	},
	
	listenOn: function(port) {
		var handler = this;
		
		http.createServer(function (request, response) {
			var action = handler.actionFromURLString(request.url);
			sys.puts(action);
			
			var errorHandler = function (err) {
				sys.puts('Caught exception: ' + err + '\n' + err.stack);
				handler.error(response, 'Cannot process request because: ' + err + '\n' + err.stack );
			}
			process.addListener('uncaughtException', errorHandler);
			
			if (handler[action]) {
				request.addListener('data', function (content) {
					handler[action](request, response, content);
				});
			}
			
			if (handler[action + 'End']) {
				request.addListener('end', function () {
					handler[action + 'End'](request, response);
				});
			}
		}).listen(port);
		sys.puts(this.constructor.type + ' running at http://127.0.0.1:' + port + '/');
	},
	
	error: function(response, msg) {
		response.writeHead(500, {'Content-Type': 'text/plain', 'Content-Length': msg.length});
		response.end(msg);
	},
	
});

exports.AbstractHandler = AbstractHandler;