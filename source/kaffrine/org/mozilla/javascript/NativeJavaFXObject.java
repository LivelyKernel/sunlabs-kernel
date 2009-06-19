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
    
    public NativeJavaFXObject(Scriptable scope, Object javaObject, Class type) {
	super(type);
	System.err.println("making wrapper object " + javaObject);
	this.javaObject = javaObject;
	//this.parent = scope;
    }

    @Override void initMembers(Class typeHint) {
        this.memberInfo = JavaFXMembers.lookupClass(this.getParentScope(), typeHint);
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