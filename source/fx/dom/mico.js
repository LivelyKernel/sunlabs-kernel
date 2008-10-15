// TODO where should this go?
var TODO = function() {
  var e = new Error;
  e.message = 'Not yet implemented:\n' + e.stack;
  throw e;
};

// TODO in some JS environs (FF 3.0?), we have to
// delete the getter/setter before we overwrite it.
Object.extend = function(destination, source) {
  for (var property in source) {
    var getter = source.__lookupGetter__(property);
    if (getter)
      destination.__defineGetter__(property, getter);
    var setter = source.__lookupSetter__(property);
    if (setter)
      destination.__defineSetter__(property, setter);
    if (!getter && !setter)
      destination[property] = source[property];
  }
  return destination;
};

// TODO this probably needs some testing and refining
Object.deepClone = function(original /*, blacklist */) {
  var blacklist = Array.prototype.slice.call(arguments, 1);
  var clone = original;

  if (original && typeof original == 'object') {
    if (original instanceof Array) {
      clone = new Array(original.length);
      for (var i = 0; i < original.length; i++)
        clone[i] = (original[i] && original[i].deepClone) ?
                   original[i].deepClone() : Object.deepClone(original[i]);
    }
    else {
      clone = {};
      clone.__proto__ = original.__proto__;
	//clone.constructor = original.constructor;

      for (var p in original) {
	  if (!original.hasOwnProperty(p)) continue;
        if (blacklist.indexOf(p) != -1)
          continue;
        var getter = original.__lookupGetter__(p);
        if (getter)
          clone.__defineGetter__(p, getter);
        var setter = original.__lookupSetter__(p);
        if (setter)
          clone.__defineSetter__(p, setter);
        if (!getter && !setter)
          clone[p] = (original[p] && original[p].deepClone) ?
                     original[p].deepClone() : Object.deepClone(original[p]);
      }
    }
  }
  return clone;
};

Function.wrap = function(object, funcs, wrapper) {
  [].concat(funcs).forEach(function(f) {
    var func = object[f]
    object[f] = function() {
      return wrapper.call(this, func, arguments);
    }
  });
};

Function.wrapSetter = function(object, funcs, wrapper) {
  [].concat(funcs).forEach(function(f) {
    var func = object.__lookupSetter__(f)
    object.__defineSetter__(f, function() {
      return wrapper.call(this, func, arguments);
    });
  });
};
