package org.mozilla.javascript;

import com.sun.javafx.runtime.*;
import com.sun.javafx.runtime.sequence.*;
import com.sun.javafx.runtime.location.*;
import java.util.*;
import java.lang.reflect.*;

// hacked from NativeJavaPackage to return instances of self
// main difference is that it instantiates NativeJavaFXClass objects.
public class NativeJavaFXPackage extends ScriptableObject {
    
    NativeJavaFXPackage(boolean internalUsage, String packageName, ClassLoader classLoader) {
	this.packageName = packageName;
	this.classLoader = classLoader;
    }
    
    public String getClassName() {
	return "JavaFXPackage";
    }
    
    public boolean has(String id, Scriptable start) {
	return true; 
    }
    
    public boolean has(int index, Scriptable start) {
	return false;
    }
    
    public void put(String id, Scriptable start, Object value) {
        // Can't add properties to Java packages.  Sorry.
    }
    
    public void put(int index, Scriptable start, Object value) {
	throw new RuntimeException();
    }
    
    public Object get(String id, Scriptable start) {
	return getPkgProperty(id, start, true);
    }
    
    public Object get(int index, Scriptable start) {
	return NOT_FOUND;
    }
    
    // set up a name which is known to be a package so we don't
    // need to look for a class by that name
    void forcePackage(String name, Scriptable scope) {
	NativeJavaFXPackage pkg;
	int end = name.indexOf('.');
	if (end == -1) {
	    end = name.length();
	}
	
	String id = name.substring(0, end);
	Object cached = super.get(id, this);
	if (cached != null && cached instanceof NativeJavaFXPackage) {
	    pkg = (NativeJavaFXPackage) cached;
	} else {
	    String newPackage = packageName.length() == 0
		? id
		: packageName + "." + id;
	    pkg = new NativeJavaFXPackage(true, newPackage, classLoader);
	    ScriptRuntime.setObjectProtoAndParent(pkg, scope);
	    super.put(id, this, pkg);
	}
	if (end < name.length()) {
	    pkg.forcePackage(name.substring(end+1), scope);
	}
    }
    
    synchronized Object getPkgProperty(String name, Scriptable start, boolean createPkg) {
        Object cached = super.get(name, start);
        if (cached != NOT_FOUND)
            return cached;
	
        String className = (packageName.length() == 0)
                               ? name : packageName + '.' + name;
        Context cx = Context.getContext();
        ClassShutter shutter = cx.getClassShutter();
        Scriptable newValue = null;
        if (shutter == null || shutter.visibleToScripts(className)) {
            Class cl = null;
            if (classLoader != null) {
                cl = Kit.classOrNull(classLoader, className);
            } else {
                cl = Kit.classOrNull(className);
            }
            if (cl != null) {
                newValue = new NativeJavaFXClass(getTopLevelScope(this), cl);
                newValue.setPrototype(getPrototype());
            }
        }
        if (newValue == null && createPkg) {
            NativeJavaFXPackage pkg;
            pkg = new NativeJavaFXPackage(true, className, classLoader);
            ScriptRuntime.setObjectProtoAndParent(pkg, getParentScope());
            newValue = pkg;
        }
        if (newValue != null) {
            // Make it available for fast lookup and sharing of
            // lazily-reflected constructors and static members.
            super.put(name, start, newValue);
        }
        return newValue;
    }
    
    public Object getDefaultValue(Class ignored) {
	return toString();
    }
    
    public String toString() {
	return "[JavaFXPackage " + packageName + "]";
    }
    
    public boolean equals(Object obj) {
	if(obj instanceof NativeJavaFXPackage) {
	    NativeJavaFXPackage njp = (NativeJavaFXPackage)obj;
	    return packageName.equals(njp.packageName) && classLoader == njp.classLoader;
	}
	return false;
    }
    
    public int hashCode() {
	return packageName.hashCode() ^ (classLoader == null ? 0 : classLoader.hashCode());
    }
    
    private String packageName;
    private ClassLoader classLoader;
}

