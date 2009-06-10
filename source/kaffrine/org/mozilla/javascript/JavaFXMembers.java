package org.mozilla.javascript;

import java.lang.reflect.*;
import java.util.*;


class JavaFXMembers {

    Map<String, Method> getters = new HashMap<String, Method>(); // could be shared based on type
    Map<String, Method> setters = new HashMap<String, Method>(); // could be shared based on type
    Map<String, Method> locations = new HashMap<String, Method>(); // could be shared based on type
    Map<String, Function> methods = new HashMap<String, Function>(); // could be shared based on type
    String[] memberNames;
    Class cl;
    
    JavaFXMembers(Scriptable scope, Class cl) {
        //super(scope, cl);
	this.cl = cl;
	reflect(scope, false);
	//System.err.println("class " + cl);
    }

    
    public void reflect(Scriptable scope, boolean includeProtected) {
	Set<String> membersSet = new HashSet<String>();
	for (Method m : cl.getMethods()) {
	    String name = m.getName();
	    if (name.startsWith("get$")) {
		membersSet.add(name);
		this.getters.put(name.substring(4), m);
	    } else if (name.startsWith("set$")) {
		this.setters.put(name.substring(4), m);
	    } else if (name.startsWith("loc$")) {
		membersSet.add(name);
		this.locations.put(name.substring(4), m);
	    } else {
		membersSet.add(name);
		this.methods.put(name, new NativeJavaMethod(m, name));
	    }
	}
	this.memberNames = membersSet.toArray(new String[membersSet.size()]);
    }


    /*
    JavaFXMembers(Scriptable scope, Class cl, boolean includeProtected) {
	super(scope, cl, includeProtected);
    }
    */

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