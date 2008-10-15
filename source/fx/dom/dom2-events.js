var MouseEvent = function() {};
Object.extend(MouseEvent.prototype, {
  get currentTarget() { return this._currentTarget; },
  get shiftKey() { return this._shiftKey; },
  get altKey()  { return this._altKey; },
  get type() { return this._type; },
  get clientX() { return this._clientX; },
  get clientY() { return this._clientY; },
  stopPropagation: function() { this._propagationStopped = true; },
  preventDefault: function() { /* no default to prevent?*/ }   
});


  //FIXME: check standards
var KeyboardEvent = function() {};
Object.extend(KeyboardEvent.prototype, {
  get currentTarget() { return this._currentTarget; },
  get type() { return this._type; },
  get keyCode() { return this._keyCode },
  get charCode() {  return this._keyChar; },
  stopPropagation: function() { this._propagationStopped = true; },
  preventDefault: function() { /* no default to prevent? */ }   

});

var EventTarget = {
  // TODO check the spec again
  addEventListener: function(type, listener, useCapture) {
    this._eventListeners = this._eventListeners || {};
    this._eventListeners[type] = this._eventListeners[type] || []; 
    this._eventListeners[type].push(listener);
  },

  // TODO check the spec again
  removeEventListener: function(type, listener, useCapture) {
    this._eventListeners = this._eventListeners || {};
      var listeners = this._eventListeners[type];
      if (listeners && listeners.indexOf(listener) >= 0)
	  listeners.splice(listeners.indexOf(listener), 1);
    //TODO();
  },

  dispatchEvent: function(evt) {
    var listeners = this._eventListeners && this._eventListeners[evt.type];
    evt._currentTarget = this;
    if (listeners)
      listeners.forEach(function(l) { l.handleEvent(evt); });

    this.childNodes._nodes.forEach(function(c) {
      if (!evt._propagationStopped)
        c.dispatchEvent(evt);
    });
  },
};

Function.wrap(Element.prototype, ['deepClone', 'cloneNode'],
function(func, args) {
  var listeners = this._eventListeners;
  delete this._eventListeners;
  var clone = func.apply(this, args);
  listeners && (this._eventListeners = listeners);
  return clone;
});

// TODO we really should put this in Node, but we'll just put it in Element
// for now. The root reason/cause of this hack is that JS doesn't really
// support multiple inheritance.
Object.extend(Element.prototype, EventTarget);
Object.extend(Text.prototype, EventTarget);

// TODO is this where these callbacks should be defined?
// I don't like talking about document.documentElement here...
this.onmousemove = function(x, y, shift) {
  var event = new MouseEvent;
  event._type = 'mousemove';
  event._shiftKey = shift;
  event._clientX = x;
  event._clientY = y;
  document.documentElement.dispatchEvent(event);
};

this.onmousedown = function(x, y, shift) {
  //print('onmousedown');
  var event = new MouseEvent;
  event._type = 'mousedown';
  event._shiftKey = shift;
  event._clientX = x;
  event._clientY = y;
  document.documentElement.dispatchEvent(event);
};

this.onmouseup = function(x, y, shift) {
  //print('onmouseup');
  var event = new MouseEvent;
  event._type = 'mouseup';
  event._shiftKey = shift;
  event._clientX = x;
  event._clientY = y;
  document.documentElement.dispatchEvent(event);
};
