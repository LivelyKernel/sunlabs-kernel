/*
 * Copyright © 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 


var window = this;
window.parent = window;

window.console = { 
    log: function() { 
        var msg = "";
	for (var i = 0; i < arguments.length; i++) 
	    msg += String(arguments[i]);
        Packages.java.lang.System.err.println(msg);
    }
};

window.navigator = { 
    userAgent: "Rhino" ,
    appVersion: "",
    language: "en"

};
window.alert = print;
window.document = {
    getElementsByTagName: function() { return []},
    execCommand: function() {}
};


 function liveconnect() {
     var jsobj = Packages.netscape.javascript.JSObject;
     var platformApplet = applet.getPlatformApplet();
     //print('platform applet is ', platformApplet);
     var win = jsobj.getWindow(platformApplet);
     var doc = win.getMember("document");
     var body = doc.getMember("body");
     print('got window ' + win +  ' document: ' + doc);
     print(body.call("insertBefore", [doc.call("createTextNode", ["Java applet running Rhino wrote this to the browser's DOM!"]), body.getMember("firstChild")]));
//     win.call("alert", ["JS4JFX called me!"]);
     var console = win.getMember('console');
     if (console) {
	 window.print = window.console.log = function() {
	     console.call("log", Array.slice(arguments));
	 }
     }
     
 }
 if (this.applet)
     liveconnect();


