/*
 * Copyright © 2006-2007 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

var navigator = {
    userAgent: "Gecko;Rhino"
};

window.parent = window;

window.console = { 

    log: function() { 
        for (var i = 0; i < arguments.length; i++) {
            System.err.print(arguments[i].toString());
        } 
        System.err.println();
    },

    assert: function(expr, msg) {
        if (!expr) this.log("assert failed:" + msg);
    }

};

window.console.warn = window.console.log;

