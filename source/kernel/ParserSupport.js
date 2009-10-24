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
	},
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
	
	initialize: function($super, methodName, primitiveBody, args) {
		$super(null, args, null);
		this.setMethodName(methodName);
		this.primitiveBody = primitiveBody;
	},

	toString: function() {
		return Strings.format('PrimitiveMethod(%s)',
			this.methodName);
	},
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

StNode.subclass('StArrayLiteralNode', {
	
	isArrayLiteral: true,
	
	initialize: function($super, sequence) {
		$super();
		this.sequence = sequence;
	},
	
	toString: function() {
		return '#{' + this.sequence.toString() + '}';
	},
});

StNode.subclass('StReturnNode', {

	isReturn: true,
	
	initialize: function($super, value) {
		$super();
		this.value = value;
	},
});

/* ===================================
   ======= ST AST --> ST Source ======
   ===================================
*/
StNode.addMethods({

  toSmalltalk: function() {
    return '';
  },

  mangleMethodName: function(name) {
    return name.replace(/:/g, '_');
  },

  toJavaScript: function() {
    return '';
  },

});

StAssignmentNode.addMethods({

  toSmalltalk: function() {
    return this.variable.name + ' := ' + this.value.toSmalltalk();
  },

  toJavaScript: function() {
    return this.variable.toJavaScript() + ' = ' + this.value.toJavaScript();
  },

});

StCascadeNode.addMethods({

  toSmalltalk: function() {
    var recv = this.receiver.toSmalltalk();
    var rest = this.messages.collect(function(ea) {
      var part = ea.toSmalltalk();
      part = part.slice(recv.length);
      while (part[0] == ' ') part = part.slice(1);
      return '\t' + part;
      }).join(';\n');
      return recv + '\n' + rest;
    },

    toJavaScript: function() {
      if (this.receiver.isVariable || this.receiver.isLiteral) {
        return this.messages.collect(function(ea) {
          return ea.toJavaScript()
          }).join(';\n') + ';\n';
      };
      var recv = this.receiver.toJavaScript();
      var result = 'var cascadeHelper = ' + recv + ';\n';
      result += this.messages.collect(function(ea) {
        return 'cascadeHelper.' + ea.toJavaScriptWithoutReceiver();
      }).join(';\n') + ';\n';
      return result;
    },

});

StMessageNode.addMethods({

  toJavaScriptWithoutReceiver: function() {
    throw new Error('Subclass responsibility');
  }

});

StUnaryMessageNode.addMethods({

  toSmalltalk: function() {
    return this.receiver.toSmalltalk() + ' ' + this.messageName;
  },

  toJavaScript: function() {
    return this.receiver.toJavaScript() + '.' + this.messageName + '()';
  },

  toJavaScriptWithoutReceiver: function() {
    return this.messageName + '()';
  }

});

StBinaryMessageNode.addMethods({

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
  },

  toJavaScript: function() {
    var arg = this.args.first();
    var argString = arg.toJavaScript();
    if (arg.isBinary || arg.isKeyword)
      argString = '(' + argString + ')';
    var receiverString = this.receiver.toJavaScript();
    if (this.receiver.isKeyword || this.receiver.isBinary)
      receiverString = '(' + receiverString + ')';
    return Strings.format('%s %s %s',
    receiverString,
    this.messageName,
    argString);
  },

});

StKeywordMessageNode.addMethods({

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
  },

  toJavaScript: function() {
    var result = this.receiver.toJavaScript();
    if (this.receiver.isBinary) result = '(' + result + ')';
    result += '.';
    result += this.toJavaScriptWithoutReceiver();
    return result;
  },

  toJavaScriptWithoutReceiver: function() {
    var result = this.mangleMethodName(this.messageName);
    result += '(';
    result += this.args.collect(function(ea) { return ea.toJavaScript() }).join(',');
    result += ')';
    return result;
  },

});

StSequenceNode.addMethods({

  toSmalltalk: function(indent) {
    indent = Object.isString(indent) ? indent : '';
    if (!this.children || this.children.length == 0) return '';
    return this.children.collect(function(ea) { return indent + ea.toSmalltalk() }).join('.') + '.';
  },

  toJavaScript: function(indent, returnLast) {
    indent = Object.isString(indent) ? indent : '';
    if (!this.children || this.children.length == 0) return '';
    var firsts = this.children.slice(0,this.children.length - 1)
    var last = this.children.last();
    var result = firsts.collect(function(ea) { return indent + ea.toJavaScript() }).join(';');
    if (firsts.length > 0) result += ';';
    result += indent + (returnLast ? 'return ' : '') + last.toJavaScript();  
    return result;
  },

});

StPropertyNode.addMethods({

  toSmalltalk: function() {
    return (this.isMeta ? '+ ' : '- ') + this.assignment.toSmalltalk() + '.';
  },

  toJavaScript: function() {
    return this.assignment.variable.toJavaScript() + ': ' + this.assignment.value.toJavaScript() + ','
  }

});

StInvokableNode.addMethods({

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
      indent = Object.isString(indent) ? indent : '';
      if (!this.declaredVars || this.declaredVars.length == 0) return '';
      return indent + Strings.format('| %s |' + indent,
      this.declaredVars.collect(function(ea) {return ea.toSmalltalk()}).join(' '));
    },

    toSmalltalk: function() {
      var result = '';
      if (this.isMethod) {
        result += this.methodHeadString();
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
    },

    toJavaScriptMethodHeader: function() {
      var result = '';
      if (this.isMethod) result += this.mangleMethodName(this.methodName) + ': ';
      result += 'function(';
      if (this.args && this.args.length > 0)
        result += this.args.collect(function(ea) { return ea }).join(',');
      result += ') ';
      return result;
    },

    toJavaScript: function() {
      var result = '';
      result += this.toJavaScriptMethodHeader();
      result += '{';
      if (this.declaredVars && this.declaredVars.length > 0) {
        result += ' var ';
        result += this.declaredVars.collect(function(ea) {return ea.toJavaScript()}).join(',');
        result += ';';
      }
    result += this.sequence.toJavaScript(' '/*indent*/, true /*returnLast*/);
    result += ' }';
    if (this.isMethod) result += ',';
    return result;
  },

});

StPrimitveMethodNode.addMethods({

  toSmalltalk: function() {
    return this.methodHeadString() + ' ' + this.primitiveBody;
  },

  toJavaScript: function() {
    var result = '';
    result += this.toJavaScriptMethodHeader();
    result += this.primitiveBody;
    result += ','
    return result;
  },

});

StClassNode.addMethods({

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
  },

  instMethods: function() {
    return this.methods.select(function(ea) { return !ea.isMeta });
  },

  instProperties: function() {
    return this.properties.select(function(ea) { return !ea.isMeta });
  },

  classMethods: function() {
    return this.methods.select(function(ea) { return ea.isMeta });
  },

  classProperties: function() {
    return this.properties.select(function(ea) { return ea.isMeta });
  },

  methodsAndPropertiesToJavaScript: function(methods, properties) {
    var result = '';
    if (properties.length > 0) {
      result += '\n';
      result += properties.collect(function(ea) { return ea.toJavaScript() }).join('\n');
      result += '\n';
    }
    if (methods.length > 0) {
      if (properties.length == 0) result += '\n';
      result += methods.collect(function(ea) { return ea.toJavaScript() }).join('\n\n');
      result += '\n';
    }
    return result;
  },

  toJavaScript: function() {
    var result = this.superclass ? this.superclass.toJavaScript() : 'Object';
    result += '.subclass('
    result += this.className.toJavaScript();
    result += ', {';
    result += this.methodsAndPropertiesToJavaScript(this.instMethods(), this.instProperties());
    result += '});\n';
    var classMethods = this.classMethods(), classProperties = this.classProperties();
    if (classMethods.length == 0 && classProperties.length == 0)
      return result;
    result += 'Object.extend(';
    result += this.className.value;
    result += ', {'
    result += this.methodsAndPropertiesToJavaScript(classMethods, classProperties);
    result += '});\n'
    return result;
  }

});

StVariableNode.addMethods({

  toSmalltalk: function() {
    return this.name;
  },

  toJavaScript: function() {
    return this.name;
  },
});

StInstanceVariableNode.addMethods({

  toSmalltalk: function() {
    return this.name;
  },

  toJavaScript: function() {
    return 'this.' + this.name.substring(1,this.name.length); // without @
  },

});

StLiteralNode.addMethods({

  toSmalltalk: function() {
    return Object.isString(this.value) ? '\'' + this.value.replace(/'/g, '\'\'') + '\'' : this.value;
  },

  toJavaScript: function() {
    return Object.isString(this.value) ? '\'' + this.value.replace(/''/g, "\\\\'") + '\'' : this.value;
  },

});

StArrayLiteralNode.addMethods({

  toSmalltalk: function() {
    return '#{' + this.sequence.toSmalltalk() + '}';
  },

  toJavaScript: function() {
    return '[' + this.sequence.children.collect(function(ea) { return ea.toJavaScript() }).join(',') + ']';
  }
});

StReturnNode.addMethods({

  toSmalltalk: function() {
    return '^ ' + this.value.toSmalltalk();
  },

  toJavaScript: function() {
    WorldMorph.current().notify('"^" currently not supported ... ');
    return this.value.toJavaScript();
  },

});
   
});