import java.applet.*;
import javax.script.*;
import java.util.*;
import java.io.*;
import java.net.*;
import java.security.*;
import java.awt.Graphics;
import org.mozilla.javascript.*;
import javax.swing.JApplet;



public class JavaScriptRunner extends JApplet {
    
    Scriptable topContext;

    static class BrowserContextFactory extends ContextFactory {
	public BrowserContextFactory(int optlevel) {
	    this.optlevel = optlevel;
	}
	private int optlevel; 
	@Override protected Context makeContext() {
	    Context ctx = super.makeContext();
	    ctx.setOptimizationLevel(this.getOptlevel());
	    return ctx;
	}
	public int getOptlevel() {
	    return optlevel;
	}
	public void setOptlevel(int optlevel) {
	    this.optlevel = optlevel;
	}
	
    }
    
    static {
	ContextFactory.initGlobal(new BrowserContextFactory(-1));
    }

    private Object eval(Reader reader, Scriptable scope, String filename)
	throws IOException {
	Context cx = Context.enter();
	try {
	    return cx.evaluateReader(scope, reader, filename, 1, null);
	} finally {
	    Context.exit();
	}
    }
    
    public Object runScript(Reader reader, String desc, Scriptable scope)
	throws IOException {
	return eval(reader, scope, desc == null ? "<unknown>" : desc);
    }

    Object loadFile(String uri, Scriptable scope)
	throws IOException, URISyntaxException {
	// the file is relative to the file currently being loaded.
	InputStream is = JavaScriptRunner.class.getClassLoader().getResourceAsStream(uri);
	if (is == null) throw new RuntimeException("did not find resource for " + uri);
	try {
	    return runScript(new InputStreamReader(is), uri.toString(), scope);
	} catch (AccessControlException e) {
	    Context ctx = Context.enter();
	    try {
		System.err.println("opt level " + ctx.getOptimizationLevel());
	    } finally {
		Context.exit();
	    }
	    throw e;
	}
    }
    
    public void load(String uri) throws IOException, URISyntaxException {
	this.loadFile(uri, topContext);
    }

    public void init() {
	Context cx = Context.enter();
	try {
	    topContext = cx.initStandardObjects();
	    ScriptableObject.putProperty(topContext, "applet", Context.toObject(this,  topContext));
	    this.loadFile("lively.js", topContext);
	} catch (Throwable t) {
	    //addItem("problem " + t);
	    t.printStackTrace(System.err);
	} finally {
	    Context.exit();
	}
    }

    public void start() {
        //addItem("starting... ");
    }

    public void stop() {
        //addItem("stopping... ");
    }

    public void destroy() {
        //addItem("preparing for unloading...");
    }


}