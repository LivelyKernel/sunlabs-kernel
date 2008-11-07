module('lively.Helper').requires().toRun(function() {
     
// extension to Morphs
Morph.addMethods({
    openInWorld: function(loc) {
        WorldMorph.current().addMorph(this);
        loc && this.setPosition(loc);
    }
});
// this.getRichText().asMorph().openInWorld()

/*
 * Stack Viewer when Dans StackTracer is not available
 */

Global.getStack = function() {
    var result = [];
    for (var caller = arguments.callee.caller; caller; caller = caller.caller) {
        if (result.indexOf(caller) != -1) {
           result.push({name: "recursive call can't be traced"});
           break;
        }
        result.push(caller);
    };
    return result;  
};


Global.printStack = function() {  
    function guessFunctionName(func) {
        return func.qualifiedMethodName() || func.toString().match(/function (.+)\(/)[1] || func;
    };
    
    var string = "== Stack ==\n";
    var stack = getStack();
    stack.shift(); // for getStack
    stack.shift(); // for printStack (me)
    var indent = "";
    for (var i=0; i < stack.length; i++) {
        string += indent + i + ": " +guessFunctionName(stack[i]) + "\n";
        indent += " ";        
    };
    return string;
};

Global.logStack = function() {
    this.console.log(printStack())
};

Global.logStackFor = function(obj, methodName) {
    obj[methodName] = obj[methodName].wrap(function(proceed) {
        var args = $A(arguments); args.shift(); 
        MyLogDepth++;
        debugger;
        var result = proceed.apply(this, args);
        
        logStack();
        MyLogDepth--;
        return result
    })
};

Global.indentForDepth = function(depth) {
    var s=""
    for(var i=depth; i > 0; i--) s += " ";
    return s
};

Global.resetLogDepth = function() {
    MyLogDepth = 0;    
};
Global.resetLogDepth();

Global.logCall = function(args, from, shift) {
    s = ""
    s += indentForDepth(MyLogDepth);
    if(from)
        s += String(from) + " ";
    s += args.callee.qualifiedMethodName() + "("
    var myargs = $A(args);
    if(shift) myargs.shift(); // for loggin inside wrapper functions
    myargs.each(function(ea){ s += ea + ", "});
    s += ")";
    console.log(s)
};

// function logCallHelper(from, methodName, args, indent) {
//     return Strings.format('%s%s>>%s(%s)',
//         indentForDepth(indent),
//         from.toString(),
//         methodName,
//         args.collect(function(ea) { return ea.toString() }).join(', '));
// };


Global.logMethod = function(obj, methodName) {
    obj[methodName] = obj[methodName].wrap(function(proceed) {
        var args = $A(arguments); args.shift(); 
        MyLogDepth++;
        console.log(logCallHelper(this, methodName, args, MyLogDepth * 2))
        var result = proceed.apply(this, args);
        MyLogDepth--;
        return result
    })
};

Global.printObject = function(obj) {
    var s = String(obj) + ":";
    for(ea in obj) { 
        if (!Object.isFunction(obj[ea]))
            s += " " + ea + ":" + String(obj[ea]) + "\n"
    };
    return s
};

Global.printObjectFull = function(obj) {
    var s = "{";
    for(ea in obj) { 
        s += " " + ea + ":" + String(obj[ea]) + ", \n"
    };
    return s + "}"
};

Global.logObject = function(obj) {
    console.log(printObject(obj))
};


Global.stringToXML = function(string) {
    return new DOMParser().parseFromString(string, "text/xml");
};

// Generator for an array
Global.range = function(begin, end) {
    result = [];
    for (var i = begin; i <= end; i++) {
        result.push(i);
    }
    return result;
};

// -------      ----------------

/*
 * HandPositionObserver, obsverse the position change of the hand and calls the function
 */
Object.subclass('HandPositionObserver', {

    initialize: function(func, hand) {
        this.hand = hand || WorldMorph.current().hands.first();
        this.func = func;
        return this;
    },

    onGlobalPositionUpdate: function(value) {
        if (this.func)
        this.func.call(this, value)
    },

    start: function() {
        this.hand.formalModel.addObserver(this);
    },

    stop: function() {
        this.hand.formalModel.removeObserver(this);
    },
});

Morph.subclass('lively.Helper.ToolDock', {
    
    initialize: function($super, bounds) {
        $super(bounds || pt(10,100).extentAsRectangle());
        this.handObserver = null;
        this.showMode();
    },
    
    getWorld: function() {
        return WorldMorph.current();
    },
    
    activationArea: function() {
        var relativeActivationArea = new Rectangle(0.9,0,0.1,1);
        return this.getWorld().bounds().scaleByRect(relativeActivationArea);
    },
    
    showMode: function() {
        this.handObserver = new HandPositionObserver(function(point) {
            if (!this.activationArea().containsPoint(point)) return;
            this.getWorld().addMorph(this);
            this.setPosition(pt(this.getWorld().getExtent().x - this.getExtent().x, 0));
            this.handObserver.stop();
            this.hideMode();
        }.bind(this));
        this.handObserver.start();
    },
    
    appear: function() {
        
    },
    
    hideMode: function() {
        this.handObserver = new HandPositionObserver(function(point) {
            if (this.activationArea().containsPoint(point)) return;
            this.owner && this.remove();
            this.handObserver.stop();
            this.showMode();
        }.bind(this));
        this.handObserver.start();
    },
    
    handlesMouseDown: function() {
        return true;
    }    
});

console.log('Helper.js is loaded');

});