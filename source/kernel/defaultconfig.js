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
 *
 *  Note that if a file localconfig.js can be found, it will be read
 *  immediately after this one, thus allowing any of these settings
 *  to be overridden.
 */

var UserAgent = (function() {

    var webKitVersion = (function() {
        if (!window.navigator) return 0;
        var match = navigator.userAgent.match(/.*AppleWebKit\/(\d+).*/) 
        return match ? parseInt(match[1]) : 0;
    })();

    var isRhino = !window.navigator || window.navigator.userAgent.indexOf("Rhino") > -1;
    var isMozilla = window.navigator && window.navigator.userAgent.indexOf("Mozilla") > -1;

    // Determines User Agent capabilities
    return {
        // Newer versions of WebKit implement proper SVGTransform API,
        // with potentially better performance
        usableTransformAPI: webKitVersion >= 525,
        usableDropShadow: webKitVersion >= 525,
        canExtendBrowserObjects: !isRhino, // Error, document
        usableOwnerSVGElement: !isRhino && !isMozilla,

        // WebKit XMLSerializer seems to do weird things with namespaces
        usableNamespacesInSerializer: webKitVersion < 0,

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
    
    // URL that acts as a proxy for network operations 
    proxyURL: null,

    // Quickly enable/disable most demos
    skipMostExamples: false,
    skipAllExamples:  false,
    showWebStore: false,
    showCurveExample: false,
    showGridDemo: false,
    
    // Additional demo configuration options 
    showThumbnail: false,
    
    // Enables/disables network-dependent demos
    showNetworkExamples: UserAgent.usableXmlHttpRequest,

    // Ignore function logging through the prototype.js wrap mechanism
    // rhino will give more useful exception info 
    ignoreAdvice: UserAgent.isRhino,

    // Derive font metrics from (X)HTML
    fontMetricsFromHTML: UserAgent.usableHTMLEnvironment,

    // Try to make up font metrics entirely (can be overriden to use the native SVG API, which rarely works)
    fakeFontMetrics: !UserAgent.usableHTMLEnvironment,

    // Use the browser's affine transforms
    useTransformAPI: UserAgent.usableTransformAPI, 
    useGetTransformToElement: true,

    // Enable drop shadows for objects (does not work well in most browsers)
    useDropShadow: UserAgent.usableDropShadow,

    // We haven't decided on the behavior yet, but let's be brave!
    // This option suspends all the scripts in a world as soon as
    // the user moves to another world.  This should really be a
    // world-specific option.
    suspendScriptsOnWorldExit: true,

    // Open up our console
    showLivelyConsole: false,

    // Disable caching of webstore requests
    suppressWebStoreCaching: false,

    // Defeat bundled type-in for better response in short strings
    showMostTyping: true,

    // Defeat all bundled type-in for testing
    showAllTyping: true,  // Until we're confident

    // Use the meta modifier (maps to Command on the Mac) instead of alt
    useMetaAsCommand: false,

    // Confirm system shutdown from the user
    askBeforeQuit: true,
    
    // Enable advanced debugging options
    debugExtras: false,

    // enable grab halo (alternative to shadow) on objects in the hand.
    showGrabHalo: true,

    // load serialized worlds instead of building them from Javascript
    loadSerializedSubworlds: true
}

// These various overrides of the above have been moved here from main.js
//	so that they can be overridden in localconfig.js
//	at some point we should refactor this file nicely.
Config.showClock = true;
Config.showStar = true;
Config.showHilbertFun = true;
Config.showPenScript = true;
Config.showTester = true;
Config.showBitmap = false;
Config.showMap = !Config.skipMostExamples;
Config.showSampleMorphs = true;
Config.showTextSamples = true;
// Config.random is used as the ID for the messenger morph for each user
Config.random = Math.round(Math.random()*2147483647);

// More complex demos
Object.extend(Config, {
    showClipMorph: !Config.skipMostExamples,
    show3DLogo: !Config.skipMostExamples,
    showAsteroids: !Config.skipMostExamples,
    showEngine: !Config.skipMostExamples,
    showIcon: !Config.skipMostExamples,
    showWeather: !Config.skipMostExamples,
    showStocks: !Config.skipMostExamples,
    showCanvasScape: !Config.skipMostExamples,
    showRSSReader: !Config.skipMostExamples,
    showSquiggle: !Config.skipMostExamples,
    showWebStore: !Config.skipMostExamples || Config.browserAnyway,
    showVideo: !Config.skipMostExamples,
    // Worlds
    showInnerWorld: true, //!Config.skipMostExamples;
    showSlideWorld: true, //!Config.skipMostExamples;
    showDeveloperWorld: true //!Config.skipMostExamples;
});


//	*** Minimal World Only ***
//  In spite of all the foregoing complexity, merely changing this conditional
//	to true will bypass all examples and worlds, and only create a few
//	simple morphs in a simple world.
//
//	If you copy these lines to localconfig.js you won't need
//	to alter any of the supplied Lively Kernel files.
if (false) {
    Config.showInnerWorld = false;
    Config.showDeveloperWorld = false;
    Config.showSlideWorld = false;
    Config.showOnlySimpleMorphs = true;
    Config.showStar = false;  // true to show star
    Config.spinningStar = false;  // true to enable spinning
}
