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
// 
// webR5 = new WebResource('http://localhost:8085/runningServers')
// webR5.get()
// webR5.content

// This handler allows to control/start/stop other nodejs servers
var serverProcesses = {};

livelyServer.AbstractHandler.subclass('MasterServerHandler',
'initializing', {
	port: 8085,
		
	initialize: function($super) {
		$super()
		this.serverProcesses = serverProcesses;
	},
},
'interface', {

	runningServersEnd: function(request, response) {
		var result = []
		for (var name in this.serverProcesses)
			result.push({serverName: name, pid: this.getProcess(name).pid, isRunning: this.isRunning(name)});
			
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.end(JSON.stringify(result));
	},
	
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
		
		this.stopServer(serverName);
		
		setTimeout(function() {
			try {
				this.startServer(serverName, path, json.shouldRestart);
			} catch(e) {
				this.error(response, 'Unsuccessfully tried to start ' + serverName + ': ' + e)
				return;
			}
			response.writeHead(200, {'Content-Type': 'text/plain'});
			response.end('started ' + serverName);
		}.bind(this), 500/*ms*/); // wait for kill

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
	
	getProcess: function(serverName) { return this.serverProcesses[serverName] },
	
	isRunning: function(serverName) {
		sys.puts('checking if ' + serverName + ' is running')
		var process = this.getProcess(serverName);
		return process && process.pid > 0
	},
	
	stopServer: function(serverName) {
		sys.puts('Stopping ' + serverName);
		var process = this.getProcess(serverName);
		process && process.kill(9);
		delete this.serverProcesses[serverName];
	},
	
	startServer: function(serverName, path, shouldRestartWhenClosed, timeLastStarted) {
		if (this.isRunning(serverName)) throw new Error(serverName + ' still running');
		var self = this;
		var process = exec('node ' + serverName + '.js', {cwd: path},
			function (error, stdout, stderr) {
				sys.puts(serverName + ' stopped');
			    sys.print('stdout: ' + stdout);
			    sys.print('stderr: ' + stderr);
			    if (error !== null) console.log('exec error: ' + error);
			
			
				if (shouldRestartWhenClosed) {
					if (timeLastStarted) { // ensure no looping
						var startedBeforeMS = new Date() - timeLastStarted;
						if (startedBeforeMS < 300) return // ms
					}
					self.startServer(serverName, path, shouldRestartWhenClosed, new Date());
				}
			});
		sys.puts('Starting ' + serverName + ' pid: ' + process.pid)
		this.serverProcesses[serverName] = process
		return process;
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