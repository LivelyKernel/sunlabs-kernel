/*
 * Copyright (c) 2008-2011 Hasso Plattner Institute
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

module('lively.persistence.ObjectExtensions').requires('lively.ide', 'cop.Layers').toRun(function() {

// morphic stuff
Morph.addMethods('serialization', {
	onrestore: function() {
		this.restoreShapeRelation();
		this.restoreSubMorphRelation();
	},

	restoreShapeRelation: function() {
		// shape relation
		if (!this.rawNode || !this.shape.rawNode) {
			console.warn('No rawNode when trying to restore for ' + this);
			return
		}
		this.rawNode.appendChild(this.shape.rawNode);
	},

	restoreSubMorphRelation: function() {
		if (!this.submorphs) { this.submorphs = []; return }
		this.submorphs.forEach(function(subMorph) {
			if (!subMorph.rawNode) {
				debugger
				console.error('No rawNode when trying to restore for submorph' + subMorph)
				return
			}
			this.rawNode.appendChild(subMorph.rawNode)
		}, this)
	},

})

TextMorph.addMethods('serialization', {

	doNotSerialize: TextMorph.prototype.doNotSerialize.concat(['undoHistory']),

	onrestore: function($super) {
		$super();
		if (this.rawNode && this.textContent.rawNode) {
			this.rawNode.appendChild(this.textContent.rawNode);
			if (!this.font)
				this.font = lively.Text.Font.forFamily(this.fontFamily, this.fontSize)
			this.setNullSelectionAt(0);
			this.changed();
		}
		this.initializeTransientState();
	},
})

WorldMorph.addMethods('serialization', {
	onrestore: function($super) {
		$super()
		this.hands = [];
		this.scheduledActions = [];

		var scripts = [];
		this.mainLoopFunc = this.doOneCycle.bind(this).logErrors('Main Loop');
		this.withAllSubmorphsDo(function() {
			if (this.activeScripts && this.activeScripts.length > 0)
				scripts = scripts.concat(this.activeScripts);
		})
		scripts.forEach(function(s) { s && s.start(this); }, this);
	},
});
ClipMorph.addMethods('serialization', {
	onrestore: function($super) {
		$super()
		this.setupClipNode();
	},
});
lively.paint.Gradient.addMethods('serialization', {
	onrestore: function() {
		this.initializeNode();
	},
});
AttributeConnection.addMethods('serialization', {
	onrestore: function() {
		try {
			this.connect();
		} catch(e) {
			dbgOn(true);
			console.error('AttributeConnection>>onrestore: Cannot restore ' + this);
		}
	},
});
lively.ide.SystemBrowser.addMethods('serialization', {
	onrestore: function() {
		// lively.ide.startSourceControl();

		// this.initializeModelRelay(this.getModel());
		// this.setupListPanes();
		// this.setupSourceInput();
		
		if (this.panel) this.panel.onDeserialize.bind(this.panel).delay(0);
		// (function() {
		// 	var oldPanel = this.panel,
		// 		newPanel = this.buildView(oldPanel.getExtent()),
		// 		selection = oldPanel.getSelectionSpec(),
		// 		window = oldPanel.owner;
		// 	window.targetMorph = window.addMorph(newPanel);
		// 	newPanel.setPosition(oldPanel.getPosition());
		// 	oldPanel.remove();
		// 	newPanel.resetSelection(selection, this);
		// }).bind(this).delay(0);
	},
});
lively.ide.LocalCodeBrowser.addMethods('serialization', {
	onrestore: function() {
		lively.bindings.callWhenNotNull(WorldMorph, 'currentWorld', this, 'initializeFromDeserializedWorld');
	},
	initializeFromDeserializedWorld: function(world) {
		this._rootNode = null;
		this.changeSet = world.getChangeSet();
		this.start();
	},
});


cop.create('SmartRefSerializationCompatibility')
.refineClass(lively.data.Wrapper, {
	getLengthTrait: function(name) {
		return this[name] ? this[name] : lively.data.Length.parse(this.rawNode.getAttributeNS(null, name));
	},
	setTrait: function(name, value) {
		this[name] = value;
		return this.rawNode.setAttributeNS(null, name, String(value));
	},
	getTrait: function(name) {
		return this[name] ? String(this[name]) : this.rawNode.getAttributeNS(null, name);
	},
})
.refineClass(lively.scene.Rectangle, {
	bounds: function() {
		var x = this.x || this.rawNode.x.baseVal.value;
		var y = this.y || this.rawNode.y.baseVal.value;
		var width = this.width || this.rawNode.width.baseVal.value;
		var height = this.height || this.rawNode.height.baseVal.value;
		return new Rectangle(x, y, width, height);
	},
	containsPoint: function(p) {
		var x = this.x || this.rawNode.x.baseVal.value;
		var width = this.width || this.rawNode.width.baseVal.value;
		if (!(x <= p.x && p.x <= x + width))
			return false;
		var y = this.y || this.rawNode.y.baseVal.value;
		var height = this.height || this.rawNode.height.baseVal.value;
		return y <= p.y && p.y <= y + height;
	},
});


ImageMorph.addMethods('serialization', {
	onrestore: function($super) {
		$super()
		if (this.image && this.image.rawNode)
			this.addNonMorph(this.image.rawNode);
	},
})


// lively.scene.Rectangle.addMethods('SmartRefSerialization',{
	// rawNodeType: "rect",
// })
// lively.scene.Ellipse.addMethods('SmartRefSerialization',{
	// rawNodeType: "ellipse",
// })
// lively.scene.Polygon.addMethods('SmartRefSerialization',{
	// rawNodeType: "polygon",
// })
// lively.scene.Polyline.addMethods('SmartRefSerialization',{
	// rawNodeType: "polyline",
// })
// lively.scene.Group.addMethods('SmartRefSerialization',{
	// rawNodeType: "g",
// })
// lively.scene.Image.addMethods('SmartRefSerialization',{
	// rawNodeType: "image", // FIXME
// })
// lively.scene.Clip.addMethods('SmartRefSerialization',{
	// rawNodeType: "clipPath",
// })
// lively.scene.Text.addMethods('SmartRefSerialization',{
	// rawNodeType: "text",
// })
// lively.paint.Stop.addMethods('SmartRefSerialization',{
	// rawNodeType: "stop",
// })
// lively.paint.LinearGradient.addMethods('SmartRefSerialization',{
	// rawNodeType: "linearGradient",
// })
// lively.paint.RadialGradient.addMethods('SmartRefSerialization',{
	// rawNodeType: "radialGradient",
// });

}) // end of module