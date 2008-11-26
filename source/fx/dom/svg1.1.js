// TODO this should go in a separate file dedicated to CSS
var CSSStyleDeclaration = function() {};
CSSStyleDeclaration.fromString = function(s) { TODO(); };

// TODO missing interfaces (among many others)
// SVGUnitTypes
// SVGURIReference
// css::ViewCSS
// css::DocumentCSS
// events::DocumentEvent
// SVGZoomAndPan
// SVGFitToViewBox
// SVGTests
// SVGLangSpace
// SVGExternalResourcesRequired

// SVGNumber

var SVGNumber = function() {};

SVGNumber.fromString = function(s) {
  var object = new SVGNumber;
  object.value = s;
  return object;
};

Object.extend(SVGNumber.prototype, {
  get value() { return this._value; },
  set value(value) { this._value = parseFloat(String(value)) || 0; },
  toString: function() { return String(this.value); }
});

// SVGLength

var SVGLength = function() {};

Object.extend(SVGLength, {
  SVG_LENGTHTYPE_UNKNOWN:    0,
  SVG_LENGTHTYPE_NUMBER:     1,
  SVG_LENGTHTYPE_PERCENTAGE: 2,
  SVG_LENGTHTYPE_EMS:        3,
  SVG_LENGTHTYPE_EXS:        4,
  SVG_LENGTHTYPE_PX:         5,
  SVG_LENGTHTYPE_CM:         6,
  SVG_LENGTHTYPE_MM:         7,
  SVG_LENGTHTYPE_IN:         8,
  SVG_LENGTHTYPE_PT:         9,
  SVG_LENGTHTYPE_PC:        10,
  unitTypeToString: ['', '', '%', 'em', 'ex', 'px', 'cm', 'mm', 'in', 'pt', 'pc']
});

SVGLength.fromString = function(s) {
  var object = new SVGLength;
  object.valueAsString = s;
  return object;
};

Object.extend(SVGLength.prototype, {
  get unitType() { return this._unitType; },
  get value() { return this._value; },
  set value(value) { this._value = parseFloat(String(value)) || 0; },
  get valueInSpecifiedUnits() { TODO(); },
  set valueInSpecifiedUnits(value) { TODO(); },
  get valueAsString() {
    var value = this._value;
    // TODO must denormalize other unit types, too
    if (this._unitType == SVGLength.SVG_LENGTHTYPE_PERCENTAGE)
      value *= 100;
    return value + SVGLength.unitTypeToString[this._unitType];
  },
  set valueAsString(value) {
      // KP: note that lengths can be negative in SVG
      var match = String(value).match(/((-)?\d*\.?\d*)(%|\w*)/);
    this.value = match && match[1];
    
    this._unitType = SVGLength.unitTypeToString.
      lastIndexOf(match && match[3] || '');
    // TODO must normalize other unit types, too
    if (this._unitType == SVGLength.SVG_LENGTHTYPE_PERCENTAGE)
      this._value /= 100;
  },
  newValueSpecifiedUnits:
    function(unitType, valueInSpecifiedUnits) { TODO(); },
  convertToSpecifiedUnits: function(unitType) { TODO(); },
  toString: function() { return this.valueAsString; }
});

// SVGPoint

var SVGPoint = function() {};

SVGPoint.fromString = function(s) {
  var point = new SVGPoint;
  var coors = s.split(/(?:\s|,)+/);
  point.x = parseFloat(coors[0]) || 0;
  point.y = parseFloat(coors[1]) || 0;
  return point;
};

Object.extend(SVGPoint.prototype, {
  get x() { return this._x; },
  set x(value) { this._x = value; },
  get y() { return this._y; },
  set y(value) { this._y = value; },

  matrixTransform: function(matrix) {
    var point = new SVGPoint;
    point.x = this.x * matrix.a + this.y * matrix.c + matrix.e;
    point.y = this.x * matrix.b + this.y * matrix.d + matrix.f;
    return point;
  },

  toString: function() {
    return this.x + ',' + this.y;
  }
});

// SVGMatrix

var SVGMatrix = function() {
  this._a = 1.0; this._c = 0.0; this._e = 0.0;
  this._b = 0.0; this._d = 1.0; this._f = 0.0;
};

Object.extend(SVGMatrix.prototype, {
  get a() { return this._a; },
  set a(value) { this._a = value; },
  get b() { return this._b; },
  set b(value) { this._b = value; },
  get c() { return this._c; },
  set c(value) { this._c = value; },
  get d() { return this._d; },
  set d(value) { this._d = value; },
  get e() { return this._e; },
  set e(value) { this._e = value; },
  get f() { return this._f; },
  set f(value) { this._f = value; },

  multiply: function(b) {
    var a = this;
    var ab = new SVGMatrix;
    ab.a = a.a * b.a + a.c * b.b;       ab.b = a.b * b.a + a.d * b.b;
    ab.c = a.a * b.c + a.c * b.d;       ab.d = a.b * b.c + a.d * b.d;
    ab.e = a.a * b.e + a.c * b.f + a.e; ab.f = a.b * b.e + a.d * b.f + a.f;
    return ab;
  },

  inverse: function() {
    var a = this;
    var b = new SVGMatrix;
    var d = 1 / (a.a * a.d - a.b * a.c);
    b.a =  a.d * d; b.c = -a.c * d; b.e = -a.e * b.a - a.f * b.c;
    b.b = -a.b * d; b.d =  a.a * d; b.f = -a.e * b.b - a.f * b.d;
    return b;
  },

  translate: function(x, y) {
    var matrix = new SVGMatrix;
    matrix.e = x; matrix.f = y
    return matrix.multiply(this);
  },

  scale: function(scaleFactor) {
    return this.scaleNonUniform(scaleFactor, scaleFactor);
  },

  scaleNonUniform: function(scaleFactorX, scaleFactorY) {
    var matrix = new SVGMatrix;
    matrix.a = scaleFactorX;
    matrix.d = scaleFactorY;
    return matrix.multiply(this);
  },

  rotate: function(angle) {
    var matrix = new SVGMatrix;
    matrix.a = Math.cos(angle);
    matrix.b = Math.sin(angle);
    matrix.c = -matrix.b;
    matrix.d = matrix.a;
    return matrix.multiply(this);
  },

  rotateFromVector: function(x, y) { TODO(); },
  flipX: function() { TODO(); },
  flipY: function() { TODO(); },

  skewX: function(angle) {
    var matrix = new SVGMatrix;
    matrix.c = Math.tan(angle);
    return matrix.multiply(this);
  },

  skewY: function(angle) {
    var matrix = new SVGMatrix;
    matrix.b = Math.tan(angle);
    return matrix.multiply(this);
  }
});

// SVGTransform

var SVGTransform = function() {
  this._type = SVGTransform.SVG_TRANSFORM_UNKNOWN;
};

Object.extend(SVGTransform, {
  SVG_TRANSFORM_UNKNOWN:   0,
  SVG_TRANSFORM_MATRIX:    1,
  SVG_TRANSFORM_TRANSLATE: 2,
  SVG_TRANSFORM_SCALE:     3,
  SVG_TRANSFORM_ROTATE:    4,
  SVG_TRANSFORM_SKEWX:     5,
  SVG_TRANSFORM_SKEWY:     6,
  typeToString:
    ['unknown', 'matrix', 'translate', 'scale', 'rotate', 'skewX', 'skewY']
});

SVGTransform.fromString = function(s) {
  var transform = new SVGTransform;
  var match = s.match(/(\w+)\s*\((.*)\)/);
  if (match) {
    var args = match[2].split(/(?:\s|,)+/).
      map(function(n) { return parseFloat(n) || 0; });
    switch (match[1]) {
      case 'matrix':
        var matrix = new SVGMatrix;
        matrix.a = args[0]; matrix.b = args[1];
        matrix.c = args[2]; matrix.d = args[3];
        matrix.e = args[4]; matrix.f = args[5];
        transform.setMatrix(matrix);
        break;
      case 'translate':
        transform.setTranslate(args[0], args[1]);
        break;
      case 'scale':
        transform.setScale(args[0], args[1]);
        break;
      case 'rotate':
        transform.setRotate(args[0], args[1], args[2]);
        break;
      case 'skewX':
        transform.setSkewX(args[0]);
        break;
      case 'skewY':
        transform.setSkewY(args[0]);
        break;
    }
  }
  return transform;
};

Object.extend(SVGTransform.prototype, {
  get type() { return this._type; },
  get matrix() { return this._matrix; },
  get angle() { return this._angle; },

  setMatrix: function(matrix) {
    this._type = SVGTransform.SVG_TRANSFORM_MATRIX;
    this._angle = 0;
    this._matrix = new SVGMatrix;
    this._matrix.a = matrix.a; this._matrix.b = matrix.b;
    this._matrix.c = matrix.c; this._matrix.d = matrix.d;
    this._matrix.e = matrix.e; this._matrix.f = matrix.f;
  },

  setTranslate: function(tx, ty) {
    this._type = SVGTransform.SVG_TRANSFORM_TRANSLATE;
    this._angle = 0;
    this._matrix = (new SVGMatrix).translate(tx, ty || 0);
  },

  setScale: function(sx, sy) {
    this._type = SVGTransform.SVG_TRANSFORM_SCALE;
    this._angle = 0;
    this._matrix = (new SVGMatrix).scaleNonUniform(sx, sy || sx);
  },

  setRotate: function(angle, cx, cy) {
      cx && console.log('ignoring anchor ' + [cx, cy]);
      //cx && TODO(); // We don't handle the optional cx cy yet
    this._type = SVGTransform.SVG_TRANSFORM_ROTATE;
    this._angle = angle;
    this._matrix = (new SVGMatrix).rotate(angle);
  },

  setSkewX: function(angle) {
    this._type = SVGTransform.SVG_TRANSFORM_SKEWX;
    this._angle = angle;
    this._matrix = (new SVGMatrix).skewX(angle);
  },

  setSkewY: function(angle) {
    this._type = SVGTransform.SVG_TRANSFORM_SKEWY;
    this._angle = angle;
    this._matrix = (new SVGMatrix).skewY(angle);
  },

  // TODO what about the optional cx cy for rotate?
  toString: function() {
    var args = [];
    with (SVGTransform)
      switch (this.type) {
        case SVG_TRANSFORM_MATRIX:    args = [this.matrix.a, this.matrix.b,
                                              this.matrix.c, this.matrix.d,
                                              this.matrix.e, this.matrix.f]; break;
        case SVG_TRANSFORM_TRANSLATE: args = [this.matrix.e, this.matrix.f]; break;
        case SVG_TRANSFORM_SCALE:     args = [this.matrix.a, this.matrix.d]; break;
        case SVG_TRANSFORM_ROTATE:    args = [this.angle];     break;
        case SVG_TRANSFORM_SKEWX:     args = [this.angle];     break;
        case SVG_TRANSFORM_SKEWY:     args = [this.angle];     break;
      }
    return SVGTransform.typeToString[this.type] + '(' + args.join(' ') + ')';
  }
});

// SVGList (used for SVGStringList, SVGPointList, etc.)

var SVGList = function() { this._items = []; };

Object.extend(SVGList.prototype, {
  get numberOfItems() { return this._items.length; },
  clear: function() { this._items.length = 0; },

  initialize: function(newItem) {
    this.clear();
    return this.appendItem(newItem);
  },

  getItem: function(index) { return this._items[index]; },
  insertItemBefore: function(newItem, index) { TODO(); },
  replaceItem: function(newItem, index) { TODO(); },
  removeItem: function(index) { TODO(); },

  appendItem: function(newItem) {
    this._items.push(newItem);
    return newItem; 
  },

  toString: function() {
    return this._items.join(' ');
  }
});

// SVGPointList

var SVGPointList = function() { SVGList.call(this); };
Object.extend(SVGPointList.prototype, SVGList.prototype);
Object.extend(SVGPointList, {
  fromString: function(s) {
    var list = new SVGPointList;
    var items = s.split(/(?:\s|,)+/);
    for (var i = 0; i < items.length - 1; i += 2)
      list.appendItem(SVGPoint.fromString(items[i] + ',' + items[i + 1]));
    return list;
  }
});

// SVGNumberList

var SVGNumberList = function() { SVGList.call(this); };
Object.extend(SVGNumberList.prototype, SVGList.prototype);
Object.extend(SVGNumberList, {
  fromString: function(s) {
    var list = new SVGNumberList;
    var items = s.split(/(?:\s|,)+/);
    for (var i = 0; i < items.length; i++)
      list.appendItem(SVGNumber.fromString(items[i]));
    return list;
  }
});

// SVGLengthList

var SVGLengthList = function() { SVGList.call(this); };
Object.extend(SVGLengthList.prototype, SVGList.prototype);
Object.extend(SVGLengthList, {
  fromString: function(s) {
    var list = new SVGLengthList;
    var items = s.split(/(?:\s|,)+/);
    for (var i = 0; i < items.length; i++)
      list.appendItem(SVGLength.fromString(items[i]));
    return list;
  }
});

// SVGTransformList

var SVGTransformList = function() { SVGList.call(this); };
Object.extend(SVGTransformList.prototype, SVGList.prototype);
Object.extend(SVGTransformList, {
  fromString: function(s) {
    var list = new SVGTransformList;
    var items = s.split(/\)\s*,*\s*/);
    for (var i = 0; i < items.length - 1; i++)
      list.appendItem(SVGTransform.fromString(items[i] + ')'));
    return list;
  }
});

Object.extend(SVGTransformList.prototype, {
  createSVGTransformFromMatrix: function(matrix) {
    var transform = new SVGTransform;
    transform.setMatrix(matrix);
    return transform;
  },

  consolidate: function() {
    if (this.numberOfItems == 0)
      return null;
    if (this.numberOfItems == 1)
      return this.getItem(0);
    var matrix = new SVGMatrix;
    for (var i = 0; i < this.numberOfItems; i++)
      matrix = this.getItem(i).matrix.multiply(matrix);
    this.clear();
    return this.appendItem(this.createSVGTransformFromMatrix(matrix));
  }
});

// SVGAnimated (used for SVGAnimatedBoolean, etc.)

var SVGAnimated = function() {};

SVGAnimated.defineAnimated = function(classToAnimate, readonly) {
  var fromString = classToAnimate.fromString || classToAnimate;
  var animatedClass = function() {};
  Object.extend(animatedClass.prototype, SVGAnimated.prototype);
  if (!readonly)
    animatedClass.prototype.__defineSetter__('baseVal',
      function(value) { this._baseVal = value; });
  animatedClass.fromString = function(s) {
    var object = new animatedClass;
    object._baseVal = fromString(s);
    return object;
  };
  return animatedClass;
};

Object.extend(SVGAnimated.prototype, {
  get baseVal() { return this._baseVal; },
  // TODO this isn't correct...
  get animVal() { return this._baseVal; },
  toString: function() { return this._baseVal.toString(); }
});

// TODO will Boolean correctly parse the value strings? Probably not...
var SVGAnimatedBoolean = SVGAnimated.defineAnimated(Boolean);
var SVGAnimatedNumber = SVGAnimated.defineAnimated(SVGNumber);
var SVGAnimatedEnumeration = SVGAnimated.defineAnimated(parseInt);
var SVGAnimatedLength = SVGAnimated.defineAnimated(SVGLength, true);
var SVGAnimatedString = SVGAnimated.defineAnimated(String);
var SVGAnimatedNumberList = SVGAnimated.defineAnimated(SVGNumberList, true);
var SVGAnimatedLengthList = SVGAnimated.defineAnimated(SVGLengthList, true);
var SVGAnimatedTransformList = SVGAnimated.defineAnimated(SVGTransformList, true);

// SVGLocatable

var SVGLocatable = function() {};
Object.extend(SVGLocatable.prototype, {
  get nearestViewportElement() { TODO(); },
  get farthestViewportElement() { TODO(); },
  getBBox: function() { TODO(); },
  getCTM: function() { TODO(); },
  getScreenCTM: function() { TODO(); },

  getTransformToElement: function(element) {
    var matrix;

    if (this === element)
      return new SVGMatrix;
    if (this.parentNode && this.parentNode.getTransformToElement)
      matrix = this.parentNode.getTransformToElement(element);
    else
      matrix = new SVGMatrix;

    if (this.hasAttribute('transform') &&
        this.transform.baseVal.numberOfItems) {
      var list = new SVGTransformList;
      list._items = this.transform.baseVal._items.concat();
      // TODO which is right?
      matrix = matrix.multiply(list.consolidate().matrix.inverse());
      //matrix = list.consolidate().matrix.inverse().multiply(matrix);
    }

    return matrix;
  },
});

// SVGTransformable

var SVGTransformable = function() { SVGLocatable.call(this); };
Object.extend(SVGTransformable.prototype, SVGLocatable.prototype);
Element.defineAttributes(SVGTransformable,
  {name:'transform', type:SVGAnimatedTransformList, readonly:true});

// SVGStylable

var SVGStylable = function() {};
Element.defineAttributes(SVGStylable,
  {name:'className', type:SVGAnimatedString,   readonly:true, xmlName:'class'},
  {name:'style',     type:CSSStyleDeclaration, readonly:true});
SVGStylable.prototype.getPresentationAttribute = function(name) { TODO(); };

// SVGAnimatedPoints

var SVGAnimatedPoints = function() {};
Element.defineAttributes(SVGAnimatedPoints,
  {name:'points',         type:SVGPointList, readonly:true});

Object.extend(SVGAnimatedPoints.prototype, {
  get animatedPoints() { return this.points; } // TODO not correct...
});

// SVGElement

var SVGElement = function() { Element.call(this); };
Object.extend(SVGElement.prototype, Element.prototype);
Element.factories['http://www.w3.org/2000/svg'] = SVGElement.factory = {};

SVGElement.defineElement = function(name, parents) {
  (parents = parents || []).unshift(this);
  var element = function() {
      parents.forEach(function(parent) { parent.call(this); }, this);
  };
  element.attributeSpecs = {};
  parents.forEach(function(parent) {
    Object.extend(element.attributeSpecs, parent.attributeSpecs);
    Object.extend(element.prototype, parent.prototype);
  });
  Element.defineAttributes.apply(Element,
    [element].concat(Array.prototype.slice.call(arguments, 2)));
  if (name) {
    this.factory[name] = element;
    element.tagName = 'http://www.w3.org/2000/svg:' + name;
  }
  return element;
};

Element.defineAttributes(SVGElement, 'id', 'xmlbase');

Object.extend(SVGElement.prototype, {
  get ownerSVGElement() {
    return Node.findAncestor(this, function(p) { return p.nodeName == 'svg'; });
  },
  get viewpointElement() { TODO(); },
});

// SVGSVGElement

var SVGSVGElement = SVGElement.defineElement('svg', [SVGLocatable, SVGStylable],
  {name:'x',      type:SVGAnimatedLength, readonly:true, defaultValue:'0'},
  {name:'y',      type:SVGAnimatedLength, readonly:true, defaultValue:'0'},
  {name:'width',  type:SVGAnimatedLength, readonly:true, defaultValue:'100%'},
  {name:'height', type:SVGAnimatedLength, readonly:true, defaultValue:'100%'});

Object.extend(SVGSVGElement.prototype, {
  createSVGMatrix: function() { return new SVGMatrix; },
  createSVGTransform: function() { return new SVGTransform; },
  createSVGPoint: function() { return new SVGPoint(); }
});

// SVGDefsElement

var SVGDefsElement = SVGElement.defineElement('defs',
  [SVGTransformable, SVGStylable]);

// SVGEllipseElement

var SVGEllipseElement = SVGElement.defineElement('ellipse',
  [SVGTransformable, SVGStylable],
  {name:'cx', type:SVGAnimatedLength, readonly:true, defaultValue:'0'},
  {name:'cy', type:SVGAnimatedLength, readonly:true, defaultValue:'0'},
  {name:'rx', type:SVGAnimatedLength, readonly:true, defaultValue:'0'},
  {name:'ry', type:SVGAnimatedLength, readonly:true, defaultValue:'0'});

// SVGGElement

var SVGGElement = SVGElement.defineElement('g', [SVGTransformable, SVGStylable]);

// SVGGradientElement

var SVGGradientElement = SVGElement.defineElement(null, [SVGStylable],
  {name:'gradientUnits',     type:SVGAnimatedEnumeration,   readonly:true},
  {name:'gradientTransform', type:SVGAnimatedTransformList, readonly:true},
  {name:'spreadMethod',      type:SVGAnimatedEnumeration,   readonly:true});

Object.extend(SVGGradientElement, {
  SVG_SPREADMETHOD_UNKNOWN: 0,
  SVG_SPREADMETHOD_PAD:     1,
  SVG_SPREADMETHOD_REFLECT: 2,
  SVG_SPREADMETHOD_REPEAT:  3
});

// SVGLinearGradientElement

var SVGLinearGradientElement = SVGElement.defineElement('linearGradient',
  [SVGGradientElement],
  {name:'x1', type:SVGAnimatedLength, readonly:true, defaultValue:  '0%'},
  {name:'y1', type:SVGAnimatedLength, readonly:true, defaultValue:  '0%'},
  {name:'x2', type:SVGAnimatedLength, readonly:true, defaultValue:'100%'},
  {name:'y2', type:SVGAnimatedLength, readonly:true, defaultValue:  '0%'});

// SVGRadialGradientElement

var SVGRadialGradientElement = SVGElement.defineElement('radialGradient',
  [SVGGradientElement],
  {name:'cx', type:SVGAnimatedLength, readonly:true, defaultValue:'50%'},
  {name:'cy', type:SVGAnimatedLength, readonly:true, defaultValue:'50%'},
  {name: 'r', type:SVGAnimatedLength, readonly:true, defaultValue:'50%'},
  {name:'fx', type:SVGAnimatedLength, readonly:true},
  {name:'fy', type:SVGAnimatedLength, readonly:true});

// SVGPolygonElement

var SVGPolygonElement = SVGElement.defineElement('polygon',
  [SVGAnimatedPoints, SVGTransformable, SVGStylable]);

// SVGPolylineElement

var SVGPolylineElement = SVGElement.defineElement('polyline',
  [SVGAnimatedPoints, SVGTransformable, SVGStylable]);

// SVGRectElement

var SVGRectElement = SVGElement.defineElement('rect',
  [SVGTransformable, SVGStylable],
  {name:     'x', type:SVGAnimatedLength, readonly:true, defaultValue:'0'},
  {name:     'y', type:SVGAnimatedLength, readonly:true, defaultValue:'0'},
  {name: 'width', type:SVGAnimatedLength, readonly:true},
  {name:'height', type:SVGAnimatedLength, readonly:true},
  {name:    'rx', type:SVGAnimatedLength, readonly:true},
  {name:    'ry', type:SVGAnimatedLength, readonly:true});

// SVGStopElement

var SVGStopElement = SVGElement.defineElement('stop', [SVGStylable],
  {name:'offset', type:SVGAnimatedNumber, readonly:true});

// SVGTextContentElement

var SVGTextContentElement = SVGElement.defineElement(null, [SVGStylable],
  {name:'textLength',   type:SVGAnimatedLength,      readonly:true},
  {name:'lengthAdjust', type:SVGAnimatedEnumeration, readonly:true});

Object.extend(SVGTextContentElement, {
  LENGTHADJUST_UNKNOWN:          0,
  LENGTHADJUST_SPACING:          1,
  LENGTHADJUST_SPACINGANDGLYPHS: 2
});

Object.extend(SVGTextContentElement.prototype, {
  getNumberOfChars: function () { TODO(); },
  getComputedTextLength: function() { TODO(); },
  getSubStringLength: function(charnum, nchars) { TODO(); },
  getStartPositionOfChar: function(charnum) { TODO(); },
  getEndPositionOfChar: function(charnum) { TODO(); },
  getExtentOfChar: function(charnum) { TODO(); },
  getRotationOfChar: function(charnum) { TODO(); },
  getCharNumAtPosition: function(pot) { TODO(); },
  selectSubString: function(charnum, nchars) { TODO(); },
});

// SVGTextPositioningElement

var SVGTextPositioningElement = SVGElement.defineElement(null,
  [SVGTextContentElement],
  {name:'x',      type:SVGAnimatedLengthList, readonly:true},
  {name:'y',      type:SVGAnimatedLengthList, readonly:true},
  {name:'dx',     type:SVGAnimatedLengthList, readonly:true},
  {name:'dy',     type:SVGAnimatedLengthList, readonly:true},
  {name:'rotate', type:SVGAnimatedNumberList, readonly:true});

// SVGTextElement

var SVGTextElement = SVGElement.defineElement('text',
  [SVGTextPositioningElement, SVGTransformable]);

// SVGTSpanElement

var SVGTSpanElement = SVGElement.defineElement('tspan', [SVGTextPositioningElement]);


var SVGFilterElement = SVGElement.defineElement('filter',  [SVGStylable], // SVGURIReference, 
    {});

var SVGImageElement =  SVGElement.defineElement('image', [SVGLocatable, SVGStylable],
    {name:'x', type:SVGAnimatedLength, defaultValue:  '0'},
    {name:'y', type:SVGAnimatedLength, defaultValue:  '0'},
    {name:'width', type:SVGAnimatedLength, defaultValue: '0'},
    {name:'height', type:SVGAnimatedLength, defaultValue:  '0'}
);


var SVGFEGaussianBlurElement = SVGElement.defineElement('feGaussianBlur', null,
    {name: "in1", readonly: true, type:SVGAnimatedString},
    {name: "stdDeviation", readonly: true, type:SVGAnimatedNumber}
//    {name: "stdDeviationY", readonly: true, type:SVGAnimatedNumber} // verify the spec about XY vs a single deviation
);
						       