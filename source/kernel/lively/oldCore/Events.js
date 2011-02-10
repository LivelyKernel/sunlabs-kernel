module('lively.oldCore.Events').requires().toRun(function() {

// ===========================================================================
// Event handling foundations
// ===========================================================================

/**
  * @class Event: replacement Event class. (NOTE: PORTING-SENSITIVE CODE)
  * The code below rebinds the Event class to a LK substitute that wraps around 
  * the browser implementation.
  * For a detailed description of the Event class provided by browsers,
  * refer to, e.g., David Flanagan's book (JavaScript: The Definitive Guide).
  */

(function setupEvent() {
var tmp = Event; // note we're rebinding the name Event to point to a different class 

Object.subclass('Event', {

	capitalizer: {
		mouseup: 'MouseUp', mousedown: 'MouseDown', mousemove: 'MouseMove', 
		mouseover: 'MouseOver', mouseout: 'MouseOut', mousewheel: 'MouseWheel',
		keydown: 'KeyDown', keypress: 'KeyPress', keyup: 'KeyUp',
	},

	initialize: function(rawEvent) {
		this.rawEvent = rawEvent;
		this.type = this.capitalizer[rawEvent.type] || rawEvent.type;
		//this.charCode = rawEvent.charCode;

		// fix timeStamp, e.g in Opera
		this.timeStamp = this.rawEvent.timeStamp || new Date().getTime();

		this.hand = null;

		// use event.timeStamp
		// event.msTime = (new Date()).getTime();
		this.mouseButtonPressed = false;
	},

	setCanvas: function(canvas) {
		this.canvas = canvas;
		this.prepareMousePoint();
	},

	prepareMousePoint: function() {
		if (this.isMouseEvent())
			this.addMousePoint(this.rawEvent)
	},

	offset: function() {
		// Test
		// return pt(0,0 )
		// note that FF doesn't doesnt calculate offsetLeft/offsetTop early enough we don't precompute these values
		if (Config.isEmbedded) {
			var topElement = this.canvas;
			var offsetX = 0;
			var offsetY = -3;
			do {
				offsetX += topElement.offsetLeft
				offsetY += topElement.offsetTop
				topElement = topElement.offsetParent;
			} while (topElement && topElement.tagName != 'BODY');
			return pt(offsetX, offsetY);
		} else {
			if (Event.canvasOffset === undefined) {
				var topElement = this.canvas;
				Event.canvasOffset = pt(topElement.offsetLeft || 0, (topElement.offsetTop  || 0) - 3);
			}
			return Event.canvasOffset;
		}
	},

	addMousePoint: function(evtOrTouch) {
		var pos = pt(evtOrTouch.pageX || evtOrTouch.clientX, evtOrTouch.pageY || evtOrTouch.clientY);
		this.mousePoint = pos.subPt(this.offset());
		this.priorPoint = this.mousePoint;
	},

	isMouseEvent: function() {
		return Event.mouseEvents.include(this.rawEvent.type);
	},

	simpleCopy: function() {
		return new Event(this.rawEvent);
	},

	stopPropagation: function() {
		this.rawEvent.stopPropagation();
	},

	preventDefault: function() {
		this.rawEvent.preventDefault();
	},

	stop: function() {
		this.preventDefault();
		this.stopPropagation();
	},

	isAltDown: function() {
		return this.rawEvent.altKey;
	},

	isCommandKey: function() {
		// this is LK convention, not the content of the event
		if (Config.useAltAsCommand)
			return this.isAltDown();
		if (UserAgent.isWindows || UserAgent.isLinux )
			return this.isCtrlDown()
		if (UserAgent.isOpera) // Opera recognizes cmd as ctrl!!?
			return this.isCtrlDown()
		return this.isMetaDown()
	},

	isShiftDown: function() {
		return this.rawEvent.shiftKey;
	},

	isMetaDown: function() {
		return this.rawEvent.metaKey;
	},

	isCtrlDown: function() {
		return this.rawEvent.ctrlKey;
	},

	toString: function() {
		return Strings.format("#<Event:%s%s%s>",
		this.type,
		this.mousePoint ?  "@" + this.mousePoint : "",
		this.getKeyCode() || "");
	},

	setButtonPressedAndPriorPoint: function(buttonPressed, priorPoint) {
		this.mouseButtonPressed = buttonPressed;
		// if moving or releasing, priorPoint will get found by prior morph
		this.priorPoint = priorPoint; 
	},

	handlerName: function() {
		return "on" + this.type;
	},

	getKeyCode: function() {
		return this.rawEvent.keyCode;
	},

	getKeyChar: function() {
		if (this.type == "KeyPress") { // rk what's the reason for this test?
			var id = this.rawEvent.charCode || this.rawEvent.which;
			if (id > 63000) return ""; // Old Safari sends weird key char codes
			return id ? String.fromCharCode(id) : "";
		} else  {
			var code = this.rawEvent.which;
			return code && String.fromCharCode(code);
		}
	},

	wheelDelta: function() {
		// FIXME: make browser-independent
		return this.rawEvent.wheelDelta;
	},

	point: function() {
		// likely origin of event, obvious for mouse events, the hand's position for
		// keyboard events
		return this.mousePoint || this.hand.getPosition();
	},

	isLeftMouseButtonDown: function() {
		return this.rawEvent.button === 0;
	},

	isMiddleMouseButtonDown: function() {
		return this.rawEvent.button === 1;
	},

	isRightMouseButtonDown: function() {
		return this.rawEvent.button === 2;
	},

});


Object.extend(Event, {
	rawEvent: tmp,
	
	// copied from prototype.js:
	KEY_BACKSPACE: 8,
	KEY_TAB:       9,
	KEY_RETURN:   13,
	KEY_ESC:      27,
	KEY_LEFT:     37,
	KEY_UP:       38,
	KEY_RIGHT:    39,
	KEY_DOWN:     40,
	KEY_DELETE:   46,
	KEY_HOME:     36,
	KEY_END:      35,
	KEY_PAGEUP:   33,
	KEY_PAGEDOWN: 34,
	KEY_INSERT:   45,

	// not in prototype.js:
	KEY_SPACEBAR: 32,
	KEY_SHIFT:    16,
	KEY_CTRL:     17,
	KEY_ALT:      18,
	KEY_CMD:      91,

	
	prepareEventSystem: function(canvas) {
		if (!canvas) return;
		var disabler = {    
			handleEvent: function(evt) { 	
	   			evt.preventDefault(); 
	   			return false;
			}
	  	};
		canvas.addEventListener("dragstart", disabler, false);
		canvas.addEventListener("selectstart", disabler, false);
		if (Config.suppressDefaultMouseBehavior)
			Global.document.oncontextmenu = Functions.False
	},
});

var basicMouseEvents =  ["mousedown", "mouseup", "mousemove", "mousewheel"];
var extendedMouseEvents = [ "mouseover", "mouseout"];
Event.mouseEvents = basicMouseEvents.concat(extendedMouseEvents);
Event.keyboardEvents = ["keypress", "keyup", "keydown"];
Event.basicInputEvents = basicMouseEvents.concat(Event.keyboardEvents).concat(["touchstart", "touchmove", "touchend", "touchcancel"]);

})();


}) // end of module