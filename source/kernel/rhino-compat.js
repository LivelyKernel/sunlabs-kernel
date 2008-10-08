/*
 * Copyright © 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

window.parent = window;

window.console = { 

    log: function(/*...*/) { 
        var msg = "";
	for (var i = 0; i < arguments.length; i++) 
	    msg += String(arguments[i]);
        Packages.java.lang.System.err.println(msg);
    }

};


