/*
 * Copyright ï¿½ 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 
 
    
if (this.arguments && (arguments[0] === 'script')) {
    // if called from command line with argument 'script', we'll initialize what is needed for rhino.
    // can be run as $ jrunscript fx.js script
    if (!this.window) this.window = this;
    load('rhino-compat.js');
    load('JSON.js');
    load('miniprototype.js');
    load('Base.js');
}

// Ideally this would be the single top level variable introduced into the system.
// the name fx is short and generic. No reference to existing products necessarily implied.
// Should not make assumptions about other libraries, besides standard JS libraries (incl ES3.1)
// Could act as a capability, i.e, if the fx object is not available, various runtime things can't happen




var fx = using().run(function() { // scope function

    var fx = {};
    var BasicMixin = { // both prototpes and fx.* constructors functions get it.
	defineSlots: {
	    description: "convenience method, redirects to fx.defineSlots",
	    value: function(descriptorSet) {
		return fx.defineSlotsOf(this, descriptorSet);
	    }
	},
 
       respondsTo: {
           value: function(methodName) {
               return (this[methodName] instanceof Function);
           }
       },
       
       tryToPerform:  {
           value: function(methodName /* ...*/) {
               if (!methodName) return undefined;
               Array.prototype.shift.apply(arguments);
               if (this.respondsTo(methodName)) {
                   return this[methodName].apply(this, arguments);
               }
               return undefined;
           }
       }
	   
    };

    var ConstructorMixin = {
	// every synthetic constructor will get these
	extend: { 
	    value: function(derived) {
		// if derived not specified, lets just call the argument, which should be the superconstructor,
		// with no arguments
		derived = derived || function(superconstructor) { superconstructor()}; 
		return fx.extend(this, derived);
	    }
	},
	mixin: {
	    value: function(descriptorSet) {
		return fx.mixin(this, descriptorSet);
	    }
	},
    };
    const schemaKey = '*schema*';

    // schemas are plain objects set up to inherit from each other


     // bootstraping isues, may patch Slot to be a subclass of fx.Object
    fx.SlotDescriptor = function(name, descriptor) {
	this.name = name; // FIXME
	this.override = Boolean(descriptor.override);
	this.enumerable = Boolean(descriptor.enumerable);
    }

    Object.defineProperties(fx.SlotDescriptor.prototype, {
	toString: {
	    value: function() {
		return "SlotDescriptor[name: " + this.name  + "]";
	    }
	},

	getValue: {
	    value: function(target) {
		// for completeness here
		return target[this.name];
	    }
	}
	
    });
    

    // bootstrap fx using Object.defineProperties
    Object.defineProperties(fx, {
	
	rootSchema: { // froozen root, prototype of all schemas
	    value: Object.freeze({}),
	    writable: false
	},
	
	extend: { 
	    value: function(base, derived) {
		//"creates a new class",
		derived = derived || function(x) { return x; }
		function constr(/*...*/) {
		    // this is initialized to a new object
		    Array.prototype.unshift.call(arguments, base.bind(this));
		    derived.apply(this, arguments);
		    return this;
		}
		constr.prototype = Object.create(base.prototype);
		constr.prototype.constructor = constr;
		Object.defineProperties(constr, BasicMixin);
		return Object.defineProperties(constr, ConstructorMixin);
	    }
	},
	
	mixin: {
	    // return new class, with the mixin mixed in. 
	    // Uses prototype chaining, so mixin properties will shadow base properties
	    value: function(base, descriptorSet) {
		var hook = descriptorSet && descriptorSet.initialize && descriptorSet.initialize.value;
		function constr() {
		    base.apply(this, arguments);
		    hook && hook.call(this);
		}
		constr.prototype = Object.create(base.prototype);
		constr.prototype.constructor = constr;
		fx.defineSlotsOf(constr.prototype, descriptorSet);
		Object.defineProperties(constr, BasicMixin);
		return Object.defineProperties(constr, ConstructorMixin); 
	    }
	},

	defineSlotOf: { 
	    //new slot, i.e., member (re)definition pattern, inspired by ES3.1 Object.defineProperty
	    value: function(target, name, descriptor) {
		var previousValue = target[name];
		if (previousValue !== undefined) {
		    if (!target.hasOwnProperty(name)) {
			if (descriptor.override == false) {
			    // name is inherited and not defined locally, we want to shadow it but don't declare it
			    throw new Error('undeclared override of ' + name);
			} else if (descriptor.value instanceof Function) { // note that Safari regexps may be functions ..
			    if(!(previousValue instanceof Function)) 
				throw new Error('overriding non-function ' + name + ' with a function');
			    var defined = descriptor.value;
			    // FIXME: alloc new descriptor instead of modifying the old one?
			    descriptor.value = function wrapper() {
				Array.prototype.unshift.call(arguments, previousValue.bind(this));
				return defined.apply(this, arguments);
			    }
			}
		    } // otherwise we're overwriting own property, not present up the proto chain
		    
		} else {
		    // property is not defined anywhere
		    if (descriptor.override == true) {
			throw new Error('property ' + name + ' declared as override but nothing to override');
		    }
		}
		
		
		// we define schemas on the object (and not its constructor), since individual object's schema may
		// differ from the schema of its "constructor family" (the set of all the objects defined by a 
		// given constructor.
		
		var schema = target[schemaKey];
		if (!fx.getOwnSchemaOf(target)) {
		    // lazily create the schema, make use the existing schema or the root schema as the parent
		    schema = Object.create(target[schemaKey] || fx.rootSchema);
		    // now create the special field holding the schema
		    Object.defineProperty(target, schemaKey, { enumerable: false, value: schema});
		}
		schema[name] = new fx.SlotDescriptor(name, descriptor);
		
		return Object.defineProperty(target, name, descriptor);
		// FIXME: react to 'descriptor.observable', send updates ?
		// react to descriptor.replace, allow local replace of previously defined function?
	    }
	},

	getConstructorOf: {
	    value: function(target) {
		return Object.getPrototypeOf(target).constructor;
	    }
	},

	getOwnSchemaOf: {
	    value: function(target) {
		return target.hasOwnProperty(schemaKey) ? target[schemaKey] : undefined;
	    }
	},

	getSchemaOf: {
	    value: function(target) {
		return target[schemaKey];
	    }
	},

	defineSlotsOf: { 
	    // new member (re)definition pattern, inspired by ES3.1 Object.defineProperties
	    value: function(target, descriptorSet) {
		for (var name in descriptorSet) {
		    if (descriptorSet.hasOwnProperty(name))
			fx.defineSlotOf(target, name, descriptorSet[name]);
		}
		return target;
	    }
	}

    });

    
    fx.defineSlotsOf(fx, {
	Object: { 
	    description: "base class with fx conveniences built-in",
	    value: fx.extend(Object)
	},
	
	clone: { 
	    description: "invoke the optional filter on every source member before assigning to target",
	    value: function(source, filter) { 
		var dest = Object.create(Object.getPrototypeOf(source));
		for (var name in source) 
		    if (source.hasOwnProperty(name)) {
			// doesnt handle getters and setters
			dest[name] = filter(source, name);
		    }
		return dest;
	    }
	},
	
	shallowCopy: {
	    description: "shallow clone",
	    value: function(source, optBlacklist) {
		function filter(source, name) {
		    if (optBlacklist && optBlacklist.indexOf(name) >= 0) return undefined;
		    else return source[name];
		}
		return fx.clone(source, filter);
	    }
	},
	
	deepCopy: { 
	    description: ["clone using a default deep cloner",
			  "not terribly efficient due to apparent lack of hashcodes in javascript"],
	    value: function(source, optBlacklist) {
		// consider fast path for objects that have hashcodes
		var visited = []; // visited.lastIndexOf(object) is the index of objects' copy in the copies array
		var copies = []; 
		function cloner(source, name) {
		    if (optBlacklist && optBlacklist.indexOf(name) >= 0) return undefined;
		    var object = source[name];
		    if (typeof object === 'object') {
			var index = visited.lastIndexOf(object); // ouch, array positions as hash codes
			if (index < 0) {
			    visited.push(object);
			    var copy = fx.clone(object, cloner);
			    copies.push(copy);
			    return copy;
			}  else return copies[index];
		    } else return object; // primitive
		}
		return fx.clone(source, cloner);
	    }
	},
	
	visitPropertiesOf: { 
	    description: "visit all the own properties; untested",
	    value: function(object, visitor) { 
		for (var name in object) 
		    if (object.hasOwnProperty(name)) {
			// doesnt handle getters and setters
			visitor(object, name);
		    }
		return object;
	    }
	},
	
	
	visitAll: {
	    value: function(source, inspector) {
		// consider fast path for objects that have hashcodes
		var visited = []; 
		inspector = inspector || Functions.Empty;
		function visitor(object, name) {
		    var value = object[name];
		    // value is the value of the property
		    //var value = dereferencer(object, name); // pre-order visit
		    if (typeof value === 'object') {
			var index = visited.lastIndexOf(value); // ouch, array positions as hash codes
			if (index < 0) {
			    //print('visiting ' + value + ' with new id ' + visited.length);
			    index = visited.length;
			    visited.push(value);
			    inspector(object, name, index);
			    fx.visitPropertiesOf(value, visitor);
			} else {
			    inspector(object, name, index);
			    //print('not recursing into ' + value + ' with id ' + index);
			}
		    }  else {
			inspector(object, name, undefined);
		    }
		}
		return fx.visitPropertiesOf(source, visitor);
	    }
	}

    });

    
    // bootstrap fx.Object    
    Object.defineProperties(fx.Object.prototype, BasicMixin);
    
    // now fx.Object can define its slots itself.
    fx.Object.prototype.defineSlots({
	defineSlot: {
	    description: "convenience method, redirects to fx.defineSlot",
	    value: function(name, descriptor) {
		return fx.defineSlotOf(this, name, descriptor);
	    }
	},

	toString: {
	    value: function() {
		return "[fx.Object]";
	    }
	},
	
	getOwnSchema: {
	    value: function() {
		return fx.getOwnSchemaOf(this);
	    }
	},


	adopt: {
            definition: "make arguments's own properties receiver's own",
            value: function(object) {
		for (var name in object) {
                    if (object.hasOwnProperty(name)) 
			this[name] = object[name];
		}
		return this;
            }
	}
	
    });
    


    return fx;
});

    
if (this.arguments && (arguments[1] === 'test')) {
    using().run(function() {
	function test1() {
	    var TestObj = fx.Object.extend();
	    
	    TestObj.prototype.defineSlots({
		yo: {value: function() { print('yo') }}
	    });
	    
	    
	    var t = new TestObj();
	    t.yo();
	    print('check ' + [t instanceof TestObj]);
	    
	    var Test2 = TestObj.extend();
	    
	    var t = new Test2();
	    t.yo();
	    print('check ' + [t instanceof Test2, t instanceof TestObj]);
	    
	    var OriginalPerson = fx.Object.extend();
	    
	    OriginalPerson.prototype.defineSlots({
		sayHello: { value: function() {
		    return "Hello, my name is " + this.getName();
		}},
		getName: { value: function() {return 'Adam';}},
		tag: { value: 'OriginalPerson', override: false}
	    });
	    
	    var Person = OriginalPerson.extend(function(inherited, name) {
		inherited();
		this.getName = function() {return name || 'Anonymous';};
	    });
	    
	    Person.prototype.defineSlot('tag', { value: 'Person'});
	    Person.prototype.defineSlot('toString', { value: function() { return "aPerson"}});
	    
	    
	    var p = new Person('myself');
	    p.defineSlot('tag', {value: 'special person'});
	    print('checking p ' + [p instanceof Person, p instanceof OriginalPerson]);

	    
	    var p2 = Object.create(p);
	    p2.defineSlot('tag', {value: 'derived'});
	    print('derived is ' + p2.tag + ', ' + p2.constructor.name);
	    
	    
	    var Guru = Person.extend(function(inherited, name, topic) {
		inherited(name);
		this.getTopic = function() {return topic || 'none';}
	    });
	    //    print('guru prototype name ' + Guru.prototype.getName());
	    var God = Guru.extend(function(inherited) {
		inherited('Almighty', 'All');
	    });
	    
	    Person.prototype.defineSlot("yo", { value: function() { return "yo" } });
	    
	    var h =  new Guru('Douglas Crockford', 'JavaScript');
	    var h2 =  new Guru('Yoda', 'Something Star Wars');
	    
	    
	    print('proto sharing? ' + (Object.getPrototypeOf(h) === Object.getPrototypeOf(h2)));
	    print('checking h ' + [h instanceof Guru, h instanceof Person, h instanceof OriginalPerson]);
	    
	    print(new God() instanceof Person);
	    print('is persons prototype a person? ' + (Object.getPrototypeOf(new Person({name: 'Fred'})) instanceof Person));
	    
	    print('is Gurus prototype a Person? ' + (Object.getPrototypeOf(h) instanceof Person));
	    
	    print('is Gurus prototype a Guru? ' + (Object.getPrototypeOf(h) instanceof Guru));
	    print('is this Gurus prototype Guru.prototype? ' + (Object.getPrototypeOf(h) === Guru.prototype));
	    
	    function protochain(target, optAcc) {
		var acc = optAcc || [];
		var proto = Object.getPrototypeOf(target);
		if (proto) {
		    acc.push(proto);
		    protochain(proto, acc);
		}
		return acc;
	    }
	    
	    print(h.yo());
	    Person.prototype.defineSlot("yo", { // no override 
		value: function() { return 'whassup' }
	    });
	    print(h.yo());

	    print([h.getName(), h.getTopic()]);    
	    print([h2.getName(), h2.getTopic()]);    
	    
	    //Object.prototype.toString = function() { return this.tag};
	    print('gods chain is ' + protochain(new God()));
	    print(h.tag + ' gurus chain is ' + protochain(h));
	    print(h2.tag + ' gurus chain is ' + protochain(h));
	    
	    
	    Guru.prototype.defineSlot("yo", {
		value: function(inherited, arg) { return inherited() + "!!!" + (arg || "") }, override: true
	    });
	    print('God says ' + new God().yo(', yo'));
	    
	}
	
	test1();
	
	function test2() {
	    
	    var Morph = fx.Object.extend(function(inherited, shape) {
		this.shape = shape;
	    });
	    
	    Morph.prototype.defineSlot("getShape", { value: function() { return this.shape;}});
	    
	    var BoxMorph = Morph.extend(function BoxMorph(superconstructor, rect) {
		//console.log('BoxMorph ' + rect);
		var shape = rect;
		superconstructor(shape);
	    });
	    
	    var ContainerMorph = BoxMorph.extend(function ContainerMorph(superconstructor, shape) {
		//console.log('ContainerMorph ');
		superconstructor(shape);
	    });
	    
	    ContainerMorph.prototype.defineSlots({
		getShape: {override: true, value: function(superconstructor) {
		    console.log('hello from ContainerMorph.getShape');
		    return superconstructor();
		}},
		getBounds: { override: false, value: function() {
		    return this.getShape();
		}}
	    });
	    
	    
	    var r = new Rectangle(10,10,10,10);
	    var b = new BoxMorph(r);
	    var c = new ContainerMorph(r);
	    
	    print('shape of c is ' + c.getShape());
	    
	    print(b instanceof BoxMorph);
	    print(b instanceof Morph);
	    print(c instanceof BoxMorph);
	    
	    print(b instanceof ContainerMorph);
	    
	    print(b instanceof Rectangle);
	    print('same thing? ' + (Object.getPrototypeOf(b) === Object.getPrototypeOf(c)));
	    print('Morph schema: ' + JSON.serialize(Morph.prototype.getOwnSchema()));
	    print('BoxMorph schema: ' + JSON.serialize(Object.getPrototypeOf(b).getOwnSchema()));
	    print('ContainerMorph schema: ' + JSON.serialize(Object.getPrototypeOf(c).getOwnSchema()));
	    print('slots of c:');
	    var schema = fx.getSchemaOf(c);
	    for (var name in schema) {
		var desc = schema[name];
		print(name + ", inherited? " + Object.getPrototypeOf(c).hasOwnProperty(desc));
	    }
	}
	
	test2();
	
	function test3() {
	    
	    print(JSON.serialize(fx.deepCopy({x: {a: 10, b:'bar'}, y:'foo'})));
	    print(JSON.serialize(fx.deepCopy({x: {a: 10, b:'bar'}, y:'foo'}, ['b'])));
	    var Base = fx.Object.extend(function(inherited, name, content) {
		inherited();
		this.toString = function() { return name };
		Object.extend(this, content);
	    });
	    
	    var x = new Base('x', {a:1, b: 2});
	    var y = new Base('y', {a:3, b: 4, c: x});
	    var z = new Base('z', {a: x, b: y, c: x});
	    x.z = z;
	    var copy1 = fx.deepCopy(z);
	    //print(copy1.a.z.c);
	    print(JSON.serialize(fx.shallowCopy({x:"Hello"})));
	    print();
	    
	    var n4 = new Base('n4', {car: 4});
	    var n3 = new Base('n3', {car: 3, cdr: n4});
	    var n2 = new Base('n2', {car: 2, cdr: n3});
	    var n1 = new Base('n1', {car: 1, cdr: n2, tag: 'foo', tag2: 'bar'});
	    n4.cdr = n1;
	    false && fx.visitAll([n1], function(owner, name) { 
		var object = owner[name];
		if (name && !(object instanceof Function)) 
		    print(owner + "." + name + '=' + object) 
		return object;
	    });
	    
	    fx.visitAll([n1], function(owner, name, index) { 
		var object = owner[name];
		if (name && !(object instanceof Function)) {
		if (object instanceof Object) {
		    print('<field name=' + name + ' owner=' + index + "/>");
		}
		    //print(owner + "." + name + '=' + object + (index === undefined ? "" : '(' + index + ')'));
		}
		return object;
	    });
	}
	
	test3();

	function test4() {
	    //var C1 = fx.Object.extend(function(inherited) { inherited(); print('hello C1') });
	    var C1 = fx.Object.mixin({
		initialize: { value: function() { if (!this.quiet) print('hello from mixin C1'); }},
		say: { value: function() { print('say what?'); }}
	    });
	    
	    var C2 = C1.mixin({
		initialize: { value: function() { if (!this.quiet) print('hello from mixin C2'); }}
	    });
	    var C3 = C2.mixin({
		initialize: { value: function() { if (!this.quiet) print('hello from mixin C3'); }}
	    });
	    var c = new C3();
	    c.say();
	    // update the parent mixin, and the child will pick up the new definition
	    C2.prototype.defineSlot("say", { value: function() { print('silence') }});
	    c.quiet = true;
	    c.say();
	    //print(JSON.serialize(C2.prototype.$schema));

	}
	test4();
	
    });

}