package org.mozilla.javascript; // for convenience

import java.lang.instrument.*;
import java.security.ProtectionDomain;
import org.objectweb.asm.*;
import java.util.*;


public class ScriptableInjector implements ClassFileTransformer {
    
    public ScriptableInjector() {
	super();
    }
    
    static final String OLD_BASE = "com/sun/javafx/runtime/FXBase";
    static final String NEW_BASE = "org/mozilla/javascript/ScriptableFXBase";
    static class SuperChanger extends ClassAdapter {
	public SuperChanger(ClassVisitor classVisitor) {
	    super(classVisitor);
	}
	public void visit(int version, int access, String name,  String signature, String superName, String[] interfaces) { 
	    System.err.println("In class " + name);
	    if (name.equals(OLD_BASE)) {
		//superName = "org/mozilla/javascript/ScriptableFXBase";
		System.err.println("should rewrite " + superName + " to "  + NEW_BASE);
	    }
	    super.visit(version, access, name, signature, NEW_BASE, interfaces);
	} 
	
	public MethodVisitor visitMethod(int access, String name, String desc, String signature, String[] exceptions) {
	    MethodVisitor delegate = super.visitMethod(access, name, desc, signature, exceptions);
	    if (name.equals("<init>")) {
		return new MethodAdapter(delegate) {
		    @Override public void visitMethodInsn(int opcode, String owner, String name, String desc) {
			if (opcode == Opcodes.INVOKESPECIAL) {
			    System.err.printf("should rewrite invokespecial %s %s %s to invokespecial %s %s %s\n", 
					      owner, name, desc, NEW_BASE, name, desc);
			}
			super.visitMethodInsn(opcode, NEW_BASE, name, desc);
			//super.visitMethodInsn(opcode, owner, name, desc);
		    }
		};
	    } else return delegate;
	}
    }
    
    
    public byte[] transform(ClassLoader loader, String className, Class redefiningClass, 
			    ProtectionDomain domain, byte[] bytes) throws IllegalClassFormatException {
	if (false && className.startsWith("javafx/")) {
	    try {
		ClassReader reader = new ClassReader(bytes);
		List<String> ifaces = Arrays.asList(reader.getInterfaces());
		
		if (ifaces.contains("com/sun/javafx/runtime/FXObject")) {
		    System.out.println("Found: " + reader.getClassName() + " ifaces " + ifaces);
		} else {
		    if (ifaces.size() > 0)
			System.out.println("Other interfaces " + ifaces);
		}
		ClassWriter writer = new ClassWriter(reader, 0);
		reader.accept(writer, 0);
		return writer.toByteArray();
	    } catch (Throwable t) {
		t.printStackTrace();
	    }
	} else if (className.equals(OLD_BASE)) {
	    try {
		ClassReader reader = new ClassReader(bytes);
		List<String> ifaces = Arrays.asList(reader.getInterfaces());
		System.out.println("Found: " + reader.getClassName() + " ifaces " + ifaces);
		
		ClassWriter writer = new ClassWriter(reader, 0);
		reader.accept(new SuperChanger(writer), 0);
		return writer.toByteArray();
	    } catch (Throwable t) {
		t.printStackTrace(System.err);
	    }

	    
	}
	return bytes;
    }
}