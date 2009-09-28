module('ParserSupport.js').requires().toRun(function() {

Object.subclass('StNode', {

	toString: function() {
		return 'StNode';
	},

});

StNode.subclass('StAssignmentNode', {
	
	isAssignment: true,
	
	initialize: function($super, variable, value) {
		$super();
		this.variable = variable;
		this.value = value;
	},

	toString: function() {
		return Strings.format('Assignment(%s=%s)', this.variable.toString(), this.value.toString());
	},
});

StNode.subclass('StCascadeNode', {
	
	isCascade: true,
	
	initialize: function($super, messages, receiver) {
		$super();
		this.messages = messages;
		this.receiver = receiver;
	},

	toString: function() {
		return Strings.format('Cascade(%s,[%s])',
			this.receiver.toString(),
			this.messages.collect(function(ea) { return ea.toString() }).join(','));
	}
});

StNode.subclass('StMessageNode', {
	
	isMessage: true,
	
	initialize: function($super, messageName, args, receiver) {
		$super();
		this.messageName = messageName;
		this.args = args;
		this.receiver = receiver;
	},
	
	setReceiver: function(receiver) {
		this.receiver = receiver;
	},

});

StMessageNode.subclass('StUnaryMessageNode', {
	
	isUnary: true,

	toString: function() {
		return Strings.format('Msg(%s.%s)',
			this.receiver.toString(),
			this.messageName);
	},

});

StMessageNode.subclass('StBinaryMessageNode', {

	isBinary: true,

	toString: function() {
		return Strings.format('Msg(%s %s %s)',
			this.receiver.toString(),
			this.messageName,
			this.args.first().toString());
	},
});

StMessageNode.subclass('StKeywordMessageNode', {

	isKeyword: true,

	toString: function() {
		return Strings.format('Msg(%s.%s(%s))',
			this.receiver.toString(),
			this.messageName,
			this.args ? this.args.collect(function(ea) { return ea.toString() }).join(',') : 'no args');
	},

});

StNode.subclass('StSequenceNode', {
	isSequence: true,
	
	initialize: function($super, children) {
		$super();
		this.children = children;
	},

	toString: function() {
		return Strings.format('Sequence(%s statements)',
			this.children.length);
	},
});

StNode.subclass('StPropertyNode', { /* for JS->St */
	
	isProperty: true,
	
	initialize: function($super, assignment) {
		$super();
		this.assignment = assignment;
		this.isMeta = false;
	},
	
	setMeta: function(isMeta) {
		this.isMeta = isMeta;
	},

});

StNode.subclass('StInvokableNode', {
	
	isMethod: false,
	
	isBlock: true,
	
	initialize: function($super, sequence, args, declaredVars) {
		$super();
		this.args = args;
		this.sequence = sequence;
		this.declaredVars = declaredVars;
		this.isMeta = null;
		this.methodName = null;
	},
	
	setMethodName: function(methodName) {
		this.isBlock = false;
		this.isMethod = true;
		this.methodName = methodName;
	},

	setArgs: function(args) {
		this.args = args;
	},
	
	setMeta: function(isMeta) {
		if (this.isBlock) throw dbgOn(new Error('StBlockNode cannot be meta/non meta'))
		this.isMeta = isMeta;
	},

	toString: function() {
		return Strings.format('Method(%s(%s)%s)',
			this.methodName ? this.methodName : 'BLOCK',
			this.args ? this.args.collect(function(ea) { return ea.toString() }).join(',') : 'none',
			this.isMeta ? 'isMeta' : '')
	},

});

StInvokableNode.subclass('StPrimitveMethodNode', {
	
	isMethod: true,
	
	isPrimitive: true,
	
	initialize: function($super, methodName, isMeta, args, primitiveBody) { //---------???????
		$super(methodName, isMeta, args, null, null);
		this.primitiveBody = primitiveBody;
	},

	toString: function() {
		return Strings.format('PrimitiveMethod(%s)',
			this.methodName);
	},

});

StNode.subclass('StClassNode', {
	
	isClass: true,
	
	initialize: function($super, className, methodsAndProperties, superclassName) {
		$super();
		this.className = className;
		this.superclassName = superclassName;
		this.methods = [];
		this.properties = [];
		methodsAndProperties.forEach(function(ea) {
			ea.isMethod ? this.methods.push(ea) : this.properties.push(ea);
		}, this);
	},

	toString: function() {
		return Strings.format('Class(%s)',
			this.className);
	},

});

StNode.subclass('StVariableNode', {
	
	isVariable: true,
	
	initialize: function($super, name) {
		$super();
		this.name = name;
	},

	toString: function() {
		return Strings.format('Var(%s)',
			this.name);
	},
});

StVariableNode.subclass('StInstanceVariableNode', {
	
	isInstance: true,

});

StNode.subclass('StLiteralNode', {
	
	isLiteral: true,
	
	initialize: function($super, value) {
		$super();
		this.value = value;
	},

	toString: function() {
		return 'Literal(' + (this.value ? this.value.toString() : 'UNDEFINED!') + ')';
	},

});

});