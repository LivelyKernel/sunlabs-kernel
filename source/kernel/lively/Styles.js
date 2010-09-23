/*
 * Copyright (c) 2008-2010 Hasso-Plattner-Institute
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

module('lively.Styles').requires('lively.Widgets').toRun(function() {

Object.subclass('CrayonColors');
Object.extend(CrayonColors, {
colorTableNames: function() {
		return ["cayenne asparagus clover teal midnight plum tin nickel",
		"mocha fern moss ocean eggplant maroon steel aluminum",
		"maraschino lemon spring turquoise blueberry magenta iron magnesium",
		"tangerine lime seafoam aqua grape strawberry tungsten silver",
		"salmon banana flora ice orchid bubblegum lead mercury",
		"cantaloupe honeydew spindrift sky lavender carnation licorice snow"]
		},

	aluminum: new Color(0.662, 0.662, 0.662),
	aqua:  new Color(0.0, 0.556, 1.0),
	asparagus:  new Color(0.564, 0.584, 0.0),
	banana:  new Color(0.983, 1.0, 0.357),
	blueberry:  new Color(0.227, 0.0, 1.0),
	bubblegum:  new Color(1.0, 0.396, 1.0),
	cantaloupe:  new Color(1.0, 0.843, 0.4),
	carnation:  new Color(1.0, 0.458, 0.862),
	cayenne:  new Color(0.619, 0.0, 0.0),
	clover:  new Color(0.0, 0.591, 0.0),
	eggplant:  new Color(0.365, 0.0, 0.599),
	fern:  new Color(0.207, 0.591, 0.0),
	flora:  new Color(0.141, 1.0, 0.388),
	grape:  new Color(0.65, 0.0, 1.0),
	honeydew:  new Color(0.784, 1.0, 0.369),
	ice:  new Color(0.25, 1.0, 1.0),
	iron:  new Color(0.372, 0.369, 0.372),
	lavender:  new Color(0.897, 0.412, 1.0),
	lead:  new Color(0.129, 0.129, 0.129),
	lemon:  new Color(0.979, 1.0, 0.0),
	licorice:  new Color(0, 0, 0),
	lime:  new Color(0.384, 1.0, 0.0),
	magenta:  new Color(1.0, 0, 1.0),
	magnesium:  new Color(0.753, 0.753, 0.753),
	maraschino:  new Color(1.0, 0, 0),
	maroon:  new Color(0.619, 0.0, 0.321),
	mercury:  new Color(0.921, 0.921, 0.921),
	midnight:  new Color(0.113, 0.0, 0.599),
	mocha:  new Color(0.603, 0.309, 0.0),
	moss:  new Color(0.0, 0.591, 0.285),
	nickel:  new Color(0.572, 0.572, 0.572),
	ocean:  new Color(0.0, 0.309, 0.595),
	orchid:  new Color(0.513, 0.435, 1.0),
	plum:  new Color(0.627, 0.0, 0.595),
	salmon:  new Color(1.0, 0.439, 0.455),
	seafoam:  new Color(0.0, 1.0, 0.521),
	silver:  new Color(0.839, 0.839, 0.839),
	sky:  new Color(0.384, 0.839, 1.0),
	snow:  new Color(1.0, 1.0, 1.0),
	spindrift:  new Color(0.215, 1.0, 0.827),
	spring:  Color.green,
	steel:  new Color(0.474, 0.474, 0.474),
	strawberry:  new Color(1.0, 0.0, 0.58),
	tangerine:  new Color(1.0, 0.56, 0.0),
	teal:  new Color(0.0, 0.584, 0.58),
	tin:  new Color(0.568, 0.568, 0.568),
	tungsten:  new Color(0.258, 0.258, 0.258),
	turquoise:  new Color(0, 1.0, 1.0),
});

BoxMorph.subclass('CrayonColorItemMorph', {
	handlesMouseDown: Functions.True,
	onMouseDown: function(evt) {
		this.owner.selectedColor = this.getFill();
	},
	onMouseMove: function(evt) {},

	getHelpText: function() {
		return this.helpText;
	}	
})

BoxMorph.subclass('CrayonColorChooserMorph', {
	initialize: function($super, bounds) {
		bounds = bounds || new Rectangle(0,0,150,150);
		var x = 0;
		var y = 0;
		var h = bounds.height / 6;
		var w = bounds.height / 8 ;

		$super(bounds)
		var colorRow = CrayonColors.colorTableNames()
		this.setFill(Color.gray)
		var self = this;
		colorRow.each(function(eachRow) { 
			eachRow.split(" ").each(function(name) {
				// var morph = new TextMorph(new Rectangle(x, y, w,h), name)
				var morph = new CrayonColorItemMorph(new Rectangle(x,y,w,h));

				morph.setFill(CrayonColors[name]);
				morph.helpText = name;
				self.addMorph(morph);
				morph.setPosition(pt(x,y));
				x += w;
			})
			y +=  h;
			x = 0;
		})
	},
})

Object.subclass('Styles');
Object.extend(Styles, {
	titleBarButtonGradient: function(color) {
		var gfx = lively.paint;
		return new gfx.RadialGradient([
				new gfx.Stop(0, color.mixedWith(Color.white, 0.3)),
				new gfx.Stop(0.5, color),
				new gfx.Stop(1, color.mixedWith(Color.black, 0.6))],
			pt(0.4, 0.2))
	},

	sliderGradient: function(color, fillDirection) {
		var gfx = lively.paint;
		color = color || Color.gray;
		fillDirection = fillDirection || 'EastWest';
		return new gfx.LinearGradient([
				new gfx.Stop(0,   color.mixedWith(Color.white, 0.4)),
				new gfx.Stop(0.5, color.mixedWith(Color.white, 0.8)),
				new gfx.Stop(1,   color.mixedWith(Color.black, 0.9))],
			lively.paint.LinearGradient[fillDirection])
	
	},

	sliderBackgroundGradient: function(color, fillDirection) {
		var gfx = lively.paint;
		color = color || Color.gray;
		fillDirection = fillDirection || 'EastWest';
		return new gfx.LinearGradient([
				new gfx.Stop(0,   color),
				new gfx.Stop(0.4, color.mixedWith(Color.white, 0.3)),
				new gfx.Stop(1, color.mixedWith(Color.white, 0.2))],
			lively.paint.LinearGradient[fillDirection])
	
	},

})


if (!Global.DisplayThemes)
	Global.DisplayThemes = {};
	
Object.extend(DisplayThemes, {primitive: using(lively.paint).link({ 
 	// Primitive look and feel -- flat fills and no rounding or translucency
	styleName: 'primitive',
	titleBar: {
		borderRadius: 0, 
		borderWidth: 2, 
		bordercolor: Color.black,
		fill: Color.neutral.gray.lighter() 
	},

	titleBar_closeButton: {
		fill: Color.primary.orange
	},

	titleBar_menuButton: {
		fill: Color.green,
	},

	titleBar_collapseButton: {
		fill: Color.primary.yellow,
	},

	slider: { 
		borderColor: Color.black, 
		borderWidth: 1, 
		borderRadius: 1,
		fill: Color.neutral.gray.lighter() 
	},
	
	slider_background: { 
		borderColor: Color.darkGray, 
		borderWidth: 1, 
		fill: Color.white,
	},

	slider_horizontal: { 
		borderColor: Color.black, 
		borderWidth: 1, 
		borderRadius: 1,
		fill: Color.neutral.gray.lighter() 
	},

	slider_background_horizontal: { 
		borderColor: Color.darkGray, 
		borderWidth: 1, 
		fill: Color.white,
	},

	button: {
		borderColor: Color.black, 
		borderWidth: 1, 
		borderRadius: 2,
		fill: Color.lightGray 
	},
	widgetPanel: {
		borderColor: Color.red,
		borderWidth: 2,
		borderRadius: 0,
		fill: Color.blue.lighter()
	},
	clock:		 {
		borderColor: Color.black, 
		borderWidth: 1,
		fill: {$:"RadialGradient", 
			stops: [
				{$:"Stop", offset: 0, color: Color.yellow.lighter(2)}, 
				{$:"Stop", offset: 1, color: Color.yellow}]}
	},
	panel: { 
		fill: Color.gray.lighter(2),
		borderWidth: 2,
		borderColor: Color.black
	},
	link: { 
		borderColor: Color.green, 
		borderWidth: 1, 
		fill: Color.blue
	},
	helpText: {
		borderRadius: 15, 
		fill: Color.primary.yellow.lighter(3), 
		fillOpacity: .8
	},
	fabrik: { 
		borderColor: Color.red, 
		borderWidth: 2, 
		borderRadius: 0, 
		fill: Color.blue.lighter(), 
		opacity: 1
	},
	world: {
		fill: Color.white,
	},
	noOp: (function(){
			// for shorter development cycle
			if (Config.draftStyles) {
				(WorldMorph.current().setDisplayTheme(DisplayThemes.primitive))
			}	
		}).delay(0)

}),




hpi:  using(lively.paint).link({
	styleName: 'hpi',
	raisedBorder: { // conenience grouping
		//borderWidth: 2,
		borderColor: {$:"LinearGradient", stops: [
				{$:"Stop", offset: 0, color: Color.lightGray}, 
				{$:"Stop", offset: 1, color: Color.darkGray.darker(3)}],
			vector: lively.paint.LinearGradient.SouthEast
		}
	},

	titleBar: { 
		borderRadius: 8, 
		borderWidth: 2, 
		bordercolor: Color.darkGray,
		fill: {$:"LinearGradient", 
			stops: [
					{$:"Stop", offset: 0.0, color: Color.gray.mixedWith(Color.black, 0.9)},
					{$:"Stop", offset: 0.6, color: Color.gray.mixedWith(Color.white, 0.5)},
					{$:"Stop", offset: 1.0, color: Color.gray.mixedWith(Color.black, 0.9)}], 
			vector: lively.paint.LinearGradient.SouthNorth 
		}
	},

	titleBar_label: {
		fill: null,
	},

	titleBar_label_highlight: {
		fill: Color.white,
		fillOpacity: 0.5,
	},

	titleBar_button_label: {
		textColor: new Color(0.5,0.5,0.5,0.5),

// CrayonColors.cayenne.copy(),
		fontStyle: 'bold',
	},

	titleBar_closeButton: {
		fill: Styles.titleBarButtonGradient(Color.gray)
	},

	titleBar_menuButton: {
		fill: Styles.titleBarButtonGradient(Color.gray),
	},

	titleBar_collapseButton: {
		fill: Styles.titleBarButtonGradient(Color.gray), 
 	},

	titleBar_closeButton_highlight: {
		fill: Styles.titleBarButtonGradient(CrayonColors.cayenne) 
		// Color.primary.orange // Color.red.mixedWith(Color.gray, 0.8)
	},

	titleBar_menuButton_highlight: {
		fill: Styles.titleBarButtonGradient(Color.green.mixedWith(Color.black, 0.65)),
	},

	titleBar_collapseButton_highlight: {
		fill: Styles.titleBarButtonGradient(Color.rgb(255,215,102) ), // Color.primary.yellow  
 	},

	slider: { 
		borderColor: new Color(0.4,0.4, 0.4), 
		borderOpacity: 1, 	
		borderWidth: 1, 
		borderRadius: 6,
		fill: Styles.sliderGradient(Color.primary.blue.mixedWith(Color.gray, 0.8), 'EastWest')
	},


	slider_background: { 
		borderColor: Color.gray, 
		borderWidth: 1, 
		strokeOpacity: 1,
		borderRadius: 6,
		fill: Styles.sliderBackgroundGradient(Color.gray, 'EastWest'),	
	},

	slider_horizontal: { 
		borderColor: Color.darkGray, 
		borderWidth: 1,
		borderRadius: 6,
		fill: Styles.sliderGradient(Color.primary.blue.mixedWith(Color.gray, 0.8), "NorthSouth")
	},

	slider_background_horizontal: { 
		borderColor: Color.darkGray, 
		borderWidth: 1,
		borderRadius: 6,
		fill: Styles.sliderBackgroundGradient(Color.gray, "NorthSouth")
	},

	button: { 
		borderColor: Color.neutral.gray, 
		borderWidth: 0.6, 
		borderRadius: 5,
		fill: {$:"LinearGradient", 
			stops: [
				{$:"Stop", offset: 0,   color: Color.gray.mixedWith(Color.white, 0.9)},
				{$:"Stop", offset: 0.5, color: Color.gray.mixedWith(Color.white, 0.5)}, 
				{$:"Stop", offset: 1,   color: Color.gray.mixedWith(Color.white, 0.9)}],
			vector: lively.paint.LinearGradient.SouthNorth }
	},

	widgetPanel: { 
		borderColor: Color.gray.darker(), 
		borderWidth: 4, 
		borderRadius: 16,
		fill: Color.gray.lighter(), 
		opacity: 0.4
	},
	
	menu_items: {
		fontSize: 14,
		textColor: CrayonColors.lead,
	},

	menu_list: {
		fill: CrayonColors.snow,
	},

	clock: { 
		borderColor: Color.black, borderWidth: 4,
		fill: {$:"RadialGradient", 
			stops: [
				{$:"Stop", offset: 0, color:Color.gray.lighter(2)}, 
				{$:"Stop", offset: 1, color:Color.gray.lighter()} ]}
	},
	panel: {
		fill: Color.gray.lighter(2), 
		borderWidth: 2, 
		borderColor: Color.darkGray.darker()
	},
	link: {
		borderColor: Color.green, 
		borderWidth: 1, 
		fill: Color.gray
	},

	helpText: { 
		borderRadius: 15, 
		fill: Color.primary.yellow.lighter(3), 
		fillOpacity: .8
	},

	fabrik: {
		borderColor: Color.gray.darker(), 
		borderWidth: 1.0 , 
		borderRadius: 2,
		fill: Color.gray, 
		opacity: 1
	},

	world: {
		fill: Color.white, 
	},

	focusHalo: {
		fill: null, 
		borderColor: Color.gray.darker(),
		strokeOpacity: 0.5
	},

	Browser_codePane: {
		fill: Color.white,		
	},

	Browser_codePaneText: {
		fill: Color.white,
		focusHaloBorderWidth: 1,
		focusHaloBorderWidth: 0.5,
	},

	Browser_locationInput: {
		fill: Color.white,		
	},

	Browser_resizer: {
		fill: Color.gray.lighter(2),		
	},

	Browser_commentPane: {
		fill: Color.white,		
	},

	Browser_commentPaneText: {
		fill: Color.white,		
	},

	noOp: (function(){
			// for shorter development cycle
			if (Config.draftStyles) {
				(WorldMorph.current().setDisplayTheme(DisplayThemes.hpi))
			}	
		}).delay(0)
})

});



});