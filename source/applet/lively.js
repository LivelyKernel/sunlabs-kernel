function print(string) {
    Packages.java.lang.System.err.println(string);
}


var fx = {
    Panel: Packages.com.sun.scenario.scenegraph.JSGPanel,
    Group: Packages.com.sun.scenario.scenegraph.SGGroup,
    Parent: Packages.com.sun.scenario.scenegraph.SGFilter, // an intermediate node with one child
    Text: Packages.com.sun.scenario.scenegraph.SGText,
    Component: Packages.com.sun.scenario.scenegraph.SGComponent,
    Shape: Packages.com.sun.scenario.scenegraph.SGShape,
    Transform: Packages.com.sun.scenario.scenegraph.SGTransform,
    Clip:  Packages.com.sun.scenario.scenegraph.SGClip,
    Image: Packages.com.sun.scenario.scenegraph.SGImage,
    ShapeMode: Packages.com.sun.scenario.scenegraph.SGAbstractShape$Mode,
    Ellipse: Packages.java.awt.geom.Ellipse2D.Double,
    Point: Packages.java.awt.geom.Point2D.Double,
    RoundedRectangle: Packages.java.awt.geom.RoundRectangle2D.Double,
    Rectangle: Packages.com.sun.scenario.scenegraph.SGRectangle,
    Font: Packages.java.awt.Font,
    Path: Packages.java.awt.geom.GeneralPath,
    Color: Packages.java.awt.Color,
    LinearGradient: Packages.java.awt.LinearGradientPaint,
    RadialGradient: Packages.java.awt.RadialGradientPaint,
    Timer: Packages.javax.swing.Timer,
};

    //var frame = new Packages.javax.swing.JFrame();
    var width = 500;
    var height = 300;
    print('applet is ' + applet + ' in ' + this);
    
    var panel = new Packages.com.sun.scenario.scenegraph.JSGPanel();
    panel.setBackground(fx.Color.blue);
    panel.setPreferredSize(new Packages.java.awt.Dimension(width, height));
    
    var scene = new fx.Group();
    panel.setScene(scene);
    
    var rect = new fx.Rectangle();
    rect.setX(10);
    rect.setY(50);
    
    rect.setWidth(100);
    rect.setHeight(100);
    scene.add(rect);
    
    //content.add(panel);
    //content.pack();
    //content.setVisible(true);
    applet.setContentPane(panel);
    
    //	print('success ');
    var window = this;
    this.load = function load(arg) { applet.load(arg)}
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
    
