// NodeList

var NodeList = function() { this._nodes = []; };

Object.extend(NodeList.prototype, {
  item: function(index) { return this._nodes[index]; },
  get length() { return this._nodes.length; },
  _each: function(iterator) { // this is for the sake of prototype.
      for (var i = 0, length = this._nodes.length; i < length; i++)
	  iterator(this.item([i]));
  }
    
});
Object.extend(NodeList.prototype, Enumerable);


// NamedNodeMap

var NamedNodeMap = function() { this._nodes = []; }

Object.extend(NamedNodeMap.prototype, {
  getNamedItem: function(name) { return this.getNamedItemNS(null, name); },
  setNamedItem: function(arg)  { return this.setNamedItemNS(null, arg); },
  removeNamedItem: function(name) { return this.removeNamedItemNS(null, name); },
  item: function(index) { return this._nodes[index]; },
  get length() { return this._nodes.length; },

  getNamedItemNS: function(namespaceURI, localName) {
    for (var i = 0; i < this._nodes.length; i++) {
      if (this._nodes[i].localName == localName &&
          this._nodes[i].namespaceURI == namespaceURI)
        return this._nodes[i];
    }
    return null;
  },

  setNamedItemNS: function(arg) {
    var node = this.getNamedItemNS(arg.namespaceURI, arg.localName);
    if (node)
      this._nodes[this._nodes.indexOf(node)] = arg;
    else
      this._nodes.push(arg);
    return node;
  },

  removeNamedItemNS: function(namespaceURI, localName) {
    var node = this.getNamedItemNS(namespaceURI, localName);
    if (node)
      this._nodes.splice(this._nodes.indexOf(node), 1);
    return node;
  }
});

// Node

var Node = function() {};

Object.extend(Node, {
  ELEMENT_NODE: 1,
  ATTRIBUTE_NODE: 2,
  TEXT_NODE: 3,
  CDATA_SECTION_NODE: 4,
  ENTITY_REFERENCE_NODE: 5,
  ENTITY_NODE: 6,
  PROCESSING_INSTRUCTION_NODE: 7,
  COMMENT_NODE: 8,
  DOCUMENT_NODE: 9,
  DOCUMENT_TYPE_NODE: 10,
  DOCUMENT_FRAGMENT_NODE: 11,
  NOTATION_NODE: 12,

  find: function(node, predicate) {
    if (predicate(node))
      return node;
    for (var i = 0; i < node.childNodes.length; i++) {
      result = Node.find(node.childNodes.item(i), predicate);
      if (result)
        return result;
    }
    return null;
  },

  findAncestor: function(node, predicate) {
    if (!node.parentNode)
      return null;
    else if (predicate(node.parentNode))
      return node.parentNode;
    else
      return Node.findAncestor(node.parentNode, predicate);
  },

  forEach: function(node, action) {
    action(node);
    for (var i = 0; i < node.childNodes.length; i++)
      Node.forEach(node.childNodes.item(i), action);
  }
});

Object.extend(Node.prototype, {
  get nodeName()  { return null; },
  get nodeValue() { return null; },
  set nodeValue(value) { },
  get nodeType() { return 0; },
  get parentNode() { return this._parentNode; },
  get childNodes() { return this._childNodes ? this._childNodes : new NodeList; },
  get firstChild() { return this.childNodes.item(0); },
  get lastChild()  { return this.childNodes.item(this.childNodes.length - 1); },

  get previousSibling() {
    if (!this.parentNode)
      return null;
    var siblings = this.parentNode.childNodes;
    return siblings.item(siblings._nodes.indexOf(this) - 1);
  },

  get nextSibling() {
    if (!this.parentNode)
      return null;
    var siblings = this.parentNode.childNodes;
    return siblings.item(siblings._nodes.indexOf(this) + 1);
  },

  get attributes() { return this._attributes; },
  get ownerDocument() { return this._ownerDocument; },

  insertBefore: function(newChild, refChild) {
    if (!this._childNodes)
      return;
    this.removeChild(newChild);
    newChild._parentNode = this;
    if (refChild) {
      var index = this.childNodes._nodes.indexOf(refChild);
      this.childNodes._nodes.splice(index, 0, newChild);
    }
    else
      this.childNodes._nodes.push(newChild);
    return newChild;
  },

  replaceChild: function(newChild, oldChild) {
    this.insertBefore(newChild, oldChild);
    return this.removeChild(oldChild);
  },

  removeChild: function(oldChild) {
    if (!this._childNodes)
      return;
    var index = this.childNodes._nodes.indexOf(oldChild);
    if (index != -1) {
      oldChild._parentNode = null;
      this.childNodes._nodes.splice(index, 1);
    }
    return oldChild;
  },

  appendChild: function(newChild) {
    if (!this._childNodes)
      return newChild; // FIXME throw HIERARCHY_REQUEST_ERROR ?
    this.removeChild(newChild);
    newChild._parentNode = this;
    this.childNodes._nodes.push(newChild);
      return newChild;
  },

  hasChildNodes: function() { return this.childNodes.length > 0; },

  deepClone: function() {
      // KP: added _fxBegin, _fxShape to blacklist. This is obviously a workaround
      //,  objects should be able to declare their blacklists
    var clone = Object.deepClone(this,
	'_ownerDocument', '_parentNode', '_ownerElement', '_fxBegin', '_fxShape');
    if (this._ownerDocument)
      clone._ownerDocument = this._ownerDocument;
    if (this.childNodes)
      for (var i = 0; i < this.childNodes.length; i++)
        clone.childNodes.item(i)._parentNode = clone;
    if (this.attributes)
      for (var i = 0; i < this.attributes.length; i++)
        clone.attributes.item(i)._ownerElement = clone;
    return clone;
  },

  cloneNode: function(deep) {
    var clone;
    if (deep)
      clone = this.deepClone();
    else {
	//clone = Object.extend({}, this);
	clone = {};
	clone.__proto__ = this.__proto__;
	for (var p in this) {
	    if (!this.hasOwnProperty(p)) continue;
	    clone[p] = this[p];
	}
      clone._parentNode = null;
      if (this._childNodes)
        clone._childNodes = new NodeList;
      if (this._ownerElement)
        clone._ownerElement = null;
      // deep clone the attributes
      if (this._attributes) {
        clone._attributes = Object.deepClone(this._attributes);
        for (var i = 0; i < this._attributes.length; i++)
          clone._attributes.item(i)._ownerElement = clone;
      }
    }
    return clone;
  },

  normalize: function() { TODO(); },
  isSupported: function(feature, version) { TODO(); },
  get namespaceURI() { return this._namespaceURI; },
  get prefix() { return this._prefix; },
  // TODO according to the spec, this is supposed to have strange side effects
  set prefix(value) { this._prefix = value; },
  get localName() { return this._localName; },

  hasAttributes: function() {
    return this.attributes && this.attributes.length > 0;
  }
});

// Attr

var Attr = function() { Node.call(this); };

Object.extend(Attr.prototype, Node.prototype);
Object.extend(Attr.prototype, {
  get nodeName() { return this.name; },
  get nodeValue() { return this.value; },
  set nodeValue(value) { this.value = value; },
  get nodeType() { return Node.ATTRIBUTE_NODE; },
  get parentNode() { return null; },

  get childNodes() {
    var nodes = new NodeList;
    if (this.value != '')
      nodes._nodes = [this.ownerDocument.createTextNode(this.value)];
    return nodes;
  },

  get name() { return this._name; },
  get specified() { return true; },
  get value() { return String(this._value); },

  set value(value) {
    this._value = String(value == null ? '' : value); 
    var owner = this.ownerElement;
    var specs = owner && owner.constructor.attributeSpecs;
    var spec = specs && specs[this.name];
    if (this._value == '' && spec && spec.defaultValue)
      this._value = spec.defaultValue;
    if (spec && spec.parser)
      this._value = spec.parser(this._value);
  },

  get ownerElement() { return this._ownerElement; },

  toString: function() { return this.name + '="' + this.value + '"'; }
});

// Element

var Element = function() {
  Node.call(this);
  this._childNodes = new NodeList;
  this._attributes = new NamedNodeMap;
};

Object.extend(Element, {
  factories: {},

  // attributeSpec can have name, parser, type(.fromString), defaultValue and xmlName
  defineAttribute: function(element, attributeSpec) {
    attributeSpec = attributeSpec.name ? attributeSpec : {name:attributeSpec};
    var xmlName = attributeSpec.xmlName || attributeSpec.name;
    attributeSpec.parser = attributeSpec.parser ||
      (attributeSpec.type && attributeSpec.type.fromString) || attributeSpec.type;
    element.attributeSpecs = element.attributeSpecs || {};
    element.attributeSpecs[xmlName] = attributeSpec;

    // TODO we should not assume that all attributes have a getter
    element.prototype.__defineGetter__(attributeSpec.name, function() {
      var node = this.getAttributeNode(xmlName);
      if (!node) {
        node = this.ownerDocument.createAttribute(xmlName);
        this.setAttributeNode(node);
      }
      return node._value;
    });

    if (!attributeSpec.readonly) {
      element.prototype.__defineSetter__(attributeSpec.name, function(value) {
        var node = this.getAttributeNode(xmlName);
        if (!node) {
          node = this.ownerDocument.createAttribute(xmlName);
          this.setAttributeNode(node);
        }
        node.value = value;
      });
    }
  },

  defineAttributes: function(element) {
    for (var i = 1; i < arguments.length; i++)
      this.defineAttribute(element, arguments[i]);
  }
});

Object.extend(Element.prototype, Node.prototype);
Object.extend(Element.prototype, {
  get nodeName() { return this.tagName; },
  get nodeType() { return Node.ELEMENT_NODE; },
  get tagName() { return this._tagName; },

  getAttribute: function(name) {
    return this.getAttributeNS(null, name);
  },

  setAttribute: function(name, value) {
    return this.setAttributeNS(null, name, value);
  },

  removeAttribute: function(name) {
    return this.removeAttributeNS(null, name);
  },

  getAttributeNode: function(name) {
    return this.getAttributeNodeNS(null, name);
  },

  setAttributeNode: function(newAttr) {
    return this.setAttributeNodeNS(newAttr);
  },

  removeAttributeNode: function(oldAttr) {
    this.attributes.removeNamedItemNS(oldAttr.namespaceURI, oldAttr.localName);
    oldAttr._ownerElement = null;
    return oldAttr;
  },

  getElementsByTagName: function(name) {
    return this.getElementsByTagNameNS('*', name);
  },

  getAttributeNS: function(namespaceURI, localName) {
    var node = this.getAttributeNodeNS(namespaceURI, localName);
    return node ? node.value : null;
  },

  setAttributeNS: function(namespaceURI, qualifiedName, value) {
    // TODO we're supposed to reuse the attribute node if there already is
    // one with this namespaceURI and local name
    var attr = this.ownerDocument.createAttributeNS(namespaceURI, qualifiedName);
    this.setAttributeNodeNS(attr);
    attr.value = value;
  },

  removeAttributeNS: function(namespaceURI, localName) {
    var oldAttr = this.attributes.removeNamedItemNS(namespaceURI, localName); 
    oldAttr && (oldAttr._ownerElement = null);
  },

  getAttributeNodeNS: function(namespaceURI, localName) {
    return this.attributes.getNamedItemNS(namespaceURI, localName);
  },

  setAttributeNodeNS: function(newAttr) {
    var oldAttr = this.attributes.setNamedItemNS(newAttr);
    oldAttr && (oldAttr._ownerElement = null);
    newAttr._ownerElement = this;
    newAttr.value = newAttr.value; // Force the value to be parsed
    return oldAttr;
  },

  getElementsByTagNameNS: function(namespaceURI, localName) {
    var elements = new NodeList;
    Node.forEach(this, function(node) {
      if (node.nodeType == Node.ELEMENT_NODE &&
          (localName == '*'    || node.localName == localName) &&
          (namespaceURI == '*' || node.namespaceURI == namespaceURI))
        elements._nodes.push(node);
    });
    // TODO this list is supposed to be 'live'. We could use something like
    // a version number on the document that increments whenever the structure
    // changes (insertBefore called on a node) which has the effect of
    // invalidating the contents of the list (forcing a requery when
    // item or length is called on the list).
    return elements;
  },

  hasAttribute: function(name) {
    return this.hasAttributeNS(null, name);
  },

  hasAttributeNS: function(namespaceURI, localName) {
    return this.getAttributeNodeNS(namespaceURI, localName) != null;
  },

  // TODO some elements don't have closing tags
  toString: function(deep) {
    var result = '<' + this.nodeName;
    for (var i = 0; i < this.attributes.length; i++)
      result += ' ' + this.attributes.item(i).toString();
    result += '>\n';
    for (var i = 0; deep && i < this.childNodes.length; i++)
      result += this.childNodes.item(i).toString(deep) + '\n';
    result += '</' + this.tagName + '>';
    return result;
  }
});

// CharacterData

var CharacterData = function() { Node.call(this); };

Object.extend(CharacterData.prototype, Node.prototype);
Object.extend(CharacterData.prototype, {
  get data() { return this._data; },
  set data(value) { this._data = value; },
  get length() { return this.data ? this.data.length : 0; },

  substringData: function(offset, count) {
    return this.data.substr(offset, count);
  },

  appendData: function(arg) {
    this.data = this.data.concat(arg);
  },

  insertData: function(offset, arg) {
    this.data = this.data.substr(0, offset).concat(arg).
      concat(this.data.substr(offset));
  },

  deleteData: function(offset, count) {
    this.data = this.data.substr(0, offset).
      concat(this.data.substr(offset + count));
  },

  replaceData: function(offset, count, arg) {
    this.data = this.data.substr(0, offset).concat(arg).
      concat(this.data.substr(offset + count));
  }
});

// Text

var Text = function() { CharacterData.call(this); };

Object.extend(Text.prototype, CharacterData.prototype);
Object.extend(Text.prototype, {
  get nodeName() { return '#text'; },
  get nodeValue() { return this.data; },
  set nodeValue(value) { this.data = value; },
  get nodeType() { return Node.TEXT_NODE; },

  splitText: function(offset) {
    var text = new Text;
    text.data = this.data.substr(offset);
    this.data = this.data.substr(0, offset);
    if (this.parentNode) {
      var sibling = this.nextSibling;
      if (sibling)
        this.parentNode.insertBefore(text, sibling);
      else
        this.parentNode.appendChild(text);
    }
    return text;
  },
  
  toString: function() { return this.data; }
});

// TODO temporary work around for the lk naming clash...
var DOMText = Text;

// CDATASection

var CDATASection = function() { DOMText.call(this); };

Object.extend(CDATASection.prototype, DOMText.prototype);
CDATASection.prototype.toString = function() {
  return '<![CDATA[' + this.data + ']]>';
};

// Document

var Document = function() {
  Node.call(this);
  this._childNodes = new NodeList;
};

Object.extend(Document.prototype, Node.prototype);
Object.extend(Document.prototype, {
  get nodeName() { return '#document;'; },
  get nodeType() { return Node.DOCUMENT_NODE; },
  get doctype() { TODO(); },
  get implementation() { TODO(); },

  get documentElement() {
    return Node.find(this, function(e) {
      return e.nodeType == Node.ELEMENT_NODE;
    });
  },

  createElement: function(tagName) { return this.createElementNS(null, tagName); },
  createDocumentFragment: function() { TODO(); },

  createTextNode: function(data) {
    // TODO temporary work around for the lk naming clash...
    var text = new DOMText;
    text._ownerDocument = this;
    text.data = data;
    return text;
  },

  createComment: function(data) { TODO(); },

  createCDATASection: function(data) {
    var cdata = new CDATASection;
    cdata._ownerDocument = this;
    cdata.data = data;
    return cdata;
  },

  createProcessingInstruction: function(target, data) { TODO(); },

  createAttribute: function(name) {
    return this.createAttributeNS(null, name);
  },

  createEntityReference: function(name) { TODO(); },

  getElementsByTagName: function(tagName) {
    return this.getElementsByTagNameNS('*', tagName);
  },

  importNode: function(importedNode, deep) { TODO(); },

  createElementNS: function(namespaceURI, qualifiedName) {
    var match = qualifiedName.match(/(\w*):(\w*)/);
    var localName = (match && match[2]) || qualifiedName;
    var factory = Element.factories[namespaceURI];
    var element = new ((factory && factory[localName]) || Element);
    element._ownerDocument = this;
    element._tagName = qualifiedName;
    element._namespaceURI = namespaceURI;
    element._prefix = match && match[1];
    element._localName = localName;
    return element;
  },

  createAttributeNS: function(namespaceURI, qualifiedName) {
    var attr = new Attr;
    var match = qualifiedName.match(/(\w*):(\w*)/);
    attr._ownerDocument = this;
    attr._name = qualifiedName;
    attr._namespaceURI = namespaceURI;
    attr._prefix = match && match[1];
    attr._localName = (match && match[2]) || qualifiedName;
    attr.value = '';
    return attr;
  },

  getElementsByTagNameNS: function(namespaceURI, localName) {
    return this.documentElement.getElementsByTagNameNS(namespaceURI, localName);
  },

  getElementById: function(elementId) { return null; }
});

// FIXME
DocumentType = function() {}