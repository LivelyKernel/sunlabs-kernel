package org.mozilla.javascript;

import com.sun.javafx.runtime.*;
import com.sun.javafx.runtime.sequence.*;
import com.sun.javafx.runtime.location.*;
import java.util.*;
import java.lang.reflect.*;

public class NativeJavaFXObject extends ScriptableFXBase implements Scriptable, Wrapper {

    Object javaObject;
    //Scriptable parent; // ellide parent scope and share, what about thread safety?
    Scriptable prototype;
    JavaFXMembers memberInfo;
    Class staticType;
    
    public NativeJavaFXObject(Scriptable scope, Object javaObject, Class type) {
	System.err.println("making wrapper object " + javaObject);
	this.javaObject = javaObject;
	//this.parent = scope;
	this.staticType = type;
	initMembers();
    }

    @Override void initMembers() {
        Class dynamicType;
        if (javaObject != null) {
            dynamicType = javaObject.getClass();
        } else {
            dynamicType = staticType;
        }
        this.memberInfo = JavaFXMembers.lookupClass(this.getParentScope(), dynamicType, this.staticType);
        //this.fieldAndMethods = members.getFieldAndMethodsObjects(this, javaObject, false);
    }

    
    public Object getDefaultValue(Class hint) {
	return this.javaObject != null ? this.javaObject.toString() : null;
    }
    
    public Object unwrap() {
	return javaObject;
    }

    @Override Object receiver() {
	return javaObject;
    }

}