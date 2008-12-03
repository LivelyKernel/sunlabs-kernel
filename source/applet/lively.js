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

run();