package org.mozilla.javascript;

import java.lang.reflect.*;
import java.util.*;


class JavaFXMembers extends JavaMembers {
    JavaFXMembers(Scriptable scope, Class cl) {
        super(scope, cl);
    }

    JavaFXMembers(Scriptable scope, Class cl, boolean includeProtected) {
	super(scope, cl, includeProtected);
    }


}