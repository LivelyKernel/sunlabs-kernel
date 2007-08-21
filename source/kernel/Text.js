/**
 * Text.js.  This file defines the text support interface for the Flair system.
 */

/**
 * @class TextLine
 */ 

var TextLine = HostClass.fromElement('tspan');

Object.extend(TextLine.prototype, DisplayObject.prototype);

Object.extend(TextLine, {

    create: function(textString, startIndex, leftX, topY, font) {
        var tl =  TextLine(null);
        tl.init(textString, startIndex, leftX, topY, font);
        return tl;
    },

    become: function(node) {
        var elt = HostClass.becomeInstance(node, TextLine);
        var font = FontInfo.forFamily(elt.getAttribute("font-family"), elt.getAttribute("font-size"));
        elt.init(elt.textContent, 0, elt.naiveGetX(), elt.naiveGetY() - font.getSize(), font);
        return elt;
    }

});

Object.extend(TextLine.prototype, {

    makeSpan: function(start, stop, leadingSpaces) {
        // return;
        var span = document.createSVGElement("tspan");
        span.textString = this.textString.substring(start, stop + 1);

        if (leadingSpaces) {
            span.setRelativeX(leadingSpaces * this.font.getCharWidth(' '));
        }

        // console.log('making a span ' + span.textString);
        // this.appendChild(span);
        return span;
    },

    init: function(textString, startIndex, leftX, topY, font) {
        this.textString = textString;
        this.startIndex = startIndex;
        // KP: not stopIndex will be calculated by compose
        this.stopIndex = textString.length - 1;
        this.leftX = leftX;
        this.topY = topY; 
        this.textContent = this.textString; //.substring(this.startIndex);
        this.font = font;
        this.setAttributeNS(null, "font-family", font.getFamily()); // has to be individually set
        this.setAttributeNS(null, "font-size", font.getSize()); // has to be individually set
        this.setX(leftX);
        this.setY(topY + font.getSize());
    },

    compose: function(compositionWidth) {
        // Determine the stopIndex for this line
        var indexOfLastSpace = -1;
        var str = this.textString; //for brevity
        var rightX = this.leftX + compositionWidth;
        var leadingSpaces = 0;
    
        for (var i = this.startIndex; i < str.length; i++) {
            var c = str[i];
            if (c == "\n") { // New line --  check for LFCR
                if (str.length >= i && str[i+1] == "\r") 
                    this.setStopIndex(i + 1); 
                else 
                    this.setStopIndex(i);
                //this.makeSpan(indexOfLastSpace + 1, i, leadingSpaces);
                return;
            }
        
            if (c == "\r") { // CR -- check for CRLF
            
                if (str.length >= i && str[i+1] == "\n")
                    this.setStopIndex(i + 1);
                else 
                    this.setStopIndex(i);
                
                //this.makeSpan(indexOfLastSpace + 1, i, leadingSpaces);
                return;
            }
        
            if (c == " ") {
                if (leadingSpaces == 0) { // we had a word before
                    //this.makeSpan(indexOfLastSpace + 1, i - 1, leadingSpaces);
                } 
                
                leadingSpaces ++;
                indexOfLastSpace = i;
            } 
        
            if (this.getBounds(i).maxX() >= rightX) { // Hit right bounds -- wrap at word break if possible
                if (indexOfLastSpace >= 0) {
                    this.setStopIndex(indexOfLastSpace); 
                } else { 
                    this.setStopIndex(Math.max(this.startIndex, i - 1)); 
                }
                return;
            }
        }
    
        // Reached the end of text
        this.setStopIndex(str.length - 1); 
    },
    
    setStopIndex: function(i) { 
        this.stopIndex = i; 
    },
    
    getBounds: function(stringIndex, debug) { 
        // string index points into the shared array so 
        var elementIndex = stringIndex - this.startIndex;
        var result = this.getExtentOfChar(elementIndex);
    
        if (result) {
            // result.y += this.topY;
            if (debug)
                console.info('TextLine.getBounds(%s) is %s string %s topY %s', 
                 elementIndex, result, this.textContent, this.topY);
            return result;
        } else {
            console.warn('TextLine.getBounds(%s) undefined, string "%s" extents %s', 
                         elementIndex, this.textContent, this.extentTableToString());
            return pt(0,0).asRectangle();
        }
    },
    
    indexForX: function(rightX) { 
        // FIXME +2??
        var num = this.getCharNumAtPosition(pt(rightX, this.topY + 2));
        return this.startIndex + num;
    },
    
    adjustAfterComposition: function() {
        this.textContent = this.textString.substring(this.startIndex, this.stopIndex + 1); // XXX
        // this.element.setAttributeNS(null, "visibility", "visible");
    }
    
});

/**
 * @class TextBox
 */ 

var TextBox = HostClass.fromElement('text');

Object.extend(TextBox.prototype, DisplayObject.prototype);

Object.extend(TextBox, {
    create: function(textString, lineHeight, textColor) {
        var elt = TextBox(null);
        elt.init(textString, lineHeight, textColor);
        return elt;
    },

    become: function(node) {
        var elt = HostClass.becomeInstance(node, TextBox);
        elt.lines = elt.recoverLines();
        var content = elt.recoverTextContent();

        var lineHeight = parseFloat(elt.getAttributeNS(Namespace.LIVELY, "line-height"));
        elt.init(content, lineHeight, Color.black); // FIXME
        return elt;
    }

});

Object.extend(TextBox.prototype, {
    eventHandler: { handleEvent: function(evt) { console.log('got event %s on %s', evt, evt.target); }},

    init: function(textString, lineHeight, textColor) {
        this.textString = textString;//: String
        this.lineHeight = lineHeight;//: float
        this.setAttributeNS(Namespace.LIVELY, "line-height", lineHeight); // serialization helper, FIXME?
        this.setAttributeNS(null, "kerning", 0);
        this.setTextColor(textColor);
        
        this.setType("TextBox");
        for (var type in ['beforecopy', 'beforecut', 'beforepaste', 'cut', 'copy', 'paste']) {
            this.addEventListener('beforecopy', this.eventHandler, true);
        }

        this.lines = null;//: TextLine[]
        this.leftX = null;//: float
        this.topY = null;//: float
    },
    
    recoverLines: function() {
        var tls = [];
        for (var child = this.firstChild; child != null; child = child.nextSibling) {
            if (child.tagName == 'tspan') tls.push(TextLine.become(child));
        }
        tls.forEach(function(m) { TextLine.become(m); });
        return tls;
    },

    recoverTextContent: function() {
        // concatenate content from all the lines
        if (this.lines == null) {
            console.log('no lines for %s', this);
            return;
        }
        
        var content = "";

        for (var i = 0; i < this.lines.length; i++ ) {
            content += this.lines[i].textContent;
        }

        console.log('reassembled textString to %s', content);
        return content;
    },

    setTextColor: function(textColor) {
        this.setAttributeNS(null, "fill", textColor);
    },
    
    renderText: function(x, y, compositionWidth, font) {
        if (this.lines == null) { 
            this.lines = this.composeLines(x, y, compositionWidth, font);
        }
    
        var lineY = y;

        for (var i = 0; i < this.lines.length; i++) {
            this.appendChild(this.lines[i]);
            lineY += this.lineHeight;
        }
    },
    
    composeLines: function(x, y, compositionWidth, font) {
        var lines = [];
        var startIndex = 0;
        var stopIndex = this.textString.length - 1;
        var lineY = y;
    
        while (startIndex <= stopIndex) {
            var line = TextLine.create(this.textString, startIndex, x, lineY, font);
            line.compose(compositionWidth);
            line.adjustAfterComposition();
            lines.push(line);
            startIndex = line.stopIndex + 1;
            lineY += this.lineHeight;
        }
        
        //console.log('text ' + this.textString + ' has lines ' + lines.length);
        return lines;
    },
    
    getBounds: function(stringIndex, debug) {
        // return the bounding rectangle for the i-th character in textString
        var line = this.lineForIndex(stringIndex, debug);
        return line == null ? null : line.getBounds(stringIndex, debug); 
    },

    hit: function(x,y) {
        // return the index of the character whose bounds include pt(x,y), else -1
        var line = this.lineForY(y);
        return line == null ? -1 : line.indexForX(x); 
    },

    lineForIndex: function(stringIndex) {
        for (var i = 0; i < this.lines.length; i++) {
            var line = this.lines[i];
            if (stringIndex <= line.stopIndex)  
            return line; 
        }
    
        return null; 
    },

    lineForY: function(y) {
        if (this.lines.length < 1 || y < this.lines[0].topY) return null;
    
        for (var i = 0; i < this.lines.length; i++) {
            line = this.lines[i];
            if (y < this.lines[i].topY + this.lineHeight) {
                // console.log('hit line ' + i + ' for y ' + y + ' slice ' + line.startIndex + "," + line.stopIndex);
                return line; 
            }
        }
    
        return null; 
    },
    
    destroy: function() {
        // console.log('destroying text ' + this.textString);
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    }
});

/**
 * @class TextMorph
 */ 

TextMorph = HostClass.create('TextMorph', Morph);

// TextMorph attributes and initialization functions
Object.extend(TextMorph, {

    makeLabel: function(rect, textString) {
        var morph = TextMorph(rect, textString);
        morph.setBorderWidth(0);
        morph.setFill(null);
        morph.wrap = "shrinkWrap";
        // morph.isAccepting = false;
        morph.ignoreEvents();
        morph.layoutChanged();
        morph.okToBeGrabbedBy = function(evt) { this.isDesignMode() ? this : null; }
        return morph;
    },

    makeInputLine: function(rect, initialText) {
        var morph = TextMorph(rect, initialText ? initialText : "");
        morph.wrap = "noWrap";
        morph.onKeyPress = function(evt) {
            if (evt.sanitizedKeyCode() == Event.KEY_ENTER) {
                this.saveContents(this.textString);
                return true;
            } else {
                return TextMorph.prototype.onKeyPress.call(this, evt);
            }
        };

        morph.okToBeGrabbedBy = function(evt) { this.isDesignMode() ? this : null; }
        return morph;
    }

});

// debuging convenience    
TextMorph.lastInstance = null;

// TextMorph attributes and basic functions
Object.extend(TextMorph.prototype, {
    // maybe use a CSS class for this ??

    // these are prototype variables
    fontSize: 12,
    fontFamily: 'Helvetica',
    textColor: Color.black,
    defaultBackgroundColor: Color.veryLightGray,
    defaultBorderWidth: 1,
    defaultBorderColor: Color.black,
    selectionColor: Color.primary.green,
    inset: pt(6,4), // remember this shouldn't be modified unless every morph should get the value 
    wrap: "wrap",  // "wrap" fits text to bounds width using word wrap and sets height
        // "noWrap" simply sets height based on line breaks only
        // "shrinkWrap" sets both width and height based on line breaks only


    initializeTransientState: function(initialBounds) {
        TextMorph.superClass.initializeTransientState.call(this, initialBounds);
        // this.textBox = null;
        this.selectionRange = [0,-1]; // null or a pair of indices into textString
        this.selectionPivot = null;  // index of hit at onmousedown
        this.priorSelection = [0,-1];  // for double-clicks
        this.autoAccept = false;
        this.hasKeyboardFocus = false;
        this.isSelecting = false; // true if last onmousedown was in character area (hit>0)
        this.acceptInput = true; // whether it accepts changes to text KP: change: interactive changes
        // note selection is transient
    
        if (this.textBox && this.textBox.lines) {
            // FIXME hack!!!
            this.font = FontInfo.forFamily(this.textBox.lines[0].getAttribute("font-family"), 
            this.textBox.lines[0].getAttribute("font-size"));
            console.log('got font %s', font);
        } else {
            this.font = FontInfo.forFamily(this.fontFamily, this.fontSize);
        }
    },

    initializePersistentState: function(initialBounds, shapeType) {
        // this.textBox = null;
        TextMorph.superClass.initializePersistentState.call(this, initialBounds, shapeType);
        // this.selectionElement = this.addChildElement(document.createSVGElement('use').withHref("#TextSelectionStyle"));

        // the selection element is persistent although its contents are not
        // generic <g> element with 1-3 rectangles inside
        this.selectionElement = this.addChildElement(DisplayObjectList('Selection'));
        this.selectionElement.setAttributeNS(null, "fill", this.selectionColor);
        //this.selectionElement.setAttributeNS(null, "fill", "url(#SelectionGradient)");
        this.selectionElement.setAttributeNS(null, "stroke-width", 0);

    },
    
    restoreFromElement: function(element, context) /*:Boolean*/ {
        if (TextMorph.superClass.restoreFromElement.call(this, element)) return true;

        var type = DisplayObject.prototype.getType.call(element);
    
        switch (type) {
        case 'TextBox':
            this.textBox = TextBox.become(element); // FIXME
            console.log('found textbox %s %s', this.textBox, this.textBox && this.textBox.textString);
            this.textString = this.textBox.textString;
            return true;
        case 'Selection':
            // that's ok, it's actually transient 
            // remove all chidren b/c they're really transient
            this.selectionElement = DisplayObjectList.become(element, type);
            console.log('processing selection %s', element);
            this.undrawSelection();
            return true;
        default:
            console.log('unknown type %s', type);
            return false;
        }
    },

    initialize: function(rect, textString) {
        TextMorph.superClass.initialize.call(this, rect, "rect");
        TextMorph.lastInstance = this; 

        this.textString = textString;

        // KP: set attributes on the text elt, not on the morph, so that we can retrieve it
        this.setFill(this.defaultBackgroundColor);
        this.setBorderWidth(this.defaultBorderWidth);
        this.setBorderColor(this.defaultBorderColor);
        // KP: note layoutChanged will be called on addition to the tree
        // DI: ... and yet this seems necessary!
        this.layoutChanged();

        return this;
    },

    defaultOrigin: function(bounds) { 
        return bounds.topLeft(); 
    },

    bounds: function() {
        if (this.fullBounds != null) return this.fullBounds;
        if (this.textBox) this.textBox.destroy();

        this.textBox = null;
        this.fitText(); // adjust bounds or text for fit
    
        return TextMorph.superClass.bounds.call(this); 
    },

    copy: function() {
        var copy = TextMorph(this.bounds(), this.textString);
        copy.morphCopyFrom(this);
        // copy.textBox = null;
        copy.setFontSize(this.getFontSize());
        // FIXME what about all the other stuff ...
        copy.selectionRange = copy.selectionRange.slice(0);
        return copy; 
    },

    changed: function() {
        this.bounds(); // will force new bounds if layout changed
        TextMorph.superClass.changed.call(this);
    },
    
    setTextColor: function(color) {
        this.textColor = color;
        if (this.textBox) {
            this.textBox.setTextColor(color);
        }
    },
    
    getTextColor: function() {
        return this.textColor;
    },

    // Since command keys do not always work,
    // make it possible to evaluate the contents
    // of the TextMorph via popup menu
    morphMenu: function(evt) { 
        var menu = TextMorph.superClass.morphMenu.call(this, evt);
        menu.addItem(["evaluate text", this, 'evaluateText']);
        return menu;
    },

    evaluateText: function() {
        this.evalInContext(this.textString);
    }

});

// TextMorph composition functions
Object.extend(TextMorph.prototype, {
    
    textTopLeft: function() { 
        return this.shape.bounds().topLeft().addPt(this.inset); 
    },
    
    innerBounds: function() { 
        return this.shape.bounds().insetByPt(this.inset); 
    },
    
    lineHeight: function() { 
        return this.getFontSize() + 2; // for now
    },

    ensureTextBox: function() { // created on demand and cached
        if (this.ensureTextString() == null) return null;
        
        if (this.textBox == null) {
            this.textBox = TextBox.create(this.textString, this.lineHeight(), this.textColor);
            // this.textBox.setFontSize(this.fontSize);
            var topLeft = this.textTopLeft();
            this.textBox.renderText(topLeft.x, topLeft.y, this.compositionWidth(), this.font);
            this.addChildElement(this.textBox);
        }
        
        return this.textBox; 
    },
    
    ensureTextString: function() { 
        // may be overrridden
        return this.textString; 
    }, 
    
    compositionWidth: function() {
        if (this.wrap == "wrap") return this.shape.bounds().width - (2*this.inset.x);
        else return 9999; // Huh??
    },

    // DI: Should rename fitWidth to be composeLineWrap and fitHeight to be composeWordWrap
    fitText: function() { 
        if (this.wrap == "wrap") this.fitHeight();
        else this.fitWidth();
    },

    fitHeight: function() { //Returns true iff height changes
        // Wrap text to bounds width, and set height from total text height
        if (this.ensureTextBox() == null) { 
            console.log("textbox error in fitHeight"); 
            return; 
        }
        
        var jRect = this.textBox.getBounds(this.textString.length - 1);
    
        if (jRect == null) { 
            console.log("char bounds is null"); 
            return; 
        }
        
        // console.log('last char is ' + jRect.inspect() + ' for string ' + this.textString);
        var maxY = jRect.maxY();
    
        if (this.shape.bounds().maxY() == maxY + this.inset.y) 
            return; // No change in height  // *** check that this converges
    
        var bottomY = this.inset.y + maxY;
    
        with (this.shape) { setBounds(bounds().withHeight(bottomY - bounds().y))};

        // Make sure focus halo gets updated when the height changes        
        this.removeFocusHalo();
        if (this.hasKeyboardFocus) this.addFocusHalo(); 

    },

    fitWidth: function() {
        // Set morph bounds based on max text width and height
        var composer = this.ensureTextBox();
        if (!composer) {
            console.log("fitWidth failure on TextBox.ensureTextBox"); 
            return;
        }
        
        var jRect = composer.getBounds(0);
        if (jRect == null) { 
            console.log("fitWidth failure on TextBox.getBounds"); 
            return; 
        }
    
        var x0 = jRect.x;
        var y0 = jRect.y;
        var maxX = jRect.maxX();  
        var maxY = jRect.maxY();
    
        // DI: really only need to check last char before each CR...
        // DI: in fact text box should already have done this
        for (var i = 0; i < this.textString.length; i++) { 
            jRect = composer.getBounds(i);
            if (jRect == null) { 
                console.log("null bounds at char " + i); 
                return false; 
            }
            maxX = Math.max(maxX,jRect.maxX());
            maxY = Math.max(maxY,jRect.maxY()); 
        }
        
        // if (this.innerBounds().width==(maxX-x0) && this.innerBounds().height==(maxY-y0)) return; // No change in width *** check convergence
        var bottomRight = this.inset.addXY(maxX,maxY);

        // DI: This should just say, eg, this.shape.setBottomRight(bottomRight);
        if (this.wrap = "noWrap")  with (this.shape) { setBounds(bounds().withHeight(bottomRight.y - bounds().y)); }
        else with (this.shape) { setBounds(bounds().withBottomRight(bottomRight)); } 
    },

    showsSelectionWithoutFocus: function() { 
        return false;  // Overridden in, eg, Lists
    },
    
    undrawSelection: function() {
        this.selectionElement.removeAll();
    },

    // FIXME (Safari draws its own selection)
    drawSelection: function() { // should really be called buildSelection now
    
        if (!this.showsSelectionWithoutFocus() && this.takesKeyboardFocus() && !this.hasKeyboardFocus) {
            return;
        }

        this.undrawSelection();
        
        // console.log('will draw selection ' + this.selectionRange + ' on '  + this.inspect());
    
        var jRect = this.ensureTextBox().getBounds(this.selectionRange[0]);
        if (jRect == null) {
            console.log("text box failure in drawSelection index = " + this.selectionRange[0]); 
            return; o
        }
    
        var r1 = this.lineRect(jRect.withWidth(1));
        if (this.hasNullSelection()) {
            var r2 = r1.translatedBy(pt(-1,0)); 
        } else {
            jRect = this.textBox.getBounds(this.selectionRange[1]);
            if (jRect == null) return;
        
            var r2 = this.lineRect(jRect);
            r2 = r2.translatedBy(pt(r2.width - 1, 0)).withWidth(1); 
        }
    
        if (this.lineNo(r2) == this.lineNo(r1)) {
            this.selectionElement.push(RectShape(null, r1.union(r2)).roundEdgesBy(4));
        } else { // Selection is on two or more lines
            var localBounds = this.shape.bounds();
            r1 = r1.withBottomRight(pt(localBounds.maxX() - this.inset.x, r1.maxY()));
            r2 = r2.withBottomLeft(pt(localBounds.x + this.inset.x, r2.maxY()));
            this.selectionElement.push(RectShape(null, r1).roundEdgesBy(4));
            this.selectionElement.push(RectShape(null, r2).roundEdgesBy(4));
        
            if (this.lineNo(r2) != this.lineNo(r1) + 1) {
                // Selection spans 3 or more lines; fill the block between top and bottom lines
                this.selectionElement.push(RectShape(null, 
                                Rectangle.fromAny(r1.bottomRight(), r2.topLeft())).roundEdgesBy(4)); 
            }
        }
    
        // console.log('add selection ' + this.selectionElement.childNodes);
        // this.addChildElement(this.selectionElement);
    },
    
    lineNo: function(r) { //Returns the line number of a given rectangle
        var lineHeight = this.lineHeight();
        var y0 = this.textTopLeft().y;
        return Math.floor((r.center().y - y0) / lineHeight); 
    },
    
    lineRect: function(r) { //Returns a new rect aligned to text lines
        var lineHeight = this.lineHeight();
        var y0 = this.textTopLeft().y + 1;
        var y1 = y0 + lineHeight * Math.floor((r.center().y - y0) / lineHeight);
        return pt(r.x, y1).extent(pt(r.width, lineHeight)); 
    },
    
    charOfPoint: function(rawp) {  //Sanitized hit function
        var tl = this.textTopLeft();
        var px = Math.max(tl.x + 1, rawp.x);
        var py = rawp.y;
        var charIx = this.textBox.hit(px, py);
        // console.log('first hit ' + charIx);
    
        // TextBox returns -1 between lines -- try a little lower
        if (charIx < 0) 
            charIx = this.textBox.hit(px, py + 2);

        if (charIx >= 0) { // It's a normal character hit
            // People tend to click on gaps rather than character centers...
            var jRect = this.textBox.getBounds(charIx);
            
            if (jRect != null && px < jRect.center().x) {
                // console.log('correcting from ' + charIx);
                charIx = Math.min(charIx + 1, this.textString.length); 
            }
        
            // console.log('charOfPoint returning ' + charIx);
            return charIx;
        }
        
        // TextBox returns -1 above box -- return first char
        if (py < tl.y) 
            charIx = 0;
            
        // TextBox returns -1 right of last char on line -- try left of next line
        if (charIx < 0) 
            charIx = this.textBox.hit(tl.x + 1, py + this.lineHeight()) - 1;
            
        // TextBox won't hit last character -- maybe that's it
        if (charIx < 0) 
            return this.textString.length;
            
        return charIx; 
    }
    
}); 
 
// TextMorph mouse event functions 
Object.extend(TextMorph.prototype, {

    handlesMouseDown: function(evt) {
        // Do selecting if click is in selectable area
        return this.shape.bounds().insetByPt(this.inset).containsPoint(this.localize(evt.mousePoint)); 
    },

    onMouseDown: function(evt) {
        this.isSelecting = true;
        var charIx = this.charOfPoint(this.localize(evt.mousePoint));

        this.startSelection(charIx);
        evt.hand.setMouseFocus(this);
        this.requestKeyboardFocus(evt.hand);
        return true; 
    },

    onMouseMove: function(evt) {  
        if (!this.isSelecting) { 
            return TextMorph.superClass.onMouseMove.call(this, evt);
        }
        this.extendSelection(evt);
    },
    
    onMouseUp: function(evt) {
        evt.hand.setMouseFocus(null);
        this.isSelecting = false;
    
        // Check for repeated null selection meaning select word
        if (this.selectionRange[1] != this.selectionRange[0] - 1) return;
        if (this.priorSelection[1] != this.priorSelection[0] - 1) return;
        if (this.selectionRange[0] != this.priorSelection[0]) return;
        
        this.selectionRange = TextMorph.selectWord(this.textString, this.selectionRange[0]);
        this.setModelSelection(this.selectionString());
        this.drawSelection(); 
    }
    
});

// TextMorph text selection functions
Object.extend(TextMorph.prototype, { 
    
    startSelection: function(charIx) {  
        // We hit a character, so start a selection...
        // console.log('start selection @' + charIx);
        this.priorSelection = this.selectionRange;
        this.selectionPivot = charIx;
        this.setNullSelectionAt(charIx);
        
        // KP: was this.world().worldState.keyboardFocus = this; but that's an implicitly defined prop in Transmorph, bug?
        // KP: the following instead??
        // this.world().firstHand().setKeyboardFocus(this);
    },

    extendSelection: function(evt) { 
        var charIx = this.charOfPoint(this.localize(evt.mousePoint));
        // console.log('extend selection @' + charIx);
        if (charIx < 0) return;
        this.setSelectionRange(this.selectionPivot, charIx); 
    },
    
    selectionString: function() {
        return this.textString.substring(this.selectionRange[0], this.selectionRange[1] + 1); 
    },

    replaceSelectionWith: function(replacement) {
        var before = this.textString.substring(0,this.selectionRange[0]); 
        var after = this.textString.substring(this.selectionRange[1]+1,this.textString.length);
        if (this.acceptInput) this.setTextString(before.concat(replacement,after));
        this.setNullSelectionAt(before.length + replacement.length); 
    },
    
    setNullSelectionAt: function(charIx) { 
        this.setSelectionRange(charIx,charIx); 
    },
    
    hasNullSelection: function() { 
        return this.selectionRange[1] < this.selectionRange[0]; 
    },

    setSelectionRange: function(piv,ext) { 
        this.selectionRange = (ext >= piv) ? [piv,ext-1] : [ext,piv-1];
        this.setModelSelection(this.selectionString());
        this.drawSelection(); 
    }

});

// TextMorph keyboard event functions
Object.extend(TextMorph.prototype, {

    takesKeyboardFocus: function() { 
        // unlike, eg, cheapMenus
        return true; 
    },
    
    setHasKeyboardFocus: function(newSetting) { 
        this.hasKeyboardFocus = newSetting;
        return newSetting;
    },
    
    onFocus: function(hand) {
        TextMorph.superClass.onFocus.call(this, hand);
        this.drawSelection();
    },

    onBlur: function(hand) {
        TextMorph.superClass.onBlur.call(this, hand);
        if (!this.showsSelectionWithoutFocus()) this.undrawSelection();
    },


    onKeyDown: function(evt) {
        if (!this.acceptInput) return;
        
        // For some reason, this function is never called in Windows -- dunno why!

        // have to process commands in keydown...
        if (evt.altKey) {
            var replacement = (String.fromCharCode(evt.keyCode)).toLowerCase();
            return this.processCommandKeys(replacement);
        } 
    },
    
    onKeyPress: function(evt) {
        if (!this.acceptInput) return;
        
        // cleanup: separate BS logic, diddle selection range and use replaceSelectionWith()
        var before;
    
        if (evt.sanitizedKeyCode() == Event.KEY_BACKSPACE && this.hasNullSelection()) {
            before = this.textString.substring(0, this.selectionRange[1]); 
        } else { 
            before = this.textString.substring(0, this.selectionRange[0]);
        } 
    
        var after = this.textString.substring(this.selectionRange[1] + 1, this.textString.length);

        switch (evt.sanitizedKeyCode()) {
        case Event.KEY_BACKSPACE: { // Replace the selection after checking for type-ahead
            this.setTextString(before.concat(after));
            this.setNullSelectionAt(before.length); 
            evt.stop(); // do not use for browser navigation
            return;
        }
        case Event.KEY_LEFT: {
            // forget the existing selection
            this.setNullSelectionAt(Math.max(before.length - 1, 0));
            evt.stop();
            return;
        } 
        case Event.KEY_RIGHT: {
            // forget the existing selection
            this.setNullSelectionAt(Math.min(before.length + 1, this.textString.length));
            evt.stop();
            return;
        }
        case Event.KEY_ESC: {
            this.relinquishKeyboardFocus(this.world().firstHand());
            return;
        }
        case Event.KEY_UP:
        case Event.KEY_DOWN: {
            // do nothing for now
            // don't scroll the page
            evt.stop();
            return;
        }
        }

        if (!evt.altKey) {
            var replacement = String.fromCharCode(evt.charCode);
            this.replaceSelectionWith(replacement); 
            evt.stop(); // done
        } 
    },
    
    processCommandKeys: function(key) { 
        console.log('command ' + key);

        switch (key) {
        case "s": {
            this.saveContents(this.textString); 
            return; 
        }
    
        case "x": {
            this.clipboardString = this.selectionString(); 
            this.replaceSelectionWith("");
            return; 
        }
        
        case "c": {
            this.clipboardString = this.selectionString(); 
            return; 
        }
        
        case "v": {
            if (this.clipboardString)
                this.replaceSelectionWith(this.clipboardString); 
            return; 
        }
    
        case "d": {
            this.evalInContext(this.selectionString()); 
            return; 
        }
        
        case "p": {
            var strToEval = this.selectionString();
            this.setNullSelectionAt(this.selectionRange[1] + 1);
            console.log('selection = ' + strToEval);
            this.replaceSelectionWith(" " + this.evalInContext(strToEval).toString());
            return; 
        }
        
        case "a": {
            this.setSelectionRange(0, this.textString.length - 1); 
            return;
        }
        
        case "j": {
            return;
        }

        case "i": {
            this.addSvgInspector();
            return;
        }

        case "z": {
            if (this.undoTextString) {
                this.setTextString(this.undoTextString);
            }
        }
        }

        var bracketIndex = CharSet.leftBrackets.indexOf(key);

        if (bracketIndex >= 0) this.addOrRemoveBrackets(bracketIndex); 

    }
});

// TextMorph accessor functions
Object.category(TextMorph.prototype, "accessing", function() {

    // private (non overridable)
    function pvtUpdateTextString(morph, replacement) {
        // KP: FIXME: doesn't this potentially change the selection
        /*
        if (replacement.length < 100 && this.textString == replacement)
        // avoid long comparisons
        return;
        */
        // introducing new variable, simple one-level undo
        morph.undoTextString = morph.textString;
        morph.textString = replacement;
        // canvas.setFontSize(this.fontSize);
        morph.recordChange('textString');
    
        if (morph.textBox) morph.textBox.destroy();

        morph.textBox = null;
        morph.layoutChanged(); 
        morph.changed();
    }

    // public:
    return {
    
    saveContents: function(contentString) {    
        if (this.modelPlug == null) {
            eval(contentString); 
            this.world().changed(); 
            return; // Hack for browser demo
        } else if (!this.autoAccept) {
            this.setModelText(contentString); 
        }
    },
    
    evalInContext: function(str) {    
        // Evaluate the string argument in a context which may be supplied by the modelPlug
        var result;
        with (this.getModelValue('doitContext', this)) { result = eval(str) };
        return result; 
    },
    
    addOrRemoveBrackets: function(bracketIndex) {
        var left = CharSet.leftBrackets[bracketIndex];
        var right = CharSet.rightBrackets[bracketIndex];
        
        if (bracketIndex == 0) { left = "/*"; right = "*/"; }
    
        var i1 = this.selectionRange[0];
        var i2 = this.selectionRange[1];
        
        if (i1 - left.length >= 0 && this.textString.substring(i1-left.length,i1) == left &&
            i2 + right.length < this.textString.length && this.textString.substring(i2+1,i2+right.length+1) == right) {
            // selection was already in brackets -- remove them
            var before = this.textString.substring(0,i1-left.length);
            var replacement = this.textString.substring(i1,i2+1);
            var after = this.textString.substring(i2+right.length+1,this.textString.length);
            this.setTextString(before.concat(replacement,after));
            this.setSelectionRange(before.length,before.length+replacement.length); 
        } else { // enclose selection in brackets
            var before = this.textString.substring(0,i1);
            var replacement = this.textString.substring(i1,i2+1);
            var after = this.textString.substring(i2+1,this.textString.length); 
            this.setTextString(before.concat(left,replacement,right,after));
            this.setSelectionRange(before.length+left.length,before.length+left.length+replacement.length); 
        }
    },
    
    getFontFamily: function() {
        return this.font.getFamily();
    },
    
    getFontSize: function() {
        return this.font.getSize();
    },

    setFontSize: function(newSize) {
        this.font = FontInfo.forFamily(this.font.getFamily(), newSize);
        // this.textBox.element.setAttributeNS(null, "font-size", newSize);
        this.inset = pt((this.getFontSize()/3)+2,(this.getFontSize()/3));
        this.setTextString(this.textString); 
    },
    
    setTextString: function(replacement) {
        if (this.autoAccept) this.setModelText(replacement);
        pvtUpdateTextString(this, replacement); 
    },
    
    
    updateTextString: function(newStr) {
        pvtUpdateTextString(this, newStr);
        this.resetScrollPane(); 
    },
    
    resetScrollPane: function() {
        // Need a cleaner way to do this ;-)
        if (this.owner() instanceof ClipMorph && this.owner().owner() instanceof ScrollPane) {
           this.owner().owner().scrollToTop();
        }
    },
    
    updateView: function(aspect, controller) {
        var p = this.modelPlug;
        if (p) {
            if (aspect == p.getText) this.updateTextString(this.getModelText());

            // if (aspect == p.getSelection) this.searchForMatch(this.getModelSelection());
            return;
        }
    },

    getModelText: function() {
        if (this.modelPlug) return this.getModelValue('getText', "-----");
    },

    setModelText: function(newText) {
        if (this.modelPlug) this.setModelValue('setText', newText);
    },

    setModelSelection: function(newSelection) {
        if (this.modelPlug) this.setModelValue('setSelection', newSelection);  // call the model's value accessor
    }
    
}});

// TextMorph word selection functions for the text editor
// FIXME: put these somewhere else?
Object.extend(TextMorph, {

    selectWord: function(str, i1) { // Selection caret before char i1
        var i2 = i1 - 1;
        
        if (i1 > 0) { // look left for o backets
            var i = CharSet.leftBrackets.indexOf(str[i1-1]);

            if (str[i1 - 1] == "*" && (i1-2 < 0 || str[i1-2] != "/")) 
                i = -1; // spl check for /*

            if (i >= 0) {
                var i2 = TextMorph.matchBrackets(str, CharSet.leftBrackets[i], CharSet.rightBrackets[i], i1 - 1, 1);
                return [i1, i2 - 1]; 
            } 
        }
        
        if (i1 < str.length) { // look right for close brackets
            var i = CharSet.rightBrackets.indexOf(str[i1]);
            
            if (str[i1]== "*" && (i1+1 >= str.length || str[i1+1] != "/")) 
                i = -1; // spl check for */

            if (i >= 0) {
                i1 = TextMorph.matchBrackets(str, CharSet.rightBrackets[i],CharSet.leftBrackets[i],i1,-1);
                return [i1+1, i2]; 
            } 
        }
        
        while (i1-1 >= 0 && CharSet.alphaNum.include(str[i1 - 1])) 
            i1 --;
    
        while (i2+1 < str.length && CharSet.alphaNum.include(str[i2 + 1])) 
            i2 ++;
    
        return [i1, i2]; 
    },

    matchBrackets: function(str, chin, chout, start, dir) { 
        var i = start;
        var depth = 1;
    
        while ((dir < 0) ? i - 1 >= 0 : i + 1 < str.length ) {
            i += dir;
            
            if (str[i] == chin && chin != chout) depth++;
            if (str[i] == chout) depth--;
            if (depth == 0) return i; 
        }
        
        return i; 
    }
    
});

/**
 * @class PrintMorph
 * A PrintMorph is just like a TextMorph, except it converts its model value
 * to a string using toString(), and from a string using eval()
 */ 

PrintMorph = HostClass.create('PrintMorph', TextMorph);

Object.extend(PrintMorph.prototype, {

    initialize: function(initialBounds, textString) {
        return PrintMorph.superClass.initialize.call(this, initialBounds, textString);
    }, 

    updateView: function(aspect, controller) {
        var p = this.modelPlug;
        if (p) {
            if (aspect == p.getValue) this.updateTextString(this.getModelText());
        }
    },
    
    getModelText: function() {
        return Object.inspect(this.getModelValue('getValue', null)).withNiceDecimals();  
    },
    
    setModelText: function(newText) {
        this.setModelValue('setValue', eval(newText));
    }

});

console.log('loaded Text.js');

