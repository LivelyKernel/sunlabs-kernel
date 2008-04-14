console.log("Hello");
/**
 * Simple grid layout morph:
 * this morph owns the position and extent of all its children
 * rows and column indexes start at "1"
 * A constraint object consist of:
 * row, rows, col, cols, align, pad
 * - align contains one or more of "n", "e", "s", "w" to indicate
 *   which sides of its cell the widget sticks to.
 * - pad is a point containing the minimum padding from the border
 * - XXX Just started (SAU)
 * Stuff to add later:
 * - set minimum sizes for rows/columns
 * - allow colum/row sizes to be linked )e.g. equal size columns
 * - show grid lines for debugging and GUI builder
 */

/**
 * @class GridLayoutMorph
 */

console.log("start gridlayout.js");
Morph.subclass(Global, "GridLayoutMorph", {
	nextRow: 1,
	nextCol: 1,

	initialize: function($super, position) {
		this.rows = [0];	// use 0 index for top/left edge
		this.cols = [0];
		$super(position, "rect");
	},

	// set constraints and layout handler

    addMorph: function(morph, cst) {
		morph.cst = this.validateConstraints(cst);

		// override to usurp the std behavior

		morph.realSetPosition = morph.setPosition;
		morph.setPosition=function(newPosition) {
			if (this.iMeanIt) {
				delete this.iMeanIt;
				this.realSetPosition(newPosition);
			} else {
				console.log("Deny: " + this.bounds() + "->" + newPosition);
			}
		};

		morph.setExtent=function(newExtent) {
			console.log("New extent: " + newExtent);
			morph.requestedExtent = newExtent;

			// if new size fits in its existing cell, then readjust in cell
			// otherwise recompute and relayout the entire grid.  for
			// now, just relayout everything.

			console.log("Scheduling update from setExtent: " + this);
			this.owner.scheduleUpdate();
		},

		// this is wrong

		morph.realLayoutChanged = morph.layoutChanged;
		morph.layoutChanged = function() {
			console.log("layoutChanged " + this);
			this.realLayoutChanged();
			this.owner.scheduleUpdate();
		}

        this.addMorphFrontOrBack(morph, true);
		return morph;
	},

	// make sure our constraint object is valid

	validateConstraints: function(constraints) {
        var c = constraints;
		if (!c) c = new Object();
		if (c.row) {
			this.nextCol = 1;
			this.nextRow = c.row;
		} else {
			c.row = this.nextRow;
		}
		if (c.col) {
			this.nextCol = c.col + 1;
		} else {
			c.col = this.nextCol;
		}
		c.rows = c.rows || 1;
		c.cols = c.cols || 1;
		c.align = c.align || "c";
		c.pad = c.pad || pt(0,0);
		console.log(c.row + "," + c.col + " (" + c.cols + "x" + c.rows + ") "
			+ c.align);
		return c;
	},

	// adjust the constraints of a morph (not much error checking)

	moveMorph: function(m, c) {
		for (var i in c) {
			m.cst[i] = c[i];
		}
		this.scheduleUpdate();
	},

	// increment the default next row

	setRow: function(row) {
		this.nextRow = row || this.nextRow + 1;
	},

	// call this anytime we need to relayout the grid

	scheduleUpdate: function() {
		if (this.updateScheduled) {
			clearTimeout(this.updateScheduled);
		}
		this.updateScheduled = setTimeout(this.update.bind(this), 100);
	},

	update: function() {
		console.log("updating " + this);
		this.computeGrid();
		this.doLayout();
		delete this.updateScheduled;
	},

	// figure out where the cell boundaries go
	// fill in this.rows and this.cols

	computeGrid: function() {
		// console.log("Computing Grid");
		var morphs = new Array();
		for (var i=0; i<this.submorphs.length; i++) {
			if (this.submorphs[i].cst) morphs.push(this.submorphs[i]);
		}
		// console.log(" sorting by row");
		morphs.sort(function(a,b) {
			return (a.cst.row+a.cst.rows) - (b.cst.row+b.cst.rows);
		});

		// compute rows then cols (XXX should be combined)

		var end;
		for (var i=0; i<morphs.length; i++) {
			var c = morphs[i].cst;
			var start = c.row - 1;
			end = start + c.rows;
			this.rows[end] = Math.max(this.rows[end]||0,
				(this.rows[start]||0) + morphs[i].getExtent().y + c.pad.y*2);
		}
		var maxY = this.rows[end];
		this.rows.length=end+1;

		// now the columns

		// console.log(" sorting by column");
		morphs.sort(function(a,b) {
			return (a.cst.col+a.cst.cols) - (b.cst.col+b.cst.cols);
		});

		for (var i=0; i<morphs.length; i++) {
			var c = morphs[i].cst;
			var start = c.col - 1;
			end = start + c.cols;
			this.cols[end] = Math.max(this.cols[end]||0,
				(this.cols[start]||0) + morphs[i].getExtent().x + c.pad.x*2);
		}
		var maxX = this.cols[end];
		this.cols.length=end+1;

		// this is really dumb for now

		if (this.showGrid) {
			this.showGridLines(false);
			this.showGridLines(true);
		}

		var newExt = pt(maxX, maxY);
		if (!newExt.eqPt(this.bounds().extent())) {
			console.log("changing container size");
			this.setExtent(newExt);
		} 
	},

	// fit the morphs in the grid

	doLayout: function() {
		for (var i=0; i<this.submorphs.length; i++) {
			var m = this.submorphs[i];
			if (m.cst) {
				var c = m.cst;
				var r = new Rectangle(this.cols[c.col-1], this.rows[c.row-1],
					this.cols[c.col+c.cols-1]-this.cols[c.col-1],
					this.rows[c.row+c.rows-1]-this.rows[c.row-1]);
				// console.log(i + ": layout cell: " + r);
				r = this.adjustRect(m.requestExtent || m.bounds().extent(), r,
					c.align);
				// console.log("  old bounds: " + m.bounds());
				// console.log("  new bounds: " + r);
				var o = m.bounds();
				if (r.x==o.x && r.y==o.y && r.width==o.width &&
						 r.height==o.height) {
					console.log("No change for: " + m);
				} else {
					m.iMeanIt=true;
					m.setBounds(r);
					// console.log("  did bounds");
				}
			}
		}
	},

	// this should be a method on Rectangles
	// ext: our morph exent (x,y)
	// rect: our cell boundaries
	// align: one or more of "nsew" (compass directions)
	// the result will be rect (for now)

	adjustRect: function(ext, rect, align) {
		var r = rect;
		align = align || "c";	// center is the default
		if (align.match("n") && align.match("s")) {
			// use r values
		} else if (align.match("n")) {
			r.height = ext.y;
		} else if (align.match("s")) {
			r.height = ext.y; r.y += r.height-ext.y;
		} else {
			r.y += (r.height-ext.y)/2; r.height = ext.y;
		}

		if (align.match("w") && align.match("e")) {
			// use r values
		} else if (align.match("w")) {
			r.width = ext.x;
			console.log("west: " + r + "," + ext);
		} else if (align.match("e")) {
			r.width = ext.x; r.x += r.width-ext.x;
			console.log("east: " + r + "," + ext);
		} else {
			r.x += (r.width-ext.x)/2; r.width = ext.x;
		}
		console.log("adjust: " + r);
		return r;
	},

	showGridLines: function(on) {
		if (on) {
			this.showGrid=true;
			this.makeGridLines();
		} else {
			delete this.showGrid;
			if (this.colLine) {
				for(var i=0; i<this.colLine.length;i++) {
					this.removeMorph(this.colLine[i]);
				}
				delete this.colLine;
			}
			if (this.rowLine) {
				for(var i=0; i<this.rowLine.length;i++) {
					this.removeMorph(this.rowLine[i]);
				}
				delete this.rowLine;
			}
		}
	},

	makeGridLines: function() {
		console.log("making grid lines");
		var ext = this.bounds().extent().subPt(pt(1,1));

		this.rowLine = new Array();
		this.colLine = new Array();
		for(var i=0; i<this.rows.length; i++) {
			var pos = new Rectangle(0, this.rows[i], ext.x, 1);
			var w = new Morph(pos, "rect");
			w.setFillOpacity(.3);
			w.setBorderWidth(0);
			w.setFill(Color.red);
			this.addMorphFrontOrBack(w, true);
			this.rowLine[i] = w;
		}
		for(var i=0; i<this.cols.length; i++) {
			var pos = new Rectangle(this.cols[i], 0, 1, ext.y);
			var w = new Morph(pos, "rect");
			w.setFillOpacity(.3);
			w.setBorderWidth(0);
			w.setFill(Color.red);
			this.addMorphFrontOrBack(w, true);
			this.colLine[i] = w;
		}
	},
});
console.log("end gridlayout.js");

