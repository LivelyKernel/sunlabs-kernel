module('lively.OldModel').requires('lively.scene').toRun(function() {

// ===========================================================================
// MVC model support
// ===========================================================================

/**
  * @class Model
  * An MVC style model class that allows changes to be automatically
  * propagated to multiple listeners/subscribers/dependents. 
  */ 

// A typical model/view relationship is set up in the following manner:
//        panel.addMorph(m = newTextListPane(new Rectangle(200,0,200,150)));
//        m.connectModel({model: this, getList: "getMethodList", setSelection: "setMethodName"});
// The "plug" object passed to connectModel() points to the model, and converts from
// view-specific messages like getList() and setSelection() to model-specific messages
// like getMethodList() and setMethodName.  This allow a single model to have, eg,
// several list views, each viewing a different list aspect of the model.

// A number of morphs are used as views, or "widgets".  These include TextMorph,
// ListMorph, ButtonMorph, SliderMorph, etc.  Each of these morphs uses the above
// plug mechanism to get or set model values and to respond to model changes.
// these are documented in Morph.getModelValue, setModelValue, and updateView

Object.subclass('Model', {

	initialize: function(dep) { 
		// Broadcasts an update message to all dependents when a value changes.
		this.dependents = (dep != null) ? [dep] : [];
	},

	addDependent: function (dep) { 
		this.dependents.push(dep); 
	},

	removeDependent: function (dep) {
		var ix = this.dependents.indexOf(dep);
		if (ix >= 0) this.dependents.splice(ix, 1);
	},

	changed: function(varName, source) {
		// Broadcast the message "updateView" to all dependents
		// If source (a dependent) is given, we skip it (already updated)
		// If varName is not given, then null will be the aspect of the updateView()
		//console.log('changed ' + varName);
		for (var i = 0; i < this.dependents.length; i++)
			if (source !== this.dependents[i])
				this.dependents[i].updateView(varName, source);
	},

    toString: function() {
	return Strings.format("#<Model:%s>", this.dependents);
    },

    // test?
    copyFrom: function(copier, other) {
	this.dependents = [];
	other.dependents.forEach(function(dep) { this.dependents.push(copier.lookup(dep.id())) }, this);
    }

});

lively.data.Wrapper.subclass('ModelPlug', { // obsolete with CheapListMorph?
    documentation: "A 'translation' from view's variable names to model's variable names",

    initialize: function(spec) {
	var props = [];
	Properties.forEachOwn(spec, function(p) {
	    this[p] = spec[p];
	    props.push(p);
	}, this);
    },
    
    toString: function() {
	var pairs = [];
	Properties.forEachOwn(this, function(p, value) { if (p != 'model') pairs.push(p + ":" + value) });
	return "#<ModelPlug{" + pairs.join(',') + "}>";
    },

    serialize: function(modelId) {
	var rawNode = LivelyNS.create("modelPlug", {model: modelId});
	Properties.forEachOwn(this, function(prop, value) {
	    switch (prop) {
	    case 'model':
	    case 'rawNode':
		break;
	    default:
		rawNode.appendChild(LivelyNS.create("accessor", {formal: prop, actual: value}));
	    }
	}, this);
	return rawNode;
    },

    inspect: function() {
	return JSON.serialize(this);
    },

    deserialize: function(importer, rawNode) {
	for (var acc = rawNode.firstChild; acc != null;  acc = acc.nextSibling) {
	    if (acc.localName != 'accessor') continue;
	    this[LivelyNS.getAttribute(acc, "formal")] = LivelyNS.getAttribute(acc, "actual");
	}
    }
});


Model.subclass('SyntheticModel', {
    documentation: "A stereotyped model synthesized from a list of model variables",

    initialize: function($super, vars) {
	$super(null);
	if (!(vars instanceof Array)) 
	    throw new Error("wrong argument to SyntheticModel: " + vars);
	for (var i = 0; i < vars.length; i++) {
	    var v = vars[i];
	    if (v.startsWith('-') || v.startsWith('+')) 
		v = v.slice(1);
	    this.addVariable(v, null);
	}
    },

    makeGetter: function(name) {
	// functional programming is fun!
	
	return function() { 
	    return this[name]; 
	};
    },

    makeSetter: function(name) {
	return function(newValue, v) { 
	    this[name] = newValue; 
	    this.changed(this.getterName(name), v); 
	};
    },

    addVariable: function(varName, initialValue) {
	this[varName] = initialValue;
	this[this.getterName(varName)] = this.makeGetter(varName);
	this[this.setterName(varName)] = this.makeSetter(varName);
    },

    getterName: function(varName) {
	return "get" + varName;
    },

    get: function(varName) {
	var method = this[this.getterName(varName)];
	if (!method) throw new Error(this.getterName(varName) + " not present ");
	return method.call(this, varName);
    },

    setterName: function(varName) {
	return "set" + varName;
    },

    set: function(varName, value) {
	var method = this[this.setterName(varName)]
	if (!method) throw new Error(this.setterName(varName) + " not present");
	return method.call(this, varName, value);
    },

    makePlugSpecFromPins: function(pinList) {
	var spec = { model: this};
	pinList.forEach(function(decl) {
	    if (!decl.startsWith('-')) { // not read-only
		var stripped = decl.startsWith('+') ? decl.slice(1) : decl;
		spec[this.setterName(stripped)] = this.setterName(stripped);
	    }
	    if (!decl.startsWith('+')) { // not write-only
		var stripped = decl.startsWith('-') ? decl.slice(1) : decl;
		spec[this.getterName(stripped)] = this.getterName(stripped);
	    }
	}, this);
	return spec;
    },

    makePlugSpec: function() {
	// make a plug of the form {model: this, getVar1: "getVar1", setVar1: "setVar1" .. }
	var spec = {model: this};
	this.variables().forEach(function(v) { 
	    var name = this.getterName(v);
	    spec[name] = name;
	    name = this.setterName(v);
	    spec[name] = name;
	}, this);
	return spec;
    },

    variables: function() {
	return Properties.own(this).filter(function(name) { return name != 'dependents'});
    }
});

Global.ViewTrait = {
	connectModel: function(plugSpec, optKickstartUpdates) {
		// FIXME what if already connected, 
		if (plugSpec instanceof Relay) {
			// new style model
			this.formalModel = plugSpec;
			// now, go through the setters and add notifications on model
			if (plugSpec.delegate instanceof Record) 
			plugSpec.delegate.addObserversFromSetters(plugSpec.definition, this, optKickstartUpdates);
			return;
		} else if (plugSpec instanceof Record) {
			this.formalModel = plugSpec;
			plugSpec.addObserversFromSetters(plugSpec.definition, this, optKickstartUpdates);
			return;
		}
		// connector makes this view pluggable to different models, as in
		// {model: someModel, getList: "getItemList", setSelection: "chooseItem"}
		var newPlug = (plugSpec instanceof ModelPlug) ? plugSpec : new ModelPlug(plugSpec);
		
		var model = newPlug.model;
		if (!(model instanceof Model) && !this.checkModel(newPlug))
			console.log("model " + model + " is not a Model, view " + this);

		this.modelPlug = newPlug;

		if (model.addDependent) // for mvc-style updating
			model.addDependent(this);

		return this;
	},

	relayToModel: function(model, optSpec, optKickstart) {
		return this.connectModel(Relay.newInstance(optSpec || {}, model), optKickstart);
	},

	reconnectModel: function() {
		if (this.formalModel instanceof Relay) {
			// now, go through the setters and add notifications on model
			//alert('delegate ' + this.formalModel.delegate);
			if (this.formalModel.delegate instanceof Record)  {
			this.formalModel.delegate.addObserversFromSetters(this.formalModel.definition, this);
			}
		} else if (this.formalModel instanceof Record) {
			this.formalModel.addObserversFromSetters(this.formalModel.definition, this);
		} //else alert('formal model ' + this.formalModel);
	},

	checkModel: function(plugSpec) {
		// For non-models, check that all supplied handler methods can be found
		var result = true;
		Properties.forEachOwn(plugSpec, function(modelMsg, value) {
			if (modelMsg == 'model') return;
			var handler = plugSpec.model[value];
			
			if (!handler || !(handler instanceof Function)) {
			// console.log
			alert("Supplied method name, " + value + " does not resolve to a function.");
			result = false;
			}
		});
		return result;
	},

	disconnectModel: function() {
		var model = this.getModel();
		if (model && model.removeDependent) // for mvc-style updating
			model.removeDependent(this);
	},

	getModel: function() {
		var plug = this.getModelPlug();
		return plug ? plug.model : this.getActualModel();
	},

	getActualModel: function() {
		return this.formalModel instanceof Relay ? this.formalModel.delegate : this.formalModel;
	},
	
	getModelPlug: function() { 
		var plug = this.modelPlug;
		return (plug && plug.delegate) ?  plug.delegate : plug;
	},

	getModelValue: function(functionName, defaultValue) {
		// functionName is a view-specific message, such as "getList"
		// The model plug then provides a reference to the model, as well as
		// the specific model accessor for the aspect being viewed, say "getItemList"
		// Failure at any stage will return the default value.
		// TODO: optionally verify that variable name is listed in this.pins
		if (this.formalModel) {  
			// snuck in compatiblitiy with new style models
			var impl = this.formalModel[functionName];
			return impl ? impl.call(this.formalModel) : defaultValue;
		}
		
		var plug = this.getModelPlug();
		if (plug == null || plug.model == null || functionName == null) return defaultValue;
		var func = plug.model[plug[functionName]];
		if (func == null) return defaultValue;
		return func.call(plug.model); 
	},

	setModelValue: function(functionName, newValue) {
		// functionName is a view-specific message, such as "setSelection"
		// The model plug then provides a reference to the model, as well as
		// the specific model accessor for the aspect being viewed, say "chooseItem"
		// Failure at any stage is tolerated without error.
		// Successful sets to the model supply not only the newValue, but also
		// a reference to this view.  This allows the model's changed() method
		// to skip this view when broadcasting updateView(), and thus avoid
		// needless computation for a view that is already up to date.
		// TODO: optionally verify that variable name is listed in this.pins
		if (this.formalModel) { 
			// snuck in compatiblitiy with new style models
			var impl = this.formalModel[functionName];
			return impl && impl.call(this.formalModel, newValue);
		}
		var plug = this.getModelPlug();
		if (plug == null || plug.model == null || functionName == null) return null;
		var func = plug.model[plug[functionName]];
		if (func == null) return null;
		func.call(plug.model, newValue, this);
		return plug[functionName];
	},

	updateView: function(aspect, controller) {
		// This method is sent in response to logic within the model executing
		//	 this.changed(aspect, source)
		// The aspect used is the name of the get-message for the aspect
		// that needs to be updated in the view (and presumably redisplayed)
		// All actual view morphs will override this method with code that
		// checks for their aspect and does something useful in that case.
	},
};

Object.subclass('View', ViewTrait, {

    initialize: function(modelPlug) {
		if (modelPlug)
			this.connectModel(modelPlug);
    },

    toString: function() {
		return "#<" + this.constructor.getOriginal().type + ">";
    },

});

// Krzysztof's model
(function addRecordStuffToWrapper() { // FIXME refactor
	Class.addMixin(lively.data.DOMRecord, lively.data.Wrapper.prototype);
	Class.addMixin(lively.data.DOMNodeRecord, lively.data.Wrapper.prototype);
})();


}) // end of module