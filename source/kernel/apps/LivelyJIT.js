module('apps.LivelyJIT').requires('lib.jit.jit').toRun(function() {
	
XenoMorph.subclass("JITXenoMorph", {

	initialize: function($super, bounds) {
		$super(bounds);
		this.setupHTMLContent();
	},

	handlesMouseDown: function() {return true},
	onMouseDown: function() {return false},
	onMouseMove: function() {return false},

	setBounds: function($super, newBounds) {
		$super(newBounds);
		this.updateFoObject(new Rectangle(0,0,newBounds.width, newBounds.height));
	},

	updateFoObject: function(bounds) {
		this.foRawNode.setAttribute("x", bounds.x)
		this.foRawNode.setAttribute("y", bounds.y)
		this.foRawNode.setAttribute("width", bounds.width)
		this.foRawNode.setAttribute("height", bounds.height)

	},
	
	removeHTMLContent: function() {
		$A(this.foRawNode.childNodes).select(function(ea) {
			this.foRawNode.removeChild(ea)
		}, this)	
	},

	onDeserialize: function() {
		var foreign = $A(this.rawNode.childNodes).select(function(ea) {
			return ea.tagName == 'foreignObject' && ea !== this.foRawNode}, this);
		foreign.forEach(function(ea) { this.rawNode.removeChild(ea) }, this);
		this.removeHTMLContent();
		this.setupHTMLContent();
	},

	ensureChildIn: function(parent, type, id) {
		var elem = document.getElementById(id)
		if (!elem) {
			elem = document.createElement(type);
			elem.setAttribute("id",id);
			parent.appendChild(elem);
		}
		return elem
	},

	setupHTMLContent: function () {
		var bounds = this.bounds();
		var container = this.ensureChildIn(this.foRawNode , 'div', 'jit-container')
		// container.setAttribute("style","width:450px; height:450px;");
		var leftContainer = this.ensureChildIn(container, 'div', 'left-container');
		this.ensureChildIn(leftContainer, 'ul', 'id-list');
		this.ensureChildIn(leftContainer, 'a', 'update');
		var centerContainer = this.ensureChildIn(container, 'div', 'center-container');
		var infovis = this.ensureChildIn(container, 'div', 'infovis');
		infovis.setAttribute("style","width:" +bounds.width +"px; height:" + bounds.height+"px;");
		var rightContainer =  this.ensureChildIn(container, 'div', 'right-container');
		var innerDetails = this.ensureChildIn(container, 'div', 'inner-details');
		var log = this.ensureChildIn(container, 'div', 'log');
	}

})
	
})