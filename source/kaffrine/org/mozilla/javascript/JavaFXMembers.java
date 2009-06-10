package org.mozilla.javascript;

import java.lang.reflect.*;
import java.util.*;


class JavaFXMembers {

    Map<String, Method> getters = new HashMap<String, Method>(); // could be shared based on type
    Map<String, Method> setters = new HashMap<String, Method>(); // could be shared based on type
    Map<String, Method> locations = new HashMap<String, Method>(); // could be shared based on type
    Class cl;
    
    JavaFXMembers(Scriptable scope, Class cl) {
	this.cl = cl;
	reflect(scope);
	//System.err.println("instance methods " + instanceMethods);
	//System.err.println("class " + cl);
    }
    
    Hashtable staticMethods = new Hashtable();
    Hashtable instanceMethods = new Hashtable();


    Object[] getIds() {
	List list = new ArrayList();
	list.addAll(getters.keySet());
	list.addAll(setters.keySet());
	list.addAll(locations.keySet());
	list.addAll(instanceMethods.keySet());
	return list.toArray();
    }



    public void reflect(Scriptable scope) {
        for (Method method : this.cl.getMethods()) {
            int mods = method.getModifiers();
            boolean isStatic = Modifier.isStatic(mods);
            Hashtable ht = isStatic ? staticMethods : instanceMethods;
            String name = method.getName();
	    if (name.startsWith("get$")) {
		this.getters.put(name.substring(4), method);
		continue;
	    } else if (name.startsWith("set$")) {
		this.setters.put(name.substring(4), method);
		continue;
	    } else if (name.startsWith("loc$")) {
		this.locations.put(name.substring(4), method);
		continue;
	    } 

            Object value = ht.get(name);
            if (value == null) {
                ht.put(name, method);
            } else {
                ObjArray overloadedMethods;
                if (value instanceof ObjArray) {
                    overloadedMethods = (ObjArray)value;
                } else {
                    if (!(value instanceof Method)) Kit.codeBug();
                    // value should be instance of Method as at this stage
                    // staticMembers and members can only contain methods
                    overloadedMethods = new ObjArray();
                    overloadedMethods.add(value);
                    ht.put(name, overloadedMethods);
                }
                overloadedMethods.add(method);
            }
        }

        // replace Method instances by wrapped NativeJavaMethod objects
        // first in staticMembers and then in members
        for (int tableCursor = 0; tableCursor != 2; ++tableCursor) {
            boolean isStatic = (tableCursor == 0);
            Hashtable ht = (isStatic) ? staticMethods : instanceMethods;
            Enumeration e = ht.keys();
            while (e.hasMoreElements()) {
                String name = (String)e.nextElement();
                MemberBox[] methodBoxes;
                Object value = ht.get(name);
                if (value instanceof Method) {
                    methodBoxes = new MemberBox[1];
                    methodBoxes[0] = new MemberBox((Method)value);
                } else {
                    ObjArray overloadedMethods = (ObjArray)value;
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

    public static JavaFXMembers lookupClass(Scriptable scope, Class dynamicType, Class staticType) {
	JavaFXMembers mi = memberInfos.get(dynamicType);
	if (mi == null) {
	    mi = new JavaFXMembers(scope, dynamicType);
	    memberInfos.put(dynamicType, mi);
	}
	return mi;
    }
    



}