/*
 * Copyright (c) 2006-2009 Sun Microsystems, Inc.
 *
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

if (!Prototype.Browser.Rhino || Config.fakeFontMetrics) 
TextWord.addMethods({

    onDemandEstablishExtentTable: function() {
        if (!this.extentTable) {
            this.extentTable = new Array(this.textString.length);
            if (!this.fontInfo) this.fontInfo = Font.forFamily(this.getFontFamily(), this.getFontSize());
            if (!this.fontInfo) {
                console.log('did not create font info for ' + family);
                return this.extentTable;// maybe just zeros?
            }
        }
    },

    // this is private for onDemandComputeExtents
    computeExtentsForPosition: function(position, leftX) {
        var bottomY = this.naiveGetY();
        var thisChar = this.textString.charAt(position);
        var h = this.fontInfo.getCharHeight(thisChar);
        var w = this.fontInfo.getCharWidth(thisChar);

        if (isNaN(w)) {
            console.warn('computeExtentsForPosition: width is a NaN for char ' + thisChar);
        } else {
            var ext = new Rectangle(leftX, bottomY - h, w, h);
            this.extentTable[position] = ext;
        }
    },

    // compute extents back leftwards to the last computed extent or the left edge
    //   (non recursive version)
    onDemandComputeExtents: function(position) {
        var originalPosition = position;
        var leftX;

        this.onDemandEstablishExtentTable();
        if (position < this.startIndex) return null;
        if (!this.extentTable[position]) {
            while (position >= this.startIndex && !this.extentTable[position]) {
                // console.log('extents from %s to %s on %s', this.startIndex, originalPosition, this.textString);
                if (position == this.startIndex) {
                    this.computeExtentsForPosition(position, this.naiveGetX());
                    break;
                }
                position--;
            }
            while (position < originalPosition) {
                this.computeExtentsForPosition(position + 1, this.extentTable[position].x + this.extentTable[position].width);
                position++;
            }
        }
        return this.extentTable[originalPosition];
    },

    extentTableToString: function() {
        var s = "";
        for (var i = 0; i < this.extentTable.length; i++) {
            var e = this.extentTable[i];
            if (e == null) {
                s += "*";
            } else {
                s += "|" + e.x + "X," + e.y + "Y," + e.width + "W," + e.height + "H|";
            }
        }
        return s;
    },
    
    getBounds: function(position) {
	// client should make sure that the returned rectanlge is immutable
        return this.onDemandComputeExtents(position);
    },
    
    getStartPositionOfChar: function(pos) {
        return this.getBounds(pos).bottomLeft();
    },

    getEndPositionOfChar: function(pos) {
        return this.getBounds(pos).bottomRight();
    },

    getCharNumAtPosition: function(pos) {
        // FIXME binary search?
        // var exts = this.naiveComputeExtents();
        for (var i = 0; i < this.rawNode.textContent.length; i++) {
            var ext =  this.getBounds(i);
            if (ext && ext.containsPoint(pos)) return i;
        }
        // console.log('failed for ' + pos + ' exts is ' + this.extentTableToString());
        return -1;
    }
    
});

if (Prototype.Browser.Rhino) { // lame Batik detection
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
    }
} else {

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
            return doc.createElement(name);
            // This version only works in XHTML
            // return doc.createElementNS(Namespace.XHTML, name);
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
        // console.log("computed " + this.extentTableToString());
        return extents;
    }
});
}

console.log('loaded svgtext-compat.js');

