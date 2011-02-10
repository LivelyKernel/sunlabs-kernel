var isFirefox = window.navigator.userAgent.indexOf('Firefox') > -1;
var isFireBug = isFirefox && window.console && window.console.firebug !== undefined;

(function setupConsole() {
	
    var platformConsole = window.console ||
		(window.parent && window.parent.console) ||
		{};

	var required = ['log', 'group', 'groupEnd', 'warn', 'assert', 'error'];
	for (var i = 0; i < required.length; i++)
		if (!platformConsole[required[i]])
			platformConsole[required[i]] = function() {}

	window.console = platformConsole;

	if (isFireBug) return;

	function addWrappers() {
		if (platformConsole.wasWrapped) return;
		platformConsole.wasWrapped = true;

		var props = [];
		for (var name in platformConsole) props.push(name);
		
		for (var i = 0; i < props.length; i++)
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
			})(props[i]);
		
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

	loadJs: function(url, onLoadCb, loadSync, noCache, cacheQuery) {
		if (this.scriptInDOM(url)) {
			console.log('script ' + url + ' already loaded or loading');
			return
		};
		console.log('loading script ' + url);		

		// adapt URL
		var exactUrl = url;
		if (Config.disableScriptCaching && (exactUrl.indexOf('!svn') <= 0) && !noCache) {
			cacheQuery = cacheQuery || new Date().getTime();
			exactUrl = (exactUrl.indexOf('?') == -1) ?
				exactUrl + '?' +  cacheQuery :
				exactUrl + '&' + cacheQuery;
		}

		// create and configure script tag
		var parentNode = this.findParentScriptNode(),
			xmlNamespace = parentNode.namespaceURI,
			script = document.createElementNS(xmlNamespace, 'script');
		parentNode.appendChild(script);
		script.setAttributeNS(null, 'id', url);
		script.setAttributeNS(null, 'type', 'text/ecmascript');

		return loadSync ?
			this.loadSync(exactUrl, onLoadCb, script) :
			this.loadAsync(exactUrl, onLoadCb, script);
	},
	loadSync: function(url, onLoadCb, script) {
		var source = this.getSync(url);
		eval(source);
		if (typeof onLoadCb === 'function') onLoadCb();
	},
	loadAsync: function(url, onLoadCb, script) {
		if (script.namespaceURI == this.SVGNamespace)
			script.setAttributeNS(this.XLINKNamespace, 'href', url);
		else
			script.setAttributeNS(null, 'src', url);

		if (onLoadCb)
			script.onload = onLoadCb;
		
		script.setAttributeNS(null, 'async', true);
	},


	loadCombinedModules: function(combinedFileUrl, callback, hash) {
		// If several modules are combined in one file they can be loaded with this method.
		// The method will ensure that all included modules are loaded and if they
		// have required modules that are not included in the combined file also those will
		// be loaded.

		var originalLoader = this,
			combinedLoader = {
				expectToLoadModules: function(listOfRelativePaths) {
					// urls like http://lively-kernel.org/repository/webwerkstatt/lively/Text.js
					this.expectedModuleURLs = new Array(listOfRelativePaths.length);
					for (var i = 0; i < listOfRelativePaths.length; i++)
						this.expectedModuleURLs[i] = LivelyLoader.codeBase + listOfRelativePaths[i]

					// modules like lively.Text
					this.expectedModules = new Array(listOfRelativePaths.length);
					for (var i = 0; i < listOfRelativePaths.length; i++) {
						var moduleName = listOfRelativePaths[i].replace(/\//g, '.');
						moduleName = moduleName.replace(/\.js$/g, '');
						this.expectedModules[i] = moduleName;
					}

					// create script tags that are found when tested if a file is already loaded
					this.expectedModuleURLs.forEach(function(url) {
						var script = document.createElement('script')
						script.setAttribute('id', url);
						document.getElementsByTagName('head')[0].appendChild(script);
					})
				},
				includedInCombinedFile: function(scriptUrl) {
					return this.expectedModuleURLs && this.expectedModuleURLs.indexOf(scriptUrl) >= 0;
				},
				loadJs: function(url) {
					console.log('load file that is not in combined modules: ' + url)
					if (!this.includedInCombinedFile(url)) originalLoader.loadJs(url);
				},
				scriptInDOM: function(url) {
					return originalLoader.scriptInDOM(url) || this.includedInCombinedFile(url);
				},
			},
			callCallback = function() {
				Global.JSLoader = originalLoader;
				// FIXME
				// Filter out the modules already loaded
				var realModules = combinedLoader.expectedModules
					.select(function(ea) { return Class.forName(ea) !== undefined });
				require(realModules).toRun(callback)
			};

		if (this.scriptInDOM(combinedFileUrl)) { callCallback(); return }

		// while loading the combined file we replace the loader
		JSLoader = combinedLoader;

		this.loadJs(combinedFileUrl, callCallback, null, hash);
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

	scriptInDOM: function(url) { return this.scriptsThatLinkTo(url).length > 0 },

	scriptsThatLinkTo: function(url) {
		var scriptsFound = [],
			allScripts = this.getScripts();
		for (var i = 0; i < allScripts.length; i++)
			if (this.scriptElementLinksTo(allScripts[i], url))
				scriptsFound.push(allScripts[i]);
		return scriptsFound;
	},

	removeQueries: function(url) { return url.split('?')[0] },

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

	dirOfURL: function(url) {
		return this.removeQueries(url).substring(0, url.lastIndexOf('/') + 1)
	},

	makeAbsolute: function(urlString) {
		urlString = this.removeQueries(urlString);
		if (urlString.match(/^http/))
			return this.resolveURLString(urlString);
		return this.resolveURLString(this.currentDir() + urlString);
	},

	removeAllScriptsThatLinkTo: function(url) {
		var scripts = this.scriptsThatLinkTo(url);
		for (var i = 0; i < scripts.length; i++)
			scripts[i].parentNode.removeChild(scripts[i]);
	},
	getSync: function(url) {
		var req = new XMLHttpRequest()
		req.open('GET', url, false/*sync*/)
		req.send()
		return req.responseText;
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
		if (window.Config && Config.codeBase !== undefined)
			return Config.codeBase;

		var bootstrapFileName = 'bootstrap.js',
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
	createConfigObject: function() {
		// Should have addtional logic for the case when no no window object exist...
		if (!window.Config) window.Config = {};
		window.Config.codeBase = this.codeBase;
	},

	
	bootstrap: function(thenDoFunc, isCanvas) {
		this.createConfigObject();

		if (Config.standAlone) { thenDoFunc(); return };

		// FIXME somehow solve the canvas loading issue...
		var url = document.URL,
			optimizedLoading = !url.match('quickLoad=false') && !url.match('!svn') &&
				url.match('webwerkstatt') && String(document.location).match('lively-kernel.org') && !isCanvas;
		if (optimizedLoading) {
			console.log('optimized loading enabled')
			var hash = JSLoader.getSync(this.codeBase + 'generated/combinedModulesHash.txt')
			JSLoader.loadCombinedModules(this.codeBase + 'generated/combinedModules.js', thenDoFunc, hash);
			return
		}
		
		var codeBase = this.codeBase;		
		JSLoader.resolveAndLoadAll(codeBase, [
			'lively/JSON.js',
			'lively/miniprototype.js',
			'lively/defaultconfig.js',
			'lively/localconfig.js'],
			function() {
				var modules1 =  [
					'lively/Base.js',
					'lively/DOMAbstraction.js',
					'lively/OldBase.js',
					'lively/scene.js',
					'lively/Core.js'
				];

				var modules2 =  [
					'lively/Network.js',
					'lively/Text.js',
					'lively/Widgets.js',
					'lively/Data.js',
					'lively/Storage.js',
					'lively/Tools.js',
					'lively/ide.js'
				];
				if (isCanvas) {
					modules1.splice(1, 0, 'lively/EmuDom.js');
					modules2.push('lively/CanvasExpt.js');
				}

				JSLoader.resolveAndLoadAll(codeBase,
					modules1,
					function() {
						if (isCanvas) LivelyLoader.executeCanvasChanges();
						JSLoader.resolveAndLoadAll(codeBase, modules2, thenDoFunc);
					});
			});
	},

	//
	// ------- load world ---------------
	//
	loadMain: function(canvas) {
		require('lively.bindings', 'lively.Main').toRun(function() {
			var loader = lively.Main.getLoader(canvas);
			lively.bindings.connect(loader, 'finishLoading', LoadingScreen, 'remove');
			loader.systemStart(canvas);
			LivelyLoader.loadUserConfig();
		});
	},

	startWorld: function() {
		var canvas = this.findCanvas(document);
		if (!canvas) return false;
		var self = this;
		LoadingScreen.add();
		this.bootstrap(function() { self.loadMain(canvas) });
		return true;
	},
	findCanvas: function(doc) {
		var canvas = doc.getElementById('canvas');
		if (canvas && canvas.tagName.toUpperCase() === 'SVG') return canvas;
		canvas = doc.getElementById('canvas');
		if (canvas && canvas.tagName.toUpperCase() === 'DIV') return canvas;
		return null
	},


	//
	// ------- Canvas specific ---------------
	//
	startCanvasWorld: function() {
		var canvas = this.findRealCanvas(document);
		if (!canvas) return false;
		var self = this;
		LoadingScreen.add();
		this.bootstrap(function() { self.loadMain(canvas) }, true);
		return true;
	},

	findRealCanvas: function(doc) {
		var canvas = doc.getElementById('lively.canvas');
		if (!canvas || canvas.tagName.toUpperCase() !== 'CANVAS') return null;
		return canvas
	},
	
	executeCanvasChanges: function() {
		NodeFactory.create = function(name, attributes) {
		    var element = emudom.document.createElementNS(Namespace.SVG, name);
		    //return this.createNS(Namespace.SVG, name, attributes);  // doesn't work
		    return NodeFactory.extend(null, element, attributes);
		};

		WorldMorph.addMethods({
			setChangeSet: function(cs) {
				// FIXME
				// cs.addHookTo(cs.findOrCreateDefNodeOfWorld(this.rawNode));
			},

		    displayOnCanvas: function(canvas) {
				// this.remove();

				//canvas.appendChild(this.rawNode);
				// otherwise we may be 
		        var hand = this.addHand(new HandMorph(true));
				WorldMorph.currentWorld = this; // this conflicts with mutliple worlds
		        this.onEnter(); 

				this.enterCount ++;
		    },

		    addHand: function(hand) {
		        if (this.hands.length > 0 && !this.hands.first())
		            this.hands.shift(); // FIXME: Quick bugfix. When deserializing the world the hands.first() is sometimes undefined
		        this.hands.push(hand);
		        hand.owner = this;
		        hand.registerForEvents(this);
		        hand.registerForEvents(hand);
		        hand.layoutChanged();

		        Event.keyboardEvents.forEach(function(each) {
		            document.documentElement.addEventListener(each, hand, hand.handleOnCapture);
		        });

		        //this.rawNode.parentNode.appendChild(hand.rawNode);
				return hand;
		    }

		});

		lively.data.Wrapper.addMethods({
		    reference: function() {
				if (!this.refcount) {
			    	if (!this.id()) {
						this.setId(this.newId());
			    	}
			    	//this.dictionary().appendChild(this.rawNode);
			    	this.refcount = 1; 
			    	return;
				}
				this.refcount ++;
		    },
			ensureInDictionary: function() { }
		});		
	},
	startNewMorphicWorld: function() {
		if (!window.Config || !Config.isNewMorphic) return false;
		var self = this;
		LoadingScreen.add();
		this.bootstrapNewMorphicWorld(function() {
			// FIXME
			Config.modulesOnWorldLoad = [];
			self.loadMain(document.body);
		});
		return true;
	},
	bootstrapNewMorphicWorld: function(thenDoFunc) {
		this.createConfigObject();
		if (Config.standAlone) { thenDoFunc(); return };

		var codeBase = this.codeBase;		
		JSLoader.resolveAndLoadAll(codeBase, [
			'lively/JSON.js',
			'lively/miniprototype.js',
			'lively/defaultconfig.js',
			'lively/localconfig.js',
			'lively/Base.js'],
			thenDoFunc);
	},
	startHeadless: function() {
		if (!window.Config || !Config.headless) return false;
		this.bootstrapHeadless(function() { console.log('Headless Lively loaded') });
		return true;
	},
	bootstrapHeadless: function(thenDoFunc) {
		this.createConfigObject();

		if (Config.standAlone) { thenDoFunc(); return };

		var moduleNames = Config.onlyLoad || [];
		
		var codeBase = this.codeBase;		
		JSLoader.resolveAndLoadAll(codeBase, [
			'lively/JSON.js',
			'lively/miniprototype.js',
			'lively/defaultconfig.js',
			'lively/localconfig.js',
			'lively/Base.js'].concat(moduleNames),
			thenDoFunc);
	},

	loadUserConfig: function() {
		if (!window.localStorage) {
			console.warn('cannot load user config because cannot access localStorage!')
			return;
		}
		var userName = localStorage.livelyUserName;
		if (userName === undefined) return;
		var moduleName = userName + ".config";
		require(moduleName).toRun(function() { alertOK("loaded user config for " + userName) })
	},

};
LoadingScreen = {
	width: function() { return document.documentElement.clientWidth || 800 },
	height: function() { return document.documentElement.clientHeight || 800 },

	id : 'loadingScreen',
	consoleId : 'loadingConsole',
	logoId: 'loadingLogo',
	brokenWorldMsgId: 'loadingBrokenWorldMsg',

	buildBackground: function() {
		var div1 = document.createElement('div')
		div1.setAttribute('id', this.id);
		div1.setAttribute('style', "position: fixed; left: 0px; top: 0px; background-color: rgba(100,100,100,0.7); overflow: auto");
		div1.style.width = this.width() + 'px'
		div1.style.height = this.height() + 'px'

		return div1
	},

	buildLoadingLogo: function() {
		var logoAndText = document.createElement('div')
		logoAndText.setAttribute('id', this.logoId);
		logoAndText.setAttribute('style', "position: fixed; margin-left:auto; margin-right:auto; width: 80px; height: 108px; background-color: white;");

		var logo = document.createElement('img')
		logo.setAttribute('style', "width: 80px; height: 80px;");

		var text = document.createElement('div')
		text.setAttribute('style', "text-align:center; font-family: sans-serif; font-size: large; color: gray")
		text.textContent = 'Loading';

		logoAndText.style['top'] = (this.height() / 2 - 100) + 'px'
		logoAndText.style['left'] = (this.width() / 2 - 40) + 'px'
		logo.src = LivelyLoader.codeBase + 'loading.gif';

		logoAndText.appendChild(logo);
		logoAndText.appendChild(text);

		this.logo = logoAndText;

		return logoAndText;
	},

	buildBrokenWorldMessage: function() {
		var el = document.createElement('div'),
			text1 = document.createTextNode('An error occurred. If the world does not load you can visit '),
			text2 = document.createTextNode(' for help.'),
			link = document.createElement('a'),
			repairURL = LivelyLoader.codeBase + 'BrokenWorldRepairSite.xhtml?brokenWorldURL=' + document.location.href;

		el.setAttribute('id', this.brokenWorldMsgId);
		el.setAttribute('style', "position: fixed; margin-left:auto; margin-right:auto; padding: 5px; background-color: white; font-family: Arial,times; color: red; font-size: large-x;");

		el.style['top'] = (this.height() / 2 - 70) + 'px'
		el.style['left'] = (this.width() / 2 - 290) + 'px'

		link.style.color = 'red';
		link.setAttribute('href', repairURL);
		link.setAttribute('target', '_blank');
		link.textContent = 'the repair page';

		el.appendChild(text1);
		el.appendChild(link);
		el.appendChild(text2);

		return el;
	},

	ensureBrokenWorldMessage: function() {
		this.removeElement(this.logo);
		if (!document.getElementById(this.brokenWorldMsgId))
			 document.getElementById(this.id).appendChild(this.buildBrokenWorldMessage());
	},

	buildConsole: function() {
		var console = document.createElement('pre'), self = this;
		console.setAttribute('id', this.consoleId);
		console.setAttribute('style', "position: absolute; top: 0px; font-family: monospace; color: rgb(0,255,64); font-size: medium; padding-bottom: 20px;");
		this.console = console;
		if (isFireBug) return console;
		
		function addLine(str, style) {
			style = style || ''
			// console.appendChild(document.createElement('br'));
			var line = document.createElement('div');
			line.appendChild(document.createCDATASection(str));
			line.setAttribute('style', style);
			console.appendChild(line);
			if (console.parentNode && line.scrollIntoViewIfNeeded)
				line.scrollIntoViewIfNeeded()
		}

		this.consoleProxy = {
			log: function(msg) { addLine(msg) },
			warn: function(msg) { addLine(msg, 'color: yellow;') },
			error: function(msg) {
				if (!console.parentNode) self.toggleConsole();
				addLine(msg, 'color: red; font-size: large;');
				self.ensureBrokenWorldMessage();
			},
		};

		window.console.addConsumer(this.consoleProxy)
		
		return console;
	},

	removeConsole: function() {
		var console = this.console;
		this.console = null;
		if (!console || isFireBug) return;
		this.removeElement(console);
		if (!this.consoleProxy) return
		window.console.removeConsumer(this.consoleProxy)
		this.consoleProxy = null;
	},

	toggleConsole: function() {
		if (!this.console) this.buildConsole();
		if (this.console.parentNode)
			this.removeElement(this.console)
		else
			this.domElement.appendChild(this.console)
	},

	buildConsoleButton: function() {
		// var btn = document.createElement('button');
		// btn.setAttribute('style', "position: fixed; right: 170px; top: 20px; width: 70px; text-align:center; font-family: monospace; border: 1px solid; border-color: rgb(100,100,100); color: rgb(100,100,100)");
		// btn.setAttribute('style', "position: fixed; right: 170px; top: 20px; width: 70px;");
		// btn.onclick = function() { LoadingScreen.toggleConsole() }
		// return btn
		var a = document.createElement('a');
		a.setAttribute('style', "position: fixed; right: 170px; top: 20px; width: 70px; text-align:center; font-family: monospace; border: 1px solid; border-color: rgb(100,100,100); color: rgb(100,100,100)");
		a.setAttribute('href', 'javascript:LoadingScreen.toggleConsole()');
		a.textContent = 'console'

		return a;
	},
	buildCloseButton: function() {
		var a = document.createElement('a');
		a.setAttribute('style', "position: fixed; right: 90px; top: 20px; width: 70px; text-align:center; font-family: monospace; border: 1px solid; border-color: rgb(100,100,100); color: rgb(100,100,100)");
		a.setAttribute('href', 'javascript:LoadingScreen.remove();');
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
		}
		document.body.style.cursor = null
		LivelyLoader.loadMain(canvas);
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
	window.addEventListener('DOMContentLoaded', function() {
		if (EmbededLoader.embedLively() ||
			LivelyLoader.startCanvasWorld() ||
			LivelyLoader.startWorld() ||
			LivelyLoader.startNewMorphicWorld() ||
			LivelyLoader.startHeadless()) return;
		console.warn('couldn\'t strt Lively');
	}, true);
})();