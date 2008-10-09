// TODO deal with case-sensitivity for HTML tagnames and such

// HTMLDocument

var HTMLDocument = function () { Document.call(this); };
Object.extend(HTMLDocument.prototype, Document.prototype);

Object.extend(HTMLDocument.prototype, {
  get title() { return this._title; },
  set title(value) { this._title = value; },
  get referrer() { return this._referrer; },
  get domain() { return this._domain; },
  get URL() { return this._URL; },
  get body() { TODO(); },
  set body(value) { TODO(); },
  get images() { TODO(); },
  get applets() { TODO(); },
  get links() { TODO(); },
  get forms() { TODO(); },
  get anchors() { TODO(); },
  get cookie() { return this._cookie; },
  set cookie(value) { this._cookie = value; },
  open: function() { TODO(); },
  close: function() { TODO(); },
  write: function(text) { TODO(); },
  writeln: function(text) { TODO(); },
  getElementsByName: function(elementName) { TODO(); },

  getElementById: function(id) {
    return Node.find(this.documentElement, function(node) {
      // TODO case-sensitivity?
      return node.nodeType == Node.ELEMENT_NODE &&
             node.getAttribute('id') == id;
    });
  }
});

// HTMLElement

var HTMLElement = function() {
  Element.call(this);
  // TODO we should actually implement the CSS object, and this should be
  // an attribute node, see interface ElementCSSInlineStyle, which HTMLElements
  // should mix in.
  this.style = {};
};
Object.extend(HTMLElement.prototype, Element.prototype);
Element.factories['http://www.w3.org/1999/xhtml'] = HTMLElement.factory = {};

HTMLElement.defineElement = function(name) {
  var element = function() { HTMLElement.call(this); };
  Object.extend(element.prototype, HTMLElement.prototype);
  element.attributeSpecs = {};
  Object.extend(element.attributeSpecs, HTMLElement.attributeSpecs);
  Element.defineAttributes.apply(Element,
    [element].concat(Array.prototype.slice.call(arguments, 1)));
  this.factory[name] = element;
  element.tagName = 'http://www.w3.org/1999/xhtml:' + name;
  return element;
};

Element.defineAttributes(HTMLElement, 'id', 'title', 'lang', 'dir',
  {name:'className', xmlName:'class'});

/* TODO should define tagName for each (using defineElement) */
['sub', 'sup', 'span', 'bdo', 'tt', 'i', 'b', 'u', 's', 'strike', 'big',
 'small', 'em', 'strong', 'dfn', 'code', 'samp', 'kbd', 'var', 'cite',
 'acronym', 'abbr', 'dd', 'dt', 'noframes', 'noscript', 'address', 'center'].
 forEach(function(name) { HTMLElement.factory[name] = HTMLElement; });

var HTMLHtmlElement = HTMLElement.defineElement('html', 'version');
var HTMLHeadElement = HTMLElement.defineElement('head', 'profile');
var HTMLBodyElement = HTMLElement.defineElement('body',
  'aLink', 'background', 'bgColor', 'link', 'text', 'vLink');
var HTMLDivElement = HTMLElement.defineElement('div', 'align');
