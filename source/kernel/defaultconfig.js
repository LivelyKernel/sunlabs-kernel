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
    var fireFoxVersion = window.navigator && window.navigator.userAgent.split("Firefox/")[1]; // may be undefined

    // Determines User Agent capabilities
    return {
        // Newer versions of WebKit implement proper SVGTransform API,
        // with potentially better performance. Scratch that, let's make it more predictable:
        usableTransformAPI: false, //(webKitVersion < 0), //webKitVersion >= 525,
        usableDropShadow: webKitVersion >= 525,
        canExtendBrowserObjects: !isRhino, // Error, document
        usableOwnerSVGElement: !isRhino && !isMozilla,

        // WebKit XMLSerializer seems to do weird things with namespaces
        usableNamespacesInSerializer: false, //webKitVersion <= 0,

        usableXmlHttpRequest: !isRhino,

        usableHTMLEnvironment: !isRhino,

        webKitVersion: webKitVersion,
	
        isRhino: isRhino,
	
        isMozilla: isMozilla,

	fireFoxVersion: fireFoxVersion ? fireFoxVersion.split('.') : null, 
	
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
    showCurveExample: false,
    showGridDemo: false,
    
    // Additional demo configuration options 
    showThumbnail: false,
    suppressBalloonHelp: false,
    usePieMenus: false,
    
    // Enables/disables network-dependent demos
    showNetworkExamples: UserAgent.usableXmlHttpRequest,

    // Ignore function logging through the prototype.js wrap mechanism
    // rhino will give more useful exception info 
    ignoreAdvice: UserAgent.isRhino,

    // Derive font metrics from (X)HTML
    fontMetricsFromHTML: UserAgent.usableHTMLEnvironment,

    // Derive font metrics from SVG
    fontMetricsFromSVG: false,

    // Try to make up font metrics entirely (can be overriden to use the native SVG API, which rarely works)
    fakeFontMetrics: !UserAgent.usableHTMLEnvironment,

    // Use the browser's affine transforms
    useTransformAPI: UserAgent.usableTransformAPI, 

    // Firefox 2 has known problems with getTransformToElement, detect it
    useGetTransformToElement: !(UserAgent.fireFoxVersion && UserAgent.fireFoxVersion[0] == '2'),

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
    showGrabHalo: false,
    useShadowMorphs: true,

    // load serialized worlds instead of building them from Javascript
    loadSerializedSubworlds: true,

    // where the local web server runs
    // FIXME: parse /trunk/source/server/brazil.config to figure out the port?
    personalServerPort: 8081,

    // the delay set on the main() function
    mainDelay: 0.05,

    // whether the .style property should be used
    useStyling: false,

    verboseImport: false,

    // some widgets self connect to a private model on startup, but it doesn't
    // seem necessary, turn on to override
    selfConnect: false,
    suppressClipboardHack: false
    
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
    showClipMorph: function() { return !Config.skipMostExamples},
    show3DLogo: function() { return !Config.skipMostExamples},
    showAsteroids: function() { return !Config.skipMostExamples},
    showEngine: function() { return !Config.skipMostExamples},
    showIcon: function() { return !Config.skipMostExamples},
    showWeather: function() { return !Config.skipMostExamples},
    showStocks: function() { return !Config.skipMostExamples},
    showCanvasScape: function() { return !Config.skipMostExamples},
    showRSSReader: function() { return !Config.skipMostExamples},
    showSquiggle: function() { return !Config.skipMostExamples},
    showWebStore: function() { return !Config.skipMostExamples || Config.browserAnyway},
    showVideo: function() { return !Config.skipMostExamples},
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

Config.showTesterRunner = false;
Config.showFabrikComponentBox = false;
Config.showFahrenheitCelsiusExample = false;
Config.showTextListExample = false;
Config.openFabrikBrowserExample = false;
Config.showWikiNavigator = true;

Config.alignToGridSpace = 10; // determins the pixels to snap to during shift dragging with mouse
Config.ballonHelpDelay = 1000; // Default

Config.loadTests = [] //  e.g. ["FabrikTest", "RecordTest", "TestFrameworkTests", "ClassTest", "LKWikiTest", "DevelopTest", "MorphTest"]

Config.modulesOnWorldLoad = ["Fabrik.js", 'TileScripting.js']
