module('Helper.js').requires().toRun(function() {
     
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
}

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
}

Global.printObject = function(obj) {
    var s = String(obj) + ":";
    for(ea in obj) { 
        if (!Object.isFunction(obj[ea]))
            s += " " + ea + ":" + String(obj[ea]) + "\n"
    };
    return s
}

Global.printObjectFull = function(obj) {
    var s = "{";
    for(ea in obj) { 
        s += " " + ea + ":" + String(obj[ea]) + ", \n"
    };
    return s + "}"
}

Global.logObject = function(obj) {
    console.log(printObject(obj))
}


Global.stringToXML = function(string) {
    return new DOMParser().parseFromString(string, "text/xml");
}

// Generator for an array
Global.range = function(begin, end) {
    result = [];
    for (var i = begin; i <= end; i++) {
        result.push(i);
    }
    return result;
}


console.log('Helper.js is loaded');

});