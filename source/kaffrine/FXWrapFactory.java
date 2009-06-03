
import org.mozilla.javascript.*;
import com.sun.javafx.runtime.*;
import com.sun.javafx.runtime.sequence.*;
import com.sun.javafx.runtime.location.*;
import java.util.*;
import java.lang.reflect.*;


public class FXWrapFactory extends WrapFactory {

    static class MemberInfo {
	Map<String, Method> getters = new HashMap<String, Method>(); // could be shared based on type
	Map<String, Method> setters = new HashMap<String, Method>(); // could be shared based on type
	Map<String, Method> locations = new HashMap<String, Method>(); // could be shared based on type


	Map<String, Function> methods = new HashMap<String, Function>(); // could be shared based on type
	public MemberInfo(Class cl) {
	    System.err.println("class " + cl);
	    for (Method m : cl.getMethods()) {
		String name = m.getName();
		if (name.startsWith("get$")) {
		    this.getters.put(name.substring(4), m);
		} else if (name.startsWith("set$")) {
		    this.setters.put(name.substring(4), m);
		} else if (name.startsWith("loc$")) {
		    this.locations.put(name.substring(4), m);
		} else {
		    this.methods.put(name, new NativeJavaMethod(m, name));
		}
	    }
	}
    }

    static Map<Class, MemberInfo> memberInfos = new HashMap<Class, MemberInfo>();
    
    public static class ScriptableFXObject implements Scriptable, Wrapper {
	Object javaObject;
	Scriptable parent;
	Scriptable prototype;
	MemberInfo memberInfo;

	public ScriptableFXObject(Scriptable scope, Object javaObject, Class type) {
	    this.javaObject = javaObject;
	    this.parent = scope;
	    try {
		// cache methods, check if content has the same class and if not, update properties.
		if (this.javaObject != null) {
		    Class c = javaObject.getClass();
		    MemberInfo mi = memberInfos.get(c);
		    if (mi == null) {
			mi = new MemberInfo(c);
			memberInfos.put(c, mi);
		    }
		    this.memberInfo = mi;
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
	    return this.javaObject != null ? this.javaObject.toString() : null;
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
	    return this.memberInfo.getters.containsKey(name);
	}

	public Object[] getIds() {
	    return this.memberInfo.getters.keySet().toArray();
	}

	public String getClassName() {
	    return "FXObject";
	}


	Object doGet(String name) throws Exception {
	    Method getter = this.memberInfo.getters.get(name);
	    if (getter == null) return Scriptable.NOT_FOUND; // FIXME
	    return getter.invoke(this.javaObject);
	}

	Object doSet(String name, Object value) throws Exception {
	    Method setter = this.memberInfo.setters.get(name);
	    if (setter == null) return Scriptable.NOT_FOUND; // FIXME
	    return setter.invoke(this.javaObject, value);
	}
       
	private static Sequence sequenceFromArray(NativeArray array, Scriptable scope) {
	    int length = (int)array.getLength();
	    FXObject[] fxarray = new FXObject[length];
	    // FIXME this assumes array of Wrappers!
	    for (int i = 0; i < length; i++) {
		fxarray[i] = (FXObject)((Wrapper)array.get(i, scope)).unwrap();
	    }
	    return Sequences.make(TypeInfo.Object, fxarray, length);
	}
	
	public Object get(String name, Scriptable start) {
	    try {
		Object value;
		Method locator = this.memberInfo.locations.get(name);
		if (locator != null) {
		    ObjectLocation location = (ObjectLocation)locator.invoke(this.javaObject);
		    value = location.get();
		} else {
		    value = this.doGet(name);
		}
		
		if (value != Scriptable.NOT_FOUND) {
		    System.err.println("GET " + name);
		    return Context.javaToJS(value, start); // FIXME start?
		} else {
		    System.err.println("trying method " + name);
		    return Context.javaToJS(this.memberInfo.methods.get(name), start);
		}
	    } catch (Exception e) { 
		System.err.println("not found getter " + name);
		return Context.getUndefinedValue();
	    }
	}

	public Object get(int index, Scriptable start) {
	    return Scriptable.NOT_FOUND;
	}

	public void put(String name, Scriptable start, Object value) {
	    try {
		if (value instanceof NativeArray) {
		    // FIXME this breaks referential equality, but maybe it's OK
		    value = this.sequenceFromArray((NativeArray)value, start);
		} else if (value instanceof Function) {
		    
		    value = new com.sun.javafx.functions.Function0<Object>() {
			public Object invoke() {
			    System.err.println("invoking function!!");
			    return null;
			}
		    };
		    Method locator = this.memberInfo.locations.get(name);
		    if (locator != null) {
			ObjectLocation location = (ObjectLocation)locator.invoke(this.javaObject);
			location.set(value);
			System.err.println("retrieved stored value " + value);
		    } else {
			this.doSet(name, value);
			System.err.println("XXno locator for " + name);
		    }
		    //System.err.println("SUCCESS " + this.doGet(name));
		    return;
		} else if (value instanceof Number) { // FIXME FIXME super ad-hoc
		    value = Context.jsToJava(value, Float.class);
		} else if (value instanceof Wrapper) {
		    // FIXME is there a better way???
		    value = ((Wrapper)value).unwrap();
		    if (value instanceof ObjectLocation) {
			value = ((ObjectLocation)value).get();
		    }
		}
		Method locator = this.memberInfo.locations.get(name);
		if (locator != null) {
		    ObjectLocation location = (ObjectLocation)locator.invoke(this.javaObject);
		    location.set(value);
		} else {
		    this.doSet(name, value);
		}
		return;
	    } catch (Exception e) { 
		e.printStackTrace(System.err);
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

	public String getDefaultValue(Class hint) {
	    return "[JavaFXClass " + clazz.getName() + "]";
	}

	public Object get(String name, Scriptable start) {
	    try {
		Field field = clazz.getField("$"+ name);
		return field.get(clazz);
	    } catch (Exception e) { 
		System.err.println("woo " + e);
	    }
	    return super.get(name, start);
	}

		    
	
	public Object call(Context cx, Scriptable scope, Scriptable thisObj,
			   Object[] args) {
	    return this.construct(cx, scope, args); // is this what we want?
	}
	
	public Scriptable construct(Context cx, Scriptable scope, Object[] args) {
	    try {
		FXObject object = (FXObject)clazz.newInstance();
		//object.initialize$();

		
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
		
		object.addTriggers$();
		// FIXME the following should be run to allow full initialize$() but does not work like this.
		//object.applyDefaults$();
		object.complete$();

		return wrapper;
	    } catch (Exception e) {
		throw new RuntimeException(e);
	    }
	}
	
    }

    public static class ScriptableSequence extends NativeJavaObject {
	public String getClassName() {
	    return "FXSequence";
	}

	public ScriptableSequence(Scriptable scope, Sequence sequence, Class staticType) {
	    super(scope, sequence, staticType, true);
	}

	public Object get(int index, Scriptable start) {
	    Object result = ((Sequence)this.javaObject).get(index);
	    return Context.javaToJS(result, start);
	}

	public Object get(String name, Scriptable start) {
	    if (name.equals("length")) {
		return Context.javaToJS(((Sequence)this.javaObject).size(), start);
	    }
	    return super.get(name, start);
	}
    }
    // this could be replaced with a hacked NativeJavaPackage
    public static class javafx {
	
	public static class scene {
	    public static FXConstructor Group = new FXConstructor("javafx.scene.Group");
	    public static FXConstructor Scene = new FXConstructor("javafx.scene.Scene");
	    public static class control {
		public static FXConstructor Button = new FXConstructor("javafx.scene.control.Button");
	    }
	    
	    public static class shape {
		public static FXConstructor Rectangle = new FXConstructor("javafx.scene.shape.Rectangle");
		public static FXConstructor Circle = new FXConstructor("javafx.scene.shape.Circle");
	    }
	    public static class paint {
		public static FXConstructor Color = new FXConstructor("javafx.scene.paint.Color");
	    }
	}
	public static class stage {
	    public static FXConstructor Stage = new FXConstructor("javafx.stage.Stage");
	}
    }
 
   

    public Object wrap(Context cx, Scriptable scope, Object obj, Class staticType) {
	Class type = obj == null ? staticType : obj.getClass();
	if (type != null) {
	    if (FXObject.class.isAssignableFrom(type)) {
		System.err.println("FX custom wrapping " + type);
		return new ScriptableFXObject(scope, obj, type);
		
	    } else if (Sequence.class.isAssignableFrom(type)) {
		System.err.println("FX wrapping sequence " + type);
		return new ScriptableSequence(scope, (Sequence)obj, type);
	    } 
	}
	//System.err.println("wrapping " + obj);
	return super.wrap(cx, scope, obj, staticType);
    }
}