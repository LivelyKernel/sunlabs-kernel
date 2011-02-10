module('lively.oldCore.Hacks').requires().toRun(function() {

/**
 * Hacks 
 */
Global.ClipboardHack = {
	ensurePasteBuffer: function() {
		// Return a reference to a text element to serve as our proxy for communication
		//   with the OS about text such as cut/paste, or iPad keyboard input
		if (UserAgent.isMozilla && UserAgent.fireFoxVersion) return;
		var buffer = document.getElementById("copypastebuffer");
		if (buffer) return buffer;

		// Not there yet -- create a new one
		buffer = document.createElement("textarea");
		buffer.setAttribute("cols","1");
		buffer.setAttribute("rows","1");
		buffer.setAttribute("id","copypastebuffer");
		// buffer.setAttribute("style","position:absolute;z-index: -400;left:0px; top:1px; width:1px; height:1px;");
		if (UserAgent.isTouch) { // hack to test text input on iPad
			buffer.setAttribute("style","position:fixed;z-index: 5;left:0px; top:0px; width:100px; height:30px;");
		} else {
			// the Clipboard buffer needs a minimum width, otherwise it will scroll the page on the first paste
			buffer.setAttribute("style","position:fixed;z-index: -5;left:0px; top:0px; width:100px; height:100px;");
		}
		buffer.textContent = "NoText";
		var outerBody = Global.document.body || Global.parent.document.body;
		outerBody.appendChild(buffer);
		return buffer;
	},
	
	selectPasteBuffer: function() {
		var buffer = this.ensurePasteBuffer();
		if (buffer) buffer.select();
	},
	
	invokeKeyboard: function() {
	 		if (!UserAgent.isTouch) return;
			var buffer = this.ensurePasteBuffer();
			if (buffer) buffer.focus();
	},
	
	tryClipboardAction: function(evt, target) {
        // Copy and Paste Hack that works in Webkit/Safari
        if (!evt.isMetaDown() && !evt.isCtrlDown()) return false;

		// Multiworld Code
		if (evt.hand.world().currentSelection != target && evt.hand.world() != target && evt.hand.keyboardFocus != target) return false;

		this.selectPasteBuffer();
        var buffer = this.ensurePasteBuffer();
        if(!buffer) return false;
        if (evt.getKeyChar().toLowerCase() === "v" || evt.getKeyCode() === 22) {	
			var paste_executed = false;
		    buffer.onpaste = function() {
				if (paste_executed) return; // BUG Workaround: Safari 5.0 (6533.16), calls the paste two times
				paste_executed = true;
				TextMorph.clipboardString = event.clipboardData.getData("text/plain");
                if(target.doPaste) target.doPaste();
            };
        	buffer.focus();
        	return true;
        };
        if (evt.getKeyChar().toLowerCase() === "c" || evt.getKeyCode() === 3) {
			if(target.doCopy) target.doCopy();
			buffer.textContent = TextMorph.clipboardString;
			buffer.select();
        	buffer.focus();
        	return true;
        };
        if (evt.getKeyChar().toLowerCase() === "x" || evt.getKeyCode() === 24) {
			if (target.doCut) target.doCut();
			buffer.textContent = TextMorph.clipboardString;
			buffer.select();
        	buffer.focus();
        	return true;
        };
		// console.log('Clipboard action not successful');
		return false;
    },

}

}) // end of module