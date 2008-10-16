Object.subclass('Event', {
    get type() { return this._type; },
    get currentTarget() { return this._currentTarget; },
    //...
    stopPropagation: function() { this._propagationStopped = true; },
    preventDefault: function() { /* no default to prevent?*/ },
    toString: function() { return this._type; }
});

Event.subclass('MouseEvent', {
    get shiftKey() { return this._shiftKey; },
    get altKey()  { return this._altKey; },
    get clientX() { return this._clientX; },
    get clientY() { return this._clientY; },
    toString: function() { return this._type + "@" + pt(this._clientX, this._clientY); }
});

  //FIXME: check standards

Event.subclass('KeyboardEvent', {
    get keyCode() { return this._keyCode },
    get charCode() {  return this._keyChar; }
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
