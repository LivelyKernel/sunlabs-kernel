function print(string) {
    Packages.java.lang.System.err.println(string);
}

    

var window = this;


function load(file) {
    var match = file.match('^\.\./kernel/(.*)');
    if (match) {
	print('tinkering with load ' + match[1]);
	return applet.load('kernel/' + match[1]);
    } 
    match = file.match('^dom/(.*)');
    if (match) {
	print('tinkering with load ' + match[1]);
	return applet.load('../fx/dom/' + match[1]);
    }
    print('tinkering with load ' + file);
    return applet.load("../fx/" + file);
}



function fxSceneGraphTest(panel) {

    var width = 500;
    var height = 300;

    panel.setBackground(Packages.java.awt.Color.blue);
    panel.setPreferredSize(new Packages.java.awt.Dimension(width, height));
    
    var scene = new Packages.com.sun.scenario.scenegraph.SGGroup();
    panel.setScene(scene);
    
    var rect = new Packages.com.sun.scenario.scenegraph.SGRectangle();
    rect.setX(10);
    rect.setY(50);
    
    rect.setWidth(100);
    rect.setHeight(100);
    scene.add(rect);


 }
    
function run() {
    //var frame = new Packages.javax.swing.JFrame();
    print('applet is ' + applet + ' in ' + window);
    var panel = new Packages.com.sun.scenario.scenegraph.JSGPanel();    

    applet.setContentPane(panel);
    fxSceneGraphTest(panel);
    applet.load('../fx/demo.js');
    applet.setContentPane(browser.panel);
    //    load('../fx/browser.js');
}

//run();

function run2() {
    print('applet is ' + applet + ' in ' + window);
    var panel = new Packages.com.sun.scenario.scenegraph.JSGPanel();    

    applet.setContentPane(panel);
    fxSceneGraphTest(panel);
    try{
	load('../kernel/rhino-compat.js');
	
	load('../kernel/lang.js');
	load('../kernel/JSON.js');
	load('../kernel/miniprototype.js'); 
	load('../kernel/defaultconfig.js');
	// our local config
	Config.useTransformAPI = false;
	Config.useGetTransformToElement = false;
	Config.logDnD = true;
	//Config.fakeFontMetrics = false;
	//Config.fontMetricsFromSVG = true;
	load('../kernel/Base.js');
	load('dom/mico.js');
	load('dom/dom2-core.js');
	load('dom/dom2-events.js');
	load('dom/dom2-html.js');
	//load('dom/svg1.1.js');
	window.location = {};
	load('dom/index.xhtml.js');
	
	load('../kernel/jquery.js');
	print('jquery loaded');
	print('jquery ' + $('body').size() +  ' keys ' + Object.keys($('body')));
	print('jquery ' + $('svg'));
	
    } catch (er) {
	print('problem with jquery ' + er);
    }
    //applet.load('../fx/demo.js');
    //applet.setContentPane(browser.panel);

}
    run2();