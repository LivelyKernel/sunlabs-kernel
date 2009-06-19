package org.mozilla.javascript;

import com.sun.javafx.runtime.*;
import com.sun.javafx.runtime.sequence.*;
import com.sun.javafx.runtime.location.*;
import java.util.*;
import java.lang.reflect.*;

// this should be rewritten to be the parent of FXBase
public class ScriptableFXBase implements Scriptable, Wrapper {

    //Scriptable parent; // ellide parent scope and share, what about thread safety?
    JavaFXMembers memberInfo;
    private Map<String, Function> functionCache = new HashMap<String, Function>(); // FIXME lazy?
    
    public ScriptableFXBase() {
	this(null);
    }
    
    public ScriptableFXBase(Class typeHint) {
	initMembers(typeHint);
    }
    
    public Object unwrap() {
	return this; // FIXME cheating here
    }
    void initMembers(Class typeHint) {
	if (typeHint == null) {
	    typeHint = this.receiver().getClass();
	}
        this.memberInfo = JavaFXMembers.lookupClass(this.getParentScope(), typeHint);
        //this.fieldAndMethods = members.getFieldAndMethodsObjects(this, javaObject, false);
    }

    public boolean hasInstance(Scriptable value) {
	// This is an instance of a Java class, so always return false
	return false;
    }
    
    public Object getDefaultValue(Class hint) {
	//return "FXObject";
	return this.toString();
    }
    
    public Scriptable getParentScope() {
	return FXWrapFactory.instance.topScope;
	//return parent;
    }
    
    public void setParentScope(Scriptable m) {
	System.err.println("setting scope has no effect");
	//parent = m;
    }
    
    public Scriptable getPrototype() {
	return null;
    }
    
    public void setPrototype(Scriptable m) {
	System.err.println("no effect setting prototype in " + this.getClassName());
    }
    
    public void delete(String name) {
    }
    
    public void delete(int index) {
    }
    
    public boolean has(int index, Scriptable start) {
	throw new RuntimeException();
    }

    public void put(int index, Scriptable start, Object value) {
	throw new RuntimeException();
    }
    
    public boolean has(String name, Scriptable start) {
	return this.memberInfo.getters.containsKey(name) || this.memberInfo.instanceMethods.containsKey(name);
    }
    
    public Object[] getIds() {
	// FIXME efficiency
	return this.memberInfo.getIds();
    }
    
    public String getClassName() {
	return "FXObject";
    }

    Object receiver() {
	return this;
    }
    
    Object doGet(String name) throws Exception {
	Method getter = this.memberInfo.getterFor(name);
	if (getter != null) {
	    return getter.invoke(this.receiver());
	} else {
	    Method locator = this.memberInfo.locatorFor(name);
	    if (locator != null) {
		ObjectLocation location = (ObjectLocation)locator.invoke(this.receiver());
		if (SequenceVariable.class.isAssignableFrom(locator.getReturnType())) {
		    return location; // hocus pocus, for sequences, it's the locations not values that are wrapped
		} else {
		    return location.get(); 
		}
	    }  else {
		return Scriptable.NOT_FOUND; // FIXME
	    }
	}
    }
    
    void doSet(String name, Object value) throws Exception {
	Method setter = this.memberInfo.setterFor(name);
	if (setter != null) {
	    setter.invoke(this.receiver(), value);
	} else {
	    Method locator = this.memberInfo.locatorFor(name);
	    if (locator != null) {
		ObjectLocation location = (ObjectLocation)locator.invoke(this.receiver());
		try {
		    location.set(value);
		} catch (RuntimeException e) {
		    System.err.println("value " + value + " location " + location);
		    throw e;
		}
	    } 
	}
    }
     
    static Sequence sequenceFromArray(NativeArray array, Scriptable scope) {
	int length = (int)array.getLength();
	Object[] fxarray = new Object[length];
	TypeInfo type = TypeInfo.Object; // unless otherwise
	for (int i = 0; i < length; i++) {
	    Object element = array.get(i, scope);
	    if (element instanceof Number) {
		// FIXME this guesses the type based on a single non-wrapper
		type = TypeInfo.Float;
	    } else if (element instanceof Wrapper) {
		element = ((Wrapper)element).unwrap();
	    }
	    fxarray[i] = element;
	}
	return Sequences.make(type, fxarray, length);
    }

    public Object get(String name, Scriptable start) {
	// imagine this as a big compiler-generated switch on perfectHash(name)
	try {
	    Object value = this.doGet(name);
	    if (value instanceof com.sun.javafx.functions.Function) {
		value = this.functionCache.get(name);
	    }
	    
	    if (value != Scriptable.NOT_FOUND) {
		//System.err.println("GET " + name);
		return Context.javaToJS(value, start); // FIXME start?
	    } else {
		//System.err.println("trying method " + name);
		return Context.javaToJS(this.memberInfo.instanceMethods.get(name), start);
	    }
	} catch (Exception e) { 
	    System.err.println("not found getter " + name);
	    e.printStackTrace();
	    return Context.getUndefinedValue();
	}
    }
    
    public Object get(int index, Scriptable start) {
	return Scriptable.NOT_FOUND;
    }
    
    static com.sun.javafx.functions.Function makeFunction(final Function fun, Class targetClass, final Scriptable scope) {
	if (targetClass == com.sun.javafx.functions.Function0.class) {
	    // FIXME pick the right function?
	    return new com.sun.javafx.functions.Function0<Object>() {
		public Object invoke() {
		    return ContextFactory.getGlobal().call(new ContextAction() {
			    public Object run(Context cx) {
				cx.setWrapFactory(FXWrapFactory.instance);
				return fun.call(cx, scope, scope, new Object[0]);
			    }
			});
		}
	    };
	} else if (targetClass == com.sun.javafx.functions.Function1.class) {
	    return new com.sun.javafx.functions.Function1<Object, Object>() {
		public Object invoke(final Object arg1) {
		    return ContextFactory.getGlobal().call(new ContextAction() {
			    public Object run(Context cx) {
				cx.setWrapFactory(FXWrapFactory.instance);
				return fun.call(cx, scope, scope, new Object[] {arg1});
			    }
			});
		}
	    };
	} else {
	    return null;
	    // FIXME do that for every type??
	}
    }

    // what if value is a special Function that is bindable? 
    // For the time being, ignore the body and look at the attributes of it
    // x.y = (function(){ x + y}).
    
    public void put(String name, Scriptable start, Object value) {
	try {
	    if (value instanceof NativeArray) {
		// FIXME this breaks referential equality, but maybe it's OK
		value = this.sequenceFromArray((NativeArray)value, start);
	    } else if (value instanceof Function) {
		Method setter = this.memberInfo.setterFor(name); // need the type of the setter
		if (setter == null) {
		    System.err.println("didn't find setter for " + name);
		    return;
		}
		this.functionCache.put(name, (Function)value);
		this.doSet(name, makeFunction((Function)value, setter.getReturnType(), 
					      ScriptableObject.getTopLevelScope(start)));
		return;
	    } else if (value instanceof Number) { // FIXME FIXME super ad-hoc
		value = Context.jsToJava(value, Float.class);
	    } else if (value instanceof Wrapper) {
		// FIXME is there a better way???
		value = ((Wrapper)value).unwrap();
	    } 
	    this.doSet(name, value);
	    return;
	} catch (Exception e) { 
	    e.printStackTrace(System.err);
	}
    }



}