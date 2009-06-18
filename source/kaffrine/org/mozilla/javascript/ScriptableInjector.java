package org.mozilla.javascript; // for convenience

import java.lang.instrument.*;
import java.security.ProtectionDomain;
import org.objectweb.asm.*;
import java.util.*;


public class ScriptableInjector implements ClassFileTransformer {
    
    public ScriptableInjector() {
	super();
    }
    
    public byte[] transform(ClassLoader loader, String className, Class redefiningClass, 
			    ProtectionDomain domain, byte[] bytes) throws IllegalClassFormatException {

	if (className.startsWith("javafx/")) {
	    try {
		ClassReader reader = new ClassReader(bytes);
		List<String> ifaces = Arrays.asList(reader.getInterfaces());
		if (ifaces.contains("com/sun/javafx/runtime/FXObject")) {
		    System.out.println("Transformer to Transform Class: " + reader.getClassName() + " ifaces " + ifaces);
		} else {
		    if (ifaces.size() > 0)
			System.out.println("Got " + ifaces);
		}
	    } catch (Throwable t) {
		t.printStackTrace();
	    }
	}
	return bytes;
    }
}