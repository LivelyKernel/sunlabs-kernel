/*
 * Copyright (c) 2009-2010 Hasso-Plattner-Institut
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

module("cop.Workspace").requires(["lively.Text", "cop.Layers", "lively.Undo", 'lively.LayerableMorphs']).toRun(function() {

cop.create('WorkspaceLayer')
	.refineClass(TextMorph, {
		toggleEvalOnWorldLoad: function() {
			this.evalOnWorldLoad = ! this.evalOnWorldLoad; 
		},

		morphMenu: function(proceed, evt) {
			var menu = cop.proceed(evt);
			if (menu) {
				menu.addItem([
					(this.evalOnWorldLoad ? "disable" : "enable") + " eval on world load",   this, 
					'toggleEvalOnWorldLoad']);
			}
			return menu;
		},

		onDeserialize: function(proceed) {
			cop.proceed();
			if (this.evalOnWorldLoad) {
				// console.log("eval workspace is " + this.evalOnWorldLoad + ":"+ this.textString );
				this.tryBoundEval(this.textString);
			}
		}
});

// Static Instrumentatioan
cop.create('WorkspaceControlLayer')
	.beGlobal()
	.refineClass(WindowMorph, {

		isWorkspaceLayerEnabled: function() {
				l3 = cop.create('WorkspaceControlLayer2');
				var layers = this.getWithLayers();
				return layers && layers.include(WorkspaceLayer);
		},

		toggleWorkspace: function() {
			console.log("this= " + this);
			if (this.isWorkspaceLayerEnabled()) {
				console.log("disable workspace for " + this); 
				this.setWithLayers([]);
			} else {
				console.log("enable workspace for " + this);
				this.setWithLayers([WorkspaceLayer, UndoLayer]);
				// RESEARCH: here we need to signal the new LayerActivation for interested objects...
			}
		},

		askForNewTitle: function() {
			var self = this;
			WorldMorph.current().prompt('new name', function(input) {
				self.setTitle(input);
			});	
		},

		morphMenu: function(proceed, evt) {
			var menu = cop.proceed(evt);
			if (menu) {
				menu.addItem([
					"change title",   this, 
					'askForNewTitle']);

				menu.addItem([
					(this.isWorkspaceLayerEnabled() ? "disable" : "enable") +
					" workspace",   this, 
					'toggleWorkspace']);
			}
			return menu;
		}
		
	}).refineClass(WorldMorph, {
		onKeyDown: function(proceed, evt) {
			var key = evt.getKeyChar() && evt.getKeyChar().toLowerCase();
			if (key && evt.isCommandKey() && !evt.isShiftDown()) {
				if (key == 'k') { 
					WorldMorph.current().addWorkspace();
					return true;
				}
			}
			return cop.proceed(evt);
		},
	
		toolSubMenuItems: function(proceed, evt) {
			var menu = cop.proceed(evt);
			menu.push(["Workspace (k) ", function(evt) {
				WorldMorph.current().addWorkspace()
			}]);
			return menu;
		},

		addWorkspace: function(proceed, initialText) {
			initialText = initialText || "Editable text";
			var pane = WorldMorph.current().addTextWindow({content: initialText}); 
			pane.owner.setTitle("Workspace");
			pane.owner.toggleWorkspace();
			var textMorph = pane.submorphs[0].submorphs[0];
			textMorph.setFontFamily('Courier');
			textMorph.requestKeyboardFocus(WorldMorph.current().firstHand());
			textMorph.doSelectAll();
		}
});



});