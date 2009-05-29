
import org.mozilla.javascript.*;
import com.sun.javafx.runtime.*;
import com.sun.javafx.runtime.sequence.*;
import com.sun.javafx.runtime.location.*;
import java.util.*;
import java.lang.reflect.*;


public class CustomWrapFactory extends WrapFactory {

    public static class ScriptableFXObject implements Scriptable, Wrapper {
	Object javaObject;
	Scriptable parent;
	Scriptable prototype;
	Map<String, Method> properties = new HashMap<String, Method>(); // could be shared based on type

	public ScriptableFXObject(Scriptable scope, Object javaObject, Class type) {
	    this.javaObject = javaObject;
	    this.parent = scope;
	    try {
		Object content = this.getTarget(); 
		// cache methods, check if content has the same class and if not, update properties.
		if (content != null) {
		    System.err.println("class " + content.getClass().getName());
		    for (Method m : content.getClass().getMethods()) {
			//System.err.println("method " + m.getName());
			if (m.getName().startsWith("get$")) {
			    properties.put(m.getName().substring(4), m);
			}
			// how about instance methods???
		    }
		}
	    } catch (Exception e) {
		throw new RuntimeException(e);
	    }
	}
	
	public boolean hasInstance(Scriptable value) {
	    // This is an instance of a Java class, so always return false
	    return false;
	}
	
	public Object getDefaultValue(Class hint) {
	    return this.javaObject.toString(); // ??
	}

	public Object unwrap() {
	    return javaObject;
	}

	public Scriptable getParentScope() {
	    return parent;
	}
	
	public void setParentScope(Scriptable m) {
	    parent = m;
	}

	public Scriptable getPrototype() {
	    return prototype;
	}
	
	public void setPrototype(Scriptable m) {
	    prototype = m;
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
	    return this.properties.containsKey(name);
	}

	public Object[] getIds() {
	    return this.properties.keySet().toArray();
	}

	public String getClassName() {
	    return "FXObject";
	}

	Object getTarget() {
	    return javaObject;
	}

	ObjectLocation extractFieldVariable(String name) throws Exception {
	    Object content = this.getTarget();
	    //Method getter = content.getClass().getMethod("get$" + name);
	    Method getter = this.properties.get(name);
	    if (getter == null) throw new Exception("Didnt find " + name);
	    ObjectLocation variable = (ObjectLocation)getter.invoke(content);
	    return variable;
	}

	public Object get(String name, Scriptable start) {
	    try {
		/*
		if (name.equals("initialize$"))  { // FIXME ad hoc
		    System.err.println("Trying to initialize through " + name);
		    return new NativeJavaMethod(this.javaObject.getClass().getMethod(name), name);
		}
		*/
		// FIXME how about Sequence.length
		ObjectLocation variable = this.extractFieldVariable(name);
		System.err.println("GET " + name);
		return Context.javaToJS(variable.get(), start); // FIXME start?
	    } catch (Exception e) { 
		System.err.println("not found getter " + name);
		return Context.getUndefinedValue();
	    }
	}

	public void put(String name, Scriptable start, Object value) {
	    if (value instanceof NativeArray) {
		NativeArray array = (NativeArray)value;
		int length = (int)array.getLength();
		FXObject[] jarray = new FXObject[length];
		// FIXME this assumes array of ObjectLocations!
		System.err.println("making array");
		for (int i = 0; i < length; i++) {
		    jarray[i] = (FXObject)((Wrapper)array.get(i, start)).unwrap();
		}
		value = Sequences.make(TypeInfo.Object, jarray, length);
	    }
	    try {
		ObjectLocation variable = this.extractFieldVariable(name);
		System.err.println("variable " + variable + " new value " + value + " type " + variable.getClass().getName());
		if (variable instanceof FloatLocation) { // FIXME FIXME super ad-hoc
		    value = Context.jsToJava(value, Float.class);

		} else if (value instanceof ObjectLocation) {
		    // here's a place where two locations could be bound to each other?
		    value = ((ObjectLocation)value).get();
		} else if (value instanceof Wrapper) {
		    // FIXME is there a better way???
		    value = ((Wrapper)value).unwrap();
		    if (value instanceof ObjectLocation) {
			value = ((ObjectLocation)value).get();
		    }
		}
		
		variable.set(value); 
		return;
	    } catch (Exception e) { 
		e.printStackTrace(System.err);
	    }
	}

	public Object get(int index, Scriptable start) {
	    try {
		if (this.javaObject instanceof Sequence) {
		    Object result = ((Sequence)this.javaObject).get(index);
		    return Context.javaToJS(result, start);
		}
		return Context.getUndefinedValue();
	    } catch (Exception e) {
		e.printStackTrace(System.err);
		return Scriptable.NOT_FOUND;
	    }
	}
    }


    public static class FXConstructor extends BaseFunction {
	Class clazz;
	public FXConstructor(String name) {
	    try {
		this.clazz = Class.forName(name);
	    } catch (Exception e) {
		throw new RuntimeException(e);
	    }
	}
	
	public Object call(Context cx, Scriptable scope, Scriptable thisObj,
			   Object[] args) {
	    return this.construct(cx, scope, args); // is this what we want?
	}
	
	public Scriptable construct(Context cx, Scriptable scope, Object[] args) {
	    try {
		FXObject object = (FXObject)clazz.newInstance();
		object.initialize$();
		Scriptable wrapper = (Scriptable)Context.javaToJS(object, scope);
		if (args.length > 1) throw new RuntimeException("too many args?");
		if (args.length == 1) {
		    Scriptable initlist = (Scriptable)args[0];
		    for (Object id : initlist.getIds()) { // FIXME error checking and such
			String name = (String)id;
			wrapper.put(name, scope, initlist.get(name, scope));
			// does this agree with the deferred initialization semantics of FX?
		    }
		}
		return wrapper;
	    } catch (Exception e) {
		throw new RuntimeException(e);
	    }
	}
	
    }
    // this could be replaced with a hacked NativeJavaPackage
    public static class javafx {
	
	public static class scene {
	    public static FXConstructor Group = new FXConstructor("javafx.scene.Group");
	    public static FXConstructor Scene = new FXConstructor("javafx.scene.Scene");
	    public static class shape {
		public static FXConstructor Rectangle = new FXConstructor("javafx.scene.shape.Rectangle");
		public static FXConstructor Circle = new FXConstructor("javafx.scene.shape.Circle");
	    }
	}
	public static class stage {
	    public static FXConstructor Stage = new FXConstructor("javafx.stage.Stage");
	}
    }
    

    public Object wrap(Context cx, Scriptable scope, Object obj, Class staticType) {
	Class type = obj == null ? staticType : obj.getClass();
	if (type != null) {
	    if (FXObject.class.isAssignableFrom(type) || Sequence.class.isAssignableFrom(type)) {
		System.err.println("FX custom wrapping " + type);
		return new ScriptableFXObject(scope, obj, type);
	    } 
	}
	//System.err.println("wrapping " + obj);
	return super.wrap(cx, scope, obj, staticType);
    }
}