package org.mozilla.javascript;

import com.sun.javafx.runtime.*;
import com.sun.javafx.runtime.sequence.*;
import com.sun.javafx.runtime.location.*;
import java.util.*;
import java.lang.reflect.*;

public class NativeJavaFXObject extends ScriptableFXBase implements Scriptable, Wrapper {

    private Object javaObject;
    private JavaFXMembers typeDescriptor;

    public NativeJavaFXObject(Scriptable scope, Object javaObject, Class type) {
	super(type);
	this.javaObject = javaObject;
	//this.parent = scope;
    }

    @Override void initMembers(Class typeHint) {
        this.typeDescriptor = JavaFXMembers.lookupClass(typeHint);
        //this.fieldAndMethods = members.getFieldAndMethodsObjects(this, javaObject, false);
    }

    public JavaFXMembers getTypeDescriptor() {
	return this.typeDescriptor;
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