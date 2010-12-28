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

module('lively.persistence.Debugging').requires().toRun(function() {

Widget.subclass('lively.persistence.Debugging.Inspector',
'settings', {
	viewTitle: 'SmartRef Serialization Inspector',
	initialViewExtent: pt(500, 300),
	defaultText: 'doits here have this === selected inspectee',
},
'view', {
	buildView: function(extent) {
		function chainedLists(bounds) {
			return new ChainedListMorph(bounds, 4);
		}
		var panel = PanelMorph.makePanedPanel(extent, [
			['listPane', chainedLists, new Rectangle(0, 0, 1, 0.48)],
			['resizer', function(bnds){return new HorizontalDivider(bnds)}, new Rectangle(0, 0.48, 1, 0.02)],
			['sourcePane', newTextPane, new Rectangle(0, 0.5, 1, 0.5)],
		]);

		// list content and list selection 
		panel.listPane.plugTo(this, {
			setRoot: {dir: '<-', name: 'rootObj', options: {
				converter: function(obj) { return new InspectorNode('', obj) }}},
			selection: {dir: '->', name: 'inspectee', options: {
				converter: function(node) { return node.object }}},
		});

		// set title
		panel.listPane.plugTo(panel, {
			selection: {dir: '->', name: 'setTitle', options: {
				converter: function(node) {return node.object ? node.object.toString() : String(node.object)}}},
		});

		// source pane
		panel.sourcePane.innerMorph().plugTo(this, { getDoitContext: '->doitContext' });
		panel.sourcePane.innerMorph().setTextString(this.defaultText);

		// resizer setup
		panel.resizer.addScalingAbove(panel.listPane);
		panel.resizer.addScalingBelow(panel.sourcePane)

		panel.ownerWidget = this; // For serialization
		return panel;
	},

},
'inspecting', {
	inspect: function(obj) {
		this.rootObj = obj; // rest is connect magic
	},
	doitContext: function() {
		return this.inspectee || this.rootObj
	},
});

ChainedListMorphNode.subclass('lively.persistence.Debugging.InspectorNode',
'initializing', {
	initialize: function(name, obj) {
		this.name = name;
		this.object = obj;
	},
},
'interface', {
	asString: function() { return String(this.name) },
	childNodes: function() {
		if (Object.isString(this.object)) return [];
		return Properties.all(this.object)
			.sort()
			.collect(function(key) { return new InspectorNode(key, this.object[key]) }, this)
	},
});

Object.subclass('lively.persistence.Debugging.Helper',
'object sizes', {
	listObjectsOfWorld: function(url) {
		var doc = new WebResource(url).beSync().get().contentDocument;
		if (!doc) { alert('Could not get ' + url); return };
		var worldMetaElement = doc.getElementById(lively.persistence.Serializer.jsonWorldId);
		if (!worldMetaElement) { alert('Could not get json from ' + url); return };
		var jso = JSON.parse(worldMetaElement.textContent);

		var printer = this.listObjects(jso.registry);
		WorldMorph.current().addTextWindow(printer.toString());
		return printer;
	},

	listObjects: function(linearizerRegistry) {
		function humanReadableByteSize(n) {
			function round(n) { return Math.round(n * 100) / 100 }
			if (n < 1000) return String(round(n)) + 'B'
			n = n / 1024;
			if (n < 1000) return String(round(n)) + 'KB'
			n = n / 1024;
			return String(round(n)) + 'MB'
		}

		var bytesAltogether = JSON.stringify(linearizerRegistry).length,
			objCount = Properties.own(linearizerRegistry).length;
		// aggregagator with output
		var classes = {
			sortedEntries: function() {
				return Properties.own(this)
					.collect(function(prop) { return this[prop]  }, this)
					.sortBy(function(tuple) { return tuple.bytes }).reverse()
			},
			toString: function() {
				return Strings.format('all: %s (%s - %s per obj)',
								humanReadableByteSize(bytesAltogether), objCount,
								humanReadableByteSize(bytesAltogether / objCount))  +
					'\nclasses:\n' + this.sortedEntries().collect(function(tuple) {
							return Strings.format('%s: %s (%s - %s per obj)',
								tuple.name, humanReadableByteSize(tuple.bytes), tuple.count,
								humanReadableByteSize(tuple.bytes / tuple.count))

						}, this).join('\n')
			},
			toCSV: function() {
				var lines = ['type,size,size in bytes,count,size per object,size perobject in bytes'];
				this.sortedEntries().forEach(function(tuple) {
					lines.push([tuple.name, humanReadableByteSize(tuple.bytes), tuple.bytes, tuple.count,
					humanReadableByteSize(tuple.bytes / tuple.count), tuple.bytes / tuple.count].join(','))
				});
				return lines.join('\n');
			},
		}
	
		Properties.forEachOwn(linearizerRegistry, function(key, value) {
			var className = value.registeredObject[ClassPlugin.prototype.classNameProperty] || 'plain object';
			if (!classes[className]) classes[className] = {count: 0, bytes: 0, name: className};
			classes[className].count++
			classes[className].bytes += JSON.stringify(value.registeredObject).length;
		});

		return classes;
	},
});

Object.extend(lively.persistence.Debugging.Helper, {
	listObjectsOfWorld: function(url) {
		return new this().listObjectsOfWorld(url);
	},
	listObjects: function(jsonOrJso) {
		var jso = Object.isString(jsonOrJso) ? JSON.parse(jsonOrJso) : jsonOrJso;
		if (jso.registry) jso = jso.registry;
		return new this().listObjects(jso)
	},
	prettyPrintJSON: function(json) { return JSON.prettyPrint(json) },
});


// ProtoVisDrawing.subclass('SmartRefForceDiagram',
// 'initializing', {
// 	initialize: function($super, serializer, expanding, rootId) {
// 		$super();
// 		this.serializer = serializer;
// 		this.expanding = expanding;
// 		this.rootId = rootId || 0;
// 	},
// },
// 'data creation', {
// 	nodes: function(depth) {
// 		if (this._cachedNodes) return this._cachedNodes;
// 		return this._cachedNodes = Properties.all(this.serializer.registry).collect(function(id) {
// 			return this.createNodeFromId(id);
// 		}, this).sortBy(function(a) { return Number(a.id) });
// 	},
// 	revealedNodes: function() {
// 		var root = this.nodes()[this.rootId];
// 		return root.collectChildrenAndPointers([]);
// 	},
// 	revealedLinks: function() {
// 		var nodes = this.revealedNodes(),
// 			links = nodes.invoke('links').flatten();
// 		return links.select(function(link) {
// 			var hasSource = false, hasTarget = false;
// 			nodes.forEach(function(node) {
// 				if (link.sourceNode == node) hasSource = true;
// 				if (link.targetNode == node) hasTarget = true;
// 			});
// 			return hasSource && hasTarget;
// 		})
// 	},
// 
// 
// 	createNodeFromId: function(id) {
// 		if (!serializer.allClasses) serializer.allClasses = [];
// 		var regObj = serializer.getRegisteredObjectFromId(id),
// 			className = regObj[ClassPlugin.prototype.classNameProperty],
// 			self = this;
// 		serializer.allClasses = serializer.allClasses.concat([className]).uniq();
// 		return {
// 			id: id,
// 			nodeName: id.toString() + (className ? (':' + className) : ''),
// 			group: function() { return serializer.allClasses ? serializer.allClasses.indexOf(className) : 1 },
// 			radius: function() { return 20 },
// 			diameter: function() { return Math.min(150, 10 + Math.pow(this.linkDegree, 2) * this.radius()) }, 
// 			links: function() {
// 				if (this._cachedLinks) return this._cachedLinks;
// 				return this._cachedLinks = self.links().select(function(link) {
// 					return link.sourceNode == this;
// 				}, this);
// 			},
// 			children: [],
// 			expandChildren: function() {
// 				this.children = this.links().collect(function(link) { return link.targetNode });
// 			},
// 			nodesPointingToMe: [],
// 			expandObjectsPointingToMe: function() {
// 				this.nodesPointingToMe = self.links()
// 					.select(function(link) { return link.targetNode === this }, this)
// 					.collect(function(link) { return link.sourceNode });
// 			},
// 			collectChildrenAndPointers: function(collector) {
// 				if (collector.include(this)) return collector;
// 				collector.push(this);
// 				this.nodesPointingToMe.concat(this.children).invoke('collectChildrenAndPointers', collector);
// 				return collector;
// 			},
// 			reset: function() {
// 				this.x = 0
// 				this.y = 0
// 				this.px = 0
// 				this.py = 0
// 				this.vx = 0
// 				this.vy = 0
// 			},
// 			get vx() { var sign = this._vx < 0 ? -1 : 1; return sign * Math.min(5, Math.abs(this._vx)) },
// 			set vx(val) { this._vx = val },
// 			get vy() { var sign = this._vy < 0 ? -1 : 1; return sign * Math.min(5, Math.abs(this._vy)) },
// 			set vy(val) { this._vy = val },
// 		}
// 	},
// 
// 	linksOfId: function(id) {
// 		var serializer = this.serializer,
// 			registeredObj = serializer.getRegisteredObjectFromId(id),
// 			self = this;
// 		var result = []
// 		// normal refs
// 		function addLink(arr, sourceObj, propName, linkName) {
// 			var value = sourceObj[propName];
// 			if (!value) return arr;
// 			if (serializer.isReference(value)) {
// 				arr.push({
// 					sourceNode: self.nodes()[id],
// 					targetNode: self.nodes()[value.id],
// 					sourceId: id,
// 					targetId: value.id,
// 					name: linkName,
// 					startPos: function() { return this.sourceNode ? pt(this.sourceNode.x, this.sourceNode.y) : pt(0,0) },
// 					endPos: function() { return this.targetNode ? pt(this.targetNode.x, this.targetNode.y) : pt(0,0) },
// 					arrowPos: function() { return this.endPos().subPt(this.vector().normalized().scaleBy(20)) },
// 					vector: function() { return this.endPos().subPt(this.startPos()) },
// 					center: function() { return this.startPos().addPt(this.vector().scaleBy(0.5)) },
// 					angle: function() { return this.vector().theta() - Math.PI/2 },
// 
// 					// regObj: registeredObj,
// 					// propName: propName
// 				})
// 			}
// 			if (Object.isArray(value))
// 				value.forEach(function(item, idx) { addLink(arr, value, idx, linkName + '[' + idx + ']') })
// 			return arr
// 		}
// 
// 		var links = Properties.all(registeredObj).inject([], function(links, propName) {
// 			return addLink(links, registeredObj, propName, propName);
// 		});
// 		return links;
// 	},
// 	links: function() {
// 		if (this._cachedLinks) return this._cachedLinks;
// 		return this._cachedLinks = Properties.all(this.serializer.registry)
// 			.collect(function(id) { return this.linksOfId(id) }, this)
// 			.flatten()
// 	},
// 
// 
// },
// 'rendering', {
// 	draw: function() {
// 		var	w = 800, h = 800,
// 			colors = pv.Colors.category19();
// 
// 		var vis = new pv.Panel()
// 			.width(w)
// 			.height(h)
// 			.fillStyle("white")
// 			.event("mousedown", pv.Behavior.pan())
// 			.event("mousewheel", pv.Behavior.zoom());
// 
// 		var force = vis.add(pv.Layout.Force)
// 			// .links(this.links.bind(this))
// 			// .nodes(this.nodes.bind(this))
// 			.links(this.expanding ? this.revealedLinks.bind(this) : this.links())
// 			.nodes(this.expanding ? this.revealedNodes.bind(this) : this.nodes())
// 			// .bound(true)
// 			// .iterations(0)
// 			// .chargeTheta(50)
// 			// .chargeConstant(-100)
// 			// .dragConstant(0.9)
// 			.springLength(function() { return this.springLength || 20 }.bind(this));
// 
// 		force.link.add(pv.Line);
// 
// 		var nodeDot = force.node.add(pv.Dot)
// 			.size(function(d) { return d.diameter() })
// 			.fillStyle(function(d) { return colors(d.group()) })
// 			// .fillStyle('rgba(0.3,0.3,0.3, 0.5)')
// 			.strokeStyle(function() { return this.fillStyle().darker() })
// 			.lineWidth(1)
// 			.event("mousedown", pv.Behavior.drag())
// 			.event("drag", force)
// 
// 		nodeDot.anchor('center').add(pv.Label)
// 				.text(function(d) { return d.nodeName })
// 				.font("12px sans-serif")
// 
// 		if (this.expanding) {
// 			nodeDot.add(pv.Dot)
// 					.fillStyle('red')
// 					.size(10)
// 					.shape('circle')
// 					.top(function(d) { return d.y + d.diameter() * 0.05 })
// 					.event("click", function(d) { d.expandChildren(); force.reset(); force.render() })
// 				.add(pv.Dot)
// 					.fillStyle('blue')
// 					.top(function(d) { return d.y + d.diameter() * -0.05 })
// 					.event("click", function(d) { d.expandObjectsPointingToMe(); force.reset(); force.render() })
// 		}
// 
// 		force.add(pv.Label)
// 			.data(function() { return force.links() })
// 			.textAlign('center')
// 			.top(function(link) { return link.center().y })
// 			.left(function(link) { return link.center().x })
// 			.text(function(link) { return link.name })
// 			.font("9px sans-serif")
// 			.add(pv.Dot)
// 				.shape('triangle')
// 				.top(function(link) { return link.arrowPos().y })
// 				.left(function(link) {return link.arrowPos().x })
// 				.fillStyle('rgba(0.6,0.6,0.6, 1)')
// 				.lineWidth(0)
// 				.size(8)
// 				.angle(function(link) { return link.angle() })
// 
// 
// 		this.force = force;
// 
// 		return vis;
// 	},
// 
// 
// 	step: function() {
// 		var wasRemoved = this.canvas().parentNode == null;
// 		if (wasRemoved) return; // stop and dont call again
// 
// 		var s = this.force,
// 			sim = pv.simulation(s.nodes());
// 		sim.force(pv.Force.drag(d.force.dragConstant()));
// 		sim.force(pv.Force.charge(s.chargeConstant())
// 		     .domain(s.chargeMinDistance(), s.chargeMaxDistance())
// 		     .theta(s.chargeTheta()));
// 
// 		sim.force(pv.Force.spring(s.springConstant())
// 		    .damping(s.springDamping())
// 		    .length(s.springLength())
// 		    .links(s.links()));
// 
// 		sim.constraint(pv.Constraint.position());
// 		sim.constraint(pv.Constraint.bound().x(6, s.width() - 6).y(6, s.height() - 6));
// 
// 
// 		sim.step()
// 		s.render()
// 	},
// 
// });

}) // end of module