module('lively.bindings').requires().toRun(function() {

Object.subclass('AttributeConnection',
'initializing', {

	initialize: function(source, sourceProp, target, targetProp, spec) {
		this.sourceObj = source;
		this.sourceAttrName = sourceProp;
		this.targetObj = target;
		this.targetMethodName = targetProp;
		if (spec) {
			this.removeAfterUpdate = spec.removeAfterUpdate;
			// when converter function references objects from its environment we can't
			// serialize it. To fail as early as possible we will serialize the converter
			// already here
			this.converterString = spec.converter ? spec.converter.toString() : null;
			this.updaterString = spec.updater ? spec.updater.toString() : null;
		}
	},

	onSourceAndTargetRestored: function() {
		if (this.sourceObj && this.targetObj) this.connect();
	},

	copy: function(copier) {
		return AttributeConnection.fromLiteral(this.toLiteral(), copier);
	},

},
'accessing', {

	getTargetObj: function() { return this.targetObj },

	getSourceObj: function() { return this.sourceObj },

	getSourceAttrName: function() { return this.sourceAttrName },

	getTargetMethodName: function() { return this.targetMethodName },
	getConverter: function() {
		if (!this.converterString) return null;
		if (!this.converter) {
			this.converter = eval('(' + this.converterString + ')');
		}
		return this.converter;
	},
	getUpdater: function() {
		if (!this.updaterString) return null;
		if (!this.updater) {
			this.updater = eval('(' + this.updaterString + ')');
		}
		return this.updater;
	},

	privateAttrName: function(attrName) { return '$$' + attrName },

	activate: function() { this.isActive = true },

	deactivate: function() { this.isActive = false },

},
'connecting', {

	connect: function() {
		var existing = this.getExistingConnection()
		if (existing !== this) {
			// when existing == null just add new connection
			// when existing === this then connect was called twice or we are
			//    in deserialization. Just do nothing then.
			existing && existing.disconnect();
			this.addAttributeConnection();
		}

		var methodOrValue = this.sourceObj[this.sourceAttrName];
		if (Object.isFunction(methodOrValue)) {
			if (!methodOrValue.isWrapped)
				this.addConnectionWrapper(this.sourceObj, this.sourceAttrName);
			return this;
		}

		var setter = this.sourceObj.__lookupSetter__(this.sourceAttrName);
		if (!setter) this.addSourceObjGetterAndSetter()
		return this;
	},

	disconnect: function() {
		var obj = this.sourceObj;
		if (!obj.attributeConnections) return;
		obj.attributeConnections = obj.attributeConnections.reject(function(con) {
			return this.isSimilarConnection(con);
		}, this);
		var connectionsWithSameSourceAttr = obj.attributeConnections.select(function(con) {
			return this.getSourceAttrName() == con.getSourceAttrName();
		}, this);
		if (connectionsWithSameSourceAttr.length == 0)
			this.removeSourceObjGetterAndSetter();
	},

	update: function(newValue, oldValue) {
		// This method is optimized for Safari and Chrome. See Tests.BindingsTest.BindingsProfiler
		// and http://lively-kernel.org/repository/webwerkstatt/draft/ModelRevised.xhtml
		// The following requirements exists:
		// - run converter with oldValue and newValue
		// - when updater is existing run converter only if update is proceeded
		// - bind is slow
		// - arguments is slow when it's items are accessed or it's converted using $A

		if (this.isActive/*this.isRecursivelyActivated()*/) return;
		this.isActive = true; // this.activate();
		var connection = this, updater = this.getUpdater(), converter = this.getConverter(),
			target = this.targetObj, propName = this.targetMethodName;
		if (!target || !propName) {
			console.error('Cannot update ' + this.toString(newValue) + ' because of no target or targetProp');
			return
		}
		var targetMethod = target[propName], callOrSetTarget = function(newValue) {
				// use a function and not a method to capture this in self and so that no bind is necessary
				// and oldValue is accessible. Note that when updater calls this method arguments can be
				// more than just the new value
				if (converter) newValue = converter.call(connection, newValue, oldValue);
				var result = (typeof targetMethod === 'function') ?
					targetMethod.apply(target, arguments) :
					target[propName] = newValue;
				if (connection.removeAfterUpdate) connection.disconnect();
				return result;
			};

		try {
			// console.log(this.toString(newValue));
			return updater ?
				updater.call(this, callOrSetTarget, newValue, oldValue) :
				callOrSetTarget(newValue);		
		} catch(e) {
			dbgOn(Config.debugConnect);
			console.warn('Error when trying to update ' + this + ' with value '
				+ newValue + ':\n' + e + '\n' + e.stack);
		} finally {
			this.isActive = false;
		}
	},

},
'private helper', {

	addSourceObjGetterAndSetter: function() {
		var sourceObj = this.sourceObj,
			sourceAttrName = this.sourceAttrName,
			newAttrName = this.privateAttrName(sourceAttrName);

		if (sourceObj[newAttrName])
			console.warn('newAttrName ' + newAttrName + ' already exists. Are there already other connections?');
			
		// add new attr to the serialization ignore list
		if (sourceObj.doNotSerialize !== undefined && sourceObj.doNotSerialize.push)
			sourceObj.doNotSerialize.push(newAttrName);

		if (sourceObj.doNotCopyProperties !== undefined && sourceObj.doNotCopyProperties.push)
			sourceObj.doNotCopyProperties.push(newAttrName);

		// assign old value to new slot
		sourceObj[newAttrName] = sourceObj[sourceAttrName];

		this.sourceObj.__defineSetter__(sourceAttrName, function(newVal) {
			var oldVal = sourceObj[newAttrName];
			sourceObj[newAttrName] = newVal;
			if (sourceObj.attributeConnections === undefined)
				throw new Error('Sth wrong with sourceObj, has no attributeConnections')
			for (var i = 0; i < sourceObj.attributeConnections.length; i++) {
				var c = sourceObj.attributeConnections[i];
				if (c.getSourceAttrName() === sourceAttrName)
					c.update(newVal, oldVal);
			}
			return newVal;
		})

		this.sourceObj.__defineGetter__(this.sourceAttrName, function() {
			return sourceObj[newAttrName];
		})
	},

	addConnectionWrapper: function(sourceObj, methodName) {
		var origMethod = sourceObj[methodName];

		if (!Object.isFunction(origMethod))
			throw new Error('addConnectionWrapper didnt get a method to wrap')

		sourceObj[this.privateAttrName(methodName)] = origMethod; // save so that it can be restored
		sourceObj[methodName] = function() {
			if (sourceObj.attributeConnections === undefined)
				throw new Error('Sth wrong with sourceObj, has no attributeConnections')
			var result = origMethod.apply(sourceObj, arguments);
			for (var i = 0; i < sourceObj.attributeConnections.length; i++) {
				var c = sourceObj.attributeConnections[i];
				if (c.getSourceAttrName() === methodName)
					result = c.update(result);
			}
			return result;
		}

		sourceObj[methodName].isWrapped = true;
		sourceObj[methodName].originalFunction = origMethod; // for getOriginal()
	},

	removeSourceObjGetterAndSetter: function() {
		// delete the getter and setter and the slot were the real value was stored
		// assign the real value to the old slot
		var attrName = this.privateAttrName(this.sourceAttrName);
		delete this.sourceObj[this.sourceAttrName];
		this.sourceObj[this.sourceAttrName] = this.sourceObj[attrName];
		delete this.sourceObj[attrName];
	},

	addAttributeConnection: function() {
		if (!this.sourceObj.attributeConnections)
			this.sourceObj.attributeConnections = [];
		this.sourceObj.attributeConnections.push(this);
	},

	getExistingConnection: function() {
		var conns = this.sourceObj.attributeConnections;
		if (!conns) return null;
		for (var i = 0; i < conns.length; i++)
			if (this.isSimilarConnection(conns[i]))
				return conns[i];
	},
},
'testing', {

	isRecursivelyActivated: function() {
		// is this enough? Maybe use Stack?
		return this.isActive
	},

	isSimilarConnection: function(other) {
		if (!other) return;
		if (other.constructor != this.constructor) return false;
		return this.sourceObj == other.sourceObj &&
			this.sourceAttrName == other.sourceAttrName &&
			this.targetObj == other.targetObj &&
			this.targetMethodName == other.targetMethodName
	},
},
'debugging', {
	toString: function(optValue) {
		try {
			return Strings.format('AttributeConnection(%s.%s %s %s.%s)',
				this.getSourceObj(),
				this.getSourceAttrName(),
				optValue ? ('-->' + String(optValue) + '-->') : '-->',
				this.getTargetObj(),
				this.getTargetMethodName());
		} catch(e) {
			return '<Error in AttributeConnection>>toString>';
		}
	},
});

AttributeConnection.addMethods({
	toLiteral: function() {
		var self  = this;
		function getId(obj) {
			if (!obj) {
				console.warn('Cannot correctly serialize connections having undefined source or target objects');
				return null;
			}
			if (obj.id && Object.isFunction(obj.id))
				return obj.id();
			if (obj.nodeType && obj.getAttribute) { // is it a real node?
				var id = obj.getAttribute('id')
				if (!id) { // create a new id
					var id = 'ElementConnection--' + lively.data.Wrapper.prototype.newId();
					obj.setAttribute('id', id);
				}
				return id;
			}
			console.warn('Cannot correctly serialize connections having source or target objects that have no id: ' + self);
			return null
		}
		return {
			sourceObj: getId(this.sourceObj),
			sourceAttrName: this.sourceAttrName,
			targetObj: getId(this.targetObj),
			targetMethodName: this.targetMethodName,
			converter: this.converterString,
			updater: this.updaterString,
			removeAfterUpdate: this.removeAfterUpdate,
		};
	},
})

Object.extend(AttributeConnection, {
	fromLiteral: function(literal, importer) {
		if (!importer)
			throw new Error('AttributeConnection needs importer for resolving uris!!!');

		// just create the connection, connection not yet installed!!!
		var con = new AttributeConnection(
			null, literal.sourceAttrName, null, literal.targetMethodName, {
				updater: literal.updater,
				converter: literal.converter,
				removeAfterUpdate: literal.removeAfterUpdate,
			});

		// when target/source obj are restored asynchronly
		new AttributeConnection(con, 'sourceObj', con, 'onSourceAndTargetRestored',
			{removeAfterUpdate: true}).connect();
		new AttributeConnection(con, 'targetObj', con, 'onSourceAndTargetRestored',
			{removeAfterUpdate: true}).connect();

		function restore(id, fieldName) {
			if (!id) {
				console.warn('cannot deserialize ' + fieldName + ' when deserilaizing a lively.bindings.connect');
				return
			}
			if (id.split('--')[0] == 'ElementConnection') { // FIXME brittle!!!
				con[fieldName] = importer.canvas().ownerDocument.getElementById(id);
				return
			}
			importer.addPatchSite(con, fieldName, id);
		};

		restore(literal.sourceObj, 'sourceObj');
		restore(literal.targetObj, 'targetObj');

		return con;
	}
});

Object.extend(lively.bindings, {
	
	connect: function connect(sourceObj, attrName, targetObj, targetMethodName, specOrConverter) {
		if (Object.isFunction(specOrConverter)) {
			console.warn('Directly passing a converter function to connect() is deprecated! Use spec object instead!');
			spec = {converter: specOrConverter};
		} else {
			spec = specOrConverter;
		}
		return new AttributeConnection(sourceObj, attrName, targetObj, targetMethodName, spec).connect();
	},
	
	disconnect: function(sourceObj, attrName, targetObj, targetMethodName) {
		if (!sourceObj.attributeConnections) return;
		sourceObj.attributeConnections.select(function(con) {
			return 	con.getSourceAttrName() == attrName &&
					con.getTargetObj() === targetObj &&
					con.getTargetMethodName() == targetMethodName;
		}).forEach(function(con) { con.disconnect() });
	},
	
	disconnectAll: function(sourceObj) {
		if (!sourceObj.attributeConnections) return;
		while (sourceObj.attributeConnections.length > 0)
			sourceObj.attributeConnections[0].disconnect()
	},
	
	signal: function(sourceObj, attrName, newVal) {
		if (!sourceObj.attributeConnections) return;
		var oldVal = sourceObj[attrName];
		for (var i = 0; i < sourceObj.attributeConnections.length; i++) {
			var c = sourceObj.attributeConnections[i];
			if (c.getSourceAttrName() == attrName) c.update(newVal, oldVal);
		}
	},

	callWhenNotNull: function(sourceObj, sourceProp, targetObj, targetSelector) {
		// ensure that sourceObj[sourceProp] is not null, then run targetObj[targetProp]()
		if (sourceObj[sourceProp])
			targetObj[targetSelector](sourceObj[sourceProp])
		else
			lively.bindings.connect(sourceObj, sourceProp, targetObj, targetSelector, {removeAfterUpdate: true})
	},
})

Object.extend(Global, {
	connect: lively.bindings.connect,
	disconnect: lively.bindings.disconnect,
	disconnectAll: lively.bindings.disconnectAll,
	signal: lively.bindings.signal,
	updateAttributeConnection: lively.bindings.signal,
});
Morph.addMethods('plugs', {

	plugTo: function(model, connectSpec) {
		// experimental protocol
		// This message preserves the model-view "plug" API of MVC's pluggable views,
		// while using the "direct connect" form of change notification
		var view = this;

		function parseStringSpec(stringSpec) {
			var parsed = stringSpec.match(/(<?->?)(.*)/);
			return {dir: parsed[1], name: parsed[2]};
		};

		Properties.forEachOwn(connectSpec, function (viewProp, spec) {
			if (Object.isString(spec)) spec = parseStringSpec(spec);
			var dir = spec.dir || '->',
				options = spec.options || {};
			if (dir == "->" || dir == "<->")
				lively.bindings.connect(view, viewProp, model, spec.name, options)
			if (dir == "<-" || dir == "<->")
				lively.bindings.connect(model, spec.name, view, viewProp, options)
		});

		return this;
    },

});
	
}); // end of module