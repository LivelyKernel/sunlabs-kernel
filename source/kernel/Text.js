/**
 * Text.js.  This file defines the text support interface for the Flair system.
 */

/**
 * @class TextWord
 * This 'class' renders single words
 */ 
var TextWord = HostClass.fromElementType('tspan', false);
Object.extend(TextWord, {

    become: function(node) {
        var elt = HostClass.becomeInstance(node, TextWord);
        elt.fontInfo = FontInfo.forFamily(elt.getAttribute("font-family"), elt.getAttribute("font-size"));
        // FIXME
        return elt;
    }

});

Object.extend(TextWord.prototype, {

    initialize: function(textString, startIndex, topLeft, font) {
        this.textString = textString;
        this.startIndex = startIndex;
        this.stopIndex = textString.length - 1;
        this.topLeft = topLeft;
        this.textContent = this.textString; //.substring(this.startIndex);
	this.fontInfo = font;
        //this.setAttribute("font-family", font.getFamily()); // has to be individually set
        //this.setAttribute("font-size", font.getSize()); // has to be individually set
        this.setX(topLeft.x);
        this.setY(topLeft.y + font.getSize());
	this.didLineBreak = false;
        return this;
    },

    // compose a word within compositionWidth, stopping if the width or string width is exceeded
    // compositionWidth is in the same units as character metrics
    compose: function(compositionWidth, length) {
        var rightX = this.topLeft.x + compositionWidth;
        var leadingSpaces = 0;
    
	this.didLineBreak = false;
	// get the character bounds until it hits the right side of the compositionWidth
        for (var i = this.startIndex; i < this.textString.length && i < (this.startIndex + length); i++) {
          if (this.getBounds(i).maxX() >= rightX) {
	    // Hit right bounds -- wrap at word break if possible
            this.setStopIndex(Math.max(this.startIndex, i - 1)); 
	    this.didLineBreak = true;
            return;
          }
        }
        // Reached the end of text
	this.setStopIndex(i);
    },
    
    // accessor function
    setStopIndex: function(i) { 
        this.stopIndex = i; 
    },

    // accessor function
    getStopIndex: function() {
	return this.stopIndex;
    },

    // return true if we bumped into the width limit while composing
    getLineBrokeOnCompose: function() {
	return this.didLineBreak;
    },
    
    // get the bounds of the character pointed to by stringIndex
    //   return a (0,0),0x0 point if there are no bounds
    getBounds: function(stringIndex) { 
        var result = this.getExtentOfChar(stringIndex);

        if (result)
            return result;
        console.warn('TextWord.getBounds(%s) undefined, string "%s" extents %s', 
                     elementIndex, this.textContent, this.extentTableToString());
        return pt(0,0).asRectangle();
    },

    // keep a copy of the substring we were working on (do we really need this? - kam)
    adjustAfterComposition: function() {
        this.textContent = this.textString.substring(this.startIndex, this.stopIndex + 1); // XXX
        // this.element.setAttribute("visibility", "visible");
    },

    // string representation
    toString: function() {
	return "textString: (" + this.textString + ")" +
		  " substr: (" + this.textString,substring(this.startIndex, this.stopIndex) + ")" +
		  " startIndex: " + this.startIndex +
		  " stopIndex: " + this.stopIndex +
	          " topLeft: " + this.topLeft.inspect() +
		  " textContent: " + this.textContent +
		  " didLineBreak: " + this.didLineBreak;
    },

    // log debugging information to the console
    log: function(label) {
	var lString = this.toString();
	if (label != null)
	    lString = label + ": " + lString;
	console.log(lString);
    }
    
});

/**
 * @class WordChunk
 * This 'class' represents a chunk of text which might be printable or might be whitespace
 */ 

WordChunk = Class.create();

Object.extend(WordChunk, {

    // create a chunk representing printable text
    createWord: function(offset, length) {
        var w = new WordChunk(offset, length);
	return w;
    },

    // create a chunk representing whitespace (typically space characters)
    createWhite: function(offset, length) {
	var w = this.createWord(offset, length);
	w.isWhite = true;
	return w;
    },

    // create a chunk representing a newline
    createNewLine: function(offset) {
	var w = this.createWord(offset, 1);
	w.isWhite = true;
	w.isNewLine = true;
	return w;
    },

    // create a chunk representing a tab
    createTab: function(offset) {
	var w = this.createWord(offset, 1);
	w.isWhite = true;
	w.isTab = true;
	return w;
    }

});

Object.extend(WordChunk.prototype, {

    isWhite: false,
    isNewLine: false,
    isTab: false,

    initialize: function(offset, length) {
	this.start = offset;
	this.length = length;
	this.render = true;
	this.bounds = null;
	this.wasComposed = false;
	this.word = null;
    },

    // accessor function
    setWord: function(newWord) {
	this.word = newWord;
    },

    // accessor function
    getWord: function() {
	return this.word;
    },

    // query
    isSpaces: function() {
      return this.isWhite && !this.isTab && !this.isNewLine;
    },

    // clone a chunk only copying minimal information
    cloneSkeleton: function() {
      var c = WordChunk.createWord(this.start, this.length);
      c.isWhite = this.isWhite;
      c.isNewLine = this.isNewLine;
      c.isTab = this.isTab;
      return c;
    },

    // fully clone a chunk (see warnings)
    clone: function(src) {
	var c = cloneSkeleton; // KP: does this work? cloneSkeleton seems undefined here
      c.render = this.render;
      c.bounds = this.bounds; // BEWARE - not cloned
      c.wasComposed = this.wasComposed;
      c.word = this.word;     // BEWARE - not cloned
      return c;
    },

    // string representation
    toString: function() {
      var lString = "Chunk start: " + this.start +
		    " length: " + this.length +
		    " isWhite: " + this.isWhite +
		    " isNewLine: " + this.isNewLine +
		    " isTab: " + this.isTab +
		    " wasComposed: " + this.wasComposed;
      if (this.bounds == null)
	lString += " null bounds";
      else
	lString += " @(" + this.bounds.x + "," + this.bounds.y + ")(" +
		   this.bounds.width + "x" + this.bounds.height + ")";
      return lString;
    },

    // log debugging information to the console
    log: function(label) {
      var lString = this.toString();
      if (lString != null)
	lString = label + ": " + lString;
      console.log(lString);
    }
});

/**
 * @class TextLine
 * This 'class' renders lines composed of words and whitespace
 */ 

var TextLine = Class.create();

Object.extend(TextLine.prototype, {
    // create a new line
    initialize: function(textString, startIndex, topLeft, font, chunkSkeleton) {
	this.textString = textString;
        this.font = font;
	this.startIndex = startIndex;
	this.overallStopIndex = textString.legnth - 1;
	this.topLeft = topLeft;
	this.spaceWidth = font.getCharWidth(' ');
	this.tabWidth = this.spaceWidth * 4;
	this.hasComposed = false;
	this.chunks = chunkSkeleton;
	return this;
    },
    
    
    // is the character 'c' what we consider to be whitespace? (private)
    isWhiteSpace: function(c) {
        return (c == ' ' || c == '\t' || c == '\r' || c == '\n');
    },

    // is the character 'c' what we consider to be a newline? (private)
    isNewLine: function(c) {
	return (c == '\r' || c == '\n');
    },

    // we found a word so figure out where the chunk extends to (private)
    chunkFromWord: function(wString, offset) {
        for (var i = offset; i < wString.length; i++) {
	  // BEWARE - hand inlined (yuk!) for a surprisingly moderate gain (3026 vs 2984 ticks) - kam
	  //if (this.isWhiteSpace(wString[i]))
	  var c = wString[i];
	  if (c == ' ' || c == '\t' || c == '\r' || c == '\n')
	  // end if inline
	    return i - offset;
	}
	return i - offset;
    },

    // we found a space so figure out where the chunk extends to (private)
    chunkFromSpace: function(wString, offset) {
        for (var i = offset; i < wString.length; i++) {
	  if (wString[i] != ' ')
	    return i - offset;
	}
	return i - offset;
    },

    // look at wString starting at startOffset and return an array with all of the chunks in it
    chunkFromString: function(wString, startOffset) {
	var offset = startOffset;
	var pieces = [];
	var chunkSize;

	while (offset < wString.length) {
	  chunkSize = 1; // default is one character long
	  if (this.isWhiteSpace(wString[offset])) {
	    if (this.isNewLine(wString[offset]))
	      pieces.push(WordChunk.createNewLine(offset));
	    else if (wString[offset] == '\t') {
	      pieces.push(WordChunk.createTab(offset));
	    } else {
	      chunkSize = this.chunkFromSpace(wString, offset);
	      pieces.push(WordChunk.createWhite(offset, chunkSize));
	    }
	  } else {
	    chunkSize = this.chunkFromWord(wString, offset);
	    pieces.push(WordChunk.createWord(offset, chunkSize));
	  }
	  offset += chunkSize;
	}
	return pieces;
    },

    // do a chunkFromString on the string contained in the textString instance variable
    wordDecomposition: function(offset) {
	var chunks = this.chunkFromString(this.textString, offset);
	return chunks;
    },

    // compose a line of text, breaking it appropriately at compositionWidth
    compose: function(compositionWidth) {
	var runningStartIndex = this.startIndex;
	var mostRecentBounds = this.topLeft.asRectangle();
	var lastWord = null;
	
	// a way to optimize out repeated scanning
	if (this.chunks == null)
	    this.chunks = this.wordDecomposition(this.startIndex);
	for (var i = 0; i < this.chunks.length; i++) {
	    var c = this.chunks[i];
	    
	    if (c.isWhite) {
		var spaceIncrement = this.spaceWidth;
		c.bounds = mostRecentBounds.withX(mostRecentBounds.maxX());
		if (c.isNewLine) {
		    c.bounds.width = (this.topLeft.x + compositionWidth) - c.bounds.x;
		    runningStartIndex = c.start + c.length;
		    c.wasComposed = true;
		    if (lastWord) lastWord.setAttribute("nl", "true"); // little helper for serialization
		    break;
		}
		if (c.isTab) {
		    var tabXBoundary = c.bounds.x - this.topLeft.x;
		    c.bounds.width = Math.floor((tabXBoundary + this.tabWidth) / this.tabWidth) * this.tabWidth - tabXBoundary;
		} else {
		    c.bounds.width = spaceIncrement * c.length;
		    if (lastWord) lastWord.setAttribute("trail", c.length); // little helper for serialization
		}
		runningStartIndex = c.start + c.length;
	    } else {
		c.word = TextWord(this.textString, c.start, pt(mostRecentBounds.maxX(), this.topLeft.y), this.font);
		lastWord = c.word;
		c.word.compose(compositionWidth - (mostRecentBounds.maxX() - this.topLeft.x), c.length - 1);
		c.bounds = c.word.getBounds(c.start).union(c.word.getBounds(c.start + c.length - 1));
		if (c.word.getLineBrokeOnCompose()) {
		    if (i == 0) {
			// XXX in the future, another chunk needs to be inserted in the array at this point
			//     otherwise the bounds will be messed up - kam
			runningStartIndex = c.word.getStopIndex() + 1;
		    } else {
			// Back up to re-render this word and abort rendering
			c.render = false;
		    }
		    break;
		}
		runningStartIndex = c.start + c.length;
	    }
	    mostRecentBounds = c.bounds;
	    c.wasComposed = true;
	}
	this.overallStopIndex = runningStartIndex - 1;
	this.hasComposed = true;
    },

    // accessor function (maybe delete - kam)
    getStopIndex: function() {
	return this.overallStopIndex;
    },

    // after this line, where do we start from?
    getNextStartIndex: function() {
	return this.overallStopIndex + 1;
    },
    
    // accessor function
    getTopY: function() {
	return this.topLeft.y;
    },

    // get the bounds of the character at stringIndex
    getBounds: function(stringIndex) {
	for (var i = 0; i < this.chunks.length; i++) {
	    var c = this.chunks[i];
	    
	    if (stringIndex >= c.start &&
		stringIndex < (c.start + c.length)) {
		// DI:  Following code finds the actual character bounds
		if (c.word && c.word.getBounds) {
		    return c.word.getBounds(stringIndex);
		} else {
		    if (c.isSpaces()) {
			var virtualSpaceSize = c.bounds.width / c.length;
			var b = c.bounds.withWidth(virtualSpaceSize);
			b.x += virtualSpaceSize * (stringIndex - c.start);
			return b;
		    } else
			return c.bounds;
		}
	    }
	}
	return null;
    },

    // find the pointer into 'textString' for a given X coordinate in character metric space
    indexForX: function(rightX) {
	for (var i = 0; i < this.chunks.length; i++) {
	    var c = this.chunks[i];
	    
	    if (!c.wasComposed)
		continue;
	    if (rightX >= c.bounds.x && rightX <= c.bounds.maxX()) {
		if (c.word == null) {
		    var virtualSpaceSize = c.bounds.width / c.length;
		    var spacesIn = Math.floor((rightX - c.bounds.x) / virtualSpaceSize);
		    return c.start + spacesIn;
		} else {
		    for (var i = c.start; i < (c.start + c.length); i++) {
			var b = c.word.getBounds(i);
			if (rightX >= b.x && rightX <= b.maxX())
			    break;
		    }
		    return i;
		}
		return c.start; // failsafe
	    }
	}
	return 0; // should not get here unless rightX is out of bounds
    },

    // return a boolean if this line contains this pointer into 'textString'
    containsThisIndex: function(index) {
	return index <= this.getStopIndex();
    },

    // forward this on to all of the words (do we need this? - kam)
    adjustAfterComposition: function() {
	for (i = 0; i < this.chunks.length; i++)
	  if (this.chunks[i].word != null)
	    this.chunks[i].word.adjustAfterComposition();
    },

    // render each word contained in the line
    render: function(renderer) {
	for (var i = 0; i < this.chunks.length; i++)
	  if (this.chunks[i].word != null && this.chunks[i].render)
	    renderer.appendChild(this.chunks[i].word);
    },

    // clone the important parts of the chunks we have found to avoid re-scanning
    cloneChunkSkeleton: function(sIndex) {
	if (this.chunks == null)
	  return null;
	var nc = [];
	for (var i = 0; i < this.chunks.length; i++) {
	  var tc = this.chunks[i];
	  if (tc.start >= sIndex) {
	    var c = tc.cloneSkeleton();
	    // probably don't need this opmization now that we demand load extents
	    //if (tc.bounds != null)
	    //  c.bounds = tc.bounds.clone();
	    nc.push(c);
	  } else if (tc.start < sIndex && (tc.start + tc.length) > sIndex) {
	    // this chunk has been broken up by a word wrap
	    var c = tc.cloneSkeleton();
	    c.length -= sIndex - c.start;
	    c.start = sIndex;
	    nc.push(c);
	  }
	}
	return nc;
    },

    // accessor function
    setChunkSkeleton: function(c) {
	this.chunks = c;
    },

    // accessor function
    setTabWidth: function(w, asSpaces) {
	this.tabWidth = asSpaces ? w * this.spaceWidth : w;
    },

    // log debugging information to the console
    logChunks: function(label) {
      if (this.chunks) {
        for (i = 0; i < this.chunks.length; i++)
          this.chunks[i].log(label + ": TextLine");
      } else
        console.log(label + ": " + "no chunks");
    },

    // string representation
    toString: function() {
      var lString = "textString: (" + this.textString + ")" +
		    " startIndex: " + this.startIndex +
		    " overallStopIndex: " + this.overallStopIndex +
	            " topLeft: " + this.topLeft.inspect() +
		    " spaceWidth: " + this.spaceWidth + 
		    " hasComposed: " + this.hasComposed;
      return lString;
    },

    // log debugging information to the console
    log: function(label, printChunks) {
      var lString = this.toString();
      if (label != null)
	lString = label + ": " + lString;
      console.log(lString);
      if (printChunks != null & printChunks)
	this.logChunks(label);
    }
});


/**
 * @class TextBox
 */ 

var TextBox = HostClass.fromElementType('text', false);

Object.extend(TextBox.prototype, DisplayObject.prototype);

Object.extend(TextBox, {

    become: function(node) {
        var elt = HostClass.becomeInstance(node, TextBox);
        var content = elt.recoverTextContent();

        var lineHeight = parseFloat(elt.getAttributeNS(Namespace.LIVELY, "line-height"));
	var font = FontInfo.forFamily(elt.getFontFamily(), elt.getFontSize());

        elt.initialize(content, lineHeight, Color.black, font); // FIXME
        return elt;
    }

});

Object.extend(TextBox.prototype, {
    eventHandler: { handleEvent: function(evt) { console.log('got event %s on %s', evt, evt.target); }},

    initialize: function(textString, lineHeight, textColor, font) {
        this.textString = textString;//: String
        this.lineHeight = lineHeight;//: float
        this.setAttributeNS(Namespace.LIVELY, "line-height", lineHeight); // serialization helper, FIXME?
        this.setAttributeNS(null, "kerning", 0);
        this.setTextColor(textColor);
        this.setType("TextBox");
	this.fontInfo = font;
	this.setAttributeNS(null, "font-size", font.getSize());
	this.setAttributeNS(null, "font-family", font.getFamily());

	/*
        for (var type in ['beforecopy', 'beforecut', 'beforepaste', 'cut', 'copy', 'paste']) {
            this.addEventListener('beforecopy', this.eventHandler, true);
        }
        */

        this.lines = null;//: TextLine[]
	this.tabWidth = 4;
	this.tabsAsSpaces = true;
    },
    

    recoverTextContent: function() {

        var content = "";
        for (var child = this.firstChild; child != null; child = child.nextSibling) {
            if (child.tagName == 'tspan')  {
		var word = TextWord.become(child);
		content += word.textContent; 
		if (word.getAttribute("nl") == 'true') {
		    content += "\n";
		}
		var trail = parseInt(word.getAttribute("trail"));
		if (trail) {
		    for (var j = 0; j < trail; j++) {
			content += ' ';
		    }
		}
	    }
        }
        return content;
    },

    setTextColor: function(textColor) {
        this.setAttributeNS(null, "fill", textColor);
    },
    
    setTabWidth: function(width, asSpaces) {
	this.tabWidth = width;
	this.tabsAsSpaces = asSpaces;
    },
    
    // compose the lines if necessary and then render them
    renderText: function(topLeft, compositionWidth) {
        if (this.lines == null) 
            this.lines = this.composeLines(topLeft, compositionWidth, this.fontInfo);
        for (var i = 0; i < this.lines.length; i++)
	    this.lines[i].render(this);
    },
    
    // compose all of the lines in the text
    composeLines: function(initialTopLeft, compositionWidth, font) {
        var lines = [];
        var startIndex = 0;
        var stopIndex = this.textString.length - 1;
        var topLeft = initialTopLeft.clone();
	var chunkSkeleton;

        while (startIndex <= stopIndex) {
            var line = new TextLine(this.textString, startIndex, topLeft, font, chunkSkeleton);
	    line.setTabWidth(this.tabWidth, this.tabsAsSpaces);
            line.compose(compositionWidth);
            line.adjustAfterComposition();
            lines.push(line);
	    startIndex = line.getNextStartIndex();
            topLeft = topLeft.addXY(0, this.lineHeight);
	    // this is an optimization that keeps us from having to re-scan the string on each line
	    chunkSkeleton = line.cloneChunkSkeleton(startIndex);
        }
        return lines;
    },
    
    // return the bounding rectangle for the i-th character in textString
    getBounds: function(stringIndex) {
        var line = this.lineForIndex(stringIndex);
        return line == null ? null : line.getBounds(stringIndex); 
    },

    // return the index of the character whose bounds include pt(x,y), else -1
    hit: function(x, y) {
        var line = this.lineForY(y);
        return line == null ? -1 : line.indexForX(x); 
    },

    // find what line contains the index 'stringIndex'
    lineForIndex: function(stringIndex) {
        for (var i = 0; i < this.lines.length; i++) {
            var line = this.lines[i];
	    if (line.containsThisIndex(stringIndex)) {
	      return line;
	    }
        }
        return null; 
    },
    
    // find what line contains the y value in character metric space
    lineForY: function(y) {
        if (this.lines.length < 1 || y < this.lines[0].getTopY()) 
            return null;
    
        for (var i = 0; i < this.lines.length; i++) {
            line = this.lines[i];
            if (y < this.lines[i].getTopY() + this.lineHeight) {
                // console.log('hit line ' + i + ' for y ' + y + ' slice ' + line.startIndex + "," + line.stopIndex);
                return line; 
            }
        }
	
        return null; 
    },
    
    destroy: function() {
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
        morph.setWrapStyle(WrapStyle.SHRINK);
        // morph.isAccepting = false;
        morph.ignoreEvents();
        morph.layoutChanged();
        morph.okToBeGrabbedBy = function(evt) { this.isDesignMode() ? this : null; }
        return morph;
    },

    makeInputLine: function(rect, initialText) {
        var morph = TextMorph(rect, initialText ? initialText : "");
        morph.setWrapStyle(WrapStyle.NONE);
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
    },

    
});

var WrapStyle = { 
    NORMAL: "wrap", // fits text to bounds width using word wrap and sets height
    NONE: "noWrap", // simply sets height based on line breaks only
    SHRINK: "shrinkWrap" // sets both width and height based on line breaks only
};

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


    wrap: WrapStyle.NORMAL,

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
    },

    initializePersistentState: function(initialBounds, shapeType) {
        // this.textBox = null;
        TextMorph.superClass.initializePersistentState.call(this, initialBounds, shapeType);
        // this.selectionElement = this.addChildElement(NodeFactory.create('use').withHref("#TextSelectionStyle"));

        // the selection element is persistent although its contents are not
        // generic <g> element with 1-3 rectangles inside
        this.selectionElement = this.addChildElement(DisplayObjectList('Selection'));
        this.selectionElement.setAttributeNS(null, "fill", this.selectionColor);
        //this.selectionElement.setAttributeNS(null, "fill", "url(#SelectionGradient)");
        this.selectionElement.setAttributeNS(null, "stroke-width", 0);
        this.font = FontInfo.forFamily(this.fontFamily, this.fontSize);
	this.setAttributeNS(Namespace.LIVELY, "wrap", this.wrap);
    },

    restoreFromMarkup: function(importer) {
        TextMorph.superClass.restoreFromMarkup.call(this, importer);
	this.wrap = this.getAttributeNS(Namespace.LIVELY, "wrap");
	var inset = this.getAttributeNS(Namespace.LIVELY, "inset");
	if (inset) {
	    this.inset = Point.parse(inset);
	}
    },

    
    restoreFromElement: function(element, importer) /*:Boolean*/ {
        if (TextMorph.superClass.restoreFromElement.call(this, element, importer)) return true;

        var type = DisplayObject.prototype.getType.call(element);
    
        switch (type) {
        case 'TextBox':
            this.textBox = TextBox.become(element); // FIXME
            console.log('found textbox %s %s', this.textBox, this.textBox && this.textBox.textString);
            this.textString = this.textBox.textString;
	    this.font = this.textBox.fontInfo;
            return true;
        case 'Selection':
            // that's ok, it's actually transient 
            // remove all chidren b/c they're really transient
            this.selectionElement = DisplayObjectList.become(element, type);
            //console.log('processing selection %s', element);
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

    setWrapStyle: function(style) {
	if (style === TextMorph.prototype.wrap) {
	    delete this.wrap;
	} else {
	    this.wrap = style;
	    this.setAttributeNS(Namespace.LIVELY, "wrap", style);
	}
    },

    setInset: function(ext) {
	if (ext.eqPt(TextMorph.prototype.inset)) {
	    delete this.inset;
	} else {
	    this.inset = ext;
	    this.setAttributeNS(Namespace.LIVELY, "inset", ext.inspect());
	}
    },


    // Since command keys do not always work,
    // make it possible to evaluate the contents
    // of the TextMorph via popup menu
    morphMenu: function(evt) { 
	var self = this;
        var menu = TextMorph.superClass.morphMenu.call(this, evt);
        menu.addItem(["evaluate text", function() { self.evaluateText() }]);
	menu.addItem(["evaluate as Lively markup", function() { 
            var importer = new Importer();
	    var txt = self.xml || self.textString;
	    console.log('evaluating markup ' + txt);
            var morph = importer.importFrom(txt);
            WorldMorph.current().addMorph(morph);
            /*
            if (self.getModel()) {
                copy.model = importer.importModelFrom(modelxml);
                console.log('restoring from model %s', modelxml);
                console.log('copy %s has model %s', copy, copy.model);
            }
            */
	}]);
	menu.addItem(["save as ...", function() { 
	    var store = WorldMorph.current().defaultStore;
	    if (store) store.saveAs(window.prompt('save as ...'), (self.xml || self.textString)); 
	    else console.log('no store to save to');
	}]);

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
            var textBox = this.textBox = TextBox(this.textString, this.lineHeight(), this.textColor, this.font);
            var topLeft = this.textTopLeft();
            textBox.renderText(topLeft, this.compositionWidth());
            this.addChildElement(this.textBox);
        }
        
        return this.textBox; 
    },
    
    ensureTextString: function() { 
        // may be overrridden
        return this.textString; 
    }, 
    
    compositionWidth: function() {
        if (this.wrap === WrapStyle.NORMAL) return this.shape.bounds().width - (2*this.inset.x);
        else return 9999; // Huh??
    },

    // DI: Should rename fitWidth to be composeLineWrap and fitHeight to be composeWordWrap
    fitText: function() { 
        if (this.wrap === WrapStyle.NORMAL) this.fitHeight();
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

        this.adjustForNewBounds();

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
            if(jRect.width < 100) { // line break character gets extended to comp width
		maxX = Math.max(maxX,jRect.maxX());
            	maxY = Math.max(maxY,jRect.maxY()); 
	    }
        }
        
        // if (this.innerBounds().width==(maxX-x0) && this.innerBounds().height==(maxY-y0)) return; // No change in width *** check convergence
        var bottomRight = this.inset.addXY(maxX,maxY);

        // DI: This should just say, eg, this.shape.setBottomRight(bottomRight);
        if (this.wrap === WrapStyle.NONE)
	        with (this.shape) { setBounds(bounds().withHeight(bottomRight.y - bounds().y))};

        if (this.wrap === WrapStyle.SHRINK)
        	with (this.shape) { setBounds(bounds().withBottomRight(bottomRight))};
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
        if (this.selectionRange[0] > this.textString.length-1) { // null sel at end
		var jRect = this.ensureTextBox().getBounds(this.selectionRange[0]-1);
		jRect = jRect.translatedBy(pt(jRect.width,0));
	} else {
		var jRect = this.ensureTextBox().getBounds(this.selectionRange[0]);
	}
        if (jRect == null) {
            console.log("text box failure in drawSelection index = " + this.selectionRange[0]); 
            return;
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
            this.selectionElement.push(RectShape(r1.union(r2)).roundEdgesBy(4));
        } else { // Selection is on two or more lines
            var localBounds = this.shape.bounds();
            r1 = r1.withBottomRight(pt(localBounds.maxX() - this.inset.x, r1.maxY()));
            r2 = r2.withBottomLeft(pt(localBounds.x + this.inset.x, r2.maxY()));
            this.selectionElement.push(RectShape(r1).roundEdgesBy(4));
            this.selectionElement.push(RectShape(r2).roundEdgesBy(4));
        
            if (this.lineNo(r2) != this.lineNo(r1) + 1) {
                // Selection spans 3 or more lines; fill the block between top and bottom lines
                this.selectionElement.push(RectShape(Rectangle.fromAny(r1.bottomRight(), r2.topLeft())).roundEdgesBy(4)); 
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
    
    charOfPoint: function(localP) {  //Sanitized hit function
	// DI: Nearly perfect now except past last char if not EOL
	// Note that hit(x,y) expects x,y to be in morph coordinates,
	// but y should have 2 subtracted from it.
	// Also getBnds(i) reports rectangles that need 2 added to their y values.
	// GetBounds(i) returns -1 above and below the text bounds, and
	// 0 right of the bounds, and leftmost character left of the bounds.
        var tl = this.textTopLeft();
        var px = Math.max(localP.x, tl.x); // ensure no returns of 0 left of bounds
        var px = Math.min(px, this.innerBounds().maxX()-1); // nor right of bounds
        var py = localP.y - 2;
        var hit = this.textBox.hit(px, py);
        var charIx = this.textBox.hit(px, py);
	var len = this.textString.length;
    
        // hit(x,y) returns -1 above and below box -- return 1st char or past last
        if (charIx < 0) return py < tl.y ? 0 : len;
  
        if (charIx == 0 && this.textBox.getBounds(len-1).topRight().lessPt(localP))
	    return len;

	// It's a normal character hit
	// People tend to click on gaps rather than character centers...
	var cRect = this.textBox.getBounds(charIx);
	if (cRect != null && px > cRect.center().x)
	    return Math.min(charIx + 1, len);
	return charIx;
    }
    
}); 
 
// TextMorph mouse event functions 
Object.extend(TextMorph.prototype, {

    handlesMouseDown: function(evt) {
        // Do selecting if click is in selectable area
        if (evt.altKey) return false;
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
        
	// It is a null selection, repeated in the same place -- select word or range
        if (this.selectionRange[0] == 0 || this.selectionRange[0] == this.textString.length) {
            this.setSelectionRange(0, this.textString.length); 
	} else {
	    this.selectionRange = TextMorph.selectWord(this.textString, this.selectionRange[0]);
	}
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
	var before = this.textString.substring(0, this.selectionRange[0]); 
        switch (evt.sanitizedKeyCode()) {
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

	if (evt.keyCode == Event.KEY_BACKSPACE) { // Replace the selection after checking for type-ahead
	    var before = this.textString.substring(0, this.selectionRange[this.hasNullSelection() ? 1 : 0]); 
            var after = this.textString.substring(this.selectionRange[1] + 1, this.textString.length);

            this.setTextString(before.concat(after));
            this.setNullSelectionAt(before.length); 
            evt.stop(); // do not use for browser navigation
            return;
        } else if (!evt.altKey) {
	    if (evt.charCode && evt.charCode < 63200) { // account for Safari's keypress codes 
		var replacement = String.fromCharCode(evt.charCode);
		this.replaceSelectionWith(replacement); 
		evt.stop(); // done
	    }
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
            TextMorph.clipboardString = this.selectionString(); 
            this.replaceSelectionWith("");
            return; 
        }
        
        case "c": {
            TextMorph.clipboardString = this.selectionString(); 
            return; 
        }
        
        case "v": {
            if (TextMorph.clipboardString)
                this.replaceSelectionWith(TextMorph.clipboardString); 
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
            this.setSelectionRange(0, this.textString.length); 
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
        return this.getModelValue('doitContext', this).evalInThis(str);
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
        this.font = FontInfo.forFamily(this.getFontFamily(), newSize);
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
            if (aspect == p.getText  || aspect == 'all') this.updateTextString(this.getModelText());

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
                i1 = TextMorph.matchBrackets(str, CharSet.rightBrackets[i], CharSet.leftBrackets[i],i1,-1);
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
            if (aspect == p.getValue || aspect == 'all') this.updateTextString(this.getModelText());
        }
    },
    
    getModelText: function() {
        return Object.inspect(this.getModelValue('getValue', null)).withNiceDecimals();  
    },
    
    setModelText: function(newText) {
        this.setModelValue('setValue', eval(newText));
    }

});




TestTextMorph = HostClass.create('TestTextMorph', TextMorph);

Object.extend(TestTextMorph.prototype, {
    
//	All this does is create a rectangle at mouseDown, and then
//	while the mouse moves, it prints the index of the nearest character,
//	and adjusts the rectangle to display the bounds for that index.

    onMouseDown: function(evt) {
        this.isSelecting = true;
	this.boundsMorph = Morph(pt(0,0).asRectangle(), "rect");
	this.boundsMorph.setFill(null);
	this.boundsMorph.setBorderColor(Color.red);
	this.addMorph(this.boundsMorph);
        evt.hand.setMouseFocus(this);
        this.requestKeyboardFocus(evt.hand);
        this.track(evt);
	return true; 
    },

    track: function(evt) {
        var localP = this.localize(evt.mousePoint);
	var tl = this.textTopLeft();
        var px = Math.max(localP.x, tl.x); // ensure no returns of 0 left of bounds
        var px = Math.min(px, this.innerBounds().maxX());
        var py = localP.y - 2;
        var hit = this.textBox.hit(px, py);
        var charIx = this.charOfPoint(localP);
	console.log('localP = ' + localP.inspect() + ' hit = ' + hit + ' charOfPoint = ' + charIx);  // display the index for the mouse point
        var jRect = this.ensureTextBox().getBounds(hit);
        if (jRect == null) {
            console.log("text box failure in drawSelection"); 
            return; }
	console.log('rect = ' + jRect. inspect());
	this.boundsMorph.setBounds(jRect);  // show the bounds for that character
    },

    onMouseMove: function(evt) {  
        if (!this.isSelecting) { 
            return TextMorph.superClass.onMouseMove.call(this, evt);
        }
        this.track(evt);
    },
    
    onMouseUp: function(evt) {
        evt.hand.setMouseFocus(null);
        this.isSelecting = false;
	this.boundsMorph.remove();
    }

});

console.log('loaded Text.js');
