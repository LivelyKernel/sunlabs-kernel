/*
 * Copyright (c) 2006-2009 Sun Microsystems, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */


module('ParserSupport.js').requires().toRun(function() {

Object.subclass('StNode', {

	toString: function() {
		return 'StNode';
	},

	toSmalltalk: function() {
		return '';
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
	
	toSmalltalk: function() {
		return this.variable.name + ' := ' + this.value.toSmalltalk();
	}
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
	},
	
	toSmalltalk: function() {
		var recv = this.receiver.toSmalltalk();
		var rest = this.messages.collect(function(ea) {
			var part = ea.toSmalltalk();
			part = part.slice(recv.length);
			while (part[0] == ' ') part = part.slice(1);
			return '\t' + part;
		}).join(';\n');
		return recv + '\n' + rest;
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

	toSmalltalk: function() {
		return this.receiver.toSmalltalk() + ' ' + this.messageName;
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
	
	toSmalltalk: function() {
		var arg = this.args.first();
		var argString = arg.toSmalltalk();
		if (arg.isBinary || arg.isKeyword)
			argString = '(' + argString + ')';
		var receiverString = this.receiver.toSmalltalk();
		if (this.receiver.isKeyword)
			receiverString = '(' + receiverString + ')';
		return Strings.format('%s %s %s',
			receiverString,
			this.messageName,
			argString);
	}
});

StMessageNode.subclass('StKeywordMessageNode', {

	isKeyword: true,

	toString: function() {
		return Strings.format('Msg(%s.%s(%s))',
			this.receiver.toString(),
			this.messageName,
			this.args ? this.args.collect(function(ea) { return ea.toString() }).join(',') : 'no args');
	},
	
	toSmalltalk: function() {
		var result = this.receiver.toSmalltalk();
		if (this.receiver.isKeyword) result = '(' + result + ')';
		result += ' ';
		var messageParts = this.messageName.split(':');
		messageParts.pop(); //last is nothing
		result += messageParts.zip(this.args).collect(function(ea) {
			var arg;
			if (ea[1]) {
				arg = ea[1].toSmalltalk();
				if (ea[1].isKeyword) arg = '(' + arg + ')';
			} else {
				arg = 'nil';
			}
			return ea[0] + ': ' + arg;
		}).join(' ');
		return result;
	}

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
	
	toSmalltalk: function(indent) {
		indent = indent ? indent : '';
		if (!this.children || this.children.length == 0) return '';
		return this.children.collect(function(ea) { return ea.toSmalltalk() }).join('.' + indent) + '.';
	}
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
	
	toSmalltalk: function() {
		return (this.isMeta ? '+ ' : '- ') + this.assignment.toSmalltalk() + '.';
	}

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
	
	methodHeadString: function() {
		var result = this.isMeta ? '+ ' : '- ';
		if (!this.args || this.args.length == 0) return result + this.methodName;
		if (this.args.length == 1) return result + this.methodName + ' ' + this.args.first();
		var methodNameParts = this.methodName.split(':');
		methodNameParts.pop(); // last is nothing
		result += methodNameParts.zip(this.args).collect(function(ea) {
			return ea[0] + ': ' + ea[1]
		}).join(' ');
		return result;
	},
	
	declaredVarsString: function(indent) {
		indent = indent ? indent : '';
		if (!this.declaredVars || this.declaredVars.length == 0) return '';
		return indent + Strings.format('| %s |' + indent,
			this.declaredVars.collect(function(ea) {return ea.toSmalltalk()}).join(' '));
	},
		
	toSmalltalk: function() {
		var result = '';
		if (this.isMethod) {
			result += this.methodHeadString() + '\n\t';
			result += this.declaredVarsString('\n\t');
			result += this.sequence.toSmalltalk('\n\t');
			return result;
		}
		result += '[';
		if (this.args && this.args.length > 0)
			result += ':'+ this.args.collect(function(ea) { return ea }).join(' :') + ' | ';
		result += this.declaredVarsString();
		result += ' ';
		result += this.sequence.toSmalltalk();
		result += ']'
		return result;
	}

});

StInvokableNode.subclass('StPrimitveMethodNode', {
	
	isMethod: true,
	
	isPrimitive: true,
	
	initialize: function($super, methodName, primitiveBody, args) {
		$super(null, args, null);
		this.setMethodName(methodName);
		this.primitiveBody = primitiveBody;
	},

	toString: function() {
		return Strings.format('PrimitiveMethod(%s)',
			this.methodName);
	},
	
	toSmalltalk: function() {
		return this.methodHeadString() + ' ' + this.primitiveBody;
	}

});

StNode.subclass('StClassNode', {
	
	isClass: true,
	
	initialize: function($super, className, methodsAndProperties, superclass) {
		$super();
		this.className = className;
		this.superclass = superclass;
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
	
	toSmalltalk: function() {
		var result = '<' + this.className.value;
		if (this.superclass) result += ':' + this.superclass.toSmalltalk();
		result += '>\n\n';
		if (this.properties.length > 0) {
			result += this.properties.collect(function(ea) { return ea.toSmalltalk() }).join('\n\n');
			result += '\n\n';
		}
		if (this.methods.length > 0) {
			result += this.methods.collect(function(ea) { return ea.toSmalltalk() }).join('\n\n');
		}
		result += '\n\n';
		return result;
	}

});

StNode.subclass('StVariableNode', {
	
	isVariable: true,
	
	initialize: function($super, name) {
		$super();
		this.name = name;
	},

	toString: function() {
		return Strings.format('Var(%s)', this.name);
	},
	
	toSmalltalk: function() {
		return this.name;
	}
});

StVariableNode.subclass('StInstanceVariableNode', {
	
	isInstance: true,
	
	toSmalltalk: function() {
		return this.name;
	}

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
	
	toSmalltalk: function() {
		return Object.isString(this.value) ? '\'' + this.value.replace('\'', '\'\'') + '\'' : this.value;
	}

});

StNode.subclass('StArrayLiteralNode', {
	
	isArrayLiteral: true,
	
	initialize: function($super, sequence) {
		$super();
		this.sequence = sequence;
	},
	
	toString: function() {
		return '#{' + this.sequence.toString() + '}';
	},
	
	toSmalltalk: function() {
		return '#{' + this.sequence.toSmalltalk() + '}';
	},
});

StNode.subclass('StReturnNode', {

	isReturn: true,
	
	initialize: function($super, value) {
		$super();
		this.value = value;
	},

	toSmalltalk: function() {
		return '^ ' + this.value.toSmalltalk();
	}
});

});