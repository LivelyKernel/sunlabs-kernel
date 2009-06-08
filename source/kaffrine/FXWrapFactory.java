
import org.mozilla.javascript.*;
import com.sun.javafx.runtime.*;
import com.sun.javafx.runtime.sequence.*;
import com.sun.javafx.runtime.location.*;
import java.util.*;
import java.lang.reflect.*;


public class FXWrapFactory extends WrapFactory {
    
    public static FXWrapFactory instance = new FXWrapFactory();

    static class MemberInfo {
	Map<String, Method> getters = new HashMap<String, Method>(); // could be shared based on type
	Map<String, Method> setters = new HashMap<String, Method>(); // could be shared based on type
	Map<String, Method> locations = new HashMap<String, Method>(); // could be shared based on type
	Map<String, Function> methods = new HashMap<String, Function>(); // could be shared based on type
	String[] memberNames;

	public MemberInfo(Class cl) {
	    //System.err.println("class " + cl);
	    Set<String> members = new HashSet<String>();
	    for (Method m : cl.getMethods()) {
		String name = m.getName();
		if (name.startsWith("get$")) {
		    members.add(name);
		    this.getters.put(name.substring(4), m);
		} else if (name.startsWith("set$")) {
		    this.setters.put(name.substring(4), m);
		} else if (name.startsWith("loc$")) {
		    members.add(name);
		    this.locations.put(name.substring(4), m);
		} else {
		    members.add(name);
		    this.methods.put(name, new NativeJavaMethod(m, name));
		}
	    }
	    this.memberNames = members.toArray(new String[members.size()]);
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
	    return this.memberInfo.getters.containsKey(name) || this.memberInfo.methods.containsKey(name);
	}

	public Object[] getIds() {
	    // FIXME efficiency
	    return this.memberInfo.memberNames;
	}

	public String getClassName() {
	    return "FXObject";
	}

	Object doGet(String name) throws Exception {
	    Method getter = this.memberInfo.getters.get(name);
	    if (getter == null) return Scriptable.NOT_FOUND; // FIXME
	    return getter.invoke(this.javaObject);
	}

	boolean doSet(String name, Object value) throws Exception {
	    Method setter = this.memberInfo.setters.get(name);
	    if (setter == null) return false;
	    setter.invoke(this.javaObject, value);
	    return true;
	}
       
	private static Sequence sequenceFromArray(NativeArray array, Scriptable scope) {
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
	    try {
		Object value;
		Method locator = this.memberInfo.locations.get(name);
		if (locator != null) {
		    ObjectLocation location = (ObjectLocation)locator.invoke(this.javaObject);
		    if (SequenceVariable.class.isAssignableFrom(locator.getReturnType())) {
			value = location;
		    } else {
			value = location.get();
		    }
		} else {
		    value = this.doGet(name);
		}
		
		if (value != Scriptable.NOT_FOUND) {
		    //System.err.println("GET " + name);
		    return Context.javaToJS(value, start); // FIXME start?
		} else {
		    //System.err.println("trying method " + name);
		    return Context.javaToJS(this.memberInfo.methods.get(name), start);
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

	public void put(String name, Scriptable start, Object value) {
	    try {
		if (value instanceof NativeArray) {
		    // FIXME this breaks referential equality, but maybe it's OK
		    value = this.sequenceFromArray((NativeArray)value, start);
		} else if (value instanceof Function) {
		    final Function fun = (Function)value;
		    final Scriptable scope = ScriptableObject.getTopLevelScope(start);
		    
		    Method setter = this.memberInfo.setters.get(name);
		    if (setter == null) {
			System.err.println("didnt find setter for " + name);
			return;
		    }
		    Class returnType = setter.getReturnType();
		    if (returnType == com.sun.javafx.functions.Function0.class) {
			// FIXME pick the right function?
			value = new com.sun.javafx.functions.Function0<Object>() {
			    public Object invoke() {
				Context cx = Context.enter();
				cx.setWrapFactory(FXWrapFactory.instance);
				try {
				    // FIXME conversion?
				    return fun.call(cx, scope, scope, new Object[0]);
				} finally {
				    Context.exit();
				}
			    }
			};
		    } else if (returnType == com.sun.javafx.functions.Function1.class) {
			value = new com.sun.javafx.functions.Function1<Object, Object>() {
			    public Object invoke(Object arg1) {
				Context cx = Context.enter();
				cx.setWrapFactory(FXWrapFactory.instance);
				try {
				    // FIXME conversion?
				    return fun.call(cx, scope, scope, new Object[] {arg1});
				} finally {
				    Context.exit();
				}
			    }
			};
		    } // FIXME do that for every type??

		    
		    boolean result = this.doSet(name, value);
		    if (!result) {
			System.err.println("doSet failed on " + name + " value " + value + " " + this.javaObject);
			System.err.println("setters " + this.memberInfo.setters.keySet());
			Method locator = this.memberInfo.locations.get(name);
			if (locator != null) {
			    ObjectLocation location = (ObjectLocation)locator.invoke(this.javaObject);
			    location.set(value);
			    System.err.println("retrieved stored value " + value);
			} else {
			    System.err.println("XXno locator for " + name);
			}
		    }
		    //System.err.println("SUCCESS " + this.doGet(name));
		    return;
		} else if (value instanceof Number) { // FIXME FIXME super ad-hoc
		    value = Context.jsToJava(value, Float.class);
		} else if (value instanceof Wrapper) {
		    // FIXME is there a better way???
		    value = ((Wrapper)value).unwrap();
		    /*
		    if (value instanceof ObjectLocation) {
			System.err.println("!!!! deref " + name); 
			value = ((ObjectLocation)value).get();
		    }
		    */
		} 
		boolean result = this.doSet(name, value);
		if (!result) {
		    System.err.println("not public? " + name);
		    Method locator = this.memberInfo.locations.get(name);
		    if (locator != null) {
			ObjectLocation location = (ObjectLocation)locator.invoke(this.javaObject);
			location.set(value);
		    } else {
			System.err.println("locator not present " + name );
		    }
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
		return Context.javaToJS(field.get(clazz), start);
	    } catch (Exception e) { 
		System.err.println("woo " + e);
	    }
	    return super.get(name, start);
	}

	public boolean hasInstance(Scriptable instance) {
	    if (instance instanceof ScriptableFXObject) {
		Object obj = ((ScriptableFXObject)instance).unwrap();
		if (obj == null) return true;
		else return obj.getClass().isAssignableFrom(this.clazz);
	    }
	    return false;
	}


	public Object call(Context cx, Scriptable scope, Scriptable thisObj,
			   Object[] args) {
	    return this.construct(cx, scope, args); // is this what we want?
	}
	
	public Scriptable construct(Context cx, Scriptable scope, Object[] args) {
	    try {
		FXObject object = (FXObject)clazz.getConstructor(boolean.class).newInstance(true);
		
		//FXObject object = (FXObject)clazz.newInstance();
		object.addTriggers$();
		object.applyDefaults$();
		
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
		// FIXME the following should be run to allow full initialize$() but does not work like this.
		object.complete$();
		return wrapper;
	    } catch (Exception e) {
		throw new RuntimeException(e);
	    }
	}
    }


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
	    return object instanceof ScriptableFXObject; // or sequence?
	}

	public static void jsStaticFunction_observe(Scriptable object, String fieldName, final Function callback) {
	    if (object instanceof ScriptableFXObject) {
		Object target = ((ScriptableFXObject)object).unwrap();
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

	public void jsFunction_push(Object value) {
	    ObjectArraySequence seq = (ObjectArraySequence)variable.get();
	    int length = seq.size();
	    variable.replaceSlice(length, length, 
				  Sequences.make(TypeInfo.Object, Context.jsToJava(value, Object.class)));
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
	
    // this could be replaced with a hacked NativeJavaPackage
    public static class javafx {
	
	public static class scene {
	    public static FXConstructor Group = new FXConstructor("javafx.scene.Group");
	    public static FXConstructor Scene = new FXConstructor("javafx.scene.Scene");
	    public static class control {
		public static FXConstructor Button = new FXConstructor("javafx.scene.control.Button");
		public static FXConstructor Slider = new FXConstructor("javafx.scene.control.Slider");
		public static FXConstructor TextBox = new FXConstructor("javafx.scene.control.TextBox");
	    }
	    
	    public static class shape {
		public static FXConstructor Rectangle = new FXConstructor("javafx.scene.shape.Rectangle");
		public static FXConstructor Circle = new FXConstructor("javafx.scene.shape.Circle");
		public static FXConstructor Polygon = new FXConstructor("javafx.scene.shape.Polygon");
	    }
	    
	    public static class effect {
		public static FXConstructor DropShadow = new FXConstructor("javafx.scene.effect.DropShadow");
	    }

	    public static class paint {
		public static FXConstructor Color = new FXConstructor("javafx.scene.paint.Color");
		public static FXConstructor LinearGradient = new FXConstructor("javafx.scene.paint.LinearGradient");
		public static FXConstructor Stop = new FXConstructor("javafx.scene.paint.Stop");
	    }

	}

	public static class geometry {
	    public static FXConstructor Point2D = new FXConstructor("javafx.geometry.Point2D");
	}

	public static class stage {
	    public static FXConstructor Stage = new FXConstructor("javafx.stage.Stage");
	}
    }

    public static FXConstructor Test = new FXConstructor("FXTest");
 
    private boolean isInited = false;

    public Object wrap(Context cx, Scriptable scope, Object obj, Class staticType) {
	if (!isInited) {
	    try {
		ScriptableObject.defineClass(scope, ScriptableSequence.class, false, true);
		ScriptableObject.defineClass(scope, FXRuntime.class, false, true);
	    } catch (Exception e) {
		throw new RuntimeException(e);
	    }
	    isInited = true;
	}
	Class type = obj == null ? staticType : obj.getClass();
	if (type != null) {
	    if (FXObject.class.isAssignableFrom(type)) {
		//System.err.println("FX custom wrapping " + type);
		return new ScriptableFXObject(scope, obj, type);
	    } else if (SequenceVariable.class.isAssignableFrom(type)) {
		//System.err.println("FX wrapping sequence " + type);
		ScriptableSequence seq = 
		    new ScriptableSequence(scope, ScriptableObject.getClassPrototype(scope, 
										     ScriptableSequence.JS_NAME));
		seq.variable = (SequenceVariable)obj;
		return super.wrap(cx, scope, seq, staticType);
	    }
	}
	//System.err.println("wrapping " + obj);
	return super.wrap(cx, scope, obj, staticType);
    }
}