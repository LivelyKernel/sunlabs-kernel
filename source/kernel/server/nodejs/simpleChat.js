var sys = require('sys');
var livelyServer = require('./livelyServer')

livelyServer.AbstractHandler.subclass('ChatHandler', {

	port: 8082,

	initialize: function($super) {
		$super()
		this.registeredResponses = [];
	},
	
	register: function(request, response, content) {
		response.writeHead(200, {'Content-Type': 'text/plain'});
		var json = JSON.parse(content.toString());
		sys.puts(json.user + ' logged in');
		response.write(JSON.stringify({user: json.user, msg: 'logged in successful'}));
		response.flush();
		this.registeredResponses.push(response);
	},
	
	broadcast: function(request, response, content) {
		response.writeHead(200, {'Content-Type': 'text/plain'});
		var json = JSON.parse(content.toString());
		sys.puts(json.user + ' broadcasts: ' + json.msg);
		this.registeredResponses.forEach(function(resp) {
			resp.write(JSON.stringify({user: json.user, msg: json.msg}));
			resp.flush();
		})
		response.end('OK')
	},
});
// 
new ChatHandler().listen();