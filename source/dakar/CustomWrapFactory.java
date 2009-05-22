
import org.mozilla.javascript.*;
import com.sun.javafx.runtime.*;
import com.sun.javafx.runtime.sequence.*;
import com.sun.javafx.runtime.location.*;
import java.util.*;
import java.lang.reflect.*;


public class CustomWrapFactory extends WrapFactory {

    public static class ScriptableLocation extends NativeJavaObject {
	ArrayList<String> properties = new ArrayList<String>(); // could be shared based on type

	public ScriptableLocation(Scriptable scope, Object object, Class type) {
	    super(scope, object, type);
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

	private ObjectLocation extractFieldVariable(String name) throws Exception {
	    Object content = ((ObjectLocation)this.javaObject).get();
	    Method getter = content.getClass().getMethod("get$" + name);
	    ObjectLocation variable = (ObjectLocation)getter.invoke(content);
	    return variable;
	}

	public Object get(String name, Scriptable start) {
	    try {
		ObjectLocation variable = this.extractFieldVariable(name);
		System.err.println("GET " + name);
		// hmm, no conversion to Scriptable here? is this automatic?
		return variable;
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
		    Object loc = ((org.mozilla.javascript.Wrapper)array.get(i, start)).unwrap();
		    jarray[i] = ((ObjectLocation<FXObject>)loc).get();
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
	Class type = staticType != null ? staticType : obj.getClass();
	if (ObjectLocation.class.isAssignableFrom(type)) {
	    System.err.println("custom wrapping " + type);
	    return new ScriptableLocation(scope, obj, type);
	} 
	return super.wrap(cx, scope, obj, staticType);
    }
}