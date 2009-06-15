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


    public static NativeJavaFXPackage FX = new NativeJavaFXPackage(true, "javafx", null);
 
    private boolean isInited = false;

    public Object wrap(Context cx, Scriptable scope, Object obj, Class staticType) {
	if (!isInited) {
	    try {
		Scriptable topScope = ScriptableObject.getTopLevelScope(scope);
		if (topScope != scope) System.err.println("different!");
		ScriptableObject.defineClass(topScope, NativeJavaFXSequence.class, false, true);
		ScriptableObject.defineClass(topScope, FXRuntime.class, false, true);
		// FIXME!
		FX.setParentScope(topScope);
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
		Scriptable proto = ScriptableObject.getClassPrototype(scope, NativeJavaFXSequence.JS_NAME);
		NativeJavaFXSequence seq = new NativeJavaFXSequence(scope, proto);
		seq.variable = (SequenceVariable)obj;
		return super.wrap(cx, scope, seq, staticType);
	    }
	}
	//System.err.println("wrapping " + obj);
	return super.wrap(cx, scope, obj, staticType);
    }
}