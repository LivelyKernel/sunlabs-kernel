(function setupConsole() {

    var platformConsole = window.console ||
		(window.parent && window.parent.console) ||
		{};

	var required = ['log', 'group', 'groupEnd', 'warn', 'assert'];
	for (var i = 0; i < required.length; i++)
		if (!platformConsole[required[i]])
			platformConsole[required[i]] = function() {}

	window.console = platformConsole;

	if (platformConsole.firebug) return; // Firebug doesn't like to be overwritten

	function addWrappers() {
		if (platformConsole.wasWrapped) return;
		platformConsole.wasWrapped = true;
		for (var name in platformConsole)
			(function(name) {
				var func = platformConsole[name];
				platformConsole['$' + name] = func;
				if (typeof func !== 'function') return;
				platformConsole[name] = function(/*arguments*/) {
					func.apply(platformConsole, arguments);
					for (var i = 0; i < consumers.length; i++) {
						var consumerFunc = consumers[i][name];
						if (consumerFunc) consumerFunc.apply(consumers[i], arguments);
					}
				};
			})(name);
	}

	function removeWrappers() {
		platformConsole.wasWrapped = false;
		for (var name in platformConsole) {
			if (name[0] !== '$') continue;
			platformConsole[name.substring(1, name.length)] = platformConsole[name];
			delete platformConsole[name];
		}
	}

	var consumers = platformConsole.consumers = [];
	platformConsole.addConsumer = function(c) {
		addWrappers();
		consumers.push(c);
	};
	platformConsole.removeConsumer = function(c) {
		var idx = consumers.indexOf(c);
		if (idx >= 0) consumers.splice(idx, 1);
		if (consumers.length == 0) removeWrappers();
	};

})();

var JSLoader = {

	SVGNamespace: 'http:\/\/www.w3.org/2000/svg',
	XLINKNamespace: 'http:\/\/www.w3.org/1999/xlink',
	LIVELYNamespace: 'http:\/\/www.experimentalstuff.com/Lively',

	loadJs: function(url, onLoadCb) {
		if (this.scriptInDOM(url)) {
			console.log('script ' + url + ' already loaded');
			return
		};
		console.log('loading script ' + url);
		
		var parentNode = this.findParentScriptNode();

		var exactUrl = url;
		if (true || Config.disableScriptCaching)
			exactUrl = (exactUrl.indexOf('?') == -1) ?
				exactUrl + '?' + new Date().getTime() :
				exactUrl + '&' + new Date().getTime();

		var xmlNamespace = parentNode.namespaceURI;

		var script = document.createElementNS(xmlNamespace, 'script');
		script.setAttributeNS(null, 'id', url);
		script.setAttributeNS(null, 'type', 'text/ecmascript');

		if (xmlNamespace == this.SVGNamespace)
			script.setAttributeNS(this.XLINKNamespace, 'href', exactUrl);
		else
			script.setAttributeNS(null, 'src', exactUrl);

		if (onLoadCb)
			script.onload = onLoadCb

		parentNode.appendChild(script);
	},

	loadAll: function(urls, cb) {
		urls.reverse().reduce(function(loadPrevious, url) {
			return function() { JSLoader.loadJs(url, loadPrevious) }
		}, function() { console.log('loadAll done'); cb && cb() })();
	},

	resolveAndLoadAll: function(baseURL, urls, cb) {
		for (var i = 0; i < urls.length; i++)
			urls[i] = baseURL + urls[i];
		return this.loadAll(urls, cb);
	},

	findParentScriptNode: function() {
		var node = document.getElementsByTagName('head')[0];
		if (!node) throw new Error('Cannot find parent node for scripts');
		return node;
	},

	getLinkAttribute: function(el) {
		return el.getAttributeNS(this.XLINKNamespace, 'href') || el.getAttribute('src');
	},
	
	getScripts: function() { return document.getElementsByTagName('script') },

	scriptInDOM: function(url) {
		if (document.getElementById(url)) return true;
		var scriptElements = this.getScripts();
		for (var i = 0; i < scriptElements.length; i++)
			if (this.scriptElementLinksTo(scriptElements[i], url)) return true;
		return false;
	},

	removeQueries: function(url) {
		return url.split('?')[0];
	},

	resolveURLString: function(urlString) {
		// FIXME duplicated from URL class in lively. Network
		// actually lively.Core should require lively.Network -- but lively.Network indirectly
		// lively.Core ====>>> FIX that!!!
		var result = urlString;
		// resolve ..
		do {
			urlString = result;
			result = urlString.replace(/\/[^\/]+\/\.\./, '')
		} while(result != urlString)
		// foo//bar --> foo/bar
		result = result.replace(/([^:])[\/]+/g, '$1/')
		// foo/./bar --> foo/bar
		result = result.replace(/\/\.\//g, '/')
		return result
	},
	
	scriptElementLinksTo: function(el, url) {
		if (!el.getAttribute) return false;
		// FIXME use namespace consistently
		if (el.getAttribute('id') == url) return true;
		var link = this.getLinkAttribute(el);
		if (!link) return false;
		if (url == link) return true;
		var linkString = this.makeAbsolute(link)
		var urlString = this.makeAbsolute(url)
		return linkString == urlString;
	},

	currentDir: function() {
		return this.dirOfURL(document.location.href.toString());
	},

	dirOfURL: function(url) { return url.substring(0, url.lastIndexOf('/') + 1) },

	makeAbsolute: function(urlString) {
		urlString = this.removeQueries(urlString);
		if (urlString.match(/^http/))
			return this.resolveURLString(urlString);
		return this.resolveURLString(this.currentDir() + urlString);
	},

	DEPRECATED$findParentScriptNode: function() {
		// FIXME Assumption that first def node has scripts
		var node = document.getElementsByTagName("defs")[0] || this.getScripts()[0].parentElement;
		// FIXME this is  a fix for a strange problem with HTML serialization
		var scripts = this.getScripts();
		if (scripts[0].src && scripts[0].src.endsWith('bootstrap.js'))
			node = scripts[0].parentNode;
		if (!node) throw(dbgOn(new Error('Cannot load script, don\'t know where to append it')));
		return node
	},

};

var LivelyLoader = {
	
	//
	// ------- generic load support ----------
	//
	codeBase: (function findCodeBase() {
		var
			bootstrapFileName = 'bootstrap.js',
			scripts = JSLoader.getScripts(),
			i = 0, node, urlFound;

		while (!urlFound && (node = scripts[i++])) {
			var url = JSLoader.getLinkAttribute(node);
			if (url && (url.indexOf(bootstrapFileName) >= 0)) urlFound = url;
		}

		if (!urlFound) {
			console.warn('Cannot find codebase, have to guess...');
			return JSLoader.dirOfURL(window.location.href.toString());
		}

		var codeBase = JSLoader.makeAbsolute(JSLoader.dirOfURL(urlFound) + '../');
		console.log('Codebase is ' + codeBase);

		return codeBase;
	})(),
	
	installWatcher: function(target, propName, haltWhenChanged) {
		var newPropName = '__' + propName;
		target[newPropName] = target[propName];
		target.__defineSetter__(propName, function(v) {
			target[newPropName] = v;
			console.log(target.toString() + '.' + propName + ' changed: ' + v);
			if (haltWhenChanged) debugger
		})
		target.__defineGetter__(propName, function() { return target[newPropName] })
		console.log('Watcher for ' + target + '.' + propName + ' installed')
	},
	
	bootstrap: function(thenDoFunc) {
		// Config = {}
		// this.installWatcher(window, 'Config', true)
		// this.installWatcher(Config, 'codeBase', true)
		
		var codeBase = this.codeBase;
		JSLoader.resolveAndLoadAll(codeBase, [
			'lively/JSON.js',
			'lively/miniprototype.js',
			'lively/defaultconfig.js',
			'lively/localconfig.js'],
			function() {
				Config.codeBase = codeBase;
				JSLoader.resolveAndLoadAll(codeBase, [
					'lively/Base.js',
					'lively/scene.js',
					'lively/Core.js',
					'lively/Network.js',
					
					"lively/Text.js",
					"lively/Widgets.js",
					"lively/Data.js",
					"lively/Storage.js",
					"lively/Tools.js",
					"lively/ide.js",

					], thenDoFunc);
			});
	},

	//
	// ------- load SVG world ---------------
	//
	loadSVGMain: function(canvas) {
		require('lively.Main').toRun(function() {
			var loader = new lively.Main.Loader()
			lively.bindings.connect(loader, 'finishLoading', LoadingScreen, 'remove');
			loader.systemStart(canvas);
		});
	},

	startSVGWorld: function() {
		var canvas = this.findSVGCanvas(document);
		if (!canvas) return false;
		var self = this;
		LoadingScreen.add();
		this.bootstrap(function() { self.loadSVGMain(canvas) });
		return true;
	},
	findSVGCanvas: function(doc) {
		var canvas = doc.getElementById('canvas');
		if (!canvas || canvas.tagName !== 'svg') return null;
		return canvas
	},


	//
	// ------- load HTML world ---------------
	//
	loadHTMLMain: function(canvas) {
		require('projects.HTML5.HTMLMain').toRun(function() {
			var loader = new projects.HTML5.HTMLMain.Loader()
			lively.bindings.connect(loader, 'finishLoading', LoadingScreen, 'remove');
			loader.systemStart(canvas);
		});
	},

	startHTMLWorld: function() {
		var canvas = this.findHTMLCanvas(document);
		if (!canvas) return false;
		LoadingScreen.add();
		var self = this;
		this.bootstrap(function() { self.loadHTMLMain(canvas) });
		return true;
	},
	findHTMLCanvas: function(doc) {
		var canvas = doc.getElementById('canvas');
		if (!canvas || canvas.tagName !== 'div') return null;
		return canvas
	},






};
LoadingScreen = {
	width: function() { return document.width || document.documentElement.clientWidth || 800 },
	height: function() { return document.height || document.documentElement.clientHeight || 800 },

	id : 'loadingScreen',
	consoleId : 'loadingConsole',

	buildBackground: function() {
		var div1 = document.createElement('div')
		div1.setAttribute('id', this.id);
		div1.setAttribute('style', "position: fixed; left: 0px; top: 0px; background-color: rgba(100,100,100,0.7); overflow: auto");

		div1.style.width = this.width() + 'px'
		div1.style.height = this.height() + 'px'

		return div1
	},

	buildLoadingLogo: function() {
		var logo = document.createElement('div')
		logo.setAttribute('style', "position: fixed; margin-left:auto; margin-right:auto; width: 80px; height: 105px; background-color: white; background-repeat:no-repeat;  background-position:center top");

		var logoText = document.createElement('div')
		logoText.setAttribute('style', "text-align:center; padding-top: 80px; font-family: sans-serif; font-size: large; color: gray")
		logoText.textContent = 'Loading';

		logo.style['top'] = (this.height() / 2 - 100) + 'px'
		logo.style['left'] = (this.width() / 2 - 40) + 'px'
		logo.style['background-image'] = 'url(' + LivelyLoader.codeBase + 'loading.gif)';

		logo.appendChild(logoText);

		return logo;
	},

	buildConsole: function() {
		var console = document.createElement('pre');
		console.setAttribute('id', this.consoleId);
		console.setAttribute('style', "position: absolute; top: 0px; font-family: monospace; font-size: small; padding-bottom: 20px;");

		function addLine(str, color) {
			color = color || 'rgb(0,255,64)';
			// console.appendChild(document.createElement('br'));
			var line = document.createElement('div');
			line.appendChild(document.createCDATASection(str));
			line.setAttribute('style', 'color: ' + color + ';');
			console.appendChild(line);
			if (console.parentNode && line.scrollIntoViewIfNeeded)
				line.scrollIntoViewIfNeeded()
		}
		console.log = function(msg) { addLine(msg) };
		console.warn = function(msg) { addLine(msg, 'yellow') };
		console.error = function(msg) { addLine(msg, 'red') };

		window.console.addConsumer(console)

		this.console = console
		return console;
	},
	removeConsole: function() {
		var console = this.console;
		if (!console) return;
		window.console.removeConsumer(console)
		this.removeElement(console);
		this.console = null;
	},

	toggleConsole: function() {
		if (!this.console) this.buildConsole();
		if (this.console.parentNode)
			this.removeElement(this.console)
		else
			this.domElement.appendChild(this.console)
	},

	buildConsoleButton: function() {
		var a = document.createElement('a');
		a.setAttribute('style', "position: fixed; right: 170px; top: 20px; width: 70px; text-align:center; font-family: monospace; border: 1px solid; border-color: rgb(100,100,100); color: rgb(100,100,100)");
		a.setAttribute('href', 'javascript:LoadingScreen.toggleConsole()');
		a.textContent = 'console'

		return a;
	},
	buildCloseButton: function() {
		var a = document.createElement('a');
		a.setAttribute('style', "position: fixed; right: 90px; top: 20px; width: 70px; text-align:center; font-family: monospace; border: 1px solid; border-color: rgb(100,100,100); color: rgb(100,100,100)");
		a.setAttribute('href', 'javascript:LoadingScreen.remove()');
		a.textContent = 'close'

		return a;
	},



	build: function() {
		var background = this.buildBackground(),
			loadingLogo = this.buildLoadingLogo(),
			consoleButton = this.buildConsoleButton(),
			closeButton = this.buildCloseButton(),
			console = this.buildConsole();
			
		background.appendChild(loadingLogo)

		background.appendChild(consoleButton)
		background.appendChild(closeButton)

		return background;
	},

	add: function() {
		if (!this.domElement)
			this.domElement = this.build();
		document.body.appendChild(this.domElement);
	},

	remove: function() {
		this.removeConsole();
		this.removeElement(this.domElement);
	},

	removeElement: function(el) {
		if (el && el.parentNode) el.parentNode.removeChild(el);
	},
};

var EmbededLoader = {

	//
	// ------- embedd world in another page ---------------
	//
	addWorld: function(worldURL, targetElement) {
		this.worldURL = worldURL;
		this.targetElement = targetElement;
		LivelyLoader.bootstrap(function() { EmbededLoader.embedAndLoadWorld(worldURL, targetElement) });
		// window.setTimeout(function() { console.log('test')}, 700)
	},
	
	embedAndLoadWorld: function(worldURL, targetElement) {
		console.log('Fetching ' + worldURL);
		var doc = new WebResource(worldURL).getDocument();
		this.convertCDATASections(doc.documentElement);
		var canvas = document.importNode(doc.getElementById('canvas'), true);
		$A(canvas.getElementsByTagName('script')).forEach(function(e) {	e.parentElement.removeChild(e) });
		var div = document.createElement('div');
		// div.setAttribute('style', "page-break-before: always; page-break-inside: avoid;");
		div.style['page-break-before'] = 'always';
		div.style['page-break-inside'] = 'avoid';
		div.appendChild(canvas);
		targetElement.appendChild(div);


		Config.isEmbedded = true
		if (canvas.getElementsByTagName('g').length > 0) { // FIXME SVG detection
			// FIXME ugly hack: width/height not properly saved in canvas element so reset it to the
			// width/height of the rect of the worldmorph
			Config.resizeScreenToWorldBounds = false;
			canvas.setAttribute("width", canvas.getElementsByTagName('g')[0].childNodes[0].width.baseVal.value.toString() + 'px');
			canvas.setAttribute("height", canvas.getElementsByTagName('g')[0].childNodes[0].height.baseVal.value.toString() + 'px');
			document.body.style.cursor = null
			LivelyLoader.loadSVGMain(canvas);
		} else {
			// FIXME!!!
			Config.resizeScreenToWorldBounds = false;
			// canvas.setAttribute("width", canvas.getElementsByTagName('div')[0].parentNode.style.width + 'px');
			// canvas.setAttribute("height", canvas.getElementsByTagName('div')[0].parentNode.style.height + 'px');
			canvas.setAttribute("width", targetElement.clientWidth + 'px');
			canvas.setAttribute("height", targetElement.clientHeight + 'px');
			canvas.getElementsByTagName('div')[0].setAttribute("width", targetElement.clientWidth + 'px');
			canvas.getElementsByTagName('div')[0].setAttribute("height", targetElement.clientHeight + 'px');
			var pos = targetElement.getAttribute('lively:position')
			if (pos) {
				var values = pos.split(' ');
				canvas.style.position = 'absolute';
				canvas.style.left = values[0];
				canvas.style.top = values[1];
			}
			document.body.style.cursor = null
			LivelyLoader.loadHTMLMain(canvas);
		}
	},

	convertCDATASections: function(el) {
		// CDATA sections are not allowed in (X)HTML documents....
		if (el.nodeType == document.CDATA_SECTION_NODE) {
			var text = el.ownerDocument.createTextNode(el.data);
			var parent = el.parentNode;
			parent.removeChild(el);
			parent.appendChild(text);
		}
			
		for (var i = 0; i < el.childNodes.length; i++)
			this.convertCDATASections(el.childNodes[i]);
	},

	getWorldAttributeFrom: function(el) {
		// return el.getAttributeNS(JSLoader.LIVELYNamespace, 'world');
		// arghh! I HATE XML Namespaces!
		return el.getAttribute('lively:world');
	},
	
	isLivelyCanvas: function(el) {
		if (!el || !el.getAttribute) return false;
		var attr = this.getWorldAttributeFrom(el);
		return attr != null && attr != ''
	},
	
	findLivelyCanvasIn: function(element) {
		if (this.isLivelyCanvas(element)) return element;
		for (var i = 0; i < element.childNodes.length; i++)
			return this.findLivelyCanvasIn(element.childNodes[i]);
	},
	
	embedLively: function() {
		// debugger
		var canvas = this.findLivelyCanvasIn(document.body);
		if (!canvas) return false;
		var ownUrl = document.location.href;
		var url = ownUrl.substring(0, ownUrl.lastIndexOf('/') + 1) + this.getWorldAttributeFrom(canvas);
		this.addWorld(url, canvas);
	},

};

(function startWorld() {
	window.addEventListener('load', function() {
		if (EmbededLoader.embedLively()) return;
		if (LivelyLoader.startSVGWorld()) return;
		if (LivelyLoader.startHTMLWorld()) return;
		console.warn('couldn\'t strt Lively');
	}, true);
})();