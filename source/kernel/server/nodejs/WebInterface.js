module('server.nodejs.WebInterface').requires('lively.TestFramework').toRun(function() {

Object.subclass('NodeJSSandboxServer',

'initializing', {

	connections: ['result'],

	initialize: function(serverURL, id) {
		this.serverURL = serverURL || new URL('http://lively-kernel.org/nodejs/SandboxServer/run')
		this.id = id || URL.source.toString() + ':' + lively.data.Wrapper.prototype.newId();
	},

	reset: function() {
		// this.result = null;
		// this.serverError = null;
	},

	connectionURI: function() {
		return this.serverURL.toString() + '?id=' + this.id
	},

	toString: function() {
		return this.constructor.name + '(' +  this.connectionURI() + ')'
	},
},

'server communication', {
	evalOnServer: function(src, beSync) {
		this.reset();
		var objectForSending = {src: src, id: this.id};

		var webR = this.getWebResource(beSync);
		lively.bindings.connect(webR, 'content', this, 'processResult', {
			updater: function($proceed, response) { $proceed(this.sourceObj.status, response) }});
		var jsonString = JSON.stringify(objectForSending)
		webR.post(jsonString);

		return this;
	},

	evalOnServerAndWait: function(src) {
		this.evalOnServer(src, true);
		return this.result;
	},

},

'private', {

	getWebResource: function(beSync) {
		var webR = new WebResource(this.serverURL)
		if (beSync) webR.beSync()
		else webR.beAsync()
		return webR
	},

	processResult: function(status, resultString) {
		if (!status) return; // FIXME processResult is called in post when content is reseted... argh
		if (!status.isSuccess()) {
			this.serverError = true;
			this.result = 'Server evaluation error: ' + resultString;
			return
		}
		var json = JSON.parse(resultString);
		this.result = json.result;
	},

},

'serialization', {
	toLiteral: function() {
		return {
				serverURL: this.serverURL,
				id: this.id
		}
	},
});


Object.extend(NodeJSSandboxServer, {
	fromLiteral: function(literal) {
		return new NodeJSSandboxServer(literal.serverURL, literal.id)
	},
});


TextMorph.subclass('ServerSandBoxWorkspace', {

	style: {borderWidth: 0},

	initialize: function($super, rect, textString, useChangeClue, optId) {
		$super(rect, textString, useChangeClue);
		this.sandboxServer = new NodeJSSandboxServer(null, optId);
		this.isSync = true;
	},

	// initializeTransientState: function($super) {
		// $super()
		// this.sandboxServer = new NodeJSSandboxServer();
	// },

	boundEval: function(str) {
	 this.sandboxServer.evalOnServer(str, false && this.isSync);
	},
   
	tryBoundEval: function (str, offset, printIt) { // FIXME
		var result;

		this.waitMorph = new BoxMorph(this.bounds());
		this.waitMorph.applyStyle({fill: Color.black, fillOpacity: 0.3});
		this.addMorph(this.waitMorph);

		try {
				connect(this.sandboxServer, 'result', this, printIt ? 'gotServerResultAndPrintIt' : 'gotServerResult', {removeAfterUpdate: true})
				this.boundEval(str);			
		} catch (e) {
			this.showError(e, offset)
		}	
		return '';
	},
 
	gotServerResult: function(result) {
		console.log('Got result')
		this.waitMorph.remove();
	},

	gotServerResultAndPrintIt: function(result) {
		this.gotServerResult(result)

		this.setNullSelectionAt(this.selectionRange[1] + 1);
		var prevSelection = this.selectionRange[0];
		var replacement = " " + result
		this.replaceSelectionWith(replacement);
		this.setSelectionRange(prevSelection, prevSelection + replacement.length);
	},

	replaceTextMorph: function(textmorph) { // FIXME
		if (textmorph.constructor != TextMorph)
			throw new Error('replaceTextMorph needs a text morph')
		this.setExtent(textmorph.getExtent());
		this.setPosition(textmorph.getPosition());
		var clip = textmorph.owner;
		textmorph.remove()
		clip.addMorph(this);
	},

	open: function(id) {
	// new ServerSandBoxWorkspace().open('workspace 1')
		if (id) this.sandboxServer.id = id;
		var panel = WorldMorph.current().addTextWindow({title: 'ServerSandBox id: ' + this.sandboxServer.id, content: ''});
		this.replaceTextMorph(panel.innerMorph());
	},
morphMenu: function($super, evt) {
		var menu = $super(evt), self = this;
		if (!menu) return null
		menu.addItem([this.isSync ? "be async" : "be sync",
			function() { self.isSync = !self.isSync }])
		return menu
	},

    
});

Object.subclass('CommandLineServerInterface',
'intializing', {
	connections: ['result'],
	initialize: function() {
		this.serverURL = new URL('http://lively-kernel.org/nodejs/CommandLineServer/')
		this.isSync = false;
	},
},
'interface', {

	beSync: function() { this.isSync = true; return this },

	runCommand: function(command, optPath) {
		console.log('Running on server:\n' + command);
		var webR = new WebResource(this.serverURL.withFilename('runCommand'));
		connect(webR, 'content', this, 'result', {converter:
			function(input) { try { return JSON.parse(input) } catch(e) { return '' } }});
		if (this.isSync) { webR.beSync() } else { webR.beAsync() };
		webR.post(JSON.stringify({command: command, path: optPath}));
		return this
	},

});

Object.subclass('NodeJSMasterServer',

	// Usage:
	// master= new NodeJSMasterServer();
	// master.allRunningServer()
	// master.ensureServerNamedIsRunning('SandboxServer')
	// master.stopServer('SandboxServer')
	// master.updateAndRestart('SandboxServer')

'settings', {
	masterServerURLString: function() { return 'http://www.lively-kernel.org/nodejs/MasterServer/' },
	servers: [
		// {serverName: 'simpleChat', path: '.....'},
		{serverName: 'SandboxServer', path: '/home/robert/SandboxServer/', shouldRestart: true},
		{serverName: 'LaTeXServer', path: '/home/robert/LaTeXServer/', shouldRestart: true},
		{serverName: 'CommandLineServer', path: '/home/robert/nodejsServers/', shouldRestart: true},
	],

	getServerSpec: function(serverName) {
		var result = this.servers.detect(function(ea) { return ea.serverName == serverName });
		if (!result)
			WorldMorph.current().alert('Cannot find server spec for ' + serverName)
		return result
	},

},

'interface', {
	ensureAllServersAreRunning: function() {
		this.servers.forEach(function(spec) { this.ensureRunning(spec) }, this)
	},

	ensureServerNamedIsRunning: function(serverName) {
		var spec = this.getServerSpec(serverName);
		if (spec) return this.ensureRunning(spec);
	},
	allRunningServer: function() {
		return this.createWebResource('runningServers').get().content
	},
	stopServer: function(serverName) {
		return this.createWebResource('stop').post(JSON.stringify({serverName: serverName})).content
	},
	updateAndRestart: function(serverName) {
		var spec = this.getServerSpec(serverName);
		if (!spec) return;
		return this.createWebResource('updateCodeAndRestart').post(JSON.stringify(spec)).content
	},

},
'private', {
	ensureRunning: function(spec) {
		var webR = this.createWebResource('ensureRunning')
		webR.post(JSON.stringify(spec))
		return webR.content
	},
	createWebResource: function(action) {
		return new WebResource(this.masterServerURLString() + action).beSync()
	},

});

Object.subclass('ServerCreator',
'initializing', {
	initialize: function() {
		this.serverSourceURL = URL.codeBase.withFilename('server/nodejs/');
		this.confFileURL = this.serverSourceURL.withFilename('nodejs.conf')
	},
},
'creation', {
	createServer: function(name, port) {
		this.modifyServerConf(name, port);
		this.createServerTemplateFor(name, port);
	},

	createServerTemplateFor: function(serverName, port) {
		var src = this.createServerTemplateString(serverName, port);
		this.createFileFor(serverName, src);
	},

	createServerTemplateString: function(serverName, port) {
		return Strings.format("\
var sys = require('sys');\n\
var livelyServer = require('./livelyServer');\n\
\n\
require('./miniprototype')\n\
require('./Base')\n\
\n\
livelyServer.AbstractHandler.subclass('%s',\n\
'initializing', {\n\
	port: %s,\n\
});\n\
\n\
new %s().listen();", serverName, port, serverName);
	},


	modifyServerConfString: function(serverName, port, existingConf) {
		var lines = existingConf.split('\n');

		var newProxySetting = Strings.format('ProxyPass /nodejs/%s http://localhost:%s', serverName, port);
		var proxySettingEnd = lines.indexOf('# ProxySettings end')
		if (proxySettingEnd < 0)
			throw new Error('Cannot find proxy setting end in nodejs conf file ' + existingConf);
		lines.splice(proxySettingEnd, 0, newProxySetting);

		return lines.join('\n')
	},

	modifyServerConf: function(serverName, port) {
		var webR = new WebResource(this.confFileURL).beSync();
		var existingSrc = webR.get().content
		var newSrc = this.modifyServerConfString(serverName, port, existingSrc);
		webR.put(newSrc)
	},

	createFileFor: function(servername, content) {
		var url = this.serverSourceURL.withFilename(servername + '.js');
		new WebResource(url).put(content)
	},
});

Object.extend(ServerCreator, {
	create: function(serverName, port) {
		// this creates new source code and server settings for a nodejs server
		// ServerCreator.create('CommandLineServer', 8086)
		new ServerCreator().createServer(serverName, port);
	},
});

// --------------------------
// FIXME move tests to somewhere else
// ------------------------
TestCase.subclass('NodeJSSandboxServerTest',

'running', {

	setUp: function() {
		this.sut = new NodeJSSandboxServer();
	},

	
},

'testing', {

	test01EvalOnServer: function() {
		var src = '1 + 2';
		var result = this.sut.evalOnServerAndWait(src);
		this.assertEquals(3, result, this.sut.serverError);
	},

	test02ServerRemembersState: function() {
		var result = this.sut.evalOnServerAndWait('foo = {x: 42}');
		this.assertEquals(42, result.x, this.sut.serverError);
		var result = this.sut.evalOnServerAndWait('foo.x');
		this.assertEquals(42, result, this.sut.serverError);
	},

	test03ShowError: function() {
		var result = this.sut.evalOnServerAndWait('throw new Error()');
		this.assert(result, 'at least something should be shown');
	},


});

TestCase.subclass('ServerCreatorTest',
'running', {
	setUp: function($super) {
		$super();
		this.sut = new ServerCreator();
	},
assertLinesInclude: function(lineExpects, actualString) {
	var lines = actualString.split('\n');
	var expected = lineExpects.shift();
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		if (line.include(expected)) expected = lineExpects.shift()
		if (lineExpects.length == 0) return;
	}
	this.assert(false, actualString + ' does not include lines matching: ' + expected)
},

},
'testing', {
	test01CreateServerJSTemplate: function() {
		var serverName = 'FooServer', port = 1234;
		var result = this.sut.createServerTemplateString(serverName, port);
		var lineExpects = [
			'livelyServer =',
			'livelyServer.AbstractHandler.subclass(\'' + serverName,
			'port: ' + port,
			'new ' + serverName + '().listen()'];
		this.assertLinesInclude(lineExpects, result);
	},
test02AppendServerSettingsToNodejsConf: function() {
	var existingConf = '# ProxySettings start\n\
ProxyPass /nodejs/simpleChat http://localhost:8082\n\
ProxyPass /nodejs/LaTeXServer http://localhost:8083\n\
ProxyPass /nodejs/SandboxServer http://localhost:8084\n\
ProxyPass /nodejs/MasterServer http://localhost:8085\n\
# ProxySettings end\n\
\n\
# Auth start\n\
<Location /nodejs/LaTeXServer>\n\
        AuthType Basic\n\
        AuthName "LaTeX generator"\n\
        AuthUserFile /etc/environments/webserver/users\n\
        AuthGroupFile /etc/environments/webserver/groups\n\
        Order Deny,Allow\n\
        Allow from All\n\
\n\
        <Limit GET POST PUT DELETE MKDIR MOVE COPY>\n\
                Require valid-user\n\
        </Limit>\n\
</Location>\n\
# Auth end'

		var serverName = 'FooServer', port = 1234;
		var result = this.sut.modifyServerConfString(serverName, port, existingConf);
		var lineExpects = [
			'ProxyPass /nodejs/' + serverName + ' http://localhost:' + port,
			'# ProxySettings end'];
		this.assertLinesInclude(lineExpects, result);
	},

});

}) // end of module