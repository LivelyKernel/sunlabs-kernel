package org.mozilla.javascript;

import com.sun.javafx.runtime.*;
import com.sun.javafx.runtime.sequence.*;
import com.sun.javafx.runtime.location.*;
import java.util.*;
import java.lang.reflect.*;


public class NativeJavaFXClass extends NativeJavaObject implements Function {
    JavaFXMembers members;

    public NativeJavaFXClass(Scriptable scope, Class cl) {
        this.parent = scope;
        this.javaObject = cl;
	initMembers();
    }
    
    public void initMembers() {
	Class cl = this.getClassObject();
        this.members = JavaFXMembers.lookupClass(cl);
    }

    public Class getClassObject() {
        return (Class) super.unwrap();
    }

    public String getDefaultValue(Class hint) {
	return "[JavaFXClass " + getClassObject().getName() + "]";
    }
    
    public Object get(String name, Scriptable start) {
	if (name.equals("prototype"))
	    return null; // can we return something meaningful?
	// FIXME what is really the ABI? cf NativeJavaClass
	try {
	    Field field = this.getClassObject().getField("$"+ name);
	    return Context.javaToJS(field.get(this.getClassObject()), start);
	} catch (Exception e) { 
	    // now try without the $
	    try {
		Field field = this.getClassObject().getField(name);
		return Context.javaToJS(field.get(this.getClassObject()), start);
	    } catch (Exception e2) { 
		NativeJavaMethod method = (NativeJavaMethod)members.staticMethods.get(name);
		//System.err.println("static method " + method);
		if (method != null) return method;
	    }
	}
	return super.get(name, start);
    }
    
    public boolean hasInstance(Scriptable instance) {
	if (instance instanceof Wrapper) {
	    return this.getClassObject().isInstance(((Wrapper)instance).unwrap());
	}
	return false;
    }

    public Object call(Context cx, Scriptable scope, Scriptable thisObj, Object[] args) {
	return this.construct(cx, scope, args); // is this what we want?
    }

    public Scriptable construct(Context cx, Scriptable scope, Object[] args) {
	try {
	    FXObject object = (FXObject)this.getClassObject().getConstructor(boolean.class).newInstance(true);
	    
	    //FXObject object = (FXObject)clazz.newInstance();
	    object.addTriggers$();
	    //object.applyDefaults$();
	    
	    Scriptable wrapper = (Scriptable)Context.javaToJS(object, scope);
	    if (args.length > 1) throw new RuntimeException("too many args?");
	    if (args.length == 1) {

		final int count = object.count$();
		final short[] initmap = FXBase.makeInitMap$(count); // FIXME
		for (int i = 0; i < count; i++) {
		    object.applyDefaults$(i);
		    // object.loc$(i); // FIXME do the right thing, get the fields from initlist
		}
		
		Scriptable initlist = (Scriptable)args[0];
		// clearly wrong, either apply defaults or initialize here
		for (Object id : initlist.getIds()) { // FIXME error checking and such
		    String name = (String)id;
		    wrapper.put(name, scope, initlist.get(name, scope));
		}
	    }
	    object.complete$();
	    return wrapper;
	} catch (Exception e) {
	    throw new RuntimeException(e);
	}
    }
    
}
