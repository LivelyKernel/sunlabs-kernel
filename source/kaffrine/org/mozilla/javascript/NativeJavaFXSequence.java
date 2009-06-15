package org.mozilla.javascript;

import com.sun.javafx.runtime.*;
import com.sun.javafx.runtime.sequence.*;
import com.sun.javafx.runtime.location.*;
import java.util.*;
import java.lang.reflect.*;


public class NativeJavaFXSequence extends ScriptableObject implements Wrapper {
    SequenceVariable variable;
    
    static String JS_NAME = "FXSequence";
    public String getClassName() {
	return JS_NAME;
    }
    
    public Object unwrap() { // ??? this is most likely incorrect?
	return variable.get();
    }
    
    public NativeJavaFXSequence() {
	variable = null;
    }
    
    public NativeJavaFXSequence(Scriptable scope, Scriptable prototype) {		
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
    
    public void jsFunction_insertAt(Object value, int index) {
	ObjectArraySequence seq = (ObjectArraySequence)variable.get();
	variable.replaceSlice(index, index, 
			      Sequences.make(TypeInfo.Object, Context.jsToJava(value, Object.class)));
    }
    
    public void jsFunction_push(Object value) {
	ObjectArraySequence seq = (ObjectArraySequence)variable.get();
	this.jsFunction_insertAt(value, seq.size());
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
