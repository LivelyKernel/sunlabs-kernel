var sys = require('sys'),
	exec  = require('child_process').exec,
 	livelyServer = require('./livelyServer');

require('./miniprototype')
require('./Base')


// webR = new WebResource('http://localhost:8085/ensureRunning')
// path = '/Users/robertkrahn/SWA/LivelyKernel/lively-kernel.org/svn/source/kernel/server/nodejs'
// webR.post(JSON.stringify({serverName: 'simpleChat', path: path, shouldRestart: true}))
// webR.content
// 
// webR2 = new WebResource('http://localhost:8082/broadcast')
// webR2.post(JSON.stringify({user: 'foo', msg: 'test'}))
// webR2.content
// 
// webR3 = new WebResource('http://localhost:8085/updateCodeAndRestart')
// path = '/Users/robertkrahn/SWA/LivelyKernel/lively-kernel.org/svn/source/kernel/server/nodejs'
// webR3.post(JSON.stringify({serverName: 'simpleChat', path: path, shouldRestart: true}))
// webR3.content
// 
// webR4 = new WebResource('http://localhost:8085/stop')
// webR4.post(JSON.stringify({serverName: 'simpleChat'}))
// webR4.content


// This handler allows to control/start/stop other nodejs servers
livelyServer.AbstractHandler.subclass('MasterServerHandler',
'initializing', {
	port: 8085,
		
	initialize: function($super) {
		$super()
		this.serverProcesses = {}
	},
},
'interface', {

	stopAllEnd: function(request, response) {
		for (var name in this.serverProcesses)
			this.stopServer(name);
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.end('stopped all');
	},
	
	stop: function(request, response, content) {
		var json = JSON.parse(content.toString()),
			serverName = json.serverName;
		if (!serverName) {
			this.error(response, 'serverName missing');
			return;
		}
		
		this.stopServer(serverName);
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.end('stopped ' + serverName);
	},

	ensureRunning: function(request, response, content) {
		var json = JSON.parse(content.toString()),
			path = json.path,
			serverName = json.serverName;
		
		if (!path || !serverName) {
			this.error(response, 'path || serverName missing');
			return;
		}
		
		if (this.isRunning(serverName) && !json.shouldRestart) {
			response.writeHead(200, {'Content-Type': 'text/plain'});
			response.end(serverName + ' is running');
			return		
		}
		
		if (json.shouldRestart) this.stopServer(serverName);

		try {
			var process = this.startServer(serverName, path, json.shouldRestart);
		} catch(e) {
			this.error(response, 'Unsuccessfully tried to start ' + serverName + ': ' + e)
			return;
		}

		this.serverProcesses[serverName] = process;
		
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.end('started ' + serverName);
	},
	
	updateCodeAndRestart: function(request, response, content) {
		var json = JSON.parse(content.toString()),
			path = json.path,
			serverName = json.serverName;
		
		if (!path || !serverName) {
			this.error(response, 'path || serverName missing');
			return;
		}

		this.stopServer(serverName);
		this.svnUp(path, function() { this.ensureRunning(request, response, content) }.bind(this));
	},
	
},
'private', {
	
	getProcess: function(serverName) { this.serverProcesses[serverName] },
	
	isRunning: function(serverName) {
		var process = this.getProcess(serverName);
		return process && process.pid > 0
	},
	
	stopServer: function(serverName) {
		sys.puts('Stopping ' + serverName);
		var process = this.getProcess(serverName);
		process && process.kill();	
	},
	
	startServer: function(serverName, path, shouldRestartWhenClosed) {
		sys.puts('Starting ' + serverName)
		var self = this;
		return exec('node ' + serverName + '.js', {cwd: path},
			function (error, stdout, stderr) {
				sys.puts(serverName + ' stopped');
			    sys.print('stdout: ' + stdout);
			    sys.print('stderr: ' + stderr);
			    if (error !== null) console.log('exec error: ' + error);
			
				if (shouldRestartWhenClosed)
					self.startServer(serverName, path, shouldRestartWhenClosed);
			});
	},
	
	svnUp: function(path, thenDo) {
		sys.puts('svn up path');
		return exec('svn up', {cwd: path},
			function (error, stdout, stderr) {
			    sys.print('stdout: ' + stdout);
			    sys.print('stderr: ' + stderr);
			    if (error !== null) console.log('exec error: ' + error);
			
				thenDo && thenDo()
			});
	},
});

new MasterServerHandler().listen();