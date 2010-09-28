module('apps.Presentation').requires('cop.Layers').toRun(function() {

Widget.subclass('PresentationManager', 'default category', {

	slideNames: [],

    viewTitle: "Presentation Manager",
    initialViewExtent: pt(800, 400),

	initialize: function($super) {
		$super();

		return this;
	},

    buildView: function(extent) {
        var panel = PanelMorph.makePanedPanel(extent, [
			['slidePane', newDragnDropListPane, new Rectangle(0, 0, 0.3, 0.93)],
			['saveBtn', function(bnds) { return new ButtonMorph(bnds) }, new Rectangle(0.0, 0.93, 0.15, 0.07)],
		]);

		panel['saveBtn'].setLabel('Save');
		panel.ownerWidget = this;
		panel['slidePane'].innerMorph().setList = function(items) {this.updateList(items)};

		this.panel = panel;

		return panel;
	},

	loadPresentation: function(url, slideNames) {
		var slides = [];

		slideNames.each(function(ea) {
			var slide = this.loadSlide(url.withFilename(ea));
			slides.push(slide);
		}, this);

		this.slideNames = slideNames;
		this.panel['slidePane'].innerMorph().updateList(slides);
	},

	loadSlide: function(url) {
		var xml = new WebResource(url).get().getDocument();

		var rawShape = xml.getElementsByTagName('g')[0];
		var rawShape = document.importNode(rawShape, true);

		var shapes = [];
		var importer = new Importer();

		var withAllSubnodesDo = function(root, func, rest) {
			// Call the supplied function on me and all of my subnodes by recursion.
			var args = $A(arguments);
			args.shift();
			args.shift();
			func.apply(root, args);
			for (var i = 0; i < root.childNodes.length; i++) {
				withAllSubnodesDo(root.childNodes[i], func, rest);
			}
		}

		withAllSubnodesDo(rawShape, function() {
			if (this instanceof SVGDefsElement)
				return;

			var isWikiControl = $A(this.childNodes).detect(function(ea) {
				return $A(ea.childNodes).detect(function(ea2) {
					return ea2.textContent == '"Wiki control"';
				});
			});

			if (isWikiControl)
				return;

			if (this.attributes && this.attributes['type'] && this.attributes['type'].nodeValue == 'ImageMorph') {
				$A(this.getElementsByTagName('image')).each(function(ea) {
					var u = ea.attributes['xlink:href'].nodeValue;
					u = url.withFilename(u).withRelativePartsResolved();
					ea.attributes['xlink:href'].nodeValue = u.toString();
				});
			}

			var s = lively.scene.Shape.importFromNode(importer, this);
			if (s)
				shapes.push(s);
		});

		var slide = new Morph(new lively.scene.Group());
		slide.shape.setContent(shapes);
		slide.setScale(0.12);
		return slide;
	},

});

cop.create('ExtListMorphLayer').refineClass(ListMorph, {

	generateListItem: function(value, rect) {
		if (value instanceof Morph) {
			var r = value.bounds().withWidth(rect.width);
			var box;
			if (value.isListItem) {
				// don't box it again
				box = value;
			} else {
				box = new BoxMorph(r);
				box.setFill(Color.white);
				box.isListItem = true;

				// copied from TextMorph :/
				value.ignoreEvents();
				value.suppressHandles = true;
				value.acceptInput = false;
				value.suppressGrabbing = true;
				value.focusHaloBorderWidth = 0;
				value.drawSelection = Functions.Empty; // TODO does not serialize
				value.isListItem = true;
/*
				value.onDrop = function(other) {
					if (!other) return;
					var listMorph = this.owner.owner;

					console.log('' + this + ' -> ' + other);

					var dragger = this.owner;
					var dropper = other.owner;
					var draggerPos = listMorph.submorphs.indexOf(dragger);
					var dropperPos = listMorph.submorphs.indexOf(dropper);

					var newList = listMorph.itemList.collect(function(ea) {
						return ea.owner;
					});
					newList[draggerPos] = dropper;
					newList[dropperPos] = dragger;

					listMorph.selectLineAt(-1);
					listMorph.updateList(newList);
//					this.target.remove();
//					other.handleDrop(this);
//					this.signalChange();
				};
*/
				box.addMorph(value, pt(0, 50));
			}
			return box;
		}

		return cop.proceed(value, rect);
	},

});

enableLayer(ExtListMorphLayer);

}) // end of module