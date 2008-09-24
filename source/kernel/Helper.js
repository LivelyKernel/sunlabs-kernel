
/*
 * Stack Viewer when Dans StackTracer is not available
 */


 
function getStack() {
    var result = [];
    for(var caller = arguments.callee.caller; caller; caller = caller.caller) {
        if (result.indexOf(caller) != -1) {
           result.push({name: "recursive call cant be traced"});
           break;
        }
        result.push(caller);
    };
    return result;  
};

function guessFunctionName(func) {
       if(func.qualifiedMethodName()) return func.qualifiedMethodName();
       var m = func.toString().match(/function (.+)\(/);
       if (m) return m[1];
       return func
};

function printStack() {  
    var string = "== Stack ==\n";
    var stack = getStack();
    stack.shift(); // for getStack
    stack.shift(); // for printStack (me)
    var indent = "";
    for(var i=0; i < stack.length; i++) {
        string += indent + i + ": " +guessFunctionName(stack[i]) + "\n";
        indent += " ";        
    };
    return string;
};

function logStack() {
    this.console.log(printStack())
};

function indentForDepth(depth) {
    var s=""
    for(var i=depth; i > 0; i--) s += " ";
    return s
};

function resetLogDepth() {
    MyLogDepth = 0;    
};
resetLogDepth();

function logCall(args, from, shift) {
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

function logCallHelper(from, methodName, args, indent) {
    s = indentForDepth(indent);
    s += String(from) + " ";
    s += methodName + "("
    args.each(function(ea){ s += ea + ", "});
    s += ")";
    return s
};


function logMethod(obj, methodName) {
    obj[methodName] = obj[methodName].wrap(function(proceed) {
        var args = $A(arguments); args.shift(); 
        MyLogDepth++;
        console.log(logCallHelper(this, methodName, args, MyLogDepth * 2))
        var result = proceed.apply(this, args);
        MyLogDepth--;
        return result
    })
}

function printObject(obj) {
    var s = String(obj) + ":";
    for(ea in obj) { 
        if (!Object.isFunction(obj[ea]))
            s += " " + ea + ":" + String(obj[ea]) + "\n"
    };
    return s
}

function printObjectFull(obj) {
    var s = "{";
    for(ea in obj) { 
        s += " " + ea + ":" + String(obj[ea]) + ", \n"
    };
    return s + "}"
}

function logObject(obj) {
    console.log(printObject(obj))
}


console.log('Helper.js loaded');