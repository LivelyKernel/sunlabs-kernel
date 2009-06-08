fx.module('dom', fx.lang.Object, function(Base) {

    var NodeList = Base.extend({ // intended as mixin
	'.nodes': { // 
	    enumerable: false,
	    value: null
	},

	constructor: {
	    value: function(inherited) { 
		inherited();
		this['.nodes'] = new FXSequence();
	    }
	},
	
	item: {
	    value: function(index) { 
		return this['.nodes'][index]; 
	    }
	},
	
	length: {
	    getter: function() { 
		return this['.nodes'].length; 
	    }
	},

	toString: {
	    override: true,
	    value: function() {
		return "NodeList(" + this['.nodes'] + ")";
	    }
	},
	
	forEach: {
	    value: function() {
		return Array.prototype.forEach.apply(this['.nodes'], arguments);
	    }
	}
	
    });

    var Node = Base.extend({
	'.parentNode': {
	    enumerable: false,
	    value: null
	},

	'.childNodes': {
	    enumerable: false,
	    value: null
	},

	parentNode: {
	    getter: function() { 
		return this['.parentNode'];
	    }
	},

	childNodes: {
	    getter: function() {
		var nodes = this['.childNodes'];
		if (!nodes) {
		    nodes = this['.childNodes'] = new NodeList();
		}
		return nodes;
	    },

	    // FIXME: only init
	    setter: function(value) {
		value.forEach(function(node) {
		    this.appendChild(node); 
		}, this);
	    }
	},

	hasChildNodes: {
	    value: function() {
		var nodes = this['.childNodes'];
		if (!nodes) return false;
		else return nodes.length > 0;
	    }
	},

	nodeType: {
	    writable: false, 
	    value: 1  // Element Node
	},
	
	firstChild: {
	    getter: function() {
		if (!this.hasOwnProperty('.childNodes')) return null;
		return this.childNodes.item(0); 
	    }
	},
  
	lastChild: { 
	    getter: function() { 
		if (!this.hasOwnProperty('.childNodes')) return null;
		return this.childNodes.item(this.childNodes.length - 1); 
	    }
	},

	previousSibling: {
	    getter: function() {
		if (!this.parentNode)
		    return null;
		var siblings = this.parentNode.childNodes;
		return siblings.item(siblings['.nodes'].indexOf(this) - 1);
	    }
	},
	
	nextSibling: {
	    getter: function() { 
		if (!this.parentNode)
		    return null;
		var siblings = this.parentNode.childNodes;
		return siblings.item(siblings['.nodes'].indexOf(this) + 1);
	    }
	},

	insertBefore: {
	    value: function(newChild, refChild) {
		newChild.parentNode && newChild.parentNode.removeChild(newChild);
		newChild['.parentNode'] = this;
		if (refChild) {
		    var index = this.childNodes['.nodes'].indexOf(refChild);
		    this.childNodes['.nodes'].splice(index, 0, newChild);
		}
		else
		    this.childNodes['.nodes'].push(newChild);
		return newChild;
	    }
	},
	
	replaceChild: {
	    value: function(newChild, oldChild) {
		this.insertBefore(newChild, oldChild);
		return this.removeChild(oldChild);
	    }
	},
	
	removeChild: {
	    value: function(oldChild) {
		if (!this.hasOwnProperty('.childNodes')) return null;
		var index = this.childNodes['.nodes'].indexOf(oldChild);
		if (index != -1) {
		    oldChild['.parentNode'] = null;
		    // FIXME
		    //this.childNodes['.nodes'].splice(index, 1);
		    this.childNodes['.nodes'].remove(index);
		}
		return oldChild;
	    }
	},
	
	appendChild: {
	    value: function(newChild) {
		newChild.parentNode && newChild.parentNode.removeChild(newChild);
		newChild['.parentNode'] = this;
		//print('HERE ' + this.childNodes['.nodes']);
		this.childNodes['.nodes'].push(newChild);
		return newChild;
	    }
	}
    });
    
    
    var Event = Base.extend({
	
	constructor: {
	    value: function(inherited, domEventName) {
		this['.type'] = domEventName;
	    }
	},
		
	'.type': {
	    value: null,
	    enumerable: false
	},

	type: {
	    getter: function() {
		return this['.type'];
	    }
	},

	'.currentTarget': {
	    value: null,
	    enumerable: false
	},
	
	currentTarget: {
	    getter: function() {
		return this['.currentTarget'];
	    }
	},

	preventDefault: {
	    value: function() {
	    }
	},

	'.stoppedPropagation': {
	    value: false,
	    enumerable: false
	},
	
	stopPropagation: {
	    value: function() {
		this['.stoppedPropagation'] = true;
	    }
	}
    });

    var lastRawEvent = null;
    var lastTarget = null;

    var MouseEvent = Event.extend({ 
	
	'.shiftKey': {
	    value: false,
	    enumerable: false
	},
	
	'.clientX': {
	    value: 0,
	    enumerable: false
	},
	
	'.clientY': {
	    value: 0,
	    enumerable: false
	},
	
	constructor: {
	    value: function(inherited, domEventName, awtEvent, target) {
		inherited(domEventName);
		if (awtEvent !== lastRawEvent) {
		    // we must be the original target of the event
		    lastRawEvent = awtEvent;
		    lastTarget = target;
		}

		this['.shiftKey'] = awtEvent.isShiftDown();
		this['.altKey'] = awtEvent.isAltDown();
		this['.ctrlKey'] = awtEvent.isControlDown();
		var point = awtEvent.getPoint();
		var source = awtEvent.getSource();
		this['.clientX'] = point.getX();
		this['.clientY'] = point.getY();
		this.target = lastTarget; // original property		
		Object.defineProperty(this, 'target', { writable: false});
	    }
	},
	
	toString: {
	    override: true,
	    value: function() {
		return "MouseEvent:" + this.type + ":" + [this.clientX, this.clientY];
	    }
	},
	shiftKey: {
	    getter: function() {
		return this['.shiftKey'];
	    }
	},
	
	altKey: {
	    getter: function() {
		return this['.altKey'];
	    }
	},

	ctrlKey: {
	    getter: function() {
		return this['.ctrlKey'];
	    }
	},


	clientX: {
	    getter: function() {
		return this['.clientX'];
	    }
	},
	clientY: {
	    getter: function() {
		return this['.clientY'];
	    }
	}
    });

    var PropertyChangeEvent = Event.extend({
	constructor: {
	    value: function(inherited, source, propName, oldValue, newValue) {
		inherited('propertychange');
		this.source = source;
		this.propertyName = propName;
		this.oldValue = oldValue;
		this.newValue = newValue;
	    }
	}
    });
    
    return {
	Node: Node,
	NodeList: NodeList,
	Event: Event,
	PropertyChangeEvent: PropertyChangeEvent,
	MouseEvent: MouseEvent
    };
});
