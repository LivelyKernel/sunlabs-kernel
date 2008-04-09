Object.extend(String.prototype, {

    withNiceDecimals: function() {

        // JS can't print nice decimals  // KP: I think it can be convinced, see below
        var dotIx = this.indexOf('.');
        // return unchanged unless all digits with exactly one dot
        if (dotIx < 0 || this.indexOf('.', dotIx+1) >= 0) return this;
        
        for (var i=0; i< this.length; i++) {
            if ('0123456789.'.indexOf(this[i]) < 0) return this; 
        }

        // truncate to 8 digits and trim trailing zeroes
        var ss = this.substr(0, dotIx + 8);
        var len = ss.length;

        for (var i=len-1; i>dotIx+1; i--) {
            if (ss[i] == '0') len--;
            else return ss.substr(0, len) 
        }

        return ss.substr(0,len);
    }
});


Object.extend(Class, {

    // KP: obsolete, use Object.isClass
    isClass: function(object) {
	return (object instanceof Function) 
	    && object.prototype 
	    && (object.functionNames().length > Object.functionNames().length);
    }

});




// http://www.sitepen.com/blog/2008/03/18/javascript-metaclass-programming/
Object.freeze = function(object) {

    var constr = object.constructor;
    var proto = constr.prototype
    if (constr._privatize) {    // note, doesn't work with addMethods, should be done there
	constr._privatize = { privates: {}, functions: [] };
	for (var key in proto) {
	    var value = proto[key];
	    if (key.charAt(0) === "_") {
		constr._privatize.privates[key.slice(1)] = value;
		delete proto[key];
	    } else if (Object.isFunction(value)) {
		constr._privatize.functions.push(key);
	    }
	}
    }
    var context = Object.beget(object, constr._privatize.privates);
    context.$public = object;
    
    var fns = constr._privatize.functions;
    for (var i = 0; i < fns.length; i++) {
	var fname = fns[i];
	object[fname] = object[fname].bind(context); // ouch, object-private bindings
    }

};


// boodman/crockford delegation
Object.beget = function(object, properties) {
    function Delegate(){};
    Delegate.prototype = object;
    var d = new Delegate();
    properties && Object.extend(d, properties);
    return d;
};

