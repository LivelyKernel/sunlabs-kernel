/*
 * Copyright © 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

/**
 * Text.js.  Text-related functionality.
 */

(function(scope) {

/**
 * @class Font
 */ 
Object.subclass(Global, 'Font', {

    initialize: function(family/*:String*/, size/*:Integer*/){
        this.family = family;
        this.size = size;
        this.extents = null;
        // this.extents = this.computeExtents(family, size);
    },

    // svgtext-compat overrides the following function
    computeExtents: function(family, size) {
        return [];
    },

    getSize: function() {
        return this.size;
    },
    
    getFamily: function() {
        return this.family;
    },

    toString: function() {
        return this.family + " " + this.getSize();
    },

    getCharInfo: function(charString) {
        var code = charString.charCodeAt(0);
        if (!this.extents) this.extents = this.computeExtents(this.family, this.size);
        return this.extents[code];
    },

    getCharWidth: function(charString) {
        var code = charString.charCodeAt(0);
        if (!this.extents) this.extents = this.computeExtents(this.family, this.size);
        return this.extents[code] ? this.extents[code].width : -1;
    },

    getCharHeight: function(charString) {
        var code = charString.charCodeAt(0)
        if (!this.extents) this.extents = this.computeExtents(this.family, this.size);
        return this.extents[code] ? this.extents[code].height : -1;
    },

    applyTo: function(rawNode) {
        rawNode.setAttributeNS(null, "font-size", this.getSize());
        rawNode.setAttributeNS(null, "font-family", this.getFamily());
    }

});

(function() {
    var cache = {};

    Object.extend(Font, {

        forFamily: function(familyName, size) {
            var key  = familyName + ":" + size;
            var entry = cache[key];
            if (!entry) {
                try {
                    entry = new Font(familyName, size);
                } catch(er) {
                    console.log("%s when looking for %s:%s", er, familyName, size);
                    return null;
                }
                cache[key] = entry;
            }
            return entry;
        }

    });
    
})();

/**
 * @class TextWord
 * This 'class' renders single words
 */ 
Object.subclass(Global, 'TextWord', {

    deserialize: function(importer, rawNode) {
        this.rawNode = rawNode;
        this.fontInfo = Font.forFamily(this.getFontFamily(), this.getFontSize());
        this.textString = this.rawNode.textContent;
        this.didLineBreak = false;
    },
    
    initialize: function(textString, startIndex, topLeft, font) {
        this.rawNode = NodeFactory.create("tspan");
        this.textString = textString;
        this.startIndex = startIndex;
        this.stopIndex = textString.length - 1;
        this.topLeft = topLeft;
        this.rawNode.appendChild(NodeFactory.createText(textString.substring(this.startIndex)));
        this.fontInfo = font;
        this.setX(topLeft.x);
        this.setY(topLeft.y + font.getSize());
        this.didLineBreak = false;
        return this;
    },

    naiveGetX: function() {
        // not this won't work if the attribute is not explicitly set etc
        return Converter.parseCoordinate(this.rawNode.getAttribute("x"));
    },
    
    naiveGetY: function() {
        // not this won't work if the attribute is not explicitly set etc
        return Converter.parseCoordinate(this.rawNode.getAttribute("y"));
    },

    setX: function(newValue /*:float*/) {
        var oldValue = this.naiveGetX();
        if (oldValue != newValue) { // FIXME: maybe just recalc the offset
            this.extentTable = null;
        }
        this.rawNode.setAttributeNS(null, "x", newValue.toString());
    },
    
    setY: function(newValue /*:float*/) {
        var oldValue = this.naiveGetY();
        if (oldValue != newValue) { // FIXME: maybe just recalc the offset
            this.extentTable = null;
        }
        this.rawNode.setAttributeNS(null, "y", newValue.toString());
    },

    getFontFamily: function() {
        for (var node = this.rawNode; node && (/text|tspan/).test(node.tagName); node = node.parentNode) {
            var result = node.getAttribute("font-family");
            if (result) return result;
        }
        return null; // ???
    },

    getFontSize: function() {
        for (var node = this.rawNode; node && (/text|tspan/).test(node.tagName); node = node.parentNode) {
            var result = node.getAttribute("font-size");
            if (result) return Converter.parseLength(result);
        }
        return 0; // Should we return a default size?
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
    // overriden by svgtext-compat
    getBounds: function(stringIndex) { 
        var result = this.rawNode.getExtentOfChar(stringIndex);
        console.log("inspecting " + stringIndex + " in " + this.rawNode.textContent 
            + " parent " + this.rawNode.parentNode + " result " + result);
        return result;
    },

    // keep a copy of the substring we were working on (do we really need this? - kam)
    adjustAfterComposition: function() {
        while (this.rawNode.firstChild) {
            this.rawNode.removeChild(this.rawNode.firstChild);
        }
        this.rawNode.appendChild(NodeFactory.createText(this.textString.substring(this.startIndex, 
                                                        this.stopIndex + 1))); // XXX
    },

    // string representation
    toString: function() {
        return "textString: (" + this.textString + ")" +
            " substr: (" + this.textString.substring(this.startIndex, this.stopIndex) + ")" +
            " startIndex: " + this.startIndex +
            " stopIndex: " + this.stopIndex +
            " topLeft: " + this.topLeft +
            " textContent: " + this.rawNode.textContent +
            " didLineBreak: " + this.didLineBreak;
    },

    // log debugging information to the console
    log: function(label) {
        var lString = this.toString();
        if (label != null) {
            lString = label + ": " + lString;
        }
        console.log(lString);
    }
    
});

/**
 * @class WordChunk
 * This 'class' represents a chunk of text which might be printable or might be whitespace
 */ 
Object.subclass('WordChunk', {

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
        var c = new WordChunk(this.start, this.length);
        c.isWhite = this.isWhite;
        c.isNewLine = this.isNewLine;
        c.isTab = this.isTab;
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
        if (this.bounds == null) {
            lString += " null bounds";
        } else {
            lString += " @(" + this.bounds.x + "," + this.bounds.y + ")(" +
                       this.bounds.width + "x" + this.bounds.height + ")";
        }
        return lString;
    },

    // log debugging information to the console
    log: function(label) {
        var lString = this.toString();
        if (lString != null) {
            lString = label + ": " + lString;
        }
        console.log(lString);
    },

    // create a chunk representing whitespace (typically space characters)
    asWhite: function() {
        this.isWhite = true;
        return this;
    },

    // create a chunk representing a newline   
    asNewLine: function() {
        this.isWhite = true;
        this.isNewLine = true;
        this.length = 1;
        return this;
    },

    // create a chunk representing a tab
    asTab: function() {
        this.isWhite = true;
        this.isTab = true;
        this.length = 1;
        return this;
    }
    
});


/**
 * @class TextLine
 * This 'class' renders lines composed of words and whitespace
 */ 

Object.subclass('TextLine', {

    // create a new line
    initialize: function(textString, startIndex, topLeft, font, chunkSkeleton) {
        this.textString = textString;
        this.font = font;
        this.startIndex = startIndex;
        this.overallStopIndex = textString.length - 1;
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
            if (this.isWhiteSpace(wString[i])) {
                return i - offset;
            }
        }
        return i - offset;
    },

    // we found a space so figure out where the chunk extends to (private)
    chunkFromSpace: function(wString, offset) {
        for (var i = offset; i < wString.length; i++) {
            if (wString[i] != ' ') {
                return i - offset;
            }
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
                if (this.isNewLine(wString[offset])) {
                    pieces.push(new WordChunk(offset).asNewLine());
                } else if (wString[offset] == '\t') {
                    pieces.push(new WordChunk(offset).asTab());
                } else {
                    chunkSize = this.chunkFromSpace(wString, offset);
                    pieces.push(new WordChunk(offset, chunkSize).asWhite());
                }
           } else {
               chunkSize = this.chunkFromWord(wString, offset);
               pieces.push(new WordChunk(offset, chunkSize));
           }
           offset += chunkSize;
        }
        return pieces;
    },

    // compose a line of text, breaking it appropriately at compositionWidth
    compose: function(compositionWidth) {
        var runningStartIndex = this.startIndex;
        var mostRecentBounds = this.topLeft.asRectangle();
        var lastWord = null;
        var leadingSpaces = 0;

        // a way to optimize out repeated scanning
        if (this.chunks == null) {
            this.chunks = this.chunkFromString(this.textString, this.startIndex);
        }
    
        for (var i = 0; i < this.chunks.length; i++) {
            var c = this.chunks[i];
        
            if (c.isWhite) {
                var spaceIncrement = this.spaceWidth;
                c.bounds = mostRecentBounds.withX(mostRecentBounds.maxX());
                if (c.isNewLine) {
                    c.bounds.width = (this.topLeft.x + compositionWidth) - c.bounds.x;
                    runningStartIndex = c.start + c.length;
                    c.wasComposed = true;
                    if (lastWord) lastWord.rawNode.setAttributeNS(Namespace.LIVELY, "nl", "true"); // little helper for serialization
                    break;
                }
                if (c.isTab) {
                    var tabXBoundary = c.bounds.x - this.topLeft.x;
                    c.bounds.width = Math.floor((tabXBoundary + this.tabWidth) / this.tabWidth) * this.tabWidth - tabXBoundary;
                } else {
                    c.bounds.width = spaceIncrement * c.length;
                    if (lastWord) lastWord.rawNode.setAttributeNS(Namespace.LIVELY, "trail", c.length); // little helper for serialization
                    else leadingSpaces = c.length;
                }
                runningStartIndex = c.start + c.length;
            } else {
                lastWord = new TextWord(this.textString, c.start, pt(mostRecentBounds.maxX(), this.topLeft.y), this.font);
                c.word = lastWord;

                if (leadingSpaces) { 
                    lastWord.rawNode.setAttributeNS(Namespace.LIVELY, "lead", leadingSpaces);
                    leadingSpaces = 0;
                }
                lastWord.compose(compositionWidth - (mostRecentBounds.maxX() - this.topLeft.x), c.length - 1);
                c.bounds = lastWord.getBounds(c.start).union(lastWord.getBounds(c.start + c.length - 1));
                if (lastWord.getLineBrokeOnCompose()) {
                    if (i == 0) {
                        // XXX in the future, another chunk needs to be inserted in the array at this point
                        //     otherwise the bounds will be messed up - kam
                        runningStartIndex = lastWord.getStopIndex() + 1;
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
                    } else {
                        return c.bounds;
                    }
                }
            }
        }
        return null;
    },

    // find the pointer into 'textString' for a given X coordinate in character metric space
    indexForX: function(rightX) {
        for (var i = 0; i < this.chunks.length; i++) {
            var c = this.chunks[i];
        
            if (!c.wasComposed) continue;
        
            if (rightX >= c.bounds.x && rightX <= c.bounds.maxX()) {
                if (c.word == null) {
                    var virtualSpaceSize = c.bounds.width / c.length;
                    var spacesIn = Math.floor((rightX - c.bounds.x) / virtualSpaceSize);
                    return c.start + spacesIn;
                } else {
                    for (var i = c.start; i < (c.start + c.length); i++) {
                        var b = c.word.getBounds(i);
                        if (rightX >= b.x && rightX <= b.maxX()) break;
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
        return this.startIndex <= index && index <= this.getStopIndex();
    },

    // forward this on to all of the words (do we need this? - kam)
    adjustAfterComposition: function() {
        for (var i = 0; i < this.chunks.length; i++) {
            if (this.chunks[i].word != null) {
                this.chunks[i].word.adjustAfterComposition();
            }
        }
    },

    // render each word contained in the line
    render: function(rawTextNode) {
        for (var i = 0; i < this.chunks.length; i++) {
            if (this.chunks[i].word != null && this.chunks[i].render) {
                rawTextNode.appendChild(this.chunks[i].word.rawNode);
            }
        }
    },

    cloneChunkSkeleton: function(sIndex) {  // Say it 3 times fast (better than "BitBlt" ;-)
	// Copy only the relevant chunks to this.chunks
	// Return the remaining chunks which may include an extra in case of split lines
	// DI: Note I rewrote this (much faster) without really knowing the details
        if (this.chunks == null) return null;
    
        var extra = null;
        var localChunkCount = 0;
	for (var i = 0; i < this.chunks.length; i++) {  // Step through this line, break at end
            var tc = this.chunks[i];
            if (tc.start < sIndex) {
		localChunkCount++;
		if ((tc.start + tc.length) > sIndex) {
	                // this chunk has been broken up by a word wrap
	                extra = tc.cloneSkeleton();
	                extra.length -= sIndex - extra.start;
	                extra.start = sIndex;
		}
            }
            else if (tc.start == sIndex) extra = tc.cloneSkeleton();
            else break;
        }
	var remainingChunks = this.chunks;
        this.chunks = this.chunks.slice(0, localChunkCount);  // Make copy of chunks local to this line
	if (!extra) remainingChunks.splice(0, localChunkCount+1); // Drop local chunks from big list
	else remainingChunks.splice(0, localChunkCount+1, extra); // ... adding clone or split at line-end
	return remainingChunks;
    },

    // accessor function
    setTabWidth: function(w, asSpaces) {
        this.tabWidth = asSpaces ? w * this.spaceWidth : w;
    },

    // log debugging information to the console
    logChunks: function(label) {
        if (this.chunks) {
            for (var i = 0; i < this.chunks.length; i++) {
                this.chunks[i].log(label + ": TextLine");
            }
        } else {
            console.log(label + ": " + "no chunks");
        }
    },

    // string representation
    toString: function() {
        var lString = "textString: (" + this.textString + ")" +
            " startIndex: " + this.startIndex +
            " overallStopIndex: " + this.overallStopIndex +
            " topLeft: " + Object.inspect(this.topLeft) +
            " spaceWidth: " + this.spaceWidth + 
            " hasComposed: " + this.hasComposed;
        return lString;
    },

    // log debugging information to the console
    log: function(label, printChunks) {
        var lString = this.toString();
        if (label != null) {
            lString = label + ": " + lString;
        }
        console.log(lString);
        if (printChunks != null & printChunks) {
            this.logChunks(label);
        }
    }
    
});

// in the future, support multiple locales
var Locale = {

    charSet: CharSet,
    //KP: note that this depends heavily on the language, esp if it's a programming language
    selectWord: function(str, i1) { // Selection caret before char i1
        var i2 = i1 - 1;
        
        if (i1 > 0) { // look left for o backets
            var i = this.charSet.leftBrackets.indexOf(str[i1-1]);

            if (str[i1 - 1] == "*" && (i1-2 < 0 || str[i1-2] != "/")) 
                i = -1; // spl check for /*

            if (i >= 0) {
                var i2 = this.matchBrackets(str, this.charSet.leftBrackets[i], this.charSet.rightBrackets[i], i1 - 1, 1);
                return [i1, i2 - 1]; 
            } 
        }
        
        if (i1 < str.length) { // look right for close brackets
            var i = this.charSet.rightBrackets.indexOf(str[i1]);
            
            if (str[i1]== "*" && (i1+1 >= str.length || str[i1+1] != "/")) 
                i = -1; // spl check for */

            if (i >= 0) {
                i1 = this.matchBrackets(str, this.charSet.rightBrackets[i], this.charSet.leftBrackets[i],i1,-1);
                return [i1+1, i2]; 
            } 
        }
        
        while (i1-1 >= 0 && this.charSet.alphaNum.include(str[i1 - 1])) 
            i1 --;
    
        while (i2+1 < str.length && this.charSet.alphaNum.include(str[i2 + 1])) 
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
    
};


Global.WrapStyle = { 
    NORMAL: "wrap", // fits text to bounds width using word wrap and sets height
    NONE: "noWrap", // simply sets height based on line breaks only
    SHRINK: "shrinkWrap" // sets both width and height based on line breaks only
};

/**
 * @class TextMorph
 */ 
TextMorph = Morph.subclass(Global, "TextMorph", {

    // these are prototype variables
    fontSize:   Config.defaultFontSize   || 12,
    fontFamily: Config.defaultFontFamily || 'Helvetica',
    textColor: Color.black,
    backgroundColor: Color.veryLightGray,
    borderWidth: 1,
    borderColor: Color.black,
    selectionColor: Color.primary.green,
    inset: pt(6,4), // remember this shouldn't be modified unless every morph should get the value 
    wrap: WrapStyle.NORMAL,
    maxSafeSize: 8000, 
    tabWidth: 4,
    tabsAsSpaces: true,
    noShallowCopyProperties: Morph.prototype.noShallowCopyProperties.concat(['rawTextNode', 'rawSelectionNode', 'lines']),
    locale: Locale,
    acceptInput: true, // whether it accepts changes to text KP: change: interactive changes
    autoAccept: false,
    
    initializeTransientState: function($super, initialBounds) {
        $super(initialBounds);
        this.selectionRange = [0,-1]; // null or a pair of indices into textString
        this.selectionPivot = null;  // index of hit at onmousedown
        this.priorSelection = [0,-1];  // for double-clicks
        this.hasKeyboardFocus = false;
        this.isSelecting = false; // true if last onmousedown was in character area (hit>0)
        // note selection is transient
        this.lines = null;//: TextLine[]
        this.lineNumberHint = 0;
    },

    initializePersistentState: function($super, initialBounds, shapeType) {
        $super(initialBounds, shapeType);

        this.rawTextNode = this.addNonMorph(NodeFactory.create("text", { "kerning": 0 }));
        
	// the selection element is persistent although its contents are not
        // generic <g> element with 1-3 rectangles inside
        this.rawSelectionNode = this.addNonMorph(NodeList.withType('Selection'));
        this.rawSelectionNode.setAttributeNS(null, "fill", this.selectionColor);
        this.rawSelectionNode.setAttributeNS(null, "stroke-width", 0);
	
        this.resetRendering();

        this.rawNode.setAttributeNS(Namespace.LIVELY, "wrap", this.wrap);
        // KP: set attributes on the text elt, not on the morph, so that we can retrieve it
	this.applyStyle({fill: this.backgroundColor, borderWidth: this.borderWidth, borderColor: this.borderColor});
    },
    
    restorePersistentState: function($super, importer) {
        $super(importer);
        this.wrap = this.rawNode.getAttributeNS(Namespace.LIVELY, "wrap");
        var inset = this.rawNode.getAttributeNS(Namespace.LIVELY, "inset");
        if (inset) {
            this.inset = Point.parse(inset);
        }
    },

    restoreFromSubnode: function($super, importer, node) {
	if (node.localName != "text") {
	    return $super(importer, node);
	}
        this.rawTextNode = node;   
	
        var content = [];
        for (var child = node.firstChild; child != null; child = child.nextSibling) {
            if (child.tagName != 'tspan')  
		continue;
            var word = new TextWord(importer, child);
            var lead = parseInt(word.rawNode.getAttributeNS(Namespace.LIVELY, "lead"));
            if (lead) content.push(" ".times(lead));
            content.push(word.rawNode.textContent); 
            var trail = parseInt(word.rawNode.getAttributeNS(Namespace.LIVELY, "trail"));
            if (trail) content.push(" ".times(trail));
	    if (word.rawNode.getAttributeNS(Namespace.LIVELY, "nl") == "true")
                content.push("\n");
        }
        this.textString = content.join("");

        this.fontFamily = node.getAttributeNS(null, "font-family");
        this.fontSize = Converter.parseLength(node.getAttributeNS(null, "font-size"));
        this.font = Font.forFamily(this.fontFamily, this.fontSize);
        this.textColor = Color.parse(node.getAttributeNS(null, "fill"));
	return true;
    },

    restoreContainer: function($super, element, type, importer) /*:Boolean*/ {
        if ($super(element, type, importer)) return true;
        switch (type) {
        case 'Selection':
            // that's ok, it's actually transient 
            // remove all chidren b/c they're really transient
            this.rawSelectionNode = NodeList.become(element, type);
            // console.log('processing selection %s', element);
            this.undrawSelection();
            return true;
        }
        return false;
    },

    initialize: function($super, rect, textString) {
        this.textString = textString || "";
        $super(rect, "rect");
        // KP: note layoutChanged will be called on addition to the tree
        // DI: ... and yet this seems necessary!
        this.layoutChanged();
        return this;
    },

    defaultOrigin: function(bounds) { 
        return bounds.topLeft(); 
    },
    
    bounds: function($super) {
        if (this.fullBounds != null) return this.fullBounds;
        this.resetRendering();
        this.fitText(); // adjust bounds or text for fit
    
        return $super();
    },
    
    changed: function($super) {
        this.bounds(); // will force new bounds if layout changed
        $super();
    },
    
    setTextColor: function(color) {
        this.textColor = color;
    },
    
    getTextColor: function() {
        return this.textColor;
    },

    setWrapStyle: function(style) {
        if (style === TextMorph.prototype.wrap) {
            delete this.wrap;
        } else {
            this.wrap = style;
            this.rawNode.setAttributeNS(Namespace.LIVELY, "wrap", style);
        }
    },

    setInset: function(ext) {
        if (ext.eqPt(TextMorph.prototype.inset)) {
            delete this.inset;
        } else {
            this.inset = ext;
            this.rawNode.setAttributeNS(Namespace.LIVELY, "inset", ext);
        }
    },

    beLabel: function() {
	this.applyStyle({borderWidth: 0, fill: null}).ignoreEvents();
        this.setWrapStyle(WrapStyle.SHRINK);
        // this.isAccepting = false;
        this.layoutChanged();
        this.okToBeGrabbedBy = function(evt) {  return null; }
        return this;
    },

    beInputLine: function() {
        //this.setWrapStyle(WrapStyle.NONE);
        this.onKeyDown = function(evt) {
	    switch (evt.getKeyCode()) {
	    case Event.KEY_DOWN: 
		this.setTextString(this.getModelValue("getNextHistoryEntry", ""));
		this.setNullSelectionAt(this.textString.length);
		evt.stop();
		return true;
	    case Event.KEY_UP: 
		this.setTextString(this.getModelValue("getPreviousHistoryEntry", ""));
		this.setNullSelectionAt(this.textString.length);
		evt.stop();
		return true;
	    case Event.KEY_RETURN:
		this.saveContents(this.textString);
		evt.stop();
		return true;
	    default:
		return TextMorph.prototype.onKeyDown.call(this, evt);
	    }
        };
        this.okToBeGrabbedBy = function(evt) { return null; };
	this.updateView = function(aspect, controller) {
	    TextMorph.prototype.updateView.call(this, aspect, controller);
	    // select the whole thing
	    if (this.modelPlug) {
		if (aspect == this.modelPlug.getText  || aspect == 'all') {
		    this.setSelectionRange(0, this.textString.length); 
		}
	    }
	};
	return this;
    },

    beHelpBalloonFor: function(targetMorph) {
        this.relayMouseEvents(targetMorph, 
            {onMouseDown: "onMouseDown", onMouseMove: "onMouseMove", onMouseUp: "onMouseUp"});
        // some eye candy for the help
	this.linkToStyles(['helpText']);
        this.openForDragAndDrop = false; // so it won't interfere with mouseovers
        return this;
    },

    // Since command keys do not work on all browsers,
    // make it possible to evaluate the contents
    // of the TextMorph via popup menu
    morphMenu: function($super, evt) { 

        var menu = $super(evt);

        // Add a descriptive separator line
        menu.addItem(['----- text functions -----']);

        menu.addItem(["accept changes", function() { this.saveContents(this.textString) }]);
        menu.addItem(["evaluate as JavaScript code", function() { this.boundEval(this.textString) }]);

        menu.addItem(["evaluate as Lively markup", function() { 
            var importer = new Importer();
            var txt = this.xml || this.textString;
            // console.log('evaluating markup ' + txt);
            var morph = importer.importFromString(txt);
            this.world().addMorph(morph);
            importer.startScripts(this.world());
        }]);
	
        menu.addItem(["save as ...", function() { 
            var store = new WebStore();
	    this.world().prompt("save as...", function(filename) {
		filename && store.save(filename, this.xml || this.textString);
	    }.bind(this));
        }]);
    
        return menu;
    },

    // TextMorph composition functions
    textTopLeft: function() { 
        return this.shape.bounds().topLeft().addPt(this.inset); 
    },
    
    innerBounds: function() { 
        return this.shape.bounds().insetByPt(this.inset); 
    },
    
    lineHeight: function() { 
        return this.getFontSize() + 2; // for now
    },

    ensureRendered: function() { // created on demand and cached
        if (this.ensureTextString() == null) return null;
        
        if (!this.rawTextNode.firstChild) {
            this.renderText(this.textTopLeft(), this.compositionWidth());
        }

        return this.rawTextNode; 
    },

    resetRendering: function() {
        while (this.rawTextNode.firstChild) {
            this.rawTextNode.removeChild(this.rawTextNode.firstChild);
        }
        this.rawTextNode.setAttributeNS(null, "fill", this.textColor);
        this.font = Font.forFamily(this.fontFamily, this.fontSize);
        this.font.applyTo(this.rawTextNode);
        this.lines = null;
        this.lineNumberHint = 0;
    },

    ensureTextString: function() { 
        // may be overrridden
        return this.textString; 
    }, 

    // return the bounding rectangle for the index-th character in textString    
    getCharBounds: function(index) {
        this.ensureRendered();
        if (this.lines) {
            var line = this.lineForIndex(index);
            // KP: note copy to avoid inadvertent modifications
            return line == null ? null : line.getBounds(index).copy(); 
        } else return null;
    },

    // compose the lines if necessary and then render them
    renderText: function(topLeft, compositionWidth) {
        if (this.lines == null) { 
            this.lines = this.composeLines(topLeft, compositionWidth, this.font);
        } 
        for (var i = 0; i < this.lines.length; i++) {
            this.lines[i].render(this.rawTextNode);
        }
    },
    
    // compose all of the lines in the text
    composeLines: function(initialTopLeft, compositionWidth, font) {
        var lines = [];
        var startIndex = 0;
        var stopIndex = this.textString.length - 1;
        var topLeft = initialTopLeft.copy();
        var chunkSkeleton = null;

        while (startIndex <= stopIndex) {
            var line = new TextLine(this.textString, startIndex, topLeft, font, chunkSkeleton);
            line.setTabWidth(this.tabWidth, this.tabsAsSpaces);
            line.compose(compositionWidth);
            line.adjustAfterComposition();
            lines.push(line);
            startIndex = line.getNextStartIndex();
            topLeft = topLeft.addXY(0, this.lineHeight());
            // this is an optimization that keeps us from having to re-scan the string on each line
            chunkSkeleton = line.cloneChunkSkeleton(startIndex);
        }
        return lines;
    },

    // find what line contains the index 'stringIndex'
    lineNumberForIndex: function(stringIndex) {
        // Could use a binary search, but instead we check same as last time,
        // then next line after, and finally a linear search.
        console.assert(this.lines != null, "null lines in " + this + "," + (new Error()).stack);
        if (this.lineNumberHint < this.lines.length && 
            this.lines[this.lineNumberHint].containsThisIndex(stringIndex))
            return this.lineNumberHint;  // Same line as last time

        this.lineNumberHint++;  // Try next one down (dominant use pattern)
        if (this.lineNumberHint < this.lines.length &&
            this.lines[this.lineNumberHint].containsThisIndex(stringIndex))
            return this.lineNumberHint;  // Next line after last time

        for (var i = 0; i < this.lines.length; i++) {  // Do it the hard way
            if (this.lines[i].containsThisIndex(stringIndex)) { this.lineNumberHint = i; return i; }
        }
        return -1; 
    },

    lineForIndex: function(stringIndex) {
        return this.lines[this.lineNumberForIndex(stringIndex)];
    },

    // find what line contains the y value in character metric space
    lineForY: function(y) {
        if (!this.lines || this.lines.length < 1 || y < this.lines[0].getTopY()) return null;
    
        for (var i = 0; i < this.lines.length; i++) {
            line = this.lines[i];
            if (y < this.lines[i].getTopY() + this.lineHeight()) {
                // console.log('hit line ' + i + ' for y ' + y + ' slice ' + line.startIndex + "," + line.stopIndex);
                return line; 
            }
        }
        return null; 
    },
    
    hit: function(x, y) {
        var line = this.lineForY(y);
        return line == null ? -1 : line.indexForX(x); 
    },

    setTabWidth: function(width, asSpaces) {
        this.tabWidth = width;
        this.tabsAsSpaces = asSpaces;
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
	if (this.textString.length <= 0) 
	    return;
        var jRect = this.getCharBounds(this.textString.length - 1);
    
        if (jRect == null) { 
            console.log("char bounds is null"); 
            return; 
        }
        
        // console.log('last char is ' + jRect.inspect() + ' for string ' + this.textString);
        var maxY = Math.max(this.lineHeight(), jRect.maxY());
    
        if (this.shape.bounds().maxY() == maxY + this.inset.y) 
            return; // No change in height  // *** check that this converges
    
        var bottomY = this.inset.y + maxY;
    
        var oldBounds = this.shape.bounds();
        this.shape.setBounds(oldBounds.withHeight(bottomY - oldBounds.y))

        this.adjustForNewBounds();
    },

    fitWidth: function() {
        // Set morph bounds based on max text width and height
        
        var jRect = this.getCharBounds(0);
        if (jRect == null) { 
            console.log("fitWidth failure on TextMorph.getCharBounds");
            var minH = this.lineHeight();
            var s = this.shape;
            s.setBounds(s.bounds().withHeight(s.minH));
            return; 
        }
    
        var x0 = jRect.x;
        var y0 = jRect.y;
        var maxX = jRect.maxX();  
        var maxY = jRect.maxY();
    
        // DI: really only need to check last char before line breaks...
        // ... and last character
        var s = this.textString;
        var iMax = s.length-1;
        for (var i = 0; i <= iMax; i++) {
            var c = this.textString[Math.min(i+1, iMax)];
            if (i == iMax || c == "\n" || c == "\r") {
                jRect = this.getCharBounds(i);
                if (jRect == null) { console.log("null bounds at char " + i); return false; }
                if (jRect.width < 100) { // line break character gets extended to comp width
                    maxX = Math.max(maxX,jRect.maxX());
                    maxY = Math.max(maxY,jRect.maxY()); 
                }
            }
        }
        
        // if (this.innerBounds().width==(maxX-x0) && this.innerBounds().height==(maxY-y0)) return;
        // No change in width *** check convergence
        var bottomRight = this.inset.addXY(maxX,maxY);

        // DI: This should just say, eg, this.shape.setBottomRight(bottomRight);
        if (this.wrap === WrapStyle.NONE) {
            with (this.shape) { setBounds(bounds().withHeight(bottomRight.y - bounds().y))};
        }

        if (this.wrap === WrapStyle.SHRINK) {
            with (this.shape) { setBounds(bounds().withBottomRight(bottomRight))};
        }
    },

    showsSelectionWithoutFocus: function() { 
        return false;  // Overridden in, eg, Lists
    },
    
    undrawSelection: function() {
        NodeList.clear(this.rawSelectionNode);
    },

    drawSelection: function() { // should really be called buildSelection now
        if (!this.showsSelectionWithoutFocus() && this.takesKeyboardFocus() && !this.hasKeyboardFocus) {
            return;
        }

        this.undrawSelection();

        var jRect;
        if (this.selectionRange[0] > this.textString.length - 1) { // null sel at end
            jRect = this.getCharBounds(this.selectionRange[0]-1);
            if (jRect) {
                jRect = jRect.translatedBy(pt(jRect.width,0));
            }
        } else {
            jRect = this.getCharBounds(this.selectionRange[0]);
        }
        
        if (jRect == null) {
	    if (this.textString.length > 0)
		console.log("text box failure in drawSelection index = " + this.selectionRange[0]); 
            return;
        }
    
        var r1 = this.lineRect(jRect.withWidth(1));
        if (this.hasNullSelection()) {
            var r2 = r1.translatedBy(pt(-1,0)); 
        } else {
            jRect = this.getCharBounds(this.selectionRange[1]);
            if (jRect == null) return;
            
            var r2 = this.lineRect(jRect);
            r2 = r2.translatedBy(pt(r2.width - 1, 0)).withWidth(1); 
        }
    
        if (this.lineNo(r2) == this.lineNo(r1)) {
            this.rawSelectionNode.appendChild(new RectShape(r1.union(r2)).roundEdgesBy(4).rawNode);
        } else { // Selection is on two or more lines
            var localBounds = this.shape.bounds();
            r1 = r1.withBottomRight(pt(localBounds.maxX() - this.inset.x, r1.maxY()));
            r2 = r2.withBottomLeft(pt(localBounds.x + this.inset.x, r2.maxY()));
            this.rawSelectionNode.appendChild(new RectShape(r1).roundEdgesBy(4).rawNode);
            this.rawSelectionNode.appendChild(new RectShape(r2).roundEdgesBy(4).rawNode);
        
            if (this.lineNo(r2) != this.lineNo(r1) + 1) {
                // Selection spans 3 or more lines; fill the block between top and bottom lines
                this.rawSelectionNode.appendChild(
                    new RectShape(Rectangle.fromAny(r1.bottomRight(), r2.topLeft())).roundEdgesBy(4).rawNode); 
            }
        }
    
        // console.log('add selection ' + this.rawSelectionNode.childNodes);
        // this.addNonMorph(this.rawSelectionNode);
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
        var hit = this.hit(px, py);
        var charIx = this.hit(px, py);
        var len = this.textString.length;
    
        // hit(x,y) returns -1 above and below box -- return 1st char or past last
        if (charIx < 0) return py < tl.y ? 0 : len;
  
        if (charIx == 0 && this.getCharBounds(len-1).topRight().lessPt(localP))
        return len;

        // It's a normal character hit
        // People tend to click on gaps rather than character centers...
        var cRect = this.getCharBounds(charIx);
        if (cRect != null && px > cRect.center().x) {
            return Math.min(charIx + 1, len);
        }
        return charIx;
    },
    
    // TextMorph mouse event functions 
    handlesMouseDown: function(evt) {
        // Do selecting if click is in selectable area
        if (evt.isAltDown()) return false;
        return this.shape.bounds().insetByPt(this.inset).containsPoint(this.localize(evt.mousePoint)); 
    },

    onMouseDown: function(evt) {
        this.isSelecting = true;
        var charIx = this.charOfPoint(this.localize(evt.mousePoint));

        this.startSelection(charIx);
        this.requestKeyboardFocus(evt.hand);
        return true; 
    },

    onMouseMove: function($super, evt) {  
        if (!this.isSelecting) { 
            return $super(evt);
        }
        this.extendSelection(evt);
    },
    
    onMouseUp: function(evt) {
        this.isSelecting = false;
    
        // Check for repeated null selection meaning select word
        if (this.selectionRange[1] != this.selectionRange[0] - 1) return;
        if (this.priorSelection[1] != this.priorSelection[0] - 1) return;
        if (this.selectionRange[0] != this.priorSelection[0]) return;
        
        // It is a null selection, repeated in the same place -- select word or range
        if (this.selectionRange[0] == 0 || this.selectionRange[0] == this.textString.length) {
            this.setSelectionRange(0, this.textString.length); 
        } else {
            this.selectionRange = this.locale.selectWord(this.textString, this.selectionRange[0]);
        }
        
        this.setModelSelection(this.selectionString());
        this.drawSelection(); 
    },
    
    // TextMorph text selection functions

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
    },

    // TextMorph keyboard event functions
    takesKeyboardFocus: function() { 
        // unlike, eg, cheapMenus
        return true; 
    },
    
    setHasKeyboardFocus: function(newSetting) { 
        this.hasKeyboardFocus = newSetting;
        return newSetting;
    },
    
    onFocus: function($super, hand) {
        $super(hand);
        this.drawSelection();
    },

    onBlur: function($super, hand) {
        $super(hand);
        if (!this.showsSelectionWithoutFocus()) this.undrawSelection();
    },

    onKeyDown: function(evt) {
        if (!this.acceptInput) return;
        
        var before = this.textString.substring(0, this.selectionRange[0]); 
        
        switch (evt.getKeyCode()) {
        case Event.KEY_LEFT: {
            // forget the existing selection
            var wordRange = this.locale.selectWord(this.textString, this.selectionRange[0]);
            if (evt.isShiftDown() && (wordRange[0] != before.length)) {
                // move by a whole word if we're not at the beginning of it
                this.setNullSelectionAt(Math.max(0, wordRange[0]));
            } else { 
                this.setNullSelectionAt(Math.max(before.length - 1, 0));
            }
            evt.stop();
            return true;
        } 
        case Event.KEY_RIGHT: {
            // forget the existing selection
            var wordRange = this.locale.selectWord(this.textString, this.selectionRange[0]);
            if (evt.isShiftDown() && (wordRange[1] != before.length - 1)) {
                // move by a whole word if we're not at the end of it.
                this.setNullSelectionAt(Math.min(this.textString.length, wordRange[1] + 1));
            } else { 
                this.setNullSelectionAt(Math.min(before.length + 1, this.textString.length));
            }
            evt.stop();
            return true;
        }
        case Event.KEY_UP: {
            var lineNo = this.lineNumberForIndex(before.length);
            var line = this.lines[lineNo];
            if (lineNo > 0) {
                var lineIndex = before.length  - line.startIndex;
                var newLine = this.lines[lineNo - 1];
                this.setNullSelectionAt(Math.min(newLine.startIndex + lineIndex, newLine.getStopIndex()));
            }
            evt.stop();
            return true;
        }
        case Event.KEY_DOWN: {
            var lineNo = this.lineNumberForIndex(before.length);
            var line = this.lines[lineNo];
            if (lineNo < this.lines.length - 1) {
                var lineIndex = before.length  - line.startIndex;
                var newLine = this.lines[lineNo + 1];
                this.setNullSelectionAt(Math.min(newLine.startIndex + lineIndex, newLine.getStopIndex()));
            }
            evt.stop();
            return true;
        }
        case Event.KEY_ESC: {
            this.relinquishKeyboardFocus(this.world().firstHand());
            return true;
        }
        case Event.KEY_UP:
        case Event.KEY_DOWN: {
            // do nothing for now
            // don't scroll the page
            evt.stop();
            return true;
        }
        }

        // have to process commands in keydown...
        if (evt.isAltDown()) {
            var command = evt.getKeyChar().toLowerCase();
            if (this.processCommandKeys(command)) { 
		evt.stop();
		return true;
	    }
        }
	return false;
    },
    
    onKeyPress: function(evt) {
        if (!this.acceptInput) return true;
	
	switch(evt.getKeyCode()) {
	case Event.KEY_DOWN:
	case Event.KEY_LEFT:
	case Event.KEY_RIGHT:
	case Event.KEY_UP:
	    evt.stop();
	    // already handled by onKeyDown
	    return true;
	}
        // cleanup: separate BS logic, diddle selection range and use replaceSelectionWith()
        if (evt.isAltDown() && UserAgent.isWindows) {
            //AltGr pressed
            var replacement = evt.getKeyChar().toLowerCase();
            this.processCommandKeys(replacement);
            evt.stop();
	    return true;
        } else if (evt.getKeyCode() == Event.KEY_BACKSPACE) { // Replace the selection after checking for type-ahead
            var before = this.textString.substring(0, this.selectionRange[this.hasNullSelection() ? 1 : 0]); 
            var after = this.textString.substring(this.selectionRange[1] + 1, this.textString.length);

            this.setTextString(before.concat(after));
            this.setNullSelectionAt(before.length); 
            evt.stop(); // do not use for browser navigation
            return true;
        } else if (!evt.isAltDown()) {
            this.replaceSelectionWith(evt.getKeyChar()); 
            evt.stop(); // done
	    return true;
        }
	return false;
    },
    
    processCommandKeys: function(key) {  //: Boolean (was the command processed?)
        // console.log('command ' + key);

        switch (key) {
        case "s": {
            this.saveContents(this.textString); 
            return true; 
        }
    
        case "x": {
            TextMorph.clipboardString = this.selectionString(); 
            this.replaceSelectionWith("");
            return true; 
        }
        
        case "c": {
            TextMorph.clipboardString = this.selectionString(); 
            return true; 
        }
        
        case "v": {
            if (TextMorph.clipboardString)
                this.replaceSelectionWith(TextMorph.clipboardString); 
            return true; 
        }
    
        case "d": {
	    try {
		this.boundEval(this.selectionString());
	    } catch (e) {
		this.world().alert("exception " + e);
	    }
            return true; 
        }
        
        case "p": {
            var strToEval = this.selectionString();
            this.setNullSelectionAt(this.selectionRange[1] + 1);
            // console.log('selection = ' + strToEval);
	    try {
		var result = this.boundEval(strToEval);
	    } catch (e) {
		this.world().alert("exception " + e);
	    }
            this.replaceSelectionWith(" " + result);
            return true; 
        }
        
        case "a": {
            this.setSelectionRange(0, this.textString.length); 
            return true;
        }
        
        case "j": {
            return true; 
        }

        case "i": {
            this.addSvgInspector();
            return true;
        }

        case "z": {
            if (this.undoTextString) {
                this.setTextString(this.undoTextString);
            }
            return true;
        }
        }

        var bracketIndex = CharSet.leftBrackets.indexOf(key);

        if (bracketIndex >= 0) {
            this.addOrRemoveBrackets(bracketIndex); 
            return true;
        } 
        
        return false;

    }

});

// TextMorph accessor functions
TextMorph.addMethods({

    pvtUpdateTextString: function(replacement) {
        // KP: FIXME: doesn't this potentially change the selection
        /*
        if (replacement.length < 100 && this.textString == replacement)
        // avoid long comparisons
        return;
        */
        // introducing new variable, simple one-level undo
        this.undoTextString = this.textString;
        this.textString = replacement.truncate(this.maxSafeSize);
        this.recordChange('textString');
    
        this.resetRendering();
        this.layoutChanged(); 
        this.changed();
    },

    saveContents: function(contentString) {    
        if (this.modelPlug == null) {
            eval(contentString); 
            this.world().changed(); 
            return; // Hack for browser demo
        } else if (!this.autoAccept) {
            this.setModelText(contentString); 
        }
    },
    
    boundEval: function(str) {    
        // Evaluate the string argument in a context in which "this" may be supplied by the modelPlug
        var ctx = this.getModelValue('doitContext', this);
        return (function() { return eval(str) }.bind(ctx))();
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
    
    setFontFamily: function(familyName) {
        this.fontFamily = familyName;
        this.font = Font.forFamily(this.fontFamily, this.fontSize);
        this.layoutChanged();
        this.changed();
    },
    
    getFontSize: function() { return this.fontSize; },

    setFontSize: function(newSize) {
        this.fontSize = newSize;
        this.font = Font.forFamily(this.fontFamily, newSize);
        this.setInset(pt(newSize/2+2, newSize/3));
        this.layoutChanged();
        this.changed();
    },
    
    setTextString: function(replacement) {
        if (this.autoAccept) this.setModelText(replacement);
        this.pvtUpdateTextString(replacement); 
    },
    
    updateTextString: function(newStr) {
        this.pvtUpdateTextString(newStr);
        this.resetScrollPane(); 
    },
    
    resetScrollPane: function() {
        // Need a cleaner way to do this ;-)
        if (this.owner instanceof ClipMorph && this.owner.owner instanceof ScrollPane) {
           this.owner.owner.scrollToTop();
        }
    },
    
    updateView: function(aspect, controller) {
        var p = this.modelPlug;
        if (p) {
            if (aspect == p.getText  || aspect == 'all') {
		this.updateTextString(this.getModelText());
	    }
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
    
});


/**
 * @class PrintMorph
 * A PrintMorph is just like a TextMorph, except it converts its model value
 * to a string using toString(), and from a string using eval()
 */ 
TextMorph.subclass(Global, 'PrintMorph', {

    updateView: function(aspect, controller) {
        var p = this.modelPlug;
        if (p) {
            if (aspect == p.getValue || aspect == 'all') this.updateTextString(this.getModelText());
        }
    },
    
    getModelText: function() {
        return Object.inspect(this.getModelValue('getValue', null)).withDecimalPrecision(2);  
    },
    
    setModelText: function(newText) {
        this.setModelValue('setValue', eval(newText));
    }

});

// A class for testing TextMorph behavior
Object.subclass('TestTextMorph', {
    
    // All this does is create a rectangle at mouseDown, and then
    // while the mouse moves, it prints the index of the nearest character,
    // and adjusts the rectangle to display the bounds for that index.

    onMouseDown: function(evt) {
        this.isSelecting = true;
        this.boundsMorph = new Morph(pt(0,0).asRectangle(), "rect");
	this.boundsMorph.applyStyle({fill: null, borderColor: Color.red});
        this.addMorph(this.boundsMorph);
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
        var hit = this.hit(px, py);
        var charIx = this.charOfPoint(localP);
        console.log('localP = ' + localP + ' hit = ' + hit + ' charOfPoint = ' + charIx);  // display the index for the mouse point
        var jRect = this.getCharBounds(hit);
        if (jRect == null) {
            console.log("text box failure in drawSelection"); 
            return; 
        }
        console.log('rect = ' + jRect);
        this.boundsMorph.setBounds(jRect);  // show the bounds for that character
    },

    onMouseMove: function($super, evt) {  
        if (!this.isSelecting) { 
            return $super(evt);
        }
        this.track(evt);
    },
    
    onMouseUp: function(evt) {
        this.isSelecting = false;
        this.boundsMorph.remove();
    }

});

}).logCompletion("Text.js")({});

