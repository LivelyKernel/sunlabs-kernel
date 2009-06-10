package org.mozilla.javascript;

import com.sun.javafx.runtime.*;
import com.sun.javafx.runtime.sequence.*;
import com.sun.javafx.runtime.location.*;
import java.util.*;
import java.lang.reflect.*;


public class FXWrapFactory extends WrapFactory {
    
    public static FXWrapFactory instance = new FXWrapFactory();

    public static class FXRuntime extends ScriptableObject {
	static String JS_NAME = "FXRuntime";

	public String getClassName() {
	    return JS_NAME;
	}
	public void jsConstructor() {
	}

	public FXRuntime() {
	}

	public FXRuntime(Scriptable scope, Scriptable prototype) {		
	    super(scope, prototype);
	}

	public static boolean jsStaticFunction_isFXObject(Scriptable object) {
	    return object instanceof NativeJavaFXObject; // or sequence?
	}
	

	public static void jsStaticFunction_observe(Scriptable object, String fieldName, final Function callback) {
	    if (object instanceof NativeJavaFXObject) {
		Object target = ((NativeJavaFXObject)object).unwrap();
		try {
		    Method locator = target.getClass().getMethod("loc$" + fieldName);
		    Object result = locator.invoke(target);
		    if (result instanceof ObjectVariable) {
			ObjectVariable variable = (ObjectVariable)result;
			System.err.println("will observe " + fieldName);
			final Scriptable scope = ScriptableObject.getTopLevelScope(object);
			ChangeListener<Object> listener = new ChangeListener<Object>() {
			    public void onChange(Object oldValue, Object newValue) {
				Context cx = Context.enter();
				cx.setWrapFactory(FXWrapFactory.instance);
				try {
				    callback.call(cx, scope, scope, new Object[] { Context.javaToJS(oldValue, scope), 
										   Context.javaToJS(newValue, scope) });
				} finally {
				    Context.exit();
				}
			    }
			};
			variable.addChangeListener(listener);
		    } else if (result instanceof FloatVariable) { // ewwwww!!!
			FloatVariable variable = (FloatVariable)result;
			System.err.println("will observe " + fieldName);
			final Scriptable scope = ScriptableObject.getTopLevelScope(object);
			ChangeListener<Float> listener = new ChangeListener<Float>() {
			    public void onChange(Float oldValue, Float newValue) {
				Context cx = Context.enter();
				cx.setWrapFactory(FXWrapFactory.instance);
				try {
				    callback.call(cx, scope, scope, new Object[] { Context.javaToJS(oldValue, scope), 
										   Context.javaToJS(newValue, scope) });
				} finally {
				    Context.exit();
				}
			    }
			};
			variable.addChangeListener(listener);
			

		    }
			//locatio
		} catch (Exception e) {
		    throw new RuntimeException(e);
		}
	    } else {
		System.err.println("no!");
	    }
	}
	
    }

    public static class ScriptableSequence extends ScriptableObject {
	SequenceVariable variable;
	
	static String JS_NAME = "FXSequence";
	public String getClassName() {
	    return JS_NAME;
	}
	
	public ScriptableSequence() {
	    variable = null;
	}

	public ScriptableSequence(Scriptable scope, Scriptable prototype) {		
	    super(scope, prototype);
	}

	public void jsConstructor() {
	    Sequence seq = Sequences.make(TypeInfo.Object, new Object[0], 0);
	    this.variable = SequenceVariable.make(TypeInfo.Object, seq);
	}
	
	public Object getDefaultValue() {
	    return this.toString();
	}
	
	public Object get(int index, Scriptable start) {
	    return Context.javaToJS(variable.get().get(index), start);
	}

	public void put(int index, Scriptable start, Object value) {
	    ObjectArraySequence seq = (ObjectArraySequence)variable.get();
	    variable.replaceSlice(index, index, 
				  Sequences.make(TypeInfo.Object, Context.jsToJava(value, Object.class)));
	}

	public int jsGet_length() {
	    return variable.get().size();
	}
	
	public Object jsFunction_get(int index) {
	    return variable.get().get(index);
	}

	public void jsFunction_insertAt(Object value, int index) {
	    ObjectArraySequence seq = (ObjectArraySequence)variable.get();
	    variable.replaceSlice(index, index, 
				  Sequences.make(TypeInfo.Object, Context.jsToJava(value, Object.class)));
	}

	public void jsFunction_push(Object value) {
	    ObjectArraySequence seq = (ObjectArraySequence)variable.get();
	    this.jsFunction_insertAt(value, seq.size());
	}
	
	public Object jsFunction_remove(int index) {
	    Object value = variable.get(index);
	    variable.deleteSlice(index, index + 1);
	    return value;
	}

	public int jsFunction_indexOf(Object value) {
	    return Sequences.<Object>indexOf(variable.get(), value);
	}

	public String jsFunction_toString() {
	    return variable.get().toString();
	}
    }

    // hacked JavaNativePackage from rhino
    public static class FXPackage extends ScriptableObject {
	
	FXPackage(String packageName, ClassLoader classLoader) {
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
	    FXPackage pkg;
	    int end = name.indexOf('.');
	    if (end == -1) {
		end = name.length();
	    }
	    
	    String id = name.substring(0, end);
	    Object cached = super.get(id, this);
	    if (cached != null && cached instanceof FXPackage) {
		pkg = (FXPackage) cached;
	    } else {
		String newPackage = packageName.length() == 0
		    ? id
		    : packageName + "." + id;
		pkg = new FXPackage(newPackage, classLoader);
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
	    String className = (packageName.length() == 0) ? name : packageName + '.' + name;
	    //Context cx = currentContext;
	    
	    //ClassShutter shutter = cx.getClassShutter();
	    Scriptable newValue;
	    try {
		newValue = new NativeJavaFXClass(getTopLevelScope(this), Class.forName(className));
		newValue.setPrototype(getPrototype());

	    } catch (Exception e) {
		//System.err.println("not found " + className);
		newValue = null;
	    }
	    
	    /*
	    if (shutter == null || shutter.visibleToScripts(className)) {
		Class cl = null;
		if (classLoader != null) {
		    cl = Kit.classOrNull(classLoader, className);
		} else {
		    cl = Kit.classOrNull(className);
		}
		if (cl != null) {
		    newValue = new FXConstructor(getTopLevelScope(this), cl);
		    newValue.setPrototype(getPrototype());
		}
		}*/
	    if (newValue == null && createPkg) {
		FXPackage pkg = new FXPackage(className, classLoader);
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
	    if(obj instanceof FXPackage) {
		FXPackage njp = (FXPackage)obj;
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

    public static FXPackage FX = new FXPackage("javafx", null);
 
    private boolean isInited = false;

    public Object wrap(Context cx, Scriptable scope, Object obj, Class staticType) {
	if (!isInited) {
	    try {
		ScriptableObject.defineClass(scope, ScriptableSequence.class, false, true);
		ScriptableObject.defineClass(scope, FXRuntime.class, false, true);
		// FIXME!
		FX.setParentScope(scope);
	    } catch (Exception e) {
		throw new RuntimeException(e);
	    }
	    isInited = true;
	}
	Class type = obj == null ? staticType : obj.getClass();
	if (type != null) {
	    if (FXObject.class.isAssignableFrom(type)) {
		//System.err.println("FX custom wrapping " + type);
		return new NativeJavaFXObject(scope, obj, type);
	    } else if (SequenceVariable.class.isAssignableFrom(type)) {
		//System.err.println("FX wrapping sequence " + type);
		Scriptable proto = ScriptableObject.getClassPrototype(scope, ScriptableSequence.JS_NAME);
		ScriptableSequence seq = new ScriptableSequence(scope, proto);
		seq.variable = (SequenceVariable)obj;
		return super.wrap(cx, scope, seq, staticType);
	    }
	}
	//System.err.println("wrapping " + obj);
	return super.wrap(cx, scope, obj, staticType);
    }
}