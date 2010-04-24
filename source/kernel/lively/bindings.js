module('lively.bindings').requires().toRun(function() {

Object.subclass('AttributeConnection', {

	initialize: function(sourceObj, attrName, targetObj, targetMethodName, converter) {
		this.sourceObj = sourceObj;
		this.sourceAttrName = attrName;
		this.targetObj = targetObj;
		this.targetMethodName = targetMethodName;
		// when converter function references objects from its environment we can't
		// serialize it. To fail as early as possible we will serialize the converter
		// already here
		this.converter = converter ? eval('(' + converter.toString() + ')') : null
	},

	getTargetObj: function() { return this.targetObj },

	getSourceObj: function() { return this.sourceObj },

	getSourceAttrName: function() { return this.sourceAttrName },

	getTargetMethodName: function() { return this.targetMethodName },

	privateAttrName: function(attrName) { return '$$' + attrName },

	connect: function() {
		var existing = this.getExistingConnection()
		if (existing !== this) {
			// when existing == null just add new connection
			// when existing === this then connect was called twice or we are
			//    in deserialization. Just do nothing then.
			existing && existing.disconnect();
			this.addAttributeConnection();
		}
		var setter = this.sourceObj.__lookupSetter__(this.sourceAttrName);
		if (!setter)
			this.addSourceObjGetterAndSetter()
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
			this.removeSourceObjGetterAndSetter()
	},

	addSourceObjGetterAndSetter: function() {
		var
			sourceObj = this.sourceObj,
			sourceAttrName = this.sourceAttrName,
			newAttrName = this.privateAttrName(sourceAttrName);

		if (sourceObj[newAttrName])
			throw new Error('newAttrName ' + newAttrName + ' already exists. Are there already other connections?');

		// add new attr to the serialization ignore list
		if (sourceObj.doNotSerialize !== undefined && sourceObj.doNotSerialize.push)
			sourceObj.doNotSerialize.push(newAttrName);

		// assign old value to new slot
		sourceObj[newAttrName] = sourceObj[sourceAttrName];

		this.sourceObj.__defineSetter__(sourceAttrName, function(newVal) {
			sourceObj[newAttrName] = newVal;
			if (sourceObj.attributeConnections === undefined)
				throw new Error('Sth wrong with sourceObj, has no attributeConnections')
			for (var i = 0; i < sourceObj.attributeConnections.length; i++) {
				var c = sourceObj.attributeConnections[i];
				if (c.getSourceAttrName() == sourceAttrName)
					c.update(newVal);
			}
		})

		this.sourceObj.__defineGetter__(this.sourceAttrName, function() {
			return sourceObj[newAttrName];
		})
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
		if (!this.sourceObj.attributeConnections) return null;
		return this.sourceObj.attributeConnections.detect(function(con) {
			return this.isSimilarConnection(con);
		}, this);
	},

	update: function(newValue) {
		if (this.isRecursivelyActivated()) return;
		try {
			this.activate();
			if (this.converter)
				newValue = this.converter.call(this, newValue);
			if (Object.isFunction(this.targetObj[this.targetMethodName]))
				this.targetObj[this.targetMethodName](newValue);
			else
				this.targetObj[this.targetMethodName] = newValue;
		} catch(e) {
			console.warn('Error when trying to update ' + this + ' with value ' + newValue + ':\n' + e);
		} finally {
			this.deactivate();
		}
	},
	isRecursivelyActivated: function() {
		// is this enough? Maybe use Stack?
		return this.isActive
	},

	activate: function() { this.isActive = true },

	deactivate: function() { this.isActive = false },

	isSimilarConnection: function(other) {
		if (!other) return;
		if (other.constructor != this.constructor) return false;
		return this.sourceObj == other.sourceObj &&
			this.sourceAttrName == other.sourceAttrName &&
			this.targetObj == other.targetObj &&
			this.targetMethodName == other.targetMethodName
	},

	onSourceAndTargetRestored: function() {
		if (!this.sourceObj || !this.targetObj) return;
		this.connect();
		// now cleanup and remove the meta AttributeConnections
		this.attributeConnections.forEach(function(ea) { ea.disconnect() });
	},

	toString: function() {
		return Strings.format('AttributeConnection(%s.%s --> %s.%s())',
			this.getSourceObj(),
			this.getSourceAttrName(),
			this.getTargetObj(),
			this.getTargetMethodName());
	},

});

AttributeConnection.addMethods({
	toLiteral: function() {
		if (!this.sourceObj.id || !this.targetObj.id)
			throw dbgOn(new Error('Cannot serialize objects having no id'));

		return {
			sourceObj: this.sourceObj.id(),
			sourceAttrName: this.sourceAttrName,
			targetObj: this.targetObj.id(),
			targetMethodName: this.targetMethodName,
			converter: this.converter ? this.converter.toString() : null
		};
	}
})

Object.extend(AttributeConnection, {
	fromLiteral: function(literal, importer) {
		if (!importer)
			throw new Error('AttributeConnection needs importer for resolving uris!!!');

		// just create the connection, connection not yet installed!!!
		var con = new AttributeConnection(null, literal.sourceAttrName,	null, literal.targetMethodName, literal.converter);

		importer.addPatchSite(con, 'sourceObj', literal.sourceObj);
		importer.addPatchSite(con, 'targetObj', literal.targetObj);

		new AttributeConnection(con, 'sourceObj', con, 'onSourceAndTargetRestored').connect();
		new AttributeConnection(con, 'targetObj', con, 'onSourceAndTargetRestored').connect();

		return con;
	}
});

Object.extend(Global, {
	
	connect: function connect(sourceObj, attrName, targetObj, targetMethodName, converter) {
		return new AttributeConnection(sourceObj, attrName, targetObj, targetMethodName, converter).connect();
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
	
	updateAttributeConnection: function(sourceObj, attrName, newVal) {
		if (!sourceObj.attributeConnections) return;
		for (var i = 0; i < sourceObj.attributeConnections.length; i++) {
			var c = sourceObj.attributeConnections[i];
			if (c.getSourceAttrName() == attrName) c.update(newVal);
		}
	},

})

}); // end of module