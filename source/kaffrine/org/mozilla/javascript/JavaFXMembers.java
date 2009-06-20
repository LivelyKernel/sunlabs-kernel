package org.mozilla.javascript;

import java.lang.reflect.*;
import java.util.*;


// hacked JavaMembers
class JavaFXMembers<T> {

    private Map<String, Method> getters = new HashMap<String, Method>(); // could be shared based on type
    private Map<String, Method> setters = new HashMap<String, Method>(); // could be shared based on type
    private Map<String, Method> locators = new HashMap<String, Method>(); // could be shared based on type
    Map<String, Object> staticMethods = new HashMap<String, Object>();
    Map<String, Object> instanceMethods = new HashMap<String, Object>();

    
    private Class<T> cl;
    
    JavaFXMembers(Scriptable scope, Class<T> cl) {
	this.cl = cl;
	reflect(scope);
	//analyze();
    }
    
    Method getterFor(String name) {
	return this.getters.get(name);
    }

    Method locatorFor(String name) {
	return this.locators.get(name);
    }

    Method setterFor(String name) {
	return this.setters.get(name);
    }

    Object[] getIds() {
	// FIXME more efficient?
	List<String> list = new ArrayList<String>();
	list.addAll(getters.keySet());
	list.addAll(setters.keySet());
	list.addAll(locators.keySet());
	list.addAll(instanceMethods.keySet());
	return list.toArray();
    }
    
    public String toString() {
	return this.cl.getName() + ":" + Arrays.asList(this.getIds());
    }

    public boolean has(String name) {
	return getters.containsKey(name) || instanceMethods.containsKey(name);
    }

    public void analyze() {
	ArrayList<String> missingGetters = new ArrayList<String>();
	for (String name: this.locators.keySet()) {
	    if (!this.getters.containsKey(name)) {
		missingGetters.add(name);
	    }
	}
	if (missingGetters.size() > 0)
	    System.err.println(this.cl.getName() + " has locator but not getter for " + missingGetters);
    }

    public void reflect(Scriptable scope) {
        for (Method method : this.cl.getMethods()) {
	    boolean isStatic = Modifier.isStatic(method.getModifiers());
            String name = method.getName();
	    if (name.startsWith("get$")) {
		this.getters.put(name.substring(4), method);
		continue;
	    } else if (name.startsWith("set$")) {
		this.setters.put(name.substring(4), method);
		continue;
	    } else if (name.startsWith("loc$") && (name.length() > 4)) {
		// looks like there's loc$(int), allows to enumerate locs?
		this.locators.put(name.substring(4), method);
		continue;
	    } 
	    
            Map<String, Object> ht = isStatic ? staticMethods : instanceMethods;
            Object value = ht.get(name);
            if (value == null) {
                ht.put(name, method);
            } else {
                ArrayList<Method> overloadedMethods;
                if (value instanceof ArrayList) {
                    overloadedMethods = (ArrayList<Method>)value;
                } else {
                    // value should be instance of Method as at this stage
                    // staticMembers and members can only contain methods
                    overloadedMethods = new ArrayList<Method>();
                    overloadedMethods.add((Method)value);
                    ht.put(name, overloadedMethods);
                }
                overloadedMethods.add(method);
            }
        }

        // replace Method instances by wrapped NativeJavaMethod objects
        // first in staticMembers and then in members
        for (int tableCursor = 0; tableCursor != 2; ++tableCursor) {
            boolean isStatic = (tableCursor == 0);
            Map<String, Object> ht = isStatic ? staticMethods : instanceMethods;
	    for (String name : ht.keySet()) {
                MemberBox[] methodBoxes;
                Object value = ht.get(name);
                if (value instanceof Method) {
                    methodBoxes = new MemberBox[] { new MemberBox((Method)value) };
                } else {
                    ArrayList<Method> overloadedMethods = (ArrayList<Method>)value;
                    int N = overloadedMethods.size();
                    if (N < 2) Kit.codeBug();
                    methodBoxes = new MemberBox[N];
                    for (int i = 0; i != N; ++i) {
                        Method method = (Method)overloadedMethods.get(i);
                        methodBoxes[i] = new MemberBox(method);
                    }
                }
                NativeJavaMethod fun = new NativeJavaMethod(methodBoxes);
                if (scope != null) {
                    ScriptRuntime.setFunctionProtoAndParent(fun, scope);
                }
                ht.put(name, fun);
            }
        }
    }

    static Map<Class, JavaFXMembers> memberInfos = new HashMap<Class, JavaFXMembers>();

    public static <U> JavaFXMembers<U> lookupClass(Scriptable scope, Class<U> dynamicType) {
	JavaFXMembers<U> mi = memberInfos.get(dynamicType);
	if (mi == null) {
	    //System.err.println("Creating class for " + dynamicType);
	    mi = new JavaFXMembers<U>(scope, dynamicType);
	    memberInfos.put(dynamicType, mi);
	    if (!com.sun.javafx.runtime.FXBase.class.isAssignableFrom(dynamicType)) {
		System.err.println("wrapper class " + dynamicType);
	    }
	}
	return mi;
    }
}