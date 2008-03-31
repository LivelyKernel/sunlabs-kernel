Object.extend(String.prototype, {

    withNiceDecimals: function() {

        // JS can't print nice decimals  // KP: I think it can be convinced, see below
        var dotIx = this.indexOf('.');
        // return unchanged unless all digits with exactly one dot
        if (dotIx < 0 || this.indexOf('.', dotIx+1) >= 0) return this;
        
        for (var i=0; i< this.length; i++) {
            if ('0123456789.'.indexOf(this[i]) < 0) return this; 
        }

        // truncate to 8 digits and trim trailing zeroes
        var ss = this.substr(0, dotIx + 8);
        var len = ss.length;

        for (var i=len-1; i>dotIx+1; i--) {
            if (ss[i] == '0') len--;
            else return ss.substr(0, len) 
        }

        return ss.substr(0,len);
    }
});


Object.extend(Class, {

    // KP: obsolete, use Object.isClass
    isClass: function(object) {
	return (object instanceof Function) 
	    && object.prototype 
	    && (object.functionNames().length > Object.functionNames().length);
    }

});



WidgetModel.subclass('ConsoleWidget', {

    defaultViewTitle: "Console",
    
    initialize: function($super, capacity) {
	$super(null);
	this.capacity = capacity;
	this.messageBuffer = [];
	this.commandBuffer = [""];
	this.commandCursor = 0;
	Global.console.consumers.push(this);
	this.ctx = { };
	this.ans = undefined; // last computed value
	return this;
    },
    
    initialViewPosition: function(world, hint) {
	return hint || pt(0, world.viewport().y - 200);
    },

    initialViewExtent: function(world, hint) {
	return hint || pt(world.viewport().width, 160); 
    },
    
    buildView: function(extent) {
	var panel = PanelMorph.makePanedPanel(extent, [
            ['messagePane', newTextListPane, new Rectangle(0, 0, 1, 0.8)],
            ['commandLine', TextMorph, new Rectangle(0, 0.8, 1, 0.2)]
        ]);
	
	var m = panel.messagePane;
	m.connectModel({model: this, getList: "getRecentMessages"});
	m.innerMorph().focusHaloBorderWidth = 0;
	m.innerMorph().updateList = function(list) {
	    TextListMorph.prototype.updateList.call(this, list);
	    panel.messagePane.scrollToBottom();
	};
	var self = this;
	panel.shutdown = function() {
	    PanelMorph.prototype.shutdown.call(this);
	    var index = window.console.consumers.indexOf(self);
	    if (index >= 0)
		window.console.consumers.splice(index);
	};
	
	m = panel.commandLine.beInputLine();
	m.connectModel({model: this, setText: "evalCommand", getText: "getCurrentCommand", 
			getPreviousHistoryEntry: "getPreviousHistoryEntry",
			getNextHistoryEntry: "getNextHistoryEntry"});
	return panel;
    },
    
    // history autodecrements/increments 
    getPreviousHistoryEntry: function() {
	this.commandCursor = this.commandCursor > 0 ? this.commandCursor - 1 : this.commandBuffer.length - 1;
	return this.commandBuffer[this.commandCursor];
    },
    
    getNextHistoryEntry: function() {
	this.commandCursor = this.commandCursor < this.commandBuffer.length - 1 ? this.commandCursor + 1 : 0;
	return this.commandBuffer[this.commandCursor];
    },
    
    getCurrentCommand: function() {
	return ""; // the last command is empty (this clears the command line after an eval)
    },

    evalCommand: function(text) {
	if (!text) return;
	this.commandBuffer.push(text);
	if (this.commandBuffer.length > 100) {
	    this.commandBuffer.unshift();
	}
	this.commandCursor = this.commandBuffer.length - 1;
	var self = this;
	var ans = this.ans;
	
	try {
	    ans = (function() { 
		// interactive functions. make them available through doitContext ?
		function $w() { 
		    // current world
		    return WorldMorph.current(); 
		}
		function $h() {  
		    // history
		    for (var i = self.commandBuffer.length - 1; i > 0; i--) {
			self.log(i + ") " + self.commandBuffer[i]);
		    }
		}
		function $m(morph) {
		    // morphs
		    var array = [];
		    (morph || WorldMorph.current()).submorphs.forEach(function(m) { array.push(m) });
		    return array;
		}
		function $i(id) {
		    return document.getElementById(id.toString());
		}

		function $x(node) {
		    return Exporter.stringify(node);
		}
		
		function $f(id) {
		    // format node by id
		    return $x($i(id));
		}
		function $c() {
		    // clear buffer
		    self.messageBuffer = [];
		    self.changed('getRecentMessages');
		}
		function $p(obj) {
		    return Properties.all(obj);
		}
		return eval(text);
	    }).bind(this.ctx)();
	    
	    if (ans !== undefined) {
		this.ans = ans;
		this.log(ans && ans.toString());
	    }
	    this.changed('getCurrentCommand');
	} catch (er) {
	    console.log("Evaluation error: "  + er);
	}
    },
    
    getRecentMessages: function() {
	return this.messageBuffer;
    },

    log: function(message) {
	if (this.messageBuffer.length == this.capacity) {
	    this.messageBuffer.unshift();
	}
	this.messageBuffer.push(message);
	this.changed('getRecentMessages');
    }
    
});

