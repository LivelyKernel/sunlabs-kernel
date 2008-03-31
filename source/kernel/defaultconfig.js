/*
 * Copyright � 2006-2008 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

/**
 * defaultconfig.js.  System default configuration.
 */

var UserAgent = (function() {

    var webKitVersion = function() {
        if (!window.navigator) return null;
        var match = navigator.userAgent.match(/.*AppleWebKit\/(\d+).*/) 
        return match && match[1];
    };

    var isRhino = !window.navigator || window.navigator.userAgent.indexOf("Rhino") > -1;
    var isMozilla = window.navigator && window.navigator.userAgent.indexOf("Mozilla") > -1;

    // determines UA capabilities
    return {
        // newer versions of WebKit implement proper SVGTransform API, potentially better performance
        usableTransformAPI: parseInt(webKitVersion) >= 525,
        usableDropShadow: parseInt(webKitVersion) >= 525,
        canExtendBrowserObjects: !isRhino, // Error, document
        usableNearestViewportElement: !isRhino && !isMozilla,
        // Safari XMLSerializer seems to do weird things w/namespaces
        usableNamespacesInSerializer: !webKitVersion,

        usableXmlHttpRequest: !isRhino,

        usableHTMLEnvironment: !isRhino,

        webKitVersion: webKitVersion,

        isRhino: isRhino,

        isMozilla: isMozilla,

        isWindows: (window.navigator && window.navigator.platform == "Win32")
    };

})();


// Determines runtime behavior based on UA capabilities and user choices (override in localconfig.js)
var Config = {

    // Allows easy object duplication using the Shift key
    shiftDragForDup: true,
    
    // New scheduler is the default now
    useNewScheduler: true,
    
    // URL that acts as a proxy for network operations 
    proxyURL: null,

    // Quickly enabling/disabling most demos
    skipMostExamples: false,
    skipAllExamples:  false,
    showWebStore: false,
    showCurveExample: false,
    
    // Additional demo configuration options 
    showThumbnail: false,
    
    // Enables/disables network-dependent demos
    showNetworkExamples: UserAgent.usableXmlHttpRequest,

    // Ignore function logging through the prototype.js wrap mechanism
    // rhino will give more useful exception info 
    ignoreAdvice: UserAgent.isRhino,

    // derive font metrics from (X)HTML
    fontMetricsFromHTML: UserAgent.usableHTMLEnvironment,

    // try to make up font metrics entirely (can be overriden to use the native SVG API, which rarely works)
    fakeFontMetrics: !UserAgent.usableHTMLEnvironment,

    useTransformAPI: UserAgent.usableTransformAPI, 
    
    useDropShadow: UserAgent.usableDropShadow,

    useGetTransformToElement: true,

    // We haven't decided on the behavior yet, but let's be brave!
    // This option suspends all the scripts in a world as soon as
    // the user moves to another world.  This should really be a
    // world-specific option.
    suspendScriptsOnWorldExit: true,

    // open up our console
    showLivelyConsole: false,

    // disable caching of webstore requests
    suppressWebStoreCaching: false,

    // Defeat bundled type-in for better response in short strings
    showMostTyping: true,
    // Defeat all bundled type-in for testing
    showAllTyping: true,  // Until we're confident

    // use the meta modifier (maps to Command on the Mac) instead of alt
    useMetaAsCommand: false,

    
    askBeforeQuit: true
    

}

