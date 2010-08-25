Config.proxyURL = document.location.protocol + '//' + document.location.host + '/proxy';
Config.wikiRepoUrl = document.location.protocol + '//' + document.location.host + '/repository/webwerkstatt';
//Config.showRichText = true;

Config.debugExtras = false;

//Config.skipMostExamples = true;

Config.skipGuiTests = true;
//Config.showTester = false;

//Config.showInnerWorld = false;
//Config.loadSerializedSubworlds = false;

// Config.showLivelyConsole = true;

//Config.showTesterRunnerForDevelopment = true;
//Config.originalClock = true;

// Config.openFabrikBrowserExample = true;
// Config.showFahrenheitCelsiusExample = true;

//Config.showClock = false;
//Config.showFabrik = false;
//Config.showSlideWorld = false;
//Config.showDeveloperWorld = false;

Config.showFabrikWeatherWidgetExample = false;
// Config.showFabrikWebRequestExample = true;
// Config.showFabrikComponentBox = true;

// Config.activateTileScripting = true;
// Config.highlightSyntax = true;
// Config.usePieMenus = false;

Config.askBeforeQuit = false;

//Config.loadTests = ['CoreTest', 'ModuleSystemTests', 'TestFrameworkTests', 'ClassTest', 
//	'SerializationTests', 'FabrikTest',  'MorphTest', 
//	'TileScriptingTests', 'OmetaTest', 'ToolsTests',
//	'PresentationTests'];

// Config.showGrabHalo= true;

// 'OmetaTest', 'ToolsTests',

//Config.loadTests = ['SerializationTests'];
// Config.showWikiNavigator = false;

// Config.modulesOnWorldLoad = Config.modulesOnWorldLoad.concat(["cop/Layers", "Tests/LayersTest"])

Config.modulesOnWorldLoad = Config.modulesOnWorldLoad.concat(["lively.Fabrik", "lively.Presentation", "cop.Layers", "cop.LayersTest", "lively.ide", "cop.Workspace", "lively.Graffle", "lively.Undo"])

//Config.modulesBeforeChanges.push('Helper.js');

Config.showNetworkExamples = true


Config.testInRealWorld = true

Config.confirmNavigation = false; 

Config.resizeScreenToWorldBounds = true;
 
Config.disableScriptCaching = true;

// Config.showWeather = function(){return true};

document.body.style.cursor = 'none';

Config.silentFailOnWrapperClassNotFound = true;

Config.modulesOnWorldLoad.push('lively.Styles');
Config.defaultDisplayTheme = 'hpi' // 'primitive', 'turquoise', 'hpi', 'lively'

Config.disableNoConsoleWarning = true;
Config.ignoreAdvice = true
