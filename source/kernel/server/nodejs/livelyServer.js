var sys = require('sys');
var http = require('http');

require('./miniprototype')
require('./Base')


Object.subclass('AbstractHandler', {

	actionFromURLString: function(url) {
		return /^\/(.*)/.exec(url)[1];
	},
	
	listenOn: function(port) {
		var handlerClass = this.constructor;
		var server = this;
		
		http.createServer(function (request, response) {
			var handler = new handlerClass();
			var action = server.actionFromURLString(request.url);
			sys.puts('requesting ' + action);
			
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
	
	cleanup: function() {},
});

exports.AbstractHandler = AbstractHandler;
