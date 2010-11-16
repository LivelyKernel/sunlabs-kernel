module('apps.ProtoVisInterface').requires().toRun(function() {

Object.extend(apps.ProtoVisInterface, {

	start: function() {
		WorldMorph.current().canvas().style.position = 'absolute';

		// FIXME
		var url = URL.codeBase.withFilename('projects/HTML5/protovis-3.2/protovis-d3.2.js'),
			src = new WebResource(url).get().content
			try {
				eval(src)
				Global.pv = pv;
				apps.ProtoVisInterface.loaded = true
			} catch(e) {
				throw new Error('Could not load protovis because ' + e)
			}
			
		// FIXME
		// Loader.loadJs('http://lively-kernel.org/repository/webwerkstatt/projects/HTML5/protovis-3.2/protovis-d3.2.js',
			// function() { apps.ProtoVisInterface.loaded = true })
	},

	renderVis: function(vis, pos, scale) {
		scale = scale || 1;
		pos = pos || pt(0,0);
		vis.render();
		vis.canvas().style.position = 'absolute'
		vis.canvas().style.WebkitTransform = 'scale(' + scale + ') translate(' + pos.x +'px, ' + pos.y + 'px)'
		vis.canvas().style.WebkitTransformOrigin = '0px 0px'
		vis.canvas().parentNode.removeChild(vis.canvas());

		var node = vis.canvas().cloneNode(true);

		document.body.appendChild(node)

		return node
	},

	removeVis: function(vis) {
		if (!vis.parentNode) return;
		vis.parentNode.removeChild(vis)
	},
});

// deprecated
Object.subclass('GraphBuilder',
'graph drawing', {
	makePieChart: function(data, diameter) {

	var values = data.pluck('value');
	data.forEach(function(ea) { ea.normalizedValue = ea.value / pv.sum(values) })

	diameter = diameter || 100;

	var
		labelOffset = -40,
		outerLabelOffset = 200,
		borderWidth = Math.max(0, labelOffset) + outerLabelOffset,
		center = diameter / 2 + borderWidth;

	var colorFromNormalizedValue = pv.Scale.linear(pv.min(pv.normalize(values)) - 0.2, pv.max(pv.normalize(values)) + 0.1).range("white", "black");
	
	var vis = new pv.Panel()
	    .width(diameter + borderWidth*2)
	    .height(diameter + borderWidth*2);

	var wedge = vis.add(pv.Wedge)
		.data(data)
		.angle(function(d) { return d.normalizedValue * 2 * Math.PI })
		.fillStyle(function(d) { return colorFromNormalizedValue(d.normalizedValue) })
	    .left(center)
	    .bottom(center)
	    .outerRadius(diameter / 2)	
	
	wedge.add(pv.Label)
			.text(function(d) { return String(d.normalizedValue.toFixed(2) * 100) + '%\n' })

			.left(function() { return (labelOffset + diameter / 2) * Math.cos(wedge.midAngle()) + center })
  			.bottom(function() { return -1 * (labelOffset + diameter / 2) * Math.sin(wedge.midAngle()) + center })
			.textAlign("center")
			.textBaseline("middle")
			.textAngle(0)

			// .textDecoration('bold')
			.font('20px Verdana')
			.textStyle('white')

		vis.add(pv.Dot)
			.data(data)
			.size(100)
			.left(function(d) { return center - 50 })
			.bottom(function(d) { return center - diameter / 2 - 20 - this.index * 30 })
			.strokeStyle("none")
 			.fillStyle(function(d) { return colorFromNormalizedValue(d.normalizedValue) })
			.anchor("right").add(pv.Label)
				.text(function(d) { return d.description })
				.font('20px Verdana')
				.textStyle('black')

	return vis
},
makeBarChart: function(data, diameter) {

},
makeVis: function() {},


});
Object.subclass('ProtoVisDrawing',
'initializing', {
	initialize: function() {
		this.vis = null;
	},
},
'accessing', {
	canvas: function() { return this.vis && this.vis.canvas() },
	setPosition: function(pos) {
		var c = this.canvas();
		if (!c) return;
		c.style.left = pos.x + 'px';
		c.style.top = pos.y + 'px';
	},
},
'rendering', {
	draw: function() {
		throw new Error('subclass resbonsibility');
	},
	render: function() {
		this.remove();
		this.vis = this.draw();
		this.vis.render();
		this.canvas().style.position = 'absolute';
		this.canvas().addEventListener('mouseover', function() {WorldMorph.current().showHostMouseCursor() }, true);
		this.canvas().addEventListener('mouseout', function() {WorldMorph.current().hideHostMouseCursor() }, true);
	},
	remove: function() {
		var c = this.canvas();
		if (!c || !c.parentNode) return
		c.parentNode.removeChild(c);
		this.vis = null;
	},
});

(function load() {
	lively.bindings.callWhenNotNull(
		WorldMorph, 'currentWorld',
		apps.ProtoVisInterface, 'start')
})();

}); // end of module