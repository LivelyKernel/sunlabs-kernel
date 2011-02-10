module('lively.oldCore.Layout').requires('lively.oldCore.Morphs').toRun(function() {

/**
 *  Layout Manager 
 *
 */
Object.subclass('LayoutManager',
'testing', {
	layoutAllowed: function() { return LayoutManager.layoutAllowed() },
},
'layouting', {
	layout: function(supermorph) {},
	onReshape: function(morph) {
		morph.adjustForNewBounds();
	},
},
'positioning', {
	positionForInsert: function(morph, ownerMorph) {
		return morph.getPosition();
		// return pt(this.leftPaddingOf(ownerMorph), this.topPaddingOf(ownerMorph));
	},
},
'morphic extensions', {

    setBounds: function(target, newRect) {
		// DI: Note get/setBounds should be deprecated in favor of get/setExtent and get/setPosition
		// This is so that layout management can move things around without triggering redundant or
		// recursive calls on adjustForNewBounds(q.v.)

		// All calls on morph.setBounds should be converted to two calls as above (or just one if,
		// eg, only the extent or position is changing).

		// Of course setBounds remains entirely valid as a message to the *shape* object and, 
		// in fact, shape.setBounds() will have to be called from both setPosition and setExtent
		// but adjustForNewBounds will only need to be called from setExtent.

		// Finally, there is an argument for calling layoutChanged from setPosition and setExtent,
		// since the caller must do it otherwise.  This would simplify things overall.

		// DI:  Note that there is an inconsistency here, in that we are reading and comparing
		// the full bounds, yet if we set extent, it only affects the shape (ie, innerBounds)
	
		var priorBounds = target.bounds();

		if (!newRect.topLeft().eqPt(priorBounds.topLeft())) {  // Only set position if it changes
		    target.setPosition(newRect.topLeft());
		}
		if (!newRect.extent().eqPt(priorBounds.extent())) {  // Only set extent if it changes
		    // FIXME some shapes don't support setFromRect
		    target.shape.setBounds(newRect.extent().extentAsRectangle());
	 	    target.adjustForNewBounds();
		}
    },

	setExtent: function(target, newExtent) {
		target.setBounds(target.getPosition().extent(newExtent));
	},

	setPosition: function(target, newPosition) {
		if (!newPosition) return;
		var delta = newPosition.subPt(target.getPosition());
		target.translateBy(delta);
		return delta;
	},

    layoutChanged: function(target) {},

    beforeAddMorph: function(supermorph, submorph, isFront) {  // isFront -> general spec of location?
    },

    afterAddMorph: function(owner, morph, isFront) {  // isFront -> general spec of location?
		this.layout(owner);
    },

    beforeRemoveMorph: function(supermorph, submorph) {},

    afterRemoveMorph: function(supermorph, submorph) {
		// new behavior:
		supermorph.layoutChanged();
		this.layout(supermorph); // FIXME
    },

},
'derived accessing', {

	orderedSubMorphsOf: function(morph) {
		return morph.visibleSubmorphs().reject(function(ea) {return ea.isEpimorph});
	},

	leftMarginOf: function(morph) {
		return morph.margin ? morph.margin.left() : 0;
	},

	rightMarginOf: function(morph) {
		return morph.margin ? morph.margin.right() : 0;
	},

	topMarginOf: function(morph) {
		return morph.margin ? morph.margin.top() : 0;
	},

	bottomMarginOf: function(morph) {
		return morph.margin ? morph.margin.bottom() : 0;
	},

    rightPaddingOf: function(morph) {
		return morph.padding ? morph.padding.right() : 0;
    },

	leftPaddingOf: function(morph) {
		return morph.padding ? morph.padding.left() : 0;
	},

	topPaddingOf: function(morph) {
		return morph.padding ? morph.padding.top() : 0;
	},

	bottomPaddingOf: function(morph) {
		return morph.padding ? morph.padding.bottom() : 0;
	},
},
'serialization', {
	toLiteral: function() {
		return {}
	},
});

Object.extend(LayoutManager, {
	defaultInstance: new LayoutManager(),
	suppressLayoutLevel: 0,
	fromLiteral: function(literal) { return this.defaultInstance },

	layoutAllowed: function() { return this.suppressLayoutLevel <= 0 },
	noLayoutDuring: function(callback) {
		if (!this.suppressLayoutLevel) this.suppressLayoutLevel = 0;
		this.suppressLayoutLevel++;
		try {
			var result = callback && callback();
		} finally {
			this.suppressLayoutLevel--
		};
		return result;
	},
});

LayoutManager.subclass('HorizontalLayout',  { // alignment more than anything

	layout: function (supermorph) {
		if (!this.layoutAllowed()) return;
		var x = this.leftPaddingOf(supermorph) + supermorph.getBorderWidth() / 2,
			y =  this.topPaddingOf(supermorph) + supermorph.getBorderWidth() / 2,
			height = supermorph.getExtent().y - this.bottomPaddingOf(supermorph) - supermorph.getBorderWidth(),
			submorphs = this.orderedSubMorphsOf(supermorph);

		var hSpaceFill = submorphs.filter(function(submorph) { return submorph.hResizing === 'spaceFill'; });
		if (hSpaceFill.length > 0) {
			var usedSpace = submorphs.collect(function(m) {
				return m.getExtent().x;
			}, this).reduce(function(a, b) { return a + b; }, this.leftPaddingOf(supermorph) + this.rightPaddingOf(supermorph) + supermorph.getBorderWidth());
			var maxSpace = hSpaceFill.collect(function(m) {
				return m.getExtent().x - this.leftMarginOf(m) - this.rightMarginOf(m);
			}, this).reduce(function(a, b) { return a + b; }, supermorph.getExtent().x - usedSpace);
			var eachSpace = maxSpace / hSpaceFill.length;
			hSpaceFill.each(function(m) {
				m.setExtent(m.getExtent().withX(eachSpace));
			});
		}

		for (var i = 0; i < submorphs.length; i++) {
			var submorph = submorphs[i];
			if (submorph.isVisible && !submorph.isVisible()) continue;
			x += this.leftMarginOf(submorph)
			submorph.align(submorph.bounds().topLeft(), pt(x, y));
			if (submorph.vResizing === 'spaceFill')
				submorph.setExtent(submorph.getExtent().withY(height));
			x += submorph.bounds().width;
			x += this.rightMarginOf(submorph);
		}
	},
	
});

Morph.addMethods('default layout manager', {
	layoutManager: LayoutManager.defaultInstance,
});

Object.extend(HorizontalLayout, { 
	defaultInstance: new HorizontalLayout(),
	fromLiteral: function(literal) { return this.defaultInstance }, 
})


LayoutManager.subclass('VerticalLayout',  { // alignment more than anything

	layout: function (supermorph) {
		if (!this.layoutAllowed()) return;
		var x = this.leftPaddingOf(supermorph),
			y =  this.topPaddingOf(supermorph),
			width = supermorph.getExtent().x - this.rightPaddingOf(supermorph) - supermorph.getBorderWidth(),
			submorphs = this.orderedSubMorphsOf(supermorph);

		for (var i = 0; i < submorphs.length; i++) {
			var submorph = submorphs[i];
			if (submorph.isVisible && !submorph.isVisible()) continue;
			y += this.topMarginOf(submorph)
			submorph.align(submorph.bounds().topLeft(), pt(x, y));
			if (submorph.hResizing === 'spaceFill')
				submorph.setExtent(submorph.getExtent().withX(width));
			y += submorph.bounds().height;
			y += this.bottomMarginOf(submorph);
		}
	},

});

Object.extend(VerticalLayout, { 
	defaultInstance: new VerticalLayout(),
	fromLiteral: function(literal) { return this.defaultInstance }, 
})

}) // end of module