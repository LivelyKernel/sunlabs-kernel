
import org.mozilla.javascript.*;
import com.sun.javafx.runtime.*;
import com.sun.javafx.runtime.sequence.*;
import com.sun.javafx.runtime.location.*;
import java.util.*;
import java.lang.reflect.*;


public class CustomWrapFactory extends WrapFactory {

    public static abstract class AbstractScriptable implements Scriptable, org.mozilla.javascript.Wrapper {
	Object javaObject;
	Scriptable parent;
	Scriptable prototype;

	public AbstractScriptable(Scriptable scope, Object javaObject) {
	    this.javaObject = javaObject;
	    this.parent = scope;
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

    }
    

    public static class ScriptableLocation  extends AbstractScriptable  {
	ArrayList<String> properties = new ArrayList<String>(); // could be shared based on type

	public ScriptableLocation(Scriptable scope, Object object, Class type) {
	    super(scope, object);
	    try {
		Object content = ((ObjectLocation)object).get();
		// cache methods, check if content has the same class and if not, update properties.
		if (content != null) {
		    System.err.println("class " + content.getClass().getName());
		    for (Method m : content.getClass().getMethods()) {
			//System.err.println("method " + m.getName());
			if (m.getName().startsWith("get$")) {
			    properties.add(m.getName().substring(4));
			}
			// how about instance methods???
		    }
		    if (properties.size() > 0) 
			System.err.println("properties of " + content.getClass().getName() + " " + properties);
		}
	    } catch (Exception e) {
		throw new RuntimeException(e);
	    }
	}

	public boolean has(String name, Scriptable start) {
	    return this.properties.contains(name);
	}

	public String getClassName() {
	    return "FXLocation";
	}

	public Object[] getIds() {
	    return this.properties.toArray();
	}

	private ObjectLocation extractFieldVariable(String name) throws Exception {
	    Object content = ((ObjectLocation)this.javaObject).get();
	    Method getter = content.getClass().getMethod("get$" + name);
	    ObjectLocation variable = (ObjectLocation)getter.invoke(content);
	    return variable;
	}

	public Object get(int index, Scriptable start) {
	    try {
		if (this.javaObject instanceof SequenceLocation) {
		    Object result = ((SequenceLocation)this.javaObject).get(index);
		    // this will return naked FXObject, not Location
		    //System.err.println("got result " + result);
		    return Context.javaToJS(result, start);
		}
		return Scriptable.NOT_FOUND;
	    } catch (Exception e) {
		e.printStackTrace(System.err);
		return Scriptable.NOT_FOUND;
	    }
	}


	public Object get(String name, Scriptable start) {
	    try {
		ObjectLocation variable = this.extractFieldVariable(name);
		System.err.println("GET " + name);
		// hmm, no conversion to Scriptable here? is this automatic?
		Object content = variable.get(); // get will box the primitive?
		if (content instanceof Boolean || content instanceof Number || content instanceof String) {
		    System.err.println("variable was " + variable);
		    return content;
		}
		return Context.javaToJS(variable, start); // FIXME start?
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
		    jarray[i] = (FXObject)((org.mozilla.javascript.Wrapper)array.get(i, start)).unwrap();
		}
		value = Sequences.make(TypeInfo.Object, jarray, length);
	    }
	    try {
		ObjectLocation variable = this.extractFieldVariable(name);
		if (value instanceof org.mozilla.javascript.Wrapper) {
		    // FIXME is there a better way???
		    value = ((org.mozilla.javascript.Wrapper)value).unwrap();
		}
		System.err.println("variable " + variable + " new value " + value);
		if (!(value instanceof Float) && (variable instanceof FloatLocation)) {
		    // FIXME FIXME super ad-hoc
		    value = new Float(((Number)value).floatValue()); 
		} else if (value instanceof ObjectLocation) {
		    // here's a place where two locations could be bound to each other?
		    value = ((ObjectLocation)value).get();
		}
		variable.set(value); 
		//System.err.println("!PUT " + name + ", " + getter + " " + variable.get());
		return;
	    } catch (Exception e) { 
		e.printStackTrace(System.err);
	    }
	}
    }

    public static class ScriptableFXObject extends AbstractScriptable  {
	ArrayList<String> properties = new ArrayList<String>(); // could be shared based on type
	public ScriptableFXObject(Scriptable scope, FXObject object, Class type) {
	    super(scope, object);
	    try {
		// cache methods, check if content has the same class and if not, update properties.
		if (object != null) {
		    System.err.println("class " + object.getClass().getName());
		    for (Method m : object.getClass().getMethods()) {
			//System.err.println("method " + m.getName());
			if (m.getName().startsWith("get$")) {
			    properties.add(m.getName().substring(4));
			} else if (m.getName().equals("initialize$")) {
			    properties.add("initialize$");
			}
		    }
		    if (properties.size() > 0) 
			System.err.println("properties of " + object.getClass().getName() + " " + properties);
		}
	    } catch (Exception e) {
		throw new RuntimeException(e);
	    }
	}

	public boolean has(String name, Scriptable start) {
	    return this.properties.contains(name);
	}

	public String getClassName() {
	    return "FXLocation";
	}

	public Object[] getIds() {
	    return this.properties.toArray();
	}

	public Object get(int index, Scriptable start) {
	    return Scriptable.NOT_FOUND;
	}
	
	private ObjectLocation extractFieldVariable(String name) throws Exception {
	    Object content = this.javaObject;
	    Method getter = content.getClass().getMethod("get$" + name);
	    ObjectLocation variable = (ObjectLocation)getter.invoke(content);
	    return variable;
	}

	public Object get(String name, Scriptable start) {
	    try {
		if (name.equals("initialize$"))  { // FIXME ad hoc
		    System.err.println("Trying to initialize through " + name);
		    return new NativeJavaMethod(this.javaObject.getClass().getMethod(name), name);
		}
		
		ObjectLocation variable = this.extractFieldVariable(name);
		System.err.println("GET " + name);
		// hmm, no conversion to Scriptable here? is this automatic?
		Object content = variable.get(); // get will box the primitive?
		if (content instanceof Boolean || content instanceof Number || content instanceof String) {
		    System.err.println("variable was " + variable);
		    return content;
		}
		return Context.javaToJS(variable, start); // FIXME start?
	    } catch (Exception e) { 
		System.err.println("not found getter " + name);
		return Context.getUndefinedValue();
	    }
	}
	
	public void put(String name, Scriptable start, Object value) {
	    if (value instanceof NativeArray) {
		NativeArray array = (NativeArray)value;
		int length = (int)array.getLength();
		Object[] jarray = new Object[length];
		// FIXME this assumes array of ObjectLocations!
		for (int i = 0; i < length; i++) {
		    jarray[i] = (FXObject)((org.mozilla.javascript.Wrapper)array.get(i, start)).unwrap();
		}
		value = Sequences.make(TypeInfo.Object, jarray, length);
	    }
	    try {
		ObjectLocation variable = this.extractFieldVariable(name);
		if (value instanceof org.mozilla.javascript.Wrapper) {
		    // FIXME is there a better way???
		    value = ((org.mozilla.javascript.Wrapper)value).unwrap();
		}
		System.err.println("variable " + variable + " new value " + value);
		if (!(value instanceof Float) && (variable instanceof FloatLocation)) {
		    // FIXME FIXME super ad-hoc
		    value = new Float(((Number)value).floatValue()); 
		} else if (value instanceof ObjectLocation) {
		    // here's a place where two locations could be bound to each other?
		    value = ((ObjectLocation)value).get();
		}
		variable.set(value); 
		//System.err.println("!PUT " + name + ", " + getter + " " + variable.get());
		return;
	    } catch (Exception e) { 
		e.printStackTrace(System.err);
	    }
	}
    }

    public Object wrap(Context cx, Scriptable scope, Object obj, Class staticType) {
	//Class type = staticType != null ? staticType : obj.getClass();
	Class type = obj == null ? staticType : obj.getClass();
	if (ObjectLocation.class.isAssignableFrom(type)) {
	    System.err.println("custom wrapping " + type);
	    return new ScriptableLocation(scope, obj, type);
	} else if (FXObject.class.isAssignableFrom(type)) {
	    System.err.println("FX custom wrapping " + type);
	    return new ScriptableFXObject(scope, (FXObject)obj, type);
	}
	return super.wrap(cx, scope, obj, staticType);
    }
}