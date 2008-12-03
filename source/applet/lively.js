function print(string) {
    Packages.java.lang.System.err.println(string);
}

    

var window = this;
window.load = function load(arg) { applet.load(arg); }

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

    load('kernel/rhino-compat.js');
    
    load('kernel/JSON.js');
    load('kernel/miniprototype.js'); 
    load('kernel/defaultconfig.js');
    
    Config.useTransformAPI = false;
    Config.useGetTransformToElement = false;
    Config.logDnD = true;
    //Config.fakeFontMetrics = false;
    //Config.fontMetricsFromSVG = true;
    load('kernel/Base.js');
    
    load('fx/dom/mico.js');
    load('fx/dom/dom2-core.js');
    load('fx/dom/dom2-events.js');
    load('fx/dom/dom2-html.js');
    load('fx/dom/svg1.1.js');
    print('loaded DOM implementation in JS');
    
}

run();