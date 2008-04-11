/*
 * Simple grid layour morph:
 * this morph owns the position and extent of all its children
 * rows and column indexes start at "1"
 * - XXX Just started (SAU)
 */

/**
 * @class GridLayoutMorph
 */

console.log("start gridlayout.js");
Morph.subclass(Global, "GridLayoutMorph", {
	this.nextRow=1;
	this.nextCol=1;

	initialize: function($super, position) {
		this.radius = radius;
		$super(position.asRectangle().expandBy(10), "rect");
	},

    addMorph: function(morph, constraints) {
		morph.constraints = this.validateConstraints(constraints);
		return $super(morph);
	},

	validateConstraints: functon(c) {
		if (!c) c = new Object();
		if (c.row) {
			c.nextCol = 0;
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
		c.pad = c.pat || pt(0,0);
		return c;
	},

	nextRow: function(row) {
		this.nextRow = row || nextRow + 1;
	},

	compteLayout: function() {
	}
});
console.log("end gridlayout.js");

