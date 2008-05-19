/*
 * Copyright � 2006-2008 Sun Microsystems, Inc.
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


Object.subclass('CharacterInfo', {
    // could simply use Point as extent.
    documentation: "simple printable info about a character's extent",

    initialize: function(width, height) {
	this.width = width;
	this.height = height;
    },

    toString: function() {
	return this.width + "x" + this.height;
    }

});


Object.subclass('Font', {

    documentation: "representation of a font",
    baselineFactor: 0.80,
    
    initialize: function(family/*:String*/, size/*:Integer*/, style/*:String*/){
        this.family = family;
        this.size = size;
        this.style = style ? style : 'normal';
        this.extents = null;
        // this.extents = this.computeExtents(family, size);
    },
    computeExtents: function(family, size) {
	// Note: this gets overridden depending on the environment.
        return [];
    },
    getSize: function() {
        return this.size;
    },

    getBaselineHeight: function() { // the distance between the top of the glyph to the baseline.
	return this.size * this.baselineFactor;
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
        return this.extents[code] ? this.extents[code].width : 8;
    },
    getCharHeight: function(charString) {
        var code = charString.charCodeAt(0)
        if (!this.extents) this.extents = this.computeExtents(this.family, this.size);
        return this.extents[code] ? this.extents[code].height : 12;
    },

    applyTo: function(wrapper) {
	var rawNode = wrapper.rawNode;
        rawNode.setAttributeNS(null, "font-size", this.getSize());
        rawNode.setAttributeNS(null, "font-family", this.getFamily());
        if (this.style == 'bold') rawNode.setAttributeNS(null, "font-weight", 'bold');
        if (this.style == 'italic') rawNode.setAttributeNS(null, "font-style", 'italic');
        if (this.style == 'normal') {
	    rawNode.setAttributeNS(null, "font-style", 'normal');
	    rawNode.setAttributeNS(null, "font-weight", 'normal');
	}
        // if (this.getSize() == 18 || this.style == 'bold' || this.style == 'italic') 
	//	console.log("applying " + this.getSize() + this.style);
    }

});
    
(function() {
    var cache = {};
    
    Object.extend(Font, {
	
	forFamily: function(familyName, size, style) {
            var key  = familyName + ":" + size + ":" + (style ? style[0] : 'n' ) ;
            var entry = cache[key];
            if (entry) return entry;
	    try { entry = new Font(familyName, size, style);
                } catch(er) {
                    console.log("%s when looking for %s:%s", er, familyName, size);
                    return null;
                }
	    cache[key] = entry;
            return entry;
        }
    });
    
})();

    
if (Config.fakeFontMetrics) { 
    Font.addMethods({
        // wer're faking here, b/c native calls don't seem to work
        computeExtents: function(family, size) {
            var extents = [];
            for (var i = 33; i < 255; i++) {
                extents[i] = new CharacterInfo(size*2/3, size);
            }
            return extents;
        }
    });
    
} else if (Config.fontMetricsFromHTML)  {
    
Font.addMethods({

    computeExtents: function(family, size) {
        var extents = [];
        var body = null;
        var doc; // walk up the window chain to find the (X)HTML context
        for (var win = window; win; win = win.parent) {
            doc = win.document;
            var bodies = doc.documentElement.getElementsByTagName('body');
            if (bodies && bodies.length > 0) {
                body = bodies[0];
                break;
            }
        }
	
        if (!body) return [];

        function create(name) {
            // return doc.createElement(name);
            return doc.createElementNS(Namespace.XHTML, name);
        }
	
        var d = body.appendChild(create("div"));
	
        d.style.kerning    = 0;
        d.style.fontFamily = family;
        d.style.fontSize   = size + "px";
	
        var xWidth = -1;
        var xCode = 'x'.charCodeAt(0);
        for (var i = 33; i < 255; i++) {
            var sub = d.appendChild(create("span"));
            sub.appendChild(doc.createTextNode(String.fromCharCode(i)));
            extents[i] = new CharacterInfo(sub.offsetWidth,  sub.offsetHeight);
            if (i == xCode) xWidth = extents[i].width;
        }

        if (xWidth < 0) { 
            throw new Error('x Width is ' + xWidth);
        }

        if (d.offsetWidth == 0) {
            console.log("timing problems, expect messed up text for font %s", this);
        }
	
        // handle spaces
        var sub = d.appendChild(create("span"));
        sub.appendChild(doc.createTextNode('x x'));

        var spaceWidth = sub.offsetWidth - xWidth*2;
        console.log("font " + this + ': space width ' + spaceWidth + ' from ' + sub.offsetWidth + ' xWidth ' + xWidth);    

        // tjm: sanity check as Firefox seems to do this wrong with certain values
        if (spaceWidth > 100) {    
            extents[(' '.charCodeAt(0))] = //new CharacterInfo(this.getCharInfo(' ').width - 2, this.getCharInfo(' ').height);
            new CharacterInfo(2*xWidth/3, sub.offsetHeight);
        } else {
            extents[(' '.charCodeAt(0))] = new CharacterInfo(spaceWidth, sub.offsetHeight);
        }

        //d.removeChild(span);
        body.removeChild(d);
        return extents;
    }
});

}    
    
    
Wrapper.subclass('TextWord', {

    documentation: "renders single words",
    
    deserialize: function(importer, rawNode) {
        this.rawNode = rawNode;
        this.fontInfo = Font.forFamily(this.getFontFamily(), this.getFontSize());
        this.textString = this.rawNode.textContent;
        this.didLineBreak = false;
    },
    
    initialize: function(textString, startIndex, leftX, baselineY, font) {
        this.rawNode = NodeFactory.create("tspan");
        this.textString = textString;
        this.startIndex = startIndex;
        this.stopIndex = textString.length - 1;
        this.leftX = leftX;
        this.fontInfo = font;
        this.setX(leftX);
	this.setY(baselineY);
        this.didLineBreak = false;
        return this;
    },
    
    setX: function(newValue /*:float*/) {
        this.rawNode.setAttributeNS(null, "x", newValue.toString());
    },
    
    setY: function(newValue /*:float*/) {
        this.rawNode.setAttributeNS(null, "y", newValue.toString());
    },
    
    getFontFamily: function() {
        for (var node = this.rawNode; node && (/text|tspan/).test(node.tagName); node = node.parentNode) {
            var result = node.getAttributeNS(null, "font-family");
            if (result) return result;
        }
        return null; // ???
    },
    
    getFontSize: function() {
        for (var node = this.rawNode; node && (/text|tspan/).test(node.tagName); node = node.parentNode) {
            var result = node.getAttributeNS(null, "font-size");
            if (result) return Converter.parseLength(result);
        }
        return 0; // Should we return a default size?
    },
    
    // compose a word within compositionWidth, stopping if the width or string width is exceeded
    // compositionWidth is in the same units as character metrics
    compose: function(compositionWidth, length) {
        var leftX = this.leftX;
        var rightX = this.leftX + compositionWidth;
        var leadingSpaces = 0;
	
        this.didLineBreak = false;
        // get the character bounds until it hits the right side of the compositionWidth
        for (var i = this.startIndex; i < this.textString.length && i < (this.startIndex + length); i++) {
            var rightOfChar = leftX + this.getWidthOfChar(i);
	    if (rightOfChar >= rightX) {
		// Hit right bounds -- wrap at word break if possible
		if (i > this.startIndex)  this.setStopIndexAndWidth(i - 1,  leftX - this.leftX);
		else this.setStopIndexAndWidth(this.startIndex, rightOfChar - this.leftX);
                this.didLineBreak = true;
                return;
            }
	    leftX = rightOfChar;
        }
        // Reached the end of text
        this.setStopIndexAndWidth(i - 1, rightOfChar - this.leftX);
    },
    
    // accessor function
    setStopIndexAndWidth: function(i, w) { 
        this.stopIndex = i; 
	this.width = w;
    },
    
    // accessor function
    getStopIndex: function() {
        return this.stopIndex;
    },
    
    // return true if we bumped into the width limit while composing
    getLineBrokeOnCompose: function() {
        return this.didLineBreak;
    },
    
    // keep a copy of the substring we were working on (do we really need this? - kam)
    adjustAfterComposition: function(deltaX) {
	this.replaceRawNodeChildren(NodeFactory.createText(this.textString.substring(this.startIndex, this.stopIndex + 1))); 
	// XXX
	this.setX(this.leftX + deltaX);
    },
    
    toString: function() {
	// string representation
        return "textString: (" + this.textString + ")" +
            " substr: (" + this.textString.substring(this.startIndex, this.stopIndex + 1) + ")" +
            " startIndex: " + this.startIndex +
            " stopIndex: " + this.stopIndex +
            " leftX: " + this.leftX +
            " textContent: " + this.rawNode.textContent +
            " didLineBreak: " + this.didLineBreak;
    },
    
    getWidthOfChar: function(position) {
        var w = this.fontInfo.getCharWidth(this.textString.charAt(position));
        if (isNaN(w)) {
            console.warn('getWidthOfChar: width at position ' + position);
	    return 4;  // dont crash
        }
	return w;
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
        this.startIndex = offset;
        this.length = length;
        this.render = true;
        this.bounds = null;
        this.wasComposed = false;
        this.word = null;
    },
    
    adjustAfterComposition: function(deltaX, paddingX) {
	// Align the text after composition
        if (deltaX != 0) this.bounds = this.bounds.withX(this.bounds.x+deltaX);
	if (paddingX != 0 && this.isSpaces()) this.bounds = this.bounds.withWidth(this.bounds.width+paddingX);
	if (this.word != null) this.word.adjustAfterComposition(deltaX);
    },
    
    indexForX: function(x) {
	if (this.word == null) {
	    var virtualSpaceSize = this.bounds.width / this.length;
	    var spacesIn = Math.floor((x - this.bounds.x) / virtualSpaceSize);
	    return this.startIndex + spacesIn;
	} else {
	    var leftX = this.bounds.x;
	    for (var j = this.startIndex; j < (this.startIndex + this.length); j++) {
		var rightX = leftX + this.word.getWidthOfChar(j);
		if (x >= leftX && x <= rightX) break;
		leftX = rightX
	    }
	    return j;
	}
	return this.startIndex; // failsafe
    },
    
    getBounds: function(stringIndex) {
    	// get the bounds of the character at stringIndex
	// DI: change order of this if, and dont test for getBounds
	if (this.word) {
	    var leftX = this.bounds.x;
	    for (var j = this.startIndex; j <= stringIndex; j++) {
		var rightX = leftX + this.word.getWidthOfChar(j);
		if (j >= stringIndex) break;
		leftX = rightX;
	    }
	    return this.bounds.withX(leftX).withWidth(rightX - leftX);
	} else {
	    if (this.isSpaces()) {
		var virtualSpaceSize = this.bounds.width / this.length;
		var b = this.bounds.withWidth(virtualSpaceSize);
		b.x += virtualSpaceSize * (stringIndex - this.startIndex);
		return b;
	    } else {
		return this.bounds;
	    }
	}
    },
    
    isSpaces: function() {
        return this.isWhite && !this.isTab && !this.isNewLine;
    },
    
    // clone a chunk only copying minimal information
    cloneSkeleton: function() {
        var c = new WordChunk(this.startIndex, this.length);
        c.isWhite = this.isWhite;
        c.isNewLine = this.isNewLine;
        c.isTab = this.isTab;
        return c;
    },
    
    // string representation
    toString: function() {
        var lString = "Chunk start: " + this.startIndex +
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


Object.subclass('TextLine', {
    documentation: 'renders lines composed of words and whitespace',

    lineHeightFactor: 1.2, // multiplied with the font size to set the distance between the lines, 
    // semantics analogous to CSS 
    
    whiteSpaceDict: {' ': true, '\t': true, '\r': true, '\n': true},
    
    // create a new line
    initialize: function(textString, textStyle, startIndex, topLeft, font, defaultStyle, chunkSkeleton) {
        this.textString = textString;
        this.textStyle = textStyle;
        this.startIndex = startIndex;
        this.overallStopIndex = textString.length - 1;
        this.topLeft = topLeft;
        this.currentFont = font;
	this.alignment = 'left';
        this.defaultStyle = defaultStyle;  // currently unused 
	// Should probably call adoptStyle(defaultStyle) here
	//	this.adoptStyle(defaultStyle);
	this.spaceWidth = font.getCharWidth(' ');
        this.tabWidth = this.spaceWidth * 4;
        this.hasComposed = false;
        this.chunks = chunkSkeleton;
    },
    
    lineHeight: function() {
	return this.lineHeightFactor * this.currentFont.getSize();
    },
    
    isWhiteSpace: function(c) {
	// is the character 'c' what we consider to be whitespace? (private) 
	// return this.whiteSpaceDict[c];
	return (c == ' ' || c == '\t' || c == '\r' || c == '\n');
    },
    
    isNewLine: function(c) {
	// is the character 'c' what we consider to be a newline? (private)
	return (c == '\r' || c == '\n');
    },
    
    chunkFromWord: function(wString, offset) {
	// we found a word so figure out where the chunk extends to (private)
        for (var i = offset; i < wString.length; i++) {
            if (this.whiteSpaceDict[wString[i]]) {
                return i - offset;
            }
        }
        return i - offset;
    },
    
    chunkFromSpace: function(wString, offset) {
	// we found a space so figure out where the chunk extends to (private)
        for (var i = offset; i < wString.length; i++) {
            if (wString[i] != ' ') {
                return i - offset;
            }
        }
        return i - offset;
    },
    
    chunkFromString: function(wString, startOffset) {
	// look at wString starting at startOffset and return an array with all of the chunks in it
	// Note: this needs to be passed the runArray of test styles, and to make
	// new chunks at each change in style
        var offset = startOffset;
        var pieces = [];
        var chunkSize;
	
        while (offset < wString.length) {
            chunkSize = 1; // default is one character long
            if (this.whiteSpaceDict[wString[offset]]) {
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
    
    baselineY: function() {
	return this.topLeft.y + this.currentFont.getBaselineHeight();
    },

    interline: function() {
	return (this.lineHeightFactor - 1) * this.currentFont.getSize();
    },

    compose: function(compositionWidth) {

	// get the bounds 
	function getWordBounds(word, topLeftY) { 
	    return new Rectangle(word.leftX, topLeftY, word.width, word.fontInfo.getSize());
	};
	
	// compose a line of text, breaking it appropriately at compositionWidth
	// nSpaceChunks and lastChunkIndex are used for alignment in adjustAfterComposition
	this.nSpaceChunks = 0; 
	this.lastChunkIndex = 0; 
        var lastBounds = this.topLeft.extent(pt(0, this.currentFont.getSize())); 
	var runningStartIndex = this.startIndex;
        var lastWord = null;
        var leadingSpaces = 0;
	var nextStyleChange = (this.textStyle) ? 0 : this.textString.length;
	
        // a way to optimize out repeated scanning
        if (this.chunks == null) {
            this.chunks = this.chunkFromString(this.textString, this.startIndex);
        }

	var hasStyleChanged = false;
        for (var i = 0; i < this.chunks.length; i++) {
            var c = this.chunks[i];
	    this.lastChunkIndex = i;
	    if (c.startIndex >= nextStyleChange) {
		hasStyleChanged = true;
		// For now style changes are only seen at chunk breaks
		if (!c.isNewLine) this.adoptStyle(this.textStyle.valueAt(c.startIndex), c.startIndex); // Dont change style at newlines
		nextStyleChange = c.startIndex + this.textStyle.runLengthAt(c.startIndex);
	    }
            if (c.isWhite) {
                c.bounds = lastBounds.withX(lastBounds.maxX());
                if (c.isNewLine) {
                    c.bounds.width = (this.topLeft.x + compositionWidth) - c.bounds.x;
                    runningStartIndex = c.startIndex + c.length;
                    c.wasComposed = true;
                    if (lastWord) lastWord.setLivelyTrait("nl", "true"); // little helper for serialization
                    break;
                }
                this.nSpaceChunks++ ;
		if (c.isTab) {
                    var tabXBoundary = c.bounds.x - this.topLeft.x;
                    c.bounds.width = Math.floor((tabXBoundary + this.tabWidth) / this.tabWidth) * this.tabWidth - tabXBoundary;
                } else {
                    var spaceIncrement = this.spaceWidth;
                    c.bounds.width = spaceIncrement * c.length;
                    if (lastWord) lastWord.setLivelyTrait("trail", c.length); // little helper for serialization
                    else leadingSpaces = c.length;
                }
                runningStartIndex = c.startIndex + c.length;
            } else {
                lastWord = new TextWord(this.textString, c.startIndex, lastBounds.maxX(), this.baselineY(), this.currentFont);
		if (hasStyleChanged) {
		    // once we notice one change, we will reapply font-size to chunk
		    this.currentFont.applyTo(lastWord);
		}
                c.word = lastWord;
		
                if (leadingSpaces) { 
                    lastWord.setLivelyTrait("lead", leadingSpaces);
                    leadingSpaces = 0;
                }
                lastWord.compose(compositionWidth - (lastBounds.maxX() - this.topLeft.x), c.length);
                c.bounds = getWordBounds(lastWord, this.topLeft.y);
                if (lastWord.getLineBrokeOnCompose()) {
                    if (i == 0) {
                        // XXX in the future, another chunk needs to be inserted in the array at this point
                        //     otherwise the bounds will be messed up - kam
                        runningStartIndex = lastWord.getStopIndex() + 1;
                    } else {
                        // Back up to re-render this word and abort rendering
                        c.render = false;
                    }
                    this.nSpaceChunks-- ;  // This makes last interiror space no longer interior
                    break;
		}
		runningStartIndex = c.startIndex + c.length;
            }
            lastBounds = c.bounds;
	    c.wasComposed = true;
        }
        this.overallStopIndex = runningStartIndex - 1;
        this.hasComposed = true;
    },
    
    adoptStyle: function(emph, charIx) {
	var fontFamily = this.currentFont.getFamily();
	var fontSize = this.currentFont.getSize();
	var fontStyle = 'normal';
	var fontColor = Color.black;
	var align = 'left';
	Properties.forEachOwn(emph, function(p, v) {
	    if (p == "family") fontFamily = v;
	    if (p == "size")  fontSize = v;
	    if (p == "style") fontStyle = v;
	    if (p == "color") fontColor = v;
	    if (p == "align") align = v;
	});
	// console.log("adoptStyle/Font.forFamily" + fontFamily + fontSize + fontStyle + "; index = " + charIx);
	this.currentFont = Font.forFamily(fontFamily, fontSize, fontStyle);
	this.fontColor = fontColor;
	this.alignment = align;
        this.spaceWidth = this.currentFont.getCharWidth(' ');
        this.tabWidth = this.spaceWidth * 4;
    },
    
    getStopIndex: function() {
	// accessor function (maybe delete - kam)
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
        for (var i = 0; i <= this.lastChunkIndex; i++) {
            var c = this.chunks[i];
            if (stringIndex >= c.startIndex && stringIndex < (c.startIndex + c.length)) 
		return c.getBounds(stringIndex);
        }
        return null;
    },
    
    // find the pointer into 'textString' for a given X coordinate in character metric space
    indexForX: function(x) {
        for (var i = 0; i <= this.lastChunkIndex; i++) {
            var c = this.chunks[i];
            if (!c.wasComposed) continue;
	    if (x >= c.bounds.x && x <= c.bounds.maxX()) return c.indexForX(x);
        }
        return 0; // should not get here unless rightX is out of bounds
    },
    
    // return a boolean if this line contains this pointer into 'textString'
    containsThisIndex: function(index) {
        return this.startIndex <= index && index <= this.getStopIndex();
    },

    adjustAfterComposition: function(compositionWidth) {
	// This serves to clean up some cruft tht should not be there anyway
	// But it now also serves to align the text after composition
	var deltaX = 0;
	var paddingX = 0;
	var spaceRemaining = 0;
	if (this.alignment != 'left') {
	    spaceRemaining =  (this.topLeft.x + compositionWidth) - this.chunks[this.lastChunkIndex-1].bounds.maxX();
	    if (this.alignment == 'right') deltaX = spaceRemaining;
	    if (this.alignment == 'center') deltaX = spaceRemaining / 2;
	    if (this.alignment == 'justify' && (this.overallStopIndex !=  this.textString.length-1)
		&& !(this.chunks[this.lastChunkIndex].isNewLine)) {
		//  Distribute remaining space over the various space chunks
		var nSpaces = this.nSpaceChunks;
		paddingX = spaceRemaining / Math.max(1, nSpaces); 
	    }
	}
        for (var i = 0; i <= this.lastChunkIndex; i++) {
	    this.chunks[i].adjustAfterComposition(deltaX, paddingX);
            if (this.chunks[i].isSpaces()) deltaX += paddingX;
        }
    },
    
    render: function(textContent) {
	// render each word contained in the line
        for (var i = 0; i < this.chunks.length; i++) {
            if (this.chunks[i].word && this.chunks[i].render) {
                textContent.rawNode.appendChild(this.chunks[i].word.rawNode);
            }
        }
    },
    
    cloneChunkSkeleton: function(sIndex) {  // Say it 3 times fast 
	// Copy only the relevant chunks to this.chunks
	// Return the remaining chunks which may include an extra in case of split lines
	// DI: Note I rewrote this (much faster) without really knowing the details
        if (this.chunks == null) return null;
	
        var extra = null;
	var wrap = false;
        var localChunkCount = 0;
	for (var i = 0; i < this.chunks.length; i++) {  // Step through this line, break at end
            var tc = this.chunks[i];
            if (tc.startIndex < sIndex) {
		localChunkCount++;
		if ((tc.startIndex + tc.length) > sIndex) {
	            // this chunk has been broken up by a word wrap
		    wrap = true;
		    extra = tc.cloneSkeleton();
	            extra.length -= sIndex - extra.startIndex;
	            extra.startIndex = sIndex;
		    tc.length -= extra.length;
		    break;
		}
            }
            else if (tc.startIndex == sIndex)  extra = tc.cloneSkeleton();
            else break;
        }
	var remainingChunks = this.chunks;
	this.chunks = this.chunks.slice(0, localChunkCount);  // Make copy of chunks local to this line
	if (!extra) remainingChunks.splice(0, localChunkCount+1); // Drop local chunks from big list
	else remainingChunks.splice(0, (wrap ? localChunkCount : localChunkCount+1), extra); // ... adding clone or split at line-end
	
	return remainingChunks;
    },

    // accessor function

    setTabWidth: function(w, asSpaces) {
        this.tabWidth = asSpaces ? w * this.spaceWidth : w;
    },

    toString: function() {
    // string representation
        var lString = "textString: (" + this.textString + ")" +
            " startIndex: " + this.startIndex +
            " overallStopIndex: " + this.overallStopIndex +
            " topLeft: " + Object.inspect(this.topLeft) +
            " spaceWidth: " + this.spaceWidth + 
            " hasComposed: " + this.hasComposed;
        return lString;
    }
    
});

// in the future, support multiple locales
var Locale = {

    charSet: CharSet,
    //KP: note that this depends heavily on the language, esp if it's a programming language
    selectWord: function(str, i1) { // Selection caret before char i1
        var i2 = i1 - 1;
        if (i1 > 0) { // look left for open backets
            if(str[i1-1] == "\n" || str[i1-1] == "\r") return this.findLine(str, i1, 1, str[i1-1]);
	    var i = this.charSet.leftBrackets.indexOf(str[i1-1]);
            if (str[i1 - 1] == "*" && (i1-2 < 0 || str[i1-2] != "/")) 
                i = -1; // spl check for /*
            if (i >= 0) {
                var i2 = this.matchBrackets(str, this.charSet.leftBrackets[i], this.charSet.rightBrackets[i], i1 - 1, 1);
                return [i1, i2 - 1]; 
            } 
        }
        if (i1 < str.length) { // look right for close brackets
            if(str[i1] == "\n" || str[i1] == "\r") return this.findLine(str, i1, -1, str[i1]);
            var i = this.charSet.rightBrackets.indexOf(str[i1]);
            if (str[i1]== "*" && (i1+1 >= str.length || str[i1+1] != "/")) 
                i = -1; // spl check for */
            if (i >= 0) {
                i1 = this.matchBrackets(str, this.charSet.rightBrackets[i], this.charSet.leftBrackets[i],i1,-1);
                return [i1+1, i2]; 
            } 
        }
        var prev = (i1<str.length) ? str[i1] : "";
	while (i1-1 >= 0 && (this.charSet.alphaNum.include(str[i1-1]) || this.periodWithDigit(str[i1-1], prev)) ) {
            prev = str[i1-1];
	    i1 --;
        }
	while (i2+1 < str.length && (this.charSet.alphaNum.include(str[i2+1]) || this.periodWithDigit(str[i2+1], prev)) ) {
            prev = str[i2+1];
	    i2 ++;
	}
        return [i1, i2]; 
    },
    
    periodWithDigit: function(c, prev) { // return true iff c is a period and prev is a digit
        if (c != ".") return false;
        return "0123456789".indexOf(prev) >= 0;
    },

    findLine: function(str, start, dir, endChar) { // start points to a CR or LF (== endChar)
        var i = start;
        while ((dir < 0) ? i - 1 >= 0 : i + 1 < str.length ) {
            i += dir;
            if (str[i] == endChar) return dir>0 ? [start, i] : [i+1, start];
        }
        return dir>0 ? [start+1, str.length-1] : [0, start];
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


WrapStyle = Class.makeEnum([ 
    "Normal",  // fits text to bounds width using word wrap and sets height
    "None", // simply sets height based on line breaks only
    "Shrink" // sets both width and height based on line breaks only
]);

Morph.subclass('TextSelectionMorph', {

    documentation: "Visual representation of the text selection",
    style: {fill: Color.primary.green, borderWidth: 0, borderRadius: 1},
    transientBounds: true,
    
    initialize: function($super) {
	$super(pt(0, 0).asRectangle(), "rect");
	this.applyStyle({fill: null, borderWidth: 0});
	this.ignoreEvents();
    },

    addRectangle: function(rect) {
	var m = this.addMorph(new Morph(rect, "rect"));
	m.applyStyle(this.style);
	m.ignoreEvents();
    },

    undraw: function() {
	this.removeAllMorphs();
    }

});



Visual.subclass('TextContent', {
    documentation: "wrapper around SVG Text elements",
    initialize: function() {
	this.rawNode = NodeFactory.create("text", { "kerning": 0 });
    }
});

Morph.subclass("TextMorph", {
    
    documentation: "Container for Text",
    // these are prototype variables
    fontSize:   Config.defaultFontSize   || 12,
    fontFamily: Config.defaultFontFamily || 'Helvetica',
    textColor: Color.black,
    backgroundColor: Color.veryLightGray,
    borderWidth: 1,
    borderColor: Color.black,

    padding: Rectangle.inset(6, 4), // remember this shouldn't be modified unless every morph should get the value 
    wrap: WrapStyle.Normal,
    maxSafeSize: 20000, 
    tabWidth: 4,
    tabsAsSpaces: true,
    noShallowCopyProperties: Morph.prototype.noShallowCopyProperties.concat(['textContent', 'lines']),
    locale: Locale,
    acceptInput: true, // whether it accepts changes to text KP: change: interactive changes
    autoAccept: false,
    
    
    initializeTransientState: function($super, initialBounds) {
        $super(initialBounds);
        this.selectionRange = [0, -1]; // null or a pair of indices into textString
        this.selectionPivot = null;  // index of hit at onmousedown
        this.priorSelection = [0, -1];  // for double-clicks
        this.hasKeyboardFocus = false;
        this.isSelecting = false; // true if last onmousedown was in character area (hit>0)
        // note selection is transient
        this.lines = null;//: TextLine[]
        this.lineNumberHint = 0;
        this.textSelection = this.addMorphBack(new TextSelectionMorph());
    },

    initializePersistentState: function($super, initialBounds, shapeType) {
        $super(initialBounds, shapeType);
        this.textContent = this.addWrapper(new TextContent());

        this.resetRendering();
	
	this.setLivelyTrait("wrap", this.wrap);
        // KP: set attributes on the text elt, not on the morph, so that we can retrieve it
	this.applyStyle({fill: this.backgroundColor, borderWidth: this.borderWidth, borderColor: this.borderColor});
    },
    
    restorePersistentState: function($super, importer) {
        $super(importer);
        this.wrap = this.getLivelyTrait("wrap");
	this.padding = Converter.parseInset(this.getLivelyTrait("padding"));
    },

    restoreFromSubnode: function($super, importer, rawNode) {
	if ($super(importer, rawNode)) return true;
	if (rawNode.localName == "text") {
            this.textContent = new TextContent(importer, rawNode);   
            var content = [];
            for (var child = rawNode.firstChild; child != null; child = child.nextSibling) {
		if (child.tagName != 'tspan')  
		    continue;
		var word = new TextWord(importer, child);
		var lead = parseInt(word.getLivelyTrait("lead"));
		if (lead) content.push(" ".times(lead));
		content.push(word.rawNode.textContent); 
		var trail = parseInt(word.getLivelyTrait("trail"));
		if (trail) content.push(" ".times(trail));
		if (word.getLivelyTrait("nl") == "true")
                    content.push("\n");
            }
            this.textString = content.join("");
            this.fontFamily = this.textContent.getTrait("font-family");
            this.fontSize = this.textContent.getLengthTrait("font-size");
            this.font = Font.forFamily(this.fontFamily, this.fontSize);
            this.textColor = new Color(Importer.prototype, this.textContent.getTrait("fill"));
	    return true;
	} 
	return false;
    },

    initialize: function($super, rect, textString) {
        this.textString = textString || "";
        $super(rect, "rect");
        // KP: note layoutChanged will be called on addition to the tree
        // DI: ... and yet this seems necessary!
        if (this.textString instanceof Text) {
	    this.textStyle = this.textString.style;
	    this.textString = this.textString.string;
	}
	this.layoutChanged();
        return this;
    },

    defaultOrigin: function(bounds) { 
        return bounds.topLeft(); 
    },
    

    layoutChanged: function($super) {
	this.verbose && console.log("changed on " + this.textString.truncate());
	$super();
    },

    bounds: function($super, ignoreTransients) {
        if (this.fullBounds != null) return this.fullBounds;
        this.resetRendering();
        this.fitText(); // adjust bounds or text for fit
	this.drawSelection("noScroll");
        return $super(ignoreTransients);
    },
    
    changed: function($super) {
        this.bounds(); // will force new bounds if layout changed
        $super();
    },
    
    setTextColor: function(color) {
        this.textColor = color;
        this.layoutChanged();
        this.changed();
    },
    
    getTextColor: function() {
        return this.textColor;
    },

    applyStyle: function($super, spec) { // no default actions, note: use reflection instead?
	$super(spec);
	if (spec.wrapStyle !== undefined) {
	    if (spec.wrapStyle in WrapStyle) this.setWrapStyle(spec.wrapStyle);
	    else console.log("unknown wrap style " + spec.wrapStyle);
	}
	if (spec.fontSize !== undefined) {
	    this.setFontSize(spec.fontSize);
	}
	if (spec.textColor !== undefined) {
	    this.setTextColor(spec.textColor);
	}
	if (spec.padding !== undefined) {
	    this.setPadding(spec.padding);
	}
	return this;
    },
    
    makeStyleSpec: function($super, spec) {
	var spec = $super();
	if (this.wrap !== TextMorph.prototype.wrap) {
	    spec.wrapStyle = this.wrap;
	}
	if (this.getFontSize() !== TextMorph.prototype.fontSize) {
	    spec.fontSize = this.getFontSize();
	}
	if (this.textColor !== TextMorph.prototype.textColor) {
	    spec.textColor = this.textColor;
	}
	return spec;
    },
    
    setWrapStyle: function(style) {
	if (!(style in WrapStyle)) { 
	    console.log("unknown style " + style); 
	    return; 
	}
        if (style === TextMorph.prototype.wrap) {
            delete this.wrap;
        } else {
            this.wrap = style;
	    this.setLivelyTrait("wrap", style);
        }
    },

    setPadding: function(ext) {
	// FIXME: check vs prototype
        this.padding = ext;
	if (!ext) this.removeLivelyTrait("padding");
	else this.setLivelyTrait("padding", ext.toAttributeValue());
    },

    beLabel: function() {
	this.applyStyle({borderWidth: 0, fill: null, wrapStyle: WrapStyle.Shrink});
	this.ignoreEvents();
        // this.isAccepting = false;
        this.layoutChanged();
        this.okToBeGrabbedBy = Functions.Null;
        return this;
    },

    beListItem: function() {
	// specify padding, otherwise selection will overlap
	this.applyStyle({borderWidth: 0, fill: null, wrapStyle: WrapStyle.None, padding: Rectangle.inset(4, 0)});
	this.ignoreEvents();
	this.suppressHandles = true;
	this.acceptInput = false;
	this.okToBeGrabbedBy = Functions.Null;
	this.focusHaloBorderWidth = 0;
	this.drawSelection = Functions.Empty;
	return this;
    },

    nextHistoryEntry: function() {
	var history = this.getModelValue("getHistory");
	if (!history || history.length == 0) return "";
	var current = this.getModelValue("getHistoryCursor");
	current = (current + 1) % history.length;
	this.setModelValue("setHistoryCursor", current);
	return history[current];
    },
    
    previousHistoryEntry: function() {
	var history = this.getModelValue("getHistory");
	if (!history || history.length == 0) return "";
	var current = this.getModelValue("getHistoryCursor");
	current = (current + history.length - 1) % history.length;
	this.setModelValue("setHistoryCursor", current);
	return history[current];
    },
    
    saveHistoryEntry: function(text, historySize) {
	if (!historySize || !text) return;
	var history = this.getModelValue("getHistory");
	if (!history) history = [];
	history.push(text);
	history.length > historySize && history.unshift();
	this.setModelValue("setHistory", history);
	this.setModelValue("setHistoryCursor", history.length);
    },
    
    
    beInputLine: function(historySize) {
        this.onKeyDown = function(evt) {
	    switch (evt.getKeyCode()) {
	    case Event.KEY_DOWN: 
		historySize && this.setTextString(this.nextHistoryEntry());
		this.setNullSelectionAt(this.textString.length);
		evt.stop();
		return true;
	    case Event.KEY_UP: 
		historySize && this.setTextString(this.previousHistoryEntry());
		this.setNullSelectionAt(this.textString.length);
		evt.stop();
		return true;
	    case Event.KEY_RETURN:
		historySize && this.saveHistoryEntry(this.textString, historySize);
		this.saveContents(this.textString);
		evt.stop();
		return true;
	    default:
		return Class.getPrototype(this).onKeyDown.call(this, evt);
	    }
        };
        this.okToBeGrabbedBy = Functions.Null;
	this.updateView = function(aspect, controller) {
	    Class.getPrototype(this).updateView.call(this, aspect, controller);
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
	this.setWrapStyle(WrapStyle.Shrink);
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

        this.editMenuItems().each(function(item) {menu.addItem(item); });
//		menu.addItem(["accept changes", function() { this.saveContents(this.textString) }]);
        menu.addItem(["evaluate as JavaScript code", function() { this.boundEval(this.textString) }]);

        menu.addItem(["evaluate as Lively markup", function() { 
            var importer = new Importer();
            var txt = this.xml || this.textString;
            // console.log('evaluating markup ' + txt);
            var morph = importer.importFromString(txt);
            this.world().addMorph(morph);
	    importer.finishImport(this.world());
        }]);
	
        menu.addItem(["save as ...", function() { 
	    this.world().prompt("save as...", function(filename) {
		if (!filename) return;
		new NetRequest().put(URL.source.withFilename(filename), this.xml || this.textString);
	    }.bind(this));
        }]);
    
        return menu;
    },

    // TextMorph composition functions
    textTopLeft: function() { 
        return this.shape.bounds().topLeft().addPt(this.padding.topLeft()); 
    },
    
    innerBounds: function() { 
        return this.shape.bounds().insetByRect(this.padding);
    },
    
    ensureRendered: function() { // created on demand and cached
        if (this.ensureTextString() == null) return null;
        
        if (!this.textContent.rawNode.firstChild) {
            this.renderText(this.textTopLeft(), this.compositionWidth());
        }

        return this.textContent; 
    },

    resetRendering: function() {
	this.textContent.replaceRawNodeChildren(null);
	this.textContent.setFill(String(this.textColor));
        this.font = Font.forFamily(this.fontFamily, this.fontSize);
        this.font.applyTo(this.textContent);
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
            this.lines[i].render(this.textContent);
        }
    },

    // compose all of the lines in the text
    composeLines: function(initialTopLeft, compositionWidth, font) {
        var lines = [];
        var startIndex = 0;
        var stopIndex = this.textString.length - 1;
        var chunkSkeleton = null;
	var defaultInterline = (TextLine.prototype.lineHeightFactor - 1) * this.font.getSize();
	var topLeft = initialTopLeft.addXY(0, defaultInterline/2);
        while (startIndex <= stopIndex) {
	    var line = new TextLine(this.textString, this.textStyle, startIndex, 
		                    topLeft, font, new TextEmphasis({}), chunkSkeleton);
            line.setTabWidth(this.tabWidth, this.tabsAsSpaces);
            line.compose(compositionWidth);
            line.adjustAfterComposition(compositionWidth);
            lines.push(line);
            startIndex = line.getNextStartIndex();
            topLeft = topLeft.addXY(0, line.lineHeight());
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
    lineNumberForY: function(y) {
        if (!this.lines || this.lines.length < 1 || y < this.lines[0].getTopY()) return -1;
    
        for (var i = 0; i < this.lines.length; i++) {
            var line = this.lines[i];
	    // was line.font.getSize()
            if (y < line.getTopY() + line.lineHeight()) return i; 
        }
        return -1; 
    },
    lineForY: function(y) {
        var i = this.lineNumberForY(y);
	if (i < 0) return null;
	return this.lines[i];
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
        if (this.wrap === WrapStyle.Normal) return this.shape.bounds().width - this.padding.left() - this.padding.right();
        else return 9999; // Huh??
    },

    // DI: Should rename fitWidth to be composeLineWrap and fitHeight to be composeWordWrap
    fitText: function() { 
        if (this.wrap === WrapStyle.Normal) this.fitHeight();
        else this.fitWidth();
    },

    lineHeight: function() {
	return this.font.getSize() * TextLine.prototype.lineHeightFactor;
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
    
        if (this.shape.bounds().maxY() == maxY + this.padding.top()) 
            return; // No change in height  // *** check that this converges
    
        var bottomY = this.padding.top() + maxY;
    
        var oldBounds = this.shape.bounds();
        this.shape.setBounds(oldBounds.withHeight(bottomY - oldBounds.y))

        this.adjustForNewBounds();
    },

    fitWidth: function() {
        // Set morph bounds based on max text width and height
        
        var jRect = this.getCharBounds(0);
        if (jRect == null) { 
            console.log("fitWidth failure on TextMorph.getCharBounds");
            var s = this.shape;
            s.setBounds(s.bounds().withHeight(this.lineHeight()));
            return; 
        }
    
        var x0 = jRect.x;
        var y0 = jRect.y;
        var maxX = jRect.maxX();  
        var maxY = jRect.maxY();
    
        // DI: really only need to check last char before line breaks...
        // ... and last character
        var s = this.textString;
        var iMax = s.length - 1;
        for (var i = 0; i <= iMax; i++) {
            var c = this.textString[Math.min(i+1, iMax)];
            if (i == iMax || c == "\n" || c == "\r") {
                jRect = this.getCharBounds(i);
                if (jRect == null) { console.log("null bounds at char " + i); return false; }
                if (jRect.width < 100) { // line break character gets extended to comp width
                    maxX = Math.max(maxX, jRect.maxX());
                    maxY = Math.max(maxY, jRect.maxY()); 
                }
            }
        }
        
        // if (this.innerBounds().width==(maxX-x0) && this.innerBounds().height==(maxY-y0)) return;
        // No change in width *** check convergence
        var bottomRight = this.padding.topLeft().addXY(maxX,maxY);


        // DI: This should just say, eg, this.shape.setBottomRight(bottomRight);
	var b = this.shape.bounds();
        if (this.wrap === WrapStyle.None) {
            this.shape.setBounds(b.withHeight(bottomRight.y - b.y));
        } else if (this.wrap === WrapStyle.Shrink) {
            this.shape.setBounds(b.withBottomRight(bottomRight));
        }

    },

    showsSelectionWithoutFocus: Functions.False, // Overridden in, eg, Lists
    
    drawSelection: function(noScroll) { // should really be called buildSelection now
        if (!this.showsSelectionWithoutFocus() && this.takesKeyboardFocus() && !this.hasKeyboardFocus) {
            return;
        }
        this.textSelection.undraw();

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
	    if (this.textString.length > 0) {
		// console.log("text box failure in drawSelection index = " + this.selectionRange[0] + "text is: " + this.textString.substring(0, Math.min(15,this.textString.length)) + '...'); 
	    }
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
            this.textSelection.addRectangle(r1.union(r2));
        } else { // Selection is on two or more lines
            var localBounds = this.shape.bounds();
            r1 = r1.withBottomRight(pt(localBounds.maxX() - this.padding.left(), r1.maxY()));
            r2 = r2.withBottomLeft(pt(localBounds.x + this.padding.left(), r2.maxY()));
            this.textSelection.addRectangle(r1);
            this.textSelection.addRectangle(r2);
        
            if (this.lineNo(r2) != this.lineNo(r1) + 1) {
                // Selection spans 3 or more lines; fill the block between top and bottom lines
                this.textSelection.addRectangle(Rectangle.fromAny(r1.bottomRight(), r2.topLeft()));
            }
        }
		// scrolling here can cause circularity with bounds calc
	if (!noScroll) this.scrollSelectionIntoView();
    },
    

    lineNo: function(r) { //Returns the line number of a given rectangle
        return this.lineNumberForY(r.center().y);
   },
    
    lineRect: function(r) { //Returns a new rect aligned to text lines
	var line = this.lines[Math.min(Math.max(this.lineNo(r), 0), this.lines.length - 1)];
	return new Rectangle(r.x, line.getTopY() - line.interline()/2, r.width, line.lineHeight());
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
        if (evt.isCommandKey()) return false;
         var selectableArea = this.openForDragAndDrop
	    ? this.shape.bounds().insetByRect(this.padding) : this.shape.bounds();
       return selectableArea.containsPoint(this.localize(evt.mousePoint)); 
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
    
        // If not a repeated null selection then done after saving previous selection
        if ( (this.selectionRange[1] != this.selectionRange[0] - 1) ||
            (this.priorSelection[1] != this.priorSelection[0] - 1) ||
            (this.selectionRange[0] != this.priorSelection[0]) ) {
		this.previousSelection = this.priorSelection;
		return;
	}
        
        // It is a null selection, repeated in the same place -- select word or range
        if (this.selectionRange[0] == 0 || this.selectionRange[0] == this.textString.length) {
            this.setSelectionRange(0, this.textString.length); 
        } else {
            this.selectionRange = this.locale.selectWord(this.textString, this.selectionRange[0]);
        }
        
        this.setModelSelection(this.getSelectionString());
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
    
    selectionString: function() { // Deprecated
        return this.getSelectionString(); 
    },
    getSelectionString: function() {
        return this.textString.substring(this.selectionRange[0], this.selectionRange[1] + 1); 
    },
    getSelectionText: function() {
	return this.textStyle ? 
	    this.getText().subtext(this.selectionRange[0], this.selectionRange[1] + 1)
	    : new Text(this.getSelectionString());
    },
    getText: function() {
        return new Text(this.textString, this.textStyle); 
    },

    replaceSelectionWith: function(replacement, delayComposition, justMoreTyping) {
	// Often called with only one arg for normal paste
        if (! this.acceptInput) return;
	var strStyle = this.textStyle;
	var repStyle = replacement.style;
	var oldLength = this.textString.length;
	
	if (! justMoreTyping) { // save info for 'More' command
	    this.charsReplaced = this.getSelectionString();
	    this.lastFindLoc = this.selectionRange[0] + replacement.length;
	}
	
	// Splice the textString
	var before = this.textString.substring(0,this.selectionRange[0]); 
        var after = this.textString.substring(this.selectionRange[1]+1, oldLength);
	this.setTextString(before.concat(replacement.asString(),after), delayComposition, justMoreTyping);
	
	if (strStyle || repStyle) { // Splice the style array if any
	    if (!strStyle) strStyle = new RunArray([oldLength],  [new TextEmphasis({})]);
	    if (!repStyle) repStyle = new RunArray([replacement.length], [strStyle.valueAt(Math.max(0, this.selectionRange[0]-1))]);
	    
	    before = strStyle.slice(0, this.selectionRange[0]);
	    after = strStyle.slice(this.selectionRange[1]+1, oldLength);
	    this.textStyle = before.concat(repStyle).concat(after);
	    // console.log("replaceSel; textStyle = " + this.textStyle);
	}		
        // Compute new selection, and display if not delayed
	var selectionIndex = this.selectionRange[0] + replacement.length;
	if (delayComposition) this.selectionRange = [selectionIndex, selectionIndex-1];
	else this.setNullSelectionAt(selectionIndex); // this displays it as well
    },

    setNullSelectionAt: function(charIx) { 
        this.setSelectionRange(charIx, charIx); 
    },
    
    hasNullSelection: function() { 
        return this.selectionRange[1] < this.selectionRange[0]; 
    },

    setSelectionRange: function(piv, ext) { 
        this.selectionRange = (ext >= piv) ? [piv, ext - 1] : [ext, piv - 1];
        this.setModelSelection(this.getSelectionString());
        this.drawSelection(); 
	this.typingHasBegun = false;  // New selection starts new typing
    },

    // TextMorph keyboard event functions
    takesKeyboardFocus: Functions.True,         // unlike, eg, cheapMenus

    
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
        if (!this.showsSelectionWithoutFocus()) this.textSelection.undraw();
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
	case Event.KEY_TAB: {
	    this.replaceSelectionfromKeyboard("\t");
	    evt.stop();
	    return true;
	}
	case Event.KEY_BACKSPACE: {
	    // Backspace deletes current selection or prev character
            if (this.hasNullSelection()) this.selectionRange[0] = Math.max(-1, this.selectionRange[0]-1);
            this.replaceSelectionfromKeyboard("");
	    if (this.charsTyped.length > 0) this.charsTyped = this.charsTyped.substring(0, this.charsTyped.length-1); 
            evt.stop(); // do not use for browser navigation
            return true;
        }
        case Event.KEY_ESC: {
            this.relinquishKeyboardFocus(this.world().firstHand());
            return true;
        }
        }

        // have to process commands in keydown...
        if (evt.isCommandKey()) {
            if (this.processCommandKeys(evt)) { 
		evt.stop();
		return true;
	    } 
        } 
	return false;
    },
    
    onKeyPress: function(evt) {
        if (!this.acceptInput) return true;

        // cleanup: separate BS logic, diddle selection range and use replaceSelectionWith()
        if (evt.isCommandKey() && UserAgent.isWindows) { // FIXME: isCommandKey() should say no here
            //AltGr pressed
            if (this.processCommandKeys(evt)) {
		evt.stop();
		return true;
	    }
        }  else if (!evt.isCommandKey() && !evt.isMetaDown()) {
            this.replaceSelectionfromKeyboard(evt.getKeyChar()); 
            evt.stop(); // done
	    return true;
        }
	return false;
    },
    
    replaceSelectionfromKeyboard: function(replacement) {
	// This special version of replaceSelectionWith carries out the replacement
	// but postpones the necessary composition for some time (200 ms) later.
	// Thus, if there is further keyboard input pending, it can get handled also
	// without composition until there is an adequate pause.
	// Note: If other events happen when composition has been postponed,
	//    and this can be tested by if(this.delayedComposition),
	//    then a call to composeAfterEdits() must be forced before handling them.

        if (!this.acceptInput) return;
		this.replaceSelectionWith(replacement, true, this.typingHasBegun); // 2nd arg = true delays composition

	if (this.typingHasBegun)  this.charsTyped += replacement;
		else  this.charsTyped = replacement;
	this.typingHasBegun = true;  // So undo will revert to first replacement

	// Bundle display of typing unless suppressed for reliablity or response in small text
	if (Config.showAllTyping  || (Config.showMostTyping && this.textString.length<1000)) {
	    this.composeAfterEdits();
	} else {
	    if(!this.delayedComposition) this.delayedComposition = new SchedulableAction(this, "composeAfterEdits", null, 0);
	    this.world().scheduleForLater(this.delayedComposition, 200, true); // will override a prior request
	}
    },
    
    editMenuItems: function() {
	return [
		["cut (x)", this.doCut.bind(this)],
		["copy (c)", this.doCopy.bind(this)],
		["paste (v)", this.doPaste.bind(this)],
		["replace next (m)", this.doMore.bind(this)],
		["exchange (e)", this.doExchange.bind(this)],
		["undo (z)", this.doUndo.bind(this)],
		["find (f)", this.doFind.bind(this)],
		["find next (g)", this.doFindNext.bind(this)],
		["do it (d)", this.doDoit.bind(this)],
		["printIt (p)", this.doPrintit.bind(this)],
		["accept changes (s)", this.doSave.bind(this)],
		["help", this.doHelp.bind(this)]
		]
    },

    doCut: function() {
	TextMorph.clipboardString = this.getSelectionString(); 
        this.replaceSelectionWith("");
    },
    doCopy: function() {
	TextMorph.clipboardString = this.getSelectionString(); 
    },
    doPaste: function() {
        if (TextMorph.clipboardString) this.replaceSelectionfromKeyboard(TextMorph.clipboardString); 
    },

    doSelectAll: function(fromKeyboard) {
        if (fromKeyboard && this.typingHasBegun) { // Select chars just typed
	    this.setSelectionRange(this.selectionRange[0] - this.charsTyped.length, this.selectionRange[0]);
	} else { // Select All
            this.setSelectionRange(0, this.textString.length); 
	}
    },
    doMore: function() {
        if (this.charsReplaced) {
	    this.searchForFind(this.charsReplaced, this.selectionRange[0]);
	    if (this.getSelectionString() != this.charsReplaced) return;
	    var holdChars = this.charsReplaced;  // Save charsReplaced
	    this.replaceSelectionWith(this.charsTyped); 
	    this.charsReplaced = holdChars ;  // Restore charsReplaced after above
	}
    },
    doExchange: function() {
        var sel1 = this.selectionRange;
	var sel2 = this.previousSelection;
	var d = 1;  // direction current selection will move
	if (sel1[0] > sel2[0]) {var t = sel1; sel1 = sel2; sel2 = t; d = -1} // swap so sel1 is first
	if (sel1[1] >= sel2[0]) return; // ranges must not overlap
	
	var fullText = (this.textStyle) ? this.getText() : this.textString;
	var txt1 = fullText.substring(sel1[0], sel1[1]+1);
	var txt2 = fullText.substring(sel2[0], sel2[1]+1);
	var between = fullText.substring(sel1[1]+1, sel2[0]);
	
	var d1 = (txt2.size() + between.size());  // amount to move sel1
	var d2 = (txt1.size() + between.size());  // amount to move sel2
	var newSel = [sel1[0]+d1, sel1[1]+d1];
	var newPrev = [sel2[0]-d2, sel2[1]-d2];
	if (d < 0) { var t = newSel;  newSel = newPrev;  newPrev = t; }
	var replacement = txt2.concat(between.concat(txt1));
	this.setSelectionRange(sel1[0], sel2[1]+1);  // select range including both selections
	this.replaceSelectionWith(replacement);  // replace by swapped text
	this.setSelectionRange(newSel[0], newSel[1]+1);
	this.previousSelection = newPrev;
	this.undoSelectionRange = d>0 ? sel1 : sel2;
    },
    doFind: function() {
        this.world().prompt("Enter the text you wish to find...",
			    function(response)
			    {return this.searchForFind(response, this.selectionRange[1]); }
			    .bind(this));
    },
    doFindNext: function() {
        if (this.lastSearchString)
	    this.searchForFind(this.lastSearchString, this.lastFindLoc + this.lastSearchString.length);
    },
    doSearch: function() {
        if (SourceControl) SourceControl.browseReferencesTo(this.getSelectionString()); 
    },
    doDoit: function() {
	this.replaceSelectionWith(" " + this.tryBoundEval(this.getSelectionString()));
    },
    doPrintit: function() {
	var strToEval = this.getSelectionString();
	this.setNullSelectionAt(this.selectionRange[1] + 1);
	this.replaceSelectionWith(" " + this.tryBoundEval(strToEval));
    },
    doSave: function() {
        this.saveContents(this.textString); 
    },
    tryBoundEval: function (str) {
	var result;
	try { result = this.boundEval(str); }
	catch (e) { this.world().alert("exception " + e); }
	return result;
    },
    doHelp: function() {
	WorldMorph.current().notify("Help is on the way...\n" +
				    "...but not today.");
    },
    doUndo: function() {
	if (this.undoTextString) {
            var t = this.selectionRange;
	    this.selectionRange = this.undoSelectionRange;
	    this.undoSelectionRange = t;
            t = this.textString;
	    this.setTextString(this.undoTextString);
	    this.undoTextString = t;
	}
	if (this.undoTextStyle) {
            t = this.textStyle;
	    this.textStyle = this.undoTextStyle;
	    this.undoTextStyle = t;
	}
    },
    processCommandKeys: function(evt) {  //: Boolean (was the command processed?)
	var key = evt.getKeyChar();
	// console.log('command ' + key);
	if (key) key = key.toLowerCase();
        switch (key) {
	case "a": { this.doSelectAll(true); return true; } // SelectAll
	case "x": { this.doCut(); return true; } // Cut
	case "c": { this.doCopy(); return true; } // Copy
	case "v": { this.doPaste(); return true; } // Paste
	case "m": { this.doMore(); return true; } // More (repeat replacement)
	case "e": { this.doExchange(); return true; } // Exchange
	case "f": { this.doFind(); return true; } // Find
	case "g": { this.doFindNext(); return true; } // Find aGain
	case "w": { this.doSearch(); return true; } // Where (search in system source code)
	case "d": { this.doDoit(); return true; } // Doit
	case "p": { this.doPrintit(); return true; } // Printit
	case "s": { this.doSave(); return true; } // Italic
            
            // Typeface
	case "b": { this.emphasizeSelection({style: 'bold'}); return true; }
 	case "i": { this.emphasizeSelection({style: 'italic'}); return true; }
 	case "n": { this.emphasizeSelection({style: 'normal'}); return true; }
	    
	    // Font Size
	case "4": { this.emphasizeSelection({size: (this.fontSize*0.8).roundTo(1)}); return true; }
	case "5": { this.emphasizeSelection({size: (this.fontSize*1).roundTo(1)}); return true; }
	case "6": { this.emphasizeSelection({size: (this.fontSize*1.2).roundTo(1)}); return true; }
	case "7": { this.emphasizeSelection({size: (this.fontSize*1.5).roundTo(1)}); return true; }
	case "8": { this.emphasizeSelection({size: (this.fontSize*2.0).roundTo(1)}); return true; }
	    
	    // Text Alignment
	case "l": { this.emphasizeSelection({align: 'left'}); return true; }
	case "r": { this.emphasizeSelection({align: 'right'}); return true; }
	case "h": { this.emphasizeSelection({align: 'center'}); return true; }
	case "j": { this.emphasizeSelection({align: 'justify'}); return true; }
	    
	case "z": { this.doUndo(); return true; }  // Undo
        }
	//if (evt.type == "KeyPress") {
        var bracketIndex = this.locale.charSet.leftBrackets.indexOf(key);
	
        if (bracketIndex >= 0) {
	    this.addOrRemoveBrackets(bracketIndex); 
	    return true;
        } 
	//}
        
        return false;
	
    }
    
});
    
// TextMorph accessor functions
TextMorph.addMethods({

    emphasizeSelection: function(emph) {
	if (this.hasNullSelection()) return;
	var txt = new Text(this.textString, this.textStyle);
	txt.emphasize(emph, this.selectionRange[0], this.selectionRange[1]);
	this.textStyle = txt.style;
	// console.log("emphasizeSelection result: " + this.textStyle);
	this.composeAfterEdits();
    },
    pvtUpdateTextString: function(replacement, delayComposition, justMoreTyping) {
	if(!justMoreTyping) { 
            // Mark for undo, but not if continuation of type-in
	    this.undoTextString = this.textString;
	    this.undoSelectionRange = this.selectionRange;
	    if (this.textStyle) this.undoTextStyle = this.textStyle.clone();
	}
	// DI: Might want to put the maxSafeSize test in clients
        this.textString = replacement.truncate(this.maxSafeSize);
        if (!delayComposition) this.composeAfterEdits();  // Typein wants lazy composition
    },
    
    composeAfterEdits: function() {
        this.resetRendering();
        this.layoutChanged(); 
        this.changed();
        this.drawSelection(); // some callers of pvtUpdate above may call setSelection again
	this.delayedComposition = null;
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
    acceptChanges: function() {    
	    this.textBeforeChanges = this.textString; 
    },
    
    boundEval: function(str) {    
        // Evaluate the string argument in a context in which "this" may be supplied by the modelPlug
        var ctx = this.getModelValue('doitContext', this);
        return (interactiveEval.bind(ctx))(str);
    },
    
    addOrRemoveBrackets: function(bracketIndex) {
        var left = this.locale.charSet.leftBrackets[bracketIndex];
        var right = this.locale.charSet.rightBrackets[bracketIndex];
        
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
	if (newSize == this.fontSize && this.font)  // make sure this.font is inited
	    return;
        this.fontSize = newSize;
        this.font = Font.forFamily(this.fontFamily, newSize);
        this.setPadding(Rectangle.inset(newSize/2 + 2, newSize/3));
        this.layoutChanged();
        this.changed();
    },
    
    setTextString: function(replacement, delayComposition, justMoreTyping) {
        if (this.autoAccept) this.setModelText(replacement);
        this.pvtUpdateTextString(replacement, delayComposition, justMoreTyping); 
    },
    
    updateTextString: function(newStr) {
        this.pvtUpdateTextString(newStr);
	this.resetScrollPane(); 
    },
    
    resetScrollPane: function() {
        var sp = this.enclosingScrollPane();
	if (sp) sp.scrollToTop();
    },
    
    scrollSelectionIntoView: function() { 
	var sp = this.enclosingScrollPane();
	if (! sp) return;
	var selRect = this.getCharBounds(this.selectionRange[this.hasNullSelection() ? 0 : 1]);
	sp.scrollRectIntoView(selRect); 
    },
    
    enclosingScrollPane: function() { 
        // Need a cleaner way to do this
        if (! (this.owner instanceof ClipMorph)) return null;
	var sp = this.owner.owner;
	if (! (sp instanceof ScrollPane)) return null;
	return sp;
    },
    
    updateView: function(aspect, controller) {
        var p = this.modelPlug;
        if (p) {
            if (aspect == p.getText  || aspect == 'all') {
		this.updateTextString(this.getModelText());
		this.textBeforeChanges = this.textString;
	    }
            if (aspect == p.getSelection) {
		this.searchForFind(this.getModelSelection(), 0);
	    }
            return;
        }
    },
    
    getModelText: function() {
        if (this.modelPlug) return this.getModelValue('getText', "-----");
    },
    setModelText: function(newText) {
        if (this.modelPlug) this.setModelValue('setText', newText);
    },
    getModelSelection: function() {
        if (this.modelPlug) return this.getModelValue('getSelection', "-----");
    },
    setModelSelection: function(newSelection) {
        if (this.modelPlug) this.setModelValue('setSelection', newSelection);
    },
    searchForFind: function(str, start) {
	this.requestKeyboardFocus(this.world().firstHand());
	var i1 = this.textString.indexOf(str, start);
	if (i1 < 0) i1 = this.textString.indexOf(str, 0); // wrap
	if (i1 >= 0) this.setSelectionRange(i1, i1+str.length);
		else this.setNullSelectionAt(0);
	this.lastSearchString = str;
	this.lastFindLoc = i1;
    }
    
});


TextMorph.subclass('PrintMorph', {
    documentation: "TextMorph that converts its model value to string using toString(), and from a string using eval()",
    
    updateView: function(aspect, controller) {
        var p = this.modelPlug;
        if (p) {
            if (aspect == p.getValue || aspect == 'all') this.updateTextString(this.getModelText());
        }
    },

    // overridable
    formatValue: function(value) {
	return Strings.withDecimalPrecision(Object.inspect(value), 2);
    },
    
    getModelText: function() {
        return this.formatValue(this.getModelValue('getValue', null));
    },
    
    setModelText: function(newText) {
        this.setModelValue('setValue', eval(newText));
    }

});

TextMorph.subclass('TestTextMorph', {
    // A class for testing TextMorph composition, especially hit, charOfPoint and getCharBounds
    // Set Config.showTextText = true, and then scale up the Pen.script by about 2x
    // It creates a rectangle at mouseDown, and then
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
        if (!this.isSelecting) return $super(evt);
        this.track(evt);
    },
    onMouseUp: function(evt) {
        this.isSelecting = false;
        this.boundsMorph.remove();
    }
});


Object.subclass('RunArray', {
	// A run-coded array for storing text emphasis codes
    initialize: function(runs, vals) {
	this.runs = runs;  // An array with the length of each run
	this.values = vals;   // An array with the value at each run (an emphasis object)
	this.lastIndex = 0;  // A cache that allows streaming in linear time
	this.lastRunIndex = 0;  // Run index corresponding to lastIndex
    },
    valueAt: function(index) {
	var m = this.markAt(index);
	return this.values[m.runIndex];
    },
    runLengthAt: function(index) {
	var m = this.markAt(index);
	return this.runs[m.runIndex] - m.offset;
    },
    markAt: function(index) {
	// Returns a 'mark' with .runIndex and .offset properties
	// Cache not loaded, or past index -- start over
	var runIndex = 0;
	var offset = index;
	if (this.lastIndex && this.lastIndex <= index) {
	    // Cache loaded and before index -- start there
	    runIndex = this.lastRunIndex;
	    offset = index-this.lastIndex;
	}
	while (runIndex < this.runs.length-1 && offset >= this.runs[runIndex]) {
	    offset = offset - this.runs[runIndex];
	    runIndex ++;
	}
	// OK, we're there.  Cache this state and call the function
	this.lastRunIndex = runIndex;
	this.lastIndex = index - offset;
	//console.log("index = " + index + "; runIndex = " + runIndex + "; offset = " + offset);
	//console.log("this.lastRunIndex = " + this.lastRunIndex + "; this.lastIndex  = " + this.lastIndex);
	return {runIndex: runIndex, offset: offset};
    },
    slice: function(start, beyondStop) {  // Just like Array.slice()
	var stop = beyondStop-1;
	// return the subrange from start to stop
	if (stop < start) return new RunArray([0], [null]);
	mStart = this.markAt(start);
	mStop = this.markAt(stop);
	if (mStart.runIndex == mStop.runIndex) {
	    newRuns = [mStop.offset - mStart.offset +1];
	} else {
	    newRuns = this.runs.slice(mStart.runIndex, mStop.runIndex+1);
	    newRuns[0] -= mStart.offset;
	    newRuns[newRuns.length-1] = mStop.offset + 1;
	}
	return new RunArray(newRuns, this.values.slice(mStart.runIndex, mStop.runIndex + 1));
    },
    substring: function(start, beyondStop) {  // echo string protocol
	return this.slice(start, beyondStop);
    },
    concat: function(other) {  // Just like Array.concat()
	if (other.empty()) return new RunArray(this.runs, this.values);
	if (this.empty()) return new RunArray(other.runs, other.values);
	if (!this.equalValues(this.valueAt(this.length()-1),  other.valueAt(0))) {
	    // DI: above test faster if use values directly
	    // values differ at seam, so it's simple...
	    return new RunArray(this.runs.concat(other.runs),
				this.values.concat(other.values));
	}
	var newValues = this.values.concat(other.values.slice(1));
	var newRuns = this.runs.concat(other.runs.slice(1));
	newRuns[this.runs.length-1] = this.runs[this.runs.length-1] + other.runs[0];
	return new RunArray(newRuns, newValues);
    },
    asArray: function() {
	var result = new Array(this.length());
	for (var i = 0; i<this.length(); i++) result[i] = this.valueAt(i);
	return result;
    },
    length: function() {
	var len = 0;
	this.runs.each(function(runLength) { len += runLength; });
	return len;
    },
    clone: function() {
	// OK to share vecause we never store into runs or values
	return new RunArray(this.runs, this.values);
    },
    empty: function() {
	return this.runs.length == 1 && this.runs[0] == 0;
    },
    mergeStyle: function(emph, start, stop) {
	// Note stop is end index, not +1 like slice
	if (start == null) return this.mergeAllStyle(emph);
	var newRun = this.slice(start, stop+1).mergeAllStyle(emph);
	if (start > 0) newRun = this.slice(0, start).concat(newRun);
	if (stop < this.length()-1) newRun = newRun.concat(this.slice(stop+1, this.length()));
	return newRun.coalesce();
    },
    
    mergeAllStyle: function(emph) {
	// Returns a new runArray with values merged with emph throughout
	var newValues = this.values.map(function(each) {return emph.merge(each); });
	// Note: this may cause == runs that should be coalesced
	// ...but we catch most of these in mergeStyle
	return new RunArray(this.runs, newValues).coalesce();
    },
    coalesce: function() {
	// Returns a copy with adjacent equal values coalesced
	// Uses extra slice to copy arrays rather than alter in place
	var runs = this.runs.slice(0);  // copy because splice will alter
	var values = this.values.slice(0);  // ditto
	var i = 0;
	while (i < runs.length-1) {
	    if (this.equalValues(values[i], values[i+1]) ) {
		values.splice(i+1,1);
		var secondRun = runs[i+1];
		runs.splice(i+1,1);
		runs[i] += secondRun;
	    } else i++;
	}
	return new RunArray(runs, values);
    },
    
    equalValues: function(s1, s2) {
	// values are style objs like {style: 'bold', fontSize: 14}
	if (typeof s1 == "number" && typeof s2 == "number") return s1 == s2;  // used for testing
	var match = true;
	Properties.forEachOwn(s1, function(p, v) {match = match && s2[p] == v});
	if (! match) return false;
	// Slow but sure...
	Properties.forEachOwn(s2, function(p, v) {match = match && s1[p] == v});
	return match;
    },
    toString: function() {
	return "runs = " + this.runs + ";  values = " + this.values;
    }
});
Object.extend(RunArray, {
    test: function(a) {
	var ra = new RunArray(a, a); // eg [3, 1, 2], [3, 1, 2]
	console.log("RunArray test for " + ra + " = " + ra.asArray());
	for (var i = 0; i < ra.length(); i++) {
	    var m = ra.markAt(i);
	    // console.log(i + ":  run = " + m.runIndex + ", offset = " + m.offset);
	}
	for (var i = 0; i <= ra.length(); i++) {
	    // break into all possible pairs, join them, and check
	    var ra1 = ra.slice(0, i);
	    var ra2 = ra.slice(i, ra.length());
	    var ra3 = ra1.concat(ra2);
	    // console.log(i + ": " + ra1 + " || " + ra2 + " = " + ra3);
	    for (var j = 0; i <= ra.length(); i++) {
		if (ra3.valueAt(j) != ra.valueAt(j)) console.log("***RunArray failing test***");
	    }
	}
    }
});
RunArray.test([3, 1, 2]);

    
Object.subclass('Text', {
    // Rich text comes to the Lively Kernel
    initialize: function(string, style) {
	this.string = string;
	if (! style) this.style = new RunArray([string.length], [new TextEmphasis({})]);
	if (style instanceof TextEmphasis) this.style = new RunArray([string.length], [style]);
	if (style instanceof RunArray) this.style = style;
    },
    emphasize: function (emph, start, stop) {
	// Modify the style of this text according to emph
	var myEmph = emph;
	if (! (emph instanceof TextEmphasis)) myEmph = new TextEmphasis(emph);
	this.style = this.style.mergeStyle(myEmph, start, stop);
	// console.log("Text.emphasized: " + this.style);
	return this;
    },
    asString: function () { // Return string copy
	return this.string.substring(0);
    },
    size: function () {
	return this.string.length;
    },
    substring: function (start, stop) {
	// Return a substring with its emphasis as a Text
	return new Text(this.string.substring(start, stop), this.style.slice(start, stop));
    },
    concat: function (other) {
	// Modify the style of this text according to emph
	return new Text(this.string.concat(other.string), this.style.concat(other.style));
    },
    toString: function() {
	return "Text for " + this.string + "<" + this.style + ">";
    }
});



Object.subclass('TextEmphasis', {
    initialize: function(obj) {
	Properties.forEachOwn(obj, function(p, v) {this[p] = v; }, this);
    },
    merge: function(other) {
	// this and other are style objs like {style: 'bold', fontSize: 14}
	// In case of overlapping properties, this shall dominate
	var result = new TextEmphasis(other);
	Properties.forEachOwn(this, function(p, v) {result[p] = v;});
	return result;
    },
    toString: function() {
	var props = Properties.own(this).map(function(p) { return p + ": " + this[p]; }.bind(this));
	return "{" + props.join(", ") + "}";
    }
});


}).logCompletion("Text.js")(Global);


