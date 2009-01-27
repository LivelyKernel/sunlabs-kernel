#!/bin/sh
lib=../../lib
#exec java -classpath $lib/Scenario-0.6.jar:$lib/js.jar org.mozilla.javascript.tools.shell.Main $*
#java=/System/Library/Frameworks/JavaVM.framework/Versions/1.5.0/Home/bin/java
java=java
exec $java -classpath $lib/javafxgui.jar:$lib/Scenario.jar:$lib/js.jar org.mozilla.javascript.tools.shell.Main $*
