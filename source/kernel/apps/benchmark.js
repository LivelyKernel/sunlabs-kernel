module('apps.benchmark').requires(['cop.Layers']).toRun(function() {

Object.extend(Global, {
	doEvent: function(type, pos, targetMorph) {
		// event.initMouseEvent(type, canBubble, cancelable, view, 
	                     // detail, screenX, screenY, clientX, clientY, 
	                     // ctrlKey, altKey, shiftKey, metaKey, 
	                     // button, relatedTarget);

		console.log('creating event on ' + pos)
		// type one of click, mousedown, mouseup, mouseover, mousemove, mouseout.

		var simulatedEvent = document.createEvent("MouseEvent");

		simulatedEvent.initMouseEvent(type, true, true, window, 1, 
			170, 295, 
			170, 179, false, 
			false, false, false, 0/*left*/, null);
	// debugger
		targetMorph.shape.rawNode.dispatchEvent(simulatedEvent);
	},
});


Object.subclass('EventBenchmark', {

	initialize: function(morph1, morph2) {
		// FIXME make more general
		if (!morph1|| !morph2) return 
		// setup for target1
		morph1.handlesMouseDown = Functions.True;
		morph1.handlesMouseMove = Functions.True
		morph1.onMouseMove = function(evt) {};
		morph1.onMouseDown = function(evt) {
			// console.log('in mousedown of target1');
			return true
		}
		
		this.target1= morph1;
		this.target2= morph2;
	},

	doEvent: function(type, pos, targetMorph, times, dontSetFocus) {
		// type one of click, mousedown, mouseup, mouseover, mousemove, mouseout.
		var hand = targetMorph.world().firstHand();
		if (!times) times = 1;
		for (var i = 0; i < times; i++) {
			var evt = this.createMouseEvent(type, pos);
			if (!dontSetFocus) hand.setMouseFocus(targetMorph);
			// FIXME Panik HAAAAAAAAAACK
			if (targetMorph.listNode)
				targetMorph.listNode.dispatchEvent(evt)
			else
				targetMorph.world().rawNode.dispatchEvent(evt)
		}
	},

	createMouseEvent: function(type, pos) {
		// event.initMouseEvent(type, canBubble, cancelable, view, 
	    // detail, screenX, screenY, clientX, clientY, 
	    // ctrlKey, altKey, shiftKey, metaKey, 
	    // button, relatedTarget);

		var simulatedEvent = document.createEvent("MouseEvent");
		simulatedEvent.initMouseEvent(type, true, true, window, 1, 
			pos.x, pos.y+100,
			pos.x, pos.y,
			false, false, false, false,
			0/*left*/, null);
		return simulatedEvent;
	},

	clickOnTarget1: function(times) {
		var m = this.target1;
		var pos = m.owner.worldPoint(m.getCenter());
		this.logTime('click on the orange morph', function() {
			this.doEvent('mousedown', pos, m, times, false);
		});
	},

	moveTarget2: function() {
		var m = this.target2;
		var owner = m.owner
		var mPos = m.getPosition();
		var pos = m.owner.worldPoint(m.getCenter());
		var self = this;

		var eventSpecs = [{type: 'mousedown', pos: pos, target: m}, {type: 'mouseup', pos: pos, target: m}]; // grab
		eventSpecs = eventSpecs.concat(this.movePositions.collect(function(p) { return {type: 'mousemove', pos: p, target: m} }));
		eventSpecs = eventSpecs.concat([
			{type: 'mousemove', pos: pos, target: m},
			{type: 'mousedown', pos: pos, target: m}, // drop
			{type: 'mouseup', pos: pos, target: m},
		]);

		var finish = function() {
			var time = new Date() - startTime;
			self.logTime('grab yellow morph and move it (' + self.movePositions.length + ' moves)', time)

	// debugger
			// ensure morph is added to previous owner, sometimes it doesnt work with events
			m.world().firstHand().dropMorphsOn(owner)
			// owner.addMorph(m);
			m.setPosition(mPos)
			// p =  pt(237.0,198.0)
			// this.doEvent('mousedown', p, $morph('RectB'))
			// this.doEvent('mouseup', p, $morph('RectB'))
		}

		var run = eventSpecs.inject(finish, function(prevFunc, spec) {
			return function() { self.doEvent(spec.type, spec.pos, spec.target, spec.times || 1, spec.dontFocus); prevFunc.delay(0) };
		});

		var startTime = new Date();
		run()
		// this.logTime('grab yellow morph and move it (' + this.movePositions.length + ' moves)', function() {
			// 
			// for (var i = 0; i < times; i ++) { run() }
		// });
	},
	clickSomewhereInMorph: function(target, times) {
		if (!times) times = 1;
		var m = target;
		var rect = m.bounds().insetBy(30)
		var self = this;
		(function() {
			console.profile("Event")
			self.logTime('clicked somewhere in ' + (m.name ? m.name : m), function() {
				for (var i = 0; i< times; i++) {
					var pos = rect.randomPoint()
					if (l.listNode) l.listNode.focus()
					self.doEvent('mousemove', pos, m, 1, false);
					self.doEvent('mousedown', pos, m, 1, false);
					self.doEvent('mouseup', pos, m, 1, false);
				}
			});
			console.profileEnd("Event")
		}).delay(1)
	},


	movePositions: [pt(153.0,194.0), pt(154.0,194.0), pt(155.0,194.0), pt(157.0,191.0), pt(165.0,183.0), pt(181.0,172.0), pt(206.0,157.0), pt(224.0,149.0), pt(251.0,137.0), pt(294.0,123.0), pt(329.0,111.0), pt(377.0,94.0), pt(443.0,74.0), pt(503.0,59.0), pt(549.0,45.0), pt(599.0,32.0), pt(668.0,20.0), pt(707.0,16.0), pt(761.0,16.0), pt(815.0,16.0), pt(865.0,19.0), pt(910.0,30.0), pt(1058.0,79.0), pt(1083.0,90.0), pt(1116.0,110.0), pt(1133.0,124.0), pt(1143.0,136.0), pt(1155.0,153.0), pt(1139.0,279.0), pt(1122.0,307.0), pt(1105.0,332.0), pt(1087.0,352.0), pt(1066.0,370.0), pt(1052.0,383.0), pt(1026.0,408.0),  pt(964.0,450.0), pt(943.0,460.0), pt(919.0,472.0), pt(892.0,483.0), pt(856.0,493.0), pt(825.0,498.0), pt(804.0,503.0), pt(781.0,505.0), pt(741.0,509.0), pt(708.0,509.0), pt(673.0,511.0), pt(637.0,511.0), pt(598.0,511.0), pt(565.0,507.0), pt(534.0,502.0), pt(488.0,489.0), pt(442.0,473.0), pt(412.0,457.0), pt(394.0,447.0), pt(371.0,434.0), pt(348.0,411.0), pt(333.0,388.0), pt(325.0,370.0), pt(318.0,354.0), pt(316.0,346.0), pt(316.0,344.0), pt(314.0,335.0), pt(312.0,319.0), pt(310.0,310.0), pt(309.0,304.0), pt(306.0,296.0), pt(302.0,290.0), pt(295.0,284.0), pt(284.0,277.0), pt(270.0,267.0), pt(254.0,256.0), pt(235.0,244.0), pt(215.0,230.0), pt(196.0,218.0), pt(182.0,208.0), pt(168.0,197.0), pt(158.0,188.0), pt(150.0,178.0), pt(144.0,165.0), pt(140.0,157.0), pt(137.0,152.0), pt(135.0,148.0), pt(134.0,145.0), pt(134.0,144.0), pt(133.0,144.0), pt(133.0,143.0), pt(133.0,144.0), pt(139.0,156.0), pt(139.0,157.0), pt(139.0,158.0), pt(139.0,159.0), pt(139.0,160.0), pt(140.0,161.0), pt(140.0,163.0), pt(140.0,164.0), pt(142.0,168.0), pt(142.0,169.0), pt(142.0,170.0), pt(144.0,170.0), pt(144.0,171.0)],

	log: function(msg) {
		if ($morph('logger'))
			$morph('logger').setTextString($morph('logger').textString + '\n' + msg.toString());
	},

	logTime: function(name, funcOrTime) {
		var time;
		if (Object.isFunction(funcOrTime)) {
			var start = new Date();
			name, funcOrTime.call(this);
			time = new Date() - start;
		} else { time = funcOrTime }
		this.log(name + ': ' + time + 'ms');
	},

});


cop.create("LiveEventBenchmarkLayer").refineClass(HandMorph, {
	reallyHandleMouseEvent: function(evt) {
		var result;
		var time = Date.now()
		result = cop.proceed(evt);
		var delta = Date.now() - time;
		LiveEventBenchmarkLayer.currentPlotter().addAndPlot(delta)
		return result
	}
})


Object.subclass("SimpleCanvasPlotter", {
	initialize: function() {
		this.values = [];
	},

	ensureDebugCanvas: function () {
		var canvas = document.getElementById("debugCanvas");
		if (canvas) return canvas;
		// Not there yet -- create a new one
		canvas = document.createElement("canvas");
		canvas.setAttribute("id","debugCanvas");
		// position: fixed 
		canvas.setAttribute("style","position:fixed;z-index: 100;right:0px; top:1px; width:400px; height:100px; background: white");
		var outerBody = Global.document.body || Global.parent.document.body;
		outerBody.appendChild(canvas);
		return canvas;
	},

	removeDebugCanvas: function() {
		var canvas = document.getElementById("debugCanvas");
		if (canvas)
			canvas.parentNode.removeChild(canvas)
	},

	plot: function() {
		if (!this.enabled())
			return;
		var values = this.values;
		var canvas = this.ensureDebugCanvas() 
		var ctx = canvas.getContext("2d");  
		ctx.fillStyle = "rgb(100,100,100)";  
		ctx.clearRect (0, 0, 400, 300);

		var n = 100;	
		var from = values.length - n;
		var to = values.length 
		for (var i=from; i < to; i++) {
			ctx.fillRect ((i - from)* 2, 0,  1, values[i] * 5);  
		}
	},
	
	addAndPlot: function(value) {
		this.values.push(value);
		this.plot();
	},

	enabled: function() {
		return this._enabled
	},

	enable: function() {
		this._enabled = true;
		enableLayer(LiveEventBenchmarkLayer)

	},

	disable: function() {
		this._enabled = false;
		disableLayer(LiveEventBenchmarkLayer);
		this.removeDebugCanvas();
	},

});

Object.extend(LiveEventBenchmarkLayer, {
	currentPlotter: function() {
		if (!this._currentPlotter)
			this._currentPlotter = new SimpleCanvasPlotter();
		return this._currentPlotter;
	}
});

cop.create('LiveEventBenchmarkMenuLayer')
.beGlobal()
.refineClass(WorldMorph, {
	preferencesSubMenuItems: function(evt) {
		var items = cop.proceed(evt);
		var enabled = LiveEventBenchmarkLayer.currentPlotter().enabled();
		items.push([(enabled ? "[X]" : "[]" )+ " show live event benchmark", 
			function() {
				if (! enabled) { 
					LiveEventBenchmarkLayer.currentPlotter().enable();
				} else {
					LiveEventBenchmarkLayer.currentPlotter().disable()
				}
			}])
		return items
	}
})


}) // end of module