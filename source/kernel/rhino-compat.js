var navigator = {
    userAgent: "Gecko;Rhino"
};

window.parent = window;

window.console = { 
    log: function() { 
	for (var i = 0; i < arguments.length; i++)
	    System.err.print(arguments[i].toString()); 
	System.err.println();
    },
    assert: function(expr, msg) {
	if (!expr) this.log("assert failed:" + msg);
    }
}


window.console.warn = window.console.log;
